/** Visible per-question countdown: a draining bar plus the number of seconds. */
export function Timer({ secondsLeft, fraction, urgentBelow = 5 }) {
  const urgent = secondsLeft <= urgentBelow;
  return (
    <div className={`timer ${urgent ? 'timer--urgent' : ''}`}>
      <div
        className="timer__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fraction * 100)}
        aria-label="Time remaining this question"
      >
        <div className="timer__fill" style={{ transform: `scaleX(${Math.max(0, fraction)})` }} />
      </div>
      <span className="timer__value" role="timer" aria-live="off">
        {secondsLeft}s
      </span>
    </div>
  );
}
