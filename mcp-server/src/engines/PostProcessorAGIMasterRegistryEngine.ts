/**
 * PostProcessorAGIMasterRegistryEngine — PP-MASTER-REGISTRY
 * ==========================================================
 * The definitive inventory and routing system for ALL 40+ post
 * processor engines in PRISM. Makes the AI system AWARE of every
 * PP engine's capabilities and routes tasks to the best engine(s).
 *
 * This engine solves the problem that the Master AGI orchestrator
 * needs to KNOW what exists in order to USE it. Without this
 * registry, we have 40+ engines that the AI doesn't know about.
 *
 * COVERAGE:
 *   - 6 AGI-tier engines (built this session)
 *   - 34+ pre-existing PP engines (discovered in audit)
 *   - Full capability mapping
 *   - Task-to-engine routing rules
 *   - Cross-engine dependency graph
 *
 * INTEGRATION:
 *   - PRISMSelfAwarenessEngine queries this for PP capabilities
 *   - MasterPostProcessorAGIOrchestrationEngine routes through this
 *   - PostProcessorAICoordinationBridge uses this to discover engines
 *
 * @module engines/PostProcessorAGIMasterRegistryEngine
 * @milestone PP-MASTER-REGISTRY
 * @version 1.0.0
 */

// ============================================================================
// POST PROCESSOR MASTER REGISTRY — ALL 40+ ENGINES
// ============================================================================

