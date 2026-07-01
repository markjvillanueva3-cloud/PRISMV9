/**
 * GraphRAGRetrievalEngine.ts -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC02
 * =================================================================
 * GraphRAG over the PRISM wiki + system-viz graph (Edge et al. arXiv:2404.16130,
 * RepoGraph ICLR-2025 ego-graph retrieval). Classic vector RAG misses multi-hop
 * manufacturing queries; GraphRAG seeds on query-matched entities then expands
 * along graph edges.
 *
 * DOCTRINE (research pass-2): "wrap, not rebuild". This engine composes:
 *   - find-cache.json (the compact node projection) for query -> entity matching
 *   - graphContextLensEngine.extractEgoGraph (U-GAC01) for cycle-safe 1-hop expansion
 *   - an INJECTABLE, fail-soft summarizer (Ollama qwen in prod; deterministic in tests)
 * It never loads the 644MB graph and never hard-depends on a live LLM.
 *
 * Pipeline (retrieve):
 *   1. extract query entities -> score find-cache nodes by token overlap (id/label/info)
 *   2. take top seeds; for each, ego-graph 1-hop expand via U-GAC01
 *   3. rank candidates = seed match-score + proximity bonus (seed > neighbor)
 *   4. summarize the top community (injectable; fail-soft Ollama -> extractive fallback)
 *   5. return {query, seeds, entities (top-K + scores), summary, warnings}
 *
 * Wired: prism_ai:graphrag_retrieve (aiReasoningDispatcher).
 */

import fs from "node:fs";
import path from "node:path";
import { graphContextLensEngine } from "./GraphContextLensEngine.js";

export interface FindCacheNode {
  id: string;
  label?: string;
  info?: string;
  layer?: string;
  kind?: string;
  subgroup?: string;
}
export interface RetrievedEntity {
  id: string;
  label?: string;
  info?: string;
  layer?: string;
  score: number;
  distance: number; // 0 = query-matched seed, 1 = ego neighbor
  seed: boolean;
}
export interface GraphRAGResult {
  query: string;
  seeds: { id: string; score: number }[];
  entities: RetrievedEntity[];
  entityCount: number;
  summary: string;
  summarizer: "injected" | "ollama" | "extractive";
  warnings: string[];
}

/** Summarizer contract: given the query + ranked entities, return a short summary.
 * Tests inject a deterministic one; production default is deterministic extractive
 * (opt in to fail-soft Ollama via opts.useLlm). */
export type Summarizer = (query: string, entities: RetrievedEntity[]) => Promise<string> | string;

export interface RetrieveOpts {
  topK?: number; // entities returned (default 10)
  topSeeds?: number; // query-matched seeds expanded (default 5)
  hops?: number; // ego expansion radius (default 1)
  maxNodes?: number; // per-seed ego cap (default 50)
  summarize?: Summarizer; // injectable (tests)
  useLlm?: boolean; // opt in to Ollama summarization (default: deterministic extractive)
  noLlm?: boolean; // force extractive even if useLlm set (back-compat; matches default)
  nodes?: FindCacheNode[]; // injected node corpus (tests) -- bypasses find-cache read
  findCachePath?: string; // override find-cache path (tests/non-default)
  adjacencyPath?: string; // forwarded to extractEgoGraph
  ollamaModel?: string;
}

const DEFAULT_TOPK = 10;
const DEFAULT_TOPSEEDS = 5;
const DEFAULT_MAXNODES = 50;
const SEED_BONUS = 5; // keeps a query-matched seed ranked above its ego neighbors
const REL_FINDCACHE = "state/shared/system-viz/find-cache.json";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
// Routing default for opt-in Ollama summarization (mirrors ask-ollama.mjs DEFAULT_MODEL).
// NOT a physics constant; override via env PRISM_OLLAMA_MODEL or opts.ollamaModel.
const OLLAMA_MODEL_FALLBACK = process.env.PRISM_OLLAMA_MODEL || "qwen2.5-coder:32b";
const STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "in", "for", "and", "or", "is", "are", "what",
  "how", "where", "which", "that", "this", "with", "on", "by", "do", "does",
  "i", "we", "you", "it", "be", "as", "at", "from", "show", "find", "get", "me",
]);

