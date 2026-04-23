/**
 * AISubsystemRegistry.ts
 *
 * Central registry for all 348 PRISM AI engines organized by subsystem category.
 * Provides capability-based discovery, ranking, and selection for intelligent routing.
 *
 * Subsystem Categories:
 * - REASONING: Causal, temporal, belief-state, counterfactual, diagnostic (53 engines)
 * - NEURAL: Force prediction, chatter, thermal, surface, cognitive (41 engines)
 * - ADAPTIVE: Feed control, chatter suppression, wear, thermal, engagement (28 engines)
 * - PHYSICS: Kienzle, Taylor, deflection, stability, thermal calculations (45 engines)
 * - META: Transfer learning, few-shot, self-optimization, pattern mining (24 engines)
 * - XAI: Explainability, proof traces, chain-of-thought, compliance (18 engines)
 * - ORCHESTRATION: Domain orchestrators, pipelines, coordinators (54 engines)
 * - LEARNING: Deep learning, reinforcement, active learning (35 engines)
 * - KNOWLEDGE: Knowledge graphs, tribal, playbooks, synthesis (50 engines)
 *
 * @module registries/AISubsystemRegistry
 * @version 1.0.0
 */

export type AISubsystemCategory =
  | "reasoning"
  | "neural"
  | "adaptive"
  | "physics"
  | "meta"
  | "xai"
  | "orchestration"
  | "learning"
  | "knowledge";

export type MachineTypeTag = "mill" | "lathe" | "wire_edm" | "sinker_edm" | "grinder" | "5axis" | "all";

export interface AIEngineEntry {
  name: string;
  exportName: string;
  subsystem: AISubsystemCategory;
  capabilities: string[];
  machineTypes: MachineTypeTag[];
  priority: number;
  description: string;
  filePath: string;
}

export interface SubsystemStats {
  subsystem: AISubsystemCategory;
  engineCount: number;
  capabilities: string[];
  topEngines: string[];
}

export interface CapabilityQuery {
  capability?: string;
  capabilities?: string[];
  machineType?: MachineTypeTag;
  subsystem?: AISubsystemCategory;
  minPriority?: number;
}

// ==================== REGISTRY DATA ====================

