/**
 * PPRapidMoveValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPRapidMoveValidatorEngine,
  ppRapidMoveValidatorEngine,
} from "../engines/PPRapidMoveValidatorEngine.js";

describe("PPRapidMoveValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppRapidMoveValidatorEngine).toBeInstanceOf(PPRapidMoveValidatorEngine);
  });

  describe("rapid_below_clearance", () => {
    it("flags G0 Z1 with X motion below clearance", () => {
      const code = `%
O1001
T1 M6
G43 H1
M3 S1000
G0 X0 Y0 Z10.
G0 X5. Y5. Z1.
M30
%`;
      const r = ppRapidMoveValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "rapid_below_clearance");
      expect(m.length).toBeGreaterThanOrEqual(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag G0 above clearance", () => {
      const code = `%
O1001
T1 M6
G43 H1
M3 S1000
G0 X5. Y5. Z10.
M30
%`;
      const r = ppRapidMoveValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "rapid_below_clearance");
      expect(m.length).toBe(0);
    });

    it("custom clearance_z respected", () => {
      const code = `%
O1001
T1 M6
G43 H1
M3 S1000
G0 X5. Y5. Z20.
M30
%`;
      const r = ppRapidMoveValidatorEngine.validate(code, { clearance_z: 25 });
      const m = r.issues.filter((i) => i.kind === "rapid_below_clearance");
      expect(m.length).toBe(1);
    });

    it("check_below_clearance=false suppresses", () => {
      const code = `%
O1001
T1 M6
G43 H1
M3 S1000
G0 X5. Y5. Z0.
M30
%`;
      const r = ppRapidMoveValidatorEngine.validate(code, {
        check_below_clearance: false,
      });
      const m = r.issues.filter((i) => i.kind === "rapid_below_clearance");
      expect(m.length).toBe(0);
    });
  });

  describe("rapid_xyz_combined", () => {
    it("flags G0 X Y Z in one block", () => {
      const code = `%
O1001
T1 M6
G43 H1
M3 S1000
G0 X10. Y10. Z10.
M30
%`;
      const r = ppRapidMoveValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "rapid_xyz_combined");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag split G0 XY then Z", () => {
      const code = `%
O1001
T1 M6
G43 H1
M3 S1000
G0 X10. Y10.
G0 Z10.
M30
%`;
      const r = ppRapidMoveValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "rapid_xyz_combined");
      expect(m.length).toBe(0);
    });
  });

  describe("rapid_with_feed_word", () => {
    it("flags G0 F100", () => {
      const code = `%
O1001
T1 M6
G43 H1
M3 S1000
G0 X10. F100.
M30
%`;
      const r = ppRapidMoveValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "rapid_with_feed_word");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag G1 F100", () => {
      const code = `%
O1001
T1 M6
G43 H1
M3 S1000
G0 X10.
G1 X20. F100.
M30
%`;
      const r = ppRapidMoveValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "rapid_with_feed_word");
      expect(m.length).toBe(0);
    });
  });

  describe("first_motion_not_rapid", () => {
    it("flags G1 as first motion", () => {
      const code = `%
O1001
T1 M6
G43 H1
M3 S1000
G1 X10. F100.
M30
%`;
      const r = ppRapidMoveValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "first_motion_not_rapid");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag G0 as first motion", () => {
      const code = `%
O1001
T1 M6
G43 H1
M3 S1000
G0 X10.
G1 X20. F100.
M30
%`;
      const r = ppRapidMoveValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "first_motion_not_rapid");
      expect(m.length).toBe(0);
    });

    it("check_first_motion=false suppresses", () => {
      const code = `%
O1001
G1 X10. F100.
M30
%`;
      const r = ppRapidMoveValidatorEngine.validate(code, {
        check_first_motion: false,
      });
      const m = r.issues.filter((i) => i.kind === "first_motion_not_rapid");
      expect(m.length).toBe(0);
    });
  });

  describe("rapid_with_spindle_off", () => {
    it("flags G0 Z-descent with M5 active", () => {
      const code = `%
O1001
T1 M6
G43 H1
M5
G0 X0 Y0 Z20.
G0 Z1.
M30
%`;
      const r = ppRapidMoveValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "rapid_with_spindle_off");
      expect(m.length).toBeGreaterThanOrEqual(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag when M3 active", () => {
      const code = `%
O1001
T1 M6
G43 H1
M3 S1000
G0 X5. Y5. Z1.
M30
%`;
      const r = ppRapidMoveValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "rapid_with_spindle_off");
      expect(m.length).toBe(0);
    });
  });

  describe("rapid_missing_tool_length", () => {
    it("flags G0 Z before G43", () => {
      const code = `%
O1001
T1 M6
G0 X0 Y0 Z10.
G43 H1
M3 S1000
M30
%`;
      const r = ppRapidMoveValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "rapid_missing_tool_length");
      expect(m.length).toBeGreaterThanOrEqual(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag when G43 active", () => {
      const code = `%
O1001
T1 M6
G43 H1
M3 S1000
G0 X5. Y5. Z10.
M30
%`;
      const r = ppRapidMoveValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "rapid_missing_tool_length");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("counts rapids and feeds", () => {
      const code = `%
O1001
T1 M6
G43 H1
M3 S1000
G0 X0 Y0 Z10.
G1 X5. F100.
G1 X10.
G0 Z10.
M30
%`;
      const r = ppRapidMoveValidatorEngine.validate(code);
      expect(r.summary.rapid_count).toBe(2);
      expect(r.summary.feed_count).toBe(2);
    });

    it("tracks first_motion_type and line", () => {
      const code = `%
O1001
T1 M6
G43 H1
M3 S1000
G0 X0 Y0 Z10.
M30
%`;
      const r = ppRapidMoveValidatorEngine.validate(code);
      expect(r.summary.first_motion_type).toBe("G0");
      expect(r.summary.first_motion_line).toBe(6);
    });

    it("counts xyz_combined instances", () => {
      const code = `%
O1001
T1 M6
G43 H1
M3 S1000
G0 X5. Y5. Z10.
G0 X10. Y10. Z10.
M30
%`;
      const r = ppRapidMoveValidatorEngine.validate(code);
      expect(r.summary.xyz_combined_count).toBe(2);
    });

    it("counts below_clearance instances", () => {
      const code = `%
O1001
T1 M6
G43 H1
M3 S1000
G0 X5. Y5. Z1.
G0 X10. Y10. Z0.5
M30
%`;
      const r = ppRapidMoveValidatorEngine.validate(code);
      expect(r.summary.below_clearance_count).toBe(2);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean program", () => {
      const code = `%
O1001
T1 M6
G43 H1
M3 S1000
G0 X5. Y5. Z10.
G1 Z-2. F100.
G0 Z10.
M30
%`;
      const q = ppRapidMoveValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.rapid_count).toBe(2);
    });

    it("returns valid=false for first_motion_not_rapid", () => {
      const code = `%
O1001
G1 X10. F100.
M30
%`;
      const q = ppRapidMoveValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
      expect(q.errors).toBeGreaterThan(0);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppRapidMoveValidatorEngine.defaultOptions();
      expect(o.clearance_z).toBe(5);
      expect(o.check_below_clearance).toBe(true);
      expect(o.check_xyz_combined).toBe(true);
      expect(o.check_rapid_with_feed).toBe(true);
      expect(o.check_first_motion).toBe(true);
      expect(o.check_rapid_spindle_off).toBe(true);
      expect(o.check_missing_tool_length).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppRapidMoveValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
      expect(r.summary.rapid_count).toBe(0);
      expect(r.summary.first_motion_type).toBe("none");
    });

    it("handles program with no motion", () => {
      const code = `%
O1001
M3 S1000
M5
M30
%`;
      const r = ppRapidMoveValidatorEngine.validate(code);
      expect(r.summary.rapid_count).toBe(0);
      expect(r.summary.first_motion_type).toBe("none");
    });

    it("ignores rapids inside comments", () => {
      const code = `%
O1001
T1 M6
G43 H1
M3 S1000
(G0 X5. Y5. Z1. mentioned in comment)
G0 X10. Y10. Z10.
M30
%`;
      const r = ppRapidMoveValidatorEngine.validate(code);
      expect(r.summary.below_clearance_count).toBe(0);
    });

    it("modal G0 carries across lines (X only on second)", () => {
      const code = `%
O1001
T1 M6
G43 H1
M3 S1000
G0 X5. Y5. Z10.
X10.
M30
%`;
      const r = ppRapidMoveValidatorEngine.validate(code);
      expect(r.summary.rapid_count).toBe(2);
    });
  });
});
