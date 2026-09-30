// Seeded, infinite pixel planet. One world unit = one tile = one pixel of a chunk image.
// Pure data (no DOM): chunks come back as RGBA buffers the app turns into canvases.

import { B, BIOME_NAMES, isWater } from './biomes.js';
import { fbm, hash2, hashString, makeSimplex, mulberry32 } from './noise.js';
import { describeSettlement, drawSettlement, planSettlement } from './settlements.js';

export const CHUNK = 64;
const CELL = 32; // landmark cell; CHUNK / CELL is whole, so landmarks never straddle chunks
const DECO = 16; // herd / boat cell
const THERMAL_CELL = 28;
const SEA = 0.46;
const CLIMATE_PERIOD = 8000; // tiles of northward flight per full climate cycle

export { B, BIOME_NAMES, isWater };

const BASE = [
  [36, 82, 122], [62, 132, 160], [168, 204, 222], [226, 208, 160], [142, 138, 128], [112, 170, 88],
  [150, 184, 96], [58, 118, 64], [92, 140, 110], [186, 176, 98], [230, 196, 132], [42, 112, 64],
  [170, 178, 152], [52, 98, 80], [236, 240, 246], [134, 122, 110], [246, 248, 252], [78, 148, 178],
  [70, 138, 172],
];

// Landmark types: display label, Material Symbols icon, name pattern, flavour notes.
export const LANDMARKS = {
  windmill: { label: 'Windmill', icon: 'wind_power', name: (n) => `${n} Mill`, notes: [
    'The sails turn whether or not anyone needs flour.', 'Grinds oats every morning since forever.',
    'A miller naps against the south wall.' ] },
  farm: { label: 'Farmstead', icon: 'agriculture', name: (n) => `${n} Farm`, notes: [
    'Neat rows, patient cows, a very old tractor.', 'The fields are stitched together like a quilt.',
    'Lavender this year; wheat again next.' ] },
  stones: { label: 'Stone circle', icon: 'radio_button_unchecked', name: (n) => `The ${n} Stones`, notes: [
    'Nobody remembers who stood them up.', 'Sheep shelter here when it rains.',
    'They cast long shadows at midsummer.' ] },
  castle: { label: 'Castle ruins', icon: 'castle', name: (n) => `${n} Keep`, notes: [
    'The walls have been losing an argument with ivy.', 'Once besieged for a whole summer. Nobody won.',
    'Jackdaws hold court in the old towers.' ] },
  monastery: { label: 'Monastery', icon: 'church', name: (n) => `${n} Abbey`, notes: [
    'The monks brew something green and strong.', 'A bell rings for silence, which is funny.',
    'Six hundred steps up from the valley.' ] },
  peak: { label: 'Summit', icon: 'landscape', name: (n) => `Mount ${n}`, notes: [
    'A little red flag marks the top.', 'The air up here tastes of snow.',
    'Climbers leave a pebble on the cairn.' ] },
  lighthouse: { label: 'Lighthouse', icon: 'flare', name: (n) => `${n} Light`, notes: [
    'The keeper paints the stripes every spring.', 'Its beam has guided boats home for two centuries.',
    'Gulls argue on the gallery rail.' ] },
  wreck: { label: 'Shipwreck', icon: 'sailing', name: () => '', notes: [
    'Fish live in the captain\'s cabin now.', 'Went aground in a fog, everyone rowed home.',
    'At low tide you can walk to her bow.' ] },
  whales: { label: 'Whale pod', icon: 'waves', name: (n) => `${n} Whale Road`, notes: [
    'A pod surfaces, breathes, and is gone again.', 'They sing below, too low to hear from here.',
    'Calves swim close to their mothers.' ] },
  lake: { label: 'Lake', icon: 'water', name: (n) => `Lake ${n}`, notes: [
    'Still as glass this morning.', 'A single rowing boat, a single patient angler.',
    'Deep, cold and full of rumours.' ] },
  oasis: { label: 'Oasis', icon: 'nature', name: (n) => `${n} Oasis`, notes: [
    'Date palms around a pool of sweet water.', 'Caravans stop here to water their camels.',
    'Green where nothing should be green.' ] },
  camp: { label: 'Nomad camp', icon: 'camping', name: (n) => `${n} Camp`, notes: [
    'A fire, a kettle and a story going round.', 'They will move on when the grass does.',
    'Smoke drifts up from the cooking fire.' ] },
  hotspring: { label: 'Hot springs', icon: 'hot_tub', name: (n) => `${n} Springs`, notes: [
    'Steam curls up into the cold air.', 'The snow never settles around these pools.',
    'Local monkeys have claimed the best pool.' ] },
  temple: { label: 'Overgrown temple', icon: 'temple_hindu', name: (n) => `Temple of ${n}`, notes: [
    'The jungle is slowly taking it back.', 'Carved faces smile up through the vines.',
    'Parrots nest in the upper terraces.' ] },
  bridge: { label: 'River crossing', icon: 'route', name: (n) => `${n} Bridge`, notes: [
    'Five arches of old stone over quick water.', 'Trolls not included.',
    'Carts rumble over it on market days.' ] },
  fen: { label: 'Wetland', icon: 'eco', name: (n) => `${n} Fen`, notes: [
    'Herons stand very still, pretending to be reeds.', 'Frogs keep the evening chorus going.',
    'Boardwalks wind between the reed beds.' ] },
};

