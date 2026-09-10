/**
 * Scoring rules, kept pure so solo results and multiplayer results are computed
 * the same way (and so they can be unit tested without a socket in sight).
 */

/**
 * Head-to-head round:
 *  - both correct  → the faster answer takes the point
 *  - one correct   → that player takes the point
 *  - both wrong    → nobody scores
 * A missing answer (ran out of time) counts as wrong.
 */
export function resolveRound(question, answersByPlayer, playerIds) {
  const results = playerIds.map((playerId) => {
    const answer = answersByPlayer[playerId] || null;
    return {
      playerId,
      optionId: answer ? answer.optionId : null,
      answered: Boolean(answer),
      timedOut: !answer,
      ms: answer ? answer.ms : null,
      correct: Boolean(answer) && answer.optionId === question.correctOptionId,
    };
  });

  const correct = results.filter((r) => r.correct);
  let scorerId = null;
  if (correct.length === 1) {
    scorerId = correct[0].playerId;
  } else if (correct.length > 1) {
    scorerId = [...correct].sort((a, b) => a.ms - b.ms)[0].playerId;
  }

  return { correctOptionId: question.correctOptionId, results, scorerId };
}

export function accuracyPct(correct, total) {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

function averageMs(values) {
  const timed = values.filter((v) => typeof v === 'number');
  if (timed.length === 0) return null;
  return Math.round(timed.reduce((sum, v) => sum + v, 0) / timed.length);
}

/** Stats for one player across a finished quiz/match. */
export function summarizePlayer({ answers = [], score = null }) {
  const correct = answers.filter((a) => a.correct).length;
  const total = answers.length;
  let streak = 0;
  let bestStreak = 0;
  for (const a of answers) {
    streak = a.correct ? streak + 1 : 0;
    bestStreak = Math.max(bestStreak, streak);
  }
  return {
    total,
    correct,
    wrong: total - correct,
    score: score === null ? correct : score,
    accuracy: accuracyPct(correct, total),
    bestStreak,
    avgMs: averageMs(answers.map((a) => a.ms)),
    totalMs: answers.reduce((sum, a) => sum + (a.ms || 0), 0),
  };
}

export function formatSeconds(ms) {
  if (ms === null || ms === undefined) return '—';
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  return `${mins}m ${Math.round(seconds - mins * 60)}s`;
}
