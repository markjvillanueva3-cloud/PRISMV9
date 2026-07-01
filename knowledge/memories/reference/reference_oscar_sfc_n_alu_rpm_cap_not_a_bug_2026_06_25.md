---
name: reference_oscar_sfc_n_alu_rpm_cap_not_a_bug_2026_06_25
description: "R12 correction (slot:oscar, 2026-06-25): the SFC 'aluminum ISO-N 3.5x Vc under-prediction' in the 9-axis orchestrator is NOT a physics bug -- 226 m/min is the CORRECT holder-balance-RPM-capped achievable Vc (G6.3/ISO-1940 default 12,000 RPM caps a 6mm tool from 460 to 226). The prior memory's 'material-blind path' root cause is WRONG; the orchestrator resolves the material-aware N table base 460 correctly. The real gap is a comparison-methodology artifact (capped-PRISM vs uncapped-vendor)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.708Z
aliases: reference_oscar_sfc_n_alu_rpm_cap_not_a_bug_2026_06_25
---


**R12 CORRECTION -- the SFC aluminum (ISO-N) "3.5x Vc under-prediction" is NOT a physics bug (slot:oscar, 2026-06-25).**

The prior memory [[reference_oscar_sfc_vendor_parity_run_2026_06_25]] (and Task #13) claimed the
9-axis orchestrator "receives iso_group:N but does NOT use the canonical N milling speed -- it falls
to a material-blind/Taylor-default path that under-predicts aluminum 3.5x." A live formula-trace
reproduction proves that root cause is **WRONG**.

**Live reproduction** (N / 6061 alu / 6mm 3FL carbide / milling finishing / prism_optimized, the exact
`sfc-closed-loop-compare.mjs` N cell; mirrored `speedFeedNineAxisOrchestratorEngine.run(...)` direct):
```
Vc = Vc_base x hardness x strategy x tool_material x coolant
   = 460 x 1.00 x 1 x 1.00 (carbide) x 1.00 (coolant) = 460.0 m/min      <- material-AWARE, correct
n = 460 x 1000 / (pi x 6) = 24,404 RPM
RPM 24404 exceeds machine max 12000 -- capped. Vc adjusted to 226 m/min  <- the 226 comes from HERE
recommendation.cutting_speed_mpm = 226 ; recommendation.spindle_rpm = 12000
```

**What actually happens:**
1. `UltimateSpeedFeedEngine` (the engine the orchestrator reads via `sfc.cutting_speed`) DOES use the
   material-aware ISO-N table: `CUTTING_PARAMS.N_milling_finishing.vc = [305, 460, 915]`
   (`UltimateSpeedFeedEngine.ts:792`). Balanced (the prism_optimized finishing setpoint) = **460 m/min**
   -- a correct, material-aware aluminum surface speed. There is NO material-blind path; the "carbide
   150 * Brinell" theory in the old memory is fabricated.
2. The 226 is purely a **machine-RPM-cap artifact**. The tri-comparator passes NO machine and NO holder,
   so the holder balance class defaults to `g6_3` -> `BALANCE_CLASS_MAX_RPM.g6_3` = **12,000 RPM**
   (`SpeedFeedNineAxisOrchestratorEngine.ts:724` / Axis-6 holder balance; ISO 1940 G6.3 safety limit).
   `translateToUltimate` passes `machine_max_rpm = min(machine.max_rpm ?? Infinity, 12000)` (line 840-843),
   and `UltimateSpeedFeedEngine.ts:2257-2263` caps: a 6mm tool can't reach 460 m/min without 24,404 RPM,
   so Vc is correctly reduced to `pi x 6 x 12000 / 1000 = 226 m/min`. **226 is the SAFETY-CORRECT
   achievable Vc**, not an under-prediction.
3. The vendor "baseline 775" is an **uncapped surface-speed recommendation** (material+tool, no specific
   machine/holder). Comparing PRISM's holder/machine-CAPPED achievable Vc (226) against an UNCAPPED vendor
   surface speed (775) is apples-to-oranges. Even PRISM's UNCAPPED balanced value (460) is below the vendor
   median (775) only because prism_optimized uses BALANCED for finishing (defensible "avoid catalog
   overshoot"); the N table's own aggressive column is 915, bracketing 775. So there is no physics defect
   in EITHER number.

**Do NOT "fix" the physics to report ~800** -- that would break correct aluminum behavior and/or require
softening the G6.3 holder-balance safety cap (oscar refuse_list: `softening-safety-thresholds`). The page
product (`ProductEngine.sfcCalculate` -> 928 m/min) is uncapped because it isn't given the G6.3 holder
constraint -- that divergence is the SAME cap effect, not a second bug.

**The REAL, scoped follow-up (re-scoped Task #13 -> U-OSC-VC-UNCAPPED-PARITY):** the harm is a MISLEADING
comparison, not wrong physics. Fix = expose the pre-cap recommended Vc as an additive structured field on
the UltimateSpeedFeed/orchestrator result + a `rpm_capped` flag, and have the tri-comparator report
"PRISM 226 (RPM-capped from 460 @ G6.3 12k) vs baseline 775" so the parity is apples-to-apples and a future
reader is never misled into chasing a phantom physics bug again. Additive only (no existing number changes
-> 401-gauntlet + page-product safe); physics-review the engine field.

Sibling/corrected: [[reference_oscar_sfc_vendor_parity_run_2026_06_25]] (its N-cell root-cause section is
SUPERSEDED by this finding). Methodology: [[sfc-jm-program-accuracy-methodology]].
