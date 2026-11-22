// bank.js — the floor plan of the bank: walls, cover, loot, patrols, cameras.
// The floor is a 32 x 20 tile grid. Everything is placed in tile units and
// converted to pixels by the helpers below, so the plan reads like a map.
//
// Three ways in, as the job demands:
//   * the grand hall straight up the middle, past the pillars and desks;
//   * the west offices and the records room, quiet but long;
//   * the east gallery and the security office, whose corridor has its own
//     door into the vault — the short way, watched by a camera.

import { COLS, ROWS } from './tuning.js';

// A wall or obstacle given in tile units: { tx, ty, w, h }.
export const WALLS = [
  // --- outer shell ---
  { tx: 0, ty: 0, w: COLS, h: 1 }, // north
  { tx: 0, ty: ROWS - 1, w: COLS, h: 1 }, // south
  { tx: 0, ty: 0, w: 1, h: ROWS }, // west
  { tx: COLS - 1, ty: 0, w: 1, h: ROWS }, // east

  // --- the vault (tiles x12..19, y1..3), door south at x15..16 ---
  { tx: 11, ty: 1, w: 1, h: 3 }, // vault west wall
  { tx: 20, ty: 1, w: 1, h: 1 }, // vault east wall, upper half
  { tx: 20, ty: 3, w: 1, h: 1 }, // vault east wall, lower half (gap at y2: the side door)
  { tx: 12, ty: 4, w: 3, h: 1 }, // vault south wall, west of the door
  { tx: 17, ty: 4, w: 3, h: 1 }, // vault south wall, east of the door

  // --- hall east wall (x20), y5..17: seals the hall off from the corridor ---
  { tx: 20, ty: 5, w: 1, h: 13 },

  // --- west offices (x1..9, y5..11), doors in the east wall at y6 and y10 ---
  { tx: 10, ty: 5, w: 1, h: 1 },
  { tx: 10, ty: 7, w: 1, h: 3 },
  { tx: 10, ty: 11, w: 1, h: 1 },
  // offices south wall (y12), door at x3..4 into the records room
  { tx: 1, ty: 12, w: 2, h: 1 },
  { tx: 5, ty: 12, w: 5, h: 1 },
  // records room (x1..9, y13..17): inner wall x5 with a gap at y15,
  // east wall x10 with a gap at y14 back into the hall
  { tx: 5, ty: 13, w: 1, h: 2 },
  { tx: 5, ty: 16, w: 1, h: 2 },
  { tx: 10, ty: 13, w: 1, h: 1 },
  { tx: 10, ty: 15, w: 1, h: 3 },

  // --- east gallery (x23..30, y5..11), door in the west wall at y8 ---
  { tx: 22, ty: 2, w: 1, h: 3 }, // corridor east wall, upper stretch
  { tx: 22, ty: 5, w: 1, h: 3 },
  { tx: 22, ty: 9, w: 1, h: 3 },
  // gallery south wall (y12), door at x26..27 down to the security office
  { tx: 23, ty: 12, w: 3, h: 1 },
  { tx: 28, ty: 12, w: 3, h: 1 },
  // security office (x23..30, y13..17), door in the west wall at y14
  { tx: 22, ty: 13, w: 1, h: 1 },
  { tx: 22, ty: 15, w: 1, h: 3 },
];

// Cover the thief can break line of sight behind. `kind` decides the look
// and the footprint; every one of these is solid to movement.
export const COVER = [
  // grand hall pillars
  { kind: 'pillar', tx: 13, ty: 7, w: 1, h: 1 },
  { kind: 'pillar', tx: 18, ty: 7, w: 1, h: 1 },
  { kind: 'pillar', tx: 13, ty: 12, w: 1, h: 1 },
  { kind: 'pillar', tx: 18, ty: 12, w: 1, h: 1 },
  // grand hall desks and planters
  { kind: 'desk', tx: 12, ty: 9, w: 2, h: 1 },
  { kind: 'desk', tx: 17, ty: 9, w: 2, h: 1 },
  { kind: 'desk', tx: 12, ty: 15, w: 2, h: 1 },
  { kind: 'desk', tx: 17, ty: 15, w: 2, h: 1 },
  { kind: 'planter', tx: 11, ty: 5, w: 1, h: 1 },
  { kind: 'planter', tx: 19, ty: 5, w: 1, h: 1 },
  { kind: 'planter', tx: 11, ty: 17, w: 1, h: 1 },
  { kind: 'planter', tx: 19, ty: 17, w: 1, h: 1 },
  // lobby pillars flanking the van
  { kind: 'pillar', tx: 11, ty: 18, w: 1, h: 1 },
  { kind: 'pillar', tx: 20, ty: 18, w: 1, h: 1 },
  // west office desks
  { kind: 'desk', tx: 2, ty: 6, w: 2, h: 1 },
  { kind: 'desk', tx: 6, ty: 6, w: 2, h: 1 },
  { kind: 'desk', tx: 2, ty: 9, w: 2, h: 1 },
  { kind: 'desk', tx: 6, ty: 9, w: 2, h: 1 },
  // records room desks
  { kind: 'desk', tx: 2, ty: 14, w: 2, h: 1 },
  { kind: 'desk', tx: 7, ty: 15, w: 2, h: 1 },
  // east gallery display cases
  { kind: 'case', tx: 24, ty: 6, w: 2, h: 1 },
  { kind: 'case', tx: 27, ty: 6, w: 2, h: 1 },
  { kind: 'case', tx: 24, ty: 10, w: 2, h: 1 },
  { kind: 'case', tx: 27, ty: 10, w: 2, h: 1 },
  // security office desk and planter
  { kind: 'desk', tx: 25, ty: 15, w: 2, h: 1 },
  { kind: 'planter', tx: 29, ty: 16, w: 1, h: 1 },
];

