#!/usr/bin/env npx ts-node
/**
 * WEDM Cost Sensitivity Analysis Script
 * Phase 0.2 - WEDM AGI Roadmap
 *
 * Performs Monte Carlo sensitivity analysis on Wire EDM job costs.
 * Identifies key cost drivers and their impact ranges.
 *
 * Usage: npx ts-node scripts/wedm_cost_sensitivity.ts --base-cost 250
 */

import * as fs from "fs";

interface CostComponent {
  name: string;
  baseValue: number;
  unit: string;
  variabilityPercent: number;
  distribution: "normal" | "uniform" | "triangular";
  correlatedWith?: string[];
}

interface SensitivityResult {
  timestamp: string;
  baseCost: number;
  iterations: number;
  components: CostComponent[];
  results: {
    mean: number;
    std: number;
    min: number;
    max: number;
    p10: number;
    p50: number;
    p90: number;
    confidence95: { low: number; high: number };
  };
  sensitivity: Array<{
    component: string;
    tornadoImpact: number;
    correlation: number;
    rank: number;
    lowScenario: number;
    highScenario: number;
  }>;
  scenarios: {
    optimistic: { cost: number; assumptions: string[] };
    expected: { cost: number; assumptions: string[] };
    pessimistic: { cost: number; assumptions: string[] };
  };
  recommendations: string[];
}

const DEFAULT_COMPONENTS: CostComponent[] = [
  { name: "Machine Time", baseValue: 60, unit: "$/hr", variabilityPercent: 10, distribution: "normal" },
  { name: "Cycle Time", baseValue: 52, unit: "min", variabilityPercent: 20, distribution: "triangular" },
  { name: "Wire Cost", baseValue: 15, unit: "$/kg", variabilityPercent: 5, distribution: "uniform" },
  { name: "Wire Consumption", baseValue: 0.5, unit: "kg", variabilityPercent: 15, distribution: "normal" },
  { name: "Setup Time", baseValue: 20, unit: "min", variabilityPercent: 30, distribution: "triangular" },
  { name: "Setup Rate", baseValue: 50, unit: "$/hr", variabilityPercent: 5, distribution: "uniform" },
  { name: "Power", baseValue: 8, unit: "kW", variabilityPercent: 10, distribution: "normal" },
  { name: "Power Cost", baseValue: 0.12, unit: "$/kWh", variabilityPercent: 20, distribution: "uniform" },
  { name: "Wire Breaks", baseValue: 0.5, unit: "count", variabilityPercent: 100, distribution: "triangular" },
  { name: "Break Recovery Time", baseValue: 5, unit: "min", variabilityPercent: 30, distribution: "normal" },
];

function randomNormal(mean: number, std: number): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

function randomTriangular(min: number, mode: number, max: number): number {
  const u = Math.random();
  const fc = (mode - min) / (max - min);
  if (u < fc) {
    return min + Math.sqrt(u * (max - min) * (mode - min));
  }
  return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}

function sampleComponent(comp: CostComponent): number {
  const variance = comp.baseValue * comp.variabilityPercent / 100;

  switch (comp.distribution) {
    case "normal":
      return Math.max(0, randomNormal(comp.baseValue, variance / 2));
    case "uniform":
      return comp.baseValue - variance + Math.random() * 2 * variance;
    case "triangular":
      return randomTriangular(
        comp.baseValue - variance,
        comp.baseValue,
        comp.baseValue + variance
      );
    default:
      return comp.baseValue;
  }
}

function calculateCost(samples: Record<string, number>): number {
  // Cost model:
  // Total = (CycleTime/60 * MachineRate) + (SetupTime/60 * SetupRate) +
  //         (WireConsumption * WireCost) + (Power * CycleTime/60 * PowerCost) +
  //         (WireBreaks * BreakRecoveryTime/60 * MachineRate)

  const cycleHours = samples["Cycle Time"] / 60;
  const setupHours = samples["Setup Time"] / 60;
  const breakHours = samples["Wire Breaks"] * samples["Break Recovery Time"] / 60;

  const machineCost = (cycleHours + breakHours) * samples["Machine Time"];
  const setupCost = setupHours * samples["Setup Rate"];
  const wireCost = samples["Wire Consumption"] * samples["Wire Cost"];
  const powerCost = samples["Power"] * cycleHours * samples["Power Cost"];

  return machineCost + setupCost + wireCost + powerCost;
}

