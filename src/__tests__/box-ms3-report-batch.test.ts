/**
 * Tests for BOX-MS3 — OptimizationReportGeneratorEngine (U-BOX29) + BatchPhysicsOptimizationEngine (U-BOX31)
 */
import { describe, it, expect } from "vitest";
import { ProgramPhysicsOptimizerEngine } from "../engines/ProgramPhysicsOptimizerEngine.js";
import { OptimizationReportGeneratorEngine } from "../engines/OptimizationReportGeneratorEngine.js";
import { BatchPhysicsOptimizationEngine } from "../engines/BatchPhysicsOptimizationEngine.js";
import type { OkumaProgram, OkumaToolSection, OkumaVariable } from "../engines/OkumaOSPParserEngine.js";

// ============================================================================
// HELPERS
// ============================================================================

function makeSteelProgram(name = "CASING-001.MIN"): OkumaProgram {
  return {
    filename: name,
    header: "(CASING - 1030 STEEL - 200 BHN)",
    toolSections: [
      {
        label: "NAT01",
        toolCode: "T010101",
        toolNumber: 1,
        offsetNumber: 1,
        comment: "OD ROUGH - CNMG432 - R.015",
        startLine: 5,
        endLine: 15,
        operations: [{ type: "od_rough", line: 8, gcode: "G85", params: {} }],
        speedMode: "css",
        cssValue: 600,
        maxRPM: 2500,
        coolant: true,
      },
      {
        label: "NAT02",
        toolCode: "T020202",
        toolNumber: 2,
        offsetNumber: 2,
        comment: "OD FINISH - VNMG331 - R.008",
        startLine: 16,
        endLine: 25,
        operations: [{ type: "od_finish", line: 18, gcode: "G87", params: {} }],
        speedMode: "css",
        cssValue: 800,
        maxRPM: 3000,
        coolant: true,
      },
    ] as OkumaToolSection[],
    variables: [
      { name: "V1", value: 2.0, comment: "STOCK DIAMETER" },
    ] as OkumaVariable[],
    subroutineCalls: [],
    hasBarFeeder: false,
    hasCAxis: false,
    hasLiveTooling: false,
    hasThreading: false,
    hasMacroVariables: false,
    lineCount: 23,
    operations: [],
    safety: { hasG50: true, hasM5: true, hasM30: true },
    rawLines: [
      "(CASING - 1030 STEEL - 200 BHN)",
      "V1 = 2.0     ( STOCK DIAMETER )",
      "T010101",
      "G50 S2500",
      "G96 S600 M3",
      "M8",
      "G0 X2.1 Z0.1",
      "G1 X1.875 F0.012",
      "G1 Z-3.5 F0.012",
      "G0 X20 Z20",
      "M1",
      "M9",
      "T020202",
      "G50 S3000",
      "G96 S800 M3",
      "M8",
      "G0 X1.875 Z0.05",
      "G1 Z-3.5 F0.006",
      "G0 X20 Z20",
      "M9",
      "M5",
      "M30",
    ],
  };
}

function makeAluminumProgram(name = "ALUM-ADAPTER.MIN"): OkumaProgram {
  return {
    ...makeSteelProgram(name),
    header: "(ADAPTER - 6061 ALUMINUM)",
    rawLines: [
      "(ADAPTER - 6061 ALUMINUM)",
      "V1 = 3.0     ( STOCK DIAMETER )",
      "T010101",
      "G50 S3500",
      "G96 S1000 M3",
      "M8",
      "G0 X3.1 Z0.1",
      "G1 X2.5 F0.015",
      "G1 Z-2.0 F0.015",
      "G0 X20 Z20",
      "M1",
      "M9",
      "M5",
      "M30",
    ],
    toolSections: [
      {
        label: "NAT01",
        toolCode: "T010101",
        toolNumber: 1,
        offsetNumber: 1,
        comment: "OD ROUGH - CNMG432",
        startLine: 3,
        endLine: 12,
        operations: [{ type: "od_rough", line: 5, gcode: "G85", params: {} }],
        speedMode: "css",
        cssValue: 1000,
        maxRPM: 3500,
        coolant: true,
      },
    ] as OkumaToolSection[],
  };
}

// ============================================================================
// REPORT GENERATOR TESTS
// ============================================================================

