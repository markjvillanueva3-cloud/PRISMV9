/**
 * ProactiveAIIntelligenceEngine — Proactive Manufacturing Intelligence
 *
 * This engine monitors session activity and proactively suggests optimizations,
 * identifies patterns, and provides intelligent recommendations without being asked.
 *
 * Capabilities:
 * - Pattern recognition across sessions
 * - Proactive optimization suggestions
 * - Anomaly detection in manufacturing parameters
 * - Learning from user corrections
 * - Confidence calibration over time
 * - Cross-session knowledge transfer
 *
 * @module engines/ProactiveAIIntelligenceEngine
 */

import { autonomousSession, type IntentHistoryEntry } from "./AutonomousSessionIntegrationEngine.js";
import { deepAIIntelligenceEngine } from "./DeepAIIntelligenceEngine.js";
import { aiFeatureAutoRegistry } from "./AIFeatureAutoRegistryEngine.js";
import { prismSelfAwarenessEngine } from "./PRISMSelfAwarenessEngine.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Proactive suggestion type */
export type SuggestionType =
  | "optimization"      // Improve efficiency
  | "safety"            // Safety concern
  | "quality"           // Quality improvement
  | "cost"              // Cost reduction
  | "time"              // Time saving
  | "knowledge"         // Knowledge gap
  | "pattern"           // Recurring pattern
  | "anomaly";          // Unusual parameter

/** Proactive suggestion */
export interface ProactiveSuggestion {
  id: string;
  type: SuggestionType;
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  context: Record<string, unknown>;
  confidence: number;
  reasoning: string[];
  actions: SuggestedAction[];
  timestamp: string;
  expires?: string;
}

/** Suggested action to take */
export interface SuggestedAction {
  type: "mcp_action" | "skill" | "hook" | "manual";
  id: string;
  description: string;
  parameters?: Record<string, unknown>;
  autoExecutable: boolean;
}

/** Pattern detected across sessions */
export interface DetectedPattern {
  id: string;
  name: string;
  frequency: number;
  lastSeen: string;
  contexts: Record<string, unknown>[];
  suggestion?: string;
}

/** Anomaly detection result */
export interface AnomalyResult {
  detected: boolean;
  parameter: string;
  expectedRange: [number, number];
  actualValue: number;
  deviation: number;
  severity: "critical" | "warning" | "info";
  recommendation: string;
}

/** Learning from corrections */
export interface CorrectionLearning {
  originalSuggestion: string;
  userCorrection: string;
  context: Record<string, unknown>;
  timestamp: string;
  applied: boolean;
}

/** Confidence calibration data */
export interface ConfidenceCalibration {
  totalPredictions: number;
  correctPredictions: number;
  byDomain: Record<string, { total: number; correct: number }>;
  calibrationScore: number;
  lastUpdated: string;
}

