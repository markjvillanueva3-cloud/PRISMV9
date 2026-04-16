/**
 * KnowledgePromotionEngine — U-TK09
 * Handles promotion lifecycle of tribal knowledge tips.
 * Tips progress: draft → captured → validated → verified → canonical
 *
 * NOTE: Temporarily located in src/knowledge/ due to src/engines/ directory corruption.
 */

import { tribalKnowledgeEngine, type KnowledgeTip } from "../engines/TribalKnowledgeEngine.js";
import { knowledgeFeedbackIngestEngine } from "./KnowledgeFeedbackIngestEngine.js";

// ── Types ──────────────────────────────────────────────────────────────────

/** Promotion stage in the knowledge lifecycle */
export type PromotionStage =
  | "draft"       // Just captured, not reviewed
  | "captured"    // Reviewed, basic validation passed
  | "validated"   // Verified by engineer or senior machinist
  | "verified"    // Proven in production (3+ success applications)
  | "canonical";  // Part of official knowledge base

/** Promotion criteria */
export interface PromotionCriteria {
  min_confidence: number;
  min_usage_count: number;
  min_positive_feedback: number;
  max_negative_feedback: number;
  requires_engineer_approval: boolean;
  requires_success_story: boolean;
  max_age_days?: number;
}

/** Stage-specific criteria */
const STAGE_CRITERIA: Record<PromotionStage, PromotionCriteria | null> = {
  draft: null, // Entry stage, no criteria
  captured: {
    min_confidence: 50,
    min_usage_count: 0,
    min_positive_feedback: 0,
    max_negative_feedback: 3,
    requires_engineer_approval: false,
    requires_success_story: false,
  },
  validated: {
    min_confidence: 70,
    min_usage_count: 2,
    min_positive_feedback: 2,
    max_negative_feedback: 2,
    requires_engineer_approval: true,
    requires_success_story: false,
  },
  verified: {
    min_confidence: 85,
    min_usage_count: 5,
    min_positive_feedback: 5,
    max_negative_feedback: 1,
    requires_engineer_approval: true,
    requires_success_story: true,
  },
  canonical: {
    min_confidence: 95,
    min_usage_count: 20,
    min_positive_feedback: 10,
    max_negative_feedback: 0,
    requires_engineer_approval: true,
    requires_success_story: true,
    max_age_days: 730, // Must be used within 2 years
  },
};

/** Promotion evaluation result */
export interface PromotionEvaluation {
  tip_id: string;
  current_stage: PromotionStage;
  target_stage: PromotionStage;
  eligible: boolean;
  criteria_met: string[];
  criteria_unmet: string[];
  blockers: string[];
  estimated_time_to_eligible?: string;
}

/** Promotion event */
export interface PromotionEvent {
  id: string;
  tip_id: string;
  from_stage: PromotionStage;
  to_stage: PromotionStage;
  promoted_by: string;
  promoted_at: string;
  reason: string;
  approvers?: string[];
}

/** Demotion event (when tips regress) */
export interface DemotionEvent {
  id: string;
  tip_id: string;
  from_stage: PromotionStage;
  to_stage: PromotionStage;
  demoted_at: string;
  reason: string;
  auto_triggered: boolean;
}

// ── Storage ────────────────────────────────────────────────────────────────

const TIP_STAGES: Map<string, PromotionStage> = new Map();
const PROMOTION_HISTORY: PromotionEvent[] = [];
const DEMOTION_HISTORY: DemotionEvent[] = [];
const APPROVALS: Map<string, Set<string>> = new Map();

// ── Engine Implementation ──────────────────────────────────────────────────

class KnowledgePromotionEngine {
  /**
   * Get current stage of a tip
   */
  getStage(tipId: string): PromotionStage {
    return TIP_STAGES.get(tipId) || this.inferStage(tipId);
  }

