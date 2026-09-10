import { useState } from 'react';
import { flagUrl, getCountry } from '@capitals-quiz/shared';

/**
 * Flags come from flagcdn.com; if the CDN is unreachable we fall back to the
 * flag emoji stored in the dataset. Either way the country name is exposed to
 * screen readers.
 */
export function Flag({ code, name, size = 'md', className = '' }) {
  const country = getCountry(code);
  const label = `Flag of ${name || country?.name || 'unknown country'}`;
  // Remembering *which* code failed (rather than a boolean reset by an effect)
  // means a load error can't be undone by a re-render that happens after it.
  const [failedCode, setFailedCode] = useState(null);
  const failed = Boolean(country) && failedCode === country.code;

  if (!country) return null;

  if (failed) {
    return (
      <span className={`flag flag--${size} flag--emoji ${className}`} role="img" aria-label={label}>
        {country.flag}
      </span>
    );
  }

  return (
    <img
      className={`flag flag--${size} ${className}`}
      src={flagUrl(country.code, { width: size === 'lg' ? 320 : 160 })}
      alt={label}
      loading="lazy"
      decoding="async"
      onError={() => setFailedCode(country.code)}
    />
  );
}
