/*
 * Sipah — servidor do estande
 * - Entrega o jogo (public/) e o telão (public/telao.html)
 * - Socket.io: recebe jogadores e corridas, valida a pontuação e manda o placar ao vivo
 * - Salva tudo em data/sipah.json (sem banco para instalar)
 */
'use strict';
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { Server } = require('socket.io');
const QRCode = require('qrcode');

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'sipah.json');

// Mesmos ids de public/js/content.js (ARCH)
const ARCH_IDS = ['caos', 'ceo', 'genio', 'prota', 'clt', 'npc', 'hacker', 'maker'];
const BAD = /\b(porra|caralho|merda|puta|puto|buceta|fdp|viado|bosta|cu|pau|pinto|corno|vagabund\w*|arrombad\w*|retardad\w*)\b/i;

/* ---------- endereço do jogo (para o QR code) ---------- */
function lanIp() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const n of list || []) {
      if (n.family === 'IPv4' && !n.internal) return n.address;
    }
  }
  return 'localhost';
}
const GAME_URL = process.env.PUBLIC_URL || `http://${lanIp()}:${PORT}/`;

/* ---------- "banco" em arquivo JSON ---------- */
let db = { players: {}, runs: [] };
try {
  if (fs.existsSync(DB_FILE)) db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
} catch (e) {
  console.error('Não consegui ler data/sipah.json, começando vazio:', e.message);
}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(db));
      fs.renameSync(DB_FILE + '.tmp', DB_FILE);
    } catch (e) { console.error('Erro ao salvar:', e.message); }
  }, 400);
}

const dayKey = ts => new Date(ts).toDateString();

/* ---------- placar ---------- */
function bestToday() {
  const today = dayKey(Date.now());
  const best = new Map();
  for (const r of db.runs) {
    if (dayKey(r.ts) !== today) continue;
    const cur = best.get(r.pid);
    if (!cur || r.score > cur.score) best.set(r.pid, r);
  }
  return [...best.values()].sort((a, b) => b.score - a.score || a.ts - b.ts);
}

function buildState() {
  const today = dayKey(Date.now());
  const ranking = bestToday();
  const players = Object.values(db.players).filter(p => dayKey(p.lastSeen) === today);
  const archCounts = Object.fromEntries(ARCH_IDS.map(id => [id, 0]));
  for (const p of players) if (archCounts[p.archId] !== undefined) archCounts[p.archId]++;
  const runsToday = db.runs.filter(r => dayKey(r.ts) === today);
  const pub = r => ({ id: r.pid, nick: r.nick, archId: r.archId, score: r.score, coins: r.coins, ts: r.ts });
  return {
    top: ranking.slice(0, 10).map(pub),
    feed: runsToday.slice(-8).reverse().map(pub),
    archCounts,
    totalPlayers: players.length,
    totalRuns: runsToday.length,
    gameUrl: GAME_URL
  };
}

let bcastTimer = null;
function broadcast() {
  if (bcastTimer) return;
  bcastTimer = setTimeout(() => { bcastTimer = null; io.emit('state', buildState()); }, 250);
}

/* ---------- validação da corrida ----------
 * Mesma física do jogo: velocidade = min(34, 14 + 0,35·t) m/s.
 * O servidor mede o tempo da corrida sozinho, então o celular não consegue
 * mandar uma distância maior do que seria possível naquele tempo. */
function maxDistance(t) {
  const tCap = (34 - 14) / 0.35;
  if (t <= tCap) return 14 * t + 0.175 * t * t;
  return 14 * tCap + 0.175 * tCap * tCap + 34 * (t - tCap);
}

function cleanNick(n) {
  return String(n || '').trim().replace(/\s+/g, '_').replace(/[^\p{L}\p{N}_.-]/gu, '').slice(0, 14);
}

/* ---------- HTTP ---------- */
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));

// bibliotecas servidas localmente: o estande funciona sem internet
app.get('/vendor/three.min.js', (req, res) =>
  res.sendFile(path.join(__dirname, 'node_modules/three/build/three.min.js')));
