/**
 * Batch 53 — PlanetaryGear, ClutchDesign, ExtrusionForce
 * @milestone FORGE-ENGINES-BATCH53
 */
import { describe, it, expect } from "vitest";
import { planetaryGearEngine } from "../engines/PlanetaryGearEngine.js";
import { clutchDesignEngine } from "../engines/ClutchDesignEngine.js";
import { extrusionForceEngine } from "../engines/ExtrusionForceEngine.js";

// ── PlanetaryGearEngine ────────────────────────────────────────────
describe("PlanetaryGearEngine", () => {
  const base = {
    sun_teeth: 20,
    ring_teeth: 80,
    num_planets: 4,
    input_speed_rpm: 3000,
    input_torque_Nm: 50,
  };

  it("gear ratio > 1 with ring fixed", () => {
    const r = planetaryGearEngine.calculate(base);
    expect(r.gear_ratio.value).toBeGreaterThan(1);
  });

  it("output speed < input speed (reduction)", () => {
    const r = planetaryGearEngine.calculate(base);
    expect(r.output_speed_rpm.value).toBeLessThan(base.input_speed_rpm);
  });

  it("output torque > input torque (reduction)", () => {
    const r = planetaryGearEngine.calculate(base);
    expect(r.output_torque_Nm.value).toBeGreaterThan(base.input_torque_Nm);
  });

  it("planet teeth = (ring - sun) / 2", () => {
    const r = planetaryGearEngine.calculate(base);
    expect(r.planet_teeth.value).toBe(30);
  });

  it("efficiency between 90-100%", () => {
    const r = planetaryGearEngine.calculate(base);
    expect(r.efficiency_pct.value).toBeGreaterThan(90);
    expect(r.efficiency_pct.value).toBeLessThanOrEqual(100);
  });

  it("bending stress > 0", () => {
    const r = planetaryGearEngine.calculate(base);
    expect(r.tooth_bending_stress_MPa.value).toBeGreaterThan(0);
  });

  it("contact stress > 0", () => {
    const r = planetaryGearEngine.calculate(base);
    expect(r.contact_stress_MPa.value).toBeGreaterThan(0);
  });

  it("center distance > 0", () => {
    const r = planetaryGearEngine.calculate(base);
    expect(r.center_distance_mm.value).toBeGreaterThan(0);
  });

  it("recommendations is array", () => {
    const r = planetaryGearEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});

// ── ClutchDesignEngine ─────────────────────────────────────────────
describe("ClutchDesignEngine", () => {
  const base = { max_torque_Nm: 200, max_speed_rpm: 3000 };

  it("torque capacity ≥ required torque", () => {
    const r = clutchDesignEngine.calculate(base);
    expect(r.torque_capacity_Nm.value).toBeGreaterThanOrEqual(200);
  });

  it("torque margin > 0", () => {
    const r = clutchDesignEngine.calculate(base);
    expect(r.torque_margin_pct.value).toBeGreaterThan(0);
  });

  it("clamp force > 0", () => {
    const r = clutchDesignEngine.calculate(base);
    expect(r.clamp_force_N.value).toBeGreaterThan(0);
  });

  it("higher torque needs higher clamp force", () => {
    const lo = clutchDesignEngine.calculate({ ...base, max_torque_Nm: 50 });
    const hi = clutchDesignEngine.calculate({ ...base, max_torque_Nm: 500 });
    expect(hi.clamp_force_N.value).toBeGreaterThan(lo.clamp_force_N.value);
  });

  it("energy per engagement > 0", () => {
    const r = clutchDesignEngine.calculate(base);
    expect(r.energy_per_engagement_kJ.value).toBeGreaterThan(0);
  });

  it("temperature rise > 0", () => {
    const r = clutchDesignEngine.calculate(base);
    expect(r.temperature_rise_C.value).toBeGreaterThan(0);
  });

  it("peripheral speed > 0", () => {
    const r = clutchDesignEngine.calculate(base);
    expect(r.max_peripheral_speed_m_s.value).toBeGreaterThan(0);
  });

  it("recommendations is array", () => {
    const r = clutchDesignEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});

// ── ExtrusionForceEngine ───────────────────────────────────────────
describe("ExtrusionForceEngine", () => {
  const base = {
    billet_diameter_mm: 200,
    product_diameter_mm: 50,
  };

  it("extrusion ratio > 1", () => {
    const r = extrusionForceEngine.calculate(base);
    expect(r.extrusion_ratio.value).toBeGreaterThan(1);
  });

  it("extrusion force > 0", () => {
    const r = extrusionForceEngine.calculate(base);
    expect(r.extrusion_force_kN.value).toBeGreaterThan(0);
  });

  it("higher ratio needs more force", () => {
    const lo = extrusionForceEngine.calculate({
      ...base, product_diameter_mm: 100,
    });
    const hi = extrusionForceEngine.calculate({
      ...base, product_diameter_mm: 20,
    });
    expect(hi.extrusion_force_kN.value).toBeGreaterThan(
      lo.extrusion_force_kN.value
    );
  });

  it("exit speed > ram speed (ratio > 1)", () => {
    const r = extrusionForceEngine.calculate(base);
    expect(r.exit_speed_mm_s.value).toBeGreaterThan(10); // default ram 10mm/s
  });

  it("strain > 0", () => {
    const r = extrusionForceEngine.calculate(base);
    expect(r.strain.value).toBeGreaterThan(0);
  });

  it("friction force ≥ 0", () => {
    const r = extrusionForceEngine.calculate(base);
    expect(r.friction_force_kN.value).toBeGreaterThanOrEqual(0);
  });

  it("indirect extrusion has less friction", () => {
    const dir = extrusionForceEngine.calculate(base);
    const ind = extrusionForceEngine.calculate({
      ...base, extrusion_type: "indirect" as const,
    });
    expect(ind.friction_force_kN.value).toBeLessThan(
      dir.friction_force_kN.value
    );
  });

  it("ram power > 0", () => {
    const r = extrusionForceEngine.calculate(base);
    expect(r.ram_power_kW.value).toBeGreaterThan(0);
  });

  it("recommendations is array", () => {
    const r = extrusionForceEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});
