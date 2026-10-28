// ════════════════════════════════════════════════════════════════
// THE STAFF OF THE PEDANTICO INSTITUTE
// Caricature characters with big heads and painted, animated faces.
// Each one: makeCharacter(dept) → { root, faceCanvas (portrait), setExpr, talk, update, voice, pitch }
// ════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { portraitArt } from './textures.js';

// Who looks like what
const LOOK = {
  quant: { // Lady Fewerton, a duchess
    skin: '#f0c0a4', hair: '#b8b8c8', body: 'gown', coat: 0x6a1a5a, trim: 0xe8d8a0, hat: 'tiara', hairdo: 'bouffant',
    face: { lips: '#b02040', blush: true, lorgnette: true, lashes: true },
  },
  pron: { // Whomsley, the butler
    skin: '#e8b08c', hair: '#d8d8d8', body: 'tails', coat: 0x16161c, trim: 0xffffff, hat: 'none', hairdo: 'bald-sides',
    face: { tache: 'walrus', brows: 'bushy' }, tray: true,
  },
  homo: { // The Triplets: There, Their and They're, three identical footmen
    skin: '#f2bfa0', hair: '#f4f4f4', body: 'footman', coat: 0x1e5a3a, trim: 0xe0b860, hat: 'none', hairdo: 'wig',
    face: { blush: true }, triplets: true,
  },
  conf: { // Professor Effect
    skin: '#d9a07a', hair: '#f4f4f0', body: 'labcoat', coat: 0xf0f0ea, trim: 0x3a3a4a, hat: 'goggles', hairdo: 'wild',
    face: { glasses: true, brows: 'wild' },
  },
  apos: { // Mrs Possessive, the housekeeper
    skin: '#e6b48e', hair: '#6a4028', body: 'dress', coat: 0x2a2a3a, trim: 0xf4f0e6, hat: 'none', hairdo: 'bun',
    face: { lips: '#a03030', glasses: true, lashes: true }, keys: true,
  },
  crime: { // Sergeant Couldhave
    skin: '#d89a74', hair: '#4a2a18', body: 'police', coat: 0x141a30, trim: 0xd8d8e0, hat: 'helmet', hairdo: 'short',
    face: { tache: 'handlebar', brows: 'stern' },
  },
  myth: { // Colonel Grumbleton (retired)
    skin: '#eaa88a', hair: '#f0f0f0', body: 'colonel', coat: 0x8a2018, trim: 0xe0b860, hat: 'none', hairdo: 'bald-sides',
    face: { tache: 'mutton', monocle: true, brows: 'bushy', sleepy: true }, cane: true,
  },
};
LOOK.host = { // Pembleton, the head butler, who meets you at the door
  skin: '#c98e68', hair: '#2a2018', body: 'tails', coat: 0x101014, trim: 0xffffff, hat: 'none', hairdo: 'short',
  face: { brows: 'stern' }, tray: false,
};
LOOK.pedant = { // Dr P. Pedant himself, host of quick play
  skin: '#e8b090', hair: '#e8e8e8', body: 'tails', coat: 0x3a1a14, trim: 0xffffff, hat: 'none', hairdo: 'bald-sides',
  face: { tache: 'walrus', glasses: true, brows: 'bushy' },
};
// Draw Dr Pedant's portrait (used by quick play, where there is no 3D world)
export function paintPedant(canvas, expr, t) { paintPortrait(canvas, LOOK.pedant, 'pedant', expr, t, 0); }
const VOICE = { host: 160, quant: 330, pron: 150, homo: 240, conf: 300, apos: 260, crime: 130, myth: 110 };
const PITCH = { host: 0.75, quant: 1.4, pron: 0.6, homo: 1.2, conf: 1.3, apos: 1.1, crime: 0.6, myth: 0.5 };

