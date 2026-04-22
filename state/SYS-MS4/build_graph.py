import json, re, os

# All 186 modules from index.ts
ALL_MODULES = [
    "AIMLEngine","AdaptiveControlEngine","AdvancedCalculations","AgentExecutor",
    "AlgorithmEngine","AlgorithmGatewayEngine","AnodizeAllowanceEngine","ApprenticeEngine",
    "AuditEngine","AuthEngine","BarPullerTimingEngine","BatchOptimizationEngine",
    "BatchProcessor","BendAllowanceEngine","BottleneckIdentificationEngine",
    "CADKernelEngine","CAMIntegrationEngine","CAMKernelEngine","CacheEngine","CadBridge",
    "CampaignEngine","CertificateEngine","ChuckJawForceEngine","ClampingSimEngine",
    "CollisionDetectionEngine","CollisionEngine","ComplianceEngine","ComputationCache",
    "ConfigEngine","ConversationalMemoryEngine","CoolantValidationEngine",
    "CostEstimationEngine","CryogenicTreatmentEngine","DNCTransferEngine",
    "DampingOptimizationEngine","DecisionTreeEngine","DiffEngine","DigitalThreadEngine",
    "DigitalTwinEngine","DigitalWorkInstructionEngine","DimensionalAnalysisEngine",
    "EDMSurfaceIntegrityEngine","ERPIntegrationEngine","ElectrodeDesignEngine",
    "EnergyOptimizationEngine","EventBus","EventEngine","ExportEngine",
    "FailureForensicsEngine","FeatureRecognitionEngine","FederatedLearningEngine",
    "FileIOEngine","FixtureDesignEngine","GCodeOptimizationEngine","GCodeTemplateEngine",
    "GearHobbingEngine","GenerativeProcessEngine","GeometryEngine",
    "HardnessConversionEngine","HarmonicAnalysisEngine","HealthEngine",
    "HeatTreatmentResponseEngine","HookEngine","HookExecutor","HybridLaserMachineEngine",
    "InferenceChainEngine","IntelligenceEngine","IntentDecompositionEngine",
    "InverseKinematicsSolverEngine","InverseSolverEngine","JobLearningEngine",
    "KnowledgeGraphEngine","KnowledgeQueryEngine","LaserCutInterfaceEngine",
    "LaserMarkingEngine","LearningPathEngine","LiveToolingEngine","LoggingEngine",
    "MachinabilityRatingEngine","MachineConnectivityEngine","MachineSelectionEngine",
    "MagneticChuckEngine","ManufacturingCalculations","ManufacturingGenomeEngine",
    "ManusATCSBridge","MaskingCalculatorEngine","MaterialEquivalenceEngine",
    "MaterialSelectionEngine","MeasurementIntegrationEngine","MemoryGraphEngine",
    "MeshEngine","MetricsEngine","MicroEDMEngine","MicrostructureEffectEngine",
    "MigrationEngine","MobileInterfaceEngine","ModularFixtureLayoutEngine",
    "MultiTenantEngine","NLHookEngine","NestingEngine","NotificationEngine",
    "OEECalculatorEngine","OnboardingEngine","OptimizationEngine","PFPEngine",
    "PassivationEngine","PhysicsPredictionEngine","PlatingAllowanceEngine",
    "PluginEngine","PostProcessorEngine","PredictiveFailureEngine",
    "PredictiveMaintenanceEngine","ProbeRoutineEngine","ProcessPlanEngine",
    "ProductEngine","ProtocolBridgeEngine","QualityPredictionEngine","QueueEngine",
    "QuoteEngine","RTCP_CompensationEngine","RateLimitEngine","RecastLayerEngine",
    "RegenerativeChatterPredictor","ReportEngine","ReportRenderer",
    "ResponseFormatterEngine","ResponseTemplateEngine","RoadmapExecutor",
    "SchedulingEngine","ScriptExecutor","SessionLifecycleEngine","SettingsEngine",
    "SetupSheetEngine","ShiftHandoffEngine","ShopSchedulerEngine","ShotPeeningEngine",
    "SimulationEngine","SinglePointThreadEngine","SingularityAvoidanceEngine",
    "SkillAutoLoader","SkillBundleEngine","SkillExecutor","SoftJawProfileEngine",
    "SpindleProtectionEngine","SplineMillingEngine","SteadyRestPlacementEngine",
    "StockModelEngine","SurfaceFinishEngine","SustainabilityEngine","SwarmExecutor",
    "TailstockForceEngine","TaskAgentClassifier","TelemetryEngine","TenantEngine",
    "TensileToMachinabilityEngine","ThermalSimEngine","ThinFloorVibrationEngine",
    "ThreadCalculationEngine","ThreadMillingEngine","ThreeDPrintedFixtureEngine",
    "TiltAngleOptimizationEngine","ToleranceEngine","ToleranceStackEngine",
    "TombstoneLayoutEngine","ToolAssemblyEngine","ToolBreakageEngine","ToolCribEngine",
    "ToolSelectionEngine","ToolholderDynamicsEngine","ToolpathCalculations",
    "ToolpathGenerationEngine","TribalKnowledgeEngine","TroubleshootingEngine",
    "UserAssistanceSkillsEngine","UserWorkflowSkillsEngine","VisualizationEngine",
    "WaterjetTaperEngine","WebhookEngine","WeldPrepEngine","WhiteLayerDetectionEngine",
    "WireEDMSettingsEngine","WorkCoordinateEngine","WorkEnvelopeValidatorEngine",
    "WorkflowChainsEngine","WorkholdingEngine","WorkholdingIntelligenceEngine"
]

