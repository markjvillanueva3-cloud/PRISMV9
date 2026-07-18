/**
 * extract-wedm-program-ground-truth.test.mjs — vitest suite
 * Locks pure-function contract for the JM Die WEDM Mitsubishi W31MV-2 .NC ground-truth extractor.
 * @unit U-MIKE-WEDM-GROUND-TRUTH-EXTRACT
 * @slot mike
 */

import { describe, it, expect } from "vitest";
import {
  parseProgramLabel,
  parseDateComment,
  parseHRegisters,
  parseECodes,
  countPasses,
  detectWireEDMMcodes,
  detectOffsetCompensation,
  detectTaperCutting,
  parseWorkZeroSets,
  parseMotionStats,
  parseDwells,
  extractWEDMGroundTruth,
  buildWEDMGroundTruth,
} from "./extract-wedm-program-ground-truth.mjs";

// Synthetic snippet mirroring NOZE TEST.NC structure.
const SAMPLE_NOZE = `%
L001
(05/24/22)

H175 = 0.0000


H1 =0. + H175
H2 =0. + H175
H3 =0. + H175

N5 G90
N10 M91 (Adaptive Control Off)
N15 G92 X0.0 Y0.0
N20 G1 X0. Y0. F25.0
N25 M20 (Thread Wire)
N30 M78 M78 (Fill Tank)
N35 M80 (Water On)
N40 M82 (Wire On)
N45 M84 (Power On)
N50 E2821 H1 F.16 (PASS=1)
N55 M90 (Adaptive Control On)
N60 G1 X-.11614 Y.0754 U-.04786 V0.
N65 G1 X-.13934 Y.0754 U0. V0.
N130 G4 X5. (Dwell)
N135 G1 X-.11777 Y-.05546 F25.0
N160 E2822 H2 F.23 (PASS=2)
N165 G1 X-.11614 Y-.07735 U-.00702 V.00061
N230 G42 G1 X-.11614 Y.07735
N270 E2823 H3 F.20 (PASS=3)
N300 G40
M85
M83
M81
M22 (Cut Wire)
M2
%`;

describe("parseProgramLabel", () => {
  it("extracts L001 form", () => expect(parseProgramLabel(SAMPLE_NOZE)).toBe("L001"));
  it("returns null when no label", () => expect(parseProgramLabel("M2\n")).toBeNull());
});

describe("parseDateComment", () => {
  it("captures shop-floor date format", () => expect(parseDateComment(SAMPLE_NOZE)).toBe("05/24/22"));
  it("returns null when absent", () => expect(parseDateComment("L001\nM2\n")).toBeNull());
});

describe("parseHRegisters", () => {
  it("captures H175 master + per-pass H1..H3", () => {
    const regs = parseHRegisters(SAMPLE_NOZE);
    expect(regs.H175).toBe("0.0000");
    expect(regs.H1).toBe("0. + H175");
    expect(regs.H2).toBe("0. + H175");
    expect(regs.H3).toBe("0. + H175");
  });
});

describe("parseECodes", () => {
  it("captures E#### + H-register + feed + pass-label triplets", () => {
    const ecodes = parseECodes(SAMPLE_NOZE);
    expect(ecodes.length).toBe(3);
    expect(ecodes[0]).toEqual({ code: "E2821", h_register: "H1", feed_in_min: 0.16, pass_label: "PASS=1" });
    expect(ecodes[1]).toEqual({ code: "E2822", h_register: "H2", feed_in_min: 0.23, pass_label: "PASS=2" });
    expect(ecodes[2]).toEqual({ code: "E2823", h_register: "H3", feed_in_min: 0.20, pass_label: "PASS=3" });
  });
});

describe("countPasses", () => {
  it("returns the max pass number from (PASS=N) comments", () => {
    expect(countPasses(SAMPLE_NOZE)).toBe(3);
  });
  it("returns 0 when no PASS comments", () => {
    expect(countPasses("M2\n")).toBe(0);
  });
});

