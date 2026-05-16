#!/usr/bin/env node
// tier: T3
// matcher: Stop
// purpose: Async-regenerate state/shared/system-viz/dashboard.html via scripts/generate-dashboard-html.mjs. Throttled, spawn-detached, NEVER blocks.
/**
 * stop-dashboard-regen.mjs — OBSIDIAN-INTELLIGENCE-MS3 / C2 (U-HTML-DASHBOARD)
 *
 * Fires `node scripts/generate-dashboard-html.mjs` in a detached child
 * process on every Stop, with a throttle stamp so 7 simultaneous Stops
 * across the fleet collapse to one regen. Strictly additive.
 *
 * Pure-function exports (testable):
 *   isThrottled(stampPath, throttleMs, nowMs)
 *   writeStamp(stampPath, nowMs)
 *   resolveScriptPath(repoRoot)
 *
 * Knobs:
 *   PRISM_DASHBOARD_REGEN_DISABLE=1
 *   PRISM_DASHBOARD_REGEN_THROTTLE_MS=N  (default 60000)
 *   PRISM_DASHBOARD_REGEN_STAMP=/path    (override stamp file location)
 *   PRISM_REPO_ROOT=/path                (override repo root; default H:/prism)
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const REPO_ROOT = process.env.PRISM_REPO_ROOT || "H:/prism";
const DISABLED = process.env.PRISM_DASHBOARD_REGEN_DISABLE === "1";
const THROTTLE_MS = (() => {
  const n = Number(process.env.PRISM_DASHBOARD_REGEN_THROTTLE_MS);
  return Number.isFinite(n) && n > 0 ? n : 60_000;
})();
const STAMP_PATH = process.env.PRISM_DASHBOARD_REGEN_STAMP
  || path.join(os.tmpdir(), "prism-dashboard-regen.stamp");

function readStdin() {
  try { return fs.readFileSync(0, "utf8"); }
  catch { return ""; }
}

/* ---- pure helpers ---- */

export function isThrottled(stampPath = STAMP_PATH, throttleMs = THROTTLE_MS, nowMs = Date.now()) {
  try {
    const stat = fs.statSync(stampPath);
    return (nowMs - stat.mtimeMs) < throttleMs;
  } catch {
    return false;
  }
}

export function writeStamp(stampPath = STAMP_PATH, nowMs = Date.now()) {
  try {
    fs.mkdirSync(path.dirname(stampPath), { recursive: true });
    fs.writeFileSync(stampPath, String(nowMs));
    // touch mtime explicitly — some FS round to seconds
    fs.utimesSync(stampPath, new Date(nowMs), new Date(nowMs));
    return true;
  } catch {
    return false;
  }
}

export function resolveScriptPath(repoRoot = REPO_ROOT) {
  return path.join(repoRoot, "scripts/generate-dashboard-html.mjs");
}

/* ---- main ---- */

function ok() {
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
  process.exit(0);
}

function main() {
  if (DISABLED) return ok();
  readStdin(); // drain harness payload — we don't need it

  if (isThrottled()) return ok();
  writeStamp();

  const scriptPath = resolveScriptPath();
  if (!fs.existsSync(scriptPath)) return ok();

  try {
    const child = spawn(process.execPath, [scriptPath], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      cwd: REPO_ROOT,
    });
    child.unref();
  } catch {
    // fail-silent: dashboard staying stale is acceptable; a Stop hook must never block
  }

  ok();
}

const argv1 = process.argv[1] || "";
if (argv1.endsWith("stop-dashboard-regen.mjs")) {
  main();
}
