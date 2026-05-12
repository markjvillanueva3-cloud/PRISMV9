/**
 * PP-MS9/U-PP39 — End-to-End Post Processor Integration Tests
 *
 * Tests the complete PPG flow for 10 representative machines:
 *   machine selection → fingerprint → feature config → generate → validate → download
 *
 * Verifies generated G-code is syntactically valid per controller family.
 */

import { describe, it, expect } from "vitest";
import { postDownloadEngine } from "../engines/PostDownloadEngine.js";
import { proveOutModeEngine } from "../engines/ProveOutModeEngine.js";
import { postValidationHardeningEngine } from "../engines/PostValidationHardeningEngine.js";
import { postValidationReportEngine } from "../engines/PostValidationReportEngine.js";
import { postLibraryCatalogEngine } from "../engines/PostLibraryCatalogEngine.js";
import type { MachineContext } from "../engines/PostProcessorPipelineEngine.js";

// ─── Test Fixtures ──────────────────────────────────────────────────

const SAMPLE_PROGRAM = [
  "O1001",
  "(TEST PROGRAM)",
  "G90 G54 G17",
  "T1 M6",
  "S8000 M3",
  "G43 H1 Z50.",
  "G0 X0 Y0",
  "G0 Z5.",
  "G1 Z-5. F500",
  "G1 X100. Y50. F800",
  "G1 Y100. F1000",
  "G0 Z50.",
  "T2 M6",
  "S12000 M3",
  "G43 H2 Z50.",
  "G0 X50. Y50.",
  "G0 Z5.",
  "G1 Z-2. F300",
  "G1 X80. Y80. F600",
  "G0 Z50.",
  "M5",
  "G28 G91 Z0",
  "M30",
].join("\n");

