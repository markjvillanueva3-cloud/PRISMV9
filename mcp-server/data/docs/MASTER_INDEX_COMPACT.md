# PRISM MASTER INDEX (COMPACT)

Generated: 2026-04-23T13:52:56.474Z
Purpose: Tier-1 always-on pointer sheet. Full detail → MASTER_INDEX.md.


## 1. Counts
| Asset | Count |
|---|---|
| Engines | 631 |
| Dispatchers | 88 |
| Actions (dispatcher z.enum) | 372 |
| Algorithms | 0 |
| Registries | 2 |
| Hooks | 53 |
| Physics modules | 2 |
| Schemas | 148 |


## 2. Dispatchers (88)

- adaptiveControlDispatcher
- aiReasoningDispatcher
- atcsDispatcher
- authDispatcher
- autoPilotDispatcher
- automationDispatcher
- autonomousDispatcher
- bridgeDispatcher (13 actions)
- businessDispatcher
- cadAutomationDispatcher
- cadDispatcher
- cadDrawingKnowledgeDispatcher
- cadRegressionDispatcher
- calcDispatcher
- camDispatcher
- cncOpsDispatcher
- complianceDispatcher (17 actions)
- contextDispatcher
- cplDispatcher (54 actions)
- dataDispatcher (159 actions)
- devDispatcher (2 actions)
- diagnosisDispatcher
- documentDispatcher
- documentLearningDispatcher
- edmDispatcher
- exportDispatcher
- feasibilityDispatcher
- fiveAxisDispatcher
- fluidThermalDispatcher
- formingCastingDispatcher
- generatorDispatcher
- grindingDispatcher
- gsdDispatcher
- guardDispatcher
- holePatternDispatcher
- hookDispatcher
- inboxDispatcher
- industryDispatcher
- infraDispatcher (25 actions)
- integrationDispatcher
- intelligenceDispatcher
- knowledgeDispatcher
- knowledgeExtDispatcher
- l2EngineDispatcher
- machineLiveDispatcher
- machineSetupDispatcher
- machiningKnowledgeBaseDispatcher
- manusDispatcher
- materialProcessingDispatcher
- mechanicalDesignDispatcher
- memoryDispatcher (9 actions)
- millDispatcher
- mlDispatcher
- monitoringDispatcher
- multiAxisProgramDispatcher
- multiOpDispatcher
- nlHookDispatcher
- omegaDispatcher
- operatingSystemDispatcher
- orchestrationDispatcher
- partsLibraryDispatcher
- pfpDispatcher (6 actions)
- processControlDispatcher
- productDispatcher
- provenPipelineDispatcher
- qualityDispatcher
- ralphDispatcher
- realtimeDispatcher
- resourceExtractionDispatcher
- safetyDispatcher
- schedulingDispatcher
- scientificMathDispatcher
- secondaryOpsDispatcher
- securityDispatcher (10 actions)
- sessionDispatcher
- shopPracticeDispatcher
- skillScriptDispatcher
- spDispatcher
- telemetryDispatcher (7 actions)
- tenantDispatcher (15 actions)
- threadDispatcher (21 actions)
- threadingPipelineDispatcher
- toolpathDispatcher (34 actions)
- turningDispatcher
- turningProgramDispatcher
- validationDispatcher
- vibrationPhysicsDispatcher
- weldingJoiningDispatcher

## 3. Algorithms (0)



## 4. Registries (2)

- AISubsystemRegistry
- CAMSystemRegistry

## 5. Hooks (53)

