---
name: reference_post_ship_hermes-c1-exec-u-next-wave-assignments
description: Auto-distilled learnings from shipping HERMES-C1-EXEC/U-NEXT-WAVE-ASSIGNMENTS (commit 1182b1c97). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.885Z
aliases: reference_post_ship_hermes-c1-exec-u-next-wave-assignments
---


# HERMES-C1-EXEC/U-NEXT-WAVE-ASSIGNMENTS

[MAIN-FORCE] [HERMES-C1-EXEC]/U-NEXT-WAVE-ASSIGNMENTS (slot:bravo): the executable-wave bridge -- ZuluWaveSchedulerEngine.nextWaveAssignments(req, completedIds) returns the next wave as dispatchable SLOT ASSIGNMENTS (not just ids), the missing piece that makes wave_2+ EXECUTABLE (plan() only ever assigned wave-1 leaves). Extracted shared assignSubtasksToSlots policy (DRY, behavior-preserving -- 27 planner tests green). Wired sessionDispatcher next_wave_execute + wave_exec_render. 71/71 tests (12 new: multi-wave progression, done, overflow-not-dropped, unrouted, domain-match, cycle-stall, throw, incremental==allWaves). No new tsc. The pure planning core the autonomous runtime driver loops on (the agent-SPAWNING loop is governance-gated per soul, separate).

**Shipped:** 2026-06-17T19:26:49-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[hermes-c1-exec-u-next-wave-assignments]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._