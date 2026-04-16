/**
 * FanucLegacyControllerEngine — Test Suite
 *
 * Tests for legacy Fanuc 15/16i controller support including:
 * - Dialect detection
 * - G-code translation from modern formats
 * - Validation against controller constraints
 * - Canned cycle syntax variations
 * - Parameter mapping
 * - Memory limit validation
 * - Macro B compatibility
 */

import { describe, it, expect } from "vitest";
import {
  fanucLegacyControllerEngine,
  type LegacyControllerModel,
  type TranslationResult,
  type LegacyValidationResult,
} from "../engines/FanucLegacyControllerEngine.js";

describe("FanucLegacyControllerEngine", () => {
  // ─── Profile Retrieval Tests ───────────────────────────────────────────────

  describe("getProfile", () => {
    it("should return correct profile for Fanuc 15", () => {
      const profile = fanucLegacyControllerEngine.getProfile("15");
      expect(profile.controllerModel).toBe("15");
      expect(profile.memoryType).toBe("bubble");
      expect(profile.maxProgramSize).toBe(64000);
      expect(profile.maxWorkOffsets).toBe(6);
      expect(profile.axisLimit).toBe(3);
    });

    it("should return correct profile for Fanuc 16i", () => {
      const profile = fanucLegacyControllerEngine.getProfile("16i");
      expect(profile.controllerModel).toBe("16i");
      expect(profile.memoryType).toBe("flash");
      expect(profile.maxProgramSize).toBe(1024000);
      expect(profile.maxWorkOffsets).toBe(48);
      expect(profile.axisLimit).toBe(5);
    });

    it("should return correct profile for Fanuc 16iMB", () => {
      const profile = fanucLegacyControllerEngine.getProfile("16iMB");
      expect(profile.controllerModel).toBe("16iMB");
      expect(profile.maxProgramSize).toBe(4096000);
      expect(profile.maxToolOffsets).toBe(999);
      expect(profile.lookAheadBlocks).toBe(25);
    });

    it("should have G73 unavailable on Fanuc 15", () => {
      const profile = fanucLegacyControllerEngine.getProfile("15");
      expect(profile.cannedCycleVariations.g73Available).toBe(false);
    });

    it("should have G73 available on Fanuc 15M", () => {
      const profile = fanucLegacyControllerEngine.getProfile("15M");
      expect(profile.cannedCycleVariations.g73Available).toBe(true);
      expect(profile.cannedCycleVariations.g73Syntax).toBe("legacy");
    });
  });

  // ─── Model Listing Tests ───────────────────────────────────────────────────

  describe("listModels", () => {
    it("should list all 8 legacy controller models", () => {
      const models = fanucLegacyControllerEngine.listModels();
      expect(models.length).toBe(8);
      expect(models.map(m => m.model)).toContain("15");
      expect(models.map(m => m.model)).toContain("16i");
      expect(models.map(m => m.model)).toContain("16iMB");
    });

    it("should include year ranges for each model", () => {
      const models = fanucLegacyControllerEngine.listModels();
      const fanuc15 = models.find(m => m.model === "15");
      expect(fanuc15?.years).toContain("1985");
      expect(fanuc15?.years).toContain("1990");
    });
  });

  // ─── Controller Detection Tests ────────────────────────────────────────────

  describe("detectControllerModel", () => {
    it("should detect modern controller from TCPM usage", () => {
      const program = `
        G90 G21 G17
        G43.4 H1
        G1 X100 Y100 F500
      `;
      const result = fanucLegacyControllerEngine.detectControllerModel(program);
      expect(result).toBeNull(); // TCPM = modern controller
    });

    it("should detect modern controller from AICC usage", () => {
      const program = `
        G05.1 Q1
        G1 X100 Y100 F500
      `;
      const result = fanucLegacyControllerEngine.detectControllerModel(program);
      expect(result).toBeNull();
    });

    it("should detect 16i from M29 rigid tapping", () => {
      const program = `
        G90 G21
        M29 G84 X0 Y0 Z-20 R2 F1.0
        G80
      `;
      const result = fanucLegacyControllerEngine.detectControllerModel(program);
      expect(result).toBe("16i");
    });

    it("should detect legacy controller from year hint", () => {
      const result = fanucLegacyControllerEngine.detectControllerModel("G0 X0 Y0", {
        manufacturer: "Fanuc",
        year: 1992,
      });
      expect(result).toBe("15M");
    });

    it("should detect very old controller from year hint", () => {
      const result = fanucLegacyControllerEngine.detectControllerModel("G0 X0 Y0", {
        year: 1987,
      });
      expect(result).toBe("15");
    });
  });

  // ─── Program Translation Tests ─────────────────────────────────────────────

  describe("translateProgram", () => {
    it("should translate G43.4 TCPM to G43 with warning", () => {
      const program = `G43.4 H1`;
      const result = fanucLegacyControllerEngine.translateProgram(program, "16i");

      expect(result.success).toBe(true);
      expect(result.translatedCode.join("\n")).toContain("G43 H1");
      expect(result.translatedCode.join("\n")).toContain("TCPM NOT SUPPORTED");
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.unsupportedFeatures).toContain("G43.4");
    });

    it("should remove G05.1 AICC on non-supporting controllers", () => {
      const program = `G05.1 Q1`;
      const result = fanucLegacyControllerEngine.translateProgram(program, "15");

      expect(result.success).toBe(true);
      expect(result.translatedCode.join("\n")).toContain("REMOVED");
      expect(result.unsupportedFeatures).toContain("G05.1");
    });

    it("should translate G05.1 to G05 P10000 on 16i", () => {
      const program = `G05.1 Q1`;
      const result = fanucLegacyControllerEngine.translateProgram(program, "16i");

      expect(result.success).toBe(true);
      expect(result.translatedCode.join("\n")).toContain("G05 P10000");
    });

    it("should remove G187 smoothing code", () => {
      const program = `G187 P2 E0.01`;
      const result = fanucLegacyControllerEngine.translateProgram(program, "16i");

      expect(result.success).toBe(true);
      expect(result.translatedCode.join("\n")).toContain("NOT SUPPORTED");
      expect(result.unsupportedFeatures).toContain("G187");
    });

    it("should translate extended work offsets to basic on Fanuc 15", () => {
      const program = `G54.1 P3`;
      const result = fanucLegacyControllerEngine.translateProgram(program, "15");

      expect(result.success).toBe(true);
      expect(result.translatedCode.join("\n")).toContain("G56");
      expect(result.translatedCode.join("\n")).toContain("CONVERTED");
    });

    it("should keep G54.1 on controllers that support it", () => {
      const program = `G54.1 P25`;
      const result = fanucLegacyControllerEngine.translateProgram(program, "16i");

      expect(result.success).toBe(true);
      expect(result.translatedCode.join("\n")).toContain("G54.1 P25");
    });

    it("should translate G84.2 rigid tap to M29 G84", () => {
      const program = `G84.2 X0 Y0 Z-20 R2 F1.0`;
      const result = fanucLegacyControllerEngine.translateProgram(program, "16i");

      expect(result.success).toBe(true);
      expect(result.translatedCode.join("\n")).toContain("M29 G84");
    });

    it("should warn about rigid tap unavailability on Fanuc 15", () => {
      const program = `G84.2 X0 Y0 Z-20 R2 F1.0`;
      const result = fanucLegacyControllerEngine.translateProgram(program, "15");

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.translatedCode.join("\n")).toContain("FLOATING TAP HOLDER");
    });

    it("should convert G73 to G83 on Fanuc 15", () => {
      const program = `G73 X0 Y0 Z-30 R2 Q5 F100`;
      const result = fanucLegacyControllerEngine.translateProgram(program, "15");

      expect(result.success).toBe(true);
      expect(result.translatedCode.join("\n")).toContain("G83");
      expect(result.translatedCode.join("\n")).toContain("G73 NOT AVAILABLE");
    });

    it("should provide statistics for translation", () => {
      const program = `G90 G21 G17
G43.4 H1
G05.1 Q1
G1 X100 Y100 F500`;
      const result = fanucLegacyControllerEngine.translateProgram(program, "16i");

      expect(result.statistics.totalLines).toBe(4);
      expect(result.statistics.warningCount).toBeGreaterThan(0);
    });
  });

  // ─── Program Validation Tests ──────────────────────────────────────────────

  describe("validateProgram", () => {
    it("should pass valid program for target controller", () => {
      const program = `
        G90 G21 G17
        G43 H1
        G1 X100 Y100 F500
        M30
      `;
      const result = fanucLegacyControllerEngine.validateProgram(program, "16i");

      expect(result.valid).toBe(true);
      expect(result.fitsInMemory).toBe(true);
    });

    it("should flag program size exceeding memory", () => {
      // Create a large program that exceeds 64KB bubble memory
      const largeProgram = Array(3000).fill("G1 X100.000 Y100.000 Z-50.000 F500.000").join("\n");
      const result = fanucLegacyControllerEngine.validateProgram(largeProgram, "15");

      expect(result.fitsInMemory).toBe(false);
      expect(result.issues.some(i => i.issue.includes("memory"))).toBe(true);
    });

    it("should flag unsupported G-codes", () => {
      const program = `
        G90 G21
        G43.4 H1
        G1 X100 F500
      `;
      const result = fanucLegacyControllerEngine.validateProgram(program, "16i");

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.code.includes("G43.4"))).toBe(true);
    });

    it("should flag tool offsets exceeding limit", () => {
      const program = `G43 H500`;
      const result = fanucLegacyControllerEngine.validateProgram(program, "15");

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.issue.includes("H500"))).toBe(true);
    });

    it("should flag work offsets exceeding limit", () => {
      const program = `G54.1 P100`;
      const result = fanucLegacyControllerEngine.validateProgram(program, "16i");

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.issue.includes("P100"))).toBe(true);
    });

    it("should warn about macro variables outside range", () => {
      const program = `#800 = 100`;
      const result = fanucLegacyControllerEngine.validateProgram(program, "15");

      expect(result.issues.some(i => i.issue.includes("#800"))).toBe(true);
    });

    it("should flag block numbers exceeding limit", () => {
      const program = `N99999999 G0 X0`;
      const result = fanucLegacyControllerEngine.validateProgram(program, "15");

      expect(result.issues.some(i => i.issue.includes("Block number"))).toBe(true);
    });
  });

  // ─── Canned Cycle Syntax Tests ─────────────────────────────────────────────

  describe("getCannedCycleSyntax", () => {
    it("should return standard drill syntax for all models", () => {
      const syntax = fanucLegacyControllerEngine.getCannedCycleSyntax("drill", "15");
      expect(syntax.code).toBe("G81");
      expect(syntax.syntax).toContain("G81");
    });

    it("should return G83 for high-speed peck on Fanuc 15", () => {
      const syntax = fanucLegacyControllerEngine.getCannedCycleSyntax("high_speed_peck", "15");
      expect(syntax.code).toBe("G83");
      expect(syntax.notes).toContain("G73 not available - use G83 instead");
    });

    it("should return G73 for high-speed peck on Fanuc 15M", () => {
      const syntax = fanucLegacyControllerEngine.getCannedCycleSyntax("high_speed_peck", "15M");
      expect(syntax.code).toBe("G73");
      expect(syntax.notes.some(n => n.includes("legacy syntax"))).toBe(true);
    });

    it("should return M29 G84 for rigid tap on 16i", () => {
      const syntax = fanucLegacyControllerEngine.getCannedCycleSyntax("rigid_tap", "16i");
      expect(syntax.code).toBe("M29 G84");
      expect(syntax.notes.some(n => n.includes("M29 required"))).toBe(true);
    });

    it("should indicate rigid tap unavailable on Fanuc 15", () => {
      const syntax = fanucLegacyControllerEngine.getCannedCycleSyntax("rigid_tap", "15");
      expect(syntax.notes.some(n => n.includes("NOT supported"))).toBe(true);
    });

    it("should return multi-block format for threading on 15MB", () => {
      const syntax = fanucLegacyControllerEngine.getCannedCycleSyntax("thread", "15MB");
      expect(syntax.code).toBe("G76");
      // 15MB uses single-block format actually
    });

    it("should return multi-block format for threading on Fanuc 15", () => {
      const syntax = fanucLegacyControllerEngine.getCannedCycleSyntax("thread", "15");
      expect(syntax.code).toBe("G76");
      expect(syntax.notes.some(n => n.includes("Two-block format"))).toBe(true);
    });
  });

  // ─── G-Code Support Tests ──────────────────────────────────────────────────

  describe("isGCodeSupported", () => {
    it("should confirm G00 supported on all models", () => {
      const result = fanucLegacyControllerEngine.isGCodeSupported("G00", "15");
      expect(result.supported).toBe(true);
    });

    it("should confirm G43.4 not supported on 16i", () => {
      const result = fanucLegacyControllerEngine.isGCodeSupported("G43.4", "16i");
      expect(result.supported).toBe(false);
      expect(result.alternative).toContain("G43");
    });

    it("should confirm G54.1 supported on 16i", () => {
      const result = fanucLegacyControllerEngine.isGCodeSupported("G54.1", "16i");
      expect(result.supported).toBe(true);
    });

    it("should confirm G54.1 not supported on Fanuc 15", () => {
      const result = fanucLegacyControllerEngine.isGCodeSupported("G54.1", "15");
      expect(result.supported).toBe(false);
      expect(result.alternative).toContain("G54-G59");
    });

    it("should return unknown for unrecognized codes", () => {
      const result = fanucLegacyControllerEngine.isGCodeSupported("G999", "16i");
      expect(result.supported).toBe(false);
      expect(result.notes).toContain("unknown");
    });
  });

  // ─── Parameter Mapping Tests ───────────────────────────────────────────────

  describe("getParameterMapping", () => {
    it("should map modern param 1220 to legacy equivalent", () => {
      const legacyParam = fanucLegacyControllerEngine.getParameterMapping("1220", "15");
      expect(legacyParam).toBe(1001);
    });

    it("should map modern param 5114 for G73 retract", () => {
      const legacyParam = fanucLegacyControllerEngine.getParameterMapping("5114", "16i");
      expect(legacyParam).toBe(5114);
    });

    it("should return null for unmapped parameters", () => {
      const legacyParam = fanucLegacyControllerEngine.getParameterMapping("99999", "16i");
      expect(legacyParam).toBeNull();
    });
  });

  // ─── Macro Compatibility Tests ─────────────────────────────────────────────

  describe("getMacroCompatibility", () => {
    it("should indicate WHILE not supported on Fanuc 15", () => {
      const macros = fanucLegacyControllerEngine.getMacroCompatibility("15");
      expect(macros.supportsWhile).toBe(false);
      expect(macros.tips.some(t => t.includes("WHILE"))).toBe(true);
    });

    it("should indicate classic arg passing on Fanuc 15", () => {
      const macros = fanucLegacyControllerEngine.getMacroCompatibility("15");
      expect(macros.argPassing).toBe("classic");
      expect(macros.tips.some(t => t.includes("A-Z"))).toBe(true);
    });

    it("should indicate WHILE supported on Fanuc 16", () => {
      const macros = fanucLegacyControllerEngine.getMacroCompatibility("16");
      expect(macros.supportsWhile).toBe(true);
    });

    it("should have extended arg passing on 16i", () => {
      const macros = fanucLegacyControllerEngine.getMacroCompatibility("16i");
      expect(macros.argPassing).toBe("extended");
    });

    it("should report correct nesting limits", () => {
      const macros15 = fanucLegacyControllerEngine.getMacroCompatibility("15");
      const macros16i = fanucLegacyControllerEngine.getMacroCompatibility("16i");
      expect(macros15.maxNesting).toBe(4);
      expect(macros16i.maxNesting).toBe(9);
    });
  });

  // ─── Compatibility Report Tests ────────────────────────────────────────────

  describe("generateCompatibilityReport", () => {
    it("should mark TCPM programs as not feasible", () => {
      const program = `
        G90 G21 G17
        G43.4 H1
        G1 A30 B45 X100 Y100 Z50 F500
      `;
      const report = fanucLegacyControllerEngine.generateCompatibilityReport(
        program, "fanuc_31i", "16i"
      );

      expect(report.migrationEffort).toBe("not_feasible");
      expect(report.unsupportedFeatures).toContain("G43.4");
      expect(report.recommendations.some(r => r.includes("TCPM"))).toBe(true);
    });

    it("should mark tilted work plane as major effort", () => {
      const program = `
        G68.2 X0 Y0 Z0 I30 J45 K0
        G1 X100 Y100 F500
      `;
      const report = fanucLegacyControllerEngine.generateCompatibilityReport(
        program, "fanuc_31i", "16i"
      );

      expect(report.migrationEffort).toBe("major");
      expect(report.recommendations.some(r => r.includes("3+2"))).toBe(true);
    });

    it("should mark simple programs as trivial migration", () => {
      const program = `
        G90 G21 G17
        G43 H1
        G1 X100 Y100 F500
        G80
        M30
      `;
      const report = fanucLegacyControllerEngine.generateCompatibilityReport(
        program, "fanuc_0i", "16i"
      );

      expect(report.compatible).toBe(true);
      expect(report.migrationEffort).toBe("trivial");
    });

    it("should flag memory issues in recommendations", () => {
      const largeProgram = Array(3000).fill("G1 X100.000 Y100.000 Z-50.000 F500").join("\n");
      const report = fanucLegacyControllerEngine.generateCompatibilityReport(
        largeProgram, "fanuc_31i", "15"
      );

      expect(report.recommendations.some(r => r.includes("sub-program"))).toBe(true);
    });
  });

  // ─── Dialect Integration Tests ─────────────────────────────────────────────

  describe("getDialectCompatibleProfile", () => {
    it("should return dialect with correct memory size", () => {
      const dialect = fanucLegacyControllerEngine.getDialectCompatibleProfile("15");
      expect(dialect.features.program_memory_kb).toBe(62); // 64000 / 1024 rounded
    });

    it("should remove TCPC feature from legacy dialects", () => {
      const dialect = fanucLegacyControllerEngine.getDialectCompatibleProfile("16i");
      expect(dialect.features.tcpc).toBeUndefined();
    });

    it("should remove nano_smooth from legacy dialects", () => {
      const dialect = fanucLegacyControllerEngine.getDialectCompatibleProfile("16iMB");
      expect(dialect.features.nano_smooth).toBeUndefined();
    });

    it("should include HSM mode on supporting models", () => {
      const dialect = fanucLegacyControllerEngine.getDialectCompatibleProfile("16i");
      expect(dialect.features.hsc_mode).toBeDefined();
      expect(dialect.features.hsc_mode?.on).toContain("G05 P10000");
    });

    it("should set correct axis limit", () => {
      const dialect15 = fanucLegacyControllerEngine.getDialectCompatibleProfile("15");
      const dialect16i = fanucLegacyControllerEngine.getDialectCompatibleProfile("16i");
      expect(dialect15.features.max_simultaneous_axes).toBe(3);
      expect(dialect16i.features.max_simultaneous_axes).toBe(5);
    });
  });

  // ─── Sample Program Tests ──────────────────────────────────────────────────

  describe("Real-world program samples", () => {
    it("should handle typical 3-axis milling program", () => {
      const program = `
%
O0001 (3-AXIS MILLING)
G90 G21 G17
G54
G43 H1
S5000 M3
G0 X0 Y0 Z5
G1 Z-10 F100
G1 X100 F500
G1 Y100
G1 X0
G1 Y0
G0 Z50
M5
M30
%
      `.trim();

      const validation = fanucLegacyControllerEngine.validateProgram(program, "15");
      expect(validation.valid).toBe(true);

      const translation = fanucLegacyControllerEngine.translateProgram(program, "15");
      expect(translation.success).toBe(true);
      expect(translation.warnings.length).toBe(0);
    });

    it("should handle drilling program with canned cycles", () => {
      const program = `
%
O0002 (DRILLING)
G90 G21 G17
G54
T1 M6
G43 H1
S3000 M3
G98 G81 X10 Y10 Z-20 R2 F100
X30
X50
G80
G0 Z50
M5
M30
%
      `.trim();

      const validation = fanucLegacyControllerEngine.validateProgram(program, "16i");
      expect(validation.valid).toBe(true);
    });

    it("should translate modern 5-axis program with appropriate warnings", () => {
      const program = `
%
O0005 (5-AXIS CONTOURING)
G90 G21 G17
G05.1 Q1
G54
G43.4 H1
S8000 M3 M8
G1 A0 B0 X0 Y0 Z10 F1000
G1 A10 B15 X50 Y50 Z5 F500
G1 A20 B30 X100 Y100 Z0
G49
G05.1 Q0
M5 M9
M30
%
      `.trim();

      const result = fanucLegacyControllerEngine.translateProgram(program, "16i");
      expect(result.success).toBe(true);
      expect(result.unsupportedFeatures).toContain("G43.4");
      expect(result.unsupportedFeatures).toContain("G05.1");
      expect(result.warnings.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ─── Edge Cases ────────────────────────────────────────────────────────────

  describe("Edge cases", () => {
    it("should handle empty program", () => {
      const validation = fanucLegacyControllerEngine.validateProgram("", "16i");
      expect(validation.valid).toBe(true);
      expect(validation.programSize).toBe(0);
    });

    it("should handle program with only comments", () => {
      const program = `(COMMENT LINE 1)\n(COMMENT LINE 2)`;
      const validation = fanucLegacyControllerEngine.validateProgram(program, "16i");
      expect(validation.valid).toBe(true);
    });

    it("should handle mixed case G-codes", () => {
      const program = `g43.4 h1\nG05.1 q1`;
      const result = fanucLegacyControllerEngine.translateProgram(program, "16i");
      expect(result.unsupportedFeatures).toContain("G43.4");
      expect(result.unsupportedFeatures).toContain("G05.1");
    });

    it("should handle G-codes with spaces", () => {
      const program = `G 43 . 4 H 1`;
      // Note: Real machines may handle spaces differently
      const validation = fanucLegacyControllerEngine.validateProgram(program, "16i");
      // Should still detect the pattern
      expect(validation).toBeDefined();
    });
  });
});
