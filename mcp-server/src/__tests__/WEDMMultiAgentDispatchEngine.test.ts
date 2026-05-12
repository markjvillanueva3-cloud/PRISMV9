/**
 * WEDMMultiAgentDispatchEngine tests — MS-P0.5-COORD U-P0.5-COORD-08
 */
import { describe, it, expect, beforeEach } from "vitest";
import { wedmMultiAgentDispatchEngine } from "../engines/WEDMMultiAgentDispatchEngine.js";
import { wedmBlackboardEngine } from "../engines/WEDMBlackboardEngine.js";
import { wedmReasoningTraceLedgerEngine } from "../engines/WEDMReasoningTraceLedgerEngine.js";

describe("WEDMMultiAgentDispatchEngine", () => {
  beforeEach(() => {
    wedmMultiAgentDispatchEngine.resetForTests();
    wedmBlackboardEngine.resetForTests();
    wedmReasoningTraceLedgerEngine.resetForTests();
  });

  describe("coordinateDispatch", () => {
    it("returns a CoordinationResult with entryAt timestamp", async () => {
      const r = await wedmMultiAgentDispatchEngine.coordinateDispatch({
        dispatcher: "edm",
        action: "wire_settings",
      });
      expect(r.dispatcher).toBe("edm");
      expect(r.action).toBe("wire_settings");
      expect(r.entryAt).toBeGreaterThan(0);
      expect(r.coordLatencyMs).toBeGreaterThanOrEqual(0);
    });

    it("returns keywords (extracted or provided)", async () => {
      const r = await wedmMultiAgentDispatchEngine.coordinateDispatch({
        dispatcher: "edm",
        action: "wire_settings",
        params: { material: "D2" },
      });
      expect(Array.isArray(r.keywords)).toBe(true);
    });

    it("increments totalCoordinations", async () => {
      const before = wedmMultiAgentDispatchEngine.getStats().totalCoordinations;
      await wedmMultiAgentDispatchEngine.coordinateDispatch({
        dispatcher: "edm",
        action: "wire_settings",
      });
      const after = wedmMultiAgentDispatchEngine.getStats().totalCoordinations;
      expect(after - before).toBe(1);
    });

    it("records lastCoordinationAt ISO timestamp", async () => {
      await wedmMultiAgentDispatchEngine.coordinateDispatch({
        dispatcher: "edm",
        action: "wire_settings",
      });
      const s = wedmMultiAgentDispatchEngine.getStats();
      expect(s.lastCoordinationAt).not.toBeNull();
      expect(new Date(s.lastCoordinationAt!).getTime()).toBeGreaterThan(0);
    });

    it("coordLatencyMs is small (<500ms budget)", async () => {
      const r = await wedmMultiAgentDispatchEngine.coordinateDispatch({
        dispatcher: "edm",
        action: "wire_settings",
      });
      expect(r.coordLatencyMs).toBeLessThan(500);
    });

    it("awarenessTipCount is non-negative", async () => {
      const r = await wedmMultiAgentDispatchEngine.coordinateDispatch({
        dispatcher: "edm",
        action: "wire_settings",
      });
      expect(r.awarenessTipCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("recordOutcome", () => {
    it("increments totalOutcomes", async () => {
      const r = await wedmMultiAgentDispatchEngine.coordinateDispatch({
        dispatcher: "edm",
        action: "wire_settings",
      });
      wedmMultiAgentDispatchEngine.recordOutcome({
        dispatcher: "edm",
        action: "wire_settings",
        keywords: r.keywords,
        entryAt: r.entryAt,
        success: true,
      });
      expect(wedmMultiAgentDispatchEngine.getStats().totalOutcomes).toBe(1);
    });

    it("writes a ledger trace when outcome recorded", async () => {
      const r = await wedmMultiAgentDispatchEngine.coordinateDispatch({
        dispatcher: "edm",
        action: "wire_settings",
      });
      const ledgerBefore = wedmReasoningTraceLedgerEngine.getStats().totalTraces;
      wedmMultiAgentDispatchEngine.recordOutcome({
        dispatcher: "edm",
        action: "wire_settings",
        keywords: r.keywords,
        entryAt: r.entryAt,
        success: true,
      });
      const ledgerAfter = wedmReasoningTraceLedgerEngine.getStats().totalTraces;
      expect(ledgerAfter).toBeGreaterThan(ledgerBefore);
    });

    it("posts a decision to blackboard when decisionKey provided", async () => {
      const r = await wedmMultiAgentDispatchEngine.coordinateDispatch({
        dispatcher: "edm",
        action: "wire_settings",
      });
      wedmMultiAgentDispatchEngine.recordOutcome({
        dispatcher: "edm",
        action: "wire_settings",
        keywords: r.keywords,
        entryAt: r.entryAt,
        success: true,
        decisionKey: "result.wireTension",
        decisionValue: { value: 1200, unit: "g" },
        confidence: 0.85,
      });
      expect(wedmMultiAgentDispatchEngine.getStats().decisionsPosted).toBe(1);
    });

    it("does NOT post a decision when success is false", async () => {
      const r = await wedmMultiAgentDispatchEngine.coordinateDispatch({
        dispatcher: "edm",
        action: "wire_settings",
      });
      wedmMultiAgentDispatchEngine.recordOutcome({
        dispatcher: "edm",
        action: "wire_settings",
        keywords: r.keywords,
        entryAt: r.entryAt,
        success: false,
        decisionKey: "result.wireTension",
        decisionValue: { value: 1200 },
        error: "bad input",
      });
      expect(wedmMultiAgentDispatchEngine.getStats().decisionsPosted).toBe(0);
    });

    it("posts all warnings to blackboard", async () => {
      const r = await wedmMultiAgentDispatchEngine.coordinateDispatch({
        dispatcher: "edm",
        action: "wire_settings",
      });
      wedmMultiAgentDispatchEngine.recordOutcome({
        dispatcher: "edm",
        action: "wire_settings",
        keywords: r.keywords,
        entryAt: r.entryAt,
        success: true,
        warnings: ["low power", "wire near end-of-life"],
      });
      expect(wedmMultiAgentDispatchEngine.getStats().warningsPosted).toBe(2);
    });

    it("totalLatency reflects time since entryAt", async () => {
      const r = await wedmMultiAgentDispatchEngine.coordinateDispatch({
        dispatcher: "edm",
        action: "wire_settings",
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
      wedmMultiAgentDispatchEngine.recordOutcome({
        dispatcher: "edm",
        action: "wire_settings",
        keywords: r.keywords,
        entryAt: r.entryAt,
        success: true,
      });
      const s = wedmMultiAgentDispatchEngine.getStats();
      expect(s.avgTotalLatencyMs).toBeGreaterThanOrEqual(10);
    });
  });

  describe("stats + snapshot", () => {
    it("avgCoordLatencyMs returns 0 when nothing has happened", () => {
      const s = wedmMultiAgentDispatchEngine.getStats();
      expect(s.avgCoordLatencyMs).toBe(0);
      expect(s.avgTotalLatencyMs).toBe(0);
    });

    it("snapshot returns nested stats from all substrate engines", async () => {
      await wedmMultiAgentDispatchEngine.coordinateDispatch({
        dispatcher: "edm",
        action: "wire_settings",
      });
      const s = wedmMultiAgentDispatchEngine.snapshot();
      expect(s.dispatch.totalCoordinations).toBe(1);
      expect(s.blackboard).toBeDefined();
      expect(s.ledger).toBeDefined();
      expect(s.bridge).toBeDefined();
    });

    it("resetForTests clears all counters", async () => {
      await wedmMultiAgentDispatchEngine.coordinateDispatch({
        dispatcher: "edm",
        action: "wire_settings",
      });
      wedmMultiAgentDispatchEngine.resetForTests();
      const s = wedmMultiAgentDispatchEngine.getStats();
      expect(s.totalCoordinations).toBe(0);
      expect(s.totalOutcomes).toBe(0);
      expect(s.coordinationFailures).toBe(0);
    });

    it("handles multiple coordinations + outcomes end-to-end", async () => {
      for (let i = 0; i < 3; i++) {
        const r = await wedmMultiAgentDispatchEngine.coordinateDispatch({
          dispatcher: "edm",
          action: `action_${i}`,
        });
        wedmMultiAgentDispatchEngine.recordOutcome({
          dispatcher: "edm",
          action: `action_${i}`,
          keywords: r.keywords,
          entryAt: r.entryAt,
          success: true,
        });
      }
      const s = wedmMultiAgentDispatchEngine.getStats();
      expect(s.totalCoordinations).toBe(3);
      expect(s.totalOutcomes).toBe(3);
    });
  });
});
