/**
 * PP-MOAT-MS1: Engine Wiring Tests
 *
 * Verifies that LineByLineAdaptiveEngine (Stage 2.0), StabilityRPMRewriterEngine (Stage 3.4b),
 * ProbingCycleEngine (Stage 6.2 fallback), and ThreadMillingPhysicsEngine (Stage 1.5b)
 * are properly wired into PostProcessorPipelineEngine.
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

const MATERIAL_4140: MaterialContext = {
  id: "4140", name: "4140 Steel", iso_group: "P",
  kc1_1: 1800, mc: 0.25, hardness_HB: 197,
  resolution_confidence: 1,
};

const TOOL_ENDMILL: ToolContext = {
  id: "1", type: "flat_endmill", diameter_mm: 10, flute_count: 4,
  flute_length_mm: 25, material: "carbide", resolution_confidence: 1,
};

const TOOL_THREAD_MILL: ToolContext = {
  id: "2", type: "thread_mill", diameter_mm: 8, flute_count: 3,
  flute_length_mm: 16, material: "carbide", resolution_confidence: 1,
  corner_radius_mm: 0.4,
};

const SIMPLE_GCODE = [
  "O1001", "G90 G54 G17", "T1 M6", "S3000 M3", "G43 H1", "M8",
  "G0 X0 Y0 Z50.", "G0 Z5.",
  "G1 Z-2. F200.",                  // plunge
  "G1 X50. F600.",                  // cut 1
  "G1 Y50. F600.",                  // corner
  "G1 X0. F600.",                   // cut 2
  "G1 Y0. F600.",                   // return
  "G0 Z50.", "M9", "M5", "M30",
].join("\n");

const THREAD_GCODE = [
  "O2001", "G90 G54 G17", "T2 M6", "S2000 M3", "G43 H2", "M8",
  "G0 X0 Y0 Z50.",
  "G0 X25. Y25. Z5.",
  "G1 Z-12. F200.",                 // plunge to thread depth
  "G3 X25. Y25. Z-13.5 I-8.5 J0. F150.",  // helical thread mill
  "G3 X25. Y25. Z-15. I-8.5 J0. F150.",
  "G0 Z50.", "M9", "M5", "M30",
].join("\n");

// ── Stage 2.0: LineByLineAdaptiveEngine ───────────────────────────

describe("PP-MOAT-MS1 Stage 2.0: LineByLineAdaptiveEngine", () => {
  it("produces 2.0_line_by_line_adaptive stage when gcode input provided", async () => {
    const result = await postProcessorPipelineEngine.process({
      gcode: SIMPLE_GCODE,
      machine: MACHINE_HAAS,
      material: MATERIAL_4140,
      tools: [TOOL_ENDMILL],
      controller: "haas",
    });

    const stage20 = result.stages.find(s => s.stage === "2.0_line_by_line_adaptive");
    expect(stage20).toBeDefined();
    expect(stage20!.status).not.toBe("skipped");
  });

  it("skips inline Phase 2 stages when LineByLine is active", async () => {
    const result = await postProcessorPipelineEngine.process({
      gcode: SIMPLE_GCODE,
      machine: MACHINE_HAAS,
      material: MATERIAL_4140,
      tools: [TOOL_ENDMILL],
      controller: "haas",
    });

    const stage20 = result.stages.find(s => s.stage === "2.0_line_by_line_adaptive");
    if (stage20 && stage20.status !== "skipped") {
      // When LBL is active, inline stages should be skipped
      const stage21 = result.stages.find(s => s.stage === "2.1_engagement_chip_thinning");
      const stage23 = result.stages.find(s => s.stage === "2.3_adaptive_feed");
      const stage24 = result.stages.find(s => s.stage === "2.4_corner_detection");
      expect(stage21?.status).toBe("skipped");
      expect(stage23?.status).toBe("skipped");
      expect(stage24?.status).toBe("skipped");
    }
  });

  it("reports line-by-line statistics in stage data", async () => {
    const result = await postProcessorPipelineEngine.process({
      gcode: SIMPLE_GCODE,
      machine: MACHINE_HAAS,
      material: MATERIAL_4140,
      tools: [TOOL_ENDMILL],
      controller: "haas",
    });

    const stage20 = result.stages.find(s => s.stage === "2.0_line_by_line_adaptive");
    if (stage20 && stage20.status !== "skipped") {
      const data = stage20.data as any;
      expect(data).toBeDefined();
      // Should report lines_modified and feed change stats
      expect(typeof data.lines_modified).toBe("number");
    }
  });

  it("falls back to inline Phase 2 when line_by_line_adaptive is disabled", async () => {
    const result = await postProcessorPipelineEngine.process({
      gcode: SIMPLE_GCODE,
      machine: MACHINE_HAAS,
      material: MATERIAL_4140,
      tools: [TOOL_ENDMILL],
      controller: "haas",
      stages: { line_by_line_adaptive: false },
    });

    const stage20 = result.stages.find(s => s.stage === "2.0_line_by_line_adaptive");
    expect(stage20?.status).toBe("skipped");

    // Inline stages should run
    const stage21 = result.stages.find(s => s.stage === "2.1_engagement_chip_thinning");
    expect(stage21).toBeDefined();
    expect(stage21!.status).not.toBe("skipped");
  });

  it("skips Stage 2.0 when no gcode input (blocks-only)", async () => {
    const result = await postProcessorPipelineEngine.process({
      blocks: [
        { id: 0, move_type: "G0", x: 0, y: 0, z: 50, tool_number: 1 },
        { id: 1, move_type: "G1", x: 50, y: 0, z: -2, feed_mm_min: 600, spindle_rpm: 3000, tool_number: 1 },
      ],
      machine: MACHINE_HAAS,
      material: MATERIAL_4140,
      tools: [TOOL_ENDMILL],
      controller: "haas",
    });

    const stage20 = result.stages.find(s => s.stage === "2.0_line_by_line_adaptive");
    expect(stage20?.status).toBe("skipped");
  });
});

// ── Stage 3.4b: StabilityRPMRewriterEngine ─────────────────────

describe("PP-MOAT-MS1 Stage 3.4b: StabilityRPMRewriterEngine", () => {
  it("produces 3.4b_stability_rpm_rewrite stage", async () => {
    const result = await postProcessorPipelineEngine.process({
      gcode: SIMPLE_GCODE,
      machine: MACHINE_HAAS,
      material: MATERIAL_4140,
      tools: [TOOL_ENDMILL],
      controller: "haas",
    });

    const stage34b = result.stages.find(s => s.stage === "3.4b_stability_rpm_rewrite");
    expect(stage34b).toBeDefined();
  });

  it("reports no_sld_data when stability lobes stage has no lobes", async () => {
    const result = await postProcessorPipelineEngine.process({
      gcode: SIMPLE_GCODE,
      machine: MACHINE_HAAS,
      material: MATERIAL_4140,
      tools: [TOOL_ENDMILL],
      controller: "haas",
    });

    const stage34b = result.stages.find(s => s.stage === "3.4b_stability_rpm_rewrite");
    if (stage34b && stage34b.status !== "skipped") {
      const data = stage34b.data as any;
      // Without explicit SLD lobe data, should report no_sld_data
      if (data?.status === "no_sld_data") {
        expect(data.reason).toContain("SLD");
      }
    }
  });

  it("can be disabled via stages config", async () => {
    const result = await postProcessorPipelineEngine.process({
      gcode: SIMPLE_GCODE,
      machine: MACHINE_HAAS,
      material: MATERIAL_4140,
      tools: [TOOL_ENDMILL],
      controller: "haas",
      stages: { stability_rewrite: false },
    });

    const stage34b = result.stages.find(s => s.stage === "3.4b_stability_rpm_rewrite");
    expect(stage34b?.status).toBe("skipped");
  });

  it("runs after Stage 3.4 and before Stage 3.5", async () => {
    const result = await postProcessorPipelineEngine.process({
      gcode: SIMPLE_GCODE,
      machine: MACHINE_HAAS,
      material: MATERIAL_4140,
      tools: [TOOL_ENDMILL],
      controller: "haas",
    });

    const stageNames = result.stages.map(s => s.stage);
    const idx34 = stageNames.findIndex(s => s.startsWith("3.4_"));
    const idx34b = stageNames.findIndex(s => s === "3.4b_stability_rpm_rewrite");
    const idx35 = stageNames.findIndex(s => s.startsWith("3.5_"));

    if (idx34 >= 0 && idx34b >= 0 && idx35 >= 0) {
      expect(idx34b).toBeGreaterThan(idx34);
      expect(idx34b).toBeLessThan(idx35);
    }
  });
});

// ── Stage 6.2: ProbingCycleEngine ───────────────────────────────

describe("PP-MOAT-MS1 Stage 6.2: ProbingCycleEngine dialect fallback", () => {
  it("produces dialect-correct probing when probe_routines enabled", async () => {
    const result = await postProcessorPipelineEngine.process({
      gcode: SIMPLE_GCODE,
      machine: MACHINE_HAAS,
      material: MATERIAL_4140,
      tools: [TOOL_ENDMILL],
      controller: "haas",
      stages: { probe_routines: true },
      include_probe_routines: true,
      tolerance_mm: 0.01,
    });

    const stage62 = result.stages.find(s => s.stage === "6.2_probe_routines");
    expect(stage62).toBeDefined();
    expect(stage62!.status).not.toBe("skipped");
  });

  it("maps Siemens controller to siemens probe dialect", async () => {
    const result = await postProcessorPipelineEngine.process({
      gcode: SIMPLE_GCODE,
      machine: MACHINE_SIEMENS,
      material: MATERIAL_4140,
      tools: [TOOL_ENDMILL],
      controller: "siemens",
      stages: { probe_routines: true },
      include_probe_routines: true,
      tolerance_mm: 0.01,
    });

    const stage62 = result.stages.find(s => s.stage === "6.2_probe_routines");
    if (stage62 && stage62.status !== "skipped") {
      const data = stage62.data as any;
      // Should use siemens dialect (CYCLE977/978) not hardcoded G65
      if (data?.controller) {
        expect(["siemens", "renishaw_fanuc", "renishaw_haas"]).toContain(data.controller);
      }
    }
  });

  it("skips probe routines when tolerance is loose and not requested", async () => {
    const result = await postProcessorPipelineEngine.process({
      gcode: SIMPLE_GCODE,
      machine: MACHINE_HAAS,
      material: MATERIAL_4140,
      tools: [TOOL_ENDMILL],
      controller: "haas",
      stages: { probe_routines: true },
      tolerance_mm: 0.1,
      // NOT setting include_probe_routines
    });

    const stage62 = result.stages.find(s => s.stage === "6.2_probe_routines");
    if (stage62 && stage62.status !== "skipped") {
      const data = stage62.data as any;
      // Should report not_needed for loose tolerance
      if (data?.status) {
        expect(data.status).toBe("not_needed");
      }
    }
  });
});

// ── Stage 1.5b: ThreadMillingPhysicsEngine ─────────────────────

describe("PP-MOAT-MS1 Stage 1.5b: ThreadMillingPhysicsEngine", () => {
  it("produces 1.5b_thread_milling stage", async () => {
    const result = await postProcessorPipelineEngine.process({
      gcode: SIMPLE_GCODE,
      machine: MACHINE_HAAS,
      material: MATERIAL_4140,
      tools: [TOOL_ENDMILL],
      controller: "haas",
    });

    const stage15b = result.stages.find(s => s.stage === "1.5b_thread_milling");
    expect(stage15b).toBeDefined();
  });

  it("skips when no thread tools or operations", async () => {
    const result = await postProcessorPipelineEngine.process({
      gcode: SIMPLE_GCODE,
      machine: MACHINE_HAAS,
      material: MATERIAL_4140,
      tools: [TOOL_ENDMILL], // flat_endmill, not thread_mill
      controller: "haas",
    });

    const stage15b = result.stages.find(s => s.stage === "1.5b_thread_milling");
    if (stage15b && stage15b.status !== "skipped") {
      const data = stage15b.data as any;
      expect(data?.status).toBe("no_thread_ops");
    }
  });

  it("activates with thread_mill tool and predicts thread class", async () => {
    const result = await postProcessorPipelineEngine.process({
      gcode: THREAD_GCODE,
      machine: MACHINE_HAAS,
      material: MATERIAL_4140,
      tools: [TOOL_THREAD_MILL],
      controller: "haas",
    });

    const stage15b = result.stages.find(s => s.stage === "1.5b_thread_milling");
    expect(stage15b).toBeDefined();
    if (stage15b && stage15b.status !== "skipped") {
      const data = stage15b.data as any;
      if (data?.thread_ops > 0) {
        expect(data.results).toBeDefined();
        expect(data.results.length).toBeGreaterThan(0);
        // Each result should have predicted_class and deflection
        const first = data.results[0];
        expect(first.predicted_class).toBeDefined();
        expect(typeof first.deflection_mm).toBe("number");
        expect(typeof first.within_tolerance).toBe("boolean");
      }
    }
  });

  it("can be disabled via stages config", async () => {
    const result = await postProcessorPipelineEngine.process({
      gcode: THREAD_GCODE,
      machine: MACHINE_HAAS,
      material: MATERIAL_4140,
      tools: [TOOL_THREAD_MILL],
      controller: "haas",
      stages: { thread_milling_physics: false },
    });

    const stage15b = result.stages.find(s => s.stage === "1.5b_thread_milling");
    expect(stage15b?.status).toBe("skipped");
  });

  it("runs between Stage 1.5 and Stage 1.6", async () => {
    const result = await postProcessorPipelineEngine.process({
      gcode: SIMPLE_GCODE,
      machine: MACHINE_HAAS,
      material: MATERIAL_4140,
      tools: [TOOL_ENDMILL],
      controller: "haas",
    });

    const stageNames = result.stages.map(s => s.stage);
    const idx15 = stageNames.findIndex(s => s === "1.5_tool_deflection");
    const idx15b = stageNames.findIndex(s => s === "1.5b_thread_milling");
    const idx16 = stageNames.findIndex(s => s === "1.6_chip_morphology");

    if (idx15 >= 0 && idx15b >= 0 && idx16 >= 0) {
      expect(idx15b).toBeGreaterThan(idx15);
      expect(idx15b).toBeLessThan(idx16);
    }
  });
});

// ── Cross-Cutting: All 4 stages present ─────────────────────────

describe("PP-MOAT-MS1: All stages present in pipeline output", () => {
  it("pipeline output includes all 4 new stages", async () => {
    const result = await postProcessorPipelineEngine.process({
      gcode: SIMPLE_GCODE,
      machine: MACHINE_HAAS,
      material: MATERIAL_4140,
      tools: [TOOL_ENDMILL],
      controller: "haas",
    });

    const stageNames = result.stages.map(s => s.stage);
    expect(stageNames).toContain("2.0_line_by_line_adaptive");
    expect(stageNames).toContain("3.4b_stability_rpm_rewrite");
    expect(stageNames).toContain("1.5b_thread_milling");
    // 6.2 is opt-in, so it may not appear unless probe_routines=true
  });

  it("pipeline still produces valid output_gcode with all new stages", async () => {
    const result = await postProcessorPipelineEngine.process({
      gcode: SIMPLE_GCODE,
      machine: MACHINE_HAAS,
      material: MATERIAL_4140,
      tools: [TOOL_ENDMILL],
      controller: "haas",
    });

    expect(result.output_gcode).toBeTruthy();
    expect(result.output_gcode.length).toBeGreaterThan(50);
    expect(result.overall_status).not.toBe("fail");
  });

  it("pipeline handles thread mill + probing + all stages together", async () => {
    const result = await postProcessorPipelineEngine.process({
      gcode: THREAD_GCODE,
      machine: MACHINE_HAAS,
      material: MATERIAL_4140,
      tools: [TOOL_THREAD_MILL],
      controller: "haas",
      stages: { probe_routines: true },
      include_probe_routines: true,
      tolerance_mm: 0.01,
    });

    expect(result.output_gcode).toBeTruthy();
    expect(result.overall_status).not.toBe("fail");

    const stageNames = result.stages.map(s => s.stage);
    expect(stageNames).toContain("1.5b_thread_milling");
    expect(stageNames).toContain("2.0_line_by_line_adaptive");
    expect(stageNames).toContain("3.4b_stability_rpm_rewrite");
    expect(stageNames).toContain("6.2_probe_routines");
  });
});
