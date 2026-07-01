/**
 * HurcoWinMaxLatheMasterPostEngine -- real reference-value coverage.
 * (U-PP-HURCO-WINMAX-LATHE-GENERATOR, slot:echo 2026-06-27)
 *
 * Asserts the engine emits a real Hurco WinMax ISNC (Fanuc-dialect) lathe program for the exact
 * turning op-shapes the post-training corpus latheJobs feed -- happy + >=3 failure + >=2 adversarial.
 * Reference values are the dialect-correct G-codes (G71 longitudinal roughing -- NOT Okuma G72 --,
 * G50 RPM clamp, G96 CSS, G76 two-line threading, G75 grooving), so a regression to a wrong cycle
 * or a silent non-finite emit fails a specific assertion.
 */
import { describe, it, expect } from "vitest";
import { hurcoWinMaxLatheMasterPostEngine } from "../engines/HurcoWinMaxLatheMasterPostEngine.js";
import type { TurningOperation } from "../engines/OkumaB250LatheMasterPostEngine.js";

/** Build a valid OD-rough op; override any field per-test. */
function op(overrides: Partial<TurningOperation> = {}): TurningOperation {
  return {
    operation_type: "od_rough",
    tool_number: 1,
    tool_orientation: 3,
    insert_radius_mm: 0.8,
    material_iso: "P",
    css_m_min: 220,
    css_max_rpm: 3500,
    feed_mm_rev: 0.25,
    depth_of_cut_mm: 2,
    start_x: 50,
    start_z: 0,
    end_x: 40,
    end_z: -60,
    coolant: "flood",
    ...overrides,
  } as TurningOperation;
}

const text = (lines: string[]) => lines.join("\n");

