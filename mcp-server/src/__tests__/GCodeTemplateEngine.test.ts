/**
 * GCodeTemplateEngine -- companion contract tests (U-PP-MISSING-ENGINE-TESTS, slot:echo)
 *
 * Pure, deterministic parametric G-code generator across 6 controllers x 13
 * operations. No external imports. So every assertion is a hand-traced REFERENCE
 * VALUE (R9: each fails if the dialect/validation logic changes), never a
 * presence-only stub.
 *
 * Coverage:
 *   resolveController()  alias resolution (3 dialects) + throw on unknown
 *   generateGCode()      per-dialect cycle emission (Fanuc G81 / Siemens CYCLE83 /
 *                        Heidenhain CYCL DEF) -- exact emitted lines
 *   validateParams       >=5 FAILURE MODES that THROW (rpm<=0, feed<=0, tool range,
 *                        z_safe<0, thread tool>=dia, pocket tool>=dia, peck<=0)
 *   ADVERSARIAL          unknown operation throws; tool_change exempts rpm=0
 *   generateProgram()    multi-op concatenation + operations manifest
 *   list/catalog         exact controller(6)/operation(13)/source-catalog(12) counts
 */

import { describe, it, expect } from "vitest";
import {
  generateGCode,
  generateProgram,
  resolveController,
  listControllers,
  listOperations,
  getSourceFileCatalog,
} from "../engines/GCodeTemplateEngine.js";

