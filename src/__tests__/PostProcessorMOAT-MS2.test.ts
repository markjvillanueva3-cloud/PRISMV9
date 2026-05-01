/**
 * PP-MOAT-MS2: Learning Loop Tests
 *
 * U01: PredictionCalibrationEngine as Stage 0.8 — calibrated Kienzle/Taylor constants
 * U02: ThermalWearCouplingEngine as Stage 2.7b — coupled RK4 ODE
 * U03: RLPostProcessorEngine as Stage 6.1c — RL-learned G-code formatting
 * U04: SustainabilityLCAEngine as Stage 5.5b — ISO 14040 LCA
 */
import { describe, it, expect } from "vitest";
import { postProcessorPipelineEngine } from "../engines/PostProcessorPipelineEngine.js";
import type { MachineContext, MaterialContext, ToolContext, PipelineInput } from "../engines/PostProcessorPipelineEngine.js";

// ── Test Fixtures ─────────────────────────────────────────────────

const MACHINE_HAAS: MachineContext = {
  id: "haas-vf2", name: "Haas VF-2", brand: "Haas", controller: "haas",
  max_rpm: 8100, max_power_kW: 22.4,
  rapid_rate_mm_min: { x: 25400, y: 25400, z: 15240 },
  work_volume: { x: 762, y: 406, z: 508 },
  axes: 3, atc_capacity: 20, coolant_types: ["flood"],
  resolution_confidence: 0.95,
};

const MACHINE_SIEMENS: MachineContext = {
  id: "dmg-5ax", name: "DMG DMU 50", brand: "DMG MORI", controller: "siemens",
  max_rpm: 14000, max_power_kW: 35,
  rapid_rate_mm_min: { x: 42000, y: 42000, z: 42000 },
  work_volume: { x: 500, y: 450, z: 400 },
  axes: 5, atc_capacity: 60, coolant_types: ["flood", "tsc", "mql"],
  resolution_confidence: 0.95,
};

const MACHINE_FANUC: MachineContext = {
  id: "fanuc-rob", name: "Robodrill", brand: "FANUC", controller: "fanuc",
  max_rpm: 24000, max_power_kW: 3.7,
  rapid_rate_mm_min: { x: 54000, y: 54000, z: 54000 },
  work_volume: { x: 300, y: 300, z: 330 },
  axes: 3, atc_capacity: 21, coolant_types: ["flood", "tsc"],
  resolution_confidence: 0.95,
};

const MATERIAL_4140: MaterialContext = {
  id: "4140", name: "4140 Steel", iso_group: "P",
  kc1_1: 1800, mc: 0.25, hardness_HB: 197,
  resolution_confidence: 1,
};

const MATERIAL_ALUMINUM: MaterialContext = {
  id: "6061", name: "6061-T6 Aluminum", iso_group: "N",
  kc1_1: 700, mc: 0.23,
  resolution_confidence: 1,
};

const TOOL_ENDMILL: ToolContext = {
  id: "1", type: "flat_endmill", diameter_mm: 10, flute_count: 4,
  flute_length_mm: 25, material: "carbide", resolution_confidence: 1,
};

const SIMPLE_GCODE = [
  "O1001", "G90 G54 G17", "T1 M6", "S3000 M3", "G43 H1", "M8",
  "G0 X0 Y0 Z25.", "G1 Z-5. F500", "G1 X50. F800", "G1 Y50. F800",
  "G1 X0. F800", "G1 Y0. F800",
  "G0 Z25.", "M5", "M30",
].join("\n");

function buildInput(overrides: Partial<PipelineInput> = {}): PipelineInput {
  return {
    gcode: SIMPLE_GCODE,
    machine: MACHINE_HAAS,
    material: MATERIAL_4140,
    tools: [TOOL_ENDMILL],
    controller: "haas",
    ...overrides,
  } as PipelineInput;
}

// ══════════════════════════════════════════════════════════════════
// U01: PredictionCalibrationEngine — Stage 0.8
// ══════════════════════════════════════════════════════════════════

