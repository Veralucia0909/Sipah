
(() => {
'use strict';
const $ = s => document.querySelector(s);

/* ===================== ARMAZENAMENTO ===================== */
const store = {
  get(k,d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem(k); }catch(e){} }
};
let profile = store.get('sipah.profile', null);
function saveProfile(){ if(profile) store.set('sipah.profile', profile); }
// crypto.randomUUID só existe em HTTPS; este id funciona também em http na rede local
function newId(){
  const b = new Uint8Array(12);
  try{ crypto.getRandomValues(b); }catch(e){ for(let i = 0; i < b.length; i++) b[i] = Math.random()*256; }
  return 'p-' + Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
}
if(profile && !profile.id){ profile.id = newId(); saveProfile(); }

/* ===================== LÓGICA DO QUIZ ===================== */
function compute(answers){
  const a = {}; AK.forEach(k => a[k] = 0);
  answers.forEach((oi, qi) => {
    if(oi == null) return;
    const p = QUESTIONS[qi].opts[oi].p;
    for(const k in p) a[k] += p[k];
  });
  let best = ARCH[0], bs = -Infinity;
  ARCH.forEach(ar => {
    let s = 0, pos = 0;
    for(const k in ar.w){ s += ar.w[k] * a[k]; if(ar.w[k] > 0) pos += ar.w[k]; }
    s = s / Math.sqrt(pos) + (ar.b || 0);
    if(s > bs){ bs = s; best = ar; }
  });
  return {attrs:a, archId:best.id};
}
const topAttrs = a => AK.slice().sort((x,y) => (a[y]||0) - (a[x]||0));
function decisive(answers, arch){
  return answers.map((oi, qi) => {
    if(oi == null || !QUESTIONS[qi]) return null;   // perfis antigos tinham 8 respostas
    const p = QUESTIONS[qi].opts[oi].p; let s = 0;
    for(const k in p) s += (arch.w[k]||0) * p[k];
    return {qi, oi, s};
  }).filter(Boolean).sort((x,y) => y.s - x.s).slice(0,2);
}
const level = xp => 1 + Math.floor(xp / 300);

/* ===================== TELAS ===================== */
let currentStage = null;
let mode = 'menu';
function show(id){
  document.querySelectorAll('.screen').forEach(e => e.hidden = e.id !== id);
  const scr = document.getElementById(id);
  currentStage = scr ? scr.querySelector('.stage') : null;
  if(scr) scr.scrollTop = 0;
}

/* ===================== THREE: BASE ===================== */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);

const GRAD = (() => {
  const t = new THREE.DataTexture(new Uint8Array([80,165,255]), 3, 1, THREE.LuminanceFormat);
  t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
})();
const mat = (c, extra) => new THREE.MeshToonMaterial(Object.assign({color:c, gradientMap:GRAD}, extra||{}));

/* ===================== AVATAR ===================== */
// O visual vem de js/avatar.js. A mesma pessoa sempre recebe o mesmo personagem.
// A semente é o id do jogador: assim o ranking e o telão desenham o mesmo personagem que ele vê no celular.
const avatarSeed = p => p ? (p.id || p.nick || 'visitante') : 'visitante';
function buildAvatar(arch, seed){
  const inner = buildAvatar2(arch.id, seed);
  const wrap = new THREE.Group(); wrap.add(inner);   // a corrida mexe na escala do wrap, não na do personagem
  wrap.userData.P = inner.userData.P;
  wrap.userData.look = inner.userData;
  return wrap;
}

// Descrição do visual sorteado, para a tela de resultado
const LOOK_NAMES = {
  spiky:'cabelo espetado', slick:'topete de executivo', frizz:'cabelo de cientista maluco', volume:'cabelão de protagonista',
  messy:'cabelo de quem acabou de acordar', bun:'coque', mohawk:'moicano', afro:'black power', ponytail:'rabo de cavalo',
  bald:'careca brilhando', beanie:'gorro', propeller:'chapéu de hélice', party:'chapéu de festa',
  mustache:'bigode', unibrow:'monocelha', freckles:'sardas', bandaid:'curativo na bochecha', bubblegum:'bola de chiclete',
  sweat:'gota de suor', bignose:'narigão de palhaço', beard:'barba', earring:'brinco',
  derp:'olho vesgo', wink:'piscadinha', uneven:'um olho maior que o outro', teeth:'dentuço', braces:'aparelho nos dentes', tongue:'língua de fora'
};
function describeLook(look){
  const parts = [look.hairK, look.eyeK, look.mouthK, ...(look.extras || [])].map(k => LOOK_NAMES[k]).filter(Boolean);
  if(!parts.length) return '';
  return parts.length === 1 ? parts[0] : parts.slice(0, -1).join(', ') + ' e ' + parts[parts.length - 1];
}

