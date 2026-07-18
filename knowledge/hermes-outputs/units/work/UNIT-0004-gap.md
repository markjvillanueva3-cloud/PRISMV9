# UNIT-0004 — Tool Wear Mechanisms and Prediction — GAP ANALYSIS
_Analyst: oscar (speed-feed domain expert) · 2026-07-02 · evidence-cited per R12_

## Existing coverage
The unit demands "4 wear mechanism models (diffusive, adhesive, abrasive, chemical) + BUE + tool life prediction, wired to prism_calc and prism_safety." All four mechanisms exist as real physics engines, already wired:

- **Diffusive**: Fick's-law crater wear with Arrhenius diffusion params per tool/work pair — `mcp-server/src/engines/AdvancedWearPhysicsEngine.ts:6` (model list), `:25-29` (`DIFFUSION_PARAMS` D0/Q for carbide/cermet/ceramic × steel/stainless/titanium), `:53-68` (FickCrater I/O types).
- **Abrasive**: Rabinowicz model — `AdvancedWearPhysicsEngine.ts:9, :106-120` (hardness-ratio wear volume/depth/severity).
- **Chemical (oxidation)**: notch wear = oxidation + mechanical components with dominant-mechanism output — `AdvancedWearPhysicsEngine.ts:7, :70-85`.
- **Adhesive**: `mcp-server/src/engines/ArchardAdhesiveWearEngine.ts` (Glob-verified file; body PARTIAL-UNVERIFIED) — wired as `archard_wear` returning `dominant_mechanism` (`calcDispatcher.ts:220-221`).
- **Combined/progression/stochastic tool life**: Takeyama-Murata combined mechanisms + flank-wear RK4 ODE + Kannatey-Asibu stochastic life + log-normal MLE censored-data fitting (`AdvancedWearPhysicsEngine.ts:5-12, :87-104`); plus `ToolWearRateEngine.ts`, `StochasticToolWearEngine.ts`, `ToolWearProgressionEngine.ts`, `ThermalWearCouplingEngine.ts`, `TurningWearPredictionEngine.ts`, `ToolWearCompensationEngine.ts`, `WearForceCompensationEngine.ts`, `AdaptiveWearEngine.ts` (Glob-verified filenames; bodies PARTIAL-UNVERIFIED) with dispatcher test `src/__tests__/dispatcher.turningWearPrediction.test.ts` (Glob-verified).
- **Taylor tool life canonical**: `physics/constants.ts:63` `CANONICAL_TAYLOR` (ISO 3685:1993 cited `:919`), `:114` life CV, `:1252` extended-Taylor exponents; `tool_life` case `calcDispatcher.ts:40`.
- **BUE (empirical)**: speed thresholds per material `UltimateSpeedFeedEngine.ts:1347` + `ChipTypePredictionModel.ts:65-70`; BUE as predicted wear mechanism `UltimateSpeedFeedEngine.ts:2786`; warnings/mitigations `:2977-2978, :3134-3135`. Wiki: `knowledge/hermes-outputs/oscar-sfc-built-up-edge-modeling-wiki.md` (ls-verified).
- **prism_calc wiring**: `wear_progression` (`calcDispatcher.ts:64, :8701`), `wear_prediction` (`:202`), `wear_force_correction` (`:222, :8756`), `tool_wear_rate` (`:5262`), `stochastic_wear` (`:140`), `archard_wear` (`:220`).
- **prism_safety wiring**: `safetyDispatcher.ts:117` `tool_life_budget`, `:172` `federated_tool_life_blend`.

## Real gaps
1. **Built-up-edge CHEMISTRY model is missing** — BUE is handled as an empirical speed-threshold risk grade, not a chemistry model (tool-work chemical affinity / adhesion energy / temperature window). Nearest chemistry artifact: diamond-on-ferrous carbon-diffusion note in `physics/coating-material-speed.ts:43`. This is the only acceptance-criterion model with no physics implementation.
2. **"<10% error on JM Die historical tool life data" is unvalidatable today** — no historical measured tool-life dataset was found in the repo; the live substrate is calibration actuals via `speed_feed_calibration_persist` (`speed-feed/CLAUDE.md:92`), which accumulates over time. The criterion needs re-basing or a data-acquisition dependency declared (R12: do not claim validation that cannot be run).
3. **Takeyama-Murata combined-mechanism dispatcher exposure unconfirmed** — the model exists in `AdvancedWearPhysicsEngine.ts:11` but I did not verify a dedicated calc action routes to it (PARTIAL-UNVERIFIED wiring for that one method; `archard_wear` and `wear_progression` are confirmed).

## Verdict
**already-covered**

## Recommended next action
Mark the unit reconciled against the existing wear stack (citations above) instead of building ToolWearEngine — a new engine would duplicate at least 9 existing ones and trip the duplication hard-block. Residual work, if picked up as a [SCOPED] follow-up: (a) verify/expose the Takeyama-Murata combined-mechanism call as a `prism_calc` action if unwired (wire-only, ~1 h); (b) add a small BUE-chemistry adjunct (affinity table per tool-coating × work-material ISO group, temperature window) feeding the existing BUE risk grade — physics-reviewer required; (c) stand up the tool-life validation loop on `speed_feed_calibration_persist` actuals as they accrue, reporting error WITH uncertainty rather than a bare <10% claim.

## ROI
**4/10** — near-zero build value remains (mechanisms + wiring done); the valuable residue (validation) is blocked on data that must accrue via the calibration loop, and the BUE-chemistry adjunct is nice-to-have accuracy, not a safety hole.
