/**
 * vault-backlink-schema.mjs — the REVERSE edge of CHEAP-NODE-ACCESS-MS0.
 *
 * THE PROBLEM (the missing half of the system-viz↔Obsidian synergy): a NodeCard
 * already carries `wikiEntries`/`memoryEntries` — the FORWARD edge "graph node →
 * the vault docs that document it" (51,540 cards carry wiki, 48,950 carry memory).
 * But the REVERSE is unmapped: an agent reading a wiki/memory doc has no cheap way
 * to find which live graph node(s) that doc documents — to then `node-card <id>`
 * the node's real status/wiring/edges. Grepping the 644MB graph (~186K tokens) or
 * the 160MB node-cards.jsonl is the only path today.
 *
 * This module is the pure key/record contract for the inverted index
 * `{ vaultKey: [nodeId, ...] }`, built by streaming the EXISTING node-cards.jsonl
 * (no 644MB graph read — we invert data already projected). One vault-doc lookup
 * then costs a single map hit (~tens of tokens) instead of a full-corpus scan.
 *
 * Pure module — no FS, no Date — so it imports safely from the builder, the
 * reader, the CLI, and any future pre-read hook, and is trivially testable.
 */

export const BACKLINK_SCHEMA_VERSION = "1.0.0";

// Max node ids carried per vault doc. A heavily-referenced doc (e.g. a doctrine
// memory cited by hundreds of nodes) must not balloon one record; we keep the
// first NODE_CAP (deterministically sorted) + the honest `total`, mirroring the
// node-card DOC_CAP philosophy. The agent reads the named nodes via `node-card`.
export const NODE_CAP = 50;

/**
 * Canonicalize a wiki path OR a memory slug to one stable lookup key. Applied to
 * BOTH the stored forward-edge entry (build time) and the query (read time) so
 * the two always agree. The two key spaces are naturally DISJOINT — wiki keys
 * retain a `/` after the prefix strip (`architecture/foo`), memory slugs are
 * slash-free snake_case (`feedback_x`) — so an un-namespaced map cannot collide.
 *
 * Transform (order matters):
 *   1. trim + backslash→slash
 *   2. strip a leading absolute repo root (`H:/prism/` or `H:\prism\`)
 *   3. strip a leading `knowledge/wiki/` or `knowledge/memories/<type>/` prefix
 *   4. strip a trailing `.md`
 *   5. lowercase
 * Returns "" for non-string / empty input (an empty key never indexes anything).
 *
 * @param {string} raw  a wiki path, a relativized wiki path, or a memory slug
 * @returns {string} the canonical lookup key
 */
export function normalizeVaultKey(raw) {
  if (typeof raw !== "string") return "";
  let k = raw.trim().replace(/\\/g, "/");
  if (k === "") return "";
  k = k.replace(/^[A-Za-z]:\/prism\//i, "");           // 2: repo root
  k = k.replace(/^knowledge\/wiki\//i, "");            // 3a: wiki prefix
  k = k.replace(/^knowledge\/memories\/[^/]+\//i, ""); // 3b: memory <type>/ prefix
  k = k.replace(/\.md$/i, "");                          // 4: .md suffix
  return k.toLowerCase();                               // 5: case-fold
}

/**
 * Deterministic node-id ordering — plain lexicographic so the index is stable
 * across rebuilds (no Date/hash) and a diff is meaningful.
 * @param {string[]} ids
 * @returns {string[]} a NEW sorted array (does not mutate input)
 */
export function sortNodeIds(ids) {
  return [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * Build one backlink record from a vault key + the raw node ids that reference
 * it. Dedupes, sorts deterministically, caps at NODE_CAP, and records the honest
 * pre-cap `total`. Returns null if the key normalizes empty or there are no ids
 * (an empty record would only add noise to the index).
 *
 * @param {string} key      a raw or pre-normalized vault key (re-normalized here)
 * @param {string[]} nodeIds the node ids that document `key`
 * @returns {{key:string, nodeIds:string[], total:number}|null}
 */
export function makeBacklinkRecord(key, nodeIds) {
  const k = normalizeVaultKey(key);
  if (k === "") return null;
  const seen = new Set();
  for (const id of Array.isArray(nodeIds) ? nodeIds : []) {
    if (typeof id === "string" && id.length > 0) seen.add(id);
  }
  if (seen.size === 0) return null;
  const sorted = sortNodeIds([...seen]);
  return { key: k, nodeIds: sorted.slice(0, NODE_CAP), total: sorted.length };
}

/**
 * Fail-loud validation (R12). A record MUST carry a non-empty string key, a
 * string[] nodeIds within the cap, and a finite total ≥ nodeIds.length. Throws on
 * violation; returns the record on success.
 * @param {*} rec
 */
export function assertBacklink(rec) {
  if (!rec || typeof rec !== "object" || Array.isArray(rec)) {
    throw new Error("vault-backlink: not an object");
  }
  if (typeof rec.key !== "string" || rec.key.length === 0) {
    throw new Error("vault-backlink: non-empty string key required");
  }
  if (!Array.isArray(rec.nodeIds) || rec.nodeIds.some((x) => typeof x !== "string" || !x)) {
    throw new Error(`vault-backlink ${rec.key}: nodeIds must be a non-empty-string array`);
  }
  if (rec.nodeIds.length > NODE_CAP) {
    throw new Error(`vault-backlink ${rec.key}: nodeIds exceeds NODE_CAP (${rec.nodeIds.length} > ${NODE_CAP})`);
  }
  if (!Number.isFinite(rec.total) || rec.total < rec.nodeIds.length) {
    throw new Error(`vault-backlink ${rec.key}: total must be finite and ≥ nodeIds.length`);
  }
  return rec;
}