function animateAvatar(av, t, state){
  const P = av.userData.P; if(!P) return;
  if(state === 'run'){
    const s = Math.sin(t*16);
    P.legL.rotation.x = s*0.9; P.legR.rotation.x = -s*0.9;
    P.armL.rotation.x = -s*0.9; P.armR.rotation.x = s*0.9;
    P.body.position.y = Math.abs(Math.cos(t*16))*0.08;
    P.head.rotation.z = 0;
  } else if(state === 'air'){
    P.legL.rotation.x = -0.9; P.legR.rotation.x = 0.4;
    P.armL.rotation.x = -2.6; P.armR.rotation.x = -2.6;
    P.body.position.y = 0;
  } else if(state === 'slide'){
    P.legL.rotation.x = -1.3; P.legR.rotation.x = -1.3;
    P.armL.rotation.x = 1.2; P.armR.rotation.x = 1.2;
    P.body.position.y = 0;
  } else {
    const s = Math.sin(t*2.2);
    P.legL.rotation.x = 0; P.legR.rotation.x = 0;
    P.armL.rotation.x = (P.armBase || 0) + s*0.15; P.armR.rotation.x = (P.armBase || 0) - s*0.15;
    P.body.position.y = s*0.03;
    P.head.rotation.z = s*0.06;
  }
  if(P.float) P.float.position.y = (P.float.userData.y0 ?? (P.float.userData.y0 = P.float.position.y)) + Math.sin(t*4)*0.08;
  if(P.spin) P.spin.rotation.y = t * (state === 'run' ? 22 : 6);
  if(P.cape) P.cape.rotation.x = 0.18 + (state === 'run' ? 0.5 + Math.sin(t*16)*0.08 : Math.sin(t*1.5)*0.04);
}

/* ===================== CENA DO MENU ===================== */
const lobby = new THREE.Scene();
const lcam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
lobby.add(new THREE.HemisphereLight(0xffffff, 0x3a2a70, 0.85));
{ const d = new THREE.DirectionalLight(0xffffff, 0.75); d.position.set(3, 6, 6); lobby.add(d); }
const lobbyGroup = new THREE.Group(); lobby.add(lobbyGroup);
let holders = []; let viewW = 3; let dragRot = 0;

function pedestal(){
  const p = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.15, 0.22, 40), mat('#2a1f58'));
  top.position.y = -0.11; p.add(top);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.04, 8, 48), mat('#c8f31d', {emissive:'#3d4d00'}));
  ring.rotation.x = Math.PI/2; p.add(ring);
  return p;
}
function setLobby(list, width){
  while(lobbyGroup.children.length) lobbyGroup.remove(lobbyGroup.children[0]);
  holders = []; viewW = width || 3; dragRot = 0;
  const gap = list.length > 1 ? 2.4 : 0;
  list.forEach((item, i) => {
    const h = new THREE.Group();
    h.position.x = (i - (list.length-1)/2) * gap;
    h.add(pedestal());
    const av = buildAvatar(item.arch, item.seed);
    if(list.length > 1) av.rotation.y = (i - 1) * -0.35;
    h.add(av);
    h.userData = {av, pop:null, phase:i*1.3};
    lobbyGroup.add(h); holders.push(h);
  });
}
function popHolder(i){ if(holders[i]) holders[i].userData.pop = 0; }

function fitLobby(){
  const W = window.innerWidth, H = window.innerHeight;
  if(!currentStage){ lobbyGroup.visible = false; return; }
  const r = currentStage.getBoundingClientRect();
  if(r.height < 40 || r.width < 40){ lobbyGroup.visible = false; return; }
  lobbyGroup.visible = true;
  lcam.aspect = W / H;
  const vf = lcam.fov * Math.PI / 180;
  const tanV = Math.tan(vf/2), tanH = tanV * lcam.aspect;
  const objH = 3.9, objW = viewW;
  const dH = (objH * (H / r.height)) / (2 * tanV);
  const dW = (objW * (W / r.width)) / (2 * tanH);
  const d = Math.max(dH, dW);
  lcam.position.set(0, 1.45 + d*0.12, d);
  lcam.lookAt(0, 1.45, 0);
  const cx = r.left + r.width/2, cy = r.top + r.height/2;
  lcam.setViewOffset(W, H, W/2 - cx, H/2 - cy, W, H);
  lcam.updateProjectionMatrix();
}

function updateLobby(dt, t){
  holders.forEach((h, i) => {
    const u = h.userData;
    animateAvatar(u.av, t + u.phase, 'idle');
    if(u.pop !== null){
      u.pop += dt;
      const k = Math.min(1, u.pop / 0.9);
      const e = k === 1 ? 1 : 1 - Math.pow(2, -10*k) * Math.cos(k * 10);
      u.av.scale.setScalar(Math.max(0.001, e));
      u.av.rotation.y = (1 - k) * Math.PI * 4;
      if(k === 1) u.pop = null;
    } else if(holders.length === 1){
      u.av.rotation.y = dragRot + Math.sin(t*0.6)*0.25;
    }
  });
}

/* arrastar para girar */
let dragging = false, dragX = 0;
document.querySelectorAll('.stage').forEach(st => {
  st.addEventListener('pointerdown', e => { dragging = true; dragX = e.clientX; st.setPointerCapture(e.pointerId); });
  st.addEventListener('pointermove', e => { if(!dragging) return; dragRot += (e.clientX - dragX) * 0.012; dragX = e.clientX; });
  const end = () => { dragging = false; };
  st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
});

/* ===================== CENA DA CORRIDA ===================== */
const run = new THREE.Scene();
const SKY = '#1b1038';
run.background = new THREE.Color(SKY);
run.fog = new THREE.Fog(SKY, 38, 105);
const rcam = new THREE.PerspectiveCamera(60, 1, 0.1, 220);
run.add(new THREE.HemisphereLight(0xffffff, 0x2a1d5c, 0.9));
{ const d = new THREE.DirectionalLight(0xffffff, 0.7); d.position.set(-4, 10, 6); run.add(d); }

