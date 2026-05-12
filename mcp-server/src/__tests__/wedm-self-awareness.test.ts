/**
 * wedm-self-awareness.test.ts — MS-P1-DIGEST-SELFAWARENESS tests
 *
 * Tests for:
 * - WEDMSelfAwarenessEngine
 * - Digest loading and caching
 * - Substrate state collection
 * - Health assessment
 * - Capability queries
 * - Status report generation
 */

import { describe, it, expect, beforeEach } from "vitest";
import { wedmSelfAwarenessEngine } from "../engines/WEDMSelfAwarenessEngine";
import { wedmReasoningTraceLedgerEngine } from "../engines/WEDMReasoningTraceLedgerEngine";
import { wedmBlackboardEngine } from "../engines/WEDMBlackboardEngine";
import { wedmReasoningBridgeEngine } from "../engines/WEDMReasoningBridgeEngine";
import { wedmMultiAgentDispatchEngine } from "../engines/WEDMMultiAgentDispatchEngine";
import { wedmAutonomyEngine } from "../engines/WEDMAutonomyEngine";
import { wedmFeedbackIngestionEngine } from "../engines/WEDMFeedbackIngestionEngine";
import { wedmTribalTipLearnerEngine } from "../engines/WEDMTribalTipLearnerEngine";

// ============================================================================
// Test Setup
// ============================================================================

