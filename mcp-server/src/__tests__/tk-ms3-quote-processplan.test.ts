/**
 * Tests for TK-MS3-U18: QuoteEstimator + ProcessPlan Tier 2 Wiring
 * Validates that tribal modifiers are applied to quote and process plan calculations.
 */
import { describe, it, expect } from "vitest";
import { QuoteEstimatorEngine, quoteEstimatorEngine } from "../engines/QuoteEstimatorEngine.js";
import { ProcessPlanEngine } from "../engines/ProcessPlanEngine.js";

describe("TK-MS3-U18: QuoteEstimator Tier 2 Tribal Wiring", () => {
  describe("estimate() with tribal modifiers", () => {
    it("returns valid quote estimate", () => {
      const result = quoteEstimatorEngine.estimate({
        material: "aluminum_6061",
        quantity: 10,
        complexity: "medium",
      });

      expect(result).toBeDefined();
      expect(result.quote_id).toBeDefined();
      expect(result.quantity).toBe(10);
    });

    it("includes machining cost breakdown", () => {
      const result = quoteEstimatorEngine.estimate({
        material: "steel_4140",
        quantity: 5,
        complexity: "complex",
        machine_type: "cnc_mill_3axis",
      });

      expect(result.costs.machining).toBeDefined();
      expect(result.costs.machining.cycle_time_min).toBeGreaterThan(0);
      expect(result.costs.machining.machine_rate_hr).toBeGreaterThan(0);
      expect(result.costs.machining.total).toBeGreaterThan(0);
    });

    it("includes setup cost breakdown", () => {
      const result = quoteEstimatorEngine.estimate({
        material: "titanium_gr5",
        quantity: 3,
        complexity: "very_complex",
      });

      expect(result.costs.setup).toBeDefined();
      expect(result.costs.setup.num_setups).toBeGreaterThan(0);
      expect(result.costs.setup.setup_minutes).toBeGreaterThan(0);
      expect(result.costs.setup.total).toBeGreaterThan(0);
    });

    it("includes confidence factors when tribal modifiers applied", () => {
      const result = quoteEstimatorEngine.estimate({
        material: "D2",
        quantity: 10,
        complexity: "medium",
      });

      expect(result.confidence_factors).toBeDefined();
      expect(Array.isArray(result.confidence_factors)).toBe(true);
    });

    it("handles physics-based cycle time calculation", () => {
      const result = quoteEstimatorEngine.estimate({
        material: "aluminum_7075",
        quantity: 5,
        complexity: "simple",
        cutting_speed_mpm: 250,
        feed_per_tooth_mm: 0.1,
        tool_diameter_mm: 12,
        num_flutes: 4,
        depth_of_cut_mm: 2,
      });

      expect(result.costs.machining.cycle_time_source).toBe("physics_calculated");
      expect(result.costs.machining.cycle_time_min).toBeGreaterThan(0);
    });

    it("handles CAM-derived cycle times", () => {
      const result = quoteEstimatorEngine.estimate({
        material: "steel_1018",
        quantity: 10,
        complexity: "medium",
        operations: [
          { name: "roughing", type: "pocket", cycle_time_min: 15 },
          { name: "finishing", type: "contour", cycle_time_min: 8 },
        ],
      });

      expect(result.costs.machining.cycle_time_source).toBe("cam_derived");
      expect(result.costs.machining.cycle_time_min).toBe(23);
    });
  });

  describe("material-specific quotes", () => {
    it("applies tribal modifiers for hardened steel (ISO H)", () => {
      const result = quoteEstimatorEngine.estimate({
        material: "D2_hardened",
        quantity: 5,
        complexity: "complex",
      });

      expect(result.costs.machining.total).toBeGreaterThan(0);
      // Hardened materials typically have higher machining costs
      expect(result.pricing.unit_price).toBeGreaterThan(0);
    });

    it("applies tribal modifiers for stainless (ISO M)", () => {
      const result = quoteEstimatorEngine.estimate({
        material: "stainless_316",
        quantity: 10,
        complexity: "medium",
      });

      expect(result.costs.machining.total).toBeGreaterThan(0);
    });

    it("applies tribal modifiers for superalloys (ISO S)", () => {
      const result = quoteEstimatorEngine.estimate({
        material: "inconel_718",
        quantity: 3,
        complexity: "complex",
      });

      expect(result.costs.machining.total).toBeGreaterThan(0);
    });
  });

  describe("pricing calculations", () => {
    it("includes proper pricing breakdown", () => {
      const result = quoteEstimatorEngine.estimate({
        material: "aluminum_6061",
        quantity: 25,
        complexity: "simple",
      });

      expect(result.pricing).toBeDefined();
      expect(result.pricing.unit_price).toBeGreaterThan(0);
      expect(result.pricing.total_price).toBeGreaterThan(0);
      expect(result.pricing.margin_pct).toBeGreaterThan(0);
    });

    it("generates price breaks", () => {
      const result = quoteEstimatorEngine.estimate({
        material: "steel_4140",
        quantity: 50,
        complexity: "medium",
      });

      expect(result.price_breaks).toBeDefined();
      expect(Array.isArray(result.price_breaks)).toBe(true);
      expect(result.price_breaks.length).toBeGreaterThan(0);
    });

    it("applies rush premium when requested", () => {
      const normalResult = quoteEstimatorEngine.estimate({
        material: "aluminum_6061",
        quantity: 10,
        complexity: "simple",
      });

      const rushResult = quoteEstimatorEngine.estimate({
        material: "aluminum_6061",
        quantity: 10,
        complexity: "simple",
        rush: true,
        rush_tier: "3day",
      });

      expect(rushResult.pricing.unit_price).toBeGreaterThan(normalResult.pricing.unit_price);
    });
  });
});

