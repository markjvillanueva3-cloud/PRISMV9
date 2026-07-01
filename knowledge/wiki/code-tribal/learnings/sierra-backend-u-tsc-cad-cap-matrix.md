# SIERRA-BACKEND/U-TSC-CAD-CAP-MATRIX — [MAIN-FORCE] [SIERRA-BACKEND]/U-TSC-CAD-CAP-MATRIX (slot:sierra): clear the LAST project tsc error -> build type-gate green

**Commit:** `26ff7dcd8d8d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-20T20:53:11-05:00
**Tags:** sierra-backend, u-tsc-cad-cap-matrix, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-BACKEND]/U-TSC-CAD-CAP-MATRIX (slot:sierra): clear the LAST project tsc error -> build type-gate green

## Body
```
[MAIN-FORCE] [SIERRA-BACKEND]/U-TSC-CAD-CAP-MATRIX (slot:sierra): clear the LAST project tsc error -> build type-gate green

InventorCADCodeGeneratorEngine's INVENTOR_CAPABILITIES set maxOpsPerScript + 8 vendor capability booleans
(supportsParameters/supportsBatchExecution/parametricModeling/directModeling/assemblyModeling/sheetMetal/
surfaceModeling/meshModeling) absent from CADCapabilityMatrix -> TS2353/TS2561 (tsc reports excess props
one-at-a-time, which is why it surfaced as a single error). Added all 9 as OPTIONAL fields -- matches papa's
prior "+4 optional fields systemic-enabler" pattern (U-TSC-DOMAIN-KILO); zero-risk to the 43 ICADCodeGenerator
importers (optional, no rename, no consumer change). The supportedOps vendor-op union first-classing stays
delta's tracked migration (already handled via the line-147 cast; untouched here).

EVAL: tsc --noEmit = 0 errors (was 1 -- the last remaining project-wide; build type-gate now green).
cadDispatcher.inventor.test.ts 21/21 PASS (asserts caps.maxOpsPerScript===500 + 5 spanning configs). No behavior change.
```

## Files touched (2)
- mcp-server/src/interfaces/ICADCodeGenerator.ts | 11 +++++++++++
- 1 file changed, 11 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 26ff7dcd8d8d`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-BACKEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._