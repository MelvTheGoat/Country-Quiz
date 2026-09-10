export const AVATARS = ['🌍', '🌎', '🌏', '🦊', '🐼', '🦉', '🐙', '🚀', '⚡', '🧭', '🗺️', '🏆'];

/** Small emoji identity picker shown next to the name field. */
export function AvatarPicker({ value, onChange }) {
  return (
    <div className="avatars" role="radiogroup" aria-label="Choose an avatar">
      {AVATARS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          role="radio"
          aria-checked={value === emoji}
          aria-label={`Avatar ${emoji}`}
          className={`avatar ${value === emoji ? 'is-active' : ''}`}
          onClick={() => onChange(emoji)}
        >
          <span aria-hidden="true">{emoji}</span>
        </button>
      ))}
    </div>
  );
}
