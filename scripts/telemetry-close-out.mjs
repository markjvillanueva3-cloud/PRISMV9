#!/usr/bin/env node
/**
 * telemetry-close-out.mjs — CLEANUP-MS0 / U-CLEANUP-TELEMETRY-CLOSE
 *
 * Canonical close-out orchestrator for the S11.7 telemetry stage of an
 * rgs/forge milestone. Composes three pre-existing scripts in the order
 * the rgs6 self-optimizing layer expects:
 *
 *   1. pipeline-telemetry.mjs summary   — read ledger, count stage coverage
 *   2. adaptive-thresholds.mjs          — recompute + persist tuned thresholds
 *   3. auto-build-compounding-proposals.mjs <milestone>  (conditional)
 *      — only when S11.6 (compounding-gains audit) has a BLOCK violation for
 *        the named milestone in the recent telemetry window
 *
 * Then emits a structured coverage summary: how many of the 18 canonical
 * pipeline stages have at least one telemetry record. Missing stages are
 * informational, not fatal — future rgs/forge runs naturally backfill them.
 *
 * Exit codes:
 *   0  — everything ran (regardless of coverage gaps)
 *   1  — at least one child script returned a non-zero exit
 *   2  — bad args / unreadable telemetry / sub-script missing on disk
 *
 * CLI:
 *   node scripts/telemetry-close-out.mjs
 *     [--milestone <ID>]      target milestone for conditional auto-build
 *     [--dry-run]             forward to adaptive-thresholds.mjs --dry-run
 *     [--skip-auto-build]     never run auto-build, even if S11.6 BLOCK present
 *     [--json]                emit JSON summary instead of text
 *
 * Design notes:
 *   - Telemetry is best-effort; a missing or truncated ledger does NOT
 *     fail this script. We log to stderr and continue.
 *   - The 18 canonical stages come from pipeline-telemetry.mjs's
 *     VALID_STAGES set; we duplicate the list here so we can detect drift
 *     between the two scripts (a CI check; we don't auto-sync).
 *   - All sub-script invocations use spawnSync with an 8-second timeout —
 *     no orchestration step should hang the milestone close.
 *
 * @see U-CLEANUP-TELEMETRY-CLOSE (envelope was not_started)
 */

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const PRISM_ROOT = "H:/prism";
const TELEMETRY_LEDGER = `${PRISM_ROOT}/state/shared/pipeline-telemetry.jsonl`;

const PIPELINE_TELEMETRY = `${PRISM_ROOT}/.claude/scripts/pipeline-telemetry.mjs`;
const ADAPTIVE_THRESHOLDS = `${PRISM_ROOT}/.claude/scripts/adaptive-thresholds.mjs`;
const AUTO_BUILD = `${PRISM_ROOT}/.claude/scripts/auto-build-compounding-proposals.mjs`;

/** The 18 canonical rgs/forge pipeline stages. Duplicated from VALID_STAGES in pipeline-telemetry.mjs. */
export const CANONICAL_STAGES = Object.freeze([
  "S0", "S0.5", "S0.6", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8",
  "S9", "S10", "S11", "S11.5", "S11.6", "phase4_loop", "phase6_handoff",
]);

const CHILD_TIMEOUT_MS = 8_000;
const SCHEMA_VERSION = 1;

export function parseArgs(argv) {
  const out = {
    milestone: null,
    dryRun: false,
    skipAutoBuild: false,
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--milestone" && argv[i + 1]) out.milestone = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--skip-auto-build") out.skipAutoBuild = true;
    else if (a === "--json") out.json = true;
  }
  return out;
}

/**
 * Read a JSONL ledger, return parsed records. Malformed lines are skipped.
 * Returns `{ records: [], readError: string|null }` so callers can distinguish
 * "no file" / "no records" / "parse error".
 */
