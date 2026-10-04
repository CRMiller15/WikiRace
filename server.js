const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const zlib = require("zlib");

const PORT = Number(process.env.PORT || 3000);
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: false } });

app.set("trust proxy", 1);

const CLIENT_GZIP_BASE64 = "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";
let CLIENT_HTML = zlib.gunzipSync(Buffer.from(CLIENT_GZIP_BASE64, "base64")).toString("utf8");

// Patch multiplayer finish behavior in the browser client.
// 1) Never block the official server result from rendering.
CLIENT_HTML = CLIENT_HTML.replace(
  /function multiplayerResult\(won,data\)\{\s*if\(multiFinished\)return;/,
  "function multiplayerResult(won,data){"
);

// 2) The winning browser switches to YOU WON immediately when it reaches the target.
//    The server still broadcasts the authoritative result so the other browser shows YOU LOST.
CLIENT_HTML = CLIENT_HTML.replace(
  /if\(mode==="multi"\)\{\s*if\(!running\|\|multiFinished\)return;\s*const elapsed=Math\.max\(0,serverNow\(\)-multiStartAtServer\);\s*multiFinished=true;running=false;cancelAnimationFrame\(raf\);\s*socket\.emit\("multiFinish",\{room:multiRoom,elapsed,clicks\}\);\s*return;\s*\}/,
  'if(mode==="multi"){ if(!running||multiFinished)return; const elapsed=Math.max(0,serverNow()-multiStartAtServer); multiplayerResult(true,{winnerElapsed:elapsed,winnerClicks:clicks}); socket.emit("multiFinish",{room:multiRoom,elapsed,clicks}); return; }'
);

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "WikiRace Online Multiplayer" });
});

const MULTIPLAYER_RESULT_FIX = `
<script>
(function(){
  window.__multiPath = [];

  function escPathText(value){
    return String(value || "").replace(/[&<>"']/g, function(ch){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];
    });
  }

  function currentArticleName(){
    const el = document.getElementById("currentTitle");
    if (!el) return "";
    return String(el.textContent || "").replace(/^Current article:\\s*/i, "").trim();
  }

  function syncPath(){
    try{
      if (typeof mode === "undefined" || mode !== "multi" || !multiRoom) return;
      const name = currentArticleName();
      if (!name) return;
      const p = window.__multiPath;
      if (!p.length || p[p.length - 1] !== name) p.push(name);
      if (socket) socket.emit("multiPath", {room: multiRoom, path: p.slice()});
    }catch(e){}
  }

  function renderPathList(title, items){
    const safe = Array.isArray(items) ? items : [];
    const rows = safe.length
      ? safe.map(function(item, i){
          return '<div style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,.12);font-size:14px;"><strong>'+(i+1)+'.</strong> '+escPathText(item)+'</div>';
        }).join("")
      : '<div style="opacity:.7;padding:8px 0;">No path data available.</div>';

    return '<div style="flex:1;min-width:260px;background:rgba(9,18,36,.72);border:1px solid rgba(255,255,255,.16);border-radius:16px;padding:16px;text-align:left;">'
      + '<div style="font-weight:900;font-size:15px;letter-spacing:.08em;margin-bottom:9px;">'+title+'</div>'
      + '<div style="max-height:300px;overflow:auto;">'+rows+'</div></div>';
  }

  function forceMultiplayerResult(won, data){
    try{
      multiFinished = true;
      running = false;
      if (typeof raf !== "undefined") cancelAnimationFrame(raf);
      finishKind = "multi";

      const title = document.getElementById("finishTitle");
      if (title) {
        title.textContent = won ? "YOU WON" : "YOU LOST";
        title.classList.toggle("multi-result-win", !!won);
        title.classList.toggle("multi-result-loss", !won);
      }

      const finalTime = document.getElementById("finalTime");
      const finalMeta = document.getElementById("finalMeta");
      if (finalTime) finalTime.textContent = "";
      if (finalMeta) finalMeta.textContent = "";

      const yourPath = (data && Array.isArray(data.yourPath) && data.yourPath.length)
        ? data.yourPath
        : window.__multiPath.slice();
      const opponentPath = (data && Array.isArray(data.opponentPath))
        ? data.opponentPath
        : [];

      const pathEl = document.getElementById("path");
      if (pathEl) {
        pathEl.classList.remove("hidden");
        pathEl.innerHTML =
          '<div style="width:100%;margin-top:18px;">'
          + '<div style="font-size:18px;font-weight:900;margin-bottom:12px;">RACE PATHS</div>'
          + '<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start;">'
          + renderPathList("YOUR PATH", yourPath)
          + renderPathList("OPPONENT PATH", opponentPath)
          + '</div>'
          + '<div style="margin-top:12px;opacity:.65;font-size:12px;text-align:center;">Multiplayer results are not saved to the leaderboard.</div>'
          + '</div>';
      }

      const primary = document.getElementById("finishPrimary");
      if (primary) primary.textContent = "Restart";

      const confetti = document.getElementById("confetti");
      if (confetti) confetti.classList.add("hidden");

      if (typeof showOnly === "function") showOnly("finish");
    } catch(e) {
      console.error("WikiRace multiplayer result fix:", e);
    }
  }

  // Track the initial route and every subsequent article change.
  try {
    if (socket) {
      socket.on("racePrepare", function(data){
        window.__multiPath = [];
        if (data && data.start) window.__multiPath.push(String(data.start));
        if (multiRoom) socket.emit("multiPath", {room: multiRoom, path: window.__multiPath.slice()});
      });
    }

    const current = document.getElementById("currentTitle");
    if (current && window.MutationObserver) {
      new MutationObserver(function(){ setTimeout(syncPath, 0); })
        .observe(current, {childList:true, subtree:true, characterData:true});
    }
  } catch(e){}

  // Replace the existing finish function completely.
  try {
    multiplayerResult = function(won, data){
      forceMultiplayerResult(!!won, data || {});
    };
  } catch(e){}

  // The winner changes screens immediately, then receives the complete
  // server result (including both paths) a moment later.
  try {
    const originalHandleVictory = handleVictory;
    handleVictory = async function(){
      if (typeof mode !== "undefined" && mode === "multi") {
        if (!running || multiFinished) return;
        syncPath();
        const elapsed = Math.max(0, serverNow() - multiStartAtServer);
        forceMultiplayerResult(true, {yourPath: window.__multiPath.slice(), opponentPath: []});
        if (socket && multiRoom) {
          socket.emit("multiFinish", {
            room: multiRoom,
            elapsed: elapsed,
            clicks: clicks,
            path: window.__multiPath.slice()
          });
        }
        return;
      }
      return originalHandleVictory();
    };
  } catch(e){}

  // Authoritative result updates BOTH clients with both routes.
  try {
    if (socket) {
      socket.on("raceResult", function(data){
        if (!multiRoom || data.room !== multiRoom) return;
        forceMultiplayerResult(!!data.won, data || {});
      });
    }
  } catch(e){}
})();
</script>
`

