/**
 * MasterIndexEngine — Unified Master Search Across Obsidian Vault + System-Viz + Awareness
 *
 * Goal: ONE query call replaces N Grep/Glob/Agent calls. Future Claude/Codex
 * sessions hit `prism_session:master_index_query` first; only fall back to
 * filesystem search when this returns no high-confidence hits.
 *
 * Fuses 4 pre-built indexes (no parallel infra — all sources already exist):
 *   1. system-graph.json (110K nodes / 114K edges, 11 layers).
 *      Each node already carries pre-joined `knowledge.wikiEntries[]` +
 *      `knowledge.memoryEntries[]` from system-viz-obsidian-bridge-v2.mjs.
 *   2. PRISMSelfAwarenessEngine.findCapabilities — fuzzy match across
 *      engines / actions / hooks / skills with confidence scoring.
 *   3. BUILD_STATE.json — built / unwired / pending / frontend classification
 *      so every hit is labelled with its lifecycle stage.
 *   4. Graph edge in-degree → utilization score [0,1]. Lets the caller see
 *      "is this node being fully utilized?" without a separate trace.
 *
 * Caching: graph + BUILD_STATE are mtime-cached. Inverted index is built lazily
 * on first query against the cached graph and rebuilt only when the graph
 * mtime changes. Concurrent first-call requests share a single build promise.
 *
 * @module engines/MasterIndexEngine
 * @version 1.0.0
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";
import { prismSelfAwarenessEngine } from "./PRISMSelfAwarenessEngine.js";

// ============================================================================
// PATHS
// ============================================================================

const PRISM_ROOT = "H:/prism";
const GRAPH_PATH = path.join(PRISM_ROOT, "state/shared/system-viz/system-graph.json");
const BUILD_STATE_PATH = path.join(PRISM_ROOT, "state/shared/BUILD_STATE.json");
const KNOWLEDGE_DIR = path.join(PRISM_ROOT, "knowledge");

// ============================================================================
// CONSTANTS — tuning knobs, never inline magic numbers in algorithms
// ============================================================================

/** Minimum token length kept after tokenization (drop 1-3 letter noise). */
const MIN_TOKEN_LEN = 3;
/** Maximum tokens consumed per query (cap to avoid pathological prompts). */
const MAX_QUERY_TOKENS = 12;
/** Maximum query string length accepted (caps DoS surface). */
const MAX_QUERY_LEN = 500;
/** Default hit limit returned to callers. */
const DEFAULT_LIMIT = 20;
/** Maximum hit limit (bound to keep response payload bounded). */
const MAX_LIMIT = 200;
/** Term-in-label score weight (matches in node label / engine name). */
const W_LABEL = 3.0;
/** Term-in-info-or-description score weight. */
const W_INFO = 1.5;
/** Term-in-id score weight. */
const W_ID = 2.0;
/** Term-in-wiki-entry score weight (already pre-joined to node). */
const W_WIKI = 1.0;
/** Term-in-memory-entry score weight. */
const W_MEM = 1.0;
/**
 * Final-score blend exponent: >1 amplifies utilization (heavily-used nodes
 * get a bigger boost). Was 0.25 in v1.0.0 which flattened the curve — that
 * was the inverse of the documented intent.
 */
const UTIL_BIAS = 1.5;
/** Floor multiplier for low-utilization hits so orphans still surface. */
const UTIL_FLOOR = 0.4;
/**
 * Soft timeout for the wrapped capability search. Findings hang here would
 * stall every UserPromptSubmit-injected master_index_query call.
 */
const CAPABILITY_SEARCH_TIMEOUT_MS = 800;
/**
 * Windows can return EBUSY mid-rename when the generator is rewriting the
 * graph file. One retry with a short backoff covers that window.
 */
const GRAPH_READ_RETRY_DELAY_MS = 75;

/**
 * Utilization-class thresholds. A node is HIGH-degree if its degree count
 * is >= the documented graph-wide percentile. Computed dynamically per
 * graph load; constants below are the documented percentile boundaries.
 *
 * Defaults chosen so the long tail of a typical PRISM graph (most nodes
 * have ≤2 in-edges and ≤2 out-edges) sits in 'normal' or 'ghost', while
 * the visible hubs (dispatchers, registries) get 'hub'/'sink' labels.
 */
const HIGH_DEGREE_PCTILE = 0.85;
const LOW_DEGREE_THRESHOLD = 1;
/** Cap on rows returned in dashboard top-K lists. */
const DASHBOARD_TOP_K = 25;
/** Stopwords stripped from queries (English noise + PRISM-meta noise). */
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "has", "have", "in", "is", "it", "its", "of", "on", "or", "the",
  "to", "was", "were", "with", "this", "that", "these", "those",
  "engine", "engines", "feature", "features", "system", "systems",
  "node", "label", "info", "wiki", "memory", "prism",
]);

