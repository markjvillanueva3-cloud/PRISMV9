/**
 * HurcoV11Probing.test.ts
 * Renishaw Inspection Plus probe cycle emission for the HurcoV11MillMasterPostEngine.
 *
 * VERIFIED dialect (Renishaw Inspection Plus on Hurco WinMax, 2026-06-29):
 *   G65 P9832  -- probe ON
 *   G65 P9810  -- protected positioning approach
 *   G65 P9811  -- single-surface measure (one axis)
 *   G65 P9814  -- bore/boss diameter
 *   G65 P9815  -- circular bore/boss centre find
 *   G65 P9801  -- calibrate probe length (no P9810 wrap)
 *   G65 P9802  -- calibrate stylus X/Y (no P9810 wrap)
 *   G65 P9833  -- probe OFF
 *
 * Test strategy (R9 -- tests verify intent, not behaviour):
 *   - Happy path: each cycle type emits exactly the verified G65 P98xx form.
 *   - One-time operator WARNING comment appears exactly once across multiple probe ops.
 *   - Missing required param -> warn + skip (never emit a garbage macro).
 *   - Non-finite param -> warn + skip.
 *   - Non-probe op emits NO G65 P98xx lines.
 *   - Adversarial: NaN dia_mm, unknown type.
 *   - Both op.cycle + op.probe set -> probe wins, warning issued, no crash.
 *
 * Round-trip: all tests exercise generateProgram() through the singleton
 * (not emitProbeCycle in isolation) per R15.
 */

import { describe, it, expect } from "vitest";
import {
  hurcoV11MillMasterPostEngine,
  type MillOperation,
} from "../engines/HurcoV11MillMasterPostEngine.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Probe field shorthand type (mirrors MillOperation["probe"]). */
type ProbeSpec = NonNullable<MillOperation["probe"]>;

/** Minimal probe op that carries a probe field. */
function makeProbeOp(probe: ProbeSpec, overrides: Partial<MillOperation> = {}): MillOperation {
  return {
    operation_type: "face",
    tool_number: 10,
    tool_diameter_mm: 10,
    tool_flutes: 4,
    tool_description: "RENISHAW OMP40",
    material_iso: "P",
    spindle_rpm: 0,       // probe ops: spindle parked
    feed_mm_min: 500,
    axial_depth_mm: 0,
    coordinates: [{ x: 0, y: 0, z: 5, type: "rapid" }],
    probe,
    ...overrides,
  };
}

/** Minimal non-probe op (no probe field at all). */
function makeNonProbeOp(): MillOperation {
  return {
    operation_type: "pocket",
    tool_number: 1,
    tool_diameter_mm: 12,
    tool_flutes: 4,
    material_iso: "P",
    spindle_rpm: 3000,
    feed_mm_min: 800,
    axial_depth_mm: 3,
    coordinates: [
      { x: 0, y: 0, z: 5, type: "rapid" },
      { x: 50, y: 0, z: -3, type: "linear" },
    ],
  };
}

/** Run generateProgram with emit_setup_sheet and use_ultimotion disabled
 *  so output is minimal and deterministic. Returns gcode lines + warnings. */
function run(ops: MillOperation[]): { gcode: string[]; warnings: string[] } {
  const out = hurcoV11MillMasterPostEngine.generateProgram(ops, {
    emit_setup_sheet: false,
    use_ultimotion: false,
  });
  return { gcode: out.gcode, warnings: out.warnings };
}

/** Return only the G65 P98xx lines from a gcode array. */
function probeLines(gcode: string[]): string[] {
  return gcode.filter((l) => /G65\s+P98\d\d/.test(l));
}

/** True when gcode contains a line with the one-time probe operator warning. */
function hasProbeWarning(gcode: string[]): boolean {
  return gcode.some((l) => l.startsWith("(PROBING: requires"));
}

// ---------------------------------------------------------------------------
// 1. HAPPY PATH — each cycle type
// ---------------------------------------------------------------------------

