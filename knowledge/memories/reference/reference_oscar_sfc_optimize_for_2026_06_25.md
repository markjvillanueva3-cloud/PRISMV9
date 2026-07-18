---
name: reference_oscar_sfc_optimize_for_2026_06_25
description: "SFC optimize_for goal selector (slot:oscar, 2026-06-25): cost/balanced/productivity lever added to ProductEngine.sfcCalculate (engine) + wired through the web request layer. The fix for the page's pinned-conservative recommendation. U-SFC-OPTIMIZE-FOR-ENGINE + U-SFC-OPTIMIZE-FOR-REQUEST."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.709Z
aliases: reference_oscar_sfc_optimize_for_2026_06_25
---


**SFC `optimize_for` goal selector (slot:oscar, 2026-06-25).** The customer SFC page
(`/speed-feed-calc` -> `prism_product:sfc_calculate` -> `ProductEngine.sfcCalculate`) returned ONE
recommendation with no way to trade tool life vs MRR -- the root of the "appears ~33% under catalog"
conservatism (spec `SFC-VS-GWIZARD-HSMADVISOR-2026-06-19.md` s3+s6). Shipped a cost/balanced/productivity
lever in two logically-ordered units (engine core first, then request wiring -- R13).

**Design decision (R8/R7 -- blast-radius confinement).** The shared `calculateSpeedFeed`
(ManufacturingCalculations.ts) is consumed by **54 sites across 12 files** -- modifying it for one
product page was rejected. The lever is confined to `ProductEngine.sfcCalculate` (the page's path):
after `calculateSpeedFeed` returns the band-anchored vc/fz, a `SFC_GOAL_SCALERS` multiplier is applied
BEFORE the machine clamp + Kienzle/Taylor/MRR/safety calc, so the machine ceiling still overrides the
goal and every published number reflects it. `balanced` (or absent/unknown) short-circuits the scaling
block -> byte-identical to prior behavior (regression-locked).

**The scalers are PRODUCT-POLICY, not physics constants** (physics-reviewer explicitly adjudicated this
-- they are dimensionless UI-slider preferences, the G-Wizard/HSMAdvisor conservative<->aggressive
analog; Kienzle/Taylor/material values still import from physics/constants.ts). Bounded +/-15% to stay
in-band: cost {vc 0.85, fz 1.0} / balanced {1.0, 1.0} / productivity {vc 1.15, fz 1.10}. LIVE (1045
carbide slot, D12 ap4 ae6): cost Vc170 MRR64.9 life17.3min / balanced Vc200 MRR76.4 life9.0min /
productivity Vc230 MRR96.6 life5.0min -- all `safe`. Cost nearly DOUBLES tool life for a 15% speed cut
(classic Gilbert cost-optimum Vc < max-production Vc; Taylor T=(C/Vc)^(1/n) super-linear).

**Wiring (the silent-drop bug class this whole session fought).** `SFCInput.optimize_for` (engine) ==
`SfcCalculateRequest.optimize_for` (web) == the `buildSfcCalcRequest` 5th param -- EXACT union match
`"cost"|"balanced"|"productivity"`, no field-name drift. Both scrutiny arms traced the full survive-path:
web request -> route `src/routes/sfc.ts` forwards `req.body` whole -> `sfc_calculate` Zod schema is
`.passthrough()` (does NOT strip the unknown key) -> `normalizeParams` is additive-only -> dispatcher
forwards the original `params` (not `validation.data`) -> `sfcCalculate` reads `params.optimize_for ??
"balanced"`. The field reaches the engine unstripped. Scoping verified correct: `optimize_for` is read
only by `sfcCalculate`; `sfcOptimize` has its own `objective` grid-search, `sfcCompare` compares tool
materials, `sfcSafety` scores a fixed cut -- a goal scaler on those would be redundant/meaningless.

**STILL OPEN (iter 8):** the page `<select>` UI -- `SfcCalculatorPage.tsx` line ~134 is the ONLY
production caller of `buildSfcCalcRequest` (4-arg today); add an `optimizeFor` state + a styled
cost/balanced/productivity select (design tokens, NO inline hex) + pass it as the 5th arg. Visual
screenshot-verify is operator-pending if not run headless. Sibling: [[reference_oscar_sfc_page_dropped_inputs_2026_06_25]].

**LESSON:** when a capability lives in a SHARED low-level function with many consumers, confine a
product-specific behavior change to the product engine layer (default-preserving), not the shared
function -- and prove backward-compat with a byte-identical-identity regression test. Tests: 17/17
ProductEngine.test.ts + 6/6 buildSfcRequest.test.ts.