// ============================================================================
// TYPES
// ============================================================================

/** Raw graph node — narrow projection of system-graph.json node shape. */
interface GraphNode {
  id: string;
  layer?: string;
  subgroup?: string;
  label?: string;
  info?: string;
  status?: string;
  size?: number;
  tier?: number;
  knowledge?: {
    wikiEntries?: Array<{ name?: string; path?: string } | string>;
    memoryEntries?: Array<{ name?: string; path?: string } | string>;
  };
}

/** Raw graph edge — narrow projection of system-graph.json edge shape. */
interface GraphEdge {
  from: string;
  to: string;
  type?: string;
  intensity?: number;
}

/** Cached graph (lazy-loaded, mtime-keyed). */
interface CachedGraph {
  mtimeMs: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Map nodeId → in-degree edge count. */
  inDegree: Map<string, number>;
  /** Map nodeId → out-degree edge count. */
  outDegree: Map<string, number>;
  /** Maximum in-degree across the graph (for [0,1] normalization). */
  maxInDegree: number;
  /** Inverted index: token → Set<nodeId>. */
  invertedIndex: Map<string, Set<string>>;
  /** nodeId → GraphNode lookup. */
  nodeById: Map<string, GraphNode>;
}

/** Cached BUILD_STATE projection (just the fields we use). */
interface CachedBuildState {
  mtimeMs: number;
  /** Lower-cased engine names known to be unwired. */
  unwiredEngines: Set<string>;
  /** Lower-cased pending unit IDs. */
  pendingUnits: Set<string>;
  /** Headline summary string. */
  headlineSummary: string;
}

/** A single ranked hit returned to callers. */
export interface MasterIndexHit {
  /** Where the hit came from. */
  source:
    | "graph_node"
    | "engine"
    | "action"
    | "hook"
    | "skill"
    | "wiki"
    | "memory";
  /** Stable identifier (graph node id, engine name, action `disp:act`, etc). */
  id: string;
  /** Display label. */
  label: string;
  /** File path or location, if known. */
  path?: string;
  /** Graph layer (L0..L10), if from graph. */
  layer?: string;
  /** Lifecycle status from graph (e.g., 'built', 'unwired', 'pending_merge'). */
  status?: string;
  /** Short description (1-line). */
  description?: string;
  /** [0,1] match relevance. */
  confidence: number;
  /** [0,1] utilization (log-normalized in-degree). */
  utilization: number;
  /** BUILD_STATE classification. */
  buildClass: "wired" | "unwired" | "pending" | "frontend" | "unknown";
  /** Pre-joined wiki entry names (Obsidian links). */
  wikiEntries?: string[];
  /** Pre-joined memory entry names. */
  memoryEntries?: string[];
  /** `dispatcher:action` if the hit is an MCP action — caller can invoke it. */
  fullAction?: string;
}

/** Query options. */
export interface MasterIndexQueryOptions {
  /** Cap returned hits (default DEFAULT_LIMIT, max MAX_LIMIT). */
  limit?: number;
  /** Restrict to specific layers (e.g., ['L4', 'L5']). */
  layers?: string[];
  /** Restrict to specific sources (e.g., ['engine', 'graph_node']). */
  sources?: Array<MasterIndexHit["source"]>;
  /** Drop hits below this utilization (0..1). */
  minUtilization?: number;
  /** Drop hits below this confidence (0..1). */
  minConfidence?: number;
  /** Drop hits whose buildClass is not in this set. */
  buildClasses?: Array<MasterIndexHit["buildClass"]>;
}

/** Full query result. */
export interface MasterIndexResult {
  query: string;
  totalHits: number;
  hits: MasterIndexHit[];
  bySource: Record<string, number>;
  byBuildClass: Record<string, number>;
  topUtilized: MasterIndexHit[];
  underUtilized: MasterIndexHit[];
  generatedAt: string;
  cacheHit: boolean;
  graphMtime: string | null;
  warnings: string[];
}

/** Single-node status lookup result. */
export interface NodeStatus {
  id: string;
  found: boolean;
  node?: MasterIndexHit;
  inDegree?: number;
  outDegree?: number;
  utilization?: number;
}

/**
 * Utilization classification per node. Answers the user-stated question:
 *   "how to determine whether a node is being fully utilized?"
 *
 *   - hub:     high in + high out  — central infrastructure
 *   - sink:    high in + low out   — terminal consumer (well-used utility)
 *   - source:  low in  + high out  — driver / orchestrator
 *   - orphan:  low in  + low out  + has docs   — built but unwired
 *   - ghost:   low in  + low out  + no docs    — dead code candidate
 *   - normal:  everything else
 */
export type UtilizationClass =
  | "hub"
  | "sink"
  | "source"
  | "orphan"
  | "ghost"
  | "normal";

