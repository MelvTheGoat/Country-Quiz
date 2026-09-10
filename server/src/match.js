/**
 * The multiplayer match engine.
 *
 * Everything time-based lives here (question timers, the reveal pause, the
 * reconnect grace period) and the server is the only clock that matters: the
 * client is told how many milliseconds are left, never when the deadline is in
 * its own local time.
 */
import {
  EVENTS,
  ROOM_STATUS,
  TIMING,
  buildQuiz,
  publicQuestion,
  resolveRound,
  summarizePlayer,
} from '@capitals-quiz/shared';
import { clearRoomTimers, playerList, serializeRoom } from './rooms.js';

const scoresOf = (room) =>
  Object.fromEntries(playerList(room).map((p) => [p.id, p.score]));

function emitToRoom(io, room, event, payload) {
  io.to(room.code).emit(event, payload);
}

function emitToPlayer(io, player, event, payload) {
  if (player.socketId) io.to(player.socketId).emit(event, payload);
}

export function broadcastRoomState(io, room) {
  emitToRoom(io, room, EVENTS.ROOM_STATE, serializeRoom(room));
}

function clearTimer(room, key) {
  if (room.timers[key]) {
    clearTimeout(room.timers[key]);
    room.timers[key] = null;
  }
}

/* ------------------------------------------------------------------ */
/* Starting a match                                                    */
/* ------------------------------------------------------------------ */

export function everyoneReady(room) {
  const players = playerList(room);
  return players.length === 2 && players.every((p) => p.ready && p.connected);
}

export function startMatch(io, room) {
  const quiz = buildQuiz({
    selection: room.settings.selection,
    count: room.settings.questionCount,
    direction: room.settings.direction,
  });

  clearRoomTimers(room);
  room.status = ROOM_STATUS.IN_PROGRESS;
  room.rematchRequestedBy = null;
  room.finishedAt = null;
  for (const player of room.players.values()) {
    player.score = 0;
    player.answers = [];
    player.ready = false;
  }
  room.match = {
    quiz,
    index: 0,
    askedAt: null,
    remainingMs: null,
    answers: {},
    history: [],
  };

  broadcastRoomState(io, room);
  askQuestion(io, room);
}

/* ------------------------------------------------------------------ */
/* Asking / answering                                                  */
/* ------------------------------------------------------------------ */

function questionPayloadFor(room, player) {
  const match = room.match;
  const question = match.quiz.questions[match.index];
  const mine = match.answers[player.id];
  return {
    index: match.index,
    total: match.quiz.questions.length,
    question: publicQuestion(question),
    timeLimitMs: room.settings.timeLimitSeconds * 1000,
    remainingMs: match.remainingMs,
    scores: scoresOf(room),
    // Only ever the viewer's own answer — never the opponent's.
    yourAnswer: mine ? mine.optionId : null,
  };
}

function askQuestion(io, room) {
  const match = room.match;
  match.phase = 'question';
  match.answers = {};
  match.askedAt = Date.now();
  match.remainingMs = room.settings.timeLimitSeconds * 1000;

  for (const player of room.players.values()) {
    emitToPlayer(io, player, EVENTS.MATCH_QUESTION, questionPayloadFor(room, player));
  }
  scheduleQuestionTimeout(io, room, match.remainingMs);
}

function scheduleQuestionTimeout(io, room, remainingMs) {
  clearTimer(room, 'question');
  room.timers.question = setTimeout(
    () => revealRound(io, room),
    remainingMs + TIMING.ANSWER_GRACE_MS,
  );
}

export function submitAnswer(io, room, player, { index, optionId }) {
  const match = room.match;
  if (!match || room.status !== ROOM_STATUS.IN_PROGRESS) return;
  if (index !== match.index) return; // stale answer from a previous question
  if (match.answers[player.id]) return; // already locked in

  const question = match.quiz.questions[match.index];
  const validOption = question.options.some((o) => o.id === optionId);
  if (!validOption && optionId !== null) return;

  const elapsed = Math.max(0, Date.now() - match.askedAt);
  match.answers[player.id] = {
    optionId,
    ms: Math.min(elapsed, room.settings.timeLimitSeconds * 1000),
  };

  // Confirm the lock-in to the answering player only; telling the room would
  // leak that this player has answered.
  emitToPlayer(io, player, EVENTS.MATCH_ANSWER_ACK, { index: match.index, optionId });

  const connected = playerList(room).filter((p) => p.connected);
  if (connected.every((p) => match.answers[p.id])) {
    revealRound(io, room);
  }
}

/* ------------------------------------------------------------------ */
/* Reveal + scoreboard                                                 */
/* ------------------------------------------------------------------ */

function revealRound(io, room) {
  const match = room.match;
  if (!match || room.status !== ROOM_STATUS.IN_PROGRESS) return;
  clearTimer(room, 'question');

  const question = match.quiz.questions[match.index];
  const ids = playerList(room).map((p) => p.id);
  const outcome = resolveRound(question, match.answers, ids);

  if (outcome.scorerId) {
    room.players.get(outcome.scorerId).score += 1;
  }
  for (const result of outcome.results) {
    room.players.get(result.playerId).answers.push({
      questionIndex: match.index,
      optionId: result.optionId,
      correct: result.correct,
      ms: result.ms,
      timedOut: result.timedOut,
    });
  }
  match.history.push({ question, ...outcome });

  const isLast = match.index === match.quiz.questions.length - 1;
  match.phase = 'reveal';
  match.revealIsLast = isLast;
  emitToRoom(io, room, EVENTS.MATCH_REVEAL, {
    index: match.index,
    total: match.quiz.questions.length,
    question, // full question, correct answer included — the round is over
    correctOptionId: outcome.correctOptionId,
    results: outcome.results,
    scorerId: outcome.scorerId,
    scores: scoresOf(room),
    nextInMs: TIMING.REVEAL_MS,
    isLast,
  });

  clearTimer(room, 'reveal');
  room.timers.reveal = setTimeout(() => {
    if (room.status !== ROOM_STATUS.IN_PROGRESS) return;
    if (isLast) {
      endMatch(io, room, 'completed');
    } else {
      match.index += 1;
      askQuestion(io, room);
    }
  }, TIMING.REVEAL_MS);
}

