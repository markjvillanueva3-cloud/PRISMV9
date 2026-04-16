/**
 * Run Wire EDM Batch Analysis
 *
 * Processes ALL Wire EDM programs in the JM Die archive and saves results.
 * Run with: npx tsx scripts/run-wedm-batch-analysis.ts
 */

import { WEDMBatchProgramAnalyzerEngine } from "../src/engines/WEDMBatchProgramAnalyzerEngine.js";

async function main(): Promise<void> {
  console.log("=".repeat(60));
  console.log("WEDM BATCH PROGRAM ANALYZER");
  console.log("=".repeat(60));
  console.log();

  const engine = new WEDMBatchProgramAnalyzerEngine("H:/PRISM/JM DIE/WIRE EDM");

  // First, harvest to see total count
  console.log("Step 1: Harvesting programs...");
  const programs = engine.harvestAllPrograms();
  console.log(`  Found ${programs.length} NC/MIN files`);
  console.log();

  // Run full analysis
  console.log("Step 2: Analyzing all programs...");
  console.log("  (This may take a few minutes for ~4,000 files)");
  console.log();

  const result = engine.batchAnalyze();

  // Print summary
  console.log("=".repeat(60));
  console.log("ANALYSIS COMPLETE");
  console.log("=".repeat(60));
  console.log();

  console.log("Summary:");
  console.log(`  Total files scanned: ${result.totalFilesScanned}`);
  console.log(`  Programs analyzed (Wire EDM): ${result.totalProgramsAnalyzed}`);
  console.log(`  Programs skipped (non-WEDM): ${result.totalProgramsSkipped}`);
  console.log(`  Errors: ${result.totalErrors}`);
  console.log(`  Duration: ${result.durationSeconds.toFixed(1)} seconds`);
  console.log();

  console.log("Dialect Distribution:");
  for (const [dialect, count] of Object.entries(result.statistics.dialectDistribution)) {
    if (count > 0) {
      console.log(`  ${dialect}: ${count}`);
    }
  }
  console.log();

  console.log("Top 10 E-codes:");
  result.statistics.topECodes.slice(0, 10).forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.code}: ${item.count} programs`);
  });
  console.log();

  console.log("Pass Count Distribution:");
  for (const [passes, count] of Object.entries(result.statistics.passCountDistribution)) {
    console.log(`  ${passes} passes: ${count} programs`);
  }
  console.log(`  Average: ${result.statistics.averagePassCount} passes`);
  console.log();

  console.log("Feature Prevalence (% of programs):");
  console.log(`  Taper cutting: ${result.statistics.featurePrevalence.taper}%`);
  console.log(`  Adaptive control (M90): ${result.statistics.featurePrevalence.adaptiveControl}%`);
  console.log(`  Tank management: ${result.statistics.featurePrevalence.tankManagement}%`);
  console.log(`  Multi-pass: ${result.statistics.featurePrevalence.multiPass}%`);
  console.log(`  Submerged cut: ${result.statistics.featurePrevalence.submergedCut}%`);
  console.log();

  console.log("Quality Score Distribution:");
  console.log(`  Excellent (90-100): ${result.statistics.qualityScoreDistribution.excellent}`);
  console.log(`  Good (70-89): ${result.statistics.qualityScoreDistribution.good}`);
  console.log(`  Fair (50-69): ${result.statistics.qualityScoreDistribution.fair}`);
  console.log(`  Poor (0-49): ${result.statistics.qualityScoreDistribution.poor}`);
  console.log();

  console.log(`Customer Profiles: ${Object.keys(result.customerProfiles).length} unique customers`);
  console.log();

  console.log("Offset Statistics:");
  console.log(`  Min: ${result.statistics.offsetStatistics.min}"`);
  console.log(`  Max: ${result.statistics.offsetStatistics.max}"`);
  console.log(`  Mean: ${result.statistics.offsetStatistics.mean}"`);
  console.log();

  console.log("Feed Rate Statistics:");
  console.log(`  Min: ${result.statistics.feedRateStatistics.min} IPM`);
  console.log(`  Max: ${result.statistics.feedRateStatistics.max} IPM`);
  console.log(`  Mean: ${result.statistics.feedRateStatistics.mean} IPM`);
  console.log();

  // Save results
  console.log("Step 3: Saving results...");
  engine.saveAnalysisResults(result);
  console.log("  Saved to data/state/WEDM_BATCH_ANALYSIS.json");
  console.log("  Saved to data/wedm-intelligence/program-patterns.json");
  console.log("  Saved to data/wedm-intelligence/customer-profiles.json");
  console.log("  Saved to data/wedm-intelligence/training-data.json");
  console.log();

  console.log("Training Data:");
  console.log(`  Total samples: ${result.trainingDataSummary.totalSamples}`);
  console.log(`  Feature count: ${result.trainingDataSummary.featureCount}`);
  console.log(`  Label types: ${result.trainingDataSummary.labelTypes.join(", ")}`);
  console.log();

  console.log("=".repeat(60));
  console.log("DONE");
  console.log("=".repeat(60));
}

main().catch(console.error);
