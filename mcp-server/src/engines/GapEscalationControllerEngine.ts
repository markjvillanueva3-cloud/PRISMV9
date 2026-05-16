// WIRE-EXEMPT: U-EFF32 touched only async signatures; engine is consumed via MachiningIntelligenceOrchestratorEngine facade, not directly dispatched
/**
 * GapEscalationControllerEngine — MIO-MS0/U-MIO44
 *
 * Detects AI capability gaps and escalates to human operators when AI
 * cannot confidently handle a request. Implements a four-level escalation
 * matrix (HALT/WARNING/CAUTION/PROCEED) based on confidence thresholds.
 *
 * Core principle: When AI doesn't know something, ADMIT IT and ask for help.
 *
 * @module engines/GapEscalationControllerEngine
 */

import {
  prismSelfAwarenessEngine,
  type GapAnalysis,
} from "./PRISMSelfAwarenessEngine.js";
import { safeWriteSync } from "../utils/atomicWrite.js";
import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

export type EscalationLevel = "HALT" | "WARNING" | "CAUTION" | "PROCEED";

export interface EscalationThresholds {
  halt_below: number;
  warning_below: number;
  caution_below: number;
}

export interface EscalationDecision {
  level: EscalationLevel;
  confidence: number;
  can_proceed: boolean;
  requires_human: boolean;
  reason: string;
  suggestions: string[];
  gap_id?: string;
  timestamp: string;
}

export interface GapLogEntry {
  id: string;
  query: string;
  escalation_level: EscalationLevel;
  confidence: number;
  reason: string;
  context?: Record<string, unknown>;
  timestamp: string;
  resolved: boolean;
  resolution?: string;
  resolved_by?: string;
  resolved_at?: string;
}

export interface HumanReviewItem {
  id: string;
  query: string;
  escalation_level: EscalationLevel;
  confidence: number;
  reason: string;
  suggestions: string[];
  context?: Record<string, unknown>;
  created_at: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "pending" | "in_progress" | "resolved" | "dismissed";
  assigned_to?: string;
}

export interface GapStatistics {
  total_gaps: number;
  by_level: Record<EscalationLevel, number>;
  resolved: number;
  pending: number;
  avg_confidence: number;
  common_queries: Array<{ query: string; count: number }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_THRESHOLDS: EscalationThresholds = {
  halt_below: 0.3,      // <30% confidence = HALT, require human
  warning_below: 0.5,   // 30-50% = WARNING, strongly suggest human
  caution_below: 0.7,   // 50-70% = CAUTION, proceed with care
  // >=70% = PROCEED normally
};

const GAP_LOG_PATH = path.join(process.cwd(), "data", "state", "gap-escalation-log.json");
const REVIEW_QUEUE_PATH = path.join(process.cwd(), "data", "state", "human-review-queue.json");

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class GapEscalationControllerEngine {
  private thresholds: EscalationThresholds;
  private gapLog: GapLogEntry[] = [];
  private reviewQueue: HumanReviewItem[] = [];
  private gapCounter: number = 0;

  constructor(thresholds?: Partial<EscalationThresholds>) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
    this.loadState();
  }

  // ============================================================================
  // PRIMARY API
  // ============================================================================

  /**
   * Analyze a query for capability gaps and determine escalation level.
   *
   * @param query - The request or capability being checked
   * @param context - Optional context for logging
   * @returns EscalationDecision with level, can_proceed, and suggestions
   */
  async analyzeAndEscalate(
    query: string,
    context?: Record<string, unknown>
  ): Promise<EscalationDecision> {
    const gapAnalysis = await prismSelfAwarenessEngine.analyzeGaps(query);
    const decision = this.makeDecision(gapAnalysis);

    // Log gap if not proceeding normally
    if (decision.level !== "PROCEED") {
      const gapId = this.logGap(query, decision, context);
      decision.gap_id = gapId;

      // Add to human review queue for HALT and WARNING
      if (decision.level === "HALT" || decision.level === "WARNING") {
        this.addToReviewQueue(gapId, query, decision, context);
      }
    }

    return decision;
  }

