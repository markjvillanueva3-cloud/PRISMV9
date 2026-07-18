/**
 * galaxy-cag-cache.mjs -- Cache-Augmented Generation (CAG) layer for the galaxy
 * reasoning bridge (AI-SYNERGY-AUDIT-MS0/U-AISYN-CAG, slot:charlie).
 *
 * The RAG upgrade (galaxy-context-retrieval.mjs) made the bridge retrieve per-question
 * context; CAG is the complementary hybrid arm: cache the GROUNDED ANSWER keyed by
 * (galaxy, model, normalized-question) AND fingerprinted by the galaxy's doctrine corpus,
 * so a repeated question returns instantly with ZERO Ollama call -- but a doctrine edit
 * (new CLAUDE/MEMORY/AWARENESS/synthesis content) changes the fingerprint and INVALIDATES
 * the entry, so the cache is never stale (R12: correctness over speed). Build-once: serves
 * every galaxy through the one bridge.
 *
 * The key/fingerprint/freshness/prune logic is PURE (no fs/clock/random -- timestamps are
 * passed in) so it is reference-value testable (R9). Fail-soft load/save I/O is isolated.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const CAG_SCHEMA_VERSION = "1.0.0";
const DEFAULT_MAX_ENTRIES = 500;

function sha(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex").slice(0, 16);
}

/** Normalize a question so trivially-different phrasings share a cache slot. PURE. */
export function normalizeQuery(query) {
  return String(query == null ? "" : query)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Cache key = galaxy + model + hashed normalized query. PURE, deterministic. */
export function cagKey(galaxy, model, query) {
  return `${String(galaxy)}::${String(model)}::${sha(normalizeQuery(query))}`;
}

/**
 * Strip provably reasoning-IRRELEVANT volatile tokens from doctrine text BEFORE it is
 * fingerprinted, so a cosmetic doc regeneration (fresh timestamp / session id / "Nh ago")
 * does NOT bust every cached answer for the galaxy. PURE. Removes ONLY metadata that can
 * never change a reasoning answer -- ISO-8601 datetimes, relative-time freshness tokens,
 * chat/session ids, and UUIDs -- and deliberately NOT bare numbers, counts, dates-in-prose,
 * or any doctrine text (those CAN affect a reasoning answer, so they MUST keep invalidating
 * the cache: the never-stale guarantee of corpusFingerprint is preserved). This is the
 * recoverable "doctrine-fingerprint churn" lever behind the low CAG warm-hit-rate -- the
 * galaxy corpus (CLAUDE/MEMORY/AWARENESS/synthesis) regenerates with fresh timestamps and
 * per-session ids even when the doctrine is unchanged, invalidating every cached answer.
 * (U-CAG-FINGERPRINT-DENOISE, slot:alpha 2026-06-27.)
 */
export function normalizeForFingerprint(text) {
  return String(text == null ? "" : text)
    // ISO-8601 datetime (optional fractional seconds + Z/offset) -> placeholder
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/g, "<ts>")
    // relative-time freshness tokens: "3.1h old", "27h ago", "2d ago", "45 mins ago"
    .replace(/\b\d+(?:\.\d+)?\s*(?:h|m|s|d|hr|hrs|min|mins|hour|hours|day|days|minute|minutes|second|seconds)\s+(?:ago|old)\b/gi, "<rel>")
    // chat/session ids and bare UUIDs (per-session, reasoning-irrelevant)
    .replace(/\bclaude-[0-9a-f]{8,}\b/gi, "<id>")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<uuid>")
    .trim();
}

/**
 * Fingerprint a galaxy's gathered doctrine corpus so any content edit invalidates cached
 * answers. docs = [{source, text}]. Order-independent (sorted by source). PURE.
 * Each doc's text is denoised (normalizeForFingerprint) first so cosmetic timestamp/session
 * churn does not invalidate -- but every real doctrine edit still does (never-stale).
 */
export function corpusFingerprint(docs) {
  const arr = Array.isArray(docs) ? docs.filter((d) => d && typeof d.text === "string") : [];
  if (!arr.length) return sha("empty-corpus");
  const parts = arr
    .map((d) => `${d.source}:${sha(normalizeForFingerprint(d.text))}`)
    .sort();
  return sha(parts.join("|"));
}

/** An entry is fresh iff its corpusHash matches the CURRENT corpus fingerprint. PURE. */
export function isFresh(entry, fingerprint) {
  return !!entry && typeof entry.corpusHash === "string" && entry.corpusHash === fingerprint;
}

