import http from 'node:http';

import { Server } from 'socket.io';

import { createApp } from '../app.js';
import { setSocketServer } from './socket.js';

const PLAYER_A = 'c6c803fd-aac6-43d2-b80f-91cb64c80371';
const PLAYER_B = 'fdd0cd0e-c3e0-414a-a013-f1cc76e08379';
const PROBLEM_ID = '1a9d1834-0174-49de-a39d-f08a4bc787fe';

const correctPython = `import json
prices = json.loads(input())["prices"]
low = 10**9
best = 0
for price in prices:
    low = min(low, price)
    best = max(best, price - low)
print(best)`;

async function listen(server: http.Server) {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to resolve temporary server address.');
  }

  return address.port;
}

async function api<T>(port: number, path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {})
    },
    ...options
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message ?? `Request failed: ${response.status}`);
  }

  return payload as T;
}

async function closeServer(server: http.Server) {
  const address = server.address();
  if (!address) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function main() {
  const app = createApp();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*'
    }
  });
  setSocketServer(io);

  try {
    const port = await listen(server);
    const created = await api<{ battle: { id: string } }>(port, '/api/battles', {
      method: 'POST',
      body: JSON.stringify({
        playerAId: PLAYER_A,
        playerBId: PLAYER_B,
        problemId: PROBLEM_ID
      })
    });

    await api(port, `/api/battles/${created.battle.id}/start`, { method: 'POST' });
    const submitted = await api<{ submission: { verdict: string; ai_review: string | null }; battle: { id: string; status: string } | null; winnerDeclared: boolean }>(port, `/api/battles/${created.battle.id}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        userId: PLAYER_A,
        language: 'python',
        code: correctPython
      })
    });

    console.log(JSON.stringify({
      battle_id: created.battle.id,
      verdict: submitted.submission.verdict,
      winner_declared: submitted.winnerDeclared,
      has_ai_review: Boolean(submitted.submission.ai_review),
      ai_review_preview: submitted.submission.ai_review?.slice(0, 220) ?? null,
      final_status: submitted.battle?.status ?? null
    }, null, 2));
  } finally {
    io.removeAllListeners();
    io.close();
    await closeServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
