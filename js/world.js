// ════════════════════════════════════════════════════════════════
// THE PEDANTICO INSTITUTE
// A grand art deco hall under the sea, with a department off each side
// and a lift at the far end.
//
// Layout (looking down, the player starts at the bottom):
//
//      z = -94   [ LIFT ]
//      -86  Hall of False Rules  |
//      -74                       |  Grammar Crimes
//      -62  Apostrophe Vault     |
//      -50                       |  Laboratory of Confusion
//      -44            [ statue of Dr Pedant ]
//      -38  Homophone Hydroponics|
//      -26                       |  Pronoun Processing
//      -14  Quantities           |
//        0         (start)
// ════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { tex, checkerFloor, parquet, wallpaper, panelling, ceiling, poster, neon, plaque, makeWater, photo, IMG } from './textures.js';
import { makeCharacter } from './characters.js';

export const HALL = { x: 5, zStart: 6, zEnd: -94, h: 8 };
export const ROOM_Z = { quant: [-1, -14], pron: [1, -26], homo: [-1, -38], conf: [1, -50], apos: [-1, -62], crime: [1, -74], myth: [-1, -86] };
const ROOM_W = 12, ROOM_HALF = 6.5, ROOM_H = 5, DOOR_HALF = 1.5, DOOR_H = 3.4;

const ROOM_PAPER = {
  quant: ['#4a1426', '#d9a35a'], pron: ['#152a44', '#c9a45a'], homo: ['#123a26', '#b8d48a'], conf: ['#3d3410', '#e0c060'],
  apos: ['#4a2010', '#e0a060'], crime: ['#101a36', '#a8b8e0'], myth: ['#2e2a26', '#a89a80'],
};

