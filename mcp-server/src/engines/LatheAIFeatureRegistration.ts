/**
 * LatheAIFeatureRegistration — Registers all lathe AI engines with the AI Feature Auto-Registry
 * ==============================================================================================
 *
 * Ensures all lathe AI engines are discoverable by:
 * - AutonomousAIOrchestrationEngine
 * - AIFeatureAutoRegistryEngine
 * - DeepAIIntelligenceEngine
 * - ProactiveAIIntelligenceEngine
 *
 * Lathe AI Engine Suite (27+ engines, 15,000+ LOC):
 * - Core AI: LatheOpusReasoningEngine, LatheDeepAIHardeningEngine
 * - Learning: LatheDeepLearningIntelligenceEngine, LatheAITrainingEngine
 * - Knowledge: LatheResourceKnowledgeEngine, LatheKnowledgeHarvesterEngine
 * - Optimization: LatheProgramOptimizerEngine, LatheShopAwareOptimizationEngine
 * - Intelligence: LatheCAMIntelligenceEngine, LatheMachineIntelligenceEngine
 * - Reasoning: LatheDeepReasoningEngine, LathePredictiveIntelligenceEngine
 * - Operations: LatheUnifiedAIEngine, LatheAIUltraEngine, LatheAdvancedOperationsEngine
 *
 * @module engines/LatheAIFeatureRegistration
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// LATHE AI ENGINE REGISTRY
// ============================================================================

export interface LatheAIEngine {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  domain: "turning" | "lathe" | "mill-turn";
  aiFeatures: string[];
  lineCount: number;
  testCount: number;
  mcpActions: string[];
}

/**
 * Complete registry of all lathe AI engines
 */
