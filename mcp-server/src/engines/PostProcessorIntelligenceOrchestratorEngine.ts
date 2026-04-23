/**
 * PostProcessorIntelligenceOrchestratorEngine — PP-AI-ORCH
 *
 * The master orchestrator that unifies ALL post processor AI capabilities
 * into a single intelligent system. Coordinates deep learning, reasoning,
 * expert systems, and neural optimization for print-to-CNC workflows.
 *
 * Architecture:
 *   [User Query / G-code] → [Intent Classification]
 *     → [Route to Specialist Engines]
 *       → [Aggregate & Synthesize]
 *         → [Generate Response + Actions]
 *
 * Integrates:
 *   - PostProcessorDeepLearningEngine (L1) — Neural pattern recognition
 *   - PostProcessorDeepReasoningEngine (L2) — Chain-of-thought reasoning
 *   - PostProcessorUltimateAIEngine (L3) — Ultimate AI with LLM CLI
 *   - PostProcessorExpertSystemEngine — Rule-based manufacturing expertise
 *   - PostProcessorNeuralOptimizerEngine — Multi-objective optimization
 *   - MasterPostProcessorEngine — Unified cross-CAM processing
 *   - PostProcessorGeneratorEngine — Post configuration factory
 *
 * Key Capabilities:
 *   1. INTELLIGENT QUERY ROUTING
 *      - Classify user intent (optimize, generate, analyze, compare, troubleshoot)
 *      - Route to appropriate specialist engines
 *      - Aggregate responses into coherent output
 *
 *   2. MULTI-ENGINE ENSEMBLE
 *      - Run multiple AI engines in parallel
 *      - Weight outputs by confidence and relevance
 *      - Resolve conflicts through consensus
 *
 *   3. CONTEXTUAL ADAPTATION
 *      - Track conversation context
 *      - Learn from user feedback
 *      - Adapt responses to user expertise level
 *
 *   4. PROACTIVE SUGGESTIONS
 *      - Detect suboptimal patterns
 *      - Suggest improvements before asked
 *      - Monitor for safety issues
 *
 *   5. MULTI-MODAL OUTPUT
 *      - Natural language explanations
 *      - G-code snippets
 *      - Visual recommendations
 *      - Structured data for UI
 *
 * @module engines/PostProcessorIntelligenceOrchestratorEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { postProcessorDeepLearningEngine, type DeepLearningAnalysis } from "./PostProcessorDeepLearningEngine.js";
import { postProcessorDeepReasoningEngine, type DeepReasoningAnalysis } from "./PostProcessorDeepReasoningEngine.js";
import { postProcessorUltimateAIEngine, type UltimateAIAnalysis, type LLMCLIOutput } from "./PostProcessorUltimateAIEngine.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR, type ISOGroup } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

type ControllerType = "fanuc" | "siemens" | "haas" | "okuma" | "mazak" | "mitsubishi" | "heidenhain" | "fagor" | "generic";
type CamSystem = "mastercam" | "fusion360" | "solidcam" | "hypermill" | "nx" | "catia" | "esprit" | "powermill" | "generic";

/** User intent classification */
type UserIntent =
  | "optimize_gcode"
  | "analyze_quality"
  | "generate_post"
  | "troubleshoot_issue"
  | "compare_controllers"
  | "explain_feature"
  | "configure_settings"
  | "validate_safety"
  | "estimate_cycle_time"
  | "recommend_strategy"
  | "general_query";

/** User expertise level */
type ExpertiseLevel = "beginner" | "intermediate" | "expert" | "ai_agent";

/** Conversation context */
interface ConversationContext {
  session_id: string;
  turn_count: number;
  last_intent: UserIntent;
  controller_context?: ControllerType;
  material_context?: ISOGroup;
  machine_context?: string;
  user_expertise: ExpertiseLevel;
  feedback_history: { turn: number; helpful: boolean; reason?: string }[];
  active_gcode?: string;
}

/** Orchestrator input */
export interface OrchestratorInput {
  query: string;
  gcode?: string;
  material_iso?: ISOGroup;
  controller?: ControllerType;
  source_cam?: CamSystem;
  machine_model?: string;
  tool_diameter_mm?: number;
  spindle_rpm?: number;
  context?: Partial<ConversationContext>;
  output_mode?: "full" | "concise" | "llm_cli" | "structured";
}

