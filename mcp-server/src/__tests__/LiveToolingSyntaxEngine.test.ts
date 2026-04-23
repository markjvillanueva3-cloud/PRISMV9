/**
 * LiveToolingSyntaxEngine Tests — MIO-MS0/U-MIO21
 */
import { describe, it, expect } from "vitest";
import { liveToolingSyntaxEngine } from "../engines/LiveToolingSyntaxEngine.js";
import type { LiveToolingParams, LiveToolingOperation } from "../engines/LiveToolingSyntaxEngine.js";

const okumaParams: LiveToolingParams = {
  controller: "okuma",
  c_axis_mode: "degrees",
  y_axis_available: true,
  polar_interpolation: true,
  work_offset: "G54",
};

const fanucParams: LiveToolingParams = {
  controller: "fanuc",
  c_axis_mode: "degrees",
  y_axis_available: true,
  polar_interpolation: true,
  work_offset: "G54",
};

const haasParams: LiveToolingParams = {
  controller: "haas",
  c_axis_mode: "degrees",
  y_axis_available: false,
  polar_interpolation: true,
  work_offset: "G54",
};

describe("LiveToolingSyntaxEngine", () => {
  describe("generateCAxisIndex", () => {
    it("generates Okuma M32 C-axis enable", () => {
      const result = liveToolingSyntaxEngine.generateCAxisIndex(45, okumaParams);

      expect(result.code.some(l => l.includes("M32"))).toBe(true);
      expect(result.code.some(l => l.includes("C45"))).toBe(true);
    });

    it("generates Fanuc M200 C-axis enable", () => {
      const result = liveToolingSyntaxEngine.generateCAxisIndex(90, fanucParams);

      expect(result.code.some(l => l.includes("M200"))).toBe(true);
      expect(result.code.some(l => l.includes("C90"))).toBe(true);
    });

    it("generates Haas M154 C-axis enable", () => {
      const result = liveToolingSyntaxEngine.generateCAxisIndex(30, haasParams);

      expect(result.code.some(l => l.includes("M154"))).toBe(true);
    });

    it("generates DMG SPOS command", () => {
      const dmgParams: LiveToolingParams = { ...okumaParams, controller: "dmg" };
      const result = liveToolingSyntaxEngine.generateCAxisIndex(60, dmgParams);

      expect(result.code.some(l => l.includes("SPOS"))).toBe(true);
    });

    it("normalizes angles to 0-360 range", () => {
      const result = liveToolingSyntaxEngine.generateCAxisIndex(370, okumaParams);

      expect(result.code.some(l => l.includes("C10"))).toBe(true);
    });

    it("normalizes negative angles", () => {
      const result = liveToolingSyntaxEngine.generateCAxisIndex(-30, okumaParams);

      expect(result.code.some(l => l.includes("C330"))).toBe(true);
    });

    it("tracks mode changes", () => {
      const result = liveToolingSyntaxEngine.generateCAxisIndex(45, okumaParams);

      expect(result.mode_changes).toContain("c_axis_on");
    });

    it("provides AI reasoning trace", () => {
      const result = liveToolingSyntaxEngine.generateCAxisIndex(45, okumaParams);

      expect(result.ai_reasoning.length).toBeGreaterThan(0);
      expect(result.ai_reasoning.some(r => r.includes("[LIVE-TOOL]"))).toBe(true);
    });
  });

  describe("generateYAxisMilling", () => {
    it("generates Y-axis moves for capable controllers", () => {
      const operation: LiveToolingOperation = {
        type: "y_mill",
        spindle: "live",
        tool_number: 5,
        operations: [
          { y: 10, z: -2, feedrate: 200 },
          { y: 20, z: -2, feedrate: 200 },
        ],
        coolant: "flood",
      };

      const result = liveToolingSyntaxEngine.generateYAxisMilling(operation, okumaParams);

      expect(result.code.some(l => l.includes("Y10"))).toBe(true);
      expect(result.code.some(l => l.includes("Y20"))).toBe(true);
      expect(result.code.some(l => l.includes("M8"))).toBe(true);
    });

    it("falls back to polar when Y-axis unavailable", () => {
      const operation: LiveToolingOperation = {
        type: "y_mill",
        spindle: "live",
        tool_number: 5,
        operations: [{ angle_deg: 45, type: "continuous", feedrate: 200 }],
        coolant: "off",
      };

      const result = liveToolingSyntaxEngine.generateYAxisMilling(operation, haasParams);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("Y-axis");
    });

    it("includes mist coolant when specified", () => {
      const operation: LiveToolingOperation = {
        type: "y_mill",
        spindle: "live",
        tool_number: 3,
        operations: [{ y: 5, z: -1, feedrate: 100 }],
        coolant: "mist",
      };

      const result = liveToolingSyntaxEngine.generateYAxisMilling(operation, okumaParams);

      expect(result.code.some(l => l.includes("M7"))).toBe(true);
    });
  });

  describe("generatePolarMilling", () => {
    it("wraps code with polar on/off", () => {
      const operation: LiveToolingOperation = {
        type: "polar",
        spindle: "live",
        tool_number: 4,
        operations: [{ angle_deg: 45, type: "continuous", feedrate: 150 }],
      };

      const result = liveToolingSyntaxEngine.generatePolarMilling(operation, fanucParams);

      expect(result.code.some(l => l.includes("G12.1"))).toBe(true);
      expect(result.code.some(l => l.includes("G13.1"))).toBe(true);
    });

    it("generates DMG TRANSMIT command", () => {
      const operation: LiveToolingOperation = {
        type: "polar",
        spindle: "live",
        tool_number: 4,
        operations: [{ angle_deg: 30, type: "continuous", feedrate: 100 }],
      };

      const dmgParams: LiveToolingParams = { ...okumaParams, controller: "dmg" };
      const result = liveToolingSyntaxEngine.generatePolarMilling(operation, dmgParams);

      expect(result.code.some(l => l.includes("TRANSMIT"))).toBe(true);
      expect(result.code.some(l => l.includes("TRAFOOF"))).toBe(true);
    });
  });

  describe("generateMillDrill", () => {
    it("generates Okuma G83 peck cycle", () => {
      const result = liveToolingSyntaxEngine.generateMillDrill(25, 90, 2, -10, 100, okumaParams);

      expect(result.code.some(l => l.includes("G83"))).toBe(true);
      expect(result.code.some(l => l.includes("G80"))).toBe(true);
    });

    it("generates Fanuc G83 peck cycle", () => {
      const result = liveToolingSyntaxEngine.generateMillDrill(25, 180, 2, -10, 100, fanucParams);

      expect(result.code.some(l => l.includes("G83"))).toBe(true);
    });

    it("falls back to linear drill for other controllers", () => {
      const result = liveToolingSyntaxEngine.generateMillDrill(25, 90, 2, -10, 100, haasParams);

      expect(result.code.some(l => l.includes("G1 Z-10"))).toBe(true);
    });

    it("indexes C-axis before drilling", () => {
      const result = liveToolingSyntaxEngine.generateMillDrill(25, 45, 2, -10, 100, okumaParams);

      expect(result.code.some(l => l.includes("C45"))).toBe(true);
    });
  });

  describe("generateRotatedPattern", () => {
    it("rotates pattern through multiple positions", () => {
      const pattern = ["G0 X10 Y0", "G1 Z-5 F100", "G0 Z5"];
      const result = liveToolingSyntaxEngine.generateRotatedPattern(pattern, [0, 90, 180, 270], okumaParams);

      expect(result.code.some(l => l.includes("C0."))).toBe(true);
      expect(result.code.some(l => l.includes("C90."))).toBe(true);
      expect(result.code.some(l => l.includes("C180."))).toBe(true);
      expect(result.code.some(l => l.includes("C270."))).toBe(true);
    });

    it("uses G68 rotation for Fanuc", () => {
      const pattern = ["G1 X5 Y5"];
      const result = liveToolingSyntaxEngine.generateRotatedPattern(pattern, [60, 120], fanucParams);

      expect(result.code.some(l => l.includes("G68"))).toBe(true);
      expect(result.code.some(l => l.includes("G69"))).toBe(true);
    });
  });

  describe("generateModeSwitch", () => {
    it("switches to turning mode", () => {
      const result = liveToolingSyntaxEngine.generateModeSwitch("turning", okumaParams);

      expect(result.code.some(l => l.includes("TURN"))).toBe(true);
      expect(result.mode_changes).not.toContain("milling_mode");
    });

    it("switches to milling mode", () => {
      const result = liveToolingSyntaxEngine.generateModeSwitch("milling", okumaParams);

      expect(result.code.some(l => l.includes("MILL"))).toBe(true);
      expect(result.mode_changes).toContain("milling_mode");
    });
  });

  describe("getControllerCapabilities", () => {
    it("reports Okuma capabilities", () => {
      const caps = liveToolingSyntaxEngine.getControllerCapabilities("okuma");

      expect(caps.c_axis).toBe(true);
      expect(caps.y_axis).toBe(true);
      expect(caps.polar_interpolation).toBe(true);
    });

    it("reports Haas limited Y-axis", () => {
      const caps = liveToolingSyntaxEngine.getControllerCapabilities("haas");

      expect(caps.y_axis).toBe(false);
      expect(caps.coordinate_rotation).toBe(false);
    });

    it("reports Fanuc full capabilities", () => {
      const caps = liveToolingSyntaxEngine.getControllerCapabilities("fanuc");

      expect(caps.c_axis).toBe(true);
      expect(caps.y_axis).toBe(true);
      expect(caps.canned_cycles).toBe(true);
    });
  });
});
