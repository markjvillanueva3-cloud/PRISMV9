/**
 * PPG-REAL S2 U-PPR07: Tool change sequence validation tests.
 * Tests: missing M06 before cut, orphan M06, duplicate T codes, WCS-aware travel.
 */
import { describe, it, expect } from "vitest";
import { CollisionHazardDetectorEngine } from "../engines/CollisionHazardDetectorEngine.js";

describe("Tool Change Sequence Validation (U-PPR07)", () => {
  describe("missing M06 before cutting", () => {
    it("detects T code followed by cutting without M06", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: "T2\nG1 Z-5 F200\n",
        material_top_z: 0,
        safe_z: 25,
      });
      const hazard = result.hazards.find(h => h.type === "missing_m06");
      expect(hazard).toBeDefined();
      expect(hazard!.severity).toBe("ERROR");
      expect(hazard!.message).toContain("T2");
      expect(hazard!.message).toContain("no M06");
    });

    it("does not flag when M06 is present", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: "T2 M06\nG1 Z-5 F200\n",
        material_top_z: 0,
        safe_z: 25,
      });
      const hazard = result.hazards.find(h => h.type === "missing_m06");
      expect(hazard).toBeUndefined();
    });

    it("does not flag T and M06 on separate lines", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: "T2\nM06\nG1 Z-5 F200\n",
        material_top_z: 0,
        safe_z: 25,
      });
      const hazard = result.hazards.find(h => h.type === "missing_m06");
      expect(hazard).toBeUndefined();
    });
  });

  describe("duplicate T codes", () => {
    it("detects multiple T codes without M06 between", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: "T1\nT2\nM06\n",
        material_top_z: 0,
        safe_z: 25,
      });
      const hazard = result.hazards.find(h => h.type === "duplicate_t_no_m06");
      expect(hazard).toBeDefined();
      expect(hazard!.severity).toBe("ERROR");
      expect(hazard!.message).toContain("T2");
      expect(hazard!.message).toContain("T1");
    });

    it("does not flag sequential T+M06 pairs", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: "T1 M06\nG1 Z-5 F200\nG0 Z50\nT2 M06\nG1 Z-3 F300\n",
        material_top_z: 0,
        safe_z: 25,
      });
      const hazard = result.hazards.find(h => h.type === "duplicate_t_no_m06");
      expect(hazard).toBeUndefined();
    });
  });

  describe("programs without tool changes", () => {
    it("does not crash on programs with no T or M06", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: "G0 X0 Y0 Z50\nG1 Z-5 F200\nG1 X50 F500\nM30\n",
        material_top_z: 0,
        safe_z: 25,
      });
      expect(result.hazards.filter(h => h.type === "missing_m06")).toHaveLength(0);
      expect(result.hazards.filter(h => h.type === "duplicate_t_no_m06")).toHaveLength(0);
    });
  });

  describe("WCS-aware travel limits", () => {
    it("catches X exceeding travel when WCS offset is applied", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: "G55\nG0 X100 Y0\n",
        material_top_z: 0,
        safe_z: 25,
        machine_travel: { x_min: -500, x_max: 500, y_min: -300, y_max: 300 },
        wcs_offsets: {
          G55: { x: 450, y: 0, z: 0 },
        },
      });
      const hazard = result.hazards.find(h => h.type === "travel_limit_exceeded");
      expect(hazard).toBeDefined();
      expect(hazard!.severity).toBe("ERROR");
      expect(hazard!.message).toContain("G55");
      // X100 in G55 + offset 450 = machine X550, which exceeds 500
      expect(hazard!.message).toContain("550");
    });

    it("passes when WCS-adjusted coordinate is within travel", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: "G55\nG0 X50 Y0\n",
        material_top_z: 0,
        safe_z: 25,
        machine_travel: { x_min: -500, x_max: 500, y_min: -300, y_max: 300 },
        wcs_offsets: {
          G55: { x: 100, y: 0, z: 0 },
        },
      });
      const hazard = result.hazards.find(h => h.type === "travel_limit_exceeded");
      // X50 + offset 100 = machine X150, within [-500, 500]
      expect(hazard).toBeUndefined();
    });

    it("uses G54 offset by default", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: "G0 X400 Y0\n",
        material_top_z: 0,
        safe_z: 25,
        machine_travel: { x_min: -500, x_max: 500, y_min: -300, y_max: 300 },
        wcs_offsets: {
          G54: { x: 200, y: 0, z: 0 },
        },
      });
      const hazard = result.hazards.find(h => h.type === "travel_limit_exceeded");
      // X400 + offset 200 = machine X600, exceeds 500
      expect(hazard).toBeDefined();
    });

    it("checks Y travel limits", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: "G0 X0 Y250\n",
        material_top_z: 0,
        safe_z: 25,
        machine_travel: { x_min: -500, x_max: 500, y_min: -300, y_max: 300 },
        wcs_offsets: {
          G54: { x: 0, y: 100, z: 0 },
        },
      });
      const hazard = result.hazards.find(h => h.type === "travel_limit_exceeded");
      // Y250 + offset 100 = machine Y350, exceeds 300
      expect(hazard).toBeDefined();
    });

    it("does not check travel when no machine_travel provided", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: "G0 X99999 Y99999\n",
        material_top_z: 0,
        safe_z: 25,
      });
      const hazard = result.hazards.find(h => h.type === "travel_limit_exceeded");
      expect(hazard).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("handles M6 (without leading zero)", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: "G1 Z-10 F200\nT2 M6\n",
        material_top_z: 0,
        safe_z: 25,
      });
      // M6 is a valid tool change — should NOT flag tool_change_no_retract
      // since it has Z retract issue
      const tcHazard = result.hazards.find(h => h.type === "tool_change_no_retract");
      expect(tcHazard).toBeDefined(); // Still flags because Z not retracted
    });

    it("handles comments in G-code lines", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: "(Tool change) T1 M06\nG1 Z-5 F200 (rough pass)\nG0 Z50\nM30\n",
        material_top_z: 0,
        safe_z: 25,
      });
      const hazard = result.hazards.find(h => h.type === "missing_m06");
      expect(hazard).toBeUndefined();
    });

    it("multi-tool program with proper sequence passes", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: [
          "O1234",
          "T1 M06",
          "S3000 M03",
          "G0 X0 Y0 Z50",
          "G43 H1 Z5",
          "G1 Z-5 F200",
          "G1 X50 F500",
          "G0 Z50",
          "G91 G28 Z0",
          "T2 M06",
          "S4000 M03",
          "G0 X0 Y0 Z50",
          "G43 H2 Z5",
          "G1 Z-3 F300",
          "G0 Z50",
          "G91 G28 Z0",
          "T3 M06",
          "S5000 M03",
          "G0 X0 Y0 Z50",
          "G43 H3 Z5",
          "G1 Z-2 F400",
          "G0 Z50",
          "M30",
        ].join("\n"),
        material_top_z: 0,
        safe_z: 25,
      });
      expect(result.errors).toBe(0);
      expect(result.passed).toBe(true);
    });
  });
});
