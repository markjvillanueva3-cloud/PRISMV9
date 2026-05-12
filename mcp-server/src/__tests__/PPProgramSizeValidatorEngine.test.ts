/**
 * PPProgramSizeValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPProgramSizeValidatorEngine,
  ppProgramSizeValidatorEngine,
} from "../engines/PPProgramSizeValidatorEngine.js";

describe("PPProgramSizeValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppProgramSizeValidatorEngine).toBeInstanceOf(
      PPProgramSizeValidatorEngine,
    );
  });

  describe("too_many_blocks", () => {
    it("flags programs exceeding max_blocks", () => {
      const code = Array.from({ length: 50 }, (_, i) => `N${i + 10} G1 X${i}. F100.`).join("\n");
      const r = ppProgramSizeValidatorEngine.validate(code, {
        max_blocks: 30,
      });
      const m = r.issues.filter((i) => i.kind === "too_many_blocks");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag programs under limit", () => {
      const code = `%
O1001
G0 X5.
M30
%`;
      const r = ppProgramSizeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "too_many_blocks");
      expect(m.length).toBe(0);
    });
  });

  describe("too_many_tools", () => {
    it("flags > default 24 tools", () => {
      const blocks = Array.from(
        { length: 30 },
        (_, i) => `T${i + 1} M6`,
      ).join("\n");
      const code = `%
O1001
${blocks}
M30
%`;
      const r = ppProgramSizeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "too_many_tools");
      expect(m.length).toBe(1);
    });

    it("respects custom max_tools (lathe turret 12)", () => {
      const blocks = Array.from({ length: 15 }, (_, i) => `T${i + 1} M6`).join(
        "\n",
      );
      const code = `%
O1001
${blocks}
M30
%`;
      const r = ppProgramSizeValidatorEngine.validate(code, { max_tools: 12 });
      const m = r.issues.filter((i) => i.kind === "too_many_tools");
      expect(m.length).toBe(1);
    });

    it("does not flag when tool count fits carousel", () => {
      const code = `%
O1001
T1 M6
T2 M6
T3 M6
M30
%`;
      const r = ppProgramSizeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "too_many_tools");
      expect(m.length).toBe(0);
    });

    it("deduplicates same tool called twice", () => {
      const code = `%
O1001
T1 M6
T1 M6
T2 M6
M30
%`;
      const r = ppProgramSizeValidatorEngine.validate(code);
      expect(r.summary.tool_count).toBe(2);
    });
  });

  describe("too_many_tool_changes", () => {
    it("flags > max_tool_changes M6 calls", () => {
      const blocks = Array.from({ length: 60 }, () => `T1 M6`).join("\n");
      const code = `%
O1001
${blocks}
M30
%`;
      const r = ppProgramSizeValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "too_many_tool_changes",
      );
      expect(m.length).toBe(1);
    });

    it("does not flag normal tool change count", () => {
      const code = `%
O1001
T1 M6
G0 X5.
T2 M6
M30
%`;
      const r = ppProgramSizeValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "too_many_tool_changes",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("file_too_large", () => {
    it("flags files > max_file_kb", () => {
      const bigLine = "G1 X100. Y100. Z100. F100. ".repeat(50);
      const code = Array.from({ length: 1000 }, () => bigLine).join("\n");
      const r = ppProgramSizeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "file_too_large");
      expect(m.length).toBe(1);
    });

    it("does not flag small files", () => {
      const code = `%
O1001
G0 X5.
M30
%`;
      const r = ppProgramSizeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "file_too_large");
      expect(m.length).toBe(0);
    });
  });

  describe("excessive_subprogram_depth", () => {
    it("flags unmatched M98 depth > limit", () => {
      const code = `%
O1001
M98 P9001
M98 P9002
M98 P9003
M98 P9004
M98 P9005
M98 P9006
M30
%`;
      const r = ppProgramSizeValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "excessive_subprogram_depth",
      );
      expect(m.length).toBe(1);
    });

    it("does not flag balanced M98/M99 pairs", () => {
      const code = `%
O1001
M98 P9001
M99
M98 P9002
M99
M30
%`;
      const r = ppProgramSizeValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "excessive_subprogram_depth",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("comment_dense", () => {
    it("flags programs with > 60% comment lines", () => {
      const lines = Array.from({ length: 15 }, () => "(COMMENT LINE)");
      lines.push("G0 X5.");
      lines.push("M30");
      const code = lines.join("\n");
      const r = ppProgramSizeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "comment_dense");
      expect(m.length).toBe(1);
    });

    it("does not flag small programs even if comment-dense", () => {
      const code = `%
(C1)
(C2)
G0 X5.
M30
%`;
      const r = ppProgramSizeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "comment_dense");
      expect(m.length).toBe(0);
    });

    it("does not flag normal comment mix", () => {
      const code = `%
O1001
(OP1)
G0 X5.
G1 X10. F100.
G1 X20. F100.
(END OP1)
M30
%`;
      const r = ppProgramSizeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "comment_dense");
      expect(m.length).toBe(0);
    });
  });

  describe("excessive_macro_vars", () => {
    it("opt-in flags > max_macro_vars local vars", () => {
      const lines = ["%", "O1001"];
      for (let i = 1; i <= 33; i++) {
        lines.push(`#${i}=10.`);
      }
      lines.push("M30", "%");
      const code = lines.join("\n");
      const r = ppProgramSizeValidatorEngine.validate(code, {
        check_macro_vars: true,
        max_macro_vars: 20,
      });
      const m = r.issues.filter(
        (i) => i.kind === "excessive_macro_vars",
      );
      expect(m.length).toBe(1);
    });

    it("off by default", () => {
      const lines = ["%", "O1001"];
      for (let i = 1; i <= 33; i++) {
        lines.push(`#${i}=10.`);
      }
      lines.push("M30", "%");
      const code = lines.join("\n");
      const r = ppProgramSizeValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "excessive_macro_vars",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("too_few_blocks", () => {
    it("opt-in flags tiny programs", () => {
      const code = `%
G0 X0.
M30
%`;
      const r = ppProgramSizeValidatorEngine.validate(code, {
        check_minimum_size: true,
        min_blocks: 5,
      });
      const m = r.issues.filter((i) => i.kind === "too_few_blocks");
      expect(m.length).toBe(1);
    });

    it("off by default", () => {
      const code = `%
G0 X0.
M30
%`;
      const r = ppProgramSizeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "too_few_blocks");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("reports block_count", () => {
      const code = `%
O1001
G0 X5.
G1 X10. F100.
M30
%`;
      const r = ppProgramSizeValidatorEngine.validate(code);
      expect(r.summary.block_count).toBe(4);
    });

    it("reports tool_count", () => {
      const code = `%
O1001
T1 M6
T2 M6
T3 M6
M30
%`;
      const r = ppProgramSizeValidatorEngine.validate(code);
      expect(r.summary.tool_count).toBe(3);
    });

    it("reports tool_change_count", () => {
      const code = `%
O1001
T1 M6
G0 X5.
T2 M6
G0 X10.
M30
%`;
      const r = ppProgramSizeValidatorEngine.validate(code);
      expect(r.summary.tool_change_count).toBe(2);
    });

    it("reports file_bytes", () => {
      const code = `ABCDE`;
      const r = ppProgramSizeValidatorEngine.validate(code);
      expect(r.summary.file_bytes).toBe(5);
    });
  });

  describe("quickCheck", () => {
    it("returns summary", () => {
      const code = `%
O1001
T1 M6
G0 X5.
M30
%`;
      const q = ppProgramSizeValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.tool_count).toBe(1);
      expect(q.block_count).toBeGreaterThan(0);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppProgramSizeValidatorEngine.defaultOptions();
      expect(o.max_blocks).toBe(99999);
      expect(o.max_tools).toBe(24);
      expect(o.max_tool_changes).toBe(50);
      expect(o.max_file_kb).toBe(512);
      expect(o.max_subprogram_depth).toBe(4);
      expect(o.max_comment_ratio).toBe(0.6);
      expect(o.check_macro_vars).toBe(false);
      expect(o.check_minimum_size).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppProgramSizeValidatorEngine.validate("");
      expect(r.summary.block_count).toBe(0);
      expect(r.summary.tool_count).toBe(0);
    });

    it("ignores % line from block count", () => {
      const code = `%
O1001
G0 X5.
%`;
      const r = ppProgramSizeValidatorEngine.validate(code);
      expect(r.summary.block_count).toBe(2);
    });

    it("strips comments before counting tools", () => {
      const code = `%
O1001
(T99 NOT A TOOL CALL)
T1 M6
M30
%`;
      const r = ppProgramSizeValidatorEngine.validate(code);
      expect(r.summary.tool_count).toBe(1);
    });
  });
});
