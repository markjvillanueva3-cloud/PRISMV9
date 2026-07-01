# Dormant-Engine Activation Roadmap — DEA-MS0

> Generated 2026-05-22T22:17:24.527Z · slot november · `generate-dormant-engine-roadmap.mjs`
> **Advisory — must human-verify.** Re-run after `audit-unwired-engines.mjs` to refresh.
> **Primary slot: `november`** — owns DEA-MS0: re-runs the generator, tracks progress, closes the milestone.

## Scope

- **Type A — 616 unwired engines**: on disk, zero dispatcher reference. Each unit wires a 5-6 engine batch to its dispatcher.
- **Type B — 6 precision-cluster activations**: engines wired into dispatchers but never called engine-to-engine (F0, MACHINING-MATH-INVENTIONS-AUDIT). Each unit is a *cross-wire*, not a dispatcher-wire.
- **Trilobe / eccentric turning**: 4 unwired engines + macro G-code codegen (user addition 2026-05-22).
- **Total: 118 units across 25 work slots.**

## Per-slot split

| Slot | Domain | Units | Engines |
|------|--------|-------|---------|
| `alpha` | mill / 5-axis | 5 | 25 |
| `bravo` | lathe / turning | 6 | 29 |
| `charlie` | wire-EDM / electrode | 5 | 25 |
| `delta` | CAD / geometry | 5 | 25 |
| `echo` | CAM / strategy | 5 | 25 |
| `foxtrot` | machining know-how / tribal | 5 | 25 |
| `hotel` | ERP / business | 5 | 25 |
| `india` | post-processor / quality | 5 | 25 |
| `juliett` | speed-feed / physics | 5 | 25 |
| `kilo` | print-to-program | 4 | 24 |
| `lima` | PRISM-academy / AI | 4 | 24 |
| `mike` | misc / orchestration | 5 | 25 |
| `november` | precision / dev-infra | 11 | 48 |
| `oscar` | general / overflow | 4 | 24 |
| `papa` | general / overflow | 4 | 24 |
| `quebec` | general / overflow | 4 | 24 |
| `romeo` | general / overflow | 4 | 24 |
| `sierra` | general / overflow | 4 | 24 |
| `tango` | general / overflow | 4 | 24 |
| `uniform` | general / overflow | 4 | 24 |
| `victor` | general / overflow | 4 | 24 |
| `whiskey` | general / overflow | 4 | 24 |
| `xray` | general / overflow | 4 | 24 |
| `yankee` | general / overflow | 4 | 24 |
| `zulu` | general / overflow | 4 | 24 |

> The Engines column counts unit engine/target entries. Type-A unwired engines = 616 total; `activate` units additionally count cross-wire dispatcher-action targets (not unwired engines).

## Verification channel

Re-run `node scripts/audit-unwired-engines.mjs` — UNWIRED count must fall by the engine count of every shipped unit. Baseline UNWIRED = 616.

## Slot `alpha` — mill / 5-axis

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query milling toolpath` · tribal-by-domain = `mill`

### U-DEA-alpha-01 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `AssetRecommendationEngine` → UNKNOWN
  - `BusinessSyncEngine` → UNKNOWN
  - `CoatingSelectionAdapter` → prism_material_processing
  - `CPMPERTEngine` → UNKNOWN
  - `DistributionNetworkEngine` → UNKNOWN
  - `FiveAxisAIUltraIntelligenceEngine` → prism_5axis
- Type: wire+triage · domain: mill / 5-axis · tribal: `mill` · wiki: `milling toolpath`

### U-DEA-alpha-02 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `FiveAxisDecisionEngine` → prism_5axis
  - `FiveAxisDeepLearningEngine` → prism_5axis
  - `FlyingShearEngine` → UNKNOWN
  - `Fusion5AxisEngine` → prism_5axis
  - `InProcessStockModelEngine` → UNKNOWN
  - `MachineModelDownloaderEngine` → UNKNOWN
- Type: wire+triage · domain: mill / 5-axis · tribal: `mill` · wiki: `milling toolpath`

### U-DEA-alpha-03 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `ModelAttributionEngine` → UNKNOWN
  - `OperatorDashboardOrchestratorEngine` → prism_orchestrate
  - `OutcomeTrackingEngine` → UNKNOWN
  - `ProcessRobustnessEngine` → UNKNOWN
  - `RoundnessCylindricitySamplingEngine` → UNKNOWN
  - `SO3KinematicsEncoderEngine` → prism_5axis
- Type: wire+triage · domain: mill / 5-axis · tribal: `mill` · wiki: `milling toolpath`

### U-DEA-alpha-04 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `SpreadsheetIngestionEngine` → prism_forming
  - `ToolOutputSummarizerEngine` → UNKNOWN
  - `TribalKnowledgeOutcomeBridgeEngine` → prism_ai
  - `WEDMPostSodickEngine` → prism_cam
  - `WEDMSlugTabRetentionEngine` → prism_edm
  - `WesternElectricRulesEngine` → UNKNOWN
- Type: wire+triage · domain: mill / 5-axis · tribal: `mill` · wiki: `milling toolpath`

### U-DEA-alpha-05 — Wire 1 engine → prism_edm

- Engines → target dispatcher:
  - `WireEDMMachineTechDataEngine` → prism_edm
- Type: wire · domain: mill / 5-axis · tribal: `mill` · wiki: `milling toolpath`

## Slot `bravo` — lathe / turning

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query lathe turning` · tribal-by-domain = `lathe`

### U-DEA-bravo-01 — Wire 6 engines (mixed dispatchers — see per-engine target)

- Engines → target dispatcher:
  - `FusionMaterialPhysicsBridge` → prism_data
  - `LatheAdvancedOperationsEngine` → prism_turning
  - `LatheAIFeatureRegistration` → prism_turning
  - `LatheAIUltraEngine` → prism_turning
  - `LatheDeepAIHardeningEngine` → prism_turning
  - `LatheDeepLearningEngine` → prism_turning
- Type: wire · domain: lathe / turning · tribal: `lathe` · wiki: `lathe turning`

### U-DEA-bravo-02 — Wire 6 engines → prism_turning

- Engines → target dispatcher:
  - `LatheDeepLearningIntelligenceEngine` → prism_turning
  - `LatheFullArchiveTrainingEngine` → prism_turning
  - `LatheIntelligenceEngine` → prism_turning
  - `LatheLoRADatasetValidatorEngine` → prism_turning
  - `LatheLoRAExampleGeneratorEngine` → prism_turning
  - `LatheLoRAInferenceGatewayEngine` → prism_turning
- Type: wire · domain: lathe / turning · tribal: `lathe` · wiki: `lathe turning`

### U-DEA-bravo-03 — Wire 6 engines → prism_turning

- Engines → target dispatcher:
  - `LatheLoRAKnowledgeCuratorEngine` → prism_turning
  - `LatheLoRAMergeStrategyEngine` → prism_turning
  - `LatheLoRAModelOptimizerEngine` → prism_turning
  - `LatheLoRANeuralBridgeEngine` → prism_turning
  - `LatheLoRANeuralOrchestratorEngine` → prism_turning
  - `LatheLoRAOllamaDeployerEngine` → prism_turning
- Type: wire · domain: lathe / turning · tribal: `lathe` · wiki: `lathe turning`

### U-DEA-bravo-04 — Wire 6 engines → prism_turning

- Engines → target dispatcher:
  - `LatheLoRAPhysicsAugmentedInferenceEngine` → prism_turning
  - `LatheLoRAPhysicsEvaluatorEngine` → prism_turning
  - `LatheLoRAPipelineCoordinatorEngine` → prism_turning
  - `LatheLoRAProgramMinerEngine` → prism_turning
  - `LatheLoRAProgramParserEngine` → prism_turning
  - `LatheLoRAQuantizationOptimizerEngine` → prism_turning
- Type: wire · domain: lathe / turning · tribal: `lathe` · wiki: `lathe turning`

### U-DEA-bravo-05 — Wire 1 engine → prism_turning

- Engines → target dispatcher:
  - `LatheLoRAReasoningChainInferenceEngine` → prism_turning
- Type: wire · domain: lathe / turning · tribal: `lathe` · wiki: `lathe turning`

### U-DEA-bravo-TRILOBE — Lathe trilobe / eccentric turning + macro G-code