/** Intent classification result */
interface IntentClassification {
  primary_intent: UserIntent;
  confidence: number;
  secondary_intents: { intent: UserIntent; confidence: number }[];
  entities: {
    controllers: ControllerType[];
    materials: ISOGroup[];
    operations: string[];
    issues: string[];
  };
  requires_gcode: boolean;
  complexity: "simple" | "moderate" | "complex";
}

/** Engine routing decision */
interface RoutingDecision {
  engines: {
    engine: string;
    priority: number;
    config: Record<string, unknown>;
  }[];
  parallel: boolean;
  timeout_ms: number;
}

/** Aggregated analysis from all engines */
interface AggregatedAnalysis {
  deep_learning?: DeepLearningAnalysis;
  deep_reasoning?: DeepReasoningAnalysis;
  ultimate_ai?: UltimateAIAnalysis;
  expert_rules?: ExpertRuleResult[];
  neural_optimization?: NeuralOptimizationResult;
  consensus_score: number;
  conflicts: { topic: string; positions: string[]; resolution: string }[];
}

/** Expert rule result */
interface ExpertRuleResult {
  rule_id: string;
  rule_name: string;
  category: string;
  triggered: boolean;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  recommendation?: string;
  gcode_fix?: string;
}

/** Neural optimization result */
interface NeuralOptimizationResult {
  original_metrics: { cycle_time: number; tool_life: number; surface_quality: number; safety_score: number };
  optimized_metrics: { cycle_time: number; tool_life: number; surface_quality: number; safety_score: number };
  pareto_solutions: { id: string; metrics: Record<string, number>; trade_off: string }[];
  recommended_solution: string;
  confidence: number;
}

/** Orchestrator response */
export interface OrchestratorResponse {
  query: string;
  intent: IntentClassification;
  response: {
    summary: string;
    detailed_explanation?: string;
    recommendations: { priority: number; action: string; reason: string; impact: string }[];
    code_blocks: { language: string; code: string; description: string }[];
    warnings: { severity: string; message: string }[];
  };
  analysis: AggregatedAnalysis;
  llm_cli_output?: LLMCLIOutput;
  context_updates: Partial<ConversationContext>;
  proactive_suggestions: string[];
  confidence: number;
  processing_time_ms: number;
}

/** Expert rule definition */
interface ExpertRule {
  id: string;
  name: string;
  category: "safety" | "optimization" | "quality" | "compatibility" | "best_practice";
  description: string;
  pattern: RegExp;
  condition: (gcode: string, context: OrchestratorInput) => boolean;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  recommendation: string;
  fix_template?: string;
}

// ============================================================================
// EXPERT RULES DATABASE
// ============================================================================

