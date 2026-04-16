/**
 * SiemensLegacyControllerEngine.test.ts
 *
 * Comprehensive tests for Siemens 810D legacy controller support
 *
 * Test coverage:
 * - Profile generation for different machine types
 * - G-code translation from 840D to 810D
 * - CYCLE800 translation to manual positioning
 * - CYCLE832 HSM → G64x conversion
 * - Unsupported feature detection and workarounds
 * - Validation for 810D compatibility
 */

import { describe, it, expect } from "vitest";
import {
  siemensLegacyControllerEngine,
  type Siemens810DProfile,
  type MachineType810D,
} from "../engines/SiemensLegacyControllerEngine.js";

describe("SiemensLegacyControllerEngine", () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // Profile Generation Tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe("getProfile", () => {
    it("should generate correct profile for 3-axis mill", () => {
      const profile = siemensLegacyControllerEngine.getProfile("3_axis_mill");

      expect(profile.maxAxes).toBe(3);
      expect(profile.hasShopMill).toBe(true);
      expect(profile.hasShopTurn).toBe(false);
      expect(profile.supportedCycles).toContain("CYCLE81");
      expect(profile.supportedCycles).toContain("POCKET1");
      expect(profile.unsupportedFeatures).toContain("TRAORI");
      expect(profile.unsupportedFeatures).toContain("TRANSMIT");
    });

    it("should generate correct profile for 4-axis lathe", () => {
      const profile = siemensLegacyControllerEngine.getProfile("4_axis_lathe");

      expect(profile.maxAxes).toBe(4);
      expect(profile.hasShopMill).toBe(false);
      expect(profile.hasShopTurn).toBe(true);
      expect(profile.supportsThreading).toBe(true);
      expect(profile.supportsRigidTapping).toBe(true);
      // Lathe-specific cycles added
      expect(profile.supportedCycles).toContain("CYCLE95");
      expect(profile.supportedCycles).toContain("CYCLE96");
    });

    it("should generate correct profile for mill-turn basic", () => {
      const profile = siemensLegacyControllerEngine.getProfile("mill_turn_basic");

      expect(profile.maxAxes).toBe(5);
      expect(profile.hasShopMill).toBe(true);
      expect(profile.hasShopTurn).toBe(true);
    });

    it("should apply NCK version capabilities correctly", () => {
      const profile31 = siemensLegacyControllerEngine.getProfile(
        "3_axis_mill",
        "3.1"
      );
      const profile35 = siemensLegacyControllerEngine.getProfile(
        "3_axis_mill",
        "3.5"
      );

      expect(profile31.lookAheadBlocks).toBe(40);
      expect(profile31.blockProcessingRate).toBe(800);

      expect(profile35.lookAheadBlocks).toBe(100);
      expect(profile35.blockProcessingRate).toBe(2000);
    });

    it("should default to NCK 3.4 for unknown versions", () => {
      const profile = siemensLegacyControllerEngine.getProfile(
        "3_axis_mill",
        "unknown"
      );

      expect(profile.lookAheadBlocks).toBe(80); // 3.4 default
      expect(profile.blockProcessingRate).toBe(1500);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Translation Tests - Unsupported Features
  // ═══════════════════════════════════════════════════════════════════════════

  describe("translateTo810D - Unsupported Features", () => {
    const profile = siemensLegacyControllerEngine.getProfile("3_axis_mill");

    it("should error on TRAORI 5-axis transformation", () => {
      const gcode = ["TRAORI(1)", "G1 X100 A3=0 B3=0 C3=1", "TRAFOOF"];
      const result = siemensLegacyControllerEngine.translateTo810D(
        gcode,
        profile
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("TRAORI");
      expect(result.errors[0]).toContain("840D sl");
    });

    it("should warn and provide workaround for TRANSMIT", () => {
      const gcode = ["TRANSMIT", "G1 X50 Y30", "TRAFOOF"];
      const result = siemensLegacyControllerEngine.translateTo810D(
        gcode,
        profile
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes("TRANSMIT"))).toBe(true);
      expect(result.workarounds.length).toBeGreaterThan(0);
      expect(result.workarounds[0].original).toContain("TRANSMIT");
      expect(result.workarounds[0].confidence).toBeLessThan(1);
    });

    it("should warn and convert COMPCAD to comment", () => {
      const gcode = ["COMPCAD", "G1 X100 F2000"];
      const result = siemensLegacyControllerEngine.translateTo810D(
        gcode,
        profile
      );

      expect(result.success).toBe(true);
      expect(result.warnings.some((w) => w.includes("COMPCAD"))).toBe(true);
      expect(result.translatedCode.some((l) => l.includes("compressor"))).toBe(
        true
      );
    });

    it("should error on CUT3DC 3D cutter compensation", () => {
      const gcode = ["CUT3DC", "G1 X100 Z50"];
      const result = siemensLegacyControllerEngine.translateTo810D(
        gcode,
        profile
      );

      expect(result.warnings.some((w) => w.includes("CUT3DC"))).toBe(true);
      expect(result.workarounds.some((w) => w.workaround === "CUT2D")).toBe(true);
    });

    it("should remove FFWON feedforward with warning", () => {
      const gcode = ["FFWON", "G1 X100 F5000"];
      const result = siemensLegacyControllerEngine.translateTo810D(
        gcode,
        profile
      );

      expect(result.warnings.some((w) => w.includes("FFWON"))).toBe(true);
      expect(result.warnings.some((w) => w.includes("feedforward"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CYCLE800 Translation Tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe("translateCycle800", () => {
    it("should translate CYCLE800 to manual positioning on NCK 3.1", () => {
      const profile = siemensLegacyControllerEngine.getProfile(
        "4_axis_mill",
        "3.1"
      );
      const cycle800 =
        'CYCLE800(0,"TC_CARR1",0,0,0,45,30,0,0,0,0,0,1)';

      const result = siemensLegacyControllerEngine.translateCycle800(
        cycle800,
        profile
      );

      expect(result.positioningCommands.length).toBeGreaterThan(0);
      expect(result.positioningCommands.some((l) => l.includes("A=45"))).toBe(
        true
      );
      expect(result.positioningCommands.some((l) => l.includes("B=30"))).toBe(
        true
      );
      expect(result.notes.some((n) => n.includes("manual"))).toBe(true);
    });

    it("should pass through CYCLE800 on NCK 3.4+ with basic support", () => {
      const profile = siemensLegacyControllerEngine.getProfile(
        "4_axis_mill",
        "3.4"
      );
      const cycle800 = 'CYCLE800(0,"",0,0,0,45,0,0,0,0,0,0,1)';

      const result = siemensLegacyControllerEngine.translateCycle800(
        cycle800,
        profile
      );

      // Should pass through but with verification note
      expect(result.positioningCommands.some((l) => l.includes("CYCLE800"))).toBe(
        true
      );
      expect(result.notes.some((n) => n.includes("verify"))).toBe(true);
    });

    it("should generate safety retract on older NCK versions", () => {
      const profile = siemensLegacyControllerEngine.getProfile(
        "4_axis_mill",
        "3.2"
      );
      const cycle800 = 'CYCLE800(0,"",0,0,0,30,0,90,0,0,0,0,1)';

      const result = siemensLegacyControllerEngine.translateCycle800(
        cycle800,
        profile
      );

      expect(result.safetyRetract.length).toBeGreaterThan(0);
      expect(result.safetyRetract.some((l) => l.includes("_MAXZ"))).toBe(true);
      expect(result.safetyRetract.some((l) => l.includes("M5"))).toBe(true);
    });

    it("should handle C-axis only rotation", () => {
      const profile = siemensLegacyControllerEngine.getProfile(
        "3_axis_lathe",
        "3.2"
      );
      const cycle800 = 'CYCLE800(0,"",0,0,0,0,0,45,0,0,0,0,1)';

      const result = siemensLegacyControllerEngine.translateCycle800(
        cycle800,
        profile
      );

      expect(result.positioningCommands.some((l) => l.includes("C=45"))).toBe(
        true
      );
    });

    it("should handle parse errors gracefully", () => {
      const profile = siemensLegacyControllerEngine.getProfile("3_axis_mill");
      const invalidCycle800 = "CYCLE800 MALFORMED"; // Missing parentheses

      const result = siemensLegacyControllerEngine.translateCycle800(
        invalidCycle800,
        profile
      );

      // Should have warning in notes about parsing issue
      expect(result.notes.some((n) => n.toLowerCase().includes("parse"))).toBe(true);
      // Should have fallback positioning command
      expect(result.positioningCommands.some((l) => l.includes("manual"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CYCLE832 HSM Translation Tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe("translateTo810D - CYCLE832 HSM", () => {
    it("should convert CYCLE832 to G643 on NCK 3.5", () => {
      const profile = siemensLegacyControllerEngine.getProfile(
        "3_axis_mill",
        "3.5"
      );
      const gcode = ["CYCLE832(0.01,1)", "G1 X100 F5000"];

      const result = siemensLegacyControllerEngine.translateTo810D(
        gcode,
        profile
      );

      expect(result.translatedCode.some((l) => l.includes("G643"))).toBe(true);
      expect(result.translatedCode.some((l) => l.includes("ADIS=0.01"))).toBe(
        true
      );
    });

    it("should convert CYCLE832 to G642 on NCK 3.4", () => {
      const profile = siemensLegacyControllerEngine.getProfile(
        "3_axis_mill",
        "3.4"
      );
      const gcode = ["CYCLE832(0.02,1)"];

      const result = siemensLegacyControllerEngine.translateTo810D(
        gcode,
        profile
      );

      expect(result.translatedCode.some((l) => l.includes("G642"))).toBe(true);
    });

    it("should convert CYCLE832 to G641 on NCK 3.2", () => {
      const profile = siemensLegacyControllerEngine.getProfile(
        "3_axis_mill",
        "3.2"
      );
      const gcode = ["CYCLE832(0.05,1)"];

      const result = siemensLegacyControllerEngine.translateTo810D(
        gcode,
        profile
      );

      expect(result.translatedCode.some((l) => l.includes("G641"))).toBe(true);
    });

    it("should convert CYCLE832 cancel to G60", () => {
      const profile = siemensLegacyControllerEngine.getProfile("3_axis_mill");
      const gcode = ["CYCLE832()"];

      const result = siemensLegacyControllerEngine.translateTo810D(
        gcode,
        profile
      );

      expect(result.translatedCode.some((l) => l.includes("G60"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // G64x Look-Ahead Translation Tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe("translateTo810D - G64x Look-Ahead", () => {
    it("should downgrade G643 to G642 on NCK 3.4", () => {
      const profile = siemensLegacyControllerEngine.getProfile(
        "3_axis_mill",
        "3.4"
      );
      const gcode = ["G643"];

      const result = siemensLegacyControllerEngine.translateTo810D(
        gcode,
        profile
      );

      expect(result.translatedCode.some((l) => l.includes("G642"))).toBe(true);
      expect(result.warnings.some((w) => w.includes("G643"))).toBe(true);
    });

    it("should downgrade G642 to G641 on NCK 3.2", () => {
      const profile = siemensLegacyControllerEngine.getProfile(
        "3_axis_mill",
        "3.2"
      );
      const gcode = ["G642"];

      const result = siemensLegacyControllerEngine.translateTo810D(
        gcode,
        profile
      );

      expect(result.translatedCode.some((l) => l.includes("G641"))).toBe(true);
    });

    it("should downgrade G641 to G64 on NCK 3.1", () => {
      const profile = siemensLegacyControllerEngine.getProfile(
        "3_axis_mill",
        "3.1"
      );
      const gcode = ["G641 ADIS=0.1"];

      const result = siemensLegacyControllerEngine.translateTo810D(
        gcode,
        profile
      );

      // Should start with G64 (the actual G-code, not a comment reference)
      expect(result.translatedCode.some((l) => l.startsWith("G64 "))).toBe(true);
      expect(result.warnings.some((w) => w.includes("G641"))).toBe(true);
    });

    it("should pass through G64x when supported", () => {
      const profile = siemensLegacyControllerEngine.getProfile(
        "3_axis_mill",
        "3.5"
      );
      const gcode = ["G643 ADIS=0.05"];

      const result = siemensLegacyControllerEngine.translateTo810D(
        gcode,
        profile
      );

      expect(result.translatedCode.some((l) => l.includes("G643"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Validation Tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe("validateFor810D", () => {
    it("should detect unsupported features", () => {
      const profile = siemensLegacyControllerEngine.getProfile("3_axis_mill");
      const gcode = [
        "G0 X100",
        "TRAORI(1)",
        "G1 X200 A3=0 B3=0 C3=1",
        "TRAFOOF",
      ];

      const validation = siemensLegacyControllerEngine.validateFor810D(
        gcode,
        profile
      );

      expect(validation.valid).toBe(false);
      expect(validation.issues.some((i) => i.includes("TRAORI"))).toBe(true);
    });

    it("should detect rotary axis on 3-axis machine", () => {
      const profile = siemensLegacyControllerEngine.getProfile("3_axis_mill");
      const gcode = ["G0 X100", "G0 A=45", "G1 X200"];

      const validation = siemensLegacyControllerEngine.validateFor810D(
        gcode,
        profile
      );

      expect(validation.valid).toBe(false);
      expect(validation.issues.some((i) => i.includes("Rotary axis"))).toBe(
        true
      );
    });

    it("should allow rotary axis on 4-axis machine", () => {
      const profile = siemensLegacyControllerEngine.getProfile("4_axis_mill");
      const gcode = ["G0 X100", "G0 A=45", "G1 X200"];

      const validation = siemensLegacyControllerEngine.validateFor810D(
        gcode,
        profile
      );

      expect(validation.issues.filter((i) => i.includes("Rotary axis"))).toHaveLength(0);
    });

    it("should warn about extended frame variables", () => {
      const profile = siemensLegacyControllerEngine.getProfile("3_axis_mill");
      const gcode = ["$P_UIFR[1,X,TR]=0"];

      const validation = siemensLegacyControllerEngine.validateFor810D(
        gcode,
        profile
      );

      expect(validation.issues.some((i) => i.includes("$P_UIFR"))).toBe(true);
    });

    it("should detect G643/G644 on older NCK", () => {
      const profile = siemensLegacyControllerEngine.getProfile(
        "3_axis_mill",
        "3.2"
      );
      const gcode = ["G643"];

      const validation = siemensLegacyControllerEngine.validateFor810D(
        gcode,
        profile
      );

      expect(validation.issues.some((i) => i.includes("G643"))).toBe(true);
    });

    it("should pass valid 810D program", () => {
      const profile = siemensLegacyControllerEngine.getProfile("3_axis_mill");
      const gcode = [
        "G90 G17 G40 G60 G80",
        "T1 M6",
        "D1",
        "G54",
        "G0 X0 Y0 Z100",
        "M3 S3000",
        "G0 Z5",
        "G1 Z-10 F200",
        "G1 X100 F1000",
        "G0 Z100",
        "M5",
        "M30",
      ];

      const validation = siemensLegacyControllerEngine.validateFor810D(
        gcode,
        profile
      );

      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Code Generation Tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Code Generation", () => {
    it("should generate correct safe start block", () => {
      const profile = siemensLegacyControllerEngine.getProfile("3_axis_mill");
      const safeStart =
        siemensLegacyControllerEngine.generateSafeStart(profile);

      expect(safeStart.some((l) => l.includes("G90"))).toBe(true);
      expect(safeStart.some((l) => l.includes("G17"))).toBe(true);
      expect(safeStart.some((l) => l.includes("G40"))).toBe(true);
      expect(safeStart.some((l) => l.includes("G54"))).toBe(true);
      expect(safeStart.some((l) => l.includes("D0"))).toBe(true);
    });

    it("should generate correct tool change sequence", () => {
      const profile = siemensLegacyControllerEngine.getProfile("3_axis_mill");
      const toolChange = siemensLegacyControllerEngine.generateToolChange(
        5,
        profile
      );

      expect(toolChange.some((l) => l.includes("T5"))).toBe(true);
      expect(toolChange.some((l) => l.includes("M6"))).toBe(true);
      expect(toolChange.some((l) => l.includes("D1"))).toBe(true);
    });

    it("should generate correct program end", () => {
      const profile = siemensLegacyControllerEngine.getProfile("3_axis_mill");
      const programEnd =
        siemensLegacyControllerEngine.generateProgramEnd(profile);

      expect(programEnd.some((l) => l.includes("M5"))).toBe(true);
      expect(programEnd.some((l) => l.includes("M9"))).toBe(true);
      expect(programEnd.some((l) => l.includes("M30"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Cycle Support Tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Cycle Support", () => {
    it("should correctly identify supported drilling cycles", () => {
      const profile = siemensLegacyControllerEngine.getProfile("3_axis_mill");

      expect(
        siemensLegacyControllerEngine.isCycleSupported("CYCLE81", profile)
      ).toBe(true);
      expect(
        siemensLegacyControllerEngine.isCycleSupported("CYCLE83", profile)
      ).toBe(true);
      expect(
        siemensLegacyControllerEngine.isCycleSupported("CYCLE84", profile)
      ).toBe(true);
    });

    it("should correctly identify supported milling cycles", () => {
      const profile = siemensLegacyControllerEngine.getProfile("3_axis_mill");

      expect(
        siemensLegacyControllerEngine.isCycleSupported("POCKET1", profile)
      ).toBe(true);
      expect(
        siemensLegacyControllerEngine.isCycleSupported("POCKET2", profile)
      ).toBe(true);
      expect(
        siemensLegacyControllerEngine.isCycleSupported("SLOT1", profile)
      ).toBe(true);
    });

    it("should identify lathe-specific cycles on lathe profile", () => {
      const profile = siemensLegacyControllerEngine.getProfile("4_axis_lathe");

      expect(
        siemensLegacyControllerEngine.isCycleSupported("CYCLE95", profile)
      ).toBe(true);
      expect(
        siemensLegacyControllerEngine.isCycleSupported("CYCLE96", profile)
      ).toBe(true);
    });

    it("should reject lathe cycles on mill profile", () => {
      const profile = siemensLegacyControllerEngine.getProfile("3_axis_mill");

      expect(
        siemensLegacyControllerEngine.isCycleSupported("CYCLE95", profile)
      ).toBe(false);
      expect(
        siemensLegacyControllerEngine.isCycleSupported("CYCLE96", profile)
      ).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Workaround and Documentation Tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Documentation and Workarounds", () => {
    it("should provide TRANSMIT workaround guidance", () => {
      const workaround =
        siemensLegacyControllerEngine.getTransmitWorkaround();

      expect(workaround.explanation).toContain("810D");
      expect(workaround.explanation).toContain("TRANSMIT");
      expect(workaround.example.length).toBeGreaterThan(0);
      expect(workaround.limitations.length).toBeGreaterThan(0);
      expect(
        workaround.limitations.some((l) => l.includes("pole avoidance"))
      ).toBe(true);
    });

    it("should list common 810D machines", () => {
      const machines =
        siemensLegacyControllerEngine.getCommon810DMachines();

      expect(machines.length).toBeGreaterThan(5);
      expect(machines.some((m) => m.manufacturer.includes("DMG"))).toBe(true);
      expect(machines.some((m) => m.manufacturer.includes("Index"))).toBe(true);
      expect(machines.some((m) => m.type === "3_axis_lathe")).toBe(true);
      expect(machines.some((m) => m.type === "4_axis_mill")).toBe(true);
    });

    it("should provide parameter differences documentation", () => {
      const params =
        siemensLegacyControllerEngine.getParameterDifferences();

      expect(params.length).toBeGreaterThan(0);
      expect(params.some((p) => p.category.includes("Axis"))).toBe(true);
      expect(params.some((p) => p.param810D.includes("MD"))).toBe(true);
      expect(params.some((p) => p.param840D.includes("$MA_"))).toBe(true);
    });

    it("should provide dialect formatting rules", () => {
      const rules = siemensLegacyControllerEngine.getDialectRules();

      expect(rules.length).toBeGreaterThan(5);
      expect(rules.some((r) => r.rule.includes("semicolon"))).toBe(true);
      expect(rules.some((r) => r.rule.includes("M30"))).toBe(true);
      expect(rules.some((r) => r.rule.includes("Tool"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Integration / End-to-End Tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe("End-to-End Translation", () => {
    it("should translate complete 840D program to 810D", () => {
      const profile = siemensLegacyControllerEngine.getProfile(
        "4_axis_mill",
        "3.4"
      );
      const gcode840D = [
        "; 840D Program",
        "CYCLE832(0.01,1)",
        'CYCLE800(0,"TC_CARR1",0,0,0,30,0,0,0,0,0,0,1)',
        "G0 X0 Y0 Z100",
        "T1 M6",
        "D1",
        "G54",
        "M3 S5000",
        "G0 X50 Y50",
        "G1 Z-5 F200",
        "G1 X100 F1000",
        "G642",
        "G1 X150 Y100",
        "G0 Z100",
        "CYCLE832()",
        "M30",
      ];

      const result = siemensLegacyControllerEngine.translateTo810D(
        gcode840D,
        profile
      );

      // Should be mostly successful (CYCLE800 passed through on 3.4)
      expect(result.success).toBe(true);

      // Should have G64x instead of CYCLE832 active call
      expect(result.translatedCode.some((l) => l.includes("G642"))).toBe(true);
      // CYCLE832() cancel converts to G60
      expect(result.translatedCode.some((l) => l.includes("G60"))).toBe(true);

      // Standard commands should pass through
      expect(result.translatedCode.some((l) => l.includes("T1 M6"))).toBe(true);
      expect(result.translatedCode.some((l) => l.includes("G54"))).toBe(true);
      expect(result.translatedCode.some((l) => l.includes("M30"))).toBe(true);

      // Should have warnings about HSM conversion
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should reject program with 5-axis simultaneous features", () => {
      const profile = siemensLegacyControllerEngine.getProfile("4_axis_mill");
      const gcode5axis = [
        "TRAORI(1)",
        "G1 X100 Y50 Z-10 A3=0 B3=0.5 C3=0.866 F1000",
        "TRAFOOF",
      ];

      const result = siemensLegacyControllerEngine.translateTo810D(
        gcode5axis,
        profile
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes("5-axis"))).toBe(true);
    });

    it("should handle mixed supported/unsupported features", () => {
      const profile = siemensLegacyControllerEngine.getProfile("3_axis_mill");
      const mixedGcode = [
        "G0 X0 Y0 Z100", // Supported
        "T1 M6", // Supported
        "COMPCAD", // Unsupported - warning
        "G1 X100 F1000", // Supported
        "FFWON", // Unsupported - warning
        "G1 X200", // Supported
        "M30", // Supported
      ];

      const result = siemensLegacyControllerEngine.translateTo810D(
        mixedGcode,
        profile
      );

      expect(result.success).toBe(true); // COMPCAD and FFWON don't block
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.workarounds.length).toBeGreaterThan(0);

      // Standard commands preserved
      expect(result.translatedCode.some((l) => l.includes("G0 X0 Y0 Z100"))).toBe(
        true
      );
      expect(result.translatedCode.some((l) => l.includes("T1 M6"))).toBe(true);
      expect(result.translatedCode.some((l) => l.includes("M30"))).toBe(true);
    });
  });
});
