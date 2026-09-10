/**
 * localStorage access, wrapped so a private window or a browser with site data
 * blocked degrades to "no saved preferences" instead of throwing.
 */
const KEYS = {
  name: 'capitals-quiz:name',
  avatar: 'capitals-quiz:avatar',
  playerId: 'capitals-quiz:player-id',
  theme: 'capitals-quiz:theme',
  sound: 'capitals-quiz:sound',
  best: 'capitals-quiz:best-scores',
};

export function readStored(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — preferences just won't persist */
  }
}

export const STORAGE_KEYS = KEYS;

/** A stable id for this browser, so a refresh can reclaim its seat in a room. */
export function getPlayerId() {
  let id = readStored(KEYS.playerId);
  if (!id) {
    id =
      globalThis.crypto?.randomUUID?.() ??
      `p-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    writeStored(KEYS.playerId, id);
  }
  return id;
}

/* ---- solo personal bests, keyed by continent + direction ---- */

export function readBestScores() {
  return readStored(KEYS.best, {}) || {};
}

export function bestScoreKey(selection, direction) {
  if (!selection || selection.type !== 'continent') return null;
  return `${selection.continent}|${direction}`;
}

/**
 * Records a personal best. Ranked on accuracy first, then on time, so a fast
 * 8/10 never beats a slower 10/10.
 */
export function recordBestScore(selection, direction, result) {
  const key = bestScoreKey(selection, direction);
  if (!key) return { isBest: false, previous: null };

  const all = readBestScores();
  const previous = all[key] || null;
  const better =
    !previous ||
    result.accuracy > previous.accuracy ||
    (result.accuracy === previous.accuracy && result.totalMs < previous.totalMs);

  if (better) {
    all[key] = { ...result, date: new Date().toISOString() };
    writeStored(KEYS.best, all);
  }
  return { isBest: better, previous };
}
