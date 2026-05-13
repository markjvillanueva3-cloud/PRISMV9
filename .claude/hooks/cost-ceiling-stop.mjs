#!/usr/bin/env node
// tier: T0
/**
 * cost-ceiling-stop — Stop hook.
 *
 * Bounds runaway autonomous spending across 4 dimensions:
 *   - cost_usd          (default cap $50)
 *   - tokens            (default cap 5,000,000)
 *   - wall_time_ms      (default cap 5h)
 *   - unit_max          (default cap 25 commits)
 *
 * The loop driver (yolo-mode pipeline) updates AUTONOMOUS_STATE.cost_used_usd,
 * tokens_used, and commits_made after each unit. This hook only reads them
 * and compares against state.caps.* (or defaults).
 *
 * Pure decision logic in lib/autonomous-foolproof-logic.mjs.
 *
 * U-AF04 of AUTONOMOUS-FOOLPROOF-MS0.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { decideCostCeiling } from "./lib/autonomous-foolproof-logic.mjs";

const STATE_RELATIVE = "state/shared/AUTONOMOUS_STATE.json";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function findProjectRoot(startCwd = process.cwd()) {
  let cur = startCwd;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(cur, ".claude", "settings.json"))) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return startCwd;
}

function loadState(statePath) {
  try {
    if (!fs.existsSync(statePath)) return null;
    return JSON.parse(fs.readFileSync(statePath, "utf8"));
  } catch {
    return null;
  }
}

function writeBlockReason(statePath, reason) {
  try {
    if (!fs.existsSync(statePath)) return;
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    state.last_block_reason = reason;
    state.last_block_at = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");
  } catch {
    /* best-effort */
  }
}

function formatBreach(b) {
  if (b.cap === "wall_time_ms") {
    return `wall_time: ${Math.round(b.value / 60000)}min (cap ${Math.round(b.limit / 60000)}min)`;
  }
  if (b.cap === "cost_usd") {
    return `cost: $${b.value.toFixed(2)} (cap $${b.limit.toFixed(2)})`;
  }
  if (b.cap === "tokens") {
    return `tokens: ${b.value.toLocaleString()} (cap ${b.limit.toLocaleString()})`;
  }
  if (b.cap === "unit_max") {
    return `units: ${b.value} (cap ${b.limit})`;
  }
  return `${b.cap}: ${b.value} (cap ${b.limit})`;
}

async function main() {
  const isAutonomous = process.env.PRISM_AUTONOMOUS === "1";
  const overrideEnabled = process.env.PRISM_COST_OVERRIDE === "1";

  readStdinSafe();

  const root = findProjectRoot();
  const statePath = path.join(root, STATE_RELATIVE);
  const state = loadState(statePath);

  const result = decideCostCeiling({ isAutonomous, overrideEnabled, state });

  if (result.continue === false && result.decision === "block") {
    const breachLines = (result.breaches ?? []).map((b) => `  • ${formatBreach(b)}`);
    const human = [
      "💰 COST CEILING REACHED — autonomous loop halted.",
      "",
      "Breached caps:",
      ...breachLines,
      "",
      "The autonomous run hit one or more spending limits. Resolve manually,",
      "raise caps in state/shared/AUTONOMOUS_STATE.json:caps, or set",
      "PRISM_COST_OVERRIDE=1 to bypass.",
    ].join("\n");

    writeBlockReason(statePath, "ceiling-breached");

    console.log(JSON.stringify({
      continue: false,
      decision: "block",
      reason: human,
      hookSpecificOutput: {
        hookEventName: "Stop",
        additionalContext: human,
        ceiling: { breaches: result.breaches },
      },
    }));
    return;
  }

  console.log(JSON.stringify({ continue: true }));
}

if (process.argv[1]?.endsWith("cost-ceiling-stop.mjs")) {
  main();
}
