# BLUEPRINT-VISION/U-XRAY-REDACT-SPEC-FIELD-GRADE-GUARD — [MAIN-FORCE] [BLUEPRINT-VISION]/U-XRAY-REDACT-SPEC-FIELD-GRADE-GUARD (slot:xray): fix the under-redaction P1 (3-of-3 arm C) -- value-aware grade protection on spec fields

**Commit:** `9ff067db3713` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T08:36:40-05:00
**Tags:** blueprint-vision, u-xray-redact-spec-field-grade-guard, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION]/U-XRAY-REDACT-SPEC-FIELD-GRADE-GUARD (slot:xray): fix the under-redaction P1 (3-of-3 arm C) -- value-aware grade protection on spec fields

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION]/U-XRAY-REDACT-SPEC-FIELD-GRADE-GUARD (slot:xray): fix the under-redaction P1 (3-of-3 arm C) -- value-aware grade protection on spec fields

The prior commit (618237fa34) added a BLANKET pass-through for NON_PII_VALUE_KEYS (material/finish/size/...)
in redactExtraction to stop a hyphenated material grade ("AISI-1045") being mistaken for a part number.
3-of-3 scrutiny arm C (FAIL/P1, verified live) caught that the blanket pass-through opened an UNDER-redaction
hole in the DANGEROUS direction: a customer name or part number EMBEDDED in a mislabeled spec value
("MATERIAL: 4140 PER ITW SPEC", "FINISH: ANODIZE FOR OPTIMAS", "FINISH: ITW", "STEEL ABC-1234") now passed
through verbatim, leaking the exact JM blocklist (ITW/OPTIMAS/SEMBLEX/HOLO-KROME). redactExtraction also
backs the standalone prism_cad:blueprint_redact action, so the leak was not router-scoped.

FIX (value-aware, both reviewers converged): the spec-field branch no longer blanket-passes -- it runs the
full redactText scrub with a new `protectGrades` option that suppresses ONLY a genuine material-grade token
from the part-number pattern (new exported `looksLikeMaterialGrade`: a material-standard prefix
AISI/SAE/AL/SS/C/UNS/... + a short 3-4 digit grade; a generic part-number prefix like ABC/XY/D or a 5-6
digit token is NOT a grade -> still masked). So: embedded customer names + real part numbers in a spec
value are masked (under-redaction closed), while a clean grade "AISI-1045" is preserved (over-redaction stays
fixed). `protectGrades` defaults FALSE -> the LoRA export (applyAnonymizationPatterns), the blueprint_redact
text path, and general note free-text scrubbing are byte-identical (bounded blast radius).

TESTS (+4): "P1 UNDER-REDACTION FIX" (embedded ITW/OPTIMAS/SEMBLEX + real part number ABC-1234 masked, grade
AISI-1045 preserved) + whole-value-customer-in-spec masked + a dedicated looksLikeMaterialGrade unit block
(TRUE for AISI-1045/SAE-4340/AL-6061/SS-304/C-1018/UNS-3160; FALSE for ABC-1234/XY-9981/D-12345/5-6-digit/
non-string). The prior over-redaction tests stay green. 130 tests pass across the redaction+router+LoRA+
quoting-intake+drawingRoute cluster; tsc clean on changed files.
```

## Files touched (3)
- mcp-server/src/__tests__/blueprintRedaction.test.ts           | 50 ++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/blueprint-vision/blueprintRedaction.ts | 55 +++++++++++++++++++++++++++++++++++++++++------
- 2 files changed, 98 insertions(+), 7 deletions(-)

## Lessons surfaced in commit body
- till masked). So: embedded customer names + real part numbers in a spec

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9ff067db3713`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._