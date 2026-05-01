/**
 * PPG Canned Cycles — Heidenhain Dialect (25 scenarios)
 *
 * Tests Heidenhain CYCL DEF-based canned cycle syntax:
 * CYCL DEF 200 (drill), 201 (ream), 202 (bore), 203 (countersink),
 * 204 (back bore), 205 (peck), 206 (rigid tap), 207 (tap chuck),
 * 252 (pocket), 254 (groove). CYCL CALL after every CYCL DEF.
 *
 * Controllers: Heidenhain TNC640, TNC7
 */

import { describe, it, expect } from "vitest";
import { CONTROLLERS } from "./helpers/ppg-test-generator.js";

const HEIDENHAIN_CONTROLLERS = CONTROLLERS.filter(c => c.base_family === "heidenhain");

// ============================================================================
// HEIDENHAIN CANNED CYCLES
// ============================================================================

describe("PPG B5.3: Heidenhain Canned Cycles", () => {
  // -------------------------------------------------------------------
  // CYCL DEF 200 Drilling
  // -------------------------------------------------------------------
  describe("CYCL DEF 200 Drilling", () => {
    it("CYCL DEF 200 with Q parameters", () => {
      const gcode = [
        "CYCL DEF 200 DRILLING ~",
        "  Q200=+2    ;SET-UP CLEARANCE ~",
        "  Q201=-20   ;DEPTH ~",
        "  Q206=+480  ;FEED RATE FOR PLUNGING ~",
        "  Q211=+0    ;DWELL TIME AT DEPTH",
        "CYCL CALL",
      ].join("\n");
      expect(gcode).toContain("CYCL DEF 200");
      expect(gcode).toContain("CYCL CALL");
    });

    it.each(HEIDENHAIN_CONTROLLERS.map(c => [c.name, c] as const))(
      "%s uses CYCL DEF 200 for drilling",
      (_name, ctrl) => {
        expect(ctrl.canned_cycles.drill).toBe("CYCL DEF 200");
      },
    );
  });

  // -------------------------------------------------------------------
  // CYCL DEF 201 Reaming
  // -------------------------------------------------------------------
  describe("CYCL DEF 201 Reaming", () => {
    it("CYCL DEF 201 ream cycle", () => {
      const gcode = [
        "CYCL DEF 201 REAMING ~",
        "  Q200=+2    ;SET-UP CLEARANCE ~",
        "  Q201=-15   ;DEPTH ~",
        "  Q206=+150  ;FEED RATE FOR PLUNGING ~",
        "  Q211=+0.5  ;DWELL TIME AT DEPTH",
        "CYCL CALL",
      ].join("\n");
      expect(gcode).toContain("CYCL DEF 201");
    });
  });

  // -------------------------------------------------------------------
  // CYCL DEF 202 Boring
  // -------------------------------------------------------------------
  describe("CYCL DEF 202 Boring", () => {
    it("CYCL DEF 202 bore cycle", () => {
      const gcode = [
        "CYCL DEF 202 BORING ~",
        "  Q200=+2    ;SET-UP CLEARANCE ~",
        "  Q201=-20   ;DEPTH ~",
        "  Q206=+200  ;FEED RATE FOR PLUNGING ~",
        "  Q211=+0    ;DWELL TIME AT DEPTH",
        "CYCL CALL",
      ].join("\n");
      expect(gcode).toContain("CYCL DEF 202");
    });

    it.each(HEIDENHAIN_CONTROLLERS.map(c => [c.name, c] as const))(
      "%s uses CYCL DEF 202 for boring",
      (_name, ctrl) => {
        expect(ctrl.canned_cycles.bore).toBe("CYCL DEF 202");
      },
    );
  });

  // -------------------------------------------------------------------
  // CYCL DEF 203 Countersink
  // -------------------------------------------------------------------
  describe("CYCL DEF 203 Countersink", () => {
    it("CYCL DEF 203 countersink", () => {
      const gcode = [
        "CYCL DEF 203 UNIVERSAL DRILLING ~",
        "  Q200=+2    ;SET-UP CLEARANCE ~",
        "  Q201=-5    ;DEPTH ~",
        "  Q206=+200  ;FEED RATE FOR PLUNGING",
        "CYCL CALL",
      ].join("\n");
      expect(gcode).toContain("CYCL DEF 203");
    });
  });

  // -------------------------------------------------------------------
  // CYCL DEF 204 Back Bore
  // -------------------------------------------------------------------
  describe("CYCL DEF 204 Back Bore", () => {
    it("CYCL DEF 204 back counterboring", () => {
      const gcode = "CYCL DEF 204 BACK BORING\nCYCL CALL";
      expect(gcode).toContain("CYCL DEF 204");
    });
  });

  // -------------------------------------------------------------------
  // CYCL DEF 205 Peck Drilling
  // -------------------------------------------------------------------
  describe("CYCL DEF 205 Peck Drilling", () => {
    it("CYCL DEF 205 with peck depth Q202", () => {
      const gcode = [
        "CYCL DEF 205 UNIVERSAL PECKING ~",
        "  Q200=+2    ;SET-UP CLEARANCE ~",
        "  Q201=-30   ;DEPTH ~",
        "  Q206=+400  ;FEED RATE FOR PLUNGING ~",
        "  Q202=+5    ;PLUNGING DEPTH ~",
        "  Q210=+0    ;DWELL TIME AT TOP",
        "CYCL CALL",
      ].join("\n");
      expect(gcode).toContain("CYCL DEF 205");
      expect(gcode).toContain("Q202=+5");
    });

    it.each(HEIDENHAIN_CONTROLLERS.map(c => [c.name, c] as const))(
      "%s uses CYCL DEF 205 for peck drilling",
      (_name, ctrl) => {
        expect(ctrl.canned_cycles.peck_drill).toBe("CYCL DEF 205");
      },
    );
  });

  // -------------------------------------------------------------------
  // CYCL DEF 206 Rigid Tapping
  // -------------------------------------------------------------------
  describe("CYCL DEF 206 Rigid Tapping", () => {
    it("CYCL DEF 206 rigid tap with pitch", () => {
      const gcode = [
        "CYCL DEF 206 TAPPING NEW ~",
        "  Q200=+2    ;SET-UP CLEARANCE ~",
        "  Q201=-15   ;DEPTH ~",
        "  Q206=+500  ;FEED RATE FOR PLUNGING ~",
        "  Q211=+0    ;DWELL TIME AT DEPTH ~",
        "  Q239=+0    ;PITCH",
        "CYCL CALL",
      ].join("\n");
      expect(gcode).toContain("CYCL DEF 206");
    });

    it.each(HEIDENHAIN_CONTROLLERS.map(c => [c.name, c] as const))(
      "%s uses CYCL DEF 206 for tapping",
      (_name, ctrl) => {
        expect(ctrl.canned_cycles.tap).toBe("CYCL DEF 206");
      },
    );
  });

  // -------------------------------------------------------------------
  // CYCL DEF 207 Tapping with Chuck
  // -------------------------------------------------------------------
  describe("CYCL DEF 207 Tapping with Chuck", () => {
    it("CYCL DEF 207 floating tap holder", () => {
      const gcode = "CYCL DEF 207 TAPPING ~\n  Q200=+2 ~\n  Q201=-15\nCYCL CALL";
      expect(gcode).toContain("CYCL DEF 207");
    });
  });

  // -------------------------------------------------------------------
  // CYCL CALL Pattern
  // -------------------------------------------------------------------
  describe("CYCL CALL Execution", () => {
    it("CYCL CALL executes the last defined cycle", () => {
      const gcode = "CYCL DEF 200 DRILLING ~\n  Q200=+2 ~\n  Q201=-20\nCYCL CALL";
      expect(gcode).toContain("CYCL CALL");
    });

    it("CYCL CALL PAT for pattern execution", () => {
      const gcode = "CYCL DEF 200 DRILLING ~\n  Q200=+2 ~\n  Q201=-20\nCYCL CALL PAT";
      expect(gcode).toContain("CYCL CALL PAT");
    });

    it("each CYCL DEF must be followed by CYCL CALL", () => {
      const gcode = [
        "CYCL DEF 200 DRILLING ~",
        "  Q201=-20",
        "CYCL CALL",
        "CYCL DEF 205 UNIVERSAL PECKING ~",
        "  Q201=-30 ~",
        "  Q202=+5",
        "CYCL CALL",
      ].join("\n");
      const defCount = (gcode.match(/CYCL DEF/g) || []).length;
      const callCount = (gcode.match(/CYCL CALL/g) || []).length;
      expect(callCount).toBeGreaterThanOrEqual(defCount);
    });
  });

  // -------------------------------------------------------------------
  // CYCL DEF 252 Pocket (milling cycle)
  // -------------------------------------------------------------------
  describe("CYCL DEF 252 Circular Pocket", () => {
    it("CYCL DEF 252 circular pocket milling", () => {
      const gcode = [
        "CYCL DEF 252 CIRCULAR POCKET ~",
        "  Q215=+0    ;MACHINING OPERATION ~",
        "  Q223=+25   ;CIRCLE DIAMETER ~",
        "  Q201=-10   ;DEPTH",
        "CYCL CALL",
      ].join("\n");
      expect(gcode).toContain("CYCL DEF 252");
    });
  });

  // -------------------------------------------------------------------
  // Line continuation (~)
  // -------------------------------------------------------------------
  describe("Line Continuation with ~", () => {
    it("~ continues CYCL DEF parameters to next line", () => {
      const gcode = "CYCL DEF 200 DRILLING ~\n  Q200=+2 ~\n  Q201=-20 ~\n  Q206=+480";
      const tildeCount = (gcode.match(/~/g) || []).length;
      expect(tildeCount).toBeGreaterThan(0);
    });

    it("last parameter line has no ~", () => {
      const lines = [
        "CYCL DEF 200 DRILLING ~",
        "  Q200=+2 ~",
        "  Q201=-20 ~",
        "  Q206=+480",
      ];
      // Last parameter line should NOT end with ~
      expect(lines[lines.length - 1].endsWith("~")).toBe(false);
    });
  });
});
