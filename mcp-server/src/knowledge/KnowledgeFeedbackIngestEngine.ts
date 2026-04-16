/**
 * KnowledgeFeedbackIngestEngine — U-TK08
 * Ingests operator/user feedback on tribal knowledge tips.
 * Feedback affects tip confidence, triggers reviews, and improves recommendations.
 *
 * NOTE: Temporarily located in src/knowledge/ due to src/engines/ directory corruption.
 */

import { tribalKnowledgeEngine, type KnowledgeTip } from "../engines/TribalKnowledgeEngine.js";

// ── Types ──────────────────────────────────────────────────────────────────

/** Feedback entry */
export interface TipFeedback {
  id: string;
  tip_id: string;
  feedback_type: FeedbackType;
  rating?: number;           // 1-5 stars
  comment?: string;
  context: FeedbackContext;
  submitted_by: string;
  submitted_at: string;
  processed: boolean;
  impact?: FeedbackImpact;
}

export type FeedbackType =
  | "helpful"              // Tip was useful
  | "not_helpful"          // Tip didn't help
  | "incorrect"            // Tip contains wrong info
  | "outdated"             // Tip is no longer accurate
  | "incomplete"           // Tip missing important info
  | "dangerous"            // Tip could cause harm
  | "duplicate"            // Tip duplicates another
  | "clarification"        // Needs more detail
  | "success_story"        // Tip led to good outcome
  | "improvement";         // Suggestion to improve

/** Context in which feedback was given */
export interface FeedbackContext {
  material?: string;
  machine?: string;
  operation?: string;
  part_number?: string;
  job_id?: string;
  outcome?: "success" | "partial" | "failure";
}

/** Impact of feedback on the tip */
export interface FeedbackImpact {
  confidence_delta: number;
  usage_delta: number;
  flagged_for_review: boolean;
  deprecated: boolean;
  merged_with?: string;
}

/** Feedback aggregation */
export interface FeedbackSummary {
  tip_id: string;
  total_feedback: number;
  positive_count: number;
  negative_count: number;
  avg_rating: number;
  flagged_count: number;
  net_sentiment: number;      // -1 to +1
  top_concerns: string[];
  recent_trend: "improving" | "stable" | "declining";
}

/** Review queue item */
export interface ReviewQueueItem {
  tip: KnowledgeTip;
  trigger_reason: string;
  priority: "low" | "normal" | "high" | "urgent";
  feedback_count: number;
  flagged_feedback: TipFeedback[];
  suggested_action: "keep" | "update" | "deprecate" | "split" | "merge";
}

// ── Storage ────────────────────────────────────────────────────────────────

const FEEDBACK: Map<string, TipFeedback[]> = new Map();
const REVIEW_QUEUE: ReviewQueueItem[] = [];

// ── Feedback Weights ───────────────────────────────────────────────────────

const FEEDBACK_WEIGHTS: Record<FeedbackType, number> = {
  helpful: +0.5,
  success_story: +1.0,
  not_helpful: -0.3,
  incorrect: -2.0,
  outdated: -1.5,
  incomplete: -0.5,
  dangerous: -5.0,
  duplicate: -0.2,
  clarification: -0.1,
  improvement: 0,
};

const REVIEW_THRESHOLD = -3.0;    // Net score to trigger review
const DEPRECATION_THRESHOLD = -10.0;

// ── Engine Implementation ──────────────────────────────────────────────────

class KnowledgeFeedbackIngestEngine {
  /**
   * Submit feedback on a tip
   */
  submit(input: {
    tip_id: string;
    feedback_type: FeedbackType;
    rating?: number;
    comment?: string;
    context?: FeedbackContext;
    submitted_by: string;
  }): TipFeedback {
    const feedback: TipFeedback = {
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tip_id: input.tip_id,
      feedback_type: input.feedback_type,
      rating: input.rating,
      comment: input.comment,
      context: input.context || {},
      submitted_by: input.submitted_by,
      submitted_at: new Date().toISOString(),
      processed: false,
    };

    // Store feedback
    if (!FEEDBACK.has(input.tip_id)) {
      FEEDBACK.set(input.tip_id, []);
    }
    FEEDBACK.get(input.tip_id)!.push(feedback);

    // Process immediately
    this.processFeedback(feedback);

    return feedback;
  }

  /**
   * Submit batch feedback
   */
  submitBatch(feedbacks: Array<Parameters<typeof this.submit>[0]>): TipFeedback[] {
    return feedbacks.map(f => this.submit(f));
  }