// ── the painted face ──
// expr: 'idle' | 'talk' | 'happy' | 'appalled' | 'smug'
// The 3D head gets features on a transparent canvas; the portrait also gets a head, hair and hat.
function paintFeatures(x, L, expr, t, mouthOpen, cx, cy, s) {
  const F = L.face || {};
  const ink = '#2a1810';
  const blink = Math.sin(t * 1.7 + cx) > 0.985 || (F.sleepy && expr === 'idle' && Math.sin(t * 0.4) > 0.6);
  const eyeY = cy - 0.12 * s, eyeX = 0.28 * s;
  // cheeks
  if (F.blush || expr === 'happy') { x.fillStyle = 'rgba(230,90,90,0.28)'; for (const d of [-1, 1]) { x.beginPath(); x.ellipse(cx + d * 0.42 * s, cy + 0.14 * s, 0.14 * s, 0.09 * s, 0, 0, 7); x.fill(); } }
  // eyes
  for (const d of [-1, 1]) {
    const ex = cx + d * eyeX;
    x.lineWidth = 0.035 * s; x.strokeStyle = ink; x.lineCap = 'round';
    if (expr === 'happy') { x.beginPath(); x.arc(ex, eyeY + 0.04 * s, 0.11 * s, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); continue; }
    if (blink) { x.beginPath(); x.moveTo(ex - 0.11 * s, eyeY); x.lineTo(ex + 0.11 * s, eyeY); x.stroke(); continue; }
    const big = expr === 'appalled' ? 1.35 : 1;
    x.fillStyle = '#fffaf2'; x.beginPath(); x.ellipse(ex, eyeY, 0.12 * s * big, 0.13 * s * big, 0, 0, 7); x.fill(); x.stroke();
    x.fillStyle = '#3a2a1a'; x.beginPath(); x.arc(ex + d * 0.01 * s, eyeY + 0.01 * s, 0.055 * s, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(ex + 0.02 * s, eyeY - 0.02 * s, 0.017 * s, 0, 7); x.fill();
    // heavy lids: unimpressed, smug or sleepy
    if (expr === 'idle' || expr === 'talk' || expr === 'smug') {
      const lid = expr === 'smug' ? 0.55 : F.sleepy ? 0.6 : 0.35;
      x.fillStyle = L.skin; x.beginPath(); x.ellipse(ex, eyeY, 0.135 * s, 0.14 * s, 0, Math.PI, 2 * Math.PI); x.fill();
      x.fillRect(ex - 0.135 * s, eyeY - 0.14 * s, 0.27 * s, (0.14 + lid * 0.13 - 0.13) * s + 0.13 * s * lid);
      x.beginPath(); x.moveTo(ex - 0.13 * s, eyeY - 0.13 * s + 0.26 * s * lid); x.lineTo(ex + 0.13 * s, eyeY - 0.13 * s + 0.26 * s * lid); x.stroke();
    }
    if (F.lashes) { for (let k = -1; k <= 1; k++) { x.beginPath(); x.moveTo(ex + (d * 0.08 + k * 0.04) * s, eyeY - 0.1 * s); x.lineTo(ex + (d * 0.12 + k * 0.05) * s, eyeY - 0.17 * s); x.stroke(); } }
  }
  // eyebrows
  x.strokeStyle = F.brows === 'bushy' || F.brows === 'wild' ? L.hair === '#f0f0f0' || L.hair === '#f4f4f0' || L.hair === '#d8d8d8' ? '#c8c8c8' : L.hair : '#4a3020';
  x.lineWidth = (F.brows === 'bushy' ? 0.075 : F.brows === 'wild' ? 0.06 : 0.04) * s;
  for (const d of [-1, 1]) {
    const bx = cx + d * eyeX, by = eyeY - 0.21 * s;
    let inner = 0, outer = 0;
    if (expr === 'appalled') { inner = -0.09; outer = -0.06; }
    else if (expr === 'smug') { inner = d < 0 ? 0.02 : -0.08; outer = d < 0 ? 0.02 : -0.03; }
    else if (expr === 'happy') { inner = -0.04; outer = -0.02; }
    else if (F.brows === 'stern') { inner = 0.05; outer = -0.03; }
    else { inner = 0.02; outer = -0.01; }
    x.beginPath(); x.moveTo(bx - d * 0.13 * s, by + inner * s); x.quadraticCurveTo(bx, by - 0.04 * s + (inner + outer) / 2 * s, bx + d * 0.14 * s, by + outer * s); x.stroke();
    if (F.brows === 'wild') { for (let k = 0; k < 4; k++) { x.lineWidth = 0.02 * s; x.beginPath(); x.moveTo(bx + d * (0.05 + k * 0.03) * s, by); x.lineTo(bx + d * (0.1 + k * 0.05) * s, by - (0.06 + k * 0.02) * s); x.stroke(); } }
  }
  // glasses or monocle
  x.strokeStyle = '#2a2018'; x.lineWidth = 0.025 * s;
  if (F.glasses) { for (const d of [-1, 1]) { x.beginPath(); x.arc(cx + d * eyeX, eyeY, 0.16 * s, 0, 7); x.stroke(); } x.beginPath(); x.moveTo(cx - 0.12 * s, eyeY); x.lineTo(cx + 0.12 * s, eyeY); x.stroke(); }
  if (F.monocle) { x.strokeStyle = '#c9a45a'; x.lineWidth = 0.03 * s; x.beginPath(); x.arc(cx + eyeX, eyeY, 0.17 * s, 0, 7); x.stroke(); x.beginPath(); x.moveTo(cx + eyeX + 0.12 * s, eyeY + 0.12 * s); x.quadraticCurveTo(cx + 0.6 * s, cy + 0.4 * s, cx + 0.5 * s, cy + 0.9 * s); x.lineWidth = 0.01 * s; x.stroke(); }
  // mouth
  const my = cy + 0.34 * s;
  x.strokeStyle = '#5a2018'; x.lineWidth = 0.035 * s; x.fillStyle = '#5a1a14';
  x.beginPath();
  if (expr === 'happy') { x.moveTo(cx - 0.2 * s, my - 0.03 * s); x.quadraticCurveTo(cx, my + 0.2 * s, cx + 0.2 * s, my - 0.03 * s); x.closePath(); x.fill(); }
  else if (expr === 'appalled') { x.ellipse(cx, my + 0.02 * s, 0.07 * s, 0.1 * s, 0, 0, 7); x.fill(); }
  else if (expr === 'smug') { x.moveTo(cx - 0.16 * s, my); x.quadraticCurveTo(cx + 0.05 * s, my + 0.04 * s, cx + 0.18 * s, my - 0.07 * s); x.stroke(); }
  else if (mouthOpen > 0.05) { x.ellipse(cx, my, 0.12 * s, (0.025 + mouthOpen * 0.08) * s, 0, 0, 7); x.fill(); }
  else { x.moveTo(cx - 0.14 * s, my + 0.01 * s); x.quadraticCurveTo(cx, my - 0.03 * s, cx + 0.14 * s, my + 0.01 * s); x.stroke(); }
  if (F.lips && expr !== 'appalled') { x.strokeStyle = F.lips; x.lineWidth = 0.05 * s; x.stroke(); }
  // moustaches go over the mouth
  const tc = L.hair === '#4a2a18' ? '#3a2014' : '#dcdcdc';
  x.fillStyle = tc; x.strokeStyle = tc;
  const outline = () => { x.save(); x.strokeStyle = 'rgba(60,40,30,0.7)'; x.lineWidth = 0.015 * s; x.stroke(); x.restore(); };
  if (F.tache === 'walrus') { x.beginPath(); x.moveTo(cx, my - 0.14 * s); x.quadraticCurveTo(cx - 0.32 * s, my - 0.16 * s, cx - 0.28 * s, my + 0.08 * s); x.quadraticCurveTo(cx - 0.1 * s, my - 0.02 * s, cx, my - 0.02 * s); x.quadraticCurveTo(cx + 0.1 * s, my - 0.02 * s, cx + 0.28 * s, my + 0.08 * s); x.quadraticCurveTo(cx + 0.32 * s, my - 0.16 * s, cx, my - 0.14 * s); x.fill(); outline(); }
  if (F.tache === 'handlebar') { x.lineWidth = 0.06 * s; x.lineCap = 'round'; for (const d of [-1, 1]) { x.beginPath(); x.moveTo(cx, my - 0.1 * s); x.quadraticCurveTo(cx + d * 0.22 * s, my - 0.04 * s, cx + d * 0.3 * s, my - 0.2 * s); x.stroke(); } }
  if (F.tache === 'mutton') { x.beginPath(); x.moveTo(cx - 0.05 * s, my - 0.12 * s); x.quadraticCurveTo(cx - 0.3 * s, my - 0.1 * s, cx - 0.55 * s, my - 0.35 * s); x.lineTo(cx - 0.55 * s, my + 0.05 * s); x.quadraticCurveTo(cx - 0.3 * s, my + 0.02 * s, cx - 0.05 * s, my - 0.04 * s); x.fill(); x.beginPath(); x.moveTo(cx + 0.05 * s, my - 0.12 * s); x.quadraticCurveTo(cx + 0.3 * s, my - 0.1 * s, cx + 0.55 * s, my - 0.35 * s); x.lineTo(cx + 0.55 * s, my + 0.05 * s); x.quadraticCurveTo(cx + 0.3 * s, my + 0.02 * s, cx + 0.05 * s, my - 0.04 * s); x.fill(); outline(); }
  // lorgnette: opera glasses on a stick, held up to one eye
  if (F.lorgnette && expr !== 'happy') { x.strokeStyle = '#c9a45a'; x.lineWidth = 0.025 * s; x.beginPath(); x.arc(cx - eyeX, eyeY, 0.16 * s, 0, 7); x.stroke(); x.beginPath(); x.moveTo(cx - eyeX - 0.1 * s, eyeY + 0.13 * s); x.lineTo(cx - eyeX - 0.3 * s, eyeY + 0.7 * s); x.lineWidth = 0.035 * s; x.stroke(); }
}

// Portrait: a flat cartoon of the whole head for the dialogue box and the test screen
function paintPortrait(c, L, id, expr, t, mouthOpen) {
  const x = c.getContext('2d'), W = c.width, H = c.height;
  const art = portraitArt(id);
  if (art) {
    x.clearRect(0, 0, W, H);
    const motion = expr === 'talk' ? Math.sin(t * 7) * 0.7 : 0;
    x.save(); x.beginPath(); x.rect(0, 0, W, H); x.clip();
    x.drawImage(art.image, art.sx, art.sy, art.sw, art.sh, 0, motion, W, H);
    x.restore();
    // Expression indicators preserve feedback without painting over the artwork.
    const accents = { happy: '#8de0a3', appalled: '#f28765', smug: '#eac97a', talk: '#8ddbd6' };
    x.strokeStyle = accents[expr] || '#a9874f'; x.lineWidth = 3;
    x.strokeRect(2, 2, W - 4, H - 4);
    if (expr === 'talk') {
      x.fillStyle = '#8ddbd6';
      for (let i = 0; i < 5; i++) {
        const h = 3 + Math.abs(Math.sin(t * 10 + i)) * 12;
        x.fillRect(W - 36 + i * 5, H - 9 - h, 3, h);
      }
    }
    return;
  }

  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3a2c1c'); g.addColorStop(1, '#120d08');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H * 0.58, s = H * 0.36;
  // shoulders
  x.fillStyle = '#' + L.coat.toString(16).padStart(6, '0'); x.beginPath(); x.ellipse(cx, H * 1.08, W * 0.36, H * 0.3, 0, 0, 7); x.fill();
  x.fillStyle = '#' + L.trim.toString(16).padStart(6, '0'); x.beginPath(); x.moveTo(cx - 18, H * 0.82); x.lineTo(cx + 18, H * 0.82); x.lineTo(cx, H); x.fill();
  // hair behind
  x.fillStyle = L.hair;
  if (L.hairdo === 'bouffant') { x.beginPath(); x.ellipse(cx, cy - s * 0.5, s * 1.05, s * 0.85, 0, 0, 7); x.fill(); }
  if (L.hairdo === 'wig') { for (const d of [-1, 1]) for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(cx + d * s * 0.9, cy - s * 0.3 + k * s * 0.3, s * 0.18, 0, 7); x.fill(); } x.beginPath(); x.ellipse(cx, cy - s * 0.45, s * 0.95, s * 0.7, 0, 0, 7); x.fill(); }
  if (L.hairdo === 'wild') { for (let k = 0; k < 14; k++) { const a = Math.PI * (0.85 + k / 13 * 1.3); x.beginPath(); x.arc(cx + Math.cos(a) * s * 0.95, cy + Math.sin(a) * s * 0.9, s * 0.22, 0, 7); x.fill(); } }
  if (L.hairdo === 'bun') { x.beginPath(); x.arc(cx, cy - s * 1.05, s * 0.32, 0, 7); x.fill(); }
  // ears and head
  x.fillStyle = L.skin;
  for (const d of [-1, 1]) { x.beginPath(); x.ellipse(cx + d * s * 0.92, cy + s * 0.05, s * 0.14, s * 0.2, 0, 0, 7); x.fill(); }
  x.beginPath(); x.ellipse(cx, cy, s * 0.9, s * 1.0, 0, 0, 7); x.fill();
  x.strokeStyle = 'rgba(80,40,20,0.35)'; x.lineWidth = 3; x.stroke();
  // hair on top
  x.fillStyle = L.hair;
  if (L.hairdo === 'bald-sides') { for (const d of [-1, 1]) { x.beginPath(); x.ellipse(cx + d * s * 0.85, cy - s * 0.15, s * 0.16, s * 0.32, d * 0.2, 0, 7); x.fill(); } }
  if (L.hairdo === 'short') { x.beginPath(); x.ellipse(cx, cy - s * 0.75, s * 0.8, s * 0.35, 0, Math.PI, 2 * Math.PI); x.fill(); }
  if (L.hairdo === 'bun' || L.hairdo === 'bouffant') { x.beginPath(); x.ellipse(cx, cy - s * 0.7, s * 0.88, s * 0.4, 0, Math.PI, 2 * Math.PI); x.fill(); }
  if (L.hairdo === 'wig') { x.beginPath(); x.ellipse(cx, cy - s * 0.78, s * 0.88, s * 0.32, 0, Math.PI, 2 * Math.PI); x.fill(); }
  // nose
  x.fillStyle = 'rgba(200,110,90,0.55)'; x.beginPath(); x.ellipse(cx, cy + s * 0.1, s * 0.12, s * 0.15, 0, 0, 7); x.fill();
  paintFeatures(x, L, expr, t, mouthOpen, cx, cy, s);
  // hats
  if (L.hat === 'tiara') { x.fillStyle = '#e8c870'; x.beginPath(); x.moveTo(cx - s * 0.5, cy - s * 0.82); for (let k = 0; k <= 6; k++) x.lineTo(cx - s * 0.5 + k * s / 6, cy - s * (k % 2 ? 1.12 : 0.9)); x.lineTo(cx + s * 0.5, cy - s * 0.82); x.fill(); x.fillStyle = '#ff4f9a'; x.beginPath(); x.arc(cx, cy - s * 0.98, s * 0.06, 0, 7); x.fill(); }
  if (L.hat === 'helmet') { x.fillStyle = '#141a30'; x.beginPath(); x.ellipse(cx, cy - s * 0.85, s * 0.8, s * 0.75, 0, Math.PI, 2 * Math.PI); x.fill(); x.fillRect(cx - s * 0.95, cy - s * 0.88, s * 1.9, s * 0.1); x.fillStyle = '#d8d8e0'; x.beginPath(); x.arc(cx, cy - s * 1.6, s * 0.08, 0, 7); x.fill(); x.beginPath(); x.moveTo(cx, cy - s * 1.25); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; x.lineTo(cx + Math.cos(a) * s * 0.16 * (k % 2 ? 0.5 : 1), cy - s * 1.15 + Math.sin(a) * s * 0.16 * (k % 2 ? 0.5 : 1)); } x.fill(); }
  if (L.hat === 'goggles') { x.fillStyle = '#3a2412'; x.fillRect(cx - s * 0.92, cy - s * 0.72, s * 1.84, s * 0.14); x.fillStyle = '#c9a45a'; for (const d of [-1, 1]) { x.beginPath(); x.arc(cx + d * s * 0.28, cy - s * 0.66, s * 0.16, 0, 7); x.fill(); } x.fillStyle = '#88ffcc'; for (const d of [-1, 1]) { x.beginPath(); x.arc(cx + d * s * 0.28, cy - s * 0.66, s * 0.1, 0, 7); x.fill(); } }
  if (id === 'pron') { // bow tie
    x.fillStyle = '#111'; x.beginPath(); x.moveTo(cx, H * 0.9); x.lineTo(cx - 22, H * 0.85); x.lineTo(cx - 22, H * 0.96); x.closePath(); x.moveTo(cx, H * 0.9); x.lineTo(cx + 22, H * 0.85); x.lineTo(cx + 22, H * 0.96); x.closePath(); x.fill();
  }
}

