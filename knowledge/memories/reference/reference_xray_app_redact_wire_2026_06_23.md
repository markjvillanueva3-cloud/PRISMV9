---
name: reference_xray_app_redact_wire_2026_06_23
description: U-APP-REDACT-WIRE shipped -- the tested blueprintRedaction lib is now reachable as prism_cad:blueprint_redact; + a P1 customer-name-in-KEY redaction leak found+fixed in per-file scrutiny (2026-06-23).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.269Z
aliases: reference_xray_app_redact_wire_2026_06_23
---


**xray /checkin-xray session 2026-06-23 (slot xray, cad-fusion-live-ms0): U-APP-REDACT-WIRE -- make the redactor reachable + close a P1 key-leak.**

The shared `blueprintRedaction.ts` (U-APP-REDACT-LIB, prior session) was TESTED but UNREACHABLE -- no dispatcher/app surface consumed it, so the "auto-redaction app feature" did not actually ship (R12: do-not-claim-shipped until wired). This unit (`[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-APP-REDACT-WIRE`) wires it.

- **Wire:** new `cadDispatcher` (prism_cad) action **`blueprint_redact`** -- the blueprint-vision primary surface. Pure + in-process (no IO injection, unlike the blueprint_lora_* siblings). Exposes all three contract fns: `redactText` (distinctive free-text scrub), `redactExtraction` (structured field-mask = the SAFE app path), `redactionRegions` (title-block image bbox). Accepts text/extraction/regions (>=1 required, else dispatcherError), aggressive + auditCleartext toggles. Inline param-guard matches the blueprint_lora/rag/coverage sibling convention -- the WHOLE blueprint_* family validates inline (NO per-action Zod schema; verified by grep of src/tools/schemas/). That schema gap is family-wide [SCOPED] convention debt, NOT this unit (R11 match conventions).
- **Round-trip test** `cadDispatcher.blueprintRedact.test.ts` (10 tests, THROUGH prism_cad not the lib): field-mask, deep adversarial leak, distinctive scrub, over-redaction guard, aggressive, auditCleartext, regions, combined call, missing-param error, + the key-leak adversarial.

**P1 BUG FOUND + FIXED IN PER-FILE SCRUTINY (privacy-critical):** `redactExtraction.walk` scrubbed string VALUES but copied object KEYS verbatim -- so a per-customer map `{ "ITW SHAKEPROOF": {...} }` round-tripped the customer identity IN THE KEY. First fix used `redactText(k)` (the DISTINCTIVE tier) -- but that tier deliberately skips short acronyms (ATF) + common words (ACME/PARKER) to avoid mangling free-text VALUES, so **29/117 JM customers still leaked as bare keys**. The distinctive-tier suppression is correct for VALUES but WRONG for a bare KEY (a key that IS exactly a customer name is unambiguous identity, no free text to preserve). FINAL FIX: a whole-key EXACT match against the full 117-name registry (`ALL_CUSTOMER_NAMES_UPPER`, any tier) masks the bare-customer-name key wholesale; longer keys embedding a distinctive name still get the distinctive scrub; collision-suffix (`MASK#i`) keeps both values when two customer keys mask to the same token (no silent data loss); ordinary field-name keys (customer/material/notes) never match a customer-NAME pattern so are untouched (no over-redaction); value path byte-unchanged (isIdentityKey still gets the original key). The first reviewer pass (2-arm) PASSED on the wire; a FOCUSED independent re-review of the lib then caught the key-leak, and a SECOND focused re-review caught the short-acronym residual within the first fix -- two layers of independent re-review were needed because each fix opened a narrower gap.

62/62 tests (30 lib incl. 5 new key-leak/short-acronym/collision + 22 BlueprintLoRABridge no-regression + 10 wire), tsc clean on all touched files.

**LESSON (reusable):** a redactor that walks structured data must scrub object KEYS as well as VALUES -- a customer identity can BE the key (per-customer map / title-block-as-key). And a tier tuned for free-text over-redaction safety (skip-short-acronyms) is the WRONG tier for a bare key, where exact-whole-string identity has zero over-redaction risk -- use the full registry for whole-key matches. Wiki [[redaction-must-scrub-object-keys]]. Sibling of the value-side tradeoff in [[reference_xray_calibration_accumulation_and_app_plan_2026_06_23]] (U-APP-REDACT-LIB).

**[SCOPED] follow-on (quebec/charlie, NOT xray):** the "export anonymized" drawing render + blueprint_to_quote redaction CONSUME `prism_cad:blueprint_redact` -- their surfaces. Zod schema for the blueprint_* family is separate convention debt.

NEXT non-gated xray-backend item (backlog 2026-06-19): GD&T operator-confirm surface in `build-ocr-gold-verify-package.mjs` (P2). GATED (do NOT force): per-type calibration P2.9 (volume), multi-part region comparison (needs a corpus with >1 scoreable callout-GT part -- perfect-parts has only 05850), GPU validate-perfect-parts --emit-calibration (quiet window).