const PP_MASTER_REGISTRY: PPEngineRegistryEntry[] = [
  // ---------- TIER 1: AGI ORCHESTRATION (Session 2026-04-15) ----------
  {
    id: "pp-master-agi",
    name: "MasterPostProcessorAGIOrchestrationEngine",
    path: "src/engines/MasterPostProcessorAGIOrchestrationEngine.ts",
    tier: "agi-orchestration",
    purpose: "Supreme AGI orchestrator for all post processor intelligence",
    capabilities: ["7-step reasoning chain", "12-engine coordination", "9 reasoning modes"],
    inputs: ["AGIPostRequest"],
    outputs: ["AGIPostResult"],
    dependencies: ["pp-unified-physics", "pp-physics-generator", "pp-video-neural"],
    priority: 1,
    status: "active",
    built: "2026-04-15"
  },
  {
    id: "pp-coordination-bridge",
    name: "PostProcessorAICoordinationBridge",
    path: "src/engines/PostProcessorAICoordinationBridge.ts",
    tier: "agi-orchestration",
    purpose: "Execution layer that invokes real engines and aggregates",
    capabilities: ["Multi-engine execution", "Consensus voting", "Quality gates", "Performance tracking"],
    inputs: ["CoordinatedRequest"],
    outputs: ["CoordinatedResult"],
    dependencies: ["pp-unified-physics", "pp-physics-generator", "pp-master-agi"],
    priority: 1,
    status: "active",
    built: "2026-04-15"
  },
  {
    id: "pp-agi-learning",
    name: "PostProcessorAGIContinuousLearningEngine",
    path: "src/engines/PostProcessorAGIContinuousLearningEngine.ts",
    tier: "agi-orchestration",
    purpose: "Self-improvement through Bayesian learning from production feedback",
    capabilities: ["Bayesian belief updating", "Mistake pattern detection", "Knowledge extraction", "Meta-learning"],
    inputs: ["ProductionFeedback"],
    outputs: ["LearningState", "MistakePattern[]", "LearnedKnowledge[]"],
    dependencies: [],
    priority: 2,
    status: "active",
    built: "2026-04-15"
  },
  // ---------- TIER 2: PHYSICS ----------
  {
    id: "pp-unified-physics",
    name: "PostProcessorUnifiedPhysicsOrchestrationEngine",
    path: "src/engines/PostProcessorUnifiedPhysicsOrchestrationEngine.ts",
    tier: "physics",
    purpose: "8-model unified physics orchestration (Kienzle/Taylor/Tlusty/etc.)",
    capabilities: ["Cutting force", "Tool life", "Thermal", "Chatter stability", "Surface integrity", "Metallurgy"],
    inputs: ["MachiningState"],
    outputs: ["UnifiedPhysicsAnalysis"],
    dependencies: [],
    priority: 1,
    status: "active",
    built: "2026-04-15"
  },
  {
    id: "pp-physics-generator",
    name: "PostProcessorPhysicsAwareGeneratorEngine",
    path: "src/engines/PostProcessorPhysicsAwareGeneratorEngine.ts",
    tier: "physics",
    purpose: "Physics-validated G-code generation for 7 controller families",
    capabilities: ["Physics validation", "Feed optimization", "RTCP codes", "Material-specific speeds/feeds"],
    inputs: ["PhysicsAwareRequest"],
    outputs: ["PhysicsAwareResult"],
    dependencies: ["pp-unified-physics"],
    priority: 1,
    status: "active",
    built: "2026-04-15"
  },
  // ---------- TIER 3: KNOWLEDGE ----------
  {
    id: "pp-hypermill-kb",
    name: "PostProcessorHyperMillKnowledgeEngine",
    path: "src/engines/PostProcessorHyperMillKnowledgeEngine.ts",
    tier: "knowledge",
    purpose: "Production knowledge from JM Die hyperMILL post configs",
    capabilities: ["Machine-specific configs", "Variable resolution", "Pattern validation", "Tribal tips"],
    inputs: ["machineId", "template"],
    outputs: ["MachinePostConfig", "resolved templates"],
    dependencies: [],
    priority: 2,
    status: "active",
    built: "2026-04-15"
  },
  {
    id: "pp-video-neural",
    name: "PostProcessorVideoKnowledgeNeuralEngine",
    path: "src/engines/PostProcessorVideoKnowledgeNeuralEngine.ts",
    tier: "knowledge",
    purpose: "34+ hours video-learned controller knowledge via neural reasoning",
    capabilities: ["Video training knowledge", "14 controllers", "6-layer neural", "Reasoning chains"],
    inputs: ["VideoKnowledgeQuery"],
    outputs: ["NeuralReasoningResult"],
    dependencies: [],
    priority: 2,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-knowledge-graph",
    name: "PostProcessorKnowledgeGraphEngine",
    path: "src/engines/PostProcessorKnowledgeGraphEngine.ts",
    tier: "knowledge",
    purpose: "Knowledge graph with RTCP configurations and fault diagnosis",
    capabilities: ["Knowledge graph", "RTCP for 6 controllers", "Fault diagnosis"],
    inputs: ["KnowledgeGraphQuery"],
    outputs: ["KGReasoningResult"],
    dependencies: [],
    priority: 2,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-knowledge-engine",
    name: "PostProcessorKnowledgeEngine",
    path: "src/engines/PostProcessorKnowledgeEngine.ts",
    tier: "knowledge",
    purpose: "Entry functions, drilling cycles, UPK switches, circular settings",
    capabilities: ["Entry functions", "Drilling cycles", "Controller switches"],
    inputs: ["query"],
    outputs: ["EntryFunction", "DrillingCycleType"],
    dependencies: [],
    priority: 3,
    status: "active",
    built: "earlier"
  },
  // ---------- TIER 4: EXPERTISE ----------
  {
    id: "pp-genius",
    name: "MasterPostProcessorGeniusEngine",
    path: "src/engines/MasterPostProcessorGeniusEngine.ts",
    tier: "expertise",
    purpose: "50-year master expertise with PhD-level cutting mechanics",
    capabilities: ["Cutting mechanics", "Machine expertise", "JM Die patterns", "Print-to-program"],
    inputs: ["PostGenerationRequest"],
    outputs: ["MasterPostResult"],
    dependencies: [],
    priority: 2,
    status: "active",
    built: "earlier"
  },
  // ---------- TIER 5: DEEP LEARNING ----------
  {
    id: "pp-transformer",
    name: "PostProcessorTransformerEngine",
    path: "src/engines/PostProcessorTransformerEngine.ts",
    tier: "deep-learning",
    purpose: "Transformer architecture for G-code generation (Bi-LSTM + attention)",
    capabilities: ["Bi-LSTM", "Multi-head attention", "Graph attention", "Diffusion model"],
    inputs: ["TransformerInput"],
    outputs: ["TransformerGenerationResult"],
    dependencies: [],
    priority: 3,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-deep-learning",
    name: "PostProcessorDeepLearningEngine",
    path: "src/engines/PostProcessorDeepLearningEngine.ts",
    tier: "deep-learning",
    purpose: "Pattern recognition and optimization via deep learning",
    capabilities: ["Pattern recognition", "Feed optimization", "Controller classification", "Cycle time estimation"],
    inputs: ["DeepLearningInput"],
    outputs: ["DeepLearningAnalysis"],
    dependencies: [],
    priority: 3,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-neural-network",
    name: "PostProcessorNeuralNetworkEngine",
    path: "src/engines/PostProcessorNeuralNetworkEngine.ts",
    tier: "deep-learning",
    purpose: "Neural network for post processor patterns",
    capabilities: ["Neural inference", "Pattern classification"],
    inputs: ["features"],
    outputs: ["predictions"],
    dependencies: [],
    priority: 3,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-trainer",
    name: "PostProcessorTrainerEngine",
    path: "src/engines/PostProcessorTrainerEngine.ts",
    tier: "deep-learning",
    purpose: "Training pipeline for PP neural networks",
    capabilities: ["Model training", "Data preparation"],
    inputs: ["training_data"],
    outputs: ["trained_model"],
    dependencies: ["pp-neural-network"],
    priority: 4,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-deep-ai-hardening",
    name: "PostProcessorDeepAIHardeningEngine",
    path: "src/engines/PostProcessorDeepAIHardeningEngine.ts",
    tier: "deep-learning",
    purpose: "Production hardening of deep AI PP systems",
    capabilities: ["Production validation", "Edge case handling", "Hardening"],
    inputs: ["generation_request"],
    outputs: ["hardened_result"],
    dependencies: [],
    priority: 3,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-deep-intelligence",
    name: "PostProcessorDeepIntelligenceEngine",
    path: "src/engines/PostProcessorDeepIntelligenceEngine.ts",
    tier: "deep-learning",
    purpose: "Deep intelligence for PP decisions",
    capabilities: ["Deep reasoning", "Context understanding"],
    inputs: ["context"],
    outputs: ["decisions"],
    dependencies: [],
    priority: 3,
    status: "active",
    built: "earlier"
  },
  // ---------- TIER 6: REASONING ----------
  {
    id: "pp-deep-reasoning",
    name: "PostProcessorDeepReasoningEngine",
    path: "src/engines/PostProcessorDeepReasoningEngine.ts",
    tier: "reasoning",
    purpose: "Deep causal inference for post processor decisions",
    capabilities: ["Chain-of-thought", "Causal inference", "Cross-CAM synthesis", "Controller optimization"],
    inputs: ["DeepReasoningInput"],
    outputs: ["DeepReasoningAnalysis"],
    dependencies: [],
    priority: 2,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-unified-deep-reasoning",
    name: "PostProcessorUnifiedDeepReasoningEngine",
    path: "src/engines/PostProcessorUnifiedDeepReasoningEngine.ts",
    tier: "reasoning",
    purpose: "Unified deep reasoning across all PP systems",
    capabilities: ["Unified reasoning", "Multi-source synthesis"],
    inputs: ["UnifiedReasoningRequest"],
    outputs: ["UnifiedReasoningResult"],
    dependencies: [],
    priority: 2,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-cognitive",
    name: "PostProcessorCognitiveEngine",
    path: "src/engines/PostProcessorCognitiveEngine.ts",
    tier: "reasoning",
    purpose: "Cognitive architecture for human-like reasoning",
    capabilities: ["Cognitive modeling", "Mental simulation"],
    inputs: ["CognitiveGenerationRequest"],
    outputs: ["CognitiveGenerationResult"],
    dependencies: [],
    priority: 3,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-meta-learning",
    name: "PostProcessorMetaLearningEngine",
    path: "src/engines/PostProcessorMetaLearningEngine.ts",
    tier: "reasoning",
    purpose: "Meta-learning for rapid adaptation",
    capabilities: ["Learning to learn", "Few-shot adaptation"],
    inputs: ["MetaLearningInput"],
    outputs: ["MetaLearningResult"],
    dependencies: [],
    priority: 4,
    status: "active",
    built: "earlier"
  },
  // ---------- TIER 7: ULTIMATE/ENSEMBLE ----------
  {
    id: "pp-ultimate",
    name: "PostProcessorUltimateAIEngine",
    path: "src/engines/PostProcessorUltimateAIEngine.ts",
    tier: "ultimate",
    purpose: "Ultimate AI combining all advanced techniques",
    capabilities: ["Deep ensemble", "Episodic memory", "Tree of thoughts", "Adversarial validation"],
    inputs: ["UltimateAIInput"],
    outputs: ["UltimateAIAnalysis"],
    dependencies: [],
    priority: 2,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-intelligence-orchestrator",
    name: "PostProcessorIntelligenceOrchestratorEngine",
    path: "src/engines/PostProcessorIntelligenceOrchestratorEngine.ts",
    tier: "ultimate",
    purpose: "Multi-engine intelligence orchestration",
    capabilities: ["Multi-engine orchestration", "Confidence-weighted fusion"],
    inputs: ["OrchestratorInput"],
    outputs: ["OrchestratorResponse"],
    dependencies: [],
    priority: 2,
    status: "active",
    built: "earlier"
  },
  // ---------- TIER 8: GENERATORS/PIPELINE ----------
  {
    id: "pp-generator",
    name: "PostProcessorGeneratorEngine",
    path: "src/engines/PostProcessorGeneratorEngine.ts",
    tier: "generator",
    purpose: "Core post processor generator engine",
    capabilities: ["G-code generation", "Post processing"],
    inputs: ["generation_request"],
    outputs: ["generated_post"],
    dependencies: [],
    priority: 2,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-master",
    name: "MasterPostProcessorEngine",
    path: "src/engines/MasterPostProcessorEngine.ts",
    tier: "generator",
    purpose: "Master post processor (original, pre-AGI)",
    capabilities: ["Master generation", "Multi-controller"],
    inputs: ["master_request"],
    outputs: ["master_post"],
    dependencies: [],
    priority: 2,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-engine",
    name: "PostProcessorEngine",
    path: "src/engines/PostProcessorEngine.ts",
    tier: "generator",
    purpose: "Base PostProcessorEngine",
    capabilities: ["Base post processing"],
    inputs: ["request"],
    outputs: ["post"],
    dependencies: [],
    priority: 3,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-advanced",
    name: "AdvancedPostProcessorEngine",
    path: "src/engines/AdvancedPostProcessorEngine.ts",
    tier: "generator",
    purpose: "Advanced post processor with expanded capabilities",
    capabilities: ["Advanced post features"],
    inputs: ["request"],
    outputs: ["advanced_post"],
    dependencies: [],
    priority: 3,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-lathe",
    name: "LathePostProcessorEngine",
    path: "src/engines/LathePostProcessorEngine.ts",
    tier: "generator",
    purpose: "Lathe-specific post processor",
    capabilities: ["Lathe G-code", "Turning cycles (G70-G76)"],
    inputs: ["lathe_request"],
    outputs: ["lathe_post"],
    dependencies: [],
    priority: 2,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-lathe-ai",
    name: "LathePostProcessorAIEngine",
    path: "src/engines/LathePostProcessorAIEngine.ts",
    tier: "generator",
    purpose: "AI-enhanced lathe post processor",
    capabilities: ["AI lathe post", "Intelligent cycle selection"],
    inputs: ["lathe_ai_request"],
    outputs: ["lathe_ai_post"],
    dependencies: [],
    priority: 2,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-edm-extension",
    name: "EDMPostProcessorExtension",
    path: "src/engines/EDMPostProcessorExtension.ts",
    tier: "generator",
    purpose: "EDM post processor extension (wire/sinker)",
    capabilities: ["Wire EDM", "Sinker EDM", "Mitsubishi/AgieCharmilles"],
    inputs: ["edm_request"],
    outputs: ["edm_post"],
    dependencies: [],
    priority: 2,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-pipeline",
    name: "PostProcessorPipelineEngine",
    path: "src/engines/PostProcessorPipelineEngine.ts",
    tier: "generator",
    purpose: "38-stage post processor pipeline",
    capabilities: ["38-stage pipeline", "Full workflow"],
    inputs: ["pipeline_request"],
    outputs: ["pipeline_result"],
    dependencies: [],
    priority: 1,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-api",
    name: "PostProcessorAPIEngine",
    path: "src/engines/PostProcessorAPIEngine.ts",
    tier: "generator",
    purpose: "API-accessible post processor interface",
    capabilities: ["REST API", "External integration"],
    inputs: ["api_request"],
    outputs: ["api_response"],
    dependencies: [],
    priority: 3,
    status: "active",
    built: "earlier"
  },
  // ---------- TIER 9: ANALYSIS/VERIFICATION ----------
  {
    id: "pp-verification",
    name: "PostProcessorVerificationEngine",
    path: "src/engines/PostProcessorVerificationEngine.ts",
    tier: "verification",
    purpose: "Post processor output verification",
    capabilities: ["G-code verification", "Syntax validation"],
    inputs: ["generated_post"],
    outputs: ["verification_report"],
    dependencies: [],
    priority: 2,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-analyzer",
    name: "PostProcessorAnalyzerEngine",
    path: "src/engines/PostProcessorAnalyzerEngine.ts",
    tier: "verification",
    purpose: "Post processor analyzer (properties, features)",
    capabilities: ["Post analysis", "Property extraction"],
    inputs: ["post_file"],
    outputs: ["PostProcessorInfo", "PostProperty[]"],
    dependencies: [],
    priority: 3,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-analysis",
    name: "PostProcessorAnalysisEngine",
    path: "src/engines/PostProcessorAnalysisEngine.ts",
    tier: "verification",
    purpose: "Post processor analysis with auto-fixes",
    capabilities: ["Issue detection", "Auto-fix generation"],
    inputs: ["post"],
    outputs: ["AnalysisResult"],
    dependencies: [],
    priority: 3,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-capability-matrix",
    name: "PostProcessorCapabilityMatrixEngine",
    path: "src/engines/PostProcessorCapabilityMatrixEngine.ts",
    tier: "verification",
    purpose: "Capability matrix for PP engines",
    capabilities: ["Capability tracking", "Engine matrix"],
    inputs: ["engine_id"],
    outputs: ["capabilities"],
    dependencies: [],
    priority: 3,
    status: "active",
    built: "earlier"
  },
  // ---------- TIER 10: UTILITIES/OPTIMIZERS ----------
  {
    id: "pp-feed-optimizer",
    name: "PostProcessorFeedOptimizerEngine",
    path: "src/engines/PostProcessorFeedOptimizerEngine.ts",
    tier: "optimizer",
    purpose: "Feed rate optimization for posts",
    capabilities: ["Feed optimization", "Chip load balancing"],
    inputs: ["g_code"],
    outputs: ["optimized_feeds"],
    dependencies: [],
    priority: 3,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-autopilot",
    name: "PostProcessorAutopilotEngine",
    path: "src/engines/PostProcessorAutopilotEngine.ts",
    tier: "optimizer",
    purpose: "Autopilot mode for automated post generation",
    capabilities: ["Autonomous operation", "Minimal user input"],
    inputs: ["minimal_spec"],
    outputs: ["full_post"],
    dependencies: [],
    priority: 3,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-rl",
    name: "RLPostProcessorEngine",
    path: "src/engines/RLPostProcessorEngine.ts",
    tier: "optimizer",
    purpose: "Reinforcement learning for post optimization",
    capabilities: ["RL training", "Policy learning"],
    inputs: ["feedback"],
    outputs: ["improved_policy"],
    dependencies: [],
    priority: 4,
    status: "active",
    built: "earlier"
  },
  // ---------- TIER 11: SPECIAL/BRIDGE ----------
  {
    id: "pp-telemetry",
    name: "PostProcessorTelemetryEngine",
    path: "src/engines/PostProcessorTelemetryEngine.ts",
    tier: "utility",
    purpose: "Telemetry and metrics for PP generation",
    capabilities: ["Event tracking", "Funnel metrics", "Performance monitoring"],
    inputs: ["events"],
    outputs: ["PPGTelemetryEvent", "PPGFunnelMetrics"],
    dependencies: [],
    priority: 4,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-novel-bridge",
    name: "NovelPostProcessorBridgeEngine",
    path: "src/engines/NovelPostProcessorBridgeEngine.ts",
    tier: "utility",
    purpose: "Bridge for novel/experimental PP patterns",
    capabilities: ["Novel pattern bridging", "Experimental features"],
    inputs: ["novel_request"],
    outputs: ["bridged_result"],
    dependencies: [],
    priority: 4,
    status: "active",
    built: "earlier"
  },
  {
    id: "pp-self-awareness",
    name: "PostProcessorAISelfAwarenessIntegrationEngine",
    path: "src/engines/PostProcessorAISelfAwarenessIntegrationEngine.ts",
    tier: "agi-orchestration",
    purpose: "Integration with PRISMSelfAwarenessEngine for PP-specific context",
    capabilities: ["Self-awareness integration", "Context injection"],
    inputs: ["AIPostGeneratorRequest"],
    outputs: ["AIGeneratedPostResult"],
    dependencies: [],
    priority: 2,
    status: "active",
    built: "earlier"
  },
  // ---------- SESSION 2026-04-15 ADDITIONS (6 engines) ----------
  {
    id: "pp-comprehensive-kb",
    name: "PostProcessorComprehensiveKnowledgeEngine",
    path: "src/engines/PostProcessorComprehensiveKnowledgeEngine.ts",
    tier: "knowledge",
    purpose: "Universal catalog index: 30,000+ entries across machines/materials/tools/holders/fixtures",
    capabilities: ["Catalog indexing", "Runtime ingestion", "Multi-source routing", "H drive awareness"],
    inputs: ["query", "IngestedAsset"],
    outputs: ["ComprehensiveQueryResult"],
    dependencies: [],
    priority: 2,
    status: "active",
    built: "2026-04-15"
  },
  {
    id: "pp-kinematics",
    name: "PostProcessorMachineKinematicsEngine",
    path: "src/engines/PostProcessorMachineKinematicsEngine.ts",
    tier: "physics",
    purpose: "Complete machine engineering: 20 topologies, 5 way types, 5 build tiers, 910+ machines",
    capabilities: ["Kinematic topologies", "Way types", "Accuracy tiers", "Collision envelopes", "Work volume calc", "Cutting condition validation"],
    inputs: ["machineId", "cuttingCondition"],
    outputs: ["MachineKinematicProfile", "validationResult"],
    dependencies: [],
    priority: 1,
    status: "active",
    built: "2026-04-15"
  },
  {
    id: "pp-cps-impl",
    name: "PostProcessorCPSImplementationEngine",
    path: "src/engines/PostProcessorCPSImplementationEngine.ts",
    tier: "knowledge",
    purpose: "PRISM-enhanced CPS file knowledge: 7 roughing features, 3 controllers, Okuma cycle-time M-codes",
    capabilities: ["CPS implementation knowledge", "Combined benefit calculation", "Issue diagnosis", "Cycle time optimization"],
    inputs: ["controllerId", "featureIds"],
    outputs: ["PrismCPSFile", "CombinedBenefit"],
    dependencies: [],
    priority: 2,
    status: "active",
    built: "2026-04-15"
  },
  {
    id: "pp-prod-patterns",
    name: "PostProcessorProductionPatternEngine",
    path: "src/engines/PostProcessorProductionPatternEngine.ts",
    tier: "knowledge",
    purpose: "JM Die production patterns: 24,469 programs analyzed, material-specific speeds/feeds",
    capabilities: ["Operation frequencies", "Customer patterns", "Material SFM/feeds", "Operation sequences", "Macro patterns"],
    inputs: ["material", "operation", "customer"],
    outputs: ["MaterialProductionParams", "OperationSequence"],
    dependencies: [],
    priority: 2,
    status: "active",
    built: "2026-04-15"
  },
  {
    id: "pp-master-post-arch",
    name: "PostProcessorMasterPostArchitectureEngine",
    path: "src/engines/PostProcessorMasterPostArchitectureEngine.ts",
    tier: "generator",
    purpose: "Master post architecture: 26 machine types, 180 Fusion posts inventory, Hurco v11 tracker",
    capabilities: ["Machine type taxonomy", "Master post templates", "Conversion rules", "Hurco v11 fine-tuning tracker", "Roadmap generation"],
    inputs: ["machineTypeId"],
    outputs: ["MasterPostTemplate", "roadmap"],
    dependencies: [],
    priority: 1,
    status: "active",
    built: "2026-04-15"
  },
  {
    id: "pp-tribal-int",
    name: "PostProcessorTribalKnowledgeIntegrationEngine",
    path: "src/engines/PostProcessorTribalKnowledgeIntegrationEngine.ts",
    tier: "knowledge",
    purpose: "Unified tribal knowledge: 36 curated + 259 external tips across 8 sources",
    capabilities: ["Tribal tips", "Context-based injection", "Priority sorting", "Physics-aware reasoning", "Safety warnings"],
    inputs: ["context (controller, operation, material)"],
    outputs: ["TribalTip[]", "criticalWarnings", "recommendations"],
    dependencies: [],
    priority: 1,
    status: "active",
    built: "2026-04-15"
  }
];

