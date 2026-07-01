/**
 * TribalKnowledgeActivationEngine — Dormant Tip Activation System
 * ================================================================
 * Activates 3,594+ dormant tribal tips from TribalKnowledgeEngine by
 * connecting them to decision points throughout PRISM.
 *
 * Context: PRISM has 4,493 tribal tips but only ~20% are actively used.
 * This engine makes the remaining tips discoverable and actionable by
 * providing context-aware activation at key decision points:
 *   - Speed/feed calculation -> material-specific tips
 *   - Toolpath selection -> strategy tips
 *   - Controller output -> controller quirk tips
 *   - Problem diagnosis -> troubleshooting tips
 *
 * Integration Points:
 *   - TribalKnowledgeEngine (4,493 tips from 18 CAM systems)
 *   - SpeedFeedOrchestratorEngine (speed/feed decisions)
 *   - PostProcessorPipelineEngine (controller output)
 *   - TroubleshootingAssistantEngine (problem diagnosis)
 *
 * @module engines/TribalKnowledgeActivationEngine
 * @milestone PP-TRIBAL-ACTIVATION
 */

import { log } from "../utils/Logger.js";
import {
  tribalKnowledgeEngine,
  type KnowledgeTip,
  type KnowledgeCategory,
  type KnowledgeDomain,
  type KnowledgeSearchInput,
} from "./TribalKnowledgeEngine.js";

// ============================================================================
// TYPES — Context & Activation
// ============================================================================

/** Decision context for tip activation */
export interface ActivationContext {
  /** Decision type triggering activation */
  decision_type: DecisionType;
  /** Material name or ISO group */
  material?: string;
  /** ISO material group (P, M, K, N, S, H) */
  iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  /** Operation type */
  operation?: string;
  /** Machine ID or name */
  machine?: string;
  /** Controller type */
  controller?: string;
  /** Tool type */
  tool_type?: string;
  /** Tool diameter in mm */
  tool_diameter_mm?: number;
  /** Surface finish target Ra in um */
  target_ra_um?: number;
  /** Problem symptom for troubleshooting */
  symptom?: string;
  /** CAM software */
  cam_system?: string;
  /** Keywords for search */
  keywords?: string[];
  /** Hardness in HRC */
  hardness_hrc?: number;
  /** Cutting speed in m/min */
  cutting_speed?: number;
  /** Feed rate in mm/tooth or mm/rev */
  feed_rate?: number;
  /** Depth of cut in mm */
  depth_of_cut?: number;
}

/** Types of decisions that trigger tip activation */
export type DecisionType =
  | "speed_feed"           // Speed/feed calculation
  | "toolpath_strategy"    // Toolpath/strategy selection
  | "controller_output"    // Controller/post processor
  | "problem_diagnosis"    // Troubleshooting
  | "tool_selection"       // Tool selection
  | "workholding"          // Workholding/fixturing
  | "surface_finish"       // Surface finish optimization
  | "threading"            // Threading operations
  | "drilling"             // Drilling operations
  | "milling_pocket"       // Pocket milling
  | "milling_profile"      // Profile/contour milling
  | "turning_roughing"     // Turning roughing
  | "turning_finishing"    // Turning finishing
  | "multi_axis"           // 5-axis/multi-axis
  | "general";             // General context

/** Activated tip with relevance metadata */
export interface ActivatedTip {
  /** Original tip */
  tip: KnowledgeTip;
  /** Relevance score (0-100) */
  relevance_score: number;
  /** Why this tip was activated */
  activation_reason: string;
  /** Priority level */
  priority: "critical" | "high" | "medium" | "low";
  /** Whether this is a safety-related tip */
  is_safety: boolean;
  /** Match type */
  match_type: "exact" | "partial" | "keyword" | "domain";
}

/** Result of tip activation */
export interface ActivationResult {
  /** Activated tips sorted by relevance */
  tips: ActivatedTip[];
  /** Context that triggered activation */
  context: ActivationContext;
  /** Total tips considered */
  total_considered: number;
  /** Number activated */
  total_activated: number;
  /** Activation timestamp */
  timestamp: string;
  /** Summary for quick display */
  summary: string;
}

