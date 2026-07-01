/**
 * canvas-read-lib.mjs — cheap reader for the Obsidian system-map CANVAS.
 *
 * THE GAP (last populated-node gap in the cheap-node-access map): the vault holds
 * `knowledge/PRISM-System-Map.canvas` — a JSONCanvas SUMMARY of the PRISM
 * system-graph (the structural backbone: layer hubs + top-degree nodes per layer,
 * laid out for Obsidian's Canvas view), written by `generate-vault-graph.mjs` (the
 * graph→Obsidian direction, already wired into regen-viz post-merge). Every prior
 * vault node type has a free ≤200-token reach path; the `.canvas` did NOT — reading
 * it meant a full 146 KB Read (~40 K tokens) just to learn what's on the map.
 *
 * This reader makes the canvas cheap AND turns it into a THIRD join into the graph:
 * each canvas `file` node carries a vault `.file`, which `normalizeVaultKey`
 * canonicalizes to the SAME key space as `vault-backlinks.json` — so
 *   canvas node  →  vault file  →  (vault-backlinks)  →  live graph node id
 * is a complete cheap chain (then `node-card <id>` for the node's real state).
 *
 * FAIL-SOFT by design (mirrors vault-backlink-read): this reader may be called from
 * the CLI or a future pre-read hook, so a missing/torn canvas returns a structured
 * "unavailable" result and NEVER throws — the BUILDER (generate-vault-graph.mjs) is
 * the fail-loud half (R12 lives there). The 146 KB canvas is parsed ONCE per process
 * and cached; callers only ever see the tiny summary, never the file. The canvas is
 * small (a few hundred summary nodes) — a direct JSON.parse, NEVER the 644 MB graph.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeVaultKey } from "./vault-backlink-schema.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_CANVAS = path.join(ROOT, "knowledge", "PRISM-System-Map.canvas");
// Staleness reference: the canvas is regenerated FROM system-graph.json (post-merge
// in regen-viz). If the graph is now newer than the canvas, the summary has drifted.
const DEFAULT_GRAPH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");

/** Process-lifetime cache: { canvasPath -> {canvas|null, error|null, stale, staleReason} }. */
const _cache = new Map();

/** Test/maintenance hook — drop the cached canvas (e.g. after a regen in-process). */
export function clearCache() { _cache.clear(); }

/**
 * STALE iff the source graph the canvas summarizes is newer than the canvas itself.
 * No embedded build stamp (the file follows the Obsidian JSONCanvas spec — we don't
 * pollute it with custom top-level keys), so we compare file mtimes directly. Fail-
 * soft: any stat error, or a missing graph, → not-stale (never cry wolf, never block
 * a read on the freshness probe). Mirrors vault-backlink-read.computeStaleness.
 * Exported so callers/tests can probe drift with an explicit graph path.
 * @returns {{stale:boolean, staleReason:string|null}}
 */
export function computeStaleness(canvasPath, graphPath = DEFAULT_GRAPH) {
  try {
    if (!fs.existsSync(graphPath)) return { stale: false, staleReason: null };
    const canvasMs = Math.round(fs.statSync(canvasPath).mtimeMs);
    const graphMs = Math.round(fs.statSync(graphPath).mtimeMs);
    if (graphMs > canvasMs + 1000) { // 1s tolerance for fs mtime granularity / clock skew
      const ageMin = Math.round((graphMs - canvasMs) / 60000);
      return { stale: true, staleReason: `system-graph.json is ${ageMin}min newer than this canvas — rerun generate-vault-graph.mjs (or regen-viz)` };
    }
    return { stale: false, staleReason: null };
  } catch {
    return { stale: false, staleReason: null };
  }
}

/**
 * Load + cache the parsed canvas for a path. Returns
 * `{ canvas, error, stale, staleReason }` — `canvas` is null on any failure (missing
 * file / parse error / wrong shape) with `error` set to a short reason. `stale` flags
 * drift from the source graph. Never throws.
 */
