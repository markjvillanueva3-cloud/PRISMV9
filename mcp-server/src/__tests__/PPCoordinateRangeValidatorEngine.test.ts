/**
 * PPCoordinateRangeValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPCoordinateRangeValidatorEngine,
  ppCoordinateRangeValidatorEngine,
} from "../engines/PPCoordinateRangeValidatorEngine.js";

describe("PPCoordinateRangeValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppCoordinateRangeValidatorEngine).toBeInstanceOf(
      PPCoordinateRangeValidatorEngine,
    );
  });

  describe("coord_absurdly_large", () => {
    it("flags X100000 as absurd", () => {
      const code = `%
O1001
G0 X100000. Y10.
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "coord_absurdly_large");
      expect(m.length).toBe(1);
      expect(m[0].axis).toBe("X");
    });

    it("flags Y-50000", () => {
      const code = `%
O1001
G0 Y-50000.
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "coord_absurdly_large");
      expect(m.length).toBe(1);
    });

    it("does not flag X100", () => {
      const code = `%
O1001
G0 X100. Y50. Z20.
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "coord_absurdly_large");
      expect(m.length).toBe(0);
    });

    it("respects custom max_linear_range", () => {
      const code = `%
O1001
G0 X500.
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code, {
        max_linear_range: 300,
      });
      const m = r.issues.filter((i) => i.kind === "coord_absurdly_large");
      expect(m.length).toBe(1);
    });
  });

  describe("coord_absurdly_small", () => {
    it("flags X0.000001", () => {
      const code = `%
O1001
G1 X0.000001 F100.
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "coord_absurdly_small");
      expect(m.length).toBe(1);
    });

    it("does not flag X0", () => {
      const code = `%
O1001
G0 X0.
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "coord_absurdly_small");
      expect(m.length).toBe(0);
    });

    it("does not flag X0.5", () => {
      const code = `%
O1001
G1 X0.5 F100.
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "coord_absurdly_small");
      expect(m.length).toBe(0);
    });
  });

  describe("angular_unwrapped", () => {
    it("flags A8000.", () => {
      const code = `%
O1001
G0 A8000.
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "angular_unwrapped");
      expect(m.length).toBe(1);
      expect(m[0].axis).toBe("A");
    });

    it("flags C-9000.", () => {
      const code = `%
O1001
G0 C-9000.
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "angular_unwrapped");
      expect(m.length).toBe(1);
    });

    it("does not flag A360.", () => {
      const code = `%
O1001
G0 A360. B90.
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "angular_unwrapped");
      expect(m.length).toBe(0);
    });

    it("respects custom max_rotary_deg", () => {
      const code = `%
O1001
G0 A1000.
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code, {
        max_rotary_deg: 720,
      });
      const m = r.issues.filter((i) => i.kind === "angular_unwrapped");
      expect(m.length).toBe(1);
    });
  });

  describe("coord_nan_literal", () => {
    it("flags XNaN", () => {
      const code = `%
O1001
G0 XNaN Y10.
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "coord_nan_literal");
      expect(m.length).toBe(1);
    });

    it("flags Yinf", () => {
      const code = `%
O1001
G0 Yinf
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "coord_nan_literal");
      expect(m.length).toBe(1);
    });

    it("does not flag normal values", () => {
      const code = `%
O1001
G0 X10. Y20.
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "coord_nan_literal");
      expect(m.length).toBe(0);
    });
  });

  describe("coord_extra_decimals", () => {
    it("opt-in flags X10.1234567", () => {
      const code = `%
O1001
G1 X10.1234567 F100.
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code, {
        check_extra_decimals: true,
        max_decimals: 4,
      });
      const m = r.issues.filter((i) => i.kind === "coord_extra_decimals");
      expect(m.length).toBe(1);
    });

    it("does not flag X10.1234", () => {
      const code = `%
O1001
G1 X10.1234 F100.
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code, {
        check_extra_decimals: true,
        max_decimals: 4,
      });
      const m = r.issues.filter((i) => i.kind === "coord_extra_decimals");
      expect(m.length).toBe(0);
    });

    it("off by default", () => {
      const code = `%
O1001
G1 X10.1234567 F100.
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "coord_extra_decimals");
      expect(m.length).toBe(0);
    });
  });

  describe("coord_leading_zero_only", () => {
    it("opt-in flags X0 without decimal", () => {
      const code = `%
O1001
G0 X0 Y0
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code, {
        check_leading_zero_only: true,
      });
      const m = r.issues.filter(
        (i) => i.kind === "coord_leading_zero_only",
      );
      expect(m.length).toBe(2);
    });

    it("does not flag X0.", () => {
      const code = `%
O1001
G0 X0. Y0.
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code, {
        check_leading_zero_only: true,
      });
      const m = r.issues.filter(
        (i) => i.kind === "coord_leading_zero_only",
      );
      expect(m.length).toBe(0);
    });

    it("off by default", () => {
      const code = `%
O1001
G0 X0 Y0
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "coord_leading_zero_only",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("reports coord_count", () => {
      const code = `%
O1001
G0 X10. Y20. Z30.
G1 X40. Y50. F100.
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code);
      expect(r.summary.coord_count).toBe(5);
    });

    it("reports axes_seen sorted", () => {
      const code = `%
O1001
G0 Z10. X20. Y30. B45.
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code);
      expect(r.summary.axes_seen).toEqual(["B", "X", "Y", "Z"]);
    });

    it("reports linear_extrema per axis", () => {
      const code = `%
O1001
G0 X10. Y20.
G1 X50. Y5. F100.
G1 X-10. Y30. F100.
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code);
      expect(r.summary.linear_extrema.X).toEqual({ min: -10, max: 50 });
      expect(r.summary.linear_extrema.Y).toEqual({ min: 5, max: 30 });
    });
  });

  describe("quickCheck", () => {
    it("returns summary", () => {
      const code = `%
O1001
G0 X10. Y20.
M30
%`;
      const q = ppCoordinateRangeValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.coord_count).toBe(2);
      expect(q.axes).toEqual(["X", "Y"]);
    });

    it("returns valid=false for NaN literal", () => {
      const code = `%
O1001
G0 XNaN
M30
%`;
      const q = ppCoordinateRangeValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppCoordinateRangeValidatorEngine.defaultOptions();
      expect(o.check_absurd_large).toBe(true);
      expect(o.check_absurd_small).toBe(true);
      expect(o.check_angular_unwrap).toBe(true);
      expect(o.check_nan_literal).toBe(true);
      expect(o.check_extra_decimals).toBe(false);
      expect(o.check_leading_zero_only).toBe(false);
      expect(o.max_linear_range).toBe(10000);
      expect(o.max_rotary_deg).toBe(7200);
      expect(o.linear_axes).toContain("X");
      expect(o.rotary_axes).toContain("A");
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppCoordinateRangeValidatorEngine.validate("");
      expect(r.summary.coord_count).toBe(0);
      expect(r.summary.axes_seen).toEqual([]);
    });

    it("handles program with no coordinates", () => {
      const code = `%
O1001
M3 S1000
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code);
      expect(r.summary.coord_count).toBe(0);
    });

    it("ignores non-axis letters (F, S, T)", () => {
      const code = `%
O1001
G1 X10. F100. S500 T1
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code);
      expect(r.summary.coord_count).toBe(1);
      expect(r.summary.axes_seen).toEqual(["X"]);
    });

    it("strips comments before tokenizing", () => {
      const code = `%
O1001
(X99999 is a stale comment)
G0 X10.
M30
%`;
      const r = ppCoordinateRangeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "coord_absurdly_large");
      expect(m.length).toBe(0);
    });
  });
});