/** Parameter modification from tribal tips */
export interface TribalParameterModifier {
  /** Parameter being modified */
  parameter: "speed" | "feed" | "depth" | "width" | "coolant" | "rpm";
  /** Modification type */
  modification: "reduce" | "increase" | "set_max" | "set_min" | "recommend";
  /** Percentage adjustment (for reduce/increase) or absolute value */
  value: number;
  /** Unit for absolute values */
  unit?: string;
  /** Reason for modification */
  reason: string;
  /** Source tip ID */
  source_tip_id: string;
  /** Confidence in this modification */
  confidence: number;
}

/** Post processor decision parameters */
export interface PPDecisionParams {
  /** Controller type */
  controller: string;
  /** Machine type */
  machine_type?: string;
  /** G-code being generated */
  gcode?: string;
  /** Operation type */
  operation?: string;
  /** Material */
  material?: string;
  /** Specific feature being output */
  feature?: string;
}

/** Tips integrated into PP decision */
export interface PPTribalIntegration {
  /** Relevant tips for this PP decision */
  tips: ActivatedTip[];
  /** Parameter modifications suggested */
  modifiers: TribalParameterModifier[];
  /** Warnings to display */
  warnings: string[];
  /** Controller-specific quirks */
  quirks: string[];
  /** Suggested G-code modifications */
  gcode_suggestions: string[];
}

// ============================================================================
// CONSTANTS — Category Mappings
// ============================================================================

/** Map decision types to relevant knowledge categories */
const DECISION_CATEGORY_MAP: Record<DecisionType, KnowledgeCategory[]> = {
  speed_feed: ["speeds_feeds", "tooling", "materials_science", "optimization"],
  toolpath_strategy: ["cam_strategy", "optimization", "roughing", "workflow"],
  controller_output: ["post_processor", "programming", "automation"],
  problem_diagnosis: ["troubleshooting", "safety", "quality", "maintenance"],
  tool_selection: ["tooling", "materials_science", "speeds_feeds"],
  workholding: ["fixturing", "setup", "workholding" as KnowledgeCategory],
  surface_finish: ["surface_finish", "finishing" as KnowledgeCategory, "speeds_feeds"],
  threading: ["thread", "tooling", "programming"],
  drilling: ["tooling", "speeds_feeds", "setup"],
  milling_pocket: ["cam_strategy", "roughing", "optimization"],
  milling_profile: ["cam_strategy", "surface_finish", "optimization"],
  turning_roughing: ["roughing", "speeds_feeds", "tooling"],
  turning_finishing: ["surface_finish", "speeds_feeds", "tooling"],
  multi_axis: ["multi_axis", "verification", "simulation", "cam_strategy"],
  general: [],
};

/** Keywords that indicate safety-critical tips */
const SAFETY_KEYWORDS = [
  "safety", "danger", "warning", "critical", "never", "must not",
  "do not", "avoid", "prohibited", "mandatory", "required",
  "collision", "crash", "injury", "fire", "explosion",
];

/** Controller-specific keywords for quirk detection */
const CONTROLLER_KEYWORDS: Record<string, string[]> = {
  fanuc: ["fanuc", "g28", "g30", "g53", "m98", "m99", "macro b", "parameter"],
  haas: ["haas", "g187", "g54.1", "macro", "setting", "m30", "alarm"],
  siemens: ["siemens", "sinumerik", "r-parameter", "cycle", "shopmill", "840d"],
  heidenhain: ["heidenhain", "itnc", "tnc", "fk programming", "sbl", "q-parameter"],
  mazak: ["mazak", "mazatrol", "eia", "conversational", "smooth", "matrix"],
  okuma: ["okuma", "osp", "thinc", "variable", "macro", "igf"],
  mitsubishi: ["mitsubishi", "meldas", "m70", "m80", "m800", "custom macro"],
  hurco: ["hurco", "winmax", "conversational", "ultimax"],
};

