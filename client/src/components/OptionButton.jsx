import { Flag } from './Flag.jsx';

/**
 * One answer choice. Correctness is never signalled by colour alone: every
 * state also carries an icon and (for screen readers) a text label.
 */
export function OptionButton({ option, state = 'idle', showFlag = false, disabled, onClick, note }) {
  const icon = state === 'correct' ? '✅' : state === 'wrong' ? '❌' : null;
  const statusText =
    state === 'correct' ? 'Correct answer' : state === 'wrong' ? 'Wrong answer' : null;

  return (
    <button
      type="button"
      className={`option option--${state}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={state === 'selected'}
    >
      {showFlag && <Flag code={option.code} size="sm" />}
      <span className="option__text">{option.text}</span>
      {note && <span className="option__note">{note}</span>}
      {icon && (
        <span className="option__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {statusText && <span className="visually-hidden">{statusText}</span>}
    </button>
  );
}