interface PPEngineRegistryEntry {
  id: string;
  name: string;
  path: string;
  tier: "agi-orchestration" | "physics" | "knowledge" | "expertise" | "deep-learning" | "reasoning" | "ultimate" | "generator" | "verification" | "optimizer" | "utility";
  purpose: string;
  capabilities: string[];
  inputs: string[];
  outputs: string[];
  dependencies: string[];
  priority: 1 | 2 | 3 | 4 | 5;  // 1 = highest
  status: "active" | "deprecated" | "experimental";
  built: string;
}

// ============================================================================
// TASK-TO-ENGINE ROUTING RULES
// ============================================================================

const ROUTING_RULES: RoutingRule[] = [
  {
    taskPattern: /generat.*post|create.*post|build.*post/i,
    recommendedEngines: ["pp-master-agi", "pp-coordination-bridge", "pp-genius", "pp-master"],
    priority: 1,
    reasoning: "Post generation task — use AGI orchestrator"
  },
  {
    taskPattern: /physics|force|kienzle|taylor|thermal|chatter/i,
    recommendedEngines: ["pp-unified-physics", "pp-physics-generator"],
    priority: 1,
    reasoning: "Physics analysis task"
  },
  {
    taskPattern: /hypermill|haas.*vf|hurco.*vmx|okuma.*genos/i,
    recommendedEngines: ["pp-hypermill-kb", "pp-genius"],
    priority: 1,
    reasoning: "Production machine-specific knowledge"
  },
  {
    taskPattern: /video|training|learn.*video/i,
    recommendedEngines: ["pp-video-neural"],
    priority: 2,
    reasoning: "Video-learned knowledge"
  },
  {
    taskPattern: /deep.*learn|neural|pattern.*recogn/i,
    recommendedEngines: ["pp-deep-learning", "pp-transformer", "pp-neural-network"],
    priority: 2,
    reasoning: "Deep learning task"
  },
  {
    taskPattern: /reason|causal|think.*through/i,
    recommendedEngines: ["pp-deep-reasoning", "pp-unified-deep-reasoning", "pp-cognitive"],
    priority: 2,
    reasoning: "Deep reasoning task"
  },
  {
    taskPattern: /verify|validat|check.*post/i,
    recommendedEngines: ["pp-verification", "pp-analyzer", "pp-analysis"],
    priority: 2,
    reasoning: "Post verification task"
  },
  {
    taskPattern: /lathe|turn|okuma.*lx|mazak.*integrex/i,
    recommendedEngines: ["pp-lathe-ai", "pp-lathe"],
    priority: 1,
    reasoning: "Lathe post task"
  },
  {
    taskPattern: /wire.*edm|sinker.*edm|edm/i,
    recommendedEngines: ["pp-edm-extension"],
    priority: 1,
    reasoning: "EDM post task"
  },
  {
    taskPattern: /optim|feed.*rate|cycle.*time/i,
    recommendedEngines: ["pp-feed-optimizer", "pp-autopilot"],
    priority: 2,
    reasoning: "Optimization task"
  },
  {
    taskPattern: /learn|feedback|improve/i,
    recommendedEngines: ["pp-agi-learning", "pp-rl"],
    priority: 2,
    reasoning: "Learning/improvement task"
  },
  {
    taskPattern: /5.?axis|rtcp|tcpm|multiaxis/i,
    recommendedEngines: ["pp-knowledge-graph", "pp-physics-generator", "pp-master-agi"],
    priority: 1,
    reasoning: "5-axis / RTCP task"
  },
  // ---------- NEW ROUTING RULES (2026-04-15) ----------
  {
    taskPattern: /catalog|index|what.*(machine|material|tool|holder|fixture).*available/i,
    recommendedEngines: ["pp-comprehensive-kb", "pp-master-post-arch"],
    priority: 1,
    reasoning: "Asset catalog lookup (machines/materials/tools/holders/fixtures)"
  },
  {
    taskPattern: /kinematic|travel|reach|work.*volume|collision|table.*size|way.*type|build.*quality|accel|g.*force/i,
    recommendedEngines: ["pp-kinematics", "pp-physics-generator"],
    priority: 1,
    reasoning: "Machine engineering / kinematics task"
  },
  {
    taskPattern: /validate.*cutting|can.*machine.*handle|within.*machine.*limit/i,
    recommendedEngines: ["pp-kinematics", "pp-unified-physics"],
    priority: 1,
    reasoning: "Machine capability validation"
  },
  {
    taskPattern: /JM.*Die|production.*pattern|customer.*pattern|material.*speed|material.*feed/i,
    recommendedEngines: ["pp-prod-patterns", "pp-genius"],
    priority: 1,
    reasoning: "JM Die production pattern query"
  },
  {
    taskPattern: /CPS|Fusion.*post|cps.*file|onLinear|onCircular|onRapid/i,
    recommendedEngines: ["pp-cps-impl", "pp-master-post-arch"],
    priority: 1,
    reasoning: "CPS implementation / Fusion post knowledge"
  },
  {
    taskPattern: /master.*post|machine.*type|post.*architecture|conversion.*rule/i,
    recommendedEngines: ["pp-master-post-arch", "pp-cps-impl"],
    priority: 1,
    reasoning: "Master post architecture task"
  },
  {
    taskPattern: /Hurco.*v11|Hurco.*fine.*tun|Hurco.*issue/i,
    recommendedEngines: ["pp-master-post-arch", "pp-cps-impl", "pp-tribal-int"],
    priority: 1,
    reasoning: "Hurco v11 fine-tuning work"
  },
  {
    taskPattern: /tribal|wisdom|best.*practice|how.*should|what.*should|recommendation/i,
    recommendedEngines: ["pp-tribal-int", "pp-genius"],
    priority: 1,
    reasoning: "Tribal knowledge / best practice query"
  },
  {
    taskPattern: /safety|warning|danger|avoid|prevent/i,
    recommendedEngines: ["pp-tribal-int", "pp-kinematics", "pp-master-agi"],
    priority: 1,
    reasoning: "Safety query"
  },
  {
    taskPattern: /HSM|G187|G05|CYCLE832|UltiMotion|Super.*NURBS|high.*speed.*mach/i,
    recommendedEngines: ["pp-cps-impl", "pp-tribal-int", "pp-physics-generator"],
    priority: 1,
    reasoning: "HSM mode / advanced machining features"
  },
  {
    taskPattern: /cycle.*time.*reduct|cycle.*time.*saving|M63|M65|M141/i,
    recommendedEngines: ["pp-cps-impl", "pp-agi-learning"],
    priority: 2,
    reasoning: "Cycle time reduction with Okuma M-codes"
  },
  {
    taskPattern: /Fanuc|Siemens|Heidenhain|Mazak|Okuma|Haas|Hurco|Mitsubishi|Brother|Citizen/i,
    recommendedEngines: ["pp-tribal-int", "pp-cps-impl", "pp-hypermill-kb"],
    priority: 2,
    reasoning: "Controller-specific query — include tribal + implementation"
  },
  {
    taskPattern: /ingest.*machine|add.*machine|new.*machine|runtime.*machine/i,
    recommendedEngines: ["pp-comprehensive-kb", "pp-kinematics"],
    priority: 2,
    reasoning: "Runtime asset ingestion"
  },
  {
    taskPattern: /graphite|carbide|tool.*steel|D2|M2|S7|H13|titanium|inconel/i,
    recommendedEngines: ["pp-prod-patterns", "pp-tribal-int", "pp-unified-physics"],
    priority: 1,
    reasoning: "Material-specific query"
  }
];