/** Material-specific keywords */
const MATERIAL_KEYWORDS: Record<string, string[]> = {
  P: ["steel", "carbon steel", "alloy steel", "low carbon", "medium carbon", "high carbon"],
  M: ["stainless", "304", "316", "austenitic", "duplex", "martensitic", "work hardening"],
  K: ["cast iron", "gray iron", "ductile iron", "nodular", "compacted graphite"],
  N: ["aluminum", "aluminium", "brass", "bronze", "copper", "zinc", "non-ferrous"],
  S: ["titanium", "ti-6al-4v", "inconel", "waspaloy", "hastelloy", "superalloy", "hrsa"],
  H: ["hardened", "tool steel", "d2", "a2", "s7", "m2", "h13", "hard turning", "hrc"],
};

// ============================================================================
// MAIN ENGINE CLASS
// ============================================================================

/**
 * TribalKnowledgeActivationEngine — Activates dormant tribal tips at decision points
 */
export class TribalKnowledgeActivationEngine {
  /** Activation statistics */
  private stats = {
    total_activations: 0,
    tips_activated: 0,
    by_decision_type: {} as Record<DecisionType, number>,
    by_category: {} as Record<string, number>,
  };

  constructor() {
    log.info("[TribalActivation] Engine initialized");
  }

  // ==========================================================================
  // CORE ACTIVATION METHODS
  // ==========================================================================

  /**
   * Activate tips for a given context.
   * Main entry point for context-aware tip activation.
   */
  activateTipsForContext(context: ActivationContext): ActivationResult {
    const startTime = Date.now();
    this.stats.total_activations++;
    this.stats.by_decision_type[context.decision_type] =
      (this.stats.by_decision_type[context.decision_type] || 0) + 1;

    // Build search input from context
    const searchInput = this.buildSearchInput(context);

    // Get candidate tips from TribalKnowledgeEngine
    const candidates = tribalKnowledgeEngine.search(searchInput);

    // Score and filter candidates
    const activatedTips = this.scoreAndRankTips(candidates, context);

    // Generate summary
    const summary = this.generateSummary(activatedTips, context);

    log.debug(`[TribalActivation] Activated ${activatedTips.length}/${candidates.length} tips in ${Date.now() - startTime}ms`);

    return {
      tips: activatedTips,
      context,
      total_considered: candidates.length,
      total_activated: activatedTips.length,
      timestamp: new Date().toISOString(),
      summary,
    };
  }

  /**
   * Get tips for a specific operation type.
   */
  getTipsByOperation(operation: string, limit = 10): ActivatedTip[] {
    const context: ActivationContext = {
      decision_type: this.inferDecisionType(operation),
      operation,
    };
    const result = this.activateTipsForContext(context);
    return result.tips.slice(0, limit);
  }

  /**
   * Get tips for a specific material.
   */
  getTipsByMaterial(material: string, limit = 10): ActivatedTip[] {
    const isoGroup = this.inferISOGroup(material);
    const context: ActivationContext = {
      decision_type: "speed_feed",
      material,
      iso_group: isoGroup,
    };
    const result = this.activateTipsForContext(context);
    return result.tips.slice(0, limit);
  }

  /**
   * Get tips for a specific controller.
   */
  getTipsByController(controller: string, limit = 10): ActivatedTip[] {
    const context: ActivationContext = {
      decision_type: "controller_output",
      controller: controller.toLowerCase(),
    };
    const result = this.activateTipsForContext(context);
    return result.tips.slice(0, limit);
  }

  /**
   * Get tips for troubleshooting a problem.
   */
  getTipsByProblem(problem: string, limit = 10): ActivatedTip[] {
    const context: ActivationContext = {
      decision_type: "problem_diagnosis",
      symptom: problem,
      keywords: this.extractKeywords(problem),
    };
    const result = this.activateTipsForContext(context);
    return result.tips.slice(0, limit);
  }

  /**
   * Rank tips by relevance to a context.
   */
  rankTipsByRelevance(tips: KnowledgeTip[], context: ActivationContext): ActivatedTip[] {
    return this.scoreAndRankTips(tips, context);
  }

