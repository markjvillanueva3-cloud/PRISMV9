/**
 * PPDwellValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPDwellValidatorEngine,
  ppDwellValidatorEngine,
} from "../engines/PPDwellValidatorEngine.js";

describe("PPDwellValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppDwellValidatorEngine).toBeInstanceOf(PPDwellValidatorEngine);
  });

  describe("dwell_without_time", () => {
    it("flags G4 with no P or X", () => {
      const code = `%
O1001
G4
M30
%`;
      const r = ppDwellValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "dwell_without_time");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag G4 with P", () => {
      const code = `%
O1001
G4 P2.
M30
%`;
      const r = ppDwellValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "dwell_without_time");
      expect(m.length).toBe(0);
    });

    it("does not flag G4 with X", () => {
      const code = `%
O1001
G4 X1.5
M30
%`;
      const r = ppDwellValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "dwell_without_time");
      expect(m.length).toBe(0);
    });
  });

  describe("dwell_with_motion", () => {
    it("flags G4 with Y coord", () => {
      const code = `%
O1001
G4 P2. Y10.
M30
%`;
      const r = ppDwellValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "dwell_with_motion");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("flags G4 with Z coord", () => {
      const code = `%
O1001
G4 P2. Z-5.
M30
%`;
      const r = ppDwellValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "dwell_with_motion");
      expect(m.length).toBe(1);
    });

    it("does not flag G4 with X alone (X is dwell-seconds word)", () => {
      const code = `%
O1001
G4 X2.
M30
%`;
      const r = ppDwellValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "dwell_with_motion");
      expect(m.length).toBe(0);
    });
  });

  describe("excessive_dwell_time", () => {
    it("flags G4 P120 (2 min)", () => {
      const code = `%
O1001
G4 P120.
M30
%`;
      const r = ppDwellValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "excessive_dwell_time");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag normal dwell", () => {
      const code = `%
O1001
G4 P2.
M30
%`;
      const r = ppDwellValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "excessive_dwell_time");
      expect(m.length).toBe(0);
    });

    it("custom max_dwell_sec respected", () => {
      const code = `%
O1001
G4 P5.
M30
%`;
      const r = ppDwellValidatorEngine.validate(code, { max_dwell_sec: 3 });
      const m = r.issues.filter((i) => i.kind === "excessive_dwell_time");
      expect(m.length).toBe(1);
    });

    it("check_excessive=false suppresses", () => {
      const code = `%
O1001
G4 P600.
M30
%`;
      const r = ppDwellValidatorEngine.validate(code, {
        check_excessive: false,
      });
      const m = r.issues.filter((i) => i.kind === "excessive_dwell_time");
      expect(m.length).toBe(0);
    });
  });

  describe("too_short_dwell", () => {
    it("flags G4 P0.001 (1 ms)", () => {
      const code = `%
O1001
G4 P0.001
M30
%`;
      const r = ppDwellValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "too_short_dwell");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag 0.5s dwell", () => {
      const code = `%
O1001
G4 P0.5
M30
%`;
      const r = ppDwellValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "too_short_dwell");
      expect(m.length).toBe(0);
    });

    it("check_too_short=false suppresses", () => {
      const code = `%
O1001
G4 P0.001
M30
%`;
      const r = ppDwellValidatorEngine.validate(code, { check_too_short: false });
      const m = r.issues.filter((i) => i.kind === "too_short_dwell");
      expect(m.length).toBe(0);
    });
  });

  describe("negative_dwell_time", () => {
    it("flags G4 P-2", () => {
      const code = `%
O1001
G4 P-2.
M30
%`;
      const r = ppDwellValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "negative_dwell_time");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("flags G4 X-1.5", () => {
      const code = `%
O1001
G4 X-1.5
M30
%`;
      const r = ppDwellValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "negative_dwell_time");
      expect(m.length).toBe(1);
    });

    it("does not flag positive values", () => {
      const code = `%
O1001
G4 P2.
M30
%`;
      const r = ppDwellValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "negative_dwell_time");
      expect(m.length).toBe(0);
    });
  });

  describe("unit mode — milliseconds", () => {
    it("P500 interpreted as 500ms in milliseconds mode", () => {
      const code = `%
O1001
G4 P500
M30
%`;
      const r = ppDwellValidatorEngine.validate(code, {
        p_unit_mode: "milliseconds",
      });
      // 500ms = 0.5s, within range, no issues
      expect(r.summary.total_dwell_time_sec).toBeCloseTo(0.5);
    });

    it("P500 interpreted as 500s in seconds mode (triggers excessive)", () => {
      const code = `%
O1001
G4 P500
M30
%`;
      const r = ppDwellValidatorEngine.validate(code, {
        p_unit_mode: "seconds",
      });
      const m = r.issues.filter((i) => i.kind === "excessive_dwell_time");
      expect(m.length).toBe(1);
      expect(r.summary.total_dwell_time_sec).toBeCloseTo(500);
    });
  });

  describe("summary metrics", () => {
    it("counts total_dwells", () => {
      const code = `%
O1001
G4 P1.
G4 P2.
G4 P3.
M30
%`;
      const r = ppDwellValidatorEngine.validate(code);
      expect(r.summary.total_dwells).toBe(3);
    });

    it("sums total_dwell_time_sec", () => {
      const code = `%
O1001
G4 P2.
G4 X3.5
M30
%`;
      const r = ppDwellValidatorEngine.validate(code);
      expect(r.summary.total_dwell_time_sec).toBeCloseTo(5.5);
    });

    it("tracks longest/shortest", () => {
      const code = `%
O1001
G4 P0.5
G4 P5.
G4 P2.
M30
%`;
      const r = ppDwellValidatorEngine.validate(code);
      expect(r.summary.longest_dwell_sec).toBeCloseTo(5);
      expect(r.summary.shortest_dwell_sec).toBeCloseTo(0.5);
    });

    it("counts p_based and x_based separately", () => {
      const code = `%
O1001
G4 P1.
G4 X2.
G4 P3.
M30
%`;
      const r = ppDwellValidatorEngine.validate(code);
      expect(r.summary.p_based_count).toBe(2);
      expect(r.summary.x_based_count).toBe(1);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean program", () => {
      const code = `%
O1001
G4 P2.
M30
%`;
      const q = ppDwellValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.total_dwells).toBe(1);
    });

    it("returns valid=false for dwell_without_time", () => {
      const code = `%
O1001
G4
M30
%`;
      const q = ppDwellValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
      expect(q.errors).toBeGreaterThan(0);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppDwellValidatorEngine.defaultOptions();
      expect(o.p_unit_mode).toBe("seconds");
      expect(o.max_dwell_sec).toBe(60);
      expect(o.min_dwell_sec).toBeCloseTo(0.01);
      expect(o.check_excessive).toBe(true);
      expect(o.check_too_short).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppDwellValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
      expect(r.summary.total_dwells).toBe(0);
    });

    it("handles program without G4", () => {
      const code = `%
O1001
G0 X10.
G1 X20. F100.
M30
%`;
      const r = ppDwellValidatorEngine.validate(code);
      expect(r.summary.total_dwells).toBe(0);
      expect(r.total_issues).toBe(0);
    });

    it("ignores G4 inside comments", () => {
      const code = `%
O1001
(G4 P10 mentioned in comment)
G4 P2.
M30
%`;
      const r = ppDwellValidatorEngine.validate(code);
      expect(r.summary.total_dwells).toBe(1);
    });

    it("handles G04 zero-padded form", () => {
      const code = `%
O1001
G04 P2.
M30
%`;
      const r = ppDwellValidatorEngine.validate(code);
      expect(r.summary.total_dwells).toBe(1);
    });
  });
});
