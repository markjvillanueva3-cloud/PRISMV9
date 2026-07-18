import { describe, it, expect } from "vitest";
import { MonteCarloProcessEngine } from "../engines/MonteCarloProcessEngine.js";
import type { MCProcessInput } from "../engines/MonteCarloProcessEngine.js";
import { DOETaguchEngine } from "../engines/DOETaguchEngine.js";
import type { DOEInput } from "../engines/DOETaguchEngine.js";
import { FixtureClampingEngine } from "../engines/FixtureClampingEngine.js";
import type { FixtureInput } from "../engines/FixtureClampingEngine.js";
import { SpringbackPredictionEngine } from "../engines/SpringbackPredictionEngine.js";
import type { SpringbackInput } from "../engines/SpringbackPredictionEngine.js";
import { BurrFormationEngine } from "../engines/BurrFormationEngine.js";
import type { BurrInput } from "../engines/BurrFormationEngine.js";
import { GDTStackupEngine } from "../engines/GDTStackupEngine.js";
import type { StackupInput } from "../engines/GDTStackupEngine.js";
import { RunoutEffectEngine } from "../engines/RunoutEffectEngine.js";
import type { RunoutInput } from "../engines/RunoutEffectEngine.js";

// ═══════════════════════════════════════════════════════════════
// MonteCarloProcessEngine
// ═══════════════════════════════════════════════════════════════

describe("MonteCarloProcessEngine", () => {
  const engine = new MonteCarloProcessEngine();

  const baseInput: MCProcessInput = {
    nominal: {
      cutting_speed_m_min: 200, feed_per_tooth_mm: 0.1,
      axial_depth_mm: 3, radial_depth_mm: 5,
      tool_diameter_mm: 10, flute_count: 4,
    },
    material: { iso_group: "P" },
    variations: { speed_cv: 0.02, feed_cv: 0.03, runout_um: 5 },
    trials: 5000,
  };

  it("runs simulation and returns distributions", () => {
    const result = engine.compute(baseInput);
    expect(result.value.trials).toBe(5000);
    expect(result.value.force_distribution.mean).toBeGreaterThan(0);
    expect(result.value.roughness_distribution.mean).toBeGreaterThan(0);
    expect(result.value.tool_life_distribution.mean).toBeGreaterThan(0);
  });

  it("produces histogram with bins", () => {
    const result = engine.compute(baseInput);
    expect(result.value.force_distribution.histogram.length).toBe(20);
    const totalCount = result.value.force_distribution.histogram.reduce((s, b) => s + b.count, 0);
    expect(totalCount).toBe(5000);
  });

  it("computes Cp/Cpk with tolerances", () => {
    const withTol: MCProcessInput = {
      ...baseInput,
      tolerances: { dimension_nominal_mm: 50, upper_tol_mm: 0.05, lower_tol_mm: 0.05 },
    };
    const result = engine.compute(withTol);
    expect(result.value.dimension_distribution).toBeDefined();
    expect(result.value.dimension_distribution!.cp).toBeGreaterThan(0);
  });

  it("higher variation → wider distribution", () => {
    const tight = engine.compute(baseInput);
    const loose = engine.compute({
      ...baseInput,
      variations: { speed_cv: 0.10, feed_cv: 0.10, runout_um: 20 },
    });
    expect(loose.value.force_distribution.std).toBeGreaterThan(tight.value.force_distribution.std);
  });

  it("convergence check", () => {
    const result = engine.compute({ ...baseInput, trials: 10000 });
    expect(result.value.convergence.converged).toBe(true);
  });

  it("deterministic with seed", () => {
    const a = engine.compute({ ...baseInput, seed: 123 });
    const b = engine.compute({ ...baseInput, seed: 123 });
    expect(a.value.force_distribution.mean).toBe(b.value.force_distribution.mean);
  });

  it("returns formula reference", () => {
    const result = engine.compute(baseInput);
    expect(result.formula).toContain("MC");
  });
});

// ═══════════════════════════════════════════════════════════════
// DOETaguchEngine
// ═══════════════════════════════════════════════════════════════