export function makeCharacter(dept) {
  const L = LOOK[dept.id];
  const root = new THREE.Group();
  const skinM = new THREE.MeshStandardMaterial({ color: new THREE.Color(L.skin), roughness: 0.65 });
  const hairM = new THREE.MeshStandardMaterial({ color: new THREE.Color(L.hair), roughness: 0.9 });
  const coatM = new THREE.MeshStandardMaterial({ color: L.coat, roughness: 0.7 });
  const trimM = new THREE.MeshStandardMaterial({ color: L.trim, roughness: 0.5, metalness: L.trim === 0xe0b860 || L.trim === 0xe8d8a0 ? 0.6 : 0 });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x15130f, roughness: 0.6 });
  const shoeM = new THREE.MeshStandardMaterial({ color: 0x0a0908, roughness: 0.2, metalness: 0.2 });
  const whiteM = new THREE.MeshStandardMaterial({ color: 0xf6f2ea, roughness: 0.6 });
  const brassM = new THREE.MeshStandardMaterial({ color: 0xd8ae62, metalness: 0.9, roughness: 0.3 });

  // The face canvas for the 3D head (transparent, features only) and the portrait canvas
  const faceC = document.createElement('canvas'); faceC.width = 512; faceC.height = 384;
  const faceT = new THREE.CanvasTexture(faceC); faceT.colorSpace = THREE.SRGBColorSpace;
  const portrait = document.createElement('canvas'); portrait.width = 256; portrait.height = 192;

  const people = [];
  const count = L.triplets ? 3 : 1;
  for (let n = 0; n < count; n++) {
    const P = new THREE.Group(); P.position.z = (n - (count - 1) / 2) * 0.95; root.add(P);
    const gown = L.body === 'gown' || L.body === 'dress';
    // legs or skirt
    if (gown) {
      const prof = [[0, 0], [0.62, 0], [0.6, 0.06], [0.42, 0.55], [0.3, 0.95], [0.27, 1.0], [0, 1.0]].map(p => new THREE.Vector2(p[0], p[1]));
      const sk = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), coatM); P.add(sk);
      if (L.body === 'dress') { const ap = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.75), whiteM); ap.position.set(0, 0.55, 0.43); ap.rotation.x = -0.28; P.add(ap); }
    } else {
      const trouser = L.body === 'labcoat' ? darkM : L.body === 'footman' ? whiteM : L.body === 'colonel' ? darkM : darkM;
      for (const d of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.88, 12), trouser); leg.position.set(d * 0.13, 0.48, 0); P.add(leg);
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.09, 0.32), shoeM); shoe.position.set(d * 0.13, 0.045, 0.06); P.add(shoe);
        if (L.body === 'footman') { const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.03), brassM); b.position.set(d * 0.13, 0.1, 0.22); P.add(b); }
      }
    }
    // torso
    const tProf = [[0, 0], [0.27, 0], [0.31, 0.25], [0.34, 0.5], [0.33, 0.62], [0.2, 0.72], [0, 0.74]].map(p => new THREE.Vector2(p[0], p[1]));
    const torso = new THREE.Mesh(new THREE.LatheGeometry(tProf, 24), coatM); torso.position.y = 0.9; torso.scale.set(1, 1, 0.75); P.add(torso);
    // a round tummy for the butler, the sergeant and the colonel
    if (['tails', 'police', 'colonel'].includes(L.body)) { const belly = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), coatM); belly.position.set(0, 1.08, 0.06); belly.scale.set(1, 0.9, 0.9); P.add(belly); }
    // shirt front and neckwear
    const shirt = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.36), L.body === 'police' ? coatM : whiteM); shirt.position.set(0, 1.42, 0.27); shirt.rotation.x = -0.25; P.add(shirt);
    if (L.body === 'tails' || L.body === 'footman') {
      const bow = new THREE.Group(); bow.position.set(0, 1.56, 0.27); P.add(bow);
      for (const d of [-1, 1]) { const w = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 4), L.body === 'tails' ? darkM : whiteM); w.rotation.z = d * Math.PI / 2; w.position.x = d * 0.05; bow.add(w); }
      // tailcoat tails
      if (L.body === 'tails') for (const d of [-1, 1]) { const tl = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.04), coatM); tl.position.set(d * 0.1, 0.72, -0.22); tl.rotation.x = 0.12; P.add(tl); }
    }
    if (L.body === 'labcoat') { const lc = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.7, 20, 1, true), coatM); lc.position.y = 0.62; lc.material.side = THREE.DoubleSide; P.add(lc); const tie = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.02), new THREE.MeshStandardMaterial({ color: 0xc02a2a })); tie.position.set(0, 1.45, 0.29); tie.rotation.x = -0.25; P.add(tie); }
    if (L.body === 'police') { for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), trimM); b.position.set(0, 1.0 + k * 0.14, 0.3 + (k < 2 ? 0.04 : 0)); P.add(b); } const belt = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.03, 6, 24), darkM); belt.rotation.x = Math.PI / 2; belt.position.y = 0.98; belt.scale.set(1, 0.85, 1); P.add(belt); }
    if (L.body === 'colonel') { for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.01, 12), trimM); m.rotation.x = Math.PI / 2 - 0.25; m.position.set(-0.13 + k * 0.07, 1.4, 0.27); P.add(m); } for (const d of [-1, 1]) { const ep = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.12), trimM); ep.position.set(d * 0.3, 1.62, 0); P.add(ep); } }
    if (L.body === 'footman') { for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), trimM); b.position.set(0.12, 1.15 + k * 0.12, 0.27); P.add(b); } const sash = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.02), trimM); sash.position.set(0, 1.25, 0.28); sash.rotation.set(-0.2, 0, 0.6); P.add(sash); }
    if (L.body === 'gown') { const pearls = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 24), whiteM); pearls.rotation.x = Math.PI / 2 - 0.3; pearls.position.set(0, 1.6, 0.04); P.add(pearls); }

    // arms
    const arms = [];
    for (const d of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(d * 0.33, 1.56, 0); P.add(sh);
      const up = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.36, 10), coatM); up.position.y = -0.18; sh.add(up);
      const el = new THREE.Group(); el.position.y = -0.36; sh.add(el);
      const fo = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.06, 0.32, 10), coatM); fo.position.y = -0.16; el.add(fo);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.05, 10), L.body === 'police' ? coatM : whiteM); cuff.position.y = -0.31; el.add(cuff);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), L.body === 'tails' || L.body === 'footman' ? whiteM : skinM); hand.position.y = -0.38; hand.scale.set(1, 1.15, 0.75); el.add(hand);
      sh.rotation.z = d * 0.12; el.rotation.x = -0.25;
      arms.push({ sh, el, d });
    }
    // props in hands
    if (L.tray) { // butler: a silver tray of tea, held level on the left hand
      arms[0].sh.rotation.x = -0.15; arms[0].el.rotation.x = -1.45;
      const tray = new THREE.Group(); tray.position.set(0, -0.42, 0.12); arms[0].el.add(tray); tray.rotation.x = 1.45;
      tray.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.015, 24), new THREE.MeshStandardMaterial({ color: 0xdadde0, metalness: 1, roughness: 0.15 })));
      const pot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), whiteM); pot.position.set(-0.06, 0.07, 0); tray.add(pot);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.05, 12), whiteM); cup.position.set(0.09, 0.03, 0.04); tray.add(cup);
      P.userData.holdLeft = true;
    }
    if (L.keys) { // housekeeper: a big ring of keys on her belt
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 6, 20), brassM); ring.position.set(0.24, 0.95, 0.2); P.add(ring);
      for (let k = 0; k < 5; k++) { const key = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.01), brassM); key.position.set(0.2 + k * 0.02, 0.86, 0.22); key.rotation.z = (k - 2) * 0.3; P.add(key); }
    }
    if (L.cane) { // colonel: a walking stick
      const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.95, 8), new THREE.MeshStandardMaterial({ color: 0x3a2412, roughness: 0.5 })); cane.position.set(0, -0.82, 0.05); arms[1].el.add(cane);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), brassM); knob.position.set(0, -0.36, 0.05); arms[1].el.add(knob);
      P.userData.holdRight = true;
    }
    if (dept.id === 'crime') { // a notebook
      const nb = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.02), darkM); nb.position.set(0, -0.44, 0.04); arms[0].el.add(nb);
    }
    if (dept.id === 'conf') { // a bubbling flask
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), new THREE.MeshBasicMaterial({ color: 0x7dff6a, toneMapped: false, transparent: true, opacity: 0.85 })); fl.position.set(0, -0.48, 0.04); arms[1].el.add(fl);
    }

    // neck and big caricature head
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 10), skinM); neck.position.y = 1.68; P.add(neck);
    const head = new THREE.Group(); head.position.y = 1.98; P.add(head);
    const hs = 0.3;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(hs, 32, 24), skinM); skull.scale.set(1, 1.1, 0.95); head.add(skull);
    // painted features on a cap of a slightly larger sphere
    const cap = new THREE.Mesh(new THREE.SphereGeometry(hs * 1.005, 32, 24, Math.PI * 0.5 - 0.95, 1.9, 0.55, 1.5),
      new THREE.MeshStandardMaterial({ map: faceT, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    cap.scale.copy(skull.scale); head.add(cap);   // phi centred on π/2 faces +z
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), new THREE.MeshStandardMaterial({ color: new THREE.Color(L.skin).multiplyScalar(0.92).lerp(new THREE.Color(0xd07060), dept.id === 'myth' ? 0.4 : 0.15), roughness: 0.6 }));
    nose.position.set(0, -0.02, hs * 0.97); nose.scale.set(0.8, 1, 0.9); head.add(nose);
    for (const d of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), skinM); ear.scale.set(0.5, 1, 0.8); ear.position.set(d * hs * 0.98, 0, 0); head.add(ear); }
    addHair(head, L, hs, hairM);
    addHat(head, L, hs, brassM);
    people.push({ P, head, arms, phase: n * 1.3 });
  }

  // ── behaviour ──
  let expr = 'idle', exprUntil = 0, talkUntil = 0, gestureT = 0, lastDraw = -1;
  const speaker = L.triplets ? 1 : 0;
  function redraw(now) {
    if (now > exprUntil && expr !== 'idle') expr = 'idle';
    const talking = now < talkUntil, mo = talking ? Math.abs(Math.sin(now * 13)) : 0;
    const e = talking && expr === 'idle' ? 'talk' : expr;
    const x = faceC.getContext('2d'); x.clearRect(0, 0, faceC.width, faceC.height);
    paintFeatures(x, L, e, now, mo, faceC.width / 2, faceC.height * 0.63, faceC.height * 0.8);
    faceT.needsUpdate = true;
    paintPortrait(portrait, L, dept.id, e, now, mo);
  }
  const api = {
    root, faceCanvas: portrait, voice: VOICE[dept.id], pitch: PITCH[dept.id],
    collider: L.triplets ? { hx: 0.6, hz: 1.6 } : { hx: 0.55, hz: 0.55 },
    setExpr(e, secs = 2.5) { expr = e; exprUntil = performance.now() / 1000 + secs; lastDraw = -1; },
    talk(secs) { talkUntil = performance.now() / 1000 + secs; gestureT = 0; },
    update(dt, t, player) {
      const dx = player.x - root.position.x, dz = player.z - root.position.z, d = Math.hypot(dx, dz);
      const want = d < 9 ? Math.atan2(dx, dz) : root.userData.homeYaw;
      let diff = want - root.rotation.y; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
      // the triplets turn their heads, not their bodies, so they stay in a neat row
      if (L.triplets) for (const p of people) p.head.rotation.y = THREE.MathUtils.clamp(diff, -1, 1);
      else root.rotation.y += diff * Math.min(1, dt * 2);
      const now = performance.now() / 1000, talking = now < talkUntil;
      gestureT += dt;
      people.forEach((p, n) => {
        const ph = p.phase;
        p.P.position.y = Math.abs(Math.sin(t * 1.2 + ph)) * 0.008;               // breathing
        p.head.rotation.z = Math.sin(t * 0.8 + ph) * 0.05 + (talking && n === speaker ? Math.sin(gestureT * 5) * 0.06 : 0);
        p.head.rotation.x = (talking && n === speaker ? Math.sin(gestureT * 7) * 0.05 : 0) - 0.08;   // noses slightly in the air
        const [lA, rA] = p.arms;
        if (!p.P.userData.holdLeft) lA.sh.rotation.x = Math.sin(t + ph) * 0.04 + (talking && n === speaker ? Math.sin(gestureT * 3) * 0.3 - 0.35 : 0);
        if (!p.P.userData.holdRight) { rA.sh.rotation.x = Math.sin(t + ph + 1) * 0.04 + (talking && n === speaker ? Math.sin(gestureT * 2.4 + 1) * 0.4 - 0.6 : 0); rA.el.rotation.x = talking && n === speaker ? -1 + Math.sin(gestureT * 4) * 0.25 : -0.25; }
        // shocked: both arms up in horror
        if (expr === 'appalled' && !p.P.userData.holdLeft) { lA.sh.rotation.z = -0.9; rA.sh.rotation.z = 0.9; } else { lA.sh.rotation.z = -0.12; if (!p.P.userData.holdRight) rA.sh.rotation.z = 0.12; }
      });
      if (talking || now - lastDraw > (expr === 'idle' ? 0.25 : 0.08)) { redraw(now); lastDraw = now; }
    },
  };
  redraw(0);
  return api;
}

