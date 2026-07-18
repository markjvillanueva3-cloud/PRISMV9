// Tests for HaasNGCMillMasterPostEngine — real-value (R9), grounded in the real JM Haas NC structure
// (JM DIE/CNC MILL HAAS/ALL STAR/ALL STAR.NC) + the post-training corpus pocket-2op job.
import { describe, it, expect } from "vitest";
import { haasNGCMillMasterPostEngine, HaasNGCMillMasterPostEngine, type HaasMillOperation } from "../engines/HaasNGCMillMasterPostEngine.js";

/** Corpus pocket-2op job (face + pocket, steel) — the same ops the harness feeds the post. */
function pocket2op(): HaasMillOperation[] {
  return [
    { operation_type: "face", tool_number: 1, tool_diameter_mm: 50.8, tool_flutes: 5, material_iso: "P", spindle_rpm: 877, feed_mm_min: 200, axial_depth_mm: 0.5, coolant: "flood",
      coordinates: [{ x: 0, y: 0, z: 5, type: "rapid" }, { x: 0, y: 0, z: -0.5, type: "linear" }, { x: 150, y: 0, z: -0.5, type: "linear" }] },
    { operation_type: "pocket", tool_number: 2, tool_diameter_mm: 12.7, tool_flutes: 4, material_iso: "P", spindle_rpm: 3509, feed_mm_min: 600, axial_depth_mm: 3.0, radial_depth_mm: 6.0, coolant: "flood",
      coordinates: [{ x: 10, y: 10, z: 5, type: "rapid" }, { x: 10, y: 10, z: -3, type: "linear" }, { x: 60, y: 10, z: -3, type: "linear" }] },
  ];
}
const joined = (out: { gcode: string[] }) => out.gcode.join("\n");

