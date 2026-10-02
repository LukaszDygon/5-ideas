// Grow Your Own: walk a top-down garden, read a lesson from every object, answer each gate's question.
import { AREAS } from './content.js';
import { PALETTE, SPRITES, TILE, makeSprite, paintTile, playerRows } from './sprites.js';

const COLS = 15;
const ROWS = 11;
const W = COLS * TILE;
const H = ROWS * TILE;
const STEP_MS = 150;
const FADE_MS = 180;
const STORE_KEY = 'gyo-progress-v1';
const WALKABLE = new Set(['.', ':', '*', 'w', 'g', '@', '<']);
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const KEYS = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
};
const GLYPHS = {
  '!': ['010', '010', '010', '000', '010'],
  '?': ['111', '001', '010', '000', '010'],
  i: ['010', '000', '010', '010', '010'],
};
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const LESSONS = AREAS.flatMap((area) => (area.lessons || []).map((lesson) => ({ ...lesson, area })));
const LESSON_BY_ID = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
const GATED = AREAS.filter((a) => a.quiz);

const $ = (id) => document.getElementById(id);
const canvas = $('gyo-canvas');
const ctx = canvas.getContext('2d');

// ---------------------------------------------------------------- map helpers

const cell = (ai, x, y) => (x >= 0 && x < COLS && y >= 0 && y < ROWS ? AREAS[ai].map[y][x] : null);

function find(ai, ch) {
  for (let y = 0; y < ROWS; y++) {
    const x = AREAS[ai].map[y].indexOf(ch);
    if (x >= 0) return { x, y };
  }
  return null;
}

const gateOpen = (ai) => !AREAS[ai].quiz || state.gates.includes(AREAS[ai].id);
const walkable = (ai, x, y) => WALKABLE.has(cell(ai, x, y)) || (cell(ai, x, y) === '>' && gateOpen(ai));
const readIn = (ai) => (AREAS[ai].lessons || []).filter((l) => state.read.includes(l.id)).length;

function thingAt(ai, x, y) {
  const ch = cell(ai, x, y);
  if (/[1-4]/.test(ch)) return { kind: 'lesson', lesson: LESSON_BY_ID[AREAS[ai].lessons[ch - 1].id] };
  if (ch === 'S') return { kind: 'sign' };
  if (ch === '>' && !gateOpen(ai)) return { kind: 'gate' };
  return null;
}

// ---------------------------------------------------------------- state

function fresh() {
  const start = find(0, '@');
  return { area: 0, x: start.x, y: start.y, dir: 'up', read: [], gates: [], finished: false, steps: 0 };
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && AREAS[s.area] && Array.isArray(s.read) && Array.isArray(s.gates) && DIRS[s.dir]) return s;
  } catch {
    // Storage blocked or corrupt: start fresh.
  }
  return null;
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    // Progress just won't survive a reload.
  }
}

let state = load() || fresh();
if (!walkable(state.area, state.x, state.y)) state = fresh();
const walk = { fromX: state.x, fromY: state.y, t: 1 };
const fade = { alpha: 0, phase: null, start: 0, then: null };
let started = false;
let held = [];
let bumpArmed = false;
let clickTarget = null;
let plan = null;
let finishPending = false;
let layer = null;

// ---------------------------------------------------------------- drawing

const cache = new Map();
function sprite(name, rows = SPRITES[name]) {
  if (!cache.has(name)) cache.set(name, { img: makeSprite(rows), shadow: makeSprite(rows, PALETTE.k) });
  return cache.get(name);
}

function drawSprite(c, s, x, y) {
  c.drawImage(s.shadow, x + 1, y + 1);
  c.drawImage(s.img, x, y);
}

const playerSprite = (dir) => sprite(`player-${dir}`, playerRows(dir));