const LANE = 2.2, TRACK_W = LANE*3, TRACK_L = 140, TILE = 10;
const trackTex = (() => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#2b2163'; x.fillRect(0, 0, 256, 256);
  x.fillStyle = '#33287a'; x.fillRect(0, 0, 256, 128);
  x.fillStyle = '#c8f31d'; x.fillRect(0, 0, 10, 256); x.fillRect(246, 0, 10, 256);
  x.fillStyle = '#e9e4ff';
  [256/3, 512/3].forEach(px => x.fillRect(px - 3, 30, 6, 90));
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, TRACK_L / TILE);
  t.anisotropy = 4;
  return t;
})();
{
  const tr = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_W, TRACK_L), new THREE.MeshLambertMaterial({map:trackTex}));
  tr.rotation.x = -Math.PI/2; tr.position.z = -TRACK_L/2 + 15; run.add(tr);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 200), mat('#150c2e'));
  floor.rotation.x = -Math.PI/2; floor.position.set(0, -0.02, -70); run.add(floor);
  [-1,1].forEach(s => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, TRACK_L), mat('#ff3ea5'));
    rail.position.set(s*(TRACK_W/2 + 0.15), 0.15, -TRACK_L/2 + 15); run.add(rail);
  });
}
const buildings = [];
{
  const pal = ['#3b2a7a','#2a3f9e','#5a2a8a','#232a6e','#46207a'];
  const neon = [new THREE.MeshBasicMaterial({color:'#c8f31d'}), new THREE.MeshBasicMaterial({color:'#ff3ea5'}), new THREE.MeshBasicMaterial({color:'#1f9bff'})];
  let seed = 7; const rnd = () => (seed = (seed*9301 + 49297) % 233280) / 233280;
  [-1,1].forEach(side => {
    for(let i = 0; i < 15; i++){
      const w = 3 + rnd()*3, h = 3 + rnd()*12, d = 4 + rnd()*3;
      const b = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(pal[Math.floor(rnd()*pal.length)]));
      box.position.y = h/2; b.add(box);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.15, h*0.7, 0.15), neon[Math.floor(rnd()*3)]);
      strip.position.set(-side*(w/2 + 0.05), h*0.5, d/2 - 0.3); b.add(strip);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.2, d + 0.2), neon[Math.floor(rnd()*3)]);
      cap.position.y = h + 0.1; b.add(cap);
      b.position.set(side*(TRACK_W/2 + 1.6 + w/2 + rnd()*2.5), 0, 12 - i*8 - rnd()*3);
      run.add(b); buildings.push(b);
    }
  });
}

/* obstáculos com texto */
function labelTex(lines, bg, fg){
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 512, 256);
  x.strokeStyle = fg; x.lineWidth = 12; x.strokeRect(14, 14, 484, 228);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  const parts = lines.split('\n');
  let size = parts.length > 1 ? 78 : 104;
  x.font = `900 ${size}px Rubik, system-ui, sans-serif`;
  const maxW = Math.max(...parts.map(p => x.measureText(p).width));
  if(maxW > 440){ size = Math.floor(size * 440 / maxW); x.font = `900 ${size}px Rubik, system-ui, sans-serif`; }
  parts.forEach((p, i) => x.fillText(p, 256, 128 + (i - (parts.length-1)/2) * size * 1.05));
  return new THREE.CanvasTexture(c);
}
let OBS = null;
function makeObsKit(){
  const yel = mat('#ffd21a'), pink = mat('#ff3ea5'), purp = mat('#8b3dff'), post = mat('#e9e4ff');
  const lab = (t, bg, fg) => mat('#ffffff', {map:labelTex(t, bg, fg)});
  OBS = {
    boleto:{geo:new THREE.BoxGeometry(1.9, 0.8, 0.5), mats:[yel,yel,yel,yel,lab('BOLETO','#ffd21a','#0d0a1a'),yel], d:0.25},
    grupo:{geo:new THREE.BoxGeometry(1.95, 0.6, 0.14), mats:[pink,pink,pink,pink,lab('GRUPO DA\nFAMÍLIA','#ff3ea5','#ffffff'),pink], post, d:0.07},
    segunda:{geo:new THREE.BoxGeometry(1.9, 2.7, 1.4), mats:[purp,purp,purp,purp,lab('SEGUNDA\nFEIRA','#8b3dff','#ffffff'),purp], d:0.7},
    postGeo:new THREE.CylinderGeometry(0.06, 0.06, 1.75, 8),
    coinGeo:new THREE.CylinderGeometry(0.32, 0.32, 0.09, 22),
    coinMat:mat('#c8f31d', {emissive:'#4a5e00'})
  };
}
function makeObs(type){
  const k = OBS[type], g = new THREE.Group();
  const m = new THREE.Mesh(k.geo, k.mats);
  if(type === 'boleto') m.position.y = 0.4;
  if(type === 'segunda') m.position.y = 1.35;
  if(type === 'grupo'){
    m.position.y = 1.48;
    [-1,1].forEach(s => { const p = new THREE.Mesh(OBS.postGeo, k.post); p.position.set(s*0.92, 0.875, 0); g.add(p); });
  }
  g.add(m);
  return g;
}

/* ===================== ESTADO DA CORRIDA ===================== */
let player = null, rs = 'idle';
let lane = 0, px = 0, py = 0, vy = 0, slideT = 0;
let speed = 14, dist = 0, runT = 0, coins = 0, score = 0, spawnAcc = 0;
let countT = 0, goFlash = 0, deathT = 0, deathType = 'boleto', overShown = false;
let obstacles = [], coinList = [];
let camX = 0;

