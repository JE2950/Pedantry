// ════════════════════════════════════════════════════════════════
// TEXTURES
// Photo textures (marble, wood, bronze) plus canvas-painted ones:
// art deco wallpaper, posters, neon signs, underwater windows and robot faces.
// ════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { seeded } from './util.js';

function loadImg(url) {
  return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = url; });
}
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }
export function tex(c, repeat = [1, 1], srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export const IMG = {};
let artReady;
export function loadArt() {
  return artReady ||= Promise.all(['staff', 'propaganda'].map(async name => {
    IMG[name] = await loadImg(`assets/art/${name}.webp`);
  }));
}
// Also load for quick play, which does not enter the 3D world.
loadArt();
export function portraitArt(id) {
  const ids = ['host', 'quant', 'pron', 'homo', 'conf', 'apos', 'crime', 'myth', 'pedant'];
  const i = ids.indexOf(id), image = IMG.staff;
  if (!image || i < 0) return null;
  return { image, sx: (i % 3) * image.width / 3, sy: Math.floor(i / 3) * image.height / 3,
    sw: image.width / 3, sh: image.height / 3 };
}
export async function loadPhotos() {
  await loadArt();
  const [marble, wood, bronze] = await Promise.all(['marble', 'wood', 'bronze'].map(n => loadImg(`assets/textures/${n}.webp`)));
  Object.assign(IMG, { marble, wood, bronze });
}

// Paper grain, so flat canvas paint does not look like plastic
function grain(x, w, h, amt = 18, seed = 3) {
  const d = x.getImageData(0, 0, w, h), p = d.data, r = seeded(seed);
  for (let i = 0; i < p.length; i += 4) { const n = (r() - 0.5) * amt; p[i] += n; p[i + 1] += n; p[i + 2] += n; }
  x.putImageData(d, 0, 0);
}

// Black and white marble chequerboard, one canvas = 2 x 2 tiles
export function checkerFloor() {
  const S = 1024, c = cv(S), x = c.getContext('2d'), h = S / 2;
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    if (IMG.marble) x.drawImage(IMG.marble, i * h, j * h, h, h);
    else { x.fillStyle = '#ddd8cc'; x.fillRect(i * h, j * h, h, h); }
    if ((i + j) % 2) {
      x.globalCompositeOperation = 'multiply'; x.fillStyle = '#1d2226'; x.fillRect(i * h, j * h, h, h);
      x.globalCompositeOperation = 'source-over'; x.fillStyle = 'rgba(10,30,32,0.35)'; x.fillRect(i * h, j * h, h, h);
    } else { x.fillStyle = 'rgba(255,245,225,0.12)'; x.fillRect(i * h, j * h, h, h); }
  }
  x.strokeStyle = 'rgba(20,16,10,0.75)'; x.lineWidth = 6;
  for (let k = 0; k <= 2; k++) { x.beginPath(); x.moveTo(k * h, 0); x.lineTo(k * h, S); x.stroke(); x.beginPath(); x.moveTo(0, k * h); x.lineTo(S, k * h); x.stroke(); }
  return c;
}
// Brass inlay border for the hall floor: a strip of chevrons
export function photo(name, fallback) {
  const c = cv(512), x = c.getContext('2d');
  if (IMG[name]) x.drawImage(IMG[name], 0, 0, 512, 512); else { x.fillStyle = fallback; x.fillRect(0, 0, 512, 512); }
  return c;
}
// Plank floor, built from the wood photo
export function parquet() {
  const S = 512, c = cv(S), x = c.getContext('2d'), src = photo('wood', '#6b4a2e'), r = seeded(9);
  const rows = 12, rh = S / rows;
  for (let j = 0; j < rows; j++) {
    let px = -r() * 200;
    while (px < S) {
      const len = 150 + r() * 160;
      x.drawImage(src, r() * 300, r() * 470, 200, 36, px, j * rh, len, rh);
      x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,200,140'},${r() * 0.14})`; x.fillRect(px, j * rh, len, rh);
      x.fillStyle = 'rgba(15,8,3,0.7)'; x.fillRect(px, j * rh, 2, rh);
      px += len;
    }
    x.fillStyle = 'rgba(15,8,3,0.7)'; x.fillRect(0, j * rh, S, 2);
  }
  x.fillStyle = 'rgba(40,20,8,0.25)'; x.fillRect(0, 0, S, S);
  return c;
}

