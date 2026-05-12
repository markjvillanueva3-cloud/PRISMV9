/**
 * PostProcessor Pipeline — Strategy Validation Pre-Check (CAMX-MS2/U04)
 *
 * Stage 0.55 validates CAM strategy against controller + machine before
 * post-processing. Non-blocking — warnings are emitted.
 */

import { describe, it, expect } from "vitest";
import { postProcessorPipelineEngine } from "../engines/PostProcessorPipelineEngine.js";

const STEEL_MATERIAL = {
  iso_group: "P",
  name: "1045 Carbon Steel",
  kc1_1: 1900,
  mc: 0.25,
} as any;

const HAAS_VF2 = {
  id: "haas_vf2",
  name: "Haas VF-2",
  controller: "haas_ngc",
  max_rpm: 8100,
  spindle_power_kW: 22,
  acceleration_g: 0.25,
  rapid_traverse_mm_min: 25400,
  tool_magazine_capacity: 20,
  spindle_taper: "BT40",
  work_envelope_mm: { x: 762, y: 406, z: 508 },
  coolant_pressure_bar: 7,
  axes: 3,
};

const STAGES_MINIMAL = {
  speed_feed: false,
  engagement_analysis: false,
  safety_analysis: false,
  playbook_rules: false,
  wear_progression: false,
  thermal_tracking: false,
} as any;

describe("PostProcessor pipeline: strategy validation pre-check (CAMX-MS2/U04)", () => {
  it("stage 0.55 runs when operations exist with a strategy", async () => {
    const r = await postProcessorPipelineEngine.process({
      material: STEEL_MATERIAL,
      machine: HAAS_VF2,
      operations: [{ id: 0, type: "face_milling", strategy: "face_milling", tool_number: 1, blocks: [] }] as any,
      stages: STAGES_MINIMAL,
    });
    const validationStage = r.stages.find(s => s.stage === "0.55_strategy_validation");
    expect(validationStage).toBeDefined();
    expect(validationStage!.status).toMatch(/pass|skipped/);
  });

  it("stage 0.55 is skipped when no operations provided", async () => {
    const r = await postProcessorPipelineEngine.process({
      material: STEEL_MATERIAL,
      stages: STAGES_MINIMAL,
    });
    const validationStage = r.stages.find(s => s.stage === "0.55_strategy_validation");
    expect(validationStage).toBeDefined();
    expect(validationStage!.status).toBe("skipped");
  });

  it("stage 0.55 is skipped when strategy_validation flag is false", async () => {
    const r = await postProcessorPipelineEngine.process({
      material: STEEL_MATERIAL,
      machine: HAAS_VF2,
      operations: [{ id: 0, type: "face_milling", strategy: "face_milling", tool_number: 1, blocks: [] }] as any,
      stages: { ...STAGES_MINIMAL, strategy_validation: false } as any,
    });
    const validationStage = r.stages.find(s => s.stage === "0.55_strategy_validation");
    expect(validationStage).toBeDefined();
    expect(validationStage!.status).toBe("skipped");
  });

  it("stage 0.55 emits warning for 5-axis strategy on 3-axis machine", async () => {
    const r = await postProcessorPipelineEngine.process({
      material: STEEL_MATERIAL,
      machine: HAAS_VF2, // 3-axis
      operations: [{ id: 0, type: "five_axis_contouring", strategy: "five_axis_contouring", tool_number: 1, blocks: [] }] as any,
      stages: STAGES_MINIMAL,
    });
    const validationStage = r.stages.find(s => s.stage === "0.55_strategy_validation");
    expect(validationStage).toBeDefined();
    // Warnings array should be populated (machine/controller issues)
    const warnings = r.warnings ?? [];
    const hasStrategyWarning = warnings.some(w => w.includes("five_axis_contouring"));
    expect(hasStrategyWarning).toBe(true);
  });

  it("pipeline continues (non-blocking) even on validation warnings", async () => {
    const r = await postProcessorPipelineEngine.process({
      material: STEEL_MATERIAL,
      machine: HAAS_VF2,
      operations: [{ id: 0, type: "five_axis_contouring", strategy: "five_axis_contouring", tool_number: 1, blocks: [] }] as any,
      stages: STAGES_MINIMAL,
    });
    // Pipeline completes (doesn't throw)
    expect(r.overall_status).toMatch(/pass|warn|fail/);
    expect(r.stages.length).toBeGreaterThan(0);
  });

  it("stage 0.55 does not fail when strategy is unknown", async () => {
    const r = await postProcessorPipelineEngine.process({
      material: STEEL_MATERIAL,
      machine: HAAS_VF2,
      operations: [{ id: 0, type: "unknown_op", strategy: "custom_unknown_strategy", tool_number: 1, blocks: [] }] as any,
      stages: STAGES_MINIMAL,
    });
    const validationStage = r.stages.find(s => s.stage === "0.55_strategy_validation");
    expect(validationStage).toBeDefined();
    expect(validationStage!.status).not.toBe("fail");
  });

  it("stage 0.55 appears before 0.6_smart_defaults in the pipeline", async () => {
    const r = await postProcessorPipelineEngine.process({
      material: STEEL_MATERIAL,
      operations: [{ id: 0, type: "face_milling", strategy: "face_milling", tool_number: 1, blocks: [] }] as any,
      stages: STAGES_MINIMAL,
    });
    const idx055 = r.stages.findIndex(s => s.stage === "0.55_strategy_validation");
    const idx06 = r.stages.findIndex(s => s.stage === "0.6_smart_defaults");
    expect(idx055).toBeGreaterThanOrEqual(0);
    expect(idx06).toBeGreaterThan(idx055);
  });
});