- AdvancedManufacturingHooks
- AgentHooks
- AutomationHooks
- CADRegressionSafetyHooks
- CadenceDefinitions
- CognitiveHooks
- ControllerHooks
- CrossReferenceHooks
- EnforcementHooks
- ForgeTripleHooks
- GrooveDepthGateHook
- HyperMillDataFreshnessHook
- HyperMillMillTurnHooks
- HyperMillTurningHooks
- KnowledgeHooks
- LatheLoRAHooks
- LatheSafetyHooks
- LatheSpeedFeedGuardHook
- LifecycleHooks
- MachineValidationHooks
- MachiningIntelligenceGuardHook
- ManufacturingHooks
- ObservabilityHooks
- OrchestrationHooks
- PostgenValidatorSkipGuardHook
- RecoveryHooks
- ResourceWatcherHook
- SafetyQualityHooks
- SchemaHooks
- SpecialtyCadences
- SpecialtyManufacturingHooks
- SurfaceIntegrityGateHook
- ThreadClassGateHook
- WEDMCoordinationHooks
- WEDMGnnHooks
- WEDMLearningHooks
- WEDMPerceptionHooks
- WEDMSVIHooks
- WEDMSafetyHooks
- extractionEnforcementHooks
- extractionIngestionHook
- extractionMaintenanceHook
- extractionRoutingHooks
- frontendFeatureAuditHook
- hookBridge
- hookRegistration
- index
- post-roadmap-unit
- postExtractionHook
- pre-roadmap-execute
- qtRegressionGuardHook
- resourceIntegrityHook
- selfAwarenessStartup

## 6. Physics Modules (2)

- constants
- wedm-constants

## 7. Schemas

148 schema files. See src/schemas/ for details.

## 8. Engines (631) — By Category

### Force & Physics (6)
- ClampingForceEngine
- ForceOverlayVisualizationEngine
- MachineForceLimitValidationEngine
- ToolpathForceProfileEngine
- TribalPlaybookEnforcementEngine
- WEDMWireStressAnalysisEngine

### Thermal (4)
- ThermalOverlayEngine
- WEDMThermalFieldEngine
- WEDMThermalReleaseGateEngine
- WEDMWireHeatingEngine

### Tool Life & Wear (2)
- SinkerEDMWearCompensationEngine
- ToolLifeOverlayEngine

### Stability & Chatter (4)
- CADRegenerationTestEngine
- DFMAwareGenerationEngine
- SessionStabilityEngine
- ToleranceAwareGenerationEngine

### Deflection (2)
- DeflectionOverlayEngine
- WEDMWireDeflectionEngine

### Speed & Feed (22)
- AlgorithmOrchestratorEngine
- CADEmbeddingIndexOrchestratorEngine
- CADRegressionTestOrchestratorEngine
- CADTrainingCorpusOrchestratorEngine
- CADTrainingPipelineOrchestratorEngine
- CAMAGIMasterOrchestratorEngine
- CAMPostInvokeOrchestratorEngine
- CAMSpeedFeedBridgeEngine
- CrossSessionOrchestratorEngine
- LatheLoRACadenceOrchestratorEngine
- LatheLoRAEnsembleOrchestratorEngine
- LatheLoRAMasterOrchestratorEngine
- LatheLoRANeuralOrchestratorEngine
- LatheSpeedFeedDeepLearningAdvisorEngine
- LatheSpeedFeedReasoningBridgeEngine
- LatheSpeedFeedShopAwareTuningEngine
- MachiningIntelligenceOrchestratorEngine
- MillMasterOrchestratorFacadeEngine
- MillingAILearningOrchestratorEngine
- OfflineRLOrchestratorEngine
- OrchestratorConfidenceFeedbackEngine
- SmartToolSelectorOrchestratorAdapter

