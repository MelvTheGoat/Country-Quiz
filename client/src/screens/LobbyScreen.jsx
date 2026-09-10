import { useState } from 'react';
import {
  DIRECTION_LABELS,
  ROOM_STATUS,
  describeSelection,
} from '@capitals-quiz/shared';
import { shareText } from '../lib/share.js';

/** Waiting room (host alone) and the two-player ready-up lobby. */
export function LobbyScreen({ room, me, opponent, onToggleReady, onLeave }) {
  const [copied, setCopied] = useState(null);
  const waiting = room.status === ROOM_STATUS.WAITING || !opponent;

  const invite = async () => {
    const outcome = await shareText({
      title: 'Capitals Quiz',
      text: `Join my Capitals Quiz match — room code ${room.code}`,
      url: window.location.origin,
    });
    setCopied(outcome === 'copied' ? 'Invite copied to clipboard' : null);
  };

  return (
    <div className="stack">
      <section className="panel panel--code">
        <p className="panel__label">Room code</p>
        <p className="room-code" aria-label={`Room code ${room.code.split('').join(' ')}`}>
          {room.code}
        </p>
        <button type="button" className="button button--primary" onClick={invite}>
          Share invite
        </button>
        {copied && (
          <p className="hint" aria-live="polite">
            {copied}
          </p>
        )}
      </section>

      <section className="panel">
        <h3 className="panel__title">Players</h3>
        <ul className="player-list">
          {room.players.map((player) => (
            <li key={player.id} className={player.ready ? 'is-ready' : ''}>
              <span className="player-list__avatar" aria-hidden="true">
                {player.avatar}
              </span>
              <span className="player-list__name">
                {player.name}
                {player.id === me?.id && <span className="badge">you</span>}
                {player.id === room.hostId && <span className="badge">host</span>}
              </span>
              <span className="player-list__state">
                {player.ready ? '✅ Ready' : player.connected ? 'Not ready' : '⚠️ Offline'}
              </span>
            </li>
          ))}
          {waiting && (
            <li className="player-list__empty" aria-live="polite">
              <span className="spinner" aria-hidden="true" />
              Waiting for an opponent…
            </li>
          )}
        </ul>
      </section>

      <section className="panel">
        <h3 className="panel__title">Match settings</h3>
        <ul className="stat-list">
          <li>
            <span>Countries</span>
            <strong>{describeSelection(room.settings.selection)}</strong>
          </li>
          <li>
            <span>Questions</span>
            <strong>{room.settings.questionCount}</strong>
          </li>
          <li>
            <span>Per question</span>
            <strong>{room.settings.timeLimitSeconds}s</strong>
          </li>
          <li>
            <span>Direction</span>
            <strong>{DIRECTION_LABELS[room.settings.direction]}</strong>
          </li>
        </ul>
      </section>

      {room.rematchRequestedBy && room.rematchRequestedBy !== me?.id && (
        <p className="hint" aria-live="polite">
          {opponent?.name} wants a rematch — ready up to start.
        </p>
      )}

      <button
        type="button"
        className={`button button--block ${me?.ready ? 'button--ghost' : 'button--primary'}`}
        onClick={() => onToggleReady(!me?.ready)}
        disabled={waiting}
        aria-pressed={Boolean(me?.ready)}
      >
        {me?.ready ? "Ready — tap to cancel" : "I'm ready"}
      </button>
      {!waiting && !opponent?.ready && me?.ready && (
        <p className="hint" aria-live="polite">
          Waiting for {opponent?.name} to ready up…
        </p>
      )}

      <button type="button" className="button button--ghost button--block" onClick={onLeave}>
        Leave room
      </button>
    </div>
  );
}
