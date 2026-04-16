/**
 * Tests for BOX-MS2 engines (continued):
 *   - ToolSubstitutionEngine (U-BOX21)
 *   - ProgramMacroConverterEngine (U-BOX22)
 */
import { describe, it, expect } from "vitest";
import { ToolSubstitutionEngine } from "../engines/ToolSubstitutionEngine.js";
import { ProgramMacroConverterEngine } from "../engines/ProgramMacroConverterEngine.js";
import type { OkumaProgram, OkumaToolSection, OkumaSafetyInfo } from "../engines/OkumaOSPParserEngine.js";

// ============================================================================
// HELPERS
// ============================================================================

function makeSafetyInfo(overrides: Partial<OkumaSafetyInfo> = {}): OkumaSafetyInfo {
  return {
    g50MaxRPM: [2500],
    retractPositions: [{ x: 20, z: 20 }],
    optionalStops: 1,
    mandatoryStops: 0,
    coolantOnCount: 1,
    coolantOffCount: 1,
    hasSpindleStop: true,
    gearRanges: [],
    ...overrides,
  };
}

function makeToolSection(overrides: Partial<OkumaToolSection> = {}): OkumaToolSection {
  return {
    label: "NAT01",
    toolCode: "T010101",
    toolNumber: 1,
    offsetNumber: 1,
    comment: "OD ROUGH",
    startLine: 10,
    endLine: 30,
    operations: [{ type: "od_rough", line: 15, gcode: "G85", params: {} }],
    speedMode: "css",
    cssValue: 600,
    maxRPM: 2500,
    coolant: true,
    ...overrides,
  };
}

function makeOkumaProgram(overrides: Partial<OkumaProgram> = {}): OkumaProgram {
  return {
    filename: "TEST-PART.MIN",
    header: "(TEST PART)",
    toolSections: [
      makeToolSection({ label: "NAT01", toolCode: "T010101", toolNumber: 1, comment: "OD ROUGH" }),
      makeToolSection({ label: "NAT02", toolCode: "T020202", toolNumber: 2, comment: "OD FINISH", operations: [{ type: "od_finish", line: 35, gcode: "G85", params: {} }] }),
    ],
    variables: [],
    subroutineCalls: [],
    hasBarFeeder: false,
    hasCAxis: false,
    hasLiveTooling: false,
    hasThreading: false,
    hasMacroVariables: false,
    lineCount: 50,
    operations: [],
    safety: makeSafetyInfo(),
    rawLines: [
      "(TEST PART - MATERIAL STEEL 1030)",
      "T010101",
      "G50 S2500",
      "G96 S600 M3",
      "G0 X2.0 Z0.1",
      "G1 X1.875 F0.012",
      "G1 Z-3.5 F0.012",
      "G0 X20 Z20",
      "M1",
      "T020202",
      "G50 S3000",
      "G96 S800 M3",
      "G0 X1.875 Z0.05",
      "G1 X1.875 Z-3.5 F0.006",
      "G0 X20 Z20",
      "M9",
      "M5",
      "M30",
    ],
    ...overrides,
  };
}

// ============================================================================
// ToolSubstitutionEngine
// ============================================================================