// Candidate landmark types per biome, most interesting first.
const BY_BIOME = {
  [B.GRASS]: ['windmill', 'farm', 'stones'],
  [B.MEADOW]: ['farm', 'windmill', 'stones'],
  [B.FOREST]: ['castle', 'stones'],
  [B.MARSH]: ['fen'],
  [B.SAVANNA]: ['camp'],
  [B.DESERT]: ['oasis', 'camp', 'castle'],
  [B.JUNGLE]: ['temple'],
  [B.TUNDRA]: ['camp', 'hotspring'],
  [B.TAIGA]: ['camp', 'hotspring'],
  [B.SNOW]: ['hotspring', 'camp'],
  [B.ROCK]: ['castle', 'monastery'],
  [B.PEAK]: ['peak'],
  [B.BEACH]: ['lighthouse'],
  [B.SHORE]: ['lighthouse'],
  [B.SHALLOW]: ['wreck'],
  [B.DEEP]: ['whales'],
  [B.RIVER]: ['bridge'],
  [B.LAKE]: ['lake'],
};
// Chance that a type is kept when picked, so the commonest terrain does not flood the map.
const KEEP = { wreck: 0.3, whales: 0.35, hotspring: 0.3, lake: 0.45, temple: 0.3, camp: 0.6, lighthouse: 0.5 };
const SETTLE = new Set([B.GRASS, B.MEADOW, B.FOREST, B.SAVANNA, B.DESERT, B.JUNGLE, B.TUNDRA, B.TAIGA, B.BEACH, B.MARSH, B.SNOW]);
const RARITY = { lighthouse: 5, peak: 4, bridge: 4, temple: 4, oasis: 4, monastery: 3, lake: 3, wreck: 3, hotspring: 3 };

const SYL_A = ['Bri', 'Ash', 'Mel', 'Tor', 'Wen', 'Cal', 'Fen', 'Hal', 'Lun', 'Mar', 'Or', 'Pel', 'Quin', 'Ros', 'Sel',
  'Thal', 'Vel', 'Wyn', 'Ald', 'Ber', 'Cor', 'Dun', 'El', 'Gal', 'Ka', 'Lor', 'Nor', 'Ev', 'Sun', 'Hol', 'Kes', 'Tam'];
const SYL_B = ['', '', 'a', 'e', 'i', 'o', 'an', 'el', 'ow', 'er', 'in', 'is'];
const SYL_C = ['moor', 'ford', 'wick', 'dale', 'mere', 'holm', 'by', 'ton', 'stead', 'wyn', 'rest', 'haven', 'brook',
  'fell', 'combe', 'ridge', 'vale', 'thorpe', 'garth', 'mouth', 'ness', 'ley'];
const SHIPS = ['Patient Heron', 'Morning Kettle', 'Lantern Moth', 'Second Breakfast', 'Quiet Tern', 'Salt Lily',
  'Slow Otter', 'Good Weather', 'Borrowed Time', 'Little Comet'];

const pick = (arr, r) => arr[Math.floor(r * arr.length) % arr.length];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function makeName(r1, r2, r3) {
  return pick(SYL_A, r1) + pick(SYL_B, r2) + pick(SYL_C, r3);
}

export function climateLabel(t) {
  if (t < 0.24) return 'Polar';
  if (t < 0.36) return 'Boreal';
  if (t < 0.66) return 'Temperate';
  if (t < 0.76) return 'Warm';
  return 'Tropical';
}

