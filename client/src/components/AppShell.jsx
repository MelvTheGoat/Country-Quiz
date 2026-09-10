/** Page chrome: title bar, back button, and the sound / theme toggles. */
export function AppShell({ title, subtitle, onBack, theme, onToggleTheme, soundOn, onToggleSound, children }) {
  return (
    <div className="shell">
      <header className="shell__header">
        <div className="shell__lead">
          {onBack ? (
            <button type="button" className="icon-button" onClick={onBack} aria-label="Go back">
              <span aria-hidden="true">←</span>
            </button>
          ) : (
            <span className="shell__logo" aria-hidden="true">
              🌍
            </span>
          )}
          <div>
            <h1 className="shell__title">{title}</h1>
            {subtitle && <p className="shell__subtitle">{subtitle}</p>}
          </div>
        </div>

        <div className="shell__actions">
          <button
            type="button"
            className="icon-button"
            onClick={onToggleSound}
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Mute sound effects' : 'Unmute sound effects'}
            title={soundOn ? 'Sound on' : 'Sound off'}
          >
            <span aria-hidden="true">{soundOn ? '🔊' : '🔇'}</span>
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Dark mode' : 'Light mode'}
          >
            <span aria-hidden="true">{theme === 'dark' ? '🌙' : '☀️'}</span>
          </button>
        </div>
      </header>

      <main className="shell__main">{children}</main>
    </div>
  );
}
