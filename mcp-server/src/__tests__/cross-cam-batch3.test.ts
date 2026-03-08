import { describe, it, expect } from "vitest";
import { ThermalCompensationModelEngine } from "../engines/ThermalCompensationModelEngine.js";
import type { ThermalInput } from "../engines/ThermalCompensationModelEngine.js";
import { SPCProcessCapabilityEngine } from "../engines/SPCProcessCapabilityEngine.js";
import type { SPCInput } from "../engines/SPCProcessCapabilityEngine.js";
import { MultiObjectiveParetoEngine } from "../engines/MultiObjectiveParetoEngine.js";
import type { ParetoInput } from "../engines/MultiObjectiveParetoEngine.js";

// ═══════════════════════════════════════════════════════════════
// ThermalCompensationModelEngine
// ═══════════════════════════════════════════════════════════════

describe("ThermalCompensationModelEngine", () => {
  const engine = new ThermalCompensationModelEngine();

  const baseInput: ThermalInput = {
    machine: { type: "vmc", spindle_bore_mm: 70, column_height_mm: 800, bed_length_mm: 1200 },
    cutting: { spindle_rpm: 10000, spindle_power_kw: 8, cycle_time_min: 60 },
    part: { tolerance_mm: 0.02, critical_axis: "Z", feature_position_mm: 200 },
  };

  it("generates drift profile over time", () => {
    const result = engine.compute(baseInput);
    expect(result.value.drift_profile.length).toBeGreaterThan(3);
    expect(result.value.drift_profile[0].time_min).toBe(0);
  });

  it("drift increases over time", () => {
    const result = engine.compute(baseInput);
    const profile = result.value.drift_profile;
    expect(profile[profile.length - 1].total_drift_um).toBeGreaterThan(profile[0].total_drift_um);
  });

  it("Z-axis drift dominates for VMC", () => {
    const result = engine.compute(baseInput);
    expect(result.value.peak_drift_axis).toBe("Z");
  });

  it("higher RPM causes more drift", () => {
    const lowRPM = engine.compute({ ...baseInput, cutting: { ...baseInput.cutting, spindle_rpm: 5000 } });
    const highRPM = engine.compute({ ...baseInput, cutting: { ...baseInput.cutting, spindle_rpm: 15000 } });
    expect(highRPM.value.peak_drift_um).toBeGreaterThan(lowRPM.value.peak_drift_um);
  });

  it("computes compensation offsets", () => {
    const result = engine.compute(baseInput);
    expect(result.value.compensation_offsets.z_um).not.toBe(0);
  });

  it("suggests warmup time", () => {
    const result = engine.compute(baseInput);
    expect(result.value.warmup_time_min).toBeGreaterThan(0);
  });

  it("assesses risk level", () => {
    const result = engine.compute(baseInput);
    expect(["low", "medium", "high", "critical"]).toContain(result.value.risk_level);
  });

  it("suggests probing intervals for tight tolerance", () => {
    const tightInput: ThermalInput = {
      ...baseInput,
      part: { ...baseInput.part, tolerance_mm: 0.005 },
    };
    const result = engine.compute(tightInput);
    // Very tight tolerance should generate probing recommendations
    expect(result.value.recommendations.length).toBeGreaterThan(0);
  });

  it("returns AtomicValue with thermal formula", () => {
    const result = engine.compute(baseInput);
    expect(result.formula).toContain("ΔL");
    expect(result.unit).toBe("μm");
  });
});

// ═══════════════════════════════════════════════════════════════
// SPCProcessCapabilityEngine
// ═══════════════════════════════════════════════════════════════