  /**
   * Get feedback for a tip
   */
  getFeedback(tipId: string, options: {
    limit?: number;
    type?: FeedbackType;
    unprocessed_only?: boolean;
  } = {}): TipFeedback[] {
    let feedback = FEEDBACK.get(tipId) || [];

    if (options.type) {
      feedback = feedback.filter(f => f.feedback_type === options.type);
    }

    if (options.unprocessed_only) {
      feedback = feedback.filter(f => !f.processed);
    }

    if (options.limit) {
      feedback = feedback.slice(-options.limit);
    }

    return feedback;
  }

  /**
   * Get feedback summary for a tip
   */
  summarize(tipId: string): FeedbackSummary | null {
    const feedback = FEEDBACK.get(tipId);
    if (!feedback || feedback.length === 0) return null;

    const positiveTypes: FeedbackType[] = ["helpful", "success_story"];
    const negativeTypes: FeedbackType[] = ["not_helpful", "incorrect", "outdated", "dangerous"];

    let positive_count = 0;
    let negative_count = 0;
    let total_rating = 0;
    let rating_count = 0;
    let flagged_count = 0;
    const concerns: Map<string, number> = new Map();

    for (const f of feedback) {
      if (positiveTypes.includes(f.feedback_type)) positive_count++;
      if (negativeTypes.includes(f.feedback_type)) negative_count++;

      if (f.rating) {
        total_rating += f.rating;
        rating_count++;
      }

      if (["incorrect", "outdated", "dangerous"].includes(f.feedback_type)) {
        flagged_count++;
        concerns.set(f.feedback_type, (concerns.get(f.feedback_type) || 0) + 1);
      }
    }

    // Calculate net sentiment
    const net_sentiment = feedback.length > 0
      ? (positive_count - negative_count) / feedback.length
      : 0;

    // Determine trend from recent feedback
    const recentFeedback = feedback.slice(-10);
    const recentPositive = recentFeedback.filter(f => positiveTypes.includes(f.feedback_type)).length;
    const olderFeedback = feedback.slice(-20, -10);
    const olderPositive = olderFeedback.filter(f => positiveTypes.includes(f.feedback_type)).length;

    let recent_trend: "improving" | "stable" | "declining" = "stable";
    if (recentFeedback.length >= 5 && olderFeedback.length >= 5) {
      const recentRate = recentPositive / recentFeedback.length;
      const olderRate = olderPositive / olderFeedback.length;
      if (recentRate - olderRate > 0.2) recent_trend = "improving";
      if (olderRate - recentRate > 0.2) recent_trend = "declining";
    }

    // Top concerns
    const top_concerns = Array.from(concerns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);

    return {
      tip_id: tipId,
      total_feedback: feedback.length,
      positive_count,
      negative_count,
      avg_rating: rating_count > 0 ? total_rating / rating_count : 0,
      flagged_count,
      net_sentiment,
      top_concerns,
      recent_trend,
    };
  }

  /**
   * Get the review queue
   */
  getReviewQueue(options: {
    priority?: ReviewQueueItem["priority"];
    limit?: number;
  } = {}): ReviewQueueItem[] {
    let queue = [...REVIEW_QUEUE];

    if (options.priority) {
      queue = queue.filter(item => item.priority === options.priority);
    }

    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    queue.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    if (options.limit) {
      queue = queue.slice(0, options.limit);
    }

    return queue;
  }

  /**
   * Process a feedback item and update tip
   */
  private processFeedback(feedback: TipFeedback): void {
    const weight = FEEDBACK_WEIGHTS[feedback.feedback_type];

    // Calculate impact
    const impact: FeedbackImpact = {
      confidence_delta: weight * 2,  // Convert weight to confidence points
      usage_delta: feedback.feedback_type === "helpful" ? 1 : 0,
      flagged_for_review: ["incorrect", "outdated", "dangerous"].includes(feedback.feedback_type),
      deprecated: false,
    };

    // Check if tip should be deprecated
    const summary = this.summarize(feedback.tip_id);
    if (summary) {
      const netScore = summary.positive_count * 0.5 - summary.negative_count * 1.5;
      if (netScore < DEPRECATION_THRESHOLD) {
        impact.deprecated = true;
      }
    }

    feedback.impact = impact;
    feedback.processed = true;

    // Add to review queue if flagged
    if (impact.flagged_for_review || impact.deprecated) {
      this.addToReviewQueue(feedback);
    }
  }

