/**
 * PPExpressionSyntaxValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPExpressionSyntaxValidatorEngine,
  ppExpressionSyntaxValidatorEngine,
} from "../engines/PPExpressionSyntaxValidatorEngine.js";

describe("PPExpressionSyntaxValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppExpressionSyntaxValidatorEngine).toBeInstanceOf(
      PPExpressionSyntaxValidatorEngine,
    );
  });

  describe("unmatched brackets", () => {
    it("flags unmatched open bracket", () => {
      const code = `%
O1001
#1 = [#2 + 5
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "unmatched_open_bracket");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("flags unmatched close bracket", () => {
      const code = `%
O1001
#1 = #2 + 5]
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "unmatched_close_bracket");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag balanced brackets", () => {
      const code = `%
O1001
#1 = [#2 + 5]
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      expect(
        r.issues.filter((i) =>
          i.kind === "unmatched_open_bracket" ||
          i.kind === "unmatched_close_bracket"
        ).length,
      ).toBe(0);
    });
  });

  describe("deep_bracket_nesting", () => {
    it("flags nesting > max_depth", () => {
      const code = `%
O1001
#1 = [[[[[[5]]]]]]
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "deep_bracket_nesting");
      expect(m.length).toBe(1);
      expect(m[0].details?.depth).toBe(6);
    });

    it("does not flag depth <= 5", () => {
      const code = `%
O1001
#1 = [[[[[5]]]]]
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "deep_bracket_nesting");
      expect(m.length).toBe(0);
    });

    it("respects custom max_nesting_depth", () => {
      const code = `%
O1001
#1 = [[[5]]]
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code, {
        max_nesting_depth: 2,
      });
      const m = r.issues.filter((i) => i.kind === "deep_bracket_nesting");
      expect(m.length).toBe(1);
    });
  });

  describe("empty_brackets", () => {
    it("flags []", () => {
      const code = `%
O1001
#1 = []
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "empty_brackets");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag [0]", () => {
      const code = `%
O1001
#1 = [0]
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "empty_brackets");
      expect(m.length).toBe(0);
    });
  });

  describe("operator_at_boundary", () => {
    it("flags expression starting with operator", () => {
      const code = `%
O1001
#1 = [+5]
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "operator_at_boundary");
      expect(m.length).toBe(1);
    });

    it("flags expression ending with operator", () => {
      const code = `%
O1001
#1 = [5 +]
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "operator_at_boundary");
      expect(m.length).toBe(1);
    });

    it("does not flag normal expression", () => {
      const code = `%
O1001
#1 = [5 + 3]
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "operator_at_boundary");
      expect(m.length).toBe(0);
    });
  });

  describe("consecutive_operators", () => {
    it("flags [5 + + 3]", () => {
      const code = `%
O1001
#1 = [5 + + 3]
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "consecutive_operators");
      expect(m.length).toBe(1);
    });

    it("allows unary minus after operator: [5 + -3]", () => {
      const code = `%
O1001
#1 = [5 + -3]
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "consecutive_operators");
      expect(m.length).toBe(0);
    });
  });

  describe("unknown_function", () => {
    it("flags unknown FOO[x]", () => {
      const code = `%
O1001
#1 = FOO[#2]
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "unknown_function");
      expect(m.length).toBe(1);
      expect(m[0].details?.function_name).toBe("FOO");
    });

    it("does not flag SIN/COS/SQRT", () => {
      const code = `%
O1001
#1 = SIN[#2]
#3 = COS[#4]
#5 = SQRT[#6]
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "unknown_function");
      expect(m.length).toBe(0);
      expect(r.summary.functions_used).toContain("SIN");
      expect(r.summary.functions_used).toContain("COS");
      expect(r.summary.functions_used).toContain("SQRT");
    });

    it("does not treat IF/WHILE as functions", () => {
      const code = `%
O1001
IF [#1 GT 5] GOTO 100
WHILE [#2 LT 3] DO 1
END 1
N100 M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "unknown_function");
      expect(m.length).toBe(0);
    });
  });

  describe("divide_by_literal_zero", () => {
    it("flags [#1 / 0]", () => {
      const code = `%
O1001
#1 = [#2 / 0]
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "divide_by_literal_zero");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("flags [#1 / 0.0]", () => {
      const code = `%
O1001
#1 = [#2 / 0.0]
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "divide_by_literal_zero");
      expect(m.length).toBe(1);
    });

    it("does not flag [#1 / #2]", () => {
      const code = `%
O1001
#1 = [#3 / #2]
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "divide_by_literal_zero");
      expect(m.length).toBe(0);
    });

    it("does not flag division by non-zero literal", () => {
      const code = `%
O1001
#1 = [#2 / 5]
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "divide_by_literal_zero");
      expect(m.length).toBe(0);
    });
  });

  describe("bracket_in_comment", () => {
    it("opt-in flags [ in (comment)", () => {
      const code = `%
O1001
(example: [#1 + 5])
#1 = [#2 + 5]
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code, {
        check_bracket_in_comment: true,
      });
      const m = r.issues.filter((i) => i.kind === "bracket_in_comment");
      expect(m.length).toBe(1);
    });

    it("off by default", () => {
      const code = `%
O1001
(example: [#1 + 5])
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "bracket_in_comment");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("reports expressions_scanned", () => {
      const code = `%
O1001
#1 = [#2 + 5]
#3 = [#4 * 2]
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      expect(r.summary.expressions_scanned).toBe(2);
    });

    it("tracks max_nesting_observed", () => {
      const code = `%
O1001
#1 = [[[#2 + 5]]]
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      expect(r.summary.max_nesting_observed).toBe(3);
    });

    it("lists functions_used sorted", () => {
      const code = `%
O1001
#1 = SIN[#2] + COS[#3] + ABS[#4]
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      expect(r.summary.functions_used).toEqual(["ABS", "COS", "SIN"]);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean macro", () => {
      const code = `%
O1001
#1 = [#2 + 5]
M30
%`;
      const q = ppExpressionSyntaxValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.max_depth).toBe(1);
      expect(q.expressions).toBe(1);
    });

    it("returns valid=false for unmatched bracket", () => {
      const code = `%
O1001
#1 = [#2 + 5
M30
%`;
      const q = ppExpressionSyntaxValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppExpressionSyntaxValidatorEngine.defaultOptions();
      expect(o.check_bracket_balance).toBe(true);
      expect(o.check_nesting_depth).toBe(true);
      expect(o.check_divide_by_zero).toBe(true);
      expect(o.check_bracket_in_comment).toBe(false);
      expect(o.max_nesting_depth).toBe(5);
      expect(o.known_functions).toContain("SIN");
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppExpressionSyntaxValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
      expect(r.summary.expressions_scanned).toBe(0);
    });

    it("handles program with no expressions", () => {
      const code = `%
O1001
G0 X10. Y10.
G1 X20. F100.
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      expect(r.summary.expressions_scanned).toBe(0);
      expect(r.summary.valid).toBe(true);
    });

    it("handles nested function calls SIN[COS[#1]]", () => {
      const code = `%
O1001
#1 = SIN[COS[#2]]
M30
%`;
      const r = ppExpressionSyntaxValidatorEngine.validate(code);
      expect(r.summary.functions_used).toContain("SIN");
      expect(r.summary.functions_used).toContain("COS");
    });
  });
});