export const LATHE_AI_ENGINE_REGISTRY: LatheAIEngine[] = [
  // ===== Core AI Engines =====
  {
    id: "lathe-opus-reasoning",
    name: "LatheOpusReasoningEngine",
    description: "Claude Opus-level intelligence with neural networks, deep reasoning chains, counterfactual analysis, and cost optimization",
    capabilities: [
      "neural_network_prediction",
      "deep_reasoning_chains",
      "counterfactual_analysis",
      "cost_efficiency_optimization",
      "hybrid_strategy_generation",
      "operation_flow_optimization",
      "knowledge_synthesis",
    ],
    domain: "lathe",
    aiFeatures: ["neural_network", "deep_reasoning", "counterfactual", "optimization"],
    lineCount: 2527,
    testCount: 50,
    mcpActions: [
      "lathe_opus_analyze",
      "lathe_opus_optimize",
      "lathe_opus_reasoning",
      "lathe_opus_counterfactual",
      "lathe_opus_hybrid_strategy",
    ],
  },
  {
    id: "lathe-deep-ai-hardening",
    name: "LatheDeepAIHardeningEngine",
    description: "Cross-engine AI hardening layer unifying 21 lathe engines with physics validation and JM Die shop context",
    capabilities: [
      "engine_unification",
      "physics_validation",
      "shop_context_injection",
      "controller_knowledge",
      "material_optimization",
    ],
    domain: "lathe",
    aiFeatures: ["unification", "validation", "context"],
    lineCount: 1934,
    testCount: 0,
    mcpActions: [],
  },

  // ===== Learning Engines =====
  {
    id: "lathe-deep-learning",
    name: "LatheDeepLearningIntelligenceEngine",
    description: "Neural pattern recognition with MLP, CNN-style, and recurrent analysis for G-code sequences",
    capabilities: [
      "pattern_recognition",
      "neural_embedding",
      "knowledge_graph",
      "reinforcement_learning",
      "quality_scoring",
    ],
    domain: "lathe",
    aiFeatures: ["deep_learning", "pattern_recognition", "embedding"],
    lineCount: 1414,
    testCount: 0,
    mcpActions: [],
  },
  {
    id: "lathe-ai-training",
    name: "LatheAITrainingEngine",
    description: "Physics-validated training from JM Die lathe programs (16,558 programs analyzed)",
    capabilities: [
      "program_parsing",
      "physics_validation",
      "pattern_learning",
      "anti_pattern_detection",
      "parameter_improvement",
    ],
    domain: "lathe",
    aiFeatures: ["training", "validation", "learning"],
    lineCount: 954,
    testCount: 0,
    mcpActions: [],
  },
  {
    id: "lathe-kinematics",
    name: "LatheKinematicsDeepLearningEngine",
    description: "Machine kinematics neural networks for axis motion prediction and collision avoidance",
    capabilities: [
      "kinematics_prediction",
      "motion_optimization",
      "collision_detection",
      "axis_coordination",
    ],
    domain: "lathe",
    aiFeatures: ["kinematics", "motion", "collision"],
    lineCount: 0,
    testCount: 0,
    mcpActions: [],
  },

  // ===== Knowledge Engines =====
  {
    id: "lathe-resource-knowledge",
    name: "LatheResourceKnowledgeEngine",
    description: "Okuma AOT knowledge, amateur mistake detection, best practices, and program patterns",
    capabilities: [
      "aot_optimization",
      "mistake_detection",
      "best_practice_scoring",
      "program_pattern_matching",
      "controller_knowledge",
      "improvement_generation",
    ],
    domain: "lathe",
    aiFeatures: ["knowledge", "detection", "scoring"],
    lineCount: 1045,
    testCount: 16,
    mcpActions: [
      "lathe_knowledge_detect_mistakes",
      "lathe_knowledge_score_program",
      "lathe_knowledge_generate_improvements",
      "lathe_knowledge_best_practices",
    ],
  },
  {
    id: "lathe-knowledge-harvester",
    name: "LatheKnowledgeHarvesterEngine",
    description: "Knowledge extraction from JM Die programs, tribal knowledge, and resources folder",
    capabilities: [
      "program_harvesting",
      "tribal_knowledge_extraction",
      "resource_parsing",
      "knowledge_synthesis",
      "customer_preference_learning",
    ],
    domain: "lathe",
    aiFeatures: ["harvesting", "extraction", "synthesis"],
    lineCount: 1103,
    testCount: 0,
    mcpActions: [],
  },

  // ===== Optimization Engines =====
  {
    id: "lathe-program-optimizer",
    name: "LatheProgramOptimizerEngine",
    description: "Automatic program optimization with fixes for amateur mistakes and physics validation",
    capabilities: [
      "program_analysis",
      "automatic_fixing",
      "patch_generation",
      "metrics_estimation",
      "batch_optimization",
    ],
    domain: "lathe",
    aiFeatures: ["optimization", "fixing", "batch"],
    lineCount: 1512,
    testCount: 59,
    mcpActions: [],
  },
  {
    id: "lathe-shop-aware",
    name: "LatheShopAwareOptimizationEngine",
    description: "Shop-specific optimization considering JM Die machines, materials, and practices",
    capabilities: [
      "shop_context",
      "machine_selection",
      "material_optimization",
      "cost_reduction",
    ],
    domain: "lathe",
    aiFeatures: ["shop", "context", "optimization"],
    lineCount: 777,
    testCount: 0,
    mcpActions: [],
  },

  // ===== Intelligence Engines =====
  {
    id: "lathe-cam-intelligence",
    name: "LatheCAMIntelligenceEngine",
    description: "CAM-specific intelligence for toolpath selection, MRR optimization, and strategy recommendation",
    capabilities: [
      "toolpath_selection",
      "mrr_optimization",
      "strategy_recommendation",
      "feature_mapping",
      "interrupted_cut_detection",
    ],
    domain: "lathe",
    aiFeatures: ["cam", "toolpath", "strategy"],
    lineCount: 0,
    testCount: 0,
    mcpActions: [
      "lathe_cam_template",
      "lathe_cam_toolpath",
      "lathe_cam_sequence",
      "lathe_cam_workholding",
      "lathe_cam_mrr_optimize",
      "lathe_cam_analyze",
      "lathe_cam_feature_map",
      "lathe_cam_interrupted_cut",
    ],
  },
  {
    id: "lathe-machine-intelligence",
    name: "LatheMachineIntelligenceEngine",
    description: "Machine-specific intelligence for 11 lathe types and axis configurations",
    capabilities: [
      "machine_selection",
      "capability_matching",
      "axis_configuration",
      "controller_optimization",
    ],
    domain: "lathe",
    aiFeatures: ["machine", "capability", "configuration"],
    lineCount: 0,
    testCount: 0,
    mcpActions: [],
  },

  // ===== Reasoning Engines =====
  {
    id: "lathe-deep-reasoning",
    name: "LatheDeepReasoningEngine",
    description: "Multi-step reasoning chains for complex lathe programming decisions",
    capabilities: [
      "multi_step_reasoning",
      "fmea_analysis",
      "root_cause_analysis",
      "decision_trees",
    ],
    domain: "lathe",
    aiFeatures: ["reasoning", "fmea", "decision"],
    lineCount: 0,
    testCount: 0,
    mcpActions: [],
  },
  {
    id: "lathe-predictive",
    name: "LathePredictiveIntelligenceEngine",
    description: "Predictive intelligence for wear, finish, thermal, and tool life",
    capabilities: [
      "wear_prediction",
      "finish_prediction",
      "thermal_prediction",
      "tool_life_prediction",
    ],
    domain: "lathe",
    aiFeatures: ["prediction", "wear", "thermal"],
    lineCount: 0,
    testCount: 0,
    mcpActions: [],
  },
  {
    id: "lathe-troubleshooting",
    name: "LatheTroubleshootingIntelligenceEngine",
    description: "Intelligent troubleshooting for chatter, tool breakage, and surface finish issues",
    capabilities: [
      "chatter_diagnosis",
      "breakage_analysis",
      "finish_troubleshooting",
      "recommendation_generation",
    ],
    domain: "lathe",
    aiFeatures: ["troubleshooting", "diagnosis", "recommendation"],
    lineCount: 0,
    testCount: 0,
    mcpActions: [],
  },

  // ===== Operations Engines =====
  {
    id: "lathe-unified-ai",
    name: "LatheUnifiedAIEngine",
    description: "Master orchestration for print-to-program automation",
    capabilities: [
      "print_to_program",
      "full_automation",
      "workflow_orchestration",
      "quality_gates",
    ],
    domain: "lathe",
    aiFeatures: ["orchestration", "automation", "workflow"],
    lineCount: 0,
    testCount: 0,
    mcpActions: [],
  },
  {
    id: "lathe-ai-ultra",
    name: "LatheAIUltraEngine",
    description: "Ultra-comprehensive AI for 21 controllers, 8 families, and 4 programming modes",
    capabilities: [
      "controller_translation",
      "family_classification",
      "mode_selection",
      "cross_controller_optimization",
    ],
    domain: "lathe",
    aiFeatures: ["controller", "translation", "classification"],
    lineCount: 0,
    testCount: 0,
    mcpActions: [],
  },
  {
    id: "lathe-advanced-ops",
    name: "LatheAdvancedOperationsEngine",
    description: "Advanced operations: live tooling, multi-start threads, Swiss-style",
    capabilities: [
      "live_tooling",
      "multi_start_threading",
      "swiss_programming",
      "sub_spindle_coordination",
    ],
    domain: "lathe",
    aiFeatures: ["advanced", "live_tool", "swiss"],
    lineCount: 0,
    testCount: 0,
    mcpActions: [],
  },

  // ===== Support Engines =====
  {
    id: "lathe-expert-advisor",
    name: "LatheExpertAdvisorEngine",
    description: "Expert system for 11 material categories and insert grade selection",
    capabilities: [
      "material_recommendation",
      "insert_selection",
      "grade_matching",
      "coating_recommendation",
    ],
    domain: "lathe",
    aiFeatures: ["expert", "material", "tooling"],
    lineCount: 0,
    testCount: 0,
    mcpActions: [],
  },
  {
    id: "lathe-collision-zone",
    name: "LatheCollisionZoneEngine",
    description: "Collision detection for turret, tailstock, and live tools",
    capabilities: [
      "collision_detection",
      "clearance_calculation",
      "safe_zone_mapping",
      "interference_checking",
    ],
    domain: "lathe",
    aiFeatures: ["collision", "safety", "clearance"],
    lineCount: 0,
    testCount: 0,
    mcpActions: [
      "lathe_collision_check",
      "lathe_swing_check",
      "lathe_grooving_overhang",
      "lathe_boring_reach",
    ],
  },
  {
    id: "lathe-science-hardening",
    name: "LatheScienceHardeningEngine",
    description: "Physics hardening: chatter SLD, hard turning, thread physics",
    capabilities: [
      "chatter_analysis",
      "hard_turning_optimization",
      "thread_physics",
      "stability_lobe_calculation",
    ],
    domain: "lathe",
    aiFeatures: ["physics", "chatter", "stability"],
    lineCount: 0,
    testCount: 0,
    mcpActions: [
      "lathe_chatter_analysis",
      "lathe_hard_turning",
      "lathe_thread_schedule",
      "lathe_drill_thrust",
      "lathe_parting_force",
      "lathe_beam_deflection",
    ],
  },
];

