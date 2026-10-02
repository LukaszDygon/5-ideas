// Grow Your Own: pixel art. 16x16 sprites as palette strings, plus procedural tile painters.

export const TILE = 16;

export const PALETTE = {
  k: '#1c1b1b', // ink
  w: '#ffffff',
  y: '#fae100', // tertiary yellow
  m: '#b40065', // primary magenta
  p: '#ff1493', // neon pink
  c: '#00e5ff', // electric cyan
  t: '#008190', // secondary cyan
  o: '#ff5e00', // vivid orange
  l: '#39ff14', // acid lime
  g: '#2fae4a',
  d: '#1d7a35',
  b: '#a8642d',
  n: '#5e3518',
  s: '#f0d29a',
  f: '#f4b183', // skin
  r: '#e8343a',
  e: '#9a9a9a',
  u: '#8e5bd8',
};

export const SPRITES = {
  soilSack: [
    '................',
    '......kkkk......',
    '.....kbnnbk.....',
    '......kbbk......',
    '.....kkbbkk.....',
    '....kbbbbbbk....',
    '...kbbbbbbbbk...',
    '..kbbkkkkkkbbk..',
    '..kbkyyyyyykbk..',
    '..kbkyknnkykbk..',
    '..kbkyyyyyykbk..',
    '..kbbkkkkkkbbk..',
    '..kbbbbbbbbbbk..',
    '..knbbbbbbbbnk..',
    '...kkkkkkkkkk...',
    '................',
  ],
  sun: [
    '................',
    '.......oo.......',
    '..o....oo....o..',
    '...o........o...',
    '......kkkk......',
    '.....kyyyyk.....',
    '....kyyyyyyk....',
    '.oo.kykyykyk.oo.',
    '.oo.kyyyyyyk.oo.',
    '....kykkkkyk....',
    '.....kyyyyk.....',
    '......kkkk......',
    '...o........o...',
    '..o....oo....o..',
    '.......oo.......',
    '................',
  ],
  thermometer: [
    '................',
    '......kkkk......',
    '.....kwwwwk.....',
    '.....kwkkwk.c.c.',
    '.....kwwwwk..c..',
    '.....kwkkwk.c.c.',
    '.....kwrrwk.....',
    '.....kwrrwk.....',
    '.....kwrrwk.....',
    '.....kwrrwk.....',
    '....kkwrrwkk....',
    '...kwrrrrrrwk...',
    '...kwrrrrrrwk...',
    '...kwrrrrrrwk...',
    '....kwwrrwwk....',
    '.....kkkkkk.....',
  ],
  calendar: [
    '................',
    '...k..k..k..k...',
    '..kkkkkkkkkkkk..',
    '..kmmmmmmmmmmk..',
    '..kmmmmmmmmmmk..',
    '..kkkkkkkkkkkk..',
    '..kwwwwwwwwwwk..',
    '..kwkwkwkwkwwk..',
    '..kwwwwwwwwwwk..',
    '..kwkwkwkwkwwk..',
    '..kwwwwwwwwwwk..',
    '..kwkwkwkrrwwk..',
    '..kwwwwwwrrwwk..',
    '..kwwwwwwwwwwk..',
    '..kkkkkkkkkkkk..',
    '................',
  ],
  seedTray: [
    '................',
    '................',
    '................',
    '................',
    '..l.l.l.l.l.l...',
    '...g...g...g....',
    '...g...g...g....',
    '.kkkkkkkkkkkkkk.',
    '.knnnnnnnnnnnnk.',
    '.knbnnnbnnnbnnk.',
    '.kkkkkkkkkkkkkk.',
    '.kttttttttttttk.',
    '.kkkkkkkkkkkkkk.',
    '................',
    '................',
    '................',
  ],
  plugTray: [
    '................',
    '.kkkkkkkkkkkkkk.',
    '.kglgkglgkgglgk.',
    '.kgggkgggkggggk.',
    '.kdgdkdgdkdggdk.',
    '.kkkkkkkkkkkkkk.',
    '.kglgknnnkgglgk.',
    '.kgggknnnkggggk.',
    '.kdgdknnnkdggdk.',
    '.kkkkkkkkkkkkkk.',
    '.kglgkglgkgglgk.',
    '.kgggkgggkggggk.',
    '.kdgdkdgdkdggdk.',
    '.kkkkkkkkkkkkkk.',
    '.kttttttttttttk.',
    '.kkkkkkkkkkkkkk.',
  ],
  coldFrame: [
    '................',
    '..kkkkkkkkkkkk..',
    '..kcwcccccccck..',
    '..kccwccccccck..',
    '..kcccwcccccck..',
    '..kkkkkkkkkkkk..',
    '..k..........k..',
    '.kkkkkkkkkkkkkk.',
    '.kbbbbbbbbbbbbk.',
    '.kbkkkkkkkkkkbk.',
    '.kbkgl.gl.glkbk.',
    '.kbkggnggnggkbk.',
    '.kbkkkkkkkkkkbk.',
    '.kbbbbbbbbbbbbk.',
    '.kkkkkkkkkkkkkk.',
    '................',
  ],
  wateringCan: [
    '................',
    '................',
    '....kkkkkk......',
    '...k......k.....',
    '...k......k..kkk',
    '.kkkkkkkkkkk.kck',
    '.kttttttttttkck.',
    '.ktwwtttttttkk..',
    '.ktwttttttttk...',
    '.kttttttttttk...',
    '.kttttttttttk...',
    '.kttttttttttk...',
    '.kkkkkkkkkkkk...',
    '..............c.',
    '.............c..',
    '...............c',
  ],
  potatoes: [
    '................',
    '................',
    '................',
    '......l..l......',
    '......g..g......',
    '.....kkkkkk.....',
    '....kssbsssk....',
    '....ksssssbk....',
    '..kkkkkkkkkkkk..',
    '.ksssbskksbsssk.',
    '.ksbssskkssssbk.',
    '.kssssskksssssk.',
    '..kkkkk..kkkkk..',
    '................',
    '................',
    '................',
  ],
  beans: [
    '.......kk.......',
    '.......bb.......',
    '......bggb......',
    '......bgrb......',
    '.....gbgbbg.....',
    '.....bg.b.rb....',
    '....gb..bg.gb...',
    '....bgr.bg..b...',
    '...gb...bgg.rb..',
    '...b.g..b....bg.',
    '..rb...gbg...gb.',
    '..bg....b.....b.',
    '.gb.....b.....bg',
    '.b......b......b',
    'nnnnnnnnnnnnnnnn',
    '................',
  ],
  lettuce: [
    '................',
    '................',
    '......kkkk......',
    '....kkddddkk....',
    '...kdddggdddk...',
    '..kddggggggddk..',
    '..kdggglllggdk..',
    '.kddgglllllgddk.',
    '.kdgglllllllgdk.',
    '.kddgglllllgddk.',
    '..kdggglllggdk..',
    '..kddggggggddk..',
    '...kdddggdddk...',
    '....kkddddkk....',
    '......kkkk......',
    '................',
  ],
  garlic: [
    '................',
    '................',
    '........l.......',
    '.......lg.......',
    '......kwwk......',
    '.....kwwwwk.....',
    '....kwwuwwwk....',
    '...kwwuwwuwwk...',
    '...kwuwwwwuwk...',
    '...kwuwwwwuwk...',
    '...kwwuwwuwwk...',
    '....kwwuwwwk....',
    '.....kkkkkk.....',
    '......n.nn......',
    '................',
    '................',
  ],
  compostBin: [
    '................',
    '......kkkk......',
    '.....kttttk.....',
    '...kkkkkkkkkk...',
    '..kttttttttttk..',
    '..kkkkkkkkkkkk..',
    '...kttttttttk...',
    '...ktwttttttk...',
    '...ktwttgtttk...',
    '...kttttgdttk...',
    '...kttttttttk...',
    '...kttttttttk...',
    '..kkkkkkkkkkkk..',
    '..knbnnbnnbnnk..',
    '..kkkkkkkkkkkk..',
    '................',
  ],
  snail: [
    '................',
    '................',
    '............k.k.',
    '............k.k.',
    '....kkkkk...k.k.',
    '...kpppppk..kkk.',
    '..kppkkkppk.ksk.',
    '..kpkpppkpk.ksk.',
    '..kpkpkkpkpkksk.',
    '..kpkppkkpkksssk',
    '..kppkkkppksssk.',
    '.kkkpppppkssssk.',
    'kssskkkkkssssk..',
    '.kkkkkkkkkkkk...',
    '..e..e..e.......',
    '................',
  ],
  wheelbarrow: [
    '................',
    '................',
    '................',
    '..nbnnbnnbn.....',
    '.knnnnnnnnnk....',
    '.kmmmmmmmmmk....',
    '..kmmmmmmmmkkkkk',
    '...kmmmmmmk.....',
    '....kkkkkk......',
    '...kk...k.......',
    '..keek..k.......',
    '..keek..kk......',
    '...kk...........',
    '................',
    '................',
    '................',
  ],
  hedgehog: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '....k.k.k.k.....',
    '...knknknknk....',
    '..knbnnbnnbnk...',
    '.knnnbnnnbnnsk..',
    '.knbnnnbnnsssk..',
    '.knnnbnnnsskssk.',
    '..knnnnnsssssskk',
    '...kkkkkkkkkkk..',
    '....kk....kk....',
    '................',
    '................',
  ],
  sign: [
    '................',
    '................',
    '.kkkkkkkkkkkkkk.',
    '.kyyyyyyyyyyyyk.',
    '.kykkkykkkkyyyk.',
    '.kyyyyyyyyyyyyk.',
    '.kykkkkkykkkyyk.',
    '.kyyyyyyyyyyyyk.',
    '.kkkkkkkkkkkkkk.',
    '......kbbk......',
    '......kbbk......',
    '......kbbk......',
    '......kbbk......',
    '.....kkkkkk.....',
    '................',
    '................',
  ],
};

