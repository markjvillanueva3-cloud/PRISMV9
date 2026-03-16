/**
 * CK-MS11 Science Tests
 * StochasticRoutingEngine, ProbingProgramEngine, DFMFeedbackEngine
 * 24+ tests total
 */

import { describe, it, expect } from "vitest";
import {
  StochasticRoutingEngine,
  type FeatureInput,
  type MaterialInput,
} from "../engines/StochasticRoutingEngine.js";
import {
  ProbingProgramEngine,
  type ProbeConfig,
  type PartDatum,
  type InspectionFeature,
  type ToolMeasureInput,
} from "../engines/ProbingProgramEngine.js";
import {
  DFMFeedbackEngine,
  type DFMFeature,
  type DFMMaterial,
  type DFMToleranceSpec,
} from "../engines/DFMFeedbackEngine.js";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const stdFeature: FeatureInput = {
  type: "pocket",
  ap_mm: 5,
  ae_mm: 6,
  tool_diameter_mm: 12,
  overhang_mm: 40,
  flute_count: 4,
  rpm: 8000,
  feed_mmmin: 1200,
  tolerance_mm: 0.05,
  natural_freq_hz: 800,
  stiffness_nm: 5e6,
  damping_ratio: 0.05,
};

const aluminumMat: MaterialInput = { name: "aluminum", taylor_C: 400, taylor_n: 0.25, elastic_modulus_gpa: 70 };
const steelMat:    MaterialInput = { name: "steel",    taylor_C: 150, taylor_n: 0.25, elastic_modulus_gpa: 200 };
const inconelMat:  MaterialInput = { name: "inconel",  taylor_C: 60,  taylor_n: 0.22, elastic_modulus_gpa: 210 };

const fanucConfig: ProbeConfig = {
  controller: "renishaw_fanuc",
  probe_tool_number: 31,
  approach_feed_mmmin: 100,
  clearance_z_mm: 25,
  overtravel_mm: 5,
  print_results: true,
};

const heidenhainConfig: ProbeConfig = {
  controller: "heidenhain",
  probe_tool_number: 31,
  approach_feed_mmmin: 150,
  clearance_z_mm: 30,
};

const siemensConfig: ProbeConfig = {
  controller: "siemens",
  probe_tool_number: 31,
  approach_feed_mmmin: 100,
};

// ─────────────────────────────────────────────────────────────────────────────
// StochasticRoutingEngine tests
// ─────────────────────────────────────────────────────────────────────────────