/**
 * Look up a fresh cached answer. Returns the entry or null. PURE.
 * A hit requires both the key AND a matching corpus fingerprint (content-invalidated).
 */
export function getCached(cache, key, fingerprint) {
  const entries = (cache && cache.entries) || {};
  const e = entries[key];
  return isFresh(e, fingerprint) ? e : null;
}

/**
 * Insert/replace an entry and prune to maxEntries (drop oldest by `ts`). PURE -- returns a
 * NEW cache object; the caller persists it. `now` is injected (no clock) for testability.
 */
export function putCached(cache, key, entry, opts = {}) {
  const maxEntries = opts.maxEntries || DEFAULT_MAX_ENTRIES;
  const base = cache && typeof cache === "object" ? cache : {};
  const entries = { ...(base.entries || {}) };
  entries[key] = entry;
  const pruned = pruneEntries(entries, maxEntries);
  return { schemaVersion: CAG_SCHEMA_VERSION, entries: pruned };
}

/** Drop oldest entries (by `ts`) until at most maxEntries remain. PURE. */
export function pruneEntries(entries, maxEntries) {
  const keys = Object.keys(entries || {});
  if (keys.length <= maxEntries) return { ...entries };
  const sorted = keys.sort((a, b) => (entries[a].ts || 0) - (entries[b].ts || 0)); // oldest first
  const keep = sorted.slice(keys.length - maxEntries);
  const out = {};
  for (const k of keep) out[k] = entries[k];
  return out;
}

/** Load the cache file. Fail-soft: any error -> a fresh empty cache (never throws). */
export function loadCache(file) {
  try {
    const txt = fs.readFileSync(file, "utf8");
    const j = JSON.parse(txt);
    if (j && typeof j === "object" && j.entries && typeof j.entries === "object") return j;
  } catch {
    /* absent / corrupt -> empty */
  }
  return { schemaVersion: CAG_SCHEMA_VERSION, entries: {} };
}

/** Persist the cache (atomic-ish: tmp + rename). Fail-soft: never throws. */
export function saveCache(file, cache) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(cache));
    fs.renameSync(tmp, file);
    return true;
  } catch {
    return false;
  }
}

// --- CAG hit-rate telemetry (U-CAG-HITRATE-TELEMETRY, slot:bravo 2026-06-14) ---------------
// Fleet-wide CAG observability for PSN leg #10: the bridge served EVERY galaxy with ZERO
// hit/miss visibility -- you cannot optimize an offload/cache rate you cannot measure. These
// are fail-soft (telemetry MUST NEVER break reasoning) and aggregate-approximate (read-modify-
// write under 34-galaxy/multi-chat concurrency may lose the occasional increment; a hit RATE is
// robust to that). The count math is PURE (bumpCagStat/summarizeCagStats) -> reference-testable.

export const CAG_STATS_FILE = "H:/prism/state/shared/cache/cag-cache-stats.json";

/**
 * Derive the stats sink that sits NEXT TO a given cag cache file (so a test temp cagFile
 * auto-isolates its telemetry -- hermetic, no real-state pollution). Falls back to the
 * canonical production path. Regex-based (no path import). PURE.
 */
export function cagStatsFileFor(cagFile) {
  if (typeof cagFile === "string" && cagFile) return cagFile.replace(/[^/\\]+$/, "cag-cache-stats.json");
  return CAG_STATS_FILE;
}

// Miss-reason taxonomy (U-CAG-HITRATE-HONESTY, slot:alpha 2026-06-15). A raw fleet hit-RATE is
// dominated by UNAVOIDABLE first-ask misses: with ~1 lookup/galaxy a cold cache physically cannot
// hit. Segmenting WHY a miss happened separates the unavoidable (`novel` = this exact
// galaxy+model+question was never cached -- cold first-touch OR a genuinely new question) from the
// only RECOVERABLE miss (`invalidated` = the key WAS cached but the galaxy's doctrine-corpus
// fingerprint changed, wiping it -- the single miss type a cache-design/fingerprint change could
// reclaim). `error` = a cache-layer fault counted distinctly so it never masquerades as novel.
export const MISS_REASONS = Object.freeze(new Set(["novel", "invalidated", "error"]));

