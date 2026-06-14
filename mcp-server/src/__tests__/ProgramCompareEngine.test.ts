/**
 * ProgramCompareEngine — behavioral test suite.
 *
 * Closes CK-MS12::U02 ("ProgramCompareEngine — diff two G-code programs
 * with physics"). The engine was already built + wired into camDispatcher
 * (lazy import :514) and surfaced via prism_quality:program_compare, but
 * shipped with zero behavioral coverage.
 *
 * Assertions check real invariants: LCS diff correctness, normalization
 * (comment/blocknum/whitespace/case insensitivity), the physics snapshot
 * math (incl. the engine's constant Kienzle force estimate), cycle-time
 * ordering, tool-set algebra, safety improvement/regression set logic,
 * and the report formatter. No toBeDefined() stubs.
 */

import { describe, it, expect } from "vitest";
import {
  programCompareEngine,
  type FullComparison,
} from "../engines/ProgramCompareEngine.js";

// Minimal deterministic programs sharing tool/struct, differing only in S.
const PROG_A = [
  "%", "O1000",
  "G54 G17 G40 G49",
  "T1 M6",
  "S2000 M3",
  "G0 X0 Y0 Z5",
  "G1 Z-1 F100",
  "G1 X10 F200",
  "M9", "G28", "M30", "%",
].join("\n");

const PROG_B = PROG_A.replace("S2000 M3", "S3000 M3");

describe("ProgramCompareEngine — diffGCode (LCS + normalization)", () => {
  it("identical program → every line 'equal', zero add/remove", () => {
    const d = programCompareEngine.diffGCode(PROG_A, PROG_A);
    expect(d.length).toBeGreaterThan(0);
    expect(d.every(l => l.type === "equal")).toBe(true);
    expect(d.filter(l => l.type === "added" || l.type === "removed")).toHaveLength(0);
  });

  it("normalization: comments, N-block numbers, whitespace, case are ignored", () => {
    const a = "N10 G1 X10 F200 (rough pass)";
    const b = "g1   x10    f200 ; same move";
    const d = programCompareEngine.diffGCode(a, b);
    expect(d).toHaveLength(1);
    expect(d[0].type).toBe("equal");
  });

  it("a single changed line yields exactly one removed + one added (rest equal)", () => {
    const d = programCompareEngine.diffGCode(PROG_A, PROG_B);
    expect(d.filter(l => l.type === "removed")).toHaveLength(1);
    expect(d.filter(l => l.type === "added")).toHaveLength(1);
    expect(d.find(l => l.type === "removed")!.line_a).toContain("S2000");
    expect(d.find(l => l.type === "added")!.line_b).toContain("S3000");
    // every equal line carries both side line numbers
    for (const e of d.filter(l => l.type === "equal")) {
      expect(typeof e.line_no_a).toBe("number");
      expect(typeof e.line_no_b).toBe("number");
    }
  });
});

describe("ProgramCompareEngine — compare summary & similarity", () => {
  it("identical programs → 100% similarity, 0 diffs", () => {
    const c = programCompareEngine.compare(PROG_A, PROG_A);
    expect(c.summary.similarity_pct).toBe(100);
    expect(c.summary.diff_count).toBe(0);
    expect(c.summary.lines_a).toBe(c.summary.lines_b);
  });

  it("one-line change → similarity < 100 and diff_count > 0, bounded [0,100]", () => {
    const c = programCompareEngine.compare(PROG_A, PROG_B);
    expect(c.summary.diff_count).toBeGreaterThan(0);
    expect(c.summary.similarity_pct).toBeLessThan(100);
    expect(c.summary.similarity_pct).toBeGreaterThanOrEqual(0);
    // blocks = normalized non-empty lines (≤ raw line count: % and Onnnn survive)
    expect(c.summary.blocks_a).toBeGreaterThan(0);
    expect(c.summary.blocks_a).toBeLessThanOrEqual(c.summary.lines_a);
  });
});

describe("ProgramCompareEngine — comparePhysics", () => {
  it("extracts max/min spindle + feed and the constant Kienzle force estimate", () => {
    const p = programCompareEngine.comparePhysics(PROG_A, PROG_B);
    // A: only S2000 ; feeds 100,200
    expect(p.program_a.max_spindle_rpm).toBe(2000);
    expect(p.program_a.min_spindle_rpm).toBe(2000);
    expect(p.program_a.max_feed_mmmin).toBe(200);
    expect(p.program_a.min_feed_mmmin).toBe(100);
    // Engine's fixed Kienzle approx: 1500 MPa · 0.1 mm · 1 mm = 150 N (constant)
    expect(p.program_a.est_force_n).toBe(150);
    expect(p.program_b.est_force_n).toBe(150);
    // est MRR = maxFeed·ap(1)·ae(5)/1000 = 200·5/1000 = 1.0 cm³/min
    expect(p.program_a.est_mrr_cm3min).toBe(1);
  });

  it("delta reflects the S2000→S3000 change; force delta is 0 (constant)", () => {
    const p = programCompareEngine.comparePhysics(PROG_A, PROG_B);
    expect(p.delta.max_spindle_rpm).toBe(1000); // 3000 − 2000
    expect(p.delta.max_feed_mmmin).toBe(0);     // feeds unchanged
    expect(p.delta.est_force_pct).toBe(0);      // 150 vs 150
    expect(p.delta.est_mrr_pct).toBe(0);        // feeds unchanged
  });

  it("empty program → zeroed snapshot, no NaN/Infinity leak", () => {
    const p = programCompareEngine.comparePhysics("", "");
    expect(p.program_a.max_spindle_rpm).toBe(0);
    expect(p.program_a.max_feed_mmmin).toBe(0);
    expect(Number.isFinite(p.program_a.est_mrr_cm3min)).toBe(true);
    expect(p.delta.est_mrr_pct).toBe(0); // pctDiff guards va>0
  });
});