function clearRun(){
  obstacles.forEach(o => run.remove(o.g)); coinList.forEach(c => run.remove(c.m));
  obstacles = []; coinList = [];
  if(player){ run.remove(player); player = null; }
}
function spawnRow(z){
  const lanes = [-1,0,1].sort(() => Math.random() - 0.5);
  const n = runT < 6 ? 1 : (Math.random() < 0.55 ? 2 : 1);
  const blocked = lanes.slice(0, n), free = lanes.slice(n);
  blocked.forEach(l => {
    const r = Math.random();
    const type = r < 0.38 ? 'boleto' : (r < 0.72 ? 'grupo' : 'segunda');
    const g = makeObs(type); g.position.set(l*LANE, 0, z); run.add(g);
    obstacles.push({g, type, x:l*LANE, d:OBS[type].d});
  });
  if(free.length && Math.random() < 0.8){
    const l = free[Math.floor(Math.random()*free.length)];
    for(let k = 0; k < 5; k++){
      const m = new THREE.Mesh(OBS.coinGeo, OBS.coinMat);
      m.rotation.x = Math.PI/2; m.position.set(l*LANE, 0.75, z + 3.2 - k*1.6);
      run.add(m); coinList.push({m, x:l*LANE});
    }
  }
}
function fitRun(){
  const W = window.innerWidth, H = window.innerHeight;
  rcam.aspect = W / H;
  rcam.clearViewOffset();
  if(rcam.aspect < 1){
    rcam.fov = 66;
    const z = 7.5 / Math.max(0.55, Math.min(1, rcam.aspect*1.3));
    rcam.userData = {z, y:3.3 + (z - 7.5)*0.32};
  } else {
    rcam.fov = 58; rcam.userData = {z:7.4, y:3.5};
  }
  rcam.updateProjectionMatrix();
}

let hintShown = false;
async function startRun(){
  try{ await document.fonts.ready; }catch(e){}
  if(!OBS) makeObsKit();
  clearRun();
  const arch = archById(profile.archId);
  player = buildAvatar(arch, avatarSeed(profile));
  player.rotation.y = Math.PI; run.add(player);
  lane = 0; px = 0; py = 0; vy = 0; slideT = 0;
  speed = 14; dist = 0; runT = 0; coins = 0; score = 0; spawnAcc = 30;
  countT = 3; goFlash = 0; deathT = 0; overShown = false; camX = 0;
  for(let z = -40; z > -100; z -= 20) spawnRow(z);
  rs = 'count'; mode = 'run';
  renderer.setClearColor(SKY, 1);
  $('#h-score').textContent = '0'; $('#h-coins').textContent = '0';
  $('#h-hint').hidden = hintShown && (profile.runs || 0) > 0;
  hintShown = true;
  show('s-run');
  fitRun();
}

function input(action){
  if(mode !== 'run' || rs !== 'go') return;
  if(action === 'left') lane = Math.max(-1, lane - 1);
  if(action === 'right') lane = Math.min(1, lane + 1);
  if(action === 'jump' && py <= 0.001 && slideT <= 0){ vy = 9.2; }
  if(action === 'jump' && slideT > 0){ slideT = 0; vy = 9.2; }
  if(action === 'slide'){ slideT = 0.75; if(py > 0.01) vy = -16; }
  $('#h-hint').hidden = true;
}
window.addEventListener('keydown', e => {
  if(mode !== 'run') return;
  const k = e.key.toLowerCase();
  const map = {arrowleft:'left', a:'left', arrowright:'right', d:'right', arrowup:'jump', w:'jump', ' ':'jump', arrowdown:'slide', s:'slide'};
  if(map[k]){ e.preventDefault(); input(map[k]); }
});
let sw = null;
window.addEventListener('pointerdown', e => { if(mode === 'run') sw = {x:e.clientX, y:e.clientY, t:performance.now()}; });
window.addEventListener('pointermove', e => {
  if(mode !== 'run' || !sw) return;
  const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
  if(Math.max(Math.abs(dx), Math.abs(dy)) > 36){
    if(Math.abs(dx) > Math.abs(dy)) input(dx < 0 ? 'left' : 'right');
    else input(dy < 0 ? 'jump' : 'slide');
    sw = null;
  }
});
window.addEventListener('pointerup', e => {
  if(mode === 'run' && sw && performance.now() - sw.t < 250) input('jump');
  sw = null;
});

