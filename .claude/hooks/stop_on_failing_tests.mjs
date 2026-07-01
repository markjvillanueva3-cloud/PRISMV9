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
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
// Session-attribution helpers (pure) -- scope the freshness check to THIS session's own edits
// so a PEER slot's uncommitted test edit can no longer thrash this slot's Stop. The fix the
// pure-core comment below prescribes ("scope the INPUT ... session attribution").
import { extractSessionEditedFiles, filterToSessionOwned } from "../helpers/lib/session-edited-files.mjs";

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
export function normalizeReport(data) {
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

export function isFresh(report) {
  if (report.ts_ms === null || report.ts_ms <= 0) return false;
  return (Date.now() - report.ts_ms) <= MAX_AGE_MS;
}

const TEST_FILE_RE = /\.(test|spec)\.[cm]?[jt]sx?$/i;
// VITEST-SCOPE GUARD: VITEST_REPORT.json only covers the mcp-server/ vitest suite (config root
// mcp-server/vitest.config.ts). Repo-root scripts/*.test.mjs and .claude/**/__tests__/*.test.mjs are
// node:test files vitest NEVER runs -- flagging them against the vitest report is a false-positive
// (they are verified by `node <file>` separately). Only treat a changed test file as report-staling
// if it is INSIDE the vitest root. Override the prefix via env for non-default layouts.
// [[reference_test_freshness_gate_thrash_concurrent_fleet_2026_06_24]] (papa, Stop-hook gate integrity).
const VITEST_SCOPE_PREFIX = (process.env.PRISM_TEST_GATE_VITEST_PREFIX || "mcp-server/").replace(/\\/g, "/");
export function isInVitestScope(rel) {
  return String(rel ?? "").replace(/\\/g, "/").startsWith(VITEST_SCOPE_PREFIX);
}
const GIT_STATUS_TIMEOUT_MS = 8000;
const REPORT_WRITE_SLACK_MS = 1000; // tolerate write/report ordering race

/**
 * PURE core of the stale-GREEN check (exported for R9 testing -- has no IO so it is
 * unit-testable without git/fs). Given `git status --porcelain` output, the report
 * timestamp, and an injected mtime lookup, return EVERY uncommitted TEST file whose
 * mtime is newer than the report (+slack). `pickStaleTestFromStatus` keeps the original
 * first-match contract (delegates here); `collectStaleTestsFromStatus` returns the full
 * list so the caller-layer SESSION-ATTRIBUTION filter can decide which are THIS session's.
 *
 * INTENTIONAL fail-safe -- do NOT "fix" THIS pure decision to be less conservative: it flags
 * ANY newer test file in its input, INCLUDING a peer worktree's untracked test. `git status`
 * cannot attribute an edit to a session, so this layer errs toward OVER-blocking rather than
 * UNDER-blocking (a stale/failing test slips through). For a safety-critical CNC gate that is
 * the correct bias. A brand-new untracked failing test MUST still block, so untracked files are
 * NOT exempt. The R9 test pins both directions.
 *
 * The concurrent-fleet THRASH (a PEER slot's test blocking THIS slot's Stop) is fixed at the
 * CALLER layer, NOT here: `pickOwnStaleTest` intersects these candidates with the files THIS
 * session edited (from its transcript -- see `../helpers/lib/session-edited-files.mjs`). When the
 * transcript is unreadable the caller falls back to the conservative candidate, so the
 * never-under-block invariant is preserved. See memory
 * reference_test_freshness_gate_thrash_concurrent_fleet_2026_06_24 + the U-STOPGATE-SESSION-ATTRIBUTION lesson.
 */
export function collectStaleTestsFromStatus(porcelainOut, reportMs, statMtimeMs, slackMs = REPORT_WRITE_SLACK_MS) {
  const out = [];
  if (!reportMs || reportMs <= 0) return out;
  for (const line of String(porcelainOut ?? "").split("\n")) {
    let rel = line.slice(3).trim();
    // git rename/copy ("R  old -> new" / "C  old -> new"): the DESTINATION is the live file.
    // Take the path after the LAST " -> " so the candidate is a real path -- the composite
    // "old -> new" string would never match a session's transcript edit, silently dropping a
    // stale-GREEN block for the renaming session (an UNDER-block). Caught in adversarial review.
    const arrow = rel.lastIndexOf(" -> ");
    if (arrow !== -1) rel = rel.slice(arrow + 4).trim();
    rel = rel.replace(/^"|"$/g, "");
    if (!rel || !TEST_FILE_RE.test(rel)) continue;
    if (!isInVitestScope(rel)) continue; // node:test files outside mcp-server/ are not in the vitest report
    let mtime = null;
    try { mtime = statMtimeMs(rel); } catch { mtime = null; } // deleted/renamed -> ignore
    if (mtime != null && mtime > reportMs + slackMs) out.push(rel);
  }
  return out;
}

// Original first-match contract preserved byte-for-byte (existing callers + R9 pins unchanged).
export function pickStaleTestFromStatus(porcelainOut, reportMs, statMtimeMs, slackMs = REPORT_WRITE_SLACK_MS) {
  return collectStaleTestsFromStatus(porcelainOut, reportMs, statMtimeMs, slackMs)[0] ?? null;
}

/**
 * CALLER-layer SESSION ATTRIBUTION (the documented thrash fix, now implemented). Given the
 * conservative stale-test candidates and the session's transcript text, return the first
 * candidate THIS session actually edited -- a peer's edit is filtered out, killing the
 * cross-chat thrash. Pure (injected transcript text) for R9 testing.
 *
 * SAFETY (never under-block): when `transcriptText` is null/empty -- i.e. the transcript could
 * not be read, so attribution is IMPOSSIBLE -- fall back to the conservative `candidates[0]`
 * (today's over-block). Only when the transcript IS readable do we trust an empty session edit
 * set as "none of these are mine" -> no block. So this can only REMOVE a proven false-positive;
 * it never approves a stale test the session itself authored, and never under-blocks on
 * attribution uncertainty.
 *
 * @param {string[]} candidates       conservative stale test paths (collectStaleTestsFromStatus)
 * @param {?string} transcriptText    session transcript JSONL text, or null if unreadable
 * @returns {?string} the own stale test to block on, or null (no block)
 */
export function pickOwnStaleTest(candidates, transcriptText) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  // Attribution requires a readable transcript. null/empty -> cannot attribute -> conservative.
  if (typeof transcriptText !== "string" || transcriptText.length === 0) return candidates[0];
  const edited = extractSessionEditedFiles(transcriptText);
  const owned = filterToSessionOwned(candidates, edited);
  return owned.length > 0 ? owned[0] : null;
}

