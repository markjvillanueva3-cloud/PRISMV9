/**
 * WEDMAutonomySubstrateGateEngine Tests — MS-P1-AUTONOMY U-P1-AUT-01
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies to avoid circular imports
vi.mock("../engines/WEDMAutonomyEngine.js", () => ({
  wedmAutonomyEngine: {
    getState: () => ({ currentLevel: 1 as const, capabilities: {} }),
    getCapabilities: () => ({}),
  },
}));

vi.mock("../engines/WEDMMultiAgentDispatchEngine.js", () => ({
  wedmMultiAgentDispatchEngine: {
    getStats: () => ({ totalDispatches: 50, successfulDispatches: 48 }),
  },
}));

vi.mock("../engines/WEDMReasoningTraceLedgerEngine.js", () => ({
  wedmReasoningTraceLedgerEngine: {
    getStats: () => ({ totalTraces: 100, errorTraces: 5 }),
  },
}));

vi.mock("../engines/WEDMBlackboardEngine.js", () => ({
  wedmBlackboardEngine: {
    getStats: () => ({ totalPosts: 200, activeNamespaces: 10 }),
  },
}));

vi.mock("../engines/WEDMReasoningBridgeEngine.js", () => ({
  wedmReasoningBridgeEngine: {
    getStats: () => ({ decisionsPosted: 50, avgLatencyMs: 15 }),
  },
}));

vi.mock("../engines/WEDMFeedbackIngestionEngine.js", () => ({
  wedmFeedbackIngestionEngine: {
    getStats: () => ({ totalFeedback: 30, tipCandidatesGenerated: 10 }),
  },
}));

vi.mock("../engines/WEDMTribalTipLearnerEngine.js", () => ({
  wedmTribalTipLearnerEngine: {
    getStats: () => ({ tipsGenerated: 5, autoApproved: 3 }),
  },
}));

import { wedmAutonomySubstrateGateEngine } from "../engines/WEDMAutonomySubstrateGateEngine.js";

describe("WEDMAutonomySubstrateGateEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getMetrics", () => {
    it("collects metrics from all substrate engines", () => {
      const metrics = wedmAutonomySubstrateGateEngine.getMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics.errorRate).toBe("number");
      expect(typeof metrics.awarenessAdoption).toBe("number");
      expect(typeof metrics.silentMinutes).toBe("number");
    });

    it("includes blackboard and bridge metrics", () => {
      const metrics = wedmAutonomySubstrateGateEngine.getMetrics();
      expect(typeof metrics.blackboardActive).toBe("number");
      expect(typeof metrics.bridgeLatencyMs).toBe("number");
    });

    it("includes feedback and tip metrics", () => {
      const metrics = wedmAutonomySubstrateGateEngine.getMetrics();
      expect(typeof metrics.feedbackTotal).toBe("number");
      expect(typeof metrics.tipsLearned).toBe("number");
    });
  });

  describe("checkPromotionEligibility", () => {
    it("checks eligibility for level promotion", () => {
      const result = wedmAutonomySubstrateGateEngine.checkPromotionEligibility(2);
      expect(result).toBeDefined();
      expect(typeof result.eligible).toBe("boolean");
      expect(result.currentLevel).toBeDefined();
      expect(result.targetLevel).toBe(2);
    });

    it("includes failed and passed checks", () => {
      const result = wedmAutonomySubstrateGateEngine.checkPromotionEligibility(3);
      expect(Array.isArray(result.failedChecks)).toBe(true);
      expect(Array.isArray(result.passedChecks)).toBe(true);
    });

    it("includes requirements for target level", () => {
      const result = wedmAutonomySubstrateGateEngine.checkPromotionEligibility(2);
      expect(result.requirements).toBeDefined();
      expect(typeof result.requirements.maxErrorRate).toBe("number");
    });
  });

  describe("checkDegradeConditions", () => {
    it("checks if degrade is needed", () => {
      const result = wedmAutonomySubstrateGateEngine.checkDegradeConditions();
      expect(result).toBeDefined();
      expect(typeof result.shouldDegrade).toBe("boolean");
      expect(result.currentLevel).toBeDefined();
    });

    it("provides triggers when degrade needed", () => {
      const result = wedmAutonomySubstrateGateEngine.checkDegradeConditions();
      expect(Array.isArray(result.triggers)).toBe(true);
    });

    it("suggests floor level when degrade needed", () => {
      const result = wedmAutonomySubstrateGateEngine.checkDegradeConditions();
      expect(typeof result.suggestedFloor).toBe("number");
    });
  });

  describe("getStatus", () => {
    it("returns complete autonomy status snapshot", () => {
      const status = wedmAutonomySubstrateGateEngine.getStatus();
      expect(status).toBeDefined();
      expect(status.currentLevel).toBeDefined();
      expect(status.levelName).toBeDefined();
    });

    it("includes human role description", () => {
      const status = wedmAutonomySubstrateGateEngine.getStatus();
      expect(status.humanRole).toBeDefined();
    });

    it("includes eligibility for promotion", () => {
      const status = wedmAutonomySubstrateGateEngine.getStatus();
      expect(typeof status.eligibleForPromotion).toBe("boolean");
    });

    it("includes capabilities", () => {
      const status = wedmAutonomySubstrateGateEngine.getStatus();
      expect(status.capabilities).toBeDefined();
    });
  });

  describe("getLevelRequirements", () => {
    it("returns requirements for each level", () => {
      for (let level = 0; level <= 5; level++) {
        const reqs = wedmAutonomySubstrateGateEngine.getLevelRequirements(level as 0 | 1 | 2 | 3 | 4 | 5);
        expect(reqs).toBeDefined();
        expect(reqs?.level).toBe(level);
      }
    });

    it("includes threshold values", () => {
      const reqs = wedmAutonomySubstrateGateEngine.getLevelRequirements(2);
      expect(reqs?.requirements.maxErrorRate).toBeDefined();
      expect(reqs?.requirements.minAwarenessAdoption).toBeDefined();
    });
  });
});
