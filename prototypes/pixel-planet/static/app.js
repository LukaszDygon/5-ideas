// Pixel Planet Flyover: flight loop, rendering, pop-ups, postcards and the journal.

import { Soundscape } from './audio.js';
import { BIOME_NAMES, CHUNK, World, climateLabel, isWater, B } from './world.js';

const $ = (id) => document.getElementById(id);
const stage = $('pp-stage');
const canvas = $('pp-canvas');
const ctx = canvas.getContext('2d');
const audio = new Soundscape();

const METRES_PER_TILE = 0.8;
const CRAFT_Y = 0.68; // craft position on screen, as a fraction of the height
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MENU_PACE = REDUCED_MOTION ? 0 : 6; // tiles per second behind the start screen
const POP_SECONDS = 9;
const POP_MIN_SECONDS = 3.5; // a card stays at least this long before the next one replaces it
const JOURNAL_KEY = 'pixel-planet:journal:v1';
const PREFS_KEY = 'pixel-planet:prefs:v1';
const JOURNAL_MAX = 60;
const INK = '#1c1b1b';

const CRAFTS = {
  paraglider: {
    name: 'Paraglider', pace: 16, steer: 18, agility: 2.2, sink: 0.012, thermal: 0.11, lift: 0,
    hint: 'Glowing rings are thermals: glide through them to climb',
  },
  balloon: {
    name: 'Hot-air balloon', pace: 8, steer: 6, agility: 0.7, sink: 0.016, thermal: 0.05, lift: 0.11, wind: 4,
    liftLabel: 'Burner', hint: 'Hold Shift or Burner to rise; the wind does the rest',
  },
  bird: {
    name: 'Crane', pace: 24, steer: 28, agility: 4, sink: 0.02, thermal: 0.08, lift: 0.1,
    liftLabel: 'Flap', hint: 'Hold Shift or Flap to climb, let go to glide',
  },
};

// Top-down sprites, one character per pixel. '.' is empty, 'l' is a thin line (no outline).
const PALETTE = {
  A: '#e0457b', B: '#ffd23f', l: '#4a4550', p: '#ff7a1a', P: '#2b4c7e', w: '#f4f1ea', k: INK,
  b: '#d9d4c7', h: '#d12f2f', n: INK, t: '#3a3a3a', y: '#fff3b0', L: '#fff8e6',
};
const PARAGLIDER = [
  '...ABABABABA...',
  '.ABABABABABABA.',
  'AB...........BA',
  'A..l.......l..A',
  '....l.....l....',
  '.....l...l.....',
  '......lpl......',
  '.......P.......',
];
const CRANE_GLIDE = [
  '........h........',
  '........n........',
  '..wwwwwwbwwwwww..',
  'kwwwwwwwbwwwwwwwk',
  'k.......b.......k',
  '........t........',
  '.......t.t.......',
];
const CRANE_FLAP = [
  '........h........',
  '........n........',
  '.....wwwbwww.....',
  '....wwwwbwwww....',
  '...kw...b...wk...',
  '..k.....t.....k..',
  '.......t.t.......',
];
const BALLOON = (() => {
  const R = 6;
  const rows = [];
  for (let y = -R; y <= R; y++) {
    let row = '';
    for (let x = -R; x <= R; x++) {
      const d = Math.hypot(x, y);
      if (d > R + 0.3) row += '.';
      else if (d < 1.2) row += 'y';
      else if (x + y < -R * 0.75 && d > R - 2.4) row += 'L';
      else row += Math.floor(((Math.atan2(y, x) + Math.PI) / (2 * Math.PI)) * 10) % 2 ? 'A' : 'B';
    }
    rows.push(row);
  }
  return rows;
})();

