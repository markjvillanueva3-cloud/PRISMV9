---
name: reference_bpa_loop_drain_core_2026_06_25
description: India shipped U-BPA-LOOP-DRAIN-CORE (da9f7cc3cd, 2026-06-25) -- the injectable pure core (scripts/lib/blueprint-loop-drain-lib.mjs) that turns the blueprint-accuracy consumer's plan into xproc_* dispatches, the foundation for the next-fire prism_ai:blueprint_loop_drain. Plus a verified P1 fix: EVENT_TO_XPROC_ACTION.outcome_record targeted xproc_outcome_record_outcome (THROWS without an id no producer emits) -> retargeted to the create action xproc_outcome_record.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.481Z
aliases: reference_bpa_loop_drain_core_2026_06_25
---


# U-BPA-LOOP-DRAIN-CORE -- india 2026-06-25 (da9f7cc3cd)

## What shipped
The blueprint-accuracy consumer is PRINT-ONLY -- it computes an xproc_* action
plan but nothing routes it through prism_ai, so predictions->outcomes->RETRAIN
never closes its final arrow (a hook/script cannot call an MCP dispatcher).
Built the verifiable CORE first (R13), deferring the fragile dispatcher edit:

- `scripts/lib/blueprint-loop-drain-lib.mjs` (NEW):
  - `resolveDispatch(planAction)` -> `{action, params}`. action from the plan's
    xproc_action / EVENT_TO_XPROC_ACTION; params prefer the hook-precomputed
    `payload.dispatch.params`, else the raw payload, else `{}` (array/null-safe).
  - `drainEvents({tailBlob, priorState, dispatch, dryRun, ...})` -> parses +
    applyEvents + routes each action via an INJECTED async `dispatch` fn.
    FAIL-SOFT PER ACTION (one throw is recorded, never aborts the rest);
    at-most-once (the offset advance is the CALLER's job, so a failed dispatch
    is not re-run -- re-running would re-dispatch every already-successful action).
- Wired into the consumer CLI as an additive `--dispatch-plan` mode (emits the
  machine-consumable resolved plan); default path byte-unchanged.
- The next-fire `prism_ai:blueprint_loop_drain` dispatcher injects a REAL
  in-process `routeXprocAction` into `drainEvents` (the fragile xproc switch --
  see the hazard note in the handoff/sibling memo).

14/14 drain-core (R9) + 44/44 consumer-lib; LIVE: 145 events -> 146 resolved
dispatches with real params; default mode emits 0 plan lines.

## P1 fix (surfaced by arm-C scrutiny -- verified, not assumed)
`EVENT_TO_XPROC_ACTION.outcome_record` pointed at `xproc_outcome_record_outcome`
-- but that dispatcher action (`aiReasoningDispatcher:918`) is
`recordOutcome(id, outcome)` and THROWS `requires id` without one. EVERY
outcome_record producer emits NO id (the writer emits `extraction_id`; the hook
emits `{kind, feature_id}`). So once the live drainer dispatched, the loop's
HIGHEST-VALUE signal (operator-confirmed ground truth) would fail-soft 100%.
Retargeted to the CREATE action `xproc_outcome_record` (`aiReasoningDispatcher:904`,
`crossProcessOutcomeStore.record` -> new id, no id required) -- which the hook's
own pre-computed dispatch already names. +1 R9 lock.

## Lesson
A closed-loop action map must target the CREATE action, not the id-requiring
UPDATE variant, when the producers emit no id. An action-NAME that merely
"starts with xproc_" passes a shallow constants test while being 100% wrong at
dispatch time -- lock the exact action name, not just the prefix.

## Residual / next unit
- The rag_extraction outcome payload ({kind, extraction_id, ...}) still does not
  match `crossProcessOutcomeStore.record`'s contract ({bridge, process,
  request_summary, ...}) -- the dispatcher action (next unit) must ADAPT the
  payload before dispatch. Documented, not yet built.
- Deferred P2s: a `skippedNoAction` counter test (latent until a direct caller
  feeds a hand-built plan); `dispatchedOk` conflates resolved-vs-really-dispatched
  on a no-dispatch-fn run.
Sibling: [[reference_bpa_consumer_state_isolate_2026_06_24]] (the idempotency fix this builds on).
