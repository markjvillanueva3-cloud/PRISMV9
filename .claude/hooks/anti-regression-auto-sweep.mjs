#!/usr/bin/env node
// Origin: prism-intel-p8 :: 2b546d5d9 · Merged via INTEL-OLLAMA-OBSIDIAN-MS0/P16-U03
/**
 * anti-regression-auto-sweep — PostToolUse hook on Bash for `git commit`.
 *
 * After every successful autonomous commit, runs all U-WIRE/U-AF test
 * files via vitest and parses the result. If any test fails, increments
 * AUTONOMOUS_STATE.fail_count and writes a regression record to
 * REVIEWER_VERDICTS.json so the U-AF03 reviewer-fail-latch latches.
 *
 * BLOCKING when:
 *   - PRISM_AUTONOMOUS=1 AND prior commit AND any U-WIRE/U-AF test fails
 *
 * NON-BLOCKING when:
 *   - non-autonomous mode
 *   - command was not a `git commit`
 *   - all tests pass / no tests found / sweep aborted (timeout)
 *
 * Pure decision logic in lib/autonomous-foolproof-logic.mjs
 * (decideAntiRegressionSweep). This hook owns the I/O glue:
 *   1. Detect git commit invocation from stdin payload
 *   2. Glob U-WIRE/U-AF test files
 *   3. Run vitest
 *   4. Parse summary
 *   5. Delegate to decision function
 *   6. Update state files on regression
 *
 * U-AF05 of AUTONOMOUS-FOOLPROOF-MS0.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import {
  isGitCommitCommand,
  decideAntiRegressionSweep,
} from "./lib/autonomous-foolproof-logic.mjs";

const STATE_RELATIVE = "state/shared/AUTONOMOUS_STATE.json";
const VERDICTS_RELATIVE = "state/shared/REVIEWER_VERDICTS.json";
const VITEST_TIMEOUT_MS = 120 * 1000;
const TEST_FILE_GLOB = "src/__tests__/*.{uwire*,uAf*,autonomousLoopWatchdog,tscBaselineRegressionGate,reviewerFailLatch,costCeilingStop,antiRegressionSweep}.test.ts";

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

function findTestFiles(mcpServerRoot) {
  // Match U-WIRE round-trip tests + U-AF synthetic-input tests
  const testsDir = path.join(mcpServerRoot, "src", "__tests__");
  if (!fs.existsSync(testsDir)) return [];
  const allFiles = fs.readdirSync(testsDir);
  return allFiles
    .filter((f) => f.endsWith(".test.ts"))
    .filter((f) => {
      const lower = f.toLowerCase();
      return (
        /uwire\d+/.test(lower) ||
        /^autonomousloopwatchdog/.test(lower) ||
        /^tscbaselineregressiongate/.test(lower) ||
        /^reviewerfaillatch/.test(lower) ||
        /^costceilingstop/.test(lower) ||
        /^antiregressionsweep/.test(lower)
      );
    })
    .map((f) => path.join("src", "__tests__", f));
}

/** Parse vitest output to extract { totalTests, passed, failed, failedFiles[] }. */
function parseVitestSummary(stdout) {
  // Vitest prints lines like:
  //   Tests  70 passed (70)
  //   Tests  1 failed | 69 passed (70)
  //   Test Files  3 failed | 1 passed (4)
  // and per-file " FAIL  src/__tests__/foo.test.ts"
  const text = String(stdout || "");

  // Total/passed/failed
  const summary = text.match(/Tests\s+(?:(\d+)\s+failed\s*\|\s*)?(\d+)\s+passed\s*\((\d+)\)/);
  let totalTests = 0;
  let passed = 0;
  let failed = 0;
  if (summary) {
    failed = summary[1] ? Number(summary[1]) : 0;
    passed = Number(summary[2]);
    totalTests = Number(summary[3]);
  }

  const failedFiles = [];
  const failRegex = /\bFAIL\s+(src\/__tests__\/[^\s]+\.test\.ts)/g;
  let m;
  while ((m = failRegex.exec(text)) !== null) {
    if (!failedFiles.includes(m[1])) failedFiles.push(m[1]);
  }

  return { totalTests, passed, failed, failedFiles };
}

