# SFC-CONVERGENCE/U-SFC-DUCTILE-IRON-KC — [MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-DUCTILE-IRON-KC (slot:oscar): add canonical ductile/nodular iron kc1.1 -- fix the ~18% cutting-force under-prediction (was silently the gray-iron K-group default)

**Commit:** `58d8567bb6e2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T19:41:54-05:00
**Tags:** sfc-convergence, u-sfc-ductile-iron-kc, auto-distilled

## Subject
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-DUCTILE-IRON-KC (slot:oscar): add canonical ductile/nodular iron kc1.1 -- fix the ~18% cutting-force under-prediction (was silently the gray-iron K-group default)

## Body
```
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-DUCTILE-IRON-KC (slot:oscar): add canonical ductile/nodular iron kc1.1 -- fix the ~18% cutting-force under-prediction (was silently the gray-iron K-group default)

FOUND via the exhaustive SFC physics audit (5-lens, physics-reviewer arm). Ductile/nodular iron
resolved to kc1_1=1100 -- the gray-iron-class ISO-K GROUP default -- because there was NO "ductile_iron"
key in CANONICAL_MATERIAL_DB. Both engines' material-sync maps (ductile_iron -> "ductile_iron") fell
through the `if (CANONICAL_MATERIAL_DB[canonKey])` guard to the else-branch (CANONICAL_KIENZLE.K = 1100),
silently clobbering the engines' (dead) inline kc1_1. Spheroidal graphite makes ductile iron tougher to
cut than lamellar-graphite gray iron, so its specific cutting force is ~15-20% ABOVE the gray default --
the SFC was UNDER-predicting ductile-iron force (UNCONSERVATIVE, safety-relevant). Live: ductile Fc 448N
(== gray) before; 499N after.

FIX (single canonical source -> fixes BOTH SpeedFeedOrchestratorEngine and UltimateSpeedFeedEngine via
their existing sync maps): added a "ductile_iron" entry to src/physics/constants.ts _RAW_MATERIAL_DB
(full nodular-iron record) + AISI_CUTTING_COEFFICIENTS (kc1_1=1300, mc=0.28, taylor_C=300/n=0.25, ISO-K).
The change is strictly in the SAFE direction (higher kc -> higher predicted force -> earlier safety clamp;
cannot make any recommendation less safe). Gray/generic cast iron unchanged at the K-group 1100.

VALUE VALIDATED (oscar soul: defer kc constants to physics-reviewer): physics-reviewer PASS -- 1300 sits
in the published GJS-500/GGG-50 Kienzle range (Sandvik/Konig/VDI 3321: 1250-1400) AND in the codebase's
own internal cluster (KienzleForceModelEngine GGG50=1350, ProductEngine GGG50@HB220=1300,
ManufacturingCalculations=1300, AIIntelligenceMaximizer=1300). Raw thermophysical props all in published
nodular-iron range. mc=0.28 kept to match the K-group/gray-iron convention.

TEST: sfc-ductile-iron-kc.test.ts (5/5): orchestrator ductile=1300 + nodular alias=1300; gray/cast stay
1100 (no regression); ductile Fc > gray Fc (>=1.08x); UltimateSpeedFeedEngine ALSO differentiates.
Regression: 89/89 (constants + materialSanity + MaterialRegistry + converge). 0 tsc errors.

Sibling cleanup deferred (P3): the engines' inline ductile_iron kc1_1 (USFE 1300 / SFO 1400) is now dead
(canonical governs via sync) -- the 1300/1400 disagreement is moot but the inline-default pattern remains
a maintenance hazard (the audit's broader finding).
```

## Files touched (3)
- mcp-server/src/__tests__/sfc-ductile-iron-kc.test.ts | 65 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/physics/constants.ts                  |  6 ++++++
- 2 files changed, 71 insertions(+)

## Lessons surfaced in commit body
- TILE-IRON-KC (slot:oscar): add canonical ductile/nodular iron kc1.1 -- fix the ~18% cutting-force under-prediction (was silently the gray-iron K-group default)
- tile/nodular iron
- tile_iron"
- tile_iron -> "ductile_iron") fell
- tile iron tougher to

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 58d8567bb6e2`
- Milestone envelope: `mcp-server/data/milestones/SFC-CONVERGENCE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._