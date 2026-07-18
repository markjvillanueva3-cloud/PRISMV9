# BLUEPRINT-VISION-OCR/U-XRAY-NEEDS-CONFIRM-HALLUCINATION — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-NEEDS-CONFIRM-HALLUCINATION (slot:xray): fix the confidence gate -- a single-model (hallucination_candidate) dim must reach the operator gate regardless of self-confidence

**Commit:** `7bcd73ab954b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T22:48:05-05:00
**Tags:** blueprint-vision-ocr, u-xray-needs-confirm-hallucination, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-NEEDS-CONFIRM-HALLUCINATION (slot:xray): fix the confidence gate -- a single-model (hallucination_candidate) dim must reach the operator gate regardless of self-confidence

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-NEEDS-CONFIRM-HALLUCINATION (slot:xray): fix the confidence gate -- a single-model (hallucination_candidate) dim must reach the operator gate regardless of self-confidence

Found by R15-VALIDATE on a LIVE JM electrode print: 38 of 40 extracted dims were single-model
(hallucination_candidate:true) yet ALL passed as needs_confirm:false -- normalizeFusedToContract gated
needs_confirm on the 0.70 confidence floor ALONE, and a singleton's agreement_confidence is a DEFAULT
self-score (~0.9), NOT cross-model corroboration. The ensemble's low-trust signal was collected but INERT
(the router computes the operator-review count from needs_confirm only, never hallucination_candidate),
so the doctrine "single-model dims are flagged FOR THE OPERATOR GATE" was unmet -- the flag never reached it.

Fix: needs_confirm = confidence < floor || hallucination_candidate, for BOTH the dimension + callout maps
of normalizeFusedToContract. Monotonic/safe-direction (only ADDS gating, never un-gates). Geometry
normalizer unchanged (deterministic parse sets hallucination_candidate:false -> OR-clause inert). Schema
.describe() + JSDoc updated (R12 doc/code consistency).

Consumer blast radius verified SAFE (arm-B trace): blueprintExtractionRouter ROUTES + ANNOTATES
(requires_confirmation/blocking_fields/n_blocked_on_confirm) -- never REFUSES; eligibility keys on field
PRESENCE not confirm state. A mostly-single-model extraction now surfaces "operator-confirm before
quote/program/inspection" instead of silently auto-routing as confirmed. No web/UI consumer reads it.

154 green across the contract surface (contract 31 incl 4 NEW R9 locks failing on a floor-only revert +
router 19 + route 23 + 81 downstream); 1 existing test corrected (isolated the floor re-threshold onto a
non-halluc dim -- honest intent-fix). tsc-clean. Both per-file 2-arm scrutiny PASS.
```

## Files touched (3)
- mcp-server/src/__tests__/BlueprintExtractionContract.test.ts | 49 +++++++++++++++++++++++++++++++++++++++++++++----
- mcp-server/src/schemas/BlueprintExtractionContract.ts        | 27 ++++++++++++++++++---------
- 2 files changed, 63 insertions(+), 13 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7bcd73ab954b`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._