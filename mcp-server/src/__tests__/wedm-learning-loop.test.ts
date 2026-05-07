/**
 * wedm-learning-loop.test.ts — MS-P1-LEARN-LOOP tests
 *
 * Tests for:
 * - WEDMFeedbackIngestionEngine
 * - WEDMTribalTipLearnerEngine
 * - Learning loop API endpoints
 */

import { describe, it, expect, beforeEach } from "vitest";
import { wedmFeedbackIngestionEngine, type FeedbackSubmission } from "../engines/WEDMFeedbackIngestionEngine";
import { wedmTribalTipLearnerEngine } from "../engines/WEDMTribalTipLearnerEngine";
import { wedmBlackboardEngine } from "../engines/WEDMBlackboardEngine";
import { wedmTribalRuntimeEngine } from "../engines/WEDMTribalRuntimeEngine";
import { wedmReasoningBridgeEngine } from "../engines/WEDMReasoningBridgeEngine";
import { wedmReasoningTraceLedgerEngine } from "../engines/WEDMReasoningTraceLedgerEngine";

// ============================================================================
// WEDMFeedbackIngestionEngine Tests
// ============================================================================

describe("WEDMFeedbackIngestionEngine", () => {
  beforeEach(() => {
    wedmFeedbackIngestionEngine.resetForTests();
    wedmBlackboardEngine.resetForTests();
    wedmReasoningBridgeEngine.resetForTests();
    wedmReasoningTraceLedgerEngine.resetForTests();
  });

  describe("ingest", () => {
    it("should successfully ingest basic feedback", async () => {
      const feedback: FeedbackSubmission = {
        job_id: "JOB-001",
        dispatcher: "edm",
        action: "wire_settings",
        original_params: { material: "D2", thickness_mm: 25 },
        success: true,
        predicted: { mrr_mm3_min: 10.5 },
        actual: { mrr_mm3_min: 11.2 },
        material: "D2",
        thickness_mm: 25,
      };

      const result = await wedmFeedbackIngestionEngine.ingest(feedback);

      expect(result.ok).toBe(true);
      expect(result.feedback_id).toMatch(/^fb-/);
      expect(result.decisions_posted).toBeGreaterThan(0);
      expect(result.observations_posted).toBeGreaterThan(0);
    });

    it("should track success/failure counts", async () => {
      await wedmFeedbackIngestionEngine.ingest({
        job_id: "JOB-001", dispatcher: "edm", action: "wire_settings",
        original_params: {}, success: true, predicted: {}, actual: {},
      });
      await wedmFeedbackIngestionEngine.ingest({
        job_id: "JOB-002", dispatcher: "edm", action: "wire_settings",
        original_params: {}, success: false, predicted: {}, actual: {},
      });

      const stats = wedmFeedbackIngestionEngine.getStats();
      expect(stats.totalFeedback).toBe(2);
      expect(stats.successfulJobs).toBe(1);
      expect(stats.failedJobs).toBe(1);
    });

    it("should generate tip candidates from corrections", async () => {
      const feedback: FeedbackSubmission = {
        job_id: "JOB-003",
        dispatcher: "edm",
        action: "wire_settings",
        original_params: {},
        success: true,
        predicted: { wire_tension_N: 15 },
        actual: { wire_tension_N: 18 },
        corrections: [{
          key: "wire_tension_N",
          original_value: 15,
          corrected_value: 18,
          reason: "Needed more tension for thin D2",
        }],
        material: "D2",
      };

      const result = await wedmFeedbackIngestionEngine.ingest(feedback);

      expect(result.tip_candidates_queued).toBeGreaterThan(0);
      expect(wedmFeedbackIngestionEngine.getStats().tipCandidatesGenerated).toBeGreaterThan(0);
    });

    it("should generate tip candidates from operator notes", async () => {
      const feedback: FeedbackSubmission = {
        job_id: "JOB-004",
        dispatcher: "edm",
        action: "cutting_params",
        original_params: {},
        success: true,
        predicted: {},
        actual: {},
        operator_notes: "Reduce wire speed on first pass to prevent break-through damage",
        material: "M2",
      };

      const result = await wedmFeedbackIngestionEngine.ingest(feedback);

      expect(result.tip_candidates_queued).toBeGreaterThan(0);
      const candidates = wedmFeedbackIngestionEngine.getTipCandidates();
      expect(candidates.some(c => c.pattern_type === "operator_note")).toBe(true);
    });

    it("should buffer ground truth for neural fusion", async () => {
      const feedback: FeedbackSubmission = {
        job_id: "JOB-005",
        dispatcher: "edm",
        action: "wire_settings",
        original_params: {},
        success: true,
        predicted: { mrr_mm3_min: 10, surface_finish_ra_um: 0.8 },
        actual: { mrr_mm3_min: 11, surface_finish_ra_um: 0.75 },
        material: "4140",
      };

      await wedmFeedbackIngestionEngine.ingest(feedback);

      const buffer = wedmFeedbackIngestionEngine.getGroundTruthBuffer();
      expect(buffer.length).toBeGreaterThan(0);
      expect(buffer.some(b => b.target === "mrr_mm3_min")).toBe(true);
    });

    it("should post observations to blackboard", async () => {
      await wedmFeedbackIngestionEngine.ingest({
        job_id: "JOB-006",
        dispatcher: "edm",
        action: "wire_settings",
        original_params: {},
        success: true,
        predicted: { mrr_mm3_min: 10 },
        actual: { mrr_mm3_min: 12 },
        material: "D2",
      });

      const stats = wedmBlackboardEngine.getStats();
      expect(stats.totalEntries).toBeGreaterThan(0);
    });

    it("should record trace to ledger", async () => {
      await wedmFeedbackIngestionEngine.ingest({
        job_id: "JOB-007",
        dispatcher: "edm",
        action: "wire_settings",
        original_params: {},
        success: true,
        predicted: {},
        actual: {},
      });

      const recent = wedmReasoningTraceLedgerEngine.getRecent(10);
      expect(recent.some(t => t.action.includes("feedback"))).toBe(true);
    });

    it("should generate failure pattern tip candidates", async () => {
      await wedmFeedbackIngestionEngine.ingest({
        job_id: "JOB-008",
        dispatcher: "edm",
        action: "cutting_params",
        original_params: { power: "high" },
        success: false,
        predicted: {},
        actual: {},
        material: "tungsten",
        thickness_mm: 80,
      });

      const candidates = wedmFeedbackIngestionEngine.getTipCandidates();
      expect(candidates.some(c => c.pattern_type === "failure_pattern")).toBe(true);
    });

    it("should calculate average prediction error", async () => {
      await wedmFeedbackIngestionEngine.ingest({
        job_id: "JOB-009",
        dispatcher: "edm",
        action: "wire_settings",
        original_params: {},
        success: true,
        predicted: { mrr_mm3_min: 10 },
        actual: { mrr_mm3_min: 12 },
        material: "D2",
      });

      const stats = wedmFeedbackIngestionEngine.getStats();
      expect(stats.avgPredictionError).toBeGreaterThan(0);
    });

    it("should return recent feedback history", async () => {
      await wedmFeedbackIngestionEngine.ingest({
        job_id: "JOB-010", dispatcher: "edm", action: "a1",
        original_params: {}, success: true, predicted: {}, actual: {},
      });
      await wedmFeedbackIngestionEngine.ingest({
        job_id: "JOB-011", dispatcher: "edm", action: "a2",
        original_params: {}, success: true, predicted: {}, actual: {},
      });

      const recent = wedmFeedbackIngestionEngine.getRecentFeedback(10);
      expect(recent.length).toBe(2);
      expect(recent[1].job_id).toBe("JOB-011");
    });
  });

  describe("getTipCandidates", () => {
    it("should respect limit parameter", async () => {
      for (let i = 0; i < 5; i++) {
        await wedmFeedbackIngestionEngine.ingest({
          job_id: `JOB-${i}`, dispatcher: "edm", action: "test",
          original_params: {}, success: true, predicted: {}, actual: {},
          operator_notes: `Note ${i}`,
        });
      }

      const limited = wedmFeedbackIngestionEngine.getTipCandidates(2);
      expect(limited.length).toBe(2);
    });
  });

  describe("getGroundTruthBuffer", () => {
    it("should filter by target", async () => {
      await wedmFeedbackIngestionEngine.ingest({
        job_id: "JOB-GT1", dispatcher: "edm", action: "test",
        original_params: {}, success: true,
        predicted: { mrr_mm3_min: 10, surface_finish_ra_um: 0.8 },
        actual: { mrr_mm3_min: 11, surface_finish_ra_um: 0.9 },
        material: "D2",
      });

      const mrrBuffer = wedmFeedbackIngestionEngine.getGroundTruthBuffer("mrr_mm3_min");
      const raBuffer = wedmFeedbackIngestionEngine.getGroundTruthBuffer("surface_finish_ra_um");
      expect(mrrBuffer.every(b => b.target === "mrr_mm3_min")).toBe(true);
      expect(raBuffer.every(b => b.target === "surface_finish_ra_um")).toBe(true);
    });
  });
});

