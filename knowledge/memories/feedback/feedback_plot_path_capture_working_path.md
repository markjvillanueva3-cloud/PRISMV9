---
name: feedback_plot_path_capture_working_path
description: STANDING RULE (fleet-wide, all galaxies) — plot your path / track your movements toward every goal; when a working path is proven, capture it + wire it into the autonomous AI + feed india's learning system; compound-learn across galaxies. Mechanism: scripts/lib/path-ledger.mjs.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.439Z
aliases: feedback_plot_path_capture_working_path
---


**THE RULE (operator directive 2026-05-31, fleet-wide — every galaxy/slot):**

1. **Plot your path / track your movements.** As you work toward a goal, record the ordered sequence
   of actions you take (your trajectory) — `path-ledger.recordStep(pathId, {action, args})`.
2. **When a working path is proven, capture it.** The moment a goal is *achieved*, promote the
   trajectory to a reusable **WorkingPath** keyed by `(domain, goalType)` —
   `path-ledger.captureWorkingPath(pathId, {domain, goalType, goal, outcome:{success:true}, score})`.
   Capture FAILED paths too (negative paths) so selection avoids known dead-ends.
3. **Wire it into the autonomous AI.** A WorkingPath → `toExecutionPlan()` → the autonomous executor
   (`autonomousDispatcher` `auto_execute`) **replays** the proven sequence on similar goals instead of
   re-deriving. Starting domains: **delta (CAD)** + **kilo (CAM)** — autonomous CAD/CAM that keeps learning.
4. **Add it to the learning system — through india.** `emitLearningRow(workingPath)` writes a labeled
   row onto india's canonical **OutcomeFeedbackBus** (`state/shared/outcome-bus.jsonl`, same schema
   `outcome-bus-auto-tap.mjs` uses). Per india doctrine, *"learning signal goes through india"* — its
   NN-GRAPH / LoRA / meta-learn consume the bus on their cadence; do NOT build a parallel learner.
5. **Compound-learn across galaxies.** The ledger is fleet-wide: every galaxy contributes + consumes
   proven paths. A proven CAD path informs CAM (and vice-versa) via shared goal-embeddings → learning
   compounds *across* domains, not just within one.

**Why:** PRISM already EXECUTES goals but throws away the TRAJECTORY. Capturing the proven action
sequence turns a one-shot success into a replayable, compounding asset — the fleet stops re-deriving
known-good paths and starts replaying + improving them, and one shared learner (india) gets every
galaxy's wins.

**How to apply (any slot, any goal):**
- Mechanism: `scripts/lib/path-ledger.mjs` (pure-core, fail-soft) + CLI `node scripts/path-ledger.mjs
  {record|capture|find|replay|emit|list}`. Knob `PRISM_PATH_LEDGER_DISABLE=1`.
- Retrieve before re-planning: `findWorkingPaths(domain, goalType, {embed, query})` — kNN over
  goal-embeddings memoizes proven paths (the acceleration lever; see
  `state/shared/specs/PATHING-ACCELERATION-PLAN-2026-05-31.md`).
- Per-domain adoption (delta/kilo own it in their slots): record the autonomous path, capture on a
  clean result, replay proven paths for similar prints/parts.
- HONESTY (R12): `emitLearningRow` completes the *wire* (row on india's bus); india's retrain
  *ingestion* is india's downstream — coordinate, don't assume it auto-trains.

Wiki: [[working-path-capture]]. Coordinated with india (ai-training galaxy). Sibling: [[feedback_always_capture_lessons]] (lessons) — this is its trajectory-level companion (proven *paths*, not just error fixes). Standing: [[feedback_always_fill_gaps]].