function runMonteCarlo(
  components: CostComponent[],
  iterations: number = 10000
): { costs: number[]; samples: Array<Record<string, number>> } {
  const costs: number[] = [];
  const allSamples: Array<Record<string, number>> = [];

  for (let i = 0; i < iterations; i++) {
    const samples: Record<string, number> = {};
    for (const comp of components) {
      samples[comp.name] = sampleComponent(comp);
    }
    costs.push(calculateCost(samples));
    allSamples.push(samples);
  }

  return { costs, samples: allSamples };
}

function calculateSensitivity(
  components: CostComponent[],
  baseCost: number,
  iterations: number
): SensitivityResult {
  console.log(`Running ${iterations} Monte Carlo iterations...`);

  const { costs, samples } = runMonteCarlo(components, iterations);

  // Calculate statistics
  costs.sort((a, b) => a - b);
  const mean = costs.reduce((a, b) => a + b) / costs.length;
  const variance = costs.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / costs.length;
  const std = Math.sqrt(variance);

  const percentile = (p: number) => costs[Math.floor(p * costs.length)];

  // Tornado analysis - vary each component ±20% from base
  const sensitivity = components.map((comp) => {
    // Low scenario
    const lowSamples = { ...samples[0] };
    for (const c of components) {
      lowSamples[c.name] = c.baseValue;
    }
    lowSamples[comp.name] = comp.baseValue * 0.8;
    const lowCost = calculateCost(lowSamples);

    // High scenario
    const highSamples = { ...lowSamples };
    highSamples[comp.name] = comp.baseValue * 1.2;
    const highCost = calculateCost(highSamples);

    // Correlation with total cost
    const compValues = samples.map((s) => s[comp.name]);
    const compMean = compValues.reduce((a, b) => a + b) / compValues.length;
    const correlation = costs.reduce((sum, c, i) =>
      sum + (c - mean) * (compValues[i] - compMean), 0
    ) / (std * Math.sqrt(compValues.reduce((sum, v) =>
      sum + Math.pow(v - compMean, 2), 0
    )));

    return {
      component: comp.name,
      tornadoImpact: Math.abs(highCost - lowCost),
      correlation: Math.round(correlation * 100) / 100,
      rank: 0,
      lowScenario: Math.round(lowCost * 100) / 100,
      highScenario: Math.round(highCost * 100) / 100,
    };
  });

  // Rank by impact
  sensitivity.sort((a, b) => b.tornadoImpact - a.tornadoImpact);
  sensitivity.forEach((s, i) => (s.rank = i + 1));

  // Generate recommendations
  const recommendations: string[] = [];
  const topDriver = sensitivity[0];

  if (topDriver.component.includes("Cycle Time")) {
    recommendations.push("Optimize E-code parameters to reduce cycle time");
  }
  if (topDriver.component.includes("Setup")) {
    recommendations.push("Implement standard setups or quick-change fixtures");
  }
  if (topDriver.component.includes("Wire")) {
    recommendations.push("Negotiate wire pricing or optimize consumption");
  }
  if (topDriver.component.includes("Break")) {
    recommendations.push("Reduce wire breaks through parameter tuning");
  }

  return {
    timestamp: new Date().toISOString(),
    baseCost,
    iterations,
    components,
    results: {
      mean: Math.round(mean * 100) / 100,
      std: Math.round(std * 100) / 100,
      min: Math.round(costs[0] * 100) / 100,
      max: Math.round(costs[costs.length - 1] * 100) / 100,
      p10: Math.round(percentile(0.1) * 100) / 100,
      p50: Math.round(percentile(0.5) * 100) / 100,
      p90: Math.round(percentile(0.9) * 100) / 100,
      confidence95: {
        low: Math.round(percentile(0.025) * 100) / 100,
        high: Math.round(percentile(0.975) * 100) / 100,
      },
    },
    sensitivity,
    scenarios: {
      optimistic: {
        cost: Math.round(percentile(0.1) * 100) / 100,
        assumptions: ["Minimal wire breaks", "Efficient setup", "Fast cycle"],
      },
      expected: {
        cost: Math.round(mean * 100) / 100,
        assumptions: ["Average performance", "Typical variability"],
      },
      pessimistic: {
        cost: Math.round(percentile(0.9) * 100) / 100,
        assumptions: ["Multiple wire breaks", "Extended setup", "Slow cycle"],
      },
    },
    recommendations,
  };
}

