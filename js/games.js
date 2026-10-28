// ════════════════════════════════════════════════════════════════
// THE THREE GAMES
//   Fill the Gap    : choose the word that fits
//   Red Pen         : click the mistake in the sentence
//   Rejection Desk  : approve or reject the sentence
// One session runner drives them all, for the 3D Institute and for quick play.
// ════════════════════════════════════════════════════════════════
import { shuffle, pick, esc } from './util.js';
import { sfx, speak } from './audio.js';

export const GAMES = {
  gap: { name: 'Fill the Gap', how: 'Choose the word that fills the gap.' },
  pen: { name: 'Red Pen', how: 'Click the mistake.' },
  desk: { name: 'Rejection Desk', how: 'Approve the sentence if it is correct. Reject it if it is wrong.' },
};

export const RIGHT = [
  'Correct. Try not to let it go to your head. There is not much room up there.',
  'Right. I am as surprised as you are.',
  'Correct. Somewhere, an English teacher sheds a single proud tear.',
  'Correct. I would clap, but I am holding a teacup.',
  'Acceptable. Barely. Like school custard.',
  'Well done. Do not expect a sticker.',
  'Correct! My moustache is quivering with pride. Or possibly a draught.',
  'Yes. Even a broken clock is right twice a day. You are on once.',
  'Right. I have updated your file from "hopeless" to "occasionally adequate".',
  'Correct. Please do not make a habit of surprising me.',
  'Fine. Yes. Correct. Stop looking so pleased.',
  'Correct. The dictionary nods at you. Very slightly.',
  'Correct. I will alert the newspapers. They will not care.',
  'Hmm. Correct. Did someone help you? I am checking.',
];
export const WRONG = [
  'No. I am not angry. I am just disappointed. Mostly angry.',
  'Wrong. I need a moment.',
  'Incorrect. Somewhere, a dictionary just fainted.',
  'No. That answer has been logged, laminated and filed under "Oh dear".',
  'Wrong. Have you tried reading? Books are excellent.',
  'Incorrect. I have seen better grammar on a cereal packet.',
  'No. A parrot would have got that. A parrot.',
  'Wrong. My monocle has fallen into my soup.',
  'Incorrect. I am writing to your parents. In correct English, unlike you.',
  'No. Read the explanation. Slowly. Say it out loud if it helps. Properly, mind.',
  'Wrong. I would explain where you went wrong, but we would be here all week.',
  'Incorrect. Even the vending machine knew that one.',
  'Oh dear. Oh dear, oh dear. Read the explanation below.',
];
export const STREAK = [
  'Three in a row. Are you cheating? I am watching you.',
  'Five correct. I am starting to feel threatened.',
  'Another one. This is very irritating. Well done.',
];

function hintOf(s) {
  const m = s.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  return m ? [m[1], m[2]] : [s, ''];
}
function fill(s, word, cls) { return esc(s).replace('___', `<span class="${cls}">${esc(word)}</span>`); }

// Turn a bank item into one playable question
export function makeQuestion(item, allowed) {
  if (item.kind === 'verdict') return { item, game: 'desk', ok: item.ok, show: item.s, hint: '' };
  const [s, hint] = hintOf(item.s);
  const games = allowed.filter(g => GAMES[g]);
  const game = pick(games.length ? games : ['gap']);
  const q = { item, game, s, hint };
  if (game === 'gap') q.options = shuffle([item.a, ...item.w]);
  if (game === 'pen') {
    q.wrong = pick(item.w);
    // split into clickable words; the filled-in wrong answer is one chunk with any punctuation after it
    const [before, after] = s.split('___');
    const m = after.match(/^([^\s]*)(.*)$/);
    q.tokens = [];
    before.split(' ').filter(Boolean).forEach(w => q.tokens.push({ w, target: false }));
    q.tokens.push({ w: q.wrong + m[1], target: true, core: q.wrong, tail: m[1] });
    m[2].split(' ').filter(Boolean).forEach(w => q.tokens.push({ w, target: false }));
  }
  if (game === 'desk') {
    q.ok = Math.random() < 0.45;
    q.shown = q.ok ? item.a : pick(item.w);
    q.show = s.replace('___', q.shown);
  }
  return q;
}

