/**
 * queue-capacity-planner.ts — USSH Phase 0.25
 * ============================================
 *
 * Plans hook pipeline capacity using queueing theory.
 * Analyzes M/M/c queue model for parallel execution.
 *
 * Usage: npx tsx scripts/queue-capacity-planner.ts [--cores=8] [--target-latency=2000]
 *
 * Theory: Little's Law (L = λW), M/M/c queue, Erlang-C formula
 */

import fs from "fs";
import path from "path";

const STATE_DIR = path.join(process.cwd(), "data/state");
const REPORT_FILE = path.join(STATE_DIR, "queue-capacity-report.json");

interface QueueMetrics {
  arrivalRate: number;     // λ (per second)
  serviceRate: number;     // μ (per second)
  servers: number;         // c
  utilization: number;     // ρ = λ/(c·μ)
  avgQueueLength: number;  // L_q
  avgWaitTime: number;     // W_q (ms)
  avgSystemTime: number;   // W (ms)
  probWait: number;        // P(wait > 0)
}

interface CapacityPlan {
  timestamp: number;
  currentMetrics: QueueMetrics;
  targetLatency: number;
  recommendations: string[];
  scenarios: Array<{
    servers: number;
    utilization: number;
    avgWaitTime: number;
    meetsTarget: boolean;
  }>;
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function erlangC(c: number, rho: number): number {
  if (rho >= 1) return 1;

  const a = c * rho;
  let sum = 0;
  for (let k = 0; k < c; k++) {
    sum += Math.pow(a, k) / factorial(k);
  }

  const numerator = Math.pow(a, c) / factorial(c) * (1 / (1 - rho));
  return numerator / (sum + numerator);
}

function computeMMcMetrics(lambda: number, mu: number, c: number): QueueMetrics {
  const rho = lambda / (c * mu);

  if (rho >= 1) {
    return {
      arrivalRate: lambda,
      serviceRate: mu,
      servers: c,
      utilization: rho,
      avgQueueLength: Infinity,
      avgWaitTime: Infinity,
      avgSystemTime: Infinity,
      probWait: 1,
    };
  }

  const Pw = erlangC(c, rho);
  const Lq = Pw * rho / (1 - rho);
  const Wq = Lq / lambda;
  const W = Wq + 1 / mu;

  return {
    arrivalRate: lambda,
    serviceRate: mu,
    servers: c,
    utilization: rho,
    avgQueueLength: Lq,
    avgWaitTime: Wq * 1000, // Convert to ms
    avgSystemTime: W * 1000,
    probWait: Pw,
  };
}

function loadTelemetry(): { lambda: number; mu: number } {
  try {
    const telemetryFile = path.join(STATE_DIR, "hook-telemetry.json");
    if (fs.existsSync(telemetryFile)) {
      const data = JSON.parse(fs.readFileSync(telemetryFile, "utf-8"));

      const arrivals = data.arrivals || [];
      const services = data.serviceTimes || [];

      if (arrivals.length >= 2 && services.length >= 2) {
        const duration = (arrivals[arrivals.length - 1] - arrivals[0]) / 1000;
        const lambda = duration > 0 ? arrivals.length / duration : 2;

        const avgService = services.reduce((a: number, b: number) => a + b, 0) / services.length;
        const mu = avgService > 0 ? 1000 / avgService : 20;

        return { lambda, mu };
      }
    }
  } catch {}

  // Defaults based on typical usage
  return { lambda: 2, mu: 20 }; // 2 tool calls/sec, 50ms avg service
}

function generatePlan(cores: number, targetLatency: number): CapacityPlan {
  const { lambda, mu } = loadTelemetry();
  const currentMetrics = computeMMcMetrics(lambda, mu, cores);

  const recommendations: string[] = [];
  const scenarios: CapacityPlan["scenarios"] = [];

  // Test different server counts
  for (let c = 1; c <= cores * 2; c++) {
    const metrics = computeMMcMetrics(lambda, mu, c);
    scenarios.push({
      servers: c,
      utilization: metrics.utilization,
      avgWaitTime: metrics.avgWaitTime,
      meetsTarget: metrics.avgWaitTime <= targetLatency,
    });
  }

  // Generate recommendations
  if (currentMetrics.utilization > 0.8) {
    recommendations.push(
      `High utilization (${(currentMetrics.utilization * 100).toFixed(0)}%) — consider adding capacity`
    );
  }

  if (currentMetrics.avgWaitTime > targetLatency) {
    const minServers = scenarios.find((s) => s.meetsTarget)?.servers;
    if (minServers) {
      recommendations.push(
        `Need at least ${minServers} parallel workers to meet ${targetLatency}ms latency target`
      );
    } else {
      recommendations.push(`Cannot meet ${targetLatency}ms target with current service rate`);
      recommendations.push(
        `Consider optimizing slow hooks (current avg: ${(1000 / mu).toFixed(0)}ms)`
      );
    }
  }

  if (currentMetrics.probWait > 0.5) {
    recommendations.push(
      `${(currentMetrics.probWait * 100).toFixed(0)}% probability of queueing — may cause latency spikes`
    );
  }

  const plan: CapacityPlan = {
    timestamp: Date.now(),
    currentMetrics,
    targetLatency,
    recommendations,
    scenarios,
  };

  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify(plan, null, 2));

  return plan;
}

function printPlan(plan: CapacityPlan): void {
  console.log("\n=== Queue Capacity Planning Report ===");
  console.log(`Timestamp: ${new Date(plan.timestamp).toISOString()}`);
  console.log(`Target Latency: ${plan.targetLatency}ms`);

  console.log("\nCurrent Metrics:");
  console.log(`  Arrival rate (λ): ${plan.currentMetrics.arrivalRate.toFixed(2)}/sec`);
  console.log(`  Service rate (μ): ${plan.currentMetrics.serviceRate.toFixed(2)}/sec`);
  console.log(`  Servers (c): ${plan.currentMetrics.servers}`);
  console.log(`  Utilization (ρ): ${(plan.currentMetrics.utilization * 100).toFixed(1)}%`);
  console.log(`  Avg queue length: ${plan.currentMetrics.avgQueueLength.toFixed(2)}`);
  console.log(`  Avg wait time: ${plan.currentMetrics.avgWaitTime.toFixed(0)}ms`);
  console.log(`  P(wait): ${(plan.currentMetrics.probWait * 100).toFixed(1)}%`);

  console.log("\nCapacity Scenarios:");
  console.log("Servers | Utilization | Wait Time | Meets Target");
  console.log("-".repeat(50));
  for (const s of plan.scenarios.slice(0, 10)) {
    const status = s.meetsTarget ? "✓" : "✗";
    console.log(
      `   ${s.servers.toString().padStart(2)}   |    ${(s.utilization * 100).toFixed(0).padStart(3)}%     |  ${s.avgWaitTime.toFixed(0).padStart(5)}ms  |     ${status}`
    );
  }

  if (plan.recommendations.length > 0) {
    console.log("\nRecommendations:");
    for (const rec of plan.recommendations) {
      console.log(`  → ${rec}`);
    }
  }
}

// Main
const args = process.argv.slice(2);
const coresArg = args.find((a) => a.startsWith("--cores="));
const latencyArg = args.find((a) => a.startsWith("--target-latency="));

const cores = coresArg ? parseInt(coresArg.split("=")[1]) : 8;
const targetLatency = latencyArg ? parseInt(latencyArg.split("=")[1]) : 2000;

const plan = generatePlan(cores, targetLatency);
printPlan(plan);