// A hair shell: a cap over the top, plus the back half down to the neck. The face stays clear.
function shell(r, hairM, top = 0.3, back = 0.62) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 10, 0, Math.PI * 2, 0, Math.PI * top), hairM));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 14, Math.PI, Math.PI, 0, Math.PI * back), hairM));
  return g;
}
function addHair(head, L, hs, hairM) {
  const s = hs;
  if (L.hairdo === 'bald-sides') {
    for (const d of [-1, 1]) { const h = new THREE.Mesh(new THREE.SphereGeometry(s * 0.35, 12, 10), hairM); h.scale.set(0.6, 1, 1.2); h.position.set(d * s * 0.85, s * 0.1, -s * 0.2); head.add(h); }
    const back = new THREE.Mesh(new THREE.SphereGeometry(s * 0.5, 12, 10), hairM); back.scale.set(1.4, 0.6, 0.6); back.position.set(0, -s * 0.05, -s * 0.75); head.add(back);
  } else if (L.hairdo === 'bouffant') {
    const sh = shell(s * 1.08, hairM, 0.32, 0.7); sh.scale.set(1, 1.12, 1); head.add(sh);
    const puff = new THREE.Mesh(new THREE.SphereGeometry(s * 0.95, 20, 16), hairM); puff.scale.set(1.05, 0.75, 0.95); puff.position.set(0, s * 0.85, -s * 0.2); head.add(puff);
  } else if (L.hairdo === 'wig') {
    const sh = shell(s * 1.06, hairM, 0.3, 0.6); sh.scale.set(1, 1.12, 1); head.add(sh);
    for (const d of [-1, 1]) for (let k = 0; k < 2; k++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.17, s * 0.17, s * 0.5, 14), hairM); c.rotation.x = Math.PI / 2; c.position.set(d * s * 0.98, -s * 0.0 - k * s * 0.32, -s * 0.2); head.add(c); }
    const tail = new THREE.Mesh(new THREE.SphereGeometry(s * 0.15, 10, 8), new THREE.MeshStandardMaterial({ color: 0x111111 })); tail.position.set(0, -s * 0.5, -s * 1.05); head.add(tail);
  } else if (L.hairdo === 'wild') {
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; if (Math.sin(a) > 0.55) continue; const tuft = new THREE.Mesh(new THREE.ConeGeometry(s * 0.18, s * 0.6, 8), hairM); tuft.position.set(Math.cos(a) * s * 0.85, s * 0.45 + Math.sin(a * 3) * s * 0.12, Math.sin(a) * s * 0.75 - s * 0.1); tuft.lookAt(tuft.position.clone().multiplyScalar(3)); tuft.rotateX(Math.PI / 2); head.add(tuft); }
  } else if (L.hairdo === 'bun') {
    const sh = shell(s * 1.04, hairM, 0.3, 0.55); sh.scale.set(1, 1.12, 1); head.add(sh);
    const bun = new THREE.Mesh(new THREE.SphereGeometry(s * 0.35, 14, 10), hairM); bun.position.set(0, s * 0.95, -s * 0.5); head.add(bun);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, s * 1.1, 6), new THREE.MeshStandardMaterial({ color: 0x222222 })); pin.position.set(0, s * 1.0, -s * 0.5); pin.rotation.z = 1.2; head.add(pin);
  } else if (L.hairdo === 'short') {
    const sh = shell(s * 1.03, hairM, 0.27, 0.5); sh.scale.set(1, 1.12, 1); head.add(sh);
  }
}
function addHat(head, L, hs, brassM) {
  const s = hs, top = s * 1.0;
  if (L.hat === 'tiara') {
    const band = new THREE.Mesh(new THREE.TorusGeometry(s * 0.55, 0.012, 8, 28, Math.PI), brassM); band.position.set(0, top + s * 0.25, s * 0.1); band.rotation.x = -0.35; head.add(band);
    for (let i = -2; i <= 2; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1 - Math.abs(i) * 0.02, 6), brassM); sp.position.set(i * s * 0.22, top + s * 0.4, s * 0.45); head.add(sp); }
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.03), new THREE.MeshBasicMaterial({ color: 0xff4f9a, toneMapped: false })); gem.position.set(0, top + s * 0.45, s * 0.5); head.add(gem);
  } else if (L.hat === 'helmet') {
    const navy = new THREE.MeshStandardMaterial({ color: 0x141a30, roughness: 0.5 });
    const h = new THREE.Mesh(new THREE.SphereGeometry(s * 0.95, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), navy); h.scale.set(1.05, 1.7, 1.08); h.position.y = s * 0.45; head.add(h);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(s * 1.12, s * 1.12, 0.03, 32), navy); rim.position.y = s * 0.45; head.add(rim);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 1, roughness: 0.2 })); knob.position.y = s * 2.05; head.add(knob);
    const badge = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 1, roughness: 0.2 })); badge.position.set(0, s * 1.15, s * 0.95); badge.rotation.x = -0.4; head.add(badge);
  } else if (L.hat === 'goggles') {
    const strap = new THREE.Mesh(new THREE.TorusGeometry(s * 1.0, 0.025, 8, 32), new THREE.MeshStandardMaterial({ color: 0x3a2412, roughness: 0.8 })); strap.rotation.x = Math.PI / 2 - 0.3; strap.position.y = s * 0.55; head.add(strap);
    for (const d of [-1, 1]) {
      const g = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.07, 18), brassM); g.rotation.x = Math.PI / 2 - 0.5; g.position.set(d * s * 0.32, s * 0.72, s * 0.78); head.add(g);
      const l = new THREE.Mesh(new THREE.CircleGeometry(0.048, 18), new THREE.MeshBasicMaterial({ color: 0x88ffcc, toneMapped: false })); l.position.set(d * s * 0.32, s * 0.75, s * 0.83); l.rotation.x = -0.5; head.add(l);
    }
  }
}
