---
name: reference-nn-graph-ms2-u2-2026-05-17
description: NN-GRAPH-MS2 U2 — self-retrain lifecycle scheduled task. Autonomous fingerprint→drift→train-candidate→eval→promote-on-gate-pass-only. Makes retraining autonomous, NOT the GNN deploy-ready. Shipped 2026-05-17 slot alpha.
source: prism-memory
synced: 2026-05-18T01:02:09.583Z
aliases: reference_nn_graph_ms2_u2_2026_05_17
---


# NN-GRAPH-MS2 / U2-SELF-RETRAIN-LIFECYCLE (2026-05-17, slot alpha)

Commit this session. The autonomous **retrain** half of the GNN tier-5 stack —
pairs with U1 (which auto-seeds the reference pool on every regen-viz run).

## What shipped (3 files)
- `scripts/nn-graph-retrain-lifecycle.mjs` — the orchestrator.
- `.claude/helpers/install-nn-graph-retrain-task.ps1` — S4U scheduled-task
  installer, 6-hour cadence, near-mirror of `install-fleet-reaper-task.ps1`.
- `scripts/__tests__/nn-graph-retrain-lifecycle.test.mjs` — 49 `node:test` cases.

## The lifecycle (one scheduled poll)
fingerprint system-viz graph → `driftDecision` vs a baseline sidecar
(`retrain-baseline.json`) → no drift = cheap no-op SKIP → on drift, spawn
`graphsage-train-pipeline.mjs --out <candidate> --graph <path> --node-type-field
layer --neg-p-hard 0.7` (live checkpoint NEVER touched by training) → eval the
candidate via `runAssessment({checkpoint})` → **promote candidate→live ONLY when
every gate clears** (atomic rename; prior live kept as `.prev`) → advisory JSONL
ledger row.

## THE SAFETY INVARIANT (load-bearing)
`promoteDecision()` returns `promote:true` IFF `assessment.deferred === false &&
assessment.grade.pass === true` (strict booleans). Deferred (insufficient
reference pool), missing grade, sub-gate grade, non-boolean pass → `promote:false`.
A model below the NN-GRAPH gates (AUROC≥0.78 / macroF1≥0.55 / Brier≤0.15) can
never replace a good live checkpoint.

## Design
Pure decision fns (`graphFingerprint` / `driftDecision` / `promoteDecision` —
I/O-free, defensive, reference-tested) + fail-soft injected-deps shell
(`runLifecycle` NEVER throws; failures surface in `result.errors` + a non-zero
exit). A PID lockfile (`retrain.lock`, stale-reclaim by `process.kill(pid,0)`
liveness) serializes overlapping runs (scheduled task racing a manual `--force`)
so the shared candidate path cannot corrupt; `runLifecycle` wraps its body in
`try/finally` → lock released on every exit path. Baseline advances on every
successful retrain *attempt* (deterministic trainer — re-running an unchanged
graph reproduces the identical candidate), NOT on train-failure, NOT in dry-run.

## SCOPE HONESTY — necessary but NOT sufficient (R12)
U2 makes *retraining* autonomous. It does **NOT** make the GNN deploy-ready. The
model-side gate (AUROC≥0.78 vs current 0.096 heterophily anti-correlation) is
untouched. The lifecycle will faithfully **decline to promote** every sub-gate
candidate until a model-side unit (768-d features / improved negative sampling —
a separate unit) lands. That is *correct behavior*, not a gap: U2 is the
mechanism that auto-promotes the first good checkpoint whenever one is produced.
Do NOT read U2 as "the GNN is now autonomous."

## Per-file scrutiny (6 reviewer agents, all PASS)
- Orchestrator: 2 rounds (FAIL→fix→PASS). Round-1 fixes: PID lockfile for
  overlapping-run safety; `defaultTrain` SIGKILL surfacing (same class as the
  regen-viz silent-SIGKILL regression); `--graph` passthrough so fingerprint→
  train→eval see one consistent graph.
- Test suite: 2 reviewers PASS. The 2 flagged items (stale-lock-reclaim path,
  ledger rotation) ruled **correctly P3** by the independent reviewer — the
  injectable seam (`acquireLock`/`appendLedger` opts) is the tested contract.
- Installer: 2 reviewers PASS; 1 P1 fixed (`-RunNow` poll deadline → a
  `RunNowTimeoutMinutes` param under the 30-min ExecutionTimeLimit).

## The real-wiring test (the "hermetic fakes" oracle)
Reviewer B raised "does eval grade the candidate or the live checkpoint?" —
verified FALSE (`nn-graph-eval.mjs:335` `opts.checkpoint || default`), AND the
test suite proves it: one test drives the REAL `runAssessment` with a
`readFileImpl` spy + tiny injected graph, asserting the exact checkpoint path
flows through. The lesson class: a pure-core + injected-readers design MUST ship
≥1 test exercising the real boundary the fakes assume. Same as
[[reference_rgs_tool_autoinvoke_ms1_2026_05_16]] and
[[reference_fleet_reaper_tier1_2026_05_17]].

## Knobs
`PRISM_NN_RETRAIN_{DISABLE, DRY_RUN, MIN_NODE_DELTA_PCT, MIN_EDGE_DELTA_PCT,
MIN_GHOST_DELTA_PCT, MAX_AGE_HOURS}`. Activate the scheduled task with one
elevated run: `powershell -File
.claude/helpers/install-nn-graph-retrain-task.ps1 -RunNow`.

## P3 follow-ups (deferred, not this unit)
- Direct tests of `defaultAcquireLock` stale-reclaim + `defaultAppendLedger`
  512KB rotation (internal default impls; the injectable seam is tested).
- A model-side unit to actually lift AUROC above the 0.78 gate.

Related: [[reference_nn_graph_ms2_u1_2026_05_17]] (the data-side half) ·
[[reference_u_nng_pipeline_stratified_wire_2026_05_17]] (MS1 stratified wire) ·
[[reference_fleet_reaper_tier1_2026_05_17]] (the S4U scheduled-task pattern U2
reuses).


## Related
[[skills/nn-graph-retrain-lifecycle|/nn-graph-retrain-lifecycle]] • [[skills/helpers|/helpers]] • [[skills/install-nn-graph-retrain-task|/install-nn-graph-retrain-task]] • [[skills/finally|/finally]]