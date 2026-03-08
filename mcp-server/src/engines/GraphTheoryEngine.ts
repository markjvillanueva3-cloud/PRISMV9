/**
 * PRISM MCP Server — Graph Theory Engine
 *
 * Graph theory algorithms applied to manufacturing optimization:
 * - dag_schedule: DAG precedence scheduling (topological sort + critical path)
 * - mst: Minimum spanning tree for toolpath linking (Prim's algorithm)
 * - tsp: Traveling salesman for hole pattern optimization (nearest-neighbor + 2-opt)
 * - max_flow: Chip evacuation channel design (Edmonds-Karp / Ford-Fulkerson with BFS)
 * - coloring: Fixture/setup optimization via greedy graph coloring
 *
 * @module GraphTheoryEngine
 */

export interface GraphNode {
  id: string;
  label?: string;
  position?: { x: number; y: number; z?: number };
  weight?: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number;
  capacity?: number;
  label?: string;
}

export interface GraphInput {
  algorithm: 'dag_schedule' | 'mst' | 'tsp' | 'max_flow' | 'coloring';
  nodes: GraphNode[];
  edges: GraphEdge[];
  source?: string;
  sink?: string;
  directed?: boolean;
}

export interface DagResult {
  topological_order: string[];
  critical_path: string[];
  critical_path_weight: number;
  earliest_start: Record<string, number>;
  latest_start: Record<string, number>;
  slack: Record<string, number>;
}

export interface MstResult {
  edges: GraphEdge[];
  total_weight: number;
  tree_nodes: string[];
}

export interface TspResult {
  tour: string[];
  total_distance: number;
  improvement_over_naive_pct: number;
}

export interface MaxFlowResult {
  max_flow_value: number;
  flow_edges: Array<{ from: string; to: string; flow: number; capacity: number }>;
  min_cut_edges: GraphEdge[];
}

export interface ColoringResult {
  colors: Record<string, number>;
  chromatic_number: number;
  color_groups: Record<number, string[]>;
}

export interface GraphResult {
  algorithm: string;
  dag_result?: DagResult;
  mst_result?: MstResult;
  tsp_result?: TspResult;
  max_flow_result?: MaxFlowResult;
  coloring_result?: ColoringResult;
  computation_time_ms: number;
  warnings: string[];
  formula: string;
}