// ============================================================================
// WEDMTribalTipLearnerEngine Tests
// ============================================================================

describe("WEDMTribalTipLearnerEngine", () => {
  beforeEach(() => {
    wedmTribalTipLearnerEngine.resetForTests();
    wedmFeedbackIngestionEngine.resetForTests();
    wedmTribalRuntimeEngine.resetForTests();
    wedmBlackboardEngine.resetForTests();
    wedmReasoningBridgeEngine.resetForTests();
    wedmReasoningTraceLedgerEngine.resetForTests();
  });

  describe("processQueue", () => {
    it("should process pending tip candidates", async () => {
      // First create some tip candidates via feedback
      await wedmFeedbackIngestionEngine.ingest({
        job_id: "JOB-TL1",
        dispatcher: "edm",
        action: "wire_settings",
        original_params: {},
        success: true,
        predicted: { wire_tension_N: 15 },
        actual: { wire_tension_N: 18 },
        corrections: [{
          key: "wire_tension",
          original_value: 15,
          corrected_value: 18,
          reason: "Better for thin stock",
        }],
        material: "D2",
        thickness_mm: 5,
      });

      const result = await wedmTribalTipLearnerEngine.processQueue(50, 0.85);

      expect(result.processed).toBeGreaterThan(0);
      expect(result.auto_approved + result.pending_review + result.rejected).toBe(result.processed);
    });

    it("should auto-approve high confidence tips", async () => {
      await wedmFeedbackIngestionEngine.ingest({
        job_id: "JOB-TL2",
        dispatcher: "edm",
        action: "cutting_params",
        original_params: {},
        success: true,
        predicted: {},
        actual: {},
        corrections: [{
          key: "power_setting",
          original_value: "high",
          corrected_value: "medium",
          reason: "Prevents wire breakage on carbide",
        }],
        material: "carbide",
        thickness_mm: 30,
      });

      const result = await wedmTribalTipLearnerEngine.processQueue(50, 0.5); // low threshold

      expect(result.auto_approved).toBeGreaterThan(0);
    });

    it("should queue low-confidence tips for review", async () => {
      await wedmFeedbackIngestionEngine.ingest({
        job_id: "JOB-TL3",
        dispatcher: "edm",
        action: "test",
        original_params: {},
        success: true,
        predicted: {},
        actual: {},
        operator_notes: "Short note",
      });

      const result = await wedmTribalTipLearnerEngine.processQueue(50, 0.99); // high threshold

      // Should not auto-approve
      expect(result.auto_approved).toBe(0);
    });

    it("should update stats after processing", async () => {
      await wedmFeedbackIngestionEngine.ingest({
        job_id: "JOB-TL4",
        dispatcher: "edm",
        action: "test",
        original_params: {},
        success: false,
        predicted: {},
        actual: {},
        material: "D2",
      });

      await wedmTribalTipLearnerEngine.processQueue();

      const stats = wedmTribalTipLearnerEngine.getStats();
      expect(stats.totalProcessed).toBeGreaterThan(0);
    });

    it("should consume candidates from feedback engine", async () => {
      await wedmFeedbackIngestionEngine.ingest({
        job_id: "JOB-TL5",
        dispatcher: "edm",
        action: "test",
        original_params: {},
        success: true,
        predicted: {},
        actual: {},
        operator_notes: "This is a useful note about wire EDM",
        material: "M2",
      });

      const beforeCount = wedmFeedbackIngestionEngine.getTipCandidates().length;
      await wedmTribalTipLearnerEngine.processQueue();
      const afterCount = wedmFeedbackIngestionEngine.getTipCandidates().length;

      expect(afterCount).toBeLessThan(beforeCount);
    });
  });

  describe("approveTip / rejectTip", () => {
    it("should approve pending tips", async () => {
      await wedmFeedbackIngestionEngine.ingest({
        job_id: "JOB-APP1",
        dispatcher: "edm",
        action: "test",
        original_params: {},
        success: true,
        predicted: {},
        actual: {},
        corrections: [{ key: "k", original_value: 1, corrected_value: 2 }],
        material: "D2",
      });

      await wedmTribalTipLearnerEngine.processQueue(50, 0.99); // high threshold = pending review

      const pending = wedmTribalTipLearnerEngine.getPendingReview();
      if (pending.length > 0) {
        const tipId = pending[0].id;
        const success = wedmTribalTipLearnerEngine.approveTip(tipId);
        expect(success).toBe(true);

        const stillPending = wedmTribalTipLearnerEngine.getPendingReview();
        expect(stillPending.find(t => t.id === tipId)).toBeUndefined();
      }
    });

    it("should reject pending tips", async () => {
      await wedmFeedbackIngestionEngine.ingest({
        job_id: "JOB-REJ1",
        dispatcher: "edm",
        action: "test",
        original_params: {},
        success: true,
        predicted: {},
        actual: {},
        corrections: [{ key: "k", original_value: 1, corrected_value: 2 }],
        material: "D2",
      });

      await wedmTribalTipLearnerEngine.processQueue(50, 0.99);

      const pending = wedmTribalTipLearnerEngine.getPendingReview();
      if (pending.length > 0) {
        const tipId = pending[0].id;
        const success = wedmTribalTipLearnerEngine.rejectTip(tipId);
        expect(success).toBe(true);

        const stats = wedmTribalTipLearnerEngine.getStats();
        expect(stats.rejected).toBeGreaterThan(0);
      }
    });

    it("should return false for non-existent tip", () => {
      const result = wedmTribalTipLearnerEngine.approveTip("nonexistent-id");
      expect(result).toBe(false);
    });
  });

  describe("getLearnedTips", () => {
    it("should return approved tips only", async () => {
      await wedmFeedbackIngestionEngine.ingest({
        job_id: "JOB-LT1",
        dispatcher: "edm",
        action: "test",
        original_params: {},
        success: true,
        predicted: {},
        actual: {},
        corrections: [{ key: "k", original_value: 1, corrected_value: 2 }],
        material: "D2",
        thickness_mm: 25,
      });

      await wedmTribalTipLearnerEngine.processQueue(50, 0.3); // low threshold = auto approve

      const learned = wedmTribalTipLearnerEngine.getLearnedTips();
      expect(learned.every(t => t.approved)).toBe(true);
    });
  });

  describe("getStats", () => {
    it("should return comprehensive statistics", () => {
      const stats = wedmTribalTipLearnerEngine.getStats();

      expect(stats).toHaveProperty("totalProcessed");
      expect(stats).toHaveProperty("autoApproved");
      expect(stats).toHaveProperty("manuallyApproved");
      expect(stats).toHaveProperty("rejected");
      expect(stats).toHaveProperty("tipsGenerated");
      expect(stats).toHaveProperty("pendingReviewCount");
      expect(stats).toHaveProperty("learnedCorpusSize");
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Learning Loop Integration", () => {
  beforeEach(() => {
    wedmFeedbackIngestionEngine.resetForTests();
    wedmTribalTipLearnerEngine.resetForTests();
    wedmTribalRuntimeEngine.resetForTests();
    wedmBlackboardEngine.resetForTests();
    wedmReasoningBridgeEngine.resetForTests();
    wedmReasoningTraceLedgerEngine.resetForTests();
  });

  it("should complete full learning cycle: feedback → tip candidate → approval → tribal corpus", async () => {
    // 1. Submit feedback with correction
    await wedmFeedbackIngestionEngine.ingest({
      job_id: "INTEG-001",
      dispatcher: "edm",
      action: "wire_settings",
      original_params: { material: "D2" },
      success: true,
      predicted: { wire_tension_N: 15 },
      actual: { wire_tension_N: 20 },
      corrections: [{
        key: "wire_tension_N",
        original_value: 15,
        corrected_value: 20,
        reason: "D2 needs more tension for dimensional stability",
      }],
      material: "D2",
      thickness_mm: 30,
    });

    // 2. Process tip candidates with low threshold (auto-approve)
    const processResult = await wedmTribalTipLearnerEngine.processQueue(50, 0.4);
    expect(processResult.processed).toBeGreaterThan(0);

    // 3. Verify tip was added to tribal runtime (if auto-approved)
    if (processResult.auto_approved > 0) {
      const learnedCount = wedmTribalRuntimeEngine.getLearnedTipCount();
      expect(learnedCount).toBeGreaterThan(0);
    }

    // 4. Verify blackboard has observations
    const bbStats = wedmBlackboardEngine.getStats();
    expect(bbStats.totalEntries).toBeGreaterThan(0);

    // 5. Verify ledger has trace
    const traces = wedmReasoningTraceLedgerEngine.getRecent(10);
    expect(traces.length).toBeGreaterThan(0);
  });

  it("should update ground truth buffer for neural fusion", async () => {
    await wedmFeedbackIngestionEngine.ingest({
      job_id: "INTEG-002",
      dispatcher: "edm",
      action: "cutting_params",
      original_params: {},
      success: true,
      predicted: { mrr_mm3_min: 10, surface_finish_ra_um: 0.8 },
      actual: { mrr_mm3_min: 12, surface_finish_ra_um: 0.75 },
      material: "4140",
      thickness_mm: 20,
    });

    const buffer = wedmFeedbackIngestionEngine.getGroundTruthBuffer();
    expect(buffer.length).toBeGreaterThan(0);

    const mrrPoint = buffer.find(b => b.target === "mrr_mm3_min");
    expect(mrrPoint).toBeDefined();
    expect(mrrPoint?.predicted).toBe(10);
    expect(mrrPoint?.actual).toBe(12);
    expect(mrrPoint?.material).toBe("4140");
  });
});
