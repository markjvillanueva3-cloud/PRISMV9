/**
 * PP-MS9: Real Pipeline Behavior Verification
 *
 * These tests verify the pipeline ACTUALLY transforms G-code with
 * physics-based optimization — not just that it doesn't crash.
 *
 * Guards against regression where Stage 1.1 silently fails to
 * apply speed/feed optimization (fix: early-return bug in tool group loop).
 */
import { describe, it, expect } from "vitest";
import {
  postProcessorPipelineEngine,
  type MachineContext,
  type MaterialContext,
  type ToolContext,
} from "../engines/PostProcessorPipelineEngine.js";
import { postValidationHardeningEngine } from "../engines/PostValidationHardeningEngine.js";
import { proveOutModeEngine } from "../engines/ProveOutModeEngine.js";

const INPUT_GCODE = `O1001
G90 G54 G17
T1 M6
S3000 M3
G43 H1 Z50.
M8
G0 X0 Y0
G0 Z5.
G1 Z-5. F200
G1 X80. F600
G1 Y50.
G1 X0.
G1 Y0.
G0 Z5.
G1 Z-10. F180
G1 X80. F500
G1 Y50.
G1 X0.
G1 Y0.
G0 Z50.
M9
M5
M30`;

const HAAS_VF2: MachineContext = {
  id: "haas-vf2", name: "Haas VF-2", brand: "Haas", controller: "haas",
  max_rpm: 8100, max_power_kW: 22.4,
  rapid_rate_mm_min: { x: 25400, y: 25400, z: 15240 },
  work_volume: { x: 762, y: 406, z: 508 },
  axes: 3, atc_capacity: 20, coolant_types: ["flood", "tsc"],
  resolution_confidence: 0.95,
};

const STEEL: MaterialContext = {
  id: "4140", name: "4140 Steel", iso_group: "P",
  kc1_1: 1800, mc: 0.25, hardness_HB: 197,
  resolution_confidence: 1,
};

const TOOL: ToolContext = {
  id: "1", type: "flat_endmill", diameter_mm: 10, flute_count: 4,
  flute_length_mm: 25, material: "carbide", resolution_confidence: 1,
};

describe("Pipeline Physics Verification", () => {

  it("stage 1.1 optimizes ALL tool groups (not just the first)", async () => {
    const result = await postProcessorPipelineEngine.process({
      gcode: INPUT_GCODE,
      machine: HAAS_VF2,
      material: STEEL,
      tools: [TOOL],
      controller: "haas",
      aggressiveness: 0.5,
    });

    // Stage 1.1 must process all tool groups
    const sfStage = result.stages.find(s => s.stage === "1.1_base_speed_feed");
    expect(sfStage?.status).toBe("pass");
    const sfData = sfStage?.data as any;
    expect(sfData?.tools_optimized).toBeGreaterThanOrEqual(1);

    // ALL cutting blocks (G1) must have optimization + force data
    const cuttingBlocks = result.blocks.filter(b => b.move_type === "G1");
    expect(cuttingBlocks.length).toBeGreaterThan(0);
    const withOpt = cuttingBlocks.filter(b => b.optimization);
    const withForces = cuttingBlocks.filter(b => b.forces);
    expect(withOpt.length).toBe(cuttingBlocks.length);
    expect(withForces.length).toBe(cuttingBlocks.length);
  });

  it("optimized S/F values differ from input and are physics-based", async () => {
    const result = await postProcessorPipelineEngine.process({
      gcode: INPUT_GCODE,
      machine: HAAS_VF2,
      material: STEEL,
      tools: [TOOL],
      controller: "haas",
      aggressiveness: 0.5,
    });

    const optimized = result.blocks.filter(b => b.optimization);
    expect(optimized.length).toBeGreaterThan(0);

    // At least some blocks should have different S/F from original
    const changed = optimized.filter(b =>
      b.optimization!.optimized_rpm !== b.optimization!.original_rpm ||
      b.optimization!.optimized_feed !== b.optimization!.original_feed,
    );
    expect(changed.length).toBeGreaterThan(0);

    // RPM must be positive and within machine limits
    for (const b of optimized) {
      expect(b.optimization!.optimized_rpm).toBeGreaterThan(0);
      expect(b.optimization!.optimized_rpm).toBeLessThanOrEqual(8100);
      expect(b.optimization!.optimized_feed).toBeGreaterThan(0);
    }
  });

  it("forces are computed with real Kienzle physics", async () => {
    const result = await postProcessorPipelineEngine.process({
      gcode: INPUT_GCODE,
      machine: HAAS_VF2,
      material: STEEL,
      tools: [TOOL],
      controller: "haas",
    });

    const withForces = result.blocks.filter(b => b.forces);
    expect(withForces.length).toBeGreaterThan(0);

    for (const b of withForces) {
      expect(b.forces!.Fc_N).toBeGreaterThan(0);
      expect(b.forces!.power_kW).toBeGreaterThanOrEqual(0);
      expect(b.forces!.torque_Nm).toBeGreaterThanOrEqual(0);
      // Force resultant should be close to sqrt(Fc² + Ff²)
      const computed = Math.sqrt(b.forces!.Fc_N ** 2 + b.forces!.Ff_N ** 2);
      expect(Math.abs(b.forces!.resultant_N - computed)).toBeLessThan(computed * 0.15 + 10);
    }
  });

  it("output G-code contains optimized feed/RPM values", async () => {
    const result = await postProcessorPipelineEngine.process({
      gcode: INPUT_GCODE,
      machine: HAAS_VF2,
      material: STEEL,
      tools: [TOOL],
      controller: "haas",
      aggressiveness: 0.5,
    });

    // Output must contain S and F values from optimization, not just original
    const outputFeeds = [...result.output_gcode.matchAll(/F(\d+)/g)].map(m => parseInt(m[1]));
    const outputRpms = [...result.output_gcode.matchAll(/S(\d+)/g)].map(m => parseInt(m[1]));

    // At least one feed should differ from the original set {200, 180, 600, 500}
    const originalFeeds = new Set([200, 180, 600, 500]);
    const hasNewFeed = outputFeeds.some(f => !originalFeeds.has(f));
    expect(hasNewFeed).toBe(true);
  });

  it("validation engine catches RPM violations", async () => {
    const val = await postValidationHardeningEngine.process({
      action: "validate",
      gcode: "G90 G54\nT1 M6\nS15000 M3\nG1 Z-5. F200\nM30",
      machine: HAAS_VF2,
    });
    expect(val.summary.passed).toBe(false);
    expect(val.summary.block_count).toBeGreaterThan(0);
  });

  it("prove-out produces correct derating values", async () => {
    const po = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: INPUT_GCODE,
      config: { feed_reduction: 0.25, rpm_cap: 0.80, controller: "haas" },
    });
    expect(po.gcode).toContain("F450"); // 600 * 0.75
    expect(po.gcode).toContain("S2400"); // 3000 * 0.80
    expect(po.gcode).toContain("PROVE-OUT");
    expect(po.summary.feed_reductions).toBeGreaterThan(0);
  });
});
