/**
 * PPOkumaSubSpindleSyncEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPOkumaSubSpindleSyncEngine,
  ppOkumaSubSpindleSyncEngine,
} from "../engines/PPOkumaSubSpindleSyncEngine.js";

describe("PPOkumaSubSpindleSyncEngine", () => {
  it("exports singleton", () => {
    expect(ppOkumaSubSpindleSyncEngine).toBeInstanceOf(PPOkumaSubSpindleSyncEngine);
  });

  describe("generate — program structure", () => {
    it("wraps with % markers", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{ type: "sync_spindle", sync_offset_deg: 0 }],
      });
      expect(r.gcode_lines[0]).toBe("%");
      expect(r.gcode_lines[r.gcode_lines.length - 1]).toBe("%");
    });

    it("includes program number O____", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        program_number: "9876",
        operations: [{ type: "sync_spindle" }],
      });
      expect(r.gcode_text).toContain("O9876");
    });

    it("includes machine model", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        machine_model: "LU3000",
        operations: [{ type: "sync_spindle" }],
      });
      expect(r.gcode_text).toContain("LU3000");
    });

    it("homes main and sub at start", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{ type: "sync_spindle" }],
      });
      expect(r.gcode_text).toContain("G28 U0 W0");
      expect(r.gcode_text).toContain("G28 B0");
    });

    it("ends with M30", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{ type: "sync_spindle" }],
      });
      expect(r.gcode_text).toContain("M30");
    });
  });

  describe("generate — sync_transfer", () => {
    it("emits sync on/off codes", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{
          type: "sync_transfer",
          transfer: {
            approach_z_mm: 100, transfer_z_mm: 10,
            cutoff_tool: 7, cutoff_tool_position: 7,
          },
        }],
      });
      expect(r.gcode_text).toContain("G145");
      expect(r.gcode_text).toContain("G146");
    });

    it("emits chuck open/close codes", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{
          type: "sync_transfer",
          transfer: { approach_z_mm: 100, transfer_z_mm: 10 },
        }],
      });
      expect(r.gcode_text).toContain("M227"); // sub chuck open
      expect(r.gcode_text).toContain("M228"); // sub chuck close
      expect(r.gcode_text).toContain("M87");  // main chuck open
    });

    it("emits cutoff tool selection", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{
          type: "sync_transfer",
          transfer: {
            approach_z_mm: 100, transfer_z_mm: 10,
            cutoff_tool: 5, cutoff_tool_position: 5,
            cutoff_feed_mm_rev: 0.08,
          },
        }],
      });
      expect(r.gcode_text).toContain("T0505");
      expect(r.gcode_text).toContain("F0.080");
    });

    it("counts transfer in summary", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{
          type: "sync_transfer",
          transfer: { approach_z_mm: 100, transfer_z_mm: 10 },
        }],
      });
      expect(r.transfer_count).toBe(1);
    });

    it("emits parts catcher codes when enabled", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{
          type: "sync_transfer",
          transfer: {
            approach_z_mm: 100, transfer_z_mm: 10,
            slug_catcher: true,
          },
        }],
      });
      expect(r.gcode_text).toContain("M24");
      expect(r.gcode_text).toContain("M25");
    });

    it("warns on missing transfer config", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{ type: "sync_transfer" }],
      });
      expect(r.warnings.some(w => w.includes("missing transfer"))).toBe(true);
    });

    it("warns on high RPM transfer", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{
          type: "sync_transfer",
          transfer: {
            approach_z_mm: 100, transfer_z_mm: 10,
            main_spindle_rpm: 800, // too high
          },
        }],
      });
      expect(r.warnings.some(w => w.includes("RPM"))).toBe(true);
    });
  });

  describe("generate — sync_spindle mode", () => {
    it("emits G145 with phase offset", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{ type: "sync_spindle", sync_offset_deg: 180 }],
      });
      expect(r.gcode_text).toContain("G145 P180");
    });

    it("emits G145 zero phase for 0 offset", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{ type: "sync_spindle", sync_offset_deg: 0 }],
      });
      expect(r.gcode_text).toContain("G145");
      expect(r.gcode_text).toContain("ZERO PHASE");
    });

    it("sets uses_sync flag", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{ type: "sync_spindle" }],
      });
      expect(r.uses_sync).toBe(true);
    });
  });

  describe("generate — sub_machining", () => {
    it("emits G110 sub-spindle offset", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{
          type: "sub_machining",
          sub_ops: [{
            op_type: "face", tool_number: 1, tool_position: 1,
            speed_rpm: 1200, feed_mm_rev: 0.1, start_x_mm: 50,
          }],
        }],
      });
      expect(r.gcode_text).toContain("G110");
    });

    it("face op uses G97 RPM mode", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{
          type: "sub_machining",
          sub_ops: [{
            op_type: "face", tool_number: 1, tool_position: 1,
            speed_rpm: 1200, feed_mm_rev: 0.1, start_x_mm: 50, end_x_mm: 0,
          }],
        }],
      });
      expect(r.gcode_text).toContain("G97");
      expect(r.gcode_text).toContain("M180");
    });

    it("drill op emits G74 peck drill", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{
          type: "sub_machining",
          sub_ops: [{
            op_type: "drill", tool_number: 2, tool_position: 2,
            speed_rpm: 2000, feed_mm_rev: 0.15, end_z_mm: -20,
          }],
        }],
      });
      expect(r.gcode_text).toContain("G74");
    });

    it("tap op emits G84 rigid tap", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{
          type: "sub_machining",
          sub_ops: [{
            op_type: "tap", tool_number: 3, tool_position: 3,
            speed_rpm: 500, feed_mm_rev: 1.5, end_z_mm: -10,
          }],
        }],
      });
      expect(r.gcode_text).toContain("G84");
    });

    it("CSS mode uses G96", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{
          type: "sub_machining",
          sub_ops: [{
            op_type: "face", tool_number: 1, tool_position: 1,
            speed_sfm: 300, css: true, feed_mm_rev: 0.1, start_x_mm: 40,
          }],
        }],
      });
      expect(r.gcode_text).toContain("G96");
    });

    it("warns on empty sub_ops", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{ type: "sub_machining", sub_ops: [] }],
      });
      expect(r.warnings.some(w => w.includes("no sub_ops"))).toBe(true);
    });
  });

  describe("generate — dual_turret", () => {
    it("emits channel markers", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{
          type: "dual_turret",
          turret_1_ops: ["G00 X50 Z2", "G01 X40 F0.2"],
          turret_2_ops: ["G00 X10 Z-5", "G01 Z-20 F0.1"],
        }],
      });
      expect(r.gcode_text).toContain("$1");
      expect(r.gcode_text).toContain("$2");
    });

    it("emits default wait code M200", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{
          type: "dual_turret",
          turret_1_ops: ["G00 X50"],
          turret_2_ops: ["G00 X10"],
        }],
      });
      expect(r.gcode_text).toContain("M200");
    });

    it("emits custom wait code", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{
          type: "dual_turret",
          turret_1_ops: ["G00 X50"],
          turret_2_ops: ["G00 X10"],
          sync_wait_code: "M110",
        }],
      });
      expect(r.gcode_text).toContain("M110");
    });

    it("sets uses_dual_turret flag", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{
          type: "dual_turret",
          turret_1_ops: ["G00 X50"], turret_2_ops: ["G00 X10"],
        }],
      });
      expect(r.uses_dual_turret).toBe(true);
    });
  });

  describe("generate — pickoff", () => {
    it("emits sync + chuck sequence", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{
          type: "pickoff",
          transfer: {
            approach_z_mm: 80, transfer_z_mm: 5,
            main_spindle_rpm: 100, sub_spindle_rpm: 100,
          },
        }],
      });
      expect(r.gcode_text).toContain("G145");
      expect(r.gcode_text).toContain("G146");
      expect(r.gcode_text).toContain("M227");
      expect(r.gcode_text).toContain("M228");
    });
  });

  describe("generate — parts_catcher", () => {
    it("emits M24/M25 catcher sequence", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        operations: [{ type: "parts_catcher" }],
      });
      expect(r.gcode_text).toContain("M24");
      expect(r.gcode_text).toContain("M25");
      expect(r.gcode_text).toContain("M227"); // sub opens
    });
  });

  describe("generateSimpleTransfer", () => {
    it("produces valid 1-transfer program", () => {
      const r = ppOkumaSubSpindleSyncEngine.generateSimpleTransfer(25, 60, "D2");
      expect(r.transfer_count).toBe(1);
      expect(r.gcode_text).toContain("D2");
    });

    it("includes part length in description", () => {
      const r = ppOkumaSubSpindleSyncEngine.generateSimpleTransfer(30, 75);
      expect(r.gcode_text).toContain("L75");
    });

    it("enables slug catcher by default", () => {
      const r = ppOkumaSubSpindleSyncEngine.generateSimpleTransfer(25, 50);
      expect(r.gcode_text).toContain("M24");
    });
  });

  describe("list methods", () => {
    it("lists 6 operation types", () => {
      expect(ppOkumaSubSpindleSyncEngine.listOperations().length).toBe(6);
    });

    it("lists machine models", () => {
      const models = ppOkumaSubSpindleSyncEngine.listMachineModels();
      expect(models).toContain("LU3000");
      expect(models).toContain("LT3000");
    });
  });

  describe("multi-operation program", () => {
    it("handles transfer + sub machining + catcher sequence", () => {
      const r = ppOkumaSubSpindleSyncEngine.generate({
        part_description: "FULL CYCLE",
        operations: [
          {
            type: "sync_transfer",
            transfer: {
              approach_z_mm: 60, transfer_z_mm: 5,
              main_spindle_rpm: 150, cutoff_tool: 7, cutoff_tool_position: 7,
            },
          },
          {
            type: "sub_machining",
            sub_ops: [{
              op_type: "face", tool_number: 8, tool_position: 8,
              speed_rpm: 2000, feed_mm_rev: 0.08, start_x_mm: 30, end_x_mm: 0,
            }],
          },
          { type: "parts_catcher" },
        ],
      });
      expect(r.operation_count).toBe(3);
      expect(r.transfer_count).toBe(1);
      expect(r.gcode_text).toContain("G145");
      expect(r.gcode_text).toContain("G110");
      expect(r.gcode_text).toContain("M24");
    });
  });
});
