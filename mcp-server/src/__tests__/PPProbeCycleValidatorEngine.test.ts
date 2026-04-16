/**
 * PPProbeCycleValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPProbeCycleValidatorEngine,
  ppProbeCycleValidatorEngine,
} from "../engines/PPProbeCycleValidatorEngine.js";

describe("PPProbeCycleValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppProbeCycleValidatorEngine).toBeInstanceOf(PPProbeCycleValidatorEngine);
  });

  describe("probe_without_protected_move", () => {
    it("flags P9811 without preceding P9810", () => {
      const code = `%
O1001
T20 M6
G43 H20 Z10.
G65 P9811 X10. F200.
M30
%`;
      const r = ppProbeCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "probe_without_protected_move");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag P9811 with preceding P9810", () => {
      const code = `%
O1001
T20 M6
G43 H20 Z10.
G65 P9810 X0. Y0. Z5.
G65 P9811 X10. F200.
M30
%`;
      const r = ppProbeCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "probe_without_protected_move");
      expect(m.length).toBe(0);
    });

    it("require_protected_move=false suppresses", () => {
      const code = `%
O1001
T20 M6
G43 H20 Z10.
G65 P9811 X10. F200.
M30
%`;
      const r = ppProbeCycleValidatorEngine.validate(code, {
        require_protected_move: false,
      });
      const m = r.issues.filter((i) => i.kind === "probe_without_protected_move");
      expect(m.length).toBe(0);
    });
  });

  describe("probe_with_spindle_on", () => {
    it("flags P9811 with M3 active", () => {
      const code = `%
O1001
T20 M6
M3 S1000
G43 H20 Z10.
G65 P9810 X0. Y0.
G65 P9811 X10. F200.
M30
%`;
      const r = ppProbeCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "probe_with_spindle_on");
      expect(m.length).toBeGreaterThanOrEqual(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag when M5 was issued", () => {
      const code = `%
O1001
T20 M6
M3 S1000
M5
G43 H20 Z10.
G65 P9810 X0. Y0.
G65 P9811 X10. F200.
M30
%`;
      const r = ppProbeCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "probe_with_spindle_on");
      expect(m.length).toBe(0);
    });
  });

  describe("probe_with_tlc_off", () => {
    it("flags P9811 with no G43 ever", () => {
      const code = `%
O1001
T20 M6
G65 P9810 X0. Y0. Z5.
G65 P9811 X10. F200.
M30
%`;
      const r = ppProbeCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "probe_with_tlc_off");
      expect(m.length).toBeGreaterThanOrEqual(1);
    });

    it("does not flag when G43 is active", () => {
      const code = `%
O1001
T20 M6
G43 H20 Z10.
G65 P9810 X0. Y0. Z5.
G65 P9811 X10. F200.
M30
%`;
      const r = ppProbeCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "probe_with_tlc_off");
      expect(m.length).toBe(0);
    });

    it("flags P9811 after G49 cancel", () => {
      const code = `%
O1001
T20 M6
G43 H20 Z10.
G65 P9810 X0. Y0.
G49
G65 P9811 X10. F200.
M30
%`;
      const r = ppProbeCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "probe_with_tlc_off");
      expect(m.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("probe_feed_too_fast", () => {
    it("flags F600 with default max 500", () => {
      const code = `%
O1001
T20 M6
G43 H20 Z10.
G65 P9810 X0. Y0.
G65 P9811 X10. F600.
M30
%`;
      const r = ppProbeCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "probe_feed_too_fast");
      expect(m.length).toBe(1);
      expect(m[0].details?.feed).toBe(600);
    });

    it("does not flag F200", () => {
      const code = `%
O1001
T20 M6
G43 H20 Z10.
G65 P9810 X0. Y0.
G65 P9811 X10. F200.
M30
%`;
      const r = ppProbeCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "probe_feed_too_fast");
      expect(m.length).toBe(0);
    });

    it("respects custom max_probe_feed", () => {
      const code = `%
O1001
T20 M6
G43 H20 Z10.
G65 P9810 X0. Y0.
G65 P9811 X10. F150.
M30
%`;
      const r = ppProbeCycleValidatorEngine.validate(code, {
        max_probe_feed: 100,
      });
      const m = r.issues.filter((i) => i.kind === "probe_feed_too_fast");
      expect(m.length).toBe(1);
    });
  });

  describe("probe_missing_required_arg", () => {
    it("flags P9811 without X/Y/Z", () => {
      const code = `%
O1001
T20 M6
G43 H20 Z10.
G65 P9810 X0. Y0.
G65 P9811 F200.
M30
%`;
      const r = ppProbeCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "probe_missing_required_arg");
      expect(m.length).toBe(1);
    });

    it("flags P9814 without D", () => {
      const code = `%
O1001
T20 M6
G43 H20 Z10.
G65 P9810 X0. Y0.
G65 P9814 F200.
M30
%`;
      const r = ppProbeCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "probe_missing_required_arg");
      expect(m.length).toBe(1);
      expect(m[0].details?.missing_args).toContain("D");
    });

    it("does not flag complete P9814 D10.", () => {
      const code = `%
O1001
T20 M6
G43 H20 Z10.
G65 P9810 X0. Y0.
G65 P9814 D10. F200.
M30
%`;
      const r = ppProbeCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "probe_missing_required_arg");
      expect(m.length).toBe(0);
    });

    it("flags P9815 missing Y", () => {
      const code = `%
O1001
T20 M6
G43 H20 Z10.
G65 P9810 X0. Y0.
G65 P9815 X10. F200.
M30
%`;
      const r = ppProbeCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "probe_missing_required_arg");
      expect(m.length).toBe(1);
      expect(m[0].details?.missing_args).toContain("Y");
    });
  });

  describe("probe_with_cutter_comp", () => {
    it("flags P9811 while G41 active", () => {
      const code = `%
O1001
T20 M6
G43 H20 Z10.
G41 D1
G65 P9810 X0. Y0.
G65 P9811 X10. F200.
G40
M30
%`;
      const r = ppProbeCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "probe_with_cutter_comp");
      expect(m.length).toBeGreaterThanOrEqual(1);
      expect(m[0].details?.cutter_comp).toBe("G41");
    });

    it("does not flag with G40 active", () => {
      const code = `%
O1001
T20 M6
G43 H20 Z10.
G40
G65 P9810 X0. Y0.
G65 P9811 X10. F200.
M30
%`;
      const r = ppProbeCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "probe_with_cutter_comp");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("counts protected moves, measurements, tool-setter", () => {
      const code = `%
O1001
T20 M6
G43 H20 Z10.
G65 P9810 X0. Y0.
G65 P9811 X10. F200.
G65 P9814 D20. F200.
G65 P9832 F200.
M30
%`;
      const r = ppProbeCycleValidatorEngine.validate(code);
      expect(r.summary.protected_move_count).toBe(1);
      expect(r.summary.measurement_count).toBe(2);
      expect(r.summary.tool_setter_count).toBe(1);
    });

    it("tracks unique macros_seen", () => {
      const code = `%
O1001
T20 M6
G43 H20 Z10.
G65 P9810 X0. Y0.
G65 P9811 X10. F200.
G65 P9814 D20. F200.
G65 P9811 Y10. F200.
M30
%`;
      const r = ppProbeCycleValidatorEngine.validate(code);
      expect(r.summary.macros_seen).toEqual(["P9810", "P9811", "P9814"]);
    });

    it("counts G31 raw skip", () => {
      const code = `%
O1001
T20 M6
G43 H20 Z10.
G31 Z-50. F100.
M30
%`;
      const r = ppProbeCycleValidatorEngine.validate(code);
      expect(r.summary.g31_count).toBe(1);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for a clean probe sequence", () => {
      const code = `%
O1001
T20 M6
G43 H20 Z10.
G40
G65 P9810 X0. Y0. Z5.
G65 P9811 X10. F200.
M30
%`;
      const q = ppProbeCycleValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.measurement_count).toBe(1);
    });

    it("returns valid=false for probe with spindle on", () => {
      const code = `%
O1001
T20 M6
M3 S1000
G43 H20 Z10.
G65 P9810 X0. Y0.
G65 P9811 X10. F200.
M30
%`;
      const q = ppProbeCycleValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppProbeCycleValidatorEngine.defaultOptions();
      expect(o.max_probe_feed).toBe(500);
      expect(o.require_protected_move).toBe(true);
      expect(o.check_spindle_off).toBe(true);
      expect(o.check_tlc_active).toBe(true);
      expect(o.check_feed_limit).toBe(true);
      expect(o.check_required_args).toBe(true);
      expect(o.check_cutter_comp_off).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppProbeCycleValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
      expect(r.summary.measurement_count).toBe(0);
    });

    it("handles program with no probing", () => {
      const code = `%
O1001
T1 M6
G43 H1 Z10.
M3 S1000
G1 X10. F100.
M30
%`;
      const r = ppProbeCycleValidatorEngine.validate(code);
      expect(r.total_issues).toBe(0);
      expect(r.summary.measurement_count).toBe(0);
    });

    it("ignores probe macros inside comments", () => {
      const code = `%
O1001
(G65 P9811 X10. F200. — example in comment)
M30
%`;
      const r = ppProbeCycleValidatorEngine.validate(code);
      expect(r.summary.measurement_count).toBe(0);
    });

    it("handles tool-setter P9832 without protected-move requirement", () => {
      const code = `%
O1001
T99 M6
G43 H99 Z10.
G65 P9832 F200.
M30
%`;
      const r = ppProbeCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "probe_without_protected_move");
      expect(m.length).toBe(0);
      expect(r.summary.tool_setter_count).toBe(1);
    });
  });
});
