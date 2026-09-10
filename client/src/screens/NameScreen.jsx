import { useState } from 'react';
import { MAX_NAME_LENGTH, nameError, sanitizeName } from '@capitals-quiz/shared';
import { AvatarPicker } from '../components/AvatarPicker.jsx';

/** The gate: nothing else is reachable until there is a display name. */
export function NameScreen({ profile, onSave }) {
  const [name, setName] = useState(profile.name || '');
  const [avatar, setAvatar] = useState(profile.avatar || '🌍');
  const [error, setError] = useState(null);

  const submit = (event) => {
    event.preventDefault();
    const problem = nameError(name);
    if (problem) {
      setError(problem);
      return;
    }
    onSave({ name: sanitizeName(name), avatar });
  };

  return (
    <form className="stack" onSubmit={submit}>
      <div className="hero">
        <p className="hero__emoji" aria-hidden="true">
          🌍
        </p>
        <h2 className="hero__title">Capitals Quiz</h2>
        <p className="hero__text">
          Learn the world&apos;s capitals solo, or race a friend in real time.
        </p>
      </div>

      <label className="field">
        <span className="field__label">Display name</span>
        <input
          className="input input--lg"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          placeholder="e.g. Alex"
          maxLength={MAX_NAME_LENGTH}
          autoComplete="nickname"
          autoFocus
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'name-error' : undefined}
        />
      </label>

      <div className="field">
        <span className="field__label">Pick an avatar</span>
        <AvatarPicker value={avatar} onChange={setAvatar} />
      </div>

      {error && (
        <p className="error" id="name-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="button button--primary button--block">
        Continue
      </button>
      <p className="hint">Your name is stored on this device only.</p>
    </form>
  );
}
