/**
 * PPMacroVariableValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPMacroVariableValidatorEngine,
  ppMacroVariableValidatorEngine,
} from "../engines/PPMacroVariableValidatorEngine.js";

describe("PPMacroVariableValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppMacroVariableValidatorEngine).toBeInstanceOf(PPMacroVariableValidatorEngine);
  });

  describe("undefined_variable_read", () => {
    it("flags #100 read before assignment", () => {
      const code = `%
O1001
G1 X#100 F100.
M30
%`;
      const r = ppMacroVariableValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "undefined_variable_read");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
      expect(m[0].details?.variable).toBe(100);
    });

    it("does not flag after assignment", () => {
      const code = `%
O1001
#100 = 5.
G1 X#100 F100.
M30
%`;
      const r = ppMacroVariableValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "undefined_variable_read");
      expect(m.length).toBe(0);
    });

    it("does not flag system variables (#1000+)", () => {
      const code = `%
O1001
#100 = #5021
M30
%`;
      const r = ppMacroVariableValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "undefined_variable_read");
      expect(m.length).toBe(0);
    });

    it("check_undefined=false suppresses", () => {
      const code = `%
O1001
G1 X#100 F100.
M30
%`;
      const r = ppMacroVariableValidatorEngine.validate(code, {
        check_undefined: false,
      });
      const m = r.issues.filter((i) => i.kind === "undefined_variable_read");
      expect(m.length).toBe(0);
    });
  });

  describe("division_by_macro_zero", () => {
    it("flags division by known-zero variable", () => {
      const code = `%
O1001
#10 = 0
#20 = 100 / #10
M30
%`;
      const r = ppMacroVariableValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "division_by_macro_zero");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag division by nonzero variable", () => {
      const code = `%
O1001
#10 = 5
#20 = 100 / #10
M30
%`;
      const r = ppMacroVariableValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "division_by_macro_zero");
      expect(m.length).toBe(0);
    });

    it("check_divide_by_zero=false suppresses", () => {
      const code = `%
O1001
#10 = 0
#20 = 100 / #10
M30
%`;
      const r = ppMacroVariableValidatorEngine.validate(code, {
        check_divide_by_zero: false,
      });
      const m = r.issues.filter((i) => i.kind === "division_by_macro_zero");
      expect(m.length).toBe(0);
    });
  });

  describe("reserved_variable_write", () => {
    it("flags write to #3001 (reserved)", () => {
      const code = `%
O1001
#3001 = 100
M30
%`;
      const r = ppMacroVariableValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "reserved_variable_write");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("flags write to #5021 (axis position)", () => {
      const code = `%
O1001
#5021 = 0
M30
%`;
      const r = ppMacroVariableValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "reserved_variable_write");
      expect(m.length).toBe(1);
    });

    it("does not flag writes to #100 (common user var)", () => {
      const code = `%
O1001
#100 = 5.
M30
%`;
      const r = ppMacroVariableValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "reserved_variable_write");
      expect(m.length).toBe(0);
    });

    it("custom reserved_ranges respected", () => {
      const code = `%
O1001
#50 = 1
M30
%`;
      const r = ppMacroVariableValidatorEngine.validate(code, {
        reserved_ranges: [[40, 60]],
      });
      const m = r.issues.filter((i) => i.kind === "reserved_variable_write");
      expect(m.length).toBe(1);
    });
  });

  describe("unbalanced_if_endif", () => {
    it("flags IF without ENDIF", () => {
      const code = `%
O1001
#100 = 5.
IF [#100 GT 0] THEN #101 = 1
G1 X#101 F100.
M30
%`;
      const r = ppMacroVariableValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "unbalanced_if_endif");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag balanced IF/ENDIF", () => {
      const code = `%
O1001
#100 = 5.
IF [#100 GT 0] THEN
  #101 = 1
ENDIF
M30
%`;
      const r = ppMacroVariableValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "unbalanced_if_endif");
      expect(m.length).toBe(0);
    });
  });

  describe("unbalanced_while_end", () => {
    it("flags WHILE without END", () => {
      const code = `%
O1001
#100 = 0
WHILE [#100 LT 10] DO1
  #100 = #100 + 1
M30
%`;
      const r = ppMacroVariableValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "unbalanced_while_end");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag balanced WHILE/END", () => {
      const code = `%
O1001
#100 = 0
WHILE [#100 LT 10] DO1
  #100 = #100 + 1
END1
M30
%`;
      const r = ppMacroVariableValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "unbalanced_while_end");
      expect(m.length).toBe(0);
    });
  });

  describe("goto_to_nonexistent_label", () => {
    it("flags GOTO N9999 with no target", () => {
      const code = `%
O1001
#100 = 5.
GOTO 9999
M30
%`;
      const r = ppMacroVariableValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "goto_to_nonexistent_label");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag GOTO to defined label", () => {
      const code = `%
O1001
#100 = 5.
GOTO 100
N100 M30
%`;
      const r = ppMacroVariableValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "goto_to_nonexistent_label");
      expect(m.length).toBe(0);
    });

    it("check_goto_targets=false suppresses", () => {
      const code = `%
O1001
GOTO 9999
M30
%`;
      const r = ppMacroVariableValidatorEngine.validate(code, {
        check_goto_targets: false,
      });
      const m = r.issues.filter((i) => i.kind === "goto_to_nonexistent_label");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("counts macro variables", () => {
      const code = `%
O1001
#100 = 5.
#101 = 10.
#102 = #100 + #101
M30
%`;
      const r = ppMacroVariableValidatorEngine.validate(code);
      expect(r.summary.macro_variable_count).toBe(3);
      expect(r.summary.assignment_count).toBe(3);
      expect(r.summary.read_count).toBeGreaterThanOrEqual(2);
    });

    it("counts IF/ENDIF/WHILE/END", () => {
      const code = `%
O1001
#100 = 0
WHILE [#100 LT 10] DO1
  IF [#100 GT 5] THEN
    #101 = 1
  ENDIF
  #100 = #100 + 1
END1
M30
%`;
      const r = ppMacroVariableValidatorEngine.validate(code);
      expect(r.summary.if_count).toBe(1);
      expect(r.summary.endif_count).toBe(1);
      expect(r.summary.while_count).toBe(1);
      expect(r.summary.end_count).toBe(1);
    });

    it("collects labels", () => {
      const code = `%
O1001
N100 G1 X10.
N200 G1 X20.
N300 M30
%`;
      const r = ppMacroVariableValidatorEngine.validate(code);
      expect(r.summary.labels).toEqual([100, 200, 300]);
    });

    it("counts GOTOs", () => {
      const code = `%
O1001
N100 GOTO 200
N200 GOTO 300
N300 M30
%`;
      const r = ppMacroVariableValidatorEngine.validate(code);
      expect(r.summary.goto_count).toBe(2);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean program", () => {
      const code = `%
O1001
#100 = 5.
G1 X#100 F100.
M30
%`;
      const q = ppMacroVariableValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.macro_variable_count).toBe(1);
    });

    it("returns valid=false for undefined variable", () => {
      const code = `%
O1001
G1 X#100 F100.
M30
%`;
      const q = ppMacroVariableValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
      expect(q.errors).toBeGreaterThan(0);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppMacroVariableValidatorEngine.defaultOptions();
      expect(o.check_undefined).toBe(true);
      expect(o.check_divide_by_zero).toBe(true);
      expect(o.check_reserved_writes).toBe(true);
      expect(o.check_balanced_control).toBe(true);
      expect(o.check_goto_targets).toBe(true);
      expect(Array.isArray(o.reserved_ranges)).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppMacroVariableValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
      expect(r.summary.macro_variable_count).toBe(0);
    });

    it("handles program without macros", () => {
      const code = `%
O1001
G1 X10. F100.
M30
%`;
      const r = ppMacroVariableValidatorEngine.validate(code);
      expect(r.summary.macro_variable_count).toBe(0);
      expect(r.total_issues).toBe(0);
    });

    it("ignores macros inside comments", () => {
      const code = `%
O1001
(#100 is position and #200 is diameter)
G1 X10.
M30
%`;
      const r = ppMacroVariableValidatorEngine.validate(code);
      expect(r.summary.macro_variable_count).toBe(0);
    });
  });
});
