/**
 * HurcoV11MillMasterPostEngine -- canned cycle tests
 * (POST-PROCESSOR/U-PP-HURCO-CYCLE, slot:echo)
 *
 * Verifies the additive op.cycle field on MillOperation:
 *   - drill op WITH cycle:{type:"drill",...} -> G81 line + G80 cancel
 *   - peck  -> G83 + Q peck word
 *   - ADDITIVE invariant: drill op WITHOUT cycle emits the SAME move-list as before (no G8x)
 *   - 4-hole pattern -> modal X Y for holes 2-4, only one G81 line
 *   - dwell -> G82 + P word
 *   - chip_break -> G73 + Q word
 *   - tap -> G84 (bare, no M29)
 *   - bore -> G85
 *   - retract_mode:"initial" -> G98 (default is G99)
 *   - missing peck_mm -> downgrade to G81 + warning
 *   - missing dwell_s -> downgrade to G81 + warning
 *   - 0 holes -> emit nothing (no G8x), warn
 *   - non-finite depth_mm -> fall back to long-hand move list, warn
 *
 * All G-code string assertions use real reference values (exact strings), never toBeDefined stubs.
 * Round-trip: exercises generateProgram() (not the engine singleton in isolation) per R15.
 *
 * Dialect source: Hurco WinMax ISNC mode is Fanuc-family -- G81/G82/G83/G73/G84/G85 are the
 * universal ISO/Fanuc canned-cycle codes. Mirrored from HaasNGCMillMasterPostEngine.CYCLE_GCODE;
 * NOT re-derived from a manual.
 */

import { describe, it, expect } from "vitest";
import {
  hurcoV11MillMasterPostEngine,
  type MillOperation,
  type HurcoDrillCycle,
} from "../engines/HurcoV11MillMasterPostEngine.js";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Build a minimal drill MillOperation with the given coordinates and optional cycle. */
function makeDrillOp(
  holes: Array<{ x: number; y: number; z: number }>,
  cycle?: HurcoDrillCycle,
  overrides: Partial<MillOperation> = {},
): MillOperation {
  return {
    operation_type: "drill",
    tool_number: 5,
    tool_diameter_mm: 6,
    tool_flutes: 2,
    tool_description: "6MM DRILL",
    material_iso: "P",
    spindle_rpm: 2000,
    feed_mm_min: 120,
    axial_depth_mm: 20,
    coordinates: holes.map((h, idx) => ({
      x: h.x,
      y: h.y,
      z: h.z,
      type: idx === 0 ? ("rapid" as const) : ("linear" as const),
    })),
    cycle,
    ...overrides,
  };
}

/** Extract all G-code lines from a generateProgram result (flattens to array). */
function gcodeLines(op: MillOperation): string[] {
  return hurcoV11MillMasterPostEngine.generateProgram([op], {
    emit_setup_sheet: false,
    use_ultimotion: false,
  }).gcode;
}

const HOLES_1 = [{ x: 10, y: 20, z: 0 }];
const HOLES_4 = [
  { x: 10, y: 20, z: 0 },
  { x: 30, y: 20, z: 0 },
  { x: 50, y: 20, z: 0 },
  { x: 70, y: 20, z: 0 },
];

// ---------------------------------------------------------------------------
// Core test suite
// ---------------------------------------------------------------------------

