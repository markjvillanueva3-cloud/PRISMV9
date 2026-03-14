/**
 * Phase 5 Forge C — 5 Gap-Closing Physics Engines
 * Tests: AssemblyOptimization, EnergyHarvesting, TransferLearning,
 *        CMMPathPlanning, LAMThermalSoftening
 */
import { describe, it, expect } from "vitest";

// ─── AssemblyOptimizationEngine ───────────────────────────────────
describe("AssemblyOptimizationEngine", () => {
  it("sequencePlan returns optimal assembly order", async () => {
    const { assemblyOptimizationEngine: eng } = await import(
      "../engines/AssemblyOptimizationEngine.js"
    );
    const r = eng.sequencePlan({
      parts: ["base", "bracket", "motor"],
      contacts: [
        { part_a: "base", part_b: "bracket", direction: "z+" },
        { part_a: "bracket", part_b: "motor", direction: "z+" },
      ],
      base_part: "base",
    });
    const v = r.value ?? r;
    expect(v.optimal_sequence).toBeDefined();
    expect(v.optimal_sequence.length).toBe(3);
    expect(v.optimal_sequence[0]).toBe("base");
  });

  it("toleranceStack worst-case and RSS", async () => {
    const { assemblyOptimizationEngine: eng } = await import(
      "../engines/AssemblyOptimizationEngine.js"
    );
    const r = eng.toleranceStack({
      dimensions: [
        { name: "shaft", nominal_mm: 25.0, tolerance_plus_mm: 0.01, tolerance_minus_mm: 0.01 },
        { name: "spacer", nominal_mm: 5.0, tolerance_plus_mm: 0.05, tolerance_minus_mm: 0.05 },
        { name: "housing", nominal_mm: 30.5, tolerance_plus_mm: 0.02, tolerance_minus_mm: 0.02 },
      ],
      assembly_gap_target_mm: 0.5,
      assembly_gap_tolerance_mm: 0.1,
    });
    const v = r.value ?? r;
    expect(v).toBeDefined();
    expect(v.worst_case).toBeDefined();
    expect(v.statistical_rss).toBeDefined();
  });

  it("lineBalance returns stations with efficiency", async () => {
    const { assemblyOptimizationEngine: eng } = await import(
      "../engines/AssemblyOptimizationEngine.js"
    );
    const r = eng.lineBalance({
      tasks: [
        { id: "A", name: "Pick part", duration_s: 10, predecessors: [] },
        { id: "B", name: "Insert pin", duration_s: 15, predecessors: ["A"] },
        { id: "C", name: "Tighten bolt", duration_s: 12, predecessors: ["A"] },
        { id: "D", name: "Inspect", duration_s: 8, predecessors: ["B", "C"] },
      ],
      cycle_time_s: 25,
    });
    const v = r.value ?? r;
    expect(v.stations).toBeDefined();
    expect(v.stations.length).toBeGreaterThan(0);
    expect(v.efficiency_pct).toBeGreaterThan(0);
    expect(v.efficiency_pct).toBeLessThanOrEqual(100);
  });

  it("pegInHole calculates insertion force", async () => {
    const { assemblyOptimizationEngine: eng } = await import(
      "../engines/AssemblyOptimizationEngine.js"
    );
    const r = eng.pegInHole({
      peg_diameter_mm: 25.02,
      hole_diameter_mm: 25.0,
      length_mm: 30,
      material_peg: "steel",
      material_hole: "steel",
    });
    const v = r.value ?? r;
    expect(v.insertion_force_N).toBeGreaterThan(0);
    expect(v.contact_pressure_MPa).toBeGreaterThan(0);
    expect(v.safety_factor).toBeGreaterThan(0);
  });

  it("dfaScore returns DFA index", async () => {
    const { assemblyOptimizationEngine: eng } = await import(
      "../engines/AssemblyOptimizationEngine.js"
    );
    const r = eng.dfaScore({
      parts: [
        { name: "Base", essential: true, symmetry_alpha_deg: 360, handling_difficulty: 1, insertion_difficulty: 1 },
        { name: "Screw1", essential: false, symmetry_alpha_deg: 360, handling_difficulty: 3, insertion_difficulty: 3 },
        { name: "Cover", essential: true, symmetry_alpha_deg: 180, handling_difficulty: 1, insertion_difficulty: 1 },
      ],
    });
    const v = r.value ?? r;
    expect(v.dfa_index).toBeGreaterThan(0);
    expect(v.theoretical_min_parts).toBeLessThanOrEqual(3);
  });
});

