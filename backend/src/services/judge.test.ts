import { runJudge } from './judge.js';

const PYTHON_PROGRAM = `
import json
payload = json.loads(input())
print(payload["a"] + payload["b"])
`.trim();

async function main() {
  const result = await runJudge(PYTHON_PROGRAM, 'python', JSON.stringify({ a: 2, b: 5 }));
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});