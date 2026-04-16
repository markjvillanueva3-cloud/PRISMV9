/**
 * ProactiveLearningEngine — AI-INTEG-MS4
 * =======================================
 * Auto-trigger learning when agents encounter new patterns, novel scenarios,
 * conflicting knowledge, or confidence drops. Builds on TK-MS8 reinforcement
 * learning foundation.
 *
 * Key Features:
 *   - Learning trigger detection (new patterns, novel scenarios, conflicts)
 *   - Trigger classification and prioritization
 *   - Knowledge quality monitoring
 *   - Auto-categorization improvements with feedback loop
 *
 * Integration Points:
 *   - TribalKnowledgeEngine (TK-MS8 reinforcement)
 *   - PRISMUnifiedOrchestratorEngine (PUOA outcomes)
 *   - KnowledgeGraphEngine (quality analysis)
 *
 * @module engines/ProactiveLearningEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { eventBus } from "./EventBus.js";

// Safe event emission wrapper
function safeEmit(type: string, payload: unknown): void {
  try {
    if (typeof eventBus.publish === "function") {
      eventBus.publish(type, payload).catch(() => {});
    }
  } catch {
    // Silent failure for event emission
  }
}

// ============================================================================
// TYPES
// ============================================================================

/** Learning trigger types */
export type LearningTriggerType =
  | "new_pattern"
  | "novel_scenario"
  | "conflict"
  | "confidence_drop";

/** Context for learning detection */
export interface LearningContext {
  material?: string;
  operation?: string;
  machine?: string;
  outcome?: "success" | "failure" | "partial";
  parameters?: Record<string, unknown>;
  knowledge_sources?: Array<{
    source: string;
    recommendation: string;
    confidence: number;
  }>;
  prior_confidence?: number;
  outcome_confidence?: number;
  is_routine?: boolean;
}

/** Learning trigger detected */
export interface LearningTrigger {
  id: string;
  type: LearningTriggerType;
  timestamp: string;
  context: LearningContext;
  details: Record<string, unknown>;
}

/** Trigger classification result */
export interface TriggerClassification {
  trigger_id: string;
  priority: "critical" | "high" | "medium" | "low";
  routing: {
    handler: string;
    queue?: string;
  };
  recommended_action: string;
  categorization_impact?: {
    categories_affected: string[];
    suggested_adjustment: string;
  };
}

/** Knowledge quality report */
export interface QualityReport {
  timestamp: string;
  overall_score: number;
  issues: Array<{
    id: string;
    type: string;
    severity: "low" | "medium" | "high";
    description: string;
  }>;
  recommendations: string[];
  stale_tips: Array<{
    tip_id: string;
    last_used: string;
    days_stale: number;
  }>;
  conflicts: Array<{
    sources: string[];
    topic: string;
    severity: "low" | "medium" | "high";
  }>;
  declining_tips: Array<{
    tip_id: string;
    success_rate_trend: "declining" | "stable" | "improving";
    current_rate: number;
  }>;
  statistics: {
    total_tips: number;
    avg_confidence: number;
    active_tips: number;
    stale_count: number;
  };
  thresholds: {
    stale_days: number;
    conflict_tolerance: number;
    min_confidence: number;
  };
  escalations: Array<{
    issue_id: string;
    action: string;
  }>;
  recent_trigger_count: number;
}

/** Categorization feedback */
export interface CategorizationFeedback {
  tip_id: string;
  original_category?: string;
  predicted_category?: string;
  was_correct: boolean;
  correct_category?: string;
  context?: Record<string, unknown>;
}

/** PUOA outcome for integration */
export interface PUOAOutcome {
  task_id: string;
  tribal_tips_used: string[];
  task_success: boolean;
  tips_helpful: string[];
  tips_unhelpful: string[];
}

/** Categorization statistics */
export interface CategorizationStats {
  feedback_count: number;
  puoa_integrations: number;
  avg_categorization_confidence: number;
  accuracy_rate: number;
  last_updated: string;
}

