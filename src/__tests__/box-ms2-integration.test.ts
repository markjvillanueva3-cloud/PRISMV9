/**
 * BOX-MS2 Integration Tests (U-BOX25)
 *
 * End-to-end tests exercising the full macro conversion pipeline:
 *   OkumaOSPParser → MacroHeaderGenerator → AutoSpeedFeedCalculator →
 *   ProgramMacroConverter → MacroValidation → BatchConversion
 *
 * Tests verify:
 *   1. Converted macro with original params produces correct output
 *   2. Changed stock size → dimensions update correctly
 *   3. Changed drill size → peck depth and feed recalculate
 *   4. Changed boring bar → DOC and feed scale
 *   5. G50 clamp enforced at all stock sizes
 */
import { describe, it, expect } from "vitest";
import { OkumaMacroHeaderGeneratorEngine } from "../engines/OkumaMacroHeaderGeneratorEngine.js";
import { AutoSpeedFeedCalculatorEngine } from "../engines/AutoSpeedFeedCalculatorEngine.js";
import { ToolSubstitutionEngine } from "../engines/ToolSubstitutionEngine.js";
import { ProgramMacroConverterEngine } from "../engines/ProgramMacroConverterEngine.js";
import { MacroValidationEngine } from "../engines/MacroValidationEngine.js";
import { BatchMacroConversionEngine } from "../engines/BatchMacroConversionEngine.js";
import type { OkumaProgram, OkumaToolSection, OkumaSafetyInfo } from "../engines/OkumaOSPParserEngine.js";

// ============================================================================
// FIXTURES — Realistic Okuma lathe program
// ============================================================================

