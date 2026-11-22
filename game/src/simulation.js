// simulation.js — the world: one thief, four guards, three cameras, ten
// pieces of loot, and an alarm meter that decides the night.
//
// The world is plain data plus one `step(world, controls, dt, audio)`
// function. It knows nothing about the canvas; the painter reads the same
// data. States: 'title' | 'playing' | 'paused' | 'busted' | 'win'.

import { TILE, THIEF, GUARD, CAMERA, ALARM, LOOT, VIEW_W, VIEW_H } from './tuning.js';
import { WALLS, COVER, LOOT_SPOTS, PATROLS, CAMERAS, VAN, START, buildSolids, tileRect } from './bank.js';
import { insideCone, hasLineOfSight, bearingTo, turnToward } from './sight.js';

export function makeWorld() {
  const solids = buildSolids();
  const loot = LOOT_SPOTS.map((spot, i) => ({
    id: i,
    kind: spot.kind,
    name: spot.name,
    x: spot.tx * TILE,
    y: spot.ty * TILE,
    taken: false,
    lift: 0, // 0..1 progress while E is held beside it
  }));
  const guards = PATROLS.map((patrol) => {
    const [wx, wy] = patrol.waypoints[0];
    return {
      name: patrol.name,
      waypoints: patrol.waypoints.map(([x, y]) => ({ x: x * TILE, y: y * TILE })),
      wp: 1, // next waypoint index
      x: wx * TILE,
      y: wy * TILE,
      facing: Math.PI / 2,
      mode: 'patrol', // patrol | investigate | hunt
      pauseLeft: 0,
      investigateLeft: 0,
      huntLeft: 0, // seconds the hunt lasts after the gaze breaks
      lookX: 0,
      lookY: 0,
      seesThief: false,
    };
  });
  const cameras = CAMERAS.map((cam) => ({
    name: cam.name,
    x: cam.tx * TILE,
    y: cam.ty * TILE,
    facing: cam.facing,
    phase: cam.phase,
    angle: cam.facing,
    seesThief: false,
  }));
  const van = tileRect(VAN);
  return {
    solids,
    loot,
    guards,
    cameras,
    van,
    state: 'title',
    time: 0, // seconds of the night so far (playing only)
    clock: 0, // seconds since load (drives camera sweeps)
    alarm: 0,
    maxAlarm: 0,
    score: 0,
    coins: THIEF.coinsCarried,
    coinSpots: [], // landed coins guards walk to: {x, y, age}
    diamondTaken: false,
    thief: {
      x: START.tx * TILE,
      y: START.ty * TILE,
      facing: -Math.PI / 2,
      moving: false,
      tiptoe: false,
      liftTarget: null, // loot id being lifted, or null
    },
    stats: { lootTaken: 0, timesSeen: 0, coinsTossed: 0 },
    message: '', // one-line hint shown under the HUD
    messageLeft: 0,
  };
}

// --- movement ---------------------------------------------------------------

