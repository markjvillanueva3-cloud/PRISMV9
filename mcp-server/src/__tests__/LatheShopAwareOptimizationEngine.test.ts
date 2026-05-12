/**
 * LatheShopAwareOptimizationEngine Tests
 * =======================================
 * Tests JM Die shop-specific program optimization with tribal knowledge.
 */

import { describe, it, expect } from "vitest";
import {
  latheShopAwareOptimizationEngine,
  LatheShopAwareOptimizationEngine,
} from "../engines/LatheShopAwareOptimizationEngine.js";

const SAMPLE_PROGRAM = `$TEST.MIN%
NAT01 (OD ROUGH .032R)
T010101
G50 S1200
G96 S250 M3
G0 X1.5 Z.05 M8
G1 X-.04 F.005
G85 NTURN D.08 U.01 W.005 F.006
G80
G0 X20 Z20
M1

NAT03 (CENTER DRILL)
T030303
G97 S600 M3
G0 X0 Z.1
G1 Z-.15 F.002
G0 X20 Z20
M1

NAT05 (DRILL .500)
T050505
G97 S800 M3
G74 X0 Z-1.5 D.3 L.3 F.003
G0 X20 Z20
M1

NAT11 (CUTOFF .125)
T111111
G50 S800
G96 S150 M3
G0 X1.5 Z-.5
G1 X-.04 F.0012
G0 X20 Z20
M2%`;

const BAD_PROGRAM = `$BAD.MIN%
NAT01 (ROUGH)
T010101
G96 S500 M3
G0 X1 Z.1
G1 X-.1 F.0003
G0 X20 Z20
M2%`;