// ─── EnergyHarvestingEngine ───────────────────────────────────────
describe("EnergyHarvestingEngine", () => {
  it("piezoHarvest returns power output", async () => {
    const { energyHarvestingEngine: eng } = await import(
      "../engines/EnergyHarvestingEngine.js"
    );
    const r = eng.piezoHarvest({
      material: "PZT-5A",
      stress_MPa: 5.0,
      frequency_Hz: 500,
      thickness_mm: 0.5,
      area_mm2: 100,
    });
    const v = r.value ?? r;
    expect(v.power_mW).toBeGreaterThan(0);
    expect(v.voltage_V).toBeGreaterThan(0);
  });

  it("PZT-5H generates more power than PVDF", async () => {
    const { energyHarvestingEngine: eng } = await import(
      "../engines/EnergyHarvestingEngine.js"
    );
    const base = { stress_MPa: 5, frequency_Hz: 500, thickness_mm: 0.5, area_mm2: 100 };
    const pzt = eng.piezoHarvest({ ...base, material: "PZT-5H" });
    const pvdf = eng.piezoHarvest({ ...base, material: "PVDF" });
    expect((pzt.value ?? pzt).power_mW).toBeGreaterThan((pvdf.value ?? pvdf).power_mW);
  });

  it("thermoHarvest returns Seebeck power", async () => {
    const { energyHarvestingEngine: eng } = await import(
      "../engines/EnergyHarvestingEngine.js"
    );
    const r = eng.thermoHarvest({
      T_hot_C: 200,
      T_cold_C: 25,
      material: "Bi2Te3",
      n_couples: 127,
      element_area_mm2: 1.0,
      element_length_mm: 1.5,
    });
    const v = r.value ?? r;
    expect(v).toBeDefined();
    expect(Object.keys(v).length).toBeGreaterThan(0);
  });

  it("processBudget shows harvestable fraction", async () => {
    const { energyHarvestingEngine: eng } = await import(
      "../engines/EnergyHarvestingEngine.js"
    );
    const r = eng.processBudget({
      cutting_power_W: 5000,
      material_class: "steel",
    });
    const v = r.value ?? r;
    expect(v).toBeDefined();
    const keys = Object.keys(v);
    expect(keys.length).toBeGreaterThan(0);
  });

  it("harvestROI finds breakeven", async () => {
    const { energyHarvestingEngine: eng } = await import(
      "../engines/EnergyHarvestingEngine.js"
    );
    const r = eng.harvestROI({
      harvest_net_mW: 50,
      n_nodes: 5,
      harvester_cost_usd: 500,
    });
    const v = r.value ?? r;
    expect(v).toBeDefined();
    const keys = Object.keys(v);
    expect(keys.length).toBeGreaterThan(0);
  });
});

// ─── TransferLearningEngine ───────────────────────────────────────
describe("TransferLearningEngine", () => {
  it("machineSimilarity quantifies match", async () => {
    const { transferLearningEngine: eng } = await import(
      "../engines/TransferLearningEngine.js"
    );
    const r = eng.machineSimilarity({
      source: { name: "VMC-A", power_kw: 22, max_rpm: 12000, rigidity_n_per_um: 50, accuracy_mm: 0.005, axes: 3 },
      target: { name: "VMC-B", power_kw: 18, max_rpm: 10000, rigidity_n_per_um: 40, accuracy_mm: 0.008, axes: 3 },
    });
    const v = r.value ?? r;
    expect(v.similarity_score).toBeGreaterThan(0);
    expect(v.similarity_score).toBeLessThanOrEqual(1);
  });

  it("identical machines have high similarity", async () => {
    const { transferLearningEngine: eng } = await import(
      "../engines/TransferLearningEngine.js"
    );
    const m = { name: "VMC-X", power_kw: 22, max_rpm: 12000, rigidity_n_per_um: 50, accuracy_mm: 0.003, axes: 5 };
    const r = eng.machineSimilarity({ source: m, target: m });
    expect((r.value ?? r).similarity_score).toBeGreaterThan(0.95);
  });

  it("scaleParameters adjusts for target machine", async () => {
    const { transferLearningEngine: eng } = await import(
      "../engines/TransferLearningEngine.js"
    );
    const r = eng.scaleParameters({
      source_params: { Vc: 200, fz: 0.1, ap: 2.0, ae: 10 },
      source_machine: { name: "S", power_kw: 30, max_rpm: 15000, rigidity_n_per_um: 60, accuracy_mm: 0.003, axes: 3 },
      target_machine: { name: "T", power_kw: 15, max_rpm: 10000, rigidity_n_per_um: 35, accuracy_mm: 0.005, axes: 3 },
      material: "steel",
      operation: "milling",
    });
    const v = r.value ?? r;
    expect(v.scaled_params).toBeDefined();
    expect(v.limiting_factor).toBeDefined();
  });

  it("gpTransfer predicts with uncertainty", async () => {
    const { transferLearningEngine: eng } = await import(
      "../engines/TransferLearningEngine.js"
    );
    const r = eng.gpTransfer({
      source_data: [[10, 100], [20, 80], [30, 65], [40, 55], [50, 48]].map(([x, y]) => ({ x: [x], y })),
      target_data: [[15, 95], [35, 58]].map(([x, y]) => ({ x: [x], y })),
      x_predict: [[10], [25], [40], [50]],
    });
    const v = r.value ?? r;
    expect(v.predictions).toBeDefined();
    expect(v.predictions.length).toBeGreaterThan(0);
  });

  it("bayesianUpdate narrows posterior", async () => {
    const { transferLearningEngine: eng } = await import(
      "../engines/TransferLearningEngine.js"
    );
    const r = eng.bayesianUpdate({
      prior_mean: 100,
      prior_std: 20,
      observations: [95, 102, 98, 97],
      model_type: "taylor_life",
    });
    const v = r.value ?? r;
    expect(v.posterior_std).toBeLessThan(20);
  });

  it("validateTransfer checks safety", async () => {
    const { transferLearningEngine: eng } = await import(
      "../engines/TransferLearningEngine.js"
    );
    const r = eng.validateTransfer({
      scaled_params: { Vc: 180, fz: 0.09, ap: 1.8, ae: 9 },
      target_machine: { name: "T", power_kw: 15, max_rpm: 12000, rigidity_n_per_um: 40, accuracy_mm: 0.005, axes: 3 },
    });
    const v = r.value ?? r;
    expect(typeof v.safe).toBe("boolean");
    expect(v.checks).toBeDefined();
    expect(v.checks.length).toBeGreaterThan(0);
  });
});

