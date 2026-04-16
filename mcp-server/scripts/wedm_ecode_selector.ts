#!/usr/bin/env npx ts-node
/**
 * WEDM E-Code Selector Script
 * Phase 0.2 - WEDM AGI Roadmap
 *
 * Selects optimal E-code family based on material, machine, and requirements.
 * Leverages: EDMMaterialMachineWireEngine, WEDMNeuralTrainingEngine
 *
 * Usage: npx ts-node scripts/wedm_ecode_selector.ts --material D2 --thickness 25 --machine FA-20S
 */

import { edmMaterialMachineWireEngine } from "../src/engines/EDMMaterialMachineWireEngine.js";
import { wedmNeuralTrainingEngine } from "../src/engines/WEDMNeuralTrainingEngine.js";
import * as fs from "fs";

interface ECodeRecommendation {
  ecode: string;
  family: string;
  confidence: number;
  parameters: {
    onTime_us: number;
    offTime_us: number;
    peakCurrent_A: number;
    servoVoltage_V: number;
    wireSpeed_mMin: number;
    wireTension_g: number;
  };
  predictions: {
    ra_um: number;
    mrr_mm2Min: number;
    wireBreakProb: number;
  };
  alternatives: Array<{
    ecode: string;
    tradeoff: string;
    confidence: number;
  }>;
  warnings: string[];
}

interface SelectionInput {
  material: string;
  thickness: number;
  machine: string;
  wireType?: string;
  wireDiameter?: number;
  targetRa?: number;
  targetMrr?: number;
  priority?: "quality" | "speed" | "balance";
}

async function selectECode(input: SelectionInput): Promise<ECodeRecommendation> {
  console.log(`\nSelecting E-code for:`);
  console.log(`  Material: ${input.material}`);
  console.log(`  Thickness: ${input.thickness} mm`);
  console.log(`  Machine: ${input.machine}`);
  console.log(`  Priority: ${input.priority ?? "balance"}`);

  // Get material-machine-wire compatibility
  const compatibility = await edmMaterialMachineWireEngine.getCompatibility({
    material: input.material,
    machine: input.machine,
    wireType: input.wireType ?? "brass",
    wireDiameter: input.wireDiameter ?? 0.25,
  });

  // Get neural predictions for candidate E-codes
  const candidates = compatibility.recommendedECodes ?? [
    "E1847", "E1234", "E1456", "E1678"
  ];

  const predictions = await Promise.all(
    candidates.map(async (ecode) => {
      const pred = await wedmNeuralTrainingEngine.predict({
        ecode,
        material: input.material,
        thickness: input.thickness,
        machine: input.machine,
      });
      return { ecode, ...pred };
    })
  );

  // Rank by priority
  const ranked = predictions.sort((a, b) => {
    if (input.priority === "quality") {
      return a.ra_um - b.ra_um; // Lower Ra is better
    } else if (input.priority === "speed") {
      return b.mrr_mm2Min - a.mrr_mm2Min; // Higher MRR is better
    } else {
      // Balance: Pareto ranking
      const scoreA = (1 - a.ra_um / 2) * 0.5 + (a.mrr_mm2Min / 100) * 0.5;
      const scoreB = (1 - b.ra_um / 2) * 0.5 + (b.mrr_mm2Min / 100) * 0.5;
      return scoreB - scoreA;
    }
  });

  const best = ranked[0];
  const ecodeParams = compatibility.ecodeParameters?.[best.ecode] ?? {
    onTime_us: 4.2,
    offTime_us: 12.0,
    peakCurrent_A: 180,
    servoVoltage_V: 45,
    wireSpeed_mMin: 8.5,
    wireTension_g: 1200,
  };

  const warnings: string[] = [];
  if (input.thickness > 50) {
    warnings.push("Thick section (>50mm) may require adjusted flushing");
  }
  if (best.wireBreakProb > 0.1) {
    warnings.push("Wire break probability >10% — consider reducing power");
  }
  if (compatibility.warnings) {
    warnings.push(...compatibility.warnings);
  }

  return {
    ecode: best.ecode,
    family: best.ecode.substring(0, 2),
    confidence: best.confidence ?? 0.85,
    parameters: ecodeParams,
    predictions: {
      ra_um: best.ra_um,
      mrr_mm2Min: best.mrr_mm2Min,
      wireBreakProb: best.wireBreakProb ?? 0.03,
    },
    alternatives: ranked.slice(1, 4).map((r) => ({
      ecode: r.ecode,
      tradeoff: r.ra_um < best.ra_um
        ? `${((best.ra_um - r.ra_um) / best.ra_um * 100).toFixed(0)}% smoother but ${((best.mrr_mm2Min - r.mrr_mm2Min) / best.mrr_mm2Min * 100).toFixed(0)}% slower`
        : `${((r.mrr_mm2Min - best.mrr_mm2Min) / best.mrr_mm2Min * 100).toFixed(0)}% faster but ${((r.ra_um - best.ra_um) / best.ra_um * 100).toFixed(0)}% rougher`,
      confidence: r.confidence ?? 0.75,
    })),
    warnings,
  };
}

