// Settlements: population sets the size, climate sets the look, a noisy outline sets the shape.
// Everything is drawn at tile resolution into one chunk through the world's Painter.

import { B, isWater } from './biomes.js';

export const TIERS = [
  { key: 'hamlet', icon: 'cottage', upTo: 0.4, pop: [15, 120], radius: [3.5, 5], buildings: [3, 7] },
  { key: 'village', icon: 'holiday_village', upTo: 0.76, pop: [120, 900], radius: [6, 8], buildings: [10, 20] },
  { key: 'town', icon: 'domain', upTo: 0.93, pop: [900, 8000], radius: [9, 11.5], buildings: [34, 64] },
  { key: 'city', icon: 'location_city', upTo: 1, pop: [8000, 60000], radius: [12.5, 15], buildings: [90, 170] },
];

const STYLES = {
  temperate: {
    roofs: [[[196, 96, 70], [160, 72, 54]], [[118, 118, 134], [90, 90, 106]], [[214, 180, 104], [178, 146, 80]], [[178, 112, 86], [146, 88, 66]]],
    shapes: ['rect', 'rect', 'long', 'L'], street: [194, 170, 124], paved: [176, 168, 156], smoke: true,
    crops: [[[222, 196, 104], [204, 176, 86]], [[150, 112, 78], [126, 92, 62]], [[124, 172, 74], [104, 152, 62]], [[222, 196, 104], [204, 176, 86]], [[124, 172, 74], [104, 152, 62]], [[154, 132, 194], [132, 112, 172]]],
  },
  desert: {
    roofs: [[[250, 246, 236], [222, 212, 196]], [[204, 146, 102], [176, 122, 84]], [[224, 180, 114], [194, 150, 90]]],
    shapes: ['flat', 'flat', 'courtyard', 'dome'], street: [216, 192, 148], paved: [228, 210, 176], smoke: false, crops: null,
  },
  tropical: {
    roofs: [[[208, 172, 102], [176, 140, 78]], [[192, 152, 86], [160, 122, 66]]],
    shapes: ['round', 'round', 'long', 'rect'], street: [184, 150, 104], paved: [196, 170, 128], smoke: true,
    crops: [[[92, 150, 66], [70, 126, 52]], [[176, 168, 84], [150, 144, 70]]],
  },
  boreal: {
    roofs: [[[122, 86, 64], [98, 68, 50]], [[232, 236, 242], [112, 80, 60]], [[110, 96, 88], [84, 72, 66]]],
    shapes: ['rect', 'long', 'round', 'rect'], street: [150, 132, 112], paved: [140, 136, 132], smoke: true,
    crops: [[[196, 178, 110], [176, 158, 94]], [[120, 100, 80], [100, 82, 66]]],
  },
};

const NOTES = {
  temperate: [
    ['Known for its honey and its slow Sunday markets.', 'One bakery, one bell, no hurry.', 'Washing lines flap in the breeze below.', 'Someone down there is waving a tea towel.'],
    ['Market day fills the square with stalls and gossip.', 'Spires, chimneys and a thousand kitchen windows.', 'Its walls kept out armies once; now just the wind.', 'Bells from three churches, never quite in time.'],
  ],
  desert: [
    ['Palm shade, a deep well and sweet mint tea.', 'Flat roofs where families sleep on summer nights.', 'Goats doze in the shade of the courtyard walls.'],
    ['Domes keep the courtyards cool at noon.', 'A maze of alleys, every one smelling of spice.', 'Caravans still come in along the old road.'],
  ],
  tropical: [
    ['Round thatched huts ring the common fire.', 'Hammocks sway in every doorway.', 'Children race the chickens between the huts.'],
    ['Longhouses crowd along the lanes.', 'The market sells fruit you have never seen before.', 'Rain drums on a thousand thatched roofs.'],
  ],
  boreal: [
    ['Log cabins with snow piled up to the sills.', 'Woodsmoke hangs low over the roofs.', 'Sled dogs doze in a warm heap.'],
    ['Steep roofs shrug off the winter snow.', 'The great hall glows late into the night.', 'Fur traders haggle on the frozen quay.'],
  ],
};
const HARBOUR_NOTES = ['Gulls follow the fishing boats home.', 'Nets dry along the harbour wall.', 'The quay smells of tar and fresh fish.'];

