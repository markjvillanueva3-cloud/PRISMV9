/**
 * Tests for Machining Physics & Probing Engine Batch 14:
 * SplineMilling, ThinFloorVibration, RegenerativeChatter,
 * HarmonicAnalysis, ThreadMilling, GCodeOptimization,
 * ProbeRoutine, ThermalSim
 */
import { describe, it, expect } from "vitest";
import { splineMillingEngine } from "../engines/SplineMillingEngine.js";
import { thinFloorVibrationEngine } from "../engines/ThinFloorVibrationEngine.js";
import { regenerativeChatterPredictor } from "../engines/RegenerativeChatterPredictor.js";
import { harmonicAnalysisEngine } from "../engines/HarmonicAnalysisEngine.js";
import { threadMillingEngine } from "../engines/ThreadMillingEngine.js";
import { gcodeOptimizationEngine } from "../engines/GCodeOptimizationEngine.js";
import { probeRoutineEngine } from "../engines/ProbeRoutineEngine.js";
import { thermalSimEngine } from "../engines/ThermalSimEngine.js";

// ── Spline Milling ──────────────────────────────────────────────
describe("SplineMillingEngine", () => {
  const input = {
    spline_type: "involute" as const,
    num_teeth: 20, pressure_angle_deg: 30,
    major_diameter_mm: 50, minor_diameter_mm: 42,
    face_width_mm: 20, internal: false,
    index_method: "c_axis" as const,
    tool_diameter_mm: 6, tool_num_flutes: 4,
    spindle_rpm: 3000, feed_per_tooth_mm: 0.04,
    num_depth_passes: 3,
  };

  it("calculates spline milling params", () => {
    const r = splineMillingEngine.calculate(input);
    expect(r.index_angle_deg).toBeCloseTo(18, 0); // 360/20
    expect(r.total_cycle_time_sec).toBeGreaterThan(0);
    expect(r.feed_rate_mm_per_min).toBeGreaterThan(0);
  });

  it("validates spline geometry", () => {
    const r = splineMillingEngine.validate(input, "B");
    expect(r.fit_class).toContain("B");
    expect(r.is_valid).toBeDefined();
  });
});

// ── Thin Floor Vibration ────────────────────────────────────────
describe("ThinFloorVibrationEngine", () => {
  const input = {
    geometry: "floor" as const,
    thickness_mm: 1.5, unsupported_length_mm: 80,
    material_E_GPa: 70, material_density_kgm3: 2700,
    material_poisson: 0.33, cutting_force_N: 50,
    spindle_rpm: 8000, num_flutes: 2, tool_diameter_mm: 6,
  };

  it("analyzes thin floor vibration", () => {
    const r = thinFloorVibrationEngine.analyze(input);
    expect(r.natural_freq_Hz).toBeGreaterThan(0);
    expect(r.tooth_passing_freq_Hz).toBeGreaterThan(0);
    expect(r.max_deflection_um).toBeGreaterThanOrEqual(0);
    expect(r.recommendations.length).toBeGreaterThan(0);
  });

  it("thinner floor = higher deflection", () => {
    const thick = thinFloorVibrationEngine.analyze({ ...input, thickness_mm: 3 });
    const thin = thinFloorVibrationEngine.analyze({ ...input, thickness_mm: 1 });
    expect(thin.max_deflection_um).toBeGreaterThan(thick.max_deflection_um);
  });

  it("finds minimum safe thickness", () => {
    const minT = thinFloorVibrationEngine.minThickness(input, 10);
    expect(minT).toBeGreaterThan(0);
  });
});

