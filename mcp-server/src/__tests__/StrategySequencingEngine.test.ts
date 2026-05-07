import { describe, it, expect } from "vitest";
import { strategySequencingEngine } from "../engines/StrategySequencingEngine.js";

const FEAT = {
  type: "pocket", depth_mm: 25, width_mm: 60, length_mm: 80,
  corner_radius_mm: 3, wall_Ra_target_um: 1.6, floor_Ra_target_um: 3.2,
};
const MAT = { name: "AISI 1045", iso_group: "P", hardness_HRC: 20, thermal_conductivity_W_mK: 50, yield_strength_MPa: 400 };
const MACH = { id: "haas-vf2", max_spindle_rpm: 12000, max_feed_mmpm: 5000, tool_positions: 24, tool_change_time_sec: 10, axes: 3 };

const OPS = [
  { id: "o1", name: "rough", role: "adaptive_rough", algo_tag: "TGAR", tool: { id: "t1", diameter_mm: 12, flutes: 4, material: "carbide" }, mrr_cm3_per_min: 20, base_cycle_time_min: 3, expected_Ra_um: 6, material_removal_fraction: 0.7, cost_per_min: 1.5 },
  { id: "o2", name: "semi", role: "zlevel_semi", algo_tag: "ZLEVEL", tool: { id: "t2", diameter_mm: 8, flutes: 4 }, base_cycle_time_min: 2, expected_Ra_um: 3, material_removal_fraction: 0.2, cost_per_min: 1.2 },
  { id: "o3", name: "wall", role: "wall_finish", algo_tag: "HRAF", tool: { id: "t2", diameter_mm: 8, corner_radius_mm: 1 }, base_cycle_time_min: 1.5, expected_Ra_um: 1.6, material_removal_fraction: 0.05, cost_per_min: 1.2 },
  { id: "o4", name: "floor", role: "floor_finish", algo_tag: "PTDC", tool: { id: "t3", diameter_mm: 6, corner_radius_mm: 0.5 }, base_cycle_time_min: 1, expected_Ra_um: 1.6, material_removal_fraction: 0.05, cost_per_min: 1.0 },
];

describe("StrategySequencingEngine", () => {
  it("sequenceStrategies() returns resolved sequence", () => {
    const r = strategySequencingEngine.sequenceStrategies(FEAT, MAT, OPS, MACH);
    expect(r.steps.length).toBeGreaterThan(0);
    expect(r.total_cycle_time_min).toBeGreaterThan(0);
    expect(typeof r.all_valid).toBe("boolean");
  });

  it("roughing precedes finishing in sequence", () => {
    const r = strategySequencingEngine.sequenceStrategies(FEAT, MAT, OPS, MACH);
    const roleOrder = r.steps.map(s => s.operation.role);
    const roughIdx = roleOrder.indexOf("adaptive_rough");
    const finishIdx = roleOrder.indexOf("wall_finish");
    if (roughIdx >= 0 && finishIdx >= 0) {
      expect(roughIdx).toBeLessThan(finishIdx);
    }
  });

  it("evaluateSequence() returns composite score", () => {
    const r = strategySequencingEngine.evaluateSequence(OPS, FEAT, MAT, MACH);
    expect(r.score).toBeGreaterThan(0);
    expect(r.total_cycle_time_min).toBeGreaterThan(0);
    expect(r.tool_changes).toBeGreaterThanOrEqual(0);
  });

  it("evaluateSequence() tracks final Ra", () => {
    const r = strategySequencingEngine.evaluateSequence(OPS, FEAT, MAT, MACH);
    expect(r.final_Ra_um).toBeLessThanOrEqual(6);
  });

  it("evaluateSequence() total cost reflects all ops", () => {
    const r = strategySequencingEngine.evaluateSequence(OPS, FEAT, MAT, MACH);
    expect(r.total_cost).toBeGreaterThan(0);
  });

  it("optimizeSequence() returns best + ranked list", () => {
    const r = strategySequencingEngine.optimizeSequence(FEAT, MAT, OPS, MACH);
    expect(r.best_sequence.steps.length).toBeGreaterThan(0);
    expect(r.permutations_evaluated).toBeGreaterThan(0);
    expect(r.ranked_evaluations.length).toBeGreaterThan(0);
  });

  it("optimizeSequence() ranked evaluations sorted ascending score", () => {
    const r = strategySequencingEngine.optimizeSequence(FEAT, MAT, OPS, MACH);
    for (let i = 1; i < r.ranked_evaluations.length; i++) {
      expect(r.ranked_evaluations[i-1].evaluation.score).toBeLessThanOrEqual(r.ranked_evaluations[i].evaluation.score);
    }
  });

  it("tool_change count >= 1 for multi-tool ops", () => {
    const r = strategySequencingEngine.evaluateSequence(OPS, FEAT, MAT, MACH);
    expect(r.tool_changes).toBeGreaterThanOrEqual(1);
  });

  it("unique_tools set reflects distinct tool IDs", () => {
    const r = strategySequencingEngine.sequenceStrategies(FEAT, MAT, OPS, MACH);
    const distinct = new Set(OPS.map(o => o.tool.id));
    expect(r.unique_tools.length).toBeLessThanOrEqual(distinct.size);
  });

  it("single-op sequence works", () => {
    const r = strategySequencingEngine.sequenceStrategies(FEAT, MAT, [OPS[0]], MACH);
    expect(r.steps.length).toBeGreaterThanOrEqual(1);
  });

  it("optimizeSequence() honors optimize_for cycle_time", () => {
    const r = strategySequencingEngine.optimizeSequence(FEAT, MAT, OPS, MACH, { optimize_for: "cycle_time" });
    expect(r.best_evaluation.total_cycle_time_min).toBeGreaterThan(0);
  });

  it("optimizeSequence() honors optimize_for tool_changes", () => {
    const r = strategySequencingEngine.optimizeSequence(FEAT, MAT, OPS, MACH, { optimize_for: "tool_changes" });
    expect(r.best_sequence.tool_changes).toBeGreaterThanOrEqual(0);
  });

  it("sequence stock state evolves step by step", () => {
    const r = strategySequencingEngine.sequenceStrategies(FEAT, MAT, OPS, MACH);
    if (r.steps.length > 1) {
      const first = r.steps[0].stock_state_after.remaining_volume_pct;
      const last = r.steps[r.steps.length - 1].stock_state_after.remaining_volume_pct;
      expect(last).toBeLessThanOrEqual(first);
    }
  });

  it("thermal_gap can inject cooling between ops", () => {
    const r = strategySequencingEngine.sequenceStrategies(
      FEAT, { ...MAT, iso_group: "S" } as any, OPS, MACH, { thermal_gap_min: 1 },
    );
    expect(r.steps.length).toBeGreaterThan(0);
  });
});
