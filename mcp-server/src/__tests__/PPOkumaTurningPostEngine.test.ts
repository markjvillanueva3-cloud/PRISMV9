/**
 * PPOkumaTurningPostEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPOkumaTurningPostEngine,
  ppOkumaTurningPostEngine,
} from "../engines/PPOkumaTurningPostEngine.js";

describe("PPOkumaTurningPostEngine", () => {
  it("exports singleton", () => {
    expect(ppOkumaTurningPostEngine).toBeInstanceOf(PPOkumaTurningPostEngine);
  });

  describe("generate — OD roughing", () => {
    it("produces valid program", () => {
      const r = ppOkumaTurningPostEngine.generate({
        machine_id: "jmdie-okuma-lb3000",
        program_number: "2001",
        part_description: "D2 DIE INSERT",
        bar_diameter_mm: 50,
        material: "D2 tool steel",
        operations: [{
          type: "od_rough", tool_number: 1, tool_position: 1,
          insert_type: "CNMG 432",
          speed_sfm: 200, css: true, feed_ipr: 0.012,
          depth_of_cut_mm: 2, coolant: "flood",
          start_x_mm: 50, end_x_mm: 30, start_z_mm: 1, end_z_mm: -40,
        }],
      });
      expect(r.gcode_text.length).toBeGreaterThan(100);
      expect(r.operation_count).toBe(1);
    });

    it("contains safe start G28", () => {
      const r = ppOkumaTurningPostEngine.generateSimpleODRough(50, 30, 40, 200, 0.012, 2);
      expect(r.gcode_text).toContain("G28");
    });

    it("contains CSS G96", () => {
      const r = ppOkumaTurningPostEngine.generateSimpleODRough(50, 30, 40, 200, 0.012, 2);
      expect(r.gcode_text).toContain("G96");
    });

    it("contains RPM clamp G50", () => {
      const r = ppOkumaTurningPostEngine.generateSimpleODRough(50, 30, 40, 200, 0.012, 2);
      expect(r.gcode_text).toContain("G50 S");
    });

    it("contains tool call T01", () => {
      const r = ppOkumaTurningPostEngine.generateSimpleODRough(50, 30, 40, 200, 0.012, 2);
      expect(r.gcode_text).toContain("T0101");
    });

    it("contains M3 spindle CW", () => {
      const r = ppOkumaTurningPostEngine.generateSimpleODRough(50, 30, 40, 200, 0.012, 2);
      expect(r.gcode_text).toContain("M3");
    });

    it("contains M8 flood coolant", () => {
      const r = ppOkumaTurningPostEngine.generateSimpleODRough(50, 30, 40, 200, 0.012, 2);
      expect(r.gcode_text).toContain("M8");
    });

    it("contains M30 program end", () => {
      const r = ppOkumaTurningPostEngine.generateSimpleODRough(50, 30, 40, 200, 0.012, 2);
      expect(r.gcode_text).toContain("M30");
    });

    it("contains spindle stop M5", () => {
      const r = ppOkumaTurningPostEngine.generateSimpleODRough(50, 30, 40, 200, 0.012, 2);
      expect(r.gcode_text).toContain("M5");
    });
  });

  describe("generate — multi-operation", () => {
    it("handles face + rough + finish", () => {
      const r = ppOkumaTurningPostEngine.generate({
        machine_id: "jmdie-okuma-lb3000",
        operations: [
          { type: "face", tool_number: 1, tool_position: 1, speed_sfm: 200, css: true, feed_mm_rev: 0.2, coolant: "flood", start_x_mm: 50 },
          { type: "od_rough", tool_number: 1, tool_position: 1, speed_sfm: 200, css: true, feed_mm_rev: 0.3, depth_of_cut_mm: 2, coolant: "flood", start_x_mm: 50, end_x_mm: 30, end_z_mm: -40 },
          { type: "od_finish", tool_number: 2, tool_position: 2, speed_sfm: 300, css: true, feed_mm_rev: 0.1, coolant: "flood", end_x_mm: 30, end_z_mm: -40 },
        ],
      });
      expect(r.operation_count).toBe(3);
      expect(r.gcode_text).toContain("T0101");
      expect(r.gcode_text).toContain("T0202");
    });
  });

  describe("generate — threading", () => {
    it("generates G76 thread cycle", () => {
      const r = ppOkumaTurningPostEngine.generate({
        machine_id: "jmdie-okuma-lb3000",
        operations: [{
          type: "thread", tool_number: 3, tool_position: 3,
          speed_rpm: 1000, coolant: "flood",
          thread_pitch_mm: 1.5, thread_depth_mm: 0.92, thread_passes: 6,
          start_x_mm: 20, end_z_mm: -15,
        }],
      });
      expect(r.gcode_text).toContain("G76");
      expect(r.gcode_text).toContain("F1.500"); // pitch as feed
    });
  });

  describe("generate — grooving/parting", () => {
    it("generates groove code", () => {
      const r = ppOkumaTurningPostEngine.generate({
        machine_id: "jmdie-okuma-lb3000",
        operations: [{
          type: "groove", tool_number: 4, tool_position: 4,
          speed_rpm: 800, feed_mm_rev: 0.05, coolant: "flood",
          start_x_mm: 40, end_x_mm: 25, end_z_mm: -20,
        }],
      });
      expect(r.gcode_text).toContain("G75");
    });

    it("generates part-off code", () => {
      const r = ppOkumaTurningPostEngine.generate({
        machine_id: "jmdie-okuma-lb3000",
        operations: [{
          type: "part", tool_number: 5, tool_position: 5,
          speed_rpm: 600, feed_mm_rev: 0.05, coolant: "flood",
          start_x_mm: 40, end_x_mm: -1, end_z_mm: -50,
        }],
      });
      expect(r.gcode_text).toContain("PART OFF");
    });
  });

  describe("generate — drilling", () => {
    it("generates peck drill G83", () => {
      const r = ppOkumaTurningPostEngine.generate({
        machine_id: "jmdie-okuma-lb3000",
        operations: [{
          type: "drill", tool_number: 6, tool_position: 6,
          speed_rpm: 1500, feed_mm_rev: 0.15, coolant: "tsc",
          end_z_mm: -30,
        }],
      });
      expect(r.gcode_text).toContain("G83");
      expect(r.gcode_text).toContain("M51"); // TSC coolant
    });
  });

  describe("generate — boring", () => {
    it("generates ID bore pass", () => {
      const r = ppOkumaTurningPostEngine.generate({
        machine_id: "jmdie-okuma-lb3000",
        operations: [{
          type: "id_bore", tool_number: 7, tool_position: 7,
          speed_sfm: 150, css: true, feed_mm_rev: 0.12, coolant: "flood",
          start_x_mm: 20, end_x_mm: 25, end_z_mm: -30,
        }],
      });
      expect(r.gcode_text).toContain("BORE");
    });
  });

  describe("warnings", () => {
    it("warns on aggressive DOC", () => {
      const r = ppOkumaTurningPostEngine.generate({
        machine_id: "jmdie-okuma-lb3000",
        operations: [{
          type: "od_rough", tool_number: 1, tool_position: 1,
          speed_sfm: 200, css: true, feed_mm_rev: 0.3,
          depth_of_cut_mm: 8, coolant: "flood",
          start_x_mm: 60, end_x_mm: 30, end_z_mm: -40,
        }],
      });
      expect(r.warnings.some(w => w.includes("aggressive"))).toBe(true);
    });
  });

  describe("program structure", () => {
    it("includes program number", () => {
      const r = ppOkumaTurningPostEngine.generate({
        machine_id: "jmdie-okuma-lb3000",
        program_number: "5555",
        operations: [{ type: "face", tool_number: 1, tool_position: 1, speed_rpm: 1000, coolant: "flood", start_x_mm: 50, feed_mm_rev: 0.2 }],
      });
      expect(r.gcode_text).toContain("O5555");
    });

    it("includes part description", () => {
      const r = ppOkumaTurningPostEngine.generate({
        machine_id: "jmdie-okuma-lb3000",
        part_description: "HEADING DIE #A123",
        operations: [{ type: "face", tool_number: 1, tool_position: 1, speed_rpm: 1000, coolant: "flood", start_x_mm: 50, feed_mm_rev: 0.2 }],
      });
      expect(r.gcode_text).toContain("HEADING DIE #A123");
    });

    it("includes material", () => {
      const r = ppOkumaTurningPostEngine.generate({
        machine_id: "jmdie-okuma-lb3000",
        material: "M2 tool steel",
        operations: [{ type: "face", tool_number: 1, tool_position: 1, speed_rpm: 1000, coolant: "flood", start_x_mm: 50, feed_mm_rev: 0.2 }],
      });
      expect(r.gcode_text).toContain("M2 tool steel");
    });
  });
});
