---
name: reference_c1_executable_wave_bridge_2026_06_17
description: "Built the C1 executable-wave bridge ZuluWaveSchedulerEngine.nextWaveAssignments(req, completedIds) -- returns the NEXT wave as dispatchable SLOT ASSIGNMENTS (not just ready ids), the missing piece that makes wave_2+ executable since the planner's plan() only ever assigned wave-1 leaves. Extracted a shared assignSubtasksToSlots policy (DRY, behavior-preserving). Wired sessionDispatcher next_wave_execute/wave_exec_render. The autonomous agent-SPAWNING loop on top is governance-gated (fleet-control)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.490Z
aliases: reference_c1_executable_wave_bridge_2026_06_17
---


# C1 executable-wave bridge: nextWaveAssignments (2026-06-17, slot:bravo)

## What was the gap
The C1 multi-wave DAG SCHEDULER engine (`ZuluWaveSchedulerEngine`) was already built
(allWaves topological partition + computeWaveN incremental driver + cycle detection),
but two assignment gaps remained: `HermesParallelFanoutPlannerEngine.plan()` only ever
assigned the WAVE-1 leaves to slots, and `computeWaveN` returned the ready *ids* for any
wave but NO slot assignments. So there was no single call that answered "given completed
=[X,Y], WHO runs the next wave?" -- wave_2+ was schedulable but not DISPATCHABLE.

## What was built (commit U-NEXT-WAVE-ASSIGNMENTS)
- **`assignSubtasksToSlots(toAssign, candidates, maxParallel)`** -- exported pure helper in
  `HermesParallelFanoutPlannerEngine.ts`, extracted from plan()'s inline assignment loop
  (behavior-preserving; the existing 27 planner tests guard it; arm-B fuzzed 2000 configs
  -> provably equivalent). Returns `{assignments, unrouted, overflow}`. One policy, one place (DRY).
- **`ZuluWaveSchedulerEngine.nextWaveAssignments(req: FanoutPlanRequest, completedIds)`** ->
  `WaveExecution {parent_task_id, wave_assignments, overflow, unrouted, blocked, done}`. Bridges
  computeWaveN (which ids ready) with assignSubtasksToSlots (who runs each). Slots reused across
  waves, distinct within a wave. A STALL (all of assignments/overflow/unrouted empty + blocked
  non-empty + !done) signals a cycle -> caller escalates to allWaves for the named error.
  Plus `renderWaveExecution`.
- **Dispatcher:** `sessionDispatcher` actions `next_wave_execute` + `wave_exec_render` (same
  lazy-import + `params as {...:never}` convention as the sibling C1 actions; engine Zod-validates
  at its boundary -- no schema entry needed, matching schedule_wave/compute_wave_n which also
  have none, and validateActionParams passes through missing-schema actions).
- 71/71 tests (27 planner + 44 scheduler, 12 new), no new tsc errors, 3-of-3 PASS (no findings).

## The driver loop (how a runtime consumes it)
call nextWaveAssignments(req, []) -> spawn the wave_assignments Agent batch -> on completion
call again with the cumulative completed ids -> repeat until `done`. Pure + deterministic; the
ENGINE is the planning core, the actual agent-spawning is the consumer.

## Governance boundary (R12 / soul)
The pure planning core is SAFE and built. The AUTONOMOUS agent-spawning loop on top (a cron /
Workflow that actually spawns the per-wave agents across slots without a human) is FLEET-CONTROL
-> blocked by the bravo soul's `unsafe-fleet-control-before-governance` refuse +
HERMES-FULL-ASSESSMENT sec4 blocker 4. Build governance (veto ceiling, control-path auth) FIRST,
then the autonomous spawner can loop on this proven core. Maps to the 3 operator articles' A2
step-11 (dynamic workflows) EXECUTION layer. Related:
[[reference_c1_already_built_runtime_driver_gap_2026_06_17]].
