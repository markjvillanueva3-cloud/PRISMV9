#!/usr/bin/env node
// tier: T1
/**
 * grep-index-taken-correlator.mjs - PreToolUse Read
 *
 * U-GREP-TAKEN-SIGNAL (2026-06-09): the TAKEN half of the grep-index-first
 * advisory loop. grep-index-first.mjs (PreToolUse:Grep) injects "index-first"
 * suggestions naming target path(s) and writes a session-scoped PENDING marker.
 * This hook (PreToolUse:Read) watches Reads: when the SAME session shortly after
 * Reads one of those exact target paths instead of continuing to grep, that Read
 * IS the advice being followed -> a real `offloaded` (taken) event.
 *
 * That converts grep-index-first's byHook slot from {fired,suggested} (NO
 * offloaded key -> advisory-decay classify() marks it 'unmeasurable', can never
 * decay) into a measurable hook with a numeric `offloaded` taken-counter.
 *
 * NEVER blocks a Read. Fail-safe: ANY error -> {continue:true}. A correlator
 * failure must never break the host Read call. Module-vs-CLI gate (_entry) so
 * the test file can import without the stdin JSON.parse firing.
 */

import { fileURLToPath } from 'url';
import { basename } from 'path';
import { readFileSync } from 'fs';

import {
  recordTelemetry,
  readPending,
  writePendingMap,
  PENDING_TTL_MS,
} from './grep-index-first.mjs';

// ---------------------------------------------------------------------------
// Path matching -- robust to / vs \ and absolute vs repo-relative.
// ---------------------------------------------------------------------------
// A pending target path is typically repo-relative with forward slashes
// (e.g. "mcp-server/data/docs/ENGINE_DIGEST.md" or
// "mcp-server/src/engines/OutcomeCaptureBusEngine.ts"). The Read file_path may
// be absolute and may use backslashes (Windows) -- e.g.
// "H:\\prism\\mcp-server\\data\\docs\\ENGINE_DIGEST.md". We match when the
// normalized Read path ENDS WITH the normalized target (repo-relative tail) on
// a path-segment boundary, OR the basenames are equal. Basename equality is the
// robust fallback when directory prefixes diverge (worktree roots, drive
// letters).
function normalizePath(p) {
  return String(p || '')
    .replace(/\\/g, '/') // backslash -> forward slash
    .replace(/\/+/g, '/') // collapse repeats
    .replace(/^\.\//, '') // drop leading ./
    .toLowerCase()
    .replace(/\/+$/, ''); // drop trailing slash
}

export function pathMatches(readPath, targetPath) {
  const r = normalizePath(readPath);
  const t = normalizePath(targetPath);
  if (!r || !t) return false;
  if (r === t) return true;
  // Read path ends with the repo-relative target on a segment boundary so
  // "...foo/bar.ts" matches "bar.ts" / "foo/bar.ts" but NOT "obar.ts".
  if (r.endsWith('/' + t)) return true;
  if (r.endsWith(t) && (r.length === t.length || r[r.length - t.length - 1] === '/')) return true;
  // Basename fallback (handles divergent prefixes / drive letters).
  const tb = basename(t);
  return tb.length > 0 && basename(r) === tb;
}

/**
 * correlateRead -- core RMW. Given a Read's file_path + session id, look up the
 * session's pending marker; if the Read matches a non-expired pending target
 * path, record an offloaded (taken) event and remove that ONE matched path (so a
 * single suggestion converts at most once -- duplicate-named paths still drop
 * only the first match). Persists the trimmed/dropped session entry back to the
 * marker map via the atomic writePendingMap.
 *
 * Injected seams (statsPath, pendingPath, now, recordFn) keep it unit-testable
 * with no real I/O. Fail-safe: any throw -> {matched:false, error}; never blocks.
 */
export function correlateRead(filePath, sessionId, {
  statsPath,
  pendingPath,
  now,
  recordFn,
} = {}) {
  try {
    const ts = typeof now === 'number' ? now : Date.now();
    const sid = String(sessionId || '');
    const map = readPending({ pendingPath });
    const entry = map[sid];
    if (!entry || typeof entry.ts !== 'number' || !Array.isArray(entry.paths)) {
      return { matched: false, reason: 'no-pending-for-session' };
    }
    if (ts - entry.ts > PENDING_TTL_MS) {
      return { matched: false, reason: 'expired' };
    }
    const idx = entry.paths.findIndex((p) => pathMatches(filePath, p));
    if (idx === -1) {
      return { matched: false, reason: 'no-path-match' };
    }
    const matchedPath = entry.paths[idx];

    // Record the taken event (offloaded bump). Injectable for tests.
    const rec = recordFn || recordTelemetry;
    rec({ offloaded: true, statsPath });

    // Remove the matched path so this suggestion converts at most once. Persist
    // the trimmed map back (drop the whole session entry if nothing remains).
    const remaining = entry.paths.filter((_, i) => i !== idx);
    if (remaining.length > 0) {
      map[sid] = { ts: entry.ts, paths: remaining };
    } else {
      delete map[sid];
    }
    writePendingMap(map, { pendingPath });

    return { matched: true, matchedPath, statsRecorded: true, remaining: remaining.length };
  } catch (err) {
    return { matched: false, error: String((err && err.message) || err) };
  }
}

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------
const _entry = process.argv[1] ? fileURLToPath(import.meta.url) === process.argv[1] : false;

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  const { tool_name, tool_input } = input || {};
  if (tool_name !== 'Read') {
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  const filePath = (tool_input && tool_input.file_path) || '';
  const sessionId = (input && input.session_id) || '';
  try {
    correlateRead(filePath, sessionId);
  } catch { /* never block the Read */ }
  console.log(JSON.stringify({ continue: true }));
}

if (_entry) {
  try {
    main();
  } catch {
    console.log(JSON.stringify({ continue: true }));
  }
}
