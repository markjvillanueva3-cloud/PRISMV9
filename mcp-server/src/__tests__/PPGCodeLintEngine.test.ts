/**
 * PPGCodeLintEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPGCodeLintEngine,
  ppGCodeLintEngine,
} from "../engines/PPGCodeLintEngine.js";

describe("PPGCodeLintEngine", () => {
  it("exports singleton", () => {
    expect(ppGCodeLintEngine).toBeInstanceOf(PPGCodeLintEngine);
  });

  describe("clean program", () => {
    it("passes a clean program", () => {
      const clean = `
        %
        O1001 (CLEAN TEST)
        G90 G21 G17
        G54
        T1 M6
        S2000 M3
        G0 X10 Y10
        G0 Z5
        G1 Z-1 F200
        G1 X20
        G0 Z25
        G40
        M5
        M30
        %
      `;
      const r = ppGCodeLintEngine.lint(clean);
      expect(r.summary.passed).toBe(true);
      expect(r.summary.critical).toBe(0);
    });
  });

  describe("rule: spindle-without-s", () => {
    it("flags M3 without prior S-word", () => {
      const bad = `
        G90 G21
        T1 M6
        M3
        G0 X0 Y0
        M30
      `;
      const r = ppGCodeLintEngine.lint(bad);
      expect(r.issues.some(i => i.rule === "spindle-without-s")).toBe(true);
      expect(r.summary.critical).toBeGreaterThan(0);
    });

    it("passes when S precedes M3", () => {
      const good = `
        G90 G21
        T1 M6
        S1200 M3
        M30
      `;
      const r = ppGCodeLintEngine.lint(good);
      expect(r.issues.some(i => i.rule === "spindle-without-s")).toBe(false);
    });

    it("passes when S and M3 on same block", () => {
      const good = `
        G90 G21
        T1 M6
        M3 S1200
        M30
      `;
      const r = ppGCodeLintEngine.lint(good);
      expect(r.issues.some(i => i.rule === "spindle-without-s")).toBe(false);
    });
  });

  describe("rule: tool-change-comp-active", () => {
    it("flags M6 while G41 is active", () => {
      const bad = `
        G90 G21
        T1 M6
        S1000 M3
        G41 D1 X10 Y10
        G1 Z-1 F100
        T2 M6
        M30
      `;
      const r = ppGCodeLintEngine.lint(bad);
      expect(r.issues.some(i => i.rule === "tool-change-comp-active")).toBe(true);
    });

    it("passes when G40 precedes M6", () => {
      const good = `
        G90 G21
        T1 M6
        S1000 M3
        G41 D1 X10 Y10
        G1 Z-1 F100
        G40
        T2 M6
        S2000 M3
        M30
      `;
      const r = ppGCodeLintEngine.lint(good);
      expect(r.issues.some(i => i.rule === "tool-change-comp-active")).toBe(false);
    });
  });

  describe("rule: tool-change-cycle-active", () => {
    it("flags M6 while drill cycle active", () => {
      const bad = `
        G90 G21
        T1 M6
        S1000 M3
        G81 X0 Y0 Z-5 R2 F100
        T2 M6
        M30
      `;
      const r = ppGCodeLintEngine.lint(bad);
      expect(r.issues.some(i => i.rule === "tool-change-cycle-active")).toBe(true);
    });

    it("passes when G80 precedes M6", () => {
      const good = `
        G90 G21
        T1 M6
        S1000 M3
        G81 X0 Y0 Z-5 R2 F100
        G80
        T2 M6
        S2000 M3
        M30
      `;
      const r = ppGCodeLintEngine.lint(good);
      expect(r.issues.some(i => i.rule === "tool-change-cycle-active")).toBe(false);
    });
  });

  describe("rule: feed-in-rapid", () => {
    it("flags F-word in G0 block", () => {
      const bad = `
        G90 G21
        S1000 M3
        G0 X10 Y10 F500
        M30
      `;
      const r = ppGCodeLintEngine.lint(bad);
      expect(r.issues.some(i => i.rule === "feed-in-rapid")).toBe(true);
    });
  });

  describe("rule: motion-inside-cycle", () => {
    it("flags G1 inside active drill cycle", () => {
      const bad = `
        G90 G21
        S1000 M3
        G81 X0 Y0 Z-5 R2 F100
        G1 X20 F200
        M30
      `;
      const r = ppGCodeLintEngine.lint(bad);
      expect(r.issues.some(i => i.rule === "motion-inside-cycle")).toBe(true);
    });
  });

  describe("rule: conflicting modal codes", () => {
    it("flags G90 and G91 on same block", () => {
      const bad = `
        G90 G91 X10
        M30
      `;
      const r = ppGCodeLintEngine.lint(bad);
      expect(r.issues.some(i => i.rule === "conflicting-distance-mode")).toBe(true);
    });

    it("flags G96 and G97 on same block", () => {
      const bad = `
        G96 G97 S1000
        M30
      `;
      const r = ppGCodeLintEngine.lint(bad);
      expect(r.issues.some(i => i.rule === "conflicting-spindle-mode")).toBe(true);
    });

    it("flags G20 and G21 on same block", () => {
      const bad = `
        G20 G21
        M30
      `;
      const r = ppGCodeLintEngine.lint(bad);
      expect(r.issues.some(i => i.rule === "conflicting-units")).toBe(true);
    });
  });

  describe("rule: missing-program-end", () => {
    it("flags program without M30 or M2", () => {
      const bad = `
        G90 G21
        S1000 M3
        G0 X0 Y0
      `;
      const r = ppGCodeLintEngine.lint(bad);
      expect(r.issues.some(i => i.rule === "missing-program-end")).toBe(true);
    });

    it("passes when M30 present", () => {
      const good = `G90 G21\nS1000 M3\nM30\n`;
      const r = ppGCodeLintEngine.lint(good);
      expect(r.issues.some(i => i.rule === "missing-program-end")).toBe(false);
    });

    it("passes when M2 present", () => {
      const good = `G90 G21\nS1000 M3\nM2\n`;
      const r = ppGCodeLintEngine.lint(good);
      expect(r.issues.some(i => i.rule === "missing-program-end")).toBe(false);
    });
  });

  describe("rule: cutter-comp-at-end", () => {
    it("flags G41 still active at program end", () => {
      const bad = `
        G90 G21
        S1000 M3
        G41 D1 X10 Y10
        M30
      `;
      const r = ppGCodeLintEngine.lint(bad);
      expect(r.issues.some(i => i.rule === "cutter-comp-at-end")).toBe(true);
    });
  });

  describe("rule: cycle-at-end", () => {
    it("flags G83 still active at program end", () => {
      const bad = `
        G90 G21
        S1000 M3
        G83 X0 Y0 Z-10 Q1 F100
        M30
      `;
      const r = ppGCodeLintEngine.lint(bad);
      expect(r.issues.some(i => i.rule === "cycle-at-end")).toBe(true);
    });
  });

  describe("rule: unbalanced-parens", () => {
    it("flags missing closing paren", () => {
      const bad = `(MISSING CLOSE\nG90 G21\nM30`;
      const r = ppGCodeLintEngine.lint(bad);
      expect(r.issues.some(i => i.rule === "unbalanced-parens")).toBe(true);
    });

    it("passes balanced parens", () => {
      const good = `(BALANCED)\nG90 G21\nS1000 M3\nM30`;
      const r = ppGCodeLintEngine.lint(good);
      expect(r.issues.some(i => i.rule === "unbalanced-parens")).toBe(false);
    });
  });

  describe("rule: duplicate-n-number", () => {
    it("flags repeated N-number", () => {
      const bad = `
        N10 G90 G21
        N20 S1000 M3
        N10 G0 X0
        N30 M30
      `;
      const r = ppGCodeLintEngine.lint(bad);
      expect(r.issues.some(i => i.rule === "duplicate-n-number")).toBe(true);
    });
  });

  describe("check (quick)", () => {
    it("returns passed=true for clean program", () => {
      const good = `G90 G21\nS1000 M3\nM30`;
      const r = ppGCodeLintEngine.check(good);
      expect(r.passed).toBe(true);
      expect(r.critical_count).toBe(0);
    });

    it("returns passed=false with critical count", () => {
      const bad = `M3\nG90 G21\nM30`; // M3 without S
      const r = ppGCodeLintEngine.check(bad);
      expect(r.passed).toBe(false);
      expect(r.critical_count).toBeGreaterThan(0);
    });
  });

  describe("filterIssues", () => {
    it("filters to critical only", () => {
      const bad = `
        M3
        G0 X10 F100
        G41 D1 X20
        M30
      `;
      const r = ppGCodeLintEngine.lint(bad);
      const crits = ppGCodeLintEngine.filterIssues(r, "critical");
      const wrs = ppGCodeLintEngine.filterIssues(r, "warning");
      expect(crits.every(i => i.severity === "critical")).toBe(true);
      expect(wrs.length).toBeGreaterThanOrEqual(crits.length);
    });
  });

  describe("report", () => {
    it("generates readable report", () => {
      const bad = `M3\nM30`;
      const r = ppGCodeLintEngine.lint(bad);
      const report = ppGCodeLintEngine.report(r);
      expect(report).toContain("Status:");
      expect(report).toContain("Critical:");
    });

    it("PASSED for clean", () => {
      const good = `G90 G21\nS1000 M3\nM30`;
      const r = ppGCodeLintEngine.lint(good);
      expect(ppGCodeLintEngine.report(r)).toContain("PASSED");
    });

    it("FAILED for critical", () => {
      const bad = `M3\nM30`;
      const r = ppGCodeLintEngine.lint(bad);
      expect(ppGCodeLintEngine.report(r)).toContain("FAILED");
    });
  });

  describe("listRules", () => {
    it("lists 14 rule IDs", () => {
      expect(ppGCodeLintEngine.listRules().length).toBe(14);
    });

    it("includes known rules", () => {
      const rules = ppGCodeLintEngine.listRules();
      expect(rules).toContain("spindle-without-s");
      expect(rules).toContain("tool-change-comp-active");
      expect(rules).toContain("missing-program-end");
    });
  });

  describe("summary metrics", () => {
    it("counts total issues by severity", () => {
      const bad = `
        M3
        G0 X0 F100
        G41 D1 X10
        M30
      `;
      const r = ppGCodeLintEngine.lint(bad);
      expect(r.summary.total_issues).toBe(
        r.summary.critical + r.summary.warnings + r.summary.info,
      );
    });

    it("tracks unique rules triggered", () => {
      const bad = `M3\nM30`;
      const r = ppGCodeLintEngine.lint(bad);
      expect(r.summary.rules_triggered).toContain("spindle-without-s");
    });

    it("passed=false when any critical", () => {
      const bad = `M3\nM30`;
      const r = ppGCodeLintEngine.lint(bad);
      expect(r.summary.passed).toBe(false);
    });
  });
});