# Dispatcher imports (from Agent 1 results)
DISPATCHER_IMPORTS = {
    "complianceDispatcher": ["ComplianceEngine"],
    "bridgeDispatcher": ["ProtocolBridgeEngine"],
    "atcsDispatcher": ["ManusATCSBridge"],
    "calcDispatcher": ["HookExecutor","ComputationCache","EventBus","ManufacturingCalculations","AdvancedCalculations","ToleranceEngine","GCodeTemplateEngine","DecisionTreeEngine","ReportRenderer","CampaignEngine","InferenceChainEngine","ToolpathCalculations","PhysicsPredictionEngine","OptimizationEngine","WorkholdingIntelligenceEngine","AlgorithmEngine"],
    "documentDispatcher": ["HookExecutor"],
    "dataDispatcher": ["HookExecutor"],
    "guardDispatcher": ["HookExecutor"],
    "contextDispatcher": ["ContextBudgetEngine","SourceCatalogAggregator"],
    "hookDispatcher": ["EventBus"],
    "intelligenceDispatcher": ["HookExecutor","IntelligenceEngine","JobLearningEngine","AlgorithmGatewayEngine","ShopSchedulerEngine","IntentDecompositionEngine","ResponseFormatterEngine","WorkflowChainsEngine","OnboardingEngine","SetupSheetEngine","ConversationalMemoryEngine","UserWorkflowSkillsEngine","UserAssistanceSkillsEngine","MachineConnectivityEngine","CAMIntegrationEngine","DNCTransferEngine","MobileInterfaceEngine","ERPIntegrationEngine","MeasurementIntegrationEngine","InverseSolverEngine","FailureForensicsEngine","ApprenticeEngine","ManufacturingGenomeEngine","PredictiveMaintenanceEngine","SustainabilityEngine","GenerativeProcessEngine","KnowledgeGraphEngine","FederatedLearningEngine","AdaptiveControlEngine","ProductEngine"],
    "memoryDispatcher": ["MemoryGraphEngine"],
    "nlHookDispatcher": ["NLHookEngine"],
    "omegaDispatcher": ["EventBus"],
    "orchestrationDispatcher": ["AgentExecutor","SwarmExecutor","RoadmapExecutor","HookExecutor","TaskAgentClassifier"],
    "pfpDispatcher": ["PFPEngine"],
    "sessionDispatcher": ["HookExecutor"],
    "telemetryDispatcher": ["TelemetryEngine"],
    "spDispatcher": ["KnowledgeQueryEngine"],
    "tenantDispatcher": ["MultiTenantEngine"],
    "toolpathDispatcher": ["HookExecutor","ToolpathGenerationEngine"],
    "threadDispatcher": ["HookExecutor"],
    "validationDispatcher": ["EventBus"],
    "skillScriptDispatcher": ["SkillExecutor","ScriptExecutor","SkillBundleEngine"],
    "authDispatcher": ["AuthEngine","TenantEngine"],
    "cadDispatcher": ["CADKernelEngine","GeometryEngine","MeshEngine","FeatureRecognitionEngine","StockModelEngine","WorkCoordinateEngine"],
    "camDispatcher": ["CAMKernelEngine","ToolpathGenerationEngine","PostProcessorEngine","CollisionDetectionEngine","StockModelEngine","ToolAssemblyEngine","ModularFixtureLayoutEngine"],
    "automationDispatcher": ["OEECalculatorEngine","BottleneckIdentificationEngine","DigitalThreadEngine","DigitalWorkInstructionEngine","ShiftHandoffEngine"],
    "edmDispatcher": ["ElectrodeDesignEngine","WireEDMSettingsEngine","EDMSurfaceIntegrityEngine","MicroEDMEngine"],
    "fiveAxisDispatcher": ["RTCP_CompensationEngine","SingularityAvoidanceEngine","TiltAngleOptimizationEngine","WorkEnvelopeValidatorEngine","InverseKinematicsSolverEngine"],
    "exportDispatcher": ["ExportEngine","ReportEngine"],
    "l2EngineDispatcher": ["AIMLEngine","CADKernelEngine","CAMKernelEngine","FileIOEngine","SimulationEngine","VisualizationEngine","ReportEngine","SettingsEngine"],
    "knowledgeDispatcher": ["KnowledgeQueryEngine","KnowledgeGraphEngine"],
    "qualityDispatcher": ["QualityPredictionEngine","ToleranceStackEngine","DimensionalAnalysisEngine"],
    "schedulingDispatcher": ["SchedulingEngine","BottleneckIdentificationEngine","OEECalculatorEngine"],
    "turningDispatcher": ["ChuckJawForceEngine","TailstockForceEngine","SteadyRestPlacementEngine","LiveToolingEngine","BarPullerTimingEngine","SinglePointThreadEngine"],
}

