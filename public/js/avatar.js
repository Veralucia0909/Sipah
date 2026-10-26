/* Personagens do Sipah.
 *
 * buildAvatar2(archId, seed) -> THREE.Group  (altura ~2.4, pés em y = 0)
 *
 * - Cada perfil (DEF) tem silhueta, roupa e acessório próprios.
 * - A "semente" (seed) sorteia o resto: tom de pele, cabelo/chapéu, olhos, boca,
 *   altura, largura, cor da roupa e 0 a 2 detalhes engraçados (EXTRAS).
 *   A mesma semente sempre gera o mesmo personagem.
 *
 * Para criar mais variedade, acrescente opções nas listas de DEF (hairK, eyesK,
 * mouthK, outfit) ou um novo item em EXTRAS + um "case" na função extras().
 */
(function(){
const GRAD = (() => {
  const t = new THREE.DataTexture(new Uint8Array([90,170,255]), 3, 1, THREE.LuminanceFormat);
  t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
})();
const cache = {};
const M = (c, emissive) => {
  const k = c + (emissive || '');
  if(!cache[k]) cache[k] = new THREE.MeshToonMaterial(Object.assign({color:c, gradientMap:GRAD}, emissive ? {emissive} : {}));
  return cache[k];
};
const S = (r, c, ws=20, hs=16) => new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), M(c));
const B = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c));
const C = (rt, rb, h, c, seg=16) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M(c));
const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };

