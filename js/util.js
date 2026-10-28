// Small helpers shared by every file
export const $ = id => document.getElementById(id);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// localStorage can throw (private windows, locked-down school machines), so every call is wrapped
export const store = {
  get(k, d) { try { const v = localStorage.getItem('pedantry.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('pedantry.' + k, JSON.stringify(v)); } catch (e) {} },
};

// A seeded random number generator, so procedural textures look the same every time
export function seeded(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
