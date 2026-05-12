/**
 * PP-MS5 Tests — ProveOutModeEngine + PostValidationHardeningEngine + PostValidationReportEngine
 *
 * Validates:
 *   - Feed reduction by 25% (default) and material-aware derating
 *   - RPM capping at 80% (default) with ISO group multipliers
 *   - Optional stops at tool changes, spindle direction changes
 *   - Machine limit validation (RPM, feed, envelope, tool capacity, coolant)
 *   - Report generation in text, JSON, and detailed formats
 */

import { describe, it, expect } from "vitest";
import { proveOutModeEngine } from "../engines/ProveOutModeEngine.js";
import { postValidationHardeningEngine } from "../engines/PostValidationHardeningEngine.js";
import { postValidationReportEngine } from "../engines/PostValidationReportEngine.js";
import type { MachineContext, MaterialContext } from "../engines/PostProcessorPipelineEngine.js";

// ─── Test Fixtures ──────────────────────────────────────────────────

const SAMPLE_GCODE = [
  "O1001",
  "(PRISM OPTIMIZED PROGRAM)",
  "G90 G54 G17",
  "T1 M6",
  "S8000 M3",
  "G43 H1 Z50.",
  "G0 X0 Y0",
  "G0 Z5.",
  "G1 Z-5. F500",
  "G1 X100. Y50. F800",
  "G1 X200. Y100. F1200",
  "G1 Z-15. F400",
  "M9",
  "M5",
  "T2 M6",
  "S6000 M3",
  "M8",
  "G0 X0 Y0",
  "G1 Z-3. F600",
  "G1 X150. F1000",
  "M9",
  "M5",
  "M30",
].join("\n");

const TEST_MACHINE: MachineContext = {
  id: "haas-vf2",
  name: "Haas VF-2",
  brand: "Haas",
  controller: "haas",
  max_rpm: 8100,
  max_power_kW: 22.4,
  rapid_rate_mm_min: { x: 25400, y: 25400, z: 25400 },
  work_volume: { x: 762, y: 406, z: 508 },
  axes: 3,
  atc_capacity: 20,
  coolant_types: ["flood", "tsc"],
  resolution_confidence: 0.95,
};

const STEEL_MATERIAL: MaterialContext = {
  id: "steel-1045",
  name: "AISI 1045 Steel",
  iso_group: "P",
  uts_MPa: 585,
  hardness_HB: 170,
  resolution_confidence: 0.9,
};

const TITANIUM_MATERIAL: MaterialContext = {
  id: "ti-6al-4v",
  name: "Ti-6Al-4V",
  iso_group: "S",
  uts_MPa: 950,
  hardness_HB: 334,
  resolution_confidence: 0.95,
};

const ALUMINUM_MATERIAL: MaterialContext = {
  id: "al-6061-t6",
  name: "6061-T6 Aluminum",
  iso_group: "N",
  uts_MPa: 310,
  hardness_HB: 95,
  resolution_confidence: 0.95,
};

// ─── ProveOutModeEngine Tests ───────────────────────────────────────

