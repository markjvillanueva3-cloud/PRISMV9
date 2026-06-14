# Print-to-CNC Pipeline Utilization Audit — 2026-05-23

Generated: 2026-05-24T06:19:10.150Z
Total engines on disk: 3207
Pipelines audited: 10

## Per-pipeline utilization summary

| Domain | Pipeline file | Domain engines | Referenced | Util % | Missing (synergy gap) |
|---|---|---:|---:|---:|---:|
| mill | PrintToProgramPipelineEngine.ts | 506 | 5 | 1% | 501 |
| lathe | TurningPrintToProgramEngine.ts | 461 | 3 | 0.7% | 458 |
| wire-edm | WireEDMAIPrintToProgramEngine.ts | 417 | 5 | 1.2% | 412 |
| wire-edm-v1 | WEDMPrintToProgramEngine.ts | 335 | 6 | 1.8% | 329 |
| sinker-edm | SinkerEDMPrintToProgramEngine.ts | 214 | 5 | 2.3% | 209 |
| design-to-floor | DesignToFloorPipelineEngine.ts | 459 | 0 | 0% | 459 |
| end-to-end | EndToEndPipelineEngine.ts | 161 | 1 | 0.6% | 160 |
| adaptive | AdaptivePipelineGeneratorEngine.ts | 357 | 1 | 0.3% | 356 |
| dfm | DFMPipelineEngine.ts | 53 | 3 | 5.7% | 50 |
| post | PostProcessorPipelineEngine.ts | 179 | 9 | 5% | 170 |

## Top synergy gaps per domain (engines available but NOT referenced)

### mill (utilization 1%, 501 gaps)

- `AGISafetyContainmentEngine`
- `AbrasiveJetMachiningEngine`
- `AdaptiveChatterEngine`
- `AdaptiveFeedControlEngine`
- `AdaptiveFeedModulationEngine`
- `AdaptiveMachiningIntegrationEngine`
- `AdaptiveThermalEngine`
- `AdaptiveToolpathRouterEngine`
- `AdaptiveWearEngine`
- `AdvancedCuttingMathEngine`
- `AdvancedCuttingPhenomenaEngine`
- `AdvancedCuttingPhysicsEngine`
- `AdvancedCuttingPhysicsExtEngine`
- `AdvancedMillingStrategiesEngine`
- `AdvancedPostPhysicsEngine`
- _...+15 more_

### lathe (utilization 0.7%, 458 gaps)

- `AdaptiveFeedControlEngine`
- `AdaptiveFeedModulationEngine`
- `AdaptiveToolpathRouterEngine`
- `AdaptiveWearEngine`
- `AdvancedPostPhysicsEngine`
- `AdvancedPostProcessorEngine`
- `AdvancedWearPhysicsEngine`
- `ArchardAdhesiveWearEngine`
- `AutoPostmortemEngine`
- `AutoSpeedFeedCalculatorEngine`
- `AutoSpeedFeedEngine`
- `BarFeedPitchOptimizerEngine`
- `BarFeederEngine`
- `BlamelessPostMortemEngine`
- `CADPerAdapterFeedbackCollectorEngine`
- _...+15 more_

### wire-edm (utilization 1.2%, 412 gaps)

- `AdaptiveFeedControlEngine`
- `AdaptiveFeedModulationEngine`
- `AdvancedMLStatisticsEngine`
- `AdvancedMathematicalMethodsEngine`
- `AdvancedMillingStrategiesEngine`
- `AdvancedPostPhysicsEngine`
- `AdvancedPostProcessorEngine`
- `AutoPostmortemEngine`
- `AutoSpeedFeedCalculatorEngine`
- `AutoSpeedFeedEngine`
- `BarFeedPitchOptimizerEngine`
- `BarFeederEngine`
- `BlamelessPostMortemEngine`
- `CADPerAdapterFeedbackCollectorEngine`
- `CADRegenFeedbackAdapterEngine`
- _...+15 more_

### wire-edm-v1 (utilization 1.8%, 329 gaps)

- `AdaptiveFeedModulationEngine`
- `AdvancedMLStatisticsEngine`
- `AdvancedMathematicalMethodsEngine`
- `AdvancedMillingStrategiesEngine`
- `AdvancedPostPhysicsEngine`
- `AdvancedPostProcessorEngine`
- `AutoPostmortemEngine`
- `BlamelessPostMortemEngine`
- `CAMPostInvokeOrchestratorEngine`
- `CAMPostSelectorUIEngine`
- `CNCControllerDeepLearningEngine`
- `ControllerDialectEngine`
- `ControllerFeatureMatrixEngine`
- `ControllerKnowledgeDBEngine`
- `ControllerKnowledgeEngine`
- _...+15 more_

### sinker-edm (utilization 2.3%, 209 gaps)

