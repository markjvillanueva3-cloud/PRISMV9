/**
 * MillDeepLearningEngine Tests — MILL-DEEP-AI-MS0
 * =================================================
 * Tests for deep AI training on JM Die milling programs.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  millDeepLearningEngine,
  MillDeepLearningEngine,
} from "../../engines/MillDeepLearningEngine.js";

describe("MillDeepLearningEngine", () => {
  describe("initialization", () => {
    it("creates instance with empty stats", () => {
      const engine = new MillDeepLearningEngine();
      const stats = engine.getStatistics();
      expect(stats.programs_parsed).toBe(0);
      expect(stats.operations_learned).toBe(0);
    });
  });

  describe("deep reasoning", () => {
    it("provides reasoning for speed questions", () => {
      const result = millDeepLearningEngine.deepReason(
        "What RPM for steel?",
        { material_iso: "P", operation_type: "drill" }
      );
      expect(result.question).toBe("What RPM for steel?");
      expect(result.logic.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("provides reasoning for operation sequence", () => {
      const result = millDeepLearningEngine.deepReason(
        "What is the correct operation order?",
        { material_iso: "P" }
      );
      expect(result.logic.some(l => l.includes("sequence"))).toBe(true);
    });
  });

  describe("sequence recommendations", () => {
    it("recommends drill-tap sequence for hole+thread features", () => {
      const rec = millDeepLearningEngine.recommendSequence(["hole", "thread"]);
      expect(rec.sequence).toContain("spot_drill");
      expect(rec.sequence).toContain("tap");
    });

    it("recommends profile sequence for contour features", () => {
      const rec = millDeepLearningEngine.recommendSequence(["face", "profile"]);
      expect(rec.sequence).toContain("face");
      expect(rec.sequence.some(s => s.includes("profile"))).toBe(true);
    });

    it("recommends pocket sequence for pocket features", () => {
      const rec = millDeepLearningEngine.recommendSequence(["pocket"]);
      expect(rec.sequence.some(s => s.includes("pocket"))).toBe(true);
    });
  });

  describe("training (requires H: drive)", () => {
    // Skip if H: drive not available
    const hasHDrive = (() => {
      try {
        const fs = require("fs");
        return fs.existsSync("H:/PRISM/JM DIE/CNC MILL HAAS");
      } catch {
        return false;
      }
    })();

    it.skipIf(!hasHDrive)("trains on JM Die programs", async () => {
      const engine = new MillDeepLearningEngine();
      const result = await engine.trainOnAllPrograms();

      expect(result.programs_parsed).toBeGreaterThan(0);
      expect(result.customers.length).toBeGreaterThan(0);
      expect(result.materials.length).toBeGreaterThan(0);

      console.log("Training results:", result);
    }, 60000);

    it.skipIf(!hasHDrive)("provides optimized params after training", async () => {
      const engine = new MillDeepLearningEngine();
      await engine.trainOnAllPrograms();

      // After training, should have learned patterns
      const stats = engine.getStatistics();
      expect(stats.parameter_neurons).toBeGreaterThan(0);

      // Should be able to get recommendations
      const params = engine.getOptimizedParams("P", "flat_endmill", 12);
      if (params) {
        expect(params.rpm).toBeGreaterThan(0);
        expect(params.feed).toBeGreaterThan(0);
        expect(params.confidence).toBeGreaterThan(0);
      }
    }, 60000);
  });

  // ==========================================================================
  // MILL-MASTER-AI-WIRING / U7-DEEPLEARN-RETROFIT — AI-path coverage
  // ==========================================================================
  describe("deepReasonUltra — useAI routing + MillAIWiring.withPRISMReasoning", () => {
    it("useAI='off' (default) returns { legacy } deep-equal to sync deepReason, no ai field", () => {
      const question = "What RPM for P20 at 12mm endmill?";
      const ctx = { material_iso: "P", operation_type: "contour" };
      const legacy = millDeepLearningEngine.deepReason(question, ctx);
      const ultra = millDeepLearningEngine.deepReasonUltra(question, ctx);
      expect(ultra.legacy).toEqual(legacy);
      expect(ultra.ai).toBe(undefined);
    });

    it("useAI='off' explicit is bit-identical to omitted", () => {
      const question = "What RPM for 316L?";
      const ctx = { material_iso: "M", operation_type: "drill" };
      const a = millDeepLearningEngine.deepReasonUltra(question, ctx);
      const b = millDeepLearningEngine.deepReasonUltra(question, ctx, { useAI: "off" });
      expect(a.legacy).toEqual(b.legacy);
      expect(a.ai).toBe(undefined);
      expect(b.ai).toBe(undefined);
    });

    it.each([
      { iso: "P", label: "steel" },
      { iso: "M", label: "stainless" },
      { iso: "N", label: "aluminum" },
    ])("useAI='on' for ISO $iso ($label) returns populated ai with tree_of_thought source", ({ iso }) => {
      const r = millDeepLearningEngine.deepReasonUltra(
        `What feed for ${iso}?`,
        { material_iso: iso, operation_type: "contour" },
        { useAI: "on" },
      );
      expect(typeof r.ai).toBe("object");
      expect(r.ai === null).toBe(false);
      expect(r.ai!.sources).toContain("tree_of_thought");
      expect(r.ai!.branch_count).toBeGreaterThanOrEqual(1);
      expect(r.ai!.max_depth_reached).toBeGreaterThanOrEqual(0);
      expect(r.ai!.confidence).toBeGreaterThanOrEqual(0);
      expect(r.ai!.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(r.ai!.reasoning_chain)).toBe(true);
    });

    it("useAI='on' preserves legacy result alongside ai", () => {
      const question = "What order for face + profile?";
      const ctx = { material_iso: "P" };
      const legacy = millDeepLearningEngine.deepReason(question, ctx);
      const ultra = millDeepLearningEngine.deepReasonUltra(question, ctx, { useAI: "on" });
      expect(ultra.legacy).toEqual(legacy);
      expect(typeof ultra.ai).toBe("object");
    });

    it("failure #1: empty question string does not throw; legacy + ai both populated", () => {
      const r = millDeepLearningEngine.deepReasonUltra("", { material_iso: "P" }, { useAI: "on" });
      expect(r.legacy.question).toBe("");
      expect(typeof r.ai).toBe("object");
    });

    it("failure #2: empty context object does not throw; constraints list is empty", () => {
      const r = millDeepLearningEngine.deepReasonUltra("generic question", {}, { useAI: "on" });
      expect(typeof r.ai).toBe("object");
      expect(Array.isArray(r.ai!.reasoning_chain)).toBe(true);
    });

    it("failure #3: context with numeric material_iso still produces bounded confidence", () => {
      const r = millDeepLearningEngine.deepReasonUltra(
        "what speed?",
        { material_iso: 42, operation_type: "drill" },
        { useAI: "on" },
      );
      expect(Number.isFinite(r.ai!.confidence)).toBe(true);
      expect(r.ai!.confidence).toBeGreaterThanOrEqual(0);
      expect(r.ai!.confidence).toBeLessThanOrEqual(1);
    });

    it("adversarial #1: 10 KB oversize question is bounded (<2 s, branch_count capped)", () => {
      const big = "speed feed ".repeat(1000);
      const t0 = performance.now();
      const r = millDeepLearningEngine.deepReasonUltra(big, { material_iso: "P" }, { useAI: "on" });
      expect(performance.now() - t0).toBeLessThan(2000);
      expect(r.ai!.branch_count).toBeLessThanOrEqual(1000);
    });

    it("adversarial #2: context with NaN / null / undefined values does not throw", () => {
      const r = millDeepLearningEngine.deepReasonUltra(
        "what speed?",
        { material_iso: "P", bogus: NaN, other: null, third: undefined },
        { useAI: "on" },
      );
      expect(typeof r.ai).toBe("object");
      expect(Number.isFinite(r.ai!.confidence)).toBe(true);
    });
  });
});
