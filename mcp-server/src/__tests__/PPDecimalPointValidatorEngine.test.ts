/**
 * PPDecimalPointValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPDecimalPointValidatorEngine,
  ppDecimalPointValidatorEngine,
} from "../engines/PPDecimalPointValidatorEngine.js";

describe("PPDecimalPointValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppDecimalPointValidatorEngine).toBeInstanceOf(PPDecimalPointValidatorEngine);
  });

  describe("dimension_missing_decimal", () => {
    it("flags X5 without decimal", () => {
      const code = `%
O1001
G0 X5 Y0 Z0.
M30
%`;
      const r = ppDecimalPointValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "dimension_missing_decimal");
      expect(m.length).toBe(2);  // X5 and Y0 (Y0 has no decimal either)
    });

    it("does not flag X5.", () => {
      const code = `%
O1001
G0 X5. Y0. Z0.
M30
%`;
      const r = ppDecimalPointValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "dimension_missing_decimal");
      expect(m.length).toBe(0);
    });

    it("does not flag X5.000", () => {
      const code = `%
O1001
G0 X5.000 Y0.000 Z0.000
M30
%`;
      const r = ppDecimalPointValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "dimension_missing_decimal");
      expect(m.length).toBe(0);
    });

    it("flags negative integer (X-10)", () => {
      const code = `%
O1001
G0 X-10 Y0.
M30
%`;
      const r = ppDecimalPointValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "dimension_missing_decimal");
      expect(m.length).toBe(1);
    });

    it("does not flag G or M codes", () => {
      const code = `%
O1001
G0 G90 G54
M3 M8
M30
%`;
      const r = ppDecimalPointValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "dimension_missing_decimal");
      expect(m.length).toBe(0);
    });

    it("handles I/J/K arc center offsets", () => {
      const code = `%
O1001
G2 X10. Y0. I5 J0
M30
%`;
      const r = ppDecimalPointValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "dimension_missing_decimal");
      expect(m.length).toBe(2);  // I5 and J0
    });

    it("custom dimension_letters respected", () => {
      const code = `%
O1001
G0 X5 E10
M30
%`;
      const r = ppDecimalPointValidatorEngine.validate(code, {
        dimension_letters: ["E"],
      });
      const m = r.issues.filter((i) => i.kind === "dimension_missing_decimal");
      expect(m.length).toBe(1);
      expect(m[0].details?.word).toBe("E");
    });

    it("check_dimensions=false suppresses", () => {
      const code = `%
O1001
G0 X5 Y0 Z0
M30
%`;
      const r = ppDecimalPointValidatorEngine.validate(code, {
        check_dimensions: false,
      });
      const m = r.issues.filter((i) => i.kind === "dimension_missing_decimal");
      expect(m.length).toBe(0);
    });
  });

  describe("feed_missing_decimal", () => {
    it("flags F100 when check_feed=true", () => {
      const code = `%
O1001
G1 X10. F100
M30
%`;
      const r = ppDecimalPointValidatorEngine.validate(code, {
        check_feed: true,
      });
      const m = r.issues.filter((i) => i.kind === "feed_missing_decimal");
      expect(m.length).toBe(1);
    });

    it("does not flag by default", () => {
      const code = `%
O1001
G1 X10. F100
M30
%`;
      const r = ppDecimalPointValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "feed_missing_decimal");
      expect(m.length).toBe(0);
    });
  });

  describe("spindle_missing_decimal", () => {
    it("flags S1000 when check_spindle=true", () => {
      const code = `%
O1001
M3 S1000
M30
%`;
      const r = ppDecimalPointValidatorEngine.validate(code, {
        check_spindle: true,
      });
      const m = r.issues.filter((i) => i.kind === "spindle_missing_decimal");
      expect(m.length).toBe(1);
    });

    it("does not flag by default", () => {
      const code = `%
O1001
M3 S1000
M30
%`;
      const r = ppDecimalPointValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "spindle_missing_decimal");
      expect(m.length).toBe(0);
    });
  });

  describe("dwell_P_missing_decimal", () => {
    it("flags G4 P2 without decimal", () => {
      const code = `%
O1001
G4 P2
M30
%`;
      const r = ppDecimalPointValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "dwell_P_missing_decimal");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag G4 P2.", () => {
      const code = `%
O1001
G4 P2.
M30
%`;
      const r = ppDecimalPointValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "dwell_P_missing_decimal");
      expect(m.length).toBe(0);
    });

    it("does not flag M98 P2000 (not a dwell line)", () => {
      const code = `%
O1001
M98 P2000
M30
%`;
      const r = ppDecimalPointValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "dwell_P_missing_decimal");
      expect(m.length).toBe(0);
    });

    it("check_dwell=false suppresses", () => {
      const code = `%
O1001
G4 P2
M30
%`;
      const r = ppDecimalPointValidatorEngine.validate(code, {
        check_dwell: false,
      });
      const m = r.issues.filter((i) => i.kind === "dwell_P_missing_decimal");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("counts dimension totals and missing", () => {
      const code = `%
O1001
G0 X5 Y10. Z15
G1 X20. F100.
M30
%`;
      const r = ppDecimalPointValidatorEngine.validate(code);
      expect(r.summary.dimension_words_total).toBe(4);
      expect(r.summary.dimension_words_missing_decimal).toBe(2);  // X5, Z15
    });

    it("counts feeds/spindles when enabled", () => {
      const code = `%
O1001
M3 S1000
G1 X10. F100
M30
%`;
      const r = ppDecimalPointValidatorEngine.validate(code, {
        check_feed: true,
        check_spindle: true,
      });
      expect(r.summary.feed_words_missing_decimal).toBe(1);
      expect(r.summary.spindle_words_missing_decimal).toBe(1);
    });

    it("counts dwell missing", () => {
      const code = `%
O1001
G4 P2
G4 P5
G4 P3.
M30
%`;
      const r = ppDecimalPointValidatorEngine.validate(code);
      expect(r.summary.dwell_missing_decimal).toBe(2);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for decimal-clean program", () => {
      const code = `%
O1001
G0 X5. Y10. Z0.
G1 Z-2. F100.
M30
%`;
      const q = ppDecimalPointValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.dimension_missing).toBe(0);
    });

    it("counts dimension_missing", () => {
      const code = `%
O1001
G0 X5 Y10 Z0
M30
%`;
      const q = ppDecimalPointValidatorEngine.quickCheck(code);
      expect(q.dimension_missing).toBe(3);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppDecimalPointValidatorEngine.defaultOptions();
      expect(o.check_dimensions).toBe(true);
      expect(o.check_feed).toBe(false);
      expect(o.check_spindle).toBe(false);
      expect(o.check_dwell).toBe(true);
      expect(o.dimension_letters).toContain("X");
      expect(o.dimension_letters).toContain("Z");
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppDecimalPointValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
    });

    it("ignores dimensions inside comments", () => {
      const code = `%
O1001
(X5 Y10 Z0 mentioned in comment)
G0 X5. Y10. Z0.
M30
%`;
      const r = ppDecimalPointValidatorEngine.validate(code);
      expect(r.total_issues).toBe(0);
    });

    it("handles multiple dimensions per line", () => {
      const code = `%
O1001
G0 X5 Y10 Z15
M30
%`;
      const r = ppDecimalPointValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "dimension_missing_decimal");
      expect(m.length).toBe(3);
    });

    it("handles R word on canned cycle", () => {
      const code = `%
O1001
G81 X10. Y10. Z-5. R2 F100.
M30
%`;
      const r = ppDecimalPointValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "dimension_missing_decimal");
      expect(m.some((x) => x.details?.word === "R")).toBe(true);
    });
  });
});
