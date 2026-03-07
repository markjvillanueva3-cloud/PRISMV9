/**
 * PressBrakeEngine — Unit Tests
 * @milestone FORGE-ENGINES-B41
 */
import { describe, it, expect } from "vitest";
import { pressBrakeEngine } from "../engines/PressBrakeEngine.js";

describe("PressBrakeEngine", () => {
  it("required tonnage > 0", () => {
    const r = pressBrakeEngine.calculate({});
    expect(r.required_tonnage.value).toBeGreaterThan(0);
  });

  it("thicker material needs more tonnage", () => {
    const thin = pressBrakeEngine.calculate({ thickness_mm: 2 });
    const thick = pressBrakeEngine.calculate({ thickness_mm: 10 });
    expect(thick.required_tonnage.value).toBeGreaterThan(
      thin.required_tonnage.value
    );
  });

  it("stainless needs more tonnage than mild steel", () => {
    const ms = pressBrakeEngine.calculate({ material: "mild_steel" });
    const ss = pressBrakeEngine.calculate({ material: "stainless_304" });
    expect(ss.required_tonnage.value).toBeGreaterThan(
      ms.required_tonnage.value
    );
  });

  it("bend allowance > 0", () => {
    const r = pressBrakeEngine.calculate({});
    expect(r.bend_allowance.value).toBeGreaterThan(0);
  });

  it("springback > 0 for air bending", () => {
    const r = pressBrakeEngine.calculate({ bend_method: "air" });
    expect(r.springback_angle.value).toBeGreaterThan(0);
  });

  it("coining has less springback than air bending", () => {
    const air = pressBrakeEngine.calculate({ bend_method: "air" });
    const coin = pressBrakeEngine.calculate({ bend_method: "coining" });
    expect(coin.springback_angle.value).toBeLessThan(
      air.springback_angle.value
    );
  });

  it("actual bend angle > nominal due to springback", () => {
    const r = pressBrakeEngine.calculate({ bend_angle_deg: 90 });
    expect(r.actual_bend_angle.value).toBeGreaterThan(90);
  });

  it("minimum flange > 0", () => {
    const r = pressBrakeEngine.calculate({});
    expect(r.minimum_flange.value).toBeGreaterThan(0);
  });

  it("k-factor between 0.2 and 0.5", () => {
    const r = pressBrakeEngine.calculate({});
    expect(r.k_factor.value).toBeGreaterThanOrEqual(0.2);
    expect(r.k_factor.value).toBeLessThanOrEqual(0.5);
  });

  it("warns tight radius on aluminum", () => {
    const r = pressBrakeEngine.calculate({
      material: "aluminum_6061",
      thickness_mm: 6,
      inside_radius_mm: 2,
    });
    expect(r.warnings.some(w => w.includes("radius") || w.includes("crack"))).toBe(true);
  });
});
