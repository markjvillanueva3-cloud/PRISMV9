/**
 * PPSpeedModeValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPSpeedModeValidatorEngine,
  ppSpeedModeValidatorEngine,
} from "../engines/PPSpeedModeValidatorEngine.js";

describe("PPSpeedModeValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppSpeedModeValidatorEngine).toBeInstanceOf(
      PPSpeedModeValidatorEngine,
    );
  });

  describe("mode_mixed_in_block", () => {
    it("flags G96 G97 in same block", () => {
      const code = `%
O1001
G96 G97 S1000
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "mode_mixed_in_block");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag single G96", () => {
      const code = `%
O1001
G50 S3000
G96 S200
G1 X10. F0.1
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "mode_mixed_in_block");
      expect(m.length).toBe(0);
    });
  });

  describe("css_without_s", () => {
    it("flags G96 with no S and no prior S", () => {
      const code = `%
O1001
G50 S3000
G96
G1 X10. F0.1
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "css_without_s");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag G96 with S on same block", () => {
      const code = `%
O1001
G50 S3000
G96 S200
G1 X10. F0.1
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "css_without_s");
      expect(m.length).toBe(0);
    });

    it("does not flag G96 with prior S established", () => {
      const code = `%
O1001
G50 S3000
G97 S1200
G96
G1 X10. F0.1
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "css_without_s");
      expect(m.length).toBe(0);
    });
  });

  describe("css_without_max_rpm", () => {
    it("flags G96 without prior G50 S<max>", () => {
      const code = `%
O1001
G96 S200
G1 X10. F0.1
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "css_without_max_rpm");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag G96 after G50 S3000", () => {
      const code = `%
O1001
G50 S3000
G96 S200
G1 X10. F0.1
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "css_without_max_rpm");
      expect(m.length).toBe(0);
    });

    it("accepts G92 S as max-rpm limiter", () => {
      const code = `%
O1001
G92 S3000
G96 S200
G1 X10. F0.1
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "css_without_max_rpm");
      expect(m.length).toBe(0);
    });
  });

  describe("css_near_spindle_center", () => {
    it("flags G96 cut at X1.0 in diameter mode (diameter=1.0 < 2.0)", () => {
      const code = `%
O1001
G50 S3000
G96 S200
G1 X1.0 F0.1
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "css_near_spindle_center");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
      expect(m[0].details?.diameter).toBeCloseTo(1.0);
    });

    it("does not flag G96 cut at X20.0 (safe diameter)", () => {
      const code = `%
O1001
G50 S3000
G96 S200
G1 X20.0 F0.1
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "css_near_spindle_center");
      expect(m.length).toBe(0);
    });

    it("does not flag G97 cut near center (irrelevant)", () => {
      const code = `%
O1001
G97 S2000
G1 X0.5 F0.1
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "css_near_spindle_center");
      expect(m.length).toBe(0);
    });

    it("respects custom min_diameter", () => {
      const code = `%
O1001
G50 S3000
G96 S200
G1 X5.0 F0.1
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code, {
        min_diameter: 3.0,
      });
      const m = r.issues.filter((i) => i.kind === "css_near_spindle_center");
      expect(m.length).toBe(1);
    });

    it("handles radius coordinate mode", () => {
      // In radius mode, X0.5 means radius=0.5 → diameter=1.0 → < 2.0 threshold
      const code = `%
O1001
G50 S3000
G96 S200
G1 X0.5 F0.1
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code, {
        coordinate_mode: "radius",
      });
      const m = r.issues.filter((i) => i.kind === "css_near_spindle_center");
      expect(m.length).toBe(1);
    });
  });

  describe("rpm_without_s", () => {
    it("flags G97 with no S and no prior S", () => {
      const code = `%
O1001
G97
G1 X10. F0.1
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "rpm_without_s");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag G97 with S on same block", () => {
      const code = `%
O1001
G97 S2000
G1 X10. F0.1
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "rpm_without_s");
      expect(m.length).toBe(0);
    });
  });

  describe("negative_or_zero_s", () => {
    it("flags S0", () => {
      const code = `%
O1001
G97 S0
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "negative_or_zero_s");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("flags S-100", () => {
      const code = `%
O1001
G97 S-100
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "negative_or_zero_s");
      expect(m.length).toBe(1);
      expect(m[0].details?.s_value).toBe(-100);
    });

    it("does not flag S2000", () => {
      const code = `%
O1001
G97 S2000
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "negative_or_zero_s");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("counts G96/G97/G50 S", () => {
      const code = `%
O1001
G50 S3000
G96 S200
G97 S1200
G96 S180
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code);
      expect(r.summary.g96_count).toBe(2);
      expect(r.summary.g97_count).toBe(1);
      expect(r.summary.g50_s_count).toBe(1);
      expect(r.summary.max_rpm_established).toBe(3000);
    });

    it("counts cut blocks", () => {
      const code = `%
O1001
G50 S3000
G97 S2000
G1 X10. F0.1
G2 X20. Z-5. I5. K0.
G3 X30. Z-10. I5. K0.
G0 X40.
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code);
      expect(r.summary.cut_block_count).toBe(3);
    });

    it("tracks final mode", () => {
      const code = `%
O1001
G50 S3000
G97 S2000
G1 X10. F0.1
G96 S200
G1 X20. F0.1
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code);
      expect(r.summary.final_mode).toBe("G96");
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean G97 program", () => {
      const code = `%
O1001
G97 S2000 M3
G0 X10. Z5.
G1 Z-5. F0.1
M30
%`;
      const q = ppSpeedModeValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.final_mode).toBe("G97");
    });

    it("returns valid=false when CSS activates with no S", () => {
      const code = `%
O1001
G50 S3000
G96
G1 X10. F0.1
M30
%`;
      const q = ppSpeedModeValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppSpeedModeValidatorEngine.defaultOptions();
      expect(o.check_css_needs_s).toBe(true);
      expect(o.check_css_needs_max_rpm).toBe(true);
      expect(o.check_css_near_center).toBe(true);
      expect(o.check_rpm_needs_s).toBe(true);
      expect(o.check_negative_s).toBe(true);
      expect(o.check_mixed_in_block).toBe(true);
      expect(o.min_diameter).toBe(1.0);
      expect(o.coordinate_mode).toBe("diameter");
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppSpeedModeValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
      expect(r.summary.final_mode).toBeNull();
    });

    it("handles program with no speed-mode tokens", () => {
      const code = `%
O1001
G0 X10. Z5.
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code);
      expect(r.summary.g96_count).toBe(0);
      expect(r.summary.g97_count).toBe(0);
      expect(r.summary.final_mode).toBeNull();
    });

    it("ignores G96 in comments", () => {
      const code = `%
O1001
(G96 example in comment)
G97 S2000
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code);
      expect(r.summary.g96_count).toBe(0);
      expect(r.summary.g97_count).toBe(1);
    });

    it("does not treat G96.1 as G96", () => {
      const code = `%
O1001
G96.1 P1
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code);
      expect(r.summary.g96_count).toBe(0);
    });

    it("detects U-word diameter on lathe", () => {
      const code = `%
O1001
G50 S3000
G96 S200
G1 U0.5 F0.1
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "css_near_spindle_center");
      expect(m.length).toBe(1);
    });

    it("can suppress all checks via options", () => {
      const code = `%
O1001
G96
G97 S-100
G1 X0.5 F0.1
M30
%`;
      const r = ppSpeedModeValidatorEngine.validate(code, {
        check_css_needs_s: false,
        check_css_needs_max_rpm: false,
        check_css_near_center: false,
        check_rpm_needs_s: false,
        check_negative_s: false,
        check_mixed_in_block: false,
      });
      expect(r.total_issues).toBe(0);
    });
  });
});
