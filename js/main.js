// ════════════════════════════════════════════════════════════════
// PEDANTRY, THE GAME
// Start-up, the title screen, the 3D Institute loop, dialogue, tests,
// quick play and the certificate.
// ════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { DEPTS, rankFor } from './bank.js';
import { $, store, pick, esc } from './util.js';
import { sfx, hum, speak, hush, sound, setSound, setVoices, unlockAudio } from './audio.js';
import { GAMES, runSession, drawItems } from './games.js';
import { buildWorld, HALL } from './world.js';
import { makePlayer } from './player.js';
import { loadPhotos } from './textures.js';
import { paintPedant } from './characters.js';

const byId = Object.fromEntries(DEPTS.map(d => [d.id, d]));

// ── settings (remembered on each computer) ──
const S = {
  depts: new Set(store.get('depts', DEPTS.map(d => d.id)).filter(id => byId[id])),
  games: new Set(store.get('games', Object.keys(GAMES)).filter(g => GAMES[g])),
  perTest: store.get('perTest', 8),
  quality: store.get('quality', 'school'),
};
if (!['school', 'low', 'high'].includes(S.quality)) S.quality = 'school';
const save = () => { store.set('depts', [...S.depts]); store.set('games', [...S.games]); store.set('perTest', S.perTest); store.set('quality', S.quality); };

// ── screens ──
const SCREENS = ['sTitle', 'sIntro', 'sRules', 'sQuiz', 'sResult', 'sPause', 'sEnd'];
function screen(id) { SCREENS.forEach(s => $(s).classList.toggle('on', s === id)); }
let mode = 'title';

// ════════════ TITLE SCREEN ════════════
function buildTitle() {
  $('deptTicks').innerHTML = DEPTS.map(d => `<label class="tick"><input type="checkbox" data-d="${d.id}" ${S.depts.has(d.id) ? 'checked' : ''}><span class="box"></span><span>${esc(d.name)}<span class="ch">${esc(d.topics)} · ${d.items.length} sentences</span></span></label>`).join('');
  $('gameTicks').innerHTML = Object.entries(GAMES).map(([k, g]) => `<label class="tick"><input type="checkbox" data-g="${k}" ${S.games.has(k) ? 'checked' : ''}><span class="box"></span><span>${g.name}<span class="ch">${g.how}</span></span></label>`).join('');
  $('perTest').innerHTML = [6, 8, 10, 12].map(n => `<button class="btn small ${S.perTest === n ? 'on' : ''}" data-n="${n}">${n}</button>`).join('');
  $('deptTicks').querySelectorAll('input').forEach(i => i.onchange = () => { i.checked ? S.depts.add(i.dataset.d) : S.depts.delete(i.dataset.d); save(); status(); });
  $('gameTicks').querySelectorAll('input').forEach(i => i.onchange = () => { i.checked ? S.games.add(i.dataset.g) : S.games.delete(i.dataset.g); save(); status(); });
  $('perTest').querySelectorAll('button').forEach(b => b.onclick = () => { S.perTest = +b.dataset.n; save(); buildTitle(); });
  $('gfx').querySelectorAll('button').forEach(b => { b.classList.toggle('on', b.dataset.q === S.quality); b.onclick = () => { S.quality = b.dataset.q; save(); buildTitle(); }; });
  $('allDepts').onclick = () => { DEPTS.forEach(d => S.depts.add(d.id)); save(); buildTitle(); };
  $('noDepts').onclick = () => { S.depts.clear(); save(); buildTitle(); };
  $('soundTick').checked = sound.on; $('soundTick').onchange = e => setSound(e.target.checked);
  $('voiceTick').checked = sound.voices; $('voiceTick').onchange = e => setVoices(e.target.checked);
  status();
}
function status() {
  const n = DEPTS.filter(d => S.depts.has(d.id)).reduce((a, d) => a + d.items.length, 0);
  let msg = `${S.depts.size} of ${DEPTS.length} departments open · ${n} sentences in play`;
  if (!S.depts.size) msg = 'Tick at least one department.';
  else if (!S.games.size) msg = 'Tick at least one game.';
  $('setupStatus').textContent = msg;
  const ok = S.depts.size && S.games.size;
  $('enterBtn').disabled = !ok; document.querySelectorAll('[data-quick]').forEach(b => b.disabled = !ok);
}