Wire the 4 trilobe/eccentric engines into prism_turning AND generate macro-based G-code: X-axis modulation X(C) as a parametric profile for trilobe, eccentric-offset transform, polygon-turning G51.2 synchronization. Math: trochoidal/parametric profile + offset kinematics.

- Engines/targets: `EccentricTurningEngine`, `TrilobeDeformationEngine`, `ColdHeadingToolConfiguratorEngine`, `ExpandingMandrelEngine`
- Type: wire+codegen · domain: lathe / turning · tribal: `lathe` · wiki: `lathe turning trilobe macro`

## Slot `charlie` — wire-EDM / electrode

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query wire edm electrode` · tribal-by-domain = `wedm`

### U-DEA-charlie-01 — Wire 6 engines (mixed dispatchers — see per-engine target)

- Engines → target dispatcher:
  - `AdvancedMillingStrategiesEngine` → prism_edm
  - `LaserLoRADatasetBuilderEngine` → prism_edm
  - `LathePrintSetupSelectionEngine` → prism_turning
  - `LatheUnifiedAIEngine` → prism_turning
  - `OneClickWEDMGeneratorEngine` → prism_edm
  - `SinkerEDMLoRACadenceEngine` → prism_edm
- Type: wire · domain: wire-EDM / electrode · tribal: `wedm` · wiki: `wire edm electrode`

### U-DEA-charlie-02 — Wire 6 engines → prism_edm

- Engines → target dispatcher:
  - `SinkerEDMLoRADatasetBuilderEngine` → prism_edm
  - `WaterjetLoRADatasetBuilderEngine` → prism_edm
  - `WEDMBatchProgramAnalyzerEngine` → prism_edm
  - `WEDMDwgImportEngine` → prism_edm
  - `WEDMFewShotEngine` → prism_edm
  - `WEDMHierarchicalPlannerEngine` → prism_edm
- Type: wire · domain: wire-EDM / electrode · tribal: `wedm` · wiki: `wire edm electrode`

### U-DEA-charlie-03 — Wire 6 engines → prism_edm

- Engines → target dispatcher:
  - `WEDMHumanHandoffEngine` → prism_edm
  - `WEDMJobPatternLearnerEngine` → prism_edm
  - `WEDMKnowledgeDistillationEngine` → prism_edm
  - `WEDMLearningLoopEngine` → prism_edm
  - `WEDMLoRACadenceEngine` → prism_edm
  - `WEDMLoRADatasetBuilderEngine` → prism_edm
- Type: wire · domain: wire-EDM / electrode · tribal: `wedm` · wiki: `wire edm electrode`

### U-DEA-charlie-04 — Wire 6 engines → prism_edm

- Engines → target dispatcher:
  - `WEDMMaintenanceSchedulerEngine` → prism_edm
  - `WEDMMaterialCharacterizationEngine` → prism_edm
  - `WEDMMaterialSparkDatabaseEngine` → prism_edm
  - `WEDMModelUpdateEngine` → prism_edm
  - `WEDMMultiProfileBatchEngine` → prism_edm
  - `WEDMNeuralTrainingEngine` → prism_edm
- Type: wire · domain: wire-EDM / electrode · tribal: `wedm` · wiki: `wire edm electrode`

### U-DEA-charlie-05 — Wire 1 engine → prism_edm

- Engines → target dispatcher:
  - `WEDMParetoCacheEngine` → prism_edm
- Type: wire · domain: wire-EDM / electrode · tribal: `wedm` · wiki: `wire edm electrode`

## Slot `delta` — CAD / geometry

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query cad geometry feature` · tribal-by-domain = `cad`

### U-DEA-delta-01 — Wire 6 engines → prism_cad

- Engines → target dispatcher:
  - `AutoCADAddinPluginEngine` → prism_cad
  - `AutoCADDotNetBridgeEngine` → prism_cad
  - `cadLiveDispatch` → prism_cad
  - `CADScreenshotCapturer` → prism_cad
  - `CADToSTEPPipelineEngine` → prism_cad
  - `CascadeFallbackChainEngine` → prism_cad
- Type: wire · domain: CAD / geometry · tribal: `cad` · wiki: `cad geometry feature`

### U-DEA-delta-02 — Wire 6 engines → prism_cad

- Engines → target dispatcher:
  - `EngineDigestEngine` → prism_cad
  - `FiveAxisCADTemplateEngine` → prism_cad
  - `FreeCADAutomationBridge` → prism_cad
  - `Fusion360CADFunctionIndexEngine` → prism_cad
  - `Fusion360CADGeneratorAdapter` → prism_cad
  - `HyperCADCADFunctionIndexEngine` → prism_cad
- Type: wire · domain: CAD / geometry · tribal: `cad` · wiki: `cad geometry feature`

### U-DEA-delta-03 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `InventorCADFunctionIndexEngine` → prism_cad
  - `MachineOptionContractEngine` → UNKNOWN
  - `MultiObjectiveParetoEngine` → UNKNOWN
  - `NXOpenSketchEntityEngine` → prism_cad
  - `PackingSlipEngine` → UNKNOWN
  - `PerAppInCADInferenceAdapter` → prism_cad
- Type: wire+triage · domain: CAD / geometry · tribal: `cad` · wiki: `cad geometry feature`

### U-DEA-delta-04 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `ProcessValidationIQOQPQEngine` → UNKNOWN
  - `RunoutEffectEngine` → UNKNOWN
  - `StandardDimensionLookupEngine` → UNKNOWN
  - `ToolRedirectEngine` → UNKNOWN
  - `TwoPassCascadeEngine` → prism_cad
  - `UnifiedCADCodeGeneratorBase` → prism_cad
- Type: wire+triage · domain: CAD / geometry · tribal: `cad` · wiki: `cad geometry feature`

### U-DEA-delta-05 — Triage + wire 1 engine (suggestedDispatcher UNKNOWN — review before wiring)

- Engines → target dispatcher:
  - `WetRunChangeFreezeEngine` → UNKNOWN
- Type: triage+wire · domain: CAD / geometry · tribal: `cad` · wiki: `cad geometry feature`

## Slot `echo` — CAM / strategy

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query cam strategy toolpath` · tribal-by-domain = `cam`

### U-DEA-echo-01 — Wire 6 engines → prism_cam

- Engines → target dispatcher:
  - `BlamelessPostMortemEngine` → prism_cam
  - `CAMAIActionLinkerEngine` → prism_cam
  - `CAMBaselineRegressorEngine` → prism_cam
  - `CAMCatalogEnrichmentValidator` → prism_cam
  - `CAMCatalogPhysicsLinkerEngine` → prism_cam
  - `CAMCatalogSplitterEngine` → prism_cam
- Type: wire · domain: CAM / strategy · tribal: `cam` · wiki: `cam strategy toolpath`

### U-DEA-echo-02 — Wire 6 engines → prism_cam

- Engines → target dispatcher:
  - `CAMLoRAAdapterTrainerEngine` → prism_cam
  - `CAMMLDriftMonitorEngine` → prism_cam
  - `CAMMLSplitEngine` → prism_cam
  - `CAMPhase5Stubs` → prism_cam
  - `CAMPostInvokeOrchestratorEngine` → prism_cam
  - `CAMTrainingExtractionAggregatorEngine` → prism_cam
- Type: wire · domain: CAM / strategy · tribal: `cam` · wiki: `cam strategy toolpath`

### U-DEA-echo-03 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `CAMTribalRAGEngine` → prism_cam
  - `CAMTribalTipLinkerEngine` → prism_cam
  - `CAMUtilityEngines` → prism_cam
  - `CimatronCAMBridgeEngine` → prism_cam
  - `CrossCAMComparisonLedgerEngine` → prism_cam
  - `FusionDeepLearningEngine` → UNKNOWN
- Type: wire+triage · domain: CAM / strategy · tribal: `cam` · wiki: `cam strategy toolpath`

### U-DEA-echo-04 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `HybridPostMergeEngine` → prism_cam
  - `HyperMillACBridgeEngine` → UNKNOWN
  - `HyperMillACScriptExecutor` → prism_skill_script
  - `HyperMillPluginAdapterEngine` → UNKNOWN
  - `HyperMillSchemaUnifier` → UNKNOWN
  - `InventorCAMCodeGeneratorEngine` → prism_cam
- Type: wire+triage · domain: CAM / strategy · tribal: `cam` · wiki: `cam strategy toolpath`

### U-DEA-echo-05 — Wire 1 engine → prism_cam

- Engines → target dispatcher:
  - `InventorCAMStrategyEngine` → prism_cam
- Type: wire · domain: CAM / strategy · tribal: `cam` · wiki: `cam strategy toolpath`

## Slot `foxtrot` — machining know-how / tribal

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query shop practice tribal` · tribal-by-domain = `mill`

