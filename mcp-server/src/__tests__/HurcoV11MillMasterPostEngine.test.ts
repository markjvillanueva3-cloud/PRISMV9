/**
 * MasterPostHurcoV11 Integration Tests
 *
 * Real-behavior tests for HurcoV11MillMasterPostEngine. No mocks.
 * Every test asserts a concrete value (not just presence).
 * All physics constants come from physics/constants.ts — no inline canonical numbers.
 *
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP-PP02
 */

import { describe, it, expect } from "vitest";
import {
  hurcoV11MillMasterPostEngine,
  HurcoV11MillMasterPostEngine,
  type MillOperation,
  type HurcoPostConfig,
  type MillTool,
  type MillMaterial,
  type PostMove
} from "../engines/HurcoV11MillMasterPostEngine.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR } from "../physics/constants.js";

const TAYLOR_TARGET_LIFE_MIN = 10;
const STICKOUT_RATIO_LIMIT = 4;

function makeOp(overrides: Partial<MillOperation> = {}): MillOperation {
  return {
    operation_type: "pocket",
    tool_number: 1,
    tool_diameter_mm: 12,
    tool_flutes: 4,
    tool_description: "12MM 4FL CARBIDE",
    material_iso: "N",
    spindle_rpm: 6000,
    feed_mm_min: 1200,
    axial_depth_mm: 3,
    coordinates: [
      { x: 0, y: 0, z: 5, type: "rapid" },
      { x: 25, y: 25, z: -3, type: "linear" }
    ],
    ...overrides
  };
}

function makePostMoves(): PostMove[] {
  return [
    { x: 0, y: 0, z: 5, type: "rapid" },
    { x: 50, y: 0, z: -2, type: "linear" },
    { x: 50, y: 50, z: -2, type: "arc_cw", r: 25 },
    { x: 0, y: 50, z: -2, type: "linear" }
  ];
}

function mustFind<T>(arr: T[], pred: (x: T) => boolean, label = "element"): T {
  const found = arr.find(pred);
  if (found === undefined) {
    throw new Error(`mustFind: no ${label} matching predicate in [${arr.length}] entries`);
  }
  return found;
}

function must<T>(v: T | undefined, label: string): T {
  if (v === undefined) throw new Error(`must: expected ${label} to be defined`);
  return v;
}

const linesMatching = (gcode: string[], pattern: RegExp): string[] =>
  gcode.filter(l => pattern.test(l));

describe("HurcoV11 — program structure", () => {
  it("emits Onnnn header with custom program number and comment", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp()],
      { program_number: 4242, program_comment: "TEST PART" }
    );
    expect(result.gcode[0]).toBe("O4242 (TEST PART)");
  });

  it("includes machine identification line verbatim and at expected position", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([makeOp()]);
    expect(result.gcode[1]).toBe("(MACHINE: HURCO VMX24 - WINMAX V11)");
  });

  it("emits ISO timestamp generated comment with parseable date", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([makeOp()]);
    const tsLine = mustFind(result.gcode, l => /\(GENERATED: /.test(l), "timestamp line");
    const match = tsLine.match(/\(GENERATED: (\S+)\)/);
    const iso = must(match, "timestamp regex match")[1];
    expect(Number.isNaN(Date.parse(iso))).toBe(false);
  });

  it("ends program with M30 then % terminator as last two tokens", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([makeOp()]);
    const lastTwo = result.gcode.slice(-2);
    expect(lastTwo[0].startsWith("M30")).toBe(true);
    expect(lastTwo[1]).toBe("%");
  });

  it("emits required end-of-program homing sequence in order: M05, M09, G91 G28 Z0, G28 X0 Y0", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([makeOp()]);
    const idxM05 = result.gcode.findIndex(l => l.startsWith("M05"));
    const idxM09 = result.gcode.findIndex(l => l.startsWith("M09"));
    const idxZHome = result.gcode.findIndex((l, i) => i > idxM09 && /^G91 G28 Z0/.test(l));
    const idxXYHome = result.gcode.findIndex((l, i) => i > idxZHome && /^G28 X0 Y0/.test(l));
    expect(idxM05).toBeGreaterThan(0);
    expect(idxM09).toBe(idxM05 + 1);
    expect(idxZHome).toBe(idxM09 + 1);
    expect(idxXYHome).toBe(idxZHome + 1);
  });

  it("total_lines equals gcode array length exactly", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([makeOp()]);
    expect(result.total_lines).toBe(result.gcode.length);
  });
});

