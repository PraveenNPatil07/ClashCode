import http from 'node:http';

import { createApp } from '../app.js';
import { supabase } from '../db/supabase.js';

const PLAYER_A = 'c6c803fd-aac6-43d2-b80f-91cb64c80371';
const PROBLEM_ID = '6dc50b1d-7a5f-45c5-9f94-6c2b613b9df8';

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

async function ageBattle(battleId: string) {
  const agedCreatedAt = new Date(Date.now() - 25_000).toISOString();
  const { error } = await supabase.from('battles').update({ created_at: agedCreatedAt }).eq('id', battleId);
  if (error) {
    throw new Error(`Failed to age sparring battle: ${error.message}`);
  }
}

async function main() {
  const app = createApp();
  const server = http.createServer(app);

  try {
    const port = await listen(server);
    const created = await api<{ battle: { id: string } }>(port, '/api/battles', {
      method: 'POST',
      body: JSON.stringify({
        playerAId: PLAYER_A,
        problemId: PROBLEM_ID
      })
    });

    await ageBattle(created.battle.id);
    const spar = await api<{ battle: { id: string; is_ai_sparring: boolean; status: string }; botDelayMs: number }>(port, `/api/battles/${created.battle.id}/spar`, {
      method: 'POST',
      body: JSON.stringify({ userId: PLAYER_A })
    });

    let latest: any = null;
    const startedAt = Date.now();
    while (Date.now() - startedAt < 130_000) {
      latest = await api<any>(port, `/api/battles/${created.battle.id}`);
      if (latest.battle?.status === 'completed') {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }

    console.log(JSON.stringify({
      battle_id: created.battle.id,
      ai_sparring_started: spar.battle.is_ai_sparring,
      bot_delay_ms: spar.botDelayMs,
      final_status: latest?.battle?.status ?? null,
      final_result: latest?.battle?.result ?? null,
      winner_id: latest?.battle?.winner_id ?? null,
      submission_count: latest?.battle?.submissions?.length ?? 0,
      opponent_name: latest?.battle?.player_b?.name ?? null
    }, null, 2));
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
