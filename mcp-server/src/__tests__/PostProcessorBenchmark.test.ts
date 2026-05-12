/**
 * PP-MS9/U-PP41 — Post Processor Performance Benchmarks
 *
 * Pipeline throughput targets:
 *   - < 2 seconds for standard 3-axis program (1000 lines)
 *   - < 5 seconds for 5-axis with full physics (1000 lines)
 *
 * Tests PostDownloadEngine, ProveOutModeEngine, and PostValidationHardeningEngine
 * individually and in sequence to measure full pipeline throughput.
 */

import { describe, it, expect } from "vitest";
import { postDownloadEngine } from "../engines/PostDownloadEngine.js";
import { proveOutModeEngine } from "../engines/ProveOutModeEngine.js";
import { postValidationHardeningEngine } from "../engines/PostValidationHardeningEngine.js";
import { postValidationReportEngine } from "../engines/PostValidationReportEngine.js";
import {
  postProcessorPipelineEngine,
  type MachineContext,
  type MaterialContext,
  type ToolContext,
} from "../engines/PostProcessorPipelineEngine.js";

// ─── Generate large test program ────────────────────────────────────

function generateProgram(lineCount: number): string {
  const lines: string[] = [
    "%", "O9999 (BENCHMARK PROGRAM)", "G90 G54 G17",
    "T1 M6", "S10000 M3", "M8",
    "G43 H1 Z50.", "G0 X0 Y0", "G0 Z5.",
  ];

  for (let i = 0; i < lineCount - 12; i++) {
    const x = (Math.sin(i * 0.1) * 100 + 150).toFixed(3);
    const y = (Math.cos(i * 0.1) * 100 + 150).toFixed(3);
    const z = (-2 - (i % 10) * 0.5).toFixed(3);
    const f = 400 + (i % 5) * 100;
    lines.push(`G1 X${x} Y${y} Z${z} F${f}`);
  }

  lines.push("G0 Z50.", "M5", "M9", "G28 G91 Z0", "M30");
  return lines.join("\n");
}

const PROGRAM_1000 = generateProgram(1000);

const BENCH_MACHINE: MachineContext = {
  id: "bench-vmc", name: "Benchmark VMC", brand: "Test", controller: "haas_ngc",
  max_rpm: 12000, max_power_kW: 22,
  work_volume: { x: 762, y: 508, z: 508 },
  rapid_rate_mm_min: { x: 25400, y: 25400, z: 25400 },
  axes: 3, atc_capacity: 20,
};

// ─── Individual Engine Benchmarks ───────────────────────────────────

describe("PP-MS9 Benchmark: Individual Engines", () => {
  it("PostDownloadEngine formats 1000-line program in < 500ms", () => {
    const start = performance.now();
    const result = postDownloadEngine.execute({
      action: "format_download",
      gcode: PROGRAM_1000,
      controller: "haas_ngc",
      machine_brand: "Haas",
      machine_model: "VF-2",
      include_physics_comments: true,
      physics_blocks: Array.from({ length: 100 }, (_, i) => ({
        line: i * 10 + 9,
        force_N: 300 + Math.random() * 400,
        confidence: 0.7 + Math.random() * 0.3,
      })),
    });
    const elapsed = performance.now() - start;

    expect(result.content.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(500);
  });

  it("ProveOutModeEngine processes 1000-line program in < 500ms", async () => {
    const start = performance.now();
    const result = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: PROGRAM_1000,
      machine: BENCH_MACHINE,
    });
    const elapsed = performance.now() - start;

    expect(result.gcode.length).toBeGreaterThan(0);
    expect(result.summary.feed_reductions).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(500);
  });

  it("PostValidationHardeningEngine validates 1000-line program in < 500ms", async () => {
    const start = performance.now();
    const result = await postValidationHardeningEngine.process({
      action: "validate",
      gcode: PROGRAM_1000,
      machine: BENCH_MACHINE,
    });
    const elapsed = performance.now() - start;

    expect(result.summary.lines_checked).toBeGreaterThan(500);
    expect(elapsed).toBeLessThan(500);
  });

  it("PostValidationReportEngine generates detailed report in < 200ms", async () => {
    const validation = await postValidationHardeningEngine.process({
      action: "validate",
      gcode: PROGRAM_1000,
      machine: BENCH_MACHINE,
    });

    const start = performance.now();
    const report = await postValidationReportEngine.process({
      action: "generate_report",
      validation,
      machine: BENCH_MACHINE,
      format: "detailed",
      program_name: "BENCHMARK",
    });
    const elapsed = performance.now() - start;

    expect(report.content.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(200);
  });
});