// ════════════ 3D SET-UP (only built when someone enters the Institute) ════════════
let renderer = null, scene, camera, composer = null, world = null, P = null, builtQuality = null;
function initGL() {
  if (renderer && builtQuality === S.quality) return true;
  if (renderer) { teardownGL(); }
  try { renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: S.quality !== 'school', powerPreference: 'high-performance' }); }
  catch (e) { renderer = null; $('noGL').style.display = 'block'; return false; }
  builtQuality = S.quality;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x07100f);
  scene.fog = new THREE.FogExp2(0x0b1716, 0.018);
  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 200);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  world = buildWorld(scene, DEPTS, S.quality);
  P = makePlayer(camera, $('gl'));
  resize();
  return true;
}
function teardownGL() {
  try { renderer.dispose(); renderer.forceContextLoss(); } catch (e) {}
  renderer = null; composer = null; world = null;
  const old = $('gl'), c = old.cloneNode(false); old.replaceWith(c); bindCanvas();
}
function resize() {
  if (!renderer) return;
  const hi = S.quality === 'high';
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, hi ? 1.75 : 1) * (S.quality === 'school' ? 0.8 : 1));
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  if (composer) composer.dispose();
  composer = null;
  if (S.quality !== 'school') {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), hi ? 0.55 : 0.4, 0.5, 0.82));
    composer.addPass(new OutputPass());
    composer.setPixelRatio(renderer.getPixelRatio());
  }
}
addEventListener('resize', resize);

// ════════════ GAME STATE FOR ONE VISIT ════════════
let G = null;
function newVisit() {
  G = { certified: new Set(), right: 0, asked: 0, missed: {}, recent: {}, liftOpen: false, paNext: 18, t: 0, near: null };
  DEPTS.forEach(d => { G.missed[d.id] = []; G.recent[d.id] = new Set(); world.setCertified(d.id, false); });
  world.closeLift();
  P.x = world.spawn.x; P.z = world.spawn.z; P.yaw = world.spawn.yaw; P.pitch = 0;
  updateForms();
}
function updateForms() {
  $('forms').innerHTML = `<div class="fh">YOUR FORM</div>` + DEPTS.map(d => `<div class="f ${G.certified.has(d.id) ? 'done' : ''} ${S.depts.has(d.id) ? '' : 'off'}"><i></i>${esc(d.name)}</div>`).join('');
}

async function enterInstitute() {
  unlockAudio();
  $('loading').classList.add('on');
  await new Promise(r => setTimeout(r, 30));
  await loadPhotos();
  if (!initGL()) { $('loading').classList.remove('on'); return; }
  await world.ready();
  newVisit();
  // a few frames so the shaders compile behind the loading screen
  for (let i = 0; i < 3; i++) { P.update(0.016, world.colliders); world.update(0.016, i, P); draw(); await new Promise(r => requestAnimationFrame(r)); }
  $('loading').classList.remove('on');
  const open = DEPTS.filter(d => S.depts.has(d.id));
  $('introDepts').textContent = open.length === DEPTS.length
    ? 'There are seven departments. You must satisfy all of them.'
    : `Today ${open.length} department${open.length === 1 ? ' is' : 's are'} open: ${open.map(d => d.name).join(', ')}. You must satisfy ${open.length === 1 ? 'it' : 'all of them'}.`;
  screen('sIntro'); mode = 'intro';
}
function beginPlay() {
  screen(null); mode = 'play';
  $('hud').classList.add('on'); $('touch').classList.toggle('on', P.touch);
  P.enabled = true; P.lock(); hum(true);
  setTimeout(() => pa('Welcome to the Pedantico Institute. Please keep your hands, feet and apostrophes inside the building at all times.'), 1200);
}
function toPlay() {
  screen(null); mode = 'play'; $('dlg').classList.remove('on'); hush();
  $('hud').classList.add('on'); P.enabled = true; P.lock();
}