// The gardener. Rows 6-8 (the face) change with the facing direction.
const PLAYER = [
  '................',
  '.....kkkkkk.....',
  '....kyyyyyyk....',
  '..kkyyyyyyyykk..',
  '.kyyyppppppyyyk.',
  '..kkkkkkkkkkkk..',
  '....kffffffk....',
  '....kfkffkfk....',
  '....kffffffk....',
  '...kkkttttkkk...',
  '..kfkttttttkfk..',
  '..kfkttyyttkfk..',
  '...kkttttttkk...',
  '....kttkkttk....',
  '....knnkknnk....',
  '....kkkkkkkk....',
];
const FACES = {
  down: ['....kffffffk....', '....kfkffkfk....', '....kffffffk....'],
  left: ['....kffffffk....', '....kkffkffk....', '....kffffffk....'],
  right: ['....kffffffk....', '....kffkffkk....', '....kffffffk....'],
  up: ['....knnnnnnk....', '....knnnnnnk....', '....knnnnnnk....'],
};

export function playerRows(dir) {
  const rows = PLAYER.slice();
  rows.splice(6, 3, ...FACES[dir]);
  return rows;
}

// Paint palette rows into a 16x16 canvas; `tint` paints every pixel one colour (for hard shadows).
export function makeSprite(rows, tint) {
  const cv = document.createElement('canvas');
  cv.width = TILE;
  cv.height = TILE;
  const ctx = cv.getContext('2d');
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = tint || PALETTE[ch];
      ctx.fillRect(x, y, 1, 1);
    });
  });
  return cv;
}

