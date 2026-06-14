#!/usr/bin/env node
// tier: T3
/**
 * stop-memory-size-watchdog.mjs — Stop hook (T3, auto-compact + advisory)
 *
 * OBSOLESCENCE-CLEANUP-MS0/U-OBS-B1 (2026-05-17, slot mike).
 * ACT step added 2026-05-18 (slot echo) — see "Auto-compaction" below.
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
 * Auto-compaction (ACT): when MEMORY.md is at/over WARN this hook now invokes
 * scripts/memory-compact.mjs (lock-guarded, atomic, verify-after-write,
 * self-throttled 30m) to rotate the oldest index entries to MEMORY-ARCHIVE.md
 * — closing the measurement→action gap the 2026-05-17 token-savings audit
 * named as PRISM's dominant savings-layer failure mode. Fail-soft: a
 * compaction failure degrades to advisory-only (the pre-patch behavior).
 *
 * Knobs:
 *   PRISM_MEMORY_SIZE_WATCHDOG_DISABLE=1     — off entirely
 *   PRISM_MEMORY_SIZE_WATCHDOG_NO_COMPACT=1  — advisory only, skip auto-compaction
 *   PRISM_MEMORY_SIZE_WATCHDOG_TTL_MS=N      — advisory throttle (default 12h)
 *   PRISM_MEMORY_SIZE_WATCHDOG_WARN_PCT=N    — % of ceiling for WARN (default 0.90)
 *   PRISM_MEMORY_SIZE_WATCHDOG_CRIT_PCT=N    — % of ceiling for CRIT (default 1.0)
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { resolveObsidianMemDir } from "../../scripts/lib/obsidian-mem-dir.mjs";

const MEMORY_MD = process.env.PRISM_MEMORY_MD_PATH ||
  path.join(resolveObsidianMemDir(), "MEMORY.md");
const CEILING = 24576; // Anthropic harness truncation threshold
const WARN_PCT = Number(process.env.PRISM_MEMORY_SIZE_WATCHDOG_WARN_PCT || "0.90");
const CRIT_PCT = Number(process.env.PRISM_MEMORY_SIZE_WATCHDOG_CRIT_PCT || "1.0");
const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000;
const TTL_MS = Number(process.env.PRISM_MEMORY_SIZE_WATCHDOG_TTL_MS || DEFAULT_TTL_MS);
const MARKER_DIR = "H:/prism/.claude/cache";
const MARKER_FILE = path.join(MARKER_DIR, "memory-size-watchdog-last.json");
const SILENCE = { continue: true, suppressOutput: true };
const COMPACT_SCRIPT = "H:/prism/scripts/memory-compact.mjs";
const NO_COMPACT = process.env.PRISM_MEMORY_SIZE_WATCHDOG_NO_COMPACT === "1";
// Stop-hook budget is 3000ms — leave ~800ms headroom for stat + JSON + emit.
const COMPACT_TIMEOUT_MS = 2200;

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
    // Poison-input guard: a corrupt-but-parseable marker (non-numeric or
    // future-dated lastFireMs) must not yield NaN — NaN fails BOTH the
    // `< TTL_MS` throttle AND the `>= TTL_MS` confirmation comparison, which
    // would spam the advisory every Stop and never emit the ✅ line.
    if (!Number.isFinite(j.lastFireMs) || j.lastFireMs > Date.now()) return Infinity;
    return Date.now() - j.lastFireMs;
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

/**
 * ACT step — invoke memory-compact.mjs. Returns its parsed JSON result, or
 * null if compaction is disabled or the spawn failed/timed out. Fail-soft by
 * design: a null/failed result must NEVER break Stop — the caller degrades to
 * the pre-patch advisory-only behavior. process.execPath (not bare "node") is
 * required so the portable-node deployment resolves (see CLAUDE.md regression
 * 2026-05-16 "spawnSync('node')→ENOENT on portable-node").
 */
function tryCompact() {
  if (NO_COMPACT) return null;
  try {
    const r = spawnSync(process.execPath, [COMPACT_SCRIPT, "--json"], {
      timeout: COMPACT_TIMEOUT_MS,
      encoding: "utf8",
      windowsHide: true,
    });
    if (r.error || !r.stdout || !r.stdout.trim().startsWith("{")) return null;
    return JSON.parse(r.stdout);
  } catch {
    return null;
  }
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

// --- ACT: auto-compaction --------------------------------------------------
// Pre-patch this hook only WARNED. Per the 2026-05-17 token-savings audit
// ("measurement-without-action is PRISM's dominant savings-layer failure"), it
// now invokes the memory-compact.mjs rotator. memory-compact is lock-guarded,
// atomically written, verify-after-write and self-throttled (30m) — safe to
// call on every over-threshold Stop (most calls hit its own throttle and
// no-op in <50ms). NOT gated by the 12h advisory throttle: the ACT must run
// whenever over WARN; memory-compact's 30m throttle is the right cadence.
const compact = tryCompact();
let curBytes = bytes;
try { curBytes = fs.statSync(MEMORY_MD).size; } catch { /* keep pre-compact stat */ }
const curPct = curBytes / CEILING;
// `!compact.dryRun` keeps the ✅ "rotated ... recall restored" message honest:
// a real archive only — never a --dry-run plan (the hook never passes
// --dry-run today, but this stays correct if a future caller ever does).
const archived =
  compact && compact.ok && !compact.dryRun && Number.isFinite(compact.archived)
    ? compact.archived
    : 0;

// Resolved → file is back under WARN. A real rotation gets a 12h-throttled
// confirmation line; a no-op stays silent.
if (curPct < WARN_PCT) {
  if (archived > 0 && lastFireAgeMs() >= TTL_MS) {
    stampFired();
    emit(`✅  MEMORY.md auto-compacted (stop-memory-size-watchdog): ` +
      `${bytes}→${curBytes} bytes, ${archived} oldest entr${archived === 1 ? "y" : "ies"} ` +
      `rotated to MEMORY-ARCHIVE.md. Fleet-wide recall restored.`);
  }
  silent();
}

// Still over WARN (compaction throttled / failed / index genuinely too large).
// Throttle the advisory — no point spamming every Stop.
if (lastFireAgeMs() < TTL_MS) silent();

const status = curPct >= CRIT_PCT ? "CRITICAL" : "WARN";
const pctStr = (curPct * 100).toFixed(1);
const why =
  compact === null ? "auto-compaction unavailable" :
  !compact.ok ? `auto-compaction blocked (${compact.reason || "unknown"})` :
  compact.skipped ? `auto-compaction skipped (${compact.skipped})` :
  compact.archived === 0
    ? `auto-compaction made no change (${compact.reason || "nothing to rotate"})`
    : "auto-compaction ran but the index is still over threshold";
const advisory = `⚠️  MEMORY.md ${status}: ${curBytes}/${CEILING} bytes (${pctStr}% of truncation ceiling) — ${why}. ` +
  (curPct >= CRIT_PCT
    ? `Fleet-wide recall is being TRUNCATED. `
    : `Index growing toward truncation. `) +
  `Run \`node H:/prism/scripts/memory-compact.mjs --force\` to rotate the oldest entries now. ` +
  `Knob: PRISM_MEMORY_SIZE_WATCHDOG_DISABLE=1 to silence.`;

stampFired();
emit(advisory);
