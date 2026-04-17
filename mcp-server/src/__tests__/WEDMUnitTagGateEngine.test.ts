/**
 * Tests for WEDMUnitTagGateEngine
 * MS-P2.5-SAFETY/U-P2.5-SAFE-02
 */

import { describe, it, expect } from "vitest";
import {
  WEDMUnitTagGateEngine,
  wedmUnitTagGateEngine,
  type UnitTagInput,
  type DeclaredUnit,
} from "../engines/WEDMUnitTagGateEngine.js";

describe("WEDMUnitTagGateEngine", () => {
  describe("Basic Unit Code Detection", () => {
    it("detects G21 for metric programs", () => {
      const input: UnitTagInput = {
        gcode: `%
O1001
G21 G90 G94
G00 X50.0 Y25.0
G01 X100.0 F200
M30
%`,
        declared_unit: "metric",
      };

      const result = wedmUnitTagGateEngine.validate(input);

      expect(result.success).toBe(true);
      expect(result.pass).toBe(true);
      expect(result.code_unit).toBe("G21");
      expect(result.declared_unit).toBe("metric");
      expect(result.hard_block).toBe(false);
    });

    it("detects G20 for imperial programs", () => {
      const input: UnitTagInput = {
        gcode: `%
O1002
G20 G90 G94
G00 X2.0 Y1.0
G01 X4.0 F5.0
M30
%`,
        declared_unit: "imperial",
      };

      const result = wedmUnitTagGateEngine.validate(input);

      expect(result.success).toBe(true);
      expect(result.pass).toBe(true);
      expect(result.code_unit).toBe("G20");
      expect(result.declared_unit).toBe("imperial");
    });

    it("detects G71/G70 for Agie controllers", () => {
      const input: UnitTagInput = {
        gcode: `%
G71
X50.0 Y25.0
M17
%`,
        declared_unit: "metric",
        controller: "agie_cut",
      };

      const result = wedmUnitTagGateEngine.validate(input);

      expect(result.pass).toBe(true);
      expect(result.code_unit).toBe("G71");
    });
  });

  describe("Unit Code Mismatch Detection (CRITICAL - 25.4× Risk)", () => {
    it("HARD BLOCK when G20 found but metric declared", () => {
      const input: UnitTagInput = {
        gcode: `%
O2001
G20 G90
X50.0 Y25.0
M30
%`,
        declared_unit: "metric",
      };

      const result = wedmUnitTagGateEngine.validate(input);

      expect(result.pass).toBe(false);
      expect(result.hard_block).toBe(true);
      expect(result.code_unit).toBe("G20");
      expect(result.mismatches.length).toBeGreaterThan(0);
      expect(result.mismatches[0].type).toBe("code_mismatch");
      expect(result.mismatches[0].severity).toBe("critical");
      expect(result.summary).toContain("HARD BLOCK");
    });

    it("HARD BLOCK when G21 found but imperial declared", () => {
      const input: UnitTagInput = {
        gcode: `%
O2002
G21 G90
X2.0 Y1.0
M30
%`,
        declared_unit: "imperial",
      };

      const result = wedmUnitTagGateEngine.validate(input);

      expect(result.pass).toBe(false);
      expect(result.hard_block).toBe(true);
      expect(result.mismatches.some((m) => m.type === "code_mismatch")).toBe(true);
    });

    it("HARD BLOCK when no unit code found", () => {
      const input: UnitTagInput = {
        gcode: `%
O2003
G90 G94
X50.0 Y25.0
M30
%`,
        declared_unit: "metric",
      };

      const result = wedmUnitTagGateEngine.validate(input);

      expect(result.pass).toBe(false);
      expect(result.hard_block).toBe(true);
      expect(result.code_unit).toBeNull();
      expect(result.mismatches.some((m) => m.type === "missing_unit")).toBe(true);
    });
  });

  describe("Coordinate Scale Plausibility", () => {
    it("detects likely mm values in declared-imperial program (25.4× error)", () => {
      const input: UnitTagInput = {
        gcode: `%
O3001
G20 G90
X100.0 Y75.0
X150.0 Y50.0
M30
%`,
        declared_unit: "imperial",
      };

      const result = wedmUnitTagGateEngine.validate(input);

      // Should hard block - coordinates > 50 indicate mm values
      expect(result.pass).toBe(false);
      expect(result.coordinate_scale_consistent).toBe(false);
      expect(result.mismatches.some((m) => m.type === "scale_mismatch")).toBe(true);
    });

    it("passes for reasonable imperial coordinates", () => {
      const input: UnitTagInput = {
        gcode: `%
O3002
G20 G90
X2.5 Y1.75
X4.0 Y3.0
M30
%`,
        declared_unit: "imperial",
      };

      const result = wedmUnitTagGateEngine.validate(input);

      expect(result.pass).toBe(true);
      expect(result.coordinate_scale_consistent).toBe(true);
    });

    it("warns for suspiciously small metric coordinates", () => {
      const input: UnitTagInput = {
        gcode: `%
O3003
G21 G90
X2.5 Y1.75
X4.0 Y3.0
M30
%`,
        declared_unit: "metric",
      };

      const result = wedmUnitTagGateEngine.validate(input);

      // Should pass (warning only) but flag the issue
      expect(result.pass).toBe(true);
      expect(result.mismatches.some((m) => m.type === "scale_mismatch" && m.severity === "warning")).toBe(true);
    });
  });

  describe("Feed Rate Plausibility", () => {
    it("warns for high imperial feed rates", () => {
      const input: UnitTagInput = {
        gcode: `%
O4001
G20 G90
X2.0 Y1.0
G01 X4.0 F50.0
M30
%`,
        declared_unit: "imperial",
      };

      const result = wedmUnitTagGateEngine.validate(input);

      // High feed warning but still passes
      expect(result.mismatches.some((m) => m.type === "feed_mismatch")).toBe(true);
      expect(result.analysis.max_feed?.value).toBe(50);
    });

    it("warns for very low metric feed rates", () => {
      const input: UnitTagInput = {
        gcode: `%
O4002
G21 G90
X50.0 Y25.0
G01 X100.0 F10.0
M30
%`,
        declared_unit: "metric",
      };

      const result = wedmUnitTagGateEngine.validate(input);

      expect(result.mismatches.some((m) => m.type === "feed_mismatch")).toBe(true);
      expect(result.analysis.max_feed?.value).toBe(10);
    });

    it("passes for reasonable metric feed rates", () => {
      const input: UnitTagInput = {
        gcode: `%
O4003
G21 G90
X50.0 Y25.0
G01 X100.0 F200.0
M30
%`,
        declared_unit: "metric",
      };

      const result = wedmUnitTagGateEngine.validate(input);

      expect(result.pass).toBe(true);
      expect(result.feed_scale_consistent).toBe(true);
    });
  });

  describe("AtomicValue Analysis", () => {
    it("returns properly typed AtomicValues", () => {
      const input: UnitTagInput = {
        gcode: `%
O5001
G21 G90
X100.0 Y50.0
X150.0 Y75.0
G01 F200
M30
%`,
        declared_unit: "metric",
      };

      const result = wedmUnitTagGateEngine.validate(input);

      expect(result.analysis.max_coordinate.value).toBe(150);
      expect(result.analysis.max_coordinate.unit).toBe("mm");
      expect(result.analysis.max_coordinate.confidence).toBeGreaterThan(0.9);
      expect(result.analysis.max_coordinate.source).toBe("gcode_scan");

      expect(result.analysis.min_coordinate.value).toBe(50);
      expect(result.analysis.coordinate_range.value).toBe(100);

      expect(result.analysis.max_feed?.value).toBe(200);
      expect(result.analysis.max_feed?.unit).toBe("mm/min");
    });

    it("returns imperial units when declared", () => {
      const input: UnitTagInput = {
        gcode: `%
O5002
G20 G90
X4.0 Y2.0
G01 F5.0
M30
%`,
        declared_unit: "imperial",
      };

      const result = wedmUnitTagGateEngine.validate(input);

      expect(result.analysis.max_coordinate.unit).toBe("in");
      expect(result.analysis.max_feed?.unit).toBe("in/min");
    });
  });

  describe("Quick Check for S(x) Integration", () => {
    it("returns simplified result for S(x)", () => {
      const gcode = `%
O6001
G21 G90
X50.0 Y25.0
M30
%`;

      const result = wedmUnitTagGateEngine.quickCheck(gcode, "metric");

      expect(result.pass).toBe(true);
      expect(result.declared_unit).toBe("metric");
      expect(result.code_unit).toBe("G21");
      expect(result.coordinate_scale_consistent).toBe(true);
    });

    it("returns false for mismatched programs", () => {
      const gcode = `%
O6002
G20 G90
X50.0 Y25.0
M30
%`;

      const result = wedmUnitTagGateEngine.quickCheck(gcode, "metric");

      expect(result.pass).toBe(false);
    });
  });

  describe("Unit Conversion with Safety Check", () => {
    it("converts mm to inch with AtomicValue", () => {
      const result = wedmUnitTagGateEngine.convertWithSafetyCheck(25.4, "metric", "imperial");

      expect(result.value).toBeCloseTo(1.0, 5);
      expect(result.unit).toBe("in");
      expect(result.confidence).toBe(0.99);
      expect(result.source).toBe("converted_from_metric");
    });

    it("converts inch to mm with AtomicValue", () => {
      const result = wedmUnitTagGateEngine.convertWithSafetyCheck(1.0, "imperial", "metric");

      expect(result.value).toBeCloseTo(25.4, 5);
      expect(result.unit).toBe("mm");
      expect(result.source).toBe("converted_from_imperial");
    });

    it("returns no conversion when units match", () => {
      const result = wedmUnitTagGateEngine.convertWithSafetyCheck(100.0, "metric", "metric");

      expect(result.value).toBe(100.0);
      expect(result.unit).toBe("mm");
      expect(result.confidence).toBe(1.0);
      expect(result.source).toBe("no_conversion");
    });
  });

  describe("Controller-Specific Unit Codes", () => {
    it("handles Mitsubishi FA (G20/G21)", () => {
      const input: UnitTagInput = {
        gcode: "G21\nX50.0\nM30",
        declared_unit: "metric",
        controller: "mitsubishi_fa",
      };

      const result = wedmUnitTagGateEngine.validate(input);
      expect(result.pass).toBe(true);
      expect(result.code_unit).toBe("G21");
    });

    it("handles Sodick AQ (G20/G21)", () => {
      const input: UnitTagInput = {
        gcode: "G21\nX50.0\nM30",
        declared_unit: "metric",
        controller: "sodick_aq",
      };

      const result = wedmUnitTagGateEngine.validate(input);
      expect(result.pass).toBe(true);
    });

    it("handles Agie Cut (G70/G71)", () => {
      const input: UnitTagInput = {
        gcode: "G71\nX50.0\nM17",
        declared_unit: "metric",
        controller: "agie_cut",
      };

      const result = wedmUnitTagGateEngine.validate(input);
      expect(result.pass).toBe(true);
      expect(result.code_unit).toBe("G71");
    });

    it("handles Agie Charm imperial (G70)", () => {
      const input: UnitTagInput = {
        gcode: "G70\nX2.0\nM17",
        declared_unit: "imperial",
        controller: "agie_charm",
      };

      const result = wedmUnitTagGateEngine.validate(input);
      expect(result.pass).toBe(true);
      expect(result.code_unit).toBe("G70");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty program", () => {
      const input: UnitTagInput = {
        gcode: "",
        declared_unit: "metric",
      };

      const result = wedmUnitTagGateEngine.validate(input);

      expect(result.pass).toBe(false);
      expect(result.hard_block).toBe(true);
      expect(result.mismatches.some((m) => m.type === "missing_unit")).toBe(true);
    });

    it("handles comments-only program", () => {
      const input: UnitTagInput = {
        gcode: `( This is a comment )
; Another comment
( No actual code )`,
        declared_unit: "metric",
      };

      const result = wedmUnitTagGateEngine.validate(input);

      expect(result.pass).toBe(false);
      expect(result.analysis.max_coordinate.value).toBe(0);
    });

    it("ignores coordinates in comments", () => {
      const input: UnitTagInput = {
        gcode: `G21
( X1000.0 Y500.0 these should be ignored )
X50.0 Y25.0
M30`,
        declared_unit: "metric",
      };

      const result = wedmUnitTagGateEngine.validate(input);

      expect(result.pass).toBe(true);
      expect(result.analysis.max_coordinate.value).toBe(50);
    });

    it("handles negative coordinates", () => {
      const input: UnitTagInput = {
        gcode: `G21
X-50.0 Y-25.0
X100.0 Y75.0
M30`,
        declared_unit: "metric",
      };

      const result = wedmUnitTagGateEngine.validate(input);

      expect(result.pass).toBe(true);
      expect(result.analysis.max_coordinate.value).toBe(100);
    });

    it("handles U/V axis coordinates (wire EDM specific)", () => {
      const input: UnitTagInput = {
        gcode: `G21
X50.0 Y25.0 U0.5 V0.3
M30`,
        declared_unit: "metric",
      };

      const result = wedmUnitTagGateEngine.validate(input);

      expect(result.pass).toBe(true);
      // U/V values should be captured
      expect(result.analysis.min_coordinate.value).toBeCloseTo(0.3, 1);
    });
  });

  describe("Summary Messages", () => {
    it("provides clear pass summary", () => {
      const input: UnitTagInput = {
        gcode: "G21\nX50.0\nM30",
        declared_unit: "metric",
      };

      const result = wedmUnitTagGateEngine.validate(input);

      expect(result.summary).toContain("PASS");
      expect(result.summary).toContain("metric");
      expect(result.summary).toContain("G21");
    });

    it("provides clear hard block summary", () => {
      const input: UnitTagInput = {
        gcode: "G20\nX50.0\nM30",
        declared_unit: "metric",
      };

      const result = wedmUnitTagGateEngine.validate(input);

      expect(result.summary).toContain("HARD BLOCK");
      expect(result.summary).toContain("25.4×");
    });
  });
});