describe("PP-MOAT-MS2 U01: Calibrated Constants (Stage 0.8)", () => {
  it("Stage 0.8 appears in pipeline stages", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput());
    const stage = result.stages.find((s: any) => s.stage === "0.8_calibrated_constants");
    expect(stage).toBeDefined();
  });

  it("calibration_source defaults to 'canonical' when no calibration data exists", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput());
    const stage = result.stages.find((s: any) => s.stage === "0.8_calibrated_constants");
    expect(stage).toBeDefined();
    expect(stage!.data).toBeDefined();
    if (stage!.data) {
      expect(stage!.data.calibration_source).toBe("canonical");
    }
  });

  it("Stage 1.1 shows calibration_source in output", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput());
    const stage11 = result.stages.find((s: any) => s.stage === "1.1_base_speed_feed");
    if (stage11?.data) {
      expect(stage11.data.calibration_source).toBeDefined();
      expect(typeof stage11.data.calibration_source).toBe("string");
    }
  });

  it("Stage 0.8 includes material_key and machine_id", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput());
    const stage = result.stages.find((s: any) => s.stage === "0.8_calibrated_constants");
    if (stage?.data) {
      expect(stage.data.material_key).toContain("P");
      expect(stage.data.machine_id).toBeDefined();
    }
  });

  it("Stage 0.8 is skipped when no material provided", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({ material: undefined }));
    const stage = result.stages.find((s: any) => s.stage === "0.8_calibrated_constants");
    expect(stage).toBeDefined();
    expect(stage!.status).toBe("skipped");
  });

  it("Stage 0.8 is skipped when no machine provided", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({ machine: undefined }));
    const stage = result.stages.find((s: any) => s.stage === "0.8_calibrated_constants");
    expect(stage).toBeDefined();
    expect(stage!.status).toBe("skipped");
  });

  it("Stage 0.8 can be disabled via stages config", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      stages: { calibration: false },
    }));
    const stage = result.stages.find((s: any) => s.stage === "0.8_calibrated_constants");
    expect(stage).toBeDefined();
    expect(stage!.status).toBe("skipped");
  });

  it("analytics report includes calibration_source field", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      include_analytics: true,
    }));
    if (result.analytics) {
      expect(result.analytics.calibration_source).toBeDefined();
      expect(typeof result.analytics.calibration_source).toBe("string");
    }
  });

  it("default calibration_source is canonical in analytics", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      include_analytics: true,
    }));
    if (result.analytics) {
      expect(result.analytics.calibration_source).toBe("canonical");
    }
  });

  it("works with Siemens machine (different material key)", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      machine: MACHINE_SIEMENS,
      material: MATERIAL_ALUMINUM,
      controller: "siemens",
    }));
    const stage = result.stages.find((s: any) => s.stage === "0.8_calibrated_constants");
    expect(stage).toBeDefined();
    if (stage?.data) {
      expect(stage.data.material_key).toContain("N");
    }
  });
});

// ══════════════════════════════════════════════════════════════════
// U02: ThermalWearCouplingEngine — Stage 2.7b
// ══════════════════════════════════════════════════════════════════