export interface UtilizationDashboard {
  totals: {
    nodesScanned: number;
    hubs: number;
    sinks: number;
    sources: number;
    orphans: number;
    ghosts: number;
    normal: number;
  };
  byLayer: Record<string, Record<UtilizationClass, number>>;
  topHubs: Array<NodeUtilizationRow>;       // top by in+out degree sum
  topOrphans: Array<NodeUtilizationRow>;    // built-but-unwired candidates
  topGhosts: Array<NodeUtilizationRow>;     // dead-code candidates
  generatedAt: string;
  graphMtime: string | null;
  warnings: string[];
}

export interface NodeUtilizationRow {
  id: string;
  label: string;
  layer?: string;
  status?: string;
  inDegree: number;
  outDegree: number;
  utilization: number;
  class: UtilizationClass;
  hasDocs: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Safe JSON read; returns null and logs on failure rather than throwing.
 * Engines never throw on I/O — callers get a structured absent result.
 */
function safeReadJson<T>(p: string): T | null {
  try {
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf8")) as T;
  } catch (err) {
    log.warn(`[MasterIndexEngine] Failed to read ${p}: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Tokenize: lowercase, drop non-letter/non-digit, drop short + stopwords,
 * cap count. Unicode-aware (`\p{L}\p{N}`) so non-ASCII identifiers in graph
 * info / wiki entry names survive. Truncation backsteps to a whitespace
 * boundary so a long query can't lose its final token mid-word.
 */
function tokenize(text: string): string[] {
  if (!text || typeof text !== "string") return [];
  let trimmed = text;
  if (text.length > MAX_QUERY_LEN) {
    trimmed = text.slice(0, MAX_QUERY_LEN).replace(/\S+$/u, "");
  }
  const cleaned = trimmed
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\s]/gu, " ")
    .trim();
  if (!cleaned) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tok of cleaned.split(/\s+/)) {
    if (tok.length < MIN_TOKEN_LEN) continue;
    if (STOPWORDS.has(tok)) continue;
    if (seen.has(tok)) continue;
    seen.add(tok);
    out.push(tok);
    if (out.length >= MAX_QUERY_TOKENS) break;
  }
  return out;
}

/**
 * Coerce a wiki/memory entry (string OR object) to a display name. Defensive
 * against Proxies / odd toString throws — engines never throw on input shape.
 */
function entryName(entry: unknown): string {
  try {
    if (typeof entry === "string") return entry;
    if (entry && typeof entry === "object") {
      const obj = entry as { name?: unknown; path?: unknown };
      if (typeof obj.name === "string") return obj.name;
      if (typeof obj.path === "string") return obj.path;
    }
  } catch {
    /* fall through to empty */
  }
  return "";
}

/**
 * Promise-with-timeout helper. Returns `fallback` if `p` doesn't settle
 * within `ms`. Used to wrap the capability search so a hung child engine
 * never stalls the master query.
 */
async function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race<T>([
      p,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Normalize utilization: log-scaled in-degree mapped to [0,1].
 * Uses log because real degree distributions are heavy-tailed; raw counts
 * make 1 hub dominate everything. Returns 0 when maxInDegree=0 (empty graph).
 */
function normalizeUtilization(inDegree: number, maxInDegree: number): number {
  if (!Number.isFinite(inDegree) || inDegree <= 0) return 0;
  if (!Number.isFinite(maxInDegree) || maxInDegree <= 0) return 0;
  const u = Math.log1p(inDegree) / Math.log1p(maxInDegree);
  if (!Number.isFinite(u)) return 0;
  return Math.max(0, Math.min(1, u));
}

/** Map graph node.status → BUILD_STATE buildClass. */
function classifyBuildClass(
  status: string | undefined,
  id: string,
  unwiredEngines: Set<string>,
): MasterIndexHit["buildClass"] {
  const s = (status || "").toLowerCase();
  if (s === "pending_merge" || s === "frontend_pending") return "frontend";
  if (s === "pending" || s === "needs_building") return "pending";
  if (s === "unwired" || unwiredEngines.has(id.toLowerCase())) return "unwired";
  if (s === "built" || s === "wired" || s === "active") return "wired";
  return "unknown";
}

// ============================================================================
// ENGINE
// ============================================================================

class MasterIndexEngine {
  private graphCache: CachedGraph | null = null;
  private buildStateCache: CachedBuildState | null = null;
  /** Single-flight latch — concurrent first-call requests share one build. */
  private graphLoadPromise: Promise<CachedGraph | null> | null = null;

  // -------------------------------------------------------------------------
  // Cache management
  // -------------------------------------------------------------------------

  /** Drop all caches (used by tests + on demand). */
  public clearCache(): void {
    this.graphCache = null;
    this.buildStateCache = null;
    this.graphLoadPromise = null;
  }

  /**
   * Load + index the graph; mtime-cached, single-flight.
   *
   * Race-safe: re-stats after the in-flight build resolves and discards the
   * result if the file changed during the build. Concurrent first callers
   * share a single buildGraphCache invocation via `graphLoadPromise`.
   */
  private async getGraph(): Promise<CachedGraph | null> {
    let stat: fs.Stats | null = null;
    try {
      stat = fs.statSync(GRAPH_PATH);
    } catch {
      return null;
    }
    if (this.graphCache && this.graphCache.mtimeMs === stat.mtimeMs) {
      return this.graphCache;
    }
    if (this.graphLoadPromise) return this.graphLoadPromise;
    const targetMtime = stat.mtimeMs;
    this.graphLoadPromise = this.buildGraphCache(targetMtime);
    try {
      const result = await this.graphLoadPromise;
      // Re-check file mtime; if generator wrote a fresh graph during our
      // build, drop our stale result and let the next call re-load.
      let freshStat: fs.Stats | null = null;
      try { freshStat = fs.statSync(GRAPH_PATH); } catch { freshStat = null; }
      if (result && freshStat && freshStat.mtimeMs !== targetMtime) {
        this.graphCache = null;
        return result; // return what we read; next call will re-stat + reload
      }
      this.graphCache = result;
      return result;
    } finally {
      this.graphLoadPromise = null;
    }
  }

  /**
   * Build the cached graph + inverted index from disk.
   *
   * Inverted index covers id + label + info **plus pre-joined wiki and
   * memory entry names**. Without the wiki/memory tokens, a node whose only
   * matching evidence is in `knowledge.wikiEntries[].name` would never
   * appear in the candidate set even though the per-node scorer awards
   * points for those fields.
   *
   * Read is wrapped in a one-shot retry to tolerate Windows EBUSY when the
   * generator script is mid-rename.
   */
  private async buildGraphCache(mtimeMs: number): Promise<CachedGraph | null> {
    const tryRead = (): { nodes?: GraphNode[]; edges?: GraphEdge[] } | null =>
      safeReadJson<{ nodes?: GraphNode[]; edges?: GraphEdge[] }>(GRAPH_PATH);
    let raw = tryRead();
    if (!raw || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) {
      await new Promise((r) => setTimeout(r, GRAPH_READ_RETRY_DELAY_MS));
      raw = tryRead();
    }
    if (!raw || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) {
      log.warn(`[MasterIndexEngine] system-graph.json missing or malformed at ${GRAPH_PATH}`);
      return null;
    }
    const nodes = raw.nodes;
    const edges = raw.edges;

    // Edge degree counts.
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    let maxInDegree = 0;
    for (const e of edges) {
      if (!e || typeof e.to !== "string" || typeof e.from !== "string") continue;
      const inN = (inDegree.get(e.to) ?? 0) + 1;
      inDegree.set(e.to, inN);
      if (inN > maxInDegree) maxInDegree = inN;
      outDegree.set(e.from, (outDegree.get(e.from) ?? 0) + 1);
    }

    // Inverted index over node id + label + info + pre-joined wiki/memory
    // entry names. Without the wiki/memory tokens, P1-2 in v1.0.0 review
    // would leave nodes that only matched on Obsidian metadata invisible.
    const invertedIndex = new Map<string, Set<string>>();
    const nodeById = new Map<string, GraphNode>();
    for (const n of nodes) {
      if (!n || typeof n.id !== "string") continue;
      nodeById.set(n.id, n);
      const wikiNames = (n.knowledge?.wikiEntries ?? []).map(entryName).join(" ");
      const memNames = (n.knowledge?.memoryEntries ?? []).map(entryName).join(" ");
      const blob = `${n.id} ${n.label ?? ""} ${n.info ?? ""} ${wikiNames} ${memNames}`;
      for (const tok of tokenize(blob)) {
        let bucket = invertedIndex.get(tok);
        if (!bucket) {
          bucket = new Set<string>();
          invertedIndex.set(tok, bucket);
        }
        bucket.add(n.id);
      }
    }

    return {
      mtimeMs,
      nodes,
      edges,
      inDegree,
      outDegree,
      maxInDegree,
      invertedIndex,
      nodeById,
    };
  }

  /** Load + cache BUILD_STATE projection (mtime-keyed). */
  private getBuildState(): CachedBuildState | null {
    let stat: fs.Stats | null = null;
    try {
      stat = fs.statSync(BUILD_STATE_PATH);
    } catch {
      return null;
    }
    if (this.buildStateCache && this.buildStateCache.mtimeMs === stat.mtimeMs) {
      return this.buildStateCache;
    }
    const raw = safeReadJson<{
      headline?: { built_engines?: number };
      NEEDS_WIRING?: { sample_engines?: string[]; top_domains?: string[] };
      NEEDS_BUILDING?: { top_pending_units?: string[] };
    }>(BUILD_STATE_PATH);
    if (!raw) return null;

    const unwired = new Set<string>();
    for (const name of raw.NEEDS_WIRING?.sample_engines ?? []) {
      if (typeof name === "string") unwired.add(name.toLowerCase());
    }
    const pending = new Set<string>();
    for (const u of raw.NEEDS_BUILDING?.top_pending_units ?? []) {
      if (typeof u === "string") pending.add(u.toLowerCase());
    }

    this.buildStateCache = {
      mtimeMs: stat.mtimeMs,
      unwiredEngines: unwired,
      pendingUnits: pending,
      headlineSummary: `${raw.headline?.built_engines ?? "?"} engines built`,
    };
    return this.buildStateCache;
  }

  // -------------------------------------------------------------------------
  // Public: query
  // -------------------------------------------------------------------------

  /**
   * Run a unified query across graph + capability index + BUILD_STATE.
   *
   * @param query  natural-language search text (max MAX_QUERY_LEN chars)
   * @param opts   filter / limit options (see MasterIndexQueryOptions)
   * @returns      ranked hits with provenance, utilization, buildClass
   */
  public async query(
    query: string,
    opts: MasterIndexQueryOptions = {},
  ): Promise<MasterIndexResult> {
    const generatedAt = new Date().toISOString();
    const warnings: string[] = [];
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.isFinite(opts.limit) ? Number(opts.limit) : DEFAULT_LIMIT),
    );
    const tokens = tokenize(query ?? "");

    // Empty query → empty structured result. Never throw.
    if (tokens.length === 0) {
      return this.emptyResult(query ?? "", generatedAt, [
        "query produced no tokens after stopword/length filtering",
      ]);
    }

    const wasCached =
      !!this.graphCache &&
      (() => {
        try {
          return fs.statSync(GRAPH_PATH).mtimeMs === this.graphCache!.mtimeMs;
        } catch {
          return false;
        }
      })();
    const graph = await this.getGraph();
    if (!graph) {
      warnings.push("system-graph.json unavailable; falling back to capability index only");
    }
    const buildState = this.getBuildState();
    if (!buildState) warnings.push("BUILD_STATE.json unavailable; buildClass annotations missing");

    const unwiredSet = buildState?.unwiredEngines ?? new Set<string>();
    const allowedSources = opts.sources && opts.sources.length > 0
      ? new Set<MasterIndexHit["source"]>(opts.sources)
      : null;
    const allowedLayers = opts.layers && opts.layers.length > 0
      ? new Set<string>(opts.layers)
      : null;
    const allowedClasses = opts.buildClasses && opts.buildClasses.length > 0
      ? new Set<MasterIndexHit["buildClass"]>(opts.buildClasses)
      : null;

    const hits: MasterIndexHit[] = [];

    // ----- Source 1: graph nodes via inverted index + scoring -----
    if (graph && (!allowedSources || allowedSources.has("graph_node"))) {
      const candidates = new Map<string, number>(); // nodeId → raw score
      for (const tok of tokens) {
        const bucket = graph.invertedIndex.get(tok);
        if (!bucket) continue;
        for (const nodeId of bucket) {
          const node = graph.nodeById.get(nodeId);
          if (!node) continue;
          // Layer filter applied here so we don't pay for filtered candidates.
          if (allowedLayers && (!node.layer || !allowedLayers.has(node.layer))) continue;
          const idLower = node.id.toLowerCase();
          const labelLower = (node.label ?? "").toLowerCase();
          const infoLower = (node.info ?? "").toLowerCase();
          const wikiBlob = (node.knowledge?.wikiEntries ?? [])
            .map(entryName)
            .join(" ")
            .toLowerCase();
          const memBlob = (node.knowledge?.memoryEntries ?? [])
            .map(entryName)
            .join(" ")
            .toLowerCase();
          let s = 0;
          if (labelLower.includes(tok)) s += W_LABEL;
          if (idLower.includes(tok)) s += W_ID;
          if (infoLower.includes(tok)) s += W_INFO;
          if (wikiBlob.includes(tok)) s += W_WIKI;
          if (memBlob.includes(tok)) s += W_MEM;
          if (s > 0) candidates.set(nodeId, (candidates.get(nodeId) ?? 0) + s);
        }
      }
      const maxPossible = tokens.length * (W_LABEL + W_ID + W_INFO + W_WIKI + W_MEM);
      for (const [nodeId, raw] of candidates.entries()) {
        const node = graph.nodeById.get(nodeId);
        if (!node) continue;
        const inDeg = graph.inDegree.get(nodeId) ?? 0;
        const utilization = normalizeUtilization(inDeg, graph.maxInDegree);
        const confidence = Math.max(0, Math.min(1, raw / Math.max(1, maxPossible)));
        const buildClass = classifyBuildClass(node.status, node.id, unwiredSet);
        if (allowedClasses && !allowedClasses.has(buildClass)) continue;
        if (typeof opts.minUtilization === "number" && utilization < opts.minUtilization) continue;
        if (typeof opts.minConfidence === "number" && confidence < opts.minConfidence) continue;
        hits.push({
          source: "graph_node",
          id: node.id,
          label: (node.label ?? node.id).split("\n")[0].slice(0, 120),
          layer: node.layer,
          status: node.status,
          description: node.info,
          confidence,
          utilization,
          buildClass,
          wikiEntries: (node.knowledge?.wikiEntries ?? [])
            .map(entryName)
            .filter((s) => s.length > 0)
            .slice(0, 8),
          memoryEntries: (node.knowledge?.memoryEntries ?? [])
            .map(entryName)
            .filter((s) => s.length > 0)
            .slice(0, 6),
        });
      }
    }

    // ----- Source 2: PRISMSelfAwarenessEngine fuzzy capability match -----
    // Wraps existing engine; we never duplicate its scoring logic.
    // Wrapped in a soft timeout so a hung child engine can't stall every
    // master_index_query call (this is hot-path under the pre-search hook).
    let caps: Awaited<ReturnType<typeof prismSelfAwarenessEngine.findCapabilities>> = [];
    try {
      caps = await withTimeout(
        prismSelfAwarenessEngine.findCapabilities(query ?? ""),
        CAPABILITY_SEARCH_TIMEOUT_MS,
        [],
      );
      if (caps.length === 0) {
        // Empty result is legitimate; only warn if we strongly suspect timeout
        // (i.e. graph hits exist but capabilities returned nothing).
        if (hits.length > 0) {
          warnings.push(
            `capability search returned 0 hits in ${CAPABILITY_SEARCH_TIMEOUT_MS}ms (possible timeout)`,
          );
        }
      }
    } catch (err) {
      warnings.push(`PRISMSelfAwarenessEngine.findCapabilities failed: ${(err as Error).message}`);
    }
    for (const c of caps) {
      const source: MasterIndexHit["source"] = c.action
        ? "action"
        : c.engine
          ? "engine"
          : c.path && c.path.includes("/hooks/")
            ? "hook"
            : "skill";
      if (allowedSources && !allowedSources.has(source)) continue;
      const id = c.action && c.dispatcher
        ? `${c.dispatcher}:${c.action}`
        : (c.engine ?? c.capability);
      const buildClass = classifyBuildClass(undefined, id, unwiredSet);
      if (allowedClasses && !allowedClasses.has(buildClass)) continue;
      // Capability hits don't have edge utilization — surface 0 (caller can
      // sort by confidence alone if utilization isn't relevant for skills).
      const utilization = 0;
      if (typeof opts.minUtilization === "number" && utilization < opts.minUtilization) continue;
      if (typeof opts.minConfidence === "number" && c.confidence < opts.minConfidence) continue;
      hits.push({
        source,
        id,
        label: c.capability,
        path: c.path,
        confidence: c.confidence,
        utilization,
        buildClass,
        fullAction: c.action && c.dispatcher ? `${c.dispatcher}:${c.action}` : undefined,
      });
    }

    // ----- Score blending: confidence × max(UTIL_FLOOR, utilization^UTIL_BIAS) -----
    // Bias toward used things but never zero out an orphan that strictly
    // matches the query (UTIL_FLOOR enforces minimum visibility).
    for (const h of hits) {
      const utilFactor = Math.max(UTIL_FLOOR, Math.pow(h.utilization, UTIL_BIAS));
      h.confidence = Math.max(0, Math.min(1, h.confidence * utilFactor));
    }
    hits.sort((a, b) => b.confidence - a.confidence);

    // ----- Aggregations + final cap -----
    const bySource: Record<string, number> = {};
    const byBuildClass: Record<string, number> = {};
    for (const h of hits) {
      bySource[h.source] = (bySource[h.source] ?? 0) + 1;
      byBuildClass[h.buildClass] = (byBuildClass[h.buildClass] ?? 0) + 1;
    }
    const topUtilized = [...hits]
      .filter((h) => h.utilization > 0)
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, 5);
    const underUtilized = hits
      .filter((h) => h.source === "graph_node" && h.utilization < 0.1)
      .slice(0, 5);

    return {
      query: query ?? "",
      totalHits: hits.length,
      hits: hits.slice(0, limit),
      bySource,
      byBuildClass,
      topUtilized,
      underUtilized,
      generatedAt,
      // True only when the graph was already cached at the same mtime BEFORE
      // this query — a fresh load does not count as a hit.
      cacheHit: wasCached,
      graphMtime: graph ? new Date(graph.mtimeMs).toISOString() : null,
      warnings,
    };
  }

  // -------------------------------------------------------------------------
  // Public: single-node status / utilization
  // -------------------------------------------------------------------------

  /**
   * Look up a single node by exact ID. Returns its hit projection plus
   * raw in/out edge counts (callers asking "is this fully utilized?").
   */
  public async getNodeStatus(id: string): Promise<NodeStatus> {
    if (!id || typeof id !== "string") {
      return { id: String(id ?? ""), found: false };
    }
    const graph = await this.getGraph();
    if (!graph) return { id, found: false };
    const node = graph.nodeById.get(id);
    if (!node) return { id, found: false };
    const inDeg = graph.inDegree.get(id) ?? 0;
    const outDeg = graph.outDegree.get(id) ?? 0;
    const utilization = normalizeUtilization(inDeg, graph.maxInDegree);
    const buildState = this.getBuildState();
    const buildClass = classifyBuildClass(
      node.status,
      node.id,
      buildState?.unwiredEngines ?? new Set<string>(),
    );
    return {
      id,
      found: true,
      inDegree: inDeg,
      outDegree: outDeg,
      utilization,
      node: {
        source: "graph_node",
        id: node.id,
        label: (node.label ?? node.id).split("\n")[0].slice(0, 120),
        layer: node.layer,
        status: node.status,
        description: node.info,
        confidence: 1,
        utilization,
        buildClass,
        wikiEntries: (node.knowledge?.wikiEntries ?? [])
          .map(entryName)
          .filter((s) => s.length > 0)
          .slice(0, 8),
        memoryEntries: (node.knowledge?.memoryEntries ?? [])
          .map(entryName)
          .filter((s) => s.length > 0)
          .slice(0, 6),
      },
    };
  }

  /**
   * Classify every graph node by utilization pattern.
   *
   * Buckets:
   *   - hub:    in & out both ≥ HIGH_DEGREE_PCTILE percentile (e.g. dispatchers)
   *   - sink:   in ≥ pct, out ≤ LOW_DEGREE_THRESHOLD (consumed-but-doesn't-call)
   *   - source: out ≥ pct, in ≤ LOW_DEGREE_THRESHOLD (drives others, no callers)
   *   - orphan: in ≤ LOW + out ≤ LOW + has wiki/memory docs (built but unwired)
   *   - ghost:  in ≤ LOW + out ≤ LOW + no docs (dead-code candidate)
   *   - normal: everything else
   *
   * Use this to answer the standing question: "what's actually being used?"
   * Orphans and ghosts are the audit punch list.
   */
  public async classifyAllNodes(opts: {
    layers?: string[];
    excludeLayers?: string[];
  } = {}): Promise<UtilizationDashboard> {
    const generatedAt = new Date().toISOString();
    const warnings: string[] = [];
    const graph = await this.getGraph();
    if (!graph) {
      return {
        totals: { nodesScanned: 0, hubs: 0, sinks: 0, sources: 0, orphans: 0, ghosts: 0, normal: 0 },
        byLayer: {},
        topHubs: [],
        topOrphans: [],
        topGhosts: [],
        generatedAt,
        graphMtime: null,
        warnings: ["system-graph.json unavailable"],
      };
    }

    const allowedLayers = opts.layers && opts.layers.length > 0
      ? new Set<string>(opts.layers)
      : null;
    const excludedLayers = opts.excludeLayers && opts.excludeLayers.length > 0
      ? new Set<string>(opts.excludeLayers)
      : new Set<string>(["L9", "L11"]); // filesystem leaves are inherently low-degree noise

    // Compute graph-wide degree percentile for HIGH-degree threshold.
    const inDegrees: number[] = [];
    const outDegrees: number[] = [];
    for (const n of graph.nodes) {
      if (!n || typeof n.id !== "string") continue;
      if (allowedLayers && (!n.layer || !allowedLayers.has(n.layer))) continue;
      if (excludedLayers.has(n.layer ?? "")) continue;
      inDegrees.push(graph.inDegree.get(n.id) ?? 0);
      outDegrees.push(graph.outDegree.get(n.id) ?? 0);
    }
    if (inDegrees.length === 0) {
      warnings.push("no nodes survived layer filter");
    }
    const percentile = (arr: number[], p: number): number => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const idx = Math.floor(sorted.length * p);
      return sorted[Math.min(idx, sorted.length - 1)];
    };
    const inHigh = percentile(inDegrees, HIGH_DEGREE_PCTILE);
    const outHigh = percentile(outDegrees, HIGH_DEGREE_PCTILE);

    // Classify + collect rows.
    const totals = { nodesScanned: 0, hubs: 0, sinks: 0, sources: 0, orphans: 0, ghosts: 0, normal: 0 };
    const byLayer: Record<string, Record<UtilizationClass, number>> = {};
    const rows: NodeUtilizationRow[] = [];

    for (const n of graph.nodes) {
      if (!n || typeof n.id !== "string") continue;
      if (allowedLayers && (!n.layer || !allowedLayers.has(n.layer))) continue;
      if (excludedLayers.has(n.layer ?? "")) continue;

      const inD = graph.inDegree.get(n.id) ?? 0;
      const outD = graph.outDegree.get(n.id) ?? 0;
      const wikiCount = (n.knowledge?.wikiEntries ?? []).filter((e) => entryName(e)).length;
      const memCount = (n.knowledge?.memoryEntries ?? []).filter((e) => entryName(e)).length;
      const hasDocs = wikiCount > 0 || memCount > 0;

      let cls: UtilizationClass;
      const isHighIn = inD >= inHigh && inD > LOW_DEGREE_THRESHOLD;
      const isHighOut = outD >= outHigh && outD > LOW_DEGREE_THRESHOLD;
      const isLowIn = inD <= LOW_DEGREE_THRESHOLD;
      const isLowOut = outD <= LOW_DEGREE_THRESHOLD;
      if (isHighIn && isHighOut) cls = "hub";
      else if (isHighIn && isLowOut) cls = "sink";
      else if (isHighOut && isLowIn) cls = "source";
      else if (isLowIn && isLowOut && hasDocs) cls = "orphan";
      else if (isLowIn && isLowOut && !hasDocs) cls = "ghost";
      else cls = "normal";

      totals.nodesScanned += 1;
      totals[`${cls}s` as keyof typeof totals] = (totals[`${cls}s` as keyof typeof totals] ?? 0) + 1;
      const layerKey = n.layer ?? "?";
      if (!byLayer[layerKey]) {
        byLayer[layerKey] = { hub: 0, sink: 0, source: 0, orphan: 0, ghost: 0, normal: 0 };
      }
      byLayer[layerKey][cls] += 1;

      rows.push({
        id: n.id,
        label: (n.label ?? n.id).split("\n")[0].slice(0, 100),
        layer: n.layer,
        status: n.status,
        inDegree: inD,
        outDegree: outD,
        utilization: normalizeUtilization(inD, graph.maxInDegree),
        class: cls,
        hasDocs,
      });
    }

    const topHubs = [...rows]
      .filter((r) => r.class === "hub")
      .sort((a, b) => (b.inDegree + b.outDegree) - (a.inDegree + a.outDegree))
      .slice(0, DASHBOARD_TOP_K);
    const topOrphans = [...rows]
      .filter((r) => r.class === "orphan")
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, DASHBOARD_TOP_K);
    const topGhosts = [...rows]
      .filter((r) => r.class === "ghost")
      .slice(0, DASHBOARD_TOP_K);

    return {
      totals,
      byLayer,
      topHubs,
      topOrphans,
      topGhosts,
      generatedAt,
      graphMtime: new Date(graph.mtimeMs).toISOString(),
      warnings,
    };
  }

  /**
   * Count files in the Obsidian vault tree (knowledge/{wiki,memories}).
   * Cheap sanity check — used by tests + the master-index skill report.
   *
   * Vault root is hardcoded to KNOWLEDGE_DIR; we do not accept a
   * caller-provided path (defense-in-depth — this engine is callable from
   * an UserPromptSubmit hook injection where prompt content is untrusted).
   * If the vault root ever becomes configurable, add a `path.resolve` +
   * `startsWith(KNOWLEDGE_DIR)` guard before recursing.
   */
  public vaultStats(): { wikiFiles: number; memoryFiles: number; vaultRoot: string } {
    const countMd = (dir: string): number => {
      let n = 0;
      try {
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, item.name);
          if (item.isDirectory()) n += countMd(full);
          else if (item.isFile() && item.name.toLowerCase().endsWith(".md")) n += 1;
        }
      } catch {
        /* ignore unreadable subtree */
      }
      return n;
    };
    return {
      wikiFiles: countMd(path.join(KNOWLEDGE_DIR, "wiki")),
      memoryFiles: countMd(path.join(KNOWLEDGE_DIR, "memories")),
      vaultRoot: KNOWLEDGE_DIR,
    };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private emptyResult(
    query: string,
    generatedAt: string,
    warnings: string[],
  ): MasterIndexResult {
    return {
      query,
      totalHits: 0,
      hits: [],
      bySource: {},
      byBuildClass: {},
      topUtilized: [],
      underUtilized: [],
      generatedAt,
      cacheHit: false,
      graphMtime: this.graphCache ? new Date(this.graphCache.mtimeMs).toISOString() : null,
      warnings,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const masterIndexEngine = new MasterIndexEngine();
export default masterIndexEngine;
