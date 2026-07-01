---
name: quoting-engines
description: Strategic categorized engine digest for the PRISM quoting galaxy (print-to-quote, cost modeling, multi-process routing, quote-vs-actual reconciliation, pricing data, closed-loop calibration).
type: reference
galaxy: quoting
node_type: memory
---

# quoting galaxy -- engine digest

## Overview

The quoting galaxy (slot:charlie) turns a print/RFQ into a customer-facing price and closes the loop against real shop actuals. It owns the print-to-quote pipeline (blueprint/CAD features -> feature-based cost build -> physics cycle-time -> margin-floor gate -> emitted quote), multi-process quote routing (mill/lathe/wedm/casting/additive/injection-mold/sheet-metal/weld-fab), quote-vs-actual reconciliation, historical + market material-price tracking, freight + import cost, cost-aware work routing, and JM Die's DocuStrata financial baseline + closed-loop calibration/outcome ledger. Engines live FLAT at `mcp-server/src/engines/*.ts` (Cost*/Quote*/Estimat*/Pricing*/RFQ* prefixes); the `quoting/` subdir holds only doctrine markdown. Refined enumeration this session found ~103 quoting-relevant engines (the doctrine's canonical "78 cost/quote" figure counts the core set; the extra ~25 are per-process WEDM/lathe/mill cost variants + the RFQ/bid marketplace family). Primary dispatchers: `prism_quoting` (`quotingDispatcher.ts`, primary) and `prism_business` (`businessDispatcher.ts`, quote/cost actions); MCP-down fallback is `node scripts/quoting-pipeline-verify.mjs --json`.

## Strategic categories

### Orchestration / pipeline entry
- `QuoteToShipOrchestratorEngine.ts` (largest -- 26-stage end-to-end quote->ship pipeline with dual safety + OMEGA gates)
- `InstantQuoteEngine.ts` (Xometry-style instant pricing pipeline; CI95 + qty breaks + lead-time)
- `QuoteEstimatorEngine.ts` (unified physics-backed quote kernel)
- `QuoteAutopilotEngine.ts`, `MultiProcessQuoteEngine.ts`, `OptimalQuoteRecommenderEngine.ts`
- `BlueprintToQuoteBridgeEngine.ts`, `PrintToProgramToQuoteBridgeEngine.ts`, `WizardToQuoteBridgeEngine.ts`, `SpeedFeedToQuoteBridgeEngine.ts`, `QuotingMaterialBridgeEngine.ts` (feature/physics -> quote bridges)

### Cost core (job-cost / cycle-time / estimation)
- `JobCostingEngine.ts` (canonical job-cost rollup: material/setup/machining/programming/inspection/finishing/overhead)
- `ActualCostEngine.ts` (actual-cost calc), `CostEstimationEngine.ts`, `CostEstimatorEngine.ts`, `EstimateEngine.ts` (consolidation candidates -- see uncertain notes)
- `CycleTimeEstimatorEngine.ts` (physics kinematics cycle-time -> cost), `GCodeTimeEstimatorEngine.ts`
- `QuotingFormulaEngine.ts` (6 physics-fed cost formulas: ABC, learning-curve, EOQ, calibration, setup-complexity, scrap-reserve)
- `PipelineCostModelEngine.ts`, `ShopFloorCostEngine.ts`, `SetupCostOptimizationEngine.ts`, `CoolantCostOptimizationEngine.ts`

### Per-process quote engines
- `AdditiveQuoteEngine.ts`, `CastingQuoteEngine.ts`, `InjectionMoldQuoteEngine.ts`, `SheetMetalQuoteEngine.ts`, `WeldFabricationQuoteEngine.ts`, `ShopFloorQuoteEngine.ts`, `QuotingPublicQuoteEngine.ts`
- Lathe: `LathePartCostModelEngine.ts`, `LatheProgrammingCostEngine.ts`, `LatheAutoQuoteFromPrintEngine.ts`, `LatheActualCostReconciliationEngine.ts`
- Mill: `MillPartCostModelEngine.ts`, `MillActualCostReconciliationEngine.ts`
- WEDM: `WEDMJobCostEngine.ts`, `WEDMQuoteBridgeEngine.ts`, `WEDMCreditCostEngine.ts`, `WEDMWireBreakRiskCostEngine.ts`, `SinkerElectrodeCostEngine.ts`, `EDMCostDocumentationEngine.ts`

