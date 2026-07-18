/**
 * GraphContextLensEngine.ts -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC01
 * =================================================================
 * Make the live PRISM /system-viz graph (~345K nodes / 11 layers) directly
 * addressable as scoped LLM context. Agents need a small slice around a target
 * node -- an EGO-GRAPH -- not the whole 644MB graph.
 *
 * Capabilities:
 *   - extractEgoGraph(nodeId, hops)  -- BFS slice around a node (cycle-safe, capped)
 *   - extractByDomain(domain)        -- all nodes in a domain + their interconnections
 *   - summarizeCommunity(nodes)      -- <200-token rollup of a node set
 *   - render(ego, format)            -- JSON | Markdown | Mermaid projection
 *
 * DESIGN DEVIATION FROM THE LITERAL ATOMIZED SPEC (justified, R7):
 *   The atomized micro_steps say "reads state/shared/system-viz/system-graph.json"
 *   (the 644MB merged graph ~= 186K tokens to parse -- the exact OOM/timeout anti-
 *   pattern that CHEAP-NODE-ACCESS-MS0 + the sierra soul explicitly forbid). Instead
 *   this engine reads the BOUNDED adjacency sidecar that `scripts/build-viz-adjacency.mjs`
 *   already precomputes (state/shared/system-viz/node-adjacency.json -- per-node K in/out
 *   neighbors) for BFS, and enriches node data via the CHEAP-NODE-ACCESS `seekCard`
 *   seek index. This fulfils the unit's INTENT (scoped slices) without ever holding the
 *   full graph, and reuses existing sierra substrate rather than duplicating traversal.
 *
 * Wired: prism_ai:graph_context_lens_extract (aiReasoningDispatcher).
 */

import fs from "node:fs";
import path from "node:path";

// ---- adjacency sidecar shape (produced by scripts/build-viz-adjacency.mjs) ----
export interface AdjNeighbor {
  id: string;
  type: string;
}
export interface AdjEntry {
  in: AdjNeighbor[];
  out: AdjNeighbor[];
}
export type AdjacencyMap = Record<string, AdjEntry>;

// ---- ego-graph result shape ----
export interface EgoNode {
  id: string;
  distance: number;
  label?: string;
  layer?: string;
  kind?: string;
  status?: string;
  info?: string;
}
export interface EgoEdge {
  from: string;
  to: string;
  type: string;
}
export interface EgoGraph {
  center: string;
  requestedHops: number;
  effectiveHops: number;
  nodeCount: number;
  edgeCount: number;
  truncated: boolean;
  warnings: string[];
  nodes: EgoNode[];
  edges: EgoEdge[];
}
export interface CommunitySummary {
  total: number;
  byLayer: Record<string, number>;
  byKind: Record<string, number>;
  byStatus: Record<string, number>;
  /** First N node ids (input order, NOT degree-ranked) -- summarizeCommunity has
   * only the node set; call extractEgoGraph for true degree ranking. */
  sample: string[];
}
export type LensFormat = "json" | "markdown" | "mermaid";

export interface LensOpts {
  /** Max nodes in the slice (keeps it LLM-context-sized). Default 200. */
  maxNodes?: number;
  /** Enrich nodes with label/layer/kind/status via seekCard. Default true. */
  enrich?: boolean;
  /** Override the adjacency sidecar path (tests / non-default deployments). */
  adjacencyPath?: string;
}

const MAX_HOPS = 12; // beyond real graph diameter; clamp absurd requests (e.g. 1000)
const DEFAULT_MAX_NODES = 200;
const REL_ADJ = "state/shared/system-viz/node-adjacency.json";
const REL_ADJ_PREV = "state/shared/system-viz/node-adjacency.previous.json";

/** Resolve the adjacency sidecar path robustly across cwd (repo-root vs mcp-server)
 * and esbuild bundling (import.meta.url is unreliable post-bundle). */
function resolveAdjPath(): string {
  const candidates = [
    process.env.PRISM_VIZ_ADJ_PATH,
    path.join(process.cwd(), REL_ADJ), // cwd = repo root
    path.join(process.cwd(), "..", REL_ADJ), // cwd = mcp-server
    process.platform === "win32" ? path.join("H:/prism", REL_ADJ) : "", // last-resort (Windows host)
  ].filter((c): c is string => typeof c === "string" && c.length > 0);
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {
      /* keep trying */
    }
  }
  return candidates[0] ?? path.join(process.cwd(), REL_ADJ);
}

