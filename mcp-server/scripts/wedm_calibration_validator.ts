#!/usr/bin/env npx ts-node
/**
 * WEDM Calibration Validator Script
 * Phase 0.2 - WEDM AGI Roadmap
 *
 * Validates calibration/feedback data quality for neural model training.
 * Leverages: WEDMFeedbackCalibrationEngine
 *
 * Usage: npx ts-node scripts/wedm_calibration_validator.ts --feedback feedback.json
 */

import { wedmFeedbackCalibrationEngine } from "../src/engines/WEDMFeedbackCalibrationEngine.js";
import * as fs from "fs";

interface FeedbackEntry {
  timestamp: string;
  programId: string;
  material: string;
  thickness: number;
  ecode: string;
  predictedRa: number;
  actualRa: number;
  predictedMrr: number;
  actualMrr: number;
  wireBreaks: number;
  cycleTime: number;
  operator?: string;
  notes?: string;
}

interface ValidationResult {
  timestamp: string;
  inputFile: string;
  totalEntries: number;
  validEntries: number;
  invalidEntries: number;
  validityScore: number;
  issues: Array<{
    entryIndex: number;
    programId: string;
    type: "error" | "warning";
    field: string;
    message: string;
  }>;
  statistics: {
    raDeviation: {
      mean: number;
      std: number;
      min: number;
      max: number;
    };
    mrrDeviation: {
      mean: number;
      std: number;
      min: number;
      max: number;
    };
    materialDistribution: Record<string, number>;
    thicknessRange: { min: number; max: number };
    timeRange: { start: string; end: string };
  };
  recommendations: string[];
  readyForTraining: boolean;
}

// Validation rules
const VALIDATION_RULES = {
  raMin: 0.05,
  raMax: 20.0,
  mrrMin: 1.0,
  mrrMax: 500.0,
  thicknessMin: 0.5,
  thicknessMax: 500.0,
  maxDeviation: 0.5, // 50% deviation is suspicious
  minEntries: 10,
  maxWireBreaks: 10,
};

function validateEntry(entry: FeedbackEntry, index: number): ValidationResult["issues"] {
  const issues: ValidationResult["issues"] = [];

  // Required fields
  if (!entry.programId) {
    issues.push({
      entryIndex: index,
      programId: entry.programId ?? "unknown",
      type: "error",
      field: "programId",
      message: "Missing program ID",
    });
  }

  if (!entry.material) {
    issues.push({
      entryIndex: index,
      programId: entry.programId ?? "unknown",
      type: "error",
      field: "material",
      message: "Missing material",
    });
  }

  // Ra bounds
  if (entry.actualRa < VALIDATION_RULES.raMin || entry.actualRa > VALIDATION_RULES.raMax) {
    issues.push({
      entryIndex: index,
      programId: entry.programId,
      type: "error",
      field: "actualRa",
      message: `Ra ${entry.actualRa} µm out of bounds [${VALIDATION_RULES.raMin}, ${VALIDATION_RULES.raMax}]`,
    });
  }

  // MRR bounds
  if (entry.actualMrr < VALIDATION_RULES.mrrMin || entry.actualMrr > VALIDATION_RULES.mrrMax) {
    issues.push({
      entryIndex: index,
      programId: entry.programId,
      type: "error",
      field: "actualMrr",
      message: `MRR ${entry.actualMrr} mm²/min out of bounds [${VALIDATION_RULES.mrrMin}, ${VALIDATION_RULES.mrrMax}]`,
    });
  }

  // Thickness bounds
  if (entry.thickness < VALIDATION_RULES.thicknessMin || entry.thickness > VALIDATION_RULES.thicknessMax) {
    issues.push({
      entryIndex: index,
      programId: entry.programId,
      type: "error",
      field: "thickness",
      message: `Thickness ${entry.thickness} mm out of bounds`,
    });
  }

  // Prediction deviation warnings
  if (entry.predictedRa > 0) {
    const raDeviation = Math.abs(entry.actualRa - entry.predictedRa) / entry.predictedRa;
    if (raDeviation > VALIDATION_RULES.maxDeviation) {
      issues.push({
        entryIndex: index,
        programId: entry.programId,
        type: "warning",
        field: "raDeviation",
        message: `Ra deviation ${(raDeviation * 100).toFixed(0)}% exceeds threshold — verify measurement`,
      });
    }
  }

  if (entry.predictedMrr > 0) {
    const mrrDeviation = Math.abs(entry.actualMrr - entry.predictedMrr) / entry.predictedMrr;
    if (mrrDeviation > VALIDATION_RULES.maxDeviation) {
      issues.push({
        entryIndex: index,
        programId: entry.programId,
        type: "warning",
        field: "mrrDeviation",
        message: `MRR deviation ${(mrrDeviation * 100).toFixed(0)}% exceeds threshold — verify measurement`,
      });
    }
  }

  // Wire breaks warning
  if (entry.wireBreaks > VALIDATION_RULES.maxWireBreaks) {
    issues.push({
      entryIndex: index,
      programId: entry.programId,
      type: "warning",
      field: "wireBreaks",
      message: `High wire break count (${entry.wireBreaks}) — may indicate parameter issues`,
    });
  }

  return issues;
}

