/**
 * KeywayStressEngine — Unit Tests
 * @milestone FORGE-ENGINES-B28
 */
import { describe, it, expect } from "vitest";
import { keywayStressEngine } from "../engines/KeywayStressEngine.js";

describe("KeywayStressEngine", () => {
  it("calculates shear stress from torque", () => {
    const r = keywayStressEngine.calculate({
      shaft_diameter_mm: 40,
      torque_nm: 200,
      key_width_mm: 12,
      key_height_mm: 8,
      key_length_mm: 50,
    });
    // F = T*1000 / (d/2) = 200000/20 = 10000N
    // τ = F / (w×L) = 10000/(12×50) = 16.67 MPa
    expect(r.shear_stress.value).toBeCloseTo(16.7, 0);
    expect(r.shear_stress.unit).toBe("MPa");
  });

  it("calculates bearing stress from torque", () => {
    const r = keywayStressEngine.calculate({
      shaft_diameter_mm: 40,
      torque_nm: 200,
      key_width_mm: 12,
      key_height_mm: 8,
      key_length_mm: 50,
    });
    // σ = F / (h/2 × L) = 10000/(4×50) = 50 MPa
    expect(r.bearing_stress.value).toBeCloseTo(50, 0);
  });

  it("bearing stress > shear stress for standard keys", () => {
    const r = keywayStressEngine.calculate({
      shaft_diameter_mm: 40,
      torque_nm: 200,
    });
    expect(r.bearing_stress.value).toBeGreaterThan(r.shear_stress.value);
  });

  it("higher torque → lower safety factor", () => {
    const low = keywayStressEngine.calculate({ torque_nm: 100 });
    const high = keywayStressEngine.calculate({ torque_nm: 1000 });
    expect(high.shear_safety_factor.value).toBeLessThan(
      low.shear_safety_factor.value
    );
  });

  it("reversed loading derates safety factor", () => {
    const stat = keywayStressEngine.calculate({
      torque_nm: 300,
      loading_type: "static",
    });
    const rev = keywayStressEngine.calculate({
      torque_nm: 300,
      loading_type: "reversed",
    });
    expect(rev.shear_safety_factor.value).toBeLessThan(
      stat.shear_safety_factor.value
    );
  });

  it("recommends ANSI key size for shaft diameter", () => {
    const r = keywayStressEngine.calculate({
      shaft_diameter_mm: 40,
    });
    // 38-44mm → 12×8 key
    expect(r.recommended_key_width.value).toBe(12);
    expect(r.recommended_key_height.value).toBe(8);
  });

  it("stress concentration depends on fillet radius", () => {
    const sharp = keywayStressEngine.calculate({
      shaft_diameter_mm: 50,
      fillet_radius_mm: 0.2, // r/d = 0.004 → Kt ~3.0
    });
    const round = keywayStressEngine.calculate({
      shaft_diameter_mm: 50,
      fillet_radius_mm: 2.5, // r/d = 0.05 → Kt ~1.6
    });
    expect(sharp.stress_concentration_factor.value).toBeGreaterThan(
      round.stress_concentration_factor.value
    );
  });

  it("warns on reversed loading", () => {
    const r = keywayStressEngine.calculate({
      loading_type: "reversed",
    });
    expect(r.warnings.some(w => w.includes("spline"))).toBe(true);
  });

  it("power/rpm derives torque correctly", () => {
    // 10kW at 1500 RPM = ~63.66 N·m
    const r = keywayStressEngine.calculate({
      power_kw: 10,
      rpm: 1500,
      shaft_diameter_mm: 30,
    });
    // T = P×60/(2π×n) = 10000×60/(2π×1500) ≈ 63.66 N·m
    // Should produce reasonable stress values
    expect(r.shear_stress.value).toBeGreaterThan(0);
    expect(r.key_feasible.unit).toBe("PASS");
  });

  it("warns woodruff key limited torque", () => {
    const r = keywayStressEngine.calculate({
      key_type: "woodruff",
    });
    expect(r.warnings.some(w => w.includes("Woodruff"))).toBe(true);
  });
});