describe("LatheShopAwareOptimizationEngine", () => {
  describe("Program Optimization", () => {
    it("should optimize a program and improve score", () => {
      const result = latheShopAwareOptimizationEngine.optimizeProgram(SAMPLE_PROGRAM, "test.MIN");

      console.log(`\n=== Optimization Result ===`);
      console.log(`Original Score: ${result.original_score}`);
      console.log(`Optimized Score: ${result.optimized_score}`);
      console.log(`Improvement: +${result.improvement_points} points (${result.improvement_percentage.toFixed(1)}%)`);

      expect(result.optimized_score).toBeGreaterThanOrEqual(result.original_score);
      expect(result.optimized_gcode).toBeTruthy();
    });

    it("should select appropriate machine", () => {
      const result = latheShopAwareOptimizationEngine.optimizeProgram(SAMPLE_PROGRAM, "test.MIN");

      console.log(`\n=== Machine Selection ===`);
      console.log(`Recommended: ${result.recommended_machine}`);
      console.log(`Reasoning: ${result.machine_reasoning}`);

      expect(result.recommended_machine).toBeTruthy();
      expect(result.machine_reasoning).toBeTruthy();
    });

    it("should recommend appropriate tooling", () => {
      const result = latheShopAwareOptimizationEngine.optimizeProgram(SAMPLE_PROGRAM, "test.MIN");

      console.log(`\n=== Tooling Recommendations ===`);
      for (const tool of result.recommended_tooling) {
        console.log(`  ${tool.operation}: ${tool.tool_id} — ${tool.reasoning}`);
      }

      expect(result.recommended_tooling.length).toBeGreaterThan(0);
    });

    it("should identify parameter improvements", () => {
      const result = latheShopAwareOptimizationEngine.optimizeProgram(BAD_PROGRAM, "bad.MIN");

      console.log(`\n=== Parameter Changes ===`);
      for (const change of result.parameter_changes) {
        console.log(`  ${change.operation} ${change.parameter}: ${change.original_value} → ${change.optimized_value} ${change.unit}`);
        console.log(`    Reasoning: ${change.reasoning}`);
      }

      // Bad program should have optimization opportunities
      expect(result.parameter_changes.length).toBeGreaterThan(0);
    });

    it("should apply tribal knowledge", () => {
      const result = latheShopAwareOptimizationEngine.optimizeProgram(SAMPLE_PROGRAM, "test.MIN");

      console.log(`\n=== Tribal Knowledge Applied ===`);
      for (const tip of result.tribal_knowledge_applied) {
        console.log(`  • ${tip}`);
      }

      expect(result.tribal_knowledge_applied.length).toBeGreaterThan(0);
    });

    it("should identify safety improvements", () => {
      const result = latheShopAwareOptimizationEngine.optimizeProgram(BAD_PROGRAM, "bad.MIN");

      console.log(`\n=== Safety Improvements ===`);
      for (const fix of result.safety_improvements) {
        console.log(`  ⚠️ ${fix}`);
      }

      // Bad program missing G50 should have safety fix
      expect(result.safety_improvements.length).toBeGreaterThan(0);
    });

    it("should estimate cycle time reduction", () => {
      const result = latheShopAwareOptimizationEngine.optimizeProgram(BAD_PROGRAM, "bad.MIN");

      console.log(`\n=== Cycle Time Impact ===`);
      console.log(`Estimated reduction: ${result.estimated_cycle_time_reduction_pct.toFixed(1)}%`);

      expect(result.estimated_cycle_time_reduction_pct).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Tribal Knowledge", () => {
    it("should return M2 material knowledge", () => {
      const tips = latheShopAwareOptimizationEngine.getTribalKnowledgeForMaterial("M2");

      console.log(`\n=== M2 Tool Steel Knowledge ===`);
      for (const tip of tips) {
        console.log(`  • ${tip}`);
      }

      expect(tips.length).toBeGreaterThan(0);
      expect(tips.some(t => t.includes("CBN"))).toBe(true);
    });

    it("should return D2 material knowledge", () => {
      const tips = latheShopAwareOptimizationEngine.getTribalKnowledgeForMaterial("D2");
      expect(tips.length).toBeGreaterThan(0);
    });

    it("should return cutoff operation knowledge", () => {
      const tips = latheShopAwareOptimizationEngine.getTribalKnowledgeForOperation("cutoff");

      console.log(`\n=== Cutoff Operation Knowledge ===`);
      for (const tip of tips) {
        console.log(`  • ${tip}`);
      }

      expect(tips.length).toBeGreaterThan(0);
      expect(tips.some(t => t.includes("0.0015"))).toBe(true);
    });

    it("should return machine-specific knowledge", () => {
      const tips = latheShopAwareOptimizationEngine.getTribalKnowledgeForMachine("LB3000EX");

      console.log(`\n=== LB3000EX Knowledge ===`);
      for (const tip of tips) {
        console.log(`  • ${tip}`);
      }

      expect(tips.length).toBeGreaterThan(0);
    });

    it("should return common pitfalls", () => {
      const pitfalls = latheShopAwareOptimizationEngine.getPitfalls();

      console.log(`\n=== Common Pitfalls ===`);
      for (const pitfall of pitfalls.slice(0, 5)) {
        console.log(`  ⚠️ ${pitfall}`);
      }

      expect(pitfalls.length).toBeGreaterThan(5);
    });
  });

  describe("Batch Optimization", () => {
    it("should optimize multiple programs", () => {
      const programs = [
        { content: SAMPLE_PROGRAM, filepath: "good.MIN" },
        { content: BAD_PROGRAM, filepath: "bad.MIN" },
      ];

      const result = latheShopAwareOptimizationEngine.optimizeCustomerPrograms(programs);

      console.log(`\n=== Batch Optimization Summary ===`);
      console.log(`Programs Optimized: ${result.summary.total_programs}`);
      console.log(`Original Avg Score: ${result.summary.avg_original_score.toFixed(1)}`);
      console.log(`Optimized Avg Score: ${result.summary.avg_optimized_score.toFixed(1)}`);
      console.log(`Total Improvement: +${result.summary.total_improvement_points} points`);
      console.log(`Safety Fixes: ${result.summary.total_safety_fixes}`);
      console.log(`Cycle Time Savings: ${result.summary.estimated_total_cycle_time_savings_pct.toFixed(1)}%`);

      expect(result.optimized.length).toBe(2);
      expect(result.summary.avg_optimized_score).toBeGreaterThanOrEqual(result.summary.avg_original_score);
    });
  });
});
