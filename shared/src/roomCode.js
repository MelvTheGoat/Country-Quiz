/**
 * Room codes are read aloud and typed on phones, so the alphabet drops every
 * ambiguous glyph: no 0/O, no 1/I/L, no 5/S, no 2/Z, no 8/B.
 */
export const ROOM_CODE_ALPHABET = 'ACDEFGHJKMNPQRTUVWXY34679';
export const ROOM_CODE_LENGTH = 5;

export function generateRoomCode(length = ROOM_CODE_LENGTH, random = Math.random) {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += ROOM_CODE_ALPHABET[Math.floor(random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

/** Uppercases and strips spaces/punctuation so "q4 f7-h" reads as "Q4F7H". */
export function normalizeRoomCode(input) {
  return String(input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, ROOM_CODE_LENGTH);
}

export function isValidRoomCode(code) {
  return (
    typeof code === 'string' &&
    code.length === ROOM_CODE_LENGTH &&
    [...code].every((ch) => ROOM_CODE_ALPHABET.includes(ch))
  );
}
