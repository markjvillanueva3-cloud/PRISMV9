/**
 * PP S/F Integration: Verify pipeline Stage 1.1 actually modifies blocks
 */
import { describe, it, expect } from "vitest";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";
import { postProcessorPipelineEngine } from "../engines/PostProcessorPipelineEngine.js";

describe("S/F Pipeline Integration", () => {
  it("USF engine returns OptimizedValue with .value fields", () => {
    const r = ultimateSpeedFeedEngine.calculate({
      material: "steel", tool_diameter_mm: 10, flute_count: 4, operation: "general",
    });
    expect(r.spindle_rpm?.value).toBeGreaterThan(0);
    expect(r.feed_rate?.value).toBeGreaterThan(0);
    expect(r.feed_per_tooth?.value).toBeGreaterThan(0);
    expect(r.cutting_speed?.value).toBeGreaterThan(0);
    expect(r.forces?.tangential_force_N?.value).toBeGreaterThan(0);
    expect(r.power?.required_power_kw?.value).toBeGreaterThan(0);
  });

  it("pipeline Stage 1.1 modifies block S/F values from USF engine", async () => {
    const r = await postProcessorPipelineEngine.process({
      gcode: "T1 M6\nS1000 M3\nG01 X50 Y0 Z-5 F200\nG01 X50 Y30\nG01 X0 Y30\n",
      material: { id: "s", name: "4140 Steel", iso_group: "P" as const, kc1_1: 2000, mc: 0.25, resolution_confidence: 1 },
      machine: {
        id: "vf2", name: "Haas VF-2", brand: "Haas", controller: "haas" as const,
        max_rpm: 8100, max_power_kW: 22.4,
        rapid_rate_mm_min: { x: 25400, y: 25400, z: 15240 },
        work_volume: { x: 762, y: 406, z: 508 }, axes: 3, resolution_confidence: 1,
      },
      tools: [{
        id: "1", type: "flat_endmill" as const, diameter_mm: 10, flute_count: 4,
        material: "carbide" as const, resolution_confidence: 1,
      }],
      stages: { engagement_analysis: false, safety_analysis: false, playbook_rules: false,
        wear_progression: false, thermal_tracking: false },
    });

    const sfStage = r.stages.find(s => s.stage === "1.1_base_speed_feed");
    expect(sfStage?.status).toBe("pass");

    // Blocks should have been modified from original S1000 F200
    const cutBlocks = r.blocks.filter(b => b.move_type === "G1" && b.optimization);
    expect(cutBlocks.length).toBeGreaterThan(0);

    for (const b of cutBlocks) {
      // USF for steel/10mm/4-flute should give RPM well above original S1000
      expect(b.spindle_rpm).toBeGreaterThan(1500); // modified from original S1000
      // Feed may go up or down depending on physics — but it should be DIFFERENT from 200
      expect(b.feed_mm_min).not.toBe(200); // modified from original F200
      // Force data should be attached
      expect(b.forces).toBeDefined();
      expect(b.forces!.Fc_N).toBeGreaterThan(0);
      expect(b.forces!.power_kW).toBeGreaterThan(0);
    }
  });

  it("verification stage runs on output G-code", async () => {
    const r = await postProcessorPipelineEngine.process({
      gcode: "T1 M6\nS3000 M3\nG01 X50 F800\n",
      material: { id: "s", name: "Steel", iso_group: "P" as const, resolution_confidence: 1 },
      machine: {
        id: "vf2", name: "Haas VF-2", brand: "Haas", controller: "haas" as const,
        max_rpm: 8100, max_power_kW: 22, rapid_rate_mm_min: { x: 25400, y: 25400, z: 15240 },
        work_volume: { x: 762, y: 406, z: 508 }, axes: 3, resolution_confidence: 1,
      },
      stages: { safety_analysis: false, playbook_rules: false },
    });
    const verifyStage = r.stages.find(s => s.stage === "6.8_output_verification");
    expect(verifyStage?.status).toBe("pass");
    expect((verifyStage?.data as any)?.valid).toBeDefined();
  });
});