function printRecommendation(rec: ECodeRecommendation): void {
  console.log("\n" + "=".repeat(60));
  console.log("E-CODE RECOMMENDATION");
  console.log("=".repeat(60));
  console.log(`Recommended: ${rec.ecode} (Family: ${rec.family})`);
  console.log(`Confidence: ${(rec.confidence * 100).toFixed(1)}%`);

  console.log("\n--- Parameters ---");
  console.log(`ON Time: ${rec.parameters.onTime_us} µs`);
  console.log(`OFF Time: ${rec.parameters.offTime_us} µs`);
  console.log(`Peak Current: ${rec.parameters.peakCurrent_A} A`);
  console.log(`Servo Voltage: ${rec.parameters.servoVoltage_V} V`);
  console.log(`Wire Speed: ${rec.parameters.wireSpeed_mMin} m/min`);
  console.log(`Wire Tension: ${rec.parameters.wireTension_g} g`);

  console.log("\n--- Predictions ---");
  console.log(`Surface Finish (Ra): ${rec.predictions.ra_um.toFixed(2)} µm`);
  console.log(`Removal Rate (MRR): ${rec.predictions.mrr_mm2Min.toFixed(1)} mm²/min`);
  console.log(`Wire Break Prob: ${(rec.predictions.wireBreakProb * 100).toFixed(1)}%`);

  if (rec.alternatives.length > 0) {
    console.log("\n--- Alternatives ---");
    rec.alternatives.forEach((alt) => {
      console.log(`  ${alt.ecode}: ${alt.tradeoff} (${(alt.confidence * 100).toFixed(0)}% conf)`);
    });
  }

  if (rec.warnings.length > 0) {
    console.log("\n--- Warnings ---");
    rec.warnings.forEach((w) => console.log(`  ⚠ ${w}`));
  }

  console.log("\n" + "=".repeat(60));
}

function parseArgs(args: string[]): SelectionInput {
  const input: SelectionInput = {
    material: "D2",
    thickness: 25,
    machine: "FA-20S",
    priority: "balance",
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--material":
      case "-m":
        input.material = args[++i];
        break;
      case "--thickness":
      case "-t":
        input.thickness = parseFloat(args[++i]);
        break;
      case "--machine":
        input.machine = args[++i];
        break;
      case "--wire":
        input.wireType = args[++i];
        break;
      case "--diameter":
        input.wireDiameter = parseFloat(args[++i]);
        break;
      case "--target-ra":
        input.targetRa = parseFloat(args[++i]);
        break;
      case "--target-mrr":
        input.targetMrr = parseFloat(args[++i]);
        break;
      case "--priority":
      case "-p":
        input.priority = args[++i] as "quality" | "speed" | "balance";
        break;
    }
  }

  return input;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: npx ts-node scripts/wedm_ecode_selector.ts [options]");
    console.log("\nOptions:");
    console.log("  --material, -m   Material type (e.g., D2, A2, M2, S7)");
    console.log("  --thickness, -t  Workpiece thickness in mm");
    console.log("  --machine        Machine model (e.g., FA-20S)");
    console.log("  --wire           Wire type (brass, zinc, tungsten)");
    console.log("  --diameter       Wire diameter in mm");
    console.log("  --target-ra      Target Ra in µm");
    console.log("  --target-mrr     Target MRR in mm²/min");
    console.log("  --priority, -p   Optimization priority (quality|speed|balance)");
    process.exit(0);
  }

  try {
    const input = parseArgs(args);
    const recommendation = await selectECode(input);
    printRecommendation(recommendation);

    // Save JSON output
    const jsonPath = `wedm_ecode_${input.material}_${input.thickness}mm.json`;
    fs.writeFileSync(jsonPath, JSON.stringify(recommendation, null, 2));
    console.log(`JSON saved: ${jsonPath}`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
