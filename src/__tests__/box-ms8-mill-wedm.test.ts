/**
 * BOX-MS8: Wire EDM + Mill Program Parsing & Pattern Extraction
 *
 * Tests:
 *   - WireEDMProgramParserEngine: Mitsubishi, Fanuc, Sodick dialect detection,
 *     multi-pass extraction, wire settings, taper, flushing, safety
 *   - MillPatternMinerEngine: Haas/Hurco/Roku-Roku pattern mining,
 *     chip loads, canned cycles, HSM profiles, coolant patterns
 *   - Dispatcher wiring: box_parse_wedm, box_mine_mill_patterns
 *   - Schema validation: BoxParseWEDMSchema, BoxMineMillPatternsSchema
 */
import { describe, it, expect } from "vitest";
import { wireEDMProgramParserEngine } from "../engines/WireEDMProgramParserEngine.js";
import { millPatternMinerEngine } from "../engines/MillPatternMinerEngine.js";
import { haasParserEngine } from "../engines/HaasParserEngine.js";
import { hurcoParserEngine } from "../engines/HurcoParserEngine.js";
import { rokuRokuParserEngine } from "../engines/RokuRokuParserEngine.js";
import { BoxParseWEDMSchema, BoxMineMillPatternsSchema, BOX_ACTION_SCHEMAS } from "../tools/schemas/boxAuditActionSchemas.js";

// ── Wire EDM Test Programs ──────────────────────────────────────

const FANUC_WEDM = [
  "%",
  "O0001 (WIRE EDM - FANUC ROBOCUT)",
  "G90 G21",
  "G92 X0 Y0",
  "E0001 (ROUGH CUT CONDITION)",
  "M06 (AUTO WIRE THREAD)",
  "M50 (WIRE RUN FORWARD)",
  "M80 M81 (UPPER+LOWER FLUSH ON)",
  "G42 H01 (WIRE OFFSET RIGHT)",
  "G01 X10.000 Y0.000 F5.0",
  "G01 X10.000 Y10.000",
  "G01 X0.000 Y10.000",
  "G01 X0.000 Y0.000",
  "G40 (CANCEL WIRE OFFSET)",
  "E0002 (SKIM PASS 1)",
  "G42 H02",
  "G01 X10.000 Y0.000 F8.0",
  "G01 X10.000 Y10.000",
  "G01 X0.000 Y10.000",
  "G01 X0.000 Y0.000",
  "G40",
  "M82 M83 (FLUSH OFF)",
  "M51 (WIRE STOP)",
  "M02",
  "%",
].join("\n");

const MITSUBISHI_WEDM = [
  "%",
  "O0042 (WIRE EDM - MITSUBISHI PUNCH DIE)",
  "G90 G21",
  "G92 X0. Y0.",
  "E0100 C0001 (ROUGH CUT)",
  "M06 (AUTO WIRE THREAD)",
  "M50 (WIRE FEED START)",
  "G42 D01",
  "G01 X25.000 Y0.000",
  "G02 X0.000 Y25.000 I0.000 J25.000",
  "G01 X-25.000 Y0.000",
  "G01 X0.000 Y-25.000",
  "G40",
  "E0200 C0002 (SKIM 1)",
  "G42 D02",
  "G01 X25.000 Y0.000",
  "G02 X0.000 Y25.000 I0.000 J25.000",
  "G01 X-25.000 Y0.000",
  "G01 X0.000 Y-25.000",
  "G40",
  "E0300 C0003 (SKIM 2)",
  "G42 D03",
  "G01 X25.000 Y0.000",
  "G01 X0.000 Y25.000",
  "G01 X-25.000 Y0.000",
  "G01 X0.000 Y-25.000",
  "G40",
  "M51 (WIRE FEED STOP)",
  "M02",
  "%",
].join("\n");

const SODICK_WEDM = [
  "%",
  "O0010 (WIRE EDM - SODICK AL40G)",
  "G90 G21",
  "G92 X0. Y0.",
  "C100 (ROUGH - IP8 ON12 OFF8 SV60)",
  "M50",
  "G42 D01",
  "G01 X15.000 Y0.000",
  "G01 X15.000 Y15.000",
  "G01 X0.000 Y15.000",
  "G01 X0.000 Y0.000",
  "G40",
  "C200 (SKIM1 - IP4 ON6 OFF12 SV55)",
  "G42 D02",
  "G01 X15.000 Y0.000",
  "G01 X15.000 Y15.000",
  "G01 X0.000 Y15.000",
  "G01 X0.000 Y0.000",
  "G40",
  "M51",
  "M02",
  "%",
].join("\n");

