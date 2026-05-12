/**
 * FULL ARCHIVE DEEP TRAINING — Process ALL 15,000+ JM Die Programs
 * ==================================================================
 * This test trains the Lathe AI on the ENTIRE JM Die archive.
 * Expected runtime: 3-5 minutes for full archive.
 */

import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { LatheFullArchiveTrainingEngine } from "../engines/LatheFullArchiveTrainingEngine.js";

const JM_DIE_LATHE_PATH = "H:/PRISM/JM DIE/CNC LATHE";

describe("FULL ARCHIVE DEEP TRAINING", () => {
  it("should train on ENTIRE JM Die archive (ALL programs)", async () => {
    if (!existsSync(JM_DIE_LATHE_PATH)) {
      console.log("SKIP: JM Die archive not available");
      return;
    }

    console.log("\n" + "=".repeat(80));
    console.log("PRISM LATHE AI — FULL ARCHIVE TRAINING (ALL PROGRAMS)");
    console.log("=".repeat(80) + "\n");

    const engine = new LatheFullArchiveTrainingEngine();

    // Progress tracking
    let lastReport = 0;
    engine.setProgressCallback(progress => {
      if (progress.processed - lastReport >= 1000 || progress.processed === progress.total_programs) {
        const pct = ((progress.processed / progress.total_programs) * 100).toFixed(1);
        const elapsedSec = (progress.elapsed_ms / 1000).toFixed(1);
        console.log(`[${pct}%] ${progress.processed}/${progress.total_programs} programs | ${elapsedSec}s elapsed | Customer: ${progress.current_customer}`);
        lastReport = progress.processed;
      }
    });

    // Train on ALL programs (0 = unlimited), 100 epochs for deep learning
    const result = engine.trainFullArchive(0, 100);

    // Output comprehensive results
    console.log("\n" + "=".repeat(80));
    console.log("TRAINING COMPLETE — FULL ARCHIVE RESULTS");
    console.log("=".repeat(80) + "\n");

    console.log("=== OVERVIEW ===");
    console.log(`Total Programs Found:    ${result.total_programs_found}`);
    console.log(`Programs Parsed:         ${result.programs_parsed}`);
    console.log(`Programs Analyzed:       ${result.programs_analyzed}`);
    console.log(`Parse Errors:            ${result.parse_errors}`);
    console.log(`Total Time:              ${(result.total_time_ms / 1000).toFixed(1)} seconds`);
    console.log(`Avg Time/Program:        ${result.avg_time_per_program_ms.toFixed(2)} ms`);

    console.log("\n=== QUALITY METRICS ===");
    console.log(`Average Program Score:   ${result.avg_program_score.toFixed(1)}/100`);
    console.log(`Total Issues Found:      ${result.total_issues_found}`);
    console.log(`Programs Rewritable:     ${result.programs_rewritable} (score < 80)`);
    console.log(`Total Recommendations:   ${result.total_improvement_recommendations}`);

    console.log("\n=== SCORE DISTRIBUTION ===");
    for (const range of result.score_distribution) {
      const bar = "█".repeat(Math.min(50, Math.floor(range.count / (result.programs_analyzed / 100))));
      console.log(`  ${range.range.padEnd(8)}: ${range.count.toString().padStart(5)} programs ${bar}`);
    }

    console.log("\n=== TOP 10 COMMON ISSUES ===");
    for (let i = 0; i < Math.min(10, result.common_issues.length); i++) {
      const issue = result.common_issues[i];
      console.log(`  ${(i + 1).toString().padStart(2)}. ${issue.count.toString().padStart(5)} (${issue.percentage.toFixed(1).padStart(5)}%): ${issue.issue.slice(0, 60)}`);
    }

    console.log("\n=== ANTI-PATTERNS DETECTED ===");
    for (const ap of result.anti_patterns) {
      console.log(`  [${ap.severity.toUpperCase()}] ${ap.pattern}: ${ap.count} programs`);
    }

    console.log("\n=== BEST PRACTICES ADOPTION ===");
    for (const bp of result.best_practices) {
      const pct = ((bp.count / result.programs_analyzed) * 100).toFixed(1);
      console.log(`  ${bp.practice}: ${bp.count} programs (${pct}%)`);
    }

    console.log("\n=== BEST 5 PROGRAMS ===");
    for (const prog of result.best_programs.slice(0, 5)) {
      const filename = prog.filepath.split(/[/\\]/).pop();
      console.log(`  Score ${prog.score.toString().padStart(3)}: ${prog.customer}/${filename}`);
    }

    console.log("\n=== WORST 5 PROGRAMS (Need Rewrite) ===");
    for (const prog of result.worst_programs.slice(0, 5)) {
      const filename = prog.filepath.split(/[/\\]/).pop();
      console.log(`  Score ${prog.score.toString().padStart(3)} (${prog.issues} issues): ${prog.customer}/${filename}`);
    }

    console.log("\n=== CUSTOMER ANALYSIS ===");
    console.log(`Customers Analyzed: ${result.customers_analyzed}`);

    console.log("\n--- Best Performing Customers ---");
    for (const cust of result.best_customers.slice(0, 5)) {
      console.log(`  ${cust.customer.padEnd(20)}: ${cust.program_count} programs, avg score ${cust.avg_score.toFixed(1)}`);
    }

    console.log("\n--- Customers Needing Training ---");
    for (const cust of result.worst_customers.slice(0, 5)) {
      console.log(`  ${cust.customer.padEnd(20)}: ${cust.program_count} programs, avg score ${cust.avg_score.toFixed(1)}`);
    }

    console.log("\n=== DEEP LEARNING METRICS ===");
    console.log(`Neural Network Accuracy: ${(result.neural_network_accuracy * 100).toFixed(1)}%`);
    console.log(`Knowledge Graph Nodes:   ${result.knowledge_graph_nodes}`);
    console.log(`Knowledge Graph Edges:   ${result.knowledge_graph_edges}`);
    console.log(`Patterns Learned:        ${result.patterns_learned}`);
    console.log(`Experience Buffer Size:  ${result.experience_buffer_size}`);

    console.log("\n" + "=".repeat(80));
    console.log("TRAINING REPORT SAVED TO: H:/PRISM/JM DIE/lathe-ai-training-report.json");
    console.log("=".repeat(80) + "\n");

    // Assertions
    expect(result.total_programs_found).toBeGreaterThan(1000);
    expect(result.programs_parsed).toBeGreaterThan(1000);
    expect(result.programs_analyzed).toBeGreaterThan(1000);
    expect(result.avg_program_score).toBeGreaterThan(0);
    expect(result.total_issues_found).toBeGreaterThan(0);
    expect(result.customers_analyzed).toBeGreaterThan(10);
  }, 600000); // 10 minute timeout
});
