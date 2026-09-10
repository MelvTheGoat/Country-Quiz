export function MultiplayerHomeScreen({ connected, onCreate, onJoin }) {
  return (
    <div className="stack">
      <p className={`status-pill ${connected ? 'is-online' : 'is-offline'}`} aria-live="polite">
        <span aria-hidden="true">{connected ? '🟢' : '🟠'}</span>
        {connected ? 'Connected to the game server' : 'Connecting to the game server…'}
      </p>

      <div className="grid-2">
        <button type="button" className="card-choice card-choice--tall" onClick={onCreate}>
          <span className="card-choice__emoji" aria-hidden="true">
            ➕
          </span>
          <span className="card-choice__title">Create a room</span>
          <span className="card-choice__meta">Choose the quiz, share the code</span>
        </button>
        <button type="button" className="card-choice card-choice--tall" onClick={onJoin}>
          <span className="card-choice__emoji" aria-hidden="true">
            🔑
          </span>
          <span className="card-choice__title">Join a room</span>
          <span className="card-choice__meta">Enter a friend&apos;s code</span>
        </button>
      </div>
    </div>
  );
}
