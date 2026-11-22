// sight.js — vision cones and line of sight.
//
// A watcher sees the thief when three things are true: the thief is inside
// the cone's range, inside its half-angle around the watcher's facing, and
// no solid rectangle blocks the straight line between them. The line test
// samples the segment in small steps, which is cheap at these distances and
// never misses a thin wall the way a tile-centre test would.

import { TILE } from './tuning.js';

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// True when the segment from (x0, y0) to (x1, y1) crosses no solid rect.
export function hasLineOfSight(x0, y0, x1, y1, solids) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const step = TILE / 5; // 8 px samples: finer than the thinnest wall
  const n = Math.ceil(dist / step);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const x = x0 + dx * t;
    const y = y0 + dy * t;
    for (const s of solids) {
      if (x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h) return false;
    }
  }
  return true;
}

// True when the point (px, py) falls inside a cone from (ox, oy) facing
// `angle`, with the given range and half-angle, and the line is clear.
export function insideCone(ox, oy, angle, range, halfAngle, px, py, solids) {
  const dx = px - ox;
  const dy = py - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 4) return true; // standing on the watcher is always seen
  const toTarget = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(toTarget, angle)) > halfAngle) return false;
  return hasLineOfSight(ox, oy, px, py, solids);
}

// How far a cone's light travels before a wall stops it, along one ray.
// The painter uses this to clip cones against walls so they never shine
// through solid cover.
export function coneRayLength(ox, oy, angle, range, solids) {
  const step = TILE / 4;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  for (let d = step; d <= range; d += step) {
    const x = ox + dx * d;
    const y = oy + dy * d;
    for (const s of solids) {
      if (x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h) return d;
    }
  }
  return range;
}

// The bearing from a watcher to a point, for turning guards toward the thief.
export function bearingTo(ox, oy, px, py) {
  return Math.atan2(py - oy, px - ox);
}

// Shortest signed turn from `from` toward `to`, for smooth guard rotation.
export function turnToward(from, to, maxStep) {
  const d = angleDiff(to, from);
  if (Math.abs(d) <= maxStep) return to;
  return from + Math.sign(d) * maxStep;
}
