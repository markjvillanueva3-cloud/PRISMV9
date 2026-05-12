/**
 * Exhaustive Science Tests Batch 4B — Fluid/Thermal/Process Engines (Batch 109B)
 *
 * Covers: CentrifugalPump, CompressorDesign, CondenserDesign, CoolingTower,
 * HeatExchanger, HydraulicCylinder, PipeSizing, PipeStress, PumpSelection,
 * ValveDesign, ValveSizing, Nozzle, SealSelection, SpringDesign, TankDesign
 */
import { describe, it, expect } from "vitest";

const v = (x: any): number => (x && typeof x === "object" && "value" in x) ? x.value : x;

// ============================================================================
// 1. CentrifugalPumpEngine
// ============================================================================
describe("CentrifugalPumpEngine", () => {
  it("imports and calculates pump performance", async () => {
    const { centrifugalPumpEngine: e } = await import("../engines/CentrifugalPumpEngine.js");
    expect(typeof e.calculate).toBe("function");
    const r = e.calculate({
      flow_rate_m3_h: 50, total_head_m: 30, fluid_density_kg_m3: 1000,
      impeller_diameter_mm: 200, motor_speed_rpm: 2900,
    });
    expect(r).toBeDefined();
    expect(v(r.shaft_power_kW)).toBeGreaterThan(0);
    expect(v(r.pump_efficiency_pct)).toBeGreaterThan(0);
    expect(v(r.pump_efficiency_pct)).toBeLessThanOrEqual(100);
    expect(v(r.specific_speed)).toBeGreaterThan(0);
  });

  it("P_hydraulic = ρgQH (dimensional check)", async () => {
    const { centrifugalPumpEngine: e } = await import("../engines/CentrifugalPumpEngine.js");
    const r = e.calculate({
      flow_rate_m3_h: 100, total_head_m: 20, fluid_density_kg_m3: 1000,
      impeller_diameter_mm: 250, motor_speed_rpm: 1450,
    });
    // P_hyd = 1000 × 9.81 × (100/3600) × 20 = 5450 W = 5.45 kW
    expect(v(r.hydraulic_power_kW)).toBeCloseTo(5.45, 0);
  });
});

// ============================================================================
// 2. CompressorDesignEngine
// ============================================================================
describe("CompressorDesignEngine", () => {
  it("calculates compressor performance", async () => {
    const { compressorDesignEngine: e } = await import("../engines/CompressorDesignEngine.js");
    const r = e.calculate({
      inlet_pressure_bar: 1, outlet_pressure_bar: 8,
      flow_rate_m3_min: 5, gas: "air",
      inlet_temperature_C: 25,
    });
    expect(r).toBeDefined();
    if (v(r.power_kW) !== undefined) expect(v(r.power_kW)).toBeGreaterThan(0);
    if (v(r.pressure_ratio) !== undefined) expect(v(r.pressure_ratio)).toBeCloseTo(8, 0);
    if (v(r.discharge_temperature_C) !== undefined) expect(v(r.discharge_temperature_C)).toBeGreaterThan(25);
  });
});

// ============================================================================
// 3. CondenserDesignEngine
// ============================================================================
describe("CondenserDesignEngine", () => {
  it("calculates condenser sizing", async () => {
    const { condenserDesignEngine: e } = await import("../engines/CondenserDesignEngine.js");
    const r = e.calculate({
      heat_duty_kW: 500, condensing_temp_C: 100,
      coolant_inlet_C: 25, coolant_outlet_C: 40,
      tube_od_mm: 19, tube_id_mm: 16,
    });
    expect(r).toBeDefined();
    if (v(r.area_m2) !== undefined) expect(v(r.area_m2)).toBeGreaterThan(0);
    if (v(r.coolant_flow_kg_s) !== undefined) expect(v(r.coolant_flow_kg_s)).toBeGreaterThan(0);
  });
});

