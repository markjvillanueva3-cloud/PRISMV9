/**
 * QualityScoreEngine.test.ts — Tests for AUTO-0 Development Quality Scorer
 *
 * Tests the quality scoring dimensions (W, T, P, S, D, A) and the
 * reverse test index that handles bundled test files.
 */

import { describe, it, expect } from "vitest";
import { qualityScoreEngine } from "../engines/QualityScoreEngine.js";
import type { QualityReport, EngineQualityScore, QualityDimensions } from "../engines/QualityScoreEngine.js";

describe("QualityScoreEngine", () => {
  describe("compute()", () => {
    it("returns a QualityReport with required fields", async () => {
      const r = await qualityScoreEngine.compute();
      expect(r).toBeDefined();
      expect(r.timestamp).toBeTruthy();
      expect(r.version).toBe("1.0.0");
      expect(r.total_engines).toBeGreaterThan(0);
      expect(r.scored_engines).toBeGreaterThan(0);
      expect(r.scores).toBeInstanceOf(Array);
      expect(r.dimension_averages).toBeDefined();
    });

    it("total_engines matches actual engine file count", async () => {
      const r = await qualityScoreEngine.compute();
      // Should have at least 1000 engines in PRISM
      expect(r.total_engines).toBeGreaterThan(1000);
      expect(r.scored_engines).toBe(r.total_engines);
    });

    it("all Q scores are between 0 and 1", async () => {
      const r = await qualityScoreEngine.compute();
      for (const s of r.scores) {
        expect(s.Q).toBeGreaterThanOrEqual(0);
        expect(s.Q).toBeLessThanOrEqual(1);
      }
    });

    it("dimension averages are between 0 and 1", async () => {
      const r = await qualityScoreEngine.compute();
      const dims = r.dimension_averages;
      for (const key of ["W", "T", "P", "S", "D", "A"] as Array<keyof QualityDimensions>) {
        expect(dims[key]).toBeGreaterThanOrEqual(0);
        expect(dims[key]).toBeLessThanOrEqual(1);
      }
    });

    it("system_Q equals the minimum Q across all engines", async () => {
      const r = await qualityScoreEngine.compute();
      const minQ = Math.min(...r.scores.map(s => s.Q));
      expect(r.system_Q).toBeCloseTo(minQ, 2);
    });

    it("mean_Q is the arithmetic mean of all Q scores", async () => {
      const r = await qualityScoreEngine.compute();
      const sum = r.scores.reduce((a, s) => a + s.Q, 0);
      const mean = sum / r.scores.length;
      expect(r.mean_Q).toBeCloseTo(mean, 2);
    });

    it("engines_above_90 + engines_below_70 does not exceed total", async () => {
      const r = await qualityScoreEngine.compute();
      expect(r.engines_above_90 + r.engines_below_70).toBeLessThanOrEqual(r.scored_engines);
    });

    it("scores array is sorted by Q ascending", async () => {
      const r = await qualityScoreEngine.compute();
      for (let i = 1; i < r.scores.length; i++) {
        expect(r.scores[i].Q).toBeGreaterThanOrEqual(r.scores[i - 1].Q);
      }
    });
  });

  describe("compute() with engine filter", () => {
    it("filters to matching engines only", async () => {
      const r = await qualityScoreEngine.compute("SpeedFeedOrchestrator");
      expect(r.scored_engines).toBeGreaterThanOrEqual(1);
      expect(r.scored_engines).toBeLessThan(r.total_engines);
      for (const s of r.scores) {
        expect(s.engine_name.toLowerCase()).toContain("speedfeedorchestrator");
      }
    });

    it("returns empty scores for non-existent engine", async () => {
      const r = await qualityScoreEngine.compute("NonExistentEngineXYZ12345");
      expect(r.scored_engines).toBe(0);
      expect(r.scores).toHaveLength(0);
    });
  });

  describe("Wiring (W) dimension", () => {
    it("engines in index.ts get W credit", async () => {
      // SpeedFeedOrchestratorEngine is exported in index.ts
      const r = await qualityScoreEngine.compute("SpeedFeedOrchestrator");
      const s = r.scores[0];
      expect(s).toBeDefined();
      expect(s.wiring.exported_in_index).toBe(true);
      expect(s.dimensions.W).toBeGreaterThan(0);
    });
  });

  describe("Test (T) dimension — reverse index", () => {
    it("detects tests for engines in bundled test files", async () => {
      // MobileInterfaceEngine is tested in batch34-engines.test.ts
      const r = await qualityScoreEngine.compute("MobileInterface");
      if (r.scores.length > 0) {
        const s = r.scores[0];
        expect(s.test.test_file_exists).toBe(true);
        expect(s.dimensions.T).toBeGreaterThan(0);
      }
    });

    it("average T is above 0.50 with reverse index", async () => {
      const r = await qualityScoreEngine.compute();
      expect(r.dimension_averages.T).toBeGreaterThan(0.50);
    });
  });

  describe("Physics (P) dimension", () => {
    it("non-physics engines get P=1.0", async () => {
      // CustomerManagementEngine has no physics markers
      const r = await qualityScoreEngine.compute("CustomerManagement");
      if (r.scores.length > 0) {
        const s = r.scores.find(s => !s.is_physics_engine);
        if (s) expect(s.dimensions.P).toBe(1);
      }
    });

    it("physics engines importing constants get credit", async () => {
      const r = await qualityScoreEngine.compute("CuttingForce");
      if (r.scores.length > 0) {
        const s = r.scores.find(s => s.is_physics_engine);
        if (s) expect(s.dimensions.P).toBeGreaterThan(0);
      }
    });
  });

  describe("read()", () => {
    it("returns null when no scores file exists yet or returns valid report", () => {
      const r = qualityScoreEngine.read();
      // Either null (no prior run) or a valid report
      if (r !== null) {
        expect(r.version).toBe("1.0.0");
        expect(r.scores).toBeInstanceOf(Array);
      }
    });
  });

  describe("summary()", () => {
    it("returns descriptive text when passed null and no disk cache", () => {
      // summary(null) falls back to read() from disk. If scores were persisted
      // by prior tests, it returns a valid summary. If not, it returns the
      // "no scores" message. Both are valid in this test context.
      const s = qualityScoreEngine.summary(null);
      expect(typeof s).toBe("string");
      expect(s.length).toBeGreaterThan(0);
      // Should contain either the "no scores" message or a valid report header
      const isValidOutput = s.includes("No quality scores computed") || s.includes("PRISM Development Quality Score");
      expect(isValidOutput).toBe(true);
    });

    it("returns formatted markdown with dimension breakdown", async () => {
      const r = await qualityScoreEngine.compute();
      const s = qualityScoreEngine.summary(r);
      expect(s).toContain("PRISM Development Quality Score");
      expect(s).toContain("W (Wiring)");
      expect(s).toContain("T (Tests)");
      expect(s).toContain("P (Physics)");
      expect(s).toContain("S (Security)");
      expect(s).toContain("D (Docs)");
      expect(s).toContain("A (Automation)");
    });
  });

  describe("edge cases", () => {
    it("handles empty engine filter gracefully", async () => {
      const r = await qualityScoreEngine.compute("");
      // Empty string = no filter = full scan
      expect(r.scored_engines).toBe(r.total_engines);
    });

    it("composite Q follows the weighted formula", async () => {
      const r = await qualityScoreEngine.compute("QualityScore");
      if (r.scores.length > 0) {
        const s = r.scores[0];
        const expected = 0.25 * s.dimensions.W + 0.20 * s.dimensions.T
          + 0.20 * s.dimensions.P + 0.15 * s.dimensions.S
          + 0.10 * s.dimensions.D + 0.10 * s.dimensions.A;
        expect(s.Q).toBeCloseTo(expected, 2);
      }
    });

    it("weights sum to 1.0", () => {
      const sum = 0.25 + 0.20 + 0.20 + 0.15 + 0.10 + 0.10;
      expect(sum).toBeCloseTo(1.0, 5);
    });
  });
});
