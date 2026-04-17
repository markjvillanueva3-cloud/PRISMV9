/**
 * wedm-coordination-routes.test.ts — MS-P1-FRONT-WIRE route tests
 *
 * Tests for the coordination substrate API endpoints added to edm.ts routes.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { wedmMultiAgentDispatchEngine } from "../engines/WEDMMultiAgentDispatchEngine";
import { wedmReasoningTraceLedgerEngine } from "../engines/WEDMReasoningTraceLedgerEngine";
import { wedmBlackboardEngine } from "../engines/WEDMBlackboardEngine";
import { wedmReasoningBridgeEngine } from "../engines/WEDMReasoningBridgeEngine";

describe("WEDM Coordination Substrate Engines", () => {
  beforeEach(() => {
    wedmMultiAgentDispatchEngine.resetForTests();
    wedmReasoningTraceLedgerEngine.resetForTests();
    wedmBlackboardEngine.resetForTests();
    wedmReasoningBridgeEngine.resetForTests();
  });

  describe("WEDMMultiAgentDispatchEngine", () => {
    it("should return empty snapshot when no activity", () => {
      const snapshot = wedmMultiAgentDispatchEngine.snapshot();

      expect(snapshot).toHaveProperty("blackboard");
      expect(snapshot).toHaveProperty("ledger");
      expect(snapshot).toHaveProperty("bridge");
      expect(snapshot).toHaveProperty("dispatch");
      expect(snapshot.dispatch.totalCoordinations).toBe(0);
    });

    it("should track coordination stats", async () => {
      const result = await wedmMultiAgentDispatchEngine.coordinateDispatch({
        dispatcher: "edm",
        action: "wire_settings",
        params: { material: "D2" },
        keywords: ["wire", "D2"],
      });

      expect(result.dispatcher).toBe("edm");
      expect(result.action).toBe("wire_settings");
      expect(result.keywords).toContain("wire");

      const stats = wedmMultiAgentDispatchEngine.getStats();
      expect(stats.totalCoordinations).toBe(1);
    });

    it("should record outcomes", async () => {
      const coord = await wedmMultiAgentDispatchEngine.coordinateDispatch({
        dispatcher: "edm",
        action: "test_action",
        keywords: ["test"],
      });

      wedmMultiAgentDispatchEngine.recordOutcome({
        dispatcher: "edm",
        action: "test_action",
        keywords: coord.keywords,
        entryAt: coord.entryAt,
        success: true,
        decisionKey: "result",
        decisionValue: 42,
        confidence: 0.9,
      });

      const stats = wedmMultiAgentDispatchEngine.getStats();
      expect(stats.totalOutcomes).toBe(1);
      expect(stats.decisionsPosted).toBe(1);
    });
  });

  describe("WEDMReasoningTraceLedgerEngine", () => {
    it("should record and retrieve traces", () => {
      const result = wedmReasoningTraceLedgerEngine.recordTraceSync({
        dispatcher: "edm",
        action: "wire_settings",
        keywords: ["wire", "D2"],
        awareness_used: true,
        duration_ms: 50,
        confidence: 0.85,
      });

      expect(result.ok).toBe(true);
      expect(result.entry?.dispatcher).toBe("edm");

      const recent = wedmReasoningTraceLedgerEngine.getRecent(10);
      expect(recent.length).toBe(1);
      expect(recent[0].action).toBe("wire_settings");
    });

    it("should compute stats correctly", () => {
      // Add some traces
      wedmReasoningTraceLedgerEngine.recordTraceSync({
        dispatcher: "edm",
        action: "action_a",
        keywords: [],
        awareness_used: true,
      });
      wedmReasoningTraceLedgerEngine.recordTraceSync({
        dispatcher: "edm",
        action: "action_a",
        keywords: [],
        awareness_used: false,
      });
      wedmReasoningTraceLedgerEngine.recordTraceSync({
        dispatcher: "edm",
        action: "action_b",
        keywords: [],
        awareness_used: true,
        error: "test error",
      });

      const stats = wedmReasoningTraceLedgerEngine.getStats();
      expect(stats.totalTraces).toBe(3);
      expect(stats.topActions.length).toBeGreaterThan(0);
      expect(stats.topActions[0].action).toBe("action_a");
      expect(stats.topActions[0].count).toBe(2);
    });
  });

  describe("WEDMBlackboardEngine", () => {
    it("should post and read entries", () => {
      const entry = wedmBlackboardEngine.post(
        "wedm.edm.mat.d2",
        "recommended_wire",
        "brass-025",
        "decision",
        "test-source",
        { confidence: 0.9 }
      );

      expect(entry.namespace).toBe("wedm.edm.mat.d2");
      expect(entry.key).toBe("recommended_wire");
      expect(entry.value).toBe("brass-025");
      expect(entry.tag).toBe("decision");

      const read = wedmBlackboardEngine.read("wedm.edm.mat.d2", "recommended_wire");
      expect(read).not.toBeNull();
      expect(read?.value).toBe("brass-025");
    });

    it("should query by prefix", () => {
      wedmBlackboardEngine.post("wedm.edm.mat.d2", "key1", "val1", "observation", "src");
      wedmBlackboardEngine.post("wedm.edm.mat.d2", "key2", "val2", "decision", "src");
      wedmBlackboardEngine.post("wedm.cam.drill", "other", "val3", "observation", "src");

      const results = wedmBlackboardEngine.readByPrefix("wedm.edm");
      expect(results.length).toBe(2);

      const decisions = wedmBlackboardEngine.readByPrefix("wedm.edm", "decision");
      expect(decisions.length).toBe(1);
    });

    it("should track stats", () => {
      wedmBlackboardEngine.post("ns1", "k1", "v1", "observation", "src");
      wedmBlackboardEngine.post("ns2", "k2", "v2", "decision", "src");

      const stats = wedmBlackboardEngine.getStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.activeEntries).toBe(2);
      expect(stats.namespaceCount).toBe(2);
    });
  });

  describe("WEDMReasoningBridgeEngine", () => {
    it("should enrich context with prior observations", () => {
      // Post some prior data to blackboard
      wedmBlackboardEngine.post(
        "wedm.edm.wire_settings",
        "prior_recommendation",
        "use brass-025",
        "observation",
        "test"
      );

      const enriched = wedmReasoningBridgeEngine.enrichContext({
        dispatcher: "edm",
        action: "wire_settings",
        keywords: ["wire"],
        params: {},
        awarenessTips: [
          { text: "Tip 1", confidence: 0.8 },
          { text: "Tip 2", confidence: 0.7 },
        ],
      });

      expect(enriched.dispatcher).toBe("edm");
      expect(enriched.action).toBe("wire_settings");
      expect(enriched.namespace).toBe("wedm.edm.wire_settings");
      expect(enriched.awarenessTipCount).toBe(2);
      expect(enriched.postedObservations).toBe(2);
    });

    it("should post decisions to blackboard", () => {
      wedmReasoningBridgeEngine.postDecision(
        "edm",
        "wire_settings",
        { material: "D2" },
        "selected_wire",
        "brass-025",
        "optimizer",
        0.95
      );

      const entry = wedmBlackboardEngine.read("wedm.edm.mat.d2.wire_settings", "selected_wire");
      expect(entry).not.toBeNull();
      expect(entry?.value).toBe("brass-025");
      expect(entry?.tag).toBe("decision");
    });

    it("should track bridge stats", () => {
      wedmReasoningBridgeEngine.enrichContext({
        dispatcher: "edm",
        action: "action1",
        keywords: [],
        awarenessTips: [{ text: "tip" }],
      });
      wedmReasoningBridgeEngine.enrichContext({
        dispatcher: "edm",
        action: "action2",
        keywords: [],
        awarenessTips: [{ text: "tip1" }, { text: "tip2" }],
      });

      const stats = wedmReasoningBridgeEngine.getStats();
      expect(stats.totalBridges).toBe(2);
      expect(stats.avgTipsIngested).toBeGreaterThan(0);
    });
  });
});