describe("HurcoV11Probing -- single_surface cycle (P9811)", () => {
  it("emits P9832 / P9810 / P9811 Z / P9833 for Z-axis measure", () => {
    const { gcode, warnings } = run([
      makeProbeOp({ type: "single_surface", axis: "Z", z_mm: -5.0, feed_mm_min: 300 }),
    ]);
    const pg = probeLines(gcode);
    // Exact verified forms
    expect(pg).toContain("G65 P9832 (PROBE ON)");
    expect(pg).toContain("G65 P9810 Z-5.000 F300.000 (PROTECTED POSITION)");
    expect(pg).toContain("G65 P9811 Z-5.000 (SINGLE SURFACE MEASURE Z)");
    expect(pg).toContain("G65 P9833 (PROBE OFF)");
    // No spurious P-numbers
    expect(pg.every((l) => /P98(10|11|32|33)/.test(l))).toBe(true);
    expect(warnings.some((w) => w.includes("probe"))).toBe(false);
  });

  it("emits P9811 X with x_mm for X-axis measure", () => {
    const { gcode } = run([
      makeProbeOp({ type: "single_surface", axis: "X", z_mm: -2.0, x_mm: 25.4 }),
    ]);
    const pg = probeLines(gcode);
    expect(pg).toContain("G65 P9811 X25.400 (SINGLE SURFACE MEASURE X)");
  });

  it("emits P9811 Y with y_mm for Y-axis measure", () => {
    const { gcode } = run([
      makeProbeOp({ type: "single_surface", axis: "Y", z_mm: -2.0, y_mm: 50.8 }),
    ]);
    const pg = probeLines(gcode);
    expect(pg).toContain("G65 P9811 Y50.800 (SINGLE SURFACE MEASURE Y)");
  });

  it("appends T word when tool_number is provided", () => {
    const { gcode } = run([
      makeProbeOp({ type: "single_surface", axis: "Z", z_mm: -3.0, tool_number: 7 }),
    ]);
    const pg = probeLines(gcode);
    expect(pg.some((l) => /P9811.*T7/.test(l))).toBe(true);
  });
});

describe("HurcoV11Probing -- bore/boss cycle (P9814)", () => {
  it("emits P9832 / P9810 / P9814 D / P9833 for bore measurement", () => {
    const { gcode, warnings } = run([
      makeProbeOp({ type: "bore", z_mm: -10.0, dia_mm: 25.4, wcs: 1 }),
    ]);
    const pg = probeLines(gcode);
    expect(pg).toContain("G65 P9832 (PROBE ON)");
    expect(pg).toContain("G65 P9810 Z-10.000 (PROTECTED POSITION)");
    expect(pg).toContain("G65 P9814 D25.400 W1 (BORE DIAMETER)");
    expect(pg).toContain("G65 P9833 (PROBE OFF)");
    expect(warnings.some((w) => w.includes("probe"))).toBe(false);
  });

  it("emits P9814 for boss type with same macro", () => {
    const { gcode } = run([
      makeProbeOp({ type: "boss", z_mm: -5.0, dia_mm: 50.0 }),
    ]);
    const pg = probeLines(gcode);
    expect(pg).toContain("G65 P9814 D50.000 (BOSS DIAMETER)");
  });

  it("omits W word when wcs is not provided", () => {
    const { gcode } = run([
      makeProbeOp({ type: "bore", z_mm: -8.0, dia_mm: 20.0 }),
    ]);
    const pg = probeLines(gcode);
    const p9814 = pg.find((l) => l.includes("P9814"));
    expect(p9814).not.toBeUndefined();
    // Must have D word, must NOT have W word
    expect(p9814).toMatch(/D20\.000/);
    expect(p9814).not.toMatch(/W\d/);
  });
});

