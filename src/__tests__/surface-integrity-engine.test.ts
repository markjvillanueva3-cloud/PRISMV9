/**
 * SurfaceIntegrityEngine — Unit Tests
 * @milestone FORGE-ENGINES-B44
 */
import { describe, it, expect } from "vitest";
import { surfaceIntegrityEngine } from "../engines/SurfaceIntegrityEngine.js";

describe("SurfaceIntegrityEngine", () => {
  it("surface roughness > 0", () => {
    const r = surfaceIntegrityEngine.calculate({});
    expect(r.surface_roughness_ra.value).toBeGreaterThan(0);
  });

  it("polishing gives lowest roughness", () => {
    const turn = surfaceIntegrityEngine.calculate({ process: "turning" });
    const pol = surfaceIntegrityEngine.calculate({ process: "polishing" });
    expect(pol.surface_roughness_ra.value).toBeLessThan(
      turn.surface_roughness_ra.value
    );
  });

  it("worn tool increases roughness", () => {
    const sharp = surfaceIntegrityEngine.calculate({ tool_condition: "sharp" });
    const worn = surfaceIntegrityEngine.calculate({ tool_condition: "worn" });
    expect(worn.surface_roughness_ra.value).toBeGreaterThan(
      sharp.surface_roughness_ra.value
    );
  });

  it("EDM has tensile residual stress", () => {
    const r = surfaceIntegrityEngine.calculate({ process: "edm" });
    expect(r.residual_stress_surface.value).toBeGreaterThan(0);
  });

  it("shot peen has compressive residual stress", () => {
    const r = surfaceIntegrityEngine.calculate({ process: "shot_peen" });
    expect(r.residual_stress_surface.value).toBeLessThan(0);
  });

  it("EDM has white layer", () => {
    const r = surfaceIntegrityEngine.calculate({ process: "edm" });
    expect(r.white_layer_thickness.value).toBeGreaterThan(0);
  });

  it("Rz ≈ 5 × Ra", () => {
    const r = surfaceIntegrityEngine.calculate({});
    const ratio = r.roughness_rz.value / r.surface_roughness_ra.value;
    expect(ratio).toBeCloseTo(5, 0);
  });

  it("quality score between 1 and 10", () => {
    const r = surfaceIntegrityEngine.calculate({});
    expect(r.surface_quality_score.value).toBeGreaterThanOrEqual(1);
    expect(r.surface_quality_score.value).toBeLessThanOrEqual(10);
  });

  it("fatigue derating ≤ 1.2", () => {
    const r = surfaceIntegrityEngine.calculate({});
    expect(r.fatigue_derating.value).toBeLessThanOrEqual(1.2);
  });

  it("warns EDM recast layer", () => {
    const r = surfaceIntegrityEngine.calculate({ process: "edm" });
    expect(r.warnings.some(w => w.includes("recast") || w.includes("EDM"))).toBe(true);
  });
});