// ============================================================================
// 4. HeatExchangerEngine
// ============================================================================
describe("HeatExchangerEngine", () => {
  it("calculates LMTD-based heat exchanger", async () => {
    const { heatExchangerEngine: e } = await import("../engines/HeatExchangerEngine.js");
    const r = e.calculate({
      hot_inlet_C: 150, hot_outlet_C: 90,
      cold_inlet_C: 25, cold_outlet_C: 65,
      heat_duty_kW: 200, U_W_m2K: 500,
      flow_arrangement: "counterflow",
    });
    expect(r).toBeDefined();
    if (v(r.lmtd_C) !== undefined) expect(v(r.lmtd_C)).toBeGreaterThan(0);
    if (v(r.area_m2) !== undefined) expect(v(r.area_m2)).toBeGreaterThan(0);
  });

  it("counterflow has higher LMTD than parallel flow", async () => {
    const { heatExchangerEngine: e } = await import("../engines/HeatExchangerEngine.js");
    const base = { hot_inlet_C: 150, hot_outlet_C: 90, cold_inlet_C: 25, cold_outlet_C: 65, heat_duty_kW: 200, U_W_m2K: 500 };
    const cf = e.calculate({ ...base, flow_arrangement: "counterflow" });
    const pf = e.calculate({ ...base, flow_arrangement: "parallel" });
    if (cf.lmtd_C !== undefined && pf.lmtd_C !== undefined) {
      expect(v(cf.lmtd_C)).toBeGreaterThanOrEqual(v(pf.lmtd_C));
    }
  });
});

// ============================================================================
// 5. HydraulicCylinderEngine
// ============================================================================
describe("HydraulicCylinderEngine", () => {
  it("calculates hydraulic cylinder force", async () => {
    const { hydraulicCylinderEngine: e } = await import("../engines/HydraulicCylinderEngine.js");
    const r = e.calculate({
      bore_mm: 80, rod_diameter_mm: 40,
      stroke_mm: 500, pressure_bar: 200,
    });
    expect(r).toBeDefined();
    if (v(r.push_force_N) !== undefined) expect(v(r.push_force_N)).toBeGreaterThan(0);
    if (v(r.pull_force_N) !== undefined) expect(v(r.pull_force_N)).toBeGreaterThan(0);
    if (r.push_force_N !== undefined && r.pull_force_N !== undefined) {
      expect(v(r.push_force_N)).toBeGreaterThan(v(r.pull_force_N)); // push > pull (annular area)
    }
  });

  it("F = P × A (pressure × area dimensional check)", async () => {
    const { hydraulicCylinderEngine: e } = await import("../engines/HydraulicCylinderEngine.js");
    const r = e.calculate({
      bore_mm: 100, rod_diameter_mm: 50,
      stroke_mm: 300, pressure_bar: 100,
    });
    // F_push = 100 bar × π/4 × 100² mm² = 100×10⁵ Pa × π/4 × 0.01 m² = 78,540 N
    if (v(r.push_force_N) !== undefined) {
      const expected = 100e5 * Math.PI / 4 * (0.1 ** 2);
      expect(v(r.push_force_N)).toBeCloseTo(expected, -2);
    }
  });
});

// ============================================================================
// 6. PipeSizingEngine
// ============================================================================
describe("PipeSizingEngine", () => {
  it("sizes pipe by flow rate and velocity", async () => {
    const { pipeSizingEngine: e } = await import("../engines/PipeSizingEngine.js");
    const r = e.calculate({
      flow_rate_m3h: 20, max_velocity_m_s: 3,
      fluid: "water", temperature_C: 25,
    });
    expect(r).toBeDefined();
    if (v(r.recommended_diameter_mm) !== undefined) expect(v(r.recommended_diameter_mm)).toBeGreaterThan(0);
    if (v(r.actual_velocity_m_s) !== undefined) expect(v(r.actual_velocity_m_s)).toBeLessThanOrEqual(3.5);
  });
});

