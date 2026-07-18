#!/usr/bin/env node
// tier: T3
/**
 * stop-dispatcher-method-drift-advisory.mjs -- Stop advisory hook that runs
 * audit-dispatcher-engine-methods.mjs at most once per ~1 hour and surfaces
 * any dispatcher->engine method-drift findings as a systemMessage.
 *
 * Background: audit-dispatcher-engine-methods.mjs exports `scanDispatchers()`
 * which detects handlers that call engine.METHOD() where METHOD does not exist
 * on the resolved engine class. Without this hook the scan never runs and
 * drift accumulates silently (40-49 instances found on first run, 2026-06-22).
 *
 * Design:
 *   - ADVISORY ONLY: always emits {continue:true}. Never blocks Stop.
 *   - THROTTLED: scans at most once per THROTTLE_MS (default 3600000 = 1h)
 *     via mcp-server/data/state/dispatcher-drift-advisory-last.json.
 *     Within the window: returns {continue:true} immediately (no scan).
 *   - FAIL-OPEN: any error during scan or I/O -> {continue:true} with no scan.
 *   - KILL SWITCH: PRISM_DISPATCHER_DRIFT_ADVISORY_DISABLE=1 -> {continue:true}.
 *
 * Knobs:
 *   PRISM_DISPATCHER_DRIFT_ADVISORY_DISABLE=1  disable entirely
 *   PRISM_DISPATCHER_DRIFT_THROTTLE_MS=N       override throttle window (ms, default 3600000)
 *   PRISM_DISPATCHER_DRIFT_MAX_LIST=N          max offending dispatchers to list (default 3)
 *   PRISM_DISPATCHER_DRIFT_STATE_FILE=<path>   override timestamp sidecar path (test seam)
 *   PRISM_DISPATCHER_DRIFT_SCAN_DIR=<path>     override dispatcher dir (test seam)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..", ".."
);

const DEFAULT_THROTTLE_MS = 3_600_000; // 1 hour
const DEFAULT_MAX_LIST = 3;

const DISABLE = process.env.PRISM_DISPATCHER_DRIFT_ADVISORY_DISABLE === "1";
const THROTTLE_MS = (() => {
  const n = Number(process.env.PRISM_DISPATCHER_DRIFT_THROTTLE_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_THROTTLE_MS;
})();
const MAX_LIST = (() => {
  const n = Number(process.env.PRISM_DISPATCHER_DRIFT_MAX_LIST);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_MAX_LIST;
})();
const DEFAULT_STATE_FILE = process.env.PRISM_DISPATCHER_DRIFT_STATE_FILE ||
  path.join(REPO_ROOT, "mcp-server", "data", "state", "dispatcher-drift-advisory-last.json");

// ---------------------------------------------------------------------------
// Throttle helpers (stateFile param enables per-test tmpdir injection)
// ---------------------------------------------------------------------------

/** Read last-run timestamp from sidecar. Returns 0 on any error (force scan). */
function readLastRun(stateFile) {
  try {
    const raw = fs.readFileSync(stateFile, "utf8");
    const obj = JSON.parse(raw);
    const ts = Number(obj && obj.lastRunMs);
    return Number.isFinite(ts) ? ts : 0;
  } catch {
    return 0;
  }
}

/** Write the current timestamp to the sidecar. Fail-soft. */
function writeLastRun(stateFile) {
  try {
    const dir = path.dirname(stateFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(stateFile, JSON.stringify({ lastRunMs: Date.now(), schemaVersion: "1.0.0" }), "utf8");
  } catch {
    // fail-soft -- a sidecar write failure must never break Stop
  }
}

/**
 * Returns true when a throttle window is still active.
 * @param {string} stateFile - path to sidecar JSON
 * @param {number} [now] - injectable current time (ms); defaults to Date.now()
 */
function isThrottled(stateFile, now) {
  const last = readLastRun(stateFile);
  if (last === 0) return false;
  const currentTime = (now !== undefined ? now : Date.now());
  const elapsed = currentTime - last;
  return elapsed >= 0 && elapsed < THROTTLE_MS;
}

// ---------------------------------------------------------------------------
// Stdin drain (Stop hook contract: read stdin JSON, write JSON to stdout)
// ---------------------------------------------------------------------------

function drainStdin() {
  return new Promise((resolve) => {
    let buf = "";
    if (process.stdin.isTTY) { resolve({}); return; }
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => { buf += c; });
    process.stdin.on("end", () => {
      try { resolve(JSON.parse(buf || "{}")); } catch { resolve({}); }
    });
    process.stdin.on("error", () => resolve({}));
    setTimeout(() => resolve({}), 300);
  });
}