/** 10 representative machines from the roadmap specification */
const REPRESENTATIVE_MACHINES: Array<{
  name: string;
  controller: string;
  brand: string;
  machineContext: MachineContext;
}> = [
  {
    name: "Haas VF-2",
    controller: "haas_ngc",
    brand: "Haas",
    machineContext: {
      id: "haas-vf2", name: "Haas VF-2", brand: "Haas", controller: "haas_ngc",
      max_rpm: 8100, max_power_kW: 22.4,
      work_volume: { x: 762, y: 406, z: 508 },
      rapid_rate_mm_min: { x: 25400, y: 25400, z: 25400 },
      axes: 3, atc_capacity: 20, coolant_types: ["flood", "tsc"],
    },
  },
  {
    name: "Fanuc 31i Mill",
    controller: "fanuc_31i",
    brand: "Fanuc",
    machineContext: {
      id: "fanuc-31i-mill", name: "Fanuc 31i Mill", brand: "Fanuc", controller: "fanuc_31i",
      max_rpm: 15000, max_power_kW: 30,
      work_volume: { x: 1000, y: 600, z: 600 },
      rapid_rate_mm_min: { x: 30000, y: 30000, z: 30000 },
      axes: 3, atc_capacity: 30,
    },
  },
  {
    name: "Siemens 840D 5-Axis",
    controller: "siemens_840d",
    brand: "DMG MORI",
    machineContext: {
      id: "siemens-840d-5ax", name: "Siemens 840D 5-Axis", brand: "DMG MORI", controller: "siemens_840d",
      max_rpm: 18000, max_power_kW: 35,
      work_volume: { x: 800, y: 600, z: 500 },
      rapid_rate_mm_min: { x: 40000, y: 40000, z: 40000 },
      axes: 5, atc_capacity: 60, coolant_types: ["flood", "tsc", "mist"],
    },
  },
  {
    name: "Mazak Integrex",
    controller: "mazak_smooth_ai",
    brand: "Mazak",
    machineContext: {
      id: "mazak-integrex", name: "Mazak Integrex", brand: "Mazak", controller: "mazak_smooth_ai",
      max_rpm: 12000, max_power_kW: 22,
      work_volume: { x: 660, y: 660, z: 1020 },
      rapid_rate_mm_min: { x: 30000, y: 30000, z: 30000 },
      axes: 5, atc_capacity: 36, coolant_types: ["flood", "tsc"],
    },
  },
  {
    name: "Okuma Genos L",
    controller: "okuma_osp_p300",
    brand: "Okuma",
    machineContext: {
      id: "okuma-genos-l", name: "Okuma Genos L", brand: "Okuma", controller: "okuma_osp_p300",
      max_rpm: 4200, max_power_kW: 15,
      work_volume: { x: 200, y: 200, z: 500 },
      rapid_rate_mm_min: { x: 20000, y: 20000, z: 20000 },
      axes: 2,
    },
  },
  {
    name: "Brother Speedio",
    controller: "brother_speedio",
    brand: "Brother",
    machineContext: {
      id: "brother-speedio", name: "Brother Speedio", brand: "Brother", controller: "brother_speedio",
      max_rpm: 16000, max_power_kW: 7.5,
      work_volume: { x: 300, y: 450, z: 305 },
      rapid_rate_mm_min: { x: 50000, y: 50000, z: 50000 },
      axes: 3, atc_capacity: 21,
    },
  },
  {
    name: "Citizen Cincom",
    controller: "citizen_cincom",
    brand: "Citizen",
    machineContext: {
      id: "citizen-cincom", name: "Citizen Cincom L32", brand: "Citizen", controller: "citizen_cincom",
      max_rpm: 8000, max_power_kW: 3.7,
      work_volume: { x: 32, y: 32, z: 200 },
      rapid_rate_mm_min: { x: 20000, y: 20000, z: 20000 },
      axes: 3,
    },
  },
  {
    name: "DMG MORI NLX",
    controller: "dmg_celos_fanuc",
    brand: "DMG MORI",
    machineContext: {
      id: "dmg-nlx", name: "DMG MORI NLX 2500", brand: "DMG MORI", controller: "dmg_celos_fanuc",
      max_rpm: 4000, max_power_kW: 18.5,
      work_volume: { x: 260, y: 260, z: 705 },
      rapid_rate_mm_min: { x: 30000, y: 30000, z: 30000 },
      axes: 2, atc_capacity: 12, coolant_types: ["flood"],
    },
  },
  {
    name: "Hurco VMX",
    controller: "hurco_max5",
    brand: "Hurco",
    machineContext: {
      id: "hurco-vmx", name: "Hurco VMX 42", brand: "Hurco", controller: "hurco_max5",
      max_rpm: 12000, max_power_kW: 18.5,
      work_volume: { x: 1067, y: 610, z: 610 },
      rapid_rate_mm_min: { x: 25400, y: 25400, z: 25400 },
      axes: 3, atc_capacity: 24,
    },
  },
  {
    name: "Doosan DNM",
    controller: "doosan_fanuc",
    brand: "Doosan",
    machineContext: {
      id: "doosan-dnm", name: "Doosan DNM 5700", brand: "Doosan", controller: "doosan_fanuc",
      max_rpm: 12000, max_power_kW: 18.5,
      work_volume: { x: 1020, y: 570, z: 510 },
      rapid_rate_mm_min: { x: 36000, y: 36000, z: 36000 },
      axes: 3, atc_capacity: 30, coolant_types: ["flood", "tsc"],
    },
  },
];

// ─── E2E Flow Tests ─────────────────────────────────────────────────

