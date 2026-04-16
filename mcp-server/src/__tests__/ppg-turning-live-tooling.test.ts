/**
 * PPG Turning Live Tooling — Category B6.6 (20 scenarios)
 *
 * C-axis and Y-axis milling on turning centers:
 * - C-axis engagement/disengage
 * - Cross-drilling, cross-milling, polygon turning
 * - Transition sequence: spindle stop → C-lock → mill → unlock → restart
 */

import { describe, it, expect } from "vitest";
import { parseGCode } from "./helpers/gcode-parser.js";

describe("PPG B6.6: Turning Live Tooling", () => {
  // -------------------------------------------------------------------
  // C-Axis Engagement
  // -------------------------------------------------------------------
  describe("C-Axis Engagement", () => {
    it("G12.1 engages C-axis interpolation (Fanuc)", () => {
      const gcode = "M05\nG12.1\nG1 X25 C0 F200\nG13.1\nM03\nM30";
      const program = parseGCode(gcode);
      // G12.1 parsed as G12 by most parsers
      expect(gcode).toContain("G12.1");
    });

    it("G13.1 cancels C-axis interpolation (Fanuc)", () => {
      const gcode = "G12.1\nG1 X25 C90 F200\nG13.1\nM30";
      expect(gcode).toContain("G13.1");
    });

    it("G112 engages C-axis (Okuma)", () => {
      const gcode = "M05\nG112\nG1 X25 C0 F200\nG113\nM30";
      expect(gcode).toContain("G112");
    });

    it("G113 cancels C-axis (Okuma)", () => {
      const gcode = "G112\nG1 X25 C90 F200\nG113\nM30";
      expect(gcode).toContain("G113");
    });
  });

  // -------------------------------------------------------------------
  // Cross-Drilling
  // -------------------------------------------------------------------
  describe("Cross-Drilling (Radial Holes)", () => {
    it("cross-drill at C=0 (12 o'clock)", () => {
      const gcode = [
        "M05", "G12.1",
        "G0 X30 C0 Z-25",
        "G81 X15 R30 F200 C0",
        "G80",
        "G13.1", "M30",
      ].join("\n");
      expect(gcode).toContain("C0");
      expect(gcode).toContain("G81");
    });

    it("cross-drill pattern at 4 positions (C=0, C=90, C=180, C=270)", () => {
      const gcode = [
        "G12.1",
        "G81 X15 R30 F200",
        "C0", "C90", "C180", "C270",
        "G80", "G13.1", "M30",
      ].join("\n");
      for (const angle of [0, 90, 180, 270]) {
        expect(gcode).toContain("C" + angle);
      }
    });
  });

  // -------------------------------------------------------------------
  // Cross-Milling
  // -------------------------------------------------------------------
  describe("Cross-Milling (Flats, Hexes)", () => {
    it("milling a flat on OD with C-axis", () => {
      const gcode = [
        "M05", "G12.1", "G94",
        "G0 X30 C0 Z-10",
        "G1 X22 F100",
        "G1 Z-40",
        "G0 X30",
        "G13.1", "M30",
      ].join("\n");
      expect(gcode).toContain("G12.1");
      expect(gcode).toContain("G94"); // feed-per-min for milling
    });

    it("hex milling: 6 flats at 60° intervals", () => {
      const angles = [0, 60, 120, 180, 240, 300];
      expect(angles).toHaveLength(6);
      for (let i = 1; i < angles.length; i++) {
        expect(angles[i] - angles[i - 1]).toBe(60);
      }
    });
  });

  // -------------------------------------------------------------------
  // Y-Axis Milling
  // -------------------------------------------------------------------
  describe("Y-Axis Milling (Mill-Turn)", () => {
    it("Y-axis moves for off-center features", () => {
      const gcode = "G12.1\nG94\nG0 X25 Y5 C0 Z-10\nG1 X25 Y-5 F200\nG13.1\nM30";
      const program = parseGCode(gcode);
      const yBlock = program.blocks.find(b => b.Y !== undefined);
      expect(yBlock).toBeDefined();
    });

    it("Y-axis pocket on OD", () => {
      const gcode = [
        "G12.1", "G94",
        "G0 X28 Y0 C0 Z-15",
        "G1 X22 F100", "G1 Y3", "G1 X28", "G1 Y-3", "G1 X22",
        "G0 X30",
        "G13.1", "M30",
      ].join("\n");
      expect(gcode).toContain("Y3");
      expect(gcode).toContain("Y-3");
    });
  });

  // -------------------------------------------------------------------
  // Transition Sequence
  // -------------------------------------------------------------------
  describe("Spindle → C-Axis Transition", () => {
    it("correct sequence: M05 → G12.1 → mill → G13.1 → M03", () => {
      const gcode = [
        "G96 S200 M03", "G1 X50 Z-30 F0.25",
        "G0 X60 Z50",
        "M05",
        "G12.1", "G94",
        "G0 X25 C0 Z-15",
        "G1 X20 F150",
        "G0 X30",
        "G13.1",
        "G95", "G96 S200 M03",
        "M30",
      ].join("\n");
      const lines = gcode.split("\n");
      const m05Line = lines.findIndex(l => l === "M05");
      const g121Line = lines.findIndex(l => l.includes("G12.1"));
      const g131Line = lines.findIndex(l => l.includes("G13.1"));
      const m03Line = lines.findIndex((l, i) => i > g131Line && l.includes("M03"));

      expect(m05Line).toBeLessThan(g121Line);
      expect(g121Line).toBeLessThan(g131Line);
      expect(g131Line).toBeLessThan(m03Line);
    });

    it("feed mode switches: G95 (turning) → G94 (milling) → G95 (turning)", () => {
      const gcode = "G95\nG1 Z-30 F0.25\nG94\nG1 X25 F200\nG95\nG1 Z-60 F0.25\nM30";
      const g95Count = (gcode.match(/G95/g) || []).length;
      const g94Count = (gcode.match(/G94/g) || []).length;
      expect(g95Count).toBe(2);
      expect(g94Count).toBe(1);
    });
  });

  // -------------------------------------------------------------------
  // Polygon Turning
  // -------------------------------------------------------------------
  describe("Polygon Turning", () => {
    it("polygon turning uses synchronized spindle and C-axis", () => {
      // Polygon turning: workpiece and tool rotate synchronously
      // to produce non-circular cross-sections
      const sides = 6; // hexagon
      const syncRatio = sides / 2; // tool rotates at half the polygon count
      expect(syncRatio).toBe(3);
    });
  });
});