### Pricing data / market / vendor indexes
- `OutboundPriceIndexEngine.ts` (real JM sold-price distribution prior -- the calibration TARGET)
- `VendorCostIndexEngine.ts` (real AP cost-basis prior -- the cost-basis FEATURE; unitCost.median is units-blended, gotcha #25)
- `MarketMaterialPricingEngine.ts`, `LocationAwareVendorPricingEngine.ts`, `VendorRealtimePricingClientEngine.ts`, `LeadTimePricingTierEngine.ts`
- `DocuStrataMaterialPriorEngine.ts`, `DocustrataHistoricalPricingTrainerEngine.ts`, `InflationAdjustEngine.ts`, `FairMarketValueEngine.ts`, `ThreeViewPricingEngine.ts` (3-view current/optimal/cost-floor pricing)

### Reconciliation / closed-loop / calibration
- `QuotingClosedLoopEngine.ts` + `QuotingClosedLoopRunnerEngine.ts` (autonomous observe->measure->detect->act->validate controller)
- `QuotingTrainingLoopEngine.ts`, `QuotingTrainingOrchestratorEngine.ts`, `QuotingCalibrationEngine.ts`, `QuotingActiveFactorLoaderEngine.ts`, `QuotingActualOutcomeLoaderEngine.ts`
- `QuoteOutcomeFeedEngine.ts`, `QuoteOutcomePSIDeltaBridgeEngine.ts`, `QuotingOutcomeCaptureWireEngine.ts`, `QuotingOutcomeLedgerDigestEngine.ts`
- `QuoteAnalyticsEngine.ts`, `QuotingAccuracyEnhancementEngine.ts`, `BidWinCalibratorEngine.ts`
- Cross-galaxy bridges: `QuoteToOrderBridgeEngine.ts`, `ERPCostFeedbackEngine.ts` (-> hotel ERP)

### Pricing modifiers / risk / DFM-cost
- `TolerancePricingImpactEngine.ts`, `ScrapRiskPricingEngine.ts`, `SecondaryOpsQuotePricingEngine.ts`, `StrategyCostOptimalEngine.ts`
- Tool-cost: `ToolCostAmortizationEngine.ts`, `ToolCostPerPartEngine.ts`, `ToolCostPredictorEngine.ts`
- Logistics: `FreightCostEngine.ts`, `ImportCostEngine.ts`

### Cost governance / routing / ROI
- `CostAwareRouterEngine.ts` (cost-optimal work routing), `CostEfficiencyBridgeEngine.ts`
- `CostAlarmEngine.ts` (threshold alarms over multi-LLM cost telemetry -- infra/token-cost, not quote-cost)
- `CostSavingsTrackerEngine.ts` (ROI ledger -- 6 savings categories, wired `prism_quoting:cost_savings`)
- `MultiAgentCostTelemetryEngine.ts` (agent token-cost telemetry)

### AI reasoning / retrieval
- `QuotingDeepReasoningBridgeEngine.ts`, `QuotingNeuralReasoningBridgeEngine.ts`, `QuotingSimilarJobRetrieverEngine.ts`

### Quote packaging / revision / autopilot
- `QuoteEngine.ts`, `QuotingEngine.ts`, `QuotePacketEngine.ts`, `QuoteExplainPDFEngine.ts`, `QuoteRevisionEngine.ts`, `QuoteScenarioGeneratorEngine.ts`, `XometryStyleQuoteInputsEngine.ts`

### RFQ / bid marketplace (cross-galaxy -- galaxy:business/slot:hotel; pattern-matched here)
- `RFQBroadcastEngine.ts`, `RFQMatchScoringEngine.ts`, `RFQToOrderOrchestratorEngine.ts`, `BidCollectionRankingEngine.ts`, `VendorQuoteToPurchaseOrderEngine.ts`
- Also cross-galaxy ingest: `JMDieDocustrataIngestEngine.ts`, `JMDieQuoteTrainingPipelineEngine.ts`, `DocustrataAccountingBridgeEngine.ts`, `DocustrataCustomerIndexEngine.ts`

## Key engines (detailed)

### QuoteToShipOrchestratorEngine.ts
End-to-end 26-stage orchestrator connecting quote request through shipping; each stage lazy-loads its engine, validates entry conditions, produces a typed result, and feeds output forward. Stages span INTAKE -> feature-recog -> DFM -> feasibility -> QUOTE -> scheduling -> process-plan -> tool/strategy/speed-feed -> program-gen -> post -> safety gates -> simulation -> production package -> job-lifecycle -> quality -> OMEGA release gate (0.25R+0.20C+0.15P+0.30S+0.10L) -> shipping. Path: `mcp-server/src/engines/QuoteToShipOrchestratorEngine.ts` (CAMX-MS21/U04, E1086). Imports `CANONICAL_KIENZLE` from physics constants; ~30 lazy-loaded engine refs.

### CycleTimeEstimatorEngine.ts
Physics-based cycle-time estimation from G-code that models actual machine kinematics (S-curve/trapezoidal velocity, corner deceleration at path tolerance, servo settling, block-processing overhead, spindle accel, ATC tool-change, look-ahead feed blending) -- far beyond naive distance/feed. Feeds cost via runtime. Path: `mcp-server/src/engines/CycleTimeEstimatorEngine.ts`. Exports `ControllerType`, `MachineKinematics`, `CycleTimeConfig`, `ToolBreakdown`, `CycleTimeResult`; actions `cycle_time_estimate`, `cycle_time_compare`, `cycle_time_bottleneck`.

### InstantQuoteEngine.ts
Xometry-killer instant pricing pipeline: feature extraction -> DFM -> SpeedFeedOrchestrator cycle-time -> QuoteEstimator cost aggregation -> Wright's-law qty breaks -> lead-time multipliers -> PartSimilarity sanity check. Output carries CI95 bounds, qty breaks (1-100), lead-time options, DFM warnings, cost breakdown, similar-part refs. Path: `mcp-server/src/engines/InstantQuoteEngine.ts`. WIRE-EXEMPT (feature-named companion tests, 47+ cases); actions `instant_quote`, `instant_quote_qty_breaks`, `instant_quote_lead_time`; exports `InstantQuoteInput`. Bridges machine-type taxonomy to ShopConfigurationEngine $/hr.

### QuoteEstimatorEngine.ts
Unified physics-backed quote kernel replacing naive vol/MRR cycle-time with physics calc; integrates secondary ops, tool costs, feature-based complexity, DFM warnings, NRE charges, learning curve, historical accuracy feedback. Pulls from JobCostingEngine (base costs), ManufacturingCalculations (physics), ToolUsageEngine (amortization), MaterialRegistry (real prices), SecondaryOpsEngine, QuoteAnalyticsEngine (calibration). Path: `mcp-server/src/engines/QuoteEstimatorEngine.ts`. Exports `FeatureSpec`, `SecondaryOp`, `NREItem`, `QuoteEstimateInput`, `QuoteEstimateResult`; supports round-bar stock, per-shop rate overrides, real $/in3 material-cost override.

### QuotingClosedLoopEngine.ts
Autonomous self-improving controller composing the 5 quoting substrate engines into one closed loop: observe (QuoteOutcomeFeed) -> measure (QuotingTrainingLoop AccuracyReport) -> detect (drift) -> act (QuotingCalibration deriveWithCoV -> QuotingActiveFactorLoader atomic write) -> validate vs holdout (pass=promote, fail=rollback) -> telemeter (QuoteOutcomePSIDelta). Intentionally small GLUE; fail-soft (a stage failure degrades the verdict, never aborts). Path: `mcp-server/src/engines/QuotingClosedLoopEngine.ts` (QUOTING-SYNERGY-MS0/U-QP-CLOSED-LOOP-CORE, iter46). Exports `QuoteOutcomeRecord`, `AccuracyReport`, `CalibrationFactors`.

### ThreeViewPricingEngine.ts
Produces THREE side-by-side price views for one quote so a JM estimator sees all at once: CURRENT (headline, cost-build from canonical ShopConfigurationEngine rates + current markup/margin), OPTIMAL (advisory, market-aware target via MarketMaterialPricing + adaptive rate), COST_FLOOR (advisory, JobProfitabilityWaterfall break-even). Plus a ranked plain-language improvement advisor. Every view carries a confidence band that widens when comparables are thin; headline runs the margin-floor gate. Path: `mcp-server/src/engines/ThreeViewPricingEngine.ts` (QUOTING-JM-GROUND-MS0/U-3VIEW01). Composes ShopConfiguration/JobProfitabilityWaterfall/MarketMaterialPricing/AdaptiveShopRate; never inlines a rate.

### OutboundPriceIndexEngine.ts
Reads the mined JM OUTBOUND sold-order index (`state/shared/quoting/jm-sold-orders.json`) and exposes the empirical distribution of REAL per-piece prices JM charged customers, confidence-gated (defaults {high,medium}, NEVER low/none). The calibration-TARGET half of the data ceiling (sibling VendorCostIndex = cost-basis half). A distribution prior sidesteps the iter59 match_pct=0 join. Path: `mcp-server/src/engines/OutboundPriceIndexEngine.ts` (QUOTING-SYNERGY-MS0/U-QP-OUTBOUND-PRICE-PRIOR). Read-only (not a quote emitter, no margin-floor gate); fail-soft empty shape on missing/corrupt file; exports `PriceDistribution`, `SoldOrderLineItem`, `SoldOrderRecord`, `SoldOrderLoadResult`.

### RFQBroadcastEngine.ts
CORE MARKETPLACE LOOP ENTRY (tagged galaxy:business, slot:hotel -- cross-galaxy). Takes a buyer RFQ, matches a supplier shortlist (reusing RFQMatchScoringEngine), broadcasts to matched suppliers by opening a timed bid window, and collects sealed bids. Owns storage for MarketplaceRFQ / BidWindow / SupplierBid. Deterministic (caller-supplied ISO timestamps, no wall-clock in asserted values); fail-loud invariants (bad shape/price/window THROWS; never hard-delete -- cancel flips status). Path: `mcp-server/src/engines/RFQBroadcastEngine.ts`. WIRE-EXEMPT (dispatcher wiring deferred to MAIN, stale worktree businessDispatcher). Note: this is hotel's marketplace, not charlie's quote-pricing loop.

### CostSavingsTrackerEngine.ts
ROI proof / #1 sales tool: tracks every optimization recommendation and its dollar impact across 6 categories (tool-life extension, cycle-time reduction, crash prevention, scrap avoidance, energy, machine utilization), generating monthly reports. Persistent store `~/.prism/savings.json`; auto-logs from SFO/GCodeSafety/ToolLife engines. Path: `mcp-server/src/engines/CostSavingsTrackerEngine.ts` (VAL-MS0 V0-U01). Wired DORMANT->live at `prism_quoting:cost_savings` (8 roi_* sub-actions, U-QP-COST-SAVINGS-WIRE). Exports `SavingsCategory`, `SavingsEvent`.

### QuotingFormulaEngine.ts
Six physics-fed cost formulas missing from the quoting pipeline: Activity-Based Costing (overhead by cost drivers), Learning Curve (Wright's model), Economic Batch Sizing (EOQ), Quote Calibration (historical accuracy adjustment), Setup Complexity Scoring, Scrap Reserve (Cpk-based yield + material allowance). Delegates OEE + Cpk to existing engines rather than duplicating. Path: `mcp-server/src/engines/QuotingFormulaEngine.ts` (SQ4-1-QUOTE). Wired to businessDispatcher: `quote_abc_cost`, `quote_learning_curve`, `quote_eoq`, `quote_calibrate`, `quote_setup_complexity`, `quote_scrap_reserve`. Cites Wright 1936 / Harris 1913 (EOQ) / Cooper-Kaplan 1988 (ABC) / AIAG SPC / Shingo SMED.

### JobCostingEngine.ts
Canonical job-cost rollup: material, setup, machining, programming, inspection, finishing, overhead, admin, power, tool-consumption -- with configurable shop + machine rates (sourced from ShopConfigurationEngine with a hardcoded fallback map). Ported from the R2.3.1 monolith. Path: `mcp-server/src/engines/JobCostingEngine.ts`. Exports `ShopRates`, `JobSpec`, `CostBreakdown`; consumed by QuoteEstimatorEngine as the base-cost layer.

### CostAlarmEngine.ts
Threshold-based alarms over multi-LLM cost telemetry (NOT quote-cost -- this is the platform's own token/USD spend). Reads `cost-telemetry.jsonl`, aggregates daily/weekly totals, compares vs config thresholds, emits alarms to JSONL + AGENT_CHAT.md with cool-down suppression. Pure-core + injectable side-effect adapters; cool-down uses telemetry timestamps not wall-clock; corrupt JSONL line counted as truncatedTailLines not silently dropped. Path: `mcp-server/src/engines/CostAlarmEngine.ts` (COST-CASCADE-MS0/U-COST-ALARM). Exports `CostAlarmThresholds`, `CostAlarmConfig`, `TelemetryRecord`, `AggregateWindow`, `AlarmDecision`.

## Full engine index

> One-liners marked "(name-derived)" were NOT header-verified this session -- confidence is filename + doctrine only (R12). The 12 without the tag were read this session.

| Engine | Category | One-line |
|--------|----------|----------|
| QuoteToShipOrchestratorEngine.ts | orchestration | 26-stage quote->ship pipeline with dual safety + OMEGA release gates |
| InstantQuoteEngine.ts | orchestration | Xometry-style instant pricing: CI95 + qty breaks + lead-time |
| QuoteEstimatorEngine.ts | cost-core | Unified physics-backed quote kernel (cost + NRE + learning curve) |
| QuotingClosedLoopEngine.ts | closed-loop | Autonomous observe->measure->detect->act->validate quote controller |
| ThreeViewPricingEngine.ts | pricing-data | 3-view current/optimal/cost-floor pricing + improvement advisor |
| OutboundPriceIndexEngine.ts | pricing-data | Real JM sold-price distribution prior (calibration target) |
| RFQBroadcastEngine.ts | rfq-marketplace | RFQ broadcast + bid-window (cross-galaxy: hotel/business) |
| CostSavingsTrackerEngine.ts | cost-governance | ROI ledger across 6 savings categories (prism_quoting:cost_savings) |
| QuotingFormulaEngine.ts | cost-core | 6 physics-fed cost formulas (ABC/learning/EOQ/calibrate/setup/scrap) |
| JobCostingEngine.ts | cost-core | Canonical job-cost rollup (material/setup/machining/prog/insp/oh) |
| CostAlarmEngine.ts | cost-governance | Threshold alarms over multi-LLM token/USD telemetry |
| QuoteAutopilotEngine.ts | orchestration | Autonomous quote draft (name-derived) |
| MultiProcessQuoteEngine.ts | orchestration | Multi-process quote routing (name-derived) |
| OptimalQuoteRecommenderEngine.ts | orchestration | Optimal quote recommendation (name-derived) |
| BlueprintToQuoteBridgeEngine.ts | orchestration | Print/blueprint features -> quote entry point (name-derived) |
| PrintToProgramToQuoteBridgeEngine.ts | orchestration | Print->program->quote bridge (name-derived) |
| WizardToQuoteBridgeEngine.ts | orchestration | Wizard output -> quote bridge (name-derived) |
| SpeedFeedToQuoteBridgeEngine.ts | orchestration | Speed-feed physics -> quote cost basis (name-derived) |
| QuotingMaterialBridgeEngine.ts | orchestration | Material data -> quote bridge (name-derived) |
| ActualCostEngine.ts | cost-core | Actual-cost calc (canonical; archive .corrupted excluded) (name-derived) |
| CostEstimationEngine.ts | cost-core | Cost estimation (consolidation candidate) (name-derived) |
| CostEstimatorEngine.ts | cost-core | Cost estimation (consolidation candidate) (name-derived) |
| EstimateEngine.ts | cost-core | Generic estimate engine (name-derived) |
| CycleTimeEstimatorEngine.ts | cost-core | Physics kinematics cycle-time -> cost |
| GCodeTimeEstimatorEngine.ts | cost-core | G-code runtime -> cost (name-derived) |
| PipelineCostModelEngine.ts | cost-core | Pipeline cost model (name-derived) |
| ShopFloorCostEngine.ts | cost-core | Shop-floor cost model (name-derived) |
| SetupCostOptimizationEngine.ts | cost-core | Setup-cost optimization (name-derived) |
| CoolantCostOptimizationEngine.ts | cost-core | Coolant lifecycle cost optimization (name-derived) |
| AdditiveQuoteEngine.ts | per-process | Additive/3DP quote (name-derived) |
| CastingQuoteEngine.ts | per-process | Casting quote (name-derived) |
| InjectionMoldQuoteEngine.ts | per-process | Injection-mold quote (name-derived) |
| SheetMetalQuoteEngine.ts | per-process | Sheet-metal quote (name-derived) |
| WeldFabricationQuoteEngine.ts | per-process | Weld-fabrication quote (name-derived) |
| ShopFloorQuoteEngine.ts | per-process | Shop-floor quote (name-derived) |
| QuotingPublicQuoteEngine.ts | per-process | Public/customer-facing quote surface (name-derived) |
| LathePartCostModelEngine.ts | per-process | Lathe part cost model (name-derived) |
| LatheProgrammingCostEngine.ts | per-process | Lathe programming cost (name-derived) |
| LatheAutoQuoteFromPrintEngine.ts | per-process | Lathe auto-quote from print (name-derived) |
| LatheActualCostReconciliationEngine.ts | reconciliation | Lathe quote-vs-actual (cross-galaxy <-> whiskey) (name-derived) |
| MillPartCostModelEngine.ts | per-process | Mill part cost model (name-derived) |
| MillActualCostReconciliationEngine.ts | reconciliation | Mill quote-vs-actual reconciliation (name-derived) |
| WEDMJobCostEngine.ts | per-process | WEDM job cost (name-derived) |
| WEDMQuoteBridgeEngine.ts | per-process | WEDM quote bridge (name-derived) |
| WEDMCreditCostEngine.ts | per-process | WEDM machine-credit cost (name-derived) |
| WEDMWireBreakRiskCostEngine.ts | per-process | WEDM wire-break risk cost (name-derived) |
| SinkerElectrodeCostEngine.ts | per-process | Sinker-EDM electrode cost (name-derived) |
| EDMCostDocumentationEngine.ts | per-process | EDM cost documentation (name-derived) |
| OutboundPriceIndexEngine.ts | pricing-data | (see detailed) |
| VendorCostIndexEngine.ts | pricing-data | Real AP cost-basis prior; unitCost.median units-blended (name-derived) |
| MarketMaterialPricingEngine.ts | pricing-data | Live/market material pricing (name-derived) |
| LocationAwareVendorPricingEngine.ts | pricing-data | Location-aware vendor pricing (name-derived) |
| VendorRealtimePricingClientEngine.ts | pricing-data | Realtime vendor-price client (name-derived) |
| LeadTimePricingTierEngine.ts | pricing-data | Lead-time pricing tiers (name-derived) |
| DocuStrataMaterialPriorEngine.ts | pricing-data | DocuStrata material-price prior (name-derived) |
| DocustrataHistoricalPricingTrainerEngine.ts | pricing-data | Historical-pricing trainer from DocuStrata (name-derived) |
| InflationAdjustEngine.ts | pricing-data | CPI inflation adjustment (name-derived) |
| FairMarketValueEngine.ts | pricing-data | Fair-market-value estimate (name-derived) |
| QuotingClosedLoopRunnerEngine.ts | closed-loop | Closed-loop cycle runner/scheduler (name-derived) |
| QuotingTrainingLoopEngine.ts | closed-loop | Training-loop measure (AccuracyReport / MAPE) (name-derived) |
| QuotingTrainingOrchestratorEngine.ts | closed-loop | Training orchestration (name-derived) |
| QuotingCalibrationEngine.ts | closed-loop | CoV-gated calibration-factor derivation (name-derived) |
| QuotingActiveFactorLoaderEngine.ts | closed-loop | Atomic active-factor JSON load/write (name-derived) |
| QuotingActualOutcomeLoaderEngine.ts | closed-loop | Loads real actuals; fail-loud on none (name-derived) |
| QuoteOutcomeFeedEngine.ts | closed-loop | Capture quote->actual outcomes (name-derived) |
| QuoteOutcomePSIDeltaBridgeEngine.ts | closed-loop | PSI-delta telemetry to PSN (name-derived) |
| QuotingOutcomeCaptureWireEngine.ts | closed-loop | Wire quote outcomes -> outcomeCaptureBus (name-derived) |
| QuotingOutcomeLedgerDigestEngine.ts | closed-loop | Outcome-ledger digest (name-derived) |
| QuoteAnalyticsEngine.ts | closed-loop | Quote conversion + accuracy analytics (name-derived) |
| QuotingAccuracyEnhancementEngine.ts | closed-loop | Quote-accuracy enhancement (name-derived) |
| BidWinCalibratorEngine.ts | closed-loop | Bid win-rate calibration (name-derived) |
| QuoteToOrderBridgeEngine.ts | reconciliation | Quote->order handoff (cross-galaxy -> hotel ERP) (name-derived) |
| ERPCostFeedbackEngine.ts | reconciliation | ERP actuals feedback into quote loop (-> hotel) (name-derived) |
| TolerancePricingImpactEngine.ts | pricing-modifier | Tolerance -> price impact (name-derived) |
| ScrapRiskPricingEngine.ts | pricing-modifier | Scrap-risk pricing (name-derived) |
| SecondaryOpsQuotePricingEngine.ts | pricing-modifier | Secondary-ops (heat treat/plating) pricing (name-derived) |
| StrategyCostOptimalEngine.ts | pricing-modifier | Cost-optimal strategy selection (name-derived) |
| ToolCostAmortizationEngine.ts | pricing-modifier | Tool-cost amortization (name-derived) |
| ToolCostPerPartEngine.ts | pricing-modifier | Tool-cost-per-part (name-derived) |
| ToolCostPredictorEngine.ts | pricing-modifier | Tool-cost prediction (name-derived) |
| FreightCostEngine.ts | logistics | Freight cost (name-derived) |
| ImportCostEngine.ts | logistics | Import duty/cost (name-derived) |
| CostAwareRouterEngine.ts | cost-governance | Cost-optimal work routing (name-derived) |
| CostEfficiencyBridgeEngine.ts | cost-governance | Efficiency-vs-cost surface (name-derived) |
| CostSavingsTrackerEngine.ts | cost-governance | (see detailed) |
| CostAlarmEngine.ts | cost-governance | (see detailed) |
| MultiAgentCostTelemetryEngine.ts | cost-governance | Multi-agent token-cost telemetry (name-derived) |
| QuotingDeepReasoningBridgeEngine.ts | ai-reasoning | Deep-reasoning bridge over quoting doctrine (name-derived) |
| QuotingNeuralReasoningBridgeEngine.ts | ai-reasoning | Neural reasoning / PSN synergy bridge (name-derived) |
| QuotingSimilarJobRetrieverEngine.ts | ai-reasoning | Similar-historical-job retrieval (name-derived) |
| QuoteEngine.ts | quote-packaging | Core quote engine (name-derived) |
| QuotingEngine.ts | quote-packaging | Quoting engine surface (name-derived) |
| QuotePacketEngine.ts | quote-packaging | Quote packet assembly (name-derived) |
| QuoteExplainPDFEngine.ts | quote-packaging | Quote explanation PDF (name-derived) |
| QuoteRevisionEngine.ts | quote-packaging | Quote revision / history (name-derived) |
| QuoteScenarioGeneratorEngine.ts | quote-packaging | What-if quote scenarios (name-derived) |
| XometryStyleQuoteInputsEngine.ts | quote-packaging | Xometry-style structured quote inputs (name-derived) |
| QuotingPipelineStressTestEngine.ts | quote-packaging | Pipeline stress test harness (name-derived) |
| RFQMatchScoringEngine.ts | rfq-marketplace | TOPSIS supplier shortlist scoring (cross-galaxy: hotel) (name-derived) |
| RFQToOrderOrchestratorEngine.ts | rfq-marketplace | RFQ->order orchestration (cross-galaxy: hotel) (name-derived) |
| BidCollectionRankingEngine.ts | rfq-marketplace | Closed-window bid ranking + award (cross-galaxy: hotel) (name-derived) |
| VendorQuoteToPurchaseOrderEngine.ts | rfq-marketplace | Vendor quote -> PO (cross-galaxy: procurement) (name-derived) |
| JMDieDocustrataIngestEngine.ts | ingest | Ingest DocuStrata prints (name-derived) |
| JMDieQuoteTrainingPipelineEngine.ts | ingest | JM Die-specific training loop (name-derived) |
| DocustrataAccountingBridgeEngine.ts | ingest | DocuStrata accounting bridge (cross-galaxy: hotel) (name-derived) |
| DocustrataCustomerIndexEngine.ts | ingest | DocuStrata customer index (name-derived) |
