/**
 * PPCutterCompValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPCutterCompValidatorEngine,
  ppCutterCompValidatorEngine,
} from "../engines/PPCutterCompValidatorEngine.js";

describe("PPCutterCompValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppCutterCompValidatorEngine).toBeInstanceOf(PPCutterCompValidatorEngine);
  });

  describe("comp_without_d", () => {
    it("flags G41 with no D and no modal D", () => {
      const code = `%
O1001
S2000 M3
G0 X0. Y0. Z5.
G1 G41 X10. Y10. F100.
G1 Y50.
G40
M30
%`;
      const r = ppCutterCompValidatorEngine.validate(code);
      const c = r.issues.filter((i) => i.kind === "comp_without_d");
      expect(c.length).toBe(1);
      expect(c[0].severity).toBe("error");
    });

    it("does not flag G41 with D-word", () => {
      const code = `%
O1001
S2000 M3
G0 X0. Y0. Z5.
G1 G41 D1 X10. Y10. F100.
G1 Y50.
G40
M30
%`;
      const r = ppCutterCompValidatorEngine.validate(code);
      const c = r.issues.filter((i) => i.kind === "comp_without_d");
      expect(c.length).toBe(0);
    });

    it("does not flag when D set earlier", () => {
      const code = `%
O1001
D1
S2000 M3
G0 X0. Y0. Z5.
G1 G41 X10. Y10. F100.
G40
M30
%`;
      const r = ppCutterCompValidatorEngine.validate(code);
      const c = r.issues.filter((i) => i.kind === "comp_without_d");
      expect(c.length).toBe(0);
    });

    it("flags G42 with no D", () => {
      const code = `%
O1001
S2000 M3
G0 X0. Y0. Z5.
G1 G42 X10. Y10. F100.
G40
M30
%`;
      const r = ppCutterCompValidatorEngine.validate(code);
      const c = r.issues.filter((i) => i.kind === "comp_without_d");
      expect(c.length).toBe(1);
    });
  });

  describe("comp_activation_without_linear", () => {
    it("flags G41 on G0 rapid block", () => {
      const code = `%
O1001
S2000 M3
G0 X0. Y0. Z5.
G0 G41 D1 X10. Y10.
G1 Y50. F100.
G40
M30
%`;
      const r = ppCutterCompValidatorEngine.validate(code);
      const a = r.issues.filter((i) => i.kind === "comp_activation_without_linear");
      expect(a.length).toBe(1);
      expect(a[0].severity).toBe("warning");
    });

    it("does not flag G41 on G1 block with XY", () => {
      const code = `%
O1001
S2000 M3
G0 X0. Y0. Z5.
G1 G41 D1 X10. Y10. F100.
G40
M30
%`;
      const r = ppCutterCompValidatorEngine.validate(code);
      const a = r.issues.filter((i) => i.kind === "comp_activation_without_linear");
      expect(a.length).toBe(0);
    });

    it("flags G41 standalone with no motion", () => {
      const code = `%
O1001
S2000 M3
G41 D1
G1 X10. F100.
G40
M30
%`;
      const r = ppCutterCompValidatorEngine.validate(code);
      const a = r.issues.filter((i) => i.kind === "comp_activation_without_linear");
      expect(a.length).toBe(1);
    });
  });

  describe("comp_cancel_without_retract", () => {
    it("flags G40 at cutting Z", () => {
      const code = `%
O1001
S2000 M3
G0 X0. Y0. Z5.
G1 G41 D1 X10. Y10. F100.
G1 Z-5. F50.
G40
M30
%`;
      const r = ppCutterCompValidatorEngine.validate(code);
      const c = r.issues.filter((i) => i.kind === "comp_cancel_without_retract");
      expect(c.length).toBe(1);
      expect(c[0].severity).toBe("warning");
    });

    it("does not flag G40 after retract", () => {
      const code = `%
O1001
S2000 M3
G0 X0. Y0. Z5.
G1 G41 D1 X10. Y10. F100.
G1 Z-5. F50.
G0 Z25.
G40
M30
%`;
      const r = ppCutterCompValidatorEngine.validate(code);
      const c = r.issues.filter((i) => i.kind === "comp_cancel_without_retract");
      expect(c.length).toBe(0);
    });
  });

  describe("conflicting_comp_same_line", () => {
    it("flags G41 G42 on same line", () => {
      const code = `%
O1001
S2000 M3
G1 G41 G42 D1 X10. F100.
M30
%`;
      const r = ppCutterCompValidatorEngine.validate(code);
      const c = r.issues.filter((i) => i.kind === "conflicting_comp_same_line");
      expect(c.length).toBe(1);
      expect(c[0].severity).toBe("error");
    });

    it("flags G40 G41 on same line", () => {
      const code = `%
O1001
S2000 M3
G1 G40 G41 D1 X10. F100.
M30
%`;
      const r = ppCutterCompValidatorEngine.validate(code);
      const c = r.issues.filter((i) => i.kind === "conflicting_comp_same_line");
      expect(c.length).toBe(1);
    });
  });

  describe("comp_redundant", () => {
    it("flags G41 while G41 active", () => {
      const code = `%
O1001
S2000 M3
G0 X0. Y0. Z5.
G1 G41 D1 X10. Y10. F100.
G1 G41 Y50.
G40
M30
%`;
      const r = ppCutterCompValidatorEngine.validate(code);
      const c = r.issues.filter((i) => i.kind === "comp_redundant");
      expect(c.length).toBe(1);
      expect(c[0].severity).toBe("info");
    });
  });

  describe("comp_change_without_g40", () => {
    it("flags G41 → G42 without G40", () => {
      const code = `%
O1001
S2000 M3
G0 X0. Y0. Z5.
G1 G41 D1 X10. Y10. F100.
G1 G42 Y50.
G40
M30
%`;
      const r = ppCutterCompValidatorEngine.validate(code);
      const c = r.issues.filter((i) => i.kind === "comp_change_without_g40");
      expect(c.length).toBe(1);
      expect(c[0].severity).toBe("warning");
    });

    it("does not flag G41 → G40 → G42", () => {
      const code = `%
O1001
S2000 M3
G0 X0. Y0. Z5.
G1 G41 D1 X10. Y10. F100.
G1 Y50.
G0 Z25.
G40
G1 G42 D1 X20. Y20. F100.
G0 Z25.
G40
M30
%`;
      const r = ppCutterCompValidatorEngine.validate(code);
      const c = r.issues.filter((i) => i.kind === "comp_change_without_g40");
      expect(c.length).toBe(0);
    });
  });

  describe("comp_left_at_program_end", () => {
    it("flags M30 with G41 active", () => {
      const code = `%
O1001
S2000 M3
G0 X0. Y0. Z25.
G1 G41 D1 X10. Y10. F100.
G1 Y50.
M30
%`;
      const r = ppCutterCompValidatorEngine.validate(code);
      const c = r.issues.filter((i) => i.kind === "comp_left_at_program_end");
      expect(c.length).toBe(1);
      expect(c[0].severity).toBe("warning");
    });

    it("does not flag M30 after G40", () => {
      const code = `%
O1001
S2000 M3
G0 X0. Y0. Z25.
G1 G41 D1 X10. Y10. F100.
G0 Z25.
G40
M30
%`;
      const r = ppCutterCompValidatorEngine.validate(code);
      const c = r.issues.filter((i) => i.kind === "comp_left_at_program_end");
      expect(c.length).toBe(0);
    });

    it("warn_missing_final_g40=false suppresses", () => {
      const code = `%
O1001
S2000 M3
G0 Z25.
G1 G41 D1 X10. Y10. F100.
M30
%`;
      const r = ppCutterCompValidatorEngine.validate(code, {
        warn_missing_final_g40: false,
      });
      const c = r.issues.filter((i) => i.kind === "comp_left_at_program_end");
      expect(c.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("counts G40/G41/G42", () => {
      const code = `%
O1001
S2000 M3
G0 Z25.
G1 G41 D1 X10. Y10. F100.
G40
G1 G42 D2 X20. Y20.
G40
M30
%`;
      const r = ppCutterCompValidatorEngine.validate(code);
      expect(r.summary.g41_count).toBe(1);
      expect(r.summary.g42_count).toBe(1);
      expect(r.summary.g40_count).toBe(2);
    });

    it("tracks distinct D offsets used", () => {
      const code = `%
O1001
S2000 M3
G0 Z25.
G1 G41 D1 X10. Y10. F100.
G0 Z25.
G40
G1 G42 D2 X20. Y20.
G0 Z25.
G40
M30
%`;
      const r = ppCutterCompValidatorEngine.validate(code);
      expect(r.summary.d_offsets_used).toEqual([1, 2]);
    });

    it("records final_mode", () => {
      const code = `%
O1001
G0 Z25.
G1 G41 D1 X10. F100.
G0 Z25.
G40
M30
%`;
      const r = ppCutterCompValidatorEngine.validate(code);
      expect(r.summary.final_mode).toBe("G40");
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean program", () => {
      const code = `%
O1001
S2000 M3
G0 X0. Y0. Z25.
G1 G41 D1 X10. Y10. F100.
G0 Z25.
G40
M30
%`;
      const q = ppCutterCompValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.final_mode).toBe("G40");
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppCutterCompValidatorEngine.defaultOptions();
      expect(o.safe_z_mm).toBeCloseTo(5);
      expect(o.require_linear_activation).toBe(true);
      expect(o.warn_missing_final_g40).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppCutterCompValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
      expect(r.summary.final_mode).toBeNull();
    });

    it("handles program with no comp codes", () => {
      const code = `%
O1001
S2000 M3
G1 X10. F100.
M30
%`;
      const r = ppCutterCompValidatorEngine.validate(code);
      expect(r.summary.g40_count).toBe(0);
      expect(r.summary.final_mode).toBeNull();
    });

    it("ignores G41 inside comments", () => {
      const code = `%
O1001
(G41 mentioned in comment)
G1 X10. F100.
M30
%`;
      const r = ppCutterCompValidatorEngine.validate(code);
      expect(r.summary.g41_count).toBe(0);
    });
  });
});
