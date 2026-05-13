#!/usr/bin/env node
// tier: T0
/**
 * stop_on_failing_tests.mjs — Stop Hook (SAFETY-CRITICAL, FAIL-CLOSED)
 *
 * Blocks Stop unless the project-wide test report is fresh AND clean.
 *
 * WHY FAIL-CLOSED: This is safety-critical CNC code. A bug ships
 * G-code that crashes a $200K machine, ruins a $50K aerospace part,
 * or hurts an operator. Earlier behavior was fail-open: missing
 * report → pass, stale report → pass, parse error → pass. A chat
 * shipped 92/97 because its report was stale and the gate winked it
 * through silently. Never again.
 *
 * BLOCK conditions (in order checked):
 *   1. Test report file missing                       → block: "run vitest, retry"
 *   2. Test report parse error                        → block
 *   3. report.failing > 0 / success === false         → block: "fix failures, re-run, retry"
 *   4. report.passing < report.total (inverted acct)  → block
 *
 * PASS condition:
 *   - Report exists, parses, AND failing=0 AND passes==total. A *stale* green
 *     report passes with an advisory — adding green tests in a sibling worktree
 *     cannot turn previously-green tests red (multi-worktree dev reality).
 *
 * NOTE (2026-05-12, U-CLI-PERF): this hook no longer runs vitest itself. A Stop
 * hook must not run a multi-minute test suite synchronously — the old behavior
 * had a 5-min internal budget under a 10-s harness timeout, so a missing/red
 * report meant the hook got SIGKILLed mid-run (test gate effectively skipped).
 * Now: missing/red report → block immediately with the exact command to run.
 * CI / a manual `npx vitest run --reporter=json --outputFile=…` writes the report.
 *
 * To unblock: run
 *   cd mcp-server && npx vitest run --reporter=json --outputFile=data/state/VITEST_REPORT.json
 * then retry Stop.
 *
 * Configurable via env:
 *   STOP_ON_FAILING_TESTS_MAX_AGE_MS   default 1800000 (30 min) — advisory only now
 *   STOP_ON_FAILING_TESTS_OVERRIDE=1   single-Stop bypass (logs to ledger)
 */

import * as fs from "node:fs";
import * as path from "node:path";

// Canonical test-pass report path. Vitest writes JSON here via the
// `--reporter=json --outputFile=…` flags when this hook runs vitest itself
// (or when CI / a manual run uses the same flags). Format follows vitest's
// JSON reporter shape: {numTotalTests, numPassedTests, numFailedTests,
// startTime, endTime, success, testResults: [...]}.
const TEST_REPORT = path.resolve("H:/prism/mcp-server/data/state/VITEST_REPORT.json");
const OVERRIDE_LEDGER = path.resolve("H:/prism/state/shared/TEST_GATE_OVERRIDES.jsonl");
const MAX_AGE_MS = Number(process.env.STOP_ON_FAILING_TESTS_MAX_AGE_MS || 30 * 60 * 1000);
// The exact command that (re)writes the report — surfaced in every block message.
const RERUN_CMD = "cd mcp-server && npx vitest run --reporter=json --outputFile=data/state/VITEST_REPORT.json";

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}

function block(reason, extra = {}) {
  process.stdout.write(JSON.stringify({
    continue: false,
    reason,
    ...extra,
  }));
  process.exit(1);
}

function pass(systemMessage = "pass") {
  process.stdout.write(JSON.stringify({ continue: true, systemMessage }));
  process.exit(0);
}

function logOverride(stdin, reason) {
  try {
    fs.mkdirSync(path.dirname(OVERRIDE_LEDGER), { recursive: true });
    fs.appendFileSync(OVERRIDE_LEDGER, JSON.stringify({
      timestamp: new Date().toISOString(),
      session_id: stdin?.session_id ?? null,
      reason,
    }) + "\n");
  } catch { /* ignore — override is best-effort logging */ }
}

/**
 * Normalize a vitest JSON report into {ts_ms, failing, passing, total, success}.
 * Vitest JSON reporter shape (Vitest 1.x+):
 *   { numTotalTests, numPassedTests, numFailedTests, numPendingTests,
 *     startTime, endTime, success, testResults: [...] }
 * Older/legacy shapes fall back to the field names used in the previous
 * gate (failing, passing, total, timestamp/lastRun) for backward compat.
 */
