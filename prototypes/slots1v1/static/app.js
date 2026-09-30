const SYMBOLS = {
  blade: { id: 'blade', name: 'Blade', iconUrl: '/static/prototypes/slots1v1/images/slots/blade.svg', chipDmg: 6, burstDmg: 24, cost: 4, color: '#ff1493' },
  shield: { id: 'shield', name: 'Shield', iconUrl: '/static/prototypes/slots1v1/images/slots/shield.svg', chipBlock: 6, burstBlock: 20, cost: 4, color: '#00e5ff' },
  coin: { id: 'coin', name: 'Coin', iconUrl: '/static/prototypes/slots1v1/images/slots/coin.svg', chipGold: 4, burstGold: 12, cost: 4, color: '#fae100' },
  acid: { id: 'acid', name: 'Acid', iconUrl: '/static/prototypes/slots1v1/images/slots/acid.svg', chipAcid: 3, burstAcid: 8, cost: 5, color: '#39ff14' },
  freeze: { id: 'freeze', name: 'EMP Freeze', iconUrl: '/static/prototypes/slots1v1/images/slots/freeze.svg', cost: 5, color: '#80d8ff' },
  joker: { id: 'joker', name: 'Wild Joker', iconUrl: '/static/prototypes/slots1v1/images/slots/joker.svg', cost: 8, color: '#b40065' },
  blank: { id: 'blank', name: 'Blank Dud', iconUrl: '/static/prototypes/slots1v1/images/slots/blank.svg', cost: 0, color: '#78909c' }
};

const PAYLINES = [
  { name: 'Row 1', coords: [[0,0], [1,0], [2,0]], svgY: 36 },
  { name: 'Row 2', coords: [[0,1], [1,1], [2,1]], svgY: 108 },
  { name: 'Row 3', coords: [[0,2], [1,2], [2,2]], svgY: 180 },
  { name: 'Diag Down', coords: [[0,0], [1,1], [2,2]], isDiagonal: 'down' },
  { name: 'Diag Up', coords: [[0,2], [1,1], [2,0]], isDiagonal: 'up' },
];

