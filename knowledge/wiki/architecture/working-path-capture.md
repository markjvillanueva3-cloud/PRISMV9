---
title: working-path-capture — plot-path → capture working-path → autonomous-learning → compound across galaxies
type: architecture
status: shipped
shipped: 2026-05-31
slot: alpha
milestone: WORKING-PATH-CAPTURE-MS0
tags: [learning, trajectory, autonomous, cad, cam, india, outcome-bus, compound-learning, path-ledger, doctrine]
---

# Working-Path Capture (WORKING-PATH-CAPTURE-MS0)

Operator directive (2026-05-31, fleet-wide): *plot your path / track your movements toward a goal;
when a working path is proven, wire it into the AI system to drive autonomous CAD/CAM that keeps
learning; add it to the learning system; pass the rule to all galaxies so we compound-learn.*
Built fleet-wide by **alpha** (cross-galaxy doctrine + learning-memory owner), coordinated with
**india** (ai-training galaxy). Rule: [[feedback_plot_path_capture_working_path]].

## The problem
PRISM already EXECUTES goals but throws away the **trajectory**. The proven action sequence to a
goal is a reusable, compounding asset — capturing it turns a one-shot success into a replayable plan
so autonomous CAD/CAM stops re-deriving and starts replaying + improving known-good paths.

## Mechanism — `scripts/lib/path-ledger.mjs` (pure-core, fail-soft; the only net-new code)
| fn | role |
|---|---|
| `recordStep(pathId, step)` | plot one movement → `state/shared/path-ledger/active/<id>.jsonl` |
| `captureWorkingPath(pathId, {domain,goalType,outcome,score})` | promote a succeeded trajectory → `working-paths.jsonl` (atomic dedup under `exclusive-file-lock.mjs`, key=`domain::goalType::stepsHash`; negatives captured + flagged) |
| `findWorkingPaths(domain, goalType, {embed,query})` | retrieve proven paths — exact + **kNN over goal-embeddings** (acceleration) |
| `toExecutionPlan(workingPath)` | adapt → ordered ExecutionPlan for the autonomous executor |
| `emitLearningRow(workingPath)` | labeled row → india's OutcomeFeedbackBus (`outcome-bus.jsonl`) |
CLI: `node scripts/path-ledger.mjs {record|capture|find|replay|emit|list}`. Knob `PRISM_PATH_LEDGER_DISABLE=1`.

## Reuse (R8 — wires into the backbone, does NOT duplicate)
- **atomic store** → `scripts/lib/exclusive-file-lock.mjs` (O_EXCL lock, same session).
- **learning sink** → india's **OutcomeFeedbackBus** (`state/shared/outcome-bus.jsonl`); row schema mirrors `.claude/hooks/outcome-bus-auto-tap.mjs` so india's consumers parse it unchanged. *"Learning signal goes through india"* — no parallel learner.
- **autonomous replay** → `autonomousDispatcher` `auto_execute` consumes the ordered step plan (`ExecutionPlan`).
- **CAD working-path precedent** → delta `state/shared/cad-action-templates/*.actions.json` (already captured CAD action sequences) + `blueprintToAllCADsOrchestrator`.
- **CAM** → kilo `auto_print_to_program` + `AdaptiveToolpathRouterEngine`.
- Distinct from `rgs-plan-outcome.mjs` (per-roadmap-UNIT outcomes), loop-state/ATCS (session progress), wiki trajectories (prose) — none capture the **ordered (action,args) trajectory per (domain,goalType) as a replayable plan** (R8-confirmed by scrutiny arm B).

## Compound-learning across galaxies
The ledger is fleet-wide: every galaxy contributes + consumes proven paths; a proven CAD path informs
CAM (and vice-versa) via shared goal-embedding space → learning compounds *across* domains. The RULE
propagates via the feedback-memory → `stop-obsidian-memory-feed.mjs` → `knowledge/memories/feedback/`
→ `master-index-precheck-inject` recall (all galaxies see it on their next prompt).

## Acceleration
See [[PATHING-ACCELERATION-PLAN-2026-05-31]] (spec). Levers: kNN path-memoization (biggest), beam/
viterbi/A* optimal selection (`prism_algorithm` `ml_knn`/`ml_beam_search`/`ml_viterbi`), india retrain
loop, embed-model prewarm, cross-galaxy transfer, negative-path avoidance.

## Honesty / scope (R12)
`emitLearningRow` completes the **wire** (row on india's canonical bus); india's retrain *ingestion*
is india's downstream — coordinated, not assumed already-live. This milestone ships the fleet-wide
**foundation** (mechanism + learning-wire + propagation + acceleration plan); per-domain **executor
replay adoption** (delta CAD, kilo CAM) layers on the proven foundation (R13) — delta/kilo wire replay
into their own dispatchers in their slots.

## Tests
`scripts/lib/path-ledger.test.mjs` — 15 node:test (record/capture/dedup/find/kNN/toExecutionPlan/
outcome-bus-parity/fail-soft + a real-fs E2E chain). CLI E2E verified. Per-file 2-reviewer PASS.

Memory: [[feedback_plot_path_capture_working_path]]. India substrate: `mcp-server/src/engines/ai-training/CLAUDE.md`.
