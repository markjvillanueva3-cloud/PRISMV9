/**
 * PPSpindleStateValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPSpindleStateValidatorEngine,
  ppSpindleStateValidatorEngine,
} from "../engines/PPSpindleStateValidatorEngine.js";

describe("PPSpindleStateValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppSpindleStateValidatorEngine).toBeInstanceOf(PPSpindleStateValidatorEngine);
  });

  describe("cut_with_spindle_off", () => {
    it("flags G1 cut with M5 active", () => {
      const code = `%
O1001
M3 S1000
G0 X0. Y0. Z5.
M5
G1 Z-2. F100.
M30
%`;
      const r = ppSpindleStateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "cut_with_spindle_off");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag G1 with spindle on", () => {
      const code = `%
O1001
M3 S1000
G0 X0. Y0. Z5.
G1 Z-2. F100.
M5
M30
%`;
      const r = ppSpindleStateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "cut_with_spindle_off");
      expect(m.length).toBe(0);
    });

    it("flags G2 arc with spindle off", () => {
      const code = `%
O1001
G0 X0. Y0. Z5.
G2 X10. Y10. I5. J0. F100.
M30
%`;
      const r = ppSpindleStateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "cut_with_spindle_off");
      expect(m.length).toBe(1);
    });

    it("check_cut_off=false suppresses", () => {
      const code = `%
O1001
G1 X10. F100.
M30
%`;
      const r = ppSpindleStateValidatorEngine.validate(code, {
        check_cut_off: false,
      });
      const m = r.issues.filter((i) => i.kind === "cut_with_spindle_off");
      expect(m.length).toBe(0);
    });
  });

  describe("spindle_on_without_s", () => {
    it("flags M3 with no prior S word", () => {
      const code = `%
O1001
M3
G0 X0. Y0. Z5.
M30
%`;
      const r = ppSpindleStateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "spindle_on_without_s");
      expect(m.length).toBe(1);
    });

    it("does not flag M3 S1000 on same line", () => {
      const code = `%
O1001
M3 S1000
G0 X0. Y0. Z5.
M30
%`;
      const r = ppSpindleStateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "spindle_on_without_s");
      expect(m.length).toBe(0);
    });

    it("does not flag when S set on prior line", () => {
      const code = `%
O1001
S2000
M3
G0 X0. Y0. Z5.
M30
%`;
      const r = ppSpindleStateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "spindle_on_without_s");
      expect(m.length).toBe(0);
    });
  });

  describe("direction_reversal", () => {
    it("flags M3 → M4 without M5", () => {
      const code = `%
O1001
M3 S1000
G1 X10. F100.
M4
G1 X-10.
M5
M30
%`;
      const r = ppSpindleStateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "direction_reversal");
      expect(m.length).toBe(1);
      expect(m[0].details?.from_direction).toBe("M3");
      expect(m[0].details?.to_direction).toBe("M4");
    });

    it("does not flag M3 → M5 → M4", () => {
      const code = `%
O1001
M3 S1000
G1 X10. F100.
M5
M4 S1000
G1 X-10.
M5
M30
%`;
      const r = ppSpindleStateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "direction_reversal");
      expect(m.length).toBe(0);
    });

    it("flags multiple reversals", () => {
      const code = `%
O1001
M3 S1000
G1 X10. F100.
M4
M3
M4
M5
M30
%`;
      const r = ppSpindleStateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "direction_reversal");
      expect(m.length).toBe(3);
    });
  });

  describe("tool_change_spindle_on", () => {
    it("flags M6 while M3 active", () => {
      const code = `%
O1001
M3 S1000
G1 X10. F100.
T2 M6
M30
%`;
      const r = ppSpindleStateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "tool_change_spindle_on");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag M6 after M5", () => {
      const code = `%
O1001
M3 S1000
G1 X10. F100.
M5
T2 M6
M3 S2000
M30
%`;
      const r = ppSpindleStateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "tool_change_spindle_on");
      expect(m.length).toBe(0);
    });
  });

  describe("end_without_stop (info, opt-in)", () => {
    it("flags M30 with spindle on when enabled", () => {
      const code = `%
O1001
M3 S1000
G1 X10. F100.
M30
%`;
      const r = ppSpindleStateValidatorEngine.validate(code, {
        check_end_without_stop: true,
      });
      const m = r.issues.filter((i) => i.kind === "end_without_stop");
      expect(m.length).toBe(1);
    });

    it("does not flag by default", () => {
      const code = `%
O1001
M3 S1000
G1 X10. F100.
M30
%`;
      const r = ppSpindleStateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "end_without_stop");
      expect(m.length).toBe(0);
    });
  });

  describe("missing_initial_spindle", () => {
    it("flags cutting with no prior spindle command", () => {
      const code = `%
O1001
G0 X0. Y0. Z5.
G1 Z-2. F100.
M30
%`;
      const r = ppSpindleStateValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "missing_initial_spindle" || i.kind === "cut_with_spindle_off",
      );
      expect(m.length).toBeGreaterThanOrEqual(1);
    });

    it("does not flag when spindle started before cutting", () => {
      const code = `%
O1001
M3 S1000
G0 X0. Y0. Z5.
G1 Z-2. F100.
M5
M30
%`;
      const r = ppSpindleStateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_initial_spindle");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("counts M3/M4/M5/M6", () => {
      const code = `%
O1001
M3 S1000
G1 X10. F100.
M5
T2 M6
M4 S2000
G1 X-10.
M5
M30
%`;
      const r = ppSpindleStateValidatorEngine.validate(code);
      expect(r.summary.m3_count).toBe(1);
      expect(r.summary.m4_count).toBe(1);
      expect(r.summary.m5_count).toBe(2);
      expect(r.summary.m6_count).toBe(1);
    });

    it("tracks last_s_word", () => {
      const code = `%
O1001
M3 S1200
G1 X10. F100.
S2500
M5
M30
%`;
      const r = ppSpindleStateValidatorEngine.validate(code);
      expect(r.summary.last_s_word).toBe(2500);
    });

    it("counts reversals", () => {
      const code = `%
O1001
M3 S1000
M4
M3
M5
M30
%`;
      const r = ppSpindleStateValidatorEngine.validate(code);
      expect(r.summary.reversals).toBe(2);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean program", () => {
      const code = `%
O1001
M3 S1000
G0 X0. Y0. Z5.
G1 Z-2. F100.
M5
M30
%`;
      const q = ppSpindleStateValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.errors).toBe(0);
    });

    it("returns valid=false on spindle-off cut", () => {
      const code = `%
O1001
G1 X10. F100.
M30
%`;
      const q = ppSpindleStateValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
      expect(q.errors).toBeGreaterThan(0);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppSpindleStateValidatorEngine.defaultOptions();
      expect(o.check_cut_off).toBe(true);
      expect(o.check_reversal).toBe(true);
      expect(o.check_tool_change).toBe(true);
      expect(o.check_end_without_stop).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppSpindleStateValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
    });

    it("handles program with only rapids (no cut)", () => {
      const code = `%
O1001
G0 X0. Y0. Z5.
M30
%`;
      const r = ppSpindleStateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "cut_with_spindle_off");
      expect(m.length).toBe(0);
    });

    it("ignores M3 inside comments", () => {
      const code = `%
O1001
M3 S1000
(M3 reference in comment)
G1 X10. F100.
M5
M30
%`;
      const r = ppSpindleStateValidatorEngine.validate(code);
      expect(r.summary.m3_count).toBe(1);
    });

    it("handles S word on its own line", () => {
      const code = `%
O1001
S1500
M3
G1 X10. F100.
M5
M30
%`;
      const r = ppSpindleStateValidatorEngine.validate(code);
      expect(r.summary.last_s_word).toBe(1500);
      const m = r.issues.filter((i) => i.kind === "spindle_on_without_s");
      expect(m.length).toBe(0);
    });
  });
});