function calculateStatistics(entries: FeedbackEntry[]): ValidationResult["statistics"] {
  const raDeviations = entries
    .filter((e) => e.predictedRa > 0)
    .map((e) => (e.actualRa - e.predictedRa) / e.predictedRa);

  const mrrDeviations = entries
    .filter((e) => e.predictedMrr > 0)
    .map((e) => (e.actualMrr - e.predictedMrr) / e.predictedMrr);

  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const std = (arr: number[]) => {
    const m = mean(arr);
    return Math.sqrt(arr.reduce((sum, x) => sum + Math.pow(x - m, 2), 0) / arr.length);
  };

  const materialCounts: Record<string, number> = {};
  for (const e of entries) {
    materialCounts[e.material] = (materialCounts[e.material] ?? 0) + 1;
  }

  const thicknesses = entries.map((e) => e.thickness);
  const timestamps = entries.map((e) => new Date(e.timestamp).getTime());

  return {
    raDeviation: {
      mean: mean(raDeviations) || 0,
      std: std(raDeviations) || 0,
      min: Math.min(...raDeviations) || 0,
      max: Math.max(...raDeviations) || 0,
    },
    mrrDeviation: {
      mean: mean(mrrDeviations) || 0,
      std: std(mrrDeviations) || 0,
      min: Math.min(...mrrDeviations) || 0,
      max: Math.max(...mrrDeviations) || 0,
    },
    materialDistribution: materialCounts,
    thicknessRange: {
      min: Math.min(...thicknesses),
      max: Math.max(...thicknesses),
    },
    timeRange: {
      start: new Date(Math.min(...timestamps)).toISOString(),
      end: new Date(Math.max(...timestamps)).toISOString(),
    },
  };
}

function validateFeedback(feedbackPath: string): ValidationResult {
  console.log(`\nValidating feedback data: ${feedbackPath}`);

  const content = fs.readFileSync(feedbackPath, "utf-8");
  let entries: FeedbackEntry[];

  try {
    const parsed = JSON.parse(content);
    entries = Array.isArray(parsed) ? parsed : parsed.entries ?? [parsed];
  } catch {
    throw new Error("Invalid JSON format");
  }

  const allIssues: ValidationResult["issues"] = [];

  for (let i = 0; i < entries.length; i++) {
    const entryIssues = validateEntry(entries[i], i);
    allIssues.push(...entryIssues);
  }

  const errors = allIssues.filter((i) => i.type === "error");
  const validEntries = entries.length - new Set(errors.map((e) => e.entryIndex)).size;
  const validityScore = validEntries / entries.length;

  const statistics = calculateStatistics(entries.filter((_, i) =>
    !errors.some((e) => e.entryIndex === i)
  ));

  const recommendations: string[] = [];

  if (entries.length < VALIDATION_RULES.minEntries) {
    recommendations.push(`Collect more data — minimum ${VALIDATION_RULES.minEntries} entries recommended`);
  }

  if (Object.keys(statistics.materialDistribution).length < 3) {
    recommendations.push("Diversify materials — more material types improve model generalization");
  }

  if (statistics.raDeviation.std > 0.3) {
    recommendations.push("High Ra deviation variance — check measurement consistency");
  }

  if (validityScore < 0.9) {
    recommendations.push("Fix validation errors before training — low data quality");
  }

  const readyForTraining = validityScore >= 0.9 && entries.length >= VALIDATION_RULES.minEntries;

  return {
    timestamp: new Date().toISOString(),
    inputFile: feedbackPath,
    totalEntries: entries.length,
    validEntries,
    invalidEntries: entries.length - validEntries,
    validityScore,
    issues: allIssues,
    statistics,
    recommendations,
    readyForTraining,
  };
}

