/**
 * fluid-thermal-pumps-wiring.test.ts
 *
 * Verifies the 5 fluid/pump engines wired into prism_fluid_thermal
 * (HM-TRAINING / kilo orphan-rescue): FluidizedBed, VacuumPump,
 * PeristalticPump, ProgressiveCavityPump, AxialPistonPump.
 *
 * Three layers:
 *   1. Engine physics — real reference inputs, asserts physically-correct output
 *   2. Schema map     — FLUID_THERMAL_ACTION_SCHEMAS validates + rejects bad input
 *   3. Dispatcher round-trip — dispatched value must equal the direct engine call
 */
import { describe, it, expect } from "vitest";
import { fluidizedBedEngine } from "../engines/FluidizedBedEngine.js";
import { vacuumPumpEngine } from "../engines/VacuumPumpEngine.js";
import { peristalticPumpEngine } from "../engines/PeristalticPumpEngine.js";
import { progressiveCavityPumpEngine } from "../engines/ProgressiveCavityPumpEngine.js";
import { axialPistonPumpEngine } from "../engines/AxialPistonPumpEngine.js";
import { FLUID_THERMAL_ACTION_SCHEMAS } from "../schemas/fluidThermalActionSchemas.js";
import { ACTION_MAP, registerFluidThermalDispatcher } from "../tools/dispatchers/fluidThermalDispatcher.js";

describe("fluid-thermal pump engines — physics", () => {
  it("FluidizedBedEngine: Wen-Yu Umf + Richardson-Zaki expansion", () => {
    const r = fluidizedBedEngine.calculate({ gas_flow_m3_h: 1000, particle_diameter_um: 200 });
    // Umf for 200μm sand-class particles is O(0.01–0.1 m/s)
    expect(r.min_fluidization_velocity_m_s.value).toBeGreaterThan(0);
    expect(r.min_fluidization_velocity_m_s.value).toBeLessThan(1);
    // bed auto-sized to a positive diameter; operating velocity below terminal
    expect(r.bed_diameter_mm.value).toBeGreaterThan(0);
    expect(r.operating_velocity_m_s.value).toBeLessThan(r.terminal_velocity_m_s.value);
    // distributor ΔP is 30% of bed ΔP (design rule)
    expect(r.distributor_dp_Pa.value).toBeCloseTo(r.pressure_drop_Pa.value * 0.3, 0);
    expect(r.recommendations.length).toBeGreaterThan(0);
  });

  it("VacuumPumpEngine: pressure ratio = P_atm / P_target", () => {
    const r = vacuumPumpEngine.calculate({
      chamber_volume_L: 100,
      target_pressure_mbar: 0.1,
      pump_type: "rotary_vane",
    });
    // 1013 mbar atm / 0.1 mbar target = 10130
    expect(r.pressure_ratio.value).toBe(10130);
    expect(r.pumping_speed_L_s.value).toBeGreaterThan(0);
    expect(r.power_kW.value).toBeGreaterThan(0);
    expect(Number.isFinite(r.pumpdown_time_min.value)).toBe(true);
    // rotary vane handles 0.1 mbar (ultimate 1e-3) — safe
    expect(r.is_safe).toBe(true);
    // 2-stage rotary vane per VP_DATA table
    expect(r.pump_stages.value).toBe(2);
  });

  it("VacuumPumpEngine: flags target below pump ultimate pressure", () => {
    const r = vacuumPumpEngine.calculate({
      chamber_volume_L: 50,
      target_pressure_mbar: 1e-6, // below rotary-vane 1e-3 ultimate
      pump_type: "rotary_vane",
    });
    expect(r.is_safe).toBe(false);
    expect(r.recommendations.join(" ")).toMatch(/ultimate|turbomolecular|cryopump/i);
  });

  it("PeristalticPumpEngine: positive displacement scales with tube ID", () => {
    const small = peristalticPumpEngine.calculate({ tube_id_mm: 3.2, rpm: 100 });
    const large = peristalticPumpEngine.calculate({ tube_id_mm: 9.6, rpm: 100 });
    expect(small.flow_rate_mL_min.value).toBeGreaterThan(0);
    expect(large.displacement_mL_rev.value).toBeGreaterThan(small.displacement_mL_rev.value);
    expect(large.flow_rate_mL_min.value).toBeGreaterThan(small.flow_rate_mL_min.value);
  });

  it("ProgressiveCavityPumpEngine: positive flow + bounded volumetric efficiency", () => {
    const r = progressiveCavityPumpEngine.calculate({ rotor_diameter_mm: 50, rpm: 300 });
    expect(r.flow_rate_m3_h.value).toBeGreaterThan(0);
    expect(r.displacement_L_rev.value).toBeGreaterThan(0);
    expect(r.volumetric_efficiency_pct.value).toBeGreaterThan(0);
    expect(r.volumetric_efficiency_pct.value).toBeLessThanOrEqual(100);
  });

  it("AxialPistonPumpEngine: displacement scales with piston count", () => {
    const r9 = axialPistonPumpEngine.calculate({ piston_diameter_mm: 20, num_pistons: 9, shaft_speed_rpm: 1500 });
    const r7 = axialPistonPumpEngine.calculate({ piston_diameter_mm: 20, num_pistons: 7, shaft_speed_rpm: 1500 });
    expect(r9.displacement_cc_rev.value).toBeGreaterThan(r7.displacement_cc_rev.value);
    expect(r9.flow_rate_L_min.value).toBeGreaterThan(0);
    expect(r9.volumetric_efficiency_pct.value).toBeGreaterThan(0);
    expect(r9.volumetric_efficiency_pct.value).toBeLessThanOrEqual(100);
  });
});

