import { describe, it, expect } from "vitest";
import {
  wearPatternRefinishEngine,
  WearMeasurement,
  WearProfile,
  CuttingParams,
  Point3D,
  ErrorProfile,
} from "../engines/WearPatternRefinishEngine.js";

// ── Test data helpers ──────────────────────────────────────────────────────

/** Uniform flank wear measurements along the cutting edge */
function uniformMeasurements(): WearMeasurement[] {
  return [
    { z_mm: 0, VB_mm: 0.10 },
    { z_mm: 1, VB_mm: 0.11 },
    { z_mm: 2, VB_mm: 0.10 },
    { z_mm: 3, VB_mm: 0.12 },
    { z_mm: 4, VB_mm: 0.11 },
  ];
}

/** Notch-like wear: big spike at DOC line */
function notchMeasurements(): WearMeasurement[] {
  return [
    { z_mm: 0.0, VB_mm: 0.05 },
    { z_mm: 0.5, VB_mm: 0.06 },
    { z_mm: 1.0, VB_mm: 0.05 },
    { z_mm: 1.5, VB_mm: 0.06 },
    { z_mm: 2.0, VB_mm: 0.05 },
    { z_mm: 2.5, VB_mm: 0.06 },
    { z_mm: 3.0, VB_mm: 0.25 },
    { z_mm: 3.5, VB_mm: 0.06 },
    { z_mm: 4.0, VB_mm: 0.05 },
    { z_mm: 4.5, VB_mm: 0.06 },
    { z_mm: 5.0, VB_mm: 0.05 },
  ];
}

/** Crater wear: low VB but high KT */
function craterMeasurements(): WearMeasurement[] {
  return [
    { z_mm: 0, VB_mm: 0.04, KT_mm: 0.15 },
    { z_mm: 1, VB_mm: 0.05, KT_mm: 0.18 },
    { z_mm: 2, VB_mm: 0.04, KT_mm: 0.16 },
    { z_mm: 3, VB_mm: 0.05, KT_mm: 0.14 },
  ];
}

/** Simple straight toolpath in X */
function straightPath(): Point3D[] {
  return [
    { x: 0, y: 0, z: 0 },
    { x: 10, y: 0, z: 0 },
    { x: 20, y: 0, z: 0 },
    { x: 30, y: 0, z: 0 },
    { x: 40, y: 0, z: 0 },
  ];
}

const defaultParams: CuttingParams = {
  clearance_angle_deg: 7,
  tool_overhang_mm: 40,
  tool_diameter_mm: 12,
  tool_material: "carbide",
  feed_mm_min: 200,
  rpm: 6000,
  ap_mm: 1.0,
  fz_mm: 0.1,
};

// ── mapWearProfile ─────────────────────────────────────────────────────────