interface RoutingRule {
  taskPattern: RegExp;
  recommendedEngines: string[];
  priority: 1 | 2 | 3;
  reasoning: string;
}

// ============================================================================
// MASTER REGISTRY ENGINE
// ============================================================================

class PostProcessorAGIMasterRegistryEngine {
  private readonly engineVersion = "1.0.0";

  /**
   * Get all engines in the registry
   */
  public getAllEngines(): PPEngineRegistryEntry[] {
    return PP_MASTER_REGISTRY;
  }

  /**
   * Get engine by ID
   */
  public getEngine(id: string): PPEngineRegistryEntry | undefined {
    return PP_MASTER_REGISTRY.find(e => e.id === id);
  }

  /**
   * Get engines by tier
   */
  public getEnginesByTier(tier: PPEngineRegistryEntry["tier"]): PPEngineRegistryEntry[] {
    return PP_MASTER_REGISTRY.filter(e => e.tier === tier);
  }

  /**
   * Get engines by priority level
   */
  public getEnginesByPriority(priority: PPEngineRegistryEntry["priority"]): PPEngineRegistryEntry[] {
    return PP_MASTER_REGISTRY.filter(e => e.priority === priority);
  }

  /**
   * Route a task to best engines
   */
  public routeTask(task: string): {
    matchedRules: RoutingRule[];
    recommendedEngines: PPEngineRegistryEntry[];
    reasoning: string[];
  } {
    const matchedRules: RoutingRule[] = [];
    const recommendedIds = new Set<string>();
    const reasoning: string[] = [];

    for (const rule of ROUTING_RULES) {
      if (rule.taskPattern.test(task)) {
        matchedRules.push(rule);
        for (const engineId of rule.recommendedEngines) {
          recommendedIds.add(engineId);
        }
        reasoning.push(rule.reasoning);
      }
    }

    const recommendedEngines = Array.from(recommendedIds)
      .map(id => this.getEngine(id))
      .filter((e): e is PPEngineRegistryEntry => e !== undefined)
      .sort((a, b) => a.priority - b.priority);

    return { matchedRules, recommendedEngines, reasoning };
  }