describe("HaasNGCMillMasterPostEngine — structure (vs real JM Haas ground truth)", () => {
  it("emits the Haas program envelope: % O# header, G21(metric) safe-start, T# M6, footer M30", () => {
    const out = haasNGCMillMasterPostEngine.generateProgram(pocket2op(), { units: "metric", work_offset: 54, program_number: 1002 });
    expect(out.success).toBe(true);
    const g = joined(out);
    expect(out.gcode[0]).toBe("%");                  // tape start
    expect(g).toContain("O1002");
    expect(g).toContain("(MACHINE: HAAS VF-2)");
    expect(g).toContain("G21");                       // metric units selected
    expect(g).toContain("G0 G17 G40 G49 G80 G90");    // Haas safe start
    expect(g).toContain("T1 M6");                     // tool change op1
    expect(g).toContain("T2 M6");                     // tool change op2
    expect(g).toContain("M30");
    expect(out.gcode[out.gcode.length - 1]).toBe("%"); // tape end
  });

  it("emits the combined move/offset/spindle block with the op's real RPM + work offset", () => {
    const g = joined(haasNGCMillMasterPostEngine.generateProgram(pocket2op(), { units: "metric", work_offset: 55 }));
    expect(g).toContain("G0 G90 G55 X0.000 Y0.000 S877 M3");   // op1 face: first rapid XY + G55 + S877
    expect(g).toContain("S3509 M3");                            // op2 pocket RPM
    expect(g).toContain("G43 H1 Z");                            // tool length comp op1
    expect(g).toContain("G43 H2 Z");
  });

  it("uses () paren comments (Fanuc family) — NEVER Okuma [] brackets", () => {
    const g = joined(haasNGCMillMasterPostEngine.generateProgram(pocket2op(), { units: "metric" }));
    expect(g).toContain("(OPERATION 1: FACE)");
    expect(g).not.toMatch(/\[[A-Z]/); // no [..] comment style
  });

  it("emits flood coolant M8 per tool and M9 at the tool end", () => {
    const g = joined(haasNGCMillMasterPostEngine.generateProgram(pocket2op(), { units: "metric" }));
    expect(g).toContain("M8");
    expect(g).toContain("G91 G28 Z0. M9");  // Z home + coolant off at tool end
  });

  it("emits the footer sequence ending in M30, with XY-home BEFORE M30", () => {
    const out = haasNGCMillMasterPostEngine.generateProgram(pocket2op(), { units: "metric" });
    const g = joined(out);
    const m30Idx = out.gcode.findIndex((l) => l.includes("M30"));
    expect(g).toContain("G28 X0. Y0.");
    expect(out.gcode.slice(m30Idx).some((l) => l.includes("G28 X0. Y0."))).toBe(false); // home BEFORE M30
  });

  it("N-numbers command blocks by step 2 (real JM Haas convention) and leaves comments unnumbered", () => {
    const out = haasNGCMillMasterPostEngine.generateProgram(pocket2op(), { units: "metric" });
    expect(out.gcode.some((l) => /^N1 G21$/.test(l))).toBe(true);
    expect(out.gcode.some((l) => /^N3 G0 G17/.test(l))).toBe(true);
    expect(out.gcode.find((l) => l.startsWith("(MACHINE"))).not.toMatch(/^N\d/); // comment not numbered
  });

  it("can suppress N-numbers when emit_block_numbers:false", () => {
    const out = haasNGCMillMasterPostEngine.generateProgram(pocket2op(), { units: "metric", emit_block_numbers: false });
    expect(out.gcode.some((l) => l === "G21")).toBe(true);
    expect(out.gcode.some((l) => /^N\d/.test(l))).toBe(false);
  });
});

describe("HaasNGCMillMasterPostEngine — toolpath + move interpretation", () => {
  it("emits G0 rapid / G1 linear with feed from coordinates[]", () => {
    const g = joined(haasNGCMillMasterPostEngine.generateProgram(pocket2op(), { units: "metric" }));
    expect(g).toContain("G0 X0.000 Y0.000 Z5.000");        // op1 rapid
    expect(g).toContain("G1 X150.000 Y0.000 Z-0.500 F200"); // op1 linear cut at F200
  });

  it("REGRESSION (U-PP-HAASNGC-NONFINITE-GUARD): a non-finite move coordinate is skipped + warned, never XNaN", () => {
    const ops: HaasMillOperation[] = [{
      operation_type: "contour", tool_number: 1, tool_diameter_mm: 6, tool_flutes: 3, material_iso: "P",
      spindle_rpm: 5000, feed_mm_min: 400, axial_depth_mm: 1, coolant: "flood",
      coordinates: [
        { x: 0, y: 0, z: 5, type: "rapid" },
        { x: NaN, y: 10, z: -1, type: "linear" }, // non-finite X in a cut move -> must NOT emit XNaN
        { x: 20, y: 10, z: -1, type: "linear" },
      ],
    }];
    const out = haasNGCMillMasterPostEngine.generateProgram(ops, { units: "metric" });
    const g = joined(out);
    expect(g).not.toContain("XNaN");
    expect(g).not.toContain("YNaN");
    expect(out.warnings.some((w) => /non-finite XY/i.test(w))).toBe(true);
    expect(g).toContain("G1 X20.000 Y10.000"); // the finite move still emits
  });

  it("emits G2/G3 arcs with I/J or R when arc_data is present", () => {
    const ops: HaasMillOperation[] = [{
      operation_type: "contour", tool_number: 3, tool_diameter_mm: 6, tool_flutes: 3, material_iso: "P", spindle_rpm: 5000, feed_mm_min: 400, axial_depth_mm: 1, coolant: "flood",
      coordinates: [{ x: 0, y: 0, z: 5, type: "rapid" }, { x: 5, y: 0, z: -1, type: "arc_cw" }, { x: 10, y: 5, z: -1, type: "arc_ccw" }],
      arc_data: [{}, { i: 2.5, j: 0 }, { r: 5 }],
    }];
    const g = joined(haasNGCMillMasterPostEngine.generateProgram(ops, { units: "metric" }));
    expect(g).toContain("G2 X5.000 Y0.000 I2.500 J0.000 F400");
    expect(g).toContain("G3 X10.000 Y5.000 R5.000 F400");
  });

  it("fail-soft on an unknown move type: emits a flagged linear move, never drops it", () => {
    const ops: HaasMillOperation[] = [{
      operation_type: "face", tool_number: 1, tool_diameter_mm: 50, tool_flutes: 5, material_iso: "P", spindle_rpm: 877, feed_mm_min: 200, axial_depth_mm: 0.5,
      coordinates: [{ x: 1, y: 2, z: -1, type: "spline" }],
    }];
    const g = joined(haasNGCMillMasterPostEngine.generateProgram(ops, { units: "metric" }));
    expect(g).toContain("G1 X1.000 Y2.000 Z-1.000 F200 (UNKNOWN MOVE TYPE 'spline')");
  });
});

describe("HaasNGCMillMasterPostEngine — G187 high-speed smoothing (NGC opt-in)", () => {
  it("emits NO G187 by default (matches older JM baseline)", () => {
    expect(joined(haasNGCMillMasterPostEngine.generateProgram(pocket2op(), { units: "metric" }))).not.toContain("G187");
  });
  it("emits G187 P1 for a face op when use_g187:true (P1 rough/face is fastest)", () => {
    const g = joined(haasNGCMillMasterPostEngine.generateProgram(pocket2op(), { units: "metric", use_g187: true }));
    expect(g).toContain("G187 P1");
  });
});

describe("HaasNGCMillMasterPostEngine — units + offsets", () => {
  it("emits G20 for inch and converts tool-list diameters to inch", () => {
    const g = joined(haasNGCMillMasterPostEngine.generateProgram(pocket2op(), { units: "inch" }));
    expect(g).toContain("G20");
    expect(g).toContain("TOOL DIA. - 2.0000"); // 50.8mm → 2.000 in
  });
  it("converts GEOMETRY and FEED to inch in G20 mode — no 25.4x scale error (regression guard)", () => {
    const g = joined(haasNGCMillMasterPostEngine.generateProgram(pocket2op(), { units: "inch" }));
    expect(g).toContain("G1 X5.9055 Y0.0000");  // 150mm coordinate → 5.9055 in (geometry scaled)
    expect(g).toContain("F7.87");                // 200 mm/min feed → 7.87 in/min (feed scaled)
    expect(g).not.toContain("F200");             // raw mm-magnitude feed must NEVER leak into an inch program
    expect(g).not.toContain("X150.000");         // raw mm-magnitude coordinate must NEVER leak into an inch program
  });
  it("guards a non-finite feed: emits a flagged F token (never FInfinity) and warns", () => {
    const ops = pocket2op();
    ops[0].feed_mm_min = Infinity;
    const out = haasNGCMillMasterPostEngine.generateProgram(ops, { units: "metric" });
    const g = joined(out);
    expect(g).not.toContain("FInfinity");
    expect(g).toContain("F1 (INVALID FEED - REVIEW)");
    expect(out.warnings.some((w) => /non-finite/.test(w))).toBe(true);
  });
  it("clamps an out-of-range work offset to G54", () => {
    expect(joined(haasNGCMillMasterPostEngine.generateProgram(pocket2op(), { units: "metric", work_offset: 99 }))).toContain("G0 G90 G54 X");
  });
  it("emits all G54..G59 work offsets correctly", () => {
    for (let n = 54; n <= 59; n++) {
      expect(joined(haasNGCMillMasterPostEngine.generateProgram(pocket2op(), { units: "metric", work_offset: n }))).toContain(`G0 G90 G${n} X`);
    }
  });
});

describe("HaasNGCMillMasterPostEngine — optional stops", () => {
  it("emits exactly one M01 between the 2 ops (never before the first)", () => {
    const out = haasNGCMillMasterPostEngine.generateProgram(pocket2op(), { units: "metric" });
    const m01 = out.gcode.filter((l) => l.includes("M01"));
    expect(m01.length).toBe(1);
    expect(out.gcode.findIndex((l) => l.includes("M01"))).toBeGreaterThan(out.gcode.findIndex((l) => l.includes("T1 M6")));
  });
  it("suppresses M01 when optional_stops:false", () => {
    expect(joined(haasNGCMillMasterPostEngine.generateProgram(pocket2op(), { units: "metric", optional_stops: false }))).not.toContain("M01");
  });
});

describe("HaasNGCMillMasterPostEngine — physics checks (canonical Kienzle/Taylor)", () => {
  it("passes the corpus face op (in-envelope) and reports the canonical P-group Kienzle basis", () => {
    const out = haasNGCMillMasterPostEngine.generateProgram(pocket2op(), { units: "metric" });
    const forceCheck = out.physics_checks.find((c) => c.check.includes("cutting force") && c.op === 1);
    expect(forceCheck!.check).toMatch(/kc1_1=1800/); // canonical P-group kc1.1 from constants.ts (imported, not inlined)
    expect(forceCheck!.passed).toBe(true);           // corpus face op is within the VF-2 force envelope
  });
  it("FAILS the spindle check + warns when RPM exceeds the VF-2 max (8100)", () => {
    const ops = pocket2op();
    ops[0].spindle_rpm = 12000; // over VF-2 8100
    const out = haasNGCMillMasterPostEngine.generateProgram(ops, { units: "metric" });
    const rpmCheck = out.physics_checks.find((c) => c.check.includes("spindle 12000"));
    expect(rpmCheck!.passed).toBe(false);
    expect(out.warnings.some((w) => w.includes("spindle 12000"))).toBe(true);
  });
  it("emits exactly 4 physics checks per op and survives Infinity feed without throwing", () => {
    const ops = pocket2op();
    ops[0].feed_mm_min = Infinity;
    const out = haasNGCMillMasterPostEngine.generateProgram(ops, { units: "metric" });
    expect(out.success).toBe(true);
    expect(out.physics_checks.length).toBe(8); // 4 checks × 2 ops
  });
});

describe("HaasNGCMillMasterPostEngine — failure modes + setup sheet", () => {
  it("returns a structured error (not a throw) on empty operations", () => {
    const out = haasNGCMillMasterPostEngine.generateProgram([], {});
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/empty/);
    expect(out.gcode).toEqual([]);
  });
  it("emits a setup sheet with deduped/sorted tools and the op sequence", () => {
    const out = haasNGCMillMasterPostEngine.generateProgram(pocket2op(), { units: "metric" });
    expect(out.setup_sheet!.tools.map((t) => t.tool_number)).toEqual([1, 2]);
    expect(out.setup_sheet!.operations).toHaveLength(2);
    expect(out.tools_used).toEqual([1, 2]);
  });
  it("omits the setup sheet entirely when emit_setup_sheet:false (still emits valid gcode)", () => {
    const out = haasNGCMillMasterPostEngine.generateProgram(pocket2op(), { units: "metric", emit_setup_sheet: false });
    expect(out.setup_sheet ?? "absent").toBe("absent");
    expect(out.success).toBe(true);
  });
  it("reports controller/dialect = haas", () => {
    const out = haasNGCMillMasterPostEngine.generateProgram(pocket2op(), { units: "metric" });
    expect(out.controller).toBe("haas");
    expect(out.dialect).toBe("haas");
  });
});

