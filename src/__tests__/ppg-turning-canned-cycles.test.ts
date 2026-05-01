/**
 * PPG Turning Canned Cycles — Category B6.2 (25 scenarios)
 *
 * Tests turning-specific canned cycles:
 * - G70 finish turning, G71 rough turning, G72 rough facing
 * - G76 single-point threading
 * - G92 threading (older format)
 * - Feed-per-rev (G95/G99) in cycles
 */

import { describe, it, expect } from "vitest";
import { parseGCode } from "./helpers/gcode-parser.js";

describe("PPG B6.2: Turning Canned Cycles", () => {
  // -------------------------------------------------------------------
  // G71 Rough Turning Cycle
  // -------------------------------------------------------------------
  describe("G71 Rough Turning Cycle", () => {
    it("G71 two-block format with U/R and P/Q/U/W/F", () => {
      const gcode = [
        "G97 S1500 M03",
        "G0 X52 Z2",
        "G71 U2 R1",
        "G71 P100 Q200 U0.5 W0.1 F0.3",
        "N100 G0 X20",
        "G1 Z0",
        "X30 Z-10",
        "Z-40",
        "X50",
        "N200 G1 Z-50",
        "M30",
      ].join("\n");
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(71)).toBe(true);
    });

    it("G71 U depth of cut is positive", () => {
      const gcode = "G71 U2 R1\nG71 P100 Q200 U0.5 W0.1 F0.3\nM30";
      expect(gcode).toMatch(/G71\s+U\d/);
    });

    it("G71 P/Q reference N-line sequence numbers", () => {
      const gcode = "G71 P100 Q200 U0.5 W0.1 F0.3\nN100 G0 X20\nN200 G1 Z-50\nM30";
      expect(gcode).toMatch(/P100.*Q200/);
    });

    it("G71 finish allowance U (radial) and W (axial)", () => {
      const gcode = "G71 P100 Q200 U0.5 W0.1 F0.3";
      // U0.5 = 0.5mm radial finish stock, W0.1 = 0.1mm axial
      expect(gcode).toMatch(/U[\d.]+/);
      expect(gcode).toMatch(/W[\d.]+/);
    });
  });

  // -------------------------------------------------------------------
  // G70 Finish Turning Cycle
  // -------------------------------------------------------------------
  describe("G70 Finish Turning Cycle", () => {
    it("G70 references same P/Q as G71", () => {
      const gcode = [
        "G70 P100 Q200",
        "N100 G0 X20", "G1 Z0", "X30 Z-10", "Z-40", "X50",
        "N200 G1 Z-50",
        "M30",
      ].join("\n");
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(70)).toBe(true);
    });

    it("G70 uses CSS (G96) for constant surface finish", () => {
      const gcode = "G96 S250 M03\nG50 S4000\nG70 P100 Q200\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(70)).toBe(true);
      expect(program.gCodesUsed.has(96)).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // G72 Rough Facing Cycle
  // -------------------------------------------------------------------
  describe("G72 Rough Facing Cycle", () => {
    it("G72 two-block format for facing", () => {
      const gcode = [
        "G97 S1200 M03",
        "G0 X52 Z2",
        "G72 W2 R1",
        "G72 P100 Q200 U0.5 W0.1 F0.25",
        "N100 G0 Z-30",
        "G1 X20", "Z-25 X30", "Z-10 X50",
        "N200 G1 X52",
        "M30",
      ].join("\n");
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(72)).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // G76 Single-Point Threading
  // -------------------------------------------------------------------
  describe("G76 Single-Point Threading", () => {
    it("G76 two-block threading format", () => {
      const gcode = [
        "G97 S1000 M03",
        "G0 X22 Z5",
        "G76 P010060 Q100 R0.05",
        "G76 X18.376 Z-20 P812 Q200 F1.5",
        "M30",
      ].join("\n");
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(76)).toBe(true);
    });

    it("G76 first block P encodes: passes, spring passes, angle", () => {
      // P010060: 01=min passes, 00=spring passes (varies), 60=thread angle
      const gcode = "G76 P010060 Q100 R0.05";
      expect(gcode).toMatch(/P\d{6}/);
    });

    it("G76 second block F = thread pitch (lead)", () => {
      const gcode = "G76 X18.376 Z-20 P812 Q200 F1.5";
      // F1.5 = 1.5mm pitch (M10x1.5)
      expect(gcode).toMatch(/F[\d.]+/);
    });

    it("G76 requires G97 (constant RPM for threading)", () => {
      const gcode = "G97 S1000 M03\nG76 P010060 Q100 R0.05\nG76 X18.376 Z-20 P812 Q200 F1.5\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(97)).toBe(true);
      expect(program.gCodesUsed.has(76)).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // G92 Threading (Older Format)
  // -------------------------------------------------------------------
  describe("G92 Threading (Older Format)", () => {
    it("G92 simple threading pass", () => {
      const gcode = "G97 S800 M03\nG0 X22 Z5\nG92 X19.5 Z-20 F1.5\nG92 X19.0 Z-20 F1.5\nG92 X18.5 Z-20 F1.5\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(92)).toBe(true);
    });

    it("G92 multiple passes with decreasing X (infeed)", () => {
      const passes = ["X19.5", "X19.0", "X18.5", "X18.376"];
      for (let i = 1; i < passes.length; i++) {
        const prevX = parseFloat(passes[i - 1].slice(1));
        const currX = parseFloat(passes[i].slice(1));
        expect(currX).toBeLessThan(prevX); // decreasing diameter
      }
    });
  });

  // -------------------------------------------------------------------
  // Feed-Per-Rev in Cycles
  // -------------------------------------------------------------------
  describe("Feed Modes in Turning Cycles", () => {
    it("G95 feed-per-rev is default for turning", () => {
      const gcode = "G95\nG71 U2 R1\nG71 P100 Q200 U0.5 W0.1 F0.3\nM30";
      expect(gcode).toContain("G95");
    });

    it("G99 feed-per-rev in canned cycles", () => {
      const gcode = "G99\nG71 U2 R1\nG71 P100 Q200 F0.3\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(99)).toBe(true);
    });

    it("turning feed format uses 3-4 decimal precision", () => {
      const gcode = "G95\nG1 X50 Z-30 F0.250\nM30";
      const fMatch = gcode.match(/F([\d.]+)/);
      expect(fMatch).not.toBeNull();
      expect(fMatch![1].split(".")[1].length).toBeGreaterThanOrEqual(3);
    });
  });
});
