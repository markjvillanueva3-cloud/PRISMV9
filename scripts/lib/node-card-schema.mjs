/**
 * node-card-schema.mjs — the compact "node card" record shape for token-cheap
 * node reads (CHEAP-NODE-ACCESS-MS0, slot:sierra).
 *
 * THE PROBLEM: status-quo "find + read a node" loads the 644MB system-graph.json
 * to extract one node — ~186K tokens per access. A NodeCard is the minimal record
 * that lets an agent IDENTIFY + LOCATE a node (and route to its source doc) WITHOUT
 * the full-graph load — ~200 tokens. Cards are projected from the already-fresh
 * find-cache.json (id/label/layer/subgroup/info/noteCount) and enriched from
 * node-capability-index.json (kind/wikiPath/pointerPath). No new heavy build.
 *
 * Pure module — no FS, no Date — so it is trivially testable and safe to import
 * from the reader, the CLI, a dispatcher action, or a pre-read hook.
 */

export const CARD_SCHEMA_VERSION = "1.0.0";

// Canonical compact node-card field set. Extend deliberately; every new field
// must be cheap to project (no full-graph-only field like `edges`/`molecules`).
export const CARD_FIELDS = Object.freeze([
  "id", "label", "layer", "kind", "status", "info", "noteCount",
  "wikiPath", "pointerPath", "wikiEntries", "memoryEntries", "docTotals",
]);

// Max documenting-doc pointers carried inline per card. The whole point is a
// CHEAP read — a richly-documented node (e.g. eng.mill has dozens of wiki docs)
// must not balloon the card. We carry the top-K + a total count (docTotals) so
// the truncation is honest, and the agent routes to the named docs to "read" the
// node without grep.
export const DOC_CAP = 8;

/**
 * Strip a LEADING absolute repo-root prefix so doc pointers stay short in the
 * card. Anchored to the start only (`H:/prism/...` or `H:\prism\...`) so a
 * genuinely-relative path that merely contains `knowledge/` mid-path is left
 * verbatim (no mis-rooting). Non-repo absolute paths pass through unchanged.
 */
export function relDocPath(p) {
  if (typeof p !== "string") return p;
  return p.replace(/\\/g, "/").replace(/^[A-Za-z]:\/prism\//i, "");
}

/**
 * Derive the node "kind" from its id namespace prefix (the segment before the
 * first dot): `eng.mill` -> `eng`, `memory_patterns.x_synthesis` -> `memory_patterns`,
 * `ghost.galaxy.mill` -> `ghost`. This is the 51-prefix namespace the graph uses,
 * so it is a meaningful, always-available kind even when the capability index has
 * no richer label. Returns `null` for an id with no dot.
 */
export function kindFromId(id) {
  if (typeof id !== "string" || id.length === 0) return null;
  const dot = id.indexOf(".");
  return dot > 0 ? id.slice(0, dot) : null;
}

/**
 * Project a compact NodeCard from a raw projection node + an optional
 * capability-index pointer. Handles BOTH compact-index record shapes:
 *   - find-cache:        { id, label, layer, subgroup, info, noteCount }
 *   - system-graph-index:{ id, label, layer, status, info, knowledge:{wikiEntries,memoryEntries} }
 * Returns null if `rawNode` has no id. The `knowledge.wikiEntries/memoryEntries`
 * (top-DOC_CAP) are the documenting docs an agent reads next; `capPtr` supplies a
 * single canonical `kind`/`wikiPath`/`pointerPath` when the node is a capability.
 */
export function makeCard(rawNode, capPtr) {
  if (!rawNode || typeof rawNode !== "object" || typeof rawNode.id !== "string" || !rawNode.id) {
    return null;
  }
  const k = rawNode.knowledge && typeof rawNode.knowledge === "object" ? rawNode.knowledge : null;
  const wikiAll = Array.isArray(k?.wikiEntries) ? k.wikiEntries : [];
  const memAll = Array.isArray(k?.memoryEntries) ? k.memoryEntries : [];
  const card = {
    id: rawNode.id,
    label: typeof rawNode.label === "string" ? rawNode.label : (capPtr?.displayName ?? ""),
    layer: typeof rawNode.layer === "string" ? rawNode.layer : null,
    // prefer the capability index's explicit kind; fall back to the id-prefix
    // namespace (always available) so kind is never empty for a real node.
    kind: (capPtr && typeof capPtr.kind === "string" && capPtr.kind) || kindFromId(rawNode.id),
    // `status` (system-graph-index: built/stub) OR `subgroup` (find-cache:
    // wired/unwired) — one categorical state tag, from whichever source supplied it.
    status: typeof rawNode.status === "string" ? rawNode.status
          : (typeof rawNode.subgroup === "string" ? rawNode.subgroup : null),
    info: typeof rawNode.info === "string" ? rawNode.info : "",
    noteCount: Number.isFinite(rawNode.noteCount) ? rawNode.noteCount : (wikiAll.length + memAll.length),
  };
  if (capPtr && typeof capPtr.wikiPath === "string" && capPtr.wikiPath) card.wikiPath = capPtr.wikiPath;
  if (capPtr && typeof capPtr.pointerPath === "string" && capPtr.pointerPath) card.pointerPath = capPtr.pointerPath;
  if (wikiAll.length) card.wikiEntries = wikiAll.slice(0, DOC_CAP).map(relDocPath);
  if (memAll.length) card.memoryEntries = memAll.slice(0, DOC_CAP);
  if (wikiAll.length > DOC_CAP || memAll.length > DOC_CAP) {
    card.docTotals = { wiki: wikiAll.length, memory: memAll.length };
  }
  return card;
}

/**
 * Fail-loud validation. A card MUST carry a non-empty string id, a string label,
 * and a string-or-null layer. Throws on violation; returns the card on success.
 */
export function assertCard(card) {
  if (!card || typeof card !== "object" || Array.isArray(card)) {
    throw new Error("node-card: not an object");
  }
  if (typeof card.id !== "string" || card.id.length === 0) {
    throw new Error("node-card: non-empty string id required");
  }
  if (typeof card.label !== "string") {
    throw new Error(`node-card ${card.id}: label must be a string`);
  }
  if (card.layer != null && typeof card.layer !== "string") {
    throw new Error(`node-card ${card.id}: layer must be a string or null`);
  }
  return card;
}