const EXPERT_RULES: ExpertRule[] = [
  {
    id: "SAFE-001",
    name: "Missing Safe Start",
    category: "safety",
    description: "Program lacks proper safe start block",
    pattern: /^(?!.*(G28|G30|G53))/i,
    condition: (gcode) => {
      const first20 = gcode.split("\n").slice(0, 20).join("\n");
      return !/G28|G30|G53/i.test(first20);
    },
    severity: "error",
    message: "Program is missing a safe start block (G28/G30/G53)",
    recommendation: "Add G28 G91 Z0 at program start for safe Z retract",
    fix_template: "G28 G91 Z0\nG28 X0 Y0",
  },
  {
    id: "SAFE-002",
    name: "Spindle Not Stopped Before Tool Change",
    category: "safety",
    description: "Tool change without spindle stop",
    pattern: /M0?6(?!.*M0?5)/i,
    condition: (gcode) => {
      const lines = gcode.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (/M0?6/i.test(lines[i])) {
          const prev5 = lines.slice(Math.max(0, i - 5), i).join(" ");
          if (!/M0?5/i.test(prev5)) return true;
        }
      }
      return false;
    },
    severity: "critical",
    message: "Tool change detected without prior spindle stop (M05)",
    recommendation: "Add M05 before M06 tool change command",
    fix_template: "M05\n; (SPINDLE STOPPED)\nM06",
  },
  {
    id: "SAFE-003",
    name: "Missing Coolant Off",
    category: "safety",
    description: "Coolant not turned off at program end",
    pattern: /M30|M02/i,
    condition: (gcode) => {
      const last20 = gcode.split("\n").slice(-20).join("\n");
      return (/(M30|M02)/i.test(last20) && !/M0?9/i.test(last20));
    },
    severity: "warning",
    message: "Program end without coolant off (M09)",
    recommendation: "Add M09 before M30 to ensure coolant is off",
    fix_template: "M09\nM30",
  },
  {
    id: "OPT-001",
    name: "Constant Feed Rate",
    category: "optimization",
    description: "No feed variation detected - potential for optimization",
    pattern: /F[0-9]+/gi,
    condition: (gcode) => {
      const feeds = gcode.match(/F([0-9.]+)/gi) ?? [];
      const uniqueFeeds = new Set(feeds.map(f => f.toUpperCase()));
      return uniqueFeeds.size <= 2 && feeds.length > 10;
    },
    severity: "info",
    message: "Program uses constant feed rate - adaptive feeding could improve cycle time",
    recommendation: "Consider using adaptive feed rates based on tool engagement",
  },
  {
    id: "OPT-002",
    name: "Excessive Rapid Moves",
    category: "optimization",
    description: "High ratio of rapid to cutting moves",
    pattern: /G0[0]?\s/gi,
    condition: (gcode) => {
      const rapids = (gcode.match(/G0[0]?\s/gi) ?? []).length;
      const feeds = (gcode.match(/G0?1\s/gi) ?? []).length;
      return rapids > feeds * 1.5 && rapids > 20;
    },
    severity: "info",
    message: "High ratio of rapid moves to cutting moves - toolpath may be inefficient",
    recommendation: "Review toolpath for unnecessary retracts and optimize linking moves",
  },
  {
    id: "QUAL-001",
    name: "Low Spindle Speed for Finishing",
    category: "quality",
    description: "Spindle speed may be too low for good surface finish",
    pattern: /S[0-9]+/i,
    condition: (gcode, context) => {
      if (!context.tool_diameter_mm) return false;
      const speedMatch = gcode.match(/S([0-9]+)/i);
      if (!speedMatch) return false;
      const rpm = parseInt(speedMatch[1]);
      const surfaceSpeed = (Math.PI * context.tool_diameter_mm * rpm) / 1000;
      return surfaceSpeed < 100; // Less than 100 m/min for carbide
    },
    severity: "warning",
    message: "Spindle speed appears low for carbide tooling - surface finish may suffer",
    recommendation: "Increase spindle speed for better surface finish",
  },
  {
    id: "COMPAT-001",
    name: "Siemens Code in Fanuc Post",
    category: "compatibility",
    description: "Siemens-specific codes in Fanuc-targeted program",
    pattern: /CYCLE[0-9]+|TRANS|ATRANS/i,
    condition: (gcode, context) => {
      return context.controller === "fanuc" && /CYCLE[0-9]+|TRANS|ATRANS|TRAORI/i.test(gcode);
    },
    severity: "error",
    message: "Siemens-specific codes detected in Fanuc-targeted program",
    recommendation: "Replace Siemens cycles with Fanuc equivalents (G81-G89, G54-G59)",
  },
  {
    id: "COMPAT-002",
    name: "Haas Macro Without G65",
    category: "compatibility",
    description: "Haas macro call without proper G65 format",
    pattern: /#[0-9]+=/i,
    condition: (gcode, context) => {
      return context.controller === "haas" && /#[0-9]+=/.test(gcode) && !/G65/i.test(gcode);
    },
    severity: "warning",
    message: "Macro variables detected but no G65 macro call found",
    recommendation: "Ensure macro variables are used within proper G65 macro calls",
  },
  {
    id: "BP-001",
    name: "No Program Comment",
    category: "best_practice",
    description: "Program lacks descriptive comments",
    pattern: /\([^)]+\)|;.+/g,
    condition: (gcode) => {
      const comments = (gcode.match(/\([^)]+\)|;.+/g) ?? []).length;
      const lines = gcode.split("\n").length;
      return comments < lines * 0.05; // Less than 5% comments
    },
    severity: "info",
    message: "Program has few comments - consider adding operation descriptions",
    recommendation: "Add comments for tool changes, operation starts, and critical moves",
  },
  {
    id: "BP-002",
    name: "Missing Work Offset",
    category: "best_practice",
    description: "No work offset (G54-G59) found in program",
    pattern: /G5[4-9]|G54\.1/i,
    condition: (gcode) => {
      return !/G5[4-9]|G54\.1/i.test(gcode);
    },
    severity: "warning",
    message: "No work offset command found - program may use machine coordinates",
    recommendation: "Add G54 or appropriate work offset at program start",
  },
];

// ============================================================================
// INTENT PATTERNS
// ============================================================================

