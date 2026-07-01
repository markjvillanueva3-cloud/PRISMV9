/**
 * MitsubishiMV1200RWireEDMMasterPostEngine Tests
 *
 * Tests for JM Die's Mitsubishi MV1200R Wire EDM master post processor.
 * Covers:
 *   - G-code generation for profile cutting
 *   - Multi-pass skim strategy
 *   - Taper cutting (UV axes)
 *   - Physics checks (wire tension, flushing, energy)
 *   - Tribal knowledge application
 *   - Wire offset calculations
 *
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP-PP03
 */

import { describe, it, expect } from "vitest";
import {
  MitsubishiMV1200RWireEDMMasterPostEngine,
  mitsubishiMV1200RWireEDMMasterPostEngine,
  type WireEDMOperation,
  type MitsubishiWEDMPostConfig
} from "../engines/MitsubishiMV1200RWireEDMMasterPostEngine.js";

describe("MitsubishiMV1200RWireEDMMasterPostEngine", () => {
  const engine = new MitsubishiMV1200RWireEDMMasterPostEngine();

  describe("generateProgram", () => {
    it("should generate valid header for metric program", () => {
      const operations: WireEDMOperation[] = [{
        operation_type: "profile",
        pass: "rough",
        start_x: 0,
        start_y: 0,
        profile_points: [
          { x: 10, y: 0, type: "linear" },
          { x: 10, y: 10, type: "linear" },
          { x: 0, y: 10, type: "linear" },
          { x: 0, y: 0, type: "linear" }
        ],
        material: { name: "D2", hardness_hrc: 60, conductivity_class: "medium" },
        thickness_mm: 25,
        offset_direction: "left"
      }];

      const result = engine.generateProgram(operations, {
        program_number: "1001",
        program_comment: "TEST PART"
      });

      expect(result.gcode.length).toBeGreaterThan(0);
      expect(result.gcode[0]).toBe("%");
      expect(result.gcode[1]).toBe("O1001");
      expect(result.gcode).toContain("G21 (METRIC)");
      expect(result.gcode.some(l => l.includes("MITSUBISHI MV1200R"))).toBe(true);
    });

    it("should enable submerged mode when configured", () => {
      const operations: WireEDMOperation[] = [{
        operation_type: "profile",
        pass: "rough",
        start_x: 0,
        start_y: 0,
        profile_points: [{ x: 10, y: 10, type: "linear" }],
        material: { name: "S7", conductivity_class: "medium" },
        thickness_mm: 30,
        offset_direction: "left"
      }];

      const result = engine.generateProgram(operations, { submerged: true });

      // M800 dialect (default, matches JM Die real programs) uses M78 for tank fill.
      // Legacy M700V uses M28 — test against the dialect-appropriate raw code.
      const tankFill = engine.rawMCode({ program_number: "test" }, "tank_fill");
      expect(result.gcode.some(l => l.includes(tankFill))).toBe(true);
      expect(result.tribal_tips_applied.some(t => t.includes("Submerged"))).toBe(true);
    });

    it("should generate wire offset compensation codes", () => {
      const operations: WireEDMOperation[] = [{
        operation_type: "profile",
        pass: "rough",
        start_x: 5,
        start_y: 5,
        profile_points: [{ x: 20, y: 20, type: "linear" }],
        material: { name: "A2", conductivity_class: "medium" },
        thickness_mm: 20,
        offset_direction: "left"
      }];

      const result = engine.generateProgram(operations);

      expect(result.gcode.some(l => l.includes("G41"))).toBe(true); // Left offset
      expect(result.gcode.some(l => l.includes("G40"))).toBe(true); // Cancel offset
    });

    it("should generate right offset for right direction", () => {
      const operations: WireEDMOperation[] = [{
        operation_type: "profile",
        pass: "skim1",
        start_x: 0,
        start_y: 0,
        profile_points: [{ x: 15, y: 15, type: "linear" }],
        material: { name: "D2", conductivity_class: "medium" },
        thickness_mm: 25,
        offset_direction: "right"
      }];

      const result = engine.generateProgram(operations);

      expect(result.gcode.some(l => l.includes("G42"))).toBe(true); // Right offset
    });

    it("should include auto wire thread code", () => {
      const operations: WireEDMOperation[] = [{
        operation_type: "profile",
        pass: "rough",
        start_x: 0,
        start_y: 0,
        profile_points: [{ x: 10, y: 0, type: "linear" }],
        material: { name: "M2", conductivity_class: "medium" },
        thickness_mm: 15,
        offset_direction: "left"
      }];

      const result = engine.generateProgram(operations, { auto_wire_thread: true });

      // M800 dialect (default) uses M20 for wire thread; M700V uses M6.
      // Assert on the dialect-appropriate raw code.
      const wireThread = engine.rawMCode({ program_number: "test" }, "wire_thread");
      expect(result.gcode.some(l => l.includes(wireThread))).toBe(true);
    });

    it("should generate arc moves correctly", () => {
      const operations: WireEDMOperation[] = [{
        operation_type: "profile",
        pass: "rough",
        start_x: 0,
        start_y: 0,
        profile_points: [
          { x: 10, y: 0, type: "linear" },
          { x: 15, y: 5, r: 5, type: "arc_cw" },
          { x: 15, y: 10, type: "linear" }
        ],
        material: { name: "D2", conductivity_class: "medium" },
        thickness_mm: 20,
        offset_direction: "left"
      }];

      const result = engine.generateProgram(operations);

      expect(result.gcode.some(l => l.startsWith("G02"))).toBe(true);
    });

    it("should generate CCW arc moves", () => {
      const operations: WireEDMOperation[] = [{
        operation_type: "profile",
        pass: "skim2",
        start_x: 0,
        start_y: 0,
        profile_points: [
          { x: 10, y: 5, r: 5, type: "arc_ccw" }
        ],
        material: { name: "S7", conductivity_class: "medium" },
        thickness_mm: 25,
        offset_direction: "right"
      }];

      const result = engine.generateProgram(operations);

      expect(result.gcode.some(l => l.startsWith("G03"))).toBe(true);
    });
  });

  describe("taper cutting", () => {
    it("should enable taper mode for taper operations", () => {
      const operations: WireEDMOperation[] = [{
        operation_type: "taper",
        pass: "rough",
        start_x: 0,
        start_y: 0,
        profile_points: [
          { x: 10, y: 0, u: 0.5, v: 0, type: "linear" },
          { x: 10, y: 10, u: 0.5, v: 0.5, type: "linear" }
        ],
        material: { name: "D2", hardness_hrc: 60, conductivity_class: "medium" },
        thickness_mm: 30,
        taper_angle_deg: 5,
        taper_height_mm: 30,
        offset_direction: "left"
      }];

      const result = engine.generateProgram(operations);

      expect(result.gcode.some(l => l.includes("G51"))).toBe(true); // Taper on
      expect(result.gcode.some(l => l.includes("G50"))).toBe(true); // Taper off
      expect(result.tribal_tips_applied.some(t => t.includes("Taper"))).toBe(true);
    });

    it("should include UV coordinates in taper moves", () => {
      const operations: WireEDMOperation[] = [{
        operation_type: "taper",
        pass: "rough",
        start_x: 0,
        start_y: 0,
        profile_points: [
          { x: 20, y: 0, u: 1.0, v: 0, type: "linear" }
        ],
        material: { name: "A2", conductivity_class: "medium" },
        thickness_mm: 40,
        taper_angle_deg: 3,
        taper_height_mm: 40,
        offset_direction: "left"
      }];

      const result = engine.generateProgram(operations);

      expect(result.gcode.some(l => l.includes("U") && l.includes("V"))).toBe(true);
    });
  });

  describe("physics checks", () => {
    it("should check wire tension limits", () => {
      const operations: WireEDMOperation[] = [{
        operation_type: "profile",
        pass: "rough",
        start_x: 0,
        start_y: 0,
        profile_points: [{ x: 10, y: 10, type: "linear" }],
        material: { name: "D2", conductivity_class: "medium" },
        thickness_mm: 25,
        offset_direction: "left",
        wire: { diameter_mm: 0.25, type: "brass", tension_g: 1200, speed_m_min: 12 }
      }];

      const result = engine.generateProgram(operations);

      const tensionCheck = result.physics_checks.find(c => c.check.includes("Wire tension"));
      expect(tensionCheck).toBeDefined();
      expect(tensionCheck?.passed).toBe(true);
    });

    it("should warn on excessive wire tension", () => {
      const operations: WireEDMOperation[] = [{
        operation_type: "profile",
        pass: "rough",
        start_x: 0,
        start_y: 0,
        profile_points: [{ x: 10, y: 10, type: "linear" }],
        material: { name: "D2", conductivity_class: "medium" },
        thickness_mm: 25,
        offset_direction: "left",
        wire: { diameter_mm: 0.25, type: "brass", tension_g: 2000, speed_m_min: 12 }
      }];

      const result = engine.generateProgram(operations);

      const tensionCheck = result.physics_checks.find(c => c.check.includes("Wire tension"));
      expect(tensionCheck?.passed).toBe(false);
    });

    it("should check flushing for thick sections", () => {
      const operations: WireEDMOperation[] = [{
        operation_type: "profile",
        pass: "rough",
        start_x: 0,
        start_y: 0,
        profile_points: [{ x: 20, y: 20, type: "linear" }],
        material: { name: "D2", conductivity_class: "medium" },
        thickness_mm: 80,
        offset_direction: "left",
        flushing_pressure: 5
      }];

      const result = engine.generateProgram(operations);

      const flushCheck = result.physics_checks.find(c => c.check.includes("Thick section"));
      expect(flushCheck).toBeDefined();
      expect(flushCheck?.passed).toBe(false); // 5 < 8 recommended
    });

    it("should validate taper angle limits", () => {
      const operations: WireEDMOperation[] = [{
        operation_type: "taper",
        pass: "rough",
        start_x: 0,
        start_y: 0,
        profile_points: [{ x: 10, y: 10, type: "linear" }],
        material: { name: "D2", conductivity_class: "medium" },
        thickness_mm: 30,
        taper_angle_deg: 50, // Over limit
        offset_direction: "left"
      }];

      const result = engine.generateProgram(operations);

      const taperCheck = result.physics_checks.find(c => c.check.includes("Taper angle"));
      expect(taperCheck).toBeDefined();
      expect(taperCheck?.passed).toBe(false);
    });
  });

  describe("tribal knowledge", () => {
    it("should apply JM Die specific tips for submerged cutting", () => {
      const operations: WireEDMOperation[] = [{
        operation_type: "profile",
        pass: "rough",
        start_x: 0,
        start_y: 0,
        profile_points: [{ x: 10, y: 10, type: "linear" }],
        material: { name: "D2", conductivity_class: "medium" },
        thickness_mm: 25,
        offset_direction: "left"
      }];

      const result = engine.generateProgram(operations, { submerged: true });

      expect(result.tribal_tips_applied.length).toBeGreaterThan(0);
      expect(result.tribal_tips_applied.some(t => t.includes("JM Die"))).toBe(true);
    });

    it("should apply thick section flushing tips", () => {
      const operations: WireEDMOperation[] = [{
        operation_type: "profile",
        pass: "rough",
        start_x: 0,
        start_y: 0,
        profile_points: [{ x: 10, y: 10, type: "linear" }],
        material: { name: "S7", conductivity_class: "medium" },
        thickness_mm: 75,
        offset_direction: "left"
      }];

      const result = engine.generateProgram(operations);

      expect(result.tribal_tips_applied.some(t => t.includes("flush"))).toBe(true);
    });

    it("should apply surface finish tips for skim passes", () => {
      const operations: WireEDMOperation[] = [{
        operation_type: "profile",
        pass: "skim2",
        start_x: 0,
        start_y: 0,
        profile_points: [{ x: 10, y: 10, type: "linear" }],
        material: { name: "D2", hardness_hrc: 60, conductivity_class: "medium" },
        thickness_mm: 25,
        offset_direction: "left"
      }];

      const result = engine.generateProgram(operations);

      expect(result.tribal_tips_applied.some(t =>
        t.includes("Ra") || t.includes("surface") || t.includes("finish")
      )).toBe(true);
    });
  });

  describe("generateMultiPassProgram", () => {
    it("should generate rough + 1 skim for Ra < 3.2", () => {
      const baseOp = {
        operation_type: "profile" as const,
        start_x: 0,
        start_y: 0,
        profile_points: [
          { x: 10, y: 0, type: "linear" as const },
          { x: 10, y: 10, type: "linear" as const }
        ],
        material: { name: "D2", conductivity_class: "medium" as const },
        thickness_mm: 25,
        offset_direction: "left" as const
      };

      const result = engine.generateMultiPassProgram(baseOp, 2.0);

      expect(result.passes_generated).toBe(2);
      expect(result.energy_summary.skim_power.length).toBe(1);
    });

    it("should generate rough + 4 skims for Ra < 0.3", () => {
      const baseOp = {
        operation_type: "profile" as const,
        start_x: 0,
        start_y: 0,
        profile_points: [{ x: 20, y: 20, type: "linear" as const }],
        material: { name: "D2", conductivity_class: "medium" as const },
        thickness_mm: 25,
        offset_direction: "left" as const
      };

      const result = engine.generateMultiPassProgram(baseOp, 0.15);

      expect(result.passes_generated).toBe(5);
    });

    it("should generate only rough pass for Ra > 3.2", () => {
      const baseOp = {
        operation_type: "profile" as const,
        start_x: 0,
        start_y: 0,
        profile_points: [{ x: 10, y: 10, type: "linear" as const }],
        material: { name: "S7", conductivity_class: "medium" as const },
        thickness_mm: 30,
        offset_direction: "right" as const
      };

      const result = engine.generateMultiPassProgram(baseOp, 4.0);

      expect(result.passes_generated).toBe(1);
    });
  });

  describe("wire offset calculations", () => {
    it("should use correct offset for 0.25mm wire rough pass", () => {
      const operations: WireEDMOperation[] = [{
        operation_type: "profile",
        pass: "rough",
        start_x: 0,
        start_y: 0,
        profile_points: [{ x: 10, y: 10, type: "linear" }],
        material: { name: "D2", conductivity_class: "medium" },
        thickness_mm: 25,
        offset_direction: "left"
      }];

      const result = engine.generateProgram(operations, { wire_diameter_mm: 0.25 });

      // 0.25mm wire rough offset = 0.160mm = 160 (D value)
      expect(result.gcode.some(l => l.includes("D160"))).toBe(true);
    });

    it("should use reduced offset for skim passes", () => {
      const operations: WireEDMOperation[] = [{
        operation_type: "profile",
        pass: "skim3",
        start_x: 0,
        start_y: 0,
        profile_points: [{ x: 10, y: 10, type: "linear" }],
        material: { name: "D2", conductivity_class: "medium" },
        thickness_mm: 25,
        offset_direction: "left"
      }];

      const result = engine.generateProgram(operations, { wire_diameter_mm: 0.25 });

      // 0.25mm wire skim3 offset = 0.126mm = 126 (D value)
      expect(result.gcode.some(l => l.includes("D126"))).toBe(true);
    });
  });

  describe("getStats", () => {
    it("should return correct machine statistics", () => {
      const stats = engine.getStats();

      expect(stats.machine).toBe("Mitsubishi MV1200R");
      expect(stats.controller).toBe("M700V (W-series)");
      expect(stats.tribal_tips).toBeGreaterThan(15);
      expect(stats.features).toContain("4-axis taper cutting (UV)");
      expect(stats.features).toContain("Multi-pass skim strategy (up to 4 skims)");
    });
  });

  describe("singleton export", () => {
    it("should export singleton instance", () => {
      expect(mitsubishiMV1200RWireEDMMasterPostEngine).toBeInstanceOf(MitsubishiMV1200RWireEDMMasterPostEngine);
    });
  });

  // ==========================================================================
  // NON-FINITE EMIT GUARD (U-PP-NONFINITE-EMIT-SWEEP) -- a NaN/Infinity start
  // coord, profile point, taper UV, arc R/I/J, or wire offset must never leak a
  // literal XNaN/DNaN the M800 control rejects. WEDM arm of the bug-class sweep;
  // sibling of RokuRoku/HaasNGC/OkumaOSP/HurcoV11 mill + OkumaB250 lathe fixes.
  // ==========================================================================
  describe("non-finite emit guard (U-PP-NONFINITE-EMIT-SWEEP)", () => {
    const wedmOp = (o: Partial<WireEDMOperation> = {}): WireEDMOperation => ({
      operation_type: "profile",
      pass: "rough",
      start_x: 0,
      start_y: 0,
      profile_points: [{ x: 10, y: 0, type: "linear" }, { x: 10, y: 10, type: "linear" }],
      material: { name: "D2", hardness_hrc: 60, conductivity_class: "medium" },
      thickness_mm: 25,
      offset_direction: "left",
      ...o,
    });
    const joined = (g: string[]) => g.join("\n");

    it("[regression] finite inputs emit a real rapid + profile with NO non-finite warning", () => {
      const r = engine.generateProgram([wedmOp()]);
      expect(r.gcode.some(l => /G00 X0\.000 Y0\.000 \(RAPID TO START\)/.test(l))).toBe(true);
      expect(r.warnings.some(w => w.includes("non-finite"))).toBe(false);
      expect(joined(r.gcode)).not.toContain("SKIPPED");
    });

    it("NaN start_x replaces the rapid with an ERROR marker -- no literal XNaN", () => {
      const r = engine.generateProgram([wedmOp({ start_x: NaN })]);
      expect(joined(r.gcode)).not.toContain("XNaN");
      expect(joined(r.gcode)).not.toContain("NaN");
      expect(r.warnings.some(w => w.includes("non-finite start XY"))).toBe(true);
      expect(r.gcode.some(l => l.includes("NON-FINITE START COORD"))).toBe(true);
    });

    it("Infinity profile point is skipped -- no literal XInfinity", () => {
      const r = engine.generateProgram([wedmOp({
        profile_points: [{ x: Infinity, y: 5, type: "linear" }, { x: 20, y: 20, type: "linear" }],
      })]);
      expect(joined(r.gcode)).not.toContain("Infinity");
      expect(r.warnings.some(w => w.includes("non-finite XY"))).toBe(true);
      expect(r.gcode.some(l => l.includes("PROFILE POINT") && l.includes("SKIPPED"))).toBe(true);
      expect(r.gcode.some(l => /X20\.000/.test(l))).toBe(true); // finite point still emits
    });

    it("non-finite taper U/V is omitted -- no literal UNaN/VInfinity", () => {
      const r = engine.generateProgram([wedmOp({
        operation_type: "taper",
        profile_points: [{ x: 10, y: 10, u: NaN, v: Infinity, type: "linear" }],
      })]);
      expect(joined(r.gcode)).not.toContain("UNaN");
      expect(joined(r.gcode)).not.toContain("Infinity");
      expect(joined(r.gcode)).not.toContain("NaN");
      expect(r.warnings.some(w => w.includes("non-finite taper U/V"))).toBe(true);
    });

    it("non-finite arc R is omitted -- no literal RInfinity", () => {
      const r = engine.generateProgram([wedmOp({
        profile_points: [{ x: 10, y: 0, type: "linear" }, { x: 20, y: 20, r: Infinity, type: "arc_cw" }],
      })]);
      expect(joined(r.gcode)).not.toContain("RInfinity");
      expect(joined(r.gcode)).not.toContain("Infinity");
      expect(r.warnings.some(w => w.includes("non-finite arc R"))).toBe(true);
    });
  });
});
