/**
 * Batch 52 — TurbineBlade, CompressorDesign, AirDuct
 * @milestone FORGE-ENGINES-BATCH52
 */
import { describe, it, expect } from "vitest";
import { turbineBladeEngine } from "../engines/TurbineBladeEngine.js";
import { compressorDesignEngine } from "../engines/CompressorDesignEngine.js";
import { airDuctEngine } from "../engines/AirDuctEngine.js";

// ── TurbineBladeEngine ─────────────────────────────────────────────
describe("TurbineBladeEngine", () => {
  const base = {
    blade_length_mm: 80,
    root_radius_mm: 200,
    blade_area_mm2: 150,
    rotational_speed_rpm: 15000,
    gas_temp_C: 1200,
  };

  it("centrifugal stress > 0", () => {
    const r = turbineBladeEngine.calculate(base);
    expect(r.centrifugal_stress_MPa.value).toBeGreaterThan(0);
  });

  it("metal temp < gas temp with cooling", () => {
    const r = turbineBladeEngine.calculate(base);
    expect(r.metal_temp_C.value).toBeLessThan(base.gas_temp_C);
  });

  it("uncooled metal temp = gas temp", () => {
    const r = turbineBladeEngine.calculate({ ...base, cooling_type: "uncooled" as const });
    expect(r.metal_temp_C.value).toBe(base.gas_temp_C);
  });

  it("higher RPM increases stress", () => {
    const lo = turbineBladeEngine.calculate({ ...base, rotational_speed_rpm: 5000 });
    const hi = turbineBladeEngine.calculate({ ...base, rotational_speed_rpm: 25000 });
    expect(hi.centrifugal_stress_MPa.value).toBeGreaterThan(lo.centrifugal_stress_MPa.value);
  });

  it("tip speed > 0", () => {
    const r = turbineBladeEngine.calculate(base);
    expect(r.blade_tip_speed_m_s.value).toBeGreaterThan(0);
  });

  it("creep life > 0", () => {
    const r = turbineBladeEngine.calculate(base);
    expect(r.creep_life_hours.value).toBeGreaterThan(0);
  });

  it("safety factor > 0", () => {
    const r = turbineBladeEngine.calculate(base);
    expect(r.safety_factor.value).toBeGreaterThan(0);
  });

  it("first natural freq > 0", () => {
    const r = turbineBladeEngine.calculate(base);
    expect(r.first_natural_freq_Hz.value).toBeGreaterThan(0);
  });

  it("recommendations is array", () => {
    const r = turbineBladeEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});

// ── CompressorDesignEngine ─────────────────────────────────────────
describe("CompressorDesignEngine", () => {
  const base = {
    flow_rate_m3_min: 10,
    inlet_pressure_bar: 1,
    outlet_pressure_bar: 8,
  };

  it("total power > 0", () => {
    const r = compressorDesignEngine.calculate(base);
    expect(r.total_power_kW.value).toBeGreaterThan(0);
  });

  it("adiabatic power > isothermal power", () => {
    const r = compressorDesignEngine.calculate(base);
    expect(r.adiabatic_power_kW.value).toBeGreaterThan(r.isothermal_power_kW.value);
  });

  it("higher pressure ratio needs more power", () => {
    const lo = compressorDesignEngine.calculate({ ...base, outlet_pressure_bar: 4 });
    const hi = compressorDesignEngine.calculate({ ...base, outlet_pressure_bar: 20 });
    expect(hi.total_power_kW.value).toBeGreaterThan(lo.total_power_kW.value);
  });

  it("discharge temp > inlet temp", () => {
    const r = compressorDesignEngine.calculate(base);
    expect(r.discharge_temp_C.value).toBeGreaterThan(20);
  });

  it("volumetric efficiency between 50-100", () => {
    const r = compressorDesignEngine.calculate(base);
    expect(r.volumetric_efficiency_pct.value).toBeGreaterThan(50);
    expect(r.volumetric_efficiency_pct.value).toBeLessThanOrEqual(100);
  });

  it("pressure ratio matches input", () => {
    const r = compressorDesignEngine.calculate(base);
    expect(r.pressure_ratio.value).toBeCloseTo(8, 0);
  });

  it("stages ≥ 1", () => {
    const r = compressorDesignEngine.calculate(base);
    expect(r.number_of_stages.value).toBeGreaterThanOrEqual(1);
  });

  it("specific power > 0", () => {
    const r = compressorDesignEngine.calculate(base);
    expect(r.specific_power_kW_per_m3_min.value).toBeGreaterThan(0);
  });

  it("recommendations is array", () => {
    const r = compressorDesignEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});

// ── AirDuctEngine ──────────────────────────────────────────────────
describe("AirDuctEngine", () => {
  const base = { flow_rate_m3_h: 3600, duct_length_m: 20 };

  it("duct diameter > 0", () => {
    const r = airDuctEngine.calculate(base);
    expect(r.duct_diameter_mm.value).toBeGreaterThan(0);
  });

  it("pressure drop > 0", () => {
    const r = airDuctEngine.calculate(base);
    expect(r.pressure_drop_Pa.value).toBeGreaterThan(0);
  });

  it("longer duct has higher loss", () => {
    const s = airDuctEngine.calculate({ ...base, duct_length_m: 5 });
    const l = airDuctEngine.calculate({ ...base, duct_length_m: 50 });
    expect(l.total_loss_Pa.value).toBeGreaterThan(s.total_loss_Pa.value);
  });

  it("Reynolds number > 0", () => {
    const r = airDuctEngine.calculate(base);
    expect(r.reynolds_number.value).toBeGreaterThan(0);
  });

  it("fan power > 0", () => {
    const r = airDuctEngine.calculate(base);
    expect(r.fan_power_W.value).toBeGreaterThan(0);
  });

  it("velocity > 0", () => {
    const r = airDuctEngine.calculate(base);
    expect(r.air_velocity_m_s.value).toBeGreaterThan(0);
  });

  it("friction factor > 0", () => {
    const r = airDuctEngine.calculate(base);
    expect(r.friction_factor.value).toBeGreaterThan(0);
  });

  it("total loss ≥ straight + fittings", () => {
    const r = airDuctEngine.calculate(base);
    expect(r.total_loss_Pa.value).toBeGreaterThanOrEqual(
      r.pressure_drop_Pa.value + r.fitting_loss_Pa.value - 0.1
    );
  });

  it("recommendations is array", () => {
    const r = airDuctEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});
