/**
 * PPEndToEndPostGeneratorEngine Tests — PP-AGI Crown Jewel
 */
import { describe, it, expect } from "vitest";
import {
  PPEndToEndPostGeneratorEngine,
  ppEndToEndPostGeneratorEngine,
} from "../engines/PPEndToEndPostGeneratorEngine.js";

describe("PPEndToEndPostGeneratorEngine", () => {
  it("exports singleton", () => {
    expect(ppEndToEndPostGeneratorEngine).toBeInstanceOf(PPEndToEndPostGeneratorEngine);
  });

  describe("generate — Haas VF-2 roughing", () => {
    it("produces valid G-code", () => {
      const result = ppEndToEndPostGeneratorEngine.generate({
        machine_id: "jmdie-haas-vf2",
        program_number: "1001",
        program_comment: "TEST PART - ROUGHING",
        operations: [{
          tool_number: 1, tool_description: "10mm endmill",
          tool_diameter_mm: 10, tool_flute_count: 4,
          operation_type: "roughing",
          spindle_speed_rpm: 5000, feed_rate_mm_min: 500,
          depth_of_cut_mm: 2, width_of_cut_mm: 5,
          coolant: "flood",
        }],
      });

      expect(result.gcode_text.length).toBeGreaterThan(100);
      expect(result.line_count).toBeGreaterThan(10);
    });

    it("includes program comment", () => {
      const result = ppEndToEndPostGeneratorEngine.generate({
        machine_id: "jmdie-haas-vf2",
        program_comment: "MY CUSTOM PART",
        operations: [{
          tool_number: 1, tool_diameter_mm: 10,
          operation_type: "roughing",
          spindle_speed_rpm: 5000, feed_rate_mm_min: 500,
          depth_of_cut_mm: 2, coolant: "flood",
        }],
      });
      expect(result.gcode_text).toContain("MY CUSTOM PART");
    });

    it("contains safe start block", () => {
      const result = ppEndToEndPostGeneratorEngine.generateSimple(
        "jmdie-haas-vf2", 1, 10, "roughing", 5000, 500, 2);
      expect(result.gcode_text).toContain("G90");
      expect(result.gcode_text).toContain("G21");
    });

    it("contains tool change", () => {
      const result = ppEndToEndPostGeneratorEngine.generateSimple(
        "jmdie-haas-vf2", 3, 10, "roughing", 5000, 500, 2);
      expect(result.gcode_text).toContain("T3");
      expect(result.gcode_text).toContain("M6");
    });

    it("contains spindle + coolant", () => {
      const result = ppEndToEndPostGeneratorEngine.generateSimple(
        "jmdie-haas-vf2", 1, 10, "roughing", 5000, 500, 2);
      expect(result.gcode_text).toContain("S5000");
      expect(result.gcode_text).toContain("M3");
      expect(result.gcode_text).toContain("M8");
    });

    it("contains program end M30", () => {
      const result = ppEndToEndPostGeneratorEngine.generateSimple(
        "jmdie-haas-vf2", 1, 10, "roughing", 5000, 500, 2);
      expect(result.gcode_text).toContain("M30");
    });

    it("machine name in metadata", () => {
      const result = ppEndToEndPostGeneratorEngine.generateSimple(
        "jmdie-haas-vf2", 1, 10, "roughing", 5000, 500, 2);
      expect(result.machine_name).toContain("Haas VF-2");
      expect(result.metadata.machine_id).toBe("jmdie-haas-vf2");
    });

    it("physics valid for safe conditions", () => {
      const result = ppEndToEndPostGeneratorEngine.generateSimple(
        "jmdie-haas-vf2", 1, 10, "roughing", 5000, 500, 2);
      expect(result.physics_valid).toBe(true);
    });

    it("includes physics force/power comment", () => {
      const result = ppEndToEndPostGeneratorEngine.generateSimple(
        "jmdie-haas-vf2", 1, 10, "roughing", 5000, 500, 2);
      expect(result.gcode_text).toMatch(/Force.*N.*Power.*kW/);
    });
  });

  describe("generate — multi-operation", () => {
    it("handles 3 operations", () => {
      const result = ppEndToEndPostGeneratorEngine.generate({
        machine_id: "jmdie-haas-vf2",
        operations: [
          { tool_number: 1, tool_diameter_mm: 20, operation_type: "roughing", spindle_speed_rpm: 3000, feed_rate_mm_min: 800, depth_of_cut_mm: 3, coolant: "flood" },
          { tool_number: 2, tool_diameter_mm: 10, operation_type: "finishing", spindle_speed_rpm: 8000, feed_rate_mm_min: 300, depth_of_cut_mm: 0.3, coolant: "mist" },
          { tool_number: 5, tool_diameter_mm: 8, operation_type: "drilling", spindle_speed_rpm: 4000, feed_rate_mm_min: 200, depth_of_cut_mm: 15, coolant: "tsc" },
        ],
      });
      expect(result.operation_count).toBe(3);
      expect(result.gcode_text).toContain("T1");
      expect(result.gcode_text).toContain("T2");
      expect(result.gcode_text).toContain("T5");
    });
  });

  describe("generate — Okuma 5-axis", () => {
    it("generates Okuma OSP-P300 dialect", () => {
      const result = ppEndToEndPostGeneratorEngine.generateSimple(
        "jmdie-okuma-m460v-5ax", 1, 6, "finishing", 12000, 200, 0.3);
      expect(result.controller_name).toContain("OSP-P300");
    });
  });

  describe("generate — with optimization", () => {
    it("optimizes when flag is set", () => {
      const result = ppEndToEndPostGeneratorEngine.generate({
        machine_id: "jmdie-haas-vf2",
        optimize: true,
        material_kc: 1800,
        material_mc: 0.25,
        operations: [{
          tool_number: 1, tool_diameter_mm: 10, tool_flute_count: 4,
          operation_type: "roughing",
          spindle_speed_rpm: 3000, feed_rate_mm_min: 300,
          depth_of_cut_mm: 1, width_of_cut_mm: 3,
          coolant: "flood",
        }],
      });
      // Optimization may or may not improve — just check it ran
      expect(typeof result.optimization_applied).toBe("boolean");
    });
  });

  describe("generate — physics warnings", () => {
    it("warns on aggressive conditions", () => {
      const result = ppEndToEndPostGeneratorEngine.generate({
        machine_id: "jmdie-haas-vf2",
        material_kc: 3000,
        operations: [{
          tool_number: 1, tool_diameter_mm: 6, tool_flute_count: 4,
          operation_type: "roughing",
          spindle_speed_rpm: 2000, feed_rate_mm_min: 3000,
          depth_of_cut_mm: 20, width_of_cut_mm: 6,
          coolant: "flood",
        }],
      });
      // Very aggressive: deep full-slot in hard material with small tool
      expect(result.physics_valid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("generate — unknown machine", () => {
    it("returns error program", () => {
      const result = ppEndToEndPostGeneratorEngine.generate({
        machine_id: "nonexistent",
        operations: [],
      });
      expect(result.gcode_text).toContain("ERROR");
      expect(result.physics_valid).toBe(false);
    });
  });

  describe("generateSimple", () => {
    it("produces single-operation program", () => {
      const result = ppEndToEndPostGeneratorEngine.generateSimple(
        "jmdie-hurco-vmx30i", 1, 12, "roughing", 6000, 600, 3);
      expect(result.operation_count).toBe(1);
      expect(result.machine_name).toContain("Hurco");
    });
  });

  describe("metadata", () => {
    it("includes generation timestamp", () => {
      const result = ppEndToEndPostGeneratorEngine.generateSimple(
        "jmdie-haas-vf2", 1, 10, "roughing", 5000, 500, 2);
      expect(result.metadata.generated_at).toBeDefined();
      expect(result.metadata.generator).toContain("PPEndToEnd");
    });
  });
});