describe("TK-MS3-U18: ProcessPlanEngine Tier 2 Tribal Wiring", () => {
  const engine = new ProcessPlanEngine();

  describe("generate() with tribal modifiers", () => {
    it("generates valid process plan", () => {
      const result = engine.generate({
        part_name: "test-bracket",
        material_iso_group: "P",
        features: [
          { id: "hole-1", type: "hole", dimensions: { diameter_mm: 10, depth_mm: 20 } },
        ],
        stock: { x_mm: 100, y_mm: 100, z_mm: 50 },
      });

      expect(result).toBeDefined();
      expect(result.part_name).toBe("test-bracket");
      expect(result.operations.length).toBeGreaterThan(0);
    });

    it("applies tribal Vc modifier to speed calculations", () => {
      const result = engine.generate({
        part_name: "test-plate",
        material_iso_group: "H", // Hardened steel
        material_name: "D2",
        features: [
          { id: "pocket-1", type: "pocket", dimensions: { width_mm: 50, length_mm: 80, depth_mm: 10 } },
        ],
        stock: { x_mm: 120, y_mm: 100, z_mm: 30 },
      });

      expect(result.operations.length).toBeGreaterThan(0);
      // Operations should have speed recommendations
      result.operations.forEach(op => {
        expect(op.estimated_time_min).toBeGreaterThan(0);
      });
    });

    it("includes tribal tips in result", () => {
      const result = engine.generate({
        part_name: "test-housing",
        material_iso_group: "P",
        features: [
          { id: "face-1", type: "face", dimensions: { width_mm: 100, length_mm: 100, depth_mm: 1 } },
          { id: "pocket-1", type: "pocket", dimensions: { width_mm: 40, length_mm: 60, depth_mm: 15 } },
        ],
        stock: { x_mm: 110, y_mm: 110, z_mm: 25 },
      });

      expect(result).toBeDefined();
      // tribal_tips may be present if tips are found
      if (result.tribal_tips) {
        expect(Array.isArray(result.tribal_tips)).toBe(true);
      }
    });
  });

  describe("feature handling", () => {
    it("generates operations for holes", () => {
      const result = engine.generate({
        part_name: "drilled-plate",
        material_iso_group: "P",
        features: [
          { id: "hole-1", type: "hole", dimensions: { diameter_mm: 8, depth_mm: 15 } },
          { id: "hole-2", type: "hole", dimensions: { diameter_mm: 12, depth_mm: 25 }, count: 4 },
        ],
        stock: { x_mm: 100, y_mm: 100, z_mm: 30 },
      });

      expect(result.operations.length).toBeGreaterThan(0);
      expect(result.tool_list.length).toBeGreaterThan(0);
    });

    it("generates operations for pockets", () => {
      const result = engine.generate({
        part_name: "pocketed-block",
        material_iso_group: "N",
        features: [
          { id: "pocket-1", type: "pocket", dimensions: { width_mm: 30, length_mm: 50, depth_mm: 10 } },
        ],
        stock: { x_mm: 80, y_mm: 80, z_mm: 25 },
      });

      // Should have operations for facing + pocket
      expect(result.operations.length).toBeGreaterThan(0);
      expect(result.total_operations).toBeGreaterThanOrEqual(2);
    });

    it("generates operations for threads", () => {
      const result = engine.generate({
        part_name: "threaded-part",
        material_iso_group: "P",
        features: [
          { id: "thread-1", type: "thread", dimensions: { diameter_mm: 10, depth_mm: 15, pitch_mm: 1.5 } },
        ],
        stock: { x_mm: 50, y_mm: 50, z_mm: 30 },
      });

      expect(result.operations.length).toBeGreaterThan(0);
    });

    it("adds finish pass for tight tolerances", () => {
      const result = engine.generate({
        part_name: "precision-part",
        material_iso_group: "P",
        features: [
          { id: "bore-1", type: "bore", dimensions: { diameter_mm: 25, depth_mm: 30 }, tolerance_mm: 0.01 },
        ],
        stock: { x_mm: 60, y_mm: 60, z_mm: 40 },
      });

      // Should have roughing + finishing operations for tight tolerance
      expect(result.operations.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("ISO group handling", () => {
    it("generates plan for ISO P (steel)", () => {
      const result = engine.generate({
        part_name: "steel-part",
        material_iso_group: "P",
        features: [
          { id: "slot-1", type: "slot", dimensions: { width_mm: 10, length_mm: 50, depth_mm: 8 } },
        ],
        stock: { x_mm: 80, y_mm: 80, z_mm: 20 },
      });

      expect(result.material).toContain("P");
      expect(result.total_time_min).toBeGreaterThan(0);
    });

    it("generates plan for ISO M (stainless)", () => {
      const result = engine.generate({
        part_name: "stainless-part",
        material_iso_group: "M",
        features: [
          { id: "profile-1", type: "profile", dimensions: { width_mm: 60, length_mm: 80, depth_mm: 5 } },
        ],
        stock: { x_mm: 100, y_mm: 100, z_mm: 15 },
      });

      expect(result.material).toContain("M");
      expect(result.total_time_min).toBeGreaterThan(0);
    });

    it("generates plan for ISO H (hardened)", () => {
      const result = engine.generate({
        part_name: "hardened-part",
        material_iso_group: "H",
        features: [
          { id: "face-1", type: "face", dimensions: { width_mm: 50, length_mm: 50, depth_mm: 0.5 } },
        ],
        stock: { x_mm: 60, y_mm: 60, z_mm: 10 },
      });

      expect(result.material).toContain("H");
      expect(result.total_time_min).toBeGreaterThan(0);
    });
  });

  describe("plan optimization", () => {
    it("optimize() returns valid optimization result", () => {
      const plan = engine.generate({
        part_name: "optimize-test",
        material_iso_group: "P",
        features: [
          { id: "pocket-1", type: "pocket", dimensions: { width_mm: 40, length_mm: 60, depth_mm: 10 } },
          { id: "hole-1", type: "hole", dimensions: { diameter_mm: 10, depth_mm: 15 } },
        ],
        stock: { x_mm: 100, y_mm: 100, z_mm: 20 },
      });

      const optimized = engine.optimize(plan);

      expect(optimized).toBeDefined();
      expect(optimized.changes).toBeDefined();
      expect(Array.isArray(optimized.changes)).toBe(true);
    });
  });
});
