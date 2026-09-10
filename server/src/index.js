import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { COUNTRIES, ROOM_STATUS, normalizeRoomCode } from '@capitals-quiz/shared';
import { CLIENT_ORIGIN, PORT } from './config.js';
import { RoomStore } from './rooms.js';
import { registerSocketHandlers } from './socketHandlers.js';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

const store = new RoomStore();

app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: store.size, uptimeSeconds: Math.round(process.uptime()) });
});

/** The dataset is also served over HTTP so other clients don't need the repo. */
app.get('/api/countries', (_req, res) => res.json(COUNTRIES));

/** Lets the join screen say "no such room" before opening a socket. */
app.get('/api/rooms/:code', (req, res) => {
  const room = store.get(normalizeRoomCode(req.params.code));
  if (!room) return res.status(404).json({ ok: false, error: 'Room not found' });
  return res.json({
    ok: true,
    code: room.code,
    status: room.status,
    playerCount: room.players.size,
    joinable: room.players.size < 2 && room.status === ROOM_STATUS.WAITING,
    settings: room.settings,
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
});

registerSocketHandlers(io, store);

const sweeper = setInterval(() => {
  const removed = store.sweep();
  for (const code of removed) {
    io.to(code).emit('room:closed', { code, reason: 'expired' });
  }
}, 30_000);
sweeper.unref?.();

server.listen(PORT, () => {
  console.log(`Capitals Quiz server listening on http://localhost:${PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    clearInterval(sweeper);
    io.close();
    server.close(() => process.exit(0));
  });
}
