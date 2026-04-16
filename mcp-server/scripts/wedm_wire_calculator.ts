#!/usr/bin/env npx ts-node
/**
 * WEDM Wire Consumption Calculator Script
 * Phase 0.2 - WEDM AGI Roadmap
 *
 * Estimates wire consumption based on contour, passes, and material.
 * Uses Kunieda MRR model for physics-based estimation.
 *
 * Usage: npx ts-node scripts/wedm_wire_calculator.ts --perimeter 500 --passes 4
 */

import * as fs from "fs";

interface WireCalculation {
  timestamp: string;
  inputs: {
    perimeter_mm: number;
    thickness_mm: number;
    passes: number;
    wireType: string;
    wireDiameter_mm: number;
    wireSpeed_mMin: number;
  };
  consumption: {
    wire_m: number;
    wire_kg: number;
    cost_usd: number;
    spoolsRequired: number;
  };
  byPass: Array<{
    pass: number;
    type: "roughing" | "skim" | "finish";
    wire_m: number;
    time_min: number;
  }>;
  cycleTime: {
    total_min: number;
    cutting_min: number;
    threading_min: number;
    positioning_min: number;
  };
  costBreakdown: {
    wire_usd: number;
    machineTime_usd: number;
    total_usd: number;
  };
}

interface WireType {
  name: string;
  density_kgM3: number;
  pricePerKg_usd: number;
  spoolLength_m: number;
  typicalSpeed_mMin: number;
}

const WIRE_TYPES: Record<string, WireType> = {
  brass: {
    name: "Brass",
    density_kgM3: 8500,
    pricePerKg_usd: 15,
    spoolLength_m: 25000,
    typicalSpeed_mMin: 8,
  },
  zinc: {
    name: "Zinc-coated",
    density_kgM3: 7100,
    pricePerKg_usd: 25,
    spoolLength_m: 20000,
    typicalSpeed_mMin: 10,
  },
  tungsten: {
    name: "Tungsten",
    density_kgM3: 19300,
    pricePerKg_usd: 150,
    spoolLength_m: 10000,
    typicalSpeed_mMin: 6,
  },
  moly: {
    name: "Molybdenum",
    density_kgM3: 10200,
    pricePerKg_usd: 80,
    spoolLength_m: 15000,
    typicalSpeed_mMin: 7,
  },
};

// Kunieda MRR model constants
const KUNIEDA = {
  // MRR = (Ie × ton × fp) / (ρ × Ce)
  // Simplified to MRR = k × I × ton where k depends on material
  materialFactors: {
    steel: 0.8,
    carbide: 0.4,
    aluminum: 1.2,
    copper: 1.0,
    titanium: 0.5,
  } as Record<string, number>,
  defaultMRR_mm2Min: 45, // mm²/min for D2 steel with standard params
};

function calculateWireConsumption(
  perimeter_mm: number,
  thickness_mm: number,
  passes: number,
  wireType: string,
  wireDiameter_mm: number,
  material: string = "steel"
): WireCalculation {
  const wire = WIRE_TYPES[wireType] ?? WIRE_TYPES.brass;
  const materialFactor = KUNIEDA.materialFactors[material] ?? 0.8;

  // Calculate MRR and time per pass
  const baseMRR = KUNIEDA.defaultMRR_mm2Min * materialFactor;

  const byPass: WireCalculation["byPass"] = [];
  let totalWire_m = 0;
  let totalCuttingTime_min = 0;

  for (let p = 1; p <= passes; p++) {
    const isRoughing = p === 1;
    const isFinish = p === passes;
    const type = isRoughing ? "roughing" : isFinish ? "finish" : "skim";

    // MRR varies by pass type
    const passMRR = isRoughing ? baseMRR : isFinish ? baseMRR * 0.4 : baseMRR * 0.6;
    const cutArea = perimeter_mm * thickness_mm;
    const time_min = cutArea / passMRR / 60;

    // Wire consumption = time × wire speed × safety factor
    const safetyFactor = 1.15; // 15% extra for threading, breaks, etc.
    const wire_m = time_min * wire.typicalSpeed_mMin * safetyFactor;

    byPass.push({
      pass: p,
      type,
      wire_m: Math.round(wire_m * 10) / 10,
      time_min: Math.round(time_min * 10) / 10,
    });

    totalWire_m += wire_m;
    totalCuttingTime_min += time_min;
  }

  // Calculate weight and cost
  const crossSection = Math.PI * Math.pow(wireDiameter_mm / 2, 2); // mm²
  const wire_kg = (totalWire_m * crossSection * wire.density_kgM3) / 1e9; // Convert mm³ to m³
  const cost_usd = wire_kg * wire.pricePerKg_usd;
  const spoolsRequired = Math.ceil(totalWire_m / wire.spoolLength_m);

  // Threading and positioning time
  const threadingTime_min = passes * 2; // ~2 min per threading
  const positioningTime_min = passes * 1; // ~1 min per pass positioning
  const totalTime_min = totalCuttingTime_min + threadingTime_min + positioningTime_min;

  // Machine time cost (typical $60/hr)
  const machineRate_usdHr = 60;
  const machineTime_usd = (totalTime_min / 60) * machineRate_usdHr;

  return {
    timestamp: new Date().toISOString(),
    inputs: {
      perimeter_mm,
      thickness_mm,
      passes,
      wireType,
      wireDiameter_mm,
      wireSpeed_mMin: wire.typicalSpeed_mMin,
    },
    consumption: {
      wire_m: Math.round(totalWire_m * 10) / 10,
      wire_kg: Math.round(wire_kg * 1000) / 1000,
      cost_usd: Math.round(cost_usd * 100) / 100,
      spoolsRequired,
    },
    byPass,
    cycleTime: {
      total_min: Math.round(totalTime_min * 10) / 10,
      cutting_min: Math.round(totalCuttingTime_min * 10) / 10,
      threading_min: threadingTime_min,
      positioning_min: positioningTime_min,
    },
    costBreakdown: {
      wire_usd: Math.round(cost_usd * 100) / 100,
      machineTime_usd: Math.round(machineTime_usd * 100) / 100,
      total_usd: Math.round((cost_usd + machineTime_usd) * 100) / 100,
    },
  };
}

