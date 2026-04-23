/**
 * WEDMTribalTipLearnerEngine.ts — MS-P1-LEARN-LOOP U-P1-LL-03
 *
 * Generates new tribal tips from confirmed patterns:
 * 1. Pulls tip candidates from WEDMFeedbackIngestionEngine
 * 2. Scores candidates by pattern strength, frequency, and confidence
 * 3. Generates formatted tips for the tribal runtime corpus
 * 4. Auto-approves high-confidence tips, queues others for review
 * 5. Updates tribal runtime when tips are approved
 *
 * Tip sources:
 * - Operator corrections (high value — directly fixes AI predictions)
 * - Operator notes (medium value — requires NLP extraction)
 * - Failure patterns (high value — what to avoid)
 * - Success patterns (medium value — reinforce good predictions)
 */

import { wedmFeedbackIngestionEngine } from "./WEDMFeedbackIngestionEngine.js";
import { wedmTribalRuntimeEngine } from "./WEDMTribalRuntimeEngine.js";

// ── Types ────────────────────────────────────────────────────────────────

interface TipCandidate {
  id: string;
  source_job: string;
  pattern_type: "correction" | "success_pattern" | "failure_pattern" | "operator_note";
  keywords: string[];
  context: Record<string, unknown>;
  note?: string;
  created_at: string;
}

interface GeneratedTip {
  id: string;
  source_candidate_id: string;
  text: string;
  keywords: string[];
  tags: string[];
  confidence: number;
  source: "learned";
  approved: boolean;
  created_at: string;
}

interface ProcessingResult {
  processed: number;
  auto_approved: number;
  pending_review: number;
  rejected: number;
  new_tips: GeneratedTip[];
}

// ── Engine ───────────────────────────────────────────────────────────────

class WEDMTribalTipLearnerEngine {
  private generatedTips: GeneratedTip[] = [];
  private pendingReview: GeneratedTip[] = [];

  private stats = {
    totalProcessed: 0,
    autoApproved: 0,
    manuallyApproved: 0,
    rejected: 0,
    tipsGenerated: 0,
  };

  private readonly MAX_GENERATED_TIPS = 500;
  private readonly MAX_PENDING_REVIEW = 100;

  /**
   * Process pending tip candidates from the feedback ingestion queue.
   * @param maxCandidates Maximum candidates to process in one batch
   * @param autoApproveThreshold Confidence threshold for auto-approval (0-1)
   */
  async processQueue(
    maxCandidates = 50,
    autoApproveThreshold = 0.85
  ): Promise<ProcessingResult> {
    const candidates = wedmFeedbackIngestionEngine.getTipCandidates(maxCandidates);
    const processedIds: string[] = [];
    const newTips: GeneratedTip[] = [];
    let autoApproved = 0;
    let pendingReview = 0;
    let rejected = 0;

    for (const candidate of candidates) {
      const result = this.processCandidate(candidate, autoApproveThreshold);
      processedIds.push(candidate.id);
      this.stats.totalProcessed++;

      if (result.status === "rejected") {
        rejected++;
        this.stats.rejected++;
        continue;
      }

      const tip = result.tip!;
      newTips.push(tip);
      this.stats.tipsGenerated++;

      if (result.status === "auto_approved") {
        autoApproved++;
        this.stats.autoApproved++;
        this.addApprovedTip(tip);
      } else {
        pendingReview++;
        this.pendingReview.push(tip);
        if (this.pendingReview.length > this.MAX_PENDING_REVIEW) {
          this.pendingReview.shift();
        }
      }
    }

    // Mark processed candidates as consumed
    wedmFeedbackIngestionEngine.markTipCandidatesProcessed(processedIds);

    return {
      processed: processedIds.length,
      auto_approved: autoApproved,
      pending_review: pendingReview,
      rejected,
      new_tips: newTips,
    };
  }

