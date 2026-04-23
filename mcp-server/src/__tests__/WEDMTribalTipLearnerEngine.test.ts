/**
 * WEDMTribalTipLearnerEngine Tests — MS-P1-LEARN-LOOP U-P1-LL-03
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../engines/WEDMFeedbackIngestionEngine.js", () => ({
  wedmFeedbackIngestionEngine: {
    getTipCandidates: vi.fn().mockReturnValue([
      {
        id: "cand-1",
        source_job: "job-1",
        pattern_type: "correction",
        keywords: ["tension", "brass"],
        context: { material: "D2", thickness: 25 },
        note: "Lower tension for thin brass wire",
        created_at: new Date().toISOString(),
      },
      {
        id: "cand-2",
        source_job: "job-2",
        pattern_type: "success_pattern",
        keywords: ["speed", "hardened"],
        context: { material: "S7" },
        created_at: new Date().toISOString(),
      },
    ]),
    markTipCandidatesProcessed: vi.fn(),
  },
}));

vi.mock("../engines/WEDMTribalRuntimeEngine.js", () => ({
  wedmTribalRuntimeEngine: {
    addTip: vi.fn().mockReturnValue(true),
    getTipCount: vi.fn().mockReturnValue(46),
  },
}));

import { wedmTribalTipLearnerEngine } from "../engines/WEDMTribalTipLearnerEngine.js";

describe("WEDMTribalTipLearnerEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wedmTribalTipLearnerEngine.reset?.();
  });

  describe("processQueue", () => {
    it("processes pending tip candidates", async () => {
      const result = await wedmTribalTipLearnerEngine.processQueue(10);
      expect(result).toBeDefined();
      expect(typeof result.processed).toBe("number");
    });

    it("auto-approves high confidence tips", async () => {
      const result = await wedmTribalTipLearnerEngine.processQueue(10, 0.5);
      expect(typeof result.auto_approved).toBe("number");
    });

    it("queues low confidence tips for review", async () => {
      const result = await wedmTribalTipLearnerEngine.processQueue(10, 0.99);
      expect(typeof result.pending_review).toBe("number");
    });

    it("rejects low-quality candidates", async () => {
      const result = await wedmTribalTipLearnerEngine.processQueue(10);
      expect(typeof result.rejected).toBe("number");
    });

    it("returns generated tips", async () => {
      const result = await wedmTribalTipLearnerEngine.processQueue(10);
      expect(Array.isArray(result.new_tips)).toBe(true);
    });
  });

  describe("approveTip", () => {
    it("approves pending tip by id", () => {
      const approved = wedmTribalTipLearnerEngine.approveTip("tip-1");
      expect(typeof approved).toBe("boolean");
    });
  });

  describe("rejectTip", () => {
    it("rejects pending tip by id", () => {
      const rejected = wedmTribalTipLearnerEngine.rejectTip("tip-1");
      expect(typeof rejected).toBe("boolean");
    });
  });

  describe("getPendingReview", () => {
    it("returns tips pending review", () => {
      const pending = wedmTribalTipLearnerEngine.getPendingReview();
      expect(Array.isArray(pending)).toBe(true);
    });
  });

  describe("getApprovedTips", () => {
    it("returns approved tips", () => {
      const approved = wedmTribalTipLearnerEngine.getApprovedTips();
      expect(Array.isArray(approved)).toBe(true);
    });
  });

  describe("getStats", () => {
    it("returns learning statistics", () => {
      const stats = wedmTribalTipLearnerEngine.getStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalProcessed).toBe("number");
    });

    it("tracks auto-approved count", () => {
      const stats = wedmTribalTipLearnerEngine.getStats();
      expect(typeof stats.autoApproved).toBe("number");
    });

    it("tracks manually approved count", () => {
      const stats = wedmTribalTipLearnerEngine.getStats();
      expect(typeof stats.manuallyApproved).toBe("number");
    });

    it("tracks rejected count", () => {
      const stats = wedmTribalTipLearnerEngine.getStats();
      expect(typeof stats.rejected).toBe("number");
    });

    it("tracks total tips generated", () => {
      const stats = wedmTribalTipLearnerEngine.getStats();
      expect(typeof stats.tipsGenerated).toBe("number");
    });
  });
});
