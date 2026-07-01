/**
 * OkumaB250LatheMasterPostEngine.test.ts
 *
 * Reference-value coverage for the canonical JM Die Okuma lathe master post
 * (critical-path A1 of ECHO-ULTIMATE-ROADMAP-2026-06-24). Tests encode the
 * Okuma OSP-P300L emit *intent* (R9), not incidental output:
 *   - machine identity is now resolvable (U-PP-LATHE-MACHINE-AWARE): the three
 *     operator-named JM machines (LB250II-M default, LB3000, MULTUS B250II) emit
 *     a CORRECT (MACHINE: ...) header instead of the prior hardwired LB250II-M.
 *   - the JM Okuma safe-start ORDER (G28 -> units -> G50 clamp -> G97 -> G99 -> Gnn).
 *   - G96 CSS + G50 max-RPM clamp, G71 Okuma threading format, part-off CSS reduction.
 *   - physics-check failures surface as warnings (over-feed, over-CSS) [adversarial].
 *   - an unknown machine_id fails SOFT to LB250II-M with a warning [adversarial].
 */
import { describe, it, expect } from "vitest";
import {
  OkumaB250LatheMasterPostEngine,
  type TurningOperation,
  type OkumaLatheMachineId,
} from "../engines/OkumaB250LatheMasterPostEngine.js";

const engine = new OkumaB250LatheMasterPostEngine();

/** A clean OD roughing op that passes every physics gate. */
function odRough(overrides: Partial<TurningOperation> = {}): TurningOperation {
  return {
    operation_type: "od_rough",
    tool_number: 1,
    tool_orientation: 3,
    insert_radius_mm: 0.8,
    material_iso: "P",
    css_m_min: 200,
    feed_mm_rev: 0.25,
    depth_of_cut_mm: 2,
    start_x: 50,
    start_z: 0,
    end_x: 48,
    end_z: -30,
    coolant: "flood",
    ...overrides,
  };
}

const headerOf = (gcode: string[]) => gcode.find((l) => l.startsWith("(MACHINE:"));

describe("OkumaB250LatheMasterPostEngine — machine identity (U-PP-LATHE-MACHINE-AWARE)", () => {
  it("defaults to LB250II-M identity when no machine_id is given (back-compat)", () => {
    const out = engine.generateProgram([odRough()]);
    expect(headerOf(out.gcode)).toBe("(MACHINE: OKUMA LB250II-M OSP-P300L)");
    expect(out.warnings.some((w) => w.includes("Unknown machine_id"))).toBe(false);
  });

  it("emits the correct header for the JM LB3000 lathe", () => {
    const out = engine.generateProgram([odRough()], { machine_id: "LB3000" });
    expect(headerOf(out.gcode)).toBe("(MACHINE: OKUMA LB3000 OSP-P300L)");
  });

  it("emits the correct header for the JM MULTUS B250II mill-turn", () => {
    const out = engine.generateProgram([odRough()], { machine_id: "MULTUS-B250II" });
    expect(headerOf(out.gcode)).toBe("(MACHINE: OKUMA MULTUS B250II OSP-P300)");
  });

  it("getStats reflects the requested machine identity", () => {
    expect(engine.getStats().machine).toBe("OKUMA LB250II-M");
    expect(engine.getStats("LB3000").machine).toBe("OKUMA LB3000");
    expect(engine.getStats("MULTUS-B250II").controller).toBe("OSP-P300");
  });

  it("[adversarial] an unknown machine_id fails SOFT to LB250II-M + warns", () => {
    const out = engine.generateProgram([odRough()], {
      // off-union value reaches the engine via the dispatcher's `any` config path
      machine_id: "BOGUS-9000" as unknown as "LB3000",
    });
    expect(headerOf(out.gcode)).toBe("(MACHINE: OKUMA LB250II-M OSP-P300L)");
    expect(out.warnings.some((w) => w.includes('Unknown machine_id "BOGUS-9000"'))).toBe(true);
  });
});