/**
 * Increment hit/miss counts for a galaxy. PURE (mutates + returns the passed object).
 * `reason` (miss only) buckets the miss into MISS_REASONS so the warm-rate denominator is
 * trustworthy. An UNKNOWN/absent reason is intentionally left UNbucketed (summarizeCagStats
 * surfaces it as `unclassifiedMisses`) rather than silently miscounted as recoverable -- this
 * is what keeps `warmHitRate` honest on legacy/pre-instrumentation data (R12).
 */
export function bumpCagStat(stats, galaxy, hit, reason) {
  const s = stats && typeof stats === "object" ? stats : {};
  if (typeof s.hits !== "number") s.hits = 0;
  if (typeof s.misses !== "number") s.misses = 0;
  if (!s.byGalaxy || typeof s.byGalaxy !== "object") s.byGalaxy = {};
  const g = typeof galaxy === "string" && galaxy.trim() ? galaxy.trim() : "unknown";
  if (!s.byGalaxy[g]) s.byGalaxy[g] = { hits: 0, misses: 0 };
  // Freeze the legacy-untagged baseline (overall + this galaxy) BEFORE this increment, so any
  // untagged misses that predate reason-tagging are quarantined out of the warm-rate window
  // exactly once (U-CAG-WARM-RATE-LEGACY-QUARANTINE).
  snapshotLegacyBaseline(s);
  if (hit) {
    s.hits++; s.byGalaxy[g].hits++;
  } else {
    s.misses++; s.byGalaxy[g].misses++;
    const r = MISS_REASONS.has(reason) ? reason : null;
    if (r) {
      if (!s.missReasons || typeof s.missReasons !== "object") s.missReasons = {};
      s.missReasons[r] = (s.missReasons[r] || 0) + 1;
      const bg = s.byGalaxy[g];
      if (!bg.missReasons || typeof bg.missReasons !== "object") bg.missReasons = {};
      bg.missReasons[r] = (bg.missReasons[r] || 0) + 1;
    }
  }
  return s;
}

/** Coerce a raw missReasons bag to the full {novel,invalidated,error} shape (0-filled). PURE. */
export function normalizeMissReasons(mr) {
  const out = { novel: 0, invalidated: 0, error: 0 };
  if (mr && typeof mr === "object") {
    for (const k of Object.keys(out)) if (typeof mr[k] === "number" && mr[k] > 0) out[k] = mr[k];
  }
  return out;
}

/** PURE: a scope's currently-UNtagged misses = misses minus the classified buckets. */
export function untaggedMisses(node) {
  if (!node || typeof node !== "object") return 0;
  const m = typeof node.misses === "number" ? node.misses : 0;
  const r = normalizeMissReasons(node.missReasons);
  return Math.max(0, m - (r.novel + r.invalidated + r.error));
}

/**
 * Snapshot the pre-instrumentation LEGACY-UNTAGGED baseline once per scope (overall + each
 * galaxy). PURE (mutates + returns). U-CAG-WARM-RATE-LEGACY-QUARANTINE (slot:alpha 2026-06-16):
 * misses recorded BEFORE miss-reason tagging existed can never be classified, so they trip
 * warmRateFields' unclassified null-guard FOREVER (warmHitRate stuck at n/a even as new tagged
 * traffic accumulates). Snapshotting the untagged count at instrumentation start lets warm-rate
 * compute over the POST-instrumentation window (where every miss IS tagged -- recordCagStat always
 * passes a reason). Idempotent: set ONCE; a later genuinely-untagged miss still grows untagged
 * past the frozen baseline -> warm-rate honestly re-nulls (a real un-instrumented caller is NOT
 * masked). Only call when about to record a CLASSIFIED event (so the snapshot == the legacy floor).
 */
export function snapshotLegacyBaseline(stats) {
  const s = stats && typeof stats === "object" ? stats : {};
  if (typeof s.legacyUntaggedBaseline !== "number") s.legacyUntaggedBaseline = untaggedMisses(s);
  for (const v of Object.values(s.byGalaxy || {})) {
    if (v && typeof v === "object" && typeof v.legacyUntaggedBaseline !== "number") {
      v.legacyUntaggedBaseline = untaggedMisses(v);
    }
  }
  return s;
}

/**
 * Derive the warm-rate fields for one hit/miss/reason triple. PURE.
 *
 * warmHitRate = hits / (hits + invalidated) -- the hit-rate over RECOVERABLE traffic only.
 * `novel`/cold misses are first-ever questions a cache can never serve, so they are excluded
 * from the denominator (else a low-volume substrate looks broken when it is merely cold).
 * `invalidated` IS in the denominator: it is the only miss a fingerprint/cache change could win.
 *
 * Returns warmHitRate = null (NOT 0) when it cannot be honestly computed:
 *   - unclassifiedMisses > 0  -> legacy/pre-instrumentation misses exist; the split is untrusted.
 *   - recoverable === 0       -> no warm traffic yet (every lookup was a first-ask); N/A, not 0%.
 * (R12: never render a rate you cannot compute as a confident number.)
 */
