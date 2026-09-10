import { useCallback, useState } from 'react';
import { readStored, writeStored } from '../lib/storage.js';

/** useState that mirrors its value into localStorage. */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    const stored = readStored(key, null);
    return stored === null ? initialValue : stored;
  });

  const update = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        writeStored(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return [value, update];
}
