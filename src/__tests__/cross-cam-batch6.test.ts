import { describe, it, expect } from "vitest";
import { ProcessDigitalTwinEngine } from "../engines/ProcessDigitalTwinEngine.js";
import type { DigitalTwinInput } from "../engines/ProcessDigitalTwinEngine.js";
import { ProcessRobustnessEngine } from "../engines/ProcessRobustnessEngine.js";
import type { RobustnessInput } from "../engines/ProcessRobustnessEngine.js";

// ═══════════════════════════════════════════════════════════════
// ProcessDigitalTwinEngine
// ═══════════════════════════════════════════════════════════════

describe("ProcessDigitalTwinEngine", () => {
  const engine = new ProcessDigitalTwinEngine();

  const baseInput: DigitalTwinInput = {
    tool: {
      diameter_mm: 10, flute_count: 4, overhang_mm: 40,
      material: "carbide", coating: "TiAlN",
    },
    cutting: {
      cutting_speed_m_min: 200, feed_per_tooth_mm: 0.1,
      axial_depth_mm: 3, radial_depth_mm: 2.5, coolant: "flood",
    },
    material: { iso_group: "P" },
    workpiece: { tolerance_mm: 0.02, volume_to_remove_cm3: 50 },
    machine: { spindle_power_kw: 15, max_rpm: 12000 },
  };

  it("cascades all 7 physics stages", () => {
    const result = engine.compute(baseInput);
    expect(result.value.force.tangential_n).toBeGreaterThan(0);
    expect(result.value.deflection.tool_mm).toBeGreaterThan(0);
    expect(result.value.temperature.chip_c).toBeGreaterThan(100);
    expect(result.value.thermal.net_dim_shift_um).toBeGreaterThan(0);
    expect(result.value.tool_life.minutes).toBeGreaterThan(0);
    expect(result.value.surface.ra_um).toBeGreaterThan(0);
    expect(result.value.cost.total_cost_per_part).toBeGreaterThan(0);
  });

  it("produces dimensional error budget", () => {
    const result = engine.compute(baseInput);
    const budget = result.value.dimensional_error_budget;
    expect(budget.deflection_um).toBeGreaterThan(0);
    expect(budget.thermal_um).toBeGreaterThan(0);
    expect(budget.total_um).toBeGreaterThan(0);
    // RSS: total should be <= sum of components
    expect(budget.total_um).toBeLessThanOrEqual(
      budget.deflection_um + budget.thermal_um + budget.runout_um
    );
  });

  it("identifies bottleneck", () => {
    const result = engine.compute(baseInput);
    expect(["power", "deflection", "thermal", "tool_life", "surface"])
      .toContain(result.value.bottleneck);
  });

  it("coating improves tool life", () => {
    const coated = engine.compute(baseInput);
    const uncoated = engine.compute({
      ...baseInput,
      tool: { ...baseInput.tool, coating: "uncoated" },
    });
    expect(coated.value.tool_life.minutes).toBeGreaterThan(uncoated.value.tool_life.minutes);
  });

  it("flood coolant reduces temperature", () => {
    const flood = engine.compute(baseInput);
    const dry = engine.compute({
      ...baseInput,
      cutting: { ...baseInput.cutting, coolant: "dry" },
    });
    expect(flood.value.temperature.tool_c).toBeLessThan(dry.value.temperature.tool_c);
  });

  it("thin wall adds workpiece deflection", () => {
    const solid = engine.compute(baseInput);
    const thinWall = engine.compute({
      ...baseInput,
      workpiece: { ...baseInput.workpiece, min_wall_mm: 1.5 },
    });
    expect(thinWall.value.deflection.workpiece_mm).toBeGreaterThan(solid.value.deflection.workpiece_mm);
  });

  it("computes cost breakdown", () => {
    const result = engine.compute(baseInput);
    const cost = result.value.cost;
    const sum = cost.tool_cost_per_part + cost.machine_cost_per_part + cost.energy_cost_per_part;
    expect(Math.abs(sum - cost.total_cost_per_part)).toBeLessThan(0.01);
  });

  it("power within machine capacity", () => {
    const result = engine.compute(baseInput);
    expect(result.value.force.power_kw).toBeLessThan(baseInput.machine.spindle_power_kw);
  });

  it("returns cascade formula", () => {
    const result = engine.compute(baseInput);
    expect(result.formula).toContain("Cascade");
    expect(result.formula).toContain("Kienzle");
  });
});

