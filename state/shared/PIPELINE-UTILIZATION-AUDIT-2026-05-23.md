# Print-to-CNC Pipeline Utilization Audit — 2026-05-23

Generated: 2026-06-26T13:40:05.716Z
Total engines on disk: 3669
Pipelines audited: 10

## Per-pipeline utilization summary

| Domain | Pipeline file | Domain engines | Referenced | Util % | Missing (synergy gap) |
|---|---|---:|---:|---:|---:|
| mill | PrintToProgramPipelineEngine.ts | 599 | 5 | 0.8% | 594 |
| lathe | TurningPrintToProgramEngine.ts | 497 | 3 | 0.6% | 494 |
| wire-edm | WireEDMAIPrintToProgramEngine.ts | 459 | 5 | 1.1% | 454 |
| wire-edm-v1 | WEDMPrintToProgramEngine.ts | 351 | 6 | 1.7% | 345 |
| sinker-edm | SinkerEDMPrintToProgramEngine.ts | 219 | 5 | 2.3% | 214 |
| design-to-floor | DesignToFloorPipelineEngine.ts | 521 | 0 | 0% | 521 |
| end-to-end | EndToEndPipelineEngine.ts | 180 | 1 | 0.6% | 179 |
| adaptive | AdaptivePipelineGeneratorEngine.ts | 396 | 1 | 0.3% | 395 |
| dfm | DFMPipelineEngine.ts | 62 | 3 | 4.8% | 59 |
| post | PostProcessorPipelineEngine.ts | 197 | 9 | 4.6% | 188 |

## Top synergy gaps per domain (engines available but NOT referenced)

### mill (utilization 0.8%, 594 gaps)

- `AGISafetyContainmentEngine`
- `AbrasiveJetMachiningEngine`
- `AdaptiveChatterEngine`
- `AdaptiveFeedControlEngine`
- `AdaptiveFeedModulationEngine`
- `AdaptiveMachiningIntegrationEngine`
- `AdaptiveMillingChipLoadMonitorEngine`
- `AdaptiveThermalEngine`
- `AdaptiveToolpathRouterEngine`
- `AdaptiveWearEngine`
- `AdvancedCuttingMathEngine`
- `AdvancedCuttingPhenomenaEngine`
- `AdvancedCuttingPhysicsEngine`
- `AdvancedCuttingPhysicsExtEngine`
- `AdvancedMillingStrategiesEngine`
- _...+15 more_

### lathe (utilization 0.6%, 494 gaps)

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
- `BankFeedImportEngine`
- `BarFeedPitchOptimizerEngine`
- `BarFeederEngine`
- `BlamelessPostMortemEngine`
- _...+15 more_

### wire-edm (utilization 1.1%, 454 gaps)

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
- `BankFeedImportEngine`
- `BarFeedPitchOptimizerEngine`
- `BarFeederEngine`
- `BlamelessPostMortemEngine`
- `CADPerAdapterFeedbackCollectorEngine`
- _...+15 more_

### wire-edm-v1 (utilization 1.7%, 345 gaps)

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

### sinker-edm (utilization 2.3%, 214 gaps)

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

### design-to-floor (utilization 0%, 521 gaps)

- `AdaptiveShopRateEngine`
- `AdditiveQuoteEngine`
- `AdvancedPostPhysicsEngine`
- `AdvancedPostProcessorEngine`
- `AlphacamFunctionIndexEngine`
- `AutoAdjustCascadeEngine`
- `AutoCADAddinPluginEngine`
- `AutoCADDotNetBridgeEngine`
- `AutoPostmortemEngine`
- `AutomatedJobSchedulerEngine`
- `BatchCAMEngine`
- `BlamelessPostMortemEngine`
- `BliskCADEngine`
- `BlueprintToAllCADsOrchestratorEngine`
- `BlueprintToCADGenerationEngine`
- _...+15 more_

### end-to-end (utilization 0.6%, 179 gaps)

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

### adaptive (utilization 0.3%, 395 gaps)

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
- `AIProposalApprovalQueueEngine`
- `AIResourceLearningEngine`
- `AISummaryWriterEngine`
- _...+15 more_

### dfm (utilization 4.8%, 59 gaps)

- `ActualCostEngine`
- `CADToleranceSignalEncoderEngine`
- `CoolantCostOptimizationEngine`
- `CostAlarmEngine`
- `CostAwareRouterEngine`
- `CostEfficiencyBridgeEngine`
- `CostEstimationEngine`
- `CostEstimatorEngine`
- `CostSavingsTrackerEngine`
- `DFMAwareGenerationEngine`
- `EDMCostDocumentationEngine`
- `ERPCostFeedbackEngine`
- `FixtureAwareStrategyEngine`
- `FixtureCadIngesterEngine`
- `FixtureClampingEngine`
- _...+15 more_

### post (utilization 4.6%, 188 gaps)

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