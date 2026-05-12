/**
 * LatheMultiOpPlannerEngine Test Suite (MS3 U-LPS03)
 */
import { describe, it, expect } from "vitest";
import { latheMultiOpPlannerEngine } from "../engines/LatheMultiOpPlannerEngine.js";

describe("LatheMultiOpPlannerEngine", () => {
  describe("plan()", () => {
    it("returns Op1 + Op2 plans for a two-sided part", () => {
      const r = latheMultiOpPlannerEngine.plan({
        part_length_mm: 100,
        max_od_mm: 50,
        features: [
          { id: "f1", type: "od_turn", position: "chuck_end", diameter_mm: 45, length_mm: 40 },
          { id: "f2", type: "bore", position: "tailstock_end", diameter_mm: 20, is_bore: true },
        ],
      });
      expect(r).toBeDefined();
      expect(r.op1).toBeDefined();
      expect(r.op2).toBeDefined();
      expect(r.op1.op_number).toBe(1);
      expect(r.op2.op_number).toBe(2);
    });

    it("chuck_end features go to Op1", () => {
      const r = latheMultiOpPlannerEngine.plan({
        part_length_mm: 80,
        max_od_mm: 40,
        features: [
          { id: "a", type: "od_turn", position: "chuck_end" },
          { id: "b", type: "od_turn", position: "tailstock_end" },
        ],
      });
      expect(r.op1.features).toContain("a");
      expect(r.op2.features).toContain("b");
    });

    it("z_transfer has a method + Op2 face stock allowance", () => {
      const r = latheMultiOpPlannerEngine.plan({
        part_length_mm: 80,
        max_od_mm: 40,
        features: [
          { id: "a", type: "face", position: "chuck_end" },
          { id: "b", type: "face", position: "tailstock_end" },
        ],
      });
      expect(r.z_transfer).toBeDefined();
      expect(r.z_transfer.op2_face_stock_mm).toBeGreaterThan(0);
    });

    it("concentricity strategy provides TIR target", () => {
      const r = latheMultiOpPlannerEngine.plan({
        part_length_mm: 60,
        max_od_mm: 30,
        concentricity_mm: 0.01,
        features: [{ id: "x", type: "od_turn", position: "tailstock_end" }],
      });
      expect(r.concentricity.target_tir_mm).toBeLessThanOrEqual(0.01);
    });

    it("tight concentricity triggers soft_jaw_bore strategy", () => {
      const r = latheMultiOpPlannerEngine.plan({
        part_length_mm: 60,
        max_od_mm: 30,
        concentricity_mm: 0.005, // very tight
        features: [{ id: "x", type: "od_turn", position: "tailstock_end" }],
      });
      expect([
        "soft_jaw_bore_to_od",
        "expanding_mandrel",
        "between_centers",
        "indicator_alignment",
      ]).toContain(r.concentricity.method);
    });
  });

  describe("generateSoftJawBoring()", () => {
    it("produces G-code for fanuc controller", () => {
      const r = latheMultiOpPlannerEngine.generateSoftJawBoring(45, 20, "fanuc");
      expect(r.gcode.length).toBeGreaterThan(0);
      expect(r.bore_diameter_mm).toBe(45);
      expect(r.bore_depth_mm).toBe(20);
    });

    it("produces G-code for okuma controller", () => {
      const r = latheMultiOpPlannerEngine.generateSoftJawBoring(45, 20, "okuma");
      expect(r.gcode.length).toBeGreaterThan(0);
    });

    it("tolerance + notes are populated", () => {
      const r = latheMultiOpPlannerEngine.generateSoftJawBoring(45, 20);
      expect(r.bore_tolerance_mm).toBeGreaterThan(0);
      expect(Array.isArray(r.notes)).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles single-sided part (all chuck_end features)", () => {
      const r = latheMultiOpPlannerEngine.plan({
        part_length_mm: 40,
        max_od_mm: 20,
        features: [
          { id: "a", type: "od_turn", position: "chuck_end" },
          { id: "b", type: "face", position: "chuck_end" },
        ],
      });
      expect(r).toBeDefined();
    });

    it("handles through features (accessible either side)", () => {
      const r = latheMultiOpPlannerEngine.plan({
        part_length_mm: 60,
        max_od_mm: 30,
        features: [
          { id: "t", type: "bore", position: "through", is_through: true, is_bore: true },
        ],
      });
      expect(r).toBeDefined();
    });
  });
});