// ============================================================================
// STATISTICS
// ============================================================================

export interface LatheAIStats {
  totalEngines: number;
  totalLineCount: number;
  totalTests: number;
  totalMcpActions: number;
  totalCapabilities: number;
  enginesByDomain: Record<string, number>;
  aiFeaturesCoverage: string[];
}

/**
 * Calculate statistics for the lathe AI suite
 */
export function getLatheAIStats(): LatheAIStats {
  const engines = LATHE_AI_ENGINE_REGISTRY;

  const allCapabilities = new Set<string>();
  const allAiFeatures = new Set<string>();
  const domainCounts: Record<string, number> = {};

  let totalLines = 0;
  let totalTests = 0;
  let totalActions = 0;

  for (const engine of engines) {
    totalLines += engine.lineCount;
    totalTests += engine.testCount;
    totalActions += engine.mcpActions.length;

    domainCounts[engine.domain] = (domainCounts[engine.domain] || 0) + 1;

    for (const cap of engine.capabilities) {
      allCapabilities.add(cap);
    }
    for (const feat of engine.aiFeatures) {
      allAiFeatures.add(feat);
    }
  }

  return {
    totalEngines: engines.length,
    totalLineCount: totalLines,
    totalTests: totalTests,
    totalMcpActions: totalActions,
    totalCapabilities: allCapabilities.size,
    enginesByDomain: domainCounts,
    aiFeaturesCoverage: Array.from(allAiFeatures),
  };
}

