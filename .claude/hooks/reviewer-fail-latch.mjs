#!/usr/bin/env node
// tier: T0
/**
 * reviewer-fail-latch — Stop hook.
 *
 * Bounds reviewer-FAIL bug propagation at exactly 1 unit. Pure decision
 * logic lives in ./lib/autonomous-foolproof-logic.mjs (decideReviewerFailLatch).
 *
 * U-AF03 of AUTONOMOUS-FOOLPROOF-MS0.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { decideReviewerFailLatch } from "./lib/autonomous-foolproof-logic.mjs";

const VERDICTS_RELATIVE = "state/shared/REVIEWER_VERDICTS.json";
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

function loadJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  const isAutonomous = process.env.PRISM_AUTONOMOUS === "1";
  const overrideEnabled = process.env.PRISM_LATCH_OVERRIDE === "1";

  readStdinSafe();

  const root = findProjectRoot();
  const verdictsFile = loadJsonSafe(path.join(root, VERDICTS_RELATIVE));
  const stateFile = loadJsonSafe(path.join(root, STATE_RELATIVE));

  const result = decideReviewerFailLatch({
    isAutonomous,
    overrideEnabled,
    currentSessionId: stateFile?.session_id ?? null,
    verdicts: verdictsFile?.verdicts ?? null,
  });

  if (result.continue === false) {
    const human = [
      "🛑 REVIEWER-FAIL LATCH — autonomous loop halted by prior FAIL.",
      "",
      `Session has ${result.fail_count} FAIL verdict(s) recorded.`,
      `First failure: unit=${result.first_fail.unit_id}`,
      result.first_fail.summary ? `  → ${result.first_fail.summary}` : "",
      "",
      "Resolve the failed unit, OR set PRISM_LATCH_OVERRIDE=1 to bypass.",
      "Manual intervention required before further autonomous units.",
    ].filter(Boolean).join("\n");

    console.log(JSON.stringify({
      continue: false,
      decision: "block",
      reason: human,
      hookSpecificOutput: {
        hookEventName: "Stop",
        additionalContext: human,
        latch: {
          fail_count: result.fail_count,
          first_fail: result.first_fail,
        },
      },
    }));
    return;
  }

  console.log(JSON.stringify({ continue: true }));
}

if (process.argv[1]?.endsWith("reviewer-fail-latch.mjs")) {
  main();
}
