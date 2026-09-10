import { useEffect } from 'react';
import { DIRECTIONS, formatSeconds } from '@capitals-quiz/shared';
import { QuestionCard } from '../components/QuestionCard.jsx';
import { OptionButton } from '../components/OptionButton.jsx';
import { Timer } from '../components/Timer.jsx';
import { Scoreboard } from '../components/Scoreboard.jsx';
import { useCountdown } from '../hooks/useCountdown.js';
import { playCorrect, playWrong } from '../lib/sound.js';

function resultFor(reveal, playerId) {
  return reveal?.results.find((r) => r.playerId === playerId) || null;
}

export function MatchScreen({ room, me, opponent, question, reveal, paused, lockedAnswer, onAnswer, soundOn }) {
  const showingReveal = Boolean(reveal && question && reveal.index === question.index);

  const clock = useCountdown({
    durationMs: question?.remainingMs || 0,
    resetKey: `${question?.index ?? -1}-${paused ? 'paused' : 'live'}`,
    running: Boolean(question) && !showingReveal && !paused,
  });

  const grace = useCountdown({
    durationMs: paused?.graceMs || 0,
    resetKey: paused?.disconnectedPlayerId || 'none',
    running: Boolean(paused),
  });

  const myResult = resultFor(reveal, me?.id);
  useEffect(() => {
    if (!showingReveal || !myResult) return;
    if (myResult.correct) playCorrect(soundOn);
    else playWrong(soundOn);
  }, [showingReveal, reveal?.index, myResult?.correct, soundOn]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!question) {
    return (
      <div className="stack">
        <p className="hint" aria-live="polite">
          Getting the first question ready…
        </p>
      </div>
    );
  }

  const opponentResult = resultFor(reveal, opponent?.id);
  const showFlags = question.question.direction === DIRECTIONS.CAPITAL_TO_COUNTRY;
  const locked = lockedAnswer !== null && lockedAnswer !== undefined;

  const optionState = (option) => {
    if (!showingReveal) return option.id === lockedAnswer ? 'selected' : 'idle';
    if (option.id === reveal.correctOptionId) return 'correct';
    if (option.id === myResult?.optionId || option.id === opponentResult?.optionId) return 'wrong';
    return 'dimmed';
  };

  const pickers = (optionId) => {
    if (!showingReveal) return null;
    const names = [];
    if (myResult?.optionId === optionId) names.push('You');
    if (opponentResult?.optionId === optionId) names.push(opponent?.name || 'Opponent');
    return names.length ? names.join(' · ') : null;
  };

  const scorerLine = () => {
    if (!showingReveal) return null;
    if (!reveal.scorerId) return '😬 Nobody scored that one.';
    const bothCorrect = reveal.results.every((r) => r.correct);
    const scorerName = reveal.scorerId === me?.id ? 'You' : opponent?.name;
    if (bothCorrect) {
      const winnerMs = resultFor(reveal, reveal.scorerId)?.ms;
      return `⚡ Both right — ${scorerName} answered faster (${formatSeconds(winnerMs)}). Point to ${
        reveal.scorerId === me?.id ? 'you' : scorerName
      }.`;
    }
    return `${reveal.scorerId === me?.id ? '✅ You take' : `✅ ${scorerName} takes`} the point.`;
  };

  return (
    <div className="stack">
      <Scoreboard
        players={room.players}
        scores={showingReveal ? reveal.scores : question.scores}
        compact
      />

      {paused ? (
        <section className="panel panel--alert" role="status">
          <h3 className="panel__title">Match paused</h3>
          <p>
            {paused.disconnectedName} disconnected — waiting to reconnect ({grace.secondsLeft}s).
          </p>
          <p className="hint">
            If they don&apos;t come back, the match ends and you take the win.
          </p>
        </section>
      ) : (
        <Timer
          secondsLeft={showingReveal ? 0 : clock.secondsLeft}
          fraction={showingReveal ? 0 : clock.fraction}
          // During the reveal the clock is spent, but there is nothing urgent
          // about it any more — don't leave the bar shouting in red.
          urgentBelow={showingReveal ? -1 : 5}
        />
      )}

      <QuestionCard question={question.question} index={question.index} total={question.total}>
        <div className="options">
          {question.question.options.map((option) => (
            <OptionButton
              key={option.id}
              option={option}
              showFlag={showFlags}
              state={optionState(option)}
              note={pickers(option.id)}
              disabled={locked || showingReveal || Boolean(paused)}
              onClick={() => onAnswer(question.index, option.id)}
            />
          ))}
        </div>
      </QuestionCard>

      <div className="feedback" aria-live="polite">
        {showingReveal ? (
          <>
            <p className="feedback__line">{scorerLine()}</p>
            <p className="hint">
              {reveal.isLast ? 'Final scores coming up…' : 'Next question in a moment…'}
            </p>
          </>
        ) : locked ? (
          // Deliberately says nothing about the opponent: no peeking.
          <p className="feedback__line">🔒 Answer locked in. Sit tight…</p>
        ) : clock.msLeft === 0 ? (
          <p className="feedback__line">⏰ Time&apos;s up!</p>
        ) : null}
      </div>
    </div>
  );
}
