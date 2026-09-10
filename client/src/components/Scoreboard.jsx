/** Running score for both players, shown between questions and during a match. */
export function Scoreboard({ players, scores = {}, highlightId = null, compact = false }) {
  return (
    <ul className={`scoreboard ${compact ? 'scoreboard--compact' : ''}`}>
      {players.map((player) => {
        const score = scores[player.id] ?? player.score ?? 0;
        return (
          <li
            key={player.id}
            className={`scoreboard__row ${highlightId === player.id ? 'is-leading' : ''}`}
          >
            <span className="scoreboard__avatar" aria-hidden="true">
              {player.avatar}
            </span>
            <span className="scoreboard__name">
              {player.name}
              {player.connected === false && <span className="badge badge--warn">offline</span>}
            </span>
            <span className="scoreboard__score">{score}</span>
          </li>
        );
      })}
    </ul>
  );
}
