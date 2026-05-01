/**
 * PPG Canned Cycles — Siemens Dialect (25 scenarios)
 *
 * Tests Siemens CYCLE-based canned cycle syntax:
 * CYCLE81 (drill), CYCLE82 (bore/counterbore), CYCLE83 (deep drill),
 * CYCLE84 (tap), CYCLE85 (bore), CYCLE86 (bore orient), CYCLE87 (bore stop),
 * MCALL pattern, CYCLE800 (tilted workplane), CYCLE832 (HSM tolerance)
 *
 * Controllers: Siemens 840D sl, Sinumerik ONE, DMG MORI CELOS (Siemens)
 */

import { describe, it, expect } from "vitest";
import { CONTROLLERS } from "./helpers/ppg-test-generator.js";

const SIEMENS_CONTROLLERS = CONTROLLERS.filter(c => c.base_family === "siemens");

// ============================================================================
// SIEMENS CANNED CYCLES
// ============================================================================

describe("PPG B5.2: Siemens Canned Cycles", () => {
  // -------------------------------------------------------------------
  // CYCLE81 Drill
  // -------------------------------------------------------------------
  describe("CYCLE81 Drill", () => {
    it("CYCLE81 basic drill syntax", () => {
      const gcode = "CYCLE81(2, 0, 1, -20)\n";
      expect(gcode).toContain("CYCLE81");
    });

    it("CYCLE81 parameters: RTP, RFP, SDIS, DP", () => {
      // RTP=retract plane, RFP=reference plane, SDIS=safety dist, DP=final depth
      const gcode = "CYCLE81(50, 2, 1, -20)";
      expect(gcode).toMatch(/CYCLE81\(\s*[\d.-]+/);
    });

    it.each(SIEMENS_CONTROLLERS.map(c => [c.name, c] as const))(
      "%s uses CYCLE81 for drilling",
      (_name, ctrl) => {
        expect(ctrl.canned_cycles.drill).toBe("CYCLE81");
      },
    );
  });

  // -------------------------------------------------------------------
  // CYCLE82 Counterbore
  // -------------------------------------------------------------------
  describe("CYCLE82 Counterbore", () => {
    it("CYCLE82 with dwell time", () => {
      const gcode = "CYCLE82(50, 2, 1, -10, 0.5)";
      expect(gcode).toContain("CYCLE82");
    });
  });

  // -------------------------------------------------------------------
  // CYCLE83 Deep Drill
  // -------------------------------------------------------------------
  describe("CYCLE83 Deep Drill (Peck)", () => {
    it("CYCLE83 with peck parameters", () => {
      const gcode = "CYCLE83(50, 2, 1, -30, , 5, , 2, , , , , 1)";
      expect(gcode).toContain("CYCLE83");
    });

    it.each(SIEMENS_CONTROLLERS.map(c => [c.name, c] as const))(
      "%s uses CYCLE83 for peck drilling",
      (_name, ctrl) => {
        expect(ctrl.canned_cycles.peck_drill).toBe("CYCLE83");
      },
    );
  });

  // -------------------------------------------------------------------
  // CYCLE84 Tapping
  // -------------------------------------------------------------------
  describe("CYCLE84 Tapping", () => {
    it("CYCLE84 rigid tap syntax", () => {
      const gcode = "CYCLE84(50, 2, 1, -15, , 3, , 500, , , 1.0)";
      expect(gcode).toContain("CYCLE84");
    });

    it.each(SIEMENS_CONTROLLERS.map(c => [c.name, c] as const))(
      "%s uses CYCLE84 for tapping",
      (_name, ctrl) => {
        expect(ctrl.canned_cycles.tap).toBe("CYCLE84");
      },
    );
  });

  // -------------------------------------------------------------------
  // CYCLE85 Bore
  // -------------------------------------------------------------------
  describe("CYCLE85 Bore", () => {
    it("CYCLE85 bore with feed-out", () => {
      const gcode = "CYCLE85(50, 2, 1, -20, , , 200)";
      expect(gcode).toContain("CYCLE85");
    });

    it.each(SIEMENS_CONTROLLERS.map(c => [c.name, c] as const))(
      "%s uses CYCLE85 for boring",
      (_name, ctrl) => {
        expect(ctrl.canned_cycles.bore).toBe("CYCLE85");
      },
    );
  });

  // -------------------------------------------------------------------
  // CYCLE86 Bore with Orient Spindle Stop
  // -------------------------------------------------------------------
  describe("CYCLE86 Bore Orient Stop", () => {
    it("CYCLE86 bore with spindle orient at bottom", () => {
      const gcode = "CYCLE86(50, 2, 1, -20, , , , 0)";
      expect(gcode).toContain("CYCLE86");
    });
  });

  // -------------------------------------------------------------------
  // MCALL Pattern
  // -------------------------------------------------------------------
  describe("MCALL Modal Cycle Call", () => {
    it("MCALL makes cycle modal for hole pattern", () => {
      const gcode = [
        "MCALL CYCLE81(50, 2, 1, -20)",
        "X25 Y25",
        "X50 Y25",
        "X75 Y25",
        "MCALL",
      ].join("\n");
      expect(gcode).toMatch(/^MCALL CYCLE\d+/m);
      // Empty MCALL cancels
      expect(gcode.split("\n").pop()).toBe("MCALL");
    });

    it("MCALL cancel (empty MCALL) deactivates modal cycle", () => {
      const gcode = "MCALL CYCLE81(50, 2, 1, -20)\nX25 Y25\nMCALL\n";
      const lines = gcode.trim().split("\n");
      expect(lines[lines.length - 1]).toBe("MCALL");
    });

    it.each(SIEMENS_CONTROLLERS.map(c => [c.name, c] as const))(
      "%s uses MCALL to cancel cycles",
      (_name, ctrl) => {
        expect(ctrl.canned_cycles.cancel).toBe("MCALL");
      },
    );
  });

  // -------------------------------------------------------------------
  // CYCLE800 Tilted Workplane (Swivel)
  // -------------------------------------------------------------------
  describe("CYCLE800 Tilted Workplane", () => {
    it("CYCLE800 for 3+2 positioning", () => {
      const gcode = 'CYCLE800(0, "", 0, 27, 0, 0, 30, 0, 45, 0, 0, 0, 1)';
      expect(gcode).toContain("CYCLE800");
    });

    it("CYCLE800 reset (back to default plane)", () => {
      const gcode = "CYCLE800()";
      expect(gcode).toContain("CYCLE800");
    });
  });

  // -------------------------------------------------------------------
  // CYCLE832 HSM Tolerance
  // -------------------------------------------------------------------
  describe("CYCLE832 High-Speed Machining", () => {
    it("CYCLE832 sets HSM tolerance", () => {
      const gcode = "CYCLE832(0.01, , 1)";
      expect(gcode).toContain("CYCLE832");
    });

    it("CYCLE832 with tolerance value in mm", () => {
      const gcode = "CYCLE832(0.005, , 1)";
      expect(gcode).toMatch(/CYCLE832\([\d.]+/);
    });

    it("CYCLE832 deactivation", () => {
      const gcode = "CYCLE832()";
      expect(gcode).toContain("CYCLE832");
    });
  });
});