describe("ProveOutModeEngine", () => {
  it("reduces feeds by 25% and caps RPM at 80%", async () => {
    const result = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: SAMPLE_GCODE,
    });

    expect(result.summary.feed_reductions).toBeGreaterThan(0);
    expect(result.summary.rpm_caps).toBeGreaterThan(0);

    // Check that F800 became F600 (800 * 0.75 = 600)
    const feedBlock = result.blocks.find(b => b.reasons.some(r => r.includes("Feed: 800")));
    expect(feedBlock).toBeDefined();
    expect(feedBlock!.text).toContain("F600");

    // Check that S8000 became S6400 (8000 * 0.80 = 6400)
    const rpmBlock = result.blocks.find(b => b.reasons.some(r => r.includes("RPM: 8000")));
    expect(rpmBlock).toBeDefined();
    expect(rpmBlock!.text).toContain("S6400");
  });

  it("inserts optional stops at tool changes", async () => {
    const result = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: SAMPLE_GCODE,
    });

    expect(result.summary.optional_stops_added).toBeGreaterThan(0);
    expect(result.gcode).toContain("M01");
    expect(result.gcode).toContain("PROVE-OUT");
  });

  it("adds single-block mode header", async () => {
    const result = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: SAMPLE_GCODE,
    });

    expect(result.gcode).toContain("PROVE-OUT MODE - FIRST ARTICLE");
    expect(result.gcode).toContain("SINGLE-BLOCK MODE");
    expect(result.gcode).toContain("FEEDS REDUCED 25%");
    expect(result.gcode).toContain("RPM CAPPED 80%");
  });

  it("applies more conservative derating for superalloy (ISO S)", async () => {
    const steelResult = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: "S10000 M3\nG1 X100. F1000",
      material: STEEL_MATERIAL,
    });

    const titaniumResult = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: "S10000 M3\nG1 X100. F1000",
      material: TITANIUM_MATERIAL,
    });

    // Titanium should have MORE feed reduction than steel
    expect(titaniumResult.summary.avg_feed_reduction_pct).toBeGreaterThan(
      steelResult.summary.avg_feed_reduction_pct
    );
  });

  it("applies less conservative derating for aluminum (ISO N)", async () => {
    const steelResult = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: "S10000 M3\nG1 X100. F1000",
      material: STEEL_MATERIAL,
    });

    const aluminumResult = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: "S10000 M3\nG1 X100. F1000",
      material: ALUMINUM_MATERIAL,
    });

    // Aluminum should have LESS feed reduction than steel
    expect(aluminumResult.summary.avg_feed_reduction_pct).toBeLessThan(
      steelResult.summary.avg_feed_reduction_pct
    );
  });

  it("uses Siemens comment syntax when controller is siemens", async () => {
    const result = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: SAMPLE_GCODE,
      config: { controller: "siemens" },
    });

    expect(result.gcode).toContain("; **** PROVE-OUT MODE");
  });

  it("clamps machine RPM when machine context provided", async () => {
    const lowRpmMachine: MachineContext = {
      ...TEST_MACHINE,
      max_rpm: 5000,
    };

    const result = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: "S8000 M3\nG1 X100. F500",
      machine: lowRpmMachine,
    });

    // After 80% cap: 8000 * 0.8 = 6400, but machine max is 5000
    expect(result.warnings.some(w => w.includes("exceeded machine max"))).toBe(true);
  });

  it("estimates cycle time ratio > 1.0 due to feed reduction", async () => {
    const result = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: SAMPLE_GCODE,
    });

    expect(result.estimated_cycle_time_ratio).toBeGreaterThan(1.0);
    expect(result.estimated_cycle_time_ratio).toBeLessThan(2.0);
  });

  it("does not modify rapids (G0)", async () => {
    const result = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: "G0 X100. Y50. F5000\nG1 X200. F1000",
    });

    // G0 line should not have feed modified
    const rapidBlock = result.blocks.find(b => b.text.includes("G0"));
    expect(rapidBlock?.reasons.filter(r => r.startsWith("Feed:")).length ?? 0).toBe(0);
  });

  it("validates config bounds — rejects >50% feed reduction", async () => {
    const result = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: "S8000 M3\nG1 X100. F1000",
      config: { feed_reduction: 0.9 },
    });

    expect(result.warnings.some(w => w.includes("clamped"))).toBe(true);
  });
});

// ─── PostValidationHardeningEngine Tests ────────────────────────────

describe("PostValidationHardeningEngine", () => {
  it("blocks RPM exceeding machine max", async () => {
    const result = await postValidationHardeningEngine.process({
      action: "validate",
      gcode: "S15000 M3\nG1 X100. F500",
      machine: TEST_MACHINE, // max_rpm = 8100
    });

    expect(result.summary.passed).toBe(false);
    expect(result.summary.block_count).toBeGreaterThan(0);
    expect(result.flags.some(f =>
      f.dimension === "spindle_rpm" && f.severity === "BLOCK"
    )).toBe(true);
  });

  it("passes valid program within machine limits", async () => {
    const result = await postValidationHardeningEngine.process({
      action: "validate",
      gcode: SAMPLE_GCODE,
      machine: TEST_MACHINE,
    });

    // S8000 is within max_rpm 8100, all coords within envelope
    expect(result.summary.block_count).toBe(0);
    expect(result.summary.passed).toBe(true);
  });

  it("blocks axis travel exceeding work envelope", async () => {
    const result = await postValidationHardeningEngine.process({
      action: "validate",
      gcode: "G54\nG0 X900. Y0\nG1 Z-5. F500",
      machine: TEST_MACHINE, // X max = 762
    });

    expect(result.flags.some(f =>
      f.dimension === "axis_travel" && f.severity === "BLOCK" && f.message.includes("X900")
    )).toBe(true);
  });

  it("warns on TSC coolant when machine lacks TSC", async () => {
    const noTscMachine: MachineContext = {
      ...TEST_MACHINE,
      coolant_types: ["flood"],
    };

    const result = await postValidationHardeningEngine.process({
      action: "validate",
      gcode: "G54\nS5000 M3\nM88\nG1 X50. F500",
      machine: noTscMachine,
    });

    expect(result.flags.some(f =>
      f.dimension === "coolant" && f.severity === "WARN"
    )).toBe(true);
  });

  it("warns when tool count exceeds ATC capacity", async () => {
    const smallAtcMachine: MachineContext = {
      ...TEST_MACHINE,
      atc_capacity: 1,
    };

    const result = await postValidationHardeningEngine.process({
      action: "validate",
      gcode: "T1 M6\nS5000 M3\nG1 X50. F500\nT2 M6\nS6000 M3\nG1 X100. F600",
      machine: smallAtcMachine,
    });

    expect(result.flags.some(f =>
      f.dimension === "tool_capacity" && f.severity === "WARN"
    )).toBe(true);
  });

  it("warns when no work offset found", async () => {
    const gcode = Array.from({ length: 15 }, (_, i) => `G1 X${i * 10}. F500`).join("\n");
    const result = await postValidationHardeningEngine.process({
      action: "validate",
      gcode,
      machine: TEST_MACHINE,
    });

    expect(result.flags.some(f =>
      f.dimension === "work_offset" && f.severity === "WARN"
    )).toBe(true);
  });

  it("flags near-limit RPM as INFO", async () => {
    // 8100 * 0.95 = 7695, so S7800 should be near-limit INFO
    const result = await postValidationHardeningEngine.process({
      action: "validate",
      gcode: "G54\nS7800 M3\nG1 X50. F500",
      machine: TEST_MACHINE,
    });

    expect(result.flags.some(f =>
      f.dimension === "spindle_rpm" && f.severity === "INFO"
    )).toBe(true);
  });

  it("check_envelope returns only axis_travel flags", async () => {
    const result = await postValidationHardeningEngine.process({
      action: "check_envelope",
      gcode: "S15000 M3\nG0 X900.\nG1 Z-5. F500",
      machine: TEST_MACHINE,
    });

    // Should only have axis_travel flags, not spindle_rpm
    expect(result.flags.every(f => f.dimension === "axis_travel")).toBe(true);
  });

  it("blocks non-positive RPM", async () => {
    const result = await postValidationHardeningEngine.process({
      action: "validate",
      gcode: "G54\nS0 M3\nG1 X50. F500",
      machine: TEST_MACHINE,
    });

    expect(result.flags.some(f =>
      f.dimension === "spindle_rpm" && f.severity === "BLOCK" && f.message.includes("non-positive")
    )).toBe(true);
  });
});

