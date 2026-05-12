/**
 * PPToolLengthCompValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPToolLengthCompValidatorEngine,
  ppToolLengthCompValidatorEngine,
} from "../engines/PPToolLengthCompValidatorEngine.js";

describe("PPToolLengthCompValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppToolLengthCompValidatorEngine).toBeInstanceOf(PPToolLengthCompValidatorEngine);
  });

  describe("g43_missing_h", () => {
    it("flags G43 with no H word", () => {
      const code = `%
O1001
T1 M6
G43
G0 Z10.
G1 Z-2. F100.
M30
%`;
      const r = ppToolLengthCompValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g43_missing_h");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag G43 H1", () => {
      const code = `%
O1001
T1 M6
G43 H1 Z10.
G1 Z-2. F100.
M30
%`;
      const r = ppToolLengthCompValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g43_missing_h");
      expect(m.length).toBe(0);
    });

    it("check_missing_h=false suppresses", () => {
      const code = `%
O1001
T1 M6
G43
G0 Z10.
M30
%`;
      const r = ppToolLengthCompValidatorEngine.validate(code, {
        check_missing_h: false,
      });
      const m = r.issues.filter((i) => i.kind === "g43_missing_h");
      expect(m.length).toBe(0);
    });
  });

  describe("h_t_mismatch", () => {
    it("flags H1 after T5", () => {
      const code = `%
O1001
T5 M6
G43 H1 Z10.
G1 Z-2. F100.
M30
%`;
      const r = ppToolLengthCompValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "h_t_mismatch");
      expect(m.length).toBe(1);
      expect(m[0].details?.t_word).toBe(5);
      expect(m[0].details?.h_word).toBe(1);
    });

    it("does not flag when H == T", () => {
      const code = `%
O1001
T3 M6
G43 H3 Z10.
G1 Z-2. F100.
M30
%`;
      const r = ppToolLengthCompValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "h_t_mismatch");
      expect(m.length).toBe(0);
    });
  });

  describe("motion_without_tlc", () => {
    it("flags Z-cut with no G43 ever active", () => {
      const code = `%
O1001
T1 M6
M3 S1000
G1 Z-2. F100.
M30
%`;
      const r = ppToolLengthCompValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "motion_without_tlc");
      expect(m.length).toBeGreaterThanOrEqual(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag once G43 seen", () => {
      const code = `%
O1001
T1 M6
G43 H1 Z10.
G1 Z-2. F100.
M30
%`;
      const r = ppToolLengthCompValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "motion_without_tlc");
      expect(m.length).toBe(0);
    });
  });

  describe("g49_then_z_motion", () => {
    it("flags Z-cut after G49", () => {
      const code = `%
O1001
T1 M6
G43 H1 Z10.
G49
G1 Z-2. F100.
M30
%`;
      const r = ppToolLengthCompValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g49_then_z_motion");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag after new G43 re-enables", () => {
      const code = `%
O1001
T1 M6
G43 H1 Z10.
G49
T2 M6
G43 H2 Z10.
G1 Z-2. F100.
M30
%`;
      const r = ppToolLengthCompValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g49_then_z_motion");
      expect(m.length).toBe(0);
    });

    it("check_g49_plunge=false suppresses", () => {
      const code = `%
O1001
T1 M6
G43 H1 Z10.
G49
G1 Z-2. F100.
M30
%`;
      const r = ppToolLengthCompValidatorEngine.validate(code, {
        check_g49_plunge: false,
      });
      const m = r.issues.filter((i) => i.kind === "g49_then_z_motion");
      expect(m.length).toBe(0);
    });
  });

  describe("tool_change_without_g43", () => {
    it("flags Z-cut after M6 with no intervening G43", () => {
      const code = `%
O1001
T1 M6
G43 H1 Z10.
G1 Z-2. F100.
G0 Z50.
T2 M6
G1 Z-2. F100.
M30
%`;
      const r = ppToolLengthCompValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "tool_change_without_g43");
      expect(m.length).toBe(1);
    });

    it("does not flag when G43 follows M6", () => {
      const code = `%
O1001
T1 M6
G43 H1 Z10.
G1 Z-2. F100.
G0 Z50.
T2 M6
G43 H2 Z10.
G1 Z-2. F100.
M30
%`;
      const r = ppToolLengthCompValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "tool_change_without_g43");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("counts G43/G44/G49/M6", () => {
      const code = `%
O1001
T1 M6
G43 H1 Z10.
G1 Z-2. F100.
G49
T2 M6
G44 H2 Z10.
G1 Z-1. F100.
G49
M30
%`;
      const r = ppToolLengthCompValidatorEngine.validate(code);
      expect(r.summary.g43_count).toBe(1);
      expect(r.summary.g44_count).toBe(1);
      expect(r.summary.g49_count).toBe(2);
      expect(r.summary.tool_changes).toBe(2);
    });

    it("tracks last_active_h and last_active_t", () => {
      const code = `%
O1001
T5 M6
G43 H5 Z10.
G1 Z-2. F100.
M30
%`;
      const r = ppToolLengthCompValidatorEngine.validate(code);
      expect(r.summary.last_active_h).toBe(5);
      expect(r.summary.last_active_t).toBe(5);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean program", () => {
      const code = `%
O1001
T1 M6
G43 H1 Z10.
M3 S1000
G1 Z-2. F100.
M5
G49
M30
%`;
      const q = ppToolLengthCompValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.g43_count).toBe(1);
    });

    it("returns valid=false on missing H", () => {
      const code = `%
O1001
T1 M6
G43 Z10.
M30
%`;
      const q = ppToolLengthCompValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppToolLengthCompValidatorEngine.defaultOptions();
      expect(o.check_missing_h).toBe(true);
      expect(o.check_h_t_mismatch).toBe(true);
      expect(o.check_motion_without_tlc).toBe(true);
      expect(o.check_g49_plunge).toBe(true);
      expect(o.check_tool_change_g43).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppToolLengthCompValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
    });

    it("handles no Z motion program", () => {
      const code = `%
O1001
T1 M6
G43 H1
M3 S1000
G0 X10. Y10.
M5
M30
%`;
      const r = ppToolLengthCompValidatorEngine.validate(code);
      expect(r.errors).toBe(0);
    });

    it("ignores G43 inside comment", () => {
      const code = `%
O1001
T1 M6
(G43 in comment)
G43 H1 Z10.
M30
%`;
      const r = ppToolLengthCompValidatorEngine.validate(code);
      expect(r.summary.g43_count).toBe(1);
    });

    it("handles multiple tool changes properly", () => {
      const code = `%
O1001
T1 M6
G43 H1 Z10.
G1 Z-1. F100.
G0 Z50.
T2 M6
G43 H2 Z10.
G1 Z-2. F100.
G0 Z50.
T3 M6
G43 H3 Z10.
G1 Z-3. F100.
M30
%`;
      const r = ppToolLengthCompValidatorEngine.validate(code);
      expect(r.errors).toBe(0);
      expect(r.summary.tool_changes).toBe(3);
    });
  });
});
