/**
 * Complete Mill AI Training Pipeline
 * ====================================
 * Full training incorporating:
 *   1. JM Die NC program patterns (27+ programs)
 *   2. Neural network with multi-layer architecture
 *   3. Tribal knowledge (15+ milling tips)
 *   4. Expert heuristics (5+ rules)
 *   5. Failure mode learning (5+ patterns)
 *   6. Program optimization
 *
 * Run with: npx tsx scripts/train-mill-ai-complete.ts
 */

import { millDeepLearningEngine } from "../src/engines/MillDeepLearningEngine.js";
import { millNeuralNetworkEngine } from "../src/engines/MillNeuralNetworkEngine.js";
import { millTribalIntegrationEngine } from "../src/engines/MillTribalIntegrationEngine.js";
import { millProgramOptimizerEngine } from "../src/engines/MillProgramOptimizerEngine.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("=".repeat(70));
  console.log("PRISM MILL AI — COMPLETE TRAINING PIPELINE");
  console.log("=".repeat(70));
  console.log("");

  const startTime = Date.now();

  // ========================================================================
  // PHASE 1: DEEP LEARNING FROM NC PROGRAMS
  // ========================================================================
  console.log("[PHASE 1] Deep Learning from JM Die NC Programs");
  console.log("-".repeat(70));

  const deepLearningResult = await millDeepLearningEngine.trainOnAllPrograms();

  console.log(`  Programs parsed:     ${deepLearningResult.programs_parsed}`);
  console.log(`  PROVEN programs:     ${deepLearningResult.proven_programs}`);
  console.log(`  Operations learned:  ${deepLearningResult.operations_learned}`);
  console.log(`  Customers:           ${deepLearningResult.customers.join(", ")}`);
  console.log(`  Materials:           ${deepLearningResult.materials.join(", ")}`);
  console.log(`  Issues detected:     ${deepLearningResult.issues_found}`);
  console.log("");

  // ========================================================================
  // PHASE 2: TRIBAL KNOWLEDGE INTEGRATION
  // ========================================================================
  console.log("[PHASE 2] Tribal Knowledge Integration");
  console.log("-".repeat(70));

  const tribalResult = await millTribalIntegrationEngine.integrateWithTraining();
  const tribalStats = millTribalIntegrationEngine.getStatistics();

  console.log(`  Tribal tips applied:     ${tribalResult.signals_applied}`);
  console.log(`  Heuristics registered:   ${tribalResult.heuristics_applied}`);
  console.log(`  Failure modes learned:   ${tribalResult.failure_modes_learned}`);
  console.log(`  Neural samples added:    ${tribalResult.neural_samples_added}`);
  console.log(`  Critical warnings:       ${tribalStats.critical_warnings}`);
  console.log("");

  console.log("  Tips by Material:");
  for (const [mat, count] of Object.entries(tribalStats.by_material)) {
    console.log(`    ${mat}: ${count} tips`);
  }
  console.log("");

  console.log("  Tips by Operation:");
  for (const [op, count] of Object.entries(tribalStats.by_operation)) {
    console.log(`    ${op}: ${count} tips`);
  }
  console.log("");

  // ========================================================================
  // PHASE 3: NEURAL NETWORK TRAINING
  // ========================================================================
  console.log("[PHASE 3] Neural Network Training");
  console.log("-".repeat(70));

  // Add samples from deep learning to neural network
  const dlStats = millDeepLearningEngine.getStatistics();
  console.log(`  Building training samples from ${dlStats.programs_parsed} programs...`);

  // Note: Neural network already has tribal samples; deep learning patterns are stored in engine
  console.log(`  Operation frequencies: ${Object.keys(dlStats.operation_frequencies).length} types`);
  for (const [op, freq] of Object.entries(dlStats.operation_frequencies)) {
    console.log(`    ${op}: ${freq}x`);
  }

  const trainingResult = millNeuralNetworkEngine.train();
  const nnStats = millNeuralNetworkEngine.getNetworkStats();

  console.log(`  Network architecture:    ${nnStats.layers} layers`);
  console.log(`  Total neurons:           ${nnStats.total_neurons}`);
  console.log(`  Total weights:           ${nnStats.total_weights}`);
  console.log(`  Training samples:        ${nnStats.training_samples}`);
  console.log(`  Training epochs:         ${trainingResult.epochs}`);
  console.log(`  Final loss:              ${trainingResult.loss.toFixed(6)}`);
  console.log(`  Average confidence:      ${(nnStats.avg_confidence * 100).toFixed(1)}%`);
  console.log("");

  // ========================================================================
  // PHASE 4: PROGRAM OPTIMIZATION
  // ========================================================================
  console.log("[PHASE 4] Full Program Optimization");
  console.log("-".repeat(70));

  const optSummary = await millProgramOptimizerEngine.optimizeAllPrograms();

  console.log(`  Programs optimized:      ${optSummary.programs_optimized}`);
  console.log(`  Programs unchanged:      ${optSummary.programs_unchanged}`);
  console.log(`  Total time saved:        ${optSummary.total_time_savings_min.toFixed(1)} min`);
  console.log(`  Average improvement:     ${optSummary.avg_improvement_pct.toFixed(1)}%`);
  console.log(`  Issues fixed:            ${optSummary.issues_fixed}`);
  console.log(`  Issues remaining:        ${optSummary.issues_remaining}`);
  console.log("");

  console.log("  Per-Customer Results:");
  for (const [customer, stats] of Object.entries(optSummary.per_customer_stats)) {
    console.log(`    ${customer.padEnd(20)} ${stats.programs} programs, ${stats.time_saved.toFixed(1)} min saved`);
  }
  console.log("");

  // ========================================================================
  // PHASE 5: AI CAPABILITY DEMONSTRATION
  // ========================================================================
  console.log("[PHASE 5] AI Capability Demonstration");
  console.log("-".repeat(70));

  // Test neural network prediction
  console.log("  Neural Network Prediction Test:");
  const prediction = millNeuralNetworkEngine.predict(
    "P", // steel
    "flat_endmill",
    "rough_profile",
    12, // 12mm endmill
    2000, // original RPM
    15, // original feed
    0.5, // original DOC
    8, // z levels
    true // cutter comp
  );

  console.log(`    Input: Steel, 12mm EM, roughing`);
  console.log(`    Predicted RPM:  ${Math.round(prediction.output[0])}`);
  console.log(`    Predicted Feed: ${prediction.output[1].toFixed(1)} IPM`);
  console.log(`    Predicted DOC:  ${prediction.output[2].toFixed(3)}"`);
  console.log(`    Confidence:     ${(prediction.confidence * 100).toFixed(1)}%`);
  console.log(`    Explanation:`);
  for (const exp of prediction.explanation.slice(0, 3)) {
    console.log(`      - ${exp}`);
  }
  console.log("");

  // Test tribal knowledge adjustment
  console.log("  Tribal Knowledge Adjustment Test:");
  const tribalAdj = millTribalIntegrationEngine.getAdjustment(
    "P", // steel
    "rough_profile",
    "flat_endmill",
    12
  );

  console.log(`    RPM factor:  ${tribalAdj.rpm_factor.toFixed(2)}x`);
  console.log(`    Feed factor: ${tribalAdj.feed_factor.toFixed(2)}x`);
  console.log(`    DOC factor:  ${tribalAdj.doc_factor.toFixed(2)}x`);
  console.log(`    Tips applied: ${tribalAdj.tips_applied.length}`);
  if (tribalAdj.warnings.length > 0) {
    console.log(`    Warnings:`);
    for (const w of tribalAdj.warnings) {
      console.log(`      ! ${w}`);
    }
  }
  console.log("");

  // Test anomaly detection
  console.log("  Anomaly Detection Test:");
  const anomaly = millNeuralNetworkEngine.detectAnomaly(
    "P",
    "flat_endmill",
    "drill",
    6,
    500, // suspiciously low RPM for drilling
    50, // high feed
    2.0
  );

  console.log(`    Is Anomaly: ${anomaly.isAnomaly}`);
  console.log(`    Score:      ${anomaly.score.toFixed(2)}`);
  console.log(`    Reason:     ${anomaly.reason}`);
  console.log("");

  // Test deep reasoning
  console.log("  Deep Reasoning Test:");
  const reasoning = millDeepLearningEngine.deepReason(
    "What is the optimal operation sequence for a steel part with holes and threads?",
    { material_iso: "P" }
  );

  console.log(`    Question: ${reasoning.question.slice(0, 60)}...`);
  console.log(`    Evidence: ${reasoning.evidence.length} pieces`);
  console.log(`    Logic: ${reasoning.logic.length} principles`);
  console.log(`    Conclusion: ${reasoning.conclusion.slice(0, 80)}...`);
  console.log(`    Confidence: ${(reasoning.confidence * 100).toFixed(1)}%`);
  console.log("");

  // ========================================================================
  // FINAL SUMMARY
  // ========================================================================
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("=".repeat(70));
  console.log("TRAINING PIPELINE COMPLETE");
  console.log("=".repeat(70));
  console.log("");
  console.log("Summary:");
  console.log(`  Total time:              ${elapsed}s`);
  console.log(`  NC programs learned:     ${deepLearningResult.programs_parsed}`);
  console.log(`  Operations learned:      ${deepLearningResult.operations_learned}`);
  console.log(`  Tribal tips integrated:  ${tribalResult.signals_applied}`);
  console.log(`  Neural network trained:  ${nnStats.trained ? "YES" : "NO"}`);
  console.log(`  Programs optimized:      ${optSummary.programs_optimized}`);
  console.log(`  Total time saved:        ${optSummary.total_time_savings_min.toFixed(1)} min`);
  console.log(`  Issues fixed:            ${optSummary.issues_fixed}`);
  console.log("");

  // Save complete report
  const reportPath = path.join(__dirname, "../data/state/MILL_AI_COMPLETE_REPORT.json");
  const report = {
    timestamp: new Date().toISOString(),
    duration_sec: parseFloat(elapsed),
    deep_learning: deepLearningResult,
    deep_learning_stats: dlStats,
    tribal_integration: tribalResult,
    tribal_stats: tribalStats,
    neural_network: nnStats,
    neural_training: trainingResult,
    optimization: optSummary,
    ai_capabilities: {
      prediction_test: prediction,
      tribal_adjustment: tribalAdj,
      anomaly_detection: anomaly,
      deep_reasoning: reasoning,
    },
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Complete report saved to: ${reportPath}`);
}

main().catch(console.error);
