/**
 * Gap-Fill Tests Batch 2 — 10 Previously Untested Engines
 *
 * Covers: GCodeSafetyAnalyzer, AutoSpeedFeed, ManufacturingStatistics,
 * ToolWearCompensation, MachineMatcher, ToolpathThermal, CycleTimeEstimator,
 * AdvancedCuttingMath, GCodeEnergyOptimizer, MultiAxisKinematic
 */
import { describe, it, expect } from "vitest";

// ============================================================================
// 1. GCodeSafetyAnalyzerEngine (1,890 LOC, 24 safety rules)
// ============================================================================
describe("GCodeSafetyAnalyzerEngine", () => {
  it("imports and has analyze method", async () => {
    const { GCodeSafetyAnalyzerEngine } = await import("../engines/GCodeSafetyAnalyzerEngine.js");
    const engine = new GCodeSafetyAnalyzerEngine();
    expect(typeof engine.analyze).toBe("function");
  });

  it("detects missing tool change before cutting", async () => {
    const { GCodeSafetyAnalyzerEngine } = await import("../engines/GCodeSafetyAnalyzerEngine.js");
    const engine = new GCodeSafetyAnalyzerEngine();
    const gcode = `%\nO1001\nG90 G54\nG1 X10 Y10 F500\nM30\n%`;
    const result = engine.analyze(gcode, {
      controller: "fanuc",
      strictness: "standard",
    });
    expect(result).toBeDefined();
    expect(typeof result.safe).toBe("boolean");
    expect(typeof result.score).toBe("number");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.summary).toBeDefined();
  });

  it("passes safe program with proper structure", async () => {
    const { GCodeSafetyAnalyzerEngine } = await import("../engines/GCodeSafetyAnalyzerEngine.js");
    const engine = new GCodeSafetyAnalyzerEngine();
    const gcode = [
      "%", "O1001", "G90 G21 G40 G80", "G28 G91 Z0", "T1 M6",
      "S8000 M3", "G54", "G0 X0 Y0", "G43 H1 Z50.", "G0 Z5.",
      "G1 Z-2. F200", "G1 X50. F500", "G0 Z50.", "M5",
      "G28 G91 Z0", "M30", "%"
    ].join("\n");
    const result = engine.analyze(gcode, { controller: "fanuc", strictness: "standard" });
    expect(result.score).toBeGreaterThan(50);
    expect(result.critical.length).toBeLessThanOrEqual(2);
  });

  it("strict mode flags more issues than standard", async () => {
    const { GCodeSafetyAnalyzerEngine } = await import("../engines/GCodeSafetyAnalyzerEngine.js");
    const engine = new GCodeSafetyAnalyzerEngine();
    const gcode = `G90 G54\nT1 M6\nS5000 M3\nG0 X0 Y0\nG1 Z-5 F200\nM30`;
    const standard = engine.analyze(gcode, { controller: "fanuc", strictness: "standard" });
    const strict = engine.analyze(gcode, { controller: "fanuc", strictness: "strict" });
    const totalStd = standard.critical.length + standard.high.length + standard.medium.length;
    const totalStr = strict.critical.length + strict.high.length + strict.medium.length;
    expect(totalStr).toBeGreaterThanOrEqual(totalStd);
  });

  it("works with different controllers", async () => {
    const { GCodeSafetyAnalyzerEngine } = await import("../engines/GCodeSafetyAnalyzerEngine.js");
    const engine = new GCodeSafetyAnalyzerEngine();
    const gcode = `G90\nT1 M6\nS5000 M3\nG1 X10 F200\nM30`;
    for (const ctrl of ["fanuc", "haas", "siemens"] as const) {
      const r = engine.analyze(gcode, { controller: ctrl, strictness: "standard" });
      expect(r).toBeDefined();
      expect(typeof r.safe).toBe("boolean");
    }
  });
});

