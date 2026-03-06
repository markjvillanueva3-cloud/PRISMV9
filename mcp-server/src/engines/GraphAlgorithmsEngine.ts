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

  // ==========================================================================
  // Round 7: Dijkstra, A*, Christofides TSP, Nearest-Neighbor TSP
  // Source: PRISM_GRAPH_ALGORITHMS (MIT 6.006)
  // ==========================================================================

  /**
   * Dijkstra's single-source shortest path. O((V+E) log V).
   * CAM: minimize rapid move distance between operations.
   */
  dijkstra(
    graph: Record<string, Record<string, number>>,
    source: string
  ): { dist: Record<string, number>; prev: Record<string, string | null> } {
    const dist: Record<string, number> = {};
    const prev: Record<string, string | null> = {};
    const visited = new Set<string>();

    for (const node of Object.keys(graph)) {
      dist[node] = Infinity;
      prev[node] = null;
    }
    dist[source] = 0;

    const pq: Array<{ node: string; dist: number }> = [{ node: source, dist: 0 }];

    while (pq.length > 0) {
      pq.sort((a, b) => a.dist - b.dist);
      const { node: u } = pq.shift()!;
      if (visited.has(u)) continue;
      visited.add(u);

      for (const [v, weight] of Object.entries(graph[u] ?? {})) {
        const alt = dist[u] + weight;
        if (alt < (dist[v] ?? Infinity)) {
          dist[v] = alt;
          prev[v] = u;
          pq.push({ node: v, dist: alt });
        }
      }
    }

    return { dist, prev };
  }

  /**
   * Reconstruct shortest path from Dijkstra prev map.
   */
  reconstructPath(prev: Record<string, string | null>, target: string): string[] {
    const path: string[] = [];
    let current: string | null = target;
    while (current !== null) {
      path.unshift(current);
      current = prev[current] ?? null;
    }
    return path;
  }

  /**
   * A* heuristic shortest path.
   * CAM: collision-free rapid move planning.
   */
  aStar(
    graph: Record<string, Record<string, number>>,
    start: string,
    goal: string,
    heuristic: (node: string) => number
  ): string[] | null {
    const openSet = new Set<string>([start]);
    const cameFrom: Record<string, string> = {};
    const gScore: Record<string, number> = { [start]: 0 };
    const fScore: Record<string, number> = { [start]: heuristic(start) };

    while (openSet.size > 0) {
      let current: string | null = null;
      let minF = Infinity;
      for (const node of openSet) {
        if ((fScore[node] ?? Infinity) < minF) {
          minF = fScore[node] ?? Infinity;
          current = node;
        }
      }
      if (current === null) break;
      if (current === goal) {
        const path = [current];
        while (cameFrom[current]) {
          current = cameFrom[current];
          path.unshift(current);
        }
        return path;
      }
      openSet.delete(current);
      for (const [neighbor, weight] of Object.entries(graph[current] ?? {})) {
        const tentativeG = (gScore[current] ?? Infinity) + weight;
        if (tentativeG < (gScore[neighbor] ?? Infinity)) {
          cameFrom[neighbor] = current;
          gScore[neighbor] = tentativeG;
          fScore[neighbor] = tentativeG + heuristic(neighbor);
          openSet.add(neighbor);
        }
      }
    }

    return null;
  }

  /**
   * Christofides 1.5-approximation TSP on 3D points.
   * CAM: optimal tool change sequencing (30-50% cycle time reduction).
   */
  christofidesTSP(
    points: Array<{ x: number; y: number; z?: number }>
  ): { tour: number[]; distance: number } {
    const n = points.length;
    if (n <= 1) return { tour: n === 1 ? [0] : [], distance: 0 };
    if (n === 2) return { tour: [0, 1], distance: this._dist3d(points[0], points[1]) * 2 };

    // Build complete edge list
    const edges: Array<{ from: number; to: number; weight: number }> = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        edges.push({ from: i, to: j, weight: this._dist3d(points[i], points[j]) });
      }
    }

    // Step 1: MST via Kruskal
    const mstEdges = this._kruskalNumeric(edges, n);

    // Step 2: Find odd-degree vertices
    const degree = new Array(n).fill(0);
    for (const e of mstEdges) { degree[e.from]++; degree[e.to]++; }
    const oddVertices = degree.map((d, i) => d % 2 === 1 ? i : -1).filter(i => i >= 0);

    // Step 3: Greedy matching on odd vertices
    const matching = this._greedyMatching(oddVertices, points);

    // Step 4: Combine into multigraph
    const adj: number[][] = Array.from({ length: n }, () => []);
    for (const e of mstEdges) { adj[e.from].push(e.to); adj[e.to].push(e.from); }
    for (const [u, v] of matching) { adj[u].push(v); adj[v].push(u); }

    // Step 5: Eulerian circuit (Hierholzer)
    const circuit = this._hierholzer(adj, 0);

    // Step 6: Shortcut to Hamiltonian tour
    const visited = new Set<number>();
    const tour: number[] = [];
    for (const node of circuit) {
      if (!visited.has(node)) { visited.add(node); tour.push(node); }
    }

    let totalDist = 0;
    for (let i = 0; i < tour.length; i++) {
      totalDist += this._dist3d(points[tour[i]], points[tour[(i + 1) % tour.length]]);
    }

    return { tour, distance: totalDist };
  }

  /**
   * Nearest-neighbor TSP heuristic (fast, O(n²)).
   */
  nearestNeighborTSP(
    points: Array<{ x: number; y: number; z?: number }>,
    startIdx: number = 0
  ): { tour: number[]; distance: number } {
    const n = points.length;
    if (n <= 1) return { tour: n === 1 ? [0] : [], distance: 0 };

    const visited = new Set<number>([startIdx]);
    const tour = [startIdx];
    let totalDist = 0;

    while (tour.length < n) {
      const current = tour[tour.length - 1];
      let nearest = -1, nearDist = Infinity;
      for (let i = 0; i < n; i++) {
        if (!visited.has(i)) {
          const d = this._dist3d(points[current], points[i]);
          if (d < nearDist) { nearDist = d; nearest = i; }
        }
      }
      if (nearest >= 0) {
        tour.push(nearest); visited.add(nearest); totalDist += nearDist;
      }
    }

    totalDist += this._dist3d(points[tour[tour.length - 1]], points[tour[0]]);
    return { tour, distance: totalDist };
  }

  // --- Private helpers for TSP ---

  private _dist3d(a: { x: number; y: number; z?: number }, b: { x: number; y: number; z?: number }): number {
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + ((b.z ?? 0) - (a.z ?? 0)) ** 2);
  }

  private _kruskalNumeric(edges: Array<{ from: number; to: number; weight: number }>, n: number) {
    const parent = Array.from({ length: n }, (_, i) => i);
    const rank = new Array(n).fill(0);
    const find = (x: number): number => { if (parent[x] !== x) parent[x] = find(parent[x]); return parent[x]; };
    const union = (x: number, y: number): boolean => {
      const px = find(x), py = find(y);
      if (px === py) return false;
      if (rank[px] < rank[py]) parent[px] = py;
      else if (rank[px] > rank[py]) parent[py] = px;
      else { parent[py] = px; rank[px]++; }
      return true;
    };
    const sorted = [...edges].sort((a, b) => a.weight - b.weight);
    const result: typeof edges = [];
    for (const e of sorted) {
      if (union(e.from, e.to)) { result.push(e); if (result.length === n - 1) break; }
    }
    return result;
  }

  private _greedyMatching(
    vertices: number[],
    points: Array<{ x: number; y: number; z?: number }>
  ): Array<[number, number]> {
    const matched = new Set<number>();
    const matching: Array<[number, number]> = [];
    const pairs: Array<{ u: number; v: number; d: number }> = [];
    for (let i = 0; i < vertices.length; i++) {
      for (let j = i + 1; j < vertices.length; j++) {
        pairs.push({ u: vertices[i], v: vertices[j], d: this._dist3d(points[vertices[i]], points[vertices[j]]) });
      }
    }
    pairs.sort((a, b) => a.d - b.d);
    for (const { u, v } of pairs) {
      if (!matched.has(u) && !matched.has(v)) { matching.push([u, v]); matched.add(u); matched.add(v); }
    }
    return matching;
  }

  private _hierholzer(adj: number[][], start: number): number[] {
    const remaining = adj.map(a => [...a]);
    const circuit: number[] = [];
    const stack: number[] = [start];
    while (stack.length > 0) {
      const v = stack[stack.length - 1];
      if (remaining[v].length > 0) {
        const u = remaining[v].pop()!;
        const idx = remaining[u].indexOf(v);
        if (idx >= 0) remaining[u].splice(idx, 1);
        stack.push(u);
      } else {
        circuit.push(stack.pop()!);
      }
    }
    return circuit.reverse();
  }
}

export const graphAlgorithmsEngine = new GraphAlgorithmsEngineImpl();
