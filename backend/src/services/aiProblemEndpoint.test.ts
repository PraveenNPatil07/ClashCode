import http from 'node:http';

import { createApp } from '../app.js';

async function listen(server: http.Server) {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to resolve temporary server address.');
  }

  return address.port;
}

async function main() {
  const app = createApp();
  const server = http.createServer(app);

  try {
    const port = await listen(server);
    const generatedProblem = {
      title: 'Pair Sum Difference',
      description: 'Given a JSON object with an array of integers named numbers, print the difference between the largest and smallest values.',
      difficulty: 'easy',
      category: 'arrays',
      test_cases: [
        { input: { numbers: [1, 5, 9] }, expected_output: 8 },
        { input: { numbers: [4, 4, 4] }, expected_output: 0 },
        { input: { numbers: [-5, 10, 0] }, expected_output: 15 },
        { input: { numbers: [42] }, expected_output: 0 }
      ]
    };

    const response = await fetch(`http://127.0.0.1:${port}/api/problems/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ generatedProblem })
    });

    const payload = await response.json();
    console.log(JSON.stringify({
      status: response.status,
      problem_id: payload.problem?.id ?? null,
      title: payload.problem?.title ?? null,
      source: payload.problem?.source ?? null,
      difficulty: payload.problem?.difficulty ?? null,
      test_case_count: payload.problem?.test_cases?.length ?? 0
    }, null, 2));
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