function updateRun(dt, t){
  if(!player) return;
  const cd = rcam.userData || {z:7.4, y:3.5};
  if(rs === 'count'){
    countT -= dt;
    $('#h-count').textContent = countT > 0 ? String(Math.ceil(countT)) : '';
    animateAvatar(player, t, 'idle');
    if(countT <= 0){ rs = 'go'; goFlash = 0.7; $('#h-count').textContent = 'CORRE!'; Net.runStart(); }
  } else if(rs === 'go'){
    if(goFlash > 0){ goFlash -= dt; if(goFlash <= 0) $('#h-count').textContent = ''; }
    runT += dt;
    speed = Math.min(34, 14 + runT*0.35);
    const dz = speed * dt; dist += dz;
    trackTex.offset.y += dz / TILE;
    buildings.forEach(b => { b.position.z += dz; if(b.position.z > 16) b.position.z -= 15*8; });
    spawnAcc -= dz;
    if(spawnAcc <= 0){ spawnRow(-100); spawnAcc = speed*0.62 + 6 - Math.min(5, runT*0.05); }
    for(let i = obstacles.length - 1; i >= 0; i--){
      const o = obstacles[i]; o.g.position.z += dz;
      if(o.g.position.z > 14){ run.remove(o.g); obstacles.splice(i, 1); }
    }
    for(let i = coinList.length - 1; i >= 0; i--){
      const c = coinList[i]; c.m.position.z += dz; c.m.rotation.z += dt*4;
      if(c.m.position.z > 14){ run.remove(c.m); coinList.splice(i, 1); }
    }
    px += (lane*LANE - px) * Math.min(1, dt*14);
    vy -= 26*dt; py += vy*dt; if(py < 0){ py = 0; vy = 0; }
    if(slideT > 0) slideT -= dt;
    const sliding = slideT > 0 && py <= 0.01;
    player.position.set(px, py, 0);
    const sy = sliding ? 0.5 : 1;
    player.scale.y += (sy - player.scale.y) * Math.min(1, dt*20);
    player.rotation.z = (lane*LANE - px) * 0.12;
    animateAvatar(player, t, sliding ? 'slide' : (py > 0.05 ? 'air' : 'run'));

    const top = py + (sliding ? 0.95 : 2.1);
    for(const o of obstacles){
      const z = o.g.position.z;
      if(Math.abs(z) > o.d + 0.35) continue;
      if(Math.abs(o.x - px) > 1.15) continue;
      let hit = false;
      if(o.type === 'boleto') hit = py < 0.78;
      else if(o.type === 'grupo') hit = top > 1.18 && py < 1.78;
      else hit = py < 2.7;
      if(hit){ die(o.type); break; }
    }
    for(let i = coinList.length - 1; i >= 0; i--){
      const c = coinList[i];
      if(Math.abs(c.m.position.z) < 0.7 && Math.abs(c.x - px) < 0.9 && py < 1.6){
        coins++; run.remove(c.m); coinList.splice(i, 1);
      }
    }
    score = Math.floor(dist) + coins*10;
    $('#h-score').textContent = score; $('#h-coins').textContent = coins;
  } else if(rs === 'dead'){
    deathT += dt;
    player.position.z += 7*dt*Math.max(0, 1 - deathT);
    player.position.y = Math.max(0, player.position.y + (3 - deathT*9)*dt);
    player.rotation.x = Math.max(-1.5, player.rotation.x - dt*5);
    if(deathT > 1 && !overShown){ overShown = true; gameOver(); }
  }
  camX += (px*0.55 - camX) * Math.min(1, dt*5);
  rcam.position.set(camX, cd.y, cd.z);
  rcam.lookAt(camX*0.6, 1.1, -9);
}
function die(type){
  rs = 'dead'; deathType = type; deathT = 0;
  if(navigator.vibrate){ try{ navigator.vibrate(120); }catch(e){} }
}

function gameOver(){
  const prevBest = profile.best || 0;
  profile.runs = (profile.runs || 0) + 1;
  profile.coinsTotal = (profile.coinsTotal || 0) + coins;
  const gained = Math.round(score/8) + coins*2;
  const lvBefore = level(profile.xp || 0);
  profile.xp = (profile.xp || 0) + gained;
  const isRecord = score > prevBest;
  if(isRecord) profile.best = score;
  profile.ach = profile.ach || [];
  const fresh = ACH.filter(a => !profile.ach.includes(a.id) && a.test(profile, {score, coins}));
  fresh.forEach(a => profile.ach.push(a.id));
  saveProfile();
  const rk = store.get('sipah.rank', []);
  rk.push({nick:profile.nick, arch:profile.archId, score, ts:Date.now()});
  rk.sort((a,b) => b.score - a.score);
  store.set('sipah.rank', rk.slice(0, 50));

  const msgs = DEATH[deathType];
  $('#o-death').textContent = msgs[Math.floor(Math.random()*msgs.length)];
  $('#o-score').textContent = score;
  $('#o-detail').textContent = `${Math.floor(dist)} m · ${coins} moedas`;
  $('#o-record').hidden = !(isRecord && prevBest > 0);
  const lvAfter = level(profile.xp);
  $('#o-xp').textContent = `+${gained} XP` + (lvAfter > lvBefore ? ` · Subiu pro nível ${lvAfter}!` : '');
  const oa = $('#o-ach'); oa.innerHTML = '';
  fresh.forEach(a => { const s = document.createElement('span'); s.className = 'chip on'; s.textContent = '★ ' + a.n; oa.appendChild(s); });
  $('#h-count').textContent = '';
  const net = $('#o-net');
  if(Net.online()){
    net.textContent = 'Enviando pro ranking…';
    Net.runFinish({score, coins, dist:Math.floor(dist)}).then(r => {
      if(r && r.ok) net.textContent = r.isBest ? `Você está em #${r.position} de ${r.total} no ranking de hoje.` : `Seu recorde de hoje continua valendo (#${r.position} no ranking).`;
      else net.textContent = 'Não deu pra enviar essa corrida pro ranking.';
    });
  } else net.textContent = 'Sem conexão com o ranking. A corrida ficou salva neste aparelho.';
  show('s-over');
}

/* ===================== FLUXO ===================== */
let qi = 0, answers = [], locking = false, nickTmp = '', nextTimer = 0;
// Tempo que o comentário fica na tela antes da próxima pergunta (em milissegundos)
const READ_TIME = 3000;

function goIntro(){
  mode = 'menu'; renderer.setClearColor(0x000000, 0);
  setLobby([
    {arch:archById('caos'), seed:'pessoa-14'},
    {arch:archById('prota'), seed:'pessoa-15'},
    {arch:archById('clt'), seed:'pessoa-12'}
  ], 7.4);
  show('s-intro');
}
$('#btn-start').addEventListener('click', () => {
  let n = $('#nick').value.trim().replace(/\s+/g, '_').replace(/[^\p{L}\p{N}_.-]/gu, '').slice(0, 14);
  if(!n) n = 'anonimo_' + Math.floor(100 + Math.random()*900);
  if(BAD.test(n.replace(/[_.-]/g, ' '))){ $('#nick-err').textContent = 'Esse apelido não passa no estande. Tenta outro.'; return; }
  $('#nick-err').textContent = '';
  nickTmp = n; qi = 0; answers = new Array(QUESTIONS.length).fill(null);
  mode = 'menu'; setLobby([], 3);
  show('s-quiz'); renderQ(1);
});
$('#nick').addEventListener('keydown', e => { if(e.key === 'Enter') $('#btn-start').click(); });

