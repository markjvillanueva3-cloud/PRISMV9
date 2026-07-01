/**
 * GCodeValidationEngine -- companion contract tests (U-PP-MISSING-ENGINE-TESTS, slot:echo)
 *
 * Pure, deterministic G-code validator (modal-state tracking + arc geometry +
 * envelope + motion-opt + compression + analysis). No I/O, no state -- so every
 * assertion is a hand-traced REFERENCE VALUE (R9: each fails if the rule logic
 * changes), never a presence-only stub.
 *
 * Coverage per method:
 *   validate()         happy + >=4 failure (NO_FEED_RATE, ARC_NO_CENTER,
 *                      ARC_RADIUS_MISMATCH, ARC_R_TOO_SMALL) + >=3 adversarial
 *                      (empty/comment-only, controller-gated UNSUPPORTED, SPINDLE_LEFT_ON)
 *   validateEnvelope() G91 incremental accumulation + travel violation + custom envelope
 *   optimizeMotion()   redundant-move removal + consecutive-rapid combination
 *   compress()         default precision-trim + removeComments/removeBlockNumbers
 *   analyzeProgram()   clean score=100 + >10-consecutive-rapid suggestion + score penalty
 */

import { describe, it, expect } from "vitest";
import { gcodeValidationEngine } from "../engines/GCodeValidationEngine.js";