// ════════════ DR PEDANT'S ANNOUNCEMENTS ════════════
const PA = [
  'Attention: the canteen is serving fewer chips today. Not "less chips". Anyone who says "less chips" will receive no chips.',
  'Reminder: the word "alot" does not exist. Anyone found using it will be gently laughed at.',
  'Lost property: one apostrophe, found in the word "banana\'s". Please collect it and put it somewhere useful.',
  'Today\'s motivational thought: you are probably wrong.',
  'Would the person who wrote "could of" on the bathroom wall please report to Grammar Crimes. Bring a rubber.',
  'The lifts are working. The staff are working. You, however, are not.',
  'Fun fact: I once corrected a fortune cookie. It has not told my fortune since.',
  'Attention: someone has said "irregardless" in the east wing. Medical staff are on their way.',
  'Please stop asking the vending machine for "snack\'s". It is getting upset.',
  'A reminder that "literally" means literally. Nobody in this building has literally died of boredom. Yet.',
  'Young person, I can see you. Stand up straight. Elbows off the table. Speak properly.',
  'Staff announcement: Colonel Grumbleton has once again tried to ban the word "And". Please ignore him. And smile.',
  'If you can hear this announcement, well done. If you cannot hear this announcement, please let us know.',
  'Your tour of the Institute is being recorded for training purposes. Mostly for training other people what not to do.',
];
let paTimer = null;
function pa(text) {
  $('paTxt').textContent = text; $('pa').classList.add('on'); sfx.dingdong();
  clearTimeout(paTimer); paTimer = setTimeout(() => $('pa').classList.remove('on'), 8500);
}
let toastTimer = null;
function toast(text, secs = 4) { $('toast').textContent = text; $('toast').classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('on'), secs * 1000); }

// ════════════ DIALOGUE ════════════
let D = null;
function dialogue(who, lines, options, bot) {
  mode = 'dialogue'; P.enabled = false; P.unlock();
  D = { who, lines, options, bot, i: 0, shown: 0, full: false };
  $('dlg').classList.add('on'); $('prompt').classList.remove('on');
  showLine();
}
function showLine() {
  const line = D.lines[D.i];
  $('dlgWho').innerHTML = `${esc(D.who.name)}<span>${esc(D.who.title || '')}</span>`;
  D.shown = 0; D.full = false; D.text = line;
  $('dlgOpts').innerHTML = '';
  if (D.bot) { D.bot.talk(Math.min(4, 0.6 + line.length * 0.03)); sfx.babble(line, D.bot.voice); speak(line, D.bot.pitch); }
}
function finishLine() {
  D.full = true; $('dlgTxt').textContent = D.text;
  if (D.i < D.lines.length - 1) $('dlgOpts').innerHTML = `<span class="more">${P && P.touch ? 'Tap USE' : 'Press E or click'} to carry on ▶</span>`;
  else $('dlgOpts').innerHTML = D.options.map((o, k) => `<button class="btn" data-k="${k}"><kbd>${k + 1}</kbd> ${esc(o.label)}</button>`).join('');
  $('dlgOpts').querySelectorAll('button').forEach(b => b.onclick = e => { e.stopPropagation(); choose(+b.dataset.k); });
}
function advance() {
  if (!D) return;
  if (!D.full) return finishLine();
  if (D.i < D.lines.length - 1) { D.i++; showLine(); }
}
function choose(k) { const o = D && D.options[k]; if (!o) return; sfx.click(); const d = D; D = null; $('dlg').classList.remove('on'); o.fn(d); }
$('dlg').addEventListener('click', () => advance());
function drawDialogueFace() {
  if (!D || !D.bot) return;
  $('dlgFace').getContext('2d').drawImage(D.bot.faceCanvas, 0, 0);
}