### U-DEA-foxtrot-01 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `AssetSynergyDetectorEngine` → UNKNOWN
  - `CacheEngine` → UNKNOWN
  - `CoatingSelectionEngine` → prism_material_processing
  - `CpsParserEngine` → UNKNOWN
  - `ElectrospinningEngine` → UNKNOWN
  - `FormalVerificationEngine` → UNKNOWN
- Type: wire+triage · domain: machining know-how / tribal · tribal: `mill` · wiki: `shop practice tribal`

### U-DEA-foxtrot-02 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `FusionStrategyKnowledgeEngine` → prism_ai
  - `InsertChangeRecommendationEngine` → UNKNOWN
  - `LatheMasterPostUnifiedOutputEngine` → prism_cam
  - `LathePrintToleranceStackEngine` → prism_turning
  - `LatheUnifiedPhysicsOrchestrationEngine` → prism_turning
  - `MachineOptionMatrixEngine` → UNKNOWN
- Type: wire+triage · domain: machining know-how / tribal · tribal: `mill` · wiki: `shop practice tribal`

### U-DEA-foxtrot-03 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `MultiSetupFeasibilityChainEngine` → prism_feasibility
  - `OrchestratorConfidenceFeedbackEngine` → prism_orchestrate
  - `PactContractTestEngine` → UNKNOWN
  - `ProcessVariabilityIntegrationEngine` → UNKNOWN
  - `SaaSAPIEngine` → UNKNOWN
  - `SoftJawBoringGCodeEngine` → prism_cam
- Type: wire+triage · domain: machining know-how / tribal · tribal: `mill` · wiki: `shop practice tribal`

### U-DEA-foxtrot-04 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `StockFeedCycleEngine` → UNKNOWN
  - `TPEHyperparameterSearchEngine` → UNKNOWN
  - `TribalEvolutionEngine` → UNKNOWN
  - `WEDMPostTypes` → prism_cam
  - `WEDMStartPointOptimizationEngine` → prism_edm
  - `WetRunRetentionPolicyEngine` → UNKNOWN
- Type: wire+triage · domain: machining know-how / tribal · tribal: `mill` · wiki: `shop practice tribal`

### U-DEA-foxtrot-05 — Wire 1 engine → prism_edm

- Engines → target dispatcher:
  - `WireEDMPredictiveIntelligenceEngine` → prism_edm
- Type: wire · domain: machining know-how / tribal · tribal: `mill` · wiki: `shop practice tribal`

## Slot `hotel` — ERP / business

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query erp business cost` · tribal-by-domain = `lathe`

### U-DEA-hotel-01 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `CostEstimationEngine` → prism_business
  - `CostEstimatorEngine` → prism_business
  - `CreoAddinRibbonEngine` → UNKNOWN
  - `CustomerKnowledgeEngine` → prism_business
  - `CustomerPortfolioMinerEngine` → prism_business
  - `cycleSchedulingBridge` → prism_scheduling
- Type: wire+triage · domain: ERP / business · tribal: `lathe` · wiki: `erp business cost`

### U-DEA-hotel-02 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `DocustrataCustomerIndexEngine` → prism_business
  - `EmbeddingFilterEngine` → UNKNOWN
  - `ERPImportEngine` → UNKNOWN
  - `ERPWorkOrderEngine` → prism_business
  - `FourthAxisDecisionEngine` → UNKNOWN
  - `InsertGradeSelectionEngine` → UNKNOWN
- Type: wire+triage · domain: ERP / business · tribal: `lathe` · wiki: `erp business cost`

### U-DEA-hotel-03 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `MachinePackageAPIEngine` → UNKNOWN
  - `MultiPathReasoningEngine` → prism_business
  - `MultiSignalAutoRollbackEngine` → UNKNOWN
  - `PDFHandbookBatchProcessorEngine` → UNKNOWN
  - `ProgramEquivalentIndexEngine` → UNKNOWN
  - `SBOMReviewEngine` → UNKNOWN
- Type: wire+triage · domain: ERP / business · tribal: `lathe` · wiki: `erp business cost`

### U-DEA-hotel-04 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `SchedulingPhysicsEngine` → prism_scheduling
  - `ShopFloorCostEngine` → prism_business
  - `ShopFloorQuoteEngine` → prism_business
  - `StreamVsBatchReconciliationEngine` → prism_business
  - `SubprogramExtractionEngine` → UNKNOWN
  - `TransferLearningAdapterEngine` → UNKNOWN
- Type: wire+triage · domain: ERP / business · tribal: `lathe` · wiki: `erp business cost`

### U-DEA-hotel-05 — Triage + wire 1 engine (suggestedDispatcher UNKNOWN — review before wiring)

- Engines → target dispatcher:
  - `WetRunStateMachineEngine` → UNKNOWN
- Type: triage+wire · domain: ERP / business · tribal: `lathe` · wiki: `erp business cost`

## Slot `india` — post-processor / quality

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query post processor controller` · tribal-by-domain = `cam`

### U-DEA-india-01 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `ConcentrationInequalityEngine` → prism_quality
  - `CUSUMEngine` → prism_process_control
  - `DataQualityEngine` → prism_quality
  - `DNCCompareEngine` → UNKNOWN
  - `DNCFileTransferEngine` → UNKNOWN
  - `DNCGenerateEngine` → UNKNOWN
- Type: wire+triage · domain: post-processor / quality · tribal: `cam` · wiki: `post processor controller`

### U-DEA-india-02 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `DNCQREngine` → UNKNOWN
  - `DNCSendEngine` → UNKNOWN
  - `DNCVerifyEngine` → UNKNOWN
  - `DOETaguchEngine` → prism_process_control
  - `ERPQualityEngine` → prism_quality
  - `HyperMillFAIBridge` → prism_quality
- Type: wire+triage · domain: post-processor / quality · tribal: `cam` · wiki: `post processor controller`

### U-DEA-india-03 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `HyperMillSPCBridge` → prism_quality
  - `IntegrationForesightEngine` → UNKNOWN
  - `MachinePackageSelectionEngine` → UNKNOWN
  - `MultiSpindleAutomaticEngine` → UNKNOWN
  - `MultivariateSPCEngine` → prism_quality
  - `PDFSourceRegistryEngine` → UNKNOWN
- Type: wire+triage · domain: post-processor / quality · tribal: `cam` · wiki: `post processor controller`

### U-DEA-india-04 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `ProgrammerProductivityEngine` → UNKNOWN
  - `QualityFormulasEngine` → prism_quality
  - `SchemaMigrationRollbackEngine` → UNKNOWN
  - `SPCProcessCapabilityEngine` → prism_quality
  - `SurfaceLocationErrorEngine` → UNKNOWN
  - `TransformerEngine` → UNKNOWN
- Type: wire+triage · domain: post-processor / quality · tribal: `cam` · wiki: `post processor controller`

### U-DEA-india-05 — Triage + wire 1 engine (suggestedDispatcher UNKNOWN — review before wiring)

- Engines → target dispatcher:
  - `WhiteLabelConfigEngine` → UNKNOWN
- Type: triage+wire · domain: post-processor / quality · tribal: `cam` · wiki: `post processor controller`