// Deterministic per-tile randomness so the garden looks the same on every visit.
function rng(x, y, salt = 0) {
  let a = (x * 73856093) ^ (y * 19349663) ^ (salt * 83492791);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const C = {
  grass: '#5cc85a',
  grassDark: '#3fa748',
  path: '#f0d29a',
  pebble: '#d6ae6c',
  hedge: '#1f7a35',
  hedgeLight: '#2fae4a',
  floor: '#dfa465',
  floorLine: '#b97a3e',
  wall: '#b40065',
  wallLine: '#86004b',
  tileA: '#ffffff',
  tileB: '#c9f6fb',
  glass: '#00e5ff',
  glassFrame: '#008190',
  soil: '#7a4a26',
  soilDark: '#5e3518',
  water: '#00b4d8',
  waterLight: '#9ff3ff',
};

function px(ctx, color, x, y, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function grass(ctx, x, y, r) {
  px(ctx, C.grass, x, y, TILE, TILE);
  for (let i = 0; i < 5; i++) {
    const tx = x + Math.floor(r() * 14) + 1;
    const ty = y + Math.floor(r() * 13) + 2;
    px(ctx, C.grassDark, tx, ty, 1, 2);
    px(ctx, C.grassDark, tx + 1, ty + 1);
  }
}

function path(ctx, x, y, r) {
  px(ctx, C.path, x, y, TILE, TILE);
  for (let i = 0; i < 6; i++) {
    px(ctx, i % 3 ? C.pebble : PALETTE.e, x + Math.floor(r() * 15), y + Math.floor(r() * 15), 2, 1);
  }
}

function flowers(ctx, x, y, r) {
  grass(ctx, x, y, r);
  const petals = [PALETTE.p, PALETTE.y, PALETTE.c, PALETTE.w, PALETTE.o];
  for (let i = 0; i < 3; i++) {
    const fx = x + 2 + Math.floor(r() * 10);
    const fy = y + 2 + Math.floor(r() * 10);
    const col = petals[Math.floor(r() * petals.length)];
    px(ctx, col, fx, fy + 1, 3, 1);
    px(ctx, col, fx + 1, fy, 1, 3);
    px(ctx, PALETTE.k, fx + 1, fy + 1);
  }
}

function hedge(ctx, x, y, r) {
  px(ctx, C.hedge, x, y, TILE, TILE);
  for (let i = 0; i < 6; i++) {
    const bx = x + Math.floor(r() * 12);
    const by = y + Math.floor(r() * 12);
    px(ctx, C.hedgeLight, bx, by, 4, 3);
    px(ctx, C.hedgeLight, bx + 1, by - 1 < y ? by : by - 1, 2, 1);
  }
}

function tree(ctx, x, y, r, floor) {
  floor(ctx, x, y, r);
  px(ctx, PALETTE.k, x + 2, y + 1, 12, 13);
  px(ctx, PALETTE.k, x + 1, y + 3, 14, 9);
  px(ctx, C.hedgeLight, x + 3, y + 2, 10, 11);
  px(ctx, C.hedgeLight, x + 2, y + 4, 12, 7);
  px(ctx, PALETTE.l, x + 4, y + 4, 3, 2);
  px(ctx, C.hedge, x + 9, y + 9, 3, 2);
  px(ctx, PALETTE.r, x + 10, y + 5, 2, 2);
  px(ctx, PALETTE.r, x + 6, y + 9, 2, 2);
  px(ctx, PALETTE.k, x + 3, y + 14, 12, 1);
}

function floorBoards(ctx, x, y) {
  px(ctx, C.floor, x, y, TILE, TILE);
  for (let row = 0; row < 4; row++) {
    px(ctx, C.floorLine, x, y + row * 4 + 3, TILE, 1);
    const seam = (row * 7 + x / TILE * 5) % 16;
    px(ctx, C.floorLine, x + seam, y + row * 4, 1, 3);
  }
}

function shedWall(ctx, x, y) {
  px(ctx, C.wall, x, y, TILE, TILE);
  for (let i = 1; i < 4; i++) px(ctx, C.wallLine, x + i * 4, y, 1, TILE);
  px(ctx, PALETTE.p, x, y, TILE, 2);
}

function greenhouseFloor(ctx, x, y) {
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      px(ctx, (i + j) % 2 ? C.tileB : C.tileA, x + i * 8, y + j * 8, 8, 8);
    }
  }
}

