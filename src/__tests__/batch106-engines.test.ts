/**
 * Batch 106: ToolMagazineOptimization, VibrationAssistedMachining, ErgonomicWorkstation
 */
import { describe, it, expect } from "vitest";
import { toolMagazineOptimizationEngine } from "../engines/ToolMagazineOptimizationEngine.js";
import { vibrationAssistedMachiningEngine } from "../engines/VibrationAssistedMachiningEngine.js";
import { ergonomicWorkstationEngine } from "../engines/ErgonomicWorkstationEngine.js";

describe("ToolMagazineOptimizationEngine", () => {
  it("total change time > 0", () => {
    const r = toolMagazineOptimizationEngine.calculate({});
    expect(r.total_change_time_s.value).toBeGreaterThan(0);
  });
  it("more tools = higher utilization", () => {
    const few = toolMagazineOptimizationEngine.calculate({ tools_required: 5, total_slots: 60 });
    const many = toolMagazineOptimizationEngine.calculate({ tools_required: 50, total_slots: 60 });
    expect(many.magazine_utilization_pct.value).toBeGreaterThan(few.magazine_utilization_pct.value);
  });
  it("optimization saves time vs sequential", () => {
    const r = toolMagazineOptimizationEngine.calculate({
      tools_required: 20,
      program_tool_sequence: [1,5,1,5,1,5,2,10,2,10,3,8,3,8],
    });
    expect(r.time_saved_vs_sequential_s.value).toBeGreaterThanOrEqual(0);
  });
  it("turret has fewer slots than chain", () => {
    const turret = toolMagazineOptimizationEngine.calculate({ magazine_type: "turret", tools_required: 5 });
    const chain = toolMagazineOptimizationEngine.calculate({ magazine_type: "chain", tools_required: 5 });
    expect(turret.avg_index_time_s.value).not.toBe(chain.avg_index_time_s.value);
  });
  it("sister tool calculates slots needed", () => {
    const r = toolMagazineOptimizationEngine.calculate({
      sister_tool_enabled: true,
      tool_lives_min: [10, 200, 10],
      tools_required: 3,
    });
    expect(r.sister_tool_slots_needed.value).toBeGreaterThan(0);
  });
  it("returns recommendations", () => {
    const r = toolMagazineOptimizationEngine.calculate({});
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});

describe("VibrationAssistedMachiningEngine", () => {
  it("force reduction > 0", () => {
    const r = vibrationAssistedMachiningEngine.calculate({});
    expect(r.force_reduction_pct.value).toBeGreaterThan(0);
  });
  it("elliptical mode gives more force reduction than linear", () => {
    const lin = vibrationAssistedMachiningEngine.calculate({ mode: "ultrasonic_linear" });
    const ell = vibrationAssistedMachiningEngine.calculate({ mode: "ultrasonic_elliptical" });
    expect(ell.force_reduction_pct.value).toBeGreaterThan(lin.force_reduction_pct.value);
  });
  it("low speed gives intermittent cutting", () => {
    const r = vibrationAssistedMachiningEngine.calculate({
      cutting_speed_m_min: 5,
      frequency_Hz: 20000,
      amplitude_um: 15,
    });
    expect(r.is_intermittent_cutting).toBe(true);
    expect(r.duty_cycle_pct.value).toBeLessThan(100);
  });
  it("titanium benefits more than aluminum", () => {
    const ti = vibrationAssistedMachiningEngine.calculate({ workpiece: "titanium" });
    const al = vibrationAssistedMachiningEngine.calculate({ workpiece: "aluminum" });
    expect(ti.tool_life_multiplier.value).toBeGreaterThan(al.tool_life_multiplier.value);
  });
  it("power consumption > 0", () => {
    const r = vibrationAssistedMachiningEngine.calculate({});
    expect(r.power_consumption_W.value).toBeGreaterThan(0);
  });
  it("chip breaking effectiveness 0-1", () => {
    const r = vibrationAssistedMachiningEngine.calculate({});
    expect(r.chip_breaking_effectiveness.value).toBeGreaterThanOrEqual(0);
    expect(r.chip_breaking_effectiveness.value).toBeLessThanOrEqual(1);
  });
});

describe("ErgonomicWorkstationEngine", () => {
  it("RULA score 1-7", () => {
    const r = ergonomicWorkstationEngine.calculate({});
    expect(r.rula_score.value).toBeGreaterThanOrEqual(1);
    expect(r.rula_score.value).toBeLessThanOrEqual(7);
  });
  it("heavier load increases lifting index", () => {
    const light = ergonomicWorkstationEngine.calculate({ load_weight_kg: 5 });
    const heavy = ergonomicWorkstationEngine.calculate({ load_weight_kg: 30 });
    expect(heavy.lifting_index.value).toBeGreaterThan(light.lifting_index.value);
  });
  it("optimal workstation height scales with worker height", () => {
    const short = ergonomicWorkstationEngine.calculate({ worker_height_cm: 160 });
    const tall = ergonomicWorkstationEngine.calculate({ worker_height_cm: 195 });
    expect(tall.optimal_workstation_height_cm.value).toBeGreaterThan(short.optimal_workstation_height_cm.value);
  });
  it("material handling has highest REBA base", () => {
    const mh = ergonomicWorkstationEngine.calculate({ task: "material_handling" });
    const op = ergonomicWorkstationEngine.calculate({ task: "cnc_operation" });
    expect(mh.reba_score.value).toBeGreaterThan(op.reba_score.value);
  });
  it("fatigue increases with shift duration", () => {
    const short = ergonomicWorkstationEngine.calculate({ shift_duration_h: 4 });
    const long = ergonomicWorkstationEngine.calculate({ shift_duration_h: 12 });
    expect(long.fatigue_pct_end_shift.value).toBeGreaterThan(short.fatigue_pct_end_shift.value);
  });
  it("returns recommendations", () => {
    const r = ergonomicWorkstationEngine.calculate({ load_weight_kg: 30, horizontal_reach_cm: 70 });
    expect(r.recommendations.length).toBeGreaterThan(0);
  });
});
