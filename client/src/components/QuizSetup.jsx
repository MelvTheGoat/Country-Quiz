import {
  ALL_QUESTIONS,
  CONTINENTS,
  COUNTRIES,
  DIRECTIONS,
  DIRECTION_LABELS,
  QUESTION_COUNTS,
  TIME_LIMITS,
  countriesIn,
  questionCountFor,
  selectionError,
} from '@capitals-quiz/shared';
import { CountryPicker } from './CountryPicker.jsx';

const CONTINENT_EMOJI = {
  Africa: '🌍',
  Asia: '🌏',
  Europe: '🏰',
  'North America': '🗽',
  'South America': '🌄',
  Oceania: '🏝️',
};

/**
 * The quiz configuration form. Solo and "create room" share it so both modes
 * offer exactly the same choices; `showMatchOptions` adds the settings that
 * only mean something in a head-to-head match.
 */
export function QuizSetup({ settings, onChange, showMatchOptions = false }) {
  const patch = (changes) => onChange({ ...settings, ...changes });
  const selection = settings.selection;
  const error = selectionError(selection);

  return (
    <div className="setup">
      <fieldset className="setup__group">
        <legend>Which countries?</legend>
        <div className="chip-row" role="tablist" aria-label="Quiz type">
          {['continent', 'custom', 'world'].map((type) => (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={selection.type === type}
              className={`tab ${selection.type === type ? 'is-active' : ''}`}
              onClick={() =>
                patch({
                  selection:
                    type === 'continent'
                      ? { type: 'continent', continent: 'Europe' }
                      : type === 'custom'
                        ? { type: 'custom', codes: selection.codes || [] }
                        : { type: 'world' },
                })
              }
            >
              {type === 'continent' ? 'Continent' : type === 'custom' ? 'Custom' : 'World'}
            </button>
          ))}
        </div>

        {selection.type === 'continent' && (
          <div className="grid-2">
            {CONTINENTS.map((continent) => (
              <button
                key={continent}
                type="button"
                className={`card-choice ${selection.continent === continent ? 'is-active' : ''}`}
                onClick={() => patch({ selection: { type: 'continent', continent } })}
                aria-pressed={selection.continent === continent}
              >
                <span className="card-choice__emoji" aria-hidden="true">
                  {CONTINENT_EMOJI[continent]}
                </span>
                <span className="card-choice__title">{continent}</span>
                <span className="card-choice__meta">{countriesIn(continent).length} countries</span>
              </button>
            ))}
          </div>
        )}

        {selection.type === 'custom' && (
          <CountryPicker
            selected={selection.codes || []}
            onChange={(codes) => patch({ selection: { type: 'custom', codes } })}
          />
        )}

        {selection.type === 'world' && (
          <p className="hint">Every country in the dataset — {COUNTRIES.length} of them. Good luck.</p>
        )}
      </fieldset>

      <fieldset className="setup__group">
        <legend>Which way round?</legend>
        <div className="chip-row">
          {Object.values(DIRECTIONS).map((direction) => (
            <button
              key={direction}
              type="button"
              className={`tab ${settings.direction === direction ? 'is-active' : ''}`}
              aria-pressed={settings.direction === direction}
              onClick={() => patch({ direction })}
            >
              {DIRECTION_LABELS[direction]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="setup__group">
        <legend>How many questions?</legend>
        <div className="chip-row">
          {QUESTION_COUNTS.map((count) => (
            <button
              key={count}
              type="button"
              className={`tab ${settings.questionCount === count ? 'is-active' : ''}`}
              aria-pressed={settings.questionCount === count}
              onClick={() => patch({ questionCount: count })}
            >
              {count === ALL_QUESTIONS ? 'All' : count}
            </button>
          ))}
        </div>
        {settings.questionCount === ALL_QUESTIONS && !error && (
          <p className="hint">
            Every country in this set — {questionCountFor(selection, ALL_QUESTIONS)} questions, no
            repeats.
          </p>
        )}
      </fieldset>

      {showMatchOptions && (
        <fieldset className="setup__group">
          <legend>Seconds per question</legend>
          <div className="chip-row">
            {TIME_LIMITS.map((seconds) => (
              <button
                key={seconds}
                type="button"
                className={`tab ${settings.timeLimitSeconds === seconds ? 'is-active' : ''}`}
                aria-pressed={settings.timeLimitSeconds === seconds}
                onClick={() => patch({ timeLimitSeconds: seconds })}
              >
                {seconds}s
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
