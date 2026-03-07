/**
 * LinearGuideEngine — Unit Tests
 * @milestone FORGE-ENGINES-B27
 */
import { describe, it, expect } from "vitest";
import { linearGuideEngine } from "../engines/LinearGuideEngine.js";

describe("LinearGuideEngine", () => {
  it("calculates L10 life in hours", () => {
    const r = linearGuideEngine.calculate({});
    expect(r.l10_life_hours.value).toBeGreaterThan(0);
  });

  it("higher load = shorter life", () => {
    const light = linearGuideEngine.calculate({
      load_radial_n: 500,
    });
    const heavy = linearGuideEngine.calculate({
      load_radial_n: 10000,
    });
    expect(heavy.l10_life_hours.value).toBeLessThan(
      light.l10_life_hours.value
    );
  });

  it("roller type has higher capacity", () => {
    const ball = linearGuideEngine.calculate({
      guide_type: "ball",
      guide_size: 25,
      load_radial_n: 5000,
    });
    const roller = linearGuideEngine.calculate({
      guide_type: "roller",
      guide_size: 25,
      load_radial_n: 5000,
    });
    expect(roller.l10_life_km.value).toBeGreaterThan(
      ball.l10_life_km.value
    );
  });

  it("heavier preload increases stiffness", () => {
    const light = linearGuideEngine.calculate({
      preload: "light",
      guide_size: 25,
    });
    const heavy = linearGuideEngine.calculate({
      preload: "heavy",
      guide_size: 25,
    });
    expect(heavy.stiffness.value).toBeGreaterThan(
      light.stiffness.value
    );
  });

  it("heavier preload increases friction", () => {
    const light = linearGuideEngine.calculate({
      preload: "light",
    });
    const heavy = linearGuideEngine.calculate({
      preload: "heavy",
    });
    expect(heavy.friction_force.value).toBeGreaterThan(
      light.friction_force.value
    );
  });

  it("precision grade has tighter accuracy", () => {
    const normal = linearGuideEngine.calculate({
      accuracy_grade: "normal",
    });
    const prec = linearGuideEngine.calculate({
      accuracy_grade: "precision",
    });
    expect(prec.accuracy_travel.value).toBeLessThan(
      normal.accuracy_travel.value
    );
  });

  it("dirty environment recommends double seal", () => {
    const r = linearGuideEngine.calculate({
      environment: "dirty",
    });
    expect(r.seal_recommendation.unit).toContain("double");
  });

  it("static safety factor > 0", () => {
    const r = linearGuideEngine.calculate({
      load_radial_n: 3000,
    });
    expect(r.static_safety_factor.value).toBeGreaterThan(0);
  });

  it("recommends standard guide size", () => {
    const r = linearGuideEngine.calculate({
      load_radial_n: 5000,
    });
    const std = [15, 20, 25, 30, 35, 45, 55, 65];
    expect(std).toContain(r.recommended_size.value);
  });

  it("warns short life", () => {
    const r = linearGuideEngine.calculate({
      load_radial_n: 20000,
      load_lateral_n: 5000,
      guide_size: 15,
      cycles_per_min: 60,
    });
    expect(
      r.warnings.some(w => w.includes("life") || w.includes("load"))
    ).toBe(true);
  });
});
