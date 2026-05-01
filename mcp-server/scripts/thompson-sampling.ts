/**
 * thompson-sampling.ts — USSH Phase 0.25
 * =======================================
 *
 * Analyzes Thompson Sampling performance for hook selection.
 * Reports on exploration/exploitation balance and regret.
 *
 * Usage: npx tsx scripts/thompson-sampling.ts [--simulate=1000]
 *
 * Theory: Multi-armed bandit, Beta-Bernoulli conjugate prior, regret bounds
 */

import fs from "fs";
import path from "path";

const STATE_DIR = path.join(process.cwd(), "data/state");
const REPORT_FILE = path.join(STATE_DIR, "thompson-sampling-report.json");

interface BanditArm {
  name: string;
  alpha: number;
  beta: number;
  trueRate: number; // For simulation
  pulls: number;
  rewards: number;
}

interface SimulationResult {
  round: number;
  selectedArm: string;
  reward: boolean;
  cumulativeRegret: number;
  explorationRate: number;
}

interface ThompsonReport {
  timestamp: number;
  arms: BanditArm[];
  totalPulls: number;
  totalRewards: number;
  cumulativeRegret: number;
  optimalArmPulls: number;
  explorationFraction: number;
  regretBound: number;
  recommendations: string[];
  simulationHistory?: SimulationResult[];
}

function betaSample(alpha: number, beta: number): number {
  const gammaA = gammaSample(alpha);
  const gammaB = gammaSample(beta);
  return gammaA / (gammaA + gammaB);
}

function gammaSample(shape: number): number {
  if (shape < 1) {
    return gammaSample(shape + 1) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number;
    let v: number;

    do {
      x = normalSample();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function normalSample(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function simulateBandit(numRounds: number): ThompsonReport {
  // Initialize arms with different true success rates
  const arms: BanditArm[] = [
    { name: "SafetyCheck", alpha: 2, beta: 1, trueRate: 0.8, pulls: 0, rewards: 0 },
    { name: "WiringCheck", alpha: 2, beta: 1, trueRate: 0.6, pulls: 0, rewards: 0 },
    { name: "PhysicsCheck", alpha: 2, beta: 1, trueRate: 0.7, pulls: 0, rewards: 0 },
    { name: "StyleCheck", alpha: 2, beta: 1, trueRate: 0.3, pulls: 0, rewards: 0 },
    { name: "PerformanceCheck", alpha: 2, beta: 1, trueRate: 0.5, pulls: 0, rewards: 0 },
  ];

  const optimalRate = Math.max(...arms.map((a) => a.trueRate));
  const optimalArm = arms.find((a) => a.trueRate === optimalRate)!;

  let cumulativeRegret = 0;
  let explorationPulls = 0;
  const history: SimulationResult[] = [];

  for (let round = 0; round < numRounds; round++) {
    // Thompson Sampling: sample from each arm's posterior
    const samples = arms.map((arm) => ({
      arm,
      sample: betaSample(arm.alpha, arm.beta),
    }));

    // Select arm with highest sample
    samples.sort((a, b) => b.sample - a.sample);
    const selected = samples[0].arm;

    // Is this exploration or exploitation?
    const expectedBest = arms.reduce(
      (best, arm) =>
        arm.alpha / (arm.alpha + arm.beta) >
        best.alpha / (best.alpha + best.beta)
          ? arm
          : best,
      arms[0]
    );

    if (selected !== expectedBest) {
      explorationPulls++;
    }

    // Generate reward
    const reward = Math.random() < selected.trueRate;

    // Update
    selected.pulls++;
    if (reward) {
      selected.alpha++;
      selected.rewards++;
    } else {
      selected.beta++;
    }

    // Compute regret
    const instantRegret = optimalRate - selected.trueRate;
    cumulativeRegret += instantRegret;

    if (round % 100 === 0 || round === numRounds - 1) {
      history.push({
        round,
        selectedArm: selected.name,
        reward,
        cumulativeRegret,
        explorationRate: explorationPulls / (round + 1),
      });
    }
  }

  // Theoretical regret bound: O(sqrt(KT * log(T)))
  const K = arms.length;
  const T = numRounds;
  const regretBound = Math.sqrt(K * T * Math.log(T));

  const recommendations: string[] = [];

  if (cumulativeRegret > regretBound) {
    recommendations.push(
      `Actual regret (${cumulativeRegret.toFixed(1)}) exceeds theoretical bound (${regretBound.toFixed(1)})`
    );
  }

  const explorationFraction = explorationPulls / numRounds;
  if (explorationFraction < 0.1) {
    recommendations.push(
      `Low exploration (${(explorationFraction * 100).toFixed(1)}%) — may be stuck in local optimum`
    );
  } else if (explorationFraction > 0.4) {
    recommendations.push(
      `High exploration (${(explorationFraction * 100).toFixed(1)}%) — priors may be too weak`
    );
  }

  const report: ThompsonReport = {
    timestamp: Date.now(),
    arms,
    totalPulls: numRounds,
    totalRewards: arms.reduce((s, a) => s + a.rewards, 0),
    cumulativeRegret,
    optimalArmPulls: optimalArm.pulls,
    explorationFraction,
    regretBound,
    recommendations,
    simulationHistory: history,
  };

  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

  return report;
}

function printReport(report: ThompsonReport): void {
  console.log("\n=== Thompson Sampling Analysis ===");
  console.log(`Timestamp: ${new Date(report.timestamp).toISOString()}`);
  console.log(`Total Rounds: ${report.totalPulls}`);
  console.log(`Total Rewards: ${report.totalRewards}`);
  console.log(
    `Overall Success Rate: ${((report.totalRewards / report.totalPulls) * 100).toFixed(1)}%`
  );

  console.log("\nArm Statistics:");
  console.log("Name              | Pulls | Rewards | Est.Rate | True Rate");
  console.log("-".repeat(60));

  for (const arm of report.arms.sort((a, b) => b.pulls - a.pulls)) {
    const estRate = arm.alpha / (arm.alpha + arm.beta);
    console.log(
      `${arm.name.padEnd(17)} | ${arm.pulls.toString().padStart(5)} | ${arm.rewards.toString().padStart(7)} | ${(estRate * 100).toFixed(1).padStart(7)}% | ${(arm.trueRate * 100).toFixed(1).padStart(8)}%`
    );
  }

  console.log(`\nCumulative Regret: ${report.cumulativeRegret.toFixed(1)}`);
  console.log(`Theoretical Bound: ${report.regretBound.toFixed(1)}`);
  console.log(
    `Optimal Arm Pulls: ${report.optimalArmPulls} (${((report.optimalArmPulls / report.totalPulls) * 100).toFixed(1)}%)`
  );
  console.log(
    `Exploration Fraction: ${(report.explorationFraction * 100).toFixed(1)}%`
  );

  if (report.recommendations.length > 0) {
    console.log("\nRecommendations:");
    for (const rec of report.recommendations) {
      console.log(`  → ${rec}`);
    }
  }
}

// Main
const args = process.argv.slice(2);
const simulateArg = args.find((a) => a.startsWith("--simulate="));
const numRounds = simulateArg ? parseInt(simulateArg.split("=")[1]) : 1000;

const report = simulateBandit(numRounds);
printReport(report);
