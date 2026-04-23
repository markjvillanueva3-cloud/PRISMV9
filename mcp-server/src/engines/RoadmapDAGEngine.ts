/**
 * RoadmapDAGEngine — U-FORE-07 (PSAU-FORESIGHT)
 * ===============================================
 *
 * Loads the roadmap index and exposes it as a directed acyclic graph of
 * milestones so that downstream engines (CriticalPathDetectorEngine,
 * schedulers, dashboards) can run standard graph algorithms.
 *
 * Ingestion is forgiving: we accept either `dependencies` or `blocks`
 * fields to describe edges, infer the missing direction, and filter out
 * completed milestones when asked.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export type MilestoneStatus = "not_started" | "in_progress" | "complete" | "blocked" | string;

export interface RoadmapMilestone {
  id: string;
  title?: string;
  track?: string;
  status?: MilestoneStatus;
  dependencies?: string[];
  blocks?: string[];
  total_units?: number;
  completed_units?: number;
  priority?: string;
  sessions_p50?: number;
  sessions_p90?: number;
}

export interface DAGNode {
  id: string;
  title: string;
  status: MilestoneStatus;
  weight: number; // default edge weight for longest-path calc
  incoming: string[]; // upstream dependencies
  outgoing: string[]; // downstream consumers (from `blocks`)
  raw: RoadmapMilestone;
}

const DEFAULT_INDEX = path.join(
  process.cwd(),
  "mcp-server",
  "data",
  "roadmap-index.json"
);

const DEFAULT_WEIGHT = 3;

export class RoadmapDAGEngine {
  readonly name = "RoadmapDAGEngine";
  private nodes: Map<string, DAGNode> = new Map();
  private loaded = false;

  constructor(private readonly indexPath: string = DEFAULT_INDEX) {}

  /**
   * Load the roadmap index and build the DAG. Idempotent per-instance.
   *
   * @param opts.includeCompleted  keep status==="complete" nodes (default false)
   */
  load(opts: { includeCompleted?: boolean; forceReload?: boolean } = {}): DAGNode[] {
    if (this.loaded && !opts.forceReload) return Array.from(this.nodes.values());
    const raw = this.readIndex();
    const milestones = raw.milestones ?? raw.units ?? [];
    if (!Array.isArray(milestones)) {
      throw new Error("RoadmapDAGEngine.load: expected .milestones to be an array");
    }
    this.nodes.clear();
    for (const m of milestones as RoadmapMilestone[]) {
      if (!m || typeof m.id !== "string") continue;
      if (!opts.includeCompleted && m.status === "complete") continue;
      this.nodes.set(m.id, {
        id: m.id,
        title: m.title ?? m.id,
        status: m.status ?? "not_started",
        weight: typeof m.sessions_p50 === "number" ? m.sessions_p50 : DEFAULT_WEIGHT,
        incoming: Array.isArray(m.dependencies) ? [...m.dependencies] : [],
        outgoing: Array.isArray(m.blocks) ? [...m.blocks] : [],
        raw: m,
      });
    }
    // Reconcile — if A blocks B but B's dependencies doesn't list A, add it
    for (const [aId, a] of this.nodes) {
      for (const bId of a.outgoing) {
        const b = this.nodes.get(bId);
        if (b && !b.incoming.includes(aId)) b.incoming.push(aId);
      }
    }
    for (const [bId, b] of this.nodes) {
      for (const aId of b.incoming) {
        const a = this.nodes.get(aId);
        if (a && !a.outgoing.includes(bId)) a.outgoing.push(bId);
      }
    }
    // Drop edges to nodes that were filtered out
    for (const node of this.nodes.values()) {
      node.incoming = node.incoming.filter((i) => this.nodes.has(i));
      node.outgoing = node.outgoing.filter((o) => this.nodes.has(o));
    }
    this.loaded = true;
    return Array.from(this.nodes.values());
  }

  /**
   * All nodes in the graph.
   */
  allNodes(): DAGNode[] {
    if (!this.loaded) this.load();
    return Array.from(this.nodes.values());
  }

  /**
   * Fetch a specific node or null.
   */
  node(id: string): DAGNode | null {
    if (!this.loaded) this.load();
    return this.nodes.get(id) ?? null;
  }

  /**
   * Kahn's algorithm — returns a topological order or throws on cycles.
   */
  topoSort(): DAGNode[] {
    if (!this.loaded) this.load();
    const indeg = new Map<string, number>();
    for (const [id, n] of this.nodes) indeg.set(id, n.incoming.length);
    const queue: string[] = [];
    for (const [id, n] of this.nodes) if ((indeg.get(id) ?? 0) === 0) queue.push(id);
    const ordered: DAGNode[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      const node = this.nodes.get(id)!;
      ordered.push(node);
      for (const out of node.outgoing) {
        const next = indeg.get(out) ?? 0;
        indeg.set(out, next - 1);
        if (next - 1 === 0) queue.push(out);
      }
    }
    if (ordered.length !== this.nodes.size) {
      throw new Error(
        `RoadmapDAGEngine.topoSort: cycle detected — ordered ${ordered.length} of ${this.nodes.size}`
      );
    }
    return ordered;
  }

  /**
   * True if the graph has any cycles.
   */
  hasCycle(): boolean {
    try {
      this.topoSort();
      return false;
    } catch {
      return true;
    }
  }

  /**
   * Cycle-tolerant topological order. Returns whatever nodes Kahn's
   * algorithm can peel off, plus the set of nodes stuck in cycles.
   * Useful for real-world roadmaps where a data entry bug produces
   * an accidental cycle but most of the graph is still traversable.
   */
  topoSortPartial(): { order: DAGNode[]; cycleNodes: string[] } {
    if (!this.loaded) this.load();
    const indeg = new Map<string, number>();
    for (const [id, n] of this.nodes) indeg.set(id, n.incoming.length);
    const queue: string[] = [];
    for (const [id] of this.nodes) if ((indeg.get(id) ?? 0) === 0) queue.push(id);
    const ordered: DAGNode[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      const node = this.nodes.get(id)!;
      ordered.push(node);
      for (const out of node.outgoing) {
        const next = (indeg.get(out) ?? 0) - 1;
        indeg.set(out, next);
        if (next === 0) queue.push(out);
      }
    }
    const cycleNodes: string[] = [];
    for (const [id] of this.nodes) {
      if (!ordered.find((n) => n.id === id)) cycleNodes.push(id);
    }
    return { order: ordered, cycleNodes };
  }

  /**
   * All transitive dependencies of a node (ancestors in the DAG).
   */
  ancestors(id: string): string[] {
    if (!this.loaded) this.load();
    const seen = new Set<string>();
    const stack = [...(this.nodes.get(id)?.incoming ?? [])];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      const n = this.nodes.get(cur);
      if (n) stack.push(...n.incoming);
    }
    return Array.from(seen);
  }

  /**
   * All transitive dependents (descendants in the DAG).
   */
  descendants(id: string): string[] {
    if (!this.loaded) this.load();
    const seen = new Set<string>();
    const stack = [...(this.nodes.get(id)?.outgoing ?? [])];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      const n = this.nodes.get(cur);
      if (n) stack.push(...n.outgoing);
    }
    return Array.from(seen);
  }

  /**
   * Size metrics useful for dashboards.
   */
  stats(): {
    nodes: number;
    edges: number;
    roots: number;
    leaves: number;
    maxInDegree: number;
    maxOutDegree: number;
  } {
    if (!this.loaded) this.load();
    let edges = 0;
    let roots = 0;
    let leaves = 0;
    let maxIn = 0;
    let maxOut = 0;
    for (const n of this.nodes.values()) {
      edges += n.outgoing.length;
      if (n.incoming.length === 0) roots++;
      if (n.outgoing.length === 0) leaves++;
      if (n.incoming.length > maxIn) maxIn = n.incoming.length;
      if (n.outgoing.length > maxOut) maxOut = n.outgoing.length;
    }
    return {
      nodes: this.nodes.size,
      edges,
      roots,
      leaves,
      maxInDegree: maxIn,
      maxOutDegree: maxOut,
    };
  }

  /**
   * Seed the DAG from an in-memory list (tests + alternative ingestion).
   */
  loadFromMilestones(milestones: RoadmapMilestone[], opts: { includeCompleted?: boolean } = {}): DAGNode[] {
    this.nodes.clear();
    this.loaded = false;
    // temporarily write in-memory — share the load pipeline
    for (const m of milestones) {
      if (!m || typeof m.id !== "string") continue;
      if (!opts.includeCompleted && m.status === "complete") continue;
      this.nodes.set(m.id, {
        id: m.id,
        title: m.title ?? m.id,
        status: m.status ?? "not_started",
        weight: typeof m.sessions_p50 === "number" ? m.sessions_p50 : DEFAULT_WEIGHT,
        incoming: Array.isArray(m.dependencies) ? [...m.dependencies] : [],
        outgoing: Array.isArray(m.blocks) ? [...m.blocks] : [],
        raw: m,
      });
    }
    for (const [aId, a] of this.nodes) {
      for (const bId of a.outgoing) {
        const b = this.nodes.get(bId);
        if (b && !b.incoming.includes(aId)) b.incoming.push(aId);
      }
    }
    for (const [bId, b] of this.nodes) {
      for (const aId of b.incoming) {
        const a = this.nodes.get(aId);
        if (a && !a.outgoing.includes(bId)) a.outgoing.push(bId);
      }
    }
    for (const node of this.nodes.values()) {
      node.incoming = node.incoming.filter((i) => this.nodes.has(i));
      node.outgoing = node.outgoing.filter((o) => this.nodes.has(o));
    }
    this.loaded = true;
    return Array.from(this.nodes.values());
  }

  /**
   * Force-drop the cached graph; next load() re-reads disk.
   */
  reset(): void {
    this.nodes.clear();
    this.loaded = false;
  }

  private readIndex(): any {
    if (!fs.existsSync(this.indexPath)) {
      throw new Error(`RoadmapDAGEngine: index not found at ${this.indexPath}`);
    }
    return JSON.parse(fs.readFileSync(this.indexPath, "utf-8"));
  }
}

export const roadmapDAGEngine = new RoadmapDAGEngine();
