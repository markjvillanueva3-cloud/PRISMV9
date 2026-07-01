#!/usr/bin/env npx tsx
/**
 * Error Propagation Analyzer — Phase 0.25
 * ========================================
 * Traces uncertainty propagation through physics calculation chains.
 * Computes σ_f² = Σ (∂f/∂xᵢ)² σᵢ² for composite functions.
 *
 * Theory: Gaussian error propagation, Taylor expansion
 * Usage: npx tsx scripts/error_propagation.ts
 */

import * as fs from "fs";
import * as path from "path";

interface UncertainValue {
  value: number;
  uncertainty: number;
  unit: string;
  source: string;
}

interface PropagationResult {
  chain: string[];
  inputs: UncertainValue[];
  output: UncertainValue;
  jacobian: number[];
  contributionPct: number[];
  dominantSource: string;
}

interface PropagationReport {
  timestamp: string;
  chains: PropagationResult[];
  recommendations: string[];
}

function numericalDerivative(
  fn: (...args: number[]) => number,
  args: number[],
  index: number,
  h: number = 1e-8
): number {
  const argsPlus = [...args];
  const argsMinus = [...args];
  argsPlus[index] += h;
  argsMinus[index] -= h;
  return (fn(...argsPlus) - fn(...argsMinus)) / (2 * h);
}

function propagateUncertainty(
  fn: (...args: number[]) => number,
  inputs: UncertainValue[],
  outputUnit: string,
  chainName: string
): PropagationResult {
  const args = inputs.map((i) => i.value);
  const outputValue = fn(...args);

  const jacobian = inputs.map((_, i) =>
    numericalDerivative(fn, args, i, Math.abs(args[i]) * 1e-6 || 1e-8)
  );

  const varianceContributions = inputs.map((input, i) =>
    (jacobian[i] * input.uncertainty) ** 2
  );

  const totalVariance = varianceContributions.reduce((s, v) => s + v, 0);
  const outputUncertainty = Math.sqrt(totalVariance);

  const contributionPct = varianceContributions.map((v) =>
    totalVariance > 0 ? (v / totalVariance) * 100 : 0
  );

  const dominantIdx = contributionPct.indexOf(Math.max(...contributionPct));

  return {
    chain: [chainName],
    inputs,
    output: {
      value: outputValue,
      uncertainty: outputUncertainty,
      unit: outputUnit,
      source: "propagated",
    },
    jacobian,
    contributionPct,
    dominantSource: inputs[dominantIdx]?.source || "unknown",
  };
}

async function main(): Promise<void> {
  console.log("=== Error Propagation Analysis ===\n");

  const kienzleForce = (kc11: number, mc: number, h: number, b: number): number => {
    return kc11 * Math.pow(h, 1 - mc) * b;
  };

  const kienzleInputs: UncertainValue[] = [
    { value: 1800, uncertainty: 50, unit: "N/mm²", source: "Kienzle_kc1.1" },
    { value: 0.25, uncertainty: 0.02, unit: "1", source: "Kienzle_mc" },
    { value: 0.2, uncertainty: 0.01, unit: "mm", source: "chip_thickness" },
    { value: 3.0, uncertainty: 0.05, unit: "mm", source: "cut_width" },
  ];

  const kienzleResult = propagateUncertainty(
    kienzleForce,
    kienzleInputs,
    "N",
    "Kienzle Force"
  );

  console.log("Chain: Kienzle Force");
  console.log(`  F = kc1.1 × h^(1-mc) × b`);
  console.log(`  Output: ${kienzleResult.output.value.toFixed(1)} ± ${kienzleResult.output.uncertainty.toFixed(1)} N`);
  console.log(`  Uncertainty contributions:`);
  kienzleInputs.forEach((inp, i) => {
    console.log(`    ${inp.source}: ${kienzleResult.contributionPct[i].toFixed(1)}%`);
  });
  console.log(`  Dominant source: ${kienzleResult.dominantSource}\n`);

  const report: PropagationReport = {
    timestamp: new Date().toISOString(),
    chains: [kienzleResult],
    recommendations: [],
  };

  if (kienzleResult.output.uncertainty / kienzleResult.output.value > 0.1) {
    report.recommendations.push(
      `High relative uncertainty (${((kienzleResult.output.uncertainty / kienzleResult.output.value) * 100).toFixed(1)}%) — consider tightening ${kienzleResult.dominantSource}`
    );
  }

  const outPath = path.join(process.cwd(), "data/state/error-propagation-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`Report saved to ${outPath}`);
}

main().catch(console.error);
