/**
 * PPCoolantSequenceValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPCoolantSequenceValidatorEngine,
  ppCoolantSequenceValidatorEngine,
} from "../engines/PPCoolantSequenceValidatorEngine.js";

describe("PPCoolantSequenceValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppCoolantSequenceValidatorEngine).toBeInstanceOf(PPCoolantSequenceValidatorEngine);
  });

  describe("cutting_without_coolant", () => {
    it("flags G1 with M9 active on required_coolant=true", () => {
      const code = `%
O1001
G90 G21
S2000 M3
G0 X10.
M9
G1 Z-1. F100.
G1 X20. F100.
M30
%`;
      const r = ppCoolantSequenceValidatorEngine.validate(code, {
        required_coolant: true,
      });
      const c = r.issues.filter((i) => i.kind === "cutting_without_coolant");
      expect(c.length).toBeGreaterThanOrEqual(2);
    });

    it("does not flag when coolant ON", () => {
      const code = `%
O1001
S2000 M3
M8
G1 Z-1. F100.
G1 X20. F100.
M9
M30
%`;
      const r = ppCoolantSequenceValidatorEngine.validate(code, {
        required_coolant: true,
      });
      const c = r.issues.filter((i) => i.kind === "cutting_without_coolant");
      expect(c.length).toBe(0);
    });

    it("does not flag by default (required_coolant=false)", () => {
      const code = `%
O1001
S2000 M3
G1 X10. F100.
M30
%`;
      const r = ppCoolantSequenceValidatorEngine.validate(code);
      const c = r.issues.filter((i) => i.kind === "cutting_without_coolant");
      expect(c.length).toBe(0);
    });
  });

  describe("coolant_on_without_spindle", () => {
    it("flags M8 with spindle OFF", () => {
      const code = `%
O1001
G90 G21
M8
G0 X10.
M30
%`;
      const r = ppCoolantSequenceValidatorEngine.validate(code);
      const c = r.issues.filter((i) => i.kind === "coolant_on_without_spindle");
      expect(c.length).toBe(1);
      expect(c[0].severity).toBe("error");
    });

    it("does not flag when M3 precedes M8", () => {
      const code = `%
O1001
S2000 M3
M8
G1 X10. F100.
M9
M30
%`;
      const r = ppCoolantSequenceValidatorEngine.validate(code);
      const c = r.issues.filter((i) => i.kind === "coolant_on_without_spindle");
      expect(c.length).toBe(0);
    });

    it("does not flag M8 when same-line M3", () => {
      const code = `%
O1001
S2000 M3 M8
G1 X10. F100.
M9
M30
%`;
      const r = ppCoolantSequenceValidatorEngine.validate(code);
      const c = r.issues.filter((i) => i.kind === "coolant_on_without_spindle");
      expect(c.length).toBe(0);
    });

    it("flags M7 (mist) with spindle OFF", () => {
      const code = `%
O1001
M7
G0 X10.
M30
%`;
      const r = ppCoolantSequenceValidatorEngine.validate(code);
      const c = r.issues.filter((i) => i.kind === "coolant_on_without_spindle");
      expect(c.length).toBe(1);
    });
  });

  describe("stale_coolant_across_toolchange", () => {
    it("flags M6 with M8 still active", () => {
      const code = `%
O1001
S2000 M3
M8
G1 X10. F100.
T2 M6
S2000 M3
G1 X20. F100.
M9
M30
%`;
      const r = ppCoolantSequenceValidatorEngine.validate(code);
      const s = r.issues.filter((i) => i.kind === "stale_coolant_across_toolchange");
      expect(s.length).toBe(1);
      expect(s[0].severity).toBe("warning");
    });

    it("does not flag when M9 precedes M6", () => {
      const code = `%
O1001
S2000 M3
M8
G1 X10. F100.
M9
M5
T2 M6
S2000 M3
M8
G1 X20. F100.
M9
M30
%`;
      const r = ppCoolantSequenceValidatorEngine.validate(code);
      const s = r.issues.filter((i) => i.kind === "stale_coolant_across_toolchange");
      expect(s.length).toBe(0);
    });

    it("does not flag when M9 on same line as M6", () => {
      const code = `%
O1001
S2000 M3
M8
G1 X10. F100.
M9 T2 M6
S2000 M3
M30
%`;
      const r = ppCoolantSequenceValidatorEngine.validate(code);
      const s = r.issues.filter((i) => i.kind === "stale_coolant_across_toolchange");
      expect(s.length).toBe(0);
    });
  });

  describe("redundant coolant", () => {
    it("flags M8 after M8", () => {
      const code = `%
O1001
S2000 M3
M8
G1 X10. F100.
M8
G1 Y10. F100.
M9
M30
%`;
      const r = ppCoolantSequenceValidatorEngine.validate(code);
      const red = r.issues.filter((i) => i.kind === "redundant_coolant_on");
      expect(red.length).toBe(1);
      expect(red[0].severity).toBe("info");
    });

    it("flags M9 after M9", () => {
      const code = `%
O1001
M9
M9
M30
%`;
      const r = ppCoolantSequenceValidatorEngine.validate(code);
      const red = r.issues.filter((i) => i.kind === "redundant_coolant_off");
      expect(red.length).toBe(1);
    });

    it("warn_redundant=false suppresses warnings", () => {
      const code = `%
O1001
S2000 M3
M8
M8
M9
M30
%`;
      const r = ppCoolantSequenceValidatorEngine.validate(code, {
        warn_redundant: false,
      });
      const red = r.issues.filter((i) => i.kind.startsWith("redundant"));
      expect(red.length).toBe(0);
    });
  });

  describe("missing_final_m9", () => {
    it("flags program ending with M8 active", () => {
      const code = `%
O1001
S2000 M3
M8
G1 X10. F100.
M30
%`;
      const r = ppCoolantSequenceValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_final_m9");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag when M9 precedes M30", () => {
      const code = `%
O1001
S2000 M3
M8
G1 X10. F100.
M9
M30
%`;
      const r = ppCoolantSequenceValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_final_m9");
      expect(m.length).toBe(0);
    });

    it("require_final_m9=false suppresses", () => {
      const code = `%
O1001
S2000 M3
M8
M30
%`;
      const r = ppCoolantSequenceValidatorEngine.validate(code, {
        require_final_m9: false,
      });
      const m = r.issues.filter((i) => i.kind === "missing_final_m9");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("counts M7/M8/M9", () => {
      const code = `%
O1001
S2000 M3
M8
G1 X10. F100.
M9
M7
G1 Y10. F100.
M9
M30
%`;
      const r = ppCoolantSequenceValidatorEngine.validate(code);
      expect(r.summary.m7_count).toBe(1);
      expect(r.summary.m8_count).toBe(1);
      expect(r.summary.m9_count).toBe(2);
    });

    it("counts cutting lines with/without coolant", () => {
      const code = `%
O1001
S2000 M3
M8
G1 X10. F100.
G1 Y10. F100.
M9
G1 X20. F100.
M30
%`;
      const r = ppCoolantSequenceValidatorEngine.validate(code);
      expect(r.summary.cutting_lines_with_coolant).toBe(2);
      expect(r.summary.cutting_lines_without_coolant).toBe(1);
    });

    it("reports final_coolant", () => {
      const code = `%
O1001
S2000 M3
M8
G1 X10. F100.
M9
M30
%`;
      const r = ppCoolantSequenceValidatorEngine.validate(code);
      expect(r.summary.final_coolant).toBe("M9");
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean program", () => {
      const code = `%
O1001
S2000 M3
M8
G1 X10. F100.
M9
M30
%`;
      const q = ppCoolantSequenceValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.final_coolant).toBe("M9");
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppCoolantSequenceValidatorEngine.defaultOptions();
      expect(o.required_coolant).toBe(false);
      expect(o.warn_stale_across_m6).toBe(true);
      expect(o.warn_redundant).toBe(true);
      expect(o.require_final_m9).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppCoolantSequenceValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
    });

    it("handles program with no coolant commands", () => {
      const code = `%
O1001
S2000 M3
G1 X10. F100.
M5
M30
%`;
      const r = ppCoolantSequenceValidatorEngine.validate(code);
      expect(r.summary.m7_count).toBe(0);
      expect(r.summary.m8_count).toBe(0);
    });

    it("ignores coolant codes in comments", () => {
      const code = `%
O1001
(M8 mentioned in comment)
S2000 M3
G1 X10. F100.
M30
%`;
      const r = ppCoolantSequenceValidatorEngine.validate(code);
      expect(r.summary.m8_count).toBe(0);
    });
  });
});
