import { useState } from 'react';
import { DEFAULT_SETTINGS, selectionError } from '@capitals-quiz/shared';
import { QuizSetup } from '../components/QuizSetup.jsx';

export function CreateRoomScreen({ onCreate, connected }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const invalid = selectionError(settings.selection);

  const create = async () => {
    setBusy(true);
    setError(null);
    const response = await onCreate(settings);
    setBusy(false);
    if (!response.ok) setError(response.error);
  };

  return (
    <div className="stack">
      <QuizSetup settings={settings} onChange={setSettings} showMatchOptions />

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="sticky-actions">
        <button
          type="button"
          className="button button--primary button--block"
          disabled={Boolean(invalid) || busy || !connected}
          onClick={create}
        >
          {busy ? 'Creating…' : 'Create room'}
        </button>
        {!connected && <p className="hint">Waiting for the game server…</p>}
      </div>
    </div>
  );
}
