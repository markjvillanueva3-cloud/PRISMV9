# UNIT-0003 — Material Behavior Modeling (Core Physics) — GAP ANALYSIS
_Analyst: oscar (speed-feed domain expert) · 2026-07-02 · evidence-cited per R12_

## Existing coverage
The unit says "Build the core material behavior engine" — that engine substantially exists, distributed but wired:

- **Johnson-Cook constitutive model (strain hardening + strain-rate sensitivity + thermal softening)**: `mcp-server/src/engines/JohnsonCookEngine.ts:138-170` (`calculateFlowStress`, full σ = [A+Bε^n][1+C·ln(ε̇/ε̇₀)][1−T*^m]) over a **60+ alloy parameter DB across 6 categories** (`:47-122`). Wired to prism_calc as `jc_flow_stress / jc_params / jc_search / jc_list` (`calcDispatcher.ts:599, 1956-1983`).
- **Second (deprecated duplicate) JC engine**: `mcp-server/src/engines/JohnsonCookConstitutiveEngine.ts:1-8` — header explicitly documents it as a no-/dedup duplicate with **divergent constants** (Ti6Al4V A=850/B=350/m=0.82 vs A=862/B=331/m=0.80) and names a pending `U-JC-CONSTANT-RECONCILE` unit. Third implementation: `mcp-server/src/algorithms/JohnsonCookModel.ts` (body PARTIAL-UNVERIFIED; `:379` notes adiabatic shear bands unmodeled).
- **Work hardening (behavioral)**: `UltimateSpeedFeedEngine.ts:534` `work_hardening_tendency` graded none→severe per material profile, driving recommendations (`:3131-3135`, e.g. 304 SS "NEVER dwell — work hardens" `:583`).
- **Strain-rate effects at machining conditions**: machining strain ≈1-3, strain rate 10³-10⁵/s estimated and fed to JC flow stress in `UltimateSpeedFeedEngine.ts:2999-3002` (+ inline JC at `:1702-1705`); shear-zone strain rate exposed via `thick_shear_zone` action (`calcDispatcher.ts:108-109`).
- **Phase transformations (machining-relevant)**: white-layer risk surfaced via `surface_integrity_predict` (`calcDispatcher.ts:210-211`) and `UltimateSpeedFeedEngine.ts:375, 3270` (residual stress / white layer / fatigue sub-result). Files matching phase-transformation/martensite terms: `LatheThermodynamicsEngine.ts`, `HardTurningDecisionEngine.ts`, `CryogenicCuttingEngine.ts`, `WEDMHeatAffectedZoneEngine.ts` (grep-matched; bodies PARTIAL-UNVERIFIED).
- **Kienzle/Taylor canonical constants**: `physics/constants.ts:40` (`CANONICAL_KIENZLE`), `:63` (`CANONICAL_TAYLOR`), with per-material denormalisation (`:1414-1415`).
- **ISO P/M/K/N/S/H coverage**: JC DB categories map to steels(P), stainless(M), aluminum/copper(N), titanium/nickel(S) (`JohnsonCookEngine.ts:47-122`); K (cast iron) and H (hardened) covered behaviorally via material profiles + `CANONICAL_KIENZLE` but **no JC params for K/H alloys** in the DB.

## Real gaps
1. **Dynamic strain aging (DSA / Portevin-Le Chatelier / blue-brittleness) is genuinely unmodeled** — grep `strain.?aging` over `mcp-server/src` returns ZERO matches. This is a real physics gap (matters for carbon steels 200-400°C and 300-series SS force/finish anomalies). NOTE: UNIT-0007 owns work-hardening+DSA — deconflict before building here (R7).
2. **JC constant divergence unresolved**: the documented `U-JC-CONSTANT-RECONCILE` (JohnsonCookConstitutiveEngine.ts:3-8) is still open — two engines carry different published values for the same alloys. Safety-relevant: force predictions differ by source. Also the 60-alloy JC table is inlined in the engine body, not in `src/data/` per engine conventions (`src/engines/.claude/CLAUDE.md`: "Large lookup tables belong in src/data/ catalogs").
3. **No JC params for ISO K (cast iron) and H (hardened steel) groups** in `JohnsonCookEngine.ts` DB.
4. **Validation criterion infeasible as written**: "predicted vs measured force error <5% on 10 JM jobs" requires dynamometer data that does not exist in the repo (JM DIE corpus = NC programs/customers, not force measurements). Existing substrate: mined proven S/F + calibration actuals + vendor tri-compare (`speed-feed/CLAUDE.md:89-95`). Any force-parity claim must carry uncertainty (refuse-list: publishing-a-speed-feed-without-uncertainty).
5. **No `material_behavior_*` action namespace** — functional coverage exists under `jc_*`/`flow_stress`; naming-only gap, an alias would add no capability.

## Verdict
**extend**

## Recommended next action
Do NOT create MaterialBehaviorEngine.ts — duplication guard would (correctly) block it; the five "core material models" the unit demands already exist wired (JC flow stress, Kienzle force, Taylor life, work-hardening grading, white-layer/surface-integrity). Instead execute three surgical extensions on the existing stack: (1) close `U-JC-CONSTANT-RECONCILE` — pick one published source per alloy, relocate the JC table to `src/data/johnson-cook-params.ts` (or constants.ts with operator confirmCritical), and delete-by-deprecation the divergent copy, with physics-reviewer sign-off since it changes force-formula inputs; (2) add a DSA correction term (coordinate with UNIT-0007 to avoid double-build) and K/H-group JC entries; (3) re-base the validation criterion on data PRISM has: JC-vs-Kienzle force cross-check invariants + tri-compare vendor parity with reported uncertainty bands, and log measured-force acquisition as an operator dependency.

## ROI
**7/10** — the JC reconciliation is cheap (~2-3 h) and removes a documented silent-wrong-force hazard; DSA + K/H params are moderate effort with real accuracy payoff for stainless/hard-part work; skipping the redundant engine build saves the whole nominal 6-8 h estimate.
