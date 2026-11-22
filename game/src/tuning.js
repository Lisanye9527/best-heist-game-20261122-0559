// tuning.js — every tunable number for The Gilded Vault, in one place.
// Nothing here knows about the canvas or the DOM; the simulation and the
// painter read these values so a balance tweak never touches game logic.

export const TILE = 40; // pixels per floor tile
export const COLS = 32; // floor width in tiles
export const ROWS = 20; // floor height in tiles
export const VIEW_W = COLS * TILE; // 1280
export const VIEW_H = ROWS * TILE; // 800

// --- the thief -------------------------------------------------------------
export const THIEF = {
  radius: 13,
  walkSpeed: 178, // pixels per second
  tiptoeSpeed: 88, // Shift: half speed, half the alarm fill while seen
  liftReach: 46, // how close loot must be to lift it with E
  coinRange: 300, // how far a tossed coin can fly
  coinsCarried: 3,
};

// --- the alarm -------------------------------------------------------------
export const ALARM = {
  max: 100,
  guardFill: 27, // per second while a guard sees the thief
  cameraFill: 21, // per second while a camera sees the thief
  tiptoeFactor: 0.5, // multiplier on fill while tiptoeing
  drain: 17, // per second while nobody sees the thief
  chaseAt: 62, // alarm level where guards stop patrolling and hunt
  ghostCeiling: 25, // stay under this all night to earn the ghost bonus
};

// --- guards ----------------------------------------------------------------
export const GUARD = {
  radius: 14,
  patrolSpeed: 58,
  huntSpeed: 118,
  investigateSpeed: 88,
  sightRange: 205,
  halfCone: 0.56, // radians either side of facing (~32 degrees)
  catchDistance: 27, // touching the thief ends the night
  investigateTime: 3.0, // seconds spent staring at a coin before resuming
  waypointPause: 0.7, // seconds a guard waits at each patrol corner
};

// --- cameras ---------------------------------------------------------------
export const CAMERA = {
  sightRange: 225,
  halfCone: 0.49, // radians either side of the lens (~28 degrees)
  sweepHalf: 0.72, // radians the lens swings either side of centre
  sweepPeriod: 5.2, // seconds for one full sweep there and back
};

// --- loot ------------------------------------------------------------------
export const LOOT = {
  diamondLift: 1.8, // seconds of holding E to lift the Aurora Diamond
  sideLift: 0.7, // seconds of holding E for cash, gold and paintings
  diamondScore: 5000,
  cashScore: 250,
  goldScore: 600,
  paintingScore: 900,
  ghostBonus: 1500,
  timeBonusRate: 8, // points per second under the par time
  timePar: 240, // seconds; faster getaways earn more
};

// --- palette ---------------------------------------------------------------
// A night-time bank: deep green marble, brass trim, warm lamplight. Danger is
// always amber/red, loot is always gold, cover is always dark — the player
// should read the floor at a glance, without a legend.
export const PALETTE = {
  floorA: '#1d2b26',
  floorB: '#223129',
  floorLine: '#2c4034',
  rug: '#3d2430',
  wall: '#0e1512',
  wallTop: '#31473a',
  desk: '#4a3623',
  deskTop: '#6b4e2e',
  pillar: '#5c5a52',
  planter: '#1f4d2e',
  planterLeaf: '#3f7d44',
  caseGlass: '#9fc4d4',
  caseFrame: '#8a6d2f',
  vaultDoor: '#7d6420',
  vaultFloor: '#2a2f45',
  van: '#b3392e',
  vanTrim: '#e8e3d3',
  thief: '#151312',
  thiefTrim: '#d8b45a',
  guard: '#2b3a67',
  guardTrim: '#c8ccd8',
  camera: '#3a3f46',
  coneGuard: 'rgba(255, 196, 66, 0.20)',
  coneGuardSeen: 'rgba(255, 64, 48, 0.30)',
  coneCamera: 'rgba(120, 200, 255, 0.16)',
  coneCameraSeen: 'rgba(255, 64, 48, 0.28)',
  lootGold: '#f2c94c',
  lootCash: '#7ec850',
  lootPainting: '#c96f9b',
  diamond: '#bfe9ff',
  hudBack: 'rgba(8, 12, 10, 0.82)',
  hudText: '#e8e3d3',
  alarmCalm: '#7ec850',
  alarmWarm: '#f2c94c',
  alarmHot: '#ff4030',
};
