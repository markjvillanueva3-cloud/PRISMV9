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
});
