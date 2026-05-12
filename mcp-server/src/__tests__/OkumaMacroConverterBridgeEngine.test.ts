/**
 * OkumaMacroConverterBridgeEngine Test Suite
 * ============================================
 *
 * LATHE-AWARE-HARDEN MS6 U-LAT47
 *
 * @milestone LATHE-AWARE-HARDEN MS6
 * @unit U-LAT47
 */

import { describe, it, expect } from "vitest";
import { okumaMacroConverterBridgeEngine } from "../engines/OkumaMacroConverterBridgeEngine.js";

describe("OkumaMacroConverterBridgeEngine", () => {
  // ── status() ─────────────────────────────────────────────────────────

  describe("status()", () => {
    it("returns a RuntimeStatus shape", async () => {
      const s = await okumaMacroConverterBridgeEngine.status();
      expect(typeof s.python_available).toBe("boolean");
      expect(typeof s.converter_exists).toBe("boolean");
      expect(s.fallback_ready).toBe(true);
    });

    it("reports a default python binary for the platform", async () => {
      const s = await okumaMacroConverterBridgeEngine.status();
      expect(s.python_binary).toBeDefined();
    });
  });

  // ── convert() — fallback TS path ─────────────────────────────────────

  describe("convert() — fallback TS", () => {
    it("substitutes known variables with override values", async () => {
      const src = `#100 = 1.5\nG1 X#100 F0.1\n`;
      const result = await okumaMacroConverterBridgeEngine.convert(src, {
        pythonBinary: "definitely-nonexistent-python",
        converterPath: "H:/ghost/convert.py",
      });
      expect(result.supported).toBe(true);
      expect(result.runner).toBe("fallback_ts");
      // #100 should be substituted with 1.5 in the output
      expect(result.converted_gcode).toContain("G1 X1.5");
    });

    it("records variable assignments as comments", async () => {
      const src = `#100 = 0.25\n`;
      const result = await okumaMacroConverterBridgeEngine.convert(src, {
        pythonBinary: "definitely-nonexistent-python",
        converterPath: "H:/ghost/convert.py",
      });
      expect(result.converted_gcode).toMatch(/\( #100 = 0\.25 \)/);
    });

    it("warns when encountering control flow", async () => {
      const src = `IF [#100 GT 1.0]\nG1 X10\nEND\n`;
      const result = await okumaMacroConverterBridgeEngine.convert(src, {
        pythonBinary: "ghost",
        converterPath: "H:/ghost/convert.py",
      });
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => /control flow/i.test(w))).toBe(true);
    });

    it("preserves G65 macro calls as comments + warns", async () => {
      const src = `G65 P9100 A10 B20\n`;
      const result = await okumaMacroConverterBridgeEngine.convert(src, {
        pythonBinary: "ghost",
        converterPath: "H:/ghost/convert.py",
      });
      expect(result.converted_gcode).toMatch(/G65 P9100/);
      expect(result.warnings.some((w) => /macro call/i.test(w))).toBe(true);
    });

    it("accepts external override values for variables", async () => {
      const src = `G1 X#500 F0.1\n`;
      const result = await okumaMacroConverterBridgeEngine.convert(src, {
        pythonBinary: "ghost",
        converterPath: "H:/ghost/convert.py",
        variableOverrides: { "#500": 42 },
      });
      expect(result.converted_gcode).toContain("G1 X42");
    });

    it("reports source_lines and output_lines", async () => {
      const src = "G0 X0\nG0 Y0\nG0 Z0\n";
      const result = await okumaMacroConverterBridgeEngine.convert(src, {
        pythonBinary: "ghost",
        converterPath: "H:/ghost/convert.py",
      });
      expect(result.source_lines).toBeGreaterThanOrEqual(3);
      expect(result.output_lines).toBeGreaterThanOrEqual(3);
    });

    it("records runtime_ms", async () => {
      const result = await okumaMacroConverterBridgeEngine.convert("G0 X0", {
        pythonBinary: "ghost",
        converterPath: "H:/ghost/convert.py",
      });
      expect(result.runtime_ms).toBeGreaterThanOrEqual(0);
    });
  });

  // ── convertFile() ────────────────────────────────────────────────────

  describe("convertFile()", () => {
    it("returns error for missing file", async () => {
      const result = await okumaMacroConverterBridgeEngine.convertFile(
        "H:/ghost_program.min"
      );
      expect(result.supported).toBe(false);
      expect(result.error).toContain("not found");
      expect(result.runner).toBe("none");
    });
  });

  // ── getStats() ────────────────────────────────────────────────────────

  describe("getStats()", () => {
    it("reports default paths + capabilities", () => {
      const stats = okumaMacroConverterBridgeEngine.getStats();
      expect(stats.default_python_binary).toBeDefined();
      expect(stats.default_converter_path).toContain("convert.py");
      expect(stats.fallback_handles.length).toBeGreaterThan(0);
      expect(stats.fallback_limitations.length).toBeGreaterThan(0);
    });
  });
});
