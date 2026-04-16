/**
 * Train Mill AI on ALL JM Die Programs
 * =====================================
 * Deep learning training script that:
 *   1. Scans ALL NC files in JM Die mill folders
 *   2. Parses each program for patterns
 *   3. Learns speeds, feeds, operation sequences
 *   4. Detects amateur programmer errors
 *   5. Outputs comprehensive training report
 *
 * Run with: npx tsx scripts/train-mill-ai.ts
 */

import { millDeepLearningEngine } from "../src/engines/MillDeepLearningEngine.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("=".repeat(70));
  console.log("PRISM MILL AI DEEP LEARNING TRAINING");
  console.log("=".repeat(70));
  console.log("");

  const startTime = Date.now();

  // Run training
  console.log("[1/4] Training on JM Die milling programs...");
  const trainingResult = await millDeepLearningEngine.trainOnAllPrograms();

  console.log("");
  console.log("[2/4] Training Statistics:");
  console.log(`  Programs parsed:     ${trainingResult.programs_parsed}`);
  console.log(`  PROVEN programs:     ${trainingResult.proven_programs}`);
  console.log(`  Operations learned:  ${trainingResult.operations_learned}`);
  console.log(`  Customers:           ${trainingResult.customers.join(", ")}`);
  console.log(`  Materials:           ${trainingResult.materials.join(", ")}`);
  console.log(`  Issues found:        ${trainingResult.issues_found}`);

  // Get detailed statistics
  const stats = millDeepLearningEngine.getStatistics();
  console.log("");
  console.log("[3/4] Neural Network State:");
  console.log(`  Parameter neurons:   ${stats.parameter_neurons}`);
  console.log(`  Sequence patterns:   ${stats.sequence_patterns}`);
  console.log("");
  console.log("  Operation Frequencies:");
  for (const [op, freq] of Object.entries(stats.operation_frequencies).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${op.padEnd(20)} ${freq}x`);
  }

  // Test some recommendations
  console.log("");
  console.log("[4/4] Sample AI Recommendations:");

  // Steel flat endmill
  const steelParams = millDeepLearningEngine.getOptimizedParams("P", "flat_endmill", 12);
  if (steelParams) {
    console.log(`  Steel 12mm flat endmill:`);
    console.log(`    RPM: ${steelParams.rpm}, Feed: ${steelParams.feed} IPM, DOC: ${steelParams.doc}"`);
    console.log(`    Confidence: ${(steelParams.confidence * 100).toFixed(1)}% (from ${steelParams.based_on} samples, ${steelParams.from_proven} proven)`);
  }

  // Aluminum contour
  const alumParams = millDeepLearningEngine.getOptimizedParams("N", "flat_endmill", 25);
  if (alumParams) {
    console.log(`  Aluminum 25mm flat endmill:`);
    console.log(`    RPM: ${alumParams.rpm}, Feed: ${alumParams.feed} IPM, DOC: ${alumParams.doc}"`);
    console.log(`    Confidence: ${(alumParams.confidence * 100).toFixed(1)}% (from ${alumParams.based_on} samples, ${alumParams.from_proven} proven)`);
  }

  // Sequence recommendation
  const seqRec = millDeepLearningEngine.recommendSequence(["face", "profile", "hole", "thread"]);
  console.log("");
  console.log(`  Recommended sequence for [face, profile, hole, thread]:`);
  console.log(`    ${seqRec.sequence.join(" → ")}`);
  console.log(`    Confidence: ${(seqRec.confidence * 100).toFixed(1)}%`);

  // Deep reasoning example
  const reasoning = millDeepLearningEngine.deepReason(
    "What RPM should I use for drilling steel with a 3/16 drill?",
    { material_iso: "P", operation_type: "drill", tool_diameter_mm: 4.76 }
  );
  console.log("");
  console.log("  Deep Reasoning Example:");
  console.log(`    Question: ${reasoning.question}`);
  console.log(`    Evidence: ${reasoning.evidence.slice(0, 3).join("; ")}`);
  console.log(`    Logic: ${reasoning.logic.slice(0, 2).join("; ")}`);
  console.log(`    Conclusion: ${reasoning.conclusion}`);
  console.log(`    Confidence: ${(reasoning.confidence * 100).toFixed(1)}%`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("");
  console.log("=".repeat(70));
  console.log(`Training complete in ${elapsed}s`);
  console.log("=".repeat(70));

  // Save training report to JSON
  const reportPath = path.join(__dirname, "../data/state/MILL_AI_TRAINING_REPORT.json");
  const report = {
    timestamp: new Date().toISOString(),
    training_duration_sec: parseFloat(elapsed),
    programs_parsed: trainingResult.programs_parsed,
    proven_programs: trainingResult.proven_programs,
    operations_learned: trainingResult.operations_learned,
    customers: trainingResult.customers,
    materials: trainingResult.materials,
    issues_found: trainingResult.issues_found,
    neural_network: {
      parameter_neurons: stats.parameter_neurons,
      sequence_patterns: stats.sequence_patterns,
      operation_frequencies: stats.operation_frequencies,
    },
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Report saved to: ${reportPath}`);
}

main().catch(console.error);
