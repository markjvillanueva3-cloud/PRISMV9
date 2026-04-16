/**
 * PPAGIBenchmarkEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPAGIBenchmarkEngine,
  ppAGIBenchmarkEngine,
} from "../engines/PPAGIBenchmarkEngine.js";

describe("PPAGIBenchmarkEngine", () => {
  it("exports singleton", () => {
    expect(ppAGIBenchmarkEngine).toBeInstanceOf(PPAGIBenchmarkEngine);
  });

  describe("runAll", () => {
    it("returns results for many cases", () => {
      const result = ppAGIBenchmarkEngine.runAll();
      expect(result.total_cases).toBeGreaterThan(5);
    });

    it("most cases pass", () => {
      const result = ppAGIBenchmarkEngine.runAll();
      expect(result.passed).toBeGreaterThan(0);
      expect(result.overall_score).toBeGreaterThan(0.5);
    });

    it("groups by category", () => {
      const result = ppAGIBenchmarkEngine.runAll();
      const cats = Object.keys(result.by_category);
      expect(cats).toContain("controller_inference");
      expect(cats).toContain("material_similarity");
      expect(cats).toContain("toolpath_classification");
      expect(cats).toContain("fusion_stability");
      expect(cats).toContain("embedding_consistency");
    });

    it("includes timestamp", () => {
      const result = ppAGIBenchmarkEngine.runAll();
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it("records latency per case", () => {
      const result = ppAGIBenchmarkEngine.runAll();
      for (const c of result.cases) {
        expect(c.latency_ms).toBeDefined();
        expect(c.latency_ms!).toBeGreaterThanOrEqual(0);
      }
    });

    it("avg latency is computed", () => {
      const result = ppAGIBenchmarkEngine.runAll();
      expect(result.avg_latency_ms).toBeGreaterThanOrEqual(0);
    });

    it("regressions listed for failures", () => {
      const result = ppAGIBenchmarkEngine.runAll();
      if (result.failed > 0) {
        expect(result.regressions.length).toBe(result.failed);
      }
    });
  });

  describe("runCategory", () => {
    it("filters to controller inference", () => {
      const result = ppAGIBenchmarkEngine.runCategory("controller_inference");
      expect(result.cases.every(c => c.category === "controller_inference")).toBe(true);
    });

    it("filters to material similarity", () => {
      const result = ppAGIBenchmarkEngine.runCategory("material_similarity");
      expect(result.cases.every(c => c.category === "material_similarity")).toBe(true);
    });

    it("filters to toolpath classification", () => {
      const result = ppAGIBenchmarkEngine.runCategory("toolpath_classification");
      expect(result.cases.every(c => c.category === "toolpath_classification")).toBe(true);
    });

    it("filters to fusion stability", () => {
      const result = ppAGIBenchmarkEngine.runCategory("fusion_stability");
      expect(result.cases.every(c => c.category === "fusion_stability")).toBe(true);
    });

    it("filters to embedding consistency", () => {
      const result = ppAGIBenchmarkEngine.runCategory("embedding_consistency");
      expect(result.cases.every(c => c.category === "embedding_consistency")).toBe(true);
    });
  });

  describe("quickCheck", () => {
    it("runs one case per category", () => {
      const result = ppAGIBenchmarkEngine.quickCheck();
      const categories = new Set(result.cases.map(c => c.category));
      // Should have one of each category (up to the number of categories)
      expect(categories.size).toBeGreaterThan(0);
      expect(categories.size).toBeLessThanOrEqual(5);
      expect(result.cases.length).toBe(categories.size);
    });

    it("completes quickly", () => {
      const start = Date.now();
      ppAGIBenchmarkEngine.quickCheck();
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000); // under 1 second
    });
  });

  describe("case correctness", () => {
    it("Fanuc inference benchmark passes", () => {
      const result = ppAGIBenchmarkEngine.runCategory("controller_inference");
      const fanucCase = result.cases.find(c => c.id === "ctrl_infer_fanuc_m98");
      expect(fanucCase?.passed).toBe(true);
    });

    it("Siemens inference benchmark passes", () => {
      const result = ppAGIBenchmarkEngine.runCategory("controller_inference");
      const siemensCase = result.cases.find(c => c.id === "ctrl_infer_siemens_cycle");
      expect(siemensCase?.passed).toBe(true);
    });

    it("Heidenhain inference benchmark passes", () => {
      const result = ppAGIBenchmarkEngine.runCategory("controller_inference");
      const heidCase = result.cases.find(c => c.id === "ctrl_infer_heidenhain_tool_call");
      expect(heidCase?.passed).toBe(true);
    });

    it("Material identity benchmark passes", () => {
      const result = ppAGIBenchmarkEngine.runCategory("material_similarity");
      const idCase = result.cases.find(c => c.id === "mat_sim_identity");
      expect(idCase?.passed).toBe(true);
    });

    it("Material symmetry benchmark passes", () => {
      const result = ppAGIBenchmarkEngine.runCategory("material_similarity");
      const symCase = result.cases.find(c => c.id === "mat_sim_symmetry");
      expect(symCase?.passed).toBe(true);
    });

    it("Fusion dimension benchmark passes", () => {
      const result = ppAGIBenchmarkEngine.runCategory("fusion_stability");
      const dimCase = result.cases.find(c => c.id === "fusion_dim_120");
      expect(dimCase?.passed).toBe(true);
    });

    it("Controller one-hot consistency benchmark passes", () => {
      const result = ppAGIBenchmarkEngine.runCategory("embedding_consistency");
      const oneHotCase = result.cases.find(c => c.id === "embed_one_hot_family_valid");
      expect(oneHotCase?.passed).toBe(true);
    });
  });

  describe("overall score", () => {
    it("is between 0 and 1", () => {
      const result = ppAGIBenchmarkEngine.runAll();
      expect(result.overall_score).toBeGreaterThanOrEqual(0);
      expect(result.overall_score).toBeLessThanOrEqual(1);
    });

    it("is high (>= 0.85) for a healthy system", () => {
      const result = ppAGIBenchmarkEngine.runAll();
      expect(result.overall_score).toBeGreaterThanOrEqual(0.85);
    });
  });
});
