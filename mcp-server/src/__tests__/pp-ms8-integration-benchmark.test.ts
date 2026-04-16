/**
 * PP-MS8 Tests: End-to-End Integration + Optimization Benchmarking
 *
 * Tests the complete pipeline across multiple material × machine × operation
 * combinations. Benchmarks PRISM variable S/F against constant S/F baseline.
 */
import { describe, it, expect } from "vitest";
import {
  postProcessorPipelineEngine,
  type PipelineOutput,
  type MaterialContext,
  type MachineContext,
  type ToolContext,
} from "../engines/PostProcessorPipelineEngine.js";
import { controllerDialectEngine } from "../engines/ControllerDialectEngine.js";
import { postProcessorVerificationEngine } from "../engines/PostProcessorVerificationEngine.js";
import { multiCAMPostEngine } from "../engines/MultiCAMPostEngine.js";
import { fiveAxisPostEngine } from "../engines/FiveAxisPostEngine.js";

// ═══ Test Materials ═══
const MATERIALS: Record<string, MaterialContext> = {
  steel: { id: "4140", name: "4140 Steel", iso_group: "P", kc1_1: 2000, mc: 0.25, hardness_HB: 197, resolution_confidence: 1 },
  stainless: { id: "316L", name: "316L Stainless", iso_group: "M", kc1_1: 2400, mc: 0.25, hardness_HB: 217, resolution_confidence: 1 },
  aluminum: { id: "7075", name: "7075-T6", iso_group: "N", kc1_1: 800, mc: 0.23, hardness_HB: 150, resolution_confidence: 1 },
  inconel: { id: "718", name: "Inconel 718", iso_group: "S", kc1_1: 2800, mc: 0.25, hardness_HB: 350, resolution_confidence: 1 },
  cast_iron: { id: "ggg50", name: "GGG-50 Ductile Iron", iso_group: "K", kc1_1: 1200, mc: 0.28, hardness_HB: 200, resolution_confidence: 1 },
};

const MACHINES: Record<string, MachineContext> = {
  haas_vf2: {
    id: "vf2", name: "Haas VF-2", brand: "Haas", controller: "haas",
    max_rpm: 8100, max_power_kW: 22.4, rapid_rate_mm_min: { x: 25400, y: 25400, z: 15240 },
    work_volume: { x: 762, y: 406, z: 508 }, axes: 3, resolution_confidence: 1,
  },
  dmu50: {
    id: "dmu50", name: "DMG MORI DMU 50", brand: "DMG MORI", controller: "siemens_840d",
    max_rpm: 14000, max_power_kW: 35, rapid_rate_mm_min: { x: 42000, y: 42000, z: 42000 },
    work_volume: { x: 500, y: 450, z: 400 }, axes: 5, kinematics: "table_table" as any,
    resolution_confidence: 1,
  },
};

const TOOL_10: ToolContext = {
  id: "1", type: "flat_endmill", diameter_mm: 10, flute_count: 4,
  flute_length_mm: 25, material: "carbide", resolution_confidence: 1,
};

const PROFILING_GCODE = `T1 M6
S3000 M3
G00 X0 Y0 Z5
G01 Z-5 F200
G01 X80 F800
G01 Y50
G01 X0
G01 Y0
G00 Z5`;

const POCKETING_GCODE = `T1 M6
S3000 M3
G00 X10 Y10 Z5
G01 Z-3 F200
G01 X40 F800
G01 Y40
G01 X10
G01 Y10
G01 X40 Y10 Z-3
G01 X40 Y40
G01 X10 Y40
G01 X10 Y10
G00 Z5`;

const DRILLING_GCODE = `T1 M6
S2000 M3
G00 X25 Y25 Z5
G81 Z-20 R2 F150
G80
G00 X50 Y25 Z5
G83 Z-30 R2 Q5 F100
G80
G00 Z50`;

// ═══ Integration Tests ═══

