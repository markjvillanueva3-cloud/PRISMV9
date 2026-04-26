/**
 * BackendRouterEngine — LOCAL-LLM-MS0 Hybrid Backend
 * ===================================================
 *
 * Smart routing between local Qwen (Ollama) and DeepSeek V4 API:
 *
 * Routing logic:
 * - Context > 30K tokens → DeepSeek Flash (1M context)
 * - Tags: critical/agentic → DeepSeek Pro (best quality)
 * - Complex multi-step → DeepSeek Flash
 * - Default → Qwen local (free, fast)
 *
 * Learns from outcomes to improve routing over time.
 *
 * @module engines/BackendRouterEngine
 * @milestone LOCAL-LLM-MS0 Hybrid Phase 1
 */

import { z } from "zod";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { log } from "../utils/Logger.js";

// ============================================================================
// Schemas
// ============================================================================

export const BackendTypeSchema = z.enum(["qwen", "deepseek-flash", "deepseek-pro"]);
export type BackendType = z.infer<typeof BackendTypeSchema>;

export const TaskComplexitySchema = z.enum(["simple", "moderate", "complex", "critical"]);
export type TaskComplexity = z.infer<typeof TaskComplexitySchema>;

export const RouteTaskInputSchema = z.object({
  task: z.string().min(1).describe("Task description"),
  contextLength: z.number().int().min(0).default(0).describe("Estimated context length in tokens"),
  tags: z.array(z.string()).default([]).describe("Task tags (e.g., critical, agentic, code, explain)"),
  preferLocal: z.boolean().default(true).describe("Prefer local inference when possible"),
  maxLatencyMs: z.number().int().optional().describe("Maximum acceptable latency"),
});

export const RouteTaskOutputSchema = z.object({
  backend: BackendTypeSchema.describe("Recommended backend"),
  reason: z.string().describe("Why this backend was selected"),
  complexity: TaskComplexitySchema.describe("Assessed task complexity"),
  estimatedLatencyMs: z.number().describe("Expected latency"),
  estimatedCost: z.number().describe("Estimated cost in USD (0 for local/free)"),
  confidence: z.number().min(0).max(1).describe("Routing confidence"),
  alternatives: z.array(z.object({
    backend: BackendTypeSchema,
    reason: z.string(),
  })).describe("Alternative backends if primary fails"),
});

export const RecordOutcomeInputSchema = z.object({
  taskSignature: z.string().describe("Task signature for pattern matching"),
  backend: BackendTypeSchema.describe("Backend that was used"),
  success: z.boolean().describe("Whether task completed successfully"),
  qualityScore: z.number().min(0).max(1).optional().describe("Quality score 0-1"),
  latencyMs: z.number().describe("Actual latency"),
  tokensUsed: z.number().optional().describe("Tokens consumed"),
});

export const RoutingStatsOutputSchema = z.object({
  totalRoutes: z.number(),
  byBackend: z.record(z.string(), z.number()),
  successRates: z.record(z.string(), z.number()),
  avgLatencies: z.record(z.string(), z.number()),
  learnedPatterns: z.number(),
});

export type RouteTaskInput = z.infer<typeof RouteTaskInputSchema>;
export type RouteTaskOutput = z.infer<typeof RouteTaskOutputSchema>;
export type RecordOutcomeInput = z.infer<typeof RecordOutcomeInputSchema>;
export type RoutingStatsOutput = z.infer<typeof RoutingStatsOutputSchema>;

// ============================================================================
// Configuration
// ============================================================================

interface RoutingThresholds {
  contextUpgradeTokens: number;
  complexityUpgradeTags: string[];
  criticalTags: string[];
  maxLocalContextTokens: number;
}

const DEFAULT_THRESHOLDS: RoutingThresholds = {
  contextUpgradeTokens: 30000,
  complexityUpgradeTags: ["agentic", "multi-step", "reasoning", "analysis"],
  criticalTags: ["critical", "safety", "production", "mission-critical"],
  maxLocalContextTokens: 32000,
};

