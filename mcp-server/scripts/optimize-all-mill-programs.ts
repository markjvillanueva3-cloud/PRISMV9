/**
 * Optimize ALL JM Die Mill Programs
 * ===================================
 * Goes through EVERY NC program, optimizes based on:
 *   - Learned AI patterns from training
 *   - JM Die tool inventory
 *   - JM Die machine capabilities
 *   - Material-specific parameters
 *
 * Run with: npx tsx scripts/optimize-all-mill-programs.ts
 */

import { millProgramOptimizerEngine } from "../src/engines/MillProgramOptimizerEngine.js";
import { millDeepLearningEngine } from "../src/engines/MillDeepLearningEngine.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("=".repeat(70));
  console.log("PRISM MILL AI — FULL PROGRAM OPTIMIZATION");
  console.log("=".repeat(70));
  console.log("");

  const startTime = Date.now();

  // Step 1: Train the AI
  console.log("[1/3] Training AI on JM Die programs...");
  const trainingResult = await millDeepLearningEngine.trainOnAllPrograms();

  console.log(`  Programs trained: ${trainingResult.programs_parsed}`);
  console.log(`  PROVEN programs:  ${trainingResult.proven_programs}`);
  console.log(`  Operations:       ${trainingResult.operations_learned}`);
  console.log(`  Customers:        ${trainingResult.customers.join(", ")}`);
  console.log(`  Materials:        ${trainingResult.materials.join(", ")}`);
  console.log("");

  // Step 2: Optimize all programs
  console.log("[2/3] Optimizing all programs...");
  console.log("-".repeat(70));

  const summary = await millProgramOptimizerEngine.optimizeAllPrograms();

  console.log("");
  console.log("-".repeat(70));
  console.log("[3/3] OPTIMIZATION SUMMARY");
  console.log("-".repeat(70));
  console.log(`  Total programs:      ${summary.total_programs}`);
  console.log(`  Programs optimized:  ${summary.programs_optimized}`);
  console.log(`  Programs unchanged:  ${summary.programs_unchanged}`);
  console.log(`  Programs w/ issues:  ${summary.programs_with_issues}`);
  console.log(`  Total time saved:    ${summary.total_time_savings_min} min`);
  console.log(`  Avg improvement:     ${summary.avg_improvement_pct.toFixed(1)}%`);
  console.log(`  Issues fixed:        ${summary.issues_fixed}`);
  console.log(`  Issues remaining:    ${summary.issues_remaining}`);
  console.log("");
  console.log("  Per-Customer Stats:");
  for (const [customer, stats] of Object.entries(summary.per_customer_stats)) {
    console.log(`    ${customer.padEnd(20)} ${stats.programs} programs, ${stats.time_saved.toFixed(1)} min saved`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("");
  console.log("=".repeat(70));
  console.log(`Optimization complete in ${elapsed}s`);
  console.log("=".repeat(70));

  // Save detailed report
  const reportPath = path.join(__dirname, "../data/state/MILL_OPTIMIZATION_REPORT.json");
  const report = {
    timestamp: new Date().toISOString(),
    duration_sec: parseFloat(elapsed),
    training: trainingResult,
    optimization: summary,
    optimizations: millProgramOptimizerEngine.getOptimizations(),
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Report saved to: ${reportPath}`);

  // Save text report
  const textReport = millProgramOptimizerEngine.generateReport();
  const textPath = path.join(__dirname, "../data/state/MILL_OPTIMIZATION_REPORT.txt");
  fs.writeFileSync(textPath, textReport);
  console.log(`Text report saved to: ${textPath}`);
}

main().catch(console.error);