  /**
   * Search engines by capability
   */
  public searchByCapability(query: string): PPEngineRegistryEntry[] {
    const lowerQuery = query.toLowerCase();
    return PP_MASTER_REGISTRY.filter(e =>
      e.capabilities.some(c => c.toLowerCase().includes(lowerQuery)) ||
      e.purpose.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get dependencies for an engine
   */
  public getDependencies(engineId: string): PPEngineRegistryEntry[] {
    const engine = this.getEngine(engineId);
    if (!engine) return [];

    return engine.dependencies
      .map(depId => this.getEngine(depId))
      .filter((e): e is PPEngineRegistryEntry => e !== undefined);
  }

  /**
   * Get engines that depend on a given engine
   */
  public getDependents(engineId: string): PPEngineRegistryEntry[] {
    return PP_MASTER_REGISTRY.filter(e => e.dependencies.includes(engineId));
  }

  /**
   * Get capability matrix (all unique capabilities and engines that have them)
   */
  public getCapabilityMatrix(): Record<string, string[]> {
    const matrix: Record<string, string[]> = {};

    for (const engine of PP_MASTER_REGISTRY) {
      for (const capability of engine.capabilities) {
        if (!matrix[capability]) {
          matrix[capability] = [];
        }
        matrix[capability].push(engine.id);
      }
    }

    return matrix;
  }

  /**
   * Get tier distribution
   */
  public getTierDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const engine of PP_MASTER_REGISTRY) {
      distribution[engine.tier] = (distribution[engine.tier] || 0) + 1;
    }
    return distribution;
  }

