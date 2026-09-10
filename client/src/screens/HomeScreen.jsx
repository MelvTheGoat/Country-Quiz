import { CONTINENTS } from '@capitals-quiz/shared';
import { readBestScores } from '../lib/storage.js';

/** Mode select, plus a peek at the player's personal bests. */
export function HomeScreen({ profile, onSolo, onMultiplayer, onEditProfile }) {
  const bests = Object.entries(readBestScores())
    .map(([key, value]) => {
      const [continent] = key.split('|');
      return { key, continent, ...value };
    })
    .filter((entry) => CONTINENTS.includes(entry.continent))
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 3);

  return (
    <div className="stack">
      <button type="button" className="identity" onClick={onEditProfile}>
        <span className="identity__avatar" aria-hidden="true">
          {profile.avatar}
        </span>
        <span>
          <span className="identity__hello">Playing as</span>
          <strong className="identity__name">{profile.name}</strong>
        </span>
        <span className="identity__edit">Change</span>
      </button>

      <div className="grid-2">
        <button type="button" className="card-choice card-choice--tall" onClick={onSolo}>
          <span className="card-choice__emoji" aria-hidden="true">
            🎯
          </span>
          <span className="card-choice__title">Solo</span>
          <span className="card-choice__meta">Practise at your own pace</span>
        </button>
        <button type="button" className="card-choice card-choice--tall" onClick={onMultiplayer}>
          <span className="card-choice__emoji" aria-hidden="true">
            ⚔️
          </span>
          <span className="card-choice__title">Multiplayer</span>
          <span className="card-choice__meta">Head-to-head, live</span>
        </button>
      </div>

      {bests.length > 0 && (
        <section className="panel">
          <h3 className="panel__title">Your personal bests</h3>
          <ul className="stat-list">
            {bests.map((best) => (
              <li key={best.key}>
                <span>{best.continent}</span>
                <strong>
                  {best.score}/{best.total} · {best.accuracy}%
                </strong>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