describe("HaasNGCMillMasterPostEngine — instance", () => {
  it("exports a usable singleton instance of the class", () => {
    expect(haasNGCMillMasterPostEngine).toBeInstanceOf(HaasNGCMillMasterPostEngine);
  });
});

// ── Drilling canned cycles (U-PT-HAAS-CANNED-CYCLES + U-PT-HAAS-CYCLE-BYTE-MATCH) ──
// GROUND TRUTH = REAL JM Haas .NC (e.g. ALL STAR.NC): `N31 G99 G83 Z-.4375 R.1 Q.1 F1.8` — the cycle
// line is BARE (no XY; XY positioned by the preceding G0 approach) and 100% G99 (0 of 17 use G98).
/** A drilling op carrying a canned cycle over a 4-hole pattern (mm). `cyc` overrides the cycle. */
function drillOp(cyc: HaasMillOperation["cycle"], holes: Array<[number, number]> = [[25, 25], [75, 25], [75, 75], [25, 75]]): HaasMillOperation[] {
  return [{
    operation_type: "drill", tool_number: 3, tool_diameter_mm: 6.35, tool_flutes: 2, material_iso: "P",
    spindle_rpm: 1200, feed_mm_min: 150, axial_depth_mm: 12.7, coolant: "flood",
    coordinates: holes.map(([x, y]) => ({ x, y, z: 5, type: "point" })),
    cycle: cyc,
  }];
}
/** A line that is the cycle-cancel G80 (ends in G80), NOT the safe-start block (…G80 G90). */
const hasCancelG80 = (out: { gcode: string[] }) => out.gcode.some((l) => /G80\s*$/.test(l));

