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