describe("HurcoWinMaxLatheMasterPostEngine -- ISNC turning emission", () => {
  it("HAPPY: face+od_rough+od_finish -> real ISNC program (header, G50 clamp, G71 NOT G72, G96 CSS, M30, %)", () => {
    const ops: TurningOperation[] = [
      op({ operation_type: "face", tool_number: 1, css_m_min: 200, feed_mm_rev: 0.15, depth_of_cut_mm: 0.5, start_x: 52, start_z: 0.5, end_x: -1, end_z: 0.5 }),
      op({ operation_type: "od_rough", tool_number: 1 }),
      op({ operation_type: "od_finish", tool_number: 2, css_m_min: 280, feed_mm_rev: 0.1, depth_of_cut_mm: 0.3, start_x: 40 }),
    ];
    const r = hurcoWinMaxLatheMasterPostEngine.generateProgram(ops, { program_number: 2001, css_max_rpm: 3500 });
    const t = text(r.gcode);

    expect(r.skipped_operations).toBe(0);
    expect(r.dialect).toBe("fanuc");
    expect(r.tools_used).toEqual([1, 2]);
    expect(r.gcode[0]).toMatch(/^O2001 /);
    expect(t).toContain("(MODE: ISNC / FANUC-DIALECT TURNING)");
    expect(t).toContain("G50 S3500 (MAX SPINDLE CLAMP)");      // RPM clamp present
    expect(t).toContain("G96 S220 M03");                        // CSS spindle-on for roughing
    expect(t).toContain("G71 U2.000 R1.0");                     // Fanuc/ISNC longitudinal roughing
    expect(t).not.toMatch(/\bG72\b/);                           // NOT the Okuma facing cycle
    expect(t).toContain("G42 (TOOL NOSE COMP RIGHT)");          // OD nose comp right
    expect(t).toContain("M30 (PROGRAM END)");
    expect(r.gcode[r.gcode.length - 1]).toBe("%");              // ISNC end marker
  });

  it("HAPPY: thread op -> G97 threading RPM + two-line G76 with computed minor diameter", () => {
    const ops = [op({ operation_type: "thread", tool_number: 4, spindle_rpm: 800, feed_mm_rev: 1.5, start_x: 40, end_z: -25, thread_pitch_mm: 1.5, thread_depth_mm: 0.92 } as Partial<TurningOperation>)];
    const r = hurcoWinMaxLatheMasterPostEngine.generateProgram(ops, { program_number: 2002 });
    const t = text(r.gcode);
    expect(t).toContain("G97 S800 M03 (THREADING RPM)");        // threading is fixed RPM, not CSS
    expect(t).toMatch(/G76 P\d{6} Q\d+ R0\.05/);                // G76 line 1 (combined P word)
    // minor dia = start_x - 2*depth = 40 - 1.84 = 38.160; lead F = pitch
    expect(t).toContain("G76 X38.160 Z-25.000 P920 Q100 F1.5");
  });

  it("HAPPY: single-position groove -> G75 X-peck WITHOUT a Z-stepover Q (no malformed cycle)", () => {
    // start_z == end_z (-20): one tool-width plunge groove. Q (Z-step) must be OMITTED.
    const groove = hurcoWinMaxLatheMasterPostEngine.generateProgram(
      [op({ operation_type: "groove", tool_number: 5, css_m_min: 150, feed_mm_rev: 0.1, start_x: 40, start_z: -20, end_x: 30, end_z: -20, groove_width_mm: 3 } as Partial<TurningOperation>)]);
    const g = text(groove.gcode);
    expect(g).toMatch(/G75 X30\.000 Z-20\.000 P2000 F0\.1/);
    expect(g).not.toMatch(/\bQ\d/);                              // no Z-stepover word for a single position
  });

  it("HAPPY: multi-Z groove (start_z != end_z) -> Q Z-stepover IS emitted", () => {
    const groove = hurcoWinMaxLatheMasterPostEngine.generateProgram(
      [op({ operation_type: "groove", tool_number: 5, css_m_min: 150, feed_mm_rev: 0.1, start_x: 40, start_z: -20, end_x: 30, end_z: -28, groove_width_mm: 3 } as Partial<TurningOperation>)]);
    expect(text(groove.gcode)).toMatch(/G75 X30\.000 Z-28\.000 P2000 Q3000 F0\.1/);   // wide groove: Q present
  });

  it("HAPPY: large-bar part_off -> G75 X-peck cutoff, NEVER a malformed Q0", () => {
    const partoff = hurcoWinMaxLatheMasterPostEngine.generateProgram(
      [op({ operation_type: "part_off", tool_number: 6, css_m_min: 120, feed_mm_rev: 0.08, start_x: 52, start_z: -65 })]);
    const t = text(partoff.gcode);
    expect(t).toContain("M08 (FLOOD COOLANT MANDATORY)");
    expect(t).toMatch(/G75 X0 Z-65\.000 P3000 F0\.0400/);        // X-pecking cutoff, no Z-stepover
    expect(t).not.toMatch(/\bQ0\b/);                             // the malformed zero-shift is gone
  });

  it("FAILURE: non-finite start_x (NaN) in od_rough -> op dropped, ERROR block, no XNaN emitted", () => {
    const r = hurcoWinMaxLatheMasterPostEngine.generateProgram([op({ start_x: NaN })]);
    const t = text(r.gcode);
    expect(r.skipped_operations).toBe(1);
    expect(t).toMatch(/ERROR: OPERATION 1 SKIPPED -- INVALID FIELD start_x/);
    expect(r.warnings.some((w) => /invalid \(non-finite\/non-positive\) start_x/.test(w))).toBe(true);
    expect(t).not.toMatch(/XNaN|X NaN/);                        // never emit the literal bad block
  });

  it("FAILURE: +Infinity feed in a face op -> dropped with warning", () => {
    const r = hurcoWinMaxLatheMasterPostEngine.generateProgram([op({ operation_type: "face", feed_mm_rev: Infinity, end_x: -1 })]);
    expect(r.skipped_operations).toBe(1);
    expect(text(r.gcode)).toMatch(/INVALID FIELD feed_mm_rev/);
    expect(text(r.gcode)).not.toMatch(/FInfinity|F Infinity/);
  });

  it("FAILURE: NEGATIVE feed_mm_rev (finite but invalid magnitude) -> op dropped, never an F-0.1 block", () => {
    // a negative feed is FINITE, so it slips past the non-finite check -- the .positive() mirror catches it.
    const r = hurcoWinMaxLatheMasterPostEngine.generateProgram([op({ operation_type: "od_rough", feed_mm_rev: -0.25 })]);
    const t = text(r.gcode);
    expect(r.skipped_operations).toBe(1);
    expect(t).toMatch(/INVALID FIELD feed_mm_rev \(NON-FINITE OR NON-POSITIVE\)/);
    expect(r.warnings.some((w) => /invalid \(non-finite\/non-positive\) feed_mm_rev/.test(w))).toBe(true);
    expect(t).not.toMatch(/F-0\.|F -0/);                        // the negative-lead block is never emitted
  });

  it("FAILURE: zero depth_of_cut_mm (finite but invalid magnitude) -> op dropped, no U0.000 roughing", () => {
    const r = hurcoWinMaxLatheMasterPostEngine.generateProgram([op({ operation_type: "od_rough", depth_of_cut_mm: 0 })]);
    expect(r.skipped_operations).toBe(1);
    expect(text(r.gcode)).toMatch(/INVALID FIELD depth_of_cut_mm/);
    expect(text(r.gcode)).not.toMatch(/G71 U0\.000/);           // no degenerate zero-depth roughing cycle
  });

  it("INVARIANT: a NEGATIVE position field (end_z) is STILL valid -- positions may be negative", () => {
    // proves the guard distinguishes magnitude (must be >0) from position (any finite) -- no false drop.
    const r = hurcoWinMaxLatheMasterPostEngine.generateProgram([op({ operation_type: "od_rough", end_z: -120 })]);
    expect(r.skipped_operations).toBe(0);                       // negative Z is a legitimate position
    expect(text(r.gcode)).not.toMatch(/INVALID FIELD/);
  });

  it("FAILURE: thread with no pitch -> explicit error line, not a crash or bad G76", () => {
    const r = hurcoWinMaxLatheMasterPostEngine.generateProgram([op({ operation_type: "thread", start_x: 40, start_z: 0, end_z: -25 } as Partial<TurningOperation>)]);
    expect(text(r.gcode)).toMatch(/ERROR: THREAD PITCH/);
    expect(text(r.gcode)).not.toMatch(/G76/);
  });

  it("FAILURE: thread with a NEGATIVE pitch -> error, never a negative-lead G76 bad block", () => {
    const r = hurcoWinMaxLatheMasterPostEngine.generateProgram([op({ operation_type: "thread", start_x: 40, start_z: 0, end_z: -25, thread_pitch_mm: -1.5 } as Partial<TurningOperation>)]);
    expect(text(r.gcode)).toMatch(/ERROR: THREAD PITCH/);
    expect(text(r.gcode)).not.toMatch(/G76|F-|P-/);              // no negative lead / depth emitted
  });

  it("ADVERSARIAL: +Infinity css -> falls back to G97 fixed RPM, never G96 SInfinity", () => {
    const r = hurcoWinMaxLatheMasterPostEngine.generateProgram([op({ operation_type: "od_rough", css_m_min: Infinity, spindle_rpm: 1200 })]);
    const t = text(r.gcode);
    expect(t).not.toMatch(/SInfinity|S Infinity/);
    expect(t).toMatch(/G97 S1200 M03/);                          // fell back to the finite RPM
  });

  it("ADVERSARIAL: empty operations -> still a valid minimal program (header + safe start + M30 + %)", () => {
    const r = hurcoWinMaxLatheMasterPostEngine.generateProgram([]);
    const t = text(r.gcode);
    expect(r.skipped_operations).toBe(0);
    expect(r.tools_used).toEqual([]);
    expect(t).toContain("G28 U0 W0 (HOME POSITION)");
    expect(t).toContain("M30 (PROGRAM END)");
    expect(r.gcode[r.gcode.length - 1]).toBe("%");
  });

  it("ADVERSARIAL: unknown op type -> warning + no cutting code, never throws", () => {
    const r = hurcoWinMaxLatheMasterPostEngine.generateProgram([op({ operation_type: "laser_weld" as unknown as TurningOperation["operation_type"] })]);
    expect(text(r.gcode)).toMatch(/UNSUPPORTED OP TYPE laser_weld/);   // warning emits the raw op-type string
    expect(r.warnings.some((w) => /unsupported op type/.test(w))).toBe(true);
    expect(r.skipped_operations).toBe(0);                       // unsupported != non-finite skip
  });

  it("ADVERSARIAL: thread WITHOUT thread_depth_mm derives depth from pitch (no error)", () => {
    const r = hurcoWinMaxLatheMasterPostEngine.generateProgram([op({ operation_type: "thread", tool_number: 4, start_x: 40, start_z: 0, end_z: -25, thread_pitch_mm: 1.5 } as Partial<TurningOperation>)]);
    const t = text(r.gcode);
    expect(t).not.toMatch(/ERROR: THREAD/);
    // derived depth = 0.6134*1.5 = 0.9201 -> minor dia = 40 - 1.8402 = 38.160; P920
    expect(t).toContain("G76 X38.160 Z-25.000 P920 Q100 F1.5");
  });

  it("FEATURE: DEEP axial drill (depth>30mm) -> G83 peck cycle (Q2.0) + G80 cancel, not a plain plunge", () => {
    // start_z 2 -> end_z -35 = 37mm depth > the 30mm peck threshold -> G83.
    const r = hurcoWinMaxLatheMasterPostEngine.generateProgram(
      [op({ operation_type: "drill", tool_number: 7, start_x: 0, start_z: 2, end_x: 0, end_z: -35, feed_mm_rev: 0.1, spindle_rpm: 1200 } as Partial<TurningOperation>)]);
    const t = text(r.gcode);
    expect(r.skipped_operations).toBe(0);
    expect(t).toMatch(/G83 Z-35\.000 Q2\.0 F0\.1/);    // peck cycle for the deep hole
    expect(t).toContain("G80");                          // canned-cycle cancel
    expect(t).not.toMatch(/G01 Z-35/);                   // NOT a plain G1 plunge
  });

  it("FEATURE: SHALLOW axial drill (depth<=30mm) -> plain G01 plunge (no peck overhead)", () => {
    // start_z 2 -> end_z -20 = 22mm depth <= 30mm -> G01 (a shallow hole does not need pecking).
    const r = hurcoWinMaxLatheMasterPostEngine.generateProgram(
      [op({ operation_type: "drill", tool_number: 7, start_x: 0, start_z: 2, end_x: 0, end_z: -20, feed_mm_rev: 0.1, spindle_rpm: 1200 } as Partial<TurningOperation>)]);
    const t = text(r.gcode);
    expect(t).toMatch(/G01 Z-20\.000 F0\.1/);
    expect(t).not.toMatch(/\bG83\b/);
  });

  it("INVARIANT: a fully-valid program never contains NaN / Infinity tokens", () => {
    const ops: TurningOperation[] = [
      op({ operation_type: "face", end_x: -1, end_z: 0.5, feed_mm_rev: 0.15, depth_of_cut_mm: 0.5, start_x: 52, start_z: 0.5 }),
      op({ operation_type: "od_rough" }),
      op({ operation_type: "thread", tool_number: 4, start_x: 40, end_z: -25, thread_pitch_mm: 1.5 } as Partial<TurningOperation>),
    ];
    const t = text(hurcoWinMaxLatheMasterPostEngine.generateProgram(ops).gcode);
    expect(t).not.toMatch(/NaN|Infinity/);
  });
});
