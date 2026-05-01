/**
 * PressFitEngine — Unit Tests
 * @milestone FORGE-ENGINES-B17
 */
import { describe, it, expect } from "vitest";
import { pressFitEngine } from "../engines/PressFitEngine.js";

describe("PressFitEngine", () => {
  it("calculates contact pressure for steel-steel fit", () => {
    const r = pressFitEngine.calculate({
      shaft_diameter_mm: 50,
      hub_outer_diameter_mm: 80,
      engagement_length_mm: 40,
      interference_mm: 0.05,
    });
    expect(r.contact_pressure.value).toBeGreaterThan(0);
    expect(r.press_force.value).toBeGreaterThan(0);
  });

  it("calculates press force proportional to friction", () => {
    const low = pressFitEngine.calculate({
      shaft_diameter_mm: 50,
      hub_outer_diameter_mm: 80,
      engagement_length_mm: 40,
      interference_mm: 0.05,
      friction_coefficient: 0.10,
    });
    const high = pressFitEngine.calculate({
      shaft_diameter_mm: 50,
      hub_outer_diameter_mm: 80,
      engagement_length_mm: 40,
      interference_mm: 0.05,
      friction_coefficient: 0.20,
    });
    expect(high.press_force.value).toBeGreaterThan(
      low.press_force.value
    );
  });

  it("safety factor decreases with more interference", () => {
    const light = pressFitEngine.calculate({
      shaft_diameter_mm: 30,
      hub_outer_diameter_mm: 50,
      engagement_length_mm: 25,
      interference_mm: 0.02,
    });
    const heavy = pressFitEngine.calculate({
      shaft_diameter_mm: 30,
      hub_outer_diameter_mm: 50,
      engagement_length_mm: 25,
      interference_mm: 0.10,
    });
    expect(heavy.safety_factor.value).toBeLessThan(
      light.safety_factor.value
    );
  });

  it("calculates torque capacity", () => {
    const r = pressFitEngine.calculate({
      shaft_diameter_mm: 40,
      hub_outer_diameter_mm: 70,
      engagement_length_mm: 30,
    });
    expect(r.torque_capacity.value).toBeGreaterThan(0);
  });

  it("calculates thermal assembly temperatures", () => {
    const r = pressFitEngine.calculate({
      shaft_diameter_mm: 30,
      hub_outer_diameter_mm: 60,
      engagement_length_mm: 25,
      interference_mm: 0.05,
      assembly_method: "thermal",
    });
    // Larger interference on smaller shaft → clear temperature delta
    expect(r.heating_temperature.value).toBeGreaterThan(20);
    expect(r.cooling_temperature.value).toBeLessThan(20);
  });

  it("warns low safety factor", () => {
    const r = pressFitEngine.calculate({
      shaft_diameter_mm: 20,
      hub_outer_diameter_mm: 30,
      engagement_length_mm: 20,
      interference_mm: 0.15,
    });
    expect(
      r.warnings.some(w => w.includes("Safety factor") ||
        w.includes("yield"))
    ).toBe(true);
  });

  it("warns long engagement", () => {
    const r = pressFitEngine.calculate({
      shaft_diameter_mm: 20,
      hub_outer_diameter_mm: 40,
      engagement_length_mm: 50,
    });
    expect(
      r.warnings.some(w => w.includes("2×diameter"))
    ).toBe(true);
  });

  it("warns short engagement", () => {
    const r = pressFitEngine.calculate({
      shaft_diameter_mm: 40,
      hub_outer_diameter_mm: 70,
      engagement_length_mm: 15,
    });
    expect(
      r.warnings.some(w => w.includes("Short"))
    ).toBe(true);
  });

  it("warns aluminum shaft in steel hub", () => {
    const r = pressFitEngine.calculate({
      shaft_diameter_mm: 30,
      hub_outer_diameter_mm: 50,
      engagement_length_mm: 25,
      shaft_material: "aluminum",
      hub_material: "steel",
    });
    expect(
      r.warnings.some(w => w.includes("thermal expansion"))
    ).toBe(true);
  });

  it("uses fit class interference", () => {
    const r = pressFitEngine.calculate({
      shaft_diameter_mm: 50,
      hub_outer_diameter_mm: 80,
      engagement_length_mm: 40,
      fit_class: "H7s6",
    });
    expect(r.interference.value).toBeGreaterThan(0);
  });
});