// ════════════ INTERACTIONS ════════════
const QUIPS = {
  exit: [
    'Locked. A sign reads: "Candidates may leave once they are correct. Expected wait: years."',
    'You rattle the handle. Somewhere, Dr Pedant sighs into a microphone.',
    'The door does not open. It has a note on it: "Their is no way out." Someone has corrected it in red pen.',
  ],
  vend: [
    'You press CRISPS. The machine gives you a leaflet called "Crisps: Countable". You are still hungry.',
    'You press SNACK\'S. The machine shouts "NO" and switches itself off and on again.',
    'It takes your coin and gives you fewer toffees than advertised. At least it said "fewer".',
    'You press FUDGE. A tiny voice inside says "Your welcome." The machine is reported to Grammar Crimes.',
  ],
  water: [
    'You drink some water. Uncountable, refreshing, and never to be called "less waters".',
    'The cooler gurgles. You take one cup. Fewer cups, less mess.',
    'A sign on the cooler reads: "Please take one cup. Not one cup\'s."',
  ],
  plant: [
    'The fern says nothing. It is the best listener in the building.',
    'You tell the plant your grammar worries. It photosynthesises supportively.',
    'A label on the pot says "Please don\'t water. Its fine." Someone has added an apostrophe in red pen.',
  ],
  statue: [
    'DR P. PEDANT. Founder. Corrector. Right. Underneath, in smaller letters: "He once sent back a birthday card for a missing comma."',
    'The plaque says: "He never said \'could of\'. Not once. Not even as a baby."',
    'The giant red pen has been polished so often you can see your own mistakes in it.',
  ],
};
function interactNearest() {
  const it = G.near; if (!it) return;
  if (it.kind === 'robot') return talkTo(it.dept);
  if (it.kind === 'lift') return useLift();
  if (it.kind === 'host') return talkToHost();
  toast(pick(QUIPS[it.kind] || ['Nothing happens. How very disappointing.']), 6);
}
function talkTo(id) {
  const d = byId[id], bot = world.robots[id];
  if (!S.depts.has(id)) {
    return dialogue(d.robot, ['My department is closed today. The teacher has decided you are not ready for me. Wise.'], [{ label: 'Goodbye', fn: toPlay }], bot);
  }
  const opts = [
    { label: G.certified.has(id) ? 'Take the test again' : 'Take the test', fn: () => startTest(id) },
    { label: 'Remind me of the rules', fn: () => showRules(id, () => talkTo(id)) },
    { label: 'Goodbye', fn: toPlay },
  ];
  const lines = G.certified.has(id)
    ? [pick(['You again? You already have my stamp. Go and bother someone else.', 'Back for more? Fine. I suppose you could try to beat your score.', 'You have my stamp. Do not wear it out.'])]
    : (G.missed[id].length ? ['Back again. I remember your mistakes. I remember all of them.'] : d.intro);
  dialogue(d.robot, lines, opts, bot);
}
const HOST_TIPS = [
  'A tip, if I may. When there are two people in a sentence, take the other one out. "Harry and I went" becomes "I went". Splendid. "Harry and me went" becomes "me went". Dreadful.',
  'If you can count it, it is fewer. If you cannot, it is less. Fewer biscuits. Less tea. Never less biscuits. Not in this house.',
  'An apostrophe is not a decoration, young person. It shows a missing letter or an owner. Never a plain plural. Apples. Not apple\'s.',
  'It is could HAVE, should HAVE, would HAVE. "Could of" is what lazy mouths say. We do not have lazy mouths here.',
  'Colonel Grumbleton will tell you never to start a sentence with "And". Ignore him. And smile politely.',
  'If you are stuck, ask the staff to remind you of the rules. They will sigh, but they will tell you.',
];
function talkToHost() {
  const bot = world.robots.host, who = { name: 'Pembleton', title: 'Head Butler' };
  const first = !G.metHost; G.metHost = true;
  const lines = first ? [
    'Ah. You must be the young person who said "less biscuits". Pembleton, head butler. Welcome to the Pedantico Institute.',
    'Each door along this hall leads to a department. Each department is run by a member of staff. Each member of staff has a test.',
    'Pass a test and they will stamp your form. When every lamp above the lift at the far end is green, you may go home. Speaking properly, one hopes.',
    'Do mind your manners. And your apostrophes.',
  ] : [pick(['Still here? Splendid. The lift is at the end of the hall, as it has always been.', 'You again. Do try to keep up.', 'Yes? Make it quick. And make it grammatical.'])];
  dialogue(who, lines, [
    { label: 'Any advice?', fn: () => dialogue(who, [pick(HOST_TIPS)], [{ label: 'Thank you, Pembleton', fn: toPlay }], bot) },
    { label: 'Goodbye', fn: toPlay },
  ], bot);
}
function useLift() {
  const need = DEPTS.filter(d => S.depts.has(d.id) && !G.certified.has(d.id));
  if (need.length) {
    sfx.denied();
    pa(need.length === 1 ? `Going somewhere? The ${need[0].name} has not approved you yet.` : `Going somewhere? ${need.length} departments have not approved you yet. The lamps above the lift are red for a reason.`);
    return;
  }
  if (!G.liftOpen) { G.liftOpen = true; world.openLift(); sfx.lift(); pa('Very well. The lift is open. Step inside. Try not to say anything incorrect on the way up.'); }
}