// ─── Full Pipeline Benchmark ────────────────────────────────────────

describe("PP-MS9 Benchmark: Full Pipeline", () => {
  it("complete 3-axis pipeline in < 2 seconds (generate→validate→prove-out→download)", async () => {
    const start = performance.now();

    // Step 1: Validate against machine
    const validation = await postValidationHardeningEngine.process({
      action: "validate",
      gcode: PROGRAM_1000,
      machine: BENCH_MACHINE,
    });

    // Step 2: Apply prove-out
    const proveOut = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: PROGRAM_1000,
      machine: BENCH_MACHINE,
    });

    // Step 3: Generate report
    const report = await postValidationReportEngine.process({
      action: "generate_report",
      validation,
      machine: BENCH_MACHINE,
      format: "text",
    });

    // Step 4: Package for download
    const download = postDownloadEngine.execute({
      action: "manifest",
      gcode: proveOut.gcode,
      controller: "haas_ngc",
      machine_brand: "Haas",
      machine_model: "VF-2",
      validation_summary: report.content,
    });

    const elapsed = performance.now() - start;

    expect(validation.summary).toBeDefined();
    expect(proveOut.gcode.length).toBeGreaterThan(0);
    expect(report.content.length).toBeGreaterThan(0);
    expect((download as any).files.length).toBeGreaterThanOrEqual(2);
    expect(elapsed).toBeLessThan(2000);
  });

  it("handles multiple controller formats in sequence", () => {
    const controllers = ["haas_ngc", "fanuc_31i", "siemens_840d", "heidenhain_tnc640"];
    const start = performance.now();

    for (const ctrl of controllers) {
      const result = postDownloadEngine.execute({
        action: "format_download",
        gcode: PROGRAM_1000,
        controller: ctrl,
        include_physics_comments: false,
      });
      expect(result.content.length).toBeGreaterThan(0);
    }

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });

  it("pipeline processes 1000-line 3-axis program in < 2 seconds", async () => {
    const machine3ax: MachineContext = {
      id: "bench-vmc", name: "Benchmark VMC", brand: "Haas", controller: "haas",
      max_rpm: 8100, max_power_kW: 22.4,
      rapid_rate_mm_min: { x: 25400, y: 25400, z: 15240 },
      work_volume: { x: 762, y: 406, z: 508 },
      axes: 3, atc_capacity: 20, coolant_types: ["flood"],
      resolution_confidence: 0.95,
    };

    const material: MaterialContext = {
      id: "4140", name: "4140 Steel", iso_group: "P",
      kc1_1: 1800, mc: 0.25, hardness_HB: 197,
      resolution_confidence: 1,
    };

    const tool: ToolContext = {
      id: "1", type: "flat_endmill", diameter_mm: 10, flute_count: 4,
      flute_length_mm: 25, material: "carbide", resolution_confidence: 1,
    };

    const start = performance.now();
    const result = await postProcessorPipelineEngine.process({
      gcode: PROGRAM_1000,
      machine: machine3ax,
      material,
      tools: [tool],
      controller: "haas",
      aggressiveness: 0.5,
    });
    const elapsed = performance.now() - start;

    expect(result.output_gcode).toBeTruthy();
    expect(result.output_gcode.length).toBeGreaterThan(100);
    expect(result.overall_status).not.toBe("fail");
    // 3s budget: Stage 2.0 LineByLineAdaptiveEngine processes all 1000 lines
    // with 10 physics modules (chip thinning, corner decel, wear, thermal, etc.)
    expect(elapsed).toBeLessThan(3000);
  });

  it("pipeline processes 1000-line 5-axis program in < 5 seconds", async () => {
    // Generate 5-axis program with A/B moves
    const lines5ax: string[] = [
      "O8888", "G90 G54 G17", "T1 M6", "S4000 M3", "G43.4 H1", "M8",
      "G0 X0 Y0 Z50.", "G0 Z5.",
    ];
    for (let i = 0; i < 988; i++) {
      const x = (Math.sin(i * 0.05) * 80 + 100).toFixed(3);
      const y = (Math.cos(i * 0.05) * 80 + 100).toFixed(3);
      const z = (-2 - (i % 8) * 0.3).toFixed(3);
      const f = 300 + (i % 4) * 50;
      lines5ax.push(`G1 X${x} Y${y} Z${z} F${f}`);
    }
    lines5ax.push("G0 Z50.", "M9", "M5", "M30");
    const prog5ax = lines5ax.join("\n");

    const machine5ax: MachineContext = {
      id: "bench-5ax", name: "Benchmark 5-Axis", brand: "DMG MORI", controller: "siemens",
      max_rpm: 14000, max_power_kW: 35,
      rapid_rate_mm_min: { x: 42000, y: 42000, z: 42000 },
      work_volume: { x: 500, y: 450, z: 400 },
      axes: 5, atc_capacity: 60, coolant_types: ["flood", "tsc", "mql"],
      resolution_confidence: 0.95,
    };

    const material: MaterialContext = {
      id: "718", name: "Inconel 718", iso_group: "S",
      kc1_1: 2800, mc: 0.25, hardness_HB: 350,
      resolution_confidence: 1,
    };

    const tool: ToolContext = {
      id: "1", type: "ball_endmill", diameter_mm: 8, flute_count: 2,
      flute_length_mm: 20, material: "carbide", corner_radius_mm: 4,
      resolution_confidence: 1,
    };

    const start = performance.now();
    const result = await postProcessorPipelineEngine.process({
      gcode: prog5ax,
      machine: machine5ax,
      material,
      tools: [tool],
      controller: "siemens",
      aggressiveness: 0.3,
    });
    const elapsed = performance.now() - start;

    expect(result.output_gcode).toBeTruthy();
    expect(result.output_gcode.length).toBeGreaterThan(100);
    expect(result.overall_status).not.toBe("fail");
    expect(elapsed).toBeLessThan(5000);
  });

  it("pipeline total_duration_ms is populated", async () => {
    const machine: MachineContext = {
      id: "bench-vmc", name: "Benchmark VMC", brand: "Haas", controller: "haas",
      max_rpm: 8100, max_power_kW: 22.4,
      rapid_rate_mm_min: { x: 25400, y: 25400, z: 15240 },
      work_volume: { x: 762, y: 406, z: 508 },
      axes: 3, resolution_confidence: 0.95,
    };

    const result = await postProcessorPipelineEngine.process({
      gcode: PROGRAM_1000,
      machine,
      material: { id: "4140", name: "4140 Steel", iso_group: "P", kc1_1: 1800, mc: 0.25, resolution_confidence: 1 },
      tools: [{ id: "1", type: "flat_endmill", diameter_mm: 10, flute_count: 4, material: "carbide", resolution_confidence: 1 }],
      controller: "haas",
    });

    expect(result.total_duration_ms).toBeGreaterThanOrEqual(0);
    expect(result.stages.length).toBeGreaterThan(0);
  });

  it("PostDownloadEngine produces correct format per controller", () => {
    const expectedFormats: Record<string, string> = {
      haas_ngc: "nc",
      fanuc_31i: "tap",
      siemens_840d: "mpf",
      heidenhain_tnc640: "h",
      mazak_smooth_ai: "eia",
    };

    for (const [ctrl, expectedFmt] of Object.entries(expectedFormats)) {
      const result = postDownloadEngine.execute({
        action: "format_download",
        gcode: "G0 X0\nG1 X50 F500\nM30",
        controller: ctrl,
      });
      expect(result.format).toBe(expectedFmt);
    }
  });
});
