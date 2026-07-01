#!/usr/bin/env node
// tier: T4
/**
 * stop-sync-cli-context.mjs -- MULTI-CLI-SYNC-HOOK-MS28 (slot:golf, 2026-06-18).
 *
 * Stop hook + drift detector for the multi-CLI context mirrors. When a CLI context
 * SOURCE has DRIFTED (edited since the last mirror sync) it re-runs the existing
 * helper `.claude/helpers/sync-cli-context-files.mjs`, which propagates:
 *   H:/PRISM/CLAUDE.md  -> H:/PRISM/{GEMINI.md, AGENTS.md}        (project)
 *   ~/.claude/CLAUDE.md -> ~/.gemini/GEMINI.md, ~/.codex/AGENTS.md (global)
 *   MEMORY.md           -> ~/.gemini/MEMORY.md, ~/.codex/MEMORY.md (CLI memory)
 * so Codex/Gemini CLIs always read CURRENT PRISM doctrine instead of a stale mirror.
 *
 * WHY (the milestone): the mirrors were generated once and rot silently every time
 * CLAUDE.md/MEMORY.md change (which is often -- golf edits the root, the c-to-h mirror
 * propagates). The helper documents "run manually ... or wire from a Stop hook" -- this
 * IS that wiring. The "drift detector" is the cheap mtime GATE: a no-drift Stop does only
 * a few stat() calls and NEVER spawns the sync, so this is ~free on the common path.
 *
 * SAFETY:
 *   - DRIFT-GATED: spawns the sync ONLY when a source mtime is newer than the last sync
 *     stamp; otherwise just stamps + returns. The sync helper itself is content-diff-gated
 *     (skip-unchanged), so even a redundant run writes nothing.
 *   - THROTTLED: at most one check per PRISM_SYNC_CLI_CONTEXT_THROTTLE_MS (default 30s) so
 *     a busy fleet of Stop events does not stat-storm.
 *   - FAIL-SOFT: any error -> {continue:true}. A Stop hook must NEVER block the chat.
 *   - CONCURRENCY-BENIGN: mirror content is deterministic (same source -> same bytes), so
 *     two slots syncing at once write identical content; skip-unchanged settles the rest.
 *
 * Knobs:
 *   PRISM_SYNC_CLI_CONTEXT_DISABLE=1       advisory-off (never syncs)
 *   PRISM_SYNC_CLI_CONTEXT_THROTTLE_MS     min ms between checks (default 30000)
 *
 * @hook Stop  (non-blocking; tier T4)
 */

import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { MIRRORS } from "../helpers/sync-cli-context-files.mjs";

const ROOT = (process.env.PRISM_ROOT || "H:/prism").replace(/\/+$/, "");
const SYNC_SCRIPT = join(ROOT, ".claude/helpers/sync-cli-context-files.mjs");
const STAMP = join(ROOT, ".claude/cache/sync-cli-context-last.json");

const DEFAULT_THROTTLE_MS = 30000; // 30s min between drift checks (fleet stat-storm guard)
const SYNC_SPAWN_TIMEOUT_MS = 20000; // hard cap on the sync subprocess (6 small file writes)

// Drift SOURCES -- derived from the helper's exported MIRRORS (its distinct `src` set), so a
// new source added to sync-cli-context-files.mjs is tracked automatically. No hardcoded copy
// to drift -- a stale source list would silently defeat this very drift detector.
const SOURCES = [...new Set(MIRRORS.map((m) => m.src))];

const THROTTLE_MS = Math.max(0, Number(process.env.PRISM_SYNC_CLI_CONTEXT_THROTTLE_MS) || DEFAULT_THROTTLE_MS);

function mtimeOf(p) {
  try { return statSync(p).mtimeMs; } catch { return 0; }
}

/**
 * Pure drift predicate (mtimeFn injectable for tests): true iff any EXISTING source
 * was modified strictly after `stampTs`. A missing source (mtime 0) is never drift.
 */
export function detectDrift(sources, stampTs, mtimeFn = mtimeOf) {
  const since = Number(stampTs) || 0;
  for (const s of sources) {
    const m = mtimeFn(s);
    if (m > 0 && m > since) return true;
  }
  return false;
}

function readStampTs() {
  try { return Number(JSON.parse(readFileSync(STAMP, "utf8")).ts) || 0; } catch { return 0; }
}

function writeStampTs(ts) {
  try {
    if (!existsSync(dirname(STAMP))) mkdirSync(dirname(STAMP), { recursive: true });
    writeFileSync(STAMP, JSON.stringify({ ts }));
  } catch { /* fail-soft */ }
}

function cont(systemMessage) {
  const out = { continue: true };
  if (systemMessage) out.systemMessage = systemMessage;
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
}

function main() {
  // Drain stdin (Stop payload -- not consumed).
  try { if (!process.stdin.isTTY) readFileSync(0, "utf8"); } catch { /* ignore */ }

  if (String(process.env.PRISM_SYNC_CLI_CONTEXT_DISABLE || "") === "1") return cont();
  if (!existsSync(SYNC_SCRIPT)) return cont();

  const now = Date.now();
  const stampTs = readStampTs();

  // Throttle: at most one check per window (stamp doubles as the throttle marker).
  if (stampTs > 0 && now - stampTs < THROTTLE_MS) return cont();

  if (!detectDrift(SOURCES, stampTs)) { writeStampTs(now); return cont(); }

  // Drift detected -> re-sync the mirrors via the existing helper.
  const r = spawnSync(process.execPath, [SYNC_SCRIPT], { windowsHide: true, encoding: "utf8", timeout: SYNC_SPAWN_TIMEOUT_MS });
  writeStampTs(now);
  const m = (r && r.stdout ? r.stdout : "").match(/(\d+) wrote/);
  if (m && Number(m[1]) > 0) {
    return cont(`CLI context mirrors re-synced (${m[1]} updated: GEMINI.md / AGENTS.md / CLI MEMORY.md current with CLAUDE.md).`);
  }
  return cont();
}

// Only execute when run directly as a hook -- importing (e.g. for tests of detectDrift)
// must NOT run main() (it process.exit()s + spawns the real sync).
const __isMain = import.meta.url === pathToFileURL(process.argv[1] || "").href;
if (__isMain) {
  try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
}

