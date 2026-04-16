/**
 * PPG Structural Blocks — Category B3 (33 scenarios)
 *
 * Per controller: safe start, tool change, program end.
 * Golden reference values sourced from ControllerDialectEngine config.
 *
 * 11 controllers × 3 block types = 33 test cases.
 */

import { describe, it, expect } from "vitest";
import { CONTROLLERS, generateStructuralBlockCases } from "./helpers/ppg-test-generator.js";
import { normalizeGcode } from "./helpers/gcode-comparator.js";

// ============================================================================
// B3: STRUCTURAL BLOCKS
// ============================================================================

describe("PPG B3: Structural Blocks", () => {
  // -------------------------------------------------------------------
  // B3.1: Safe start blocks per controller
  // -------------------------------------------------------------------
  describe("Safe Start Blocks", () => {
    it.each(CONTROLLERS.map(c => [c.name, c] as const))(
      "%s has correct safe start",
      (_name, ctrl) => {
        const safeStart = ctrl.safe_start;
        expect(safeStart).toBeDefined();
        expect(safeStart.length).toBeGreaterThan(0);

        // Fanuc-family must have G90 G17 G40
        if (ctrl.base_family === "fanuc" || ctrl.base_family === "mazak" || ctrl.base_family === "okuma") {
          expect(safeStart).toContain("G90");
          expect(safeStart).toContain("G17");
          expect(safeStart).toContain("G40");
        }

        // Heidenhain uses BEGIN PGM
        if (ctrl.base_family === "heidenhain") {
          expect(safeStart).toMatch(/BEGIN PGM/);
        }

        // Siemens uses G71 (metric) instead of G21
        if (ctrl.base_family === "siemens") {
          expect(safeStart).toContain("G90");
          expect(safeStart).toMatch(/G7[01]/); // G70 or G71
        }
      },
    );
  });

  // -------------------------------------------------------------------
  // B3.2: Tool change sequences
  // -------------------------------------------------------------------
  describe("Tool Change Sequences", () => {
    it.each(CONTROLLERS.map(c => [c.name, c] as const))(
      "%s has valid tool change template",
      (_name, ctrl) => {
        const tc = ctrl.tool_change;
        expect(tc).toBeDefined();
        expect(tc.length).toBeGreaterThan(0);

        // Must reference tool number placeholder
        expect(tc).toMatch(/\{t\}|\{tool\}/);

        // Fanuc-family must have M06 or M6
        if (ctrl.base_family === "fanuc" || ctrl.base_family === "mazak" || ctrl.base_family === "okuma") {
          expect(tc.toUpperCase()).toMatch(/M0?6/);
        }

        // Heidenhain uses TOOL CALL
        if (ctrl.base_family === "heidenhain") {
          expect(tc.toUpperCase()).toContain("TOOL CALL");
        }

        // Siemens uses T + M06
        if (ctrl.base_family === "siemens") {
          expect(tc.toUpperCase()).toMatch(/T.*M0?6|M0?6.*T/s);
        }
      },
    );
  });

  // -------------------------------------------------------------------
  // B3.3: Program end blocks
  // -------------------------------------------------------------------
  describe("Program End Blocks", () => {
    it.each(CONTROLLERS.map(c => [c.name, c] as const))(
      "%s has correct program end",
      (_name, ctrl) => {
        const end = ctrl.program_end;
        expect(end).toBeDefined();
        expect(end.length).toBeGreaterThan(0);

        const endText = end.join("\n").toUpperCase();

        // Fanuc-family ends with M30 + %
        if (ctrl.base_family === "fanuc" || ctrl.base_family === "mazak" || ctrl.base_family === "okuma") {
          expect(endText).toContain("M30");
        }

        // Siemens ends with M30 (no %)
        if (ctrl.base_family === "siemens") {
          expect(endText).toContain("M30");
        }

        // Heidenhain ends with END PGM
        if (ctrl.base_family === "heidenhain") {
          expect(endText).toContain("END PGM");
        }
      },
    );
  });

  // -------------------------------------------------------------------
  // B3.4: Canned cycle codes are defined
  // -------------------------------------------------------------------
  describe("Canned Cycle Definitions", () => {
    it.each(CONTROLLERS.map(c => [c.name, c] as const))(
      "%s has all required canned cycle codes",
      (_name, ctrl) => {
        expect(ctrl.canned_cycles.drill).toBeDefined();
        expect(ctrl.canned_cycles.peck_drill).toBeDefined();
        expect(ctrl.canned_cycles.tap).toBeDefined();
        expect(ctrl.canned_cycles.bore).toBeDefined();
        expect(ctrl.canned_cycles.cancel).toBeDefined();

        // Fanuc-family uses G81/G83/G84/G85/G80
        if (ctrl.base_family === "fanuc" || ctrl.base_family === "mazak" || ctrl.base_family === "okuma") {
          expect(ctrl.canned_cycles.drill).toBe("G81");
          expect(ctrl.canned_cycles.peck_drill).toBe("G83");
          expect(ctrl.canned_cycles.tap).toBe("G84");
          expect(ctrl.canned_cycles.cancel).toBe("G80");
        }

        // Siemens uses CYCLE81/CYCLE83/CYCLE84
        if (ctrl.base_family === "siemens") {
          expect(ctrl.canned_cycles.drill).toMatch(/CYCLE81/);
          expect(ctrl.canned_cycles.peck_drill).toMatch(/CYCLE83/);
          expect(ctrl.canned_cycles.tap).toMatch(/CYCLE84/);
        }

        // Heidenhain uses CYCL DEF
        if (ctrl.base_family === "heidenhain") {
          expect(ctrl.canned_cycles.drill).toMatch(/CYCL DEF/);
          expect(ctrl.canned_cycles.peck_drill).toMatch(/CYCL DEF/);
          expect(ctrl.canned_cycles.tap).toMatch(/CYCL DEF/);
        }
      },
    );
  });

  // -------------------------------------------------------------------
  // B3.5: Comment syntax per controller
  // -------------------------------------------------------------------
  describe("Comment Syntax", () => {
    it.each(CONTROLLERS.map(c => [c.name, c] as const))(
      "%s has correct comment syntax",
      (_name, ctrl) => {
        // Fanuc/Haas/Mazak/Okuma use parentheses
        if (["fanuc", "mazak", "okuma"].includes(ctrl.base_family)) {
          expect(ctrl.comment_open).toBe("(");
          expect(ctrl.comment_close).toBe(")");
        }

        // Siemens uses semicolon
        if (ctrl.base_family === "siemens") {
          expect(ctrl.comment_open).toBe(";");
        }

        // Heidenhain uses semicolon
        if (ctrl.base_family === "heidenhain") {
          expect(ctrl.comment_open).toBe(";");
        }
      },
    );
  });
});
