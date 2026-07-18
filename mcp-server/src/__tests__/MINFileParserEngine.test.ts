/**
 * Tests for MINFileParserEngine (PSAU P2.5-LEARN U-LEARN-03).
 *
 * Fixture programs are hand-written to exercise the parser's real logic,
 * not to be blessed NC code — each fixture is a minimal example of a
 * specific Okuma dialect feature (threading, grooving, CSS, macro, sub,
 * bad input, etc).
 */

import { describe, it, expect } from "vitest";
import { MINFileParserEngine } from "../engines/MINFileParserEngine.js";

const parser = new MINFileParserEngine();

describe("MINFileParserEngine — U-LEARN-03", () => {
  // --- baseline: clean two-op turning + parting program ----------------
  const basicTwoOp = `
(JM DIE – ALCOA – PART 12345)
O1234
G50 S3000
G20
T0101
G96 S800 M3
G0 X50. Z2.
G71 P100 Q200 U.01 W.005 D.08 F.2
N100 G0 X0.
G1 Z-.1 F.05
N200 G0 Z.2
G0 X100. Z100.
T0303
G97 S1500 M3
M8
G0 X30. Z0.
G75 X20. Z-5. I.05 K.05 F.03
G0 X100. Z100.
M30
`.trim();

  it("parse: succeeds on a clean two-op program", () => {
    const r = parser.parse({ source_path: "fixture/basic.min", text: basicTwoOp });
    expect(r.ok).toBe(true);
    expect(r.program.parse_ok).toBe(true);
    expect(r.program.end_code).toBe("M30");
    expect(r.program.header.is_main_or_sub).toBe("main");
    expect(r.program.header.program_number).toBe("O1234");
    expect(r.program.header.first_comment).toContain("JM DIE");
    expect(r.program.tools_used.length).toBe(2);           // T0101, T0303
  });

  it("parse: segments operations at tool-change boundaries (3 ops: setup + T1 + T3)", () => {
    const r = parser.parse({ source_path: "fx", text: basicTwoOp });
    expect(r.program.operations.length).toBe(3);
    expect(r.program.operations[0].kind).toBe("setup");
    // ops 1 & 2 have real tool ids
    expect(r.program.operations[1].tool_id).toBe("T0101");
    expect(r.program.operations[2].tool_id).toBe("T0303");
  });

  it("parse: classifies G71 op as turning and G75 op as grooving", () => {
    const r = parser.parse({ source_path: "fx", text: basicTwoOp });
    const ops = r.program.operations;
    expect(ops[1].kind).toBe("turning");
    expect(ops[1].canned_cycles).toContain("G71");
    expect(ops[2].kind).toBe("grooving");
    expect(ops[2].canned_cycles).toContain("G75");
  });

  it("parse: modal CSS (G96) sets surface_speed_sfm and clears rpm", () => {
    const r = parser.parse({ source_path: "fx", text: basicTwoOp });
    const t1 = r.program.operations[1];
    expect(t1.surface_speed_sfm).toBe(800);
  });

  it("parse: G97 after G96 carries RPM forward into the next op", () => {
    const r = parser.parse({ source_path: "fx", text: basicTwoOp });
    const t2 = r.program.operations[2];
    expect(t2.spindle_rpm).toBe(1500);
  });

  it("parse: coolant M8 is captured, M9 resets to off in later op", () => {
    const src = `T0101
G97 S1000 M3
M8
G0 X10.
G1 Z-1. F.1
T0303
M9
G0 X10.
M30`;
    const r = parser.parse({ source_path: "fx", text: src });
    const [t1, t3] = r.program.operations;     // no setup op — first block is a T-change
    expect(t1.coolant).toBe("flood");
    expect(t3.coolant).toBe("off");
  });

  // --- threading -------------------------------------------------------
  it("parse: G76 threading cycle is classified as threading", () => {
    const src = `O9000
T0404
G97 S500 M3
G0 X25. Z2.
G76 P020060 Q50 R.01
G76 X20. Z-10. P1083 Q300 F1.5
G0 X100. Z100.
M30`;
    const r = parser.parse({ source_path: "fx", text: src });
    const thread = r.program.operations.find((o) => o.tool_id === "T0404");
    expect(thread).toBeDefined();
    expect(thread!.kind).toBe("threading");
    expect(thread!.canned_cycles).toContain("G76");
  });

  // --- drilling --------------------------------------------------------
  it("parse: G83 peck drilling is classified as drilling", () => {
    const src = `O9001
T0505
G97 S800 M3
M8
G0 X0. Z2.
G83 Z-25. Q2. F.15
G0 Z100.
M30`;
    const r = parser.parse({ source_path: "fx", text: src });
    const drill = r.program.operations.find((o) => o.tool_id === "T0505");
    expect(drill!.kind).toBe("drilling");
    expect(drill!.canned_cycles).toContain("G83");
  });

  // --- rigid tap -------------------------------------------------------
  it("parse: G84 / G74 with M29 is classified as rigid_tap", () => {
    const src = `O9002
T0606
M29 S200
G0 X0. Z2.
G84 Z-10. F1.5
M30`;
    const r = parser.parse({ source_path: "fx", text: src });
    const tap = r.program.operations.find((o) => o.tool_id === "T0606");
    expect(tap!.kind).toBe("rigid_tap");
  });

  // --- subprogram ------------------------------------------------------
  it("parse: M98 P-word call is captured in subprograms_called", () => {
    const src = `O9003
T0101
G97 S1000 M3
M98 P8000
M30`;
    const r = parser.parse({ source_path: "fx", text: src });
    const op = r.program.operations.find((o) => o.tool_id === "T0101");
    expect(op!.subprograms_called).toContain("M98 P8000");
  });

  // --- sub-program (M99 ending) ----------------------------------------
  it("parse: M99 ending classifies program as sub", () => {
    const src = `O9004
G0 X0. Z0.
M99`;
    const r = parser.parse({ source_path: "fx", text: src });
    expect(r.program.end_code).toBe("M99");
    expect(r.program.header.is_main_or_sub).toBe("sub");
  });

  // --- units detection -------------------------------------------------
  it("parse: G21 detected as mm units; G20 as inch", () => {
    const mm = parser.parse({ source_path: "fx", text: "G21\nT0101\nM30" });
    expect(mm.program.header.units).toBe("mm");
    const inch = parser.parse({ source_path: "fx", text: "G20\nT0101\nM30" });
    expect(inch.program.header.units).toBe("inch");
  });

  // --- REGRESSION (U-MINPARSE-UNITS-CYCLE-FIX, 2026-06-22, slot:alpha) --------
  // G70/G71/G72 are Okuma LAP turning CYCLES, not units. The parser used to map
  // G70->inch / G71->mm (obsolete pre-G20/G21 Fanuc convention), so a roughing cycle
  // silently flipped header.units to "mm" for an inch program -> a 25.4x scale hazard.
  // VALIDATED on the live JM corpus: ~1500 MIN files had 0x G20/G21 and 72x G71, every
  // G71 a roughing cycle. These oracles FAIL on the pre-fix code and PASS after.
  it("parse: a G71 roughing cycle does NOT set units — stays 'unknown' with no G20/G21 (was 'mm')", () => {
    const rough = "O5\nT0101\nG96 S800 M3\nG71 X3.01 Z-.74 B60 D.003 U.001 H.070 F1. J16 M33 M73\nM30";
    const r = parser.parse({ source_path: "fx", text: rough });
    expect(r.program.header.units).toBe("unknown"); // pre-fix: "mm" (corrupted by the G71 cycle)
    // …and G71 is still correctly classified as a canned cycle (the cannedForOp scan, not units)
    const op = r.program.operations.find((o) => o.tool_id === "T0101");
    expect(op!.canned_cycles).toContain("G71");
  });

  it("parse: a G70 finishing cycle does NOT set units — stays 'unknown' with no G20/G21 (was 'inch')", () => {
    const finish = "O7\nT0202\nG70 P100 Q200\nM30";
    const r = parser.parse({ source_path: "fx", text: finish });
    expect(r.program.header.units).toBe("unknown"); // pre-fix: "inch" (the G70 side of the same bug)
    const op = r.program.operations.find((o) => o.tool_id === "T0202");
    expect(op!.canned_cycles).toContain("G70");
  });

  // --- feed mode -------------------------------------------------------
  it("parse: G94/G95 toggles feed_mode per op", () => {
    const src = `T0101
G95 F.2
G1 X10.
T0202
G94 F150
G1 Z-1.
M30`;
    const r = parser.parse({ source_path: "fx", text: src });
    // No leading setup op since block 0 is already a T-change.
    expect(r.program.operations[0].feed_mode).toBe("per_rev");
    expect(r.program.operations[1].feed_mode).toBe("per_min");
  });

  // --- work offset -----------------------------------------------------
  it("parse: first G54/G55 seen wins in header.work_offset", () => {
    const src = `G55\nT0101\nM30`;
    const r = parser.parse({ source_path: "fx", text: src });
    expect(r.program.header.work_offset).toBe("G55");
  });

  // --- comments extraction ---------------------------------------------
  it("parse: inline (comments) are collected per op", () => {
    const src = `(HEADER COMMENT)
T0101
(DRILL HOLE)
G0 X0.
M30`;
    const r = parser.parse({ source_path: "fx", text: src });
    const toolOp = r.program.operations.find((o) => o.tool_id !== "");
    expect(toolOp!.comments.some((c) => c.includes("DRILL HOLE"))).toBe(true);
  });

  // --- never-throw -----------------------------------------------------
  it("parse: empty input returns parse_ok=true with no operations after setup tail", () => {
    const r = parser.parse({ source_path: "fx", text: "" });
    expect(r.program.parse_ok).toBe(true);
    expect(r.program.operations.length).toBe(1);       // setup op only
    expect(r.program.end_code).toBe("none");
  });

  it("parse: junk/non-NC text yields parse_ok=true with warnings logged if any", () => {
    const r = parser.parse({ source_path: "fx", text: "not a program\nblah blah" });
    expect(r.program.parse_ok).toBe(true);
    expect(r.program.operations.length).toBeGreaterThanOrEqual(1);
  });

  it("parse: rejects invalid input shape without throwing", () => {
    // @ts-expect-error deliberately bad input
    const r = parser.parse({ source_path: 123, text: "" });
    expect(r.ok).toBe(false);
    expect(r.warnings[0]).toContain("schema validation failed");
  });

  it("parse: max_lines truncation produces warning", () => {
    const src = Array.from({ length: 20 }, (_, i) => `N${i + 1}G0 X${i}.`).join("\n");
    const r = parser.parse({ source_path: "fx", text: src, max_lines: 5 });
    expect(r.warnings.some((w) => w.includes("truncated"))).toBe(true);
    expect(r.program.blocks_parsed).toBeLessThanOrEqual(5);
  });

  // --- summarizeAsFeatures ---------------------------------------------
  it("summarizeAsFeatures: one feature row per operation with tool/feed/sfm", () => {
    const r = parser.parse({ source_path: "jmdie/alcoa/p1.min", text: basicTwoOp });
    const rows = parser.summarizeAsFeatures(r.program);
    expect(rows.length).toBe(r.program.operations.length);
    const hasT1 = rows.some((x) => x.tool_id === "T0101" && x.op_kind === "turning");
    expect(hasT1).toBe(true);
    expect(rows[0].source_path).toBe("jmdie/alcoa/p1.min");
  });

  // --- self-awareness --------------------------------------------------
  it("self-awareness metadata", () => {
    const meta = MINFileParserEngine.getSelfAwareness();
    expect(meta.name).toBe("MINFileParserEngine");
    expect(meta.capabilities).toContain("parse");
    expect(meta.capabilities).toContain("summarizeAsFeatures");
    expect(meta.milestone).toContain("U-LEARN-03");
    expect(meta.never_throws).toBe(true);
  });

  // --- tools_used dedup ------------------------------------------------
  it("parse: tools_used is deduplicated even when the same T-word reappears", () => {
    const src = `T0101
G0 X1.
T0202
G0 X1.
T0101
G0 X1.
M30`;
    const r = parser.parse({ source_path: "fx", text: src });
    expect(r.program.tools_used.length).toBe(2);
  });

  // --- probing ---------------------------------------------------------
  it("parse: G31 skip/probe classifies as probing", () => {
    const src = `T0707
G0 X0. Z5.
G31 Z-20. F.5
M30`;
    const r = parser.parse({ source_path: "fx", text: src });
    const probe = r.program.operations.find((o) => o.tool_id === "T0707");
    expect(probe!.kind).toBe("probing");
  });
});
