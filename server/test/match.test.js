import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS, ROOM_STATUS, TIMING } from '@capitals-quiz/shared';
import { RoomStore, makePlayer } from '../src/rooms.js';
import {
  endMatch,
  everyoneReady,
  pauseForDisconnect,
  resumeAfterReconnect,
  startMatch,
  submitAnswer,
} from '../src/match.js';

/** Minimal stand-in for a Socket.io server that records what was emitted where. */
function fakeIo() {
  const sent = [];
  return {
    sent,
    to(target) {
      return {
        emit(event, payload) {
          sent.push({ target, event, payload });
        },
      };
    },
    eventsFor(event) {
      return sent.filter((entry) => entry.event === event);
    },
    last(event) {
      return [...sent].reverse().find((entry) => entry.event === event);
    },
  };
}

function setupRoom({ questionCount = 3, timeLimitSeconds = 15 } = {}) {
  const store = new RoomStore();
  const room = store.createRoom({
    settings: {
      selection: { type: 'continent', continent: 'Europe' },
      questionCount,
      timeLimitSeconds,
      direction: 'country-to-capital',
    },
    host: { id: 'host', name: 'Ada', socketId: 'socket-host' },
  });
  room.players.set('guest', makePlayer({ id: 'guest', name: 'Grace', socketId: 'socket-guest' }));
  room.status = ROOM_STATUS.LOBBY;
  return { store, room };
}

/** Answers the current question for a player, then reads back the reveal. */
function answerCurrent(io, room, playerId, pick) {
  const index = room.match.index;
  const question = room.match.quiz.questions[index];
  const optionId =
    pick === 'correct'
      ? question.correctOptionId
      : question.options.find((o) => o.id !== question.correctOptionId).id;
  submitAnswer(io, room, room.players.get(playerId), { index, optionId });
  return optionId;
}

test('a match only starts when both players are ready and connected', () => {
  const { room } = setupRoom();
  assert.equal(everyoneReady(room), false);
  room.players.get('host').ready = true;
  assert.equal(everyoneReady(room), false);
  room.players.get('guest').ready = true;
  assert.equal(everyoneReady(room), true);
  room.players.get('guest').connected = false;
  assert.equal(everyoneReady(room), false);
});

test('the first question reaches each player individually, with the answer stripped', () => {
  const io = fakeIo();
  const { room } = setupRoom();
  startMatch(io, room);

  const questions = io.eventsFor(EVENTS.MATCH_QUESTION);
  assert.equal(questions.length, 2);
  assert.deepEqual(
    questions.map((q) => q.target).sort(),
    ['socket-guest', 'socket-host'],
  );
  for (const { payload } of questions) {
    assert.equal(payload.question.correctOptionId, undefined);
    assert.equal(payload.question.answerCode, undefined);
    assert.equal(payload.yourAnswer, null);
    assert.equal(payload.question.options.length, 4);
  }
  endMatch(io, room, 'completed');
});

test('answering tells only the answering player, never the room', () => {
  const io = fakeIo();
  const { room } = setupRoom();
  startMatch(io, room);

  answerCurrent(io, room, 'host', 'correct');

  const acks = io.eventsFor(EVENTS.MATCH_ANSWER_ACK);
  assert.equal(acks.length, 1);
  assert.equal(acks[0].target, 'socket-host');
  // Nothing at all should have gone to the opponent or to the room.
  assert.equal(io.eventsFor(EVENTS.MATCH_REVEAL).length, 0);
  assert.equal(
    io.sent.some((entry) => entry.target === room.code && entry.event !== EVENTS.ROOM_STATE),
    false,
  );
  endMatch(io, room, 'completed');
});

test('when both have answered the round reveals immediately and the faster player scores', () => {
  const io = fakeIo();
  const { room } = setupRoom();
  startMatch(io, room);

  answerCurrent(io, room, 'host', 'correct');
  room.match.answers.host.ms = 5000; // the host was slower
  answerCurrent(io, room, 'guest', 'correct');

  const reveal = io.last(EVENTS.MATCH_REVEAL);
  assert.ok(reveal, 'the round should have been revealed');
  assert.equal(reveal.target, room.code);
  assert.equal(reveal.payload.scorerId, 'guest');
  assert.equal(reveal.payload.scores.guest, 1);
  assert.equal(reveal.payload.scores.host, 0);
  assert.equal(reveal.payload.question.correctOptionId, reveal.payload.correctOptionId);
  endMatch(io, room, 'completed');
});

