/**
 * PPG10DataSetValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPG10DataSetValidatorEngine,
  ppG10DataSetValidatorEngine,
} from "../engines/PPG10DataSetValidatorEngine.js";

describe("PPG10DataSetValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppG10DataSetValidatorEngine).toBeInstanceOf(
      PPG10DataSetValidatorEngine,
    );
  });

  describe("missing_l_parameter", () => {
    it("flags G10 without L", () => {
      const code = `%
O1001
G10 P1 X0. Y0. Z0.
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_l_parameter");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag G10 L2 P1", () => {
      const code = `%
O1001
G10 L2 P1 X100. Y200. Z-50.
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_l_parameter");
      expect(m.length).toBe(0);
    });
  });

  describe("invalid_l_value", () => {
    it("flags G10 L99", () => {
      const code = `%
O1001
G10 L99 P1 X0. Y0.
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "invalid_l_value");
      expect(m.length).toBe(1);
    });

    it("accepts G10 L10", () => {
      const code = `%
O1001
G10 L10 P1 R5.0
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "invalid_l_value");
      expect(m.length).toBe(0);
    });

    it("accepts G10 L20", () => {
      const code = `%
O1001
G10 L20 P1 X0. Y0. Z0.
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "invalid_l_value");
      expect(m.length).toBe(0);
    });
  });

  describe("missing_p_parameter", () => {
    it("flags G10 L2 without P", () => {
      const code = `%
O1001
G10 L2 X0. Y0. Z0.
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_p_parameter");
      expect(m.length).toBe(1);
    });

    it("flags G10 L10 without P", () => {
      const code = `%
O1001
G10 L10 R5.0
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_p_parameter");
      expect(m.length).toBe(1);
    });

    it("does not flag G10 L50 (no P required)", () => {
      const code = `%
O1001
G10 L50
N100 P1 R5.0
G11
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_p_parameter");
      expect(m.length).toBe(0);
    });
  });

  describe("p_out_of_range", () => {
    it("flags G10 L2 P99 (over max 53)", () => {
      const code = `%
O1001
G10 L2 P99 X0. Y0. Z0.
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "p_out_of_range");
      expect(m.length).toBe(1);
    });

    it("flags G10 L2 P-1", () => {
      const code = `%
O1001
G10 L2 P-1 X0. Y0. Z0.
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "p_out_of_range");
      expect(m.length).toBe(1);
    });

    it("does not flag G10 L2 P6 (G59)", () => {
      const code = `%
O1001
G10 L2 P6 X0. Y0. Z0.
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "p_out_of_range");
      expect(m.length).toBe(0);
    });

    it("does not flag G10 L2 P53 (G54.1 P47)", () => {
      const code = `%
O1001
G10 L2 P53 X0. Y0. Z0.
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "p_out_of_range");
      expect(m.length).toBe(0);
    });

    it("respects custom max_wcs_p", () => {
      const code = `%
O1001
G10 L2 P20 X0. Y0. Z0.
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code, { max_wcs_p: 6 });
      const m = r.issues.filter((i) => i.kind === "p_out_of_range");
      expect(m.length).toBe(1);
    });
  });

  describe("p_zero_overwrites_active", () => {
    it("flags G10 L2 P0", () => {
      const code = `%
O1001
G10 L2 P0 X5. Y10.
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "p_zero_overwrites_active");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag G10 L2 P1", () => {
      const code = `%
O1001
G10 L2 P1 X0. Y0. Z0.
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "p_zero_overwrites_active");
      expect(m.length).toBe(0);
    });
  });

  describe("missing_axis_on_offset_set", () => {
    it("flags G10 L2 P1 with no axis", () => {
      const code = `%
O1001
G10 L2 P1
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_axis_on_offset_set");
      expect(m.length).toBe(1);
    });

    it("does not flag if X present", () => {
      const code = `%
O1001
G10 L2 P1 X100.
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_axis_on_offset_set");
      expect(m.length).toBe(0);
    });
  });

  describe("missing_r_on_tool_length", () => {
    it("flags G10 L10 P1 without R", () => {
      const code = `%
O1001
G10 L10 P1
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_r_on_tool_length");
      expect(m.length).toBe(1);
    });

    it("does not flag G10 L10 P1 R5.0", () => {
      const code = `%
O1001
G10 L10 P1 R5.0
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_r_on_tool_length");
      expect(m.length).toBe(0);
    });
  });

  describe("unbalanced_data_entry_mode", () => {
    it("flags G10 L50 without matching G11", () => {
      const code = `%
O1001
G10 L50
N100 P1 R5.
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "unbalanced_data_entry_mode");
      expect(m.length).toBe(1);
    });

    it("does not flag balanced G10 L50 / G11", () => {
      const code = `%
O1001
G10 L50
N100 P1 R5.
G11
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "unbalanced_data_entry_mode");
      expect(m.length).toBe(0);
    });
  });

  describe("tool_offset_out_of_range", () => {
    it("flags G10 L10 P999 (over 200)", () => {
      const code = `%
O1001
G10 L10 P999 R5.0
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "tool_offset_out_of_range");
      expect(m.length).toBe(1);
    });

    it("flags G10 L11 P0", () => {
      const code = `%
O1001
G10 L11 P0 R0.05
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "tool_offset_out_of_range");
      expect(m.length).toBe(1);
    });

    it("does not flag G10 L10 P50", () => {
      const code = `%
O1001
G10 L10 P50 R5.0
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "tool_offset_out_of_range");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("reports g10_blocks_seen", () => {
      const code = `%
O1001
G10 L2 P1 X0. Y0.
G10 L2 P2 X100. Y0.
G10 L10 P1 R5.0
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      expect(r.summary.g10_blocks_seen).toBe(3);
    });

    it("reports data_entry_opens and closes", () => {
      const code = `%
O1001
G10 L50
N100 P1 R5.
G11
G10 L50
G11
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      expect(r.summary.data_entry_opens).toBe(2);
      expect(r.summary.data_entry_closes).toBe(2);
    });

    it("valid=true when only warnings", () => {
      const code = `%
O1001
G10 L2 P0 X5.
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      expect(r.summary.valid).toBe(true);
      expect(r.summary.warning_count).toBe(1);
    });
  });

  describe("quickCheck", () => {
    it("returns summary", () => {
      const code = `%
O1001
G10 L2 P1 X100. Y200. Z-50.
M30
%`;
      const q = ppG10DataSetValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.g10_blocks).toBe(1);
    });

    it("handles empty code", () => {
      const q = ppG10DataSetValidatorEngine.quickCheck("");
      expect(q.valid).toBe(true);
      expect(q.g10_blocks).toBe(0);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppG10DataSetValidatorEngine.defaultOptions();
      expect(o.max_wcs_p).toBe(53);
      expect(o.max_tool_offsets).toBe(200);
      expect(o.allowed_l_values).toContain(2);
      expect(o.allowed_l_values).toContain(10);
      expect(o.allowed_l_values).toContain(20);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppG10DataSetValidatorEngine.validate("");
      expect(r.summary.g10_blocks_seen).toBe(0);
    });

    it("ignores G10 in comments", () => {
      const code = `%
O1001
(G10 L2 P1 WAS HERE)
G0 X5.
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      expect(r.summary.g10_blocks_seen).toBe(0);
    });

    it("ignores G10.6 (probe cycle)", () => {
      const code = `%
O1001
G10.6 P1 X0. Y0.
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      expect(r.summary.g10_blocks_seen).toBe(0);
    });

    it("handles program with no G10", () => {
      const code = `%
O1001
G0 X5.
G1 X10. F100.
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code);
      expect(r.summary.g10_blocks_seen).toBe(0);
      expect(r.summary.total_issues).toBe(0);
    });

    it("can disable individual checks", () => {
      const code = `%
O1001
G10 L2 P0 X5.
M30
%`;
      const r = ppG10DataSetValidatorEngine.validate(code, {
        check_p_zero: false,
      });
      const m = r.issues.filter((i) => i.kind === "p_zero_overwrites_active");
      expect(m.length).toBe(0);
    });
  });
});