function glass(ctx, x, y) {
  px(ctx, C.glass, x, y, TILE, TILE);
  px(ctx, C.glassFrame, x, y, TILE, 2);
  px(ctx, C.glassFrame, x + 7, y, 2, TILE);
  for (let i = 0; i < 4; i++) px(ctx, PALETTE.w, x + 2 + i, y + 9 - i, 1, 1);
  for (let i = 0; i < 3; i++) px(ctx, PALETTE.w, x + 10 + i, y + 12 - i, 1, 1);
}

function soilBed(ctx, x, y, r, ripe) {
  px(ctx, C.soil, x, y, TILE, TILE);
  for (let row = 0; row < 3; row++) px(ctx, C.soilDark, x, y + 3 + row * 5, TILE, 1);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const sx = x + 2 + col * 5;
      const sy = y + 1 + row * 5;
      px(ctx, PALETTE.g, sx, sy, 3, 2);
      px(ctx, PALETTE.l, sx + 1, sy, 1, 1);
      if (ripe && r() > 0.35) px(ctx, r() > 0.5 ? PALETTE.r : PALETTE.o, sx + 1, sy + 1, 2, 2);
    }
  }
}

function water(ctx, x, y, r) {
  px(ctx, C.water, x, y, TILE, TILE);
  for (let i = 0; i < 3; i++) {
    const wx = x + Math.floor(r() * 11) + 1;
    const wy = y + 3 + i * 5;
    px(ctx, C.waterLight, wx, wy, 3, 1);
    px(ctx, C.waterLight, wx + 3, wy - 1, 2, 1);
  }
}