// ---------------------------------------------------------------------------
// Scan + render
// ---------------------------------------------------------------------------

/**
 * Import scanDispatchers from the existing auditor. Injectable for tests.
 * @param {Function|null} [scanFn] inject a mock for testing
 * @param {string|undefined} [scanDir]
 */
async function runScan(scanFn, scanDir) {
  const fn = scanFn || (await import(
    `file://${path.join(REPO_ROOT, "scripts", "audit-dispatcher-engine-methods.mjs")
      .replace(/\\/g, "/")}`
  )).scanDispatchers;
  return scanDir ? fn({ dir: scanDir }) : fn();
}

/**
 * Build the operator-facing advisory message.
 * @param {{missingTotal:number, dispatchers:Array}} result
 * @returns {string}
 */
export function renderAdvisory(result) {
  if (!result) return "";
  const total = Number(result.missingTotal) || 0;
  if (total === 0) return "";

  // Rank dispatchers by missing count descending
  const ranked = [...(result.dispatchers || [])]
    .filter((d) => d.missing && d.missing.length > 0)
    .sort((a, b) => b.missing.length - a.missing.length);

  const lines = [
    `Advisory: ${total} dispatcher->engine method drift instance(s) detected (handler calls engine.METHOD() that does not exist on the resolved class).`,
    `Scanned ${result.scanned || 0} dispatcher(s) in ${result.dir || "unknown"}.`,
    "",
  ];

  const topN = ranked.slice(0, MAX_LIST);
  if (topN.length > 0) {
    lines.push(`Top ${topN.length} offending dispatcher(s):`);
    for (const d of topN) {
      lines.push(`  ${d.file}: ${d.missing.length} missing method call(s)`);
      const firstMiss = d.missing[0];
      if (firstMiss) {
        const cands = firstMiss.candidates && firstMiss.candidates.length
          ? ` (did-you-mean: ${firstMiss.candidates.map((c) => c.method).join(", ")})`
          : "";
        lines.push(`    e.g. getEngine("${firstMiss.key}").${firstMiss.method}() on ${firstMiss.engine || "?"}${cands}`);
      }
    }
    if (ranked.length > MAX_LIST) {
      lines.push(`  ...and ${ranked.length - MAX_LIST} more dispatcher(s)`);
    }
  }

  lines.push("");
  lines.push("Run: node H:/prism/scripts/audit-dispatcher-engine-methods.mjs");
  lines.push("Knob: PRISM_DISPATCHER_DRIFT_ADVISORY_DISABLE=1 to silence.");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Hook entry point (exported for tests + CLI)
// ---------------------------------------------------------------------------

/**
 * Main gate function. Injectable scanFn, _stateFile, _now for tests.
 * @param {{ scanFn?: Function, scanDir?: string, _stateFile?: string, _now?: number }} [opts]
 * @returns {Promise<{continue:boolean, systemMessage?:string}>}
 */
export async function runGate(opts = {}) {
  if (DISABLE) return { continue: true };

  const stateFile = (opts._stateFile) || DEFAULT_STATE_FILE;

  // Throttle check -- pass stateFile + optional _now clock seam
  if (isThrottled(stateFile, opts._now)) {
    return { continue: true };
  }

  let result;
  try {
    result = await runScan(opts.scanFn || null, opts.scanDir);
    writeLastRun(stateFile);
  } catch (err) {
    // Fail-open: scan error must never break Stop
    process.stderr.write(
      `[stop-dispatcher-method-drift-advisory] scan error: ${err && err.message ? err.message : String(err)}\n`
    );
    return { continue: true };
  }

  const msg = renderAdvisory(result);
  if (!msg) return { continue: true };
  return { continue: true, systemMessage: msg };
}

// ---------------------------------------------------------------------------
// CLI / hook entry -- only run when invoked directly, NOT on import
// ---------------------------------------------------------------------------

const isMain = (() => {
  try {
    const argv1 = (process.argv[1] || "").replace(/\\/g, "/");
    const self = fileURLToPath(import.meta.url).replace(/\\/g, "/");
    return self === argv1 || self.endsWith(argv1) || import.meta.url === `file://${argv1}`;
  } catch { return false; }
})();

if (isMain) {
  drainStdin().then(() =>
    runGate().then((out) => {
      process.stdout.write(JSON.stringify(out));
    })
  ).catch(() => {
    process.stdout.write(JSON.stringify({ continue: true }));
  });
}
