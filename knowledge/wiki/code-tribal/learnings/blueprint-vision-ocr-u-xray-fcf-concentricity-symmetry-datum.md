# BLUEPRINT-VISION-OCR/U-XRAY-FCF-CONCENTRICITY-SYMMETRY-DATUM — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-FCF-CONCENTRICITY-SYMMETRY-DATUM (slot:xray): flag concentricity/symmetry missing-datum in the shared FCF validator

**Commit:** `95ac8443c049` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T21:31:16-05:00
**Tags:** blueprint-vision-ocr, u-xray-fcf-concentricity-symmetry-datum, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-FCF-CONCENTRICITY-SYMMETRY-DATUM (slot:xray): flag concentricity/symmetry missing-datum in the shared FCF validator

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-FCF-CONCENTRICITY-SYMMETRY-DATUM (slot:xray): flag concentricity/symmetry missing-datum in the shared FCF validator

FCFSyntaxValidatorEngine emitted a missing-datum error only for position
(POSITION_NO_DATUM) + orientation + runout (MISSING_DATUM). concentricity & symmetry --
datum-requiring LOCATION controls (coaxiality about a datum axis / median-plane symmetry
about a datum center plane) -- fell through, so a datum-less concentricity/symmetry FCF was
wrongly reported valid (only the DEPRECATED_SYMBOL warning fired). Deprecation in Y14.5-2018
does NOT exempt them from requiring a datum.

Fix: add concentricity/symmetry to the MISSING_DATUM condition (reuses the existing code;
position keeps its own POSITION_NO_DATUM -- intentionally not folded in, no double error).
getStats rule text + class-header docstring updated. Purely additive: no existing test or
consumer passed those symbols datum-less (the 2 pre-existing concentricity tests both carry
datum A -- unaffected). The 3 consumers (cad_fcf_validate dispatcher, gdtFcfValidate adapter,
BlueprintVisionOCREngine) treat the verdict as informational -- no cost/process mutation.

R16 fit-the-whole: the TS validator now AGREES with the grinder's 8-symbol
DATUM_REQUIRED_SYMBOLS set (U-XRAY-GDT-DATUM-DEFICIENT-SYMBOL-AWARE) -- the prior cross-runtime
divergence on concentricity/symmetry is closed; the .mjs reconciliation comment updated to
reflect parity.

Tests: +3 validator (concentricity/symmetry no-datum -> MISSING_DATUM + valid:false;
concentricity WITH datum -> no MISSING_DATUM, deprecation warning only) + 2 adapter round-trip
(proves the OCR live path now surfaces it via fcf_valid/fcf_issues). 19/19 validator + 26/26
adapter green; tsc 0 errors. Per-file 2-arm scrutiny BOTH PASS (no P0/P1; 2 P2 doc-staleness
hardened inline).
```

## Files touched (5)
- mcp-server/src/__tests__/FCFSyntaxValidatorEngine.test.ts | 24 ++++++++++++++++++++++++
- mcp-server/src/engines/FCFSyntaxValidatorEngine.ts        | 15 +++++++++++----
- mcp-server/src/utils/__tests__/gdtFcfValidate.test.ts     | 12 ++++++++++++
- scripts/lib/ollama-vision-extract-lib.mjs                 | 13 ++++++-------
- 4 files changed, 53 insertions(+), 11 deletions(-)

## Lessons surfaced in commit body
- wrongly reported valid (only the DEPRECATED_SYMBOL warning fired). Deprecation in Y14.5-2018

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 95ac8443c049`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._