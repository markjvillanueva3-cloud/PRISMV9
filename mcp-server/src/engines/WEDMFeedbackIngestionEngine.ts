/**
 * WEDMFeedbackIngestionEngine.ts — MS-P1-LEARN-LOOP U-P1-LL-02
 *
 * Processes operator feedback from completed jobs:
 * 1. Validates and normalizes incoming feedback
 * 2. Routes adjudicated decisions through bridge.postDecision
 * 3. Records ground truth observations to blackboard
 * 4. Triggers neural fusion weight updates
 * 5. Queues patterns for tribal tip extraction
 *
 * Feedback types:
 * - Parameter corrections (actual vs predicted MRR, Ra, wire tension)
 * - Success/failure adjudication
 * - Operator notes (free text → tribal tip candidates)
 * - Quality metrics (measured Ra, dimensional accuracy)
 */

import { wedmReasoningBridgeEngine } from "./WEDMReasoningBridgeEngine.js";
import { wedmBlackboardEngine } from "./WEDMBlackboardEngine.js";
import { wedmReasoningTraceLedgerEngine } from "./WEDMReasoningTraceLedgerEngine.js";

// ── Types ────────────────────────────────────────────────────────────────

export interface FeedbackSubmission {
  /** Unique job/program identifier */
  job_id: string;
  /** Dispatcher that handled the original request */
  dispatcher: "edm" | "cam";
  /** Action that was performed */
  action: string;
  /** Original request parameters */
  original_params: Record<string, unknown>;
  /** Whether the job succeeded */
  success: boolean;
  /** Predicted values from AI */
  predicted: {
    mrr_mm3_min?: number;
    surface_finish_ra_um?: number;
    wire_tension_N?: number;
    cutting_speed_mm_min?: number;
    [key: string]: unknown;
  };
  /** Actual measured values */
  actual: {
    mrr_mm3_min?: number;
    surface_finish_ra_um?: number;
    wire_tension_N?: number;
    cutting_speed_mm_min?: number;
    [key: string]: unknown;
  };
  /** Corrections made by operator */
  corrections?: {
    key: string;
    original_value: unknown;
    corrected_value: unknown;
    reason?: string;
  }[];
  /** Operator notes (free text) */
  operator_notes?: string;
  /** Material used */
  material?: string;
  /** Thickness in mm */
  thickness_mm?: number;
  /** Wire type used */
  wire_type?: string;
  /** Machine ID */
  machine_id?: string;
  /** Timestamp (ISO string or auto-generated) */
  timestamp?: string;
  /** Confidence in the feedback (0-1, default 0.9 for human feedback) */
  confidence?: number;
}

export interface FeedbackResult {
  ok: boolean;
  feedback_id: string;
  decisions_posted: number;
  observations_posted: number;
  tip_candidates_queued: number;
  ground_truth_updated: boolean;
  errors?: string[];
}

interface TipCandidate {
  id: string;
  source_job: string;
  pattern_type: "correction" | "success_pattern" | "failure_pattern" | "operator_note";
  keywords: string[];
  context: Record<string, unknown>;
  note?: string;
  created_at: string;
}

// ── Engine ───────────────────────────────────────────────────────────────

class WEDMFeedbackIngestionEngine {
  private feedbackHistory: FeedbackSubmission[] = [];
  private tipCandidates: TipCandidate[] = [];
  private groundTruthBuffer: Array<{
    target: string;
    material: string;
    predicted: number;
    actual: number;
    timestamp: string;
  }> = [];

  private stats = {
    totalFeedback: 0,
    successfulJobs: 0,
    failedJobs: 0,
    correctionsReceived: 0,
    tipCandidatesGenerated: 0,
    groundTruthPoints: 0,
    avgPredictionError: 0,
  };

  // Ring buffer limits
  private readonly MAX_HISTORY = 1000;
  private readonly MAX_TIP_CANDIDATES = 500;
  private readonly MAX_GROUND_TRUTH_BUFFER = 2000;