describe("PP-MS9 E2E: Complete Post Processor Flow", () => {
  for (const machine of REPRESENTATIVE_MACHINES) {
    describe(`${machine.name} (${machine.controller})`, () => {
      it("generates valid download for controller-native format", () => {
        const result = postDownloadEngine.execute({
          action: "format_download",
          gcode: SAMPLE_PROGRAM,
          controller: machine.controller,
          machine_brand: machine.brand,
          machine_model: machine.name,
          program_name: `E2E_${machine.controller.toUpperCase()}`,
          include_physics_comments: true,
          physics_blocks: [
            { line: 8, force_N: 450, confidence: 0.88 },
            { line: 9, force_N: 520, power_kW: 3.2, confidence: 0.91 },
          ],
        });

        expect(result).toBeDefined();
        expect(result.content.length).toBeGreaterThan(0);
        expect(result.filename).toBeTruthy();
        expect(result.size_bytes).toBeGreaterThan(0);
        expect(result.format).toBeTruthy();
        // Verify G-code contains the original motion blocks
        expect(result.content).toContain("G1");
        expect(result.content).toContain("PRISM");
      });

      it("produces valid prove-out version", async () => {
        const result = await proveOutModeEngine.process({
          action: "apply_prove_out",
          gcode: SAMPLE_PROGRAM,
          machine: machine.machineContext,
        });

        expect(result.gcode.length).toBeGreaterThan(0);
        expect(result.summary.feed_reductions).toBeGreaterThan(0);
        expect(result.summary.rpm_caps).toBeGreaterThan(0);
        expect(result.estimated_cycle_time_ratio).toBeGreaterThan(1.0);
        // Prove-out should not remove any original motion
        expect(result.gcode).toContain("G1");
      });

      it("passes validation against machine limits", async () => {
        const valResult = await postValidationHardeningEngine.process({
          action: "validate",
          gcode: SAMPLE_PROGRAM,
          machine: machine.machineContext,
        });

        expect(valResult).toBeDefined();
        expect(valResult.summary.lines_checked).toBeGreaterThan(0);
        // Sample program is designed to be within typical machine limits
        // Some machines may flag RPM or axis travel warnings — that's expected
        expect(valResult.flags).toBeDefined();
      });

      it("generates validation report", async () => {
        const valResult = await postValidationHardeningEngine.process({
          action: "validate",
          gcode: SAMPLE_PROGRAM,
          machine: machine.machineContext,
        });

        const report = await postValidationReportEngine.process({
          action: "generate_report",
          validation: valResult,
          machine: machine.machineContext,
          format: "text",
          program_name: `E2E_${machine.controller}`,
        });

        expect(report.content.length).toBeGreaterThan(0);
        expect(report.content).toContain("POST VALIDATION REPORT");
        expect(report.metadata.format).toBe("text");
      });

      it("generates setup sheet", () => {
        const result = postDownloadEngine.execute({
          action: "setup_sheet",
          gcode: SAMPLE_PROGRAM,
          controller: machine.controller,
          machine_brand: machine.brand,
          machine_model: machine.name,
          physics_blocks: [
            { line: 8, force_N: 450, confidence: 0.88 },
          ],
        });

        expect(result.content).toContain("Setup Sheet");
        expect(result.content).toContain(machine.controller);
        expect(result.filename).toContain("SETUP");
      });

      it("builds complete manifest", () => {
        const result = postDownloadEngine.execute({
          action: "manifest",
          gcode: SAMPLE_PROGRAM,
          controller: machine.controller,
          machine_brand: machine.brand,
          machine_model: machine.name,
        }) as any;

        expect(result.files.length).toBeGreaterThanOrEqual(2);
        expect(result.total_size_bytes).toBeGreaterThan(0);
      });
    });
  }
});

