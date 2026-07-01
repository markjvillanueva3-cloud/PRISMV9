// RokuRokuFanuc31iMillMasterPostEngine.test.ts -- R9 reference-value tests for the
// VMC-05 Roku-Roku HC 658-II Fanuc-31i mill master post (U-PP-ROKUROKU-ENGINE, slot:echo).
// Reference values are hand-derived from the Fanuc-31i emit contract + the HaasNGC ground truth.
import { describe, it, expect } from "vitest";
import {
  rokuRokuFanuc31iMillMasterPostEngine as eng,
  type FanucMillOperation,
} from "../engines/RokuRokuFanuc31iMillMasterPostEngine.js";

/** A minimal valid 1-op program (mm-native corpus contract). */
function op(over: Partial<FanucMillOperation> = {}): FanucMillOperation {
  return {
    operation_type: "rough",
    tool_number: 1,
    tool_diameter_mm: 10,
    tool_flutes: 4,
    material_iso: "P",
    spindle_rpm: 3000,
    feed_mm_min: 600,
    axial_depth_mm: 2,
    coordinates: [
      { x: 0, y: 0, type: "rapid" },
      { x: 25.4, y: 0, z: -2, type: "linear" },
    ],
    ...over,
  };
}

describe("RokuRokuFanuc31iMillMasterPostEngine.generateProgram", () => {
  it("emits the Roku-Roku Fanuc-31i identity header + universal-ISO safe start + footer", () => {
    const r = eng.generateProgram([op()], { program_number: 100, units: "metric" });
    expect(r.success).toBe(true);
    expect(r.controller).toBe("fanuc");
    expect(r.dialect).toBe("fanuc-31i");
    const text = r.gcode.join("\n");
    expect(text).toContain("(MACHINE: ROKU-ROKU HC 658-II)");
    expect(text).toContain("(CONTROL: FANUC 31i-B5)");
    expect(text).toContain("O100");
    expect(text).toContain("G0 G17 G40 G49 G80 G90"); // universal-ISO safe start
    expect(text).toMatch(/T1 M6/);                      // tool change
    expect(text).toMatch(/G0 G90 G54 X.* Y.* S3000 M3/);// spindle-on combined block
    expect(text).toMatch(/G43 H1 Z/);                   // tool length comp
    expect(text).toContain("M30");                      // program end
    expect(text.endsWith("%")).toBe(true);
  });

  it("UNITS-FIRST: G20 inch scales mm coordinates by 1/25.4 (a 25.4mm move -> 1.0000)", () => {
    const inch = eng.generateProgram([op()], { units: "inch" });
    const mm = eng.generateProgram([op()], { units: "metric" });
    expect(inch.gcode.join("\n")).toContain("G20");
    expect(mm.gcode.join("\n")).toContain("G21");
    // x=25.4 mm linear move: inch output -> X1.0000, metric -> X25.400
    expect(inch.gcode.join("\n")).toMatch(/G1 X1\.0000 Y0\.0000/);
    expect(mm.gcode.join("\n")).toMatch(/G1 X25\.400 Y0\.000/);
  });

  it("DELTA 2: G05.1 Q1 look-ahead is opt-in (default OFF; ON emits Q1 + Q0 cancel, never Haas G187)", () => {
    const off = eng.generateProgram([op()], {});
    expect(off.gcode.join("\n")).not.toContain("G05.1");
    expect(off.gcode.join("\n")).not.toContain("G187"); // never the Haas smoothing
    const on = eng.generateProgram([op()], { use_lookahead: true });
    const t = on.gcode.join("\n");
    expect(t).toContain("G05.1 Q1");
    expect(t).toContain("G05.1 Q0"); // cancelled before M30
    expect(t).not.toContain("G187");
  });

  it("DELTA 5: TSC coolant falls back to M8 flood + warns (unverified Roku-Roku TSC M-code)", () => {
    const r = eng.generateProgram([op({ coolant: "tsc" })], {});
    const t = r.gcode.join("\n");
    expect(t).toContain("M8");          // flood fallback
    expect(t).not.toContain("M88");     // does NOT emit the unverified Haas-TSC code
    expect(r.warnings.some((w) => /through-spindle-coolant/i.test(w))).toBe(true);
  });

  it("emits flood/mist coolant after spindle + M9 on retract", () => {
    const flood = eng.generateProgram([op({ coolant: "flood" })], {});
    expect(flood.gcode.join("\n")).toContain("M8");
    expect(flood.gcode.join("\n")).toContain("G91 G28 Z0. M9");
    const mist = eng.generateProgram([op({ coolant: "mist" })], {});
    expect(mist.gcode.join("\n")).toContain("M7");
  });

  it("emits a modal drilling canned cycle (G99 G81 ... G80) from op.cycle", () => {
    const drillOp = op({
      operation_type: "drill",
      coordinates: [{ x: 5, y: 5, type: "rapid" }, { x: 15, y: 5, type: "rapid" }],
      cycle: { type: "drill", depth_mm: -10, retract_mm: 2.5 },
    });
    const t = eng.generateProgram([drillOp], { units: "metric" }).gcode.join("\n");
    expect(t).toMatch(/G99 G81 Z-10\.000 R2\.500 F/); // first hole bare cycle
    expect(t).toMatch(/X15\.000 Y5\.000/);            // subsequent hole modal XY
    expect(t).toContain("G80");                        // cancel
  });

  it("peck cycle missing Q downgrades to G81 + warns (never emits a Q-less G83)", () => {
    const r = eng.generateProgram([op({
      operation_type: "drill",
      coordinates: [{ x: 0, y: 0, type: "rapid" }],
      cycle: { type: "peck", depth_mm: -10, retract_mm: 2 }, // no peck_mm
    })], { units: "metric" });
    expect(r.gcode.join("\n")).toContain("G81");
    expect(r.gcode.join("\n")).not.toMatch(/G83/);
    expect(r.warnings.some((w) => /downgraded to G81/.test(w))).toBe(true);
  });

  // -- failure modes --
  it("FAILURE: empty operations -> structured error, never throws", () => {
    const r = eng.generateProgram([], {});
    expect(r.success).toBe(false);
    expect(r.gcode).toEqual([]);
    expect(r.error).toMatch(/empty/i);
    // @ts-expect-error -- adversarial: non-array input must also fail soft, not throw
    expect(() => eng.generateProgram(null, {})).not.toThrow();
  });

  it("FAILURE: non-finite first XY warns + defaults to 0,0 (no literal XNaN)", () => {
    const r = eng.generateProgram([op({
      coordinates: [{ x: NaN, y: 0, type: "rapid" }, { x: 10, y: 0, type: "linear" }],
    })], { units: "metric" });
    expect(r.gcode.join("\n")).not.toContain("XNaN");
    expect(r.gcode.join("\n")).toMatch(/G0 G90 G54 X0\.000 Y0\.000/);
    expect(r.warnings.some((w) => /non-finite XY/i.test(w))).toBe(true);
  });

  it("FAILURE: invalid feed emits a flagged token, never FInfinity", () => {
    const r = eng.generateProgram([op({ feed_mm_min: Infinity })], { units: "metric" });
    expect(r.gcode.join("\n")).not.toContain("FInfinity");
    expect(r.gcode.join("\n")).toContain("INVALID FEED");
  });

  it("FAILURE: arc with no R or I/J centre is flagged, not silently emitted", () => {
    const r = eng.generateProgram([op({
      coordinates: [{ x: 0, y: 0, type: "rapid" }, { x: 5, y: 5, type: "arc_cw" }],
      arc_data: [{}, {}], // arc at index 1 has no r and no i/j -> must be flagged
    })], { units: "metric" });
    expect(r.gcode.join("\n")).toContain("NO I/J/R - REVIEW");
  });

  // -- physics envelope (R12: no fabricated Roku-Roku datasheet limit) --
  it("RPM/force checks run ONLY with a caller-supplied limit; absent -> no fabricated limit", () => {
    const noLimit = eng.generateProgram([op({ spindle_rpm: 40000 })], {});
    expect(noLimit.physics_checks.some((c) => /RPM vs/.test(c.check))).toBe(false); // no invented ceiling
    const withLimit = eng.generateProgram([op({ spindle_rpm: 40000 })], { max_rpm: 30000 });
    const rpmCheck = withLimit.physics_checks.find((c) => /RPM vs supplied limit 30000/.test(c.check));
    expect(rpmCheck?.value).toBe(40000);
    expect(rpmCheck?.passed).toBe(false); // 40000 > 30000 -> fails the supplied ceiling
  });

  it("physics: chip-load + Taylor checks use canonical material constants (machine-independent)", () => {
    const r = eng.generateProgram([op()], {});
    expect(r.physics_checks.some((c) => /chip load/.test(c.check))).toBe(true);
    expect(r.physics_checks.some((c) => /Taylor tool life/.test(c.check))).toBe(true);
  });

  it("ADVERSARIAL: multiple ops emit M01 optional stops between (not before the first)", () => {
    const r = eng.generateProgram([op(), op({ tool_number: 2 })], {});
    const idxFirstTool = r.gcode.findIndex((l) => /T1 M6/.test(l));
    const idxM01 = r.gcode.findIndex((l) => /\bM01\b/.test(l));
    expect(idxM01).toBeGreaterThan(idxFirstTool); // optional stop appears after op 1, before op 2
    expect(r.tools_used).toEqual([1, 2]);
  });
});