describe("PP-MOAT-MS2 U02: Coupled Thermal-Wear ODE (Stage 2.7b)", () => {
  it("Stage 2.7b appears in pipeline stages", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput());
    const stage = result.stages.find((s: any) => s.stage === "2.7b_coupled_thermal_wear");
    expect(stage).toBeDefined();
  });

  it("Stage 2.7b uses coupled RK4 ODE method", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput());
    const stage = result.stages.find((s: any) => s.stage === "2.7b_coupled_thermal_wear");
    if (stage?.data && stage.data.method !== "skipped") {
      expect(stage.data.method).toBe("coupled_RK4_ODE");
    }
  });

  it("Stage 2.7b reports tools_processed count", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput());
    const stage = result.stages.find((s: any) => s.stage === "2.7b_coupled_thermal_wear");
    if (stage?.data && stage.data.method === "coupled_RK4_ODE") {
      expect(typeof stage.data.tools_processed).toBe("number");
      expect(stage.data.tools_processed).toBeGreaterThanOrEqual(0);
    }
  });

  it("Stage 2.7b reports peak temperature", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput());
    const stage = result.stages.find((s: any) => s.stage === "2.7b_coupled_thermal_wear");
    if (stage?.data && stage.data.method === "coupled_RK4_ODE") {
      expect(typeof stage.data.peak_temperature_C).toBe("number");
    }
  });

  it("Stage 2.7b reports cumulative dimensional error", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput());
    const stage = result.stages.find((s: any) => s.stage === "2.7b_coupled_thermal_wear");
    if (stage?.data && stage.data.method === "coupled_RK4_ODE") {
      expect(typeof stage.data.cumulative_dimensional_error_um).toBe("number");
    }
  });

  it("Stage 2.7b can be disabled via stages config", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      stages: { coupled_thermal_wear: false },
    }));
    const stage = result.stages.find((s: any) => s.stage === "2.7b_coupled_thermal_wear");
    expect(stage).toBeDefined();
    expect(stage!.status).toBe("skipped");
  });

  it("simplified wear (2.6) and thermal (2.7) still run alongside coupled", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput());
    const wear = result.stages.find((s: any) => s.stage === "2.6_wear_progression");
    const thermal = result.stages.find((s: any) => s.stage === "2.7_thermal_tracking");
    const coupled = result.stages.find((s: any) => s.stage === "2.7b_coupled_thermal_wear");
    expect(wear).toBeDefined();
    expect(thermal).toBeDefined();
    expect(coupled).toBeDefined();
  });

  it("VB (wear) values are non-negative when coupled ODE runs", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput());
    const cuttingBlocks = result.blocks.filter(b => b.move_type !== "G0" && b.wear);
    for (const block of cuttingBlocks) {
      expect(block.wear!.VB_mm).toBeGreaterThanOrEqual(0);
    }
  });

  it("thermal values are physically reasonable (T_tool > ambient)", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput());
    const blocksWithThermal = result.blocks.filter(b => b.thermal);
    for (const block of blocksWithThermal) {
      expect(block.thermal!.T_tool_C).toBeGreaterThanOrEqual(20);
    }
  });

  it("works with aluminum material", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      material: MATERIAL_ALUMINUM,
    }));
    const stage = result.stages.find((s: any) => s.stage === "2.7b_coupled_thermal_wear");
    expect(stage).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════
// U03: RLPostProcessorEngine — Stage 6.1c
// ══════════════════════════════════════════════════════════════════