# Engine-to-engine imports (from Agent 2 results)
ENGINE_IMPORTS = {
    "AgentExecutor": ["HookEngine"],
    "ComplianceEngine": ["NLHookEngine","CertificateEngine"],
    "ComputationCache": ["TelemetryEngine"],
    "DiffEngine": ["TelemetryEngine"],
    "GeometryEngine": ["CADKernelEngine"],
    "IntelligenceEngine": ["ToleranceEngine","AlgorithmEngine"],
    "MemoryGraphEngine": ["TelemetryEngine"],
    "NLHookEngine": ["HookExecutor"],
    "PFPEngine": ["TelemetryEngine"],
    "PredictiveFailureEngine": ["TelemetryEngine"],
    "ProductEngine": ["ManufacturingCalculations","AdvancedCalculations","ToolpathCalculations","GCodeTemplateEngine","DNCTransferEngine","DecisionTreeEngine","CollisionEngine","AlgorithmEngine"],
    "ReportRenderer": ["ToleranceEngine"],
    "SkillExecutor": ["HookEngine"],
    "SwarmExecutor": ["AgentExecutor"],
}

# Dynamic references from cadenceExecutor (Agent 3)
CADENCE_DYNAMIC = ["ComplianceEngine","MultiTenantEngine","ProtocolBridgeEngine","NLHookEngine","ConversationalMemoryEngine","ScriptExecutor","KnowledgeQueryEngine","JobLearningEngine"]

# SourceCatalogAggregator dynamic imports (Agent 3)
SOURCE_CATALOG = ["AlgorithmGatewayEngine","ApprenticeEngine","CAMIntegrationEngine","CampaignEngine","CollisionEngine","ComplianceEngine","DNCTransferEngine","ERPIntegrationEngine","EventBus","FederatedLearningEngine","GCodeTemplateEngine","IntelligenceEngine","JobLearningEngine","KnowledgeGraphEngine","KnowledgeQueryEngine","MachineConnectivityEngine","ManufacturingCalculations","MeasurementIntegrationEngine","OptimizationEngine","PhysicsPredictionEngine","ProductEngine","ProtocolBridgeEngine","ScriptExecutor","ShopSchedulerEngine","SpindleProtectionEngine","ToolpathCalculations","WorkholdingEngine","WorkholdingIntelligenceEngine"]

# index.ts dynamic imports
INDEX_DYNAMIC = ["EventBus","MemoryGraphEngine","TelemetryEngine","KnowledgeQueryEngine"]

# Not in index.ts but on disk
NOT_INDEXED = ["ContextBudgetEngine","MasterIndexGenerator","SourceCatalogAggregator","SwarmGroupExecutor","reactiveChainBootstrap"]

# Build the graph
graph = []

