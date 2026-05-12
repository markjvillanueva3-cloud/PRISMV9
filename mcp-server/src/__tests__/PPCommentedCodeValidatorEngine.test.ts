/**
 * PPCommentedCodeValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPCommentedCodeValidatorEngine,
  ppCommentedCodeValidatorEngine,
} from "../engines/PPCommentedCodeValidatorEngine.js";

describe("PPCommentedCodeValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppCommentedCodeValidatorEngine).toBeInstanceOf(
      PPCommentedCodeValidatorEngine,
    );
  });

  describe("commented_gcode_block", () => {
    it("flags (G1 X10. F100.)", () => {
      const code = `%
O1001
(G1 X10. F100.)
G0 X5.
M30
%`;
      const r = ppCommentedCodeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "commented_gcode_block");
      expect(m.length).toBe(1);
    });

    it("flags ;G0 Z-5.", () => {
      const code = `%
O1001
;G0 Z-5.
G0 X5.
M30
%`;
      const r = ppCommentedCodeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "commented_gcode_block");
      expect(m.length).toBe(1);
    });

    it("does not flag (FACE MILL 50MM)", () => {
      const code = `%
O1001
(FACE MILL 50MM)
G0 X5.
M30
%`;
      const r = ppCommentedCodeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "commented_gcode_block");
      expect(m.length).toBe(0);
    });

    it("does not flag (OP2 - CONTOUR)", () => {
      const code = `%
O1001
(OP2 - CONTOUR)
G0 X5.
M30
%`;
      const r = ppCommentedCodeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "commented_gcode_block");
      expect(m.length).toBe(0);
    });

    it("does not flag prose mentioning G1 once", () => {
      const code = `%
O1001
(PROGRAMMER USED G1 FOR THIS OPERATION BY DEFAULT)
G0 X5.
M30
%`;
      const r = ppCommentedCodeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "commented_gcode_block");
      expect(m.length).toBe(0);
    });
  });

  describe("commented_mcode", () => {
    it("flags (M30)", () => {
      const code = `%
O1001
(M30)
G0 X5.
M30
%`;
      const r = ppCommentedCodeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "commented_mcode");
      expect(m.length).toBe(1);
    });

    it("flags (M3 S1000)", () => {
      const code = `%
O1001
(M3 S1000)
G0 X5.
M30
%`;
      const r = ppCommentedCodeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "commented_mcode");
      expect(m.length).toBe(1);
    });
  });

  describe("commented_tool_change", () => {
    it("flags (T1 M6) as warning", () => {
      const code = `%
O1001
(T1 M6)
G0 X5.
M30
%`;
      const r = ppCommentedCodeValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "commented_tool_change",
      );
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("flags (M6 T1)", () => {
      const code = `%
O1001
(M6 T1)
G0 X5.
M30
%`;
      const r = ppCommentedCodeValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "commented_tool_change",
      );
      expect(m.length).toBe(1);
    });

    it("does not flag (T1 active)", () => {
      const code = `%
O1001
(T1 active)
G0 X5.
M30
%`;
      const r = ppCommentedCodeValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "commented_tool_change",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("large_commented_region", () => {
    it("flags 5+ consecutive commented G-code lines", () => {
      const code = `%
O1001
(G1 X10.)
(G1 X20.)
(G1 X30.)
(G1 X40.)
(G1 X50.)
G0 X0.
M30
%`;
      const r = ppCommentedCodeValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "large_commented_region",
      );
      expect(m.length).toBe(1);
    });

    it("does not flag 2 consecutive", () => {
      const code = `%
O1001
(G1 X10.)
(G1 X20.)
G0 X0.
M30
%`;
      const r = ppCommentedCodeValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "large_commented_region",
      );
      expect(m.length).toBe(0);
    });

    it("respects custom large_region_threshold", () => {
      const code = `%
O1001
(G1 X10.)
(G1 X20.)
(G1 X30.)
G0 X0.
M30
%`;
      const r = ppCommentedCodeValidatorEngine.validate(code, {
        large_region_threshold: 3,
      });
      const m = r.issues.filter(
        (i) => i.kind === "large_commented_region",
      );
      expect(m.length).toBe(1);
    });

    it("flags region extending to EOF", () => {
      const code = `%
O1001
G0 X5.
(G1 X10.)
(G1 X20.)
(G1 X30.)
(G1 X40.)
(G1 X50.)`;
      const r = ppCommentedCodeValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "large_commented_region",
      );
      expect(m.length).toBe(1);
    });
  });

  describe("mixed_comment_and_code", () => {
    it("flags G1 X10. F100. (G1 X20. was tested)", () => {
      const code = `%
O1001
G1 X10. F100. (G1 X20. was tested for depth)
M30
%`;
      const r = ppCommentedCodeValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "mixed_comment_and_code",
      );
      expect(m.length).toBe(1);
    });

    it("does not flag G1 X10. F100. (ROUGHING)", () => {
      const code = `%
O1001
G1 X10. F100. (ROUGHING)
M30
%`;
      const r = ppCommentedCodeValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "mixed_comment_and_code",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("reports comment_lines_seen", () => {
      const code = `%
O1001
(FACE MILL)
(PART #123)
(ROUGHING)
G0 X5.
M30
%`;
      const r = ppCommentedCodeValidatorEngine.validate(code);
      expect(r.summary.comment_lines_seen).toBe(3);
    });

    it("reports suspicious_comments count", () => {
      const code = `%
O1001
(G1 X10.)
(FACE MILL)
(M30)
G0 X5.
M30
%`;
      const r = ppCommentedCodeValidatorEngine.validate(code);
      expect(r.summary.suspicious_comments).toBe(2);
    });

    it("reports valid=true (only infos)", () => {
      const code = `%
O1001
(G1 X10.)
M30
%`;
      const r = ppCommentedCodeValidatorEngine.validate(code);
      expect(r.summary.valid).toBe(true);
    });
  });

  describe("quickCheck", () => {
    it("returns summary", () => {
      const code = `%
O1001
(G1 X10.)
(ROUGHING)
G0 X5.
M30
%`;
      const q = ppCommentedCodeValidatorEngine.quickCheck(code);
      expect(q.comment_lines).toBe(2);
      expect(q.suspicious).toBe(1);
    });

    it("handles empty code", () => {
      const q = ppCommentedCodeValidatorEngine.quickCheck("");
      expect(q.comment_lines).toBe(0);
      expect(q.suspicious).toBe(0);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppCommentedCodeValidatorEngine.defaultOptions();
      expect(o.check_gcode_in_comment).toBe(true);
      expect(o.check_mcode_in_comment).toBe(true);
      expect(o.check_tool_change_in_comment).toBe(true);
      expect(o.check_large_region).toBe(true);
      expect(o.check_mixed_comment_code).toBe(true);
      expect(o.large_region_threshold).toBe(5);
      expect(o.ignore_header_lines).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppCommentedCodeValidatorEngine.validate("");
      expect(r.summary.comment_lines_seen).toBe(0);
      expect(r.summary.valid).toBe(true);
    });

    it("handles program with no comments", () => {
      const code = `%
O1001
G0 X5.
M30
%`;
      const r = ppCommentedCodeValidatorEngine.validate(code);
      expect(r.summary.comment_lines_seen).toBe(0);
      expect(r.summary.suspicious_comments).toBe(0);
    });

    it("respects ignore_header_lines", () => {
      const code = `%
O1001
(G1 X10. HEADER LINE)
(M30 HEADER)
G0 X5.
M30
%`;
      const r = ppCommentedCodeValidatorEngine.validate(code, {
        ignore_header_lines: 4,
      });
      expect(r.summary.suspicious_comments).toBe(0);
    });

    it("handles multiple comments on one line", () => {
      const code = `%
O1001
(G1 X10.) (PART 123)
M30
%`;
      const r = ppCommentedCodeValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "commented_gcode_block",
      );
      expect(m.length).toBe(1);
    });

    it("does not flag long prose describing program", () => {
      const code = `%
O1001
(THIS PROGRAM USES G1 LINEAR INTERP AND FEED 100 FOR ALUMINUM PARTS)
G0 X5.
M30
%`;
      const r = ppCommentedCodeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "commented_gcode_block");
      expect(m.length).toBe(0);
    });
  });
});