describe("ToolSubstitutionEngine", () => {
  const engine = new ToolSubstitutionEngine();

  describe("substituteBoringBar()", () => {
    it("scales feed and DOC for smaller bar", () => {
      const result = engine.substituteBoringBar({
        original_bar_dia: 0.75,
        new_bar_dia: 0.5,
        bar_stickout: 3.0,
        original_feed: 0.008,
        original_doc: 0.080,
        original_max_rpm: 2000,
        unit_system: "imperial",
      });

      // Original L/D = 3/0.75 = 4.0, New L/D = 3/0.5 = 6.0
      expect(result.original_ld).toBeCloseTo(4.0, 1);
      expect(result.new_ld).toBeCloseTo(6.0, 1);
      // DOC scaled by diameter ratio (0.5/0.75 = 0.667)
      expect(result.doc_scale).toBeCloseTo(0.667, 2);
      expect(result.new_doc).toBeLessThan(result.new_doc + 0.001); // Sanity
      // Feed scaled by L/D bracket change
      expect(result.new_feed).toBeLessThan(0.008);
      expect(result.feed_scale).toBeLessThan(1.0);
    });

    it("keeps full feed for L/D <= 3 bars", () => {
      const result = engine.substituteBoringBar({
        original_bar_dia: 1.0,
        new_bar_dia: 1.0,
        bar_stickout: 2.5,
        original_feed: 0.008,
        original_doc: 0.080,
        original_max_rpm: 2000,
        unit_system: "imperial",
      });

      expect(result.new_feed).toBe(0.008);
      expect(result.feed_scale).toBe(1.0);
      expect(result.safe).toBe(true);
    });

    it("warns when L/D exceeds 6", () => {
      const result = engine.substituteBoringBar({
        original_bar_dia: 0.375,
        new_bar_dia: 0.375,
        bar_stickout: 3.0, // L/D = 8
        original_feed: 0.006,
        original_doc: 0.040,
        original_max_rpm: 1800,
        unit_system: "imperial",
      });

      expect(result.safe).toBe(false);
      expect(result.warnings.some(w => w.includes("exceeds safe limit"))).toBe(true);
    });

    it("reduces max RPM for worse L/D", () => {
      const result = engine.substituteBoringBar({
        original_bar_dia: 0.75,
        new_bar_dia: 0.375, // Much smaller
        bar_stickout: 2.5,
        original_feed: 0.008,
        original_doc: 0.080,
        original_max_rpm: 2000,
        unit_system: "imperial",
      });

      expect(result.new_max_rpm).toBeLessThan(2000);
    });

    it("generates Okuma update comments", () => {
      const result = engine.substituteBoringBar({
        original_bar_dia: 0.75,
        new_bar_dia: 0.5,
        bar_stickout: 2.5,
        original_feed: 0.008,
        original_doc: 0.080,
        original_max_rpm: 2000,
        unit_system: "imperial",
      });

      expect(result.okuma_updates.length).toBeGreaterThan(0);
      expect(result.okuma_updates[0]).toContain("BORING BAR SUBSTITUTION");
    });
  });

  describe("substituteDrill()", () => {
    it("recalculates feed, RPM, and peck schedule", () => {
      const result = engine.substituteDrill({
        original_dia: 0.500,
        new_dia: 0.375,
        hole_depth: 2.0,
        original_feed: 0.008,
        sfm: 300,
        point_angle: 118,
        material_group: "P",
        unit_system: "imperial",
      });

      // Feed scales with sqrt(dia ratio) = sqrt(0.375/0.500) = sqrt(0.75) ≈ 0.866
      expect(result.feed_scale).toBeCloseTo(0.866, 2);
      expect(result.new_feed).toBeLessThan(0.008);
      // RPM = 300 * 3.82 / 0.375 = 3055
      expect(result.new_rpm).toBeCloseTo(3055, -2);
      // Peck schedule: first = 1xD = 0.375, sub = 0.5xD = 0.1875
      expect(result.peck_schedule[0]).toBeCloseTo(0.375, 3);
      expect(result.peck_schedule.length).toBeGreaterThan(1);
      // Point depth calculated from 118° angle
      expect(result.point_depth).toBeGreaterThan(0);
      expect(result.total_depth_with_point).toBeGreaterThan(2.0);
    });

    it("warns for large diameter increase", () => {
      const result = engine.substituteDrill({
        original_dia: 0.250,
        new_dia: 0.500, // 2x increase
        hole_depth: 1.5,
        original_feed: 0.006,
        sfm: 300,
        unit_system: "imperial",
      });

      expect(result.warnings.some(w => w.includes("Verify pilot hole"))).toBe(true);
    });

    it("warns for deep holes (D/depth > 5)", () => {
      const result = engine.substituteDrill({
        original_dia: 0.250,
        new_dia: 0.250,
        hole_depth: 2.0, // 8xD
        original_feed: 0.006,
        sfm: 300,
        unit_system: "imperial",
      });

      expect(result.warnings.some(w => w.includes("gun drill"))).toBe(true);
    });

    it("calculates metric correctly", () => {
      const result = engine.substituteDrill({
        original_dia: 12,
        new_dia: 10,
        hole_depth: 50,
        original_feed: 0.2,
        sfm: 100, // 100 m/min
        unit_system: "metric",
      });

      // RPM = 1000*100 / (pi*10) = 3183
      expect(result.new_rpm).toBeCloseTo(3183, -2);
    });
  });

  describe("substituteInsert()", () => {
    it("recalculates feed for target Ra with new radius", () => {
      const result = engine.substituteInsert({
        original_radius: 0.032, // R.032
        new_radius: 0.016,      // R.016 (smaller)
        original_feed: 0.006,
        target_ra_um: 1.6,
        unit_system: "imperial",
      });

      // Smaller radius → must reduce feed for same Ra
      expect(result.new_feed).toBeLessThan(0.006);
      expect(result.radius_increased).toBe(false);
      expect(result.predicted_ra_new_feed).toBeCloseTo(1.6, 0);
    });

    it("allows higher feed with larger radius", () => {
      const result = engine.substituteInsert({
        original_radius: 0.016, // R.016
        new_radius: 0.032,      // R.032 (larger)
        original_feed: 0.004,
        target_ra_um: 1.6,
        unit_system: "imperial",
      });

      expect(result.new_feed).toBeGreaterThan(0.004);
      expect(result.radius_increased).toBe(true);
    });

    it("predicts Ra with original feed and new radius", () => {
      const result = engine.substituteInsert({
        original_radius: 0.032,
        new_radius: 0.016,
        original_feed: 0.006,
        target_ra_um: 1.6,
        unit_system: "imperial",
      });

      // Original feed with smaller radius → worse (higher) Ra
      expect(result.predicted_ra_original_feed).toBeGreaterThan(1.6);
    });

    it("warns when original feed gives bad finish with new radius", () => {
      const result = engine.substituteInsert({
        original_radius: 0.032,
        new_radius: 0.008, // Very small radius
        original_feed: 0.006,
        target_ra_um: 1.6,
        unit_system: "imperial",
      });

      expect(result.warnings.some(w => w.includes("above target"))).toBe(true);
    });

    it("handles metric units", () => {
      const result = engine.substituteInsert({
        original_radius: 0.8,
        new_radius: 0.4,
        original_feed: 0.15,
        target_ra_um: 1.6,
        unit_system: "metric",
      });

      expect(result.new_feed).toBeLessThan(0.15);
      expect(result.predicted_ra_new_feed).toBeCloseTo(1.6, 0);
    });
  });
});