## Slot `juliett` — speed-feed / physics

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query speed feed physics` · tribal-by-domain = `mill`

### U-DEA-juliett-01 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `AlgorithmOrchestratorEngine` → prism_calc
  - `CalculatorPRISMModeEngine` → prism_calc
  - `CoolantOptimizationPhysicsEngine` → prism_calc
  - `FeedbackCollectorEngine` → UNKNOWN
  - `FeedbackLoopDoctorEngine` → UNKNOWN
  - `FormulaWiringEngine` → prism_calc
- Type: wire+triage · domain: speed-feed / physics · tribal: `mill` · wiki: `speed feed physics`

### U-DEA-juliett-02 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `GrepOptimizerEngine` → prism_calc
  - `IntelligentSequencingAdapter` → UNKNOWN
  - `MachineConfidenceCalculatorEngine` → prism_calc
  - `MachineProfilePropagationEngine` → UNKNOWN
  - `MonteCarloProcessEngine` → prism_calc
  - `MonteCarloScheduleEngine` → prism_calc
- Type: wire+triage · domain: speed-feed / physics · tribal: `mill` · wiki: `speed feed physics`

### U-DEA-juliett-03 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `MultiTurretSyncEngine` → UNKNOWN
  - `OptimizationEngine` → prism_calc
  - `OptimizationFormulasEngine` → prism_calc
  - `PalletPoolOptimizerEngine` → prism_calc
  - `PDFTableExtractionEngine` → UNKNOWN
  - `PipelineOptimizationEngine` → prism_calc
- Type: wire+triage · domain: speed-feed / physics · tribal: `mill` · wiki: `speed feed physics`

### U-DEA-juliett-04 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `QdrantSurfaceEngine` → UNKNOWN
  - `RealTimeOptimizationEngine` → prism_calc
  - `ScrewConveyorEngine` → UNKNOWN
  - `SFCOptimizeEngine` → prism_calc
  - `SweptVolumeEngine` → UNKNOWN
  - `TriLevelKillSwitchEngine` → UNKNOWN
- Type: wire+triage · domain: speed-feed / physics · tribal: `mill` · wiki: `speed feed physics`

### U-DEA-juliett-05 — Triage + wire 1 engine (suggestedDispatcher UNKNOWN — review before wiring)

- Engines → target dispatcher:
  - `WorldModelEngine` → UNKNOWN
- Type: triage+wire · domain: speed-feed / physics · tribal: `mill` · wiki: `speed feed physics`

## Slot `kilo` — print-to-program

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query print to program` · tribal-by-domain = `cam`

### U-DEA-kilo-01 — Triage + wire 6 engines (suggestedDispatcher UNKNOWN — review before wiring)

- Engines → target dispatcher:
  - `AtomicMultiFileWriteEngine` → UNKNOWN
  - `CapabilityIndexEngine` → UNKNOWN
  - `CodeGenerationIntegrityEngine` → UNKNOWN
  - `CreoIntegrationTestSuiteEngine` → UNKNOWN
  - `EmbeddingGuardEngine` → UNKNOWN
  - `FourthAxisIndexingEngine` → UNKNOWN
- Type: triage+wire · domain: print-to-program · tribal: `cam` · wiki: `print to program`

### U-DEA-kilo-02 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `HardenedAgentCapabilitiesEngine` → prism_orchestrate
  - `IntentRouterEngine` → UNKNOWN
  - `LatheMetaLearningEngine` → prism_turning
  - `LathePrintToolpathGeneratorEngine` → prism_cam
  - `LoRAAdapterRegistryEngine` → prism_ai
  - `MachineToolErrorBudgetEngine` → UNKNOWN
- Type: wire+triage · domain: print-to-program · tribal: `cam` · wiki: `print to program`

### U-DEA-kilo-03 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `NCPatternMinerEngine` → UNKNOWN
  - `PairedPrintProgramBundleEngine` → prism_ai
  - `PhysicsAwareDataAugmentationEngine` → UNKNOWN
  - `PrintMatchStallDetectorEngine` → UNKNOWN
  - `QdrantVectorStoreEngine` → UNKNOWN
  - `SelfModelEngine` → UNKNOWN
- Type: wire+triage · domain: print-to-program · tribal: `cam` · wiki: `print to program`

### U-DEA-kilo-04 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `SwissChannelFileEmitterEngine` → UNKNOWN
  - `TroubleshootingDecisionTreeEngine` → UNKNOWN
  - `TurningStrategyCatalog` → prism_turning
  - `WEDMProcessCausalityEngine` → prism_edm
  - `WEDMStrategyLibraryEngine` → prism_edm
  - `WireEDMResearchAIEngine` → prism_edm
- Type: wire+triage · domain: print-to-program · tribal: `cam` · wiki: `print to program`

## Slot `lima` — PRISM-academy / AI

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query learning academy` · tribal-by-domain = `mill`

### U-DEA-lima-01 — Triage + wire 6 engines (suggestedDispatcher UNKNOWN — review before wiring)

- Engines → target dispatcher:
  - `AttractorDetectionEngine` → UNKNOWN
  - `CAPAWorkflowEngine` → UNKNOWN
  - `CodexClientEngine` → UNKNOWN
  - `CreoToolkitBridgeEngine` → UNKNOWN
  - `EngineRegistryEngine` → UNKNOWN
  - `FreezeDryingEngine` → UNKNOWN
- Type: triage+wire · domain: PRISM-academy / AI · tribal: `mill` · wiki: `learning academy`

### U-DEA-lima-02 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `InferenceChainEngine` → prism_ai
  - `InstructorDashboardEngine` → UNKNOWN
  - `InterOperationStateEngine` → UNKNOWN
  - `LathePrintToProgramDLIntelligenceEngine` → prism_turning
  - `MachineLoRABaseEngine` → prism_ai
  - `MacroConversionAnalyzerEngine` → UNKNOWN
- Type: wire+triage · domain: PRISM-academy / AI · tribal: `mill` · wiki: `learning academy`

### U-DEA-lima-03 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `NewCoderModeEngine` → UNKNOWN
  - `PhysicsPredictionEngine` → UNKNOWN
  - `PostAMFinishingPlanEngine` → prism_cam
  - `QTValidationSuiteEngine` → UNKNOWN
  - `SemanticAssetIndexEngine` → UNKNOWN
  - `StockBoundaryGateEngine` → prism_safety
- Type: wire+triage · domain: PRISM-academy / AI · tribal: `mill` · wiki: `learning academy`

### U-DEA-lima-04 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `SwissGuideBushingPhysicsEngine` → UNKNOWN
  - `TurretLayoutEngine` → UNKNOWN
  - `UncertaintyPropagationEngine` → prism_ai
  - `WEDMProductionReadinessEngine` → prism_edm
  - `WEDMTabStrategyEngine` → prism_edm
  - `WireEDMSelfAwarenessIntegrationEngine` → prism_edm
- Type: wire+triage · domain: PRISM-academy / AI · tribal: `mill` · wiki: `learning academy`

## Slot `mike` — misc / orchestration

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query orchestration misc` · tribal-by-domain = `mill`

### U-DEA-mike-01 — Wire 6 engines (mixed dispatchers — see per-engine target)

- Engines → target dispatcher:
  - `AgentAutoUpdateEngine` → prism_orchestrate
  - `AgenticLoopEngine` → prism_orchestrate
  - `AgentSpecializationProfileEngine` → prism_orchestrate
  - `AgentWorkflowEngine` → prism_orchestrate
  - `AIMLFormulasEngine` → prism_ai
  - `AssemblyPlannerEngine` → prism_orchestrate
- Type: wire · domain: misc / orchestration · tribal: `mill` · wiki: `orchestration misc`

### U-DEA-mike-02 — Wire 6 engines (mixed dispatchers — see per-engine target)

- Engines → target dispatcher:
  - `AuthorityRankingEngine` → prism_auth
  - `BuildPlannerEngine` → prism_orchestrate
  - `CATIAIntegrationTestSuiteEngine` → prism_ai
  - `ChainExecutorEngine` → prism_ai
  - `ComplexPartPlannerEngine` → prism_orchestrate
  - `ConsensusAIBridgeEngine` → prism_ai
- Type: wire · domain: misc / orchestration · tribal: `mill` · wiki: `orchestration misc`

### U-DEA-mike-03 — Wire 6 engines → prism_ai

- Engines → target dispatcher:
  - `ConsensusNeuralFeedbackEngine` → prism_ai
  - `CrossProcessAIBridge` → prism_ai
  - `DecisionReasoningEngine` → prism_ai
  - `DeepAIIntelligenceEngine` → prism_ai
  - `DependencyGraphEngine` → prism_ai
  - `DetachedLoRARunnerEngine` → prism_ai
- Type: wire · domain: misc / orchestration · tribal: `mill` · wiki: `orchestration misc`

### U-DEA-mike-04 — Wire 6 engines (mixed dispatchers — see per-engine target)

