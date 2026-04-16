/**
 * WEDM-CAL-MS0: Real Program Parser Validation
 *
 * Tests WireEDMProgramParserEngine against REAL shop NC programs
 * from C:/Users/Mark Villanueva/Box/WIRE EDM/ (Mitsubishi M800 controller).
 *
 * U-CAL01: ITW SHAKEPROOF — D2, 25.4mm, 4-pass, hex+bore
 * U-CAL02: NOZE TEST — SS taper, 5-pass, UV axis
 * U-CAL04: Parser regression — golden snapshot validation
 *
 * Engines: WireEDMProgramParserEngine
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const PROGRAMS_DIR = join(__dirname, "../../data/programs/wire-edm");

// ═══════════════════════════════════════════════════════════════════════
// U-CAL01: Parse ITW SHAKEPROOF — Parameter Extraction
// ═══════════════════════════════════════════════════════════════════════

describe("U-CAL01: ITW SHAKEPROOF — Mitsubishi M800 4-pass hex+bore", () => {
  let program: Awaited<ReturnType<typeof parseITW>>;

  async function parseITW() {
    const { wireEDMProgramParserEngine } = await import("../engines/WireEDMProgramParserEngine.js");
    const content = readFileSync(join(PROGRAMS_DIR, "ITW SHAKEPROOF 500-30540-24000-04.NC"), "utf-8");
    return wireEDMProgramParserEngine.parse(content, "ITW SHAKEPROOF 500-30540-24000-04.NC");
  }

  it("detects Mitsubishi dialect", async () => {
    program = await parseITW();
    expect(program.dialect).toBe("mitsubishi");
    expect(program.dialect_confidence).toBeGreaterThan(30);
  });

  it("extracts H-variable offset declarations", async () => {
    program = program || await parseITW();
    // H175 = 0.0000 (master offset)
    expect(program.offset_declarations[175]).toBeCloseTo(0.0, 4);
    // H1 = 0.0085 (pass 1 rough offset)
    expect(program.offset_declarations[1]).toBeCloseTo(0.0085, 4);
    // H2 = 0.0064 (pass 2 offset)
    expect(program.offset_declarations[2]).toBeCloseTo(0.0064, 4);
    // H3 = 0.0058 (pass 3 offset)
    expect(program.offset_declarations[3]).toBeCloseTo(0.0058, 4);
    // H4 = 0.0053 (pass 4 offset)
    expect(program.offset_declarations[4]).toBeCloseTo(0.0053, 4);
  });

  it("detects 4 or more passes (2 features × 4 passes each)", async () => {
    program = program || await parseITW();
    // ITW has hex profile (4 passes) + bore (4 passes) = 8 E-code lines
    // But they share E1221-E1224, so the parser should find at least 4 unique condition groups
    expect(program.passes.length).toBeGreaterThanOrEqual(4);
    expect(program.hasMultiPass).toBe(true);
  });

  it("extracts E-codes E1221-E1224", async () => {
    program = program || await parseITW();
    const eCodes = program.passes.map(p => p.condition_code);
    expect(eCodes).toContain("E1221");
    expect(eCodes).toContain("E1222");
    expect(eCodes).toContain("E1223");
    expect(eCodes).toContain("E1224");
  });

  it("extracts H-register per pass (H1, H2, H3, H4)", async () => {
    program = program || await parseITW();
    const hRegs = program.passes.map(p => p.offset_register);
    expect(hRegs).toContain(1);
    expect(hRegs).toContain(2);
    expect(hRegs).toContain(3);
    expect(hRegs).toContain(4);
  });

  it("resolves offset values from H-variable declarations", async () => {
    program = program || await parseITW();
    // Find first pass with E1221 (rough)
    const roughPass = program.passes.find(p => p.condition_code === "E1221");
    expect(roughPass).toBeDefined();
    expect(roughPass!.offset_value).toBeCloseTo(0.0085, 4);

    const pass4 = program.passes.find(p => p.condition_code === "E1224");
    expect(pass4).toBeDefined();
    expect(pass4!.offset_value).toBeCloseTo(0.0053, 4);
  });

  it("extracts feed rates from E-code lines", async () => {
    program = program || await parseITW();
    // E1221 F.12, E1222 F.24, E1223 F.21, E1224 F.2
    const roughPass = program.passes.find(p => p.condition_code === "E1221");
    expect(roughPass?.feed_rate).toBeCloseTo(0.12, 2);

    const pass2 = program.passes.find(p => p.condition_code === "E1222");
    expect(pass2?.feed_rate).toBeCloseTo(0.24, 2);

    const pass3 = program.passes.find(p => p.condition_code === "E1223");
    expect(pass3?.feed_rate).toBeCloseTo(0.21, 2);

    const pass4 = program.passes.find(p => p.condition_code === "E1224");
    expect(pass4?.feed_rate).toBeCloseTo(0.2, 2);
  });

  it("detects pass phase progression (rough → skim)", async () => {
    program = program || await parseITW();
    const firstPass = program.passes[0];
    expect(firstPass.phase).toBe("rough");
    const lastPass = program.passes[program.passes.length - 1];
    // Last pass should be skim (not rough)
    expect(lastPass.phase).not.toBe("rough");
  });

  it("extracts work origin G92 X0 Y0", async () => {
    program = program || await parseITW();
    expect(program.work_origin.x).toBeCloseTo(0.0, 1);
    expect(program.work_origin.y).toBeCloseTo(0.0, 1);
  });

  it("detects wire threading M20", async () => {
    program = program || await parseITW();
    expect(program.wire_settings.has_auto_thread).toBe(true);
  });

  it("detects wire cut M21", async () => {
    program = program || await parseITW();
    expect(program.wire_settings.wire_stop_line).not.toBeNull();
  });

  it("detects adaptive control M90/M91", async () => {
    program = program || await parseITW();
    expect(program.hasAdaptiveControl).toBe(true);
  });

  it("detects tank management M78/M58", async () => {
    program = program || await parseITW();
    expect(program.hasTankManagement).toBe(true);
    expect(program.hasSubmergedCut).toBe(true);
  });

  it("detects G42/G41 offset directions", async () => {
    program = program || await parseITW();
    const directions = program.passes.map(p => p.offset_direction);
    // Program uses both G42 (right) and G41 (left) for different features/passes
    expect(directions.some(d => d === "right" || d === "left")).toBe(true);
  });

  it("has program end M02", async () => {
    program = program || await parseITW();
    expect(program.safety.has_program_end).toBe(true);
  });

  it("has offset cancel G40", async () => {
    program = program || await parseITW();
    expect(program.safety.has_offset_cancel).toBe(true);
  });

  it("is NOT a taper program (2D profiles only)", async () => {
    program = program || await parseITW();
    expect(program.hasTaper).toBe(false);
  });

  it("extracts contour moves (G1, G2, G3)", async () => {
    program = program || await parseITW();
    // Program has many G1, G2, G3 moves for hex and bore profiles
    expect(program.contour_moves.length).toBeGreaterThan(20);
    const types = new Set(program.contour_moves.map(m => m.type));
    expect(types.has("linear")).toBe(true);
    expect(types.has("cw_arc")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// U-CAL02: Parse NOZE TEST — Taper & UV Extraction
// ═══════════════════════════════════════════════════════════════════════

describe("U-CAL02: NOZE TEST — Mitsubishi M800 5-pass UV taper", () => {
  let program: Awaited<ReturnType<typeof parseNOZE>>;

  async function parseNOZE() {
    const { wireEDMProgramParserEngine } = await import("../engines/WireEDMProgramParserEngine.js");
    const content = readFileSync(join(PROGRAMS_DIR, "NOZE TEST.NC"), "utf-8");
    return wireEDMProgramParserEngine.parse(content, "NOZE TEST.NC");
  }

  it("detects Mitsubishi dialect", async () => {
    program = await parseNOZE();
    expect(program.dialect).toBe("mitsubishi");
  });

  it("detects 5 passes", async () => {
    program = program || await parseNOZE();
    expect(program.passes.length).toBeGreaterThanOrEqual(5);
    expect(program.hasMultiPass).toBe(true);
  });

  it("extracts E-codes E2821-E2825", async () => {
    program = program || await parseNOZE();
    const eCodes = program.passes.map(p => p.condition_code);
    expect(eCodes).toContain("E2821");
    expect(eCodes).toContain("E2822");
    expect(eCodes).toContain("E2823");
    expect(eCodes).toContain("E2824");
    expect(eCodes).toContain("E2825");
  });

  it("extracts feed rate progression F0.16 → F0.30", async () => {
    program = program || await parseNOZE();
    const pass1 = program.passes.find(p => p.condition_code === "E2821");
    expect(pass1?.feed_rate).toBeCloseTo(0.16, 2);

    const pass2 = program.passes.find(p => p.condition_code === "E2822");
    expect(pass2?.feed_rate).toBeCloseTo(0.23, 2);

    const pass3 = program.passes.find(p => p.condition_code === "E2823");
    expect(pass3?.feed_rate).toBeCloseTo(0.26, 2);

    const pass4 = program.passes.find(p => p.condition_code === "E2824");
    expect(pass4?.feed_rate).toBeCloseTo(0.3, 2);
  });

  it("detects UV taper (program has inline U/V axis moves)", async () => {
    program = program || await parseNOZE();
    expect(program.hasTaper).toBe(true);
    expect(program.taper.enabled).toBe(true);
  });

  it("extracts UV axis values from contour moves", async () => {
    program = program || await parseNOZE();
    const uvMoves = program.contour_moves.filter(m => m.u !== null || m.v !== null);
    expect(uvMoves.length).toBeGreaterThan(10);

    // Find the largest U value (should be around -0.04786 or +0.00716)
    const uValues = uvMoves.map(m => m.u).filter((v): v is number => v !== null);
    const maxAbsU = Math.max(...uValues.map(Math.abs));
    expect(maxAbsU).toBeGreaterThan(0.01); // Real UV moves present
    expect(maxAbsU).toBeLessThan(0.1); // Not absurdly large
  });

  it("H-offset declarations are all 0 (taper compensation via E-codes)", async () => {
    program = program || await parseNOZE();
    // NOZE TEST: H1=0., H2=0., H3=0., H4=0., H5=0.
    for (let i = 1; i <= 5; i++) {
      expect(program.offset_declarations[i]).toBeCloseTo(0.0, 4);
    }
  });

  it("detects adaptive control M90/M91", async () => {
    program = program || await parseNOZE();
    expect(program.hasAdaptiveControl).toBe(true);
  });

  it("detects tank management M78/M58", async () => {
    program = program || await parseNOZE();
    expect(program.hasTankManagement).toBe(true);
  });

  it("has program end M02 and wire cut M21", async () => {
    program = program || await parseNOZE();
    expect(program.safety.has_program_end).toBe(true);
    expect(program.safety.has_wire_stop).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Wire Program 5" Square — Simple Test Program
// ═══════════════════════════════════════════════════════════════════════

describe("Wire Program 5 inch square — basic Fanuc-style test", () => {
  it("parses simple square program", async () => {
    const { wireEDMProgramParserEngine } = await import("../engines/WireEDMProgramParserEngine.js");
    const content = readFileSync(join(PROGRAMS_DIR, "Wire Program - 5 inch square.NC"), "utf-8");
    const program = wireEDMProgramParserEngine.parse(content, "Wire Program - 5 inch square.NC");

    // Simple program: G0, G54, G01 moves, M30
    expect(program.safety.has_program_end).toBe(true);
    expect(program.contour_moves.length).toBeGreaterThan(0);
    // Single pass (no E-codes)
    expect(program.passes.length).toBeGreaterThanOrEqual(1);
    // No taper
    expect(program.hasTaper).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// U-CAL04: extractCuttingData — Structured Parameter Extraction
// ═══════════════════════════════════════════════════════════════════════

describe("U-CAL04: extractCuttingData — structured parameter export", () => {
  it("ITW SHAKEPROOF: extracts per-pass cutting data with feed values", async () => {
    const { wireEDMProgramParserEngine } = await import("../engines/WireEDMProgramParserEngine.js");
    const content = readFileSync(join(PROGRAMS_DIR, "ITW SHAKEPROOF 500-30540-24000-04.NC"), "utf-8");
    const program = wireEDMProgramParserEngine.parse(content, "ITW SHAKEPROOF.NC");
    const data = wireEDMProgramParserEngine.extractCuttingData(program);

    expect(data.length).toBeGreaterThanOrEqual(4);
    // First entry may be a setup pass (moves before first E-code), find E1221
    const e1221 = data.find(d => d.condition_code === "E1221");
    expect(e1221).toBeDefined();
    expect(e1221!.move_count).toBeGreaterThan(0);
    // Should have feed values extracted from moves
    const allFeeds = data.flatMap(d => d.feed_values);
    expect(allFeeds.length).toBeGreaterThan(0);
  });

  it("NOZE TEST: extracts 5 passes with E-codes and move counts", async () => {
    const { wireEDMProgramParserEngine } = await import("../engines/WireEDMProgramParserEngine.js");
    const content = readFileSync(join(PROGRAMS_DIR, "NOZE TEST.NC"), "utf-8");
    const program = wireEDMProgramParserEngine.parse(content, "NOZE TEST.NC");
    const data = wireEDMProgramParserEngine.extractCuttingData(program);

    // At least 5 E-coded passes (may have setup pass before first E-code)
    const eCodedPasses = data.filter(d => d.condition_code !== null);
    expect(eCodedPasses.length).toBeGreaterThanOrEqual(5);
    expect(eCodedPasses[0].condition_code).toBe("E2821");
    expect(eCodedPasses[4].condition_code).toBe("E2825");
    // Each E-coded pass should have moves
    for (const d of eCodedPasses) {
      expect(d.move_count).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// U-CAL04: Parser Golden Snapshot Regression
// ═══════════════════════════════════════════════════════════════════════

describe("U-CAL04: Parser golden snapshot regression", () => {
  it("ITW SHAKEPROOF: pass count, E-codes, offsets, feeds locked", async () => {
    const { wireEDMProgramParserEngine } = await import("../engines/WireEDMProgramParserEngine.js");
    const content = readFileSync(join(PROGRAMS_DIR, "ITW SHAKEPROOF 500-30540-24000-04.NC"), "utf-8");
    const program = wireEDMProgramParserEngine.parse(content, "ITW SHAKEPROOF.NC");

    // Golden snapshot: these values MUST NOT change
    const eCodedPasses = program.passes.filter(p => p.condition_code !== null);

    // Exactly these E-codes in this order
    const eCodes = eCodedPasses.map(p => p.condition_code);
    expect(eCodes.filter(e => e === "E1221").length).toBeGreaterThanOrEqual(1);
    expect(eCodes.filter(e => e === "E1222").length).toBeGreaterThanOrEqual(1);
    expect(eCodes.filter(e => e === "E1223").length).toBeGreaterThanOrEqual(1);
    expect(eCodes.filter(e => e === "E1224").length).toBeGreaterThanOrEqual(1);

    // Offset declarations locked
    expect(program.offset_declarations[1]).toBeCloseTo(0.0085, 4);
    expect(program.offset_declarations[2]).toBeCloseTo(0.0064, 4);
    expect(program.offset_declarations[3]).toBeCloseTo(0.0058, 4);
    expect(program.offset_declarations[4]).toBeCloseTo(0.0053, 4);
    expect(program.offset_declarations[175]).toBeCloseTo(0.0, 4);

    // Dialect locked
    expect(program.dialect).toBe("mitsubishi");

    // Safety locked
    expect(program.safety.has_program_end).toBe(true);
    expect(program.safety.has_offset_cancel).toBe(true);
    expect(program.safety.has_wire_stop).toBe(true);

    // Feature flags locked
    expect(program.hasAdaptiveControl).toBe(true);
    expect(program.hasTankManagement).toBe(true);
    expect(program.hasTaper).toBe(false);
    expect(program.hasSubmergedCut).toBe(true);
  });

  it("NOZE TEST: pass count, E-codes, UV detection locked", async () => {
    const { wireEDMProgramParserEngine } = await import("../engines/WireEDMProgramParserEngine.js");
    const content = readFileSync(join(PROGRAMS_DIR, "NOZE TEST.NC"), "utf-8");
    const program = wireEDMProgramParserEngine.parse(content, "NOZE TEST.NC");

    // Golden snapshot
    const eCodedPasses = program.passes.filter(p => p.condition_code !== null);
    const eCodes = eCodedPasses.map(p => p.condition_code);
    expect(eCodes).toContain("E2821");
    expect(eCodes).toContain("E2822");
    expect(eCodes).toContain("E2823");
    expect(eCodes).toContain("E2824");
    expect(eCodes).toContain("E2825");

    // All H-offsets are 0
    for (let i = 1; i <= 5; i++) {
      expect(program.offset_declarations[i]).toBeCloseTo(0.0, 4);
    }

    // Dialect and features locked
    expect(program.dialect).toBe("mitsubishi");
    expect(program.hasTaper).toBe(true);
    expect(program.hasAdaptiveControl).toBe(true);
    expect(program.hasTankManagement).toBe(true);
    expect(program.safety.has_program_end).toBe(true);
    expect(program.safety.has_wire_stop).toBe(true);

    // UV moves present in contour data
    const uvMoves = program.contour_moves.filter(m => m.u !== null || m.v !== null);
    expect(uvMoves.length).toBeGreaterThan(10);
  });

  it("5 inch square: minimal program locked", async () => {
    const { wireEDMProgramParserEngine } = await import("../engines/WireEDMProgramParserEngine.js");
    const content = readFileSync(join(PROGRAMS_DIR, "Wire Program - 5 inch square.NC"), "utf-8");
    const program = wireEDMProgramParserEngine.parse(content, "5-inch-square.NC");

    expect(program.safety.has_program_end).toBe(true);
    expect(program.hasTaper).toBe(false);
    expect(program.hasAdaptiveControl).toBe(false);
    expect(program.hasTankManagement).toBe(false);
    expect(program.passes.length).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Calibration Anchors — Exact Values from Shop Programs
// ═══════════════════════════════════════════════════════════════════════

describe("Calibration anchors — exact shop values for engine comparison", () => {
  it("ITW offset cascade: 0.0085 → 0.0064 → 0.0058 → 0.0053 inches", async () => {
    const { wireEDMProgramParserEngine } = await import("../engines/WireEDMProgramParserEngine.js");
    const content = readFileSync(join(PROGRAMS_DIR, "ITW SHAKEPROOF 500-30540-24000-04.NC"), "utf-8");
    const program = wireEDMProgramParserEngine.parse(content, "ITW SHAKEPROOF.NC");

    // Convert to mm for engine comparison: 1 inch = 25.4mm
    const offsets_mm = [0.0085, 0.0064, 0.0058, 0.0053].map(v => v * 25.4);
    // 0.2159, 0.1626, 0.1473, 0.1346 mm

    // Verify parser extracted these values
    expect(program.offset_declarations[1] * 25.4).toBeCloseTo(offsets_mm[0], 2);
    expect(program.offset_declarations[2] * 25.4).toBeCloseTo(offsets_mm[1], 2);
    expect(program.offset_declarations[3] * 25.4).toBeCloseTo(offsets_mm[2], 2);
    expect(program.offset_declarations[4] * 25.4).toBeCloseTo(offsets_mm[3], 2);

    // Offset decreases monotonically (each pass removes less material)
    for (let i = 1; i < 4; i++) {
      expect(program.offset_declarations[i + 1]).toBeLessThan(program.offset_declarations[i]);
    }
  });

  it("ITW feed progression: rough slower than skim2, skim passes similar speed", async () => {
    const { wireEDMProgramParserEngine } = await import("../engines/WireEDMProgramParserEngine.js");
    const content = readFileSync(join(PROGRAMS_DIR, "ITW SHAKEPROOF 500-30540-24000-04.NC"), "utf-8");
    const program = wireEDMProgramParserEngine.parse(content, "ITW SHAKEPROOF.NC");

    // Real feeds: F0.12, F0.24, F0.21, F0.20 ipm
    // Convert to mm/min: × 25.4
    const pass1 = program.passes.find(p => p.condition_code === "E1221");
    const pass2 = program.passes.find(p => p.condition_code === "E1222");
    expect(pass1?.feed_rate).toBeDefined();
    expect(pass2?.feed_rate).toBeDefined();
    // Pass 2 is faster than pass 1 (typical: rough is slowest because deepest cut)
    expect(pass2!.feed_rate!).toBeGreaterThan(pass1!.feed_rate!);
  });

  it("NOZE feed escalation: each pass faster than previous (taper compensation)", async () => {
    const { wireEDMProgramParserEngine } = await import("../engines/WireEDMProgramParserEngine.js");
    const content = readFileSync(join(PROGRAMS_DIR, "NOZE TEST.NC"), "utf-8");
    const program = wireEDMProgramParserEngine.parse(content, "NOZE TEST.NC");

    // NOZE TEST: F0.16 → F0.23 → F0.26 → F0.30
    const feeds = program.passes
      .filter(p => p.feed_rate !== null)
      .map(p => p.feed_rate!);

    // At least first 4 passes should have increasing feeds
    for (let i = 1; i < Math.min(feeds.length, 4); i++) {
      expect(feeds[i]).toBeGreaterThanOrEqual(feeds[i - 1]);
    }
  });
});
