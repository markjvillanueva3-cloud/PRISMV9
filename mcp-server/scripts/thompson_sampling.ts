#!/usr/bin/env npx tsx
/**
 * Thompson Sampling for Hook Selection — Phase 0.25
 * ==================================================
 * Multi-armed bandit for intelligent hook scheduling.
 * Uses Beta posteriors for exploration-exploitation balance.
 *
 * Theory: Thompson Sampling, Bayesian bandits
 * Usage: npx tsx scripts/thompson_sampling.ts
 */

import * as fs from "fs";
import * as path from "path";

interface HookArm {
  hookName: string;
  alpha: number;
  beta: number;
  totalPulls: number;
  catches: number;
  expectedValue: number;
}

interface BanditState {
  schemaVersion: number;
  timestamp: string;
  arms: HookArm[];
  totalDecisions: number;
}

const STATE_PATH = path.join(process.cwd(), "data/state/hook-bandit-state.json");

function betaSample(alpha: number, beta: number): number {
  const u = Array(Math.floor(alpha))
    .fill(0)
    .map(() => Math.random());
  const v = Array(Math.floor(beta))
    .fill(0)
    .map(() => Math.random());

  const x = -Math.log(u.reduce((p, r) => p * r, 1));
  const y = -Math.log(v.reduce((p, r) => p * r, 1));

  return x / (x + y);
}

function loadState(): BanditState {
  try {
    if (fs.existsSync(STATE_PATH)) {
      return JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
    }
  } catch {}

  const defaultHooks = [
    "hook_no_duplicate_engine",
    "hook_sx_gate",
    "hook_kienzle_coeff_check",
    "hook_taylor_coeff_check",
    "hook_awareness_floor",
    "hook_claim_required",
    "hook_test_legitimacy",
    "hook_no_silent_catch",
  ];

  return {
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    arms: defaultHooks.map((name) => ({
      hookName: name,
      alpha: 2,
      beta: 2,
      totalPulls: 0,
      catches: 0,
      expectedValue: 0.5,
    })),
    totalDecisions: 0,
  };
}

function selectTopK(state: BanditState, k: number): string[] {
  const samples = state.arms.map((arm) => ({
    hookName: arm.hookName,
    sample: betaSample(arm.alpha, arm.beta),
  }));

  return samples
    .sort((a, b) => b.sample - a.sample)
    .slice(0, k)
    .map((s) => s.hookName);
}

function updateArm(state: BanditState, hookName: string, caughtIssue: boolean): void {
  const arm = state.arms.find((a) => a.hookName === hookName);
  if (arm) {
    arm.totalPulls++;
    if (caughtIssue) {
      arm.alpha++;
      arm.catches++;
    } else {
      arm.beta++;
    }
    arm.expectedValue = arm.alpha / (arm.alpha + arm.beta);
  }
  state.totalDecisions++;
  state.timestamp = new Date().toISOString();
}

async function main(): Promise<void> {
  const state = loadState();

  console.log("=== Thompson Sampling Hook Scheduler ===\n");
  console.log(`Total decisions: ${state.totalDecisions}`);
  console.log(`Arms: ${state.arms.length}\n`);

  const k = 5;
  const selected = selectTopK(state, k);
  console.log(`Top ${k} hooks for next run (by Thompson sample):`);
  selected.forEach((h, i) => console.log(`  ${i + 1}. ${h}`));

  console.log("\nCurrent arm statistics:");
  state.arms
    .sort((a, b) => b.expectedValue - a.expectedValue)
    .forEach((arm) => {
      console.log(
        `  ${arm.hookName}: E[p]=${arm.expectedValue.toFixed(3)}, α=${arm.alpha}, β=${arm.beta}, catches=${arm.catches}/${arm.totalPulls}`
      );
    });

  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  console.log(`\nState saved to ${STATE_PATH}`);
}

main().catch(console.error);