- Engines → target dispatcher:
  - `DomainOrchestratorPluginRegistry` → prism_ai
  - `EditPlannerEngine` → prism_orchestrate
  - `EnsembleMLEngine` → prism_ai
  - `ErrorExplainerEngine` → prism_ai
  - `ForceNeuralPredictorEngine` → prism_ai
  - `ForesightOrchestratorEngine` → prism_orchestrate
- Type: wire · domain: misc / orchestration · tribal: `mill` · wiki: `orchestration misc`

### U-DEA-mike-05 — Wire 1 engine → prism_ai

- Engines → target dispatcher:
  - `FormulaIntegrationEngine` → prism_ai
- Type: wire · domain: misc / orchestration · tribal: `mill` · wiki: `orchestration misc`

## Slot `november` — precision / dev-infra

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query precision accuracy` · tribal-by-domain = `mill`

### U-DEA-november-01 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `AcousticEmissionMonitoringEngine` → prism_monitoring
  - `ArchiveToPartsCatalogIngesterEngine` → prism_safety
  - `BuildAdvisorEngine` → prism_dev
  - `BuildDebriefEngine` → prism_dev
  - `CalibratedSimulationEngine` → UNKNOWN
  - `ContextualBoundaryEngine` → prism_session
- Type: wire+triage · domain: precision / dev-infra · tribal: `mill` · wiki: `precision accuracy`

### U-DEA-november-02 — Wire 6 engines (mixed dispatchers — see per-engine target)

- Engines → target dispatcher:
  - `CorrigibilityGateEngine` → prism_safety
  - `CounterfactualBuildSimulatorEngine` → prism_dev
  - `EmergentBehaviorMonitorEngine` → prism_monitoring
  - `GateFailureHistoryEngine` → prism_safety
  - `GitSafetyEngine` → prism_safety
  - `HyperMillMetricCfgExtractor` → prism_monitoring
- Type: wire · domain: precision / dev-infra · tribal: `mill` · wiki: `precision accuracy`

### U-DEA-november-03 — Wire 6 engines (mixed dispatchers — see per-engine target)

- Engines → target dispatcher:
  - `InferenceLoRAGateEngine` → prism_safety
  - `InMemoryFileOverlayEngine` → prism_session
  - `LiveToolingIntelligenceEngine` → prism_safety
  - `LiveToolingSyntaxEngine` → prism_safety
  - `MemoryConflictResolverEngine` → prism_session
  - `MOUStallGateEngine` → prism_safety
- Type: wire · domain: precision / dev-infra · tribal: `mill` · wiki: `precision accuracy`

### U-DEA-november-04 — Wire 6 engines (mixed dispatchers — see per-engine target)

- Engines → target dispatcher:
  - `OllamaContextFloorEngine` → prism_session
  - `OutcomeEpisodicMemoryBridgeEngine` → prism_session
  - `PilotPhaseExitGateEngine` → prism_safety
  - `PreWetRunChaosGateEngine` → prism_safety
  - `PrometheusMetricsEngine` → prism_monitoring
  - `PromotionGateEngine` → prism_safety
- Type: wire · domain: precision / dev-infra · tribal: `mill` · wiki: `precision accuracy`

### U-DEA-november-05 — Wire 1 engine → prism_safety

- Engines → target dispatcher:
  - `SpindleTorqueGateEngine` → prism_safety
- Type: wire · domain: precision / dev-infra · tribal: `mill` · wiki: `precision accuracy`

### U-DEA-november-P01 — Activate acc_thermal_error -> post_inject_motion

Wire machine-error thermal compensation into the post-processor motion injection so emitted G-code carries thermal-growth offsets.

- Engines/targets: `acc_thermal_error`, `post_inject_motion`, `post_thermal_compensate`
- Type: activate · domain: precision / dev-infra · tribal: `mill` · wiki: `precision accuracy metrology`

### U-DEA-november-P02 — Activate acc_volumetric / acc_abbe / acc_ball_bar -> cad_machine_capability_get

Feed volumetric/Abbe/ball-bar error envelope into machine-capability lookup so strategy selection sees the real accuracy envelope.

- Engines/targets: `acc_volumetric`, `acc_abbe_offset`, `acc_ball_bar`, `cad_machine_capability_get`
- Type: activate · domain: precision / dev-infra · tribal: `mill` · wiki: `precision accuracy metrology`

### U-DEA-november-P03 — Activate diamond_turning_* -> cam_strategy_recommend

Wire diamond-turning surface/forces/wear models into CAM strategy recommendation for sub-micron finish operations.

- Engines/targets: `diamond_turning_surface`, `diamond_turning_forces`, `diamond_turning_wear`, `cam_strategy_recommend`
- Type: activate · domain: precision / dev-infra · tribal: `mill` · wiki: `precision accuracy metrology`

### U-DEA-november-P04 — Activate laser_interferometer_* -> machine_warmup_calculate

Wire laser-interferometer wavelength/deadpath/comp-table into machine warmup + leveling setup.

- Engines/targets: `laser_interferometer_wavelength`, `laser_interferometer_comp_table`, `machine_warmup_calculate`
- Type: activate · domain: precision / dev-infra · tribal: `mill` · wiki: `precision accuracy metrology`

### U-DEA-november-P05 — Activate spm_* -> quality_kpis / spc_calculate

Wire statistical-process-monitoring (Hotelling T2, PCA, HMM, SPRT) into the quality KPI + SPC surfaces.

- Engines/targets: `spm_hotelling_t2`, `spm_pca_monitoring`, `spm_combined_spc`, `quality_kpis`, `spc_calculate`
- Type: activate · domain: precision / dev-infra · tribal: `mill` · wiki: `precision accuracy metrology`

### U-DEA-november-P06 — Activate cad_probe_drift_* -> probe_routine_generate + wire PrintAccuracyProofEngine

Wire probe-drift record/analyze/alerts into probe routine generation; wire the unwired PrintAccuracyProofEngine.

- Engines/targets: `cad_probe_drift_record`, `cad_probe_drift_analyze`, `probe_routine_generate`, `PrintAccuracyProofEngine`
- Type: activate · domain: precision / dev-infra · tribal: `mill` · wiki: `precision accuracy metrology`

## Slot `oscar` — general / overflow

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query milling toolpath` · tribal-by-domain = `mill`

### U-DEA-oscar-01 — Triage + wire 6 engines (suggestedDispatcher UNKNOWN — review before wiring)

- Engines → target dispatcher:
  - `AutodeskFusionMCPProxyEngine` → UNKNOWN
  - `CashFlowProjectionEngine` → UNKNOWN
  - `CommonlyMissedPatternsRegistry` → UNKNOWN
  - `CriticalPathDetectorEngine` → UNKNOWN
  - `EntropyTrackerEngine` → UNKNOWN
  - `FrequentPathEngine` → UNKNOWN
- Type: triage+wire · domain: general / overflow · tribal: `mill` · wiki: `milling toolpath`

### U-DEA-oscar-02 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `ISO13485QMSEngine` → UNKNOWN
  - `JMDiePostProcessorLearningEngine` → prism_cam
  - `LatheOpusReasoningEngine` → prism_turning
  - `LathePrintToProgramKnowledgeGraphEngine` → prism_turning
  - `MakeVsBuyDecisionEngine` → UNKNOWN
  - `MastercamHeadlessIntegrationTestEngine` → prism_cam
- Type: wire+triage · domain: general / overflow · tribal: `mill` · wiki: `milling toolpath`

### U-DEA-oscar-03 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `NXOpenAssemblyDrawingEngine` → UNKNOWN
  - `PipelineRegistryBridge` → UNKNOWN
  - `PostProcessorUnificationEngine` → prism_cam
  - `QuotingEngine` → UNKNOWN
  - `SensorDataSchemaEngine` → UNKNOWN
  - `STRIPSPlannerEngine` → prism_orchestrate
- Type: wire+triage · domain: general / overflow · tribal: `mill` · wiki: `milling toolpath`

### U-DEA-oscar-04 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `SwissPartTransferSequenceEngine` → prism_multi_op
  - `TypeAwareReferenceEngine` → UNKNOWN
  - `UncertaintyPropagationPipelineEngine` → prism_ai
  - `WEDMProgramComparisonEngine` → prism_edm
  - `WEDMTaperErrorBudgetEngine` → prism_edm
  - `WorkholdingRetrofitAdvisorEngine` → prism_safety
