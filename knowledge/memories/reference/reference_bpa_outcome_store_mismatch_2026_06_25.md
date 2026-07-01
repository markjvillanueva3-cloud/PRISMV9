---
name: reference_bpa_outcome_store_mismatch_2026_06_25
description: India design finding (2026-06-25) -- blueprint outcome_record events should NOT route to xproc_outcome_record. CrossProcessOutcomeStore.record() VALIDATES process in {mill,lathe,wedm} (throws otherwise) + bridge in {sf,post,feature,ai,router}; a blueprint extraction is process-AGNOSTIC. The machining-outcome store is the wrong sink. The next-unit blueprint_loop_drain should dispatch the 4 general learning primitives + keep outcome_record ledger-only.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.482Z
aliases: reference_bpa_outcome_store_mismatch_2026_06_25
---


# Blueprint outcome_record vs CrossProcessOutcomeStore -- store mismatch (india 2026-06-25)

Surfaced while scoping prism_ai:blueprint_loop_drain (the closed-loop final arrow).
Read the REAL contract before building the adapter -- and it revealed a semantic mismatch.

## The finding (verified at the engine)
`CrossProcessOutcomeStore.record(input)` (`mcp-server/src/engines/CrossProcessOutcomeStore.ts`)
HARD-VALIDATES (throws on miss):
- `input.bridge in OUTCOME_BRIDGES = ["sf","post","feature","ai","router"]` (line ~230)
- `input.process in OUTCOME_PROCESSES = ["mill","lathe","wedm"]` (line ~235)

A blueprint/print extraction is **process-AGNOSTIC** -- a drawing isn't inherently
mill/lathe/wedm. So a blueprint `outcome_record` cannot supply a legal `process`
without FABRICATING one, which would pollute the machining-outcome store with
non-machining records. The store is designed for machining-process outcomes
(SFC/post/feature/CAM bridges), NOT OCR/extraction-accuracy outcomes.

## Decision for blueprint_loop_drain (the next unit) -- confidence ~0.75
1. **Dispatch the 4 GENERAL cross-process learning primitives** via routeXprocAction:
   `xproc_drift_observe` / `xproc_replay_add` / `xproc_ewc_consolidate` /
   `xproc_predlog_pair`. These are process-agnostic learning signals (drift/replay/
   EWC/conformal-pairing) and apply cleanly -- verified wired in aiReasoningDispatcher.
2. **Keep outcome_record LEDGER-ONLY (do NOT route to xproc_outcome_record).** The
   blueprint ground-truth value is already durably captured in
   `state/shared/blueprint-accuracy-events.jsonl` + the GroundTruth/extraction-accuracy
   surface. Routing it into the mill/lathe/wedm machining store is a category error.
   Follow-up (optional): a dedicated blueprint-outcome learning sink if wanted.

## Bearing on the P1 fix already shipped
U-BPA-LOOP-DRAIN-CORE retargeted EVENT_TO_XPROC_ACTION.outcome_record from the
id-requiring `xproc_outcome_record_outcome` to the create `xproc_outcome_record`
([[reference_bpa_loop_drain_core_2026_06_25]]). That was a correct improvement (the
_outcome variant was unambiguously wrong), AND it stays correct even under this
decision -- because the drain simply WON'T dispatch outcome_record to that action;
the map value is now at least sane for any other caller. The deeper store-mismatch
is a SEPARATE, dispatcher-unit concern, resolved by decision #2 above.

## Lesson
Before wiring a producer into a shared store/dispatcher, read the store's
VALIDATION (not just its method name): a cross-process outcome store that validates
`process in {mill,lathe,wedm}` is the wrong sink for an upstream, process-agnostic
signal. Match the signal's domain to the sink's accepted domain.
Sibling: [[reference_bpa_loop_drain_core_2026_06_25]] · [[closed-loop-action-map-create-vs-update]].
