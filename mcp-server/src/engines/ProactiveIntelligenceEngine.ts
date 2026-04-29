/**
 * ProactiveIntelligenceEngine — LLM-INTEL Proactive Assistant
 *
 * Anticipates user needs before they ask. Analyzes context and history
 * to proactively suggest actions, warn about issues, and optimize workflows.
 *
 * Capabilities:
 *   - Context-aware suggestions based on current task
 *   - Preemptive warnings (tool life, material issues, machine limits)
 *   - Workflow optimization recommendations
 *   - Learning from user patterns
 *   - Integration with tribal knowledge for shop-specific insights
 *
 * @module engines/ProactiveIntelligenceEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { tribalKnowledgeAdvisorEngine, type TribalQueryContext } from "./TribalKnowledgeAdvisorEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** User context for proactive analysis */
export interface UserContext {
  /** Current task or intent */
  current_task?: string;
  /** Material being worked */
  material?: string;
  /** ISO material group */
  iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  /** Machine in use */
  machine_id?: string;
  /** Operation type */
  operation?: string;
  /** Tool being used */
  tool_type?: string;
  /** Tool diameter */
  tool_diameter_mm?: number;
  /** Part family or number */
  part_family?: string;
  /** Recent actions taken */
  recent_actions?: string[];
  /** Current cutting parameters */
  cutting_params?: {
    speed_mpm?: number;
    feed_mm?: number;
    depth_mm?: number;
  };
  /** Shop context */
  shop_id?: string;
  /** Time of day (for shift-aware suggestions) */
  time_of_day?: "morning" | "afternoon" | "evening" | "night";
  /** User role */
  user_role?: "operator" | "programmer" | "engineer" | "manager";
}

/** Proactive suggestion */
export interface ProactiveSuggestion {
  id: string;
  type: "warning" | "recommendation" | "optimization" | "reminder" | "insight";
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  action?: string;
  action_params?: Record<string, unknown>;
  confidence: number;
  reasoning: string;
  source: string;
  expires_at?: string;
  dismissed?: boolean;
}

/** Anticipated need */
export interface AnticipatedNeed {
  need: string;
  probability: number;
  suggested_action: string;
  timing: "immediate" | "soon" | "later";
  context_triggers: string[];
}

/** Proactive intelligence result */
export interface ProactiveIntelligenceResult {
  /** Proactive suggestions */
  suggestions: ProactiveSuggestion[];
  /** Anticipated needs */
  anticipated_needs: AnticipatedNeed[];
  /** Context summary */
  context_summary: string;
  /** Risk level based on current context */
  risk_level: "low" | "medium" | "high" | "critical";
  /** Recommended next actions */
  recommended_actions: string[];
  /** Workflow optimization opportunities */
  optimizations: Array<{
    area: string;
    current_state: string;
    optimized_state: string;
    impact: string;
    effort: "low" | "medium" | "high";
  }>;
  /** Learning insights from user patterns */
  pattern_insights: string[];
  /** Natural language briefing */
  briefing: string;
}

/** User pattern for learning */
interface UserPattern {
  pattern_id: string;
  description: string;
  frequency: number;
  last_seen: string;
  context_triggers: string[];
  typical_next_action?: string;
}

// ============================================================================
// ENGINE
// ============================================================================

export class ProactiveIntelligenceEngine {
  private readonly engineName = "ProactiveIntelligenceEngine";

  /** Cached user patterns */
  private userPatterns: Map<string, UserPattern[]> = new Map();

  /** Recent context history for pattern detection */
  private contextHistory: UserContext[] = [];
  private readonly MAX_HISTORY = 50;

