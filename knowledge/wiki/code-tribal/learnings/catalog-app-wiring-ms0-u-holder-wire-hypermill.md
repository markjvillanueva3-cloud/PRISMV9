# CATALOG-APP-WIRING-MS0/U-HOLDER-WIRE-HYPERMILL — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-HOLDER-WIRE-HYPERMILL (slot:romeo): wire real holders into hyperMILL .hmt NCTool export

**Commit:** `4a2f84eacc9a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T19:19:30-05:00
**Tags:** catalog-app-wiring-ms0, u-holder-wire-hypermill, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-HOLDER-WIRE-HYPERMILL (slot:romeo): wire real holders into hyperMILL .hmt NCTool export

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-HOLDER-WIRE-HYPERMILL (slot:romeo): wire real holders into hyperMILL .hmt NCTool export

buildNCTool now selects a REAL cataloged holder (HolderSelectionEngine, same
selection logic as the Fusion + Mastercam wires) by spindle taper + shank-bore fit.
The .hmt NCTools row has no holder_vendor column, so the brand+designation rides in
nc_name; the holder gauge (projection) + tool stickout gives a true spindle-to-tip
gage_length. tool_length is derived from tool geometry ONLY (never the large holder
gauge -- fixes a silent 10mm-floor clamp the naive wire introduced). No catalog
match -> diameter-based fallback retained (fail-soft).

Closes the holder leg across all 3 CAM apps (Fusion + Mastercam + hyperMILL).
Deterministic round-trip test through prism_cam asserts a bracketed brand in an
NCTools row + non-clamped tool_length. 2-of-2 per-file scrutiny PASS. 9/9 tests.
```

## Files touched (3)
- mcp-server/src/__tests__/CamToolExportFullCatalog.test.ts | 39 +++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/HyperMillToolExportEngine.ts       | 41 +++++++++++++++++++++++++++++++++++------
- 2 files changed, 74 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4a2f84eacc9a`
- Milestone envelope: `mcp-server/data/milestones/CATALOG-APP-WIRING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._