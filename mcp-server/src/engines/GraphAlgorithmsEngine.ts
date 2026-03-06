/**
 * PRISM MCP Server — Graph Algorithms Engine
 *
 * Classical graph algorithms for manufacturing planning:
 * - Minimum Spanning Tree (Kruskal, Prim)
 * - Shortest paths (Bellman-Ford, Floyd-Warshall)
 * - Topological sort (Kahn's algorithm)
 * - Strongly Connected Components (Kosaraju's)
 * - Critical Path Method (CPM)
 *
 * Ported from PRISM_GRAPH_ALGORITHMS_ENGINE.js (monolith R2.3.1).
 *
 * @module GraphAlgorithmsEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface WeightedEdge {
  from: string;
  to: string;
  weight: number;
}

export interface MSTResult {
  edges: WeightedEdge[];
  totalWeight: number;
  isConnected: boolean;
}

export interface ShortestPathResult {
  success: boolean;
  reason?: string;
  distances?: Record<string, number>;
  predecessors?: Record<string, string | null>;
}

export interface FloydWarshallResult {
  success: boolean;
  reason?: string;
  distances?: number[][];
  nodes?: string[];
  nodeIndex?: Record<string, number>;
  getPath?: (from: string, to: string) => string[] | null;
  getDistance?: (from: string, to: string) => number;
}

export interface TopoSortResult {
  success: boolean;
  reason?: string;
  order?: string[];
}

export interface SCCResult {
  components: string[][];
  numComponents: number;
  isStronglyConnected: boolean;
}

export interface Activity {
  id: string;
  duration: number;
  predecessors?: string[];
}

export interface CPMResult {
  success: boolean;
  reason?: string;
  projectDuration?: number;
  criticalPath?: string[];
  schedule?: Array<{
    id: string; duration: number;
    ES: number; EF: number; LS: number; LF: number;
    slack: number; isCritical: boolean;
  }>;
}

// ============================================================================
// ENGINE
// ============================================================================

class GraphAlgorithmsEngineImpl {

  /** Kruskal's MST using Union-Find with path compression and union by rank. */
  kruskalMST(nodes: string[], edges: WeightedEdge[]): MSTResult {
    const parent: Record<string, string> = {};
    const rank: Record<string, number> = {};

    const find = (x: string): string => {
      if (parent[x] !== x) parent[x] = find(parent[x]);
      return parent[x];
    };
    const union = (x: string, y: string): boolean => {
      const px = find(x), py = find(y);
      if (px === py) return false;
      if (rank[px] < rank[py]) parent[px] = py;
      else if (rank[px] > rank[py]) parent[py] = px;
      else { parent[py] = px; rank[px]++; }
      return true;
    };

    for (const node of nodes) { parent[node] = node; rank[node] = 0; }
    const sorted = [...edges].sort((a, b) => a.weight - b.weight);

    const mstEdges: WeightedEdge[] = [];
    let totalWeight = 0;
    for (const edge of sorted) {
      if (union(edge.from, edge.to)) {
        mstEdges.push(edge);
        totalWeight += edge.weight;
        if (mstEdges.length === nodes.length - 1) break;
      }
    }

    return { edges: mstEdges, totalWeight, isConnected: mstEdges.length === nodes.length - 1 };
  }

  /** Prim's MST from adjacency list. */
  primMST(nodes: string[], adjacencyList: Record<string, Array<{ neighbor: string; weight: number }>>): MSTResult {
    if (nodes.length === 0) return { edges: [], totalWeight: 0, isConnected: true };

    const inMST = new Set<string>();
    const mstEdges: WeightedEdge[] = [];
    let totalWeight = 0;
    const pq: Array<{ node: string; fromNode: string | null; weight: number }> = [
      { node: nodes[0], fromNode: null, weight: 0 },
    ];

    while (pq.length > 0 && inMST.size < nodes.length) {
      pq.sort((a, b) => a.weight - b.weight);
      const { node, fromNode, weight } = pq.shift()!;
      if (inMST.has(node)) continue;
      inMST.add(node);

      if (fromNode !== null) {
        mstEdges.push({ from: fromNode, to: node, weight });
        totalWeight += weight;
      }

      for (const { neighbor, weight: w } of (adjacencyList[node] ?? [])) {
        if (!inMST.has(neighbor)) pq.push({ node: neighbor, fromNode: node, weight: w });
      }
    }

    return { edges: mstEdges, totalWeight, isConnected: inMST.size === nodes.length };
  }

  /** Bellman-Ford single-source shortest paths (handles negative weights). */
  bellmanFord(nodes: string[], edges: WeightedEdge[], source: string): ShortestPathResult {
    const dist: Record<string, number> = {};
    const prev: Record<string, string | null> = {};

    for (const node of nodes) { dist[node] = node === source ? 0 : Infinity; prev[node] = null; }

    for (let i = 0; i < nodes.length - 1; i++) {
      let changed = false;
      for (const { from, to, weight } of edges) {
        if (dist[from] !== Infinity && dist[from] + weight < dist[to]) {
          dist[to] = dist[from] + weight;
          prev[to] = from;
          changed = true;
        }
      }
      if (!changed) break;
    }

    for (const { from, to, weight } of edges) {
      if (dist[from] !== Infinity && dist[from] + weight < dist[to]) {
        return { success: false, reason: "Negative cycle detected" };
      }
    }

    return { success: true, distances: dist, predecessors: prev };
  }

  /** Floyd-Warshall all-pairs shortest paths. */
  floydWarshall(nodes: string[], edges: WeightedEdge[]): FloydWarshallResult {
    const n = nodes.length;
    const nodeIndex: Record<string, number> = {};
    nodes.forEach((node, i) => nodeIndex[node] = i);

    const dist: number[][] = [];
    const next: (number | null)[][] = [];
    for (let i = 0; i < n; i++) {
      dist[i] = []; next[i] = [];
      for (let j = 0; j < n; j++) {
        dist[i][j] = i === j ? 0 : Infinity;
        next[i][j] = null;
      }
    }

    for (const { from, to, weight } of edges) {
      const i = nodeIndex[from], j = nodeIndex[to];
      dist[i][j] = weight;
      next[i][j] = j;
    }

    for (let k = 0; k < n; k++) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (dist[i][k] + dist[k][j] < dist[i][j]) {
            dist[i][j] = dist[i][k] + dist[k][j];
            next[i][j] = next[i][k];
          }
        }
      }
    }

    for (let i = 0; i < n; i++) {
      if (dist[i][i] < 0) return { success: false, reason: "Negative cycle detected" };
    }

    const getPath = (from: string, to: string): string[] | null => {
      const i = nodeIndex[from], j = nodeIndex[to];
      if (next[i][j] === null) return null;
      const path = [from];
      let cur = i;
      while (cur !== j) { cur = next[cur][j]!; path.push(nodes[cur]); }
      return path;
    };

    return {
      success: true, distances: dist, nodes, nodeIndex,
      getPath,
      getDistance: (from, to) => dist[nodeIndex[from]][nodeIndex[to]],
    };
  }

  /** Topological sort using Kahn's algorithm. */
  topologicalSort(nodes: string[], edges: Array<{ from: string; to: string }>): TopoSortResult {
    const inDegree: Record<string, number> = {};
    const adj: Record<string, string[]> = {};
    for (const node of nodes) { inDegree[node] = 0; adj[node] = []; }
    for (const { from, to } of edges) { adj[from].push(to); inDegree[to]++; }

    const queue = nodes.filter(n => inDegree[n] === 0);
    const sorted: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      sorted.push(node);
      for (const nb of adj[node]) {
        inDegree[nb]--;
        if (inDegree[nb] === 0) queue.push(nb);
      }
    }

    if (sorted.length !== nodes.length) return { success: false, reason: "Graph contains cycle" };
    return { success: true, order: sorted };
  }

  /** Strongly Connected Components using Kosaraju's algorithm. */
  stronglyConnectedComponents(nodes: string[], edges: Array<{ from: string; to: string }>): SCCResult {
    const adj: Record<string, string[]> = {};
    const rev: Record<string, string[]> = {};
    for (const node of nodes) { adj[node] = []; rev[node] = []; }
    for (const { from, to } of edges) { adj[from].push(to); rev[to].push(from); }

    const visited = new Set<string>();
    const finish: string[] = [];
    const dfs1 = (n: string) => {
      visited.add(n);
      for (const nb of adj[n]) if (!visited.has(nb)) dfs1(nb);
      finish.push(n);
    };
    for (const node of nodes) if (!visited.has(node)) dfs1(node);

    visited.clear();
    const components: string[][] = [];
    const dfs2 = (n: string, comp: string[]) => {
      visited.add(n); comp.push(n);
      for (const nb of rev[n]) if (!visited.has(nb)) dfs2(nb, comp);
    };
    while (finish.length > 0) {
      const n = finish.pop()!;
      if (!visited.has(n)) { const comp: string[] = []; dfs2(n, comp); components.push(comp); }
    }

    return { components, numComponents: components.length, isStronglyConnected: components.length === 1 };
  }

  /** Critical Path Method for project scheduling. */
  criticalPathMethod(activities: Activity[]): CPMResult {
    const nodes = activities.map(a => a.id);
    const edges = activities.flatMap(a =>
      (a.predecessors ?? []).map(p => ({ from: p, to: a.id })),
    );
    const actMap = new Map(activities.map(a => [a.id, a]));

    const sortResult = this.topologicalSort(nodes, edges);
    if (!sortResult.success) return { success: false, reason: "Cyclic dependency" };

    const ES: Record<string, number> = {};
    const EF: Record<string, number> = {};

    for (const id of sortResult.order!) {
      const preds = actMap.get(id)!.predecessors ?? [];
      ES[id] = preds.length === 0 ? 0 : Math.max(...preds.map(p => EF[p]));
      EF[id] = ES[id] + actMap.get(id)!.duration;
    }

    const projectDuration = Math.max(...Object.values(EF));
    const LF: Record<string, number> = {};
    const LS: Record<string, number> = {};

    for (const id of sortResult.order!.slice().reverse()) {
      const succs = activities.filter(a => (a.predecessors ?? []).includes(id)).map(a => a.id);
      LF[id] = succs.length === 0 ? projectDuration : Math.min(...succs.map(s => LS[s]));
      LS[id] = LF[id] - actMap.get(id)!.duration;
    }

    const criticalPath = nodes.filter(id => Math.abs(LS[id] - ES[id]) < 0.001);

    return {
      success: true,
      projectDuration,
      criticalPath,
      schedule: activities.map(a => ({
        id: a.id, duration: a.duration,
        ES: ES[a.id], EF: EF[a.id], LS: LS[a.id], LF: LF[a.id],
        slack: LS[a.id] - ES[a.id],
        isCritical: Math.abs(LS[a.id] - ES[a.id]) < 0.001,
      })),
    };
  }
}

export const graphAlgorithmsEngine = new GraphAlgorithmsEngineImpl();
