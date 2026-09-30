// Biome ids and names, shared by the terrain and the settlement generators.

export const B = {
  DEEP: 0, SHALLOW: 1, ICE: 2, BEACH: 3, SHORE: 4, GRASS: 5, MEADOW: 6, FOREST: 7, MARSH: 8,
  SAVANNA: 9, DESERT: 10, JUNGLE: 11, TUNDRA: 12, TAIGA: 13, SNOW: 14, ROCK: 15, PEAK: 16, RIVER: 17, LAKE: 18,
};

export const BIOME_NAMES = [
  'the deep sea', 'the shallows', 'the pack ice', 'a sandy shore', 'a rocky shore', 'green pastures',
  'wildflower meadows', 'the woods', 'the fens', 'the savanna', 'the dunes', 'the jungle', 'the tundra',
  'the pine forest', 'the snowfields', 'the high rocks', 'the summits', 'a river', 'a lake',
];

const WATER = new Set([B.DEEP, B.SHALLOW, B.ICE, B.RIVER, B.LAKE]);
export const isWater = (b) => WATER.has(b);