const TAG_COLOURS = {
  settlement: '#fae100', farm: '#fae100', windmill: '#fae100', camp: '#fae100',
  lake: '#00e5ff', whales: '#00e5ff', wreck: '#00e5ff', lighthouse: '#00e5ff', bridge: '#00e5ff', fen: '#00e5ff',
  castle: '#ff1493', monastery: '#ff1493', temple: '#ff1493', stones: '#ff1493',
  peak: '#39ff14', oasis: '#39ff14', hotspring: '#39ff14',
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---------------------------------------------------------------- state
const view = { w: 1, h: 1, S: 4, left: 0, top: 0, offX: 0, offY: 0, popTop: 80, popBottom: 600 };
const state = {
  mode: 'menu',
  paused: false,
  journalOpen: false,
  craftKey: 'paraglider',
  seed: '',
  craft: { x: 0, y: 0, vx: 0, alt: 0.45, bank: 0 },
  camX: 0,
  speedLevel: 5,
  distance: 0,
  time: 0,
  discovered: new Set(),
  popups: [],
  queue: [],
  inThermal: false,
  keys: new Set(),
  drag: null,
  sparkles: [],
  flocks: [],
  nextFlock: 10,
};
let world = null;
let frame = 0;
const chunks = new Map();
let visibleChunks = [];
let thermalMemo = { key: '', list: [] };
let journal = loadJournal();

// ---------------------------------------------------------------- world and chunks
function setSeed(seed) {
  state.seed = seed.trim() || randomSeed();
  world = new World(state.seed);
  chunks.clear();
  thermalMemo = { key: '', list: [] };
  state.discovered.clear();
  clearPopups();
  savePrefs();
}

function getChunk(cx, cy) {
  const key = `${cx},${cy}`;
  let c = chunks.get(key);
  if (!c) {
    const data = world.generateChunk(cx, cy);
    const cv = document.createElement('canvas');
    cv.width = CHUNK;
    cv.height = CHUNK;
    cv.getContext('2d').putImageData(new ImageData(data.pixels, CHUNK, CHUNK), 0, 0);
    c = { ...data, canvas: cv };
    chunks.set(key, c);
  }
  c.used = frame;
  return c;
}

/** Builds one chunk ahead of the view per frame so new rows never stall the scroll. */
function prefetch() {
  const cx0 = Math.floor(view.left / CHUNK) - 1;
  const cx1 = Math.floor((view.left + view.w / view.S) / CHUNK) + 1;
  const cy = Math.floor(view.top / CHUNK) - 1;
  for (let cx = cx0; cx <= cx1; cx++) {
    if (!chunks.has(`${cx},${cy}`)) {
      getChunk(cx, cy);
      return;
    }
  }
}

function evict() {
  if (chunks.size < 200) return;
  for (const [key, c] of chunks) if (frame - c.used > 180) chunks.delete(key);
}

function tileBiome(x, y) {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  const cx = Math.floor(tx / CHUNK);
  const cy = Math.floor(ty / CHUNK);
  const c = chunks.get(`${cx},${cy}`);
  if (!c) return world.biomeAt(tx, ty);
  return c.biomes[(ty - cy * CHUNK) * CHUNK + (tx - cx * CHUNK)];
}

function thermalsInView() {
  const pad = 12;
  const x0 = view.left - pad;
  const y0 = view.top - pad;
  const x1 = view.left + view.w / view.S + pad;
  const y1 = view.top + view.h / view.S + pad;
  const key = [x0, y0, x1, y1].map((v) => Math.floor(v / 28)).join(',');
  if (key !== thermalMemo.key) thermalMemo = { key, list: world.thermalsIn(x0, y0, x1, y1) };
  return thermalMemo.list;
}

function thermalAt(x, y) {
  for (const th of thermalsInView()) {
    const d = Math.hypot(th.x - x, th.y - y);
    if (d < th.r) return { ...th, d };
  }
  return null;
}

// ---------------------------------------------------------------- simulation
const paceTiles = () => CRAFTS[state.craftKey].pace * (0.25 + state.speedLevel * 0.15);
const liftHeld = () => state.keys.has('lift') || state.keys.has('liftBtn');

function update(dt) {
  state.time += dt;
  const c = CRAFTS[state.craftKey];
  const cr = state.craft;
  const flying = state.mode === 'flying';
  const pace = flying ? paceTiles() : MENU_PACE;
  cr.y -= pace * dt;

  if (flying) {
    let steer = (state.keys.has('right') ? 1 : 0) - (state.keys.has('left') ? 1 : 0);
    if (state.drag) steer = clamp((state.drag.x - (cr.x * view.S - view.offX)) / 60, -1, 1);
    const wind = c.wind ? c.wind * (0.7 * Math.sin(state.time * 0.11 + (world.seed % 7)) + 0.3 * Math.sin(state.time * 0.37)) : 0;
    cr.vx += (steer * c.steer + wind - cr.vx) * Math.min(1, c.agility * dt);
    cr.x += cr.vx * dt;
    cr.bank += (cr.vx / c.steer - cr.bank) * Math.min(1, dt * 4);

    const th = thermalAt(cr.x, cr.y);
    let climb = -c.sink;
    if (th) climb += c.thermal * (1 - (0.5 * th.d) / th.r);
    if (c.lift && liftHeld()) climb += c.lift;
    if (state.craftKey === 'bird' && cr.alt < 0.18) climb += 0.04;
    cr.alt = clamp(cr.alt + climb * dt, 0.06, 1);
    if (th && !state.inThermal) {
      audio.lift();
      showHint('Thermal · climbing');
    } else if (!th && state.inThermal) {
      showHint('');
    }
    state.inThermal = Boolean(th);
    state.distance += pace * dt;
    discover();
    audio.update(dt, (state.speedLevel - 1) / 9, cr.alt);
  }

  state.camX += (cr.x - state.camX) * Math.min(1, dt * 1.1);
  view.left = state.camX - view.w / 2 / view.S;
  view.top = cr.y - (view.h * CRAFT_Y) / view.S;
  view.offX = Math.round(view.left * view.S);
  view.offY = Math.round(view.top * view.S);
  updateSparkles(dt);
  updateFlocks(dt, pace);
  updatePopups(dt);
}

/** Notices places in a window ahead of the craft (wider when higher) and queues their pop-ups. */
function discover() {
  const cr = state.craft;
  const ahead = 34 + cr.alt * 30;
  const side = 16 + cr.alt * 20;
  // big places (cities) are noticed from further away: their ring counts towards the window
  for (const chunk of visibleChunks) {
    for (const lm of chunk.landmarks) {
      if (state.discovered.has(lm.id)) continue;
      const dy = cr.y - lm.y;
      const extra = lm.ring || 0;
      if (dy < -8 || dy > ahead + extra || Math.abs(lm.x - cr.x) > side + extra) continue;
      state.discovered.add(lm.id);
      state.queue.push(lm);
    }
  }
}

function updateSparkles(dt) {
  for (let k = 0; k < 3; k++) {
    const x = view.left + Math.random() * (view.w / view.S);
    const y = view.top + Math.random() * (view.h / view.S);
    const b = tileBiome(x, y);
    if (isWater(b) && b !== B.ICE && state.sparkles.length < 70) state.sparkles.push({ x, y, life: 0 });
  }
  for (const s of state.sparkles) s.life += dt;
  state.sparkles = state.sparkles.filter((s) => s.life < 1);
}

function updateFlocks(dt, pace) {
  state.nextFlock -= dt;
  if (state.nextFlock < 0) {
    state.nextFlock = 25 + Math.random() * 30;
    const dir = Math.random() < 0.5 ? -1 : 1;
    const count = 5 + Math.floor(Math.random() * 4);
    state.flocks.push({
      dir,
      x: dir > 0 ? view.left - 6 : view.left + view.w / view.S + 6,
      y: view.top + (0.1 + Math.random() * 0.4) * (view.h / view.S),
      vx: dir * (9 + Math.random() * 4),
      pace: 0.55,
      birds: Array.from({ length: count }, (_, i) => ({
        dx: -dir * Math.ceil(i / 2) * 2.2,
        dy: (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 1.6,
      })),
    });
  }
  for (const f of state.flocks) {
    f.x += f.vx * dt;
    f.y -= pace * f.pace * dt;
  }
  const w = view.w / view.S;
  state.flocks = state.flocks.filter((f) => f.x > view.left - 30 && f.x < view.left + w + 30);
}

// ---------------------------------------------------------------- rendering
function px(x, y, colour) {
  const S = view.S;
  ctx.fillStyle = colour;
  ctx.fillRect(Math.floor(x) * S - view.offX, Math.floor(y) * S - view.offY, S, S);
}

function render() {
  const { w, h, S } = view;
  ctx.imageSmoothingEnabled = false;
  const cx0 = Math.floor(view.left / CHUNK);
  const cx1 = Math.floor((view.left + w / S) / CHUNK);
  const cy0 = Math.floor(view.top / CHUNK);
  const cy1 = Math.floor((view.top + h / S) / CHUNK);
  visibleChunks = [];
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const c = getChunk(cx, cy);
      visibleChunks.push(c);
      ctx.drawImage(c.canvas, cx * CHUNK * S - view.offX, cy * CHUNK * S - view.offY, CHUNK * S, CHUNK * S);
    }
  }
  for (const s of state.sparkles) px(s.x, s.y, `rgba(255,255,255,${0.75 * Math.sin(s.life * Math.PI)})`);
  drawThermals();
  for (const c of visibleChunks) for (const lm of c.landmarks) for (const a of lm.anim) drawAnim(a, lm);
  drawMarkers();
  drawFlocks();
  if (state.mode === 'flying') drawCraft();
}

