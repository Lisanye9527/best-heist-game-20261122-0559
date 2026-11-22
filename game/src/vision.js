// Seeing, for guards and cameras: is the thief inside the cone, in range, and not hidden
// behind a wall or a piece of furniture? All the geometry of being spotted lives here.

import { TILE } from './config.js';

/** The smallest signed turn from angle `from` to angle `to`, in (-PI, PI]. */
export function angleDelta(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Turn `angle` toward `target` by at most `maxStep` radians. */
export function turnToward(angle, target, maxStep) {
  const d = angleDelta(angle, target);
  if (Math.abs(d) <= maxStep) return target;
  return angle + Math.sign(d) * maxStep;
}

/**
 * March a ray through the tile grid from (x0, y0) to (x1, y1); true when no sight-blocking
 * tile stands in the way. Steps are a quarter tile, fine enough that no wall slips through.
 */
export function lineOfSight(floor, x0, y0, x1, y1) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / (TILE / 4)));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    if (floor.isSolid(Math.floor(x / TILE), Math.floor(y / TILE))) return false;
  }
  return true;
}

/**
 * How strongly an observer at (ox, oy) facing `angle` sees the thief at (tx, ty):
 * 0 when the thief is out of the cone, out of range or behind cover; otherwise a share
 * that grows as the thief gets closer, so standing at the cone's edge is a near miss and
 * standing under a guard's nose is a disaster.
 */
export function seenShare(floor, ox, oy, angle, range, halfAngle, tx, ty) {
  const dx = tx - ox;
  const dy = ty - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return 0;
  const bearing = Math.atan2(dy, dx);
  if (Math.abs(angleDelta(angle, bearing)) > halfAngle) return 0;
  if (!lineOfSight(floor, ox, oy, tx, ty)) return 0;
  if (dist < 1) return 1;
  // Full strength inside half range, easing to just under half at the rim: a guard
  // across the room barely notices you, one at arm's length sees you plainly.
  const rim = Math.max(0, (dist - range / 2) / (range / 2));
  return 1 - 0.55 * rim;
}
