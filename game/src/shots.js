// The screenshot scenes behind ?shot=start|play|busted|getaway. Each one plays the real
// rules forward from a fresh world, steered by a pilot that walks waypoints, waits in
// blind spots, tosses coin decoys and works the grab key, so every frame is a moment a
// real game can reach and the same seed always gives the same frame.

import { STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const IDLE = { mx: 0, my: 0, sneak: false, grab: false, coin: null };
const CROUCH = { mx: 0, my: 0, sneak: true, grab: false, coin: null };

/** One step of pilot input: walk (or tiptoe) toward a point. */
function toward(state, target, sneak) {
  const dx = target.x - state.player.x;
  const dy = target.y - state.player.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 7) return { ...IDLE, sneak };
  return { mx: dx / dist, my: dy / dist, sneak, grab: false, coin: null };
}

/**
 * Walk a route of legs: { x, y, sneak } waypoints, { wait: seconds } crouched pauses,
 * { coin: { x, y } } decoy tosses and { grab: seconds } of work on the loot. Stops early
 * when the run ends or, if stopAlarm is given, when the meter passes it.
 */
function walkRoute(world, route, maxSeconds, stopAlarm = Infinity) {
  let leg = 0;
  let grabLeft = 0;
  let waitLeft = 0;
  const limit = Math.floor(maxSeconds / STEP);
  for (let i = 0; i < limit; i += 1) {
    if (world.state.over || leg >= route.length) break;
    if (world.state.alarm >= stopAlarm) break;
    const stepDef = route[leg];
    if (stepDef.grab) {
      // Work the loot in place: the pilot stands still and holds the grab key, exactly
      // as a player must — moving resets the progress.
      if (grabLeft <= 0) grabLeft = stepDef.grab;
      world.step(STEP, { ...IDLE, grab: true });
      grabLeft -= STEP;
      if (grabLeft <= 0) leg += 1;
      continue;
    }
    if (stepDef.wait) {
      if (waitLeft <= 0) waitLeft = stepDef.wait;
      world.step(STEP, CROUCH);
      waitLeft -= STEP;
      if (waitLeft <= 0) leg += 1;
      continue;
    }
    if (stepDef.coin) {
      world.step(STEP, { ...IDLE, coin: stepDef.coin });
      leg += 1;
      continue;
    }
    const input = toward(world.state, stepDef, stepDef.sneak === true);
    world.step(STEP, input);
    if (input.mx === 0 && input.my === 0) leg += 1;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * start: the title over a floor already patrolling. play: mid-heist, the thief deep in
 * the hall with the meter up and a cone on him. busted: the office cash lifted, then a
 * run at the hall that ends the night. getaway: the whole job done properly — in by the
 * west door, a coin for the hall guard, the diamond, a breath, and out.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    walkRoute(world, [
      { wait: 2 },
      { x: 545, y: 735, sneak: true },
      { x: 545, y: 505, sneak: true },
      { x: 630, y: 440, sneak: true },
    ], 40, 36);
    // Freeze the moment the frame is richest: the meter well up, or an eye squarely on him.
    for (let i = 0; i < 200 && !world.state.over; i += 1) {
      if (world.state.alarm >= 36 || world.state.exposure >= 0.6) break;
      world.step(STEP, CROUCH);
    }
    return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY, best: 0 };
  }
  if (name === 'busted') {
    walkRoute(world, [
      { x: 185, y: 738, sneak: true },
      { x: 185, y: 580, sneak: true },
      { x: 185, y: 465, sneak: true },
      { x: 220, y: 378, sneak: true },
      { x: 220, y: 302, sneak: true },
      { x: 140, y: 302, sneak: true },
      { x: 112, y: 118, sneak: true },
      { grab: 1.2 },
      { x: 140, y: 302 },
      { x: 220, y: 302 },
      { x: 220, y: 378 },
      { x: 220, y: 460 },
      { x: 420, y: 460 },
      { x: 545, y: 505 },
      { x: 660, y: 380 },
      { x: 660, y: 240 },
    ], 120);
    return { screen: SCREEN_OVER, best: 0 };
  }
  if (name === 'getaway') {
    walkRoute(world, [
      { x: 185, y: 738 },
      { x: 185, y: 580 },
      { x: 185, y: 465 },
      { x: 250, y: 465 },
      { wait: 3 },
      { x: 445, y: 462, sneak: true },
      { x: 470, y: 380, sneak: true },
      { x: 620, y: 345, sneak: true },
      { coin: { x: 810, y: 495 } },
      { x: 660, y: 262, sneak: true },
      { x: 660, y: 142, sneak: true },
      { grab: 2.2 },
      { wait: 1.5 },
      { coin: { x: 815, y: 345 } },
      { x: 660, y: 262, sneak: true },
      { x: 600, y: 350, sneak: true },
      { x: 545, y: 500 },
      { x: 545, y: 690 },
      { x: 318, y: 738 },
    ], 240);
    return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY, best: 0 };
  }
  // start (and anything else): a few seconds of the floor going about its business.
  for (let i = 0; i < 4 / STEP; i += 1) world.step(STEP, IDLE);
  return { screen: SCREEN_TITLE, best: 0 };
}
