/**
 * PPONumberRangeValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPONumberRangeValidatorEngine,
  ppONumberRangeValidatorEngine,
} from "../engines/PPONumberRangeValidatorEngine.js";

describe("PPONumberRangeValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppONumberRangeValidatorEngine).toBeInstanceOf(
      PPONumberRangeValidatorEngine,
    );
  });

  describe("o_number_zero", () => {
    it("flags O0", () => {
      const code = `%
O0
G0 X10.
M30
%`;
      const r = ppONumberRangeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "o_number_zero");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag O0000 (leading-zero 0 is still 0)", () => {
      const code = `%
O0000
G0 X10.
M30
%`;
      const r = ppONumberRangeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "o_number_zero");
      expect(m.length).toBe(1);
    });
  });

  describe("o_number_too_large", () => {
    it("flags O > default max (99999)", () => {
      const code = `%
O100000
G0 X10.
M30
%`;
      const r = ppONumberRangeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "o_number_too_large");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("respects custom max_o", () => {
      const code = `%
O5000
G0 X10.
M30
%`;
      const r = ppONumberRangeValidatorEngine.validate(code, {
        max_o: 4000,
      });
      const m = r.issues.filter((i) => i.kind === "o_number_too_large");
      expect(m.length).toBe(1);
    });

    it("does not flag O < max_o", () => {
      const code = `%
O1001
G0 X10.
M30
%`;
      const r = ppONumberRangeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "o_number_too_large");
      expect(m.length).toBe(0);
    });
  });

  describe("o_in_reserved_macro_range", () => {
    it("flags O9500 without (MACRO) tag", () => {
      const code = `%
O9500
G0 X10.
M30
%`;
      const r = ppONumberRangeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "o_in_reserved_macro_range");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag O9500 with (MACRO) tag", () => {
      const code = `%
O9500
(MACRO: probe cycle)
G0 X10.
M30
%`;
      const r = ppONumberRangeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "o_in_reserved_macro_range");
      expect(m.length).toBe(0);
    });

    it("does not flag O1001 outside reserved range", () => {
      const code = `%
O1001
G0 X10.
M30
%`;
      const r = ppONumberRangeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "o_in_reserved_macro_range");
      expect(m.length).toBe(0);
    });
  });

  describe("o_out_of_main_range", () => {
    it("flags main O outside configured range", () => {
      const code = `%
O500
G0 X10.
M30
%`;
      const r = ppONumberRangeValidatorEngine.validate(code, {
        check_main_range: true,
        main_range: { min: 1000, max: 4999 },
      });
      const m = r.issues.filter((i) => i.kind === "o_out_of_main_range");
      expect(m.length).toBe(1);
    });

    it("does not flag when main O in range", () => {
      const code = `%
O1500
G0 X10.
M30
%`;
      const r = ppONumberRangeValidatorEngine.validate(code, {
        check_main_range: true,
        main_range: { min: 1000, max: 4999 },
      });
      const m = r.issues.filter((i) => i.kind === "o_out_of_main_range");
      expect(m.length).toBe(0);
    });

    it("off by default", () => {
      const code = `%
O500
G0 X10.
M30
%`;
      const r = ppONumberRangeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "o_out_of_main_range");
      expect(m.length).toBe(0);
    });
  });

  describe("o_out_of_sub_range", () => {
    it("flags sub O outside configured range", () => {
      const code = `%
O1001
M98 P8000
M30
O8000
G0 X10.
M99
%`;
      const r = ppONumberRangeValidatorEngine.validate(code, {
        check_sub_range: true,
        sub_range: { min: 5000, max: 7999 },
      });
      const m = r.issues.filter((i) => i.kind === "o_out_of_sub_range");
      expect(m.length).toBe(1);
      expect(m[0].o_number).toBe(8000);
    });

    it("does not flag main O (only subs)", () => {
      const code = `%
O100
G0 X10.
M30
%`;
      const r = ppONumberRangeValidatorEngine.validate(code, {
        check_sub_range: true,
        sub_range: { min: 1000, max: 8999 },
      });
      const m = r.issues.filter((i) => i.kind === "o_out_of_sub_range");
      expect(m.length).toBe(0);
    });
  });

  describe("leading_zero_inconsistency", () => {
    it("flags O1 mixed with O0001", () => {
      const code = `%
O1
M98 P0002
M30
O0002
G0 X10.
M99
%`;
      const r = ppONumberRangeValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "leading_zero_inconsistency",
      );
      expect(m.length).toBe(1);
      expect(m[0].details?.widths_observed).toEqual([1, 4]);
    });

    it("does not flag consistent widths", () => {
      const code = `%
O1001
M98 P1002
M30
O1002
G0 X10.
M99
%`;
      const r = ppONumberRangeValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "leading_zero_inconsistency",
      );
      expect(m.length).toBe(0);
    });

    it("does not flag single O-number", () => {
      const code = `%
O1
G0 X10.
M30
%`;
      const r = ppONumberRangeValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "leading_zero_inconsistency",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("o_number_format_invalid", () => {
    it("flags O with non-digit", () => {
      const code = `%
Ofoo
G0 X10.
M30
%`;
      const r = ppONumberRangeValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "o_number_format_invalid",
      );
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("flags O12.5", () => {
      const code = `%
O12.5
G0 X10.
M30
%`;
      const r = ppONumberRangeValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "o_number_format_invalid",
      );
      expect(m.length).toBe(1);
    });

    it("does not flag O123", () => {
      const code = `%
O123
G0 X10.
M30
%`;
      const r = ppONumberRangeValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "o_number_format_invalid",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("reports main_o and sub_os", () => {
      const code = `%
O1001
M98 P2001
M98 P2002
M30
O2001
M99
O2002
M99
%`;
      const r = ppONumberRangeValidatorEngine.validate(code);
      expect(r.summary.main_o).toBe(1001);
      expect(r.summary.sub_os).toEqual([2001, 2002]);
      expect(r.summary.o_numbers).toEqual([1001, 2001, 2002]);
    });

    it("reports leading_zero_widths", () => {
      const code = `%
O1001
M30
O0001
M99
%`;
      const r = ppONumberRangeValidatorEngine.validate(code);
      expect(r.summary.leading_zero_widths).toEqual([4]);
    });
  });

  describe("quickCheck", () => {
    it("returns summary", () => {
      const code = `%
O1001
M98 P2001
M30
O2001
M99
%`;
      const q = ppONumberRangeValidatorEngine.quickCheck(code);
      expect(q.o_count).toBe(2);
      expect(q.main_o).toBe(1001);
      expect(q.widths).toEqual([4]);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppONumberRangeValidatorEngine.defaultOptions();
      expect(o.check_zero).toBe(true);
      expect(o.check_too_large).toBe(true);
      expect(o.check_main_range).toBe(false);
      expect(o.check_sub_range).toBe(false);
      expect(o.check_reserved_macro_range).toBe(true);
      expect(o.max_o).toBe(99999);
      expect(o.reserved_macro_range).toEqual({ min: 9000, max: 9999 });
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppONumberRangeValidatorEngine.validate("");
      expect(r.summary.o_numbers.length).toBe(0);
      expect(r.summary.main_o).toBeUndefined();
    });

    it("handles program with no O-numbers", () => {
      const code = `%
G0 X10.
M30
%`;
      const r = ppONumberRangeValidatorEngine.validate(code);
      expect(r.summary.o_numbers.length).toBe(0);
    });

    it("handles many subprograms", () => {
      const code = `%
O1001
M98 P2001
M98 P2002
M98 P2003
M30
O2001
M99
O2002
M99
O2003
M99
%`;
      const r = ppONumberRangeValidatorEngine.validate(code);
      expect(r.summary.sub_os.length).toBe(3);
    });
  });
});
