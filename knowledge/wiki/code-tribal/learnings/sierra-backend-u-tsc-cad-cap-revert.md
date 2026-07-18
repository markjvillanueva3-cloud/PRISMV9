# SIERRA-BACKEND/U-TSC-CAD-CAP-REVERT — [MAIN-FORCE] [SIERRA-BACKEND]/U-TSC-CAD-CAP-REVERT (slot:sierra): revert U-TSC-CAD-CAP-MATRIX -- it did NOT achieve tsc 0 (R12 self-correction)

**Commit:** `365da2cde685` · **By:** markjvillanueva3-cloud · **At:** 2026-06-20T21:05:48-05:00
**Tags:** sierra-backend, u-tsc-cad-cap-revert, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-BACKEND]/U-TSC-CAD-CAP-REVERT (slot:sierra): revert U-TSC-CAD-CAP-MATRIX -- it did NOT achieve tsc 0 (R12 self-correction)

## Body
```
[MAIN-FORCE] [SIERRA-BACKEND]/U-TSC-CAD-CAP-REVERT (slot:sierra): revert U-TSC-CAD-CAP-MATRIX -- it did NOT achieve tsc 0 (R12 self-correction)

U-TSC-CAD-CAP-MATRIX (26ff7dcd8d) claimed "tsc 0 / build type-gate green". FALSE -- a FRESH (non-incremental)
tsc shows InventorCADCodeGeneratorEngine STILL errors: TS2739 -- INVENTOR_CAPABILITIES is missing 5 REQUIRED
CADCapabilityMatrix fields (cadSystem, nativeLengthUnit, nativeAngleUnit, requiresSubprocess, typicalLatencyMs).
Adding the 9 optional vendor-flag fields only cleared the excess-property errors (TS2353/TS2561) that were
MASKING the missing-required error; the .tsbuildinfo incremental cache then reported a STALE 0 on my verify run.

The genuine fix needs Inventor-specific values (native length/angle unit, typical subprocess latency) = delta's
CAD-galaxy domain knowledge (only FreeCADCodeGeneratorEngine conforms to the full canonical shape today; the
engine's own comment marks vendor first-classing as delta's tracked migration). Reverting to the EXACT pre-session
state (1 pre-existing error, TS2353 maxOpsPerScript) rather than ship a false-green or FABRICATE Inventor unit/
latency values (R12). Precise diagnosis handed to delta in the handoff.

LESSON: after clearing TS excess-property errors, ALWAYS re-run tsc FRESH (incremental tsc can report a stale 0
while a newly-unmasked missing-required error remains). The clean grep-count "0" was a cache artifact.
```

## Files touched (2)
- mcp-server/src/interfaces/ICADCodeGenerator.ts | 11 -----------
- 1 file changed, 11 deletions(-)

## Lessons surfaced in commit body
- TILL errors: TS2739 -- INVENTOR_CAPABILITIES is missing 5 REQUIRED
- LESSON: after clearing TS excess-property errors, ALWAYS re-run tsc FRESH (incremental tsc can report a stale 0

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 365da2cde685`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-BACKEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._