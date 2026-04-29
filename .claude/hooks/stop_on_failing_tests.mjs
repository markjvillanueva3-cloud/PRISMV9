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

const TEST_REPORT = path.resolve("H:/prism/mcp-server/data/state/TEST_COVERAGE_INDEX.json");
const OVERRIDE_LEDGER = path.resolve("H:/prism/state/shared/TEST_GATE_OVERRIDES.jsonl");
const MAX_AGE_MS = Number(process.env.STOP_ON_FAILING_TESTS_MAX_AGE_MS || 30 * 60 * 1000);

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

function main() {
  const stdin = readStdinSafe();

  // Explicit override path — logs to ledger so abuse is auditable.
  if (process.env.STOP_ON_FAILING_TESTS_OVERRIDE === "1") {
    logOverride(stdin, "STOP_ON_FAILING_TESTS_OVERRIDE=1");
    pass("OVERRIDE — test gate bypassed (logged to TEST_GATE_OVERRIDES.jsonl)");
    return;
  }

  // (1) Report missing
  if (!fs.existsSync(TEST_REPORT)) {
    block(
      `TEST GATE — no test report found at ${TEST_REPORT}. ` +
      `Run \`cd mcp-server && npx vitest run\` to generate one before exiting. ` +
      `Safety-critical: never ship without a recent green run.`,
    );
    return;
  }

  // (2) Parse
  let data;
  try {
    data = JSON.parse(fs.readFileSync(TEST_REPORT, "utf-8"));
  } catch (e) {
    block(
      `TEST GATE — test report at ${TEST_REPORT} is unparseable: ` +
      `${e instanceof Error ? e.message : String(e)}. ` +
      `Re-run \`npx vitest run\` to regenerate it.`,
    );
    return;
  }

  // (3) Freshness
  // Accept ISO string OR epoch ms. Falsy → unknown → BLOCK (not pass).
  const tsRaw = data?.timestamp ?? data?.lastRun ?? data?.generatedAt ?? null;
  let tsMs;
  if (typeof tsRaw === "number" && Number.isFinite(tsRaw)) {
    tsMs = tsRaw;
  } else if (typeof tsRaw === "string") {
    const parsed = Date.parse(tsRaw);
    tsMs = Number.isFinite(parsed) ? parsed : null;
  } else {
    tsMs = null;
  }
  if (tsMs === null || tsMs <= 0) {
    block(
      `TEST GATE — test report has no usable timestamp (got ${JSON.stringify(tsRaw)}). ` +
      `Cannot verify freshness. Re-run \`npx vitest run\` to regenerate with a current timestamp.`,
    );
    return;
  }
  const ageMs = Date.now() - tsMs;
  if (ageMs > MAX_AGE_MS) {
    const ageMin = Math.floor(ageMs / 60000);
    const limitMin = Math.floor(MAX_AGE_MS / 60000);
    block(
      `TEST GATE — test report is ${ageMin}min old (limit ${limitMin}min). ` +
      `Re-run \`cd mcp-server && npx vitest run\` to refresh before exiting. ` +
      `Stale report = unverifiable green = unsafe ship.`,
    );
    return;
  }

  // (4) Failing count
  const failing = Number(data?.failing ?? data?.failed ?? 0);
  if (!Number.isFinite(failing) || failing > 0) {
    block(
      `TEST GATE — ${failing} test(s) failing. Fix all failures before exiting. ` +
      `Safety-critical: tests must be 100% green to ship CNC code. ` +
      `A single failure can mean a crashed machine, a destroyed part, or worse.`,
    );
    return;
  }

  // (5) Pass-vs-total inversion check
  const passing = Number(data?.passing ?? data?.passed ?? NaN);
  const total = Number(data?.total ?? NaN);
  if (Number.isFinite(passing) && Number.isFinite(total) && passing < total) {
    block(
      `TEST GATE — ${passing}/${total} passing (${total - passing} unaccounted). ` +
      `Re-run \`npx vitest run\` to get an accurate report.`,
    );
    return;
  }

  // (6) Pass rate fallback
  const passRate = data?.passRate;
  if (typeof passRate === "number" && Number.isFinite(passRate) && passRate < 1.0) {
    block(
      `TEST GATE — passRate=${(passRate * 100).toFixed(2)}% (must be 100%). ` +
      `Re-run \`npx vitest run\` after fixing failures.`,
    );
    return;
  }

  pass(`TEST GATE — ${failing}/0 failing, report ${Math.floor(ageMs / 1000)}s old. Cleared.`);
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
