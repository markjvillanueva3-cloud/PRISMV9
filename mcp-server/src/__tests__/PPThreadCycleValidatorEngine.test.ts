/**
 * PPThreadCycleValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPThreadCycleValidatorEngine,
  ppThreadCycleValidatorEngine,
} from "../engines/PPThreadCycleValidatorEngine.js";

describe("PPThreadCycleValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppThreadCycleValidatorEngine).toBeInstanceOf(PPThreadCycleValidatorEngine);
  });

  describe("thread_without_feed_per_rev", () => {
    it("flags G32 without G95 active", () => {
      const code = `%
O1001
G94
G97 S1000 M3
G0 X12. Z1.
G32 X10. Z-20. F1.5
M30
%`;
      const r = ppThreadCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "thread_without_feed_per_rev");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag G32 with G95 active", () => {
      const code = `%
O1001
G95
G97 S1000 M3
G0 X12. Z1.
G32 X10. Z-20. F1.5
M30
%`;
      const r = ppThreadCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "thread_without_feed_per_rev");
      expect(m.length).toBe(0);
    });

    it("check_feed_per_rev=false suppresses", () => {
      const code = `%
O1001
G94
G32 X10. Z-20. F1.5
M30
%`;
      const r = ppThreadCycleValidatorEngine.validate(code, {
        check_feed_per_rev: false,
      });
      const m = r.issues.filter((i) => i.kind === "thread_without_feed_per_rev");
      expect(m.length).toBe(0);
    });
  });

  describe("thread_without_pitch_f", () => {
    it("flags G92 without F", () => {
      const code = `%
O1001
G95 G97 S1000 M3
G0 X12. Z1.
G92 X10. Z-20.
M30
%`;
      const r = ppThreadCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "thread_without_pitch_f");
      expect(m.length).toBe(1);
    });

    it("does not flag G92 with F", () => {
      const code = `%
O1001
G95 G97 S1000 M3
G0 X12. Z1.
G92 X10. Z-20. F1.5
M30
%`;
      const r = ppThreadCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "thread_without_pitch_f");
      expect(m.length).toBe(0);
    });
  });

  describe("g76_missing_p_q_r", () => {
    it("flags G76 with missing P", () => {
      const code = `%
O1001
G95 G97 S1000 M3
G0 X12. Z1.
G76 X10. Z-20. Q50 R0.1 F1.5
M30
%`;
      const r = ppThreadCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g76_missing_p_q_r");
      expect(m.length).toBe(1);
    });

    it("flags G76 with missing Q and R", () => {
      const code = `%
O1001
G95 G97 S1000 M3
G0 X12. Z1.
G76 X10. Z-20. P020060 F1.5
M30
%`;
      const r = ppThreadCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g76_missing_p_q_r");
      expect(m.length).toBe(1);
    });

    it("does not flag complete G76", () => {
      const code = `%
O1001
G95 G97 S1000 M3
G0 X12. Z1.
G76 X10. Z-20. P020060 Q50 R0.1 F1.5
M30
%`;
      const r = ppThreadCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g76_missing_p_q_r");
      expect(m.length).toBe(0);
    });
  });

  describe("thread_start_no_retract", () => {
    it("flags G32 with no preceding G0", () => {
      const code = `%
O1001
G95 G97 S1000 M3
G1 X12. Z0. F0.2
G32 X10. Z-20. F1.5
M30
%`;
      const r = ppThreadCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "thread_start_no_retract");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag G32 with preceding G0", () => {
      const code = `%
O1001
G95 G97 S1000 M3
G0 X12. Z1.
G32 X10. Z-20. F1.5
M30
%`;
      const r = ppThreadCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "thread_start_no_retract");
      expect(m.length).toBe(0);
    });
  });

  describe("css_mode_on_threading", () => {
    it("flags G32 with G96 CSS active", () => {
      const code = `%
O1001
G95 G96 S200 M3
G0 X12. Z1.
G32 X10. Z-20. F1.5
M30
%`;
      const r = ppThreadCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "css_mode_on_threading");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag G32 with G97 constant-RPM", () => {
      const code = `%
O1001
G95 G97 S1000 M3
G0 X12. Z1.
G32 X10. Z-20. F1.5
M30
%`;
      const r = ppThreadCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "css_mode_on_threading");
      expect(m.length).toBe(0);
    });
  });

  describe("pitch_mismatch_across_passes", () => {
    it("flags different F across G32 passes", () => {
      const code = `%
O1001
G95 G97 S1000 M3
G0 X12. Z1.
G32 X10. Z-20. F1.5
G0 X12. Z1.
G32 X10. Z-20. F1.25
M30
%`;
      const r = ppThreadCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "pitch_mismatch_across_passes");
      expect(m.length).toBe(1);
    });

    it("does not flag equal F across passes", () => {
      const code = `%
O1001
G95 G97 S1000 M3
G0 X12. Z1.
G32 X10. Z-20. F1.5
G0 X11. Z1.
G32 X9.5 Z-20. F1.5
M30
%`;
      const r = ppThreadCycleValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "pitch_mismatch_across_passes");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("counts G32/G33/G76/G92 independently", () => {
      const code = `%
O1001
G95 G97 S1000 M3
G0 X12. Z1.
G32 X10. Z-20. F1.5
G0 X12. Z1.
G33 X10. Z-20. F1.5
G0 X12. Z1.
G76 X10. Z-20. P020060 Q50 R0.1 F1.5
G0 X12. Z1.
G92 X10. Z-20. F1.5
M30
%`;
      const r = ppThreadCycleValidatorEngine.validate(code);
      expect(r.summary.g32_count).toBe(1);
      expect(r.summary.g33_count).toBe(1);
      expect(r.summary.g76_count).toBe(1);
      expect(r.summary.g92_count).toBe(1);
      expect(r.summary.threading_passes).toBe(4);
    });

    it("tracks last_pitch", () => {
      const code = `%
O1001
G95 G97 S1000 M3
G0 X12. Z1.
G32 X10. Z-20. F1.5
M30
%`;
      const r = ppThreadCycleValidatorEngine.validate(code);
      expect(r.summary.last_pitch).toBeCloseTo(1.5, 5);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean threading", () => {
      const code = `%
O1001
G95 G97 S1000 M3
G0 X12. Z1.
G76 X10. Z-20. P020060 Q50 R0.1 F1.5
M30
%`;
      const q = ppThreadCycleValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.threading_passes).toBe(1);
    });

    it("returns valid=false on CSS threading", () => {
      const code = `%
O1001
G95 G96 S200 M3
G0 X12. Z1.
G32 X10. Z-20. F1.5
M30
%`;
      const q = ppThreadCycleValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppThreadCycleValidatorEngine.defaultOptions();
      expect(o.check_feed_per_rev).toBe(true);
      expect(o.check_pitch_f).toBe(true);
      expect(o.check_g76_params).toBe(true);
      expect(o.check_retract_before).toBe(true);
      expect(o.check_css_off).toBe(true);
      expect(o.check_pitch_consistency).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppThreadCycleValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
      expect(r.summary.threading_passes).toBe(0);
    });

    it("handles program with no threading", () => {
      const code = `%
O1001
G94 G97 S1000 M3
G0 X10. Z1.
G1 X0. Z-10. F0.2
M30
%`;
      const r = ppThreadCycleValidatorEngine.validate(code);
      expect(r.summary.threading_passes).toBe(0);
      expect(r.errors).toBe(0);
    });

    it("ignores G32 inside comments", () => {
      const code = `%
O1001
G95 G97 S1000 M3
(G32 example in comment)
G0 X12. Z1.
G32 X10. Z-20. F1.5
M30
%`;
      const r = ppThreadCycleValidatorEngine.validate(code);
      expect(r.summary.g32_count).toBe(1);
    });

    it("distinguishes G92 threading from G92 coordinate set", () => {
      // Note: G92 can also mean coordinate system preset in mill contexts.
      // Our engine treats G92 as threading on lathes; tests assume lathe usage.
      const code = `%
O1001
G95 G97 S1000 M3
G0 X12. Z1.
G92 X10. Z-20. F1.5
M30
%`;
      const r = ppThreadCycleValidatorEngine.validate(code);
      expect(r.summary.g92_count).toBe(1);
    });
  });
});
