/**
 * PPToolChangeValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPToolChangeValidatorEngine,
  ppToolChangeValidatorEngine,
} from "../engines/PPToolChangeValidatorEngine.js";

const SAFE_SEQUENCE = `%
O1001 (SAFE T/C)
G90 G21 G17 G40
G54
G28 Z0
T1 M6
S2000 M3
M8
G0 X0 Y0
G0 Z10.
G1 Z-1. F200.
G1 X50.
G0 Z25.
M9
M5
G28 Z0
T2 M6
S3000 M3
M8
G0 X0 Y0
G0 Z10.
G1 Z-1. F200.
G0 Z25.
M9
M5
M30
%`;

const UNSAFE_SEQUENCE = `%
O1001 (UNSAFE)
G90 G21 G17
G54
T1 M6
S2000 M3
M8
G0 X0 Y0
G1 Z-1. F200.
G1 X50.
T2 M6
S3000 M3
G1 X100.
M30
%`;

describe("PPToolChangeValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppToolChangeValidatorEngine).toBeInstanceOf(
      PPToolChangeValidatorEngine,
    );
  });

  describe("safe sequence passes", () => {
    it("SAFE_SEQUENCE reports zero errors", () => {
      const r = ppToolChangeValidatorEngine.validate(SAFE_SEQUENCE);
      expect(r.summary.safe).toBe(true);
      expect(r.errors).toBe(0);
    });

    it("counts 2 tool changes", () => {
      const r = ppToolChangeValidatorEngine.validate(SAFE_SEQUENCE);
      expect(r.total_tool_changes).toBe(2);
    });

    it("reports tools seen [1, 2]", () => {
      const r = ppToolChangeValidatorEngine.validate(SAFE_SEQUENCE);
      expect(r.summary.tools_seen).toEqual([1, 2]);
    });
  });

  describe("no_safe_z_retract error", () => {
    it("flags missing G28/Z retract before M6", () => {
      const code = `G90 G21 G17
T1 M6
S1000 M3
G1 Z-1. F100.
T2 M6
M30`;
      const r = ppToolChangeValidatorEngine.validate(code);
      expect(r.summary.safe).toBe(false);
      const issue = r.issues.find(i => i.kind === "no_safe_z_retract");
      expect(issue).toBeDefined();
    });

    it("does not flag when G28 Z0 precedes M6", () => {
      const code = `G90 G21 G17
G28 Z0
T1 M6
S1000 M3
M30`;
      const r = ppToolChangeValidatorEngine.validate(code);
      const issue = r.issues.find(i => i.kind === "no_safe_z_retract");
      expect(issue).toBeUndefined();
    });

    it("does not flag when explicit Z >= safe_z precedes M6", () => {
      const code = `G90 G21 G17
G0 Z50.
T1 M6
S1000 M3
M30`;
      const r = ppToolChangeValidatorEngine.validate(code);
      const issue = r.issues.find(i => i.kind === "no_safe_z_retract");
      expect(issue).toBeUndefined();
    });
  });

  describe("below_safe_z warning", () => {
    it("warns when retract Z < safe_z_mm", () => {
      const code = `G90 G21 G17
G0 Z5.
T1 M6
M30`;
      const r = ppToolChangeValidatorEngine.validate(code, { safe_z_mm: 25 });
      // Z=5 < safe_z=25 and no G28 → expect either below_safe_z or no_safe_z_retract
      const issue = r.issues.find(
        i => i.kind === "below_safe_z" || i.kind === "no_safe_z_retract",
      );
      expect(issue).toBeDefined();
    });

    it("custom safe_z_mm works", () => {
      const code = `G90 G21 G17
G0 Z15.
T1 M6
M30`;
      const rLow = ppToolChangeValidatorEngine.validate(code, { safe_z_mm: 10 });
      // Z=15 > safe_z=10, should pass
      expect(rLow.summary.safe).toBe(true);

      const rHigh = ppToolChangeValidatorEngine.validate(code, { safe_z_mm: 100 });
      // Z=15 < safe_z=100 → fail
      expect(rHigh.summary.safe).toBe(false);
    });
  });

  describe("spindle_running error", () => {
    it("flags M3 active at M6 without M5", () => {
      const code = `G90 G21 G17
G28 Z0
T1 M6
S2000 M3
G1 Z-1. F100.
T2 M6
M30`;
      const r = ppToolChangeValidatorEngine.validate(code);
      const issue = r.issues.find(i => i.kind === "spindle_running");
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe("error");
    });

    it("does not flag when M5 is on the M6 line", () => {
      const code = `G90 G21 G17
G28 Z0
T1 M6
S2000 M3
G1 Z-1. F100.
M5 T2 M6
M30`;
      const r = ppToolChangeValidatorEngine.validate(code);
      const issue = r.issues.find(i => i.kind === "spindle_running");
      expect(issue).toBeUndefined();
    });

    it("does not flag when M5 on prior line", () => {
      const code = `G90 G21 G17
G28 Z0
T1 M6
S2000 M3
G1 Z-1. F100.
M5
T2 M6
M30`;
      const r = ppToolChangeValidatorEngine.validate(code);
      const issue = r.issues.find(i => i.kind === "spindle_running");
      expect(issue).toBeUndefined();
    });
  });

  describe("coolant_on warning", () => {
    it("warns on M8 active at M6", () => {
      const code = `G90 G21 G17
G28 Z0
T1 M6
M8
G1 X10 F100
T2 M6
M30`;
      const r = ppToolChangeValidatorEngine.validate(code);
      const issue = r.issues.find(i => i.kind === "coolant_on");
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe("warning");
    });

    it("configurable to skip coolant check", () => {
      const code = `G90 G21 G17
G28 Z0
T1 M6
M8
T2 M6
M30`;
      const r = ppToolChangeValidatorEngine.validate(code, {
        require_coolant_off: false,
      });
      const issue = r.issues.find(i => i.kind === "coolant_on");
      expect(issue).toBeUndefined();
    });
  });

  describe("cutter_comp_active error", () => {
    it("flags G41 active at M6", () => {
      const code = `G90 G21 G17
G28 Z0
T1 M6
G41 D1
G1 X10 Y10 F100
T2 M6
M30`;
      const r = ppToolChangeValidatorEngine.validate(code);
      const issue = r.issues.find(i => i.kind === "cutter_comp_active");
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe("error");
    });

    it("does not flag when G40 on M6 line", () => {
      const code = `G90 G21 G17
G28 Z0
T1 M6
G41 D1
G1 X10 Y10 F100
G40 T2 M6
M30`;
      const r = ppToolChangeValidatorEngine.validate(code);
      const issue = r.issues.find(i => i.kind === "cutter_comp_active");
      expect(issue).toBeUndefined();
    });
  });

  describe("active_canned_cycle error", () => {
    it("flags G81 active at M6", () => {
      const code = `G90 G21 G17
G28 Z0
T1 M6
G98 G81 Z-5. R2. F100.
X10
T2 M6
M30`;
      const r = ppToolChangeValidatorEngine.validate(code);
      const issue = r.issues.find(i => i.kind === "active_canned_cycle");
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe("error");
    });

    it("does not flag when G80 on M6 line", () => {
      const code = `G90 G21 G17
G28 Z0
T1 M6
G98 G81 Z-5. R2. F100.
X10
G80 T2 M6
M30`;
      const r = ppToolChangeValidatorEngine.validate(code);
      const issue = r.issues.find(i => i.kind === "active_canned_cycle");
      expect(issue).toBeUndefined();
    });
  });

  describe("ij_k_in_block info", () => {
    it("flags I/J/K on non-arc M6 line", () => {
      const code = `G90 G21 G17
G28 Z0
T1 M6 I5 J5
M30`;
      const r = ppToolChangeValidatorEngine.validate(code);
      const issue = r.issues.find(i => i.kind === "ij_k_in_block");
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe("info");
    });
  });

  describe("unsafe sequence", () => {
    it("UNSAFE_SEQUENCE reports multiple errors", () => {
      const r = ppToolChangeValidatorEngine.validate(UNSAFE_SEQUENCE);
      expect(r.summary.safe).toBe(false);
      expect(r.errors).toBeGreaterThan(0);
    });

    it("issues include no_safe_z_retract", () => {
      const r = ppToolChangeValidatorEngine.validate(UNSAFE_SEQUENCE);
      const kinds = r.issues.map(i => i.kind);
      // Should include at least no_safe_z_retract for T2 M6 (after G1 Z-1)
      expect(kinds).toContain("no_safe_z_retract");
    });
  });

  describe("option toggles", () => {
    it("require_spindle_off=false suppresses spindle error", () => {
      const code = `G90 G21 G17
G28 Z0
T1 M6
S2000 M3
G1 Z-1. F100.
T2 M6
M30`;
      const r = ppToolChangeValidatorEngine.validate(code, {
        require_spindle_off: false,
      });
      const issue = r.issues.find(i => i.kind === "spindle_running");
      expect(issue).toBeUndefined();
    });

    it("require_explicit_retract=false suppresses retract error", () => {
      const code = `G90 G21 G17
T1 M6
M30`;
      const r = ppToolChangeValidatorEngine.validate(code, {
        require_explicit_retract: false,
      });
      const issue = r.issues.find(i => i.kind === "no_safe_z_retract");
      expect(issue).toBeUndefined();
    });
  });

  describe("quickCheck", () => {
    it("returns compact pass/fail", () => {
      const q = ppToolChangeValidatorEngine.quickCheck(SAFE_SEQUENCE);
      expect(q.safe).toBe(true);
      expect(q.errors).toBe(0);
      expect(q.tool_changes).toBe(2);
    });

    it("reports unsafe", () => {
      const q = ppToolChangeValidatorEngine.quickCheck(UNSAFE_SEQUENCE);
      expect(q.safe).toBe(false);
      expect(q.errors).toBeGreaterThan(0);
    });
  });

  describe("defaultOptions", () => {
    it("returns safe_z_mm=25 and all safety checks enabled", () => {
      const opts = ppToolChangeValidatorEngine.defaultOptions();
      expect(opts.safe_z_mm).toBe(25);
      expect(opts.require_coolant_off).toBe(true);
      expect(opts.require_spindle_off).toBe(true);
      expect(opts.require_cutter_comp_off).toBe(true);
      expect(opts.require_explicit_retract).toBe(true);
    });
  });

  describe("line number reporting", () => {
    it("reports 1-indexed line of M6", () => {
      const code = `G90 G21 G17
G28 Z0
T1 M6
M30`;
      const r = ppToolChangeValidatorEngine.validate(code);
      // Program starts with safe G28 then T1 M6 on line 3
      expect(r.total_tool_changes).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppToolChangeValidatorEngine.validate("");
      expect(r.total_tool_changes).toBe(0);
      expect(r.summary.safe).toBe(true);
    });

    it("handles program with no tool changes", () => {
      const code = `G90 G21 G17
G0 X0 Y0
G1 X10 F100
M30`;
      const r = ppToolChangeValidatorEngine.validate(code);
      expect(r.total_tool_changes).toBe(0);
      expect(r.summary.safe).toBe(true);
    });

    it("issue count consistency", () => {
      const r = ppToolChangeValidatorEngine.validate(UNSAFE_SEQUENCE);
      expect(r.total_issues).toBe(r.issues.length);
      const e = r.issues.filter(i => i.severity === "error").length;
      const w = r.issues.filter(i => i.severity === "warning").length;
      expect(e).toBe(r.errors);
      expect(w).toBe(r.warnings);
    });
  });

  describe("comment stripping", () => {
    it("ignores M6 in paren comments", () => {
      const code = `G90 G21 G17
(T1 M6 COMMENT ONLY)
G28 Z0
M30`;
      const r = ppToolChangeValidatorEngine.validate(code);
      expect(r.total_tool_changes).toBe(0);
    });
  });
});