/* ---------- variações por pessoa ---------- */
const SKIN = ['#ffd9bf', '#f1c09a', '#d99e74', '#b97a50', '#8d5634', '#5e3a22'];
const HAIR = ['#1b1530', '#5a3418', '#a5652a', '#e8c25a', '#ff3ea5', '#2fd2ff', '#8b3dff', '#f4f1ff'];
// gerador pseudoaleatório com boa mistura (mulberry32): sementes vizinhas dão resultados bem diferentes
function rng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hashStr(str){ let h = 2166136261; for(let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

/* ---------- peças ---------- */
function eyes(head, kind, z, y, skin){
  const g = new THREE.Group(); g.position.set(0, y, z); head.add(g);
  [-1, 1].forEach(s => {
    const x = s * 0.2;
    if(kind === 'pixel'){
      g.add(at(B(0.11, 0.11, 0.04, '#141018'), x, 0, 0));
      return;
    }
    if(kind === 'wink' && s > 0){ // piscadinha: olho fechado em arco
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 6, 14, Math.PI), M('#141018'));
      g.add(at(arc, x, -0.02, 0.03)); return;
    }
    const big = kind === 'uneven' ? (s < 0 ? 0.17 : 0.11) : kind === 'wide' || kind === 'derp' ? 0.16 : 0.13;
    const w = S(big, '#ffffff', 16, 12); w.scale.z = 0.55; g.add(at(w, x, 0, 0));
    // vesgo ("derp"): cada pupila olha para um lado
    const px = kind === 'uneven' ? s * 0.02 : kind === 'derp' ? -s * 0.07 : 0;
    const py = kind === 'derp' ? (s < 0 ? 0.04 : -0.05) : -0.01;
    const p = S(big * (kind === 'tiny' ? 0.35 : kind === 'derp' ? 0.42 : 0.55), '#141018', 12, 10); g.add(at(p, x + px, py, big * 0.45));
    const hl = S(big * 0.18, '#ffffff', 8, 6); g.add(at(hl, x + 0.03, 0.04, big * 0.62));
    if(kind === 'sleepy'){
      const lid = new THREE.Mesh(new THREE.SphereGeometry(big * 1.05, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(skin));
      lid.scale.z = 0.6; g.add(at(lid, x, 0, 0.01));
      const bag = new THREE.Mesh(new THREE.TorusGeometry(big * 0.8, 0.018, 6, 14, Math.PI), M('#7a5aa8'));
      bag.rotation.z = Math.PI; g.add(at(bag, x, -big * 0.7, 0.05));
    }
    if(kind === 'angry' || kind === 'sure'){
      const br = B(0.2, 0.045, 0.04, '#141018'); br.rotation.z = s * (kind === 'angry' ? 0.35 : -0.2);
      g.add(at(br, x, big + 0.07, 0.05));
    }
  });
  return g;
}
function mouth(head, kind, z, y){
  let m;
  switch(kind){
    case 'grin': {
      m = new THREE.Mesh(new THREE.CircleGeometry(0.13, 18, Math.PI, Math.PI), M('#ffffff'));
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 6, 18, Math.PI), M('#141018')); lip.rotation.z = Math.PI; m.add(lip);
      break;
    }
    case 'tongue': {
      m = new THREE.Mesh(new THREE.CircleGeometry(0.12, 18, Math.PI, Math.PI), M('#3a1020'));
      const t = S(0.06, '#ff6f91', 10, 8); t.scale.set(1, 1.2, 0.5); m.add(at(t, 0.03, -0.1, 0.02));
      break;
    }
    case 'teeth': { // dentuço
      m = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.024, 6, 16, Math.PI), M('#141018')); m.rotation.z = Math.PI;
      [-1, 1].forEach(s => { const t = B(0.06, 0.08, 0.03, '#ffffff'); t.rotation.z = Math.PI; m.add(at(t, s * 0.033, 0.07, 0.01)); });
      break;
    }
    case 'braces': { // sorrisão com aparelho
      m = new THREE.Mesh(new THREE.CircleGeometry(0.13, 18, Math.PI, Math.PI), M('#ffffff'));
      const wire = B(0.22, 0.02, 0.01, '#9aa4b8'); m.add(at(wire, 0, -0.035, 0.01));
      for(let i = -2; i <= 2; i++) m.add(at(B(0.025, 0.03, 0.015, '#c9d1e0'), i * 0.045, -0.035, 0.015));
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 6, 18, Math.PI), M('#141018')); lip.rotation.z = Math.PI; m.add(lip);
      break;
    }
    case 'flat': m = B(0.18, 0.035, 0.03, '#141018'); break;
    case 'o': m = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.022, 8, 14), M('#141018')); break;
    case 'smirk': {
      m = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 6, 16, Math.PI * 0.75), M('#141018'));
      m.rotation.z = Math.PI * 1.1; break;
    }
    default: {
      m = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.024, 6, 16, Math.PI), M('#141018'));
      m.rotation.z = Math.PI;
    }
  }
  m.position.set(0, y, z); head.add(m);
}
function hair(head, kind, color, r){
  const g = new THREE.Group(); head.add(g);
  switch(kind){
    case 'spiky':
      for(let i = 0; i < 9; i++){
        const a = -1.3 + i * (2.6 / 8);
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 8), M(color));
        c.position.set(Math.sin(a) * r * 0.85, Math.cos(a) * r * 0.85 + 0.05, -0.08); c.rotation.z = -a; g.add(c);
      }
      break;
    case 'slick': {
      const h = new THREE.Mesh(new THREE.SphereGeometry(r * 1.04, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2.2), M(color));
      h.rotation.x = -0.35; h.position.y = 0.04; g.add(h);
      const wave = S(r * 0.42, color, 14, 10); wave.scale.set(1.4, 0.5, 1); g.add(at(wave, -r * 0.25, r * 0.78, r * 0.35));
      break;
    }
    case 'frizz':
      for(let i = 0; i < 16; i++){
        const a = (i / 16) * Math.PI * 2, b = 0.35 + (i % 3) * 0.28;
        g.add(at(S(0.17 + (i % 2) * 0.05, color, 10, 8), Math.cos(a) * r * Math.sin(b + 0.6), r * Math.cos(b) + 0.05, Math.sin(a) * r * Math.sin(b + 0.6) - 0.08));
      }
      break;
    case 'volume': {
      const h = S(r * 1.12, color, 22, 14); h.scale.set(1.05, 0.75, 1); g.add(at(h, 0, r * 0.38, -0.12));
      const fr = S(r * 0.45, color, 14, 10); fr.scale.set(1.6, 0.6, 0.8); g.add(at(fr, r * 0.15, r * 0.72, r * 0.42));
      break;
    }
    case 'messy':
      for(let i = 0; i < 7; i++){
        const a = -1.1 + i * 0.37;
        const t = S(0.16, color, 10, 8); t.scale.set(1, 0.6, 1.4);
        g.add(at(t, Math.sin(a) * r * 0.8, Math.cos(a) * r * 0.8 + 0.06, 0.02 * i - 0.1));
      }
      { const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 1.02, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), M(color)); cap.position.y = 0.05; g.add(cap); }
      break;
    case 'bun': {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 1.03, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), M(color)); cap.position.y = 0.04; g.add(cap);
      g.add(at(S(r * 0.38, color, 14, 10), 0, r * 1.05, -r * 0.2));
      break;
    }
    case 'mohawk':
      for(let i = 0; i < 6; i++){ const c = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 6), M(color)); const a = -0.9 + i * 0.36; c.position.set(0, Math.cos(a) * r + 0.12, Math.sin(a) * r); c.rotation.x = a; g.add(c); }
      break;
    case 'afro': {
      // black power atrás e em cima da cabeça, deixando o rosto livre
      const af = S(r * 1.28, color, 20, 14); af.scale.set(1.08, 0.9, 0.95); g.add(at(af, 0, r * 0.62, -r * 0.42));
      const pick2 = C(0.012, 0.012, 0.3, '#ff3ea5', 5); pick2.rotation.z = -0.4; g.add(at(pick2, r * 0.7, r * 1.05, 0.1));
      break;
    }
    case 'ponytail': {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 1.03, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), M(color)); cap.position.y = 0.04; g.add(cap);
      const tail = S(r * 0.32, color, 12, 10); tail.scale.set(0.8, 1.6, 0.8); g.add(at(tail, 0, r * 0.35, -r * 1.05));
      g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.025, 6, 12), M('#ff3ea5')), 0, r * 0.7, -r * 0.9));
      break;
    }
    case 'bald': {
      const shine = S(0.09, '#ffffff', 10, 8); shine.scale.set(1.4, 0.6, 0.4); shine.rotation.z = 0.4; g.add(at(shine, -r * 0.35, r * 0.82, r * 0.35));
      for(let i = 0; i < 3; i++){ const h = C(0.01, 0.01, 0.16, color, 4); h.rotation.z = (i - 1) * 0.4; g.add(at(h, (i - 1) * 0.05, r + 0.06, 0)); }
      break;
    }
    case 'beanie': {
      const bn = new THREE.Mesh(new THREE.SphereGeometry(r * 1.06, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M(color)); bn.scale.y = 1.15; g.add(at(bn, 0, 0.08, 0));
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, 0.07, 8, 26), M(color)); rim.rotation.x = Math.PI / 2; g.add(at(rim, 0, 0.12, 0));
      g.add(at(S(0.12, '#fbfaff', 10, 8), 0, r * 1.25 + 0.08, 0));
      break;
    }
    case 'propeller': {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 1.04, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M('#ff3ea5')); g.add(at(cap, 0, 0.08, 0));
      [0, 1, 2, 3].forEach(i => { const seg = new THREE.Mesh(new THREE.SphereGeometry(r * 1.05, 6, 10, i * Math.PI / 2, Math.PI / 4, 0, Math.PI / 2), M(i % 2 ? '#ffd21a' : '#2f7bff')); g.add(at(seg, 0, 0.08, 0)); });
      g.add(at(C(0.02, 0.02, 0.18, '#141018', 6), 0, r + 0.15, 0));
      const prop = new THREE.Group(); prop.position.set(0, r + 0.25, 0); g.add(prop);
      [-1, 1].forEach(s => { const bl = B(0.32, 0.02, 0.08, s < 0 ? '#ffd21a' : '#2f7bff'); bl.rotation.x = s * 0.25; prop.add(at(bl, s * 0.16, 0, 0)); });
      g.userData.spin = prop;
      break;
    }
    case 'party': {
      const hat = new THREE.Mesh(new THREE.ConeGeometry(r * 0.45, r * 1.1, 16), M('#8b3dff')); hat.rotation.z = 0.25; g.add(at(hat, -r * 0.2, r * 1.25, 0));
      for(let i = 0; i < 3; i++){ const dot = S(0.04, '#ffd21a', 6, 6); g.add(at(dot, -r * 0.2 + 0.06 - i * 0.07, r * 1.05 + i * 0.22, r * 0.25 - i * 0.04)); }
      g.add(at(S(0.08, '#c8f31d', 8, 6), -r * 0.34, r * 1.82, 0));
      break;
    }
    case 'short':
    default: {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 1.03, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.6), M(color)); cap.position.y = 0.08; g.add(cap);
    }
  }
  return g;
}
function legs(g, P, o){
  [-1, 1].forEach(s => {
    const piv = new THREE.Group(); piv.position.set(s * o.hip, o.legTop, 0); g.add(piv);
    const leg = o.blocky ? B(o.legW * 2, o.legLen, o.legW * 2, o.pants) : C(o.legW, o.legW, o.legLen, o.pants, 12);
    leg.position.y = -o.legLen / 2; piv.add(leg);
    const shoeC = o.shoes2 && s > 0 ? o.shoes2 : o.shoes;
    const shoe = o.blocky ? B(0.26, 0.14, 0.36, shoeC) : S(0.15, shoeC, 14, 10);
    if(!o.blocky) shoe.scale.set(1, 0.65, 1.45);
    shoe.position.set(0, -o.legLen - 0.02, 0.06); piv.add(shoe);
    P[s < 0 ? 'legL' : 'legR'] = piv;
  });
}
function arms(g, P, o){
  [-1, 1].forEach(s => {
    const piv = new THREE.Group(); piv.position.set(s * o.shoulder, o.armTop, 0); piv.rotation.z = s * (o.armSpread ?? 0.22); g.add(piv);
    const arm = o.blocky ? B(0.17, o.armLen, 0.17, o.sleeve) : C(0.085, 0.08, o.armLen, o.sleeve, 10);
    arm.position.y = -o.armLen / 2; piv.add(arm);
    const hand = o.blocky ? B(0.19, 0.19, 0.19, o.skin) : S(0.11, o.skin, 12, 10);
    hand.position.y = -o.armLen - 0.05; piv.add(hand);
    P[s < 0 ? 'armL' : 'armR'] = piv;
    P[s < 0 ? 'handL' : 'handR'] = hand;
  });
}