// Art deco wallpaper: fans of gold arcs on a dark base
export function wallpaper(base = '#123a36', gold = '#c9a45a') {
  const S = 256, c = cv(S), x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, S, S);
  const cell = 64;
  for (let j = 0; j <= 4; j++) for (let i = 0; i <= 4; i++) {
    const cx = i * cell + (j % 2 ? cell / 2 : 0), cy = j * cell;
    for (let k = 1; k <= 4; k++) {
      x.beginPath(); x.arc(cx, cy, k * 8, Math.PI, 2 * Math.PI);
      x.strokeStyle = gold; x.globalAlpha = 0.18 + k * 0.05; x.lineWidth = 2; x.stroke();
    }
    for (let a = 0; a < 7; a++) {
      const ang = Math.PI + (a + 0.5) * Math.PI / 7;
      x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(ang) * 30, cy + Math.sin(ang) * 30);
      x.globalAlpha = 0.12; x.stroke();
    }
  }
  x.globalAlpha = 1; grain(x, S, S, 14, 5);
  return c;
}
// Dark wood panelling for the lower walls
export function panelling() {
  const S = 512, c = cv(S), x = c.getContext('2d');
  if (IMG.wood) { x.save(); x.translate(S, 0); x.rotate(Math.PI / 2); x.drawImage(IMG.wood, 0, 0, S, S); x.restore(); }
  else { x.fillStyle = '#5a3a22'; x.fillRect(0, 0, S, S); }
  x.fillStyle = 'rgba(30,14,6,0.45)'; x.fillRect(0, 0, S, S);
  // two raised panels per tile
  for (let k = 0; k < 2; k++) {
    const px = k * S / 2 + 24, pw = S / 2 - 48;
    x.strokeStyle = 'rgba(0,0,0,0.55)'; x.lineWidth = 8; x.strokeRect(px, 60, pw, S - 120);
    x.strokeStyle = 'rgba(255,220,170,0.18)'; x.lineWidth = 3; x.strokeRect(px + 6, 66, pw - 12, S - 132);
  }
  return c;
}
// Coffered ceiling
export function ceiling() {
  const S = 256, c = cv(S), x = c.getContext('2d');
  x.fillStyle = '#1b1a18'; x.fillRect(0, 0, S, S);
  x.fillStyle = '#26231f'; x.fillRect(16, 16, S - 32, S - 32);
  x.strokeStyle = '#8a6a36'; x.lineWidth = 3; x.strokeRect(22, 22, S - 44, S - 44);
  x.fillStyle = '#141311'; x.fillRect(40, 40, S - 80, S - 80);
  grain(x, S, S, 10, 7);
  return c;
}