// The static part of an area (tiles and objects) is painted once into an offscreen layer.
function buildLayer() {
  const ai = state.area;
  const area = AREAS[ai];
  layer = document.createElement('canvas');
  layer.width = W;
  layer.height = H;
  const lc = layer.getContext('2d');
  const at = (x, y) => cell(ai, x, y);
  area.map.forEach((row, ty) => [...row].forEach((ch, tx) => paintTile(lc, ch, tx, ty, area, at, gateOpen(ai))));
  area.map.forEach((row, ty) =>
    [...row].forEach((ch, tx) => {
      const name = /[1-4]/.test(ch) ? area.lessons[ch - 1].sprite : ch === 'S' ? 'sign' : null;
      if (name) drawSprite(lc, sprite(name), tx * TILE, ty * TILE);
    }),
  );
}

function resize() {
  const width = canvas.getBoundingClientRect().width || W;
  const scale = Math.max(1, Math.ceil((width * devicePixelRatio) / W));
  if (canvas.width !== W * scale) {
    canvas.width = W * scale;
    canvas.height = H * scale;
  }
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

function drawMarker(tx, ty, glyph, color, bob) {
  const x = tx * TILE + 4;
  const y = ty * TILE - 10 + bob;
  ctx.fillStyle = PALETTE.k;
  ctx.fillRect(x + 1, y + 1, 7, 9);
  ctx.fillRect(x, y, 7, 9);
  ctx.fillRect(x + 2, y + 9, 3, 1);
  ctx.fillRect(x + 3, y + 10, 1, 1);
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, 5, 7);
  ctx.fillStyle = PALETTE.k;
  GLYPHS[glyph].forEach((row, gy) =>
    [...row].forEach((on, gx) => on === '1' && ctx.fillRect(x + 2 + gx, y + 2 + gy, 1, 1)),
  );
}

function drawCheck(tx, ty) {
  const x = tx * TILE + 10;
  const y = ty * TILE - 2;
  ctx.fillStyle = PALETTE.k;
  ctx.fillRect(x, y, 7, 7);
  ctx.fillStyle = PALETTE.l;
  ctx.fillRect(x + 1, y + 1, 5, 5);
  ctx.fillStyle = PALETTE.k;
  for (const [cx, cy] of [[1, 3], [2, 4], [3, 3], [4, 2], [5, 1]]) ctx.fillRect(x + cx, y + cy, 1, 1);
}

function drawBrackets(tx, ty) {
  const x = tx * TILE - 1;
  const y = ty * TILE - 1;
  const s = TILE + 2;
  ctx.fillStyle = PALETTE.y;
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + s, y, -1, 1], [x, y + s, 1, -1], [x + s, y + s, -1, -1]]) {
    ctx.fillRect(sx > 0 ? cx : cx - 5, sy > 0 ? cy : cy - 2, 5, 2);
    ctx.fillRect(sx > 0 ? cx : cx - 2, sy > 0 ? cy : cy - 5, 2, 5);
  }
}

