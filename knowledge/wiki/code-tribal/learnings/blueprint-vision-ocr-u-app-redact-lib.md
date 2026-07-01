# BLUEPRINT-VISION-OCR/U-APP-REDACT-LIB — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-APP-REDACT-LIB (slot:xray): shared blueprint customer-identity redactor (auto-redaction) -- build-once, 118-customer distinctive tier, app-facing surface

**Commit:** `47a37b714d1a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T10:14:04-05:00
**Tags:** blueprint-vision-ocr, u-app-redact-lib, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-APP-REDACT-LIB (slot:xray): shared blueprint customer-identity redactor (auto-redaction) -- build-once, 118-customer distinctive tier, app-facing surface

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-APP-REDACT-LIB (slot:xray): shared blueprint customer-identity redactor (auto-redaction) -- build-once, 118-customer distinctive tier, app-facing surface

The operator's "auto redaction" ask (Phase 3 of the app-integration plan). R8/dedup finding:
the customer-identity anonymization ALREADY existed but was locked inside the CRITICAL-classified
BlueprintLoRABridgeEngine (LoRA-export only) AND covered only ~9 names while jm-die-profile.ts has
the canonical 118-customer JM_DIE_CUSTOMERS registry.

EXTRACTED build-once (R15/R16) to a shared TS module mcp-server/src/engines/blueprint-vision/
blueprintRedaction.ts. The LoRA engine now imports + re-exports ANONYMIZATION_PATTERNS /
applyAnonymizationPatterns from it -- behavior BYTE-IDENTICAL (CORE-9 deny-list unchanged, same
[REDACTED] token, non-string->"" contract, separator matching only WIDENED -?->[\s_-]*, never
narrowed; the engine's not.toMatch spec test + all 22 engine tests still pass).

App-facing surface (the new value):
- redactText(text, {aggressive, auditCleartext}) -- free-text scrub.
- redactExtraction(extraction) -- DEEP-COPY scrub: customer-identity FIELDS (customer/company/vendor/
  buyer/work_order/... 31 keys) masked WHOLESALE (covers any customer, zero collision -- the SAFE
  primary mechanism); free-text scrubbed by the DISTINCTIVE tier.
- redactionRegions(regions) -- the title_block image region(s) to mask on a rendered drawing.

DISTINCTIVE TIER (R7 -- the precision/recall conflict, surfaced not averaged): the 118 registry
contains common drawing words (ACME thread, ELECTRODE, FORM, AIR, SEMS, ATF fluid, geographic
ship-to words MIDWEST/NORTHEAST, short acronyms CFC/CSM/...). Default free-text scrubs all DISTINCTIVE
customers (SEMBLEX/TOPURA/STALCOP -- multi-word, or single-token not-common and >=4 chars; CORE names
SFS/ITW always scrub) WITHOUT over-redacting common words. `aggressive:true` adds the full registry
(max-privacy export, accepts over-redaction). Audit OMITS cleartext by default (safe to log).

TEST: 25 tests (mcp-server/src/__tests__/blueprintRedaction.test.ts) incl. adversarial leak (nested
customer must not survive), the over-redaction guard (ACME/ATF/NORTHEAST preserved), distinctive-leak
fix (SEMBLEX/TOPURA in a non-identity field masked), and back-compat. Engine no-regression 22/22, tsc
my-files clean. 2-arm scrutiny: arm A PASS; arm B FAILed on a real default-mode customer LEAK (P1) +
cleartext audit (P2) -- BOTH fixed (distinctive tier + extended identity keys + cleartext-free audit);
re-review PASS. A follow-up over-redaction P2 (ATF/MIDWEST) also fixed inline.

[SCOPED] follow-up U-APP-REDACT-WIRE (registered in the integration plan): redactExtraction/
redactionRegions are the tested xray CONTRACT but NOT yet reachable from the app -- the dispatcher
action (blueprint_redact) + the quebec "export anonymized" render are the consuming unit (render layer
is quebec's per the ownership table). R12: the redactor is BUILT + TESTED, NOT yet wired to a live
export path -- do not claim the app feature ships until U-APP-REDACT-WIRE lands.
```

## Files touched (5)
- .../wiki/architecture/blueprint-vision-app-integration-plan-2026-06-23.md   |  14 ++
- mcp-server/src/__tests__/blueprintRedaction.test.ts                         | 225 ++++++++++++++++++++++++++++
- mcp-server/src/engines/BlueprintLoRABridgeEngine.ts                         |  36 ++---
- mcp-server/src/engines/blueprint-vision/blueprintRedaction.ts               | 291 ++++++++++++++++++++++++++++++++++++
- 4 files changed, 541 insertions(+), 25 deletions(-)

## Lessons surfaced in commit body
- till pass).
- til U-APP-REDACT-WIRE lands.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 47a37b714d1a`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._