function drawThermals() {
  const t = state.time;
  for (const th of thermalsInView()) {
    const inside = state.inThermal && Math.hypot(th.x - state.craft.x, th.y - state.craft.y) < th.r;
    for (let k = 0; k < 3; k++) {
      const phase = (t * 0.3 + k / 3 + th.phase) % 1;
      const r = th.r * (0.2 + 0.8 * phase);
      const alpha = (inside ? 0.7 : 0.38) * (1 - phase);
      const n = Math.max(10, Math.round(r * 4));
      for (let i = 0; i < n; i += 2) {
        const a = (i / n) * Math.PI * 2 + t * 0.25;
        px(th.x + Math.cos(a) * r, th.y + Math.sin(a) * r, `rgba(255,244,190,${alpha})`);
      }
    }
  }
}

function drawAnim(a, lm) {
  const t = state.time;
  switch (a.kind) {
    case 'smoke':
    case 'steam': {
      const steam = a.kind === 'steam';
      const puffs = steam ? 4 : 3;
      for (let k = 0; k < puffs; k++) {
        const ph = (t * (steam ? 0.28 : 0.35) + k / puffs + ((a.x * 0.37) % 1)) % 1;
        const colour = steam ? `rgba(255,255,255,${0.65 * (1 - ph)})` : `rgba(236,234,228,${0.55 * (1 - ph)})`;
        px(a.x + ph * 2.5 + Math.sin(ph * 6 + k) * 0.6, a.y - ph * (steam ? 4 : 3), colour);
      }
      break;
    }
    case 'fire':
      px(a.x - 0.5, a.y - 0.5, Math.random() < 0.5 ? '#ffb02e' : '#ff5e00');
      px(a.x + ((t * 0.4) % 1) * 2, a.y - 1 - ((t * 0.4) % 1) * 3, `rgba(220,220,214,${0.5 * (1 - ((t * 0.4) % 1))})`);
      break;
    case 'sails':
      for (let k = 0; k < 4; k++) {
        const ang = t * 1.3 + (k * Math.PI) / 2;
        for (let d = 1; d <= 3; d++) px(a.x + Math.cos(ang) * d, a.y + Math.sin(ang) * d, d === 3 ? '#f4efe6' : '#5b4331');
      }
      break;
    case 'beam': {
      const ang = t * 0.9 + lm.seed * 6;
      for (let d = 1; d <= 14; d++) {
        const alpha = 0.5 * (1 - d / 15);
        px(a.x + Math.cos(ang) * d, a.y + Math.sin(ang) * d, `rgba(255,240,160,${alpha})`);
        px(a.x + Math.cos(ang + 0.07) * d, a.y + Math.sin(ang + 0.07) * d, `rgba(255,240,160,${alpha * 0.6})`);
      }
      break;
    }
    case 'whales':
      [[-5, 0], [2, -4], [6, 3]].forEach(([dx, dy], k) => {
        const cycle = (t / 9 + k * 0.31 + lm.seed) % 1;
        if (cycle > 0.45) return;
        const x = a.x + dx + cycle * 6;
        const y = a.y + dy;
        px(x - 1, y, '#1f3346');
        px(x, y, '#1f3346');
        px(x + 1, y, '#2c4a64');
        if (cycle < 0.12) px(x, y - 1 - cycle * 16, `rgba(255,255,255,${0.8 - cycle * 5})`);
      });
      break;
    default:
      break;
  }
}