function draw(now) {
  const ai = state.area;
  const area = AREAS[ai];
  ctx.drawImage(layer, 0, 0);
  const bob = reduceMotion ? 0 : Math.round(Math.sin(now / 220) * 1.5);
  area.map.forEach((row, ty) =>
    [...row].forEach((_, tx) => {
      const thing = thingAt(ai, tx, ty);
      if (!thing) return;
      if (thing.kind === 'lesson') {
        if (state.read.includes(thing.lesson.id)) drawCheck(tx, ty);
        else drawMarker(tx, ty, '!', PALETTE.y, bob);
      } else if (thing.kind === 'sign') {
        drawMarker(tx, ty, 'i', PALETTE.c, bob);
      } else if (readIn(ai) === area.lessons.length) {
        drawMarker(tx, ty, '?', PALETTE.p, bob);
      }
    }),
  );
  const f = facing();
  if (walk.t === 1 && thingAt(ai, f.x, f.y)) drawBrackets(f.x, f.y);
  const px = (walk.fromX + (state.x - walk.fromX) * walk.t) * TILE;
  const py = (walk.fromY + (state.y - walk.fromY) * walk.t) * TILE;
  const hop = walk.t < 1 && walk.t > 0.25 && walk.t < 0.75 ? -1 : 0;
  drawSprite(ctx, playerSprite(state.dir), Math.round(px), Math.round(py) + hop);
  if (fade.alpha > 0) {
    ctx.globalAlpha = fade.alpha;
    ctx.fillStyle = PALETTE.k;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- movement

function facing() {
  const [dx, dy] = DIRS[state.dir];
  return { x: state.x + dx, y: state.y + dy };
}

function startStep(nx, ny) {
  walk.fromX = state.x;
  walk.fromY = state.y;
  state.x = nx;
  state.y = ny;
  walk.t = 0;
}

function tryStep(dir) {
  state.dir = dir;
  const { x, y } = facing();
  if (walkable(state.area, x, y)) return startStep(x, y);
  if (bumpArmed && thingAt(state.area, x, y)) {
    bumpArmed = false;
    interact(x, y);
  }
}

function arrive() {
  state.steps++;
  const ch = cell(state.area, state.x, state.y);
  if (ch === '>') return travel(state.area + 1, '<');
  if (ch === '<') return travel(state.area - 1, '>');
  save();
}

function travel(ai, entryChar) {
  plan = null;
  clickTarget = null;
  transition(() => {
    const e = find(ai, entryChar);
    const inX = e.x === 0 ? 1 : e.x === COLS - 1 ? COLS - 2 : e.x;
    const inY = e.y === 0 ? 1 : e.y === ROWS - 1 ? ROWS - 2 : e.y;
    state.area = ai;
    state.x = walk.fromX = inX;
    state.y = walk.fromY = inY;
    walk.t = 1;
    state.dir = e.x === 0 ? 'right' : e.x === COLS - 1 ? 'left' : e.y === 0 ? 'down' : 'up';
    if (ai === AREAS.length - 1 && !state.finished) {
      state.finished = true;
      finishPending = true;
    }
    save();
    buildLayer();
    renderPanel();
    showBanner();
    announce(`Entered ${AREAS[ai].name}. ${AREAS[ai].blurb}`);
  });
}

function transition(fn) {
  if (reduceMotion) {
    fn();
    if (finishPending) openEnd();
    return;
  }
  Object.assign(fade, { phase: 'out', start: performance.now(), then: fn });
}

function updateFade(now) {
  if (!fade.phase) return;
  const p = Math.min(1, (now - fade.start) / FADE_MS);
  fade.alpha = fade.phase === 'out' ? p : 1 - p;
  if (p < 1) return;
  if (fade.phase === 'out') {
    fade.then();
    Object.assign(fade, { phase: 'in', start: now });
  } else {
    Object.assign(fade, { phase: null, alpha: 0 });
    if (finishPending) openEnd();
  }
}

// Tap-to-walk: breadth-first search over walkable tiles; exits only count as the destination itself.
function route(ai, target, isGoal) {
  const key = (x, y) => y * COLS + x;
  const prev = new Map([[key(state.x, state.y), null]]);
  const queue = [[state.x, state.y]];
  while (queue.length) {
    const [x, y] = queue.shift();
    if (isGoal(x, y)) {
      const steps = [];
      for (let k = key(x, y); prev.get(k); k = key(prev.get(k)[0], prev.get(k)[1])) steps.unshift(prev.get(k)[2]);
      return steps;
    }
    for (const [dir, [dx, dy]] of Object.entries(DIRS)) {
      const nx = x + dx;
      const ny = y + dy;
      const ch = cell(ai, nx, ny);
      const isExit = ch === '<' || ch === '>';
      if (prev.has(key(nx, ny)) || !walkable(ai, nx, ny) || (isExit && (nx !== target.x || ny !== target.y))) continue;
      prev.set(key(nx, ny), [x, y, dir]);
      queue.push([nx, ny]);
    }
  }
  return null;
}

function planRoute() {
  const target = clickTarget;
  clickTarget = null;
  const ai = state.area;
  const thing = thingAt(ai, target.x, target.y);
  if (!thing && !walkable(ai, target.x, target.y)) return;
  const near = (x, y) => Math.abs(target.x - x) + Math.abs(target.y - y) === 1;
  const steps = route(ai, target, thing ? near : (x, y) => x === target.x && y === target.y);
  if (steps) plan = { steps, interact: thing ? target : null };
}

function followPlan() {
  if (plan.steps.length) {
    state.dir = plan.steps.shift();
    const { x, y } = facing();
    if (walkable(state.area, x, y)) startStep(x, y);
    else plan = null;
    return;
  }
  const t = plan.interact;
  plan = null;
  if (!t) return;
  state.dir = Object.keys(DIRS).find((d) => state.x + DIRS[d][0] === t.x && state.y + DIRS[d][1] === t.y);
  interact(t.x, t.y);
}

const dialogOpen = () => Boolean(document.querySelector('dialog[open]'));

function update(now, dt) {
  updateFade(now);
  if (fade.phase === 'out' || !started || dialogOpen()) return;
  if (walk.t < 1) {
    walk.t = Math.min(1, walk.t + dt / STEP_MS);
    if (walk.t === 1) arrive();
    return;
  }
  if (held.length) {
    plan = null;
    tryStep(held.at(-1));
    return;
  }
  if (clickTarget) planRoute();
  if (plan) followPlan();
}

// ---------------------------------------------------------------- interactions

function interact(x, y) {
  const thing = thingAt(state.area, x, y);
  if (!thing) return;
  if (thing.kind === 'lesson') return openLesson(thing.lesson);
  if (thing.kind === 'sign') return openSign(AREAS[state.area]);
  const area = AREAS[state.area];
  const left = area.lessons.length - readIn(state.area);
  if (left > 0) toast(`The gate is locked. Read ${left} more lesson${left > 1 ? 's' : ''} here first.`);
  else openQuiz(area);
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  node.append(...children.filter((c) => c != null));
  return node;
}

let resumeGame = false;

function openDialog(dialog) {
  held = [];
  plan = null;
  if (!dialogOpen()) resumeGame = document.activeElement === canvas;
  dialog.returnValue = '';
  dialog.showModal();
}

for (const dialog of document.querySelectorAll('.gyo-dialog')) {
  dialog.addEventListener('click', (e) => e.target === dialog && dialog.close());
  dialog.addEventListener('close', () => {
    held = [];
    bumpArmed = false;
    // Hand the keys back to the garden if that's where the player was (chained dialogs open after this).
    queueMicrotask(() => {
      if (resumeGame && !dialogOpen()) canvas.focus({ preventScroll: true });
    });
  });
}

function paintArt(name) {
  const art = $('gyo-lesson-art');
  const actx = art.getContext('2d');
  actx.clearRect(0, 0, art.width, art.height);
  actx.drawImage(sprite(name).img, 0, 0);
}

function fillCard({ art, kicker, title, when, body, list, tip, status }) {
  paintArt(art);
  $('gyo-lesson-kicker').textContent = kicker;
  $('gyo-lesson-title').textContent = title;
  $('gyo-lesson-when').textContent = when || '';
  $('gyo-lesson-when').hidden = !when;
  $('gyo-lesson-body').replaceChildren(...body.map((p) => el('p', {}, p)));
  $('gyo-lesson-list').replaceChildren(...(list || []).flatMap(([term, text]) => [el('dt', {}, term), el('dd', {}, text)]));
  $('gyo-lesson-list').hidden = !list;
  $('gyo-lesson-tip-text').textContent = tip || '';
  $('gyo-lesson-tip').hidden = !tip;
  $('gyo-lesson-status').textContent = status || '';
  $('gyo-lesson-status').hidden = !status;
}

function openLesson(lesson) {
  const isNew = !state.read.includes(lesson.id);
  const ai = AREAS.indexOf(lesson.area);
  let status = 'Already in your codex.';
  if (isNew) {
    state.read.push(lesson.id);
    save();
    renderPanel();
    status = `New! Added to your codex: ${state.read.length} of ${LESSONS.length}.`;
    if (readIn(ai) === lesson.area.lessons.length) status += ' That was the last one here, so the gate question is ready.';
    announce(status);
  }
  const area = lesson.area;
  fillCard({
    ...lesson,
    art: lesson.sprite,
    kicker: `Chapter ${area.chapter} · ${area.kicker} · ${area.name}`,
    status,
  });
  openDialog($('gyo-lesson'));
}

function openSign(area) {
  fillCard({ art: 'sign', kicker: area.name, title: area.sign.title, body: area.sign.body });
  openDialog($('gyo-lesson'));
}

$('gyo-lesson').addEventListener('close', () => {
  if ($('gyo-lesson').returnValue === 'codex') openCodex();
});

let quizArea = null;

function openQuiz(area) {
  quizArea = area;
  const { quiz } = area;
  $('gyo-quiz-kicker').textContent = `Gate question · Chapter ${area.chapter} · ${area.name}`;
  $('gyo-quiz-question').textContent = quiz.question;
  $('gyo-quiz-options').replaceChildren(
    ...quiz.options.map((text, i) =>
      el('button', { type: 'button', class: 'gyo-option', onclick: (e) => answer(i, e.currentTarget) },
        el('span', { class: 'gyo-option-key', 'aria-hidden': 'true' }, 'ABCD'[i]), el('span', {}, text)),
    ),
  );
  const feedback = $('gyo-quiz-feedback');
  feedback.textContent = '';
  feedback.className = 'gyo-feedback';
  $('gyo-quiz-open').hidden = true;
  $('gyo-quiz-later').hidden = false;
  openDialog($('gyo-quiz'));
}

function answer(i, button) {
  const { quiz } = quizArea;
  const feedback = $('gyo-quiz-feedback');
  if (button.getAttribute('aria-disabled') === 'true') return;
  if (i !== quiz.answer) {
    // aria-disabled rather than disabled, so keyboard focus stays on the answer just tried.
    button.classList.add('is-wrong');
    button.setAttribute('aria-disabled', 'true');
    feedback.className = 'gyo-feedback is-wrong';
    feedback.textContent = `Not quite. Hint: ${quiz.hint}`;
    return;
  }
  button.classList.add('is-right');
  for (const b of $('gyo-quiz-options').querySelectorAll('button')) b.disabled = true;
  feedback.className = 'gyo-feedback is-right';
  feedback.textContent = `Correct! ${quiz.explain}`;
  state.gates.push(quizArea.id);
  save();
  buildLayer();
  renderPanel();
  $('gyo-quiz-later').hidden = true;
  $('gyo-quiz-open').hidden = false;
  $('gyo-quiz-open').focus();
}

function renderCodex() {
  $('gyo-codex-count').textContent = `${state.read.length} / ${LESSONS.length} lessons`;
  $('gyo-codex-bar').style.width = `${(state.read.length / LESSONS.length) * 100}%`;
  $('gyo-codex-list').replaceChildren(
    ...AREAS.filter((a) => a.lessons).map((area) =>
      el('section', { class: 'gyo-codex-chapter' },
        el('h3', { class: 'gyo-codex-head' },
          el('span', { class: 'neo-badge' }, `Ch. ${area.chapter} · ${area.kicker}`),
          el('span', {}, area.name),
          el('span', { class: 'gyo-codex-tally' }, `${readIn(AREAS.indexOf(area))}/${area.lessons.length}`)),
        el('ol', { class: 'gyo-codex-entries' },
          ...area.lessons.map((lesson) =>
            state.read.includes(lesson.id)
              ? el('li', {},
                  el('details', {},
                    el('summary', {}, lesson.title, lesson.when ? el('span', { class: 'gyo-when' }, lesson.when) : null),
                    ...lesson.body.map((p) => el('p', {}, p)),
                    lesson.list ? el('dl', { class: 'gyo-list' }, ...lesson.list.flatMap(([t, d]) => [el('dt', {}, t), el('dd', {}, d)])) : null,
                    el('p', { class: 'gyo-codex-tip' }, el('strong', {}, 'Do this: '), lesson.tip)))
              : el('li', { class: 'is-locked' }, `Not found yet. Somewhere in ${area.name}.`),
          )),
      ),
    ),
  );
}

function openCodex() {
  renderCodex();
  openDialog($('gyo-codex'));
}

function openEnd() {
  finishPending = false;
  $('gyo-end-steps').textContent = state.steps;
  openDialog($('gyo-end'));
}

$('gyo-end').addEventListener('close', () => {
  const choice = $('gyo-end').returnValue;
  if (choice === 'codex') openCodex();
  if (choice === 'restart') restart();
});

function restart() {
  state = fresh();
  Object.assign(walk, { fromX: state.x, fromY: state.y, t: 1 });
  plan = null;
  save();
  buildLayer();
  renderPanel();
  showBanner();
  toast('Fresh start. The garden gate is open.');
  if (started) canvas.focus({ preventScroll: true });
}

// ---------------------------------------------------------------- panel, banner, toasts

function gateStatus(ai) {
  const area = AREAS[ai];
  if (!area.quiz) return ai === AREAS.length - 1 ? 'You made it. Every gate is open.' : 'The path east is open.';
  if (gateOpen(ai)) return 'Gate open. The path continues east.';
  const left = area.lessons.length - readIn(ai);
  if (!left) return 'Gate question ready. Walk into the gate to answer it.';
  return `Gate locked. Read ${left} more lesson${left > 1 ? 's' : ''} to unlock its question.`;
}

function renderPanel() {
  const ai = state.area;
  const area = AREAS[ai];
  $('gyo-area-kicker').textContent = area.chapter ? `Chapter ${area.chapter} · ${area.kicker}` : area.kicker;
  $('gyo-area-name').textContent = area.name;
  $('gyo-area-blurb').textContent = area.blurb;
  const list = $('gyo-area-lessons');
  list.hidden = !area.lessons;
  list.replaceChildren(
    ...(area.lessons || []).map((lesson) =>
      state.read.includes(lesson.id)
        ? el('li', { class: 'is-read' },
            el('button', { type: 'button', class: 'gyo-linkish', onclick: () => openLesson(LESSON_BY_ID[lesson.id]) }, lesson.title))
        : el('li', {}, 'Not found yet'),
    ),
  );
  $('gyo-gate-status').textContent = gateStatus(ai);
  $('gyo-gate-status').dataset.state = !area.quiz || gateOpen(ai) ? 'open' : readIn(ai) === area.lessons.length ? 'ready' : 'locked';

  $('gyo-trail').replaceChildren(
    ...AREAS.map((a, i) => {
      const reached = i === 0 || gateOpen(i - 1);
      const done = a.lessons ? readIn(i) === a.lessons.length && gateOpen(i) : reached;
      const cls = [i === ai && 'is-here', reached ? 'is-reached' : 'is-locked', done && 'is-done'].filter(Boolean).join(' ');
      return el('li', { class: cls, 'aria-current': i === ai ? 'location' : null },
        el('span', { class: 'gyo-trail-pip', 'aria-hidden': 'true' }, done ? '✓' : String(i + 1)),
        el('span', {}, reached ? a.name : 'Locked'),
        done ? el('span', { class: 'sr-only' }, '(done)') : null);
    }),
  );

  const read = state.read.length;
  const gates = GATED.filter((a) => state.gates.includes(a.id)).length;
  $('gyo-codex-btn-count').textContent = `${read}/${LESSONS.length}`;
  $('gyo-progress-bar').style.width = `${(read / LESSONS.length) * 100}%`;
  $('gyo-progress-text').textContent = `${read} of ${LESSONS.length} lessons · ${gates} of ${GATED.length} gates`;
  $('gyo-stat-lessons').textContent = `${read}/${LESSONS.length}`;
  $('gyo-stat-gates').textContent = `${gates}/${GATED.length}`;
  $('gyo-start-go').textContent = read || state.area ? `Continue · ${read}/${LESSONS.length} lessons` : 'Start growing';
}

function showBanner() {
  const area = AREAS[state.area];
  const banner = $('gyo-banner');
  $('gyo-banner-kicker').textContent = area.chapter ? `Chapter ${area.chapter} · ${area.kicker}` : area.kicker;
  $('gyo-banner-name').textContent = area.name;
  banner.classList.remove('is-on');
  void banner.offsetWidth;
  banner.classList.add('is-on');
}

let toastTimer = 0;
function toast(message) {
  const t = $('gyo-toast');
  t.textContent = message;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 3200);
  announce(message);
}

function announce(message) {
  $('gyo-live').textContent = message;
}

let promptText = null;
function updatePrompt() {
  const f = facing();
  const thing = started && walk.t === 1 && !fade.phase ? thingAt(state.area, f.x, f.y) : null;
  let text = '';
  if (thing?.kind === 'lesson') text = `Read “${thing.lesson.title}”`;
  else if (thing?.kind === 'sign') text = 'Read the sign';
  else if (thing?.kind === 'gate') text = readIn(state.area) === AREAS[state.area].lessons.length ? 'Answer the gate question' : 'Gate locked';
  if (text === promptText) return;
  promptText = text;
  $('gyo-prompt-text').textContent = text;
  $('gyo-prompt').hidden = !text;
}

// ---------------------------------------------------------------- input

// Single-key controls only work while the garden itself has focus (WCAG 2.1.4).
const gameHasKeys = () => started && !dialogOpen() && document.activeElement === canvas;

addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || !gameHasKeys()) return;
  const dir = KEYS[e.code];
  if (dir) {
    e.preventDefault();
    if (!e.repeat) {
      held = held.filter((d) => d !== dir).concat(dir);
      bumpArmed = true;
    }
    clickTarget = null;
    return;
  }
  if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    if (!e.repeat && walk.t === 1 && !fade.phase) {
      const f = facing();
      interact(f.x, f.y);
    }
  } else if (e.code === 'KeyC') {
    e.preventDefault();
    openCodex();
  }
});

