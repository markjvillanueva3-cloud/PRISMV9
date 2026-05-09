/**
 * PPMacroFlowValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPMacroFlowValidatorEngine,
  ppMacroFlowValidatorEngine,
} from "../engines/PPMacroFlowValidatorEngine.js";

describe("PPMacroFlowValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppMacroFlowValidatorEngine).toBeInstanceOf(
      PPMacroFlowValidatorEngine,
    );
  });

  describe("do_without_end", () => {
    it("flags DO 1 with no END 1", () => {
      const code = `%
O1001
#1 = 0
WHILE [#1 LT 5] DO 1
#1 = #1 + 1
G1 X#1 F100.
M30
%`;
      const r = ppMacroFlowValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "do_without_end");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
      expect(m[0].details?.do_label).toBe(1);
    });

    it("does not flag balanced DO/END", () => {
      const code = `%
O1001
#1 = 0
WHILE [#1 LT 5] DO 1
#1 = #1 + 1
G1 X#1 F100.
END 1
M30
%`;
      const r = ppMacroFlowValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "do_without_end");
      expect(m.length).toBe(0);
    });
  });

  describe("end_without_do", () => {
    it("flags END 1 with no preceding DO 1", () => {
      const code = `%
O1001
G1 X10. F100.
END 1
M30
%`;
      const r = ppMacroFlowValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "end_without_do");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("flags END 2 when only DO 1 is open", () => {
      const code = `%
O1001
WHILE [#1 LT 5] DO 1
END 2
END 1
M30
%`;
      const r = ppMacroFlowValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "end_without_do");
      expect(m.length).toBe(1);
      expect(m[0].details?.do_label).toBe(2);
    });
  });

  describe("do_label_out_of_range", () => {
    it("flags DO 4", () => {
      const code = `%
O1001
WHILE [#1 LT 5] DO 4
END 4
M30
%`;
      const r = ppMacroFlowValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "do_label_out_of_range");
      expect(m.length).toBe(1);
      expect(m[0].details?.do_label).toBe(4);
    });

    it("flags DO 0", () => {
      const code = `%
O1001
WHILE [#1 LT 5] DO 0
END 0
M30
%`;
      const r = ppMacroFlowValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "do_label_out_of_range");
      expect(m.length).toBe(1);
    });

    it("does not flag DO 1, 2, 3", () => {
      const code = `%
O1001
WHILE [#1 LT 5] DO 1
WHILE [#2 LT 5] DO 2
WHILE [#3 LT 5] DO 3
END 3
END 2
END 1
M30
%`;
      const r = ppMacroFlowValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "do_label_out_of_range");
      expect(m.length).toBe(0);
    });

    it("respects custom max_do_label", () => {
      const code = `%
O1001
WHILE [#1 LT 5] DO 3
END 3
M30
%`;
      const r = ppMacroFlowValidatorEngine.validate(code, {
        max_do_label: 2,
      });
      const m = r.issues.filter((i) => i.kind === "do_label_out_of_range");
      expect(m.length).toBe(1);
    });
  });

  describe("nested_do_conflict", () => {
    it("flags two DO 1 in same scope", () => {
      const code = `%
O1001
WHILE [#1 LT 5] DO 1
WHILE [#2 LT 5] DO 1
END 1
END 1
M30
%`;
      const r = ppMacroFlowValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "nested_do_conflict");
      expect(m.length).toBe(1);
      expect(m[0].details?.do_label).toBe(1);
    });

    it("does not flag properly nested DO 1 / DO 2", () => {
      const code = `%
O1001
WHILE [#1 LT 5] DO 1
WHILE [#2 LT 5] DO 2
END 2
END 1
M30
%`;
      const r = ppMacroFlowValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "nested_do_conflict");
      expect(m.length).toBe(0);
    });
  });

  describe("unmatched_while_do", () => {
    it("flags WHILE without DO n", () => {
      const code = `%
O1001
WHILE [#1 LT 5]
END 1
M30
%`;
      const r = ppMacroFlowValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "unmatched_while_do");
      expect(m.length).toBe(1);
    });

    it("does not flag WHILE with DO", () => {
      const code = `%
O1001
WHILE [#1 LT 5] DO 1
END 1
M30
%`;
      const r = ppMacroFlowValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "unmatched_while_do");
      expect(m.length).toBe(0);
    });
  });

  describe("goto_target_missing", () => {
    it("flags GOTO N9999 with no matching block", () => {
      const code = `%
O1001
G1 X10. F100.
GOTO 9999
M30
%`;
      const r = ppMacroFlowValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "goto_target_missing");
      expect(m.length).toBe(1);
      expect(m[0].details?.n_target).toBe(9999);
    });

    it("does not flag GOTO to existing N-label", () => {
      const code = `%
O1001
G1 X10. F100.
GOTO 100
N50 G1 X20.
N100 G1 X30.
M30
%`;
      const r = ppMacroFlowValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "goto_target_missing");
      expect(m.length).toBe(0);
    });

    it("handles IF GOTO form", () => {
      const code = `%
O1001
IF [#1 GT 5] GOTO 200
N100 G1 X10.
M30
%`;
      const r = ppMacroFlowValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "goto_target_missing");
      expect(m.length).toBe(1);
      expect(m[0].details?.n_target).toBe(200);
    });
  });

  describe("while_in_conditional", () => {
    it("info flag opt-in when WHILE on IF-GOTO block", () => {
      const code = `%
O1001
IF [#1 GT 5] GOTO 100 WHILE [#2 LT 3] DO 1
N100 END 1
M30
%`;
      const r = ppMacroFlowValidatorEngine.validate(code, {
        check_while_in_conditional: true,
      });
      const m = r.issues.filter((i) => i.kind === "while_in_conditional");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("info");
    });

    it("off by default", () => {
      const code = `%
O1001
IF [#1 GT 5] GOTO 100 WHILE [#2 LT 3] DO 1
N100 END 1
M30
%`;
      const r = ppMacroFlowValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "while_in_conditional");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("counts DO/END/WHILE/GOTO/IF", () => {
      const code = `%
O1001
IF [#1 GT 5] GOTO 100
WHILE [#2 LT 3] DO 1
WHILE [#3 LT 4] DO 2
END 2
END 1
N100 M30
%`;
      const r = ppMacroFlowValidatorEngine.validate(code);
      expect(r.summary.do_count).toBe(2);
      expect(r.summary.end_count).toBe(2);
      expect(r.summary.while_count).toBe(2);
      expect(r.summary.if_count).toBe(1);
      expect(r.summary.goto_count).toBe(1);
    });

    it("tracks max_nesting", () => {
      const code = `%
O1001
WHILE [#1 LT 5] DO 1
WHILE [#2 LT 3] DO 2
WHILE [#3 LT 4] DO 3
END 3
END 2
END 1
M30
%`;
      const r = ppMacroFlowValidatorEngine.validate(code);
      expect(r.summary.max_nesting).toBe(3);
    });

    it("reports balanced=true when fully paired", () => {
      const code = `%
O1001
WHILE [#1 LT 5] DO 1
END 1
M30
%`;
      const r = ppMacroFlowValidatorEngine.validate(code);
      expect(r.summary.balanced).toBe(true);
    });

    it("reports balanced=false when DO unclosed", () => {
      const code = `%
O1001
WHILE [#1 LT 5] DO 1
M30
%`;
      const r = ppMacroFlowValidatorEngine.validate(code);
      expect(r.summary.balanced).toBe(false);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for balanced macro", () => {
      const code = `%
O1001
WHILE [#1 LT 5] DO 1
#1 = #1 + 1
END 1
M30
%`;
      const q = ppMacroFlowValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.balanced).toBe(true);
      expect(q.max_nesting).toBe(1);
    });

    it("returns valid=false for unclosed DO", () => {
      const code = `%
O1001
WHILE [#1 LT 5] DO 1
M30
%`;
      const q = ppMacroFlowValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
      expect(q.balanced).toBe(false);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppMacroFlowValidatorEngine.defaultOptions();
      expect(o.check_do_end_balance).toBe(true);
      expect(o.check_do_label_range).toBe(true);
      expect(o.check_nested_conflict).toBe(true);
      expect(o.check_while_do).toBe(true);
      expect(o.check_goto_targets).toBe(true);
      expect(o.check_while_in_conditional).toBe(false);
      expect(o.max_do_label).toBe(3);
      expect(o.min_do_label).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppMacroFlowValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
      expect(r.summary.do_count).toBe(0);
      expect(r.summary.balanced).toBe(true);
    });

    it("handles program with no control flow", () => {
      const code = `%
O1001
G17 G90 G54
G0 X10. Y10.
G1 Z-5. F100.
M30
%`;
      const r = ppMacroFlowValidatorEngine.validate(code);
      expect(r.total_issues).toBe(0);
      expect(r.summary.balanced).toBe(true);
    });

    it("ignores WHILE in comments", () => {
      const code = `%
O1001
(WHILE [#1 LT 5] DO 1 example)
G1 X10.
M30
%`;
      const r = ppMacroFlowValidatorEngine.validate(code);
      expect(r.summary.while_count).toBe(0);
      expect(r.summary.do_count).toBe(0);
    });

    it("ignores GOTO in comments", () => {
      const code = `%
O1001
(GOTO 9999 in comment)
G1 X10.
M30
%`;
      const r = ppMacroFlowValidatorEngine.validate(code);
      expect(r.summary.goto_count).toBe(0);
    });
  });
});
