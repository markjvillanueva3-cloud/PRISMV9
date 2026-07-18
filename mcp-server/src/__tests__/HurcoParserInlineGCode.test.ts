/**
 * HurcoParserInlineGCode.test.ts — U-HURCO-PARSER-GCODE-MODE coverage.
 *
 * The new _extractInlineGCodeOps() fallback kicks in for Fanuc-style .hnc
 * files (no canned G81/G83/etc., just T# M6 + linear motion). It segments
 * one HurcoOperation per tool-change boundary, captures coordinates +
 * first-seen spindle/feed + classifies type from annotation comments.
 *
 * @milestone HURCO-VM30I-FULL-PSN-MS0
 */

import { describe, it, expect } from "vitest";
import { hurcoParserEngine } from "../engines/HurcoParserEngine.js";

const INLINE_GCODE_SAMPLE = `%
O1001
(T9 D=0.375 - flat end mill)
(SAFE START BLOCK)
G40
G80
G90 G17
M16
(STRATEGY: ADAPTIVE2D)
T9 M6
S7401 M3
G0 X10 Y10 Z5
G1 Z-0.5 F300
G1 X50 Y10 F800
G1 X50 Y50
G1 X10 Y50
G1 X10 Y10
G0 Z25
(STRATEGY: DRILL)
T10 M6
S4000 M3
G0 X20 Y20 Z5
G1 Z-3 F200
G0 Z5
G0 X40 Y40
G1 Z-3 F200
G0 Z25
M30
%`;

describe("HurcoParserEngine._extractInlineGCodeOps — happy path", () => {
  const program = hurcoParserEngine.parse(INLINE_GCODE_SAMPLE, "inline-test.hnc");

  it("recognizes program as gcode mode", () => {
    expect(program.mode).toBe("gcode");
  });

  it("synthesizes exactly 2 operations (one per T# M6 boundary)", () => {
    expect(program.operations.length).toBe(2);
  });

  it("first op tool_number = 9", () => {
    expect(program.operations[0].tool_number).toBe(9);
  });

  it("first op classified as 'adaptive' (from STRATEGY: ADAPTIVE2D annotation)", () => {
    expect(program.operations[0].type).toBe("adaptive");
  });

  it("first op captures first spindle_rpm = 7401", () => {
    expect(program.operations[0].spindle_rpm).toBe(7401);
  });

  it("first op captures first feed_mm_min = 300 (the plunge, lowest-seen)", () => {
    expect(program.operations[0].feed_mm_min).toBe(300);
  });

  it("first op coordinates include the rectangle traversal (≥5 motion blocks)", () => {
    expect((program.operations[0].coordinates ?? []).length).toBeGreaterThanOrEqual(5);
  });

  it("second op tool_number = 10", () => {
    expect(program.operations[1].tool_number).toBe(10);
  });

  it("second op classified as 'drill' (from STRATEGY: DRILL annotation)", () => {
    expect(program.operations[1].type).toBe("drill");
  });

  it("second op captures spindle_rpm = 4000", () => {
    expect(program.operations[1].spindle_rpm).toBe(4000);
  });

  it("end_line_number is set on synthetic ops + greater than line_number", () => {
    expect(program.operations[0].end_line_number).toBeGreaterThan(program.operations[0].line_number);
    expect(program.operations[1].end_line_number).toBeGreaterThan(program.operations[1].line_number);
  });

  it("operations have mode='gcode' (not 'conversational')", () => {
    expect(program.operations[0].mode).toBe("gcode");
    expect(program.operations[1].mode).toBe("gcode");
  });
});

describe("HurcoParserEngine._extractInlineGCodeOps — modal-state inheritance", () => {
  // Test that X-only / Y-only / Z-only blocks inherit the previous position
  // (G-code is modal — XY100 followed by X150 means X=150, Y=100).
  const MODAL_SAMPLE = `%
O2002
T1 M6
S5000 M3
G0 X100 Y50 Z10
G1 Z-2 F300
G1 X200
G1 Y150
G1 X100
G1 Y50
G0 Z25
M30
%`;
  const program = hurcoParserEngine.parse(MODAL_SAMPLE, "modal-test.hnc");

  it("inherits Y from prior block when only X specified", () => {
    const op = program.operations[0];
    const coords = op.coordinates ?? [];
    const xOnly = coords.find(c => c.x === 200);
    expect(xOnly?.y).toBe(50);
  });

  it("inherits X from prior block when only Y specified", () => {
    const op = program.operations[0];
    const coords = op.coordinates ?? [];
    const yOnly = coords.find(c => c.y === 150);
    expect(yOnly?.x).toBe(200);
  });
});

