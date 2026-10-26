/* Conexão do Sipah com o ranking.
 *
 * Dois modos, escolhidos sozinhos ao abrir a página:
 *  - "global": banco Supabase (funciona na Vercel e em qualquer lugar com internet).
 *  - "local":  servidor do estande (npm start) com Socket.io, sem internet.
 * Se nenhum responder, o jogo segue offline e guarda o ranking só no aparelho.
 */
'use strict';
const Net = (() => {
  const CFG = window.SIPAH_CONFIG || {};
  let mode = 'offline';          // 'global' | 'local' | 'offline'
  let socket = null;
  let state = null;
  let joined = null;
  let runToken = null;           // promessa do bilhete da corrida (modo global)
  let pollTimer = 0, watchers = 0;
  const listeners = new Set();
  const statusListeners = new Set();
  let readyResolve; const ready = new Promise(r => { readyResolve = r; });

  const setMode = m => { mode = m; statusListeners.forEach(f => f(m !== 'offline', m)); };
  const emitState = s => { state = s; listeners.forEach(f => f(s)); };

  /* ---------- modo global (Supabase) ---------- */
  async function rpc(name, body, timeout = 6000) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeout);
    try {
      const res = await fetch(`${CFG.supabaseUrl}/rest/v1/rpc/${name}`, {
        method: 'POST',
        headers: { 'apikey': CFG.supabaseKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
        signal: ctl.signal
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally { clearTimeout(t); }
  }
  async function pollOnce() {
    try { emitState(await rpc('sipah_state')); if (mode !== 'global') setMode('global'); }
    catch (e) { /* sem internet agora: mantém o último placar */ }
  }
  function startPolling(ms) {
    clearInterval(pollTimer);
    pollTimer = setInterval(() => { if (!document.hidden) pollOnce(); }, ms);
  }

  /* ---------- modo local (servidor do estande) ---------- */
  function loadScript(src) {
    return new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = fail;
      document.head.appendChild(s);
    });
  }
  async function initLocal() {
    try { await loadScript('/socket.io/socket.io.js'); } catch (e) { return false; }
    if (typeof io !== 'function') return false;
    socket = io({ reconnection: true, reconnectionDelay: 1000, timeout: 5000 });
    socket.on('connect', () => { setMode('local'); if (joined) join(joined); });
    socket.on('disconnect', () => setMode('offline'));
    socket.on('state', emitState);
    return true;
  }
  function callLocal(event, data) {
    return new Promise(resolve => {
      if (!socket || !socket.connected) return resolve({ ok: false, error: 'offline' });
      socket.timeout(5000).emit(event, data, (err, res) => resolve(err ? { ok: false, error: 'timeout' } : res));
    });
  }

  /* ---------- início ---------- */
  async function init(opts) {
    opts = opts || {};
    if (CFG.supabaseUrl && CFG.supabaseKey) {
      try {
        emitState(await rpc('sipah_state', {}, 5000));
        setMode('global');
        if (opts.watch) startPolling(opts.watch);
        readyResolve(mode);
        if (joined) join(joined);
        return mode;
      } catch (e) { /* banco fora do ar ou sem internet: tenta o servidor local */ }
    }
    await initLocal();
    readyResolve(mode);
    return mode;
  }

  /* ---------- ações do jogo ---------- */
  async function join(profile) {
    joined = { id: profile.id, nick: profile.nick, archId: profile.archId };
    await ready;
    if (mode === 'global') {
      try { return await rpc('sipah_join', { p_id: joined.id, p_nick: joined.nick, p_arch: joined.archId }); }
      catch (e) { return { ok: false, error: 'offline' }; }
    }
    return callLocal('join', joined);
  }
  function runStart() {
    runToken = null;
    if (mode === 'global' && joined) {
      runToken = rpc('sipah_run_start', { p_id: joined.id }).then(r => r && r.ok ? r.token : null).catch(() => null);
    } else if (mode === 'local' && socket && socket.connected) {
      socket.emit('run:start');
    }
  }
  async function runFinish(r) {
    if (mode === 'global') {
      const token = runToken && await runToken;
      runToken = null;
      if (!token) return { ok: false, error: 'sem corrida' };
      try {
        const res = await rpc('sipah_run_finish', { p_token: token, p_dist: r.dist, p_coins: r.coins, p_score: r.score });
        pollOnce();
        return res;
      } catch (e) { return { ok: false, error: 'offline' }; }
    }
    return callLocal('run:finish', r);
  }

  /* Atualiza o placar enquanto alguma tela precisa dele (ranking aberto, telão) */
  function watch(on, ms) {
    if (mode === 'local') return;
    watchers = Math.max(0, watchers + (on ? 1 : -1));
    if (watchers > 0) { pollOnce(); startPolling(ms || 4000); }
    else clearInterval(pollTimer);
  }

  return {
    init, join, runStart, runFinish, watch,
    mode: () => mode,
    online: () => mode !== 'offline',
    state: () => state,
    onState: f => { listeners.add(f); return () => listeners.delete(f); },
    onStatus: f => { statusListeners.add(f); return () => statusListeners.delete(f); }
  };
})();