function renderQ(dir){
  const q = QUESTIONS[qi];
  $('#q-count').textContent = `Pergunta ${qi+1} de ${QUESTIONS.length}`;
  $('#q-fill').style.width = (qi / QUESTIONS.length * 100) + '%';
  $('#q-text').textContent = q.t;
  const box = $('#q-opts'); box.innerHTML = '';
  q.opts.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'opt' + (answers[qi] === i ? ' sel' : ''); b.id = 'opt-' + i;
    const k = document.createElement('span'); k.className = 'k'; k.textContent = 'ABCD'[i];
    const t = document.createElement('span'); t.textContent = o.t;
    b.append(k, t); b.addEventListener('click', () => pick(i)); box.appendChild(b);
  });
  $('#q-comment').textContent = '';
  $('#q-next').hidden = true;
  const card = $('#q-card');
  card.classList.remove('enter', 'enter-back'); void card.offsetWidth;
  card.classList.add(dir < 0 ? 'enter-back' : 'enter');
}
function pick(i){
  if(locking) return; locking = true;
  answers[qi] = i;
  [...$('#q-opts').children].forEach((b, j) => b.classList.toggle('sel', j === i));
  $('#q-comment').textContent = QUESTIONS[qi].opts[i].r;
  $('#q-fill').style.width = ((qi+1) / QUESTIONS.length * 100) + '%';
  const nx = $('#q-next');
  nx.style.setProperty('--wait', READ_TIME + 'ms');
  nx.hidden = true; void nx.offsetWidth; nx.hidden = false;
  $('#btn-next').firstChild.textContent = qi < QUESTIONS.length - 1 ? 'Próxima →' : 'Ver resultado →';
  clearTimeout(nextTimer);
  nextTimer = setTimeout(advance, READ_TIME);
}
function advance(){
  if(!locking) return;
  clearTimeout(nextTimer);
  locking = false;
  if(qi < QUESTIONS.length - 1){ qi++; renderQ(1); } else finishQuiz();
}
$('#btn-next').addEventListener('click', advance);
$('#q-back').addEventListener('click', () => {
  if(locking){ clearTimeout(nextTimer); locking = false; renderQ(-1); return; }
  if(qi === 0){ goIntro(); return; }
  qi--; renderQ(-1);
});

function finishQuiz(){
  show('s-calc');
  const lines = [...document.querySelectorAll('#calc-lines p')];
  lines.forEach(l => l.classList.remove('on'));
  lines.forEach((l, i) => setTimeout(() => l.classList.add('on'), 150 + i*420));
  const res = compute(answers);
  profile = {id:newId(), nick:nickTmp, answers:answers.slice(), attrs:res.attrs, archId:res.archId, quizVersion:1,
             created:Date.now(), best:0, runs:0, xp:0, coinsTotal:0, ach:[]};
  saveProfile();
  Net.join(profile);
  setTimeout(() => showResult(true), 150 + lines.length*420 + 300);
}

function showResult(reveal){
  mode = 'menu'; renderer.setClearColor(0x000000, 0);
  const arch = archById(profile.archId), a = profile.attrs;
  $('#r-name').textContent = arch.name;
  $('#r-quote').textContent = '“' + arch.quote + '”';
  $('#r-desc').textContent = arch.desc;
  const max = Math.max(1, ...AK.map(k => a[k] || 0));
  const bars = $('#r-bars'); bars.innerHTML = '';
  topAttrs(a).forEach(k => {
    const row = document.createElement('div'); row.className = 'bar';
    const n = document.createElement('span'); n.textContent = ATTR[k].n;
    const t = document.createElement('div'); t.className = 't';
    const i = document.createElement('i'); i.style.background = ATTR[k].c; t.appendChild(i);
    const v = document.createElement('b'); v.textContent = a[k] || 0;
    row.append(n, t, v); bars.appendChild(row);
    requestAnimationFrame(() => requestAnimationFrame(() => { i.style.width = Math.max(4, (a[k] || 0)/max*100) + '%'; }));
  });
  const why = $('#r-why'); why.innerHTML = '';
  const tops = topAttrs(a);
  const li0 = document.createElement('li');
  li0.textContent = `Seus atributos mais fortes: ${ATTR[tops[0]].n} (${a[tops[0]]}) e ${ATTR[tops[1]].n} (${a[tops[1]]}).`;
  why.appendChild(li0);
  const look = describeLook(buildAvatar2(arch.id, avatarSeed(profile)).userData);
  if(look){ const lv = document.createElement('li'); lv.textContent = `Seu visual é só seu: ${look}.`; why.appendChild(lv); }
  decisive(profile.answers, arch).forEach(d => {
    const li = document.createElement('li');
    li.textContent = `Você respondeu “${QUESTIONS[d.qi].opts[d.oi].t}”`;
    why.appendChild(li);
  });
  $('#r-area').textContent = arch.area;
  $('#r-areawhy').textContent = arch.areaWhy;
  $('#btn-accept').firstChild.textContent = reveal ? 'Esse sou eu, infelizmente' : 'Voltar pro lobby';
  setLobby([{arch, seed:avatarSeed(profile)}], 3);
  if(reveal) popHolder(0);
  show('s-result');
}
$('#btn-accept').addEventListener('click', goLobby);

