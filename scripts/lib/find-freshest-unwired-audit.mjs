#!/usr/bin/env node
/**
 * find-freshest-unwired-audit.mjs (U-AUDIT-FRESHEST-RESOLVER, slot:sierra 2026-06-18).
 *
 * THE BUG THIS FIXES: `audit-unwired-engines.mjs` date-stamps its output
 * `UNWIRED-ENGINE-AUDIT-<YYYY-MM-DD>.json` (since U-AUDIT-DATESTAMP), but several consumers HARDCODE
 * a specific old date (`...-2026-05-07.json`), so they silently read a 40-day-stale audit -- wrong
 * UNWIRED count, no DORMANT-BRIDGE class, engines that have since been wired still listed. Two
 * consumers already DID the right thing inline (build-state-snapshot.mjs, romeo-wiring-triage.mjs:
 * readdir + sort-by-name + take-last); this is that logic extracted ONCE so every consumer resolves
 * the freshest audit the same way (DRY -- no more hardcoded dates to rot).
 *
 * SAFE-BY-CONSTRUCTION: the filename date is ISO `YYYY-MM-DD`, so lexicographic sort == chronological
 * sort. Fail-soft: a missing dir / no audit returns null (the caller keeps its own fallback). Pure
 * w.r.t. I/O via the injected `_fs` (unit-testable without touching disk).
 */
import fsDefault from "node:fs";
import path from "node:path";

const ROOT = process.env.PRISM_ROOT || "H:/prism";
export const DEFAULT_SHARED_DIR = path.join(ROOT, "state", "shared");
// Exact dated-audit name. The date capture keeps the match strict (a stray `UNWIRED-ENGINE-AUDIT.json`
// with no date is NOT a calibrated output and must not win the sort).
const AUDIT_NAME_RE = /^UNWIRED-ENGINE-AUDIT-\d{4}-\d{2}-\d{2}\.json$/;

/**
 * Absolute path of the freshest `UNWIRED-ENGINE-AUDIT-<date>.json` in `sharedDir`, or null when the
 * dir is unreadable or holds no dated audit. Newest = the lexicographically-last dated filename.
 * @returns {string|null}
 */
export function findFreshestUnwiredAuditPath({ sharedDir = DEFAULT_SHARED_DIR, _fs = fsDefault } = {}) {
  let entries;
  try { entries = _fs.readdirSync(sharedDir); } catch { return null; }
  const dated = entries.filter((f) => AUDIT_NAME_RE.test(f)).sort();
  return dated.length ? path.join(sharedDir, dated[dated.length - 1]) : null;
}

/**
 * Resolve + parse the freshest audit. Returns { path, json } -- json is null on parse error / no
 * audit (path is still surfaced so the caller can report what it tried). Fail-soft, never throws.
 * @returns {{path:(string|null), json:(object|null)}}
 */
export function readFreshestUnwiredAudit({ sharedDir = DEFAULT_SHARED_DIR, _fs = fsDefault } = {}) {
  const p = findFreshestUnwiredAuditPath({ sharedDir, _fs });
  if (!p) return { path: null, json: null };
  try { return { path: p, json: JSON.parse(_fs.readFileSync(p, "utf8")) }; }
  catch { return { path: p, json: null }; }
}
