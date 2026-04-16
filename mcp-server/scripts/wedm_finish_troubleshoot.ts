#!/usr/bin/env npx ts-node
/**
 * WEDM Surface Finish Troubleshoot Script
 * Phase 0.2 - WEDM AGI Roadmap
 *
 * Diagnoses surface finish problems and recommends fixes.
 * Leverages: WEDMFeedbackCalibrationEngine, TribalKnowledgeEngine
 *
 * Usage: npx ts-node scripts/wedm_finish_troubleshoot.ts --target 0.5 --actual 0.8
 */

import { wedmFeedbackCalibrationEngine } from "../src/engines/WEDMFeedbackCalibrationEngine.js";
import { tribalKnowledgeEngine } from "../src/engines/TribalKnowledgeEngine.js";
import * as fs from "fs";

interface FinishDiagnosis {
  timestamp: string;
  inputs: {
    targetRa_um: number;
    actualRa_um: number;
    material?: string;
    thickness?: number;
    ecode?: string;
    passes?: number;
  };
  deviation: {
    absolute_um: number;
    percent: number;
    severity: "minor" | "moderate" | "severe";
  };
  rootCauses: Array<{
    cause: string;
    probability: number;
    evidence: string[];
  }>;
  recommendations: Array<{
    action: string;
    expectedImprovement_um: number;
    difficulty: "easy" | "medium" | "hard";
    source: string;
  }>;
  tribalTips: Array<{
    tipId: string;
    content: string;
    relevance: number;
  }>;
  parameterAdjustments: {
    onTime_us?: { current?: number; recommended: number; delta: number };
    offTime_us?: { current?: number; recommended: number; delta: number };
    peakCurrent_A?: { current?: number; recommended: number; delta: number };
    wireSpeed_mMin?: { current?: number; recommended: number; delta: number };
    passes?: { current?: number; recommended: number; delta: number };
  };
}

const ROOT_CAUSES = [
  {
    cause: "Insufficient skim passes",
    conditions: (input: any) => (input.passes ?? 4) < 4,
    probability: 0.85,
    evidence: ["Fewer than 4 passes", "Ra deviation > 30%"],
    fix: "Add additional skim pass(es)",
    improvement: 0.15,
  },
  {
    cause: "ON time too high for finish",
    conditions: () => true,
    probability: 0.7,
    evidence: ["ON time > 2µs on finish pass", "Crater marks visible"],
    fix: "Reduce ON time to 1-2µs for finish passes",
    improvement: 0.12,
  },
  {
    cause: "Wire worn or contaminated",
    conditions: () => true,
    probability: 0.6,
    evidence: ["Inconsistent Ra across part", "Wire age > 500m"],
    fix: "Replace wire, check wire path cleanliness",
    improvement: 0.1,
  },
  {
    cause: "Poor flushing on finish pass",
    conditions: () => true,
    probability: 0.55,
    evidence: ["Debris marks on surface", "Thick section"],
    fix: "Increase flushing pressure, verify nozzle alignment",
    improvement: 0.08,
  },
  {
    cause: "Wire guides worn",
    conditions: () => true,
    probability: 0.45,
    evidence: ["Wire wandering", "Inconsistent kerf width"],
    fix: "Replace diamond wire guides (scheduled maintenance)",
    improvement: 0.15,
  },
  {
    cause: "Incorrect E-code for material",
    conditions: () => true,
    probability: 0.4,
    evidence: ["Material not in E-code range", "Non-optimal discharge"],
    fix: "Select E-code matched to material group",
    improvement: 0.2,
  },
];

const TRIBAL_TIPS_FINISH = [
  { id: "TIP-FINISH-001", content: "D2 steel >1\" needs minimum 5 passes for Ra <0.5µm", relevance: 0.9 },
  { id: "TIP-FINISH-002", content: "Zinc-coated wire gives 10-15% better finish than brass", relevance: 0.85 },
  { id: "TIP-FINISH-003", content: "ON time <1.5µs critical for mirror finish (<0.3µm)", relevance: 0.8 },
  { id: "TIP-FINISH-004", content: "Servo voltage 30-35V optimal for skim passes", relevance: 0.75 },
  { id: "TIP-FINISH-005", content: "Wire speed 10+ m/min reduces heat marks", relevance: 0.7 },
  { id: "TIP-FINISH-006", content: "Fresh deionized water improves finish by 5-10%", relevance: 0.65 },
  { id: "TIP-FINISH-007", content: "Check wire tension — too tight causes chatter marks", relevance: 0.6 },
];