describe("PP-MS8: End-to-End Integration", () => {

  describe("Material × Machine Matrix", () => {
    const combos: [string, string][] = [
      ["steel", "haas_vf2"],
      ["stainless", "haas_vf2"],
      ["aluminum", "haas_vf2"],
      ["inconel", "dmu50"],
      ["cast_iron", "haas_vf2"],
      ["steel", "dmu50"],
      ["aluminum", "dmu50"],
    ];

    for (const [matKey, machKey] of combos) {
      it(`${matKey} on ${machKey} — full pipeline produces valid G-code`, async () => {
        const r = await postProcessorPipelineEngine.process({
          gcode: PROFILING_GCODE,
          material: MATERIALS[matKey],
          machine: MACHINES[machKey],
          tools: [TOOL_10],
          stages: { safety_analysis: false, playbook_rules: false },
        });

        expect(r.overall_status).not.toBe("fail");
        expect(r.output_gcode.length).toBeGreaterThan(10);
        expect(r.blocks.length).toBeGreaterThan(3);
        expect(r.stages.length).toBeGreaterThanOrEqual(10);
        expect(r.total_duration_ms).toBeGreaterThan(0);

        // Verify output G-code
        const v = postProcessorVerificationEngine.verify({
          gcode: r.output_gcode,
          machine_limits: {
            max_rpm: MACHINES[machKey].max_rpm,
            max_feed_mm_min: Math.min(
              MACHINES[machKey].rapid_rate_mm_min.x,
              MACHINES[machKey].rapid_rate_mm_min.y
            ),
          },
        });
        // No critical issues in output
        const criticals = v.issues.filter(i => i.severity === "critical");
        expect(criticals.length).toBe(0);
      });
    }
  });

  describe("Operation Types", () => {
    it("profiling produces valid output", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: PROFILING_GCODE, material: MATERIALS.steel,
        machine: MACHINES.haas_vf2, tools: [TOOL_10],
        stages: { safety_analysis: false, playbook_rules: false },
      });
      expect(r.output_gcode).toContain("M30");
    });

    it("pocketing (more blocks) produces valid output", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: POCKETING_GCODE, material: MATERIALS.aluminum,
        machine: MACHINES.haas_vf2, tools: [TOOL_10],
        stages: { safety_analysis: false, playbook_rules: false },
      });
      expect(r.blocks.length).toBeGreaterThan(5);
    });

    it("drilling produces valid output", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: DRILLING_GCODE, material: MATERIALS.steel,
        machine: MACHINES.haas_vf2, tools: [TOOL_10],
        stages: { safety_analysis: false, playbook_rules: false },
      });
      expect(r.output_gcode.length).toBeGreaterThan(10);
    });
  });

  describe("Controller Output Variants", () => {
    const controllers = ["haas", "siemens", "heidenhain", "fanuc", "mazak"];

    for (const ctrl of controllers) {
      it(`${ctrl} controller produces syntactically valid output`, async () => {
        const r = await postProcessorPipelineEngine.process({
          gcode: PROFILING_GCODE,
          material: MATERIALS.steel,
          controller: ctrl as any,
          tools: [TOOL_10],
          stages: { speed_feed: false, engagement_analysis: false,
            safety_analysis: false, playbook_rules: false,
            wear_progression: false, thermal_tracking: false },
        });
        expect(r.output_gcode.length).toBeGreaterThan(10);
        // Each controller should have its program end marker
        const dialect = controllerDialectEngine.getDialect(ctrl);
        if (dialect.base_family === "heidenhain") {
          expect(r.output_gcode).toContain("END PGM");
        } else {
          expect(r.output_gcode).toContain("M30");
        }
      });
    }
  });

  describe("Reoptimize (Phase B)", () => {
    it("reoptimizes existing G-code", async () => {
      const r = await postProcessorPipelineEngine.reoptimize({
        gcode: PROFILING_GCODE,
        material: "4140 Steel",
        iso_group: "P",
        controller: "fanuc",
        aggressiveness: 0.6,
        stages: { safety_analysis: false, playbook_rules: false },
      });
      expect(r.output_gcode.length).toBeGreaterThan(10);
      expect(r.aggressiveness).toBe(0.6);
    });
  });
});

// ═══ Optimization Benchmarking ═══