describe("OkumaB250LatheMasterPostEngine — JM fleet identities (U-PP-LATHE-JM-FLEET-IDENTITY)", () => {
  // The 5 JM lathes (LTH-01..05, jm-fleet-sim-map.json) that previously had NO identity
  // and were silently mislabeled as LB250II-M. Each must now emit its own (MACHINE: ...)
  // header sourced verbatim from the canonical sim map, with NO "Unknown machine_id" warning.
  const JM_FLEET: Array<[OkumaLatheMachineId, string]> = [
    ["GENOS-L300-M", "(MACHINE: OKUMA GENOS L300-M OSP-P300L-R)"],
    ["GENOS-L200E-M", "(MACHINE: OKUMA GENOS L200E-M OSP-P200LA-R)"],
    ["GENOS-L400II-E", "(MACHINE: OKUMA GENOS L400II-E OSP-P300LA-E)"],
    ["LNC8", "(MACHINE: OKUMA LNC8 OSP-U10L)"],
    ["CROWN-L1060", "(MACHINE: OKUMA CROWN L1060 OSP-U10L)"],
  ];

  for (const [machineId, expectedHeader] of JM_FLEET) {
    it(`emits the correct header for JM ${machineId} (no LB250II-M mislabel)`, () => {
      const out = engine.generateProgram([odRough()], { machine_id: machineId });
      expect(headerOf(out.gcode)).toBe(expectedHeader);
      // Proves the model is RECOGNIZED (not defaulted): a defaulted model warns + emits LB250II-M.
      expect(out.warnings.some((w) => w.includes("Unknown machine_id"))).toBe(false);
      expect(headerOf(out.gcode)).not.toBe("(MACHINE: OKUMA LB250II-M OSP-P300L)");
    });
  }

  it("getStats reflects each new JM fleet identity's model + controller", () => {
    expect(engine.getStats("GENOS-L300-M").machine).toBe("OKUMA GENOS L300-M");
    expect(engine.getStats("GENOS-L300-M").controller).toBe("OSP-P300L-R");
    expect(engine.getStats("LNC8").controller).toBe("OSP-U10L");
    expect(engine.getStats("CROWN-L1060").machine).toBe("OKUMA CROWN L1060");
  });
});

describe("OkumaB250LatheMasterPostEngine — Okuma OSP safe-start contract", () => {
  it("emits the JM safe-start in canonical order: G28 -> units -> G50 clamp -> G97 -> G99 -> work-offset", () => {
    const out = engine.generateProgram([odRough()], { css_max_rpm: 3500, work_offset: 54 });
    const idx = (needle: string) => out.gcode.findIndex((l) => l.includes(needle));

    const home = idx("G28 U0 W0 (HOME POSITION)");
    const units = idx("G21 (METRIC)");
    const clamp = idx("G50 S3500 (MAX SPINDLE CLAMP)");
    const cancelCss = idx("G97 (CANCEL CSS FOR STARTUP)");
    const feedPerRev = idx("G99 (FEED PER REV)");
    const workOffset = idx("G54 (WORK OFFSET)");

    expect(home).toBeGreaterThanOrEqual(0);
    expect(units).toBeGreaterThanOrEqual(0);
    expect(clamp).toBeGreaterThanOrEqual(0);
    expect(cancelCss).toBeGreaterThanOrEqual(0);
    expect(feedPerRev).toBeGreaterThanOrEqual(0);
    expect(workOffset).toBeGreaterThanOrEqual(0);
    // strict ascending order — a leaked/re-ordered safe-start is a real crash risk
    expect(home).toBeLessThan(units);
    expect(units).toBeLessThan(clamp);
    expect(clamp).toBeLessThan(cancelCss);
    expect(cancelCss).toBeLessThan(feedPerRev);
    expect(feedPerRev).toBeLessThan(workOffset);
  });

  it("emits G20 (INCH) when units=inch", () => {
    const out = engine.generateProgram([odRough()], { units: "inch" });
    expect(out.gcode).toContain("G20 (INCH)");
    expect(out.gcode).not.toContain("G21 (METRIC)");
  });

  it("ends every program with M30 and homes the turret", () => {
    const out = engine.generateProgram([odRough()]);
    expect(out.gcode).toContain("M05 (SPINDLE STOP)");
    expect(out.gcode).toContain("G28 U0 W0 (HOME)");
    expect(out.gcode).toContain("M30 (PROGRAM END)");
  });
});