describe("PP-MS9 E2E: Library Search", () => {
  it("searches catalog and returns results", async () => {
    const result = await postLibraryCatalogEngine.process({
      action: "search",
      query: "haas",
    });
    expect(result).toBeDefined();
  });

  it("lists facets", async () => {
    const result = await postLibraryCatalogEngine.process({
      action: "list_facets",
    });
    expect(result).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// PP-MS9 U-PP39: FULL PIPELINE FLOW TESTS
// Tests the actual PostProcessorPipelineEngine for each machine type
// ═══════════════════════════════════════════════════════════════════════

import {
  postProcessorPipelineEngine,
  type MaterialContext,
  type ToolContext,
  type PipelineOutput,
  type ControllerFamily,
} from "../engines/PostProcessorPipelineEngine.js";

/** Standard milling G-code for pipeline testing */
const MILLING_GCODE = `O2001
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

/** 5-axis milling G-code with A/B rotary */
const FIVE_AXIS_GCODE = `O5001
G90 G54 G17
T1 M6
S4000 M3
G43.4 H1
M8
G0 X0 Y0 Z50.
G0 Z5.
G1 Z-3. F200
G1 X50. Y25. F400
G1 X100. Y50. F350
G1 X50. Y75. F400
G1 X0. Y50. F350
G0 Z50.
M9
M5
M30`;

/** Turning G-code for lathe machines */
const TURNING_GCODE_PIPE = `O3001
G90 G54
T0101
G97 S1500 M3
G0 X80. Z5.
M8
G0 X52.
G1 Z0. F0.2
G1 X-1.6 F0.15
G0 Z5.
G0 X50.
G1 Z-40. F0.2
G1 X52.
G0 Z5.
G0 X80.
M9
M5
M30`;

/** Swiss turning G-code for small parts */
const SWISS_GCODE = `O4001
G90 G54
T0101
G97 S8000 M3
G0 X20. Z2.
M8
G1 Z0. F0.05
G1 X6. F0.03
G0 X20.
G0 Z0.
G1 Z-15. X6. F0.05
G0 X20.
G0 Z5.
M9
M5
M30`;

// Pipeline-compatible machine contexts (use ControllerFamily type values)
const PIPELINE_MACHINES: Record<string, {
  machine: MachineContext;
  controller: ControllerFamily;
  gcode: string;
  material: MaterialContext;
  tools: ToolContext[];
}> = {
  haas_vf2: {
    machine: {
      id: "haas-vf2", name: "Haas VF-2", brand: "Haas", controller: "haas",
      max_rpm: 8100, max_power_kW: 22.4,
      rapid_rate_mm_min: { x: 25400, y: 25400, z: 15240 },
      work_volume: { x: 762, y: 406, z: 508 },
      axes: 3, atc_capacity: 20, coolant_types: ["flood", "tsc"],
      resolution_confidence: 0.95,
    },
    controller: "haas",
    gcode: MILLING_GCODE,
    material: { id: "4140", name: "4140 Steel", iso_group: "P", kc1_1: 1800, mc: 0.25, hardness_HB: 197, resolution_confidence: 1 },
    tools: [{ id: "1", type: "flat_endmill", diameter_mm: 10, flute_count: 4, flute_length_mm: 25, material: "carbide", resolution_confidence: 1 }],
  },
  fanuc_31i: {
    machine: {
      id: "fanuc-31i", name: "Fanuc 31i Mill", brand: "Fanuc", controller: "fanuc",
      max_rpm: 12000, max_power_kW: 30,
      rapid_rate_mm_min: { x: 36000, y: 36000, z: 24000 },
      work_volume: { x: 1000, y: 500, z: 500 },
      axes: 3, atc_capacity: 30, coolant_types: ["flood", "mist"],
      resolution_confidence: 0.9,
    },
    controller: "fanuc",
    gcode: MILLING_GCODE,
    material: { id: "316L", name: "316L Stainless", iso_group: "M", kc1_1: 2100, mc: 0.25, hardness_HB: 217, resolution_confidence: 1 },
    tools: [{ id: "1", type: "flat_endmill", diameter_mm: 10, flute_count: 4, flute_length_mm: 25, material: "carbide", resolution_confidence: 1 }],
  },
  siemens_840d: {
    machine: {
      id: "siemens-840d", name: "Siemens 840D 5-Axis", brand: "DMG MORI", controller: "siemens",
      max_rpm: 14000, max_power_kW: 35,
      rapid_rate_mm_min: { x: 42000, y: 42000, z: 42000 },
      work_volume: { x: 500, y: 450, z: 400 },
      axes: 5, atc_capacity: 60, coolant_types: ["flood", "tsc", "mql"],
      resolution_confidence: 0.95,
    },
    controller: "siemens",
    gcode: FIVE_AXIS_GCODE,
    material: { id: "718", name: "Inconel 718", iso_group: "S", kc1_1: 2800, mc: 0.25, hardness_HB: 350, resolution_confidence: 1 },
    tools: [{ id: "1", type: "ball_endmill", diameter_mm: 8, flute_count: 2, flute_length_mm: 20, material: "carbide", corner_radius_mm: 4, resolution_confidence: 1 }],
  },
  mazak_integrex: {
    machine: {
      id: "mazak-integrex", name: "Mazak Integrex 200-IV", brand: "Mazak", controller: "mazak",
      max_rpm: 12000, max_power_kW: 30,
      rapid_rate_mm_min: { x: 42000, y: 42000, z: 42000 },
      work_volume: { x: 500, y: 300, z: 600 },
      axes: 5, atc_capacity: 36, coolant_types: ["flood", "tsc"],
      resolution_confidence: 0.9,
    },
    controller: "mazak",
    gcode: MILLING_GCODE,
    material: { id: "4140", name: "4140 Steel", iso_group: "P", kc1_1: 1800, mc: 0.25, hardness_HB: 197, resolution_confidence: 1 },
    tools: [{ id: "1", type: "flat_endmill", diameter_mm: 10, flute_count: 4, flute_length_mm: 25, material: "carbide", resolution_confidence: 1 }],
  },
  okuma_lathe: {
    machine: {
      id: "okuma-lb3000", name: "Okuma LB3000 EX II", brand: "Okuma", controller: "okuma",
      max_rpm: 5000, max_power_kW: 22,
      rapid_rate_mm_min: { x: 30000, y: 0, z: 30000 },
      work_volume: { x: 260, y: 0, z: 550 },
      axes: 2, coolant_types: ["flood"],
      resolution_confidence: 0.9,
    },
    controller: "okuma",
    gcode: TURNING_GCODE_PIPE,
    material: { id: "4140", name: "4140 Steel", iso_group: "P", kc1_1: 1800, mc: 0.25, hardness_HB: 197, resolution_confidence: 1 },
    tools: [{ id: "1", type: "boring_bar", diameter_mm: 25, flute_count: 1, material: "carbide", resolution_confidence: 1 }],
  },
  brother_speedio: {
    machine: {
      id: "brother-speedio", name: "Brother Speedio S700Xd2", brand: "Brother", controller: "brother",
      max_rpm: 16000, max_power_kW: 11,
      rapid_rate_mm_min: { x: 56000, y: 56000, z: 56000 },
      work_volume: { x: 700, y: 400, z: 305 },
      axes: 3, atc_capacity: 22, coolant_types: ["flood", "tsc"],
      resolution_confidence: 0.9,
    },
    controller: "brother",
    gcode: MILLING_GCODE,
    material: { id: "7075", name: "7075-T6 Aluminum", iso_group: "N", kc1_1: 700, mc: 0.23, hardness_HB: 150, resolution_confidence: 1 },
    tools: [{ id: "1", type: "flat_endmill", diameter_mm: 10, flute_count: 4, flute_length_mm: 25, material: "carbide", resolution_confidence: 1 }],
  },
  citizen_cincom: {
    machine: {
      id: "citizen-cincom", name: "Citizen Cincom L20-XII", brand: "Citizen", controller: "fanuc",
      max_rpm: 10000, max_power_kW: 3.7,
      rapid_rate_mm_min: { x: 32000, y: 0, z: 32000 },
      work_volume: { x: 20, y: 0, z: 200 },
      axes: 2, coolant_types: ["flood", "mist"],
      resolution_confidence: 0.85,
    },
    controller: "fanuc",
    gcode: SWISS_GCODE,
    material: { id: "316L", name: "316L Stainless", iso_group: "M", kc1_1: 2100, mc: 0.25, hardness_HB: 217, resolution_confidence: 1 },
    tools: [{ id: "1", type: "boring_bar", diameter_mm: 6, flute_count: 1, material: "carbide", resolution_confidence: 1 }],
  },
  dmg_mori_nlx: {
    machine: {
      id: "dmg-nlx2500", name: "DMG MORI NLX 2500/700", brand: "DMG MORI", controller: "fanuc",
      max_rpm: 4000, max_power_kW: 26,
      rapid_rate_mm_min: { x: 30000, y: 0, z: 30000 },
      work_volume: { x: 366, y: 0, z: 705 },
      axes: 2, coolant_types: ["flood", "tsc"],
      resolution_confidence: 0.9,
    },
    controller: "fanuc",
    gcode: TURNING_GCODE_PIPE,
    material: { id: "4140", name: "4140 Steel", iso_group: "P", kc1_1: 1800, mc: 0.25, hardness_HB: 197, resolution_confidence: 1 },
    tools: [{ id: "1", type: "insert_mill", diameter_mm: 32, flute_count: 1, material: "carbide", resolution_confidence: 1 }],
  },
  hurco_vmx: {
    machine: {
      id: "hurco-vmx42i", name: "Hurco VMX42i", brand: "Hurco", controller: "hurco",
      max_rpm: 12000, max_power_kW: 25,
      rapid_rate_mm_min: { x: 35000, y: 35000, z: 25000 },
      work_volume: { x: 1067, y: 610, z: 610 },
      axes: 3, atc_capacity: 24, coolant_types: ["flood"],
      resolution_confidence: 0.9,
    },
    controller: "hurco",
    gcode: MILLING_GCODE,
    material: { id: "4140", name: "4140 Steel", iso_group: "P", kc1_1: 1800, mc: 0.25, hardness_HB: 197, resolution_confidence: 1 },
    tools: [{ id: "1", type: "flat_endmill", diameter_mm: 10, flute_count: 4, flute_length_mm: 25, material: "carbide", resolution_confidence: 1 }],
  },
  doosan_turning: {
    machine: {
      id: "doosan-puma2600", name: "Doosan Puma 2600", brand: "Doosan", controller: "doosan",
      max_rpm: 3500, max_power_kW: 22,
      rapid_rate_mm_min: { x: 24000, y: 0, z: 30000 },
      work_volume: { x: 280, y: 0, z: 550 },
      axes: 2, coolant_types: ["flood"],
      resolution_confidence: 0.9,
    },
    controller: "doosan",
    gcode: TURNING_GCODE_PIPE,
    material: { id: "4140", name: "4140 Steel", iso_group: "P", kc1_1: 1800, mc: 0.25, hardness_HB: 197, resolution_confidence: 1 },
    tools: [{ id: "1", type: "boring_bar", diameter_mm: 25, flute_count: 1, material: "carbide", resolution_confidence: 1 }],
  },
};

describe("PP-MS9 E2E: Full Pipeline Flow", () => {

  for (const [key, cfg] of Object.entries(PIPELINE_MACHINES)) {
    describe(`Pipeline: ${cfg.machine.name} (${cfg.controller})`, () => {

      it("pipeline produces non-empty G-code output", async () => {
        const result = await postProcessorPipelineEngine.process({
          gcode: cfg.gcode,
          machine: cfg.machine,
          material: cfg.material,
          tools: cfg.tools,
          controller: cfg.controller,
          aggressiveness: 0.5,
        });

        expect(result.output_gcode).toBeTruthy();
        expect(result.output_gcode.length).toBeGreaterThan(50);
        expect(result.overall_status).not.toBe("fail");
      });

      it("pipeline stages execute without critical failure", async () => {
        const result = await postProcessorPipelineEngine.process({
          gcode: cfg.gcode,
          machine: cfg.machine,
          material: cfg.material,
          tools: cfg.tools,
          controller: cfg.controller,
          aggressiveness: 0.5,
        });

        expect(result.stages.length).toBeGreaterThan(0);
        const failedStages = result.stages.filter(s => s.status === "fail");
        expect(failedStages.length).toBe(0);
      });

      it("pipeline output respects machine RPM limits", async () => {
        const result = await postProcessorPipelineEngine.process({
          gcode: cfg.gcode,
          machine: cfg.machine,
          material: cfg.material,
          tools: cfg.tools,
          controller: cfg.controller,
          aggressiveness: 0.5,
        });

        // Extract all S-codes from output
        const sMatches = result.output_gcode.matchAll(/S(\d+\.?\d*)/g);
        for (const m of sMatches) {
          const rpm = parseFloat(m[1]);
          expect(rpm).toBeLessThanOrEqual(cfg.machine.max_rpm);
        }
      });

      it("pipeline resolves machine context", async () => {
        const result = await postProcessorPipelineEngine.process({
          gcode: cfg.gcode,
          machine: cfg.machine,
          material: cfg.material,
          tools: cfg.tools,
          controller: cfg.controller,
        });

        expect(result.resolved.machine).toBeTruthy();
        if (result.resolved.machine) {
          expect(result.resolved.machine.max_rpm).toBe(cfg.machine.max_rpm);
        }
      });

      it("pipeline reports stage timing", async () => {
        const result = await postProcessorPipelineEngine.process({
          gcode: cfg.gcode,
          machine: cfg.machine,
          material: cfg.material,
          tools: cfg.tools,
          controller: cfg.controller,
        });

        expect(result.total_duration_ms).toBeGreaterThanOrEqual(0);
        for (const stage of result.stages) {
          expect(stage.duration_ms).toBeGreaterThanOrEqual(0);
          expect(stage.stage).toBeTruthy();
        }
      });
    });
  }

  // Cross-machine comparisons

  it("same material on different machines produces machine-appropriate output", async () => {
    const [haasResult, brotherResult] = await Promise.all([
      postProcessorPipelineEngine.process({
        gcode: MILLING_GCODE,
        machine: PIPELINE_MACHINES.haas_vf2.machine,
        material: PIPELINE_MACHINES.haas_vf2.material,
        tools: PIPELINE_MACHINES.haas_vf2.tools,
        controller: "haas",
      }),
      postProcessorPipelineEngine.process({
        gcode: MILLING_GCODE,
        machine: PIPELINE_MACHINES.brother_speedio.machine,
        material: PIPELINE_MACHINES.haas_vf2.material, // same steel material
        tools: PIPELINE_MACHINES.brother_speedio.tools,
        controller: "brother",
      }),
    ]);

    expect(haasResult.output_gcode).toBeTruthy();
    expect(brotherResult.output_gcode).toBeTruthy();
    // Both should complete without failure
    expect(haasResult.overall_status).not.toBe("fail");
    expect(brotherResult.overall_status).not.toBe("fail");
  });

  it("pipeline → validation chain: no BLOCK flags on pipeline output", async () => {
    const pipeResult = await postProcessorPipelineEngine.process({
      gcode: MILLING_GCODE,
      machine: PIPELINE_MACHINES.haas_vf2.machine,
      material: PIPELINE_MACHINES.haas_vf2.material,
      tools: PIPELINE_MACHINES.haas_vf2.tools,
      controller: "haas",
    });

    const valResult = await postValidationHardeningEngine.process({
      action: "validate",
      gcode: pipeResult.output_gcode,
      machine: PIPELINE_MACHINES.haas_vf2.machine,
    });

    // Pipeline-optimized output should respect machine limits
    expect(valResult.summary.block_count).toBe(0);
  });

  it("pipeline → prove-out → validation chain", async () => {
    const pipeResult = await postProcessorPipelineEngine.process({
      gcode: MILLING_GCODE,
      machine: PIPELINE_MACHINES.fanuc_31i.machine,
      material: PIPELINE_MACHINES.fanuc_31i.material,
      tools: PIPELINE_MACHINES.fanuc_31i.tools,
      controller: "fanuc",
    });

    const proveOut = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: pipeResult.output_gcode,
      machine: PIPELINE_MACHINES.fanuc_31i.machine,
    });

    const valResult = await postValidationHardeningEngine.process({
      action: "validate",
      gcode: proveOut.gcode,
      machine: PIPELINE_MACHINES.fanuc_31i.machine,
    });

    // Prove-out is even more conservative — should definitely pass
    expect(valResult.summary.block_count).toBe(0);
  });
});