function resolveFindCachePath(): string {
  const candidates = [
    process.env.PRISM_VIZ_FINDCACHE_PATH,
    path.join(process.cwd(), REL_FINDCACHE),
    path.join(process.cwd(), "..", REL_FINDCACHE),
    process.platform === "win32" ? path.join("H:/prism", REL_FINDCACHE) : "",
  ].filter((c): c is string => typeof c === "string" && c.length > 0);
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {
      /* keep trying */
    }
  }
  return candidates[0] ?? path.join(process.cwd(), REL_FINDCACHE);
}

class GraphRAGRetrievalEngine {
  private nodeCache: { key: string; mtimeMs: number; nodes: FindCacheNode[] } | null = null;

  /** Test-only: clear the find-cache memo so a fixture path is re-read. */
  _resetCacheForTest(): void {
    this.nodeCache = null;
  }

  /** Load the find-cache node corpus (mtime-cached). Fail-loud (R12) if unreadable. */
  loadNodes(pathOverride?: string): FindCacheNode[] {
    const file = pathOverride || resolveFindCachePath();
    let stat: fs.Stats;
    try {
      stat = fs.statSync(file);
    } catch {
      throw new Error(
        `GraphRAGRetrievalEngine: find-cache missing at ${file}. ` +
          `Recover: node scripts/regen-find-cache.mjs`,
      );
    }
    if (this.nodeCache && this.nodeCache.key === file && this.nodeCache.mtimeMs === stat.mtimeMs) {
      return this.nodeCache.nodes;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
      throw new Error(
        `GraphRAGRetrievalEngine: find-cache corrupt at ${file} (${(e as Error).message}). ` +
          `Recover: node scripts/regen-find-cache.mjs`,
      );
    }
    const nodes = this.coerceNodes(parsed);
    this.nodeCache = { key: file, mtimeMs: stat.mtimeMs, nodes };
    return nodes;
  }