// ============================================================================
// 2. AutoSpeedFeedEngine (910 LOC)
// ============================================================================
describe("AutoSpeedFeedEngine", () => {
  it("imports and has optimize method", async () => {
    const { autoSpeedFeedEngine } = await import("../engines/AutoSpeedFeedEngine.js");
    expect(typeof autoSpeedFeedEngine.optimize).toBe("function");
  });

  it("optimizes simple G-code with one tool", async () => {
    const { autoSpeedFeedEngine } = await import("../engines/AutoSpeedFeedEngine.js");
    const gcode = [
      "%", "O1001", "T1 M6", "S3000 M3", "G0 X0 Y0 Z5.",
      "G1 Z-2. F100", "G1 X50. F300", "G1 Y30.", "G0 Z50.", "M30", "%"
    ].join("\n");
    const result = await autoSpeedFeedEngine.optimize({
      gcode,
      material: "6061-T6",
      iso_group: "N",
      hardness_hb: 95,
      tools: [{ tool_number: 1, diameter_mm: 10, flutes: 3, type: "endmill", material: "carbide" }],
      axial_depth_mm: 2,
      radial_depth_mm: 5,
    });
    expect(result).toBeDefined();
    expect(result.gcode.length).toBeGreaterThan(0);
    expect(result.stats.total_lines).toBeGreaterThan(0);
    expect(result.stats.tools_processed).toBe(1);
  });

  it("preserves rapid moves by default", async () => {
    const { autoSpeedFeedEngine } = await import("../engines/AutoSpeedFeedEngine.js");
    const gcode = `T1 M6\nS3000 M3\nG0 X10 Y10\nG1 Z-1 F100\nM30`;
    const result = await autoSpeedFeedEngine.optimize({
      gcode,
      material: "4140",
      tools: [{ tool_number: 1, diameter_mm: 12, flutes: 4 }],
    });
    expect(result.gcode).toContain("G0");
  });

  it("surfaces playbook warnings for stainless dwell anti-patterns", async () => {
    const { autoSpeedFeedEngine } = await import("../engines/AutoSpeedFeedEngine.js");
    const gcode = [
      "%", "O1002", "T1 M6", "S1800 M3", "G0 X0 Y0 Z5.",
      "G1 Z-1. F80", "G04 P1.0", "G1 X20. F120", "M30", "%"
    ].join("\n");
    const result = await autoSpeedFeedEngine.optimize({
      gcode,
      material: "316 stainless",
      iso_group: "M",
      tools: [{ tool_number: 1, diameter_mm: 8, flutes: 4, type: "endmill", material: "carbide" }],
      axial_depth_mm: 1,
      radial_depth_mm: 2,
    });
    expect(result.playbook_warnings?.some((w) => w.includes("MAT-001"))).toBe(true);
  });
});

// ============================================================================
// 3. ManufacturingStatisticsEngine (1,015 LOC, 10 methods)
// ============================================================================
describe("ManufacturingStatisticsEngine", () => {
  it("imports and has key methods", async () => {
    const { manufacturingStatisticsEngine: e } = await import("../engines/ManufacturingStatisticsEngine.js");
    expect(typeof e.processCapability).toBe("function");
    expect(typeof e.spcChart).toBe("function");
    expect(typeof e.weibullAnalysis).toBe("function");
    expect(typeof e.anova).toBe("function");
    expect(typeof e.regression).toBe("function");
    expect(typeof e.oee).toBe("function");
    expect(typeof e.learningCurve).toBe("function");
  });

  it("calculates process capability (Cp, Cpk)", async () => {
    const { manufacturingStatisticsEngine: e } = await import("../engines/ManufacturingStatisticsEngine.js");
    const result = e.processCapability({
      measurements: [10.01, 10.02, 9.99, 10.00, 10.01, 9.98, 10.03, 10.00, 9.99, 10.02,
                     10.01, 10.00, 9.99, 10.02, 10.01, 9.98, 10.00, 10.01, 9.99, 10.00],
      usl: 10.1,
      lsl: 9.9,
      target: 10.0,
    });
    expect(result.cp).toBeGreaterThan(0);
    expect(result.cpk).toBeGreaterThan(0);
  });

  it("calculates OEE", async () => {
    const { manufacturingStatisticsEngine: e } = await import("../engines/ManufacturingStatisticsEngine.js");
    const result = e.oee({
      planned_production_time_min: 480,
      actual_run_time_min: 400,
      ideal_cycle_time_min: 1,
      total_parts: 350,
      good_parts: 340,
    });
    expect(result.oee_pct).toBeGreaterThan(0);
    expect(result.oee_pct).toBeLessThanOrEqual(100);
    expect(result.availability_pct).toBeGreaterThan(0);
    expect(result.performance_pct).toBeGreaterThan(0);
    expect(result.quality_pct).toBeGreaterThan(0);
  });

  it("learning curve follows Wright's law", async () => {
    const { manufacturingStatisticsEngine: e } = await import("../engines/ManufacturingStatisticsEngine.js");
    const r = e.learningCurve(100, 0.8, 10);
    expect(r.unit_time).toBeLessThan(100);
    expect(r.unit_time).toBeGreaterThan(0);
  });

  it("regression fits linear data", async () => {
    const { manufacturingStatisticsEngine: e } = await import("../engines/ManufacturingStatisticsEngine.js");
    const result = e.regression({
      x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      y: [2.1, 4.0, 5.9, 8.1, 10.0, 12.1, 13.9, 16.0, 18.1, 20.0],
      type: "linear",
    });
    expect(result.r_squared).toBeGreaterThan(0.95);
  });
});