### Surface (212)
- AdaLoRARankAllocatorEngine
- AdaptiveMachiningIntegrationEngine
- AdaptiveParameterSpaceEngine
- AdaptiveSystemIntegrationEngine
- ArchiveCrawlerEngine
- AssetDependencyGraphEngine
- AttractorDetectionEngine
- BladeProfileLibraryEngine
- BlueprintToCADGenerationEngine
- CADAccuracyValidatorEngine
- CADArtifactStorageEngine
- CADAssemblyGraphEngine
- CADCrashRecoveryEngine
- CADDrawingNumberNormalizerEngine
- CADKnowledgeGraphEngine
- CADOperationPlannerEngine
- CADOperationTaxonomyEngine
- CADPluginTamperAuditLogEngine
- CADRegressionReportGeneratorEngine
- CADReplicationDurabilityEngine
- CADSequenceTrainerEngine
- CAMFeatureExtractorEngine
- CAMLoRAAdapterTrainerEngine
- CAMLoRAEngine
- CAMTribalRAGEngine
- CATIAIntegrationTestSuiteEngine
- CATIAMachiningAIOrchestrationEngine
- ChangeImpactRadiusEngine
- ContinualLoRAEngine
- ControlPlanGeneratorEngine
- CoolantStrategyAdapter
- CreoIntegrationTestSuiteEngine
- CrossCustomerPolicyTransferEngine
- DetachedLoRARunnerEngine
- DoRAAdapterEngine
- EDMMultiPassStrategyEngine
- EDMProgramAssemblerEngine
- EngagementOptimizerAdapter
- EntropyTrackerEngine
- EntryExitStrategyAdapter
- FederatedLoRAEngine
- FiveAxisLoRACadenceEngine
- FiveAxisLoRADatasetBuilderEngine
- FormulaIntegrationEngine
- FreeCADCodeGeneratorEngine
- Fusion360CodeGeneratorEngine
- FusionAIOrchestrationEngine
- FusionStrategyKnowledgeEngine
- GrindingLoRACadenceEngine
- GrindingLoRADatasetBuilderEngine
- HolderOperationMatchEngine
- HookCoverageMaximizerEngine
- HybridProgramComposerEngine
- HyperCADSCodeGeneratorEngine
- HyperMillAIOrchestrationEngine
- InferenceLoRAGateEngine
- InterOperationStateEngine
- InventorAutomationBridge
- InventorCADCodeGeneratorEngine
- InventorCAMAIOrchestrationEngine
- InventorCAMCodeGeneratorEngine
- InventorCAMStrategyEngine
- JMDieProgramLearningEngine
- JMDieProgramRAGEngine
- JMDieTrainingCorpusEngine
- LaserLoRACadenceEngine
- LaserLoRADatasetBuilderEngine
- LatheLoRAAdaptiveRefinementEngine
- LatheLoRAAttentionAnalyzerEngine
- LatheLoRABenchmarkSuiteEngine
- LatheLoRACadenceEngine
- LatheLoRAContinualLearningEngine
- LatheLoRACronJobEngine
- LatheLoRADatasetBuilderEngine
- LatheLoRADatasetValidatorEngine
- LatheLoRADeploymentEngine
- LatheLoRADriftDetectorEngine
- LatheLoRAEmbeddingCacheEngine
- LatheLoRAEnsembleCombinerEngine
- LatheLoRAEnsembleVoterEngine
- LatheLoRAExampleGeneratorEngine
- LatheLoRAExperimentTrackerEngine
- LatheLoRAHealthMonitorEngine
- LatheLoRAHyperparameterOptimizerEngine
- LatheLoRAInferenceGatewayEngine
- LatheLoRAKnowledgeCuratorEngine
- LatheLoRAKnowledgeGraphEngine
- LatheLoRAMergeStrategyEngine
- LatheLoRAModelOptimizerEngine
- LatheLoRAModelRegistryEngine
- LatheLoRAModelSelectorEngine
- LatheLoRAMonitoringEngine
- LatheLoRANeuralBridgeEngine
- LatheLoRAOllamaDeployerEngine
- LatheLoRAPhysicsAugmentedInferenceEngine
- LatheLoRAPhysicsEvaluatorEngine
- LatheLoRAPipelineCoordinatorEngine
- LatheLoRAPipelineEngine
- LatheLoRAProgramMinerEngine
- LatheLoRAProgramParserEngine
- LatheLoRAQuantizationOptimizerEngine
- LatheLoRAReasoningChainInferenceEngine
- LatheLoRAReasoningEvaluatorEngine
- LatheLoRAResourceManagerEngine
- LatheLoRARewardShapingEngine
- LatheLoRASafetyEvaluatorEngine
- LatheLoRATrainingMonitorEngine
- LatheLoRATrainingScriptEngine
- LatheLoRATransferStrategyEngine
- LatheLoRATribalAugmentationEngine
- LatheLoRATribalExtractorEngine
- LatheLoRAVerificationEngine
- LathePartoffSafetyRailEngine
- LathePostGeneratorDialectEngine
- LathePostGeneratorSpecIngestEngine
- LathePrintFeatureStrategySelectorEngine
- LathePrintProgramEmitterEngine
- LathePrintProgramSignoffEngine
- LathePrintToProgramDLIntelligenceEngine
- LathePrintToProgramKnowledgeGraphEngine
- LathePrintToProgramReasoningEngine
- LathePrintToleranceStackEngine
- LathePrintToolpathGeneratorEngine
- LatheSwissPostGeneratorEngine
- LoRAAdapterRegistryEngine
- LoRACompositionEngine
- LoRADriftCoordinatorEngine
- LoRAMoEGatingEngine
- MITCourseFullIntegrationEngine
- MachineLoRABaseEngine
- MasterAITrainingLedgerEngine
- MasterCADControlBrainEngine
- MastercamAIOrchestrationEngine
- MastercamCodeGeneratorEngine
- MastercamHeadlessIntegrationTestEngine
- MillAISelfAwarenessIntegrationEngine
- MillTurnLoRACadenceEngine
- MillTurnLoRADatasetBuilderEngine
- MillTurnOrchestrationEngine
- MillingLoRACadenceEngine
- MillingLoRADatasetBuilderEngine
- MultiControllerCalibrationEngine
- NXCAMAIOrchestrationEngine
- NXCodeGeneratorEngine
- NXOpenAssemblyDrawingEngine
- NeuralCADGenerationEngine
- OkumaGosigerTranscriptMinerEngine
- OneClickWEDMGeneratorEngine
- OpenTelemetryTracingEngine
- OperatorApprovalGateEngine
- OperatorPreferencesEngine
- OrthogonalLoRAEngine
- OutcomeTraceEngine
- PPValidatorAGIWiringEngine
- PactContractTestEngine
- PairedPrintProgramBundleEngine
- PerAppInCADInferenceAdapter
- PostCompactRestorationEngine
- PowerMillAIOrchestrationEngine
- PrintToProgramCoverageAnalyzerEngine
- PrintToProgramRegressionHarnessEngine
- PrintToProgramTutorialEngine
- ProbingIntegrationEngine
- RadialEngagementControllerEngine
- RateLimitingEngine
- ReRankerEngine
- RegistryFederationEngine
- RhinoGrasshopperPRISMComponentsEngine
- RoutingSheetGeneratorEngine
- SinkerEDMLoRACadenceEngine
- SinkerEDMLoRADatasetBuilderEngine
- SinkerEDMPrintToProgramEngine
- SolidCAMAIOrchestrationEngine
- SolidWorksCodeGeneratorEngine
- SubprogramExtractionEngine
- SupplyChainIntegrityEngine
- SwissPartTransferSequenceEngine
- TPEHyperparameterSearchEngine
- TextToCADGenerationEngine
- TokenEconomyTrackerEngine
- ToolCallParallelizationEngine
- ToolpathStrategyRouterEngine
- TrainingExampleAssemblerEngine
- TrainingLedgerEngine
- TransferLearningBridgeEngine
- TribalRAGEngine
- TurningStrategyCatalog
- UnifiedCADCodeGeneratorBase
- VariabilitySourceTrackerEngine
- VideoKnowledgeIntegrationEngine
- WEDMAutonomySubstrateGateEngine
- WEDMBenchmarkToleranceEngine
- WEDMGraphAttentionEngine
- WEDMHeadClearanceEngine
- WEDMLatticeGraphEngine
- WEDMLoRAAdapterEngine
- WEDMLoRACadenceEngine
- WEDMLoRADatasetBuilderEngine
- WEDMMLParameterOptimizerEngine
- WEDMOverageApprovalEngine
- WEDMProgramComparisonEngine
- WEDMProgramSafetyGateEngine
- WEDMProgramVerificationEngine
- WEDMProgressTrackerEngine
- WEDMRaPredictorEngine
- WEDMThinWireDerateEngine
- WEDMTransferLearningEngine
- WaterjetLoRACadenceEngine
- WaterjetLoRADatasetBuilderEngine
- WetRunCustomerAcceptanceEngine
- WetRunProgramVersionLockEngine
- WetRunScrapLedgerEngine

