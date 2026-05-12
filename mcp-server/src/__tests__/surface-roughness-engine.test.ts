/**
 * SurfaceRoughnessEngine — Unit Tests
 * @milestone FORGE-ENGINES-B17
 */
import { describe, it, expect } from "vitest";
import {
  surfaceRoughnessEngine,
} from "../engines/SurfaceRoughnessEngine.js";

describe("SurfaceRoughnessEngine", () => {
  it("calculates theoretical Ra from feed and nose radius", () => {
    // Ra = f²/(32×r) × 1000 = 0.15²/(32×0.8)×1000 = 0.879μm
    const r = surfaceRoughnessEngine.calculate({
      feed_per_rev_mm: 0.15,
      nose_radius_mm: 0.8,
    });
    expect(r.theoretical_ra.value).toBeCloseTo(0.879, 2);
  });

  it("predicted Ra >= theoretical Ra", () => {
    const r = surfaceRoughnessEngine.calculate({
      feed_per_rev_mm: 0.15,
      nose_radius_mm: 0.8,
    });
    expect(r.predicted_ra.value).toBeGreaterThanOrEqual(
      r.theoretical_ra.value
    );
  });

  it("BUE degrades finish at low speed", () => {
    const fast = surfaceRoughnessEngine.calculate({
      cutting_speed_mpm: 200,
      material_type: "steel",
    });
    const slow = surfaceRoughnessEngine.calculate({
      cutting_speed_mpm: 30,
      material_type: "steel",
    });
    expect(slow.predicted_ra.value).toBeGreaterThan(
      fast.predicted_ra.value
    );
    expect(slow.bue_factor.value).toBeGreaterThan(1);
  });

  it("worn tool increases roughness", () => {
    const fresh = surfaceRoughnessEngine.calculate({
      tool_condition: "new",
    });
    const worn = surfaceRoughnessEngine.calculate({
      tool_condition: "worn",
    });
    expect(worn.predicted_ra.value).toBeGreaterThan(
      fresh.predicted_ra.value
    );
  });

  it("Rz ≈ 4× Ra", () => {
    const r = surfaceRoughnessEngine.calculate({});
    expect(r.predicted_rz.value).toBeCloseTo(
      r.predicted_ra.value * 4, 1
    );
  });

  it("RMS ≈ 1.11× Ra", () => {
    const r = surfaceRoughnessEngine.calculate({});
    expect(r.rms_roughness.value).toBeCloseTo(
      r.predicted_ra.value * 1.11, 2
    );
  });

  it("grinding gives finer finish than turning", () => {
    const turning = surfaceRoughnessEngine.calculate({
      process: "turning",
    });
    const grinding = surfaceRoughnessEngine.calculate({
      process: "grinding",
    });
    expect(grinding.predicted_ra.value).toBeLessThan(
      turning.predicted_ra.value
    );
  });

  it("assigns ISO N-grade", () => {
    const r = surfaceRoughnessEngine.calculate({
      process: "lapping",
    });
    expect(r.iso_grade.unit).toMatch(/^N\d+$/);
  });

  it("warns high overhang vibration", () => {
    const r = surfaceRoughnessEngine.calculate({
      overhang_ratio: 6,
    });
    expect(
      r.warnings.some(w => w.includes("vibration"))
    ).toBe(true);
  });

  it("warns chipped tool", () => {
    const r = surfaceRoughnessEngine.calculate({
      tool_condition: "chipped",
    });
    expect(
      r.warnings.some(w => w.includes("Chipped"))
    ).toBe(true);
  });

  it("warns feed > 50% nose radius", () => {
    const r = surfaceRoughnessEngine.calculate({
      feed_per_rev_mm: 0.5,
      nose_radius_mm: 0.8,
    });
    expect(
      r.warnings.some(w => w.includes("scallop"))
    ).toBe(true);
  });
});
