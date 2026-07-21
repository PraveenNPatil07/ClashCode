<!-- generated-by: groundrules v1.9.0 -->
# Adoption log — ClashCode

> A **dated, frozen** record of the `/groundrules:adopt` run on **2026-07-20**: what was here, and what
> groundrules did. Its purpose is **feedback to the plugin** — add your remarks below and share this
> file back to improve groundrules. This is **not** `docs/AGENT-EVALS.md` (the agent's behaviour here)
> nor `/groundrules:apply-best-practices` (external recommendations); it's the account of *this run*.

## What was here (before)

- Monorepo structure with React frontend, Node backend, and Supabase DB
- Found standard open source docs: `README.md`, `TESTING.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `LICENSE`
- Found `.env` files in frontend and backend
- Did not find any existing `CLAUDE.md`, `PLAN.md`

## What groundrules did

- Map-in-place strategy chosen to preserve existing root-level `.md` files
- Generated core docs: `CLAUDE.md`, `docs/VISION.md`, `docs/decisions/`, `docs/LEARNINGS.md`, `intake/`, `docs/media/`
- Generated specific docs: `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/SECURITY.md`, `docs/DESIGN_SYSTEM.md`
- Left as-is: `README.md` and all other root `.md` files

## Remarks (fill in, then share back)

> Where did groundrules **not** do what you wanted? Be specific — the sections above give the context
> that makes each remark actionable when harvested into the groundrules repo (→ an idea / ADR / LEARNINGS).

- _e.g. "It skipped X but I'd have wanted Y" / "the CLAUDE.md omitted Z which my global doesn't actually cover" / "the mapping of `<file>` to `<role>` was wrong"_
-

---

Machine-readable detail of this run lives in `.groundrules.json` (`answers`, `generatedFiles`,
`adoptedFiles`, `skippedFiles`, `migratedFiles`). This log is a one-time snapshot — it is **not** kept
in sync as the project evolves.
