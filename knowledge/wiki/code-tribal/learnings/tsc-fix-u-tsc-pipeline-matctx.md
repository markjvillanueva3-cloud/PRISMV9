# TSC-FIX/U-TSC-PIPELINE-MATCTX — [MAIN] [TSC-FIX]/U-TSC-PIPELINE-MATCTX: MaterialEntry->context adapter + 3 canonical ISO tables (-13)

**Commit:** `4eb6ce33b0c3` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T13:22:43-05:00
**Tags:** tsc-fix, u-tsc-pipeline-matctx, auto-distilled

## Subject
[MAIN] [TSC-FIX]/U-TSC-PIPELINE-MATCTX: MaterialEntry->context adapter + 3 canonical ISO tables (-13)

## Body
```
[MAIN] [TSC-FIX]/U-TSC-PIPELINE-MATCTX: MaterialEntry->context adapter + 3 canonical ISO tables (-13)

PipelineRegistryBridge.materialPhysicsToContext() was typed for
MaterialPhysics but called with MaterialEntry (the actual
CANONICAL_MATERIAL_DB shape), and read fields (k_thermal, sigma_y_MPa,
hardness_HB, vc_base_*, machinability_factor, cp_J_kgK, E_GPa) present
on NEITHER type -> 13 errors (3x TS2345 param-mismatch, TS2339 missing
props, TS2322 undefined-not-assignable). Plus CANONICAL_MATERIAL_DB
['steel'] fallback used a non-existent key (undefined -> name crash).

Fix (proper derivation, zero invented physics):
- Added 3 canonical ISO-keyed tables to physics/constants.ts (additive,
  critical-file-guard acknowledged):
    WORKPIECE_ELASTIC_MODULUS_GPA  (ASM Vol.2: P210/M200/K110/N70/S205/H215)
    YIELD_TO_TENSILE_RATIO         (Shigley A-20: P.60/M.65/K.90/N.85/S.85/H.90)
    MACHINABILITY_FACTOR_BY_ISO    (Sandvik index norm P=1.0)
- Renamed materialPhysicsToContext -> materialEntryToContext(mp:MaterialEntry);
  derives every ResolvedMaterialContext field from canonical sources:
    kc1_1/mc        <- CANONICAL_KIENZLE[iso]
    k_thermal       <- thermal_conductivity_W_mK
    cp_J_kgK        <- specific_heat_J_kgK
    E_GPa           <- WORKPIECE_ELASTIC_MODULUS_GPA[iso]
    sigma_y_MPa     <- tensile x YIELD_TO_TENSILE_RATIO[iso] (fallback HB-Brinell)
    hardness_HB     <- HRC->HB ASTM E140 linear (5.97*HRC+104.7) or UTS/3.45
    vc_base_*       <- CANONICAL_TURNING_SPEEDS[iso]
    machinability   <- MACHINABILITY_FACTOR_BY_ISO[iso]
  All derivation constants named + literature-cited (no inline magic).
- Fixed CANONICAL_MATERIAL_DB['steel'] -> ['1045'] (steel is not a
  canonical key; 1045 is the AISI_ALIAS target for generic carbon steel)
  -> kills the undefined-fallback name crash.

737 errors (was 750, -13). PipelineRegistryBridge 13->0. esbuild clean.
constants.ts edit ADDITIVE-only (3 new exports, no existing constant
modified).
```

## Files touched (3)
- mcp-server/src/engines/PipelineRegistryBridge.ts | 88 +++++++++++++++++++-----
- mcp-server/src/physics/constants.ts              | 24 +++++++
- 2 files changed, 94 insertions(+), 18 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4eb6ce33b0c3`
- Milestone envelope: `mcp-server/data/milestones/TSC-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._