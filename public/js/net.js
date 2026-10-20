/* Conexão com o servidor do estande (Socket.io).
   Se o servidor não estiver acessível, o jogo continua funcionando offline,
   com ranking só deste aparelho. */
'use strict';
const Net = (() => {
  let socket = null;
  let state = null;
  let joined = null;
  const listeners = new Set();
  const statusListeners = new Set();

  function init() {
    if (typeof io !== 'function') return; // socket.io não carregou: modo offline
    socket = io({ reconnection: true, reconnectionDelay: 1000, timeout: 5000 });
    socket.on('connect', () => {
      statusListeners.forEach(f => f(true));
      if (joined) join(joined); // reconectou: avisa o servidor de novo
    });
    socket.on('disconnect', () => statusListeners.forEach(f => f(false)));
    socket.on('state', s => { state = s; listeners.forEach(f => f(s)); });
  }

  function call(event, data) {
    return new Promise(resolve => {
      if (!socket || !socket.connected) return resolve({ ok: false, error: 'offline' });
      socket.timeout(5000).emit(event, data, (err, res) => resolve(err ? { ok: false, error: 'timeout' } : res));
    });
  }

  function join(profile) {
    joined = { id: profile.id, nick: profile.nick, archId: profile.archId };
    return call('join', joined);
  }
  function runStart() { if (socket && socket.connected) socket.emit('run:start'); }
  function runFinish(r) { return call('run:finish', r); }

  return {
    init, join, runStart, runFinish,
    online: () => !!(socket && socket.connected),
    state: () => state,
    onState: f => { listeners.add(f); return () => listeners.delete(f); },
    onStatus: f => { statusListeners.add(f); return () => statusListeners.delete(f); }
  };
})();
