import { describe, it, expect } from "vitest";
import { MillTurnCAMEngine } from "../engines/MillTurnCAMEngine.js";

const engine = new MillTurnCAMEngine();

const baseConfig = {
  material_iso_group: "P",
  machine_type: "mill_turn" as const,
  max_main_rpm: 4000,
  max_sub_rpm: 4000,
  max_live_rpm: 6000,
  program_number: 6000,
};

describe("MillTurnCAMEngine", () => {
  it("generates turning program with G96 CSS and G71 roughing", () => {
    const result = engine.generate([{
      id: "rough-1", type: "od_roughing", spindle: "main",
      dimensions: { diameter_mm: 50, length_mm: 60 },
      params: { speed_mpm: 200, feed_mmrev: 0.25 },
    }], baseConfig);

    expect(result.gcode).toContain("G96"); // CSS
    expect(result.gcode).toContain("G71"); // roughing cycle
    expect(result.gcode).toContain("G50"); // RPM clamp
    expect(result.channels.length).toBe(1);
    expect(result.total_cycle_time_min).toBeGreaterThan(0);
  });

  it("generates live tool cross-drilling", () => {
    const result = engine.generate([{
      id: "xdrill-1", type: "cross_drill", spindle: "main",
      position: { x: 0, z: 15, c_deg: 0 },
      dimensions: { diameter_mm: 30, depth_mm: 8 },
      tool: { type: "drill", diameter_mm: 5, is_live: true, rpm: 4000 },
    }], baseConfig);

    expect(result.gcode).toContain("M133"); // live tool on
    expect(result.gcode).toContain("G83"); // peck drill
    expect(result.gcode).toContain("M134"); // live tool off
  });

  it("generates threading with G76", () => {
    const result = engine.generate([{
      id: "thread-1", type: "threading", spindle: "main",
      dimensions: { diameter_mm: 20, length_mm: 25 },
    }], baseConfig);

    expect(result.gcode).toContain("G76");
    expect(result.gcode).toContain("G97"); // constant RPM for threading
  });

  it("generates grooving with G75", () => {
    const result = engine.generate([{
      id: "groove-1", type: "grooving", spindle: "main",
      dimensions: { diameter_mm: 40, width_mm: 4 },
      position: { x: 0, z: 20 },
    }], baseConfig);

    expect(result.gcode).toContain("G75");
  });

  it("handles multi-channel with sub-spindle", () => {
    const result = engine.generate([
      {
        id: "rough-main", type: "od_roughing", spindle: "main",
        dimensions: { diameter_mm: 30, length_mm: 40 },
      },
      {
        id: "back-face", type: "facing", spindle: "sub",
        dimensions: { diameter_mm: 30 },
      },
    ], baseConfig);

    expect(result.channels.length).toBe(2);
    expect(result.channels[0].spindle).toBe("main");
    expect(result.channels[1].spindle).toBe("sub");
    expect(result.sync_points.length).toBeGreaterThan(0);
    // Sync point for part transfer
    expect(result.gcode).toContain("M200");
  });

  it("computes bar management for Swiss", () => {
    const result = engine.generate([{
      id: "turn-1", type: "od_roughing", spindle: "main",
      dimensions: { diameter_mm: 12, length_mm: 25 },
    }], {
      ...baseConfig,
      machine_type: "swiss" as const,
      bar_diameter_mm: 12,
      bar_length_mm: 3000,
      part_length_mm: 25,
    });

    expect(result.bar_management).toBeDefined();
    expect(result.bar_management!.parts_per_bar).toBeGreaterThan(50);
    expect(result.bar_management!.bar_diameter_mm).toBe(12);
    expect(result.gcode).toContain("M21"); // bar feed
  });

  it("respects operation dependencies", () => {
    const result = engine.generate([
      {
        id: "thread-1", type: "threading", spindle: "main",
        dimensions: { diameter_mm: 20, length_mm: 20 },
        requires_ops: ["rough-1"],
      },
      {
        id: "rough-1", type: "od_roughing", spindle: "main",
        dimensions: { diameter_mm: 20, length_mm: 30 },
      },
    ], baseConfig);

    // Roughing should come before threading
    const ops = result.channels[0].operations;
    const roughIdx = ops.findIndex(o => o.op_id === "rough-1");
    const threadIdx = ops.findIndex(o => o.op_id === "thread-1");
    expect(roughIdx).toBeLessThan(threadIdx);
  });

  it("collects tool list", () => {
    const result = engine.generate([
      {
        id: "t1", type: "od_roughing", spindle: "main",
        dimensions: { diameter_mm: 30, length_mm: 40 },
        tool: { type: "CNMG insert", diameter_mm: 10 },
      },
      {
        id: "t2", type: "cross_drill", spindle: "main",
        dimensions: { diameter_mm: 30, depth_mm: 5 },
        tool: { type: "drill", diameter_mm: 5, is_live: true },
      },
    ], baseConfig);

    expect(result.tool_list.length).toBe(2);
    expect(result.tool_list[1].description).toContain("LIVE");
  });

  it("handles Y-axis milling", () => {
    const result = engine.generate([{
      id: "ymill-1", type: "off_center_pocket", spindle: "main",
      position: { x: 0, z: 10, y: 5, c_deg: 90 },
      dimensions: { diameter_mm: 30, width_mm: 8 },
      tool: { type: "end_mill", diameter_mm: 6, is_live: true, rpm: 5000 },
    }], baseConfig);

    expect(result.gcode).toContain("Y5.0"); // Y-axis move
    expect(result.gcode).toContain("C90.0"); // C-axis index
  });

  it("parting as last operation", () => {
    const result = engine.generate([
      {
        id: "part-1", type: "parting", spindle: "main",
        dimensions: { diameter_mm: 20, width_mm: 3 },
      },
      {
        id: "rough-1", type: "od_roughing", spindle: "main",
        dimensions: { diameter_mm: 20, length_mm: 25 },
      },
    ], baseConfig);

    // Parting should be sequenced last
    const ops = result.channels[0].operations;
    const roughIdx = ops.findIndex(o => o.op_id === "rough-1");
    const partIdx = ops.findIndex(o => o.op_id === "part-1");
    expect(roughIdx).toBeLessThan(partIdx);
  });
});