function makeRealisticProgram(): OkumaProgram {
  return {
    filename: "FIXTURE-001-CASING.MIN",
    header: "(FIXTURE 001 - BASIC CASING - MATERIAL STEEL 1030)",
    toolSections: [
      {
        label: "NAT01", toolCode: "T010101", toolNumber: 1, offsetNumber: 1,
        comment: "OD ROUGH INSERT R.032", startLine: 5, endLine: 25,
        operations: [{ type: "od_rough", line: 10, gcode: "G85", params: {} }],
        speedMode: "css", cssValue: 600, maxRPM: 2500, coolant: true,
      },
      {
        label: "NAT02", toolCode: "T020202", toolNumber: 2, offsetNumber: 2,
        comment: "OD FINISH INSERT R.016", startLine: 26, endLine: 40,
        operations: [{ type: "od_finish", line: 30, gcode: "G85", params: {} }],
        speedMode: "css", cssValue: 800, maxRPM: 3000, coolant: true,
      },
      {
        label: "NAT03", toolCode: "T030303", toolNumber: 3, offsetNumber: 3,
        comment: "CENTER DRILL", startLine: 41, endLine: 50,
        operations: [{ type: "center_drill", line: 45, gcode: "G81", params: {} }],
        speedMode: "rpm", rpmValue: 1500, coolant: true,
      },
      {
        label: "NAT05", toolCode: "T050505", toolNumber: 5, offsetNumber: 5,
        comment: "DRILL .500", startLine: 51, endLine: 65,
        operations: [{ type: "peck_drill", line: 55, gcode: "G74", params: {} }],
        speedMode: "rpm", rpmValue: 2000, coolant: true,
      },
      {
        label: "NAT07", toolCode: "T070707", toolNumber: 7, offsetNumber: 7,
        comment: "BORE ROUGH .625 BAR", startLine: 66, endLine: 80,
        operations: [{ type: "bore", line: 70, gcode: "G87", params: {} }],
        speedMode: "css", cssValue: 400, maxRPM: 2000, coolant: true,
      },
    ],
    variables: [],
    subroutineCalls: [],
    hasBarFeeder: false,
    hasCAxis: false,
    hasLiveTooling: false,
    hasThreading: false,
    hasMacroVariables: false,
    lineCount: 85,
    operations: [],
    safety: {
      g50MaxRPM: [2500, 3000, 2000],
      retractPositions: [{ x: 20, z: 20 }, { x: 20, z: 20 }, { x: 20, z: 20 }, { x: 20, z: 20 }],
      optionalStops: 5,
      mandatoryStops: 0,
      coolantOnCount: 5,
      coolantOffCount: 5,
      hasSpindleStop: true,
      gearRanges: ["M42"],
    },
    rawLines: [
      "(FIXTURE 001 - BASIC CASING - MATERIAL STEEL 1030)",
      "T010101",
      "G50 S2500",
      "G96 S600 M3",
      "M8",
      "G0 X2.0 Z0.1",
      "G1 X1.875 F0.012",
      "G1 Z-3.5",
      "G0 X20 Z20",
      "M9",
      "M1",
      "T020202",
      "G50 S3000",
      "G96 S800 M3",
      "M8",
      "G0 X1.875 Z0.05",
      "G1 Z-3.5 F0.006",
      "G0 X20 Z20",
      "M9",
      "M1",
      "T030303",
      "G97 S1500 M3",
      "M8",
      "G0 X0 Z0.1",
      "G81 Z-0.25 F0.003",
      "G0 X20 Z20",
      "M9",
      "M1",
      "T050505",
      "G97 S2000 M3",
      "M8",
      "G0 X0 Z0.1",
      "G74 Z-2.0 D0.5 L0 F0.008",
      "G0 X20 Z20",
      "M9",
      "M1",
      "T070707",
      "G50 S2000",
      "G96 S400 M3",
      "M8",
      "G0 X0.750 Z0.1",
      "G1 X0.875 F0.008",
      "G1 Z-2.0",
      "G0 X20 Z20",
      "M9",
      "M1",
      "M5",
      "M30",
    ],
  };
}

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("BOX-MS2 Integration — Full Macro Pipeline", () => {
  const headerGen = new OkumaMacroHeaderGeneratorEngine();
  const autoSF = new AutoSpeedFeedCalculatorEngine();
  const toolSub = new ToolSubstitutionEngine();
  const converter = new ProgramMacroConverterEngine();
  const validator = new MacroValidationEngine();
  const batch = new BatchMacroConversionEngine();

  describe("End-to-end: Parse → Header → Convert → Validate", () => {
    it("converts a realistic 5-tool program to parametric macro", () => {
      const prog = makeRealisticProgram();

      // Generate header
      const header = headerGen.generate({
        program_name: "FIXTURE-001-CASING",
        unit_system: "imperial",
        stock_diameter: 2.0,
        part_length: 3.5,
        finish_od: 1.875,
        drill_size: 0.500,
        od_finish_allowance: 0.010,
        tools: [
          { station: 1, operation: "od_rough", sfm: 600, feed: 0.012, doc: 0.100, nose_radius: 0.032 },
          { station: 2, operation: "od_finish", sfm: 800, feed: 0.006, nose_radius: 0.016 },
          { station: 3, operation: "center_drill", sfm: 300, feed: 0.003 },
          { station: 5, operation: "peck_drill", sfm: 300, feed: 0.008 },
          { station: 7, operation: "bore_rough", sfm: 400, feed: 0.008, doc: 0.060 },
        ],
      });

      expect(header.variable_map.length).toBeGreaterThan(10);
      expect(header.rpm_formulas.length).toBe(5);

      // Convert program
      const result = converter.convert({
        program: prog,
        header,
        stock_diameter: 2.0,
        finish_od: 1.875,
        part_length: 3.5,
        unit_system: "imperial",
      });

      expect(result.stats.dimensions_replaced).toBeGreaterThan(0);
      expect(result.safety_preserved.g50_clamps_kept).toBeGreaterThanOrEqual(2);
      expect(result.safety_preserved.spindle_stop_kept).toBe(true);
      expect(result.safety_preserved.coolant_balanced).toBe(true);
    });

    it("validates converted macro passes safety checks", () => {
      const prog = makeRealisticProgram();
      const header = headerGen.generate({
        program_name: "TEST",
        unit_system: "imperial",
        stock_diameter: 2.0,
        part_length: 3.5,
        finish_od: 1.875,
        tools: [
          { station: 1, operation: "od_rough", sfm: 600, feed: 0.012 },
          { station: 2, operation: "od_finish", sfm: 800, feed: 0.006 },
        ],
      });

      const conversion = converter.convert({
        program: prog,
        header,
        stock_diameter: 2.0,
        finish_od: 1.875,
        part_length: 3.5,
      });

      const vars: Record<string, number> = {};
      for (const v of header.variable_map) {
        if (typeof v.value === "number") vars[v.var] = v.value;
      }

      const validation = validator.validate({
        macro_lines: conversion.converted_lines,
        original_lines: prog.rawLines,
        original_vars: vars,
      });

      // Safety checks should pass
      expect(validation.safety.g50_present).toBe(true);
      expect(validation.safety.spindle_stop).toBe(true);
      expect(validation.safety.retract_safe).toBe(true);
      expect(validation.safety.coolant_balanced).toBe(true);
    });
  });

  describe("Parameter change: stock diameter", () => {
    it("RPM recalculates when stock diameter changes", () => {
      // Original: 2.0" stock, 600 SFM → RPM = 600*3.82/2.0 = 1146
      const origRPM = autoSF.calcRPM(600, 2.0, "imperial");
      // Changed: 1.5" stock → RPM = 600*3.82/1.5 = 1528
      const newRPM = autoSF.calcRPM(600, 1.5, "imperial");

      expect(newRPM).toBeGreaterThan(origRPM);
      expect(newRPM).toBeCloseTo(origRPM * (2.0 / 1.5), -1);
    });

    it("G50 clamp still enforced at smaller diameter", () => {
      // Small stock: 0.5" → RPM = 600*3.82/0.5 = 4584
      const rawRPM = autoSF.calcRPM(600, 0.5, "imperial");
      const clamped = autoSF.applyG50Clamp(rawRPM, "od_rough");

      expect(rawRPM).toBeGreaterThan(2500);
      expect(clamped.clamped_rpm).toBe(2500); // G50 default for od_rough
      expect(clamped.was_clamped).toBe(true);
    });
  });

  describe("Parameter change: drill size", () => {
    it("peck depth recalculates for new drill size", () => {
      const sub = toolSub.substituteDrill({
        original_dia: 0.500,
        new_dia: 0.375,
        hole_depth: 2.0,
        original_feed: 0.008,
        sfm: 300,
        material_group: "P",
        unit_system: "imperial",
      });

      // Peck = 1xD = 0.375 (not 0.500)
      expect(sub.peck_schedule[0]).toBeCloseTo(0.375, 3);
      // Feed scales with sqrt(ratio)
      expect(sub.new_feed).toBeLessThan(0.008);
      // RPM increases (smaller diameter)
      expect(sub.new_rpm).toBeGreaterThan(autoSF.calcRPM(300, 0.500, "imperial"));
    });
  });

  describe("Parameter change: boring bar", () => {
    it("DOC and feed scale for smaller bar", () => {
      const sub = toolSub.substituteBoringBar({
        original_bar_dia: 0.625,
        new_bar_dia: 0.375,
        bar_stickout: 2.5,
        original_feed: 0.008,
        original_doc: 0.060,
        original_max_rpm: 2000,
        unit_system: "imperial",
      });

      // Smaller bar → reduced DOC (linear with diameter ratio)
      expect(sub.new_doc).toBeLessThan(0.060);
      expect(sub.doc_scale).toBeCloseTo(0.375 / 0.625, 2);
      // Smaller bar → reduced feed (L/D changes)
      expect(sub.new_feed).toBeLessThan(0.008);
      // L/D = 2.5/0.375 = 6.67 → unsafe
      expect(sub.safe).toBe(false);
    });
  });

  describe("Parameter change: insert nose radius", () => {
    it("finish feed recalculates for target Ra", () => {
      const sub = toolSub.substituteInsert({
        original_radius: 0.032, // R.032
        new_radius: 0.016,      // R.016
        original_feed: 0.006,
        target_ra_um: 1.6,
        unit_system: "imperial",
      });

      // Smaller radius → must reduce feed
      expect(sub.new_feed).toBeLessThan(0.006);
      // Predicted Ra should match target
      expect(sub.predicted_ra_new_feed).toBeCloseTo(1.6, 0);
    });

    it("finish feed calculation matches auto speed/feed engine", () => {
      const fromAutoSF = autoSF.calcFinishFeed(1.6, 0.032, "imperial");
      const fromToolSub = toolSub.substituteInsert({
        original_radius: 0.016,
        new_radius: 0.032,
        original_feed: 0.004,
        target_ra_um: 1.6,
        unit_system: "imperial",
      });

      // Both should produce the same feed for same Ra + radius
      expect(fromAutoSF).toBeCloseTo(fromToolSub.new_feed, 3);
    });
  });

  describe("Batch conversion", () => {
    it("converts multiple programs with summary stats", () => {
      const prog1 = makeRealisticProgram();
      const prog2 = { ...makeRealisticProgram(), filename: "FIXTURE-002.MIN" };

      const result = batch.convertBatch({
        programs: [prog1, prog2],
        unit_system: "imperial",
      });

      expect(result.summary.total_programs).toBe(2);
      expect(result.summary.successful).toBe(2);
      expect(result.records.length).toBe(2);
      expect(result.mapping.length).toBe(2);
      expect(result.records[0].success).toBe(true);
      expect(result.records[0].header).toBeDefined();
      expect(result.records[0].conversion).toBeDefined();
      expect(result.records[0].validation).toBeDefined();
    });

    it("respects max_programs limit", () => {
      const programs = Array.from({ length: 10 }, (_, i) => ({
        ...makeRealisticProgram(),
        filename: `FIXTURE-${i + 1}.MIN`,
      }));

      const result = batch.convertBatch({
        programs,
        max_programs: 3,
      });

      expect(result.summary.total_programs).toBe(3);
      expect(result.records.length).toBe(3);
    });

    it("single program conversion produces complete record", () => {
      const prog = makeRealisticProgram();
      const record = batch.convertSingle(prog, "imperial", false);

      expect(record.success).toBe(true);
      expect(record.original_filename).toBe("FIXTURE-001-CASING.MIN");
      expect(record.macro_text).toBeDefined();
      expect(record.macro_text!.length).toBeGreaterThan(0);
      expect(record.variable_map).toBeDefined();
      expect(record.stats).toBeDefined();
      expect(record.stats!.original_lines).toBe(prog.rawLines.length);
      expect(record.stats!.macro_lines).toBeGreaterThan(prog.rawLines.length); // Header adds lines
    });

    it("skip_validation produces record without validation", () => {
      const prog = makeRealisticProgram();
      const record = batch.convertSingle(prog, "imperial", true);

      expect(record.success).toBe(true);
      expect(record.validation).toBeUndefined();
    });
  });

  describe("Safety enforcement across all scenarios", () => {
    it("G50 clamp values are always present in converted output", () => {
      const prog = makeRealisticProgram();
      const record = batch.convertSingle(prog, "imperial", false);

      // The converted text must contain G50 lines
      const g50Lines = record.macro_text!.split("\n").filter(l => /G50\s+S\d+/i.test(l));
      expect(g50Lines.length).toBeGreaterThanOrEqual(2);
    });

    it("M5 spindle stop preserved in converted output", () => {
      const prog = makeRealisticProgram();
      const record = batch.convertSingle(prog, "imperial", false);

      expect(record.macro_text).toContain("M5");
    });

    it("M1 optional stops preserved in converted output", () => {
      const prog = makeRealisticProgram();
      const record = batch.convertSingle(prog, "imperial", false);

      const m1Count = record.macro_text!.split("\n").filter(l => /^\s*M0?1\s*$/i.test(l.trim())).length;
      expect(m1Count).toBeGreaterThanOrEqual(1);
    });
  });
});
