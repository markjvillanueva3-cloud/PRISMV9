/**
 * PneumaticCylinderEngine — Unit Tests
 * @milestone FORGE-ENGINES-B30
 */
import { describe, it, expect } from "vitest";
import { pneumaticCylinderEngine } from "../engines/PneumaticCylinderEngine.js";

describe("PneumaticCylinderEngine", () => {
  it("theoretical force = pressure × bore area", () => {
    const r = pneumaticCylinderEngine.calculate({
      bore_mm: 100,
      supply_pressure_bar: 6,
    });
    // A = π/4 × 100² ≈ 7854 mm², F = 0.6 MPa × 7854 ≈ 4712 N
    expect(r.theoretical_force_ext.value).toBeCloseTo(4712, -1);
  });

  it("effective force < theoretical (friction)", () => {
    const r = pneumaticCylinderEngine.calculate({
      bore_mm: 63,
      supply_pressure_bar: 6,
    });
    expect(r.effective_force_ext.value).toBeLessThan(
      r.theoretical_force_ext.value
    );
  });

  it("air consumption increases with cycle rate", () => {
    const slow = pneumaticCylinderEngine.calculate({
      cycles_per_minute: 5,
    });
    const fast = pneumaticCylinderEngine.calculate({
      cycles_per_minute: 30,
    });
    expect(fast.air_consumption.value).toBeGreaterThan(
      slow.air_consumption.value
    );
  });

  it("vertical up reduces effective force", () => {
    const horiz = pneumaticCylinderEngine.calculate({
      orientation: "horizontal",
      load_mass_kg: 20,
    });
    const vert = pneumaticCylinderEngine.calculate({
      orientation: "vertical_up",
      load_mass_kg: 20,
    });
    expect(vert.effective_force_ext.value).toBeLessThan(
      horiz.effective_force_ext.value
    );
  });

  it("cushioning needed at high speed", () => {
    const r = pneumaticCylinderEngine.calculate({
      piston_speed_mm_s: 500,
      load_mass_kg: 10,
    });
    // KE = 0.5 × 10 × 0.5² = 1.25 J > 0.5 J
    expect(r.cushioning_needed.unit).toBe("YES");
  });

  it("no cushioning at low speed/mass", () => {
    const r = pneumaticCylinderEngine.calculate({
      piston_speed_mm_s: 50,
      load_mass_kg: 1,
    });
    // KE = 0.5 × 1 × 0.05² = 0.00125 J < 0.5 J
    expect(r.cushioning_needed.unit).toBe("NO");
  });

  it("auto-sizes bore from required force", () => {
    const r = pneumaticCylinderEngine.calculate({
      required_force_n: 2000,
      supply_pressure_bar: 6,
    });
    expect(r.effective_force_ext.value).toBeGreaterThanOrEqual(1900);
  });

  it("higher pressure gives more force", () => {
    const low = pneumaticCylinderEngine.calculate({
      supply_pressure_bar: 4,
    });
    const high = pneumaticCylinderEngine.calculate({
      supply_pressure_bar: 8,
    });
    expect(high.effective_force_ext.value).toBeGreaterThan(
      low.effective_force_ext.value
    );
  });

  it("warns low pressure < 4 bar", () => {
    const r = pneumaticCylinderEngine.calculate({
      supply_pressure_bar: 3,
    });
    expect(r.warnings.some(w => w.includes("low"))).toBe(true);
  });

  it("valve Cv > 0", () => {
    const r = pneumaticCylinderEngine.calculate({});
    expect(r.valve_cv.value).toBeGreaterThan(0);
  });
});
