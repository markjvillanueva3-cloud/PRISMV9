# UNIT-0009 — Tool Wear Prediction Engine — GAP ANALYSIS
_Analyst: oscar (speed-feed domain expert), 2026-07-02. All citations verified by Read/Grep this session._

## Existing coverage

The four wear mechanisms the unit asks for are ALREADY implemented, most with literature-cited physics:

- **Diffusive**: `mcp-server/src/engines/AdvancedWearPhysicsEngine.ts:256-293` — Fick's-second-law crater wear (Arrhenius D(T), critical-time-to-failure); diffusion params table at `:25-29`.
- **Adhesive**: `mcp-server/src/engines/ArchardAdhesiveWearEngine.ts:1-37` (Archard 1953, V=KWL/H, VB conversion); `mcp-server/src/engines/ToolWearProgressionEngine.ts:2-21` implements the Usui adhesive model (Usui 1978 cited at :13-16) with three-phase wear stages + remaining life (its header at :8-10 honestly states Archard is NOT computed by it — Archard lives in the sibling engine).
- **Abrasive**: `AdvancedWearPhysicsEngine.ts:444-491` — Rabinowicz abrasive model with hardness-ratio severity.
- **Chemical/oxidation**: `AdvancedWearPhysicsEngine.ts:296-339` — notch wear = oxidation (Arrhenius) + mechanical, Newton-Raphson critical time.
- **Combined mechanisms**: `AdvancedWearPhysicsEngine.ts:568-622` — Takeyama-Murata mechanical+thermal combined wear with crossover time; `:493-566` flank-wear ODE (RK4, three-phase).
- **Real-time force/thermal inputs**: `mcp-server/src/engines/AdaptiveWearEngine.ts:18-49` — wear estimation from currentForce/baselineForce/currentPower/surfaceFinish deltas, breakage risk, recommended action + feed/speed/DOC compensations, S(x)>=0.990. `ThermalWearCouplingEngine` wired at `calcDispatcher.ts:6752-6755` (`thermal_wear_coupling`) — body PARTIAL-UNVERIFIED (wiring read, implementation not).
- **Remaining-life / stochastic**: `AdvancedWearPhysicsEngine.ts:214-253` (Kannatey-Asibu LogNormal Monte Carlo, reliability(t)); `:342-442` log-normal MLE with censored data + Anderson-Darling; `mcp-server/src/engines/ToolLifeAdaptiveEngine.ts:1-50` (online Weibull MLE, hazard, RUL with CI, cost-optimal replacement); `StochasticToolLifeEngine` wired `calcDispatcher.ts:9249-9253`; Bayesian: `calcDispatcher.ts:3647-3665` (`bayesian_tool_life_predict`/`_replacement`).
- **Dispatcher wiring (prism_calc)**: `tool_life` (`calcDispatcher.ts:40,1613`), `wear_prediction` (:202), `wear_progression` (:64, handler :8701-8709 → ToolWearProgressionEngine), `tool_wear_rate` (:5262 → ToolWearRateEngine, whose Taylor tables + cost/productivity-optimal speeds are at `ToolWearRateEngine.ts:63-115`), `archard_wear` (:8740-8748), `wear_force_correction` (:8756-8764), `stochastic_tool_life`, `monte_carlo_tool_life` (:1880), `cryo_tool_life` (:374).
- **Dispatcher wiring (prism_safety)**: `safetyDispatcher.ts:117` (`tool_life_budget` → ToolLifeBudgetEngine, header `ToolLifeBudgetEngine.ts:1-18`), `:172` (`federated_tool_life_blend` → `FederatedToolLifeLearningEngine.ts:1-25`, Bayesian cross-shop Taylor blend), `:70-71` breakage actions.
- **Algorithms on disk** (paths verified via `git ls-files`; bodies NOT read — PARTIAL-UNVERIFIED): `mcp-server/src/algorithms/{UsuiWearModel,BayesianWearModel,ExtendedTaylorModel,ToolWearPrediction}.ts`.
- **Tests**: 15+ wear/life test files verified on disk incl. `mcp-server/src/__tests__/tool-wear-progression-engine.test.ts`, `thermal-wear-coupling.test.ts`, `archard-adhesive-wear.test.ts`, `devDispatcher.uwireDoeWearJmDie.test.ts:1-48` (JM Die DoE + Archard round-trip).

## Real gaps

1. **No single unified 4-mechanism wear-rate integrator.** The mechanisms live in 3+ engines; Takeyama-Murata combines only mechanical+thermal. A caller wanting "total dVB/dt = adhesive + abrasive + diffusive + chemical under this force/temperature state" must orchestrate manually. Genuine (but thin) composition gap.
2. **No measured JM Die wear-vs-predicted validation dataset.** The only tool-life corpus found is `state/shared/corpus/cam-tool-life-tuples.jsonl` + `cam-tool-life-summary.json` — 726 tuples that are SYNTHETIC (generated FROM the Taylor formula itself: `"formula":"V*T^n=C with family multiplier"`), so validating against them is circular. The "<8% error on real JM Die data" criterion has no data substrate. Searched `mcp-server/data`, `data/`, `state/shared` for wear/tool-life logs; nothing measured found (qualified: targeted glob, not exhaustive of the 24,545-file JM archive).
3. **Action-family naming**: spec says `prism_calc:tool_life_*`; actual actions are `tool_life`, `stochastic_tool_life`, `bayesian_tool_life_*` etc. — cosmetic, no rebuild.

## Verdict

**extend**

## Recommended next action

Do NOT build a new ToolWearPredictionEngine — that would trip the duplication guard against AdvancedWearPhysicsEngine/ToolWearProgressionEngine/AdaptiveWearEngine. Instead ship a thin `unified_wear_rate` composition action (or method on AdvancedWearPhysicsEngine) that sums the four mechanism rates from the existing engines under a shared force/temperature state, with per-mechanism attribution and uncertainty (RSS), wired to `prism_calc`; and separately open a DATA unit to capture real JM Die wear measurements (offset-table deltas or operator tool-change logs) — without measured data the <8% acceptance criterion is unfalsifiable and must be reported as blocked (R12), not "validated".

## ROI

**4/10** — ~85% of the spec already exists wired+tested; remaining value is a thin composition layer, and the dominant remaining cost (measured shop wear data) cannot be closed by code.