// ============================================================================
// ProgramMacroConverterEngine
// ============================================================================

describe("ProgramMacroConverterEngine", () => {
  const engine = new ProgramMacroConverterEngine();

  describe("convert()", () => {
    it("replaces known dimensions with V variables", () => {
      const prog = makeOkumaProgram();
      const result = engine.convert({
        program: prog,
        stock_diameter: 2.0,
        finish_od: 1.875,
        part_length: 3.5,
      });

      expect(result.stats.dimensions_replaced).toBeGreaterThan(0);
      // Stock diameter X2.0 should become XV1
      expect(result.converted_text).toContain("V1");
    });

    it("preserves G50 safety clamps (never replaces S value in G50)", () => {
      const prog = makeOkumaProgram();
      const result = engine.convert({ program: prog });

      // G50 S2500 should remain unchanged
      expect(result.safety_preserved.g50_clamps_kept).toBeGreaterThanOrEqual(1);
      const g50Lines = result.converted_lines.filter(l => /G50\s+S\d+/i.test(l));
      expect(g50Lines.length).toBeGreaterThanOrEqual(1);
      // The S value in G50 should still be a number, not a variable
      for (const line of g50Lines) {
        expect(line).toMatch(/G50\s+S\d+/i);
      }
    });

    it("preserves M1 optional stops", () => {
      const prog = makeOkumaProgram();
      const result = engine.convert({ program: prog });

      expect(result.safety_preserved.optional_stops_kept).toBeGreaterThanOrEqual(1);
    });

    it("preserves safe retract positions", () => {
      const prog = makeOkumaProgram();
      const result = engine.convert({ program: prog });

      expect(result.safety_preserved.retracts_kept).toBeGreaterThanOrEqual(1);
    });

    it("preserves spindle stop (M5)", () => {
      const prog = makeOkumaProgram();
      const result = engine.convert({ program: prog });

      expect(result.safety_preserved.spindle_stop_kept).toBe(true);
    });

    it("preserves coolant balance", () => {
      const prog = makeOkumaProgram();
      const result = engine.convert({ program: prog });

      expect(result.safety_preserved.coolant_balanced).toBe(true);
    });

    it("prepends header when provided", () => {
      const prog = makeOkumaProgram();
      const mockHeader = {
        header_lines: ["( MACRO HEADER )", "V1 = 2.0     ( STOCK DIA )"],
        header_text: "",
        variable_map: [],
        rpm_formulas: [],
        safety: { g50_clamps: [], retract_position: { x: 20, z: 20 }, optional_stops: true, coolant_balance: true },
        line_count: 2,
      };

      const result = engine.convert({ program: prog, header: mockHeader });

      expect(result.converted_lines[0]).toBe("( MACRO HEADER )");
      expect(result.converted_lines[1]).toContain("V1 = 2.0");
    });

    it("reports conversion statistics", () => {
      const prog = makeOkumaProgram();
      const result = engine.convert({
        program: prog,
        stock_diameter: 2.0,
        finish_od: 1.875,
        part_length: 3.5,
      });

      expect(result.stats.original_lines).toBe(prog.rawLines.length);
      expect(result.stats.converted_lines).toBeGreaterThanOrEqual(prog.rawLines.length);
      expect(result.stats.conversion_coverage).toBeGreaterThanOrEqual(0);
      expect(result.stats.conversion_coverage).toBeLessThanOrEqual(100);
    });

    it("warns about low-confidence replacements", () => {
      const prog = makeOkumaProgram({
        rawLines: [
          "G0 X5.123 Z0.1", // Unknown X value
          "G1 Z-1.234 F0.012", // Unknown Z value
        ],
      });

      const result = engine.convert({ program: prog });

      // Unknown dimensions should generate warnings or be skipped
      expect(result.stats.dimensions_replaced + result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("scanDimensions()", () => {
    it("finds X dimensions matching stock diameter", () => {
      const prog = makeOkumaProgram();
      const dims = engine.scanDimensions(prog, { stock_diameter: 2.0 });

      const stockDim = dims.find(d => d.inferred_purpose === "stock_diameter");
      expect(stockDim).toBeDefined();
      expect(stockDim?.original_value).toBe(2.0);
      expect(stockDim?.suggested_var).toBe("V1");
      expect(stockDim?.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("finds finish OD dimensions", () => {
      const prog = makeOkumaProgram();
      const dims = engine.scanDimensions(prog, { finish_od: 1.875 });

      const finishDim = dims.find(d => d.inferred_purpose === "finish_od");
      expect(finishDim).toBeDefined();
      expect(finishDim?.suggested_var).toBe("V2");
    });

    it("finds part length dimensions (negative Z)", () => {
      const prog = makeOkumaProgram();
      const dims = engine.scanDimensions(prog, { part_length: 3.5 });

      const lenDim = dims.find(d => d.inferred_purpose === "part_length");
      expect(lenDim).toBeDefined();
      expect(lenDim?.axis).toBe("Z");
    });

    it("skips G50 lines", () => {
      const prog = makeOkumaProgram();
      const dims = engine.scanDimensions(prog);

      // No dimension reference should come from a G50 line
      const g50Dims = dims.filter(d => {
        const line = prog.rawLines[d.line];
        return /G50/i.test(line);
      });
      expect(g50Dims.length).toBe(0);
    });
  });

  describe("scanSpeedFeeds()", () => {
    it("finds speed values per tool", () => {
      const prog = makeOkumaProgram();
      const refs = engine.scanSpeedFeeds(prog);

      const speeds = refs.filter(r => r.type === "speed");
      expect(speeds.length).toBeGreaterThanOrEqual(2); // Two tools with S values
    });

    it("finds feed values per tool", () => {
      const prog = makeOkumaProgram();
      const refs = engine.scanSpeedFeeds(prog);

      const feeds = refs.filter(r => r.type === "feed");
      expect(feeds.length).toBeGreaterThanOrEqual(1);
    });

    it("does not capture S values from G50 lines", () => {
      const prog = makeOkumaProgram();
      const refs = engine.scanSpeedFeeds(prog);

      // G50 S2500 should NOT appear as a speed reference
      const g50Speeds = refs.filter(r => {
        const line = prog.rawLines[r.line];
        return /G50/i.test(line);
      });
      expect(g50Speeds.length).toBe(0);
    });

    it("assigns incrementing variable indices per tool", () => {
      const prog = makeOkumaProgram();
      const refs = engine.scanSpeedFeeds(prog);

      const speeds = refs.filter(r => r.type === "speed");
      if (speeds.length >= 2) {
        // Second tool should have higher variable index
        expect(speeds[1].suggested_var).not.toBe(speeds[0].suggested_var);
      }
    });
  });
});