export class World {
  constructor(seedText) {
    this.seedText = String(seedText);
    this.seed = hashString(this.seedText);
    const rand = mulberry32(this.seed);
    this.nCont = makeSimplex(rand);
    this.nHeight = makeSimplex(rand);
    this.nRegion = makeSimplex(rand);
    this.nRidge = makeSimplex(rand);
    this.nMoist = makeSimplex(rand);
    this.nTemp = makeSimplex(rand);
    this.nRiver = makeSimplex(rand);
    this.nWarp = makeSimplex(rand);
    this.nLake = makeSimplex(rand);
    this.nDune = makeSimplex(rand);
    this.climateDir = rand() < 0.5 ? -1 : 1;
    this.salt = Math.floor(rand() * 1e9);
  }

  height(x, y) {
    const c = fbm(this.nCont, x / 560, y / 560, 3);
    const d = fbm(this.nHeight, x / 140, y / 140, 5);
    const region = this.nRegion(x / 700 + 31.7, y / 700 - 11.3);
    const ridge = 1 - Math.abs(fbm(this.nRidge, x / 120, y / 120, 3));
    const mount = Math.max(0, region - 0.05) * ridge * ridge * ridge;
    return 0.5 + 0.34 * c + 0.2 * d + 0.42 * mount;
  }

  /** Base temperature by "latitude": flying north cycles slowly through the climates. */
  latitudeTemp(y) {
    return 0.54 + 0.36 * Math.sin((this.climateDir * 2 * Math.PI * y) / CLIMATE_PERIOD);
  }

  climate(x, y, h) {
    const m = clamp(0.5 + 0.95 * fbm(this.nMoist, x / 260 + 40, y / 260, 3), 0, 1);
    let t = this.latitudeTemp(y) + 0.12 * this.nTemp(x / 380, y / 380) + 0.05 * this.nTemp(x / 55 + 90, y / 55);
    t -= Math.max(0, h - 0.62) * 0.9;
    return { m, t };
  }

  /** Full tile description: biome plus the values the colouring needs. */
  tile(x, y, h = this.height(x, y)) {
    const { m, t } = this.climate(x, y, h);
    let b = classify(h, m, t);
    let lush = 0;
    let lakeDepth = 0;
    if (!isWater(b) && b !== B.PEAK && h < 0.74) {
      const l = fbm(this.nLake, x / 110, y / 110, 2);
      if (l > 0.48 && h < 0.66) {
        b = B.LAKE;
        lakeDepth = l - 0.48;
      } else if (h > SEA + 0.01) {
        // Rivers follow the zero line of a stretched noise field, so they run roughly north-south.
        // A sign change towards the right or lower neighbour keeps even the thinnest river unbroken.
        const n0 = this.riverField(x, y);
        const r = Math.abs(n0);
        const width = 0.006 + 0.006 * m;
        if (r < width || n0 * this.riverField(x + 1, y) < 0 || n0 * this.riverField(x, y + 1) < 0) b = B.RIVER;
        else if (r < width * 3) lush = 1 - (r - width) / (width * 2);
      }
    }
    return { b, h, m, t, lush, lakeDepth };
  }

  riverField(x, y) {
    // Warped on both axes: the x warp makes big meanders, the small y warp breaks up straight east-west runs.
    return this.nRiver(x / 300 + 0.35 * this.nWarp(x / 90, y / 90), y / 800 + 0.03 * this.nWarp(x / 70 + 40, y / 70 - 40));
  }

  biomeAt(x, y) {
    return this.tile(Math.floor(x), Math.floor(y)).b;
  }

  /** Builds one chunk: RGBA pixels, biome ids and the landmarks it contains. */
  generateChunk(cx, cy) {
    const N = CHUNK;
    const W = N + 2;
    const x0 = cx * N;
    const y0 = cy * N;
    const H = new Float32Array(W * W);
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) H[j * W + i] = this.height(x0 + i - 1, y0 + j - 1);

