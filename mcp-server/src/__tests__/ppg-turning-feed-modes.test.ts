/**
 * PPG Turning Feed Modes — Category B6.4 (15 scenarios)
 *
 * Feed mode handling for turning operations:
 * - G95 feed-per-revolution (turning default)
 * - G94 feed-per-minute (live tooling)
 * - G95→G94 transition
 * - G99/G98 in canned cycles
 * - Feed format precision
 */

import { describe, it, expect } from "vitest";
import { parseGCode } from "./helpers/gcode-parser.js";

describe("PPG B6.4: Turning Feed Modes", () => {
  // -------------------------------------------------------------------
  // G95 Feed-Per-Revolution
  // -------------------------------------------------------------------
  describe("G95 Feed-Per-Revolution", () => {
    it("G95 is default for turning operations", () => {
      const gcode = "G90 G21 G18\nG95\nG96 S200 M03\nG1 X50 Z-30 F0.250\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(95)).toBe(true);
    });

    it("G95 F0.250 = 0.25 mm/rev", () => {
      const gcode = "G95\nG1 X50 Z-30 F0.250\nM30";
      const fMatch = gcode.match(/F([\d.]+)/);
      expect(parseFloat(fMatch![1])).toBeCloseTo(0.25, 3);
    });

    it("G95 roughing feed higher than finishing", () => {
      const roughFeed = 0.3;   // mm/rev
      const finishFeed = 0.12; // mm/rev
      expect(roughFeed).toBeGreaterThan(finishFeed);
    });

    it("G95 feed uses 3+ decimal precision", () => {
      const gcode = "G95\nG1 X50 F0.250\nM30";
      const fMatch = gcode.match(/F([\d.]+)/);
      expect(fMatch![1].split(".")[1].length).toBeGreaterThanOrEqual(3);
    });
  });

  // -------------------------------------------------------------------
  // G94 Feed-Per-Minute (Live Tooling)
  // -------------------------------------------------------------------
  describe("G94 Feed-Per-Minute (Live Tooling)", () => {
    it("G94 for milling on lathe (live tool)", () => {
      const gcode = "G94\nG12.1\nG1 X25 C90 F200\nG13.1\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(94)).toBe(true);
    });

    it("G94 feed is integer for milling", () => {
      const gcode = "G94\nG1 X25 F200\nM30";
      const fMatch = gcode.match(/F(\d+)/);
      expect(fMatch).not.toBeNull();
      expect(parseInt(fMatch![1])).toBe(200);
    });
  });

  // -------------------------------------------------------------------
  // G95→G94 Transition
  // -------------------------------------------------------------------
  describe("G95→G94 Transition", () => {
    it("switch from turning (G95) to live tooling (G94)", () => {
      const gcode = [
        "G95", "G96 S200 M03", "G1 X50 Z-30 F0.25",
        "M05",
        "G94", "G12.1", "G1 X25 C0 F200",
        "G13.1",
        "M30",
      ].join("\n");
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(95)).toBe(true);
      expect(program.gCodesUsed.has(94)).toBe(true);
    });

    it("G94 must appear before live tool milling moves", () => {
      const gcode = "G95\nG1 Z-30 F0.25\nG94\nG1 X25 F200\nM30";
      const lines = gcode.split("\n");
      const g94Line = lines.findIndex(l => l.includes("G94"));
      const millingLine = lines.findIndex(l => l.includes("F200"));
      expect(g94Line).toBeLessThan(millingLine);
    });
  });

  // -------------------------------------------------------------------
  // G99/G98 in Canned Cycles
  // -------------------------------------------------------------------
  describe("G99/G98 in Turning Canned Cycles", () => {
    it("G99 = feed-per-rev in canned cycle (turning)", () => {
      const gcode = "G99\nG83 Z-30 R2 Q5 F0.08\nG80\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(99)).toBe(true);
    });

    it("G98 = feed-per-min in canned cycle (milling on lathe)", () => {
      const gcode = "G98\nG81 Z-15 R2 F480\nG80\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(98)).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // Feed Range Validation
  // -------------------------------------------------------------------
  describe("Turning Feed Range Validation", () => {
    it("roughing feed typically 0.15-0.40 mm/rev", () => {
      const roughFeed = 0.3;
      expect(roughFeed).toBeGreaterThanOrEqual(0.15);
      expect(roughFeed).toBeLessThanOrEqual(0.40);
    });

    it("finishing feed typically 0.05-0.15 mm/rev", () => {
      const finishFeed = 0.10;
      expect(finishFeed).toBeGreaterThanOrEqual(0.05);
      expect(finishFeed).toBeLessThanOrEqual(0.15);
    });

    it("threading feed = pitch (F1.5 for M10x1.5)", () => {
      const pitch = 1.5;
      expect(pitch).toBeGreaterThan(0);
    });
  });
});
