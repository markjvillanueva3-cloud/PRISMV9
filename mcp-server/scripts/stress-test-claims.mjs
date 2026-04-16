#!/usr/bin/env node
/**
 * stress-test-claims.mjs — SYS-MS3-U02
 * Simulates 3 concurrent claim attempts on the same unit to verify race condition handling.
 *
 * Expected: exactly 1 wins, 2 get EEXIST (or equivalent rejection)
 */
import { promises as fs } from "node:fs";
import { fork } from "node:child_process";
import path from "node:path";

const ROADMAP_PATH = "data/roadmap-index.json";
const TEST_MILESTONE = "TEST-STRESS-MS0";
const NUM_WORKERS = 3;
const NUM_ITERATIONS = 100;

async function createTestMilestone() {
  const data = JSON.parse(await fs.readFile(ROADMAP_PATH, "utf8"));

  // Remove any existing test milestone
  data.milestones = data.milestones.filter(m => m.id !== TEST_MILESTONE);

  // Add fresh test milestone
  data.milestones.push({
    id: TEST_MILESTONE,
    title: "Stress Test Milestone (auto-created)",
    track: "TEST",
    owner: "claude",
    status: "not_started",
    total_units: 1,
    dependencies: []
  });

  await fs.writeFile(ROADMAP_PATH, JSON.stringify(data, null, 2));
  console.log(`Created test milestone: ${TEST_MILESTONE}`);
}

async function claimMilestone(workerId) {
  const data = JSON.parse(await fs.readFile(ROADMAP_PATH, "utf8"));
  const ms = data.milestones.find(m => m.id === TEST_MILESTONE);

  if (!ms) {
    return { success: false, error: "NOT_FOUND" };
  }

  if (ms.status !== "not_started" || ms.claimed_by) {
    return { success: false, error: "ALREADY_CLAIMED", by: ms.claimed_by };
  }

  // Simulate claim (without file locking - this is the race condition test)
  ms.status = "in_progress";
  ms.claimed_by = `worker-${workerId}`;
  ms.claimed_at = new Date().toISOString();

  // Small random delay to increase race condition probability
  await new Promise(r => setTimeout(r, Math.random() * 10));

  await fs.writeFile(ROADMAP_PATH, JSON.stringify(data, null, 2));
  return { success: true, worker: workerId };
}

async function resetMilestone() {
  const data = JSON.parse(await fs.readFile(ROADMAP_PATH, "utf8"));
  const ms = data.milestones.find(m => m.id === TEST_MILESTONE);
  if (ms) {
    ms.status = "not_started";
    delete ms.claimed_by;
    delete ms.claimed_at;
    await fs.writeFile(ROADMAP_PATH, JSON.stringify(data, null, 2));
  }
}

async function runIteration(iterNum) {
  await resetMilestone();

  // Launch concurrent claims
  const claims = [];
  for (let i = 0; i < NUM_WORKERS; i++) {
    claims.push(claimMilestone(i));
  }

  const results = await Promise.all(claims);
  const successes = results.filter(r => r.success);
  const failures = results.filter(r => !r.success);

  return {
    iteration: iterNum,
    successes: successes.length,
    failures: failures.length,
    winners: successes.map(r => r.worker)
  };
}

async function main() {
  console.log("=== Multi-Claude Claim Stress Test ===");
  console.log(`Workers: ${NUM_WORKERS}, Iterations: ${NUM_ITERATIONS}`);
  console.log("");

  await createTestMilestone();

  let totalSuccesses = 0;
  let totalFailures = 0;
  let multiWins = 0;

  for (let i = 0; i < NUM_ITERATIONS; i++) {
    const result = await runIteration(i);
    totalSuccesses += result.successes;
    totalFailures += result.failures;

    if (result.successes > 1) {
      multiWins++;
      console.log(`  Iteration ${i}: RACE CONDITION - ${result.successes} winners: ${result.winners.join(", ")}`);
    } else if (i % 20 === 0) {
      console.log(`  Iteration ${i}: OK (1 winner, ${result.failures} rejected)`);
    }
  }

  console.log("");
  console.log("=== Results ===");
  console.log(`Total iterations: ${NUM_ITERATIONS}`);
  console.log(`Average successes per iteration: ${(totalSuccesses / NUM_ITERATIONS).toFixed(2)}`);
  console.log(`Race conditions detected: ${multiWins}/${NUM_ITERATIONS} (${(multiWins/NUM_ITERATIONS*100).toFixed(1)}%)`);
  console.log("");

  if (multiWins > 0) {
    console.log("WARNING: Race conditions detected! File-based locking is insufficient.");
    console.log("RECOMMENDATION: Use atomic claim mechanism (e.g., separate lock files with O_EXCL)");
  } else {
    console.log("NOTE: No race conditions in this run, but file-based claims are inherently racy.");
    console.log("The current implementation relies on JSON read-modify-write which is NOT atomic.");
  }

  // Cleanup
  const data = JSON.parse(await fs.readFile(ROADMAP_PATH, "utf8"));
  data.milestones = data.milestones.filter(m => m.id !== TEST_MILESTONE);
  await fs.writeFile(ROADMAP_PATH, JSON.stringify(data, null, 2));
  console.log(`\nCleaned up test milestone.`);
}

main().catch(console.error);