    const pixels = new Uint8ClampedArray(N * N * 4);
    const biomes = new Uint8Array(N * N);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const x = x0 + i;
        const y = y0 + j;
        const h = H[(j + 1) * W + i + 1];
        const tile = this.tile(x, y, h);
        const k = j * N + i;
        biomes[k] = tile.b;
        const shade = clamp((H[j * W + i] - H[(j + 2) * W + i + 2]) * 9, -0.24, 0.24);
        const [r, g, bl] = this.colour(tile, x, y, shade);
        pixels[k * 4] = r;
        pixels[k * 4 + 1] = g;
        pixels[k * 4 + 2] = bl;
        pixels[k * 4 + 3] = 255;
      }
    }

    const canvas = new Painter(pixels, biomes, x0, y0, N);
    const town = this.settlementForChunk(cx, cy, canvas);
    const clear = (x, y, margin) => !town || Math.hypot(x - town.x, y - town.y) > town.ring + margin;
    this.decorate(canvas, cx, cy, clear);
    const landmarks = [];
    if (town) {
      town.anim = drawSettlement(canvas, town.plan, mulberry32(town.drawSeed));
      landmarks.push(town);
    }
    const cells = N / CELL;
    for (let j = 0; j < cells; j++) {
      for (let i = 0; i < cells; i++) {
        const lm = this.landmarkForCell(cx * cells + i, cy * cells + j, canvas);
        if (lm && clear(lm.x, lm.y, 10)) {
          drawLandmark(canvas, lm, this);
          landmarks.push(lm);
        }
      }
    }
    return { cx, cy, pixels, biomes, landmarks };
  }

  /** At most one settlement per chunk, on dry, mostly-land ground; size and style come from its plan. */
  settlementForChunk(cx, cy, p) {
    if (hash2(cx, cy, this.salt + 300) > 0.34) return null;
    let site = null;
    for (let k = 0; k < 4 && !site; k++) {
      const x = cx * CHUNK + 22 + Math.floor(hash2(cx, cy, this.salt + 301 + k) * 20);
      const y = cy * CHUNK + 22 + Math.floor(hash2(cx, cy, this.salt + 311 + k) * 20);
      const b = p.biome(x, y);
      if (!SETTLE.has(b)) continue;
      let dry = 0;
      for (let a = 0; a < 8; a++) if (!isWater(p.biome(Math.round(x + Math.cos(a * 0.785) * 8), Math.round(y + Math.sin(a * 0.785) * 8)))) dry++;
      if (dry >= 5) site = { x, y, b };
    }
    if (!site) return null;
    const tile = this.tile(site.x, site.y);
    const rand = mulberry32(Math.floor(hash2(cx, cy, this.salt + 320) * 4294967296));
    const plan = planSettlement(rand, { ...site, t: tile.t, m: tile.m }, p);
    const text = describeSettlement(plan, rand);
    let name = makeName(rand(), rand(), rand());
    if (plan.shore && plan.tier.key !== 'village' && rand() < 0.5) name = `Port ${name}`;
    else if (plan.tier.key === 'hamlet') name += pick(['', ' End', ' Green', ' Cross', ' Hollow'], rand());
    return {
      id: `town:${cx}:${cy}`,
      type: 'settlement',
      x: site.x + 0.5,
      y: site.y + 0.5,
      name,
      ...text,
      anim: [],
      seed: rand(),
      ring: plan.radius + 2.5,
      plan,
      drawSeed: Math.floor(rand() * 4294967296),
    };
  }

  colour(tile, x, y, shade) {
    const { b, h, m, t, lush, lakeDepth } = tile;
    let c = BASE[b];
    const r = hash2(x, y, this.salt);
    let f = 1 + shade + (r - 0.5) * 0.06;
    switch (b) {
      case B.DEEP:
      case B.SHALLOW: {
        const depth = clamp((SEA - h) / 0.12, 0, 1);
        c = mix(BASE[B.SHALLOW], BASE[B.DEEP], depth);
        if (h > SEA - 0.012) c = mix(c, [120, 180, 190], 0.45);
        f = 1 + (r - 0.5) * 0.04;
        break;
      }
      case B.ICE:
        c = this.nDune(x / 16, y / 16) + 0.35 * this.nDune(x / 5, y / 5) > 0.2 ? [232, 240, 246] : [96, 140, 170];
        f = 1 + (r - 0.5) * 0.05;
        break;
      case B.RIVER:
        if (t < 0.24) c = [196, 222, 236];
        f = 1 + (r - 0.5) * 0.05;
        break;
      case B.LAKE:
        c = t < 0.26 ? [200, 224, 236] : mix(BASE[B.LAKE], [44, 96, 140], clamp(lakeDepth * 8, 0, 1));
        f = 1 + (r - 0.5) * 0.04;
        break;
      case B.FOREST:
      case B.JUNGLE:
      case B.TAIGA:
        if (r < 0.22) f *= 0.78;
        else if (r > 0.86) f *= 1.16;
        break;
      case B.GRASS:
      case B.MEADOW:
        c = mix(BASE[B.MEADOW], BASE[B.GRASS], clamp((m - 0.24) / 0.16, 0, 1));
        if (r < 0.006) c = pick([[236, 150, 170], [245, 220, 110], [246, 246, 236], [180, 150, 220]], r * 166);
        break;
      case B.SAVANNA:
        if (r < 0.02) c = [78, 112, 56];
        break;
      case B.DESERT: {
        const dune = Math.sin(x * 0.45 + y * 0.16 + 6 * this.nDune(x / 60, y / 60));
        f += dune * 0.06;
        if (r < 0.003) c = [86, 142, 82];
        break;
      }
      case B.TUNDRA:
      case B.SHORE:
        if (r < 0.03) c = [120, 118, 112];
        break;
      case B.SNOW:
      case B.PEAK:
        c = mix(c, [196, 212, 232], clamp(-shade * 3, 0, 0.6));
        f = 1 + Math.max(0, shade) * 0.3 + (r - 0.5) * 0.03;
        break;
      case B.MARSH:
        if (r < 0.2) c = [78, 128, 128];
        break;
      default:
        break;
    }
    if (lush > 0 && b !== B.LAKE && b !== B.RIVER) c = mix(c, [86, 150, 78], lush * (m < 0.4 ? 0.7 : 0.35));
    return [c[0] * f, c[1] * f, c[2] * f];
  }

  /** Herds on grass, boats on water: small, frequent, not worth a pop-up. */
  decorate(p, cx, cy, clear) {
    const n = CHUNK / DECO;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const gx = cx * n + i;
        const gy = cy * n + j;
        const r = hash2(gx, gy, this.salt + 11);
        const x = gx * DECO + 3 + Math.floor(hash2(gx, gy, this.salt + 12) * (DECO - 6));
        const y = gy * DECO + 3 + Math.floor(hash2(gx, gy, this.salt + 13) * (DECO - 6));
        const b = p.biome(x, y);
        if (!clear(x, y, 4)) continue;
        if ((b === B.GRASS || b === B.MEADOW || b === B.SAVANNA || b === B.TUNDRA) && r < 0.07) {
          const colour = b === B.SAVANNA ? [120, 92, 60] : b === B.TUNDRA ? [150, 120, 96] : r < 0.08 ? [248, 248, 240] : [122, 84, 58];
          const count = 3 + Math.floor(hash2(gx, gy, this.salt + 14) * 5);
          for (let k = 0; k < count; k++) {
            const hx = x + Math.floor(hash2(gx, k, this.salt + 15) * 5) - 2;
            const hy = y + Math.floor(hash2(gy, k, this.salt + 16) * 5) - 2;
            if (!isWater(p.biome(hx, hy))) p.put(hx, hy, colour);
          }
        } else if ((b === B.DEEP || b === B.SHALLOW) && r < 0.025 && p.biome(x, y + 2) === b) {
          p.put(x, y - 1, [246, 244, 236]);
          p.put(x, y, [120, 84, 56]);
          p.put(x, y + 1, [120, 84, 56]);
          p.tint(x, y + 2, 1.25);
          p.tint(x, y + 3, 1.12);
        }
      }
    }
  }

  /** At most one landmark per 32x32 cell; tries a few spots and keeps the rarest type found. */
  landmarkForCell(lx, ly, p) {
    if (hash2(lx, ly, this.salt + 21) > 0.4) return null;
    let best = null;
    for (let k = 0; k < 3; k++) {
      const x = lx * CELL + 10 + Math.floor(hash2(lx, ly, this.salt + 30 + k) * 12);
      const y = ly * CELL + 10 + Math.floor(hash2(lx, ly, this.salt + 40 + k) * 12);
      const options = BY_BIOME[p.biome(x, y)];
      if (!options) continue;
      const type = pick(options, hash2(lx, ly, this.salt + 50 + k));
      if (type === 'lighthouse' && !nearSea(p, x, y)) continue;
      if (hash2(lx, ly, this.salt + 60) > (KEEP[type] ?? 1)) continue;
      const score = (RARITY[type] || 1) + hash2(lx, ly, this.salt + 70 + k) * 0.5;
      if (!best || score > best.score) best = { type, x, y, score };
    }
    if (!best) return null;
    const r = (salt) => hash2(lx, ly, this.salt + salt);
    const def = LANDMARKS[best.type];
    const base = makeName(r(81), r(82), r(83));
    const tile = this.tile(best.x, best.y);
    return {
      id: `${lx}:${ly}`,
      type: best.type,
      x: best.x + 0.5,
      y: best.y + 0.5,
      name: best.type === 'wreck' ? `Wreck of the ${pick(SHIPS, r(84))}` : def.name(base),
      label: def.label,
      icon: def.icon,
      note: pick(def.notes, r(85)),
      fact: landmarkFact(best.type, tile, r(86)),
      anim: [],
      seed: r(87),
    };
  }

  /** Rising-air columns near a rectangle of world space (deterministic, not stored). */
  thermalsIn(x0, y0, x1, y1) {
    const out = [];
    for (let gy = Math.floor(y0 / THERMAL_CELL); gy <= Math.floor(y1 / THERMAL_CELL); gy++) {
      for (let gx = Math.floor(x0 / THERMAL_CELL); gx <= Math.floor(x1 / THERMAL_CELL); gx++) {
        if (hash2(gx, gy, this.salt + 91) > 0.3) continue;
        const x = (gx + 0.2 + 0.6 * hash2(gx, gy, this.salt + 92)) * THERMAL_CELL;
        const y = (gy + 0.2 + 0.6 * hash2(gx, gy, this.salt + 93)) * THERMAL_CELL;
        const b = this.biomeAt(x, y);
        if (isWater(b) || b === B.SNOW || b === B.PEAK || b === B.ICE) continue;
        out.push({ id: `${gx}:${gy}`, x, y, r: 5 + 4 * hash2(gx, gy, this.salt + 94), phase: hash2(gx, gy, this.salt + 95) });
      }
    }
    return out;
  }
}