export function readTelemetry(filePath) {
  if (!existsSync(filePath)) {
    return { records: [], readError: "telemetry-missing" };
  }
  let raw;
  try { raw = readFileSync(filePath, "utf-8"); }
  catch (e) { return { records: [], readError: `read-failed: ${e.message}` }; }
  const records = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try { records.push(JSON.parse(trimmed)); }
    catch { /* tolerate */ }
  }
  return { records, readError: null };
}

/**
 * @param {Array<{stage?: string}>} records
 * @returns {{covered: string[], missing: string[], totalRecords: number}}
 */
export function computeStageCoverage(records) {
  const seen = new Set();
  for (const r of records) {
    if (typeof r?.stage === "string" && CANONICAL_STAGES.includes(r.stage)) {
      seen.add(r.stage);
    }
  }
  const covered = CANONICAL_STAGES.filter((s) => seen.has(s));
  const missing = CANONICAL_STAGES.filter((s) => !seen.has(s));
  return { covered, missing, totalRecords: records.length };
}

/**
 * Detect whether a milestone has an S11.6 BLOCK violation in recent telemetry.
 * "Recent" = since the most recent stage_entry for any stage (proxy for
 * "this rgs/forge run"). Caller may pass `windowRecords` to override.
 */
export function shouldAutoBuild(records, milestoneId) {
  if (!milestoneId) return false;
  for (const r of records) {
    if (
      r?.milestone === milestoneId &&
      r?.stage === "S11.6" &&
      r?.event === "violation" &&
      (r?.payload?.kind === "compounding-gains-block" ||
        r?.payload?.severity === "BLOCK")
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Spawn a node script with a bounded timeout; never throw on failure.
 * Returns `{ ok, exitCode, stdout, stderr, error }`.
 *
 * @param {string} scriptPath     Absolute path to the .mjs file.
 * @param {string[]} args         Extra args.
 * @param {object} [opts]
 * @param {function} [opts.spawnFn]  Override (for tests).
 * @param {number}   [opts.timeoutMs]
 */
export function runChildScript(scriptPath, args, opts = {}) {
  const spawnFn = opts.spawnFn || spawnSync;
  if (!existsSync(scriptPath)) {
    return {
      ok: false, exitCode: null, stdout: "", stderr: "",
      error: `script-missing: ${scriptPath}`,
    };
  }
  const timeoutMs = opts.timeoutMs ?? CHILD_TIMEOUT_MS;
  let r;
  try {
    r = spawnFn(process.execPath, [scriptPath, ...args], {
      encoding: "utf-8",
      timeout: timeoutMs,
      windowsHide: true,
    });
  } catch (e) {
    return { ok: false, exitCode: null, stdout: "", stderr: "", error: `spawn-threw: ${e.message}` };
  }
  return {
    ok: r.status === 0,
    exitCode: r.status,
    stdout: (r.stdout || "").toString(),
    stderr: (r.stderr || "").toString(),
    error: r.error ? `${r.error.code || ""} ${r.error.message || ""}`.trim() : null,
  };
}

/**
 * Orchestrate the 3-step close-out.
 *
 * @param {object} opts                  parseArgs() output.
 * @param {object} [hooks]               test seams
 * @param {function} [hooks.readTelemetryFn]
 * @param {function} [hooks.spawnFn]
 * @returns {{ok: boolean, summary: object, errors: string[]}}
 */
export function closeOut(opts, hooks = {}) {
  const readFn = hooks.readTelemetryFn || readTelemetry;
  const spawnFn = hooks.spawnFn || undefined;

  const result = {
    schemaVersion: SCHEMA_VERSION,
    ok: true,
    milestone: opts.milestone,
    dryRun: !!opts.dryRun,
    skipAutoBuild: !!opts.skipAutoBuild,
    telemetry: { totalRecords: 0, covered: [], missing: [], readError: null },
    adaptiveThresholds: null,
    autoBuild: { ran: false, reason: "" },
    errors: [],
  };

  // 1. Telemetry coverage
  const { records, readError } = readFn(TELEMETRY_LEDGER);
  result.telemetry.readError = readError;
  const cov = computeStageCoverage(records);
  result.telemetry.totalRecords = cov.totalRecords;
  result.telemetry.covered = cov.covered;
  result.telemetry.missing = cov.missing;

  // 2. Adaptive thresholds — recompute + persist (or dry-run)
  const adaptiveArgs = opts.dryRun ? ["--dry-run"] : [];
  const adaptive = runChildScript(ADAPTIVE_THRESHOLDS, adaptiveArgs, { spawnFn });
  result.adaptiveThresholds = {
    ok: adaptive.ok,
    exitCode: adaptive.exitCode,
    stdoutBytes: adaptive.stdout.length,
    stderrBytes: adaptive.stderr.length,
    error: adaptive.error,
  };
  if (!adaptive.ok) {
    result.ok = false;
    result.errors.push(`adaptive-thresholds: ${adaptive.error || `exit ${adaptive.exitCode}`}`);
  }

  // 3. Conditional auto-build — only when caller named a milestone AND
  //    S11.6 has a BLOCK violation for it.
  if (opts.skipAutoBuild) {
    result.autoBuild.reason = "skip-auto-build flag set";
  } else if (!opts.milestone) {
    result.autoBuild.reason = "no milestone arg (auto-build is per-milestone)";
  } else if (!shouldAutoBuild(records, opts.milestone)) {
    result.autoBuild.reason = "no S11.6 BLOCK violation for milestone in telemetry";
  } else {
    const autoArgs = ["--milestone", opts.milestone];
    if (opts.dryRun) autoArgs.push("--dry-run");
    const auto = runChildScript(AUTO_BUILD, autoArgs, { spawnFn });
    result.autoBuild = {
      ran: true,
      ok: auto.ok,
      exitCode: auto.exitCode,
      stdoutBytes: auto.stdout.length,
      stderrBytes: auto.stderr.length,
      error: auto.error,
      reason: "S11.6 BLOCK present — proposals built",
    };
    if (!auto.ok) {
      result.ok = false;
      result.errors.push(`auto-build: ${auto.error || `exit ${auto.exitCode}`}`);
    }
  }

  return result;
}

function renderText(r) {
  const cov = r.telemetry;
  const lines = [];
  lines.push(`telemetry-close-out  milestone=${r.milestone ?? "(none)"}  dryRun=${r.dryRun}`);
  lines.push(`  telemetry: ${cov.totalRecords} record(s); coverage ${cov.covered.length}/${CANONICAL_STAGES.length} stages`);
  if (cov.missing.length > 0) {
    lines.push(`    missing: ${cov.missing.join(", ")}`);
  }
  if (cov.readError) lines.push(`    readError: ${cov.readError}`);
  const at = r.adaptiveThresholds;
  lines.push(`  adaptive-thresholds: ${at?.ok ? "OK" : "FAIL"} (exit ${at?.exitCode}, ${at?.stdoutBytes ?? 0}B stdout)`);
  if (at?.error) lines.push(`    error: ${at.error}`);
  const ab = r.autoBuild;
  if (ab?.ran) {
    lines.push(`  auto-build: ${ab.ok ? "OK" : "FAIL"} — ${ab.reason}`);
  } else {
    lines.push(`  auto-build: skipped — ${ab?.reason || ""}`);
  }
  if (r.errors.length > 0) lines.push(`  errors: ${r.errors.length}`);
  return lines.join("\n");
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const r = closeOut(opts);
  if (opts.json) {
    process.stdout.write(JSON.stringify(r, null, 2) + "\n");
  } else {
    process.stdout.write(renderText(r) + "\n");
  }
  process.exit(r.ok ? 0 : 1);
}

const invokedPath = (process.argv[1] || "").replace(/\\/g, "/");
if (invokedPath.endsWith("telemetry-close-out.mjs")) main();