  /**
   * Check if AI should proceed with a task or escalate.
   * Simplified version returning just the boolean + level.
   *
   * @param query - Task description
   * @returns { proceed: boolean, level: EscalationLevel }
   */
  async shouldProceed(query: string): Promise<{ proceed: boolean; level: EscalationLevel; reason: string }> {
    const decision = await this.analyzeAndEscalate(query);
    return {
      proceed: decision.can_proceed,
      level: decision.level,
      reason: decision.reason,
    };
  }

  /**
   * Validate confidence before taking an action. Use this at decision points.
   *
   * @param action - Action being taken
   * @param confidence - AI's confidence in the action (0-1)
   * @param context - Optional context
   * @returns EscalationDecision
   */
  validateConfidence(
    action: string,
    confidence: number,
    context?: Record<string, unknown>
  ): EscalationDecision {
    const level = this.confidenceToLevel(confidence);
    const decision: EscalationDecision = {
      level,
      confidence,
      can_proceed: level === "PROCEED" || level === "CAUTION",
      requires_human: level === "HALT" || level === "WARNING",
      reason: this.levelToReason(level, confidence),
      suggestions: this.getSuggestions(level, action),
      timestamp: new Date().toISOString(),
    };

    if (level !== "PROCEED") {
      const gapId = this.logGap(action, decision, context);
      decision.gap_id = gapId;

      if (decision.requires_human) {
        this.addToReviewQueue(gapId, action, decision, context);
      }
    }

    return decision;
  }

  // ============================================================================
  // HUMAN REVIEW QUEUE
  // ============================================================================