// ── Regenerative Chatter ────────────────────────────────────────
describe("RegenerativeChatterPredictor", () => {
  const input = {
    cut_type: "half_immersion_down" as const,
    spindle_rpm: 6000, depth_of_cut_mm: 3,
    num_flutes: 4, tool_diameter_mm: 12,
    natural_freq_Hz: 800, stiffness_N_per_m: 1e7,
    damping_ratio: 0.03, specific_cutting_force_N_mm2: 2000,
  };

  it("predicts chatter stability", () => {
    const r = regenerativeChatterPredictor.predict(input);
    expect(r.is_stable).toBeDefined();
    expect(r.critical_depth_mm).toBeGreaterThanOrEqual(0);
    expect(r.severity).toBeDefined();
    expect(r.optimal_rpm).toBeGreaterThanOrEqual(0);
  });

  it("generates stability lobes", () => {
    const lobes = regenerativeChatterPredictor.stabilityLobes(input, [2000, 12000]);
    expect(Array.isArray(lobes)).toBe(true);
    expect(lobes.length).toBeGreaterThan(0);
    expect(lobes[0].rpm).toBeGreaterThan(0);
    expect(lobes[0].critical_depth_mm).toBeGreaterThan(0);
  });

  it("deeper cut = more likely chatter", () => {
    const shallow = regenerativeChatterPredictor.predict({ ...input, depth_of_cut_mm: 0.5 });
    const deep = regenerativeChatterPredictor.predict({ ...input, depth_of_cut_mm: 10 });
    expect(deep.stability_margin_pct).toBeLessThanOrEqual(shallow.stability_margin_pct);
  });
});

// ── Harmonic Analysis ───────────────────────────────────────────
describe("HarmonicAnalysisEngine", () => {
  it("analyzes vibration spectrum", () => {
    const r = harmonicAnalysisEngine.analyze({
      spindle_rpm: 6000, num_flutes: 4,
      vibration_spectrum: [
        { freq_Hz: 400, amplitude_um: 12 },
        { freq_Hz: 800, amplitude_um: 5 },
        { freq_Hz: 100, amplitude_um: 8 },
      ],
    });
    expect(r.dominant_frequency_Hz).toBeGreaterThan(0);
    expect(r.tooth_passing_freq_Hz).toBeCloseTo(400, 0); // 6000/60*4
    expect(r.spindle_freq_Hz).toBeCloseTo(100, 0);       // 6000/60
    expect(r.severity).toBeDefined();
  });

  it("identifies bearing defect frequencies", () => {
    const r = harmonicAnalysisEngine.analyze({
      spindle_rpm: 3000, num_flutes: 2,
      vibration_spectrum: [{ freq_Hz: 100, amplitude_um: 15 }],
      bearing_params: {
        num_balls: 9, ball_diameter_mm: 8,
        pitch_diameter_mm: 46, contact_angle_deg: 15,
      },
    });
    expect(r.bearing_defect_freqs).toBeDefined();
    expect(r.bearing_defect_freqs!.BPFO_Hz).toBeGreaterThan(0);
  });
});

// ── Thread Milling ──────────────────────────────────────────────
describe("ThreadMillingEngine", () => {
  const input = {
    thread_form: "metric" as const,
    nominal_diameter_mm: 20, pitch_mm: 2.5,
    internal: true, direction: "right_hand" as const,
    thread_depth_mm: 1.35, thread_length_mm: 20,
    mill_approach: "single_form" as const,
    tool_diameter_mm: 14, num_flutes: 3,
    num_radial_passes: 1, spindle_rpm: 2000,
    material_specific_force_N_mm2: 2000,
  };

  it("calculates thread milling parameters", () => {
    const r = threadMillingEngine.calculate(input);
    expect(r.helical_diameter_mm).toBeGreaterThan(0);
    expect(r.feed_rate_mm_per_min).toBeGreaterThan(0);
    expect(r.cutting_time_sec).toBeGreaterThan(0);
    expect(r.helical_revolutions).toBeGreaterThan(0);
  });

  it("generates G-code for fanuc", () => {
    const r = threadMillingEngine.generateGCode(input, "fanuc");
    expect(r.lines.length).toBeGreaterThan(0);
    expect(r.controller).toBe("fanuc");
  });
});

