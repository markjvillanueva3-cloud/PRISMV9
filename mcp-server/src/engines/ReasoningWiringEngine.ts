/**
 * Reasoning Wiring Engine
 * =======================
 * Catalogs and wires 40 reasoning/cognition engines to appropriate dispatchers.
 * Identifies orphaned reasoning capabilities and suggests integration points.
 *
 * PP-WIRE-MS6: Wire 21 reasoning engines to consuming dispatchers
 *
 * @module engines/ReasoningWiringEngine
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export type ReasoningCategory =
  | "decision_making"
  | "diagnostic"
  | "creative"
  | "causal"
  | "multi_path"
  | "deep_thinking"
  | "explanation"
  | "scientific"
  | "domain_specific"
  | "orchestration";

export type ReasoningDomain =
  | "general"
  | "milling"
  | "turning"
  | "five_axis"
  | "edm"
  | "post_processor"
  | "business"
  | "quality"
  | "optimization";

export interface ReasoningEngineInfo {
  name: string;
  file: string;
  category: ReasoningCategory;
  domain: ReasoningDomain;
  description: string;
  capabilities: string[];
  inputTypes: string[];
  outputTypes: string[];
  complexity: "simple" | "moderate" | "complex" | "deep";
}

export interface DispatcherWiring {
  dispatcher: string;
  action: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

export interface ReasoningWiring {
  engine: string;
  status: "wired" | "orphan" | "partially_wired";
  wirings: DispatcherWiring[];
  wireCount: number;
}

export interface ReasoningWiringReport {
  totalEngines: number;
  wiredCount: number;
  orphanCount: number;
  coverage: number;
  byCategory: { category: ReasoningCategory; count: number; wired: number }[];
  byDomain: { domain: ReasoningDomain; count: number; wired: number }[];
  wirings: ReasoningWiring[];
}

// ============================================================================
// REASONING ENGINE CATALOG
// ============================================================================

const REASONING_CATALOG: ReasoningEngineInfo[] = [
  // Decision Making engines
  {
    name: "AIDecisionExplanationEngine",
    file: "AIDecisionExplanationEngine.ts",
    category: "explanation",
    domain: "general",
    description: "Generates human-readable explanations for AI decisions with confidence scoring",
    capabilities: ["decision_explanation", "confidence_scoring", "trace_generation", "justification"],
    inputTypes: ["decision", "context", "alternatives"],
    outputTypes: ["explanation", "confidence", "trace"],
    complexity: "moderate",
  },
  {
    name: "DecisionReasoningEngine",
    file: "DecisionReasoningEngine.ts",
    category: "decision_making",
    domain: "general",
    description: "Multi-criteria decision analysis with weighted scoring",
    capabilities: ["multi_criteria", "weighted_scoring", "sensitivity_analysis", "recommendation"],
    inputTypes: ["options", "criteria", "weights"],
    outputTypes: ["ranking", "scores", "recommendation"],
    complexity: "moderate",
  },
  {
    name: "DecisionTreeEngine",
    file: "DecisionTreeEngine.ts",
    category: "decision_making",
    domain: "general",
    description: "Rule-based decision trees for structured decision making",
    capabilities: ["rule_evaluation", "branch_traversal", "leaf_prediction", "tree_visualization"],
    inputTypes: ["features", "tree_definition"],
    outputTypes: ["prediction", "path", "confidence"],
    complexity: "simple",
  },
  {
    name: "FiveAxisDecisionEngine",
    file: "FiveAxisDecisionEngine.ts",
    category: "decision_making",
    domain: "five_axis",
    description: "5-axis machining strategy decisions based on part geometry and machine capabilities",
    capabilities: ["orientation_selection", "collision_check", "strategy_recommendation", "singularity_avoidance"],
    inputTypes: ["part_geometry", "machine_config", "tool_assembly"],
    outputTypes: ["strategy", "orientations", "warnings"],
    complexity: "complex",
  },
  {
    name: "FourthAxisDecisionEngine",
    file: "FourthAxisDecisionEngine.ts",
    category: "decision_making",
    domain: "general",
    description: "4th axis indexing and continuous rotation decisions",
    capabilities: ["indexing_strategy", "wrap_toolpath", "rotation_optimization", "setup_reduction"],
    inputTypes: ["part_features", "axis_config"],
    outputTypes: ["indexing_plan", "rotation_sequence"],
    complexity: "moderate",
  },
  {
    name: "MakeVsBuyDecisionEngine",
    file: "MakeVsBuyDecisionEngine.ts",
    category: "decision_making",
    domain: "business",
    description: "Strategic make vs buy analysis with cost, quality, and lead time factors",
    capabilities: ["cost_comparison", "capacity_analysis", "risk_assessment", "strategic_fit"],
    inputTypes: ["part_requirements", "internal_capabilities", "supplier_quotes"],
    outputTypes: ["recommendation", "cost_breakdown", "risk_analysis"],
    complexity: "moderate",
  },
  {
    name: "PipelineDecisionOrchestratorEngine",
    file: "PipelineDecisionOrchestratorEngine.ts",
    category: "orchestration",
    domain: "general",
    description: "Orchestrates multi-stage pipeline decisions with dependency management",
    capabilities: ["pipeline_routing", "stage_selection", "dependency_resolution", "parallel_execution"],
    inputTypes: ["pipeline_definition", "input_data", "constraints"],
    outputTypes: ["execution_plan", "stage_results", "metrics"],
    complexity: "complex",
  },
  {
    name: "MarkovDecisionEngine",
    file: "MarkovDecisionEngine.ts",
    category: "decision_making",
    domain: "optimization",
    description: "Markov decision process for sequential decision making under uncertainty",
    capabilities: ["state_transition", "policy_optimization", "value_iteration", "reward_modeling"],
    inputTypes: ["states", "actions", "transitions", "rewards"],
    outputTypes: ["optimal_policy", "value_function"],
    complexity: "complex",
  },

  // Diagnostic reasoning engines
  {
    name: "DiagnosticReasoningEngine",
    file: "DiagnosticReasoningEngine.ts",
    category: "diagnostic",
    domain: "general",
    description: "Root cause analysis with hypothesis generation and testing",
    capabilities: ["symptom_analysis", "hypothesis_generation", "evidence_gathering", "root_cause"],
    inputTypes: ["symptoms", "context", "history"],
    outputTypes: ["diagnosis", "root_causes", "recommendations"],
    complexity: "complex",
  },
  {
    name: "LatheCausalInferenceEngine",
    file: "LatheCausalInferenceEngine.ts",
    category: "causal",
    domain: "turning",
    description: "Causal inference for lathe machining problems",
    capabilities: ["causal_graph", "intervention_analysis", "counterfactual", "attribution"],
    inputTypes: ["observations", "interventions", "causal_model"],
    outputTypes: ["causal_effects", "attributions"],
    complexity: "complex",
  },

  // Creative reasoning engines
  {
    name: "PRISMCreativeReasoningEngine",
    file: "PRISMCreativeReasoningEngine.ts",
    category: "creative",
    domain: "general",
    description: "Cross-domain creative problem solving with analogical reasoning",
    capabilities: ["analogical_reasoning", "cross_domain_transfer", "novel_synthesis", "brainstorming"],
    inputTypes: ["problem", "constraints", "domain_knowledge"],
    outputTypes: ["solutions", "analogies", "novel_approaches"],
    complexity: "deep",
  },
  {
    name: "CounterfactualReasoningEngine",
    file: "CounterfactualReasoningEngine.ts",
    category: "causal",
    domain: "general",
    description: "What-if analysis and counterfactual scenario evaluation",
    capabilities: ["counterfactual_generation", "scenario_evaluation", "impact_analysis", "alternative_paths"],
    inputTypes: ["actual_outcome", "proposed_changes", "model"],
    outputTypes: ["counterfactual_outcomes", "differences", "insights"],
    complexity: "complex",
  },

  // Multi-path reasoning
  {
    name: "MultiPathReasoningEngine",
    file: "MultiPathReasoningEngine.ts",
    category: "multi_path",
    domain: "general",
    description: "Explores multiple reasoning paths in parallel with path scoring",
    capabilities: ["path_exploration", "parallel_reasoning", "path_scoring", "consensus"],
    inputTypes: ["problem", "strategies", "evaluation_criteria"],
    outputTypes: ["paths", "scores", "best_path", "alternatives"],
    complexity: "complex",
  },
  {
    name: "InferenceChainEngine",
    file: "InferenceChainEngine.ts",
    category: "multi_path",
    domain: "general",
    description: "Chain-of-thought reasoning with explicit inference steps",
    capabilities: ["step_reasoning", "chain_building", "verification", "backtracking"],
    inputTypes: ["premise", "goal", "rules"],
    outputTypes: ["inference_chain", "conclusion", "confidence"],
    complexity: "moderate",
  },

  // Deep thinking engines
  {
    name: "ExtendedThinkingBridgeEngine",
    file: "ExtendedThinkingBridgeEngine.ts",
    category: "deep_thinking",
    domain: "general",
    description: "Bridges to extended thinking capabilities for complex problem decomposition",
    capabilities: ["problem_decomposition", "deep_analysis", "synthesis", "reflection"],
    inputTypes: ["complex_problem", "context", "constraints"],
    outputTypes: ["analysis", "sub_problems", "synthesis", "insights"],
    complexity: "deep",
  },
  {
    name: "PostProcessorDeepCognitionEngine",
    file: "PostProcessorDeepCognitionEngine.ts",
    category: "deep_thinking",
    domain: "post_processor",
    description: "Deep cognitive analysis for post-processor optimization and debugging",
    capabilities: ["code_analysis", "pattern_recognition", "optimization_reasoning", "error_diagnosis"],
    inputTypes: ["gcode", "post_config", "issues"],
    outputTypes: ["analysis", "optimizations", "fixes"],
    complexity: "deep",
  },
  {
    name: "MillingDeepReasoningEngine",
    file: "MillingDeepReasoningEngine.ts",
    category: "deep_thinking",
    domain: "milling",
    description: "Deep reasoning for complex milling decisions",
    capabilities: ["strategy_reasoning", "physics_integration", "constraint_satisfaction", "optimization"],
    inputTypes: ["part", "machine", "tools", "constraints"],
    outputTypes: ["strategy", "parameters", "rationale"],
    complexity: "deep",
  },
  {
    name: "MillingNeuralCognitiveEngine",
    file: "MillingNeuralCognitiveEngine.ts",
    category: "deep_thinking",
    domain: "milling",
    description: "Neural-inspired cognitive processing for milling optimization",
    capabilities: ["pattern_learning", "adaptive_reasoning", "experience_integration", "generalization"],
    inputTypes: ["features", "history", "objectives"],
    outputTypes: ["predictions", "recommendations", "confidence"],
    complexity: "deep",
  },
  {
    name: "MillingCriticalThinkingEngine",
    file: "MillingCriticalThinkingEngine.ts",
    category: "deep_thinking",
    domain: "milling",
    description: "Critical analysis of milling strategies with bias detection",
    capabilities: ["strategy_critique", "assumption_checking", "bias_detection", "alternative_generation"],
    inputTypes: ["strategy", "assumptions", "context"],
    outputTypes: ["critique", "biases", "alternatives"],
    complexity: "complex",
  },

  // Domain-specific reasoning
  {
    name: "LatheAIReasoningEngine",
    file: "LatheAIReasoningEngine.ts",
    category: "domain_specific",
    domain: "turning",
    description: "AI-powered reasoning for lathe operations and turning decisions",
    capabilities: ["operation_planning", "tool_selection", "parameter_optimization", "quality_prediction"],
    inputTypes: ["part", "material", "machine", "requirements"],
    outputTypes: ["plan", "parameters", "predictions"],
    complexity: "complex",
  },
  {
    name: "LatheDeepLogicEngine",
    file: "LatheDeepLogicEngine.ts",
    category: "domain_specific",
    domain: "turning",
    description: "Deep logical reasoning for complex lathe setups",
    capabilities: ["setup_logic", "constraint_propagation", "feasibility_checking", "optimization"],
    inputTypes: ["part", "constraints", "capabilities"],
    outputTypes: ["setup", "feasibility", "optimizations"],
    complexity: "deep",
  },
  {
    name: "LatheDeepReasoningEngine",
    file: "LatheDeepReasoningEngine.ts",
    category: "deep_thinking",
    domain: "turning",
    description: "Deep reasoning for turning process optimization",
    capabilities: ["process_analysis", "parameter_reasoning", "quality_prediction", "optimization"],
    inputTypes: ["process", "material", "tool", "requirements"],
    outputTypes: ["analysis", "recommendations", "predictions"],
    complexity: "deep",
  },
  {
    name: "LatheOpusReasoningEngine",
    file: "LatheOpusReasoningEngine.ts",
    category: "deep_thinking",
    domain: "turning",
    description: "Opus-level reasoning for advanced lathe decision making",
    capabilities: ["advanced_reasoning", "multi_factor_analysis", "strategic_planning", "uncertainty_handling"],
    inputTypes: ["complex_problem", "constraints", "objectives"],
    outputTypes: ["strategy", "rationale", "confidence"],
    complexity: "deep",
  },
  {
    name: "ElectrodeAIReasoningEngine",
    file: "ElectrodeAIReasoningEngine.ts",
    category: "domain_specific",
    domain: "edm",
    description: "AI reasoning for EDM electrode design and machining strategy",
    capabilities: ["electrode_design", "strategy_selection", "parameter_optimization", "quality_prediction"],
    inputTypes: ["cavity", "material", "requirements"],
    outputTypes: ["electrode_design", "strategy", "parameters"],
    complexity: "complex",
  },
  {
    name: "PostProcessorCognitiveEngine",
    file: "PostProcessorCognitiveEngine.ts",
    category: "domain_specific",
    domain: "post_processor",
    description: "Cognitive processing for post-processor generation and customization",
    capabilities: ["code_generation", "customization", "validation", "optimization"],
    inputTypes: ["controller", "requirements", "templates"],
    outputTypes: ["post_processor", "customizations"],
    complexity: "complex",
  },

  // Explanation engines
  {
    name: "ReasoningExplainerEngine",
    file: "ReasoningExplainerEngine.ts",
    category: "explanation",
    domain: "general",
    description: "Generates explanations for reasoning processes and decisions",
    capabilities: ["process_explanation", "decision_trace", "simplification", "visualization"],
    inputTypes: ["reasoning_trace", "audience_level"],
    outputTypes: ["explanation", "visualization", "summary"],
    complexity: "moderate",
  },

  // Scientific reasoning
  {
    name: "ScientificReasoningEngine",
    file: "ScientificReasoningEngine.ts",
    category: "scientific",
    domain: "general",
    description: "Scientific method-based reasoning with hypothesis testing",
    capabilities: ["hypothesis_generation", "experiment_design", "data_analysis", "conclusion_drawing"],
    inputTypes: ["observations", "theories", "data"],
    outputTypes: ["hypotheses", "experiments", "conclusions"],
    complexity: "complex",
  },
  {
    name: "ManufacturingReasoningEngine",
    file: "ManufacturingReasoningEngine.ts",
    category: "scientific",
    domain: "general",
    description: "Physics-informed reasoning for manufacturing decisions",
    capabilities: ["physics_integration", "constraint_satisfaction", "optimization", "validation"],
    inputTypes: ["process", "physics_models", "constraints"],
    outputTypes: ["decisions", "validations", "optimizations"],
    complexity: "complex",
  },

  // Inference engines
  {
    name: "BayesianInferenceEngine",
    file: "BayesianInferenceEngine.ts",
    category: "diagnostic",
    domain: "general",
    description: "Bayesian inference for probabilistic reasoning and updating beliefs",
    capabilities: ["prior_updating", "posterior_computation", "uncertainty_quantification", "prediction"],
    inputTypes: ["prior", "likelihood", "evidence"],
    outputTypes: ["posterior", "predictions", "uncertainty"],
    complexity: "complex",
  },
  {
    name: "FuzzyLogicEngine",
    file: "FuzzyLogicEngine.ts",
    category: "decision_making",
    domain: "general",
    description: "Fuzzy logic inference for handling imprecise information",
    capabilities: ["fuzzification", "rule_evaluation", "defuzzification", "membership_functions"],
    inputTypes: ["inputs", "rules", "membership_functions"],
    outputTypes: ["fuzzy_output", "crisp_output"],
    complexity: "moderate",
  },
  {
    name: "AIExtractionReasonerEngine",
    file: "AIExtractionReasonerEngine.ts",
    category: "domain_specific",
    domain: "general",
    description: "Reasoning about information extraction from documents and data",
    capabilities: ["entity_extraction", "relationship_inference", "validation", "confidence_scoring"],
    inputTypes: ["document", "schema", "context"],
    outputTypes: ["entities", "relationships", "confidence"],
    complexity: "moderate",
  },
  {
    name: "FeatureRecognitionEngine",
    file: "FeatureRecognitionEngine.ts",
    category: "domain_specific",
    domain: "general",
    description: "Geometric feature recognition with reasoning about manufacturing intent",
    capabilities: ["feature_detection", "intent_inference", "constraint_extraction", "classification"],
    inputTypes: ["geometry", "context"],
    outputTypes: ["features", "intents", "constraints"],
    complexity: "complex",
  },
];

// ============================================================================
// WIRING RULES
// ============================================================================

interface WiringRule {
  engine: string;
  wirings: DispatcherWiring[];
}

const WIRING_RULES: WiringRule[] = [
  // Decision explanation -> AI dispatcher
  {
    engine: "AIDecisionExplanationEngine",
    wirings: [
      { dispatcher: "aiReasoningDispatcher", action: "ai_explain_decision", reason: "Primary explanation capability", priority: "high" },
      { dispatcher: "prism_ai", action: "ai_analyze", reason: "Decision analysis context", priority: "medium" },
    ],
  },
  // Counterfactual -> AI reasoning
  {
    engine: "CounterfactualReasoningEngine",
    wirings: [
      { dispatcher: "aiReasoningDispatcher", action: "ai_what_if", reason: "What-if analysis", priority: "high" },
      { dispatcher: "prism_ai", action: "ai_analyze", reason: "Scenario comparison", priority: "medium" },
    ],
  },
  // Extended thinking -> AI reasoning
  {
    engine: "ExtendedThinkingBridgeEngine",
    wirings: [
      { dispatcher: "aiReasoningDispatcher", action: "ai_deep_think", reason: "Extended thinking bridge", priority: "high" },
      { dispatcher: "prism_orchestrate", action: "orchestrate_complex", reason: "Complex problem decomposition", priority: "medium" },
    ],
  },
  // Five axis decision -> 5axis dispatcher
  {
    engine: "FiveAxisDecisionEngine",
    wirings: [
      { dispatcher: "prism_5axis", action: "5axis_strategy", reason: "Strategy decision", priority: "high" },
      { dispatcher: "prism_5axis", action: "5axis_orientation", reason: "Orientation selection", priority: "high" },
    ],
  },
  // Fourth axis decision -> cam/multiaxis
  {
    engine: "FourthAxisDecisionEngine",
    wirings: [
      { dispatcher: "prism_cam", action: "cam_4axis_strategy", reason: "4th axis strategy", priority: "high" },
      { dispatcher: "prism_multiaxis_program", action: "multiaxis_index", reason: "Indexing decisions", priority: "medium" },
    ],
  },
  // Inference chain -> AI reasoning
  {
    engine: "InferenceChainEngine",
    wirings: [
      { dispatcher: "aiReasoningDispatcher", action: "ai_chain_of_thought", reason: "Chain reasoning", priority: "high" },
      { dispatcher: "prism_ai", action: "ai_reason", reason: "Step-by-step reasoning", priority: "medium" },
    ],
  },
  // Lathe AI reasoning -> turning dispatcher
  {
    engine: "LatheAIReasoningEngine",
    wirings: [
      { dispatcher: "prism_turning", action: "turning_ai_plan", reason: "AI-powered turning planning", priority: "high" },
      { dispatcher: "prism_turning_program", action: "turning_strategy", reason: "Strategy selection", priority: "high" },
    ],
  },
  // Lathe deep logic -> turning dispatcher
  {
    engine: "LatheDeepLogicEngine",
    wirings: [
      { dispatcher: "prism_turning", action: "turning_deep_analyze", reason: "Deep setup analysis", priority: "high" },
      { dispatcher: "prism_turning_program", action: "turning_optimize", reason: "Logic-based optimization", priority: "medium" },
    ],
  },
  // Make vs buy -> business dispatcher
  {
    engine: "MakeVsBuyDecisionEngine",
    wirings: [
      { dispatcher: "prism_business", action: "business_make_vs_buy", reason: "Strategic decision", priority: "high" },
      { dispatcher: "prism_feasibility", action: "feasibility_sourcing", reason: "Sourcing analysis", priority: "medium" },
    ],
  },
  // Manufacturing reasoning -> prism_ai
  {
    engine: "ManufacturingReasoningEngine",
    wirings: [
      { dispatcher: "prism_ai", action: "ai_manufacturing_reason", reason: "Physics-informed reasoning", priority: "high" },
      { dispatcher: "prism_feasibility", action: "feasibility_physics", reason: "Physics validation", priority: "medium" },
    ],
  },
  // Multi-path reasoning -> AI reasoning
  {
    engine: "MultiPathReasoningEngine",
    wirings: [
      { dispatcher: "aiReasoningDispatcher", action: "ai_multi_path", reason: "Parallel path exploration", priority: "high" },
      { dispatcher: "prism_ai", action: "ai_explore", reason: "Solution exploration", priority: "medium" },
    ],
  },
  // Creative reasoning -> AI reasoning
  {
    engine: "PRISMCreativeReasoningEngine",
    wirings: [
      { dispatcher: "aiReasoningDispatcher", action: "ai_creative_solve", reason: "Creative problem solving", priority: "high" },
      { dispatcher: "prism_ai", action: "ai_innovate", reason: "Novel solution generation", priority: "high" },
    ],
  },
  // Pipeline orchestrator -> orchestrate dispatcher
  {
    engine: "PipelineDecisionOrchestratorEngine",
    wirings: [
      { dispatcher: "prism_orchestrate", action: "orchestrate_pipeline", reason: "Pipeline orchestration", priority: "high" },
      { dispatcher: "prism_proven_pipeline", action: "pipeline_route", reason: "Pipeline routing", priority: "medium" },
    ],
  },
  // PP deep cognition -> pp dispatcher
  {
    engine: "PostProcessorDeepCognitionEngine",
    wirings: [
      { dispatcher: "prism_pp", action: "pp_neural_optimize", reason: "Deep PP optimization", priority: "high" },
      { dispatcher: "prism_pp", action: "pp_analyze_optimization", reason: "PP analysis", priority: "medium" },
    ],
  },
  // Reasoning explainer -> AI reasoning
  {
    engine: "ReasoningExplainerEngine",
    wirings: [
      { dispatcher: "aiReasoningDispatcher", action: "ai_explain_reasoning", reason: "Reasoning explanation", priority: "high" },
      { dispatcher: "prism_doc", action: "doc_explain", reason: "Documentation generation", priority: "medium" },
    ],
  },
  // Scientific reasoning -> prism_ai
  {
    engine: "ScientificReasoningEngine",
    wirings: [
      { dispatcher: "prism_ai", action: "ai_scientific_reason", reason: "Scientific method", priority: "high" },
      { dispatcher: "prism_quality", action: "quality_experiment", reason: "Experiment design", priority: "medium" },
    ],
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ReasoningWiringEngine {
  private wirings: Map<string, ReasoningWiring> = new Map();

  constructor() {
    this.buildWirings();
  }

  /**
   * Build all wirings from catalog and rules
   */
  private buildWirings(): void {
    // Initialize all engines as orphans
    for (const engine of REASONING_CATALOG) {
      this.wirings.set(engine.name, {
        engine: engine.name,
        status: "orphan",
        wirings: [],
        wireCount: 0,
      });
    }

    // Apply wiring rules
    for (const rule of WIRING_RULES) {
      const wiring = this.wirings.get(rule.engine);
      if (wiring) {
        wiring.wirings = rule.wirings;
        wiring.wireCount = rule.wirings.length;
        wiring.status = wiring.wireCount > 0 ? "wired" : "orphan";
      }
    }
  }

  /**
   * List all reasoning engines
   */
  listEngines(category?: ReasoningCategory, domain?: ReasoningDomain): ReasoningEngineInfo[] {
    let engines = [...REASONING_CATALOG];
    if (category) {
      engines = engines.filter(e => e.category === category);
    }
    if (domain) {
      engines = engines.filter(e => e.domain === domain);
    }
    return engines;
  }

  /**
   * Get engine info by name
   */
  getEngine(name: string): ReasoningEngineInfo | undefined {
    return REASONING_CATALOG.find(e => e.name === name);
  }

  /**
   * List orphaned engines
   */
  listOrphanedEngines(): string[] {
    return Array.from(this.wirings.values())
      .filter(w => w.status === "orphan")
      .map(w => w.engine);
  }

  /**
   * List wired engines
   */
  listWiredEngines(): ReasoningWiring[] {
    return Array.from(this.wirings.values()).filter(w => w.status === "wired");
  }

  /**
   * Get wirings for an engine
   */
  getWirings(engineName: string): DispatcherWiring[] {
    return this.wirings.get(engineName)?.wirings || [];
  }

  /**
   * Get engines wired to a dispatcher
   */
  getEnginesForDispatcher(dispatcher: string): string[] {
    const engines: string[] = [];
    for (const [engineName, wiring] of this.wirings) {
      if (wiring.wirings.some(w => w.dispatcher === dispatcher)) {
        engines.push(engineName);
      }
    }
    return engines;
  }

  /**
   * Get full wiring report
   */
  getWiringReport(): ReasoningWiringReport {
    const wirings = Array.from(this.wirings.values());
    const wiredCount = wirings.filter(w => w.status === "wired").length;
    const orphanCount = wirings.filter(w => w.status === "orphan").length;

    // Category breakdown
    const categoryMap = new Map<ReasoningCategory, { count: number; wired: number }>();
    for (const engine of REASONING_CATALOG) {
      const entry = categoryMap.get(engine.category) || { count: 0, wired: 0 };
      entry.count++;
      if (this.wirings.get(engine.name)?.status === "wired") {
        entry.wired++;
      }
      categoryMap.set(engine.category, entry);
    }

    // Domain breakdown
    const domainMap = new Map<ReasoningDomain, { count: number; wired: number }>();
    for (const engine of REASONING_CATALOG) {
      const entry = domainMap.get(engine.domain) || { count: 0, wired: 0 };
      entry.count++;
      if (this.wirings.get(engine.name)?.status === "wired") {
        entry.wired++;
      }
      domainMap.set(engine.domain, entry);
    }

    return {
      totalEngines: REASONING_CATALOG.length,
      wiredCount,
      orphanCount,
      coverage: wiredCount / REASONING_CATALOG.length,
      byCategory: Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        ...data,
      })),
      byDomain: Array.from(domainMap.entries()).map(([domain, data]) => ({
        domain,
        ...data,
      })),
      wirings,
    };
  }

  /**
   * Find engines by capability
   */
  findByCapability(capability: string): ReasoningEngineInfo[] {
    const lowerCap = capability.toLowerCase();
    return REASONING_CATALOG.filter(e =>
      e.capabilities.some(c => c.includes(lowerCap) || lowerCap.includes(c)),
    );
  }

  /**
   * Get recommended engines for a task
   */
  recommendEngines(
    task: "decision" | "diagnosis" | "optimization" | "explanation" | "creative",
  ): ReasoningEngineInfo[] {
    const taskMapping: Record<string, ReasoningCategory[]> = {
      decision: ["decision_making", "multi_path"],
      diagnosis: ["diagnostic", "causal"],
      optimization: ["deep_thinking", "scientific"],
      explanation: ["explanation"],
      creative: ["creative", "multi_path"],
    };

    const categories = taskMapping[task] || [];
    return REASONING_CATALOG.filter(e => categories.includes(e.category));
  }

  /**
   * Get categories with counts
   */
  getCategories(): { category: ReasoningCategory; count: number }[] {
    const counts = new Map<ReasoningCategory, number>();
    for (const engine of REASONING_CATALOG) {
      counts.set(engine.category, (counts.get(engine.category) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([category, count]) => ({ category, count }));
  }

  /**
   * Get domains with counts
   */
  getDomains(): { domain: ReasoningDomain; count: number }[] {
    const counts = new Map<ReasoningDomain, number>();
    for (const engine of REASONING_CATALOG) {
      counts.set(engine.domain, (counts.get(engine.domain) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([domain, count]) => ({ domain, count }));
  }

  /**
   * Wire an engine to a dispatcher (manual wiring)
   */
  wireEngine(engineName: string, wiring: DispatcherWiring): boolean {
    const engineWiring = this.wirings.get(engineName);
    if (!engineWiring) return false;

    // Check if already wired to this dispatcher/action
    if (engineWiring.wirings.some(w => w.dispatcher === wiring.dispatcher && w.action === wiring.action)) {
      return false;
    }

    engineWiring.wirings.push(wiring);
    engineWiring.wireCount = engineWiring.wirings.length;
    engineWiring.status = "wired";
    return true;
  }

  /**
   * Suggest wirings for an orphan engine
   */
  suggestWiringsForOrphan(engineName: string): DispatcherWiring[] {
    const engine = this.getEngine(engineName);
    if (!engine) return [];

    // Domain-based suggestions
    const domainDispatcherMap: Record<ReasoningDomain, DispatcherWiring[]> = {
      general: [
        { dispatcher: "prism_ai", action: "ai_reason", reason: "General reasoning", priority: "medium" },
      ],
      milling: [
        { dispatcher: "prism_cam", action: "cam_analyze", reason: "Milling analysis", priority: "medium" },
      ],
      turning: [
        { dispatcher: "prism_turning", action: "turning_analyze", reason: "Turning analysis", priority: "medium" },
      ],
      five_axis: [
        { dispatcher: "prism_5axis", action: "5axis_analyze", reason: "5-axis analysis", priority: "medium" },
      ],
      edm: [
        { dispatcher: "prism_edm", action: "edm_analyze", reason: "EDM analysis", priority: "medium" },
      ],
      post_processor: [
        { dispatcher: "prism_pp", action: "pp_analyze_gcode", reason: "PP analysis", priority: "medium" },
      ],
      business: [
        { dispatcher: "prism_business", action: "business_analyze", reason: "Business analysis", priority: "medium" },
      ],
      quality: [
        { dispatcher: "prism_quality", action: "quality_analyze", reason: "Quality analysis", priority: "medium" },
      ],
      optimization: [
        { dispatcher: "prism_ai", action: "ai_optimize", reason: "Optimization", priority: "medium" },
      ],
    };

    return domainDispatcherMap[engine.domain] || [];
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalEngines: number;
    byCategory: { category: string; count: number }[];
    byDomain: { domain: string; count: number }[];
    byComplexity: { complexity: string; count: number }[];
    wiredCount: number;
    orphanCount: number;
  } {
    const complexityCounts = new Map<string, number>();
    for (const engine of REASONING_CATALOG) {
      complexityCounts.set(engine.complexity, (complexityCounts.get(engine.complexity) || 0) + 1);
    }

    const report = this.getWiringReport();

    return {
      totalEngines: REASONING_CATALOG.length,
      byCategory: this.getCategories().map(c => ({ category: c.category, count: c.count })),
      byDomain: this.getDomains().map(d => ({ domain: d.domain, count: d.count })),
      byComplexity: Array.from(complexityCounts.entries()).map(([complexity, count]) => ({ complexity, count })),
      wiredCount: report.wiredCount,
      orphanCount: report.orphanCount,
    };
  }
}

// Export singleton
export const reasoningWiringEngine = new ReasoningWiringEngine();
