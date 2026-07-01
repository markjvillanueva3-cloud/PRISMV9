# BLUEPRINT-VISION-OCR/U-APP-REDACT-WIRE — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-APP-REDACT-WIRE (slot:xray): make the tested blueprintRedaction lib reachable -- wire prism_cad:blueprint_redact + close a P1 customer-name-in-KEY leak

**Commit:** `62c20067d155` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T10:53:59-05:00
**Tags:** blueprint-vision-ocr, u-app-redact-wire, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-APP-REDACT-WIRE (slot:xray): make the tested blueprintRedaction lib reachable -- wire prism_cad:blueprint_redact + close a P1 customer-name-in-KEY leak

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-APP-REDACT-WIRE (slot:xray): make the tested blueprintRedaction lib reachable -- wire prism_cad:blueprint_redact + close a P1 customer-name-in-KEY leak

The shared blueprintRedaction.ts (U-APP-REDACT-LIB) was tested but UNREACHABLE -- no dispatcher/app surface consumed it (R12: do-not-claim-shipped until wired). Wires it as cadDispatcher action `blueprint_redact` (the blueprint-vision primary surface), exposing all three contract fns: redactText (distinctive free-text scrub), redactExtraction (structured field-mask, the SAFE app path), redactionRegions (title-block image bbox). Inline param-guard matches the blueprint_lora_*/rag_* sibling convention (the whole blueprint_* family validates inline -- no per-action Zod schema; that gap is family-wide [SCOPED] follow-up, not this unit).

Per-file 2-arm scrutiny PASS (no P0/P1 on the wire). A focused independent re-review of the lib then caught a real P1: redactExtraction.walk scrubbed string VALUES but copied object KEYS verbatim, so a per-customer map `{ "ITW SHAKEPROOF": {...} }` round-tripped the identity in the key; worse, the first key-scrub fix used the DISTINCTIVE tier (skips short acronyms ATF / common words ACME/PARKER) -- 29/117 JM customers still leaked as bare keys. Closed both: a whole-key EXACT match against the full 117-name registry (any tier) masks the bare-customer-name key wholesale; longer keys embedding a distinctive name still get the distinctive scrub; collision-suffix keeps both values when two customer keys mask to the same token (no silent data loss); ordinary field-name keys (customer/material/notes) never match a customer-NAME pattern so are untouched (no over-redaction). Value path byte-unchanged (isIdentityKey still receives the original key).

Privacy-critical: a false negative leaks a JM customer identity on an exported/shared drawing. 62/62 tests (30 lib incl. 5 new key-leak/short-acronym/collision + 22 BlueprintLoRABridge no-regression + 10 round-trip wire incl. adversarial key-leak), tsc clean on all touched files.

[SCOPED] follow-on (quebec/charlie): the "export anonymized" drawing render + blueprint_to_quote redaction CONSUME this action -- their surfaces, not xray's. Zod schema for the blueprint_* family is separate convention debt.
```

## Files touched (5)
- mcp-server/src/__tests__/blueprintRedaction.test.ts            |  43 ++++++++++++++++
- mcp-server/src/__tests__/cadDispatcher.blueprintRedact.test.ts | 137 +++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/blueprint-vision/blueprintRedaction.ts  |  38 +++++++++++++-
- mcp-server/src/tools/dispatchers/cadDispatcher.ts              |  31 +++++++++++
- 4 files changed, 248 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- til wired). Wires it as cadDispatcher action `blueprint_redact` (the blueprint-vision primary surface), exposing all three contract fns: redactText (distinctive free-text scrub), redactExtraction (structured field-mask, the SAFE app path), redactionRegions (title-block image bbox). Inline param-guard matches the blueprint_lora_*/rag_* sibling convention (the whole blueprint_* family validates inline
- till leaked as bare keys. Closed both: a whole-key EXACT match against the full 117-name registry (any tier) masks the bare-customer-name key wholesale; longer keys embedding a distinctive name still get the distinctive scrub; collision-suffix keeps both values when two customer keys mask to the same token (no silent data loss); ordinary field-name keys (customer/material/notes) never match a custome
- till receives the original key).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 62c20067d155`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._