function printResult(result: SensitivityResult): void {
  console.log("\n" + "=".repeat(70));
  console.log("WEDM COST SENSITIVITY ANALYSIS");
  console.log("=".repeat(70));
  console.log(`Generated: ${result.timestamp}`);
  console.log(`Monte Carlo Iterations: ${result.iterations.toLocaleString()}`);

  console.log("\n--- Cost Distribution ---");
  console.log(`Expected (Mean): $${result.results.mean}`);
  console.log(`Standard Deviation: $${result.results.std}`);
  console.log(`Range: $${result.results.min} to $${result.results.max}`);
  console.log(`P10/P50/P90: $${result.results.p10} / $${result.results.p50} / $${result.results.p90}`);
  console.log(`95% CI: $${result.results.confidence95.low} to $${result.results.confidence95.high}`);

  console.log("\n--- Tornado Analysis (Cost Drivers) ---");
  console.log("Rank".padEnd(6) + "Component".padEnd(22) + "Impact".padEnd(12) + "Low".padEnd(12) + "High");
  console.log("-".repeat(60));
  result.sensitivity.slice(0, 6).forEach((s) => {
    console.log(
      `${s.rank}`.padEnd(6) +
      s.component.padEnd(22) +
      `$${s.tornadoImpact.toFixed(2)}`.padEnd(12) +
      `$${s.lowScenario}`.padEnd(12) +
      `$${s.highScenario}`
    );
  });

  console.log("\n--- Scenarios ---");
  console.log(`Optimistic (P10): $${result.scenarios.optimistic.cost}`);
  console.log(`  ${result.scenarios.optimistic.assumptions.join(", ")}`);
  console.log(`Expected (Mean): $${result.scenarios.expected.cost}`);
  console.log(`  ${result.scenarios.expected.assumptions.join(", ")}`);
  console.log(`Pessimistic (P90): $${result.scenarios.pessimistic.cost}`);
  console.log(`  ${result.scenarios.pessimistic.assumptions.join(", ")}`);

  if (result.recommendations.length > 0) {
    console.log("\n--- Recommendations ---");
    result.recommendations.forEach((r) => console.log(`  → ${r}`));
  }

  console.log("\n" + "=".repeat(70));
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  let baseCost = 250;
  let iterations = 10000;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--base-cost":
        baseCost = parseFloat(args[++i]);
        break;
      case "--iterations":
      case "-n":
        iterations = parseInt(args[++i], 10);
        break;
      case "--help":
      case "-h":
        console.log("Usage: npx ts-node scripts/wedm_cost_sensitivity.ts [options]");
        console.log("\nOptions:");
        console.log("  --base-cost    Base cost estimate in USD (default: 250)");
        console.log("  --iterations, -n  Monte Carlo iterations (default: 10000)");
        process.exit(0);
    }
  }

  try {
    const result = calculateSensitivity(DEFAULT_COMPONENTS, baseCost, iterations);
    printResult(result);

    // Save JSON
    const jsonPath = "wedm_cost_sensitivity.json";
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
    console.log(`JSON saved: ${jsonPath}`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