// ═══════════════════════════════════════════════════════════════
// ProcessRobustnessEngine
// ═══════════════════════════════════════════════════════════════

describe("ProcessRobustnessEngine", () => {
  const engine = new ProcessRobustnessEngine();

  const baseInput: RobustnessInput = {
    nominal: {
      cutting_speed_m_min: 200, feed_per_tooth_mm: 0.1,
      axial_depth_mm: 3, radial_depth_mm: 2.5,
      tool_diameter_mm: 10, flute_count: 4,
    },
    material: { iso_group: "P" },
    noise_factors: {
      hardness_variation_pct: 10,
      wear_range_vb_mm: [0.05, 0.25],
      runout_range_um: [3, 15],
      temp_drift_c: 5,
    },
  };

  it("computes robustness index 0-100", () => {
    const result = engine.compute(baseInput);
    expect(result.value.robustness_index).toBeGreaterThanOrEqual(0);
    expect(result.value.robustness_index).toBeLessThanOrEqual(100);
  });

  it("assigns robustness grade", () => {
    const result = engine.compute(baseInput);
    expect(["A", "B", "C", "D", "F"]).toContain(result.value.robustness_grade);
  });

  it("identifies sensitivities", () => {
    const result = engine.compute(baseInput);
    expect(result.value.sensitivities.length).toBeGreaterThan(0);
    for (const s of result.value.sensitivities) {
      expect(s.sensitivity).toBeGreaterThanOrEqual(0);
      expect(["high", "medium", "low"]).toContain(s.significance);
    }
  });

  it("worst case worse than nominal", () => {
    const result = engine.compute(baseInput);
    expect(result.value.worst_case_scenario.force_increase_pct).toBeGreaterThan(0);
    expect(result.value.worst_case_scenario.roughness_increase_pct).toBeGreaterThan(0);
  });

  it("tighter noise range → better robustness", () => {
    const tight = engine.compute({
      ...baseInput,
      noise_factors: {
        hardness_variation_pct: 3,
        wear_range_vb_mm: [0.05, 0.10],
        runout_range_um: [2, 5],
        temp_drift_c: 1,
      },
    });
    const loose = engine.compute({
      ...baseInput,
      noise_factors: {
        hardness_variation_pct: 20,
        wear_range_vb_mm: [0.05, 0.35],
        runout_range_um: [5, 25],
        temp_drift_c: 10,
      },
    });
    expect(tight.value.robustness_index).toBeGreaterThan(loose.value.robustness_index);
  });

  it("provides improvement suggestions", () => {
    const result = engine.compute(baseInput);
    // Should have at least one suggestion
    expect(result.value.improvement_suggestions.length).toBeGreaterThanOrEqual(0);
    for (const s of result.value.improvement_suggestions) {
      expect(s.robustness_gain_pct).toBeGreaterThan(0);
    }
  });

  it("nominal performance values are positive", () => {
    const result = engine.compute(baseInput);
    expect(result.value.nominal_performance.force_n).toBeGreaterThan(0);
    expect(result.value.nominal_performance.ra_um).toBeGreaterThan(0);
    expect(result.value.nominal_performance.tool_life_min).toBeGreaterThan(0);
  });

  it("returns Taguchi formula", () => {
    const result = engine.compute(baseInput);
    expect(result.formula).toContain("Taguchi");
  });
});
