# TOOL-LIBRARIES/U-CAM-PLACEMENT — [MAIN-FORCE] [TOOL-LIBRARIES]/U-CAM-PLACEMENT (slot:romeo): deliver per-brand libs into the CAM seats

**Commit:** `c8c92c346bf9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T08:59:24-05:00
**Tags:** tool-libraries, u-cam-placement, auto-distilled

## Subject
[MAIN-FORCE] [TOOL-LIBRARIES]/U-CAM-PLACEMENT (slot:romeo): deliver per-brand libs into the CAM seats

## Body
```
[MAIN-FORCE] [TOOL-LIBRARIES]/U-CAM-PLACEMENT (slot:romeo): deliver per-brand libs into the CAM seats

Iter 6 -- the 'generating != delivering' destination step ([[feedback_ultimate_destination_check]]).
The per-brand libraries lived only in state/shared/; now they are placed into each running seat's
tool folder so the software can import them.

- SEATS (verified live 2026-06-19): Fusion %APPDATA%/Autodesk/Fusion 360 CAM/PRISM_Tool_Libraries
  (.tools copy); hyperMILL resources/.../31.0/PRISM_Tool_Libraries (.hmt binary BUILT from .hmt.sql
  via node:sqlite + .sql kept as regen source); Mastercam Public/.../shared mcamx8/PRISM_Tool_Libraries
  (_tools.csv copy -- Tool Manager import surface).
- Safe-by-default dry-run; --apply writes. Additive + reversible (PRISM_* in a PRISM subfolder).
- DELIVERED LIVE: Fusion 19 .tools | hyperMILL 38 files (19 .hmt binaries = 61,246 tools) |
  Mastercam 19 .csv. R15 VALIDATE: placed PRISM_GUHRING.hmt re-opened via node:sqlite -> Tools load.
- Tests: placement 4/4 (hermetic copy/dry-run/empty via seats+srcRoot DI -- never touches real seats).
```

## Files touched (3)
- scripts/place-cam-tool-libraries.mjs      | 134 ++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/place-cam-tool-libraries.test.mjs |  71 ++++++++++++++++++++++++++++
- 2 files changed, 205 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c8c92c346bf9`
- Milestone envelope: `mcp-server/data/milestones/TOOL-LIBRARIES.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._