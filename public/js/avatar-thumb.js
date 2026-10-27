/* Miniaturas dos personagens para o ranking (celular e telão).
 *
 * AvatarThumb.get(archId, seed) -> URL de uma imagem PNG com o rosto e o tronco do personagem.
 * Desenha uma vez e guarda na memória: o ranking pode atualizar à vontade sem pesar.
 * Precisa de vendor/three.min.js e js/avatar.js carregados antes.
 */
'use strict';
const AvatarThumb = (() => {
  const SIZE = 192;
  const cache = new Map();
  let renderer = null, scene = null, cam = null;

  function setup() {
    if (renderer) return true;
    if (typeof THREE === 'undefined' || typeof buildAvatar2 !== 'function') return false;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch (e) { return false; }
    renderer.setPixelRatio(1);
    renderer.setSize(SIZE, SIZE, false);
    renderer.setClearColor(0x000000, 0);
    scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x3a2a70, 0.9));
    const d = new THREE.DirectionalLight(0xffffff, 0.7); d.position.set(2, 5, 6); scene.add(d);
    cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    return true;
  }

  function draw(archId, seed) {
    const av = buildAvatar2(archId, seed);
    av.rotation.y = -0.3;
    scene.add(av);
    av.updateMatrixWorld(true);
    // enquadra a cabeça e o peito, seja o personagem alto ou baixinho
    const head = new THREE.Vector3();
    av.userData.P.head.getWorldPosition(head);
    cam.position.set(0.25, head.y + 0.15, 3.3);
    cam.lookAt(0, head.y - 0.32, 0);
    renderer.render(scene, cam);
    const url = renderer.domElement.toDataURL('image/png');
    scene.remove(av);
    av.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    return url;
  }

  function get(archId, seed) {
    const key = archId + '|' + seed;
    if (cache.has(key)) return cache.get(key);
    if (!setup()) return '';
    let url = '';
    try { url = draw(archId, String(seed)); } catch (e) { url = ''; }
    cache.set(key, url);
    return url;
  }

  /* Cria o <img> já pronto, com o fundo na cor do perfil */
  function img(archId, seed, color, cls) {
    const el = document.createElement('img');
    el.className = cls || 'av';
    el.alt = '';
    el.decoding = 'async';
    const url = get(archId, seed);
    if (url) el.src = url;
    if (color) el.style.background = `radial-gradient(circle at 50% 35%, ${color}66, ${color}1f 70%)`;
    return el;
  }

  return { get, img };
})();