describe("HurcoV11 — units & work offsets", () => {
  it("emits G21 metric by default with no G20 present", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([makeOp()]);
    const wcsIdx = result.gcode.findIndex(l => l === "G21 (METRIC)");
    expect(wcsIdx).toBeGreaterThan(0);
    expect(linesMatching(result.gcode, /^G20/).length).toBe(0);
  });

  it("emits G20 inch when units=inch with no G21 present", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([makeOp()], { units: "inch" });
    const inchIdx = result.gcode.findIndex(l => l === "G20 (INCH)");
    expect(inchIdx).toBeGreaterThan(0);
    expect(linesMatching(result.gcode, /^G21/).length).toBe(0);
  });

  it("emits direct G55 for work_offset 55", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([makeOp()], { work_offset: 55 });
    const wcs = mustFind(result.gcode, l => /WORK OFFSET/.test(l), "WCS line");
    expect(wcs).toBe("G55 (WORK OFFSET)");
  });

  it("emits G54.1 P12 extended offset for work_offset 12", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([makeOp()], { work_offset: 12 });
    const wcs = mustFind(result.gcode, l => /WORK OFFSET/.test(l), "WCS line");
    expect(wcs).toBe("G54.1 P12 (WORK OFFSET)");
  });
});

describe("HurcoV11 — tool change", () => {
  it("emits one G91 G28 Z0 retract per operation plus one at end of program", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([makeOp(), makeOp({ tool_number: 2 })]);
    const zRetracts = linesMatching(result.gcode, /^G91 G28 Z0/);
    expect(zRetracts.length).toBe(3);
  });

  it("emits T# M06 with tool_description in comment", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ tool_number: 7, tool_description: "10MM BALL ENDMILL" })
    ]);
    const tcLine = mustFind(result.gcode, l => /^T7 M06/.test(l), "T7 line");
    expect(tcLine).toBe("T7 M06 (10MM BALL ENDMILL)");
  });

  it("emits G43 H# tool length compensation matching tool_number", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([makeOp({ tool_number: 13 })]);
    const tlc = mustFind(result.gcode, l => /^G43 H/.test(l), "G43 line");
    expect(tlc).toBe("G43 H13 (TOOL LENGTH COMP)");
  });

  it("uses structured tool.description override when supplied (flat tool_description shadowed)", () => {
    const tool: MillTool = { number: 5, diameter_mm: 8, flutes: 3, description: "STRUCTURED-NAME" };
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ tool_number: 5, tool_description: "FLAT-NAME", tool })
    ]);
    const tcLine = mustFind(result.gcode, l => /^T5 M06/.test(l), "T5 line");
    expect(tcLine).toBe("T5 M06 (STRUCTURED-NAME)");
    expect(linesMatching(result.gcode, /FLAT-NAME/).length).toBe(0);
  });
});

describe("HurcoV11 — spindle & coolant", () => {
  it("emits S<rpm> M03 spindle CW with exact RPM value", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([makeOp({ spindle_rpm: 8500 })]);
    const sLine = mustFind(result.gcode, l => /^S8500 M03/.test(l), "S line");
    expect(sLine).toBe("S8500 M03 (SPINDLE CW 8500 RPM)");
  });

  it("inserts G04 P1.0 dwell when axial_depth > 0.5×D (12mm tool, 8mm DOC)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ tool_diameter_mm: 12, axial_depth_mm: 8 })
    ]);
    const dwells = linesMatching(result.gcode, /^G04 P1\.0/);
    expect(dwells.length).toBe(1);
    expect(dwells[0]).toBe("G04 P1.0 (DWELL FOR SPINDLE RAMP - HEAVY CUT)");
  });

  it("omits G04 dwell on light cuts (axial_depth ≤ 0.5×D)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ tool_diameter_mm: 12, axial_depth_mm: 2 })
    ]);
    expect(linesMatching(result.gcode, /^G04/).length).toBe(0);
  });

  it("emits M08 flood coolant when coolant=flood with no M07 or M88", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ coolant: "flood" })
    ]);
    const coolant = mustFind(result.gcode, l => /COOLANT/.test(l) && /^M0?8/.test(l), "M08 line");
    expect(coolant).toBe("M08 (FLOOD COOLANT)");
    expect(linesMatching(result.gcode, /^M07/).length).toBe(0);
    expect(linesMatching(result.gcode, /^M88/).length).toBe(0);
  });

  it("emits M07 mist and M88 through-spindle coolant with exact comments", () => {
    const mist = hurcoV11MillMasterPostEngine.generateProgram([makeOp({ coolant: "mist" })]);
    const tsc = hurcoV11MillMasterPostEngine.generateProgram([makeOp({ coolant: "tsc" })]);
    const mistLine = mustFind(mist.gcode, l => /^M07/.test(l), "M07 line");
    const tscLine = mustFind(tsc.gcode, l => /^M88/.test(l), "M88 line");
    expect(mistLine).toBe("M07 (MIST COOLANT)");
    expect(tscLine).toBe("M88 (THROUGH-SPINDLE COOLANT)");
  });
});

