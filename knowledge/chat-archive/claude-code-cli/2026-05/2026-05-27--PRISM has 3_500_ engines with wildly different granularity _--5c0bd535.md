---
type: "chat-session"
source: "claude-code-cli"
session_id: "5c0bd535-0ecb-4744-9e62-ac1ea40fbe71"
title: "PRISM has 3,500+ engines with wildly different granularity — from `CAMUltimateOr"
date: "2026-05-27"
first_ts: "2026-05-27T01:29:09.919Z"
last_ts: "2026-05-27T01:34:33.203Z"
cwd: "H:\\PRISM"
messages: 52
user_msgs: 21
assistant_msgs: 31
raw_file: "H:/.claude/projects/H--prism/5c0bd535-0ecb-4744-9e62-ac1ea40fbe71/subagents/agent-a1ded2b00bfadf447.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# PRISM has 3,500+ engines with wildly different granularity — from `CAMUltimateOr

> **claude-code-cli** | 2026-05-27 | 52 msgs (21 user / 31 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/5c0bd535-0ecb-4744-9e62-ac1ea40fbe71/subagents/agent-a1ded2b00bfadf447.jsonl`

## Transcript

### User | 2026-05-27T01:29:09.919Z

PRISM has 3,500+ engines with wildly different granularity — from `CAMUltimateOrchestratorEngine` (everything-and-the-kitchen-sink) down to `OkumaMacroHeaderGeneratorEngine` (one specific subroutine for one specific controller). The orchestrator must pick the RIGHT granularity per stage: too coarse and we re-implement; too fine and we lose composition.

Your job: for each of the 16 pipeline stages, identify the COARSEST appropriate hub-orchestrator engine AND the FINEST specialist worth knowing. The MS0 orchestrator should default to coarse hubs and only reach for specialists when the hub leaves money on the table.

Stages: INPUT, MATERIAL-RESOLVE, FEASIBILITY-GATE, CAD, SETUP-PLAN, METHOD-ROUTER, CAM-STRATEGY, SSF, TOOL-CRIB, POST, SETUP-VALIDATION, SIM/QA, FAI-GATE, SECONDARY-OPS, EXECUTE, ERP/QUOTE.

READ-ONLY search:
- H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md (engines with Ultimate/Master/Orchestrator/Universal in name = coarse hubs; specific controllers/strategies = fine specialists)
- H:/prism/mcp-server/data/docs/DISPATCHER_DIGEST.md
- H:/prism/mcp-server/src/engines/ — pattern: `*Orchestrator*.ts` = coarse, `*<Vendor><Model>*.ts` = fine

Under 500 words, organize as a granularity table:

| Stage | COARSE hub (start here) | FINE specialist (reach when) | Pitfall |
|---|---|---|---|

Examples to validate:
- METHOD-ROUTER: COARSE = `aiSystemRouterEngine` (already cross-cutting, can route methods). FINE = `OkumaMacroHeaderGeneratorEngine` (only fires when Okuma macro path picked). Pitfall: jumping straight to fine specialist for the wrong shop machine.
- CAM-STRATEGY: COARSE = `CAMStrategySelectorEngine` (selects strategy by feature+material). FINE = `TrochoidalToolpathEngine` + `HSMFinishingEngine` (specific algorithms). Pitfall: orchestrator hardcodes trochoidal when adaptive selector would have picked HSM for finishing.
- POST: COARSE = `MasterPostFineTuningEngine` or `PostProcessorPipelineEngine` (38 stages). FINE = `OkumaPostProcessorEngine`, `WEDMCon
... [+1040 chars truncated]

### Assistant | 2026-05-27T01:29:24.045Z

I'll search the PRISM codebase to identify the coarse hubs and fine specialists for each pipeline stage.

### Assistant | 2026-05-27T01:29:24.194Z

[tool_use: Read]

### Assistant | 2026-05-27T01:29:24.609Z

[tool_use: Read]

### Assistant | 2026-05-27T01:29:24.676Z

[tool_use: Glob]

### Assistant | 2026-05-27T01:29:24.945Z

[tool_use: Glob]

### User | 2026-05-27T01:29:31.109Z

[tool_result] read-once-guard: 'H:\PRISM\mcp-server\data\docs\ENGINE_DIGEST.md' was already read 2s ago in this session and is unchanged (mtime 1779784243803). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-27T01:29:31.489Z

[tool_result] read-once-guard: 'H:\PRISM\mcp-server\data\docs\DISPATCHER_DIGEST.md' was already read 3s ago in this session and is unchanged (mtime 1779845248853). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-27T01:29:36.887Z

[tool_result] mcp-server\src\engines\VideoReplayOrchestratorEngine.ts
mcp-server\src\engines\ScalableCAMOrchestratorEngine.ts
mcp-server\src\engines\ToolInventoryOrchestratorEngine.ts
mcp-server\src\engines\OperatorDashboardOrchestratorEngine.ts
mcp-server\src\engines\PredictionFeedbackOrchestratorEngine.ts
mcp-server\src\engines\PredictiveMaintenanceOrchestratorEngine.ts
mcp-server\src\engines\ProvenPipelineOr
... [+4123 chars truncated]

### User | 2026-05-27T01:29:39.721Z

[tool_result] mcp-server\src\engines\BatchProcessor.ts
mcp-server\src\engines\DfMRulesEngine.ts
mcp-server\src\engines\DiffEngine.ts
mcp-server\src\engines\FinancialAnalysisEngine.ts
mcp-server\src\engines\GCodeTemplateEngine.ts
mcp-server\src\engines\IntentDecompositionEngine.ts
mcp-server\src\engines\PurchasingDirectoryEngine.ts
mcp-server\src\engines\SpindleProtectionEngine.ts
mcp-server\src\engines\Sustaina
... [+4307 chars truncated]

### Assistant | 2026-05-27T01:29:42.089Z

Good data. Now let me search for the 16 pipeline-stage-specific engines and identify specialists.

### Assistant | 2026-05-27T01:29:43.584Z

[tool_use: Grep]

### Assistant | 2026-05-27T01:29:44.392Z

[tool_use: Bash]

### User | 2026-05-27T01:29:52.055Z

[tool_result] 115:- **AssemblyPlannerEngine**: U-CUIX-P0-22 / CAD-UIX-MS0
134:- **AutoCADAddinPluginEngine**: U-CAD-APP-12 (PHASE-48)
135:- **AutoCADDotNetBridgeEngine**: U-CAD-APP-11 (PHASE-48)
213:- **BlueprintToAllCADsOrchestratorEngine**: image-to-6-CAD end-to-end pipeline
217:- **BobCADCAMBridgeEngine**: BobCADCAMBridgeEngine - PRISM-side HTTP client for BobCAD-CAM automation.
246:- **BusinessSyncEngine**:
... [+9225 chars truncated]

### User | 2026-05-27T01:30:08.897Z

[tool_result] H:\PRISM\mcp-server\src\engines/ActiveLearningStrategyEngine.ts
H:\PRISM\mcp-server\src\engines/AdaptiveToolpathRouterEngine.ts
H:\PRISM\mcp-server\src\engines/AdvancedPostPhysicsEngine.ts
H:\PRISM\mcp-server\src\engines/AdvancedPostProcessorEngine.ts
H:\PRISM\mcp-server\src\engines/AISystemRouterEngine.ts
H:\PRISM\mcp-server\src\engines/AnisotropicMaterialModelEngine.ts
H:\PRISM\mcp-server\src\en
... [+2647 chars truncated]

### Assistant | 2026-05-27T01:30:10.801Z

Let me search more systematically for stage-specific engines and their relationships.

### Assistant | 2026-05-27T01:30:12.567Z

[tool_use: Grep]

### User | 2026-05-27T01:30:24.648Z

[tool_result] 57:- **AdvancedPostProcessorEngine**: AdvancedPostProcessorEngine
89:- **AISystemRouterEngine**: AISystemRouterEngine
182:- **BatchCAMStrategyEngines**: 6 Lightweight CAM Strategy Engines in One File
183:- **BatchCAMStrategyEngines2**: 4 Lightweight CAM Strategy Engines in One File
322:- **CalibratedSimulationEngine**: Closes 3 gaps in the simulation pipeline:
329:- **CAMAIValidationEngine**: CAM-
... [+2641 chars truncated]

### Assistant | 2026-05-27T01:30:27.028Z

Let me read the ENGINE_DIGEST more carefully and search for specific stage-related content.

### Assistant | 2026-05-27T01:30:28.480Z

[tool_use: Grep]

### Assistant | 2026-05-27T01:30:28.878Z

[tool_use: Bash]

### User | 2026-05-27T01:30:52.513Z

[tool_result] 52-- **AdvancedCuttingPhysicsExtEngine**: Four critical missing physics models
53-- **AdvancedMathematicalMethodsEngine**: Exhaustive Mathematical/Statistical Gap Fill
54-- **AdvancedMillingStrategiesEngine**: 5 missing milling toolpath algorithms that generate real XYZ:
55-- **AdvancedMLStatisticsEngine**: 3 critical ML/statistics methods for PRISM
56-- **AdvancedPostPhysicsEngine**: PRISM Manufa
... [+15602 chars truncated]

### User | 2026-05-27T01:31:00.032Z

[tool_result] Exit code 2
/usr/bin/bash: eval: line 1: unexpected EOF while looking for matching `"'

### Assistant | 2026-05-27T01:31:08.853Z

Let me read the ENGINE_DIGEST file directly to search for the stage-specific orchestrators and their specialist engines.

### Assistant | 2026-05-27T01:31:09.388Z

[tool_use: Read]

### User | 2026-05-27T01:31:29.869Z

[tool_result] 1	# ENGINE DIGEST
2	## 3217 engines indexed
3	## Auto-generated: 2026-05-12 (manually appended 4 entries for TRAINING-LEARNING-MS0/U-TL-U5..U6)
4	
5	- **AbrasiveJetMachiningEngine**: Physics-Based Abrasive Waterjet Prediction
6	- **AbsorptionChillerEngine**: Absorption refrigeration cycle analysis
7	- **AbstractionHierarchyEngine**: Multi-level tip→principle→law generalization
8	- **AccessControlL
... [+7016 chars truncated]

### Assistant | 2026-05-27T01:31:38.887Z

Now I have context. Let me search systematically for the 16 pipeline stages and find their orchestrators and specialists.

### Assistant | 2026-05-27T01:31:40.650Z

[tool_use: Grep]

### User | 2026-05-27T01:32:02.428Z

[tool_result] 55-- **AdvancedMLStatisticsEngine**: 3 critical ML/statistics methods for PRISM
56-- **AdvancedPostPhysicsEngine**: PRISM Manufacturing Intelligence - Advanced Post-Physics Engine
57:- **AdvancedPostProcessorEngine**: AdvancedPostProcessorEngine
58-- **AdvancedRegressionEngine**: Advanced Regression & ML Methods
59-- **AdvancedReportRendererEngine**: Manufacturing Intelligence Layer
--
87-- **AirD
... [+13435 chars truncated]

### Assistant | 2026-05-27T01:32:07.533Z

Let me read the actual engine files to understand their structure and relationships.

### Assistant | 2026-05-27T01:32:07.534Z

[tool_use: Read]

### Assistant | 2026-05-27T01:32:07.627Z

[tool_use: Read]

### Assistant | 2026-05-27T01:32:13.643Z

[tool_use: Read]

### Assistant | 2026-05-27T01:32:13.645Z

[tool_use: Read]

### User | 2026-05-27T01:32:46.499Z

[tool_result] 1	/**
2	 * IngestionOrchestratorEngine — Route scanned files to domain-specific engines
3	 *
4	 * Takes FolderScannerEngine output and routes each file to the right processor:
5	 *   - PDFs → DocumentInboxEngine (classify + extract)
6	 *   - .MIN/.nc → BoxProgramCensusEngine (program catalog)
7	 *   - .mcx-8/.ipt/.stp → CadFileIndexEngine (CAD index)
8	 *   - .xlsx/.csv → queued for SpreadsheetIng
... [+2399 chars truncated]

### User | 2026-05-27T01:32:46.518Z

[tool_result] 1	/**
2	 * CAMKernelOrchestratorEngine — Unified CAM Kernel Pipeline Orchestrator
3	 *
4	 * CK-MS7: Dispatcher Wiring & Skills for CAM Kernel
5	 *
6	 * Unifies all CK-MS0 through CK-MS6 engines into 3 high-level workflows:
7	 *
8	 * 1. **cam_generate** — Full milling program generation pipeline:
9	 *    FeatureRecognition -> OperationSequencing -> StrategySelection ->
10	 *    ToolpathGeneration -
... [+2823 chars truncated]

### User | 2026-05-27T01:32:46.520Z

[tool_result] 1	/**
2	 * FeasibilityOrchestratorEngine — Master orchestrator for the Machining
3	 * Feasibility Intelligence Stack.
4	 *
5	 * Chains all feasibility layers: WorkpieceState → Accessibility →
6	 * Workholding → Rigidity → SequenceFeasibility → report.
7	 *
8	 * @module FeasibilityOrchestratorEngine
9	 */
10	
11	export interface FeasibilityJob {
12	  stock: { length_mm: number; width_mm: number; he
... [+1733 chars truncated]

### User | 2026-05-27T01:32:46.592Z

[tool_result] 1	/**
2	 * SpeedFeedOrchestratorEngine — the hub wiring 67 integration points into
3	 * a unified speed/feed recommendation pipeline.
4	 *
5	 * Orchestrates resolution of machine, tool, material, holder, coolant,
6	 * workholding, CAM strategy, and geometry context, then applies inline
7	 * Kienzle-force / Taylor-life physics against canonical constants plus
8	 * inline thermal + stability approxi
... [+2957 chars truncated]

### Assistant | 2026-05-27T01:32:53.728Z

Excellent. Now let me search for specialist engines per stage to complete the granularity table.

### Assistant | 2026-05-27T01:32:55.917Z

[tool_use: Grep]

### User | 2026-05-27T01:33:09.219Z

[tool_result] 193-- **BayesianOptimizationEngine**: Gaussian Process surrogate optimization
194-- **BayesianSafetyEngine**: Bayesian S(x) with Credible Intervals
195:- **BayesianToolLifeEngine**: Probabilistic tool life prediction:
196-- **BearingSelectionEngine**: Rolling Element Bearing Selection Calculator
197-- **BeliefStateReasoningEngine**: Maintain probability distributions over states
--
320-- **Calcula
... [+2942 chars truncated]

### Assistant | 2026-05-27T01:33:11.360Z

Let me search for more specialist engines and their relationships to the pipeline stages.

### Assistant | 2026-05-27T01:33:13.099Z

[tool_use: Grep]

### User | 2026-05-27T01:33:26.100Z

[tool_result] 38-- **AdaptiveThermalEngine**: Real-Time Thermal Compensation
39-- **AdaptiveThresholdEngine**: USSH Phase 0.25 / U-SCI06
40:- **AdaptiveToolpathRouterEngine**: Routes each feature/zone to the optimal toolpath algorithm from 30+
41-- **AdaptiveWearEngine**: Real-Time Tool Wear Monitoring & Compensation
42-- **AdditiveManufacturingPhysicsEngine**: First-principles physics for additive
--
1381-- **
... [+2701 chars truncated]

### Assistant | 2026-05-27T01:33:27.981Z

Let me read the PostProcessorPipelineEngine and MasterPostProcessorEngine to understand the POST stage structure.

### Assistant | 2026-05-27T01:33:28.387Z

[tool_use: Read]

### Assistant | 2026-05-27T01:33:28.876Z

[tool_use: Read]

### Assistant | 2026-05-27T01:33:28.972Z

[tool_use: Bash]

### User | 2026-05-27T01:33:53.791Z

[tool_result] 1	/**
2	 * PostProcessorPipelineEngine — Universal Post Processor Pipeline Orchestrator
3	 *
4	 * Chains 35+ optimization stages across 7 phases to produce mathematically
5	 * optimized G-code for any machine, controller, and CAM software.
6	 *
7	 * Pipeline Phases:
8	 *   P0: Input Normalization + Smart Defaults
9	 *   P1: Physics Foundation (per operation)
10	 *   P2: Block-by-Block Optimization
... [+2993 chars truncated]

### User | 2026-05-27T01:33:54.298Z

[tool_result] 1	/**
2	 * MasterPostProcessorEngine — Unified Cross-CAM Post Processing Orchestrator
3	 *
4	 * The master engine that unifies ALL post processor engines into a single pipeline.
5	 * Takes toolpath segments from ANY mix of CAM systems, applies best-of-breed features
6	 * from each, and generates controller-specific G-code with advanced enhancements.
7	 *
8	 * Architecture:
9	 *   [Mixed CAM Toolpa
... [+3992 chars truncated]

### User | 2026-05-27T01:34:02.897Z

[tool_result] H:\PRISM\mcp-server\src\engines/ActiveLearningStrategyEngine.ts
H:\PRISM\mcp-server\src\engines/BatchCAMStrategyEngines.ts
H:\PRISM\mcp-server\src\engines/BatchCAMStrategyEngines2.ts
H:\PRISM\mcp-server\src\engines/BatchSizeStrategyEngine.ts
H:\PRISM\mcp-server\src\engines/CAMStrategyRecommenderEngine.ts
H:\PRISM\mcp-server\src\engines/CATIAStrategyEngine.ts
H:\PRISM\mcp-server\src\engines/Compact
... [+844 chars truncated]

### Assistant | 2026-05-27T01:34:33.203Z

Perfect. Now I have enough data. Let me compile the granularity table based on the engine structure I've found.

Based on my READ-ONLY search of the PRISM engine inventory, here's the MS0 orchestrator granularity guide for the 16 pipeline stages:

| Stage | COARSE hub (start here) | FINE specialist (reach when) | Pitfall | Priority |
|---|---|---|---|---|
| INPUT | **IngestionOrchestratorEngine** | DocumentInboxEngine, CadFileIndexEngine, BoxProgramCensusEngine | Orchestrator classifies all PDFs as "generic" when domain-specific routing (blueprint vs handbook) would skip 40% of non-machining docs | P0 |
| MATERIAL-RESOLVE | **MaterialEquivalenceEngine** | MaterialCalloutParserEngine, MaterialDatabaseBridgeEngine, HeatTreatmentResponseEngine | Orchestrator skips callout parsing and treats spec "6061-T6" as exact match, missing Alcoa/Constellium sourcing equivalents | P0 |
| FEASIBILITY-GATE | **FeasibilityOrchestratorEngine** | AccessibilityAnalysisEngine, WorkholdingIntelligenceEngine, ThinFloorVibrationEngine | Orchestrator runs all 5 feasibility checks (workholding→rigidity→sequence) when thin-wall detection would fail fast on depth-to-diameter ratio | P1 |
| CAD | **CADSystemRouterEngine** (or **BlueprintToAllCADsOrchestratorEngine** for print-input) | SolidWorksCADExecutionBridge, CreoToolkitBridgeEngine, AutoCADDotNetBridgeEngine, FreeCADAutomationBridge | Orchestrator hardcodes Fusion360 when CAD system router would have selected SolidWorks for the customer's license stack | P0 |
| SETUP-PLAN | **SetupSheetEngine** | FeatureClusteringEngine, FixtureDesignEngine, WorkCoordinateEngine, TombstoneLayoutEngine | Orchestrator plans setups linearly when feature clustering would reveal that 60% of features can rotate into one setup with tombstone tombstone fixture | P1 |
| METHOD-ROUTER | **AISystemRouterEngine** | OkumaMacroHeaderGeneratorEngine, AdaptiveToolpathRouterEngine, EdgeOperationDetectorEngine | Orchestrator routes all turning to lathe-CAM when Okuma's buil
... [+5698 chars truncated]