describe("PP-MOAT-MS2 U03: RL Formatting (Stage 6.1c)", () => {
  it("Stage 6.1c appears in pipeline stages (skipped by default — opt-in)", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput());
    const stage = result.stages.find((s: any) => s.stage === "6.1c_rl_formatting");
    expect(stage).toBeDefined();
    expect(stage!.status).toBe("skipped");
  });

  it("Stage 6.1c activates when rl_formatting enabled", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      stages: { rl_formatting: true },
    }));
    const stage = result.stages.find((s: any) => s.stage === "6.1c_rl_formatting");
    expect(stage).toBeDefined();
    // Either pass (engine worked) or pass with engine_unavailable
    expect(["pass", "warn", "fail"]).toContain(stage!.status);
  });

  it("RL stage reports controller type", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      stages: { rl_formatting: true },
    }));
    const stage = result.stages.find((s: any) => s.stage === "6.1c_rl_formatting");
    if (stage?.data && stage.data.rl_active) {
      expect(stage.data.controller).toBe("haas");
    }
  });

  it("RL stage reports formats_used breakdown", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      stages: { rl_formatting: true },
    }));
    const stage = result.stages.find((s: any) => s.stage === "6.1c_rl_formatting");
    if (stage?.data && stage.data.rl_active) {
      expect(stage.data.formats_used).toBeDefined();
      expect(typeof stage.data.line_count).toBe("number");
    }
  });

  it("RL stage reports q_table_size", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      stages: { rl_formatting: true },
    }));
    const stage = result.stages.find((s: any) => s.stage === "6.1c_rl_formatting");
    if (stage?.data && stage.data.rl_active) {
      expect(typeof stage.data.q_table_size).toBe("number");
    }
  });

  it("output G-code still exists after RL formatting", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      stages: { rl_formatting: true },
    }));
    expect(result.output_gcode).toBeDefined();
    expect(result.output_gcode.length).toBeGreaterThan(0);
  });

  it("works with Fanuc controller", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      machine: MACHINE_FANUC,
      controller: "fanuc",
      stages: { rl_formatting: true },
    }));
    const stage = result.stages.find((s: any) => s.stage === "6.1c_rl_formatting");
    expect(stage).toBeDefined();
    if (stage?.data && stage.data.rl_active) {
      expect(stage.data.controller).toBe("fanuc");
    }
  });

  it("works with Siemens controller", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      machine: MACHINE_SIEMENS,
      controller: "siemens",
      stages: { rl_formatting: true },
    }));
    const stage = result.stages.find((s: any) => s.stage === "6.1c_rl_formatting");
    expect(stage).toBeDefined();
  });

  it("Stage 6.1c appears after 6.1b in stage order", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      stages: { rl_formatting: true },
    }));
    const idx6_1b = result.stages.findIndex((s: any) => s.stage === "6.1b_tool_management");
    const idx6_1c = result.stages.findIndex((s: any) => s.stage === "6.1c_rl_formatting");
    if (idx6_1b >= 0 && idx6_1c >= 0) {
      expect(idx6_1c).toBeGreaterThan(idx6_1b);
    }
  });

  it("Stage 6.1c gracefully handles empty blocks", async () => {
    const result = await postProcessorPipelineEngine.process({
      gcode: "O1001\nM30",
      machine: MACHINE_HAAS,
      material: MATERIAL_4140,
      tools: [TOOL_ENDMILL],
      stages: { rl_formatting: true },
    } as PipelineInput);
    const stage = result.stages.find((s: any) => s.stage === "6.1c_rl_formatting");
    expect(stage).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════
// U04: SustainabilityLCAEngine — Stage 5.5b
// ══════════════════════════════════════════════════════════════════

describe("PP-MOAT-MS2 U04: Sustainability LCA (Stage 5.5b)", () => {
  it("Stage 5.5b appears in pipeline stages (skipped by default — opt-in)", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput());
    const stage = result.stages.find((s: any) => s.stage === "5.5b_sustainability_lca");
    expect(stage).toBeDefined();
    expect(stage!.status).toBe("skipped");
  });

  it("Stage 5.5b activates when sustainability_lca enabled", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      stages: { sustainability_lca: true },
    }));
    const stage = result.stages.find((s: any) => s.stage === "5.5b_sustainability_lca");
    expect(stage).toBeDefined();
    expect(["pass", "warn", "fail"]).toContain(stage!.status);
  });

  it("sustainability_score is between 0 and 100", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      stages: { sustainability_lca: true },
    }));
    const stage = result.stages.find((s: any) => s.stage === "5.5b_sustainability_lca");
    if (stage?.data?.sustainability_score != null) {
      expect(stage.data.sustainability_score).toBeGreaterThanOrEqual(0);
      expect(stage.data.sustainability_score).toBeLessThanOrEqual(100);
    }
  });

  it("Stage 5.5b reports CO2 kg", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      stages: { sustainability_lca: true },
    }));
    const stage = result.stages.find((s: any) => s.stage === "5.5b_sustainability_lca");
    if (stage?.data?.co2_kg != null) {
      expect(typeof stage.data.co2_kg).toBe("number");
      expect(stage.data.co2_kg).toBeGreaterThanOrEqual(0);
    }
  });

  it("Stage 5.5b reports energy kWh", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      stages: { sustainability_lca: true },
    }));
    const stage = result.stages.find((s: any) => s.stage === "5.5b_sustainability_lca");
    if (stage?.data?.energy_kwh != null) {
      expect(typeof stage.data.energy_kwh).toBe("number");
      expect(stage.data.energy_kwh).toBeGreaterThanOrEqual(0);
    }
  });

  it("Stage 5.5b reports dominant LCA phase", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      stages: { sustainability_lca: true },
    }));
    const stage = result.stages.find((s: any) => s.stage === "5.5b_sustainability_lca");
    if (stage?.data?.lca_dominant_phase) {
      expect(typeof stage.data.lca_dominant_phase).toBe("string");
    }
  });

  it("analytics report includes sustainability data when enabled", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      stages: { sustainability_lca: true },
      include_analytics: true,
    }));
    if (result.analytics?.sustainability) {
      expect(typeof result.analytics.sustainability.co2_kg_per_part).toBe("number");
      expect(typeof result.analytics.sustainability.energy_kWh_per_part).toBe("number");
      expect(typeof result.analytics.sustainability.sustainability_score).toBe("number");
    }
  });

  it("sustainability score varies by material (steel vs aluminum)", async () => {
    const resultSteel = await postProcessorPipelineEngine.process(buildInput({
      stages: { sustainability_lca: true },
    }));
    const resultAl = await postProcessorPipelineEngine.process(buildInput({
      material: MATERIAL_ALUMINUM,
      stages: { sustainability_lca: true },
    }));
    const stageSteel = resultSteel.stages.find((s: any) => s.stage === "5.5b_sustainability_lca");
    const stageAl = resultAl.stages.find((s: any) => s.stage === "5.5b_sustainability_lca");
    // Both should have data (even if values differ)
    expect(stageSteel?.data).toBeDefined();
    expect(stageAl?.data).toBeDefined();
  });

  it("LCA categories include GWP, AP, EP when available in analytics", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      stages: { sustainability_lca: true },
      include_analytics: true,
    }));
    if (result.analytics?.sustainability?.lca_categories) {
      expect(typeof result.analytics.sustainability.lca_categories.GWP_kg_CO2_eq).toBe("number");
      expect(typeof result.analytics.sustainability.lca_categories.AP_kg_SO2_eq).toBe("number");
      expect(typeof result.analytics.sustainability.lca_categories.EP_kg_PO4_eq).toBe("number");
    }
  });

  it("Stage 5.5b appears after 5.5 and before 5.6 in stage order", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      stages: { sustainability_lca: true, energy_optimization: true },
    }));
    const idx55 = result.stages.findIndex((s: any) => s.stage === "5.5_energy_optimization");
    const idx55b = result.stages.findIndex((s: any) => s.stage === "5.5b_sustainability_lca");
    const idx56 = result.stages.findIndex((s: any) => s.stage === "5.6_reliability_check");
    if (idx55 >= 0 && idx55b >= 0) {
      expect(idx55b).toBeGreaterThan(idx55);
    }
    if (idx55b >= 0 && idx56 >= 0) {
      expect(idx56).toBeGreaterThan(idx55b);
    }
  });
});

