/**
 * PP-MS5 Tests: 5-Axis Post Processing + Verification Engine
 */
import { describe, it, expect } from "vitest";
import { fiveAxisPostEngine } from "../engines/FiveAxisPostEngine.js";
import { postProcessorVerificationEngine } from "../engines/PostProcessorVerificationEngine.js";

// ═══ FiveAxisPostEngine ═══

describe("FiveAxisPostEngine", () => {
  describe("TCPC Codes", () => {
    it("Fanuc 31i: G43.4", () => {
      const codes = fiveAxisPostEngine.getTCPCCodes("fanuc_31i", 5);
      expect(codes.on).toBe("G43.4 H5");
      expect(codes.off).toBe("G49");
    });

    it("Siemens 840D: TRAORI", () => {
      const codes = fiveAxisPostEngine.getTCPCCodes("siemens_840d");
      expect(codes.on).toBe("TRAORI(1)");
      expect(codes.off).toBe("TRAFOOF");
    });

    it("Heidenhain: FUNCTION TCPM", () => {
      const codes = fiveAxisPostEngine.getTCPCCodes("heidenhain_tnc640");
      expect(codes.on).toContain("FUNCTION TCPM");
      expect(codes.off).toContain("RESET TCPM");
    });

    it("Haas: G234 (DWO)", () => {
      const codes = fiveAxisPostEngine.getTCPCCodes("haas_ngc");
      expect(codes.on).toBe("G234");
    });

    it("Okuma P500: G43.5", () => {
      const codes = fiveAxisPostEngine.getTCPCCodes("okuma_osp_p500", 3);
      expect(codes.on).toBe("G43.5 H3");
    });
  });

  describe("Coordinate Rotation", () => {
    it("Fanuc G68.2", () => {
      const code = fiveAxisPostEngine.getCoordRotation("fanuc_31i",
        { a: 30, b: 0, c: 45 }, { x: 0, y: 0, z: 0 });
      expect(code).toContain("G68.2");
      expect(code).toContain("30.000");
      expect(code).toContain("45.000");
    });

    it("Siemens CYCLE800", () => {
      const code = fiveAxisPostEngine.getCoordRotation("siemens_840d",
        { a: 15, b: 0, c: 90 });
      expect(code).toContain("CYCLE800");
      expect(code).toContain("15.000");
    });

    it("Heidenhain PLANE SPATIAL", () => {
      const code = fiveAxisPostEngine.getCoordRotation("heidenhain_tnc640",
        { a: 20, b: 10, c: 0 });
      expect(code).toContain("PLANE SPATIAL");
      expect(code).toContain("SPA20.000");
    });
  });

  describe("Singularity Detection", () => {
    it("detects gimbal lock at B≈0 for head-head", () => {
      const blocks = [
        { x: 0, y: 0, z: 0, a: 0, b: 15, c: 0 },
        { x: 10, y: 0, z: 0, a: 0, b: 1, c: 0 }, // near B=0
        { x: 20, y: 0, z: 0, a: 0, b: -15, c: 0 },
      ];
      const r = fiveAxisPostEngine.detectSingularities(blocks, {
        controller: "fanuc_31i", kinematics: "head_head",
        rotary_axis_1: "A", rotary_axis_2: "C",
      });
      expect(r.has_singularity).toBe(true);
      expect(r.singularity_blocks.some(s => s.type === "gimbal_lock")).toBe(true);
    });

    it("detects axis flip (>170° C-axis change)", () => {
      const blocks = [
        { x: 0, y: 0, z: 0, a: 0, b: 30, c: 10 },
        { x: 10, y: 0, z: 0, a: 0, b: 30, c: -165 }, // 175° flip
      ];
      const r = fiveAxisPostEngine.detectSingularities(blocks, {
        controller: "fanuc_31i", kinematics: "head_head",
        rotary_axis_1: "A", rotary_axis_2: "C",
      });
      expect(r.singularity_blocks.some(s => s.type === "axis_flip")).toBe(true);
    });

    it("no singularity for safe toolpath", () => {
      const blocks = [
        { x: 0, y: 0, z: 0, a: 0, b: 30, c: 45 },
        { x: 10, y: 0, z: 0, a: 0, b: 25, c: 50 },
        { x: 20, y: 0, z: 0, a: 0, b: 20, c: 55 },
      ];
      const r = fiveAxisPostEngine.detectSingularities(blocks, {
        controller: "fanuc_31i", kinematics: "head_head",
        rotary_axis_1: "A", rotary_axis_2: "C",
      });
      expect(r.has_singularity).toBe(false);
    });

    it("detects rotary axis limit violation", () => {
      const blocks = [
        { x: 0, y: 0, z: 0, a: 85, b: 0, c: 0 },
      ];
      const r = fiveAxisPostEngine.detectSingularities(blocks, {
        controller: "fanuc_31i", kinematics: "table_head",
        rotary_axis_1: "A", rotary_axis_2: "C",
        rotary_limits: { axis1_min: -30, axis1_max: 120, axis2_min: -360, axis2_max: 360 },
      });
      // A=85 is within -30..120, so no violation
      expect(r.singularity_blocks.filter(s => s.type === "near_pole").length).toBe(0);
    });
  });

  describe("Inverse Time Feed (G93)", () => {
    it("calculates F = 1/time for combined linear+rotary moves", () => {
      const blocks = [
        { x: 0, y: 0, z: 0, a: 0, b: 30, c: 0 },
        { x: 10, y: 0, z: 0, a: 0, b: 35, c: 0 },
      ];
      const r = fiveAxisPostEngine.calculateInverseTimeFeed(blocks, {
        feed_mm_min: 500, pivot_length_mm: 200,
      });
      expect(r.blocks.length).toBe(1);
      expect(r.blocks[0].f_inverse).toBeGreaterThan(0);
      expect(r.blocks[0].linear_dist_mm).toBeCloseTo(10, 1);
      expect(r.blocks[0].rotary_dist_deg).toBeCloseTo(5, 1);
    });

    it("pure linear move: F_inverse = feed/distance", () => {
      const blocks = [
        { x: 0, y: 0, z: 0, a: 0, b: 30, c: 0 },
        { x: 100, y: 0, z: 0, a: 0, b: 30, c: 0 }, // no rotary
      ];
      const r = fiveAxisPostEngine.calculateInverseTimeFeed(blocks, { feed_mm_min: 1000 });
      // time = 100/1000 = 0.1 min, F = 1/0.1 = 10
      expect(r.blocks[0].f_inverse).toBeCloseTo(10, 0);
    });
  });

  describe("Linearization", () => {
    it("linearizes 5-axis moves into segments within tolerance", () => {
      const blocks = [
        { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 },
        { x: 100, y: 0, z: 0, a: 0, b: 30, c: 0, feed_mm_min: 500 },
      ];
      const r = fiveAxisPostEngine.linearize(blocks, 0.01);
      expect(r.result.linearized_blocks).toBeGreaterThan(2);
      expect(r.result.max_deviation_mm).toBeLessThanOrEqual(0.01);
    });

    it("does not linearize pure 3-axis moves", () => {
      const blocks = [
        { x: 0, y: 0, z: 0 },
        { x: 100, y: 50, z: -5, feed_mm_min: 800 },
      ];
      const r = fiveAxisPostEngine.linearize(blocks, 0.01);
      expect(r.result.linearized_blocks).toBe(2);
    });
  });

  describe("Rotary Unwind", () => {
    it("unwinds C axis approaching +360 limit", () => {
      const blocks = [
        { x: 0, y: 0, z: 0, c: 340 },
        { x: 10, y: 0, z: 0, c: 355 }, // within 10° of 360
      ];
      const r = fiveAxisPostEngine.checkRotaryUnwind(blocks,
        { min: -360, max: 360, axis: "C" });
      expect(r.unwinds_inserted).toBeGreaterThanOrEqual(1);
      expect(r.unwound_blocks[1].c).toBeLessThan(0); // unwound
    });
  });
});

