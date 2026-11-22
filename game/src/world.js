// The world: the state of one night's work and the rules that advance it a step at a time.
// The thief crosses the floor; guards walk their patrols and hunt what they glimpse; cameras
// sweep; the alarm meter fills while the thief is seen and drains while he is not; loot is
// lifted by standing close and holding the grab key; a tossed coin pulls guards away.
// Nothing here draws or reads a real keyboard: main.js feeds it input, render.js paints it.

import { ALARM, CAMERA, CONE, DECOY, GUARD, SCORE, THIEF, TILE } from './config.js';
import { buildFloor } from './levels.js';
import { angleDelta, seenShare, turnToward } from './vision.js';

export const EVENT_GRABBED = 1; // a loot piece was lifted
export const EVENT_DIAMOND = 2; // the diamond specifically: the job is half done
export const EVENT_BUSTED = 4; // a guard laid a hand on the thief
export const EVENT_ALARM = 8; // the meter filled and the house alarm tripped
export const EVENT_ESCAPED = 16; // back on the mat with the diamond: a clean getaway
export const EVENT_COIN = 32; // a coin decoy landed
export const EVENT_SPOTTED = 64; // the thief came under somebody's eye this step

function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}

/** True when a circle at (x, y) with radius r overlaps any solid tile. */
function circleHits(floor, x, y, r) {
  const minTx = Math.floor((x - r) / TILE);
  const maxTx = Math.floor((x + r) / TILE);
  const minTy = Math.floor((y - r) / TILE);
  const maxTy = Math.floor((y + r) / TILE);
  for (let ty = minTy; ty <= maxTy; ty += 1) {
    for (let tx = minTx; tx <= maxTx; tx += 1) {
      if (!floor.isSolid(tx, ty)) continue;
      const nearX = clamp(x, tx * TILE, tx * TILE + TILE);
      const nearY = clamp(y, ty * TILE, ty * TILE + TILE);
      if ((x - nearX) ** 2 + (y - nearY) ** 2 < r * r) return true;
    }
  }
  return false;
}

/** Move a circle by (dx, dy), sliding along whatever it cannot pass. */
function slideMove(floor, body, dx, dy, r) {
  if (!circleHits(floor, body.x + dx, body.y + dy, r)) {
    body.x += dx;
    body.y += dy;
  } else if (!circleHits(floor, body.x + dx, body.y, r)) {
    body.x += dx;
  } else if (!circleHits(floor, body.x, body.y + dy, r)) {
    body.y += dy;
  }
}

