/**
 * PPAbsIncValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPAbsIncValidatorEngine,
  ppAbsIncValidatorEngine,
} from "../engines/PPAbsIncValidatorEngine.js";

describe("PPAbsIncValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppAbsIncValidatorEngine).toBeInstanceOf(PPAbsIncValidatorEngine);
  });

  describe("abs_inc_mixed_in_block", () => {
    it("flags G90 G91 in same block", () => {
      const code = `%
O1001
G90 G91 X10.
M30
%`;
      const r = ppAbsIncValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "abs_inc_mixed_in_block");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag lone G90", () => {
      const code = `%
O1001
G90 G54 G17
G1 X10. F100.
M30
%`;
      const r = ppAbsIncValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "abs_inc_mixed_in_block");
      expect(m.length).toBe(0);
    });
  });

  describe("no_initial_abs_inc", () => {
    it("flags motion with no mode set", () => {
      const code = `%
O1001
G1 X10. F100.
M30
%`;
      const r = ppAbsIncValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "no_initial_abs_inc");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag when G90 set before motion", () => {
      const code = `%
O1001
G90 G54 G17
G1 X10. F100.
M30
%`;
      const r = ppAbsIncValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "no_initial_abs_inc");
      expect(m.length).toBe(0);
    });

    it("flags only once even with multiple motion blocks", () => {
      const code = `%
O1001
G1 X10. F100.
G1 X20.
G1 X30.
M30
%`;
      const r = ppAbsIncValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "no_initial_abs_inc");
      expect(m.length).toBe(1);
    });

    it("counts motion_before_mode_set in summary", () => {
      const code = `%
O1001
G1 X10. F100.
G1 X20.
G90
G1 X30.
M30
%`;
      const r = ppAbsIncValidatorEngine.validate(code);
      expect(r.summary.motion_before_mode_set).toBe(2);
    });
  });

  describe("mode_switch_during_arc", () => {
    it("flags G91 on same block as G2", () => {
      const code = `%
O1001
G90 G54
G1 X10. F100.
G91 G2 X5. Y0. I5. J0.
M30
%`;
      const r = ppAbsIncValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "mode_switch_during_arc");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("flags G90 on same block as G3 after G91 in effect", () => {
      const code = `%
O1001
G91
G1 X10. F100.
G90 G3 X5. Y0. I5. J0.
M30
%`;
      const r = ppAbsIncValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "mode_switch_during_arc");
      expect(m.length).toBe(1);
    });

    it("does not flag mode-same-as-prior on arc block", () => {
      const code = `%
O1001
G90 G54
G1 X10. F100.
G90 G2 X5. Y0. I5. J0.
M30
%`;
      const r = ppAbsIncValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "mode_switch_during_arc");
      expect(m.length).toBe(0);
    });

    it("does not flag arc with no mode word", () => {
      const code = `%
O1001
G90 G54
G2 X5. Y0. I5. J0. F100.
M30
%`;
      const r = ppAbsIncValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "mode_switch_during_arc");
      expect(m.length).toBe(0);
    });
  });

  describe("mode_switch_inside_canned_cycle", () => {
    it("flags G91 switch during active G81", () => {
      const code = `%
O1001
G90 G54
G81 X10. Y0. Z-5. R2. F100.
X20.
G91 X10.
G80
M30
%`;
      const r = ppAbsIncValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "mode_switch_inside_canned_cycle",
      );
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
      expect(m[0].details?.canned_cycle).toBe("G81");
    });

    it("does not flag mode change after G80 cancel", () => {
      const code = `%
O1001
G90 G54
G81 X10. Y0. Z-5. R2. F100.
G80
G91 X10.
M30
%`;
      const r = ppAbsIncValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "mode_switch_inside_canned_cycle",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("abs_inc_not_restored", () => {
    it("info flag opt-in when mode changed and not restored", () => {
      const code = `%
O1001
G90 G54
G1 X10. F100.
G91 G28 Z0.
M30
%`;
      const r = ppAbsIncValidatorEngine.validate(code, {
        check_mode_restored: true,
      });
      const m = r.issues.filter((i) => i.kind === "abs_inc_not_restored");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("info");
    });

    it("off by default", () => {
      const code = `%
O1001
G90 G54
G91 G28 Z0.
M30
%`;
      const r = ppAbsIncValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "abs_inc_not_restored");
      expect(m.length).toBe(0);
    });
  });

  describe("g91_with_absolute_address", () => {
    it("info flag opt-in when G91 sees large X", () => {
      const code = `%
O1001
G91
G1 X500. F100.
M30
%`;
      const r = ppAbsIncValidatorEngine.validate(code, {
        check_g91_large_address: true,
      });
      const m = r.issues.filter(
        (i) => i.kind === "g91_with_absolute_address",
      );
      expect(m.length).toBe(1);
      expect(m[0].details?.value).toBe(500);
    });

    it("respects custom threshold", () => {
      const code = `%
O1001
G91
G1 X50. F100.
M30
%`;
      const r = ppAbsIncValidatorEngine.validate(code, {
        check_g91_large_address: true,
        g91_large_address_threshold: 25.0,
      });
      const m = r.issues.filter(
        (i) => i.kind === "g91_with_absolute_address",
      );
      expect(m.length).toBe(1);
    });

    it("off by default", () => {
      const code = `%
O1001
G91
G1 X500. F100.
M30
%`;
      const r = ppAbsIncValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "g91_with_absolute_address",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("counts G90/G91 activations", () => {
      const code = `%
O1001
G90
G91
G90
M30
%`;
      const r = ppAbsIncValidatorEngine.validate(code);
      expect(r.summary.g90_count).toBe(2);
      expect(r.summary.g91_count).toBe(1);
    });

    it("tracks initial and final mode", () => {
      const code = `%
O1001
G90 G54
G1 X10. F100.
G91 G28 Z0.
M30
%`;
      const r = ppAbsIncValidatorEngine.validate(code);
      expect(r.summary.initial_mode).toBe("G90");
      expect(r.summary.final_mode).toBe("G91");
    });

    it("counts mode switches (transitions only)", () => {
      const code = `%
O1001
G90
G90
G91
G91
G90
M30
%`;
      const r = ppAbsIncValidatorEngine.validate(code);
      // G90→G90 (no switch), G90→G91 (1), G91→G91 (no), G91→G90 (2)
      expect(r.summary.mode_switch_count).toBe(2);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean G90 program", () => {
      const code = `%
O1001
G90 G54 G17
G0 X10. Y10. Z5.
G1 Z-5. F100.
G1 X20.
M30
%`;
      const q = ppAbsIncValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.final_mode).toBe("G90");
      expect(q.mode_switch_count).toBe(0);
    });

    it("returns valid=false when G90 G91 in same block", () => {
      const code = `%
O1001
G90 G91 X10.
M30
%`;
      const q = ppAbsIncValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppAbsIncValidatorEngine.defaultOptions();
      expect(o.check_mixed_in_block).toBe(true);
      expect(o.check_initial_mode).toBe(true);
      expect(o.check_switch_during_arc).toBe(true);
      expect(o.check_switch_in_canned).toBe(true);
      expect(o.check_mode_restored).toBe(false);
      expect(o.check_g91_large_address).toBe(false);
      expect(o.g91_large_address_threshold).toBe(100.0);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppAbsIncValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
      expect(r.summary.final_mode).toBeNull();
    });

    it("ignores G90 inside comments", () => {
      const code = `%
O1001
(G90 in comment)
G91
M30
%`;
      const r = ppAbsIncValidatorEngine.validate(code);
      expect(r.summary.g90_count).toBe(0);
      expect(r.summary.g91_count).toBe(1);
    });

    it("does not treat G90.1 as G90", () => {
      const code = `%
O1001
G90.1 X0. Y0.
M30
%`;
      const r = ppAbsIncValidatorEngine.validate(code);
      expect(r.summary.g90_count).toBe(0);
    });

    it("does not treat G91.1 as G91", () => {
      const code = `%
O1001
G91.1 X0. Y0.
M30
%`;
      const r = ppAbsIncValidatorEngine.validate(code);
      expect(r.summary.g91_count).toBe(0);
    });

    it("handles program that never sets mode", () => {
      const code = `%
O1001
G17 G54
S1000 M3
M30
%`;
      const r = ppAbsIncValidatorEngine.validate(code);
      expect(r.summary.initial_mode).toBeNull();
      expect(r.summary.final_mode).toBeNull();
    });
  });
});
