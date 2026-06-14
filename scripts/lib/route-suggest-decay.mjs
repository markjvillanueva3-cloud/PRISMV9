// route-suggest-decay.mjs -- advisory-DECAY actor for mcp-route-suggest.
// ---------------------------------------------------------------------------
// Closes the gap named by the 2026-06-09 cross-surface audit + confirmed unbuilt
// 2026-06-11 (slot:golf): scripts/audit-mcp-route-takerate.mjs MEASURES route-suggest
// take-rate and already classifies each classifier as suppress/retune/verify-wiring/keep,
// but NOTHING consumes the `suppress` recommendation to actually mute proven-noise
// classifiers at fire-time. Route-suggest fires ~10450x at ~0.4% take-rate = pure
// context tax. This is the missing CONSUMER.
//
// This is the KEYSTONE (golf-buildable, scripts/lib/). The 2-line consumer splice into
// .claude/hooks/mcp-route-suggest.mjs is cross-worktree-firewall-gated for the golf slot,
// so it ships as a ready patch routed to bravo (route/ollama family owner). See
// state/shared/specs/SKILLS-HOOKS-AUDIT-2026-06-11.md and memory
// reference_route_suggest_decay_gap_confirmed_2026_06_11.
//
// SAFETY (why this cannot mute a legit classifier):
//   - It only suppresses rows the audit ALREADY marked recommendation==='suppress'.
//     That verdict requires share>=30% AND take-rate<5% AND (NOT fires>=50&&takes===0)
//     -- the audit verify-wiring precedence means a 0%-from-broken-wiring is NEVER
//     marked suppress. Belt-and-suspenders: this lib additionally requires fires>0 AND
//     takes>0 before suppressing, so a malformed audit row can never mute a classifier
//     that has zero measured takes (a measurement artifact).
//   - Freshness guard: a stale audit (default >7d) yields an EMPTY set -- a classifier
//     may have recovered, so we never mute on old data.
//   - Fail-safe: any read/parse error yields an EMPTY set -- never mute on missing data.
//   - Opt-out knob PRISM_ROUTE_DECAY_DISABLE=1 returns false unconditionally.
//
// Pure-core (unit-testable): computeSuppressSet. IO layer: loadSuppressSet. Predicate:
// isRouteSuggestDecaySuppressed. Audit log: logDecaySuppression.

import fs from "node:fs";

export const AUDIT_FILE = "H:/prism/state/shared/dashboards/mcp-route-takerate-audit.json";
export const DECAY_LOG = "H:/prism/state/shared/dashboards/route-suggest-decay-log.jsonl";
// Stale audit => do not mute (a classifier may have recovered since the audit ran).
export const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7d

/**
 * Pure-core: given a parsed take-rate-audit object (output of
 * audit-mcp-route-takerate.mjs summarize()), return the Set of classifier
 * names that are SAFE to suppress.
 *
 * @param {object} audit  parsed audit JSON ({ summary, rows:[{classifier,fires,takes,recommendation}], meta:{ts} })
 * @param {{now?:number, maxAgeMs?:number}} opts
 * @returns {{ suppressed:Set<string>, stale:boolean, reason:string, auditTs:(string|null) }}
 */
export function computeSuppressSet(audit, { now = Date.now(), maxAgeMs = DEFAULT_MAX_AGE_MS } = {}) {
  const out = { suppressed: new Set(), stale: false, reason: "ok", auditTs: null };
  if (!audit || typeof audit !== "object") { out.reason = "no-audit"; return out; }

  const rows = Array.isArray(audit.rows) ? audit.rows : [];
  const tsRaw = audit.meta && audit.meta.ts ? audit.meta.ts : null;
  out.auditTs = tsRaw;
  const ts = tsRaw ? Date.parse(tsRaw) : NaN;
  if (Number.isFinite(ts) && (now - ts) > maxAgeMs) {
    out.stale = true;
    out.reason = "stale-audit";
    return out; // empty set: never mute on stale data
  }

  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const fires = Number(r.fires);
    const takes = Number(r.takes);
    // Belt-and-suspenders over the audit verify-wiring precedence: require a
    // measured, dominant, sub-5% classifier. A row marked suppress with takes===0
    // (a measurement artifact that slipped through) is NEVER muted here.
    if (r.recommendation === "suppress" && Number.isFinite(fires) && fires > 0 && Number.isFinite(takes) && takes > 0) {
      if (typeof r.classifier === "string" && r.classifier.length > 0) out.suppressed.add(r.classifier);
    }
  }
  return out;
}

/**
 * IO layer: read the audit file from disk and compute the suppress set.
 * Fail-safe: any read/parse error => empty set (never mute on missing data).
 */
export function loadSuppressSet({ auditFile = AUDIT_FILE, now = Date.now(), maxAgeMs = DEFAULT_MAX_AGE_MS } = {}) {
  let audit = null;
  try {
    audit = JSON.parse(fs.readFileSync(auditFile, "utf8"));
  } catch {
    return { suppressed: new Set(), stale: false, reason: "audit-unreadable", auditTs: null };
  }
  return computeSuppressSet(audit, { now, maxAgeMs });
}

// Per-process memo so a short-lived hook invocation reads the audit at most once.
let _cache = null;
let _cacheKey = null;

/**
 * Fire-time predicate the hook calls: is this classifier currently decay-suppressed?
 * Honors PRISM_ROUTE_DECAY_DISABLE=1 (returns false unconditionally).
 *
 * @param {string} classifier
 * @param {{auditFile?:string, now?:number, maxAgeMs?:number, fresh?:boolean}} opts
 * @returns {boolean}
 */
export function isRouteSuggestDecaySuppressed(classifier, opts = {}) {
  if (process.env.PRISM_ROUTE_DECAY_DISABLE === "1") return false;
  if (typeof classifier !== "string" || classifier.length === 0) return false;
  const key = `${opts.auditFile || AUDIT_FILE}`;
  if (!_cache || opts.fresh || _cacheKey !== key) {
    _cache = loadSuppressSet(opts);
    _cacheKey = key;
  }
  return _cache.suppressed.has(classifier);
}

/** Test seam: clear the per-process memo. */
export function _resetCache() { _cache = null; _cacheKey = null; }

/**
 * Best-effort auditable record: append one JSONL line each time a suppression
 * fires, so the decay is measured (not asserted). Never throws.
 */
export function logDecaySuppression(classifier, sessionId, { logFile = DECAY_LOG } = {}) {
  try {
    const line = JSON.stringify({ t: new Date().toISOString(), classifier, sessionId: sessionId || null }) + "\n";
    fs.appendFileSync(logFile, line);
  } catch { /* best-effort telemetry: never block the hook */ }
}
