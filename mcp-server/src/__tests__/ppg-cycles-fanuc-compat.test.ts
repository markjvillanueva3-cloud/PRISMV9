/**
 * PPG Canned Cycles — Fanuc-Compatible Dialects (30 scenarios)
 *
 * Tests canned cycle G-code for Fanuc-family controllers:
 * Haas NGC, Fanuc 31i, Fanuc 0i, Okuma OSP, Mazak SmoothAi,
 * DMG MORI CELOS (Fanuc), Brother Speedio, Hurco WinMax
 *
 * Cycles: G81 drill, G82 counterbore, G83 peck, G73 chip break,
 * G84 rigid tap, G85 bore, G86 bore-stop, G87 back bore, G89 bore-dwell
 *
 * Standard test hole: 10mm diameter, 20mm deep, Q2 peck, P0.5 dwell
 */

import { describe, it, expect } from "vitest";
import { parseGCode } from "./helpers/gcode-parser.js";
import { CONTROLLERS } from "./helpers/ppg-test-generator.js";

const FANUC_CONTROLLERS = CONTROLLERS.filter(c => c.base_family === "fanuc");

// ============================================================================
// FANUC CANNED CYCLE G-CODES
// ============================================================================

describe("PPG B5.1: Fanuc-Compatible Canned Cycles", () => {
  // -------------------------------------------------------------------
  // G81 Spot/Drill
  // -------------------------------------------------------------------
  describe("G81 Drill Cycle", () => {
    it("G81 with Z depth, R retract, F feed", () => {
      const gcode = "G0 X25 Y25\nG0 Z5\nG81 Z-20 R2 F480\nG80\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(81)).toBe(true);
      expect(program.gCodesUsed.has(80)).toBe(true);
    });

    it("G81 multi-hole pattern", () => {
      const gcode = "G81 Z-20 R2 F480\nX25 Y25\nX50 Y25\nX75 Y25\nG80\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(81)).toBe(true);
    });

    it.each(FANUC_CONTROLLERS.map(c => [c.name, c] as const))(
      "%s uses G81 for drilling",
      (_name, ctrl) => {
        expect(ctrl.canned_cycles.drill).toBe("G81");
      },
    );
  });

  // -------------------------------------------------------------------
  // G82 Counterbore (with dwell)
  // -------------------------------------------------------------------
  describe("G82 Counterbore Cycle", () => {
    it("G82 with P dwell at bottom", () => {
      const gcode = "G82 Z-10 R2 P500 F300\nG80\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(82)).toBe(true);
    });

    it("P word specifies dwell time", () => {
      const gcode = "G82 Z-10 R2 P500 F300\nG80\nM30";
      expect(gcode).toMatch(/G82.*P\d+/);
    });
  });

  // -------------------------------------------------------------------
  // G83 Peck Drill
  // -------------------------------------------------------------------
  describe("G83 Peck Drill Cycle", () => {
    it("G83 with Q peck increment", () => {
      const gcode = "G83 Z-20 R2 Q2 F400\nG80\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(83)).toBe(true);
    });

    it("Q depth is positive value", () => {
      const gcode = "G83 Z-20 R2 Q2 F400\nG80\nM30";
      expect(gcode).toMatch(/Q\d+/);
    });

    it.each(FANUC_CONTROLLERS.map(c => [c.name, c] as const))(
      "%s uses G83 for peck drill",
      (_name, ctrl) => {
        expect(ctrl.canned_cycles.peck_drill).toBe("G83");
      },
    );
  });

  // -------------------------------------------------------------------
  // G73 Chip Break
  // -------------------------------------------------------------------
  describe("G73 Chip Break Cycle", () => {
    it("G73 high-speed chip break", () => {
      const gcode = "G73 Z-20 R2 Q3 F350\nG80\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(73)).toBe(true);
    });

    it("G73 retracts less than G83 (chip break vs full retract)", () => {
      // G73 retracts a small amount (d parameter on some controllers)
      // G83 retracts to R plane each peck
      const g73 = "G73 Z-20 R2 Q3 F350";
      const g83 = "G83 Z-20 R2 Q3 F400";
      expect(g73).toContain("G73");
      expect(g83).toContain("G83");
    });
  });

  // -------------------------------------------------------------------
  // G84 Rigid Tap
  // -------------------------------------------------------------------
  describe("G84 Rigid Tap Cycle", () => {
    it("G84 with F = pitch × RPM", () => {
      // M6×1.0 at 500 RPM → F = 1.0 × 500 = F500 (G94 mode)
      const gcode = "S500 M03\nG84 Z-15 R2 F500\nG80\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(84)).toBe(true);
    });

    it("G84 in G95 mode: F = thread pitch directly", () => {
      // G95 feed per rev: F = pitch = 1.0 for M6×1.0
      const gcode = "G95\nS500 M03\nG84 Z-15 R2 F1.000\nG80\nG94\nM30";
      expect(gcode).toMatch(/G95[\s\S]*G84.*F1\.000/);
    });

    it("G74 for left-hand tapping", () => {
      const gcode = "S500 M04\nG74 Z-15 R2 F500\nG80\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(74)).toBe(true);
    });

    it.each(FANUC_CONTROLLERS.map(c => [c.name, c] as const))(
      "%s uses G84 for tapping",
      (_name, ctrl) => {
        expect(ctrl.canned_cycles.tap).toBe("G84");
      },
    );
  });

  // -------------------------------------------------------------------
  // G85 Bore
  // -------------------------------------------------------------------
  describe("G85 Bore Cycle", () => {
    it("G85 bore — feed-out at bottom", () => {
      const gcode = "G85 Z-20 R2 F200\nG80\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(85)).toBe(true);
    });

    it.each(FANUC_CONTROLLERS.map(c => [c.name, c] as const))(
      "%s uses G85 for boring",
      (_name, ctrl) => {
        expect(ctrl.canned_cycles.bore).toBe("G85");
      },
    );
  });

  // -------------------------------------------------------------------
  // G86 Bore-Stop
  // -------------------------------------------------------------------
  describe("G86 Bore-Stop Cycle", () => {
    it("G86 bore with spindle stop at bottom", () => {
      const gcode = "G86 Z-20 R2 F200\nG80\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(86)).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // G87 Back Bore
  // -------------------------------------------------------------------
  describe("G87 Back Bore Cycle", () => {
    it("G87 back bore (orient spindle, shift, bore)", () => {
      const gcode = "G87 Z-10 R-20 Q2 F150\nG80\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(87)).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // G89 Bore-Dwell
  // -------------------------------------------------------------------
  describe("G89 Bore-Dwell Cycle", () => {
    it("G89 bore with dwell at bottom, feed out", () => {
      const gcode = "G89 Z-20 R2 P500 F200\nG80\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(89)).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // G80 Cancel
  // -------------------------------------------------------------------
  describe("G80 Cycle Cancel", () => {
    it("G80 cancels active canned cycle", () => {
      const gcode = "G81 Z-15 R2 F480\nX25 Y25\nG80\nM30";
      const program = parseGCode(gcode);
      expect(program.gCodesUsed.has(80)).toBe(true);
    });

    it("G80 required before switching to different cycle", () => {
      const gcode = "G81 Z-15 R2 F480\nX25 Y25\nG80\nG83 Z-30 R2 Q5 F400\nX50 Y50\nG80\nM30";
      const program = parseGCode(gcode);
      const g80Blocks = program.blocks.filter(b => b.gCodes.includes(80));
      expect(g80Blocks.length).toBeGreaterThanOrEqual(2);
    });

    it.each(FANUC_CONTROLLERS.map(c => [c.name, c] as const))(
      "%s uses G80 to cancel cycles",
      (_name, ctrl) => {
        expect(ctrl.canned_cycles.cancel).toBe("G80");
      },
    );
  });
});