### Materials & Registry (8)
- CoatingSelectionAdapter
- FusionMaterialBridgeEngine
- FusionMaterialPhysicsBridge
- MastercamMaterialBridgeEngine
- MastercamMaterialPhysicsBridge
- MaterialDatabaseBridgeEngine
- MaterialHardnessStateClassifierEngine
- WEDMFewShotMaterialEngine

### 5-Axis & Multi-Axis (5)
- FiveAxisAggregatorEngine
- FusionMultiAxisEngine
- MachineKinematicStateEngine
- MastercamMultiAxisEngine
- MultiAxisAggregatorEngine

### Mill-Turn & Lathe (30)
- FusionLathePostDeltaRegistryEngine
- HardTurningCapstoneEngine
- LatheAdaptiveMachiningEngine
- LatheMasterPostAPIEngine
- LatheMasterPostDeepReasoningEngine
- LatheMasterPostEnsembleCrossCheckEngine
- LatheMasterPostRegressionMatrixEngine
- LatheMasterPostRouterEngine
- LatheMasterPostSelfAwarenessEngine
- LatheMasterPostUnifiedOutputEngine
- LathePerformanceSLORegistryEngine
- LathePostProcessorDialectValidatorEngine
- LathePrintIngestPipelineEngine
- LathePrintSequencePlannerEngine
- LathePrintSetupSelectionEngine
- LatheTurningFeatureRecognizerEngine
- MastercamMillTurnBridge
- OkumaB250LatheMasterPostEngine
- SolidCAMMillTurnFunctionIndexEngine
- SolidCAMTurningFunctionIndexEngine
- TurningCpkSurrogateEngine
- TurningEnvelopeDistanceEngine
- TurningRobustOptimizerEngine
- TurningSensitivityAnalysisEngine
- TurningStochasticPlanEngine
- TurningThreadOptimizerEngine
- TurningThreadRobustOptimizerEngine
- TurningThreadSensitivityEngine
- TurningThreadStochasticPlanEngine
- WEDMWireThreadingMinEngine