app.use('/fonts/rubik', express.static(path.join(__dirname, 'node_modules/@fontsource/rubik')));
app.use('/fonts/permanent-marker', express.static(path.join(__dirname, 'node_modules/@fontsource/permanent-marker')));

app.get('/api/state', (req, res) => res.json(buildState()));
app.get('/api/qr.svg', async (req, res) => {
  try {
    const svg = await QRCode.toString(GAME_URL, { type: 'svg', margin: 1, color: { dark: '#0d0a1aff', light: '#ffffffff' } });
    res.type('image/svg+xml').send(svg);
  } catch (e) { res.status(500).end(); }
});
// Zerar o placar de hoje: POST /api/reset com {"key":"..."} (só se ADMIN_KEY estiver definida)
app.post('/api/reset', (req, res) => {
  if (!ADMIN_KEY || (req.body && req.body.key) !== ADMIN_KEY) return res.status(403).json({ ok: false });
  const today = dayKey(Date.now());
  db.runs = db.runs.filter(r => dayKey(r.ts) !== today);
  save(); broadcast();
  res.json({ ok: true });
});

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, file) {
    if (file.endsWith('sw.js') || file.endsWith('.webmanifest')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e5 });

/* ---------- Socket.io ---------- */
io.on('connection', socket => {
  socket.emit('state', buildState());

  socket.on('join', (data, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    const id = String((data && data.id) || '');
    const nick = cleanNick(data && data.nick);
    const archId = String((data && data.archId) || '');
    if (!/^[a-z0-9-]{8,40}$/i.test(id) || !nick || !ARCH_IDS.includes(archId)) return reply({ ok: false, error: 'dados' });
    if (BAD.test(nick.replace(/[_.-]/g, ' '))) return reply({ ok: false, error: 'apelido' });
    const now = Date.now();
    const p = db.players[id] || { id, created: now };
    Object.assign(p, { nick, archId, lastSeen: now });
    db.players[id] = p;
    socket.data.pid = id;
    save(); broadcast();
    reply({ ok: true });
  });

  socket.on('run:start', () => {
    if (socket.data.pid) socket.data.runStart = Date.now();
  });

  socket.on('run:finish', (data, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    const pid = socket.data.pid, start = socket.data.runStart;
    socket.data.runStart = null;
    if (!pid || !start || !db.players[pid]) return reply({ ok: false, error: 'sem corrida' });
    const dist = Math.floor(Number(data && data.dist));
    const coins = Math.floor(Number(data && data.coins));
    const score = Math.floor(Number(data && data.score));
    const elapsed = (Date.now() - start) / 1000;
    const valid = Number.isFinite(dist) && Number.isFinite(coins) && Number.isFinite(score)
      && dist >= 0 && coins >= 0
      && dist <= maxDistance(elapsed) * 1.08 + 15
      && coins <= dist / 1.4 + 5
      && score === dist + coins * 10;
    if (!valid) return reply({ ok: false, error: 'pontuação inválida' });
    const p = db.players[pid];
    p.lastSeen = Date.now();
    const run = { pid, nick: p.nick, archId: p.archId, score, coins, dist, secs: Math.round(elapsed), ts: Date.now() };
    db.runs.push(run);
    if (db.runs.length > 20000) db.runs = db.runs.slice(-20000);
    const ranking = bestToday();
    const position = ranking.findIndex(r => r.pid === pid) + 1;
    const isBest = ranking[position - 1] === run;
    save(); broadcast();
    reply({ ok: true, position, isBest, total: ranking.length });
  });
});

server.listen(PORT, () => {
  console.log('\n  SIPAH rodando!');
  console.log(`  Jogo (celulares):  ${GAME_URL}`);
  console.log(`  Telão:             ${GAME_URL}telao.html`);
  console.log('  Os celulares precisam estar na mesma rede Wi-Fi deste computador.\n');
});
