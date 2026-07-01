/**
 * pac-bounds-validator.ts — USSH Phase 0.25
 * ==========================================
 *
 * Validates PAC (Probably Approximately Correct) bounds
 * for semantic dedup thresholds.
 *
 * Usage: npx tsx scripts/pac-bounds-validator.ts [--asset-type=engine]
 *
 * Theory: PAC learning, sample complexity, VC dimension bounds
 */

import fs from "fs";
import path from "path";

const STATE_DIR = path.join(process.cwd(), "data/state");
const REPORT_FILE = path.join(STATE_DIR, "pac-bounds-report.json");

interface PACBound {
  epsilon: number;
  delta: number;
  vcDimension: number;
  sampleComplexity: number;
  currentSamples: number;
  isSufficient: boolean;
  convergenceRatio: number;
}

interface AssetTypeReport {
  assetType: string;
  observations: number;
  threshold: number;
  confidence: number;
  pacBound: PACBound;
  recommendations: string[];
}

interface ValidationReport {
  timestamp: number;
  globalStatus: "converged" | "insufficient" | "partial";
  assetTypes: AssetTypeReport[];
  totalObservations: number;
  overallConvergence: number;
}

const VC_DIMENSION = 385; // embedding dimension + 1
const TARGET_EPSILON = 0.05;
const TARGET_DELTA = 0.01;

function computeSampleComplexity(vcDim: number, epsilon: number, delta: number): number {
  return Math.ceil(
    (1 / epsilon) * (vcDim * Math.log(1 / epsilon) + Math.log(1 / delta))
  );
}

function loadObservations(assetType: string): number {
  try {
    const thresholdFile = path.join(STATE_DIR, "adaptive-threshold-state.json");
    if (fs.existsSync(thresholdFile)) {
      const state = JSON.parse(fs.readFileSync(thresholdFile, "utf-8"));
      return state.observations?.[assetType]?.length || 0;
    }
  } catch {}
  return 0;
}

function generateAssetReport(assetType: string): AssetTypeReport {
  const observations = loadObservations(assetType);
  const sampleComplexity = computeSampleComplexity(VC_DIMENSION, TARGET_EPSILON, TARGET_DELTA);
  const isSufficient = observations >= sampleComplexity;
  const convergenceRatio = Math.min(1, observations / sampleComplexity);

  const pacBound: PACBound = {
    epsilon: TARGET_EPSILON,
    delta: TARGET_DELTA,
    vcDimension: VC_DIMENSION,
    sampleComplexity,
    currentSamples: observations,
    isSufficient,
    convergenceRatio,
  };

  const recommendations: string[] = [];

  if (!isSufficient) {
    const needed = sampleComplexity - observations;
    recommendations.push(`Need ${needed} more labeled pairs for ${assetType} (${(convergenceRatio * 100).toFixed(1)}% complete)`);
  }

  if (convergenceRatio < 0.1) {
    recommendations.push(`Consider active learning to accelerate threshold convergence`);
  }

  return {
    assetType,
    observations,
    threshold: 0.85, // Default, would be computed from observations
    confidence: convergenceRatio,
    pacBound,
    recommendations,
  };
}

function generateReport(): ValidationReport {
  const assetTypes = ["engine", "action", "formula", "hook", "skill"];
  const reports = assetTypes.map(generateAssetReport);

  const totalObservations = reports.reduce((sum, r) => sum + r.observations, 0);
  const convergedCount = reports.filter((r) => r.pacBound.isSufficient).length;
  const overallConvergence = convergedCount / reports.length;

  let globalStatus: "converged" | "insufficient" | "partial";
  if (convergedCount === reports.length) {
    globalStatus = "converged";
  } else if (convergedCount === 0) {
    globalStatus = "insufficient";
  } else {
    globalStatus = "partial";
  }

  const report: ValidationReport = {
    timestamp: Date.now(),
    globalStatus,
    assetTypes: reports,
    totalObservations,
    overallConvergence,
  };

  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

  return report;
}

function printReport(report: ValidationReport): void {
  console.log("\n=== PAC Bounds Validation Report ===");
  console.log(`Timestamp: ${new Date(report.timestamp).toISOString()}`);
  console.log(`Global Status: ${report.globalStatus.toUpperCase()}`);
  console.log(`Overall Convergence: ${(report.overallConvergence * 100).toFixed(1)}%`);
  console.log(`Total Observations: ${report.totalObservations}`);
  console.log("\nPer-Asset Analysis:");
  console.log("-".repeat(60));

  for (const asset of report.assetTypes) {
    const status = asset.pacBound.isSufficient ? "✓" : "✗";
    console.log(
      `${status} ${asset.assetType}: ${asset.observations}/${asset.pacBound.sampleComplexity} samples (${(asset.pacBound.convergenceRatio * 100).toFixed(1)}%)`
    );

    for (const rec of asset.recommendations) {
      console.log(`   → ${rec}`);
    }
  }

  console.log("\nPAC Parameters:");
  console.log(`  ε (error bound): ${TARGET_EPSILON}`);
  console.log(`  δ (confidence): ${TARGET_DELTA}`);
  console.log(`  VC dimension: ${VC_DIMENSION}`);
}

// Main
const report = generateReport();
printReport(report);