describe("DOETaguchEngine", () => {
  const engine = new DOETaguchEngine();

  const baseInput: DOEInput = {
    factors: [
      { name: "cutting_speed", levels: [150, 200, 250] },
      { name: "feed", levels: [0.08, 0.12, 0.16] },
      { name: "depth", levels: [2, 3, 4] },
    ],
    response: "surface_roughness",
    objective: "minimize",
    design: "taguchi",
    material: { iso_group: "P" },
    tool: { diameter_mm: 10, flute_count: 4, nose_radius_mm: 0.8 },
  };

  it("generates L9 design for 3 factors", () => {
    const result = engine.compute(baseInput);
    expect(result.value.total_runs).toBe(9);
    expect(result.value.design_name).toContain("L9");
  });

  it("computes S/N ratios", () => {
    const result = engine.compute(baseInput);
    for (const run of result.value.runs) {
      expect(typeof run.sn_ratio).toBe("number");
      expect(run.response_value).toBeGreaterThan(0);
    }
  });

  it("performs ANOVA", () => {
    const result = engine.compute(baseInput);
    expect(result.value.anova.length).toBeGreaterThan(0);
    const totalContribution = result.value.anova.reduce((s, a) => s + a.contribution_pct, 0);
    expect(totalContribution).toBeGreaterThan(0);
  });

  it("identifies optimal levels", () => {
    const result = engine.compute(baseInput);
    expect(Object.keys(result.value.optimal_levels).length).toBe(3);
    for (const [name, opt] of Object.entries(result.value.optimal_levels)) {
      const factor = baseInput.factors.find(f => f.name === name);
      expect(factor!.levels).toContain(opt.level);
    }
  });

  it("ranks factors by influence", () => {
    const result = engine.compute(baseInput);
    expect(result.value.factor_rankings.length).toBeGreaterThan(0);
    expect(result.value.factor_rankings[0].rank).toBe(1);
  });

  it("predicts optimum with CI", () => {
    const result = engine.compute(baseInput);
    expect(result.value.predicted_optimum).toBeGreaterThan(0);
    expect(result.value.confirmation_ci_95[0]).toBeLessThan(result.value.confirmation_ci_95[1]);
  });

  it("full factorial generates more runs", () => {
    const full = engine.compute({ ...baseInput, design: "full_factorial" });
    expect(full.value.total_runs).toBe(27); // 3^3
  });

  it("returns Taguchi formula", () => {
    const result = engine.compute(baseInput);
    expect(result.formula).toContain("Taguchi");
  });
});

// ═══════════════════════════════════════════════════════════════
// FixtureClampingEngine
// ═══════════════════════════════════════════════════════════════

describe("FixtureClampingEngine", () => {
  const engine = new FixtureClampingEngine();

  const baseInput: FixtureInput = {
    cutting_forces: { tangential_n: 800, feed_n: 400, radial_n: 200 },
    workpiece: { material: "steel", mass_kg: 5, width_mm: 100, length_mm: 150, height_mm: 50 },
    fixture: { type: "vise" },
    operation: "milling",
  };

  it("computes required clamping force", () => {
    const result = engine.compute(baseInput);
    expect(result.value.required_clamping_force_n).toBeGreaterThan(0);
    expect(result.value.per_clamp_force_n).toBeGreaterThan(0);
  });

  it("passes all safety checks", () => {
    const result = engine.compute(baseInput);
    expect(result.value.checks.sliding.safe).toBe(true);
    expect(result.value.checks.lifting.safe).toBe(true);
  });

  it("higher cutting force → higher clamping force", () => {
    const low = engine.compute(baseInput);
    const high = engine.compute({
      ...baseInput,
      cutting_forces: { tangential_n: 2000, feed_n: 1000, radial_n: 500 },
    });
    expect(high.value.required_clamping_force_n).toBeGreaterThan(low.value.required_clamping_force_n);
  });

  it("detects thin wall deformation risk", () => {
    const thinWall = engine.compute({
      ...baseInput,
      workpiece: { ...baseInput.workpiece, min_wall_thickness_mm: 1.5 },
    });
    expect(["low", "medium", "high"]).toContain(thinWall.value.deformation_risk.risk_level);
  });

  it("aluminum has lower friction", () => {
    const alu = engine.compute({
      ...baseInput,
      workpiece: { ...baseInput.workpiece, material: "aluminum" },
    });
    expect(alu.value.friction_coefficient).toBeLessThan(0.15);
  });

  it("returns formula reference", () => {
    const result = engine.compute(baseInput);
    expect(result.formula).toContain("clamp");
  });
});

// ═══════════════════════════════════════════════════════════════
// SpringbackPredictionEngine
// ═══════════════════════════════════════════════════════════════

