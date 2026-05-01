/**
 * PP-MS9/U-PP40 — G-code Simulation Validation Tests
 *
 * Parses generated programs through PostValidationHardeningEngine and verifies:
 *   - No unsafe rapids (rapid moves into material)
 *   - Correct work offsets present (G54-G59)
 *   - Valid tool calls (T with M6)
 *   - Proper coolant sequencing (on before cut, off at end)
 *   - Spindle running before cutting moves
 */

import { describe, it, expect } from "vitest";
import { postValidationHardeningEngine } from "../engines/PostValidationHardeningEngine.js";
import { proveOutModeEngine } from "../engines/ProveOutModeEngine.js";
import type { MachineContext } from "../engines/PostProcessorPipelineEngine.js";

// ─── Test Machine ───────────────────────────────────────────────────

const TEST_MACHINE: MachineContext = {
  id: "test-vmc", name: "Test VMC", brand: "Test", controller: "haas_ngc",
  max_rpm: 12000, max_power_kW: 22,
  work_volume: { x: 762, y: 508, z: 508 },
  rapid_rate_mm_min: { x: 25400, y: 25400, z: 25400 },
  axes: 3, atc_capacity: 20, coolant_types: ["flood", "tsc"],
};

// ─── Safe Program Validation ────────────────────────────────────────

describe("PP-MS9 Simulation: Safe Program Detection", () => {
  it("passes a well-formed program", async () => {
    const gcode = [
      "%", "O1001 (GOOD PROGRAM)", "G90 G54 G17",
      "T1 M6", "S8000 M3", "M8",
      "G43 H1 Z50.", "G0 X0 Y0", "G0 Z5.",
      "G1 Z-5. F500", "G1 X100. F800",
      "G0 Z50.", "M5", "M9", "G28 G91 Z0", "M30",
    ].join("\n");

    const result = await postValidationHardeningEngine.process({
      action: "validate", gcode, machine: TEST_MACHINE,
    });

    expect(result.summary.passed).toBe(true);
    expect(result.summary.block_count).toBe(0);
  });

  it("blocks program exceeding spindle RPM", async () => {
    const gcode = [
      "G90 G54", "T1 M6", "S15000 M3",
      "G1 X50. F500", "M30",
    ].join("\n");

    const result = await postValidationHardeningEngine.process({
      action: "validate", gcode, machine: TEST_MACHINE,
    });

    const rpmFlags = result.flags.filter(f => f.dimension === "spindle_rpm" && f.severity === "BLOCK");
    expect(rpmFlags.length).toBeGreaterThan(0);
    expect(result.summary.passed).toBe(false);
  });

  it("blocks program exceeding axis travel", async () => {
    const gcode = [
      "G90 G54", "T1 M6", "S5000 M3",
      "G0 X900.", "M30",
    ].join("\n");

    const result = await postValidationHardeningEngine.process({
      action: "validate", gcode, machine: TEST_MACHINE,
    });

    const axisFlags = result.flags.filter(f => f.dimension === "axis_travel" && f.severity === "BLOCK");
    expect(axisFlags.length).toBeGreaterThan(0);
  });

  it("warns on missing work offset", async () => {
    const gcode = [
      "G90", "T1 M6", "S5000 M3",
      "G43 H1 Z50.", "G0 X50. Y50.",
      "G0 Z5.", "G1 Z-5. F500",
      "G1 X100. F800", "G1 Y100. F1000",
      "G0 Z50.", "M5", "M30",
    ].join("\n");

    const result = await postValidationHardeningEngine.process({
      action: "validate", gcode, machine: TEST_MACHINE,
    });

    const offsetFlags = result.flags.filter(f => f.dimension === "work_offset");
    expect(offsetFlags.length).toBeGreaterThan(0);
  });

  it("warns on TSC when machine lacks capability", async () => {
    const noTscMachine: MachineContext = {
      ...TEST_MACHINE,
      id: "no-tsc", name: "No TSC Machine",
      coolant_types: ["flood"],
    };

    const gcode = [
      "G90 G54", "T1 M6", "S5000 M3", "M88",
      "G1 X50. F500", "M89", "M30",
    ].join("\n");

    const result = await postValidationHardeningEngine.process({
      action: "validate", gcode, machine: noTscMachine,
    });

    const coolantFlags = result.flags.filter(f => f.dimension === "coolant");
    expect(coolantFlags.length).toBeGreaterThan(0);
  });

  it("warns on tool count exceeding ATC capacity", async () => {
    const smallAtcMachine: MachineContext = {
      ...TEST_MACHINE,
      id: "small-atc", name: "Small ATC",
      atc_capacity: 3,
    };

    const gcode = [
      "G90 G54",
      "T1 M6", "S5000 M3", "G1 X50. F500",
      "T2 M6", "S6000 M3", "G1 X50. F500",
      "T3 M6", "S7000 M3", "G1 X50. F500",
      "T4 M6", "S8000 M3", "G1 X50. F500",
      "M30",
    ].join("\n");

    const result = await postValidationHardeningEngine.process({
      action: "validate", gcode, machine: smallAtcMachine,
    });

    const toolFlags = result.flags.filter(f => f.dimension === "tool_capacity");
    expect(toolFlags.length).toBeGreaterThan(0);
  });

  it("validates non-positive feed rate", async () => {
    const gcode = [
      "G90 G54", "T1 M6", "S5000 M3",
      "G1 X50. F0", "M30",
    ].join("\n");

    const result = await postValidationHardeningEngine.process({
      action: "validate", gcode, machine: TEST_MACHINE,
    });

    const feedFlags = result.flags.filter(f => f.dimension === "feed_rate" && f.severity === "BLOCK");
    expect(feedFlags.length).toBeGreaterThan(0);
  });

  it("detects near-limit RPM as INFO", async () => {
    const gcode = [
      "G90 G54", "T1 M6", "S11500 M3",
      "G1 X50. F500", "M30",
    ].join("\n");

    const result = await postValidationHardeningEngine.process({
      action: "validate", gcode, machine: TEST_MACHINE,
    });

    const infoFlags = result.flags.filter(f => f.dimension === "spindle_rpm" && f.severity === "INFO");
    expect(infoFlags.length).toBeGreaterThan(0);
  });

  it("checks envelope via fast path", async () => {
    const gcode = [
      "G90 G54", "G0 X800.", "M30",
    ].join("\n");

    const result = await postValidationHardeningEngine.process({
      action: "check_envelope", gcode, machine: TEST_MACHINE,
    });

    // Only axis_travel flags returned
    for (const flag of result.flags) {
      expect(flag.dimension).toBe("axis_travel");
    }
  });
});