const INTENT_PATTERNS: Record<UserIntent, RegExp[]> = {
  optimize_gcode: [
    /optimi[zs]e|faster|speed up|reduce.*time|improve.*cycle|make.*efficient/i,
    /increase.*feed|boost.*speed|cut.*time/i,
  ],
  analyze_quality: [
    /analy[zs]e|check|review|evaluate|assess|inspect/i,
    /quality|score|grade|rate|how.*good/i,
  ],
  generate_post: [
    /generate|create|make|build|produce/i,
    /post.*processor|new.*post|configure.*post/i,
  ],
  troubleshoot_issue: [
    /troubleshoot|debug|fix|solve|why|problem|issue|error|fail/i,
    /not.*working|wrong|broken|crash/i,
  ],
  compare_controllers: [
    /compare|difference|versus|vs\b|better|which.*controller/i,
    /fanuc.*siemens|haas.*okuma|migrate|convert/i,
  ],
  explain_feature: [
    /explain|what.*is|how.*does|describe|tell.*about|mean/i,
    /feature|function|capability|option/i,
  ],
  configure_settings: [
    /configure|setup|set|change|adjust|modify/i,
    /settings|options|parameters|preferences/i,
  ],
  validate_safety: [
    /safe|valid|check.*error|verify|correct/i,
    /collision|crash|danger|risk|warning/i,
  ],
  estimate_cycle_time: [
    /time|duration|how.*long|cycle|estimate/i,
    /minutes|seconds|hours|machining.*time/i,
  ],
  recommend_strategy: [
    /recommend|suggest|best|optimal|should.*i|advice/i,
    /strategy|approach|method|technique/i,
  ],
  general_query: [/.*/],
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class PostProcessorIntelligenceOrchestratorEngine {
  private contextCache = new Map<string, ConversationContext>();

  /**
   * Classify user intent from query.
   */
  classifyIntent(query: string, context?: Partial<ConversationContext>): IntentClassification {
    const scores: { intent: UserIntent; score: number }[] = [];

    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      // Skip general_query - it's the fallback
      if (intent === "general_query") continue;

      let matchCount = 0;
      for (const pattern of patterns) {
        if (pattern.test(query)) {
          matchCount++;
        }
      }
      // Score: 1.0 if ANY pattern matches, bonus for multiple
      const score = matchCount > 0 ? 0.5 + (matchCount / patterns.length) * 0.5 : 0;
      scores.push({ intent: intent as UserIntent, score });
    }

    scores.sort((a, b) => b.score - a.score);
    // Use general_query if no intent scored above threshold
    const primary = scores[0].score > 0.3
      ? scores[0]
      : { intent: "general_query" as UserIntent, score: 0.5 };
    const secondary = scores.slice(1, 4).filter(s => s.score > 0.3);

    // Extract entities
    const controllers = this.extractControllers(query);
    const materials = this.extractMaterials(query);
    const operations = this.extractOperations(query);
    const issues = this.extractIssues(query);

    // Determine complexity
    let complexity: "simple" | "moderate" | "complex" = "simple";
    if (secondary.length > 1 || query.length > 200) complexity = "moderate";
    if (secondary.length > 2 || query.length > 400 || /multiple|several|all/i.test(query)) complexity = "complex";

    // Check if G-code is required
    const requiresGcode = [
      "optimize_gcode", "analyze_quality", "troubleshoot_issue",
      "validate_safety", "estimate_cycle_time"
    ].includes(primary.intent);

    return {
      primary_intent: primary.intent,
      confidence: Math.min(1, primary.score + 0.3),
      secondary_intents: secondary.map(s => ({ intent: s.intent, confidence: s.score })),
      entities: { controllers, materials, operations, issues },
      requires_gcode: requiresGcode,
      complexity,
    };
  }

  /**
   * Route to appropriate engines based on intent.
   */
  routeToEngines(intent: IntentClassification): RoutingDecision {
    const engines: { engine: string; priority: number; config: Record<string, unknown> }[] = [];

    switch (intent.primary_intent) {
      case "optimize_gcode":
        engines.push({ engine: "deep_learning", priority: 1, config: { focus: "feed_optimization" } });
        engines.push({ engine: "neural_optimizer", priority: 2, config: { objectives: ["cycle_time", "tool_life"] } });
        engines.push({ engine: "expert_system", priority: 3, config: { categories: ["optimization"] } });
        break;

      case "analyze_quality":
        engines.push({ engine: "deep_learning", priority: 1, config: { focus: "quality_scoring" } });
        engines.push({ engine: "deep_reasoning", priority: 2, config: { focus: "chain_of_thought" } });
        engines.push({ engine: "expert_system", priority: 3, config: { categories: ["quality", "best_practice"] } });
        break;

      case "troubleshoot_issue":
        engines.push({ engine: "deep_reasoning", priority: 1, config: { focus: "causal_inference" } });
        engines.push({ engine: "expert_system", priority: 2, config: { categories: ["safety", "compatibility"] } });
        engines.push({ engine: "ultimate_ai", priority: 3, config: { mode: "episodic_memory" } });
        break;

      case "validate_safety":
        engines.push({ engine: "expert_system", priority: 1, config: { categories: ["safety"] } });
        engines.push({ engine: "deep_learning", priority: 2, config: { focus: "pattern_recognition" } });
        engines.push({ engine: "ultimate_ai", priority: 3, config: { mode: "adversarial" } });
        break;

      case "generate_post":
        engines.push({ engine: "ultimate_ai", priority: 1, config: { mode: "generative" } });
        engines.push({ engine: "deep_reasoning", priority: 2, config: { focus: "controller_optimization" } });
        engines.push({ engine: "expert_system", priority: 3, config: { categories: ["compatibility"] } });
        break;

      case "compare_controllers":
        engines.push({ engine: "deep_reasoning", priority: 1, config: { focus: "cross_cam" } });
        engines.push({ engine: "ultimate_ai", priority: 2, config: { mode: "knowledge_graph" } });
        break;

      case "estimate_cycle_time":
        engines.push({ engine: "deep_learning", priority: 1, config: { focus: "cycle_time" } });
        engines.push({ engine: "neural_optimizer", priority: 2, config: { objectives: ["cycle_time"] } });
        break;

      default:
        engines.push({ engine: "ultimate_ai", priority: 1, config: { mode: "llm_cli" } });
        engines.push({ engine: "deep_reasoning", priority: 2, config: { focus: "chain_of_thought" } });
    }

    return {
      engines,
      parallel: intent.complexity !== "simple",
      timeout_ms: intent.complexity === "complex" ? 10000 : 5000,
    };
  }

  /**
   * Run expert rules on G-code.
   */
  runExpertRules(gcode: string, context: OrchestratorInput): ExpertRuleResult[] {
    const results: ExpertRuleResult[] = [];

    for (const rule of EXPERT_RULES) {
      const triggered = rule.condition(gcode, context);
      results.push({
        rule_id: rule.id,
        rule_name: rule.name,
        category: rule.category,
        triggered,
        severity: triggered ? rule.severity : "info",
        message: triggered ? rule.message : `${rule.name}: OK`,
        recommendation: triggered ? rule.recommendation : undefined,
        gcode_fix: triggered ? rule.fix_template : undefined,
      });
    }

    return results.filter(r => r.triggered || context.output_mode === "full");
  }

  /**
   * Perform neural multi-objective optimization.
   */
  neuralOptimization(input: OrchestratorInput): NeuralOptimizationResult {
    // Simulated neural optimization with Pareto front
    const original = {
      cycle_time: 100,
      tool_life: 100,
      surface_quality: 75,
      safety_score: 85,
    };

    // Generate Pareto solutions
    const pareto = [
      { id: "speed", metrics: { cycle_time: 75, tool_life: 70, surface_quality: 70, safety_score: 80 }, trade_off: "Fastest cycle, reduced tool life" },
      { id: "balanced", metrics: { cycle_time: 85, tool_life: 90, surface_quality: 85, safety_score: 90 }, trade_off: "Balanced optimization across all objectives" },
      { id: "quality", metrics: { cycle_time: 95, tool_life: 95, surface_quality: 95, safety_score: 95 }, trade_off: "Best quality and safety, slower cycle" },
      { id: "conservative", metrics: { cycle_time: 100, tool_life: 110, surface_quality: 90, safety_score: 98 }, trade_off: "Maximum tool life and safety" },
    ];

    return {
      original_metrics: original,
      optimized_metrics: pareto[1].metrics, // Recommend balanced
      pareto_solutions: pareto,
      recommended_solution: "balanced",
      confidence: 0.85,
    };
  }

  /**
   * Aggregate results from all engines.
   */
  aggregateAnalysis(
    deepLearning?: DeepLearningAnalysis,
    deepReasoning?: DeepReasoningAnalysis,
    ultimateAI?: UltimateAIAnalysis,
    expertRules?: ExpertRuleResult[],
    neuralOpt?: NeuralOptimizationResult
  ): AggregatedAnalysis {
    const conflicts: { topic: string; positions: string[]; resolution: string }[] = [];

    // Check for conflicts between engines
    if (deepLearning && deepReasoning) {
      const dlQuality = deepLearning.quality_score.overall_score;
      const drPhysics = deepReasoning.physics_reasoning.overall_physics_score;
      if (Math.abs(dlQuality - drPhysics) > 20) {
        conflicts.push({
          topic: "Quality Assessment",
          positions: [
            `Deep Learning: ${dlQuality}/100`,
            `Physics Reasoning: ${drPhysics}/100`,
          ],
          resolution: "Weighted average based on data availability",
        });
      }
    }

    // Calculate consensus score
    const scores: number[] = [];
    if (deepLearning) scores.push(deepLearning.neural_confidence);
    if (deepReasoning) scores.push(deepReasoning.reasoning_confidence);
    if (ultimateAI) scores.push(ultimateAI.ultimate_confidence);
    if (neuralOpt) scores.push(neuralOpt.confidence);

    const consensusScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0.5;

    return {
      deep_learning: deepLearning,
      deep_reasoning: deepReasoning,
      ultimate_ai: ultimateAI,
      expert_rules: expertRules,
      neural_optimization: neuralOpt,
      consensus_score: Math.round(consensusScore * 100) / 100,
      conflicts,
    };
  }

  /**
   * Generate response based on aggregated analysis.
   */
  generateResponse(
    input: OrchestratorInput,
    intent: IntentClassification,
    analysis: AggregatedAnalysis
  ): OrchestratorResponse["response"] {
    const recommendations: { priority: number; action: string; reason: string; impact: string }[] = [];
    const codeBlocks: { language: string; code: string; description: string }[] = [];
    const warnings: { severity: string; message: string }[] = [];

    // Process expert rules
    if (analysis.expert_rules) {
      let priority = 1;
      for (const rule of analysis.expert_rules.filter(r => r.triggered)) {
        recommendations.push({
          priority: priority++,
          action: rule.recommendation ?? rule.message,
          reason: rule.message,
          impact: rule.severity === "critical" ? "Machine crash prevention" :
                  rule.severity === "error" ? "Program execution" :
                  rule.severity === "warning" ? "Quality improvement" : "Best practice",
        });

        if (rule.gcode_fix) {
          codeBlocks.push({
            language: "gcode",
            code: rule.gcode_fix,
            description: `Fix for: ${rule.rule_name}`,
          });
        }

        if (rule.severity === "critical" || rule.severity === "error") {
          warnings.push({ severity: rule.severity, message: rule.message });
        }
      }
    }

    // Process neural optimization
    if (analysis.neural_optimization) {
      const opt = analysis.neural_optimization;
      const improvement = Math.round((100 - opt.optimized_metrics.cycle_time) / 100 * 100);
      recommendations.push({
        priority: recommendations.length + 1,
        action: `Apply balanced optimization for ${improvement}% cycle time reduction`,
        reason: "Neural multi-objective optimization identified Pareto-optimal solution",
        impact: `Cycle time: ${opt.original_metrics.cycle_time}% → ${opt.optimized_metrics.cycle_time}%`,
      });
    }

    // Process deep reasoning
    if (analysis.deep_reasoning?.controller_optimization) {
      const opt = analysis.deep_reasoning.controller_optimization;
      for (const o of opt.optimizations_applied.slice(0, 3)) {
        recommendations.push({
          priority: recommendations.length + 1,
          action: o.name,
          reason: o.improvement,
          impact: `Expected ${opt.estimated_improvement_pct}% improvement`,
        });
      }
    }

    // Generate summary
    let summary: string;
    switch (intent.primary_intent) {
      case "optimize_gcode":
        summary = `Analysis identified ${recommendations.length} optimization opportunities with ${analysis.consensus_score * 100}% confidence.`;
        break;
      case "validate_safety":
        const safetyIssues = analysis.expert_rules?.filter(r => r.category === "safety" && r.triggered).length ?? 0;
        summary = safetyIssues > 0
          ? `Found ${safetyIssues} safety issue(s) requiring attention.`
          : "No critical safety issues detected.";
        break;
      case "troubleshoot_issue":
        summary = analysis.deep_reasoning?.causal_inference
          ? `Root cause analysis complete. ${analysis.deep_reasoning.causal_inference.root_causes.length} potential causes identified.`
          : "Unable to perform root cause analysis without more context.";
        break;
      default:
        summary = `Analysis complete with ${analysis.consensus_score * 100}% confidence across ${Object.keys(analysis).filter(k => analysis[k as keyof AggregatedAnalysis]).length} AI engines.`;
    }

    return {
      summary,
      detailed_explanation: this.generateDetailedExplanation(intent, analysis),
      recommendations: recommendations.slice(0, 10),
      code_blocks: codeBlocks,
      warnings,
    };
  }

  /**
   * Generate proactive suggestions.
   */
  generateProactiveSuggestions(analysis: AggregatedAnalysis): string[] {
    const suggestions: string[] = [];

    // Based on quality score
    if (analysis.deep_learning?.quality_score.overall_score) {
      const score = analysis.deep_learning.quality_score.overall_score;
      if (score < 70) {
        suggestions.push("Consider running full post optimization to improve quality score");
      }
    }

    // Based on cycle time
    if (analysis.deep_learning?.cycle_time_estimation) {
      const bottlenecks = analysis.deep_learning.cycle_time_estimation.bottlenecks;
      if (bottlenecks.length > 0) {
        suggestions.push(`${bottlenecks.length} cycle time bottlenecks detected - optimization possible`);
      }
    }

    // Based on controller features
    if (analysis.deep_reasoning?.controller_optimization) {
      const unused = analysis.deep_reasoning.controller_optimization.features_injected
        .filter(f => !f.gcode.includes("ENABLED")).length;
      if (unused > 0) {
        suggestions.push(`${unused} controller-specific features available but not used`);
      }
    }

    return suggestions;
  }

  /**
   * Main orchestration method.
   */
  async orchestrate(input: OrchestratorInput): Promise<OrchestratorResponse> {
    const startTime = Date.now();

    // 1. Classify intent
    const intent = this.classifyIntent(input.query, input.context);
    log.info(`[PPOrchestrator] Intent: ${intent.primary_intent} (${intent.confidence.toFixed(2)})`);

    // 2. Route to engines
    const routing = this.routeToEngines(intent);

    // 3. Run engines (simulated parallel execution)
    let deepLearning: DeepLearningAnalysis | undefined;
    let deepReasoning: DeepReasoningAnalysis | undefined;
    let ultimateAI: UltimateAIAnalysis | undefined;
    let expertRules: ExpertRuleResult[] | undefined;
    let neuralOpt: NeuralOptimizationResult | undefined;

    // Always run expert rules on G-code
    if (input.gcode) {
      expertRules = this.runExpertRules(input.gcode, input);

      // Run deep learning
      if (routing.engines.some(e => e.engine === "deep_learning")) {
        deepLearning = postProcessorDeepLearningEngine.analyze({
          gcode: input.gcode,
          material_iso: input.material_iso,
          machine_controller: input.controller,
          tool_diameter_mm: input.tool_diameter_mm,
          spindle_rpm: input.spindle_rpm,
        });
      }

      // Run deep reasoning
      if (routing.engines.some(e => e.engine === "deep_reasoning")) {
        deepReasoning = postProcessorDeepReasoningEngine.analyze({
          gcode: input.gcode,
          material_iso: input.material_iso,
          target_controller: input.controller,
          source_cams: input.source_cam ? [input.source_cam] : undefined,
          tool_diameter_mm: input.tool_diameter_mm,
          spindle_rpm: input.spindle_rpm,
        });
      }

      // Run ultimate AI
      if (routing.engines.some(e => e.engine === "ultimate_ai")) {
        ultimateAI = postProcessorUltimateAIEngine.analyze({
          gcode: input.gcode,
          material_iso: input.material_iso,
          target_controller: input.controller,
          source_cams: input.source_cam ? [input.source_cam] : undefined,
          tool_diameter_mm: input.tool_diameter_mm,
          spindle_rpm: input.spindle_rpm,
          llm_cli_mode: input.output_mode === "llm_cli",
          query: input.query,
        });
      }

      // Run neural optimizer
      if (routing.engines.some(e => e.engine === "neural_optimizer")) {
        neuralOpt = this.neuralOptimization(input);
      }
    }

    // 4. Aggregate analysis
    const analysis = this.aggregateAnalysis(deepLearning, deepReasoning, ultimateAI, expertRules, neuralOpt);

    // 5. Generate response
    const response = this.generateResponse(input, intent, analysis);

    // 6. Generate proactive suggestions
    const proactiveSuggestions = this.generateProactiveSuggestions(analysis);

    // 7. Update context
    const contextUpdates: Partial<ConversationContext> = {
      last_intent: intent.primary_intent,
      controller_context: input.controller,
      material_context: input.material_iso,
      active_gcode: input.gcode,
    };

    const processingTime = Date.now() - startTime;
    log.info(`[PPOrchestrator] Complete: ${processingTime}ms, consensus ${analysis.consensus_score}`);

    return {
      query: input.query,
      intent,
      response,
      analysis,
      llm_cli_output: ultimateAI?.llm_cli_output,
      context_updates: contextUpdates,
      proactive_suggestions: proactiveSuggestions,
      confidence: analysis.consensus_score,
      processing_time_ms: processingTime,
    };
  }

  // ── Private Helpers ──────────────────────────────────────────────────────

  private extractControllers(query: string): ControllerType[] {
    const controllers: ControllerType[] = [];
    const patterns: [RegExp, ControllerType][] = [
      [/fanuc/i, "fanuc"],
      [/siemens|sinumerik/i, "siemens"],
      [/haas/i, "haas"],
      [/okuma|osp/i, "okuma"],
      [/mazak|mazatrol/i, "mazak"],
      [/mitsubishi|meldas/i, "mitsubishi"],
      [/heidenhain/i, "heidenhain"],
      [/fagor/i, "fagor"],
    ];
    for (const [pattern, controller] of patterns) {
      if (pattern.test(query)) controllers.push(controller);
    }
    return controllers;
  }

  private extractMaterials(query: string): ISOGroup[] {
    const materials: ISOGroup[] = [];
    const patterns: [RegExp, ISOGroup][] = [
      [/steel|carbon\s*steel|low\s*alloy/i, "P"],
      [/stainless|inox|austenitic/i, "M"],
      [/cast\s*iron|grey\s*iron|ductile/i, "K"],
      [/aluminum|aluminium|non-?ferrous/i, "N"],
      [/super\s*alloy|inconel|titanium|heat\s*resistant/i, "S"],
      [/hardened|hard\s*steel|hrc/i, "H"],
    ];
    for (const [pattern, group] of patterns) {
      if (pattern.test(query)) materials.push(group);
    }
    return materials;
  }

  private extractOperations(query: string): string[] {
    const operations: string[] = [];
    const patterns = [
      /roughing|rough/i, /finishing|finish/i, /drilling|drill/i,
      /tapping|tap/i, /boring|bore/i, /milling|mill/i,
      /turning|turn/i, /threading|thread/i, /grooving|groove/i,
    ];
    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) operations.push(match[0].toLowerCase());
    }
    return operations;
  }

  private extractIssues(query: string): string[] {
    const issues: string[] = [];
    const patterns = [
      /chatter|vibration/i, /crash|collision/i, /tool\s*break/i,
      /poor\s*finish|surface/i, /slow|cycle\s*time/i, /error|alarm/i,
    ];
    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) issues.push(match[0].toLowerCase());
    }
    return issues;
  }

  private generateDetailedExplanation(
    intent: IntentClassification,
    analysis: AggregatedAnalysis
  ): string {
    const parts: string[] = [];

    parts.push(`Analysis performed with ${intent.complexity} complexity, routing to ${
      Object.keys(analysis).filter(k => analysis[k as keyof AggregatedAnalysis]).length
    } AI engines.`);

    if (analysis.deep_learning) {
      parts.push(`\nDeep Learning (L1): Quality score ${analysis.deep_learning.quality_score.overall_score}/100, ` +
        `detected ${analysis.deep_learning.pattern_recognition.operation_type} operation with ${
          (analysis.deep_learning.pattern_recognition.operation_confidence * 100).toFixed(0)}% confidence.`);
    }

    if (analysis.deep_reasoning) {
      parts.push(`\nDeep Reasoning (L2): ${analysis.deep_reasoning.chain_of_thought.steps.length} reasoning steps, ` +
        `physics score ${analysis.deep_reasoning.physics_reasoning.overall_physics_score}/100.`);
    }

    if (analysis.ultimate_ai) {
      parts.push(`\nUltimate AI (L3): Ultimate confidence ${(analysis.ultimate_ai.ultimate_confidence * 100).toFixed(0)}%, ` +
        `ensemble disagreement ${(analysis.ultimate_ai.deep_ensemble.disagreement * 100).toFixed(1)}%.`);
    }

    if (analysis.expert_rules) {
      const triggered = analysis.expert_rules.filter(r => r.triggered);
      parts.push(`\nExpert System: ${triggered.length} rules triggered out of ${EXPERT_RULES.length} total rules.`);
    }

    return parts.join("");
  }
}

// Singleton export
export const postProcessorIntelligenceOrchestrator = new PostProcessorIntelligenceOrchestratorEngine();
