---
name: reference_delta_xproc_outcome_publish_wired_2026_06_26
description: "VERIFIED xproc_outcome_publish IS wired (not doc-only); U-CAD-LEARN-LOOP-CLOSE real gap = cad loop doesn't emit publish"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.551Z
aliases: reference_delta_xproc_outcome_publish_wired_2026_06_26
---


**Verified finding (slot:delta, 2026-06-26, deep-search per the never-claim-absence rule):**
`xproc_outcome_publish` is **WIRED, not a doc-only phantom.** It lives at
`mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts:760` (+ case ~2949) -> `OutcomePublishAdapterEngine`
(`mcp-server/src/engines/OutcomePublishAdapterEngine.ts`, the CANONICAL domain-engine publish entry point
that wraps `CrossProcessOutcomeStore.record()`; exposes `publish()` / `publishWithActuals()` /
`publishFailure()` / `publishOverride()`, validates payloads against `OUTCOME_KINDS`). Siblings also wired:
`xproc_outcome_publish_{with_actuals,failure,override}`, `xproc_outcome_update`, `xproc_outcome_adapter_{stats,reset}`,
`xproc_outcome_record`. **The ~8 galaxy CLAUDE.md notes saying "xproc_outcome_publish NOT verified / do not
cite" are STALE** -- they predate the wiring. (academy/agent-orchestration/ai-training/backend-helper/
blueprint-vision CLAUDE.mds all carry the stale warning.)

**Consequence for U-CAD-LEARN-LOOP-CLOSE (roadmap premise CORRECTED, commit U-CAD-LEARN-LOOP-CLOSE-SCOPE):**
the roadmap said "xproc_outcome_publish is doc-only -- WIRE it" = FALSE. The cad-fix-ledger producer/consumer
arc is ALSO already built (`scripts/lib/cad-correction-to-fix-ledger.mjs` pure converter +
`cad-fix-ledger-to-training.mjs`). REAL GAP (grep-confirmed): nothing in the cad correction loop CALLS the
publish -- cad fixes land in the ledger but never EMIT an outcome to india's cross-process graph, so india's
retrain trigger never fires from cad fixes. UNIT = wire delta's correction-loop harvest point to
`outcomePublishAdapterEngine.publish()` with a valid `RecordEventInput` (`{domain:'cad', slot:'delta',
kind in OUTCOME_KINDS, ...}`) -- a CONSUMER call into india's already-wired adapter (do NOT modify india's
dispatcher). Contract-sensitive + needs india's loop running to validate end-to-end -> a deliberate
fresh-budget build, NOT a marathon-tail rush.

**LESSON (reinforced):** the "never claim absence without a deep search" rule caught me about to declare
xproc_outcome_publish a phantom from DOC references alone -- grepping the actual dispatcher .ts proved it
IS wired. Always grep code, not docs, for action existence; galaxy CLAUDE.md "not verified" notes rot.
Sibling: [[reference_delta_cad_boolean_gold_synth_2026_06_26]] · [[feedback_never_claim_absence_without_deep_search]].
