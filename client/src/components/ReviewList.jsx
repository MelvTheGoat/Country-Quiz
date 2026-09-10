import { formatSeconds } from '@capitals-quiz/shared';
import { Flag } from './Flag.jsx';

const textFor = (question, optionId) =>
  question.options.find((o) => o.id === optionId)?.text ?? null;

/**
 * Per-question breakdown. `rows` entries look like:
 *   { question, correctOptionId, entries: [{ label, optionId, correct, ms, timedOut }] }
 * which covers both the single-player review and the two-player match review.
 */
export function ReviewList({ rows, title = 'Every question' }) {
  return (
    <section className="review">
      <h3>{title}</h3>
      <ol className="review__list">
        {rows.map(({ question, correctOptionId, entries }) => (
          <li key={question.index} className="review__item">
            <div className="review__prompt">
              {question.prompt.kind === 'country' && (
                <Flag code={question.prompt.code} size="sm" />
              )}
              <span>
                {question.prompt.label} <strong>{question.prompt.text}</strong>?
              </span>
            </div>

            <p className="review__answer">
              <span className="review__tag">Answer</span>
              <strong>{textFor(question, correctOptionId)}</strong>
            </p>

            <ul className="review__entries">
              {entries.map((entry) => (
                <li key={entry.label} className={entry.correct ? 'is-correct' : 'is-wrong'}>
                  <span aria-hidden="true">{entry.correct ? '✅' : '❌'}</span>
                  <span className="visually-hidden">{entry.correct ? 'Correct:' : 'Wrong:'}</span>
                  <span className="review__who">{entry.label}</span>
                  <span className="review__given">
                    {entry.timedOut || entry.optionId === null
                      ? 'no answer'
                      : textFor(question, entry.optionId)}
                  </span>
                  {entry.ms != null && (
                    <span className="review__time">{formatSeconds(entry.ms)}</span>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
