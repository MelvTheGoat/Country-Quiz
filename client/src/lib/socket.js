import { io } from 'socket.io-client';

/**
 * In dev the API runs on :4000 next to Vite's :5173. In production point
 * VITE_SERVER_URL at the deployed backend (Render/Fly/…); if it is unset we
 * assume the server also serves the front end.
 */
export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV ? 'http://localhost:4000' : window.location.origin);

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
    });
  }
  return socket;
}

/** Promise wrapper around Socket.io acknowledgements. */
export function emitWithAck(event, payload, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const s = getSocket();
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({ ok: false, error: 'The server did not respond. Is it running?' });
      }
    }, timeoutMs);

    s.emit(event, payload, (response) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(response || { ok: false, error: 'Empty response from server.' });
    });
  });
}