  /**
   * Evaluate if tip can be promoted to next stage
   */
  evaluate(tipId: string, targetStage?: PromotionStage): PromotionEvaluation {
    const currentStage = this.getStage(tipId);
    const target = targetStage || this.getNextStage(currentStage);

    const criteria = STAGE_CRITERIA[target];
    if (!criteria) {
      return {
        tip_id: tipId,
        current_stage: currentStage,
        target_stage: target,
        eligible: false,
        criteria_met: [],
        criteria_unmet: [],
        blockers: ["No criteria defined for target stage"],
      };
    }

    // Get tip data
    const tips = tribalKnowledgeEngine.search({ query: tipId, limit: 10 });
    const tip = tips.find(t => t.id === tipId);

    if (!tip) {
      return {
        tip_id: tipId,
        current_stage: currentStage,
        target_stage: target,
        eligible: false,
        criteria_met: [],
        criteria_unmet: [],
        blockers: ["Tip not found"],
      };
    }

    // Get feedback data
    const feedback = knowledgeFeedbackIngestEngine.summarize(tipId);

    const criteria_met: string[] = [];
    const criteria_unmet: string[] = [];
    const blockers: string[] = [];

    // Check confidence
    if (tip.confidence >= criteria.min_confidence) {
      criteria_met.push(`Confidence: ${tip.confidence}% >= ${criteria.min_confidence}%`);
    } else {
      criteria_unmet.push(`Confidence: ${tip.confidence}% < ${criteria.min_confidence}%`);
    }

    // Check usage count
    if (tip.usage_count >= criteria.min_usage_count) {
      criteria_met.push(`Usage: ${tip.usage_count} >= ${criteria.min_usage_count}`);
    } else {
      criteria_unmet.push(`Usage: ${tip.usage_count} < ${criteria.min_usage_count}`);
    }

    // Check feedback
    const positiveCount = feedback?.positive_count || 0;
    const negativeCount = feedback?.negative_count || 0;

    if (positiveCount >= criteria.min_positive_feedback) {
      criteria_met.push(`Positive feedback: ${positiveCount} >= ${criteria.min_positive_feedback}`);
    } else {
      criteria_unmet.push(`Positive feedback: ${positiveCount} < ${criteria.min_positive_feedback}`);
    }

    if (negativeCount <= criteria.max_negative_feedback) {
      criteria_met.push(`Negative feedback: ${negativeCount} <= ${criteria.max_negative_feedback}`);
    } else {
      blockers.push(`Too much negative feedback: ${negativeCount} > ${criteria.max_negative_feedback}`);
    }

    // Check approvals
    if (criteria.requires_engineer_approval) {
      const approvers = APPROVALS.get(tipId) || new Set();
      const hasEngineerApproval = Array.from(approvers).some(a => a.includes("engineer"));
      if (hasEngineerApproval) {
        criteria_met.push("Engineer approval: Yes");
      } else {
        criteria_unmet.push("Engineer approval: Required");
      }
    }

    // Check success story
    if (criteria.requires_success_story) {
      const hasSuccessStory = (feedback?.positive_count || 0) > 0 &&
        knowledgeFeedbackIngestEngine.getFeedback(tipId, { type: "success_story" }).length > 0;
      if (hasSuccessStory) {
        criteria_met.push("Success story: Yes");
      } else {
        criteria_unmet.push("Success story: Required");
      }
    }

    // Check age
    if (criteria.max_age_days && tip.created_at) {
      const ageMs = Date.now() - new Date(tip.created_at).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays <= criteria.max_age_days) {
        criteria_met.push(`Age: ${Math.round(ageDays)} days <= ${criteria.max_age_days}`);
      } else {
        blockers.push(`Tip too old: ${Math.round(ageDays)} days > ${criteria.max_age_days}`);
      }
    }

    const eligible = blockers.length === 0 && criteria_unmet.length === 0;