export function loadCanvas(canvasPath = DEFAULT_CANVAS) {
  if (_cache.has(canvasPath)) return _cache.get(canvasPath);
  let result;
  try {
    if (!fs.existsSync(canvasPath)) {
      result = { canvas: null, error: `canvas not found at ${path.relative(ROOT, canvasPath).replace(/\\/g, "/")} — run: node scripts/generate-vault-graph.mjs`, stale: false, staleReason: null };
    } else {
      const raw = fs.readFileSync(canvasPath, "utf8");
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object" || !Array.isArray(obj.nodes)) {
        result = { canvas: null, error: "canvas malformed (no .nodes array)", stale: false, staleReason: null };
      } else {
        const { stale, staleReason } = computeStaleness(canvasPath);
        result = { canvas: obj, error: null, stale, staleReason };
      }
    }
  } catch (e) {
    result = { canvas: null, error: `canvas read failed: ${e.message}`, stale: false, staleReason: null };
  }
  _cache.set(canvasPath, result);
  return result;
}

/**
 * Extract the layer label for a canvas node from its id. The generator ids file
 * nodes `n<idx>-<layer>-<seq>` and headers `hdr-<layer>` (e.g. `n5-L0-5`, `hdr-L3`).
 * Returns the layer string (`L0`, `L4a`, `Lgit`, …) or null when the id doesn't
 * carry one (e.g. galaxy-cluster nodes added by extend-canvas-with-galaxy-clusters.mjs).
 * The generator's layer labels are `L` + digits (with an optional trailing letter,
 * e.g. `L4a`) OR the literal `Lgit` — both must match (an `L[0-9]+` regex would
 * silently miscount the git-commits layer as "other").
 */
const LAYER_PATTERN = "L(?:git|[0-9]+[a-z]?)";
function layerOfId(id) {
  if (typeof id !== "string") return null;
  let m = id.match(new RegExp(`^hdr-(${LAYER_PATTERN})$`, "i"));
  if (m) return m[1];
  m = id.match(new RegExp(`-(${LAYER_PATTERN})-`, "i"));
  if (m) return m[1];
  return null;
}

/** First non-empty line of a header text node, trimmed of leading markdown `#`. */
function headerLine(text) {
  if (typeof text !== "string") return "";
  const line = text.split("\n").map((s) => s.trim()).find((s) => s.length > 0) || "";
  return line.replace(/^#+\s*/, "");
}

/**
 * Compact structural summary of the canvas — counts, the authored layer headers,
 * and per-layer file groups (with a few sample basenames). Cheap: operates on the
 * already-parsed (cached) canvas, returns ~tens of lines of structured data the CLI
 * renders. Never the 146 KB raw.
 *
 * @param {string} [canvasPath]
 * @param {{samplesPerLayer?:number}} [opts]
 * @returns {{
 *   available:boolean, error?:string, stale:boolean, staleReason:string|null,
 *   counts:{nodes:number, file:number, text:number, other:number, edges:number},
 *   layers:Array<{layer:string, header:string, fileCount:number, samples:string[]}>
 * }}
 */
export function summarizeCanvas(canvasPath = DEFAULT_CANVAS, opts = {}) {
  const { canvas, error, stale, staleReason } = loadCanvas(canvasPath);
  const empty = { counts: { nodes: 0, file: 0, text: 0, other: 0, edges: 0 }, layers: [] };
  if (!canvas) {
    return { available: false, error: error || "unavailable", stale: false, staleReason: null, ...empty };
  }
  // guard against a negative/fractional caller value (slice(0,-1) would silently drop the last sample)
  const samplesPerLayer = Number.isFinite(opts.samplesPerLayer) && opts.samplesPerLayer >= 0 ? Math.trunc(opts.samplesPerLayer) : 3;
  const nodes = canvas.nodes;
  const edges = Array.isArray(canvas.edges) ? canvas.edges.length : 0;
  const counts = { nodes: nodes.length, file: 0, text: 0, other: 0, edges };
  // layer -> { header, files: string[] }
  const byLayer = new Map();
  const ensure = (l) => { if (!byLayer.has(l)) byLayer.set(l, { header: "", files: [] }); return byLayer.get(l); };
  for (const n of nodes) {
    const layer = layerOfId(n.id) || "other";
    if (n.type === "file") {
      counts.file++;
      if (typeof n.file === "string" && n.file) ensure(layer).files.push(n.file);
    } else if (n.type === "text") {
      counts.text++;
      // a `hdr-*` text node is the authored layer header; stash it on its layer
      if (typeof n.id === "string" && /^hdr-/i.test(n.id)) ensure(layer).header = headerLine(n.text);
    } else {
      counts.other++;
    }
  }
  // Order layers by the generator's structural sequence where known, else trailing.
  const ORDER = ["L0", "L1", "L2", "L3", "L4", "L4a", "Lgit", "L5", "L6", "L7", "L8", "L9", "L10", "L11", "other"];
  const layers = [...byLayer.entries()]
    .map(([layer, v]) => ({
      layer,
      header: v.header,
      fileCount: v.files.length,
      samples: v.files.slice(0, samplesPerLayer).map((f) => (f.includes("/") ? f.slice(f.lastIndexOf("/") + 1) : f)),
    }))
    .sort((a, b) => {
      const ia = ORDER.indexOf(a.layer), ib = ORDER.indexOf(b.layer);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib) || (a.layer < b.layer ? -1 : 1);
    });
  return { available: true, stale: !!stale, staleReason: staleReason || null, counts, layers };
}