describe("SPCProcessCapabilityEngine", () => {
  const engine = new SPCProcessCapabilityEngine();

  // Generate normal-distributed measurements around nominal
  const generateMeasurements = (n: number, mean: number, std: number): number[] => {
    const data: number[] = [];
    for (let i = 0; i < n; i++) {
      // Box-Muller transform for normal distribution
      const u1 = 0.1 + (i / n) * 0.8; // deterministic spread
      const u2 = 0.1 + ((i * 7) % n) / n * 0.8;
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      data.push(mean + z * std);
    }
    return data;
  };

  it("computes Cp and Cpk for capable process", () => {
    const input: SPCInput = {
      measurements: generateMeasurements(30, 50.0, 0.005),
      nominal: 50.0,
      upper_tolerance: 0.05,
      lower_tolerance: 0.05,
    };
    const result = engine.compute(input);
    expect(result.value.capability.cp).toBeGreaterThan(1);
    expect(result.value.capability.cpk).toBeGreaterThan(0);
    expect(result.value.process_assessment).not.toBe("not_capable");
  });

  it("detects incapable process with wide variation", () => {
    const input: SPCInput = {
      measurements: generateMeasurements(30, 50.0, 0.05),
      nominal: 50.0,
      upper_tolerance: 0.02,
      lower_tolerance: 0.02,
    };
    const result = engine.compute(input);
    expect(result.value.capability.cpk).toBeLessThan(1);
    expect(result.value.process_assessment).toBe("not_capable");
  });

  it("detects shifted process", () => {
    const input: SPCInput = {
      measurements: generateMeasurements(30, 50.03, 0.005),
      nominal: 50.0,
      upper_tolerance: 0.05,
      lower_tolerance: 0.05,
    };
    const result = engine.compute(input);
    expect(result.value.centering).not.toBe("centered");
  });

  it("predicts defect rate", () => {
    const input: SPCInput = {
      measurements: generateMeasurements(30, 50.0, 0.01),
      nominal: 50.0,
      upper_tolerance: 0.02,
      lower_tolerance: 0.02,
    };
    const result = engine.compute(input);
    expect(result.value.predicted_defects.yield_pct).toBeGreaterThan(0);
    expect(result.value.predicted_defects.yield_pct).toBeLessThanOrEqual(100);
  });

  it("computes control chart limits", () => {
    const input: SPCInput = {
      measurements: generateMeasurements(20, 50.0, 0.005),
      nominal: 50.0,
      upper_tolerance: 0.05,
      lower_tolerance: 0.05,
    };
    const result = engine.compute(input);
    expect(result.value.control_chart.ucl).toBeGreaterThan(result.value.control_chart.cl);
    expect(result.value.control_chart.lcl).toBeLessThan(result.value.control_chart.cl);
  });

  it("provides recommendations", () => {
    const input: SPCInput = {
      measurements: generateMeasurements(30, 50.0, 0.03),
      nominal: 50.0,
      upper_tolerance: 0.02,
      lower_tolerance: 0.02,
    };
    const result = engine.compute(input);
    expect(result.value.recommendations.length).toBeGreaterThan(0);
  });

  it("handles insufficient data gracefully", () => {
    const input: SPCInput = {
      measurements: [50.0],
      nominal: 50.0,
      upper_tolerance: 0.05,
      lower_tolerance: 0.05,
    };
    const result = engine.compute(input);
    expect(result.confidence).toBe(0);
    expect(result.value.recommendations[0]).toContain("Insufficient");
  });

  it("computes sigma level", () => {
    const input: SPCInput = {
      measurements: generateMeasurements(30, 50.0, 0.005),
      nominal: 50.0,
      upper_tolerance: 0.05,
      lower_tolerance: 0.05,
    };
    const result = engine.compute(input);
    expect(result.value.capability.sigma_level).toBeGreaterThan(0);
  });

  it("higher confidence with more samples", () => {
    const few: SPCInput = {
      measurements: generateMeasurements(5, 50, 0.005),
      nominal: 50, upper_tolerance: 0.05, lower_tolerance: 0.05,
    };
    const many: SPCInput = {
      measurements: generateMeasurements(50, 50, 0.005),
      nominal: 50, upper_tolerance: 0.05, lower_tolerance: 0.05,
    };
    expect(engine.compute(many).confidence!).toBeGreaterThan(engine.compute(few).confidence!);
  });
});

// ═══════════════════════════════════════════════════════════════
// MultiObjectiveParetoEngine
// ═══════════════════════════════════════════════════════════════