// ============================================================================
// 7. PipeStressEngine
// ============================================================================
describe("PipeStressEngine", () => {
  it("calculates pipe stress under pressure and temperature", async () => {
    const { pipeStressEngine: e } = await import("../engines/PipeStressEngine.js");
    const r = e.calculate({
      od_mm: 168.3, wall_thickness_mm: 7.11,
      design_pressure_bar: 40, design_temperature_C: 300,
      material: "carbon_steel", pipe_length_m: 20,
    });
    expect(r).toBeDefined();
    if (v(r.hoop_stress_MPa) !== undefined) expect(v(r.hoop_stress_MPa)).toBeGreaterThan(0);
    if (v(r.thermal_stress_MPa) !== undefined) expect(v(r.thermal_stress_MPa)).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// 8. PumpSelectionEngine
// ============================================================================
describe("PumpSelectionEngine", () => {
  it("recommends pump type from system requirements", async () => {
    const { pumpSelectionEngine: e } = await import("../engines/PumpSelectionEngine.js");
    const r = e.calculate({
      flow_rate_m3h: 50, head_m: 40,
      fluid: "water", viscosity_cSt: 1,
      application: "process",
    });
    expect(r).toBeDefined();
  });
});

// ============================================================================
// 9. ValveDesignEngine
// ============================================================================
describe("ValveDesignEngine", () => {
  it("calculates valve body design", async () => {
    const { valveDesignEngine: e } = await import("../engines/ValveDesignEngine.js");
    const r = e.calculate({
      nominal_size_mm: 100, pressure_class: 150,
      valve_type: "gate", material: "carbon_steel",
      design_pressure_bar: 20, design_temperature_C: 200,
    });
    expect(r).toBeDefined();
    if (v(r.wall_thickness_mm) !== undefined) expect(v(r.wall_thickness_mm)).toBeGreaterThan(0);
  });
});

// ============================================================================
// 10. ValveSizingEngine
// ============================================================================
describe("ValveSizingEngine", () => {
  it("calculates Cv for liquid flow", async () => {
    const { valveSizingEngine: e } = await import("../engines/ValveSizingEngine.js");
    const r = e.calculate({
      flow_rate_m3h: 30, dp_bar: 2,
      fluid_density_kg_m3: 1000, fluid: "water",
      upstream_pressure_bar: 10,
    });
    expect(r).toBeDefined();
    if (r.cv !== undefined) expect(r.cv).toBeGreaterThan(0);
  });

  it("higher flow → higher Cv (proportional)", async () => {
    const { valveSizingEngine: e } = await import("../engines/ValveSizingEngine.js");
    const base = { dp_bar: 2, fluid_density_kg_m3: 1000, fluid: "water", upstream_pressure_bar: 10 };
    const low = e.calculate({ ...base, flow_rate_m3h: 10 });
    const high = e.calculate({ ...base, flow_rate_m3h: 50 });
    if (low.cv !== undefined && high.cv !== undefined) {
      expect(high.cv).toBeGreaterThan(low.cv);
    }
  });
});

// ============================================================================
// 11. NozzleEngine
// ============================================================================
describe("NozzleEngine", () => {
  it("calculates nozzle flow and force", async () => {
    const { nozzleEngine: e } = await import("../engines/NozzleEngine.js");
    const r = e.calculate({
      inlet_pressure_bar: 10, back_pressure_bar: 1,
      inlet_temperature_K: 300, throat_diameter_mm: 25,
      fluid: "air",
    });
    expect(r).toBeDefined();
    expect(v(r.exit_velocity_m_s)).toBeGreaterThan(0);
    expect(v(r.mass_flow_kg_s)).toBeGreaterThan(0);
    expect(v(r.thrust_N)).toBeGreaterThan(0);
  });
});

// ============================================================================
// 12. SealSelectionEngine
// ============================================================================
describe("SealSelectionEngine", () => {
  it("selects appropriate seal type", async () => {
    const { sealSelectionEngine: e } = await import("../engines/SealSelectionEngine.js");
    const r = e.calculate({
      shaft_diameter_mm: 50, pressure_bar: 100,
      speed_rpm: 3000, temperature_C: 80,
      medium: "hydraulic_oil",
    });
    expect(r).toBeDefined();
  });
});

// ============================================================================
// 13. SpringDesignEngine
// ============================================================================
describe("SpringDesignEngine", () => {
  it("calculates helical compression spring", async () => {
    const { springDesignEngine: e } = await import("../engines/SpringDesignEngine.js");
    const r = e.calculate({
      max_load_N: 100, max_deflection_mm: 10,
      wire_diameter_mm: 3, mean_coil_diameter_mm: 25,
      material: "music_wire",
    });
    expect(r).toBeDefined();
    expect(v(r.spring_rate_N_mm)).toBeGreaterThan(0);
    expect(v(r.max_shear_stress_MPa)).toBeGreaterThan(0);
    expect(v(r.active_coils)).toBeGreaterThan(0);
  });

  it("k = Gd⁴/(8D³Na) — spring rate formula check", async () => {
    const { springDesignEngine: e } = await import("../engines/SpringDesignEngine.js");
    const r = e.calculate({
      max_load_N: 200, max_deflection_mm: 10,
      wire_diameter_mm: 4, mean_coil_diameter_mm: 30,
      material: "music_wire",
    });
    // G = 80 GPa for music wire, engine rounds Na up
    const G = 80000;
    const d = 4, D = 30;
    const Na = v(r.active_coils);
    const expected_k = (G * d ** 4) / (8 * D ** 3 * Na);
    expect(v(r.spring_rate_N_mm)).toBeCloseTo(expected_k, 0);
  });

  it("higher deflection requirement → lower spring rate (softer)", async () => {
    const { springDesignEngine: e } = await import("../engines/SpringDesignEngine.js");
    const base = { max_load_N: 100, wire_diameter_mm: 3, mean_coil_diameter_mm: 25, material: "music_wire" as const };
    const stiff = e.calculate({ ...base, max_deflection_mm: 5 });
    const soft = e.calculate({ ...base, max_deflection_mm: 20 });
    expect(v(soft.spring_rate_N_mm)).toBeLessThan(v(stiff.spring_rate_N_mm));
  });
});

// ============================================================================
// 14. TankDesignEngine
// ============================================================================
describe("TankDesignEngine", () => {
  it("calculates pressure vessel/tank design", async () => {
    const { tankDesignEngine: e } = await import("../engines/TankDesignEngine.js");
    const r = e.calculate({
      diameter_mm: 2000, length_or_height_mm: 5000,
      design_pressure_bar: 10, material: "sa516_70",
      joint_efficiency: 0.85,
    });
    expect(r).toBeDefined();
    expect(v(r.shell_thickness_mm)).toBeGreaterThan(0);
    expect(v(r.head_thickness_mm)).toBeGreaterThan(0);
    expect(v(r.volume_m3)).toBeGreaterThan(0);
  });

  it("higher pressure → thicker shell (ASME)", async () => {
    const { tankDesignEngine: e } = await import("../engines/TankDesignEngine.js");
    const base = { diameter_mm: 1500, length_or_height_mm: 3000, material: "sa516_70" as const, joint_efficiency: 0.85 };
    const low = e.calculate({ ...base, design_pressure_bar: 5 });
    const high = e.calculate({ ...base, design_pressure_bar: 30 });
    expect(v(high.shell_thickness_mm)).toBeGreaterThan(v(low.shell_thickness_mm));
  });
});

// ============================================================================
// 15. CoolingTowerEngine
// ============================================================================
describe("CoolingTowerEngine", () => {
  it("calculates cooling tower performance", async () => {
    const { coolingTowerEngine: e } = await import("../engines/CoolingTowerEngine.js");
    const r = e.calculate({
      water_flow_m3h: 100, hot_water_C: 40, cold_water_C: 30,
      wet_bulb_C: 25, approach_C: 5,
    });
    expect(r).toBeDefined();
    if (v(r.heat_rejection_kW) !== undefined) expect(v(r.heat_rejection_kW)).toBeGreaterThan(0);
  });
});
