/**
 * PPG-REAL S2 U-PPR06: Collision hazard detection tests.
 * Tests rapid-at-depth, tool-change-without-retract, lateral-rapid-at-depth.
 */
import { describe, it, expect } from "vitest";
import { CollisionHazardDetectorEngine } from "../engines/CollisionHazardDetectorEngine.js";

describe("Collision Hazard Detection (U-PPR06)", () => {
  describe("rapid at depth", () => {
    it("detects G0 to Z below material top", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: "G0 X0 Y0 Z50\nG0 Z-50\n",
        material_top_z: 0,
        safe_z: 25,
      });
      const rapid = result.hazards.find(h => h.type === "rapid_at_depth");
      expect(rapid).toBeDefined();
      expect(rapid!.severity).toBe("WARNING");
      expect(rapid!.message).toContain("Z-50");
    });

    it("does not flag G0 above material top", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: "G0 X0 Y0 Z50\nG0 Z5\n",
        material_top_z: 0,
        safe_z: 25,
      });
      const rapid = result.hazards.find(h => h.type === "rapid_at_depth");
      expect(rapid).toBeUndefined();
    });

    it("respects custom material_top_z", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: "G0 Z15\n",
        material_top_z: 20,
        safe_z: 50,
      });
      const rapid = result.hazards.find(h => h.type === "rapid_at_depth");
      expect(rapid).toBeDefined();
      expect(rapid!.message).toContain("Z15");
    });
  });

  describe("tool change without Z retract", () => {
    it("detects M06 without preceding Z retract", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: "G1 Z-10 F200\nT2 M06\n",
        material_top_z: 0,
        safe_z: 25,
      });
      const hazard = result.hazards.find(h => h.type === "tool_change_no_retract");
      expect(hazard).toBeDefined();
      expect(hazard!.severity).toBe("ERROR");
    });

    it("does not flag M06 after G28 Z retract", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: "G1 Z-10 F200\nG91 G28 Z0\nT2 M06\n",
        material_top_z: 0,
        safe_z: 25,
      });
      const hazard = result.hazards.find(h => h.type === "tool_change_no_retract");
      expect(hazard).toBeUndefined();
    });

    it("does not flag M06 after G53 Z retract", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: "G1 Z-10 F200\nG53 Z0\nT2 M06\n",
        material_top_z: 0,
        safe_z: 25,
      });
      const hazard = result.hazards.find(h => h.type === "tool_change_no_retract");
      expect(hazard).toBeUndefined();
    });

    it("does not flag M06 after high Z move", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: "G1 Z-10 F200\nG0 Z50\nT2 M06\n",
        material_top_z: 0,
        safe_z: 25,
      });
      const hazard = result.hazards.find(h => h.type === "tool_change_no_retract");
      expect(hazard).toBeUndefined();
    });
  });

  describe("lateral rapid at depth", () => {
    it("detects G0 XY move at cutting depth", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: "G1 Z-10 F200\nG0 X100 Y50\n",
        material_top_z: 0,
        safe_z: 25,
      });
      const hazard = result.hazards.find(h => h.type === "lateral_rapid_at_depth");
      expect(hazard).toBeDefined();
      expect(hazard!.severity).toBe("WARNING");
    });

    it("does not flag G0 XY after Z retract", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: "G1 Z-10 F200\nG0 Z50\nG0 X100 Y50\n",
        material_top_z: 0,
        safe_z: 25,
      });
      const hazard = result.hazards.find(h => h.type === "lateral_rapid_at_depth");
      expect(hazard).toBeUndefined();
    });
  });

  describe("clean programs", () => {
    it("produces 0 hazards for a well-structured program", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: [
          "O0001",
          "G90 G94 G17",
          "T1 M06",
          "S3000 M03",
          "G0 X0 Y0 Z50",
          "G43 H1 Z5",
          "G1 Z-5 F200",
          "G1 X50 F500",
          "G1 Y50 F500",
          "G0 Z50",
          "G91 G28 Z0",
          "T2 M06",
          "S4000 M03",
          "G0 X0 Y0 Z50",
          "G43 H2 Z5",
          "G1 Z-3 F300",
          "G1 X40 Y40 F600",
          "G0 Z50",
          "M30",
        ].join("\n"),
        material_top_z: 0,
        safe_z: 25,
      });
      expect(result.errors).toBe(0);
      expect(result.passed).toBe(true);
    });

    it("returns correct line count", () => {
      const gcode = "G0 X0 Y0\nG1 Z-5 F200\nM30\n";
      const result = CollisionHazardDetectorEngine.analyze({
        gcode,
        material_top_z: 0,
        safe_z: 25,
      });
      expect(result.lines_analyzed).toBe(4); // includes trailing empty line
    });
  });

  describe("hazard severity", () => {
    it("rapid_at_depth is WARNING", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: "G0 Z-50\n",
        material_top_z: 0,
        safe_z: 25,
      });
      expect(result.hazards[0]?.severity).toBe("WARNING");
    });

    it("tool_change_no_retract is ERROR", () => {
      const result = CollisionHazardDetectorEngine.analyze({
        gcode: "G1 Z-10 F200\nT2 M06\n",
        material_top_z: 0,
        safe_z: 25,
      });
      const hazard = result.hazards.find(h => h.type === "tool_change_no_retract");
      expect(hazard?.severity).toBe("ERROR");
    });
  });
});