function runSweep(mcpServerRoot, testFiles) {
  if (testFiles.length === 0) {
    return { totalTests: 0, passed: 0, failed: 0, failedFiles: [] };
  }
  const fileArgs = testFiles.map((f) => `"${f}"`).join(" ");
  let output;
  try {
    output = execSync(`npx --no-install vitest run ${fileArgs} 2>&1`, {
      cwd: mcpServerRoot,
      timeout: VITEST_TIMEOUT_MS,
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, FORCE_COLOR: "0" },
    }).toString();
  } catch (err) {
    output = (err.stdout?.toString() ?? "") + (err.stderr?.toString() ?? "");
    if (!output) return null; // sweep aborted, fail-OPEN
  }
  return parseVitestSummary(output);
}

function recordRegression(verdictsPath, sessionId, sweepResult) {
  try {
    fs.mkdirSync(path.dirname(verdictsPath), { recursive: true });
    let payload = { schemaVersion: "1.0.0", verdicts: [] };
    if (fs.existsSync(verdictsPath)) {
      try {
        payload = JSON.parse(fs.readFileSync(verdictsPath, "utf8"));
        if (!Array.isArray(payload.verdicts)) payload.verdicts = [];
      } catch {
        /* fall through to fresh payload */
      }
    }
    payload.verdicts.push({
      session_id: sessionId,
      unit_id: "auto-sweep",
      verdict: "FAIL",
      at: new Date().toISOString(),
      summary: `${sweepResult.failed}/${sweepResult.totalTests} tests failed: ${sweepResult.failedFiles.slice(0, 3).join(", ")}${sweepResult.failedFiles.length > 3 ? "…" : ""}`,
      agent_id: "anti-regression-auto-sweep",
    });
    fs.writeFileSync(verdictsPath, JSON.stringify(payload, null, 2), "utf8");
  } catch {
    /* best-effort */
  }
}

function bumpFailCount(statePath) {
  try {
    if (!fs.existsSync(statePath)) return;
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    state.fail_count = (Number.isFinite(state.fail_count) ? Number(state.fail_count) : 0) + 1;
    state.last_block_reason = "anti-regression-detected";
    state.last_block_at = new Date().toISOString();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");
  } catch {
    /* best-effort */
  }
}

async function main() {
  const isAutonomous = process.env.PRISM_AUTONOMOUS === "1";

  const raw = readStdinSafe();
  let payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {};
  }

  const cmd = payload?.tool_input?.command ?? "";
  const isCommit = isGitCommitCommand(cmd);

  if (!isCommit || !isAutonomous) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const root = findProjectRoot();
  const mcpServer = path.join(root, "mcp-server");
  if (!fs.existsSync(mcpServer)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const testFiles = findTestFiles(mcpServer);
  const sweepResult = runSweep(mcpServer, testFiles);

  const result = decideAntiRegressionSweep({
    isAutonomous,
    isCommit,
    sweepResult,
  });

  if (result.continue === false) {
    const stateFile = loadJsonSafe(path.join(root, STATE_RELATIVE));
    const sessionId = stateFile?.session_id ?? "unknown-session";

    recordRegression(path.join(root, VERDICTS_RELATIVE), sessionId, {
      totalTests: result.total_tests,
      passed: result.passed,
      failed: result.failed,
      failedFiles: result.failed_files,
    });
    bumpFailCount(path.join(root, STATE_RELATIVE));

    const human = [
      "🔁 ANTI-REGRESSION SWEEP — post-commit tests failing.",
      "",
      `Total: ${result.total_tests}, passed: ${result.passed}, failed: ${result.failed}`,
      "",
      "Failed files:",
      ...result.failed_files.slice(0, 10).map((f) => `  • ${f}`),
      result.failed_files.length > 10 ? `  …and ${result.failed_files.length - 10} more` : "",
      "",
      "Logged to REVIEWER_VERDICTS.json (FAIL). reviewer-fail-latch will block",
      "subsequent units. Resolve manually or set PRISM_LATCH_OVERRIDE=1.",
    ].filter(Boolean).join("\n");

    console.log(JSON.stringify({
      continue: true, // PostToolUse can't block the just-finished tool call
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: human,
        regression: {
          total_tests: result.total_tests,
          passed: result.passed,
          failed: result.failed,
          failed_files: result.failed_files,
        },
      },
    }));
    return;
  }

  console.log(JSON.stringify({ continue: true }));
}

if (process.argv[1]?.endsWith("anti-regression-auto-sweep.mjs")) {
  main();
}
