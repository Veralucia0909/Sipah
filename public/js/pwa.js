/* PWA: registra o service worker (funciona offline) e mostra o botão "Instalar o app". */
'use strict';
(() => {
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => console.warn('Service worker não registrado:', err));
    });
  }

  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const buttons = () => document.querySelectorAll('.install');
  let deferred = null;

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferred = e;
    buttons().forEach(b => b.hidden = false);
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    buttons().forEach(b => b.hidden = true);
  });

  document.addEventListener('click', async e => {
    const b = e.target.closest('.install');
    if (!b || !deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch (err) {}
    deferred = null;
    buttons().forEach(x => x.hidden = true);
  });

  // iPhone/iPad não têm botão de instalar: mostramos a dica do Safari
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  document.addEventListener('DOMContentLoaded', () => {
    const hint = document.getElementById('ios-hint');
    if (hint && ios && !standalone && window.isSecureContext) hint.hidden = false;
  });
})();
