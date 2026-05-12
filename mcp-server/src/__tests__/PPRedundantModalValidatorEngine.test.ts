/**
 * PPRedundantModalValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPRedundantModalValidatorEngine,
  ppRedundantModalValidatorEngine,
} from "../engines/PPRedundantModalValidatorEngine.js";

describe("PPRedundantModalValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppRedundantModalValidatorEngine).toBeInstanceOf(
      PPRedundantModalValidatorEngine,
    );
  });

  describe("redundant_modal_reissue", () => {
    it("flags G90 re-issued after G90", () => {
      const code = `%
O1001
G90
G0 X5.
G0 X10.
G90
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "redundant_modal_reissue");
      expect(m.length).toBe(1);
      expect(m[0].code).toBe("G90");
    });

    it("does not flag G90 after G91 cancelled", () => {
      const code = `%
O1001
G90
G0 X5.
G91
G0 X2.
G90
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "redundant_modal_reissue");
      expect(m.length).toBe(0);
    });

    it("flags G54 re-issued", () => {
      const code = `%
O1001
G54
G0 X5.
G0 X10.
G54
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "redundant_modal_reissue");
      expect(m.length).toBe(1);
      expect(m[0].code).toBe("G54");
    });

    it("does not flag G55 after G54", () => {
      const code = `%
O1001
G54
G0 X5.
G55
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "redundant_modal_reissue");
      expect(m.length).toBe(0);
    });

    it("flags G17 re-issued later", () => {
      const code = `%
O1001
G17
G0 X5.
G0 X10.
G17
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "redundant_modal_reissue");
      expect(m.length).toBe(1);
      expect(m[0].code).toBe("G17");
    });
  });

  describe("redundant_feed_same_value", () => {
    it("flags F100. re-issued after F100.", () => {
      const code = `%
O1001
G1 X5. F100.
G1 X10. F100.
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "redundant_feed_same_value",
      );
      expect(m.length).toBe(1);
    });

    it("does not flag F100. -> F200.", () => {
      const code = `%
O1001
G1 X5. F100.
G1 X10. F200.
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "redundant_feed_same_value",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("redundant_spindle_speed", () => {
    it("flags S1000 re-issued after S1000", () => {
      const code = `%
O1001
S1000 M3
G0 X5.
S1000
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "redundant_spindle_speed");
      expect(m.length).toBe(1);
    });

    it("does not flag S1000 -> S1500", () => {
      const code = `%
O1001
S1000 M3
S1500
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "redundant_spindle_speed");
      expect(m.length).toBe(0);
    });
  });

  describe("redundant_tool_number", () => {
    it("flags T1 re-issued without M6", () => {
      const code = `%
O1001
T1
G0 X5.
T1
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "redundant_tool_number");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag T1 M6 followed by T1 M6", () => {
      const code = `%
O1001
T1 M6
G0 X5.
T2 M6
G0 X5.
T1 M6
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "redundant_tool_number");
      expect(m.length).toBe(0);
    });

    it("does not flag T1 with M6 then T2", () => {
      const code = `%
O1001
T1 M6
G0 X5.
T2
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "redundant_tool_number");
      expect(m.length).toBe(0);
    });
  });

  describe("redundant_m_code", () => {
    it("flags M3 re-issued after M3", () => {
      const code = `%
O1001
S1000 M3
G0 X5.
M3
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "redundant_m_code");
      expect(m.length).toBe(1);
      expect(m[0].code).toBe("M3");
    });

    it("does not flag M3 then M5 (cancelled)", () => {
      const code = `%
O1001
S1000 M3
G0 X5.
M5
S1000 M3
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "redundant_m_code");
      expect(m.length).toBe(0);
    });

    it("flags M8 re-issued after M8", () => {
      const code = `%
O1001
M8
G0 X5.
M8
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "redundant_m_code");
      expect(m.length).toBe(1);
    });
  });

  describe("safe-start block skip", () => {
    it("does not flag modal in safe-start reset block even after prior G90", () => {
      const code = `%
O1001
G90
G0 X5.
G0 X10.
G17 G20 G40 G49 G54 G80 G90
G0 X5.
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "redundant_modal_reissue");
      expect(m.length).toBe(0);
    });

    it("can disable safe-start skip", () => {
      const code = `%
O1001
G90
G0 X5.
G17 G20 G40 G49 G54 G80 G90
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code, {
        check_safe_start_skip: false,
      });
      const m = r.issues.filter((i) => i.kind === "redundant_modal_reissue");
      expect(m.length).toBeGreaterThan(0);
    });
  });

  describe("post-M6 window", () => {
    it("allows modal re-assert within safe_start_window after M6", () => {
      const code = `%
O1001
G90
G54
T1 M6
G90
G54
G0 X5.
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "redundant_modal_reissue");
      expect(m.length).toBe(0);
    });

    it("flags re-assert outside window", () => {
      const code = `%
O1001
G90
T1 M6
G0 X5.
G0 X10.
G0 X15.
G0 X20.
G90
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code, {
        safe_start_window: 2,
      });
      const m = r.issues.filter((i) => i.kind === "redundant_modal_reissue");
      expect(m.length).toBe(1);
    });
  });

  describe("summary metrics", () => {
    it("reports gcode_reissues count", () => {
      const code = `%
O1001
G90
G0 X5.
G0 X10.
G90
G0 X5.
G90
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code);
      expect(r.summary.gcode_reissues).toBe(2);
    });

    it("reports feed_reissues count", () => {
      const code = `%
O1001
G1 X5. F100.
G1 X10. F100.
G1 X15. F100.
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code);
      expect(r.summary.feed_reissues).toBe(2);
    });

    it("reports valid=true when only info-level", () => {
      const code = `%
O1001
G90
G0 X5.
G90
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code);
      expect(r.summary.valid).toBe(true);
    });
  });

  describe("quickCheck", () => {
    it("returns summary", () => {
      const code = `%
O1001
G90
G0 X5.
G90
M30
%`;
      const q = ppRedundantModalValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.total_reissues).toBe(1);
    });

    it("handles empty code", () => {
      const q = ppRedundantModalValidatorEngine.quickCheck("");
      expect(q.valid).toBe(true);
      expect(q.total_reissues).toBe(0);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppRedundantModalValidatorEngine.defaultOptions();
      expect(o.check_gcode_modal).toBe(true);
      expect(o.check_feed).toBe(true);
      expect(o.check_spindle_speed).toBe(true);
      expect(o.check_tool_number).toBe(true);
      expect(o.check_mcode_modal).toBe(true);
      expect(o.check_safe_start_skip).toBe(true);
      expect(o.safe_start_window).toBe(2);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppRedundantModalValidatorEngine.validate("");
      expect(r.summary.total_issues).toBe(0);
    });

    it("ignores G-codes in comments", () => {
      const code = `%
O1001
G90
(G90 WAS NEEDED HERE)
G0 X5.
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "redundant_modal_reissue");
      expect(m.length).toBe(0);
    });

    it("distinguishes G90 and G90.1", () => {
      const code = `%
O1001
G90
G0 X5.
G90.1
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "redundant_modal_reissue");
      expect(m.length).toBe(0);
    });

    it("opt-out per-check disables flagging", () => {
      const code = `%
O1001
G90
G0 X5.
G90
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code, {
        check_gcode_modal: false,
      });
      expect(r.summary.gcode_reissues).toBe(0);
    });

    it("handles multiple modals in same block", () => {
      const code = `%
O1001
G90 G54
G0 X5.
G90 G54
M30
%`;
      const r = ppRedundantModalValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "redundant_modal_reissue");
      expect(m.length).toBe(2);
    });
  });
});