  /**
   * Analyze context and generate proactive intelligence.
   */
  analyze(context: UserContext): ProactiveIntelligenceResult {
    log.info(`[${this.engineName}] Analyzing context for proactive suggestions`);

    // Store context in history
    this.addToHistory(context);

    // Generate suggestions based on context
    const suggestions = this.generateSuggestions(context);

    // Anticipate future needs
    const anticipatedNeeds = this.anticipateNeeds(context);

    // Assess risk level
    const riskLevel = this.assessRiskLevel(context, suggestions);

    // Generate recommended actions
    const recommendedActions = this.generateRecommendedActions(context, suggestions);

    // Find optimization opportunities
    const optimizations = this.findOptimizations(context);

    // Detect patterns
    const patternInsights = this.detectPatterns(context);

    // Build context summary
    const contextSummary = this.buildContextSummary(context);

    // Generate briefing
    const briefing = this.generateBriefing(
      context, suggestions, anticipatedNeeds, riskLevel, optimizations
    );

    return {
      suggestions,
      anticipated_needs: anticipatedNeeds,
      context_summary: contextSummary,
      risk_level: riskLevel,
      recommended_actions: recommendedActions,
      optimizations,
      pattern_insights: patternInsights,
      briefing,
    };
  }

  /**
   * Generate proactive suggestions based on context.
   */
  private generateSuggestions(context: UserContext): ProactiveSuggestion[] {
    const suggestions: ProactiveSuggestion[] = [];
    const now = new Date().toISOString();

    // Material-specific warnings
    if (context.iso_group === "S") {
      suggestions.push({
        id: `warn-titanium-${Date.now()}`,
        type: "warning",
        priority: "high",
        title: "Titanium/Superalloy Cutting",
        description: "Working with ISO S material. Expect high cutting temperatures and rapid tool wear.",
        action: "verify_coolant",
        confidence: 0.95,
        reasoning: "ISO S materials (titanium, Inconel) require special handling due to low thermal conductivity",
        source: "material_intelligence",
      });

      suggestions.push({
        id: `rec-titanium-coolant-${Date.now()}`,
        type: "recommendation",
        priority: "high",
        title: "High-Pressure Coolant Recommended",
        description: "Use high-pressure through-tool coolant (70+ bar) for titanium cutting.",
        action: "configure_coolant",
        action_params: { pressure_bar: 70, type: "through_tool" },
        confidence: 0.9,
        reasoning: "High-pressure coolant improves chip evacuation and reduces cutting temperature by 15-20%",
        source: "tribal_knowledge",
      });
    }

    if (context.iso_group === "H") {
      suggestions.push({
        id: `warn-hardened-${Date.now()}`,
        type: "warning",
        priority: "high",
        title: "Hardened Material Cutting",
        description: "Working with ISO H (hardened) material. Use CBN/ceramic tooling for best results.",
        action: "verify_tooling",
        confidence: 0.92,
        reasoning: "Hardened materials >45 HRC require specialized tooling to prevent rapid wear",
        source: "material_intelligence",
      });
    }

    // Tool life warnings based on cutting parameters
    if (context.cutting_params?.speed_mpm && context.iso_group) {
      const baseSpeed = this.getBaseSpeed(context.iso_group);
      const speedRatio = context.cutting_params.speed_mpm / baseSpeed;

      if (speedRatio > 1.3) {
        suggestions.push({
          id: `warn-speed-${Date.now()}`,
          type: "warning",
          priority: "high",
          title: "Elevated Cutting Speed",
          description: `Speed is ${((speedRatio - 1) * 100).toFixed(0)}% above base recommendation. Tool life will be significantly reduced.`,
          action: "reduce_speed",
          action_params: { suggested_speed: baseSpeed },
          confidence: 0.88,
          reasoning: `Taylor equation: 30% speed increase reduces tool life by ~50%`,
          source: "physics_model",
        });
      } else if (speedRatio < 0.6) {
        suggestions.push({
          id: `opt-speed-${Date.now()}`,
          type: "optimization",
          priority: "medium",
          title: "Conservative Cutting Speed",
          description: `Speed is ${((1 - speedRatio) * 100).toFixed(0)}% below optimal. Productivity could be improved.`,
          action: "increase_speed",
          action_params: { suggested_speed: baseSpeed * 0.9 },
          confidence: 0.8,
          reasoning: "Current speed provides excessive tool life margin at cost of productivity",
          source: "optimization_engine",
        });
      }
    }

    // Operation-specific suggestions
    if (context.operation === "roughing" && context.tool_diameter_mm) {
      suggestions.push({
        id: `rec-adaptive-${Date.now()}`,
        type: "recommendation",
        priority: "medium",
        title: "Consider Adaptive Toolpath",
        description: "Adaptive/trochoidal toolpaths can increase MRR by 30-50% in roughing while extending tool life.",
        action: "switch_strategy",
        action_params: { strategy: "adaptive" },
        confidence: 0.75,
        reasoning: "Constant chip load strategies reduce thermal shock and enable higher speeds",
        source: "cam_intelligence",
      });
    }

    if (context.operation === "finishing") {
      suggestions.push({
        id: `rec-finish-params-${Date.now()}`,
        type: "recommendation",
        priority: "medium",
        title: "Finishing Parameter Check",
        description: "Verify feed rate is appropriate for target surface finish. Lower fz = better Ra.",
        confidence: 0.7,
        reasoning: "Ra ∝ fz²/8r (theoretical surface finish formula)",
        source: "physics_model",
      });
    }

    // Machine-specific insights
    if (context.machine_id) {
      const machineWarnings = this.getMachineWarnings(context.machine_id);
      suggestions.push(...machineWarnings);
    }

    // Consult tribal knowledge
    const tribalContext: TribalQueryContext = {
      material: context.material,
      iso_group: context.iso_group,
      machine_id: context.machine_id,
      operation: context.operation,
      tool_type: context.tool_type,
      tool_diameter_mm: context.tool_diameter_mm,
    };

    const advisory = tribalKnowledgeAdvisorEngine.getAdvisory(tribalContext);

    // Convert tribal warnings to suggestions
    for (const warning of advisory.warnings.slice(0, 3)) {
      suggestions.push({
        id: `tribal-warn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: "warning",
        priority: "high",
        title: "Tribal Knowledge Warning",
        description: warning,
        confidence: 0.85,
        reasoning: "Based on shop floor experience and documented best practices",
        source: "tribal_knowledge",
      });
    }

    // Sort by priority and confidence
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    suggestions.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return b.confidence - a.confidence;
    });

    return suggestions.slice(0, 10); // Top 10 suggestions
  }

  /**
   * Anticipate future needs based on context and patterns.
   */
  private anticipateNeeds(context: UserContext): AnticipatedNeed[] {
    const needs: AnticipatedNeed[] = [];

    // Task-based anticipation
    if (context.current_task?.toLowerCase().includes("quote")) {
      needs.push({
        need: "Material cost lookup",
        probability: 0.9,
        suggested_action: "Pre-fetch material pricing",
        timing: "immediate",
        context_triggers: ["quote", "estimate"],
      });
      needs.push({
        need: "Cycle time calculation",
        probability: 0.85,
        suggested_action: "Queue speed/feed calculation",
        timing: "soon",
        context_triggers: ["quote", "estimate"],
      });
    }

    if (context.current_task?.toLowerCase().includes("program")) {
      needs.push({
        need: "Post-processor selection",
        probability: 0.8,
        suggested_action: "Suggest appropriate post based on machine",
        timing: "soon",
        context_triggers: ["program", "cam", "gcode"],
      });
    }

    // Material-based anticipation
    if (context.material && !context.cutting_params) {
      needs.push({
        need: "Cutting parameters",
        probability: 0.95,
        suggested_action: "Calculate recommended S/F for material",
        timing: "immediate",
        context_triggers: ["material selected", "no cutting params"],
      });
    }

    // Tool-based anticipation
    if (context.tool_type && context.cutting_params?.speed_mpm) {
      needs.push({
        need: "Tool life estimation",
        probability: 0.75,
        suggested_action: "Calculate expected tool life",
        timing: "soon",
        context_triggers: ["tool selected", "cutting params set"],
      });
    }

    // Pattern-based anticipation
    const recentAction = context.recent_actions?.[0];
    if (recentAction === "calculate_speed_feed") {
      needs.push({
        need: "Generate toolpath",
        probability: 0.7,
        suggested_action: "Offer to generate CAM toolpath",
        timing: "soon",
        context_triggers: ["speed_feed_calculated"],
      });
    }

    if (recentAction === "create_program") {
      needs.push({
        need: "Setup sheet",
        probability: 0.8,
        suggested_action: "Generate setup sheet for program",
        timing: "immediate",
        context_triggers: ["program_created"],
      });
    }

    return needs;
  }

  /**
   * Assess overall risk level from context.
   */
  private assessRiskLevel(
    context: UserContext,
    suggestions: ProactiveSuggestion[]
  ): ProactiveIntelligenceResult["risk_level"] {
    const criticalCount = suggestions.filter(s => s.priority === "critical").length;
    const highCount = suggestions.filter(s => s.priority === "high").length;
    const warningCount = suggestions.filter(s => s.type === "warning").length;

    if (criticalCount > 0) return "critical";
    if (highCount >= 3 || warningCount >= 4) return "high";
    if (highCount >= 1 || warningCount >= 2) return "medium";
    return "low";
  }

  /**
   * Generate recommended next actions.
   */
  private generateRecommendedActions(
    context: UserContext,
    suggestions: ProactiveSuggestion[]
  ): string[] {
    const actions: string[] = [];

    // Add actions from high-priority suggestions
    for (const s of suggestions.filter(s => s.priority === "high" || s.priority === "critical")) {
      if (s.action) {
        actions.push(`${s.title}: ${s.action}`);
      }
    }

    // Context-based actions
    if (!context.cutting_params && context.material) {
      actions.push("Calculate cutting parameters for selected material");
    }

    if (context.operation === "roughing" && !context.recent_actions?.includes("check_power")) {
      actions.push("Verify machine power is sufficient for roughing MRR");
    }

    return actions.slice(0, 5);
  }

  /**
   * Find optimization opportunities.
   */
  private findOptimizations(context: UserContext): ProactiveIntelligenceResult["optimizations"] {
    const opts: ProactiveIntelligenceResult["optimizations"] = [];

    // Speed optimization
    if (context.cutting_params?.speed_mpm && context.iso_group) {
      const baseSpeed = this.getBaseSpeed(context.iso_group);
      if (context.cutting_params.speed_mpm < baseSpeed * 0.8) {
        opts.push({
          area: "Cutting Speed",
          current_state: `${context.cutting_params.speed_mpm} m/min`,
          optimized_state: `${Math.round(baseSpeed * 0.95)} m/min`,
          impact: "15-25% productivity increase",
          effort: "low",
        });
      }
    }

    // Toolpath optimization
    if (context.operation === "roughing") {
      opts.push({
        area: "Toolpath Strategy",
        current_state: "Conventional toolpath",
        optimized_state: "Adaptive/trochoidal clearing",
        impact: "30-50% MRR increase, 20% longer tool life",
        effort: "medium",
      });
    }

    // Setup optimization
    if (context.part_family) {
      opts.push({
        area: "Setup Standardization",
        current_state: "Individual part setup",
        optimized_state: "Family-based setup template",
        impact: "Reduce setup time by 40%",
        effort: "medium",
      });
    }

    return opts;
  }

  /**
   * Detect patterns from user history.
   */
  private detectPatterns(context: UserContext): string[] {
    const insights: string[] = [];

    if (this.contextHistory.length < 5) {
      return ["Insufficient history for pattern detection (need 5+ interactions)"];
    }

    // Material preference pattern
    const materialCounts = new Map<string, number>();
    for (const ctx of this.contextHistory) {
      if (ctx.material) {
        materialCounts.set(ctx.material, (materialCounts.get(ctx.material) || 0) + 1);
      }
    }
    const topMaterial = [...materialCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topMaterial && topMaterial[1] >= 3) {
      insights.push(`Frequent material: ${topMaterial[0]} (${topMaterial[1]} recent jobs)`);
    }

    // Operation pattern
    const opCounts = new Map<string, number>();
    for (const ctx of this.contextHistory) {
      if (ctx.operation) {
        opCounts.set(ctx.operation, (opCounts.get(ctx.operation) || 0) + 1);
      }
    }
    const topOp = [...opCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topOp && topOp[1] >= 3) {
      insights.push(`Common operation: ${topOp[0]} (${topOp[1]} recent uses)`);
    }

    return insights;
  }

  /**
   * Build context summary.
   */
  private buildContextSummary(context: UserContext): string {
    const parts: string[] = [];

    if (context.current_task) parts.push(`Task: ${context.current_task}`);
    if (context.material) parts.push(`Material: ${context.material}`);
    if (context.machine_id) parts.push(`Machine: ${context.machine_id}`);
    if (context.operation) parts.push(`Operation: ${context.operation}`);

    return parts.length > 0 ? parts.join(" | ") : "No context provided";
  }

  /**
   * Generate natural language briefing.
   */
  private generateBriefing(
    context: UserContext,
    suggestions: ProactiveSuggestion[],
    needs: AnticipatedNeed[],
    riskLevel: ProactiveIntelligenceResult["risk_level"],
    optimizations: ProactiveIntelligenceResult["optimizations"],
  ): string {
    const parts: string[] = [];

    // Opening
    if (context.current_task) {
      parts.push(`I see you're working on ${context.current_task}.`);
    }

    // Risk summary
    if (riskLevel === "critical") {
      parts.push(`CRITICAL: There are blocking issues that need immediate attention.`);
    } else if (riskLevel === "high") {
      parts.push(`Heads up: I've identified ${suggestions.filter(s => s.priority === "high").length} important items to review.`);
    }

    // Top suggestion
    const topSuggestion = suggestions[0];
    if (topSuggestion) {
      parts.push(`${topSuggestion.title}: ${topSuggestion.description}`);
    }

    // Anticipated need
    const topNeed = needs.find(n => n.timing === "immediate");
    if (topNeed) {
      parts.push(`You'll likely need: ${topNeed.need}. ${topNeed.suggested_action}.`);
    }

    // Optimization opportunity
    if (optimizations.length > 0 && riskLevel !== "critical") {
      parts.push(`Optimization opportunity: ${optimizations[0].area} could ${optimizations[0].impact}.`);
    }

    return parts.join(" ");
  }

  /**
   * Get base cutting speed for ISO group.
   */
  private getBaseSpeed(isoGroup: string): number {
    const speeds: Record<string, number> = {
      P: 200,  // Carbon steel
      M: 120,  // Stainless
      K: 180,  // Cast iron
      N: 400,  // Aluminum
      S: 50,   // Titanium/superalloy
      H: 80,   // Hardened
    };
    return speeds[isoGroup] || 150;
  }

  /**
   * Get machine-specific warnings.
   */
  private getMachineWarnings(machineId: string): ProactiveSuggestion[] {
    const warnings: ProactiveSuggestion[] = [];
    const machineLower = machineId.toLowerCase();

    // Okuma-specific
    if (machineLower.includes("okuma")) {
      if (machineLower.includes("lb")) {
        warnings.push({
          id: `machine-okuma-${Date.now()}`,
          type: "insight",
          priority: "low",
          title: "Okuma LB Lathe",
          description: "Remember: CSS mode uses G96. Check G50 S-limit is set appropriately for small diameters.",
          confidence: 0.9,
          reasoning: "Okuma OSP controller CSS reminder",
          source: "machine_intelligence",
        });
      }
    }

    // Haas-specific
    if (machineLower.includes("haas")) {
      warnings.push({
        id: `machine-haas-${Date.now()}`,
        type: "insight",
        priority: "low",
        title: "Haas Machine",
        description: "Haas uses G187 for smoothness control. P1=rough, P2=medium, P3=finish.",
        confidence: 0.85,
        reasoning: "Haas smoothness control reminder",
        source: "machine_intelligence",
      });
    }

    return warnings;
  }

  /**
   * Add context to history.
   */
  private addToHistory(context: UserContext): void {
    this.contextHistory.push({ ...context });
    if (this.contextHistory.length > this.MAX_HISTORY) {
      this.contextHistory.shift();
    }
  }

  /**
   * Clear history (for testing).
   */
  clearHistory(): void {
    this.contextHistory = [];
  }
}

export const proactiveIntelligenceEngine = new ProactiveIntelligenceEngine();