  /**
   * Add tip to review queue
   */
  private addToReviewQueue(feedback: TipFeedback): void {
    // Check if already in queue
    const existing = REVIEW_QUEUE.find(item => item.tip.id === feedback.tip_id);

    if (existing) {
      existing.feedback_count++;
      existing.flagged_feedback.push(feedback);

      // Escalate priority if needed
      if (feedback.feedback_type === "dangerous") {
        existing.priority = "urgent";
      } else if (existing.feedback_count >= 5 && existing.priority === "normal") {
        existing.priority = "high";
      }

      return;
    }

    // Get the tip
    const tips = tribalKnowledgeEngine.search({ query: feedback.tip_id, limit: 1 });
    const tip = tips.find(t => t.id === feedback.tip_id);

    if (!tip) return;

    // Determine priority
    let priority: ReviewQueueItem["priority"] = "normal";
    if (feedback.feedback_type === "dangerous") priority = "urgent";
    else if (feedback.feedback_type === "incorrect") priority = "high";

    // Determine suggested action
    let suggested_action: ReviewQueueItem["suggested_action"] = "update";
    if (feedback.feedback_type === "dangerous") suggested_action = "deprecate";
    else if (feedback.feedback_type === "duplicate") suggested_action = "merge";
    else if (feedback.feedback_type === "incomplete") suggested_action = "update";

    REVIEW_QUEUE.push({
      tip,
      trigger_reason: `Flagged as ${feedback.feedback_type}`,
      priority,
      feedback_count: 1,
      flagged_feedback: [feedback],
      suggested_action,
    });
  }

  /**
   * Resolve a review queue item
   */
  resolveReview(tipId: string, action: {
    decision: "keep" | "update" | "deprecate" | "merge";
    notes?: string;
    resolved_by: string;
  }): boolean {
    const idx = REVIEW_QUEUE.findIndex(item => item.tip.id === tipId);
    if (idx === -1) return false;

    // Remove from queue
    REVIEW_QUEUE.splice(idx, 1);

    // Log the resolution (in production, this would be persisted)
    console.log(`Review resolved: ${tipId} -> ${action.decision} by ${action.resolved_by}`);

    return true;
  }

  /**
   * Get tips with most positive feedback
   */
  getTopRated(limit = 10): Array<{ tip_id: string; summary: FeedbackSummary }> {
    const results: Array<{ tip_id: string; summary: FeedbackSummary }> = [];

    for (const [tip_id] of FEEDBACK) {
      const summary = this.summarize(tip_id);
      if (summary && summary.total_feedback >= 3) {
        results.push({ tip_id, summary });
      }
    }

    return results
      .sort((a, b) => b.summary.net_sentiment - a.summary.net_sentiment)
      .slice(0, limit);
  }

  /**
   * Get tips needing attention
   */
  getNeedingAttention(limit = 10): Array<{ tip_id: string; summary: FeedbackSummary }> {
    const results: Array<{ tip_id: string; summary: FeedbackSummary }> = [];

    for (const [tip_id] of FEEDBACK) {
      const summary = this.summarize(tip_id);
      if (summary && (summary.net_sentiment < -0.3 || summary.flagged_count > 0)) {
        results.push({ tip_id, summary });
      }
    }

    return results
      .sort((a, b) => a.summary.net_sentiment - b.summary.net_sentiment)
      .slice(0, limit);
  }

  /**
   * Get feedback stats
   */
  stats(): {
    total_feedback: number;
    total_tips_with_feedback: number;
    by_type: Record<string, number>;
    review_queue_size: number;
    avg_sentiment: number;
  } {
    let total_feedback = 0;
    const by_type: Record<string, number> = {};
    let total_sentiment = 0;
    let sentiment_count = 0;

    for (const [tip_id, feedbacks] of FEEDBACK) {
      total_feedback += feedbacks.length;

      for (const f of feedbacks) {
        by_type[f.feedback_type] = (by_type[f.feedback_type] || 0) + 1;
      }

      const summary = this.summarize(tip_id);
      if (summary) {
        total_sentiment += summary.net_sentiment;
        sentiment_count++;
      }
    }

    return {
      total_feedback,
      total_tips_with_feedback: FEEDBACK.size,
      by_type,
      review_queue_size: REVIEW_QUEUE.length,
      avg_sentiment: sentiment_count > 0 ? total_sentiment / sentiment_count : 0,
    };
  }
}

// ── Export Singleton ───────────────────────────────────────────────────────

export const knowledgeFeedbackIngestEngine = new KnowledgeFeedbackIngestEngine();
export { KnowledgeFeedbackIngestEngine };