interface RoutingOutcome {
  taskSignature: string;
  backend: BackendType;
  success: boolean;
  qualityScore: number;
  latencyMs: number;
  timestamp: number;
}

const OUTCOMES_PATH = "mcp-server/data/state/routing-outcomes.json";
const THRESHOLDS_PATH = "mcp-server/data/config/routing-thresholds.json";

// ============================================================================
// Engine Implementation
// ============================================================================

class BackendRouterEngine {
  private thresholds: RoutingThresholds;
  private outcomes: RoutingOutcome[] = [];
  private routeCount: Record<BackendType, number> = { "qwen": 0, "deepseek-flash": 0, "deepseek-pro": 0 };

  constructor() {
    this.thresholds = this.loadThresholds();
    this.outcomes = this.loadOutcomes();
  }

  private loadThresholds(): RoutingThresholds {
    if (existsSync(THRESHOLDS_PATH)) {
      try {
        return { ...DEFAULT_THRESHOLDS, ...JSON.parse(readFileSync(THRESHOLDS_PATH, "utf-8")) };
      } catch {
        log.warn("BackendRouterEngine", "Failed to load thresholds, using defaults");
      }
    }
    return DEFAULT_THRESHOLDS;
  }

  private loadOutcomes(): RoutingOutcome[] {
    if (existsSync(OUTCOMES_PATH)) {
      try {
        const data = JSON.parse(readFileSync(OUTCOMES_PATH, "utf-8"));
        return Array.isArray(data) ? data.slice(-1000) : []; // Keep last 1000
      } catch {
        log.warn("BackendRouterEngine", "Failed to load outcomes");
      }
    }
    return [];
  }

  private saveOutcomes(): void {
    try {
      writeFileSync(OUTCOMES_PATH, JSON.stringify(this.outcomes.slice(-1000), null, 2));
    } catch {
      log.warn("BackendRouterEngine", "Failed to save outcomes");
    }
  }