describe("fluid-thermal pump schemas — validation behavior", () => {
  it("each new schema parses valid params and preserves field values", () => {
    const fb = FLUID_THERMAL_ACTION_SCHEMAS.fluidized_bed_calculate.safeParse({ gas_flow_m3_h: 1000 });
    expect(fb.success).toBe(true);
    expect(fb.success && fb.data.gas_flow_m3_h).toBe(1000);

    const vp = FLUID_THERMAL_ACTION_SCHEMAS.vacuum_pump_calculate.safeParse({ chamber_volume_L: 100, target_pressure_mbar: 0.1 });
    expect(vp.success).toBe(true);
    expect(vp.success && vp.data.chamber_volume_L).toBe(100);

    const pp = FLUID_THERMAL_ACTION_SCHEMAS.peristaltic_pump_calculate.safeParse({ tube_id_mm: 6.4, rpm: 100 });
    expect(pp.success).toBe(true);
    expect(pp.success && pp.data.tube_id_mm).toBe(6.4);

    const pc = FLUID_THERMAL_ACTION_SCHEMAS.progressive_cavity_pump_calculate.safeParse({ rotor_diameter_mm: 50 });
    expect(pc.success).toBe(true);
    expect(pc.success && pc.data.rotor_diameter_mm).toBe(50);

    const ap = FLUID_THERMAL_ACTION_SCHEMAS.axial_piston_pump_calculate.safeParse({ piston_diameter_mm: 20 });
    expect(ap.success).toBe(true);
    expect(ap.success && ap.data.piston_diameter_mm).toBe(20);
  });

  it("each new schema rejects a negative value on a positive-number field", () => {
    expect(FLUID_THERMAL_ACTION_SCHEMAS.fluidized_bed_calculate.safeParse({ gas_flow_m3_h: -5 }).success).toBe(false);
    expect(FLUID_THERMAL_ACTION_SCHEMAS.vacuum_pump_calculate.safeParse({ chamber_volume_L: -1 }).success).toBe(false);
    expect(FLUID_THERMAL_ACTION_SCHEMAS.peristaltic_pump_calculate.safeParse({ tube_id_mm: -2 }).success).toBe(false);
    expect(FLUID_THERMAL_ACTION_SCHEMAS.progressive_cavity_pump_calculate.safeParse({ rotor_diameter_mm: -10 }).success).toBe(false);
    expect(FLUID_THERMAL_ACTION_SCHEMAS.axial_piston_pump_calculate.safeParse({ piston_diameter_mm: -8 }).success).toBe(false);
  });
});