for engine in ALL_MODULES:
    entry = {
        "engine": engine,
        "importedBy": [],
        "importedByType": [],
        "classification": "ORPHANED"
    }

    # Check dispatcher imports
    for disp, engines in DISPATCHER_IMPORTS.items():
        if engine in engines:
            entry["importedBy"].append(disp)
            entry["importedByType"].append("dispatcher")

    # Check engine-to-engine imports
    for eng, imports in ENGINE_IMPORTS.items():
        if engine in imports:
            entry["importedBy"].append(eng)
            entry["importedByType"].append("engine")

    # Check cadence dynamic refs
    if engine in CADENCE_DYNAMIC:
        entry["importedBy"].append("cadenceExecutor")
        entry["importedByType"].append("dynamic")

    # Check source catalog refs
    if engine in SOURCE_CATALOG:
        entry["importedBy"].append("SourceCatalogAggregator")
        entry["importedByType"].append("dynamic")

    # Check index.ts dynamic
    if engine in INDEX_DYNAMIC:
        entry["importedBy"].append("index.ts")
        entry["importedByType"].append("dynamic")

    # Classify
    types = set(entry["importedByType"])
    if "dispatcher" in types:
        entry["classification"] = "WIRED"
    elif "engine" in types and "dynamic" in types:
        entry["classification"] = "INTERNAL+DYNAMIC"
    elif "engine" in types:
        entry["classification"] = "INTERNAL"
    elif "dynamic" in types:
        entry["classification"] = "DYNAMIC"
    else:
        entry["classification"] = "ORPHANED"

    graph.append(entry)

# Add non-indexed engines
for engine in NOT_INDEXED:
    entry = {
        "engine": engine,
        "importedBy": [],
        "importedByType": [],
        "classification": "NOT_INDEXED",
        "note": "File exists on disk but not in index.ts barrel"
    }
    for disp, engines in DISPATCHER_IMPORTS.items():
        if engine in engines:
            entry["importedBy"].append(disp)
            entry["importedByType"].append("dispatcher")
    for eng, imports in ENGINE_IMPORTS.items():
        if engine in imports:
            entry["importedBy"].append(eng)
            entry["importedByType"].append("engine")
    if engine in CADENCE_DYNAMIC:
        entry["importedBy"].append("cadenceExecutor")
        entry["importedByType"].append("dynamic")

    if entry["importedBy"]:
        entry["classification"] = "NOT_INDEXED_BUT_USED"
    graph.append(entry)

# Stats
wired = [e for e in graph if e["classification"] == "WIRED"]
internal = [e for e in graph if e["classification"] == "INTERNAL"]
internal_dyn = [e for e in graph if e["classification"] == "INTERNAL+DYNAMIC"]
dynamic_only = [e for e in graph if e["classification"] == "DYNAMIC"]
orphaned = [e for e in graph if e["classification"] == "ORPHANED"]
not_idx = [e for e in graph if "NOT_INDEXED" in e["classification"]]

result = {
    "generated": "2026-02-28",
    "source": "SYS-MS4-U00",
    "indexCount": len(ALL_MODULES),
    "diskCount": 191,
    "notIndexedCount": len(NOT_INDEXED),
    "stats": {
        "WIRED": len(wired),
        "INTERNAL": len(internal),
        "INTERNAL+DYNAMIC": len(internal_dyn),
        "DYNAMIC": len(dynamic_only),
        "ORPHANED": len(orphaned),
        "NOT_INDEXED": len(not_idx)
    },
    "orphanedEngines": [e["engine"] for e in orphaned],
    "graph": graph
}

with open("C:/PRISM/state/SYS-MS4/engine-dependency-graph.json", "w") as f:
    json.dump(result, f, indent=2)

print(f"Graph saved. {len(graph)} entries.")
print(f"\nClassification Summary:")
print(f"  WIRED (dispatcher):     {len(wired)}")
print(f"  INTERNAL (engine-only): {len(internal)}")
print(f"  INTERNAL+DYNAMIC:       {len(internal_dyn)}")
print(f"  DYNAMIC (string ref):   {len(dynamic_only)}")
print(f"  ORPHANED (no refs):     {len(orphaned)}")
print(f"  NOT_INDEXED:            {len(not_idx)}")
print(f"\nORPHANED engines ({len(orphaned)}):")
for e in orphaned:
    print(f"  - {e['engine']}")
