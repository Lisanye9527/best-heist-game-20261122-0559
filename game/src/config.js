// Shared numbers for The Gilded Vault: the playfield, the thief, the guards, the cameras and
// the alarm. Everything tunable lives here so the world, the renderer and the screenshot
// staging all read the same values.

/** The canvas is a fixed 1280x800 stage; the floor is a grid of square tiles laid over it. */
export const STAGE = { width: 1280, height: 800 };
export const TILE = 40;
export const COLS = STAGE.width / TILE; // 32
export const ROWS = STAGE.height / TILE; // 20

/** Fixed simulation step, in seconds: the world advances in these and nothing else. */
export const STEP = 1 / 60;

/** The thief: quick on foot, slower and harder to spot while tiptoeing (Shift). */
export const THIEF = {
  radius: 13,
  walkSpeed: 168, // px per second
  sneakSpeed: 92,
  reach: 34, // how close to a loot piece the thief must be to work on it
};

/** Guards walk patrols, pause at each post, and turn at a limited rate so cones can be read. */
export const GUARD = {
  radius: 14,
  patrolSpeed: 74,
  chaseSpeed: 128,
  turnRate: 2.6, // radians per second while patrolling
  chaseTurnRate: 4.4,
  pauseSeconds: 0.9, // stood at each waypoint, scanning
  catchDistance: 26, // centre to centre: closer than this and the thief is grabbed
  memorySeconds: 1.5, // how long a guard keeps hunting the last seen spot
  stareShare: 0.25, // a glimpse this strong stops a guard to stare at the thief
  huntShare: 0.55, // a look this strong sends him hunting: a real look, not a glimpse
};

/** Vision cones, shared by guards and cameras: a range and a half-angle. */
export const CONE = {
  guardRange: 218,
  cameraRange: 196,
  guardHalfAngle: 0.62, // radians, about 35 degrees
  cameraHalfAngle: 0.52,
};

/**
 * The alarm meter, 0 to 100. Being seen fills it (nearer and louder fills it faster),
 * staying unseen drains it. At 100 the house alarm trips and the run is over.
 */
export const ALARM = {
  max: 100,
  guardRate: 38, // per second at point blank, scaling down with distance
  cameraRate: 26,
  sneakFactor: 0.45, // tiptoeing fills the meter at this share of the rate
  runFactor: 1.25, // moving at full pace fills it faster than standing still
  decay: 10, // per second while nobody sees the thief
  decayAfterGrab: 6.5, // once the diamond is out, the house stays jumpy
  huntThreshold: 45, // past this, guards leave their patrol to check the last seen spot
};

/** Cameras sweep their cone back and forth around the way they face. */
export const CAMERA = { sweepRate: 0.55, sweepArc: 0.85 }; // radians per second, radians each way

/** Coin decoys: click to toss one; guards nearby go and look at where it landed. */
export const DECOY = { count: 3, hearRange: 290, lookSeconds: 1.7, radius: 7 };

/** Scores: the diamond is the job; everything else is greed. */
export const SCORE = {
  diamond: 1000,
  ghostBonus: 400, // alarm never reached 50 (world.js awards it while maxAlarm < 50)
  unseenBonus: 250, // alarm never rose at all (maxAlarm === 0)
  timeBonusPerSecond: 2, // left on the par clock at the getaway
  parSeconds: 300,
};

/** Colours, one place, so the floor reads the same in every file that paints it. */
export const INK = {
  backdrop: '#0d1017',
  wallTop: '#525f7a',
  wallFace: '#313a4e',
  wallEdge: '#6b7791',
  marbleA: '#424c66',
  marbleB: '#3b445c',
  carpet: '#6b2436',
  carpetEdge: '#84334a',
  vaultFloor: '#4c5a3c',
  wood: '#86622f',
  woodDark: '#654a22',
  brass: '#c9a227',
  brassBright: '#f2cd4e',
  glass: '#7fd4e6',
  plant: '#3f7a3a',
  plantDark: '#2c5527',
  guardCone: 'rgba(255, 190, 64, 0.20)',
  guardConeHot: 'rgba(255, 120, 40, 0.34)',
  cameraCone: 'rgba(255, 84, 96, 0.16)',
  cameraConeHot: 'rgba(255, 60, 70, 0.32)',
};