function normalizeReport(data) {
  // Vitest standard JSON
  if (typeof data?.numTotalTests === "number") {
    return {
      ts_ms: typeof data.endTime === "number" ? data.endTime
           : typeof data.startTime === "number" ? data.startTime
           : null,
      failing: Number(data.numFailedTests ?? 0),
      passing: Number(data.numPassedTests ?? 0),
      total: Number(data.numTotalTests ?? 0),
      success: data.success === true,
      hookError: data._hookError ?? null,
    };
  }
  // Legacy/manual shape — kept for forward compat
  const tsRaw = data?.timestamp ?? data?.lastRun ?? data?.generatedAt ?? null;
  let tsMs;
  if (typeof tsRaw === "number" && Number.isFinite(tsRaw)) tsMs = tsRaw;
  else if (typeof tsRaw === "string") {
    const parsed = Date.parse(tsRaw);
    tsMs = Number.isFinite(parsed) ? parsed : null;
  } else tsMs = null;
  const failing = Number(data?.failing ?? data?.failed ?? 0);
  const passing = Number(data?.passing ?? data?.passed ?? NaN);
  const total = Number(data?.total ?? NaN);
  return {
    ts_ms: tsMs,
    failing,
    passing,
    total,
    success: failing === 0,
    hookError: data?._hookError ?? null,
  };
}

/**
 * Read + parse + normalize the report. Returns either {ok:true, report}
 * or {ok:false, reason} where reason is the user-facing block message.
 */
function readAndNormalize() {
  if (!fs.existsSync(TEST_REPORT)) {
    return { ok: false, reason: `report missing at ${TEST_REPORT}` };
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(TEST_REPORT, "utf-8"));
  } catch (e) {
    return { ok: false, reason: `report unparseable: ${e instanceof Error ? e.message : String(e)}` };
  }
  return { ok: true, report: normalizeReport(data) };
}

function isFresh(report) {
  if (report.ts_ms === null || report.ts_ms <= 0) return false;
  return (Date.now() - report.ts_ms) <= MAX_AGE_MS;
}

function main() {
  const stdin = readStdinSafe();

  // Explicit override path — logs to ledger so abuse is auditable.
  if (process.env.STOP_ON_FAILING_TESTS_OVERRIDE === "1") {
    logOverride(stdin, "STOP_ON_FAILING_TESTS_OVERRIDE=1");
    pass("OVERRIDE — test gate bypassed (logged to TEST_GATE_OVERRIDES.jsonl)");
    return;
  }

  const parsed = readAndNormalize();

  // Missing or unparseable report → block immediately. (This hook no longer
  // runs vitest itself — a multi-minute suite must not run synchronously inside
  // a Stop hook.) The block message carries the exact command to run.
  if (!parsed.ok) {
    block(
      `TEST GATE — ${parsed.reason}. Cannot ship CNC code without a verifiable green test run.\n` +
      `Run:  ${RERUN_CMD}\nthen retry Stop. (CI also writes this report.)`,
    );
    return;
  }

  const report = parsed.report;

  // Hook-error sentinel — legacy stub reports may carry this.
  if (report.hookError) {
    block(
      `TEST GATE — last report was a vitest-error stub: ${report.hookError}. ` +
      `Re-run a clean suite:  ${RERUN_CMD}\nthen retry Stop.`,
    );
    return;
  }

  // Stale-but-green is acceptable in multi-worktree dev (adding green tests in a
  // sibling worktree cannot turn previously-green tests red) — but a *red* report
  // blocks regardless of age: re-run to prove it's gone green.
  const ageMin = report.ts_ms ? Math.floor((Date.now() - report.ts_ms) / 60000) : "unknown";
  if (!isFresh(report) && (report.failing > 0 || report.success === false)) {
    block(
      `TEST GATE — last report (age ${ageMin}min) shows failures (failing=${report.failing}, success=${report.success}). ` +
      `Fix them, then re-run:  ${RERUN_CMD}\nand retry Stop.`,
    );
    return;
  }

  // Failing count
  if (!Number.isFinite(report.failing) || report.failing > 0) {
    block(
      `TEST GATE — ${report.failing} test(s) failing of ${report.total} total. Fix all failures before exiting. ` +
      `Safety-critical: tests must be 100% green to ship CNC code. ` +
      `A single failure can mean a crashed machine, a destroyed part, or worse.`,
    );
    return;
  }

  // Pass-vs-total inversion check (catches accounting bugs in the report)
  if (Number.isFinite(report.passing) && Number.isFinite(report.total) && report.passing < report.total) {
    block(
      `TEST GATE — ${report.passing}/${report.total} passing (${report.total - report.passing} unaccounted). ` +
      `Re-run \`npx vitest run\` to get an accurate report.`,
    );
    return;
  }

  // Vitest's own success flag
  if (report.success === false) {
    block(
      `TEST GATE — vitest reported success:false despite failing=${report.failing}. ` +
      `Inspect the report at ${TEST_REPORT}.`,
    );
    return;
  }

  const ageS = report.ts_ms ? Math.floor((Date.now() - report.ts_ms) / 1000) : "?";
  pass(`TEST GATE — ${report.failing}/${report.total} failing, report ${ageS}s old. Cleared.`);
}

try {
  main();
} catch (e) {
  // Even unexpected errors fail closed — never silently pass.
  block(
    `TEST GATE — unexpected hook error: ${e instanceof Error ? e.message : String(e)}. ` +
    `Fix the hook or set STOP_ON_FAILING_TESTS_OVERRIDE=1 (logged) to bypass once.`,
  );
}