const WOOD = [138, 98, 62];
const STONE = [158, 152, 142];
const TOWER = [122, 116, 108];
const GREEN = [110, 162, 86];
const TREE = [56, 104, 56];
const WELL = [84, 110, 150];
const SPIRE = [72, 64, 60];

const lerp = (a, b, k) => a + (b - a) * k;
const pickOf = (arr, rand) => arr[Math.floor(rand() * arr.length) % arr.length];

function styleFor(b, t, m) {
  if (b === B.SNOW || b === B.TUNDRA || b === B.TAIGA || t < 0.34) return 'boreal';
  if (b === B.DESERT || (b === B.SAVANNA && m < 0.5)) return 'desert';
  if (b === B.JUNGLE || b === B.SAVANNA || t > 0.72) return 'tropical';
  return 'temperate';
}

function layoutFor(tier, style, rand) {
  const r = rand();
  if (tier === 'hamlet') return style === 'tropical' && r < 0.5 ? 'ring' : 'cluster';
  if (tier === 'village') {
    if (style === 'tropical' || (style === 'boreal' && r < 0.3)) return r < 0.6 ? 'ring' : 'cluster';
    return r < 0.4 ? 'linear' : r < 0.8 ? 'cluster' : 'ring';
  }
  if (style === 'desert' || style === 'tropical') return 'organic';
  if (tier === 'town') return r < 0.55 ? 'grid' : 'linear';
  return r < 0.7 ? 'grid' : 'organic';
}

/** First sea or lake tile within reach of the centre, as an angle and distance, or null. */
function findShore(p, x, y, reach) {
  for (let d = 3; d <= reach; d++) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const b = p.biome(Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d));
      if (b === B.DEEP || b === B.SHALLOW || b === B.LAKE) return { angle: a, dist: d };
    }
  }
  return null;
}

/** Decides what kind of place sits at a site. `site` has x, y, b (biome), t, m. */
export function planSettlement(rand, site, p) {
  const r0 = rand();
  const tier = TIERS.find((t) => r0 <= t.upTo);
  const size = rand() ** 1.6; // skewed: most places sit at the small end of their tier
  const population = Math.round(Math.exp(lerp(Math.log(tier.pop[0]), Math.log(tier.pop[1]), size)));
  const radius = lerp(tier.radius[0], tier.radius[1], size);
  const style = styleFor(site.b, site.t, site.m);
  const layout = layoutFor(tier.key, style, rand);
  const walled = tier.key === 'city' || (tier.key === 'town' && style !== 'tropical' && rand() < 0.25);
  return {
    x: site.x,
    y: site.y,
    biome: site.b,
    tier,
    style,
    layout,
    walled,
    population,
    radius,
    buildings: Math.round(lerp(tier.buildings[0], tier.buildings[1], size)),
    shore: tier.key === 'hamlet' ? null : findShore(p, site.x, site.y, Math.round(radius) + 7),
    outline: {
      lobes: [rand() * 0.26, rand() * 6.3, rand() * 0.18, rand() * 6.3, rand() * 0.1, rand() * 6.3],
      stretch: 1 + rand() * (tier.key === 'hamlet' ? 0.3 : 0.65),
      tilt: rand() * Math.PI,
      // a second, smaller blob that has grown out of one side: kidney and peanut shapes
      bulge: tier.key !== 'hamlet' && rand() < 0.6 ? { angle: rand() * Math.PI * 2, dist: 0.6 + rand() * 0.35, size: 0.45 + rand() * 0.2 } : null,
    },
    roof: Math.floor(rand() * STYLES[style].roofs.length),
  };
}

/** Pop-up text for a planned settlement. */
export function describeSettlement(plan, rand) {
  const big = plan.tier.key === 'town' || plan.tier.key === 'city';
  let adj = '';
  if (plan.walled) adj = 'walled';
  else if (plan.shore) adj = 'harbour';
  else if (plan.style === 'desert') adj = 'desert';
  else if (plan.style === 'tropical') adj = plan.biome === B.JUNGLE ? 'jungle' : 'savanna';
  else if (plan.style === 'boreal') adj = 'northern';
  else if (plan.tier.key === 'town') adj = 'market';
  const label = `${adj} ${plan.tier.key}`.trim();
  const notes = plan.shore && rand() < 0.5 ? HARBOUR_NOTES : NOTES[plan.style][big ? 1 : 0];
  return {
    label: label[0].toUpperCase() + label.slice(1),
    icon: plan.tier.icon,
    note: pickOf(notes, rand),
    fact: `pop. ${plan.population.toLocaleString('en-GB')}`,
  };
}

