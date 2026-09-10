import { useState } from 'react';
import { describeSelection, questionCountFor, selectionError } from '@capitals-quiz/shared';
import { QuizSetup } from '../components/QuizSetup.jsx';

export const SOLO_DEFAULTS = {
  selection: { type: 'continent', continent: 'Europe' },
  direction: 'country-to-capital',
  questionCount: 10,
  timeLimitSeconds: 15,
};

/** Defaults are playable as-is: pick a continent and hit start. */
export function SoloSetupScreen({ initialSettings = SOLO_DEFAULTS, onStart }) {
  const [settings, setSettings] = useState(initialSettings);
  const error = selectionError(settings.selection);

  return (
    <div className="stack">
      <QuizSetup settings={settings} onChange={setSettings} />
      <div className="sticky-actions">
        <button
          type="button"
          className="button button--primary button--block"
          disabled={Boolean(error)}
          onClick={() => onStart(settings)}
        >
          Start {questionCountFor(settings.selection, settings.questionCount)} questions ·{' '}
          {describeSelection(settings.selection)}
        </button>
      </div>
    </div>
  );
}
