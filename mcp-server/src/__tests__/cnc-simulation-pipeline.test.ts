/**
 * CNCSimulationPipelineEngine — Unified Simulation Tests
 * SIM-MS0 Phase 1
 */
import { describe, it, expect } from "vitest";
import { cncSimulationPipelineEngine } from "../engines/CNCSimulationPipelineEngine.js";

const SIMPLE_PROGRAM = [
  "O1001",
  "G90 G54",
  "S8000 M03",
  "G00 X0 Y0 Z50",
  "G00 Z5",
  "G01 Z-5 F200",
  "G01 X100 F500",
  "G01 Y50",
  "G01 X0",
  "G01 Y0",
  "G00 Z50",
  "M30",
];

describe("CNCSimulationPipelineEngine", () => {
  it("simulates a simple program", () => {
    const result = cncSimulationPipelineEngine.simulate({
      gcode_blocks: SIMPLE_PROGRAM,
      tool_diameter_mm: 12,
      tool_flutes: 4,
      material: "steel",
    });
    expect(result.total_blocks).toBe(SIMPLE_PROGRAM.length);
    expect(result.blocks_simulated).toBe(SIMPLE_PROGRAM.length);
    expect(result.cycle_time_s).toBeGreaterThan(0);
  });

  it("computes cutting force for steel", () => {
    const result = cncSimulationPipelineEngine.simulate({
      gcode_blocks: ["S8000 M03", "G01 X100 Z-3 F500"],
      tool_diameter_mm: 12,
      tool_flutes: 4,
      material: "steel",
    });
    const cuttingBlock = result.block_results.find(b => b.cutting_force_N && b.cutting_force_N > 0);
    expect(cuttingBlock).toBeTruthy();
    expect(cuttingBlock!.cutting_force_N).toBeGreaterThan(0);
  });

  it("aluminum has lower cutting force than steel", () => {
    const steel = cncSimulationPipelineEngine.simulate({
      gcode_blocks: ["S8000 M03", "G01 X100 Z-3 F500"],
      material: "steel",
    });
    const alum = cncSimulationPipelineEngine.simulate({
      gcode_blocks: ["S8000 M03", "G01 X100 Z-3 F500"],
      material: "aluminum",
    });
    expect(alum.max_force_N).toBeLessThan(steel.max_force_N);
  });

  it("computes temperature rise", () => {
    const result = cncSimulationPipelineEngine.simulate({
      gcode_blocks: ["S10000 M03", "G01 X100 Z-5 F800"],
      material: "steel",
    });
    expect(result.max_temperature_C).toBeGreaterThan(20);
  });

  it("computes tool deflection", () => {
    const result = cncSimulationPipelineEngine.simulate({
      gcode_blocks: ["S8000 M03", "G01 X100 Z-5 F500"],
      tool_diameter_mm: 6,
      tool_length_mm: 80,
    });
    expect(result.max_deflection_um).toBeGreaterThan(0);
    // Smaller diameter + longer tool = more deflection
    const stiff = cncSimulationPipelineEngine.simulate({
      gcode_blocks: ["S8000 M03", "G01 X100 Z-5 F500"],
      tool_diameter_mm: 20,
      tool_length_mm: 40,
    });
    expect(result.max_deflection_um).toBeGreaterThan(stiff.max_deflection_um);
  });

  it("tracks tool life consumption", () => {
    const result = cncSimulationPipelineEngine.simulate({
      gcode_blocks: SIMPLE_PROGRAM,
      material: "steel",
    });
    expect(result.tool_life_consumed_pct).toBeGreaterThan(0);
  });

  it("computes cost estimate", () => {
    const result = cncSimulationPipelineEngine.simulate({
      gcode_blocks: SIMPLE_PROGRAM,
    });
    expect(result.cost_estimate_usd).toBeGreaterThan(0);
  });

  it("detects axis violations", () => {
    const result = cncSimulationPipelineEngine.simulate({
      gcode_blocks: ["G00 X-100 Y-100 Z-500"],
      stock_x_mm: 200,
      stock_y_mm: 150,
      stock_z_mm: 50,
    });
    expect(result.axis_violations.length).toBeGreaterThan(0);
  });

  it("separates rapid vs cutting time", () => {
    const result = cncSimulationPipelineEngine.simulate({
      gcode_blocks: SIMPLE_PROGRAM,
    });
    expect(result.rapid_time_s).toBeGreaterThan(0);
    expect(result.cutting_time_s).toBeGreaterThan(0);
    expect(result.cycle_time_s).toBeCloseTo(result.rapid_time_s + result.cutting_time_s, 1);
  });

  it("generates summary string", () => {
    const result = cncSimulationPipelineEngine.simulate({
      gcode_blocks: SIMPLE_PROGRAM,
    });
    expect(result.summary).toContain("Simulated");
    expect(result.summary).toContain("Max force");
    expect(result.summary).toContain("Safety");
  });

  it("safety score degrades with axis violations", () => {
    const safe = cncSimulationPipelineEngine.simulate({
      gcode_blocks: ["G00 X50 Y50 Z-10"],
    });
    const unsafe = cncSimulationPipelineEngine.simulate({
      gcode_blocks: ["G00 X-100 Y-100 Z-500"],
      stock_x_mm: 100,
      stock_y_mm: 100,
      stock_z_mm: 50,
    });
    expect(safe.safety_score).toBeGreaterThan(unsafe.safety_score);
  });

  it("handles empty program", () => {
    const result = cncSimulationPipelineEngine.simulate({
      gcode_blocks: [],
    });
    expect(result.total_blocks).toBe(0);
    expect(result.cycle_time_s).toBe(0);
    expect(result.safety_score).toBe(1);
  });

  it("titanium has higher temperature than aluminum", () => {
    const ti = cncSimulationPipelineEngine.simulate({
      gcode_blocks: ["S5000 M03", "G01 X100 Z-3 F300"],
      material: "titanium",
    });
    const al = cncSimulationPipelineEngine.simulate({
      gcode_blocks: ["S5000 M03", "G01 X100 Z-3 F300"],
      material: "aluminum",
    });
    expect(ti.max_temperature_C).toBeGreaterThan(al.max_temperature_C);
  });

  it("MRR computed for cutting blocks", () => {
    const result = cncSimulationPipelineEngine.simulate({
      gcode_blocks: ["S8000 M03", "G01 X100 Z-5 F500"],
      material: "steel",
    });
    const cuttingBlock = result.block_results.find(b => b.mrr_cm3_min && b.mrr_cm3_min > 0);
    expect(cuttingBlock).toBeTruthy();
    expect(cuttingBlock!.mrr_cm3_min).toBeGreaterThan(0);
  });

  it("stock removal percentage computed", () => {
    const result = cncSimulationPipelineEngine.simulate({
      gcode_blocks: ["S8000 M03", "G01 X200 Z-5 F500"],
      stock_x_mm: 200,
      stock_y_mm: 150,
      stock_z_mm: 50,
    });
    expect(result.stock_removed_pct).toBeGreaterThanOrEqual(0);
  });
});