  /**
   * Integrate tips into post processor decisions.
   */
  integrateWithPPDecision(ppParams: PPDecisionParams): PPTribalIntegration {
    // Build context from PP params
    const context: ActivationContext = {
      decision_type: "controller_output",
      controller: ppParams.controller,
      machine: ppParams.machine_type,
      operation: ppParams.operation,
      material: ppParams.material,
    };

    // Get activated tips
    const result = this.activateTipsForContext(context);

    // Extract modifiers, warnings, and suggestions
    const modifiers = this.extractModifiers(result.tips);
    const warnings = this.extractWarnings(result.tips);
    const quirks = this.extractControllerQuirks(result.tips, ppParams.controller);
    const gcodeSuggestions = this.extractGCodeSuggestions(result.tips, ppParams);

    return {
      tips: result.tips,
      modifiers,
      warnings,
      quirks,
      gcode_suggestions: gcodeSuggestions,
    };
  }

  // ==========================================================================
  // SPECIALIZED ACTIVATION METHODS
  // ==========================================================================

  /**
   * Activate tips for speed/feed decisions.
   */
  activateForSpeedFeed(params: {
    material: string;
    operation: string;
    tool_type?: string;
    tool_diameter_mm?: number;
    hardness_hrc?: number;
  }): ActivationResult {
    return this.activateTipsForContext({
      decision_type: "speed_feed",
      material: params.material,
      iso_group: this.inferISOGroup(params.material),
      operation: params.operation,
      tool_type: params.tool_type,
      tool_diameter_mm: params.tool_diameter_mm,
      hardness_hrc: params.hardness_hrc,
    });
  }

  /**
   * Activate tips for toolpath strategy decisions.
   */
  activateForToolpath(params: {
    operation: string;
    material?: string;
    cam_system?: string;
    feature?: string;
  }): ActivationResult {
    return this.activateTipsForContext({
      decision_type: "toolpath_strategy",
      operation: params.operation,
      material: params.material,
      cam_system: params.cam_system,
      keywords: params.feature ? [params.feature] : undefined,
    });
  }

  /**
   * Activate tips for controller/post processor.
   */
  activateForController(params: {
    controller: string;
    operation?: string;
    feature?: string;
  }): ActivationResult {
    return this.activateTipsForContext({
      decision_type: "controller_output",
      controller: params.controller.toLowerCase(),
      operation: params.operation,
      keywords: params.feature ? [params.feature] : undefined,
    });
  }

  /**
   * Activate tips for troubleshooting.
   */
  activateForTroubleshooting(params: {
    symptom: string;
    machine?: string;
    operation?: string;
    material?: string;
  }): ActivationResult {
    return this.activateTipsForContext({
      decision_type: "problem_diagnosis",
      symptom: params.symptom,
      machine: params.machine,
      operation: params.operation,
      material: params.material,
      keywords: this.extractKeywords(params.symptom),
    });
  }

  // ==========================================================================
  // INTERNAL HELPERS
  // ==========================================================================

  /**
   * Build search input from activation context.
   */
  private buildSearchInput(context: ActivationContext): KnowledgeSearchInput {
    const categories = DECISION_CATEGORY_MAP[context.decision_type] || [];

    const input: KnowledgeSearchInput = {
      limit: 100, // Get plenty of candidates for ranking
    };

    // Add material filter
    if (context.iso_group) {
      input.material_iso_group = context.iso_group;
    }

    // Add operation filter
    if (context.operation) {
      input.operation_type = context.operation;
    }

    // Add category filter if we have a primary category
    if (categories.length > 0) {
      input.category = categories[0];
    }

    // Build query string from context
    const queryParts: string[] = [];
    if (context.material) queryParts.push(context.material);
    if (context.controller) queryParts.push(context.controller);
    if (context.symptom) queryParts.push(context.symptom);
    if (context.cam_system) queryParts.push(context.cam_system);
    if (context.keywords) queryParts.push(...context.keywords);

    if (queryParts.length > 0) {
      input.query = queryParts.join(" ");
    }

    return input;
  }