describe("HurcoV11 — toolpath generation", () => {
  it("formats G00 rapid coordinates to exactly 3 decimal places (rounds 12.3456 → 12.346)", () => {
    const op = makeOp({
      coordinates: [{ x: 12.3456, y: 7.891, z: 5, type: "rapid" }]
    });
    const result = hurcoV11MillMasterPostEngine.generateProgram([op]);
    const rapid = mustFind(result.gcode, l => /^G00 X12\.346/.test(l), "rapid");
    expect(rapid).toBe("G00 X12.346 Y7.891 Z5.000");
  });

  it("emits G01 linear with literal feed value F<n>", () => {
    const op = makeOp({
      feed_mm_min: 1500,
      coordinates: [{ x: 10, y: 20, z: -2, type: "linear" }]
    });
    const result = hurcoV11MillMasterPostEngine.generateProgram([op], { optimize_feeds: false });
    const linear = mustFind(result.gcode, l => /^G01/.test(l), "G01");
    expect(linear).toBe("G01 X10.000 Y20.000 Z-2.000 F1500");
  });

  it("emits G02 arc CW with R<radius> when arc_data has r", () => {
    const op = makeOp({
      coordinates: [{ x: 20, y: 0, z: -2, type: "arc_cw" }],
      arc_data: [{ r: 10 }]
    });
    const result = hurcoV11MillMasterPostEngine.generateProgram([op], { optimize_feeds: false });
    const arc = mustFind(result.gcode, l => /^G02/.test(l), "G02");
    expect(arc).toBe("G02 X20.000 Y0.000 R10.000 F1200");
  });

  it("emits G02 arc CW with I/J center offsets when arc_data has i and j", () => {
    const op = makeOp({
      coordinates: [{ x: 20, y: 0, z: -2, type: "arc_cw" }],
      arc_data: [{ i: 10, j: 0 }]
    });
    const result = hurcoV11MillMasterPostEngine.generateProgram([op], { optimize_feeds: false });
    const arc = mustFind(result.gcode, l => /^G02/.test(l), "G02");
    expect(arc).toBe("G02 X20.000 Y0.000 I10.000 J0.000 F1200");
  });

  it("emits G03 arc CCW with R radius and signed coordinates rendered correctly", () => {
    const op = makeOp({
      coordinates: [{ x: -10, y: 5, z: -2, type: "arc_ccw" }],
      arc_data: [{ r: 7.5 }]
    });
    const result = hurcoV11MillMasterPostEngine.generateProgram([op], { optimize_feeds: false });
    const arc = mustFind(result.gcode, l => /^G03/.test(l), "G03");
    expect(arc).toBe("G03 X-10.000 Y5.000 R7.500 F1200");
  });

  it("emits G03 arc CCW with I/J center offsets and signed values", () => {
    const op = makeOp({
      coordinates: [{ x: -10, y: 5, z: -2, type: "arc_ccw" }],
      arc_data: [{ i: -5, j: 2.5 }]
    });
    const result = hurcoV11MillMasterPostEngine.generateProgram([op], { optimize_feeds: false });
    const arc = mustFind(result.gcode, l => /^G03/.test(l), "G03");
    expect(arc).toBe("G03 X-10.000 Y5.000 I-5.000 J2.500 F1200");
  });

  it("brackets toolpath with rapid to safe Z (entry + exit, configured safe_z_mm value)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([makeOp()], { safe_z_mm: 75 });
    const safeZRapids = linesMatching(result.gcode, /^G00 Z75/);
    expect(safeZRapids.length).toBe(2);
    expect(safeZRapids[0]).toBe("G00 Z75 (RAPID TO SAFE Z)");
    expect(safeZRapids[1]).toBe("G00 Z75 (RETRACT)");
  });
});

