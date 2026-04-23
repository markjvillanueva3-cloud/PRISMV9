/**
 * CSSChipLoadInvariantCoordinatorEngine — LATHE-PROD-READY-MS0 U-LPR05
 *
 * Tests chip-load invariance during CSS transitions.
 */

import { describe, it, expect } from "vitest";
import {
  CSSChipLoadInvariantCoordinatorEngine,
  ChipLoadInvariantInput,
} from "../engines/CSSChipLoadInvariantCoordinatorEngine.js";

describe("CSSChipLoadInvariantCoordinatorEngine", () => {
  describe("computeRPM", () => {
    it("computes correct RPM for CSS formula", () => {
      const rpm = CSSChipLoadInvariantCoordinatorEngine.computeRPM(180, 50);
      expect(rpm).toBeCloseTo(1145.9, 0);
    });

    it("returns Infinity for zero diameter", () => {
      const rpm = CSSChipLoadInvariantCoordinatorEngine.computeRPM(180, 0);
      expect(rpm).toBe(Infinity);
    });

    it("higher Vc gives higher RPM", () => {
      const rpm1 = CSSChipLoadInvariantCoordinatorEngine.computeRPM(100, 50);
      const rpm2 = CSSChipLoadInvariantCoordinatorEngine.computeRPM(200, 50);
      expect(rpm2).toBeGreaterThan(rpm1);
    });

    it("smaller diameter gives higher RPM", () => {
      const rpm1 = CSSChipLoadInvariantCoordinatorEngine.computeRPM(180, 100);
      const rpm2 = CSSChipLoadInvariantCoordinatorEngine.computeRPM(180, 50);
      expect(rpm2).toBeGreaterThan(rpm1);
    });
  });

  describe("computeChipThickness", () => {
    it("computes h = f·sin(κ_r) for 90° lead angle", () => {
      const h = CSSChipLoadInvariantCoordinatorEngine.computeChipThickness(0.2, 90);
      expect(h).toBeCloseTo(0.2, 3);
    });

    it("computes h = f·sin(κ_r) for 45° lead angle", () => {
      const h = CSSChipLoadInvariantCoordinatorEngine.computeChipThickness(0.2, 45);
      expect(h).toBeCloseTo(0.1414, 3);
    });

    it("computes h = 0 for 0° lead angle", () => {
      const h = CSSChipLoadInvariantCoordinatorEngine.computeChipThickness(0.2, 0);
      expect(h).toBeCloseTo(0, 5);
    });
  });

  describe("computeKienzleForce", () => {
    it("computes Fc = kc1.1·b·h^(1-mc) for P-group steel", () => {
      const Fc = CSSChipLoadInvariantCoordinatorEngine.computeKienzleForce(
        1800, 2.0, 0.2, 0.25
      );
      expect(Fc).toBeGreaterThan(1000);
      expect(Fc).toBeLessThan(3000);
    });

    it("returns 0 for zero chip thickness", () => {
      const Fc = CSSChipLoadInvariantCoordinatorEngine.computeKienzleForce(
        1800, 2.0, 0, 0.25
      );
      expect(Fc).toBe(0);
    });

    it("higher kc1.1 gives higher force", () => {
      const Fc1 = CSSChipLoadInvariantCoordinatorEngine.computeKienzleForce(
        1800, 2.0, 0.2, 0.25
      );
      const Fc2 = CSSChipLoadInvariantCoordinatorEngine.computeKienzleForce(
        2800, 2.0, 0.2, 0.25
      );
      expect(Fc2).toBeGreaterThan(Fc1);
    });

    it("higher depth gives higher force (linear)", () => {
      const Fc1 = CSSChipLoadInvariantCoordinatorEngine.computeKienzleForce(
        1800, 1.0, 0.2, 0.25
      );
      const Fc2 = CSSChipLoadInvariantCoordinatorEngine.computeKienzleForce(
        1800, 2.0, 0.2, 0.25
      );
      expect(Fc2).toBeCloseTo(Fc1 * 2, 0);
    });
  });

  describe("analyze", () => {
    const baseInput: ChipLoadInvariantInput = {
      cutting_speed_m_min: 180,
      base_feed_mm_rev: 0.2,
      lead_angle_deg: 90,
      depth_of_cut_mm: 2.0,
      diameter_start_mm: 100,
      diameter_end_mm: 50,
      material_kc1_1_MPa: 1800,
      material_mc: 0.25,
      max_spindle_rpm: 4000,
      spindle_accel_time_ms: 300,
      max_feed_slew_rate_mm_rev_s: 50,
      z_travel_mm: 25,
    };

    it("analyzes OD turning without face-center issues", () => {
      const result = CSSChipLoadInvariantCoordinatorEngine.analyze(baseInput);
      expect(result.valid).toBe(true);
      expect(result.face_center_risk).toBe(false);
      expect(result.transition_points.length).toBeGreaterThan(0);
    });

    it("detects face-center risk when turning to small diameter", () => {
      const facingInput = { ...baseInput, diameter_end_mm: 2 };
      const result = CSSChipLoadInvariantCoordinatorEngine.analyze(facingInput);
      expect(result.face_center_risk).toBe(true);
      expect(result.warnings.some(w => w.includes("Face-center"))).toBe(true);
    });

    it("detects RPM clamping when diameter gets small", () => {
      const smallDiaInput = { ...baseInput, diameter_end_mm: 10 };
      const result = CSSChipLoadInvariantCoordinatorEngine.analyze(smallDiaInput);
      expect(result.clamped_fraction).toBeGreaterThan(0);
      expect(result.transition_points.some(t => t.is_clamped)).toBe(true);
    });

    it("computes target chip thickness correctly", () => {
      const result = CSSChipLoadInvariantCoordinatorEngine.analyze(baseInput);
      expect(result.target_chip_thickness_mm).toBeCloseTo(0.2, 2);
    });

    it("keeps chip thickness variation under 20% for normal OD turning", () => {
      const result = CSSChipLoadInvariantCoordinatorEngine.analyze(baseInput);
      expect(result.chip_thickness_variation_percent).toBeLessThan(20);
    });

    it("generates feed compensation segments", () => {
      const clampedInput = { ...baseInput, diameter_end_mm: 10, max_spindle_rpm: 3000 };
      const result = CSSChipLoadInvariantCoordinatorEngine.analyze(clampedInput);
      expect(result.feed_compensation_segments.length).toBeGreaterThan(0);
    });

    it("validates physics constraints", () => {
      const result = CSSChipLoadInvariantCoordinatorEngine.analyze(baseInput);
      expect(result.physics_validation.slew_rate_satisfied).toBe(true);
      expect(result.physics_validation.accel_time_satisfied).toBe(true);
    });
  });

  describe("computeFeedSchedule", () => {
    it("returns feed schedule for diameter range", () => {
      const input: ChipLoadInvariantInput = {
        cutting_speed_m_min: 180,
        base_feed_mm_rev: 0.2,
        lead_angle_deg: 90,
        depth_of_cut_mm: 2.0,
        diameter_start_mm: 100,
        diameter_end_mm: 50,
        material_kc1_1_MPa: 1800,
        material_mc: 0.25,
        max_spindle_rpm: 4000,
        spindle_accel_time_ms: 300,
        max_feed_slew_rate_mm_rev_s: 50,
        z_travel_mm: 25,
      };
      const schedule = CSSChipLoadInvariantCoordinatorEngine.computeFeedSchedule(input);
      expect(schedule.length).toBeGreaterThan(0);
      for (const step of schedule) {
        expect(step.diameter_mm).toBeGreaterThan(0);
        expect(step.feed_mm_rev).toBeGreaterThan(0);
        expect(step.rpm).toBeGreaterThan(0);
      }
    });
  });

  describe("material-specific mc coefficient", () => {
    it("uses default mc=0.25 for P-group", () => {
      const input: ChipLoadInvariantInput = {
        cutting_speed_m_min: 180,
        base_feed_mm_rev: 0.2,
        lead_angle_deg: 90,
        depth_of_cut_mm: 2.0,
        diameter_start_mm: 100,
        diameter_end_mm: 50,
        material_kc1_1_MPa: 1800,
        material_mc: 0.25,
        max_spindle_rpm: 4000,
        spindle_accel_time_ms: 300,
        max_feed_slew_rate_mm_rev_s: 50,
        z_travel_mm: 25,
      };
      const result = CSSChipLoadInvariantCoordinatorEngine.analyze(input);
      expect(result.max_force_N).toBeGreaterThan(0);
    });

    it("higher mc gives different force profile", () => {
      const baseInput: ChipLoadInvariantInput = {
        cutting_speed_m_min: 180,
        base_feed_mm_rev: 0.2,
        lead_angle_deg: 90,
        depth_of_cut_mm: 2.0,
        diameter_start_mm: 100,
        diameter_end_mm: 50,
        material_kc1_1_MPa: 1800,
        material_mc: 0.25,
        max_spindle_rpm: 4000,
        spindle_accel_time_ms: 300,
        max_feed_slew_rate_mm_rev_s: 50,
        z_travel_mm: 25,
      };
      const highMcInput = { ...baseInput, material_mc: 0.35 };
      const result1 = CSSChipLoadInvariantCoordinatorEngine.analyze(baseInput);
      const result2 = CSSChipLoadInvariantCoordinatorEngine.analyze(highMcInput);
      expect(result1.max_force_N).not.toBe(result2.max_force_N);
    });
  });
});