export function warmRateFields(hits, misses, reasons, legacyBaseline = 0) {
  const classified = reasons.novel + reasons.invalidated + reasons.error;
  const legacy = Math.max(0, Math.floor(Number(legacyBaseline) || 0));
  // Subtract the frozen pre-instrumentation legacy baseline: those untagged misses can never be
  // classified, so excluding them lets warm-rate compute over the POST-instrumentation window.
  // A NEW untagged miss (beyond the baseline) still nulls warm-rate -> a real un-instrumented
  // caller is honestly surfaced, never masked (R12).
  const unclassifiedMisses = Math.max(0, misses - classified - legacy);
  const recoverable = hits + reasons.invalidated;
  let warmHitRate = null;
  if (unclassifiedMisses === 0 && recoverable > 0) warmHitRate = hits / recoverable;
  return {
    warmHitRate,
    addressableMisses: reasons.invalidated, // the recoverable miss count (doctrine-churn invalidations)
    coldMisses: reasons.novel,              // unavoidable first-ask misses
    unclassifiedMisses,                     // post-baseline untagged misses (warm-rate untrustworthy while > 0)
    legacyUntaggedBaseline: legacy,         // pre-instrumentation untagged misses excluded from the window
  };
}

/**
 * Derive overall + per-galaxy hit rates from a raw stats object. PURE.
 * Additive over the original contract (hits/misses/total/hitRate/galaxies/byGalaxy unchanged):
 * now also carries missReasons + warm-rate fields (warmHitRate/addressableMisses/coldMisses/
 * unclassifiedMisses) at both scopes so a consumer can distinguish a cold-start-dominated raw
 * rate from a genuine (invalidation-churn) cache problem.
 */
export function summarizeCagStats(stats) {
  const s = stats && typeof stats === "object" ? stats : {};
  const hits = s.hits || 0;
  const misses = s.misses || 0;
  const total = hits + misses;
  const overallReasons = normalizeMissReasons(s.missReasons);
  const byGalaxy = {};
  for (const [g, v] of Object.entries(s.byGalaxy || {})) {
    const h = (v && v.hits) || 0;
    const m = (v && v.misses) || 0;
    const t = h + m;
    const gr = normalizeMissReasons(v && v.missReasons);
    const gBase = (v && typeof v.legacyUntaggedBaseline === "number") ? v.legacyUntaggedBaseline : 0;
    byGalaxy[g] = { hits: h, misses: m, total: t, hitRate: t > 0 ? h / t : 0, missReasons: gr, ...warmRateFields(h, m, gr, gBase) };
  }
  const overallBase = typeof s.legacyUntaggedBaseline === "number" ? s.legacyUntaggedBaseline : 0;
  return {
    hits, misses, total, hitRate: total > 0 ? hits / total : 0,
    galaxies: Object.keys(byGalaxy).length, byGalaxy,
    missReasons: overallReasons, ...warmRateFields(hits, misses, overallReasons, overallBase),
  };
}

/** Load the raw stats object (fail-soft -> fresh on absent/corrupt). */
export function readCagStats(file = CAG_STATS_FILE) {
  try {
    const j = JSON.parse(fs.readFileSync(file, "utf8"));
    if (j && typeof j === "object") return j;
  } catch {
    /* absent / corrupt -> fresh */
  }
  return { hits: 0, misses: 0, byGalaxy: {} };
}

/**
 * Record one hit/miss. Fail-soft + atomic-ish (tmp + rename). NEVER throws (telemetry).
 * `reason` (miss only, one of MISS_REASONS) segments the miss; back-compat -- a 3-arg call
 * (no reason) records an UNbucketed miss exactly as before.
 */
export function recordCagStat(galaxy, hit, file = CAG_STATS_FILE, reason) {
  try {
    const next = bumpCagStat(readCagStats(file), galaxy, hit, reason);
    next.schemaVersion = CAG_SCHEMA_VERSION;
    next.updatedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(next));
    fs.renameSync(tmp, file);
  } catch {
    /* telemetry best-effort -> never breaks reasoning */
  }
}
