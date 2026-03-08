/**
 * NetworkFlowEngine — Network flow optimization (max-flow / min-cost)
 *
 * Models: Ford-Fulkerson max-flow (BFS augmenting paths),
 *         min-cut identification, network utilization
 * References: Cormen CLRS Ch.26, Ahuja network flows
 */

export interface FlowEdge {
  from: number;
  to: number;
  capacity: number;
  cost?: number;                       // for min-cost flow
}

export interface NetworkFlowInput {
  num_nodes: number;
  edges: FlowEdge[];
  source: number;                      // 0-indexed
  sink: number;
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface NetworkFlowResult {
  max_flow: AtomicValue;
  min_cut_capacity: AtomicValue;
  num_saturated_edges: AtomicValue;
  avg_utilization_pct: AtomicValue;
  bottleneck_capacity: AtomicValue;
  num_augmenting_paths: AtomicValue;
  total_capacity: AtomicValue;
  flow_efficiency_pct: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class NetworkFlowEngine {
  calculate(input: NetworkFlowInput): NetworkFlowResult {
    const { num_nodes: n, edges, source: s, sink: t } = input;
    const recs: string[] = [];

    // Build adjacency with residual capacity
    const cap: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    const flow: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

    for (const e of edges) {
      cap[e.from][e.to] += e.capacity;
    }

    // BFS-based Ford-Fulkerson (Edmonds-Karp)
    let maxFlow = 0;
    let augPaths = 0;

    while (true) {
      // BFS to find augmenting path
      const parent = Array(n).fill(-1);
      const visited = Array(n).fill(false);
      visited[s] = true;
      const queue = [s];

      while (queue.length > 0) {
        const u = queue.shift()!;
        for (let v = 0; v < n; v++) {
          if (!visited[v] && cap[u][v] - flow[u][v] > 0) {
            visited[v] = true;
            parent[v] = u;
            queue.push(v);
            if (v === t) break;
          }
        }
      }

      if (!visited[t]) break;

      // Find bottleneck
      let pathFlow = Infinity;
      let v = t;
      while (v !== s) {
        const u = parent[v];
        pathFlow = Math.min(pathFlow, cap[u][v] - flow[u][v]);
        v = u;
      }

      // Update flow
      v = t;
      while (v !== s) {
        const u = parent[v];
        flow[u][v] += pathFlow;
        flow[v][u] -= pathFlow;
        v = u;
      }

      maxFlow += pathFlow;
      augPaths++;

      if (augPaths > n * n) break; // safety limit
    }

    // Analysis
    let saturated = 0;
    let totalCap = 0;
    let totalFlow = 0;
    let minEdgeCap = Infinity;

    for (const e of edges) {
      totalCap += e.capacity;
      const f = flow[e.from][e.to];
      totalFlow += Math.max(f, 0);
      if (f >= e.capacity && e.capacity > 0) saturated++;
      if (e.capacity > 0) minEdgeCap = Math.min(minEdgeCap, e.capacity);
    }

    const avgUtil = totalCap > 0 ? (totalFlow / totalCap) * 100 : 0;
    const flowEff = totalCap > 0 ? (maxFlow / totalCap) * 100 : 0;

    const isSafe = maxFlow > 0 && s !== t;

    if (saturated > edges.length * 0.5) recs.push(`${saturated}/${edges.length} edges saturated — network congested`);
    if (maxFlow === 0) recs.push(`Zero max flow — no path from source to sink`);
    if (avgUtil < 30) recs.push(`Low utilization ${avgUtil.toFixed(0)}% — network over-provisioned`);
    if (minEdgeCap < maxFlow * 0.1) recs.push(`Bottleneck edge capacity ${minEdgeCap} — limit flow`);
    if (recs.length === 0) recs.push(`Network flow optimal — max flow=${maxFlow}, ${augPaths} paths, util=${avgUtil.toFixed(0)}%`);

    return {
      max_flow: mkAv(maxFlow, "units", 0, "edmonds_karp"),
      min_cut_capacity: mkAv(maxFlow, "units", 0, "max_flow_min_cut"),
      num_saturated_edges: mkAv(saturated, "count", 0, "capacity_check"),
      avg_utilization_pct: mkAv(Math.round(avgUtil * 10) / 10, "%", avgUtil * 0.05, "flow_capacity"),
      bottleneck_capacity: mkAv(minEdgeCap === Infinity ? 0 : minEdgeCap, "units", 0, "min_edge"),
      num_augmenting_paths: mkAv(augPaths, "count", 0, "bfs"),
      total_capacity: mkAv(totalCap, "units", 0, "sum"),
      flow_efficiency_pct: mkAv(Math.round(flowEff * 10) / 10, "%", flowEff * 0.05, "flow_total"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const networkFlowEngine = new NetworkFlowEngine();