describe("HurcoV11 -- canned cycles (U-PP-HURCO-CYCLE)", () => {
  // ── (a) G81 simple drill ──────────────────────────────────────────────────
  it("(a) drill op WITH cycle:{type:'drill'} emits G99 G81 line + G80 cancel, no G0x moves inside cycle", () => {
    const op = makeDrillOp(HOLES_1, {
      type: "drill",
      depth_mm: -12,
      retract_mm: 2,
    });
    const lines = gcodeLines(op);

    // Exact cycle definition line (G99 default retract, bare -- no XY on the cycle line)
    expect(lines).toContain("G99 G81 Z-12.000 R2.000 F120");
    // G80 cycle cancel
    expect(lines).toContain("G80");
    // No G01 linear inside the cycle region (we want the canned cycle, not long-hand)
    const g01Lines = lines.filter((l) => /^G01/.test(l));
    expect(g01Lines.length).toBe(0);
  });

  // ── (b) G83 peck drill + Q word ──────────────────────────────────────────
  it("(b) peck cycle emits G83 with Q peck word and G80 cancel", () => {
    const op = makeDrillOp(HOLES_1, {
      type: "peck",
      depth_mm: -15,
      retract_mm: 2,
      peck_mm: 3,
    });
    const lines = gcodeLines(op);

    // Reference value: exact G-code string (Q must be 3 decimal places like the rest of the emitter)
    expect(lines).toContain("G99 G83 Z-15.000 R2.000 Q3.000 F120");
    expect(lines).toContain("G80");
  });

  // ── (c) ADDITIVE invariant: no cycle -> byte-identical move list (no G8x) ─
  it("(c) drill op WITHOUT cycle emits the same G01 move-list as before (no G81/G83/G80)", () => {
    // Identical op shape, but no cycle field
    const opWithout = makeDrillOp([
      { x: 10, y: 20, z: 0 },
      { x: 10, y: 20, z: -12 },
    ]);
    const lines = gcodeLines(opWithout);

    // Must NOT contain any canned-cycle G-code
    const cycleLines = lines.filter((l) => /^G8[0-9]/.test(l));
    expect(cycleLines.length).toBe(0);
    // Must contain the literal linear plunge move
    const g01 = lines.filter((l) => /^G01/.test(l));
    expect(g01.length).toBeGreaterThan(0);
    // Check the exact linear plunge line (additive invariant)
    expect(lines.some((l) => /^G01 X10\.000 Y20\.000 Z-12\.000/.test(l))).toBe(true);
  });

  // ── (d) 4-hole pattern -> modal X/Y for holes 2-4 ────────────────────────
  it("(d) 4-hole pattern: one G81 line + 3 modal X Y lines + G80", () => {
    const op = makeDrillOp(HOLES_4, {
      type: "drill",
      depth_mm: -10,
      retract_mm: 2,
    });
    const lines = gcodeLines(op);

    // Exactly one cycle definition line
    const g81Lines = lines.filter((l) => /^G99 G81/.test(l));
    expect(g81Lines.length).toBe(1);
    expect(g81Lines[0]).toBe("G99 G81 Z-10.000 R2.000 F120");

    // Modal X Y for holes 2, 3, 4 (exact reference values)
    expect(lines).toContain("X30.000 Y20.000");
    expect(lines).toContain("X50.000 Y20.000");
    expect(lines).toContain("X70.000 Y20.000");

    // G80 cancel appears exactly once
    const g80Lines = lines.filter((l) => l === "G80");
    expect(g80Lines.length).toBe(1);
  });

  // ── dwell -> G82 + P word ─────────────────────────────────────────────────
  it("dwell cycle emits G82 with P dwell word (2 decimal places)", () => {
    const op = makeDrillOp(HOLES_1, {
      type: "dwell",
      depth_mm: -8,
      retract_mm: 2,
      dwell_s: 1.5,
    });
    const lines = gcodeLines(op);

    expect(lines).toContain("G99 G82 Z-8.000 R2.000 P1.50 F120");
    expect(lines).toContain("G80");
  });

  // ── chip_break -> G73 + Q word ────────────────────────────────────────────
  it("chip_break cycle emits G73 with Q peck word", () => {
    const op = makeDrillOp(HOLES_1, {
      type: "chip_break",
      depth_mm: -20,
      retract_mm: 2,
      peck_mm: 4,
    });
    const lines = gcodeLines(op);

    expect(lines).toContain("G99 G73 Z-20.000 R2.000 Q4.000 F120");
    expect(lines).toContain("G80");
  });

  // ── tap -> G84 bare (NO M29) ──────────────────────────────────────────────
  it("tap cycle emits G84 bare (no M29 -- Hurco WinMax is always rigid-tap, M29 would hang)", () => {
    const op = makeDrillOp(HOLES_1, {
      type: "tap",
      depth_mm: -10,
      retract_mm: 2,
    });
    const lines = gcodeLines(op);

    expect(lines).toContain("G99 G84 Z-10.000 R2.000 F120");
    expect(lines).toContain("G80");
    // Anti-regression: M29 must NOT be emitted (would hang the Hurco WinMax control)
    expect(lines.some((l) => /M29/.test(l))).toBe(false);
  });

  // ── bore -> G85 ───────────────────────────────────────────────────────────
  it("bore cycle emits G85", () => {
    const op = makeDrillOp(HOLES_1, {
      type: "bore",
      depth_mm: -25,
      retract_mm: 3,
    });
    const lines = gcodeLines(op);

    expect(lines).toContain("G99 G85 Z-25.000 R3.000 F120");
    expect(lines).toContain("G80");
  });

  // ── bore op_type with cycle ───────────────────────────────────────────────
  it("bore operation_type also triggers canned cycle branch", () => {
    const op: MillOperation = {
      ...makeDrillOp(HOLES_1, { type: "drill", depth_mm: -18, retract_mm: 2 }),
      operation_type: "bore",
    };
    const lines = gcodeLines(op);
    expect(lines).toContain("G99 G81 Z-18.000 R2.000 F120");
    expect(lines).toContain("G80");
  });

  // ── retract_mode:"initial" -> G98 ────────────────────────────────────────
  it("retract_mode:'initial' emits G98 instead of the default G99", () => {
    const op = makeDrillOp(HOLES_1, {
      type: "drill",
      depth_mm: -12,
      retract_mm: 2,
      retract_mode: "initial",
    });
    const lines = gcodeLines(op);

    expect(lines).toContain("G98 G81 Z-12.000 R2.000 F120");
    expect(lines.some((l) => /^G99 G81/.test(l))).toBe(false);
  });

  // ── failure mode: missing peck_mm -> downgrade to G81 + warning ──────────
  it("peck cycle with missing peck_mm downgrades to G81 + emits a warning", () => {
    const op = makeDrillOp(HOLES_1, {
      type: "peck",
      depth_mm: -15,
      retract_mm: 2,
      // peck_mm intentionally absent
    });
    const result = hurcoV11MillMasterPostEngine.generateProgram([op], {
      emit_setup_sheet: false,
      use_ultimotion: false,
    });

    // Downgraded to G81 (no Q on the cycle line)
    expect(result.gcode).toContain("G99 G81 Z-15.000 R2.000 F120");
    expect(result.gcode.some((l) => /Q/.test(l) && /G8/.test(l))).toBe(false);
    // Warning emitted
    expect(result.warnings.some((w) => /downgraded to G81/.test(w))).toBe(true);
  });

  // ── failure mode: missing dwell_s -> downgrade to G81 + warning ──────────
  it("dwell cycle with missing dwell_s downgrades to G81 + emits a warning", () => {
    const op = makeDrillOp(HOLES_1, {
      type: "dwell",
      depth_mm: -8,
      retract_mm: 2,
      // dwell_s intentionally absent
    });
    const result = hurcoV11MillMasterPostEngine.generateProgram([op], {
      emit_setup_sheet: false,
      use_ultimotion: false,
    });

    expect(result.gcode).toContain("G99 G81 Z-8.000 R2.000 F120");
    expect(result.warnings.some((w) => /downgraded to G81/.test(w))).toBe(true);
  });

  // ── failure mode: 0 valid holes -> warn, emit nothing ────────────────────
  it("canned cycle with 0 valid holes emits no G8x lines and warns", () => {
    const op = makeDrillOp([], { type: "drill", depth_mm: -10, retract_mm: 2 });
    const result = hurcoV11MillMasterPostEngine.generateProgram([op], {
      emit_setup_sheet: false,
      use_ultimotion: false,
    });

    const cycleLines = result.gcode.filter((l) => /^G8[0-9]/.test(l));
    expect(cycleLines.length).toBe(0);
    expect(result.warnings.some((w) => /no valid hole XY/.test(w))).toBe(true);
  });

  // ── failure mode: non-finite depth_mm -> fall back to long-hand list, warn ─
  it("non-finite depth_mm falls back to the long-hand move list and warns", () => {
    const op = makeDrillOp(
      [
        { x: 10, y: 20, z: 0 },
        { x: 10, y: 20, z: -12 },
      ],
      { type: "drill", depth_mm: NaN, retract_mm: 2 },
    );
    const result = hurcoV11MillMasterPostEngine.generateProgram([op], {
      emit_setup_sheet: false,
      use_ultimotion: false,
    });

    // No canned cycle G-codes (fell back to long-hand)
    expect(result.gcode.some((l) => /^G81|^G83|^G80/.test(l))).toBe(false);
    // At least one G01 or G00 move (long-hand fallback)
    expect(result.gcode.some((l) => /^G0[01]/.test(l))).toBe(true);
    expect(result.warnings.some((w) => /non-finite depth_mm/.test(w))).toBe(true);
  });

  // ── non-drill op_type with cycle -> cycle is IGNORED (additive guard) ────
  it("cycle on a pocket op (not drill/bore) is ignored -- move-list emitted as before", () => {
    const op: MillOperation = {
      operation_type: "pocket",
      tool_number: 1,
      tool_diameter_mm: 12,
      tool_flutes: 4,
      material_iso: "P",
      spindle_rpm: 3000,
      feed_mm_min: 600,
      axial_depth_mm: 3,
      coordinates: [
        { x: 0, y: 0, z: 5, type: "rapid" },
        { x: 25, y: 25, z: -3, type: "linear" },
      ],
      // cycle is set but op is pocket -- should be ignored
      cycle: { type: "drill", depth_mm: -10, retract_mm: 2 },
    };
    const lines = gcodeLines(op);

    // No canned cycle G-codes
    expect(lines.some((l) => /^G8[01]/.test(l))).toBe(false);
    // Long-hand move emitted
    expect(lines.some((l) => /^G01 X25\.000 Y25\.000/.test(l))).toBe(true);
  });

  // ── inverted geometry warning (depth >= retract) ─────────────────────────
  it("depth_mm >= retract_mm (inverted geometry) emits a warning but still generates G81", () => {
    const op = makeDrillOp(HOLES_1, {
      type: "drill",
      depth_mm: 5,   // positive = above part top (inverted)
      retract_mm: 2,
    });
    const result = hurcoV11MillMasterPostEngine.generateProgram([op], {
      emit_setup_sheet: false,
      use_ultimotion: false,
    });

    expect(result.gcode).toContain("G99 G81 Z5.000 R2.000 F120");
    expect(result.warnings.some((w) => /inverted.*no-cut/.test(w))).toBe(true);
  });

  // ── no G8x emitted for face/contour/slot/3d_surface/adaptive (additive) ──
  it.each(["face", "contour", "slot", "3d_surface", "adaptive"] as const)(
    "cycle on %s op_type is ignored (only drill/bore trigger canned cycles)",
    (opType) => {
      const op: MillOperation = {
        operation_type: opType,
        tool_number: 1,
        tool_diameter_mm: 12,
        tool_flutes: 4,
        material_iso: "N",
        spindle_rpm: 5000,
        feed_mm_min: 800,
        axial_depth_mm: 2,
        coordinates: [
          { x: 0, y: 0, z: 5, type: "rapid" },
          { x: 10, y: 10, z: -2, type: "linear" },
        ],
        cycle: { type: "drill", depth_mm: -10, retract_mm: 2 },
      };
      const lines = gcodeLines(op);
      const cycleLines = lines.filter((l) => /^G8[0-9]/.test(l));
      expect(cycleLines.length).toBe(0);
    },
  );
});

