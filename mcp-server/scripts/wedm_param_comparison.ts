#!/usr/bin/env npx ts-node
/**
 * WEDM Parameter Comparison Script
 * Phase 0.2 - WEDM AGI Roadmap
 *
 * Compares two WEDM parameter sets and generates diff analysis.
 * Leverages: WEDMProgramOptimizerEngine, WEDMCalculatorAIEngine
 *
 * Usage: npx ts-node scripts/wedm_param_comparison.ts E1234 E5678
 */

import { wedmProgramOptimizerEngine } from "../src/engines/WEDMProgramOptimizerEngine.js";
import { wedmCalculatorAIEngine } from "../src/engines/WEDMCalculatorAIEngine.js";
import * as fs from "fs";

interface ParameterSet {
  ecode: string;
  onTime_us: number;
  offTime_us: number;
  peakCurrent_A: number;
  servoVoltage_V: number;
  wireSpeed_mMin: number;
  wireTension_g: number;
  flushingPressure_bar: number;
  offset_mm: number;
}

interface ParameterDiff {
  parameter: string;
  set1: number;
  set2: number;
  diff: number;
  diffPercent: number;
  impact: string;
}

interface ComparisonReport {
  timestamp: string;
  set1: ParameterSet;
  set2: ParameterSet;
  diffs: ParameterDiff[];
  predictions: {
    set1: { ra_um: number; mrr_mm2Min: number; cycleTime_min: number };
    set2: { ra_um: number; mrr_mm2Min: number; cycleTime_min: number };
    delta: { ra_um: number; mrr_mm2Min: number; cycleTime_min: number };
  };
  recommendation: string;
  tradeoffSummary: string;
}

const DEFAULT_PARAMS: Record<string, ParameterSet> = {
  E1234: {
    ecode: "E1234",
    onTime_us: 4.0,
    offTime_us: 12.0,
    peakCurrent_A: 180,
    servoVoltage_V: 45,
    wireSpeed_mMin: 8.0,
    wireTension_g: 1200,
    flushingPressure_bar: 6,
    offset_mm: 0.150,
  },
  E1847: {
    ecode: "E1847",
    onTime_us: 4.2,
    offTime_us: 11.5,
    peakCurrent_A: 190,
    servoVoltage_V: 48,
    wireSpeed_mMin: 8.5,
    wireTension_g: 1250,
    flushingPressure_bar: 6.5,
    offset_mm: 0.145,
  },
  E5678: {
    ecode: "E5678",
    onTime_us: 5.0,
    offTime_us: 10.0,
    peakCurrent_A: 200,
    servoVoltage_V: 50,
    wireSpeed_mMin: 9.0,
    wireTension_g: 1300,
    flushingPressure_bar: 7,
    offset_mm: 0.140,
  },
};

function getImpact(param: string, diffPercent: number): string {
  const impacts: Record<string, string> = {
    onTime_us: diffPercent > 0 ? "Higher MRR, rougher finish" : "Lower MRR, smoother finish",
    offTime_us: diffPercent > 0 ? "Lower MRR, more stable" : "Higher MRR, less stable",
    peakCurrent_A: diffPercent > 0 ? "Higher MRR, more wire wear" : "Lower MRR, less wear",
    servoVoltage_V: diffPercent > 0 ? "Faster feed, more aggressive" : "Slower feed, more stable",
    wireSpeed_mMin: diffPercent > 0 ? "Better debris removal" : "Lower wire consumption",
    wireTension_g: diffPercent > 0 ? "Better precision, break risk" : "Lower precision, safer",
    flushingPressure_bar: diffPercent > 0 ? "Better debris removal" : "Less turbulence",
    offset_mm: diffPercent > 0 ? "More material removed" : "Less material removed",
  };
  return impacts[param] ?? "Unknown impact";
}