/* ---------- perfis ---------- */
const DEF = {
  caos:   { color:'#ff3ea5', outfit:['#ff3ea5','#c8f31d','#ff7a1a','#21d4a8'], body:'round',  hairK:['spiky','mohawk','propeller','afro','party'], eyesK:['uneven','wide','derp'], mouthK:['tongue','grin','teeth'], hairDye:true },
  ceo:    { color:'#2f6bff', outfit:['#2f6bff','#ff3ea5','#ffd21a','#c8f31d'], body:'suit',   hairK:['slick','slick','bald'], eyesK:['sure','wink'], mouthK:['smirk','smile','braces'] },
  genio:  { color:'#8b3dff', outfit:['#8b3dff','#21d4a8','#ff7a1a','#2f7bff'], body:'coat',   hairK:['frizz','afro','bald'], eyesK:['wide','round','derp'], mouthK:['grin','o','teeth'], headScale:1.18 },
  prota:  { color:'#ffb800', outfit:['#ffb800','#ff3ea5','#21d4a8','#8b3dff'], body:'hero',   hairK:['volume','afro','ponytail'], eyesK:['sure','wink','wide'], mouthK:['grin','braces','smile'] },
  clt:    { color:'#5b7fe0', outfit:['#5b7fe0','#ff3ea5','#c8f31d','#ff7a1a'], body:'shirt',  hairK:['messy','short','bald','beanie'], eyesK:['sleepy'], mouthK:['flat','o'] },
  npc:    { color:'#21d4a8', outfit:['#21d4a8','#ff7a1a','#8b3dff','#ffd21a'], body:'block',  hairK:['none'], eyesK:['pixel'], mouthK:['flat'] },
  hacker: { color:'#00b7ff', outfit:['#00b7ff','#c8f31d','#ff3ea5'],           body:'hoodie', hairK:['short','ponytail'], eyesK:['tiny','sleepy','wink'], mouthK:['flat','smirk','teeth'] },
  maker:  { color:'#ff7a1a', outfit:['#ff7a1a','#c8f31d','#ff3ea5','#2fd2ff'], body:'overall',hairK:['short','bun','ponytail'], eyesK:['round','wide','derp'], mouthK:['grin','smile','teeth'] }
};