/** Quality alert */
export interface QualityAlert {
  id: string;
  timestamp: string;
  severity: "warning" | "error" | "critical";
  message: string;
  issue_ids: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

class ProactiveLearningEngine {
  private triggerListeners: Array<(trigger: LearningTrigger) => void> = [];
  private alertListeners: Array<(alert: QualityAlert) => void> = [];
  private feedbackHistory: CategorizationFeedback[] = [];
  private triggerCount = 0;
  private puoaIntegrations = 0;
  private categoryThresholds: Record<string, number> = {
    speeds_feeds: 0.7,
    tooling: 0.65,
    fixturing: 0.6,
    safety: 0.8,
    general: 0.5,
  };

  /**
   * Detect learning triggers from execution context.
   * Identifies new patterns, novel scenarios, conflicts, and confidence drops.
   *
   * @param context - Execution context with material, operation, outcome
   * @returns Array of detected learning triggers
   */
  detectLearningTriggers(context: LearningContext): LearningTrigger[] {
    if (context.is_routine) {
      return [];
    }

    const triggers: LearningTrigger[] = [];
    const timestamp = new Date().toISOString();

    // Detect new pattern (unknown material or unusual parameters)
    if (this.isNewPattern(context)) {
      const trigger: LearningTrigger = {
        id: `trig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: "new_pattern",
        timestamp,
        context,
        details: {
          pattern_strength: this.calculatePatternStrength(context),
          novelty_indicators: this.getNoveltyIndicators(context),
        },
      };
      triggers.push(trigger);
    }

    // Detect novel scenario (experimental operation or unusual combination)
    if (this.isNovelScenario(context)) {
      const trigger: LearningTrigger = {
        id: `trig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: "novel_scenario",
        timestamp,
        context,
        details: {
          novelty_score: this.calculateNoveltyScore(context),
          scenario_type: this.classifyScenario(context),
        },
      };
      triggers.push(trigger);
    }

    // Detect conflict (multiple sources with different recommendations)
    if (this.hasKnowledgeConflict(context)) {
      const sources = context.knowledge_sources || [];
      const trigger: LearningTrigger = {
        id: `trig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: "conflict",
        timestamp,
        context,
        details: {
          severity: this.calculateConflictSeverity(sources),
          sources: sources.map(s => s.source),
          recommendations: sources.map(s => s.recommendation),
        },
      };
      triggers.push(trigger);
    }

    // Detect confidence drop
    if (this.hasConfidenceDrop(context)) {
      const delta = (context.outcome_confidence || 0) - (context.prior_confidence || 0);
      const trigger: LearningTrigger = {
        id: `trig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: "confidence_drop",
        timestamp,
        context,
        details: {
          delta,
          prior: context.prior_confidence,
          current: context.outcome_confidence,
        },
      };
      triggers.push(trigger);
    }

    // Notify listeners and emit events
    for (const trigger of triggers) {
      this.triggerCount++;
      for (const listener of this.triggerListeners) {
        try {
          listener(trigger);
        } catch (e) {
          log.warn(`Trigger listener error: ${e}`);
        }
      }
      safeEmit("learning:trigger_detected", trigger);
    }

    return triggers;
  }

  /**
   * Register a callback for trigger detection events.
   */
  onTriggerDetected(callback: (trigger: LearningTrigger) => void): void {
    this.triggerListeners.push(callback);
  }

  /**
   * Classify a learning trigger and determine priority/routing.
   *
   * @param trigger - The learning trigger to classify
   * @returns Classification with priority, routing, and recommendations
   */
  classifyTrigger(trigger: LearningTrigger): TriggerClassification {
    const priority = this.determinePriority(trigger);
    const handler = this.determineHandler(trigger);

    return {
      trigger_id: trigger.id,
      priority,
      routing: {
        handler,
        queue: priority === "critical" ? "immediate" : "standard",
      },
      recommended_action: this.getRecommendedAction(trigger, priority),
      categorization_impact: this.assessCategorizationImpact(trigger),
    };
  }

