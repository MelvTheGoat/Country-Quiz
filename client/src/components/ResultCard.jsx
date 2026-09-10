import { forwardRef } from 'react';

/**
 * The card that gets rendered to a PNG for sharing. Deliberately emoji-only —
 * no CDN images — so `html-to-image` never hits a cross-origin snag.
 */
export const ResultCard = forwardRef(function ResultCard(
  { heading, subheading, rows, badge, note },
  ref,
) {
  return (
    <div className="result-card" ref={ref}>
      <div className="result-card__top">
        <span className="result-card__brand">🌍 Capitals Quiz</span>
        {badge && <span className="result-card__badge">{badge}</span>}
      </div>

      <h2 className="result-card__heading">{heading}</h2>
      {subheading && <p className="result-card__sub">{subheading}</p>}

      <ul className="result-card__rows">
        {rows.map((row) => (
          <li key={row.name} className={row.winner ? 'is-winner' : ''}>
            <span className="result-card__avatar" aria-hidden="true">
              {row.avatar}
            </span>
            <span className="result-card__name">{row.name}</span>
            {row.detail && <span className="result-card__detail">{row.detail}</span>}
            <span className="result-card__score">{row.score}</span>
          </li>
        ))}
      </ul>

      {note && <p className="result-card__note">{note}</p>}
    </div>
  );
});