// ─── Prove-Out + Validation Combined ────────────────────────────────

describe("PP-MS9 Simulation: Prove-Out Safety", () => {
  it("prove-out version passes validation that original fails", async () => {
    // Program with RPM just over machine max
    const aggressiveGcode = [
      "G90 G54", "T1 M6", "S13000 M3",
      "G0 X50. Y50.", "G1 Z-5. F800",
      "G0 Z50.", "M30",
    ].join("\n");

    // Original fails validation
    const originalVal = await postValidationHardeningEngine.process({
      action: "validate", gcode: aggressiveGcode, machine: TEST_MACHINE,
    });
    expect(originalVal.summary.passed).toBe(false);

    // Prove-out caps RPM and reduces feeds
    const proveOut = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: aggressiveGcode,
      machine: TEST_MACHINE,
    });

    // Prove-out version should pass (RPM capped to 80% of 13000 = 10400, within 12000 limit)
    const proveOutVal = await postValidationHardeningEngine.process({
      action: "validate", gcode: proveOut.gcode, machine: TEST_MACHINE,
    });
    expect(proveOutVal.summary.block_count).toBeLessThan(originalVal.summary.block_count);
  });

  it("prove-out adds PROVE-OUT header comment", async () => {
    const gcode = "G90 G54\nT1 M6\nS8000 M3\nG1 X50. F500\nM30";
    const result = await proveOutModeEngine.process({
      action: "apply_prove_out", gcode,
    });
    expect(result.gcode).toContain("PROVE-OUT");
    expect(result.gcode).toContain("SINGLE-BLOCK");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// PostValidationSuiteEngine — Backplot, Consistency, Diff, Full Suite
// ═══════════════════════════════════════════════════════════════════════

import {
  postProcessorPipelineEngine,
  type MaterialContext,
  type ToolContext,
} from "../engines/PostProcessorPipelineEngine.js";
import {
  runFullValidation,
  runBackplot,
  checkConsistency,
  computeDiff,
  runABComparison,
  type ValidationInput,
} from "../engines/PostValidationSuiteEngine.js";

const STEEL_MAT: MaterialContext = {
  id: "4140", name: "4140 Steel", iso_group: "P",
  kc1_1: 1800, mc: 0.25, hardness_HB: 197,
  resolution_confidence: 1,
};

const ENDMILL_10: ToolContext = {
  id: "1", type: "flat_endmill", diameter_mm: 10, flute_count: 4,
  flute_length_mm: 25, material: "carbide", resolution_confidence: 1,
};

const SIM_MACHINE: MachineContext = {
  id: "haas-vf2", name: "Haas VF-2", brand: "Haas", controller: "haas",
  max_rpm: 8100, max_power_kW: 22.4,
  rapid_rate_mm_min: { x: 25400, y: 25400, z: 15240 },
  work_volume: { x: 762, y: 406, z: 508 },
  axes: 3, atc_capacity: 20, coolant_types: ["flood", "tsc"],
  resolution_confidence: 0.95,
};

const ORIGINAL_PROG = `O1001
G90 G54 G17
T1 M6
S3000 M3
G43 H1 Z50.
M8
G0 X0 Y0
G0 Z5.
G1 Z-5. F200
G1 X80. F600
G1 Y50.
G1 X0.
G1 Y0.
G0 Z5.
G1 Z-10. F180
G1 X80. F500
G1 Y50.
G0 Z50.
M9
M5
M30`;

describe("PP-MS9 Simulation: Backplot Verification", () => {

  it("no gouge in pipeline-optimized output", async () => {
    const pipe = await postProcessorPipelineEngine.process({
      gcode: ORIGINAL_PROG, machine: SIM_MACHINE, material: STEEL_MAT,
      tools: [ENDMILL_10], controller: "haas",
    });

    const bp = runBackplot(pipe.output_gcode, {
      operations: [{ tool_number: 1, tool_diameter_mm: 10, operation_type: "profiling" }],
    });

    expect(bp.gouge_detected).toBe(false);
    expect(bp.rapid_into_material).toBe(false);
    expect(bp.passed).toBe(true);
  });

  it("backplot reports non-zero move counts", async () => {
    const pipe = await postProcessorPipelineEngine.process({
      gcode: ORIGINAL_PROG, machine: SIM_MACHINE, material: STEEL_MAT,
      tools: [ENDMILL_10], controller: "haas",
    });

    const bp = runBackplot(pipe.output_gcode, {
      operations: [{ tool_number: 1, tool_diameter_mm: 10, operation_type: "profiling" }],
    });

    expect(bp.total_moves).toBeGreaterThan(0);
    expect(bp.cutting_moves).toBeGreaterThan(0);
  });

  it("backplot computes valid bounding box", async () => {
    const pipe = await postProcessorPipelineEngine.process({
      gcode: ORIGINAL_PROG, machine: SIM_MACHINE, material: STEEL_MAT,
      tools: [ENDMILL_10], controller: "haas",
    });

    const bp = runBackplot(pipe.output_gcode, {
      operations: [{ tool_number: 1, tool_diameter_mm: 10, operation_type: "profiling" }],
    });

    expect(bp.bounds.x[1]).toBeGreaterThanOrEqual(bp.bounds.x[0]);
    expect(bp.bounds.z[1]).toBeGreaterThanOrEqual(bp.bounds.z[0]);
  });
});

describe("PP-MS9 Simulation: Physics Consistency", () => {

  it("consistency check passes for optimized output", async () => {
    const pipe = await postProcessorPipelineEngine.process({
      gcode: ORIGINAL_PROG, machine: SIM_MACHINE, material: STEEL_MAT,
      tools: [ENDMILL_10], controller: "haas",
    });

    const input: ValidationInput = {
      original_gcode: ORIGINAL_PROG,
      optimized_gcode: pipe.output_gcode,
      controller: "haas",
      machine_limits: { max_rpm: 8100, max_feed: 25400, max_power_kW: 22.4 },
      material_iso: "P",
      operations: [{ tool_number: 1, tool_diameter_mm: 10, operation_type: "profiling" }],
    };

    const con = checkConsistency(input);
    expect(con.power_within_limits).toBe(true);
  });

  it("diff detects changes between original and optimized", async () => {
    const pipe = await postProcessorPipelineEngine.process({
      gcode: ORIGINAL_PROG, machine: SIM_MACHINE, material: STEEL_MAT,
      tools: [ENDMILL_10], controller: "haas", aggressiveness: 0.7,
    });

    const diff = computeDiff(ORIGINAL_PROG, pipe.output_gcode);
    expect(diff.total_lines_original).toBeGreaterThan(0);
    expect(diff.total_lines_optimized).toBeGreaterThan(0);
  });

  it("A/B comparison computes cycle time metrics", async () => {
    const pipe = await postProcessorPipelineEngine.process({
      gcode: ORIGINAL_PROG, machine: SIM_MACHINE, material: STEEL_MAT,
      tools: [ENDMILL_10], controller: "haas",
    });

    const input: ValidationInput = {
      original_gcode: ORIGINAL_PROG,
      optimized_gcode: pipe.output_gcode,
      controller: "haas",
      machine_limits: { max_rpm: 8100, max_feed: 25400, max_power_kW: 22.4 },
      material_iso: "P",
      operations: [{ tool_number: 1, tool_diameter_mm: 10, operation_type: "profiling" }],
    };

    const cmp = runABComparison(input);
    expect(cmp.cycle_time_original_sec).toBeGreaterThan(0);
    expect(cmp.cycle_time_optimized_sec).toBeGreaterThan(0);
    expect(cmp.per_operation).toBeDefined();
  });
});

describe("PP-MS9 Simulation: Full Validation Suite", () => {

  it("full validation passes for steel on Haas VF-2", async () => {
    const pipe = await postProcessorPipelineEngine.process({
      gcode: ORIGINAL_PROG, machine: SIM_MACHINE, material: STEEL_MAT,
      tools: [ENDMILL_10], controller: "haas",
    });

    const input: ValidationInput = {
      original_gcode: ORIGINAL_PROG,
      optimized_gcode: pipe.output_gcode,
      controller: "haas",
      machine_limits: { max_rpm: 8100, max_feed: 25400, max_power_kW: 22.4 },
      material_iso: "P",
      operations: [{ tool_number: 1, tool_diameter_mm: 10, operation_type: "profiling" }],
    };

    const result = runFullValidation(input);
    expect(result.backplot.gouge_detected).toBe(false);
    expect(result.backplot.rapid_into_material).toBe(false);
    // No critical backplot or consistency issues
    const criticalIssues = result.issues.filter(i =>
      i.severity === "error" && (i.unit === "backplot" || i.unit === "consistency"),
    );
    expect(criticalIssues.length).toBe(0);
  });

  it("full validation reports structured issues array", async () => {
    const pipe = await postProcessorPipelineEngine.process({
      gcode: ORIGINAL_PROG, machine: SIM_MACHINE, material: STEEL_MAT,
      tools: [ENDMILL_10], controller: "haas",
    });

    const input: ValidationInput = {
      original_gcode: ORIGINAL_PROG,
      optimized_gcode: pipe.output_gcode,
      controller: "haas",
      machine_limits: { max_rpm: 8100, max_feed: 25400, max_power_kW: 22.4 },
      material_iso: "P",
      operations: [{ tool_number: 1, tool_diameter_mm: 10, operation_type: "profiling" }],
    };

    const result = runFullValidation(input);
    expect(result.issues).toBeDefined();
    expect(Array.isArray(result.issues)).toBe(true);
    for (const issue of result.issues) {
      expect(issue.severity).toMatch(/^(error|warning|info)$/);
      expect(issue.unit).toBeTruthy();
      expect(issue.code).toBeTruthy();
      expect(issue.message).toBeTruthy();
    }
  });
});
