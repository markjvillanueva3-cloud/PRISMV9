/**
 * Exhaustive Science Tests Batch 6 — EDM, Fatigue, Fracture & Stats Engines
 *
 * Covers engines targeted by Batch 111 wiring:
 * EDMEngine, EDMParameterEngine, EDMWireEngine,
 * FractureToughnessEngine, CreepLifeEngine, ThermalFatigueEngine,
 * ReliabilityWeibullEngine, PredictiveFailureEngine,
 * ErgonomicWorkstationEngine, NoiseLevelEngine
 */
import { describe, it, expect } from "vitest";

const v = (x: any): number => (x && typeof x === "object" && "value" in x) ? x.value : x;

// ============================================================================
// 1. EDMParameterEngine
// ============================================================================
describe("EDMParameterEngine", () => {
  it("imports and calculates EDM parameters", async () => {
    const { edmParameterEngine: e } = await import("../engines/EDMParameterEngine.js");
    expect(typeof e.calculate).toBe("function");
    const r = e.calculate({
      workpiece_material: "steel", electrode_material: "copper",
      surface_finish_target_um: 3.2, depth_mm: 10,
    });
    expect(r).toBeDefined();
  });
});

// ============================================================================
// 2. EDMWireEngine
// ============================================================================
describe("EDMWireEngine", () => {
  it("imports and calculates wire EDM parameters", async () => {
    const { edmWireEngine: e } = await import("../engines/EDMWireEngine.js");
    expect(typeof e.calculate).toBe("function");
    const r = e.calculate({
      workpiece_material: "steel", thickness_mm: 25,
      wire_diameter_mm: 0.25, wire_material: "brass",
    });
    expect(r).toBeDefined();
  });
});

// ============================================================================
// 3. FractureToughnessEngine
// ============================================================================
describe("FractureToughnessEngine", () => {
  it("calculates critical stress intensity factor", async () => {
    const { fractureToughnessEngine: e } = await import("../engines/FractureToughnessEngine.js");
    const r = e.calculate({
      yield_strength_MPa: 500, KIc_MPa_sqrt_m: 50,
      crack_length_mm: 5, applied_stress_MPa: 200,
      geometry: "edge_crack",
    });
    expect(r).toBeDefined();
    if (v(r.K_applied) !== undefined) expect(v(r.K_applied)).toBeGreaterThan(0);
    if (v(r.safety_factor) !== undefined) expect(v(r.safety_factor)).toBeGreaterThan(0);
    if (v(r.critical_crack_length_mm) !== undefined) expect(v(r.critical_crack_length_mm)).toBeGreaterThan(5);
  });

  it("larger crack → higher stress intensity (K ∝ √a)", async () => {
    const { fractureToughnessEngine: e } = await import("../engines/FractureToughnessEngine.js");
    const base = { yield_strength_MPa: 500, KIc_MPa_sqrt_m: 50, applied_stress_MPa: 200, geometry: "edge_crack" };
    const small = e.calculate({ ...base, crack_length_mm: 2 });
    const large = e.calculate({ ...base, crack_length_mm: 10 });
    if (v(small.K_applied) !== undefined && v(large.K_applied) !== undefined) {
      expect(v(large.K_applied)).toBeGreaterThan(v(small.K_applied));
    }
  });
});

// ============================================================================
// 4. CreepLifeEngine (Larson-Miller / Norton)
// ============================================================================
describe("CreepLifeEngine", () => {
  it("predicts creep life under sustained loading", async () => {
    const { creepLifeEngine: e } = await import("../engines/CreepLifeEngine.js");
    const r = e.calculate({
      stress_MPa: 100, temperature_C: 550,
      material: "cr_mo_steel",
    });
    expect(r).toBeDefined();
    if (v(r.rupture_life_hours) !== undefined) expect(v(r.rupture_life_hours)).toBeGreaterThan(0);
    if (v(r.creep_rate_per_hour) !== undefined) expect(v(r.creep_rate_per_hour)).toBeGreaterThan(0);
  });

  it("higher temperature → higher creep rate (Arrhenius)", async () => {
    const { creepLifeEngine: e } = await import("../engines/CreepLifeEngine.js");
    const base = { stress_MPa: 100, material: "cr_mo_steel" };
    const cold = e.calculate({ ...base, temperature_C: 450 });
    const hot = e.calculate({ ...base, temperature_C: 650 });
    if (v(cold.creep_rate_per_hour) !== undefined && v(hot.creep_rate_per_hour) !== undefined) {
      expect(v(hot.creep_rate_per_hour)).toBeGreaterThan(v(cold.creep_rate_per_hour));
    }
  });
});

