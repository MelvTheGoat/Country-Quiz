/**
 * The multiplayer wire protocol, in one place so the client and server can
 * never drift apart on an event name or a default.
 */

export const EVENTS = {
  // client → server
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_REJOIN: 'room:rejoin',
  ROOM_LEAVE: 'room:leave',
  PLAYER_READY: 'player:ready',
  ANSWER_SUBMIT: 'answer:submit',
  MATCH_REMATCH: 'match:rematch',

  // server → client
  ROOM_STATE: 'room:state',
  ROOM_CLOSED: 'room:closed',
  MATCH_QUESTION: 'match:question',
  MATCH_ANSWER_ACK: 'match:answer-ack',
  MATCH_REVEAL: 'match:reveal',
  MATCH_END: 'match:end',
  MATCH_PAUSED: 'match:paused',
  MATCH_RESUMED: 'match:resumed',
};

export const ROOM_STATUS = {
  WAITING: 'waiting', // host alone, no opponent yet
  LOBBY: 'lobby', // both players present, toggling ready
  IN_PROGRESS: 'in-progress',
  PAUSED: 'paused', // a player dropped mid-match
  FINISHED: 'finished',
};

export const QUESTION_COUNTS = [10, 15, 20];
export const TIME_LIMITS = [10, 15, 20, 30];

export const DEFAULT_SETTINGS = {
  selection: { type: 'continent', continent: 'Europe' },
  questionCount: 15,
  timeLimitSeconds: 15,
  direction: 'country-to-capital',
};

export const TIMING = {
  /** Shown between questions: reveal + running scoreboard. */
  REVEAL_MS: 3000,
  /** Grace period before a disconnected player forfeits. */
  RECONNECT_GRACE_MS: 60_000,
  /** A room nobody joins is dropped. */
  EMPTY_ROOM_TTL_MS: 10 * 60_000,
  /** A finished room lingers so both players can read the results / rematch. */
  FINISHED_ROOM_TTL_MS: 5 * 60_000,
  /** Slack added to the server-side timer to absorb network latency. */
  ANSWER_GRACE_MS: 750,
};

export const ERRORS = {
  ROOM_NOT_FOUND: 'Room not found. Double-check the code.',
  ROOM_FULL: 'That room already has two players.',
  ROOM_IN_PROGRESS: 'That match has already started.',
  NAME_REQUIRED: 'A display name is required.',
  INVALID_SETTINGS: 'Those quiz settings are not valid.',
};
