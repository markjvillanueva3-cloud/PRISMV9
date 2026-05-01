/**
 * SIM-MS0 Phase 1-U02 + Phase 2 Tests
 * SimulationReportEngine + PhysicsAwareSimulationEngine
 */
import { describe, it, expect } from "vitest";
import { simulationReportEngine } from "../engines/SimulationReportEngine.js";
import { physicsAwareSimulationEngine } from "../engines/PhysicsAwareSimulationEngine.js";
import { cncSimulationPipelineEngine } from "../engines/CNCSimulationPipelineEngine.js";

const PROGRAM = [
  "O1001", "G90 G54", "S8000 M03",
  "G00 X0 Y0 Z50", "G00 Z5",
  "G01 Z-5 F200", "G01 X100 F500",
  "G01 Y50", "G01 X0", "G01 Y0",
  "G00 Z50", "M30",
];

describe("SimulationReportEngine", () => {
  it("generates report from simulation result", () => {
    const sim = cncSimulationPipelineEngine.simulate({ gcode_blocks: PROGRAM, material: "steel" });
    const report = simulationReportEngine.generateReport(sim);
    expect(report.collision).toBeTruthy();
    expect(report.axes.length).toBe(3);
    expect(report.physics).toBeTruthy();
    expect(report.cost).toBeTruthy();
    expect(report.cycle_time).toBeTruthy();
  });

  it("risk level reflects safety score", () => {
    const safe = cncSimulationPipelineEngine.simulate({ gcode_blocks: ["G00 X50 Y50 Z-10"] });
    const report = simulationReportEngine.generateReport(safe);
    expect(["safe", "caution"]).toContain(report.risk_level);
    expect(report.safety_score).toBeGreaterThan(0.5);
  });

  it("cost breakdown sums correctly", () => {
    const sim = cncSimulationPipelineEngine.simulate({ gcode_blocks: PROGRAM });
    const report = simulationReportEngine.generateReport(sim);
    const sum = report.cost.machine_cost_usd + report.cost.tool_cost_usd + report.cost.energy_cost_usd;
    expect(Math.abs(report.cost.total_cost_usd - sum)).toBeLessThan(0.02);
  });

  it("cycle time percentages sum to ~100%", () => {
    const sim = cncSimulationPipelineEngine.simulate({ gcode_blocks: PROGRAM });
    const report = simulationReportEngine.generateReport(sim);
    const total = report.cycle_time.cutting_pct + report.cycle_time.rapid_pct + report.cycle_time.idle_pct;
    expect(total).toBeGreaterThanOrEqual(98);
    expect(total).toBeLessThanOrEqual(102);
  });

  it("generates recommendations", () => {
    const sim = cncSimulationPipelineEngine.simulate({ gcode_blocks: PROGRAM });
    const report = simulationReportEngine.generateReport(sim);
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  it("summary text contains key info", () => {
    const sim = cncSimulationPipelineEngine.simulate({ gcode_blocks: PROGRAM });
    const report = simulationReportEngine.generateReport(sim);
    expect(report.summary_text).toContain("SIMULATION REPORT");
    expect(report.summary_text).toContain("Safety");
    expect(report.summary_text).toContain("Cost");
  });

  it("axis report shows travel used", () => {
    const sim = cncSimulationPipelineEngine.simulate({ gcode_blocks: PROGRAM });
    const report = simulationReportEngine.generateReport(sim);
    const xAxis = report.axes.find(a => a.axis === "X");
    expect(xAxis!.travel_used_mm).toBeGreaterThan(0);
  });
});

describe("PhysicsAwareSimulationEngine", () => {
  it("computes cutting force for steel", () => {
    const r = physicsAwareSimulationEngine.computeBlockPhysics({
      cutting_speed_m_min: 150,
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 3,
      width_of_cut_mm: 6,
      tool_diameter_mm: 12,
      tool_length_mm: 50,
      tool_flutes: 4,
      material: "steel",
    });
    expect(r.cutting_force_N).toBeGreaterThan(0);
    expect(r.power_kW).toBeGreaterThan(0);
    expect(r.temperature_C).toBeGreaterThan(20);
  });

  it("aluminum has lower force than steel", () => {
    const base = { cutting_speed_m_min: 150, feed_mm_rev: 0.2, depth_of_cut_mm: 3, width_of_cut_mm: 6, tool_diameter_mm: 12, tool_length_mm: 50, tool_flutes: 4 };
    const steel = physicsAwareSimulationEngine.computeBlockPhysics({ ...base, material: "steel" });
    const alum = physicsAwareSimulationEngine.computeBlockPhysics({ ...base, material: "aluminum" });
    expect(alum.cutting_force_N).toBeLessThan(steel.cutting_force_N);
  });

  it("longer tool has more deflection", () => {
    const base = { cutting_speed_m_min: 150, feed_mm_rev: 0.2, depth_of_cut_mm: 3, width_of_cut_mm: 6, tool_diameter_mm: 10, tool_flutes: 4, material: "steel" };
    const short = physicsAwareSimulationEngine.computeBlockPhysics({ ...base, tool_length_mm: 30 });
    const long = physicsAwareSimulationEngine.computeBlockPhysics({ ...base, tool_length_mm: 80 });
    expect(long.deflection_um).toBeGreaterThan(short.deflection_um);
  });

  it("detects unsafe conditions with extreme params", () => {
    const r = physicsAwareSimulationEngine.computeBlockPhysics({
      cutting_speed_m_min: 300,
      feed_mm_rev: 0.5,
      depth_of_cut_mm: 15,
      width_of_cut_mm: 30,
      tool_diameter_mm: 6,
      tool_length_mm: 100,
      tool_flutes: 4,
      material: "inconel",
    });
    // Either force overload or deflection or temperature should trigger
    expect(r.is_safe).toBe(false);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("surface finish improves with smaller feed", () => {
    const base = { cutting_speed_m_min: 150, depth_of_cut_mm: 2, width_of_cut_mm: 6, tool_diameter_mm: 12, tool_length_mm: 50, tool_flutes: 4, material: "steel" };
    const coarse = physicsAwareSimulationEngine.computeBlockPhysics({ ...base, feed_mm_rev: 0.3 });
    const fine = physicsAwareSimulationEngine.computeBlockPhysics({ ...base, feed_mm_rev: 0.05 });
    expect(fine.surface_finish_Ra_um).toBeLessThan(coarse.surface_finish_Ra_um);
  });

  it("computes all 3 force components", () => {
    const r = physicsAwareSimulationEngine.computeBlockPhysics({
      cutting_speed_m_min: 150,
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 3,
      width_of_cut_mm: 6,
      tool_diameter_mm: 12,
      tool_length_mm: 50,
      tool_flutes: 4,
      material: "steel",
    });
    expect(r.feed_force_N).toBeGreaterThan(0);
    expect(r.passive_force_N).toBeGreaterThan(0);
    expect(r.resultant_force_N).toBeGreaterThan(r.cutting_force_N);
  });

  it("MRR computed correctly", () => {
    const r = physicsAwareSimulationEngine.computeBlockPhysics({
      cutting_speed_m_min: 150,
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 3,
      width_of_cut_mm: 6,
      tool_diameter_mm: 12,
      tool_length_mm: 50,
      tool_flutes: 4,
      material: "steel",
      spindle_rpm: 4000,
    });
    expect(r.mrr_cm3_min).toBeGreaterThan(0);
  });

  it("specific energy is reasonable", () => {
    const r = physicsAwareSimulationEngine.computeBlockPhysics({
      cutting_speed_m_min: 150,
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 3,
      width_of_cut_mm: 6,
      tool_diameter_mm: 12,
      tool_length_mm: 50,
      tool_flutes: 4,
      material: "steel",
      spindle_rpm: 4000,
    });
    expect(r.specific_energy_J_mm3).toBeGreaterThan(0);
  });
});
