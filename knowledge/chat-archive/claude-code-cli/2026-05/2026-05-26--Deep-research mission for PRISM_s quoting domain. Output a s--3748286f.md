---
type: "chat-session"
source: "claude-code-cli"
session_id: "3748286f-a6e2-4600-9e03-04df11f30a84"
title: "Deep-research mission for PRISM's quoting domain. Output a structured synthesis "
date: "2026-05-26"
first_ts: "2026-05-26T20:04:36.700Z"
last_ts: "2026-05-26T20:17:31.501Z"
cwd: "H:\\prism"
messages: 88
user_msgs: 40
assistant_msgs: 48
raw_file: "H:/.claude/projects/H--prism/3748286f-a6e2-4600-9e03-04df11f30a84/subagents/agent-a87eb1d62f1d7162d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Deep-research mission for PRISM's quoting domain. Output a structured synthesis 

> **claude-code-cli** | 2026-05-26 | 88 msgs (40 user / 48 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/3748286f-a6e2-4600-9e03-04df11f30a84/subagents/agent-a87eb1d62f1d7162d.jsonl`

## Transcript

### User | 2026-05-26T20:04:36.700Z

Deep-research mission for PRISM's quoting domain. Output a structured synthesis (~500-800 words). The goal is to enumerate **every PRISM node/domain that should be wired into quoting but currently isn't**, plus **every algorithm/formula PRISM already has** that would enhance quoting, plus **gap-class algorithms/formulas worth generating**.

**Context you need to internalize first** (read these):
- `H:/prism/state/shared/specs/QUOTING-REGISTRY-BRIDGE-2026-05-26.md` — the spec I just committed naming the registry-bridge gap (8 manufacturing pipelines consume `PipelineRegistryBridge`, 0 of 39 quoting engines do).
- `H:/prism/mcp-server/src/engines/PipelineRegistryBridge.ts` first 150 lines — the existing material/tool/machine resolver.
- `H:/prism/mcp-server/src/engines/QuoteEstimatorEngine.ts` first 200 lines — primary quoting engine.
- `H:/prism/mcp-server/src/engines/JobCostingEngine.ts` first 100 lines — what quoting currently imports.

**Survey scope — find every wireable node/domain to quoting**:

1. **Manufacturing-physics inputs (HIGH-leverage)**: Glob `H:/prism/mcp-server/src/engines/*Force*.ts`, `*Wear*.ts`, `*Surface*.ts`, `*Chatter*.ts`, `*Deflection*.ts`, `*Thermal*.ts`. Which of these produce values that affect cost (cycle time, tool consumption, scrap rate, rework probability)? Are any wired into JobCosting or QuoteEstimator today?

2. **CAM-domain inputs**: Glob `H:/prism/mcp-server/src/engines/*Toolpath*.ts`, `*CAM*.ts`, `*Strategy*.ts`. Specifically: does cycle-time-prediction flow into quote? (Look for `predictedCycleTime`, `estimatedTimeInCut`.)

3. **CAD-domain inputs**: `*CAD*.ts`, `*Blueprint*.ts`, `*Feature*.ts`, `*Tolerance*.ts`. The TolerancePricingImpactEngine exists — what else COULD inform quote that doesn't today? (Feature complexity, stock geometry, blueprint OCR confidence as risk multiplier.)

4. **Quality/SPC inputs**: `*SPC*.ts`, `*Cpk*.ts`, `*Inspection*.ts`, `*FAI*.ts`. Per-customer historical Cpk should inform price-for-risk.

5. *
... [+2712 chars truncated]

### Assistant | 2026-05-26T20:04:51.641Z

I'll conduct a deep-research mission on PRISM's quoting domain, systematically scanning for wireable nodes, existing algorithms, and gaps. Let me start by reading the core context files and then systematically surveying the engines.

### Assistant | 2026-05-26T20:04:52.139Z

[tool_use: Read]

### Assistant | 2026-05-26T20:04:52.493Z

[tool_use: Read]

### Assistant | 2026-05-26T20:04:52.911Z

[tool_use: Read]

### Assistant | 2026-05-26T20:04:52.998Z

[tool_use: Read]

### User | 2026-05-26T20:05:14.053Z

[tool_result] 1	/**
2	 * PipelineRegistryBridge — U-ARCH3
3	 *
4	 * Shared utility for all 9 pipeline engines to resolve materials, tools, and
5	 * machines from the canonical registries (2.9K materials, 95K tools, 910 machines).
6	 *
7	 * Resolution strategy per resource:
8	 *   Material: MaterialRegistry → CANONICAL_MATERIAL_DB → ISO group default
9	 *   Tool:     ToolRegistry (by catalog/ID) → input params →
... [+4754 chars truncated]

### User | 2026-05-26T20:05:14.093Z

[tool_result] 1	/**
2	 * QuoteEstimatorEngine — Unified physics-backed manufacturing quote estimation.
3	 *
4	 * Replaces the naive vol/MRR cycle time with physics-based calculations,
5	 * integrates secondary ops, tool costs, feature-based complexity, DfM warnings,
6	 * NRE charges, learning curve, and historical accuracy feedback.
7	 *
8	 * Pulls from: JobCostingEngine (base costs), ManufacturingCalculations 
... [+6340 chars truncated]

### User | 2026-05-26T20:05:14.133Z

[tool_result] 1	/**
2	 * PRISM MCP Server — Job Costing Engine
3	 *
4	 * Complete job cost estimation: material, setup, machining, programming,
5	 * inspection, finishing, overhead. Configurable shop rates and machine rates.
6	 *
7	 * Ported from PRISM_JOB_COSTING_ENGINE.js (monolith R2.3.1).
8	 *
9	 * @module JobCostingEngine
10	 */
11	
12	// ====================================================================
... [+3960 chars truncated]

### User | 2026-05-26T20:05:14.138Z

[tool_result] 1	# Quoting ↔ Registry Bridge — synergy gap spec
2	
3	**Authored:** 2026-05-26, slot:charlie, claude-3748286f, /loop iter2 (post iter41 ship).
4	**Scope:** wire-in spec for the user-named "bridge/wire databases: materials, tooling, tool holders, coolants, oils, parts for machines, machines, inserts" directive.
5	**Status:** RESEARCH + SPEC — implementation deferred to per-leg units (see §Unit punc
... [+9926 chars truncated]

### Assistant | 2026-05-26T20:05:21.258Z

Now let me systematically survey the engines for wireable nodes and existing algorithms.

### Assistant | 2026-05-26T20:05:21.260Z

[tool_use: Glob]

### Assistant | 2026-05-26T20:05:21.678Z

[tool_use: Glob]

### Assistant | 2026-05-26T20:05:21.681Z

[tool_use: Glob]

### Assistant | 2026-05-26T20:05:21.684Z

[tool_use: Glob]

### Assistant | 2026-05-26T20:05:22.862Z

[tool_use: Glob]

### Assistant | 2026-05-26T20:05:22.866Z

[tool_use: Glob]

### User | 2026-05-26T20:05:42.533Z

[tool_result] mcp-server\src\engines\ChuckJawForceEngine.ts
mcp-server\src\engines\TailstockForceEngine.ts
mcp-server\src\engines\TurningForceEngine.ts
mcp-server\src\engines\WorkholdingForceEngine.ts
mcp-server\src\engines\ExtrusionForceEngine.ts
mcp-server\src\engines\ForceCapabilityEngine.ts
mcp-server\src\engines\StochasticCuttingForceEngine.ts
mcp-server\src\engines\plugins\KienzleForcePlugin.ts
mcp-server
... [+599 chars truncated]

### User | 2026-05-26T20:05:42.567Z

[tool_result] mcp-server\src\engines\AdvancedWearPhysicsEngine.ts
mcp-server\src\engines\WearPatternRefinishEngine.ts
mcp-server\src\engines\StochasticToolWearEngine.ts
mcp-server\src\engines\ToolWearRateEngine.ts
mcp-server\src\engines\ToolWearCompensationEngine.ts
mcp-server\src\engines\ThermalWearCouplingEngine.ts
mcp-server\src\engines\ToolWearProgressionEngine.ts
mcp-server\src\engines\WearForceCompensatio
... [+271 chars truncated]

### User | 2026-05-26T20:05:42.572Z

[tool_result] mcp-server\src\engines\SurfaceFinishEngine.ts
mcp-server\src\engines\SurfaceIntersectionEngine.ts
mcp-server\src\engines\OffsetSurfaceEngine.ts
mcp-server\src\engines\SurfaceReconstructionEngine.ts
mcp-server\src\engines\SurfaceFinishDatabaseEngine.ts
mcp-server\src\engines\ParametricSurfaceEngine.ts
mcp-server\src\engines\SurfaceGrindingEngine.ts
mcp-server\src\engines\SurfaceRoughnessEngine.ts
m
... [+1145 chars truncated]

### User | 2026-05-26T20:05:42.628Z

[tool_result] mcp-server\src\engines\PartDeflectionEngine.ts
mcp-server\src\engines\StochasticDeflectionEngine.ts
mcp-server\src\engines\plugins\ToolDeflectionPlugin.ts
mcp-server\src\engines\ToolAssemblyDeflectionEngine.ts
mcp-server\src\engines\BoringBarDeflectionEngine.ts
mcp-server\src\engines\ToolDeflectionPredictionEngine.ts
mcp-server\src\engines\hypermill\HyperMillDeflectionThermalMappingEngine.ts
mcp-s
... [+212 chars truncated]

### User | 2026-05-26T20:05:42.631Z

[tool_result] mcp-server\src\engines\ThermalGrowthCompensationEngine.ts
mcp-server\src\engines\ThermalSimEngine.ts
mcp-server\src\engines\ThermalModelingEngine.ts
mcp-server\src\engines\CuttingThermalEngine.ts
mcp-server\src\engines\ThermalExpansionEngine.ts
mcp-server\src\engines\ThermalFatigueEngine.ts
mcp-server\src\engines\ThermalExpansionJointEngine.ts
mcp-server\src\engines\ThermalCompensationModelEngine.
... [+691 chars truncated]

### User | 2026-05-26T20:05:42.635Z

[tool_result] mcp-server\src\engines\StochasticChatterEngine.ts
mcp-server\src\engines\RegenerativeChatterPredictor.ts
mcp-server\src\engines\plugins\ChatterStabilityPlugin.ts
mcp-server\src\engines\AdaptiveChatterEngine.ts
mcp-server\src\engines\ChatterNeuralClassifierEngine.ts
mcp-server\src\engines\ChatterStabilityLobeEngine.ts
mcp-server\src\engines\ChatterPredictionEngine.ts
mcp-server\src\engines\SpeedFee
... [+33 chars truncated]

### Assistant | 2026-05-26T20:05:45.126Z

Now survey CAM, CAD, quality, ERP, risk, and algorithms:

### Assistant | 2026-05-26T20:05:45.530Z

[tool_use: Glob]

### Assistant | 2026-05-26T20:05:45.762Z

[tool_use: Glob]

### Assistant | 2026-05-26T20:05:46.085Z

[tool_use: Glob]

### Assistant | 2026-05-26T20:05:46.256Z

[tool_use: Glob]

### Assistant | 2026-05-26T20:05:46.510Z

[tool_use: Glob]

### Assistant | 2026-05-26T20:05:46.513Z

[tool_use: Glob]

### User | 2026-05-26T20:06:00.778Z

[tool_result] mcp-server\src\engines\EntryExitStrategyEngine.ts
mcp-server\src\engines\MultiCamStrategyEngine.ts
mcp-server\src\engines\CompactionStrategyEngine.ts
mcp-server\src\engines\MultiCamStrategyEngineExt.ts
mcp-server\src\engines\StrategyTaxonomyEngine.ts
mcp-server\src\engines\ControllerStrategyValidatorEngine.ts
mcp-server\src\engines\StrategyBenchmarkEngine.ts
mcp-server\src\engines\StrategySequenci
... [+2866 chars truncated]

### User | 2026-05-26T20:06:00.821Z

[tool_result] mcp-server\src\engines\FeatureToZoneEngine.ts
mcp-server\src\engines\FeatureClusteringEngine.ts
mcp-server\src\engines\FeatureStrategyKnowledgeBaseEngine.ts
mcp-server\src\engines\ControllerFeatureMatrixEngine.ts
mcp-server\src\engines\FirmwareFeatureMatrixEngine.ts
mcp-server\src\engines\FeatureToStrategyBridgeEngine.ts
mcp-server\src\engines\TurningFeatureTaxonomyEngine.ts
mcp-server\src\engines
... [+1524 chars truncated]

### User | 2026-05-26T20:06:00.885Z

[tool_result] mcp-server\src\engines\MultiCAMPostEngine.ts
mcp-server\src\engines\FiveAxisCAMIntegrationEngine.ts
mcp-server\src\engines\SelfLearningCAMEngine.ts
mcp-server\src\engines\MillTurnCAMEngine.ts
mcp-server\src\engines\MultiProcessCAMRouterEngine.ts
mcp-server\src\engines\ScalableCAMOrchestratorEngine.ts
mcp-server\src\engines\CAMKernelDispatcherBridge.ts
mcp-server\src\engines\CAMUtilityEngines.ts
mc
... [+4882 chars truncated]

### User | 2026-05-26T20:06:01.215Z

[tool_result] mcp-server\src\engines\ToolpathCalculations.ts
mcp-server\src\engines\ToolpathGenerationEngine.ts
mcp-server\src\engines\ToolpathLinkingEngine.ts
mcp-server\src\engines\MultiaxisToolpathEngine.ts
mcp-server\src\engines\ToolpathSegmentOptimizerEngine.ts
mcp-server\src\engines\NovelToolpathEngine.ts
mcp-server\src\engines\ToolpathSmoothingEngine.ts
mcp-server\src\engines\FiveAxisToolpathIntegrationE
... [+1027 chars truncated]

### User | 2026-05-26T20:06:01.247Z

[tool_result] mcp-server\src\engines\ToleranceEngine.ts
mcp-server\src\engines\ToleranceStackEngine.ts
mcp-server\src\engines\ToleranceStackUpEngine.ts
mcp-server\src\engines\WEDMBenchmarkToleranceEngine.ts
mcp-server\src\engines\ToleranceAwareGenerationEngine.ts
mcp-server\src\engines\LathePrintToleranceStackEngine.ts
mcp-server\src\engines\ToleranceExtractionEngine.ts
mcp-server\src\engines\CADToleranceSignal
... [+71 chars truncated]

### User | 2026-05-26T20:06:01.298Z

[tool_result] mcp-server\src\engines\CADKernelEngine.ts
mcp-server\src\engines\CADDrawingKnowledgeEngine.ts
mcp-server\src\engines\HyperCADSAutomationEngine.ts
mcp-server\src\engines\PrintToHyperCADSBridge.ts
mcp-server\src\engines\HyperCADSMockLayer.ts
mcp-server\src\engines\hypermill\HyperMillCADArtifactGeneratorEngine.ts
mcp-server\src\engines\TurningCADImportEngine.ts
mcp-server\src\engines\hypermill\CADSeq
... [+5015 chars truncated]

### Assistant | 2026-05-26T20:06:03.429Z

Now survey quality, ERP, risk, and algorithms/formulas:

### Assistant | 2026-05-26T20:06:04.041Z

[tool_use: Glob]

### Assistant | 2026-05-26T20:06:04.171Z

[tool_use: Glob]

### Assistant | 2026-05-26T20:06:04.280Z

[tool_use: Glob]

### system

... [8 middle messages omitted -- see raw_file] ...

### User | 2026-05-26T20:06:33.946Z

[tool_result] mcp-server\src\engines\MultiERPConnectorEngine.ts
mcp-server\src\engines\ERPQualityEngine.ts
mcp-server\src\engines\ERPToolInventoryEngine.ts
mcp-server\src\engines\ERPWorkOrderEngine.ts
mcp-server\src\engines\ERPImportEngine.ts
mcp-server\src\engines\DERPlusPlusEngine.ts
mcp-server\src\engines\LatheERPOrchestratorEngine.ts
mcp-server\src\engines\ERPIntegrationEngine.ts
mcp-server\src\engines\ERPC
... [+20 chars truncated]

### Assistant | 2026-05-26T20:06:35.825Z

Now check algorithms and formulas:

### Assistant | 2026-05-26T20:06:36.057Z

[tool_use: Bash]

### Assistant | 2026-05-26T20:06:36.529Z

[tool_use: Read]

### Assistant | 2026-05-26T20:06:36.648Z

[tool_use: Read]

### User | 2026-05-26T20:07:07.599Z

[tool_result] 1	/**
2	 * PRISM Canonical Physics Constants
3	 *
4	 * ALL physics calculations MUST import from this file.
5	 * NEVER inline numeric values for Kienzle, Taylor, or material properties.
6	 *
7	 * Sources:
8	 * - Kienzle: Sandvik Coromant General Turning (2024), ISO 3685:1993
9	 * - Taylor: Taylor (1907), Modern: ISO 3685:1993
10	 * - EDM: Klocke "Fertigungsverfahren Band 3", DiBitonto et al. (1989
... [+2966 chars truncated]

### User | 2026-05-26T20:07:07.860Z

[tool_result] 1	/**
2	 * PRISM MCP Server - Formula Registry
3	 * Complete access to 109 formulas across 20 domains
4	 * Physics, Manufacturing, AI/ML, Optimization
5	 */
6	
7	import * as fs from "fs/promises";
8	import * as path from "path";
9	import { BaseRegistry } from "./base.js";
10	import { PATHS, DATA_LAYERS } from "../constants.js";
11	import { log } from "../utils/Logger.js";
12	import { fileExists, r
... [+2074 chars truncated]

### User | 2026-05-26T20:11:13.715Z

[tool_result] ABCClassificationFormula.ts  7.1K
ActivationFunctionsAlgorithm.ts  6.3K
AdaptiveControllerModel.ts  17.1K
AmortizationScheduleFormula.ts  8.7K
AnomalyDetector.ts  7.9K
AntColonyTSP.ts  10.0K
BayesianOptimizer.ts  9.6K
BayesianWearModel.ts  9.7K
BillOfMaterialsRollupFormula.ts  11.6K
CSPSetupPlan.ts  15.0K
CWEZBuffer.ts  10.2K
ChipBreakingModel.ts  12.2K
ChipEvacuationModel.ts  11.8K
ChipThinningCo
... [+807 chars truncated]

### Assistant | 2026-05-26T20:11:17.747Z

Let me continue the survey by checking for tribal knowledge and stochastic/uncertainty engines, then examining existing algorithms more comprehensively:

### Assistant | 2026-05-26T20:11:18.203Z

[tool_use: Glob]

### Assistant | 2026-05-26T20:11:18.561Z

[tool_use: Glob]

### Assistant | 2026-05-26T20:11:18.668Z

[tool_use: Glob]

### Assistant | 2026-05-26T20:11:18.900Z

[tool_use: Glob]

### Assistant | 2026-05-26T20:11:19.302Z

[tool_use: Bash]

### Assistant | 2026-05-26T20:11:19.718Z

[tool_use: Bash]

### User | 2026-05-26T20:11:55.342Z

[tool_result] mcp-server\src\engines\TribalExplanationEngine.ts
mcp-server\src\engines\TribalEvolutionEngine.ts
mcp-server\src\engines\PostProcessorTribalKnowledgeIntegrationEngine.ts
mcp-server\src\engines\LatheTribalInjectorEngine.ts
mcp-server\src\engines\TribalKnowledgeMaximizerEngine.ts
mcp-server\src\engines\LatheLoRATribalAugmentationEngine.ts
mcp-server\src\engines\LatheLoRATribalExtractorEngine.ts
mcp-
... [+1637 chars truncated]

### User | 2026-05-26T20:11:55.347Z

[tool_result] mcp-server\src\engines\WikiIndexMaintainerEngine.ts
mcp-server\src\engines\WikiLogAppenderEngine.ts
mcp-server\src\engines\WikiLintEngine.ts
mcp-server\src\engines\WikiIngestRouterEngine.ts
mcp-server\src\engines\WikiRAGFeatureEngine.ts
mcp-server\src\engines\WikiRecallCounterEngine.ts

### User | 2026-05-26T20:11:55.350Z

[tool_result] mcp-server\src\engines\StochasticProcessEngine.ts
mcp-server\src\engines\StochasticGrindingDressingEngine.ts
mcp-server\src\engines\StochasticCompositesEngine.ts
mcp-server\src\engines\StochasticCuttingForceEngine.ts
mcp-server\src\engines\StochasticDimensionalEngine.ts
mcp-server\src\engines\StochasticDeflectionEngine.ts
mcp-server\src\engines\StochasticGrindingEngine.ts
mcp-server\src\engines\St
... [+605 chars truncated]

### User | 2026-05-26T20:11:55.392Z

[tool_result] mcp-server\src\engines\MonteCarloProcessEngine.ts
mcp-server\src\engines\MonteCarloEngine.ts
mcp-server\src\engines\CapacityMonteCarloEngine.ts
mcp-server\src\engines\MonteCarloScheduleEngine.ts

### User | 2026-05-26T20:15:51.949Z

[tool_result] 0

### User | 2026-05-26T20:15:52.101Z

[tool_result] BayesianOptimizer.ts  9.6K
BayesianWearModel.ts  9.7K
ClusteringEngine.ts  9.3K
EnsemblePredictorModel.ts  11.9K
GradientDescent.test.ts  10.5K
GradientDescent.ts  13.4K
KalmanFilter.ts  10.1K
NeuralInference.ts  7.0K
RegressionEngine.ts  7.7K

### Assistant | 2026-05-26T20:16:00.557Z

Now let me search for imports in quoting engines to see what's currently wired:

### Assistant | 2026-05-26T20:16:00.559Z

[tool_use: Bash]

### Assistant | 2026-05-26T20:16:00.563Z

[tool_use: Bash]

### Assistant | 2026-05-26T20:16:00.565Z

[tool_use: Bash]

### Assistant | 2026-05-26T20:16:00.700Z

[tool_use: Bash]

### Assistant | 2026-05-26T20:16:00.841Z

[tool_use: Bash]

### User | 2026-05-26T20:16:27.526Z

[tool_result]       --context-only           Show only match context (not full line)
      --skip-env               Set SKIP_ENV_VALIDATION=1 for child processes (Next.js, tsc, lint, prisma)
      --ultra-compact          Ultra-compact mode: ASCII icons, inline format (Level 2 optimizations)
  -h, --help                   Print help
  -l, --max-len <MAX_LEN>      Max line length [default: 80]
  -m, --max <MAX> 
... [+577 chars truncated]

### User | 2026-05-26T20:16:28.876Z

[tool_result] 0

### User | 2026-05-26T20:16:28.895Z

[tool_result] 0

### User | 2026-05-26T20:16:30.444Z

[tool_result] 91

### User | 2026-05-26T20:16:30.527Z

[tool_result] H:/prism/mcp-server/src/engines/AdditiveQuoteEngine.ts
H:/prism/mcp-server/src/engines/BlueprintToQuoteBridgeEngine.ts
H:/prism/mcp-server/src/engines/CastingQuoteEngine.ts
H:/prism/mcp-server/src/engines/InjectionMoldQuoteEngine.ts
H:/prism/mcp-server/src/engines/InstantQuoteEngine.ts
H:/prism/mcp-server/src/engines/JMDieQuoteTrainingPipelineEngine.ts
H:/prism/mcp-server/src/engines/LatheAutoQuot
... [+800 chars truncated]

### Assistant | 2026-05-26T20:16:33.056Z

Let me use Grep directly to check engine imports:

### Assistant | 2026-05-26T20:16:33.917Z

[tool_use: Grep]

### Assistant | 2026-05-26T20:16:34.195Z

[tool_use: Grep]

### Assistant | 2026-05-26T20:16:34.490Z

[tool_use: Bash]

### User | 2026-05-26T20:16:40.318Z

[tool_result] 13:import { jobCostingEngine, type JobSpec, type CostBreakdown } from "./JobCostingEngine.js";

### User | 2026-05-26T20:16:40.603Z

[tool_result] Found 7 files
mcp-server\src\engines\PrintToProgramPipelineEngine.ts
mcp-server\src\engines\WaterjetProgramAssemblerEngine.ts
mcp-server\src\engines\LaserProgramAssemblerEngine.ts
mcp-server\src\engines\TurningPrintToProgramEngine.ts
mcp-server\src\engines\MillTurnSwissPipelineEngine.ts
mcp-server\src\engines\MultiAxisPrintToProgramEngine.ts
mcp-server\src\engines\GrindingProgramAssemblerEngine.ts

### User | 2026-05-26T20:16:46.641Z

[tool_result] import { jobCostingEngine, type JobSpec, type CostBreakdown } from "./JobCostingEngine.js";

### Assistant | 2026-05-26T20:17:31.501Z

Perfect. I have gathered all the data needed. Let me synthesize the deep-research findings now.

---

## DEEP-RESEARCH SYNTHESIS: PRISM Quoting Domain Gaps & Leverage

### A. Wireable Nodes to Quoting (High→Low Leverage)

| Domain | Top Engines | Wired Today? | Quote-Impact Reason |
|--------|-------------|--------------|-------------------|
| **Material Physics** | KienzleForceModelEngine, CuttingForceEngine (20 force engines total) | NO | Forces drive tooling cost, wear, cycle time; currently bypassed |
| **Manufacturing Physics** | StochasticToolWearEngine, ToolWearProgressionEngine, ThermalWearCouplingEngine (9 wear engines) | NO | Wear rate predicts tool amortization; stochastic versions enable risk-priced quotes |
| **Surface Quality** | SurfaceFinishPredictor, SurfaceIntegrityPredictorEngine (30 surface engines) | NO | Surface spec → premium fees; integrity risk affects scrap pricing |
| **Chatter/Stability** | ChatterStabilityLobeEngine, RegenerativeChatterPredictor (8 chatter engines) | NO | Chatter forces speed reduction → longer cycle time → cost spike; risk of scrap |
| **Deflection** | ToolDeflectionPredictionEngine, PartDeflectionEngine (11 deflection engines) | NO | Deflection → tolerance risk → inspection cost increase; part size drives quote |
| **Thermal** | CuttingThermalEngine, ThermalWearCouplingEngine (24 thermal engines) | NO | Thermal expansion → tolerance drift; thermal fatigue → scrap; influences tool life |
| **CAM Cycle Time** | ToolpathGenerationEngine, ToolpathStrategyEngine (27 toolpath+strategy engines) | NO | Real CAM cycle time (not MRR proxy) is the #1 cost driver; currently placeholder |
| **Tolerance & Feature** | TolerancePricingImpactEngine, CADFeatureRecognitionEngine (9+33 engines) | PARTIAL | TolerancePricingImpactEngine wired; feature recognition not used for complexity premium |
| **Quality/SPC/Cpk** | SPCProcessCapabilityEngine, CpkPredictionGateEngine (11 SPC engines) | NO | Per-customer historical Cpk data should inform
... [+10030 chars truncated]