function printResult(result: ValidationResult): void {
  console.log("\n" + "=".repeat(60));
  console.log("WEDM CALIBRATION VALIDATION RESULT");
  console.log("=".repeat(60));
  console.log(`File: ${result.inputFile}`);
  console.log(`Generated: ${result.timestamp}`);

  console.log("\n--- Summary ---");
  console.log(`Total Entries: ${result.totalEntries}`);
  console.log(`Valid: ${result.validEntries} (${(result.validityScore * 100).toFixed(1)}%)`);
  console.log(`Invalid: ${result.invalidEntries}`);
  console.log(`Ready for Training: ${result.readyForTraining ? "YES" : "NO"}`);

  if (result.issues.length > 0) {
    console.log("\n--- Issues ---");
    const errors = result.issues.filter((i) => i.type === "error");
    const warnings = result.issues.filter((i) => i.type === "warning");

    if (errors.length > 0) {
      console.log(`Errors (${errors.length}):`);
      errors.slice(0, 10).forEach((e) => {
        console.log(`  [${e.entryIndex}] ${e.programId}: ${e.message}`);
      });
      if (errors.length > 10) {
        console.log(`  ... and ${errors.length - 10} more errors`);
      }
    }

    if (warnings.length > 0) {
      console.log(`Warnings (${warnings.length}):`);
      warnings.slice(0, 10).forEach((w) => {
        console.log(`  [${w.entryIndex}] ${w.programId}: ${w.message}`);
      });
      if (warnings.length > 10) {
        console.log(`  ... and ${warnings.length - 10} more warnings`);
      }
    }
  }

  console.log("\n--- Statistics ---");
  console.log(`Ra Deviation: mean=${(result.statistics.raDeviation.mean * 100).toFixed(1)}%, std=${(result.statistics.raDeviation.std * 100).toFixed(1)}%`);
  console.log(`MRR Deviation: mean=${(result.statistics.mrrDeviation.mean * 100).toFixed(1)}%, std=${(result.statistics.mrrDeviation.std * 100).toFixed(1)}%`);
  console.log(`Materials: ${Object.keys(result.statistics.materialDistribution).join(", ")}`);
  console.log(`Thickness Range: ${result.statistics.thicknessRange.min}-${result.statistics.thicknessRange.max} mm`);

  if (result.recommendations.length > 0) {
    console.log("\n--- Recommendations ---");
    result.recommendations.forEach((r) => console.log(`  - ${r}`));
  }

  console.log("\n" + "=".repeat(60));
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  let feedbackPath = "";

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--feedback":
      case "-f":
        feedbackPath = args[++i];
        break;
      case "--help":
      case "-h":
        console.log("Usage: npx ts-node scripts/wedm_calibration_validator.ts [options]");
        console.log("\nOptions:");
        console.log("  --feedback, -f   Path to feedback JSON file");
        process.exit(0);
    }
  }

  if (!feedbackPath) {
    // Create sample feedback for demo
    feedbackPath = "sample_feedback.json";
    const sampleFeedback: FeedbackEntry[] = [
      { timestamp: "2026-04-15T10:00:00Z", programId: "O1234", material: "D2", thickness: 25, ecode: "E1847", predictedRa: 0.72, actualRa: 0.68, predictedMrr: 48.5, actualMrr: 45.2, wireBreaks: 0, cycleTime: 52 },
      { timestamp: "2026-04-15T12:00:00Z", programId: "O1235", material: "D2", thickness: 30, ecode: "E1847", predictedRa: 0.75, actualRa: 0.82, predictedMrr: 42.0, actualMrr: 38.5, wireBreaks: 1, cycleTime: 68 },
      { timestamp: "2026-04-15T14:00:00Z", programId: "O1236", material: "A2", thickness: 20, ecode: "E1234", predictedRa: 0.65, actualRa: 0.62, predictedMrr: 52.0, actualMrr: 55.8, wireBreaks: 0, cycleTime: 35 },
      { timestamp: "2026-04-15T16:00:00Z", programId: "O1237", material: "M2", thickness: 15, ecode: "E1456", predictedRa: 0.58, actualRa: 0.55, predictedMrr: 60.0, actualMrr: 62.3, wireBreaks: 0, cycleTime: 28 },
      { timestamp: "2026-04-16T08:00:00Z", programId: "O1238", material: "carbide", thickness: 10, ecode: "E2100", predictedRa: 0.45, actualRa: 0.48, predictedMrr: 25.0, actualMrr: 22.1, wireBreaks: 2, cycleTime: 45 },
    ];
    fs.writeFileSync(feedbackPath, JSON.stringify(sampleFeedback, null, 2));
    console.log(`Created sample feedback: ${feedbackPath}`);
  }

  try {
    const result = validateFeedback(feedbackPath);
    printResult(result);

    // Save validation result
    const resultPath = feedbackPath.replace(".json", "_validation.json");
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
    console.log(`Validation result saved: ${resultPath}`);

    process.exit(result.readyForTraining ? 0 : 1);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(2);
  }
}

main();