/* Detalhes engraçados sorteados para cada pessoa (0 a 2 por personagem) */
const EXTRAS = ['mustache','unibrow','freckles','bandaid','bubblegum','sweat','bignose','beard','earring'];
function extras(head, list, o){
  const { headR:r, fz, hairC, skin } = o;
  const dark = ['#ff3ea5','#2fd2ff','#c8f31d','#8b3dff','#f4f1ff'].includes(hairC) ? '#3a2416' : hairC;
  list.forEach(k => {
    switch(k){
      case 'mustache': [-1, 1].forEach(s => { const m = S(0.09, dark, 12, 8); m.scale.set(1.5, 0.55, 0.6); m.rotation.z = s * -0.35; head.add(at(m, s * 0.1, -0.12, fz + 0.05)); }); break;
      case 'unibrow': { const b = B(0.5, 0.07, 0.05, dark); b.rotation.z = 0.04; head.add(at(b, 0, 0.27, fz + 0.03)); break; }
      case 'freckles': [-1, 1].forEach(s => { for(let i = 0; i < 3; i++) head.add(at(S(0.018, '#8a5a3a', 6, 4), s * (0.25 + (i % 2) * 0.06), -0.07 - i * 0.035, fz + 0.02)); }); break;
      case 'bandaid': { const b = B(0.2, 0.07, 0.02, '#f2c9a0'); b.rotation.z = 0.6; head.add(at(b, -0.3, -0.06, fz - 0.02)); head.add(at(B(0.06, 0.05, 0.02, '#e0a878'), -0.3, -0.06, fz)); break; }
      case 'bubblegum': { const g = S(0.17, '#ff8fd0', 18, 14); head.add(at(g, 0.04, -0.22, fz + 0.2)); head.add(at(S(0.04, '#ffffff', 8, 6), -0.03, -0.15, fz + 0.34)); break; }
      case 'sweat': { const d = new THREE.Group(); d.add(S(0.06, '#7fd6ff', 10, 8)); const c = new THREE.Mesh(new THREE.ConeGeometry(0.058, 0.1, 10), M('#7fd6ff')); d.add(at(c, 0, 0.07, 0)); head.add(at(d, r * 0.72, r * 0.42, r * 0.5)); break; }
      case 'bignose': { head.add(at(S(0.12, '#ff5a5a', 14, 10), 0, -0.06, fz + 0.1)); break; }
      case 'beard': { const bd = new THREE.Mesh(new THREE.SphereGeometry(r * 0.98, 20, 12, 0, Math.PI * 2, Math.PI * 0.7, Math.PI * 0.3), M(dark)); bd.rotation.x = -0.2; head.add(at(bd, 0, -0.03, 0.05)); break; }
      case 'earring': head.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 12), M('#ffd21a', '#4a3500')), -r * 1.0, -0.14, 0.02)); break;
    }
  });
}