/** Dotted ring around each place that has an open pop-up, so you can see what it points at. */
function drawMarkers() {
  for (const p of state.popups) {
    if (p.fading) continue;
    const r = p.lm.ring || 7.5;
    const n = Math.round(r * 4) * 2;
    for (let i = 0; i < n; i += 2) {
      const a = (i / n) * Math.PI * 2 + (state.time * 0.6 * 7.5) / r;
      px(p.lm.x + Math.cos(a) * r, p.lm.y + Math.sin(a) * r, 'rgba(255,255,255,0.9)');
    }
  }
}

function drawFlocks() {
  for (const f of state.flocks) {
    f.birds.forEach((b, i) => {
      const x = f.x + b.dx;
      const y = f.y + b.dy;
      const up = Math.floor(state.time * 5 + i) % 2;
      for (const [sx, sy, colour] of [[3, 4, 'rgba(10,20,30,0.18)'], [0, 0, '#2a2a30']]) {
        px(x - 1 + sx, y - up + sy, colour);
        px(x + sx, y + sy, colour);
        px(x + 1 + sx, y - up + sy, colour);
      }
    });
  }
}

function drawSprite(g, rows, cx, cy, size, shadow = null) {
  const h = rows.length;
  const w = rows[0].length;
  const x0 = cx - (w * size) / 2;
  const y0 = cy - (h * size) / 2;
  const cell = (i, j, grow) => {
    const x = Math.round(x0 + i * size - grow);
    const y = Math.round(y0 + j * size - grow);
    g.fillRect(x, y, Math.round(x0 + (i + 1) * size + grow) - x, Math.round(y0 + (j + 1) * size + grow) - y);
  };
  const solid = (ch) => ch !== '.' && ch !== 'l';
  if (shadow) {
    g.fillStyle = shadow;
    rows.forEach((row, j) => [...row].forEach((ch, i) => solid(ch) && cell(i, j, 0)));
    return;
  }
  g.fillStyle = INK;
  const o = Math.max(1, size * 0.35);
  rows.forEach((row, j) => [...row].forEach((ch, i) => solid(ch) && cell(i, j, o)));
  rows.forEach((row, j) =>
    [...row].forEach((ch, i) => {
      if (ch === '.') return;
      g.fillStyle = PALETTE[ch];
      cell(i, j, 0);
    }),
  );
}

function craftSprite(key, flapping) {
  if (key === 'balloon') return BALLOON;
  if (key === 'bird') return flapping && Math.floor(state.time * 6) % 2 ? CRANE_FLAP : CRANE_GLIDE;
  return PARAGLIDER;
}

