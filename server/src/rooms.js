/**
 * In-memory room storage. v1 deliberately has no database: a room only has to
 * outlive a single match, and everything is rebuilt from scratch on restart.
 */
import { generateRoomCode, ROOM_STATUS, TIMING } from '@capitals-quiz/shared';

export class RoomStore {
  constructor({ now = () => Date.now() } = {}) {
    this.rooms = new Map();
    this.now = now;
  }

  createRoom({ settings, host }) {
    let code = generateRoomCode();
    while (this.rooms.has(code)) code = generateRoomCode();

    const room = {
      code,
      settings,
      status: ROOM_STATUS.WAITING,
      hostId: host.id,
      createdAt: this.now(),
      lastActivityAt: this.now(),
      finishedAt: null,
      players: new Map(),
      /** Live match state; null between matches. */
      match: null,
      /** setTimeout handles, cleared whenever the room changes phase. */
      timers: { question: null, reveal: null, grace: null },
      rematchRequestedBy: null,
    };
    room.players.set(host.id, makePlayer(host));
    this.rooms.set(code, room);
    return room;
  }

  get(code) {
    return this.rooms.get(String(code || '').toUpperCase()) || null;
  }

  /** Every room a socket is sitting in (normally exactly one). */
  findBySocket(socketId) {
    for (const room of this.rooms.values()) {
      for (const player of room.players.values()) {
        if (player.socketId === socketId) return { room, player };
      }
    }
    return null;
  }

  delete(code) {
    const room = this.rooms.get(code);
    if (!room) return;
    clearRoomTimers(room);
    this.rooms.delete(code);
  }

  touch(room) {
    room.lastActivityAt = this.now();
  }

  /**
   * Drops rooms nobody is coming back to. Returns the codes it removed so the
   * caller can tell any lingering sockets why.
   */
  sweep() {
    const now = this.now();
    const removed = [];
    for (const [code, room] of this.rooms) {
      const someoneConnected = [...room.players.values()].some((p) => p.connected);
      const idleFor = now - room.lastActivityAt;

      const unusedRoom =
        room.status === ROOM_STATUS.WAITING && now - room.createdAt > TIMING.EMPTY_ROOM_TTL_MS;
      const abandonedRoom = !someoneConnected && idleFor > TIMING.EMPTY_ROOM_TTL_MS;
      const staleFinished =
        room.status === ROOM_STATUS.FINISHED &&
        room.finishedAt &&
        now - room.finishedAt > TIMING.FINISHED_ROOM_TTL_MS;

      if (unusedRoom || abandonedRoom || staleFinished) {
        clearRoomTimers(room);
        this.rooms.delete(code);
        removed.push(code);
      }
    }
    return removed;
  }

  get size() {
    return this.rooms.size;
  }
}

export function makePlayer({ id, name, avatar, socketId }) {
  return {
    id,
    name,
    avatar: avatar || '🌍',
    socketId: socketId || null,
    connected: true,
    ready: false,
    score: 0,
    /** One entry per answered/timed-out question, used for the final breakdown. */
    answers: [],
  };
}

export function clearRoomTimers(room) {
  for (const key of Object.keys(room.timers)) {
    if (room.timers[key]) clearTimeout(room.timers[key]);
    room.timers[key] = null;
  }
}

export function playerList(room) {
  return [...room.players.values()];
}

export function opponentOf(room, playerId) {
  return playerList(room).find((p) => p.id !== playerId) || null;
}

/**
 * The room as a player is allowed to see it. Notably absent: anything about the
 * current question's answers, so nobody can peek at whether their opponent has
 * already locked one in.
 */
export function serializeRoom(room) {
  return {
    code: room.code,
    status: room.status,
    settings: room.settings,
    hostId: room.hostId,
    rematchRequestedBy: room.rematchRequestedBy,
    players: playerList(room).map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      connected: p.connected,
      ready: p.ready,
      score: p.score,
    })),
  };
}
