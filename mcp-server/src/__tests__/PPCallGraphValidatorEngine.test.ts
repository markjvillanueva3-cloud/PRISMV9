/**
 * PPCallGraphValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPCallGraphValidatorEngine,
  ppCallGraphValidatorEngine,
} from "../engines/PPCallGraphValidatorEngine.js";

describe("PPCallGraphValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppCallGraphValidatorEngine).toBeInstanceOf(PPCallGraphValidatorEngine);
  });

  describe("callee_not_defined", () => {
    it("flags M98 P9999 with no O9999", () => {
      const code = `%
O1001
M98 P9999
M30
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "callee_not_defined");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag when subprogram defined", () => {
      const code = `%
O1001
M98 P2000
M30
O2000
G1 X10.
M99
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "callee_not_defined");
      expect(m.length).toBe(0);
    });
  });

  describe("main_program_has_m99", () => {
    it("flags main ending with M99 only", () => {
      const code = `%
O1001
G1 X10.
M99
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "main_program_has_m99");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag main with M99 AND M30", () => {
      const code = `%
O1001
M99
M30
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "main_program_has_m99");
      expect(m.length).toBe(0);
    });

    it("does not flag subprogram with M99", () => {
      const code = `%
O1001
M98 P2000
M30
O2000
G1 X10.
M99
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "main_program_has_m99");
      expect(m.length).toBe(0);
    });
  });

  describe("excessive_repeat_count", () => {
    it("flags L1000", () => {
      const code = `%
O1001
M98 P2000 L1000
M30
O2000
M99
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "excessive_repeat_count");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag normal repeat", () => {
      const code = `%
O1001
M98 P2000 L5
M30
O2000
M99
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "excessive_repeat_count");
      expect(m.length).toBe(0);
    });

    it("custom max_repeat_count respected", () => {
      const code = `%
O1001
M98 P2000 L50
M30
O2000
M99
%`;
      const r = ppCallGraphValidatorEngine.validate(code, {
        max_repeat_count: 10,
      });
      const m = r.issues.filter((i) => i.kind === "excessive_repeat_count");
      expect(m.length).toBe(1);
    });
  });

  describe("direct_recursion", () => {
    it("flags O2000 calling itself", () => {
      const code = `%
O1001
M98 P2000
M30
O2000
G1 X10.
M98 P2000
M99
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "direct_recursion");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag non-recursive chain", () => {
      const code = `%
O1001
M98 P2000
M30
O2000
M98 P3000
M99
O3000
G1 X10.
M99
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "direct_recursion");
      expect(m.length).toBe(0);
    });
  });

  describe("subprogram_missing_return", () => {
    it("flags sub without M99", () => {
      const code = `%
O1001
M98 P2000
M30
O2000
G1 X10.
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "subprogram_missing_return");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag sub with M99", () => {
      const code = `%
O1001
M98 P2000
M30
O2000
G1 X10.
M99
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "subprogram_missing_return");
      expect(m.length).toBe(0);
    });

    it("accepts M30 as sub terminator", () => {
      const code = `%
O1001
M98 P2000
M30
O2000
G1 X10.
M30
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "subprogram_missing_return");
      expect(m.length).toBe(0);
    });
  });

  describe("forward_reference", () => {
    it("flags M98 before sub definition", () => {
      const code = `%
O1001
M98 P2000
M30
O2000
M99
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "forward_reference");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("info");
    });

    it("does not flag when sub defined first", () => {
      const code = `%
O2000
G1 X10.
M99
O1001
M98 P2000
M30
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "forward_reference");
      expect(m.length).toBe(0);
    });

    it("check_forward_reference=false suppresses", () => {
      const code = `%
O1001
M98 P2000
M30
O2000
M99
%`;
      const r = ppCallGraphValidatorEngine.validate(code, {
        check_forward_reference: false,
      });
      const m = r.issues.filter((i) => i.kind === "forward_reference");
      expect(m.length).toBe(0);
    });
  });

  describe("nested_depth_exceeded", () => {
    it("flags chain exceeding max_depth", () => {
      const code = `%
O1001
M98 P2000
M30
O2000
M98 P3000
M99
O3000
M98 P4000
M99
O4000
M98 P5000
M99
O5000
M98 P6000
M99
O6000
G1 X10.
M99
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "nested_depth_exceeded");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag within limit", () => {
      const code = `%
O1001
M98 P2000
M30
O2000
G1 X10.
M99
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "nested_depth_exceeded");
      expect(m.length).toBe(0);
    });

    it("custom max_nesting_depth respected", () => {
      const code = `%
O1001
M98 P2000
M30
O2000
M98 P3000
M99
O3000
G1 X10.
M99
%`;
      const r = ppCallGraphValidatorEngine.validate(code, {
        max_nesting_depth: 2,
      });
      const m = r.issues.filter((i) => i.kind === "nested_depth_exceeded");
      expect(m.length).toBe(1);
    });
  });

  describe("duplicate_definition", () => {
    it("flags O2000 defined twice", () => {
      const code = `%
O1001
M98 P2000
M30
O2000
M99
O2000
M99
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "duplicate_definition");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag distinct sub numbers", () => {
      const code = `%
O1001
M98 P2000
M98 P3000
M30
O2000
M99
O3000
M99
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "duplicate_definition");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("counts programs", () => {
      const code = `%
O1001
M98 P2000
M30
O2000
M99
O3000
M99
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      expect(r.summary.program_count).toBe(3);
      expect(r.summary.main_program_count).toBe(1);
      expect(r.summary.subprogram_count).toBe(2);
    });

    it("counts total_calls", () => {
      const code = `%
O1001
M98 P2000
M98 P3000
M30
O2000
M99
O3000
M99
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      expect(r.summary.total_calls).toBe(2);
    });

    it("tracks max_nesting_depth", () => {
      const code = `%
O1001
M98 P2000
M30
O2000
M98 P3000
M99
O3000
M99
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      expect(r.summary.max_nesting_depth).toBe(3);
    });

    it("builds programs array", () => {
      const code = `%
O1001
M98 P2000
M30
O2000
M99
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      expect(r.summary.programs.length).toBe(2);
      expect(r.summary.programs[0].o_number).toBe(1001);
      expect(r.summary.programs[0].is_main).toBe(true);
      expect(r.summary.programs[1].o_number).toBe(2000);
      expect(r.summary.programs[1].has_return).toBe(true);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean program", () => {
      const code = `%
O1001
M98 P2000
M30
O2000
G1 X10.
M99
%`;
      const q = ppCallGraphValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.program_count).toBe(2);
    });

    it("returns valid=false for missing sub", () => {
      const code = `%
O1001
M98 P9999
M30
%`;
      const q = ppCallGraphValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
      expect(q.errors).toBeGreaterThan(0);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppCallGraphValidatorEngine.defaultOptions();
      expect(o.max_nesting_depth).toBe(4);
      expect(o.max_repeat_count).toBe(999);
      expect(o.check_forward_reference).toBe(true);
      expect(o.check_nesting_depth).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppCallGraphValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
      expect(r.summary.program_count).toBe(0);
    });

    it("handles main-only program with no subs", () => {
      const code = `%
O1001
G1 X10.
M30
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      expect(r.summary.program_count).toBe(1);
      expect(r.summary.total_calls).toBe(0);
    });

    it("ignores M98 inside comments", () => {
      const code = `%
O1001
(M98 P2000 mentioned in comment)
G1 X10.
M30
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      expect(r.summary.total_calls).toBe(0);
    });

    it("handles M98 with no P (malformed)", () => {
      const code = `%
O1001
M98
M30
%`;
      const r = ppCallGraphValidatorEngine.validate(code);
      expect(r.summary.total_calls).toBe(0);
    });
  });
});
