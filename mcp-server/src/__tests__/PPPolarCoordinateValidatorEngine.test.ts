/**
 * PPPolarCoordinateValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPPolarCoordinateValidatorEngine,
  ppPolarCoordinateValidatorEngine,
} from "../engines/PPPolarCoordinateValidatorEngine.js";

describe("PPPolarCoordinateValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppPolarCoordinateValidatorEngine).toBeInstanceOf(
      PPPolarCoordinateValidatorEngine,
    );
  });

  describe("g16_without_g15", () => {
    it("flags program ending in polar mode", () => {
      const code = `%
O1001
G17
G16
G1 X50. Y30. F100.
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g16_without_g15");
      expect(m.length).toBe(1);
    });

    it("does not flag balanced G16/G15", () => {
      const code = `%
O1001
G17
G16
G1 X50. Y30. F100.
G15
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g16_without_g15");
      expect(m.length).toBe(0);
    });
  });

  describe("nested_g16", () => {
    it("flags G16 within G16 without G15", () => {
      const code = `%
O1001
G17
G16
G1 X50. Y30. F100.
G16
G1 X60. Y45.
G15
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "nested_g16");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag G16/G15/G16", () => {
      const code = `%
O1001
G17
G16
G1 X50. Y30. F100.
G15
G16
G1 X70. Y60.
G15
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "nested_g16");
      expect(m.length).toBe(0);
    });
  });

  describe("g16_without_plane_select", () => {
    it("flags G16 without prior G17/G18/G19", () => {
      const code = `%
O1001
G16
G1 X50. Y30. F100.
G15
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g16_without_plane_select");
      expect(m.length).toBe(1);
    });

    it("does not flag when G17 precedes G16", () => {
      const code = `%
O1001
G17
G16
G1 X50. Y30. F100.
G15
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g16_without_plane_select");
      expect(m.length).toBe(0);
    });

    it("does not flag when G18 precedes G16", () => {
      const code = `%
O1001
G18
G16
G1 X50. Z-20. F100.
G15
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g16_without_plane_select");
      expect(m.length).toBe(0);
    });
  });

  describe("cutter_comp_in_polar", () => {
    it("flags G41 active when G16 activates", () => {
      const code = `%
O1001
G17
G41 D1
G16
G1 X50. Y30. F100.
G15
G40
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "cutter_comp_in_polar");
      expect(m.length).toBe(1);
    });

    it("flags G42 active when G16 activates", () => {
      const code = `%
O1001
G17
G42 D1
G16
G1 X50. Y30. F100.
G15
G40
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "cutter_comp_in_polar");
      expect(m.length).toBe(1);
    });

    it("does not flag G40 before G16", () => {
      const code = `%
O1001
G17
G40
G16
G1 X50. Y30. F100.
G15
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "cutter_comp_in_polar");
      expect(m.length).toBe(0);
    });
  });

  describe("motion_in_polar_missing_axis", () => {
    it("flags G1 X50. (radius only) with G17 polar", () => {
      const code = `%
O1001
G17
G16
G1 X50. F100.
G15
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "motion_in_polar_missing_axis",
      );
      expect(m.length).toBe(1);
    });

    it("does not flag G1 X50. Y30. (both present)", () => {
      const code = `%
O1001
G17
G16
G1 X50. Y30. F100.
G15
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "motion_in_polar_missing_axis",
      );
      expect(m.length).toBe(0);
    });

    it("does not flag motion outside polar mode", () => {
      const code = `%
O1001
G17
G1 X50. F100.
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "motion_in_polar_missing_axis",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("distance_mode_change_in_polar", () => {
    it("flags G91 switched while in G16", () => {
      const code = `%
O1001
G17
G90
G16
G1 X50. Y30. F100.
G91
G1 X5. Y10.
G15
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "distance_mode_change_in_polar",
      );
      expect(m.length).toBe(1);
    });

    it("does not flag G90 set before G16", () => {
      const code = `%
O1001
G17
G90
G16
G1 X50. Y30. F100.
G15
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "distance_mode_change_in_polar",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("negative_polar_radius", () => {
    it("opt-in flags negative X radius (G17 polar)", () => {
      const code = `%
O1001
G17
G16
G1 X-25. Y45. F100.
G15
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code, {
        check_negative_radius: true,
      });
      const m = r.issues.filter((i) => i.kind === "negative_polar_radius");
      expect(m.length).toBe(1);
    });

    it("off by default", () => {
      const code = `%
O1001
G17
G16
G1 X-25. Y45. F100.
G15
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "negative_polar_radius");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("reports g16_activations count", () => {
      const code = `%
O1001
G17
G16
G1 X50. Y30. F100.
G15
G16
G1 X40. Y20.
G15
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code);
      expect(r.summary.g16_activations).toBe(2);
    });

    it("reports g15_cancels count", () => {
      const code = `%
O1001
G17
G16
G1 X50. Y30. F100.
G15
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code);
      expect(r.summary.g15_cancels).toBe(1);
    });

    it("reports ends_in_polar_mode true", () => {
      const code = `%
O1001
G17
G16
G1 X50. Y30. F100.
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code);
      expect(r.summary.ends_in_polar_mode).toBe(true);
    });

    it("reports ends_in_polar_mode false", () => {
      const code = `%
O1001
G17
G16
G1 X50. Y30. F100.
G15
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code);
      expect(r.summary.ends_in_polar_mode).toBe(false);
    });

    it("reports polar_motion_blocks", () => {
      const code = `%
O1001
G17
G16
G1 X50. Y30. F100.
G1 X40. Y20.
G15
G1 X0. Y0.
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code);
      expect(r.summary.polar_motion_blocks).toBe(2);
    });
  });

  describe("quickCheck", () => {
    it("returns summary", () => {
      const code = `%
O1001
G17
G16
G1 X50. Y30. F100.
G15
M30
%`;
      const q = ppPolarCoordinateValidatorEngine.quickCheck(code);
      expect(q.g16_activations).toBe(1);
      expect(q.ends_in_polar_mode).toBe(false);
    });

    it("handles empty code", () => {
      const q = ppPolarCoordinateValidatorEngine.quickCheck("");
      expect(q.valid).toBe(true);
      expect(q.g16_activations).toBe(0);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppPolarCoordinateValidatorEngine.defaultOptions();
      expect(o.check_g16_balance).toBe(true);
      expect(o.check_nested_g16).toBe(true);
      expect(o.check_plane_select).toBe(true);
      expect(o.check_cutter_comp).toBe(true);
      expect(o.check_negative_radius).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppPolarCoordinateValidatorEngine.validate("");
      expect(r.summary.g16_activations).toBe(0);
    });

    it("ignores G16 in comments", () => {
      const code = `%
O1001
G17
(G16 WAS HERE)
G1 X5. F100.
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code);
      expect(r.summary.g16_activations).toBe(0);
    });

    it("handles program with no polar usage", () => {
      const code = `%
O1001
G17
G1 X5. Y5. F100.
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code);
      expect(r.summary.g16_activations).toBe(0);
      expect(r.summary.total_issues).toBe(0);
    });

    it("can disable individual checks", () => {
      const code = `%
O1001
G17
G16
G1 X50. F100.
G15
M30
%`;
      const r = ppPolarCoordinateValidatorEngine.validate(code, {
        check_motion_missing_axis: false,
      });
      const m = r.issues.filter(
        (i) => i.kind === "motion_in_polar_missing_axis",
      );
      expect(m.length).toBe(0);
    });
  });
});
