import { useEffect, useRef, useState } from 'react';
import { describeSelection, formatSeconds } from '@capitals-quiz/shared';
import { ResultCard } from '../components/ResultCard.jsx';
import { ReviewList } from '../components/ReviewList.jsx';
import { matchShareText, shareCardImage, shareText } from '../lib/share.js';
import { playFanfare } from '../lib/sound.js';

export function MatchResultsScreen({ summary, profile, soundOn, onRematch, onNewGame, onHome }) {
  const cardRef = useRef(null);
  const [shareState, setShareState] = useState(null);

  const me = summary.players.find((p) => p.id === profile.playerId) || summary.players[0];
  const opponent = summary.players.find((p) => p.id !== me.id) || null;
  const iWon = summary.winnerId === me.id;
  const label = describeSelection(summary.settings.selection);

  useEffect(() => {
    if (iWon) playFanfare(soundOn);
  }, [iWon, soundOn]);

  const heading = summary.draw
    ? "It's a draw!"
    : iWon
      ? 'You win! 🏆'
      : `${summary.players.find((p) => p.id === summary.winnerId)?.name || 'Nobody'} wins`;

  const summaryText = opponent
    ? matchShareText({ me, opponent, label })
    : `I scored ${me.score} in Capitals Quiz — ${label} edition! 🌍`;

  const share = async () => {
    const outcome = await shareText({ text: summaryText });
    setShareState(outcome === 'copied' ? 'Copied to clipboard' : null);
  };

  const shareImage = async () => {
    setShareState('Rendering…');
    try {
      const outcome = await shareCardImage(cardRef.current, {
        fileName: 'capitals-quiz-match.png',
        text: summaryText,
      });
      setShareState(outcome === 'downloaded' ? 'Image downloaded' : null);
    } catch {
      setShareState('Could not render the image — the text summary still works.');
    }
  };

  return (
    <div className="stack">
      {summary.reason === 'forfeit' && (
        <p className="panel panel--alert" role="status">
          {summary.forfeitedBy === me.id
            ? 'You left the match, so it was awarded to your opponent.'
            : `${opponent?.name || 'Your opponent'} disconnected and didn't come back — match ended.`}
        </p>
      )}

      <ResultCard
        ref={cardRef}
        heading={heading}
        subheading={`${label} · ${summary.questions.length} questions`}
        badge={summary.draw ? '🤝 Draw' : null}
        rows={summary.players.map((player) => ({
          avatar: player.avatar,
          name: player.name,
          score: player.score,
          detail: `${player.stats.accuracy}%`,
          winner: player.id === summary.winnerId,
        }))}
        note={
          opponent
            ? `Average answer: ${formatSeconds(me.stats.avgMs)} vs ${formatSeconds(opponent.stats.avgMs)}`
            : null
        }
      />

      <section className="panel">
        <h3 className="panel__title">Breakdown</h3>
        <table className="compare">
          <thead>
            <tr>
              <th scope="col">
                <span className="visually-hidden">Metric</span>
              </th>
              {summary.players.map((player) => (
                <th key={player.id} scope="col">
                  {player.avatar} {player.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Points</th>
              {summary.players.map((p) => (
                <td key={p.id}>{p.score}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Correct</th>
              {summary.players.map((p) => (
                <td key={p.id}>
                  {p.stats.correct}/{p.stats.total}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Accuracy</th>
              {summary.players.map((p) => (
                <td key={p.id}>{p.stats.accuracy}%</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Avg. speed</th>
              {summary.players.map((p) => (
                <td key={p.id}>{formatSeconds(p.stats.avgMs)}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Best streak</th>
              {summary.players.map((p) => (
                <td key={p.id}>{p.stats.bestStreak}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </section>

      <div className="button-row">
        <button type="button" className="button button--primary" onClick={share}>
          Share result
        </button>
        <button type="button" className="button button--ghost" onClick={shareImage}>
          Share as image
        </button>
      </div>
      {shareState && (
        <p className="hint" aria-live="polite">
          {shareState}
        </p>
      )}

      <div className="button-row">
        <button type="button" className="button button--primary" onClick={onRematch}>
          Rematch
        </button>
        <button type="button" className="button" onClick={onNewGame}>
          New game
        </button>
        <button type="button" className="button button--ghost" onClick={onHome}>
          Home
        </button>
      </div>

      <ReviewList
        title="Question by question"
        rows={summary.questions.map((q) => ({
          question: q,
          correctOptionId: q.correctOptionId,
          entries: q.results.map((result) => ({
            label: result.playerId === me.id ? 'You' : opponent?.name || 'Opponent',
            optionId: result.optionId,
            correct: result.correct,
            ms: result.ms,
            timedOut: result.timedOut,
          })),
        }))}
      />
    </div>
  );
}