- Type: wire+triage · domain: general / overflow · tribal: `mill` · wiki: `milling toolpath`

## Slot `papa` — general / overflow

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query lathe turning` · tribal-by-domain = `lathe`

### U-DEA-papa-01 — Triage + wire 6 engines (suggestedDispatcher UNKNOWN — review before wiring)

- Engines → target dispatcher:
  - `AutomatedResourceHarvestingPipeline` → UNKNOWN
  - `CatalogRegistryBridgeEngine` → UNKNOWN
  - `CompleteMachiningEngine` → UNKNOWN
  - `CrossToolCouplingEngine` → UNKNOWN
  - `EntryExitStrategyAdapter` → UNKNOWN
  - `GageRRMSAEngine` → UNKNOWN
- Type: triage+wire · domain: general / overflow · tribal: `lathe` · wiki: `lathe turning`

### U-DEA-papa-02 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `ISO14971RiskManagementEngine` → UNKNOWN
  - `KnowledgeGraphFeatureProjectorEngine` → prism_ai
  - `LatheOrchestrationEngine` → prism_turning
  - `LathePrintToProgramReasoningEngine` → prism_turning
  - `MastercamMillTurnBridge` → prism_cam
  - `MasterIndexGenerator` → UNKNOWN
- Type: wire+triage · domain: general / overflow · tribal: `lathe` · wiki: `lathe turning`

### U-DEA-papa-03 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `OllamaHookBridgeEngine` → UNKNOWN
  - `PlaywrightAutomationEngine` → prism_automation
  - `PowerMillStrategyEngine` → UNKNOWN
  - `RateLimitEngine` → UNKNOWN
  - `SensorFusionEngine` → UNKNOWN
  - `SustainCarbonEngine` → prism_diagnosis
- Type: wire+triage · domain: general / overflow · tribal: `lathe` · wiki: `lathe turning`

### U-DEA-papa-04 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `SwissTypeDecisionEngine` → UNKNOWN
  - `TypeFlowTracerEngine` → UNKNOWN
  - `UnifiedPPAGIOrchestrationEngine` → prism_ai
  - `WEDMProgramOptimizerEngine` → prism_edm
  - `WEDMTradeoffElicitationEngine` → prism_edm
  - `WorkholdingSelectionEngine` → prism_safety
- Type: wire+triage · domain: general / overflow · tribal: `lathe` · wiki: `lathe turning`

## Slot `quebec` — general / overflow

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query wire edm electrode` · tribal-by-domain = `wedm`

### U-DEA-quebec-01 — Triage + wire 6 engines (suggestedDispatcher UNKNOWN — review before wiring)

- Engines → target dispatcher:
  - `BackupRestoreDrillEngine` → UNKNOWN
  - `CATIAAddinPluginEngine` → UNKNOWN
  - `ComplexityAwareRouterEngine` → UNKNOWN
  - `CuriosityDrivenExplorerEngine` → UNKNOWN
  - `EPackTableImportEngine` → UNKNOWN
  - `GapPredictorEngine` → UNKNOWN
- Type: triage+wire · domain: general / overflow · tribal: `wedm` · wiki: `wire edm electrode`

### U-DEA-quebec-02 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `ISO286ExtendedEngine` → UNKNOWN
  - `KnowledgeGraphNeuralBridgeEngine` → prism_ai
  - `LathePartFamilyPlanningEngine` → prism_turning
  - `LatheProgrammingStyleSelectorEngine` → prism_turning
  - `MaterialHardnessStateClassifierEngine` → prism_data
  - `MeasurementSystemAnalysisEngine` → UNKNOWN
- Type: wire+triage · domain: general / overflow · tribal: `wedm` · wiki: `wire edm electrode`

### U-DEA-quebec-03 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `OnshapeAPIBridgeEngine` → UNKNOWN
  - `PluginEngine` → UNKNOWN
  - `PrintCorpusOrchestratorEngine` → prism_orchestrate
  - `RCSAEngine` → UNKNOWN
  - `SensorSimulatorEngine` → UNKNOWN
  - `SustainEnergyEngine` → prism_diagnosis
- Type: wire+triage · domain: general / overflow · tribal: `wedm` · wiki: `wire edm electrode`

### U-DEA-quebec-04 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `SwissTypeIntelligenceEngine` → UNKNOWN
  - `UnifiedProgramParserEngine` → UNKNOWN
  - `UserModelEngine` → prism_auth
  - `WEDMProgramVerificationEngine` → prism_edm
  - `WEDMWhatIfSimulatorEngine` → prism_edm
  - `XProcNeuralAutoFireEngine` → prism_ai
- Type: wire+triage · domain: general / overflow · tribal: `wedm` · wiki: `wire edm electrode`

## Slot `romeo` — general / overflow

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query cad geometry feature` · tribal-by-domain = `cad`

### U-DEA-romeo-01 — Triage + wire 6 engines (suggestedDispatcher UNKNOWN — review before wiring)

- Engines → target dispatcher:
  - `AbstractionHierarchyEngine` → UNKNOWN
  - `BallMillEngine` → UNKNOWN
  - `CATIACAAV5BridgeEngine` → UNKNOWN
  - `CompositionalSynthesisEngine` → UNKNOWN
  - `CycloneSeparatorEngine` → UNKNOWN
  - `ErrorBudgetEngine` → UNKNOWN
- Type: triage+wire · domain: general / overflow · tribal: `cad` · wiki: `cad geometry feature`

### U-DEA-romeo-02 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `GeminiClientEngine` → UNKNOWN
  - `JmDieMachineConfigEngine` → UNKNOWN
  - `KnowledgeInjectionPipelineEngine` → prism_ai
  - `LathePostGeneratorActiveLearningEngine` → prism_cam
  - `LatheProofCarryingEmitEngine` → prism_turning
  - `MaterialHarvesterEngine` → prism_data
- Type: wire+triage · domain: general / overflow · tribal: `cad` · wiki: `cad geometry feature`

### U-DEA-romeo-03 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `MeasureSummaryEngine` → UNKNOWN
  - `OnshapeLiveCollabAdapter` → UNKNOWN
  - `PredictiveWorldSimulatorEngine` → UNKNOWN
  - `RadialEngagementControllerEngine` → prism_cam
  - `ReceptanceCouplingEngine` → UNKNOWN
  - `SFCCompareEngine` → UNKNOWN
- Type: wire+triage · domain: general / overflow · tribal: `cad` · wiki: `cad geometry feature`

### U-DEA-romeo-04 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `SustainOptimizeEngine` → prism_diagnosis
  - `SymbolImpactEngine` → UNKNOWN
  - `UniversalFeedbackCommandEngine` → UNKNOWN
  - `VideoELearningAIEngine` → prism_ai
  - `WEDMRecipeAdaptationEngine` → prism_edm
  - `WEDMWireBreakRiskCostEngine` → prism_edm
- Type: wire+triage · domain: general / overflow · tribal: `cad` · wiki: `cad geometry feature`

## Slot `sierra` — general / overflow

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query cam strategy toolpath` · tribal-by-domain = `cam`

### U-DEA-sierra-01 — Triage + wire 6 engines (suggestedDispatcher UNKNOWN — review before wiring)

- Engines → target dispatcher:
  - `AcquisitionRecommendationEngine` → UNKNOWN
  - `BarRemnantManagementEngine` → UNKNOWN
  - `CentrifugeEngine` → UNKNOWN
  - `ConsensusObsidianPersistenceEngine` → UNKNOWN
  - `DeadLetterQueueEngine` → UNKNOWN
  - `EWMAEngine` → UNKNOWN
- Type: triage+wire · domain: general / overflow · tribal: `cam` · wiki: `cam strategy toolpath`

### U-DEA-sierra-02 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `GoldenBaselineManagerEngine` → UNKNOWN
  - `KalmanFilterEngine` → UNKNOWN
  - `LatheCAMIntelligenceEngine` → prism_cam
  - `LathePostKnowledgeGraphEngine` → prism_cam
  - `LatheQualityGateEngine` → prism_turning
  - `MembraneFiltrationEngine` → UNKNOWN
- Type: wire+triage · domain: general / overflow · tribal: `cam` · wiki: `cam strategy toolpath`