  /**
   * Score and rank tips based on context relevance.
   */
  private scoreAndRankTips(tips: KnowledgeTip[], context: ActivationContext): ActivatedTip[] {
    const scored = tips.map(tip => this.scoreTip(tip, context));

    // Sort by score descending
    scored.sort((a, b) => b.relevance_score - a.relevance_score);

    // Filter to relevant tips (score > 20)
    const relevant = scored.filter(t => t.relevance_score > 20);

    // Update stats
    this.stats.tips_activated += relevant.length;
    for (const tip of relevant) {
      this.stats.by_category[tip.tip.category] =
        (this.stats.by_category[tip.tip.category] || 0) + 1;
    }

    return relevant;
  }

  /**
   * Score a single tip against the context.
   */
  private scoreTip(tip: KnowledgeTip, context: ActivationContext): ActivatedTip {
    let score = 0;
    const reasons: string[] = [];
    let matchType: "exact" | "partial" | "keyword" | "domain" = "domain";

    // Base confidence score (0-30)
    score += (tip.confidence / 100) * 30;

    // Category match (0-25)
    const targetCategories = DECISION_CATEGORY_MAP[context.decision_type] || [];
    if (targetCategories.includes(tip.category as KnowledgeCategory)) {
      score += 25;
      reasons.push(`Category match: ${tip.category}`);
      matchType = "partial";
    }

    // Material match (0-20)
    if (context.iso_group && tip.material_groups?.includes(context.iso_group)) {
      score += 20;
      reasons.push(`Material group match: ${context.iso_group}`);
      matchType = "exact";
    } else if (context.material && tip.body && tip.title) {
      const materialLower = context.material.toLowerCase();
      const bodyLower = tip.body.toLowerCase();
      const titleLower = tip.title.toLowerCase();
      if (bodyLower.includes(materialLower) || titleLower.includes(materialLower)) {
        score += 15;
        reasons.push(`Material keyword match: ${context.material}`);
        matchType = "partial";
      }
    }

    // Operation match (0-15)
    if (context.operation && tip.operation_types?.includes(context.operation)) {
      score += 15;
      reasons.push(`Operation match: ${context.operation}`);
      matchType = "exact";
    } else if (context.operation && tip.body && tip.title) {
      const opLower = context.operation.toLowerCase();
      if (tip.body.toLowerCase().includes(opLower) || tip.title.toLowerCase().includes(opLower)) {
        score += 10;
        reasons.push(`Operation keyword match`);
      }
    }

    // Controller match (0-15)
    if (context.controller) {
      const controllerLower = context.controller.toLowerCase();
      const controllerKeys = CONTROLLER_KEYWORDS[controllerLower] || [controllerLower];
      const tipText = ((tip.title || "") + " " + (tip.body || "")).toLowerCase();
      for (const key of controllerKeys) {
        if (tipText.includes(key)) {
          score += 15;
          reasons.push(`Controller match: ${controllerLower}`);
          matchType = "exact";
          break;
        }
      }
    }

    // Keyword match (0-10)
    if (context.keywords && context.keywords.length > 0) {
      const tags = Array.isArray(tip.tags) ? tip.tags.join(" ") : "";
      const tipText = ((tip.title || "") + " " + (tip.body || "") + " " + tags).toLowerCase();
      let keywordMatches = 0;
      for (const kw of context.keywords) {
        if (tipText.includes(kw.toLowerCase())) {
          keywordMatches++;
        }
      }
      if (keywordMatches > 0) {
        score += Math.min(10, keywordMatches * 3);
        reasons.push(`${keywordMatches} keyword match(es)`);
        matchType = matchType === "domain" ? "keyword" : matchType;
      }
    }

    // Symptom match for troubleshooting (0-10)
    if (context.symptom) {
      const symptomWords = context.symptom.toLowerCase().split(/\s+/);
      const tipText = ((tip.title || "") + " " + (tip.body || "")).toLowerCase();
      let symptomMatches = 0;
      for (const word of symptomWords) {
        if (word.length > 3 && tipText.includes(word)) {
          symptomMatches++;
        }
      }
      if (symptomMatches > 0) {
        score += Math.min(10, symptomMatches * 2);
        reasons.push(`Symptom match: ${symptomMatches} words`);
      }
    }

    // CAM system match (0-10)
    if (context.cam_system) {
      const camLower = context.cam_system.toLowerCase();
      const tags = Array.isArray(tip.tags) ? tip.tags.join(" ") : "";
      const tipText = ((tip.title || "") + " " + (tip.body || "") + " " + tags).toLowerCase();
      if (tipText.includes(camLower)) {
        score += 10;
        reasons.push(`CAM system match: ${context.cam_system}`);
      }
    }

    // Usage count bonus (0-5)
    if (tip.usage_count > 10) {
      score += Math.min(5, tip.usage_count / 10);
      reasons.push(`High usage: ${tip.usage_count}`);
    }

    // Check safety
    const isSafety = this.isSafetyTip(tip);
    if (isSafety && context.decision_type !== "problem_diagnosis") {
      score += 5; // Boost safety tips
      reasons.push("Safety-related");
    }

    // Determine priority
    let priority: "critical" | "high" | "medium" | "low" = "low";
    if (score >= 70 || (isSafety && score >= 50)) {
      priority = "critical";
    } else if (score >= 50) {
      priority = "high";
    } else if (score >= 35) {
      priority = "medium";
    }

    return {
      tip,
      relevance_score: Math.min(100, Math.round(score)),
      activation_reason: reasons.length > 0 ? reasons.join("; ") : "Domain relevance",
      priority,
      is_safety: isSafety,
      match_type: matchType,
    };
  }

