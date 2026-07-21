import type { Server } from 'socket.io';

let io: Server | null = null;

export function setSocketServer(server: Server) {
  io = server;
}

export function getSocketServer(): Server {
  if (!io) {
    throw new Error('Socket server is not initialized.');
  }

  return io;
}

export function battleRoom(battleId: string) {
  return `battle:${battleId}`;
}

export function warRoom(warId: string) {
  return `war:${warId}`;
}

const OFFLINE_THRESHOLD_MS = 45_000;
const globalPresenceMap = new Map<string, number>();

export function markUserOnline(userId: string) {
  globalPresenceMap.set(userId, Date.now());
}

export function isUserOnline(userId: string): boolean {
  const lastSeen = globalPresenceMap.get(userId);
  if (!lastSeen) return false;
  return (Date.now() - lastSeen) < OFFLINE_THRESHOLD_MS;
}

export function sweepStalePresence() {
  const now = Date.now();
  for (const [userId, lastSeen] of globalPresenceMap.entries()) {
    if (now - lastSeen > OFFLINE_THRESHOLD_MS * 3) {
      globalPresenceMap.delete(userId);
    }
  }
}
