const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const os = require("os");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: false }
});

app.set("trust proxy", 1);

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "WikiRace Online Multiplayer" });
});

app.use(express.static(path.join(__dirname, "public")));

const rooms = new Map();
const socketRoom = new Map();

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = "";
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  } while (rooms.has(code));
  return code;
}

function playerCount(room) {
  return room ? room.players.length : 0;
}

function emitRoomUpdate(code) {
  const room = rooms.get(code);
  if (!room) return;
  io.to(code).emit("roomUpdate", { room: code, players: playerCount(room) });
}

function closeOrUpdateAfterLeave(socketId, code) {
  const room = rooms.get(code);
  if (!room) return;

  const wasHost = room.host === socketId;
  room.players = room.players.filter(id => id !== socketId);
  room.ready.delete(socketId);

  if (wasHost) {
    io.to(code).emit("roomClosed", { room: code });
    for (const id of room.players) socketRoom.delete(id);
    rooms.delete(code);
    return;
  }

  if (!room.players.length) {
    rooms.delete(code);
    return;
  }

  room.state = "lobby";
  room.winner = null;
  room.ready.clear();
  io.to(code).emit("opponentLeft", { room: code });
  emitRoomUpdate(code);
}

io.on("connection", socket => {
  socket.on("timePing", (clientSent, cb) => {
    if (typeof cb === "function") cb({ serverNow: Date.now(), clientSent });
  });

  socket.on("createRoom", (_data, cb) => {
    const existing = socketRoom.get(socket.id);
    if (existing) closeOrUpdateAfterLeave(socket.id, existing);

    const code = makeCode();
    const room = {
      host: socket.id,
      players: [socket.id],
      ready: new Set(),
      state: "lobby",
      start: "",
      end: "",
      winner: null
    };
    rooms.set(code, room);
    socketRoom.set(socket.id, code);
    socket.join(code);
    cb?.({ ok: true, room: code, players: 1 });
    emitRoomUpdate(code);
  });

  socket.on("joinRoom", ({ room: raw }, cb) => {
    const code = String(raw || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return cb?.({ ok: false, error: "Room not found." });
    if (room.players.length >= 2) return cb?.({ ok: false, error: "That room is full." });
    if (room.state !== "lobby") return cb?.({ ok: false, error: "That race has already started." });

    const existing = socketRoom.get(socket.id);
    if (existing) closeOrUpdateAfterLeave(socket.id, existing);

    room.players.push(socket.id);
    socketRoom.set(socket.id, code);
    socket.join(code);
    cb?.({ ok: true, room: code, players: room.players.length });
    emitRoomUpdate(code);
  });

  socket.on("leaveRoom", ({ room: raw }) => {
    const code = String(raw || socketRoom.get(socket.id) || "").toUpperCase();
    if (!code) return;
    socket.leave(code);
    socketRoom.delete(socket.id);
    closeOrUpdateAfterLeave(socket.id, code);
  });

  socket.on("hostStartRace", ({ room: raw, start, end }, cb) => {
    const code = String(raw || "").toUpperCase();
    const room = rooms.get(code);
    if (!room) return cb?.({ ok: false, error: "Room no longer exists." });
    if (room.host !== socket.id) return cb?.({ ok: false, error: "Only the host can start the race." });
    if (room.players.length !== 2) return cb?.({ ok: false, error: "Both players must be connected." });
    if (!start || !end) return cb?.({ ok: false, error: "Choose both articles." });

    room.start = String(start);
    room.end = String(end);
    room.state = "preparing";
    room.ready.clear();
    room.winner = null;

    io.to(code).emit("racePrepare", { room: code, start: room.start, end: room.end });
    cb?.({ ok: true });
  });

  socket.on("raceReady", ({ room: raw }) => {
    const code = String(raw || "").toUpperCase();
    const room = rooms.get(code);
    if (!room || room.state !== "preparing" || !room.players.includes(socket.id)) return;

    room.ready.add(socket.id);
    if (room.players.length === 2 && room.players.every(id => room.ready.has(id))) {
      room.state = "countdown";
      const startAtServer = Date.now() + 4000;
      room.startAtServer = startAtServer;
      io.to(code).emit("raceStart", { room: code, startAtServer });
      setTimeout(() => {
        const current = rooms.get(code);
        if (current && current.state === "countdown") current.state = "racing";
      }, 4050);
    }
  });

  socket.on("raceLoadFailed", ({ room: raw }) => {
    const code = String(raw || "").toUpperCase();
    const room = rooms.get(code);
    if (!room) return;
    room.state = "lobby";
    room.ready.clear();
    io.to(code).emit("rematch", { room: code });
  });

  socket.on("multiProgress", ({ room: raw, clicks }) => {
    const code = String(raw || "").toUpperCase();
    const room = rooms.get(code);
    if (!room || !room.players.includes(socket.id)) return;
    socket.to(code).emit("opponentProgress", {
      room: code,
      clicks: Math.max(0, Number(clicks) || 0)
    });
  });

  socket.on("multiFinish", ({ room: raw, elapsed, clicks }) => {
    const code = String(raw || "").toUpperCase();
    const room = rooms.get(code);
    if (!room || !room.players.includes(socket.id) || room.winner) return;

    room.winner = socket.id;
    room.state = "finished";

    for (const id of room.players) {
      io.to(id).emit("raceResult", {
        room: code,
        won: id === socket.id,
        winnerElapsed: Math.max(0, Number(elapsed) || 0),
        winnerClicks: Math.max(0, Number(clicks) || 0)
      });
    }
  });

  socket.on("multiForfeit", ({ room: raw }) => {
    const code = String(raw || "").toUpperCase();
    const room = rooms.get(code);
    if (!room || !room.players.includes(socket.id) || room.winner) return;

    const opponent = room.players.find(id => id !== socket.id);
    room.winner = opponent || socket.id;
    room.state = "finished";

    for (const id of room.players) {
      io.to(id).emit("raceResult", {
        room: code,
        won: id === room.winner,
        forfeit: true
      });
    }
  });

  socket.on("requestRematch", ({ room: raw }) => {
    const code = String(raw || "").toUpperCase();
    const room = rooms.get(code);
    if (!room || !room.players.includes(socket.id)) return;

    room.state = "lobby";
    room.ready.clear();
    room.winner = null;
    room.start = "";
    room.end = "";
    io.to(code).emit("rematch", { room: code });
    emitRoomUpdate(code);
  });

  socket.on("disconnect", () => {
    const code = socketRoom.get(socket.id);
    if (!code) return;
    socketRoom.delete(socket.id);
    closeOrUpdateAfterLeave(socket.id, code);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`WikiRace Online server listening on port ${PORT}`);
});