### EDM & Wire EDM (59)
- AdaptiveFeedModulationEngine
- EDMCostDocumentationEngine
- EDMWireSlugCornerTaperEngine
- MitsubishiMV1200RWireEDMMasterPostEngine
- SinkerEDMElectrodeGeometryEngine
- SinkerEDMFlushingAdvisorEngine
- WEDMAdaptivePassEngine
- WEDMAutonomyAuditEngine
- WEDMControllerDialectVerifierEngine
- WEDMCornerPhysicsEngine
- WEDMCreditCostEngine
- WEDMCurrentDensityGuardEngine
- WEDMDXFClosureValidatorEngine
- WEDMDeviationToTipEngine
- WEDMDielectricCorrectionEngine
- WEDMDielectricFlushAdjustEngine
- WEDMEWCMemoryEngine
- WEDMFeatureImportanceEngine
- WEDMFeedbackIngestionEngine
- WEDMFlushAdequacyGateEngine
- WEDMGapVoltageControlEngine
- WEDMInvoiceLineEngine
- WEDMJobCostEngine
- WEDMJobCreatorEngine
- WEDMJobOutcomeEngine
- WEDMJobPatternLearnerEngine
- WEDMKerfWidthEngine
- WEDMLearningLoopEngine
- WEDMMRRPhysicsEngine
- WEDMMultiProfileBatchEngine
- WEDMNeighborQueryEngine
- WEDMOnlineLearningEngine
- WEDMPostAgieEngine
- WEDMPostDialectRouterEngine
- WEDMPostFanucEngine
- WEDMPostMakinoEngine
- WEDMPostMitsubishiEngine
- WEDMPostSodickEngine
- WEDMPostTypes
- WEDMPowerDensityGuardEngine
- WEDMPulseLimitEngine
- WEDMQuoteBridgeEngine
- WEDMReasoningExplainEngine
- WEDMRecastDepthPredictorEngine
- WEDMSafetyEnvelopeEngine
- WEDMSlugTabRetentionEngine
- WEDMSparkErosionModelEngine
- WEDMStartPointOptimizationEngine
- WEDMTaperErrorBudgetEngine
- WEDMTier6GeomGateEngine
- WEDMTribalTipLearnerEngine
- WEDMUnitTagGateEngine
- WEDMWeibullWireLifeEngine
- WEDMWireBreakPredictorEngine
- WEDMWireBreakRiskCostEngine
- WEDMWirePathCollisionEngine
- WEDMWirePremiumROIEngine
- WEDMWireSpoolConsumptionEngine
- WEDMWireTensionOptimizerEngine