function printCalculation(calc: WireCalculation): void {
  console.log("\n" + "=".repeat(60));
  console.log("WEDM WIRE CONSUMPTION CALCULATION");
  console.log("=".repeat(60));
  console.log(`Generated: ${calc.timestamp}`);

  console.log("\n--- Inputs ---");
  console.log(`Perimeter: ${calc.inputs.perimeter_mm} mm`);
  console.log(`Thickness: ${calc.inputs.thickness_mm} mm`);
  console.log(`Passes: ${calc.inputs.passes}`);
  console.log(`Wire: ${calc.inputs.wireType} ${calc.inputs.wireDiameter_mm}mm`);
  console.log(`Wire Speed: ${calc.inputs.wireSpeed_mMin} m/min`);

  console.log("\n--- Per-Pass Breakdown ---");
  console.log("Pass".padEnd(8) + "Type".padEnd(12) + "Wire (m)".padEnd(12) + "Time (min)");
  console.log("-".repeat(44));
  calc.byPass.forEach((p) => {
    console.log(
      `${p.pass}`.padEnd(8) +
      p.type.padEnd(12) +
      `${p.wire_m}`.padEnd(12) +
      `${p.time_min}`
    );
  });

  console.log("\n--- Consumption ---");
  console.log(`Total Wire: ${calc.consumption.wire_m} m (${calc.consumption.wire_kg} kg)`);
  console.log(`Wire Cost: $${calc.consumption.cost_usd}`);
  console.log(`Spools Required: ${calc.consumption.spoolsRequired}`);

  console.log("\n--- Cycle Time ---");
  console.log(`Total: ${calc.cycleTime.total_min} min`);
  console.log(`  Cutting: ${calc.cycleTime.cutting_min} min`);
  console.log(`  Threading: ${calc.cycleTime.threading_min} min`);
  console.log(`  Positioning: ${calc.cycleTime.positioning_min} min`);

  console.log("\n--- Cost Breakdown ---");
  console.log(`Wire: $${calc.costBreakdown.wire_usd}`);
  console.log(`Machine Time: $${calc.costBreakdown.machineTime_usd}`);
  console.log(`Total: $${calc.costBreakdown.total_usd}`);

  console.log("\n" + "=".repeat(60));
}

function parseArgs(args: string[]): {
  perimeter: number;
  thickness: number;
  passes: number;
  wireType: string;
  wireDiameter: number;
  material: string;
} {
  const result = {
    perimeter: 500,
    thickness: 25,
    passes: 4,
    wireType: "brass",
    wireDiameter: 0.25,
    material: "steel",
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--perimeter":
      case "-p":
        result.perimeter = parseFloat(args[++i]);
        break;
      case "--thickness":
      case "-t":
        result.thickness = parseFloat(args[++i]);
        break;
      case "--passes":
        result.passes = parseInt(args[++i], 10);
        break;
      case "--wire":
      case "-w":
        result.wireType = args[++i];
        break;
      case "--diameter":
      case "-d":
        result.wireDiameter = parseFloat(args[++i]);
        break;
      case "--material":
      case "-m":
        result.material = args[++i];
        break;
    }
  }

  return result;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: npx ts-node scripts/wedm_wire_calculator.ts [options]");
    console.log("\nOptions:");
    console.log("  --perimeter, -p   Cut perimeter in mm (default: 500)");
    console.log("  --thickness, -t   Workpiece thickness in mm (default: 25)");
    console.log("  --passes          Number of passes (default: 4)");
    console.log("  --wire, -w        Wire type: brass, zinc, tungsten, moly (default: brass)");
    console.log("  --diameter, -d    Wire diameter in mm (default: 0.25)");
    console.log("  --material, -m    Material: steel, carbide, aluminum, copper, titanium");
    console.log("\nExample:");
    console.log("  npx ts-node scripts/wedm_wire_calculator.ts -p 800 -t 30 --passes 5");
    process.exit(0);
  }

  try {
    const input = parseArgs(args);
    const calc = calculateWireConsumption(
      input.perimeter,
      input.thickness,
      input.passes,
      input.wireType,
      input.wireDiameter,
      input.material
    );
    printCalculation(calc);

    // Save JSON
    const jsonPath = "wedm_wire_calculation.json";
    fs.writeFileSync(jsonPath, JSON.stringify(calc, null, 2));
    console.log(`JSON saved: ${jsonPath}`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