  /**
   * Get pending items in the human review queue.
   *
   * @param filter - Optional filter by status or priority
   * @returns Array of review items
   */
  getReviewQueue(filter?: {
    status?: HumanReviewItem["status"];
    priority?: HumanReviewItem["priority"];
    limit?: number;
  }): HumanReviewItem[] {
    let items = [...this.reviewQueue];

    if (filter?.status) {
      items = items.filter(i => i.status === filter.status);
    }
    if (filter?.priority) {
      items = items.filter(i => i.priority === filter.priority);
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return items.slice(0, filter?.limit || items.length);
  }

  /**
   * Resolve a review item (human has addressed it).
   *
   * @param itemId - Review item ID
   * @param resolution - How it was resolved
   * @param resolvedBy - Who resolved it
   */
  resolveReviewItem(itemId: string, resolution: string, resolvedBy: string): boolean {
    const item = this.reviewQueue.find(i => i.id === itemId);
    if (!item) return false;

    item.status = "resolved";

    // Also update the gap log
    const gap = this.gapLog.find(g => g.id === itemId);
    if (gap) {
      gap.resolved = true;
      gap.resolution = resolution;
      gap.resolved_by = resolvedBy;
      gap.resolved_at = new Date().toISOString();
    }

    this.saveState();
    log.info(`[GapEscalation] Resolved ${itemId}: ${resolution}`);
    return true;
  }

  /**
   * Dismiss a review item (false positive or not actionable).
   *
   * @param itemId - Review item ID
   * @param reason - Why dismissed
   */
  dismissReviewItem(itemId: string, reason: string): boolean {
    const item = this.reviewQueue.find(i => i.id === itemId);
    if (!item) return false;

    item.status = "dismissed";

    const gap = this.gapLog.find(g => g.id === itemId);
    if (gap) {
      gap.resolved = true;
      gap.resolution = `Dismissed: ${reason}`;
    }

    this.saveState();
    return true;
  }

  // ============================================================================
  // GAP LOG & STATISTICS
  // ============================================================================

  /**
   * Get logged gaps with optional filtering.
   *
   * @param filter - Optional filters
   * @returns Array of gap log entries
   */
  getGapLog(filter?: {
    level?: EscalationLevel;
    resolved?: boolean;
    since?: Date;
    limit?: number;
  }): GapLogEntry[] {
    let entries = [...this.gapLog];

    if (filter?.level) {
      entries = entries.filter(e => e.escalation_level === filter.level);
    }
    if (filter?.resolved !== undefined) {
      entries = entries.filter(e => e.resolved === filter.resolved);
    }
    if (filter?.since) {
      entries = entries.filter(e => new Date(e.timestamp) >= filter.since!);
    }

    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return entries.slice(0, filter?.limit || entries.length);
  }

  /**
   * Get statistics about capability gaps.
   *
   * @returns GapStatistics
   */
  getStatistics(): GapStatistics {
    const byLevel: Record<EscalationLevel, number> = {
      HALT: 0,
      WARNING: 0,
      CAUTION: 0,
      PROCEED: 0,
    };

    let totalConfidence = 0;
    const queryCount: Record<string, number> = {};

    for (const entry of this.gapLog) {
      byLevel[entry.escalation_level]++;
      totalConfidence += entry.confidence;

      // Normalize query for counting
      const normalizedQuery = entry.query.toLowerCase().substring(0, 50);
      queryCount[normalizedQuery] = (queryCount[normalizedQuery] || 0) + 1;
    }

    const commonQueries = Object.entries(queryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    return {
      total_gaps: this.gapLog.length,
      by_level: byLevel,
      resolved: this.gapLog.filter(e => e.resolved).length,
      pending: this.gapLog.filter(e => !e.resolved).length,
      avg_confidence: this.gapLog.length > 0 ? totalConfidence / this.gapLog.length : 0,
      common_queries: commonQueries,
    };
  }

  /**
   * Get gaps that should be prioritized for engine development.
   * These are frequent, unresolved gaps with low confidence.
   *
   * @returns Array of high-priority gaps
   */
  getPrioritizedGapsForDevelopment(): Array<{
    query: string;
    occurrences: number;
    avg_confidence: number;
    suggested_priority: "P0" | "P1" | "P2" | "P3";
  }> {
    const unresolvedGaps = this.gapLog.filter(g => !g.resolved);
    const grouped: Record<string, { count: number; totalConf: number }> = {};

    for (const gap of unresolvedGaps) {
      const key = gap.query.toLowerCase().substring(0, 80);
      if (!grouped[key]) {
        grouped[key] = { count: 0, totalConf: 0 };
      }
      grouped[key].count++;
      grouped[key].totalConf += gap.confidence;
    }

    return Object.entries(grouped)
      .map(([query, data]) => ({
        query,
        occurrences: data.count,
        avg_confidence: data.totalConf / data.count,
        suggested_priority: this.calculatePriority(data.count, data.totalConf / data.count),
      }))
      .sort((a, b) => {
        const prioOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
        return prioOrder[a.suggested_priority] - prioOrder[b.suggested_priority];
      })
      .slice(0, 20);
  }

  // ============================================================================
  // THRESHOLDS
  // ============================================================================

  /**
   * Update escalation thresholds.
   *
   * @param thresholds - New threshold values
   */
  updateThresholds(thresholds: Partial<EscalationThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    log.info(`[GapEscalation] Thresholds updated: ${JSON.stringify(this.thresholds)}`);
  }

  /**
   * Get current thresholds.
   */
  getThresholds(): EscalationThresholds {
    return { ...this.thresholds };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private makeDecision(gap: GapAnalysis): EscalationDecision {
    const level = this.confidenceToLevel(gap.confidence);

    // GapAnalysis (PRISMSelfAwarenessEngine.ts L131) does NOT carry `canHandle`
    // or `reason` fields — its interface is { query, hasCapability, confidence,
    // matches, suggestions, missingCapabilities, timestamp }. Derive the same
    // semantics here:
    //   canHandle  ≡ hasCapability
    //   reason     ≡ synthesized from matches (when capable) OR from
    //                missingCapabilities (when not capable)
    const canHandle = gap.hasCapability;
    const matchName = gap.matches.length > 0 ? gap.matches[0].capability : "no match";
    const missing = gap.missingCapabilities.length > 0
      ? gap.missingCapabilities.join(", ")
      : "unspecified capability";
    const baseReason = canHandle
      ? `Capability available: ${matchName} (${gap.matches.length} match(es))`
      : `Missing capabilities: ${missing}`;

    return {
      level,
      confidence: gap.confidence,
      can_proceed: canHandle && (level === "PROCEED" || level === "CAUTION"),
      requires_human: level === "HALT" || level === "WARNING",
      reason: canHandle ? baseReason : `Gap detected: ${baseReason}`,
      suggestions: gap.suggestions,
      timestamp: new Date().toISOString(),
    };
  }

  private confidenceToLevel(confidence: number): EscalationLevel {
    if (confidence < this.thresholds.halt_below) return "HALT";
    if (confidence < this.thresholds.warning_below) return "WARNING";
    if (confidence < this.thresholds.caution_below) return "CAUTION";
    return "PROCEED";
  }

  private levelToReason(level: EscalationLevel, confidence: number): string {
    switch (level) {
      case "HALT":
        return `Confidence ${(confidence * 100).toFixed(0)}% too low. Human review required before proceeding.`;
      case "WARNING":
        return `Confidence ${(confidence * 100).toFixed(0)}% is concerning. Strongly recommend human verification.`;
      case "CAUTION":
        return `Confidence ${(confidence * 100).toFixed(0)}% is acceptable but proceed with care.`;
      case "PROCEED":
        return `Confidence ${(confidence * 100).toFixed(0)}% is sufficient to proceed.`;
    }
  }

  private getSuggestions(level: EscalationLevel, action: string): string[] {
    switch (level) {
      case "HALT":
        return [
          "Do NOT proceed without human approval",
          "Add this task to the review queue",
          "Consider if the task can be decomposed into smaller steps",
          "Check if a new engine/capability needs to be developed",
        ];
      case "WARNING":
        return [
          "Request human verification before critical decisions",
          "Document uncertainty in output",
          "Consider alternative approaches with higher confidence",
        ];
      case "CAUTION":
        return [
          "Proceed but monitor results closely",
          "Add validation checkpoints",
          "Consider secondary verification",
        ];
      default:
        return [];
    }
  }

  private logGap(
    query: string,
    decision: EscalationDecision,
    context?: Record<string, unknown>
  ): string {
    const id = `GAP-${Date.now()}-${++this.gapCounter}`;

    const entry: GapLogEntry = {
      id,
      query,
      escalation_level: decision.level,
      confidence: decision.confidence,
      reason: decision.reason,
      context,
      timestamp: new Date().toISOString(),
      resolved: false,
    };

    this.gapLog.push(entry);
    this.saveState();

    log.info(`[GapEscalation] Logged gap ${id}: ${decision.level} (${(decision.confidence * 100).toFixed(0)}%)`);

    return id;
  }

  private addToReviewQueue(
    gapId: string,
    query: string,
    decision: EscalationDecision,
    context?: Record<string, unknown>
  ): void {
    const item: HumanReviewItem = {
      id: gapId,
      query,
      escalation_level: decision.level,
      confidence: decision.confidence,
      reason: decision.reason,
      suggestions: decision.suggestions,
      context,
      created_at: new Date().toISOString(),
      priority: decision.level === "HALT" ? "critical" : "high",
      status: "pending",
    };

    this.reviewQueue.push(item);
    this.saveState();

    log.warn(`[GapEscalation] Added to human review queue: ${gapId} (${item.priority})`);
  }

  private calculatePriority(occurrences: number, avgConfidence: number): "P0" | "P1" | "P2" | "P3" {
    const score = occurrences * (1 - avgConfidence);
    if (score > 5) return "P0";
    if (score > 2) return "P1";
    if (score > 1) return "P2";
    return "P3";
  }

  private loadState(): void {
    try {
      if (fs.existsSync(GAP_LOG_PATH)) {
        const data = JSON.parse(fs.readFileSync(GAP_LOG_PATH, "utf-8"));
        this.gapLog = data.entries || [];
        this.gapCounter = data.counter || 0;
      }
    } catch (e) {
      log.warn(`[GapEscalation] Could not load gap log: ${e}`);
    }

    try {
      if (fs.existsSync(REVIEW_QUEUE_PATH)) {
        const data = JSON.parse(fs.readFileSync(REVIEW_QUEUE_PATH, "utf-8"));
        this.reviewQueue = data.items || [];
      }
    } catch (e) {
      log.warn(`[GapEscalation] Could not load review queue: ${e}`);
    }
  }

  private saveState(): void {
    try {
      const logDir = path.dirname(GAP_LOG_PATH);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      safeWriteSync(GAP_LOG_PATH, JSON.stringify({
        schemaVersion: 1,
        counter: this.gapCounter,
        entries: this.gapLog.slice(-1000), // Keep last 1000 entries
      }, null, 2));

      safeWriteSync(REVIEW_QUEUE_PATH, JSON.stringify({
        schemaVersion: 1,
        items: this.reviewQueue,
      }, null, 2));
    } catch (e) {
      log.error(`[GapEscalation] Could not save state: ${e}`);
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const gapEscalationControllerEngine = new GapEscalationControllerEngine();