// ORIGINAL HIGH-PUNCH SOUND EFFECTS RESTORED
class SoundFX {
  constructor() { this.ctx = null; this.muted = false; }
  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  tick() {
    if (this.muted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }
  clunk() {
    if (this.muted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }
  ding() {
    if (this.muted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, this.ctx.currentTime);
    osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }
  hit() {
    if (this.muted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }
  shield() {
    if (this.muted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }
  lever() {
    if (this.muted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(250, this.ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }
}
const sfx = new SoundFX();

function toggleAudio() {
  sfx.muted = !sfx.muted;
  document.getElementById('sound-icon').textContent = sfx.muted ? 'volume_off' : 'volume_up';
  document.getElementById('sound-text').textContent = sfx.muted ? 'MUTED' : 'SOUND ON';
}

const STRIP_LEN = 12;
const state = {
  mode: 'bot',
  peer: null,
  conn: null,
  isHost: false,
  spinning: false,
  selectedSlot: null,
  series: {
    p1Wins: 0,
    p2Wins: 0,
    targetWins: 4,
    gameNumber: 1,
    maxGames: 7
  },
  p1: {
    hp: 100,
    maxHp: 100,
    block: 0,
    gold: 10,
    fever: 0,
    feverActive: false,
    passives: {
      spikesLevel: 0, // max 3
      aegisLevel: 0,  // max 2
      acidLevel: 0,   // max 3
      healsBought: 0
    },
    reels: [
      ['blade', 'blank', 'shield', 'coin', 'blade', 'acid', 'shield', 'blank', 'coin', 'blade', 'shield', 'coin'],
      ['shield', 'blade', 'coin', 'blank', 'blade', 'shield', 'coin', 'acid', 'blade', 'blank', 'shield', 'coin'],
      ['coin', 'shield', 'blade', 'acid', 'shield', 'blank', 'blade', 'coin', 'shield', 'blade', 'blank', 'coin']
    ],
    offsets: [0, 4, 8]
  },
  p2: {
    hp: 100,
    maxHp: 100,
    block: 0,
    gold: 10,
    fever: 0,
    feverActive: false,
    passives: {
      spikesLevel: 0,
      aegisLevel: 0,
      acidLevel: 0,
      healsBought: 0
    },
    archetype: 'burst',
    reels: [
      ['blade', 'blade', 'blank', 'shield', 'blade', 'blade', 'coin', 'blank', 'blade', 'shield', 'blade', 'coin'],
      ['blade', 'blank', 'blade', 'shield', 'blade', 'coin', 'blade', 'blank', 'blade', 'shield', 'blade', 'coin'],
      ['blade', 'shield', 'blade', 'blank', 'blade', 'coin', 'blade', 'shield', 'blade', 'blank', 'blade', 'coin']
    ],
    offsets: [1, 5, 9]
  }
};

function init() {
  renderStats();
  renderSeriesScoreboard();
  buildPhysicalReelStrips('p1');
  buildPhysicalReelStrips('p2');
  setReelOffsets('p1', state.p1.offsets);
  setReelOffsets('p2', state.p2.offsets);
  initSymbolCardDraft();
  checkUrlParams();
}

function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const room = params.get('room');
  if (room) {
    document.getElementById('join-room-input').value = room;
    connectToPeer(room);
  }
}

function applyStarterPreset(type) {
  if (type === 'aggro') {
    state.p1.reels = [
      ['blade', 'blade', 'coin', 'blade', 'shield', 'blade', 'blank', 'blade', 'coin', 'blade', 'shield', 'blade'],
      ['blade', 'coin', 'blade', 'blade', 'blank', 'blade', 'shield', 'blade', 'coin', 'blade', 'blade', 'shield'],
      ['blade', 'blade', 'shield', 'blade', 'coin', 'blade', 'blade', 'shield', 'blank', 'blade', 'coin', 'blade']
    ];
    state.p1.passives = { spikesLevel: 0, aegisLevel: 0, acidLevel: 0, healsBought: 0 };
  } else if (type === 'turtle') {
    state.p1.reels = [
      ['shield', 'shield', 'blade', 'coin', 'shield', 'blank', 'shield', 'blade', 'coin', 'shield', 'shield', 'blade'],
      ['shield', 'blade', 'shield', 'shield', 'coin', 'blank', 'shield', 'shield', 'blade', 'coin', 'shield', 'blank'],
      ['shield', 'coin', 'shield', 'blade', 'shield', 'shield', 'coin', 'blank', 'shield', 'blade', 'shield', 'shield']
    ];
    state.p1.passives = { spikesLevel: 1, aegisLevel: 0, acidLevel: 0, healsBought: 0 };
  } else if (type === 'acid') {
    state.p1.reels = [
      ['acid', 'acid', 'shield', 'blade', 'coin', 'acid', 'blank', 'acid', 'shield', 'blade', 'coin', 'acid'],
      ['acid', 'shield', 'acid', 'blade', 'blank', 'acid', 'coin', 'acid', 'shield', 'blade', 'acid', 'coin'],
      ['acid', 'blade', 'acid', 'shield', 'coin', 'acid', 'blank', 'acid', 'blade', 'shield', 'coin', 'acid']
    ];
    state.p1.passives = { spikesLevel: 0, aegisLevel: 0, acidLevel: 1, healsBought: 0 };
  }

  buildPhysicalReelStrips('p1');
  setReelOffsets('p1', state.p1.offsets);
  renderStats();
  closePreMatchModal();
  sfx.ding();
}

function closePreMatchModal() {
  document.getElementById('prematch-modal').classList.add('hidden');
}

function openPreMatchModder() {
  closePreMatchModal();
  openShopModal();
}

function renderSeriesScoreboard() {
  document.getElementById('p1-wins-text').textContent = state.series.p1Wins;
  document.getElementById('p2-wins-text').textContent = state.series.p2Wins;
  document.getElementById('game-series-indicator').textContent = `GAME ${state.series.gameNumber} / ${state.series.maxGames}`;

  for (let i = 1; i <= 4; i++) {
    const p1Pip = document.getElementById(`p1-pip-${i}`);
    if (p1Pip) p1Pip.className = `score-pip ${i <= state.series.p1Wins ? 'won' : 'empty'}`;

    const p2Pip = document.getElementById(`p2-pip-${i}`);
    if (p2Pip) p2Pip.className = `score-pip ${i <= state.series.p2Wins ? 'won' : 'empty'}`;
  }
}

function buildPhysicalReelStrips(playerKey) {
  const player = state[playerKey];
  for (let c = 0; c < 3; c++) {
    const stripEl = document.getElementById(`${playerKey}-strip-${c}`);
    if (!stripEl) continue;
    stripEl.innerHTML = '';
    const fullStrip = [...player.reels[c], ...player.reels[c], ...player.reels[c]];
    fullStrip.forEach((symKey, idx) => {
      const sym = SYMBOLS[symKey] || SYMBOLS.blank;
      const cell = document.createElement('div');
      cell.className = 'reel-cell h-[72px] w-full flex items-center justify-center p-1 border-b border-gray-200 bg-white select-none';
      cell.innerHTML = `<img src="${sym.iconUrl}" alt="${sym.name}" class="w-14 h-14 object-contain pointer-events-none drop-shadow-[1px_1px_0px_#1c1b1b]"/>`;
      stripEl.appendChild(cell);
    });
  }
}

function setReelOffsets(playerKey, offsets) {
  const CELL_HEIGHT = 72;
  for (let c = 0; c < 3; c++) {
    const stripEl = document.getElementById(`${playerKey}-strip-${c}`);
    if (!stripEl) continue;
    const pos = (offsets[c] + STRIP_LEN) * CELL_HEIGHT;
    stripEl.style.transform = `translateY(-${pos}px)`;
  }
}

function getVisibleGrid(player) {
  const grid = [[], [], []];
  for (let c = 0; c < 3; c++) {
    const offset = player.offsets[c];
    const reel = player.reels[c];
    for (let r = 0; r < 3; r++) {
      const symKey = reel[(offset + r) % STRIP_LEN];
      if (player.feverActive && Math.random() < 0.35) {
        grid[c][r] = 'joker';
      } else {
        grid[c][r] = symKey;
      }
    }
  }
  return grid;
}

// STAGGERED COMBAT POPUPS DISPATCHER
function triggerStaggeredPopups(playerKey, queue) {
  queue.forEach((p, idx) => {
    setTimeout(() => {
      const yOffsets = [-36, 12, -14, 34, 0];
      const xOffsets = [-32, 32, -18, 18, 0];
      const yOff = yOffsets[idx % yOffsets.length];
      const xOff = (p.xOffset !== undefined) ? p.xOffset : xOffsets[idx % xOffsets.length];
      spawnCombatPopup(playerKey, p.text, p.color, xOff, yOff);
    }, idx * 220); // 220ms stagger between popups prevents overlapping!
  });
}

function spawnCombatPopup(playerKey, text, color = '#ff1493', xOffset = 0, yOffset = 0) {
  const container = document.getElementById(`${playerKey}-popups`);
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'combat-popup pointer-events-none text-xl sm:text-2xl';
  el.style.color = color;
  el.style.left = `calc(50% + ${xOffset}px)`;
  el.style.top = `calc(45% + ${yOffset}px)`;
  el.textContent = text;
  container.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function triggerSpin() {
  if (state.spinning) return;
  sfx.init();

  const leverArm = document.getElementById('p1-lever-arm');
  if (leverArm) {
    leverArm.style.transform = 'rotate(45deg) scaleY(0.7)';
    sfx.lever();
    setTimeout(() => { leverArm.style.transform = 'rotate(0deg) scaleY(1)'; }, 180);
  }

  clearPaylines('p1');
  clearPaylines('p2');

  if (state.p1.fever >= 100) { state.p1.feverActive = true; state.p1.fever = 0; }
  if (state.p2.fever >= 100) { state.p2.feverActive = true; state.p2.fever = 0; }

  state.spinning = true;
  const spinBtn = document.getElementById('spin-btn');
  spinBtn.disabled = true;
  spinBtn.classList.add('opacity-50');
  document.getElementById('p1-combat-log').textContent = `Game ${state.series.gameNumber}: Reels spinning...`;

  const p1Targets = [
    Math.floor(Math.random() * STRIP_LEN),
    Math.floor(Math.random() * STRIP_LEN),
    Math.floor(Math.random() * STRIP_LEN)
  ];
  const p2Targets = [
    Math.floor(Math.random() * STRIP_LEN),
    Math.floor(Math.random() * STRIP_LEN),
    Math.floor(Math.random() * STRIP_LEN)
  ];

  animatePhysicalReels('p1', p1Targets);
  animatePhysicalReels('p2', p2Targets, () => {
    finalizeSpin(p1Targets, p2Targets);
  });
}

function animatePhysicalReels(playerKey, targets, onComplete) {
  const CELL_HEIGHT = 72;
  const colStops = [false, false, false];
  const stopDelays = [220, 380, 540];

  for (let c = 0; c < 3; c++) {
    const stripEl = document.getElementById(`${playerKey}-strip-${c}`);
    if (!stripEl) continue;

    let currentPos = (state[playerKey].offsets[c] + STRIP_LEN) * CELL_HEIGHT;
    let speed = 36;

    const spinInterval = setInterval(() => {
      currentPos += speed;
      if (currentPos >= STRIP_LEN * 2 * CELL_HEIGHT) currentPos -= STRIP_LEN * CELL_HEIGHT;
      stripEl.style.transform = `translateY(-${currentPos}px)`;
      if (Math.random() < 0.2) sfx.tick();
    }, 14);

    setTimeout(() => {
      clearInterval(spinInterval);
      const finalPos = (targets[c] + STRIP_LEN) * CELL_HEIGHT;
      stripEl.style.transition = 'transform 0.16s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      stripEl.style.transform = `translateY(-${finalPos}px)`;
      sfx.clunk();

      setTimeout(() => {
        stripEl.style.transition = '';
        colStops[c] = true;
        if (colStops.every(Boolean)) {
          state[playerKey].offsets = [...targets];
          if (onComplete) onComplete();
        }
      }, 170);
    }, stopDelays[c]);
  }
}

function finalizeSpin(p1Targets, p2Targets) {
  state.p1.offsets = p1Targets;
  state.p2.offsets = p2Targets;

  const p1Grid = getVisibleGrid(state.p1);
  const p2Grid = getVisibleGrid(state.p2);

  sfx.ding();

  const p1Wins = evaluatePaylines(p1Grid);
  const p2Wins = evaluatePaylines(p2Grid);

  drawPaylines('p1', p1Wins);
  drawPaylines('p2', p2Wins);

  resolveCombatImpact(p1Wins, p2Wins);

  state.spinning = false;
  const spinBtn = document.getElementById('spin-btn');
  spinBtn.disabled = false;
  spinBtn.classList.remove('opacity-50');

  if (state.p1.hp <= 0 || state.p2.hp <= 0) {
    setTimeout(handleGameFinish, 900);
  }
}

function handleGameFinish() {
  const p1WonGame = state.p1.hp > 0 && state.p2.hp <= 0;
  const p2WonGame = state.p2.hp > 0 && state.p1.hp <= 0;

  if (p1WonGame) {
    state.series.p1Wins++;
    sfx.ding();
  } else if (p2WonGame) {
    state.series.p2Wins++;
  } else {
    state.series.p1Wins += 0.5;
    state.series.p2Wins += 0.5;
  }

  renderSeriesScoreboard();

  if (state.series.p1Wins >= state.series.targetWins || state.series.p2Wins >= state.series.targetWins) {
    triggerMatchChampionship();
    return;
  }

  state.series.gameNumber++;
  state.p1.gold += 8;
  state.p2.gold += 8;

  state.p1.hp = 100;
  state.p1.block = 0;
  state.p2.hp = 100;
  state.p2.block = 0;

  renderStats();
  renderSeriesScoreboard();

  document.getElementById('shop-header-badge').textContent = `GAME ${state.series.gameNumber - 1} OVER • TACTICAL INTERMISSION`;
  document.getElementById('shop-header-title').textContent = `Adjust Strategy For Game ${state.series.gameNumber}`;
  openShopModal();
}

function drawPaylines(playerKey, wins) {
  const svg = document.getElementById(`${playerKey}-payline-svg`);
  if (!svg) return;
  svg.innerHTML = '';

  wins.forEach(w => {
    const color = SYMBOLS[w.type]?.color || '#fae100';
    let lineEl;

    if (w.payline.isDiagonal === 'down') {
      lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      lineEl.setAttribute('x1', '20'); lineEl.setAttribute('y1', '20');
      lineEl.setAttribute('x2', '280'); lineEl.setAttribute('y2', '196');
    } else if (w.payline.isDiagonal === 'up') {
      lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      lineEl.setAttribute('x1', '20'); lineEl.setAttribute('y1', '196');
      lineEl.setAttribute('x2', '280'); lineEl.setAttribute('y2', '20');
    } else {
      lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      lineEl.setAttribute('x1', '10'); lineEl.setAttribute('y1', w.payline.svgY);
      lineEl.setAttribute('x2', '290'); lineEl.setAttribute('y2', w.payline.svgY);
    }

    lineEl.setAttribute('stroke', color);
    lineEl.setAttribute('stroke-width', w.count === 3 ? '6' : '3.5');
    lineEl.setAttribute('stroke-linecap', 'round');
    lineEl.setAttribute('filter', 'drop-shadow(0 0 6px ' + color + ')');
    lineEl.classList.add('animate-pulse');
    svg.appendChild(lineEl);
  });
}

function clearPaylines(playerKey) {
  const svg = document.getElementById(`${playerKey}-payline-svg`);
  if (svg) svg.innerHTML = '';
}

function evaluatePaylines(grid) {
  const wins = [];
  PAYLINES.forEach(pl => {
    const s0 = grid[pl.coords[0][0]][pl.coords[0][1]];
    const s1 = grid[pl.coords[1][0]][pl.coords[1][1]];
    const s2 = grid[pl.coords[2][0]][pl.coords[2][1]];

    if (s0 === 'blank' && s1 === 'blank' && s2 === 'blank') return;

    const targetSym = getMajoritySymbol([s0, s1, s2]);
    if (targetSym && targetSym !== 'blank' && isMatch(s0, targetSym) && isMatch(s1, targetSym) && isMatch(s2, targetSym)) {
      wins.push({ payline: pl, type: targetSym, count: 3 });
      return;
    }

    if (isMatch(s0, s1) && s0 !== 'blank') {
      wins.push({ payline: pl, type: s0 === 'joker' ? s1 : s0, count: 2 });
    } else if (isMatch(s1, s2) && s1 !== 'blank') {
      wins.push({ payline: pl, type: s1 === 'joker' ? s2 : s1, count: 2 });
    }
  });
  return wins;
}

function isMatch(a, b) {
  if (a === 'blank' || b === 'blank') return false;
  if (a === 'joker' || b === 'joker') return true;
  return a === b;
}

function getMajoritySymbol(arr) {
  const filtered = arr.filter(s => s !== 'joker' && s !== 'blank');
  return filtered.length > 0 ? filtered[0] : 'blade';
}

// BALANCED COMBAT: Staggered popups, thorns requires active block
function resolveCombatImpact(p1Wins, p2Wins) {
  let p1RawDmg = 0, p1ChipHits = 0, p1BurstHits = 0, p1Block = 0, p1Gold = 0;
  let p2RawDmg = 0, p2ChipHits = 0, p2BurstHits = 0, p2Block = 0, p2Gold = 0;

  let p1Acid = state.p1.passives.acidLevel ? state.p1.passives.acidLevel * 2 : 0;
  let p2Acid = state.p2.passives.acidLevel ? state.p2.passives.acidLevel * 2 : 0;

  p1Wins.forEach(w => {
    if (w.type === 'blade') {
      if (w.count === 3) { p1RawDmg += SYMBOLS.blade.burstDmg; p1BurstHits++; }
      else { p1RawDmg += SYMBOLS.blade.chipDmg; p1ChipHits++; }
    } else if (w.type === 'shield') {
      p1Block += (w.count === 3) ? SYMBOLS.shield.burstBlock : SYMBOLS.shield.chipBlock;
    } else if (w.type === 'coin') {
      p1Gold += (w.count === 3) ? SYMBOLS.coin.burstGold : SYMBOLS.coin.chipGold;
    } else if (w.type === 'acid') {
      p1Acid += (w.count === 3) ? SYMBOLS.acid.burstAcid : SYMBOLS.acid.chipAcid;
    }
  });

  p2Wins.forEach(w => {
    if (w.type === 'blade') {
      if (w.count === 3) { p2RawDmg += SYMBOLS.blade.burstDmg; p2BurstHits++; }
      else { p2RawDmg += SYMBOLS.blade.chipDmg; p2ChipHits++; }
    } else if (w.type === 'shield') {
      p2Block += (w.count === 3) ? SYMBOLS.shield.burstBlock : SYMBOLS.shield.chipBlock;
    } else if (w.type === 'coin') {
      p2Gold += (w.count === 3) ? SYMBOLS.coin.burstGold : SYMBOLS.coin.chipGold;
    } else if (w.type === 'acid') {
      p2Acid += (w.count === 3) ? SYMBOLS.acid.burstAcid : SYMBOLS.acid.chipAcid;
    }
  });

  state.p1.block += p1Block;
  state.p2.block += p2Block;
  state.p1.gold += p1Gold;
  state.p2.gold += p2Gold;

  // Aegis cuts 3-in-a-row burst damage: Level 1 = 35%, Level 2 = 50%
  let finalDmgToP2 = p1RawDmg;
  if (p1BurstHits > 0 && state.p2.passives.aegisLevel > 0) {
    const cut = state.p2.passives.aegisLevel >= 2 ? 0.50 : 0.35;
    const burstPortion = p1BurstHits * SYMBOLS.blade.burstDmg;
    finalDmgToP2 = (p1RawDmg - burstPortion) + Math.round(burstPortion * (1 - cut));
  }

  let finalDmgToP1 = p2RawDmg;
  if (p2BurstHits > 0 && state.p1.passives.aegisLevel > 0) {
    const cut = state.p1.passives.aegisLevel >= 2 ? 0.50 : 0.35;
    const burstPortion = p2BurstHits * SYMBOLS.blade.burstDmg;
    finalDmgToP1 = (p2RawDmg - burstPortion) + Math.round(burstPortion * (1 - cut));
  }

  // REBALANCED THORNS: Only reflects if defender holds active Block! Capped at Level * 2 max/turn!
  let p1ThornsDmg = 0;
  if (state.p1.passives.spikesLevel > 0 && state.p1.block > 0 && (p2ChipHits > 0 || p2BurstHits > 0)) {
    const hits = p2ChipHits + p2BurstHits;
    p1ThornsDmg = Math.min(state.p1.passives.spikesLevel * 2, hits * state.p1.passives.spikesLevel);
  }

  let p2ThornsDmg = 0;
  if (state.p2.passives.spikesLevel > 0 && state.p2.block > 0 && (p1ChipHits > 0 || p1BurstHits > 0)) {
    const hits = p1ChipHits + p1BurstHits;
    p2ThornsDmg = Math.min(state.p2.passives.spikesLevel * 2, hits * state.p2.passives.spikesLevel);
  }

  // Acid ticks directly through shields & ignores thorns
  state.p1.hp -= p2Acid;
  state.p2.hp -= p1Acid;

  let p1DamageTaken = 0;
  if (finalDmgToP1 > 0) {
    const blocked = Math.min(state.p1.block, finalDmgToP1);
    state.p1.block -= blocked;
    p1DamageTaken = finalDmgToP1 - blocked;
    state.p1.hp -= p1DamageTaken;
    if (p1DamageTaken > 0) sfx.hit(); else sfx.shield();
  }

  let p2DamageTaken = 0;
  if (finalDmgToP2 > 0) {
    const blocked = Math.min(state.p2.block, finalDmgToP2);
    state.p2.block -= blocked;
    p2DamageTaken = finalDmgToP2 - blocked;
    state.p2.hp -= p2DamageTaken;
  }

  if (p1ThornsDmg > 0) state.p2.hp -= p1ThornsDmg;
  if (p2ThornsDmg > 0) state.p1.hp -= p2ThornsDmg;

  // Staggered Popups Queues
  const p1Queue = [];
  const p2Queue = [];

  if (p1Block > 0) p1Queue.push({ text: `🛡️ +${p1Block}`, color: '#00e5ff' });
  if (p1Gold > 0) p1Queue.push({ text: `🪙 +${p1Gold}g`, color: '#fae100' });
  if (finalDmgToP1 > 0) {
    if (p1DamageTaken > 0) p1Queue.push({ text: `💥 -${p1DamageTaken}`, color: '#ff1493' });
    else p1Queue.push({ text: `🛡️ BLOCKED`, color: '#00e5ff' });
  }
  if (p2Acid > 0) p1Queue.push({ text: `🧪 -${p2Acid} ACID`, color: '#39ff14' });
  if (p2ThornsDmg > 0) p1Queue.push({ text: `🦔 -${p2ThornsDmg} THORNS`, color: '#fae100' });

  if (p2Block > 0) p2Queue.push({ text: `🛡️ +${p2Block}`, color: '#00e5ff' });
  if (p2Gold > 0) p2Queue.push({ text: `🪙 +${p2Gold}g`, color: '#fae100' });
  if (finalDmgToP2 > 0) {
    if (p2DamageTaken > 0) p2Queue.push({ text: `💥 -${p2DamageTaken}`, color: '#ff1493' });
    else p2Queue.push({ text: `🛡️ BLOCKED`, color: '#00e5ff' });
  }
  if (p1Acid > 0) p2Queue.push({ text: `🧪 -${p1Acid} ACID`, color: '#39ff14' });
  if (p1ThornsDmg > 0) p2Queue.push({ text: `🦔 -${p1ThornsDmg} THORNS`, color: '#fae100' });

  triggerStaggeredPopups('p1', p1Queue);
  triggerStaggeredPopups('p2', p2Queue);

  // Underdog Fever
  const p1Underdog = state.p1.hp < state.p2.hp ? 1.5 : 1.0;
  const p2Underdog = state.p2.hp < state.p1.hp ? 1.5 : 1.0;

  if (p1DamageTaken > 0 || p1Wins.length === 0) {
    const gain = Math.round((p1DamageTaken * 2.0 + (p1Wins.length === 0 ? 12 : 0)) * p1Underdog);
    state.p1.fever = Math.min(100, state.p1.fever + gain);
  }
  if (p2DamageTaken > 0 || p2Wins.length === 0) {
    const gain = Math.round((p2DamageTaken * 2.0 + (p2Wins.length === 0 ? 12 : 0)) * p2Underdog);
    state.p2.fever = Math.min(100, state.p2.fever + gain);
  }

  document.getElementById('p1-combat-log').textContent = `You dealt ${p1RawDmg} dmg (${p1ChipHits} chip, ${p1BurstHits} burst)`;
  document.getElementById('p2-combat-log').textContent = `Enemy dealt ${p2RawDmg} dmg (${p2ChipHits} chip, ${p2BurstHits} burst)`;

  renderStats();
}

function openShopModal() {
  document.getElementById('shop-wallet-gold').textContent = `${state.p1.gold}g`;
  renderReelModderStrips();
  renderRelicShop();
  renderEnemyScoutStrips();
  document.getElementById('shop-modal').classList.remove('hidden');
}

function setShopTab(tab) {
  ['reels', 'relics', 'scout'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle('hidden', t !== tab);
    const btn = document.getElementById(`tab-btn-${t}`);
    if (t === tab) {
      btn.className = 'neo-btn neo-btn-yellow text-xs py-1.5 px-3 font-display font-black';
    } else {
      btn.className = 'neo-btn neo-btn-white text-xs py-1.5 px-3 font-display font-black';
    }
  });
}

function renderReelModderStrips() {
  const container = document.getElementById('reel-strips-editor');
  container.innerHTML = '';

  for (let rIdx = 0; rIdx < 3; rIdx++) {
    const reelCard = document.createElement('div');
    reelCard.className = 'bg-white border-2 border-ink p-2.5 flex flex-col gap-1.5 shadow-[3px_3px_0px_#1c1b1b]';
    reelCard.innerHTML = `
      <div class="flex items-center justify-between border-b border-ink pb-1">
        <span class="font-display font-black text-xs uppercase text-ink">REEL #${rIdx + 1} STRIP</span>
        <span class="font-mono text-[9px] text-gray-500">${STRIP_LEN} Slots</span>
      </div>
      <div class="grid grid-cols-4 gap-1.5 pt-1" id="reel-slots-grid-${rIdx}"></div>
    `;
    container.appendChild(reelCard);

    const slotsGrid = reelCard.querySelector(`#reel-slots-grid-${rIdx}`);
    state.p1.reels[rIdx].forEach((symKey, sIdx) => {
      const sym = SYMBOLS[symKey] || SYMBOLS.blank;
      const slotBtn = document.createElement('button');
      const isSelected = state.selectedSlot && state.selectedSlot.reelIdx === rIdx && state.selectedSlot.slotIdx === sIdx;
      slotBtn.className = `p-1 border-2 border-ink flex flex-col items-center justify-center transition-all ${
        isSelected ? 'bg-yellow-200 ring-2 ring-primary-magenta scale-105 shadow-[2px_2px_0px_#1c1b1b]' : 'bg-canvas hover:bg-yellow-50'
      }`;
      slotBtn.innerHTML = `
        <span class="font-mono text-[8px] font-bold text-gray-500">#${sIdx + 1}</span>
        <img src="${sym.iconUrl}" alt="${sym.name}" class="w-8 h-8 object-contain my-0.5 pointer-events-none"/>
        <span class="font-mono text-[8px] font-black uppercase truncate max-w-full">${sym.name}</span>
      `;
      slotBtn.onclick = () => selectSlotToModify(rIdx, sIdx);
      slotsGrid.appendChild(slotBtn);
    });
  }
}

function selectSlotToModify(reelIdx, slotIdx) {
  state.selectedSlot = { reelIdx, slotIdx };
  document.getElementById('selected-slot-indicator').textContent = `Reel #${reelIdx + 1}, Slot #${slotIdx + 1} Selected`;
  renderReelModderStrips();
}

function initSymbolCardDraft() {
  const container = document.getElementById('symbol-card-draft');
  container.innerHTML = '';

  const draftable = ['blade', 'shield', 'coin', 'acid', 'freeze', 'joker'];
  draftable.forEach(key => {
    const sym = SYMBOLS[key];
    const card = document.createElement('div');
    card.className = 'bg-yellow-50 border-2 border-ink p-2 flex flex-col items-center text-center justify-between gap-1 shadow-[2px_2px_0px_#1c1b1b]';
    card.innerHTML = `
      <img src="${sym.iconUrl}" alt="${sym.name}" class="w-9 h-9 object-contain"/>
      <div class="font-display font-black text-[10px] uppercase leading-none mt-1">${sym.name}</div>
      <div class="font-mono text-[9px] text-gray-600 leading-tight">${sym.cost}g</div>
      <button onclick="applySymbolToSelectedSlot('${key}', ${sym.cost})" class="neo-btn ${state.p1.gold >= sym.cost ? 'neo-btn-lime' : 'neo-btn-white opacity-50 cursor-not-allowed'} text-[9px] py-1 px-1.5 w-full mt-1 font-mono font-bold">
        INSTALL
      </button>
    `;
    container.appendChild(card);
  });
}

function applySymbolToSelectedSlot(symKey, cost) {
  if (!state.selectedSlot) {
    alert('Please click a slot on Reel 1, 2, or 3 first to select where to install this symbol!');
    return;
  }
  if (state.p1.gold < cost) {
    alert('Not enough gold! Earn gold by landing Coin matches on paylines.');
    return;
  }

  state.p1.gold -= cost;
  sfx.ding();

  const { reelIdx, slotIdx } = state.selectedSlot;
  state.p1.reels[reelIdx][slotIdx] = symKey;

  buildPhysicalReelStrips('p1');
  setReelOffsets('p1', state.p1.offsets);

  renderStats();
  document.getElementById('shop-wallet-gold').textContent = `${state.p1.gold}g`;
  renderReelModderStrips();
}

// PROGRESSIVE SCALING COSTS & LEVEL CAPS FOR RELICS
function renderRelicShop() {
  const container = document.getElementById('shop-cards-container');
  container.innerHTML = '';

  const p1p = state.p1.passives;

  // Spikes Scaling: Lvl 1 (6g), Lvl 2 (12g), Lvl 3 (20g). Max 3.
  const spikesCosts = [6, 12, 20];
  const spikesCurLvl = p1p.spikesLevel || 0;
  const spikesMaxed = spikesCurLvl >= 3;
  const spikesCost = spikesMaxed ? 0 : spikesCosts[spikesCurLvl];

  // Aegis Scaling: Lvl 1 (7g, -35%), Lvl 2 (14g, -50%). Max 2.
  const aegisCosts = [7, 14];
  const aegisCurLvl = p1p.aegisLevel || 0;
  const aegisMaxed = aegisCurLvl >= 2;
  const aegisCost = aegisMaxed ? 0 : aegisCosts[aegisCurLvl];

  // Acid Scaling: Lvl 1 (5g, +2 DoT), Lvl 2 (11g, +4 DoT), Lvl 3 (18g, +6 DoT). Max 3.
  const acidCosts = [5, 11, 18];
  const acidCurLvl = p1p.acidLevel || 0;
  const acidMaxed = acidCurLvl >= 3;
  const acidCost = acidMaxed ? 0 : acidCosts[acidCurLvl];

  // Heal Scaling: 5g, 11g, 17g, 23g...
  const healCost = 5 + (p1p.healsBought || 0) * 6;

  const relics = [
    {
      id: 'spikes',
      name: 'Spike Mail',
      curLvl: spikesCurLvl,
      maxLvl: 3,
      maxed: spikesMaxed,
      cost: spikesCost,
      icon: '🦔',
      badge: `Lvl ${spikesCurLvl}/3`,
      desc: spikesMaxed ? 'Max Level. Reflects 3 thorns when holding block.' : `Next Lvl: +1 Thorns parry (only when holding block; max ${spikesCurLvl+1}/hit).`
    },
    {
      id: 'aegis',
      name: 'Iron Aegis',
      curLvl: aegisCurLvl,
      maxLvl: 2,
      maxed: aegisMaxed,
      cost: aegisCost,
      icon: '🛡️',
      badge: `Lvl ${aegisCurLvl}/2`,
      desc: aegisMaxed ? 'Max Level. Absorbs 50% of 3-in-a-row Burst nukes.' : (aegisCurLvl === 0 ? 'Lvl 1: Cuts burst damage by 35%.' : 'Lvl 2: Cuts burst damage by 50%.')
    },
    {
      id: 'acid',
      name: 'Acid Flask',
      curLvl: acidCurLvl,
      maxLvl: 3,
      maxed: acidMaxed,
      cost: acidCost,
      icon: '🧪',
      badge: `Lvl ${acidCurLvl}/3`,
      desc: acidMaxed ? 'Max Level. +6 true DoT every turn that bypasses block.' : `Next Lvl: +${(acidCurLvl+1)*2} true DoT (bypasses block & spikes).`
    },
    {
      id: 'heal',
      name: 'First Aid Kit',
      curLvl: p1p.healsBought || 0,
      maxLvl: 99,
      maxed: false,
      cost: healCost,
      icon: '💖',
      badge: `Heal #${(p1p.healsBought||0)+1}`,
      desc: 'Restores +25 HP immediately. Cost rises +6g each purchase.'
    }
  ];

  relics.forEach(item => {
    const card = document.createElement('div');
    card.className = 'bg-white border-2 border-ink p-3 flex flex-col justify-between gap-2 shadow-[3px_3px_0px_#1c1b1b]';
    
    let btnHtml;
    if (item.maxed) {
      btnHtml = `<button disabled class="neo-btn neo-btn-white opacity-40 cursor-not-allowed font-mono text-xs font-black py-1 px-2.5">MAXED OUT</button>`;
    } else {
      const canAfford = state.p1.gold >= item.cost;
      btnHtml = `
        <button onclick="buyRelic('${item.id}', ${item.cost})" class="neo-btn ${canAfford ? 'neo-btn-yellow' : 'neo-btn-white opacity-50 cursor-not-allowed'} font-mono text-xs font-black py-1 px-2.5 flex items-center justify-between">
          <span>UPGRADE</span>
          <span>${item.cost}g</span>
        </button>
      `;
    }

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between">
          <span class="text-xl">${item.icon}</span>
          <span class="font-mono text-[10px] font-black bg-yellow-200 px-1.5 py-0.5 border border-ink">${item.badge}</span>
        </div>
        <h4 class="font-display font-black text-xs uppercase text-ink mt-1.5">${item.name}</h4>
        <p class="font-body text-[11px] text-gray-700 mt-0.5">${item.desc}</p>
      </div>
      ${btnHtml}
    `;
    container.appendChild(card);
  });
}

function buyRelic(id, cost) {
  if (state.p1.gold < cost) return;
  state.p1.gold -= cost;
  sfx.ding();

  if (id === 'spikes') state.p1.passives.spikesLevel = (state.p1.passives.spikesLevel || 0) + 1;
  if (id === 'aegis') state.p1.passives.aegisLevel = (state.p1.passives.aegisLevel || 0) + 1;
  if (id === 'acid') state.p1.passives.acidLevel = (state.p1.passives.acidLevel || 0) + 1;
  if (id === 'heal') {
    state.p1.passives.healsBought = (state.p1.passives.healsBought || 0) + 1;
    state.p1.hp = Math.min(state.p1.maxHp, state.p1.hp + 25);
  }

  renderStats();
  document.getElementById('shop-wallet-gold').textContent = `${state.p1.gold}g`;
  renderRelicShop();
}

function renderEnemyScoutStrips() {
  const container = document.getElementById('enemy-reel-strips-view');
  container.innerHTML = '';

  for (let rIdx = 0; rIdx < 3; rIdx++) {
    const reelCard = document.createElement('div');
    reelCard.className = 'bg-yellow-50 border-2 border-ink p-2.5 flex flex-col gap-1.5 shadow-[3px_3px_0px_#1c1b1b]';
    reelCard.innerHTML = `
      <span class="font-display font-black text-[11px] uppercase text-ink border-b border-ink pb-1">ENEMY REEL #${rIdx + 1}</span>
      <div class="grid grid-cols-4 gap-1 pt-1" id="enemy-slots-grid-${rIdx}"></div>
    `;
    container.appendChild(reelCard);

    const slotsGrid = reelCard.querySelector(`#enemy-slots-grid-${rIdx}`);
    state.p2.reels[rIdx].forEach((symKey, sIdx) => {
      const sym = SYMBOLS[symKey] || SYMBOLS.blank;
      const cell = document.createElement('div');
      cell.className = 'p-1 border border-ink flex flex-col items-center justify-center bg-white';
      cell.innerHTML = `
        <span class="font-mono text-[7px] text-gray-400">#${sIdx + 1}</span>
        <img src="${sym.iconUrl}" alt="${sym.name}" class="w-6 h-6 object-contain pointer-events-none"/>
      `;
      slotsGrid.appendChild(cell);
    });
  }
}

function closeShopAndReady() {
  document.getElementById('shop-modal').classList.add('hidden');
  renderSeriesScoreboard();

  if (state.mode === 'bot') {
    botAdjustBuild();
  }

  renderStats();
  document.getElementById('p1-combat-log').textContent = `Game ${state.series.gameNumber} ready. Spin reels!`;
}

function botAdjustBuild() {
  if (state.p1.passives.spikesLevel > 0) {
    state.p2.archetype = 'acid';
    document.getElementById('p2-archetype-tag').textContent = "Toxic Acid";
    state.p2.passives.acidLevel = 2;
    state.p2.passives.spikesLevel = 0;
  } else if (state.p1.passives.aegisLevel > 0) {
    state.p2.archetype = 'chip';
    document.getElementById('p2-archetype-tag').textContent = "Multi-Chip Thorns";
    state.p2.passives.spikesLevel = 1;
  }
}

function renderStats() {
  document.getElementById('p1-hp-text').textContent = Math.max(0, state.p1.hp);
  document.getElementById('p1-hp-bar').style.width = `${Math.max(0, (state.p1.hp / state.p1.maxHp) * 100)}%`;
  document.getElementById('p1-gold').textContent = `${state.p1.gold}g`;
  document.getElementById('p1-fever-text').textContent = `${state.p1.fever}%`;
  document.getElementById('p1-fever-bar').style.width = `${state.p1.fever}%`;

  const p1BlockEl = document.getElementById('p1-block-pill');
  if (state.p1.block > 0) {
    p1BlockEl.classList.remove('hidden');
    document.getElementById('p1-block-text').textContent = state.p1.block;
  } else {
    p1BlockEl.classList.add('hidden');
  }
  renderPassives('p1');

  document.getElementById('p2-hp-text').textContent = Math.max(0, state.p2.hp);
  document.getElementById('p2-hp-bar').style.width = `${Math.max(0, (state.p2.hp / state.p2.maxHp) * 100)}%`;
  document.getElementById('p2-fever-text').textContent = `${state.p2.fever}%`;
  document.getElementById('p2-fever-bar').style.width = `${state.p2.fever}%`;

  const p2BlockEl = document.getElementById('p2-block-pill');
  if (state.p2.block > 0) {
    p2BlockEl.classList.remove('hidden');
    document.getElementById('p2-block-text').textContent = state.p2.block;
  } else {
    p2BlockEl.classList.add('hidden');
  }
  renderPassives('p2');
}

function renderPassives(playerKey) {
  const container = document.getElementById(`${playerKey}-passives`);
  const p = state[playerKey].passives;
  let html = '<span class="text-[9px] font-mono uppercase text-gray-400">Status:</span>';
  let hasAny = false;

  if (p.spikesLevel > 0) {
    hasAny = true;
    html += `<span class="bg-primary-magenta text-white text-[9px] font-mono font-bold px-1.5 py-0.5 border border-ink shadow-[1px_1px_0px_#1c1b1b]">🦔 Spikes (Lvl ${p.spikesLevel}: +${p.spikesLevel})</span>`;
  }
  if (p.aegisLevel > 0) {
    hasAny = true;
    html += `<span class="bg-electric-cyan text-ink text-[9px] font-mono font-bold px-1.5 py-0.5 border border-ink shadow-[1px_1px_0px_#1c1b1b]">🛡️ Iron Aegis (-${p.aegisLevel >= 2 ? 50 : 35}% Burst)</span>`;
  }
  if (p.acidLevel > 0) {
    hasAny = true;
    html += `<span class="bg-acid-lime text-ink text-[9px] font-mono font-bold px-1.5 py-0.5 border border-ink shadow-[1px_1px_0px_#1c1b1b]">🧪 Acid DoT (+${p.acidLevel * 2})</span>`;
  }

  if (!hasAny) {
    html += `<span class="text-[9px] font-mono text-gray-500 italic">${playerKey === 'p1' ? 'Standard Loadout' : 'Burst Setup'}</span>`;
  }
  container.innerHTML = html;
}

function triggerMatchChampionship() {
  const isWin = state.series.p1Wins >= state.series.targetWins;
  document.getElementById('go-icon').textContent = isWin ? '🏆' : '💀';
  document.getElementById('go-title').textContent = isWin ? 'CHAMPIONSHIP VICTORY!' : 'SERIES DEFEAT';
  document.getElementById('go-desc').textContent = isWin 
    ? `You conquered the Best-of-7 match (${state.series.p1Wins} - ${state.series.p2Wins}) with superior machine tuning!`
    : `The opponent won the series (${state.series.p2Wins} - ${state.series.p1Wins}). Refine your counters and rematch!`;
  document.getElementById('go-series-score').textContent = `${state.series.p1Wins} - ${state.series.p2Wins}`;
  document.getElementById('go-games-count').textContent = `${state.series.gameNumber} Games Played`;
  document.getElementById('go-counter').textContent = state.p1.passives.aegisLevel > 0 ? 'Iron Aegis' : (state.p1.passives.spikesLevel > 0 ? 'Thorns Parry' : 'Reel Striker');

  document.getElementById('game-over-modal').classList.remove('hidden');
}

function resetFullMatch() {
  state.series.p1Wins = 0;
  state.series.p2Wins = 0;
  state.series.gameNumber = 1;

  state.p1.hp = 100;
  state.p1.block = 0;
  state.p1.gold = 10;
  state.p1.fever = 0;
  state.p1.passives = { spikesLevel: 0, aegisLevel: 0, acidLevel: 0, healsBought: 0 };

  state.p2.hp = 100;
  state.p2.block = 0;
  state.p2.gold = 10;
  state.p2.fever = 0;
  state.p2.passives = { spikesLevel: 0, aegisLevel: 0, acidLevel: 0, healsBought: 0 };

  document.getElementById('game-over-modal').classList.add('hidden');
  renderSeriesScoreboard();
  renderStats();
  document.getElementById('prematch-modal').classList.remove('hidden');
}

function setMode(mode) {
  if (mode === 'bot') {
    state.mode = 'bot';
  } else if (mode === 'host') {
    startHosting();
  }
}

function startHosting() {
  state.mode = 'network';
  state.isHost = true;
  const room = 'slots-' + Math.floor(1000 + Math.random() * 9000);
  document.getElementById('net-status-text').textContent = `Hosting: ${room}`;
  document.getElementById('copy-room-btn').classList.remove('hidden');

  try {
    state.peer = new Peer(room);
    state.peer.on('connection', conn => {
      state.conn = conn;
      setupConnection(conn);
      document.getElementById('net-status-text').textContent = `Connected to P2!`;
      document.getElementById('p2-name').textContent = 'Network Rival';
    });
  } catch (err) {
    console.error('Peer error:', err);
  }
}

function openJoinModal() { document.getElementById('join-modal').classList.remove('hidden'); }
function closeJoinModal() { document.getElementById('join-modal').classList.add('hidden'); }

function confirmJoinRoom() {
  const room = document.getElementById('join-room-input').value.trim();
  if (!room) return;
  closeJoinModal();
  connectToPeer(room);
}

function connectToPeer(room) {
  state.mode = 'network';
  state.isHost = false;
  document.getElementById('net-status-text').textContent = `Connecting: ${room}...`;

  try {
    state.peer = new Peer();
    state.peer.on('open', () => {
      const conn = state.peer.connect(room);
      state.conn = conn;
      setupConnection(conn);
      document.getElementById('net-status-text').textContent = `Connected: ${room}!`;
      document.getElementById('p2-name').textContent = 'Room Host';
    });
  } catch (err) {
    console.error('Join error:', err);
  }
}

function setupConnection(conn) {
  conn.on('data', data => {
    if (data.type === 'SPIN_START') {
      triggerSpin();
    }
  });
}

function copyInviteLink() {
  const url = `${window.location.origin}${window.location.pathname}?room=${document.getElementById('net-status-text').textContent.split(': ')[1] || ''}`;
  navigator.clipboard.writeText(url);
  alert('Room invite link copied to clipboard!');
}

init();
