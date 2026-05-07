/**
 * BoilerTubeEngine — PHASE21 wiring tests.
 * Real assertions on calculate(input) for fire-tube and water-tube boilers
 * with concrete steam capacity / pressure / temperature inputs. Verifies
 * physics relationships (heat duty grows with capacity, more tubes → more
 * surface area, fire-tube vs water-tube U-coefficients).
 */
import { describe, it, expect } from "vitest";
import { boilerTubeEngine } from "../engines/BoilerTubeEngine.js";

describe("BoilerTubeEngine.calculate — fire-tube boiler", () => {
  it("baseline 1000 kg/h fire-tube → all atomic values populated with units", () => {
    const r = boilerTubeEngine.calculate({ steam_capacity_kg_h: 1000 });
    expect(r.tube_thickness_mm.unit).toBe("mm");
    expect(r.number_of_tubes.unit).toBe("tubes");
    expect(r.heating_surface_m2.unit).toBe("m²");
    expect(r.heat_duty_MW.unit).toBe("MW");
    expect(r.tube_thickness_mm.value).toBeGreaterThan(0);
    expect(r.number_of_tubes.value).toBeGreaterThan(0);
  });

  it("baseline 1000 kg/h → heat duty in [0.5, 1.5] MW range (saturated steam ~620 kW)", () => {
    const r = boilerTubeEngine.calculate({ steam_capacity_kg_h: 1000 });
    expect(r.heat_duty_MW.value).toBeGreaterThan(0.5);
    expect(r.heat_duty_MW.value).toBeLessThan(1.5);
  });

  it("doubling steam capacity → heat duty roughly doubles", () => {
    const r1 = boilerTubeEngine.calculate({ steam_capacity_kg_h: 1000 });
    const r2 = boilerTubeEngine.calculate({ steam_capacity_kg_h: 2000 });
    const ratio = r2.heat_duty_MW.value / r1.heat_duty_MW.value;
    expect(ratio).toBeGreaterThan(1.9);
    expect(ratio).toBeLessThan(2.1);
  });

  it("doubling capacity → tube count increases (more heating surface needed)", () => {
    const r1 = boilerTubeEngine.calculate({ steam_capacity_kg_h: 1000 });
    const r2 = boilerTubeEngine.calculate({ steam_capacity_kg_h: 2000 });
    expect(r2.number_of_tubes.value).toBeGreaterThan(r1.number_of_tubes.value);
  });

  it("very high pressure (150 bar) → wall thickness ≥ low pressure (5 bar) after std-thickness snap", () => {
    // Standard thickness lookup snaps to discrete sizes [2.0..6.0]; pressure
    // must clear a snap boundary to show. 150 bar vs 5 bar definitely does.
    const lo = boilerTubeEngine.calculate({ steam_capacity_kg_h: 1000, steam_pressure_bar: 5 });
    const hi = boilerTubeEngine.calculate({ steam_capacity_kg_h: 1000, steam_pressure_bar: 150 });
    expect(hi.tube_thickness_mm.value).toBeGreaterThanOrEqual(lo.tube_thickness_mm.value);
    // At 150 bar the snapped thickness must be > 2 mm (baseline minimum)
    expect(hi.tube_thickness_mm.value).toBeGreaterThan(2.0);
  });
});

describe("BoilerTubeEngine.calculate — water-tube boiler", () => {
  it("water-tube boiler → fewer tubes than fire-tube at same capacity (higher U)", () => {
    const fire = boilerTubeEngine.calculate({ steam_capacity_kg_h: 5000, boiler_type: "fire_tube" });
    const water = boilerTubeEngine.calculate({ steam_capacity_kg_h: 5000, boiler_type: "water_tube" });
    expect(water.heating_surface_m2.value).toBeLessThan(fire.heating_surface_m2.value);
  });

  it("water-tube has the same heat duty as fire-tube at same capacity (mass × ΔH)", () => {
    const fire = boilerTubeEngine.calculate({ steam_capacity_kg_h: 5000, boiler_type: "fire_tube" });
    const water = boilerTubeEngine.calculate({ steam_capacity_kg_h: 5000, boiler_type: "water_tube" });
    expect(water.heat_duty_MW.value).toBeCloseTo(fire.heat_duty_MW.value, 4);
  });
});

describe("BoilerTubeEngine.calculate — input parameters and safety", () => {
  it("custom OD overrides default 50.8 mm in tube count calculation", () => {
    const small = boilerTubeEngine.calculate({ steam_capacity_kg_h: 1000, tube_od_mm: 25 });
    const large = boilerTubeEngine.calculate({ steam_capacity_kg_h: 1000, tube_od_mm: 76 });
    // Smaller tubes need more of them to make the same area
    expect(small.number_of_tubes.value).toBeGreaterThan(large.number_of_tubes.value);
  });

  it("is_safe is a boolean reflecting passed safety checks", () => {
    const r = boilerTubeEngine.calculate({ steam_capacity_kg_h: 1000 });
    expect(typeof r.is_safe).toBe("boolean");
  });

  it("recommendations is an array (may be empty for safe baseline)", () => {
    const r = boilerTubeEngine.calculate({ steam_capacity_kg_h: 1000 });
    expect(Array.isArray(r.recommendations)).toBe(true);
  });

  it("steam velocity reported in m/s with positive value", () => {
    const r = boilerTubeEngine.calculate({ steam_capacity_kg_h: 1000 });
    expect(r.steam_velocity_m_s.unit).toBe("m/s");
    expect(r.steam_velocity_m_s.value).toBeGreaterThan(0);
  });

  it("LMTD reported in °C and positive (heat flows hot-to-cold)", () => {
    const r = boilerTubeEngine.calculate({ steam_capacity_kg_h: 1000 });
    expect(r.lmtd_C.value).toBeGreaterThan(0);
  });

  it("circulation ratio is positive (water/steam recirculation)", () => {
    const r = boilerTubeEngine.calculate({ steam_capacity_kg_h: 1000 });
    expect(r.circulation_ratio.value).toBeGreaterThan(0);
  });
});