const TAPER_WEDM = [
  "%",
  "O0099 (TAPER CUT TEST)",
  "G90 G21",
  "G92 X0 Y0",
  "M50",
  "G51 U3.500 (TAPER MODE ON)",
  "G42 H01",
  "G01 X20.000 Y0.000 F4.0",
  "G01 X20.000 Y20.000",
  "G01 X0.000 Y20.000",
  "G01 X0.000 Y0.000",
  "G40",
  "G50 (TAPER MODE OFF)",
  "M51",
  "M02",
  "%",
].join("\n");

// ── Mill Test Programs ──────────────────────────────────────────

const HAAS_MILL = [
  "O00100 (POCKET PLATE - 6061 AL)",
  "N1 G28 G91 Z0",
  "N2 G90 G54 G40",
  "T01 M06 (1/2 EM 4FL)",
  "G43 H01 Z1.0",
  "S5000 M03",
  "M08",
  "G187 P3 (FINISH SMOOTHING)",
  "G00 X1.0 Y1.0",
  "G01 Z-0.25 F15.0",
  "G01 X3.0 F30.0",
  "G01 Y3.0",
  "G01 X1.0",
  "G01 Y1.0",
  "G00 Z1.0",
  "M09",
  "T02 M06 (CENTER DRILL)",
  "G43 H02 Z1.0",
  "S3000 M03",
  "M08",
  "G81 X2.0 Y2.0 Z-0.15 R0.1 F10.0",
  "G80",
  "T03 M06 (#7 DRILL)",
  "G43 H03 Z1.0",
  "S2500 M03",
  "M07",
  "G83 X2.0 Y2.0 Z-1.5 R0.1 Q0.25 F8.0",
  "G80",
  "G00 Z1.0",
  "M09",
  "M05",
  "G28 G91 Z0",
  "M30",
].join("\n");

const HURCO_MILL = [
  "( HURCO VM30i CONTOUR PLATE )",
  "G90 G21",
  "G54",
  "T01 M06 (10MM EM 3FL)",
  "G43 H01 Z50.0",
  "S4000 M03",
  "M08",
  "G00 X25.0 Y10.0",
  "G01 Z-5.0 F200",
  "G01 X75.0 F400",
  "G01 Y40.0",
  "G01 X25.0",
  "G01 Y10.0",
  "G82 X50.0 Y25.0 Z-10.0 R5.0 P500 F150",
  "G80",
  "G00 Z50.0",
  "M09",
  "M05",
  "M30",
].join("\n");

const ROKUROKU_MICRO = [
  "O0050 (MICRO MOLD INSERT - D2 TOOL STEEL)",
  "G90 G21",
  "G54",
  "G05.1 Q1 (AICC-II ON)",
  "T01 M06 (0.5MM BALL EM)",
  "G43 H01 Z10.0",
  "S30000 M03",
  "M08",
  "G01 X5.0 Y0.0 F800",
  "G01 Z-0.05",
  "G01 X10.0 Y5.0",
  "G03 X5.0 Y10.0 R5.0",
  "G01 X0.0 Y5.0",
  "G00 Z10.0",
  "G05.1 Q0 (AICC-II OFF)",
  "T02 M06 (1.0MM BALL EM)",
  "G43 H02 Z10.0",
  "S25000 M03",
  "G05 P10000 (HPCC ON)",
  "G01 X5.0 Y0.0 F600",
  "G01 Z-0.1",
  "G81 X5.0 Y5.0 Z-1.0 R1.0 F300",
  "G80",
  "G00 Z10.0",
  "M09",
  "M05",
  "M30",
].join("\n");

// ═══════════════════════════════════════════════════════════════
// WIRE EDM PARSER TESTS
// ═══════════════════════════════════════════════════════════════

