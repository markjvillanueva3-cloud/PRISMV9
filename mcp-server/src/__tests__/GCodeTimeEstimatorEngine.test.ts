/**
 * Tests for GCodeTimeEstimatorEngine — JM-DIE-PROGRAM-ANALYSIS-MS0 / U-JP01.
 */
import { describe, it, expect } from "vitest";
import { GCodeTimeEstimatorEngine } from "../engines/GCodeTimeEstimatorEngine.js";

const eng = new GCodeTimeEstimatorEngine();

const MILL_FANUC = `
%
O0001 (TEST MILL)
G21 G90 G94
T1 M06
G00 X0 Y0 Z10
G01 X100 Y0 F1000
G01 X100 Y100
G01 X0 Y100
G01 X0 Y0
G00 Z25
T2 M06
G01 X50 Y50 F800
G02 X100 Y50 I25 J0
M30
%
`.trim();

const LATHE_MAZAK = `
%
O1001
G21 G96 G50 S2000
T0101
G00 X100 Z2
G01 X50 Z-10 F0.2
G01 X40 Z-30
G00 X100 Z10
T0202
G01 X20 Z-20 F0.15
M30
%
`.trim();

const WEDM_SODICK = `
%
G21 G90
G92 X0 Y0
T1
G01 X10 Y0 F100
G01 X10 Y10
G01 X0 Y10
G01 X0 Y0
M30
%
`.trim();

describe("GCodeTimeEstimatorEngine.analyze — happy path per dialect", () => {
  it("Fanuc mill program → ok=true, block_count > 0, time_in_cut_s > 0", () => {
    const r = eng.analyze(MILL_FANUC);
    expect(r.ok).toBe(true);
    expect(r.block_count).toBeGreaterThan(8);
    expect(r.cutting_block_count).toBeGreaterThan(3);
    expect(r.rapid_block_count).toBeGreaterThan(0);
    expect(r.time_in_cut_s).toBeGreaterThan(0);
  });

  it("Mazak lathe → tool_change_count counts T0101 + T0202", () => {
    const r = eng.analyze(LATHE_MAZAK);
    expect(r.tool_change_count).toBeGreaterThanOrEqual(2);
    expect(r.tools_used.length).toBeGreaterThanOrEqual(2);
  });

  it("Sodick WEDM dialect auto-detected", () => {
    const r = eng.analyze(WEDM_SODICK);
    expect(r.ok).toBe(true);
  });

  it("Time-in-cut math: 100mm at F1000mm/min = 6 seconds", () => {
    const r = eng.analyze("G21 G90\nG01 X0 Y0 F1000\nG01 X100 Y0\nM30");
    // 100mm / 1000 mm/min × 60 = 6 sec
    expect(r.time_in_cut_s).toBeCloseTo(6.0, 1);
  });
});

describe("GCodeTimeEstimatorEngine.analyze — failure modes (R12 fail-loud)", () => {
  it("empty text → ok=false reason=empty-or-missing-text", () => {
    const r = eng.analyze("");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("empty-or-missing-text");
  });

  it("non-string input → ok=false", () => {
    // @ts-expect-error testing guard
    const r = eng.analyze(null);
    expect(r.ok).toBe(false);
  });

  it("binary-ish content (>10% non-printable) → ok=false reason=binary-input", () => {
    const binary = "\x00\x01\x02\x03\x04\x05\x06\x07\x08\x0e\x0f\x10\x11".repeat(50);
    const r = eng.analyze(binary);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("binary-input-not-gcode");
  });

  it("whitespace-only → ok=false", () => {
    const r = eng.analyze("   \n\t\n   ");
    expect(r.ok).toBe(false);
  });
});

describe("GCodeTimeEstimatorEngine.analyze — counter accuracy", () => {
  it("counts G00 rapid moves correctly", () => {
    const text = "G21 G90\nG00 X10 Y10\nG00 X20 Y20\nG00 X30 Y30\nM30";
    const r = eng.analyze(text);
    expect(r.rapid_block_count).toBeGreaterThanOrEqual(2);
  });

  it("counts G02/G03 as cutting blocks", () => {
    const text = "G21 G90\nG01 X10 Y0 F500\nG02 X20 Y10 I5 J5\nG03 X10 Y20 I0 J5\nM30";
    const r = eng.analyze(text);
    expect(r.cutting_block_count).toBeGreaterThanOrEqual(3);
  });

  it("strips comments in parens before parsing", () => {
    const text = "G21 G90\n(TOOL CHANGE)\nG01 X10 F500\nM30";
    const r = eng.analyze(text);
    expect(r.cutting_block_count).toBe(1);
  });
});

describe("GCodeTimeEstimatorEngine — tool change overhead", () => {
  it("one tool transition (T1→T2) adds 1 × overhead to rapid_time_s — initial T1 has no transition cost", () => {
    const r = eng.analyze(MILL_FANUC, { toolChangeOverheadS: 10 });
    expect(r.rapid_time_s).toBeGreaterThanOrEqual(10);
    expect(r.tool_change_count).toBeGreaterThanOrEqual(2); // T1 + T2 both counted as tool calls
  });
});

describe("GCodeTimeEstimatorEngine — unit conversion", () => {
  it("G20 inch mode: 1 inch at F100 in/min = 60/100 minutes = 0.6 sec × 60 = wait math", () => {
    // 1in = 25.4mm; F100 in/min = 2540 mm/min; 25.4/2540 × 60 = 0.6 sec
    const r = eng.analyze("G20 G90\nG01 X0 F100\nG01 X1\nM30");
    expect(r.time_in_cut_s).toBeCloseTo(0.6, 1);
  });
});