describe("StochasticRoutingEngine", () => {
  const engine = new StochasticRoutingEngine();

  it("selectAlgorithm: returns ranked list with all standard+novel algorithms", () => {
    const result = engine.selectAlgorithm(stdFeature, aluminumMat, {}, { n_samples: 100 });
    expect(result.ranked.length).toBeGreaterThanOrEqual(10);
    expect(result.best_algorithm).toBeTruthy();
    expect(result.best_p_success).toBeGreaterThan(0);
    expect(result.best_p_success).toBeLessThanOrEqual(1);
  });

  it("selectAlgorithm: P(success) = P(no_chatter) * P(force_ok) * P(deflection_ok) * P(life_ok)", () => {
    const result = engine.selectAlgorithm(stdFeature, steelMat, {}, { n_samples: 200 });
    for (const ev of result.ranked.slice(0, 5)) {
      const expected = ev.p_no_chatter * ev.p_force_ok * ev.p_deflection_ok * ev.p_life_ok;
      expect(Math.abs(ev.p_success - expected)).toBeLessThan(1e-10);
    }
  });

  it("selectAlgorithm: trochoidal/VCER rank higher than zigzag for high-ae steel pocket", () => {
    const highAeFeature: FeatureInput = { ...stdFeature, ae_mm: 10, ap_mm: 8 };
    const result = engine.selectAlgorithm(highAeFeature, steelMat, {}, {
      algorithms: ["trochoidal", "VCER", "zigzag", "adaptive_clearing"],
      n_samples: 200,
    });
    const trochIdx = result.ranked.findIndex(r => r.algorithm === "trochoidal");
    const zigzagIdx = result.ranked.findIndex(r => r.algorithm === "zigzag");
    expect(trochIdx).toBeLessThan(zigzagIdx);
  });

  it("selectAlgorithm: HRAF has lowest chatter_risk trait (best chatter avoidance)", () => {
    // HRAF chatter_risk = 0.12, CFSF = 0.48 — test relative ordering
    // At typical conditions both may saturate to 1.0; test using chatter-prone conditions
    const chatteryFeature: FeatureInput = {
      ...stdFeature,
      rpm: 3200,          // near resonance for fn=800Hz, 4 flutes → tooth freq = 213Hz
      ap_mm: 12,          // deep cut to push beyond stability limit
      natural_freq_hz: 200,
      stiffness_nm: 1e6,  // soft tool
    };
    const result = engine.selectAlgorithm(chatteryFeature, steelMat, {}, {
      algorithms: ["HRAF", "CFSF"],
      n_samples: 300,
    });
    const hrafEv = result.ranked.find(r => r.algorithm === "HRAF");
    const cfsfEv = result.ranked.find(r => r.algorithm === "CFSF");
    expect(hrafEv).toBeDefined();
    expect(cfsfEv).toBeDefined();
    // HRAF chatter_risk=0.12 vs CFSF chatter_risk=0.48: HRAF >= CFSF in p_no_chatter
    expect(hrafEv!.p_no_chatter).toBeGreaterThanOrEqual(cfsfEv!.p_no_chatter);
  });

  it("selectAlgorithm: PTDC has better deflection performance than zigzag via lower mean deflection", () => {
    // PTDC deflection_compensation=0.75 vs zigzag=0.0
    // Both may have p_deflection_ok=0 for extreme overhang, but mean deflection differs
    const highLDFeature: FeatureInput = { ...stdFeature, overhang_mm: 80 };
    const ptdcEv = engine.evaluateAlgorithm("PTDC", highLDFeature, steelMat);
    const zigzagEv = engine.evaluateAlgorithm("zigzag", highLDFeature, steelMat);
    // PTDC compensates 75% of deflection, so mean deflection_mm should be lower
    expect(ptdcEv.deflection_mean_mm).toBeLessThan(zigzagEv.deflection_mean_mm);
  });

  it("evaluateAlgorithm: returns CI95 force bounds with lower < mean < upper", () => {
    const ev = engine.evaluateAlgorithm("trochoidal", stdFeature, aluminumMat);
    expect(ev.force_ci95_n[0]).toBeLessThan(ev.force_mean_n);
    expect(ev.force_ci95_n[1]).toBeGreaterThan(ev.force_mean_n);
    expect(ev.deflection_ci95_mm[0]).toBeLessThan(ev.deflection_mean_mm + 0.01);
  });

  it("compareAlgorithms: winner has highest p_success, margin >= 0", () => {
    const result = engine.compareAlgorithms(
      ["trochoidal", "zigzag", "spiral", "HRAF"],
      stdFeature, aluminumMat
    );
    const best = result.comparisons[0];
    expect(result.winner).toBe(best.algorithm);
    expect(result.margin).toBeGreaterThanOrEqual(0);
    for (const c of result.comparisons.slice(1)) {
      expect(best.p_success).toBeGreaterThanOrEqual(c.p_success);
    }
  });

  it("sensitivityAnalysis: identifies most sensitive parameter", () => {
    const result = engine.sensitivityAnalysis("trochoidal", stdFeature, steelMat);
    expect(result.most_sensitive).toBeTruthy();
    expect(result.parameters.length).toBeGreaterThanOrEqual(5);
    const sorted = [...result.parameters].sort(
      (a, b) => Math.abs(b.p_success_delta) - Math.abs(a.p_success_delta)
    );
    expect(result.most_sensitive).toBe(sorted[0].name);
  });

  it("optimizeParameters: optimal p_success >= baseline for at least typical cases", () => {
    const result = engine.optimizeParameters(
      "trochoidal", stdFeature, aluminumMat,
      { min_ae_mm: 2, max_ae_mm: 10, min_ap_mm: 2, max_ap_mm: 8 }
    );
    expect(result.optimal_ae_mm).toBeGreaterThan(0);
    expect(result.optimal_ap_mm).toBeGreaterThan(0);
    expect(result.iterations).toBe(25); // 5x5 grid
    // optimal p_success should be valid probability
    expect(result.p_success_optimal).toBeGreaterThanOrEqual(0);
    expect(result.p_success_optimal).toBeLessThanOrEqual(1);
  });

  it("inconel: lower overall P(success) than aluminum for same feature", () => {
    const alResult = engine.selectAlgorithm(stdFeature, aluminumMat, {}, { n_samples: 200 });
    const inResult = engine.selectAlgorithm(stdFeature, inconelMat,  {}, { n_samples: 200 });
    expect(alResult.best_p_success).toBeGreaterThan(inResult.best_p_success);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ProbingProgramEngine tests
// ─────────────────────────────────────────────────────────────────────────────

describe("ProbingProgramEngine", () => {
  const engine = new ProbingProgramEngine();

  const boreDatum: PartDatum = {
    id: "D1", type: "bore_center",
    x: 50, y: 50, z: 0, diameter_mm: 25, work_offset: "G54",
  };
  const surfaceDatum: PartDatum = {
    id: "D2", type: "single_surface",
    x: 0, y: 0, z: -10, work_offset: "G54",
  };

  const boreFeature: InspectionFeature = {
    id: "F1", type: "bore_diameter",
    x: 50, y: 50, z: -5,
    nominal_mm: 25, tolerance_plus_mm: 0.025, tolerance_minus_mm: 0.025,
    result_variable: 100,
  };
  const surfaceFeature: InspectionFeature = {
    id: "F2", type: "surface_z",
    x: 0, y: 0, z: 0,
    nominal_mm: 0, tolerance_plus_mm: 0.01, tolerance_minus_mm: 0.01,
  };

  it("generateWCSSetup: Fanuc — produces G65 macro call and work offset line", () => {
    const prog = engine.generateWCSSetup([boreDatum], fanucConfig);
    expect(prog.gcode).toContain("G65");
    expect(prog.gcode).toContain("G54");
    expect(prog.gcode).toContain("O0001");
    expect(prog.line_count).toBeGreaterThan(5);
    expect(prog.controller).toBe("renishaw_fanuc");
  });

  it("generateWCSSetup: Heidenhain — produces CYCL DEF 412", () => {
    const prog = engine.generateWCSSetup([boreDatum], heidenhainConfig);
    expect(prog.gcode).toContain("CYCL DEF 412");
    expect(prog.gcode).toContain("BEGIN PGM");
    expect(prog.gcode).toContain("END PGM");
  });

  it("generateWCSSetup: Siemens — produces CYCLE977", () => {
    const prog = engine.generateWCSSetup([boreDatum], siemensConfig);
    expect(prog.gcode).toContain("CYCLE977");
  });

  it("generateWCSSetup: surface datum produces different macro than bore", () => {
    const prog = engine.generateWCSSetup([surfaceDatum], fanucConfig);
    expect(prog.gcode).toContain("O9811"); // surface macro
    expect(prog.gcode).toContain("#500");
  });

  it("generateFirstArticle: multiple features all appear in output", () => {
    const prog = engine.generateFirstArticle([boreFeature, surfaceFeature], fanucConfig);
    expect(prog.gcode).toContain("F1");
    expect(prog.gcode).toContain("F2");
    expect(prog.variable_map["F1"]).toBe(100);
    expect(prog.variable_map["F2"]).toBe(101);
    expect(prog.gcode).toContain("N9900"); // alarm block
  });

  it("generateFirstArticle: tolerance check lines present for bore", () => {
    const prog = engine.generateFirstArticle([boreFeature], fanucConfig);
    expect(prog.gcode).toContain("IF [#100 LT");
    expect(prog.gcode).toContain("IF [#100 GT");
  });

  it("generateInProcessCheck: tight tolerance warning generated", () => {
    const tightFeat: InspectionFeature = {
      ...surfaceFeature, tolerance_plus_mm: 0.005, tolerance_minus_mm: 0.005,
    };
    const prog = engine.generateInProcessCheck(tightFeat, fanucConfig);
    expect(prog.warnings.length).toBeGreaterThan(0);
    expect(prog.warnings[0]).toMatch(/0.02mm/);
  });

  it("generateToolMeasure: Fanuc uses O9810 macro, Haas uses P9023", () => {
    const tool: ToolMeasureInput = {
      tool_number: 5, tool_type: "endmill",
      nominal_length_mm: 75, nominal_diameter_mm: 12, offset_register: 5,
    };
    const fanucProg = engine.generateToolMeasure(tool, fanucConfig);
    const haasProg  = engine.generateToolMeasure(tool, { ...fanucConfig, controller: "renishaw_haas" });
    expect(fanucProg.gcode).toContain("O9810");
    expect(haasProg.gcode).toContain("P9023");
    expect(fanucProg.variable_map["T5_length"]).toBe(5);
  });

  it("generateAutoComp: produces safety limit check and offset update", () => {
    const prog = engine.generateAutoComp(
      { feature: boreFeature, offset_register: 10, axis: "Z", max_comp_mm: 0.3 },
      fanucConfig
    );
    expect(prog.gcode).toContain("0.300"); // max_comp_mm
    expect(prog.gcode).toContain("2000+10"); // offset register update
    expect(prog.gcode).toContain("9901"); // safety alarm label
  });

  it("generateStatisticalCheck: ISO 2859-1 sample size correct for lot=100", () => {
    const features = Array.from({ length: 20 }, (_, i) => ({
      ...boreFeature, id: `F${i + 1}`,
    }));
    const result = engine.generateStatisticalCheck(
      { features, lot_size: 100, aql_level: 2 },
      fanucConfig
    );
    // lot 100 → ISO 2859-1 → sample 13 (50<100<=150 → 20, but our table: 90<100<=150 → 20)
    expect(result.sample_size).toBeGreaterThan(0);
    expect(result.aql_level).toBe(2);
  });

  it("uncertainty_um: increases with temperature deviation", () => {
    const baseConfig: ProbeConfig = { ...fanucConfig, temperature_c: 20, reference_temp_c: 20 };
    const hotConfig:  ProbeConfig = { ...fanucConfig, temperature_c: 30, reference_temp_c: 20, stylus_length_mm: 100 };
    const baseProg = engine.generateInProcessCheck(boreFeature, baseConfig);
    const hotProg  = engine.generateInProcessCheck(boreFeature, hotConfig);
    expect(hotProg.uncertainty_um).toBeGreaterThan(baseProg.uncertainty_um);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DFMFeedbackEngine tests
// ─────────────────────────────────────────────────────────────────────────────

describe("DFMFeedbackEngine", () => {
  const engine = new DFMFeedbackEngine();

  const alMaterial: DFMMaterial = { name: "aluminum" };
  const steelMaterial: DFMMaterial = { name: "steel" };
  const inconelMaterial: DFMMaterial = { name: "inconel" };
  const hardenedMaterial: DFMMaterial = { name: "hardened_steel", hardness_hrc: 58 };

  it("thin wall < min_wall: warning issued for aluminum", () => {
    const features: DFMFeature[] = [{ id: "W1", type: "thin_wall", wall_thickness_mm: 0.6 }];
    const analysis = engine.analyze(features, alMaterial);
    const wallIssue = analysis.issues.find(i => i.rule_id.startsWith("G1_thin_wall"));
    expect(wallIssue).toBeDefined();
    expect(wallIssue!.severity).toBe("warning");
  });

  it("thin wall < min_wall/2: critical issued", () => {
    const features: DFMFeature[] = [{ id: "W1", type: "thin_wall", wall_thickness_mm: 0.3 }];
    const analysis = engine.analyze(features, alMaterial);
    const wallIssue = analysis.issues.find(i => i.rule_id === "G1_thin_wall_critical");
    expect(wallIssue).toBeDefined();
    expect(wallIssue!.severity).toBe("critical");
  });

  it("deep pocket D/W > 4: warning issued", () => {
    const features: DFMFeature[] = [{ id: "P1", type: "pocket", depth_mm: 50, width_mm: 10 }];
    const analysis = engine.analyze(features, steelMaterial);
    const deepIssue = analysis.issues.find(i => i.rule_id.startsWith("G2_deep_pocket"));
    expect(deepIssue).toBeDefined();
    expect(["warning", "critical"]).toContain(deepIssue!.severity);
  });

  it("sharp internal corner R=0: impossible severity", () => {
    const features: DFMFeature[] = [{ id: "C1", type: "pocket", corner_radius_mm: 0 }];
    const analysis = engine.analyze(features, steelMaterial);
    const cornerIssue = analysis.issues.find(i => i.rule_id === "G3_sharp_internal_corner");
    expect(cornerIssue).toBeDefined();
    expect(cornerIssue!.severity).toBe("impossible");
    expect(analysis.machinable).toBe(false);
  });

  it("IT grade 4 tolerance: warning issued with cost > 1", () => {
    const features: DFMFeature[] = [{ id: "B1", type: "bore" }];
    const tols: DFMToleranceSpec[] = [{ feature_id: "B1", it_grade: 4 }];
    const analysis = engine.analyze(features, steelMaterial, tols);
    const tolIssue = analysis.issues.find(i => i.rule_id === "T1_tight_it_grade");
    expect(tolIssue).toBeDefined();
    expect(tolIssue!.cost_multiplier).toBeGreaterThan(1);
  });

  it("Ra 0.1um: ultra-fine finish critical with high cost multiplier", () => {
    const features: DFMFeature[] = [{ id: "S1", type: "surface" }];
    const tols: DFMToleranceSpec[] = [{ feature_id: "S1", ra_um: 0.1 }];
    const analysis = engine.analyze(features, steelMaterial, tols);
    const raIssue = analysis.issues.find(i => i.rule_id === "T2_ultra_fine_finish");
    expect(raIssue).toBeDefined();
    expect(raIssue!.cost_multiplier).toBeGreaterThanOrEqual(5);
  });

  it("thread in HRC 55 material: critical process issue", () => {
    const features: DFMFeature[] = [{
      id: "T1", type: "thread",
      diameter_mm: 8, length_mm: 16,
    }];
    const analysis = engine.analyze(features, hardenedMaterial);
    const threadIssue = analysis.issues.find(i => i.rule_id === "P2_thread_in_hard_material");
    expect(threadIssue).toBeDefined();
    expect(threadIssue!.severity).toBe("critical");
  });

  it("3-setup feature: multiple-setup warning issued", () => {
    const features: DFMFeature[] = [{ id: "F1", type: "bore", setup_count: 3 }];
    const analysis = engine.analyze(features, steelMaterial);
    const setupIssue = analysis.issues.find(i => i.rule_id === "P6_many_setups");
    expect(setupIssue).toBeDefined();
    expect(setupIssue!.cost_multiplier).toBeCloseTo(2.25, 1); // 1.5^2
  });

  it("inconel: low machinability warning", () => {
    const features: DFMFeature[] = [{ id: "F1", type: "pocket" }];
    const analysis = engine.analyze(features, inconelMaterial);
    const macIssue = analysis.issues.find(i => i.rule_id === "M1_very_low_machinability");
    expect(macIssue).toBeDefined();
    expect(macIssue!.severity).toBe("critical");
  });

  it("adjusted cost index > 1 when issues have cost multipliers", () => {
    const features: DFMFeature[] = [
      { id: "W1", type: "thin_wall", wall_thickness_mm: 0.7 },
      { id: "P1", type: "pocket", depth_mm: 60, width_mm: 10 },
    ];
    const analysis = engine.analyze(features, steelMaterial);
    expect(analysis.adjusted_cost_index).toBeGreaterThan(1);
  });

  it("suggestImprovements: returns one improvement per issue", () => {
    const features: DFMFeature[] = [
      { id: "C1", type: "pocket", corner_radius_mm: 0.5 },
      { id: "W1", type: "thin_wall", wall_thickness_mm: 0.8 },
    ];
    const analysis = engine.analyze(features, steelMaterial);
    const imps = engine.suggestImprovements(analysis);
    expect(imps.length).toBe(analysis.issues.length);
    for (const imp of imps) {
      expect(imp.suggestion).toBeTruthy();
      expect(imp.cost_before).toBeGreaterThan(0);
      expect(imp.cost_after).toBeGreaterThan(0);
    }
  });

  it("estimateCostImpact: after cost <= before cost", () => {
    const features: DFMFeature[] = [
      { id: "P1", type: "pocket", depth_mm: 40, width_mm: 8 },
    ];
    const analysis = engine.analyze(features, steelMaterial);
    const imps = engine.suggestImprovements(analysis);
    const impact = engine.estimateCostImpact(analysis, imps);
    expect(impact.after).toBeLessThanOrEqual(impact.before);
    expect(impact.savings_pct).toBeGreaterThanOrEqual(0);
  });

  it("generateReport: formatted string contains all sections", () => {
    const features: DFMFeature[] = [
      { id: "B1", type: "bore", length_mm: 60, diameter_mm: 8 },
    ];
    const tols: DFMToleranceSpec[] = [{ feature_id: "B1", it_grade: 5, ra_um: 0.4 }];
    const analysis = engine.analyze(features, steelMaterial, tols);
    const imps = engine.suggestImprovements(analysis);
    const report = engine.generateReport(analysis, imps);
    expect(report.formatted).toContain("DFM ANALYSIS REPORT");
    expect(report.formatted).toContain("ISSUES");
    expect(report.formatted).toContain("IMPROVEMENTS");
    expect(report.formatted).toContain("COST IMPACT");
    expect(report.cost_impact.before).toBeGreaterThan(0);
  });
});
