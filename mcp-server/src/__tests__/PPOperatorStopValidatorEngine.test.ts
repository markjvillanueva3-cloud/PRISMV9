/**
 * PPOperatorStopValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPOperatorStopValidatorEngine,
  ppOperatorStopValidatorEngine,
} from "../engines/PPOperatorStopValidatorEngine.js";

describe("PPOperatorStopValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppOperatorStopValidatorEngine).toBeInstanceOf(
      PPOperatorStopValidatorEngine,
    );
  });

  describe("m0 count", () => {
    it("counts simple M0 blocks", () => {
      const code = `%
O1001
G0 X10.
(inspect here)
M0
G0 Y10.
(verify depth)
M0
M30
%`;
      const r = ppOperatorStopValidatorEngine.validate(code);
      expect(r.summary.m0_count).toBe(2);
    });

    it("does not count M10/M30 as M0", () => {
      const code = `%
O1001
M30
%`;
      const r = ppOperatorStopValidatorEngine.validate(code);
      expect(r.summary.m0_count).toBe(0);
    });
  });

  describe("m1 count", () => {
    it("counts simple M1 blocks", () => {
      const code = `%
O1001
G0 X10.
(optional check)
M1
M30
%`;
      const r = ppOperatorStopValidatorEngine.validate(code);
      expect(r.summary.m1_count).toBe(1);
    });

    it("does not count M10/M11/M12/M19 as M1", () => {
      const code = `%
O1001
M19
M11
M12
M30
%`;
      const r = ppOperatorStopValidatorEngine.validate(code);
      expect(r.summary.m1_count).toBe(0);
    });
  });

  describe("m0_without_comment", () => {
    it("flags M0 with no adjacent comment", () => {
      const code = `%
O1001
G0 X10.
M0
G0 Y10.
M30
%`;
      const r = ppOperatorStopValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "m0_without_comment");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("info");
    });

    it("does not flag M0 with comment on same line", () => {
      const code = `%
O1001
G0 X10.
M0 (inspect first-article)
M30
%`;
      const r = ppOperatorStopValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "m0_without_comment");
      expect(m.length).toBe(0);
    });

    it("does not flag M0 with comment on adjacent line", () => {
      const code = `%
O1001
G0 X10.
(stop for cleanup)
M0
M30
%`;
      const r = ppOperatorStopValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "m0_without_comment");
      expect(m.length).toBe(0);
    });
  });

  describe("m1_without_comment", () => {
    it("flags M1 with no comment", () => {
      const code = `%
O1001
G0 X10.
M1
M30
%`;
      const r = ppOperatorStopValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "m1_without_comment");
      expect(m.length).toBe(1);
    });
  });

  describe("excessive_stops", () => {
    it("flags > max_stops", () => {
      const code = `%
O1001
(s1)
M0
(s2)
M0
(s3)
M0
(s4)
M0
(s5)
M0
(s6)
M0
M30
%`;
      const r = ppOperatorStopValidatorEngine.validate(code, {
        max_stops: 3,
      });
      const m = r.issues.filter((i) => i.kind === "excessive_stops");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag <= max_stops", () => {
      const code = `%
O1001
(s1)
M0
(s2)
M0
M30
%`;
      const r = ppOperatorStopValidatorEngine.validate(code, {
        max_stops: 3,
      });
      const m = r.issues.filter((i) => i.kind === "excessive_stops");
      expect(m.length).toBe(0);
    });
  });

  describe("m0_in_subprogram", () => {
    it("flags M0 inside subprogram body", () => {
      const code = `%
O1001
M98 P1002
M30
O1002
(unsafe stop)
M0
M99
%`;
      const r = ppOperatorStopValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "m0_in_subprogram");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
      expect(m[0].details?.subprogram_o).toBe(1002);
    });

    it("does not flag M0 in main program", () => {
      const code = `%
O1001
(inspect)
M0
M30
%`;
      const r = ppOperatorStopValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "m0_in_subprogram");
      expect(m.length).toBe(0);
    });
  });

  describe("m0_after_final_end", () => {
    it("flags M0 after M30", () => {
      const code = `%
O1001
(done)
M30
M0
%`;
      const r = ppOperatorStopValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "m0_after_final_end");
      expect(m.length).toBe(1);
    });
  });

  describe("m1_without_optional_stop_hint", () => {
    it("opt-in flags M1 without 'OPTIONAL STOP' comment", () => {
      const code = `%
O1001
G0 X10.
M1
M30
%`;
      const r = ppOperatorStopValidatorEngine.validate(code, {
        check_m1_optional_hint: true,
      });
      const m = r.issues.filter(
        (i) => i.kind === "m1_without_optional_stop_hint",
      );
      expect(m.length).toBe(1);
    });

    it("does not flag when program has OPTIONAL STOP hint", () => {
      const code = `%
O1001
(OPTIONAL STOP: enable for inspection)
G0 X10.
M1
M30
%`;
      const r = ppOperatorStopValidatorEngine.validate(code, {
        check_m1_optional_hint: true,
      });
      const m = r.issues.filter(
        (i) => i.kind === "m1_without_optional_stop_hint",
      );
      expect(m.length).toBe(0);
    });

    it("off by default", () => {
      const code = `%
O1001
M1
M30
%`;
      const r = ppOperatorStopValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "m1_without_optional_stop_hint",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("tool_change_without_stop", () => {
    it("opt-in flags M6 without adjacent stop", () => {
      const code = `%
O1001
G0 X10.
T2 M6
G1 X20. F100.
M30
%`;
      const r = ppOperatorStopValidatorEngine.validate(code, {
        check_tool_change_stop: true,
      });
      const m = r.issues.filter(
        (i) => i.kind === "tool_change_without_stop",
      );
      expect(m.length).toBe(1);
    });

    it("does not flag M6 with adjacent M1", () => {
      const code = `%
O1001
T2 M6
M1
G1 X20. F100.
M30
%`;
      const r = ppOperatorStopValidatorEngine.validate(code, {
        check_tool_change_stop: true,
      });
      const m = r.issues.filter(
        (i) => i.kind === "tool_change_without_stop",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("reports total_stops", () => {
      const code = `%
O1001
M0
M1
M0
M30
%`;
      const r = ppOperatorStopValidatorEngine.validate(code);
      expect(r.summary.total_stops).toBe(3);
      expect(r.summary.m0_count).toBe(2);
      expect(r.summary.m1_count).toBe(1);
    });

    it("reports m6_count", () => {
      const code = `%
O1001
T1 M6
T2 M6
T3 M6
M30
%`;
      const r = ppOperatorStopValidatorEngine.validate(code);
      expect(r.summary.m6_count).toBe(3);
    });
  });

  describe("quickCheck", () => {
    it("returns summary counts", () => {
      const code = `%
O1001
(inspect)
M0
M30
%`;
      const q = ppOperatorStopValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.m0_count).toBe(1);
      expect(q.total_stops).toBe(1);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppOperatorStopValidatorEngine.defaultOptions();
      expect(o.check_m0_comment).toBe(true);
      expect(o.check_m1_comment).toBe(true);
      expect(o.check_m1_optional_hint).toBe(false);
      expect(o.check_tool_change_stop).toBe(false);
      expect(o.max_stops).toBe(5);
      expect(o.adjacent_comment_lines).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppOperatorStopValidatorEngine.validate("");
      expect(r.summary.total_stops).toBe(0);
    });

    it("handles program with no stops", () => {
      const code = `%
O1001
G0 X10.
M30
%`;
      const r = ppOperatorStopValidatorEngine.validate(code);
      expect(r.summary.total_stops).toBe(0);
      expect(r.summary.valid).toBe(true);
    });

    it("allows custom adjacent_comment_lines radius", () => {
      const code = `%
O1001
(inspect the work)
(blow off chips)
(done)
M0
M30
%`;
      const r = ppOperatorStopValidatorEngine.validate(code, {
        adjacent_comment_lines: 3,
      });
      const m = r.issues.filter((i) => i.kind === "m0_without_comment");
      expect(m.length).toBe(0);
    });
  });
});