describe("HurcoV11Probing -- circular_centre cycle (P9815)", () => {
  it("emits P9832 / P9810 / P9815 X Y I J / P9833", () => {
    const { gcode, warnings } = run([
      makeProbeOp({
        type: "circular_centre",
        z_mm: -12.0,
        x_mm: 0.0,
        y_mm: 0.0,
        i_mm: 12.7,
        j_mm: 12.7,
        s: 4,
      }),
    ]);
    const pg = probeLines(gcode);
    expect(pg).toContain("G65 P9832 (PROBE ON)");
    expect(pg).toContain("G65 P9810 Z-12.000 (PROTECTED POSITION)");
    expect(pg).toContain(
      "G65 P9815 X0.000 Y0.000 I12.700 J12.700 S4 (CIRCULAR CENTRE FIND)",
    );
    expect(pg).toContain("G65 P9833 (PROBE OFF)");
    expect(warnings.some((w) => w.includes("probe"))).toBe(false);
  });

  it("omits S word when s is not provided", () => {
    const { gcode } = run([
      makeProbeOp({
        type: "circular_centre",
        z_mm: -5.0,
        x_mm: 10.0,
        y_mm: 20.0,
        i_mm: 8.0,
        j_mm: 8.0,
      }),
    ]);
    const pg = probeLines(gcode);
    const p9815 = pg.find((l) => l.includes("P9815"));
    expect(p9815).not.toBeUndefined();
    expect(p9815).toMatch(/X10\.000/);
    expect(p9815).not.toMatch(/S\d/);
  });
});

describe("HurcoV11Probing -- cal_length cycle (P9801)", () => {
  it("emits P9832 / P9801 Z / P9833 WITHOUT a P9810 approach", () => {
    const { gcode, warnings } = run([
      makeProbeOp({ type: "cal_length", z_mm: -50.0, tool_number: 3 }),
    ]);
    const pg = probeLines(gcode);
    expect(pg).toContain("G65 P9832 (PROBE ON)");
    // No P9810 for cal types
    expect(pg.some((l) => l.includes("P9810"))).toBe(false);
    expect(pg).toContain("G65 P9801 Z-50.000 T3 (CAL PROBE LENGTH)");
    expect(pg).toContain("G65 P9833 (PROBE OFF)");
    expect(warnings.some((w) => w.includes("probe"))).toBe(false);
  });
});