  /**
   * Process a single candidate and generate a tip if valuable.
   */
  private processCandidate(
    candidate: TipCandidate,
    autoApproveThreshold: number
  ): { status: "auto_approved" | "pending_review" | "rejected"; tip?: GeneratedTip } {
    // Score the candidate
    const score = this.scoreCandidate(candidate);

    // Reject low-quality candidates
    if (score < 0.3) {
      return { status: "rejected" };
    }

    // Generate tip text
    const tipText = this.generateTipText(candidate);
    if (!tipText) {
      return { status: "rejected" };
    }

    // Build the tip
    const tip: GeneratedTip = {
      id: `learned-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      source_candidate_id: candidate.id,
      text: tipText,
      keywords: candidate.keywords,
      tags: this.generateTags(candidate),
      confidence: score,
      source: "learned",
      approved: score >= autoApproveThreshold,
      created_at: new Date().toISOString(),
    };

    if (score >= autoApproveThreshold) {
      return { status: "auto_approved", tip };
    }
    return { status: "pending_review", tip };
  }

  /**
   * Score a candidate based on pattern type, context richness, and clarity.
   */
  private scoreCandidate(candidate: TipCandidate): number {
    let score = 0;

    // Base score by pattern type
    switch (candidate.pattern_type) {
      case "correction":
        score = 0.7; // High base — direct AI correction
        break;
      case "failure_pattern":
        score = 0.65; // High — what to avoid
        break;
      case "operator_note":
        score = 0.5; // Medium — needs NLP extraction
        break;
      case "success_pattern":
        score = 0.4; // Lower — reinforcement
        break;
    }

    // Boost for rich context
    const contextKeys = Object.keys(candidate.context).filter(k => candidate.context[k] !== undefined);
    score += Math.min(contextKeys.length * 0.03, 0.15);

    // Boost for specific keywords
    if (candidate.keywords.length >= 3) {
      score += 0.1;
    }

    // Boost for operator note with substance
    if (candidate.note && candidate.note.length > 20) {
      score += 0.1;
    }

    // Boost for material specificity
    if (candidate.context.material && typeof candidate.context.material === "string") {
      score += 0.05;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Generate human-readable tip text from a candidate.
   */
  private generateTipText(candidate: TipCandidate): string | null {
    const ctx = candidate.context;
    const material = ctx.material as string | undefined;
    const thickness = ctx.thickness_mm as number | undefined;

    switch (candidate.pattern_type) {
      case "correction": {
        const original = ctx.original;
        const corrected = ctx.corrected;
        if (original === undefined || corrected === undefined) return null;

        const key = candidate.keywords[1] || "parameter";
        let tipText = `For ${material || "this material"}`;
        if (thickness) tipText += ` at ${thickness}mm`;
        tipText += `, ${key} should be ${corrected} (not ${original})`;
        if (candidate.note) tipText += `. ${candidate.note}`;
        return tipText;
      }

      case "failure_pattern": {
        const action = ctx.action as string | undefined;
        let tipText = `Avoid: `;
        if (material) tipText += `${material} `;
        if (action) tipText += `${action} `;
        tipText += `with these parameters can fail`;
        if (thickness && thickness > 50) tipText += ` (thick stock)`;
        if (thickness && thickness < 5) tipText += ` (thin stock)`;
        return tipText;
      }

      case "operator_note": {
        if (!candidate.note || candidate.note.length < 10) return null;
        // Clean and format the note
        let tipText = candidate.note.trim();
        // Capitalize first letter
        tipText = tipText.charAt(0).toUpperCase() + tipText.slice(1);
        // Add context prefix if material is known
        if (material) {
          tipText = `${material}: ${tipText}`;
        }
        return tipText;
      }

      case "success_pattern": {
        const action = ctx.action as string | undefined;
        if (!action) return null;
        let tipText = `Good results: `;
        if (material) tipText += `${material} `;
        tipText += `${action}`;
        if (thickness) tipText += ` at ${thickness}mm`;
        return tipText;
      }

      default:
        return null;
    }
  }

  /**
   * Generate tags for a tip based on its context.
   */
  private generateTags(candidate: TipCandidate): string[] {
    const tags: string[] = [];
    const ctx = candidate.context;

    // Pattern type tag
    tags.push(candidate.pattern_type);

    // Material tag
    if (ctx.material && typeof ctx.material === "string") {
      tags.push(`material:${(ctx.material as string).toLowerCase()}`);
    }

    // Thickness category
    const thickness = ctx.thickness_mm as number | undefined;
    if (thickness) {
      if (thickness < 5) tags.push("thin-stock");
      else if (thickness > 50) tags.push("thick-stock");
      else tags.push("standard-thickness");
    }

    // Action tag
    if (ctx.action && typeof ctx.action === "string") {
      tags.push(`action:${ctx.action}`);
    }

    return tags;
  }

  /**
   * Add an approved tip to the tribal runtime corpus.
   */
  private addApprovedTip(tip: GeneratedTip): void {
    // Add to local storage
    this.generatedTips.push(tip);
    if (this.generatedTips.length > this.MAX_GENERATED_TIPS) {
      this.generatedTips.shift();
    }

    // Register with tribal runtime
    try {
      wedmTribalRuntimeEngine.registerLearnedTip({
        text: tip.text,
        keywords: tip.keywords,
        tags: tip.tags,
        confidence: tip.confidence,
        source: "learned",
        learned_from: tip.source_candidate_id,
      });
    } catch {
      // Tribal runtime may not support dynamic registration yet
    }
  }

  /**
   * Get tips pending manual review.
   */
  getPendingReview(limit = 50): GeneratedTip[] {
    return this.pendingReview.slice(-limit);
  }

  /**
   * Approve a pending tip.
   */
  approveTip(tipId: string): boolean {
    const idx = this.pendingReview.findIndex(t => t.id === tipId);
    if (idx < 0) return false;

    const tip = this.pendingReview.splice(idx, 1)[0];
    tip.approved = true;
    this.stats.manuallyApproved++;
    this.addApprovedTip(tip);
    return true;
  }

  /**
   * Reject a pending tip.
   */
  rejectTip(tipId: string): boolean {
    const idx = this.pendingReview.findIndex(t => t.id === tipId);
    if (idx < 0) return false;

    this.pendingReview.splice(idx, 1);
    this.stats.rejected++;
    return true;
  }

  /**
   * Get all approved tips (learned corpus).
   */
  getLearnedTips(limit = 100): GeneratedTip[] {
    return this.generatedTips.filter(t => t.approved).slice(-limit);
  }

  /**
   * Get learning statistics.
   */
  getStats(): typeof this.stats & { pendingReviewCount: number; learnedCorpusSize: number } {
    return {
      ...this.stats,
      pendingReviewCount: this.pendingReview.length,
      learnedCorpusSize: this.generatedTips.filter(t => t.approved).length,
    };
  }

  /**
   * Reset for testing.
   */
  resetForTests(): void {
    this.generatedTips = [];
    this.pendingReview = [];
    this.stats = {
      totalProcessed: 0,
      autoApproved: 0,
      manuallyApproved: 0,
      rejected: 0,
      tipsGenerated: 0,
    };
  }
}

export const wedmTribalTipLearnerEngine = new WEDMTribalTipLearnerEngine();
