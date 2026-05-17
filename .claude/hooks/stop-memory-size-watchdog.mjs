#!/usr/bin/env node
// tier: T3
/**
 * stop-memory-size-watchdog.mjs — Stop hook (T3, non-blocking advisory)
 *
 * OBSOLESCENCE-CLEANUP-MS0/U-OBS-B1 (2026-05-17, slot mike).
 *
 * Surfaces a one-line advisory at Stop when MEMORY.md is at or past the
 * 24,576-byte truncation ceiling. The U-MEMORY-COMPRESS one-shot fix from
 * 2026-05-16 lacked a durable watchdog — within hours the index re-grew
 * past the ceiling and started silently truncating fleet-wide recall again
 * (F1 in STALE-NODES-AUDIT-2026-05-16.md). This hook closes that gap.
 *
 * Why a Stop hook (not a periodic cron):
 *   - Stop fires at the natural end of every chat turn. Operators see the
 *     advisory in the chat where the work happened, with context.
 *   - Cron-based watchdogs add a second pid + scheduler dependency. The
 *     Stop hook reuses the existing harness with zero new infra.
 *   - Cross-machine portable (cron != available in all WSL/portable-node
 *     deployments).
 *
 * Non-blocking. Once per session via stamp-throttle marker (12h). Mirrors
 * the stop-cross-tree-collision-advisory.mjs pattern (45s-12h throttle on
 * one-line advisories so they nag but don't spam).
 *
 * Knobs:
 *   PRISM_MEMORY_SIZE_WATCHDOG_DISABLE=1  — off entirely
 *   PRISM_MEMORY_SIZE_WATCHDOG_TTL_MS=N    — throttle (default 12h)
 *   PRISM_MEMORY_SIZE_WATCHDOG_WARN_PCT=N  — % of ceiling for WARN (default 0.90)
 *   PRISM_MEMORY_SIZE_WATCHDOG_CRIT_PCT=N  — % of ceiling for CRIT (default 1.0)
 */

import fs from "node:fs";
import path from "node:path";

const MEMORY_MD = process.env.PRISM_MEMORY_MD_PATH ||
  "C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md";
const CEILING = 24576; // Anthropic harness truncation threshold
const WARN_PCT = Number(process.env.PRISM_MEMORY_SIZE_WATCHDOG_WARN_PCT || "0.90");
const CRIT_PCT = Number(process.env.PRISM_MEMORY_SIZE_WATCHDOG_CRIT_PCT || "1.0");
const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000;
const TTL_MS = Number(process.env.PRISM_MEMORY_SIZE_WATCHDOG_TTL_MS || DEFAULT_TTL_MS);
const MARKER_DIR = "H:/prism/.claude/cache";
const MARKER_FILE = path.join(MARKER_DIR, "memory-size-watchdog-last.json");
const SILENCE = { continue: true, suppressOutput: true };

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch {
    return null;
  }
}

function lastFireAgeMs() {
  try {
    const j = JSON.parse(fs.readFileSync(MARKER_FILE, "utf8"));
    return Date.now() - (j.lastFireMs || 0);
  } catch {
    return Infinity;
  }
}

function stampFired() {
  try {
    fs.mkdirSync(MARKER_DIR, { recursive: true });
    fs.writeFileSync(MARKER_FILE, JSON.stringify({ lastFireMs: Date.now() }));
  } catch { /* ignore */ }
}

function emit(advisory) {
  process.stdout.write(JSON.stringify({
    continue: true,
    suppressOutput: false,
    systemMessage: advisory,
  }));
  process.exit(0);
}

function silent() {
  process.stdout.write(JSON.stringify(SILENCE));
  process.exit(0);
}

if (process.env.PRISM_MEMORY_SIZE_WATCHDOG_DISABLE === "1") silent();

readStdin(); // drain stdin (we don't need it; just avoid pipe-stall)

let bytes;
try {
  bytes = fs.statSync(MEMORY_MD).size;
} catch {
  // No MEMORY.md → nothing to watch. Silent (a fresh install or missing path
  // is the operator's call, not this hook's place to surface).
  silent();
}

const pct = bytes / CEILING;
if (pct < WARN_PCT) silent();

// Throttle the advisory — no point spamming every Stop.
if (lastFireAgeMs() < TTL_MS) silent();

const status = pct >= CRIT_PCT ? "CRITICAL" : "WARN";
const pctStr = (pct * 100).toFixed(1);
const advisory = `⚠️  MEMORY.md ${status}: ${bytes}/${CEILING} bytes (${pctStr}% of truncation ceiling). ` +
  (pct >= CRIT_PCT
    ? `Fleet-wide recall is being TRUNCATED. Run U-MEMORY-COMPRESS to compress index to ≤22KB. `
    : `Index growing toward truncation. Schedule U-MEMORY-COMPRESS soon. `) +
  `Tool: \`node H:/prism/scripts/memory-size-watch.mjs --json\`. ` +
  `Knob: PRISM_MEMORY_SIZE_WATCHDOG_DISABLE=1 to silence.`;

stampFired();
emit(advisory);