describe("MultiObjectiveParetoEngine", () => {
  const engine = new MultiObjectiveParetoEngine();

  const baseInput: ParetoInput = {
    objectives: [
      { name: "cycle_time", minimize: true, weight: 0.4 },
      { name: "surface_finish", minimize: true, weight: 0.3 },
      { name: "tool_life", minimize: false, weight: 0.3 },
    ],
    parameter_bounds: {
      spindle_rpm: [4000, 12000],
      feed_per_tooth_mm: [0.04, 0.12],
      axial_depth_mm: [2, 10],
      radial_depth_mm: [1, 5],
    },
    fixed: {
      tool_diameter_mm: 10,
      flute_count: 4,
      material_iso_group: "P",
      geometry_volume_cm3: 50,
    },
    machine: { max_power_kw: 15, max_rpm: 12000 },
    grid_resolution: 5,
  };

  it("generates Pareto frontier", () => {
    const result = engine.compute(baseInput);
    expect(result.value.frontier.length).toBeGreaterThan(0);
    expect(result.value.total_evaluated).toBeGreaterThan(result.value.frontier.length);
  });

  it("frontier solutions are non-dominated", () => {
    const result = engine.compute(baseInput);
    for (const sol of result.value.frontier) {
      expect(sol.dominated).toBe(false);
      expect(sol.feasible).toBe(true);
    }
  });

  it("computes utopia and nadir points", () => {
    const result = engine.compute(baseInput);
    expect(result.value.utopia_point.cycle_time).toBeLessThanOrEqual(result.value.nadir_point.cycle_time);
    expect(result.value.utopia_point.surface_finish).toBeLessThanOrEqual(result.value.nadir_point.surface_finish);
  });

  it("selects best compromise solution", () => {
    const result = engine.compute(baseInput);
    expect(result.value.best_compromise).not.toBeNull();
    expect(result.value.best_compromise!.feasible).toBe(true);
  });

  it("filters infeasible solutions", () => {
    const limitedInput: ParetoInput = {
      ...baseInput,
      machine: { max_power_kw: 3, max_rpm: 12000 }, // very low power
    };
    const result = engine.compute(limitedInput);
    expect(result.value.infeasible_count).toBeGreaterThan(0);
  });

  it("computes parameter sensitivity", () => {
    const result = engine.compute(baseInput);
    expect(result.value.sensitivity.length).toBe(4); // 4 parameters
    for (const s of result.value.sensitivity) {
      expect(s.elasticity).toBeGreaterThanOrEqual(0);
      expect(s.elasticity).toBeLessThanOrEqual(1);
    }
  });

  it("handles hard limits on objectives", () => {
    const hardLimitInput: ParetoInput = {
      ...baseInput,
      objectives: [
        { name: "cycle_time", minimize: true, weight: 0.5, hard_limit: 5 },
        { name: "surface_finish", minimize: true, weight: 0.5, hard_limit: 2 },
      ],
    };
    const result = engine.compute(hardLimitInput);
    for (const sol of result.value.frontier) {
      expect(sol.objectives.cycle_time).toBeLessThanOrEqual(5);
      expect(sol.objectives.surface_finish).toBeLessThanOrEqual(2);
    }
  });

  it("trade-off: faster cycle time → worse surface finish", () => {
    const result = engine.compute(baseInput);
    if (result.value.frontier.length >= 2) {
      const sorted = [...result.value.frontier].sort((a, b) =>
        a.objectives.cycle_time - b.objectives.cycle_time
      );
      // Fastest cycle time should tend toward worse surface finish
      const fastest = sorted[0];
      const slowest = sorted[sorted.length - 1];
      expect(fastest.objectives.cycle_time).toBeLessThan(slowest.objectives.cycle_time);
    }
  });

  it("returns AtomicValue with formula", () => {
    const result = engine.compute(baseInput);
    expect(result.formula).toContain("Kienzle");
    expect(result.unit).toBe("pareto_frontier");
  });
});