function euclideanDist(a: GraphNode, b: GraphNode): number {
  const dx = (a.position?.x ?? 0) - (b.position?.x ?? 0);
  const dy = (a.position?.y ?? 0) - (b.position?.y ?? 0);
  const dz = (a.position?.z ?? 0) - (b.position?.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function buildUndirectedAdj(ids: string[], edges: GraphEdge[]): Map<string, Array<{ to: string; weight: number }>> {
  const adj = new Map<string, Array<{ to: string; weight: number }>>();
  for (const id of ids) adj.set(id, []);
  for (const e of edges) {
    adj.get(e.from)?.push({ to: e.to, weight: e.weight });
    adj.get(e.to)?.push({ to: e.from, weight: e.weight });
  }
  return adj;
}

export class GraphTheoryEngine {
  /** Main dispatcher — selects algorithm and returns unified result. */
  solve(input: GraphInput): GraphResult {
    const t0 = performance.now();
    const warnings: string[] = [];
    if (input.nodes.length === 0) warnings.push('Empty node set — returning trivial result');
    let result: GraphResult;
    switch (input.algorithm) {
      case 'dag_schedule': result = this.solveDAG(input, warnings); break;
      case 'mst':          result = this.solveMST(input, warnings); break;
      case 'tsp':          result = this.solveTSP(input, warnings); break;
      case 'max_flow':     result = this.solveMaxFlow(input, warnings); break;
      case 'coloring':     result = this.solveColoring(input, warnings); break;
      default: throw new Error(`Unknown algorithm: ${(input as GraphInput).algorithm}`);
    }
    result.computation_time_ms = Math.round((performance.now() - t0) * 1000) / 1000;
    return result;
  }

  /** Kahn's algorithm for topological sort. Throws on cycle. */
  topologicalSort(nodes: GraphNode[], edges: GraphEdge[]): string[] {
    const ids = nodes.map(n => n.id);
    const inDeg = new Map<string, number>();
    const adj = new Map<string, string[]>();
    for (const id of ids) { inDeg.set(id, 0); adj.set(id, []); }
    for (const e of edges) {
      adj.get(e.from)?.push(e.to);
      inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1);
    }
    const queue: string[] = [];
    for (const [id, deg] of inDeg) if (deg === 0) queue.push(id);
    const order: string[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      order.push(u);
      for (const v of adj.get(u) ?? []) {
        const nd = (inDeg.get(v) ?? 1) - 1;
        inDeg.set(v, nd);
        if (nd === 0) queue.push(v);
      }
    }
    if (order.length !== ids.length) throw new Error('Cycle detected — graph is not a DAG');
    return order;
  }

  /** CPM forward/backward pass. Returns critical path, makespan, ES/LS/slack. */
  criticalPath(nodes: GraphNode[], edges: GraphEdge[]): DagResult {
    const order = this.topologicalSort(nodes, edges);
    const nw = new Map(nodes.map(n => [n.id, n.weight ?? 0]));
    const outEdges = new Map<string, GraphEdge[]>();
    for (const id of order) outEdges.set(id, []);
    for (const e of edges) outEdges.get(e.from)?.push(e);
    const es = new Map<string, number>();
    for (const id of order) es.set(id, 0);
    for (const id of order) {
      const finish = (es.get(id) ?? 0) + (nw.get(id) ?? 0);
      for (const e of outEdges.get(id) ?? []) {
        const c = finish + e.weight;
        if (c > (es.get(e.to) ?? 0)) es.set(e.to, c);
      }
    }
    let makespan = 0;
    for (const id of order) {
      const f = (es.get(id) ?? 0) + (nw.get(id) ?? 0);
      if (f > makespan) makespan = f;
    }
    const ls = new Map<string, number>();
    for (const id of order) ls.set(id, makespan - (nw.get(id) ?? 0));
    for (let i = order.length - 1; i >= 0; i--) {
      const id = order[i];
      for (const e of outEdges.get(id) ?? []) {
        const c = (ls.get(e.to) ?? 0) - e.weight - (nw.get(id) ?? 0);
        if (c < (ls.get(id) ?? Infinity)) ls.set(id, c);
      }
    }
    const esRec: Record<string, number> = {};
    const lsRec: Record<string, number> = {};
    const slack: Record<string, number> = {};
    for (const id of order) {
      esRec[id] = es.get(id) ?? 0;
      lsRec[id] = ls.get(id) ?? 0;
      slack[id] = lsRec[id] - esRec[id];
    }
    return {
      topological_order: order, critical_path: order.filter(id => slack[id] === 0),
      critical_path_weight: makespan, earliest_start: esRec, latest_start: lsRec, slack,
    };
  }

  private solveDAG(input: GraphInput, warnings: string[]): GraphResult {
    const formula = 'Kahn topological sort + CPM: ES(j)=max{ES(i)+w(i)+w(i,j)}, LS(i)=min{LS(j)-w(i,j)-w(i)}';
    if (input.nodes.length === 0) return { algorithm: 'dag_schedule', computation_time_ms: 0, warnings, formula };
    return { algorithm: 'dag_schedule', dag_result: this.criticalPath(input.nodes, input.edges), computation_time_ms: 0, warnings, formula };
  }

  /** Prim's MST algorithm. Returns selected edges for minimum spanning tree. */
  primMST(nodes: GraphNode[], edges: GraphEdge[]): GraphEdge[] {
    if (nodes.length === 0) return [];
    const ids = new Set(nodes.map(n => n.id));
    const adj = buildUndirectedAdj([...ids], edges);
    const inTree = new Set<string>([nodes[0].id]);
    const mstEdges: GraphEdge[] = [];
    while (inTree.size < ids.size) {
      let best: GraphEdge | null = null;
      let bestW = Infinity;
      for (const u of inTree) {
        for (const { to, weight } of adj.get(u) ?? []) {
          if (!inTree.has(to) && weight < bestW) { bestW = weight; best = { from: u, to, weight }; }
        }
      }
      if (!best) break;
      mstEdges.push(best);
      inTree.add(best.to);
    }
    return mstEdges;
  }

  private solveMST(input: GraphInput, warnings: string[]): GraphResult {
    const formula = "Prim's algorithm: greedily add minimum-weight edge crossing the cut (V_tree, V\\V_tree)";
    if (input.nodes.length === 0) return { algorithm: 'mst', computation_time_ms: 0, warnings, formula };
    const mstEdges = this.primMST(input.nodes, input.edges);
    const treeNodes = new Set<string>();
    let total = 0;
    for (const e of mstEdges) { treeNodes.add(e.from); treeNodes.add(e.to); total += e.weight; }
    if (treeNodes.size < input.nodes.length)
      warnings.push(`Graph is disconnected — MST spans ${treeNodes.size}/${input.nodes.length} nodes`);
    return {
      algorithm: 'mst',
      mst_result: { edges: mstEdges, total_weight: Math.round(total * 1e6) / 1e6, tree_nodes: [...treeNodes] },
      computation_time_ms: 0, warnings, formula,
    };
  }

  /** Nearest-neighbor heuristic for TSP. Uses node positions for Euclidean distances. */
  tspNearestNeighbor(nodes: GraphNode[]): string[] {
    if (nodes.length <= 1) return nodes.map(n => n.id);
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const remaining = new Set(nodes.map(n => n.id));
    const tour: string[] = [];
    let cur = nodes[0].id;
    tour.push(cur); remaining.delete(cur);
    while (remaining.size > 0) {
      let nearest = ''; let bestD = Infinity;
      for (const c of remaining) {
        const d = euclideanDist(nodeMap.get(cur)!, nodeMap.get(c)!);
        if (d < bestD) { bestD = d; nearest = c; }
      }
      tour.push(nearest); remaining.delete(nearest); cur = nearest;
    }
    return tour;
  }

  /** 2-opt improvement heuristic — reverses sub-tours to reduce total distance. */
  twoOpt(tour: string[], distFn: (a: string, b: string) => number): string[] {
    const n = tour.length;
    if (n < 4) return [...tour];
    let improved = true;
    let best = [...tour];
    while (improved) {
      improved = false;
      for (let i = 0; i < n - 1; i++) {
        for (let j = i + 2; j < n; j++) {
          if ((j + 1) % n === i) continue;
          const a = best[i], b = best[i + 1], c = best[j], d = best[(j + 1) % n];
          if (distFn(a, c) + distFn(b, d) < distFn(a, b) + distFn(c, d) - 1e-10) {
            best = [...best.slice(0, i + 1), ...best.slice(i + 1, j + 1).reverse(), ...best.slice(j + 1)];
            improved = true;
          }
        }
      }
    }
    return best;
  }

  private solveTSP(input: GraphInput, warnings: string[]): GraphResult {
    const formula = 'Nearest-neighbor O(n^2) + 2-opt local search: reverse sub-tour if delta_d < 0';
    if (input.nodes.length === 0) return { algorithm: 'tsp', computation_time_ms: 0, warnings, formula };
    const nodeMap = new Map(input.nodes.map(n => [n.id, n]));
    const distFn = (a: string, b: string) => euclideanDist(nodeMap.get(a)!, nodeMap.get(b)!);
    const tourDist = (t: string[]) => {
      let d = 0;
      for (let i = 0; i < t.length; i++) d += distFn(t[i], t[(i + 1) % t.length]);
      return d;
    };
    const nnTour = this.tspNearestNeighbor(input.nodes);
    const nnDist = tourDist(nnTour);
    const optimized = this.twoOpt(nnTour, distFn);
    const optDist = tourDist(optimized);
    const improv = nnDist > 0 ? ((nnDist - optDist) / nnDist) * 100 : 0;
    if (input.nodes.some(n => !n.position)) warnings.push('Some nodes lack position — distances default to origin');
    return {
      algorithm: 'tsp',
      tsp_result: { tour: optimized, total_distance: Math.round(optDist * 1e6) / 1e6, improvement_over_naive_pct: Math.round(improv * 100) / 100 },
      computation_time_ms: 0, warnings, formula,
    };
  }

  /** Edmonds-Karp algorithm (Ford-Fulkerson with BFS). Returns max flow and per-edge flows. */
  edmondsKarp(
    nodes: GraphNode[], edges: GraphEdge[], source: string, sink: string
  ): { maxFlow: number; flows: Map<string, number> } {
    const key = (u: string, v: string) => `${u}->${v}`;
    const cap = new Map<string, number>();
    const adj = new Map<string, Set<string>>();
    for (const n of nodes) adj.set(n.id, new Set());
    for (const e of edges) {
      const c = e.capacity ?? e.weight;
      cap.set(key(e.from, e.to), (cap.get(key(e.from, e.to)) ?? 0) + c);
      if (!cap.has(key(e.to, e.from))) cap.set(key(e.to, e.from), 0);
      adj.get(e.from)?.add(e.to); adj.get(e.to)?.add(e.from);
    }
    let totalFlow = 0;
    const flowMap = new Map<string, number>();
    const bfs = (): Map<string, string> | null => {
      const parent = new Map<string, string>();
      const visited = new Set<string>([source]);
      const q = [source];
      while (q.length > 0) {
        const u = q.shift()!;
        if (u === sink) return parent;
        for (const v of adj.get(u) ?? []) {
          if (!visited.has(v) && (cap.get(key(u, v)) ?? 0) > 0) { visited.add(v); parent.set(v, u); q.push(v); }
        }
      }
      return null;
    };
    let parentMap = bfs();
    while (parentMap !== null) {
      let bottleneck = Infinity;
      let v = sink;
      while (v !== source) { const u = parentMap.get(v)!; bottleneck = Math.min(bottleneck, cap.get(key(u, v)) ?? 0); v = u; }
      v = sink;
      while (v !== source) {
        const u = parentMap.get(v)!;
        cap.set(key(u, v), (cap.get(key(u, v)) ?? 0) - bottleneck);
        cap.set(key(v, u), (cap.get(key(v, u)) ?? 0) + bottleneck);
        flowMap.set(key(u, v), (flowMap.get(key(u, v)) ?? 0) + bottleneck);
        v = u;
      }
      totalFlow += bottleneck;
      parentMap = bfs();
    }
    return { maxFlow: totalFlow, flows: flowMap };
  }

  private solveMaxFlow(input: GraphInput, warnings: string[]): GraphResult {
    const formula = 'Edmonds-Karp: BFS augmenting paths, O(VE^2). Max-flow = min-cut (Ford-Fulkerson theorem)';
    if (!input.source || !input.sink) throw new Error('max_flow requires source and sink node IDs');
    if (input.nodes.length === 0) return { algorithm: 'max_flow', computation_time_ms: 0, warnings, formula };
    const { maxFlow, flows } = this.edmondsKarp(input.nodes, input.edges, input.source, input.sink);
    const flowEdges: MaxFlowResult['flow_edges'] = [];
    for (const e of input.edges) {
      const f = flows.get(`${e.from}->${e.to}`) ?? 0;
      if (f > 0) flowEdges.push({ from: e.from, to: e.to, flow: f, capacity: e.capacity ?? e.weight });
    }
    // Min-cut: BFS on residual graph from source to find reachable set
    const ek = (u: string, v: string) => `${u}->${v}`;
    const resCap = new Map<string, number>();
    const adj2 = new Map<string, Set<string>>();
    for (const n of input.nodes) adj2.set(n.id, new Set());
    for (const e of input.edges) {
      const c = e.capacity ?? e.weight, f = flows.get(ek(e.from, e.to)) ?? 0;
      resCap.set(ek(e.from, e.to), c - f);
      resCap.set(ek(e.to, e.from), (resCap.get(ek(e.to, e.from)) ?? 0) + f);
      adj2.get(e.from)?.add(e.to); adj2.get(e.to)?.add(e.from);
    }
    const reachable = new Set<string>([input.source]);
    const queue = [input.source];
    while (queue.length > 0) {
      const u = queue.shift()!;
      for (const v of adj2.get(u) ?? [])
        if (!reachable.has(v) && (resCap.get(ek(u, v)) ?? 0) > 0) { reachable.add(v); queue.push(v); }
    }
    return {
      algorithm: 'max_flow',
      max_flow_result: { max_flow_value: maxFlow, flow_edges: flowEdges, min_cut_edges: input.edges.filter(e => reachable.has(e.from) && !reachable.has(e.to)) },
      computation_time_ms: 0, warnings, formula,
    };
  }

  /** Greedy graph coloring with largest-degree-first ordering. */
  greedyColoring(nodes: GraphNode[], edges: GraphEdge[]): Record<string, number> {
    const adj = buildUndirectedAdj(nodes.map(n => n.id), edges);
    const colors: Record<string, number> = {};
    const sorted = [...nodes].sort((a, b) => (adj.get(b.id)?.length ?? 0) - (adj.get(a.id)?.length ?? 0));
    for (const node of sorted) {
      const used = new Set<number>();
      for (const { to } of adj.get(node.id) ?? []) if (colors[to] !== undefined) used.add(colors[to]);
      let c = 0;
      while (used.has(c)) c++;
      colors[node.id] = c;
    }
    return colors;
  }

  private solveColoring(input: GraphInput, warnings: string[]): GraphResult {
    const formula = "Greedy coloring (largest-degree-first): chi(G) <= Delta(G)+1 (Brook's theorem)";
    if (input.nodes.length === 0) return { algorithm: 'coloring', computation_time_ms: 0, warnings, formula };
    const colors = this.greedyColoring(input.nodes, input.edges);
    const colorGroups: Record<number, string[]> = {};
    let chromatic = 0;
    for (const [id, c] of Object.entries(colors)) {
      if (!colorGroups[c]) colorGroups[c] = [];
      colorGroups[c].push(id);
      if (c + 1 > chromatic) chromatic = c + 1;
    }
    return {
      algorithm: 'coloring',
      coloring_result: { colors, chromatic_number: chromatic, color_groups: colorGroups },
      computation_time_ms: 0, warnings, formula,
    };
  }
}

export const graphTheoryEngine = new GraphTheoryEngine();