### Grinding (1)
- CADContentAddressableStoreEngine

### CAM & Strategy (42)
- CAMAIActionLinkerEngine
- CAMBaselineRegressorEngine
- CAMCatalogEnrichmentValidator
- CAMCatalogLoaderEngine
- CAMCatalogPhysicsLinkerEngine
- CAMCatalogSplitterEngine
- CAMFunctionRouterEngine
- CAMGeometryExchangeEngine
- CAMInputExhaustionPlannerEngine
- CAMMLDriftMonitorEngine
- CAMMLSplitEngine
- CAMMachiningErrorPredictionEngine
- CAMOptimizationSuggestionEngine
- CAMPhase5Stubs
- CAMPluginCommunicationHubEngine
- CAMPluginRegistryEngine
- CAMPostSelectorUIEngine
- CAMTribalKnowledgeInjectionEngine
- CAMTribalTipLinkerEngine
- CrossCAMComparisonLedgerEngine
- HyperMILLAutomationBridge
- HyperMillACConnectionManager
- HyperMillACScriptExecutor
- HyperMillFunctionIndexEngine
- HyperMillInHostRunnerEngine
- HyperMillPluginAdapterEngine
- InventorCAMFunctionIndexEngine
- InventorCAMToolExportEngine
- Mastercam5AxisEngine
- MastercamAutomationBridge
- MastercamControllerCatalogEngine
- MastercamCycleCatalogEngine
- MastercamDeepLearningEngine
- MastercamFAIBridge
- MastercamFunctionIndexEngine
- MastercamPluginAdapterEngine
- MastercamProbingBridge
- MastercamSPCBridge
- SolidCAM25DFunctionIndexEngine
- SolidCAM3DHSSHSRFunctionIndexEngine
- SolidCAM5AxisFunctionIndexEngine
- SolidCAMIMachiningFunctionIndexEngine

### Post-Processing (4)
- GapEscalationControllerEngine
- MasterPostProcessorUnifiedAGIEngine
- PostProcessorUnificationEngine
- RealTimeAdaptiveControllerEngine

### Safety & Compliance (6)
- NISTAIRMFComplianceEngine
- PIIComplianceEngine
- SafetyExplanationEngine
- SafetyScoreOverlayEngine
- SafetyShieldEngine
- SafetyVetoSimulationGateEngine

### Quality & SPC (5)
- CADFailureTriageEngine
- FailureModeAnticipationEngine
- MultivariateSPCEngine
- SPCFeedbackLoopEngine
- TestQualityAuditEngine

### AI & ML (3)
- ExceptionLearningEngine
- FusionDeepLearningEngine
- LearningCascadeEngine

### Reasoning & AGI (2)
- CADReasoningChainEngine
- MultiAssetReasoningEngine

### Session & Lifecycle (7)
- CADTestCheckpointEngine
- CompactionSurvivalEngine
- ContextCheckpointEngine
- MultiSessionHandoffCoordinatorEngine
- SessionManagementEngine
- SessionReorientationEngine
- WetRunSessionLogEngine