export function createWorld(random) {
  const floor = buildFloor();
  const state = {};

  function reset() {
    state.time = 0;
    state.over = false;
    state.won = false;
    state.endReason = '';
    state.player = {
      x: floor.start.x,
      y: floor.start.y,
      angle: -Math.PI / 2, // facing into the bank
      moving: false,
      sneaking: false,
    };
    state.guards = floor.guards.map((spec) => ({
      x: spec.waypoints[0].x,
      y: spec.waypoints[0].y,
      angle: Math.atan2(
        spec.waypoints[1].y - spec.waypoints[0].y,
        spec.waypoints[1].x - spec.waypoints[0].x,
      ),
      waypoints: spec.waypoints,
      wp: 1,
      pauseLeft: 0,
      mode: 'patrol', // patrol | hunt | look | decoy
      decoy: null, // the coin this guard is currently drawn to, if any
      staring: false,
      stareLeft: 0, // how long he will keep staring at a glimpse before shaking it off
      stareCooldown: 0, // after shaking one off, he does not stare again for a while
      targetX: 0,
      targetY: 0,
      memory: 0,
      lookLeft: 0,
      lookSpin: 1,
      sees: 0,
    }));
    state.cameras = floor.cameras.map((spec) => ({ ...spec, angle: spec.facing, sees: 0 }));
    for (const loot of floor.loots) loot.taken = false;
    state.loots = floor.loots;
    state.alarm = 0;
    state.maxAlarm = 0;
    state.exposure = 0; // strongest share by which anybody sees the thief right now
    state.lastSeen = null;
    state.hasDiamond = false;
    state.lootValue = 0;
    state.lootCount = 0;
    state.coinsLeft = DECOY.count;
    state.decoys = [];
    state.grabTarget = null;
    state.grabProgress = 0;
    state.score = 0;
  }

  /** The loot piece the thief is close enough to work on, if any. */
  function lootInReach() {
    let best = null;
    let bestDist = Infinity;
    for (const loot of state.loots) {
      if (loot.taken) continue;
      const d = Math.hypot(loot.x - state.player.x, loot.y - state.player.y);
      if (d < THIEF.reach + 16 && d < bestDist) {
        best = loot;
        bestDist = d;
      }
    }
    return best;
  }

  function onExitMat() {
    const tx = Math.floor(state.player.x / TILE);
    const ty = Math.floor(state.player.y / TILE);
    return floor.exitTiles.some((t) => t.tx === tx && t.ty === ty);
  }

  function finishScore() {
    let score = state.lootValue + (state.hasDiamond ? SCORE.diamond : 0);
    if (state.won) {
      if (state.maxAlarm === 0) score += SCORE.unseenBonus;
      else if (state.maxAlarm < 50) score += SCORE.ghostBonus;
      score += Math.max(0, Math.floor(SCORE.parSeconds - state.time)) * SCORE.timeBonusPerSecond;
    }
    return score;
  }

  function stepPlayer(dt, input) {
    const p = state.player;
    const speed = input.sneak ? THIEF.sneakSpeed : THIEF.walkSpeed;
    p.sneaking = input.sneak;
    p.moving = input.mx !== 0 || input.my !== 0;
    if (p.moving) {
      p.angle = Math.atan2(input.my, input.mx);
      slideMove(floor, p, input.mx * speed * dt, input.my * speed * dt, THIEF.radius);
    }
  }

  function stepGuard(dt, guard) {
    const p = state.player;
    guard.sees = seenShare(
      floor, guard.x, guard.y, guard.angle, CONE.guardRange, CONE.guardHalfAngle, p.x, p.y,
    );
    guard.staring = false;
    if (guard.stareCooldown > 0) guard.stareCooldown -= dt;
    if (guard.sees > 0) {
      state.lastSeen = { x: p.x, y: p.y };
      guard.memory = GUARD.memorySeconds;
      if (guard.sees > GUARD.huntShare) {
        guard.mode = 'hunt';
        guard.targetX = p.x;
        guard.targetY = p.y;
      } else if (guard.sees > GUARD.stareShare && guard.stareCooldown <= 0) {
        // A glimpse: he stops and stares — but only for a moment. If the look never
        // sharpens into a hunt he shakes it off and goes back to his round, and will
        // not stare again at once. Stay in his gaze and it becomes a hunt.
        if (guard.stareLeft <= 0) guard.stareLeft = 1.6;
        guard.staring = true;
      }
    } else if (guard.memory > 0) {
      guard.memory -= dt;
      if (guard.mode === 'hunt') {
        guard.targetX = state.lastSeen.x;
        guard.targetY = state.lastSeen.y;
      }
    }

    // A fresh coin pulls a guard off his rounds, unless he has eyes on the thief.
    if (guard.mode !== 'hunt') {
      for (const decoy of state.decoys) {
        if (decoy.ttl > 0 && Math.hypot(decoy.x - guard.x, decoy.y - guard.y) < DECOY.hearRange) {
          guard.mode = 'decoy';
          guard.decoy = decoy;
          guard.targetX = decoy.x;
          guard.targetY = decoy.y;
        }
      }
    }
    // A coin that has been found, or has lain too long, stops pulling him.
    if (guard.mode === 'decoy' && (!guard.decoy || guard.decoy.ttl <= 0)) {
      guard.mode = 'look';
      guard.lookLeft = 0.8;
      guard.lookSpin = random() < 0.5 ? -1 : 1;
      guard.decoy = null;
    }

    if (guard.mode === 'hunt' || guard.mode === 'decoy') {
      const dx = guard.targetX - guard.x;
      const dy = guard.targetY - guard.y;
      const dist = Math.hypot(dx, dy);
      const arrived = dist < 14;
      if (!arrived) {
        const speed = guard.mode === 'hunt' ? GUARD.chaseSpeed : GUARD.patrolSpeed + 18;
        guard.angle = turnToward(guard.angle, Math.atan2(dy, dx), GUARD.chaseTurnRate * dt);
        slideMove(floor, guard, (dx / dist) * speed * dt, (dy / dist) * speed * dt, GUARD.radius);
      } else if (guard.mode === 'hunt' && guard.memory <= 0) {
        guard.mode = 'look';
        guard.lookLeft = 1.3;
        guard.lookSpin = angleDelta(guard.angle, Math.atan2(p.y - guard.y, p.x - guard.x)) >= 0 ? 1 : -1;
      } else if (guard.mode === 'decoy') {
        guard.mode = 'look';
        guard.lookLeft = DECOY.lookSeconds;
        guard.lookSpin = random() < 0.5 ? -1 : 1;
        if (guard.decoy) guard.decoy.ttl = 0;
        guard.decoy = null;
      }
      return;
    }

    if (guard.mode === 'look') {
      guard.lookLeft -= dt;
      guard.angle += guard.lookSpin * 1.9 * dt;
      if (guard.lookLeft <= 0) {
        guard.mode = 'patrol';
        // Resume at the nearest post of the round.
        let nearest = 0;
        let nearestDist = Infinity;
        guard.waypoints.forEach((w, i) => {
          const d = Math.hypot(w.x - guard.x, w.y - guard.y);
          if (d < nearestDist) {
            nearestDist = d;
            nearest = i;
          }
        });
        guard.wp = nearest;
      }
      return;
    }

    if (guard.staring && guard.mode === 'patrol') {
      // He is stopped, turning to face the glimpse: the stare runs down, then he shakes
      // it off, looks around briefly, and will not stare again for a few seconds.
      guard.angle = turnToward(
        guard.angle,
        Math.atan2(state.player.y - guard.y, state.player.x - guard.x),
        GUARD.chaseTurnRate * dt,
      );
      guard.stareLeft -= dt;
      if (guard.stareLeft <= 0) {
        guard.stareCooldown = 4;
        guard.mode = 'look';
        guard.lookLeft = 0.8;
        guard.lookSpin = random() < 0.5 ? -1 : 1;
      }
      return;
    }

    // Patrol: walk the round, pause at each post, turn to face the next leg while paused.
    const post = guard.waypoints[guard.wp];
    const dx = post.x - guard.x;
    const dy = post.y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (guard.pauseLeft > 0) {
      guard.pauseLeft -= dt;
      guard.angle = turnToward(guard.angle, Math.atan2(dy, dx), GUARD.turnRate * dt);
    } else if (dist < 8) {
      guard.wp = (guard.wp + 1) % guard.waypoints.length;
      guard.pauseLeft = GUARD.pauseSeconds * (0.75 + random() * 0.5);
    } else {
      guard.angle = turnToward(guard.angle, Math.atan2(dy, dx), GUARD.turnRate * dt);
      slideMove(floor, guard, (dx / dist) * GUARD.patrolSpeed * dt, (dy / dist) * GUARD.patrolSpeed * dt, GUARD.radius);
    }
  }

  function stepCameras(dt) {
    for (const cam of state.cameras) {
      cam.angle = cam.facing + Math.sin(state.time * CAMERA.sweepRate + cam.phase) * CAMERA.sweepArc;
      cam.sees = seenShare(
        floor, cam.x, cam.y, cam.angle, CONE.cameraRange, CONE.cameraHalfAngle,
        state.player.x, state.player.y,
      );
      if (cam.sees > 0) state.lastSeen = { x: state.player.x, y: state.player.y };
    }
  }

  function stepAlarm(dt) {
    let guardSees = 0;
    for (const guard of state.guards) guardSees = Math.max(guardSees, guard.sees);
    let cameraSees = 0;
    for (const cam of state.cameras) cameraSees = Math.max(cameraSees, cam.sees);
    state.exposure = Math.max(guardSees, cameraSees);
    let events = 0;
    if (state.exposure > 0) events |= EVENT_SPOTTED;
    const fill = ALARM.guardRate * guardSees + ALARM.cameraRate * cameraSees;
    if (fill > 0) {
      let factor = 1;
      if (state.player.sneaking) factor = ALARM.sneakFactor;
      else if (state.player.moving) factor = ALARM.runFactor;
      state.alarm = clamp(state.alarm + fill * factor * dt, 0, ALARM.max);
    } else {
      const decay = state.hasDiamond ? ALARM.decayAfterGrab : ALARM.decay;
      state.alarm = clamp(state.alarm - decay * dt, 0, ALARM.max);
    }
    state.maxAlarm = Math.max(state.maxAlarm, state.alarm);
    // A hot meter sends the nearest guard to check the last place the thief was seen.
    if (state.alarm >= ALARM.huntThreshold && state.lastSeen) {
      let nearest = null;
      let nearestDist = Infinity;
      for (const guard of state.guards) {
        const d = Math.hypot(guard.x - state.lastSeen.x, guard.y - state.lastSeen.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = guard;
        }
      }
      if (nearest && nearest.mode === 'patrol') {
        nearest.mode = 'hunt';
        nearest.targetX = state.lastSeen.x;
        nearest.targetY = state.lastSeen.y;
        nearest.memory = 1.2;
      }
    }
    return events;
  }

  function stepGrab(dt, input) {
    let events = 0;
    const target = lootInReach();
    state.grabTarget = target;
    if (target && input.grab && !state.player.moving) {
      state.grabProgress += dt / target.grabSeconds;
      if (state.grabProgress >= 1) {
        target.taken = true;
        state.grabProgress = 0;
        state.lootCount += 1;
        events |= EVENT_GRABBED;
        if (target.kind === 'diamond') {
          state.hasDiamond = true;
          events |= EVENT_DIAMOND;
        } else {
          state.lootValue += target.value;
        }
      }
    } else {
      state.grabProgress = 0;
    }
    return events;
  }

  /**
   * Advance the world one step. `input` is { mx, my, sneak, grab, coin } where coin is a
   * floor point or null. Returns the event bits raised by the step.
   */
  function step(dt, input) {
    if (state.over) return 0;
    let events = 0;
    state.time += dt;

    if (input.coin && state.coinsLeft > 0) {
      const tx = Math.floor(input.coin.x / TILE);
      const ty = Math.floor(input.coin.y / TILE);
      const near = Math.hypot(input.coin.x - state.player.x, input.coin.y - state.player.y) < 380;
      if (near && !floor.isSolid(tx, ty)) {
        state.decoys.push({ x: input.coin.x, y: input.coin.y, ttl: 5 });
        state.coinsLeft -= 1;
        events |= EVENT_COIN;
      }
    }
    for (const decoy of state.decoys) decoy.ttl -= dt;
    state.decoys = state.decoys.filter((d) => d.ttl > 0);

    stepPlayer(dt, input);
    for (const guard of state.guards) stepGuard(dt, guard);
    stepCameras(dt);
    events |= stepAlarm(dt);
    events |= stepGrab(dt, input);

    for (const guard of state.guards) {
      if (Math.hypot(guard.x - state.player.x, guard.y - state.player.y) < GUARD.catchDistance) {
        state.over = true;
        state.won = false;
        state.endReason = 'caught';
        state.score = finishScore();
        return events | EVENT_BUSTED;
      }
    }
    if (state.alarm >= ALARM.max) {
      state.over = true;
      state.won = false;
      state.endReason = 'alarm';
      state.score = finishScore();
      return events | EVENT_ALARM;
    }
    if (state.hasDiamond && onExitMat()) {
      state.over = true;
      state.won = true;
      state.endReason = 'escaped';
      state.score = finishScore();
      return events | EVENT_ESCAPED;
    }
    return events;
  }

  reset();
  return { floor, state, reset, step };
}