// Circle-vs-rect collision: move one axis at a time so the thief slides
// along walls instead of sticking on corners.
function circleHitsSolids(x, y, r, solids) {
  for (const s of solids) {
    const cx = Math.max(s.x, Math.min(x, s.x + s.w));
    const cy = Math.max(s.y, Math.min(y, s.y + s.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

function moveCircle(body, dx, dy, r, solids) {
  const nx = body.x + dx;
  if (!circleHitsSolids(nx, body.y, r, solids)) body.x = nx;
  const ny = body.y + dy;
  if (!circleHitsSolids(body.x, ny, r, solids)) body.y = ny;
  body.x = Math.max(r, Math.min(VIEW_W - r, body.x));
  body.y = Math.max(r, Math.min(VIEW_H - r, body.y));
}

function nearestLoot(world, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const item of world.loot) {
    if (item.taken) continue;
    const d = Math.hypot(item.x - world.thief.x, item.y - world.thief.y);
    if (d < bestD) {
      bestD = d;
      best = item;
    }
  }
  return best;
}

// --- the step ---------------------------------------------------------------

export function step(world, controls, dt, audio) {
  world.clock += dt;
  if (world.state !== 'playing') return;

  world.time += dt;
  const thief = world.thief;
  const move = controls.moveVector();
  thief.tiptoe = controls.tiptoe();
  thief.moving = move.x !== 0 || move.y !== 0;
  const speed = thief.tiptoe ? THIEF.tiptoeSpeed : THIEF.walkSpeed;
  if (thief.moving) {
    thief.facing = Math.atan2(move.y, move.x);
    moveCircle(thief, move.x * speed * dt, move.y * speed * dt, THIEF.radius, world.solids);
    if (Math.random() < dt * 2.2) audio.step();
  }

  // --- coin toss: click throws toward the mouse, guards come to look -------
  if (controls.state.clicked && world.coins > 0) {
    const rect = { x: controls.state.clickX, y: controls.state.clickY };
    const dx = rect.x - thief.x;
    const dy = rect.y - thief.y;
    const d = Math.hypot(dx, dy) || 1;
    const fly = Math.min(d, THIEF.coinRange);
    const lx = thief.x + (dx / d) * fly;
    const ly = thief.y + (dy / d) * fly;
    world.coinSpots.push({ x: lx, y: ly, age: 0 });
    world.coins -= 1;
    world.stats.coinsTossed += 1;
    audio.coin();
    setTimeout(() => audio.coinLand(), 180);
    for (const guard of world.guards) {
      const gd = Math.hypot(guard.x - lx, guard.y - ly);
      if (gd < 340 && guard.mode !== 'hunt') {
        guard.mode = 'investigate';
        guard.lookX = lx;
        guard.lookY = ly;
        guard.investigateLeft = GUARD.investigateTime;
      }
    }
    setMessage(world, 'A coin rings on the marble — a guard goes to look.', 2.5);
  }

  // --- lifting loot: hold E beside a piece ---------------------------------
  const near = nearestLoot(world, THIEF.liftReach);
  thief.liftTarget = null;
  if (near && controls.lifting()) {
    thief.liftTarget = near.id;
    const need = near.kind === 'diamond' ? LOOT.diamondLift : LOOT.sideLift;
    near.lift += dt / need;
    if (near.lift >= 1) {
      near.taken = true;
      near.lift = 0;
      world.stats.lootTaken += 1;
      if (near.kind === 'diamond') {
        world.diamondTaken = true;
        world.score += LOOT.diamondScore;
        audio.diamond();
        setMessage(world, 'The Aurora Diamond is yours — get back to the van!', 4);
      } else {
        const value = near.kind === 'cash' ? LOOT.cashScore : near.kind === 'gold' ? LOOT.goldScore : LOOT.paintingScore;
        world.score += value;
        audio.pickup();
        setMessage(world, `${near.name} lifted (+${value}).`, 2);
      }
    }
  } else {
    for (const item of world.loot) {
      if (!item.taken && item.lift > 0) item.lift = Math.max(0, item.lift - dt * 2);
    }
  }

  // --- cameras sweep, then watch --------------------------------------------
  let anyoneSees = false;
  for (const cam of world.cameras) {
    cam.angle = cam.facing + Math.sin((world.clock / CAMERA.sweepPeriod) * Math.PI * 2 + cam.phase) * CAMERA.sweepHalf;
    cam.seesThief = insideCone(cam.x, cam.y, cam.angle, CAMERA.sightRange, CAMERA.halfCone, thief.x, thief.y, world.solids);
    if (cam.seesThief) anyoneSees = true;
  }

  // --- guards patrol, investigate, or hunt ----------------------------------
  for (const guard of world.guards) {
    guard.seesThief = insideCone(guard.x, guard.y, guard.facing, GUARD.sightRange, GUARD.halfCone, thief.x, thief.y, world.solids);
    if (guard.seesThief) anyoneSees = true;

    if (guard.seesThief && world.alarm >= ALARM.chaseAt) {
      guard.mode = 'hunt';
    }

    if (guard.mode === 'hunt') {
      const bearing = bearingTo(guard.x, guard.y, thief.x, thief.y);
      guard.facing = turnToward(guard.facing, bearing, dt * 5);
      const stepLen = GUARD.huntSpeed * dt;
      moveCircle(guard, Math.cos(guard.facing) * stepLen, Math.sin(guard.facing) * stepLen, GUARD.radius, world.solids);
      // A hunted guard does not give up the moment the gaze breaks: he
      // keeps coming for a beat, so ducking behind a desk buys time, not
      // a clean escape.
      if (guard.seesThief) {
        guard.huntLeft = 1.5;
      } else {
        guard.huntLeft -= dt;
        if (guard.huntLeft <= 0) guard.mode = 'patrol';
      }
    } else if (guard.mode === 'investigate') {
      const dx = guard.lookX - guard.x;
      const dy = guard.lookY - guard.y;
      const d = Math.hypot(dx, dy);
      if (d > 12) {
        const bearing = Math.atan2(dy, dx);
        guard.facing = turnToward(guard.facing, bearing, dt * 6);
        const stepLen = GUARD.investigateSpeed * dt;
        moveCircle(guard, Math.cos(guard.facing) * stepLen, Math.sin(guard.facing) * stepLen, GUARD.radius, world.solids);
      } else {
        guard.investigateLeft -= dt;
        guard.facing += dt * 1.6; // look around while puzzling over the coin
        if (guard.investigateLeft <= 0) guard.mode = 'patrol';
      }
    } else {
      // Patrol: walk to the next waypoint, wait a beat, turn to the next.
      if (guard.pauseLeft > 0) {
        guard.pauseLeft -= dt;
      } else {
        const target = guard.waypoints[guard.wp];
        const dx = target.x - guard.x;
        const dy = target.y - guard.y;
        const d = Math.hypot(dx, dy);
        if (d < 8) {
          guard.wp = (guard.wp + 1) % guard.waypoints.length;
          guard.pauseLeft = GUARD.waypointPause;
        } else {
          const bearing = Math.atan2(dy, dx);
          guard.facing = turnToward(guard.facing, bearing, dt * 6);
          const stepLen = GUARD.patrolSpeed * dt;
          moveCircle(guard, Math.cos(guard.facing) * stepLen, Math.sin(guard.facing) * stepLen, GUARD.radius, world.solids);
        }
      }
    }

    // A guard laying a hand on the thief ends the night at once.
    if (Math.hypot(guard.x - thief.x, guard.y - thief.y) < GUARD.catchDistance) {
      endNight(world, 'busted', audio, 'A guard caught you by the arm.');
      return;
    }
  }

  // --- the alarm meter -------------------------------------------------------
  if (anyoneSees) {
    let fill = 0;
    for (const guard of world.guards) if (guard.seesThief) fill = Math.max(fill, ALARM.guardFill);
    for (const cam of world.cameras) if (cam.seesThief) fill = Math.max(fill, ALARM.cameraFill);
    if (thief.tiptoe) fill *= ALARM.tiptoeFactor;
    const before = world.alarm;
    world.alarm = Math.min(ALARM.max, world.alarm + fill * dt);
    if (before < 1 && world.alarm >= 1) {
      world.stats.timesSeen += 1;
      audio.spotted();
      setMessage(world, 'Seen! Break the gaze — the alarm is climbing.', 2.5);
    }
    audio.alarmPulse(world.clock);
  } else {
    world.alarm = Math.max(0, world.alarm - ALARM.drain * dt);
  }
  world.maxAlarm = Math.max(world.maxAlarm, world.alarm);
  if (world.alarm >= ALARM.max) {
    endNight(world, 'busted', audio, 'The alarm hit full — the doors slammed shut.');
    return;
  }

  // --- the getaway -----------------------------------------------------------
  if (world.diamondTaken) {
    const v = world.van;
    if (thief.x > v.x && thief.x < v.x + v.w && thief.y > v.y && thief.y < v.y + v.h) {
      const ghost = world.maxAlarm < ALARM.ghostCeiling ? LOOT.ghostBonus : 0;
      const timeBonus = Math.max(0, Math.round((LOOT.timePar - world.time) * LOOT.timeBonusRate));
      world.score += ghost + timeBonus;
      world.ghostBonus = ghost;
      world.timeBonus = timeBonus;
      endNight(world, 'win', audio, 'Clean getaway.');
      return;
    }
  }

  // Coin spots fade after a while so the floor does not fill with them.
  for (const spot of world.coinSpots) spot.age += dt;
  world.coinSpots = world.coinSpots.filter((s) => s.age < 25);

  if (world.messageLeft > 0) world.messageLeft -= dt;
}

function setMessage(world, text, seconds) {
  world.message = text;
  world.messageLeft = seconds;
}

function endNight(world, state, audio, message) {
  world.state = state;
  world.message = message;
  world.messageLeft = 6;
  if (state === 'busted') audio.busted();
  if (state === 'win') audio.getaway();
}

// Start a fresh night from the title screen.
export function startNight(world) {
  const fresh = makeWorld();
  Object.assign(world, fresh);
  world.state = 'playing';
}
