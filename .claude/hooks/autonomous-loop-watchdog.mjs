#!/usr/bin/env node
/**
 * autonomous-loop-watchdog — Stop hook for autonomous yolo-mode runs.
 *
 * Bounds the worst-case "stuck loop" damage at 15 minutes. When the
 * agent runs autonomously (PRISM_AUTONOMOUS=1) but produces no commits
 * for 15+ minutes, this hook blocks Stop and writes the reason to
 * AUTONOMOUS_STATE.last_block_reason so the loop driver can shut down
 * cleanly instead of looping forever.
 *
 * FIRES ON: Stop event.
 * BLOCKING: yes (decision:block) when idle threshold exceeded; otherwise pass-through.
 * NON-AUTONOMOUS: pass-through (no PRISM_AUTONOMOUS=1).
 *
 * State contract (state/shared/AUTONOMOUS_STATE.json):
 *   {
 *     schemaVersion: "1.0.0",
 *     session_id: string,
 *     started_at: ISO timestamp,
 *     last_commit_at: ISO timestamp | null,
 *     commits_made: number,
 *     fail_count: number,
 *     caps: { idle_threshold_ms: number, ... },
 *     last_block_reason?: string,
 *   }
 *
 * U-AF01 of AUTONOMOUS-FOOLPROOF-MS0.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const DEFAULT_IDLE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
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

/** Pure decision function — exported for tests. */
export function decideWatchdog({
  isAutonomous,
  state,
  nowMs = Date.now(),
}) {
  // Non-autonomous: hook is a no-op.
  if (!isAutonomous) {
    return { continue: true, reason: "non-autonomous" };
  }

  // No state yet (loop hasn't initialized): allow stop.
  if (!state || typeof state !== "object") {
    return { continue: true, reason: "no-state" };
  }

  // No commit ever in this autonomous session — measure from started_at.
  const lastTs = state.last_commit_at || state.started_at;
  if (!lastTs) {
    return { continue: true, reason: "no-timestamp" };
  }

  let lastMs;
  try {
    lastMs = new Date(lastTs).getTime();
  } catch {
    return { continue: true, reason: "bad-timestamp" };
  }
  if (!Number.isFinite(lastMs)) {
    return { continue: true, reason: "bad-timestamp" };
  }

  const threshold =
    (state.caps && Number.isFinite(state.caps.idle_threshold_ms))
      ? Number(state.caps.idle_threshold_ms)
      : DEFAULT_IDLE_THRESHOLD_MS;

  const elapsed = nowMs - lastMs;
  if (elapsed > threshold) {
    return {
      continue: false,
      decision: "block",
      reason: "idle-exceeded",
      elapsed_ms: elapsed,
      threshold_ms: threshold,
      last_commit_at: lastTs,
    };
  }

  return { continue: true, reason: "active", elapsed_ms: elapsed };
}

function loadState(statePath) {
  try {
    if (!fs.existsSync(statePath)) return null;
    const raw = fs.readFileSync(statePath, "utf8");
    return JSON.parse(raw);
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
    // best-effort, do not crash the hook
  }
}

async function main() {
  const isAutonomous = process.env.PRISM_AUTONOMOUS === "1";

  // Drain stdin so the parent process doesn't hang.
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

// Only run main when invoked as a script (not when imported by tests).
const isDirectInvocation =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\//, ""));
if (isDirectInvocation || process.argv[1]?.endsWith("autonomous-loop-watchdog.mjs")) {
  main();
}
