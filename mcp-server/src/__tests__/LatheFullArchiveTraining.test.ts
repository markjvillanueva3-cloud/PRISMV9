/**
 * LatheFullArchiveTraining Tests — Complete JM Die Archive Training
 * ==================================================================
 * Tests the full archive training engine that processes all JM Die programs.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { existsSync } from "fs";
import {
  latheFullArchiveTrainingEngine,
  LatheFullArchiveTrainingEngine,
} from "../engines/LatheFullArchiveTrainingEngine.js";

const JM_DIE_LATHE_PATH = "H:/PRISM/JM DIE/CNC LATHE";

describe("LatheFullArchiveTrainingEngine", () => {
  let archiveAvailable = false;

  beforeAll(() => {
    archiveAvailable = existsSync(JM_DIE_LATHE_PATH);
  });

  describe("Archive Training", () => {
    it("should train on limited sample (100 programs)", async () => {
      if (!archiveAvailable) {
        console.log("SKIP: JM Die archive not available");
        return;
      }

      const engine = new LatheFullArchiveTrainingEngine();
      const result = engine.trainFullArchive(100, 10); // 100 programs, 10 epochs

      console.log("\n=== Training Results (100 programs) ===");
      console.log(`Programs Found: ${result.total_programs_found}`);
      console.log(`Programs Parsed: ${result.programs_parsed}`);
      console.log(`Programs Analyzed: ${result.programs_analyzed}`);
      console.log(`Average Score: ${result.avg_program_score.toFixed(1)}/100`);
      console.log(`Total Issues: ${result.total_issues_found}`);
      console.log(`Neural Network Accuracy: ${(result.neural_network_accuracy * 100).toFixed(1)}%`);
      console.log(`Knowledge Graph Nodes: ${result.knowledge_graph_nodes}`);
      console.log(`Patterns Learned: ${result.patterns_learned}`);

      expect(result.total_programs_found).toBeGreaterThan(0);
      expect(result.programs_parsed).toBeGreaterThan(0);
      expect(result.programs_analyzed).toBeGreaterThan(0);
    }, 120000); // 2 minute timeout

    it("should identify common issues", async () => {
      if (!archiveAvailable) {
        console.log("SKIP: JM Die archive not available");
        return;
      }

      const engine = new LatheFullArchiveTrainingEngine();
      const result = engine.trainFullArchive(50, 5);

      console.log("\n=== Top 5 Common Issues ===");
      for (const issue of result.common_issues.slice(0, 5)) {
        console.log(`  ${issue.count} (${issue.percentage.toFixed(1)}%): ${issue.issue.slice(0, 50)}...`);
      }

      expect(result.common_issues.length).toBeGreaterThan(0);
    }, 60000);

    it("should find best and worst programs", async () => {
      if (!archiveAvailable) {
        console.log("SKIP: JM Die archive not available");
        return;
      }

      const engine = new LatheFullArchiveTrainingEngine();
      const result = engine.trainFullArchive(100, 5);

      console.log("\n=== Best Programs ===");
      for (const prog of result.best_programs.slice(0, 3)) {
        console.log(`  Score ${prog.score}: ${prog.customer}/${prog.filepath.split("/").pop()}`);
      }

      console.log("\n=== Worst Programs ===");
      for (const prog of result.worst_programs.slice(0, 3)) {
        console.log(`  Score ${prog.score} (${prog.issues} issues): ${prog.customer}/${prog.filepath.split("/").pop()}`);
      }

      expect(result.best_programs.length).toBeGreaterThan(0);
      expect(result.worst_programs.length).toBeGreaterThan(0);
      expect(result.best_programs[0].score).toBeGreaterThanOrEqual(result.worst_programs[0].score);
    }, 120000);

    it("should analyze customer quality", async () => {
      if (!archiveAvailable) {
        console.log("SKIP: JM Die archive not available");
        return;
      }

      const engine = new LatheFullArchiveTrainingEngine();
      const result = engine.trainFullArchive(200, 5);

      console.log("\n=== Best Customers ===");
      for (const cust of result.best_customers.slice(0, 3)) {
        console.log(`  ${cust.customer}: ${cust.program_count} programs, avg score ${cust.avg_score.toFixed(1)}`);
      }

      console.log("\n=== Customers Needing Training ===");
      for (const cust of result.worst_customers.slice(0, 3)) {
        console.log(`  ${cust.customer}: ${cust.program_count} programs, avg score ${cust.avg_score.toFixed(1)}`);
      }

      expect(result.customers_analyzed).toBeGreaterThan(0);
    }, 180000);

    it("should calculate score distribution", async () => {
      if (!archiveAvailable) {
        console.log("SKIP: JM Die archive not available");
        return;
      }

      const engine = new LatheFullArchiveTrainingEngine();
      const result = engine.trainFullArchive(100, 5);

      console.log("\n=== Score Distribution ===");
      for (const range of result.score_distribution) {
        const bar = "█".repeat(Math.min(50, Math.floor(range.count / 2)));
        console.log(`  ${range.range}: ${range.count} ${bar}`);
      }

      expect(result.score_distribution.length).toBe(5);
    }, 60000);
  });

  describe("Program Analysis", () => {
    it("should analyze individual program with deep intelligence", async () => {
      if (!archiveAvailable) {
        console.log("SKIP: JM Die archive not available");
        return;
      }

      const sampleProgram = `$TEST.MIN%
NAT01 (OD ROUGH)
T010101
G50 S1200
G96 S250 M3
G0 X1.5 Z.05 M8
G1 X-.04 F.006
G85 NTURN D.08 U.01 W.005 F.008
G80
G0 X20 Z20
M1
NAT11 (CUTOFF)
T111111
G50 S800
G96 S150 M3
G0 X1.5 Z-.5
G1 X-.04 F.0012
G0 X20 Z20
M2%`;

      const result = latheFullArchiveTrainingEngine.analyzeProgram(sampleProgram, "test.MIN");

      console.log("\n=== Program Analysis ===");
      console.log(`Physics Score: ${result.physics.score}/100`);
      console.log(`Issues: ${result.physics.issues.length}`);
      console.log(`Quality Prediction: ${result.intelligence.quality_prediction.toFixed(1)}`);
      console.log(`Optimization Potential: ${result.intelligence.optimization_potential.toFixed(1)}%`);
      console.log(`Patterns Detected: ${result.intelligence.patterns.length}`);
      console.log(`Reasoning Steps: ${result.intelligence.reasoning.reasoning_chain.length}`);

      expect(result.physics.score).toBeGreaterThanOrEqual(0);
      expect(result.intelligence.patterns.length).toBeGreaterThan(0);
      expect(result.intelligence.reasoning.reasoning_chain.length).toBeGreaterThanOrEqual(5);
    });

    it("should rewrite program with improvements", () => {
      const badProgram = `$BAD.MIN%
NAT01 (OD ROUGH)
T010101
G96 S500 M3
G0 X1 Z.1
G1 X-.1 F.0003
G0 X20 Z20
M2%`;

      const result = latheFullArchiveTrainingEngine.rewriteProgram(badProgram, "bad.MIN");

      console.log("\n=== Program Rewrite ===");
      console.log(`Original Score: ${result.original_score}`);
      console.log(`Expected New Score: ${result.expected_new_score}`);
      console.log(`Improvements Made: ${result.improvements_made.length}`);
      for (const imp of result.improvements_made) {
        console.log(`  - ${imp}`);
      }

      expect(result.improved_code).toBeTruthy();
      expect(result.improved_code.length).toBeGreaterThan(badProgram.length);
      expect(result.improvements_made.length).toBeGreaterThan(0);
    });
  });

  describe("Full Archive Training (Extended)", () => {
    it("should train on 500 programs with full neural network training", async () => {
      if (!archiveAvailable) {
        console.log("SKIP: JM Die archive not available");
        return;
      }

      const engine = new LatheFullArchiveTrainingEngine();

      // Set progress callback
      engine.setProgressCallback(progress => {
        if (progress.processed % 100 === 0) {
          console.log(`Progress: ${progress.processed}/${progress.total_programs} (${progress.current_customer})`);
        }
      });

      const result = engine.trainFullArchive(500, 30); // 500 programs, 30 epochs

      console.log("\n=== Extended Training Results ===");
      console.log(`Programs: ${result.programs_analyzed}`);
      console.log(`Time: ${(result.total_time_ms / 1000).toFixed(1)}s`);
      console.log(`Avg Time/Program: ${result.avg_time_per_program_ms.toFixed(1)}ms`);
      console.log(`Average Score: ${result.avg_program_score.toFixed(1)}/100`);
      console.log(`Neural Network Accuracy: ${(result.neural_network_accuracy * 100).toFixed(1)}%`);
      console.log(`Programs Rewritable: ${result.programs_rewritable}`);
      console.log(`Total Recommendations: ${result.total_improvement_recommendations}`);

      expect(result.programs_analyzed).toBeGreaterThanOrEqual(400); // Allow some parse failures
      expect(result.neural_network_accuracy).toBeGreaterThanOrEqual(0);
    }, 300000); // 5 minute timeout
  });
});