// ════════════ RULE CARDS ════════════
function showRules(id, back) {
  const d = byId[id];
  mode = 'rules'; P && (P.enabled = false); P && P.unlock();
  $('rulesBody').innerHTML = `<div class="memo">RULE CARD · ${esc(d.name.toUpperCase())}</div><h2>${esc(d.short)}</h2><ul>${d.rule.map(r => `<li>${r}</li>`).join('')}</ul><button class="btn big" id="rulesBack">Back</button>`;
  screen('sRules');
  $('rulesBack').onclick = () => { screen(null); back(); };
}

// ════════════ TESTS IN THE INSTITUTE ════════════
function startTest(id) {
  const d = byId[id], bot = world.robots[id];
  mode = 'quiz'; P.enabled = false; P.unlock(); $('hud').classList.remove('on'); $('dlg').classList.remove('on'); D = null; hush();
  const games = d.verdictOnly ? ['desk'] : [...S.games];
  const items = drawItems(d.items, S.perTest, G.missed[id], G.recent[id]);
  items.forEach(it => G.recent[id].add(it));
  if (G.recent[id].size > d.items.length * 0.75) G.recent[id].clear();
  screen('sQuiz');
  runSession({
    el: $('quiz'), title: `${d.name}: the test`, items, games, portrait: bot.faceCanvas,
    face: e => bot.setExpr(e, 3), voice: t => { bot.talk(1.6); sfx.babble(t, bot.voice); speak(t, bot.pitch); },
    onDone: r => testDone(d, r),
    onQuit: () => { screen(null); talkTo(id); },
  });
}
function missList(missed) {
  if (!missed.length) return '';
  return `<p><b>Mistakes to learn from:</b></p><div class="misslist">${missed.map(it => it.kind === 'verdict'
    ? `<div>${esc(it.s)} <b>${it.ok ? 'Correct.' : 'Wrong.'}</b><br><i>${esc(it.why)}</i></div>`
    : `<div>${esc(it.s).replace('___', `<span class="good">${esc(it.a)}</span>`)}<br><i>${esc(it.why)}</i></div>`).join('')}</div>`;
}
function testDone(d, r) {
  const bot = world.robots[d.id];
  G.right += r.score; G.asked += r.total; G.missed[d.id] = r.missed;
  const pct = r.total ? r.score / r.total : 0, pass = pct >= 0.75;
  const first = pass && !G.certified.has(d.id);
  if (pass) { G.certified.add(d.id); world.setCertified(d.id, true); updateForms(); }
  bot.setExpr(pass ? 'happy' : 'appalled', 6);
  const line = pass ? d.pass : d.fail;
  bot.talk(2.5); sfx.babble(line, bot.voice); speak(line, bot.pitch);
  setTimeout(() => (pass ? sfx.fanfare() : sfx.wrong()), 250);
  mode = 'result';
  $('resultBody').innerHTML = `
    <div class="bigstamp ${pass ? 'ok' : 'no'}">${pass ? 'APPROVED' : 'REJECTED'}</div>
    <div class="memo">${esc(d.name.toUpperCase())} · TEST RESULT</div>
    <div class="result-big">${r.score} / ${r.total}</div>
    <p><b>${esc(d.robot.name)}:</b> "${esc(line)}"</p>
    <p>${pass ? (first ? 'The lamp over the door has turned green.' : 'Your stamp is safe.') : 'You need three quarters right to pass. Read the rule card, then try again. The questions you missed will come back.'}</p>
    ${missList(r.missed)}
    <div class="row-c" style="justify-content:flex-start">
      ${pass ? '' : '<button class="btn big gold" id="rAgain">Try again</button><button class="btn big" id="rRules">Read the rule card</button>'}
      <button class="btn big ${pass ? 'gold' : ''}" id="rBack">Back to the Institute</button>
    </div>`;
  screen('sResult');
  $('rBack').onclick = () => { toPlay(); if (first) afterCertify(); };
  if (!pass) { $('rAgain').onclick = () => startTest(d.id); $('rRules').onclick = () => showRules(d.id, () => { screen('sResult'); mode = 'result'; }); }
}
function afterCertify() {
  const need = DEPTS.filter(d => S.depts.has(d.id) && !G.certified.has(d.id));
  if (!need.length) setTimeout(() => pa('Well. Every department has approved you. I am as shocked as anyone. The lift at the end of the hall will now let you in.'), 800);
  else setTimeout(() => pa(pick([
    `A department has approved you. ${need.length} to go. Do not get excited.`,
    `Another stamp. ${need.length} departments left. I have lowered my expectations accordingly.`,
    `Noted. ${need.length} more to go. The staff have been warned.`,
  ])), 800);
}