/** Proactive analysis result */
export interface ProactiveAnalysis {
  suggestions: ProactiveSuggestion[];
  patterns: DetectedPattern[];
  anomalies: AnomalyResult[];
  confidence: number;
  analysisTime_ms: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class ProactiveAIIntelligenceEngine {
  private patterns: Map<string, DetectedPattern> = new Map();
  private corrections: CorrectionLearning[] = [];
  private calibration: ConfidenceCalibration;
  private suggestionHistory: ProactiveSuggestion[] = [];
  private anomalyThresholds: Map<string, [number, number]> = new Map();
  private initialized = false;

  constructor() {
    this.calibration = {
      totalPredictions: 0,
      correctPredictions: 0,
      byDomain: {},
      calibrationScore: 0.8, // Start optimistic
      lastUpdated: new Date().toISOString(),
    };
    this.initializeThresholds();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize anomaly thresholds for manufacturing parameters
   */
  private initializeThresholds(): void {
    // Cutting speed limits (m/min)
    this.anomalyThresholds.set("cutting_speed_steel", [30, 300]);
    this.anomalyThresholds.set("cutting_speed_aluminum", [150, 1000]);
    this.anomalyThresholds.set("cutting_speed_titanium", [20, 100]);

    // Feed rate limits (mm/rev)
    this.anomalyThresholds.set("feed_rate_rough", [0.1, 0.8]);
    this.anomalyThresholds.set("feed_rate_finish", [0.02, 0.2]);

    // Depth of cut limits (mm)
    this.anomalyThresholds.set("doc_rough", [0.5, 10]);
    this.anomalyThresholds.set("doc_finish", [0.05, 0.5]);

    // Spindle speed limits (RPM)
    this.anomalyThresholds.set("spindle_rpm", [50, 24000]);

    // Temperature limits (C)
    this.anomalyThresholds.set("cutting_temp", [100, 800]);

    // Force limits (N)
    this.anomalyThresholds.set("cutting_force", [10, 10000]);

    // Surface finish limits (Ra)
    this.anomalyThresholds.set("surface_finish_ra", [0.1, 12.5]);

    this.initialized = true;
  }

  // ============================================================================
  // PROACTIVE ANALYSIS
  // ============================================================================

  /**
   * Perform proactive analysis on current context
   */
  async analyze(context: {
    intent?: string;
    parameters?: Record<string, unknown>;
    sessionId?: string;
    domain?: string;
  }): Promise<ProactiveAnalysis> {
    const startTime = Date.now();
    const suggestions: ProactiveSuggestion[] = [];
    const anomalies: AnomalyResult[] = [];

    // Check for parameter anomalies
    if (context.parameters) {
      const paramAnomalies = this.detectAnomalies(context.parameters);
      anomalies.push(...paramAnomalies);

      // Generate safety suggestions for anomalies
      for (const anomaly of paramAnomalies) {
        if (anomaly.severity === "critical" || anomaly.severity === "warning") {
          suggestions.push(this.createAnomalySuggestion(anomaly, context));
        }
      }
    }

    // Analyze intent for optimization opportunities
    if (context.intent) {
      const intentSuggestions = await this.analyzeIntent(context.intent, context.domain);
      suggestions.push(...intentSuggestions);
    }

    // Check session history for patterns
    if (context.sessionId) {
      const history = autonomousSession.getSessionHistory(context.sessionId);
      const patternSuggestions = this.analyzeSessionPatterns(history);
      suggestions.push(...patternSuggestions);
    }

    // Get detected patterns
    const patterns = Array.from(this.patterns.values());

    // Calculate overall confidence
    const confidence = this.calculateConfidence(suggestions, anomalies);

    return {
      suggestions,
      patterns,
      anomalies,
      confidence,
      analysisTime_ms: Date.now() - startTime,
    };
  }

  /**
   * Analyze intent for optimization opportunities
   */
  private async analyzeIntent(intent: string, domain?: string): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = [];
    const lowerIntent = intent.toLowerCase();

    // Check for missing context that could improve results
    const missingContext = this.detectMissingContext(intent);
    if (missingContext.length > 0) {
      suggestions.push({
        id: `suggest-context-${Date.now()}`,
        type: "knowledge",
        priority: "medium",
        title: "Additional Context Available",
        description: `Providing more context could improve results. Consider specifying: ${missingContext.join(", ")}`,
        context: { intent, missingContext },
        confidence: 0.75,
        reasoning: [
          "Intent analysis detected missing context",
          `${missingContext.length} context elements could be specified`,
          "More context typically improves recommendation accuracy",
        ],
        actions: missingContext.map((ctx) => ({
          type: "manual" as const,
          id: `add-${ctx}`,
          description: `Specify ${ctx}`,
          autoExecutable: false,
        })),
        timestamp: new Date().toISOString(),
      });
    }

    // Check for tribal knowledge that might help.
    // searchTribalKnowledge returns Promise<TribalKnowledgeEntry[]> — must await
    // before iterating; the enclosing analyzeIntent is already async (L231).
    const tribalTips = await prismSelfAwarenessEngine.searchTribalKnowledge(intent);
    if (tribalTips.length > 0) {
      suggestions.push({
        id: `tribal-${Date.now()}`,
        type: "knowledge",
        priority: "low",
        title: "Relevant Shop Floor Tips Found",
        description: `Found ${tribalTips.length} tribal knowledge tips that may be relevant`,
        context: { intent, tipCount: tribalTips.length },
        confidence: 0.7,
        reasoning: [
          `Searched tribal knowledge for: "${intent.substring(0, 30)}..."`,
          `Found ${tribalTips.length} potentially relevant tips`,
          "Tribal knowledge captures shop floor experience",
        ],
        actions: [
          {
            type: "mcp_action",
            id: "prism_ai:tribal_search",
            description: "View tribal knowledge tips",
            parameters: { query: intent },
            autoExecutable: true,
          },
        ],
        timestamp: new Date().toISOString(),
      });
    }

    // Check for playbook rules that might apply.
    // searchPlaybookRules returns Promise<string[]> — must await before reading
    // length/some on it.
    const rules = await prismSelfAwarenessEngine.searchPlaybookRules(intent);
    if (rules.length > 0) {
      const hasAntiPattern = rules.some((r: any) => r.category === "anti_pattern");
      if (hasAntiPattern) {
        suggestions.push({
          id: `playbook-warning-${Date.now()}`,
          type: "safety",
          priority: "high",
          title: "Playbook Anti-Pattern Detected",
          description: "Your intent matches known anti-patterns in the machining playbook",
          context: { intent, ruleCount: rules.length },
          confidence: 0.85,
          reasoning: [
            "Intent matches playbook anti-pattern rules",
            "Anti-patterns capture known failure modes",
            "Review rules before proceeding",
          ],
          actions: [
            {
              type: "mcp_action",
              id: "prism_ai:playbook_search",
              description: "View matching playbook rules",
              parameters: { query: intent },
              autoExecutable: true,
            },
          ],
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Suggest optimization for common intents
    if (lowerIntent.includes("speed") && lowerIntent.includes("feed")) {
      suggestions.push({
        id: `optimize-sf-${Date.now()}`,
        type: "optimization",
        priority: "medium",
        title: "Speed/Feed Optimization Available",
        description: "Consider using the advanced speed/feed optimizer with Kienzle model",
        context: { intent },
        confidence: 0.8,
        reasoning: [
          "Intent mentions speed and feed",
          "Advanced optimizer uses Kienzle force model",
          "Can optimize for tool life, productivity, or surface finish",
        ],
        actions: [
          {
            type: "mcp_action",
            id: "prism_calc:ultimate_speed_feed",
            description: "Run advanced speed/feed optimization",
            autoExecutable: true,
          },
        ],
        timestamp: new Date().toISOString(),
      });
    }

    return suggestions;
  }

  /**
   * Detect missing context in an intent
   */
  private detectMissingContext(intent: string): string[] {
    const missing: string[] = [];
    const lowerIntent = intent.toLowerCase();

    // Check for material specification
    const materialKeywords = ["steel", "aluminum", "titanium", "inconel", "brass", "copper", "d2", "m2", "a2", "s7", "h13"];
    if (!materialKeywords.some((m) => lowerIntent.includes(m))) {
      missing.push("material type");
    }

    // Check for machine type
    const machineKeywords = ["lathe", "mill", "turning", "milling", "drill", "grind", "edm"];
    if (!machineKeywords.some((m) => lowerIntent.includes(m))) {
      missing.push("machine type");
    }

    // Check for operation type
    const opKeywords = ["rough", "finish", "semi-finish", "bore", "face", "thread", "groove"];
    if (!opKeywords.some((o) => lowerIntent.includes(o))) {
      missing.push("operation type");
    }

    // Check for tool specification
    const toolKeywords = ["carbide", "hss", "ceramic", "cbn", "pcd", "insert", "end mill", "drill bit"];
    if (!toolKeywords.some((t) => lowerIntent.includes(t))) {
      missing.push("tool type");
    }

    return missing;
  }

  /**
   * Analyze session patterns for suggestions
   */
  private analyzeSessionPatterns(history: IntentHistoryEntry[]): ProactiveSuggestion[] {
    const suggestions: ProactiveSuggestion[] = [];

    if (history.length < 3) {
      return suggestions; // Need some history to detect patterns
    }

    // Check for repeated failures
    const recentFailures = history.filter((h) => h.result === "failed").slice(-5);
    if (recentFailures.length >= 2) {
      suggestions.push({
        id: `pattern-failures-${Date.now()}`,
        type: "pattern",
        priority: "high",
        title: "Repeated Failures Detected",
        description: `${recentFailures.length} recent failures detected. Review approach.`,
        context: { failures: recentFailures },
        confidence: 0.9,
        reasoning: [
          `${recentFailures.length} failed intents in recent history`,
          "May indicate incorrect parameters or approach",
          "Consider reviewing session context",
        ],
        actions: [
          {
            type: "mcp_action",
            id: "prism_ai:session_history",
            description: "Review session history",
            autoExecutable: true,
          },
        ],
        timestamp: new Date().toISOString(),
      });
    }

    // Check for low confidence results
    const lowConfidence = history.filter((h) => h.confidence < 0.6);
    if (lowConfidence.length > history.length * 0.3) {
      suggestions.push({
        id: `pattern-confidence-${Date.now()}`,
        type: "quality",
        priority: "medium",
        title: "Low Confidence Pattern",
        description: "Many recent results had low confidence. Consider providing more context.",
        context: { lowConfidenceCount: lowConfidence.length },
        confidence: 0.75,
        reasoning: [
          `${lowConfidence.length}/${history.length} results below 60% confidence`,
          "Low confidence often indicates missing context",
          "Specifying material, machine, or operation can help",
        ],
        actions: [
          {
            type: "manual",
            id: "add-context",
            description: "Add more context to intents",
            autoExecutable: false,
          },
        ],
        timestamp: new Date().toISOString(),
      });
    }

    // Track recurring intents
    const intentCounts = new Map<string, number>();
    for (const entry of history) {
      const key = entry.intent.toLowerCase().substring(0, 50);
      intentCounts.set(key, (intentCounts.get(key) ?? 0) + 1);
    }

    for (const [intent, count] of intentCounts) {
      if (count >= 3) {
        const patternId = `recurring-${intent.substring(0, 20).replace(/\s+/g, "-")}`;

        if (!this.patterns.has(patternId)) {
          this.patterns.set(patternId, {
            id: patternId,
            name: `Recurring: ${intent.substring(0, 30)}...`,
            frequency: count,
            lastSeen: new Date().toISOString(),
            contexts: [],
            suggestion: "Consider creating a skill for this recurring task",
          });
        } else {
          const pattern = this.patterns.get(patternId)!;
          pattern.frequency = count;
          pattern.lastSeen = new Date().toISOString();
        }
      }
    }

    return suggestions;
  }

  // ============================================================================
  // ANOMALY DETECTION
  // ============================================================================

  /**
   * Detect anomalies in manufacturing parameters
   */
  detectAnomalies(parameters: Record<string, unknown>): AnomalyResult[] {
    const anomalies: AnomalyResult[] = [];

    for (const [param, value] of Object.entries(parameters)) {
      if (typeof value !== "number") continue;

      // Find matching threshold
      let threshold: [number, number] | undefined;
      const normalizedParam = param.toLowerCase().replace(/[\s-]/g, "_");
      for (const [key, range] of this.anomalyThresholds) {
        const normalizedKey = key.toLowerCase().replace(/[\s-]/g, "_");
        // Exact match or param contains key or key contains param
        if (normalizedParam === normalizedKey ||
            normalizedParam.includes(normalizedKey) ||
            normalizedKey.includes(normalizedParam)) {
          threshold = range;
          break;
        }
      }

      if (!threshold) continue;

      const [min, max] = threshold;
      if (value < min || value > max) {
        const deviation = value < min
          ? (min - value) / min
          : (value - max) / max;

        const severity: "critical" | "warning" | "info" =
          deviation > 0.5 ? "critical" :
          deviation > 0.2 ? "warning" : "info";

        anomalies.push({
          detected: true,
          parameter: param,
          expectedRange: threshold,
          actualValue: value,
          deviation,
          severity,
          recommendation: this.getAnomalyRecommendation(param, value, threshold),
        });
      }
    }

    return anomalies;
  }

  /**
   * Get recommendation for an anomaly
   */
  private getAnomalyRecommendation(param: string, value: number, threshold: [number, number]): string {
    const [min, max] = threshold;

    if (value < min) {
      return `${param} is below minimum (${value} < ${min}). Consider increasing to at least ${min}.`;
    } else {
      return `${param} exceeds maximum (${value} > ${max}). Consider reducing to at most ${max}.`;
    }
  }

  /**
   * Create a suggestion from an anomaly
   */
  private createAnomalySuggestion(
    anomaly: AnomalyResult,
    context: Record<string, unknown>
  ): ProactiveSuggestion {
    return {
      id: `anomaly-${anomaly.parameter}-${Date.now()}`,
      type: anomaly.severity === "critical" ? "safety" : "quality",
      priority: anomaly.severity === "critical" ? "critical" : "high",
      title: `Parameter Anomaly: ${anomaly.parameter}`,
      description: anomaly.recommendation,
      context: { ...context, anomaly },
      confidence: 0.9,
      reasoning: [
        `Value ${anomaly.actualValue} outside range [${anomaly.expectedRange[0]}, ${anomaly.expectedRange[1]}]`,
        `Deviation: ${(anomaly.deviation * 100).toFixed(1)}%`,
        anomaly.severity === "critical"
          ? "Critical deviation may cause tool damage or part scrap"
          : "Consider adjusting parameter for optimal results",
      ],
      actions: [
        {
          type: "manual",
          id: `fix-${anomaly.parameter}`,
          description: `Adjust ${anomaly.parameter} to within range`,
          autoExecutable: false,
        },
      ],
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================================================
  // LEARNING & CALIBRATION
  // ============================================================================

  /**
   * Learn from user correction
   */
  learnFromCorrection(
    suggestionId: string,
    correction: string,
    applied: boolean
  ): void {
    const suggestion = this.suggestionHistory.find((s) => s.id === suggestionId);

    // Always record the correction, even if suggestion not found
    this.corrections.push({
      originalSuggestion: suggestion?.title ?? suggestionId,
      userCorrection: correction,
      context: suggestion?.context ?? {},
      timestamp: new Date().toISOString(),
      applied,
    });

    // Update calibration
    this.calibration.totalPredictions++;
    if (applied) {
      this.calibration.correctPredictions++;
    }
    this.calibration.calibrationScore =
      this.calibration.correctPredictions / this.calibration.totalPredictions;
    this.calibration.lastUpdated = new Date().toISOString();

    log.info(`[ProactiveAI] Learned from correction. Calibration: ${(this.calibration.calibrationScore * 100).toFixed(1)}%`);
  }

  /**
   * Record prediction outcome for calibration
   */
  recordOutcome(domain: string, correct: boolean): void {
    this.calibration.totalPredictions++;
    if (correct) {
      this.calibration.correctPredictions++;
    }

    // Update by domain
    if (!this.calibration.byDomain[domain]) {
      this.calibration.byDomain[domain] = { total: 0, correct: 0 };
    }
    this.calibration.byDomain[domain].total++;
    if (correct) {
      this.calibration.byDomain[domain].correct++;
    }

    // Recalculate calibration score
    this.calibration.calibrationScore =
      this.calibration.correctPredictions / this.calibration.totalPredictions;
    this.calibration.lastUpdated = new Date().toISOString();
  }

  /**
   * Get calibration data
   */
  getCalibration(): ConfidenceCalibration {
    return { ...this.calibration };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Calculate overall confidence for analysis
   */
  private calculateConfidence(
    suggestions: ProactiveSuggestion[],
    anomalies: AnomalyResult[]
  ): number {
    if (suggestions.length === 0 && anomalies.length === 0) {
      return 0.9; // No issues found, high confidence
    }

    // Weight by severity
    let totalWeight = 0;
    let weightedSum = 0;

    for (const suggestion of suggestions) {
      const weight = suggestion.priority === "critical" ? 4 :
                     suggestion.priority === "high" ? 3 :
                     suggestion.priority === "medium" ? 2 : 1;
      totalWeight += weight;
      weightedSum += suggestion.confidence * weight;
    }

    for (const anomaly of anomalies) {
      const weight = anomaly.severity === "critical" ? 4 :
                     anomaly.severity === "warning" ? 2 : 1;
      totalWeight += weight;
      weightedSum += 0.9 * weight; // High confidence in anomaly detection
    }

    // Apply calibration factor
    const baseConfidence = totalWeight > 0 ? weightedSum / totalWeight : 0.8;
    return baseConfidence * this.calibration.calibrationScore;
  }

  /**
   * Get proactive suggestions for common scenarios
   */
  getQuickSuggestions(scenario: string): ProactiveSuggestion[] {
    const suggestions: ProactiveSuggestion[] = [];
    const lowerScenario = scenario.toLowerCase();

    if (lowerScenario.includes("new part") || lowerScenario.includes("first article")) {
      suggestions.push({
        id: `quick-fai-${Date.now()}`,
        type: "quality",
        priority: "high",
        title: "FAI (First Article Inspection) Required",
        description: "New parts require FAI documentation per AS9102",
        context: { scenario },
        confidence: 0.95,
        reasoning: ["New part detected", "FAI is industry standard", "Documents process capability"],
        actions: [
          {
            type: "mcp_action",
            id: "prism_quality:fai_checklist",
            description: "Generate FAI checklist",
            autoExecutable: true,
          },
        ],
        timestamp: new Date().toISOString(),
      });
    }

    if (lowerScenario.includes("tool change") || lowerScenario.includes("new tool")) {
      suggestions.push({
        id: `quick-tool-${Date.now()}`,
        type: "optimization",
        priority: "medium",
        title: "Tool Measurement Recommended",
        description: "Measure new tool to update tool table",
        context: { scenario },
        confidence: 0.9,
        reasoning: ["Tool change detected", "Tool length/diameter verification", "Prevents crashes"],
        actions: [
          {
            type: "manual",
            id: "measure-tool",
            description: "Measure tool length and diameter",
            autoExecutable: false,
          },
        ],
        timestamp: new Date().toISOString(),
      });
    }

    return suggestions;
  }

  /**
   * Get detected patterns
   */
  getPatterns(): DetectedPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get suggestion history
   */
  getSuggestionHistory(limit = 50): ProactiveSuggestion[] {
    return this.suggestionHistory.slice(-limit);
  }

  /**
   * Get correction history
   */
  getCorrectionHistory(): CorrectionLearning[] {
    return [...this.corrections];
  }

  /**
   * Add custom anomaly threshold
   */
  addThreshold(parameter: string, min: number, max: number): void {
    this.anomalyThresholds.set(parameter, [min, max]);
    log.info(`[ProactiveAI] Added threshold for ${parameter}: [${min}, ${max}]`);
  }

  /**
   * Get all thresholds
   */
  getThresholds(): Map<string, [number, number]> {
    return new Map(this.anomalyThresholds);
  }

  /**
   * Get summary
   */
  getSummary(): string {
    return `ProactiveAIIntelligenceEngine: Manufacturing Intelligence Monitor
Patterns: ${this.patterns.size}
Suggestions: ${this.suggestionHistory.length}
Corrections: ${this.corrections.length}
Calibration: ${(this.calibration.calibrationScore * 100).toFixed(1)}%
Thresholds: ${this.anomalyThresholds.size}`;
  }
}

// Export singleton
export const proactiveAI = new ProactiveAIIntelligenceEngine();
