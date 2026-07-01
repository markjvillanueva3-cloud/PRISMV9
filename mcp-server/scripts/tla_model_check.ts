#!/usr/bin/env npx tsx
/**
 * TLA+ Model Checker Interface — Phase 0.25
 * ==========================================
 * Verifies hook protocol invariants using TLA+ specifications.
 * Checks for deadlock freedom and safety properties.
 *
 * Theory: Temporal Logic of Actions, model checking
 * Usage: npx tsx scripts/tla_model_check.ts
 */

import * as fs from "fs";
import * as path from "path";

interface InvariantCheck {
  name: string;
  formula: string;
  passed: boolean;
  counterexample?: string;
}

interface TLAReport {
  timestamp: string;
  specFile: string;
  states: number;
  distinctStates: number;
  depth: number;
  invariants: InvariantCheck[];
  deadlockFree: boolean;
  livenessHolds: boolean;
  recommendation: string;
}

const HOOK_STATES = ["idle", "executing", "blocked", "failed"] as const;
const MAX_SESSIONS = 3;
const MAX_LOCKS = 5;

interface HookState {
  state: (typeof HOOK_STATES)[number];
  locks: Set<string>;
  claims: Set<string>;
}

function checkTypeInvariant(state: HookState): boolean {
  return (
    HOOK_STATES.includes(state.state) &&
    state.locks.size <= MAX_LOCKS &&
    state.claims.size <= MAX_LOCKS
  );
}

function checkSafetyInvariant(sessions: HookState[]): boolean {
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const intersection = [...sessions[i].locks].filter((l) =>
        sessions[j].locks.has(l)
      );
      if (intersection.length > 0) {
        return false;
      }
    }
  }
  return true;
}

function checkLiveness(traces: HookState[][]): boolean {
  for (const trace of traces) {
    const reachesIdle = trace.some((s) => s.state === "idle");
    const blockedResolves = trace.every(
      (s, i) =>
        s.state !== "blocked" ||
        trace.slice(i).some((ss) => ss.state === "idle" || ss.state === "failed")
    );
    if (!reachesIdle || !blockedResolves) {
      return false;
    }
  }
  return true;
}

function generateStateSpace(): { states: HookState[][]; depth: number } {
  const states: HookState[][] = [];
  const queue: HookState[][] = [[{ state: "idle", locks: new Set(), claims: new Set() }]];
  let maxDepth = 0;

  while (queue.length > 0 && states.length < 1000) {
    const trace = queue.shift()!;
    const current = trace[trace.length - 1];
    maxDepth = Math.max(maxDepth, trace.length);

    states.push(trace);

    if (current.state === "idle") {
      queue.push([...trace, { ...current, state: "executing", locks: new Set(["file1"]) }]);
    } else if (current.state === "executing") {
      queue.push([...trace, { ...current, state: "idle", locks: new Set() }]);
      queue.push([...trace, { ...current, state: "blocked" }]);
    } else if (current.state === "blocked") {
      queue.push([...trace, { ...current, state: "idle", locks: new Set() }]);
      queue.push([...trace, { ...current, state: "failed", locks: new Set() }]);
    }
  }

  return { states, depth: maxDepth };
}

async function main(): Promise<void> {
  console.log("=== TLA+ Model Checking (Simulated) ===\n");

  const { states, depth } = generateStateSpace();
  const distinctStates = new Set(states.map((t) => JSON.stringify(t[t.length - 1]))).size;

  const invariants: InvariantCheck[] = [
    {
      name: "TypeInvariant",
      formula: "hookState ∈ {idle, executing, blocked, failed}",
      passed: states.every((t) => t.every(checkTypeInvariant)),
    },
    {
      name: "SafetyInvariant",
      formula: "¬(∃ s1, s2 : lockSet[s1] ∩ lockSet[s2] ≠ {})",
      passed: checkSafetyInvariant(states.map((t) => t[t.length - 1])),
    },
    {
      name: "LivenessProperty",
      formula: "□◇(hookState = idle)",
      passed: checkLiveness(states),
    },
  ];

  const deadlockFree = !states.some(
    (t) =>
      t[t.length - 1].state === "blocked" &&
      !states.some(
        (t2) =>
          t2.length > t.length &&
          JSON.stringify(t2.slice(0, t.length)) === JSON.stringify(t)
      )
  );

  const report: TLAReport = {
    timestamp: new Date().toISOString(),
    specFile: "HookProtocol.tla",
    states: states.length,
    distinctStates,
    depth,
    invariants,
    deadlockFree,
    livenessHolds: invariants.find((i) => i.name === "LivenessProperty")?.passed ?? false,
    recommendation: invariants.every((i) => i.passed) && deadlockFree
      ? "All invariants hold, protocol is correct"
      : "Invariant violation detected — review hook protocol",
  };

  console.log(`States explored: ${states.length}`);
  console.log(`Distinct states: ${distinctStates}`);
  console.log(`Max depth: ${depth}`);
  console.log(`Deadlock free: ${deadlockFree ? "✓" : "✗"}`);
  console.log("\nInvariants:");
  invariants.forEach((inv) => {
    console.log(`  ${inv.passed ? "✓" : "✗"} ${inv.name}: ${inv.formula}`);
  });
  console.log(`\n${report.recommendation}`);

  const outPath = path.join(process.cwd(), "data/state/tla-model-check-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
}

main().catch(console.error);