class GraphContextLensEngine {
  private adjCache: { key: string; mtimeMs: number; adjacency: AdjacencyMap } | null = null;
  private cardMod: { seekCard?: (id: string) => unknown } | null = null;
  private cardModTried = false;

  /** Load + cache the adjacency map. Fail-loud (R12) if unreadable and no previous
   * sidecar exists; never silently returns an empty graph from an IO error. */
  loadAdjacency(pathOverride?: string): AdjacencyMap {
    const file = pathOverride || resolveAdjPath();
    let stat: fs.Stats;
    try {
      stat = fs.statSync(file);
    } catch {
      const prev = this.tryPrevious(file);
      if (prev) return prev;
      throw new Error(
        `GraphContextLensEngine: adjacency sidecar missing at ${file}. ` +
          `Recover: node --max-old-space-size=8192 scripts/build-viz-adjacency.mjs`,
      );
    }
    const cacheKey = file;
    if (this.adjCache && this.adjCache.key === cacheKey && this.adjCache.mtimeMs === stat.mtimeMs) {
      return this.adjCache.adjacency;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
      const prev = this.tryPrevious(file);
      if (prev) return prev;
      throw new Error(
        `GraphContextLensEngine: adjacency sidecar corrupt at ${file} (${(e as Error).message}). ` +
          `Recover: node scripts/build-viz-adjacency.mjs`,
      );
    }
    const adjacency = this.coerceAdjacency(parsed);
    // Cache keyed by (resolved path, mtime) regardless of how the path was chosen,
    // so a caller passing adjacencyPath does not re-parse the (96MB) sidecar each call.
    this.adjCache = { key: cacheKey, mtimeMs: stat.mtimeMs, adjacency };
    return adjacency;
  }

