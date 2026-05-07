/**
 * Tests for MastercamProbingBridge
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP04
 */

import { describe, it, expect } from "vitest";
import { mastercamProbingBridge, type ProbeCycle } from "../engines/MastercamProbingBridge.js";

describe("MastercamProbingBridge", () => {
  describe("generatePartSetup", () => {
    it("should generate part setup probing sequence", () => {
      const features = [
        { type: "corner" as const, x: 0, y: 0, z: 0, sets_axis: "XY" as const },
        { type: "edge" as const, x: 100, y: 0, z: 0 },
        { type: "surface" as const, x: 50, y: 50, z: 0, sets_axis: "Z" as const }
      ];

      const setup = mastercamProbingBridge.generatePartSetup(features, 54);

      expect(setup.wcs_number).toBe(54);
      expect(setup.probes.length).toBe(3);
      expect(setup.probes[0].sequence).toBe(1);
      expect(setup.probes[0].type).toBe("corner");
      expect(setup.estimated_time_sec).toBe(24); // 3 probes × 8 sec
    });

    it("should include descriptions for each probe", () => {
      const features = [
        { type: "bore" as const, x: 25, y: 25, z: -5, nominal: 12.7, description: "Locating bore" }
      ];

      const setup = mastercamProbingBridge.generatePartSetup(features);

      expect(setup.probes[0].description).toBe("Locating bore");
    });
  });

  describe("createProbeCycle", () => {
    it("should create single point probe cycle", () => {
      const cycle = mastercamProbingBridge.createProbeCycle(
        "single_point",
        50, 50, -10,
        { expectedValue: -10.0, tolerance: 0.01 }
      );

      expect(cycle.cycle_type).toBe("single_point");
      expect(cycle.x).toBe(50);
      expect(cycle.y).toBe(50);
      expect(cycle.z).toBe(-10);
      expect(cycle.axis).toBe("Z");
      expect(cycle.tolerance).toBe(0.01);
    });

    it("should create bore probe cycle with XY axis", () => {
      const cycle = mastercamProbingBridge.createProbeCycle(
        "bore",
        25, 30, -5,
        { expectedValue: 12.7, tolerance: 0.025 }
      );

      expect(cycle.cycle_type).toBe("bore");
      expect(cycle.axis).toBe("XY");
      expect(cycle.expected_value).toBe(12.7);
    });

    it("should create boss probe cycle", () => {
      const cycle = mastercamProbingBridge.createProbeCycle(
        "boss",
        0, 0, 0,
        { expectedValue: 50.0, probeSystem: "heidenhain" }
      );

      expect(cycle.cycle_type).toBe("boss");
      expect(cycle.probe_system).toBe("heidenhain");
    });

    it("should default to Renishaw probe system", () => {
      const cycle = mastercamProbingBridge.createProbeCycle("surface", 0, 0, 0);
      expect(cycle.probe_system).toBe("renishaw");
    });
  });

  describe("generateGCode", () => {
    it("should generate G-code for Fanuc controller", () => {
      const cycles: ProbeCycle[] = [
        mastercamProbingBridge.createProbeCycle("bore", 25, 25, -5, { expectedValue: 12.7 }),
        mastercamProbingBridge.createProbeCycle("surface", 50, 50, 0, { expectedValue: 0 })
      ];

      const output = mastercamProbingBridge.generateGCode(cycles, "fanuc", "renishaw");

      expect(output.controller).toBe("fanuc");
      expect(output.probe_system).toBe("renishaw");
      expect(output.gcode_lines.length).toBeGreaterThan(10);
      expect(output.gcode_lines.some(l => l.includes("RENISHAW"))).toBe(true);
      expect(output.gcode_lines.some(l => l.includes("G65"))).toBe(true);
    });

    it("should generate G-code for Haas controller", () => {
      const cycles: ProbeCycle[] = [
        mastercamProbingBridge.createProbeCycle("single_point", 0, 0, -10)
      ];

      const output = mastercamProbingBridge.generateGCode(cycles, "haas", "renishaw");

      expect(output.controller).toBe("haas");
      expect(output.gcode_lines.some(l => l.includes("G31"))).toBe(true);
    });

    it("should include tolerance checks when expected value provided", () => {
      const cycles: ProbeCycle[] = [
        mastercamProbingBridge.createProbeCycle("bore", 25, 25, -5, {
          expectedValue: 12.7,
          tolerance: 0.025
        })
      ];

      const output = mastercamProbingBridge.generateGCode(cycles, "fanuc");

      expect(output.gcode_lines.some(l => l.includes("TOLERANCE CHECK"))).toBe(true);
      expect(output.gcode_lines.some(l => l.includes("OUT OF TOLERANCE"))).toBe(true);
    });

    it("should estimate cycle time", () => {
      const cycles: ProbeCycle[] = [
        mastercamProbingBridge.createProbeCycle("bore", 0, 0, 0),
        mastercamProbingBridge.createProbeCycle("bore", 50, 0, 0),
        mastercamProbingBridge.createProbeCycle("bore", 50, 50, 0)
      ];

      const output = mastercamProbingBridge.generateGCode(cycles, "fanuc");

      expect(output.estimated_cycle_time_sec).toBe(30); // 3 × 10 sec
    });

    it("should track variables used", () => {
      const cycles: ProbeCycle[] = [
        mastercamProbingBridge.createProbeCycle("bore", 25, 25, -5, { variableStorage: "#501" }),
        mastercamProbingBridge.createProbeCycle("bore", 75, 25, -5, { variableStorage: "#502" })
      ];

      const output = mastercamProbingBridge.generateGCode(cycles, "fanuc");

      expect(output.variables_used).toContain("#501");
      expect(output.variables_used).toContain("#502");
    });
  });

  describe("generateToolProbing", () => {
    it("should generate tool length measurement code", () => {
      const tools = [
        {
          tool_number: 1,
          tool_type: "endmill" as const,
          expected_length: 75.0,
          length_tolerance: 0.1,
          breakage_tolerance: 5.0,
          probe_type: "length" as const
        }
      ];

      const lines = mastercamProbingBridge.generateToolProbing(tools, "fanuc");

      expect(lines.some(l => l.includes("TOOL 1"))).toBe(true);
      expect(lines.some(l => l.includes("TOOL LENGTH"))).toBe(true);
    });

    it("should generate breakage check code", () => {
      const tools = [
        {
          tool_number: 5,
          tool_type: "drill" as const,
          expected_length: 100.0,
          length_tolerance: 0.1,
          breakage_tolerance: 10.0,
          probe_type: "breakage" as const
        }
      ];

      const lines = mastercamProbingBridge.generateToolProbing(tools, "fanuc");

      expect(lines.some(l => l.includes("BREAKAGE"))).toBe(true);
    });

    it("should support full probe type (length + breakage)", () => {
      const tools = [
        {
          tool_number: 10,
          tool_type: "facemill" as const,
          expected_length: 50.0,
          length_tolerance: 0.2,
          breakage_tolerance: 5.0,
          probe_type: "full" as const
        }
      ];

      const lines = mastercamProbingBridge.generateToolProbing(tools, "haas");

      expect(lines.filter(l => l.includes("TOOL 10")).length).toBeGreaterThan(0);
    });
  });

  describe("simulateVerification", () => {
    it("should simulate probe verification results", () => {
      const cycles: ProbeCycle[] = [
        mastercamProbingBridge.createProbeCycle("bore", 25, 25, -5, {
          expectedValue: 12.7,
          tolerance: 0.025
        })
      ];

      const results = mastercamProbingBridge.simulateVerification(cycles, 0.001);

      expect(results.length).toBe(1);
      expect(results[0].nominal).toBe(12.7);
      expect(Math.abs(results[0].measured - 12.7)).toBeLessThan(0.002);
      expect(results[0].timestamp).toBeTruthy();
    });

    it("should determine in-tolerance status", () => {
      const cycles: ProbeCycle[] = [
        mastercamProbingBridge.createProbeCycle("bore", 0, 0, 0, {
          expectedValue: 10.0,
          tolerance: 0.1
        })
      ];

      const results = mastercamProbingBridge.simulateVerification(cycles, 0.001);

      expect(results[0].in_tolerance).toBe(true);
      expect(results[0].action_taken).toBe("none");
    });
  });

  describe("getStats", () => {
    it("should return supported probe systems", () => {
      const stats = mastercamProbingBridge.getStats();

      expect(stats.probe_systems).toContain("renishaw");
      expect(stats.probe_systems).toContain("heidenhain");
      expect(stats.probe_systems).toContain("blum");
      expect(stats.probe_systems).toContain("m_and_h");
    });

    it("should return supported cycle types", () => {
      const stats = mastercamProbingBridge.getStats();

      expect(stats.cycle_types).toContain("bore");
      expect(stats.cycle_types).toContain("boss");
      expect(stats.cycle_types).toContain("web");
      expect(stats.cycle_types).toContain("pocket");
    });

    it("should return supported controllers", () => {
      const stats = mastercamProbingBridge.getStats();

      expect(stats.controllers).toContain("fanuc");
      expect(stats.controllers).toContain("haas");
      expect(stats.controllers).toContain("siemens");
    });
  });
});
