# SFC-WIRING-MS0/U-SFC-PSTEEL-VC-CEILING — [MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-PSTEEL-VC-CEILING (slot:oscar): raise P_milling_roughing aggressive Vc 185->220 m/min

**Commit:** `9d97e4aa12fd` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T11:46:08-05:00
**Tags:** sfc-wiring-ms0, u-sfc-psteel-vc-ceiling, auto-distilled

## Subject
[MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-PSTEEL-VC-CEILING (slot:oscar): raise P_milling_roughing aggressive Vc 185->220 m/min

## Body
```
[MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-PSTEEL-VC-CEILING (slot:oscar): raise P_milling_roughing aggressive Vc 185->220 m/min

GAP-1 from the SFC-vs-GWizard/HSMAdvisor validation: P-group steel roughing Vc
ceiling under-calibrated vs modern coated carbide (CONFIRMED under-calibration,
aggressive index only, per physics-reviewer adjudication b15fca0efc).

Change (UltimateSpeedFeedEngine.ts:737, CUTTING_PARAMS):
  P_milling_roughing.vc [90,140,185] -> [100,160,220]  (m/min, 12mm endmill)

Why:
- Sandvik P-steel general roughing 150-250 m/min; Kennametal/Walter comparable.
- Reconciles the engine to its OWN canonical baseline: physics/constants.ts
  CANONICAL_MILLING_SPEEDS.P.rough=200 -- old aggressive 185 was BELOW canonical
  200 (an inversion); new 220 >= 200.
- SAFE: Vc is absent from the Kienzle force path (Fc = kc1.1*ap*h, h=hex_mm) ->
  deflection/torque/workholding clamps PROVABLY unchanged. Vc enters only RPM,
  power, thermal, Taylor life.
- RPM-gated on JM hardware: 12mm tool @ 5000rpm cap = Vc 188.5, so 220 never
  actuates there; headroom for higher-RPM spindles. Clamp at
  UltimateSpeedFeedEngine.ts:2173-2179 recomputes Vc down when rpm>maxRPM.

Verification:
- Tests: 157 passed | 1 todo (UltimateSpeedFeedEngine.test.ts + .variability).
- physics-reviewer: PASS (4 axes confirmed from source, 0 P0/P1).
- code-analyzer arm B: PASS (diff = 1 ins/1 del, no collateral, no test softened).

Follow-up queued (SFC-WIRING-MS0): CuttingDataLookupEngine.ts:125 has a SEPARATE
unsynced P_milling_roughing table (vc_sfm ~137 balanced) -- latent parallel-path
divergence to reconcile in a later unit.

Refs: state/shared/specs/SFC-VS-GWIZARD-HSMADVISOR-2026-06-19.md
```

## Files touched (2)
- mcp-server/src/engines/UltimateSpeedFeedEngine.ts | 2 +-
- 1 file changed, 1 insertion(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9d97e4aa12fd`
- Milestone envelope: `mcp-server/data/milestones/SFC-WIRING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._