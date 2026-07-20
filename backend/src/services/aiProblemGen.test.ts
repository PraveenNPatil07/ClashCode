import { generateProblem } from './aiProblemGen.js';

async function main() {
  const requests = [
    { difficulty: 'easy' as const, category: 'arrays' },
    { difficulty: 'medium' as const, category: 'graphs' },
    { difficulty: 'hard' as const, category: 'dp' }
  ];

  for (const request of requests) {
    const problem = await generateProblem(request.difficulty, request.category);
    console.log(`\n=== ${request.difficulty.toUpperCase()} / ${request.category.toUpperCase()} ===`);
    console.log(JSON.stringify(problem, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
