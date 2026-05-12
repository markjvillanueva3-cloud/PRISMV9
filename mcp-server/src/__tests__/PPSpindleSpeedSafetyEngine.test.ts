/**
 * PPSpindleSpeedSafetyEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPSpindleSpeedSafetyEngine,
  ppSpindleSpeedSafetyEngine,
} from "../engines/PPSpindleSpeedSafetyEngine.js";

describe("PPSpindleSpeedSafetyEngine", () => {
  it("exports singleton", () => {
    expect(ppSpindleSpeedSafetyEngine).toBeInstanceOf(PPSpindleSpeedSafetyEngine);
  });

  describe("zero_rpm_start", () => {
    it("flags M3 with no prior S", () => {
      const code = `%
O1001
G90 G21
M3
G0 X10.
M30
%`;
      const r = ppSpindleSpeedSafetyEngine.validate(code);
      const z = r.issues.filter((i) => i.kind === "zero_rpm_start");
      expect(z.length).toBe(1);
      expect(z[0].severity).toBe("error");
    });

    it("flags M3 with S0", () => {
      const code = `%
O1001
S0 M3
G0 X10.
M30
%`;
      const r = ppSpindleSpeedSafetyEngine.validate(code);
      const z = r.issues.filter((i) => i.kind === "zero_rpm_start");
      expect(z.length).toBe(1);
    });

    it("does not flag when S set before M3", () => {
      const code = `%
O1001
S2000 M3
G4 P1.0
G0 X10.
M30
%`;
      const r = ppSpindleSpeedSafetyEngine.validate(code);
      const z = r.issues.filter((i) => i.kind === "zero_rpm_start");
      expect(z.length).toBe(0);
    });

    it("flags M4 with no S", () => {
      const code = `%
O1001
M4
G0 X10.
M30
%`;
      const r = ppSpindleSpeedSafetyEngine.validate(code);
      const z = r.issues.filter((i) => i.kind === "zero_rpm_start");
      expect(z.length).toBe(1);
    });
  });

  describe("direction_flip_while_running", () => {
    it("flags M3 → M4 without M5", () => {
      const code = `%
O1001
S2000 M3
G0 X10.
M4
G0 X20.
M30
%`;
      const r = ppSpindleSpeedSafetyEngine.validate(code);
      const f = r.issues.filter((i) => i.kind === "direction_flip_while_running");
      expect(f.length).toBe(1);
      expect(f[0].severity).toBe("error");
    });

    it("flags M4 → M3 without M5", () => {
      const code = `%
O1001
S2000 M4
G0 X10.
M3
G0 X20.
M30
%`;
      const r = ppSpindleSpeedSafetyEngine.validate(code);
      const f = r.issues.filter((i) => i.kind === "direction_flip_while_running");
      expect(f.length).toBe(1);
    });

    it("does not flag when M5 between direction changes", () => {
      const code = `%
O1001
S2000 M3
G0 X10.
M5
S2000 M4
G0 X20.
M30
%`;
      const r = ppSpindleSpeedSafetyEngine.validate(code);
      const f = r.issues.filter((i) => i.kind === "direction_flip_while_running");
      expect(f.length).toBe(0);
    });
  });

  describe("excessive_rpm_jump", () => {
    it("flags S500 → S6000 (12x jump)", () => {
      const code = `%
O1001
S500 M3
G0 X10.
S6000
G1 X20. F100.
M30
%`;
      const r = ppSpindleSpeedSafetyEngine.validate(code);
      const j = r.issues.filter((i) => i.kind === "excessive_rpm_jump");
      expect(j.length).toBe(1);
      expect(j[0].severity).toBe("warning");
      expect(j[0].details?.ratio).toBeCloseTo(12, 0);
    });

    it("does not flag S500 → S2500 (5x jump, at limit)", () => {
      const code = `%
O1001
S500 M3
S2500
G0 X10.
M30
%`;
      const r = ppSpindleSpeedSafetyEngine.validate(code);
      const j = r.issues.filter((i) => i.kind === "excessive_rpm_jump");
      expect(j.length).toBe(0);
    });

    it("flags downward jump as well", () => {
      const code = `%
O1001
S10000 M3
S500
G0 X10.
M30
%`;
      const r = ppSpindleSpeedSafetyEngine.validate(code);
      const j = r.issues.filter((i) => i.kind === "excessive_rpm_jump");
      expect(j.length).toBe(1);
    });

    it("custom max_rpm_step_ratio respected", () => {
      const code = `%
O1001
S500 M3
S1500
G0 X10.
M30
%`;
      const r = ppSpindleSpeedSafetyEngine.validate(code, {
        max_rpm_step_ratio: 2,
      });
      const j = r.issues.filter((i) => i.kind === "excessive_rpm_jump");
      expect(j.length).toBe(1);
    });
  });

  describe("missing_dwell_after_start", () => {
    it("flags motion without G4 after M3", () => {
      const code = `%
O1001
S2000 M3
G0 X10. Y10.
M30
%`;
      const r = ppSpindleSpeedSafetyEngine.validate(code);
      const d = r.issues.filter((i) => i.kind === "missing_dwell_after_start");
      expect(d.length).toBe(1);
      expect(d[0].severity).toBe("warning");
    });

    it("does not flag when G4 precedes motion", () => {
      const code = `%
O1001
S2000 M3
G4 P1.0
G0 X10. Y10.
M30
%`;
      const r = ppSpindleSpeedSafetyEngine.validate(code);
      const d = r.issues.filter((i) => i.kind === "missing_dwell_after_start");
      expect(d.length).toBe(0);
    });

    it("does not flag when require_dwell_after_start=false", () => {
      const code = `%
O1001
S2000 M3
G0 X10. Y10.
M30
%`;
      const r = ppSpindleSpeedSafetyEngine.validate(code, {
        require_dwell_after_start: false,
      });
      const d = r.issues.filter((i) => i.kind === "missing_dwell_after_start");
      expect(d.length).toBe(0);
    });
  });

  describe("s_without_spindle_on", () => {
    it("flags S-word without M3/M4", () => {
      const code = `%
O1001
G90 G21
S2000
G0 X10.
M30
%`;
      const r = ppSpindleSpeedSafetyEngine.validate(code);
      const s = r.issues.filter((i) => i.kind === "s_without_spindle_on");
      expect(s.length).toBe(1);
      expect(s[0].severity).toBe("info");
    });

    it("does not flag when M3 commanded", () => {
      const code = `%
O1001
S2000 M3
G4 P1.0
G0 X10.
M30
%`;
      const r = ppSpindleSpeedSafetyEngine.validate(code);
      const s = r.issues.filter((i) => i.kind === "s_without_spindle_on");
      expect(s.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("tracks peak_rpm", () => {
      const code = `%
O1001
S1000 M3
G4 P1.0
G0 X10.
S5000
G1 X20. F100.
M30
%`;
      const r = ppSpindleSpeedSafetyEngine.validate(code);
      expect(r.summary.peak_rpm).toBe(5000);
    });

    it("counts M3/M4/M5 occurrences", () => {
      const code = `%
O1001
S2000 M3
G0 X10.
M5
S2000 M4
G0 X20.
M5
M30
%`;
      const r = ppSpindleSpeedSafetyEngine.validate(code);
      expect(r.summary.m3_count).toBe(1);
      expect(r.summary.m4_count).toBe(1);
      expect(r.summary.m5_count).toBe(2);
    });

    it("counts s_words_seen", () => {
      const code = `%
O1001
S500 M3
G4 P1.0
S1000
G0 X10.
S1500
M30
%`;
      const r = ppSpindleSpeedSafetyEngine.validate(code);
      expect(r.summary.s_words_seen).toBe(3);
    });

    it("valid=false when errors present", () => {
      const code = `%
O1001
M3
G0 X10.
M30
%`;
      const r = ppSpindleSpeedSafetyEngine.validate(code);
      expect(r.summary.valid).toBe(false);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean program", () => {
      const code = `%
O1001
S2000 M3
G4 P1.0
G0 X10.
M30
%`;
      const q = ppSpindleSpeedSafetyEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.peak_rpm).toBe(2000);
    });

    it("returns valid=false on error", () => {
      const code = `%
O1001
M3
G0 X10.
M30
%`;
      const q = ppSpindleSpeedSafetyEngine.quickCheck(code);
      expect(q.valid).toBe(false);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppSpindleSpeedSafetyEngine.defaultOptions();
      expect(o.max_rpm_step_ratio).toBe(5);
      expect(o.require_dwell_after_start).toBe(true);
      expect(o.min_dwell_seconds).toBeCloseTo(0.5);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppSpindleSpeedSafetyEngine.validate("");
      expect(r.total_issues).toBe(0);
      expect(r.summary.peak_rpm).toBeNull();
    });

    it("handles program with no spindle commands", () => {
      const code = `%
O1001
G0 X10.
M30
%`;
      const r = ppSpindleSpeedSafetyEngine.validate(code);
      expect(r.summary.m3_count).toBe(0);
      expect(r.summary.peak_rpm).toBeNull();
    });

    it("ignores M3 inside comments", () => {
      const code = `%
O1001
(S2000 M3 — setup comment)
G0 X10.
M30
%`;
      const r = ppSpindleSpeedSafetyEngine.validate(code);
      expect(r.summary.m3_count).toBe(0);
    });
  });
});
