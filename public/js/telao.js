/* Telão do estande: recebe o placar ao vivo do servidor e atualiza a tela. */
'use strict';
(() => {
  const $ = s => document.querySelector(s);
  const archById = id => ARCH.find(a => a.id === id) || ARCH[0];
  let lastLeader = null, seenFeed = new Set(), first = true, toastTimer = 0;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function toast(msg) {
    const t = $('#toast');
    t.hidden = true; void t.offsetWidth;
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 4500);
  }

  function render(s) {
    $('#st-players').textContent = s.totalPlayers;
    $('#st-runs').textContent = s.totalRuns;
    $('#url').textContent = s.gameUrl;

    const rk = $('#rank'); rk.innerHTML = '';
    if (!s.top.length) rk.appendChild(el('li', 'empty', 'Ninguém correu ainda. O primeiro lugar está de graça.'));
    s.top.forEach((r, i) => {
      const a = archById(r.archId);
      const li = el('li'); li.style.setProperty('--c', a.color);
      const n = el('span', 'n'); n.append(el('b', '', '@' + r.nick), el('span', '', a.name));
      li.append(el('span', 'pos', i + 1), n, el('span', 's', r.score));
      rk.appendChild(li);
    });

    const box = $('#arch'); box.innerHTML = '';
    const max = Math.max(1, ...Object.values(s.archCounts));
    const sorted = ARCH.slice().sort((x, y) => (s.archCounts[y.id] || 0) - (s.archCounts[x.id] || 0));
    sorted.forEach(a => {
      const v = s.archCounts[a.id] || 0;
      const row = el('div', 'arow');
      const t = el('div', 't'); const i = el('i'); i.style.background = a.color; i.style.width = '0%'; t.appendChild(i);
      row.append(el('span', 'nm', a.name), t, el('b', '', v));
      box.appendChild(row);
      requestAnimationFrame(() => requestAnimationFrame(() => { i.style.width = (v / max * 100) + '%'; }));
    });
    const top = sorted[0];
    $('#leader').hidden = !(s.archCounts[top.id] > 0);
    $('#leader-n').textContent = top.name;
    $('#leader-a').textContent = top.area;

    const feed = $('#feed'); feed.innerHTML = '';
    s.feed.forEach(r => {
      const key = r.id + ':' + r.ts;
      const li = el('li', !first && !seenFeed.has(key) ? 'new' : '');
      li.append(el('span', '', `@${r.nick} · ${archById(r.archId).name}`), el('b', '', r.score));
      feed.appendChild(li);
      seenFeed.add(key);
    });

    const leader = s.top[0];
    const lkey = leader ? leader.id + ':' + leader.score : null;
    if (!first && leader && lkey !== lastLeader) toast(`@${leader.nick} assumiu o 1º lugar com ${leader.score} pontos!`);
    lastLeader = lkey;
    first = false;
  }

  function setLive(on) {
    $('#live').classList.toggle('off', !on);
    $('#live-t').textContent = on ? 'Ao vivo' : 'Sem conexão';
  }

  if (typeof io === 'function') {
    const socket = io({ reconnection: true });
    socket.on('connect', () => setLive(true));
    socket.on('disconnect', () => setLive(false));
    socket.on('state', render);
  } else {
    setLive(false);
  }
  // reabre o QR de vez em quando (se o endereço do servidor mudar)
  setInterval(() => { $('#qr').src = 'api/qr.svg?t=' + Date.now(); }, 5 * 60 * 1000);
})();
