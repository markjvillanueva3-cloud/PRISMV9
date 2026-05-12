/**
 * PPFeedModeValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPFeedModeValidatorEngine,
  ppFeedModeValidatorEngine,
} from "../engines/PPFeedModeValidatorEngine.js";

describe("PPFeedModeValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppFeedModeValidatorEngine).toBeInstanceOf(
      PPFeedModeValidatorEngine,
    );
  });

  describe("feed_mode_mixed_in_block", () => {
    it("flags G94 G95 in same block", () => {
      const code = `%
O1001
G94 G95 F100.
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "feed_mode_mixed_in_block");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("flags G93 G94 in same block", () => {
      const code = `%
O1001
G93 G94 F100.
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "feed_mode_mixed_in_block");
      expect(m.length).toBe(1);
    });

    it("does not flag single G94", () => {
      const code = `%
O1001
G94 F100.
G1 X10.
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "feed_mode_mixed_in_block");
      expect(m.length).toBe(0);
    });
  });

  describe("g95_with_spindle_off", () => {
    it("flags G95 cutting while spindle is off", () => {
      const code = `%
O1001
G95 F0.1
G1 X10.
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g95_with_spindle_off");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("flags G95 cutting after M5", () => {
      const code = `%
O1001
G95 G97 S1000 M3
F0.1
G1 X10.
M5
G1 X20.
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g95_with_spindle_off");
      expect(m.length).toBeGreaterThanOrEqual(1);
    });

    it("does not flag G95 cutting while M3 active", () => {
      const code = `%
O1001
G95 G97 S1000 M3
F0.1
G1 X10.
G1 X20.
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g95_with_spindle_off");
      expect(m.length).toBe(0);
    });

    it("does not flag G94 with spindle off (irrelevant)", () => {
      const code = `%
O1001
G94 F100.
G1 X10.
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g95_with_spindle_off");
      expect(m.length).toBe(0);
    });
  });

  describe("cutting_without_feed", () => {
    it("flags G1 in G94 with no prior F", () => {
      const code = `%
O1001
G94
G1 X10.
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "cutting_without_feed");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag when F is on the cutting block", () => {
      const code = `%
O1001
G94
G1 X10. F100.
G1 X20.
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "cutting_without_feed");
      expect(m.length).toBe(0);
    });

    it("does not flag when F is set before cutting", () => {
      const code = `%
O1001
G94 F100.
G1 X10.
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "cutting_without_feed");
      expect(m.length).toBe(0);
    });

    it("flags only once per program", () => {
      const code = `%
O1001
G94
G1 X10.
G1 X20.
G1 X30.
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "cutting_without_feed");
      expect(m.length).toBe(1);
    });

    it("resets F-tracking on mode change", () => {
      const code = `%
O1001
G94 F100.
G1 X10.
G95 G97 M3 S1000
G1 X20.
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "cutting_without_feed");
      expect(m.length).toBe(1); // G1 X20 in G95 with no F
    });
  });

  describe("g93_without_f", () => {
    it("flags G1 in G93 without F-word on that block", () => {
      const code = `%
O1001
G93
G1 X10. F100.
G1 X20.
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g93_without_f");
      expect(m.length).toBe(1);
    });

    it("does not flag G93 block with F-word", () => {
      const code = `%
O1001
G93
G1 X10. F100.
G1 X20. F80.
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g93_without_f");
      expect(m.length).toBe(0);
    });

    it("does not apply in G94 mode", () => {
      const code = `%
O1001
G94 F100.
G1 X10.
G1 X20.
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g93_without_f");
      expect(m.length).toBe(0);
    });
  });

  describe("g93_unrealistic_f", () => {
    it("flags G93 F50000", () => {
      const code = `%
O1001
G93
G1 X10. F50000.
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g93_unrealistic_f");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
      expect(m[0].details?.f_value).toBe(50000);
    });

    it("does not flag G93 F100", () => {
      const code = `%
O1001
G93
G1 X10. F100.
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g93_unrealistic_f");
      expect(m.length).toBe(0);
    });

    it("respects custom max_g93_f", () => {
      const code = `%
O1001
G93
G1 X10. F500.
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code, { max_g93_f: 100 });
      const m = r.issues.filter((i) => i.kind === "g93_unrealistic_f");
      expect(m.length).toBe(1);
    });
  });

  describe("feed_mode_not_restored", () => {
    it("info flag opt-in when mode changed and not restored", () => {
      const code = `%
O1001
G94 F100.
G1 X10.
G95 G97 M3 S1000
G1 X20. F0.1
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code, {
        check_mode_restored: true,
      });
      const m = r.issues.filter((i) => i.kind === "feed_mode_not_restored");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("info");
    });

    it("off by default", () => {
      const code = `%
O1001
G94 F100.
G95 G97 M3 S1000
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "feed_mode_not_restored");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("counts mode activations", () => {
      const code = `%
O1001
G94 F100.
G95
G94
G93
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code);
      expect(r.summary.g93_count).toBe(1);
      expect(r.summary.g94_count).toBe(2);
      expect(r.summary.g95_count).toBe(1);
    });

    it("counts cut blocks", () => {
      const code = `%
O1001
G94 F100.
G1 X10.
G2 X20. Y0. I5. J0.
G3 X30. Y0. I5. J0.
G0 Z10.
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code);
      expect(r.summary.cut_block_count).toBe(3);
    });

    it("tracks initial and final mode", () => {
      const code = `%
O1001
G94 F100.
G1 X10.
G95 G97 M3 S1000
G1 X20. F0.1
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code);
      expect(r.summary.initial_mode).toBe("G94");
      expect(r.summary.final_mode).toBe("G95");
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean G94 program", () => {
      const code = `%
O1001
G94 G90 G54
G0 X0. Y0. Z5.
G1 Z-5. F100.
G1 X10.
M30
%`;
      const q = ppFeedModeValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.final_mode).toBe("G94");
      expect(q.cut_block_count).toBe(2);
    });

    it("returns valid=false for G95 with spindle off", () => {
      const code = `%
O1001
G95 F0.1
G1 X10.
M30
%`;
      const q = ppFeedModeValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppFeedModeValidatorEngine.defaultOptions();
      expect(o.check_mixed_in_block).toBe(true);
      expect(o.check_g95_spindle_off).toBe(true);
      expect(o.check_cutting_without_feed).toBe(true);
      expect(o.check_g93_needs_f).toBe(true);
      expect(o.check_g93_unrealistic).toBe(true);
      expect(o.check_mode_restored).toBe(false);
      expect(o.max_g93_f).toBe(9999);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppFeedModeValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
      expect(r.summary.final_mode).toBeNull();
      expect(r.summary.cut_block_count).toBe(0);
    });

    it("handles program with no motion", () => {
      const code = `%
O1001
G94 F100.
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code);
      expect(r.total_issues).toBe(0);
    });

    it("ignores G94 in comments", () => {
      const code = `%
O1001
(G94 example in comment)
G1 X10. F100.
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code);
      expect(r.summary.g94_count).toBe(0);
    });

    it("does not treat G94.1 as G94", () => {
      const code = `%
O1001
G94.1
M30
%`;
      const r = ppFeedModeValidatorEngine.validate(code);
      expect(r.summary.g94_count).toBe(0);
    });
  });
});