// ════════════ THE ENDING ════════════
function ending() {
  mode = 'end'; P.enabled = false; P.unlock(); hum(false); hush();
  $('hud').classList.remove('on'); $('touch').classList.remove('on');
  sfx.fanfare();
  $('certName').value = store.get('name', '');
  renderCert();
  screen('sEnd');
}
function renderCert() {
  const name = $('certName').value.trim() || 'Young Person 4471';
  const done = DEPTS.filter(d => G && G.certified.has(d.id));
  const pct = G && G.asked ? Math.round(100 * G.right / G.asked) : 0;
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  $('cert').innerHTML = `
    <div class="ch1">THE PEDANTICO INSTITUTE</div>
    <div class="ch2">Certificate of Insufferable Correctness</div>
    <div>This is to certify that</div>
    <div class="cname">${esc(name)}</div>
    <div>has been inspected by every member of staff and found, against all expectations, to be correct in:</div>
    <div class="cdepts">${done.map(d => esc(d.name)).join(' · ')}</div>
    <div class="crank">Rank: ${esc(rankFor(pct))}</div>
    <div>${G ? `${G.right} right out of ${G.asked} (${pct}%)` : ''}</div>
    <div class="csig"><div><span class="sig">P. Pedant</span><br>Dr P. Pedant, Founder</div><div><span class="sig">${esc(date)}</span><br>Date</div></div>
    <div class="seal">OFFICIALLY<br>RIGHT</div>`;
}
$('certName').oninput = () => { store.set('name', $('certName').value); renderCert(); };
$('printBtn').onclick = () => print();
$('titleBtn').onclick = toTitle;

