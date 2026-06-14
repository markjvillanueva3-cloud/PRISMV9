/**
 * vault-backlink-read.mjs — reader for the REVERSE edge (vault doc → graph node).
 *
 * `backlinksFor(query)` answers "which live graph node(s) does this wiki/memory
 * doc document?" from the inverted index `vault-backlinks.json` (built by
 * build-vault-backlink-index.mjs). The agent then `node-card <id>`s the node for
 * its real status/wiring — closing the system-viz↔Obsidian synergy loop WITHOUT
 * ever loading the 644 MB graph.
 *
 * FAIL-SOFT by design: this reader may be called from a hook, so a missing/torn
 * index returns a structured "unavailable" result and NEVER throws (the BUILDER is
 * the fail-loud half — R12 lives there). The 19.8 MB index is loaded ONCE per
 * process and cached; the agent only ever sees the tiny answer, never the index.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeVaultKey } from "./vault-backlink-schema.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_INDEX = path.join(ROOT, "state", "shared", "system-viz", "vault-backlinks.json");

/** Process-lifetime cache: { path -> {index|null, error|null} }. */
const _cache = new Map();

/**
 * Compute whether the index is STALE relative to the forward edge it inverts.
 * The index records `builtFromMtimeMs` (the node-cards.jsonl mtime at build time);
 * if the live source jsonl is now newer, the reverse index has drifted and may
 * return confident-but-wrong node ids — so we surface it (mirrors node-card-read's
 * staleness flag; R12 — a stale index that says "stale" is safe, one that lies is
 * the hazard). Fail-soft: any stat error → not-stale (never block a read on it).
 * @returns {{stale:boolean, staleReason:string|null}}
 */
function computeStaleness(index) {
  try {
    const builtMs = Number(index.builtFromMtimeMs);
    if (!Number.isFinite(builtMs) || builtMs <= 0) {
      return { stale: false, staleReason: null }; // no stamp → can't judge, don't cry wolf
    }
    const rel = typeof index.builtFrom === "string" ? index.builtFrom : "state/shared/system-viz/node-cards.jsonl";
    const srcPath = path.join(ROOT, rel);
    if (!fs.existsSync(srcPath)) return { stale: false, staleReason: null };
    const srcMs = Math.round(fs.statSync(srcPath).mtimeMs);
    // 1s tolerance for fs mtime granularity / clock skew.
    if (srcMs > builtMs + 1000) {
      const ageMin = Math.round((srcMs - builtMs) / 60000);
      return { stale: true, staleReason: `node-cards.jsonl is ${ageMin}min newer than this index — rerun build-vault-backlink-index.mjs` };
    }
    return { stale: false, staleReason: null };
  } catch {
    return { stale: false, staleReason: null };
  }
}

/**
 * Load + cache the index for a path. Returns `{ index, error, stale, staleReason }`
 * — `index` is null on any failure (missing file / parse error / wrong shape), with
 * `error` set to a short reason. `stale` flags drift from the source forward edge.
 * Never throws.
 */
export function loadIndex(indexPath = DEFAULT_INDEX) {
  if (_cache.has(indexPath)) return _cache.get(indexPath);
  let result;
  try {
    if (!fs.existsSync(indexPath)) {
      result = { index: null, error: `index not found at ${path.relative(ROOT, indexPath).replace(/\\/g, "/")} — run: node scripts/build-vault-backlink-index.mjs`, stale: false, staleReason: null };
    } else {
      const raw = fs.readFileSync(indexPath, "utf8");
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object" || !obj.map || typeof obj.map !== "object") {
        result = { index: null, error: "index malformed (no .map object)", stale: false, staleReason: null };
      } else {
        const { stale, staleReason } = computeStaleness(obj);
        result = { index: obj, error: null, stale, staleReason };
      }
    }
  } catch (e) {
    result = { index: null, error: `index read failed: ${e.message}`, stale: false, staleReason: null };
  }
  _cache.set(indexPath, result);
  return result;
}

/** Test/maintenance hook — drop the cached index (e.g. after a rebuild in-process). */
export function clearCache() { _cache.clear(); }

/**
 * Look up the graph node ids that document a vault doc.
 *
 * @param {string} query  a wiki path, relativized wiki path, full path, or memory slug
 * @param {{indexPath?:string, suggestLimit?:number}} [opts]
 * @returns {{
 *   found: boolean, key: string, nodeIds: string[], total: number,
 *   truncated: boolean, suggestions?: string[], unavailable?: boolean, error?: string
 * }}
 *   - found+nodeIds on an exact key hit (truncated=true when total>nodeIds.length, i.e. capped at NODE_CAP)
 *   - found:false + suggestions (basename matches) on a miss
 *   - unavailable:true + error when the index can't be loaded (fail-soft, never throws)
 */
export function backlinksFor(query, opts = {}) {
  const key = normalizeVaultKey(query);
  const { index, error, stale, staleReason } = loadIndex(opts.indexPath || DEFAULT_INDEX);
  if (!index) {
    return { found: false, key, nodeIds: [], total: 0, truncated: false, unavailable: true, error: error || "unavailable" };
  }
  if (key === "") {
    return { found: false, key, nodeIds: [], total: 0, truncated: false, suggestions: [], stale: !!stale, staleReason: staleReason || null };
  }
  const ids = index.map[key];
  if (Array.isArray(ids)) {
    const total = (index.truncated && Number.isFinite(index.truncated[key])) ? index.truncated[key] : ids.length;
    return { found: true, key, nodeIds: ids, total, truncated: total > ids.length, stale: !!stale, staleReason: staleReason || null };
  }
  // Miss: offer basename suggestions. A slash-free query (a bare doc name) is
  // matched against the trailing segment of every key; a query with a slash is
  // matched as a suffix. Cheap string scan over keys (loaded once), capped.
  const limit = Number.isFinite(opts.suggestLimit) ? opts.suggestLimit : 8;
  const suggestions = [];
  const needle = key;
  for (const k of Object.keys(index.map)) {
    const base = k.includes("/") ? k.slice(k.lastIndexOf("/") + 1) : k;
    if (base === needle || k.endsWith(`/${needle}`) || (needle.includes("/") && k.endsWith(needle))) {
      suggestions.push(k);
      if (suggestions.length >= limit) break;
    }
  }
  return { found: false, key, nodeIds: [], total: 0, truncated: false, suggestions, stale: !!stale, staleReason: staleReason || null };
}

/**
 * Convenience: resolve a vault doc to its node ids AND hydrate them to full
 * NodeCards (vault → node → live card in one call). Lazy-imports node-card-read so
 * this module stays cheap when only ids are needed. Returns the backlink result
 * with an added `cards` array (empty on miss/unavailable).
 *
 * @param {string} query
 * @param {{indexPath?:string}} [opts]
 * @returns {Promise<object>} the backlinksFor result + { cards }
 */
export async function backlinksWithCards(query, opts = {}) {
  const res = backlinksFor(query, opts);
  if (!res.found || res.nodeIds.length === 0) return { ...res, cards: [] };
  try {
    const { readCards } = await import("./node-card-read.mjs");
    return { ...res, cards: readCards(res.nodeIds) };
  } catch (e) {
    return { ...res, cards: [], hydrateError: e.message };
  }
}