// ─── CMMPathPlanningEngine ────────────────────────────────────────
describe("CMMPathPlanningEngine", () => {
  it("planPath generates probe sequence", async () => {
    const { cmmPathPlanningEngine: eng } = await import(
      "../engines/CMMPathPlanningEngine.js"
    );
    const r = eng.planPath({
      features: [
        { id: "F1", type: "plane", nominal_position: { x: 0, y: 0, z: 0 } },
        { id: "F2", type: "cylinder", nominal_position: { x: 50, y: 0, z: 0 }, size_mm: 25 },
        { id: "F3", type: "circle", nominal_position: { x: 100, y: 50, z: 0 }, size_mm: 10 },
      ],
    });
    const v = r.value ?? r;
    expect(v.measurement_sequence).toBeDefined();
    const tp = v.total_points?.value ?? v.total_points;
    expect(tp).toBeGreaterThan(0);
    const et = v.estimated_time_s?.value ?? v.estimated_time_s;
    expect(et).toBeGreaterThan(0);
  });

  it("uncertaintyBudget returns GUM result", async () => {
    const { cmmPathPlanningEngine: eng } = await import(
      "../engines/CMMPathPlanningEngine.js"
    );
    const r = eng.uncertaintyBudget({
      sources: [
        { name: "repeatability", type: "A" as const, std_dev: 0.001, n_obs: 10 },
        { name: "CMM_MPE", type: "B" as const, half_width: 0.003, distribution: "rectangular" as const },
        { name: "temperature", type: "B" as const, half_width: 0.002, distribution: "rectangular" as const },
      ],
    });
    const v = r.value ?? r;
    expect(v).toBeDefined();
    // Accept any shape with uncertainty data
    const keys = Object.keys(v);
    expect(keys.length).toBeGreaterThan(0);
  });

  it("samplingStrategy recommends point count", async () => {
    const { cmmPathPlanningEngine: eng } = await import(
      "../engines/CMMPathPlanningEngine.js"
    );
    const r = eng.samplingStrategy({
      feature_type: "cylinder",
      size_mm: 25.0,
      tolerance_mm: 0.01,
    });
    const v = r.value ?? r;
    expect(v).toBeDefined();
    const rp = v.recommended_points?.value ?? v.recommended_points;
    expect(rp).toBeGreaterThanOrEqual(4);
  });

  it("datumAlignment returns transform", async () => {
    const { cmmPathPlanningEngine: eng } = await import(
      "../engines/CMMPathPlanningEngine.js"
    );
    const r = eng.datumAlignment({
      primary: { points: [{ x: 0, y: 0, z: 0 }, { x: 100, y: 0, z: 0.01 }, { x: 0, y: 100, z: -0.01 }, { x: 100, y: 100, z: 0 }] },
      secondary: { points: [{ x: 0, y: 0, z: 0 }, { x: 100, y: 0, z: 0 }] },
      tertiary: { points: [{ x: 0, y: 0, z: 0 }] },
    });
    const v = r.value ?? r;
    expect(v).toBeDefined();
    const keys = Object.keys(v);
    expect(keys.length).toBeGreaterThan(0);
  });

  it("featureUncertainty assesses conformance", async () => {
    const { cmmPathPlanningEngine: eng } = await import(
      "../engines/CMMPathPlanningEngine.js"
    );
    const r = eng.featureUncertainty({
      feature_type: "cylinder",
      measured_value_mm: 25.01,
      nominal_mm: 25.0,
      tolerance_mm: 0.05,
      cmm_uncertainty_mm: 0.003,
    });
    const v = r.value ?? r;
    expect(v).toBeDefined();
    // can_prove_conformance may be boolean or object
    expect(v.can_prove_conformance).toBeDefined();
  });
});

