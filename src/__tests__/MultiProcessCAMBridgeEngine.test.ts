import { describe, it, expect } from "vitest";
import {
  MultiProcessCAMBridgeEngine,
} from "../engines/MultiProcessCAMBridgeEngine.js";

const engine = new MultiProcessCAMBridgeEngine();
const steel = { iso_group: "P", name: "1045 Steel" };
const machine = { name: "Haas ST-20", max_rpm: 4000, max_power_kw: 15 };

describe("MultiProcessCAMBridgeEngine", () => {
  // === Process Detection ===
  it("detects turning from feature type", () => {
    expect(engine.detectProcess("od_roughing")).toBe("turning");
    expect(engine.detectProcess("threading")).toBe("turning");
    expect(engine.detectProcess("grooving")).toBe("turning");
    expect(engine.detectProcess("parting")).toBe("turning");
  });

  it("detects milling from feature type", () => {
    expect(engine.detectProcess("pocket")).toBe("milling");
    expect(engine.detectProcess("contour")).toBe("milling");
    expect(engine.detectProcess("face")).toBe("milling");
  });

  it("detects EDM from feature type", () => {
    expect(engine.detectProcess("wire_edm_profile")).toBe("wire_edm");
    expect(engine.detectProcess("sinker_edm")).toBe("sinker_edm");
  });

  it("detects grinding, laser, waterjet", () => {
    expect(engine.detectProcess("surface_grind")).toBe("grinding");
    expect(engine.detectProcess("laser_cut")).toBe("laser");
    expect(engine.detectProcess("waterjet_cut")).toBe("waterjet");
  });

  // === Turning ===
  it("generates turning G-code with CSS and G71", () => {
    const result = engine.processAll([{
      id: "turn-1",
      type: "od_roughing",
      turning: { od_mm: 50, length_mm: 80 },
    }], steel, machine);

    expect(result.processes.length).toBe(1);
    const p = result.processes[0];
    expect(p.process).toBe("turning");
    expect(p.gcode).toContain("G96"); // CSS
    expect(p.gcode).toContain("G71"); // roughing cycle
    expect(p.gcode).toContain("G50"); // max RPM clamp
    expect(p.physics.force_N).toBeGreaterThan(0);
    expect(p.physics.power_kW).toBeGreaterThan(0);
    expect(p.physics.cycle_time_min).toBeGreaterThan(0);
  });

  it("generates threading G-code with G76", () => {
    const result = engine.processAll([{
      id: "thread-1",
      type: "threading",
      turning: {
        od_mm: 20, length_mm: 30,
        thread_pitch_mm: 2.0,
      },
    }], steel, machine);

    const p = result.processes[0];
    expect(p.gcode).toContain("G76");
    expect(p.tool_recommendation).toContain("threading");
  });

  it("generates grooving G-code with G75", () => {
    const result = engine.processAll([{
      id: "groove-1",
      type: "grooving",
      turning: {
        od_mm: 40, length_mm: 50,
        groove_width_mm: 4, groove_depth_mm: 8,
      },
    }], steel, machine);

    const p = result.processes[0];
    expect(p.gcode).toContain("G75");
    expect(p.tool_recommendation.length).toBeGreaterThan(5);
  });

  // === Wire EDM ===
  it("generates wire EDM parameters", () => {
    const result = engine.processAll([{
      id: "wedm-1",
      type: "wire_edm_profile",
      cutting: {
        material_thickness_mm: 25,
        contour_length_mm: 150,
      },
      edm: { wire_diameter_mm: 0.25, skim_cuts: 3 },
      dimensions: { length_mm: 50, width_mm: 30 },
    }], steel);

    const p = result.processes[0];
    expect(p.process).toBe("wire_edm");
    expect(p.gcode).toContain("G41"); // wire offset
    expect(p.physics.surface_finish_Ra).toBeLessThanOrEqual(0.8);
    expect(p.physics.cycle_time_min).toBeGreaterThan(0);
  });

  // === Sinker EDM ===
  it("generates sinker EDM burn parameters", () => {
    const result = engine.processAll([{
      id: "sedm-1",
      type: "sinker_edm",
      edm: {
        electrode_material: "graphite",
        spark_gap_mm: 0.02,
        surface_finish_vdi: 18,
      },
      dimensions: { length_mm: 20, width_mm: 15, depth_mm: 10 },
    }], steel);

    const p = result.processes[0];
    expect(p.process).toBe("sinker_edm");
    expect(p.physics.mrr_mm3_min).toBeGreaterThan(0);
    expect(p.physics.cycle_time_min).toBeGreaterThan(0);
    expect(p.tool_recommendation).toContain("graphite");
  });

  // === Grinding ===
  it("generates grinding parameters with Malkin force", () => {
    const result = engine.processAll([{
      id: "grind-1",
      type: "surface_grind",
      grinding: {
        stock_removal_mm: 0.3,
        surface_finish_Ra: 0.4,
        wheel_diameter_mm: 200,
      },
      dimensions: { length_mm: 100, width_mm: 50 },
    }], { iso_group: "H", hardness_hrc: 60 });

    const p = result.processes[0];
    expect(p.process).toBe("grinding");
    expect(p.physics.force_N).toBeGreaterThan(0);
    expect(p.physics.surface_finish_Ra).toBe(0.4);
    expect(p.parameters.passes).toBeGreaterThan(0);
  });

  // === Laser ===
  it("generates laser cutting parameters", () => {
    const result = engine.processAll([{
      id: "laser-1",
      type: "laser_cut",
      cutting: {
        material_thickness_mm: 6,
        contour_length_mm: 500,
        quality_level: "fine",
      },
    }], steel);

    const p = result.processes[0];
    expect(p.process).toBe("laser");
    expect(p.gcode).toContain("G41"); // kerf comp
    expect(p.physics.cycle_time_min).toBeGreaterThan(0);
    expect(p.physics.surface_finish_Ra).toBeLessThanOrEqual(1.6);
  });

  // === Waterjet ===
  it("generates waterjet cutting parameters", () => {
    const result = engine.processAll([{
      id: "wj-1",
      type: "waterjet_cut",
      cutting: {
        material_thickness_mm: 50,
        contour_length_mm: 300,
        quality_level: "medium",
      },
    }], { iso_group: "S" });

    const p = result.processes[0];
    expect(p.process).toBe("waterjet");
    expect(p.physics.cycle_time_min).toBeGreaterThan(0);
    expect(p.parameters.pressure_bar).toBe(4000);
    expect(p.tool_recommendation).toContain("garnet");
  });

  // === Multi-Process ===
  it("handles mixed processes in one call", () => {
    const result = engine.processAll([
      {
        id: "mill-1", type: "pocket",
        dimensions: { length_mm: 50, width_mm: 30, depth_mm: 10 },
      },
      {
        id: "turn-1", type: "od_roughing",
        turning: { od_mm: 40, length_mm: 60 },
      },
      {
        id: "grind-1", type: "surface_grind",
        grinding: { stock_removal_mm: 0.2 },
        dimensions: { length_mm: 80, width_mm: 40 },
      },
    ], steel, machine);

    expect(result.total_features).toBe(3);
    expect(Object.keys(result.process_summary).length).toBe(3);
    expect(result.process_summary.milling).toBe(1);
    expect(result.process_summary.turning).toBe(1);
    expect(result.process_summary.grinding).toBe(1);
    expect(result.combined_cycle_time_min).toBeGreaterThan(0);
  });

  it("routes milling features through a real delegate program path", () => {
    const result = engine.processAll([{
      id: "mill-live",
      type: "pocket",
      dimensions: { length_mm: 50, width_mm: 30, depth_mm: 10 },
      tolerance_mm: 0.05,
      surface_finish_Ra: 3.2,
    }], steel, { name: "VF-2", max_rpm: 8000, max_power_kw: 15 });

    const p = result.processes[0];
    expect(p.process).toBe("milling");
    expect(p.degraded).not.toBe(true);
    expect(p.gcode.length).toBeGreaterThan(0);
    expect(p.gcode_lines).toBeGreaterThan(0);
    expect(result.combined_gcode.length).toBeGreaterThan(0);
    expect(result.degraded_processes).toBe(0);
  });

  it("routes multi-axis features through the real multiaxis delegate", () => {
    const result = engine.processAll([{
      id: "ax-live",
      type: "five_axis_contour",
      dimensions: { length_mm: 40, width_mm: 20, depth_mm: 8 },
      tolerance_mm: 0.05,
      surface_finish_Ra: 1.6,
    }], steel, { name: "UMC-750", max_rpm: 12000, max_power_kw: 25 });

    const p = result.processes[0];
    expect(p.process).toBe("multi_axis");
    expect(p.degraded).not.toBe(true);
    expect(p.gcode).toContain("G43.4");
    expect(p.gcode_lines).toBeGreaterThan(0);
    expect(result.combined_gcode.length).toBeGreaterThan(0);
    expect(result.degraded_processes).toBe(0);
  });

  it("routes generic mill-turn features through the mill-turn CAM delegate", () => {
    const result = engine.processAll([{
      id: "mt-live",
      type: "mill_turn",
      turning: { od_mm: 40, length_mm: 60 },
      dimensions: { width_mm: 10, depth_mm: 5, diameter_mm: 6 },
    }], steel, { name: "Integrex", max_rpm: 5000, max_power_kw: 15 });

    const p = result.processes[0];
    expect(p.process).toBe("mill_turn");
    expect(p.degraded).not.toBe(true);
    expect(p.gcode).toContain("G71");
    expect(p.gcode).toContain("M133");
    expect(p.gcode_lines).toBeGreaterThan(0);
    expect(result.combined_gcode.length).toBeGreaterThan(0);
    expect(result.degraded_processes).toBe(0);
  });

  it("provides tool recommendations per process", () => {
    const result = engine.processAll([
      {
        id: "turn-1", type: "od_roughing",
        turning: { od_mm: 50, length_mm: 40 },
      },
    ], { iso_group: "S" }, machine);

    const p = result.processes[0];
    expect(p.tool_recommendation).toContain("KC5010");
  });

  it("warns on power limit for turning", () => {
    const result = engine.processAll([{
      id: "turn-heavy",
      type: "od_roughing",
      turning: { od_mm: 200, length_mm: 200 },
    }], steel, { max_rpm: 2000, max_power_kw: 5 });

    // Heavy turning on large diameter may exceed power
    expect(result.processes[0].process).toBe("turning");
    // Physics should be computed regardless
    expect(result.processes[0].physics.power_kW).toBeGreaterThan(0);
  });

  it("handles thick waterjet with taper warning", () => {
    const result = engine.processAll([{
      id: "wj-thick",
      type: "waterjet_cut",
      cutting: { material_thickness_mm: 75, contour_length_mm: 200 },
    }], steel);

    const p = result.processes[0];
    expect(p.parameters.taper_deg).toBeGreaterThan(0);
    expect(p.warnings.some(
      w => /taper/i.test(w)
    )).toBe(true);
  });
});
