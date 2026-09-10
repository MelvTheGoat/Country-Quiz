import { useCallback, useEffect, useRef, useState } from 'react';
import { EVENTS, ROOM_STATUS } from '@capitals-quiz/shared';
import { emitWithAck, getSocket } from '../lib/socket.js';
import { STORAGE_KEYS, readStored, writeStored } from '../lib/storage.js';

const emptyMatch = { question: null, reveal: null, summary: null, paused: null, lockedAnswer: null };

/**
 * The seat (room code + player id) is persisted, not just held in memory: a
 * refresh mid-match otherwise loses the room code and the player is left to
 * forfeit while the server holds their place open.
 */
const rememberSeat = (seat) => writeStored(STORAGE_KEYS.seat, seat);
const forgetSeat = () => writeStored(STORAGE_KEYS.seat, null);

/**
 * All multiplayer socket state in one place: screens below only see plain data
 * and a handful of actions.
 */
export function useMultiplayer(profile) {
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState(null);
  const [match, setMatch] = useState(emptyMatch);
  const [notice, setNotice] = useState(null);

  /** Kept in a ref so the reconnect handler always sees the current seat. */
  const seatRef = useRef(readStored(STORAGE_KEYS.seat, null));
  /** A seat restored from storage may be long stale — fail it quietly. */
  const restoredSeatRef = useRef(Boolean(seatRef.current));

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      setConnected(true);
      // Reclaim our seat after a dropped connection or a page refresh.
      if (seatRef.current) {
        socket.emit(EVENTS.ROOM_REJOIN, seatRef.current, (response) => {
          if (!response?.ok) {
            const wasRestored = restoredSeatRef.current;
            seatRef.current = null;
            restoredSeatRef.current = false;
            forgetSeat();
            setRoom(null);
            setMatch(emptyMatch);
            if (!wasRestored) {
              setNotice(response?.error || 'That room is no longer available.');
            }
          } else {
            restoredSeatRef.current = false;
          }
        });
      }
    };
    const onDisconnect = () => setConnected(false);

    const onRoomState = (state) => {
      setRoom(state);
      if (state.status === ROOM_STATUS.LOBBY || state.status === ROOM_STATUS.WAITING) {
        setMatch(emptyMatch);
      }
    };
    const onQuestion = (payload) =>
      setMatch((prev) => ({
        ...prev,
        question: payload,
        reveal: null,
        summary: null,
        paused: null,
        lockedAnswer: payload.yourAnswer ?? null,
      }));
    const onAck = (payload) => setMatch((prev) => ({ ...prev, lockedAnswer: payload.optionId }));
    const onReveal = (payload) => setMatch((prev) => ({ ...prev, reveal: payload }));
    const onEnd = (summary) =>
      setMatch((prev) => ({ ...prev, summary, question: null, reveal: null, paused: null }));
    const onPaused = (payload) => setMatch((prev) => ({ ...prev, paused: payload }));
    const onResumed = () => setMatch((prev) => ({ ...prev, paused: null }));
    const onClosed = ({ reason }) => {
      seatRef.current = null;
      forgetSeat();
      setRoom(null);
      setMatch(emptyMatch);
      setNotice(reason === 'expired' ? 'That room expired.' : 'The room was closed.');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(EVENTS.ROOM_STATE, onRoomState);
    socket.on(EVENTS.MATCH_QUESTION, onQuestion);
    socket.on(EVENTS.MATCH_ANSWER_ACK, onAck);
    socket.on(EVENTS.MATCH_REVEAL, onReveal);
    socket.on(EVENTS.MATCH_END, onEnd);
    socket.on(EVENTS.MATCH_PAUSED, onPaused);
    socket.on(EVENTS.MATCH_RESUMED, onResumed);
    socket.on(EVENTS.ROOM_CLOSED, onClosed);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(EVENTS.ROOM_STATE, onRoomState);
      socket.off(EVENTS.MATCH_QUESTION, onQuestion);
      socket.off(EVENTS.MATCH_ANSWER_ACK, onAck);
      socket.off(EVENTS.MATCH_REVEAL, onReveal);
      socket.off(EVENTS.MATCH_END, onEnd);
      socket.off(EVENTS.MATCH_PAUSED, onPaused);
      socket.off(EVENTS.MATCH_RESUMED, onResumed);
      socket.off(EVENTS.ROOM_CLOSED, onClosed);
    };
  }, []);

  const identity = useCallback(
    () => ({ name: profile.name, avatar: profile.avatar, playerId: profile.playerId }),
    [profile.name, profile.avatar, profile.playerId],
  );

  const createRoom = useCallback(
    async (settings) => {
      const response = await emitWithAck(EVENTS.ROOM_CREATE, { ...identity(), settings });
      if (response.ok) {
        seatRef.current = { code: response.code, playerId: response.playerId };
        rememberSeat(seatRef.current);
        setRoom(response.room);
        setMatch(emptyMatch);
        setNotice(null);
      }
      return response;
    },
    [identity],
  );

  const joinRoom = useCallback(
    async (code) => {
      const response = await emitWithAck(EVENTS.ROOM_JOIN, { ...identity(), code });
      if (response.ok) {
        seatRef.current = { code: response.code, playerId: response.playerId };
        rememberSeat(seatRef.current);
        setRoom(response.room);
        setMatch(emptyMatch);
        setNotice(null);
      }
      return response;
    },
    [identity],
  );

  const setReady = useCallback((ready) => {
    getSocket().emit(EVENTS.PLAYER_READY, { ready });
  }, []);

  const answer = useCallback((index, optionId) => {
    setMatch((prev) => (prev.lockedAnswer ? prev : { ...prev, lockedAnswer: optionId }));
    getSocket().emit(EVENTS.ANSWER_SUBMIT, { index, optionId });
  }, []);

  const rematch = useCallback(() => {
    getSocket().emit(EVENTS.MATCH_REMATCH);
  }, []);

  const leaveRoom = useCallback(() => {
    getSocket().emit(EVENTS.ROOM_LEAVE);
    seatRef.current = null;
    forgetSeat();
    setRoom(null);
    setMatch(emptyMatch);
  }, []);

  const me = room?.players.find((p) => p.id === profile.playerId) || null;
  const opponent = room?.players.find((p) => p.id !== profile.playerId) || null;

  return {
    connected,
    room,
    me,
    opponent,
    notice,
    dismissNotice: () => setNotice(null),
    ...match,
    createRoom,
    joinRoom,
    setReady,
    answer,
    rematch,
    leaveRoom,
  };
}
