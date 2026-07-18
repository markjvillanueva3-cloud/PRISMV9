# UNIT-0010 — Tool Reconditioning Quality and Economics — GAP ANALYSIS
_Analyst: oscar (speed-feed domain expert), 2026-07-02. All citations verified by Read/Grep this session._

## Existing coverage

The ECONOMICS half of this unit is substantially built and wired:

- **Recondition-vs-replace TCO core**: `mcp-server/src/algorithms/ToolLifeEconomicReplacementFormula.ts:1-51` — three pure surfaces: `costPerCutMinute(toolPrice, regrindCost, edgesPerTool, changeoutMin, laborRate, machineRate, T)` (C(T) formula at :17), `economicLife(...)` with scrap-hazard escalation (:19-23), `replacementSchedule(...)` over measured-life samples (:25-28). Explicitly models `regrind_cost` per edge (`ToolCostInput.regrind_cost` at :46). Trent & Wright + Boothroyd & Knight cited (:36-39). **Wired** to businessDispatcher at `businessDispatcher.ts:5479-5494` (all three surfaces). Test on disk: `mcp-server/src/__tests__/ToolLifeEconomicReplacementFormula.test.ts`.
- **JM tool-spend prior**: `mcp-server/src/engines/ConsumableCostBasisEngine.ts:1-49` — surfaces the $4.9M / 7,150-line-item `jm-tool-purchases.json` advisory per-type cost prior + bounded [0.8,1.2] reconciliation feedback multipliers; action `tool_cost_basis` on prism_quoting (:34).
- **Regrind-state awareness in tool selection**: `mcp-server/src/engines/InventoryAwareToolSelectorEngine.ts:22` (`condition: "new"|"good"|"worn"|"needs_regrind"|"retired"`), derate factor at :237 (`needs_regrind → 0.7`) and priority at :247.
- **Regrind-count physics**: `mcp-server/src/engines/DeepHoleDrillingPhysicsEngine.ts:159,896-920` (`recommended_regrind_count`, carbide 3-5 / HSS 2-3); `mcp-server/src/engines/BroachDesignEngine.ts:126,170` (tool life in parts/regrind).
- **Adjacent in-situ life-extension**: `mcp-server/src/engines/WearPatternRefinishEngine.ts:1-23` — spatial VB(z) mapping → compensating finish pass → `estimateLifeExtension` (this is ON-machine refinish, NOT off-machine reconditioning — related but distinct).
- **Cost-model hooks**: `mcp-server/src/engines/CostEstimationEngine.ts:91` (regrind adjustment), `mcp-server/src/engines/JobProfitabilityWaterfallEngine.ts:211` (recommends regrind-program review when tooling >20% of cost).
- **Coating knowledge for recoat decisions**: `mcp-server/src/engines/CoatingSelectionEngine.ts:169` ("regrindable, no coating delamination risk" as an uncoated-substrate strength).

## Real gaps

1. **Reconditioning QUALITY scoring model — genuinely missing.** Case-insensitive grep of `recondition|regrind` across `mcp-server/src/engines` surfaced only the economics/count/state hits above; no engine scores edge-prep quality, coating-strip/recoat integrity, or geometry-restoration tolerance of a reconditioned tool. (Qualified absence claim: repo-wide grep of engines+dispatchers, not the full 24K-file JM archive.)
2. **Physics-based post-regrind performance model.** The only post-regrind derate is the hardcoded 0.7 condition factor (`InventoryAwareToolSelectorEngine.ts:237`) — not derived from reduced diameter/edge geometry → shifted Taylor curve.
3. **JM Die reconditioning records.** `jm-tool-purchases.json` is purchases, not regrind history; no reconditioning-outcome dataset found — the "JM Die reconditioning data validation" criterion is data-blocked.
4. **Scheduling integration.** `economicLife` exists but no scheduler/quoting consumer performs a recondition-vs-replace decision at job-planning time (no such call site surfaced in grep of the recondition/regrind hits).

## Verdict

**extend**

## Recommended next action

Build a compact `ReconditioningQualityEngine` (quality-score model: edge-prep grade, coating integrity, geometry restoration vs new-tool spec, expected Taylor-curve shift per regrind cycle, citing manufacturer regrind specs) and wire it so its Taylor-shift output feeds the ALREADY-WIRED `economicLife`/`costPerCutMinute` surfaces (`businessDispatcher.ts:5479-5494`) — replacing the hardcoded 0.7 derate in `InventoryAwareToolSelectorEngine.ts:237` with the modeled value. Reuse, don't duplicate, the TCO math. Flag the JM reconditioning-records validation as data-blocked (R12) and queue a data-capture unit; do not fabricate validation.

## ROI

**6/10** — economics core is done+wired (big head start); the quality model is a well-scoped genuinely-missing engine with a clear consumer chain, but final validation is gated on shop records that do not exist in-repo yet.