  /**
   * Get execution plan for a task
   */
  public getExecutionPlan(task: string): {
    task: string;
    stages: Array<{
      stage: number;
      engines: PPEngineRegistryEntry[];
      parallel: boolean;
    }>;
    totalEngines: number;
    estimatedComplexity: "simple" | "moderate" | "complex";
  } {
    const routing = this.routeTask(task);
    const allEngines = routing.recommendedEngines;

    // Group by priority (lower priority = earlier stage)
    const byPriority: Record<number, PPEngineRegistryEntry[]> = {};
    for (const engine of allEngines) {
      if (!byPriority[engine.priority]) {
        byPriority[engine.priority] = [];
      }
      byPriority[engine.priority].push(engine);
    }

    const stages: ReturnType<typeof this.getExecutionPlan>["stages"] = [];
    const priorities = Object.keys(byPriority).map(Number).sort((a, b) => a - b);

    for (let i = 0; i < priorities.length; i++) {
      const priorityLevel = priorities[i];
      const engines = byPriority[priorityLevel];

      stages.push({
        stage: i + 1,
        engines,
        parallel: engines.length > 1 && !engines.some(e =>
          e.dependencies.some(d => engines.map(x => x.id).includes(d))
        )
      });
    }

    const complexity = allEngines.length < 3 ? "simple" :
                      allEngines.length < 6 ? "moderate" : "complex";

    return {
      task,
      stages,
      totalEngines: allEngines.length,
      estimatedComplexity: complexity
    };
  }