// ── G-Code Optimization ─────────────────────────────────────────
describe("GCodeOptimizationEngine", () => {
  const gcode = "G90 G54\nG0 X0 Y0\nG1 X10 F500\nG1 X20 F500\nG1 X30 F500\nG0 X0 Y0\nM30";

  it("analyzes G-code", () => {
    const r = gcodeOptimizationEngine.analyze(gcode);
    expect(r).toBeDefined();
  });

  it("optimizes G-code", () => {
    const r = gcodeOptimizationEngine.optimize(gcode);
    expect(r).toBeDefined();
  });

  it("compares two G-code programs", () => {
    const gcode2 = "G90 G54\nG0 X0 Y0\nG1 X30 F500\nM30";
    const r = gcodeOptimizationEngine.compare(gcode, gcode2);
    expect(r).toBeDefined();
  });
});

// ── Probe Routine ───────────────────────────────────────────────
describe("ProbeRoutineEngine", () => {
  it("generates part inspection routine", () => {
    const r = probeRoutineEngine.generatePartInspection({
      controller: "fanuc",
      features: [
        { type: "bore", nominal: 10, tolerance_plus: 0.05, tolerance_minus: -0.05, position: { x: 50, y: 30, z: -10 }, diameter: 10 },
      ],
      action_on_fail: "alarm",
    });
    expect(r.gcode.length).toBeGreaterThan(0);
    expect(r.features_measured).toBeGreaterThan(0);
    expect(r.estimated_time_sec).toBeGreaterThan(0);
  });

  it("generates first article inspection", () => {
    const r = probeRoutineEngine.generateFirstArticle({
      controller: "fanuc",
      features: [
        { type: "bore", nominal: 10, tolerance_plus: 0.02, tolerance_minus: -0.02, position: { x: 50, y: 30, z: -10 }, diameter: 10 },
      ],
      datum_features: [
        { type: "surface", nominal: 0, tolerance_plus: 0.01, tolerance_minus: -0.01, position: { x: 0, y: 0, z: 0 } },
      ],
      report_format: "AS9102",
    });
    expect(r.gcode.length).toBeGreaterThan(0);
    expect(r.features_measured).toBeGreaterThan(0);
  });

  it("returns warnings for empty features", () => {
    const r = probeRoutineEngine.generatePartInspection({
      controller: "fanuc",
      features: [],
      action_on_fail: "alarm",
    });
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.features_measured).toBe(0);
  });
});

// ── Thermal Simulation ──────────────────────────────────────────
describe("ThermalSimEngine", () => {
  const input = {
    cutting_speed_mmin: 200, feed_mm: 0.15,
    depth_of_cut_mm: 2, iso_material_group: "P",
    tool_material: "carbide" as const,
    coolant: "flood" as const, operation: "milling" as const,
  };

  it("predicts thermal conditions", () => {
    const r = thermalSimEngine.predict(input);
    expect(r.cutting_zone_temp_C).toBeGreaterThan(0);
    expect(r.thermal_expansion_um).toBeGreaterThanOrEqual(0);
    expect(r.heat_partition).toBeDefined();
    expect(r.damage_risk).toBeDefined();
  });

  it("validates thermal safety", () => {
    const r = thermalSimEngine.validate(input);
    expect(r.safe).toBeDefined();
    expect(Array.isArray(r.issues)).toBe(true);
  });

  it("optimizes for lower temperature", () => {
    const r = thermalSimEngine.optimize(input);
    expect(r.optimized_temp_C).toBeLessThanOrEqual(r.current_temp_C);
    expect(r.changes.length).toBeGreaterThanOrEqual(0);
  });

  it("dry cutting = higher temperature", () => {
    const flood = thermalSimEngine.predict(input);
    const dry = thermalSimEngine.predict({ ...input, coolant: "none" as const });
    expect(dry.cutting_zone_temp_C).toBeGreaterThanOrEqual(flood.cutting_zone_temp_C);
  });
});