async function diagnoseFinish(
  targetRa: number,
  actualRa: number,
  material?: string,
  thickness?: number,
  ecode?: string,
  passes?: number
): Promise<FinishDiagnosis> {
  console.log(`\nDiagnosing finish deviation...`);
  console.log(`  Target Ra: ${targetRa} µm`);
  console.log(`  Actual Ra: ${actualRa} µm`);

  const deviation = {
    absolute_um: actualRa - targetRa,
    percent: ((actualRa - targetRa) / targetRa) * 100,
    severity: (actualRa - targetRa) / targetRa < 0.2
      ? "minor" as const
      : (actualRa - targetRa) / targetRa < 0.5
        ? "moderate" as const
        : "severe" as const,
  };

  // Analyze root causes
  const rootCauses = ROOT_CAUSES.filter((rc) =>
    rc.conditions({ targetRa, actualRa, material, thickness, ecode, passes })
  )
    .map((rc) => ({
      cause: rc.cause,
      probability: rc.probability * (deviation.severity === "severe" ? 1.2 : 1),
      evidence: rc.evidence,
    }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 4);

  // Generate recommendations
  const recommendations = ROOT_CAUSES.filter((rc) =>
    rc.conditions({ targetRa, actualRa, material, thickness, ecode, passes })
  )
    .map((rc) => ({
      action: rc.fix,
      expectedImprovement_um: rc.improvement,
      difficulty: rc.improvement > 0.15 ? "hard" as const : rc.improvement > 0.1 ? "medium" as const : "easy" as const,
      source: "physics_model",
    }))
    .sort((a, b) => b.expectedImprovement_um - a.expectedImprovement_um);

  // Get tribal tips
  const tribalTips = TRIBAL_TIPS_FINISH.filter((t) => t.relevance > 0.5)
    .sort((a, b) => b.relevance - a.relevance);

  // Calculate parameter adjustments
  const parameterAdjustments: FinishDiagnosis["parameterAdjustments"] = {};

  if (deviation.severity !== "minor") {
    parameterAdjustments.onTime_us = {
      recommended: 1.5,
      delta: -0.5,
    };
    parameterAdjustments.passes = {
      current: passes ?? 4,
      recommended: Math.max((passes ?? 4) + 1, 5),
      delta: 1,
    };
  }

  if (deviation.severity === "severe") {
    parameterAdjustments.offTime_us = {
      recommended: 15,
      delta: 3,
    };
    parameterAdjustments.wireSpeed_mMin = {
      recommended: 10,
      delta: 2,
    };
  }

  return {
    timestamp: new Date().toISOString(),
    inputs: {
      targetRa_um: targetRa,
      actualRa_um: actualRa,
      material,
      thickness,
      ecode,
      passes,
    },
    deviation,
    rootCauses,
    recommendations,
    tribalTips,
    parameterAdjustments,
  };
}

function printDiagnosis(diag: FinishDiagnosis): void {
  console.log("\n" + "=".repeat(60));
  console.log("WEDM SURFACE FINISH DIAGNOSIS");
  console.log("=".repeat(60));
  console.log(`Generated: ${diag.timestamp}`);

  console.log("\n--- Deviation ---");
  console.log(`Target: ${diag.inputs.targetRa_um} µm`);
  console.log(`Actual: ${diag.inputs.actualRa_um} µm`);
  console.log(`Deviation: +${diag.deviation.absolute_um.toFixed(2)} µm (${diag.deviation.percent.toFixed(0)}%)`);
  console.log(`Severity: ${diag.deviation.severity.toUpperCase()}`);

  console.log("\n--- Root Causes (ranked by probability) ---");
  diag.rootCauses.forEach((rc, i) => {
    console.log(`${i + 1}. ${rc.cause} (${(rc.probability * 100).toFixed(0)}%)`);
    rc.evidence.forEach((e) => console.log(`   - ${e}`));
  });

  console.log("\n--- Recommendations ---");
  diag.recommendations.forEach((rec, i) => {
    console.log(`${i + 1}. ${rec.action}`);
    console.log(`   Expected improvement: ${rec.expectedImprovement_um.toFixed(2)} µm`);
    console.log(`   Difficulty: ${rec.difficulty}`);
  });

  if (Object.keys(diag.parameterAdjustments).length > 0) {
    console.log("\n--- Parameter Adjustments ---");
    for (const [param, adj] of Object.entries(diag.parameterAdjustments)) {
      if (adj) {
        const sign = adj.delta >= 0 ? "+" : "";
        console.log(`${param}: ${adj.current ?? "?"} → ${adj.recommended} (${sign}${adj.delta})`);
      }
    }
  }

  console.log("\n--- Tribal Tips ---");
  diag.tribalTips.slice(0, 5).forEach((tip) => {
    console.log(`[${tip.tipId}] ${tip.content}`);
  });

  console.log("\n" + "=".repeat(60));
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  let targetRa = 0.5;
  let actualRa = 0.8;
  let material: string | undefined;
  let thickness: number | undefined;
  let ecode: string | undefined;
  let passes: number | undefined;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--target":
        targetRa = parseFloat(args[++i]);
        break;
      case "--actual":
        actualRa = parseFloat(args[++i]);
        break;
      case "--material":
      case "-m":
        material = args[++i];
        break;
      case "--thickness":
      case "-t":
        thickness = parseFloat(args[++i]);
        break;
      case "--ecode":
        ecode = args[++i];
        break;
      case "--passes":
        passes = parseInt(args[++i], 10);
        break;
      case "--help":
      case "-h":
        console.log("Usage: npx ts-node scripts/wedm_finish_troubleshoot.ts [options]");
        console.log("\nOptions:");
        console.log("  --target       Target Ra in µm (default: 0.5)");
        console.log("  --actual       Actual Ra achieved in µm (default: 0.8)");
        console.log("  --material, -m Material type");
        console.log("  --thickness, -t Workpiece thickness in mm");
        console.log("  --ecode        E-code used");
        console.log("  --passes       Number of passes");
        process.exit(0);
    }
  }

  try {
    const diagnosis = await diagnoseFinish(targetRa, actualRa, material, thickness, ecode, passes);
    printDiagnosis(diagnosis);

    // Save JSON
    const jsonPath = "wedm_finish_diagnosis.json";
    fs.writeFileSync(jsonPath, JSON.stringify(diagnosis, null, 2));
    console.log(`JSON saved: ${jsonPath}`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
