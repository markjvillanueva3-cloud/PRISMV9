/**
 * PPProgramHeaderValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPProgramHeaderValidatorEngine,
  ppProgramHeaderValidatorEngine,
} from "../engines/PPProgramHeaderValidatorEngine.js";

describe("PPProgramHeaderValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppProgramHeaderValidatorEngine).toBeInstanceOf(
      PPProgramHeaderValidatorEngine,
    );
  });

  describe("missing_part_number", () => {
    it("flags program with no part number", () => {
      const code = `%
O1001
(MATERIAL: 1018 STEEL)
(DATE: 2026-04-16)
G0 X10.
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_part_number");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag when PART NO: present", () => {
      const code = `%
O1001
(PART: ABC-12345)
(MATERIAL: 1018 STEEL)
G0 X10.
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_part_number");
      expect(m.length).toBe(0);
      expect(r.summary.has_part_number).toBe(true);
    });

    it("does not flag when P/N present", () => {
      const code = `%
O1001
(P/N: 123-ABC)
G0 X10.
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_part_number");
      expect(m.length).toBe(0);
    });

    it("does not flag when DWG present", () => {
      const code = `%
O1001
(DWG: ACME-456)
G0 X10.
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_part_number");
      expect(m.length).toBe(0);
    });
  });

  describe("missing_tool_list", () => {
    it("flags M6 calls with no header tool list", () => {
      const code = `%
O1001
(PART: X-1)
G0 X10.
T1 M6
G0 X20.
T2 M6
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_tool_list");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("info");
    });

    it("does not flag when no tool calls at all", () => {
      const code = `%
O1001
(PART: X-1)
G0 X10.
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_tool_list");
      expect(m.length).toBe(0);
    });

    it("does not flag when TOOL LIST section present", () => {
      const code = `%
O1001
(PART: X-1)
(TOOL LIST)
(T1 1/4 END MILL)
(T2 1/2 END MILL)
T1 M6
T2 M6
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_tool_list");
      expect(m.length).toBe(0);
      expect(r.summary.has_tool_list).toBe(true);
    });
  });

  describe("tool_list_incomplete", () => {
    it("flags tools called but not documented", () => {
      const code = `%
O1001
(PART: X-1)
(TOOL LIST)
(T1 1/4 END MILL)
T1 M6
T2 M6
T3 M6
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "tool_list_incomplete");
      expect(m.length).toBe(1);
      expect(m[0].details?.undocumented_tools).toEqual([2, 3]);
    });

    it("does not flag when all tools documented", () => {
      const code = `%
O1001
(PART: X-1)
(TOOL LIST)
(T1 1/4 END MILL)
(T2 1/2 END MILL)
T1 M6
T2 M6
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "tool_list_incomplete");
      expect(m.length).toBe(0);
    });
  });

  describe("missing_material", () => {
    it("flags program without MATERIAL", () => {
      const code = `%
O1001
(PART: X-1)
(DATE: 2026-04-16)
G0 X10.
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_material");
      expect(m.length).toBe(1);
    });

    it("does not flag when MATERIAL present", () => {
      const code = `%
O1001
(MATERIAL: 1018 STEEL)
G0 X10.
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_material");
      expect(m.length).toBe(0);
    });
  });

  describe("missing_date", () => {
    it("flags program without DATE", () => {
      const code = `%
O1001
(PART: X-1)
(MATERIAL: 1018)
G0 X10.
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_date");
      expect(m.length).toBe(1);
    });

    it("does not flag PROGRAMMED comment", () => {
      const code = `%
O1001
(PROGRAMMED: 2026-04-16)
G0 X10.
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_date");
      expect(m.length).toBe(0);
    });
  });

  describe("missing_revision", () => {
    it("flags program without REV", () => {
      const code = `%
O1001
(PART: X-1)
(MATERIAL: 1018)
(DATE: 2026-04-16)
G0 X10.
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_revision");
      expect(m.length).toBe(1);
    });

    it("does not flag when REV: A present", () => {
      const code = `%
O1001
(REV: A)
G0 X10.
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_revision");
      expect(m.length).toBe(0);
    });
  });

  describe("header_too_short", () => {
    it("flags header with < min_header_lines", () => {
      const code = `%
O1001
(only one)
G0 X10.
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code, {
        min_header_lines: 3,
      });
      const m = r.issues.filter((i) => i.kind === "header_too_short");
      expect(m.length).toBe(1);
      expect(m[0].details?.comment_lines).toBe(1);
    });

    it("does not flag when header meets minimum", () => {
      const code = `%
O1001
(PART: X-1)
(MATERIAL: 1018)
(REV: A)
(DATE: 2026-04-16)
G0 X10.
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code, {
        min_header_lines: 3,
      });
      const m = r.issues.filter((i) => i.kind === "header_too_short");
      expect(m.length).toBe(0);
    });
  });

  describe("malformed_tool_entry", () => {
    it("flags (T1 ) with no description", () => {
      const code = `%
O1001
(PART: X-1)
(T1 )
(T2 1/2 END MILL)
T1 M6
T2 M6
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "malformed_tool_entry");
      expect(m.length).toBe(1);
    });

    it("does not flag well-formed tool entries", () => {
      const code = `%
O1001
(T1 1/4 END MILL)
(T2 1/2 END MILL)
T1 M6
T2 M6
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "malformed_tool_entry");
      expect(m.length).toBe(0);
    });
  });

  describe("header_comment_after_motion", () => {
    it("flags PART: comment that appears after motion", () => {
      const code = `%
O1001
G0 X10.
(PART: X-1)
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "header_comment_after_motion",
      );
      expect(m.length).toBe(1);
    });

    it("does not flag arbitrary comments after motion", () => {
      const code = `%
O1001
(PART: X-1)
(MATERIAL: 1018)
(REV: A)
G0 X10.
(rough pass)
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "header_comment_after_motion",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("missing_programmer", () => {
    it("opt-in flags program without PROGRAMMER tag", () => {
      const code = `%
O1001
(PART: X-1)
G0 X10.
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code, {
        check_programmer: true,
      });
      const m = r.issues.filter((i) => i.kind === "missing_programmer");
      expect(m.length).toBe(1);
    });

    it("off by default", () => {
      const code = `%
O1001
(PART: X-1)
G0 X10.
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_programmer");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("reports tools_called and tools_documented", () => {
      const code = `%
O1001
(TOOL LIST)
(T1 1/4 END MILL)
(T2 1/2 END MILL)
T1 M6
T2 M6
T3 M6
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      expect(r.summary.tools_called).toEqual([1, 2, 3]);
      expect(r.summary.tools_documented).toEqual([1, 2]);
    });

    it("reports comment_lines", () => {
      const code = `%
O1001
(PART: X-1)
(MATERIAL: 1018)
(DATE: 2026-04-16)
(REV: A)
G0 X10.
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      expect(r.summary.comment_lines).toBe(4);
    });

    it("tracks all has_* flags", () => {
      const code = `%
O1001
(PART: X-1)
(MATERIAL: 1018)
(DATE: 2026-04-16)
(REV: A)
(PROGRAMMER: JS)
(TOOL LIST)
G0 X10.
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      expect(r.summary.has_part_number).toBe(true);
      expect(r.summary.has_material).toBe(true);
      expect(r.summary.has_date).toBe(true);
      expect(r.summary.has_revision).toBe(true);
      expect(r.summary.has_programmer).toBe(true);
      expect(r.summary.has_tool_list).toBe(true);
    });
  });

  describe("quickCheck", () => {
    it("returns summary for clean program", () => {
      const code = `%
O1001
(PART: X-1)
(TOOL LIST)
(T1 1/4 END MILL)
T1 M6
M30
%`;
      const q = ppProgramHeaderValidatorEngine.quickCheck(code);
      expect(q.has_part_number).toBe(true);
      expect(q.has_tool_list).toBe(true);
      expect(q.tools_called).toBe(1);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppProgramHeaderValidatorEngine.defaultOptions();
      expect(o.check_part_number).toBe(true);
      expect(o.check_tool_list).toBe(true);
      expect(o.check_programmer).toBe(false);
      expect(o.header_window).toBe(20);
      expect(o.min_header_lines).toBe(3);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppProgramHeaderValidatorEngine.validate("");
      expect(r.summary.comment_lines).toBe(0);
      expect(r.summary.tools_called.length).toBe(0);
    });

    it("handles program with no comments", () => {
      const code = `%
O1001
G0 X10.
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      expect(r.summary.comment_lines).toBe(0);
      expect(r.summary.has_part_number).toBe(false);
    });

    it("respects custom header_window", () => {
      const code = `%
O1001
(line1)
(line2)
(PART: X-1)
G0 X10.
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code, {
        header_window: 2,
      });
      // PART is on header line 3 (0-indexed 2), window=2 => skip it
      expect(r.summary.has_part_number).toBe(false);
    });

    it("accepts semicolon comments", () => {
      const code = `%
O1001
; PART: ABC-12
; MATERIAL: 1018
; DATE: 2026-04-16
G0 X10.
M30
%`;
      const r = ppProgramHeaderValidatorEngine.validate(code);
      expect(r.summary.comment_lines).toBe(3);
      expect(r.summary.has_part_number).toBe(true);
    });
  });
});
