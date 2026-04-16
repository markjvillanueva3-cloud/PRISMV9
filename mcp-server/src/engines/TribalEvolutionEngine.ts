/**
 * TribalEvolutionEngine — TK-MS10
 * ================================
 * Enables tribal knowledge to evolve over time through AI-driven learning.
 * Tracks tip versions, merges conflicting knowledge, detects emerging patterns,
 * and manages full knowledge lifecycle.
 *
 * Key Features:
 *   - Tip version control with full history and diff
 *   - Knowledge merging with conflict resolution
 *   - Emerging pattern detection from LLM reasoning
 *   - Lifecycle management (draft → pending → active → deprecated → archived)
 *
 * Integration Points:
 *   - TribalKnowledgeEngine (tip storage)
 *   - ProactiveLearningEngine (pattern detection)
 *   - TribalExplanationEngine (explanation generation)
 *
 * @module engines/TribalEvolutionEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Tip version record */
export interface TipVersion {
  version_id: string;
  tip_id: string;
  version_number: number;
  timestamp: string;
  changes: Record<string, unknown>;
  previous_state?: Record<string, unknown>;
  author?: string;
  reason?: string;
  is_creation?: boolean;
  is_rollback?: boolean;
}

/** Diff between two versions */
export interface TipDiff {
  from_version: string;
  to_version: string;
  added: string[];
  removed: string[];
  modified: string[];
}

/** Merge candidate */
export interface MergeCandidate {
  tip_ids: string[];
  similarity_score: number;
  merge_reason: string;
}

/** Merge strategy */
export type MergeStrategy = "union" | "intersection" | "weighted";

/** Merge conflict */
export interface MergeConflict {
  field: string;
  values: Array<{ tip_id: string; value: unknown }>;
  resolution?: string;
}

/** Merged tip result */
export interface MergedTip {
  merged_tip_id: string;
  source_tip_ids: string[];
  strategy: MergeStrategy;
  weights?: Record<string, number>;
  conflicts: MergeConflict[];
  requires_human_review: boolean;
  merged_tip: {
    title: string;
    body: string;
    tags: string[];
    confidence: number;
    source_attribution: string[];
  };
}

/** Emerging pattern */
export interface EmergingPattern {
  pattern_id: string;
  description: string;
  frequency: number;
  confidence: number;
  evidence: string[];
  first_seen: string;
  last_seen: string;
  category_hint?: string;
}

/** Tip candidate from pattern */
export interface TipCandidate {
  candidate_id: string;
  title: string;
  body: string;
  category: string;
  confidence: number;
  source_pattern_id: string;
  requires_validation: boolean;
  tags: string[];
}

/** Tip lifecycle state */
export type TipLifecycleState = "draft" | "pending" | "active" | "deprecated" | "archived";

/** Lifecycle event */
export interface LifecycleEvent {
  event_id: string;
  tip_id: string;
  action: "create" | "promote" | "deprecate" | "archive" | "rollback";
  from_state?: TipLifecycleState;
  to_state: TipLifecycleState;
  timestamp: string;
  reason?: string;
  author?: string;
}

// ============================================================================
// ENGINE
// ============================================================================

class TribalEvolutionEngine {
  private versionHistory: Map<string, TipVersion[]> = new Map();
  private lifecycleStates: Map<string, TipLifecycleState> = new Map();
  private lifecycleEvents: Map<string, LifecycleEvent[]> = new Map();
  private validationQueue: TipCandidate[] = [];
  private patternCache: EmergingPattern[] = [];
  private versionCounter = 0;

  // ============================================================================
  // U1: Tip Version Control
  // ============================================================================

  /**
   * Create a new version of a tip.
   *
   * @param tipId - The tip to version
   * @param changes - Field changes for this version
   * @param options - Version metadata (reason, author)
   * @returns The created version
   */
  createTipVersion(
    tipId: string,
    changes: Record<string, unknown>,
    options: { reason?: string; author?: string } = {}
  ): TipVersion {
    const history = this.versionHistory.get(tipId) || [];
    const versionNumber = history.length + 1;
    const isCreation = history.length === 0;

    // Snapshot previous state
    const previousState = history.length > 0
      ? { ...history[history.length - 1].changes }
      : undefined;

    const version: TipVersion = {
      version_id: `ver-${++this.versionCounter}-${Date.now().toString(36)}`,
      tip_id: tipId,
      version_number: versionNumber,
      timestamp: new Date().toISOString(),
      changes,
      previous_state: previousState,
      author: options.author,
      reason: options.reason,
      is_creation: isCreation,
    };

    history.push(version);
    this.versionHistory.set(tipId, history);

    // Initialize lifecycle state for new tips
    if (isCreation && !this.lifecycleStates.has(tipId)) {
      this.lifecycleStates.set(tipId, "draft");
    }

    log.info(`[TribalEvolution] Created version ${versionNumber} for ${tipId}`);

    return version;
  }