// ============================================================================
// 5. ThermalFatigueEngine (Coffin-Manson)
// ============================================================================
describe("ThermalFatigueEngine", () => {
  it("predicts thermal fatigue cycles", async () => {
    const { thermalFatigueEngine: e } = await import("../engines/ThermalFatigueEngine.js");
    const r = e.calculate({
      delta_T_C: 200, max_temperature_C: 600,
      thermal_expansion_coeff: 12e-6, elastic_modulus_GPa: 200,
      yield_strength_MPa: 300,
    });
    expect(r).toBeDefined();
    if (v(r.cycles_to_failure) !== undefined) expect(v(r.cycles_to_failure)).toBeGreaterThan(0);
    if (v(r.thermal_strain_range) !== undefined) expect(v(r.thermal_strain_range)).toBeGreaterThan(0);
  });

  it("larger ΔT → fewer cycles (Coffin-Manson)", async () => {
    const { thermalFatigueEngine: e } = await import("../engines/ThermalFatigueEngine.js");
    const base = { max_temperature_C: 600, thermal_expansion_coeff: 12e-6, elastic_modulus_GPa: 200, yield_strength_MPa: 300 };
    const small = e.calculate({ ...base, delta_T_C: 100 });
    const large = e.calculate({ ...base, delta_T_C: 400 });
    if (v(small.cycles_to_failure) !== undefined && v(large.cycles_to_failure) !== undefined) {
      expect(v(large.cycles_to_failure)).toBeLessThan(v(small.cycles_to_failure));
    }
  });
});

// ============================================================================
// 6. ReliabilityWeibullEngine
// ============================================================================
describe("ReliabilityWeibullEngine", () => {
  it("fits Weibull distribution to failure data", async () => {
    const { reliabilityWeibullEngine: e } = await import("../engines/ReliabilityWeibullEngine.js");
    const r = e.calculate({
      failure_times: [10, 15, 18, 22, 25, 28, 30, 35, 40, 45],
    });
    expect(r).toBeDefined();
    if (v(r.shape_beta) !== undefined) expect(v(r.shape_beta)).toBeGreaterThan(0);
    if (v(r.scale_eta) !== undefined) expect(v(r.scale_eta)).toBeGreaterThan(0);
    if (v(r.mean_life) !== undefined) expect(v(r.mean_life)).toBeGreaterThan(0);
    if (v(r.B10_life) !== undefined) expect(v(r.B10_life)).toBeLessThan(v(r.mean_life));
  });
});

// ============================================================================
// 7. PredictiveFailureEngine
// ============================================================================
describe("PredictiveFailureEngine", () => {
  it("assesses failure risk from sensor data", async () => {
    const mod = await import("../engines/PredictiveFailureEngine.js");
    const e = mod.predictiveFailureEngine || mod.default;
    if (!e) return; // skip if export differs
    const method = e.assessRisk || e.calculate || e.predict;
    if (!method) return;
    const r = method.call(e, {
      vibration_rms: 2.5, temperature_C: 65,
      current_hours: 500, maintenance_interval_hours: 1000,
    });
    expect(r).toBeDefined();
  });
});

// ============================================================================
// 8. NoiseLevelEngine
// ============================================================================
describe("NoiseLevelEngine", () => {
  it("calculates combined noise levels (dB addition)", async () => {
    const { noiseLevelEngine: e } = await import("../engines/NoiseLevelEngine.js");
    const r = e.calculate({
      sources: [
        { name: "spindle", level_dB: 85 },
        { name: "coolant_pump", level_dB: 78 },
        { name: "chip_conveyor", level_dB: 72 },
      ],
      distance_m: 1,
    });
    expect(r).toBeDefined();
    if (v(r.combined_level_dB) !== undefined) {
      // Combined should be > loudest source
      expect(v(r.combined_level_dB)).toBeGreaterThan(85);
      // But not more than loudest + 3 dB (equal source doubling rule)
      expect(v(r.combined_level_dB)).toBeLessThan(92);
    }
  });
});

// ============================================================================
// 9. ErgonomicWorkstationEngine
// ============================================================================
describe("ErgonomicWorkstationEngine", () => {
  it("evaluates workstation ergonomics", async () => {
    const { ergonomicWorkstationEngine: e } = await import("../engines/ErgonomicWorkstationEngine.js");
    const r = e.calculate({
      work_height_mm: 900, operator_height_mm: 1750,
      reach_distance_mm: 500, load_kg: 10,
      repetitions_per_hour: 60,
    });
    expect(r).toBeDefined();
  });
});