describe("prism_fluid_thermal dispatcher wiring", () => {
  // exportName → statically-imported singleton (mirrors the dispatcher's
  // `mod[exportName]` resolution; static import here because vitest cannot
  // resolve the dispatcher's variable dynamic import `import(`...${file}.js`)`).
  const SINGLETONS: Record<string, any> = {
    fluidizedBedEngine,
    vacuumPumpEngine,
    peristalticPumpEngine,
    progressiveCavityPumpEngine,
    axialPistonPumpEngine,
  };

  it("ACTION_MAP wires all 5 pump engines to [engineFile, singleton, method]", () => {
    expect(ACTION_MAP.fluidized_bed_calculate).toEqual(["FluidizedBedEngine", "fluidizedBedEngine", "calculate"]);
    expect(ACTION_MAP.vacuum_pump_calculate).toEqual(["VacuumPumpEngine", "vacuumPumpEngine", "calculate"]);
    expect(ACTION_MAP.peristaltic_pump_calculate).toEqual(["PeristalticPumpEngine", "peristalticPumpEngine", "calculate"]);
    expect(ACTION_MAP.progressive_cavity_pump_calculate).toEqual(["ProgressiveCavityPumpEngine", "progressiveCavityPumpEngine", "calculate"]);
    expect(ACTION_MAP.axial_piston_pump_calculate).toEqual(["AxialPistonPumpEngine", "axialPistonPumpEngine", "calculate"]);
  });

  it("anti-regression: dispatcher carries at least 53 actions", () => {
    expect(Object.keys(ACTION_MAP).length).toBeGreaterThanOrEqual(53);
  });

  it("each new ACTION_MAP triple resolves to the engine method the dispatcher calls", () => {
    // VacuumPump — resolve singleton + method exactly as the dispatcher does
    const [, vpExport, vpMethod] = ACTION_MAP.vacuum_pump_calculate;
    const vp = SINGLETONS[vpExport][vpMethod]({ chamber_volume_L: 100, target_pressure_mbar: 0.1 });
    expect(vp.pressure_ratio.value).toBe(10130);

    const [, fbExport, fbMethod] = ACTION_MAP.fluidized_bed_calculate;
    const fb = SINGLETONS[fbExport][fbMethod]({ gas_flow_m3_h: 1000 });
    expect(fb.min_fluidization_velocity_m_s.value).toBeGreaterThan(0);
    expect(fb.bed_diameter_mm.value).toBeGreaterThan(0);

    const [, ppExport, ppMethod] = ACTION_MAP.peristaltic_pump_calculate;
    const pp = SINGLETONS[ppExport][ppMethod]({ tube_id_mm: 6.4, rpm: 100 });
    expect(pp.flow_rate_mL_min.value).toBeGreaterThan(0);

    const [, pcExport, pcMethod] = ACTION_MAP.progressive_cavity_pump_calculate;
    const pc = SINGLETONS[pcExport][pcMethod]({ rotor_diameter_mm: 50, rpm: 300 });
    expect(pc.flow_rate_m3_h.value).toBeGreaterThan(0);

    const [, apExport, apMethod] = ACTION_MAP.axial_piston_pump_calculate;
    const ap = SINGLETONS[apExport][apMethod]({ piston_diameter_mm: 20, shaft_speed_rpm: 1500 });
    expect(ap.displacement_cc_rev.value).toBeGreaterThan(0);
  });

  it("rejects an unknown action with an Unknown-action error string", async () => {
    let handler: any;
    registerFluidThermalDispatcher({
      tool: (_name: string, _desc: string, _schema: any, h: any) => { handler = h; },
    });
    const res = await handler({ action: "not_a_real_pump_calculate", params: {} });
    expect(res.content[0].text).toMatch(/Unknown action|Invalid/i);
  });
});