  private coerceNodes(parsed: unknown): FindCacheNode[] {
    if (Array.isArray(parsed)) return parsed as FindCacheNode[];
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj.nodes)) return obj.nodes as FindCacheNode[];
    }
    return [];
  }

  /** Tokenize a free-text query into lowercased content tokens. */
  tokenize(query: string): string[] {
    return String(query)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
  }

  /** Score a node against query tokens. Per token the HIGHEST-tier field hit counts
   * once (id 3 > label 2 > info 1) -- intentional priority, not cumulative, so an id
   * match dominates a weaker info-only match. */
  private scoreNode(node: FindCacheNode, tokens: string[]): number {
    const id = (node.id || "").toLowerCase();
    const label = (node.label || "").toLowerCase();
    const info = (node.info || "").toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (id.includes(t)) score += 3;
      else if (label.includes(t)) score += 2;
      else if (info.includes(t)) score += 1;
    }
    return score;
  }

  /** Summarizer: deterministic extractive by DEFAULT (no network -- no surprise latency
   * on a plain retrieve). Opt in to Ollama via opts.useLlm; that path is fail-soft
   * (-> extractive on any error/timeout/down) and never throws. */
  private async defaultSummarize(
    query: string,
    entities: RetrievedEntity[],
    opts: RetrieveOpts,
  ): Promise<{ text: string; via: "ollama" | "extractive" }> {
    const extractive = () => {
      const top = entities.slice(0, 5).map((e) => e.label || e.id);
      return `Top ${entities.length} entit${entities.length === 1 ? "y" : "ies"} for "${query}": ${top.join(", ")}.`;
    };
    // Deterministic unless Ollama is explicitly requested; noLlm always forces extractive.
    if (opts.noLlm || !opts.useLlm) return { text: extractive(), via: "extractive" };
    try {
      const context = entities
        .slice(0, 12)
        .map((e) => `${e.id}: ${e.label || ""} -- ${e.info || ""}`)
        .join("\n");
      const resp = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: opts.ollamaModel || OLLAMA_MODEL_FALLBACK,
          prompt: `Concisely summarize how these PRISM system nodes relate to the query "${query}":\n${context}\n\nSummary:`,
          stream: false,
          keep_alive: "10m",
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (resp.ok) {
        const data = (await resp.json()) as { response?: string };
        const text = (data.response || "").trim();
        if (text) return { text, via: "ollama" };
      }
    } catch {
      /* fail soft -> extractive */
    }
    return { text: extractive(), via: "extractive" };
  }

  /** GraphRAG retrieval: query -> seed entities -> ego expansion -> rank -> summarize. */
  async retrieve(query: string, opts: RetrieveOpts = {}): Promise<GraphRAGResult> {
    const warnings: string[] = [];
    if (typeof query !== "string" || query.trim() === "") {
      throw new Error("GraphRAGRetrievalEngine.retrieve: query must be a non-empty string");
    }
    const topK = Number.isFinite(opts.topK) && (opts.topK as number) > 0 ? Math.floor(opts.topK as number) : DEFAULT_TOPK;
    const topSeeds =
      Number.isFinite(opts.topSeeds) && (opts.topSeeds as number) > 0 ? Math.floor(opts.topSeeds as number) : DEFAULT_TOPSEEDS;
    const hops = Number.isFinite(opts.hops) && (opts.hops as number) >= 0 ? Math.floor(opts.hops as number) : 1;
    const maxNodes =
      Number.isFinite(opts.maxNodes) && (opts.maxNodes as number) > 0 ? Math.floor(opts.maxNodes as number) : DEFAULT_MAXNODES;

    const tokens = this.tokenize(query);
    if (tokens.length === 0) warnings.push("query has no content tokens after stopword removal");

    const corpus = opts.nodes ?? this.loadNodes(opts.findCachePath);
    const byId = new Map<string, FindCacheNode>();
    let malformed = 0;
    for (const n of corpus) {
      if (n && typeof n.id === "string") byId.set(n.id, n);
      else malformed++;
    }
    if (malformed > 0) warnings.push(`${malformed} corpus node(s) dropped (missing string id)`);

    // Stage 1: query -> seed entities
    const scored = corpus
      .filter((n) => n && typeof n.id === "string")
      .map((n) => ({ node: n, score: this.scoreNode(n, tokens) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);
    const seeds = scored.slice(0, topSeeds);
    if (seeds.length === 0) {
      warnings.push(`no entities matched query "${query}"`);
      return {
        query,
        seeds: [],
        entities: [],
        entityCount: 0,
        summary: `No PRISM entities matched "${query}".`,
        summarizer: "extractive",
        warnings,
      };
    }

    // Stage 2 + 3: ego-expand each seed (U-GAC01), aggregate + rank
    const ranked = new Map<string, RetrievedEntity>();
    const upsert = (id: string, score: number, distance: number, seed: boolean) => {
      const meta = byId.get(id);
      const prev = ranked.get(id);
      if (prev) {
        prev.score = Math.max(prev.score, score);
        prev.distance = Math.min(prev.distance, distance);
        prev.seed = prev.seed || seed;
        return;
      }
      ranked.set(id, {
        id,
        label: meta?.label,
        info: meta?.info,
        layer: meta?.layer,
        score,
        distance,
        seed,
      });
    };
    for (const s of seeds) {
      // SEED_BONUS keeps a seed above its neighbors at equal raw score (upsert max-wins).
      upsert(s.node.id, s.score + SEED_BONUS, 0, true);
      if (hops > 0) {
        try {
          const ego = await graphContextLensEngine.extractEgoGraph(s.node.id, hops, {
            enrich: false,
            maxNodes,
            adjacencyPath: opts.adjacencyPath,
          });
          for (const n of ego.nodes) {
            if (n.id === s.node.id) continue;
            // neighbor inherits a fraction of the seed score; n.distance is BFS depth
            // in the ego-graph (1 = direct neighbor, 2 = two hops), so closer ranks higher.
            upsert(n.id, s.score / (n.distance + 1), n.distance, false);
          }
        } catch (e) {
          warnings.push(`ego expansion failed for seed '${s.node.id}': ${(e as Error).message}`);
        }
      }
    }

    const entities = [...ranked.values()]
      .sort((a, b) => b.score - a.score || a.distance - b.distance)
      .slice(0, topK);

    // Stage 4: summarize
    let summary: string;
    let summarizer: GraphRAGResult["summarizer"];
    if (typeof opts.summarize === "function") {
      summary = await opts.summarize(query, entities);
      summarizer = "injected";
    } else {
      const r = await this.defaultSummarize(query, entities, opts);
      summary = r.text;
      summarizer = r.via;
    }

    return {
      query,
      seeds: seeds.map((s) => ({ id: s.node.id, score: s.score })),
      entities,
      entityCount: entities.length,
      summary,
      summarizer,
      warnings,
    };
  }
}

export { GraphRAGRetrievalEngine };
export const graphRAGRetrievalEngine = new GraphRAGRetrievalEngine();