describe("GCodeTemplateEngine", () => {
  describe("resolveController() -- alias resolution", () => {
    it("resolves canonical names and aliases (case-insensitive) to the right family", () => {
      expect(resolveController("fanuc").name).toBe("Fanuc");
      expect(resolveController("840d").family).toBe("siemens");
      expect(resolveController("tnc 640").family).toBe("heidenhain");
      expect(resolveController("HAAS VF").name).toBe("Haas"); // case-insensitive
    });

    it("FAILURE MODE: throws on an unknown controller", () => {
      expect(() => resolveController("nonexistent-controller")).toThrow(/Unknown controller/);
    });
  });

  describe("generateGCode() -- per-dialect canned-cycle emission", () => {
    it("Fanuc drilling emits a literal G81 canned cycle with R-plane + feed", () => {
      const r = generateGCode("fanuc", "drilling", { rpm: 1200, feed_rate: 100, tool_number: 2, z_depth: -20 });
      expect(r.operation).toBe("drilling");
      expect(r.controller_family).toBe("fanuc");
      expect(r.gcode).toContain("G81 X0 Y0 Z-20 R2 F100");
      expect(r.gcode).toContain("T2 M6"); // safety tool-change block
      expect(r.gcode).toContain("G80"); // cycle cancel
    });

    it("Siemens peck_drilling emits CYCLE83 (NOT a Fanuc G83 block)", () => {
      const r = generateGCode("840d", "peck_drilling", { rpm: 1000, feed_rate: 80, tool_number: 3, z_depth: -30, peck_depth: 5 });
      expect(r.controller_family).toBe("siemens");
      expect(r.gcode).toContain("CYCLE83(5, 0, 0.5, -30, , 0, 1, 0, , 5)");
      expect(r.gcode).not.toContain("G83 X"); // Siemens does NOT use the Fanuc canned form
    });

    it("Heidenhain drilling emits a CYCL DEF / CYCL CALL block", () => {
      const r = generateGCode("tnc", "drilling", { rpm: 1000, feed_rate: 100, z_depth: -15 });
      expect(r.controller_family).toBe("heidenhain");
      expect(r.gcode).toContain("CYCL DEF 1.0 DRILLING");
      expect(r.gcode).toContain("CYCL CALL");
    });
  });

  describe("validateParams -- FAILURE MODES (throw on unsafe input)", () => {
    it("throws on non-positive RPM", () => {
      expect(() => generateGCode("fanuc", "drilling", { rpm: 0, feed_rate: 100, z_depth: -10 })).toThrow(/Invalid RPM/);
    });

    it("throws on non-positive feed rate", () => {
      expect(() => generateGCode("fanuc", "drilling", { rpm: 1000, feed_rate: 0, z_depth: -10 })).toThrow(/Invalid feed rate/);
    });

    it("throws on a tool number outside 1-200", () => {
      expect(() => generateGCode("fanuc", "drilling", { rpm: 1000, feed_rate: 100, tool_number: 500, z_depth: -10 })).toThrow(/Invalid tool number/);
    });

    it("throws on a negative z_safe (rapid-approach collision hazard)", () => {
      expect(() => generateGCode("fanuc", "drilling", { rpm: 1000, feed_rate: 100, z_safe: -1, z_depth: -10 })).toThrow(/z_safe/);
    });

    it("throws when a thread-milling tool is not smaller than the thread", () => {
      expect(() => generateGCode("fanuc", "thread_milling", { rpm: 1000, feed_rate: 100, tool_diameter: 20, thread_diameter: 10 })).toThrow(/must be < thread diameter/);
    });

    it("throws when a circular-pocket tool does not fit inside the pocket", () => {
      expect(() => generateGCode("fanuc", "circular_pocket", { rpm: 1000, feed_rate: 100, tool_diameter: 60, pocket_diameter: 50 })).toThrow(/must be < pocket diameter/);
    });

    it("throws on a non-positive peck depth", () => {
      expect(() => generateGCode("fanuc", "peck_drilling", { rpm: 1000, feed_rate: 100, peck_depth: 0, z_depth: -10 })).toThrow(/Invalid peck depth/);
    });
  });

  describe("ADVERSARIAL", () => {
    it("throws on an unknown operation (past the param gate)", () => {
      expect(() => generateGCode("fanuc", "not_a_real_op", { rpm: 1000, feed_rate: 100 })).toThrow(/Unknown operation/);
    });

    it("tool_change EXEMPTS the rpm/feed>0 rule (a bare tool change is valid at rpm 0)", () => {
      const r = generateGCode("fanuc", "tool_change", { rpm: 0, feed_rate: 0, tool_number: 5 });
      expect(r.operation).toBe("tool_change");
      expect(r.gcode).toContain("T5 M6");
    });
  });

  describe("generateProgram() -- multi-operation assembly", () => {
    it("concatenates header + op + footer and records the operation manifest", () => {
      const r = generateProgram("haas", [
        { operation: "program_header", params: { rpm: 0, feed_rate: 0, program_name: "PART_001" } },
        { operation: "drilling", params: { rpm: 1500, feed_rate: 100, tool_number: 2, z_depth: -20 } },
        { operation: "program_footer", params: { rpm: 0, feed_rate: 0 } },
      ]);
      expect(r.operation).toBe("program");
      expect(r.controller_family).toBe("haas");
      expect(r.gcode).toContain("O0001"); // padded program number from the header
      expect(r.gcode).toContain("G81 X0 Y0 Z-20 R2 F100"); // the drilling block
      expect(r.gcode).toContain("M30"); // footer end
      expect((r.parameters_used as { operations: string[] }).operations).toEqual([
        "program_header",
        "drilling",
        "program_footer",
      ]);
    });
  });

  describe("registry introspection", () => {
    it("lists exactly the 6 supported controllers (one per family)", () => {
      const ctrls = listControllers();
      expect(ctrls).toHaveLength(6);
      expect(new Set(ctrls.map((c) => c.family))).toEqual(
        new Set(["fanuc", "haas", "mazak", "okuma", "siemens", "heidenhain"]),
      );
    });

    it("lists exactly the 13 supported operations", () => {
      const ops = listOperations();
      expect(ops).toHaveLength(13);
      expect(ops).toContain("drilling");
      expect(ops).toContain("thread_milling");
      expect(ops).toContain("subprogram_call");
    });

    it("exposes the 12-entry safety-critical source-file catalog (all CRITICAL)", () => {
      const cat = getSourceFileCatalog();
      const keys = Object.keys(cat);
      expect(keys).toHaveLength(12);
      expect(keys.every((k) => cat[k as keyof typeof cat].safety_class === "CRITICAL")).toBe(true);
    });
  });

  // U-PP-NONFINITE-EMIT-SWEEP: a non-finite numeric param formats into a literal
  // XNaN/FInfinity/ZNaN token the control rejects; validateParams must reject it up-front
  // (the `<= 0` checks pass NaN). Matches this engine's throw-on-invalid-param convention.
  describe("validateParams -- non-finite guard (U-PP-NONFINITE-EMIT-SWEEP)", () => {
    it("[regression] a finite drilling op still generates (no false throw)", () => {
      expect(() => generateGCode("fanuc", "drilling", { rpm: 1000, feed_rate: 100, z_depth: -10 })).not.toThrow();
    });
    it("throws on NaN feed_rate (NaN<=0 is false, so the legacy guard misses it)", () => {
      expect(() => generateGCode("fanuc", "drilling", { rpm: 1000, feed_rate: NaN, z_depth: -10 })).toThrow(/Non-finite feed_rate/);
    });
    it("throws on Infinity z_depth", () => {
      expect(() => generateGCode("fanuc", "drilling", { rpm: 1000, feed_rate: 100, z_depth: Infinity })).toThrow(/Non-finite z_depth/);
    });
    it("throws on NaN x_start", () => {
      expect(() => generateGCode("fanuc", "drilling", { rpm: 1000, feed_rate: 100, z_depth: -10, x_start: NaN })).toThrow(/Non-finite x_start/);
    });
    it("throws on a non-finite profile_points entry", () => {
      expect(() => generateGCode("fanuc", "drilling", { rpm: 1000, feed_rate: 100, z_depth: -10, profile_points: [{ x: 0, y: 0 }, { x: Infinity, y: 5 }] })).toThrow(/Non-finite profile_points/);
    });
  });
});