addEventListener('keyup', (e) => {
  const dir = KEYS[e.code];
  if (dir) held = held.filter((d) => d !== dir);
});
addEventListener('blur', () => (held = []));

// `click` rather than `pointerdown`, so a finger scrolling the page over the canvas doesn't start a walk.
canvas.addEventListener('click', (e) => {
  if (!started || dialogOpen()) return;
  canvas.focus({ preventScroll: true });
  const r = canvas.getBoundingClientRect();
  const x = Math.floor(((e.clientX - r.left) / r.width) * COLS);
  const y = Math.floor(((e.clientY - r.top) / r.height) * ROWS);
  held = [];
  if (x === state.x && y === state.y) return;
  clickTarget = { x, y };
});

$('gyo-start-go').addEventListener('click', () => {
  started = true;
  $('gyo-start').hidden = true;
  canvas.tabIndex = 0;
  canvas.focus({ preventScroll: true });
  // Arrow keys drive the game, not the page, so bring the whole stage into view.
  $('gyo-stage').scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  showBanner();
  announce(`${AREAS[state.area].name}. ${AREAS[state.area].blurb}`);
});

$('gyo-codex-btn').addEventListener('click', openCodex);
$('gyo-reset').addEventListener('click', () => {
  if (confirm('Start over? This clears your codex and closes every gate.')) restart();
});

// ---------------------------------------------------------------- boot

buildLayer();
renderPanel();
resize();
new ResizeObserver(resize).observe(canvas);

let last = performance.now();
function frame(now) {
  const dt = Math.min(50, now - last);
  last = now;
  update(now, dt);
  draw(now);
  updatePrompt();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
