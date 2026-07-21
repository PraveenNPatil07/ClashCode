<!-- generated-by: groundrules v1.9.0 -->
# Vision — ClashCode

> Synthesis of the project intent. Source: `README.md`. Update when intent evolves (rare; tactical decisions go in `docs/decisions/`).

## Goal

To build a real-time, competitive coding platform designed for university students to represent their college, challenge rivals to 1v1 live programming battles, and solve algorithms faster than their opponents to climb a global leaderboard.

## Users / personas

1. **University Students (Competitors)**: Looking for a fun, fast-paced environment to test their coding skills against peers and represent their school.
2. **Colleges / Universities**: Indirectly, as entities that gain prestige on the global leaderboard.

## Constraints

- Real-time synchronization requires low-latency WebSockets.
- Must support safe execution or validation of submitted code.
- Must be a modern, scalable full-stack application (React, Express, PostgreSQL).

## Out of scope for V1 (non-goals)

- Team battles (strictly 1v1 for now).
- Complex tournament bracket systems.
- In-browser code execution sandbox (we rely on a backend judge or AI review).

## V1 acceptance criteria

- Users can sign up and associate with a college.
- Users can see online opponents and challenge them.
- Real-time 1v1 battle arena with shared timer and distinct problems.
- Leaderboard updates in real-time as colleges win battles.
- AI-powered sparring bot for practice.

---

Further reading:
- `intake/` — raw upstream notes (specs, emails, brainstorms)
- `docs/decisions/` — structural decisions made during the project
- `docs/LEARNINGS.md` — non-trivial learnings
- `docs/ARCHITECTURE.md` (if present) — architecture snapshot