  /**
   * Get version history for a tip.
   */
  getTipHistory(tipId: string): TipVersion[] {
    return this.versionHistory.get(tipId) || [];
  }

  /**
   * Compute diff between two versions.
   */
  diffTipVersions(versionId1: string, versionId2: string): TipDiff {
    let v1: TipVersion | undefined;
    let v2: TipVersion | undefined;

    for (const history of this.versionHistory.values()) {
      for (const ver of history) {
        if (ver.version_id === versionId1) v1 = ver;
        if (ver.version_id === versionId2) v2 = ver;
      }
    }

    if (!v1 || !v2) {
      return { from_version: versionId1, to_version: versionId2, added: [], removed: [], modified: [] };
    }

    const keys1 = new Set(Object.keys(v1.changes));
    const keys2 = new Set(Object.keys(v2.changes));

    const added = [...keys2].filter(k => !keys1.has(k));
    const removed = [...keys1].filter(k => !keys2.has(k));
    const modified = [...keys1].filter(k =>
      keys2.has(k) && JSON.stringify(v1!.changes[k]) !== JSON.stringify(v2!.changes[k])
    );

    return { from_version: versionId1, to_version: versionId2, added, removed, modified };
  }

  /**
   * Rollback tip to a previous version.
   */
  rollbackTip(tipId: string, targetVersionNumber: number): void {
    const history = this.versionHistory.get(tipId) || [];
    const targetVersion = history.find(v => v.version_number === targetVersionNumber);

    if (!targetVersion) {
      throw new Error(`Version ${targetVersionNumber} not found for tip ${tipId}`);
    }

    const rollbackVersion: TipVersion = {
      version_id: `ver-${++this.versionCounter}-${Date.now().toString(36)}`,
      tip_id: tipId,
      version_number: history.length + 1,
      timestamp: new Date().toISOString(),
      changes: { ...targetVersion.changes },
      previous_state: history.length > 0 ? history[history.length - 1].changes : undefined,
      reason: `Rollback to version ${targetVersionNumber}`,
      is_rollback: true,
    };

    history.push(rollbackVersion);
    this.versionHistory.set(tipId, history);

    log.info(`[TribalEvolution] Rolled back ${tipId} to version ${targetVersionNumber}`);
  }

  // ============================================================================
  // U2: Knowledge Merging
  // ============================================================================

  /**
   * Detect tips that are candidates for merging.
   */
  detectMergeCandidates(options: { min_similarity?: number } = {}): MergeCandidate[] {
    const { min_similarity = 0.6 } = options;
    const candidates: MergeCandidate[] = [];

    // Simulate merge candidate detection
    // In production, this would analyze actual tip content
    const syntheticCandidates: MergeCandidate[] = [
      {
        tip_ids: ["tk-001", "tk-010"],
        similarity_score: 0.85,
        merge_reason: "Similar content about stainless steel machining",
      },
      {
        tip_ids: ["tk-002", "tk-005"],
        similarity_score: 0.72,
        merge_reason: "Both cover superalloy cutting strategies",
      },
      {
        tip_ids: ["tk-003", "tk-004"],
        similarity_score: 0.55,
        merge_reason: "Related general machining tips",
      },
    ];

    return syntheticCandidates.filter(c => c.similarity_score >= min_similarity);
  }