export function buildWorld(scene, DEPTS, quality) {
  const W = new THREE.Group(); scene.add(W);
  const colliders = [], interact = [], lamps = [], robots = {}, statusLamps = {}, animated = [];
  const hi = quality === 'high', school = quality === 'school';

  // ── materials ──
  const M = {};
  const floorTex = tex(checkerFloor(), [5, 50]);
  M.floor = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.22, metalness: 0.05 });
  M.parquet = new THREE.MeshStandardMaterial({ map: tex(parquet(), [3, 3]), roughness: 0.55 });
  M.panel = new THREE.MeshStandardMaterial({ map: tex(panelling()), roughness: 0.5 });
  M.hallPaper = new THREE.MeshStandardMaterial({ map: tex(wallpaper('#0e2c29', '#b8924c')), roughness: 0.8 });
  M.ceil = new THREE.MeshStandardMaterial({ map: tex(ceiling(), [5, 50]), roughness: 0.9 });
  const bronze = tex(photo('bronze', '#9a7434'));
  M.brass = new THREE.MeshStandardMaterial({ color: 0xd8ae62, map: bronze, metalness: 0.92, roughness: 0.3 });
  M.darkBrass = new THREE.MeshStandardMaterial({ color: 0x8a6430, map: bronze, metalness: 0.85, roughness: 0.45 });
  const marbleC = photo('marble', '#ddd');
  M.marble = new THREE.MeshStandardMaterial({ map: tex(marbleC), roughness: 0.2 });
  M.greenMarble = new THREE.MeshStandardMaterial({ map: tex(marbleC), color: 0x3d6b5c, roughness: 0.18 });
  M.blackMarble = new THREE.MeshStandardMaterial({ map: tex(marbleC), color: 0x2a2826, roughness: 0.2 });
  M.wood = new THREE.MeshStandardMaterial({ map: tex(photo('wood', '#6b4a2e')), roughness: 0.55 });
  M.leather = new THREE.MeshStandardMaterial({ color: 0x6a1a14, roughness: 0.55 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe8ee, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0, depthWrite: false });
  M.lampGlow = new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false });
  M.black = new THREE.MeshStandardMaterial({ color: 0x0e0d0c, roughness: 0.6 });
  M.red = new THREE.MeshStandardMaterial({ color: 0xb8241c, roughness: 0.35 });
  M.cream = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.6 });
  const water = makeWater();
  M.water = new THREE.MeshBasicMaterial({ map: water.texture, toneMapped: false });

  // ── helpers ──
  // Planar UVs from world position, so textures tile at a steady size on any box
  function worldUV(geo, ox, oy, oz, scale) {
    const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + ox, y = p.getY(i) + oy, z = p.getZ(i) + oz, ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      if (ax >= ay && ax >= az) uv.setXY(i, z / scale, y / scale);
      else if (ay >= az) uv.setXY(i, x / scale, z / scale);
      else uv.setXY(i, x / scale, y / scale);
    }
    uv.needsUpdate = true;
  }
  function box(w, h, d, x, y, z, mat, o = {}) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (o.uv) worldUV(g, x, y, z, o.uv);
    const m = new THREE.Mesh(g, mat); m.position.set(x, y, z);
    if (o.ry) m.rotation.y = o.ry;
    (o.parent || W).add(m);
    if (o.solid) colliders.push({ x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2 });
    return m;
  }
  function solid(x0, z0, x1, z1) { colliders.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1) }); }
  function cyl(rt, rb, h, x, y, z, mat, seg = 20) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); W.add(m); return m; }
  function plane(w, h, x, y, z, ry, mat) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = ry; W.add(m); return m; }
  function lamp(x, y, z, color = 0xffc98a, power = 1) { lamps.push({ p: new THREE.Vector3(x, y, z), color: new THREE.Color(color), power, flicker: 0 }); return lamps[lamps.length - 1]; }
  const posterMats = {};
  function wallPoster(lines, x, y, z, ry, o = {}) {
    const key = lines.join('|');
    if (!posterMats[key]) posterMats[key] = new THREE.MeshStandardMaterial({ map: tex(poster(lines, o)), roughness: 0.75 });
    const f = box(1.36, 1.96, 0.05, x, y, z, M.darkBrass, { ry });
    const p = plane(1.2, 1.8, x + Math.sin(ry) * 0.03, y, z + Math.cos(ry) * 0.03, ry, posterMats[key]);
    return p;
  }
  // A wall that runs along z (at a fixed x), with gaps for doors. face: +1 if the room side is +x
  function wallAlongZ(x, zA, zB, gaps, h, paper, thick = 0.3) {
    const segs = []; let z = Math.max(zA, zB); const zEnd = Math.min(zA, zB);
    const gs = gaps.slice().sort((a, b) => b - a);
    for (const gz of gs) { segs.push([z, gz + DOOR_HALF]); z = gz - DOOR_HALF; }
    segs.push([z, zEnd]);
    for (const [a, b] of segs) {
      if (a - b < 0.01) continue;
      const len = a - b, cz = (a + b) / 2;
      box(thick, h, len, x, h / 2, cz, paper, { uv: 2.2, solid: true });
      box(thick + 0.08, 1.3, len, x, 0.65, cz, M.panel, { uv: 2.6 });
      box(thick + 0.14, 0.07, len, x, 1.33, cz, M.brass, { uv: 1 });
      box(thick + 0.12, 0.14, len, x, 0.07, cz, M.blackMarble, { uv: 1 });
    }
    for (const gz of gaps) {
      box(thick, h - DOOR_H, DOOR_HALF * 2, x, DOOR_H + (h - DOOR_H) / 2, gz, paper, { uv: 2.2 });
      // brass door frame with a stepped deco top
      for (const s of [-1, 1]) box(thick + 0.2, DOOR_H, 0.2, x, DOOR_H / 2, gz + s * (DOOR_HALF + 0.05), M.brass);
      box(thick + 0.2, 0.22, DOOR_HALF * 2 + 0.5, x, DOOR_H + 0.08, gz, M.brass);
      box(thick + 0.16, 0.14, DOOR_HALF * 2 - 0.4, x, DOOR_H + 0.26, gz, M.brass);
      box(thick + 0.12, 0.12, DOOR_HALF * 2 - 1.2, x, DOOR_H + 0.4, gz, M.brass);
    }
  }
  function wallAlongX(z, xA, xB, h, paper, thick = 0.3) {
    const len = Math.abs(xB - xA), cx = (xA + xB) / 2;
    box(len, h, thick, cx, h / 2, z, paper, { uv: 2.2, solid: true });
    box(len, 1.3, thick + 0.08, cx, 0.65, z, M.panel, { uv: 2.6 });
    box(len, 0.07, thick + 0.14, cx, 1.33, z, M.brass, { uv: 1 });
    box(len, 0.14, thick + 0.12, cx, 0.07, z, M.blackMarble, { uv: 1 });
  }
  function porthole(x, y, z, ry, r = 1.1) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; W.add(g);
    const win = new THREE.Mesh(new THREE.CircleGeometry(r, 40), M.water); win.position.z = 0.02; g.add(win);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.12, 12, 48), M.brass); rim.position.z = 0.06; g.add(rim);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), M.brass); b.position.set(Math.cos(a) * (r + 0.02), Math.sin(a) * (r + 0.02), 0.16); g.add(b); }
    const gl = new THREE.Mesh(new THREE.CircleGeometry(r, 40), M.glass); gl.position.z = 0.05; g.add(gl);
    return g;
  }
  // Models from Poly Haven (CC0), loaded in the background
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const cache = {}, pending = [];
  function prop(id, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = o.rot || 0; g.scale.setScalar(o.scale || 1); W.add(g);
    if (o.solid) solid(x - o.solid, z - o.solid, x + o.solid, z + o.solid);
    if (o.detail && school) return g;
    if (!cache[id]) cache[id] = new Promise(res => loader.load(`assets/models/${id}.glb`, gl => { gl.scene.traverse(m => { if (m.isMesh) [].concat(m.material).forEach(mm => { mm.envMapIntensity = 0.5; }); }); res(gl.scene); }, undefined, () => res(null)));
    pending.push(cache[id].then(m => { if (m) g.add(m.clone()); }));
    return g;
  }

  // ════════════ THE GRAND HALL ════════════
  const hallLen = HALL.zStart - HALL.zEnd, hallMid = (HALL.zStart + HALL.zEnd) / 2;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, hallLen), M.floor); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, hallMid); W.add(floor);
  floorTex.repeat.set(5, hallLen / 2);
  // Red runner with a gold border
  const rc = document.createElement('canvas'); rc.width = 256; rc.height = 256; const rx = rc.getContext('2d');
  rx.fillStyle = '#6e1612'; rx.fillRect(0, 0, 256, 256); rx.fillStyle = '#c9a45a'; rx.fillRect(14, 0, 10, 256); rx.fillRect(232, 0, 10, 256);
  rx.fillStyle = '#4a0e0c'; for (let i = 0; i < 256; i += 32) { rx.beginPath(); rx.moveTo(128, i); rx.lineTo(160, i + 16); rx.lineTo(128, i + 32); rx.lineTo(96, i + 16); rx.fill(); }
  const runner = new THREE.Mesh(new THREE.PlaneGeometry(2.6, hallLen - 6), new THREE.MeshStandardMaterial({ map: tex(rc, [1, (hallLen - 6) / 2.6]), color: 0x9a7a70, roughness: 0.95 }));
  runner.rotation.x = -Math.PI / 2; runner.position.set(0, 0.012, hallMid + 1); W.add(runner);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(10, hallLen), M.ceil); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, HALL.h, hallMid); W.add(ceil);

  const leftGaps = [], rightGaps = [];
  for (const d of DEPTS) { const [s, z] = ROOM_Z[d.id]; (s < 0 ? leftGaps : rightGaps).push(z); }
  wallAlongZ(-HALL.x, HALL.zStart, HALL.zEnd, leftGaps, HALL.h, M.hallPaper);
  wallAlongZ(HALL.x, HALL.zStart, HALL.zEnd, rightGaps, HALL.h, M.hallPaper);
  wallAlongX(HALL.zStart, -HALL.x, HALL.x, HALL.h, M.hallPaper);

  // Beams, pilasters and wall lamps
  for (let z = HALL.zStart - 4; z > HALL.zEnd + 2; z -= 8) box(10, 0.35, 0.45, 0, HALL.h - 0.18, z, M.darkBrass);
  const allDoorZ = [...leftGaps.map(z => [-1, z]), ...rightGaps.map(z => [1, z])];
  for (let z = HALL.zStart - 6; z > HALL.zEnd + 3; z -= 6) {
    for (const s of [-1, 1]) {
      if (allDoorZ.some(([ds, dz]) => ds === s && Math.abs(dz - z) < 3)) continue;
      const x = s * (HALL.x - 0.3);
      box(0.4, HALL.h, 0.8, x, HALL.h / 2, z, M.greenMarble, { uv: 1.5 });
      box(0.5, 0.3, 0.95, x, HALL.h - 0.6, z, M.brass); box(0.5, 0.2, 0.95, x, 0.1, z, M.brass);
      // sconce: a brass fan with a glowing glass shade
      const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.08, 0.5, 16, 1, true, 0, Math.PI), M.lampGlow);
      sc.position.set(x - s * 0.25, 3.3, z); sc.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; W.add(sc);
      box(0.12, 0.6, 0.12, x - s * 0.2, 2.95, z, M.brass);
      lamp(x - s * 0.6, 3.3, z, 0xffc070, 0.8);
    }
  }
  // Pendant lamps down the middle
  for (let z = -6; z > HALL.zEnd + 6; z -= 14) {
    if (Math.abs(z + 44) < 4) continue;
    cyl(0.02, 0.02, 1.6, 0, HALL.h - 0.8, z, M.brass, 6);
    const glb = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 16), M.lampGlow); glb.position.set(0, HALL.h - 1.9, z); W.add(glb);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.45, 8, 1, true), M.brass); cap.position.set(0, HALL.h - 1.55, z); W.add(cap);
    lamp(0, HALL.h - 2.3, z, 0xffd9a0, 1.4);
  }

  // Posters on the hall walls, wherever the wall is solid
  const POSTERS = [
    [['FEWER MISTAKES.', 'LESS FUSS.'], { bg: '#b8322a', symbol: '#', foot: 'Countable? Fewer. Simple.' }],
    [['YOUR WELCOME?', 'YOUR WRONG.'], { bg: '#1f5a6e', symbol: "'", foot: "You're. You're. You're." }],
    [['COULD OF?', 'COULD NOT.'], { bg: '#2a3a8a', symbol: '✎', foot: 'Report all sightings to Grammar Crimes' }],
    [['TAKE THE OTHER', 'PERSON OUT'], { bg: '#6a2a7a', symbol: 'I', foot: 'Of the sentence. Not the building.' }],
    [["IT'S = IT IS.", "THAT'S IT."], { bg: '#c07a1a', symbol: "'", foot: 'That is all it is. Honestly.' }],
    [['ALOT IS', 'NOT A WORD'], { bg: '#2e6a3a', symbol: '✗', foot: 'A lot is two words. A lot.' }],
    [["PEDANTICO:", "WE'RE RIGHT", "AND YOU'RE", 'WELCOME'], { bg: '#7a1a2a', symbol: '¶', foot: 'Correcting others since 1842' }],
    [['LITERALLY', 'MEANS', 'LITERALLY'], { bg: '#1a4a5a', symbol: '!', foot: 'You did not literally die.' }],
    [['DR PEDANT', 'IS WATCHING'], { bg: '#3a2a1a', symbol: '◉', foot: 'And correcting.' }],
    [['APPLES', 'NOT APPLE\'S'], { bg: '#8a3a12', symbol: '🍎', foot: 'A message to every greengrocer' }],
  ];
  let pi = 0;
  for (let z = HALL.zStart - 3; z > HALL.zEnd + 4; z -= 12) {
    for (const s of [-1, 1]) {
      if (allDoorZ.some(([ds, dz]) => ds === s && Math.abs(dz - z) < 3.5)) continue;
      const [lines, o] = POSTERS[pi++ % POSTERS.length];
      wallPoster(lines, s * (HALL.x - 0.18), 2.9, z, s > 0 ? -Math.PI / 2 : Math.PI / 2, o);
    }
  }

  // Entrance: locked double doors with portholes either side
  const ez = HALL.zStart - 0.2;
  box(3.2, 4.2, 0.2, 0, 2.1, ez, M.brass);
  for (const s of [-1, 1]) { box(1.45, 3.9, 0.12, s * 0.75, 1.95, ez - 0.12, M.wood, { uv: 1.2 }); box(0.08, 0.5, 0.1, s * 0.15, 1.5, ez - 0.2, M.brass); }
  const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), new THREE.MeshBasicMaterial({ map: tex(neon('WAY OUT', '#ff5a3c', 'CLOSED UNTIL YOU ARE CORRECT')), toneMapped: false }));
  exitSign.position.set(0, 5, ez - 0.2); exitSign.rotation.y = Math.PI; W.add(exitSign);
  porthole(-3.2, 3.6, ez - 0.16, Math.PI, 0.9); porthole(3.2, 3.6, ez - 0.16, Math.PI, 0.9);
  interact.push({ p: new THREE.Vector3(0, 1.5, ez - 1), r: 3, label: 'Try the door', kind: 'exit' });
  // Welcome plaque on a stand
  const wel = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshStandardMaterial({ map: tex(plaque(['WELCOME, YOUNG PERSON', 'Please do not touch the staff.', 'They correct on contact.'])), metalness: 0.6, roughness: 0.35 }));
  wel.position.set(2.2, 1.35, 1.6); wel.rotation.set(-0.5, -0.4, 0); W.add(wel);
  cyl(0.04, 0.04, 1.2, 2.2, 0.6, 1.7, M.brass, 8); cyl(0.25, 0.3, 0.06, 2.2, 0.03, 1.7, M.brass, 16);

  // ── Pembleton, the head butler, waiting by the door ──
  const host = makeCharacter({ id: 'host', robot: { name: 'Pembleton', title: 'Head Butler' } });
  host.root.position.set(-2.4, 0, -1.5); host.root.userData.homeYaw = Math.PI * 0.75; host.root.rotation.y = host.root.userData.homeYaw;
  W.add(host.root); robots.host = host;
  colliders.push({ x0: -2.95, z0: -2.05, x1: -1.85, z1: -0.95 });
  interact.push({ p: new THREE.Vector3(-2.4, 1.5, -1.5), r: 3, label: 'Talk to Pembleton, the head butler', kind: 'host' });

  // ── Statue of Dr Pedant, with a giant red pen ──
  const sz = -44;
  box(2.4, 0.4, 2.4, 0, 0.2, sz, M.blackMarble, { solid: true });
  box(1.8, 1.8, 1.8, 0, 1.3, sz, M.greenMarble, { uv: 1.8 });
  box(2, 0.2, 2, 0, 2.3, sz, M.brass);
  prop('marble_bust_01', 0, 2.4, sz, { scale: 3.4, rot: 0 });
  const pen = new THREE.Group(); pen.position.set(0.9, 2.5, sz + 0.3); pen.rotation.set(0.15, 0, -0.5); W.add(pen);
  const pb = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 3.2, 20), M.red); pb.position.y = 1.6; pen.add(pb);
  const pc = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.9, 20), M.black); pc.position.y = 3.3; pen.add(pc);
  const ptip = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 20), M.brass); ptip.position.y = -0.2; ptip.rotation.x = Math.PI; pen.add(ptip);
  const clip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 0.06), M.brass); clip.position.set(0, 3.2, 0.16); pen.add(clip);
  const plq = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshStandardMaterial({ map: tex(plaque(['DR P. PEDANT', 'Founder. Corrector. Right.', '1842 to whenever'])), metalness: 0.6, roughness: 0.35 }));
  plq.position.set(0, 1.3, sz + 0.91); W.add(plq);
  colliders.push({ x0: -1.3, z0: sz - 1.3, x1: 1.3, z1: sz + 1.3 });
  interact.push({ p: new THREE.Vector3(0, 1.3, sz + 1.2), r: 2.8, label: 'Read the plaque', kind: 'statue' });
  lamp(0, 5.5, sz + 2.5, 0xfff0d0, 1.6);

  // ── Hall furniture with jokes attached ──
  // Vending machine
  const vc = document.createElement('canvas'); vc.width = 256; vc.height = 512; const vx = vc.getContext('2d');
  vx.fillStyle = '#1c1612'; vx.fillRect(0, 0, 256, 512); vx.fillStyle = '#c9a45a'; vx.font = '30px Limelight, Georgia'; vx.textAlign = 'center'; vx.fillText('VEND-O-', 128, 46); vx.fillText('CORRECT', 128, 82);
  const snacks = ['CRISPS', 'BISCUITS', 'TOFFEES', 'NUTS', "SNACK'S", 'FUDGE'];
  snacks.forEach((sn, i) => { const y = 110 + i * 60; vx.fillStyle = '#2a2420'; vx.fillRect(18, y, 220, 50); vx.fillStyle = sn.includes("'") ? '#ff5050' : '#f0e0c0'; vx.font = '24px "Josefin Sans", sans-serif'; vx.fillText(sn, 128, y + 33); if (sn.includes("'")) { vx.strokeStyle = '#ff3030'; vx.lineWidth = 4; vx.beginPath(); vx.moveTo(40, y + 26); vx.lineTo(216, y + 26); vx.stroke(); } });
  box(1.1, 2.3, 0.9, 4.3, 1.15, -8, M.red, { solid: true });
  plane(0.82, 1.64, 3.71, 1.35, -8, -Math.PI / 2, new THREE.MeshBasicMaterial({ map: tex(vc), toneMapped: false }));
  box(0.04, 0.12, 0.94, 3.74, 2.25, -8, M.brass); box(0.04, 0.12, 0.94, 3.74, 0.4, -8, M.brass);
  interact.push({ p: new THREE.Vector3(3.6, 1.2, -8), r: 2.4, label: 'Use the vending machine', kind: 'vend' });
  // Water cooler
  box(0.6, 1.0, 0.6, -4.4, 0.5, -26, M.cream, { solid: true });
  const bottle = cyl(0.26, 0.26, 0.7, -4.4, 1.38, -26, new THREE.MeshPhysicalMaterial({ color: 0x6ac0ff, transparent: true, opacity: 0.45, roughness: 0.05 }), 20);
  interact.push({ p: new THREE.Vector3(-3.8, 1.2, -26), r: 2.2, label: 'Have a drink', kind: 'water' });
  // Potted fern
  prop('brass_pot_01', 4.3, 0, -62, { scale: 2.2, solid: 0.5 });
  prop('fern_02', 4.3, 0.55, -62, { scale: 1.6 });
  interact.push({ p: new THREE.Vector3(3.8, 1, -62), r: 2.2, label: 'Talk to the plant', kind: 'plant' });
  // Benches
  for (const z of [-20, -68]) for (const s of [-1, 1]) {
    if (allDoorZ.some(([ds, dz]) => ds === s && Math.abs(dz - z) < 3)) continue;
    box(0.6, 0.12, 2.2, s * 4.2, 0.48, z, M.wood, { solid: true }); box(0.5, 0.42, 0.1, s * 4.2, 0.21, z - 0.9, M.brass); box(0.5, 0.42, 0.1, s * 4.2, 0.21, z + 0.9, M.brass);
  }

  // ════════════ THE LIFT ════════════
  const lz = HALL.zEnd;
  box(3.4, HALL.h, 0.3, -3.3, HALL.h / 2, lz, M.hallPaper, { uv: 2.2, solid: true });
  box(3.4, HALL.h, 0.3, 3.3, HALL.h / 2, lz, M.hallPaper, { uv: 2.2, solid: true });
  box(3.2, HALL.h - 3.6, 0.3, 0, 3.6 + (HALL.h - 3.6) / 2, lz, M.hallPaper, { uv: 2.2 });
  for (const s of [-1, 1]) box(3.4, 1.3, 0.38, s * 3.3, 0.65, lz, M.panel, { uv: 2.6 });
  // Lift car behind
  box(3.2, 0.1, 3, 0, 0.05, lz - 1.6, M.marble); box(3.2, 0.1, 3, 0, 3.6, lz - 1.6, M.brass);
  box(0.1, 3.6, 3, -1.6, 1.8, lz - 1.6, M.panel); box(0.1, 3.6, 3, 1.6, 1.8, lz - 1.6, M.panel); box(3.2, 3.6, 0.1, 0, 1.8, lz - 3.1, M.panel);
  lamp(0, 3.2, lz - 1.6, 0xfff2d0, 0.8);
  // frame
  box(3.8, 0.4, 0.5, 0, 3.75, lz + 0.1, M.brass);
  for (const s of [-1, 1]) box(0.3, 3.6, 0.5, s * 1.75, 1.8, lz + 0.1, M.brass);
  // sunburst above the frame
  for (let i = 0; i < 9; i++) { const a = Math.PI * (0.1 + i * 0.1); const ray = box(0.08, 1.2, 0.05, Math.cos(a) * 0.9, 4.2 + Math.sin(a) * 0.9, lz + 0.2, M.brass); ray.rotation.z = a - Math.PI / 2; }
  const doors = [];
  for (const s of [-1, 1]) {
    const d = box(1.6, 3.5, 0.1, s * 0.8, 1.75, lz + 0.05, M.brass);
    // deco chevrons on each door
    for (let k = 0; k < 4; k++) box(1.2 - k * 0.25, 0.05, 0.03, 0, -0.6 + k * 0.4, 0.07, M.darkBrass, { parent: d });
    doors.push(d);
  }
  const liftDoorCollider = { x0: -1.6, z0: lz - 0.2, x1: 1.6, z1: lz + 0.3 }; colliders.push(liftDoorCollider);
  // 7 indicator lamps, one per department
  DEPTS.forEach((d, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshBasicMaterial({ color: 0x661010, toneMapped: false }));
    m.position.set((i - (DEPTS.length - 1) / 2) * 0.4, 4.3, lz + 0.35); W.add(m);
    statusLamps[d.id] = [m];
  });
  const liftSign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: tex(neon('EXIT LIFT', '#5fd0ff', 'ALL DEPARTMENTS MUST APPROVE')), toneMapped: false }));
  liftSign.position.set(0, 5.1, lz + 0.2); W.add(liftSign);
  porthole(0, 6.7, lz + 0.18, 0, 1.0);
  interact.push({ p: new THREE.Vector3(0, 1.5, lz + 1), r: 3, label: 'Call the lift', kind: 'lift' });
  lamp(0, 5, lz + 3, 0xa0d8ff, 1.2);

  // ════════════ THE DEPARTMENTS ════════════
  for (const d of DEPTS) {
    const [s, cz] = ROOM_Z[d.id];
    const xIn = s * HALL.x, xOut = s * (HALL.x + ROOM_W), cx = (xIn + xOut) / 2;
    const [base, gold] = ROOM_PAPER[d.id];
    const paper = new THREE.MeshStandardMaterial({ map: tex(wallpaper(base, gold)), roughness: 0.8 });
    // floor and ceiling
    const f = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_HALF * 2), M.parquet); f.rotation.x = -Math.PI / 2; f.position.set(cx, 0.005, cz); W.add(f);
    const c = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_HALF * 2), M.ceil); c.rotation.x = Math.PI / 2; c.position.set(cx, ROOM_H, cz); W.add(c);
    // walls: back wall and the two side walls
    wallAlongZ(xOut, cz + ROOM_HALF, cz - ROOM_HALF, [], ROOM_H, paper);
    wallAlongX(cz + ROOM_HALF, xIn, xOut, ROOM_H, paper);
    wallAlongX(cz - ROOM_HALF, xIn, xOut, ROOM_H, paper);
    // neon sign over the door (hall side) and a status lamp
    const eyeHex = '#' + d.robot.eye.toString(16).padStart(6, '0');
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.05), new THREE.MeshBasicMaterial({ map: tex(neon(d.sign, eyeHex, d.name.toUpperCase())), toneMapped: false }));
    sign.position.set(xIn - s * 0.2, 4.7, cz); sign.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2; W.add(sign);
    const st = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: 0x661010, toneMapped: false }));
    st.position.set(xIn - s * 0.3, 3.9, cz); W.add(st); statusLamps[d.id].push(st);
    lamp(xIn - s * 1.2, 4.6, cz, d.robot.eye, 0.5);
    // porthole on the back wall, with the department name above
    porthole(xOut - s * 0.17, 2.4, cz, s < 0 ? Math.PI / 2 : -Math.PI / 2, 1.0);
    // chandelier
    const ch = new THREE.Group(); ch.position.set(cx, ROOM_H, cz); W.add(ch);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), M.brass); rod.position.y = -0.4; ch.add(rod);
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.03, 8, 32), M.brass); hoop.rotation.x = Math.PI / 2; hoop.position.y = -0.85; ch.add(hoop);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), M.lampGlow); b.position.set(Math.cos(a) * 0.6, -0.75, Math.sin(a) * 0.6); ch.add(b); }
    const L = lamp(cx, ROOM_H - 1.2, cz, 0xffe0b0, 1.5);
    if (d.id === 'myth') L.flicker = 1;
    // the character who runs the department
    const bot = makeCharacter(d);
    bot.root.position.set(s * (HALL.x + ROOM_W - 3.2), 0, cz);
    bot.root.userData.homeYaw = -s * Math.PI / 2;
    bot.root.rotation.y = bot.root.userData.homeYaw;
    W.add(bot.root);
    robots[d.id] = bot;
    colliders.push({ x0: bot.root.position.x - bot.collider.hx, z0: cz - bot.collider.hz, x1: bot.root.position.x + bot.collider.hx, z1: cz + bot.collider.hz });
    interact.push({ p: new THREE.Vector3(bot.root.position.x, 1.5, cz), r: 3.2, label: `Talk to ${d.robot.name}`, kind: 'robot', dept: d.id });
    // a little rug to stand on
    const rugc = document.createElement('canvas'); rugc.width = rugc.height = 256; const rgx = rugc.getContext('2d');
    rgx.fillStyle = base; rgx.fillRect(0, 0, 256, 256); rgx.strokeStyle = gold; rgx.lineWidth = 10; rgx.strokeRect(14, 14, 228, 228); rgx.lineWidth = 3; rgx.strokeRect(32, 32, 192, 192);
    rgx.beginPath(); rgx.arc(128, 128, 60, 0, 7); rgx.stroke();
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial({ map: tex(rugc), roughness: 1 }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(bot.root.position.x - s * 0.5, 0.012, cz); W.add(rug);
    // themed props
    dressRoom(d.id, s, cx, cz, xOut);
  }

  function dressRoom(id, s, cx, cz, xOut) {
    const sideZ = [cz - ROOM_HALF + 0.6, cz + ROOM_HALF - 0.6];
    const back = xOut - s * 0.6;
    const ryIn = s < 0 ? Math.PI / 2 : -Math.PI / 2;   // facing back into the room from the back wall
    if (id === 'quant') {
      // shelves of jars along both side walls
      for (const z of sideZ) {
        for (let k = 0; k < 3; k++) box(5, 0.06, 0.5, cx, 0.8 + k * 0.8, z, M.wood);
        box(5, 2.6, 0.06, cx, 1.4, z + (z < cz ? -0.25 : 0.25), M.wood);
        for (let k = 0; k < 3; k++) for (let i = 0; i < 8; i++) {
          const jx = cx - 2.2 + i * 0.62, jy = 0.83 + k * 0.8;
          cyl(0.13, 0.13, 0.36, jx, jy + 0.18, z, M.glass, 14);
          const fill = [0xc08040, 0x8a5020, 0xe8c070, 0xc04030][(i + k) % 4];
          cyl(0.11, 0.11, 0.22 + ((i * 7 + k) % 3) * 0.04, jx, jy + 0.13, z, new THREE.MeshStandardMaterial({ color: fill, roughness: 0.8 }), 12);
        }
        solid(cx - 2.5, z - 0.3, cx + 2.5, z + 0.3);
      }
      // the till, with a sign that has been corrected
      box(2.6, 1.0, 0.8, cx + s * 1.2, 0.5, cz + 3.2, M.wood, { solid: true });
      const tc = document.createElement('canvas'); tc.width = 512; tc.height = 256; const t = tc.getContext('2d');
      t.fillStyle = '#f0e6cc'; t.fillRect(0, 0, 512, 256); t.fillStyle = '#1a1a1a'; t.font = '700 60px "Josefin Sans", sans-serif'; t.textAlign = 'center'; t.fillText('10 ITEMS', 256, 90); t.fillText('OR LESS', 256, 170);
      t.strokeStyle = '#d01010'; t.lineWidth = 12; t.beginPath(); t.moveTo(130, 150); t.lineTo(390, 150); t.stroke();
      t.fillStyle = '#d01010'; t.font = 'italic 700 64px Caveat, "Comic Sans MS", cursive'; t.save(); t.translate(256, 225); t.rotate(-0.08); t.fillText('FEWER!', 0, 0); t.restore();
      const sg = plane(1.6, 0.8, cx + s * 1.2, 1.9, cz + 3.2, ryIn + (s < 0 ? -Math.PI / 2 : Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex(tc), roughness: 0.7 }));
      sg.rotation.y = Math.PI; cyl(0.03, 0.03, 0.9, cx + s * 1.2, 1.4, cz + 3.2, M.brass, 6);
      prop('wooden_crate_01', cx - s * 2.5, 0, cz - 3, { scale: 1.2, rot: 0.3, solid: 0.6 });
      prop('wooden_crate_02', cx - s * 2.6, 0, cz - 1.8, { scale: 1.1, rot: -0.2, solid: 0.5 });
    } else if (id === 'pron') {
      for (const z of [cz - 2.8, cz + 2.8]) {
        box(1.1, 0.5, 1.0, cx, 0.25, z, M.leather, { solid: true }); box(1.1, 0.9, 0.25, cx, 0.75, z + (z < cz ? -0.45 : 0.45), M.leather);
        for (const ax of [-0.5, 0.5]) box(0.18, 0.7, 1.0, cx + ax, 0.45, z, M.leather);
      }
      box(1.4, 0.06, 0.8, cx, 0.5, cz, M.wood); for (const a of [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]]) cyl(0.03, 0.03, 0.5, cx + a[0], 0.25, cz + a[1], M.brass, 6);
      solid(cx - 0.7, cz - 0.4, cx + 0.7, cz + 0.4);
      prop('ceramic_vase_01', cx, 0.53, cz, { scale: 1 });
      for (const z of sideZ) { box(0.8, 1.1, 0.8, back - s * 0.3, 0.55, z, M.marble, { solid: true }); }
      prop('marble_bust_01', back - s * 0.3, 1.1, sideZ[0], { scale: 1.3, rot: ryIn });
      prop('brass_vase_01', back - s * 0.3, 1.1, sideZ[1], { scale: 1.6 });
      wallPoster(['WHOM.', 'NOT WHO.'], cx, 2.8, cz - ROOM_HALF + 0.2, 0, { bg: '#1f3a6e', symbol: '♔', foot: 'For whom the bell tolls. Always.' });
      wallPoster(['MYSELF IS', 'NOT POSH'], cx, 2.8, cz + ROOM_HALF - 0.2, Math.PI, { bg: '#5a1a3a', symbol: 'Me', foot: 'Please contact me. Not myself.' });
    } else if (id === 'homo') {
      const goo = new THREE.MeshStandardMaterial({ color: 0x3aff7a, emissive: 0x18a040, transparent: true, opacity: 0.6, roughness: 0.1 });
      for (const z of sideZ) for (let i = 0; i < 3; i++) {
        const x = cx - 3 + i * 3;
        cyl(0.55, 0.55, 2.6, x, 1.3, z, M.glass, 24);
        cyl(0.5, 0.5, 2.2, x, 1.15, z, goo, 20);
        cyl(0.6, 0.6, 0.2, x, 0.1, z, M.brass, 24); cyl(0.6, 0.6, 0.2, x, 2.65, z, M.brass, 24);
        solid(x - 0.6, z - 0.6, x + 0.6, z + 0.6);
        if (i === 1) lamp(x, 1.5, z, 0x3aff7a, 0.5);
      }
      for (const z of [cz - 3, cz + 3]) { prop('brass_pot_01', cx + s * 1.5, 0, z, { scale: 1.6, solid: 0.4 }); prop('shrub_02', cx + s * 1.5, 0.4, z, { scale: 0.9, detail: true }); }
      // purple grow lights
      for (const z of sideZ) box(6.5, 0.06, 0.2, cx, 3.6, z, new THREE.MeshBasicMaterial({ color: 0xc070ff, toneMapped: false }));
      wallPoster(['THEIR.', 'THERE.', "THEY'RE."], back - s * 0.15, 2.8, cz - 3.4, ryIn, { bg: '#1f5a2a', symbol: '3', foot: 'Three words. One brain cell. Yours.' });
    } else if (id === 'conf') {
      for (const z of [cz - 3.4, cz + 3.4]) {
        prop('wooden_table_02', cx, 0, z, { scale: 1.3, rot: Math.PI / 2 });
        solid(cx - 1.2, z - 0.7, cx + 1.2, z + 0.7);
        const cols = [0xff4040, 0x40ff80, 0x40a0ff, 0xffe040];
        for (let i = 0; i < 4; i++) {
          const bx = cx - 0.9 + i * 0.6, by = 1.02;
          cyl(0.09, 0.12, 0.3, bx, by + 0.15, z, M.glass, 14);
          cyl(0.08, 0.11, 0.16, bx, by + 0.08, z, new THREE.MeshBasicMaterial({ color: cols[i], toneMapped: false }), 12);
        }
        prop('jug_01', cx + 1, 1.0, z + 0.2, { scale: 1, detail: true });
      }
      // Tesla coil
      const tx = back - s * 1.2, tz = cz + 3.4;
      cyl(0.5, 0.6, 0.4, tx, 0.2, tz, M.darkBrass); cyl(0.12, 0.12, 2.2, tx, 1.5, tz, M.brass);
      for (let i = 0; i < 8; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 8, 20), M.brass); r.rotation.x = Math.PI / 2; r.position.set(tx, 0.8 + i * 0.18, tz); W.add(r); }
      const orb = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.12, 12, 28), M.brass); orb.rotation.x = Math.PI / 2; orb.position.set(tx, 2.7, tz); W.add(orb);
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshBasicMaterial({ color: 0xbfe0ff, toneMapped: false })); spark.position.set(tx, 2.85, tz); W.add(spark);
      solid(tx - 0.6, tz - 0.6, tx + 0.6, tz + 0.6);
      const SL = lamp(tx, 2.9, tz, 0x9fd0ff, 0.9); SL.flicker = 2;
      animated.push((t) => { spark.scale.setScalar(0.7 + Math.random() * 0.6); });
      wallPoster(['AFFECT:', 'VERB.', 'EFFECT:', 'NOUN.'], back - s * 0.15, 2.8, cz - 3.4, ryIn, { bg: '#6a5a10', symbol: '⚗', foot: 'Remember RAVEN.' });
    } else if (id === 'apos') {
      // the vault door
      const vg = new THREE.Group(); vg.position.set(cx, 2.1, cz - ROOM_HALF + 0.35); W.add(vg);
      const vd = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.4, 48), M.darkBrass); vd.rotation.x = Math.PI / 2; vg.add(vd);
      const vr = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.15, 12, 48), M.brass); vg.add(vr);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 24), M.brass); hub.rotation.x = Math.PI / 2; hub.position.z = 0.3; vg.add(hub);
      const wheel = new THREE.Group(); wheel.position.z = 0.42; vg.add(wheel);
      for (let i = 0; i < 3; i++) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 8), M.brass); sp.rotation.z = i * Math.PI / 3; wheel.add(sp); }
      wheel.add(new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.06, 8, 40), M.brass));
      animated.push((t) => { wheel.rotation.z = Math.sin(t * 0.3) * 0.4; });
      // display cases of rescued apostrophes
      for (const z of [cz - 1.2, cz + 2.4]) {
        const x = cx + s * 0.5;
        box(0.9, 1.0, 0.9, x, 0.5, z, M.wood, { solid: true });
        box(0.8, 0.8, 0.8, x, 1.4, z, M.glass);
        const ap = new THREE.Group(); ap.position.set(x, 1.45, z); W.add(ap);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffa040, toneMapped: false })); head.position.y = 0.08; ap.add(head);
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.26, 12), head.material); tail.position.set(-0.04, -0.12, 0); tail.rotation.z = -2.8; ap.add(tail);
        animated.push((t) => { ap.rotation.y = t * 0.8 + z; ap.position.y = 1.45 + Math.sin(t * 2 + z) * 0.05; });
      }
      // the greengrocer's crates, seized as evidence
      prop('wooden_crate_01', cx - s * 2.6, 0, cz + 4.2, { scale: 1.2, solid: 0.6 });
      const ac = document.createElement('canvas'); ac.width = 512; ac.height = 256; const a = ac.getContext('2d');
      a.fillStyle = '#efe6d0'; a.fillRect(0, 0, 512, 256); a.fillStyle = '#2a7a2a'; a.font = 'italic 700 90px Caveat, "Comic Sans MS", cursive'; a.textAlign = 'center'; a.fillText("Apple's", 256, 120);
      a.fillStyle = '#c01010'; a.font = '700 46px "Josefin Sans", sans-serif'; a.fillText('EVIDENCE: ITEM 4471', 256, 210);
      const sg = plane(1.2, 0.6, cx - s * 2.6, 1.6, cz + 3.5, 0, new THREE.MeshStandardMaterial({ map: tex(ac), roughness: 0.8 }));
      wallPoster(['ONE OWNER:', "DOG'S", 'MANY:', "DOGS'"], back - s * 0.15, 2.8, cz + 3.6, ryIn, { bg: '#8a3a12', symbol: "'", foot: 'The apostrophe is not decoration.' });
    } else if (id === 'crime') {
      // cell bars along one side wall
      const z = cz - ROOM_HALF + 1.6;
      for (let i = 0; i < 16; i++) cyl(0.035, 0.035, ROOM_H, cx - 4 + i * 0.5, ROOM_H / 2, z, M.darkBrass, 8);
      box(8, 0.12, 0.12, cx, 1.2, z, M.darkBrass); box(8, 0.12, 0.12, cx, 3.5, z, M.darkBrass);
      solid(cx - 4.2, z - 0.1, cx + 4.2, z + 0.1);
      // in the cell: some convicted words
      const cc = document.createElement('canvas'); cc.width = 512; cc.height = 256; const k = cc.getContext('2d');
      k.fillStyle = '#16120e'; k.fillRect(0, 0, 512, 256); k.fillStyle = '#ffdd88'; k.font = '700 52px "Josefin Sans", sans-serif'; k.textAlign = 'center';
      k.fillText('COULD OF · ALOT', 256, 100); k.fillText('IRREGARDLESS', 256, 170); k.font = '28px Georgia'; k.fillStyle = '#c0a070'; k.fillText('serving life without parole', 256, 225);
      plane(3, 1.5, cx, 2.5, cz - ROOM_HALF + 0.2, 0, new THREE.MeshStandardMaterial({ map: tex(cc), roughness: 0.8 }));
      // desk with a lamp
      box(2.2, 0.08, 1.0, cx + s * 0.5, 0.82, cz + 3, M.wood); box(2.1, 0.8, 0.9, cx + s * 0.5, 0.4, cz + 3, M.darkBrass, { solid: true });
      cyl(0.05, 0.05, 0.5, cx + s * 1.2, 1.1, cz + 3, M.brass, 8);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.25, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x1f6a3a, side: THREE.DoubleSide })); shade.position.set(cx + s * 1.2, 1.4, cz + 3); W.add(shade);
      lamp(cx + s * 1.2, 1.2, cz + 3, 0xffe0a0, 0.6);
      wallPoster(['WANTED:', 'COULD OF'], cx - s * 2.5, 2.8, cz + ROOM_HALF - 0.2, Math.PI, { bg: '#d8c8a0', fg: '#2a1a0a', ink: '#f0e0c0', symbol: '?', top: 'GRAMMAR CRIMES UNIT', foot: 'Reward: one house point' });
      wallPoster(['WANTED:', 'I SEEN IT'], cx + s * 0.4, 2.8, cz + ROOM_HALF - 0.2, Math.PI, { bg: '#d8c8a0', fg: '#2a1a0a', ink: '#f0e0c0', symbol: '?', top: 'GRAMMAR CRIMES UNIT', foot: 'Approach with a dictionary' });
    } else if (id === 'myth') {
      // dusty clutter: barrels, piles of books, old portraits
      prop('wine_barrel_01', cx - s * 2, 0, cz - 4.6, { scale: 1.1, solid: 0.6 });
      prop('wine_barrel_01', cx - s * 0.6, 0, cz - 4.8, { scale: 1.1, rot: 1, solid: 0.6 });
      prop('wooden_stool_01', cx + s * 1, 0, cz + 2.4, { scale: 1.2 });
      const bookCols = [0x6a1a14, 0x1a3a6a, 0x2a5a2a, 0x6a5a1a, 0x3a1a4a];
      for (let p = 0; p < 4; p++) {
        const bx = cx - 3 + p * 1.6, bz = cz + 4.6;
        for (let i = 0; i < 6 + p; i++) box(0.6, 0.12, 0.45, bx + (Math.random() - 0.5) * 0.1, 0.06 + i * 0.12, bz, new THREE.MeshStandardMaterial({ color: bookCols[(i + p) % 5], roughness: 0.8 }), { ry: (Math.random() - 0.5) * 0.4 });
        solid(bx - 0.4, bz - 0.4, bx + 0.4, bz + 0.4);
      }
      const frames = [['NEVER END A', 'SENTENCE WITH', 'A PREPOSITION'], ['NEVER SPLIT AN', 'INFINITIVE'], ['NEVER START', 'WITH AND']];
      frames.forEach((ln, i) => {
        const fz = cz - 3.5 + i * 3.5;
        const p = wallPoster(ln, back - s * 0.15, 2.9, fz, ryIn, { bg: '#4a3a2a', symbol: '✗', top: 'RULES OF OLD GRUMBLETON', foot: 'Not actually rules.' });
      });
    }
  }

  // ════════════ LIGHTING ════════════
  scene.add(new THREE.HemisphereLight(0xffe2b8, 0x1a120c, school ? 0.75 : 0.5));
  const amb = new THREE.AmbientLight(0x30505a, school ? 0.35 : 0.22); scene.add(amb);
  // A small pool of real lights follows the player to the nearest lamps
  const POOL = school ? 4 : hi ? 9 : 6;
  const pool = [];
  for (let i = 0; i < POOL; i++) { const l = new THREE.PointLight(0xffffff, 0, 16, 1.6); scene.add(l); pool.push(l); }
  let poolT = 0;
  function updateLights(player, t, dt) {
    poolT -= dt;
    if (poolT <= 0) {
      poolT = 0.2;
      const sorted = lamps.map(l => ({ l, d: (l.p.x - player.x) ** 2 + (l.p.z - player.z) ** 2 })).sort((a, b) => a.d - b.d);
      pool.forEach((pl, i) => { const L = sorted[i] && sorted[i].l; pl.userData.L = L; if (L) { pl.position.copy(L.p); pl.color.copy(L.color); } });
    }
    for (const pl of pool) {
      const L = pl.userData.L; if (!L) { pl.intensity = 0; continue; }
      let k = L.power * (school ? 30 : 34);
      if (L.flicker === 1) k *= (Math.sin(t * 13) > 0.7 || Math.random() < 0.04) ? 0.25 : 1;
      if (L.flicker === 2) k *= 0.5 + Math.random() * 0.8;
      pl.intensity = k;
    }
  }

  // ════════════ PER-FRAME ════════════
  let waterT = 0, liftOpen = 0, liftWant = 0;
  function update(dt, t, player) {
    updateLights(player, t, dt);
    waterT += dt; if (waterT > 1 / 20) { water.draw(t, waterT); waterT = 0; }
    for (const id in robots) {
      const r = robots[id], dx = r.root.position.x - player.x, dz = r.root.position.z - player.z;
      if (dx * dx + dz * dz < 900) r.update(dt, t, player);
    }
    for (const a of animated) a(t);
    liftOpen += Math.sign(liftWant - liftOpen) * Math.min(Math.abs(liftWant - liftOpen), dt * 0.8);
    doors[0].position.x = -0.8 - liftOpen * 1.45; doors[1].position.x = 0.8 + liftOpen * 1.45;
  }
  function setCertified(id, on) {
    for (const m of statusLamps[id] || []) m.material.color.setHex(on ? 0x30ff70 : 0x661010);
  }
  function openLift() { liftWant = 1; const i = colliders.indexOf(liftDoorCollider); if (i >= 0) colliders.splice(i, 1); }
  function closeLift() { liftWant = 0; liftOpen = 0; if (!colliders.includes(liftDoorCollider)) colliders.push(liftDoorCollider); }

  return {
    group: W, colliders, interact, robots, update, setCertified, openLift, closeLift,
    ready: () => Promise.race([Promise.all(pending), new Promise(r => setTimeout(r, 12000))]),
    spawn: { x: 0, z: 2.5, yaw: 0 },
  };
}
