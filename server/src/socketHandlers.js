/**
 * Socket.io wiring. This layer only validates input, moves players in and out
 * of rooms, and delegates every rule to `match.js` / the shared game logic.
 */
import { randomUUID } from 'node:crypto';
import {
  EVENTS,
  ERRORS,
  ROOM_STATUS,
  normalizeRoomCode,
  normalizeSettings,
  sanitizeName,
  nameError,
} from '@capitals-quiz/shared';
import { makePlayer, playerList, serializeRoom } from './rooms.js';
import {
  broadcastRoomState,
  endMatch,
  everyoneReady,
  pauseForDisconnect,
  resumeAfterReconnect,
  resyncPlayer,
  startMatch,
  submitAnswer,
} from './match.js';

const respond = (ack, payload) => {
  if (typeof ack === 'function') ack(payload);
};

const fail = (ack, error) => respond(ack, { ok: false, error });

export function registerSocketHandlers(io, store) {
  io.on('connection', (socket) => {
    /** Set once this socket is seated in a room. */
    let seat = null; // { code, playerId }

    const currentRoom = () => (seat ? store.get(seat.code) : null);

    socket.on(EVENTS.ROOM_CREATE, (payload = {}, ack) => {
      const name = sanitizeName(payload.name);
      const invalidName = nameError(name);
      if (invalidName) return fail(ack, invalidName);

      const { settings, error } = normalizeSettings(payload.settings);
      if (error) return fail(ack, error);

      const playerId = payload.playerId || randomUUID();
      const room = store.createRoom({
        settings,
        host: { id: playerId, name, avatar: payload.avatar, socketId: socket.id },
      });
      seat = { code: room.code, playerId };
      socket.join(room.code);

      respond(ack, { ok: true, code: room.code, playerId, room: serializeRoom(room) });
      broadcastRoomState(io, room);
    });

    socket.on(EVENTS.ROOM_JOIN, (payload = {}, ack) => {
      const name = sanitizeName(payload.name);
      const invalidName = nameError(name);
      if (invalidName) return fail(ack, invalidName);

      const code = normalizeRoomCode(payload.code);
      const room = store.get(code);
      if (!room) return fail(ack, ERRORS.ROOM_NOT_FOUND);
      if (room.players.size >= 2) return fail(ack, ERRORS.ROOM_FULL);
      if (room.status === ROOM_STATUS.IN_PROGRESS || room.status === ROOM_STATUS.PAUSED) {
        return fail(ack, ERRORS.ROOM_IN_PROGRESS);
      }

      const playerId = payload.playerId || randomUUID();
      room.players.set(
        playerId,
        makePlayer({ id: playerId, name, avatar: payload.avatar, socketId: socket.id }),
      );
      room.status = ROOM_STATUS.LOBBY;
      store.touch(room);

      seat = { code: room.code, playerId };
      socket.join(room.code);

      respond(ack, { ok: true, code: room.code, playerId, room: serializeRoom(room) });
      broadcastRoomState(io, room);
    });

    /** Re-attach to a seat after a refresh or a dropped connection. */
    socket.on(EVENTS.ROOM_REJOIN, (payload = {}, ack) => {
      const code = normalizeRoomCode(payload.code);
      const room = store.get(code);
      if (!room) return fail(ack, ERRORS.ROOM_NOT_FOUND);

      const player = room.players.get(payload.playerId);
      if (!player) return fail(ack, ERRORS.ROOM_NOT_FOUND);

      player.socketId = socket.id;
      player.connected = true;
      seat = { code: room.code, playerId: player.id };
      socket.join(room.code);
      store.touch(room);

      respond(ack, { ok: true, code: room.code, playerId: player.id, room: serializeRoom(room) });
      resyncPlayer(io, room, player);
      broadcastRoomState(io, room);
      resumeAfterReconnect(io, room);
    });

    socket.on(EVENTS.PLAYER_READY, (payload = {}) => {
      const room = currentRoom();
      if (!room) return;
      const player = room.players.get(seat.playerId);
      if (!player) return;
      if (room.status !== ROOM_STATUS.LOBBY && room.status !== ROOM_STATUS.WAITING) return;

      player.ready = Boolean(payload.ready);
      store.touch(room);
      broadcastRoomState(io, room);

      if (everyoneReady(room)) startMatch(io, room);
    });

    socket.on(EVENTS.ANSWER_SUBMIT, (payload = {}) => {
      const room = currentRoom();
      if (!room) return;
      const player = room.players.get(seat.playerId);
      if (!player) return;
      store.touch(room);
      submitAnswer(io, room, player, {
        index: Number(payload.index),
        optionId: payload.optionId ?? null,
      });
    });

    socket.on(EVENTS.MATCH_REMATCH, () => {
      const room = currentRoom();
      if (!room || room.status !== ROOM_STATUS.FINISHED) return;
      const player = room.players.get(seat.playerId);
      if (!player) return;

      // Back to a lobby with the same settings; the asking player is ready by
      // definition, the opponent confirms with their own ready toggle.
      room.status = playerList(room).length === 2 ? ROOM_STATUS.LOBBY : ROOM_STATUS.WAITING;
      room.rematchRequestedBy = player.id;
      room.match = null;
      room.lastSummary = null;
      for (const p of room.players.values()) {
        p.ready = p.id === player.id;
        p.score = 0;
        p.answers = [];
      }
      store.touch(room);
      broadcastRoomState(io, room);
      if (everyoneReady(room)) startMatch(io, room);
    });

    socket.on(EVENTS.ROOM_LEAVE, () => leaveRoom({ permanent: true }));

    socket.on('disconnect', () => leaveRoom({ permanent: false }));

    function leaveRoom({ permanent }) {
      const room = currentRoom();
      if (!room) return;
      const player = room.players.get(seat.playerId);
      seat = null;
      if (!player) return;

      player.connected = false;
      player.socketId = null;
      player.ready = false;
      socket.leave(room.code);
      store.touch(room);

      if (permanent) {
        room.players.delete(player.id);
        if (room.status === ROOM_STATUS.IN_PROGRESS || room.status === ROOM_STATUS.PAUSED) {
          endMatch(io, room, 'forfeit', { forfeitedBy: player.id });
        } else if (room.players.size === 0) {
          store.delete(room.code);
          return;
        } else {
          room.status = ROOM_STATUS.WAITING;
        }
        broadcastRoomState(io, room);
        return;
      }

      if (room.status === ROOM_STATUS.IN_PROGRESS) {
        pauseForDisconnect(io, room, player);
      } else {
        broadcastRoomState(io, room);
      }
    }
  });
}