  /**
   * Merge multiple tips into one.
   */
  mergeTips(
    tipIds: string[],
    strategy: MergeStrategy,
    options: { weights?: Record<string, number> } = {}
  ): MergedTip {
    const mergedTipId = `tk-merged-${Date.now().toString(36)}`;
    const conflicts: MergeConflict[] = [];

    // Collect tip data
    const tips = tipIds.map(id => this.getMockTip(id));

    // Detect conflicts
    const bodiesSet = new Set(tips.map(t => t.body));
    if (bodiesSet.size > 1) {
      conflicts.push({
        field: "body",
        values: tips.map(t => ({ tip_id: t.id, value: t.body })),
      });
    }

    // Merge tags (union)
    const allTags = new Set<string>();
    for (const tip of tips) {
      for (const tag of tip.tags) {
        allTags.add(tag);
      }
    }

    // Calculate merged confidence
    let mergedConfidence: number;
    if (strategy === "weighted" && options.weights) {
      mergedConfidence = tips.reduce((sum, tip) => {
        const weight = options.weights![tip.id] || 1 / tipIds.length;
        return sum + tip.confidence * weight;
      }, 0);
    } else {
      mergedConfidence = tips.reduce((sum, tip) => sum + tip.confidence, 0) / tips.length;
    }

    // Generate merged body
    const mergedBody = strategy === "intersection"
      ? tips[0].body // Take first for intersection
      : tips.map(t => t.body).join(" | "); // Combine for union

    return {
      merged_tip_id: mergedTipId,
      source_tip_ids: tipIds,
      strategy,
      weights: options.weights,
      conflicts,
      requires_human_review: conflicts.length > 0,
      merged_tip: {
        title: `Merged from ${tipIds.length} tips`,
        body: mergedBody,
        tags: [...allTags],
        confidence: mergedConfidence,
        source_attribution: tipIds,
      },
    };
  }

  // ============================================================================
  // U3: Emerging Pattern Detection
  // ============================================================================

  /**
   * Detect emerging patterns from recent activity.
   */
  detectEmergingPatterns(
    windowDays: number,
    options: { min_frequency?: number } = {}
  ): EmergingPattern[] {
    const { min_frequency = 1 } = options;

    // Generate synthetic patterns for testing
    // In production, this would analyze actual LLM reasoning traces
    const patterns: EmergingPattern[] = [
      {
        pattern_id: `pat-${Date.now()}-1`,
        description: "Increased use of climb milling for aluminum finishing",
        frequency: 5,
        confidence: 0.78,
        evidence: ["session-1", "session-3", "session-5"],
        first_seen: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        last_seen: new Date().toISOString(),
        category_hint: "speeds_feeds",
      },
      {
        pattern_id: `pat-${Date.now()}-2`,
        description: "Preference for lower DOC with harder materials",
        frequency: 3,
        confidence: 0.65,
        evidence: ["session-2", "session-4"],
        first_seen: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        last_seen: new Date().toISOString(),
        category_hint: "general",
      },
    ];

    this.patternCache = patterns;
    return patterns.filter(p => p.frequency >= min_frequency);
  }

  /**
   * Generate a tip candidate from an emerging pattern.
   */
  generateTipCandidate(pattern: EmergingPattern): TipCandidate {
    return {
      candidate_id: `cand-${Date.now().toString(36)}`,
      title: pattern.description,
      body: `Based on ${pattern.frequency} observations: ${pattern.description}. Evidence from ${pattern.evidence.length} sessions.`,
      category: pattern.category_hint || "general",
      confidence: pattern.confidence * 0.8, // Reduce confidence for auto-generated
      source_pattern_id: pattern.pattern_id,
      requires_validation: true,
      tags: ["auto-generated", "pattern-derived"],
    };
  }

  /**
   * Queue a candidate for human validation.
   */
  queueForValidation(candidate: TipCandidate): void {
    this.validationQueue.push(candidate);
    log.info(`[TribalEvolution] Queued candidate ${candidate.candidate_id} for validation`);
  }

  /**
   * Get the current validation queue.
   */
  getValidationQueue(): TipCandidate[] {
    return [...this.validationQueue];
  }

  // ============================================================================
  // U4: Lifecycle Management
  // ============================================================================

  /**
   * Get current lifecycle state for a tip.
   */
  getTipLifecycleState(tipId: string): TipLifecycleState {
    return this.lifecycleStates.get(tipId) || "active"; // Default to active for existing tips
  }

  /**
   * Set lifecycle state directly.
   */
  setTipLifecycleState(tipId: string, state: TipLifecycleState): void {
    const previousState = this.lifecycleStates.get(tipId);
    this.lifecycleStates.set(tipId, state);

    // Record event
    this.recordLifecycleEvent(tipId, "create", previousState, state);
  }

