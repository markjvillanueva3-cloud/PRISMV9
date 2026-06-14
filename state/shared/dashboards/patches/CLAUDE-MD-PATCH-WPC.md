# CLAUDE-MD-PATCH — WORKING-PATH-CAPTURE-MS0 (U-WPC-PROPAGATE)

> PATCH-SIBLING for the next root `H:/prism/CLAUDE.md` editor to splice (root CLAUDE.md is
> high-contention peer-locked; alpha wrote this from the slot worktree 2026-05-31 rather than
> race the lock). Splice as a new `## WORKING-PATH-CAPTURE` doctrine-pointer section (keep it
> pointer-dense, ≤ ~12 lines — CLAUDE.md is an index, detail lives in the wiki).

---

## WORKING-PATH-CAPTURE — plot path → capture working-path → autonomous-learning → compound (2026-05-31)

Standing fleet-wide rule (alpha, coordinated with india): **plot your path / track your movements**
toward every goal; when a **working path** is proven, **capture** it, **wire it into the autonomous AI**
(replay), and **feed india's learning system** — so the fleet **compound-learns** proven paths instead
of re-deriving them. PRISM executes goals but throws away the trajectory; this keeps it.

Mechanism: `scripts/lib/path-ledger.mjs` (pure-core, fail-soft) + CLI `node scripts/path-ledger.mjs
{record|capture|find|replay|emit|list}`. `recordStep` → `captureWorkingPath` (atomic dedup) →
`findWorkingPaths` (kNN memoization) → `toExecutionPlan` (autonomous `auto_execute` replay) →
`emitLearningRow` (→ india's OutcomeFeedbackBus `state/shared/outcome-bus.jsonl`; *"learning signal
goes through india"*). Knob `PRISM_PATH_LEDGER_DISABLE=1`. Per-domain replay adoption: delta (CAD) +
kilo (CAM) own it in their slots, on this proven foundation (R13). Acceleration:
`state/shared/specs/PATHING-ACCELERATION-PLAN-2026-05-31.md` (kNN/beam/A*/retrain/prewarm/transfer).
Wiki: [`knowledge/wiki/architecture/working-path-capture.md`]. Rule memory:
[[feedback_plot_path_capture_working_path]] (auto-fed to all galaxies via obsidian-memory-feed).