describe("detectWireEDMMcodes", () => {
  it("detects the full wire-cut envelope M-codes", () => {
    const f = detectWireEDMMcodes(SAMPLE_NOZE);
    expect(f.M20_thread_wire).toBe(true);
    expect(f.M22_cut_wire).toBe(true);
    expect(f.M78_fill_tank).toBe(true);
    expect(f.M80_water_on).toBe(true);
    expect(f.M82_wire_on).toBe(true);
    expect(f.M84_power_on).toBe(true);
    expect(f.M90_adaptive_on).toBe(true);
    expect(f.M91_adaptive_off).toBe(true);
  });
});

describe("detectOffsetCompensation", () => {
  it("captures G40/G41/G42 usage", () => {
    const used = detectOffsetCompensation(SAMPLE_NOZE);
    expect(used).toContain("G40_cancel");
    expect(used).toContain("G42_right");
  });
  it("returns empty array when no compensation", () => {
    expect(detectOffsetCompensation("M2\n")).toEqual([]);
  });
});

describe("detectTaperCutting", () => {
  it("flags taper when UV coords appear on G1 lines", () => {
    const t = detectTaperCutting(SAMPLE_NOZE);
    expect(t.has_taper_cutting).toBe(true);
    expect(t.taper_move_count).toBeGreaterThanOrEqual(2);
  });
  it("flags false when no UV present", () => {
    const t = detectTaperCutting("G1 X1.0 Y2.0\nG1 X3.0 Y4.0\n");
    expect(t.has_taper_cutting).toBe(false);
    expect(t.taper_move_count).toBe(0);
  });
});

describe("parseWorkZeroSets", () => {
  it("captures G92 X0 Y0 work-zero set", () => {
    const zeros = parseWorkZeroSets(SAMPLE_NOZE);
    expect(zeros.length).toBe(1);
    expect(zeros[0]).toEqual({ x: 0, y: 0 });
  });
});

describe("parseMotionStats", () => {
  it("counts G0/G1/G2/G3 motion command frequencies", () => {
    const m = parseMotionStats(SAMPLE_NOZE);
    expect(m.linear_g1).toBeGreaterThan(5);
    expect(m.rapid_g0).toBe(0);
  });
});

describe("parseDwells", () => {
  it("captures dwell seconds from G4 X#", () => {
    const d = parseDwells(SAMPLE_NOZE);
    expect(d.length).toBe(1);
    expect(d[0].seconds).toBe(5);
  });
});

describe("extractWEDMGroundTruth", () => {
  it("returns file_not_found envelope on missing path (R12 fail-loud)", () => {
    const r = extractWEDMGroundTruth({
      program: "GHOST", path: "H:/this/never/existed.NC",
    });
    expect(r._error).toBe("file_not_found");
  });
});

describe("buildWEDMGroundTruth — 3 real JM Die WEDM programs", () => {
  it("emits the full report with all 3 programs", () => {
    const report = buildWEDMGroundTruth();
    expect(report.schemaVersion).toBe("1.0.0");
    expect(report.advisoryOnly).toBe(true);
    expect(report.must_human_verify).toBe(true);
    expect(report.programs).toHaveLength(3);
    const names = report.programs.map((p) => p.program);
    expect(names).toContain("ITW SHAKEPROOF 500-30540-24000-04");
    expect(names).toContain("NOZE TEST");
    expect(names).toContain("Wire Program - 5 inch square");
  });

  it("summary totals reconcile with per-program rollup", () => {
    const report = buildWEDMGroundTruth();
    const ecode_sum = report.programs.reduce((s, p) => s + (p.e_code_count ?? 0), 0);
    expect(report.summary.total_e_code_invocations).toBe(ecode_sum);
  });

  it("NOZE TEST has multiple passes + UV taper moves", () => {
    const report = buildWEDMGroundTruth();
    const noze = report.programs.find((p) => p.program === "NOZE TEST");
    expect(noze?.pass_count).toBeGreaterThanOrEqual(2);
    expect(noze?.taper_cutting.has_taper_cutting).toBe(true);
  });
});