// ════════════ QUICK PLAY (no 3D needed) ════════════
const hostCanvas = document.createElement('canvas'); hostCanvas.width = 256; hostCanvas.height = 192;
let hostExpr = 'idle', hostUntil = 0;
setInterval(() => { const now = performance.now() / 1000; if (now > hostUntil) hostExpr = 'idle'; if (mode === 'quick') paintPedant(hostCanvas, hostExpr, now); }, 100);
let lastQuick = 'gap';
function quickPlay(kind) {
  unlockAudio(); lastQuick = kind;
  const open = DEPTS.filter(d => S.depts.has(d.id));
  let games = kind === 'mix' ? [...S.games] : [kind];
  if (!games.length) games = ['gap'];
  const pool = open.flatMap(d => d.items).filter(it => it.kind === 'gap' || games.includes('desk'));
  if (!pool.length) { $('setupStatus').textContent = 'The False Rules hall only works with the Rejection Desk. Tick another department.'; return; }
  const timed = kind === 'desk' ? 60 : 0;
  const n = kind === 'pen' ? 15 : 20;
  const recent = new Set();
  const take = k => { const its = drawItems(pool, k, [], recent); its.forEach(i => recent.add(i)); if (recent.size > pool.length * 0.8) recent.clear(); return its; };
  mode = 'quick'; screen('sQuiz');
  runSession({
    el: $('quiz'), title: kind === 'mix' ? 'Mixed bag' : GAMES[kind].name + (timed ? ': 60 seconds' : ''), items: take(timed ? 30 : n), games, timed, refill: () => take(20),
    portrait: hostCanvas, face: e => { hostExpr = e; hostUntil = performance.now() / 1000 + 2.5; }, voice: t => speak(t, 0.8),
    onDone: r => quickDone(kind, r),
    onQuit: toTitle,
  });
}
function quickDone(kind, r) {
  const pct = r.total ? Math.round(100 * r.score / r.total) : 0;
  const best = store.get('best.' + kind, 0), isBest = r.score > best;
  if (isBest) store.set('best.' + kind, r.score);
  mode = 'result'; sfx.fanfare();
  const verdict = pct >= 90 ? 'Infuriatingly good. I may have to retire.' : pct >= 75 ? 'Respectable. I shall tell nobody.' : pct >= 50 ? 'Mediocre. Like a soggy biscuit. Fewer soggy biscuits next time, please.' : 'Dreadful. Truly. I will need a lie-down. Not a lay-down. A lie-down.';
  $('resultBody').innerHTML = `
    <div class="memo">QUICK PLAY · ${esc(kind === 'mix' ? 'MIXED BAG' : GAMES[kind].name.toUpperCase())}</div>
    <div class="result-big">${r.score} / ${r.total}</div>
    <div class="rank">${esc(rankFor(pct))}</div>
    <p><b>Dr Pedant:</b> "${esc(verdict)}"</p>
    <p>${isBest ? 'A new best score on this computer.' : `Best on this computer: ${best}.`}</p>
    ${missList(r.missed)}
    <div class="row-c" style="justify-content:flex-start"><button class="btn big gold" id="qAgain">Play again</button><button class="btn big" id="qTitle">Title screen</button></div>`;
  screen('sResult');
  $('qAgain').onclick = () => quickPlay(lastQuick);
  $('qTitle').onclick = toTitle;
}

function toTitle() {
  mode = 'title'; hush(); hum(false);
  if (P) { P.enabled = false; P.unlock(); }
  $('hud').classList.remove('on'); $('touch').classList.remove('on'); $('dlg').classList.remove('on');
  screen('sTitle'); buildTitle();
}