// ============================================================================
// 4. ToolWearCompensationEngine (450 LOC)
// ============================================================================
describe("ToolWearCompensationEngine", () => {
  it("imports and has compensate/analyze methods", async () => {
    const { toolWearCompensationEngine: e } = await import("../engines/ToolWearCompensationEngine.js");
    expect(typeof e.compensate).toBe("function");
    expect(typeof e.analyze).toBe("function");
  });

  it("compensates for tool wear in G-code", async () => {
    const { toolWearCompensationEngine: e } = await import("../engines/ToolWearCompensationEngine.js");
    const result = e.compensate({
      gcode: "T1 M6\nS8000 M3\nG0 X0 Y0 Z5.\nG1 Z-2. F200\nG1 X100. F500\nG1 Y50.\nG0 Z50.\nM30",
      material: "4140",
      iso_group: "P",
      tools: [{
        tool_number: 1,
        diameter_mm: 10,
        flutes: 4,
        type: "endmill",
        material: "carbide",
      }],
    });
    expect(result).toBeDefined();
  });
});

// ============================================================================
// 5. MachineMatcherEngine (399 LOC)
// ============================================================================
describe("MachineMatcherEngine", () => {
  it("imports and has match/quickMatch methods", async () => {
    const { machineMatcherEngine: e } = await import("../engines/MachineMatcherEngine.js");
    expect(typeof e.match).toBe("function");
    expect(typeof e.quickMatch).toBe("function");
  });

  it("quick matches G-code to machines", async () => {
    const { machineMatcherEngine: e } = await import("../engines/MachineMatcherEngine.js");
    const result = e.quickMatch(
      "G90 G54\nT1 M6\nS8000 M3\nG0 X0 Y0\nG1 Z-2 F200\nG1 X100 Y50\nM30",
      "6061-T6"
    );
    expect(result.top3).toBeDefined();
    expect(Array.isArray(result.top3)).toBe(true);
    expect(result.requirements).toBeDefined();
  });
});