// Loot. `kind` is diamond | cash | gold | painting. Positions are tile
// centres; the painter draws each kind its own way.
export const LOOT_SPOTS = [
  { kind: 'diamond', tx: 15.5, ty: 2.5, name: 'Aurora Diamond' },
  { kind: 'gold', tx: 13.5, ty: 1.5, name: 'Gold bar' },
  { kind: 'gold', tx: 17.5, ty: 1.5, name: 'Gold bar' },
  { kind: 'cash', tx: 3.5, ty: 7.5, name: 'Cash bundle' },
  { kind: 'cash', tx: 2.5, ty: 15.5, name: 'Cash bundle' },
  { kind: 'cash', tx: 12.5, ty: 16.5, name: 'Cash bundle' },
  { kind: 'gold', tx: 25.5, ty: 7.5, name: 'Gold bar' },
  { kind: 'gold', tx: 28.5, ty: 15.5, name: 'Gold bar' },
  { kind: 'painting', tx: 29.5, ty: 8.5, name: 'Small masterpiece' },
  { kind: 'painting', tx: 8.5, ty: 16.5, name: 'Small masterpiece' },
];

// Guard patrols: a loop of tile-centre waypoints each guard walks forever.
export const PATROLS = [
  {
    name: 'Hall guard',
    waypoints: [
      [12.5, 6.5],
      [18.5, 6.5],
      [18.5, 16.5],
      [12.5, 16.5],
    ],
  },
  {
    name: 'Office guard',
    waypoints: [
      [2.5, 7.5],
      [8.5, 7.5],
      [8.5, 10.5],
      [2.5, 10.5],
    ],
  },
  {
    name: 'Gallery guard',
    waypoints: [
      [24.5, 7.5],
      [29.5, 7.5],
      [29.5, 9.5],
      [24.5, 9.5],
    ],
  },
  {
    name: 'Vault guard',
    waypoints: [
      [12.5, 5.5],
      [18.5, 5.5],
      [18.5, 8.5],
      [12.5, 8.5],
    ],
  },
];

// Cameras are fixed to a wall tile and sweep. `facing` is the rest angle in
// radians (0 = east, PI/2 = south); `phase` staggers the sweeps.
export const CAMERAS = [
  { tx: 15.5, ty: 4.4, facing: Math.PI / 2, phase: 0.0, name: 'Vault camera' },
  { tx: 21.5, ty: 2.6, facing: Math.PI / 2, phase: 1.7, name: 'Corridor camera' },
  { tx: 30.5, ty: 11.5, facing: Math.PI, phase: 3.1, name: 'Gallery camera' },
];

// The getaway: the van waits at the south doors, tiles x14..17, y18.
export const VAN = { tx: 14, ty: 18, w: 4, h: 1 };

// Where the thief starts the night: just inside the south doors.
export const START = { tx: 15.5, ty: 18.5 };

// The vault room's floor, drawn a different shade so the prize room reads.
export const VAULT_ROOM = { tx: 12, ty: 1, w: 8, h: 3 };

// --- helpers ---------------------------------------------------------------

// Tile rect -> pixel rect, for collision and drawing.
export function tileRect(r) {
  return { x: r.tx * 40, y: r.ty * 40, w: r.w * 40, h: r.h * 40 };
}

// Every solid rectangle on the floor, walls and cover together, in pixels.
export function buildSolids() {
  const solids = [];
  for (const wall of WALLS) solids.push(tileRect(wall));
  for (const piece of COVER) solids.push(tileRect(piece));
  return solids;
}

// Is the tile at (tx, ty) part of a wall? Used by the painter for trim.
export function isWallTile(tx, ty) {
  for (const wall of WALLS) {
    if (tx >= wall.tx && tx < wall.tx + wall.w && ty >= wall.ty && ty < wall.ty + wall.h) return true;
  }
  return false;
}
