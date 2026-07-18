---
name: reference_bpa_loop_drain_dispatch_2026_06_25
description: India shipped U-BPA-LOOP-DRAIN-DISPATCH (1f7d03f33d, 2026-06-25) -- the LIVE final arrow of the blueprint closed loop. New prism_ai:blueprint_loop_drain action routes the accuracy-ledger drain (4 general learning primitives) through routeXprocAction in-process; outcome_record is SKIPPED (process-agnostic, ledger-only). Closes predictions->outcomes->retrain on the dispatcher path. 2-arm scrutiny PASS (0 findings).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.481Z
aliases: reference_bpa_loop_drain_dispatch_2026_06_25
---


# U-BPA-LOOP-DRAIN-DISPATCH -- india 2026-06-25 (1f7d03f33d)

## The final arrow (closed loop is now end-to-end)
The blueprint-accuracy consumer was print-only; nothing routed its xproc_* plan
through prism_ai. This action is the LIVE drain:

`prism_ai:blueprint_loop_drain` (new INDIA_AI_ORPHAN unit 8):
- reads `blueprint-accuracy-events.jsonl` past the consumer's ISOLATED offset
  (`blueprint-accuracy-consumer-state.json`, the U-BPA-CONSUMER-STATE-ISOLATE file),
- routes the 4 GENERAL cross-process learning primitives in-process via
  `routeXprocAction` (xproc_drift_observe / replay_add / ewc_consolidate / predlog_pair),
- SKIPS outcome_record (skipActions=["xproc_outcome_record","xproc_outcome_record_outcome"])
  -- CrossProcessOutcomeStore.record validates process in {mill,lathe,wedm}; a blueprint
  extraction is process-agnostic, so its ground truth stays ledger-only
  ([[reference_bpa_outcome_store_mismatch_2026_06_25]]),
- advances + atomically writes the offset (idempotent); `dryRun` = plan-only.

## Build facts (for the next builder)
- Action registered in BOTH `INDIA_AI_ORPHAN_ACTIONS` + `INDIA_AI_ORPHAN_SCHEMAS`
  (permissive outer schema; the case owns validation). The Record<IndiaAIOrphanAction,...>
  type forces schema coverage at compile time.
- The body-carrying `case` is at aiReasoningDispatcher ~5035, in the body-carrying
  region (right after knowledge_ingestion_pending) -- NOT in either bare-fall-through
  xproc block (~2840-2954 / ~3127-3174). Confirmed clean by 2-arm scrutiny (the
  2026-06-20 U-XPROC-FALLTHROUGH-RESTORE regression class was NOT reintroduced).
- Repo-root anchor: `resolve(dispatcherDir,"..","..","..")` = mcp-server (both dist
  and src/tsx), then `".."` = repo root where scripts/ + state/ live -- mirrors the
  cadDispatcher recordOutcome idiom.
- The drain core (`scripts/lib/blueprint-loop-drain-lib.mjs`) gained `skipActions`
  (Set) + a `dispatchedSkipped` counter so the summary never overstates real
  dispatches (skipped != dispatchedOk; R12 honest counts).

## Validate (R15)
17/17 drain-core (R9) + 44/44 consumer-lib + 2/2 dispatcher round-trip (through
`executeAIReasoningAction`, hermetic temp fixture: dryRun-plan-only + skip-policy +
idempotent re-run). tsc clean on changed files (the 2 repo tsc errors are pre-existing
in lima's ReinforcementLearningCAMFeedbackEngine, untouched). LIVE ledger: 145
outcome_records skipped, 1 ewc routed, re-run processes 0 (idempotent). 2-arm
per-file scrutiny PASS, 0 P0/P1/P2.

## Series (the whole blueprint closed-loop arc, this session)
U-BPA-CONSUMER-STATE-ISOLATE (idempotent consumer) -> U-BPA-LOOP-DRAIN-CORE (injectable
core + outcome_record P1) -> U-BPA-DRAIN-NOOP-COUNT (honest noop counter) ->
U-BPA-LOOP-DRAIN-DISPATCH (this -- the live arrow). Next: register a cron/scheduler to
call blueprint_loop_drain on a cadence (golf/operator-gated under the migration freeze).
Siblings: [[reference_bpa_loop_drain_core_2026_06_25]] · [[reference_bpa_consumer_state_isolate_2026_06_24]] · [[reference_bpa_outcome_store_mismatch_2026_06_25]].