function goLobby(){
  mode = 'menu'; renderer.setClearColor(0x000000, 0);
  clearRun();
  const arch = archById(profile.archId);
  $('#l-nick').textContent = '@' + profile.nick;
  $('#l-arch').textContent = arch.name;
  $('#l-best').textContent = profile.best || 0;
  const xp = profile.xp || 0;
  $('#l-lvl').textContent = level(xp);
  $('#l-xp').style.width = ((xp % 300) / 300 * 100) + '%';
  const box = $('#l-ach'); box.innerHTML = '';
  const got = profile.ach || [];
  ACH.forEach(a => { const s = document.createElement('span'); s.className = 'chip' + (got.includes(a.id) ? ' on' : ''); s.textContent = (got.includes(a.id) ? '★ ' : '☆ ') + a.n; box.appendChild(s); });
  setLobby([{arch, seed:avatarSeed(profile)}], 3);
  Net.join(profile);
  setNetChip(Net.online(), Net.mode());
  rankWatch(false);
  resetArmed = false; $('#btn-reset').textContent = 'Novo jogador (apagar este avatar)';
  show('s-lobby');
}
$('#btn-run').addEventListener('click', startRun);
$('#btn-again').addEventListener('click', startRun);
$('#btn-lobby').addEventListener('click', goLobby);
$('#btn-profile').addEventListener('click', () => showResult(false));

function rankRows(){
  const st = Net.state();
  if(Net.online() && st){
    $('#rk-sub').textContent = `${Net.mode() === 'global' ? 'Ranking global de hoje' : 'Hoje no estande'} · ${st.totalPlayers} jogadores · ${st.totalRuns} corridas`;
    return st.top.map(r => ({nick:r.nick, arch:r.archId, score:r.score, seed:r.id, me:profile && r.id === profile.id}));
  }
  $('#rk-sub').textContent = 'Sem conexão: melhores corridas deste aparelho';
  return store.get('sipah.rank', []).slice(0, 10).map(r => {
    const me = profile && r.nick === profile.nick;
    return {nick:r.nick, arch:r.arch, score:r.score, seed: me ? avatarSeed(profile) : r.nick, me};
  });
}
function renderRank(){
  const list = $('#rk-list'); list.innerHTML = '';
  const rk = rankRows();
  if(!rk.length){ const li = document.createElement('li'); li.className = 'empty'; li.innerHTML = '<span class="n"><b>Ninguém correu ainda.</b><span>Seja o primeiro a passar vergonha.</span></span>'; list.appendChild(li); }
  rk.forEach((r, i) => {
    const li = document.createElement('li'); if(r.me) li.className = 'me';
    const p = document.createElement('span'); p.className = 'pos'; p.textContent = i + 1;
    const n = document.createElement('span'); n.className = 'n';
    const b = document.createElement('b'); b.textContent = '@' + r.nick;
    const s2 = document.createElement('span'); s2.textContent = archById(r.arch).name;
    n.append(b, s2);
    const s = document.createElement('span'); s.className = 's'; s.textContent = r.score;
    const arch = archById(r.arch);
    li.append(p, AvatarThumb.img(arch.id, r.seed, arch.color), n, s); list.appendChild(li);
  });
}
function showRank(){
  mode = 'menu'; renderer.setClearColor(0x000000, 0); clearRun();
  setLobby([], 3);
  renderRank();
  rankWatch(true);
  show('s-rank');
}
// enquanto o ranking está aberto, o placar se atualiza sozinho
let rankWatching = false;
function rankWatch(on){
  if(on === rankWatching) return;
  rankWatching = on; Net.watch(on, 4000);
}
Net.onState(() => { if(!$('#s-rank').hidden) renderRank(); });
function setNetChip(on, m){
  const c = $('#l-net'); if(!c) return;
  c.textContent = !on ? '○ Offline' : m === 'local' ? '● Telão do estande' : '● Ranking global';
  c.classList.toggle('on', on);
}
Net.onStatus(setNetChip);
$('#btn-rank').addEventListener('click', showRank);
$('#btn-rank2').addEventListener('click', showRank);
$('#rk-back').addEventListener('click', goLobby);

let resetArmed = false, resetTimer = 0;
$('#btn-reset').addEventListener('click', () => {
  if(!resetArmed){
    resetArmed = true; $('#btn-reset').textContent = 'Toque de novo para apagar seu avatar';
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => { resetArmed = false; $('#btn-reset').textContent = 'Novo jogador (apagar este avatar)'; }, 3500);
    return;
  }
  store.del('sipah.profile'); profile = null; $('#nick').value = ''; goIntro();
});