describe("HurcoV11 — physics checks", () => {
  it("Vc check passes for in-range surface speed and matches π·D·n/1000", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([makeOp()]);
    const vc = mustFind(result.physics_checks, c => /Cutting speed/.test(c.check), "Vc check");
    const expectedVc = (Math.PI * 12 * 6000) / 1000;
    expect(vc.passed).toBe(true);
    expect(vc.value).toBeCloseTo(expectedVc, 1);
  });

  it("Vc check fails when speed exceeds 1.2× ISO max (D=20, n=6000, ISO H)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ material_iso: "H", tool_diameter_mm: 20, spindle_rpm: 6000 })
    ]);
    const vc = mustFind(result.physics_checks, c => /Cutting speed/.test(c.check), "Vc check");
    const expectedVc = (Math.PI * 20 * 6000) / 1000;
    expect(vc.passed).toBe(false);
    expect(vc.value).toBeCloseTo(expectedVc, 1);
  });

  it("fz check fails when chip load < 0.02 mm/tooth (low feed × high RPM × 6 flutes)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp({ feed_mm_min: 100, spindle_rpm: 8000, tool_flutes: 6 })],
      { optimize_feeds: false }
    );
    const fz = mustFind(result.physics_checks, c => /Chip load/.test(c.check), "fz check");
    const expectedFz = 100 / (8000 * 6);
    expect(fz.passed).toBe(false);
    expect(fz.value).toBeCloseTo(expectedFz, 5);
  });

  it("Kienzle Fc check uses CANONICAL_KIENZLE constants and matches hand calc (regression: prior NaN bug)", () => {
    const op = makeOp({
      material_iso: "P",
      axial_depth_mm: 1,
      spindle_rpm: 1000,
      tool_flutes: 2,
      feed_mm_min: 200
    });
    const result = hurcoV11MillMasterPostEngine.generateProgram([op], { optimize_feeds: false });
    const fc = mustFind(result.physics_checks, c => /Cutting force/.test(c.check), "Fc check");
    const fcValue = must(fc.value, "fc.value");
    expect(Number.isNaN(fcValue)).toBe(false);
    expect(fc.check).toContain(`kc1_1=${CANONICAL_KIENZLE.P.kc1_1}`);
    expect(fc.check).toContain(`mc=${CANONICAL_KIENZLE.P.mc}`);
    const fz = 200 / (1000 * 2);
    const expectedFc = CANONICAL_KIENZLE.P.kc1_1 * 1 * Math.pow(fz, 1 - CANONICAL_KIENZLE.P.mc);
    expect(fcValue).toBeCloseTo(expectedFc, 1);
  });

  it("RPM check fails with exact value when spindle exceeds 10000 RPM machine limit", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([makeOp({ spindle_rpm: 12000 })]);
    const rpm = mustFind(result.physics_checks, c => /Spindle.*RPM/.test(c.check), "RPM check");
    expect(rpm.passed).toBe(false);
    expect(rpm.value).toBe(12000);
    expect(rpm.limit).toBe(10000);
  });

  it("Taylor tool-life check uses canonical C and n constants and matches T = (C/Vc)^(1/n)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ material_iso: "P" })
    ]);
    const taylor = mustFind(result.physics_checks, c => /Taylor tool life/.test(c.check), "Taylor");
    expect(taylor.check).toContain(`C=${CANONICAL_TAYLOR.P.C}`);
    expect(taylor.check).toContain(`n=${CANONICAL_TAYLOR.P.n}`);
    const vc = (Math.PI * 12 * 6000) / 1000;
    const expectedT = Math.pow(CANONICAL_TAYLOR.P.C / vc, 1 / CANONICAL_TAYLOR.P.n);
    expect(taylor.value).toBeCloseTo(expectedT, 1);
    expect(taylor.passed).toBe(expectedT >= TAYLOR_TARGET_LIFE_MIN);
  });

  it("stickout deflection check appears only when tool.stickout_mm provided; fails when ratio > 4×D", () => {
    const tool: MillTool = { number: 1, diameter_mm: 6, flutes: 3, stickout_mm: 30 };
    const withStickout = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ tool, tool_diameter_mm: 6 })
    ]);
    const stick = mustFind(withStickout.physics_checks, c => /stickout/.test(c.check), "stickout");
    expect(stick.passed).toBe(false);
    expect(stick.value).toBe(5);
    expect(stick.limit).toBe(STICKOUT_RATIO_LIMIT);
    const noStickout = hurcoV11MillMasterPostEngine.generateProgram([makeOp()]);
    const stickAbsent = noStickout.physics_checks.filter(c => /stickout/.test(c.check));
    expect(stickAbsent.length).toBe(0);
  });
});