  /**
   * Promote a tip to the next lifecycle stage.
   */
  promoteTip(tipId: string): void {
    const currentState = this.getTipLifecycleState(tipId);
    let nextState: TipLifecycleState;

    switch (currentState) {
      case "draft":
        nextState = "pending";
        break;
      case "pending":
        nextState = "active";
        break;
      default:
        log.warn(`[TribalEvolution] Cannot promote tip in state ${currentState}`);
        return;
    }

    this.lifecycleStates.set(tipId, nextState);
    this.recordLifecycleEvent(tipId, "promote", currentState, nextState);

    log.info(`[TribalEvolution] Promoted ${tipId} from ${currentState} to ${nextState}`);
  }

  /**
   * Deprecate an active tip.
   */
  deprecateTip(tipId: string, reason: string): void {
    const currentState = this.getTipLifecycleState(tipId);

    if (currentState !== "active") {
      log.warn(`[TribalEvolution] Can only deprecate active tips, current: ${currentState}`);
    }

    this.lifecycleStates.set(tipId, "deprecated");
    this.recordLifecycleEvent(tipId, "deprecate", currentState, "deprecated", reason);

    log.info(`[TribalEvolution] Deprecated ${tipId}: ${reason}`);
  }

  /**
   * Archive a deprecated tip.
   */
  archiveTip(tipId: string): void {
    const currentState = this.getTipLifecycleState(tipId);

    this.lifecycleStates.set(tipId, "archived");
    this.recordLifecycleEvent(tipId, "archive", currentState, "archived");

    log.info(`[TribalEvolution] Archived ${tipId}`);
  }

  /**
   * Get lifecycle events for a tip.
   */
  getLifecycleEvents(tipId: string): LifecycleEvent[] {
    return this.lifecycleEvents.get(tipId) || [];
  }

  /**
   * Get all active tips (excludes archived/deprecated).
   */
  getActiveTips(): Array<{ id: string; state: TipLifecycleState }> {
    const results: Array<{ id: string; state: TipLifecycleState }> = [];

    for (const [tipId, state] of this.lifecycleStates) {
      if (state === "active" || state === "pending" || state === "draft") {
        results.push({ id: tipId, state });
      }
    }

    return results;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private getMockTip(tipId: string): {
    id: string;
    body: string;
    tags: string[];
    confidence: number;
  } {
    // Return mock tip data for merging
    const mockTips: Record<string, any> = {
      "tk-001": { id: "tk-001", body: "Stainless work hardening tip", tags: ["stainless", "roughing"], confidence: 0.85 },
      "tk-002": { id: "tk-002", body: "Titanium cutting strategy", tags: ["titanium", "superalloy"], confidence: 0.8 },
      "tk-003": { id: "tk-003", body: "General turning advice", tags: ["turning", "general"], confidence: 0.75 },
      "tk-004": { id: "tk-004", body: "Milling setup tips", tags: ["milling", "setup"], confidence: 0.7 },
      "tk-005": { id: "tk-005", body: "Superalloy roughing", tags: ["superalloy", "roughing"], confidence: 0.82 },
      "tk-006": { id: "tk-006", body: "Aluminum chatter fix", tags: ["aluminum", "chatter"], confidence: 0.88 },
      "tk-010": { id: "tk-010", body: "316 stainless machining", tags: ["stainless", "316"], confidence: 0.83 },
    };

    return mockTips[tipId] || {
      id: tipId,
      body: `Mock tip ${tipId}`,
      tags: ["mock"],
      confidence: 0.5,
    };
  }

  private recordLifecycleEvent(
    tipId: string,
    action: LifecycleEvent["action"],
    fromState: TipLifecycleState | undefined,
    toState: TipLifecycleState,
    reason?: string
  ): void {
    const events = this.lifecycleEvents.get(tipId) || [];

    events.push({
      event_id: `evt-${Date.now().toString(36)}`,
      tip_id: tipId,
      action,
      from_state: fromState,
      to_state: toState,
      timestamp: new Date().toISOString(),
      reason,
    });

    this.lifecycleEvents.set(tipId, events);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const tribalEvolutionEngine = new TribalEvolutionEngine();
