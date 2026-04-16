/**
 * KnowledgeConflictResolverEngine — U-TK06
 * Detects and resolves conflicting tribal knowledge tips.
 * Uses confidence scoring, recency, and source authority to pick winners.
 *
 * NOTE: Temporarily located in src/knowledge/ due to src/engines/ directory corruption.
 */

import { tribalKnowledgeEngine, type KnowledgeTip } from "../engines/TribalKnowledgeEngine.js";

// ── Types ──────────────────────────────────────────────────────────────────

/** Conflict between two tips */
export interface KnowledgeConflict {
  id: string;
  tip_a: KnowledgeTip;
  tip_b: KnowledgeTip;
  conflict_type: ConflictType;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  detected_at: string;
}

export type ConflictType =
  | "contradictory_values"      // Different numbers for same parameter
  | "opposing_recommendations"  // Do X vs Don't do X
  | "outdated_superseded"       // Newer tip supersedes older
  | "context_ambiguity"         // Same advice, unclear which context applies
  | "source_disagreement";      // Different authoritative sources disagree

/** Resolution strategy */
export type ResolutionStrategy =
  | "prefer_newer"
  | "prefer_higher_confidence"
  | "prefer_higher_usage"
  | "prefer_source_authority"
  | "merge_with_context"
  | "flag_for_review"
  | "deprecate_both";

/** Resolution result */
export interface ConflictResolution {
  conflict: KnowledgeConflict;
  strategy_used: ResolutionStrategy;
  winner?: KnowledgeTip;
  loser?: KnowledgeTip;
  action: "keep_winner" | "merge" | "deprecate" | "review_required";
  rationale: string;
  auto_resolved: boolean;
}

/** Batch detection result */
export interface ConflictDetectionResult {
  total_tips_analyzed: number;
  conflicts_found: KnowledgeConflict[];
  by_severity: Record<string, number>;
  by_type: Record<string, number>;
  scan_time_ms: number;
}

// ── Source Authority Rankings ──────────────────────────────────────────────

const SOURCE_AUTHORITY: Record<string, number> = {
  "manufacturer": 100,      // Tool/machine manufacturer specs
  "iso_standard": 95,       // ISO/ANSI standards
  "handbook": 90,           // Machinery's Handbook, etc.
  "engineer": 80,           // Senior engineer input
  "supervisor": 75,         // Shop supervisor
  "senior_machinist": 70,   // 10+ years experience
  "machinist": 60,          // Standard operator
  "apprentice": 40,         // Learning operator
  "video": 50,              // Video-learned content
  "document": 55,           // Document-extracted
  "test": 10,               // Test data
  "unknown": 30,            // Default
};

// ── Contradiction Patterns ─────────────────────────────────────────────────