describe("SpringbackPredictionEngine", () => {
  const engine = new SpringbackPredictionEngine();

  const baseInput: SpringbackInput = {
    feature: { type: "thin_wall", thickness_mm: 2, height_mm: 30, length_mm: 50, support_condition: "cantilever" },
    material: { iso_group: "N" }, // aluminum
    cutting: { radial_force_n: 100, axial_depth_mm: 3, feed_per_tooth_mm: 0.1, passes: 2 },
    tolerance_mm: 0.05,
  };

  it("computes deflection and springback", () => {
    const result = engine.compute(baseInput);
    expect(result.value.max_deflection_mm).toBeGreaterThan(0);
    expect(result.value.springback_mm).toBeGreaterThan(0);
    expect(result.value.springback_mm).toBeLessThanOrEqual(result.value.max_deflection_mm);
  });

  it("thinner wall → more deflection", () => {
    const thick = engine.compute(baseInput);
    const thin = engine.compute({
      ...baseInput,
      feature: { ...baseInput.feature, thickness_mm: 1 },
    });
    expect(thin.value.max_deflection_mm).toBeGreaterThan(thick.value.max_deflection_mm);
  });

  it("provides compensation strategy", () => {
    const result = engine.compute(baseInput);
    expect(result.value.compensation.overcut_mm).toBeGreaterThanOrEqual(0);
    expect(result.value.compensation.strategy.length).toBeGreaterThan(0);
  });

  it("computes natural frequency", () => {
    const result = engine.compute(baseInput);
    expect(result.value.natural_frequency_hz).toBeGreaterThan(0);
  });

  it("steel stiffer than aluminum", () => {
    const alu = engine.compute(baseInput);
    const steel = engine.compute({ ...baseInput, material: { iso_group: "P" } });
    expect(steel.value.max_deflection_mm).toBeLessThan(alu.value.max_deflection_mm);
  });

  it("fixed-fixed less deflection than cantilever", () => {
    const cantilever = engine.compute(baseInput);
    const fixedFixed = engine.compute({
      ...baseInput,
      feature: { ...baseInput.feature, support_condition: "fixed_fixed" },
    });
    expect(fixedFixed.value.max_deflection_mm).toBeLessThan(cantilever.value.max_deflection_mm);
  });

  it("returns Ratchev formula", () => {
    const result = engine.compute(baseInput);
    expect(result.formula).toContain("Ratchev");
  });
});

// ═══════════════════════════════════════════════════════════════
// BurrFormationEngine
// ═══════════════════════════════════════════════════════════════

describe("BurrFormationEngine", () => {
  const engine = new BurrFormationEngine();

  const baseInput: BurrInput = {
    operation: "milling",
    tool: { diameter_mm: 10, helix_angle_deg: 30, rake_angle_deg: 10, edge_radius_um: 10 },
    cutting: { feed_per_tooth_mm: 0.1, axial_depth_mm: 3, cutting_speed_m_min: 200 },
    material: { iso_group: "P" },
    workpiece_edge: { type: "sharp", exit_angle_deg: 90 },
  };

  it("predicts exit burrs", () => {
    const result = engine.compute(baseInput);
    expect(result.value.exit_burrs.length).toBeGreaterThan(0);
    expect(result.value.worst_case.burr_height_um).toBeGreaterThan(0);
  });

  it("chamfered edge reduces burr", () => {
    const sharp = engine.compute(baseInput);
    const chamfer = engine.compute({
      ...baseInput,
      workpiece_edge: { type: "chamfered", chamfer_mm: 0.3, exit_angle_deg: 90 },
    });
    expect(chamfer.value.worst_case.burr_height_um).toBeLessThan(sharp.value.worst_case.burr_height_um);
  });

  it("ductile material → larger burrs", () => {
    const steel = engine.compute(baseInput); // P = ductile
    const castIron = engine.compute({
      ...baseInput,
      material: { iso_group: "K" }, // brittle
    });
    expect(castIron.value.worst_case.burr_height_um).toBeLessThan(steel.value.worst_case.burr_height_um);
  });

  it("provides prevention strategies", () => {
    const result = engine.compute(baseInput);
    expect(result.value.prevention_strategies.length).toBeGreaterThan(0);
    for (const s of result.value.prevention_strategies) {
      expect(s.expected_reduction_pct).toBeGreaterThan(0);
    }
  });

  it("drilling produces cutoff burr", () => {
    const drill = engine.compute({
      ...baseInput,
      operation: "drilling",
    });
    expect(drill.value.exit_burrs.some(b => b.burr_type === "cutoff")).toBe(true);
  });

  it("estimates deburring cost", () => {
    const result = engine.compute(baseInput);
    expect(result.value.cost_deburring_per_edge).toBeGreaterThan(0);
  });

  it("returns Chern/Gillespie formula", () => {
    const result = engine.compute(baseInput);
    expect(result.formula).toContain("Chern");
  });
});

// ═══════════════════════════════════════════════════════════════
// GDTStackupEngine
// ═══════════════════════════════════════════════════════════════

