/**
 * WEDMReasoningBridgeEngine tests — MS-P0.5-COORD U-P0.5-COORD-04
 */
import { describe, it, expect, beforeEach } from "vitest";
import { wedmReasoningBridgeEngine } from "../engines/WEDMReasoningBridgeEngine.js";
import { wedmBlackboardEngine } from "../engines/WEDMBlackboardEngine.js";
import { wedmReasoningTraceLedgerEngine } from "../engines/WEDMReasoningTraceLedgerEngine.js";

describe("WEDMReasoningBridgeEngine", () => {
  beforeEach(() => {
    wedmReasoningBridgeEngine.resetForTests();
    wedmBlackboardEngine.resetForTests();
    wedmReasoningTraceLedgerEngine.resetForTests();
  });

  describe("enrichContext", () => {
    it("derives namespace from dispatcher + action + material", () => {
      const ctx = wedmReasoningBridgeEngine.enrichContext({
        dispatcher: "edm",
        action: "wire_settings",
        keywords: ["wire"],
        params: { material: "D2" },
      });
      expect(ctx.namespace).toBe("wedm.edm.mat.d2.wire_settings");
    });

    it("derives namespace without material", () => {
      const ctx = wedmReasoningBridgeEngine.enrichContext({
        dispatcher: "edm",
        action: "electrode_design",
        keywords: [],
      });
      expect(ctx.namespace).toBe("wedm.edm.electrode_design");
    });

    it("reads prior observations from blackboard", () => {
      wedmBlackboardEngine.post(
        "wedm.edm.mat.d2.wire_settings",
        "prior_run",
        { feed: 5.0 },
        "observation",
        "history",
      );
      const ctx = wedmReasoningBridgeEngine.enrichContext({
        dispatcher: "edm",
        action: "wire_settings",
        keywords: [],
        params: { material: "D2" },
      });
      expect(ctx.priorObservations.length).toBe(1);
      expect(ctx.priorObservations[0].key).toBe("prior_run");
    });

    it("separates observations, decisions, and warnings", () => {
      const ns = "wedm.edm.mat.d2.action1";
      wedmBlackboardEngine.post(ns, "obs1", 1, "observation", "s");
      wedmBlackboardEngine.post(ns, "dec1", 2, "decision", "s");
      wedmBlackboardEngine.post(ns, "warn1", 3, "warning", "s");
      const ctx = wedmReasoningBridgeEngine.enrichContext({
        dispatcher: "edm",
        action: "action1",
        keywords: [],
        params: { material: "D2" },
      });
      expect(ctx.priorObservations.length).toBe(1);
      expect(ctx.priorDecisions.length).toBe(1);
      expect(ctx.priorWarnings.length).toBe(1);
    });

    it("posts awareness tips as blackboard observations", () => {
      wedmReasoningBridgeEngine.enrichContext({
        dispatcher: "edm",
        action: "wire_settings",
        keywords: [],
        params: { material: "D2" },
        awarenessTips: [
          { id: "tip1", text: "use brass wire for thin parts", confidence: 0.9, source: "tribal" },
          { text: "reduce offtime", confidence: 0.7 },
        ],
      });
      const posted = wedmBlackboardEngine.readAllInNamespace(
        "wedm.edm.mat.d2.wire_settings",
        "observation",
      );
      expect(posted.length).toBe(2);
      expect(posted.map((e) => e.value)).toContain("use brass wire for thin parts");
    });

    it("tracks tipCount in output", () => {
      const ctx = wedmReasoningBridgeEngine.enrichContext({
        dispatcher: "edm",
        action: "a",
        keywords: [],
        awarenessTips: [{ text: "a" }, { text: "b" }, { text: "c" }],
      });
      expect(ctx.awarenessTipCount).toBe(3);
      expect(ctx.postedObservations).toBe(3);
    });

    it("records trace entry with awareness_used=true when tips present", () => {
      wedmReasoningBridgeEngine.enrichContext({
        dispatcher: "edm",
        action: "a",
        keywords: ["wedm"],
        awarenessTips: [{ text: "a tip" }],
      });
      const recent = wedmReasoningTraceLedgerEngine.getRecent(10);
      expect(recent.length).toBe(1);
      expect(recent[0].awareness_used).toBe(true);
    });

    it("records trace with awareness_used=false when no tips", () => {
      wedmReasoningBridgeEngine.enrichContext({
        dispatcher: "edm",
        action: "a",
        keywords: [],
      });
      const recent = wedmReasoningTraceLedgerEngine.getRecent(10);
      expect(recent[0].awareness_used).toBe(false);
    });

    it("returns bridgeLatencyMs", () => {
      const ctx = wedmReasoningBridgeEngine.enrichContext({
        dispatcher: "edm",
        action: "a",
        keywords: [],
      });
      expect(ctx.bridgeLatencyMs).toBeGreaterThanOrEqual(0);
      expect(ctx.bridgeLatencyMs).toBeLessThan(100);
    });
  });

  describe("postDecision", () => {
    it("writes a decision entry to the derived namespace", () => {
      wedmReasoningBridgeEngine.postDecision(
        "edm",
        "wire_settings",
        { material: "D2" },
        "final_feed",
        4.2,
        "edm-engine",
        0.95,
      );
      const ns = "wedm.edm.mat.d2.wire_settings";
      const dec = wedmBlackboardEngine.read(ns, "final_feed");
      expect(dec?.value).toBe(4.2);
      expect(dec?.tag).toBe("decision");
      expect(dec?.confidence).toBe(0.95);
    });
  });

  describe("postWarning", () => {
    it("writes a warning entry", () => {
      wedmReasoningBridgeEngine.postWarning(
        "edm",
        "wire_settings",
        undefined,
        "wire_bend",
        "risk of wire bend",
        "physics",
      );
      const ns = "wedm.edm.wire_settings";
      const w = wedmBlackboardEngine.read(ns, "wire_bend");
      expect(w?.tag).toBe("warning");
    });
  });

  describe("getStats", () => {
    it("returns zero stats on reset", () => {
      const s = wedmReasoningBridgeEngine.getStats();
      expect(s.totalBridges).toBe(0);
    });

    it("tracks running averages", () => {
      wedmReasoningBridgeEngine.enrichContext({
        dispatcher: "edm",
        action: "a",
        keywords: [],
        awarenessTips: [{ text: "1" }],
      });
      wedmReasoningBridgeEngine.enrichContext({
        dispatcher: "edm",
        action: "b",
        keywords: [],
        awarenessTips: [{ text: "2" }, { text: "3" }],
      });
      const s = wedmReasoningBridgeEngine.getStats();
      expect(s.totalBridges).toBe(2);
      expect(s.avgTipsIngested).toBe(1.5);
    });
  });
});
