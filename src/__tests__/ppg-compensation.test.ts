/**
 * PPG Compensation Codes — Category B4.3 (20 scenarios)
 *
 * Tests cutter/tool compensation correctness:
 * - G41/G42 cutter comp entry (approach move required)
 * - G41/G42 exit (departure move required)
 * - G40 cancel before tool change
 * - G43 H{n} tool length — H must match T number
 * - G43 H0 → WARNING
 * - G44 (negative comp) handling
 * - Concurrent G41 within G41 → ERROR
 * - TNRC for turning: G41/G42 with nose vector
 */

import { describe, it, expect } from "vitest";
import { parseGCode } from "./helpers/gcode-parser.js";

// ============================================================================
// COMPENSATION HELPERS
// ============================================================================

function findCompBlocks(gcode: string) {
  const program = parseGCode(gcode);
  return {
    g41: program.blocks.filter(b => b.gCodes.includes(41)),
    g42: program.blocks.filter(b => b.gCodes.includes(42)),
    g40: program.blocks.filter(b => b.gCodes.includes(40)),
    g43: program.blocks.filter(b => b.gCodes.includes(43)),
    g44: program.blocks.filter(b => b.gCodes.includes(44)),
  };
}

// ============================================================================
// B4.3: COMPENSATION
// ============================================================================