function classify(h, m, t) {
  if (h < SEA) {
    if (t < 0.2) return B.ICE;
    return h < SEA - 0.05 ? B.DEEP : B.SHALLOW;
  }
  if (h > 0.8) return B.PEAK;
  if (h > 0.71) return t < 0.3 ? B.SNOW : B.ROCK;
  if (h < SEA + 0.012) return t < 0.28 ? B.SHORE : B.BEACH;
  if (t < 0.2) return B.SNOW;
  if (t < 0.32) return m > 0.5 ? B.TAIGA : B.TUNDRA;
  if (t > 0.7) return m < 0.42 ? B.DESERT : m < 0.6 ? B.SAVANNA : B.JUNGLE;
  if (m < 0.32) return B.MEADOW;
  if (m < 0.56) return B.GRASS;
  if (m < 0.82) return B.FOREST;
  return B.MARSH;
}

function nearSea(p, x, y) {
  for (const [dx, dy] of [[4, 0], [-4, 0], [0, 4], [0, -4]]) {
    const b = p.biome(x + dx, y + dy);
    if (b === B.DEEP || b === B.SHALLOW || b === B.ICE) return true;
  }
  return false;
}

function landmarkFact(type, tile, r) {
  const n = (lo, hi) => Math.round(lo + r * (hi - lo));
  switch (type) {
    case 'peak': return `${Math.round(1800 + (tile.h - 0.8) * 9000).toLocaleString('en-GB')} m`;
    case 'lake': return `${n(8, 90)} m deep`;
    case 'castle': case 'monastery': case 'temple': case 'bridge': return `est. ${n(880, 1640)}`;
    case 'lighthouse': return `${n(18, 46)} m tall`;
    case 'whales': return `${n(3, 11)} whales`;
    case 'wreck': return `sank ${n(1790, 1968)}`;
    case 'hotspring': return `${n(38, 62)} °C`;
    case 'farm': return `${n(3, 9)} fields`;
    case 'windmill': return `${n(4, 6)} sails`;
    case 'camp': return `${n(3, 9)} tents`;
    case 'stones': return `${n(7, 13)} stones`;
    case 'oasis': return `${n(12, 60)} palms`;
    default: return `${n(1, 99)} herons`;
  }
}