describe("OkumaB250LatheMasterPostEngine — operation emit", () => {
  it("roughing uses G96 CSS, G42 OD nose-comp, and an Okuma G85 LAP cycle (NOT Fanuc G72)", () => {
    const out = engine.generateProgram([odRough({ css_m_min: 220 })]);
    expect(out.gcode).toContain("G96 S220 M03 (CSS 220 M/MIN)");
    expect(out.gcode).toContain("G42 (TOOL NOSE COMP RIGHT)");
    // Okuma OSP roughing is the LAP cycle (G85 define / N<label> G81 / contour / G80) -- NOT Fanuc
    // G72. Verified vs JM DIE/CNC LATHE/A05-LSC-25-B.MIN:18-25 + the JM Multus .cps:3200-3207. R9 lock.
    expect(out.gcode.some((l) => l.startsWith("G72"))).toBe(false);
    const g85 = out.gcode.filter((l) => l.startsWith("G85 NLAP"));
    expect(g85.length).toBe(1);
    expect(g85[0]).toMatch(/^G85 NLAP0 D2 U0\.5 W0\.1 F/); // D=depth_of_cut, U/W=finish stock (diametral/Z)
    expect(out.gcode.some((l) => /^NLAP0 G81$/.test(l))).toBe(true); // longitudinal LAP contour label
    expect(out.gcode.some((l) => l === "G80")).toBe(true); // LAP cycle end
    expect(out.gcode.some((l) => l.includes("G40"))).toBe(true); // comp cancelled
  });

  it("tool change emits the Okuma 6-digit T<NN><NN><NN> call (NOT the 4-digit T0101)", () => {
    const out = engine.generateProgram([odRough({ tool_number: 1 }), odRough({ tool_number: 11 })]);
    // Okuma OSP lathe tool call is the 6-digit T<station><offset><wear> form -- verified vs Mark's
    // running JM programs (T010101/T111111 dominate the corpus 85,498x; the 4-digit T<NN><NN> form
    // appears 0x). R9 lock against a revert to the prior T0101 4-digit emit.
    expect(out.gcode).toContain("T010101 (TOOL 1)"); // tool 1 -> T010101 (not T0101)
    expect(out.gcode.some((l) => l.startsWith("T111111"))).toBe(true); // tool 11 -> T111111
    expect(out.gcode.some((l) => /^T\d{4} \(/.test(l))).toBe(false); // no 4-digit T<NN><NN> form remains
  });

  it("threading emits G97 fixed-RPM (not CSS) and an Okuma G71 single-line cycle (NOT Fanuc G76)", () => {
    const thread: TurningOperation = {
      operation_type: "thread",
      tool_number: 5,
      tool_orientation: 6,
      insert_radius_mm: 0.2,
      material_iso: "P",
      feed_mm_rev: 0.1,
      depth_of_cut_mm: 0.1,
      start_x: 48,
      start_z: -5,
      end_x: 48,
      end_z: -25,
      thread_pitch_mm: 1.5,
      thread_depth_mm: 0.92,
    };
    const out = engine.generateProgram([thread]);
    expect(out.gcode.some((l) => l.includes("G97") && l.includes("THREADING RPM"))).toBe(true);
    // Okuma OSP threading is the SINGLE-LINE G71 cycle -- NOT Fanuc G76 (which on an OSP control
    // alarms / mis-cycles). Verified vs Mark's JM programs (A05-LSC-25-B.MIN:149,
    // THREAD M8X125.MIN:60) + the JM Multus .cps thread-turning emit. R9 lock.
    expect(out.gcode.some((l) => l.startsWith("G76"))).toBe(false);
    const g71 = out.gcode.filter((l) => l.startsWith("G71"));
    expect(g71.length).toBe(1); // single-line Okuma threading cycle
    const t = g71[0];
    expect(t).toContain("X46.160"); // minor dia = start_x - 2*thread_depth = 48 - 1.84
    expect(t).toContain("Z-25.000"); // thread end Z
    expect(t).toContain("B60"); // included thread angle (deg)
    expect(t).toContain("H1.840"); // thread height output as DIAMETER = 2 * 0.92 radial
    expect(t).toContain("F1.5"); // lead == pitch (1.5 mm, metric)
    expect(t).toContain("M33"); // Okuma thread cutting mode (JM-confirmed)
    expect(t).toContain("M73"); // Okuma infeed mode (JM-confirmed)
  });

  it("grooving is Okuma explicit (G1 plunge + G4 dwell + retract), NOT Fanuc G75", () => {
    const out = engine.generateProgram([{
      operation_type: "groove", tool_number: 4, tool_orientation: 1, insert_radius_mm: 0.2,
      material_iso: "P", css_m_min: 120, feed_mm_rev: 0.08,
      start_x: 40, start_z: -50, end_x: 30, end_z: -50, groove_width_mm: 3,
    }]);
    // Okuma OSP grooving is explicit; the real JM corpus uses G75 ZERO times (vs G85 12,103x). R9 lock.
    expect(out.gcode.some((l) => l.startsWith("G75"))).toBe(false);
    expect(out.gcode.some((l) => /^G01 X30\.000 F0\.08 \(PLUNGE/.test(l))).toBe(true); // plunge to groove bottom
    expect(out.gcode.some((l) => /^G4 F0\.5 \(DWELL/.test(l))).toBe(true); // dwell at bottom (G4 F<sec>, Okuma)
    expect(out.gcode.some((l) => /^G00 X40\.000 \(RETRACT/.test(l))).toBe(true); // retract clear to start_x
  });

  it("part-off on a LARGE diameter pecks with explicit moves, NOT Fanuc G75", () => {
    const out = engine.generateProgram([{
      operation_type: "part_off", tool_number: 7, tool_orientation: 1, insert_radius_mm: 0.4,
      material_iso: "P", css_m_min: 120, feed_mm_rev: 0.1,
      start_x: 80, start_z: -40, end_x: 0, end_z: -40, coolant: "flood",
    }]);
    // start_x 80 > 50 -> large-dia peck path. Okuma OSP = explicit peck moves, NOT Fanuc G75. R9 lock.
    expect(out.gcode.some((l) => l.startsWith("G75"))).toBe(false);
    expect(out.gcode.some((l) => l.includes("PECK -- CHIP CLEAR"))).toBe(true);
    expect(out.gcode.some((l) => /^G01 X0 F.* \(CUT TO CENTER\)/.test(l))).toBe(true);
    expect(out.gcode.some((l) => l === "G4 F0.5 (DWELL AT CENTER)")).toBe(true); // Okuma G4 F<sec> dwell
  });

  it("part-off reduces CSS ~30% and forces flood coolant (safety)", () => {
    const partOff: TurningOperation = {
      operation_type: "part_off",
      tool_number: 7,
      tool_orientation: 1,
      insert_radius_mm: 0.4,
      material_iso: "P",
      css_m_min: 120,
      feed_mm_rev: 0.1,
      depth_of_cut_mm: 3,
      start_x: 50,
      start_z: -40,
      end_x: 0,
      end_z: -40,
      coolant: "flood",
    };
    const out = engine.generateProgram([partOff]);
    // 120 * 0.7 = 84 m/min reduced CSS
    expect(out.gcode).toContain("G96 S84 M03 (REDUCED CSS FOR PART-OFF)");
    expect(out.gcode).toContain("M08 (FLOOD COOLANT MANDATORY)");
  });

  it("part-off dwell uses the Okuma OSP G4 F<sec> form, NOT the Fanuc G04 P<ms> [dialect]", () => {
    const partOff: TurningOperation = {
      operation_type: "part_off",
      tool_number: 7,
      tool_orientation: 1,
      insert_radius_mm: 0.4,
      material_iso: "P",
      css_m_min: 120,
      feed_mm_rev: 0.1,
      depth_of_cut_mm: 3,
      start_x: 50,
      start_z: -40,
      end_x: 0,
      end_z: -40,
      coolant: "flood",
    };
    const text = engine.generateProgram([partOff]).gcode.join("\n");
    // Okuma OSP dwell is G4 F<seconds> (verified vs Mark's running JM programs);
    // a Fanuc G04 P<ms> dwell is malformed on the OSP control.
    expect(text).toContain("G4 F0.5 (DWELL AT CENTER)");
    expect(text).not.toMatch(/G04 P0?\.?5/); // no Fanuc-dialect dwell
  });

  it("dedups tools_used and reports a positive cycle-time estimate", () => {
    const out = engine.generateProgram([odRough({ tool_number: 3 }), odRough({ tool_number: 3 })]);
    expect(out.tools_used).toEqual([3]);
    expect(out.estimated_cycle_min).toBeGreaterThan(0);
  });

  it("[adversarial] c_mill without spindle_rpm emits a guarded live-tool feed, never FNaN", () => {
    const cMill: TurningOperation = {
      operation_type: "c_mill",
      tool_number: 8,
      tool_orientation: 3,
      insert_radius_mm: 0.4,
      material_iso: "P",
      feed_mm_rev: 0.1,
      depth_of_cut_mm: 1,
      start_x: 25,
      start_z: 0,
      end_x: 25,
      end_z: -20,
      // spindle_rpm intentionally omitted -> the live-tool feed must fall back
      // to the guarded default RPM (3000), NOT emit a literal FNaN.
    };
    const out = engine.generateProgram([cMill], { c_axis_enabled: true });
    const text = out.gcode.join("\n");
    expect(text).not.toContain("NaN");
    // 0.1 mm/rev * guarded 3000 rpm = 300.000 mm/min live-tool feed
    expect(out.gcode.some((l) => l.includes("F300.000"))).toBe(true);
  });
});

describe("OkumaB250LatheMasterPostEngine — physics gates [adversarial]", () => {
  it("flags an over-feed op (feed > material max) as a failed check + warning", () => {
    const out = engine.generateProgram([odRough({ material_iso: "P", feed_mm_rev: 0.6 })]);
    const feedCheck = out.physics_checks.find((c) => c.check.startsWith("Feed"));
    expect(feedCheck?.passed).toBe(false); // 0.6 > 0.3 max for ISO P
    expect(feedCheck?.value).toBe(0.6);
    expect(feedCheck?.limit).toBe(0.3);
    expect(out.warnings.some((w) => w.includes("Feed 0.6 mm/rev"))).toBe(true);
  });

  it("flags an over-CSS op (surface speed beyond ISO ceiling) as a failed check", () => {
    // ISO S ceiling = 50 m/min; *1.2 tolerance = 60; 400 must fail.
    const out = engine.generateProgram([odRough({ material_iso: "S", css_m_min: 400, feed_mm_rev: 0.2 })]);
    const cssCheck = out.physics_checks.find((c) => c.check.startsWith("Surface speed"));
    expect(cssCheck?.passed).toBe(false);
    expect(cssCheck?.value).toBe(400);
    expect(cssCheck?.limit).toBe(50);
    expect(out.warnings.some((w) => w.includes("Surface speed 400"))).toBe(true);
  });

  it("a clean op passes all physics checks with no warnings", () => {
    const out = engine.generateProgram([odRough()]);
    expect(out.physics_checks.every((c) => c.passed)).toBe(true);
    expect(out.warnings).toEqual([]);
  });
});

describe("OkumaB250LatheMasterPostEngine — non-finite emit guard (U-PP-NONFINITE-EMIT-SWEEP) [adversarial]", () => {
  // The non-finite XNaN/FNaN/WNaN bug CLASS (already fixed in RokuRoku 4259b15e63 +
  // HaasNGC c5fd2e27b5): a NaN / +-Infinity in a required numeric field would render
  // as a literal control-rejected token. The fixed-template lathe post must fail loud
  // (drop the op + warn), NEVER emit "NaN"/"Infinity", and NEVER fabricate a 0.000
  // coordinate (X0 is a real face position). These assertions FAIL if the guard is
  // reverted (the raw .toFixed(3) / F-word / W-word emits the bad token).

  it("NaN start_x: op is dropped with an error block + warning, never emits XNaN", () => {
    const out = engine.generateProgram([odRough({ start_x: NaN })]);
    const text = out.gcode.join("\n");
    expect(text).not.toContain("NaN");
    expect(out.gcode.some((l) => l.includes("SKIPPED") && l.includes("start_x"))).toBe(true);
    expect(out.warnings.some((w) => w.includes("non-finite") && w.includes("start_x"))).toBe(true);
    // the dropped move must NOT be substituted with a fabricated zero coordinate
    expect(out.gcode.some((l) => /^G00 X0\.000$/.test(l))).toBe(false);
    // the Okuma G85 LAP roughing cycle for this op must NOT have been emitted
    expect(out.gcode.some((l) => l.startsWith("G85"))).toBe(false);
  });

  it("Infinity feed_mm_rev: op dropped, never emits FInfinity / FNaN", () => {
    const out = engine.generateProgram([odRough({ feed_mm_rev: Infinity })]);
    const text = out.gcode.join("\n");
    expect(text).not.toContain("Infinity");
    expect(text).not.toContain("NaN");
    expect(out.warnings.some((w) => w.includes("non-finite") && w.includes("feed_mm_rev"))).toBe(true);
  });

  it("NaN end_z: op dropped, never emits ZNaN", () => {
    const out = engine.generateProgram([odRough({ end_z: NaN })]);
    expect(out.gcode.join("\n")).not.toContain("NaN");
    expect(out.warnings.some((w) => w.includes("non-finite") && w.includes("end_z"))).toBe(true);
  });

  it("NaN depth_of_cut_mm: op dropped, never emits the G85 D-word as DNaN", () => {
    const out = engine.generateProgram([odRough({ depth_of_cut_mm: NaN })]);
    expect(out.gcode.join("\n")).not.toContain("NaN");
    expect(out.warnings.some((w) => w.includes("non-finite") && w.includes("depth_of_cut_mm"))).toBe(true);
  });

  it("a VALID op after a malformed op still emits its cutting code (program survives)", () => {
    const out = engine.generateProgram([
      odRough({ start_x: NaN, tool_number: 1 }),
      odRough({ tool_number: 2, css_m_min: 180 }),
    ]);
    const text = out.gcode.join("\n");
    expect(text).not.toContain("NaN");
    // op2 is valid -> its G96 CSS + G85 LAP cutting code IS present
    expect(out.gcode).toContain("G96 S180 M03 (CSS 180 M/MIN)");
    expect(out.tools_used).toContain(2);
    // exactly ONE skip warning (op1), not a cascade
    expect(out.warnings.filter((w) => w.includes("skipped")).length).toBe(1);
  });

  it("a fully-valid multi-op program produces ZERO skip warnings (no false positive)", () => {
    const out = engine.generateProgram([odRough(), odRough({ tool_number: 2 })]);
    expect(out.warnings.some((w) => w.includes("skipped"))).toBe(false);
    expect(out.gcode.some((l) => l.startsWith("G85"))).toBe(true);
  });

  it("reports every offending field, in emit order, for a multi-field-bad op", () => {
    const out = engine.generateProgram([odRough({ start_z: NaN, feed_mm_rev: NaN })]);
    const skip = out.warnings.find((x) => x.includes("skipped"));
    // exact warning string: fields listed in helper emit order (start_z before feed_mm_rev)
    expect(skip).toBe("Operation 1 (od_rough) skipped: invalid (non-finite/non-positive) start_z, feed_mm_rev");
  });

  // --- non-positive magnitude guard (U-PP-NONPOS-GUARD): a NEGATIVE/ZERO feed or depth is FINITE,
  // so it slips past the finiteness check, but would emit "F-0.1" / a degenerate "W0.000". The
  // camActionSchemas .positive() mirror drops the op. Position fields (X/Z) stay valid when negative. ---

  it("NEGATIVE feed_mm_rev (finite but invalid): op dropped, never emits an F-0.1 block", () => {
    const out = engine.generateProgram([odRough({ feed_mm_rev: -0.25 })]);
    const text = out.gcode.join("\n");
    expect(out.skipped_operations).toBe(1);
    expect(out.gcode.some((l) => l.includes("SKIPPED") && l.includes("feed_mm_rev"))).toBe(true);
    expect(out.warnings.some((w) => w.includes("non-positive") && w.includes("feed_mm_rev"))).toBe(true);
    expect(text).not.toMatch(/F-0\.|F -0/);                      // the negative feed word is never emitted
    expect(out.gcode.some((l) => l.startsWith("G85"))).toBe(false);
  });

  it("ZERO depth_of_cut_mm (finite but invalid magnitude): op dropped, no degenerate G85 D0", () => {
    const out = engine.generateProgram([odRough({ depth_of_cut_mm: 0 })]);
    expect(out.skipped_operations).toBe(1);
    expect(out.warnings.some((w) => w.includes("non-positive") && w.includes("depth_of_cut_mm"))).toBe(true);
    expect(out.gcode.some((l) => /^G85 /.test(l))).toBe(false);
  });

  it("NEGATIVE position field (end_z = -120) is STILL valid: positions may be negative, no false drop", () => {
    const out = engine.generateProgram([odRough({ end_z: -120 })]);
    expect(out.skipped_operations).toBe(0);                      // negative Z is a legitimate position
    expect(out.warnings.some((w) => w.includes("skipped"))).toBe(false);
    expect(out.gcode.some((l) => l.startsWith("G85"))).toBe(true);
  });

  // --- per-op-type field map: drop-path on NON-roughing op types (locks the map) ---

  it("thread op with NaN start_x is dropped, never emits a G71 X NaN block", () => {
    const thread: TurningOperation = {
      operation_type: "thread",
      tool_number: 5,
      tool_orientation: 6,
      insert_radius_mm: 0.2,
      material_iso: "P",
      feed_mm_rev: 0.1,
      depth_of_cut_mm: 0.1,
      start_x: NaN,
      start_z: -5,
      end_x: 48,
      end_z: -25,
      thread_pitch_mm: 1.5,
      thread_depth_mm: 0.92,
    };
    const out = engine.generateProgram([thread]);
    expect(out.gcode.join("\n")).not.toContain("NaN");
    expect(out.gcode.some((l) => l.startsWith("G71"))).toBe(false);
    expect(out.warnings.some((w) => w.includes("non-finite") && w.includes("start_x"))).toBe(true);
    expect(out.skipped_operations).toBe(1);
  });

  it("drill op with NaN end_z is dropped, never emits a G83/G01 ZNaN block", () => {
    const drill: TurningOperation = {
      operation_type: "drill",
      tool_number: 9,
      tool_orientation: 8,
      insert_radius_mm: 0,
      material_iso: "P",
      spindle_rpm: 1500,
      feed_mm_rev: 0.1,
      depth_of_cut_mm: 1,
      start_x: 0,
      start_z: 2,
      end_x: 0,
      end_z: NaN,
    };
    const out = engine.generateProgram([drill]);
    expect(out.gcode.join("\n")).not.toContain("NaN");
    expect(out.warnings.some((w) => w.includes("non-finite") && w.includes("end_z"))).toBe(true);
    expect(out.skipped_operations).toBe(1);
  });

  it("part_off op with NaN start_x is dropped, never emits a G00 XNaN block", () => {
    const partOff: TurningOperation = {
      operation_type: "part_off",
      tool_number: 7,
      tool_orientation: 1,
      insert_radius_mm: 0.4,
      material_iso: "P",
      css_m_min: 120,
      feed_mm_rev: 0.1,
      depth_of_cut_mm: 3,
      start_x: NaN,
      start_z: -40,
      end_x: 0,
      end_z: -40,
    };
    const out = engine.generateProgram([partOff]);
    expect(out.gcode.join("\n")).not.toContain("NaN");
    expect(out.warnings.some((w) => w.includes("non-finite") && w.includes("start_x"))).toBe(true);
  });

  // --- the +-Infinity HALF of the bug class on TRUTHY-guarded OPTIONAL fields ---
  // Infinity is truthy, so it slips past `if (op.css_m_min)` / `op.x || default` /
  // `if (!op.thread_pitch_mm)`. These tests FAIL before the opt-field finiteness fix.

  it("Infinity css_m_min is dropped, never emits 'SInfinity' (G96 CSS word)", () => {
    const out = engine.generateProgram([odRough({ css_m_min: Infinity })]);
    const text = out.gcode.join("\n");
    expect(text).not.toContain("Infinity");
    expect(text).not.toContain("NaN");
    expect(out.warnings.some((w) => w.includes("non-finite") && w.includes("css_m_min"))).toBe(true);
  });

  it("Infinity spindle_rpm on a G97 fixed-RPM op is dropped, never emits 'SInfinity'", () => {
    // use_css:false forces the G97 spindle path so spindle_rpm reaches the S-word.
    const out = engine.generateProgram([odRough({ css_m_min: undefined, spindle_rpm: Infinity })], {
      use_css: false,
    });
    const text = out.gcode.join("\n");
    expect(text).not.toContain("Infinity");
    expect(out.warnings.some((w) => w.includes("non-finite") && w.includes("spindle_rpm"))).toBe(true);
  });

  it("Infinity thread_pitch_mm is dropped, never emits 'F Infinity' / 'G71 X-Infinity'", () => {
    const thread: TurningOperation = {
      operation_type: "thread",
      tool_number: 5,
      tool_orientation: 6,
      insert_radius_mm: 0.2,
      material_iso: "P",
      feed_mm_rev: 0.1,
      depth_of_cut_mm: 0.1,
      start_x: 48,
      start_z: -5,
      end_x: 48,
      end_z: -25,
      thread_pitch_mm: Infinity,
      thread_depth_mm: 0.92,
    };
    const out = engine.generateProgram([thread]);
    expect(out.gcode.join("\n")).not.toContain("Infinity");
    expect(out.warnings.some((w) => w.includes("non-finite") && w.includes("thread_pitch_mm"))).toBe(true);
  });

  it("Infinity groove_width_mm is dropped by the field-map guard (malformed op param)", () => {
    const groove: TurningOperation = {
      operation_type: "groove",
      tool_number: 4,
      tool_orientation: 1,
      insert_radius_mm: 0.2,
      material_iso: "P",
      css_m_min: 120,
      feed_mm_rev: 0.1,
      depth_of_cut_mm: 2,
      start_x: 50,
      start_z: -10,
      end_x: 44,
      end_z: -10,
      groove_width_mm: Infinity,
    };
    const out = engine.generateProgram([groove]);
    expect(out.gcode.join("\n")).not.toContain("Infinity");
    expect(out.warnings.some((w) => w.includes("non-finite") && w.includes("groove_width_mm"))).toBe(true);
  });

  // --- optional fields: NaN/clamped must NOT over-reject (no false-positive drop) ---

  it("[boundary] NaN groove_width_mm does NOT drop the op (falsy -> defaults to 3)", () => {
    // groove_width_mm is field-validated (opt): +-Infinity drops the op, but NaN is neither
    // +-Infinity nor <=0, so the field-map guard does NOT drop it -- the op runs. (The explicit
    // Okuma groove no longer emits groove_width, so a NaN there cannot poison a token either.)
    const groove: TurningOperation = {
      operation_type: "groove",
      tool_number: 4,
      tool_orientation: 1,
      insert_radius_mm: 0.2,
      material_iso: "P",
      css_m_min: 120,
      feed_mm_rev: 0.1,
      depth_of_cut_mm: 2,
      start_x: 50,
      start_z: -10,
      end_x: 44,
      end_z: -10,
      groove_width_mm: NaN,
    };
    const out = engine.generateProgram([groove]);
    expect(out.gcode.join("\n")).not.toContain("NaN");
    expect(out.warnings.some((w) => w.includes("skipped"))).toBe(false);
    expect(out.skipped_operations).toBe(0);
    expect(out.gcode.some((l) => l.startsWith("G01 X44.000"))).toBe(true); // op ran (explicit Okuma groove plunge to end_x)
  });

  it("[boundary] c_mill with Infinity spindle_rpm is CLAMPED to 6000, not dropped", () => {
    // c_mill clamps spindle via Math.min(rpm, 6000) at emit, so spindle_rpm is
    // intentionally NOT in its drop list -- Infinity is bounded, never 'SInfinity'.
    const cMill: TurningOperation = {
      operation_type: "c_mill",
      tool_number: 8,
      tool_orientation: 3,
      insert_radius_mm: 0.4,
      material_iso: "P",
      spindle_rpm: Infinity,
      feed_mm_rev: 0.1,
      depth_of_cut_mm: 1,
      start_x: 25,
      start_z: 0,
      end_x: 25,
      end_z: -20,
    };
    const out = engine.generateProgram([cMill], { c_axis_enabled: true });
    const text = out.gcode.join("\n");
    expect(text).not.toContain("Infinity");
    expect(text).not.toContain("NaN");
    expect(out.gcode.some((l) => l.includes("G97 S6000 M203"))).toBe(true); // Math.min(Infinity,6000)
    expect(out.skipped_operations).toBe(0); // clamped, not dropped
  });

  it("skipped_operations counts every dropped op in a mixed batch (degraded signal)", () => {
    const out = engine.generateProgram([
      odRough({ start_x: NaN }),
      odRough({ tool_number: 2 }),
      odRough({ feed_mm_rev: Infinity, tool_number: 3 }),
    ]);
    expect(out.skipped_operations).toBe(2); // op1 + op3 dropped, op2 valid
    expect(out.gcode.join("\n")).not.toContain("NaN");
    expect(out.gcode.join("\n")).not.toContain("Infinity");
  });
});
