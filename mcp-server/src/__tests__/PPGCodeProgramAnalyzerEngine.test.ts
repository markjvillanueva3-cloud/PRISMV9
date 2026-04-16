/**
 * PPGCodeProgramAnalyzerEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPGCodeProgramAnalyzerEngine,
  ppGCodeProgramAnalyzerEngine,
} from "../engines/PPGCodeProgramAnalyzerEngine.js";

const FANUC_3AXIS = `%
O1001
(POCKET ROUGHING)
G90 G21 G17 G40 G80 G49
G91 G28 Z0
T1 M6
G54
G43 H1 Z50
S6000 M3
M8
G0 X0 Y0
G0 Z5
G1 Z-3 F300
G1 X50 Y0 F600
G1 X50 Y30
G2 X30 Y50 I-20 J0
G1 X0 Y50
G1 X0 Y0
G0 Z5
M9
M5
G91 G28 Z0
T2 M6
G43 H2 Z50
S12000 M3
M8
G0 X10 Y10
G0 Z2
G1 Z-1 F100
G1 X40
G1 Y25
G0 Z50
M9
M5
G91 G28 Z0
M30
%`;

const SIEMENS_5AXIS = `; SIEMENS 840D 5-AXIS
DEF REAL _DEPTH=5.0
G54
TRAORI
T1 D1
M6
S8000 M3
M8
G90 G0 X0 Y0 Z50
PLANE SPATIAL(10, 0, 30)
G1 Z0 F200
CYCLE81(0, 0, 2, -5)
G0 Z50
TRAFOOF
M9
M5
M30`;

const EMPTY_PROGRAM = `(EMPTY TEST)\n`;

describe("PPGCodeProgramAnalyzerEngine", () => {
  it("exports singleton", () => {
    expect(ppGCodeProgramAnalyzerEngine).toBeInstanceOf(PPGCodeProgramAnalyzerEngine);
  });

  describe("analyze - Fanuc 3-axis", () => {
    it("returns full report", () => {
      const r = ppGCodeProgramAnalyzerEngine.analyze(FANUC_3AXIS);
      expect(r).toBeDefined();
      expect(r.line_count).toBeGreaterThan(20);
      expect(r.block_count).toBeGreaterThan(10);
    });

    it("detects Fanuc controller family", () => {
      const r = ppGCodeProgramAnalyzerEngine.analyze(FANUC_3AXIS);
      expect(r.controller.inferred_family).toBe("fanuc");
    });

    it("counts tool changes", () => {
      const r = ppGCodeProgramAnalyzerEngine.analyze(FANUC_3AXIS);
      expect(r.tool_changes).toBeGreaterThanOrEqual(2);
      expect(r.unique_tools).toBeGreaterThanOrEqual(2);
    });

    it("detects operations", () => {
      const r = ppGCodeProgramAnalyzerEngine.analyze(FANUC_3AXIS);
      expect(r.operations.count).toBeGreaterThan(0);
      expect(r.operations.types.length).toBeGreaterThan(0);
    });

    it("not 5-axis", () => {
      const r = ppGCodeProgramAnalyzerEngine.analyze(FANUC_3AXIS);
      expect(r.operations.has_5axis).toBe(false);
    });

    it("assigns complexity level", () => {
      const r = ppGCodeProgramAnalyzerEngine.analyze(FANUC_3AXIS);
      expect(["simple", "moderate", "complex", "expert"]).toContain(r.operations.complexity);
    });

    it("quality score is reasonable", () => {
      const r = ppGCodeProgramAnalyzerEngine.analyze(FANUC_3AXIS);
      expect(r.quality.score).toBeGreaterThan(0);
      expect(r.quality.score).toBeLessThanOrEqual(1);
    });

    it("has strengths listed", () => {
      const r = ppGCodeProgramAnalyzerEngine.analyze(FANUC_3AXIS);
      expect(r.quality.strengths.length).toBeGreaterThan(0);
    });

    it("includes recommendations", () => {
      const r = ppGCodeProgramAnalyzerEngine.analyze(FANUC_3AXIS);
      expect(r.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("analyze - Siemens 5-axis", () => {
    it("detects Siemens controller", () => {
      const r = ppGCodeProgramAnalyzerEngine.analyze(SIEMENS_5AXIS);
      expect(r.controller.inferred_family).toBe("siemens");
    });

    it("detects 5-axis", () => {
      const r = ppGCodeProgramAnalyzerEngine.analyze(SIEMENS_5AXIS);
      expect(r.operations.has_5axis).toBe(true);
    });

    it("recommends TCPC verification for 5-axis", () => {
      const r = ppGCodeProgramAnalyzerEngine.analyze(SIEMENS_5AXIS);
      expect(r.recommendations.some(s => s.includes("TCPC") || s.includes("5-axis"))).toBe(true);
    });

    it("detects canned cycles (CYCLE81)", () => {
      const r = ppGCodeProgramAnalyzerEngine.analyze(SIEMENS_5AXIS);
      expect(r.operations.count).toBeGreaterThan(0);
    });
  });

  describe("analyze - empty/minimal", () => {
    it("handles empty program gracefully", () => {
      const r = ppGCodeProgramAnalyzerEngine.analyze(EMPTY_PROGRAM);
      expect(r).toBeDefined();
      expect(r.tool_changes).toBe(0);
      expect(r.quality.issues.length).toBeGreaterThan(0);
    });

    it("flags missing feed rate in minimal programs", () => {
      const r = ppGCodeProgramAnalyzerEngine.analyze(EMPTY_PROGRAM);
      expect(r.quality.issues.some(i => i.includes("feed"))).toBe(true);
    });
  });

  describe("analyze - source file tracking", () => {
    it("preserves source file in report", () => {
      const r = ppGCodeProgramAnalyzerEngine.analyze(FANUC_3AXIS, "O1001.nc");
      expect(r.source_file).toBe("O1001.nc");
    });
  });

  describe("similar_templates", () => {
    it("finds matching templates from library", () => {
      const r = ppGCodeProgramAnalyzerEngine.analyze(FANUC_3AXIS);
      expect(Array.isArray(r.similar_templates)).toBe(true);
      // Should find at least the Fanuc templates
      expect(r.similar_templates.length).toBeGreaterThan(0);
    });

    it("similarity scores are normalized", () => {
      const r = ppGCodeProgramAnalyzerEngine.analyze(FANUC_3AXIS);
      for (const t of r.similar_templates) {
        expect(t.similarity).toBeGreaterThanOrEqual(0);
        expect(t.similarity).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("toolpath_classifications", () => {
    it("classifies toolpaths per operation", () => {
      const r = ppGCodeProgramAnalyzerEngine.analyze(FANUC_3AXIS);
      expect(Array.isArray(r.toolpath_classifications)).toBe(true);
    });

    it("includes inferred strategy names", () => {
      const r = ppGCodeProgramAnalyzerEngine.analyze(FANUC_3AXIS);
      for (const c of r.toolpath_classifications) {
        expect(c.inferred_strategy.length).toBeGreaterThan(0);
      }
    });
  });

  describe("risks", () => {
    it("detects low quality risk", () => {
      const r = ppGCodeProgramAnalyzerEngine.analyze(EMPTY_PROGRAM);
      expect(r.risks.some(risk => risk.category === "quality")).toBe(true);
    });

    it("high spindle speed triggers warning", () => {
      const highSpeed = FANUC_3AXIS.replace(/S12000/g, "S25000");
      const r = ppGCodeProgramAnalyzerEngine.analyze(highSpeed);
      expect(r.risks.some(risk => risk.category === "machine" && risk.message.includes("spindle"))).toBe(true);
    });
  });

  describe("analyzeBatch", () => {
    it("processes multiple programs", () => {
      const results = ppGCodeProgramAnalyzerEngine.analyzeBatch([
        { gcode: FANUC_3AXIS, source: "a.nc" },
        { gcode: SIEMENS_5AXIS, source: "b.mpf" },
      ]);
      expect(results.length).toBe(2);
      expect(results[0].controller.inferred_family).toBe("fanuc");
      expect(results[1].controller.inferred_family).toBe("siemens");
    });
  });

  describe("compare", () => {
    it("identifies differences between programs", () => {
      const cmp = ppGCodeProgramAnalyzerEngine.compare(FANUC_3AXIS, SIEMENS_5AXIS);
      expect(cmp.differences.length).toBeGreaterThan(0);
      expect(cmp.differences.some(d => d.includes("Controller"))).toBe(true);
      expect(cmp.differences.some(d => d.includes("5-axis"))).toBe(true);
    });

    it("returns both reports", () => {
      const cmp = ppGCodeProgramAnalyzerEngine.compare(FANUC_3AXIS, SIEMENS_5AXIS);
      expect(cmp.report_a).toBeDefined();
      expect(cmp.report_b).toBeDefined();
    });

    it("identical programs have minimal differences", () => {
      const cmp = ppGCodeProgramAnalyzerEngine.compare(FANUC_3AXIS, FANUC_3AXIS);
      expect(cmp.differences.length).toBe(0);
    });
  });
});
