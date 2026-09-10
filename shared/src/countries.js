/**
 * Dataset access. The JSON file in `shared/data/countries.json` is the single
 * source of truth — edit it there and both the client and the server pick it up.
 */
import countries from '../data/countries.json' with { type: 'json' };

export const COUNTRIES = countries;

export const CONTINENTS = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export function getCountry(code) {
  return BY_CODE.get(String(code || '').toUpperCase()) || null;
}

export function countriesIn(continent) {
  return COUNTRIES.filter((c) => c.continent === continent);
}

export function flagUrl(code, { width = 160 } = {}) {
  const lower = String(code || '').toLowerCase();
  // flagcdn serves both fixed-width PNGs and SVGs; the PNG keeps mobile payloads small.
  return `https://flagcdn.com/w${width}/${lower}.png`;
}

/**
 * A "selection" describes which countries a quiz draws from. It is the same
 * shape in solo mode and in multiplayer room settings.
 *
 *   { type: 'continent', continent: 'Europe' }
 *   { type: 'custom', codes: ['FR', 'DE', ...] }
 *   { type: 'world' }
 */
export function resolvePool(selection) {
  if (!selection) return [];
  if (selection.type === 'world') return [...COUNTRIES];
  if (selection.type === 'continent') return countriesIn(selection.continent);
  if (selection.type === 'custom') {
    const seen = new Set();
    return (selection.codes || [])
      .map((code) => getCountry(code))
      .filter((c) => c && !seen.has(c.code) && seen.add(c.code));
  }
  return [];
}

export function describeSelection(selection) {
  if (!selection) return 'Unknown';
  if (selection.type === 'world') return 'World';
  if (selection.type === 'continent') return selection.continent;
  if (selection.type === 'custom') return `Custom (${resolvePool(selection).length} countries)`;
  return 'Unknown';
}
