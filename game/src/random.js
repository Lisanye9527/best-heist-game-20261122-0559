// A tiny seeded random source (mulberry32): the same seed always deals the same floor, so a
// screenshot staged from a seed is the same frame every time it is taken. The state is kept
// in a closure, never on the world, so a fresh world with the same seed replays identically.

export function createRandom(seed) {
  let state = seed >>> 0;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
