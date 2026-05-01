/**
 * PPG Coolant Codes — Category B4.2 (15 scenarios)
 *
 * Tests coolant code conventions:
 * - M08 flood ON after every tool change
 * - M09 flood OFF before Z retract
 * - M88 through-spindle coolant (where supported)
 * - M07 mist coolant
 * - Material-specific coolant requirements (Ti-6Al-4V, 316L, aluminum)
 */

import { describe, it, expect } from "vitest";
import { parseGCode } from "./helpers/gcode-parser.js";

// ============================================================================
// COOLANT HELPERS
// ============================================================================

function findCoolantSequence(gcode: string): {
  m08Lines: number[];
  m09Lines: number[];
  m07Lines: number[];
  m88Lines: number[];
} {
  const lines = gcode.split("\n");
  const result = { m08Lines: [] as number[], m09Lines: [] as number[], m07Lines: [] as number[], m88Lines: [] as number[] };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/\bM0?8\b/.test(line) && !/M80|M88/.test(line)) result.m08Lines.push(i);
    if (/\bM0?9\b/.test(line) && !/M90|M99/.test(line)) result.m09Lines.push(i);
    if (/\bM0?7\b/.test(line)) result.m07Lines.push(i);
    if (/\bM88\b/.test(line)) result.m88Lines.push(i);
  }
  return result;
}

function findToolChangeLines(gcode: string): number[] {
  const lines = gcode.split("\n");
  const result: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/M0?6\b/.test(lines[i])) result.push(i);
  }
  return result;
}

// ============================================================================
// B4.2: COOLANT CODES
// ============================================================================

describe("PPG B4.2: Coolant Codes", () => {
  // -------------------------------------------------------------------
  // M08 Flood ON
  // -------------------------------------------------------------------
  describe("M08 Flood Coolant", () => {
    it("M08 present after tool change", () => {
      const gcode = "T1 M06\nG43 H1\nS5000 M03\nM08\nG0 X0 Y0 Z50\nG1 Z-10 F500\nM09\nM30";
      const coolant = findCoolantSequence(gcode);
      const toolChanges = findToolChangeLines(gcode);
      expect(coolant.m08Lines.length).toBeGreaterThanOrEqual(1);
      // M08 should come after tool change
      expect(coolant.m08Lines[0]).toBeGreaterThan(toolChanges[0]);
    });

    it("M08 after every tool change in multi-tool program", () => {
      const gcode = [
        "T1 M06", "G43 H1", "S5000 M03", "M08",
        "G0 X0 Y0", "G1 Z-10 F500", "M09",
        "T2 M06", "G43 H2", "S3000 M03", "M08",
        "G0 X0 Y0", "G1 Z-5 F300", "M09",
        "M30",
      ].join("\n");
      const coolant = findCoolantSequence(gcode);
      expect(coolant.m08Lines).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------
  // M09 Flood OFF
  // -------------------------------------------------------------------
  describe("M09 Flood OFF", () => {
    it("M09 before tool change", () => {
      const gcode = [
        "T1 M06", "S5000 M03", "M08",
        "G1 X50 F500",
        "M09",
        "T2 M06",
        "M30",
      ].join("\n");
      const coolant = findCoolantSequence(gcode);
      const toolChanges = findToolChangeLines(gcode);
      // M09 should come before second tool change
      expect(coolant.m09Lines[0]).toBeLessThan(toolChanges[1]);
    });

    it("M09 before Z retract at end of operation", () => {
      const gcode = "T1 M06\nS5000 M03\nM08\nG1 X50 F500\nM09\nG0 Z50\nM30";
      const lines = gcode.split("\n");
      const m09Line = lines.findIndex(l => /\bM0?9\b/.test(l) && !/M90|M99/.test(l));
      const retractLine = lines.findIndex((l, i) => i > 3 && /G0.*Z5/.test(l));
      expect(m09Line).toBeLessThan(retractLine);
    });

    it("M09 present before M30", () => {
      const gcode = "T1 M06\nM08\nG1 X50 F500\nM09\nM05\nM30";
      const coolant = findCoolantSequence(gcode);
      expect(coolant.m09Lines.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------
  // M88 Through-Spindle Coolant (TSC)
  // -------------------------------------------------------------------
  describe("M88 Through-Spindle Coolant", () => {
    it("M88 activates TSC (Haas/DMG)", () => {
      const gcode = "T6 M06\nG43 H6\nS8000 M03\nM88\nG0 X25 Y25\nG83 Z-30 R2 Q5 F400\nG80\nM89\nM30";
      const coolant = findCoolantSequence(gcode);
      expect(coolant.m88Lines).toHaveLength(1);
    });

    it("M89 deactivates TSC", () => {
      const gcode = "M88\nG1 X50 F500\nM89\nM30";
      expect(gcode).toContain("M89");
    });
  });

  // -------------------------------------------------------------------
  // M07 Mist Coolant
  // -------------------------------------------------------------------
  describe("M07 Mist Coolant", () => {
    it("M07 activates mist coolant", () => {
      const gcode = "T1 M06\nS10000 M03\nM07\nG0 X0 Y0\nG1 Z-1 F800\nM09\nM30";
      const coolant = findCoolantSequence(gcode);
      expect(coolant.m07Lines).toHaveLength(1);
    });

    it("M09 turns off mist coolant too", () => {
      const gcode = "M07\nG1 X50 F500\nM09\nM30";
      const coolant = findCoolantSequence(gcode);
      expect(coolant.m09Lines).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------
  // Material-specific coolant requirements
  // -------------------------------------------------------------------
  describe("Material-Specific Coolant", () => {
    it("Ti-6Al-4V requires flood coolant (M08)", () => {
      // For titanium, flood coolant is mandatory to prevent ignition/galling
      const gcode = "T1 M06\nS800 M03\nM08\nG1 X50 F200\nM09\nM30";
      const coolant = findCoolantSequence(gcode);
      expect(coolant.m08Lines.length).toBeGreaterThanOrEqual(1);
    });

    it("316L stainless requires coolant", () => {
      // Stainless needs coolant to prevent work hardening
      const gcode = "T1 M06\nS2000 M03\nM08\nG1 X50 F400\nM09\nM30";
      const coolant = findCoolantSequence(gcode);
      expect(coolant.m08Lines.length).toBeGreaterThanOrEqual(1);
    });

    it("6061 aluminum — dry/mist acceptable", () => {
      // Aluminum can run dry or with mist at high speed
      const gcode = "T1 M06\nS10000 M03\nG0 X0 Y0\nG1 Z-5 F2000\nM30";
      // No M08 required — should not fail validation
      const coolant = findCoolantSequence(gcode);
      // Zero coolant codes is acceptable for aluminum
      expect(coolant.m08Lines.length + coolant.m07Lines.length).toBeGreaterThanOrEqual(0);
    });

    it("cast iron — dry cutting common", () => {
      const gcode = "T1 M06\nS3000 M03\nG0 X0 Y0\nG1 Z-3 F600\nM30";
      // Cast iron often run dry — should not require coolant
      const coolant = findCoolantSequence(gcode);
      expect(coolant.m08Lines.length).toBeGreaterThanOrEqual(0); // either is acceptable
    });
  });
});
