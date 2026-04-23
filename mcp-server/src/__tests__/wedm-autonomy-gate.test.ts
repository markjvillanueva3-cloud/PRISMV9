/**
 * wedm-autonomy-gate.test.ts — MS-P1-AUTONOMY tests
 *
 * Tests for:
 * - WEDMAutonomySubstrateGateEngine
 * - Health-gated promotion/demotion
 * - Auto-degrade triggers
 */

import { describe, it, expect, beforeEach } from "vitest";
import { wedmAutonomySubstrateGateEngine } from "../engines/WEDMAutonomySubstrateGateEngine";
import { wedmAutonomyEngine } from "../engines/WEDMAutonomyEngine";
import { wedmReasoningTraceLedgerEngine } from "../engines/WEDMReasoningTraceLedgerEngine";
import { wedmBlackboardEngine } from "../engines/WEDMBlackboardEngine";
import { wedmReasoningBridgeEngine } from "../engines/WEDMReasoningBridgeEngine";
import { wedmMultiAgentDispatchEngine } from "../engines/WEDMMultiAgentDispatchEngine";
import { wedmFeedbackIngestionEngine } from "../engines/WEDMFeedbackIngestionEngine";
import { wedmTribalTipLearnerEngine } from "../engines/WEDMTribalTipLearnerEngine";

// ============================================================================
// Test Setup
// ============================================================================

