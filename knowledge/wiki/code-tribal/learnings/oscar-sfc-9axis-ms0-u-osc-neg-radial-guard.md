# OSCAR-SFC-9AXIS-MS0/U-OSC-NEG-RADIAL-GUARD — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-NEG-RADIAL-GUARD (slot:oscar): reject non-physical radial at the engine boundary -> no NaN-force under-protection

**Commit:** `32f1e6266a2f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T13:35:00-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-neg-radial-guard, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-NEG-RADIAL-GUARD (slot:oscar): reject non-physical radial at the engine boundary -> no NaN-force under-protection

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-NEG-RADIAL-GUARD (slot:oscar): reject non-physical radial at the engine boundary -> no NaN-force under-protection

UltimateSpeedFeedEngine STEP-6 ae resolution used a bare truthy check (if(input.radial_depth_mm)/else if(_pct)), so a NEGATIVE value was truthy -> ae_mm<0 -> STEP-9 hex acos(1-2*ae/Dc) arg>1 -> NaN Fc -> a consumer Number.isFinite force-clamp guard SILENTLY skipped (no workholding/spindle protection on a DIRECT engine call). Now Number.isFinite(x) && x>0 gates each tier (validMm -> validPct -> strategy -> table) and a provided-but-non-physical radial pushes a warning, matching the 9-axis orchestrator >0 gate + the engine return+warn edge-case convention. Valid positive inputs resolve bit-identically (back-compat). +4 R9 tests (neg mm / NaN mm / neg pct / back-compat positive), 9/9 green; 3-of-3 PASS. P3 follow-ups: radial_depth provenance label off truthiness; dual-supply warning text; no explicit Infinity/NaN-pct case (covered by construction).
```

## Files touched (3)
- mcp-server/src/__tests__/ultimate-speed-feed-immersion-force.test.ts | 51 +++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/UltimateSpeedFeedEngine.ts                    | 24 ++++++++++++++++++++----
- 2 files changed, 71 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 32f1e6266a2f`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._