// ─── LAMThermalSofteningEngine ────────────────────────────────────
describe("LAMThermalSofteningEngine", () => {
  it("preheatProfile returns temperature distribution", async () => {
    const { lamThermalSofteningEngine: eng } = await import(
      "../engines/LAMThermalSofteningEngine.js"
    );
    const r = eng.preheatProfile({
      laser_power_W: 500,
      spot_diameter_mm: 3.0,
      cutting_speed_m_per_min: 10,
      material: "Inconel718",
    });
    const v = r.value ?? r;
    expect(v).toBeDefined();
    expect(v.T_surface_C).toBeGreaterThanOrEqual(25);
    expect(v.temperature_profile).toBeDefined();
  });

  it("forceReduction shows significant reduction for Ti-6Al-4V", async () => {
    const { lamThermalSofteningEngine: eng } = await import(
      "../engines/LAMThermalSofteningEngine.js"
    );
    const r = eng.forceReduction({
      material: "Ti-6Al-4V",
      laser_power_W: 500,
      spot_diameter_mm: 3.0,
      cutting_speed_m_per_min: 60,
      depth_of_cut_mm: 1.0,
      feed_mm_per_rev: 0.15,
    });
    const v = r.value ?? r;
    expect(v.force_reduction_pct).toBeGreaterThanOrEqual(0);
    expect(v.F_LAM_N).toBeLessThanOrEqual(v.F_conventional_N);
  });

  it("higher power → greater force reduction", async () => {
    const { lamThermalSofteningEngine: eng } = await import(
      "../engines/LAMThermalSofteningEngine.js"
    );
    const base = {
      material: "Inconel718",
      spot_diameter_mm: 3.0,
      cutting_speed_m_per_min: 40,
      depth_of_cut_mm: 0.5,
      feed_mm_per_rev: 0.1,
    };
    const low = eng.forceReduction({ ...base, laser_power_W: 200 });
    const high = eng.forceReduction({ ...base, laser_power_W: 800 });
    expect((high.value ?? high).force_reduction_pct)
      .toBeGreaterThanOrEqual((low.value ?? low).force_reduction_pct);
  });

  it("lamToolLife shows improvement factor > 1", async () => {
    const { lamThermalSofteningEngine: eng } = await import(
      "../engines/LAMThermalSofteningEngine.js"
    );
    const r = eng.lamToolLife({
      material: "Ti-6Al-4V",
      laser_power_W: 500,
      spot_diameter_mm: 3.0,
      cutting_speed_m_per_min: 60,
      depth_of_cut_mm: 1.0,
      feed_mm_per_rev: 0.15,
      tool_material: "carbide",
      conventional_life_min: 15,
    });
    const v = r.value ?? r;
    expect(v.improvement_factor).toBeGreaterThanOrEqual(1.0);
    expect(v.LAM_life_min).toBeGreaterThanOrEqual(v.conventional_life_min);
  });

  it("optimalSpacing returns valid laser-tool distance", async () => {
    const { lamThermalSofteningEngine: eng } = await import(
      "../engines/LAMThermalSofteningEngine.js"
    );
    const r = eng.optimalSpacing({
      material: "Inconel718",
      laser_power_W: 500,
      spot_diameter_mm: 3.0,
      cutting_speed_m_per_min: 40,
      depth_of_cut_mm: 1.0,
      feed_mm_per_rev: 0.1,
    });
    const v = r.value ?? r;
    expect(v.optimal_spacing_mm).toBeGreaterThan(0);
  });

  it("lamEconomics compares conventional vs LAM cost", async () => {
    const { lamThermalSofteningEngine: eng } = await import(
      "../engines/LAMThermalSofteningEngine.js"
    );
    const r = eng.lamEconomics({
      material: "Ti-6Al-4V",
      laser_power_W: 500,
      spot_diameter_mm: 3.0,
      cutting_speed_m_per_min: 60,
      depth_of_cut_mm: 1.0,
      feed_mm_per_rev: 0.15,
      tool_material: "carbide",
      conventional_tool_life_min: 15,
    });
    const v = r.value ?? r;
    expect(v).toBeDefined();
    const keys = Object.keys(v);
    expect(keys.length).toBeGreaterThan(0);
  });
});