window.buildAvatar2 = function(archId, seed){
  const d = DEF[archId] || DEF.caos;
  const r = rng(hashStr(archId + ':' + seed));
  const skin = pick(r, SKIN);
  const hairC = d.hairDye ? pick(r, ['#ff3ea5','#2fd2ff','#c8f31d','#8b3dff']) : pick(r, HAIR.slice(0, 6));
  const eyeK = pick(r, d.eyesK), mouthK = pick(r, d.mouthK), hairK = pick(r, d.hairK);
  // corpos mais exagerados: do magrelo altão ao gordinho baixinho
  const tall = 0.86 + r() * 0.3, wide = 0.84 + r() * 0.4, headK = 0.94 + r() * 0.18;
  const blush = r() > 0.5;
  const oc = pick(r, d.outfit || [d.color]);
  const nExtras = r() < 0.2 ? 0 : r() < 0.6 ? 1 : 2;
  const pool = EXTRAS.filter(e => !(e === 'bubblegum' && (mouthK === 'tongue' || mouthK === 'braces')));
  const extraList = [];
  while(extraList.length < nExtras){ const e = pick(r, pool); if(!extraList.includes(e) && !(e === 'beard' && extraList.includes('bubblegum'))) extraList.push(e); }

  const outer = new THREE.Group(); const g = new THREE.Group(); outer.add(g);
  const P = {body:g};
  const o = { skin, pants:'#2a2350', shoes:'#f4f1ff', legW:0.1, legLen:0.5, hip:0.17, legTop:0.6, shoulder:0.42, armTop:1.28, armLen:0.5, sleeve:d.color };
  let headY = 1.95, headR = 0.52 * (d.headScale || 1) * headK, torsoTop = 1.4;
  const blocky = d.body === 'block';

  // ---- tronco e roupa ----
  switch(d.body){
    case 'round': { // Caos: baixinho, camiseta listrada, bermuda, tênis de cores diferentes
      o.legLen = 0.38; o.legTop = 0.46; o.pants = '#1f6bff'; o.shoes = '#c8f31d'; o.shoes2 = '#ff7a1a'; o.armTop = 1.08;
      const t = S(0.46, oc, 22, 16); t.scale.set(1.05 * wide, 0.95, 0.9); g.add(at(t, 0, 0.82, 0));
      [0.62, 0.86, 1.06].forEach(y => { const st = new THREE.Mesh(new THREE.TorusGeometry(0.42 * wide * Math.cos((y - 0.82) * 1.6), 0.045, 6, 28), M('#fbfaff')); st.rotation.x = Math.PI / 2; st.scale.z = 0.9; g.add(at(st, 0, y, 0)); });
      headY = 1.62; headR = 0.55 * headK; o.shoulder = 0.44;
      break;
    }
    case 'suit': { // CEO: alto, terno, camisa branca, gravata, maleta
      o.legLen = 0.62; o.legTop = 0.72; o.pants = '#1b1f3a'; o.shoes = '#141018'; o.armTop = 1.52; o.armLen = 0.6; o.sleeve = '#1b1f3a'; o.shoulder = 0.4;
      const t = B(0.74 * wide, 0.86, 0.46, '#1b1f3a'); g.add(at(t, 0, 1.14, 0));
      const shirt = B(0.26, 0.8, 0.02, '#fbfaff'); g.add(at(shirt, 0, 1.17, 0.235));
      const tie = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.55, 4), M(oc)); tie.rotation.z = Math.PI; g.add(at(tie, 0, 1.18, 0.26));
      g.add(at(B(0.11, 0.08, 0.05, oc), 0, 1.5, 0.26));
      headY = 2.02; torsoTop = 1.57;
      break;
    }
    case 'coat': { // Gênio: magrinho, cabeção, jaleco branco
      o.legLen = 0.5; o.legTop = 0.6; o.pants = '#3b2f70'; o.shoes = '#ff3ea5'; o.sleeve = '#f4f1ff'; o.shoulder = 0.34; o.armTop = 1.3;
      const coat = C(0.3 * wide, 0.42 * wide, 0.82, '#f4f1ff', 20); g.add(at(coat, 0, 1.0, 0));
      const shirt = B(0.22, 0.6, 0.04, oc); g.add(at(shirt, 0, 1.1, 0.33));
      [-1, 1].forEach(s => { const lap = B(0.1, 0.5, 0.03, '#d9d3f2'); lap.rotation.z = s * 0.25; g.add(at(lap, s * 0.13, 1.12, 0.35)); });
      const pen = C(0.02, 0.02, 0.18, '#ff3ea5', 6); g.add(at(pen, -0.18, 1.2, 0.37));
      headY = 2.0;
      break;
    }
    case 'hero': { // Protagonista: ombros largos, capa, faixa
      o.legLen = 0.55; o.legTop = 0.64; o.pants = '#2a2350'; o.shoes = '#ffb800'; o.shoulder = 0.5; o.armTop = 1.42; o.armLen = 0.55; o.armSpread = 0.32;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * wide, 0.3 * wide, 0.82, 20), M(oc)); g.add(at(t, 0, 1.08, 0));
      const belt = C(0.33 * wide, 0.33 * wide, 0.1, '#141018', 20); g.add(at(belt, 0, 0.7, 0));
      g.add(at(B(0.16, 0.12, 0.06, '#ffd21a'), 0, 0.7, 0.33));
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), M('#fbfaff')); g.add(at(star, 0, 1.18, 0.38));
      const capeM = new THREE.MeshToonMaterial({color:'#ff3ea5', gradientMap:GRAD, side:THREE.DoubleSide});
      const cape = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.3), capeM); cape.position.set(0, 0.92, -0.32); cape.rotation.x = 0.2; g.add(cape); P.cape = cape;
      headY = 1.98;
      break;
    }
    case 'shirt': { // CLT: curvado, camisa social, gravata frouxa, crachá
      o.legLen = 0.5; o.legTop = 0.6; o.pants = '#3a3f55'; o.shoes = '#5a3418'; o.sleeve = '#cfe0ff'; o.armTop = 1.26;
      const t = S(0.44, '#cfe0ff', 20, 14); t.scale.set(1 * wide, 1.12, 0.85); g.add(at(t, 0, 1.0, 0));
      const tie = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.45, 4), M(oc)); tie.rotation.set(0.2, 0, Math.PI - 0.4); g.add(at(tie, 0.06, 1.08, 0.38));
      const lan = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.015, 6, 20, Math.PI), M('#ff3ea5')); lan.rotation.z = Math.PI; g.add(at(lan, 0, 1.28, 0.33));
      g.add(at(B(0.16, 0.2, 0.02, '#fbfaff'), 0, 1.02, 0.41)); g.add(at(B(0.12, 0.05, 0.03, oc), 0, 1.07, 0.42));
      g.rotation.x = 0.12; headY = 1.82;
      break;
    }
    case 'block': { // NPC: tudo quadrado, estilo jogo antigo
      o.blocky = true; o.legW = 0.1; o.legLen = 0.5; o.legTop = 0.6; o.pants = '#2f3b6e'; o.shoes = '#1b1530'; o.armTop = 1.38; o.shoulder = 0.42; o.armSpread = 0.05;
      const t = B(0.66, 0.8, 0.4, oc); g.add(at(t, 0, 1.0, 0));
      g.add(at(B(0.66, 0.1, 0.42, '#1b1530'), 0, 0.64, 0));
      headY = 1.82; headR = 0.5 * headK;
      break;
    }
    case 'hoodie': { // Hacker: moletom com capuz, calça de pijama, notebook
      o.legLen = 0.5; o.legTop = 0.6; o.pants = '#8b3dff'; o.shoes = '#f4f1ff'; o.sleeve = '#1b2a4a'; o.armTop = 1.24; o.armSpread = 0.05;
      const t = S(0.46, '#1b2a4a', 20, 14); t.scale.set(1 * wide, 1.05, 0.9); g.add(at(t, 0, 0.98, 0));
      const pocket = B(0.4, 0.16, 0.04, '#24365e'); g.add(at(pocket, 0, 0.82, 0.39));
      [-1, 1].forEach(s => { const str = C(0.015, 0.015, 0.22, '#fbfaff', 5); g.add(at(str, s * 0.08, 1.2, 0.38)); });
      headY = 1.8;
      break;
    }
    case 'overall': { // Gambiarra: parrudo, macacão, fita adesiva, cinto de ferramentas
      o.legLen = 0.42; o.legTop = 0.52; o.legW = 0.13; o.pants = '#2f5fa8'; o.shoes = '#5a3418'; o.sleeve = oc; o.shoulder = 0.5; o.armTop = 1.2;
      const t = S(0.5, oc, 20, 14); t.scale.set(1.15 * wide, 0.95, 0.9); g.add(at(t, 0, 0.92, 0));
      const bib = B(0.46, 0.42, 0.06, '#2f5fa8'); g.add(at(bib, 0, 0.86, 0.42));
      const lower = S(0.5, '#2f5fa8', 20, 10); lower.scale.set(1.16 * wide, 0.5, 0.92); g.add(at(lower, 0, 0.62, 0));
      [-1, 1].forEach(s => { const strap = B(0.07, 0.4, 0.04, '#2f5fa8'); g.add(at(strap, s * 0.18, 1.1, 0.4)); });
      const tape1 = B(0.32, 0.07, 0.03, '#c9c4dc'); tape1.rotation.z = 0.7; g.add(at(tape1, -0.3, 1.04, 0.36));
      const tape2 = tape1.clone(); tape2.rotation.z = -0.7; g.add(at(tape2, -0.3, 1.04, 0.37));
      headY = 1.7; headR = 0.5 * headK;
      break;
    }
  }
  o.skin = skin;
  legs(g, P, o); arms(g, P, o);

  // ---- cabeça ----
  const head = new THREE.Group(); head.position.y = headY; g.add(head); P.head = head;
  const hs = blocky ? B(0.86, 0.8, 0.8, skin) : S(headR, skin, 26, 20);
  if(!blocky) hs.scale.set(1, 0.95, 0.95);
  head.add(hs);
  if(!blocky) [-1, 1].forEach(s => { const ear = S(0.1, skin, 10, 8); ear.scale.z = 0.6; head.add(at(ear, s * headR * 0.98, -0.02, 0)); });
  const fz = blocky ? 0.41 : headR * 0.86;
  eyes(head, eyeK, fz, 0.05, skin);
  mouth(head, mouthK, blocky ? 0.41 : headR * 0.92, -0.2);
  if(blush && !blocky) [-1, 1].forEach(s => { const b = new THREE.Mesh(new THREE.CircleGeometry(0.07, 14), M('#ff8fb1')); head.add(at(b, s * 0.3, -0.12, headR * 0.89)); });
  if(hairK !== 'none'){ const hg = hair(head, hairK, hairC, headR); if(hg.userData.spin) P.spin = hg.userData.spin; }
  if(!blocky && !extraList.includes('bignose')){ const nose = S(0.06, skin, 10, 8); nose.scale.set(1, 0.8, 0.7); head.add(at(nose, 0, -0.06, fz + 0.06)); }
  if(blocky){ if(r() < 0.4) head.add(at(B(0.3, 0.07, 0.04, '#1b1530'), 0, -0.12, 0.42)); }
  else extras(head, extraList, { headR, fz, hairC, skin });

  // ---- acessórios do perfil ----
  switch(archId){
    case 'caos': {
      const bolt = new THREE.Shape(); bolt.moveTo(0, 0.3); bolt.lineTo(0.12, 0.3); bolt.lineTo(0.04, 0.08); bolt.lineTo(0.14, 0.08); bolt.lineTo(-0.06, -0.3); bolt.lineTo(0.0, -0.02); bolt.lineTo(-0.1, -0.02); bolt.closePath();
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(bolt, {depth:0.06, bevelEnabled:false}), M('#c8f31d', '#3d4d00'));
      m.position.set(0.55, headR + 0.35, 0); m.rotation.z = -0.3; head.add(m); P.float = m;
      break;
    }
    case 'ceo': {
      [-1, 1].forEach(s => { const fr = B(0.3, 0.2, 0.03, '#141018'); head.add(at(fr, s * 0.2, 0.05, fz + 0.08)); const l = B(0.24, 0.14, 0.02, '#9be7ff'); head.add(at(l, s * 0.2, 0.05, fz + 0.1)); });
      head.add(at(B(0.12, 0.03, 0.03, '#141018'), 0, 0.08, fz + 0.08));
      const bag = new THREE.Group(); bag.add(B(0.42, 0.3, 0.12, '#5a3418')); bag.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 6, 12, Math.PI), M('#141018')), 0, 0.15, 0));
      bag.position.set(0, -0.28, 0.02); P.handR.add(bag);
      break;
    }
    case 'genio': {
      [-1, 1].forEach(s => { const gg = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.05, 8, 18), M(oc)); gg.rotation.x = -0.4; head.add(at(gg, s * 0.2, headR * 0.62, headR * 0.6)); const ln = new THREE.Mesh(new THREE.CircleGeometry(0.13, 16), M('#9be7ff', '#1d4e66')); ln.rotation.x = -0.4; head.add(at(ln, s * 0.2, headR * 0.62, headR * 0.62)); });
      const bulb = new THREE.Group(); bulb.position.set(0, headR + 0.5, 0); head.add(bulb); P.float = bulb;
      bulb.add(S(0.16, '#ffe36e', 16, 12)); bulb.children[0].material = M('#ffe36e', '#7a6a00');
      bulb.add(at(C(0.08, 0.08, 0.12, '#9a96ad', 10), 0, -0.18, 0));
      const flask = C(0.03, 0.12, 0.22, '#21d4a8', 12); flask.position.y = -0.18; P.handL.add(flask);
      break;
    }
    case 'prota': {
      const gold = M('#ffd21a', '#4a3500');
      const cr = new THREE.Group(); cr.position.set(0, headR + 0.32, -0.05); cr.rotation.z = -0.15; head.add(cr);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.14, 20, 1, true), gold); band.material.side = THREE.DoubleSide; cr.add(band);
      for(let i = 0; i < 5; i++){ const a = i / 5 * Math.PI * 2; const pt = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 6), gold); cr.add(at(pt, Math.sin(a) * 0.27, 0.15, Math.cos(a) * 0.27)); }
      const glasses = B(0.62, 0.13, 0.04, '#141018'); head.add(at(glasses, 0, 0.07, fz + 0.1));
      const shine = B(0.1, 0.03, 0.02, '#fbfaff'); shine.rotation.z = 0.5; head.add(at(shine, -0.15, 0.1, fz + 0.13));
      break;
    }
    case 'clt': {
      const cup = new THREE.Group(); cup.position.set(0, -0.2, 0.08); P.handR.add(cup);
      cup.add(C(0.11, 0.1, 0.22, '#fbfaff', 14)); cup.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.02, 6, 12), M('#fbfaff')), 0.12, 0, 0));
      const steam = S(0.05, '#d9d3f2', 8, 6); cup.add(at(steam, 0, 0.22, 0)); cup.add(at(S(0.04, '#d9d3f2', 8, 6), 0.04, 0.32, 0));
      const zs = new THREE.Shape(); zs.moveTo(-0.1, 0.1); zs.lineTo(0.1, 0.1); zs.lineTo(0.1, 0.06); zs.lineTo(-0.04, -0.06); zs.lineTo(0.1, -0.06); zs.lineTo(0.1, -0.1); zs.lineTo(-0.1, -0.1); zs.lineTo(-0.1, -0.06); zs.lineTo(0.04, 0.06); zs.lineTo(-0.1, 0.06); zs.closePath();
      const zg = new THREE.ExtrudeGeometry(zs, {depth:0.04, bevelEnabled:false});
      const zzz = new THREE.Group(); zzz.position.set(0.5, headR + 0.2, 0); head.add(zzz); P.float = zzz;
      [[0, 0, 1], [0.22, 0.24, 0.75], [0.4, 0.44, 0.55]].forEach(([x, y, k]) => { const z = new THREE.Mesh(zg, M('#d9d3f2')); z.scale.setScalar(k); zzz.add(at(z, x, y, 0)); });
      break;
    }
    case 'npc': {
      const cap = B(0.9, 0.18, 0.84, '#ff3ea5'); head.add(at(cap, 0, 0.47, 0)); head.add(at(B(0.86, 0.06, 0.34, '#ff3ea5'), 0, 0.4, 0.55));
      const bang = new THREE.Group(); bang.position.set(0, 1.0, 0); head.add(bang); P.float = bang;
      bang.add(at(B(0.13, 0.36, 0.13, '#c8f31d'), 0, 0.1, 0)); bang.add(at(B(0.13, 0.13, 0.13, '#c8f31d'), 0, -0.2, 0));
      break;
    }
    case 'hacker': {
      const hoodM = new THREE.MeshToonMaterial({color:'#1b2a4a', gradientMap:GRAD, side:THREE.DoubleSide});
      const hood = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.2, 22, 14, Math.PI * 0.82, Math.PI * 1.36, 0, Math.PI * 0.8), hoodM);
      head.add(at(hood, 0, 0.04, -0.04));
      const rim = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.12, 0.06, 8, 26, Math.PI * 1.25), M('#24365e'));
      rim.rotation.z = -Math.PI * 0.125; head.add(at(rim, 0, 0.06, headR * 0.35));
      const band = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.22, 0.045, 8, 26, Math.PI), M('#141018')); head.add(at(band, 0, 0.05, 0));
      [-1, 1].forEach(s => { const cup = C(0.17, 0.17, 0.12, oc, 16); cup.rotation.z = Math.PI / 2; head.add(at(cup, s * headR * 1.18, 0.02, 0)); });
      const lap = new THREE.Group(); lap.position.set(0, 0.86, 0.48); lap.rotation.x = -0.15; g.add(lap);
      lap.add(B(0.6, 0.04, 0.4, '#c9c4dc')); const scr = B(0.6, 0.4, 0.03, '#c9c4dc'); lap.add(at(scr, 0, 0.2, -0.2)); scr.rotation.x = 0.25;
      lap.add(at(S(0.05, oc, 8, 6), 0, 0.22, -0.23));
      P.armL.rotation.x = -0.9; P.armR.rotation.x = -0.9; P.armBase = -0.9;
      break;
    }
    case 'maker': {
      const y = M('#ffd21a');
      const hat = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.08, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), y); head.add(at(hat, 0, 0.1, 0));
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.35, headR * 1.35, 0.05, 26), y); head.add(at(brim, 0, 0.12, 0.06));
      const wr = new THREE.Group(); wr.position.set(0, -0.25, 0.06); P.handL.add(wr);
      wr.add(B(0.07, 0.45, 0.05, '#c9c4dc')); wr.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.035, 6, 12, Math.PI * 1.4), M('#c9c4dc')), 0, 0.27, 0));
      const tb = C(0.6 * wide, 0.6 * wide, 0.1, '#5a3418', 22); g.add(at(tb, 0, 0.6, 0));
      break;
    }
  }

  outer.scale.set(wide, tall, wide);
  outer.userData = {P, skin, hairC, eyeK, mouthK, hairK, extras:extraList, outfit:oc};
  return outer;
};
})();
