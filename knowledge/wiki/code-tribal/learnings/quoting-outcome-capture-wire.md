---
title: Quoting outcome-capture wire (a "feed" is not a "loop"; validate vs the REAL bus)
type: code-tribal
tags: [quoting, charlie, outcome-capture-bus, learning-loop, p0-u04, numeric_features, r12, r15]
created: 2026-06-27
by: claude-charlie
unit: U-CHARLIE-QUOTING-OUTCOME-WIRE
commits: [ad80b50d24, 505d95709c, 8a0d64a6bc]
---

# Quoting outcome-capture wire

## What shipped
`QuotingOutcomeCaptureWireEngine` (clone of `SFCOutcomeCaptureWireEngine`) maps each
`QuoteOutcomeRecord` observed by the quoting closed loop to an
`outcomeCaptureBusEngine.record({domain:'quote', kind})` event
(`quote_accepted`/`quote_rejected`/`quote_vs_actual`/`recommendation_emitted`,
`lineage_id = quote_id`). Wired into `QuotingClosedLoopRunnerEngine.buildLiveDeps.fetchOutcomes`
(opt-out `emitToCaptureBus:false`, DI `captureWire`). The P0-U04
`OutcomeCaptureBusToFeedbackBridgeEngine` then forwards `domain:'quote'` events to india's
`CrossProcessNeuralLearningEngine` + drift/calibration consumers.

## Lessons (transferable)

1. **A "feed" is not a "loop."** Quoting *looked* closed — it ran a full self-contained
   OODA loop (observe -> accuracy -> calibration -> promote) — but it emitted NOTHING to the
   bus the learner consumes. Always trace producer -> consumer connectivity ("does this domain
   EMIT to the bus the learner subscribes to?"), not just "does it have a closed loop." The
   producer was the genuinely-missing half; every domain (speed_feed/post_processor/cad) ships
   its own `*OutcomeCaptureWireEngine`, and quoting had none.

2. **A mock bus hides real schema rejection — validate against the REAL bus on live data (R15).**
   The fake-bus unit tests all PASSED, but the real `outcomeCaptureBusEngine` REJECTED every event.
   Root cause: `numeric_features` enforces a CLOSED machining-physics key allowlist
   (`tool_diameter_mm, depth_of_cut_mm, workpiece_thickness_mm, target_ra_um, spindle_rpm,
   feed_rate_mm_min, cutting_speed_m_min` — see `outcomeEventSchema.ts` `NumericFeaturesSchema.superRefine`).
   A USD key (`predicted_quote_usd`) fails the `superRefine` and the WHOLE event is dropped.
   Fix: non-physics numerics ride on the free-form `recommended`/`actual`/`delta` fields, never
   `numeric_features`. A unit test with a mock can never catch this — only a real-bus round-trip can.

3. **Doc claims must be code-verified (R12).** quoting CLAUDE.md/MEMORY/TOOLBELT/OPEN-THREADS all
   documented `xproc_outcome_publish {slot:'charlie'}` as the india mechanism. The action exists
   (`aiReasoningDispatcher`) but quoting never called it — doc-only, never wired. Corrected all four docs.

## Status (R12)
PRODUCER live + validated (quote outcomes persist to `state/outcomes/quote.jsonl`). The P0-U04
CONSUMER bridge is NOT yet on `cad-fusion-live-ms0` (it merges from india's branch); until then
quote outcomes accumulate in the bus shard but do not yet reach the learner. Full loop-closure
completes with zero further quoting work on that merge.

See: [[reference_charlie_quoting_outcome_wire_2026_06_27]] · sibling [[reference_close_loop_bridge_p0u04_2026_06_02]].
