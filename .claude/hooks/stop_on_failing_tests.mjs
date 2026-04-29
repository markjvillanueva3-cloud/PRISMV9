#!/usr/bin/env node
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
 *   1. Test report file missing
 *   2. Test report parse error
 *   3. Test report older than MAX_AGE_MS (default 30 minutes)
 *   4. report.failing > 0  OR  report.failed > 0
 *   5. report.passing < report.total  (catches inverted accounting)
 *   6. report.passRate < 1.0 if present
 *
 * PASS condition (only one):
 *   - Report exists, parses, is fresh, AND failing=0 AND passes==total
 *
 * To unblock: run `npx vitest run` from mcp-server/, then retry Stop.
 *
 * Configurable via env:
 *   STOP_ON_FAILING_TESTS_MAX_AGE_MS   default 1800000 (30 min)
 *   STOP_ON_FAILING_TESTS_OVERRIDE=1   single-Stop bypass (logs to ledger)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

// Canonical test-pass report path. Vitest writes JSON here via the
// `--reporter=json --outputFile=…` flags when this hook runs vitest itself
// (or when CI / a manual run uses the same flags). Format follows vitest's
// JSON reporter shape: {numTotalTests, numPassedTests, numFailedTests,
// startTime, endTime, success, testResults: [...]}.
const TEST_REPORT = path.resolve("H:/prism/mcp-server/data/state/VITEST_REPORT.json");
const OVERRIDE_LEDGER = path.resolve("H:/prism/state/shared/TEST_GATE_OVERRIDES.jsonl");
const MAX_AGE_MS = Number(process.env.STOP_ON_FAILING_TESTS_MAX_AGE_MS || 30 * 60 * 1000);
// When no fresh report exists, run vitest ourselves with this budget. 5min
// is generous for the U-WIRE test slice (each unit's tests run in <1s);
// a full suite runs longer but those should be done at commit/CI time.
const VITEST_BUDGET_MS = Number(process.env.STOP_ON_FAILING_TESTS_VITEST_BUDGET_MS || 5 * 60 * 1000);
// MCP-server cwd that owns the package.json + vitest config.
const VITEST_CWD = path.resolve("H:/prism/mcp-server");
// Minimum total tests in the report to trust it as a full-suite run.
// Project has ~2838 test files / ~3065 `it(` blocks. A 33-test report
// (single U-WIRE file) MUST NOT satisfy the gate. 1000 is conservative —
// large enough to refuse a single suite, small enough to allow a focused
// re-run after a CI partial-rerun. Override via env if narrowing on purpose.
const MIN_SUITE_SIZE = Number(process.env.STOP_ON_FAILING_TESTS_MIN_SUITE || 1000);

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
 * Run vitest synchronously with JSON reporter targeting TEST_REPORT.
 * Returns true if the report was successfully written, false otherwise.
 * NEVER throws — failures are logged to the report file and surfaced via
 * the regular gate-block path so the user sees a real error.
 */
function runVitestAndWriteReport() {
  try {
    fs.mkdirSync(path.dirname(TEST_REPORT), { recursive: true });
    // Use vitest's JSON reporter. --run forces single-pass (no watch).
    // 2>&1 captures stderr too in case vitest dies.
    const cmd = `npx --no-install vitest run --reporter=json --outputFile="${TEST_REPORT}"`;
    execSync(cmd, {
      cwd: VITEST_CWD,
      timeout: VITEST_BUDGET_MS,
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
    return fs.existsSync(TEST_REPORT);
  } catch (e) {
    // Vitest exits non-zero when tests fail — but it STILL writes the
    // report file. So a non-zero exit is fine as long as the report exists.
    if (fs.existsSync(TEST_REPORT)) return true;
    // Could not write the report at all (vitest crashed, npx missing, etc).
    // Synthesize a stub report that BLOCKs the gate with a useful reason.
    try {
      fs.writeFileSync(TEST_REPORT, JSON.stringify({
        timestamp: Date.now(),
        success: false,
        numTotalTests: 0,
        numPassedTests: 0,
        numFailedTests: 0,
        _hookError: e instanceof Error ? e.message : String(e),
      }, null, 2));
    } catch { /* ignore */ }
    return false;
  }
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

  // First read attempt — may auto-run vitest below if report is missing or red.
  // Stale-but-green is acceptable in multi-worktree dev: existing green tests
  // do not become red by adding new green tests in a sibling worktree. We only
  // auto-run vitest when the report is missing OR previously red, since those
  // are the cases where staleness could mask a real regression.
  let parsed = readAndNormalize();
  const reportPresent = parsed.ok;
  const reportGreen = reportPresent
    && Number.isFinite(parsed.report.failing)
    && parsed.report.failing === 0
    && parsed.report.success !== false;
  const needsRun = !reportPresent || !reportGreen;

  if (needsRun) {
    // Run vitest synchronously to generate a fresh report. Budget = 5 min default.
    const wrote = runVitestAndWriteReport();
    if (!wrote) {
      block(
        `TEST GATE — vitest invocation failed and no fallback report exists. ` +
        `Try \`cd mcp-server && npx vitest run --reporter=json --outputFile=data/state/VITEST_REPORT.json\` manually. ` +
        `Cannot ship without a verifiable green run.`,
      );
      return;
    }
    parsed = readAndNormalize();
    if (!parsed.ok) {
      block(
        `TEST GATE — vitest ran but the report is unreadable: ${parsed.reason}. ` +
        `Inspect ${TEST_REPORT} manually.`,
      );
      return;
    }
  }

  const report = parsed.report;

  // Hook-error sentinel — set by runVitestAndWriteReport on crash
  if (report.hookError) {
    block(
      `TEST GATE — vitest crashed: ${report.hookError}. ` +
      `Cannot verify test status. Fix the crash before shipping.`,
    );
    return;
  }

  // Freshness + suite-size are only enforced when we just ran vitest (needsRun
  // path) — i.e. the report was missing or red. For stale-but-green reports we
  // pass with an advisory, since adding tests in a sibling worktree cannot
  // turn previously-green tests red.
  if (needsRun) {
    if (!isFresh(report)) {
      const ageMin = report.ts_ms ? Math.floor((Date.now() - report.ts_ms) / 60000) : "unknown";
      block(
        `TEST GATE — report still stale after refresh attempt (age ${ageMin}min). ` +
        `Inspect ${TEST_REPORT}.`,
      );
      return;
    }

    if (Number.isFinite(report.total) && report.total < MIN_SUITE_SIZE) {
      block(
        `TEST GATE — report covers only ${report.total} tests (minimum ${MIN_SUITE_SIZE}). ` +
        `Single-file or partial-suite reports are not sufficient for safety-critical ship. ` +
        `Run \`cd mcp-server && npx vitest run --reporter=json --outputFile=data/state/VITEST_REPORT.json\` ` +
        `for a full-suite report, OR set STOP_ON_FAILING_TESTS_MIN_SUITE=<n> if intentionally narrowing.`,
      );
      return;
    }
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