describe("HurcoV11 — aggressiveness levels", () => {
  it("clamps aggressiveness < 1 to 1 (output reflects clamped value)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp()],
      // @ts-expect-error: deliberately out of range to exercise clamp
      { aggressiveness: -3 }
    );
    expect(result.aggressiveness_applied).toBe(1);
  });

  it("clamps aggressiveness > 5 to 5", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp()],
      // @ts-expect-error: deliberately out of range to exercise clamp
      { aggressiveness: 99 }
    );
    expect(result.aggressiveness_applied).toBe(5);
  });

  it("L1 ULTRA-CONSERVATIVE applies feed multiplier 0.6 (1000 → 600)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp({ feed_mm_min: 1000 })],
      { aggressiveness: 1, optimize_feeds: false }
    );
    expect(result.feed_optimizations.length).toBe(1);
    expect(result.feed_optimizations[0].original_feed_mm_min).toBe(1000);
    expect(result.feed_optimizations[0].optimized_feed_mm_min).toBe(600);
  });

  it("L5 MAX applies feed multiplier 1.1 (1000 → 1100)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp({ feed_mm_min: 1000 })],
      { aggressiveness: 5, optimize_feeds: false }
    );
    expect(result.feed_optimizations[0].optimized_feed_mm_min).toBe(1100);
  });

  it("L1 label appears verbatim in program header", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp()],
      { aggressiveness: 1 }
    );
    const header = mustFind(result.gcode, l => /AGGRESSIVENESS/.test(l), "aggressiveness header");
    expect(header).toBe("(AGGRESSIVENESS: ULTRA-CONSERVATIVE L1/5)");
  });
});

describe("HurcoV11 — prove-out mode", () => {
  it("default prove-out feed_factor 0.5 halves feed (1000 → 500)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp({ feed_mm_min: 1000 })],
      { prove_out: { enabled: true }, optimize_feeds: false }
    );
    expect(result.prove_out_mode).toBe(true);
    expect(result.feed_optimizations[0].optimized_feed_mm_min).toBe(500);
  });

  it("custom feed_factor 0.3 honored (1000 → 300)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp({ feed_mm_min: 1000 })],
      { prove_out: { enabled: true, feed_factor: 0.3 }, optimize_feeds: false }
    );
    expect(result.feed_optimizations[0].optimized_feed_mm_min).toBe(300);
  });

  it("emits exactly one M01 between two ops (none before first op)", () => {
    const ops = [makeOp({ tool_number: 1 }), makeOp({ tool_number: 2 })];
    const result = hurcoV11MillMasterPostEngine.generateProgram(ops, {
      prove_out: { enabled: true }
    });
    const m01s = linesMatching(result.gcode, /^M01 \(OPTIONAL STOP - PROVE OUT\)/);
    expect(m01s.length).toBe(1);
  });

  it("add_optional_stops: false suppresses M01 even with prove-out enabled", () => {
    const ops = [makeOp({ tool_number: 1 }), makeOp({ tool_number: 2 })];
    const result = hurcoV11MillMasterPostEngine.generateProgram(ops, {
      prove_out: { enabled: true, add_optional_stops: false }
    });
    expect(linesMatching(result.gcode, /OPTIONAL STOP/).length).toBe(0);
  });
});

describe("HurcoV11 — Kienzle-bounded feed optimization", () => {
  it("reduces feed when predicted Fc exceeds max_cutting_force_N", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({
        material_iso: "P",
        axial_depth_mm: 10,
        feed_mm_min: 4000,
        spindle_rpm: 4000,
        tool_flutes: 2
      })
    ], { max_cutting_force_N: 1000 });
    expect(result.feed_optimizations.length).toBe(1);
    const opt = result.feed_optimizations[0];
    expect(opt.original_feed_mm_min).toBe(4000);
    expect(opt.optimized_feed_mm_min).toBeLessThan(4000);
    expect(opt.reason).toMatch(/Kienzle Fc=\d+N exceeded 1000N/);
  });

  it("never increases feed (light cut produces no Kienzle reduction entry)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ material_iso: "N", axial_depth_mm: 0.5, feed_mm_min: 800 })
    ]);
    const kienzleOpt = result.feed_optimizations.filter(o => /Kienzle/.test(o.reason));
    expect(kienzleOpt.length).toBe(0);
  });

  it("optimize_feeds: false disables Kienzle reduction even when force would exceed limit", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({
        material_iso: "P",
        axial_depth_mm: 10,
        feed_mm_min: 4000,
        spindle_rpm: 4000,
        tool_flutes: 2
      })
    ], { max_cutting_force_N: 1000, optimize_feeds: false });
    const kienzleOpt = result.feed_optimizations.filter(o => /Kienzle/.test(o.reason));
    expect(kienzleOpt.length).toBe(0);
  });

  it("optimized feed produces Fc ≤ limit (verify bound by recomputing Kienzle)", () => {
    const op = makeOp({
      material_iso: "P",
      axial_depth_mm: 8,
      feed_mm_min: 5000,
      spindle_rpm: 3000,
      tool_flutes: 2
    });
    const maxF = 1500;
    const result = hurcoV11MillMasterPostEngine.generateProgram([op], { max_cutting_force_N: maxF });
    expect(result.feed_optimizations.length).toBe(1);
    const optimized = result.feed_optimizations[0];
    const fzNew = optimized.optimized_feed_mm_min / (op.spindle_rpm * op.tool_flutes);
    const FcNew = CANONICAL_KIENZLE.P.kc1_1 * op.axial_depth_mm * Math.pow(fzNew, 1 - CANONICAL_KIENZLE.P.mc);
    expect(FcNew).toBeLessThanOrEqual(maxF * 1.05);
  });
});

