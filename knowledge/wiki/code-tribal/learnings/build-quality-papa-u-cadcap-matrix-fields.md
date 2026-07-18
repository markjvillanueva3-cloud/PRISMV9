# BUILD-QUALITY-PAPA/U-CADCAP-MATRIX-FIELDS — [MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-CADCAP-MATRIX-FIELDS (slot:papa): complete CADCapabilityMatrix on 4 CAD code generators + SolidWorks runScriptBody contract realign

**Commit:** `d32e0d89b63b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T14:33:12-05:00
**Tags:** build-quality-papa, u-cadcap-matrix-fields, auto-distilled

## Subject
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-CADCAP-MATRIX-FIELDS (slot:papa): complete CADCapabilityMatrix on 4 CAD code generators + SolidWorks runScriptBody contract realign

## Body
```
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-CADCAP-MATRIX-FIELDS (slot:papa): complete CADCapabilityMatrix on 4 CAD code generators + SolidWorks runScriptBody contract realign

Root cause: CADCapabilityMatrix gained 4 required fields (nativeLengthUnit/
nativeAngleUnit/requiresSubprocess/typicalLatencyMs); 4 generators lagged.
All unit values VERIFIED from each engine emit code, NOT fabricated:
- Fusion360: cm/rad (mirrors canonical Fusion360CADGeneratorAdapter same host)
- HyperCADS: mm/deg (UNIT_FACTOR in?25.4:1.0 "Conversion to mm"; deg emits)
- Mastercam: mm/deg (UNIT_FACTOR "Conversion factor to mm"; .StartAngleDegrees)
- SolidWorks: m/deg already inline; only cadSystem identity field was missing
SolidWorks runScriptBody: realigned to base contract (script:CADScript<string>
-> CADExecutionResult); executeVBA() does not exist on SolidWorksAutomationBridge
(bridge has only open/export/bbox/close) so the real path now fails loud (R12,
Esprit pattern) instead of crashing on a missing method. Fixed latent NaN bug
at emitSketchCircle (p.diameter/2 ?? 5 was dead -- NaN never nullish).
tsc 81 -> 70 (11 fixed, 0 regressions; gated 16GB heap, diff verified).
```

## Files touched (5)
- mcp-server/src/engines/Fusion360CodeGeneratorEngine.ts  |  8 +++++++-
- mcp-server/src/engines/HyperCADSCodeGeneratorEngine.ts  | 12 +++++++++---
- mcp-server/src/engines/MastercamCodeGeneratorEngine.ts  |  6 ++++++
- mcp-server/src/engines/SolidWorksCodeGeneratorEngine.ts | 43 +++++++++++++++++++------------------------
- 4 files changed, 41 insertions(+), 28 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d32e0d89b63b`
- Milestone envelope: `mcp-server/data/milestones/BUILD-QUALITY-PAPA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._