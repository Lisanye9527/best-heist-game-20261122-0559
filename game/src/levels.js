// The floor plan of the Gilded Vault bank: one night, one floor, three ways in.
//
// The plan is drawn as text so it can be read at a glance. Characters:
//   #  wall            D  desk           P  pillar         T  planter
//   C  display case    =  counter        .  marble floor   ,  hall carpet
//   V  vault floor     E  getaway mat    *  the Aurora Diamond (the loot target)
//   $  cash stack      G  gold bars      A  framed painting (side loot, all optional)
//
// Desks, pillars, planters, cases and counters are cover: they block movement and sight.
// The wings hold the side loot; the diamond sits in the vault at the top centre. The thief
// starts on the getaway mat at the bottom and must come back to it carrying the diamond.

import { TILE } from './config.js';

const PLAN = [
  // Rows 1-6 are the vault block (top centre); row 6 leaves the single vault door at
  // column 16, the choke point the hall guard watches. Rows 7-14 are the carpeted hall
  // with its two pillars; row 14 is the door line into the lobby, open at column 5.
  '################################',
  '#.........##VVVVVVVVV##........#',
  '#.$.......##VVVV*VVVV##......G.#',
  '#...DD....##VVVVVVVVV....DD....#',
  '#.........##VVVVVVVVV##........#',
  '#.......T.##VVVVVVVVV##D.......#',
  '#.........######.######........#',
  '#.........#,,,,,,,,,,,####.#####',
  '#####.#####,,,,,,,,,,,#........#',
  '#.........,,,,,,,,,,,,#......A.#',
  '#.DD..DD..#,,P,,,,P,,,#..C.....#',
  '#..........,,,,,,,,,,,#........#',
  '#.......A.,,,,,,,,,,,,....C.....#',
  '#.........#,,,,,,,,,,,#........#',
  '####.########.#####.#######.####',
  '#..............................#',
  '#..T..........====..T........A.#',
  '#..............................#',
  '#......EE......................#',
  '#######..#######################',
];

/** Tiles nobody can walk through; the same tiles block sight lines. */
const SOLID_CHARS = new Set(['#', 'D', 'P', 'T', 'C', '=']);

/** What each loot character on the plan is worth and how long it takes to lift. */
const LOOT_BY_CHAR = {
  '*': { kind: 'diamond', name: 'The Aurora Diamond', value: 1000, grabSeconds: 1.6 },
  G: { kind: 'gold', name: 'Gold bars', value: 300, grabSeconds: 0.8 },
  A: { kind: 'art', name: 'Framed painting', value: 250, grabSeconds: 0.6 },
  $: { kind: 'cash', name: 'Cash stack', value: 150, grabSeconds: 0.6 },
};

/** Guard patrols, as tile waypoints walked in a loop, pausing at each post. */
const GUARD_PATROLS = [
  // The lobby guard: along the lobby's north edge, up through the east door gap, along
  // the hall, and back down the west gap. His round stays north of the getaway mat, so
  // the thief's first step is not under his boots — but his cone sweeps the lobby doors.
  [[4, 15], [19, 15], [19, 12], [13, 12], [13, 15]],
  // The hall guard: a tight rectangle around the pillars, never far from the vault door.
  [[12, 8], [20, 8], [20, 12], [12, 12]],
  // The gallery guard: up and down the east wing among the display cases.
  [[24, 9], [28, 9], [28, 13], [24, 13]],
];

/** Cameras: where they are mounted (tile), the way they face, and their sweep phase. */
const CAMERA_POSTS = [
  { tile: [16, 1], facing: Math.PI / 2, phase: 0 }, // inside the vault, watching the diamond
  { tile: [16, 6], facing: Math.PI / 2, phase: 2.1 }, // over the vault door, sweeping the hall
  { tile: [16, 14], facing: Math.PI / 2, phase: 4.0 }, // over the hall doors, sweeping the lobby
  { tile: [26, 8], facing: Math.PI / 2, phase: 1.2 }, // the gallery's eye
];

function tileCentre(tx, ty) {
  return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
}

/**
 * Read the plan into everything the world needs: the tile grid with its solid and
 * sight-blocking lookups, the loot pieces, the guard patrols, the cameras, the thief's
 * start and the getaway mat tiles.
 */
export function buildFloor() {
  const rows = PLAN.length;
  const cols = PLAN[0].length;
  const tiles = [];
  const loots = [];
  const exitTiles = [];
  for (let ty = 0; ty < rows; ty += 1) {
    const row = [];
    for (let tx = 0; tx < cols; tx += 1) {
      const ch = PLAN[ty][tx];
      row.push(ch);
      const loot = LOOT_BY_CHAR[ch];
      if (loot) {
        const c = tileCentre(tx, ty);
        loots.push({ id: loots.length, tx, ty, x: c.x, y: c.y, taken: false, ...loot });
      }
      if (ch === 'E') exitTiles.push({ tx, ty });
    }
    tiles.push(row);
  }
  const guards = GUARD_PATROLS.map((patrol, index) => ({
    id: index,
    waypoints: patrol.map(([tx, ty]) => tileCentre(tx, ty)),
  }));
  const cameras = CAMERA_POSTS.map((post, index) => {
    const c = tileCentre(post.tile[0], post.tile[1]);
    return { id: index, x: c.x, y: c.y, facing: post.facing, phase: post.phase };
  });
  return {
    tiles,
    rows,
    cols,
    loots,
    guards,
    cameras,
    exitTiles,
    start: tileCentre(7, 18), // on the getaway mat itself, south of every patrol lane
    isSolid(tx, ty) {
      if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) return true;
      return SOLID_CHARS.has(tiles[ty][tx]);
    },
  };
}