function bench(ctx, x, y, r, floor) {
  floor(ctx, x, y, r);
  px(ctx, PALETTE.k, x, y + 3, TILE, 11);
  px(ctx, PALETTE.b, x, y + 4, TILE, 8);
  px(ctx, C.floorLine, x, y + 8, TILE, 1);
  px(ctx, PALETTE.n, x, y + 12, TILE, 1);
  // A terracotta pot with a seedling.
  const pxo = x + 4 + Math.floor(r() * 6);
  px(ctx, PALETTE.k, pxo - 1, y + 2, 6, 6);
  px(ctx, PALETTE.o, pxo, y + 3, 4, 4);
  px(ctx, PALETTE.g, pxo + 1, y, 2, 3);
  px(ctx, PALETTE.l, pxo, y, 1, 1);
}

function logs(ctx, x, y, r, floor) {
  floor(ctx, x, y, r);
  const ends = [
    [1, 7],
    [6, 7],
    [11, 7],
    [3, 2],
    [8, 2],
  ];
  for (const [lx, ly] of ends) {
    px(ctx, PALETTE.k, x + lx, y + ly - 1, 4, 6);
    px(ctx, PALETTE.k, x + lx - 1, y + ly, 6, 4);
    px(ctx, PALETTE.b, x + lx, y + ly, 4, 4);
    px(ctx, PALETTE.s, x + lx + 1, y + ly + 1, 2, 2);
  }
}

function streetGate(ctx, x, y, r) {
  path(ctx, x, y, r);
  px(ctx, PALETTE.k, x, y + 4, TILE, 9);
  px(ctx, PALETTE.w, x, y + 5, TILE, 2);
  px(ctx, PALETTE.w, x, y + 10, TILE, 2);
  for (let i = 0; i < 4; i++) {
    px(ctx, PALETTE.k, x + 1 + i * 4, y + 1, 3, 15);
    px(ctx, PALETTE.w, x + 2 + i * 4, y + 2, 1, 13);
  }
}