### U-DEA-sierra-03 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `MetrologyUncertaintyEngine` → prism_ai
  - `OperatorPreferencesEngine` → UNKNOWN
  - `PreMOUKickoffChecklistEngine` → UNKNOWN
  - `reactiveChainBootstrap` → prism_ai
  - `RegressionBaselineEngine` → UNKNOWN
  - `ShopDataCompletenessEngine` → UNKNOWN
- Type: wire+triage · domain: general / overflow · tribal: `cam` · wiki: `cam strategy toolpath`

### U-DEA-sierra-04 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `SVIImpactProjectorEngine` → prism_dev
  - `TappingTorqueEngine` → UNKNOWN
  - `UnusedAssetSurfacerEngine` → UNKNOWN
  - `WEDMParetoFrontierSearchEngine` → prism_edm
  - `WEDMRewardShapingEngine` → prism_edm
  - `WEDMWirePremiumROIEngine` → prism_edm
- Type: wire+triage · domain: general / overflow · tribal: `cam` · wiki: `cam strategy toolpath`

## Slot `tango` — general / overflow

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query milling toolpath` · tribal-by-domain = `mill`

### U-DEA-tango-01 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `ActionSequenceExtractorEngine` → prism_multi_op
  - `BatchQueryEngine` → UNKNOWN
  - `CertificateEngine` → UNKNOWN
  - `ConversationTrimmerEngine` → UNKNOWN
  - `DeepSeekClientEngine` → UNKNOWN
  - `ExecutionVerificationEngine` → UNKNOWN
- Type: wire+triage · domain: general / overflow · tribal: `mill` · wiki: `milling toolpath`

### U-DEA-tango-02 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `GrokCLIClientEngine` → UNKNOWN
  - `LatheLoRATrainingMonitorEngine` → prism_turning
  - `LathePostProcessorAIEngine` → prism_cam
  - `LatheReinforcementLearningEngine` → prism_turning
  - `LiveTurretCAxisEngine` → UNKNOWN
  - `MetacognitionBudgetEngine` → UNKNOWN
- Type: wire+triage · domain: general / overflow · tribal: `mill` · wiki: `milling toolpath`

### U-DEA-tango-03 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `MITCourseKnowledgeEngine` → prism_ai
  - `OpusCapabilityEngine` → UNKNOWN
  - `PrismAddinArchitectureEngine` → UNKNOWN
  - `RegretMinimizationEngine` → UNKNOWN
  - `ReplanTriggerEngine` → prism_orchestrate
  - `ShopFloorDashboardEngine` → UNKNOWN
- Type: wire+triage · domain: general / overflow · tribal: `mill` · wiki: `milling toolpath`

### U-DEA-tango-04 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `SwarmGroupExecutor` → prism_orchestrate
  - `TaptiteElectrodeMacroBridgeEngine` → UNKNOWN
  - `UtilizationContractEngine` → UNKNOWN
  - `WEDMPartFamilyMatcherEngine` → prism_edm
  - `WEDMRLControllerEngine` → prism_cam
  - `WEDMWireSpoolConsumptionEngine` → prism_edm
- Type: wire+triage · domain: general / overflow · tribal: `mill` · wiki: `milling toolpath`

## Slot `uniform` — general / overflow

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query lathe turning` · tribal-by-domain = `lathe`

### U-DEA-uniform-01 — Triage + wire 6 engines (suggestedDispatcher UNKNOWN — review before wiring)

- Engines → target dispatcher:
  - `ActionTraceEngine` → UNKNOWN
  - `BladeProfileLibraryEngine` → UNKNOWN
  - `ChangeImpactRadiusEngine` → UNKNOWN
  - `ConveyorBeltEngine` → UNKNOWN
  - `DesignHistoryFileEngine` → UNKNOWN
  - `ExtendedThinkingBridgeEngine` → UNKNOWN
- Type: triage+wire · domain: general / overflow · tribal: `lathe` · wiki: `lathe turning`

### U-DEA-uniform-02 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `GrokClientEngine` → UNKNOWN
  - `LatheLoRATransferStrategyEngine` → prism_turning
  - `LathePostRegressionTestGeneratorEngine` → prism_cam
  - `LatheResourceKnowledgeEngine` → prism_turning
  - `LocalEmbeddingEngine` → UNKNOWN
  - `MicroMillingEngine` → UNKNOWN
- Type: wire+triage · domain: general / overflow · tribal: `lathe` · wiki: `lathe turning`

### U-DEA-uniform-03 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `MixerAgitatorEngine` → prism_ai
  - `OutcomeCaptureBusEngine` → UNKNOWN
  - `PRISMIntelligenceLayer` → UNKNOWN
  - `RepetitionDetectorEngine` → UNKNOWN
  - `RoadmapDAGEngine` → prism_orchestrate
  - `ShopFloorJobEngine` → UNKNOWN
- Type: wire+triage · domain: general / overflow · tribal: `lathe` · wiki: `lathe turning`

### U-DEA-uniform-04 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `SwissTypeCollisionEngine` → prism_safety
  - `TenantOnboardingRunbookEngine` → UNKNOWN
  - `VariabilitySourceTrackerEngine` → UNKNOWN
  - `WEDMPartFamilyTemplateExtractorEngine` → prism_edm
  - `WEDMRLPolicyPersistence` → prism_edm
  - `WEDMWireThreadingMinEngine` → prism_edm
- Type: wire+triage · domain: general / overflow · tribal: `lathe` · wiki: `lathe turning`

## Slot `victor` — general / overflow

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query wire edm electrode` · tribal-by-domain = `wedm`

### U-DEA-victor-01 — Triage + wire 6 engines (suggestedDispatcher UNKNOWN — review before wiring)

- Engines → target dispatcher:
  - `AdvancedCNCConfigEngine` → UNKNOWN
  - `BooleanKernelEngine` → UNKNOWN
  - `ChangePointDetectionEngine` → UNKNOWN
  - `ConveyorDesignEngine` → UNKNOWN
  - `DesignToFloorPipelineEngine` → UNKNOWN
  - `FeatureRegistryEngine` → UNKNOWN
- Type: triage+wire · domain: general / overflow · tribal: `wedm` · wiki: `wire edm electrode`

### U-DEA-victor-02 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `GroundTruthBatchExtractor` → UNKNOWN
  - `LatheMasterPostAPIEngine` → prism_cam
  - `LathePrintFeatureStrategySelectorEngine` → prism_turning
  - `LatheSafetyPredicateEngine` → prism_turning
  - `LokiLogSinkEngine` → UNKNOWN
  - `MicroMillingSizeEffectEngine` → UNKNOWN
- Type: wire+triage · domain: general / overflow · tribal: `wedm` · wiki: `wire edm electrode`

### U-DEA-victor-03 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `MLLineageEngine` → prism_ai
  - `OutcomeDriftCalibrationBridgeEngine` → UNKNOWN
  - `PRISMVerificationPluginEngine` → UNKNOWN
  - `ReportRenderer` → UNKNOWN
  - `RollbackPlannerEngine` → prism_orchestrate
  - `ShopFloorScheduleEngine` → UNKNOWN
- Type: wire+triage · domain: general / overflow · tribal: `wedm` · wiki: `wire edm electrode`

### U-DEA-victor-04 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `SyncCodeVerificationEngine` → prism_dev
  - `ThermoelectricEngine` → UNKNOWN
  - `VendorEngine` → UNKNOWN
  - `WEDMPartRecognitionEngine` → prism_edm
  - `WEDMRolloutSimulatorEngine` → prism_edm
  - `WetRunAuthorizationEngine` → prism_auth
- Type: wire+triage · domain: general / overflow · tribal: `wedm` · wiki: `wire edm electrode`

## Slot `whiskey` — general / overflow

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query cad geometry feature` · tribal-by-domain = `cad`

### U-DEA-whiskey-01 — Triage + wire 6 engines (suggestedDispatcher UNKNOWN — review before wiring)

- Engines → target dispatcher:
  - `AMSAAReliabilityGrowthEngine` → UNKNOWN
  - `BucketElevatorEngine` → UNKNOWN
  - `ChaosDrillSchedulerEngine` → UNKNOWN
  - `CoolantStrategyAdapter` → UNKNOWN
  - `DisasterRecoveryEngine` → UNKNOWN
  - `FileAccessPatternEngine` → UNKNOWN