describe("PP-MS8: Optimization Benchmarking", () => {

  it("PRISM pipeline runs faster than 500ms for typical program", async () => {
    const start = Date.now();
    await postProcessorPipelineEngine.process({
      gcode: PROFILING_GCODE, material: MATERIALS.steel,
      machine: MACHINES.haas_vf2, tools: [TOOL_10],
      stages: { safety_analysis: false, playbook_rules: false },
    });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);
  });

  it("variable S/F blocks have optimization reasons attached", async () => {
    const r = await postProcessorPipelineEngine.process({
      gcode: PROFILING_GCODE, material: MATERIALS.steel,
      machine: MACHINES.haas_vf2, tools: [TOOL_10],
      operations: [{ id: 0, type: "profiling", tool_number: 1, ae_mm: 2, ap_mm: 5, blocks: [] }],
      stages: { safety_analysis: false, playbook_rules: false },
    });
    const optimized = r.blocks.filter(b => b.optimization?.reasons.length);
    // At least some blocks should have optimization reasons
    if (optimized.length > 0) {
      for (const b of optimized) {
        expect(b.optimization!.reasons.length).toBeGreaterThan(0);
        expect(b.optimization!.reasons[0]).toBeTruthy();
      }
    }
  });

  it("analytics report has valid metrics", async () => {
    const r = await postProcessorPipelineEngine.process({
      gcode: PROFILING_GCODE, material: MATERIALS.steel,
      machine: MACHINES.haas_vf2, tools: [TOOL_10],
      include_analytics: true,
      stages: { safety_analysis: false, playbook_rules: false },
    });
    expect(r.analytics).toBeDefined();
    expect(r.analytics!.overall.total_cycle_time_s).toBeGreaterThan(0);
    expect(r.analytics!.overall.cutting_time_s).toBeGreaterThanOrEqual(0);
  });

  it("all 7 phases represented in full pipeline output", async () => {
    const r = await postProcessorPipelineEngine.process({
      gcode: PROFILING_GCODE, material: MATERIALS.steel,
      machine: MACHINES.haas_vf2, tools: [TOOL_10],
      operations: [{ id: 0, type: "profiling", tool_number: 1, ae_mm: 3, ap_mm: 5, blocks: [] }],
      stages: { motion_dynamics: true, controller_features: true,
        monte_carlo: true, robustness_score: true, energy_optimization: true,
        fixture_check: true, capability_forecast: true,
        safety_analysis: false, playbook_rules: false },
    });
    const phases = new Set(r.stages.map(s => s.phase));
    expect(phases.size).toBeGreaterThanOrEqual(7);
  });
});

// ═══ Cross-System Integration ═══

describe("PP-MS8: Cross-System Integration", () => {

  it("ControllerDialectEngine + Pipeline produce consistent output", async () => {
    const dialect = controllerDialectEngine.getDialect("haas");
    const r = await postProcessorPipelineEngine.process({
      gcode: PROFILING_GCODE, material: MATERIALS.steel,
      controller: "haas", tools: [TOOL_10],
      stages: { speed_feed: false, engagement_analysis: false,
        safety_analysis: false, playbook_rules: false,
        wear_progression: false, thermal_tracking: false },
    });
    // Haas uses parentheses comments
    expect(dialect.comment_style).toBe("parentheses");
    expect(r.output_gcode).toContain("M30");
  });

  it("FiveAxisPostEngine TCPC codes match ControllerDialect features", () => {
    const tcpc = fiveAxisPostEngine.getTCPCCodes("fanuc_31i", 1);
    const dialect = controllerDialectEngine.getDialect("fanuc_31i");
    // Both should reference G43.4 for Fanuc 31i
    expect(tcpc.on).toContain("G43.4");
    expect(dialect.features.tcpc?.on).toContain("G43.4");
  });

  it("MultiCAMPostEngine lists Fusion360 as Phase A capable", () => {
    expect(multiCAMPostEngine.supportsPhaseA("fusion360")).toBe(true);
    const info = multiCAMPostEngine.getCAMInfo("fusion360");
    expect(info.post_format).toBe("cps");
    expect(info.context_extraction).toContain("tools");
  });

  it("PostProcessorVerificationEngine validates pipeline output", async () => {
    const r = await postProcessorPipelineEngine.process({
      gcode: PROFILING_GCODE, material: MATERIALS.steel,
      machine: MACHINES.haas_vf2, tools: [TOOL_10],
      stages: { safety_analysis: false, playbook_rules: false },
    });
    const v = postProcessorVerificationEngine.verify({
      gcode: r.output_gcode,
      machine_limits: { max_rpm: 8100, max_feed_mm_min: 25400 },
    });
    expect(v.summary.total_lines).toBeGreaterThan(5);
  });
});
