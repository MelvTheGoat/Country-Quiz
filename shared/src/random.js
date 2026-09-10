/**
 * Tiny seedable PRNG helpers.
 *
 * A seedable generator keeps quiz generation deterministic, which makes the
 * game logic testable and lets the server reproduce a match if it ever needs to.
 */

/** mulberry32 — small, fast, good enough for shuffling a quiz. */
export function createRng(seed = Date.now()) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed() {
  return Math.floor(Math.random() * 2 ** 32);
}

/** Fisher-Yates, non-mutating. */
export function shuffle(items, rng = Math.random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Take up to `n` random items without replacement. */
export function sample(items, n, rng = Math.random) {
  return shuffle(items, rng).slice(0, n);
}

export function pickOne(items, rng = Math.random) {
  return items[Math.floor(rng() * items.length)];
}