describe("GCodeValidationEngine", () => {
  describe("validate() -- happy path (clean FANUC program)", () => {
    const CLEAN = `G21 G90 G54
M6 T1
G43 H1 Z50.
M3 S1000
G0 X0 Y0
G1 Z-1 F100
G1 X10
G0 Z50
M5
M9
M30`;

    it("returns valid:true with zero errors and zero warnings", () => {
      const r = gcodeValidationEngine.validate(CLEAN, "FANUC");
      expect(r.valid).toBe(true);
      expect(r.errors).toEqual([]);
      expect(r.warnings).toEqual([]);
    });

    it("computes exact statistics and final modal state", () => {
      const r = gcodeValidationEngine.validate(CLEAN, "FANUC");
      expect(r.statistics.totalLines).toBe(11);
      expect(r.statistics.codeLines).toBe(11);
      expect(r.statistics.comments).toBe(0);
      expect(r.statistics.toolChanges).toBe(1);
      expect(r.statistics.movements.rapid).toBe(2);
      expect(r.statistics.movements.linear).toBe(2);
      expect(r.statistics.movements.arcCW).toBe(0);
      expect(r.modalState.units).toBe(21);
      expect(r.modalState.positioning).toBe(90);
      expect(r.modalState.workOffset).toBe(54);
      expect(r.modalState.currentTool).toBe(1);
      expect(r.modalState.spindleOn).toBe(false); // M5 turned it off
    });
  });

  describe("validate() -- FAILURE MODES", () => {
    it("NO_FEED_RATE: a G1 cut before any F is set", () => {
      const r = gcodeValidationEngine.validate("G21 G90\nG1 X10 Y10", "FANUC");
      expect(r.errors.filter((e) => e.code === "NO_FEED_RATE")).toHaveLength(1);
      expect(r.valid).toBe(false);
    });

    it("ARC_NO_CENTER: a G2 arc with neither I/J nor R", () => {
      const r = gcodeValidationEngine.validate("G21 G90 G54\nM3 S1000\nG1 X0 Y0 F100\nG2 X10 Y10", "FANUC");
      expect(r.errors.filter((e) => e.code === "ARC_NO_CENTER")).toHaveLength(1);
      expect(r.valid).toBe(false);
    });

    it("ARC_RADIUS_MISMATCH: I/J center where start radius != end radius", () => {
      // start (0,0), center (0+3, 0+4)=(3,4) -> startR=5; end (10,0) -> endR=sqrt(65)~8.06
      const r = gcodeValidationEngine.validate("G21 G90 G54\nM3 S1000\nG1 X0 Y0 F100\nG2 X10 Y0 I3 J4", "FANUC");
      const hit = r.errors.filter((e) => e.code === "ARC_RADIUS_MISMATCH");
      expect(hit).toHaveLength(1);
      expect(hit[0].message).toContain("5.0000"); // start radius exactly 5
      expect(r.valid).toBe(false);
    });

    it("ARC_R_TOO_SMALL: R below half the chord length is geometrically impossible", () => {
      // chord (0,0)->(10,0) = 10; R=2 < 5 -> impossible
      const r = gcodeValidationEngine.validate("G21 G90 G54\nM3 S1000\nG1 X0 Y0 F100\nG2 X10 Y0 R2", "FANUC");
      expect(r.errors.filter((e) => e.code === "ARC_R_TOO_SMALL")).toHaveLength(1);
      expect(r.valid).toBe(false);
    });
  });

  describe("validate() -- ADVERSARIAL", () => {
    it("empty / comment-only program is valid with zero code lines", () => {
      const r = gcodeValidationEngine.validate("(PROGRAM HEADER)\n; setup note", "FANUC");
      expect(r.valid).toBe(true);
      expect(r.errors).toEqual([]);
      expect(r.statistics.comments).toBe(2);
      expect(r.statistics.codeLines).toBe(0);
    });

    it("UNSUPPORTED_GCODE is controller-gated (G103 warns on FANUC, not on HAAS)", () => {
      const onFanuc = gcodeValidationEngine.validate("G103 P1", "FANUC");
      expect(onFanuc.warnings.filter((w) => w.code === "UNSUPPORTED_GCODE")).toHaveLength(1);
      expect(onFanuc.valid).toBe(true); // a warning never invalidates

      const onHaas = gcodeValidationEngine.validate("G103 P1", "HAAS");
      expect(onHaas.warnings.filter((w) => w.code === "UNSUPPORTED_GCODE")).toEqual([]);
    });

    it("SPINDLE_LEFT_ON: a program ending with M3 still active warns", () => {
      const r = gcodeValidationEngine.validate("G21 G90\nM3 S1000\nG1 X10 F100", "FANUC");
      expect(r.warnings.filter((w) => w.code === "SPINDLE_LEFT_ON")).toHaveLength(1);
    });
  });

  describe("validateEnvelope() -- G90/G91 modal awareness", () => {
    it("accumulates incremental (G91) moves into absolute extents", () => {
      // G90 origin, then two +100 X deltas under G91 -> absolute X reaches 200
      const r = gcodeValidationEngine.validateEnvelope("G90 G0 X0 Y0 Z0\nG91 X100\nX100");
      expect(r.maxExtents.x).toBe(200);
      expect(r.valid).toBe(true); // 200 < default xMax 762
    });

    it("flags a move outside the default travel envelope", () => {
      const r = gcodeValidationEngine.validateEnvelope("G90 G0 X800 Y0");
      const xv = r.violations.filter((v) => v.axis === "X");
      expect(xv).toHaveLength(1);
      expect(xv[0].value).toBe(800);
      expect(r.valid).toBe(false);
    });

    it("honors a custom (tighter) envelope", () => {
      const tight = { xMin: 0, xMax: 40, yMin: 0, yMax: 40, zMin: -40, zMax: 0 };
      const violated = gcodeValidationEngine.validateEnvelope("G90 X50", tight);
      expect(violated.valid).toBe(false);
      const ok = gcodeValidationEngine.validateEnvelope("G90 X50"); // default xMax 762
      expect(ok.valid).toBe(true);
    });
  });

  describe("optimizeMotion()", () => {
    it("removes an exactly-duplicated rapid move", () => {
      const r = gcodeValidationEngine.optimizeMotion("G00 X10 Y10\nG00 X10 Y10\nG01 X20");
      expect(r.stats.originalLines).toBe(3);
      expect(r.stats.removedRedundant).toBe(1);
    });

    it("combines a run of consecutive rapids into one block", () => {
      const r = gcodeValidationEngine.optimizeMotion("G00 X10\nG00 Y10\nG00 Z5\nG01 X20");
      expect(r.stats.rapidsOptimized).toBe(2); // 3 rapids -> 1 (saves 2)
      expect(r.gcode).toContain("G00 X10 Y10 Z5");
      expect(r.gcode).toContain("G01 X20");
    });
  });

  describe("compress()", () => {
    it("collapses whitespace and rounds >=5-decimal coordinates to the precision", () => {
      const r = gcodeValidationEngine.compress("G01   X10.123456   Y20");
      expect(r.gcode).toBe("G01 X10.1235 Y20"); // default precision 4
      expect(r.compressedSize).toBeLessThan(r.originalSize);
    });

    it("removes comments and block numbers when requested", () => {
      const r = gcodeValidationEngine.compress("N10 G01 X10 (move)", {
        removeComments: true,
        removeBlockNumbers: true,
      });
      expect(r.gcode).toBe("G01 X10");
    });
  });

  describe("analyzeProgram()", () => {
    it("scores a small clean program 100 with no suggestions", () => {
      const r = gcodeValidationEngine.analyzeProgram("G01 X1\nG01 X2");
      expect(r.score).toBe(100);
      expect(r.suggestions).toEqual([]);
      expect(r.metrics.linearMoves).toBe(2);
    });

    it("flags >10 consecutive rapids and applies the score penalty", () => {
      const manyRapids = Array.from({ length: 12 }, (_, i) => `G00 X${i}`).join("\n");
      const r = gcodeValidationEngine.analyzeProgram(manyRapids);
      expect(r.metrics.consecutiveRapids).toBe(11); // 12 rapids -> 11 consecutive pairs
      expect(r.suggestions.filter((s) => s.type === "rapid_opt")).toHaveLength(1);
      expect(r.score).toBe(95); // 100 - 5
    });
  });
});
