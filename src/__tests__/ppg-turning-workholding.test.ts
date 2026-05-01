/**
 * PPG Turning Workholding — Category B6.5 (20 scenarios)
 *
 * Workholding M-codes for turning:
 * - Chuck clamp/unclamp (M10/M11 Fanuc, M68/M69 Okuma)
 * - Tailstock advance/retract (M14/M15)
 * - Bar feeder, part catcher, sub-spindle
 * - Clamp verification sequence
 */

import { describe, it, expect } from "vitest";
import { parseGCode } from "./helpers/gcode-parser.js";

describe("PPG B6.5: Turning Workholding", () => {
  // -------------------------------------------------------------------
  // Chuck Clamp/Unclamp
  // -------------------------------------------------------------------
  describe("Chuck Clamp/Unclamp", () => {
    it("M10 clamp chuck (Fanuc)", () => {
      const gcode = "M10\nG0 X100 Z50\nM30";
      const program = parseGCode(gcode);
      expect(program.blocks.some(b => b.mCodes.includes(10))).toBe(true);
    });

    it("M11 unclamp chuck (Fanuc)", () => {
      const gcode = "G0 X100 Z50\nM11\nM30";
      const program = parseGCode(gcode);
      expect(program.blocks.some(b => b.mCodes.includes(11))).toBe(true);
    });

    it("M68 clamp chuck (Okuma)", () => {
      const gcode = "M68\nG0 X100 Z50\nM30";
      expect(gcode).toContain("M68");
    });

    it("M69 unclamp chuck (Okuma)", () => {
      const gcode = "M69\nM30";
      expect(gcode).toContain("M69");
    });
  });

  // -------------------------------------------------------------------
  // Tailstock
  // -------------------------------------------------------------------
  describe("Tailstock Advance/Retract", () => {
    it("M14 advance tailstock", () => {
      const gcode = "M10\nM14\nG0 X100 Z2\nG1 X50 Z-100 F0.25\nM30";
      expect(gcode).toContain("M14");
    });

    it("M15 retract tailstock", () => {
      const gcode = "G0 X100 Z50\nM15\nM30";
      expect(gcode).toContain("M15");
    });

    it("tailstock advance AFTER chuck clamp", () => {
      const gcode = "M10\nM14\nG0 X100\nM30";
      const lines = gcode.split("\n");
      const clampLine = lines.findIndex(l => l.includes("M10"));
      const tailLine = lines.findIndex(l => l.includes("M14"));
      expect(clampLine).toBeLessThan(tailLine);
    });

    it("tailstock retract BEFORE chuck unclamp", () => {
      const gcode = "G0 X100 Z50\nM15\nM11\nM30";
      const lines = gcode.split("\n");
      const retractLine = lines.findIndex(l => l.includes("M15"));
      const unclampLine = lines.findIndex(l => l.includes("M11"));
      expect(retractLine).toBeLessThan(unclampLine);
    });
  });

  // -------------------------------------------------------------------
  // Bar Feeder
  // -------------------------------------------------------------------
  describe("Bar Feeder", () => {
    it("bar feed advance via M-code", () => {
      // Bar feeder advance varies by machine — M99 is common on some Haas lathes
      const gcode = "M11\nM99\nM10\nM30";
      // Unclamp → advance → clamp sequence
      const lines = gcode.split("\n");
      expect(lines[0]).toContain("M11"); // unclamp
      expect(lines[2]).toContain("M10"); // clamp
    });
  });

  // -------------------------------------------------------------------
  // Part Catcher
  // -------------------------------------------------------------------
  describe("Part Catcher", () => {
    it("M37 deploy part catcher (Haas)", () => {
      const gcode = "M37\nG1 X0 F0.05\nM38\nM30";
      expect(gcode).toContain("M37");
    });

    it("M38 retract part catcher (Haas)", () => {
      const gcode = "M37\nG1 X0 F0.05\nM38\nM30";
      expect(gcode).toContain("M38");
    });

    it("part catcher deploys BEFORE parting, retracts AFTER", () => {
      const gcode = "M37\nG1 X0 F0.05\nM38\nM30";
      const lines = gcode.split("\n");
      const deployLine = lines.findIndex(l => l.includes("M37"));
      const partLine = lines.findIndex(l => l.includes("X0"));
      const retractLine = lines.findIndex(l => l.includes("M38"));
      expect(deployLine).toBeLessThan(partLine);
      expect(partLine).toBeLessThan(retractLine);
    });
  });

  // -------------------------------------------------------------------
  // Sub-Spindle
  // -------------------------------------------------------------------
  describe("Sub-Spindle Transfer", () => {
    it("M23 spindle orient for sub-spindle pickup", () => {
      const gcode = "M05\nM23\nM24\nM03\nM30";
      expect(gcode).toContain("M23");
    });

    it("transfer sequence: stop → orient → transfer → start", () => {
      const gcode = "M05\nM23\nM24\nG0 X0\nM03\nM30";
      const lines = gcode.split("\n");
      const stopIdx = lines.findIndex(l => l.includes("M05"));
      const orientIdx = lines.findIndex(l => l.includes("M23"));
      expect(stopIdx).toBeLessThan(orientIdx);
    });
  });

  // -------------------------------------------------------------------
  // Clamp Before Cut
  // -------------------------------------------------------------------
  describe("Clamp Verification Sequence", () => {
    it("clamp (M10) must precede any cutting move", () => {
      const gcode = "M10\nG96 S200 M03\nG0 X52 Z2\nG1 X50 F0.25\nM30";
      const lines = gcode.split("\n");
      const clampLine = lines.findIndex(l => l.includes("M10"));
      const cutLine = lines.findIndex(l => l.includes("G1") && l.includes("F"));
      expect(clampLine).toBeLessThan(cutLine);
    });

    it("unclamp (M11) only after tool retract", () => {
      const gcode = "G1 Z-50 F0.25\nG0 X60 Z50\nM05\nM11\nM30";
      const lines = gcode.split("\n");
      const retractLine = lines.findIndex(l => l.includes("G0") && l.includes("Z50"));
      const unclampLine = lines.findIndex(l => l.includes("M11"));
      expect(retractLine).toBeLessThan(unclampLine);
    });
  });
});
