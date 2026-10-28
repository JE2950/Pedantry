// ════════════════════════════════════════════════════════════════
// SOUND: everything is synthesised, so there are no audio files to load
// ════════════════════════════════════════════════════════════════
import { store } from './util.js';

let ctx = null, master = null, humGain = null;
export const sound = { on: store.get('sound', true), voices: store.get('voices', false) };

function ac() {
  if (!sound.on) return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    } catch (e) { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}
export function unlockAudio() { ac(); }

function tone(freq, t0, dur, type = 'sine', vol = 0.2, slideTo = null) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, c.currentTime + t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + t0 + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime + t0);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
  o.connect(g); g.connect(master); o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.05);
}
function noise(t0, dur, vol = 0.3, freq = 800) {
  const c = ac(); if (!c) return;
  const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(master); s.start(c.currentTime + t0);
}

export const sfx = {
  right() { tone(660, 0, 0.18, 'triangle', 0.22); tone(990, 0.09, 0.3, 'triangle', 0.2); },
  wrong() { tone(300, 0, 0.28, 'sawtooth', 0.09, 260); tone(250, 0.26, 0.28, 'sawtooth', 0.09, 215); tone(205, 0.52, 0.55, 'sawtooth', 0.09, 150); },
  stamp() { noise(0, 0.25, 0.7, 500); tone(90, 0, 0.2, 'sine', 0.35, 50); },
  click() { tone(1400, 0, 0.04, 'square', 0.04); },
  dingdong() { tone(784, 0, 0.6, 'sine', 0.15); tone(622, 0.45, 0.9, 'sine', 0.15); },
  lift() { tone(523, 0, 0.3, 'sine', 0.15); tone(659, 0.2, 0.3, 'sine', 0.15); tone(784, 0.4, 0.6, 'sine', 0.15); },
  fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.14, 0.5, 'triangle', 0.18)); tone(1047, 0.6, 1.2, 'triangle', 0.15); },
  denied() { tone(180, 0, 0.18, 'square', 0.07); tone(140, 0.2, 0.3, 'square', 0.07); },
  tick() { tone(1800, 0, 0.03, 'square', 0.03); },
  // Robot babble: one blip per few letters, pitch set by the robot
  babble(text, base = 220) {
    const c = ac(); if (!c) return;
    const n = Math.min(26, Math.ceil(text.length / 4));
    for (let i = 0; i < n; i++) tone(base * (0.8 + Math.random() * 0.6), i * 0.055, 0.05, 'square', 0.025);
  },
};

// A low hum of machinery, for the 3D Institute
export function hum(on) {
  const c = ac(); if (!c) return;
  if (on && !humGain) {
    humGain = c.createGain(); humGain.gain.value = 0.0001; humGain.connect(master);
    [55, 82.5, 110.3].forEach((f, i) => {
      const o = c.createOscillator(); o.type = i ? 'sine' : 'triangle'; o.frequency.value = f;
      const g = c.createGain(); g.gain.value = i ? 0.04 : 0.06; o.connect(g); g.connect(humGain); o.start();
    });
    humGain.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 2);
  } else if (!on && humGain) {
    const g = humGain; humGain = null;
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.6);
    setTimeout(() => g.disconnect(), 800);
  }
}

// Optional spoken lines (off by default: thirty robots talking at once in a classroom is a lot)
export function speak(text, pitch = 1, rate = 1.05) {
  if (!sound.on || !sound.voices || !window.speechSynthesis) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, ''));
    u.pitch = pitch; u.rate = rate; u.lang = 'en-GB';
    const v = speechSynthesis.getVoices().find(v => /en-GB/i.test(v.lang));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch (e) {}
}
export function hush() { try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {} }
export function setSound(on) { sound.on = on; store.set('sound', on); if (!on) { hum(false); hush(); } }
export function setVoices(on) { sound.voices = on; store.set('voices', on); if (!on) hush(); }
