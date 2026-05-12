/**
 * PPActiveLearningQueueEngine — PP-DL-MS6
 *
 * Maintains a queue of machining scenarios that need human/expert review.
 * Uses uncertainty estimates from PPEnsembleUncertaintyEngine to identify
 * high-value learning opportunities: scenarios where the system is uncertain
 * AND the outcome would significantly improve future predictions.
 *
 * Completes the active learning loop:
 *   1. System encounters a scenario
 *   2. Uncertainty engine estimates confidence
 *   3. Low-confidence scenarios added to review queue
 *   4. Expert labels the scenario with ground truth
 *   5. Training pipeline processes new labels
 *   6. System improves over time
 *
 * Queue prioritization strategies:
 *   - Uncertainty-based: highest epistemic uncertainty first
 *   - Diversity-based: cover the embedding space evenly
 *   - Cost-sensitive: prioritize where errors are most costly
 *
 * @module PPActiveLearningQueueEngine
 */

import { ppEnsembleUncertaintyEngine } from "./PPEnsembleUncertaintyEngine.js";
import { ppMultiModalFusionEngine, type ScenarioInput } from "./PPMultiModalFusionEngine.js";

// ── Types ─────────────────────────────────────────────────────────────

export type ReviewPriority = "critical" | "high" | "medium" | "low";

export interface QueuedScenario {
  id: string;
  scenario: ScenarioInput;
  uncertainty: number;           // 0-1
  priority: ReviewPriority;
  priority_score: number;        // numeric for sorting
  added_at: number;              // timestamp
  reasons: string[];
  context?: {
    source?: string;
    operation?: string;
    user_flagged?: boolean;
  };
  status: "pending" | "in_review" | "labeled" | "rejected";
  label?: ExpertLabel;
}

export interface ExpertLabel {
  labeled_at: number;
  expert_id?: string;
  ground_truth: {
    correct_controller_dialect?: string;
    correct_machine_category?: string;
    correct_material_group?: string;
    safe_to_proceed?: boolean;
    notes?: string;
  };
  confidence: number;
}

export interface QueueStats {
  total_queued: number;
  pending: number;
  in_review: number;
  labeled: number;
  rejected: number;
  by_priority: Record<ReviewPriority, number>;
  avg_uncertainty: number;
  oldest_pending_ms: number;
}

