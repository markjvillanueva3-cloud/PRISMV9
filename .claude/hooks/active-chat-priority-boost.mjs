#!/usr/bin/env node
// tier: T3 (observer — never blocks the prompt; only advisory + side-effect on host process priority)
/**
 * active-chat-priority-boost.mjs — UserPromptSubmit hook for FLEET-REAPER-MS3/U-FR-MS3-A.
 *
 * On every prompt submission, lift the active chat's claude.exe tree to
 * AboveNormal priority for 5 minutes (knob PRISM_FR_BOOST_TTL_SEC, clamp
 * 60..1800). Stamp file lets the decay hook revert when TTL expires.
 *
 * Non-Windows + missing helper + missing claude.exe ancestor → silent no-op
 * (returns clean exit with no advisory output — never blocks the prompt).
 *
 * Knobs:
 *   PRISM_FR_BOOST_DISABLE=1     master kill switch
 *   PRISM_FR_BOOST_TTL_SEC=N     boost expiry sec (60..1800, default 300)
 *   PRISM_FR_BOOST_PRIORITY      AboveNormal | Normal (default AboveNormal)
 *   PRISM_FLEET_REAPER_DISABLE=1 master fleet-wide kill (also respected)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  isWindows,
  parsePriorityName,
  clampTtlSec,
  findClaudeAncestor,
  walkClaudeTree,
  setPriorityForPids,
  enumerateProcessIndex,
  DEFAULT_BOOST_TTL_SEC,
} from "../helpers/claude-tree-priority.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const STAMP_DIR = join(REPO_ROOT, "state", "shared", ".active-chat-boost");

const DEFAULT_BOOST_PRIORITY = "AboveNormal";

function readStdinJsonSync() {
  try {
    const buf = readFileSync(0, "utf8");
    if (!buf) return {};
    return JSON.parse(buf);
  } catch { return {}; }
}

function safeSessionId(s) {
  // Allow hex / dashes / alphanumerics only — defensive for any filename use.
  if (typeof s !== "string" || !s) return null;
  const trimmed = s.slice(0, 128);
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return null;
  return trimmed;
}

function emit(systemMessage) {
  // UserPromptSubmit hooks emit JSON to stdout with `hookSpecificOutput`.
  // We never want to block — always return continue:true.
  const out = { continue: true };
  if (systemMessage) out.systemMessage = systemMessage;
  process.stdout.write(JSON.stringify(out) + "\n");
}

function main() {
  // Kill switches first — exit fast without any I/O.
  if (process.env.PRISM_FR_BOOST_DISABLE === "1") return emit();
  if (process.env.PRISM_FLEET_REAPER_DISABLE === "1") return emit();
  if (!isWindows()) return emit();

  const payload = readStdinJsonSync();
  const sessionId = safeSessionId(payload.session_id || payload.sessionId);
  if (!sessionId) return emit(); // can't stamp without a stable key

  const ttlSec = clampTtlSec(process.env.PRISM_FR_BOOST_TTL_SEC, DEFAULT_BOOST_TTL_SEC);
  const priorityName = parsePriorityName(process.env.PRISM_FR_BOOST_PRIORITY) || DEFAULT_BOOST_PRIORITY;
  // Spec anti-regression #1 — never above AboveNormal. parsePriorityName already
  // rejects High/Realtime, but we defensively cap here too.
  if (priorityName !== "AboveNormal" && priorityName !== "Normal") {
    return emit(); // unsupported value, silent no-op
  }

  const procIndex = enumerateProcessIndex({});
  if (procIndex.size === 0) return emit(); // enum failed → silent no-op

  const claudePid = findClaudeAncestor(process.pid, procIndex);
  if (!claudePid) return emit(); // no claude.exe ancestor → no-op (we're probably running outside the harness)

  const treePids = Array.from(walkClaudeTree(claudePid, procIndex));
  if (treePids.length === 0) return emit();

  const results = setPriorityForPids(treePids, priorityName);
  const okCount = results.filter(r => r.ok).length;

  // Stamp file: only write if at least one priority change took effect.
  // (If 0/N succeeded the boost effectively didn't happen — no need to schedule decay.)
  if (okCount > 0) {
    try {
      mkdirSync(STAMP_DIR, { recursive: true });
      const stampPath = join(STAMP_DIR, `${sessionId}.json`);
      const now = Date.now();
      writeFileSync(stampPath, JSON.stringify({
        chatId: sessionId,
        claudePid,
        pids: treePids,
        priorityName,
        boostedAt: now,
        boostedAtIso: new Date(now).toISOString(),
        expiresAt: now + ttlSec * 1000,
        expiresAtIso: new Date(now + ttlSec * 1000).toISOString(),
        ttlSec,
        okCount,
        totalCount: treePids.length,
      }, null, 2), "utf8");
    } catch { /* best-effort — boost still happened, just no decay trail */ }
  }

  return emit();
}

// Run only when invoked as CLI (not on import)
const invokedAsCli = (() => {
  try {
    return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch { return false; }
})();
if (invokedAsCli) {
  try { main(); }
  catch (err) {
    // R12: log + continue (never block prompt)
    try { process.stderr.write(`active-chat-priority-boost: ${err && err.message ? err.message : String(err)}\n`); } catch { /* swallow */ }
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  }
}

export { main, STAMP_DIR };

/**
 * List active boost stamps. Each entry: `{path, name, mtimeMs}`.
 * Used by the decay hook + tests. All deps injectable for hermetic tests.
 */
export function listStampDir(dir = STAMP_DIR, _io = {}) {
  const exists = _io.existsSync || existsSync;
  const stat = _io.statSync || statSync;
  const readdir = _io.readdirSync || readdirSync;
  if (!exists(dir)) return [];
  try {
    const names = readdir(dir);
    return names.filter(n => n.endsWith(".json")).map(n => {
      const p = join(dir, n);
      let s; try { s = stat(p); } catch { s = null; }
      return { path: p, name: n, mtimeMs: s ? s.mtimeMs : 0 };
    });
  } catch { return []; }
}