// Cap the transcript scan so a pathological multi-hundred-MB transcript can't stall the Stop
// hook. Over the cap (or unreadable/empty) -> null -> attribution falls back to conservative
// (block the candidate), preserving never-under-block. 64MB comfortably covers real sessions.
const TRANSCRIPT_MAX_BYTES = Number(process.env.PRISM_TEST_GATE_TRANSCRIPT_MAX_BYTES || 64 * 1024 * 1024);

/**
 * Read the session transcript JSONL text for attribution. Returns the contents, or null when
 * absent / empty / over the size cap / unreadable (all of which mean "cannot attribute" ->
 * the caller stays conservative). Injected into newestChangedTestNewerThan for testability.
 */
function defaultReadTranscript(transcriptPath) {
  if (!transcriptPath || typeof transcriptPath !== "string") return null;
  if (!fs.existsSync(transcriptPath)) return null;
  let size = 0;
  try { size = fs.statSync(transcriptPath).size; } catch { return null; }
  if (size <= 0 || size > TRANSCRIPT_MAX_BYTES) return null;
  try {
    const txt = fs.readFileSync(transcriptPath, "utf8");
    return txt && txt.length ? txt : null;
  } catch { return null; }
}

/**
 * Close the stale-GREEN hole: a green report is only trustworthy if no TEST file
 * has been edited since it was generated. Returns the first uncommitted test file
 * whose on-disk mtime is newer than the report, else null. Best-effort: any git/fs
 * failure returns null (fail-open) so this only ADDS a block and never removes the
 * report-based fail-closed protection. Scoped to test files (not all source) so it
 * closes the "edit a test, don't re-run, stale-green passes" hole without forcing a
 * full-suite re-run on every source edit. execFileSync (no shell, fixed argv)
 * avoids any injection surface.
 *
 * SESSION ATTRIBUTION (concurrent-fleet thrash fix): the conservative candidates from
 * collectStaleTestsFromStatus are narrowed by pickOwnStaleTest to the files THIS session
 * actually edited (per its transcript), so a PEER slot's uncommitted test edit no longer
 * blocks this slot's Stop. Transcript unreadable -> conservative fallback (block candidate[0]).
 * Disable the whole freshness check with STOP_ON_FAILING_TESTS_SKIP_FRESHNESS=1.
 */
