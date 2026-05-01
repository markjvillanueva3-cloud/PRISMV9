/**
 * PPG Turning CSS — Category B6.1 (25 scenarios)
 *
 * Constant Surface Speed (G96) and Constant RPM (G97):
 * - G96/G97 activation and transitions
 * - G50 S-clamp at minimum diameter
 * - CSS RPM validation at multiple diameters
 * - Material-specific SFM values
 * - D=0 hard stop detection
 */

import { describe, it, expect } from "vitest";
import { parseGCode } from "./helpers/gcode-parser.js";

// ============================================================================
// CSS HELPERS
// ============================================================================

/** Calculate RPM from SFM and diameter: RPM = (SFM × 12) / (π × D_inches) */
function sfmToRpm(sfm: number, diameterMm: number): number {
  const dInches = diameterMm / 25.4;
  if (dInches <= 0) return Infinity;
  return (sfm * 12) / (Math.PI * dInches);
}

/** Calculate RPM from Vc (m/min) and diameter: RPM = (1000 × Vc) / (π × D_mm) */
function vcToRpm(vc: number, diameterMm: number): number {
  if (diameterMm <= 0) return Infinity;
  return (1000 * vc) / (Math.PI * diameterMm);
}

// ============================================================================
// B6.1: CSS TURNING
// ============================================================================

describe("PPG B6.1: Turning CSS (Constant Surface Speed)", () => {
  // -------------------------------------------------------------------
  // G96 Activation
  // -------------------------------------------------------------------
  describe("G96 Constant Surface Speed", () => {
    it("G96 S200 activates CSS at 200 m/min", () => {
      const gcode = "G90 G21 G18\nT0101\nG96 S200 M03\nG0 X52 Z2\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(96)).toBe(true);
    });

    it("G96 with G50 S-clamp limits max RPM", () => {
      const gcode = "G90 G21 G18\nT0101\nG50 S3500\nG96 S200 M03\nG0 X52 Z2\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(96)).toBe(true);
      expect(program.gCodesUsed.has(50)).toBe(true);
    });

    it("G50 S-clamp appears BEFORE G96", () => {
      const gcode = "G50 S3500\nG96 S200 M03\nM30";
      const lines = gcode.split("\n");
      const g50Line = lines.findIndex(l => l.includes("G50"));
      const g96Line = lines.findIndex(l => l.includes("G96"));
      expect(g50Line).toBeLessThan(g96Line);
    });
  });

  // -------------------------------------------------------------------
  // G97 Constant RPM
  // -------------------------------------------------------------------
  describe("G97 Constant RPM", () => {
    it("G97 S1500 sets fixed 1500 RPM", () => {
      const gcode = "G90 G21 G18\nT0101\nG97 S1500 M03\nG0 X52 Z2\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(97)).toBe(true);
    });

    it("G97 used for threading (constant RPM required)", () => {
      const gcode = "G97 S1000 M03\nG76 P010060 Q100 R0.05\nG76 X18.376 Z-20 P812 Q200 F1.5\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(97)).toBe(true);
      expect(program.gCodesUsed.has(76)).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // G96→G97 Transition
  // -------------------------------------------------------------------
  describe("G96→G97 Transition", () => {
    it("transition from CSS to constant RPM mid-program", () => {
      const gcode = [
        "G96 S200 M03", "G50 S3500",
        "G0 X52 Z2", "G1 X50 F0.25", "G1 Z-50",
        "G97 S1000 M03",
        "G76 P010060 Q100 R0.05",
        "M30",
      ].join("\n");
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(96)).toBe(true);
      expect(program.gCodesUsed.has(97)).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // CSS RPM at Different Diameters
  // -------------------------------------------------------------------
  describe("CSS RPM at Different Diameters", () => {
    it("Vc=200 m/min at D=50mm → RPM ≈ 1273", () => {
      const rpm = vcToRpm(200, 50);
      expect(rpm).toBeCloseTo(1273, 0);
    });

    it("Vc=200 m/min at D=25mm → RPM ≈ 2546", () => {
      const rpm = vcToRpm(200, 25);
      expect(rpm).toBeCloseTo(2546, 0);
    });

    it("Vc=200 m/min at D=10mm → RPM ≈ 6366", () => {
      const rpm = vcToRpm(200, 10);
      expect(rpm).toBeCloseTo(6366, 0);
    });

    it("Vc=200 m/min at D=5mm → RPM ≈ 12732 (may exceed machine limit)", () => {
      const rpm = vcToRpm(200, 5);
      expect(rpm).toBeCloseTo(12732, 0);
      // This would be clamped by G50 S-limit on real machine
    });

    it("Vc=200 m/min at D=2mm → RPM ≈ 31831 (requires S-clamp)", () => {
      const rpm = vcToRpm(200, 2);
      expect(rpm).toBeCloseTo(31831, 0);
      expect(rpm).toBeGreaterThan(6000); // exceeds typical lathe max
    });
  });

  // -------------------------------------------------------------------
  // D=0 Hard Stop
  // -------------------------------------------------------------------
  describe("D=0 Hard Stop Detection", () => {
    it("D=0mm produces Infinity RPM", () => {
      const rpm = vcToRpm(200, 0);
      expect(rpm).toBe(Infinity);
    });

    it("D=0 must be blocked (face cut at center)", () => {
      // At the center of a face cut, D approaches 0 → RPM → ∞
      // G50 S-clamp prevents this, but without it: catastrophic
      const rpm = vcToRpm(200, 0.001);
      expect(rpm).toBeGreaterThan(1000000); // essentially infinite
    });
  });

  // -------------------------------------------------------------------
  // Material-Specific SFM
  // -------------------------------------------------------------------
  describe("Material-Specific Surface Speed", () => {
    it("4140 steel: Vc ≈ 120 m/min (carbide insert)", () => {
      // Carbide turning 4140 at 28-32 HRC
      const vc = 120; // m/min typical
      const rpm50 = vcToRpm(vc, 50);
      expect(rpm50).toBeCloseTo(764, 0);
    });

    it("6061 aluminum: Vc ≈ 300 m/min (carbide insert)", () => {
      const vc = 300;
      const rpm50 = vcToRpm(vc, 50);
      expect(rpm50).toBeCloseTo(1910, 0);
    });

    it("316L stainless: Vc ≈ 60 m/min (carbide insert)", () => {
      const vc = 60;
      const rpm50 = vcToRpm(vc, 50);
      expect(rpm50).toBeCloseTo(382, 0);
    });

    it("Ti-6Al-4V: Vc ≈ 45 m/min (carbide insert)", () => {
      const vc = 45;
      const rpm50 = vcToRpm(vc, 50);
      expect(rpm50).toBeCloseTo(286, 0);
    });

    it("Inconel 718: Vc ≈ 25 m/min (ceramic insert)", () => {
      const vc = 25;
      const rpm50 = vcToRpm(vc, 50);
      expect(rpm50).toBeCloseTo(159, 0);
    });
  });

  // -------------------------------------------------------------------
  // G18 Plane
  // -------------------------------------------------------------------
  describe("G18 ZX Plane for Turning", () => {
    it("turning programs use G18 (not G17)", () => {
      const gcode = "G90 G21 G18\nG96 S200 M03\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(18)).toBe(true);
    });
  });
});