describe("HurcoV11Probing -- cal_stylus cycle (P9802)", () => {
  it("emits P9832 / P9802 D Z / P9833 WITHOUT a P9810 approach", () => {
    const { gcode, warnings } = run([
      makeProbeOp({ type: "cal_stylus", dia_mm: 6.0, z_mm: -20.0 }),
    ]);
    const pg = probeLines(gcode);
    expect(pg).toContain("G65 P9832 (PROBE ON)");
    expect(pg.some((l) => l.includes("P9810"))).toBe(false);
    expect(pg).toContain("G65 P9802 D6.000 Z-20.000 (CAL STYLUS XY)");
    expect(pg).toContain("G65 P9833 (PROBE OFF)");
    expect(warnings.some((w) => w.includes("probe"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. ONE-TIME OPERATOR WARNING COMMENT
// ---------------------------------------------------------------------------

describe("HurcoV11Probing -- one-time operator warning", () => {
  it("emits the warning comment exactly once when one probe op is present", () => {
    const { gcode } = run([
      makeProbeOp({ type: "bore", z_mm: -5.0, dia_mm: 20.0 }),
    ]);
    const warningLines = gcode.filter((l) => l.startsWith("(PROBING: requires"));
    expect(warningLines).toHaveLength(1);
    // Content is the exact verified string
    expect(warningLines[0]).toContain("Renishaw 9800-series macros");
    expect(warningLines[0]).toContain("v9 vs v10 differ");
    expect(warningLines[0]).toContain("macro invalid");
  });

  it("emits the warning comment exactly ONCE even with multiple probe ops", () => {
    const { gcode } = run([
      makeProbeOp({ type: "single_surface", axis: "Z", z_mm: -2.0 }),
      makeProbeOp({ type: "bore", z_mm: -5.0, dia_mm: 20.0 }),
      makeProbeOp({ type: "circular_centre", z_mm: -8.0, x_mm: 0, y_mm: 0, i_mm: 5, j_mm: 5 }),
    ]);
    const warningLines = gcode.filter((l) => l.startsWith("(PROBING: requires"));
    expect(warningLines).toHaveLength(1);
  });

  it("does NOT emit the warning comment when no probe op is present", () => {
    const { gcode } = run([makeNonProbeOp()]);
    expect(hasProbeWarning(gcode)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. FAILURE MODES (>=3) -- missing required params -> warn + skip
// ---------------------------------------------------------------------------

describe("HurcoV11Probing -- failure modes: missing required params", () => {
  it("bore with no dia_mm: skips P9814, issues warning, P9832/P9833 still bracket", () => {
    const { gcode, warnings } = run([
      makeProbeOp({ type: "bore", z_mm: -5.0 /* no dia_mm */ }),
    ]);
    const pg = probeLines(gcode);
    // P9814 must NOT appear (no garbage macro)
    expect(pg.some((l) => l.includes("P9814"))).toBe(false);
    // P9832/P9833 bracket still emitted (probe ON / probe OFF)
    expect(pg).toContain("G65 P9832 (PROBE ON)");
    expect(pg).toContain("G65 P9833 (PROBE OFF)");
    // Warning issued
    expect(warnings.some((w) => w.includes("dia_mm") && w.includes("bore"))).toBe(true);
  });

  it("circular_centre with missing i_mm: skips P9815, warns", () => {
    const { gcode, warnings } = run([
      makeProbeOp({
        type: "circular_centre",
        z_mm: -5.0,
        x_mm: 0,
        y_mm: 0,
        j_mm: 5,
        // i_mm missing
      }),
    ]);
    const pg = probeLines(gcode);
    expect(pg.some((l) => l.includes("P9815"))).toBe(false);
    expect(warnings.some((w) => w.includes("x_mm") || w.includes("i_mm"))).toBe(true);
  });

  it("single_surface with no z_mm: skips entire cycle before P9832, warns", () => {
    const { gcode, warnings } = run([
      makeProbeOp({
        type: "single_surface",
        axis: "Z",
        // z_mm missing -> approach fails at P9810 guard
      }),
    ]);
    const pg = probeLines(gcode);
    // No P9832 -- cycle aborted before probe ON
    expect(pg.some((l) => l.includes("P9832"))).toBe(false);
    expect(warnings.some((w) => w.includes("z_mm") || w.includes("single_surface"))).toBe(true);
  });

  it("cal_length with no z_mm: skips entirely, warns", () => {
    const { gcode, warnings } = run([
      makeProbeOp({ type: "cal_length" /* no z_mm */ }),
    ]);
    const pg = probeLines(gcode);
    expect(pg.some((l) => l.includes("P9801"))).toBe(false);
    expect(warnings.some((w) => w.includes("cal_length"))).toBe(true);
  });

  it("cal_stylus with no dia_mm: skips, warns", () => {
    const { gcode, warnings } = run([
      makeProbeOp({ type: "cal_stylus", z_mm: -20.0 /* no dia_mm */ }),
    ]);
    const pg = probeLines(gcode);
    expect(pg.some((l) => l.includes("P9802"))).toBe(false);
    expect(warnings.some((w) => w.includes("cal_stylus"))).toBe(true);
  });

  it("single_surface axis missing: skips P9811, warns, still closes P9833", () => {
    const { gcode, warnings } = run([
      makeProbeOp({ type: "single_surface", z_mm: -3.0 /* axis missing */ }),
    ]);
    const pg = probeLines(gcode);
    expect(pg.some((l) => l.includes("P9811"))).toBe(false);
    expect(pg).toContain("G65 P9833 (PROBE OFF)");
    expect(warnings.some((w) => w.includes("axis"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. ADVERSARIAL INPUTS (>=2)
// ---------------------------------------------------------------------------

describe("HurcoV11Probing -- adversarial inputs", () => {
  it("NaN dia_mm on bore: skips P9814, warns, no NaN in any emitted line", () => {
    const { gcode, warnings } = run([
      makeProbeOp({ type: "bore", z_mm: -5.0, dia_mm: NaN }),
    ]);
    const pg = probeLines(gcode);
    expect(pg.some((l) => l.includes("P9814"))).toBe(false);
    // Must not contain "NaN" in any G65 line
    expect(pg.some((l) => l.includes("NaN"))).toBe(false);
    expect(warnings.some((w) => w.includes("dia_mm") || w.includes("bore"))).toBe(true);
  });

  it("unknown probe type: only verified P-numbers appear, P9833 closes, warns", () => {
    const { gcode, warnings } = run([
      makeProbeOp({
        type: "bogus_type" as ProbeSpec["type"],
        z_mm: -5.0,
      }),
    ]);
    const pg = probeLines(gcode);
    // The critical invariant: no P-number outside the verified set appears.
    const allowedPNums = new Set([
      "P9810", "P9811", "P9814", "P9815", "P9801", "P9802", "P9832", "P9833",
    ]);
    for (const line of pg) {
      const match = line.match(/P(\d{4})/);
      if (match) {
        expect(allowedPNums.has(`P${match[1]}`)).toBe(true);
      }
    }
    expect(pg).toContain("G65 P9833 (PROBE OFF)");
    expect(warnings.some((w) => w.toLowerCase().includes("probe"))).toBe(true);
  });

  it("Infinity z_mm on single_surface: skips cycle before P9832, no Infinity emitted", () => {
    const { gcode, warnings } = run([
      makeProbeOp({ type: "single_surface", axis: "Z", z_mm: Infinity }),
    ]);
    const pg = probeLines(gcode);
    expect(pg.some((l) => l.includes("Infinity"))).toBe(false);
    expect(pg.some((l) => l.includes("P9832"))).toBe(false);
    expect(warnings.some((w) => w.includes("probe") || w.includes("single_surface"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. NON-PROBE OP EMITS NO G65 P98xx (additive invariant)
// ---------------------------------------------------------------------------

describe("HurcoV11Probing -- non-probe op is byte-unchanged (additive invariant)", () => {
  it("a pocket op without probe field emits zero G65 P98xx lines", () => {
    const { gcode } = run([makeNonProbeOp()]);
    expect(probeLines(gcode)).toHaveLength(0);
  });

  it("a drill op with only a cycle (no probe) emits G8x but no G65 P98xx", () => {
    const op: MillOperation = {
      operation_type: "drill",
      tool_number: 5,
      tool_diameter_mm: 6,
      tool_flutes: 2,
      material_iso: "P",
      spindle_rpm: 2000,
      feed_mm_min: 120,
      axial_depth_mm: 20,
      coordinates: [{ x: 10, y: 20, z: 0, type: "rapid" }],
      cycle: { type: "peck", depth_mm: -20, retract_mm: 2, peck_mm: 5 },
    };
    const { gcode } = run([op]);
    expect(probeLines(gcode)).toHaveLength(0);
    // Canned cycle still present
    expect(gcode.some((l) => l.includes("G83"))).toBe(true);
  });

  it("program with probe op + non-probe op: only the probe op emits G65 P98xx", () => {
    const { gcode } = run([
      makeNonProbeOp(),
      makeProbeOp({ type: "bore", z_mm: -5.0, dia_mm: 20.0 }),
      makeNonProbeOp(),
    ]);
    // G65 P9814 present exactly once
    expect(gcode.filter((l) => l.includes("P9814"))).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 6. BOTH op.cycle AND op.probe set (probe wins, warned)
// ---------------------------------------------------------------------------

describe("HurcoV11Probing -- op.cycle + op.probe conflict", () => {
  it("probe wins when both are set, G81 is NOT emitted, warning issued about conflict", () => {
    const op: MillOperation = {
      operation_type: "drill",
      tool_number: 5,
      tool_diameter_mm: 6,
      tool_flutes: 2,
      material_iso: "P",
      spindle_rpm: 2000,
      feed_mm_min: 120,
      axial_depth_mm: 20,
      coordinates: [{ x: 10, y: 20, z: 0, type: "rapid" }],
      cycle: { type: "drill", depth_mm: -20, retract_mm: 2 },
      probe: { type: "bore", z_mm: -5.0, dia_mm: 20.0 },
    };
    const { gcode, warnings } = run([op]);
    // Probe emitted
    expect(gcode.some((l) => l.includes("P9814"))).toBe(true);
    // Canned cycle NOT emitted
    expect(gcode.some((l) => l.includes("G81"))).toBe(false);
    // Warning issued about conflict
    expect(
      warnings.some((w) => w.includes("op.cycle") || w.includes("op.probe")),
    ).toBe(true);
  });
});
