import { useMemo, useState } from 'react';
import { COUNTRIES, CONTINENTS, MIN_CUSTOM_COUNTRIES, getCountry } from '@capitals-quiz/shared';
import { Flag } from './Flag.jsx';

const normalise = (value) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // so "Cote" finds "Côte d'Ivoire"

/** Searchable multi-select over the whole dataset, used for custom quizzes. */
export function CountryPicker({ selected, onChange }) {
  const [query, setQuery] = useState('');
  const [continent, setContinent] = useState('All');

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const visible = useMemo(() => {
    const q = normalise(query.trim());
    return COUNTRIES.filter((country) => {
      if (continent !== 'All' && country.continent !== continent) return false;
      if (!q) return true;
      return normalise(country.name).includes(q) || normalise(country.capital).includes(q);
    });
  }, [query, continent]);

  const toggle = (code) => {
    const next = new Set(selectedSet);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange([...next]);
  };

  const remaining = Math.max(0, MIN_CUSTOM_COUNTRIES - selected.length);

  return (
    <div className="picker">
      <div className="picker__toolbar">
        <label className="field">
          <span className="visually-hidden">Search countries or capitals</span>
          <input
            type="search"
            className="input"
            placeholder="Search country or capital…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="field">
          <span className="visually-hidden">Filter by continent</span>
          <select
            className="input"
            value={continent}
            onChange={(event) => setContinent(event.target.value)}
          >
            <option value="All">All continents</option>
            {CONTINENTS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="picker__status" aria-live="polite">
        {selected.length} selected
        {remaining > 0 && ` — pick ${remaining} more (minimum ${MIN_CUSTOM_COUNTRIES})`}
        {selected.length > 0 && (
          <button type="button" className="link" onClick={() => onChange([])}>
            Clear
          </button>
        )}
      </div>

      {selected.length > 0 && (
        <ul className="chips">
          {selected.map((code) => {
            const country = getCountry(code);
            return (
              <li key={code}>
                <button type="button" className="chip" onClick={() => toggle(code)}>
                  <span aria-hidden="true">{country?.flag}</span> {country?.name}
                  <span aria-hidden="true">×</span>
                  <span className="visually-hidden">Remove {country?.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <ul className="picker__list">
        {visible.map((country) => {
          const isSelected = selectedSet.has(country.code);
          return (
            <li key={country.code}>
              <label className={`picker__row ${isSelected ? 'is-selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(country.code)}
                />
                <Flag code={country.code} size="sm" />
                <span className="picker__name">{country.name}</span>
                <span className="picker__capital">{country.capital}</span>
              </label>
            </li>
          );
        })}
        {visible.length === 0 && <li className="picker__empty">No countries match “{query}”.</li>}
      </ul>
    </div>
  );
}