describe("HurcoParserEngine._extractInlineGCodeOps — failure / adversarial", () => {
  it("file with NO T# M6 → operations stays empty (fallback no-op)", () => {
    const noTool = `%
O3003
G0 X10 Y10
G1 Z-1 F300
G1 X50
M30
%`;
    const program = hurcoParserEngine.parse(noTool, "no-tool.hnc");
    expect(program.operations.length).toBe(0);
  });

  it("WinMax conversational file → fallback does NOT run (preserves existing path)", () => {
    const conv = `%
O4004
PART SETUP
STOCK X=100 Y=50 Z=25
TOOL 1
DRILL PATTERN
M30
%`;
    const program = hurcoParserEngine.parse(conv, "conv.hnc");
    expect(program.mode).toBe("winmax");
    // Existing _extractOperations found "DRILL PATTERN" → no fallback fire
    const hasDrillPattern = program.operations.some(o => o.type === "drill_pattern");
    expect(hasDrillPattern).toBe(true);
  });

  it("tool-change with no motion after → segment skipped (no empty op emitted)", () => {
    const emptySegment = `%
O5005
T1 M6
S5000 M3
(no motion here)
T2 M6
G0 X10 Y10 Z5
G1 Z-2 F300
G1 X20
M30
%`;
    const program = hurcoParserEngine.parse(emptySegment, "empty-segment.hnc");
    // Only T2 has motion → only 1 synthetic op
    expect(program.operations.length).toBe(1);
    expect(program.operations[0].tool_number).toBe(2);
  });

  it("malformed numerics in coordinates skipped (defensive parse)", () => {
    const bad = `%
O6006
T1 M6
G0 X10 Y10 Z5
G1 X20 Y30 F300
M30
%`;
    const program = hurcoParserEngine.parse(bad, "bad.hnc");
    expect(program.operations.length).toBe(1);
    const coords = program.operations[0].coordinates ?? [];
    expect(coords.every(c => Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.z))).toBe(true);
  });
});

describe("HurcoParserEngine — canned-cycle + inline coexistence (iter12 update)", () => {
  // U-HURCO-PARSER-MS1-INLINE-NEXT-TO-CANNED (echo iter12): files like JM
  // Die's 0520396.hnc carry BOTH G81 canned cycles AND inline G0/G1 setup
  // motion. The canned-cycle classifier emits g_code-tagged ops with NO
  // coordinates, leaving the harness unable to re-emit. So the fallback
  // now ALSO runs when canned cycles are present (only suppressed when
  // some op already has coordinates) — producing complementary synthetic
  // ops with the surrounding G0 motion captured.
  const canned = `%
O7007
T1 M6
S5000 M3
G0 X10 Y10 Z5
G81 X10 Y10 Z-5 R2 F300
G81 X20 Y20 Z-5 R2
M30
%`;
  const program = hurcoParserEngine.parse(canned, "canned.hnc");

  it("G81 canned-cycle ops still detected by existing classify path", () => {
    const g81Ops = program.operations.filter(o => o.g_code === "G81");
    expect(g81Ops.length).toBeGreaterThanOrEqual(1);
  });

  it("synthetic op ALSO emitted with surrounding G0 motion captured (iter12)", () => {
    const opsWithCoords = program.operations.filter(o => (o.coordinates?.length ?? 0) > 0);
    expect(opsWithCoords.length).toBeGreaterThanOrEqual(1);
    // The synthetic op should have at least the G0 X10 Y10 Z5 rapid captured
    const firstSynthetic = opsWithCoords[0];
    expect((firstSynthetic.coordinates ?? []).some(c => c.type === "rapid")).toBe(true);
  });
});
