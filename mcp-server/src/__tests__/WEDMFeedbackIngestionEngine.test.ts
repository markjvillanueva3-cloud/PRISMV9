/**
 * WEDMFeedbackIngestionEngine Tests — MS-P1-LEARN-LOOP U-P1-LL-02
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../engines/WEDMReasoningBridgeEngine.js", () => ({
  wedmReasoningBridgeEngine: {
    postDecision: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

vi.mock("../engines/WEDMBlackboardEngine.js", () => ({
  wedmBlackboardEngine: {
    post: vi.fn().mockReturnValue(true),
    query: vi.fn().mockReturnValue([]),
  },
}));

vi.mock("../engines/WEDMReasoningTraceLedgerEngine.js", () => ({
  wedmReasoningTraceLedgerEngine: {
    record: vi.fn(),
  },
}));

import { wedmFeedbackIngestionEngine } from "../engines/WEDMFeedbackIngestionEngine.js";

describe("WEDMFeedbackIngestionEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wedmFeedbackIngestionEngine.reset?.();
  });

  describe("ingest", () => {
    it("ingests successful job feedback", async () => {
      const result = await wedmFeedbackIngestionEngine.ingest({
        job_id: "test-job-1",
        dispatcher: "edm",
        action: "generate_params",
        original_params: { thickness: 25 },
        success: true,
        predicted: { mrr_mm3_min: 50, surface_finish_ra_um: 1.2 },
        actual: { mrr_mm3_min: 48, surface_finish_ra_um: 1.1 },
      });

      expect(result.ok).toBe(true);
      expect(result.feedback_id).toMatch(/^fb-/);
    });

    it("ingests failed job feedback", async () => {
      const result = await wedmFeedbackIngestionEngine.ingest({
        job_id: "test-job-2",
        dispatcher: "edm",
        action: "generate_params",
        original_params: {},
        success: false,
        predicted: { mrr_mm3_min: 100 },
        actual: { mrr_mm3_min: 0 },
      });

      expect(result.ok).toBe(true);
    });

    it("handles operator corrections", async () => {
      const result = await wedmFeedbackIngestionEngine.ingest({
        job_id: "test-job-3",
        dispatcher: "edm",
        action: "generate_params",
        original_params: {},
        success: true,
        predicted: { wire_tension_N: 15 },
        actual: { wire_tension_N: 12 },
        corrections: [
          { key: "wire_tension_N", original_value: 15, corrected_value: 12, reason: "Material too brittle" },
        ],
      });

      expect(result.ok).toBe(true);
    });

    it("handles operator notes", async () => {
      const result = await wedmFeedbackIngestionEngine.ingest({
        job_id: "test-job-4",
        dispatcher: "edm",
        action: "generate_params",
        original_params: {},
        success: true,
        predicted: {},
        actual: {},
        operator_notes: "Reduce tension for thin sections",
      });

      expect(result.ok).toBe(true);
      expect(result.tip_candidates_queued).toBeGreaterThanOrEqual(0);
    });

    it("includes material context", async () => {
      const result = await wedmFeedbackIngestionEngine.ingest({
        job_id: "test-job-5",
        dispatcher: "edm",
        action: "generate_params",
        original_params: {},
        success: true,
        predicted: { mrr_mm3_min: 50 },
        actual: { mrr_mm3_min: 45 },
        material: "D2",
        thickness_mm: 25,
        wire_type: "brass_0.25",
      });

      expect(result.ok).toBe(true);
      expect(result.ground_truth_updated).toBe(true);
    });
  });

  describe("getStats", () => {
    it("returns ingestion statistics", () => {
      const stats = wedmFeedbackIngestionEngine.getStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalFeedback).toBe("number");
    });

    it("tracks success/failure counts", () => {
      const stats = wedmFeedbackIngestionEngine.getStats();
      expect(typeof stats.successfulJobs).toBe("number");
      expect(typeof stats.failedJobs).toBe("number");
    });

    it("tracks corrections received", () => {
      const stats = wedmFeedbackIngestionEngine.getStats();
      expect(typeof stats.correctionsReceived).toBe("number");
    });
  });

  describe("getTipCandidates", () => {
    it("returns pending tip candidates", () => {
      const candidates = wedmFeedbackIngestionEngine.getTipCandidates(10);
      expect(Array.isArray(candidates)).toBe(true);
    });

    it("respects limit parameter", () => {
      const candidates = wedmFeedbackIngestionEngine.getTipCandidates(5);
      expect(candidates.length).toBeLessThanOrEqual(5);
    });
  });

  describe("getGroundTruthBuffer", () => {
    it("returns ground truth observations", () => {
      const buffer = wedmFeedbackIngestionEngine.getGroundTruthBuffer();
      expect(Array.isArray(buffer)).toBe(true);
    });
  });
});
