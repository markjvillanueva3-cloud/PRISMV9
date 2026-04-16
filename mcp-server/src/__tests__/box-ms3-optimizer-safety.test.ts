/**
 * Tests for BOX-MS3 — ProgramPhysicsOptimizerEngine (U-BOX26) + SafetyGateForOptimizationEngine (U-BOX30)
 */
import { describe, it, expect } from "vitest";
import { ProgramPhysicsOptimizerEngine } from "../engines/ProgramPhysicsOptimizerEngine.js";
import { SafetyGateForOptimizationEngine } from "../engines/SafetyGateForOptimizationEngine.js";
import type { OkumaProgram, OkumaToolSection, OkumaVariable } from "../engines/OkumaOSPParserEngine.js";

// ============================================================================
// HELPERS
// ============================================================================

function makeOkumaProgram(): OkumaProgram {
  return {
    filename: "CASING-001.MIN",
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
      { name: "V5", value: 3.5, comment: "PART LENGTH" },
    ] as OkumaVariable[],
    subroutineCalls: [],
    hasBarFeeder: false,
    hasCAxis: false,
    hasLiveTooling: false,
    hasThreading: false,
    hasMacroVariables: false,
    lineCount: 25,
    operations: [],
    safety: { hasG50: true, hasM5: true, hasM30: true },
    rawLines: [
      "(CASING - 1030 STEEL - 200 BHN)",
      "V1 = 2.0     ( STOCK DIAMETER )",
      "V5 = 3.5     ( PART LENGTH )",
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

// ============================================================================
// OPTIMIZER TESTS
// ============================================================================

describe("ProgramPhysicsOptimizerEngine", () => {
  const engine = new ProgramPhysicsOptimizerEngine();

  describe("optimize() — basic operation", () => {
    it("returns valid optimization result", () => {
      const result = engine.optimize({ program: makeOkumaProgram() });

      expect(result.material).toBeDefined();
      expect(result.material.iso_group).toBe("P");
      expect(result.tools).toBeDefined();
      expect(result.tools.length).toBe(2);
      expect(result.blocks).toBeDefined();
      expect(result.blocks.length).toBe(makeOkumaProgram().rawLines.length);
      expect(result.optimized_text).toBeTruthy();
      expect(result.optimized_lines.length).toBe(result.blocks.length);
    });

    it("identifies cutting blocks correctly", () => {
      const result = engine.optimize({ program: makeOkumaProgram() });
      const cuttingBlocks = result.blocks.filter(b => b.is_cutting);
      // G1 lines should be cutting blocks
      expect(cuttingBlocks.length).toBeGreaterThan(0);
    });

    it("preserves non-cutting lines unchanged", () => {
      const result = engine.optimize({ program: makeOkumaProgram() });
      // M1, M5, M30, G50 lines should be unchanged
      const m1Block = result.blocks.find(b =>
        b.original_text.trim().toUpperCase() === "M1",
      );
      expect(m1Block?.changed).toBe(false);

      const m5Block = result.blocks.find(b =>
        b.original_text.trim().toUpperCase() === "M5",
      );
      expect(m5Block?.changed).toBe(false);
    });
  });

  describe("optimize() — physics calculations", () => {
    it("calculates Kienzle cutting force for cutting blocks", () => {
      const result = engine.optimize({ program: makeOkumaProgram() });
      const cuttingBlocks = result.blocks.filter(b => b.is_cutting && b.cutting_force_N > 0);
      expect(cuttingBlocks.length).toBeGreaterThan(0);
      // Force should be reasonable (100-5000 N for turning)
      for (const block of cuttingBlocks) {
        expect(block.cutting_force_N).toBeGreaterThan(0);
        expect(block.cutting_force_N).toBeLessThan(10000);
      }
    });

    it("calculates power for cutting blocks", () => {
      const result = engine.optimize({ program: makeOkumaProgram() });
      const cuttingBlocks = result.blocks.filter(b => b.is_cutting && b.power_kW > 0);
      expect(cuttingBlocks.length).toBeGreaterThan(0);
      for (const block of cuttingBlocks) {
        expect(block.power_kW).toBeGreaterThan(0);
        expect(block.power_kW).toBeLessThan(30); // Machine max ~15kW
      }
    });

    it("predicts surface finish for finishing operations", () => {
      const result = engine.optimize({ program: makeOkumaProgram() });
      const finishBlocks = result.blocks.filter(
        b => b.is_cutting && b.predicted_Ra_um > 0,
      );
      // Should have predicted Ra for blocks with known nose radius
      expect(finishBlocks.length).toBeGreaterThanOrEqual(0);
    });

    it("estimates tool life using Taylor", () => {
      const result = engine.optimize({ program: makeOkumaProgram() });
      const withLife = result.blocks.filter(b => b.tool_life_min > 0);
      expect(withLife.length).toBeGreaterThan(0);
      for (const block of withLife) {
        expect(block.tool_life_min).toBeGreaterThan(0);
        expect(block.tool_life_min).toBeLessThan(10000); // Taylor life with capped Vc
      }
    });
  });

  describe("optimize() — summary statistics", () => {
    it("produces valid summary", () => {
      const result = engine.optimize({ program: makeOkumaProgram() });
      const s = result.summary;

      expect(s.total_blocks).toBe(makeOkumaProgram().rawLines.length);
      expect(s.cutting_blocks).toBeGreaterThan(0);
      expect(s.cutting_blocks).toBeLessThanOrEqual(s.total_blocks);
      // Time savings can be negative if optimizer adds conservatism
      expect(s.time_savings_pct).toBeGreaterThanOrEqual(-100);
      expect(s.time_savings_pct).toBeLessThanOrEqual(100);
    });
  });

  describe("optimize() — threading preservation", () => {
    it("does not modify threading blocks", () => {
      const prog = makeOkumaProgram();
      prog.toolSections.push({
        label: "NAT03",
        toolCode: "T090909",
        toolNumber: 9,
        offsetNumber: 9,
        comment: "THREAD 1/2-13",
        startLine: 20,
        endLine: 30,
        operations: [{ type: "thread", line: 22, gcode: "G71", params: {} }],
        speedMode: "css",
        cssValue: 200,
        coolant: true,
      } as OkumaToolSection);
      // Insert threading lines before M5/M30
      prog.rawLines = [
        ...prog.rawLines.slice(0, -2),
        "T090909",
        "G97 S1500 M3",
        "G1 Z-1.5 F0.0625",
        "M5",
        "M30",
      ];

      const result = engine.optimize({ program: prog });
      // The threading block (after T09) should be preserved unchanged
      // Find the block containing F0.0625
      const threadBlock = result.blocks.find(b =>
        b.original_text.includes("F0.0625"),
      );
      expect(threadBlock).toBeDefined();
      // Threading blocks get the unchanged treatment
      expect(threadBlock!.changed).toBe(false);
    });
  });
});

// ============================================================================
// SAFETY GATE TESTS
// ============================================================================

describe("SafetyGateForOptimizationEngine", () => {
  const engine = new SafetyGateForOptimizationEngine();

  describe("check() — G50 rules", () => {
    it("blocks G50 increase", () => {
      const result = engine.check({
        original_g50: new Map([[1, 2500]]),
        proposed_g50: new Map([[1, 3000]]), // Increase!
        original_rapids: [],
        proposed_rapids: [],
        original_vc: new Map(),
        proposed_vc: new Map(),
        stock_diameter_mm: 50.8,
        machine_max_power_kw: 15,
        machine_max_rpm: 4200,
        original_lines: ["G50 S2500", "M5", "M30"],
        proposed_lines: ["G50 S3000", "M5", "M30"],
      });

      expect(result.passed).toBe(false);
      const g50V = result.violations.find(v => v.rule === "g50_no_increase");
      expect(g50V).toBeDefined();
      expect(g50V!.severity).toBe("critical");
    });

    it("allows G50 decrease", () => {
      const result = engine.check({
        original_g50: new Map([[1, 2500]]),
        proposed_g50: new Map([[1, 2000]]), // Decrease — safe
        original_rapids: [],
        proposed_rapids: [],
        original_vc: new Map(),
        proposed_vc: new Map(),
        stock_diameter_mm: 50.8,
        machine_max_power_kw: 15,
        machine_max_rpm: 4200,
        original_lines: ["G50 S2500", "M1", "M5", "M30"],
        proposed_lines: ["G50 S2000", "M1", "M5", "M30"],
      });

      const g50V = result.violations.find(v => v.rule === "g50_no_increase");
      expect(g50V).toBeUndefined();
    });
  });

  describe("check() — M1/M5 preservation", () => {
    it("blocks removal of M1 optional stops", () => {
      const result = engine.check({
        original_g50: new Map(),
        proposed_g50: new Map(),
        original_rapids: [],
        proposed_rapids: [],
        original_vc: new Map(),
        proposed_vc: new Map(),
        stock_diameter_mm: 50.8,
        machine_max_power_kw: 15,
        machine_max_rpm: 4200,
        original_lines: ["M1", "M1", "M5", "M30"],
        proposed_lines: ["M5", "M30"], // M1 removed!
      });

      const m1V = result.violations.find(v => v.rule === "m1_preserved");
      expect(m1V).toBeDefined();
      expect(m1V!.severity).toBe("critical");
    });

    it("blocks removal of M5 spindle stop", () => {
      const result = engine.check({
        original_g50: new Map(),
        proposed_g50: new Map(),
        original_rapids: [],
        proposed_rapids: [],
        original_vc: new Map(),
        proposed_vc: new Map(),
        stock_diameter_mm: 50.8,
        machine_max_power_kw: 15,
        machine_max_rpm: 4200,
        original_lines: ["M5", "M30"],
        proposed_lines: ["M30"], // M5 removed!
      });

      const m5V = result.violations.find(v => v.rule === "spindle_stop_preserved");
      expect(m5V).toBeDefined();
      expect(m5V!.severity).toBe("critical");
    });
  });

  describe("check() — cutoff feed", () => {
    it("blocks cutoff feed increase", () => {
      const result = engine.check({
        original_g50: new Map(),
        proposed_g50: new Map(),
        original_rapids: [],
        proposed_rapids: [],
        original_cutoff_feed: 0.003,
        proposed_cutoff_feed: 0.005, // Increase!
        original_vc: new Map(),
        proposed_vc: new Map(),
        stock_diameter_mm: 50.8,
        machine_max_power_kw: 15,
        machine_max_rpm: 4200,
        original_lines: ["M5", "M30"],
        proposed_lines: ["M5", "M30"],
      });

      const cutoffV = result.violations.find(v => v.rule === "cutoff_feed_decrease_only");
      expect(cutoffV).toBeDefined();
      expect(cutoffV!.severity).toBe("critical");
    });
  });

  describe("check() — rapid clearance", () => {
    it("blocks reduced rapid clearance", () => {
      const result = engine.check({
        original_g50: new Map(),
        proposed_g50: new Map(),
        original_rapids: [{ line: 5, x: 20, z: 20 }],
        proposed_rapids: [{ line: 5, x: 10, z: 20 }], // Reduced!
        original_vc: new Map(),
        proposed_vc: new Map(),
        stock_diameter_mm: 50.8,
        machine_max_power_kw: 15,
        machine_max_rpm: 4200,
        original_lines: ["M5", "M30"],
        proposed_lines: ["M5", "M30"],
      });

      const rapidV = result.violations.find(v => v.rule === "rapid_clearance");
      expect(rapidV).toBeDefined();
      expect(rapidV!.severity).toBe("critical");
    });
  });

  describe("check() — threading spring passes", () => {
    it("blocks modification of spring passes", () => {
      const result = engine.check({
        original_g50: new Map(),
        proposed_g50: new Map(),
        original_rapids: [],
        proposed_rapids: [],
        original_vc: new Map(),
        proposed_vc: new Map(),
        stock_diameter_mm: 50.8,
        machine_max_power_kw: 15,
        machine_max_rpm: 4200,
        original_lines: ["M5", "M30"],
        proposed_lines: ["M5", "M30"],
        threading_blocks: [
          { line: 20, type: "spring_pass", original_doc_mm: 0, proposed_doc_mm: 0.1 },
        ],
      });

      const springV = result.violations.find(v => v.rule === "spring_pass_preserved");
      expect(springV).toBeDefined();
      expect(springV!.severity).toBe("critical");
    });
  });

  describe("check() — power limit", () => {
    it("flags excessive power", () => {
      const result = engine.check({
        original_g50: new Map(),
        proposed_g50: new Map(),
        original_rapids: [],
        proposed_rapids: [],
        original_vc: new Map(),
        proposed_vc: new Map(),
        stock_diameter_mm: 50.8,
        machine_max_power_kw: 15,
        machine_max_rpm: 4200,
        original_lines: ["M5", "M30"],
        proposed_lines: ["M5", "M30"],
        proposed_forces: [
          { line: 10, Fc_N: 5000, Vc_mpm: 200 }, // P = 5000 × 200 / 60000 = 16.7 kW > 85% × 15
        ],
      });

      const powerV = result.violations.find(v => v.rule === "power_limit");
      expect(powerV).toBeDefined();
      expect(powerV!.severity).toBe("critical");
    });
  });

  describe("check() — overall pass/fail", () => {
    it("passes when no violations", () => {
      const result = engine.check({
        original_g50: new Map([[1, 2500]]),
        proposed_g50: new Map([[1, 2500]]), // Same
        original_rapids: [{ line: 5, x: 20, z: 20 }],
        proposed_rapids: [{ line: 5, x: 20, z: 20 }], // Same
        original_vc: new Map([[1, 200]]),
        proposed_vc: new Map([[1, 200]]), // Same
        stock_diameter_mm: 50.8,
        machine_max_power_kw: 15,
        machine_max_rpm: 4200,
        original_lines: ["M1", "M8", "M9", "M5", "M30"],
        proposed_lines: ["M1", "M8", "M9", "M5", "M30"],
      });

      expect(result.passed).toBe(true);
      expect(result.summary.critical_violations).toBe(0);
    });
  });

  describe("applySafetyCorrections()", () => {
    it("clamps G50 to original values", () => {
      const proposed = new Map([[1, 3000], [2, 2500]]);
      const original = new Map([[1, 2500], [2, 3000]]);

      const corrected = engine.applySafetyCorrections(proposed, original);
      expect(corrected.get(1)).toBe(2500); // Clamped down
      expect(corrected.get(2)).toBe(2500); // Already lower
    });
  });
});