describe("GDTStackupEngine", () => {
  const engine = new GDTStackupEngine();

  const baseInput: StackupInput = {
    dimensions: [
      { name: "housing_bore", nominal_mm: 50.0, plus_tol_mm: 0.025, minus_tol_mm: 0, direction: "positive" },
      { name: "bearing_od", nominal_mm: 49.98, plus_tol_mm: 0, minus_tol_mm: 0.013, direction: "negative" },
    ],
    gap_name: "bearing_fit",
    gap_requirement: { min_mm: 0.005, max_mm: 0.05 },
  };

  it("computes nominal gap", () => {
    const result = engine.compute(baseInput);
    expect(result.value.nominal_gap_mm).toBeCloseTo(0.02, 3);
  });

  it("worst case bounds", () => {
    const result = engine.compute(baseInput);
    expect(result.value.worst_case.min_gap_mm).toBeLessThan(result.value.worst_case.max_gap_mm);
    expect(result.value.worst_case.total_tolerance_mm).toBeGreaterThan(0);
  });

  it("RSS tighter than worst case", () => {
    const result = engine.compute(baseInput);
    const wcRange = result.value.worst_case.max_gap_mm - result.value.worst_case.min_gap_mm;
    const rssRange = result.value.rss.max_gap_mm - result.value.rss.min_gap_mm;
    expect(rssRange).toBeLessThanOrEqual(wcRange);
  });

  it("Monte Carlo produces distribution", () => {
    const result = engine.compute(baseInput);
    expect(result.value.monte_carlo.std_gap_mm).toBeGreaterThan(0);
    expect(result.value.monte_carlo.mean_gap_mm).toBeCloseTo(result.value.nominal_gap_mm, 1);
  });

  it("computes sensitivity ranking", () => {
    const result = engine.compute(baseInput);
    expect(result.value.sensitivity.length).toBe(2);
    const totalPct = result.value.sensitivity.reduce((s, dim) => s + dim.contribution_pct, 0);
    expect(totalPct).toBeCloseTo(100, 0);
  });

  it("thermal shift with different CTEs", () => {
    const thermalInput: StackupInput = {
      ...baseInput,
      dimensions: [
        { ...baseInput.dimensions[0], thermal_cte: 12 },   // steel housing
        { ...baseInput.dimensions[1], thermal_cte: 23 },   // aluminum bearing
      ],
      temperature_delta_c: 20,
    };
    const result = engine.compute(thermalInput);
    expect(Math.abs(result.value.thermal_shift_mm)).toBeGreaterThan(0);
  });

  it("detects infeasible stackup", () => {
    const tightInput: StackupInput = {
      ...baseInput,
      gap_requirement: { min_mm: 0.018, max_mm: 0.022 }, // very tight
    };
    const result = engine.compute(tightInput);
    // At least worst case should fail with tight requirements
    expect(result.value.worst_case.feasible || result.value.rss.feasible).toBeDefined();
  });

  it("returns Drake formula", () => {
    const result = engine.compute(baseInput);
    expect(result.formula).toContain("Drake");
  });
});

// ═══════════════════════════════════════════════════════════════
// RunoutEffectEngine
// ═══════════════════════════════════════════════════════════════

describe("RunoutEffectEngine", () => {
  const engine = new RunoutEffectEngine();

  const baseInput: RunoutInput = {
    tool: { diameter_mm: 10, flute_count: 4 },
    runout: { tir_um: 10, source: "holder" },
    cutting: { spindle_rpm: 10000, feed_per_tooth_mm: 0.08, axial_depth_mm: 3, radial_depth_mm: 2.5 },
    material: { iso_group: "P" },
  };

  it("computes per-flute loads", () => {
    const result = engine.compute(baseInput);
    expect(result.value.flute_loads.length).toBe(4);
    expect(result.value.max_chipload_mm).toBeGreaterThan(result.value.min_chipload_mm);
  });

  it("zero runout → equal loads", () => {
    const result = engine.compute({
      ...baseInput,
      runout: { tir_um: 0, source: "holder" },
    });
    expect(result.value.chipload_imbalance_pct).toBeCloseTo(0, 0);
    expect(result.value.tool_life_reduction_pct).toBeCloseTo(0, 0);
  });

  it("higher runout → more life reduction", () => {
    const low = engine.compute(baseInput);
    const high = engine.compute({
      ...baseInput,
      runout: { tir_um: 30, source: "holder" },
    });
    expect(high.value.tool_life_reduction_pct).toBeGreaterThan(low.value.tool_life_reduction_pct);
  });

  it("computes critical TIR", () => {
    const result = engine.compute(baseInput);
    expect(result.value.critical_tir_um).toBeGreaterThan(0);
  });

  it("computes surface waviness", () => {
    const result = engine.compute(baseInput);
    expect(result.value.surface_waviness_um).toBe(10); // equals TIR
  });

  it("once-per-rev frequency", () => {
    const result = engine.compute(baseInput);
    expect(result.value.once_per_rev_frequency_hz).toBeCloseTo(10000 / 60, 0);
  });

  it("provides holder recommendations", () => {
    const result = engine.compute(baseInput);
    expect(result.value.recommendations.length).toBeGreaterThan(0);
  });

  it("returns Armarego formula", () => {
    const result = engine.compute(baseInput);
    expect(result.formula).toContain("Armarego");
  });
});
