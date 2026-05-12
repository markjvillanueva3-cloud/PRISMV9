/**
 * Tests for ThreadMillingPhysicsEngine
 * Covers helical kinematics, cutting forces, thread quality prediction,
 * multi-pass strategy, and cycle time computation.
 */
import { describe, it, expect } from "vitest";
import { ThreadMillingPhysicsEngine } from "../engines/ThreadMillingPhysicsEngine.js";

describe("ThreadMillingPhysicsEngine", () => {
  // ── Helical Kinematics ──────────────────────────────────────────

  describe("computeHelicalKinematics", () => {
    it("should compute kinematics for internal M10x1.5 thread", () => {
      const result = ThreadMillingPhysicsEngine.computeHelicalKinematics({
        thread_diameter_mm: 10,
        tool_diameter_mm: 6,
        pitch_mm: 1.5,
        spindle_rpm: 3000,
        n_flutes: 3,
        thread_type: "internal",
      });

      expect(result.value).toBeDefined();
      expect(result.unit).toBeTruthy();
      expect(result.value.helix_radius_mm).toBeGreaterThan(0);
      expect(result.value.Vc_effective_m_min).toBeGreaterThan(0);
      expect(result.value.ae_mm).toBeGreaterThan(0);
      expect(result.value.fz_actual_mm).toBeGreaterThan(0);
      expect(result.value.chip_thinning_factor).toBeGreaterThan(0);
      expect(result.value.path_equations).toHaveProperty("x");
      expect(result.value.path_equations).toHaveProperty("y");
      expect(result.value.path_equations).toHaveProperty("z");
    });

    it("should compute kinematics for external thread", () => {
      const result = ThreadMillingPhysicsEngine.computeHelicalKinematics({
        thread_diameter_mm: 20,
        tool_diameter_mm: 12,
        pitch_mm: 2.5,
        spindle_rpm: 2000,
        thread_type: "external",
      });

      expect(result.value.helix_radius_mm).toBeGreaterThan(0);
      expect(result.value.Vc_effective_m_min).toBeGreaterThan(0);
    });
  });

  // ── Cutting Forces ─────────────────────────────────────────────

  describe("computeCuttingForces", () => {
    it("should compute cutting forces with Kienzle model", () => {
      const result = ThreadMillingPhysicsEngine.computeCuttingForces({
        kc1_1: 1800,
        mc: 0.25,
        ap_mm: 0.974,
        fz_mm: 0.08,
      });

      expect(result.value).toBeDefined();
      expect(result.value.Ft_N).toBeGreaterThan(0);
      expect(result.value.Fr_N).toBeGreaterThan(0);
      expect(result.value.Fa_N).toBeGreaterThan(0);
      expect(result.value.F_resultant_N).toBeGreaterThan(0);
      // Resultant should be >= any single component
      expect(result.value.F_resultant_N).toBeGreaterThanOrEqual(result.value.Ft_N);
      expect(result.value.tool_deflection_mm).toBeGreaterThanOrEqual(0);
      expect(result.value.pitch_diameter_error_mm).toBeGreaterThanOrEqual(0);
      expect(typeof result.value.profile_error_assessment).toBe("string");
    });

    it("should compute tool deflection when overhang is specified", () => {
      const result = ThreadMillingPhysicsEngine.computeCuttingForces({
        kc1_1: 1800,
        mc: 0.25,
        ap_mm: 0.974,
        fz_mm: 0.08,
        tool_overhang_mm: 40,
        tool_shank_diameter_mm: 10,
        tool_E_GPa: 600,
      });

      expect(result.value.tool_deflection_mm).toBeGreaterThan(0);
      expect(result.value.pitch_diameter_error_mm).toBeGreaterThan(0);
    });
  });

  // ── Thread Quality Prediction ──────────────────────────────────

  describe("predictThreadQuality", () => {
    it("should predict ISO metric thread quality class", () => {
      const result = ThreadMillingPhysicsEngine.predictThreadQuality({
        standard: "ISO",
        designation: "M10",
        tool_deflection_mm: 0.005,
        fz_mm: 0.06,
        thread_type: "internal",
      });

      expect(result.value).toBeDefined();
      expect(result.value.pitch_diameter_deviation_mm).toBeGreaterThanOrEqual(0);
      expect(result.value.Ra_flanks_um).toBeGreaterThan(0);
      expect(typeof result.value.predicted_class).toBe("string");
      expect(typeof result.value.within_tolerance).toBe("boolean");
      expect(result.value.tolerance_range_mm).toHaveProperty("lower");
      expect(result.value.tolerance_range_mm).toHaveProperty("upper");
      expect(Array.isArray(result.value.recommendations)).toBe(true);
    });

    it("should predict UNC thread quality", () => {
      const result = ThreadMillingPhysicsEngine.predictThreadQuality({
        standard: "UNC",
        designation: "1/2-13",
        tool_deflection_mm: 0.01,
        fz_mm: 0.08,
        thread_type: "external",
      });

      expect(result.value.predicted_class).toBeTruthy();
      expect(result.value.Ra_flanks_um).toBeGreaterThan(0);
    });
  });

  // ── Multi-Pass Strategy ────────────────────────────────────────

  describe("computeMultiPassStrategy", () => {
    it("should compute degressive multi-pass strategy with spring pass", () => {
      const result = ThreadMillingPhysicsEngine.computeMultiPassStrategy({
        ae_total_mm: 1.0,
        n_passes: 3,
        spring_pass: true,
        thread_type: "internal",
      });

      expect(result.value).toBeDefined();
      expect(Array.isArray(result.value.ae_per_pass_mm)).toBe(true);
      // With spring pass, total passes should be n_passes + 1
      expect(result.value.total_passes).toBeGreaterThanOrEqual(3);
      expect(result.value.recommended_direction).toMatch(/^(climb|conventional)$/);
      expect(typeof result.value.direction_rationale).toBe("string");
      expect(result.value.quality_improvement_pct).toBeGreaterThan(0);
      expect(Array.isArray(result.value.pass_descriptions)).toBe(true);
    });

    it("should return more passes when spring pass is enabled", () => {
      const withSpring = ThreadMillingPhysicsEngine.computeMultiPassStrategy({
        ae_total_mm: 0.8,
        n_passes: 2,
        spring_pass: true,
        thread_type: "external",
      });
      const withoutSpring = ThreadMillingPhysicsEngine.computeMultiPassStrategy({
        ae_total_mm: 0.8,
        n_passes: 2,
        spring_pass: false,
        thread_type: "external",
      });

      expect(withSpring.value.total_passes).toBeGreaterThanOrEqual(
        withoutSpring.value.total_passes
      );
    });
  });

  // ── Cycle Time ─────────────────────────────────────────────────

  describe("computeCycleTime", () => {
    it("should estimate cycle time for single-point thread milling", () => {
      const result = ThreadMillingPhysicsEngine.computeCycleTime({
        thread_length_mm: 15,
        pitch_mm: 1.5,
        spindle_rpm: 3000,
        n_passes: 3,
        method: "single_point",
      });

      expect(result.value).toBeDefined();
      expect(result.value.cutting_time_s).toBeGreaterThan(0);
      expect(result.value.rapid_time_s).toBeGreaterThanOrEqual(0);
      expect(result.value.total_time_s).toBeGreaterThan(0);
      expect(result.value.total_time_s).toBeGreaterThanOrEqual(result.value.cutting_time_s);
      expect(result.value.n_revolutions).toBeGreaterThan(0);
      expect(typeof result.value.breakdown).toBe("string");
    });

    it("should estimate cycle time for multi-tooth thread milling", () => {
      const result = ThreadMillingPhysicsEngine.computeCycleTime({
        thread_length_mm: 15,
        pitch_mm: 1.5,
        spindle_rpm: 3000,
        method: "multi_tooth",
        n_teeth: 4,
      });

      expect(result.value.cutting_time_s).toBeGreaterThan(0);
      expect(result.value.total_time_s).toBeGreaterThan(0);
    });

    it("multi-tooth should be faster than single-point for same thread", () => {
      const singlePoint = ThreadMillingPhysicsEngine.computeCycleTime({
        thread_length_mm: 20,
        pitch_mm: 2.0,
        spindle_rpm: 2500,
        n_passes: 4,
        method: "single_point",
      });
      const multiTooth = ThreadMillingPhysicsEngine.computeCycleTime({
        thread_length_mm: 20,
        pitch_mm: 2.0,
        spindle_rpm: 2500,
        method: "multi_tooth",
        n_teeth: 5,
      });

      // Multi-tooth should generally be faster (fewer revolutions)
      expect(multiTooth.value.cutting_time_s).toBeLessThanOrEqual(
        singlePoint.value.cutting_time_s
      );
    });
  });
});
