/**
 * FractureToughnessEngine — Unit Tests
 * @milestone FORGE-ENGINES-B37
 */
import { describe, it, expect } from "vitest";
import { fractureToughnessEngine } from "../engines/FractureToughnessEngine.js";

describe("FractureToughnessEngine", () => {
  it("stress intensity > 0 with defaults", () => {
    const r = fractureToughnessEngine.calculate({});
    expect(r.stress_intensity.value).toBeGreaterThan(0);
  });

  it("larger crack increases stress intensity", () => {
    const small = fractureToughnessEngine.calculate({ crack_length_mm: 2 });
    const large = fractureToughnessEngine.calculate({ crack_length_mm: 20 });
    expect(large.stress_intensity.value).toBeGreaterThan(
      small.stress_intensity.value
    );
  });

  it("higher stress increases K_I", () => {
    const low = fractureToughnessEngine.calculate({ applied_stress_mpa: 50 });
    const high = fractureToughnessEngine.calculate({ applied_stress_mpa: 200 });
    expect(high.stress_intensity.value).toBeGreaterThan(
      low.stress_intensity.value
    );
  });

  it("critical crack size decreases with higher stress", () => {
    const low = fractureToughnessEngine.calculate({ applied_stress_mpa: 50 });
    const high = fractureToughnessEngine.calculate({ applied_stress_mpa: 200 });
    expect(high.critical_crack_size.value).toBeLessThan(
      low.critical_crack_size.value
    );
  });

  it("safety factor decreases as crack approaches critical", () => {
    const small = fractureToughnessEngine.calculate({ crack_length_mm: 2 });
    const large = fractureToughnessEngine.calculate({ crack_length_mm: 30 });
    expect(large.safety_factor.value).toBeLessThan(
      small.safety_factor.value
    );
  });

  it("stainless 304 tougher than cast iron", () => {
    const ss = fractureToughnessEngine.calculate({ material: "stainless_304" });
    const ci = fractureToughnessEngine.calculate({ material: "cast_iron" });
    expect(ss.fracture_toughness.value).toBeGreaterThan(
      ci.fracture_toughness.value
    );
  });

  it("plastic zone size > 0", () => {
    const r = fractureToughnessEngine.calculate({});
    expect(r.plastic_zone_size.value).toBeGreaterThan(0);
  });

  it("warns near-critical safety factor", () => {
    const r = fractureToughnessEngine.calculate({
      crack_length_mm: 50,
      applied_stress_mpa: 200,
      material: "cast_iron",
    });
    expect(r.warnings.some(w => w.includes("safety factor") || w.includes("fracture"))).toBe(true);
  });

  it("FAD Kr < 1 for safe condition", () => {
    const r = fractureToughnessEngine.calculate({
      crack_length_mm: 2,
      applied_stress_mpa: 50,
    });
    expect(r.fad_kr.value).toBeLessThan(1);
  });

  it("remaining cycles > 0 for subcritical crack", () => {
    const r = fractureToughnessEngine.calculate({
      crack_length_mm: 3,
      applied_stress_mpa: 80,
    });
    expect(r.remaining_cycles.value).toBeGreaterThan(0);
  });
});