test('a second answer from the same player is ignored', () => {
  const io = fakeIo();
  const { room } = setupRoom();
  startMatch(io, room);

  const first = answerCurrent(io, room, 'host', 'wrong');
  submitAnswer(io, room, room.players.get('host'), {
    index: room.match.index,
    optionId: room.match.quiz.questions[room.match.index].correctOptionId,
  });
  assert.equal(room.match.answers.host.optionId, first);
  endMatch(io, room, 'completed');
});

test('a stale answer for an earlier question is ignored', () => {
  const io = fakeIo();
  const { room } = setupRoom();
  startMatch(io, room);
  submitAnswer(io, room, room.players.get('host'), { index: 99, optionId: 'FR' });
  assert.equal(room.match.answers.host, undefined);
  endMatch(io, room, 'completed');
});

test('a disconnect pauses the match and keeps the remaining time', () => {
  const io = fakeIo();
  const { room } = setupRoom({ timeLimitSeconds: 20 });
  startMatch(io, room);

  room.match.askedAt = Date.now() - 5000; // five seconds into the question
  const guest = room.players.get('guest');
  guest.connected = false;
  pauseForDisconnect(io, room, guest);

  assert.equal(room.status, ROOM_STATUS.PAUSED);
  const paused = io.last(EVENTS.MATCH_PAUSED);
  assert.equal(paused.payload.disconnectedPlayerId, 'guest');
  assert.equal(paused.payload.graceMs, TIMING.RECONNECT_GRACE_MS);
  assert.ok(room.match.remainingMs <= 15000 && room.match.remainingMs > 14000);

  guest.connected = true;
  resumeAfterReconnect(io, room);
  assert.equal(room.status, ROOM_STATUS.IN_PROGRESS);
  const resumed = io.last(EVENTS.MATCH_RESUMED);
  assert.equal(resumed.payload.remainingMs, room.match.remainingMs);
  endMatch(io, room, 'completed');
});

test('a player who never returns forfeits the match', () => {
  const io = fakeIo();
  const { room } = setupRoom();
  startMatch(io, room);
  answerCurrent(io, room, 'host', 'correct');

  const summary = endMatch(io, room, 'forfeit', { forfeitedBy: 'guest' });
  assert.equal(summary.winnerId, 'host');
  assert.equal(summary.reason, 'forfeit');
  assert.equal(room.status, ROOM_STATUS.FINISHED);
  assert.ok(io.last(EVENTS.MATCH_END));
});

test('an equal score ends in a declared draw', () => {
  const io = fakeIo();
  const { room } = setupRoom();
  startMatch(io, room);
  const summary = endMatch(io, room, 'completed');
  assert.equal(summary.draw, true);
  assert.equal(summary.winnerId, null);
});

test('rooms nobody joins are swept, fresh rooms are kept', () => {
  const store = new RoomStore();
  const room = store.createRoom({
    settings: { selection: { type: 'world' }, questionCount: 10, timeLimitSeconds: 15 },
    host: { id: 'host', name: 'Ada', socketId: 's1' },
  });
  assert.deepEqual(store.sweep(), []);

  room.createdAt = Date.now() - TIMING.EMPTY_ROOM_TTL_MS - 1000;
  assert.deepEqual(store.sweep(), [room.code]);
  assert.equal(store.get(room.code), null);
});

test('finished rooms linger for a rematch, then get cleaned up', () => {
  const io = fakeIo();
  const { store, room } = setupRoom();
  startMatch(io, room);
  endMatch(io, room, 'completed');

  assert.deepEqual(store.sweep(), []);
  room.finishedAt = Date.now() - TIMING.FINISHED_ROOM_TTL_MS - 1000;
  assert.deepEqual(store.sweep(), [room.code]);
});