// ════════════ INPUT ════════════
addEventListener('keydown', e => {
  if (mode === 'play' && e.code === 'KeyE') interactNearest();
  else if (mode === 'dialogue') {
    if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); advance(); }
    if (/^Digit[1-4]$/.test(e.code) && D && D.full && D.i === D.lines.length - 1) choose(+e.code.slice(5) - 1);
    if (e.code === 'Escape') { D = null; toPlay(); }
  }
  else if (mode === 'intro' && e.code === 'Enter') beginPlay();
});
function bindCanvas() {
  $('gl').addEventListener('click', () => {
    if (mode !== 'play') return;
    if (!P.touch && !P.locked()) { P.lock(); return; }
    interactNearest();
  });
}
bindCanvas();
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && mode === 'play' && !P.touch) pause();
});
function pause() {
  mode = 'pause'; P.enabled = false; hush();
  $('pauseInfo').textContent = `Departments approved: ${[...G.certified].filter(id => S.depts.has(id)).length} of ${S.depts.size}. Answers right: ${G.right} of ${G.asked}.`;
  screen('sPause');
}
$('resumeBtn').onclick = toPlay;
$('quitBtn').onclick = toTitle;
$('tPause').onclick = () => { if (mode === 'play') pause(); };
$('tUse').onclick = () => { if (mode === 'play') interactNearest(); else if (mode === 'dialogue') advance(); };
$('enterBtn').onclick = enterInstitute;
$('introBtn').onclick = beginPlay;
document.querySelectorAll('[data-quick]').forEach(b => b.onclick = () => quickPlay(b.dataset.quick));

// ════════════ MAIN LOOP ════════════
function draw() { if (composer) composer.render(); else renderer.render(scene, camera); }
let last = performance.now(), frame = 0;
const fwd = new THREE.Vector3();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000); last = now; frame++;
  if (!renderer || !world || mode === 'title' || mode === 'quick' || (mode === 'result' && !G)) return;
  G.t += dt;
  if (mode === 'play') {
    P.update(dt, world.colliders);
    // what is the player looking at?
    camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
    let best = null, bd = 1e9;
    for (const it of world.interact) {
      const dx = it.p.x - P.x, dz = it.p.z - P.z, d = Math.hypot(dx, dz);
      if (d > it.r) continue;
      if ((dx * fwd.x + dz * fwd.z) / (d || 1) < 0.55 && d > 1.2) continue;
      if (d < bd) { bd = d; best = it; }
    }
    G.near = best;
    $('prompt').innerHTML = best ? `${P.touch ? 'USE' : '<kbd>E</kbd>'} ${esc(best.label)}` : '';
    $('prompt').classList.toggle('on', !!best);
    G.paNext -= dt;
    if (G.paNext <= 0) { G.paNext = 55 + Math.random() * 30; pa(pick(PA)); }
    if (G.liftOpen && P.z < HALL.zEnd - 0.9) ending();
  } else P.update(0, world.colliders);
  world.update(dt, G.t, P);
  if (mode === 'dialogue' && D) {
    drawDialogueFace();
    if (!D.full) { D.shown += dt * 55; $('dlgTxt').textContent = D.text.slice(0, Math.floor(D.shown)); if (D.shown >= D.text.length) finishLine(); }
  }
  // behind a full-screen panel, draw the 3D world rarely to save the battery
  const covered = mode === 'quiz' || mode === 'rules' || mode === 'result' || mode === 'end' || mode === 'pause' || mode === 'intro';
  if (!covered || frame % 15 === 0) draw();
}
requestAnimationFrame(loop);

buildTitle();

// Testing hook: open the page with ?debug to reach the game state from the console
if (location.search.includes('debug')) window.PED = { get P() { return P; }, get world() { return world; }, get G() { return G; }, get mode() { return mode; }, talkTo, startTest, quickPlay, ending, beginPlay, useLift };
