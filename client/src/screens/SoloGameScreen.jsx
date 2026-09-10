import { useEffect } from 'react';
import { DIRECTIONS } from '@capitals-quiz/shared';
import { useSoloGame } from '../game/useSoloGame.js';
import { QuestionCard } from '../components/QuestionCard.jsx';
import { OptionButton } from '../components/OptionButton.jsx';

function optionState(option, picked, correctOptionId) {
  if (!picked) return 'idle';
  if (option.id === correctOptionId) return 'correct';
  if (option.id === picked.optionId) return 'wrong';
  return 'dimmed';
}

export function SoloGameScreen({ settings, soundOn, onFinish }) {
  const game = useSoloGame({ settings, soundOn });

  useEffect(() => {
    if (game.finished && game.results) onFinish(game.results);
  }, [game.finished, game.results, onFinish]);

  if (game.finished) return <p className="hint">Tallying up…</p>;

  const { question, picked } = game;
  const showFlags = question.direction === DIRECTIONS.CAPITAL_TO_COUNTRY;

  return (
    <div className="stack">
      <div className="progress-row">
        <div className="progress">
          <div
            className="progress__fill"
            style={{ width: `${(game.index / game.total) * 100}%` }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={game.total}
            aria-valuenow={game.index}
            aria-label="Quiz progress"
          />
        </div>
        {game.streak >= 2 && (
          <p className="streak" aria-live="polite">
            🔥 {game.streak} in a row
          </p>
        )}
      </div>

      <QuestionCard question={question} index={game.index} total={game.total}>
        <div className="options">
          {question.options.map((option) => (
            <OptionButton
              key={option.id}
              option={option}
              showFlag={showFlags}
              state={optionState(option, picked, question.correctOptionId)}
              disabled={Boolean(picked)}
              onClick={() => game.answer(option.id)}
            />
          ))}
        </div>
      </QuestionCard>

      <div className="feedback" aria-live="polite">
        {picked && (picked.correct ? '✅ Correct!' : '❌ Not quite.')}
      </div>

      {picked && (
        <button type="button" className="button button--ghost button--block" onClick={game.skipAhead}>
          {game.index === game.total - 1 ? 'See results' : 'Next question'}
        </button>
      )}
    </div>
  );
}