  /**
   * Check if a tip is safety-related.
   */
  private isSafetyTip(tip: KnowledgeTip): boolean {
    if (tip.category === "safety") return true;
    const text = ((tip.title || "") + " " + (tip.body || "")).toLowerCase();
    return SAFETY_KEYWORDS.some(kw => text.includes(kw));
  }

  /**
   * Extract parameter modifiers from activated tips.
   */
  private extractModifiers(tips: ActivatedTip[]): TribalParameterModifier[] {
    const modifiers: TribalParameterModifier[] = [];

    for (const { tip, relevance_score } of tips) {
      if (!tip.body) continue;
      const body = tip.body.toLowerCase();

      // Speed reductions
      const speedReduceMatch = body.match(/reduce\s+(?:cutting\s+)?speed\s+(?:by\s+)?(\d+)%/i) ||
                               body.match(/speed\s+.*?(\d+)%\s+(?:lower|less|reduction)/i);
      if (speedReduceMatch) {
        modifiers.push({
          parameter: "speed",
          modification: "reduce",
          value: parseInt(speedReduceMatch[1]),
          reason: tip.title,
          source_tip_id: tip.id,
          confidence: relevance_score / 100,
        });
      }

      // Speed increases
      const speedIncreaseMatch = body.match(/increase\s+(?:cutting\s+)?speed\s+(?:by\s+)?(\d+)%/i);
      if (speedIncreaseMatch) {
        modifiers.push({
          parameter: "speed",
          modification: "increase",
          value: parseInt(speedIncreaseMatch[1]),
          reason: tip.title,
          source_tip_id: tip.id,
          confidence: relevance_score / 100,
        });
      }

      // Feed reductions
      const feedReduceMatch = body.match(/reduce\s+feed\s+(?:rate\s+)?(?:by\s+)?(\d+)%/i) ||
                              body.match(/feed\s+.*?(\d+)%\s+(?:lower|less|reduction)/i);
      if (feedReduceMatch) {
        modifiers.push({
          parameter: "feed",
          modification: "reduce",
          value: parseInt(feedReduceMatch[1]),
          reason: tip.title,
          source_tip_id: tip.id,
          confidence: relevance_score / 100,
        });
      }

      // Depth of cut limits
      const depthMatch = body.match(/(?:max|maximum)\s+(?:depth\s+(?:of\s+cut)?|doc|ap)\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*mm/i);
      if (depthMatch) {
        modifiers.push({
          parameter: "depth",
          modification: "set_max",
          value: parseFloat(depthMatch[1]),
          unit: "mm",
          reason: tip.title,
          source_tip_id: tip.id,
          confidence: relevance_score / 100,
        });
      }

      // Coolant recommendations
      if (body.includes("flood coolant") || body.includes("through-spindle coolant")) {
        modifiers.push({
          parameter: "coolant",
          modification: "recommend",
          value: 1,
          reason: tip.title,
          source_tip_id: tip.id,
          confidence: relevance_score / 100,
        });
      } else if (body.includes("dry cutting") || body.includes("no coolant") || body.includes("machines better dry")) {
        modifiers.push({
          parameter: "coolant",
          modification: "recommend",
          value: 0,
          reason: tip.title,
          source_tip_id: tip.id,
          confidence: relevance_score / 100,
        });
      }
    }

    return modifiers;
  }