// Propaganda posters
export function poster(lines, o = {}) {
  const W = 512, H = 768, c = cv(W, H), x = c.getContext('2d');
  const bg = o.bg || '#b8322a', fg = o.fg || '#f3e6c4', ink = o.ink || '#1a1410';
  x.fillStyle = '#efe2c0'; x.fillRect(0, 0, W, H);
  x.fillStyle = bg; x.fillRect(22, 22, W - 44, H - 44);
  // Printed illustration occupies a dedicated window below the headline.
  const title = lines.join(' ');
  const art = /AFFECT|EFFECT|LITERALLY/.test(title) ? 2
    : /WANTED|COULD|ALOT|APPLE|OWNER|DOG/.test(title) ? 3
    : /THEIR|THERE|YOUR|WHOM|MYSELF|PERSON|WELCOME/.test(title) ? 1 : 0;
  if (IMG.propaganda) {
    const im = IMG.propaganda, sw = im.width / 2, sh = im.height / 2;
    x.drawImage(im, (art % 2) * sw, Math.floor(art / 2) * sh, sw, sh, 38, 300, 436, 390);
  } else {
    x.fillStyle = fg; x.textAlign = 'center'; x.font = 'bold 150px Georgia';
    x.fillText(o.symbol || '¶', W / 2, 540);
  }
  x.strokeStyle = fg; x.lineWidth = 2; x.strokeRect(34, 296, 444, 398);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  x.font = '600 26px "Josefin Sans", Futura, "Trebuchet MS", sans-serif';
  x.fillText(o.top || 'PEDANTICO INSTITUTE', W / 2, 78);
  x.fillRect(110, 92, W - 220, 3);
  // headline: fit each line to the width
  let y = 144;
  const lineStep = Math.min(62, 138 / lines.length);
  for (const ln of lines) {
    let size = Math.min(58, lineStep - 5);
    do { x.font = `700 ${size}px Limelight, "Poiret One", Georgia, serif`; size -= 2; } while (x.measureText(ln).width > W - 90 && size > 18);
    x.lineWidth = 6; x.strokeStyle = ink; x.strokeText(ln, W / 2, y); x.fillText(ln, W / 2, y);
    y += lineStep;
  }
  x.font = 'italic 24px Georgia, serif'; x.fillStyle = fg;
  if (o.foot) {
    let fs = 24;
    while (fs > 14 && x.measureText(o.foot).width > W - 68) { x.font = `italic ${--fs}px Georgia, serif`; }
    x.fillText(o.foot, W / 2, H - 46);
  }
  grain(x, W, H, 26, lines.join('').length);
  // wear
  const r = seeded(lines.join('').length + 3);
  for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(240,228,200,${r() * 0.25})`; x.beginPath(); x.arc(r() * W, r() * H, r() * 5, 0, 7); x.fill(); }
  return c;
}

// Neon sign: glowing letters on a dark enamel plate
export function neon(text, color = '#ff4f9a', sub = '') {
  const W = 1024, H = 256, c = cv(W, H), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#15120e'); g.addColorStop(1, '#0b0907');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#b8924c'; x.lineWidth = 10; x.strokeRect(8, 8, W - 16, H - 16);
  x.lineWidth = 2; x.strokeRect(22, 22, W - 44, H - 44);
  // Riveted enamel, stepped deco corners and subtle brushed patina.
  for (const px of [38, W - 38]) for (const py of [38, H - 38]) {
    x.fillStyle = '#bb9555'; x.beginPath(); x.arc(px, py, 6, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#312419'; x.lineWidth = 2; x.beginPath(); x.moveTo(px - 3, py); x.lineTo(px + 3, py); x.stroke();
  }
  x.strokeStyle = '#8c6c3a'; x.lineWidth = 2;
  for (const side of [-1, 1]) {
    x.beginPath(); x.moveTo(W / 2 + side * 80, 34); x.lineTo(W / 2 + side * 40, 34);
    x.lineTo(W / 2 + side * 28, 25); x.lineTo(W / 2, 25); x.stroke();
  }
  grain(x, W, H, 12, text.length);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  let size = 110;
  do { x.font = `${size}px Limelight, "Poiret One", Georgia, serif`; size -= 4; } while (x.measureText(text).width > W - 120 && size > 30);
  const ty = sub ? H * 0.43 : H / 2;
  for (const [blur, col] of [[40, color], [18, color], [6, color], [0, '#fff8ee']]) {
    x.shadowColor = color; x.shadowBlur = blur; x.fillStyle = col; x.fillText(text, W / 2, ty);
  }
  if (sub) { x.shadowBlur = 8; x.font = '600 34px "Josefin Sans", Futura, sans-serif'; x.fillStyle = '#e9d9b4'; x.fillText(sub, W / 2, H * 0.8, W - 120); }
  return c;
}
// Brass plaque with engraved text
export function plaque(lines, w = 512, h = 256) {
  const c = cv(w, h), x = c.getContext('2d');
  if (IMG.bronze) x.drawImage(IMG.bronze, 0, 0, w, h); else { x.fillStyle = '#9a7434'; x.fillRect(0, 0, w, h); }
  x.fillStyle = 'rgba(200,160,80,0.35)'; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(40,24,6,0.8)'; x.lineWidth = 6; x.strokeRect(12, 12, w - 24, h - 24);
  x.textAlign = 'center'; x.fillStyle = '#2a1a06';
  const n = lines.length; let y = h / 2 - (n - 1) * 22;
  lines.forEach((ln, i) => { x.font = i === 0 ? `700 ${Math.min(44, 900 / ln.length)}px Limelight, Georgia, serif` : '26px Georgia, serif'; x.fillText(ln, w / 2, y + 10); y += i === 0 ? 50 : 34; });
  return c;
}

// Underwater window: an animated canvas shared by every porthole
export function makeWater() {
  const W = 256, H = 256, c = cv(W, H), x = c.getContext('2d'), r = seeded(17);
  const bubbles = Array.from({ length: 26 }, () => ({ x: r() * W, y: r() * H, s: 1 + r() * 3, v: 10 + r() * 20 }));
  const fish = Array.from({ length: 4 }, (_, i) => ({ x: r() * W, y: 60 + r() * 150, v: (r() < 0.5 ? -1 : 1) * (6 + r() * 10), s: 0.6 + r() * 0.9, big: i === 0 }));
  const t3 = tex(c);
  function draw(t, dt) {
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1d6e86'); g.addColorStop(0.45, '#0d3d57'); g.addColorStop(1, '#03111d');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // light shafts
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const sx = (i * 61 + Math.sin(t * 0.3 + i) * 20) % W;
      const gg = x.createLinearGradient(0, 0, 0, H); gg.addColorStop(0, 'rgba(160,230,255,0.18)'); gg.addColorStop(1, 'rgba(160,230,255,0)');
      x.fillStyle = gg; x.beginPath(); x.moveTo(sx, 0); x.lineTo(sx + 22, 0); x.lineTo(sx + 70, H); x.lineTo(sx + 30, H); x.fill();
    }
    x.globalCompositeOperation = 'source-over';
    // fish silhouettes (one is a whale, obviously)
    for (const f of fish) {
      f.x += f.v * dt * (f.big ? 0.4 : 1); if (f.x > W + 120) f.x = -120; if (f.x < -120) f.x = W + 120;
      const s = f.big ? 3 : f.s, d = Math.sign(f.v);
      x.save(); x.translate(f.x, f.y + Math.sin(t + f.y) * 4); x.scale(d * s, s);
      x.fillStyle = f.big ? 'rgba(2,14,22,0.75)' : 'rgba(4,22,34,0.8)';
      x.beginPath(); x.ellipse(0, 0, 14, 6, 0, 0, 7); x.fill();
      x.beginPath(); x.moveTo(-12, 0); x.lineTo(-22, -7); x.lineTo(-22, 7); x.fill();
      x.restore();
    }
    // bubbles
    x.strokeStyle = 'rgba(210,245,255,0.6)'; x.lineWidth = 1;
    for (const b of bubbles) {
      b.y -= b.v * dt; if (b.y < -5) { b.y = H + 5; b.x = r() * W; }
      x.beginPath(); x.arc(b.x + Math.sin(t * 2 + b.y * 0.05) * 3, b.y, b.s, 0, 7); x.stroke();
    }
    t3.needsUpdate = true;
  }
  draw(0, 0);
  return { texture: t3, draw };
}
