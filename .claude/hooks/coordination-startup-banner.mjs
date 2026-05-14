#!/usr/bin/env node
// tier: T2
/**
 * coordination-startup-banner.mjs (U-COORD06)
 *
 * SessionStart hook (T2 injector) that displays cross-session coordination
 * status from the AGENT_COORDINATION_SUMMARY.json surface shipped by U-COORD01.
 *
 * Emits a single-line banner of the form:
 *   "Coordination: <state>[ · /who for details]"
 *
 * States (in priority order):
 *   1. PRISM_COORD_BANNER_DISABLE=1     → empty result (banner suppressed)
 *   2. summary file unreadable / absent → "offline (no summary file)"
 *   3. JSON.parse failure               → "offline (corrupt summary file)"
 *   4. summary.daemon_active === false  → "daemon offline"
 *   5. summary age > STALE_MS           → "stale snapshot — N other sessions seen (Xm ago)"
 *   6. summary.health !== 'healthy'     → "<health> — N other sessions"
 *   7. healthy + N > 0                  → "N other session(s) online"
 *   8. healthy + N === 0                → "connected (solo session)"
 *
 * /who discovery hint (re-fires every HINT_TTL_MS):
 *   The hint " · /who for details" is appended whenever the marker file at
 *   PRISM_COORD_BANNER_MARKER_PATH is absent OR its mtime is older than
 *   PRISM_COORD_BANNER_HINT_TTL_MS (default 7 days). After emission the
 *   marker mtime is refreshed. Two consequences:
 *     - On a brand-new clone, the hint shows on first SessionStart.
 *     - On a long-lived clone, the hint resurfaces every TTL window — so
 *       team members joining a shared H:/ drive see /who without depending
 *       on a marker file that was created weeks earlier by someone else.
 *   Marker write failure is non-fatal; the hint will simply re-show next time.
 *
 * Naming note:
 *   The U-COORD06 spec deliverable is `coordination-status-banner.mjs`;
 *   this file is `coordination-startup-banner.mjs` (created U-COORD01-era).
 *   Same hot path, same hook contract — keeping the existing filename per
 *   the project's never-delete/move convention. Documented in ship_notes.
 *
 * Tier:
 *   T2 (injector) — synchronous SessionStart output producer, non-blocking.
 *   NOT T4 (AsyncHookDispatcherEngine is for Stop hooks; SessionStart runs
 *   serially and harness streams `result` strings into the session banner).
 *
 * Knobs:
 *   PRISM_COORD_BANNER_DISABLE=1            → suppress banner entirely
 *   PRISM_COORD_BANNER_STALE_MS=<int>       → stale threshold (default 10min)
 *   PRISM_COORD_BANNER_HINT_TTL_MS=<int>    → /who hint TTL (default 7 days)
 *   PRISM_COORD_BANNER_SUMMARY_PATH=<path>  → override SUMMARY path (test hook)
 *   PRISM_COORD_BANNER_MARKER_PATH=<path>   → override marker path (test hook)
 *
 * Defensive contract:
 *   Every failure path emits {result: "<string>"} on stdout and exits 0. The
 *   hook can NEVER break the SessionStart event chain.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const DEFAULT_SUMMARY_PATH = 'H:/prism/state/shared/AGENT_COORDINATION_SUMMARY.json';
const DEFAULT_MARKER_PATH = 'H:/prism/state/shared/.banner-who-hint-shown';

const MS_PER_SECOND = 1_000;
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;
const STALE_MINUTES = 10;
const DEFAULT_STALE_MS = STALE_MINUTES * MS_PER_MINUTE;
const HINT_TTL_DAYS = 7;
const DEFAULT_HINT_TTL_MS = HINT_TTL_DAYS * MS_PER_DAY;
const RADIX_DECIMAL = 10;

function resolveSummaryPath() {
  const v = process.env.PRISM_COORD_BANNER_SUMMARY_PATH;
  return v && v.length > 0 ? v : DEFAULT_SUMMARY_PATH;
}

function resolveMarkerPath() {
  const v = process.env.PRISM_COORD_BANNER_MARKER_PATH;
  return v && v.length > 0 ? v : DEFAULT_MARKER_PATH;
}

function resolveStaleMs() {
  const raw = process.env.PRISM_COORD_BANNER_STALE_MS;
  if (raw == null || raw === '') return DEFAULT_STALE_MS;
  const v = Number.parseInt(raw, RADIX_DECIMAL);
  if (!Number.isFinite(v) || v < 0) return DEFAULT_STALE_MS;
  return v;
}

function resolveHintTtlMs() {
  const raw = process.env.PRISM_COORD_BANNER_HINT_TTL_MS;
  if (raw == null || raw === '') return DEFAULT_HINT_TTL_MS;
  const v = Number.parseInt(raw, RADIX_DECIMAL);
  if (!Number.isFinite(v) || v < 0) return DEFAULT_HINT_TTL_MS;
  return v;
}

function readSummary(summaryPath) {
  let raw;
  try {
    raw = fs.readFileSync(summaryPath, 'utf8');
  } catch {
    return { kind: 'missing' };
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed == null || typeof parsed !== 'object') {
      return { kind: 'corrupt' };
    }
    return { kind: 'ok', summary: parsed };
  } catch {
    return { kind: 'corrupt' };
  }
}

function summaryAgeMs(summary) {
  if (!summary || typeof summary.generated_at !== 'string') return null;
  const t = Date.parse(summary.generated_at);
  if (!Number.isFinite(t)) return null;
  const age = Date.now() - t;
  return age >= 0 ? age : null;
}

function formatAge(ms) {
  if (!Number.isFinite(ms) || ms < 0) return null;
  if (ms < MS_PER_MINUTE) return `${Math.floor(ms / MS_PER_SECOND)}s`;
  if (ms < MS_PER_HOUR) return `${Math.floor(ms / MS_PER_MINUTE)}m`;
  if (ms < MS_PER_DAY) return `${Math.floor(ms / MS_PER_HOUR)}h`;
  return `${Math.floor(ms / MS_PER_DAY)}d`;
}

function othersFromSummary(summary) {
  const raw = Number(summary.active_sessions);
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return Math.max(0, Math.floor(raw) - 1);
}

function countPhrase(others) {
  if (others <= 0) return 'solo session';
  return `${others} other session${others === 1 ? '' : 's'}`;
}

function buildStatusLine(readResult, staleMs) {
  if (readResult.kind === 'missing') {
    return 'Coordination: offline (no summary file)';
  }
  if (readResult.kind === 'corrupt') {
    return 'Coordination: offline (corrupt summary file)';
  }
  const summary = readResult.summary;
  if (summary.daemon_active === false) {
    return 'Coordination: daemon offline';
  }
  const others = othersFromSummary(summary);
  const ageMs = summaryAgeMs(summary);
  if (ageMs != null && ageMs > staleMs) {
    const ageStr = formatAge(ageMs);
    const tail = ageStr ? ` (${ageStr} ago)` : '';
    return `Coordination: stale snapshot — ${countPhrase(others)} seen${tail}`;
  }
  const health = summary.health;
  if (typeof health === 'string' && health !== 'healthy') {
    return `Coordination: ${health} — ${countPhrase(others)}`;
  }
  return others > 0
    ? `Coordination: ${countPhrase(others)} online`
    : 'Coordination: connected (solo session)';
}

function shouldShowHint(markerPath, ttlMs) {
  try {
    const stat = fs.statSync(markerPath);
    const mtimeMs = Number(stat.mtimeMs);
    if (!Number.isFinite(mtimeMs)) return true;
    const age = Date.now() - mtimeMs;
    if (!Number.isFinite(age) || age < 0) return true;
    return age > ttlMs;
  } catch {
    return true; // marker missing — first time on this clone
  }
}

function refreshMarker(markerPath) {
  try {
    fs.mkdirSync(path.dirname(markerPath), { recursive: true });
    fs.writeFileSync(markerPath, new Date().toISOString() + '\n', 'utf8');
    return true;
  } catch {
    return false; // non-fatal; next session will re-show the hint
  }
}

function emit(result) {
  process.stdout.write(JSON.stringify({ result }) + '\n');
}

async function main() {
  if (process.env.PRISM_COORD_BANNER_DISABLE === '1') {
    emit('');
    return;
  }
  const summaryPath = resolveSummaryPath();
  const markerPath = resolveMarkerPath();
  const staleMs = resolveStaleMs();
  const hintTtlMs = resolveHintTtlMs();
  const readResult = readSummary(summaryPath);
  let line = buildStatusLine(readResult, staleMs);
  if (shouldShowHint(markerPath, hintTtlMs)) {
    line = `${line} · /who for details`;
    refreshMarker(markerPath);
  }
  emit(line);
}

void main().catch(() => {
  // Last-resort defensive: never break SessionStart
  try {
    emit('');
  } catch {
    // even stdout write failed; exit 0 anyway
  }
});
