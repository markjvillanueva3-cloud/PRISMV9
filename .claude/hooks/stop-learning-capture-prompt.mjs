#!/usr/bin/env node
// tier: T3
// matcher: Stop
// purpose: At session end, scan recent commits + diff for uncaptured learning keywords and nudge operator to /learn-from-mistake
/**
 * stop-learning-capture-prompt.mjs — Stop hook advisory
 *
 * MISTAKE-LEARNING-LOOP: at session end, run the scan-for-learning-keywords
 * script over the last N commits + working-tree diff. If uncaptured hits
 * exist, surface a short punch list as an advisory `additionalContext` to
 * encourage capture before the session truly stops.
 *
 * NEVER BLOCKS. Stop hook returns `continue: true` always.
 *
 * KNOBS:
 *   PRISM_STOP_LEARNING_DISABLE=1 — disable entirely
 *   PRISM_STOP_LEARNING_THROTTLE_SEC=N — minimum gap between fires (default 900)
 *   PRISM_STOP_LEARNING_WINDOW_COMMITS=N — git log window (default 10)
 *   PRISM_STOP_LEARNING_MAX_HITS=N — max hits to surface (default 5)
 *
 * SCRUTINY: per-file gate (2 reviewer arms).
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const REPO_ROOT = process.env.PRISM_REPO_ROOT || "H:/prism";
const DISABLED = process.env.PRISM_STOP_LEARNING_DISABLE === "1";
const THROTTLE_SEC = Number(process.env.PRISM_STOP_LEARNING_THROTTLE_SEC || 900);
const WINDOW_COMMITS = Number(process.env.PRISM_STOP_LEARNING_WINDOW_COMMITS || 10);
const MAX_HITS = Number(process.env.PRISM_STOP_LEARNING_MAX_HITS || 5);

const STAMP_FILE = path.join(process.env.TEMP || "/tmp", "prism-stop-learning-stamp.iso");

function readStdin() {
  try { return fs.readFileSync(0, "utf8"); }
  catch { return ""; }
}

function safeParse(s) {
  try { return JSON.parse(s); }
  catch { return null; }
}

/**
 * Pure throttle decision exported for tests.
 * Returns true if the previous fire was within throttleSec seconds.
 */
export function isThrottled(stampIso, nowMs = Date.now(), throttleSec = THROTTLE_SEC) {
  if (!stampIso || typeof stampIso !== "string") return false;
  const stampMs = Date.parse(stampIso);
  if (Number.isNaN(stampMs)) return false;
  return (nowMs - stampMs) < (throttleSec * 1000);
}

function readStamp() {
  try { return fs.readFileSync(STAMP_FILE, "utf8").trim(); }
  catch { return ""; }
}

function writeStamp() {
  try { fs.writeFileSync(STAMP_FILE, new Date().toISOString()); }
  catch { /* fail-silent */ }
}

function runScannerCli() {
  // Invoke scan-for-learning-keywords.mjs as a child with --json output.
  // Bounded timeout — Stop hook must stay fast.
  const scannerPath = path.join(REPO_ROOT, "scripts", "scan-for-learning-keywords.mjs");
  if (!fs.existsSync(scannerPath)) return null;
  try {
    const out = execFileSync("node", [scannerPath, "--json", `--window=${WINDOW_COMMITS}`], {
      cwd: REPO_ROOT,
      timeout: 8000,
      encoding: "utf8",
    });
    return safeParse(out);
  } catch {
    return null;
  }
}

/**
 * Pure rendering helper — exposed for tests.
 * Returns the additionalContext string (or "" if no hits worth surfacing).
 */
export function renderAdvisory(result, maxHits = MAX_HITS) {
  if (!result || !result.ok) return "";
  if (!result.uncapturedHits || result.uncapturedHits === 0) return "";
  const hits = (result.hits || []).slice(0, maxHits);
  if (hits.length === 0) return "";
  const lines = [
    `─── 🧠 stop-learning-capture ──────────────────────`,
    `${result.uncapturedHits} uncaptured lesson keyword(s) this session.`,
    `Critical: ${result.counts?.critical || 0} · Warn: ${result.counts?.warn || 0} · Info: ${result.counts?.info || 0}`,
    `Top hits:`,
  ];
  for (const h of hits) {
    lines.push(`  [${h.severity}/${h.category}] ${h.match}  ←  ${h.source}`);
  }
  lines.push(`Capture: /learn-from-mistake  OR  feedback_<slug>.md in memory/`);
  lines.push(`─────────────────────────────────────────────────────`);
  return lines.join("\n");
}

function main() {
  if (DISABLED) {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    process.exit(0);
  }
  // Read stdin and ignore (Stop hook receives session metadata we don't need here).
  readStdin();

  // Throttle — don't fire on every back-to-back Stop in tight loops.
  if (isThrottled(readStamp())) {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    process.exit(0);
  }

  const result = runScannerCli();
  const advisory = renderAdvisory(result);
  writeStamp();

  if (!advisory) {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
    process.exit(0);
  }

  process.stdout.write(JSON.stringify({
    continue: true,
    suppressOutput: false,
    hookSpecificOutput: { hookEventName: "Stop", additionalContext: advisory },
  }));
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` ||
    process.argv[1]?.endsWith("stop-learning-capture-prompt.mjs")) {
  main();
}