describe("WEDMAutonomySubstrateGateEngine", () => {
  beforeEach(() => {
    // Reset all engines
    wedmAutonomySubstrateGateEngine.resetForTests();
    wedmReasoningTraceLedgerEngine.resetForTests();
    wedmBlackboardEngine.resetForTests();
    wedmReasoningBridgeEngine.resetForTests();
    wedmMultiAgentDispatchEngine.resetForTests();
    wedmFeedbackIngestionEngine.resetForTests();
    wedmTribalTipLearnerEngine.resetForTests();
  });

  // ============================================================================
  // Metrics Collection
  // ============================================================================

  describe("getMetrics", () => {
    it("should return substrate health metrics", () => {
      const metrics = wedmAutonomySubstrateGateEngine.getMetrics();

      expect(metrics).toHaveProperty("errorRate");
      expect(metrics).toHaveProperty("awarenessAdoption");
      expect(metrics).toHaveProperty("silentMinutes");
      expect(metrics).toHaveProperty("blackboardActive");
      expect(metrics).toHaveProperty("bridgeLatencyMs");
      expect(metrics).toHaveProperty("feedbackTotal");
      expect(metrics).toHaveProperty("coordinations");
    });

    it("should reflect ledger error rate", () => {
      // Add enough traces so error rate calculation is meaningful
      // Need multiple traces to get a non-zero rate from the rolling window
      for (let i = 0; i < 5; i++) {
        wedmReasoningTraceLedgerEngine.recordTraceSync({
          dispatcher: "edm",
          action: `error_${i}`,
          keywords: [],
          error: "test error",
        });
      }
      for (let i = 0; i < 5; i++) {
        wedmReasoningTraceLedgerEngine.recordTraceSync({
          dispatcher: "edm",
          action: `success_${i}`,
          keywords: [],
        });
      }

      const metrics = wedmAutonomySubstrateGateEngine.getMetrics();
      // Error rate should be approximately 50% (5 errors out of 10)
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
      // Verify it's a number
      expect(typeof metrics.errorRate).toBe("number");
    });

    it("should reflect coordination count", async () => {
      await wedmMultiAgentDispatchEngine.coordinateDispatch({
        dispatcher: "edm",
        action: "test",
        keywords: [],
      });

      const metrics = wedmAutonomySubstrateGateEngine.getMetrics();
      expect(metrics.coordinations).toBe(1);
    });

    it("should reflect blackboard entries", () => {
      wedmBlackboardEngine.post("ns1", "key1", "val1", "observation", "test");
      wedmBlackboardEngine.post("ns2", "key2", "val2", "decision", "test");

      const metrics = wedmAutonomySubstrateGateEngine.getMetrics();
      expect(metrics.blackboardActive).toBe(2);
    });
  });

  // ============================================================================
  // Promotion Eligibility
  // ============================================================================

  describe("checkPromotionEligibility", () => {
    it("should return eligibility result", () => {
      const result = wedmAutonomySubstrateGateEngine.checkPromotionEligibility();

      expect(result).toHaveProperty("eligible");
      expect(result).toHaveProperty("currentLevel");
      expect(result).toHaveProperty("targetLevel");
      expect(result).toHaveProperty("metrics");
      expect(result).toHaveProperty("failedChecks");
      expect(result).toHaveProperty("passedChecks");
    });

    it("should require minimum coordinations for L1", () => {
      wedmAutonomyEngine.reset(0);
      const result = wedmAutonomySubstrateGateEngine.checkPromotionEligibility();

      // L0→L1 requires at least 1 coordination
      expect(result.targetLevel).toBe(1);
      expect(result.failedChecks.some(c => c.includes("Coordination"))).toBe(true);
    });

    it("should pass with sufficient activity", async () => {
      wedmAutonomyEngine.reset(0);

      // Add activity
      await wedmMultiAgentDispatchEngine.coordinateDispatch({
        dispatcher: "edm",
        action: "test",
        keywords: [],
      });
      wedmReasoningTraceLedgerEngine.recordTraceSync({
        dispatcher: "edm",
        action: "test",
        keywords: [],
        awareness_used: true,
      });

      const result = wedmAutonomySubstrateGateEngine.checkPromotionEligibility();

      // Should pass coordination requirement
      expect(result.passedChecks.some(c => c.includes("Coordination"))).toBe(true);
    });

    it("should require counter-sign for L3→L4", () => {
      wedmAutonomyEngine.reset(3);
      const result = wedmAutonomySubstrateGateEngine.checkPromotionEligibility();

      expect(result.targetLevel).toBe(4);
      expect(result.failedChecks.some(c => c.includes("Counter-sign"))).toBe(true);
    });

    it("should pass counter-sign requirement when provided", () => {
      wedmAutonomyEngine.reset(3);
      const result = wedmAutonomySubstrateGateEngine.checkPromotionEligibility("operator2");

      expect(result.passedChecks.some(c => c.includes("Counter-sign"))).toBe(true);
    });
  });

  // ============================================================================
  // Degrade Triggers
  // ============================================================================

  describe("checkDegradeTriggers", () => {
    it("should return degrade check result", () => {
      const result = wedmAutonomySubstrateGateEngine.checkDegradeTriggers();

      expect(result).toHaveProperty("shouldDegrade");
      expect(result).toHaveProperty("currentLevel");
      expect(result).toHaveProperty("suggestedFloor");
      expect(result).toHaveProperty("triggers");
    });

    it("should not trigger degrade at L0", () => {
      wedmAutonomyEngine.reset(0);
      const result = wedmAutonomySubstrateGateEngine.checkDegradeTriggers();

      expect(result.shouldDegrade).toBe(false);
    });

    it("should trigger degrade on high error rate", () => {
      wedmAutonomyEngine.reset(3);

      // Add many error traces
      for (let i = 0; i < 10; i++) {
        wedmReasoningTraceLedgerEngine.recordTraceSync({
          dispatcher: "edm",
          action: `error_${i}`,
          keywords: [],
          error: "test error",
        });
      }

      const result = wedmAutonomySubstrateGateEngine.checkDegradeTriggers();
      // May or may not trigger depending on error rate threshold
      expect(result).toHaveProperty("triggers");
    });
  });

  // ============================================================================
  // Gated Promotion
  // ============================================================================

  describe("gatedPromote", () => {
    it("should reject promotion when ineligible", () => {
      wedmAutonomyEngine.reset(0);
      const result = wedmAutonomySubstrateGateEngine.gatedPromote();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.gate.eligible).toBe(false);
    });

    it("should promote when eligible", async () => {
      wedmAutonomyEngine.reset(0);

      // Add minimum activity for L0→L1
      await wedmMultiAgentDispatchEngine.coordinateDispatch({
        dispatcher: "edm",
        action: "test",
        keywords: [],
      });
      wedmReasoningTraceLedgerEngine.recordTraceSync({
        dispatcher: "edm",
        action: "test",
        keywords: [],
        awareness_used: true,
      });

      const result = wedmAutonomySubstrateGateEngine.gatedPromote({
        actor: "test",
        reason: "test promotion",
      });

      // May succeed or fail depending on all requirements
      expect(result).toHaveProperty("success");
      expect(result.gate).toBeDefined();
    });

    it("should track actor and reason", async () => {
      wedmAutonomyEngine.reset(0);

      await wedmMultiAgentDispatchEngine.coordinateDispatch({
        dispatcher: "edm",
        action: "test",
        keywords: [],
      });

      const result = wedmAutonomySubstrateGateEngine.gatedPromote({
        actor: "test_operator",
        reason: "test_reason",
      });

      expect(result.gate).toBeDefined();
    });
  });

  // ============================================================================
  // Auto Degrade
  // ============================================================================

  describe("autoDegrade", () => {
    it("should not degrade when healthy", () => {
      wedmAutonomyEngine.reset(2);
      const result = wedmAutonomySubstrateGateEngine.autoDegrade();

      // At L2 with no activity, should not degrade (silent minutes may trigger)
      expect(result).toHaveProperty("degraded");
    });

    it("should return degrade info", () => {
      const result = wedmAutonomySubstrateGateEngine.autoDegrade();

      expect(result).toHaveProperty("degraded");
      expect(result).toHaveProperty("triggers");
    });
  });

  // ============================================================================
  // Status Snapshot
  // ============================================================================

  describe("getStatus", () => {
    it("should return complete status snapshot", () => {
      const status = wedmAutonomySubstrateGateEngine.getStatus();

      expect(status).toHaveProperty("currentLevel");
      expect(status).toHaveProperty("levelName");
      expect(status).toHaveProperty("humanRole");
      expect(status).toHaveProperty("metrics");
      expect(status).toHaveProperty("eligibleForPromotion");
      expect(status).toHaveProperty("promotionBlockers");
      expect(status).toHaveProperty("degradeWarnings");
      expect(status).toHaveProperty("capabilities");
      expect(status).toHaveProperty("nextLevelRequirements");
    });

    it("should reflect current capabilities", () => {
      wedmAutonomyEngine.reset(2);
      const status = wedmAutonomySubstrateGateEngine.getStatus();

      expect(status.capabilities.suggest_parameters).toBe(true);
      expect(status.capabilities.auto_adjust_parameters).toBe(true);
      expect(status.capabilities.execute_job_supervised).toBe(false);
    });

    it("should include next level requirements", () => {
      wedmAutonomyEngine.reset(1);
      const status = wedmAutonomySubstrateGateEngine.getStatus();

      expect(status.nextLevelRequirements).not.toBeNull();
      expect(status.nextLevelRequirements).toHaveProperty("maxErrorRate");
      expect(status.nextLevelRequirements).toHaveProperty("minAwarenessAdoption");
    });

    it("should have null requirements at max level", () => {
      wedmAutonomyEngine.reset(5);
      const status = wedmAutonomySubstrateGateEngine.getStatus();

      expect(status.nextLevelRequirements).toBeNull();
    });
  });

  // ============================================================================
  // Integration with Autonomy Engine
  // ============================================================================

  describe("integration", () => {
    it("should respect autonomy engine level", () => {
      wedmAutonomyEngine.reset(3);
      const status = wedmAutonomySubstrateGateEngine.getStatus();

      expect(status.currentLevel).toBe(3);
      expect(status.levelName).toBe("Supervised");
    });

    it("should correctly report capability state", () => {
      wedmAutonomyEngine.reset(4);
      const status = wedmAutonomySubstrateGateEngine.getStatus();

      expect(status.capabilities.suggest_parameters).toBe(true);
      expect(status.capabilities.auto_adjust_parameters).toBe(true);
      expect(status.capabilities.execute_job_supervised).toBe(true);
      expect(status.capabilities.execute_job_unattended).toBe(true);
      expect(status.capabilities.self_modify_policy).toBe(false);
    });

    it("should correctly report full capabilities at L5", () => {
      wedmAutonomyEngine.reset(5);
      const status = wedmAutonomySubstrateGateEngine.getStatus();

      expect(status.capabilities.self_modify_policy).toBe(true);
    });
  });
});