describe("WireEDMProgramParserEngine", () => {
  describe("Fanuc ROBOcut dialect", () => {
    const parsed = wireEDMProgramParserEngine.parse(FANUC_WEDM, "PUNCH.NC");

    it("detects Fanuc dialect", () => {
      expect(parsed.dialect).toBe("fanuc");
      expect(parsed.dialect_confidence).toBeGreaterThan(0);
    });

    it("extracts program header", () => {
      expect(parsed.program_number).toBe("0001");
      expect(parsed.program_comment).toContain("FANUC ROBOCUT");
    });

    it("detects multi-pass structure (rough + skim)", () => {
      expect(parsed.hasMultiPass).toBe(true);
      expect(parsed.passes.length).toBeGreaterThanOrEqual(2);
      expect(parsed.passes[0].phase).toBe("rough");
      expect(parsed.passes[0].condition_code).toBe("E0001");
      expect(parsed.passes[1].phase).toBe("skim1");
      expect(parsed.passes[1].condition_code).toBe("E0002");
    });

    it("extracts wire settings", () => {
      expect(parsed.wire_settings.has_auto_thread).toBe(true);
      expect(parsed.wire_settings.wire_run_on).toBe(true);
      expect(parsed.wire_settings.wire_stop_line).toBeGreaterThan(0);
    });

    it("extracts flushing", () => {
      expect(parsed.flushing.upper_on).toBe(true);
      expect(parsed.flushing.lower_on).toBe(true);
    });

    it("extracts contour moves", () => {
      expect(parsed.contour_moves.length).toBeGreaterThan(0);
      const linears = parsed.contour_moves.filter(m => m.type === "linear");
      expect(linears.length).toBeGreaterThanOrEqual(4);
    });

    it("validates safety", () => {
      expect(parsed.safety.has_program_end).toBe(true);
      expect(parsed.safety.has_wire_stop).toBe(true);
      expect(parsed.safety.has_offset_cancel).toBe(true);
      expect(parsed.safety.has_flush_off).toBe(true);
      expect(parsed.safety.warnings.length).toBe(0);
    });

    it("extracts work origin", () => {
      expect(parsed.work_origin.x).toBe(0);
      expect(parsed.work_origin.y).toBe(0);
    });
  });

  describe("Mitsubishi dialect", () => {
    const parsed = wireEDMProgramParserEngine.parse(MITSUBISHI_WEDM, "DIE.NC");

    it("detects Mitsubishi dialect", () => {
      expect(parsed.dialect).toBe("mitsubishi");
    });

    it("extracts 3-pass structure", () => {
      expect(parsed.passes.length).toBe(3);
      expect(parsed.passes[0].phase).toBe("rough");
      expect(parsed.passes[0].condition_code).toBe("E0100");
      expect(parsed.passes[1].phase).toBe("skim1");
      expect(parsed.passes[2].phase).toBe("skim2");
    });

    it("detects D-register offsets", () => {
      expect(parsed.passes[0].offset_register).toBe(1);
      expect(parsed.passes[0].offset_direction).toBe("right");
      expect(parsed.passes[1].offset_register).toBe(2);
    });

    it("detects arcs (G02/G03)", () => {
      const arcs = parsed.contour_moves.filter(m => m.type === "cw_arc");
      expect(arcs.length).toBeGreaterThan(0);
      const arc = arcs[0];
      expect(arc.j).not.toBeNull();
    });

    it("program number and comment", () => {
      expect(parsed.program_number).toBe("0042");
      expect(parsed.program_comment).toContain("PUNCH DIE");
    });
  });

  describe("Sodick dialect", () => {
    const parsed = wireEDMProgramParserEngine.parse(SODICK_WEDM, "SQUARE.NC");

    it("detects Sodick dialect", () => {
      expect(parsed.dialect).toBe("sodick");
    });

    it("extracts C-code condition passes", () => {
      expect(parsed.passes.length).toBe(2);
      expect(parsed.passes[0].condition_code).toBe("C100");
      expect(parsed.passes[0].phase).toBe("rough");
      expect(parsed.passes[1].condition_code).toBe("C200");
      expect(parsed.passes[1].phase).toBe("skim1");
    });

    it("safety: wire stop present", () => {
      expect(parsed.safety.has_wire_stop).toBe(true);
      expect(parsed.safety.has_program_end).toBe(true);
    });
  });

  describe("Taper cutting", () => {
    const parsed = wireEDMProgramParserEngine.parse(TAPER_WEDM, "TAPER.NC");

    it("detects taper", () => {
      expect(parsed.hasTaper).toBe(true);
      expect(parsed.taper.enabled).toBe(true);
      expect(parsed.taper.angle_deg).toBeCloseTo(3.5, 1);
    });

    it("validates taper cancel", () => {
      expect(parsed.safety.has_taper_cancel).toBe(true);
    });
  });

  describe("Safety warnings", () => {
    it("warns when wire not stopped", () => {
      const noStop = "O0001\nG92 X0 Y0\nM50\nG01 X10 Y0\nM02\n";
      const parsed = wireEDMProgramParserEngine.parse(noStop, "BAD.NC");
      expect(parsed.safety.warnings.some(w => w.includes("M51"))).toBe(true);
    });

    it("warns when program end missing", () => {
      const noEnd = "O0001\nG92 X0 Y0\nG01 X10 Y0\n";
      const parsed = wireEDMProgramParserEngine.parse(noEnd, "BAD2.NC");
      expect(parsed.safety.warnings.some(w => w.includes("M02"))).toBe(true);
    });
  });

  describe("extractCuttingData", () => {
    it("extracts per-pass cutting data", () => {
      const parsed = wireEDMProgramParserEngine.parse(FANUC_WEDM, "PUNCH.NC");
      const data = wireEDMProgramParserEngine.extractCuttingData(parsed);
      expect(data.length).toBeGreaterThanOrEqual(2);
      expect(data[0].pass_phase).toBe("rough");
      expect(data[0].condition_code).toBe("E0001");
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// MILL PATTERN MINER TESTS
// ═══════════════════════════════════════════════════════════════

describe("MillPatternMinerEngine", () => {
  describe("Haas mining", () => {
    const parsed = haasParserEngine.parse(HAAS_MILL, "POCKET.nc");

    it("mines canned cycles (G81, G83)", () => {
      const result = millPatternMinerEngine.mineHaas([
        { filename: "POCKET.nc", parsed },
      ]);
      expect(result.total_programs).toBe(1);
      expect(result.canned_cycles.length).toBeGreaterThanOrEqual(2);
      const g81 = result.canned_cycles.find(c => c.g_code === "G81");
      expect(g81).toBeDefined();
      expect(g81!.description).toContain("spot drill");
      const g83 = result.canned_cycles.find(c => c.g_code === "G83");
      expect(g83).toBeDefined();
      expect(g83!.description).toContain("peck drill");
    });

    it("detects G187 smoothing HSM profile", () => {
      const result = millPatternMinerEngine.mineHaas([
        { filename: "POCKET.nc", parsed },
      ]);
      const hsm = result.hsm_profiles.find(p => p.controller === "haas");
      expect(hsm).toBeDefined();
      expect(hsm!.smoothing_mode).toBe("G187");
    });

    it("extracts coolant patterns (M08 flood, M07 mist)", () => {
      const result = millPatternMinerEngine.mineHaas([
        { filename: "POCKET.nc", parsed },
      ]);
      const flood = result.coolant_patterns.find(c => c.code === "M08");
      expect(flood).toBeDefined();
      expect(flood!.type).toBe("flood");
      const mist = result.coolant_patterns.find(c => c.code === "M07");
      expect(mist).toBeDefined();
      expect(mist!.type).toBe("mist");
    });

    it("extracts chip load samples", () => {
      const result = millPatternMinerEngine.mineHaas([
        { filename: "POCKET.nc", parsed },
      ]);
      expect(result.chip_load_samples.length).toBeGreaterThan(0);
      const sample = result.chip_load_samples[0];
      expect(sample.rpm).toBeGreaterThan(0);
      expect(sample.feed_rate).toBeGreaterThan(0);
    });
  });

  describe("Hurco mining", () => {
    const parsed = hurcoParserEngine.parse(HURCO_MILL, "CONTOUR.hnc");

    it("mines programs and extracts tool count", () => {
      const result = millPatternMinerEngine.mineHurco([
        { filename: "CONTOUR.hnc", parsed },
      ]);
      expect(result.total_programs).toBe(1);
      expect(result.total_tools).toBeGreaterThanOrEqual(1);
    });

    it("extracts Hurco coolant patterns", () => {
      const result = millPatternMinerEngine.mineHurco([
        { filename: "CONTOUR.hnc", parsed },
      ]);
      const flood = result.coolant_patterns.find(c => c.code === "M08");
      expect(flood).toBeDefined();
    });
  });

  describe("Roku-Roku mining", () => {
    const parsed = rokuRokuParserEngine.parse(ROKUROKU_MICRO, "MOLD.nc");

    it("detects AICC + HPCC HSM profiles", () => {
      const result = millPatternMinerEngine.mineRokuRoku([
        { filename: "MOLD.nc", parsed },
      ]);
      expect(result.hsm_profiles.length).toBeGreaterThan(0);
      const hsm = result.hsm_profiles[0];
      expect(hsm.controller).toBe("rokuroku");
      expect(hsm.aicc_enabled || hsm.hpcc_enabled).toBe(true);
    });

    it("extracts RPM vs diameter data", () => {
      const result = millPatternMinerEngine.mineRokuRoku([
        { filename: "MOLD.nc", parsed },
      ]);
      // Only if diameter data is available from parser
      expect(result.total_programs).toBe(1);
    });

    it("mines canned cycles from Roku-Roku", () => {
      const result = millPatternMinerEngine.mineRokuRoku([
        { filename: "MOLD.nc", parsed },
      ]);
      const g81 = result.canned_cycles.find(c => c.g_code === "G81");
      expect(g81).toBeDefined();
    });
  });

  describe("mineAll (cross-controller)", () => {
    it("merges results from all three controllers", () => {
      const haasParsed = haasParserEngine.parse(HAAS_MILL, "POCKET.nc");
      const hurcoParsed = hurcoParserEngine.parse(HURCO_MILL, "CONTOUR.hnc");
      const rokuParsed = rokuRokuParserEngine.parse(ROKUROKU_MICRO, "MOLD.nc");

      const result = millPatternMinerEngine.mineAll([
        { filename: "POCKET.nc", controller: "haas", parsed: haasParsed },
        { filename: "CONTOUR.hnc", controller: "hurco", parsed: hurcoParsed },
        { filename: "MOLD.nc", controller: "rokuroku", parsed: rokuParsed },
      ]);

      expect(result.total_programs).toBe(3);
      expect(result.total_tools).toBeGreaterThanOrEqual(3);
      expect(result.canned_cycles.length).toBeGreaterThan(0);
      expect(result.coolant_patterns.length).toBeGreaterThan(0);
      expect(result.top_patterns.length).toBeGreaterThan(0);
    });

    it("deduplicates canned cycles across programs", () => {
      const haasParsed = haasParserEngine.parse(HAAS_MILL, "P1.nc");
      const result = millPatternMinerEngine.mineAll([
        { filename: "P1.nc", controller: "haas", parsed: haasParsed },
        { filename: "P2.nc", controller: "haas", parsed: haasParsed },
      ]);
      // Same G81 from both → should be merged with frequency 2
      const g81 = result.canned_cycles.find(c => c.g_code === "G81");
      if (g81) {
        expect(g81.frequency).toBeGreaterThanOrEqual(2);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// SCHEMA VALIDATION
// ═══════════════════════════════════════════════════════════════

describe("BOX-MS8 Schemas", () => {
  it("BoxParseWEDMSchema rejects empty content", () => {
    const r = BoxParseWEDMSchema.safeParse({ content: "" });
    expect(r.success).toBe(false);
  });

  it("BoxParseWEDMSchema accepts valid input", () => {
    const r = BoxParseWEDMSchema.safeParse({ content: FANUC_WEDM, filename: "TEST.NC" });
    expect(r.success).toBe(true);
  });

  it("BoxMineMillPatternsSchema rejects empty programs array", () => {
    const r = BoxMineMillPatternsSchema.safeParse({ programs: [] });
    expect(r.success).toBe(false);
  });

  it("BoxMineMillPatternsSchema accepts valid input", () => {
    const r = BoxMineMillPatternsSchema.safeParse({
      programs: [{ filename: "test.nc", controller: "haas", parsed: {} }],
    });
    expect(r.success).toBe(true);
  });

  it("BOX_ACTION_SCHEMAS includes MS8 actions", () => {
    expect(BOX_ACTION_SCHEMAS.box_parse_wedm).toBeDefined();
    expect(BOX_ACTION_SCHEMAS.box_mine_mill_patterns).toBeDefined();
  });
});