### Memory & Context (5)
- CADFeatureEmbeddingEngine
- ContextCompressionEngine
- ContextualBoundaryEngine
- ModelAwareSelfAwarenessEngine
- PRISMSelfAwarenessEngine

### Orchestration (5)
- AutomaticPipelineComposerEngine
- CADRevisionPromotionWorkflowEngine
- CSSChipLoadInvariantCoordinatorEngine
- SetupSheetPipelineEngine
- TribalEnrichmentCoordinatorEngine

### Inventory & ERP (5)
- DERPlusPlusEngine
- HurcoV11MillMasterPostEngine
- InProcessStockModelEngine
- MasterPostFineTuningEngine
- WetRunSupplierPassThroughEngine

### Self-Awareness (1)
- MachineCapabilityIndexEngine

### Other (191)
- AISystemRouterEngine
- AccessControlListEngine
- ActualVsPredictedCollectorEngine
- AdaptivePhysicsBridgeEngine
- AdaptiveThresholdEngine
- ArcFittingEngine
- AssemblyPlannerEngine
- AtomicStepDecomposerEngine
- AuditLoggingEngine
- AuthorizationEngine
- AutoCADAddinPluginEngine
- AutoCADDotNetBridgeEngine
- BackupRestoreDrillEngine
- BaseEngine
- BlamelessPostMortemEngine
- BliskCADEngine
- BuildAdvisorEngine
- BuildDebriefEngine
- BuildPlannerEngine
- CADAIStateMachineEngine
- CADAccessControlRBACABACEngine
- CADAdapterRegistry
- CADAutomationMockLayer
- CADAutomationRouter
- CADBundleReplayCompareEngine
- CADBundleSigningVersioningEngine
- CADCorpusIngesterEngine
- CADFileClassifierEngine
- CADFileIndexerEngine
- CADFilesystemReconciliationEngine
- CADFormatConversionMatrixEngine
- CADGeometricAugmentationEngine
- CADGeometryComparisonEngine
- CADInstallationProbeEngine
- CADIntentDecomposerEngine
- CADLicenseHealthEngine
- CADPhysicsConsistencyGateEngine
- CADPluginMTLSSecurityEngine
- CADPreviewThumbnailCacheEngine
- CADRegressionDashboardEngine
- CADRegressionResultsAnalyzerEngine
- CADRetrievalAugmentationEngine
- CADRevisionDetectorEngine
- CADSearchUniversalEngine
- CADTenantNamespaceEngine
- CADTokenRepresentationEngine
- CADVisualDiffEngine
- CATIAAddinPluginEngine
- CATIACAAV5BridgeEngine
- CSRFProtectionEngine
- CatalogRegistryBridgeEngine
- ChaosDrillSchedulerEngine
- ChipThinningCompensationEngine
- CircularDependencyEngine
- CommonlyMissedPatternsRegistry
- ComplexPartPlannerEngine
- ConfidenceCommitEventBusEngine
- ConversationStaleDetectorEngine
- CreoAddinRibbonEngine
- CreoToolkitBridgeEngine
- CrossRegistryJoinEngine
- CrossTerminalCoordinationEngine
- DarkContentClassifierEngine
- DisasterRecoveryEngine
- DxfWriterEngine
- EdgeCaseCaptureEngine
- EditImpactPredictorEngine
- EncryptionAtRestEngine
- EngagementDynamicsEngine
- EngineUtilizationAuditorEngine
- F3DSQLiteParserEngine
- FCStdNativeParserEngine
- FeatureStoreEngine
- FileReadDeduplicationEngine
- FreeCADAutomationBridge
- Fusion360AutomationBridge
- Fusion360FunctionIndexEngine
- Fusion360InHostRunnerEngine
- Fusion360PluginAdapterEngine
- Fusion5AxisEngine
- GapPredictorEngine
- GeometryHashGroupingEngine
- GrooveClassificationEngine
- HolisticMachiningIntelligenceEngine
- HookBanditEngine
- HookExecutor
- HookTelemetryEngine
- IEngine
- IQLEngine
- IdentityModelEngine
- ImpellerCADEngine
- IncidentResponseEngine
- InfiniteConditionCombinatorEngine
- InputSanitizationEngine
- IntelligenceAmplificationEngine
- IntelligentSequencingAdapter
- InventorHSMFunctionIndexEngine
- InventorHSMPluginAdapterEngine
- JMDieRecipeRetrieverEngine
- LSHDedupEngine
- LatencyBudgetDecompositionEngine
- LegalGateEngine
- LiveToolingSyntaxEngine
- LiveTurretCAxisEngine
- LokiLogSinkEngine
- MINFileParserEngine
- MITCourseExpansionEngine
- MLLineageEngine
- MOUStallGateEngine
- MTConnectRoundTripLatencyBenchEngine
- MachineConfidenceCalculatorEngine
- MachineLayerMerger
- MachineOptionMatrixEngine
- MachinePackageSelectionEngine
- MachineTypeClassifierEngine
- MaxEntIRLEngine
- MeasurementSystemAnalysisEngine
- MillingAGIMasterEngine
- ModelConfidentialityEngine
- MultiSignalAutoRollbackEngine
- NCFileParserEngine
- NXOpenSketchEntityEngine
- NewCoderModeEngine
- OkumaRunLogParserEngine
- OllamaTaskOffloaderEngine
- OnshapeAPIBridgeEngine
- OnshapeLiveCollabAdapter
- OntologyGrowthRegistryEngine
- OutcomeCaptureBusEngine
- OutputCacheEngine
- PRISMVerificationPluginEngine
- PagerDutyAlertsEngine
- PalletPoolOptimizerEngine
- ParserFuzzHarnessEngine
- ParserGoldenHarnessEngine
- PhysicsAwareDataAugmentationEngine
- PilotPhaseExitGateEngine
- PolicyExperienceLedgerEngine
- PreMOUKickoffChecklistEngine
- PreWetRunChaosGateEngine
- PrintMatchStallDetectorEngine
- PrintToAIBridgeEngine
- PrioritizedReplayBufferEngine
- ProcessEnvironmentSensitivityEngine
- PrometheusMetricsEngine
- PromotionGateEngine
- ProtoMAMLFewShotEngine
- PrototypicalNetworkEngine
- ProvenanceEngine
- RegressionBaselineEngine
- RhinoCommonBridgeEngine
- RunbookEngine
- SBOMReviewEngine
- SLDOverlayEngine
- SLOEngine
- SamplingPlanEngine
- SecretManagementEngine
- SecurityHeadersEngine
- SimulationStallDetectorEngine
- SkillGapAnalyzerEngine
- SkillInliningOptimizerEngine
- SolidWorksAutomationBridge
- SwissChannelFileEmitterEngine
- SwissGuideBushingPhysicsEngine
- SwissTypeDecisionEngine
- SynapticIntelligenceEngine
- SystemUtilizationAuditEngine
- TenantIsolationEngine
- TenantOnboardingRunbookEngine
- TestASTAnalyzerEngine
- TestRegistryAdapterEngine
- TestResourceRegistryEngine
- TestTimeAdaptationEngine
- ToolCatalogAdaptiveEngine
- ToolDatabaseBridgeEngine
- TriLevelKillSwitchEngine
- TribalKnowledgeMaximizerEngine
- UniversalCADIndexEngine
- UserModelEngine
- VariabilityEnvelopeEngine
- WetRunAuthorizationEngine
- WetRunChangeFreezeEngine
- WetRunCustomerCommunicationLogEngine
- WetRunDeviationRegistryEngine
- WetRunNonConformanceEngine
- WetRunOnCallRotationEngine
- WetRunRetentionPolicyEngine
- WetRunSampleInspectionPlanEngine
- WetRunStateMachineEngine
- WorkholdingSelectionEngine
- ZeroTrustTelemetryEngine


---

_Regenerate: `node mcp-server/scripts/generate-master-index-compact.mjs`_