// A wooden gate across a gap in the hedge. Open gates swing back against the top post.
function gate(ctx, x, y, r, floor, open) {
  path(ctx, x, y, r);
  if (open) {
    px(ctx, PALETTE.k, x + 3, y, 13, 4);
    px(ctx, PALETTE.b, x + 4, y + 1, 11, 2);
    chevron(ctx, x, y);
    return;
  }
  px(ctx, PALETTE.k, x + 4, y, 8, TILE);
  px(ctx, PALETTE.b, x + 5, y, 6, TILE);
  px(ctx, PALETTE.n, x + 7, y, 1, TILE);
  px(ctx, PALETTE.k, x + 4, y + 3, 8, 1);
  px(ctx, PALETTE.k, x + 4, y + 12, 8, 1);
  // Padlock.
  px(ctx, PALETTE.k, x + 5, y + 5, 6, 6);
  px(ctx, PALETTE.y, x + 6, y + 7, 4, 3);
  px(ctx, PALETTE.k, x + 7, y + 8, 2, 1);
}

function chevron(ctx, x, y, flip = false) {
  const cx = x + 6;
  const cy = y + 8;
  for (let i = 0; i < 4; i++) {
    const dx = flip ? 3 - i : i;
    px(ctx, PALETTE.k, cx + dx, cy - 3 + i, 2, 1);
    px(ctx, PALETTE.k, cx + dx, cy + 3 - i, 2, 1);
  }
}

const SOLID_OUTLINE = new Set(['#', 'W', 'G', '~', 's']);

// Paint one tile. `area` gives the floor under objects; `cell(x, y)` reads neighbouring tiles.
export function paintTile(ctx, ch, tx, ty, area, cell, gateOpen) {
  const x = tx * TILE;
  const y = ty * TILE;
  const r = rng(tx, ty, area.id.length);
  const floor = { w: floorBoards, g: greenhouseFloor, '.': grass }[area.floor] || grass;
  switch (ch) {
    case '#':
      hedge(ctx, x, y, r);
      break;
    case ':':
    case '@':
      path(ctx, x, y, r);
      break;
    case '*':
      flowers(ctx, x, y, r);
      break;
    case 'T':
      tree(ctx, x, y, r, floor);
      break;
    case 'w':
      floorBoards(ctx, x, y);
      break;
    case 'W':
      shedWall(ctx, x, y);
      break;
    case 'g':
      greenhouseFloor(ctx, x, y);
      break;
    case 'G':
      glass(ctx, x, y);
      break;
    case 's':
      soilBed(ctx, x, y, r, area.ripe);
      break;
    case '~':
      water(ctx, x, y, r);
      break;
    case 'B':
      bench(ctx, x, y, r, floor);
      break;
    case 'x':
      logs(ctx, x, y, r, floor);
      break;
    case '=':
      streetGate(ctx, x, y, r);
      break;
    case '<':
      path(ctx, x, y, r);
      chevron(ctx, x - 2, y, true);
      break;
    case '>':
      gate(ctx, x, y, r, floor, gateOpen);
      break;
    default:
      // Objects (1-4, S) and grass stand on the area's floor.
      floor(ctx, x, y, r);
  }
  if (SOLID_OUTLINE.has(ch)) {
    ctx.fillStyle = PALETTE.k;
    if (cell(tx, ty - 1) !== ch && cell(tx, ty - 1) != null) ctx.fillRect(x, y, TILE, 1);
    if (cell(tx, ty + 1) !== ch && cell(tx, ty + 1) != null) ctx.fillRect(x, y + TILE - 1, TILE, 1);
    if (cell(tx - 1, ty) !== ch && cell(tx - 1, ty) != null) ctx.fillRect(x, y, 1, TILE);
    if (cell(tx + 1, ty) !== ch && cell(tx + 1, ty) != null) ctx.fillRect(x + TILE - 1, y, 1, TILE);
  }
}