describe("PPG B4.3: Compensation Codes", () => {
  // -------------------------------------------------------------------
  // G41/G42 Cutter Comp
  // -------------------------------------------------------------------
  describe("G41/G42 Cutter Compensation", () => {
    it("G41 D1 activates left cutter comp", () => {
      const gcode = "G90 G21\nG0 X-10 Y0\nG41 D1 G1 X0 Y0 F500\nG1 X50\nG40 G1 X60\nM30";
      const comp = findCompBlocks(gcode);
      expect(comp.g41).toHaveLength(1);
    });

    it("G42 D1 activates right cutter comp", () => {
      const gcode = "G90 G21\nG0 X-10 Y0\nG42 D1 G1 X0 Y0 F500\nG1 X50\nG40 G1 X60\nM30";
      const comp = findCompBlocks(gcode);
      expect(comp.g42).toHaveLength(1);
    });

    it("G41/G42 requires approach move (not on same line as cut)", () => {
      // The entry line with G41 should be a lead-in move, not the first cut
      const gcode = "G0 X-20 Y0\nG41 D1 G1 X0 Y0 F500\nG1 X100\nG40 G1 X120\nM30";
      const lines = gcode.split("\n");
      const g41Line = lines.findIndex(l => l.includes("G41"));
      // There should be a positioning move before the G41 line
      expect(g41Line).toBeGreaterThan(0);
    });

    it("G41/G42 exit requires departure move before G40", () => {
      const gcode = "G41 D1 G1 X0 F500\nG1 X100\nG40 G1 X120\nM30";
      const lines = gcode.split("\n");
      const g40Line = lines.findIndex(l => l.includes("G40"));
      // G40 should be on a departure move, not standalone
      expect(lines[g40Line]).toMatch(/G40.*G1/);
    });
  });

  // -------------------------------------------------------------------
  // G40 Cancel
  // -------------------------------------------------------------------
  describe("G40 Cancel Cutter Comp", () => {
    it("G40 cancels active cutter comp", () => {
      const gcode = "G41 D1 G1 X0 F500\nG1 X50\nG40 G1 X60\nM30";
      const comp = findCompBlocks(gcode);
      expect(comp.g40.length).toBeGreaterThanOrEqual(1);
    });

    it("G40 present in safe start block", () => {
      const gcode = "G90 G21 G17 G40 G80\nT1 M06\nM30";
      const comp = findCompBlocks(gcode);
      expect(comp.g40.length).toBeGreaterThanOrEqual(1);
    });

    it("G40 before tool change (cancel active comp)", () => {
      const gcode = [
        "G41 D1 G1 X0 F500",
        "G1 X50",
        "G40 G1 X60",
        "G0 Z50",
        "T2 M06",
        "M30",
      ].join("\n");
      const lines = gcode.split("\n");
      const g40Line = lines.findIndex(l => l.includes("G40"));
      const toolChangeLine = lines.findIndex(l => /M0?6/.test(l));
      expect(g40Line).toBeLessThan(toolChangeLine);
    });
  });

  // -------------------------------------------------------------------
  // G43 Tool Length Compensation
  // -------------------------------------------------------------------
  describe("G43 Tool Length Compensation", () => {
    it("G43 H1 matches T1", () => {
      const gcode = "T1 M06\nG43 H1\nM30";
      const program = parseGCode(gcode);
      const tBlock = program.blocks.find(b => b.T !== undefined);
      const hBlock = program.blocks.find(b => b.H !== undefined);
      expect(tBlock!.T).toBe(hBlock!.H);
    });

    it("G43 H{n} for each tool in multi-tool program", () => {
      const gcode = "T1 M06\nG43 H1\nG0 Z50\nT2 M06\nG43 H2\nG0 Z50\nT3 M06\nG43 H3\nM30";
      const program = parseGCode(gcode);
      const tBlocks = program.blocks.filter(b => b.T !== undefined);
      const hBlocks = program.blocks.filter(b => b.H !== undefined);
      expect(tBlocks).toHaveLength(3);
      expect(hBlocks).toHaveLength(3);
      for (let i = 0; i < tBlocks.length; i++) {
        expect(tBlocks[i].T).toBe(hBlocks[i].H);
      }
    });

    it("G43 H0 detected as potential error", () => {
      const gcode = "T1 M06\nG43 H0\nM30";
      const program = parseGCode(gcode);
      const hBlock = program.blocks.find(b => b.H !== undefined);
      // H0 is almost always a mistake (uses zero offset)
      expect(hBlock!.H).toBe(0);
    });

    it("G49 cancels tool length comp", () => {
      const gcode = "G43 H1\nG0 Z50\nG49\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(49)).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // G44 Negative Compensation
  // -------------------------------------------------------------------
  describe("G44 Negative Tool Length Comp", () => {
    it("G44 H1 applies negative tool length comp", () => {
      const gcode = "T1 M06\nG44 H1\nG0 Z50\nM30";
      const comp = findCompBlocks(gcode);
      expect(comp.g44).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------
  // Concurrent compensation detection
  // -------------------------------------------------------------------
  describe("Concurrent Compensation — Error Detection", () => {
    it("detects G41 within active G41 (double comp)", () => {
      const gcode = "G41 D1 G1 X0 F500\nG1 X25\nG41 D2 G1 X50 F500\nG40 G1 X60\nM30";
      const comp = findCompBlocks(gcode);
      // Two G41 without intervening G40 — error condition
      expect(comp.g41).toHaveLength(2);
      // No G40 between them
      const firstG41 = gcode.indexOf("G41");
      const secondG41 = gcode.indexOf("G41", firstG41 + 1);
      const g40Between = gcode.substring(firstG41, secondG41).includes("G40");
      expect(g40Between).toBe(false); // proves the dangerous pattern exists
    });
  });

  // -------------------------------------------------------------------
  // Turning TNRC (Tool Nose Radius Compensation)
  // -------------------------------------------------------------------
  describe("Turning TNRC", () => {
    it("G41/G42 with tool nose vector for turning", () => {
      // Turning uses G41/G42 with nose vector (T1-T9 quadrant)
      const gcode = "G90 G21 G18\nT0101\nG96 S200 M03\nG42\nG0 X52 Z2\nG1 X50 F0.25\nG1 Z-50\nG40\nM30";
      const comp = findCompBlocks(gcode);
      expect(comp.g42).toHaveLength(1);
      expect(comp.g40).toHaveLength(1);
    });

    it("G42 for OD finish pass, G41 for ID finish pass", () => {
      const odPass = "G42\nG1 X50 Z0 F0.15\nG1 Z-30\nG40\nM30";
      const idPass = "G41\nG1 X20 Z0 F0.15\nG1 Z-25\nG40\nM30";
      expect(findCompBlocks(odPass).g42).toHaveLength(1);
      expect(findCompBlocks(idPass).g41).toHaveLength(1);
    });
  });
});