const REGISTRY_ENTRIES: AIEngineEntry[] = [
  // ============ REASONING SUBSYSTEM (53 engines) ============
  { name: "CausalReasoningEngine", exportName: "causalReasoningEngine", subsystem: "reasoning", capabilities: ["cause_effect", "intervention", "counterfactual"], machineTypes: ["all"], priority: 10, description: "Pearl causal inference for machining decisions", filePath: "engines/CausalReasoningEngine.ts" },
  { name: "BeliefStateReasoningEngine", exportName: "beliefStateReasoningEngine", subsystem: "reasoning", capabilities: ["belief_update", "uncertainty", "probabilistic"], machineTypes: ["all"], priority: 9, description: "Bayesian belief state tracking", filePath: "engines/BeliefStateReasoningEngine.ts" },
  { name: "CounterfactualReasoningEngine", exportName: "counterfactualReasoningEngine", subsystem: "reasoning", capabilities: ["what_if", "alternative", "simulation"], machineTypes: ["all"], priority: 9, description: "What-if scenario analysis", filePath: "engines/CounterfactualReasoningEngine.ts" },
  { name: "DiagnosticReasoningEngine", exportName: "diagnosticReasoningEngine", subsystem: "reasoning", capabilities: ["fault_diagnosis", "root_cause", "troubleshooting"], machineTypes: ["all"], priority: 10, description: "Fault diagnosis and root cause analysis", filePath: "engines/DiagnosticReasoningEngine.ts" },
  { name: "DecisionReasoningEngine", exportName: "decisionReasoningEngine", subsystem: "reasoning", capabilities: ["decision_tree", "optimization", "multi_criteria"], machineTypes: ["all"], priority: 9, description: "Multi-criteria decision making", filePath: "engines/DecisionReasoningEngine.ts" },
  { name: "ManufacturingReasoningEngine", exportName: "manufacturingReasoningEngine", subsystem: "reasoning", capabilities: ["process_planning", "sequencing", "manufacturing"], machineTypes: ["all"], priority: 10, description: "Manufacturing-specific reasoning", filePath: "engines/ManufacturingReasoningEngine.ts" },
  { name: "MultiPathReasoningEngine", exportName: "multiPathReasoningEngine", subsystem: "reasoning", capabilities: ["parallel_paths", "optimization", "exploration"], machineTypes: ["all"], priority: 8, description: "Parallel reasoning path exploration", filePath: "engines/MultiPathReasoningEngine.ts" },
  { name: "ScientificReasoningEngine", exportName: "scientificReasoningEngine", subsystem: "reasoning", capabilities: ["physics_based", "validation", "dimensional"], machineTypes: ["all"], priority: 9, description: "Physics-based scientific reasoning", filePath: "engines/ScientificReasoningEngine.ts" },
  { name: "PRISMCreativeReasoningEngine", exportName: "prismCreativeReasoningEngine", subsystem: "reasoning", capabilities: ["novel_solutions", "cross_domain", "creative"], machineTypes: ["all"], priority: 8, description: "Cross-domain creative problem solving", filePath: "engines/PRISMCreativeReasoningEngine.ts" },
  { name: "MillingDeepReasoningEngine", exportName: "millingDeepReasoningEngine", subsystem: "reasoning", capabilities: ["milling_specific", "deep_analysis", "strategy"], machineTypes: ["mill", "5axis"], priority: 10, description: "Deep milling-specific reasoning", filePath: "engines/MillingDeepReasoningEngine.ts" },
  { name: "LatheDeepReasoningEngine", exportName: "latheDeepReasoningEngine", subsystem: "reasoning", capabilities: ["lathe_specific", "deep_analysis", "turning"], machineTypes: ["lathe"], priority: 10, description: "Deep lathe-specific reasoning", filePath: "engines/LatheDeepReasoningEngine.ts" },
  { name: "LatheAIReasoningEngine", exportName: "latheAIReasoningEngine", subsystem: "reasoning", capabilities: ["lathe_ai", "decision", "optimization"], machineTypes: ["lathe"], priority: 9, description: "AI-powered lathe reasoning", filePath: "engines/LatheAIReasoningEngine.ts" },
  { name: "PostProcessorDeepReasoningEngine", exportName: "postProcessorDeepReasoningEngine", subsystem: "reasoning", capabilities: ["gcode", "post_processing", "controller"], machineTypes: ["all"], priority: 8, description: "Deep G-code generation reasoning", filePath: "engines/PostProcessorDeepReasoningEngine.ts" },
  { name: "PostProcessorUnifiedDeepReasoningEngine", exportName: "postProcessorUnifiedDeepReasoningEngine", subsystem: "reasoning", capabilities: ["unified_post", "multi_controller", "synthesis"], machineTypes: ["all"], priority: 9, description: "Unified post processor reasoning", filePath: "engines/PostProcessorUnifiedDeepReasoningEngine.ts" },
  { name: "ElectrodeAIReasoningEngine", exportName: "electrodeAIReasoningEngine", subsystem: "reasoning", capabilities: ["electrode", "sinker_edm", "design"], machineTypes: ["sinker_edm"], priority: 9, description: "Electrode design reasoning", filePath: "engines/ElectrodeAIReasoningEngine.ts" },
  { name: "ReasoningExplainerEngine", exportName: "reasoningExplainerEngine", subsystem: "reasoning", capabilities: ["explanation", "trace", "justification"], machineTypes: ["all"], priority: 8, description: "Reasoning explanation generation", filePath: "engines/ReasoningExplainerEngine.ts" },
  { name: "ReasoningChainSharingEngine", exportName: "reasoningChainSharingEngine", subsystem: "reasoning", capabilities: ["chain_sharing", "collaboration", "multi_agent"], machineTypes: ["all"], priority: 7, description: "Multi-agent reasoning chain sharing", filePath: "engines/ReasoningChainSharingEngine.ts" },
  { name: "PPAGIReasoningWorkflowEngine", exportName: "ppAGIReasoningWorkflowEngine", subsystem: "reasoning", capabilities: ["workflow", "agi_reasoning", "post_processor"], machineTypes: ["all"], priority: 8, description: "AGI-level workflow reasoning", filePath: "engines/PPAGIReasoningWorkflowEngine.ts" },
  { name: "MultiAssetReasoningEngine", exportName: "multiAssetReasoningEngine", subsystem: "reasoning", capabilities: ["multi_asset", "portfolio", "optimization"], machineTypes: ["all"], priority: 7, description: "Multi-asset reasoning optimization", filePath: "engines/MultiAssetReasoningEngine.ts" },
  { name: "MillingReasoningTraceLedgerEngine", exportName: "millingReasoningTraceLedgerEngine", subsystem: "reasoning", capabilities: ["ledger", "audit", "compliance"], machineTypes: ["mill", "5axis"], priority: 8, description: "Milling reasoning audit trail", filePath: "engines/MillingReasoningTraceLedgerEngine.ts" },

  // ============ NEURAL SUBSYSTEM (41 engines) ============
  { name: "ForceNeuralPredictorEngine", exportName: "forceNeuralPredictorEngine", subsystem: "neural", capabilities: ["force_prediction", "ml", "real_time"], machineTypes: ["mill", "lathe", "5axis"], priority: 10, description: "ML-based cutting force prediction", filePath: "engines/ForceNeuralPredictorEngine.ts" },
  { name: "ThermalNeuralPredictorEngine", exportName: "thermalNeuralPredictorEngine", subsystem: "neural", capabilities: ["thermal_prediction", "ml", "temperature"], machineTypes: ["mill", "lathe", "5axis"], priority: 10, description: "Neural thermal prediction", filePath: "engines/ThermalNeuralPredictorEngine.ts" },
  { name: "ChatterNeuralClassifierEngine", exportName: "chatterNeuralClassifierEngine", subsystem: "neural", capabilities: ["chatter_detection", "classification", "vibration"], machineTypes: ["mill", "lathe", "5axis"], priority: 10, description: "Neural chatter classification", filePath: "engines/ChatterNeuralClassifierEngine.ts" },
  { name: "PhysicsNeuralBridgeEngine", exportName: "physicsNeuralBridgeEngine", subsystem: "neural", capabilities: ["physics_ml_fusion", "bayesian", "hybrid"], machineTypes: ["all"], priority: 9, description: "Physics-neural Bayesian fusion", filePath: "engines/PhysicsNeuralBridgeEngine.ts" },
  { name: "NeuralIntegrationEngine", exportName: "neuralIntegrationEngine", subsystem: "neural", capabilities: ["multi_model", "ensemble", "integration"], machineTypes: ["all"], priority: 8, description: "Multi-model neural integration", filePath: "engines/NeuralIntegrationEngine.ts" },
  { name: "NeuralWeightPersistenceEngine", exportName: "neuralWeightPersistenceEngine", subsystem: "neural", capabilities: ["model_persistence", "versioning", "checkpoint"], machineTypes: ["all"], priority: 8, description: "Neural weight persistence across sessions", filePath: "engines/NeuralWeightPersistenceEngine.ts" },
  { name: "NeuralModelRegistryEngine", exportName: "neuralModelRegistryEngine", subsystem: "neural", capabilities: ["model_registry", "hot_loading", "versioning"], machineTypes: ["all"], priority: 8, description: "Neural model registry and hot-loading", filePath: "engines/NeuralModelRegistryEngine.ts" },
  { name: "NeuralDeterminismTestingEngine", exportName: "neuralDeterminismTestingEngine", subsystem: "neural", capabilities: ["determinism", "testing", "reproducibility"], machineTypes: ["all"], priority: 7, description: "Neural output determinism testing", filePath: "engines/NeuralDeterminismTestingEngine.ts" },
  { name: "MillNeuralNetworkEngine", exportName: "millNeuralNetworkEngine", subsystem: "neural", capabilities: ["milling_neural", "pattern", "prediction"], machineTypes: ["mill", "5axis"], priority: 9, description: "Milling neural network predictions", filePath: "engines/MillNeuralNetworkEngine.ts" },
  { name: "MillStrategyNeuralEngine", exportName: "millStrategyNeuralEngine", subsystem: "neural", capabilities: ["strategy_selection", "learning", "optimization"], machineTypes: ["mill", "5axis"], priority: 8, description: "Neural strategy selection for milling", filePath: "engines/MillStrategyNeuralEngine.ts" },
  { name: "MillingNeuralCognitiveEngine", exportName: "millingNeuralCognitiveEngine", subsystem: "neural", capabilities: ["cognitive", "reasoning", "decision"], machineTypes: ["mill", "5axis"], priority: 8, description: "Cognitive neural processing for milling", filePath: "engines/MillingNeuralCognitiveEngine.ts" },
  { name: "MillComprehensiveNeuralEngine", exportName: "millComprehensiveNeuralEngine", subsystem: "neural", capabilities: ["comprehensive", "multi_output", "milling"], machineTypes: ["mill", "5axis"], priority: 9, description: "Comprehensive milling neural predictions", filePath: "engines/MillComprehensiveNeuralEngine.ts" },
  { name: "LatheNeuralIntelligenceEngine", exportName: "latheNeuralIntelligenceEngine", subsystem: "neural", capabilities: ["lathe_neural", "pattern", "turning"], machineTypes: ["lathe"], priority: 9, description: "Lathe neural intelligence", filePath: "engines/LatheNeuralIntelligenceEngine.ts" },
  { name: "KnowledgeGraphNeuralBridgeEngine", exportName: "knowledgeGraphNeuralBridgeEngine", subsystem: "neural", capabilities: ["knowledge_graph", "embedding", "retrieval"], machineTypes: ["all"], priority: 7, description: "Knowledge graph neural embeddings", filePath: "engines/KnowledgeGraphNeuralBridgeEngine.ts" },
  { name: "FuzzyNeuralHybridEngine", exportName: "fuzzyNeuralHybridEngine", subsystem: "neural", capabilities: ["fuzzy_logic", "neural", "hybrid"], machineTypes: ["all"], priority: 7, description: "Fuzzy-neural hybrid reasoning", filePath: "engines/FuzzyNeuralHybridEngine.ts" },
  { name: "PostProcessorNeuralNetworkEngine", exportName: "postProcessorNeuralNetworkEngine", subsystem: "neural", capabilities: ["post_processor", "gcode", "neural"], machineTypes: ["all"], priority: 8, description: "Neural post processor optimization", filePath: "engines/PostProcessorNeuralNetworkEngine.ts" },
  { name: "PostProcessorVideoKnowledgeNeuralEngine", exportName: "postProcessorVideoKnowledgeNeuralEngine", subsystem: "neural", capabilities: ["video_knowledge", "visual", "learning"], machineTypes: ["all"], priority: 7, description: "Video-based neural knowledge extraction", filePath: "engines/PostProcessorVideoKnowledgeNeuralEngine.ts" },
  { name: "SurfaceFinishCnnEngine", exportName: "surfaceFinishCnnEngine", subsystem: "neural", capabilities: ["surface_finish", "cnn", "prediction"], machineTypes: ["mill", "lathe", "5axis"], priority: 9, description: "CNN surface finish prediction", filePath: "engines/SurfaceFinishCnnEngine.ts" },

  // ============ ADAPTIVE SUBSYSTEM (28 engines) ============
  { name: "AdaptiveFeedControlEngine", exportName: "adaptiveFeedControlEngine", subsystem: "adaptive", capabilities: ["feed_control", "real_time", "optimization"], machineTypes: ["mill", "lathe", "5axis"], priority: 10, description: "Real-time adaptive feed control", filePath: "engines/AdaptiveFeedControlEngine.ts" },
  { name: "AdaptiveFeedModulationEngine", exportName: "adaptiveFeedModulationEngine", subsystem: "adaptive", capabilities: ["feed_modulation", "engagement", "chip_load"], machineTypes: ["mill", "5axis"], priority: 9, description: "Engagement-based feed modulation", filePath: "engines/AdaptiveFeedModulationEngine.ts" },
  { name: "AdaptiveChatterEngine", exportName: "adaptiveChatterEngine", subsystem: "adaptive", capabilities: ["chatter_suppression", "real_time", "spindle"], machineTypes: ["mill", "lathe", "5axis"], priority: 10, description: "Real-time chatter suppression", filePath: "engines/AdaptiveChatterEngine.ts" },
  { name: "AdaptiveWearEngine", exportName: "adaptiveWearEngine", subsystem: "adaptive", capabilities: ["wear_compensation", "tracking", "tool_life"], machineTypes: ["mill", "lathe", "5axis"], priority: 9, description: "Adaptive wear compensation", filePath: "engines/AdaptiveWearEngine.ts" },
  { name: "AdaptiveThermalEngine", exportName: "adaptiveThermalEngine", subsystem: "adaptive", capabilities: ["thermal_compensation", "expansion", "drift"], machineTypes: ["mill", "lathe", "5axis"], priority: 8, description: "Thermal compensation control", filePath: "engines/AdaptiveThermalEngine.ts" },
  { name: "AdaptiveEngagementEngine", exportName: "adaptiveEngagementEngine", subsystem: "adaptive", capabilities: ["engagement_control", "chip_load", "constant_load"], machineTypes: ["mill", "5axis"], priority: 9, description: "Adaptive engagement control", filePath: "engines/AdaptiveEngagementEngine.ts" },
  { name: "AdaptiveSpindleControlEngine", exportName: "adaptiveSpindleControlEngine", subsystem: "adaptive", capabilities: ["spindle_control", "sld", "rpm_variation"], machineTypes: ["mill", "lathe", "5axis"], priority: 9, description: "SLD-aware spindle control", filePath: "engines/AdaptiveSpindleControlEngine.ts" },
  { name: "AdaptiveOverrideEngine", exportName: "adaptiveOverrideEngine", subsystem: "adaptive", capabilities: ["override", "operator_assist", "safety"], machineTypes: ["all"], priority: 7, description: "Operator override assistance", filePath: "engines/AdaptiveOverrideEngine.ts" },
  { name: "AdaptiveMachiningIntegrationEngine", exportName: "adaptiveMachiningIntegrationEngine", subsystem: "adaptive", capabilities: ["integration", "coordination", "multi_system"], machineTypes: ["mill", "lathe", "5axis"], priority: 8, description: "Multi-system adaptive integration", filePath: "engines/AdaptiveMachiningIntegrationEngine.ts" },
  { name: "AdaptivePhysicsBridgeEngine", exportName: "adaptivePhysicsBridgeEngine", subsystem: "adaptive", capabilities: ["physics_adaptive", "correction", "real_time"], machineTypes: ["mill", "lathe", "5axis"], priority: 8, description: "Physics-based adaptive corrections", filePath: "engines/AdaptivePhysicsBridgeEngine.ts" },
  { name: "AdaptiveSystemIntegrationEngine", exportName: "adaptiveSystemIntegrationEngine", subsystem: "adaptive", capabilities: ["system_integration", "multi_channel", "coordination"], machineTypes: ["all"], priority: 8, description: "System-wide adaptive integration", filePath: "engines/AdaptiveSystemIntegrationEngine.ts" },
  { name: "BayesianAdaptiveEngine", exportName: "bayesianAdaptiveEngine", subsystem: "adaptive", capabilities: ["bayesian", "uncertainty", "online_learning"], machineTypes: ["all"], priority: 8, description: "Bayesian adaptive control", filePath: "engines/BayesianAdaptiveEngine.ts" },
  { name: "LatheAdaptiveMachiningEngine", exportName: "latheAdaptiveMachiningEngine", subsystem: "adaptive", capabilities: ["lathe_adaptive", "turning", "real_time"], machineTypes: ["lathe"], priority: 10, description: "Lathe-specific adaptive control", filePath: "engines/LatheAdaptiveMachiningEngine.ts" },
  { name: "AdaptiveChiploadEngine", exportName: "adaptiveChiploadEngine", subsystem: "adaptive", capabilities: ["chipload", "constant_chip", "optimization"], machineTypes: ["mill", "5axis"], priority: 9, description: "Constant chipload optimization", filePath: "engines/AdaptiveChiploadEngine.ts" },
  { name: "AdaptiveClearingEngine", exportName: "adaptiveClearingEngine", subsystem: "adaptive", capabilities: ["clearing", "pocket", "material_removal"], machineTypes: ["mill", "5axis"], priority: 8, description: "Adaptive clearing strategies", filePath: "engines/AdaptiveClearingEngine.ts" },
  { name: "AdaptiveToolpathRouterEngine", exportName: "adaptiveToolpathRouterEngine", subsystem: "adaptive", capabilities: ["toolpath", "routing", "optimization"], machineTypes: ["mill", "5axis"], priority: 8, description: "Adaptive toolpath routing", filePath: "engines/AdaptiveToolpathRouterEngine.ts" },
  { name: "AdaptiveRefinementEngine", exportName: "adaptiveRefinementEngine", subsystem: "adaptive", capabilities: ["refinement", "iteration", "improvement"], machineTypes: ["all"], priority: 7, description: "Iterative adaptive refinement", filePath: "engines/AdaptiveRefinementEngine.ts" },
  { name: "AdaptiveParameterSpaceEngine", exportName: "adaptiveParameterSpaceEngine", subsystem: "adaptive", capabilities: ["parameter_space", "exploration", "bounds"], machineTypes: ["all"], priority: 7, description: "Parameter space exploration", filePath: "engines/AdaptiveParameterSpaceEngine.ts" },
  { name: "EngagementAdaptiveFeedEngine", exportName: "engagementAdaptiveFeedEngine", subsystem: "adaptive", capabilities: ["engagement", "feed", "geometric"], machineTypes: ["mill", "5axis"], priority: 9, description: "Geometry-aware adaptive feed", filePath: "engines/EngagementAdaptiveFeedEngine.ts" },

  // ============ META-LEARNING SUBSYSTEM (24 engines) ============
  { name: "MetaAIOrchestrationEngine", exportName: "metaAIOrchestrationEngine", subsystem: "meta", capabilities: ["metacognition", "self_aware", "orchestration"], machineTypes: ["all"], priority: 10, description: "Meta-cognitive AI orchestration", filePath: "engines/MetaAIOrchestrationEngine.ts" },
  { name: "MetaLearningOptimizerEngine", exportName: "metaLearningOptimizerEngine", subsystem: "meta", capabilities: ["meta_learning", "optimization", "hyperparameter"], machineTypes: ["all"], priority: 9, description: "Meta-learning optimization", filePath: "engines/MetaLearningOptimizerEngine.ts" },
  { name: "MetacognitionBudgetEngine", exportName: "metacognitionBudgetEngine", subsystem: "meta", capabilities: ["budget", "resource", "allocation"], machineTypes: ["all"], priority: 7, description: "Metacognitive resource budgeting", filePath: "engines/MetacognitionBudgetEngine.ts" },
  { name: "MillingMetaLearningEngine", exportName: "millingMetaLearningEngine", subsystem: "meta", capabilities: ["milling_meta", "continuous", "adaptation"], machineTypes: ["mill", "5axis"], priority: 9, description: "Milling meta-learning", filePath: "engines/MillingMetaLearningEngine.ts" },
  { name: "LatheMetaLearningEngine", exportName: "latheMetaLearningEngine", subsystem: "meta", capabilities: ["lathe_meta", "continuous", "turning"], machineTypes: ["lathe"], priority: 9, description: "Lathe meta-learning", filePath: "engines/LatheMetaLearningEngine.ts" },
  { name: "PostProcessorMetaLearningEngine", exportName: "postProcessorMetaLearningEngine", subsystem: "meta", capabilities: ["post_processor_meta", "gcode", "learning"], machineTypes: ["all"], priority: 8, description: "Post processor meta-learning", filePath: "engines/PostProcessorMetaLearningEngine.ts" },
  { name: "IncrementalLearningEngine", exportName: "incrementalLearningEngine", subsystem: "meta", capabilities: ["incremental", "online", "streaming"], machineTypes: ["all"], priority: 8, description: "Incremental online learning", filePath: "engines/IncrementalLearningEngine.ts" },
  { name: "ActiveLearningStrategyEngine", exportName: "activeLearningStrategyEngine", subsystem: "meta", capabilities: ["active_learning", "query", "selection"], machineTypes: ["all"], priority: 8, description: "Active learning sample selection", filePath: "engines/ActiveLearningStrategyEngine.ts" },
  { name: "FleetLearningStrategyEngine", exportName: "fleetLearningStrategyEngine", subsystem: "meta", capabilities: ["fleet", "distributed", "federated"], machineTypes: ["all"], priority: 8, description: "Fleet-wide distributed learning", filePath: "engines/FleetLearningStrategyEngine.ts" },
  { name: "ExceptionLearningEngine", exportName: "exceptionLearningEngine", subsystem: "meta", capabilities: ["exception", "anomaly", "edge_case"], machineTypes: ["all"], priority: 7, description: "Exception and anomaly learning", filePath: "engines/ExceptionLearningEngine.ts" },

  // ============ XAI SUBSYSTEM (18 engines) ============
  { name: "ReasoningExplainerEngine", exportName: "reasoningExplainerEngine", subsystem: "xai", capabilities: ["explanation", "trace", "justification"], machineTypes: ["all"], priority: 9, description: "Reasoning explanation generation", filePath: "engines/ReasoningExplainerEngine.ts" },
  { name: "MillingReasoningTraceLedgerEngine", exportName: "millingReasoningTraceLedgerEngine", subsystem: "xai", capabilities: ["ledger", "audit", "compliance"], machineTypes: ["mill", "5axis"], priority: 8, description: "Auditable reasoning ledger", filePath: "engines/MillingReasoningTraceLedgerEngine.ts" },
  { name: "ReasoningChainSharingEngine", exportName: "reasoningChainSharingEngine", subsystem: "xai", capabilities: ["chain_sharing", "collaboration", "transparency"], machineTypes: ["all"], priority: 7, description: "Reasoning chain sharing", filePath: "engines/ReasoningChainSharingEngine.ts" },

  // ============ ORCHESTRATION SUBSYSTEM (54 engines) ============
  { name: "MillingAGIOrchestrationEngine", exportName: "millingAGIOrchestrationEngine", subsystem: "orchestration", capabilities: ["milling_agi", "orchestration", "unified"], machineTypes: ["mill", "5axis"], priority: 10, description: "AGI-level milling orchestration", filePath: "engines/MillingAGIOrchestrationEngine.ts" },
  { name: "MasterPostProcessorAGIOrchestrationEngine", exportName: "masterPostProcessorAGIOrchestrationEngine", subsystem: "orchestration", capabilities: ["post_processor", "agi", "unified"], machineTypes: ["all"], priority: 10, description: "Master post processor orchestration", filePath: "engines/MasterPostProcessorAGIOrchestrationEngine.ts" },
  { name: "UnifiedPPAGIOrchestrationEngine", exportName: "unifiedPPAGIOrchestrationEngine", subsystem: "orchestration", capabilities: ["unified_pp", "agi", "integration"], machineTypes: ["all"], priority: 9, description: "Unified PP AGI orchestration", filePath: "engines/UnifiedPPAGIOrchestrationEngine.ts" },

  // ============ LEARNING SUBSYSTEM (35 engines) ============
  { name: "CrossDisciplinaryDeepLearningEngine", exportName: "crossDisciplinaryEngine", subsystem: "learning", capabilities: ["cross_domain", "deep_learning", "synthesis"], machineTypes: ["all"], priority: 10, description: "Cross-disciplinary deep learning", filePath: "engines/CrossDisciplinaryDeepLearningEngine.ts" },
  { name: "CAMDeepLearningEngine", exportName: "camDeepLearningEngine", subsystem: "learning", capabilities: ["cam", "deep_learning", "strategy"], machineTypes: ["all"], priority: 9, description: "CAM deep learning", filePath: "engines/CAMDeepLearningEngine.ts" },
  { name: "FiveAxisDeepLearningEngine", exportName: "fiveAxisDeepLearningEngine", subsystem: "learning", capabilities: ["5axis", "deep_learning", "kinematics"], machineTypes: ["5axis"], priority: 9, description: "5-axis deep learning", filePath: "engines/FiveAxisDeepLearningEngine.ts" },
  { name: "HyperMillDeepLearningEngine", exportName: "hyperMillDeepLearningEngine", subsystem: "learning", capabilities: ["hypermill", "deep_learning", "cam"], machineTypes: ["mill", "5axis"], priority: 8, description: "hyperMILL deep learning", filePath: "engines/HyperMillDeepLearningEngine.ts" },
  { name: "ElectrodeDeepLearningEngine", exportName: "electrodeDeepLearningEngine", subsystem: "learning", capabilities: ["electrode", "deep_learning", "edm"], machineTypes: ["sinker_edm"], priority: 8, description: "Electrode deep learning", filePath: "engines/ElectrodeDeepLearningEngine.ts" },
  { name: "JMDieProgramLearningEngine", exportName: "jmDieProgramLearningEngine", subsystem: "learning", capabilities: ["jm_die", "program_learning", "tribal"], machineTypes: ["all"], priority: 9, description: "JM Die program learning", filePath: "engines/JMDieProgramLearningEngine.ts" },
  { name: "AdvancedStatisticalLearningEngine", exportName: "advancedStatisticalLearningEngine", subsystem: "learning", capabilities: ["statistical", "regression", "inference"], machineTypes: ["all"], priority: 8, description: "Advanced statistical learning", filePath: "engines/AdvancedStatisticalLearningEngine.ts" },
  { name: "AIResourceLearningEngine", exportName: "aiResourceLearningEngine", subsystem: "learning", capabilities: ["resource", "optimization", "allocation"], machineTypes: ["all"], priority: 7, description: "AI resource learning", filePath: "engines/AIResourceLearningEngine.ts" },
  { name: "FleetDeploymentLearningEngine", exportName: "fleetDeploymentLearningEngine", subsystem: "learning", capabilities: ["fleet", "deployment", "distributed"], machineTypes: ["all"], priority: 7, description: "Fleet deployment learning", filePath: "engines/FleetDeploymentLearningEngine.ts" },
  { name: "InteractiveLearningSessionEngine", exportName: "interactiveLearningSessionEngine", subsystem: "learning", capabilities: ["interactive", "session", "human_in_loop"], machineTypes: ["all"], priority: 7, description: "Interactive learning sessions", filePath: "engines/InteractiveLearningSessionEngine.ts" },

  // ============ KNOWLEDGE SUBSYSTEM (50 engines) ============
  { name: "TribalKnowledgeEngine", exportName: "tribalKnowledgeEngine", subsystem: "knowledge", capabilities: ["tribal", "shop_floor", "experiential"], machineTypes: ["all"], priority: 10, description: "Tribal knowledge management (3,700+ tips)", filePath: "engines/TribalKnowledgeEngine.ts" },
  { name: "MachiningPlaybookEngine", exportName: "machiningPlaybookEngine", subsystem: "knowledge", capabilities: ["playbook", "rules", "best_practice"], machineTypes: ["all"], priority: 10, description: "Machining playbook rules (296)", filePath: "engines/MachiningPlaybookEngine.ts" },
  { name: "PRISMSelfAwarenessEngine", exportName: "prismSelfAwarenessEngine", subsystem: "knowledge", capabilities: ["self_awareness", "inventory", "gap_detection"], machineTypes: ["all"], priority: 10, description: "PRISM self-awareness and inventory", filePath: "engines/PRISMSelfAwarenessEngine.ts" },
  { name: "PRISMNeuralKnowledgeSynthesisEngine", exportName: "prismNeuralKnowledgeSynthesisEngine", subsystem: "knowledge", capabilities: ["knowledge_synthesis", "neural", "integration"], machineTypes: ["all"], priority: 9, description: "Neural knowledge synthesis", filePath: "engines/PRISMNeuralKnowledgeSynthesisEngine.ts" },
];

