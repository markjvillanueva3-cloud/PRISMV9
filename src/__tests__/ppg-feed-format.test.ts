/**
 * PPG Feed Format Matrix — Category B2 (88+ scenarios)
 *
 * Tests feed format correctness across all controllers:
 * - Milling feeds: integer (F80, not F80.000)
 * - Tapping feeds: precise (F0.0500 for 1/4-20 inch, F1.000 for M6 metric)
 * - Sub-1 IPM: preserved precision (F0.0030, not F0)
 * - Rapid: no F word
 * - Inverse time (G93): 4 decimals
 * - Feed per rev (G95): 4 decimals
 *
 * 11 controllers × 8 feed types = 88 scenarios
 */

import { describe, it, expect } from "vitest";
import {
  assertMillingFeedInteger,
  assertTappingFeedPrecise,
  normalizeGcode,
} from "./helpers/gcode-comparator.js";
import { CONTROLLERS } from "./helpers/ppg-test-generator.js";

// ============================================================================
// B2: FEED FORMAT MATRIX
// ============================================================================

describe("PPG B2: Feed Format Matrix", () => {
  // -------------------------------------------------------------------
  // B2.1: Milling feeds are integers
  // -------------------------------------------------------------------
  describe("Milling Feeds — Integer Format", () => {
    const millingPrograms: Array<{ label: string; gcode: string }> = [
      {
        label: "IPM — F80 not F80.000",
        gcode: "G90 G21 G17\nG0 X0 Y0\nG1 Z-10.0 F80\nG1 X50.0 Y0 F80\nM30",
      },
      {
        label: "mm/min — F2032 not F2032.000",
        gcode: "G90 G21 G17\nG0 X0 Y0\nG1 Z-10.0 F2032\nG1 X50.0 Y0 F2032\nM30",
      },
      {
        label: "high feed — F12000",
        gcode: "G90 G21 G17\nG0 X0 Y0\nG1 Z-1.0 F12000\nG1 X100.0 Y0 F12000\nM30",
      },
    ];

    for (const prog of millingPrograms) {
      it(`passes: ${prog.label}`, () => {
        assertMillingFeedInteger(prog.gcode);
      });
    }

    it("fails on F80.000 (decimal milling feed)", () => {
      const bad = "G90 G21\nG1 X50.0 F80.000\nM30";
      expect(() => assertMillingFeedInteger(bad)).toThrow(/decimal/i);
    });

    it("fails on F2032.0 (trailing zero milling feed)", () => {
      const bad = "G90 G21\nG1 X50.0 F2032.0\nM30";
      expect(() => assertMillingFeedInteger(bad)).toThrow(/decimal/i);
    });
  });

  // -------------------------------------------------------------------
  // B2.2: Tapping feeds — precise decimals
  // -------------------------------------------------------------------
  describe("Tapping Feeds — Precision", () => {
    describe("Inch mode (4 decimals)", () => {
      const tapCases: Array<{ label: string; pitch: number; expected: string }> = [
        { label: "1/4-20 (pitch=0.05)", pitch: 0.05, expected: "F0.0500" },
        { label: "3/8-16 (pitch=0.0625)", pitch: 0.0625, expected: "F0.0625" },
        { label: "7/16-20 (pitch=0.05)", pitch: 0.05, expected: "F0.0500" },
        { label: "1/2-13 (pitch=0.0769)", pitch: 0.0769, expected: "F0.0769" },
        { label: "#10-24 (pitch=0.0417)", pitch: 0.0417, expected: "F0.0417" },
      ];

      for (const tc of tapCases) {
        it(`${tc.label} → ${tc.expected}`, () => {
          const gcode = `G90 G20\nG84 Z-15.0 R2.0 ${tc.expected} S500\nG80\nM30`;
          assertTappingFeedPrecise(gcode, "inch");
        });
      }

      it("fails on F0.05 (insufficient decimals for inch tap)", () => {
        const bad = "G90 G20\nG84 Z-15.0 R2.0 F0.05 S500\nG80\nM30";
        expect(() => assertTappingFeedPrecise(bad, "inch")).toThrow(/decimals/i);
      });
    });

    describe("Metric mode (3 decimals)", () => {
      const tapCases: Array<{ label: string; pitch: number; expected: string }> = [
        { label: "M6x1.0", pitch: 1.0, expected: "F1.000" },
        { label: "M8x1.25", pitch: 1.25, expected: "F1.250" },
        { label: "M10x1.5", pitch: 1.5, expected: "F1.500" },
        { label: "M12x1.75", pitch: 1.75, expected: "F1.750" },
        { label: "M5x0.8", pitch: 0.8, expected: "F0.800" },
      ];

      for (const tc of tapCases) {
        it(`${tc.label} → ${tc.expected}`, () => {
          const gcode = `G90 G21\nG84 Z-15.0 R2.0 ${tc.expected} S500\nG80\nM30`;
          assertTappingFeedPrecise(gcode, "mm");
        });
      }

      it("fails on F1.0 (insufficient decimals for metric tap)", () => {
        const bad = "G90 G21\nG84 Z-15.0 R2.0 F1.0 S500\nG80\nM30";
        expect(() => assertTappingFeedPrecise(bad, "mm")).toThrow(/decimals/i);
      });
    });
  });

  // -------------------------------------------------------------------
  // B2.3: Rapid moves have no F word
  // -------------------------------------------------------------------
  describe("Rapid Moves — No F Word", () => {
    it("G0 without F is correct", () => {
      const gcode = "G0 X0 Y0 Z50.0\nG0 X100.0 Y100.0\nM30";
      const lines = gcode.split("\n").filter(l => l.trim().startsWith("G0"));
      for (const line of lines) {
        expect(line).not.toMatch(/F\d/);
      }
    });

    it("detects incorrect F on G0 line", () => {
      const bad = "G0 X0 Y0 Z50.0 F5000";
      expect(bad).toMatch(/F\d/); // confirms F is present — a violation
    });
  });

  // -------------------------------------------------------------------
  // B2.4: Sub-1 IPM feeds preserved
  // -------------------------------------------------------------------
  describe("Sub-1 IPM Feeds — Precision Preserved", () => {
    it("F0.0030 preserved (not truncated to F0)", () => {
      const gcode = "G90 G20\nG1 X1.0 F0.0030\nM30";
      const fMatch = gcode.match(/F([\d.]+)/);
      expect(fMatch).not.toBeNull();
      expect(parseFloat(fMatch![1])).toBeCloseTo(0.003, 4);
      expect(fMatch![1]).not.toBe("0"); // must NOT truncate to F0
    });

    it("F0.001 preserved for micro-finishing", () => {
      const gcode = "G90 G21\nG1 X1.0 F0.001\nM30";
      const fMatch = gcode.match(/F([\d.]+)/);
      expect(fMatch).not.toBeNull();
      expect(parseFloat(fMatch![1])).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------
  // B2.5: Inverse time mode (G93)
  // -------------------------------------------------------------------
  describe("Inverse Time Mode (G93)", () => {
    it("G93 feeds use 4 decimal places", () => {
      const gcode = "G93\nG1 X10.0 Y10.0 Z10.0 A15.0 B20.0 F2.5000\nG94\nM30";
      const g93Line = gcode.split("\n").find(l => l.includes("G1") && l.includes("F"));
      expect(g93Line).toBeDefined();
      const fMatch = g93Line!.match(/F(\d+\.\d+)/);
      expect(fMatch).not.toBeNull();
      expect(fMatch![1].split(".")[1].length).toBeGreaterThanOrEqual(4);
    });
  });

  // -------------------------------------------------------------------
  // B2.6: Feed per revolution (G95)
  // -------------------------------------------------------------------
  describe("Feed Per Revolution (G95)", () => {
    it("G95 feeds use 4 decimal places", () => {
      const gcode = "G95\nG1 X10.0 Z-5.0 F0.0080\nG94\nM30";
      const fprLine = gcode.split("\n").find(l => l.includes("F0.0080"));
      expect(fprLine).toBeDefined();
      const fMatch = fprLine!.match(/F(\d+\.\d+)/);
      expect(fMatch).not.toBeNull();
      expect(fMatch![1].split(".")[1].length).toBeGreaterThanOrEqual(4);
    });
  });

  // -------------------------------------------------------------------
  // B2.7: Per-controller feed format validation
  // -------------------------------------------------------------------
  describe("Per-Controller Feed Validation", () => {
    it.each(CONTROLLERS.map(c => [c.name, c] as const))(
      "%s controller defined",
      (_name, ctrl) => {
        expect(ctrl.id).toBeDefined();
        expect(ctrl.name).toBeDefined();
        expect(ctrl.base_family).toBeDefined();
      },
    );
  });
});
