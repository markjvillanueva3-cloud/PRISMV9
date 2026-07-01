---
title: Closed-loop action map must target the CREATE action, not the id-requiring UPDATE variant
type: code-tribal
domain: cad-learning-ai
slot: india
unit: U-BPA-LOOP-DRAIN-CORE
commit: da9f7cc3cd
date: 2026-06-25
tags: [closed-loop, xproc, dispatch, action-map, R9, R12]
---

# Closed-loop action map: create vs update

## Symptom (latent)
The blueprint closed-loop maps `outcome_record` events to an xproc dispatch via
`EVENT_TO_XPROC_ACTION`. The map pointed `outcome_record` at
`xproc_outcome_record_outcome`. That dispatcher action
(`aiReasoningDispatcher.ts:918`) is `recordOutcome(id, outcome)` and throws
`requires id`. But every `outcome_record` producer emits NO `id` (the canonical
writer emits `extraction_id`; the hook emits `{kind, feature_id}`). So the moment
a live drainer dispatched, the loop's highest-value signal (operator-confirmed
ground truth) would fail 100% -- dormant only because the drainer ran against
mocks/dry-run.

## Why it survived
The only constants test asserted `EVENT_TO_XPROC_ACTION[t].startsWith("xproc_")`
-- which a wrong-but-well-named action passes. The mismatch is between the action
NAME and the engine method it routes to (create vs update), invisible to a prefix
check.

## Fix
Retarget to the CREATE action `xproc_outcome_record` (`aiReasoningDispatcher.ts:904`,
`crossProcessOutcomeStore.record(...)` -> returns a new id, no id required) -- the
action the hook's own pre-computed `payload.dispatch` already names. Added an R9
lock asserting the exact action (`=== "xproc_outcome_record"`,
`!== "xproc_outcome_record_outcome"`), not just the prefix.

## Lesson (reusable)
When an event->action map drives a real dispatch, lock the EXACT action name and
match it to the engine method's CONTRACT: a "record/create" event must route to
the create action (mints an id), not the "update-by-id" variant (which throws
without an id the producers never emit). A `startsWith("xproc_")`-style test is
too shallow -- it green-lights a 100%-fail mapping. Verify the target action's
required params against what every producer actually emits.

Siblings: [[blueprint-consumer-hook-shared-state-collision]],
[[reference_bpa_loop_drain_core_2026_06_25]].