function drawCraft() {
  const cr = state.craft;
  const key = state.craftKey;
  const flapping = key === 'bird' && (liftHeld() || cr.alt < 0.18);
  const rows = craftSprite(key, flapping);
  const size = view.S * (1 + cr.alt * 0.6);
  const sx = cr.x * view.S - view.offX;
  const sy = cr.y * view.S - view.offY;
  const tilt = key === 'balloon' ? Math.sin(state.time * 0.8) * 0.03 : cr.bank * 0.3;
  const drop = 6 + cr.alt * 46;
  for (const shadow of [true, false]) {
    ctx.save();
    ctx.translate(shadow ? sx + drop * 0.6 : sx, shadow ? sy + drop : sy);
    ctx.rotate(tilt);
    drawSprite(ctx, rows, 0, 0, shadow ? size * 0.8 : size, shadow ? 'rgba(16,24,32,0.28)' : null);
    ctx.restore();
  }
  if (key === 'balloon' && liftHeld()) {
    ctx.fillStyle = Math.random() < 0.5 ? '#ffb02e' : '#fff3b0';
    ctx.fillRect(Math.round(sx - size / 2), Math.round(sy - size / 2), Math.ceil(size), Math.ceil(size));
  }
}

function drawPreviews() {
  document.querySelectorAll('canvas[data-preview]').forEach((cv) => {
    const g = cv.getContext('2d');
    const key = cv.dataset.preview;
    const rows = craftSprite(key, false);
    g.clearRect(0, 0, cv.width, cv.height);
    drawSprite(g, rows, cv.width / 2 + 7, cv.height / 2 + 9, 3, 'rgba(16,24,32,0.28)');
    drawSprite(g, rows, cv.width / 2, cv.height / 2, 3.4);
  });
}

// ---------------------------------------------------------------- pop-ups
function openPopup(lm) {
  audio.chime(lm.seed);
  $('pp-live').textContent = `${lm.label}: ${lm.name}. ${lm.note}`;
  const el = document.createElement('div');
  el.className = 'pp-pop';
  const card = document.createElement('div');
  card.className = 'pp-pop-card';
  const tag = document.createElement('span');
  tag.className = 'pp-pop-tag';
  tag.style.background = TAG_COLOURS[lm.type] || '#fff';
  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined';
  icon.textContent = lm.icon;
  tag.append(icon, lm.label);
  const name = document.createElement('div');
  name.className = 'pp-pop-name';
  name.textContent = lm.name;
  const note = document.createElement('p');
  note.className = 'pp-pop-note';
  note.textContent = lm.note;
  const meta = document.createElement('div');
  meta.className = 'pp-pop-meta';
  const fact = document.createElement('span');
  fact.textContent = lm.fact;
  const cta = document.createElement('span');
  cta.textContent = 'Space · postcard';
  meta.append(fact, cta);
  card.append(tag, name, note, meta);
  el.append(card);
  $('pp-popups').append(el);
  for (const p of state.popups) fadePopup(p);
  const pop = { lm, el, cta, age: 0, fading: false, side: '', width: 0 };
  state.popups.push(pop);
  positionPopup(pop);
  pop.width = card.offsetWidth;
  positionPopup(pop);
}

/** Pins the card beside its place, on the side away from the craft, flipping only when it must. */
function positionPopup(p) {
  const S = view.S;
  const lx = p.lm.x * S - view.offX;
  const ly = p.lm.y * S - view.offY;
  const craftX = state.craft.x * S - view.offX;
  const ring = (p.lm.ring || 7.5) * S;
  const cardW = p.width || 240;
  let side = p.side && Math.abs(lx - craftX) < 40 ? p.side : lx < craftX ? 'left' : 'right';
  if (side === 'left' && lx - ring - cardW < 8) side = 'right';
  else if (side === 'right' && lx + ring + cardW > view.w - 8) side = 'left';
  if (side !== p.side) {
    p.side = side;
    p.el.dataset.side = side;
  }
  // On narrow screens neither side may fit: keep the card on screen and let the tail point roughly.
  const ax = side === 'left' ? Math.max(lx - ring, cardW + 8) : Math.min(lx + ring, view.w - cardW - 8);
  const ay = clamp(ly, view.popTop, view.popBottom);
  p.el.style.transform = `translate(${Math.round(ax)}px, ${Math.round(ay)}px)`;
  return ly;
}

function fadePopup(p) {
  if (p.fading) return;
  p.fading = true;
  p.el.classList.add('pp-fading');
  setTimeout(() => {
    p.el.remove();
    state.popups = state.popups.filter((q) => q !== p);
  }, 650);
}

function updatePopups(dt) {
  const cr = state.craft;
  state.queue = state.queue.filter((lm) => lm.y < cr.y + 20); // skip places already left behind
  const current = state.popups.find((p) => !p.fading);
  if (state.queue.length && (!current || current.age > POP_MIN_SECONDS)) openPopup(state.queue.shift());
  for (const p of state.popups) {
    p.age += dt;
    const y = positionPopup(p);
    if (p.age > POP_SECONDS || p.lm.y > cr.y + 30 || y > view.h + 40) fadePopup(p);
  }
}