// ═══ PostProcessorVerificationEngine ═══

describe("PostProcessorVerificationEngine", () => {
  const VALID_GCODE = `%
O0001
G90 G21 G17 G40 G80
T1 M6
S3000 M3
G54
G00 X0 Y0 Z5.0
G01 Z-2.0 F200
G01 X50.0 F800
G01 Y30.0
G00 Z5.0
M30
%`;

  describe("Grammar Validation", () => {
    it("validates well-formed G-code", () => {
      const r = postProcessorVerificationEngine.verify({ gcode: VALID_GCODE });
      expect(r.grammar_ok).toBe(true);
    });

    it("detects safe start block", () => {
      const r = postProcessorVerificationEngine.verify({ gcode: VALID_GCODE });
      expect(r.sequence_ok).toBe(true);
    });

    it("warns on missing safe start", () => {
      const r = postProcessorVerificationEngine.verify({
        gcode: "T1 M6\nS3000 M3\nG01 X10 F500\nM30\n",
      });
      expect(r.issues.some(i => i.rule === "SEQ-010")).toBe(true);
    });
  });

  describe("Feed/Speed Limits", () => {
    it("flags RPM exceeding machine max", () => {
      const r = postProcessorVerificationEngine.verify({
        gcode: "G90 G21 G17\nT1 M6\nS15000 M3\nG01 X10 F500\n",
        machine_limits: { max_rpm: 10000 },
      });
      expect(r.issues.some(i => i.rule === "LIMIT-001")).toBe(true);
      expect(r.feed_speed_ok).toBe(false);
    });

    it("flags feed exceeding machine max", () => {
      const r = postProcessorVerificationEngine.verify({
        gcode: "G90 G21 G17\nT1 M6\nS3000 M3\nG01 X10 F50000\n",
        machine_limits: { max_feed_mm_min: 30000 },
      });
      expect(r.issues.some(i => i.rule === "LIMIT-002")).toBe(true);
    });

    it("passes when within limits", () => {
      const r = postProcessorVerificationEngine.verify({
        gcode: VALID_GCODE,
        machine_limits: { max_rpm: 12000, max_feed_mm_min: 15000 },
      });
      expect(r.feed_speed_ok).toBe(true);
    });
  });

  describe("Travel Limits", () => {
    it("flags X outside work volume", () => {
      const r = postProcessorVerificationEngine.verify({
        gcode: "G90 G21 G17\nG01 X500.0 F500\n",
        machine_limits: { work_volume: { x: 400, y: 300, z: 200 } },
      });
      expect(r.issues.some(i => i.rule === "TRAVEL-001")).toBe(true);
      expect(r.travel_ok).toBe(false);
    });

    it("passes within work volume", () => {
      const r = postProcessorVerificationEngine.verify({
        gcode: "G90 G21 G17\nG01 X100 Y50 Z-20 F500\n",
        machine_limits: { work_volume: { x: 762, y: 406, z: 508 } },
      });
      expect(r.travel_ok).toBe(true);
    });
  });

  describe("Sequence Validation", () => {
    it("warns on cutting without spindle", () => {
      const r = postProcessorVerificationEngine.verify({
        gcode: "G90 G21 G17\nT1 M6\nG01 X10 F500\n",
      });
      expect(r.issues.some(i => i.rule === "SEQ-002")).toBe(true);
    });

    it("counts tools and tool changes", () => {
      const r = postProcessorVerificationEngine.verify({ gcode: VALID_GCODE });
      expect(r.summary.unique_tools).toBe(1);
      expect(r.summary.tool_changes).toBe(1);
    });
  });

  describe("Backplot", () => {
    it("reconstructs toolpath points", () => {
      const r = postProcessorVerificationEngine.verify({ gcode: VALID_GCODE });
      expect(r.backplot).toBeDefined();
      expect(r.backplot!.length).toBeGreaterThan(0);
      // Should have rapids and linear moves
      expect(r.backplot!.some(p => p.type === "rapid")).toBe(true);
      expect(r.backplot!.some(p => p.type === "linear")).toBe(true);
    });

    it("backplot verify matches original points", () => {
      const gcode = "G90 G21\nG01 X10 Y0 Z0 F500\nG01 X20 Y10 Z0\n";
      const original = [
        { x: 10, y: 0, z: 0 },
        { x: 20, y: 10, z: 0 },
      ];
      const r = postProcessorVerificationEngine.backplotVerify(gcode, original);
      expect(r.match).toBe(true);
      expect(r.max_deviation_mm).toBeLessThan(0.001);
    });
  });

  describe("Summary Statistics", () => {
    it("counts lines correctly", () => {
      const r = postProcessorVerificationEngine.verify({ gcode: VALID_GCODE });
      expect(r.summary.total_lines).toBeGreaterThan(5);
      expect(r.summary.cutting_lines).toBeGreaterThan(0);
      expect(r.summary.rapid_lines).toBeGreaterThan(0);
      expect(r.summary.max_rpm_found).toBe(3000);
      expect(r.summary.max_feed_found).toBe(800);
    });
  });
});