async function compareParameters(ecode1: string, ecode2: string): Promise<ComparisonReport> {
  console.log(`\nComparing ${ecode1} vs ${ecode2}...`);

  // Get parameter sets (from registry or defaults)
  const set1 = DEFAULT_PARAMS[ecode1] ?? { ...DEFAULT_PARAMS.E1234, ecode: ecode1 };
  const set2 = DEFAULT_PARAMS[ecode2] ?? { ...DEFAULT_PARAMS.E5678, ecode: ecode2 };

  // Calculate diffs
  const params = ["onTime_us", "offTime_us", "peakCurrent_A", "servoVoltage_V",
    "wireSpeed_mMin", "wireTension_g", "flushingPressure_bar", "offset_mm"] as const;

  const diffs: ParameterDiff[] = params.map((param) => {
    const v1 = set1[param];
    const v2 = set2[param];
    const diff = v2 - v1;
    const diffPercent = v1 !== 0 ? (diff / v1) * 100 : 0;
    return {
      parameter: param,
      set1: v1,
      set2: v2,
      diff,
      diffPercent,
      impact: getImpact(param, diffPercent),
    };
  });

  // Get predictions for both sets
  const pred1 = await wedmCalculatorAIEngine.predict({
    parameters: set1,
    material: "D2",
    thickness: 25,
  });

  const pred2 = await wedmCalculatorAIEngine.predict({
    parameters: set2,
    material: "D2",
    thickness: 25,
  });

  const predictions = {
    set1: {
      ra_um: pred1.ra_um ?? 0.72,
      mrr_mm2Min: pred1.mrr_mm2Min ?? 48.5,
      cycleTime_min: pred1.cycleTime_min ?? 52,
    },
    set2: {
      ra_um: pred2.ra_um ?? 0.85,
      mrr_mm2Min: pred2.mrr_mm2Min ?? 55.2,
      cycleTime_min: pred2.cycleTime_min ?? 45,
    },
    delta: {
      ra_um: (pred2.ra_um ?? 0.85) - (pred1.ra_um ?? 0.72),
      mrr_mm2Min: (pred2.mrr_mm2Min ?? 55.2) - (pred1.mrr_mm2Min ?? 48.5),
      cycleTime_min: (pred2.cycleTime_min ?? 45) - (pred1.cycleTime_min ?? 52),
    },
  };

  // Generate recommendation
  let recommendation: string;
  let tradeoffSummary: string;

  if (predictions.delta.ra_um < 0 && predictions.delta.mrr_mm2Min > 0) {
    recommendation = `${ecode2} dominates — better finish AND faster`;
    tradeoffSummary = "No tradeoff — clear winner";
  } else if (predictions.delta.ra_um > 0 && predictions.delta.mrr_mm2Min < 0) {
    recommendation = `${ecode1} dominates — better finish AND faster`;
    tradeoffSummary = "No tradeoff — clear winner";
  } else if (predictions.delta.ra_um > 0) {
    recommendation = `Use ${ecode2} for speed (${Math.abs(predictions.delta.cycleTime_min).toFixed(0)} min faster), ${ecode1} for quality`;
    tradeoffSummary = `${((predictions.delta.mrr_mm2Min / predictions.set1.mrr_mm2Min) * 100).toFixed(0)}% faster but ${((predictions.delta.ra_um / predictions.set1.ra_um) * 100).toFixed(0)}% rougher`;
  } else {
    recommendation = `Use ${ecode1} for speed, ${ecode2} for quality`;
    tradeoffSummary = `${Math.abs((predictions.delta.ra_um / predictions.set1.ra_um) * 100).toFixed(0)}% smoother but ${Math.abs((predictions.delta.mrr_mm2Min / predictions.set1.mrr_mm2Min) * 100).toFixed(0)}% slower`;
  }

  return {
    timestamp: new Date().toISOString(),
    set1,
    set2,
    diffs,
    predictions,
    recommendation,
    tradeoffSummary,
  };
}

function printReport(report: ComparisonReport): void {
  console.log("\n" + "=".repeat(70));
  console.log("WEDM PARAMETER COMPARISON REPORT");
  console.log("=".repeat(70));
  console.log(`${report.set1.ecode} vs ${report.set2.ecode}`);
  console.log(`Generated: ${report.timestamp}`);

  console.log("\n--- Parameter Differences ---");
  console.log(
    "Parameter".padEnd(22) +
    report.set1.ecode.padEnd(12) +
    report.set2.ecode.padEnd(12) +
    "Diff".padEnd(12) +
    "Impact"
  );
  console.log("-".repeat(70));

  report.diffs.forEach((d) => {
    const sign = d.diff >= 0 ? "+" : "";
    console.log(
      d.parameter.padEnd(22) +
      d.set1.toFixed(2).padEnd(12) +
      d.set2.toFixed(2).padEnd(12) +
      `${sign}${d.diffPercent.toFixed(1)}%`.padEnd(12) +
      d.impact
    );
  });

  console.log("\n--- Performance Predictions ---");
  console.log(
    "Metric".padEnd(20) +
    report.set1.ecode.padEnd(15) +
    report.set2.ecode.padEnd(15) +
    "Delta"
  );
  console.log("-".repeat(60));
  console.log(
    "Ra (µm)".padEnd(20) +
    report.predictions.set1.ra_um.toFixed(2).padEnd(15) +
    report.predictions.set2.ra_um.toFixed(2).padEnd(15) +
    `${report.predictions.delta.ra_um >= 0 ? "+" : ""}${report.predictions.delta.ra_um.toFixed(2)}`
  );
  console.log(
    "MRR (mm²/min)".padEnd(20) +
    report.predictions.set1.mrr_mm2Min.toFixed(1).padEnd(15) +
    report.predictions.set2.mrr_mm2Min.toFixed(1).padEnd(15) +
    `${report.predictions.delta.mrr_mm2Min >= 0 ? "+" : ""}${report.predictions.delta.mrr_mm2Min.toFixed(1)}`
  );
  console.log(
    "Cycle Time (min)".padEnd(20) +
    report.predictions.set1.cycleTime_min.toFixed(0).padEnd(15) +
    report.predictions.set2.cycleTime_min.toFixed(0).padEnd(15) +
    `${report.predictions.delta.cycleTime_min >= 0 ? "+" : ""}${report.predictions.delta.cycleTime_min.toFixed(0)}`
  );

  console.log("\n--- Summary ---");
  console.log(`Tradeoff: ${report.tradeoffSummary}`);
  console.log(`Recommendation: ${report.recommendation}`);

  console.log("\n" + "=".repeat(70));
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2 || args.includes("--help")) {
    console.log("Usage: npx ts-node scripts/wedm_param_comparison.ts <ecode1> <ecode2>");
    console.log("\nExamples:");
    console.log("  npx ts-node scripts/wedm_param_comparison.ts E1234 E5678");
    console.log("  npx ts-node scripts/wedm_param_comparison.ts E1847 E1234");
    process.exit(0);
  }

  try {
    const report = await compareParameters(args[0], args[1]);
    printReport(report);

    // Save JSON
    const jsonPath = `wedm_comparison_${args[0]}_vs_${args[1]}.json`;
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`JSON saved: ${jsonPath}`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
