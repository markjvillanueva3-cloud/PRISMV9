# SFC-FRONTEND/U-SFC-CAM-CATALOG-REBUILD — [MAIN-FORCE] [SFC-FRONTEND]/U-SFC-CAM-CATALOG-REBUILD (slot:oscar): rebuild the exFAT-lost CAM programming-environment catalog (3 tests red->green)

**Commit:** `df6fe73f80cf` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T15:32:45-05:00
**Tags:** sfc-frontend, u-sfc-cam-catalog-rebuild, auto-distilled

## Subject
[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-CAM-CATALOG-REBUILD (slot:oscar): rebuild the exFAT-lost CAM programming-environment catalog (3 tests red->green)

## Body
```
[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-CAM-CATALOG-REBUILD (slot:oscar): rebuild the exFAT-lost CAM programming-environment catalog (3 tests red->green)

The expanded CAM programming-environment catalog was lost to exFAT corruption
(2026-04-10) and stubbed empty; 3 SFC calculator-coverage tests had been red.
Reconstructed via Workflow wf_caa1288e-7a8 (opus build + sonnet adversarial
verify), operator-ordered (overrides route-to-kilo). Added 18 CAM environments
(camworks-mill/lathe/wire, sprutcam-*, surfcam-*, tebis-*, topsolid-wire,
catia-lathe, bobcad-*, edgecam-wire, nx-wire, solidcam-wire) + supplemental
toolpaths on mastercam-mill/fusion360-mill/nx-mill/mastercam-lathe + the JM Die
canonical VDI30 holder baseline. PROGRAMMING_ENVIRONMENTS 66 -> 84 (mill24/
lathe18/wire17/edm7/laser9/waterjet9). Real vendor names (HCL-Geometric=CAMWorks,
SprutCAM Tech, Hexagon=SURFCAM, Dassault=CATIA, Missler=TopSolid).

VERIFIED: 3 files / 45 tests pass, 0 failures (ran myself + independent sonnet
re-run); no test weakening (no .skip/.only, no test-file edits); ASCII-clean
(0 new non-ASCII); classifyToolpathType + getToolpathDefaults consistency held.
Files: calculatorWorkspace.ts +315, calculatorHolderLibrary.ts +27, calculatorTooling.ts.
```

## Files touched (4)
- mcp-server/web/src/data/calculatorHolderLibrary.ts |  27 +++++++++++++
- mcp-server/web/src/data/calculatorWorkspace.ts     | 315 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- mcp-server/web/src/utils/calculatorTooling.ts      |   2 +-
- 3 files changed, 342 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show df6fe73f80cf`
- Milestone envelope: `mcp-server/data/milestones/SFC-FRONTEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._