  /**
   * Extract warnings from activated tips.
   */
  private extractWarnings(tips: ActivatedTip[]): string[] {
    const warnings: string[] = [];

    for (const { tip, is_safety, priority } of tips) {
      if ((is_safety || priority === "critical") && tip.body) {
        // Extract key warning from tip
        const sentences = tip.body.split(/[.!?]+/).filter(s => s.trim().length > 10);
        for (const sentence of sentences) {
          const lower = sentence.toLowerCase();
          if (SAFETY_KEYWORDS.some(kw => lower.includes(kw))) {
            warnings.push(sentence.trim());
            break;
          }
        }
      }
    }

    return warnings.slice(0, 5); // Limit to top 5 warnings
  }

  /**
   * Extract controller-specific quirks from tips.
   */
  private extractControllerQuirks(tips: ActivatedTip[], controller: string): string[] {
    const quirks: string[] = [];
    const controllerLower = controller.toLowerCase();
    const keywords = CONTROLLER_KEYWORDS[controllerLower] || [controllerLower];

    for (const { tip } of tips) {
      const tipText = ((tip.title || "") + " " + (tip.body || "")).toLowerCase();
      if (keywords.some(kw => tipText.includes(kw))) {
        // This tip is controller-specific
        if (tip.category === "post_processor" || tip.domain === "controller_specific") {
          quirks.push(`${tip.title}: ${(tip.body || "").slice(0, 150)}...`);
        }
      }
    }

    return quirks.slice(0, 5);
  }

  /**
   * Extract G-code suggestions from tips.
   */
  private extractGCodeSuggestions(tips: ActivatedTip[], ppParams: PPDecisionParams): string[] {
    const suggestions: string[] = [];

    for (const { tip } of tips) {
      const body = tip.body || "";

      // Look for G-code patterns
      const gcodeMatch = body.match(/G\d+(?:\.\d+)?/g);
      if (gcodeMatch && gcodeMatch.length > 0) {
        suggestions.push(`Consider ${gcodeMatch.join(", ")} — ${tip.title}`);
      }

      // Look for M-code patterns
      const mcodeMatch = body.match(/M\d+/g);
      if (mcodeMatch && mcodeMatch.length > 0) {
        suggestions.push(`Check ${mcodeMatch.join(", ")} usage — ${tip.title}`);
      }
    }

    return suggestions.slice(0, 5);
  }

  /**
   * Generate summary of activated tips.
   */
  private generateSummary(tips: ActivatedTip[], context: ActivationContext): string {
    if (tips.length === 0) {
      return "No relevant tribal knowledge found for this context.";
    }

    const criticalCount = tips.filter(t => t.priority === "critical").length;
    const highCount = tips.filter(t => t.priority === "high").length;
    const safetyCount = tips.filter(t => t.is_safety).length;

    const parts: string[] = [];
    parts.push(`Found ${tips.length} relevant tip(s) for ${context.decision_type}`);

    if (criticalCount > 0) parts.push(`${criticalCount} critical`);
    if (highCount > 0) parts.push(`${highCount} high priority`);
    if (safetyCount > 0) parts.push(`${safetyCount} safety-related`);

    if (tips.length > 0) {
      parts.push(`Top: "${tips[0].tip.title}"`);
    }

    return parts.join(". ") + ".";
  }