function clearPopups() {
  for (const p of state.popups) p.el.remove();
  state.popups = [];
  state.queue = [];
}

// ---------------------------------------------------------------- postcards and journal
function loadJournal() {
  try {
    const data = JSON.parse(localStorage.getItem(JOURNAL_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveJournal() {
  while (journal.length) {
    try {
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal));
      return;
    } catch {
      journal.pop(); // storage full: drop the oldest card and retry
    }
  }
}

function snapPostcard() {
  if (state.mode !== 'flying' || state.paused) return;
  const pop = [...state.popups].reverse().find((p) => !p.fading);
  const cx = pop ? pop.lm.x : state.craft.x;
  const cy = pop ? pop.lm.y : state.craft.y - 8;
  const W = 56;
  const H = 40;
  const x0 = Math.floor(cx - W / 2);
  const y0 = Math.floor(cy - H / 2);
  const card = document.createElement('canvas');
  card.width = W;
  card.height = H;
  const g = card.getContext('2d');
  for (let ty = Math.floor(y0 / CHUNK); ty <= Math.floor((y0 + H - 1) / CHUNK); ty++) {
    for (let tx = Math.floor(x0 / CHUNK); tx <= Math.floor((x0 + W - 1) / CHUNK); tx++) {
      g.drawImage(getChunk(tx, ty).canvas, tx * CHUNK - x0, ty * CHUNK - y0);
    }
  }
  const km = ((state.distance * METRES_PER_TILE) / 1000).toFixed(1);
  const tile = world.tile(Math.floor(cx), Math.floor(cy));
  const entry = pop
    ? { name: pop.lm.name, label: pop.lm.label, fact: pop.lm.fact, note: pop.lm.note }
    : { name: `Over ${BIOME_NAMES[tile.b]}`, label: 'Wide view', fact: '', note: `${climateLabel(tile.t)} skies, ${km} km into the flight.` };
  Object.assign(entry, {
    id: Date.now(),
    img: card.toDataURL('image/png'),
    seed: state.seed,
    craft: CRAFTS[state.craftKey].name,
    when: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  });
  journal.unshift(entry);
  journal.length = Math.min(journal.length, JOURNAL_MAX);
  saveJournal();
  renderJournal();
  if (pop) pop.cta.textContent = '✓ in journal';
  audio.shutter();
  const flash = $('pp-flash');
  flash.hidden = true;
  void flash.offsetWidth; // restart the CSS animation
  flash.hidden = false;
  const count = $('pp-journal-count');
  count.classList.remove('pp-bump');
  void count.offsetWidth;
  count.classList.add('pp-bump');
  toast(`Postcard kept · ${entry.name}`);
}

function renderJournal() {
  const list = $('pp-journal-list');
  list.replaceChildren(
    ...journal.map((e) => {
      const li = document.createElement('li');
      li.className = 'pp-card';
      const img = document.createElement('img');
      img.src = e.img;
      img.alt = `Pixel postcard of ${e.name}`;
      const h3 = document.createElement('h3');
      h3.textContent = e.name;
      const label = document.createElement('p');
      label.className = 'pp-card-meta';
      label.textContent = [e.label, e.fact].filter(Boolean).join(' · ');
      const note = document.createElement('p');
      note.textContent = e.note;
      const meta = document.createElement('p');
      meta.className = 'pp-card-meta';
      meta.textContent = `${e.craft} · seed ${e.seed} · ${e.when}`;
      li.append(img, h3, label, note, meta);
      return li;
    }),
  );
  $('pp-journal-empty').hidden = journal.length > 0;
  $('pp-journal-clear').hidden = journal.length === 0;
  $('pp-journal-count').textContent = journal.length;
}

function toggleJournal(open = !state.journalOpen) {
  state.journalOpen = open;
  $('pp-journal').hidden = !open;
  (open ? $('pp-journal-close') : $('pp-btn-journal')).focus();
}

// ---------------------------------------------------------------- HUD, hints, toasts
let hudTimer = 0;
function updateHud(dt) {
  hudTimer -= dt;
  if (hudTimer > 0 || state.mode !== 'flying') return;
  hudTimer = 0.25;
  const cr = state.craft;
  const tile = world.tile(Math.floor(cr.x), Math.floor(cr.y));
  $('pp-alt').textContent = `${Math.round(120 + cr.alt * 1680).toLocaleString('en-GB')} m`;
  $('pp-speed').textContent = `${Math.round(paceTiles() * METRES_PER_TILE * 3.6)} km/h`;
  $('pp-dist').textContent = `${((state.distance * METRES_PER_TILE) / 1000).toFixed(1)} km`;
  $('pp-found').textContent = state.discovered.size;
  $('pp-altbar-fill').style.width = `${Math.round(cr.alt * 100)}%`;
  $('pp-climate').textContent = climateLabel(tile.t);
  $('pp-over').textContent = `over ${BIOME_NAMES[tile.b]}`;
}

function showHint(text) {
  const el = $('pp-hint');
  el.textContent = text;
  el.hidden = !text;
}

let toastTimer = 0;
function toast(text, seconds = 3) {
  const el = $('pp-toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), seconds * 1000);
}

// ---------------------------------------------------------------- controls
function setSpeed(level) {
  state.speedLevel = clamp(Math.round(level), 1, 10);
  $('pp-speed-range').value = state.speedLevel;
  savePrefs();
}

function selectCraft(key) {
  state.craftKey = key;
  document.querySelectorAll('.pp-craft').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.craft === key)));
  savePrefs();
}

