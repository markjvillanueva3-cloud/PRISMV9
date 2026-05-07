/**
 * LatheLoRAKnowledgeCuratorEngine — LATHE-LORA-MS0 U-LLR40
 * =========================================================
 *
 * Curates, deduplicates, and ranks extracted knowledge.
 * Ensures training data quality through scoring and filtering.
 *
 * Features:
 *   - Deduplication (exact + semantic)
 *   - Quality scoring
 *   - Conflict resolution
 *   - Ranking and filtering
 *
 * @module engines/LatheLoRAKnowledgeCuratorEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Curation action */
export type CurationAction = "accept" | "reject" | "merge" | "flag_for_review";

/** Knowledge item (generic) */
export interface KnowledgeItem {
  id: string;
  content: string;
  category?: string;
  source: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

/** Curated item with quality assessment */
export interface CuratedItem {
  original_id: string;
  item: KnowledgeItem;
  quality_score: number;
  action: CurationAction;
  duplicate_of?: string;
  conflicts_with?: string[];
  rank: number;
  curated_at: number;
}

/** Curation report */
export interface CurationReport {
  total_processed: number;
  accepted: number;
  rejected: number;
  merged: number;
  flagged: number;
  avg_quality: number;
  duplicates_found: number;
  conflicts_found: number;
}

/** Curator configuration */
export interface CuratorConfig {
  min_quality_score: number;
  duplicate_threshold: number;
  conflict_similarity_threshold: number;
  max_curated_items: number;
  require_source: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: CuratorConfig = {
  min_quality_score: 0.4,
  duplicate_threshold: 0.85,
  conflict_similarity_threshold: 0.6,
  max_curated_items: 5000,
  require_source: true,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAKnowledgeCuratorEngine {
  private config: CuratorConfig = DEFAULT_CONFIG;
  private curated: CuratedItem[] = [];

  /**
   * Set configuration
   */
  setConfig(config: Partial<CuratorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): CuratorConfig {
    return { ...this.config };
  }

  /**
   * Compute text similarity (Jaccard on word sets)
   */
  textSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().match(/\b[a-z0-9]+\b/g) || []);
    const wordsB = new Set(b.toLowerCase().match(/\b[a-z0-9]+\b/g) || []);

    if (wordsA.size === 0 && wordsB.size === 0) return 1;
    if (wordsA.size === 0 || wordsB.size === 0) return 0;

    let intersection = 0;
    for (const w of wordsA) {
      if (wordsB.has(w)) intersection++;
    }
    const union = wordsA.size + wordsB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Score item quality
   */
  scoreQuality(item: KnowledgeItem): number {
    let score = 0;

    // Base: confidence
    score += item.confidence * 0.4;

    // Content length signal
    const contentLen = item.content.length;
    if (contentLen > 20 && contentLen < 500) score += 0.2;
    else if (contentLen >= 500) score += 0.15;

    // Has source
    if (item.source && item.source.length > 0) score += 0.1;

    // Has category
    if (item.category) score += 0.1;

    // Content richness (unique word count)
    const uniqueWords = new Set(item.content.toLowerCase().match(/\b[a-z0-9]+\b/g) || []);
    if (uniqueWords.size > 5) score += 0.1;
    if (uniqueWords.size > 15) score += 0.1;

    return Math.min(1.0, score);
  }

  /**
   * Detect duplicates among existing curated items
   */
  findDuplicates(item: KnowledgeItem): CuratedItem[] {
    const duplicates: CuratedItem[] = [];
    for (const existing of this.curated) {
      const sim = this.textSimilarity(item.content, existing.item.content);
      if (sim >= this.config.duplicate_threshold) {
        duplicates.push(existing);
      }
    }
    return duplicates;
  }

  /**
   * Detect conflicts (same topic, contradictory content)
   */
  findConflicts(item: KnowledgeItem): CuratedItem[] {
    const conflicts: CuratedItem[] = [];
    for (const existing of this.curated) {
      // Same category but below duplicate threshold + above conflict threshold
      if (existing.item.category !== item.category) continue;

      const sim = this.textSimilarity(item.content, existing.item.content);
      if (sim >= this.config.conflict_similarity_threshold && sim < this.config.duplicate_threshold) {
        // Check for opposing recommendations
        const itemHasOpposing = this.hasOpposingLanguage(item.content, existing.item.content);
        if (itemHasOpposing) {
          conflicts.push(existing);
        }
      }
    }
    return conflicts;
  }

  /**
   * Detect opposing language signals
   */
  private hasOpposingLanguage(a: string, b: string): boolean {
    const opposingPairs: Array<[string, string]> = [
      ["increase", "decrease"],
      ["reduce", "raise"],
      ["faster", "slower"],
      ["higher", "lower"],
      ["always", "never"],
      ["do not", "always do"],
      ["avoid", "use"],
    ];

    const lowerA = a.toLowerCase();
    const lowerB = b.toLowerCase();

    for (const [p1, p2] of opposingPairs) {
      if ((lowerA.includes(p1) && lowerB.includes(p2)) ||
          (lowerA.includes(p2) && lowerB.includes(p1))) {
        return true;
      }
    }
    return false;
  }

  /**
   * Curate a single item
   */
  curateItem(item: KnowledgeItem): CuratedItem {
    const qualityScore = this.scoreQuality(item);
    const duplicates = this.findDuplicates(item);
    const conflicts = this.findConflicts(item);

    let action: CurationAction = "accept";
    let duplicateOf: string | undefined;

    // Source requirement
    if (this.config.require_source && (!item.source || item.source.length === 0)) {
      action = "reject";
    }
    // Quality gate
    else if (qualityScore < this.config.min_quality_score) {
      action = "reject";
    }
    // Duplicate handling
    else if (duplicates.length > 0) {
      // Keep higher quality; if new is better, accept and flag old
      const bestDup = duplicates.sort((a, b) => b.quality_score - a.quality_score)[0];
      if (qualityScore > bestDup.quality_score) {
        action = "accept";
      } else {
        action = "merge";
        duplicateOf = bestDup.original_id;
      }
    }
    // Conflict handling
    else if (conflicts.length > 0) {
      action = "flag_for_review";
    }

    const curated: CuratedItem = {
      original_id: item.id,
      item,
      quality_score: qualityScore,
      action,
      duplicate_of: duplicateOf,
      conflicts_with: conflicts.length > 0 ? conflicts.map(c => c.original_id) : undefined,
      rank: 0, // will be set after curation
      curated_at: Date.now(),
    };

    if (action === "accept") {
      this.curated.push(curated);

      // Trim
      if (this.curated.length > this.config.max_curated_items) {
        this.curated = this.curated.slice(-this.config.max_curated_items);
      }

      // Re-rank
      this.updateRankings();
    }

    return curated;
  }

  /**
   * Batch curate
   */
  curateBatch(items: KnowledgeItem[]): CuratedItem[] {
    return items.map(item => this.curateItem(item));
  }

  /**
   * Update rankings based on quality
   */
  private updateRankings(): void {
    this.curated.sort((a, b) => b.quality_score - a.quality_score);
    this.curated.forEach((item, index) => {
      item.rank = index + 1;
    });
  }

  /**
   * Get top-ranked items
   */
  getTopRanked(limit: number = 10): CuratedItem[] {
    this.updateRankings();
    return this.curated.slice(0, limit);
  }

  /**
   * Get items by category
   */
  getByCategory(category: string): CuratedItem[] {
    return this.curated.filter(c => c.item.category === category);
  }

  /**
   * Generate curation report for a batch
   */
  generateReport(batch: CuratedItem[]): CurationReport {
    const total = batch.length;
    let accepted = 0, rejected = 0, merged = 0, flagged = 0;
    let duplicates = 0, conflicts = 0;
    let qualitySum = 0;

    for (const c of batch) {
      qualitySum += c.quality_score;
      if (c.action === "accept") accepted++;
      else if (c.action === "reject") rejected++;
      else if (c.action === "merge") { merged++; duplicates++; }
      else if (c.action === "flag_for_review") { flagged++; conflicts++; }
      if (c.duplicate_of) duplicates++;
      if (c.conflicts_with && c.conflicts_with.length > 0) conflicts++;
    }

    return {
      total_processed: total,
      accepted,
      rejected,
      merged,
      flagged,
      avg_quality: total > 0 ? qualitySum / total : 0,
      duplicates_found: duplicates,
      conflicts_found: conflicts,
    };
  }

  /**
   * Filter for training-ready items
   */
  getTrainingReady(minQuality: number = 0.7): CuratedItem[] {
    return this.curated.filter(c =>
      c.action === "accept" && c.quality_score >= minQuality
    );
  }

  /**
   * Get curated items
   */
  getCurated(limit?: number): CuratedItem[] {
    const list = [...this.curated];
    return limit ? list.slice(0, limit) : list;
  }

  /**
   * Get summary
   */
  getSummary(): string {
    const report = this.generateReport(this.curated);
    const lines = [
      "Knowledge Curator Summary",
      "=========================",
      `Total Curated: ${report.total_processed}`,
      `Accepted: ${report.accepted}`,
      `Rejected: ${report.rejected}`,
      `Merged: ${report.merged}`,
      `Flagged: ${report.flagged}`,
      `Avg Quality: ${report.avg_quality.toFixed(3)}`,
      `Duplicates Found: ${report.duplicates_found}`,
      `Conflicts Found: ${report.conflicts_found}`,
    ];
    return lines.join("\n");
  }

  /**
   * Clear curated items
   */
  clear(): void {
    this.curated = [];
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.curated = [];
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAKnowledgeCuratorEngine = new LatheLoRAKnowledgeCuratorEngine();
