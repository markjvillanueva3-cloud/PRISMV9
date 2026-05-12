/**
 * PPProgramEndValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPProgramEndValidatorEngine,
  ppProgramEndValidatorEngine,
} from "../engines/PPProgramEndValidatorEngine.js";

describe("PPProgramEndValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppProgramEndValidatorEngine).toBeInstanceOf(
      PPProgramEndValidatorEngine,
    );
  });

  describe("missing_program_end", () => {
    it("flags program with no M30 or M02", () => {
      const code = `%
O1001
G17 G90 G94
G1 X10. F100.
%`;
      const r = ppProgramEndValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_program_end");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag when M30 present", () => {
      const code = `%
O1001
G17 G90 G94
G1 X10. F100.
M30
%`;
      const r = ppProgramEndValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_program_end");
      expect(m.length).toBe(0);
    });

    it("does not flag when M02 present and treat_m02_as_end=true", () => {
      const code = `%
O1001
G1 X10. F100.
M02
%`;
      const r = ppProgramEndValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_program_end");
      expect(m.length).toBe(0);
    });

    it("flags when M02 present but treat_m02_as_end=false", () => {
      const code = `%
O1001
G1 X10. F100.
M02
%`;
      const r = ppProgramEndValidatorEngine.validate(code, {
        treat_m02_as_end: false,
      });
      const m = r.issues.filter((i) => i.kind === "missing_program_end");
      expect(m.length).toBe(1);
    });

    it("does not flag in subprogram_only mode with M99", () => {
      const code = `%
O9001
G1 X10.
M99
%`;
      const r = ppProgramEndValidatorEngine.validate(code, {
        subprogram_only: true,
      });
      const m = r.issues.filter((i) => i.kind === "missing_program_end");
      expect(m.length).toBe(0);
    });

    it("flags subprogram_only without M99", () => {
      const code = `%
O9001
G1 X10.
%`;
      const r = ppProgramEndValidatorEngine.validate(code, {
        subprogram_only: true,
      });
      const m = r.issues.filter((i) => i.kind === "subprogram_missing_m99");
      expect(m.length).toBe(1);
    });
  });

  describe("multiple_program_ends", () => {
    it("flags two M30 blocks", () => {
      const code = `%
O1001
G1 X10. F100.
M30
G1 X20.
M30
%`;
      const r = ppProgramEndValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "multiple_program_ends");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
      expect(m[0].details?.end_lines?.length).toBe(2);
    });

    it("flags M30 + M02", () => {
      const code = `%
O1001
G1 X10. F100.
M30
G1 X20.
M02
%`;
      const r = ppProgramEndValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "multiple_program_ends");
      expect(m.length).toBe(1);
    });

    it("does not flag single M30", () => {
      const code = `%
O1001
G1 X10. F100.
M30
%`;
      const r = ppProgramEndValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "multiple_program_ends");
      expect(m.length).toBe(0);
    });
  });

  describe("end_not_last", () => {
    it("flags M30 with more non-subprogram code after", () => {
      const code = `%
O1001
G1 X10. F100.
M30
G1 X20.
G1 X30.
%`;
      const r = ppProgramEndValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "end_not_last");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag M30 with subprogram after (canonical Fanuc layout)", () => {
      const code = `%
O1001
G1 X10. F100.
M98 P9001
M30
O9001
G1 X20.
M99
%`;
      const r = ppProgramEndValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "end_not_last");
      expect(m.length).toBe(0);
    });

    it("does not flag M30 at actual end", () => {
      const code = `%
O1001
G1 X10. F100.
M30
%`;
      const r = ppProgramEndValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "end_not_last");
      expect(m.length).toBe(0);
    });
  });

  describe("m99_in_main", () => {
    it("flags M99 in main program with no subprogram", () => {
      const code = `%
O1001
G1 X10. F100.
M99
%`;
      const r = ppProgramEndValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "m99_in_main");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag M99 inside subprogram body", () => {
      const code = `%
O1001
G1 X10. F100.
M98 P9001
M30
O9001
G1 X20.
M99
%`;
      const r = ppProgramEndValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "m99_in_main");
      expect(m.length).toBe(0);
    });

    it("does not apply in subprogram_only mode", () => {
      const code = `%
O9001
G1 X10.
M99
%`;
      const r = ppProgramEndValidatorEngine.validate(code, {
        subprogram_only: true,
      });
      const m = r.issues.filter((i) => i.kind === "m99_in_main");
      expect(m.length).toBe(0);
    });
  });

  describe("subprogram_missing_m99", () => {
    it("flags subprogram with no M99", () => {
      const code = `%
O1001
M98 P9001
M30
O9001
G1 X10.
%`;
      const r = ppProgramEndValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "subprogram_missing_m99");
      expect(m.length).toBe(1);
      expect(m[0].details?.o_number).toBe(9001);
    });

    it("does not flag subprogram with M99", () => {
      const code = `%
O1001
M98 P9001
M30
O9001
G1 X10.
M99
%`;
      const r = ppProgramEndValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "subprogram_missing_m99");
      expect(m.length).toBe(0);
    });

    it("flags only the offending subprogram when multiple exist", () => {
      const code = `%
O1001
M98 P9001
M98 P9002
M30
O9001
G1 X10.
M99
O9002
G1 X20.
%`;
      const r = ppProgramEndValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "subprogram_missing_m99");
      expect(m.length).toBe(1);
      expect(m[0].details?.o_number).toBe(9002);
    });
  });

  describe("leading/trailing percent", () => {
    it("info flag opt-in when missing trailing %", () => {
      const code = `%
O1001
G1 X10. F100.
M30`;
      const r = ppProgramEndValidatorEngine.validate(code, {
        check_trailing_percent: true,
      });
      const m = r.issues.filter(
        (i) => i.kind === "missing_trailing_percent",
      );
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("info");
    });

    it("info flag opt-in when missing leading %", () => {
      const code = `O1001
G1 X10. F100.
M30
%`;
      const r = ppProgramEndValidatorEngine.validate(code, {
        check_leading_percent: true,
      });
      const m = r.issues.filter(
        (i) => i.kind === "missing_leading_percent",
      );
      expect(m.length).toBe(1);
    });

    it("both off by default", () => {
      const code = `O1001
G1 X10.
M30`;
      const r = ppProgramEndValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) =>
          i.kind === "missing_leading_percent" ||
          i.kind === "missing_trailing_percent",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("counts M30/M02/M99 occurrences", () => {
      const code = `%
O1001
M98 P9001
M30
O9001
G1 X10.
M99
%`;
      const r = ppProgramEndValidatorEngine.validate(code);
      expect(r.summary.m30_count).toBe(1);
      expect(r.summary.m02_count).toBe(0);
      expect(r.summary.m99_count).toBe(1);
    });

    it("counts O-numbers", () => {
      const code = `%
O1001
M98 P9001
M98 P9002
M30
O9001
M99
O9002
M99
%`;
      const r = ppProgramEndValidatorEngine.validate(code);
      expect(r.summary.o_number_count).toBe(3);
      expect(r.summary.main_o_number).toBe(1001);
    });

    it("detects leading and trailing percent", () => {
      const code = `%
O1001
M30
%`;
      const r = ppProgramEndValidatorEngine.validate(code);
      expect(r.summary.has_leading_percent).toBe(true);
      expect(r.summary.has_trailing_percent).toBe(true);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean M30 program", () => {
      const code = `%
O1001
G17 G90 G94
G1 X10. F100.
M30
%`;
      const q = ppProgramEndValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.m30_count).toBe(1);
      expect(q.main_o_number).toBe(1001);
    });

    it("returns valid=false for missing M30", () => {
      const code = `%
O1001
G1 X10.
%`;
      const q = ppProgramEndValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppProgramEndValidatorEngine.defaultOptions();
      expect(o.check_missing_end).toBe(true);
      expect(o.check_end_not_last).toBe(true);
      expect(o.check_multiple_ends).toBe(true);
      expect(o.check_m99_in_main).toBe(true);
      expect(o.check_subprogram_m99).toBe(true);
      expect(o.check_trailing_percent).toBe(false);
      expect(o.check_leading_percent).toBe(false);
      expect(o.treat_m02_as_end).toBe(true);
      expect(o.subprogram_only).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppProgramEndValidatorEngine.validate("");
      // Empty program: missing_program_end fires
      expect(r.summary.m30_count).toBe(0);
      expect(r.summary.main_o_number).toBeNull();
    });

    it("ignores M30 inside comments", () => {
      const code = `%
O1001
(M30 appears in this comment)
G1 X10.
%`;
      const r = ppProgramEndValidatorEngine.validate(code);
      expect(r.summary.m30_count).toBe(0);
    });

    it("does not match M300 as M30", () => {
      const code = `%
O1001
M300
%`;
      const r = ppProgramEndValidatorEngine.validate(code);
      expect(r.summary.m30_count).toBe(0);
    });

    it("does not match M20 as M02", () => {
      const code = `%
O1001
M20
%`;
      const r = ppProgramEndValidatorEngine.validate(code);
      expect(r.summary.m02_count).toBe(0);
    });

    it("accepts M002 as M02 (leading zero variant)", () => {
      const code = `%
O1001
G1 X10.
M002
%`;
      const r = ppProgramEndValidatorEngine.validate(code);
      expect(r.summary.m02_count).toBe(1);
    });
  });
});
