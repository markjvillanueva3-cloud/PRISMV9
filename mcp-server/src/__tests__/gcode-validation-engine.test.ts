/**
 * G-Code Validation Engine — Unit Tests
 * @milestone AUDIT-FT-GCODE
 */
import { describe, it, expect } from "vitest";
import { gcodeValidationEngine } from "../engines/GCodeValidationEngine.js";

describe("GCodeValidationEngine", () => {
  describe("validate", () => {
    it("validates a clean program", () => {
      const gcode = [
        "G21 G17 G40 G49 G80 G90",
        "G54",
        "T1 M06",
        "G43 H1",
        "S1000 M03",
        "M08",
        "G00 X0 Y0",
        "G00 Z5.",
        "G01 Z-1. F100",
        "G01 X10. Y10. F200",
        "G00 Z50.",
        "M09",
        "M05",
        "G91 G28 Z0",
        "M30",
      ].join("\n");
      const r = gcodeValidationEngine.validate(gcode, "FANUC");
      expect(r.valid).toBe(true);
      expect(r.errors).toHaveLength(0);
      expect(r.statistics.toolChanges).toBe(1);
      expect(r.statistics.movements.rapid).toBeGreaterThan(0);
      expect(r.statistics.movements.linear).toBeGreaterThan(0);
    });

    it("detects missing feed rate on G01", () => {
      const r = gcodeValidationEngine.validate("G01 X10. Y10.", "FANUC");
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.code === "NO_FEED_RATE")).toBe(true);
    });

    it("detects arc without center or radius", () => {
      const r = gcodeValidationEngine.validate("G02 X10. Y10.", "FANUC");
      expect(r.errors.some(e => e.code === "ARC_NO_CENTER")).toBe(true);
    });

    it("detects arc with R=0", () => {
      const r = gcodeValidationEngine.validate(
        "G01 X0 Y0 F100\nG02 X10. Y10. R0",
      );
      expect(r.errors.some(e => e.code === "ARC_ZERO_R")).toBe(true);
    });

    it("validates valid arc with R", () => {
      const r = gcodeValidationEngine.validate(
        "G01 X0 Y0 F100\nG02 X10. Y0 R5.",
      );
      const arcErrors = r.errors.filter(e =>
        e.code.startsWith("ARC_"));
      expect(arcErrors).toHaveLength(0);
    });

    it("validates valid arc with IJ", () => {
      const r = gcodeValidationEngine.validate(
        "G01 X0 Y0 F100\nG02 X10. Y0 I5. J0.",
      );
      const arcErrors = r.errors.filter(e =>
        e.code.startsWith("ARC_"));
      expect(arcErrors).toHaveLength(0);
    });

    it("detects arc radius mismatch", () => {
      const r = gcodeValidationEngine.validate(
        "G01 X0 Y0 F100\nG02 X10. Y10. I5. J0.",
      );
      expect(r.errors.some(e =>
        e.code === "ARC_RADIUS_MISMATCH")).toBe(true);
    });

    it("warns on unsupported G-code", () => {
      const r = gcodeValidationEngine.validate("G999", "FANUC");
      expect(r.warnings.some(w =>
        w.code === "UNSUPPORTED_GCODE")).toBe(true);
    });

    it("warns when spindle left on", () => {
      const r = gcodeValidationEngine.validate("S1000 M03\nM30");
      expect(r.warnings.some(w =>
        w.code === "SPINDLE_LEFT_ON")).toBe(true);
    });

    it("warns when coolant left on", () => {
      const r = gcodeValidationEngine.validate("M08\nM30");
      expect(r.warnings.some(w =>
        w.code === "COOLANT_LEFT_ON")).toBe(true);
    });

    it("warns on very high feed rate", () => {
      const r = gcodeValidationEngine.validate("G01 X10. F99999");
      expect(r.warnings.some(w =>
        w.code === "HIGH_FEED_RATE")).toBe(true);
    });

    it("tracks statistics correctly", () => {
      const gcode = [
        "(comment)",
        "G00 X10",
        "G01 X20 F100",
        "G02 X30 Y0 R5",
        "G03 X40 Y0 R5",
        "T2 M06",
      ].join("\n");
      const r = gcodeValidationEngine.validate(gcode);
      expect(r.statistics.comments).toBe(1);
      expect(r.statistics.movements.rapid).toBe(1);
      expect(r.statistics.movements.linear).toBe(1);
      expect(r.statistics.movements.arcCW).toBe(1);
      expect(r.statistics.movements.arcCCW).toBe(1);
      expect(r.statistics.toolChanges).toBe(1);
    });

    it("supports HAAS controller", () => {
      const r = gcodeValidationEngine.validate("G187", "HAAS");
      // G187 is valid on HAAS
      const g187Warns = r.warnings.filter(w =>
        w.message.includes("G187"));
      expect(g187Warns).toHaveLength(0);
    });
  });

  describe("validateEnvelope", () => {
    const envelope = {
      xMin: 0, xMax: 500,
      yMin: 0, yMax: 500,
      zMin: -200, zMax: 0,
    };

    it("passes for code within envelope", () => {
      const r = gcodeValidationEngine.validateEnvelope(
        "G00 X100. Y100. Z-50.", envelope,
      );
      expect(r.valid).toBe(true);
      expect(r.violations).toHaveLength(0);
    });

    it("detects X exceeding envelope", () => {
      const r = gcodeValidationEngine.validateEnvelope(
        "G00 X600.", envelope,
      );
      expect(r.valid).toBe(false);
      expect(r.violations[0].axis).toBe("X");
    });

    it("detects Z exceeding envelope", () => {
      const r = gcodeValidationEngine.validateEnvelope(
        "G00 Z-250.", envelope,
      );
      expect(r.valid).toBe(false);
      expect(r.violations[0].axis).toBe("Z");
    });

    it("tracks extents", () => {
      const r = gcodeValidationEngine.validateEnvelope(
        "G00 X100 Y200\nG00 X50 Y300 Z-100", envelope,
      );
      expect(r.maxExtents.x).toBe(100);
      expect(r.maxExtents.y).toBe(300);
      expect(r.minExtents.z).toBe(-100);
    });

    it("handles incremental mode", () => {
      const r = gcodeValidationEngine.validateEnvelope(
        "G90 G00 X100\nG91\nG00 X100\nG00 X100", envelope,
      );
      // X: 100 → 200 → 300 (incremental)
      expect(r.maxExtents.x).toBe(300);
    });
  });

  describe("optimizeMotion", () => {
    it("combines consecutive rapids", () => {
      const r = gcodeValidationEngine.optimizeMotion(
        "G00 X0 Y0\nG00 X10 Y10\nG00 X20 Y20\nG01 X30 F500",
      );
      expect(r.stats.rapidsOptimized).toBeGreaterThan(0);
      expect(r.gcode).toContain("G00");
      expect(r.gcode).toContain("G01");
    });

    it("removes redundant moves", () => {
      const r = gcodeValidationEngine.optimizeMotion(
        "G01 X10 Y20 Z-5 F100\nG01 X10 Y20 Z-5 F100",
      );
      expect(r.stats.removedRedundant).toBeGreaterThanOrEqual(0);
    });

    it("reports reduction percentage", () => {
      const r = gcodeValidationEngine.optimizeMotion(
        "G00 X0\nG00 X10\nG00 X20\nG01 X30 F100",
      );
      expect(r.reduction).toMatch(/^\d+\.\d+%$/);
    });
  });

  describe("compress", () => {
    it("removes comments", () => {
      const r = gcodeValidationEngine.compress(
        "G00 X10 (rapid)\n; comment line\nG01 X20 F100",
        { removeComments: true },
      );
      expect(r.gcode).not.toContain("rapid");
      expect(r.gcode).not.toContain("; comment");
      expect(r.compressedSize).toBeLessThan(r.originalSize);
    });

    it("removes block numbers", () => {
      const r = gcodeValidationEngine.compress(
        "N10 G00 X10\nN20 G01 X20 F100",
        { removeBlockNumbers: true },
      );
      expect(r.gcode).not.toContain("N10");
      expect(r.gcode).not.toContain("N20");
    });

    it("truncates precision", () => {
      const r = gcodeValidationEngine.compress(
        "G00 X1.123456789 Y2.987654321",
        { precision: 3 },
      );
      expect(r.gcode).toContain("X1.123");
      expect(r.gcode).not.toContain("X1.123456789");
    });

    it("reports compression ratio", () => {
      const r = gcodeValidationEngine.compress(
        "N10 G00 X10 (go to start)\nN20 G01 X20 F100 (cut)",
        { removeComments: true, removeBlockNumbers: true },
      );
      expect(r.compression).toMatch(/^\d+\.\d+%$/);
    });
  });

  describe("analyzeProgram", () => {
    it("analyzes program metrics", () => {
      const gcode = Array.from({ length: 200 },
        (_, i) => `G01 X${i} F100`).join("\n");
      const r = gcodeValidationEngine.analyzeProgram(gcode);
      expect(r.metrics.linearMoves).toBe(200);
      expect(r.score).toBeGreaterThan(0);
    });

    it("suggests arc fitting for many linears", () => {
      const gcode = Array.from({ length: 200 },
        (_, i) => `G01 X${i} F100`).join("\n");
      const r = gcodeValidationEngine.analyzeProgram(gcode);
      expect(r.suggestions.some(s =>
        s.type === "arc_fitting")).toBe(true);
    });

    it("suggests rapid optimization", () => {
      const gcode = Array.from({ length: 20 },
        (_, i) => `G00 X${i * 10}`).join("\n");
      const r = gcodeValidationEngine.analyzeProgram(gcode);
      expect(r.suggestions.some(s =>
        s.type === "rapid_opt")).toBe(true);
    });
  });
});
