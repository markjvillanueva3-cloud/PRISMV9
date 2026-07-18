# UNIT-0007 half 2 -- DSA force-correction APPLY recipe (turnkey; blocked only on CONFIRM_CRITICAL)
_Author: oscar (slot claude-0f2af1d8) - 2026-07-02. Half 1 (force_correction_factor exposed) shipped in U-OSC-UNIT0007-DSA-FORCE-FACTOR with an independent physics-reviewer PASS. Half 2 (apply to Fc) is fully specified below; the ONLY blocker is the CONFIRM_CRITICAL gate on constants.ts (machining-safety-critical file, operator-authorization). Every step is reviewer-required + reviewer-approved._

## Independent physics-reviewer verdict (opus, read-only, 2026-07-02): PASS
- Window bounds PASS: carbon/low-alloy steel [200-400 C, peak 300] = textbook blue-brittleness (Baird 1971; Rodriguez 1984; Cottrell-Bilby 1949); austenitic 300-series [250-600, peak 450] = documented serrated/PLC flow (Hong-Lee 2005; Mannan 1993). Both inside published ranges.
- Magnitude PASS: +15% peak Fc is conservative -- DSA flow-stress elevation is ~10-30%, but cutting-FORCE elevation is DAMPED vs peak local flow stress (force integrates over a gradient zone); +15% with +/-8% (spans ~7-23%) is central-to-lower + safe.
- Form PASS: multiplicative (kc x factor) is the correct coupling; triangular severity (0 at edges, 1 at peak_C) is a sound first-order shape (minor under-coverage on shoulders + at high strain rate = SAFE, not unsafe).
- Safe direction PASS: factor>=1 -> Fc up -> P=Fc*Vc up -> SFC backs off Vc/ap to meet caps -> MORE conservative. Correct posture for an uncertain correction.
- K/N/S/H unsupported PASS: factor 1.0 (no fabricated window) is correct. INFO: a sourced S (Inconel 718 DSA ~300-700 C, Nalawade 2008) window would ADD coverage later; omission is safe.
- NO double-count: DSA modeled nowhere else; distinct from the Backer-Marshall-Shaw size-effect force_correction_factor in AdvancedCuttingPhysicsEngine.ts:341.
- NO magnitude or form change required. Approved to APPLY subject to the 4 conditions below.

## APPLY recipe (execute after the operator sets CONFIRM_CRITICAL=true)

### Step 1 (reviewer condition 2) -- migrate constants to src/physics/constants.ts (CONFIRM_CRITICAL)
Add an ADDITIVE block after CANONICAL_TAYLOR_LIFE_CV (no existing Kienzle/Taylor value changes). Matches the CTE_LINEAR_BY_ISO / CANONICAL_TAYLOR_LIFE_CV pattern (small ISO-keyed physics tables that already live in constants.ts):
```
export type DSAMaterialClassKey = "carbon_steel"|"low_alloy_steel"|"austenitic_stainless"|"ferritic_stainless"|"other";
export interface DSAWindowBandC { lo_C: number; hi_C: number; peak_C: number; unc_C: number; }
export const CANONICAL_DSA_WINDOWS: Record<DSAMaterialClassKey, DSAWindowBandC|null> = {
  carbon_steel:{lo_C:200,hi_C:400,peak_C:300,unc_C:40}, low_alloy_steel:{lo_C:200,hi_C:400,peak_C:300,unc_C:40},
  austenitic_stainless:{lo_C:250,hi_C:600,peak_C:450,unc_C:60}, ferritic_stainless:{lo_C:200,hi_C:450,peak_C:325,unc_C:60},
  other:null,
} as const;
export const DSA_FORCE_PEAK = 0.15;  // conservative +15% peak Fc (Baird 1971 / Rodriguez 1984)
export const DSA_FORCE_UNC = 0.08;   // +/-8% band (~7-23%)
```
Then DynamicStrainAgingEngine.ts imports these (delete its inline DSA_WINDOWS/DSA_FORCE_PEAK/DSA_FORCE_UNC).

### Step 2 (reviewer condition 1) -- apply as an Fc MULTIPLIER ONLY in productSFC
In ProductEngine.productSFC, MOVE the DSA compute (currently ~line 1150, after safety scoring) to right AFTER the Kienzle forceResult (~line 1057, BEFORE calculateSafetyScore), then:
```
const dsaTempC = calculateCuttingTemperature(vc, fz, ap, forceResult.specific_force).cutting_temperature;
const dsa = dynamicStrainAgingEngine.assess({ iso_group: isoGroup as ..., cutting_zone_temp_C: dsaTempC });
if (dsa.in_dsa_window && dsa.force_correction_factor > 1) {
  forceResult.Fc *= dsa.force_correction_factor;
  forceResult.power *= dsa.force_correction_factor;
  forceResult.torque *= dsa.force_correction_factor;
}
```
CRITICAL: multiply Fc/power/torque ONLY. NEVER multiply vc/fz/ap/mrr (that inverts the safe direction). Keep the existing advisory warning push. Everything downstream (safety scoring, uncertainty, reported Fc/power) then sees the corrected force naturally.

### Step 3 (reviewer condition 3) -- propagate the +/-8% factor uncertainty
In the uncertainty block (~ProductEngine.ts:1168-1187), widen force_range / power band by RSS-combining the existing uncertaintyFactor with dsa.force_correction_uncertainty when in-window, and feed it into the S(x) force-margin term.

### Step 4 (reviewer condition 4) -- no double-count: ALREADY MET (verified).

## Verification to run after applying
- npx vitest run ProductEngine.test.ts (extend: 1045 carbide in-window -> cutting_force_N ~15% higher than the same cut forced out-of-window; power scales with it; mrr/rpm UNCHANGED).
- npx vitest run the DSA + SFC-sibling suites.
- node scripts/sfc-exhaustive-combinatorial-sweep.mjs --grid 6 --max 20000 -> oracle must stay 0 (force rise keeps Fc>0; SUSPECT bands are vc/rpm/life, unaffected).
- Confirm no stop_on_inlined_constants flag (constants now imported from constants.ts).
