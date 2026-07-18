/**
 * cited-tip-fetcher.mjs — pure runtime query layer over the iter13
 * per-controller cited-tip TS files. Consumers (post-processor,
 * classifier, training-data feeders) pass a controller + optional
 * filters and receive ranked tips.
 *
 * Loads the JSONL on demand (preferred — single source of truth), or
 * accepts a pre-parsed records array for in-process consumers that
 * already loaded the data.
 *
 * @milestone POST-PDF-NODE-MS0/U-CITED-TIP-FETCHER
 * @slot echo · @iter 15 · @date 2026-05-26
 */
import fs from "node:fs";
import path from "node:path";

const DIFFICULTY_RANK = { unscored: 0, easy: 1, intermediate: 2, advanced: 3, complex: 4 };
const MIN_DIFFICULTY_DEFAULT = "advanced";

/** Pure: load tips from the iter11 candidates JSONL. Returns [] on missing/error. */
export function loadTipsFromJsonl(absPath) {
  if (!absPath || !fs.existsSync(absPath)) return [];
  try {
    const text = fs.readFileSync(absPath, "utf8");
    const out = [];
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (t.length === 0) continue;
      try { out.push(JSON.parse(t)); } catch { /* skip */ }
    }
    return out;
  } catch { return []; }
}

/** Pure: compare two records by score descending (ties: id ascending for stable order). */
export function compareByScoreDesc(a, b) {
  const sa = typeof a?.score === "number" ? a.score : 0;
  const sb = typeof b?.score === "number" ? b.score : 0;
  if (sb !== sa) return sb - sa;
  return String(a?.id || "").localeCompare(String(b?.id || ""));
}

/** Pure: filter by controller (case-insensitive); null criteria returns all. */
export function filterByController(tips, controller) {
  if (!controller) return Array.isArray(tips) ? tips.slice() : [];
  const wanted = String(controller).toLowerCase();
  return (tips || []).filter((t) => String(t?.controller || "").toLowerCase() === wanted);
}

/** Pure: filter by minimum difficulty (advanced+complex by default). */
export function filterByMinDifficulty(tips, minDiff) {
  const threshold = DIFFICULTY_RANK[minDiff || MIN_DIFFICULTY_DEFAULT];
  if (threshold === undefined) return Array.isArray(tips) ? tips.slice() : [];
  return (tips || []).filter((t) => (DIFFICULTY_RANK[t?.difficulty] || 0) >= threshold);
}

/** Pure: filter by score range. */
export function filterByScoreRange(tips, minScore, maxScore) {
  let out = Array.isArray(tips) ? tips.slice() : [];
  if (typeof minScore === "number") out = out.filter((t) => Number(t?.score) >= minScore);
  if (typeof maxScore === "number") out = out.filter((t) => Number(t?.score) <= maxScore);
  return out;
}

/** Pure: filter by keyword substring on body (case-insensitive). */
export function filterByKeyword(tips, keyword) {
  if (!keyword) return Array.isArray(tips) ? tips.slice() : [];
  const k = String(keyword).toLowerCase();
  return (tips || []).filter((t) => String(t?.body || "").toLowerCase().includes(k));
}

/** Pure: main fetcher — apply criteria + sort + cap. */
export function fetchTips(tips, criteria = {}) {
  let out = Array.isArray(tips) ? tips.slice() : [];
  if (criteria.controller) out = filterByController(out, criteria.controller);
  if (criteria.minDifficulty) out = filterByMinDifficulty(out, criteria.minDifficulty);
  if (typeof criteria.minScore === "number" || typeof criteria.maxScore === "number") {
    out = filterByScoreRange(out, criteria.minScore, criteria.maxScore);
  }
  if (criteria.keyword) out = filterByKeyword(out, criteria.keyword);
  if (criteria.domain) {
    const w = String(criteria.domain).toLowerCase();
    out = out.filter((t) => String(t?.domain || "").toLowerCase() === w);
  }
  out.sort(compareByScoreDesc);
  const limit = Number.isInteger(criteria.limit) && criteria.limit > 0 ? criteria.limit : out.length;
  return out.slice(0, limit);
}

/** Pure: convenience — fetch top-N highest-scored tips for a controller. */
export function topTipsForController(tips, controller, n) {
  return fetchTips(tips, { controller, limit: n || 5 });
}

/** Pure: convenience — fetch tips matching a body keyword. */
export function findTipsByKeyword(tips, keyword, n) {
  return fetchTips(tips, { keyword, limit: n || 5 });
}

export { DIFFICULTY_RANK, MIN_DIFFICULTY_DEFAULT };

/** Path helper for the default canonical JSONL location relative to repo root. */
export function defaultJsonlPath(repoRoot) {
  return path.join(repoRoot || "H:/prism", "mcp-server/data/ingestion_cache/curriculum-tribal-candidates/jm-die-curriculum-tribal-candidates.jsonl");
}
