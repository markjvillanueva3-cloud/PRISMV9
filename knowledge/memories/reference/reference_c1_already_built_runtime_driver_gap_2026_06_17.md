---
name: reference_c1_already_built_runtime_driver_gap_2026_06_17
description: "The zulu C1 'Multi-Wave DAG Scheduler' was surfaced as a 'pending' build by the zulu-build-pointer, but the ENGINE (ZuluWaveSchedulerEngine) was ALREADY BUILT Jun 15 -- complete, wired to sessionDispatcher (schedule_wave: allWaves+computeWaveN+renders), 14.6KB test. R8 read-first caught the near-duplicate. Real remaining gap = the zulu RUNTIME DRIVER that autonomously decomposes a task -> allWaves/computeWaveN -> per-wave agent spawn (nothing live drives the callable engine)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.490Z
aliases: reference_c1_already_built_runtime_driver_gap_2026_06_17
---


# C1 multi-wave DAG scheduler was ALREADY BUILT -- the gap is the runtime driver (2026-06-17, slot:bravo)

## What happened
The zulu-build-pointer (`state/shared/zulu-build-loop-next.json`, surfaced every prompt
via `zulu-build-pointer-inject`) listed **C1 Dependency-Ordered Multi-Wave DAG Scheduler**
as the next GATED build ("pending (8): C1..C8"). My pass-1 + §9 Hermes assessment also
called it "encoded but never executed -- THE headline build." I started to build it.

R8 (read-before-write) revealed `sessionDispatcher.ts` already registers a **C1 action**
(`schedule_wave`) + a referenced `ZuluWaveSchedulerEngine`. Verifying the body:
**`mcp-server/src/engines/ZuluWaveSchedulerEngine.ts` (12KB, Jun 15) is COMPLETE + correct**:
`allWaves()` (Kahn level-walk topological wave partition + named cycle detection),
`computeWaveN(plan, completedIds)` (the incremental "execute wave_2+ after wave_1
completes" driver), structural validation, `renderPartition`/`renderNextWave`. Wired to
`sessionDispatcher` (4 actions). 14.6KB companion test. NOT a stub.

## The real state (R12)
- **ENGINE: BUILT + wired + tested.** ✅ C1's scheduler is done.
- **RUNTIME EXECUTION: dormant.** The `schedule_wave` action is *callable* via MCP, but
  grep found NO live zulu cron/loop/hook that DRIVES it -- nothing autonomously
  decomposes a parent task into a `SubtaskSchema` DAG, calls `allWaves`/`computeWaveN`,
  and spawns the per-wave Agent batches. The build-pointer's own C1 description ("Zulu
  automatically inspects and restarts fan-out waves from wave_1") is exactly that unbuilt
  RUNTIME DRIVER -- the actual remaining autonomous-building unit, NOT the scheduler engine.
- The zulu-build-pointer "C1 pending" is STALE; the Build-Loop cron should advance it to C2
  (flagged, not hand-edited -- single-writer file).

## Lesson
Before building a unit a "pending" pointer (or an older capability spec) names: **verify the
CURRENT live build-state -- the engine FILE + the dispatcher action enum/handler + the test
-- not the pointer.** Build-pointers + capability-candidate specs go STALE the moment a unit
ships without the pointer being refreshed. The dispatcher's action enum + the engine file on
disk are the ground truth; a "pending" label is a hint, not a fact. This is the
existence!=body / verify-before-claiming rule applied to MY OWN assessment + a fleet pointer.
Almost shipped a duplicate of ZuluWaveSchedulerEngine; R8 read-first + the dispatcher grep
caught it. Related: [[reference_dream_cycle_task_timeout_not_oom_fix_2026_06_17]] (sibling
verify-the-real-state correction this session), [[feedback_read_full_content_not_titles]].