    return {
      tip_id: tipId,
      current_stage: currentStage,
      target_stage: target,
      eligible,
      criteria_met,
      criteria_unmet,
      blockers,
    };
  }

  /**
   * Promote tip to next stage
   */
  promote(tipId: string, options: {
    target_stage?: PromotionStage;
    promoted_by: string;
    reason?: string;
    force?: boolean;
  }): PromotionEvent | { error: string } {
    const currentStage = this.getStage(tipId);
    const targetStage = options.target_stage || this.getNextStage(currentStage);

    // Can't promote from canonical
    if (currentStage === "canonical") {
      return { error: "Already at canonical stage" };
    }

    // Validate promotion is sequential (unless forced)
    if (!options.force) {
      const stageOrder: PromotionStage[] = ["draft", "captured", "validated", "verified", "canonical"];
      const currentIdx = stageOrder.indexOf(currentStage);
      const targetIdx = stageOrder.indexOf(targetStage);

      if (targetIdx !== currentIdx + 1) {
        return { error: `Cannot skip stages: ${currentStage} -> ${targetStage}` };
      }

      // Check eligibility
      const evaluation = this.evaluate(tipId, targetStage);
      if (!evaluation.eligible) {
        return {
          error: `Not eligible: ${evaluation.criteria_unmet.concat(evaluation.blockers).join(", ")}`,
        };
      }
    }

    const event: PromotionEvent = {
      id: `promo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tip_id: tipId,
      from_stage: currentStage,
      to_stage: targetStage,
      promoted_by: options.promoted_by,
      promoted_at: new Date().toISOString(),
      reason: options.reason || `Promoted to ${targetStage}`,
      approvers: Array.from(APPROVALS.get(tipId) || []),
    };

    // Update stage
    TIP_STAGES.set(tipId, targetStage);
    PROMOTION_HISTORY.push(event);

    return event;
  }

  /**
   * Demote tip (usually due to negative feedback)
   */
  demote(tipId: string, options: {
    target_stage?: PromotionStage;
    reason: string;
    auto_triggered?: boolean;
  }): DemotionEvent | { error: string } {
    const currentStage = this.getStage(tipId);

    if (currentStage === "draft") {
      return { error: "Cannot demote below draft" };
    }

    const targetStage = options.target_stage || this.getPreviousStage(currentStage);

    const event: DemotionEvent = {
      id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tip_id: tipId,
      from_stage: currentStage,
      to_stage: targetStage,
      demoted_at: new Date().toISOString(),
      reason: options.reason,
      auto_triggered: options.auto_triggered || false,
    };

    // Update stage
    TIP_STAGES.set(tipId, targetStage);
    DEMOTION_HISTORY.push(event);

    // Clear approvals on demotion
    APPROVALS.delete(tipId);

    return event;
  }

  /**
   * Add approval for a tip
   */
  addApproval(tipId: string, approver: string): void {
    if (!APPROVALS.has(tipId)) {
      APPROVALS.set(tipId, new Set());
    }
    APPROVALS.get(tipId)!.add(approver);
  }

  /**
   * Get promotion history for a tip
   */
  getHistory(tipId: string): {
    promotions: PromotionEvent[];
    demotions: DemotionEvent[];
  } {
    return {
      promotions: PROMOTION_HISTORY.filter(e => e.tip_id === tipId),
      demotions: DEMOTION_HISTORY.filter(e => e.tip_id === tipId),
    };
  }

  /**
   * Get tips ready for promotion
   */
  getPromotionCandidates(targetStage?: PromotionStage): Array<{
    tip_id: string;
    evaluation: PromotionEvaluation;
  }> {
    const results: Array<{ tip_id: string; evaluation: PromotionEvaluation }> = [];

    // Get all tips
    const tips = tribalKnowledgeEngine.search({ limit: 500 });

    for (const tip of tips) {
      const evaluation = this.evaluate(tip.id, targetStage);
      if (evaluation.eligible) {
        results.push({ tip_id: tip.id, evaluation });
      }
    }

    return results;
  }

  /**
   * Auto-demote tips with poor feedback
   */
  runDemotionCheck(): DemotionEvent[] {
    const demotions: DemotionEvent[] = [];

    for (const [tipId, stage] of TIP_STAGES) {
      if (stage === "draft") continue;

      const feedback = knowledgeFeedbackIngestEngine.summarize(tipId);
      if (!feedback) continue;

      // Auto-demote if net sentiment is very negative
      if (feedback.net_sentiment < -0.5 || feedback.flagged_count >= 3) {
        const result = this.demote(tipId, {
          reason: `Auto-demoted: sentiment=${feedback.net_sentiment.toFixed(2)}, flagged=${feedback.flagged_count}`,
          auto_triggered: true,
        });

        if ("id" in result) {
          demotions.push(result);
        }
      }
    }

    return demotions;
  }

  /**
   * Get stage statistics
   */
  stats(): {
    by_stage: Record<PromotionStage, number>;
    total_promotions: number;
    total_demotions: number;
    promotion_rate: number;
  } {
    const by_stage: Record<PromotionStage, number> = {
      draft: 0,
      captured: 0,
      validated: 0,
      verified: 0,
      canonical: 0,
    };

    for (const stage of TIP_STAGES.values()) {
      by_stage[stage]++;
    }

    const total_promotions = PROMOTION_HISTORY.length;
    const total_demotions = DEMOTION_HISTORY.length;
    const promotion_rate = total_promotions + total_demotions > 0
      ? total_promotions / (total_promotions + total_demotions)
      : 0;

    return {
      by_stage,
      total_promotions,
      total_demotions,
      promotion_rate,
    };
  }

  // ── Private Helpers ────────────────────────────────────────────────────────

  private inferStage(tipId: string): PromotionStage {
    // Infer from tip ID prefix
    if (tipId.startsWith("tk-cap-")) return "captured";
    if (tipId.startsWith("tk-static-")) return "canonical";
    if (tipId.startsWith("tk-doc-")) return "validated";
    return "draft";
  }

  private getNextStage(current: PromotionStage): PromotionStage {
    const order: PromotionStage[] = ["draft", "captured", "validated", "verified", "canonical"];
    const idx = order.indexOf(current);
    return order[Math.min(idx + 1, order.length - 1)];
  }

  private getPreviousStage(current: PromotionStage): PromotionStage {
    const order: PromotionStage[] = ["draft", "captured", "validated", "verified", "canonical"];
    const idx = order.indexOf(current);
    return order[Math.max(idx - 1, 0)];
  }
}

// ── Export Singleton ───────────────────────────────────────────────────────

export const knowledgePromotionEngine = new KnowledgePromotionEngine();
export { KnowledgePromotionEngine };
