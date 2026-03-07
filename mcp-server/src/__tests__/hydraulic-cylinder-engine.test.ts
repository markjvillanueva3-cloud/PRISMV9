/**
 * HydraulicCylinderEngine — Unit Tests
 * @milestone FORGE-ENGINES-B30
 */
import { describe, it, expect } from "vitest";
import { hydraulicCylinderEngine } from "../engines/HydraulicCylinderEngine.js";

describe("HydraulicCylinderEngine", () => {
  it("extension force = pressure × bore area", () => {
    const r = hydraulicCylinderEngine.calculate({
      bore_mm: 100,
      system_pressure_bar: 200,
    });
    // A = π/4 × 100² ≈ 7854 mm², F = 20 MPa × 7854 ≈ 157080 N
    expect(r.extension_force.value).toBeCloseTo(157080, -2);
  });

  it("retraction force < extension force", () => {
    const r = hydraulicCylinderEngine.calculate({
      bore_mm: 80,
      rod_diameter_mm: 40,
    });
    expect(r.retraction_force.value).toBeLessThan(
      r.extension_force.value
    );
  });

  it("annular area = bore area - rod area", () => {
    const r = hydraulicCylinderEngine.calculate({
      bore_mm: 100,
      rod_diameter_mm: 50,
    });
    // A_bore ≈ 7854, A_rod ≈ 1963, annular ≈ 5890
    expect(r.annular_area.value).toBeCloseTo(5890, -1);
  });

  it("flow rate proportional to speed", () => {
    const slow = hydraulicCylinderEngine.calculate({
      desired_speed_mm_s: 50,
    });
    const fast = hydraulicCylinderEngine.calculate({
      desired_speed_mm_s: 200,
    });
    expect(fast.flow_extend.value).toBeGreaterThan(
      slow.flow_extend.value
    );
  });

  it("warns buckling on long stroke small rod", () => {
    const r = hydraulicCylinderEngine.calculate({
      bore_mm: 50,
      rod_diameter_mm: 20,
      stroke_mm: 2000,
      mounting_type: "pivot_pivot",
    });
    expect(r.warnings.some(w => w.includes("buckl") || w.includes("Buckl"))).toBe(true);
  });

  it("higher pressure gives more force", () => {
    const low = hydraulicCylinderEngine.calculate({
      system_pressure_bar: 100,
    });
    const high = hydraulicCylinderEngine.calculate({
      system_pressure_bar: 300,
    });
    expect(high.extension_force.value).toBeGreaterThan(
      low.extension_force.value
    );
  });

  it("auto-sizes bore from required force", () => {
    const r = hydraulicCylinderEngine.calculate({
      required_force_n: 50000,
      system_pressure_bar: 200,
    });
    // Should pick a standard bore that meets force requirement
    expect(r.extension_force.value).toBeGreaterThanOrEqual(50000);
  });

  it("cycle time includes extend + retract", () => {
    const r = hydraulicCylinderEngine.calculate({
      stroke_mm: 500,
      desired_speed_mm_s: 100,
    });
    // extend = 5s, retract faster, total > 5s but < 10s
    expect(r.cycle_time.value).toBeGreaterThan(5);
    expect(r.cycle_time.value).toBeLessThan(10);
  });

  it("warns high pressure > 350 bar", () => {
    const r = hydraulicCylinderEngine.calculate({
      system_pressure_bar: 400,
    });
    expect(r.warnings.some(w => w.includes("350 bar"))).toBe(true);
  });

  it("retract flow < extend flow", () => {
    const r = hydraulicCylinderEngine.calculate({});
    expect(r.flow_retract.value).toBeLessThan(r.flow_extend.value);
  });
});
