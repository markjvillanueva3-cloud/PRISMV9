/**
 * PPUnitsModeValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPUnitsModeValidatorEngine,
  ppUnitsModeValidatorEngine,
} from "../engines/PPUnitsModeValidatorEngine.js";

describe("PPUnitsModeValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppUnitsModeValidatorEngine).toBeInstanceOf(PPUnitsModeValidatorEngine);
  });

  describe("missing_initial_units", () => {
    it("flags program with motion but no G20/G21", () => {
      const code = `%
O1001
G90
G0 X10. Y10.
G1 Z-1. F100.
M30
%`;
      const r = ppUnitsModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_initial_units");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag when G21 set first", () => {
      const code = `%
O1001
G90 G21
G0 X10. Y10.
M30
%`;
      const r = ppUnitsModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_initial_units");
      expect(m.length).toBe(0);
    });

    it("does not flag when program has no motion", () => {
      const code = `%
O1001
G90
M30
%`;
      const r = ppUnitsModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_initial_units");
      expect(m.length).toBe(0);
    });
  });

  describe("mid_program_unit_switch", () => {
    it("flags G20 after motion started (was G21)", () => {
      const code = `%
O1001
G21
G0 X10. Y10.
G20
G1 X20. F50.
M30
%`;
      const r = ppUnitsModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "mid_program_unit_switch");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag repeated same-mode declaration", () => {
      const code = `%
O1001
G21
G0 X10. Y10.
G21
G1 X20. F100.
M30
%`;
      const r = ppUnitsModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "mid_program_unit_switch");
      expect(m.length).toBe(0);
    });
  });

  describe("implausible_inch_values", () => {
    it("flags G20 with coord > 25 inches", () => {
      const code = `%
O1001
G90 G20
G0 X100. Y100.
G1 Z-5. F50.
M30
%`;
      const r = ppUnitsModeValidatorEngine.validate(code);
      const i = r.issues.filter((x) => x.kind === "implausible_inch_values");
      expect(i.length).toBe(1);
      expect(i[0].severity).toBe("warning");
    });

    it("does not flag G20 with normal inch coords", () => {
      const code = `%
O1001
G90 G20
G0 X5. Y5.
G1 Z-0.1 F10.
M30
%`;
      const r = ppUnitsModeValidatorEngine.validate(code);
      const i = r.issues.filter((x) => x.kind === "implausible_inch_values");
      expect(i.length).toBe(0);
    });

    it("check_plausibility=false suppresses", () => {
      const code = `%
O1001
G90 G20
G0 X500. Y500.
G1 Z-1. F50.
M30
%`;
      const r = ppUnitsModeValidatorEngine.validate(code, {
        check_plausibility: false,
      });
      const i = r.issues.filter((x) => x.kind === "implausible_inch_values");
      expect(i.length).toBe(0);
    });
  });

  describe("implausible_mm_values", () => {
    it("flags G21 with max coord < 3 mm", () => {
      const code = `%
O1001
G90 G21
G0 X0.5 Y0.5
G1 Z-0.1 F50.
M30
%`;
      const r = ppUnitsModeValidatorEngine.validate(code);
      const i = r.issues.filter((x) => x.kind === "implausible_mm_values");
      expect(i.length).toBe(1);
    });

    it("does not flag normal mm coords", () => {
      const code = `%
O1001
G90 G21
G0 X50. Y50.
G1 Z-1. F100.
M30
%`;
      const r = ppUnitsModeValidatorEngine.validate(code);
      const i = r.issues.filter((x) => x.kind === "implausible_mm_values");
      expect(i.length).toBe(0);
    });
  });

  describe("feed_scale_suspicious", () => {
    it("flags G20 with F > 150 ipm", () => {
      const code = `%
O1001
G90 G20
G0 X5. Y5.
G1 Z-0.1 F500.
M30
%`;
      const r = ppUnitsModeValidatorEngine.validate(code);
      const i = r.issues.filter((x) => x.kind === "feed_scale_suspicious");
      expect(i.length).toBe(1);
      expect(i[0].severity).toBe("warning");
    });

    it("flags G21 with F < 5 mm/min", () => {
      const code = `%
O1001
G90 G21
G0 X50. Y50.
G1 Z-1. F2.
M30
%`;
      const r = ppUnitsModeValidatorEngine.validate(code);
      const i = r.issues.filter((x) => x.kind === "feed_scale_suspicious");
      expect(i.length).toBe(1);
    });

    it("does not flag normal feeds", () => {
      const code = `%
O1001
G90 G21
G0 X50. Y50.
G1 Z-1. F200.
M30
%`;
      const r = ppUnitsModeValidatorEngine.validate(code);
      const i = r.issues.filter((x) => x.kind === "feed_scale_suspicious");
      expect(i.length).toBe(0);
    });

    it("check_feed_scale=false suppresses", () => {
      const code = `%
O1001
G90 G20
G1 X5. F500. (high ipm)
M30
%`;
      const r = ppUnitsModeValidatorEngine.validate(code, {
        check_feed_scale: false,
      });
      const i = r.issues.filter((x) => x.kind === "feed_scale_suspicious");
      expect(i.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("captures initial_units and final_units", () => {
      const code = `%
O1001
G90 G21
G0 X10.
M30
%`;
      const r = ppUnitsModeValidatorEngine.validate(code);
      expect(r.summary.initial_units).toBe("G21");
      expect(r.summary.final_units).toBe("G21");
    });

    it("counts G20/G21 occurrences", () => {
      const code = `%
O1001
G21
G0 X10.
G21
M30
%`;
      const r = ppUnitsModeValidatorEngine.validate(code);
      expect(r.summary.g21_count).toBe(2);
      expect(r.summary.g20_count).toBe(0);
    });

    it("tracks max_coord_abs and peak_feed", () => {
      const code = `%
O1001
G90 G21
G0 X50. Y30.
G1 X100. F250.
M30
%`;
      const r = ppUnitsModeValidatorEngine.validate(code);
      expect(r.summary.max_coord_abs).toBeCloseTo(100);
      expect(r.summary.peak_feed).toBeCloseTo(250);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean program", () => {
      const code = `%
O1001
G90 G21
G0 X50.
G1 Z-1. F100.
M30
%`;
      const q = ppUnitsModeValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.units).toBe("G21");
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppUnitsModeValidatorEngine.defaultOptions();
      expect(o.check_plausibility).toBe(true);
      expect(o.inch_coord_max_plausible).toBeCloseTo(25);
      expect(o.mm_coord_min_plausible).toBeCloseTo(3);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppUnitsModeValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
      expect(r.summary.initial_units).toBeNull();
    });

    it("handles program without motion", () => {
      const code = `%
O1001
G21
M30
%`;
      const r = ppUnitsModeValidatorEngine.validate(code);
      expect(r.summary.initial_units).toBe("G21");
      expect(r.summary.max_coord_abs).toBe(0);
    });

    it("ignores G20/G21 inside comments", () => {
      const code = `%
O1001
(G20 mentioned in comment)
G21
G0 X10.
M30
%`;
      const r = ppUnitsModeValidatorEngine.validate(code);
      expect(r.summary.g20_count).toBe(0);
      expect(r.summary.g21_count).toBe(1);
    });
  });
});