// ------------------------------------------------------------------ building shapes
// A shape is a list of [dx, dy, tone]: 0 light roof, 1 dark roof, 2 yard, 3 accent (spire, minaret).

function rectShape(w, h) {
  const cells = [];
  const ridgeAcross = w >= h;
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) cells.push([dx, dy, (ridgeAcross ? dy < h / 2 : dx < w / 2) ? 0 : 1]);
  return cells;
}

function roundShape(d) {
  const cells = [];
  const c = (d - 1) / 2;
  for (let dy = 0; dy < d; dy++) {
    for (let dx = 0; dx < d; dx++) {
      const dist = Math.hypot(dx - c, dy - c);
      if (dist > c + 0.55) continue;
      cells.push([dx, dy, dist < c - 0.4 || (d <= 3 && dist < 0.5) ? 0 : dx + dy > 2 * c ? 1 : 0]);
    }
  }
  return cells;
}

function makeShape(kind, rand) {
  switch (kind) {
    case 'long': {
      const long = 4 + Math.floor(rand() * 2);
      return rand() < 0.5 ? rectShape(long, 2) : rectShape(2, long);
    }
    case 'L': {
      const skip = Math.floor(rand() * 4);
      const corner = [[2, 0], [0, 0], [0, 2], [2, 2]][skip];
      return rectShape(3, 3)
        .filter(([dx, dy]) => !(dx === corner[0] && dy === corner[1]))
        .map(([dx, dy]) => [dx, dy, dx + dy < 2 ? 0 : 1]);
    }
    case 'flat': {
      const w = 2 + Math.floor(rand() * 3);
      const h = 2 + Math.floor(rand() * 2);
      return rectShape(w, h).map(([dx, dy]) => [dx, dy, dx === w - 1 || dy === h - 1 ? 1 : 0]);
    }
    case 'courtyard': {
      const w = 4 + Math.floor(rand() * 2);
      return rectShape(w, 4).map(([dx, dy]) => [dx, dy, dx > 0 && dy > 0 && dx < w - 1 && dy < 3 ? 2 : dx === w - 1 || dy === 3 ? 1 : 0]);
    }
    case 'dome':
      return roundShape(3);
    case 'round':
      return roundShape(rand() < 0.7 ? 3 : 4);
    default: {
      const w = 2 + Math.floor(rand() * 2);
      return rand() < 0.5 ? rectShape(w, 2) : rectShape(2, w);
    }
  }
}

/** The one building that marks the centre: church, cathedral, domed mosque, great hut or hall. */
function landmarkShape(style, tier) {
  if (style === 'temperate') {
    if (tier === 'city') {
      const cells = [];
      for (let dy = 0; dy < 8; dy++) for (let dx = 0; dx < 3; dx++) cells.push([dx + 2, dy, dx === 0 ? 0 : dx === 2 ? 1 : 0]);
      for (let dx = 0; dx < 7; dx++) for (let dy = 2; dy < 4; dy++) if (dx < 2 || dx > 4) cells.push([dx, dy, dy === 2 ? 0 : 1]);
      cells.push([2, 7, 3], [4, 7, 3]);
      return cells;
    }
    const cells = [];
    for (let dy = 0; dy < 5; dy++) for (let dx = 0; dx < 2; dx++) cells.push([dx + 1, dy, dx === 0 ? 0 : 1]);
    cells.push([0, 1, 0], [3, 1, 1], [1, 4, 3]);
    return cells;
  }
  if (style === 'desert') {
    const dome = roundShape(tier === 'city' ? 5 : 4).map(([dx, dy, tone]) => [dx, dy, tone]);
    return [...dome, [-2, 0, 3]];
  }
  if (style === 'tropical') return roundShape(tier === 'city' ? 6 : 5);
  return rectShape(tier === 'city' ? 7 : 5, 3);
}

// ------------------------------------------------------------------ drawing