/* ===================== CARD PRO STORY ===================== */
let snapR = null;
function avatarSnapshot(arch, seed){
  if(!snapR){
    snapR = new THREE.WebGLRenderer({antialias:true, alpha:true, preserveDrawingBuffer:true});
    snapR.setPixelRatio(1); snapR.setSize(900, 900, false); snapR.setClearColor(0x000000, 0);
  }
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xffffff, 0x3a2a70, 0.85));
  const d = new THREE.DirectionalLight(0xffffff, 0.75); d.position.set(3, 6, 6); sc.add(d);
  sc.add(pedestal());
  const av = buildAvatar(arch, seed); av.rotation.y = -0.35; sc.add(av);
  animateAvatar(av, 0.4, 'idle');
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  cam.position.set(0, 2.1, 8.2); cam.lookAt(0, 1.45, 0);
  snapR.render(sc, cam);
  return snapR.domElement;
}
function wrapText(x, text, maxW){
  const words = text.split(' '); const lines = []; let cur = '';
  words.forEach(w => { const t = cur ? cur + ' ' + w : w; if(x.measureText(t).width > maxW && cur){ lines.push(cur); cur = w; } else cur = t; });
  if(cur) lines.push(cur); return lines;
}
async function makeCard(){
  try{ await Promise.all([document.fonts.load('100px "Permanent Marker"'), document.fonts.load('100px "Lilita One"'), document.fonts.load('900 40px Rubik'), document.fonts.load('600 40px Rubik')]); }catch(e){}
  const arch = archById(profile.archId), a = profile.attrs;
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
  const x = c.getContext('2d');
  const bg = x.createLinearGradient(0, 0, 0, 1920);
  bg.addColorStop(0, '#34197a'); bg.addColorStop(0.55, '#140d2e'); bg.addColorStop(1, '#0d0a1a');
  x.fillStyle = bg; x.fillRect(0, 0, 1080, 1920);
  x.save(); x.globalAlpha = 0.9; x.fillStyle = '#c8f31d';
  x.translate(540, 300); x.rotate(-0.12);
  x.fillRect(-700, 70, 1400, 26); x.fillRect(-500, 112, 900, 12);
  x.restore();
  const marker = '"Permanent Marker", "Comic Sans MS", cursive';
  const display = '"Lilita One", "Arial Rounded MT Bold", Rubik, sans-serif';
  x.save(); x.translate(330, 110); x.rotate(-0.14); x.scale(1.3, 1.3);
  x.beginPath(); x.moveTo(8,70); x.lineTo(14,18); x.lineTo(38,44); x.lineTo(60,6); x.lineTo(82,44); x.lineTo(106,18); x.lineTo(112,70); x.closePath();
  x.fillStyle = '#c8f31d'; x.strokeStyle = '#07050f'; x.lineWidth = 8; x.lineJoin = 'round'; x.stroke(); x.fill();
  x.restore();
  x.save(); x.translate(540, 290); x.rotate(-0.1);
  x.font = `190px ${marker}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 22; x.strokeStyle = '#07050f'; x.strokeText('Sipah', 0, 0);
  x.fillStyle = '#c8f31d'; x.fillText('Sipah', 8, 8);
  x.fillStyle = '#ffffff'; x.fillText('Sipah', 0, 0);
  x.restore();
  x.textAlign = 'center';
  x.fillStyle = '#c8f31d'; x.font = '900 46px Rubik, system-ui, sans-serif';
  x.fillText('VOCÊ É:', 540, 520);
  x.fillStyle = '#ffffff'; x.font = `100px ${display}`;
  const nl = wrapText(x, arch.name.toUpperCase(), 980);
  nl.forEach((l, i) => x.fillText(l, 540, 620 + i*100));
  const ny = 620 + (nl.length - 1)*100;
  const snap = avatarSnapshot(arch, avatarSeed(profile));
  // nome em 2 linhas: personagem um pouco menor para o rodapé não encavalar
  const snapSize = 760 - (nl.length - 1) * 120;
  x.drawImage(snap, 540 - snapSize / 2, ny + 30, snapSize, snapSize);
  let y = ny + snapSize + 100;
  x.fillStyle = '#c8f31d'; x.font = `54px ${display}`;
  wrapText(x, '“' + arch.quote + '”', 940).forEach(l => { x.fillText(l, 540, y); y += 64; });
  y += 20;
  const tops = topAttrs(a).slice(0, 3), max = Math.max(1, ...AK.map(k => a[k] || 0));
  x.textAlign = 'left';
  tops.forEach(k => {
    x.fillStyle = '#ffffff'; x.font = '600 34px Rubik, system-ui, sans-serif';
    x.fillText(ATTR[k].n, 120, y);
    x.fillStyle = '#251c4c'; x.fillRect(470, y - 26, 490, 26);
    x.fillStyle = ATTR[k].c; x.fillRect(470, y - 26, 490 * Math.max(0.05, (a[k] || 0)/max), 26);
    y += 58;
  });
  y += 20;
  x.textAlign = 'center';
  x.fillStyle = '#b9b0de'; x.font = '600 34px Rubik, system-ui, sans-serif';
  x.fillText('No SENAI, combina com', 540, y); y += 54;
  x.fillStyle = '#ffffff'; x.font = '900 48px Rubik, system-ui, sans-serif';
  x.fillText(arch.area, 540, y);
  x.fillStyle = '#b9b0de'; x.font = '600 32px Rubik, system-ui, sans-serif';
  x.fillText(`@${profile.nick} · recorde ${profile.best || 0} pts`, 540, 1870);
  const url = c.toDataURL('image/png');
  $('#card-img').src = url;
  const dl = $('#card-dl'); dl.href = url; dl.download = `sipah-${profile.nick}.png`;
  $('#card').hidden = false;
}
$('#btn-card1').addEventListener('click', makeCard);
$('#btn-card2').addEventListener('click', makeCard);
$('#card-close').addEventListener('click', () => { $('#card').hidden = true; });

/* ===================== LOOP ===================== */
function resize(){
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  fitRun();
}
window.addEventListener('resize', resize);
resize();

let last = performance.now(), T = 0;
function loop(now){
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
  if(mode === 'menu'){
    updateLobby(dt, T); fitLobby();
    renderer.render(lobby, lcam);
  } else {
    updateRun(dt, T);
    renderer.render(run, rcam);
  }
}

Net.init();
if(profile && profile.archId){ goLobby(); } else { goIntro(); }
requestAnimationFrame(loop);
})();