function newestChangedTestNewerThan(reportMs, transcriptPath, readTranscript = defaultReadTranscript) {
  if (!reportMs || reportMs <= 0) return null;
  if (process.env.STOP_ON_FAILING_TESTS_SKIP_FRESHNESS === "1") return null;
  let out = "";
  try {
    out = execFileSync(
      "git",
      ["-C", "H:/prism", "status", "--porcelain", "--untracked-files=all"],
      { encoding: "utf8", timeout: GIT_STATUS_TIMEOUT_MS, windowsHide: true, maxBuffer: 16 * 1024 * 1024 },
    );
  } catch {
    return null; // git unavailable / timeout -> fail-open (do not block on this check)
  }
  const candidates = collectStaleTestsFromStatus(
    out, reportMs, (rel) => fs.statSync(path.resolve("H:/prism", rel)).mtimeMs,
  );
  if (candidates.length === 0) return null;
  // Narrow to THIS session's own edits. readTranscript failure -> null -> conservative fallback.
  let transcriptText = null;
  try { transcriptText = readTranscript(transcriptPath); } catch { transcriptText = null; }
  return pickOwnStaleTest(candidates, transcriptText);
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

  // Stale-GREEN hole: a green report does not reflect a test edited after it was
  // generated. If an uncommitted test file is newer than the report, the green
  // result predates the edit -> require a re-run before shipping.
  const staleTest = newestChangedTestNewerThan(report.ts_ms, stdin?.transcript_path);
  if (staleTest) {
    block(
      `TEST GATE -- green report is STALE relative to your edits: ${staleTest} was modified after the last test run ` +
      `(report age ${ageMin}min). The green result predates this change. Re-run:  ${RERUN_CMD}\nthen retry Stop. ` +
      `(Set STOP_ON_FAILING_TESTS_SKIP_FRESHNESS=1 only if you are certain the edit cannot affect results.)`,
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

// Main-guard: run the gate when invoked directly (the harness runs this file as a
// subprocess), but stay importable so the pure helpers above are R9-testable WITHOUT
// executing main() (which reads stdin + calls process.exit). Hook behavior unchanged.
const __invokedRaw = process.argv[1] ? path.resolve(process.argv[1]) : "";
const __invokedFwd = __invokedRaw.replace(/\\/g, "/");
const __isDirectRun =
  __invokedFwd.endsWith("/stop_on_failing_tests.mjs") ||
  (() => { try { return import.meta.url === pathToFileURL(__invokedRaw).href; } catch { return false; } })();
if (__isDirectRun) {
  try {
    main();
  } catch (e) {
    // Even unexpected errors fail closed -- never silently pass.
    block(
      `TEST GATE -- unexpected hook error: ${e instanceof Error ? e.message : String(e)}. ` +
      `Fix the hook or set STOP_ON_FAILING_TESTS_OVERRIDE=1 (logged) to bypass once.`,
    );
  }
}