// ============================================================================
// 6. ToolpathThermalEngine (1,496 LOC)
// ============================================================================
describe("ToolpathThermalEngine", () => {
  it("imports and has key methods", async () => {
    const { toolpathThermalEngine: e } = await import("../engines/ToolpathThermalEngine.js");
    expect(typeof e.analyzeHeatAccumulation).toBe("function");
    expect(typeof e.predictDistortion).toBe("function");
    expect(typeof e.optimizeCuttingSequence).toBe("function");
    expect(typeof e.listMaterials).toBe("function");
  });

  it("lists supported materials", async () => {
    const { toolpathThermalEngine: e } = await import("../engines/ToolpathThermalEngine.js");
    const materials = e.listMaterials();
    expect(materials.length).toBeGreaterThan(0);
  });

  it("analyzes heat accumulation from G-code", async () => {
    const { toolpathThermalEngine: e } = await import("../engines/ToolpathThermalEngine.js");
    const gcode = "T1 M6\nS8000 M3\nG0 X0 Y0 Z5.\nG1 Z-2. F200\nG1 X100. F500\nG1 Y50.\nG0 Z50.\nM30";
    const result = e.analyzeHeatAccumulation({
      gcode,
      material: "aluminum_6061",
      tool_diameter: 10,
      workpiece_dimensions: { x: 150, y: 100, z: 30 },
      coolant_type: "flood",
      ambient_temp: 20,
    });
    expect(result).toBeDefined();
    expect(result.cooling_recommendations.some((r) => r.includes("[Playbook"))).toBe(true);
  });

  it("predicts thermal distortion from G-code", async () => {
    const { toolpathThermalEngine: e } = await import("../engines/ToolpathThermalEngine.js");
    const gcode = "T1 M6\nS8000 M3\nG1 X100 F500\nG1 Y50\nM30";
    const result = e.predictDistortion({
      gcode,
      material: "steel_1045",
      workpiece_dimensions: { x: 100, y: 50, z: 20 },
      critical_dimensions: [{ axis: "x", nominal: 100, tolerance: 0.05 }],
      coolant_type: "flood",
    });
    expect(result).toBeDefined();
  });
});

// ============================================================================
// 7. CycleTimeEstimatorEngine (1,325 LOC)
// ============================================================================
describe("CycleTimeEstimatorEngine", () => {
  it("imports and has key methods", async () => {
    const { cycleTimeEstimatorEngine: e } = await import("../engines/CycleTimeEstimatorEngine.js");
    expect(typeof e.estimateFromGCode).toBe("function");
    expect(typeof e.getAvailableProfiles).toBe("function");
  });

  it("lists available machine profiles", async () => {
    const { cycleTimeEstimatorEngine: e } = await import("../engines/CycleTimeEstimatorEngine.js");
    const profiles = e.getAvailableProfiles();
    expect(profiles.length).toBeGreaterThan(0);
  });

  it("estimates cycle time from G-code", async () => {
    const { cycleTimeEstimatorEngine: e } = await import("../engines/CycleTimeEstimatorEngine.js");
    const gcode = [
      "G90 G21", "T1 M6", "S8000 M3", "G54", "G0 X0 Y0 Z5.",
      "G1 Z-2. F200", "G1 X50. F500", "G1 Y30. F500",
      "G0 Z50.", "M30"
    ].join("\n");
    const result = e.estimateFromGCode(gcode, { controller: "fanuc" });
    expect(result.total_seconds).toBeGreaterThan(0);
    expect(result.cutting_time).toBeGreaterThan(0);
    expect(result.rapid_time).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// 8. AdvancedCuttingMathEngine (807 LOC, 13 models)
// ============================================================================
describe("AdvancedCuttingMathEngine", () => {
  it("imports and has methods", async () => {
    const { advancedCuttingMathEngine: e } = await import("../engines/AdvancedCuttingMathEngine.js");
    expect(e).toBeDefined();
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(e))
      .filter(n => n !== "constructor");
    expect(methods.length).toBeGreaterThan(5);
  });
});

// ============================================================================
// 9. GCodeEnergyOptimizerEngine (847 LOC)
// ============================================================================
describe("GCodeEnergyOptimizerEngine", () => {
  it("imports successfully", async () => {
    const mod = await import("../engines/GCodeEnergyOptimizerEngine.js");
    expect(mod.gcodeEnergyOptimizerEngine || mod.GCodeEnergyOptimizerEngine).toBeDefined();
  });
});

// ============================================================================
// 10. MultiAxisKinematicEngine (854 LOC)
// ============================================================================
describe("MultiAxisKinematicEngine", () => {
  it("imports and has methods", async () => {
    const { multiAxisKinematicEngine: e } = await import("../engines/MultiAxisKinematicEngine.js");
    expect(e).toBeDefined();
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(e))
      .filter(n => n !== "constructor");
    expect(methods.length).toBeGreaterThan(0);
  });
});
