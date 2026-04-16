/**
 * PP-REV-MS0 U-REV03: Optimization Report Engine Tests
 *
 * Tests the complete optimization report generation:
 * - Pipeline runs and produces real physics data
 * - Report contains all required sections (summary, per-tool, diff, recommendations)
 * - All 3 formats (markdown, JSON, HTML) are non-empty and valid
 * - Edge cases: empty program, no material, no machine
 */

import { describe, it, expect } from "vitest";
import { optimizationReportEngine, type OptimizationReportInput } from "../engines/OptimizationReportEngine.js";
import type { MachineContext, MaterialContext, ToolContext } from "../engines/PostProcessorPipelineEngine.js";

// ═══ Fixtures ═══

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
  flute_length_mm: 25, material: "carbide", corner_radius_mm: 0.5,
  resolution_confidence: 1,
};

const SAMPLE_GCODE = `O1001
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
G0 Z50.
M9
M5
M30`;

const BASE_INPUT: OptimizationReportInput = {
  gcode: SAMPLE_GCODE,
  machine: HAAS_VF2,
  material: STEEL,
  tools: [TOOL],
  controller: "haas",
  aggressiveness: 0.5,
  program_name: "TEST_PART_001",
};

// ═══ Tests ═══

describe("PP-REV-MS0: OptimizationReportEngine", () => {

  describe("Report Generation", () => {

    it("generates a complete report with all sections", async () => {
      const report = await optimizationReportEngine.generate(BASE_INPUT);

      expect(report.summary).toBeTruthy();
      expect(report.per_tool).toBeTruthy();
      expect(report.diff).toBeTruthy();
      expect(report.comparison).toBeTruthy();
      expect(report.recommendations).toBeTruthy();
      expect(report.report_markdown).toBeTruthy();
      expect(report.report_json).toBeTruthy();
      expect(report.report_html).toBeTruthy();
    });

    it("summary has correct machine and material info", async () => {
      const report = await optimizationReportEngine.generate(BASE_INPUT);

      expect(report.summary.program_name).toBe("TEST_PART_001");
      expect(report.summary.machine_name).toContain("Haas");
      expect(report.summary.controller).toBe("haas");
      expect(report.summary.total_blocks).toBeGreaterThan(0);
    });

    it("summary shows blocks were optimized", async () => {
      const report = await optimizationReportEngine.generate(BASE_INPUT);

      expect(report.summary.blocks_optimized).toBeGreaterThan(0);
      expect(report.summary.optimization_pct).toBeGreaterThan(0);
    });

    it("summary has positive force data", async () => {
      const report = await optimizationReportEngine.generate(BASE_INPUT);

      expect(report.summary.max_force_N).toBeGreaterThan(0);
      expect(report.summary.avg_force_N).toBeGreaterThan(0);
      expect(report.summary.max_power_kW).toBeGreaterThan(0);
    });

    it("summary has valid cycle time data", async () => {
      const report = await optimizationReportEngine.generate(BASE_INPUT);

      expect(report.summary.cycle_time_original_sec).toBeGreaterThan(0);
      expect(report.summary.cycle_time_optimized_sec).toBeGreaterThan(0);
      // Cycle time saved can be negative if optimization adds safety
      expect(typeof report.summary.cycle_time_saved_pct).toBe("number");
      expect(Number.isNaN(report.summary.cycle_time_saved_pct)).toBe(false);
    });

    it("pipeline executes in reasonable time", async () => {
      const start = performance.now();
      await optimizationReportEngine.generate(BASE_INPUT);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(5000); // < 5 seconds
    });
  });

  describe("Per-Tool Breakdown", () => {

    it("has at least one tool report", async () => {
      const report = await optimizationReportEngine.generate(BASE_INPUT);

      expect(report.per_tool.length).toBeGreaterThan(0);
    });

    it("tool report has valid RPM and feed ranges", async () => {
      const report = await optimizationReportEngine.generate(BASE_INPUT);
      const t1 = report.per_tool[0];

      expect(t1.tool_number).toBeGreaterThan(0);
      expect(t1.blocks_optimized).toBeGreaterThan(0);
      expect(t1.optimized_rpm_range[1]).toBeGreaterThan(0);
      expect(t1.optimized_feed_range[1]).toBeGreaterThan(0);
    });

    it("tool report has force and power data", async () => {
      const report = await optimizationReportEngine.generate(BASE_INPUT);
      const t1 = report.per_tool[0];

      expect(t1.max_force_N).toBeGreaterThan(0);
      expect(t1.max_power_kW).toBeGreaterThan(0);
    });

    it("tool report has optimization reasons", async () => {
      const report = await optimizationReportEngine.generate(BASE_INPUT);
      const t1 = report.per_tool[0];

      expect(t1.optimization_reasons.length).toBeGreaterThan(0);
    });
  });

  describe("Output Formats", () => {

    it("markdown contains report header and tables", async () => {
      const report = await optimizationReportEngine.generate(BASE_INPUT);

      expect(report.report_markdown).toContain("# PRISM Optimization Report");
      expect(report.report_markdown).toContain("Executive Summary");
      expect(report.report_markdown).toContain("Per-Tool Breakdown");
      expect(report.report_markdown).toContain("Recommendations");
      expect(report.report_markdown).toContain("Haas");
    });

    it("JSON is valid parseable JSON", async () => {
      const report = await optimizationReportEngine.generate(BASE_INPUT);

      const parsed = JSON.parse(report.report_json);
      expect(parsed.summary).toBeTruthy();
      expect(parsed.per_tool).toBeTruthy();
      expect(parsed.recommendations).toBeTruthy();
    });

    it("HTML is valid self-contained page", async () => {
      const report = await optimizationReportEngine.generate(BASE_INPUT);

      expect(report.report_html).toContain("<!DOCTYPE html>");
      expect(report.report_html).toContain("PRISM Optimization Report");
      expect(report.report_html).toContain("Cycle Time Saved");
      expect(report.report_html).toContain("</html>");
      // Should have inline CSS (no external deps)
      expect(report.report_html).toContain("<style>");
    });
  });

  describe("Recommendations", () => {

    it("generates at least one recommendation", async () => {
      const report = await optimizationReportEngine.generate(BASE_INPUT);

      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it("recommendations appear in markdown", async () => {
      const report = await optimizationReportEngine.generate(BASE_INPUT);

      for (const rec of report.recommendations.slice(0, 3)) {
        expect(report.report_markdown).toContain(rec.substring(0, 20));
      }
    });
  });

  describe("Edge Cases", () => {

    it("handles minimal G-code", async () => {
      const report = await optimizationReportEngine.generate({
        gcode: "G0 X0\nG1 X50 F500\nM30",
        controller: "fanuc",
        program_name: "MINIMAL",
      });

      expect(report.summary).toBeTruthy();
      expect(report.report_markdown).toContain("PRISM Optimization Report");
    });

    it("handles missing material gracefully", async () => {
      const report = await optimizationReportEngine.generate({
        gcode: SAMPLE_GCODE,
        machine: HAAS_VF2,
        controller: "haas",
        program_name: "NO_MATERIAL",
      });

      expect(report.summary).toBeTruthy();
      expect(report.summary.total_blocks).toBeGreaterThan(0);
    });

    it("handles missing machine gracefully", async () => {
      const report = await optimizationReportEngine.generate({
        gcode: SAMPLE_GCODE,
        material: STEEL,
        controller: "fanuc",
        program_name: "NO_MACHINE",
      });

      expect(report.summary).toBeTruthy();
    });
  });

  describe("Setup Sheet Integration", () => {

    it("includes setup sheet in report", async () => {
      const report = await optimizationReportEngine.generate(BASE_INPUT);

      expect(report.setup_sheet).toBeTruthy();
      expect(report.setup_sheet!.setup_sheet.tools.length).toBeGreaterThan(0);
    });

    it("setup sheet appears in markdown", async () => {
      const report = await optimizationReportEngine.generate(BASE_INPUT);

      expect(report.report_markdown).toContain("Setup Sheet");
      expect(report.report_markdown).toContain("Tool List");
    });

    it("setup sheet appears in HTML", async () => {
      const report = await optimizationReportEngine.generate(BASE_INPUT);

      expect(report.report_html).toContain("Setup Sheet");
    });

    it("setup sheet has controller info", async () => {
      const report = await optimizationReportEngine.generate(BASE_INPUT);

      expect(report.setup_sheet!.setup_sheet.controller).toBe("haas");
    });

    it("setup sheet JSON includes setup_sheet field", async () => {
      const report = await optimizationReportEngine.generate(BASE_INPUT);

      const parsed = JSON.parse(report.report_json);
      expect(parsed.setup_sheet).toBeTruthy();
      expect(parsed.setup_sheet.setup_sheet.tools).toBeTruthy();
    });
  });

  describe("Diff and Comparison", () => {

    it("diff shows line counts", async () => {
      const report = await optimizationReportEngine.generate(BASE_INPUT);

      expect(report.diff.total_lines_original).toBeGreaterThan(0);
      expect(report.diff.total_lines_optimized).toBeGreaterThan(0);
    });

    it("comparison has cycle time metrics", async () => {
      const report = await optimizationReportEngine.generate(BASE_INPUT);

      expect(report.comparison.cycle_time_original_sec).toBeGreaterThan(0);
      expect(report.comparison.cycle_time_optimized_sec).toBeGreaterThan(0);
    });
  });
});