const CONTRADICTION_PATTERNS = [
  { pattern: /never|don't|avoid|prohibited/i, type: "negative" },
  { pattern: /always|must|required|essential/i, type: "positive" },
  { pattern: /(\d+\.?\d*)\s*(sfm|rpm|ipm|mm\/min|m\/min)/i, type: "numeric_value" },
  { pattern: /(\d+\.?\d*)\s*%/i, type: "percentage" },
  { pattern: /(increase|decrease|reduce|raise|lower)/i, type: "directional" },
];

// ── Engine Implementation ──────────────────────────────────────────────────

class KnowledgeConflictResolverEngine {
  /**
   * Detect conflicts in the knowledge base
   */
  detectConflicts(options: {
    category?: string;
    limit?: number;
    min_severity?: "low" | "medium" | "high" | "critical";
  } = {}): ConflictDetectionResult {
    const start = Date.now();
    const { category, limit = 100, min_severity = "low" } = options;

    // Get tips to analyze
    const tips = tribalKnowledgeEngine.search({
      category: category as any,
      limit: 500,
    });

    const conflicts: KnowledgeConflict[] = [];
    const severityOrder = ["low", "medium", "high", "critical"];
    const minSeverityIdx = severityOrder.indexOf(min_severity);

    // Compare tips pairwise within same category
    for (let i = 0; i < tips.length; i++) {
      for (let j = i + 1; j < tips.length; j++) {
        if (tips[i].category !== tips[j].category) continue;

        const conflict = this.detectConflict(tips[i], tips[j]);
        if (conflict) {
          const conflictSeverityIdx = severityOrder.indexOf(conflict.severity);
          if (conflictSeverityIdx >= minSeverityIdx) {
            conflicts.push(conflict);
          }
        }

        if (conflicts.length >= limit) break;
      }
      if (conflicts.length >= limit) break;
    }

    // Aggregate stats
    const by_severity: Record<string, number> = {};
    const by_type: Record<string, number> = {};

    for (const c of conflicts) {
      by_severity[c.severity] = (by_severity[c.severity] || 0) + 1;
      by_type[c.conflict_type] = (by_type[c.conflict_type] || 0) + 1;
    }

    return {
      total_tips_analyzed: tips.length,
      conflicts_found: conflicts,
      by_severity,
      by_type,
      scan_time_ms: Date.now() - start,
    };
  }

  /**
   * Detect conflict between two specific tips
   */
  detectConflict(tipA: KnowledgeTip, tipB: KnowledgeTip): KnowledgeConflict | null {
    // Skip if tags don't overlap (different contexts)
    const tagOverlap = tipA.tags.filter(t => tipB.tags.includes(t));
    if (tagOverlap.length === 0) return null;

    const textA = `${tipA.title} ${tipA.body}`.toLowerCase();
    const textB = `${tipB.title} ${tipB.body}`.toLowerCase();

    // Check for opposing recommendations
    const negA = CONTRADICTION_PATTERNS[0].pattern.test(textA);
    const negB = CONTRADICTION_PATTERNS[0].pattern.test(textB);
    const posA = CONTRADICTION_PATTERNS[1].pattern.test(textA);
    const posB = CONTRADICTION_PATTERNS[1].pattern.test(textB);

    if ((negA && posB) || (posA && negB)) {
      return this.createConflict(tipA, tipB, "opposing_recommendations", "high",
        "One tip recommends action, other advises against it");
    }

    // Check for contradictory numeric values
    const numericA = textA.match(CONTRADICTION_PATTERNS[2].pattern);
    const numericB = textB.match(CONTRADICTION_PATTERNS[2].pattern);

    if (numericA && numericB) {
      const valA = parseFloat(numericA[1]);
      const valB = parseFloat(numericB[1]);
      const unitA = numericA[2].toLowerCase();
      const unitB = numericB[2].toLowerCase();

      if (unitA === unitB && Math.abs(valA - valB) / Math.max(valA, valB) > 0.3) {
        return this.createConflict(tipA, tipB, "contradictory_values", "medium",
          `Values differ significantly: ${valA} vs ${valB} ${unitA}`);
      }
    }

    // Check for outdated/superseded (significant age difference)
    if (tipA.created_at && tipB.created_at) {
      const dateA = new Date(tipA.created_at);
      const dateB = new Date(tipB.created_at);
      const ageDiffMonths = Math.abs(dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24 * 30);

      if (ageDiffMonths > 12 && this.hasSimilarContent(textA, textB)) {
        const newer = dateA > dateB ? tipA : tipB;
        const older = dateA > dateB ? tipB : tipA;
        return this.createConflict(older, newer, "outdated_superseded", "low",
          `Older tip may be superseded (${Math.round(ageDiffMonths)} months difference)`);
      }
    }

    // Check for directional conflicts
    const dirA = textA.match(CONTRADICTION_PATTERNS[4].pattern);
    const dirB = textB.match(CONTRADICTION_PATTERNS[4].pattern);

    if (dirA && dirB) {
      const incWords = ["increase", "raise"];
      const decWords = ["decrease", "reduce", "lower"];
      const dirValA = incWords.includes(dirA[1].toLowerCase()) ? 1 : -1;
      const dirValB = incWords.includes(dirB[1].toLowerCase()) ? 1 : -1;

      if (dirValA !== dirValB && this.hasSimilarContent(textA, textB)) {
        return this.createConflict(tipA, tipB, "opposing_recommendations", "medium",
          `Contradictory direction: ${dirA[1]} vs ${dirB[1]}`);
      }
    }

    return null;
  }

  /**
   * Resolve a conflict using automated strategies
   */
  resolve(conflict: KnowledgeConflict, strategy?: ResolutionStrategy): ConflictResolution {
    const effectiveStrategy = strategy || this.selectStrategy(conflict);

    switch (effectiveStrategy) {
      case "prefer_newer":
        return this.resolveByRecency(conflict, effectiveStrategy);

      case "prefer_higher_confidence":
        return this.resolveByConfidence(conflict, effectiveStrategy);

      case "prefer_higher_usage":
        return this.resolveByUsage(conflict, effectiveStrategy);

      case "prefer_source_authority":
        return this.resolveByAuthority(conflict, effectiveStrategy);

      case "merge_with_context":
        return this.resolveMerge(conflict, effectiveStrategy);

      case "deprecate_both":
        return {
          conflict,
          strategy_used: effectiveStrategy,
          action: "deprecate",
          rationale: "Both tips deprecated due to unresolvable conflict",
          auto_resolved: true,
        };

      case "flag_for_review":
      default:
        return {
          conflict,
          strategy_used: "flag_for_review",
          action: "review_required",
          rationale: "Conflict requires human review",
          auto_resolved: false,
        };
    }
  }

  /**
   * Batch resolve multiple conflicts
   */
  resolveAll(conflicts: KnowledgeConflict[]): ConflictResolution[] {
    return conflicts.map(c => this.resolve(c));
  }

  /**
   * Get suggested resolution for a conflict
   */
  suggest(conflict: KnowledgeConflict): {
    recommended_strategy: ResolutionStrategy;
    confidence: number;
    alternatives: ResolutionStrategy[];
  } {
    const strategy = this.selectStrategy(conflict);
    const confidence = this.getStrategyConfidence(conflict, strategy);

    const alternatives: ResolutionStrategy[] = [];
    if (strategy !== "prefer_newer") alternatives.push("prefer_newer");
    if (strategy !== "prefer_higher_confidence") alternatives.push("prefer_higher_confidence");
    if (conflict.severity !== "critical") alternatives.push("merge_with_context");

    return {
      recommended_strategy: strategy,
      confidence,
      alternatives: alternatives.slice(0, 2),
    };
  }

  // ── Private Methods ────────────────────────────────────────────────────────

  private createConflict(
    tipA: KnowledgeTip,
    tipB: KnowledgeTip,
    type: ConflictType,
    severity: "low" | "medium" | "high" | "critical",
    description: string
  ): KnowledgeConflict {
    return {
      id: `conflict-${tipA.id}-${tipB.id}`,
      tip_a: tipA,
      tip_b: tipB,
      conflict_type: type,
      severity,
      description,
      detected_at: new Date().toISOString(),
    };
  }

  private hasSimilarContent(textA: string, textB: string): boolean {
    // Simple word overlap check
    const wordsA = new Set(textA.split(/\s+/).filter(w => w.length > 3));
    const wordsB = new Set(textB.split(/\s+/).filter(w => w.length > 3));

    let overlap = 0;
    for (const word of wordsA) {
      if (wordsB.has(word)) overlap++;
    }

    return overlap / Math.min(wordsA.size, wordsB.size) > 0.3;
  }

  private selectStrategy(conflict: KnowledgeConflict): ResolutionStrategy {
    // Critical conflicts need human review
    if (conflict.severity === "critical") return "flag_for_review";

    // Outdated tips → prefer newer
    if (conflict.conflict_type === "outdated_superseded") return "prefer_newer";

    // Source disagreement → prefer authority
    if (conflict.conflict_type === "source_disagreement") return "prefer_source_authority";

    // Context ambiguity → try to merge
    if (conflict.conflict_type === "context_ambiguity") return "merge_with_context";

    // Default: prefer higher confidence
    return "prefer_higher_confidence";
  }

  private getStrategyConfidence(conflict: KnowledgeConflict, strategy: ResolutionStrategy): number {
    switch (strategy) {
      case "prefer_newer":
        const dateA = new Date(conflict.tip_a.created_at || 0);
        const dateB = new Date(conflict.tip_b.created_at || 0);
        const ageDiff = Math.abs(dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return Math.min(0.95, 0.5 + ageDiff * 0.05);

      case "prefer_higher_confidence":
        const confDiff = Math.abs(conflict.tip_a.confidence - conflict.tip_b.confidence);
        return Math.min(0.95, 0.5 + confDiff * 0.01);

      case "prefer_source_authority":
        const authA = this.getSourceAuthority(conflict.tip_a.source);
        const authB = this.getSourceAuthority(conflict.tip_b.source);
        return Math.min(0.95, 0.5 + Math.abs(authA - authB) * 0.005);

      default:
        return 0.5;
    }
  }

  private getSourceAuthority(source: string): number {
    const lowerSource = source.toLowerCase();
    for (const [key, value] of Object.entries(SOURCE_AUTHORITY)) {
      if (lowerSource.includes(key)) return value;
    }
    return SOURCE_AUTHORITY.unknown;
  }

  private resolveByRecency(conflict: KnowledgeConflict, strategy: ResolutionStrategy): ConflictResolution {
    const dateA = new Date(conflict.tip_a.created_at || 0);
    const dateB = new Date(conflict.tip_b.created_at || 0);
    const winner = dateA > dateB ? conflict.tip_a : conflict.tip_b;
    const loser = dateA > dateB ? conflict.tip_b : conflict.tip_a;

    return {
      conflict,
      strategy_used: strategy,
      winner,
      loser,
      action: "keep_winner",
      rationale: `Newer tip (${winner.created_at}) preferred over older (${loser.created_at})`,
      auto_resolved: true,
    };
  }

  private resolveByConfidence(conflict: KnowledgeConflict, strategy: ResolutionStrategy): ConflictResolution {
    const winner = conflict.tip_a.confidence >= conflict.tip_b.confidence
      ? conflict.tip_a : conflict.tip_b;
    const loser = winner === conflict.tip_a ? conflict.tip_b : conflict.tip_a;

    return {
      conflict,
      strategy_used: strategy,
      winner,
      loser,
      action: "keep_winner",
      rationale: `Higher confidence (${winner.confidence}%) preferred`,
      auto_resolved: true,
    };
  }

  private resolveByUsage(conflict: KnowledgeConflict, strategy: ResolutionStrategy): ConflictResolution {
    const winner = (conflict.tip_a.usage_count || 0) >= (conflict.tip_b.usage_count || 0)
      ? conflict.tip_a : conflict.tip_b;
    const loser = winner === conflict.tip_a ? conflict.tip_b : conflict.tip_a;

    return {
      conflict,
      strategy_used: strategy,
      winner,
      loser,
      action: "keep_winner",
      rationale: `Higher usage count (${winner.usage_count}) indicates proven value`,
      auto_resolved: true,
    };
  }

  private resolveByAuthority(conflict: KnowledgeConflict, strategy: ResolutionStrategy): ConflictResolution {
    const authA = this.getSourceAuthority(conflict.tip_a.source);
    const authB = this.getSourceAuthority(conflict.tip_b.source);
    const winner = authA >= authB ? conflict.tip_a : conflict.tip_b;
    const loser = winner === conflict.tip_a ? conflict.tip_b : conflict.tip_a;

    return {
      conflict,
      strategy_used: strategy,
      winner,
      loser,
      action: "keep_winner",
      rationale: `Source "${winner.source}" has higher authority (${Math.max(authA, authB)})`,
      auto_resolved: true,
    };
  }

  private resolveMerge(conflict: KnowledgeConflict, strategy: ResolutionStrategy): ConflictResolution {
    // Merge would create a new tip combining both contexts
    // For now, flag for review with merge suggestion
    return {
      conflict,
      strategy_used: strategy,
      action: "merge",
      rationale: "Tips cover different contexts — suggest merging with explicit context qualifiers",
      auto_resolved: false,
    };
  }
}

// ── Export Singleton ───────────────────────────────────────────────────────

export const knowledgeConflictResolverEngine = new KnowledgeConflictResolverEngine();
export { KnowledgeConflictResolverEngine };