  /**
   * Infer decision type from operation string.
   */
  private inferDecisionType(operation: string): DecisionType {
    const op = operation.toLowerCase();

    if (op.includes("thread") || op.includes("tap")) return "threading";
    if (op.includes("drill") || op.includes("bore") || op.includes("ream")) return "drilling";
    if (op.includes("pocket")) return "milling_pocket";
    if (op.includes("profile") || op.includes("contour")) return "milling_profile";
    if (op.includes("rough") && op.includes("turn")) return "turning_roughing";
    if (op.includes("finish") && op.includes("turn")) return "turning_finishing";
    if (op.includes("5axis") || op.includes("5-axis") || op.includes("multi")) return "multi_axis";
    if (op.includes("surface") || op.includes("finish")) return "surface_finish";
    if (op.includes("fixture") || op.includes("clamp") || op.includes("workhold")) return "workholding";
    if (op.includes("tool") && (op.includes("select") || op.includes("choice"))) return "tool_selection";

    return "general";
  }

  /**
   * Infer ISO material group from material name.
   */
  private inferISOGroup(material: string): "P" | "M" | "K" | "N" | "S" | "H" | undefined {
    const mat = material.toLowerCase();

    for (const [group, keywords] of Object.entries(MATERIAL_KEYWORDS)) {
      if (keywords.some(kw => mat.includes(kw))) {
        return group as "P" | "M" | "K" | "N" | "S" | "H";
      }
    }

    return undefined;
  }

  /**
   * Extract keywords from a text string.
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
      "have", "has", "had", "do", "does", "did", "will", "would", "could",
      "should", "may", "might", "must", "shall", "can", "need", "to", "of",
      "in", "for", "on", "with", "at", "by", "from", "as", "into", "through",
      "and", "or", "but", "if", "then", "else", "when", "where", "what", "which",
      "who", "how", "why", "all", "each", "every", "both", "few", "more", "most",
      "other", "some", "such", "no", "not", "only", "same", "so", "than", "too",
      "very", "just", "also", "now", "here", "there", "this", "that", "these",
    ]);

    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));
  }

  // ==========================================================================
  // STATISTICS & INFO
  // ==========================================================================

  /**
   * Get activation statistics.
   */
  getStats(): {
    total_activations: number;
    tips_activated: number;
    by_decision_type: Record<string, number>;
    by_category: Record<string, number>;
    source_tip_count: number;
  } {
    // Get total tip count from source engine
    const allTips = tribalKnowledgeEngine.search({ limit: 10000 });

    return {
      ...this.stats,
      source_tip_count: allTips.length,
    };
  }

  /**
   * Get engine self-awareness info.
   */
  getSelfAwareness(): {
    name: string;
    description: string;
    capabilities: string[];
    integrations: string[];
    decision_types: string[];
  } {
    return {
      name: "TribalKnowledgeActivationEngine",
      description: "Activates dormant tribal tips at decision points throughout PRISM",
      capabilities: [
        "activateTipsForContext — Main entry for context-aware activation",
        "getTipsByOperation — Tips for specific operations",
        "getTipsByMaterial — Material-specific tips",
        "getTipsByController — Controller quirk tips",
        "getTipsByProblem — Troubleshooting tips",
        "rankTipsByRelevance — Rank tips by context relevance",
        "integrateWithPPDecision — Inject tips into PP decisions",
        "activateForSpeedFeed — Speed/feed decision tips",
        "activateForToolpath — Toolpath strategy tips",
        "activateForController — Controller/post tips",
        "activateForTroubleshooting — Problem diagnosis tips",
      ],
      integrations: [
        "TribalKnowledgeEngine (4,493+ tips)",
        "SpeedFeedOrchestratorEngine (via activateForSpeedFeed)",
        "PostProcessorPipelineEngine (via integrateWithPPDecision)",
        "TroubleshootingAssistantEngine (via activateForTroubleshooting)",
      ],
      decision_types: Object.keys(DECISION_CATEGORY_MAP),
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Tribal Knowledge Activation Engine singleton */
export const tribalKnowledgeActivationEngine = new TribalKnowledgeActivationEngine();
