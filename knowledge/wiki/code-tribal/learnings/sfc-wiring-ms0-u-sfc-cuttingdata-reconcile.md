# SFC-WIRING-MS0/U-SFC-CUTTINGDATA-RECONCILE — [MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-CUTTINGDATA-RECONCILE (slot:oscar): R7 resolution -- CuttingDataLookup is an INTENTIONAL conservative reference, NOT a duplicate of the physics SFC (document, don't sync)

**Commit:** `ec51f1962d69` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T14:47:40-05:00
**Tags:** sfc-wiring-ms0, u-sfc-cuttingdata-reconcile, auto-distilled

## Subject
[MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-CUTTINGDATA-RECONCILE (slot:oscar): R7 resolution -- CuttingDataLookup is an INTENTIONAL conservative reference, NOT a duplicate of the physics SFC (document, don't sync)

## Body
```
[MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-CUTTINGDATA-RECONCILE (slot:oscar): R7 resolution -- CuttingDataLookup is an INTENTIONAL conservative reference, NOT a duplicate of the physics SFC (document, don't sync)

Resolves the parallel-path divergence flagged in shop_recommended-core scrutiny
(CuttingDataLookupEngine.ts CUTTING_DATA P_milling_roughing [91,137,183] m/min vs
UltimateSpeedFeedEngine.CUTTING_PARAMS [100,160,220]). Investigation shows the two are
DELIBERATELY DISTINCT, not unsynced duplicates:
- CuttingDataLookupEngine = a conservative vendor-style REFERENCE lookup keyed by ISO group
  x operation x cut type ("quick lookup for programming reference", AutoSpeedFeedEngine:650).
- UltimateSpeedFeedEngine = the canonical PHYSICS-optimized SFC (per-tool/machine factors,
  Kienzle forces, goal blending incl. shop_recommended).
- AutoSpeedFeedEngine orchestrates BOTH in distinct roles; cutting-data-lookup.test.ts asserts
  INTERNAL consistency, NOT parity with the physics calc.

So force-syncing would be wrong (R7 surface-don't-average). Fix = make the boundary EXPLICIT
in the CUTTING_DATA header so a future chat does not mis-"fix" the intentional divergence:
the reference table runs conservative vs modern catalog BY DESIGN; the physics engine owns the
catalog-matched recommendation. Comment-only, zero behavioral change.

Tests: cutting-data-lookup 23/23 pass, tsc clean. Closes task #4 / the arm-B reconcile flag.
Refs: reference_oscar_sfc_shop_recommended_2026_06_19.md.
```

## Files touched (2)
- mcp-server/src/engines/CuttingDataLookupEngine.ts | 10 ++++++++++
- 1 file changed, 10 insertions(+)

## Lessons surfaced in commit body
- wrong (R7 surface-don't-average). Fix = make the boundary EXPLICIT

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ec51f1962d69`
- Milestone envelope: `mcp-server/data/milestones/SFC-WIRING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._