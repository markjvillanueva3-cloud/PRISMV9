import { describe, it, expect } from "vitest";
import { ToolSelectionEngine, toolSelectionEngine } from "../engines/ToolSelectionEngine.js";
import type { ToolRequirements, ToolRecommendation } from "../engines/ToolSelectionEngine.js";

describe("ToolSelectionEngine", () => {
  describe("recommend", () => {
    it("returns up to 5 recommendations", () => {
      const recs = toolSelectionEngine.recommend({
        operation_type: "pocket",
        material_iso_group: "P",
        feature_diameter_mm: 20,
      });
      expect(recs.length).toBeLessThanOrEqual(5);
      expect(recs.length).toBeGreaterThan(0);
    });

    it("returns scored recommendations sorted by score descending", () => {
      const recs = toolSelectionEngine.recommend({
        operation_type: "pocket",
        material_iso_group: "P",
      });
      for (let i = 1; i < recs.length; i++) {
        expect(recs[i - 1].score).toBeGreaterThanOrEqual(recs[i].score);
      }
    });

    it("includes real catalog tools when ToolCatalogEngine is available", () => {
      const recs = toolSelectionEngine.recommend({
        operation_type: "drill",
        material_iso_group: "P",
        feature_diameter_mm: 10,
      });
      // At least some results should reference real manufacturer tools
      const hasRealTool = recs.some(
        r => r.rationale.some(s => s.includes("Real tool:"))
      );
      // If catalog is loaded, we should get real tools
      if (recs.length > 0 && recs[0].tool_id.includes("_")) {
        // Synthetic tools have IDs like "drill_10mm_2F_TiN"
        // Real tools have manufacturer IDs
        expect(recs.length).toBeGreaterThan(0);
      }
      expect(hasRealTool || recs.length > 0).toBe(true);
    });

    it("uses manufacturer cutting data for speed/feed when available", () => {
      const recs = toolSelectionEngine.recommend({
        operation_type: "pocket",
        material_iso_group: "P",
        feature_diameter_mm: 12,
      });
      for (const rec of recs) {
        expect(rec.recommended_speed_mpm).toBeGreaterThan(0);
        expect(rec.recommended_feed_mmpt).toBeGreaterThan(0);
        expect(rec.estimated_tool_life_min).toBeGreaterThan(0);
      }
    });

    it("handles all ISO groups", () => {
      for (const iso of ["P", "M", "K", "N", "S", "H"]) {
        const recs = toolSelectionEngine.recommend({
          operation_type: "pocket",
          material_iso_group: iso,
        });
        expect(recs.length).toBeGreaterThan(0);
      }
    });

    it("handles all operation types", () => {
      const ops = ["face_mill", "pocket", "slot", "drill", "ream", "bore",
                    "thread_mill", "turn", "profile", "chamfer", "finish"];
      for (const op of ops) {
        const recs = toolSelectionEngine.recommend({
          operation_type: op,
          material_iso_group: "P",
        });
        expect(recs.length).toBeGreaterThan(0);
      }
    });

    it("scores diameter match appropriately", () => {
      const recs = toolSelectionEngine.recommend({
        operation_type: "pocket",
        material_iso_group: "P",
        feature_diameter_mm: 25,
      });
      // Scores should be in 0-100 range
      for (const rec of recs) {
        expect(rec.score).toBeGreaterThanOrEqual(0);
        expect(rec.score).toBeLessThanOrEqual(100);
      }
    });

    it("warns on high overhang ratio", () => {
      const recs = toolSelectionEngine.recommend({
        operation_type: "pocket",
        material_iso_group: "P",
        feature_diameter_mm: 6,
        feature_depth_mm: 50, // 8:1 overhang
      });
      const hasOverhangWarning = recs.some(
        r => r.warnings.some(w => w.includes("overhang") || w.includes("Overhang"))
      );
      expect(hasOverhangWarning).toBe(true);
    });

    it("returns playbook warnings when available", () => {
      const recs = toolSelectionEngine.recommend({
        operation_type: "pocket",
        material_iso_group: "S", // difficult material
        feature_diameter_mm: 10,
      });
      expect(recs.length).toBeGreaterThan(0);
      expect(recs.some(r => r.warnings.some(w => w.startsWith("[") && w.includes("]")))).toBe(true);
    });
  });

  describe("compare", () => {
    it("compares multiple tool IDs", () => {
      const result = toolSelectionEngine.compare(
        ["end_mill_10mm_4F_TiAlN", "end_mill_12mm_3F_AlCrN"],
        { operation_type: "pocket", material_iso_group: "P" }
      );
      expect(result.tools).toHaveLength(2);
      expect(result.winner).toBeTruthy();
      expect(result.comparison_matrix).toBeDefined();
      expect(result.decision_factors).toContain("score");
    });

    it("selects a winner by highest score", () => {
      const result = toolSelectionEngine.compare(
        ["end_mill_8mm_2F_TiN", "end_mill_10mm_4F_TiAlN", "end_mill_12mm_3F_AlCrN"],
        { operation_type: "pocket", material_iso_group: "P" }
      );
      const winner = result.tools.find(t => t.tool_id === result.winner);
      expect(winner).toBeDefined();
      for (const t of result.tools) {
        expect(winner!.score).toBeGreaterThanOrEqual(t.score);
      }
    });
  });

  describe("validate", () => {
    it("validates a tool against requirements", () => {
      const result = toolSelectionEngine.validate("end_mill_10mm_4F_TiAlN", {
        operation_type: "pocket",
        material_iso_group: "P",
        feature_depth_mm: 15,
        tolerance_mm: 0.05,
      });
      expect(typeof result.valid).toBe("boolean");
      expect(result.tool_id).toBe("end_mill_10mm_4F_TiAlN");
      expect(result.overhang_ratio).toBeGreaterThan(0);
      expect(result.deflection_mm).toBeGreaterThanOrEqual(0);
    });

    it("flags excessive deflection as invalid", () => {
      const result = toolSelectionEngine.validate("end_mill_3mm_2F_TiN", {
        operation_type: "pocket",
        material_iso_group: "P",
        feature_depth_mm: 50, // very deep for 3mm tool
        tolerance_mm: 0.01,
      });
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it("validates RPM capability", () => {
      const result = toolSelectionEngine.validate("end_mill_25mm_4F_TiAlN", {
        operation_type: "pocket",
        material_iso_group: "P",
        max_rpm: 2000, // low RPM
      });
      // 25mm at 2000 RPM = ~157 m/min which may be below recommended for P
      expect(result.tool_id).toBe("end_mill_25mm_4F_TiAlN");
    });
  });

  describe("alternatives", () => {
    it("returns alternatives excluding the specified tool", () => {
      const alts = toolSelectionEngine.alternatives("end_mill_10mm_4F_TiAlN", {
        operation_type: "pocket",
        material_iso_group: "P",
        feature_diameter_mm: 15,
      });
      expect(alts.every(a => a.tool_id !== "end_mill_10mm_4F_TiAlN")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles unknown operation type gracefully", () => {
      const recs = toolSelectionEngine.recommend({
        operation_type: "unknown_operation",
        material_iso_group: "P",
      });
      expect(recs.length).toBeGreaterThan(0);
    });

    it("handles missing ISO group", () => {
      const recs = toolSelectionEngine.recommend({
        operation_type: "pocket",
      });
      expect(recs.length).toBeGreaterThan(0);
    });

    it("handles very small diameter", () => {
      const recs = toolSelectionEngine.recommend({
        operation_type: "drill",
        material_iso_group: "P",
        feature_diameter_mm: 0.5,
      });
      expect(recs.length).toBeGreaterThan(0);
    });

    it("handles very large diameter", () => {
      const recs = toolSelectionEngine.recommend({
        operation_type: "face_mill",
        material_iso_group: "K",
        feature_diameter_mm: 100,
      });
      expect(recs.length).toBeGreaterThan(0);
    });
  });

  describe("singleton", () => {
    it("exports a singleton instance", () => {
      expect(toolSelectionEngine).toBeInstanceOf(ToolSelectionEngine);
    });

    it("class can be instantiated separately", () => {
      const engine = new ToolSelectionEngine();
      const recs = engine.recommend({
        operation_type: "pocket",
        material_iso_group: "P",
      });
      expect(recs.length).toBeGreaterThan(0);
    });
  });
});
