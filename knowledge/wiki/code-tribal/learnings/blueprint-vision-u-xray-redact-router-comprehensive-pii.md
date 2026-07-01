# BLUEPRINT-VISION/U-XRAY-REDACT-ROUTER-COMPREHENSIVE-PII — [MAIN-FORCE] [BLUEPRINT-VISION]/U-XRAY-REDACT-ROUTER-COMPREHENSIVE-PII (slot:xray): auto-redaction -- close the router redact consumer's PII false-negative + over-redaction P1

**Commit:** `618237fa34d9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T08:20:45-05:00
**Tags:** blueprint-vision, u-xray-redact-router-comprehensive-pii, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION]/U-XRAY-REDACT-ROUTER-COMPREHENSIVE-PII (slot:xray): auto-redaction -- close the router redact consumer's PII false-negative + over-redaction P1

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION]/U-XRAY-REDACT-ROUTER-COMPREHENSIVE-PII (slot:xray): auto-redaction -- close the router redact consumer's PII false-negative + over-redaction P1

The blueprintExtractionRouter `redact` consumer (the explicit operator "auto redaction" ask) gated
eligibility on `Boolean(title_block.customer)` ONLY -- a privacy FALSE-NEGATIVE in the under-protection
direction: a part whose only PII is in a NOTE ("MADE FOR SEMBLEX"), in the `source` print PATH (paths
routinely embed the customer/part number), or in a NON-customer title-block identity field
(company/vendor/part_number/work_order/drawn_by ...) reported "nothing to redact" -- while that SAME
un-redacted title_block/source then flowed into the quote/print_to_program/job_create payloads. The
reason also leaked the cleartext customer name into the plan (`("${cust}")`), and the payload echoed the
raw contract.

FIX: delegate eligibility to the shared `redactExtraction()` audit, which walks the WHOLE contract (all
~30 CUSTOMER_IDENTITY_KEYS + notes/gdt/profile/finish free text + the source path) -- a part is redact-
eligible iff the audit is non-empty. The reason names PII FIELD PATHS (never the cleartext value), and
the payload AUTO-DELIVERS the redacted artifact (`{redacted_extraction, pii_fields, n_redactions}`) so
redaction is automatic, not a second blueprint_redact call. Removed the now-dead `customer()` helper.

P1 (per-file scrutiny arm A, verified live): a clean PII-free part whose `title_block.material` is a
hyphenated grade ("AISI-1045"/"SAE-4340"/"AL-6061"/"SS-304"/"C-1018") matched the part-number regex
`[A-Z]{1,4}-\d{3,6}` -> false-flagged redact-eligible AND corrupted the material to [REDACTED] in the
auto-delivered artifact (over-redaction). Root-fixed in blueprintRedaction.ts: new NON_PII_VALUE_KEYS
(material/revision/units/scale/sheet/finish/...) pass through VERBATIM in redactExtraction's walk, placed
AFTER the identity-key wholesale-mask check so customer/part_number/drawing_number still mask. Strengthens
an already-asserted invariant (existing tests assert material preserved, just with non-hyphenated "4140").

TESTS: blueprintExtractionRouter.test.ts +8 (PII-in-notes/source/part_number/work_order REGRESSION --
fail on the old customer-only check -- + no-over-redaction + auto-redacted payload + audit-parity + the
AISI-1045 over-redaction guard). blueprintRedaction.test.ts +2 (hyphenated-grade pass-through +
identity-masking-not-weakened). cadDispatcher.blueprintExtractRoute.test.ts: reason no longer leaks the
value + R15 round-trip proving the redacted artifact survives contract->route->JSON through prism_cad.
105 tests green (router+redaction+LoRA-bridge+drawingRoute); tsc clean on changed files; per-file 2-arm
scrutiny (arm A FAIL->P1 fixed+regression-tested; arm B PASS, 2 P2s addressed: doc-honesty + payload
deviation documented). LoRA export path unaffected (uses applyAnonymizationPatterns, not redactExtraction).
```

## Files touched (6)
- mcp-server/src/__tests__/blueprintExtractionRouter.test.ts           | 112 +++++++++++++++++++++++++++++++++++++--
- mcp-server/src/__tests__/blueprintRedaction.test.ts                  |  27 ++++++++++
- mcp-server/src/__tests__/cadDispatcher.blueprintExtractRoute.test.ts |   7 ++-
- mcp-server/src/engines/blueprint-vision/blueprintExtractionRouter.ts |  50 ++++++++++++++---
- mcp-server/src/engines/blueprint-vision/blueprintRedaction.ts        |  27 ++++++++++
- 5 files changed, 212 insertions(+), 11 deletions(-)

## Lessons surfaced in commit body
- till mask. Strengthens

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 618237fa34d9`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._