describe("HurcoV11 — tribal knowledge injection", () => {
  it("getStats reports exactly 12 tribal tips", () => {
    expect(hurcoV11MillMasterPostEngine.getStats().tribal_tips).toBe(12);
  });

  it("aluminum-specific tip applied for ISO N pocket op (exact content match)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ material_iso: "N", operation_type: "pocket" })
    ]);
    const aluTip = mustFind(result.tribal_tips_applied, t => /6061-T6/.test(t), "6061 tip");
    expect(aluTip).toBe("[aluminum] For 6061-T6 on the Hurco: 500+ SFM, 0.004\" chipload, climb mill only — chip evacuation is key");
  });

  it("hardened-steel tip applied for ISO H contour op (exact content match)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ material_iso: "H", operation_type: "contour" })
    ]);
    const hardTip = mustFind(result.tribal_tips_applied, t => /D2 above 58 HRC/.test(t), "hardened tip");
    expect(hardTip).toBe("[hardened] D2 above 58 HRC: use 150 SFM max, 0.001\" IPT, light DOC (0.010\"), fresh carbide only");
  });
});

describe("HurcoV11 — setup sheet emission", () => {
  it("emits setup_sheet by default with machine='Hurco VMX24' and controller='WinMax V11'", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([makeOp()]);
    const sheet = must(result.setup_sheet, "setup_sheet");
    expect(sheet.machine).toBe("Hurco VMX24");
    expect(sheet.controller).toBe("WinMax V11");
    expect(sheet.units).toBe("metric");
  });

  it("emit_setup_sheet: false yields setup_sheet === undefined", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([makeOp()], {
      emit_setup_sheet: false
    });
    expect(result.setup_sheet === undefined).toBe(true);
  });

  it("setup_sheet.tools deduplicated and sorted ascending by tool number", () => {
    const ops = [
      makeOp({ tool_number: 5 }),
      makeOp({ tool_number: 2 }),
      makeOp({ tool_number: 5 }),
      makeOp({ tool_number: 1 })
    ];
    const result = hurcoV11MillMasterPostEngine.generateProgram(ops);
    const nums = must(result.setup_sheet, "setup_sheet").tools.map(t => t.number);
    expect(nums).toEqual([1, 2, 5]);
  });

  it("setup_sheet.operations rows have sequential 1-based sequence numbers in order", () => {
    const ops = [
      makeOp({ tool_number: 1, operation_type: "face" }),
      makeOp({ tool_number: 2, operation_type: "pocket" }),
      makeOp({ tool_number: 3, operation_type: "drill" })
    ];
    const result = hurcoV11MillMasterPostEngine.generateProgram(ops);
    const seq = must(result.setup_sheet, "setup_sheet").operations.map(o => `${o.sequence}:${o.type}`);
    expect(seq).toEqual(["1:face", "2:pocket", "3:drill"]);
  });
});

