import { useState } from 'react';
import { ROOM_CODE_LENGTH, isValidRoomCode, normalizeRoomCode } from '@capitals-quiz/shared';

export function JoinRoomScreen({ profile, onJoin, connected }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    if (!isValidRoomCode(code)) {
      setError(`Room codes are ${ROOM_CODE_LENGTH} letters and numbers.`);
      return;
    }
    setBusy(true);
    setError(null);
    const response = await onJoin(code);
    setBusy(false);
    if (!response.ok) setError(response.error);
  };

  return (
    <form className="stack" onSubmit={submit}>
      <label className="field">
        <span className="field__label">Room code</span>
        <input
          className="input input--code"
          value={code}
          onChange={(event) => {
            setCode(normalizeRoomCode(event.target.value));
            setError(null);
          }}
          placeholder="ABCDE"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck="false"
          maxLength={ROOM_CODE_LENGTH}
          autoFocus
          aria-invalid={Boolean(error)}
        />
      </label>

      <p className="hint">
        Joining as <strong>{profile.avatar} {profile.name}</strong>
      </p>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="button button--primary button--block"
        disabled={busy || !connected}
      >
        {busy ? 'Joining…' : 'Join room'}
      </button>
    </form>
  );
}
