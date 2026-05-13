#!/usr/bin/env node
// tier: T0
/**
 * autonomous-loop-watchdog — Stop hook for autonomous yolo-mode runs.
 *
 * Bounds the worst-case "stuck loop" damage at 15 minutes. Pure decision
 * logic lives in ./lib/autonomous-foolproof-logic.mjs (decideWatchdog).
 *
 * U-AF01 of AUTONOMOUS-FOOLPROOF-MS0.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { decideWatchdog } from "./lib/autonomous-foolproof-logic.mjs";

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

async function main() {
  const isAutonomous = process.env.PRISM_AUTONOMOUS === "1";
  readStdinSafe();

  const root = findProjectRoot();
  const statePath = path.join(root, STATE_RELATIVE);
  const state = loadState(statePath);

  const result = decideWatchdog({ isAutonomous, state });

  if (result.continue === false && result.decision === "block") {
    const human = [
      "⏰ AUTONOMOUS LOOP WATCHDOG — idle threshold exceeded.",
      "",
      `Idle: ${Math.round(result.elapsed_ms / 1000)}s (threshold ${Math.round(result.threshold_ms / 1000)}s)`,
      `Last commit at: ${result.last_commit_at}`,
      "",
      "The autonomous loop has produced no commits for too long. Stopping the run",
      "to prevent runaway. To resume manually: unset PRISM_AUTONOMOUS or update",
      `state/shared/AUTONOMOUS_STATE.json:last_commit_at to a recent timestamp.`,
    ].join("\n");

    writeBlockReason(statePath, "idle-exceeded");

    console.log(JSON.stringify({
      continue: false,
      decision: "block",
      reason: human,
      hookSpecificOutput: {
        hookEventName: "Stop",
        additionalContext: human,
        watchdog: {
          elapsed_ms: result.elapsed_ms,
          threshold_ms: result.threshold_ms,
          last_commit_at: result.last_commit_at,
        },
      },
    }));
    return;
  }

  console.log(JSON.stringify({ continue: true }));
}

if (process.argv[1]?.endsWith("autonomous-loop-watchdog.mjs")) {
  main();
}