  /**
   * Get context for AI (injection into PRISMSelfAwarenessEngine)
   */
  public getContextForAI(): string {
    const stats = this.getStatistics();
    const tiers = this.getTierDistribution();

    return `
POST PROCESSOR MASTER REGISTRY (v${this.engineVersion})
=====================================================
TOTAL ENGINES: ${stats.totalEngines}
ACTIVE: ${stats.activeEngines}
ROUTING RULES: ${stats.routingRules}

TIERS:
${Object.entries(tiers).map(([t, c]) => `  ${t}: ${c} engines`).join("\n")}

API METHODS:
- routeTask(task) → recommended engines
- getEnginesByTier(tier) → tier-specific engines
- getCapabilityMatrix() → capability → engines map
- getExecutionPlan(task) → multi-stage plan
- searchByCapability(query) → matching engines
- getDependencies(id) → upstream engines
- getDependents(id) → downstream engines

USAGE FROM PRISMSelfAwarenessEngine:
  postProcessorAGIMasterRegistryEngine.routeTask("generate 5-axis post for titanium")
  → Returns: pp-master-agi, pp-physics-generator, pp-knowledge-graph

USAGE FROM MasterPostProcessorAGIOrchestrationEngine:
  const plan = registry.getExecutionPlan(request.description);
  for (const stage of plan.stages) {
    // Execute stage.engines in parallel (if stage.parallel)
  }
`;
  }

