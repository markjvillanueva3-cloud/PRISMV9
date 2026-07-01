/**
 * SpringCalcEngine — Unit Tests
 * @milestone FORGE-ENGINES-B29
 */
import { describe, it, expect } from "vitest";
import { springCalcEngine } from "../engines/SpringCalcEngine.js";

describe("SpringCalcEngine", () => {
  it("spring rate = Gd⁴/(8D³Na)", () => {
    const r = springCalcEngine.calculate({
      wire_diameter_mm: 3,
      mean_coil_diameter_mm: 20,
      active_coils: 8,
    });
    // k = 80000 × 81 / (8 × 8000 × 8) = 6480000/512000 ≈ 12.66
    expect(r.spring_rate.value).toBeCloseTo(12.66, 0);
  });

  it("stiffer spring with larger wire diameter", () => {
    const thin = springCalcEngine.calculate({ wire_diameter_mm: 2 });
    const thick = springCalcEngine.calculate({ wire_diameter_mm: 5 });
    expect(thick.spring_rate.value).toBeGreaterThan(thin.spring_rate.value);
  });

  it("spring index = D/d", () => {
    const r = springCalcEngine.calculate({
      wire_diameter_mm: 4,
      mean_coil_diameter_mm: 24,
    });
    expect(r.spring_index.value).toBeCloseTo(6, 2);
  });

  it("Wahl factor > 1 for practical springs", () => {
    const r = springCalcEngine.calculate({});
    expect(r.wahl_factor.value).toBeGreaterThan(1);
  });

  it("solid height = total_coils × wire_dia", () => {
    const r = springCalcEngine.calculate({
      wire_diameter_mm: 2,
      total_coils: 12,
    });
    expect(r.solid_height.value).toBeCloseTo(24, 1);
  });

  it("warns low spring index < 4", () => {
    const r = springCalcEngine.calculate({
      wire_diameter_mm: 6,
      mean_coil_diameter_mm: 18, // C = 3
    });
    expect(r.warnings.some(w => w.includes("< 4"))).toBe(true);
  });

  it("warns high spring index > 12", () => {
    const r = springCalcEngine.calculate({
      wire_diameter_mm: 1,
      mean_coil_diameter_mm: 20, // C = 20
    });
    expect(r.warnings.some(w => w.includes("> 12"))).toBe(true);
  });

  it("warns buckling for tall spring", () => {
    const r = springCalcEngine.calculate({
      wire_diameter_mm: 1,
      mean_coil_diameter_mm: 10,
      free_length_mm: 100,
    });
    // L/D = 100/10 = 10 > 5.2
    expect(r.warnings.some(w => w.includes("buckle"))).toBe(true);
  });

  it("natural frequency > 0", () => {
    const r = springCalcEngine.calculate({});
    expect(r.natural_frequency.value).toBeGreaterThan(0);
  });

  it("stress at solid > stress at working", () => {
    const r = springCalcEngine.calculate({
      wire_diameter_mm: 3,
      mean_coil_diameter_mm: 20,
      active_coils: 8,
      free_length_mm: 60,
    });
    expect(r.stress_at_solid.value).toBeGreaterThan(
      r.stress_at_working.value
    );
  });
});
