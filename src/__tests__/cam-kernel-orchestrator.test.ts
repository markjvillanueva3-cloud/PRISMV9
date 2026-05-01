/**
 * CAMKernelOrchestratorEngine Tests — CK-MS7
 *
 * Tests for 3 high-level pipelines: cam_generate, cam_turn, cam_simulate
 */
import { describe, it, expect } from "vitest";
import {
  camKernelOrchestratorEngine,
  CAMKernelOrchestratorEngine,
} from "../engines/CAMKernelOrchestratorEngine.js";
import type {
  CamGenerateInput,
  CamTurnInput,
  CamSimulateInput,
  CamGenerateResult,
  CamTurnResult,
  CamSimulateResult,
} from "../engines/CAMKernelOrchestratorEngine.js";

describe("CAMKernelOrchestratorEngine", () => {
  // ─── Singleton & Dispatch ────────────────────────────────────────

  it("exports singleton instance", () => {
    expect(camKernelOrchestratorEngine).toBeInstanceOf(CAMKernelOrchestratorEngine);
    expect(camKernelOrchestratorEngine.name).toBe("CAMKernelOrchestratorEngine");
    expect(camKernelOrchestratorEngine.version).toBe("1.0.0");
  });

  it("calculate() dispatches to correct pipeline", () => {
    const genResult = camKernelOrchestratorEngine.calculate("cam_generate", {
      features: [{ id: "f1", type: "pocket", dimensions: { length_mm: 50, width_mm: 30, depth_mm: 10 } }],
      material: { name: "Steel", iso_group: "P" },
      machine: { axes: "3_axis", max_rpm: 10000, max_feedrate_mm_min: 8000 },
      stock: { type: "block", dimensions_mm: { x: 60, y: 40, z: 20 } },
    });
    expect((genResult as CamGenerateResult).pipeline).toBe("cam_generate");
  });

  it("throws on unknown action", () => {
    expect(() => camKernelOrchestratorEngine.calculate("unknown_action", {}))
      .toThrow("Unknown action");
  });

  // ─── cam_generate (Milling Pipeline) ────────────────────────────

  it("generates milling program for single pocket", () => {
    const result = camKernelOrchestratorEngine.generateMilling({
      features: [
        { id: "p1", type: "pocket", dimensions: { length_mm: 80, width_mm: 40, depth_mm: 15 } },
      ],
      material: { name: "Steel 4140", iso_group: "P" },
      machine: { axes: "3_axis", max_rpm: 12000, max_feedrate_mm_min: 10000 },
      stock: { type: "block", dimensions_mm: { x: 100, y: 60, z: 30 } },
    });

    expect(result.status).toBe("success");
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].strategy).toBe("adaptive_clearing");
    expect(result.operations[0].cutting_params.speed_rpm).toBeGreaterThan(0);
    expect(result.operations[0].cutting_params.speed_rpm).toBeLessThanOrEqual(12000);
    expect(result.operations[0].cutting_params.feed_mm_min).toBeGreaterThan(0);
    expect(result.total_cycle_time_sec).toBeGreaterThan(0);
    expect(result.pipeline_stages.length).toBeGreaterThanOrEqual(3);
  });

  it("generates multi-feature milling program with correct sequencing", () => {
    const result = camKernelOrchestratorEngine.generateMilling({
      features: [
        { id: "h1", type: "hole", dimensions: { diameter_mm: 10, depth_mm: 20 } },
        { id: "f1", type: "face", dimensions: { length_mm: 100, width_mm: 60 } },
        { id: "p1", type: "pocket", dimensions: { length_mm: 40, width_mm: 30, depth_mm: 12 } },
        { id: "c1", type: "chamfer", dimensions: { length_mm: 40, width_mm: 2, depth_mm: 1 } },
      ],
      material: { name: "Aluminum 6061", iso_group: "N" },
      machine: { axes: "3_axis", max_rpm: 20000, max_feedrate_mm_min: 15000 },
      stock: { type: "block", dimensions_mm: { x: 120, y: 80, z: 30 } },
    });

    expect(result.status).toBe("success");
    expect(result.operations).toHaveLength(4);
    // Face should be sequenced first (priority 0)
    expect(result.operations[0].feature_id).toBe("f1");
    // Chamfer should be last (priority 7)
    expect(result.operations[3].feature_id).toBe("c1");
    expect(result.tools_required).toBeGreaterThanOrEqual(3);
    expect(result.total_tool_changes).toBeGreaterThanOrEqual(2);
  });

  it("handles ISO-S material with lower cutting speeds", () => {
    const result = camKernelOrchestratorEngine.generateMilling({
      features: [
        { id: "p1", type: "pocket", dimensions: { length_mm: 30, width_mm: 20, depth_mm: 5 } },
      ],
      material: { name: "Inconel 718", iso_group: "S" },
      machine: { axes: "3_axis", max_rpm: 10000, max_feedrate_mm_min: 5000 },
      stock: { type: "block", dimensions_mm: { x: 40, y: 30, z: 10 } },
    });

    expect(result.operations[0].cutting_params.cutting_speed_m_min).toBeLessThan(100);
  });

  it("selects correct strategies for different features", () => {
    const result = camKernelOrchestratorEngine.generateMilling({
      features: [
        { id: "h1", type: "hole", dimensions: { diameter_mm: 8, depth_mm: 15 } },
        { id: "h2", type: "hole", dimensions: { diameter_mm: 25, depth_mm: 15 } },
        { id: "t1", type: "thread", dimensions: { diameter_mm: 12, depth_mm: 15 } },
        { id: "s1", type: "surface_3d", dimensions: { length_mm: 50, width_mm: 40 } },
      ],
      material: { name: "Steel", iso_group: "P" },
      machine: { axes: "3_axis", max_rpm: 10000, max_feedrate_mm_min: 8000 },
      stock: { type: "block", dimensions_mm: { x: 60, y: 50, z: 30 } },
    });

    const ops = result.operations;
    const holeSmall = ops.find(o => o.feature_id === "h1");
    const holeLarge = ops.find(o => o.feature_id === "h2");
    const thread = ops.find(o => o.feature_id === "t1");
    const surf = ops.find(o => o.feature_id === "s1");

    expect(holeSmall?.strategy).toBe("drill_peck");
    expect(holeLarge?.strategy).toBe("helix_bore");
    expect(thread?.strategy).toBe("thread_mill");
    // surface_3d without tight Ra target → parallel_finish (scallop_3d if Ra < 1.6)
    expect(surf?.strategy).toBe("parallel_finish");
  });

  it("respects machine RPM limits", () => {
    const result = camKernelOrchestratorEngine.generateMilling({
      features: [
        { id: "p1", type: "pocket", dimensions: { length_mm: 30, width_mm: 20, depth_mm: 5 } },
      ],
      material: { name: "Aluminum", iso_group: "N" },
      machine: { axes: "3_axis", max_rpm: 3000, max_feedrate_mm_min: 2000 },
      stock: { type: "block", dimensions_mm: { x: 40, y: 30, z: 10 } },
    });

    expect(result.operations[0].cutting_params.speed_rpm).toBeLessThanOrEqual(3000);
    expect(result.operations[0].cutting_params.feed_mm_min).toBeLessThanOrEqual(2000);
  });

  // ─── cam_turn (Turning Pipeline) ────────────────────────────────

  it("generates turning program for simple shaft", () => {
    const result = camKernelOrchestratorEngine.generateTurning({
      features: [
        { id: "f1", type: "face", start_diameter_mm: 50, length_mm: 1 },
        { id: "od1", type: "od_rough", start_diameter_mm: 50, end_diameter_mm: 40, length_mm: 60 },
        { id: "od2", type: "od_finish", start_diameter_mm: 40, length_mm: 60 },
        { id: "co1", type: "cutoff", start_diameter_mm: 50, length_mm: 3 },
      ],
      material: { name: "Steel 1045", iso_group: "P" },
      machine: {
        machine_type: "lathe", max_rpm: 4000,
        has_live_tooling: false, has_sub_spindle: false, has_y_axis: false,
      },
      stock: { bar_diameter_mm: 50 },
      part_length_mm: 65,
    });

    expect(result.status).toBe("success");
    expect(result.channels).toHaveLength(1);
    expect(result.channels[0].operations.length).toBeGreaterThanOrEqual(4);
    // Face should come first in sequencing
    expect(result.channels[0].operations[0].operation_type).toBe("face");
    // Cutoff should be last
    const lastOp = result.channels[0].operations[result.channels[0].operations.length - 1];
    expect(lastOp.operation_type).toBe("cutoff");
    expect(result.total_cycle_time_sec).toBeGreaterThan(0);
  });

  it("generates mill-turn program with live tooling", () => {
    const result = camKernelOrchestratorEngine.generateTurning({
      features: [
        { id: "od1", type: "od_rough", start_diameter_mm: 30, end_diameter_mm: 25, length_mm: 40 },
      ],
      material: { name: "Steel", iso_group: "P" },
      machine: {
        machine_type: "mill_turn", max_rpm: 6000,
        has_live_tooling: true, has_sub_spindle: true, has_y_axis: true,
      },
      stock: { bar_diameter_mm: 30 },
      part_length_mm: 45,
      live_tool_ops: [
        { feature_id: "cross1", operation: "cross_drill", tool_diameter_mm: 6, depth_mm: 8, position_angle_deg: 0 },
      ],
    });

    const allOps = result.channels.flatMap(c => c.operations);
    const liveOps = allOps.filter(o => o.operation_type.startsWith("live_"));
    expect(liveOps).toHaveLength(1);
    expect(liveOps[0].tool.type).toBe("live_end_mill");
  });

  it("handles bar feeder mode", () => {
    const result = camKernelOrchestratorEngine.generateTurning({
      features: [
        { id: "od1", type: "od_rough", start_diameter_mm: 25, end_diameter_mm: 20, length_mm: 30 },
        { id: "co1", type: "cutoff", start_diameter_mm: 25, length_mm: 3 },
      ],
      material: { name: "Brass", iso_group: "N" },
      machine: {
        machine_type: "lathe", max_rpm: 5000,
        has_live_tooling: false, has_sub_spindle: false, has_y_axis: false,
        bar_feeder: true,
      },
      stock: { bar_diameter_mm: 25, bar_length_mm: 3000 },
      part_length_mm: 35,
      bar_feeder_mode: true,
    });

    expect(result.bar_feeder_setup).toBeDefined();
    expect(result.bar_feeder_setup!.part_count_per_bar).toBeGreaterThan(1);
    expect(result.bar_feeder_setup!.cutoff_width_mm).toBe(3);
  });

  it("handles sub-spindle transfer", () => {
    const result = camKernelOrchestratorEngine.generateTurning({
      features: [
        { id: "od1", type: "od_rough", start_diameter_mm: 30, end_diameter_mm: 25, length_mm: 40 },
      ],
      material: { name: "Steel", iso_group: "P" },
      machine: {
        machine_type: "mill_turn", max_rpm: 5000,
        has_live_tooling: true, has_sub_spindle: true, has_y_axis: true,
      },
      stock: { bar_diameter_mm: 30 },
      part_length_mm: 45,
      sub_spindle_transfer: true,
    });

    expect(result.sub_spindle_transfer).toBeDefined();
    expect(result.sub_spindle_transfer!.mode).toBe("synchronized");
  });

  // ─── cam_simulate (Simulation Pipeline) ─────────────────────────

  it("simulates operation list with all checks", () => {
    const result = camKernelOrchestratorEngine.simulateProgram({
      operations: [
        {
          id: "op1", type: "roughing",
          tool: { diameter_mm: 12, flute_length_mm: 30, num_flutes: 3 },
          speed_rpm: 5000, feed_mm_min: 1500,
          depth_of_cut_mm: 3, width_of_cut_mm: 6,
        },
        {
          id: "op2", type: "finishing",
          tool: { diameter_mm: 8, flute_length_mm: 24, num_flutes: 2 },
          speed_rpm: 8000, feed_mm_min: 800,
          depth_of_cut_mm: 0.3, width_of_cut_mm: 0.8,
        },
      ],
      machine: { axes: "3_axis", max_rpm: 12000, max_feedrate_mm_min: 10000 },
      stock: { dimensions_mm: { x: 100, y: 60, z: 30 }, material: "Steel 4140", iso_group: "P" },
    });

    expect(result.pipeline).toBe("cam_simulate");
    expect(result.total_blocks_analyzed).toBe(2);
    expect(result.force_analysis).toBeDefined();
    expect(result.force_analysis!.max_force_N).toBeGreaterThan(0);
    expect(result.thermal_analysis).toBeDefined();
    expect(result.collision_check).toBeDefined();
    expect(result.surface_quality).toBeDefined();
    expect(result.tool_life).toBeDefined();
    expect(result.safety_rules).toBeDefined();
    expect(result.pipeline_stages.length).toBeGreaterThanOrEqual(5);
  });

  it("detects RPM safety violation", () => {
    const result = camKernelOrchestratorEngine.simulateProgram({
      operations: [
        {
          id: "op1", type: "roughing",
          tool: { diameter_mm: 10, flute_length_mm: 25, num_flutes: 3 },
          speed_rpm: 20000, feed_mm_min: 3000,
          depth_of_cut_mm: 3,
        },
      ],
      machine: { axes: "3_axis", max_rpm: 10000, max_feedrate_mm_min: 8000 },
      stock: { dimensions_mm: { x: 50, y: 50, z: 20 }, material: "Steel" },
    });

    expect(result.status).toBe("fail");
    const rpmViolation = result.findings.find(
      f => f.category === "safety" && f.message.includes("RPM")
    );
    expect(rpmViolation).toBeDefined();
    expect(rpmViolation!.severity).toBe("critical");
  });

  it("detects DOC exceeding flute length", () => {
    const result = camKernelOrchestratorEngine.simulateProgram({
      operations: [
        {
          id: "op1", type: "roughing",
          tool: { diameter_mm: 10, flute_length_mm: 15, num_flutes: 3 },
          speed_rpm: 5000, feed_mm_min: 1000,
          depth_of_cut_mm: 20, // exceeds flute_length_mm of 15
        },
      ],
      machine: { axes: "3_axis", max_rpm: 10000, max_feedrate_mm_min: 8000 },
      stock: { dimensions_mm: { x: 50, y: 50, z: 30 }, material: "Steel" },
    });

    expect(result.status).toBe("fail");
    const docViolation = result.findings.find(
      f => f.category === "safety" && f.message.includes("DOC")
    );
    expect(docViolation).toBeDefined();
    expect(docViolation!.severity).toBe("critical");
  });

  it("parses G-code and simulates", () => {
    const gcode = `
O0001
T01 M06
S3000 M03
G0 X0 Y0 Z5.0
G1 Z-2.0 F500
G1 X50.0 F800
G1 Y30.0
G0 Z5.0
M30
`;
    const result = camKernelOrchestratorEngine.simulateProgram({
      gcode,
      machine: { axes: "3_axis", max_rpm: 10000, max_feedrate_mm_min: 8000 },
      stock: { dimensions_mm: { x: 60, y: 40, z: 20 }, material: "Steel", iso_group: "P" },
    });

    expect(result.pipeline).toBe("cam_simulate");
    expect(result.total_blocks_analyzed).toBeGreaterThan(0);
  });

  it("returns pass status for safe operations", () => {
    const result = camKernelOrchestratorEngine.simulateProgram({
      operations: [
        {
          id: "op1", type: "finishing",
          tool: { diameter_mm: 10, flute_length_mm: 25, num_flutes: 3 },
          speed_rpm: 5000, feed_mm_min: 600,
          depth_of_cut_mm: 0.5, width_of_cut_mm: 1,
        },
      ],
      machine: { axes: "3_axis", max_rpm: 12000, max_feedrate_mm_min: 10000 },
      stock: { dimensions_mm: { x: 50, y: 50, z: 20 }, material: "Aluminum", iso_group: "N" },
    });

    expect(result.status).toBe("pass");
    expect(result.safety_rules!.violations).toBe(0);
  });

  it("handles empty input gracefully", () => {
    const result = camKernelOrchestratorEngine.simulateProgram({
      gcode: "",
      machine: { axes: "3_axis", max_rpm: 10000, max_feedrate_mm_min: 8000 },
      stock: { dimensions_mm: { x: 50, y: 50, z: 20 }, material: "Steel" },
    });

    expect(result.total_blocks_analyzed).toBe(0);
    expect(result.findings.some(f => f.category === "input")).toBe(true);
  });
});