app.get("/", (_req, res) => {
  const html = CLIENT_HTML.includes("</body>")
    ? CLIENT_HTML.replace("</body>", MULTIPLAYER_RESULT_FIX + "</body>")
    : CLIENT_HTML + MULTIPLAYER_RESULT_FIX;
  res.type("html").send(html);
});

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
function playerCount(room) { return room ? room.players.length : 0; }
function emitRoomUpdate(code) {
  const room = rooms.get(code);
  if (room) io.to(code).emit("roomUpdate", { room: code, players: playerCount(room) });
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
  if (!room.players.length) { rooms.delete(code); return; }
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
    rooms.set(code, { host: socket.id, players: [socket.id], ready: new Set(), paths: new Map(), state: "lobby", start: "", end: "", winner: null });
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
    room.start = String(start); room.end = String(end); room.state = "preparing"; room.ready.clear(); room.paths = new Map(); room.winner = null;
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
    room.state = "lobby"; room.ready.clear();
    io.to(code).emit("rematch", { room: code });
  });
  socket.on("multiPath", ({ room: raw, path }) => {
    const code = String(raw || "").toUpperCase();
    const room = rooms.get(code);
    if (!room || !room.players.includes(socket.id)) return;
    const cleanPath = Array.isArray(path)
      ? path.map(x => String(x || "").trim()).filter(Boolean).slice(0, 200)
      : [];
    room.paths.set(socket.id, cleanPath);
  });

  socket.on("multiProgress", ({ room: raw, clicks }) => {
    const code = String(raw || "").toUpperCase();
    const room = rooms.get(code);
    if (!room || !room.players.includes(socket.id)) return;
    socket.to(code).emit("opponentProgress", { room: code, clicks: Math.max(0, Number(clicks) || 0) });
  });
  socket.on("multiFinish", ({ room: raw, elapsed, clicks, path }) => {
    const code = String(raw || "").toUpperCase();
    const room = rooms.get(code);
    if (!room || !room.players.includes(socket.id) || room.winner) return;

    if (Array.isArray(path)) {
      room.paths.set(socket.id, path.map(x => String(x || "").trim()).filter(Boolean).slice(0, 200));
    }

    room.winner = socket.id;
    room.state = "finished";

    for (const id of room.players) {
      const opponentId = room.players.find(playerId => playerId !== id);
      io.to(id).emit("raceResult", {
        room: code,
        won: id === socket.id,
        winnerElapsed: Math.max(0, Number(elapsed) || 0),
        winnerClicks: Math.max(0, Number(clicks) || 0),
        yourPath: room.paths.get(id) || [],
        opponentPath: opponentId ? (room.paths.get(opponentId) || []) : []
      });
    }
  });
  socket.on("multiForfeit", ({ room: raw }) => {
    const code = String(raw || "").toUpperCase();
    const room = rooms.get(code);
    if (!room || !room.players.includes(socket.id) || room.winner) return;
    const opponent = room.players.find(id => id !== socket.id);
    room.winner = opponent || socket.id; room.state = "finished";
    for (const id of room.players) io.to(id).emit("raceResult", { room: code, won: id === room.winner, forfeit: true });
  });
  socket.on("requestRematch", ({ room: raw }) => {
    const code = String(raw || "").toUpperCase();
    const room = rooms.get(code);
    if (!room || !room.players.includes(socket.id)) return;
    room.state = "lobby"; room.ready.clear(); room.paths = new Map(); room.winner = null; room.start = ""; room.end = "";
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
