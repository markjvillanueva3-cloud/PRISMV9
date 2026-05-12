/**
 * PPAxisTravelValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPAxisTravelValidatorEngine,
  ppAxisTravelValidatorEngine,
  type AxisEnvelope,
} from "../engines/PPAxisTravelValidatorEngine.js";

const ENV: AxisEnvelope = {
  x_min: -500,
  x_max: 500,
  y_min: -300,
  y_max: 300,
  z_min: -400,
  z_max: 0,
};

describe("PPAxisTravelValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppAxisTravelValidatorEngine).toBeInstanceOf(PPAxisTravelValidatorEngine);
  });

  describe("missing_envelope", () => {
    it("emits info when no envelope given", () => {
      const r = ppAxisTravelValidatorEngine.validate(`%
O1001
G0 X10. Y10. Z10.
M30
%`);
      const m = r.issues.filter((i) => i.kind === "missing_envelope");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("info");
    });
  });

  describe("x_travel_exceeded", () => {
    it("flags X beyond x_max", () => {
      const code = `%
O1001
G90 G54
G0 X600. Y10. Z0.
M30
%`;
      const r = ppAxisTravelValidatorEngine.validate(code, { envelope: ENV });
      const m = r.issues.filter((i) => i.kind === "x_travel_exceeded");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("flags X beyond x_min (negative)", () => {
      const code = `%
O1001
G90
G0 X-600. Y0. Z0.
M30
%`;
      const r = ppAxisTravelValidatorEngine.validate(code, { envelope: ENV });
      const m = r.issues.filter((i) => i.kind === "x_travel_exceeded");
      expect(m.length).toBe(1);
    });

    it("does not flag X within envelope", () => {
      const code = `%
O1001
G90
G0 X100. Y100. Z-10.
M30
%`;
      const r = ppAxisTravelValidatorEngine.validate(code, { envelope: ENV });
      const m = r.issues.filter((i) => i.kind === "x_travel_exceeded");
      expect(m.length).toBe(0);
    });
  });

  describe("y_travel_exceeded", () => {
    it("flags Y beyond y_max", () => {
      const code = `%
O1001
G90
G0 X0. Y400. Z0.
M30
%`;
      const r = ppAxisTravelValidatorEngine.validate(code, { envelope: ENV });
      const m = r.issues.filter((i) => i.kind === "y_travel_exceeded");
      expect(m.length).toBe(1);
    });
  });

  describe("z_travel_exceeded", () => {
    it("flags Z below z_min", () => {
      const code = `%
O1001
G90
G0 X0. Y0. Z-500.
M30
%`;
      const r = ppAxisTravelValidatorEngine.validate(code, { envelope: ENV });
      const m = r.issues.filter((i) => i.kind === "z_travel_exceeded");
      expect(m.length).toBe(1);
    });

    it("does not flag Z at upper boundary", () => {
      const code = `%
O1001
G90
G0 X0. Y0. Z-10.
M30
%`;
      const r = ppAxisTravelValidatorEngine.validate(code, { envelope: ENV, check_margin: false });
      const m = r.issues.filter((i) => i.kind === "z_travel_exceeded");
      expect(m.length).toBe(0);
    });
  });

  describe("travel_margin_warning", () => {
    it("flags value within margin of envelope edge", () => {
      const code = `%
O1001
G90
G0 X498. Y0. Z-10.
M30
%`;
      const r = ppAxisTravelValidatorEngine.validate(code, { envelope: ENV, margin: 5 });
      const m = r.issues.filter((i) => i.kind === "travel_margin_warning");
      expect(m.length).toBeGreaterThanOrEqual(1);
      expect(m[0].severity).toBe("warning");
    });

    it("check_margin=false suppresses", () => {
      const code = `%
O1001
G90
G0 X499. Y0. Z-10.
M30
%`;
      const r = ppAxisTravelValidatorEngine.validate(code, {
        envelope: ENV,
        margin: 5,
        check_margin: false,
      });
      const m = r.issues.filter((i) => i.kind === "travel_margin_warning");
      expect(m.length).toBe(0);
    });
  });

  describe("work offsets", () => {
    it("applies G55 offset to absolute coords", () => {
      const code = `%
O1001
G90 G55
G0 X400. Y0. Z-10.
M30
%`;
      const r = ppAxisTravelValidatorEngine.validate(code, {
        envelope: ENV,
        offsets: { G55: { x: 200, y: 0, z: 0 } },
        check_margin: false,
      });
      // 400 + 200 = 600 > 500 (x_max)
      const m = r.issues.filter((i) => i.kind === "x_travel_exceeded");
      expect(m.length).toBe(1);
    });

    it("G54 is default and applies zero offset if unspecified", () => {
      const code = `%
O1001
G90
G0 X100. Y0. Z-10.
M30
%`;
      const r = ppAxisTravelValidatorEngine.validate(code, {
        envelope: ENV,
        check_margin: false,
      });
      expect(r.summary.active_offset_code).toBe("G54");
      expect(r.errors).toBe(0);
    });
  });

  describe("incremental mode (G91)", () => {
    it("accumulates incremental moves", () => {
      const code = `%
O1001
G90
G0 X100.
G91
X100.
X100.
X100.
X100.
M30
%`;
      const r = ppAxisTravelValidatorEngine.validate(code, {
        envelope: ENV,
        check_margin: false,
      });
      // 100 + 100*4 = 500, at envelope edge, exactly — no error
      const m = r.issues.filter((i) => i.kind === "x_travel_exceeded");
      expect(m.length).toBe(0);
    });

    it("flags incremental overshoot", () => {
      const code = `%
O1001
G90
G0 X100.
G91
X200.
X200.
X200.
M30
%`;
      const r = ppAxisTravelValidatorEngine.validate(code, {
        envelope: ENV,
        check_margin: false,
      });
      // 100 + 200 + 200 + 200 = 700 > 500
      const m = r.issues.filter((i) => i.kind === "x_travel_exceeded");
      expect(m.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("summary metrics", () => {
    it("counts motion lines", () => {
      const code = `%
O1001
G90
G0 X10. Y10. Z0.
G1 X20. F100.
G1 Y20.
M30
%`;
      const r = ppAxisTravelValidatorEngine.validate(code, {
        envelope: ENV,
        check_margin: false,
      });
      expect(r.summary.motion_lines).toBe(3);
    });

    it("tracks x/y/z ranges", () => {
      const code = `%
O1001
G90
G0 X-100. Y-50. Z-10.
G0 X200. Y100. Z-50.
M30
%`;
      const r = ppAxisTravelValidatorEngine.validate(code, {
        envelope: ENV,
        check_margin: false,
      });
      expect(r.summary.x_range).toEqual({ min: -100, max: 200 });
      expect(r.summary.y_range).toEqual({ min: -50, max: 100 });
      expect(r.summary.z_range).toEqual({ min: -50, max: -10 });
    });

    it("tracks active_offset_code", () => {
      const code = `%
O1001
G90 G56
G0 X0. Y0. Z-10.
M30
%`;
      const r = ppAxisTravelValidatorEngine.validate(code, {
        envelope: ENV,
        check_margin: false,
      });
      expect(r.summary.active_offset_code).toBe("G56");
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean program", () => {
      const code = `%
O1001
G90
G0 X100. Y100. Z-10.
M30
%`;
      const q = ppAxisTravelValidatorEngine.quickCheck(code, { envelope: ENV, check_margin: false });
      expect(q.valid).toBe(true);
      expect(q.motion_lines).toBe(1);
    });

    it("returns valid=false for out-of-envelope", () => {
      const code = `%
O1001
G90
G0 X600.
M30
%`;
      const q = ppAxisTravelValidatorEngine.quickCheck(code, { envelope: ENV });
      expect(q.valid).toBe(false);
      expect(q.errors).toBeGreaterThan(0);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppAxisTravelValidatorEngine.defaultOptions();
      expect(o.envelope).toBeUndefined();
      expect(o.default_offset).toBe("G54");
      expect(o.margin).toBe(5);
      expect(o.check_margin).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppAxisTravelValidatorEngine.validate("", { envelope: ENV });
      expect(r.summary.motion_lines).toBe(0);
    });

    it("handles program without motion", () => {
      const code = `%
O1001
M3 S1000
M5
M30
%`;
      const r = ppAxisTravelValidatorEngine.validate(code, { envelope: ENV });
      expect(r.summary.motion_lines).toBe(0);
    });

    it("ignores coords inside comments", () => {
      const code = `%
O1001
G90
(X999. Y999. inside comment — should not be parsed)
G0 X10. Y10. Z-10.
M30
%`;
      const r = ppAxisTravelValidatorEngine.validate(code, {
        envelope: ENV,
        check_margin: false,
      });
      expect(r.errors).toBe(0);
    });

    it("modal coords: axis unspecified carries previous value", () => {
      const code = `%
O1001
G90
G0 X100. Y100. Z-10.
G1 Y200. F100.
M30
%`;
      const r = ppAxisTravelValidatorEngine.validate(code, {
        envelope: ENV,
        check_margin: false,
      });
      // Second move should still have X=100 from before
      expect(r.summary.x_range).toEqual({ min: 100, max: 100 });
    });
  });
});
