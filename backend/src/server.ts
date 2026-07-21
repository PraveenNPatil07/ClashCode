import http from 'node:http';

import { Server } from 'socket.io';

import { createApp } from './app.js';
import { env } from './db/env.js';
import { battleRoom, markUserOnline, setSocketServer, sweepStalePresence, warRoom } from './services/socket.js';

const app    = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: env.CLIENT_ORIGIN }
});

setSocketServer(io);

// ---------------------------------------------------------------------------
// In-memory presence tracker
// Key: `${battleId}:${userId}` → last heartbeat epoch ms
// ---------------------------------------------------------------------------
const presenceMap = new Map<string, number>();
const OFFLINE_THRESHOLD_MS = 45_000; // 45 s without heartbeat → offline
const AWAY_THRESHOLD_MS    = 15_000; // 15–45 s → away / not typing

function presenceKey(battleId: string, userId: string) {
  return `${battleId}:${userId}`;
}

function getPresenceStatus(lastSeen: number | undefined): 'online' | 'away' | 'offline' {
  if (lastSeen === undefined) return 'offline';
  const age = Date.now() - lastSeen;
  if (age < AWAY_THRESHOLD_MS)   return 'online'; // actively heartbeating (likely typing)
  if (age < OFFLINE_THRESHOLD_MS) return 'away';
  return 'offline';
}

/** Emit current presence snapshot for all tracked users in a battle */
function broadcastPresence(battleId: string) {
  const snapshot: Record<string, 'online' | 'away' | 'offline'> = {};

  for (const [key, lastSeen] of presenceMap.entries()) {
    if (key.startsWith(`${battleId}:`)) {
      const userId = key.slice(battleId.length + 1);
      snapshot[userId] = getPresenceStatus(lastSeen);
    }
  }

  io.to(battleRoom(battleId)).emit('user:presence', { battleId, presence: snapshot });
}

// Sweep stale entries and broadcast updates every 10 s
setInterval(() => {
  const now = Date.now();
  for (const [key, lastSeen] of presenceMap.entries()) {
    if (now - lastSeen > OFFLINE_THRESHOLD_MS * 3) {
      presenceMap.delete(key); // full GC after 3× threshold
    }
  }
  sweepStalePresence();
}, 10_000);

// ---------------------------------------------------------------------------
// Socket event handlers
// ---------------------------------------------------------------------------
io.on('connection', (socket) => {
  socket.emit('socket:ready', {
    message:     'ClashCode socket connection established.',
    connectedAt: new Date().toISOString()
  });

  socket.on('global:heartbeat', ({ userId }: { userId: string }) => {
    if (userId) markUserOnline(userId);
  });

  // ── Battle room ──────────────────────────────────────────────────────────
  socket.on('battle:join', ({ battleId }: { battleId: string }) => {
    socket.join(battleRoom(battleId));
    // Send current presence snapshot to the newly joined socket
    const snapshot: Record<string, 'online' | 'away' | 'offline'> = {};
    for (const [key, lastSeen] of presenceMap.entries()) {
      if (key.startsWith(`${battleId}:`)) {
        const userId = key.slice(battleId.length + 1);
        snapshot[userId] = getPresenceStatus(lastSeen);
      }
    }
    socket.emit('user:presence', { battleId, presence: snapshot });
  });

  socket.on('battle:leave', ({ battleId }: { battleId: string }) => {
    socket.leave(battleRoom(battleId));
  });

  // ── Presence heartbeat ───────────────────────────────────────────────────
  socket.on('user:heartbeat', ({ battleId, userId }: { battleId: string; userId: string }) => {
    if (!battleId || !userId) return;
    presenceMap.set(presenceKey(battleId, userId), Date.now());
    broadcastPresence(battleId);
  });

  // ── Disconnect: mark user offline in all their battles ──────────────────
  socket.on('disconnect', () => {
    // We don't know which battles this socket was in without tracking,
    // so we rely on the sweep interval + heartbeat timeout to detect offline.
    // Presence will go 'away' → 'offline' naturally within 45 s.
  });

  // ── War room ─────────────────────────────────────────────────────────────
  socket.on('war:join',  ({ warId }: { warId: string }) => socket.join(warRoom(warId)));
  socket.on('war:leave', ({ warId }: { warId: string }) => socket.leave(warRoom(warId)));
});

server.listen(env.PORT, () => {
  console.log(`ClashCode backend listening on http://localhost:${env.PORT}`);
});
