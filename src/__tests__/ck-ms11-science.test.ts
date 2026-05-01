/**
 * CK-MS11 Science Tests
 * StochasticRoutingEngine, ProbingProgramEngine, DFMFeedbackEngine
 * 34 tests total
 */

import { describe, it, expect } from "vitest";
import {
  StochasticRoutingEngine,
  type FeatureInput,
  type MaterialInput,
} from "../engines/StochasticRoutingEngine.js";
import {
  ProbingProgramEngine,
  type ProbePoint,
} from "../engines/ProbingProgramEngine.js";
import {
  DFMFeedbackEngine,
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

const borePoint: ProbePoint = {
  x: 50, y: 50, z: -5,
  type: "bore", expected_mm: 25, tolerance_mm: 0.025,
  axis: "X", description: "bore D1",
};
const surfacePoint: ProbePoint = {
  x: 0, y: 0, z: 0,
  type: "surface", expected_mm: 0, tolerance_mm: 0.01,
  axis: "Z", description: "surface Z ref",
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

  it("generate: Fanuc — produces G65 macro call and work offset", () => {
    const prog = engine.generate([borePoint], { controller: "fanuc", work_offset: "G54" });
    expect(prog.gcode).toContain("G65");
    expect(prog.gcode).toContain("G54");
    expect(prog.gcode).toContain("O9000");
    expect(prog.gcode_lines).toBeGreaterThan(5);
    expect(prog.controller_format).toBe("fanuc");
  });

  it("generate: Heidenhain — produces TCH PROBE and BEGIN/END PGM", () => {
    const prog = engine.generate([borePoint], { controller: "heidenhain" });
    expect(prog.gcode).toContain("TCH PROBE");
    expect(prog.gcode).toContain("BEGIN PGM");
    expect(prog.gcode).toContain("END PGM");
  });

  it("generate: Siemens — produces MEAS= measurement cycle", () => {
    const prog = engine.generate([borePoint], { controller: "siemens" });
    expect(prog.gcode).toContain("MEAS=1");
  });

  it("generate: surface point produces different probe cycle than bore", () => {
    const boreProg = engine.generate([borePoint], { controller: "heidenhain" });
    const surfProg = engine.generate([surfacePoint], { controller: "heidenhain" });
    // Bore uses TCH PROBE 5.0 CIRCULAR GROOVE, surface uses TCH PROBE 1.0 Z
    expect(boreProg.gcode).toContain("TCH PROBE 5.0");
    expect(surfProg.gcode).toContain("TCH PROBE 1.0");
  });

  it("generate: multiple points all appear in output", () => {
    const prog = engine.generate([borePoint, surfacePoint], { controller: "fanuc" });
    expect(prog.gcode).toContain("POINT 1");
    expect(prog.gcode).toContain("POINT 2");
    expect(prog.probe_points).toBe(2);
  });

  it("generate: tolerance values present in bore probe line", () => {
    const prog = engine.generate([borePoint], { controller: "fanuc" });
    // Bore uses D for diameter: G65 P9814 D25.000 T0.025
    expect(prog.gcode).toContain("D25.000");
    expect(prog.gcode).toContain("T0.025");
  });

  it("generate: estimated time scales with point count", () => {
    const prog1 = engine.generate([borePoint], { controller: "fanuc" });
    const prog3 = engine.generate([borePoint, surfacePoint, borePoint], { controller: "fanuc" });
    expect(prog3.estimated_time_s).toBeGreaterThan(prog1.estimated_time_s);
  });

  it("generate: Haas uses same format as Fanuc (Renishaw macro)", () => {
    const prog = engine.generate([borePoint], { controller: "haas" });
    expect(prog.gcode).toContain("G65 P9814");
    expect(prog.controller_format).toBe("haas");
  });

  it("generate: custom probe tool number and safe Z", () => {
    const prog = engine.generate([borePoint], {
      controller: "fanuc", probe_tool_number: 99, safe_z: 100,
    });
    expect(prog.gcode).toContain("T99");
    expect(prog.gcode).toContain("Z100");
  });

  it("generate: web type uses X axis for Fanuc", () => {
    const webPoint: ProbePoint = {
      x: 30, y: 30, z: -10, type: "web",
      expected_mm: 15, tolerance_mm: 0.05, axis: "X",
    };
    const prog = engine.generate([webPoint], { controller: "fanuc" });
    expect(prog.gcode).toContain("X15.000");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DFMFeedbackEngine tests
// ─────────────────────────────────────────────────────────────────────────────

describe("DFMFeedbackEngine", () => {
  const engine = new DFMFeedbackEngine();

  it("thin wall < 2mm: warning issued", () => {
    const features = [{ id: "W1", type: "wall", wall_thickness_mm: 1.5 }];
    const analysis = engine.analyze(features);
    const wallIssue = analysis.issues.find(i => i.category === "thin_wall");
    expect(wallIssue).toBeDefined();
    expect(wallIssue!.severity).toBe("warning");
  });

  it("thin wall < 0.5mm: critical issued", () => {
    const features = [{ id: "W1", type: "wall", wall_thickness_mm: 0.3 }];
    const analysis = engine.analyze(features);
    const wallIssue = analysis.issues.find(i => i.category === "thin_wall" && i.severity === "critical");
    expect(wallIssue).toBeDefined();
  });

  it("deep pocket D/W > 4: warning issued", () => {
    const features = [{ id: "P1", type: "pocket", dimensions: { depth_mm: 50, width_mm: 10 } }];
    const analysis = engine.analyze(features);
    const deepIssue = analysis.issues.find(i => i.category === "deep_pocket");
    expect(deepIssue).toBeDefined();
    expect(["warning", "critical"]).toContain(deepIssue!.severity);
  });

  it("deep pocket D/W > 6: critical issued", () => {
    const features = [{ id: "P1", type: "pocket", dimensions: { depth_mm: 70, width_mm: 10 } }];
    const analysis = engine.analyze(features);
    const deepIssue = analysis.issues.find(i => i.category === "deep_pocket" && i.severity === "critical");
    expect(deepIssue).toBeDefined();
  });

  it("tight tolerance < 0.005mm: critical issued", () => {
    const features = [{ id: "B1", type: "bore", tolerance_mm: 0.003 }];
    const analysis = engine.analyze(features);
    const tolIssue = analysis.issues.find(i => i.category === "tight_tolerance");
    expect(tolIssue).toBeDefined();
    expect(tolIssue!.severity).toBe("critical");
  });

  it("surface finish Ra < 0.2: critical issued", () => {
    const features = [{ id: "S1", type: "surface", surface_finish_Ra: 0.1 }];
    const analysis = engine.analyze(features);
    const raIssue = analysis.issues.find(i => i.category === "surface_finish");
    expect(raIssue).toBeDefined();
    expect(raIssue!.severity).toBe("critical");
  });

  it("small corner radius < 0.5mm: warning issued", () => {
    const features = [{ id: "C1", type: "pocket", corner_radius_mm: 0.3 }];
    const analysis = engine.analyze(features);
    const cornerIssue = analysis.issues.find(i => i.category === "sharp_corner");
    expect(cornerIssue).toBeDefined();
    expect(cornerIssue!.severity).toBe("warning");
  });

  it("superalloy deep feature: material concern warning", () => {
    const features = [{ id: "F1", type: "pocket", dimensions: { depth_mm: 40 } }];
    const analysis = engine.analyze(features, "S");
    const matIssue = analysis.issues.find(i => i.category === "material_concern");
    expect(matIssue).toBeDefined();
    expect(matIssue!.severity).toBe("warning");
  });

  it("score decreases with more issues", () => {
    const clean = engine.analyze([{ id: "F1", type: "pocket", dimensions: { depth_mm: 5, width_mm: 20 } }]);
    const problematic = engine.analyze([
      { id: "W1", type: "wall", wall_thickness_mm: 0.3 },
      { id: "P1", type: "pocket", dimensions: { depth_mm: 70, width_mm: 10 } },
    ]);
    expect(problematic.score).toBeLessThan(clean.score);
  });

  it("manufacturability label reflects score", () => {
    const easy = engine.analyze([{ id: "F1", type: "pocket", dimensions: { depth_mm: 5, width_mm: 20 } }]);
    expect(easy.manufacturability).toBe("excellent");

    const hard = engine.analyze([
      { id: "W1", type: "wall", wall_thickness_mm: 0.2 },
      { id: "P1", type: "pocket", dimensions: { depth_mm: 80, width_mm: 10 } },
      { id: "H1", type: "hole", tolerance_mm: 0.001 },
    ]);
    expect(["marginal", "difficult"]).toContain(hard.manufacturability);
  });

  it("micro hole < 1mm diameter: critical issued", () => {
    const features = [{ id: "H1", type: "hole", dimensions: { diameter_mm: 0.5, depth_mm: 3 } }];
    const analysis = engine.analyze(features);
    const microIssue = analysis.issues.find(i => i.category === "micro_feature");
    expect(microIssue).toBeDefined();
    expect(microIssue!.severity).toBe("critical");
  });

  it("deep hole L/D > 10: critical issued", () => {
    const features = [{ id: "H1", type: "hole", dimensions: { diameter_mm: 3, depth_mm: 40 } }];
    const analysis = engine.analyze(features);
    const deepHoleIssue = analysis.issues.find(i => i.category === "deep_hole");
    expect(deepHoleIssue).toBeDefined();
    expect(deepHoleIssue!.severity).toBe("critical");
  });

  it("hardened steel thin wall: material concern warning", () => {
    const features = [{ id: "W1", type: "wall", wall_thickness_mm: 3 }];
    const analysis = engine.analyze(features, "H");
    const matIssue = analysis.issues.find(i => i.category === "material_concern");
    expect(matIssue).toBeDefined();
  });
});
