---
name: reference_oscar_sfc_wiring_gaps_2to9_2026_06_20
description: "SFC-WIRING-MS0 session 2026-06-20 (slot:oscar): shipped gap#2 (heat_treat_regime->Vc), gap#3 (fail-loud material), + 2 honesty fixes. RE-VERIFIED gap#9 as MOSTLY-FALSE. Discovered the kc-vs-effectiveIso force under-prediction (deferred). Remaining gap map + next phases."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.715Z
aliases: reference_oscar_sfc_wiring_gaps_2to9_2026_06_20
---


SFC-WIRING-MS0 continuation (slot:oscar, 2026-06-20). 4 units shipped on `cad-fusion-live-ms0` from `H:/prism` (NOT the slot worktree -- merge corrupts engines, per prior oscar discipline):

1. **U-SFC-HEATTREAT-CANON-FIX** (`1166e477db`) -- completed an UNCOMMITTED in-flight half-refactor in the working tree: `HeatTreatmentAwareSpeedFeedEngine` had dangling `REGIME_MODIFIERS`/`REGIME_EXPECTED_HARDNESS` refs after the canonical table was added to constants.ts but the lookup sites weren't updated -> `adjust()` threw `ReferenceError` live (HEAD was fine; the break was working-tree-only). De-inlined to `CANONICAL_HEAT_TREAT_REGIME` + hardened the baseline guard (`x<=0` let NaN through -> `Number.isFinite(x)&&x>0`). +5 tests on the EXISTING `HeatTreatmentAwareSpeedFeedEngine.test.ts` (the PascalCase file -- a kebab dup I created was deleted; R8/dedup, scrutiny-B caught it). 21/21.
2. **U-SFC-HEATTREAT-WIRE** (`626481e848`, gap #2) -- when NO measured hardness given, `heat_treat_regime` derives a SINGLE Vc-derate hardness via `regimeExpectedHardnessHb()` feeding the EXISTING `hardnessSpeedFactor` + effectiveIso H-switch. Option C (regime INFORMS the hardness estimate, no 2nd modifier). Measured hardness ALWAYS pre-empts (else-if order) -> NO double-count. `heat_treat_regime?: HeatTreatRegime` input; reaches engine via calc `.passthrough()` schema (R15 dispatcher round-trip test). 8/8 + 85/85 existing green. physics-reviewer + independent reviewer PASS.
3. **U-SFC-MATERIAL-FAILLOUD** (`c127137384`, gap #3 safe core) -- R12 fail-loud: unknown material already warned; the SILENT substring FUZZY-match branch now warns "fuzzy-matched to 'X' -- approximate, VERIFY". Report-only. 4/4. NOTE: `SFCFewShotNewMaterialEngine` (ProtoMAML) needs a SUPPORT SET of prior (customer x material) shop-floor outcomes -- it CANNOT zero-shot infer for a truly unseen material; wiring it into the sample-less sync `calculate()` would be a facade (R12). **Full few-shot adaptation is a gap #10 (outcome-capture) dependency**, deliberately NOT wired.
4. **U-SFC-HARDENED-FORCE-CAVEAT** (`ed91a74f2c`) -- corrected the misleading H-switch warning ("switching to ISO H parameters" implied force switched too). Now honest: Vc/feed switch to ISO-H but the Kienzle force still uses `mat.kc1_1` -> force/power UNDER-predicted for the hardened state. Report-only. 3/3.

## RE-VERIFIED GAP STATUSES (correct the audit before chasing these)
- **gap #2 HeatTreatmentAware: DONE.**
- **gap #3 few-shot/fail-loud: safe core DONE; few-shot deferred (gap #10 dep).**
- **gap #9 cryo/HPC: MOSTLY FALSE (like #1/#4).** `UltimateSpeedFeedEngine` coolant block (~L2155) ALREADY maps `cryogenic->getCoolantVcMultipliers("cryogenic")`, `through_tool->flood`, `air_blast->dry` -- EXPLICIT, documented ("7->5 kind map"). `getCoolantVcMultipliers` supports only dry/flood/mist/MQL/cryogenic (no high_pressure). **`HPCVcBoostCalculator` DOES NOT EXIST** (speculative audit name, like CWEZBuffer/EffectiveDiameterCompensator). `CryogenicCuttingEngine.ts` exists but is not consumed by the headline calc. Residue = an OPTIONAL HPC Vc-BOOST for through_tool (productivity, UN-conservative direction -> needs literature + physics-reviewer = its own unit), NOT a safety bug.

## DISCOVERED SAFETY FINDING (real, deferred -- needs a dedicated force-path unit)
**kc-vs-effectiveIso decoupling:** when `effectiveIso` flips P->H (steel HB>400, ~L2110), the Vc LOOKUP switches to ISO-H but `kienzleCuttingForce(mat.kc1_1, mat.mc, ...)` (~L2383) keeps the BASE-material kc (steel 1800, not H 3200) -> force/power/torque UNDER-predicted on hardened steel (under-conservative power+workholding margins). PRE-EXISTING; affects measured-hardness inputs too. Safe-direction fix = use `CANONICAL_KIENZLE[effectiveIso]` kc/mc for force when the H-switch fires (RAISES force -> tighter clamps); risk is purely gauntlet test re-baselining (cases that encoded the under-predicted force). Force-path change -> physics-reviewer + force-consistency test MANDATORY (2026-06-10 force-collapse regression class). U-SFC-HARDENED-FORCE-CAVEAT surfaces it via warning in the interim.

5. **U-SFC-DEFLECTION-TIMOSHENKO** (`556d2b65d3`, gap #5b) -- upgraded the SFC tool deflection
   Euler-Bernoulli -> Timoshenko (added canonical `toolDeflectionTimoshenko` = bending + Cowper shear
   `kappa=6(1+nu)/(7+6nu)`, + `CANONICAL_TOOL_POISSON` 7-material map + `getToolPoisson`). Report-only
   (gauntlet 206/206 unaffected). Updated the peer deflection-canonical test to Timoshenko intent (R9).
   DEDUP: AdvancedCuttingMathEngine has a multi-segment Timoshenko (fixed kappa=0.9) -- mine is the
   constants-level single-cantilever sibling w/ nu-dependent Cowper kappa (both reviewers PASS).

## REMAINING (dependency order, next sessions -- CHECKPOINTED at iter5/20 for fresh-context quality)
- **kc-vs-effectiveIso force fix** (above) -- highest-value backend safety item; dedicated force-path unit.
- **gap #6** surface-integrity/residual-stress output (additive). `SurfaceIntegrityEngine` has a CLEAN
  `calculate(SurfaceIntegrityInput)` + singleton (input maps cleanly: process/feed_mm_rev/nose_radius/
  cutting_speed/depth/material-by-ISO/coolant -> result.surface_integrity = residual_stress + white_layer
  + fatigue_derating + quality_score) -- easy additive wire. BUT `ResidualStressPredictionEngine` is
  COMPLEX (Hertzian/Thermal/CombinedProfile/Burnishing/PhaseTransform/FatigueImpact sub-methods, NO
  single entry/singleton) -> wire SurfaceIntegrity first ([SCOPED]), ResidualStress as a separate unit.
- **gap #7** wear uncertainty (StochasticToolWearEngine EXISTS; Stochastic/Bayesian bands on Weibull life).
- **gap #8** Deff ball (BallEndMillEngine; Vc-altering -> physics-reviewer).
- **gap #10** outcome-capture sink (closed-loop persistence; unblocks gap #3 few-shot).
- **FRONTEND phase-1** -- needs dev-server + browser; deprecate orphan SpeedFeedPage+useSpeedFeed.
- **FRONTEND phase-1** (operator authorized oscar 2026-06-18, [[reference_oscar_sfc_frontend_build_plan_2026_06_18]]): deprecate confirmed-orphan `SpeedFeedPage`+`useSpeedFeed` (verify no external deep-link, surface to quebec); surface the new uncertainty/advisory signal in the UI; verify port-3100 E2E. THEN prove 100% -> electron + capacitor iOS/Android shells (quebec app-infra, same Vite build).

Relates [[reference_oscar_sfc_wiring_tier1_2026_06_19]] (gap #1/#4 also re-verified false) + [[reference_oscar_sfc_wiring_audit_2026_06_19]] (source audit, ~96 gaps, needs per-gap re-verify).