/**
 * The deduped, sorted list of vault files the canvas curates (the backbone). Each is
 * a repo-relative vault path; join to vault-backlinks.json (via `doc-nodes`) to reach
 * the live graph node(s). Returns [] when unavailable (fail-soft).
 * @param {string} [canvasPath]
 * @returns {string[]}
 */
export function canvasFiles(canvasPath = DEFAULT_CANVAS) {
  const { canvas } = loadCanvas(canvasPath);
  if (!canvas) return [];
  const seen = new Set();
  for (const n of canvas.nodes) {
    if (n.type === "file" && typeof n.file === "string" && n.file) seen.add(n.file);
  }
  return [...seen].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * Which canvas node(s) reference a given vault doc — "is this doc on the system map,
 * and where?" The query (a wiki path / relativized path / memory slug) and each file
 * node's `.file` are both run through `normalizeVaultKey` so matching agrees with the
 * vault-backlinks key space — the canvas→graph join. On a miss, offers basename
 * suggestions (same shape as backlinksFor). Fail-soft.
 *
 * @param {string} query
 * @param {{canvasPath?:string, suggestLimit?:number}} [opts]
 * @returns {{
 *   found:boolean, key:string,
 *   nodes:Array<{id:string, layer:string, file:string}>, total:number,
 *   suggestions?:string[], unavailable?:boolean, error?:string,
 *   stale?:boolean, staleReason?:string|null
 * }}
 */
export function canvasNodesForDoc(query, opts = {}) {
  const key = normalizeVaultKey(query);
  const { canvas, error, stale, staleReason } = loadCanvas(opts.canvasPath || DEFAULT_CANVAS);
  if (!canvas) {
    return { found: false, key, nodes: [], total: 0, unavailable: true, error: error || "unavailable" };
  }
  if (key === "") {
    return { found: false, key, nodes: [], total: 0, suggestions: [], stale: !!stale, staleReason: staleReason || null };
  }
  const matches = [];
  const allKeys = []; // for suggestion fallback
  for (const n of canvas.nodes) {
    if (n.type !== "file" || typeof n.file !== "string" || !n.file) continue;
    const fkey = normalizeVaultKey(n.file);
    allKeys.push(fkey);
    if (fkey === key) matches.push({ id: n.id, layer: layerOfId(n.id) || "other", file: n.file });
  }
  if (matches.length) {
    return { found: true, key, nodes: matches, total: matches.length, stale: !!stale, staleReason: staleReason || null };
  }
  // Miss: basename-suffix suggestions over the canvas's own file keys (cheap, capped).
  const limit = Number.isFinite(opts.suggestLimit) ? opts.suggestLimit : 8;
  const needle = key;
  const suggestions = [];
  const sugSeen = new Set();
  for (const k of allKeys) {
    const base = k.includes("/") ? k.slice(k.lastIndexOf("/") + 1) : k;
    if ((base === needle || k.endsWith(`/${needle}`) || (needle.includes("/") && k.endsWith(needle))) && !sugSeen.has(k)) {
      sugSeen.add(k);
      suggestions.push(k);
      if (suggestions.length >= limit) break;
    }
  }
  return { found: false, key, nodes: [], total: 0, suggestions, stale: !!stale, staleReason: staleReason || null };
}
