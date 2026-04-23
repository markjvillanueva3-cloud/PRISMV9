/**
 * WorkholdingSelectionEngine Tests — MIO-MS0/U-MIO14
 */
import { describe, it, expect } from "vitest";
import { workholdingSelectionEngine } from "../engines/WorkholdingSelectionEngine.js";

describe("WorkholdingSelectionEngine", () => {
  describe("select", () => {
    it("recommends standard vise for simple prismatic prototype", () => {
      const result = workholdingSelectionEngine.select({
        part_geometry: "prismatic",
        part_dimensions_mm: { length: 100, width: 80, height: 40 },
        production_volume: "prototype",
      });

      expect(result.recommended).toBe("standard_vise");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("considers production volume in selection", () => {
      const lowVolume = workholdingSelectionEngine.select({
        part_geometry: "prismatic",
        part_dimensions_mm: { length: 100, width: 80, height: 40 },
        production_volume: "prototype",
      });

      const highVolume = workholdingSelectionEngine.select({
        part_geometry: "prismatic",
        part_dimensions_mm: { length: 100, width: 80, height: 40 },
        production_volume: "high",
      });

      expect(lowVolume.recommended).toBeDefined();
      expect(highVolume.recommended).toBeDefined();
      expect(highVolume.requires_custom_fixture || highVolume.custom_fixture_triggers.length > 0).toBe(true);
    });

    it("triggers custom fixture for complex datums", () => {
      const result = workholdingSelectionEngine.select({
        part_geometry: "complex",
        part_dimensions_mm: { length: 150, width: 120, height: 60 },
        production_volume: "medium",
        has_complex_datums: true,
        datum_count: 5,
      });

      expect(result.requires_custom_fixture).toBe(true);
      expect(result.custom_fixture_triggers.length).toBeGreaterThan(0);
    });

    it("recommends soft jaws for thin-wall parts", () => {
      const result = workholdingSelectionEngine.select({
        part_geometry: "thin_wall",
        part_dimensions_mm: { length: 80, width: 60, height: 30 },
        production_volume: "medium",
        wall_thickness_mm: 1.5,
      });

      expect(["soft_jaws", "vacuum"]).toContain(result.recommended);
    });

    it("recommends collet for cylindrical parts", () => {
      const result = workholdingSelectionEngine.select({
        part_geometry: "cylindrical",
        part_dimensions_mm: { length: 100, width: 25, height: 25 },
        production_volume: "low",
        tolerance_mm: 0.01,
      });

      expect(["collet", "3_jaw_chuck"]).toContain(result.recommended);
    });

    it("provides alternatives with scores", () => {
      const result = workholdingSelectionEngine.select({
        part_geometry: "prismatic",
        part_dimensions_mm: { length: 100, width: 80, height: 40 },
        production_volume: "medium",
      });

      expect(result.alternatives.length).toBeGreaterThanOrEqual(2);
      result.alternatives.forEach(alt => {
        expect(alt.score).toBeLessThanOrEqual(result.confidence);
        expect(alt.pros.length).toBeGreaterThan(0);
      });
    });

    it("provides setup time and cost estimates", () => {
      const result = workholdingSelectionEngine.select({
        part_geometry: "prismatic",
        part_dimensions_mm: { length: 100, width: 80, height: 40 },
        production_volume: "low",
      });

      expect(result.estimated_setup_time_min).toBeGreaterThan(0);
      expect(result.estimated_fixture_cost_usd).toBeGreaterThanOrEqual(0);
    });

    it("checks clamping force adequacy", () => {
      const lowForce = workholdingSelectionEngine.select({
        part_geometry: "prismatic",
        part_dimensions_mm: { length: 100, width: 80, height: 40 },
        production_volume: "low",
        cutting_force_n: 200,
      });

      expect(lowForce.clamping_force_adequate).toBe(true);

      const highForce = workholdingSelectionEngine.select({
        part_geometry: "thin_wall",
        part_dimensions_mm: { length: 100, width: 80, height: 40 },
        production_volume: "low",
        cutting_force_n: 1000,
      });

      // Vacuum may not be adequate for high forces
      if (highForce.recommended === "vacuum") {
        expect(highForce.clamping_force_adequate).toBe(false);
      }
    });

    it("provides justification for selection", () => {
      const result = workholdingSelectionEngine.select({
        part_geometry: "prismatic",
        part_dimensions_mm: { length: 100, width: 80, height: 40 },
        production_volume: "low",
      });

      expect(result.justification.length).toBeGreaterThan(0);
      expect(result.ai_reasoning.some(r => r.includes("[WORKHOLD]"))).toBe(true);
    });
  });

  describe("quickSelect", () => {
    it("returns type and confidence", () => {
      const result = workholdingSelectionEngine.quickSelect("prismatic", "low");

      expect(result.type).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});
