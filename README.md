# ClashCode

Phase 1 foundation for ClashCode: a full-stack monorepo with a Supabase/Postgres schema, realistic seed data, a minimal Express API, Socket.io connection wiring, and a React leaderboard shell.

## Stack

- Frontend: React + Vite + TypeScript + TailwindCSS
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL via Supabase
- Real-time: Socket.io
- Package manager: npm workspaces

## Project structure

```text
clashcode/
├── frontend/
├── backend/
│   └── supabase/migrations/
├── shared/
├── package.json
└── README.md
```

## Environment variables

Backend in [backend/.env.example](E:\HACKTHNONS\ClashCode\backend\.env.example):

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
```

Frontend in [frontend/.env.example](E:\HACKTHNONS\ClashCode\frontend\.env.example):

```bash
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```

## Install dependencies

```bash
npm install
```

## Run Supabase migration

Choose one of these paths:

```bash
supabase db push
```

Or run the SQL in [backend/supabase/migrations/202607180001_phase1_schema.sql](E:\HACKTHNONS\ClashCode\backend\supabase\migrations\202607180001_phase1_schema.sql) through the Supabase SQL editor.

## Seed data

```bash
npm run seed
```

This inserts:

- 4 colleges
- 20 students
- 15 sample problems

The script is idempotent because it upserts on stable UUIDs.

## Start the apps

Backend:

```bash
npm run dev:backend
```

Frontend:

```bash
npm run dev:frontend
```

## API endpoints

- `GET /api/health` checks Express and confirms the backend can query Supabase.
- `GET /api/colleges` returns the seeded colleges ordered by points.

## What is included in Phase 1

- Monorepo scaffold with `frontend`, `backend`, and `shared`
- Supabase migration for all 7 core tables
- Indexes on foreign keys and status fields
- Idempotent seed script with realistic college, user, and problem data
- Socket.io server wired with a connection-ready event
- React home page that fetches health status and college data

## Verification checklist

After you configure Supabase and run the migration and seed:

1. Visit `http://localhost:4000/api/health` and confirm `{ "ok": true, "database": "connected" }`
2. Visit the frontend at `http://localhost:5173` and confirm 4 colleges render
3. Confirm the browser shows the socket connection as live

## Notes

- This scaffold intentionally does not implement battles, matchmaking, wars, judging, or AI flows yet.
- The backend uses the Supabase service role key because seeding and server-side reads happen from trusted code.

## Phase 2 battle flow

### Additional backend env vars

```bash
JUDGE0_RAPIDAPI_KEY=your-rapidapi-key
JUDGE0_RAPIDAPI_HOST=judge0-ce.p.rapidapi.com
JUDGE0_BASE_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_POLL_INTERVAL_MS=1500
JUDGE0_MAX_POLLS=20
```

### Apply the Phase 2 migration

```bash
npx supabase db push
```

This applies [backend/supabase/migrations/202607180002_phase2_battles.sql](E:\HACKTHNONS\ClashCode\backend\supabase\migrations\202607180002_phase2_battles.sql).

### Judge0 connectivity test

Once your backend `.env` contains both Supabase values and `JUDGE0_RAPIDAPI_KEY`, run:

```bash
npm exec --workspace backend tsx src/services/judge.test.ts
```

Expected success shape:

```json
{
  "status": "Accepted",
  "stdout": "7\n",
  "stderr": null,
  "execution_time": "..."
}
```

### Manual API battle test

Suggested seeded players:

- Player A: `c6c803fd-aac6-43d2-b80f-91cb64c80371` (`Aarav Mehta`)
- Player B: `fdd0cd0e-c3e0-414a-a013-f1cc76e08379` (`Maya Patel`)
- Problem: `833171f9-e64d-484c-8c52-9f75295c1c87` (`Climb the Tower`)

Create a battle:

```bash
curl -X POST http://localhost:4000/api/battles ^
  -H "Content-Type: application/json" ^
  -d "{\"playerAId\":\"c6c803fd-aac6-43d2-b80f-91cb64c80371\",\"playerBId\":\"fdd0cd0e-c3e0-414a-a013-f1cc76e08379\",\"problemId\":\"833171f9-e64d-484c-8c52-9f75295c1c87\"}"
```

Start the battle:

```bash
curl -X POST http://localhost:4000/api/battles/<battle-id>/start
```

Submit Python from player A:

```bash
curl -X POST http://localhost:4000/api/battles/<battle-id>/submit ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\":\"c6c803fd-aac6-43d2-b80f-91cb64c80371\",\"language\":\"python\",\"code\":\"import json\\npayload = json.loads(input())\\nn = payload['n']\\na, b = 1, 1\\nfor _ in range(n - 1):\\n    a, b = b, a + b\\nprint(a)\"}"
```

Submit JavaScript from player B:

```bash
curl -X POST http://localhost:4000/api/battles/<battle-id>/submit ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\":\"fdd0cd0e-c3e0-414a-a013-f1cc76e08379\",\"language\":\"javascript\",\"code\":\"const fs = require('fs');\\nconst payload = JSON.parse(fs.readFileSync(0, 'utf8'));\\nlet n = payload.n;\\nlet a = 1, b = 1;\\nfor (let i = 1; i < n; i += 1) { const next = a + b; a = b; b = next; }\\nconsole.log(a);\"}"
```

Fetch the final battle state:

```bash
curl http://localhost:4000/api/battles/<battle-id>
```

### Frontend battle test

Open the same battle in two tabs:

- `http://localhost:5173/battle/<battle-id>?userId=c6c803fd-aac6-43d2-b80f-91cb64c80371`
- `http://localhost:5173/battle/<battle-id>?userId=fdd0cd0e-c3e0-414a-a013-f1cc76e08379`

Each tab joins the same Socket.io room. When one tab submits, the other tab gets live battle events and refreshes state without polling.

### Input/output contract for solutions

For Phase 2, every test case is passed to the program as one JSON object on `stdin`. The program must print only the final answer. Arrays or objects must be valid JSON on `stdout`.