// ─── PostValidationReportEngine Tests ───────────────────────────────

describe("PostValidationReportEngine", () => {
  it("generates text report for passing program", async () => {
    const validation = await postValidationHardeningEngine.process({
      action: "validate",
      gcode: SAMPLE_GCODE,
      machine: TEST_MACHINE,
    });

    const report = await postValidationReportEngine.process({
      action: "generate_report",
      validation,
      machine: TEST_MACHINE,
      format: "text",
      program_name: "O1001",
    });

    expect(report.passed).toBe(true);
    expect(report.content).toContain("PASSED");
    expect(report.content).toContain("O1001");
    expect(report.content).toContain("Haas VF-2");
    expect(report.metadata.format).toBe("text");
  });

  it("generates detailed report with per-block flags for failing program", async () => {
    const validation = await postValidationHardeningEngine.process({
      action: "validate",
      gcode: "S15000 M3\nG0 X900.\nG1 Z-5. F500",
      machine: TEST_MACHINE,
    });

    const report = await postValidationReportEngine.process({
      action: "generate_report",
      validation,
      machine: TEST_MACHINE,
      format: "detailed",
    });

    expect(report.passed).toBe(false);
    expect(report.content).toContain("FAILED");
    expect(report.content).toContain("[FAIL]");
    expect(report.content).toContain("Spindle RPM");
    expect(report.verdicts.some(v => !v.passed)).toBe(true);
  });

  it("generates valid JSON report", async () => {
    const validation = await postValidationHardeningEngine.process({
      action: "validate",
      gcode: SAMPLE_GCODE,
      machine: TEST_MACHINE,
    });

    const report = await postValidationReportEngine.process({
      action: "generate_report",
      validation,
      machine: TEST_MACHINE,
      format: "json",
    });

    const parsed = JSON.parse(report.content);
    expect(parsed).toHaveProperty("passed");
    expect(parsed).toHaveProperty("summary");
    expect(parsed).toHaveProperty("machine_capabilities");
    expect(parsed.machine_capabilities.max_rpm).toBe(8100);
  });

  it("includes recommendations when enabled", async () => {
    const validation = await postValidationHardeningEngine.process({
      action: "validate",
      gcode: "S15000 M3\nG1 X100. F500",
      machine: TEST_MACHINE,
    });

    const report = await postValidationReportEngine.process({
      action: "generate_report",
      validation,
      include_recommendations: true,
      format: "detailed",
    });

    expect(report.verdicts.some(v => v.recommendations.length > 0)).toBe(true);
  });

  it("summary_only returns text without recommendations", async () => {
    const validation = await postValidationHardeningEngine.process({
      action: "validate",
      gcode: SAMPLE_GCODE,
      machine: TEST_MACHINE,
    });

    const report = await postValidationReportEngine.process({
      action: "summary_only",
      validation,
    });

    expect(report.metadata.format).toBe("text");
  });
});