- `AdaptiveFeedModulationEngine`
- `AdvancedMLStatisticsEngine`
- `AdvancedMathematicalMethodsEngine`
- `AdvancedMillingStrategiesEngine`
- `EDMBiMaterialCompensationEngine`
- `EDMCostDocumentationEngine`
- `EDMCuttingParamFlushEngine`
- `EDMEngine`
- `EDMFeasibilityEngine`
- `EDMMaterialMachineWireEngine`
- `EDMMonitorSurfaceIntegrityEngine`
- `EDMMultiPassStrategyEngine`
- `EDMParameterEngine`
- `EDMPostProcessGCodeEngine`
- `EDMProgramAssemblerEngine`
- _...+15 more_

### design-to-floor (utilization 0%, 459 gaps)

- `AdditiveQuoteEngine`
- `AdvancedPostPhysicsEngine`
- `AdvancedPostProcessorEngine`
- `AlphacamFunctionIndexEngine`
- `AutoAdjustCascadeEngine`
- `AutoCADAddinPluginEngine`
- `AutoCADDotNetBridgeEngine`
- `AutoPostmortemEngine`
- `BatchCAMEngine`
- `BlamelessPostMortemEngine`
- `BliskCADEngine`
- `BlueprintToAllCADsOrchestratorEngine`
- `BlueprintToCADGenerationEngine`
- `BlueprintToQuoteBridgeEngine`
- `BobCADCAMBridgeEngine`
- _...+15 more_

### end-to-end (utilization 0.6%, 160 gaps)

- `AdaptivePipelineGeneratorEngine`
- `AdvancedPostPhysicsEngine`
- `AdvancedPostProcessorEngine`
- `AutoFixPipelineEngine`
- `AutoPostmortemEngine`
- `AutomaticPipelineComposerEngine`
- `BlamelessPostMortemEngine`
- `CADToSTEPPipelineEngine`
- `CADTrainingPipelineOrchestratorEngine`
- `CAMPostInvokeOrchestratorEngine`
- `CAMPostSelectorUIEngine`
- `CNCSimulationPipelineEngine`
- `ContentIngestionPipelineEngine`
- `CpsPostParserEngine`
- `CrossCAMPostEngine`
- _...+15 more_

### adaptive (utilization 0.3%, 356 gaps)

- `AGISafetyContainmentEngine`
- `AIAutoUtilizationEngine`
- `AICapabilityMaximizerEngine`
- `AIDecisionExplanationEngine`
- `AIDeepKnowledgeIntegrationEngine`
- `AIExtractionReasonerEngine`
- `AIFeatureAutoRegistryEngine`
- `AIGeneratedCodeApprovalGateEngine`
- `AIIntelligenceMaximizerEngine`
- `AIMLEngine`
- `AIMLFormulasEngine`
- `AIPhysicsOptimizationEngine`
- `AIResourceLearningEngine`
- `AISystemRouterEngine`
- `AISystemSynchronizerEngine`
- _...+15 more_

### dfm (utilization 5.7%, 50 gaps)

- `ActualCostEngine`
- `CADToleranceSignalEncoderEngine`
- `CoolantCostOptimizationEngine`
- `CostAlarmEngine`
- `CostAwareRouterEngine`
- `CostEstimationEngine`
- `CostEstimatorEngine`
- `CostSavingsTrackerEngine`
- `DFMAwareGenerationEngine`
- `EDMCostDocumentationEngine`
- `ERPCostFeedbackEngine`
- `FixtureAwareStrategyEngine`
- `FixtureCadIngesterEngine`
- `FixtureClampingEngine`
- `FixtureDesignEngine`
- _...+15 more_

### post (utilization 5%, 170 gaps)

- `AdvancedPostPhysicsEngine`
- `AutoPostmortemEngine`
- `BatchMacroConversionEngine`
- `BlamelessPostMortemEngine`
- `CAMPostInvokeOrchestratorEngine`
- `CAMPostSelectorUIEngine`
- `CNCControllerDeepLearningEngine`
- `ControllerFeatureMatrixEngine`
- `ControllerKnowledgeDBEngine`
- `ControllerKnowledgeEngine`
- `ControllerProgrammingIntelligenceEngine`
- `ControllerStrategyValidatorEngine`
- `CpsPostParserEngine`
- `CrossCAMPostEngine`
- `EDMPostProcessGCodeEngine`
- _...+15 more_

## Interpretation

- **utilization_pct** = (engines this pipeline references) / (domain-relevant engines on disk).
- A gap is **not necessarily a bug** — many engines are intentionally orchestrated by SIBLING pipelines (e.g. post-processor engines live in `PostProcessorPipelineEngine`, not in `PrintToProgramPipelineEngine`).
- Gaps DO indicate synergy opportunities: an engine in the gap list COULD be composed into the pipeline if its capability is relevant.
- Heuristic: filename keyword overlap. False-positive gaps possible. Operator must verify before adding new pipeline composition.

Companion: `print-to-cnc-pipeline-utilization-audit-2026-05-23.md` — synthesis + per-domain synergy recommendations.