- Type: triage+wire · domain: general / overflow · tribal: `cad` · wiki: `cad geometry feature`

### U-DEA-whiskey-02 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `HolderOperationMatchEngine` → UNKNOWN
  - `LatheMasterPostDeepReasoningEngine` → prism_cam
  - `LathePrintIngestPipelineEngine` → prism_turning
  - `LatheThermodynamicsEngine` → prism_turning
  - `LSHDedupEngine` → UNKNOWN
  - `MITCourseExpansionEngine` → UNKNOWN
- Type: wire+triage · domain: general / overflow · tribal: `cad` · wiki: `cad geometry feature`

### U-DEA-whiskey-03 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `MobileAlarmEngine` → prism_diagnosis
  - `OutcomePublishAdapterEngine` → UNKNOWN
  - `ProcessCapabilityPredictionEngine` → UNKNOWN
  - `ResourceExtractionStateEngine` → UNKNOWN
  - `SamplingPlanEngine` → prism_orchestrate
  - `ShopMachineOverlayEngine` → UNKNOWN
- Type: wire+triage · domain: general / overflow · tribal: `cad` · wiki: `cad geometry feature`

### U-DEA-whiskey-04 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `TebisCAMBridgeEngine` → prism_cam
  - `ThickenerEngine` → UNKNOWN
  - `VirtualMachiningDeepLearningEngine` → UNKNOWN
  - `WEDMPostAgieEngine` → prism_cam
  - `WEDMRULEngine` → prism_edm
  - `WetRunPilotOrchestratorEngine` → prism_orchestrate
- Type: wire+triage · domain: general / overflow · tribal: `cad` · wiki: `cad geometry feature`

## Slot `xray` — general / overflow

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query cam strategy toolpath` · tribal-by-domain = `cam`

### U-DEA-xray-01 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `AnchoredConfidenceEngine` → UNKNOWN
  - `BurdenRateEngine` → UNKNOWN
  - `ChatterStabilityLobeEngine` → prism_vibration_physics
  - `CopyPasteDetectorEngine` → UNKNOWN
  - `DistillationColumnEngine` → UNKNOWN
  - `FisherInformationEngine` → UNKNOWN
- Type: wire+triage · domain: general / overflow · tribal: `cam` · wiki: `cam strategy toolpath`

### U-DEA-xray-02 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `HTNDecomposerEngine` → UNKNOWN
  - `LatheMasterPostEnsembleCrossCheckEngine` → prism_cam
  - `LathePrintProgramEmitterEngine` → prism_turning
  - `LatheTransferLearningEngine` → prism_turning
  - `MachineConsumerBindingEngine` → UNKNOWN
  - `MITCourseIntegrationEngine` → UNKNOWN
- Type: wire+triage · domain: general / overflow · tribal: `cam` · wiki: `cam strategy toolpath`

### U-DEA-xray-03 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `MultiAgentCoordinatorEngine` → prism_orchestrate
  - `OutcomeReplayBufferBridgeEngine` → UNKNOWN
  - `ProcessDigitalTwinEngine` → UNKNOWN
  - `ResponseCacheEngine` → UNKNOWN
  - `SessionEventLogEngine` → prism_auth
  - `ShopRepositoryPort` → UNKNOWN
- Type: wire+triage · domain: general / overflow · tribal: `cam` · wiki: `cam strategy toolpath`

### U-DEA-xray-04 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `TimeSeriesForecastEngine` → UNKNOWN
  - `TrainingDatasetSnapshotEngine` → prism_ai
  - `VisionActionAnalyzerEngine` → UNKNOWN
  - `WEDMPostFanucEngine` → prism_cam
  - `WEDMSchedulingEngine` → prism_edm
  - `WetRunSessionLogEngine` → prism_auth
- Type: wire+triage · domain: general / overflow · tribal: `cam` · wiki: `cam strategy toolpath`

## Slot `yankee` — general / overflow

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query milling toolpath` · tribal-by-domain = `mill`

### U-DEA-yankee-01 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `ArchardAdhesiveWearEngine` → prism_welding
  - `BusinessDocumentExtractorEngine` → UNKNOWN
  - `CircularDependencyEngine` → UNKNOWN
  - `CounterfactualMillEngine` → UNKNOWN
  - `DistributedCriticalPathEngine` → UNKNOWN
  - `FixtureClampingEngine` → UNKNOWN
- Type: wire+triage · domain: general / overflow · tribal: `mill` · wiki: `milling toolpath`

### U-DEA-yankee-02 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `HypothesisRankerEngine` → UNKNOWN
  - `LatheMasterPostRegressionMatrixEngine` → prism_cam
  - `LathePrintProgramSignoffEngine` → prism_turning
  - `LatheTribalIntegrationEngine` → prism_turning
  - `MachineLayerMerger` → UNKNOWN
  - `MobileCacheEngine` → UNKNOWN
- Type: wire+triage · domain: general / overflow · tribal: `mill` · wiki: `milling toolpath`

### U-DEA-yankee-03 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `MultiCamKnowledgeEngine` → prism_cam
  - `OutcomeRLBridgeEngine` → UNKNOWN
  - `ProcessEnvironmentSensitivityEngine` → UNKNOWN
  - `RhinoCommonBridgeEngine` → UNKNOWN
  - `SessionInsightsLedgerEngine` → prism_auth
  - `SimulationStallDetectorEngine` → UNKNOWN
- Type: wire+triage · domain: general / overflow · tribal: `mill` · wiki: `milling toolpath`

### U-DEA-yankee-04 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `ToolDatabaseDeepLearningEngine` → UNKNOWN
  - `TribalExplanationEngine` → prism_orchestrate
  - `VisualLabEngine` → UNKNOWN
  - `WEDMPostMakinoEngine` → prism_cam
  - `WEDMSequencingEngine` → prism_edm
  - `WireEDMDeepAIHardeningEngine` → prism_edm
- Type: wire+triage · domain: general / overflow · tribal: `mill` · wiki: `milling toolpath`

## Slot `zulu` — general / overflow

**Wiki & tribal anchors** (auto-injected at pickup): `/wiki-query lathe turning` · tribal-by-domain = `lathe`

### U-DEA-zulu-01 — Triage + wire 6 engines (suggestedDispatcher UNKNOWN — review before wiring)

- Engines → target dispatcher:
  - `AS9100TraceabilityEngine` → UNKNOWN
  - `BusinessIntelligenceEngine` → UNKNOWN
  - `CNCToolOffsetPersistenceEngine` → UNKNOWN
  - `CounterfeitPartPreventionEngine` → UNKNOWN
  - `DistributedLockEngine` → UNKNOWN
  - `FlotationCellEngine` → UNKNOWN
- Type: triage+wire · domain: general / overflow · tribal: `lathe` · wiki: `lathe turning`

### U-DEA-zulu-02 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `IncrementalReadEngine` → UNKNOWN
  - `LatheMasterPostRouterEngine` → prism_cam
  - `LathePrintSequencePlannerEngine` → prism_turning
  - `LatheTurningFeatureRecognizerEngine` → prism_turning
  - `MachineModelAcquisitionEngine` → UNKNOWN
  - `MobileTimerEngine` → UNKNOWN
- Type: wire+triage · domain: general / overflow · tribal: `lathe` · wiki: `lathe turning`

### U-DEA-zulu-03 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `MultiToolOrchestratorEngine` → prism_orchestrate
  - `OutcomeTraceEngine` → UNKNOWN
  - `ProcessIntelligenceRouterEngine` → UNKNOWN
  - `RocketNozzleEngine` → UNKNOWN
  - `SmartPrefetchEngine` → UNKNOWN
  - `SmartToolSelectorOrchestratorAdapter` → prism_orchestrate
- Type: wire+triage · domain: general / overflow · tribal: `lathe` · wiki: `lathe turning`

### U-DEA-zulu-04 — Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target)

- Engines → target dispatcher:
  - `ToolLifeGnnEngine` → UNKNOWN
  - `TribalKnowledgeApplicatorEngine` → prism_ai
  - `WebhookEngine` → UNKNOWN
  - `WEDMPostMitsubishiEngine` → prism_cam
  - `WEDMSetupSheetEngine` → prism_edm
  - `WireEDMDeepReasoningEngine` → prism_edm
- Type: wire+triage · domain: general / overflow · tribal: `lathe` · wiki: `lathe turning`