describe("HurcoV11 — postSingle simplified API", () => {
  it("wraps a single PostMove array into a complete program", () => {
    const tool: MillTool = { number: 3, diameter_mm: 10, flutes: 4, description: "10MM CARBIDE", coating: "TiAlN", stickout_mm: 30 };
    const material: MillMaterial = { iso_group: "N", name: "6061-T6" };
    const result = hurcoV11MillMasterPostEngine.postSingle({
      toolpath: makePostMoves(),
      material,
      tool,
      operation: "pocket",
      spindle_rpm: 8000,
      feed_mm_min: 1500,
      axial_depth_mm: 2
    });
    expect(result.tools_used).toEqual([3]);
    const tcLine = mustFind(result.gcode, l => /^T3 M06/.test(l), "T3 line");
    expect(tcLine).toBe("T3 M06 (10MM CARBIDE)");
  });

  it("PostMove arc_cw with R is preserved through to G02 R# output", () => {
    const result = hurcoV11MillMasterPostEngine.postSingle({
      toolpath: [
        { x: 0, y: 0, z: 5, type: "rapid" },
        { x: 50, y: 0, z: -2, type: "linear" },
        { x: 50, y: 50, z: -2, type: "arc_cw", r: 25 }
      ],
      material: { iso_group: "N" },
      tool: { number: 1, diameter_mm: 10, flutes: 4 },
      operation: "contour",
      spindle_rpm: 6000,
      feed_mm_min: 1000,
      axial_depth_mm: 2
    });
    const arc = mustFind(result.gcode, l => /^G02/.test(l), "G02");
    expect(arc).toContain("R25.000");
    expect(arc).toContain("X50.000");
    expect(arc).toContain("Y50.000");
  });

  it("aggressiveness param flows through to output and header", () => {
    const result = hurcoV11MillMasterPostEngine.postSingle({
      toolpath: makePostMoves(),
      material: { iso_group: "N" },
      tool: { number: 1, diameter_mm: 10, flutes: 4 },
      operation: "pocket",
      spindle_rpm: 6000,
      feed_mm_min: 1000,
      axial_depth_mm: 2,
      aggressiveness: 2
    });
    expect(result.aggressiveness_applied).toBe(2);
    const header = mustFind(result.gcode, l => /AGGRESSIVENESS/.test(l), "header");
    expect(header).toBe("(AGGRESSIVENESS: CONSERVATIVE L2/5)");
  });

  it("structured tool coating + stickout flow into setup sheet", () => {
    const result = hurcoV11MillMasterPostEngine.postSingle({
      toolpath: makePostMoves(),
      material: { iso_group: "N" },
      tool: { number: 9, diameter_mm: 8, flutes: 3, coating: "AlCrN", stickout_mm: 25 },
      operation: "pocket",
      spindle_rpm: 6000,
      feed_mm_min: 1000,
      axial_depth_mm: 2
    });
    const t = must(result.setup_sheet, "setup_sheet").tools[0];
    expect(t.number).toBe(9);
    expect(t.coating).toBe("AlCrN");
    expect(t.stickout_mm).toBe(25);
    expect(t.diameter_mm).toBe(8);
  });
});

describe("HurcoV11 — material constant overrides", () => {
  it("custom kc1_1 override is honored over canonical (custom value reflected in Fc check string)", () => {
    const customKc = 999;
    const op = makeOp({
      material_iso: "P",
      material: { iso_group: "P", kc1_1: customKc, mc: CANONICAL_KIENZLE.P.mc }
    });
    const result = hurcoV11MillMasterPostEngine.generateProgram([op], { optimize_feeds: false });
    const fc = mustFind(result.physics_checks, c => /Cutting force/.test(c.check), "Fc check");
    expect(fc.check).toContain(`kc1_1=${customKc}`);
    expect(fc.check.includes(`kc1_1=${CANONICAL_KIENZLE.P.kc1_1}`)).toBe(false);
  });

  it("falls back to canonical kc1_1 when no material override given (ISO M)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [makeOp({ material_iso: "M" })],
      { optimize_feeds: false }
    );
    const fc = mustFind(result.physics_checks, c => /Cutting force/.test(c.check), "Fc check");
    expect(fc.check).toContain(`kc1_1=${CANONICAL_KIENZLE.M.kc1_1}`);
  });

  it("rejects kc1_1 override below safe floor (silent-disable guard, U-PPGH04)", () => {
    const op = makeOp({
      material_iso: "P",
      material: { kc1_1: 0.001, mc: CANONICAL_KIENZLE.P.mc },
    });
    expect(() =>
      hurcoV11MillMasterPostEngine.generateProgram([op], { optimize_feeds: false }),
    ).toThrow(/kc1_1 override 0\.001 out of safe range/);
  });

  it("rejects kc1_1 override above safe ceiling (U-PPGH04)", () => {
    const op = makeOp({
      material_iso: "P",
      material: { kc1_1: 9999, mc: CANONICAL_KIENZLE.P.mc },
    });
    expect(() =>
      hurcoV11MillMasterPostEngine.generateProgram([op], { optimize_feeds: false }),
    ).toThrow(/kc1_1 override 9999 out of safe range/);
  });

  it("rejects mc override outside [0.10, 0.45] (U-PPGH04)", () => {
    const op = makeOp({
      material_iso: "P",
      material: { kc1_1: CANONICAL_KIENZLE.P.kc1_1, mc: 0.05 },
    });
    expect(() =>
      hurcoV11MillMasterPostEngine.generateProgram([op], { optimize_feeds: false }),
    ).toThrow(/mc override 0\.05 out of safe range/);
  });

  it("rejects mismatched iso_group between op.material_iso and op.material.iso_group (U-PPGH04)", () => {
    const op = makeOp({
      material_iso: "P",
      material: { iso_group: "M", kc1_1: CANONICAL_KIENZLE.M.kc1_1, mc: CANONICAL_KIENZLE.M.mc },
    });
    expect(() =>
      hurcoV11MillMasterPostEngine.generateProgram([op], { optimize_feeds: false }),
    ).toThrow(/does not match/);
  });

  it("partial override (kc1_1 only) keeps canonical mc and surfaces both in check string (U-PPGH04)", () => {
    const op = makeOp({
      material_iso: "M",
      material: { kc1_1: 1500 },
    });
    const result = hurcoV11MillMasterPostEngine.generateProgram([op], { optimize_feeds: false });
    const fc = mustFind(result.physics_checks, c => /Cutting force/.test(c.check), "Fc check");
    expect(fc.check).toContain("kc1_1=1500");
    expect(fc.check).toContain(`mc=${CANONICAL_KIENZLE.M.mc}`);
  });
});

