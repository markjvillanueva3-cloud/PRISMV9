/**
 * PPReferenceReturnValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPReferenceReturnValidatorEngine,
  ppReferenceReturnValidatorEngine,
} from "../engines/PPReferenceReturnValidatorEngine.js";

describe("PPReferenceReturnValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppReferenceReturnValidatorEngine).toBeInstanceOf(
      PPReferenceReturnValidatorEngine,
    );
  });

  describe("g28_with_cutter_comp", () => {
    it("flags G28 while G41 active", () => {
      const code = `%
O1001
G41 D1
G1 X10. F100.
G91 G28 Z0.
G40
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g28_with_cutter_comp");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
      expect(m[0].details?.cutter_comp).toBe("G41");
    });

    it("flags G28 while G42 active", () => {
      const code = `%
O1001
G42 D1
G1 X10. F100.
G91 G28 Z0.
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g28_with_cutter_comp");
      expect(m.length).toBe(1);
      expect(m[0].details?.cutter_comp).toBe("G42");
    });

    it("does not flag G28 after G40 cancel", () => {
      const code = `%
O1001
G41 D1
G1 X10. F100.
G40
G91 G28 Z0.
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g28_with_cutter_comp");
      expect(m.length).toBe(0);
    });

    it("check_cutter_comp=false suppresses", () => {
      const code = `%
O1001
G41 D1
G91 G28 Z0.
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code, {
        check_cutter_comp: false,
      });
      const m = r.issues.filter((i) => i.kind === "g28_with_cutter_comp");
      expect(m.length).toBe(0);
    });
  });

  describe("g28_xy_without_safe_z", () => {
    it("flags G28 X Y without preceding G28 Z", () => {
      const code = `%
O1001
G91 G28 X0. Y0.
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g28_xy_without_safe_z");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag the canonical Z-first-then-XY pattern", () => {
      const code = `%
O1001
G91 G28 Z0.
G91 G28 X0. Y0.
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g28_xy_without_safe_z");
      expect(m.length).toBe(0);
    });

    it("flags when motion intervenes between Z-return and XY-return", () => {
      const code = `%
O1001
G91 G28 Z0.
G90 G0 X10. Y10.
G91 G28 X0. Y0.
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g28_xy_without_safe_z");
      expect(m.length).toBe(1);
    });
  });

  describe("g28_absolute_nonzero", () => {
    it("flags G90 G28 X5. Y5.", () => {
      const code = `%
O1001
G90 G28 X5. Y5.
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g28_absolute_nonzero");
      expect(m.length).toBe(1);
      expect(m[0].details?.axes_given).toEqual(["X", "Y"]);
    });

    it("does not flag G90 G28 X0. Y0.", () => {
      const code = `%
O1001
G91 G28 Z0.
G90 G28 X0. Y0.
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g28_absolute_nonzero");
      expect(m.length).toBe(0);
    });

    it("does not flag G91 G28 Z0.", () => {
      const code = `%
O1001
G91 G28 Z0.
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g28_absolute_nonzero");
      expect(m.length).toBe(0);
    });
  });

  describe("g30_p_out_of_range", () => {
    it("flags G30 P5", () => {
      const code = `%
O1001
G91 G30 P5 X0. Y0.
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g30_p_out_of_range");
      expect(m.length).toBe(1);
      expect(m[0].details?.p_value).toBe(5);
    });

    it("flags G30 P0", () => {
      const code = `%
O1001
G91 G30 P0 X0. Y0.
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g30_p_out_of_range");
      expect(m.length).toBe(1);
      expect(m[0].details?.p_value).toBe(0);
    });

    it("does not flag G30 P1", () => {
      const code = `%
O1001
G91 G30 P1 X0. Y0.
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g30_p_out_of_range");
      expect(m.length).toBe(0);
    });

    it("does not flag G30 P4", () => {
      const code = `%
O1001
G91 G30 P4 X0. Y0.
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g30_p_out_of_range");
      expect(m.length).toBe(0);
    });
  });

  describe("g53_with_non_rapid", () => {
    it("flags G53 G1", () => {
      const code = `%
O1001
G53 G1 X10. Y10. F100.
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g53_with_non_rapid");
      expect(m.length).toBe(1);
      expect(m[0].details?.g_motion).toBe("G1");
    });

    it("does not flag G53 G0", () => {
      const code = `%
O1001
G53 G0 X10. Y10.
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g53_with_non_rapid");
      expect(m.length).toBe(0);
    });

    it("does not flag G53 with no motion word", () => {
      const code = `%
O1001
G53 X10. Y10.
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g53_with_non_rapid");
      expect(m.length).toBe(0);
    });
  });

  describe("g53_with_unreferenced_axis", () => {
    it("info flag opt-in when G53 has no axis words", () => {
      const code = `%
O1001
G53
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code, {
        check_g53_unreferenced: true,
      });
      const m = r.issues.filter(
        (i) => i.kind === "g53_with_unreferenced_axis",
      );
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("info");
    });

    it("off by default", () => {
      const code = `%
O1001
G53
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "g53_with_unreferenced_axis",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("counts G28/G30/G53", () => {
      const code = `%
O1001
G91 G28 Z0.
G91 G28 X0. Y0.
G91 G30 P1 X0. Y0.
G53 G0 X10. Y10.
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code);
      expect(r.summary.g28_count).toBe(2);
      expect(r.summary.g30_count).toBe(1);
      expect(r.summary.g53_count).toBe(1);
    });

    it("counts safe-Z pattern occurrences", () => {
      const code = `%
O1001
G91 G28 Z0.
G91 G28 X0. Y0.
(middle)
G91 G28 Z0.
G91 G28 X0. Y0.
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code);
      expect(r.summary.safe_z_pattern_count).toBe(2);
    });

    it("does not increment safe-Z count when motion intervenes", () => {
      const code = `%
O1001
G91 G28 Z0.
G90 G0 X10. Y10.
G91 G28 X0. Y0.
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code);
      expect(r.summary.safe_z_pattern_count).toBe(0);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean safe-Z program", () => {
      const code = `%
O1001
G91 G28 Z0.
G91 G28 X0. Y0.
M30
%`;
      const q = ppReferenceReturnValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.g28_count).toBe(2);
      expect(q.safe_z_pattern_count).toBe(1);
    });

    it("returns valid=false when G28 under cutter comp", () => {
      const code = `%
O1001
G41 D1
G91 G28 Z0.
M30
%`;
      const q = ppReferenceReturnValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppReferenceReturnValidatorEngine.defaultOptions();
      expect(o.check_cutter_comp).toBe(true);
      expect(o.check_safe_z).toBe(true);
      expect(o.check_absolute_nonzero).toBe(true);
      expect(o.check_g30_p_range).toBe(true);
      expect(o.check_g53_motion).toBe(true);
      expect(o.check_g53_unreferenced).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppReferenceReturnValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
      expect(r.summary.g28_count).toBe(0);
    });

    it("handles program with no reference-returns", () => {
      const code = `%
O1001
G17 G90 G54
G0 X10. Y10.
G1 Z-5. F100.
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code);
      expect(r.total_issues).toBe(0);
    });

    it("ignores G28 inside comments", () => {
      const code = `%
O1001
(G91 G28 Z0. example in comment)
G1 X10. F100.
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code);
      expect(r.summary.g28_count).toBe(0);
    });

    it("does not treat G28.1 as G28", () => {
      const code = `%
O1001
G28.1 X0.
M30
%`;
      const r = ppReferenceReturnValidatorEngine.validate(code);
      expect(r.summary.g28_count).toBe(0);
    });
  });
});