function mix(a, b, k) {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

/** Writes into one chunk's RGBA buffer using world coordinates, clipping at the edges. */
class Painter {
  constructor(pixels, biomes, x0, y0, n) {
    Object.assign(this, { pixels, biomes, x0, y0, n });
  }
  inside(x, y) {
    const i = x - this.x0;
    const j = y - this.y0;
    return i >= 0 && j >= 0 && i < this.n && j < this.n ? j * this.n + i : -1;
  }
  biome(x, y) {
    const k = this.inside(x, y);
    return k < 0 ? -1 : this.biomes[k];
  }
  put(x, y, c) {
    const k = this.inside(x, y);
    if (k < 0) return;
    this.pixels[k * 4] = c[0];
    this.pixels[k * 4 + 1] = c[1];
    this.pixels[k * 4 + 2] = c[2];
  }
  tint(x, y, f) {
    const k = this.inside(x, y);
    if (k < 0) return;
    for (let c = 0; c < 3; c++) this.pixels[k * 4 + c] *= f;
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.put(x + i, y + j, c);
  }
}

const ROOFS = [
  [[196, 96, 70], [160, 72, 54]],
  [[118, 118, 134], [90, 90, 106]],
  [[214, 180, 104], [178, 146, 80]],
];
const CROPS = [
  [[222, 196, 104], [204, 176, 86]],
  [[150, 112, 78], [126, 92, 62]],
  [[124, 172, 74], [104, 152, 62]],
  [[154, 132, 194], [132, 112, 172]],
];
const PATH = [194, 170, 124];

function house(p, x, y, roof) {
  p.tint(x + 2, y + 1, 0.7);
  p.tint(x + 1, y + 2, 0.7);
  p.tint(x + 2, y + 2, 0.7);
  p.put(x, y, roof[0]);
  p.put(x + 1, y, roof[0]);
  p.put(x, y + 1, roof[1]);
  p.put(x + 1, y + 1, roof[1]);
}

function field(p, x, y, w, h, crop) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (!isWater(p.biome(x + i, y + j))) p.put(x + i, y + j, crop[j % 2]);
}