/** Draws a planned settlement; returns animation hooks (chimney smoke, camp fires). */
export function drawSettlement(p, plan, rand) {
  const S = STYLES[plan.style];
  const cx = plan.x;
  const cy = plan.y;
  const R = plan.radius;
  const tier = plan.tier.key;
  // The outline is a lobed circle in a stretched, tilted frame: blobs, ovals and kidney shapes.
  const { lobes, stretch, tilt, bulge } = plan.outline;
  const [a1, p1, a2, p2, a3, p3] = lobes;
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  const edgeAt = (a) => R * Math.sqrt(stretch) * (1 + a1 * Math.sin(a + p1) + a2 * Math.sin(2 * a + p2) + a3 * Math.sin(3 * a + p3));
  const bx = bulge ? cx + Math.cos(bulge.angle) * R * bulge.dist : 0;
  const by = bulge ? cy + Math.sin(bulge.angle) * R * bulge.dist : 0;
  const inside = (x, y) => {
    if (bulge && Math.hypot(x - bx, y - by) <= R * bulge.size) return true;
    const u = (x - cx) * cosT + (y - cy) * sinT;
    const v = (-(x - cx) * sinT + (y - cy) * cosT) * stretch;
    return Math.hypot(u, v) <= edgeAt(Math.atan2(v, u));
  };
  // Edge distance along a world direction, found by marching out from the centre (cached per degree).
  const edges = new Map();
  const edgeDist = (a) => {
    const deg = ((Math.round((a * 180) / Math.PI) % 360) + 360) % 360;
    if (!edges.has(deg)) {
      const r = (deg * Math.PI) / 180;
      let last = 0;
      for (let d = 0; d <= R * 3; d += 0.5) if (inside(cx + Math.cos(r) * d, cy + Math.sin(r) * d)) last = d;
      edges.set(deg, last);
    }
    return edges.get(deg);
  };
  /** World point at angle `a`, `extra` tiles beyond the edge (or a fraction of the way out via `frac`). */
  const outlinePoint = (a, extra = 0, frac = 1) => {
    const d = edgeDist(a) * frac + extra;
    return [cx + Math.cos(a) * d, cy + Math.sin(a) * d];
  };
  const key = (x, y) => (x - cx + 200) * 1000 + (y - cy + 200);
  const road = new Set();
  const built = new Set();
  const buildings = [];
  const anim = [];
  const land = (x, y) => {
    const b = p.biome(x, y);
    return b >= 0 && !isWater(b) && b !== B.PEAK;
  };

  const pave = (x, y, colour) => {
    const b = p.biome(x, y);
    if (b < 0 || built.has(key(x, y))) return false;
    if (b === B.RIVER) p.put(x, y, WOOD); // bridge
    else if (isWater(b)) return false;
    else p.put(x, y, colour);
    road.add(key(x, y));
    return true;
  };
  const street = (ang, from, len, colour, wide = false) => {
    const ox = Math.abs(Math.sin(ang)) > 0.7 ? 1 : 0;
    for (let d = from; d <= len; d += 0.5) {
      const x = Math.round(cx + Math.cos(ang) * d);
      const y = Math.round(cy + Math.sin(ang) * d);
      if (!pave(x, y, colour)) break;
      if (wide) pave(x + ox, y + 1 - ox, colour);
    }
  };
  const plaza = (r, colour) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + 1) pave(cx + dx, cy + dy, colour);
  };
  const place = (x, y, cells, margin, roof = null) => {
    for (const [dx, dy] of cells) {
      const k = key(x + dx, y + dy);
      if (!land(x + dx, y + dy) || road.has(k) || built.has(k)) return false;
    }
    if (margin) {
      const own = new Set(cells.map(([dx, dy]) => key(x + dx, y + dy)));
      for (const [dx, dy] of cells) {
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
          const k = key(x + dx + i, y + dy + j);
          if (built.has(k) && !own.has(k)) return false;
        }
      }
    }
    for (const [dx, dy] of cells) built.add(key(x + dx, y + dy));
    const shade = 0.92 + rand() * 0.16;
    const palette = roof || (rand() < 0.7 ? S.roofs[plan.roof] : pickOf(S.roofs, rand));
    buildings.push({ x, y, cells, palette, shade });
    return true;
  };
  const placeNear = (x, y, cells, margin, roof, tries = 12) => {
    for (let k = 0; k < tries; k++) {
      const jx = k === 0 ? 0 : Math.round((rand() - 0.5) * (2 + k * 0.6));
      const jy = k === 0 ? 0 : Math.round((rand() - 0.5) * (2 + k * 0.6));
      if (place(x + jx, y + jy, cells, margin, roof)) return true;
    }
    return false;
  };
  const scatter = (count, margin, pickPoint) => {
    let placed = 0;
    for (let k = 0; k < count * 8 && placed < count; k++) {
      const [x, y] = pickPoint();
      const cells = makeShape(pickOf(S.shapes, rand), rand);
      if (place(x, y, cells, margin)) placed++;
    }
  };
  const randomInside = () => {
    const [x, y] = outlinePoint(rand() * Math.PI * 2, 0, Math.sqrt(rand()));
    return [Math.round(x) - 1, Math.round(y) - 1];
  };

  // Harbour: a lane to the water, a pier and a couple of boats.
  if (plan.shore) {
    const { angle, dist } = plan.shore;
    street(angle, 0, dist - 1, S.street);
    for (let d = dist; d <= dist + 4; d++) {
      const x = Math.round(cx + Math.cos(angle) * d);
      const y = Math.round(cy + Math.sin(angle) * d);
      const b = p.biome(x, y);
      if (b < 0) break;
      p.put(x, y, WOOD);
      road.add(key(x, y));
      if (d === dist + 3 && isWater(b)) {
        const bx = x + (Math.abs(Math.cos(angle)) > 0.7 ? 0 : 2);
        const by = y + (Math.abs(Math.cos(angle)) > 0.7 ? 2 : 0);
        if (isWater(p.biome(bx, by)) && isWater(p.biome(bx, by + 1))) {
          p.put(bx, by, [246, 244, 236]);
          p.put(bx, by + 1, [120, 84, 56]);
        }
      }
    }
  }

  // Streets, by layout.
  const mains = [];
  const span = Math.ceil(R * 2.2);
  const reach = R + (tier === 'city' ? 6 : 3);
  if (plan.layout === 'grid') {
    const P = 6;
    const offset = Math.floor(rand() * P);
    for (let y = Math.floor(cy - span); y <= cy + span; y++) {
      for (let x = Math.floor(cx - span); x <= cx + span; x++) {
        const onLine = (x - cx - offset) % P === 0 || (y - cy - offset) % P === 0;
        if (onLine && inside(x, y)) pave(x, y, S.paved);
      }
    }
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) mains.push(a);
    mains.forEach((a) => street(a, 0, reach, tier === 'city' ? S.paved : S.street, tier === 'city'));
    plaza(2, S.paved);
  } else if (plan.layout === 'linear') {
    const a = rand() * Math.PI;
    mains.push(a, a + Math.PI);
    mains.forEach((m) => street(m, 0, R + 3, S.street, tier !== 'village'));
  } else if (plan.layout === 'organic') {
    const alleys = tier === 'city' ? 9 : 6;
    for (let k = 0; k < alleys; k++) {
      let heading = rand() * Math.PI * 2;
      let x = cx;
      let y = cy;
      for (let step = 0; step < R * 1.4; step++) {
        heading += (rand() - 0.5) * 0.7;
        x += Math.cos(heading);
        y += Math.sin(heading);
        if (!inside(Math.round(x), Math.round(y))) break;
        pave(Math.round(x), Math.round(y), S.street);
      }
    }
    const a = rand() * Math.PI * 2;
    mains.push(a, a + Math.PI * (0.7 + rand() * 0.6));
    mains.forEach((m) => street(m, 0, reach, S.street));
    plaza(2, S.paved);
  } else if (plan.layout === 'ring') {
    const inner = Math.max(2, R * 0.45);
    for (let dy = -Math.ceil(inner); dy <= inner; dy++) {
      for (let dx = -Math.ceil(inner); dx <= inner; dx++) {
        const d = Math.hypot(dx, dy);
        if (d <= inner) pave(cx + dx, cy + dy, plan.style === 'tropical' ? [180, 156, 104] : GREEN);
        else if (d <= inner + 0.9 && (dx + dy) % 2 === 0 && land(cx + dx, cy + dy)) p.put(cx + dx, cy + dy, WOOD);
      }
    }
  } else if (tier !== 'hamlet' || rand() < 0.5) {
    const a = rand() * Math.PI;
    mains.push(a, a + Math.PI);
    mains.forEach((m) => street(m, 0, R + 3, S.street));
  }

  // City walls: stone ring on the outline, towers every so often, gates where streets cross.
  if (plan.walled) {
    const steps = Math.ceil(Math.PI * 2 * R * 2.2);
    for (let k = 0; k < steps; k++) {
      const [wx, wy] = outlinePoint((k / steps) * Math.PI * 2, 1);
      const x = Math.round(wx);
      const y = Math.round(wy);
      if (road.has(key(x, y)) || !land(x, y)) continue;
      const tower = k % Math.round(steps / (tier === 'city' ? 10 : 7)) === 0;
      p.put(x, y, tower ? TOWER : STONE);
      p.tint(x + 1, y + 1, 0.8);
      built.add(key(x, y));
      if (tower) {
        for (const [i, j] of [[1, 0], [0, 1], [1, 1]]) {
          if (road.has(key(x + i, y + j)) || !land(x + i, y + j)) continue;
          p.put(x + i, y + j, TOWER);
          built.add(key(x + i, y + j));
        }
      }
    }
  }

  // The centre building, then everything else.
  const centre = landmarkShape(plan.style, tier);
  if (tier !== 'hamlet') placeNear(cx + 3, cy - 3, centre, false, plan.style === 'temperate' ? S.roofs[1] : null, 20);
  if (plan.walled && (plan.style === 'temperate' || plan.style === 'boreal')) {
    const keep = rectShape(5, 5).map(([dx, dy]) => [dx, dy, dx > 0 && dy > 0 && dx < 4 && dy < 4 ? 2 : 1]);
    const a = rand() * Math.PI * 2;
    placeNear(Math.round(cx + Math.cos(a) * R * 0.5) - 2, Math.round(cy + Math.sin(a) * R * 0.5) - 2, keep, true, [TOWER, TOWER], 20);
  }

  const target = plan.buildings;
  if (plan.layout === 'grid') {
    for (let y = Math.floor(cy - span); y <= cy + span; y++) {
      for (let x = Math.floor(cx - span); x <= cx + span; x++) {
        if (!inside(x, y) || road.has(key(x, y)) || built.has(key(x, y))) continue;
        const r = rand();
        if (r < 0.05) {
          p.put(x, y, rand() < 0.4 ? TREE : GREEN);
          continue;
        }
        const w = 2 + Math.floor(rand() * 2);
        const cells = plan.style === 'desert' && r > 0.75 ? makeShape('courtyard', rand) : rectShape(w, 2);
        place(x, y, cells, false);
      }
    }
  } else if (plan.layout === 'linear') {
    const a = mains[0];
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    const wide = tier !== 'village' ? 1 : 0;
    for (let d = -R - 2; d <= R + 2; d += 2 + rand() * 1.5) {
      for (const side of [-1, 1]) {
        for (const row of tier === 'village' ? [0] : [0, 1]) {
          const off = side * (2.2 + wide + row * 3.2);
          const x = Math.round(cx + Math.cos(a) * d + nx * off) - (side < 0 ? 1 : 0);
          const y = Math.round(cy + Math.sin(a) * d + ny * off) - (side < 0 ? 1 : 0);
          if (rand() < 0.2) continue;
          place(x, y, makeShape(pickOf(S.shapes, rand), rand), tier === 'village');
        }
      }
    }
  } else if (plan.layout === 'ring') {
    const inner = Math.max(2, R * 0.45);
    const n = target;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + (rand() - 0.5) * 0.3;
      const d = inner + 2.2 + rand() * 1.5;
      const cells = makeShape(pickOf(S.shapes, rand), rand);
      placeNear(Math.round(cx + Math.cos(a) * d) - 1, Math.round(cy + Math.sin(a) * d) - 1, cells, true, null, 4);
    }
    if (plan.style === 'tropical') anim.push({ kind: 'fire', x: cx + 0.5, y: cy + 0.5 });
    else p.put(cx, cy, WELL);
  } else {
    // cluster and organic: organic packs buildings tight so alleys read as gaps between roofs
    scatter(target, plan.layout !== 'organic', () => randomInside());
    if (plan.layout === 'cluster' && tier !== 'hamlet') p.put(cx, cy, WELL);
  }

  // Suburbs along the main roads outside the walls.
  if (plan.walled) {
    for (const a of mains) {
      for (let d = R + 2.5; d < reach; d += 3) {
        for (const side of [-1, 1]) {
          const x = Math.round(cx + Math.cos(a) * d - Math.sin(a) * side * 2.5) - 1;
          const y = Math.round(cy + Math.sin(a) * d + Math.cos(a) * side * 2.5) - 1;
          if (rand() < 0.6) place(x, y, makeShape(pickOf(S.shapes, rand), rand), true);
        }
      }
    }
  }

  // Footpaths from outlying cottages to the nearest street (small places only).
  if ((tier === 'hamlet' || tier === 'village') && plan.layout === 'cluster' && road.size) {
    const roads = [...road].map((k) => [Math.floor(k / 1000) - 200 + cx, (k % 1000) - 200 + cy]);
    for (const b of buildings) {
      const [dx, dy] = b.cells.reduce((m, c) => (c[1] > m[1] ? c : m));
      const x0 = b.x + dx;
      const y0 = b.y + dy + 1;
      let best = null;
      for (const [rx, ry] of roads) {
        const d = Math.abs(rx - x0) + Math.abs(ry - y0);
        if (!best || d < best.d) best = { rx, ry, d };
      }
      if (!best || best.d > 7) continue;
      for (let x = Math.min(x0, best.rx); x <= Math.max(x0, best.rx); x++) if (land(x, y0) && !built.has(key(x, y0))) p.put(x, y0, S.street);
      for (let y = Math.min(y0, best.ry); y <= Math.max(y0, best.ry); y++) if (land(best.rx, y) && !built.has(key(best.rx, y))) p.put(best.rx, y, S.street);
    }
  }

  // Fields or palm groves around the edge (not for cities).
  if (tier !== 'city') {
    const count = { hamlet: 3, village: 5, town: 6 }[tier];
    for (let k = 0; k < count; k++) {
      const [ox, oy] = outlinePoint(rand() * Math.PI * 2, 2 + rand() * 3);
      const fx = Math.round(ox);
      const fy = Math.round(oy);
      if (S.crops) {
        const crop = pickOf(S.crops, rand);
        const w = 3 + Math.floor(rand() * 4);
        const h = 2 + Math.floor(rand() * 3);
        const across = rand() < 0.5;
        for (let j = 0; j < h; j++) {
          for (let i = 0; i < w; i++) {
            const x = fx + i - (w >> 1);
            const y = fy + j - (h >> 1);
            if (land(x, y) && !road.has(key(x, y)) && !built.has(key(x, y))) p.put(x, y, crop[(across ? j : i) % 2]);
          }
        }
      } else {
        for (let i = 0; i < 5; i++) {
          const x = fx + Math.round((rand() - 0.5) * 5);
          const y = fy + Math.round((rand() - 0.5) * 5);
          if (!land(x, y) || built.has(key(x, y)) || road.has(key(x, y))) continue;
          p.tint(x + 1, y + 1, 0.75);
          p.put(x, y, [60, 128, 62]);
        }
      }
    }
  }

  // Roofs last: shadows first so no roof is darkened by its neighbour's.
  for (const b of buildings) {
    for (const [dx, dy] of b.cells) if (!built.has(key(b.x + dx + 1, b.y + dy + 1))) p.tint(b.x + dx + 1, b.y + dy + 1, 0.7);
  }
  for (const b of buildings) {
    for (const [dx, dy, tone] of b.cells) {
      let c;
      if (tone === 2) c = plan.style === 'desert' ? [150, 176, 110] : S.paved;
      else if (tone === 3) c = SPIRE;
      else c = b.palette[tone];
      p.put(b.x + dx, b.y + dy, [c[0] * b.shade, c[1] * b.shade, c[2] * b.shade]);
    }
  }
  if (S.smoke) {
    const chimneys = { hamlet: 2, village: 3, town: 4, city: 5 }[tier];
    buildings.filter((b) => b.cells.length <= 9).slice(0, chimneys).forEach((b) => anim.push({ kind: 'smoke', x: b.x + 0.5, y: b.y + 0.5 }));
  }
  return anim;
}
