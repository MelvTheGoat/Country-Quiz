/**
 * Input validation shared by the client (form feedback) and the server
 * (which must never trust what arrives over a socket).
 */
import { CONTINENTS, resolvePool } from './countries.js';
import { DIRECTIONS, MIN_CUSTOM_COUNTRIES } from './quiz.js';
import { QUESTION_COUNTS, TIME_LIMITS, DEFAULT_SETTINGS } from './protocol.js';

export const MAX_NAME_LENGTH = 16;

export function sanitizeName(name) {
  return String(name || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

export function nameError(name) {
  const clean = sanitizeName(name);
  if (clean.length === 0) return 'Enter a display name.';
  if (clean.length < 2) return 'That name is a bit short.';
  return null;
}

/** Returns null when the selection is playable, otherwise a human-readable reason. */
export function selectionError(selection) {
  if (!selection || typeof selection !== 'object') return 'Pick a continent or build a custom set.';
  if (selection.type === 'continent' && !CONTINENTS.includes(selection.continent)) {
    return 'Unknown continent.';
  }
  if (selection.type === 'custom' && (selection.codes || []).length < MIN_CUSTOM_COUNTRIES) {
    return `Pick at least ${MIN_CUSTOM_COUNTRIES} countries.`;
  }
  if (!['continent', 'custom', 'world'].includes(selection.type)) return 'Unknown quiz type.';
  if (resolvePool(selection).length < MIN_CUSTOM_COUNTRIES) {
    return `That set only has ${resolvePool(selection).length} countries; ${MIN_CUSTOM_COUNTRIES} are needed.`;
  }
  return null;
}

/** Coerces arbitrary input into settings we are willing to run a match with. */
export function normalizeSettings(input = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...input };
  const error = selectionError(settings.selection);
  if (error) return { error };

  const questionCount = QUESTION_COUNTS.includes(Number(settings.questionCount))
    ? Number(settings.questionCount)
    : DEFAULT_SETTINGS.questionCount;
  const timeLimitSeconds = TIME_LIMITS.includes(Number(settings.timeLimitSeconds))
    ? Number(settings.timeLimitSeconds)
    : DEFAULT_SETTINGS.timeLimitSeconds;
  const direction = Object.values(DIRECTIONS).includes(settings.direction)
    ? settings.direction
    : DEFAULT_SETTINGS.direction;

  const selection =
    settings.selection.type === 'custom'
      ? { type: 'custom', codes: resolvePool(settings.selection).map((c) => c.code) }
      : settings.selection.type === 'continent'
        ? { type: 'continent', continent: settings.selection.continent }
        : { type: 'world' };

  return { settings: { selection, questionCount, timeLimitSeconds, direction } };
}