// ---------------------------------------------------------------------------
// Five new boring canned cycles -- G76/G86/G87/G88/G89
// Verified vs Hurco WinMax Mill NC documentation (support.hurco.com
// WinMax Mill NC Canned Cycles + G Code Table) 2026-06-29.
//
// DIALECT NOTE tested here: G86/G87/G88 carry ISNC-only meanings.
// In BNC dialect G88 = RIGID TAPPING -- a crash if emitted in BNC mode.
// This engine is ISNC-only; that gate lives in the engine, not the tests.
// ---------------------------------------------------------------------------

describe("HurcoV11 -- boring canned cycles G76/G86/G87/G88/G89 (U-PP-HURCO-BORE-CYCLE)", () => {

  // ── G76 fine_bore: happy path with Q and P ────────────────────────────────
  it("fine_bore emits G76 with Q shift and optional P dwell, then G80", () => {
    const op = makeDrillOp(HOLES_1, {
      type: "fine_bore",
      depth_mm: -30,
      retract_mm: 2,
      shift_mm: 0.15,
      dwell_s: 0.5,
    });
    const lines = gcodeLines(op);
    // Exact reference: Z R Q(shift 3dp) P(dwell 2dp) F
    expect(lines).toContain("G99 G76 Z-30.000 R2.000 Q0.150 P0.50 F120");
    expect(lines).toContain("G80");
  });

  it("fine_bore with shift_mm but no dwell emits G76 with Q only (P is optional)", () => {
    const op = makeDrillOp(HOLES_1, {
      type: "fine_bore",
      depth_mm: -20,
      retract_mm: 3,
      shift_mm: 0.1,
      // dwell_s absent
    });
    const lines = gcodeLines(op);
    expect(lines).toContain("G99 G76 Z-20.000 R3.000 Q0.100 F120");
    expect(lines).toContain("G80");
    // Must NOT have a P word on the cycle line
    expect(lines.some((l) => /^G99 G76.*P/.test(l))).toBe(false);
  });

  it("fine_bore falls back to peck_mm for Q when shift_mm absent but peck_mm provided", () => {
    const op = makeDrillOp(HOLES_1, {
      type: "fine_bore",
      depth_mm: -18,
      retract_mm: 2,
      peck_mm: 0.2,   // used as shift fallback
    });
    const lines = gcodeLines(op);
    expect(lines).toContain("G99 G76 Z-18.000 R2.000 Q0.200 F120");
    expect(lines).toContain("G80");
  });

  it("fine_bore missing shift_mm AND peck_mm downgrades to G85 + warns (not G81)", () => {
    const op = makeDrillOp(HOLES_1, {
      type: "fine_bore",
      depth_mm: -25,
      retract_mm: 2,
      // neither shift_mm nor peck_mm
    });
    const result = hurcoV11MillMasterPostEngine.generateProgram([op], {
      emit_setup_sheet: false,
      use_ultimotion: false,
    });
    // Downgraded to G85 (boring op, NOT G81 drill)
    expect(result.gcode).toContain("G99 G85 Z-25.000 R2.000 F120");
    // Must NOT emit G76
    expect(result.gcode.some((l) => /G76/.test(l))).toBe(false);
    expect(result.warnings.some((w) => /fine_bore.*downgraded to G85/.test(w))).toBe(true);
  });

  // ── G86 bore_stop: happy path -- no Q, no P ───────────────────────────────
  it("bore_stop emits G86 with Z R F only (no Q, no P -- spindle stops at depth)", () => {
    const op = makeDrillOp(HOLES_1, {
      type: "bore_stop",
      depth_mm: -40,
      retract_mm: 2,
    });
    const lines = gcodeLines(op);
    // Exact reference: no Q, no P
    expect(lines).toContain("G99 G86 Z-40.000 R2.000 F120");
    expect(lines).toContain("G80");
    // Anti-regression: no Q or P words on the G86 line
    expect(lines.some((l) => /^G99 G86.*[QP]/.test(l))).toBe(false);
  });

  it("bore_stop with G98 retract emits G98 G86", () => {
    const op = makeDrillOp(HOLES_1, {
      type: "bore_stop",
      depth_mm: -35,
      retract_mm: 5,
      retract_mode: "initial",
    });
    const lines = gcodeLines(op);
    expect(lines).toContain("G98 G86 Z-35.000 R5.000 F120");
    expect(lines).toContain("G80");
  });

  // ── G87 back_bore: Q required, P optional ────────────────────────────────
  it("back_bore emits G87 with Q shift and optional P dwell, then G80", () => {
    const op = makeDrillOp(HOLES_1, {
      type: "back_bore",
      depth_mm: -10,
      retract_mm: 2,
      shift_mm: 0.25,
      dwell_s: 1.0,
    });
    const lines = gcodeLines(op);
    // Exact reference: Z R Q P F
    expect(lines).toContain("G99 G87 Z-10.000 R2.000 Q0.250 P1.00 F120");
    expect(lines).toContain("G80");
  });

  it("back_bore missing shift_mm AND peck_mm downgrades to G85 + warns", () => {
    const op = makeDrillOp(HOLES_1, {
      type: "back_bore",
      depth_mm: -12,
      retract_mm: 2,
      dwell_s: 0.5,
      // no shift_mm, no peck_mm
    });
    const result = hurcoV11MillMasterPostEngine.generateProgram([op], {
      emit_setup_sheet: false,
      use_ultimotion: false,
    });
    expect(result.gcode).toContain("G99 G85 Z-12.000 R2.000 F120");
    expect(result.gcode.some((l) => /G87/.test(l))).toBe(false);
    expect(result.warnings.some((w) => /back_bore.*downgraded to G85/.test(w))).toBe(true);
  });

  // ── G88 bore_manual: P required ───────────────────────────────────────────
  it("bore_manual emits G88 with P dwell (no Q), then G80", () => {
    const op = makeDrillOp(HOLES_1, {
      type: "bore_manual",
      depth_mm: -50,
      retract_mm: 3,
      dwell_s: 2.0,
    });
    const lines = gcodeLines(op);
    // Exact reference: Z R P F (no Q)
    expect(lines).toContain("G99 G88 Z-50.000 R3.000 P2.00 F120");
    expect(lines).toContain("G80");
    // Anti-regression: no Q word on G88 line
    expect(lines.some((l) => /^G99 G88.*Q/.test(l))).toBe(false);
  });

  it("bore_manual missing dwell_s downgrades to G85 + warns (not G81)", () => {
    const op = makeDrillOp(HOLES_1, {
      type: "bore_manual",
      depth_mm: -45,
      retract_mm: 3,
      // dwell_s absent
    });
    const result = hurcoV11MillMasterPostEngine.generateProgram([op], {
      emit_setup_sheet: false,
      use_ultimotion: false,
    });
    expect(result.gcode).toContain("G99 G85 Z-45.000 R3.000 F120");
    expect(result.gcode.some((l) => /G88/.test(l))).toBe(false);
    expect(result.warnings.some((w) => /bore_manual.*downgraded to G85/.test(w))).toBe(true);
  });

  // ── G89 bore_dwell: P required ────────────────────────────────────────────
  it("bore_dwell emits G89 with P dwell (no Q), then G80", () => {
    const op = makeDrillOp(HOLES_1, {
      type: "bore_dwell",
      depth_mm: -22,
      retract_mm: 2,
      dwell_s: 0.75,
    });
    const lines = gcodeLines(op);
    // Exact reference: Z R P F (no Q)
    expect(lines).toContain("G99 G89 Z-22.000 R2.000 P0.75 F120");
    expect(lines).toContain("G80");
    // Anti-regression: no Q word on G89 line
    expect(lines.some((l) => /^G99 G89.*Q/.test(l))).toBe(false);
  });

  it("bore_dwell missing dwell_s downgrades to G85 + warns (not G81)", () => {
    const op = makeDrillOp(HOLES_1, {
      type: "bore_dwell",
      depth_mm: -22,
      retract_mm: 2,
      // dwell_s absent
    });
    const result = hurcoV11MillMasterPostEngine.generateProgram([op], {
      emit_setup_sheet: false,
      use_ultimotion: false,
    });
    expect(result.gcode).toContain("G99 G85 Z-22.000 R2.000 F120");
    expect(result.gcode.some((l) => /G89/.test(l))).toBe(false);
    expect(result.warnings.some((w) => /bore_dwell.*downgraded to G85/.test(w))).toBe(true);
  });

  // ── adversarial: all 5 new cycles survive non-finite depth_mm ────────────
  it.each(["fine_bore", "bore_stop", "back_bore", "bore_manual", "bore_dwell"] as const)(
    "non-finite depth_mm on %s falls back to long-hand move list (no G7x/G8x), warns",
    (cycleType) => {
      const op = makeDrillOp(
        [{ x: 5, y: 5, z: 0 }, { x: 5, y: 5, z: -10 }],
        {
          type: cycleType,
          depth_mm: NaN,
          retract_mm: 2,
          shift_mm: 0.1,
          dwell_s: 0.5,
        },
      );
      const result = hurcoV11MillMasterPostEngine.generateProgram([op], {
        emit_setup_sheet: false,
        use_ultimotion: false,
      });
      // No canned-cycle codes
      expect(result.gcode.some((l) => /^G7[0-9]|^G8[0-9]/.test(l))).toBe(false);
      // Long-hand fallback present
      expect(result.gcode.some((l) => /^G0[01]/.test(l))).toBe(true);
      expect(result.warnings.some((w) => /non-finite depth_mm/.test(w))).toBe(true);
    },
  );

  // ── adversarial: zero/negative shift_mm treated as absent -> downgrade ────
  it("fine_bore with shift_mm=0 downgrades to G85 (zero shift is not a valid orient)", () => {
    const op = makeDrillOp(HOLES_1, {
      type: "fine_bore",
      depth_mm: -30,
      retract_mm: 2,
      shift_mm: 0,   // zero -- not a valid orient shift
    });
    const result = hurcoV11MillMasterPostEngine.generateProgram([op], {
      emit_setup_sheet: false,
      use_ultimotion: false,
    });
    expect(result.gcode).toContain("G99 G85 Z-30.000 R2.000 F120");
    expect(result.warnings.some((w) => /fine_bore.*downgraded to G85/.test(w))).toBe(true);
  });

  it("back_bore with negative shift_mm downgrades to G85 (negative shift invalid)", () => {
    const op = makeDrillOp(HOLES_1, {
      type: "back_bore",
      depth_mm: -10,
      retract_mm: 2,
      shift_mm: -0.5,  // negative -- invalid orient distance
      dwell_s: 0.5,
    });
    const result = hurcoV11MillMasterPostEngine.generateProgram([op], {
      emit_setup_sheet: false,
      use_ultimotion: false,
    });
    expect(result.gcode).toContain("G99 G85 Z-10.000 R2.000 F120");
    expect(result.warnings.some((w) => /back_bore.*downgraded to G85/.test(w))).toBe(true);
  });

  // ── 4-hole pattern with bore_dwell: one G89 line + modal XY + G80 ─────────
  it("bore_dwell 4-hole pattern: one G89 + 3 modal XY lines + G80", () => {
    const op = makeDrillOp(HOLES_4, {
      type: "bore_dwell",
      depth_mm: -28,
      retract_mm: 4,
      dwell_s: 1.25,
    });
    const lines = gcodeLines(op);
    const g89Lines = lines.filter((l) => /^G99 G89/.test(l));
    expect(g89Lines.length).toBe(1);
    expect(g89Lines[0]).toBe("G99 G89 Z-28.000 R4.000 P1.25 F120");
    // Modal XY for holes 2-4
    expect(lines).toContain("X30.000 Y20.000");
    expect(lines).toContain("X50.000 Y20.000");
    expect(lines).toContain("X70.000 Y20.000");
    const g80Lines = lines.filter((l) => l === "G80");
    expect(g80Lines.length).toBe(1);
  });
});
