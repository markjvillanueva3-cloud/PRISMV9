# UNIT-0012 — Tool Life Extension Strategies — GAP ANALYSIS
_Analyst: oscar (speed-feed domain expert), 2026-07-02. All citations verified by Read/Grep this session._

## Existing coverage

The spec's extension levers exist individually — verified per lever:

- **Lever 1, coating selection**: `mcp-server/src/engines/CoatingSelectionEngine.ts:1-75` (E1082) — ISO-group × operation × speed-range × coolant × substrate coating decision with alternatives + why-not reasoning (Sandvik/Kennametal/Oerlikon cited :9-12). `mcp-server/src/algorithms/CoatingVcModifier.ts:1-46` — coating→Vc multiplier relative to regime baseline, fail-safe 1.0, material-gated (drift-guarded against `prism-reference-db/coatings.json`, :33-36). `mcp-server/src/physics/coating-material-speed.ts` exists with test (paths verified; body PARTIAL-UNVERIFIED).
- **Lever 2, coolant strategy**: `mcp-server/src/engines/CAMCoolantStrategyEngine.ts:1-55` — 10-priority rule table (flood/MQL/through-spindle/dry/etc. per op×material×tool×depth) with test on disk. Cryogenic life gain wired: `calcDispatcher.ts:374-375` (`cryo_tool_life` returns improvement_factor).
- **Lever 3, parameter modulation**: `mcp-server/src/engines/ToolWearRateEngine.ts:8-9` — cost-optimized vs productivity-optimized speed; Gilbert 1950 minimum-cost velocity already shipped (referenced as "gilbert-econ-speed-wire" at `ToolLifeEconomicReplacementFormula.ts:6-8`); `mcp-server/src/engines/AdaptiveWearEngine.ts:40-45` — feed/speed/DOC compensations under wear; `mcp-server/src/engines/AdaptivePhysicsBridgeEngine.ts:425` ("reduce speed for tool life extension" advisory).
- **Lever 4, wear-pattern refinish**: `mcp-server/src/engines/WearPatternRefinishEngine.ts:1-14` — `estimateLifeExtension` (1-2 extra finish passes before replacement), test `__tests__/wear-pattern-refinish.test.ts` on disk.
- **Lever 5, replacement timing / life budgeting**: `mcp-server/src/engines/ToolLifeAdaptiveEngine.ts:1-50` — online Weibull, RUL, cost-optimal replacement time with savings_pct; `mcp-server/src/engines/ToolLifeBudgetEngine.ts:1-18` — per-run life budgeting, mid-run change point, spare pre-staging; wired prism_safety `safetyDispatcher.ts:117` (`tool_life_budget`).
- **ROI substrate**: `mcp-server/src/algorithms/ToolLifeEconomicReplacementFormula.ts:13-28` — $/cut-minute, economic life T*, replacement schedule — wired `businessDispatcher.ts:5479-5494`.
- **Cross-shop learning substrate**: `mcp-server/src/engines/FederatedToolLifeLearningEngine.ts:1-25` — Bayesian Taylor blend for before/after curve updates.

## Real gaps

1. **The integrated strategy recommender itself.** Grep for `life.?extension|extend tool life|ToolLifeExtension` across `mcp-server/src` finds only per-engine advisories and CAM tribal-tip prose (e.g. `data/esprit-cam-tips.ts:13`) — no engine composes the levers, predicts life gain per lever (via the existing Taylor/wear engines), and ranks by ROI (via the existing economic formulas). This composition layer is the genuinely missing deliverable.
2. **Edge-prep lever.** No dedicated edge-prep (hone radius / K-factor) → life model was confirmed; `edge_prep|hone` grep hits land in speed-feed orchestrators and quoting engines (contents unverified for this purpose — PARTIAL-UNVERIFIED). Treat edge-prep as an unmodeled lever until a body-read proves otherwise.
3. **JM Die before/after extended-life validation data.** The only life corpus is synthetic (`state/shared/corpus/cam-tool-life-summary.json`: 726 tuples generated from `V*T^n=C` itself) — circular for validation. The "10+ extended-life jobs" criterion is data-blocked.
4. **Formulas-from-constants**: the levers cite vendor guides in-engine; a recommender must import Taylor/kc constants from `mcp-server/src/physics/constants.ts` (per repo rail), not re-inline the per-engine tables.

## Verdict

**extend**

## Recommended next action

Build ONE thin `ToolLifeExtensionRecommenderEngine` (or a `tool_life_extension_recommend` action) that fans out to the five verified lever engines above, quantifies each lever's predicted life multiplier through the existing Taylor/wear stack (CoatingVcModifier factor → Taylor speed-life tradeoff; coolant/cryo improvement factor; Gilbert/cost-optimal speed shift; refinish extra passes; Weibull-optimal replacement), prices each via `ToolLifeEconomicReplacementFormula.costPerCutMinute`, and returns a ranked lever list with uncertainty per recommendation (speed-feed rail: never publish a recommendation without uncertainty). Wire to prism_calc + businessDispatcher in the same commit. Run `duplicationGuardEngine.checkBeforeCreating` first; validate against the FederatedToolLifeLearning blend on whatever real observations exist and report the synthetic-corpus circularity loudly (R12) rather than claiming validation.

## ROI

**6/10** — pure composition over five verified, already-tested lever engines (low effort, no new physics), with clear quoting/shop value; capped by the same measured-data gap that blocks the validation criteria.