export interface QueueOptions {
  strategy?: "uncertainty" | "diversity" | "cost_sensitive";
  min_uncertainty?: number;      // only queue if above threshold
  max_queue_size?: number;       // cap queue
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PPActiveLearningQueueEngine {
  private queue = new Map<string, QueuedScenario>();
  private counter = 0;

  /**
   * Evaluate a scenario and add to queue if uncertainty is high enough.
   */
  evaluate(scenario: ScenarioInput, options: QueueOptions = {}): QueuedScenario | null {
    const minThreshold = options.min_uncertainty ?? 0.3;

    const uncertainty = ppEnsembleUncertaintyEngine.estimateUncertainty(scenario);
    const uncertaintyLevel = 1 - uncertainty.confidence;

    if (uncertaintyLevel < minThreshold) return null;

    // Check queue size cap
    const pending = this.getPending();
    if (options.max_queue_size && pending.length >= options.max_queue_size) {
      // Only add if more uncertain than least-uncertain pending
      const leastUncertain = pending[pending.length - 1];
      if (uncertaintyLevel <= leastUncertain.uncertainty) return null;
      // Remove least uncertain to make room
      this.queue.delete(leastUncertain.id);
    }

    const id = `als_${Date.now()}_${this.counter++}`;
    const priority = this.computePriority(uncertaintyLevel, uncertainty);
    const reasons = uncertainty.dimension_uncertainties.map(d => d.reason);

    const queued: QueuedScenario = {
      id,
      scenario,
      uncertainty: round2(uncertaintyLevel),
      priority,
      priority_score: this.computePriorityScore(uncertaintyLevel, priority),
      added_at: Date.now(),
      reasons,
      status: "pending",
    };

    this.queue.set(id, queued);
    return queued;
  }

  /**
   * Batch-evaluate multiple scenarios.
   */
  evaluateBatch(scenarios: ScenarioInput[], options?: QueueOptions): QueuedScenario[] {
    const queued: QueuedScenario[] = [];
    for (const s of scenarios) {
      const q = this.evaluate(s, options);
      if (q) queued.push(q);
    }
    return queued;
  }

  /**
   * Get next scenario for expert review (highest priority pending).
   */
  getNext(): QueuedScenario | null {
    const pending = this.getPending();
    if (pending.length === 0) return null;
    const next = pending[0];
    // Mark as in_review
    next.status = "in_review";
    this.queue.set(next.id, next);
    return next;
  }

  /**
   * Get all pending scenarios, sorted by priority.
   */
  getPending(): QueuedScenario[] {
    return Array.from(this.queue.values())
      .filter(q => q.status === "pending")
      .sort((a, b) => b.priority_score - a.priority_score);
  }

  /**
   * Record an expert label for a queued scenario.
   */
  label(id: string, label: Omit<ExpertLabel, "labeled_at">): boolean {
    const q = this.queue.get(id);
    if (!q) return false;
    q.label = { ...label, labeled_at: Date.now() };
    q.status = "labeled";
    this.queue.set(id, q);
    return true;
  }

  /**
   * Reject a queued scenario (e.g., duplicate or not useful).
   */
  reject(id: string, reason?: string): boolean {
    const q = this.queue.get(id);
    if (!q) return false;
    q.status = "rejected";
    if (reason) q.reasons.push(`Rejected: ${reason}`);
    this.queue.set(id, q);
    return true;
  }

  /**
   * Get all labeled scenarios (for downstream training).
   */
  getLabeled(): QueuedScenario[] {
    return Array.from(this.queue.values()).filter(q => q.status === "labeled");
  }

  /**
   * Get queue statistics.
   */
  getStats(): QueueStats {
    const all = Array.from(this.queue.values());
    const pending = all.filter(q => q.status === "pending");
    const inReview = all.filter(q => q.status === "in_review");
    const labeled = all.filter(q => q.status === "labeled");
    const rejected = all.filter(q => q.status === "rejected");

    const byPriority: Record<ReviewPriority, number> = {
      critical: 0, high: 0, medium: 0, low: 0,
    };
    for (const q of all) byPriority[q.priority]++;

    const avgUncertainty = all.length > 0
      ? all.reduce((s, q) => s + q.uncertainty, 0) / all.length
      : 0;

    const oldestPending = pending.length > 0
      ? Date.now() - Math.min(...pending.map(p => p.added_at))
      : 0;

    return {
      total_queued: all.length,
      pending: pending.length,
      in_review: inReview.length,
      labeled: labeled.length,
      rejected: rejected.length,
      by_priority: byPriority,
      avg_uncertainty: round2(avgUncertainty),
      oldest_pending_ms: oldestPending,
    };
  }

  /**
   * Clear the queue (e.g., after a training cycle).
   */
  clear(): void {
    this.queue.clear();
    this.counter = 0;
  }

  /**
   * Get a scenario by ID.
   */
  get(id: string): QueuedScenario | null {
    return this.queue.get(id) ?? null;
  }

  // ── Private ──────────────────────────────────────────────────────────

  private computePriority(
    uncertaintyLevel: number,
    uncertainty: ReturnType<typeof ppEnsembleUncertaintyEngine.estimateUncertainty>,
  ): ReviewPriority {
    // Critical: insufficient_data recommendation OR uncertainty > 0.8
    if (uncertainty.recommendation === "insufficient_data" || uncertaintyLevel > 0.8) {
      return "critical";
    }
    // High: caution recommendation OR uncertainty 0.6-0.8
    if (uncertainty.recommendation === "caution" || uncertaintyLevel > 0.6) {
      return "high";
    }
    // Medium: verify OR uncertainty 0.4-0.6
    if (uncertainty.recommendation === "verify" || uncertaintyLevel > 0.4) {
      return "medium";
    }
    return "low";
  }

  private computePriorityScore(uncertainty: number, priority: ReviewPriority): number {
    const base = { critical: 1000, high: 500, medium: 100, low: 10 }[priority];
    return base + uncertainty * 100;
  }
}

function round2(x: number): number { return Math.round(x * 100) / 100; }

export const ppActiveLearningQueueEngine = new PPActiveLearningQueueEngine();
