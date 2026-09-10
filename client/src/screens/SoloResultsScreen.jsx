import { useEffect, useRef, useState } from 'react';
import { describeSelection, formatSeconds } from '@capitals-quiz/shared';
import { ResultCard } from '../components/ResultCard.jsx';
import { ReviewList } from '../components/ReviewList.jsx';
import { shareCardImage, shareText, soloShareText } from '../lib/share.js';
import { recordBestScore } from '../lib/storage.js';
import { playFanfare } from '../lib/sound.js';

export function SoloResultsScreen({ profile, results, soundOn, onPlayAgain, onNewQuiz, onHome }) {
  const { stats, settings, review } = results;
  const label = describeSelection(settings.selection);
  const cardRef = useRef(null);
  const [shareState, setShareState] = useState(null);

  // Personal bests are per continent + direction. The write is a side effect, so
  // it lives in an effect behind a guard — recording it twice would compare the
  // result against itself and never look like a best.
  const [best, setBest] = useState({ isBest: false, previous: null });
  const recordedRef = useRef(false);
  useEffect(() => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    setBest(
      recordBestScore(settings.selection, settings.direction, {
        score: stats.correct,
        total: stats.total,
        accuracy: stats.accuracy,
        totalMs: stats.totalMs,
      }),
    );
  }, [settings, stats]);

  useEffect(() => {
    if (stats.accuracy >= 80) playFanfare(soundOn);
  }, [stats.accuracy, soundOn]);

  const summaryText = soloShareText({
    playerName: profile.name,
    score: stats.correct,
    total: stats.total,
    accuracy: stats.accuracy,
    label,
    seconds: formatSeconds(stats.totalMs),
  });

  const share = async () => {
    const outcome = await shareText({ text: summaryText });
    setShareState(outcome === 'copied' ? 'Copied to clipboard' : null);
  };

  const shareImage = async () => {
    setShareState('Rendering…');
    try {
      const outcome = await shareCardImage(cardRef.current, {
        fileName: 'capitals-quiz-solo.png',
        text: summaryText,
      });
      setShareState(outcome === 'downloaded' ? 'Image downloaded' : null);
    } catch {
      setShareState('Could not render the image — the text summary still works.');
    }
  };

  return (
    <div className="stack">
      <ResultCard
        ref={cardRef}
        heading={`${stats.correct} / ${stats.total}`}
        subheading={`${label} · ${stats.accuracy}% accuracy`}
        badge={best.isBest ? '🏆 Personal best' : null}
        rows={[
          {
            avatar: profile.avatar,
            name: profile.name,
            score: `${stats.accuracy}%`,
            detail: formatSeconds(stats.totalMs),
            winner: true,
          },
        ]}
        note={`Best streak ${stats.bestStreak} · ${formatSeconds(stats.avgMs)} per question`}
      />

      <ul className="stat-grid">
        <li>
          <span>Score</span>
          <strong>
            {stats.correct}/{stats.total}
          </strong>
        </li>
        <li>
          <span>Accuracy</span>
          <strong>{stats.accuracy}%</strong>
        </li>
        <li>
          <span>Time</span>
          <strong>{formatSeconds(stats.totalMs)}</strong>
        </li>
        <li>
          <span>Best streak</span>
          <strong>{stats.bestStreak}</strong>
        </li>
      </ul>

      {best.previous && !best.isBest && (
        <p className="hint">
          Your best here is {best.previous.score}/{best.previous.total} ({best.previous.accuracy}%).
        </p>
      )}

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
        <button type="button" className="button" onClick={onPlayAgain}>
          Play again
        </button>
        <button type="button" className="button" onClick={onNewQuiz}>
          Change quiz
        </button>
        <button type="button" className="button button--ghost" onClick={onHome}>
          Home
        </button>
      </div>

      <ReviewList
        rows={review.map((row) => ({
          question: row.question,
          correctOptionId: row.question.correctOptionId,
          entries: [
            {
              label: 'You',
              optionId: row.chosenOptionId,
              correct: row.correct,
              ms: row.ms,
              timedOut: row.chosenOptionId === null,
            },
          ],
        }))}
      />
    </div>
  );
}
