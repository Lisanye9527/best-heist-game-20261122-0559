// scenes.js — deterministic staged scenes for the screenshots.
//
// `?shot=play`, `?shot=title`, `?shot=busted` and `?shot=win` each arrange
// the world by hand (positions, alarm, loot state) and freeze it, so a
// screenshot is a real render of the game's own code in a fixed, readable
// moment. Nothing here draws: the painter does all of that. The staged
// scenes never run the simulation, so the frame is identical every time.

import { TILE } from './tuning.js';

function placeThief(world, tx, ty, facing) {
  world.thief.x = tx * TILE;
  world.thief.y = ty * TILE;
  world.thief.facing = facing;
}

function placeGuard(world, index, tx, ty, facing, mode) {
  const guard = world.guards[index];
  guard.x = tx * TILE;
  guard.y = ty * TILE;
  guard.facing = facing;
  guard.mode = mode || 'patrol';
  guard.pauseLeft = 0;
}

// A mid-heist moment in the grand hall: the thief crossing between two
// pillars, a guard's cone sweeping across the rug, a camera watching from
// the vault door, a cash bundle waiting by a desk, and the alarm at 38%.
export function stagePlay(world) {
  world.state = 'playing';
  placeThief(world, 15.5, 11.5, -Math.PI / 2);
  placeGuard(world, 0, 15.5, 8.5, Math.PI / 2); // dead ahead of the thief, so the staged "seen" is geometrically true
  placeGuard(world, 1, 4.5, 8.5, 0);
  placeGuard(world, 2, 26.5, 8.5, Math.PI);
  placeGuard(world, 3, 17.5, 6.5, Math.PI / 2);
  world.cameras[0].angle = Math.PI / 2 + 0.4;
  world.cameras[1].angle = Math.PI / 2 - 0.3;
  world.cameras[2].angle = Math.PI + 0.2;
  world.cameras[0].seesThief = false;
  world.cameras[1].seesThief = false;
  world.cameras[2].seesThief = false;
  world.guards[0].seesThief = true;
  world.alarm = 38;
  world.maxAlarm = 38;
  world.score = 250;
  world.time = 73;
  // One cash bundle already lifted, so the score is honest.
  const cash = world.loot.find((l) => l.kind === 'cash' && l.x === 3.5 * TILE);
  if (cash) cash.taken = true;
  world.stats.lootTaken = 1;
}

// The title screen over a live-looking floor: guards mid-patrol, cones out.
export function stageTitle(world) {
  world.state = 'title';
  placeThief(world, 15.5, 18.5, -Math.PI / 2);
  placeGuard(world, 0, 15.5, 10.5, -Math.PI / 2);
  placeGuard(world, 1, 5.5, 8.5, 0);
  placeGuard(world, 2, 26.5, 8.5, Math.PI);
  placeGuard(world, 3, 13.5, 6.5, Math.PI / 2);
  world.cameras[0].angle = Math.PI / 2;
  world.cameras[1].angle = Math.PI / 2;
  world.cameras[2].angle = Math.PI;
  world.alarm = 0;
  world.time = 0;
}

// Caught in the vault doorway: the alarm at full, a guard on the thief.
export function stageBusted(world) {
  world.state = 'busted';
  placeThief(world, 15.5, 5.5, -Math.PI / 2);
  placeGuard(world, 0, 15.5, 6.8, -Math.PI / 2, 'hunt');
  placeGuard(world, 3, 13.5, 6.5, 0);
  world.guards[0].seesThief = true;
  world.cameras[0].seesThief = true;
  world.cameras[0].angle = Math.PI / 2;
  world.alarm = 100;
  world.maxAlarm = 100;
  world.score = 850;
  world.time = 121;
  world.message = 'The alarm hit full — the doors slammed shut.';
  const cash = world.loot.find((l) => l.kind === 'cash' && l.x === 3.5 * TILE);
  if (cash) cash.taken = true;
  const gold = world.loot.find((l) => l.kind === 'gold' && l.x === 25.5 * TILE);
  if (gold) gold.taken = true;
  world.stats.lootTaken = 2;
  world.stats.timesSeen = 3;
}

// The getaway: diamond taken, thief at the van, score tallied.
export function stageWin(world) {
  world.state = 'win';
  placeThief(world, 15.5, 18.5, Math.PI / 2);
  placeGuard(world, 0, 12.5, 14.5, Math.PI);
  placeGuard(world, 3, 18.5, 8.5, Math.PI / 2);
  world.cameras[0].angle = Math.PI / 2;
  world.cameras[1].angle = Math.PI / 2;
  const diamond = world.loot.find((l) => l.kind === 'diamond');
  if (diamond) diamond.taken = true;
  const gold = world.loot.find((l) => l.kind === 'gold' && l.x === 13.5 * TILE);
  if (gold) gold.taken = true;
  const cash = world.loot.find((l) => l.kind === 'cash' && l.x === 12.5 * TILE);
  if (cash) cash.taken = true;
  world.diamondTaken = true;
  world.score = 6850;
  world.ghostBonus = 0;
  world.timeBonus = 850;
  world.alarm = 12;
  world.maxAlarm = 41;
  world.time = 134;
  world.stats.lootTaken = 3;
  world.stats.timesSeen = 2;
  world.message = 'Clean getaway.';
}

export function stageShot(world, name) {
  if (name === 'play') stagePlay(world);
  else if (name === 'busted') stageBusted(world);
  else if (name === 'win') stageWin(world);
  else stageTitle(world);
  return true;
}