  /**
   * Get comprehensive statistics
   */
  public getStatistics(): {
    version: string;
    totalEngines: number;
    activeEngines: number;
    enginesByTier: Record<string, number>;
    enginesByPriority: Record<number, number>;
    routingRules: number;
    uniqueCapabilities: number;
    totalDependencies: number;
  } {
    const tiers = this.getTierDistribution();
    const priorities: Record<number, number> = {};
    const capabilities = new Set<string>();
    let totalDeps = 0;

    for (const engine of PP_MASTER_REGISTRY) {
      priorities[engine.priority] = (priorities[engine.priority] || 0) + 1;
      for (const cap of engine.capabilities) {
        capabilities.add(cap);
      }
      totalDeps += engine.dependencies.length;
    }

    return {
      version: this.engineVersion,
      totalEngines: PP_MASTER_REGISTRY.length,
      activeEngines: PP_MASTER_REGISTRY.filter(e => e.status === "active").length,
      enginesByTier: tiers,
      enginesByPriority: priorities,
      routingRules: ROUTING_RULES.length,
      uniqueCapabilities: capabilities.size,
      totalDependencies: totalDeps
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const postProcessorAGIMasterRegistryEngine = new PostProcessorAGIMasterRegistryEngine();

export {
  PP_MASTER_REGISTRY,
  ROUTING_RULES,
  type PPEngineRegistryEntry,
  type RoutingRule
};
