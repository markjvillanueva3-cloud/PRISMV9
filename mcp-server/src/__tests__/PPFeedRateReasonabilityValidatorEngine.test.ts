/**
 * PPFeedRateReasonabilityValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPFeedRateReasonabilityValidatorEngine,
  ppFeedRateReasonabilityValidatorEngine,
} from "../engines/PPFeedRateReasonabilityValidatorEngine.js";

describe("PPFeedRateReasonabilityValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppFeedRateReasonabilityValidatorEngine).toBeInstanceOf(
      PPFeedRateReasonabilityValidatorEngine,
    );
  });

  describe("f_zero_value", () => {
    it("flags F0", () => {
      const code = `%
O1001
G1 X10. F0
M30
%`;
      const r = ppFeedRateReasonabilityValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "f_zero_value");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("flags F0.0", () => {
      const code = `%
O1001
G1 X10. F0.0
M30
%`;
      const r = ppFeedRateReasonabilityValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "f_zero_value");
      expect(m.length).toBe(1);
    });

    it("does not flag F100", () => {
      const code = `%
O1001
G1 X10. F100.
M30
%`;
      const r = ppFeedRateReasonabilityValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "f_zero_value");
      expect(m.length).toBe(0);
    });
  });

  describe("f_negative", () => {
    it("flags F-100", () => {
      const code = `%
O1001
G1 X10. F-100.
M30
%`;
      const r = ppFeedRateReasonabilityValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "f_negative");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag positive F", () => {
      const code = `%
O1001
G1 X10. F100.
M30
%`;
      const r = ppFeedRateReasonabilityValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "f_negative");
      expect(m.length).toBe(0);
    });
  });

  describe("f_with_rapid", () => {
    it("flags F on G0 block", () => {
      const code = `%
O1001
G0 X10. F100.
M30
%`;
      const r = ppFeedRateReasonabilityValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "f_with_rapid");
      expect(m.length).toBe(1);
    });

    it("does not flag F on G1 block", () => {
      const code = `%
O1001
G0 X10.
G1 Z-1. F100.
M30
%`;
      const r = ppFeedRateReasonabilityValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "f_with_rapid");
      expect(m.length).toBe(0);
    });
  });

  describe("f_above_max", () => {
    it("flags F > default max (20000)", () => {
      const code = `%
O1001
G1 X10. F50000.
M30
%`;
      const r = ppFeedRateReasonabilityValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "f_above_max");
      expect(m.length).toBe(1);
    });

    it("respects custom max_feed", () => {
      const code = `%
O1001
G1 X10. F5000.
M30
%`;
      const r = ppFeedRateReasonabilityValidatorEngine.validate(code, {
        max_feed: 3000,
      });
      const m = r.issues.filter((i) => i.kind === "f_above_max");
      expect(m.length).toBe(1);
    });

    it("does not flag F within range", () => {
      const code = `%
O1001
G1 X10. F500.
M30
%`;
      const r = ppFeedRateReasonabilityValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "f_above_max");
      expect(m.length).toBe(0);
    });
  });

  describe("f_below_min_cutting", () => {
    it("flags F < min on G1", () => {
      const code = `%
O1001
G1 X10. F0.1
M30
%`;
      const r = ppFeedRateReasonabilityValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "f_below_min_cutting");
      expect(m.length).toBe(1);
    });

    it("does not flag F below min on G0", () => {
      const code = `%
O1001
G0 X10. F0.1
M30
%`;
      const r = ppFeedRateReasonabilityValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "f_below_min_cutting");
      expect(m.length).toBe(0);
    });

    it("does not flag normal feed", () => {
      const code = `%
O1001
G1 X10. F100.
M30
%`;
      const r = ppFeedRateReasonabilityValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "f_below_min_cutting");
      expect(m.length).toBe(0);
    });
  });

  describe("f_integer_in_decimal_machine", () => {
    it("opt-in flags F100 without decimal", () => {
      const code = `%
O1001
G1 X10. F100
M30
%`;
      const r = ppFeedRateReasonabilityValidatorEngine.validate(code, {
        check_integer_format: true,
      });
      const m = r.issues.filter(
        (i) => i.kind === "f_integer_in_decimal_machine",
      );
      expect(m.length).toBe(1);
    });

    it("does not flag F100.", () => {
      const code = `%
O1001
G1 X10. F100.
M30
%`;
      const r = ppFeedRateReasonabilityValidatorEngine.validate(code, {
        check_integer_format: true,
      });
      const m = r.issues.filter(
        (i) => i.kind === "f_integer_in_decimal_machine",
      );
      expect(m.length).toBe(0);
    });

    it("off by default", () => {
      const code = `%
O1001
G1 X10. F100
M30
%`;
      const r = ppFeedRateReasonabilityValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "f_integer_in_decimal_machine",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("f_changed_mid_cut", () => {
    it("opt-in flags frequent F changes in cutting section", () => {
      const code = `%
O1001
G1 X10. F100.
G1 X20. F200.
G1 X30. F300.
G1 X40. F400.
G1 X50. F500.
G1 X60. F600.
G1 X70. F700.
M30
%`;
      const r = ppFeedRateReasonabilityValidatorEngine.validate(code, {
        check_frequent_changes: true,
        max_f_changes_per_section: 3,
      });
      const m = r.issues.filter((i) => i.kind === "f_changed_mid_cut");
      expect(m.length).toBeGreaterThanOrEqual(1);
    });

    it("resets counter on G0 rapid", () => {
      const code = `%
O1001
G1 X10. F100.
G1 X20. F200.
G1 X30. F300.
G1 X40. F400.
G0 Z50.
G1 X50. F500.
M30
%`;
      const r = ppFeedRateReasonabilityValidatorEngine.validate(code, {
        check_frequent_changes: true,
        max_f_changes_per_section: 3,
      });
      const m = r.issues.filter((i) => i.kind === "f_changed_mid_cut");
      expect(m.length).toBe(0);
    });

    it("off by default", () => {
      const code = `%
O1001
G1 X10. F100.
G1 X20. F200.
G1 X30. F300.
G1 X40. F400.
G1 X50. F500.
G1 X60. F600.
M30
%`;
      const r = ppFeedRateReasonabilityValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "f_changed_mid_cut");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("reports f_values_seen", () => {
      const code = `%
O1001
G1 X10. F100.
G1 X20. F200.
G1 X30. F300.
M30
%`;
      const r = ppFeedRateReasonabilityValidatorEngine.validate(code);
      expect(r.summary.f_values_seen).toBe(3);
    });

    it("reports min_f and max_f", () => {
      const code = `%
O1001
G1 X10. F100.
G1 X20. F500.
G1 X30. F250.
M30
%`;
      const r = ppFeedRateReasonabilityValidatorEngine.validate(code);
      expect(r.summary.min_f).toBe(100);
      expect(r.summary.max_f).toBe(500);
    });
  });

  describe("quickCheck", () => {
    it("returns summary", () => {
      const code = `%
O1001
G1 X10. F100.
M30
%`;
      const q = ppFeedRateReasonabilityValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.f_count).toBe(1);
      expect(q.min_f).toBe(100);
    });

    it("returns valid=false for F0", () => {
      const code = `%
O1001
G1 X10. F0
M30
%`;
      const q = ppFeedRateReasonabilityValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppFeedRateReasonabilityValidatorEngine.defaultOptions();
      expect(o.check_zero).toBe(true);
      expect(o.check_negative).toBe(true);
      expect(o.check_f_with_rapid).toBe(true);
      expect(o.check_integer_format).toBe(false);
      expect(o.check_frequent_changes).toBe(false);
      expect(o.max_feed).toBe(20000);
      expect(o.min_cutting_feed).toBe(0.5);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppFeedRateReasonabilityValidatorEngine.validate("");
      expect(r.summary.f_values_seen).toBe(0);
      expect(r.summary.min_f).toBeNull();
      expect(r.summary.max_f).toBeNull();
    });

    it("handles program with no F-words", () => {
      const code = `%
O1001
G0 X10.
M30
%`;
      const r = ppFeedRateReasonabilityValidatorEngine.validate(code);
      expect(r.summary.f_values_seen).toBe(0);
      expect(r.summary.valid).toBe(true);
    });

    it("strips comments before F detection", () => {
      const code = `%
O1001
(feed F0 was old value)
G1 X10. F100.
M30
%`;
      const r = ppFeedRateReasonabilityValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "f_zero_value");
      expect(m.length).toBe(0);
    });
  });
});