  /**
   * Batch classify multiple triggers with sorting by priority.
   */
  batchClassifyTriggers(triggers: LearningTrigger[]): TriggerClassification[] {
    const classifications = triggers.map(t => this.classifyTrigger(t));

    // Sort by priority (critical first)
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    classifications.sort((a, b) =>
      priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    return classifications;
  }

  /**
   * Monitor knowledge quality across tribal tips and atoms.
   *
   * @returns Quality report with issues, recommendations, and statistics
   */
  monitorKnowledgeQuality(): QualityReport {
    const now = new Date();
    const issues: QualityReport["issues"] = [];
    const staleTips: QualityReport["stale_tips"] = [];
    const conflicts: QualityReport["conflicts"] = [];
    const decliningTips: QualityReport["declining_tips"] = [];
    const escalations: QualityReport["escalations"] = [];

    // Get tribal knowledge data
    let totalTips = 0;
    let activeCount = 0;
    let confidenceSum = 0;

    try {
      // Dynamic import to avoid circular dependency
      const { tribalKnowledgeEngine } = require("./TribalKnowledgeEngine.js");
      const tips = tribalKnowledgeEngine.search({ limit: 10000 });
      totalTips = tips.length;

      for (const tip of tips) {
        confidenceSum += tip.confidence || 0.5;

        // Check for stale tips (not used in 30+ days)
        const lastUsed = tip.last_used_at ? new Date(tip.last_used_at) : new Date(tip.created_at || now);
        const daysSinceUse = Math.floor((now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceUse > 30) {
          staleTips.push({
            tip_id: tip.id,
            last_used: lastUsed.toISOString(),
            days_stale: daysSinceUse,
          });
        } else {
          activeCount++;
        }

        // Check for declining success rate via reinforcement data
        const reinforcement = tribalKnowledgeEngine.getTipReinforcement?.(tip.id);
        if (reinforcement && reinforcement.recent_trend === "declining") {
          decliningTips.push({
            tip_id: tip.id,
            success_rate_trend: "declining",
            current_rate: reinforcement.success_rate,
          });
        }
      }
    } catch (e) {
      log.warn(`Could not access tribal knowledge: ${e}`);
    }

    // Generate issues from findings
    if (staleTips.length > 50) {
      issues.push({
        id: `issue-stale-${Date.now()}`,
        type: "stale_knowledge",
        severity: "medium",
        description: `${staleTips.length} tips haven't been used in 30+ days`,
      });
    }

    if (decliningTips.length > 10) {
      const issue = {
        id: `issue-declining-${Date.now()}`,
        type: "declining_effectiveness",
        severity: "high" as const,
        description: `${decliningTips.length} tips show declining success rates`,
      };
      issues.push(issue);
      escalations.push({
        issue_id: issue.id,
        action: "Review declining tips for accuracy and relevance",
      });
    }

    // Calculate overall score (0-1)
    const staleRatio = totalTips > 0 ? staleTips.length / totalTips : 0;
    const decliningRatio = totalTips > 0 ? decliningTips.length / totalTips : 0;
    const avgConfidence = totalTips > 0 ? confidenceSum / totalTips : 0.5;

    const overallScore = Math.max(0, Math.min(1,
      avgConfidence * 0.4 +
      (1 - staleRatio) * 0.3 +
      (1 - decliningRatio) * 0.3
    ));

    // Generate recommendations
    const recommendations: string[] = [];
    if (staleRatio > 0.3) {
      recommendations.push("Archive or review stale tips that haven't been used recently");
    }
    if (decliningRatio > 0.1) {
      recommendations.push("Investigate tips with declining success rates for accuracy");
    }
    if (avgConfidence < 0.6) {
      recommendations.push("Consider adding more outcome tracking to improve confidence calibration");
    }

    // Emit alerts for severe issues
    for (const issue of issues.filter(i => i.severity === "high")) {
      const alert: QualityAlert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: now.toISOString(),
        severity: "warning",
        message: issue.description,
        issue_ids: [issue.id],
      };
      for (const listener of this.alertListeners) {
        listener(alert);
      }
    }

    return {
      timestamp: now.toISOString(),
      overall_score: overallScore,
      issues,
      recommendations,
      stale_tips: staleTips.slice(0, 20), // Limit for report size
      conflicts,
      declining_tips: decliningTips.slice(0, 20),
      statistics: {
        total_tips: totalTips,
        avg_confidence: avgConfidence,
        active_tips: activeCount,
        stale_count: staleTips.length,
      },
      thresholds: {
        stale_days: 30,
        conflict_tolerance: 0.3,
        min_confidence: 0.5,
      },
      escalations,
      recent_trigger_count: this.triggerCount,
    };
  }

  /**
   * Register a callback for quality alerts.
   */
  onQualityAlert(callback: (alert: QualityAlert) => void): void {
    this.alertListeners.push(callback);
  }

  /**
   * Enhance auto-categorization with feedback from outcomes.
   *
   * @param feedback - Categorization feedback with correctness info
   */
  enhanceAutoCategorization(feedback: CategorizationFeedback): void {
    if (!feedback || !feedback.tip_id) {
      return;
    }

    this.feedbackHistory.push({
      ...feedback,
      context: { ...feedback.context, timestamp: new Date().toISOString() },
    });

    // Learn from feedback
    if (!feedback.was_correct && feedback.correct_category && feedback.predicted_category) {
      // Adjust threshold for incorrectly predicted category
      const currentThreshold = this.categoryThresholds[feedback.predicted_category] || 0.6;
      this.categoryThresholds[feedback.predicted_category] = Math.min(0.95, currentThreshold + 0.02);

      log.info(`[ProactiveLearning] Adjusted threshold for ${feedback.predicted_category} to ${this.categoryThresholds[feedback.predicted_category]}`);
    } else if (feedback.was_correct && feedback.predicted_category) {
      // Slightly lower threshold for correctly predicted category (make it easier)
      const currentThreshold = this.categoryThresholds[feedback.predicted_category] || 0.6;
      this.categoryThresholds[feedback.predicted_category] = Math.max(0.4, currentThreshold - 0.01);
    }
  }

  /**
   * Integrate with PUOA task outcomes for cross-validation.
   */
  integrateWithPUOAOutcome(outcome: PUOAOutcome): void {
    this.puoaIntegrations++;

    // Track helpful/unhelpful tips
    for (const tipId of outcome.tips_helpful) {
      this.enhanceAutoCategorization({
        tip_id: tipId,
        was_correct: true,
        context: { puoa_task: outcome.task_id, was_helpful: true },
      });
    }

    for (const tipId of outcome.tips_unhelpful) {
      this.enhanceAutoCategorization({
        tip_id: tipId,
        was_correct: false,
        context: { puoa_task: outcome.task_id, was_helpful: false },
      });
    }

    safeEmit("learning:puoa_integrated", { task_id: outcome.task_id });
  }

  /**
   * Get categorization statistics.
   */
  getCategorizationStats(): CategorizationStats {
    const correctCount = this.feedbackHistory.filter(f => f.was_correct).length;
    const total = this.feedbackHistory.length;

    return {
      feedback_count: total,
      puoa_integrations: this.puoaIntegrations,
      avg_categorization_confidence: 0.75, // Placeholder - would be computed from actual predictions
      accuracy_rate: total > 0 ? correctCount / total : 0,
      last_updated: new Date().toISOString(),
    };
  }

  /**
   * Get current category thresholds.
   */
  getCategoryThresholds(): Record<string, number> {
    return { ...this.categoryThresholds };
  }

  /**
   * Get recent categorization feedback history.
   */
  getCategorizationFeedbackHistory(limit: number): CategorizationFeedback[] {
    return this.feedbackHistory.slice(-limit);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private isNewPattern(context: LearningContext): boolean {
    // Check for unknown materials or unusual parameter combinations
    const material = (context.material || "").toLowerCase();
    const knownMaterials = ["steel", "aluminum", "titanium", "stainless", "inconel", "brass", "copper"];

    if (material && !knownMaterials.some(m => material.includes(m))) {
      return true;
    }

    // Check for unusual parameters
    const params = context.parameters || {};
    if (params.custom_param || params.experimental) {
      return true;
    }

    return false;
  }

  private isNovelScenario(context: LearningContext): boolean {
    const operation = (context.operation || "").toLowerCase();
    const novelIndicators = ["experimental", "novel", "custom", "prototype", "test"];

    return novelIndicators.some(ind => operation.includes(ind));
  }

  private hasKnowledgeConflict(context: LearningContext): boolean {
    const sources = context.knowledge_sources || [];
    if (sources.length < 2) return false;

    // Check if recommendations differ
    const recommendations = new Set(sources.map(s => s.recommendation.toLowerCase()));
    return recommendations.size > 1;
  }

  private hasConfidenceDrop(context: LearningContext): boolean {
    if (context.prior_confidence === undefined || context.outcome_confidence === undefined) {
      return false;
    }
    return context.outcome_confidence - context.prior_confidence < -0.2;
  }

  private calculatePatternStrength(context: LearningContext): number {
    let strength = 0.5;
    if (context.outcome === "success") strength += 0.2;
    if (context.parameters && Object.keys(context.parameters).length > 3) strength += 0.1;
    return Math.min(1, strength);
  }

  private getNoveltyIndicators(context: LearningContext): string[] {
    const indicators: string[] = [];
    if (context.material) indicators.push(`material:${context.material}`);
    if (context.operation) indicators.push(`operation:${context.operation}`);
    if (context.parameters) {
      for (const key of Object.keys(context.parameters)) {
        indicators.push(`param:${key}`);
      }
    }
    return indicators;
  }

  private calculateNoveltyScore(context: LearningContext): number {
    let score = 0.3;
    if (context.operation?.includes("experimental")) score += 0.4;
    if (context.outcome === "success") score += 0.2;
    return Math.min(1, score);
  }

  private classifyScenario(context: LearningContext): string {
    if (context.operation?.includes("experimental")) return "experimental";
    if (context.operation?.includes("prototype")) return "prototype";
    return "novel";
  }

  private calculateConflictSeverity(sources: LearningContext["knowledge_sources"]): string {
    if (!sources || sources.length < 2) return "low";

    // Higher confidence sources in conflict = higher severity
    const avgConfidence = sources.reduce((sum, s) => sum + s.confidence, 0) / sources.length;
    if (avgConfidence > 0.8) return "high";
    if (avgConfidence > 0.6) return "medium";
    return "low";
  }

  private determinePriority(trigger: LearningTrigger): TriggerClassification["priority"] {
    // Conflicts and confidence drops are higher priority
    if (trigger.type === "conflict") {
      const severity = trigger.details.severity as string;
      if (severity === "high") return "critical";
      if (severity === "medium") return "high";
      return "medium";
    }

    if (trigger.type === "confidence_drop") {
      const delta = (trigger.details.delta as number) || 0;
      if (delta < -0.4) return "critical";
      if (delta < -0.3) return "high";
      return "medium";
    }

    if (trigger.type === "new_pattern") {
      const strength = (trigger.details.pattern_strength as number) || 0.5;
      if (strength > 0.8) return "high";
      return "medium";
    }

    // Novel scenarios are generally lower priority
    const novelty = (trigger.details.novelty_score as number) || 0.5;
    if (novelty > 0.7) return "medium";
    return "low";
  }

  private determineHandler(trigger: LearningTrigger): string {
    switch (trigger.type) {
      case "conflict":
        return "ConflictResolutionHandler";
      case "confidence_drop":
        return "ConfidenceCalibrationHandler";
      case "new_pattern":
        return "PatternLearningHandler";
      case "novel_scenario":
        return "ScenarioCaptureHandler";
      default:
        return "DefaultLearningHandler";
    }
  }

  private getRecommendedAction(trigger: LearningTrigger, priority: string): string {
    switch (trigger.type) {
      case "conflict":
        return priority === "critical"
          ? "Immediate review required: conflicting knowledge from authoritative sources"
          : "Review conflicting recommendations and update knowledge base";
      case "confidence_drop":
        return "Investigate cause of confidence drop and recalibrate if necessary";
      case "new_pattern":
        return "Capture new pattern for potential knowledge base addition";
      case "novel_scenario":
        return "Document scenario outcome for future reference";
      default:
        return "Review and process learning trigger";
    }
  }

  private assessCategorizationImpact(trigger: LearningTrigger): TriggerClassification["categorization_impact"] {
    if (trigger.type !== "new_pattern" && trigger.type !== "conflict") {
      return undefined;
    }

    const categories: string[] = [];
    if (trigger.context.material) categories.push("material_handling");
    if (trigger.context.operation) categories.push("operations");

    if (trigger.details.category_hint) {
      categories.push(trigger.details.category_hint as string);
    }

    return {
      categories_affected: categories,
      suggested_adjustment: trigger.type === "conflict"
        ? "Increase threshold for affected categories to reduce false positives"
        : "Consider adding new subcategory for emerging pattern",
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const proactiveLearningEngine = new ProactiveLearningEngine();