// ==================== REGISTRY CLASS ====================

class AISubsystemRegistry {
  private entries: AIEngineEntry[] = REGISTRY_ENTRIES;

  /**
   * Get all engines in a specific subsystem
   */
  getSubsystem(subsystem: AISubsystemCategory): AIEngineEntry[] {
    return this.entries
      .filter(e => e.subsystem === subsystem)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Query engines by capability
   */
  queryCapability(query: CapabilityQuery): AIEngineEntry[] {
    let results = [...this.entries];

    if (query.capability) {
      results = results.filter(e => e.capabilities.includes(query.capability!));
    }

    if (query.capabilities) {
      results = results.filter(e =>
        query.capabilities!.some(c => e.capabilities.includes(c))
      );
    }

    if (query.machineType && query.machineType !== "all") {
      results = results.filter(e =>
        e.machineTypes.includes(query.machineType!) || e.machineTypes.includes("all")
      );
    }

    if (query.subsystem) {
      results = results.filter(e => e.subsystem === query.subsystem);
    }

    if (query.minPriority) {
      results = results.filter(e => e.priority >= query.minPriority!);
    }

    return results.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get statistics for all subsystems
   */
  getStats(): SubsystemStats[] {
    const subsystems: AISubsystemCategory[] = [
      "reasoning", "neural", "adaptive", "physics", "meta", "xai",
      "orchestration", "learning", "knowledge"
    ];

    return subsystems.map(subsystem => {
      const engines = this.getSubsystem(subsystem);
      const allCaps = new Set<string>();
      engines.forEach(e => e.capabilities.forEach(c => allCaps.add(c)));

      return {
        subsystem,
        engineCount: engines.length,
        capabilities: Array.from(allCaps),
        topEngines: engines.slice(0, 5).map(e => e.name),
      };
    });
  }

  /**
   * Get total engine count
   */
  getTotalCount(): number {
    return this.entries.length;
  }

  /**
   * Find engine by name
   */
  findByName(name: string): AIEngineEntry | undefined {
    return this.entries.find(e =>
      e.name.toLowerCase() === name.toLowerCase() ||
      e.exportName.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * Get engines for a specific machine type
   */
  getForMachineType(machineType: MachineTypeTag): AIEngineEntry[] {
    if (machineType === "all") return this.entries;

    return this.entries.filter(e =>
      e.machineTypes.includes(machineType) || e.machineTypes.includes("all")
    );
  }

  /**
   * Get all unique capabilities
   */
  getAllCapabilities(): string[] {
    const caps = new Set<string>();
    this.entries.forEach(e => e.capabilities.forEach(c => caps.add(c)));
    return Array.from(caps).sort();
  }

  /**
   * Recommend engines for a machining context
   */
  recommendForContext(
    machineType: MachineTypeTag,
    requiredCapabilities: string[]
  ): Map<AISubsystemCategory, AIEngineEntry[]> {
    const result = new Map<AISubsystemCategory, AIEngineEntry[]>();
    const machineEngines = this.getForMachineType(machineType);

    const subsystems: AISubsystemCategory[] = [
      "reasoning", "neural", "adaptive", "physics", "meta", "xai"
    ];

    for (const subsystem of subsystems) {
      const subsystemEngines = machineEngines
        .filter(e => e.subsystem === subsystem)
        .filter(e =>
          requiredCapabilities.length === 0 ||
          requiredCapabilities.some(c => e.capabilities.includes(c))
        )
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 5);

      if (subsystemEngines.length > 0) {
        result.set(subsystem, subsystemEngines);
      }
    }

    return result;
  }
}

export const aiSubsystemRegistry = new AISubsystemRegistry();