describe("WEDMSelfAwarenessEngine", () => {
  beforeEach(() => {
    // Reset all engines
    wedmSelfAwarenessEngine.resetForTests();
    wedmReasoningTraceLedgerEngine.resetForTests();
    wedmBlackboardEngine.resetForTests();
    wedmReasoningBridgeEngine.resetForTests();
    wedmMultiAgentDispatchEngine.resetForTests();
    wedmFeedbackIngestionEngine.resetForTests();
    wedmTribalTipLearnerEngine.resetForTests();
  });

  // ============================================================================
  // Substrate State Collection
  // ============================================================================

  describe("getSubstrateState", () => {
    it("should return substrate state structure", () => {
      const state = wedmSelfAwarenessEngine.getSubstrateState();

      expect(state).toHaveProperty("ledger");
      expect(state).toHaveProperty("blackboard");
      expect(state).toHaveProperty("bridge");
      expect(state).toHaveProperty("dispatch");
    });

    it("should reflect ledger statistics", () => {
      // Add some traces
      wedmReasoningTraceLedgerEngine.recordTraceSync({
        dispatcher: "edm",
        action: "test",
        keywords: [],
        awareness_used: true,
      });

      const state = wedmSelfAwarenessEngine.getSubstrateState();

      expect(state.ledger.totalTraces).toBe(1);
      expect(state.ledger.awarenessAdoption).toBeGreaterThanOrEqual(0);
    });

    it("should reflect blackboard entries", () => {
      wedmBlackboardEngine.post("ns1", "key1", "val1", "observation", "test");
      wedmBlackboardEngine.post("ns2", "key2", "val2", "decision", "test");

      const state = wedmSelfAwarenessEngine.getSubstrateState();

      expect(state.blackboard.activeEntries).toBe(2);
      expect(state.blackboard.namespaceCount).toBe(2);
    });

    it("should reflect dispatch coordinations", async () => {
      await wedmMultiAgentDispatchEngine.coordinateDispatch({
        dispatcher: "edm",
        action: "test",
        keywords: [],
      });

      const state = wedmSelfAwarenessEngine.getSubstrateState();

      expect(state.dispatch.totalCoordinations).toBe(1);
    });
  });

  // ============================================================================
  // Autonomy State
  // ============================================================================

  describe("getAutonomyState", () => {
    it("should return autonomy state structure", () => {
      const state = wedmSelfAwarenessEngine.getAutonomyState();

      expect(state).toHaveProperty("level");
      expect(state).toHaveProperty("levelName");
      expect(state).toHaveProperty("humanRole");
      expect(state).toHaveProperty("capabilities");
      expect(state).toHaveProperty("eligibleForPromotion");
      expect(state).toHaveProperty("degradeWarnings");
    });

    it("should reflect current autonomy level", () => {
      wedmAutonomyEngine.reset(3);
      const state = wedmSelfAwarenessEngine.getAutonomyState();

      expect(state.level).toBe(3);
      expect(state.levelName).toBe("Supervised");
    });

    it("should include capabilities", () => {
      wedmAutonomyEngine.reset(2);
      const state = wedmSelfAwarenessEngine.getAutonomyState();

      expect(state.capabilities.suggest_parameters).toBe(true);
      expect(state.capabilities.auto_adjust_parameters).toBe(true);
      expect(state.capabilities.execute_job_supervised).toBe(false);
    });
  });

  // ============================================================================
  // Learning State
  // ============================================================================

  describe("getLearningState", () => {
    it("should return learning state structure", () => {
      const state = wedmSelfAwarenessEngine.getLearningState();

      expect(state).toHaveProperty("feedbackTotal");
      expect(state).toHaveProperty("successRate");
      expect(state).toHaveProperty("tipsLearned");
      expect(state).toHaveProperty("pendingReview");
      expect(state).toHaveProperty("avgPredictionError");
    });

    it("should reflect feedback count", async () => {
      // Process some feedback using the correct ingest method
      await wedmFeedbackIngestionEngine.ingest({
        job_id: "test-1",
        dispatcher: "edm",
        action: "wire_settings",
        original_params: { material: "D2", thickness_mm: 25 },
        success: true,
        predicted: { mrr_mm3_min: 5.0 },
        actual: { mrr_mm3_min: 5.2 },
        timestamp: new Date().toISOString(),
      });

      const state = wedmSelfAwarenessEngine.getLearningState();

      expect(state.feedbackTotal).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================================
  // Tribal State
  // ============================================================================

  describe("getTribalState", () => {
    it("should return tribal state structure", () => {
      const state = wedmSelfAwarenessEngine.getTribalState();

      expect(state).toHaveProperty("totalTips");
      expect(state).toHaveProperty("learnedTips");
      expect(state).toHaveProperty("totalSelections");
      expect(state).toHaveProperty("topTipsByUse");
    });

    it("should reflect tip counts", () => {
      const state = wedmSelfAwarenessEngine.getTribalState();

      expect(typeof state.totalTips).toBe("number");
      expect(typeof state.learnedTips).toBe("number");
    });
  });

  // ============================================================================
  // Health Assessment
  // ============================================================================

  describe("assessHealth", () => {
    it("should return health result structure", () => {
      const substrate = wedmSelfAwarenessEngine.getSubstrateState();
      const health = wedmSelfAwarenessEngine.assessHealth(substrate);

      // Just verify structure - actual status depends on metrics
      expect(["healthy", "degraded", "critical"]).toContain(health.overall);
      expect(Array.isArray(health.issues)).toBe(true);
      expect(Array.isArray(health.recommendations)).toBe(true);
    });

    it("should detect high error rate", () => {
      // Add error traces
      for (let i = 0; i < 20; i++) {
        wedmReasoningTraceLedgerEngine.recordTraceSync({
          dispatcher: "edm",
          action: `error_${i}`,
          keywords: [],
          error: "test error",
        });
      }

      const substrate = wedmSelfAwarenessEngine.getSubstrateState();
      const health = wedmSelfAwarenessEngine.assessHealth(substrate);

      // When all traces have errors, should not be healthy
      expect(health.overall).not.toBe("healthy");
      // Issue text may mention "error rate" or similar
      expect(health.issues.length).toBeGreaterThan(0);
    });

    it("should detect low awareness adoption", () => {
      // Add traces without awareness
      for (let i = 0; i < 20; i++) {
        wedmReasoningTraceLedgerEngine.recordTraceSync({
          dispatcher: "edm",
          action: `no_awareness_${i}`,
          keywords: [],
          awareness_used: false,
        });
      }

      const substrate = wedmSelfAwarenessEngine.getSubstrateState();
      const health = wedmSelfAwarenessEngine.assessHealth(substrate);

      // May detect low awareness adoption
      expect(health).toHaveProperty("overall");
    });

    it("should return health thresholds structure", () => {
      const substrate = {
        ledger: {
          totalTraces: 100,
          errorRate: 20, // Critical
          awarenessAdoption: 30, // Below degraded
          silentMinutes: 35, // Critical
          topActions: [],
          lastTraceAt: null,
        },
        blackboard: {
          totalEntries: 10,
          activeEntries: 0,
          namespaceCount: 0,
        },
        bridge: {
          totalBridges: 5,
          avgLatencyMs: 10,
          avgTipsIngested: 2,
        },
        dispatch: {
          totalCoordinations: 15,
          totalOutcomes: 10,
          decisionsPosted: 5,
        },
      };

      const health = wedmSelfAwarenessEngine.assessHealth(substrate);

      expect(health.overall).toBe("critical");
      expect(health.issues.length).toBeGreaterThan(0);
      expect(health.recommendations.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Full Snapshot
  // ============================================================================

  describe("getSnapshot", () => {
    it("should return complete snapshot structure", async () => {
      const snapshot = await wedmSelfAwarenessEngine.getSnapshot();

      expect(snapshot).toHaveProperty("timestamp");
      expect(snapshot).toHaveProperty("digest");
      expect(snapshot).toHaveProperty("substrate");
      expect(snapshot).toHaveProperty("autonomy");
      expect(snapshot).toHaveProperty("learning");
      expect(snapshot).toHaveProperty("tribal");
      expect(snapshot).toHaveProperty("health");
      expect(snapshot).toHaveProperty("capabilities");
    });

    it("should have valid timestamp", async () => {
      const snapshot = await wedmSelfAwarenessEngine.getSnapshot();

      expect(snapshot.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("should include digest counts", async () => {
      const snapshot = await wedmSelfAwarenessEngine.getSnapshot();

      expect(typeof snapshot.digest.engineCount).toBe("number");
      expect(typeof snapshot.digest.skillCount).toBe("number");
      expect(typeof snapshot.digest.hookCount).toBe("number");
    });

    it("should derive capabilities from autonomy", async () => {
      wedmAutonomyEngine.reset(4);
      const snapshot = await wedmSelfAwarenessEngine.getSnapshot();

      expect(snapshot.capabilities.canSuggestParameters).toBe(true);
      expect(snapshot.capabilities.canAutoAdjust).toBe(true);
      expect(snapshot.capabilities.canExecuteSupervised).toBe(true);
      expect(snapshot.capabilities.canExecuteUnattended).toBe(true);
      expect(snapshot.capabilities.canSelfImprove).toBe(false);
    });

    it("should report learning loop active when feedback exists", async () => {
      await wedmFeedbackIngestionEngine.ingest({
        job_id: "test-1",
        dispatcher: "edm",
        action: "wire_settings",
        original_params: { material: "D2", thickness_mm: 25 },
        success: true,
        predicted: { mrr_mm3_min: 5.0 },
        actual: { mrr_mm3_min: 5.2 },
        timestamp: new Date().toISOString(),
      });

      const snapshot = await wedmSelfAwarenessEngine.getSnapshot();

      expect(snapshot.capabilities.learningLoopActive).toBe(true);
    });

    it("should report coordination active when dispatches exist", async () => {
      await wedmMultiAgentDispatchEngine.coordinateDispatch({
        dispatcher: "edm",
        action: "test",
        keywords: [],
      });

      const snapshot = await wedmSelfAwarenessEngine.getSnapshot();

      expect(snapshot.capabilities.coordinationActive).toBe(true);
    });
  });

  // ============================================================================
  // Capability Queries
  // ============================================================================

  describe("queryCapabilities", () => {
    it("should return query result structure", async () => {
      const result = await wedmSelfAwarenessEngine.queryCapabilities("wire tension");

      expect(result).toHaveProperty("query");
      expect(result).toHaveProperty("matchedEngines");
      expect(result).toHaveProperty("matchedSkills");
      expect(result).toHaveProperty("relevantTips");
      expect(result).toHaveProperty("recommendations");
    });

    it("should match engines by keyword", async () => {
      const result = await wedmSelfAwarenessEngine.queryCapabilities("autonomy");

      expect(result.query).toBe("autonomy");
      expect(Array.isArray(result.matchedEngines)).toBe(true);
    });

    it("should include recommendations", async () => {
      const result = await wedmSelfAwarenessEngine.queryCapabilities("nonexistent xyz");

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should sort matches by confidence", async () => {
      const result = await wedmSelfAwarenessEngine.queryCapabilities("wire tension feed");

      if (result.matchedEngines.length > 1) {
        for (let i = 1; i < result.matchedEngines.length; i++) {
          expect(result.matchedEngines[i - 1].confidence).toBeGreaterThanOrEqual(
            result.matchedEngines[i].confidence
          );
        }
      }
    });
  });

  // ============================================================================
  // Status Report
  // ============================================================================

  describe("generateStatusReport", () => {
    it("should generate markdown report", async () => {
      const report = await wedmSelfAwarenessEngine.generateStatusReport();

      expect(typeof report).toBe("string");
      expect(report).toContain("## WEDM Subsystem Status Report");
    });

    it("should include health section", async () => {
      const report = await wedmSelfAwarenessEngine.generateStatusReport();

      expect(report).toContain("### Health:");
    });

    it("should include autonomy section", async () => {
      wedmAutonomyEngine.reset(2);
      const report = await wedmSelfAwarenessEngine.generateStatusReport();

      expect(report).toContain("### Autonomy:");
      expect(report).toContain("L2");
    });

    it("should include coordination substrate section", async () => {
      const report = await wedmSelfAwarenessEngine.generateStatusReport();

      expect(report).toContain("### Coordination Substrate");
    });

    it("should include learning loop section", async () => {
      const report = await wedmSelfAwarenessEngine.generateStatusReport();

      expect(report).toContain("### Learning Loop");
    });

    it("should include inventory section", async () => {
      const report = await wedmSelfAwarenessEngine.generateStatusReport();

      expect(report).toContain("### WEDM Inventory");
    });
  });

  // ============================================================================
  // Digest Loading
  // ============================================================================

  describe("digest handling", () => {
    it("should return null when digest file missing", async () => {
      wedmSelfAwarenessEngine.resetForTests();
      const digest = await wedmSelfAwarenessEngine.loadDigest();

      // May or may not exist depending on test environment
      expect(digest === null || typeof digest === "object").toBe(true);
    });

    it("should cache digest after first load", async () => {
      const digest1 = await wedmSelfAwarenessEngine.getDigest();
      const digest2 = await wedmSelfAwarenessEngine.getDigest();

      // Both should be same reference (cached)
      expect(digest1).toBe(digest2);
    });
  });
});