  /**
   * Extract task signature for pattern matching
   */
  private getTaskSignature(task: string): string {
    // Extract key patterns from task description
    const keywords = task.toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 10)
      .sort()
      .join("-");
    return keywords || "unknown";
  }

  /**
   * Assess task complexity from description and tags
   */
  private assessComplexity(task: string, tags: string[]): TaskComplexity {
    const lowerTask = task.toLowerCase();
    const allTags = tags.map(t => t.toLowerCase());

    // Critical indicators
    if (allTags.some(t => this.thresholds.criticalTags.includes(t))) {
      return "critical";
    }

    // Complex indicators
    const complexPatterns = [
      /multi[- ]?step/i,
      /complex/i,
      /architect/i,
      /design.*system/i,
      /refactor.*entire/i,
      /analyze.*codebase/i,
      /debug.*production/i,
    ];
    if (complexPatterns.some(p => p.test(lowerTask)) ||
        allTags.some(t => this.thresholds.complexityUpgradeTags.includes(t))) {
      return "complex";
    }

    // Moderate indicators
    const moderatePatterns = [
      /explain/i,
      /implement/i,
      /fix.*bug/i,
      /write.*test/i,
      /review/i,
    ];
    if (moderatePatterns.some(p => p.test(lowerTask))) {
      return "moderate";
    }

    return "simple";
  }

  /**
   * Check historical outcomes for similar tasks
   */
  private checkHistoricalOutcomes(signature: string, backend: BackendType): { successRate: number; avgLatency: number; count: number } {
    const relevant = this.outcomes.filter(o =>
      o.taskSignature === signature && o.backend === backend
    );

    if (relevant.length === 0) {
      return { successRate: 0.5, avgLatency: 0, count: 0 };
    }

    const successRate = relevant.filter(o => o.success).length / relevant.length;
    const avgLatency = relevant.reduce((sum, o) => sum + o.latencyMs, 0) / relevant.length;

    return { successRate, avgLatency, count: relevant.length };
  }

  /**
   * Route task to optimal backend
   *
   * @param input - Task routing parameters
   * @returns Routing decision with backend, reason, and alternatives
   */
  route(input: RouteTaskInput): RouteTaskOutput {
    const validated = RouteTaskInputSchema.parse(input);
    const { task, contextLength, tags, preferLocal, maxLatencyMs } = validated;

    const complexity = this.assessComplexity(task, tags);
    const signature = this.getTaskSignature(task);
    const lowerTags = tags.map(t => t.toLowerCase());

    // Default result
    let backend: BackendType = "qwen";
    let reason = "Default: local Qwen inference (free, fast)";
    let estimatedLatencyMs = 2000;
    let estimatedCost = 0;
    let confidence = 0.8;
    const alternatives: Array<{ backend: BackendType; reason: string }> = [];

    // Rule 1: Context length exceeds local limit → DeepSeek
    if (contextLength > this.thresholds.maxLocalContextTokens) {
      backend = "deepseek-flash";
      reason = `Context ${contextLength} tokens exceeds local limit (${this.thresholds.maxLocalContextTokens})`;
      estimatedLatencyMs = 5000;
      estimatedCost = 0; // Free tier
      confidence = 0.95;
      alternatives.push({ backend: "deepseek-pro", reason: "Higher quality if needed" });
    }
    // Rule 2: Critical tags → DeepSeek Pro
    else if (lowerTags.some(t => this.thresholds.criticalTags.includes(t))) {
      backend = "deepseek-pro";
      reason = `Critical task detected (tags: ${tags.join(", ")})`;
      estimatedLatencyMs = 8000;
      estimatedCost = 0.001; // ~$0.07/M tokens, typical task ~15K
      confidence = 0.9;
      alternatives.push({ backend: "deepseek-flash", reason: "Faster if Pro unavailable" });
    }
    // Rule 3: Complex/agentic tasks → DeepSeek Flash
    else if (complexity === "complex" || lowerTags.some(t => this.thresholds.complexityUpgradeTags.includes(t))) {
      backend = "deepseek-flash";
      reason = `Complex task: ${complexity} complexity${tags.length ? ` (tags: ${tags.join(", ")})` : ""}`;
      estimatedLatencyMs = 5000;
      estimatedCost = 0;
      confidence = 0.85;
      alternatives.push({ backend: "qwen", reason: "Fallback if API unavailable" });
      alternatives.push({ backend: "deepseek-pro", reason: "Upgrade if quality insufficient" });
    }
    // Rule 4: Context approaching limit → DeepSeek Flash
    else if (contextLength > this.thresholds.contextUpgradeTokens) {
      backend = "deepseek-flash";
      reason = `Context ${contextLength} tokens approaching local limit`;
      estimatedLatencyMs = 4000;
      estimatedCost = 0;
      confidence = 0.8;
      alternatives.push({ backend: "qwen", reason: "Local fallback for shorter context" });
    }
    // Rule 5: Check historical success rates
    else {
      const qwenHistory = this.checkHistoricalOutcomes(signature, "qwen");
      const flashHistory = this.checkHistoricalOutcomes(signature, "deepseek-flash");

      // If Qwen failed historically for this pattern, try DeepSeek
      if (qwenHistory.count >= 3 && qwenHistory.successRate < 0.5) {
        backend = "deepseek-flash";
        reason = `Historical: Qwen success rate ${(qwenHistory.successRate * 100).toFixed(0)}% for similar tasks`;
        confidence = 0.7;
      }
      // If DeepSeek was faster historically
      else if (flashHistory.count >= 3 && flashHistory.avgLatency < qwenHistory.avgLatency * 0.7) {
        backend = "deepseek-flash";
        reason = `Historical: DeepSeek Flash ${(flashHistory.avgLatency / 1000).toFixed(1)}s faster than Qwen`;
        confidence = 0.75;
      }
    }

    // Override: prefer local if specified and context fits
    if (preferLocal && backend !== "qwen" && contextLength <= this.thresholds.maxLocalContextTokens) {
      alternatives.unshift({ backend, reason });
      backend = "qwen";
      reason = "User preference: local inference when possible";
      confidence *= 0.9;
    }

    // Override: latency constraint
    if (maxLatencyMs && estimatedLatencyMs > maxLatencyMs && backend !== "qwen") {
      alternatives.unshift({ backend, reason });
      backend = "qwen";
      reason = `Latency constraint: ${maxLatencyMs}ms max, Qwen fastest`;
      estimatedLatencyMs = 2000;
      estimatedCost = 0;
    }

    // Track route counts
    this.routeCount[backend]++;

    return {
      backend,
      reason,
      complexity,
      estimatedLatencyMs,
      estimatedCost,
      confidence,
      alternatives,
    };
  }

  /**
   * Record outcome for learning
   *
   * @param input - Outcome data to record
   */
  recordOutcome(input: RecordOutcomeInput): void {
    const validated = RecordOutcomeInputSchema.parse(input);

    this.outcomes.push({
      taskSignature: validated.taskSignature,
      backend: validated.backend,
      success: validated.success,
      qualityScore: validated.qualityScore ?? (validated.success ? 0.8 : 0.2),
      latencyMs: validated.latencyMs,
      timestamp: Date.now(),
    });

    // Prune old outcomes
    if (this.outcomes.length > 1000) {
      this.outcomes = this.outcomes.slice(-1000);
    }

    this.saveOutcomes();
  }

  /**
   * Get routing statistics
   *
   * @returns Aggregated routing statistics
   */
  getStats(): RoutingStatsOutput {
    const byBackend: Record<string, number> = {};
    const successCounts: Record<string, number> = {};
    const totalCounts: Record<string, number> = {};
    const latencySums: Record<string, number> = {};

    for (const outcome of this.outcomes) {
      byBackend[outcome.backend] = (byBackend[outcome.backend] ?? 0) + 1;
      totalCounts[outcome.backend] = (totalCounts[outcome.backend] ?? 0) + 1;
      if (outcome.success) {
        successCounts[outcome.backend] = (successCounts[outcome.backend] ?? 0) + 1;
      }
      latencySums[outcome.backend] = (latencySums[outcome.backend] ?? 0) + outcome.latencyMs;
    }

    const successRates: Record<string, number> = {};
    const avgLatencies: Record<string, number> = {};

    for (const backend of Object.keys(totalCounts)) {
      successRates[backend] = (successCounts[backend] ?? 0) / totalCounts[backend];
      avgLatencies[backend] = latencySums[backend] / totalCounts[backend];
    }

    // Count unique task signatures as "learned patterns"
    const uniqueSignatures = new Set(this.outcomes.map(o => o.taskSignature));

    return {
      totalRoutes: this.outcomes.length,
      byBackend,
      successRates,
      avgLatencies,
      learnedPatterns: uniqueSignatures.size,
    };
  }

  /**
   * Update routing thresholds
   *
   * @param updates - Threshold updates to apply
   */
  updateThresholds(updates: Partial<RoutingThresholds>): void {
    this.thresholds = { ...this.thresholds, ...updates };
    try {
      writeFileSync(THRESHOLDS_PATH, JSON.stringify(this.thresholds, null, 2));
    } catch {
      log.warn("BackendRouterEngine", "Failed to save thresholds");
    }
  }

  /**
   * Get current thresholds
   *
   * @returns Current routing thresholds
   */
  getThresholds(): RoutingThresholds {
    return { ...this.thresholds };
  }
}

// Singleton export
export const backendRouterEngine = new BackendRouterEngine();