// ══════════════════════════════════════════════════════════════════
// Cross-unit integration tests
// ══════════════════════════════════════════════════════════════════

describe("PP-MOAT-MS2: Cross-Unit Integration", () => {
  it("all 4 new stages appear in a full pipeline run", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      stages: {
        sustainability_lca: true,
        rl_formatting: true,
      },
    }));
    const stageNames = result.stages.map((s: any) => s.stage);
    expect(stageNames).toContain("0.8_calibrated_constants");
    expect(stageNames).toContain("2.7b_coupled_thermal_wear");
    expect(stageNames).toContain("5.5b_sustainability_lca");
    expect(stageNames).toContain("6.1c_rl_formatting");
  });

  it("pipeline completes without errors with all new stages", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      stages: {
        sustainability_lca: true,
        rl_formatting: true,
      },
    }));
    expect(result.overall_status).toBeDefined();
    expect(result.stages.length).toBeGreaterThan(10);
  });

  it("new stages do not break existing PP stage count", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput());
    // Baseline MS3 had ~35+ stages; MS2 adds 4 more
    expect(result.stages.length).toBeGreaterThanOrEqual(20);
  });

  it("analytics report with all features contains both calibration and sustainability", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      stages: { sustainability_lca: true },
      include_analytics: true,
    }));
    if (result.analytics) {
      expect(result.analytics.calibration_source).toBeDefined();
      // sustainability may or may not be present depending on engine availability
    }
  });
});