describe("HaasNGCMillMasterPostEngine — drilling canned cycles", () => {
  it("G81 simple drill: BARE G99 first-hole def + modal XY for the rest + G80 cancel", () => {
    const out = haasNGCMillMasterPostEngine.generateProgram(
      drillOp({ type: "drill", depth_mm: -12.7, retract_mm: 2.54 }), { units: "metric" });
    const g = joined(out);
    expect(g).toContain("G99 G81 Z-12.700 R2.540 F"); // first hole: BARE def (no XY), default G99
    expect(g).toContain("X75.000 Y25.000");            // modal subsequent hole (XY only)
    expect(g).toContain("X25.000 Y75.000");            // last hole
    expect(hasCancelG80(out)).toBe(true);              // cycle cancelled
    expect(g).not.toContain("Q");                      // no peck on a simple drill
    expect(g).not.toMatch(/G8[1-6] X/);                // byte-truth: NO cycle line carries X (golden = bare)
  });

  it("emits exactly one BARE full-def line + (holes-1) modal XY lines", () => {
    const out = haasNGCMillMasterPostEngine.generateProgram(
      drillOp({ type: "drill", depth_mm: -10, retract_mm: 2 }, [[0, 0], [10, 0], [20, 0]]), { units: "metric" });
    const defLines = out.gcode.filter((l) => /G81 Z/.test(l));
    const modalLines = out.gcode.filter((l) => /^(N\d+ )?X[\d.-]+ Y[\d.-]+$/.test(l)); // XY-only, optional N#
    expect(defLines.length).toBe(1);
    expect(modalLines.length).toBe(2); // 3 holes → 1 bare def + 2 modal
  });

  it("G83 peck: BARE G99 with the Q peck increment", () => {
    const g = joined(haasNGCMillMasterPostEngine.generateProgram(
      drillOp({ type: "peck", depth_mm: -20, retract_mm: 2.54, peck_mm: 3.81 }), { units: "metric" }));
    expect(g).toContain("G99 G83 Z-20.000 R2.540 Q3.810 F");
  });

  it("G73 chip-break: BARE G99 G73 with Q", () => {
    const g = joined(haasNGCMillMasterPostEngine.generateProgram(
      drillOp({ type: "chip_break", depth_mm: -15, retract_mm: 2, peck_mm: 2.5 }), { units: "metric" }));
    expect(g).toContain("G99 G73 Z-15.000 R2.000 Q2.500 F");
  });

  it("G82 dwell: BARE G99 G82 with the P dwell (seconds, 2dp)", () => {
    const g = joined(haasNGCMillMasterPostEngine.generateProgram(
      drillOp({ type: "dwell", depth_mm: -5, retract_mm: 1.5, dwell_s: 0.5 }), { units: "metric" }));
    expect(g).toContain("G99 G82 Z-5.000 R1.500 P0.50 F");
  });

  it("G84 tap is a BARE rigid cycle — Haas needs NO M29 (M29 would hang the control; byte-truth vs ALL STAR.NC)", () => {
    const g = joined(haasNGCMillMasterPostEngine.generateProgram(
      drillOp({ type: "tap", depth_mm: -10, retract_mm: 3 }), { units: "metric" }));
    expect(g).toContain("G99 G84 Z-10.000 R3.000 F"); // bare G84 cycle, default G99
    expect(g).not.toContain("M29"); // M29 on Haas = "set output relay + M-FIN" → would hang on a tap
  });

  it("G85 bore: BARE G99 G85 (feed in + feed out)", () => {
    const g = joined(haasNGCMillMasterPostEngine.generateProgram(
      drillOp({ type: "bore", depth_mm: -8, retract_mm: 2 }), { units: "metric" }));
    expect(g).toContain("G99 G85 Z-8.000 R2.000 F");
  });

  it("retract mode: default is G99 (JM golden is 100% G99); retract_mode:'initial' → G98 opt-in", () => {
    const def = joined(haasNGCMillMasterPostEngine.generateProgram(
      drillOp({ type: "drill", depth_mm: -6, retract_mm: 1 }), { units: "metric" }));
    expect(def).toContain("G99 G81 Z-6.000");  // default → G99 (matches the golden archive)
    expect(def).not.toContain("G98 G81");
    const init = joined(haasNGCMillMasterPostEngine.generateProgram(
      drillOp({ type: "drill", depth_mm: -6, retract_mm: 1, retract_mode: "initial" }), { units: "metric" }));
    expect(init).toContain("G98 G81 Z-6.000");  // opt-in full retract (fixturing above the R-plane)
  });

  it("INCH units: depth/retract/peck are scaled 25.4× (no scale error — regression guard)", () => {
    const g = joined(haasNGCMillMasterPostEngine.generateProgram(
      drillOp({ type: "peck", depth_mm: -12.7, retract_mm: 2.54, peck_mm: 3.81 }, [[25.4, 25.4]]), { units: "inch" }));
    expect(g).toContain("G99 G83 Z-0.5000 R0.1000 Q0.1500"); // 12.7→0.5, 2.54→0.1, 3.81→0.15 (bare cycle line)
    expect(g).toContain("G0 G90 G54 X1.0000 Y1.0000");        // the XY (25.4→1.0) is on the approach, not the cycle
    expect(g).not.toContain("Z-12.700");  // raw mm depth must NEVER leak into an inch program
    expect(g).not.toContain("R2.540");
  });

  it("single hole → one BARE cycle-def line + G80, zero modal XY lines", () => {
    const out = haasNGCMillMasterPostEngine.generateProgram(
      drillOp({ type: "drill", depth_mm: -5, retract_mm: 2 }, [[10, 20]]), { units: "metric" });
    expect(out.gcode.filter((l) => /G81 Z/.test(l)).length).toBe(1);
    expect(out.gcode.filter((l) => /^(N\d+ )?X[\d.-]+ Y[\d.-]+$/.test(l)).length).toBe(0);
    expect(hasCancelG80(out)).toBe(true);
  });

  // ── failure / adversarial paths ──
  it("inverted geometry (depth not below retract, non-positive R) → warns but still emits the cycle", () => {
    const out = haasNGCMillMasterPostEngine.generateProgram(
      drillOp({ type: "drill", depth_mm: 2, retract_mm: -1 }), { units: "metric" });
    expect(out.warnings.some((w) => /inverted\/no-cut geometry/.test(w))).toBe(true);
    expect(out.warnings.some((w) => /not a positive R-plane/.test(w))).toBe(true);
    expect(out.gcode.some((l) => /G81 Z/.test(l))).toBe(true); // advisory, still emitted
  });

  it("0 holes → warns and emits NO canned cycle (no G80 cancel)", () => {
    const out = haasNGCMillMasterPostEngine.generateProgram(
      drillOp({ type: "drill", depth_mm: -5, retract_mm: 2 }, []), { units: "metric" });
    expect(out.warnings.some((w) => /no valid hole XY/.test(w))).toBe(true);
    expect(out.gcode.some((l) => /G81 Z/.test(l))).toBe(false);
    expect(hasCancelG80(out)).toBe(false);
  });

  it("peck cycle missing peck_mm → downgraded to G81 + warned (never a Q-less G83 that Haas alarms on)", () => {
    const out = haasNGCMillMasterPostEngine.generateProgram(
      drillOp({ type: "peck", depth_mm: -10, retract_mm: 2 }), { units: "metric" });
    const g = joined(out);
    expect(g).toContain("G99 G81 Z");        // downgraded
    expect(g).not.toContain("G83");
    expect(out.warnings.some((w) => /needs a positive peck_mm/.test(w))).toBe(true);
  });

  it("dwell cycle missing dwell_s → downgraded to G81 + warned", () => {
    const out = haasNGCMillMasterPostEngine.generateProgram(
      drillOp({ type: "dwell", depth_mm: -5, retract_mm: 1 }), { units: "metric" });
    expect(joined(out)).toContain("G99 G81 Z");
    expect(out.warnings.some((w) => /needs a positive dwell_s/.test(w))).toBe(true);
  });

  it("non-finite depth_mm → falls back to the long-hand move list + warns (no canned cycle)", () => {
    const out = haasNGCMillMasterPostEngine.generateProgram(
      drillOp({ type: "drill", depth_mm: NaN, retract_mm: 2 }), { units: "metric" });
    expect(out.warnings.some((w) => /non-finite depth_mm\/retract_mm/.test(w))).toBe(true);
    expect(hasCancelG80(out)).toBe(false);  // NO canned cycle emitted (no G80 cancel)
    // move-list fallback ran → the hole coords come out as move lines (type "point" → flagged G1), not a cycle
    expect(out.gcode.some((l) => /X25.000 Y25.000/.test(l))).toBe(true);
  });

  it("non-finite feed → flagged F token, never 'FInfinity' or 'FNaN'", () => {
    const ops = drillOp({ type: "drill", depth_mm: -5, retract_mm: 2 });
    ops[0].feed_mm_min = Infinity;
    const out = haasNGCMillMasterPostEngine.generateProgram(ops, { units: "metric" });
    const g = joined(out);
    expect(g).toContain("F1 (INVALID FEED - REVIEW)");
    expect(g).not.toMatch(/FInfinity|FNaN/);
  });

  it("non-finite XY on the first coordinate → approach defaults to 0,0 + warns, never literal XNaN", () => {
    const ops = drillOp({ type: "drill", depth_mm: -5, retract_mm: 2 }, [[75, 25]]);
    ops[0].coordinates.unshift({ x: NaN, y: NaN, z: 5, type: "point" }); // NaN-leading coord
    const out = haasNGCMillMasterPostEngine.generateProgram(ops, { units: "metric" });
    expect(joined(out)).not.toMatch(/XNaN|YNaN/);  // NaN must NEVER leak into the approach block
    expect(out.warnings.some((w) => /missing\/non-finite XY/.test(w))).toBe(true);
  });

  it("a non-leading rapid that diverges from the first hole → warns (bare-cycle coupling guard, R12)", () => {
    const ops = drillOp({ type: "drill", depth_mm: -5, retract_mm: 2 }, [[25, 25], [75, 25]]);
    ops[0].coordinates.splice(1, 0, { x: 99, y: 99, z: 5, type: "rapid" }); // rapid after coord[0]
    const out = haasNGCMillMasterPostEngine.generateProgram(ops, { units: "metric" });
    // approach finds the rapid (99,99) but holes[0] is (25,25) → divergence must be surfaced loud
    expect(out.warnings.some((w) => /approach positions to \(99,99\).*first hole is \(25,25\)/.test(w))).toBe(true);
  });

  // ── additive guarantee ──
  it("an op WITHOUT a cycle still emits the long-hand move list (additive, no regression)", () => {
    const out = haasNGCMillMasterPostEngine.generateProgram(pocket2op(), { units: "metric" });
    expect(joined(out)).toContain("G1 X150.000 Y0.000"); // existing move-list path unchanged
    expect(hasCancelG80(out)).toBe(false);               // no canned cycle emitted
  });

  it("mixed program: a move-list op and a canned-cycle op both emit correctly", () => {
    const ops: HaasMillOperation[] = [
      pocket2op()[0], // face op (move list)
      drillOp({ type: "peck", depth_mm: -15, retract_mm: 2, peck_mm: 3 })[0], // drill op (canned)
    ];
    const g = joined(haasNGCMillMasterPostEngine.generateProgram(ops, { units: "metric" }));
    expect(g).toContain("G1 X150.000 Y0.000");        // op1 move list
    expect(g).toContain("G99 G83 Z-15.000 R2.000 Q3.000"); // op2 BARE canned cycle
    expect(g).toContain("(OPERATION 2: DRILL)");
  });
});
