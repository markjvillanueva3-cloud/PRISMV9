/**
 * ClampingForceEngine Tests — MIO-MS0/U-MIO13
 */
import { describe, it, expect } from "vitest";
import { clampingForceEngine } from "../engines/ClampingForceEngine.js";

describe("ClampingForceEngine", () => {
  describe("calculate", () => {
    it("calculates clamping force using F_clamp = (F_result × SF) / (μ × n)", () => {
      const result = clampingForceEngine.calculate({
        cutting_forces: { Fx_n: 300, Fy_n: 100, Fz_n: 50 },
        workpiece_material: "steel",
        clamp_count: 2,
        safety_factor: 2.5,
      });

      const expectedResultant = Math.sqrt(300*300 + 100*100 + 50*50);
      expect(result.resultant_cutting_force_n).toBeCloseTo(expectedResultant, 0);

      const mu = 0.15;
      const expectedTotal = (expectedResultant * 2.5) / mu;
      expect(result.total_clamping_force_n).toBeCloseTo(expectedTotal, -1);
    });

    it("returns correct friction coefficient for aluminum", () => {
      const result = clampingForceEngine.calculate({
        cutting_forces: { Fx_n: 200, Fy_n: 80, Fz_n: 40 },
        workpiece_material: "aluminum 6061-T6",
      });

      expect(result.friction_coefficient).toBe(0.12);
    });

    it("returns correct friction coefficient for titanium", () => {
      const result = clampingForceEngine.calculate({
        cutting_forces: { Fx_n: 500, Fy_n: 200, Fz_n: 100 },
        workpiece_material: "Ti-6Al-4V",
      });

      expect(result.friction_coefficient).toBe(0.20);
    });

    it("applies default safety factor of 2.5", () => {
      const result = clampingForceEngine.calculate({
        cutting_forces: { Fx_n: 300, Fy_n: 100, Fz_n: 50 },
        workpiece_material: "steel",
      });

      expect(result.safety_factor).toBe(2.5);
    });

    it("increases force for horizontal clamp orientation", () => {
      const vertical = clampingForceEngine.calculate({
        cutting_forces: { Fx_n: 300, Fy_n: 100, Fz_n: 50 },
        workpiece_material: "steel",
        clamp_orientation: "vertical",
      });

      const horizontal = clampingForceEngine.calculate({
        cutting_forces: { Fx_n: 300, Fy_n: 100, Fz_n: 50 },
        workpiece_material: "steel",
        clamp_orientation: "horizontal",
      });

      expect(horizontal.required_force_per_clamp_n).toBeGreaterThan(vertical.required_force_per_clamp_n);
    });

    it("recommends minimum clamps for stability", () => {
      const result = clampingForceEngine.calculate({
        cutting_forces: { Fx_n: 800, Fy_n: 300, Fz_n: 150 },
        workpiece_material: "steel",
        part_length_mm: 300,
      });

      expect(result.recommended_clamp_count).toBeGreaterThanOrEqual(3);
      expect(result.stability_analysis.minimum_clamps_for_stability).toBeGreaterThanOrEqual(3);
    });

    it("provides recommendations for high clamping force", () => {
      const result = clampingForceEngine.calculate({
        cutting_forces: { Fx_n: 2000, Fy_n: 800, Fz_n: 400 },
        workpiece_material: "steel",
        clamp_count: 2,
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("provides AI reasoning trace", () => {
      const result = clampingForceEngine.calculate({
        cutting_forces: { Fx_n: 300, Fy_n: 100, Fz_n: 50 },
        workpiece_material: "steel",
      });

      expect(result.ai_reasoning.length).toBeGreaterThan(0);
      expect(result.ai_reasoning.some(r => r.includes("[CLAMP]"))).toBe(true);
    });
  });

  describe("quickEstimate", () => {
    it("returns force estimate for given resultant", () => {
      const result = clampingForceEngine.quickEstimate(500, "steel", 2);

      expect(result.force_per_clamp_n).toBeGreaterThan(0);
      expect(result.total_force_n).toBeCloseTo(result.force_per_clamp_n * 2, -1);
    });

    it("uses default friction for steel", () => {
      const result = clampingForceEngine.quickEstimate(500, "steel", 2);
      const expected = (500 * 2.5) / 0.15;

      expect(result.total_force_n).toBeCloseTo(expected, -1);
    });
  });

  describe("physics validation", () => {
    it("clamping force formula: F = (F_result × SF) / μ", () => {
      const F_result = 400;
      const SF = 2.5;
      const mu = 0.15;
      const expectedTotal = (F_result * SF) / mu;

      const result = clampingForceEngine.calculate({
        cutting_forces: { Fx_n: F_result, Fy_n: 0, Fz_n: 0 },
        workpiece_material: "steel",
        clamp_count: 1,
        safety_factor: SF,
      });

      expect(result.total_clamping_force_n).toBeCloseTo(expectedTotal, -1);
    });

    it("resultant force calculation: F = sqrt(Fx² + Fy² + Fz²)", () => {
      const Fx = 300, Fy = 400, Fz = 0;
      const expectedResultant = 500; // 3-4-5 triangle

      const result = clampingForceEngine.calculate({
        cutting_forces: { Fx_n: Fx, Fy_n: Fy, Fz_n: Fz },
        workpiece_material: "steel",
      });

      expect(result.resultant_cutting_force_n).toBeCloseTo(expectedResultant, 0);
    });
  });
});
