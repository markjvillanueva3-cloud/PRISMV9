#!/usr/bin/env npx tsx
/**
 * Queue Capacity Planner — Phase 0.25
 * =====================================
 * Analyzes hook pipeline using queueing theory (M/M/c model).
 * Ensures system doesn't saturate (ρ < 0.8).
 *
 * Theory: Little's Law, M/M/c queues, Erlang formulas
 * Usage: npx tsx scripts/queue_capacity_planner.ts
 */

import * as fs from "fs";
import * as path from "path";

interface QueueMetrics {
  arrivalRate: number;
  serviceRate: number;
  servers: number;
  utilization: number;
  avgQueueLength: number;
  avgWaitTime: number;
  avgSystemTime: number;
  probabilityWait: number;
}

interface CapacityReport {
  timestamp: string;
  hookPipeline: QueueMetrics;
  dispatcherScripts: QueueMetrics;
  isHealthy: boolean;
  recommendations: string[];
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

function erlangC(lambda: number, mu: number, c: number): number {
  const rho = lambda / (c * mu);
  if (rho >= 1) return 1;

  const a = lambda / mu;
  let sum = 0;
  for (let n = 0; n < c; n++) {
    sum += Math.pow(a, n) / factorial(n);
  }
  const lastTerm = Math.pow(a, c) / (factorial(c) * (1 - rho));
  return lastTerm / (sum + lastTerm);
}

function computeMMcMetrics(
  lambda: number,
  mu: number,
  c: number
): QueueMetrics {
  const rho = lambda / (c * mu);

  if (rho >= 1) {
    return {
      arrivalRate: lambda,
      serviceRate: mu,
      servers: c,
      utilization: 1,
      avgQueueLength: Infinity,
      avgWaitTime: Infinity,
      avgSystemTime: Infinity,
      probabilityWait: 1,
    };
  }

  const pW = erlangC(lambda, mu, c);
  const Lq = (pW * rho) / (1 - rho);
  const Wq = Lq / lambda;
  const W = Wq + 1 / mu;
  const L = lambda * W;

  return {
    arrivalRate: lambda,
    serviceRate: mu,
    servers: c,
    utilization: rho,
    avgQueueLength: Lq,
    avgWaitTime: Wq * 1000,
    avgSystemTime: W * 1000,
    probabilityWait: pW,
  };
}

async function main(): Promise<void> {
  console.log("=== Queue Capacity Planning ===\n");

  const hookLambda = 2;
  const hookMu = 10;
  const hookServers = 1;
  const hookMetrics = computeMMcMetrics(hookLambda, hookMu, hookServers);

  console.log("Hook Pipeline (M/M/1):");
  console.log(`  Arrival rate (λ): ${hookLambda} calls/sec`);
  console.log(`  Service rate (μ): ${hookMu} calls/sec`);
  console.log(`  Utilization (ρ): ${(hookMetrics.utilization * 100).toFixed(1)}%`);
  console.log(`  Avg queue length: ${hookMetrics.avgQueueLength.toFixed(2)}`);
  console.log(`  Avg wait time: ${hookMetrics.avgWaitTime.toFixed(1)}ms`);

  const scriptCount = 89;
  const sessionStartTarget = 2;
  const cores = 8;
  const scriptLambda = scriptCount / sessionStartTarget;
  const scriptMu = 1 / 0.19;
  const scriptMetrics = computeMMcMetrics(scriptLambda, scriptMu, cores);

  console.log("\nDispatcher Health Scripts (M/M/8):");
  console.log(`  Scripts: ${scriptCount}`);
  console.log(`  Target time: ${sessionStartTarget}s`);
  console.log(`  Cores: ${cores}`);
  console.log(`  Utilization (ρ): ${(scriptMetrics.utilization * 100).toFixed(1)}%`);
  console.log(`  Avg wait time: ${scriptMetrics.avgWaitTime.toFixed(1)}ms`);

  const recommendations: string[] = [];
  if (hookMetrics.utilization > 0.8) {
    recommendations.push(`Hook pipeline saturating (ρ=${(hookMetrics.utilization * 100).toFixed(0)}%) — increase service rate or reduce hooks`);
  }
  if (scriptMetrics.utilization > 0.8) {
    recommendations.push(`Script execution saturating — increase parallelism or reduce per-script time`);
  }
  if (hookMetrics.avgWaitTime > 100) {
    recommendations.push(`Hook wait time ${hookMetrics.avgWaitTime.toFixed(0)}ms exceeds 100ms target`);
  }

  const report: CapacityReport = {
    timestamp: new Date().toISOString(),
    hookPipeline: hookMetrics,
    dispatcherScripts: scriptMetrics,
    isHealthy: hookMetrics.utilization < 0.8 && scriptMetrics.utilization < 0.8,
    recommendations,
  };

  if (recommendations.length > 0) {
    console.log("\nRecommendations:");
    recommendations.forEach((r) => console.log(`  ⚠ ${r}`));
  } else {
    console.log("\n✓ System healthy (ρ < 0.8 for all queues)");
  }

  const outPath = path.join(process.cwd(), "data/state/queue-capacity-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
}

main().catch(console.error);