function drawLandmark(p, lm, world) {
  const x = Math.floor(lm.x);
  const y = Math.floor(lm.y);
  const r = (k) => hash2(x, y, world.salt + 200 + k);
  switch (lm.type) {
    case 'windmill':
      field(p, x + 2, y - 3, 5, 4, pick(CROPS, r(0)));
      field(p, x - 6, y + 1, 4, 3, pick(CROPS, r(1)));
      p.rect(x - 1, y - 1, 2, 2, [226, 216, 196]);
      p.tint(x + 1, y, 0.7);
      p.tint(x, y + 1, 0.7);
      lm.anim.push({ kind: 'sails', x, y });
      break;
    case 'farm':
      for (let k = 0; k < 4; k++) {
        const fx = x + (k % 2 ? 2 : -7);
        const fy = y + (k < 2 ? -6 : 2);
        field(p, fx, fy, 5, 4, pick(CROPS, r(k)));
      }
      for (let k = -7; k <= 7; k++) if (r(10 + k + 7) < 0.7) p.put(x + k, y - 1, [56, 100, 52]);
      house(p, x - 1, y, pick(ROOFS, r(30)));
      lm.anim.push({ kind: 'smoke', x: x - 0.5, y: y + 0.5 });
      break;
    case 'stones':
      p.rect(x - 2, y - 2, 5, 5, [138, 188, 110]);
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        const sx = Math.round(x + Math.cos(a) * 3.4);
        const sy = Math.round(y + Math.sin(a) * 3.4);
        p.tint(sx + 1, sy + 1, 0.72);
        p.put(sx, sy, [182, 182, 176]);
      }
      break;
    case 'castle': {
      const wall = [158, 152, 142];
      const tower = [118, 114, 108];
      for (let k = -3; k <= 3; k++) {
        if (r(k + 3) > 0.25) p.put(x + k, y - 3, wall);
        if (r(k + 13) > 0.25) p.put(x + k, y + 3, wall);
        if (r(k + 23) > 0.25) p.put(x - 3, y + k, wall);
        if (r(k + 33) > 0.25) p.put(x + 3, y + k, wall);
      }
      for (const [dx, dy] of [[-4, -4], [3, -4], [-4, 3], [3, 3]]) p.rect(x + dx, y + dy, 2, 2, tower);
      p.rect(x - 1, y - 1, 2, 2, [176, 170, 160]);
      p.tint(x + 1, y, 0.7);
      p.tint(x + 1, y + 1, 0.7);
      p.tint(x, y + 1, 0.7);
      break;
    }
    case 'monastery':
      for (let k = 2; k < 9; k++) p.put(x + (k % 3 === 0 ? 1 : 0), y + k, PATH);
      p.rect(x - 3, y - 2, 7, 1, [200, 116, 72]);
      p.rect(x - 3, y - 1, 7, 1, [168, 92, 58]);
      p.rect(x - 3, y, 2, 2, [168, 92, 58]);
      p.rect(x + 2, y, 2, 2, [168, 92, 58]);
      p.rect(x - 1, y, 3, 2, [150, 170, 120]);
      p.put(x, y - 3, [120, 120, 126]);
      break;
    case 'peak':
      p.put(x, y, [120, 110, 100]);
      p.put(x, y - 1, [214, 60, 60]);
      p.put(x + 1, y - 1, [214, 60, 60]);
      break;
    case 'lighthouse':
      p.rect(x - 2, y - 1, 5, 3, [150, 146, 136]);
      p.rect(x - 1, y - 2, 3, 5, [150, 146, 136]);
      p.rect(x - 1, y - 1, 3, 3, [246, 246, 240]);
      p.put(x, y, [206, 64, 60]);
      p.tint(x + 2, y + 2, 0.7);
      lm.anim.push({ kind: 'beam', x: x + 0.5, y: y + 0.5 });
      break;
    case 'wreck':
      for (let k = -3; k <= 3; k++) p.tint(x + k, y + 1, 1.15);
      for (let k = -2; k <= 2; k++) {
        p.put(x + k, y - Math.round(k * 0.5), k === 0 ? [80, 58, 40] : [112, 80, 52]);
        if (Math.abs(k) < 2) p.put(x + k, y - Math.round(k * 0.5) + 1, [96, 68, 46]);
      }
      break;
    case 'whales':
      lm.anim.push({ kind: 'whales', x, y });
      break;
    case 'lake':
      p.put(x, y, [132, 94, 62]);
      p.put(x + 1, y, [132, 94, 62]);
      break;
    case 'oasis':
      p.rect(x - 1, y - 1, 3, 3, [74, 160, 180]);
      p.rect(x - 2, y, 5, 1, [74, 160, 180]);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + r(0);
        p.put(Math.round(x + Math.cos(a) * 3), Math.round(y + Math.sin(a) * 3), [60, 128, 62]);
      }
      p.put(x + 4, y - 2, [220, 206, 176]);
      p.put(x + 5, y - 2, [196, 180, 150]);
      break;
    case 'camp':
      for (let k = 0; k < 3; k++) {
        const tx = x + Math.round(Math.cos(k * 2.1 + r(0) * 6) * 3);
        const ty = y + Math.round(Math.sin(k * 2.1 + r(0) * 6) * 3);
        p.put(tx, ty, [226, 210, 176]);
        p.put(tx + 1, ty, [196, 178, 142]);
        p.tint(tx + 1, ty + 1, 0.7);
      }
      p.put(x, y, [60, 50, 44]);
      lm.anim.push({ kind: 'fire', x: x + 0.5, y: y + 0.5 });
      break;
    case 'hotspring':
      p.rect(x - 1, y - 1, 3, 2, [96, 196, 196]);
      p.put(x + 3, y + 1, [96, 196, 196]);
      p.put(x + 3, y + 2, [96, 196, 196]);
      p.put(x - 3, y + 2, [120, 206, 200]);
      p.put(x - 1, y + 1, [150, 110, 90]);
      lm.anim.push({ kind: 'steam', x: x + 0.5, y });
      lm.anim.push({ kind: 'steam', x: x + 3.5, y: y + 1.5 });
      break;
    case 'temple':
      p.rect(x - 3, y - 3, 7, 7, [124, 134, 104]);
      p.rect(x - 2, y - 2, 5, 5, [150, 154, 124]);
      p.rect(x - 1, y - 1, 3, 3, [178, 176, 146]);
      p.put(x, y, [196, 190, 160]);
      for (let k = 0; k < 9; k++) p.put(x - 3 + Math.floor(r(k) * 7), y - 3 + Math.floor(r(k + 9) * 7), [52, 116, 60]);
      for (let k = 4; k < 8; k++) p.put(x, y + k, [150, 154, 124]);
      break;
    case 'bridge':
      for (let k = -6; k <= 6; k++) {
        const b = p.biome(x + k, y);
        p.put(x + k, y, b === B.RIVER ? [150, 140, 128] : PATH);
        if (b === B.RIVER) p.tint(x + k, y + 1, 0.8);
      }
      break;
    case 'fen':
      for (let k = 0; k < 14; k++) p.put(x - 4 + Math.floor(r(k) * 9), y - 4 + Math.floor(r(k + 14) * 9), [112, 116, 64]);
      for (let k = -3; k <= 3; k++) p.put(x + k, y + (k > 0 ? 1 : 0), [150, 118, 80]);
      break;
    default:
      break;
  }
}