// Pick n items, missed ones first, avoiding recent repeats
export function drawItems(pool, n, missed = [], recent = new Set()) {
  const out = [], used = new Set();
  for (const it of shuffle(missed)) { if (out.length >= Math.ceil(n / 2)) break; if (pool.includes(it)) { out.push(it); used.add(it); } }
  const fresh = shuffle(pool.filter(it => !used.has(it) && !recent.has(it)));
  const stale = shuffle(pool.filter(it => !used.has(it) && recent.has(it)));
  for (const it of [...fresh, ...stale]) { if (out.length >= n) break; out.push(it); }
  return shuffle(out);
}

// ── The session runner ──
// opts: { el, title, items, games, timed (seconds, 0 for none), portrait (canvas), face(expr), voice(text), onDone(result) }
export function runSession(opts) {
  const { el } = opts;
  const qs = opts.items.map(it => makeQuestion(it, opts.games));
  let i = 0, score = 0, streak = 0, answered = false, ended = false, timeLeft = opts.timed || 0, timer = null, asked = 0;
  const missed = [];
  const portrait = opts.portrait ? `<canvas class="qface" width="256" height="192"></canvas>` : '';
  el.innerHTML = `
    <div class="qtop">
      ${portrait}
      <div class="qtitle"><div class="qt1">${esc(opts.title)}</div><div class="qt2" id="qMeta"></div></div>
      <div class="qstats"><div id="qScore"></div><div id="qTimer"></div></div>
    </div>
    <div class="qcard" id="qCard"></div>
    <div class="qfeed" id="qFeed"></div>
    <div class="qbar"><button class="btn" id="qQuit">Leave</button><button class="btn big" id="qNext" style="visibility:hidden">Next ▶</button></div>`;
  const $q = id => el.querySelector('#' + id);
  const faceCv = el.querySelector('.qface');
  const paintFace = () => { if (faceCv && opts.portrait) faceCv.getContext('2d').drawImage(opts.portrait, 0, 0); };
  const faceLoop = setInterval(paintFace, 90);

  function stats() {
    $q('qScore').textContent = `${score} / ${opts.timed ? asked : qs.length}`;
    $q('qMeta').textContent = opts.timed ? `Streak ${streak}` : `Question ${Math.min(i + 1, qs.length)} of ${qs.length}${streak >= 2 ? ` · streak ${streak}` : ''}`;
    $q('qTimer').textContent = opts.timed ? `${Math.max(0, Math.ceil(timeLeft))}s` : '';
  }
  function show() {
    if (opts.timed && i >= qs.length) { qs.push(...opts.refill().map(it => makeQuestion(it, opts.games))); }
    if (i >= qs.length) return finish();
    answered = false;
    const q = qs[i], card = $q('qCard');
    $q('qFeed').innerHTML = ''; $q('qNext').style.visibility = 'hidden';
    opts.face && opts.face('idle');
    let h = `<div class="qhow"><b>${GAMES[q.game].name}.</b> ${GAMES[q.game].how}</div>`;
    if (q.game === 'gap') {
      h += `<div class="sent">${esc(q.s).replace('___', '<span class="blank">______</span>')}</div>`;
      if (q.hint) h += `<div class="hint">(${esc(q.hint)})</div>`;
      h += `<div class="opts">${q.options.map((o, k) => `<button class="opt" data-k="${k}"><kbd>${k + 1}</kbd> ${esc(o)}</button>`).join('')}</div>`;
    } else if (q.game === 'pen') {
      h += `<div class="sent pen">${q.tokens.map((t, k) => `<span class="tok" data-k="${k}">${esc(t.w)}</span>`).join(' ')}</div>`;
      if (q.hint) h += `<div class="hint">(${esc(q.hint)})</div>`;
    } else {
      h += `<div class="form"><div class="formhead">PEDANTICO FORM 27B · SENTENCE FOR INSPECTION</div><div class="sent typed">${esc(q.show)}</div></div>`;
      if (q.hint) h += `<div class="hint">(${esc(q.hint)})</div>`;
      h += `<div class="stamps"><button class="stampbtn ok" data-v="1"><kbd>A</kbd> APPROVED</button><button class="stampbtn no" data-v="0"><kbd>R</kbd> REJECTED</button></div>`;
    }
    card.innerHTML = h; card.className = 'qcard g-' + q.game;
    card.querySelectorAll('.opt').forEach(b => b.onclick = () => answer(q.options[+b.dataset.k] === q.item.a, b));
    card.querySelectorAll('.tok').forEach(b => b.onclick = () => answer(q.tokens[+b.dataset.k].target, b));
    card.querySelectorAll('.stampbtn').forEach(b => b.onclick = () => answer((b.dataset.v === '1') === q.ok, b));
    stats();
  }
  function correctSentence(q) {
    if (q.item.kind === 'verdict') return '';
    return `<div class="fixed">${fill(q.s, q.item.a, 'good')}</div>`;
  }
  function answer(right, btn) {
    if (answered || ended) return;
    answered = true; asked++;
    const q = qs[i], card = $q('qCard');
    // mark up the card
    if (q.game === 'gap') card.querySelectorAll('.opt').forEach(b => { const o = q.options[+b.dataset.k]; b.disabled = true; if (o === q.item.a) b.classList.add('right'); else if (b === btn) b.classList.add('wrong'); });
    if (q.game === 'pen') {
      card.querySelectorAll('.tok').forEach(b => { const t = q.tokens[+b.dataset.k]; if (t.target) { b.classList.add('struck'); b.innerHTML = `<s>${esc(t.core)}</s><span class="redfix">${esc(q.item.a)}</span>${esc(t.tail)}`; } else if (b === btn) b.classList.add('miss'); b.onclick = null; });
    }
    if (q.game === 'desk') {
      card.querySelectorAll('.stampbtn').forEach(b => b.disabled = true);
      const f = card.querySelector('.form'), st = document.createElement('div');
      const said = btn.dataset.v === '1';
      st.className = 'inkstamp ' + (said ? 'ok' : 'no'); st.textContent = said ? 'APPROVED' : 'REJECTED'; f.appendChild(st);
      sfx.stamp();
    }
    if (right) { score++; streak++; sfx.right(); } else { streak = 0; missed.push(q.item); sfx.wrong(); }
    const line = right ? (streak === 3 ? STREAK[0] : streak === 5 ? STREAK[1] : streak > 6 && streak % 4 === 0 ? STREAK[2] : pick(RIGHT)) : pick(WRONG);
    opts.face && opts.face(right ? (Math.random() < 0.5 ? 'happy' : 'smug') : 'appalled');
    opts.voice && opts.voice(line);
    let verdictLine = '';
    if (q.game === 'desk') verdictLine = `<div class="truth">This sentence is <b>${q.ok ? 'correct' : 'wrong'}</b>.</div>`;
    $q('qFeed').innerHTML = `<div class="quip ${right ? 'r' : 'w'}">${esc(line)}</div>${verdictLine}${q.ok === true ? '' : correctSentence(q)}<div class="why">${esc(q.item.why)}</div>`;
    stats();
    if (opts.timed) { setTimeout(next, right ? 900 : 2600); }
    else { $q('qNext').style.visibility = 'visible'; $q('qNext').focus({ preventScroll: true }); }
  }
  function next() { if (ended) return; i++; show(); }
  function finish() {
    if (ended) return; ended = true;
    clearInterval(timer); clearInterval(faceLoop); removeEventListener('keydown', onKey);
    opts.onDone({ score, total: opts.timed ? asked : qs.length, missed });
  }
  function onKey(e) {
    if (ended) return;
    const q = qs[i]; if (!q) return;
    if (!answered) {
      if (q.game === 'gap' && /^Digit[1-4]$/.test(e.code)) { const b = el.querySelector(`.opt[data-k="${+e.code.slice(5) - 1}"]`); if (b) b.click(); }
      if (q.game === 'desk' && (e.code === 'KeyA' || e.code === 'ArrowLeft')) el.querySelector('.stampbtn.ok').click();
      if (q.game === 'desk' && (e.code === 'KeyR' || e.code === 'ArrowRight')) el.querySelector('.stampbtn.no').click();
    } else if (!opts.timed && (e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); next(); }
  }
  addEventListener('keydown', onKey);
  $q('qNext').onclick = next;
  $q('qQuit').onclick = () => { if (ended) return; ended = true; clearInterval(timer); clearInterval(faceLoop); removeEventListener('keydown', onKey); opts.onQuit ? opts.onQuit() : opts.onDone({ score, total: asked, missed, quit: true }); };
  if (opts.timed) {
    let last = performance.now(), lastSec = Math.ceil(timeLeft);
    timer = setInterval(() => {
      const now = performance.now(); timeLeft -= (now - last) / 1000; last = now;
      const sec = Math.ceil(timeLeft); if (sec !== lastSec) { lastSec = sec; if (sec <= 5 && sec > 0) sfx.tick(); }
      stats(); if (timeLeft <= 0) finish();
    }, 250);
  }
  show();
}
