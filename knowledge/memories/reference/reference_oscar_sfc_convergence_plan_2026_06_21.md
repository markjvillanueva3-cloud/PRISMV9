---
name: reference_oscar_sfc_convergence_plan_2026_06_21
description: "Line-cited convergence plan (slot:oscar, 2026-06-21, operator-approved): make SpeedFeedOrchestratorEngine.compute() delegate CORE PHYSICS to UltimateSpeedFeedEngine.calculate() (single source of truth), retain orchestrator-only layers. Delegation scope + 4 HIGHEST-RISK coupling points + staged phases + the production re-baseline warning. Major refactor -> staged fresh-context execution, physics+safety review per stage."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.698Z
aliases: reference_oscar_sfc_convergence_plan_2026_06_21
---


**SFC CONVERGENCE PLAN (slot:oscar, 2026-06-21, operator-approved direction = CONVERGE).**
Make `SpeedFeedOrchestratorEngine.compute()` (the engine behind the web UI via `prism_calc:sf_orchestrate`) delegate its CORE PHYSICS to `UltimateSpeedFeedEngine.calculate()` (the engine all SFC-WIRING-MS0 work targets) -> single physics source of truth, ends the divergence ([[reference_oscar_sfc_two_engine_divergence_2026_06_21]]). Full line-cited map in the session transcript (Explore recon 2026-06-21).

## Delegation scope (orchestrator -> engine)
DELEGATE the core-physics block (SpeedFeedOrchestratorEngine.ts stages 2-3, L2573-2854): Vc, RPM, fz, Vf, ap, ae, MRR, Kienzle Fc, power, torque, Taylor life, Ra, deflection. UltimateSpeedFeedEngine.calculate() already produces all of these (+ thermal, ball_end_effective, surface_integrity, FOSM tool_life uncertainty -- the new fields).
RETAIN orchestrator-only (NOT in the engine): 8 context resolvers (L2496-2527), proven-program blending (L2641-2663), MC uncertainty 500-trial (L1894-2141), Sobol decomposition (L2109-2140), Weibull, safety-reduction loop (L2856-3091), playbook 296 rules (L3279-3392), alternatives, PSN provenance, calibration overrides, tribal tips, OrchestratorResult assembly (L3395-3457).

## 4 HIGHEST-RISK coupling points (physics+safety review MANDATORY each)
1. **MC uncertainty (L1894-2141)**: orchestrator wraps base Kienzle/Taylor/Ra in 500 Gaussian-perturbed trials -> force_ci95/life_ci95/ra_ci95 (the UI's uncertainty panel). The engine returns POINT estimates, not distributions. Options: (a) post-hoc apply the engine's own uncertainty (engine has uncertainty.{force,tool_life,surface_finish}.{ci_95_low,ci_95_high,cv_pct} -- shape MISMATCH: engine object vs UI [low,high] tuple); (b) keep the orchestrator MC loop wrapping engine inputs (slow); (c) expose engine.calculateStochastic(). DECISION NEEDED.
2. **Calibration double-deration (L2806/2823/2840)**: orchestrator applies kc1_1_factor/taylor_c_factor/ra_factor (INFRA-5-1 U-CAL1 feedback) AND the engine applies its own hardness H-switch + material speed factors. Delegating risks DOUBLE-counting. Need a suppress-flag or documented order-of-application.
3. **Proven-program blending (L2641-2663)**: orchestrator blends 60% proven-Vc + 40% physics when proven.confidence>=0.7. SOLUTION: keep PRE-physics in orchestrator, pass the blended Vc to the engine as input `cutting_speed_mpm` (engine honors it, L2214).
4. **Safety-reduction loop (L2856-3091)**: orchestrator reduces Vc on a failed safety check then RE-computes force/power/life. Post-delegation it must re-call engine with the reduced params.

## Shape mismatches (mapping layer)
- CI95: engine `{ci_95_low,ci_95_high,cv_pct}` -> UI `[low,high]` tuple.
- Weibull / Sobol / ra_cpk / p_chatter: orchestrator-unique, NOT in engine result -> retain post-physics.
- alternatives: both have conservative/balanced/aggressive but different field names.
- Input: OrchestratorInput vs UltimateSpeedFeedInput mostly name-compatible; engine MISSING machine_name/tool_grade/cam_strategy/calibration_overrides (orchestrator resolves these to scalars first); ADD heat_treat_regime passthrough.

## Staged execution (fresh context, commit per stage, physics+safety review each)
- P1: input adapter OrchestratorInput -> UltimateSpeedFeedInput (translation layer, test round-trip).
- P2: delegate core physics (Vc..deflection) to engine.calculate(); map to OrchestratorResult; RESOLVE calibration double-count (risk #2) + proven-blend-via-input (risk #3). **This re-baselines production UI numbers -> full regression + numeric diff vs current output, operator sign-off on the shifts.**
- P3: resolve MC uncertainty (risk #1) -- decide (a)/(b)/(c); preserve force_ci95/life_ci95 UI contract.
- P4: safety-loop re-entry (risk #4) re-calls engine with reduced params.
- P5: forward the NEW fields (ball_end_effective/surface_integrity/thermal/FOSM cv) into OrchestratorResult + web/src/types/speedfeed.ts + render in SpeedFeedPage.tsx.

## WARNINGS
- The orchestrator's compute() has NO direct unit-test coverage (only consultNN + dispatcher integration) -> WRITE a numeric-regression harness BEFORE refactoring (snapshot current OrchestratorResult for N representative inputs, assert post-refactor within tolerance or operator-approved shift).
- Consumers: calcDispatcher sf_orchestrate/sf_quick (L6795), camDispatcher LatheSpeedFeed (L12413).
- Coordinate quebec (frontend-app) for P5. Builds on [[reference_oscar_sfc_wiring_session2_2026_06_20]].
