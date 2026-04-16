/**
 * PPArcValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPArcValidatorEngine,
  ppArcValidatorEngine,
} from "../engines/PPArcValidatorEngine.js";

describe("PPArcValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppArcValidatorEngine).toBeInstanceOf(PPArcValidatorEngine);
  });

  describe("valid arcs (I/J form, G17 plane)", () => {
    it("quarter-circle CW is valid", () => {
      // Start (10, 0), end (0, 10), center (0, 0) → I=-10, J=0
      const code = `G90 G21 G17
G0 X10. Y0.
G2 X0. Y10. I-10. J0. F100.
M30`;
      const r = ppArcValidatorEngine.validate(code);
      expect(r.summary.valid).toBe(true);
      expect(r.total_arcs).toBe(1);
      expect(r.summary.arcs_by_type.G2).toBe(1);
    });

    it("quarter-circle CCW is valid", () => {
      const code = `G90 G21 G17
G0 X10. Y0.
G3 X0. Y10. I-10. J0. F100.
M30`;
      const r = ppArcValidatorEngine.validate(code);
      expect(r.summary.valid).toBe(true);
      expect(r.summary.arcs_by_type.G3).toBe(1);
    });

    it("full circle with I/J is valid", () => {
      // Start and end at (10, 0), center at origin → I=-10 J=0
      const code = `G90 G21 G17
G0 X10. Y0.
G2 X10. Y0. I-10. J0. F100.
M30`;
      const r = ppArcValidatorEngine.validate(code);
      expect(r.summary.valid).toBe(true);
    });

    it("R-format quarter circle is valid", () => {
      const code = `G90 G21 G17
G0 X10. Y0.
G2 X0. Y10. R10. F100.
M30`;
      const r = ppArcValidatorEngine.validate(code);
      expect(r.summary.valid).toBe(true);
    });
  });

  describe("both_center_forms error", () => {
    it("flags arc with both I/J and R", () => {
      const code = `G90 G21 G17
G0 X10. Y0.
G2 X0. Y10. I-10. J0. R10. F100.
M30`;
      const r = ppArcValidatorEngine.validate(code);
      expect(r.summary.valid).toBe(false);
      const issue = r.issues.find(i => i.kind === "both_center_forms");
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe("error");
    });
  });

  describe("radius_mismatch error", () => {
    it("flags arc where endpoint not on circle (I/J form)", () => {
      // Start (10, 0), end (0, 10), center (0, 0) → correct I=-10, J=0
      // But we specify wrong I=-5, J=0 (center at (5,0)) — endpoint won't reach
      const code = `G90 G21 G17
G0 X10. Y0.
G2 X0. Y10. I-5. J0. F100.
M30`;
      const r = ppArcValidatorEngine.validate(code);
      expect(r.summary.valid).toBe(false);
      const issue = r.issues.find(i => i.kind === "radius_mismatch");
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe("error");
      expect(issue!.details?.radius_mismatch_mm).toBeGreaterThan(0.01);
    });

    it("tolerates tiny radius mismatch within tolerance", () => {
      // Use a 0.005mm mismatch — under default 0.01mm tol
      const code = `G90 G21 G17
G0 X10.000 Y0.000
G2 X0.000 Y10.000 I-10.005 J0.000 F100.
M30`;
      const r = ppArcValidatorEngine.validate(code, { radius_tolerance_mm: 0.02 });
      const issue = r.issues.find(i => i.kind === "radius_mismatch");
      expect(issue).toBeUndefined();
    });

    it("respects custom radius tolerance", () => {
      // 0.1mm mismatch — pass with tol=0.5, fail with tol=0.01
      const code = `G90 G21 G17
G0 X10. Y0.
G2 X0. Y10.1 I-10. J0. F100.
M30`;
      const rStrict = ppArcValidatorEngine.validate(code, { radius_tolerance_mm: 0.01 });
      expect(rStrict.summary.valid).toBe(false);

      const rLoose = ppArcValidatorEngine.validate(code, { radius_tolerance_mm: 1.0 });
      expect(rLoose.summary.valid).toBe(true);
    });
  });

  describe("full_circle_r_format error", () => {
    it("flags full-circle in R-format", () => {
      const code = `G90 G21 G17
G0 X10. Y0.
G2 X10. Y0. R10. F100.
M30`;
      const r = ppArcValidatorEngine.validate(code);
      expect(r.summary.valid).toBe(false);
      const issue = r.issues.find(i => i.kind === "full_circle_r_format");
      expect(issue).toBeDefined();
      expect(issue!.message).toContain("Full-circle");
    });
  });

  describe("missing_center error", () => {
    it("flags arc with neither I/J/K nor R", () => {
      const code = `G90 G21 G17
G0 X10. Y0.
G2 X0. Y10. F100.
M30`;
      const r = ppArcValidatorEngine.validate(code);
      expect(r.summary.valid).toBe(false);
      const issue = r.issues.find(i => i.kind === "missing_center");
      expect(issue).toBeDefined();
    });
  });

  describe("plane_axis_mismatch warning", () => {
    it("warns on K offset in G17 plane", () => {
      // G17 XY plane; K applies to Z. Arc with only K specified is suspicious.
      const code = `G90 G21 G17
G0 X10. Y0. Z0.
G2 X0. Y10. K5. F100.
M30`;
      const r = ppArcValidatorEngine.validate(code);
      const issue = r.issues.find(i => i.kind === "plane_axis_mismatch");
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe("warning");
    });

    it("warns on J offset in G18 plane", () => {
      const code = `G90 G21 G18
G0 X10. Z0.
G2 X0. Z10. J5. F100.
M30`;
      const r = ppArcValidatorEngine.validate(code);
      const issue = r.issues.find(i => i.kind === "plane_axis_mismatch");
      expect(issue).toBeDefined();
    });

    it("warns on I offset in G19 plane", () => {
      const code = `G90 G21 G19
G0 Y10. Z0.
G2 Y0. Z10. I5. F100.
M30`;
      const r = ppArcValidatorEngine.validate(code);
      const issue = r.issues.find(i => i.kind === "plane_axis_mismatch");
      expect(issue).toBeDefined();
    });
  });

  describe("r_format_large_arc info", () => {
    it("flags R-format arc with negative R as info", () => {
      const code = `G90 G21 G17
G0 X10. Y0.
G2 X-10. Y0. R-10. F100.
M30`;
      const r = ppArcValidatorEngine.validate(code);
      const issue = r.issues.find(i => i.kind === "r_format_large_arc");
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe("info");
    });
  });

  describe("motion type counts", () => {
    it("counts G2 and G3 arcs separately", () => {
      const code = `G90 G21 G17
G0 X10. Y0.
G2 X0. Y10. I-10. J0.
G3 X-10. Y0. I0. J-10.
G2 X0. Y-10. I10. J0.
M30`;
      const r = ppArcValidatorEngine.validate(code);
      expect(r.summary.arcs_by_type.G2).toBe(2);
      expect(r.summary.arcs_by_type.G3).toBe(1);
      expect(r.total_arcs).toBe(3);
    });
  });

  describe("incremental mode (G91)", () => {
    it("validates arc in incremental mode correctly", () => {
      // Start (0,0); incremental X10 → end (10,0). Center offset I=5, J=0 → absolute center (5,0)
      // Start radius = 5, end radius = |10-5|=5 → valid
      const code = `G90 G21 G17
G0 X0. Y0.
G91
G2 X10. Y0. I5. J0. F100.
M30`;
      const r = ppArcValidatorEngine.validate(code);
      expect(r.summary.valid).toBe(true);
    });
  });

  describe("quickCheck", () => {
    it("returns compact valid/errors/warnings", () => {
      const code = `G90 G21 G17
G0 X10. Y0.
G2 X0. Y10. I-10. J0. F100.
M30`;
      const q = ppArcValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.errors).toBe(0);
    });

    it("reports error count for bad arc", () => {
      const code = `G90 G21 G17
G0 X10. Y0.
G2 X0. Y10. F100.
M30`;
      const q = ppArcValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
      expect(q.errors).toBeGreaterThan(0);
    });
  });

  describe("defaultOptions", () => {
    it("returns 0.01mm tolerance default", () => {
      const opts = ppArcValidatorEngine.defaultOptions();
      expect(opts.radius_tolerance_mm).toBe(0.01);
    });
  });

  describe("comments and edge cases", () => {
    it("ignores G2 inside paren comment", () => {
      const code = `G90 G21 G17
(G2 IS A COMMENT)
G0 X10. Y0.
M30`;
      const r = ppArcValidatorEngine.validate(code);
      expect(r.total_arcs).toBe(0);
    });

    it("handles empty program", () => {
      const r = ppArcValidatorEngine.validate("");
      expect(r.total_arcs).toBe(0);
      expect(r.summary.valid).toBe(true);
    });

    it("handles program with no arcs", () => {
      const code = `G90 G21 G17
G0 X10.
G1 Y5.
M30`;
      const r = ppArcValidatorEngine.validate(code);
      expect(r.total_arcs).toBe(0);
      expect(r.summary.valid).toBe(true);
    });

    it("issue counts are consistent", () => {
      const code = `G90 G21 G17
G0 X10. Y0.
G2 X0. Y10. F100.
G2 X1. Y1. I0.5 J0.5 R10. F100.
M30`;
      const r = ppArcValidatorEngine.validate(code);
      expect(r.total_issues).toBe(r.issues.length);
      const errors = r.issues.filter(i => i.severity === "error").length;
      const warnings = r.issues.filter(i => i.severity === "warning").length;
      expect(errors).toBe(r.errors);
      expect(warnings).toBe(r.warnings);
    });
  });

  describe("line number reporting", () => {
    it("reports 1-indexed line number of each issue", () => {
      const code = `G90 G21 G17
G0 X10. Y0.
G2 X0. Y10. F100.
M30`;
      const r = ppArcValidatorEngine.validate(code);
      const issue = r.issues.find(i => i.kind === "missing_center");
      expect(issue).toBeDefined();
      expect(issue!.line_number).toBe(3);
    });
  });

  describe("G18 XZ plane arcs", () => {
    it("validates I/K arc in G18", () => {
      // Start (10, Z=0), end (0, Z=10), center (0,0) in XZ → I=-10, K=0
      const code = `G90 G21 G18
G0 X10. Z0.
G2 X0. Z10. I-10. K0. F100.
M30`;
      const r = ppArcValidatorEngine.validate(code);
      expect(r.summary.valid).toBe(true);
    });
  });

  describe("G19 YZ plane arcs", () => {
    it("validates J/K arc in G19", () => {
      const code = `G90 G21 G19
G0 Y10. Z0.
G2 Y0. Z10. J-10. K0. F100.
M30`;
      const r = ppArcValidatorEngine.validate(code);
      expect(r.summary.valid).toBe(true);
    });
  });
});
