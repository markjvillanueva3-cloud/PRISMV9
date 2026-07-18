---
name: reference_engacc_record_wire_2026_06_25
description: India shipped U-WIRE-ENGACC-RECORD (c4132c3057, 2026-06-25) -- wired the WRITE side of the cross-engine accuracy tracker. EngineAccuracyTrackerEngine had 7 READ actions in prism_dev but recordOutcome was wired NOWHERE (explicitly deferred), so the tracker stayed empty + every read returned no data. Added engine_acc_record action. 3rd open-loop closure this session.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.567Z
aliases: reference_engacc_record_wire_2026_06_25
---


# U-WIRE-ENGACC-RECORD -- india 2026-06-25 (c4132c3057)

## The gap (open-loop scan, R8-verified)
`EngineAccuracyTrackerEngine` (MILL-AGI-P0 meta-learning loop -- tracks predicted-vs-actual
across ALL engines) is wired in `prism_dev` (devDispatcher) with 7 READ actions
(engine_acc_report/engine/metric/degrading/list/stats). But `recordOutcome` -- the WRITE/
feedback side -- was wired NOWHERE (0 callers anywhere in src). The original wirer
(WIRE-UNWIRED-MS0/U-WIRE-ENGACC) EXPLICITLY DEFERRED it (test header line 14: "recordOutcome/
clear DEFERRED"). So the tracker's in-memory `outcomes[]` stayed permanently empty and every
read action returned no data -- a frozen accuracy loop with the feedback arrow missing.

## Closure (NOT WIRE-EXEMPT -> dispatcher action is correct)
Contrast the consensus-perf unit ([[reference_consensus_perf_persist_2026_06_25]]) which IS
wire-exempt (in-process closure). This engine ALREADY has a full dispatcher surface, so the
correct closure is a dispatcher action:
- enum `engine_acc_record` (devDispatcher ACTIONS, consumed by z.enum at :799),
- Zod schema (engine_id|engineId + metric_name|metricName + finite predicted + finite actual
  + optional unit/context; refine matches the engine_acc_metric idiom),
- case calling `recordOutcome(engineId, metricName, predicted, actual, unit?, context?)` with
  pre-validation + clean {error} envelope.
25/25 (+5 R9: schema incl NaN/Infinity reject, **CLOSES-THE-LOOP round-trip** -- record THROUGH
the wire then read back via engine_acc_engine -> totalOutcomes===1, accumulation, camelCase
parity, error-envelope-records-nothing). tsc clean (0 errors total). 2-arm scrutiny PASS.

## Lesson (compounding)
The open-loop scan keeps finding REAL frozen loops -- this session: blueprint drain,
consensus-perf (wire-exempt/in-process), engine-acc (dispatcher action). The CLOSURE SHAPE
depends on the engine's design: WIRE-EXEMPT -> in-process method the owner calls; full
dispatcher surface -> a dispatcher write action. Always read the engine header + check how the
READ side is wired before choosing. A deferred-write-side ("DEFERRED" in the wirer's note) is a
reliable frozen-loop signal.
Siblings: [[reference_consensus_perf_persist_2026_06_25]] · [[reference_open_learning_loops_backlog_2026_06_22]] · [[feedback_dispatcher_path_green_not_engine_green]].