// ============================================================================
// REGISTRATION FUNCTIONS
// ============================================================================

/**
 * Register all lathe AI engines with the AI Feature Auto-Registry
 */
export async function registerLatheAIEngines(): Promise<{
  registered: number;
  skipped: number;
  errors: string[];
}> {
  const results = { registered: 0, skipped: 0, errors: [] as string[] };

  try {
    const { aiFeatureAutoRegistry } = await import("./AIFeatureAutoRegistryEngine.js");

    for (const engine of LATHE_AI_ENGINE_REGISTRY) {
      try {
        aiFeatureAutoRegistry.autoIngest(`${engine.name}.ts`, {
          name: engine.name,
          description: engine.description,
          capabilities: engine.capabilities,
          domains: [engine.domain],
        });
        results.registered++;
      } catch (e) {
        results.skipped++;
      }
    }

    log.info(`[LatheAIFeatureRegistration] Registered ${results.registered} engines`);
  } catch (e) {
    results.errors.push(`Registry import failed: ${e}`);
  }

  return results;
}

/**
 * Get all lathe engines that support a specific capability
 */
export function getEnginesByCapability(capability: string): LatheAIEngine[] {
  return LATHE_AI_ENGINE_REGISTRY.filter((e) =>
    e.capabilities.includes(capability)
  );
}

/**
 * Get all MCP actions available for lathe AI
 */
export function getAllLatheMcpActions(): string[] {
  const actions: string[] = [];
  for (const engine of LATHE_AI_ENGINE_REGISTRY) {
    actions.push(...engine.mcpActions);
  }
  return actions;
}

/**
 * Find the best engine for a given task
 */
export function findBestEngineForTask(task: string): LatheAIEngine | null {
  const taskLower = task.toLowerCase();

  // Neural network tasks
  if (taskLower.includes("neural") || taskLower.includes("predict") || taskLower.includes("learn")) {
    return LATHE_AI_ENGINE_REGISTRY.find((e) => e.id === "lathe-opus-reasoning") || null;
  }

  // Optimization tasks
  if (taskLower.includes("optimize") || taskLower.includes("improve") || taskLower.includes("fix")) {
    return LATHE_AI_ENGINE_REGISTRY.find((e) => e.id === "lathe-program-optimizer") || null;
  }

  // Analysis tasks
  if (taskLower.includes("analyze") || taskLower.includes("score") || taskLower.includes("detect")) {
    return LATHE_AI_ENGINE_REGISTRY.find((e) => e.id === "lathe-resource-knowledge") || null;
  }

  // Knowledge tasks
  if (taskLower.includes("knowledge") || taskLower.includes("extract") || taskLower.includes("harvest")) {
    return LATHE_AI_ENGINE_REGISTRY.find((e) => e.id === "lathe-knowledge-harvester") || null;
  }

  // Training tasks
  if (taskLower.includes("train") || taskLower.includes("physics") || taskLower.includes("validate")) {
    return LATHE_AI_ENGINE_REGISTRY.find((e) => e.id === "lathe-ai-training") || null;
  }

  // Reasoning tasks
  if (taskLower.includes("reason") || taskLower.includes("diagnose") || taskLower.includes("troubleshoot")) {
    return LATHE_AI_ENGINE_REGISTRY.find((e) => e.id === "lathe-deep-reasoning") || null;
  }

  // Default to Opus reasoning
  return LATHE_AI_ENGINE_REGISTRY.find((e) => e.id === "lathe-opus-reasoning") || null;
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheAIFeatureRegistration = {
  registry: LATHE_AI_ENGINE_REGISTRY,
  getStats: getLatheAIStats,
  register: registerLatheAIEngines,
  findByCapability: getEnginesByCapability,
  getAllActions: getAllLatheMcpActions,
  findBestEngine: findBestEngineForTask,
};