function takeOff() {
  const seedInput = $('pp-seed');
  if (seedInput.value.trim() !== state.seed) setSeed(seedInput.value);
  seedInput.value = state.seed;
  audio.start();
  audio.setVolume($('pp-volume-range').value / 100);
  const c = CRAFTS[state.craftKey];
  Object.assign(state.craft, { x: state.camX, vx: 0, alt: 0.45, bank: 0 });
  state.distance = 0;
  state.discovered.clear();
  clearPopups();
  state.mode = 'flying';
  stage.dataset.mode = 'flying';
  $('pp-craft-name').textContent = c.name;
  $('pp-lift-btn').hidden = !c.lift;
  $('pp-lift-label').textContent = c.liftLabel || '';
  measureHud();
  hudTimer = 0;
  stage.focus({ preventScroll: true });
  toast(c.hint, 6);
}

function land() {
  if (state.paused) togglePause(false);
  if (state.journalOpen) toggleJournal(false);
  state.mode = 'menu';
  stage.dataset.mode = 'menu';
  clearPopups();
  showHint('');
  state.inThermal = false;
  drawPreviews();
  $('pp-takeoff').focus({ preventScroll: true });
}

function togglePause(paused = !state.paused) {
  if (state.mode !== 'flying') return;
  state.paused = paused;
  $('pp-paused').hidden = !paused;
  const btn = $('pp-btn-pause');
  btn.setAttribute('aria-pressed', String(paused));
  btn.querySelector('.material-symbols-outlined').textContent = paused ? 'play_arrow' : 'pause';
  if (paused) audio.suspend();
  else audio.resume();
}

function toggleMute(muted = !audio.muted) {
  audio.setMuted(muted);
  const btn = $('pp-btn-sound');
  btn.setAttribute('aria-pressed', String(muted));
  btn.querySelector('.material-symbols-outlined').textContent = muted ? 'volume_off' : 'volume_up';
  savePrefs();
}

function toggleFullscreen() {
  const active = document.fullscreenElement || document.webkitFullscreenElement;
  if (active) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  else (stage.requestFullscreen || stage.webkitRequestFullscreen)?.call(stage);
}

const KEYMAP = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', shift: 'lift' };

function onKeyDown(e) {
  if (e.target.matches?.('input, textarea')) {
    if (e.key === 'Enter' && state.mode === 'menu') takeOff();
    return;
  }
  const k = e.key.toLowerCase();
  if ((k === ' ' || k === 'enter') && e.target.closest?.('button, a')) return; // let focused controls activate
  if (state.mode !== 'flying') {
    if (k === 'enter' && (e.target === document.body || e.target === stage)) takeOff();
    return;
  }
  if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(k)) e.preventDefault();
  if (KEYMAP[k]) state.keys.add(KEYMAP[k]);
  else if (k === 'arrowup' || k === 'w') setSpeed(state.speedLevel + 1);
  else if (k === 'arrowdown' || k === 's') setSpeed(state.speedLevel - 1);
  else if (k === ' ' && !e.repeat) snapPostcard();
  else if (k === 'j') toggleJournal();
  else if (k === 'p') togglePause();
  else if (k === 'm') toggleMute();
  else if (k === 'f') toggleFullscreen();
  else if (k === 'escape' && state.journalOpen) toggleJournal(false);
}

function onKeyUp(e) {
  const k = KEYMAP[e.key.toLowerCase()];
  if (k) state.keys.delete(k);
}

// ---------------------------------------------------------------- prefs and seeds
function randomSeed() {
  const a = ['amber', 'misty', 'quiet', 'golden', 'silver', 'mossy', 'sunny', 'drowsy', 'velvet', 'hazel', 'coral', 'lazy'];
  const b = ['otter', 'heron', 'valley', 'harbour', 'meadow', 'comet', 'lantern', 'pebble', 'willow', 'fern', 'kite', 'tide'];
  const r = (arr) => arr[Math.floor(Math.random() * arr.length)];
  return `${r(a)}-${r(b)}-${Math.floor(10 + Math.random() * 90)}`;
}

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function savePrefs() {
  try {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ craft: state.craftKey, speed: state.speedLevel, volume: +$('pp-volume-range').value, muted: audio.muted, seed: state.seed }),
    );
  } catch {
    /* private mode: preferences simply do not persist */
  }
}