  /**
   * Ingest operator feedback from a completed job.
   * Routes data through bridge, blackboard, and neural fusion.
   */
  async ingest(feedback: FeedbackSubmission): Promise<FeedbackResult> {
    const feedbackId = `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const errors: string[] = [];
    let decisionsPosted = 0;
    let observationsPosted = 0;
    let tipCandidatesQueued = 0;

    // Normalize timestamp
    const timestamp = feedback.timestamp || new Date().toISOString();
    const normalizedFeedback = { ...feedback, timestamp };

    // 1. Store in history ring buffer
    this.feedbackHistory.push(normalizedFeedback);
    if (this.feedbackHistory.length > this.MAX_HISTORY) {
      this.feedbackHistory.shift();
    }
    this.stats.totalFeedback++;

    // Track success/failure
    if (feedback.success) {
      this.stats.successfulJobs++;
    } else {
      this.stats.failedJobs++;
    }

    // 2. Build namespace for blackboard/bridge
    const namespace = this.buildNamespace(feedback);

    // 3. Post ground truth observations to blackboard
    try {
      const groundTruthKeys = ["mrr_mm3_min", "surface_finish_ra_um", "wire_tension_N", "cutting_speed_mm_min"];
      for (const key of groundTruthKeys) {
        const actualVal = feedback.actual[key];
        const predictedVal = feedback.predicted[key];
        if (actualVal !== undefined && typeof actualVal === "number") {
          wedmBlackboardEngine.post(
            namespace,
            `ground_truth.${key}`,
            actualVal,
            "observation",
            `feedback:${feedbackId}`,
            {
              confidence: feedback.confidence ?? 0.9,
            }
          );
          observationsPosted++;

          // Buffer for neural fusion updates
          if (predictedVal !== undefined && typeof predictedVal === "number" && feedback.material) {
            this.groundTruthBuffer.push({
              target: key,
              material: feedback.material,
              predicted: predictedVal,
              actual: actualVal,
              timestamp,
            });
            if (this.groundTruthBuffer.length > this.MAX_GROUND_TRUTH_BUFFER) {
              this.groundTruthBuffer.shift();
            }
            this.stats.groundTruthPoints++;
          }
        }
      }
    } catch (e) {
      errors.push(`Blackboard observation error: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 4. Post adjudicated decisions through bridge
    try {
      // Post success/failure decision
      wedmReasoningBridgeEngine.postDecision(
        feedback.dispatcher,
        feedback.action,
        feedback.original_params,
        "job_success",
        feedback.success,
        "feedback",
        feedback.confidence ?? 0.9
      );
      decisionsPosted++;

      // Post any corrections as decisions
      if (feedback.corrections?.length) {
        for (const correction of feedback.corrections) {
          wedmReasoningBridgeEngine.postDecision(
            feedback.dispatcher,
            feedback.action,
            feedback.original_params,
            `correction.${correction.key}`,
            correction.corrected_value,
            "feedback",
            feedback.confidence ?? 0.85
          );
          decisionsPosted++;
          this.stats.correctionsReceived++;
        }
      }
    } catch (e) {
      errors.push(`Bridge decision error: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 5. Record trace to ledger
    try {
      const recordFn = (wedmReasoningTraceLedgerEngine as any).recordTraceSync
        ?? (wedmReasoningTraceLedgerEngine as any).record;
      if (typeof recordFn === "function") {
        recordFn.call(wedmReasoningTraceLedgerEngine, {
          dispatcher: feedback.dispatcher,
          action: `feedback:${feedback.action}`,
          keywords: this.extractKeywords(feedback),
          awareness_used: false,
          confidence: feedback.confidence ?? 0.9,
          metadata: {
            feedback_id: feedbackId,
            job_id: feedback.job_id,
            success: feedback.success,
            has_corrections: (feedback.corrections?.length ?? 0) > 0,
          },
        });
      }
    } catch (e) {
      errors.push(`Ledger trace error: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 6. Queue tip candidates for tribal learner
    try {
      // Corrections → high-value tip candidates
      if (feedback.corrections?.length) {
        for (const correction of feedback.corrections) {
          const tipId = `tip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          this.tipCandidates.push({
            id: tipId,
            source_job: feedback.job_id,
            pattern_type: "correction",
            keywords: [feedback.action, correction.key, feedback.material ?? "unknown"].filter(Boolean),
            context: {
              original: correction.original_value,
              corrected: correction.corrected_value,
              material: feedback.material,
              thickness_mm: feedback.thickness_mm,
            },
            note: correction.reason,
            created_at: timestamp,
          });
          tipCandidatesQueued++;
        }
      }

      // Operator notes → tribal tip candidates
      if (feedback.operator_notes?.trim()) {
        const tipId = `tip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        this.tipCandidates.push({
          id: tipId,
          source_job: feedback.job_id,
          pattern_type: "operator_note",
          keywords: this.extractKeywords(feedback),
          context: {
            material: feedback.material,
            thickness_mm: feedback.thickness_mm,
            action: feedback.action,
            success: feedback.success,
          },
          note: feedback.operator_notes.trim(),
          created_at: timestamp,
        });
        tipCandidatesQueued++;
      }

      // Success/failure patterns
      if (!feedback.success) {
        const tipId = `tip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        this.tipCandidates.push({
          id: tipId,
          source_job: feedback.job_id,
          pattern_type: "failure_pattern",
          keywords: [...this.extractKeywords(feedback), "failure", "avoid"],
          context: {
            material: feedback.material,
            thickness_mm: feedback.thickness_mm,
            action: feedback.action,
            params: feedback.original_params,
            actual: feedback.actual,
          },
          created_at: timestamp,
        });
        tipCandidatesQueued++;
      }

      // Trim tip candidate buffer
      while (this.tipCandidates.length > this.MAX_TIP_CANDIDATES) {
        this.tipCandidates.shift();
      }
      this.stats.tipCandidatesGenerated += tipCandidatesQueued;
    } catch (e) {
      errors.push(`Tip candidate error: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 7. Update average prediction error
    this.updatePredictionErrorStats();

    return {
      ok: errors.length === 0,
      feedback_id: feedbackId,
      decisions_posted: decisionsPosted,
      observations_posted: observationsPosted,
      tip_candidates_queued: tipCandidatesQueued,
      ground_truth_updated: this.groundTruthBuffer.length > 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get pending tip candidates for the tribal learner to process.
   */
  getTipCandidates(limit = 100): TipCandidate[] {
    return this.tipCandidates.slice(-limit);
  }

  /**
   * Remove processed tip candidates.
   */
  markTipCandidatesProcessed(ids: string[]): void {
    const idSet = new Set(ids);
    this.tipCandidates = this.tipCandidates.filter(t => !idSet.has(t.id));
  }

  /**
   * Get ground truth buffer for neural fusion updates.
   */
  getGroundTruthBuffer(target?: string, limit = 100): typeof this.groundTruthBuffer {
    let buffer = this.groundTruthBuffer;
    if (target) {
      buffer = buffer.filter(b => b.target === target);
    }
    return buffer.slice(-limit);
  }

  /**
   * Clear ground truth buffer after neural fusion has consumed it.
   */
  clearGroundTruthBuffer(beforeTimestamp?: string): void {
    if (beforeTimestamp) {
      this.groundTruthBuffer = this.groundTruthBuffer.filter(
        b => b.timestamp > beforeTimestamp
      );
    } else {
      this.groundTruthBuffer = [];
    }
  }

  /**
   * Get recent feedback history.
   */
  getRecentFeedback(limit = 50): FeedbackSubmission[] {
    return this.feedbackHistory.slice(-limit);
  }

  /**
   * Get ingestion statistics.
   */
  getStats(): typeof this.stats & { pendingTipCandidates: number; pendingGroundTruth: number } {
    return {
      ...this.stats,
      pendingTipCandidates: this.tipCandidates.length,
      pendingGroundTruth: this.groundTruthBuffer.length,
    };
  }

  /**
   * Build blackboard namespace from feedback context.
   */
  private buildNamespace(feedback: FeedbackSubmission): string {
    const parts = ["wedm", feedback.dispatcher];
    if (feedback.material) {
      parts.push("mat", feedback.material.toLowerCase().replace(/[^a-z0-9]/g, ""));
    }
    parts.push(feedback.action.replace(/[^a-z0-9_]/gi, "_"));
    return parts.join(".");
  }

  /**
   * Extract keywords from feedback for search/matching.
   */
  private extractKeywords(feedback: FeedbackSubmission): string[] {
    const keywords: string[] = [feedback.action];
    if (feedback.material) keywords.push(feedback.material.toLowerCase());
    if (feedback.wire_type) keywords.push(feedback.wire_type);
    if (feedback.machine_id) keywords.push(feedback.machine_id);
    if (feedback.thickness_mm) {
      if (feedback.thickness_mm < 10) keywords.push("thin");
      else if (feedback.thickness_mm > 50) keywords.push("thick");
    }
    return keywords;
  }

  /**
   * Update rolling average prediction error stats.
   */
  private updatePredictionErrorStats(): void {
    if (this.groundTruthBuffer.length === 0) return;

    const errors = this.groundTruthBuffer
      .filter(b => b.predicted > 0)
      .map(b => Math.abs((b.actual - b.predicted) / b.predicted) * 100);

    if (errors.length > 0) {
      this.stats.avgPredictionError = errors.reduce((a, b) => a + b, 0) / errors.length;
    }
  }

  /**
   * Reset for testing. Alias for test compatibility.
   */
  reset(): void {
    this.resetForTests();
  }

  /**
   * Reset for testing.
   */
  resetForTests(): void {
    this.feedbackHistory = [];
    this.tipCandidates = [];
    this.groundTruthBuffer = [];
    this.stats = {
      totalFeedback: 0,
      successfulJobs: 0,
      failedJobs: 0,
      correctionsReceived: 0,
      tipCandidatesGenerated: 0,
      groundTruthPoints: 0,
      avgPredictionError: 0,
    };
  }
}

export const wedmFeedbackIngestionEngine = new WEDMFeedbackIngestionEngine();