describe("HurcoV11 — UltiMotion & metadata", () => {
  // U-HURCO-G053-FIX (2026-05-22 india /loop): the prior G187 P3 expectation
  // was inherited from Haas dialect — wrong for Hurco V11. Real JM Die-posted
  // programs (H:/prism/JM DIE/HURCO CNC PROGRAMS/) + Fusion .cps PRISM Enhanced
  // v8.9.153 (line 3022) both emit G05.3 P<n> immediately after T<n> M06.
  // Operator confirmed 2026-05-22. P35 for ADAPTIVE roughing, P10 for FINISH ops.
  it("UltiMotion G05.3 P10 emitted by default for non-adaptive ops (per tool change)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([makeOp()]);
    const sm = mustFind(result.gcode, l => /^G05\.3/.test(l), "G05.3");
    expect(sm).toBe("G05.3 P10 (T1 FINISH SMOOTHING)");
  });

  it("UltiMotion G05.3 P35 emitted for adaptive operation_type", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ operation_type: "adaptive", tool_number: 7 })
    ]);
    const sm = mustFind(result.gcode, l => /^G05\.3/.test(l), "G05.3");
    expect(sm).toBe("G05.3 P35 (T7 ADAPTIVE ROUGH SMOOTHING)");
  });

  it("use_ultimotion: false suppresses all G05.3 emission", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([makeOp()], {
      use_ultimotion: false
    });
    expect(linesMatching(result.gcode, /^G05\.3/).length).toBe(0);
    // Anti-regression: ensure the prior bogus G187 emission stays dead.
    expect(linesMatching(result.gcode, /^G187/).length).toBe(0);
  });

  it("tools_used array deduplicated and sorted ascending across multiple operations", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ tool_number: 7 }),
      makeOp({ tool_number: 3 }),
      makeOp({ tool_number: 7 }),
      makeOp({ tool_number: 1 })
    ]);
    expect(result.tools_used).toEqual([1, 3, 7]);
  });

  it("warnings array contains operation index + RPM value when physics check fails", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      makeOp({ spindle_rpm: 50000 })
    ]);
    const rpmWarning = mustFind(result.warnings, w => /Spindle.*50000.*RPM/.test(w), "RPM warning");
    expect(rpmWarning.startsWith("Op 1 line")).toBe(true);
    expect(rpmWarning).toContain("50000 RPM");
  });

  it("program_number propagates exactly from config to output and Onnnn header", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([makeOp()], {
      program_number: 8675
    });
    expect(result.program_number).toBe(8675);
    expect(result.gcode[0].startsWith("O8675 ")).toBe(true);
  });
});

describe("HurcoV11 — singleton & stats", () => {
  it("singleton produces identical g-code (modulo timestamp) to fresh instance", () => {
    const op = makeOp({ feed_mm_min: 1500 });
    const cfg: Partial<HurcoPostConfig> = { program_number: 1234 };
    const a = hurcoV11MillMasterPostEngine.generateProgram([op], cfg);
    const b = new HurcoV11MillMasterPostEngine().generateProgram([op], cfg);
    const stripTs = (lines: string[]) => lines.filter(l => !/GENERATED:/.test(l));
    expect(stripTs(a.gcode)).toEqual(stripTs(b.gcode));
  });

  it("getStats reports machine, controller, 12 tips, 5 base physics checks, 12-feature list", () => {
    const stats = hurcoV11MillMasterPostEngine.getStats();
    expect(stats.machine).toBe("Hurco VMX24");
    expect(stats.controller).toBe("WinMax V11");
    expect(stats.tribal_tips).toBe(12);
    expect(stats.physics_checks).toBe(5);
    expect(stats.features.length).toBe(12);
    expect(stats.features.some(f => /Kienzle force validation/.test(f))).toBe(true);
    expect(stats.features.some(f => /Taylor tool life/.test(f))).toBe(true);
    expect(stats.features.some(f => /Aggressiveness levels 1-5/.test(f))).toBe(true);
    expect(stats.features.some(f => /Prove-out/.test(f))).toBe(true);
  });
});
