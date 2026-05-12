/**
 * PPBlockSkipValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPBlockSkipValidatorEngine,
  ppBlockSkipValidatorEngine,
} from "../engines/PPBlockSkipValidatorEngine.js";

describe("PPBlockSkipValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppBlockSkipValidatorEngine).toBeInstanceOf(PPBlockSkipValidatorEngine);
  });

  describe("slash_without_switch", () => {
    it("flags slash line with no comment", () => {
      const code = `%
O1001
/G0 X10.
M30
%`;
      const r = ppBlockSkipValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "slash_without_switch");
      expect(m.length).toBeGreaterThanOrEqual(1);
      expect(m[0].severity).toBe("info");
    });

    it("does not flag slash with inline comment", () => {
      const code = `%
O1001
/G0 X10. (OP: test-mode)
M30
%`;
      const r = ppBlockSkipValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "slash_without_switch");
      expect(m.length).toBe(0);
    });

    it("check_slash_without_switch=false suppresses", () => {
      const code = `%
O1001
/G0 X10.
M30
%`;
      const r = ppBlockSkipValidatorEngine.validate(code, {
        check_slash_without_switch: false,
      });
      const m = r.issues.filter((i) => i.kind === "slash_without_switch");
      expect(m.length).toBe(0);
    });
  });

  describe("multi_level_slash", () => {
    it("flags /2 block skip", () => {
      const code = `%
O1001
G0 X5.
/2 G0 X10. (test-b)
M30
%`;
      const r = ppBlockSkipValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "multi_level_slash");
      expect(m.length).toBe(1);
      expect(m[0].details?.level).toBe(2);
    });

    it("flags /3 block skip", () => {
      const code = `%
O1001
G0 X5.
/3 G0 X10. (test-c)
M30
%`;
      const r = ppBlockSkipValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "multi_level_slash");
      expect(m.length).toBe(1);
      expect(m[0].details?.level).toBe(3);
    });

    it("does not flag single /", () => {
      const code = `%
O1001
/G0 X5. (test-a)
M30
%`;
      const r = ppBlockSkipValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "multi_level_slash");
      expect(m.length).toBe(0);
    });

    it("check_multi_level=false suppresses", () => {
      const code = `%
O1001
/2 G0 X10. (test-b)
M30
%`;
      const r = ppBlockSkipValidatorEngine.validate(code, {
        check_multi_level: false,
      });
      const m = r.issues.filter((i) => i.kind === "multi_level_slash");
      expect(m.length).toBe(0);
    });
  });

  describe("m0_in_subprogram", () => {
    it("flags M0 inside subprogram", () => {
      const code = `%
O1001
G0 X5.
M98 P2000
M30

O2000
G0 X10.
M0
M99
%`;
      const r = ppBlockSkipValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "m0_in_subprogram");
      expect(m.length).toBe(1);
      expect(m[0].details?.o_number).toBe(2000);
    });

    it("does not flag M0 in main program", () => {
      const code = `%
O1001
G0 X5.
M0
M30
%`;
      const r = ppBlockSkipValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "m0_in_subprogram");
      expect(m.length).toBe(0);
    });

    it("check_m0_in_sub=false suppresses", () => {
      const code = `%
O1001
M98 P2000
M30

O2000
M0
M99
%`;
      const r = ppBlockSkipValidatorEngine.validate(code, {
        check_m0_in_sub: false,
      });
      const m = r.issues.filter((i) => i.kind === "m0_in_subprogram");
      expect(m.length).toBe(0);
    });
  });

  describe("m1_without_optional (info, opt-in)", () => {
    it("flags M1 when check_m1_info=true", () => {
      const code = `%
O1001
G0 X5.
M1
M30
%`;
      const r = ppBlockSkipValidatorEngine.validate(code, {
        check_m1_info: true,
      });
      const m = r.issues.filter((i) => i.kind === "m1_without_optional");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("info");
    });

    it("does not flag by default", () => {
      const code = `%
O1001
M1
M30
%`;
      const r = ppBlockSkipValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "m1_without_optional");
      expect(m.length).toBe(0);
    });
  });

  describe("slash_with_motion_start", () => {
    it("flags first motion line starting with /", () => {
      const code = `%
O1001
/G0 X10. Y10. (test)
G1 Z-5. F100.
M30
%`;
      const r = ppBlockSkipValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "slash_with_motion_start");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag slash on non-motion line first", () => {
      const code = `%
O1001
G90 G54
G0 X10. Y10.
/M1 (optional pause)
M30
%`;
      const r = ppBlockSkipValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "slash_with_motion_start");
      expect(m.length).toBe(0);
    });

    it("check_slash_at_start=false suppresses", () => {
      const code = `%
O1001
/G0 X10. (test)
M30
%`;
      const r = ppBlockSkipValidatorEngine.validate(code, {
        check_slash_at_start: false,
      });
      const m = r.issues.filter((i) => i.kind === "slash_with_motion_start");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("counts slash lines and levels", () => {
      const code = `%
O1001
/G0 X5. (a)
/2 G0 X10. (b)
/3 G0 X15. (c)
/G0 X20. (d)
M30
%`;
      const r = ppBlockSkipValidatorEngine.validate(code);
      expect(r.summary.slash_lines).toBe(4);
      expect(r.summary.slash_level_1).toBe(2);
      expect(r.summary.slash_multi_level).toBe(2);
    });

    it("counts M0/M1/M30", () => {
      const code = `%
O1001
G0 X5.
M0
G0 X10.
M1
M30
%`;
      const r = ppBlockSkipValidatorEngine.validate(code);
      expect(r.summary.m0_count).toBe(1);
      expect(r.summary.m1_count).toBe(1);
      expect(r.summary.m30_count).toBe(1);
    });

    it("counts M2", () => {
      const code = `%
O1001
G0 X5.
M2
%`;
      const r = ppBlockSkipValidatorEngine.validate(code);
      expect(r.summary.m2_count).toBe(1);
    });

    it("reports valid=true when no errors (all info/warning)", () => {
      const code = `%
O1001
/G0 X5.
/2 G0 X10. (b)
M30
%`;
      const r = ppBlockSkipValidatorEngine.validate(code);
      // Only warnings + info, no errors
      expect(r.summary.valid).toBe(true);
      expect(r.errors).toBe(0);
    });
  });

  describe("quickCheck", () => {
    it("returns clean program summary", () => {
      const code = `%
O1001
G0 X5. Y5. Z0.
M30
%`;
      const q = ppBlockSkipValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.slash_lines).toBe(0);
      expect(q.m0_count).toBe(0);
    });

    it("reports counts for complex program", () => {
      const code = `%
O1001
/G0 X5. (a)
M0
M1
M30
%`;
      const q = ppBlockSkipValidatorEngine.quickCheck(code);
      expect(q.slash_lines).toBe(1);
      expect(q.m0_count).toBe(1);
      expect(q.m1_count).toBe(1);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppBlockSkipValidatorEngine.defaultOptions();
      expect(o.check_slash_without_switch).toBe(true);
      expect(o.check_multi_level).toBe(true);
      expect(o.check_m0_in_sub).toBe(true);
      expect(o.check_m1_info).toBe(false);
      expect(o.check_slash_at_start).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppBlockSkipValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
      expect(r.summary.slash_lines).toBe(0);
    });

    it("handles program with only O-number", () => {
      const code = `%
O1001
%`;
      const r = ppBlockSkipValidatorEngine.validate(code);
      expect(r.summary.slash_lines).toBe(0);
    });

    it("ignores slash inside comment", () => {
      const code = `%
O1001
(slash / inside comment)
G0 X5.
M30
%`;
      const r = ppBlockSkipValidatorEngine.validate(code);
      expect(r.summary.slash_lines).toBe(0);
    });

    it("handles multiple subprograms", () => {
      const code = `%
O1001
M98 P2000
M30

O2000
M0 (sub 1)
M99

O3000
M0 (sub 2)
M99
%`;
      const r = ppBlockSkipValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "m0_in_subprogram");
      expect(m.length).toBe(2);
    });
  });
});
