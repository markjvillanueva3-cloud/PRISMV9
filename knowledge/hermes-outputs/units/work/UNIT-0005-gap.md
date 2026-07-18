# UNIT-0005 — Strain Rate Effects and Serrated Chip Formation — GAP ANALYSIS
_Analyst: oscar (speed-feed domain expert) · 2026-07-02 · evidence-cited per R12_

## Existing coverage
The deliverables "StrainRateEngine + SerratedChipPredictor" both already exist under different names, wired and tested:

- **Serrated-chip onset (mechanistic)**: `AdvancedCuttingPhysicsEngine.rechtShearInstability` — `mcp-server/src/engines/AdvancedCuttingPhysicsEngine.ts:354-419`: Recht (1964) catastrophic thermoplastic shear with Merchant shear angle (`:369`), shear strain + strain rate (`:379-381`), adiabatic shear-zone temperature via Taylor-Quinney (`:383-387`), strain-hardening vs thermal-softening rate competition (`:389-401`), instability parameter χ (`:404`), critical speed (`:409-411`), and **segmentation spacing + frequency** (`:413-419`). Wired: `camDispatcher.ts:7074` (`sci_recht_shear`, enum at `:1684`). Tested: `src/__tests__/exhaustive-science-batch3.test.ts:129-146` (Ti vs Al material discrimination).
- **Chip morphology classifier**: `mcp-server/src/algorithms/ChipTypePredictionModel.ts:63-100` — Ernst-Merchant 5-type classifier (continuous/lamellar/segmented/discontinuous/BUE) with segmented rule at hardness>350 HB or ISO S (`:98-100`), Recht + Komanduri citations (`:25-27`), shim-equivalent to `UltimateSpeedFeedEngine.predictChipType` (test `ChipTypePredictionShimEquivalence.test.ts`, Glob-verified).
- **Strain-rate sensitivity per material group**: JC rate term `[1 + C·ln(ε̇/ε̇₀)]` for 60+ alloys across 6 categories (steels/stainless/aluminum/titanium/nickel/copper) — `JohnsonCookEngine.ts:152-154, :47-122`; exceeds the "≥4 material groups" criterion. Machining-regime strain rates 10³-10⁵/s estimated in `UltimateSpeedFeedEngine.ts:2999-3002`.
- **prism_calc strain-rate exposure**: `thick_shear_zone` returns `strain_rate_per_s` + shear strain + zone thickness (`calcDispatcher.ts:108-109`); `piispanen_shear_strain` (`:104`); `chip_formation` (`:100`), `chip_diagnose` (`:102`), `chip_formation_predict` (`:9283`); `jc_flow_stress` with explicit strainRate input (`:1956-1963`).
- **Knowledge layer**: `knowledge/hermes-outputs/oscar-sfc-serrated-chip-formation-wiki.md` (ls-verified); system-viz node "Serrated Chip Formation (OSCAR)" L8/built (graph pre-check).

## Real gaps
1. **Routing mismatch, not capability**: the mechanistic serrated-chip predictor is wired under `prism_cam:sci_recht_shear`, not `prism_calc:strain_rate_*` as the unit specifies. A calc-side action (or documented pointer) is the only wiring delta. No `strain_rate_*` action namespace exists in calcDispatcher (grep of case labels).
2. **Uncertainty not carried on the serrated outputs**: shear-band width is an empirical shortcut (δ_s = 1% of feed, `AdvancedCuttingPhysicsEngine.ts:380`) and the segmentation-spacing formula is flagged empirical in-code (`:414-416`) — the outputs are point values without uncertainty bands, which violates speed-feed publish-with-uncertainty doctrine if surfaced as a recommendation.
3. **"<8% error on real JM Die chips" is unvalidatable today** — no chip photo/measurement dataset exists in the repo (JM DIE corpus is NC programs). Criterion needs re-basing (e.g., qualitative morphology agreement vs the classifier on known-material jobs) or a chip-sample acquisition dependency declared.
4. `algorithms/JohnsonCookModel.ts:379` self-documents "Strain localization (adiabatic shear bands) not modeled" — true for that module, but SUPERSEDED by the Recht engine above; the note should cross-reference to prevent a future duplicate build (this is exactly how UNIT-0005 got specced as "build").

## Verdict
**wire-only**

## Recommended next action
Add a thin `prism_calc` exposure for the existing physics rather than building anything: route a new calc action (e.g., `serrated_chip_predict` or the spec's `strain_rate_*` namespace) to `AdvancedCuttingPhysicsEngine.rechtShearInstability` via lazy import, round-trip-test it through the dispatcher per R15, and — since it is a stability/force-adjacent formula surface — have physics-reviewer confirm no formula change occurs during wiring (refuse-list: skipping-physics-reviewer-on-force-or-stability-formula). In the same commit, attach uncertainty annotations to the two empirical terms (δ_s, segmentation spacing) so any surfaced prediction carries confidence, add a cross-reference note in `JohnsonCookModel.ts:379` pointing at the Recht engine, and re-base the validation criterion on the classifier-vs-Recht consistency invariant (both must agree on segmented onset for ISO S / >350 HB materials) plus tri-compare sanity, declaring chip metrology as an operator data dependency.

## ROI
**6/10** — a few hours of pure wiring + annotation unlocks an already-built, already-tested mechanistic predictor to its natural consumer (prism_calc/SFC), and kills a documented duplicate-build trap; capped below 8 because true chip-morphology validation stays blocked on data acquisition.