// ---------------------------------------------------------------- layout and loop
function resize() {
  const header = document.querySelector('body > header');
  if (header && !document.fullscreenElement) stage.style.setProperty('--pp-header', `${header.offsetHeight}px`);
  const r = stage.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(r.width));
  canvas.height = Math.max(1, Math.round(r.height));
  view.w = canvas.width;
  view.h = canvas.height;
  view.S = view.w >= 1800 ? 5 : view.w >= 700 ? 4 : 3;
  measureHud();
  update(0);
  render();
}

/** Keeps pop-up cards (about 120px tall, centred on their place) clear of the HUD panels. */
function measureHud() {
  const topHud = view.w < 720 ? document.querySelector('.pp-hud-left').offsetHeight + 16 : 0;
  view.popTop = topHud + 76;
  view.popBottom = Math.max(view.popTop, view.h - document.querySelector('.pp-hud-bottom').offsetHeight - 16 - 70);
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!state.paused && !state.journalOpen) {
    update(dt);
    render();
    prefetch();
    evict();
    updateHud(dt);
    frame++;
  }
  requestAnimationFrame(loop);
}

function init() {
  const prefs = loadPrefs();
  stage.tabIndex = -1;
  selectCraft(CRAFTS[prefs.craft] ? prefs.craft : 'paraglider');
  if (prefs.speed) setSpeed(prefs.speed);
  if (Number.isFinite(prefs.volume)) $('pp-volume-range').value = prefs.volume;
  if (prefs.muted) toggleMute(true);
  setSeed(prefs.seed || randomSeed());
  $('pp-seed').value = state.seed;

  document.querySelectorAll('.pp-craft').forEach((b) => b.addEventListener('click', () => selectCraft(b.dataset.craft)));
  $('pp-seed').addEventListener('change', (e) => setSeed(e.target.value));
  $('pp-dice').addEventListener('click', () => {
    setSeed(randomSeed());
    $('pp-seed').value = state.seed;
  });
  $('pp-takeoff').addEventListener('click', takeOff);
  $('pp-btn-journal').addEventListener('click', () => toggleJournal());
  $('pp-journal-close').addEventListener('click', () => toggleJournal(false));
  $('pp-btn-sound').addEventListener('click', () => toggleMute());
  $('pp-btn-pause').addEventListener('click', () => togglePause());
  $('pp-btn-full').addEventListener('click', toggleFullscreen);
  $('pp-btn-menu').addEventListener('click', land);
  $('pp-snap-btn').addEventListener('click', snapPostcard);
  $('pp-flash').addEventListener('animationend', (e) => (e.target.hidden = true));
  // After a mouse or touch click on a HUD button, hand focus back to the stage so Space snaps again.
  stage.addEventListener('click', (e) => {
    if (e.detail && state.mode === 'flying' && !state.journalOpen && e.target.closest('.pp-hud button')) {
      stage.focus({ preventScroll: true });
    }
  });
  $('pp-speed-range').addEventListener('input', (e) => setSpeed(e.target.value));
  $('pp-volume-range').addEventListener('input', (e) => {
    audio.setVolume(e.target.value / 100);
    savePrefs();
  });

  const clearBtn = $('pp-journal-clear');
  let armTimer = 0;
  clearBtn.addEventListener('click', () => {
    if (clearBtn.dataset.armed === 'true') {
      journal = [];
      saveJournal();
      localStorage.removeItem(JOURNAL_KEY);
      renderJournal();
      clearBtn.dataset.armed = 'false';
      clearBtn.textContent = 'Clear journal';
      return;
    }
    clearBtn.dataset.armed = 'true';
    clearBtn.textContent = 'Tap again to clear everything';
    clearTimeout(armTimer);
    armTimer = setTimeout(() => {
      clearBtn.dataset.armed = 'false';
      clearBtn.textContent = 'Clear journal';
    }, 3000);
  });

  const liftBtn = $('pp-lift-btn');
  const liftOn = (e) => {
    e.preventDefault();
    state.keys.add('liftBtn');
    liftBtn.classList.add('pp-held');
  };
  const liftOff = () => {
    state.keys.delete('liftBtn');
    liftBtn.classList.remove('pp-held');
  };
  liftBtn.addEventListener('pointerdown', liftOn);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => liftBtn.addEventListener(ev, liftOff));

  canvas.addEventListener('pointerdown', (e) => {
    if (state.mode !== 'flying') return;
    state.drag = { x: e.offsetX };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (state.drag) state.drag.x = e.offsetX;
  });
  ['pointerup', 'pointercancel'].forEach((ev) => canvas.addEventListener(ev, () => (state.drag = null)));

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => state.keys.clear());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.mode === 'flying') togglePause(true);
  });
  document.addEventListener('fullscreenchange', () => {
    $('pp-btn-full').querySelector('.material-symbols-outlined').textContent = document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen';
  });
  new ResizeObserver(resize).observe(stage);

  renderJournal();
  drawPreviews();
  resize();
  requestAnimationFrame(loop);
}

init();
