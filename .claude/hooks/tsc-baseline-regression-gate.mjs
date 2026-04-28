#!/usr/bin/env node
/**
 * tsc-baseline-regression-gate — PreToolUse hook on Bash.
 *
 * Bounds compounding type-error damage at exactly 1 commit. Pure decision
 * logic lives in ./lib/autonomous-foolproof-logic.mjs.
 *
 * U-AF02 of AUTONOMOUS-FOOLPROOF-MS0.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import {
  isGitCommitCommand,
  decideTscRegressionGate,
} from "./lib/autonomous-foolproof-logic.mjs";

const BASELINE_RELATIVE = "state/shared/TSC_BASELINE_ERRORS.json";
const TSC_TIMEOUT_MS = 90 * 1000;

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

function loadBaseline(baselinePath) {
  try {
    if (!fs.existsSync(baselinePath)) return null;
    const parsed = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
    if (typeof parsed.error_count === "number" && Number.isFinite(parsed.error_count)) {
      return parsed.error_count;
    }
    return null;
  } catch {
    return null;
  }
}

function writeBaseline(baselinePath, count) {
  try {
    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
    fs.writeFileSync(
      baselinePath,
      JSON.stringify(
        {
          schemaVersion: "1.0.0",
          error_count: count,
          updated_at: new Date().toISOString(),
        },
        null,
        2,
      ),
      "utf8",
    );
  } catch {
    /* best-effort */
  }
}

function countTscErrors(projectRoot) {
  try {
    const mcpServer = path.join(projectRoot, "mcp-server");
    if (!fs.existsSync(mcpServer)) return null;

    let output;
    try {
      output = execSync("npx --no-install tsc --noEmit 2>&1", {
        cwd: mcpServer,
        timeout: TSC_TIMEOUT_MS,
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 16 * 1024 * 1024,
      }).toString();
    } catch (err) {
      output = (err.stdout?.toString() ?? "") + (err.stderr?.toString() ?? "");
      if (!output) return null;
    }

    const lines = output.split("\n");
    return lines.filter((l) => /\): error TS\d+/.test(l)).length;
  } catch {
    return null;
  }
}

async function main() {
  const isAutonomous = process.env.PRISM_AUTONOMOUS === "1";
  const allowRegression = process.env.PRISM_TSC_ALLOW_REGRESSION === "1";

  const raw = readStdinSafe();
  let payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {};
  }

  const cmd = payload?.tool_input?.command ?? "";
  const isCommit = isGitCommitCommand(cmd);

  if (!isCommit) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const root = findProjectRoot();
  const baselinePath = path.join(root, BASELINE_RELATIVE);
  const baseline = loadBaseline(baselinePath);
  const current = countTscErrors(root);

  const result = decideTscRegressionGate({
    isAutonomous,
    isCommit,
    allowRegression,
    baseline,
    current,
  });

  if (result.initialize_to !== undefined) {
    writeBaseline(baselinePath, result.initialize_to);
  }

  if (result.continue === false) {
    const human = [
      "🚧 TSC BASELINE REGRESSION GATE — commit blocked.",
      "",
      `Baseline: ${result.baseline} errors`,
      `Current:  ${result.current} errors  (+${result.delta})`,
      "",
      "The autonomous loop introduced a TypeScript error regression.",
      "Resolve the new errors, OR set PRISM_TSC_ALLOW_REGRESSION=1 to override.",
      "",
      `Baseline file: ${path.relative(root, baselinePath)}`,
    ].join("\n");

    console.log(JSON.stringify({
      continue: false,
      decision: "block",
      reason: human,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: human,
        regression: {
          baseline: result.baseline,
          current: result.current,
          delta: result.delta,
        },
      },
    }));
    return;
  }

  if (result.reason === "regression-warned") {
    const warning = `⚠️ TSC regression detected: ${result.baseline} → ${result.current} (+${result.delta}). Not blocking (non-autonomous mode). Set PRISM_AUTONOMOUS=1 to enforce.`;
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: warning,
      },
    }));
    return;
  }

  console.log(JSON.stringify({ continue: true }));
}

if (process.argv[1]?.endsWith("tsc-baseline-regression-gate.mjs")) {
  main();
}
