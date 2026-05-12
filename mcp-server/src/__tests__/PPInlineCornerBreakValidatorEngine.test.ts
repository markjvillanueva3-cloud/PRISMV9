/**
 * PPInlineCornerBreakValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPInlineCornerBreakValidatorEngine,
  ppInlineCornerBreakValidatorEngine,
} from "../engines/PPInlineCornerBreakValidatorEngine.js";

describe("PPInlineCornerBreakValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppInlineCornerBreakValidatorEngine).toBeInstanceOf(
      PPInlineCornerBreakValidatorEngine,
    );
  });

  describe("chamfer_round_on_non_g1", () => {
    it("flags ,C on G0 rapid", () => {
      const code = `%
O1001
G0 X50. Y20. , C5.
G1 X80.
M30
%`;
      const r = ppInlineCornerBreakValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "chamfer_round_on_non_g1");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("flags ,R on G2 arc", () => {
      const code = `%
O1001
G1 X10. Y10. F100.
G2 X30. Y30. I10. J0. , R5.
G1 X50.
M30
%`;
      const r = ppInlineCornerBreakValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "chamfer_round_on_non_g1");
      expect(m.length).toBe(1);
    });

    it("does not flag ,C on G1", () => {
      const code = `%
O1001
G1 X50. Y20. , C5. F100.
G1 X80. Y20.
M30
%`;
      const r = ppInlineCornerBreakValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "chamfer_round_on_non_g1");
      expect(m.length).toBe(0);
    });
  });

  describe("chamfer_round_at_program_end", () => {
    it("flags ,C on last motion block before M30", () => {
      const code = `%
O1001
G1 X50. Y20. F100.
G1 X80. Y20. , C5.
M30
%`;
      const r = ppInlineCornerBreakValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "chamfer_round_at_program_end",
      );
      expect(m.length).toBe(1);
    });

    it("does not flag ,C with following G1", () => {
      const code = `%
O1001
G1 X50. Y20. , C5. F100.
G1 X80. Y20.
M30
%`;
      const r = ppInlineCornerBreakValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "chamfer_round_at_program_end",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("both_c_and_r_on_same_block", () => {
    it("flags block with both ,C and ,R", () => {
      const code = `%
O1001
G1 X50. Y20. , C5. , R3. F100.
G1 X80.
M30
%`;
      const r = ppInlineCornerBreakValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "both_c_and_r_on_same_block",
      );
      expect(m.length).toBe(1);
    });

    it("does not flag ,C only", () => {
      const code = `%
O1001
G1 X50. Y20. , C5. F100.
G1 X80.
M30
%`;
      const r = ppInlineCornerBreakValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "both_c_and_r_on_same_block",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("negative_chamfer_size", () => {
    it("flags ,C-5.", () => {
      const code = `%
O1001
G1 X50. Y20. , C-5. F100.
G1 X80.
M30
%`;
      const r = ppInlineCornerBreakValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "negative_chamfer_size");
      expect(m.length).toBe(1);
    });

    it("flags ,R-3.", () => {
      const code = `%
O1001
G1 X50. Y20. , R-3. F100.
G1 X80.
M30
%`;
      const r = ppInlineCornerBreakValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "negative_chamfer_size");
      expect(m.length).toBe(1);
    });

    it("does not flag positive size", () => {
      const code = `%
O1001
G1 X50. Y20. , C5. F100.
G1 X80.
M30
%`;
      const r = ppInlineCornerBreakValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "negative_chamfer_size");
      expect(m.length).toBe(0);
    });
  });

  describe("chamfer_size_too_large", () => {
    it("opt-in flags size > half segment", () => {
      const code = `%
O1001
G1 X0. Y0. , C5. F100.
G1 X10. Y0.
G1 X10. Y10.
M30
%`;
      const r = ppInlineCornerBreakValidatorEngine.validate(code, {
        check_size_vs_segment: true,
      });
      const m = r.issues.filter((i) => i.kind === "chamfer_size_too_large");
      expect(m.length).toBeGreaterThan(0);
    });

    it("off by default", () => {
      const code = `%
O1001
G1 X0. Y0. , C5. F100.
G1 X10. Y0.
M30
%`;
      const r = ppInlineCornerBreakValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "chamfer_size_too_large");
      expect(m.length).toBe(0);
    });
  });

  describe("chamfer_on_rapid_approach", () => {
    it("opt-in flags ,C on G1 right after G0", () => {
      const code = `%
O1001
G0 X0. Y0.
G1 X50. Y20. , C5. F100.
G1 X80.
M30
%`;
      const r = ppInlineCornerBreakValidatorEngine.validate(code, {
        check_rapid_approach: true,
      });
      const m = r.issues.filter((i) => i.kind === "chamfer_on_rapid_approach");
      expect(m.length).toBe(1);
    });

    it("off by default", () => {
      const code = `%
O1001
G0 X0. Y0.
G1 X50. Y20. , C5. F100.
G1 X80.
M30
%`;
      const r = ppInlineCornerBreakValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "chamfer_on_rapid_approach");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("reports chamfers_seen", () => {
      const code = `%
O1001
G1 X10. Y10. , C2. F100.
G1 X20. , C3.
G1 X30.
M30
%`;
      const r = ppInlineCornerBreakValidatorEngine.validate(code);
      expect(r.summary.chamfers_seen).toBe(2);
    });

    it("reports rounds_seen", () => {
      const code = `%
O1001
G1 X10. Y10. , R2. F100.
G1 X20. , R3.
G1 X30.
M30
%`;
      const r = ppInlineCornerBreakValidatorEngine.validate(code);
      expect(r.summary.rounds_seen).toBe(2);
    });

    it("reports valid=true when clean", () => {
      const code = `%
O1001
G1 X10. Y10. , C2. F100.
G1 X20.
M30
%`;
      const r = ppInlineCornerBreakValidatorEngine.validate(code);
      expect(r.summary.valid).toBe(true);
    });
  });

  describe("quickCheck", () => {
    it("returns summary", () => {
      const code = `%
O1001
G1 X10. Y10. , C2. F100.
G1 X20. , R3.
G1 X30.
M30
%`;
      const q = ppInlineCornerBreakValidatorEngine.quickCheck(code);
      expect(q.chamfers).toBe(1);
      expect(q.rounds).toBe(1);
    });

    it("handles empty code", () => {
      const q = ppInlineCornerBreakValidatorEngine.quickCheck("");
      expect(q.valid).toBe(true);
      expect(q.chamfers).toBe(0);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppInlineCornerBreakValidatorEngine.defaultOptions();
      expect(o.check_non_g1).toBe(true);
      expect(o.check_program_end).toBe(true);
      expect(o.check_both_c_r).toBe(true);
      expect(o.check_negative_size).toBe(true);
      expect(o.check_size_vs_segment).toBe(false);
      expect(o.check_rapid_approach).toBe(false);
      expect(o.next_motion_window).toBe(5);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppInlineCornerBreakValidatorEngine.validate("");
      expect(r.summary.chamfers_seen).toBe(0);
    });

    it("handles program with no chamfer", () => {
      const code = `%
O1001
G1 X10. Y10. F100.
G1 X20.
M30
%`;
      const r = ppInlineCornerBreakValidatorEngine.validate(code);
      expect(r.summary.total_issues).toBe(0);
    });

    it("ignores C in comments", () => {
      const code = `%
O1001
G1 X10. Y10. (,C5.) F100.
G1 X20.
M30
%`;
      const r = ppInlineCornerBreakValidatorEngine.validate(code);
      expect(r.summary.chamfers_seen).toBe(0);
    });

    it("handles spaces around comma", () => {
      const code = `%
O1001
G1 X10. Y10. ,  C5. F100.
G1 X20.
M30
%`;
      const r = ppInlineCornerBreakValidatorEngine.validate(code);
      expect(r.summary.chamfers_seen).toBe(1);
    });

    it("distinguishes ,R from arc R word", () => {
      const code = `%
O1001
G1 X10. Y10. F100.
G2 X20. Y20. R10.
G1 X30.
M30
%`;
      const r = ppInlineCornerBreakValidatorEngine.validate(code);
      expect(r.summary.rounds_seen).toBe(0);
    });

    it("can disable individual checks", () => {
      const code = `%
O1001
G0 X50. , C5.
G1 X80.
M30
%`;
      const r = ppInlineCornerBreakValidatorEngine.validate(code, {
        check_non_g1: false,
      });
      const m = r.issues.filter((i) => i.kind === "chamfer_round_on_non_g1");
      expect(m.length).toBe(0);
    });
  });
});