describe("WearPatternRefinishEngine", () => {
  describe("mapWearProfile", () => {
    it("should interpolate VB values between measurements", () => {
      const profile = wearPatternRefinishEngine.mapWearProfile(uniformMeasurements());
      expect(profile.z_positions.length).toBeGreaterThan(5);
      expect(profile.VB_values.length).toBe(profile.z_positions.length);
      // Spline should pass through (or near) original knots
      expect(profile.VB_max).toBeGreaterThan(0);
      expect(profile.VB_avg).toBeGreaterThan(0);
    });

    it("should classify uniform wear with low CV", () => {
      const profile = wearPatternRefinishEngine.mapWearProfile(uniformMeasurements());
      expect(profile.wear_type).toBe("uniform");
      expect(profile.uniformity_cv).toBeLessThan(0.35);
    });

    it("should produce spline coefficients for each segment", () => {
      const profile = wearPatternRefinishEngine.mapWearProfile(uniformMeasurements());
      expect(profile.spline_coefficients.length).toBeGreaterThan(0);
      // Each coefficient set has [a, b, c, d]
      for (const coeff of profile.spline_coefficients) {
        expect(coeff).toHaveLength(4);
      }
    });

    it("should throw for fewer than 2 measurements", () => {
      expect(() => wearPatternRefinishEngine.mapWearProfile([{ z_mm: 0, VB_mm: 0.1 }])).toThrow();
    });

    it("should detect crater wear when KT >> VB", () => {
      const profile = wearPatternRefinishEngine.mapWearProfile(craterMeasurements());
      expect(profile.wear_type).toBe("crater");
    });
  });

  // ── predictSurfaceError ────────────────────────────────────────────────

  describe("predictSurfaceError", () => {
    it("should compute recession and deflection errors", () => {
      const profile = wearPatternRefinishEngine.mapWearProfile(uniformMeasurements());
      const error = wearPatternRefinishEngine.predictSurfaceError(profile, defaultParams);

      expect(error.z_positions.length).toBe(profile.z_positions.length);
      expect(error.recession_mm.length).toBe(profile.z_positions.length);
      expect(error.deflection_extra_mm.length).toBe(profile.z_positions.length);
      expect(error.total_error_mm.length).toBe(profile.z_positions.length);
    });

    it("should have total_error = recession + deflection at each point", () => {
      const profile = wearPatternRefinishEngine.mapWearProfile(uniformMeasurements());
      const error = wearPatternRefinishEngine.predictSurfaceError(profile, defaultParams);

      for (let i = 0; i < error.total_error_mm.length; i++) {
        expect(error.total_error_mm[i]).toBeCloseTo(
          error.recession_mm[i] + error.deflection_extra_mm[i],
          6,
        );
      }
    });

    it("should report positive max and avg errors", () => {
      const profile = wearPatternRefinishEngine.mapWearProfile(uniformMeasurements());
      const error = wearPatternRefinishEngine.predictSurfaceError(profile, defaultParams);

      expect(error.max_error_mm).toBeGreaterThan(0);
      expect(error.avg_error_mm).toBeGreaterThan(0);
      expect(error.max_error_mm).toBeGreaterThanOrEqual(error.avg_error_mm);
    });
  });

  // ── generateCompensatingPass ───────────────────────────────────────────

  describe("generateCompensatingPass", () => {
    it("should generate offset points matching original path length", () => {
      const profile = wearPatternRefinishEngine.mapWearProfile(uniformMeasurements());
      const error = wearPatternRefinishEngine.predictSurfaceError(profile, defaultParams);
      const pass = wearPatternRefinishEngine.generateCompensatingPass(
        error,
        straightPath(),
        defaultParams,
      );

      expect(pass.points.length).toBe(straightPath().length);
      expect(pass.offsets_applied.length).toBe(straightPath().length);
    });

    it("should reduce feed by 30% and use spring pass depth", () => {
      const profile = wearPatternRefinishEngine.mapWearProfile(uniformMeasurements());
      const error = wearPatternRefinishEngine.predictSurfaceError(profile, defaultParams);
      const pass = wearPatternRefinishEngine.generateCompensatingPass(
        error,
        straightPath(),
        defaultParams,
      );

      expect(pass.feed_mm_min).toBe(Math.round(200 * 0.7));
      expect(pass.ap_mm).toBe(0.05);
      expect(pass.rpm).toBe(6000);
    });
  });

  // ── estimateLifeExtension ──────────────────────────────────────────────

  describe("estimateLifeExtension", () => {
    it("should project additional passes before threshold", () => {
      const profile = wearPatternRefinishEngine.mapWearProfile(uniformMeasurements());
      const ext = wearPatternRefinishEngine.estimateLifeExtension(profile, 0.3);

      expect(ext.additional_passes).toBeGreaterThan(0);
      expect(ext.recommended).toBe(true);
      expect(ext.vb_projection.length).toBe(ext.additional_passes + 1);
    });

    it("should return 0 passes when VB already exceeds threshold", () => {
      const highWear: WearMeasurement[] = [
        { z_mm: 0, VB_mm: 0.35 },
        { z_mm: 1, VB_mm: 0.38 },
        { z_mm: 2, VB_mm: 0.36 },
      ];
      const profile = wearPatternRefinishEngine.mapWearProfile(highWear);
      const ext = wearPatternRefinishEngine.estimateLifeExtension(profile, 0.3);

      expect(ext.additional_passes).toBe(0);
      expect(ext.recommended).toBe(false);
    });
  });

  // ── assessWearUniformity ───────────────────────────────────────────────

  describe("assessWearUniformity", () => {
    it("should classify uniform wear as viable for compensation", () => {
      const profile = wearPatternRefinishEngine.mapWearProfile(uniformMeasurements());
      const assessment = wearPatternRefinishEngine.assessWearUniformity(profile);

      expect(assessment.wear_type).toBe("uniform");
      expect(assessment.compensation_viable).toBe(true);
      expect(assessment.metrics.vb_max).toBeGreaterThan(0);
    });

    it("should detect crater wear when KT measurements are provided", () => {
      const measurements = craterMeasurements();
      const profile = wearPatternRefinishEngine.mapWearProfile(measurements);
      const assessment = wearPatternRefinishEngine.assessWearUniformity(profile, measurements);

      expect(assessment.wear_type).toBe("crater");
      expect(assessment.compensation_viable).toBe(false);
      expect(assessment.metrics.kt_avg).toBeGreaterThan(0);
    });
  });

  // ── Dispatcher calculate ───────────────────────────────────────────────

  describe("calculate dispatcher", () => {
    it("should dispatch map_wear action", () => {
      const result = wearPatternRefinishEngine.calculate("map_wear", {
        measurements: uniformMeasurements(),
      }) as WearProfile;

      expect(result.VB_max).toBeGreaterThan(0);
      expect(result.wear_type).toBe("uniform");
    });

    it("should dispatch predict_error action", () => {
      const profile = wearPatternRefinishEngine.mapWearProfile(uniformMeasurements());
      const result = wearPatternRefinishEngine.calculate("predict_error", {
        profile,
        cutting_params: defaultParams,
      }) as ErrorProfile;

      expect(result.max_error_mm).toBeGreaterThan(0);
    });

    it("should throw on unknown action", () => {
      expect(() =>
        wearPatternRefinishEngine.calculate("unknown_action" as any, {}),
      ).toThrow("Unknown WearPatternRefinish action");
    });
  });
});