/* ------------------------------------------------------------------ */
/* Ending                                                              */
/* ------------------------------------------------------------------ */

export function buildSummary(room, reason, { forfeitedBy = null } = {}) {
  const players = playerList(room);
  const top = Math.max(...players.map((p) => p.score));
  const leaders = players.filter((p) => p.score === top);

  let winnerId = leaders.length === 1 ? leaders[0].id : null;
  if (forfeitedBy) {
    const remaining = players.find((p) => p.id !== forfeitedBy);
    winnerId = remaining ? remaining.id : null;
  }

  return {
    code: room.code,
    reason, // 'completed' | 'forfeit'
    settings: room.settings,
    winnerId,
    draw: !forfeitedBy && leaders.length > 1,
    forfeitedBy,
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      score: p.score,
      stats: summarizePlayer({ answers: p.answers, score: p.score }),
    })),
    questions: (room.match?.history || []).map((entry) => ({
      index: entry.question.index,
      prompt: entry.question.prompt,
      options: entry.question.options,
      correctOptionId: entry.correctOptionId,
      direction: entry.question.direction,
      scorerId: entry.scorerId,
      results: entry.results,
    })),
  };
}

export function endMatch(io, room, reason, options = {}) {
  clearRoomTimers(room);
  const summary = buildSummary(room, reason, options);
  room.lastSummary = summary; // kept so a refreshing player can be re-served it
  room.status = ROOM_STATUS.FINISHED;
  room.finishedAt = Date.now();
  room.rematchRequestedBy = null;
  for (const player of room.players.values()) player.ready = false;

  emitToRoom(io, room, EVENTS.MATCH_END, summary);
  broadcastRoomState(io, room);
  return summary;
}

/* ------------------------------------------------------------------ */
/* Disconnect / reconnect                                              */
/* ------------------------------------------------------------------ */

export function pauseForDisconnect(io, room, droppedPlayer) {
  const match = room.match;
  if (!match) return;

  if (match.phase === 'question') {
    // Freeze the question clock where it stands so the returning player is not
    // punished for the seconds they spent offline.
    const elapsed = Date.now() - match.askedAt;
    match.remainingMs = Math.max(2000, match.remainingMs - elapsed);
  }
  clearTimer(room, 'question');
  clearTimer(room, 'reveal');

  room.status = ROOM_STATUS.PAUSED;
  const resumeDeadlineMs = TIMING.RECONNECT_GRACE_MS;
  emitToRoom(io, room, EVENTS.MATCH_PAUSED, {
    disconnectedPlayerId: droppedPlayer.id,
    disconnectedName: droppedPlayer.name,
    graceMs: resumeDeadlineMs,
  });
  broadcastRoomState(io, room);

  clearTimer(room, 'grace');
  room.timers.grace = setTimeout(() => {
    if (room.status !== ROOM_STATUS.PAUSED) return;
    room.status = ROOM_STATUS.IN_PROGRESS; // so endMatch's guards behave
    endMatch(io, room, 'forfeit', { forfeitedBy: droppedPlayer.id });
  }, resumeDeadlineMs);
}

export function resumeAfterReconnect(io, room) {
  if (room.status !== ROOM_STATUS.PAUSED) return;
  if (!playerList(room).every((p) => p.connected)) return;

  clearTimer(room, 'grace');
  room.status = ROOM_STATUS.IN_PROGRESS;
  const match = room.match;

  if (match.phase === 'reveal') {
    // The drop happened while the scoreboard was showing: pick up at the next
    // question (or finish, if that was the last one).
    emitToRoom(io, room, EVENTS.MATCH_RESUMED, { remainingMs: null });
    broadcastRoomState(io, room);
    if (match.revealIsLast) {
      endMatch(io, room, 'completed');
    } else {
      match.index += 1;
      askQuestion(io, room);
    }
    return;
  }

  match.askedAt = Date.now();
  emitToRoom(io, room, EVENTS.MATCH_RESUMED, { remainingMs: match.remainingMs });
  for (const player of room.players.values()) {
    emitToPlayer(io, player, EVENTS.MATCH_QUESTION, questionPayloadFor(room, player));
  }
  scheduleQuestionTimeout(io, room, match.remainingMs);
  broadcastRoomState(io, room);
}

/** Re-sends whatever the player should be looking at after a page refresh. */
export function resyncPlayer(io, room, player) {
  emitToPlayer(io, player, EVENTS.ROOM_STATE, serializeRoom(room));
  if (room.status === ROOM_STATUS.IN_PROGRESS && room.match) {
    emitToPlayer(io, player, EVENTS.MATCH_QUESTION, questionPayloadFor(room, player));
  }
  if (room.status === ROOM_STATUS.FINISHED && room.lastSummary) {
    emitToPlayer(io, player, EVENTS.MATCH_END, room.lastSummary);
  }
}
