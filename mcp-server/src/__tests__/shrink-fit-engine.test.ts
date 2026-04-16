/**
 * ShrinkFitEngine — Unit Tests
 * @milestone FORGE-ENGINES-B33
 */
import { describe, it, expect } from "vitest";
import { shrinkFitEngine } from "../engines/ShrinkFitEngine.js";

describe("ShrinkFitEngine", () => {
  it("interface pressure > 0 with positive interference", () => {
    const r = shrinkFitEngine.calculate({ interference_mm: 0.05 });
    expect(r.interface_pressure.value).toBeGreaterThan(0);
  });

  it("more interference = higher pressure", () => {
    const low = shrinkFitEngine.calculate({ interference_mm: 0.02 });
    const high = shrinkFitEngine.calculate({ interference_mm: 0.10 });
    expect(high.interface_pressure.value).toBeGreaterThan(
      low.interface_pressure.value
    );
  });

  it("hub hoop stress > interface pressure", () => {
    const r = shrinkFitEngine.calculate({ interference_mm: 0.05 });
    expect(r.hub_hoop_stress.value).toBeGreaterThan(
      r.interface_pressure.value
    );
  });

  it("transmittable torque > 0", () => {
    const r = shrinkFitEngine.calculate({ interference_mm: 0.05 });
    expect(r.transmittable_torque.value).toBeGreaterThan(0);
  });

  it("derives interference from required torque", () => {
    const r = shrinkFitEngine.calculate({
      required_torque_nm: 500,
      shaft_diameter_mm: 50,
    });
    expect(r.required_interference.value).toBeGreaterThan(0);
    expect(r.transmittable_torque.value).toBeGreaterThanOrEqual(400);
  });

  it("assembly temp delta > 0 for shrink fit", () => {
    const r = shrinkFitEngine.calculate({ interference_mm: 0.05 });
    expect(r.assembly_temp_delta.value).toBeGreaterThan(0);
  });

  it("thicker hub = higher safety factor", () => {
    const thin = shrinkFitEngine.calculate({
      shaft_diameter_mm: 50,
      hub_outer_diameter_mm: 60,
      interference_mm: 0.04,
    });
    const thick = shrinkFitEngine.calculate({
      shaft_diameter_mm: 50,
      hub_outer_diameter_mm: 120,
      interference_mm: 0.04,
    });
    expect(thick.hub_safety_factor.value).toBeGreaterThan(
      thin.hub_safety_factor.value
    );
  });

  it("warns heavy interference for press fit", () => {
    const r = shrinkFitEngine.calculate({
      shaft_diameter_mm: 50,
      interference_mm: 0.15,
      assembly_method: "press",
    });
    expect(r.warnings.some(w => w.includes("shrink fit preferred"))).toBe(true);
  });

  it("longer fit = more torque capacity", () => {
    const short = shrinkFitEngine.calculate({
      fit_length_mm: 30,
      interference_mm: 0.05,
    });
    const long = shrinkFitEngine.calculate({
      fit_length_mm: 100,
      interference_mm: 0.05,
    });
    expect(long.transmittable_torque.value).toBeGreaterThan(
      short.transmittable_torque.value
    );
  });

  it("feasible with moderate interference", () => {
    const r = shrinkFitEngine.calculate({
      shaft_diameter_mm: 50,
      hub_outer_diameter_mm: 100,
      interference_mm: 0.03,
    });
    expect(r.fit_feasible.unit).toBe("PASS");
  });
});
