/**
 * PPSafeStartBlockValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPSafeStartBlockValidatorEngine,
  ppSafeStartBlockValidatorEngine,
} from "../engines/PPSafeStartBlockValidatorEngine.js";

describe("PPSafeStartBlockValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppSafeStartBlockValidatorEngine).toBeInstanceOf(
      PPSafeStartBlockValidatorEngine,
    );
  });

  describe("canonical safe-start block", () => {
    it("passes G17 G90 G94 G40 G49 G80 G54 G21 header", () => {
      const code = `%
O1001
G17 G90 G94 G40 G49 G80 G54 G21
G0 X0. Y0. Z50.
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code);
      expect(r.errors).toBe(0);
      expect(r.summary.valid).toBe(true);
      expect(r.summary.has_plane_select).toBe(true);
      expect(r.summary.has_distance_mode).toBe(true);
      expect(r.summary.has_feed_mode).toBe(true);
      expect(r.summary.has_cutter_comp_cancel).toBe(true);
      expect(r.summary.has_tool_length_cancel).toBe(true);
      expect(r.summary.has_canned_cycle_cancel).toBe(true);
      expect(r.summary.has_work_offset).toBe(true);
      expect(r.summary.has_units_mode).toBe(true);
    });
  });

  describe("missing_plane_select", () => {
    it("flags header without G17/G18/G19", () => {
      const code = `%
O1001
G90 G94 G40 G49 G80 G54 G21
G0 X0. Y0.
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_plane_select");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("accepts G18 (XZ plane)", () => {
      const code = `%
O1001
G18 G90 G94 G40 G49 G80 G54 G21
G0 X0. Z0.
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_plane_select");
      expect(m.length).toBe(0);
    });
  });

  describe("missing_distance_mode", () => {
    it("flags header without G90/G91", () => {
      const code = `%
O1001
G17 G94 G40 G49 G80 G54 G21
G0 X0. Y0.
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_distance_mode");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });
  });

  describe("missing_feed_mode", () => {
    it("flags header without G93/G94/G95", () => {
      const code = `%
O1001
G17 G90 G40 G49 G80 G54 G21
G0 X0. Y0.
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_feed_mode");
      expect(m.length).toBe(1);
    });

    it("accepts G95 (feed per rev)", () => {
      const code = `%
O1001
G17 G90 G95 G40 G49 G80 G54 G21
G0 X0.
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_feed_mode");
      expect(m.length).toBe(0);
    });
  });

  describe("cutter_comp_not_cancelled", () => {
    it("flags header without G40 as error", () => {
      const code = `%
O1001
G17 G90 G94 G49 G80 G54 G21
G0 X0.
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "cutter_comp_not_cancelled");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
      expect(r.errors).toBeGreaterThan(0);
    });
  });

  describe("tool_length_not_cancelled", () => {
    it("flags header without G49", () => {
      const code = `%
O1001
G17 G90 G94 G40 G80 G54 G21
G0 X0.
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "tool_length_not_cancelled");
      expect(m.length).toBe(1);
    });
  });

  describe("canned_cycle_not_cancelled", () => {
    it("flags header without G80", () => {
      const code = `%
O1001
G17 G90 G94 G40 G49 G54 G21
G0 X0.
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "canned_cycle_not_cancelled");
      expect(m.length).toBe(1);
    });
  });

  describe("missing_work_offset", () => {
    it("flags header without G54-G59", () => {
      const code = `%
O1001
G17 G90 G94 G40 G49 G80 G21
G0 X0.
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_work_offset");
      expect(m.length).toBe(1);
    });

    it("accepts G59", () => {
      const code = `%
O1001
G17 G90 G94 G40 G49 G80 G59 G21
G0 X0.
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_work_offset");
      expect(m.length).toBe(0);
    });

    it("accepts extended G54.1 P5", () => {
      const code = `%
O1001
G17 G90 G94 G40 G49 G80 G54.1 P5 G21
G0 X0.
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_work_offset");
      expect(m.length).toBe(0);
    });
  });

  describe("missing_units_mode", () => {
    it("flags header without G20/G21", () => {
      const code = `%
O1001
G17 G90 G94 G40 G49 G80 G54
G0 X0.
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_units_mode");
      expect(m.length).toBe(1);
    });

    it("accepts G20 (imperial)", () => {
      const code = `%
O1001
G17 G90 G94 G40 G49 G80 G54 G20
G0 X0.
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_units_mode");
      expect(m.length).toBe(0);
    });
  });

  describe("motion_before_safe_start", () => {
    it("flags G0 before any modal reset block", () => {
      const code = `%
O1001
G0 X10. Y10.
G17 G90 G94 G40 G49 G80 G54 G21
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "motion_before_safe_start");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag motion after safe-start block", () => {
      const code = `%
O1001
G17 G90 G94 G40 G49 G80 G54 G21
G0 X10. Y10.
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "motion_before_safe_start");
      expect(m.length).toBe(0);
    });
  });

  describe("safe_start_spread_too_wide (opt-in)", () => {
    it("flags when resets spread > max_spread_blocks", () => {
      const code = `%
O1001
G17
(separator)
G90
G94
G40
G49
G80
G54
G21
G0 X0.
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code, {
        check_spread: true,
        max_spread_blocks: 3,
      });
      const m = r.issues.filter(
        (i) => i.kind === "safe_start_spread_too_wide",
      );
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("info");
    });

    it("off by default", () => {
      const code = `%
O1001
G17
G90
G94
G40
G49
G80
G54
G21
G0 X0.
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "safe_start_spread_too_wide",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("reports first_motion_line when motion present", () => {
      const code = `%
O1001
G17 G90 G94 G40 G49 G80 G54 G21
G0 X0.
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code);
      expect(r.summary.first_motion_line).toBe(4);
    });

    it("reports safe_start_spread", () => {
      const code = `%
O1001
G17 G90 G94 G40 G49 G80 G54 G21
G0 X0.
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code);
      expect(r.summary.safe_start_spread).toBe(1);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for complete safe-start", () => {
      const code = `%
O1001
G17 G90 G94 G40 G49 G80 G54 G21
G0 X0.
M30
%`;
      const q = ppSafeStartBlockValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.missing_count).toBe(0);
    });

    it("returns valid=false when G40 missing", () => {
      const code = `%
O1001
G17 G90 G94 G49 G80 G54 G21
G0 X0.
M30
%`;
      const q = ppSafeStartBlockValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
      expect(q.missing_count).toBeGreaterThanOrEqual(1);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppSafeStartBlockValidatorEngine.defaultOptions();
      expect(o.window_blocks).toBe(10);
      expect(o.check_plane_select).toBe(true);
      expect(o.check_cutter_comp_cancel).toBe(true);
      expect(o.check_spread).toBe(false);
      expect(o.max_spread_blocks).toBe(5);
      expect(o.enabled).toBe(true);
    });
  });

  describe("enabled: false bypass", () => {
    it("returns clean result when disabled", () => {
      const code = `%
O1001
G0 X10.
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code, {
        enabled: false,
      });
      expect(r.total_issues).toBe(0);
      expect(r.summary.valid).toBe(true);
    });
  });

  describe("custom window_blocks", () => {
    it("respects window_blocks=2 to miss later G40", () => {
      const code = `%
O1001
G17 G90
G94 G54 G21
G40 G49 G80
G0 X0.
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code, {
        window_blocks: 2,
      });
      const m = r.issues.filter((i) => i.kind === "cutter_comp_not_cancelled");
      expect(m.length).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppSafeStartBlockValidatorEngine.validate("");
      expect(r.summary.first_motion_line).toBeNull();
    });

    it("skips O-number-only header", () => {
      const code = `%
O1001
G17 G90 G94 G40 G49 G80 G54 G21
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code);
      expect(r.summary.has_plane_select).toBe(true);
    });

    it("skips % percent markers", () => {
      const code = `%
O1001
G17 G90 G94 G40 G49 G80 G54 G21
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code);
      expect(r.summary.valid).toBe(true);
    });

    it("ignores G17 inside comments", () => {
      const code = `%
O1001
(G17 in comment should not count)
G18 G90 G94 G40 G49 G80 G54 G21
G0 X0.
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code);
      expect(r.summary.has_plane_select).toBe(true);
    });

    it("can individually disable checks", () => {
      const code = `%
O1001
G0 X10.
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code, {
        check_plane_select: false,
        check_distance_mode: false,
        check_feed_mode: false,
        check_cutter_comp_cancel: false,
        check_tool_length_cancel: false,
        check_canned_cycle_cancel: false,
        check_work_offset: false,
        check_units_mode: false,
        check_motion_before_start: false,
      });
      expect(r.total_issues).toBe(0);
    });

    it("handles leading-zero G-codes (G017, G040)", () => {
      const code = `%
O1001
G017 G090 G094 G040 G049 G080 G054 G021
G0 X0.
M30
%`;
      const r = ppSafeStartBlockValidatorEngine.validate(code);
      expect(r.summary.has_plane_select).toBe(true);
      expect(r.summary.has_distance_mode).toBe(true);
      expect(r.summary.has_cutter_comp_cancel).toBe(true);
    });
  });
});