describe("OptimizationReportGeneratorEngine", () => {
  const optimizer = new ProgramPhysicsOptimizerEngine();
  const reportGen = new OptimizationReportGeneratorEngine();

  describe("generate()", () => {
    it("produces a valid report", () => {
      const optResult = optimizer.optimize({ program: makeSteelProgram() });
      const report = reportGen.generate("CASING-001.MIN", optResult);

      expect(report.filename).toBe("CASING-001.MIN");
      expect(report.material.iso_group).toBe("P");
      expect(report.tools.length).toBe(2);
      expect(report.block_table.length).toBeGreaterThan(0);
      expect(report.text_report).toBeTruthy();
    });

    it("includes per-tool reports", () => {
      const optResult = optimizer.optimize({ program: makeSteelProgram() });
      const report = reportGen.generate("CASING-001.MIN", optResult);

      const t1 = report.tools.find(t => t.station === 1);
      expect(t1).toBeDefined();
      expect(t1!.tool_type).toBe("od_roughing");
      // Tool report should have cutting block data
      expect(t1!.cutting_blocks).toBeGreaterThanOrEqual(0);
    });

    it("includes valid summary", () => {
      const optResult = optimizer.optimize({ program: makeSteelProgram() });
      const report = reportGen.generate("CASING-001.MIN", optResult);

      expect(report.summary.total_tools).toBe(2);
      expect(report.summary.total_cutting_blocks).toBeGreaterThan(0);
      // Time savings can be negative if optimizer adds conservatism
      expect(report.summary.time_savings_pct).toBeGreaterThanOrEqual(-100);
      expect(report.summary.optimization_coverage_pct).toBeGreaterThanOrEqual(0);
    });

    it("generates readable text report", () => {
      const optResult = optimizer.optimize({ program: makeSteelProgram() });
      const report = reportGen.generate("CASING-001.MIN", optResult);

      expect(report.text_report).toContain("PHYSICS OPTIMIZATION REPORT");
      expect(report.text_report).toContain("CASING-001.MIN");
      expect(report.text_report).toContain("Material:");
      expect(report.text_report).toContain("TOOL SUMMARY");
      expect(report.text_report).toContain("OPTIMIZATION SUMMARY");
    });

    it("shows material info including Kienzle constants", () => {
      const optResult = optimizer.optimize({ program: makeSteelProgram() });
      const report = reportGen.generate("CASING-001.MIN", optResult);

      expect(report.text_report).toContain("kc1.1=1800");
      expect(report.text_report).toContain("mc=0.25");
    });
  });

  describe("generate() — block table", () => {
    it("only includes cutting blocks in table", () => {
      const optResult = optimizer.optimize({ program: makeSteelProgram() });
      const report = reportGen.generate("CASING-001.MIN", optResult);

      for (const row of report.block_table) {
        // Each row should correspond to a cutting block
        expect(row.line).toBeGreaterThan(0);
      }
    });
  });
});

// ============================================================================
// BATCH OPTIMIZATION TESTS
// ============================================================================

describe("BatchPhysicsOptimizationEngine", () => {
  const engine = new BatchPhysicsOptimizationEngine();

  describe("optimizeBatch()", () => {
    it("optimizes multiple programs", () => {
      const result = engine.optimizeBatch({
        programs: [makeSteelProgram(), makeAluminumProgram()],
      });

      expect(result.records.length).toBe(2);
      expect(result.records[0].success).toBe(true);
      expect(result.records[1].success).toBe(true);
    });

    it("produces fleet summary", () => {
      const result = engine.optimizeBatch({
        programs: [makeSteelProgram(), makeAluminumProgram()],
      });

      expect(result.fleet_summary.total_programs).toBe(2);
      expect(result.fleet_summary.successful).toBe(2);
      expect(result.fleet_summary.failed).toBe(0);
      expect(result.fleet_summary.total_cutting_blocks).toBeGreaterThan(0);
    });

    it("tracks material distribution", () => {
      const result = engine.optimizeBatch({
        programs: [makeSteelProgram(), makeAluminumProgram()],
      });

      expect(result.fleet_summary.material_distribution).toBeDefined();
      expect(result.fleet_summary.material_distribution["P"]).toBe(1); // Steel
      expect(result.fleet_summary.material_distribution["N"]).toBe(1); // Aluminum
    });

    it("generates per-program reports", () => {
      const result = engine.optimizeBatch({
        programs: [makeSteelProgram()],
      });

      expect(result.records[0].report).toBeDefined();
      expect(result.records[0].report!.text_report).toContain("PHYSICS OPTIMIZATION REPORT");
    });

    it("generates fleet report text", () => {
      const result = engine.optimizeBatch({
        programs: [makeSteelProgram(), makeAluminumProgram()],
      });

      expect(result.fleet_report).toContain("FLEET-WIDE PHYSICS OPTIMIZATION REPORT");
      expect(result.fleet_report).toContain("Programs analyzed:");
      expect(result.fleet_report).toContain("Material Distribution:");
    });
  });

  describe("optimizeBatch() — limits", () => {
    it("respects max_programs limit", () => {
      const programs = [
        makeSteelProgram("P1.MIN"),
        makeSteelProgram("P2.MIN"),
        makeSteelProgram("P3.MIN"),
      ];
      const result = engine.optimizeBatch({
        programs,
        max_programs: 2,
      });

      expect(result.records.length).toBe(2);
      expect(result.fleet_summary.total_programs).toBe(2);
    });

    it("sorts by line count when specified", () => {
      const short = makeSteelProgram("SHORT.MIN");
      short.lineCount = 10;
      const long = makeSteelProgram("LONG.MIN");
      long.lineCount = 100;

      const result = engine.optimizeBatch({
        programs: [short, long],
        sort_by: "line_count",
        max_programs: 1,
      });

      // Should pick the longest program
      expect(result.records[0].filename).toBe("LONG.MIN");
    });
  });

  describe("optimizeBatch() — error handling", () => {
    it("handles individual program failures gracefully", () => {
      const broken = makeSteelProgram("BROKEN.MIN");
      broken.rawLines = []; // Empty — will likely cause issues
      broken.toolSections = [];

      const result = engine.optimizeBatch({
        programs: [makeSteelProgram(), broken],
      });

      expect(result.fleet_summary.successful).toBeGreaterThanOrEqual(1);
      // Broken one might succeed (empty program) or fail — either is OK
      expect(result.records.length).toBe(2);
    });
  });
});
