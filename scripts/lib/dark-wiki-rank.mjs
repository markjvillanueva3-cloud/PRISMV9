// scripts/lib/dark-wiki-rank.mjs
// -------------------------------
// Pure ranker for the DARK WIKI problem (U-DARK-WIKI-RANK, 2026-06-09 slot:alpha).
//
// The wiki has 39,345 files but only 6,725 carry a tribal embedding -- the
// semantic layer over the wiki is 83% DARK (32,630 unembedded). Re-embedding
// the whole set is BLOCKED on the V8 512MB-string-cap write-side SHARDING
// (india/sierra). But not every dark file is equally valuable: most have never
// been recalled, while a small set is being QUERIED yet not embedded -- the
// demanded-but-dark files. Embedding THOSE first delivers most of the recall
// benefit for ~9% of the work, the instant sharding lands.
//
// This module is PURE (no I/O) so it is fully unit-testable; the CLI
// (scripts/rank-dark-wiki-by-recall.mjs) does the file reads/writes. Read-only
// by construction: it NEVER touches the wiki, the tribal index, or the V8-cap
// writer -- it only ranks paths.
//
// Inputs:
//   missing      : string[] of wiki-relative dark paths, e.g.
//                  "architecture/foo.md" (from .wiki-tribal-cross-ref-audit.json
//                  .missingFromTribal).
//   recallByKey  : { [recallKey]: { count, lastSeenIso, ... } } from
//                  wiki-recall-counts.json .entries. Keys look like
//                  "wiki/architecture/foo" (no .md, wiki/ prefixed).
//
// Output: a ranked array, highest-value first.

// Scoring weights. recall demand dominates (it is the only DIRECT "this file is
// wanted" signal); recency is a weak tiebreak so a recently-recalled file edges
// out an equally-recalled stale one.
export const W_RECALL = 1000;       // each recall is worth far more than recency
export const RECENCY_HALFLIFE_DAYS = 30; // recency bonus halves every 30 days
export const RECENCY_MAX_BONUS = 100;    // capped so it never outweighs 1 recall
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Map a dark wiki path to the key shape used by wiki-recall-counts.json.
 * "architecture/foo.md" -> "wiki/architecture/foo". Pure.
 * Backslashes are normalized to forward slashes (defensive; the audit stores
 * forward slashes). A null/non-string yields "".
 */
export function darkPathToRecallKey(relPath) {
  if (!relPath || typeof relPath !== "string") return "";
  const norm = relPath.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\.md$/i, "");
  return `wiki/${norm}`;
}

/**
 * Recency bonus: exponential decay from RECENCY_MAX_BONUS at age 0 toward 0,
 * halving every RECENCY_HALFLIFE_DAYS. Returns 0 when lastSeenMs is missing or
 * in the future relative to nowMs (no negative bonus). Pure.
 */
export function recencyBonus(lastSeenMs, nowMs) {
  if (!Number.isFinite(lastSeenMs) || !Number.isFinite(nowMs)) return 0;
  const ageDays = (nowMs - lastSeenMs) / MS_PER_DAY;
  if (ageDays < 0) return RECENCY_MAX_BONUS; // future-stamped -> treat as freshest
  const decay = Math.pow(0.5, ageDays / RECENCY_HALFLIFE_DAYS);
  return RECENCY_MAX_BONUS * decay;
}

/**
 * Score one dark file. tier 1 = demanded (recallCount > 0), tier 3 = no demand
 * signal. (tier 2 is reserved for a future recency-only heuristic.) Pure.
 * @returns {{relPath, recallKey, recallCount, recencyDays, score, tier}}
 */
export function scoreDarkFile({ relPath, recallCount = 0, lastSeenMs = null, nowMs }) {
  const rc = Number.isFinite(recallCount) && recallCount > 0 ? recallCount : 0;
  const rb = rc > 0 ? recencyBonus(lastSeenMs, nowMs) : 0;
  const score = rc * W_RECALL + rb;
  const recencyDays =
    Number.isFinite(lastSeenMs) && Number.isFinite(nowMs)
      ? Math.max(0, (nowMs - lastSeenMs) / MS_PER_DAY)
      : null;
  return {
    relPath,
    recallKey: darkPathToRecallKey(relPath),
    recallCount: rc,
    recencyDays: recencyDays == null ? null : Math.round(recencyDays * 10) / 10,
    score,
    tier: rc > 0 ? 1 : 3,
  };
}

/**
 * Rank all dark files. Joins each dark path to its recall entry (if any),
 * scores, and returns sorted DESC by score (then recallCount, then relPath for
 * a stable, deterministic order). Pure.
 *
 * @param {object} args
 * @param {string[]} args.missing            dark wiki-relative paths
 * @param {Record<string,{count?:number,lastSeenIso?:string}>} args.recallByKey
 * @param {number} args.nowMs                clock (injected for determinism/tests)
 * @param {(iso:string)=>number} [args.parseIso]  ISO->ms (injected; defaults to Date.parse)
 * @returns {Array<ReturnType<typeof scoreDarkFile>>}
 */
export function rankDarkFiles({ missing, recallByKey = {}, nowMs, parseIso = (s) => Date.parse(s) }) {
  if (!Array.isArray(missing)) return [];
  const scored = missing.map((relPath) => {
    const key = darkPathToRecallKey(relPath);
    const entry = recallByKey[key];
    const recallCount = entry && Number.isFinite(entry.count) ? entry.count : 0;
    let lastSeenMs = null;
    if (entry && entry.lastSeenIso) {
      const ms = parseIso(entry.lastSeenIso);
      if (Number.isFinite(ms)) lastSeenMs = ms;
    }
    return scoreDarkFile({ relPath, recallCount, lastSeenMs, nowMs });
  });
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      b.recallCount - a.recallCount ||
      String(a.relPath).localeCompare(String(b.relPath)),
  );
  return scored;
}

/**
 * Summarize a ranked list: how many dark files are actually DEMANDED (the
 * high-value set), total recall pressure they carry, and the coverage win if
 * the top-N demanded files are embedded first. Pure.
 */
export function summarizeRanking(ranked) {
  const demanded = ranked.filter((r) => r.tier === 1);
  const totalDemandedRecalls = demanded.reduce((s, r) => s + r.recallCount, 0);
  return {
    totalDark: ranked.length,
    demandedDark: demanded.length,
    undemandedDark: ranked.length - demanded.length,
    totalDemandedRecalls,
    topDemanded: demanded.slice(0, 20).map((r) => ({ relPath: r.relPath, recallCount: r.recallCount })),
  };
}
