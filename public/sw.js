/* Service worker do Sipah: guarda o jogo no aparelho para abrir rápido e funcionar sem internet.
   Ao mudar qualquer arquivo do jogo, aumente VERSION para os celulares baixarem a versão nova. */
const VERSION = 'sipah-v5';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'css/fonts.css',
  'js/config.js',
  'js/content.js',
  'js/net.js',
  'js/pwa.js',
  'js/avatar.js',
  'js/avatar-thumb.js',
  'js/game.js',
  'vendor/three.min.js',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'fonts/rubik-latin-400-normal.woff2',
  'fonts/rubik-latin-600-normal.woff2',
  'fonts/rubik-latin-800-normal.woff2',
  'fonts/rubik-latin-900-normal.woff2',
  'fonts/lilita-one-latin-400-normal.woff2',
  'fonts/permanent-marker-latin-400-normal.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // placar e conexão em tempo real nunca vêm do cache
  if (url.pathname.startsWith('/api/') || (url.pathname.startsWith('/socket.io/') && url.search)) return;

  // páginas: tenta a rede primeiro (versão nova), usa o cache se estiver offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
    return;
  }

  // arquivos (js, css, fontes, ícones): cache primeiro, atualiza em segundo plano
  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