  /** Accept both the wrapped `{adjacency:{...}}` and the raw `{id:{in,out}}` shapes. */
  private coerceAdjacency(parsed: unknown): AdjacencyMap {
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      if (obj.adjacency && typeof obj.adjacency === "object") return obj.adjacency as AdjacencyMap;
      return obj as AdjacencyMap;
    }
    return {};
  }

  private tryPrevious(file: string): AdjacencyMap | null {
    const prevPath = /\.json$/.test(file)
      ? file.replace(/\.json$/, ".previous.json")
      : path.join(process.cwd(), REL_ADJ_PREV);
    try {
      if (fs.existsSync(prevPath)) {
        return this.coerceAdjacency(JSON.parse(fs.readFileSync(prevPath, "utf8")));
      }
    } catch {
      /* fall through to fail-loud in caller */
    }
    return null;
  }

  /** Best-effort node enrichment via the CHEAP-NODE-ACCESS seek index. Never throws. */
  private async enrich(nodes: EgoNode[]): Promise<void> {
    if (!this.cardModTried) {
      this.cardModTried = true;
      try {
        this.cardMod = (await import("../../../scripts/lib/node-card-read.mjs" as string)) as {
          seekCard?: (id: string) => unknown;
        };
      } catch {
        this.cardMod = null;
      }
    }
    const seek = this.cardMod?.seekCard;
    if (typeof seek !== "function") return;
    for (const n of nodes) {
      try {
        const c = seek(n.id) as Partial<EgoNode> | null;
        if (c) {
          if (c.label != null) n.label = c.label;
          if (c.layer != null) n.layer = c.layer;
          if (c.kind != null) n.kind = c.kind;
          if (c.status != null) n.status = c.status;
          if (c.info != null) n.info = c.info;
        }
      } catch {
        /* best-effort per node */
      }
    }
  }

  /** Ego-graph around `nodeId`: BFS over in+out neighbors up to `hops` levels,
   * cycle-safe (visited set), node-capped (returns reachable subset + warning when
   * the cap or graph boundary is hit). nodeId with shell-special chars is harmless
   * here -- it is only ever used as an object key, never shelled out. */
  async extractEgoGraph(nodeId: string, hops = 1, opts: LensOpts = {}): Promise<EgoGraph> {
    const warnings: string[] = [];
    if (typeof nodeId !== "string" || nodeId.trim() === "") {
      throw new Error("GraphContextLensEngine.extractEgoGraph: nodeId must be a non-empty string");
    }
    const requestedHops = Number.isFinite(hops) ? Math.floor(hops) : 1;
    let effectiveHops = requestedHops;
    if (effectiveHops < 0) effectiveHops = 0;
    if (effectiveHops > MAX_HOPS) {
      warnings.push(`hops ${requestedHops} clamped to MAX_HOPS ${MAX_HOPS}`);
      effectiveHops = MAX_HOPS;
    }
    const maxNodes =
      Number.isFinite(opts.maxNodes) && (opts.maxNodes as number) > 0
        ? Math.floor(opts.maxNodes as number)
        : DEFAULT_MAX_NODES;

    const adjacency = this.loadAdjacency(opts.adjacencyPath);

    const nodes = new Map<string, EgoNode>();
    nodes.set(nodeId, { id: nodeId, distance: 0 });
    if (!adjacency[nodeId]) {
      warnings.push(`center node '${nodeId}' has no edges in the adjacency sidecar`);
    }

    // BFS for NODES over both in + out neighbors (ego = upstream and downstream),
    // cycle-safe via the visited map, capped at maxNodes.
    let frontier: string[] = [nodeId];
    let truncated = false;
    for (let h = 0; h < effectiveHops && !truncated; h++) {
      const next: string[] = [];
      for (const id of frontier) {
        const entry = adjacency[id];
        if (!entry) continue;
        const consider = (nb: AdjNeighbor) => {
          if (!nb || typeof nb.id !== "string") return;
          if (nodes.has(nb.id)) return;
          if (nodes.size >= maxNodes) {
            truncated = true;
            return;
          }
          nodes.set(nb.id, { id: nb.id, distance: h + 1 });
          next.push(nb.id);
        };
        for (const nb of entry.out || []) {
          consider(nb);
          if (truncated) break;
        }
        if (!truncated) {
          for (const nb of entry.in || []) {
            consider(nb);
            if (truncated) break;
          }
        }
        if (truncated) break;
      }
      frontier = next;
      if (frontier.length === 0) break;
    }
    if (truncated) warnings.push(`node cap ${maxNodes} reached; returning reachable subset`);

    const nodeList = [...nodes.values()];
    if (opts.enrich !== false) await this.enrich(nodeList);

    // Induced edges: every out-edge whose BOTH endpoints are in the node set, once.
    const idset = new Set(nodeList.map((n) => n.id));
    const keptEdges: EgoEdge[] = [];
    const edgeSeen = new Set<string>();
    for (const id of idset) {
      const entry = adjacency[id];
      if (!entry) continue;
      for (const nb of entry.out || []) {
        if (!nb || typeof nb.id !== "string" || !idset.has(nb.id)) continue;
        const key = `${id}->${nb.id}:${nb.type}`;
        if (!edgeSeen.has(key)) {
          edgeSeen.add(key);
          keptEdges.push({ from: id, to: nb.id, type: nb.type });
        }
      }
    }

    return {
      center: nodeId,
      requestedHops,
      effectiveHops,
      nodeCount: nodeList.length,
      edgeCount: keptEdges.length,
      truncated,
      warnings,
      nodes: nodeList,
      edges: keptEdges,
    };
  }

  /** All nodes whose id carries the given domain segment (e.g. "mill" matches
   * eng.mill.*, ghost.galaxy.mill, disp.millDispatcher) + edges among them. */
  async extractByDomain(domain: string, opts: LensOpts = {}): Promise<EgoGraph> {
    if (typeof domain !== "string" || domain.trim() === "") {
      throw new Error("GraphContextLensEngine.extractByDomain: domain must be a non-empty string");
    }
    const warnings: string[] = [];
    const maxNodes =
      Number.isFinite(opts.maxNodes) && (opts.maxNodes as number) > 0
        ? Math.floor(opts.maxNodes as number)
        : DEFAULT_MAX_NODES;
    const adjacency = this.loadAdjacency(opts.adjacencyPath);
    const d = domain.toLowerCase();
    const seg = new RegExp(`(^|[._])${d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([._]|$)`);

    const matched: string[] = [];
    for (const id of Object.keys(adjacency)) {
      if (seg.test(id.toLowerCase())) {
        matched.push(id);
        if (matched.length >= maxNodes) break;
      }
    }
    const truncated = matched.length >= maxNodes;
    if (truncated) warnings.push(`node cap ${maxNodes} reached; domain '${domain}' has more nodes`);
    if (matched.length === 0) warnings.push(`no nodes matched domain '${domain}'`);

    const idset = new Set(matched);
    const edges: EgoEdge[] = [];
    const edgeSeen = new Set<string>();
    for (const id of matched) {
      const entry = adjacency[id];
      if (!entry) continue;
      for (const nb of entry.out || []) {
        if (idset.has(nb.id)) {
          const key = `${id}->${nb.id}:${nb.type}`;
          if (!edgeSeen.has(key)) {
            edgeSeen.add(key);
            edges.push({ from: id, to: nb.id, type: nb.type });
          }
        }
      }
    }

    const nodeList: EgoNode[] = matched.map((id) => ({ id, distance: 0 }));
    if (opts.enrich !== false) await this.enrich(nodeList);

    return {
      center: `domain:${domain}`,
      requestedHops: 0,
      effectiveHops: 0,
      nodeCount: nodeList.length,
      edgeCount: edges.length,
      truncated,
      warnings,
      nodes: nodeList,
      edges,
    };
  }

  /** Collapse a node set to a compact (<200 token) rollup for cluster overviews. */
  summarizeCommunity(nodes: EgoNode[]): CommunitySummary {
    const byLayer: Record<string, number> = {};
    const byKind: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const list = Array.isArray(nodes) ? nodes : [];
    for (const n of list) {
      const layer = n.layer || "unknown";
      const kind = n.kind || "unknown";
      const status = n.status || "unknown";
      byLayer[layer] = (byLayer[layer] || 0) + 1;
      byKind[kind] = (byKind[kind] || 0) + 1;
      byStatus[status] = (byStatus[status] || 0) + 1;
    }
    // Degree ranking needs the adjacency map; summarizeCommunity only has the node
    // set, so it returns structural counts + a small id sample (NOT degree-ranked).
    const sample = list.slice(0, 5).map((n) => n.id);
    return { total: list.length, byLayer, byKind, byStatus, sample };
  }

  /** Project an ego-graph to JSON / Markdown / Mermaid for direct LLM consumption. */
  render(ego: EgoGraph, format: LensFormat = "json"): string {
    if (format === "json") return JSON.stringify(ego, null, 2);
    if (format === "markdown") return this.renderMarkdown(ego);
    if (format === "mermaid") return this.renderMermaid(ego);
    throw new Error(`GraphContextLensEngine.render: unknown format '${format}'`);
  }

  private renderMarkdown(ego: EgoGraph): string {
    const lines: string[] = [];
    lines.push(
      `# Ego-graph: ${ego.center} (${ego.effectiveHops}-hop, ${ego.nodeCount} nodes, ${ego.edgeCount} edges)`,
    );
    if (ego.truncated) lines.push(`> truncated: reachable subset only`);
    for (const w of ego.warnings) lines.push(`> warning: ${w}`);
    lines.push("", "## Nodes");
    const byDist = new Map<number, EgoNode[]>();
    for (const n of ego.nodes) {
      const arr = byDist.get(n.distance) || [];
      arr.push(n);
      byDist.set(n.distance, arr);
    }
    for (const dist of [...byDist.keys()].sort((a, b) => a - b)) {
      lines.push(`### distance ${dist}`);
      for (const n of byDist.get(dist) || []) {
        const meta = [n.layer, n.kind, n.status].filter(Boolean).join("/");
        lines.push(`- \`${n.id}\`${n.label ? ` ${n.label}` : ""}${meta ? ` [${meta}]` : ""}`);
      }
    }
    if (ego.edges.length) {
      lines.push("", "## Edges");
      for (const e of ego.edges) lines.push(`- \`${e.from}\` --${e.type}--> \`${e.to}\``);
    }
    return lines.join("\n");
  }

  private renderMermaid(ego: EgoGraph): string {
    const safe = (id: string) => "n_" + id.replace(/[^A-Za-z0-9_]/g, "_");
    const lines: string[] = ["graph LR"];
    for (const n of ego.nodes) {
      const lbl = (n.label || n.id).replace(/"/g, "'");
      lines.push(`  ${safe(n.id)}["${lbl}"]`);
    }
    for (const e of ego.edges) {
      const t = e.type.replace(/[|"]/g, "");
      lines.push(`  ${safe(e.from)} -->|${t}| ${safe(e.to)}`);
    }
    return lines.join("\n");
  }
}

export { GraphContextLensEngine };
export const graphContextLensEngine = new GraphContextLensEngine();
