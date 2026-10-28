// ════════════════════════════════════════════════════════════════
// PLAYER: walking, looking and bumping into walls
// Keyboard and mouse on a PC; a stick and drag-to-look on a tablet.
// ════════════════════════════════════════════════════════════════
import { $, clamp } from './util.js';

export function makePlayer(camera, canvas) {
  const P = { x: 0, z: 0, yaw: 0, pitch: 0, r: 0.35, eye: 1.62, bob: 0, enabled: false };
  const keys = {};
  let joy = { x: 0, y: 0, id: null }, look = { id: null, x: 0, y: 0 };
  const coarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  P.touch = coarse;

  addEventListener('keydown', e => { keys[e.code] = true; });
  addEventListener('keyup', e => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  P.lock = () => { if (!coarse && canvas.requestPointerLock) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} } };
  P.unlock = () => { if (document.pointerLockElement) document.exitPointerLock(); };
  P.locked = () => document.pointerLockElement === canvas;
  addEventListener('mousemove', e => {
    if (!P.enabled || !P.locked()) return;
    P.yaw -= e.movementX * 0.0022; P.pitch = clamp(P.pitch - e.movementY * 0.0022, -1.35, 1.35);
  });

  // Touch: left half is a joystick, right half drags the view
  const jb = $('joy'), jk = $('joyKnob');
  function joyMove(t) {
    const r = jb.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = (t.clientX - cx) / (r.width / 2), dy = (t.clientY - cy) / (r.height / 2); const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
    joy.x = dx; joy.y = dy; jk.style.transform = `translate(${dx * 38}px, ${dy * 38}px)`;
  }
  canvas.addEventListener('touchstart', e => {
    if (!P.enabled) return;
    for (const t of e.changedTouches) {
      if (t.clientX < innerWidth * 0.42 && joy.id === null) { joy.id = t.identifier; joyMove(t); }
      else if (look.id === null) { look.id = t.identifier; look.x = t.clientX; look.y = t.clientY; }
    }
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === joy.id) joyMove(t);
      else if (t.identifier === look.id) { P.yaw -= (t.clientX - look.x) * 0.006; P.pitch = clamp(P.pitch - (t.clientY - look.y) * 0.006, -1.3, 1.3); look.x = t.clientX; look.y = t.clientY; }
    }
    e.preventDefault();
  }, { passive: false });
  const endT = e => { for (const t of e.changedTouches) { if (t.identifier === joy.id) { joy = { x: 0, y: 0, id: null }; jk.style.transform = ''; } if (t.identifier === look.id) look.id = null; } };
  canvas.addEventListener('touchend', endT); canvas.addEventListener('touchcancel', endT);

  function hits(x, z, cols) {
    for (const c of cols) if (x + P.r > c.x0 && x - P.r < c.x1 && z + P.r > c.z0 && z - P.r < c.z1) return true;
    return false;
  }
  P.update = (dt, cols) => {
    let f = 0, s = 0;
    if (P.enabled) {
      if (keys.KeyW || keys.ArrowUp) f += 1; if (keys.KeyS || keys.ArrowDown) f -= 1;
      if (keys.KeyD || keys.ArrowRight) s += 1; if (keys.KeyA || keys.ArrowLeft) s -= 1;
      f -= joy.y; s += joy.x;
    }
    const m = Math.hypot(f, s); if (m > 1) { f /= m; s /= m; }
    const speed = (keys.ShiftLeft || keys.ShiftRight ? 6.2 : 3.6);
    const sin = Math.sin(P.yaw), cos = Math.cos(P.yaw);
    const dx = (-sin * f + cos * s) * speed * dt, dz = (-cos * f - sin * s) * speed * dt;
    // move one axis at a time so you slide along walls
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.2) || 1;
    for (let i = 0; i < steps; i++) {
      if (!hits(P.x + dx / steps, P.z, cols)) P.x += dx / steps;
      if (!hits(P.x, P.z + dz / steps, cols)) P.z += dz / steps;
    }
    const moving = m > 0.1 && P.enabled;
    P.bob += moving ? dt * speed * 2.2 : 0;
    camera.position.set(P.x, P.eye + (moving ? Math.sin(P.bob) * 0.04 : 0), P.z);
    camera.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
  };
  return P;
}