describe("ProgramCompareEngine — compareCycleTime", () => {
  it("identical programs → zero delta", () => {
    const c = programCompareEngine.compareCycleTime(PROG_A, PROG_A);
    expect(c.delta_s).toBe(0);
    expect(c.delta_pct).toBe(0);
    expect(c.program_a_s).toBe(c.program_b_s);
  });

  it("a program with an extra long feed move takes longer (B slower → positive delta)", () => {
    const slower = PROG_A.replace("M9", "G1 X500 F50\nM9");
    const c = programCompareEngine.compareCycleTime(PROG_A, slower);
    expect(c.program_b_s).toBeGreaterThan(c.program_a_s);
    expect(c.delta_s).toBeGreaterThan(0);
    expect(c.breakdown_b.total_s).toBe(
      c.breakdown_b.rapid_s + c.breakdown_b.feed_s + c.breakdown_b.dwell_s,
    );
  });

  it("G4 dwell P is accumulated into dwell_s (ms → s)", () => {
    const withDwell = PROG_A.replace("M9", "G4 P2000\nM9"); // 2000ms = 2s
    const c = programCompareEngine.compareCycleTime(PROG_A, withDwell);
    expect(c.breakdown_b.dwell_s).toBeCloseTo(2, 6);
    expect(c.breakdown_a.dwell_s).toBe(0);
  });
});

describe("ProgramCompareEngine — compareToolUsage", () => {
  it("shared tool with changed RPM is reported in sf_changes, not only_in_*", () => {
    const t = programCompareEngine.compareToolUsage(PROG_A, PROG_B);
    expect(t.only_in_a).toHaveLength(0);
    expect(t.only_in_b).toHaveLength(0);
    expect(t.in_both.map(x => x.number)).toEqual([1]);
    expect(t.sf_changes).toHaveLength(1);
    expect(t.sf_changes[0]).toMatchObject({
      tool_no: 1, rpm_a: 2000, rpm_b: 3000, feed_a: 100, feed_b: 100,
    });
  });

  it("a tool present only in B lands in only_in_b", () => {
    const b2 = PROG_B.replace("M9", "T2 M6\nS1500 M3\nG1 X1 F80\nM9");
    const t = programCompareEngine.compareToolUsage(PROG_A, b2);
    expect(t.only_in_b.map(x => x.number)).toEqual([2]);
    expect(t.only_in_a).toHaveLength(0);
    expect(t.in_both.map(x => x.number)).toEqual([1]);
  });
});

describe("ProgramCompareEngine — safety & dialect diffs", () => {
  it("identical programs → no safety improvements or regressions", () => {
    const c = programCompareEngine.compare(PROG_A, PROG_A);
    expect(c.safety.improvements).toHaveLength(0);
    expect(c.safety.regressions).toHaveLength(0);
  });

  it("dropping the program-end M30 in B is flagged as a regression", () => {
    const noEnd = PROG_A.replace("M30", "");
    const c = programCompareEngine.compare(PROG_A, noEnd);
    expect(c.safety.regressions.some(r => /program end/i.test(r))).toBe(true);
    expect(c.safety.improvements.some(r => /program end/i.test(r))).toBe(false);
  });

  it("cutter-comp present in A but not B emits a dialect note", () => {
    const aComp = PROG_A.replace("G1 X10 F200", "G41 D1\nG1 X10 F200");
    const c = programCompareEngine.compare(aComp, PROG_A);
    expect(c.dialect_notes.some(n => /cutter compensation/i.test(n))).toBe(true);
  });
});

describe("ProgramCompareEngine — generateReport", () => {
  it("renders a deterministic, section-complete text report", () => {
    const c: FullComparison = programCompareEngine.compare(PROG_A, PROG_B);
    const r = programCompareEngine.generateReport(c);
    expect(r).toContain("=== G-CODE COMPARISON REPORT ===");
    expect(r).toContain(`Similarity: ${c.summary.similarity_pct}%`);
    expect(r).toContain("--- CYCLE TIME ---");
    expect(r).toContain("--- CUTTING PHYSICS ---");
    expect(r).toContain("--- TOOLS ---");
    expect(r).toContain("--- SAFETY ---");
    // S/F change must surface in the TOOLS section
    expect(r).toContain("T1: RPM 2000→3000");
    // deterministic: same input → same report
    expect(programCompareEngine.generateReport(c)).toBe(r);
  });
});

describe("ProgramCompareEngine — dispatcher contract", () => {
  it("singleton exposes the full surface camDispatcher / prism_quality import", () => {
    expect(programCompareEngine.name).toBe("ProgramCompareEngine");
    expect(typeof programCompareEngine.compare).toBe("function");
    expect(typeof programCompareEngine.diffGCode).toBe("function");
    expect(typeof programCompareEngine.comparePhysics).toBe("function");
    expect(typeof programCompareEngine.compareCycleTime).toBe("function");
    expect(typeof programCompareEngine.compareToolUsage).toBe("function");
    expect(typeof programCompareEngine.generateReport).toBe("function");
    const c = programCompareEngine.compare(PROG_A, PROG_B);
    expect(c).toHaveProperty("summary");
    expect(c).toHaveProperty("physics");
    expect(c).toHaveProperty("cycle_time");
    expect(c).toHaveProperty("tools");
    expect(c).toHaveProperty("safety");
    expect(typeof programCompareEngine.generateReport(c)).toBe("string");
  });
});
