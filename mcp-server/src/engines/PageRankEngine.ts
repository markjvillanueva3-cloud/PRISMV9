/**
 * PageRankEngine — Graph-Based Engine Importance Scoring
 *
 * USSH Phase 0.25: Scientific Foundations — Graph Theory Enhancement
 *
 * Applies PageRank algorithm to engine dependency graphs:
 *   - Computes importance scores based on dependency structure
 *   - Identifies critical path engines (high centrality)
 *   - Detects orphan engines (no inbound/outbound links)
 *   - Supports personalized PageRank for context-aware scoring
 *
 * Algorithm:
 *   PR(v) = (1-d)/N + d * Σ PR(u)/L(u)  for all u → v
 *   where d = damping factor (typically 0.85)
 *
 * Power iteration convergence:
 *   ||PR(t+1) - PR(t)||₁ < ε
 *
 * @module engines/PageRankEngine
 * @milestone USSH-P0.25/U-SCI04
 */

// ============================================================================
// TYPES
// ============================================================================

export interface GraphNode {
  id: string;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight?: number;
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface PageRankResult {
  scores: Map<string, number>;
  iterations: number;
  converged: boolean;
  residual: number;
  topNodes: { id: string; score: number; label?: string }[];
}

export interface CentralityMetrics {
  pagerank: number;
  in_degree: number;
  out_degree: number;
  betweenness?: number;
  is_hub: boolean;
  is_authority: boolean;
}

export interface GraphAnalysis {
  node_count: number;
  edge_count: number;
  density: number;
  avg_degree: number;
  strongly_connected: boolean;
  orphan_nodes: string[];
  sink_nodes: string[];
  source_nodes: string[];
}

export interface PersonalizationVector {
  nodeId: string;
  weight: number;
}

export interface PageRankConfig {
  damping_factor: number;
  max_iterations: number;
  convergence_threshold: number;
  top_k: number;
  normalize_weights: boolean;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: PageRankConfig = {
  damping_factor: 0.85,
  max_iterations: 100,
  convergence_threshold: 1e-6,
  top_k: 10,
  normalize_weights: true,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class PageRankEngine {
  private config: PageRankConfig;
  private adjacencyList: Map<string, { target: string; weight: number }[]>;
  private reverseAdjacencyList: Map<string, { source: string; weight: number }[]>;
  private nodes: Map<string, GraphNode>;
  private scores: Map<string, number>;

  constructor(config?: Partial<PageRankConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.adjacencyList = new Map();
    this.reverseAdjacencyList = new Map();
    this.nodes = new Map();
    this.scores = new Map();
  }

  /**
   * Load a dependency graph.
   */
  loadGraph(graph: DependencyGraph): void {
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();
    this.nodes.clear();
    this.scores.clear();

    // Add nodes
    for (const node of graph.nodes) {
      this.nodes.set(node.id, node);
      this.adjacencyList.set(node.id, []);
      this.reverseAdjacencyList.set(node.id, []);
    }

    // Add edges
    for (const edge of graph.edges) {
      if (!this.nodes.has(edge.source) || !this.nodes.has(edge.target)) {
        continue; // Skip edges with unknown nodes
      }

      const weight = edge.weight ?? 1;
      this.adjacencyList.get(edge.source)!.push({ target: edge.target, weight });
      this.reverseAdjacencyList.get(edge.target)!.push({ source: edge.source, weight });
    }

    // Normalize weights if configured
    if (this.config.normalize_weights) {
      this.normalizeOutWeights();
    }
  }

  /**
   * Compute PageRank scores using power iteration.
   */
  compute(personalization?: PersonalizationVector[]): PageRankResult {
    const N = this.nodes.size;
    if (N === 0) {
      return {
        scores: new Map(),
        iterations: 0,
        converged: true,
        residual: 0,
        topNodes: [],
      };
    }

    const d = this.config.damping_factor;

    // Initialize scores uniformly or with personalization
    const scores = new Map<string, number>();
    const personalVector = new Map<string, number>();

    if (personalization && personalization.length > 0) {
      // Personalized PageRank
      let totalWeight = 0;
      for (const p of personalization) {
        if (this.nodes.has(p.nodeId)) {
          personalVector.set(p.nodeId, p.weight);
          totalWeight += p.weight;
        }
      }
      // Normalize personalization vector
      for (const [id, w] of personalVector) {
        personalVector.set(id, w / totalWeight);
      }
      // Initialize with personalization
      for (const id of this.nodes.keys()) {
        scores.set(id, personalVector.get(id) ?? 0);
      }
    } else {
      // Uniform initialization
      const initial = 1 / N;
      for (const id of this.nodes.keys()) {
        scores.set(id, initial);
      }
    }

    // Power iteration
    let iteration = 0;
    let residual = Infinity;

    while (iteration < this.config.max_iterations && residual > this.config.convergence_threshold) {
      const newScores = new Map<string, number>();
      residual = 0;

      // Compute teleport/personalization base
      const teleportBase = personalization
        ? (1 - d)
        : (1 - d) / N;

      for (const nodeId of this.nodes.keys()) {
        // Sum contributions from incoming edges
        let inSum = 0;
        const inEdges = this.reverseAdjacencyList.get(nodeId) ?? [];

        for (const { source, weight } of inEdges) {
          const outDegree = this.getOutDegree(source);
          if (outDegree > 0) {
            inSum += (scores.get(source) ?? 0) * weight / this.getTotalOutWeight(source);
          }
        }

        // PageRank formula
        let newScore: number;
        if (personalization) {
          const personWeight = personalVector.get(nodeId) ?? 0;
          newScore = (1 - d) * personWeight + d * inSum;
        } else {
          newScore = teleportBase + d * inSum;
        }

        newScores.set(nodeId, newScore);
        residual += Math.abs(newScore - (scores.get(nodeId) ?? 0));
      }

      // Handle dangling nodes (nodes with no outgoing edges)
      const danglingSum = this.computeDanglingSum(scores);
      if (danglingSum > 0) {
        const danglingContrib = d * danglingSum / N;
        for (const nodeId of this.nodes.keys()) {
          newScores.set(nodeId, (newScores.get(nodeId) ?? 0) + danglingContrib);
        }
      }

      // Update scores
      for (const [id, score] of newScores) {
        scores.set(id, score);
      }

      iteration++;
    }

    this.scores = scores;

    // Get top K nodes
    const topNodes = this.getTopNodes(this.config.top_k);

    return {
      scores: new Map(scores),
      iterations: iteration,
      converged: residual <= this.config.convergence_threshold,
      residual,
      topNodes,
    };
  }

  /**
   * Get current PageRank scores.
   */
  getScores(): Map<string, number> {
    return new Map(this.scores);
  }

  /**
   * Get score for a specific node.
   */
  getScore(nodeId: string): number {
    return this.scores.get(nodeId) ?? 0;
  }

  /**
   * Get top K nodes by PageRank score.
   */
  getTopNodes(k: number): { id: string; score: number; label?: string }[] {
    const sorted = [...this.scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, k);

    return sorted.map(([id, score]) => ({
      id,
      score,
      label: this.nodes.get(id)?.label,
    }));
  }

  /**
   * Get centrality metrics for a node.
   */
  getCentralityMetrics(nodeId: string): CentralityMetrics | null {
    if (!this.nodes.has(nodeId)) {
      return null;
    }

    const pagerank = this.scores.get(nodeId) ?? 0;
    const inDegree = this.getInDegree(nodeId);
    const outDegree = this.getOutDegree(nodeId);

    // Hub: high out-degree (depends on many)
    // Authority: high in-degree (many depend on it)
    const avgDegree = this.getAverageDegree();
    const isHub = outDegree > avgDegree * 1.5;
    const isAuthority = inDegree > avgDegree * 1.5;

    return {
      pagerank,
      in_degree: inDegree,
      out_degree: outDegree,
      is_hub: isHub,
      is_authority: isAuthority,
    };
  }

  /**
   * Analyze graph structure.
   */
  analyzeGraph(): GraphAnalysis {
    const nodeCount = this.nodes.size;
    const edgeCount = this.countEdges();
    const maxEdges = nodeCount * (nodeCount - 1);
    const density = maxEdges > 0 ? edgeCount / maxEdges : 0;

    const orphanNodes: string[] = [];
    const sinkNodes: string[] = [];
    const sourceNodes: string[] = [];

    for (const nodeId of this.nodes.keys()) {
      const inDegree = this.getInDegree(nodeId);
      const outDegree = this.getOutDegree(nodeId);

      if (inDegree === 0 && outDegree === 0) {
        orphanNodes.push(nodeId);
      } else if (outDegree === 0) {
        sinkNodes.push(nodeId);
      } else if (inDegree === 0) {
        sourceNodes.push(nodeId);
      }
    }

    return {
      node_count: nodeCount,
      edge_count: edgeCount,
      density,
      avg_degree: this.getAverageDegree(),
      strongly_connected: orphanNodes.length === 0 && sinkNodes.length <= 1,
      orphan_nodes: orphanNodes,
      sink_nodes: sinkNodes,
      source_nodes: sourceNodes,
    };
  }

  /**
   * Find critical path nodes (highest centrality).
   */
  findCriticalNodes(threshold: number = 0.8): string[] {
    if (this.scores.size === 0) {
      return [];
    }

    const maxScore = Math.max(...this.scores.values());
    const criticalThreshold = maxScore * threshold;

    return [...this.scores.entries()]
      .filter(([_, score]) => score >= criticalThreshold)
      .map(([id]) => id);
  }

  /**
   * Compute HITS algorithm (Hubs and Authorities).
   */
  computeHITS(maxIterations: number = 50): {
    hubs: Map<string, number>;
    authorities: Map<string, number>;
  } {
    const N = this.nodes.size;
    if (N === 0) {
      return { hubs: new Map(), authorities: new Map() };
    }

    let hubs = new Map<string, number>();
    let authorities = new Map<string, number>();

    // Initialize uniformly
    for (const id of this.nodes.keys()) {
      hubs.set(id, 1 / N);
      authorities.set(id, 1 / N);
    }

    for (let iter = 0; iter < maxIterations; iter++) {
      const newAuth = new Map<string, number>();
      const newHubs = new Map<string, number>();

      // Update authorities: sum of hub scores of nodes pointing to it
      for (const nodeId of this.nodes.keys()) {
        let authScore = 0;
        const inEdges = this.reverseAdjacencyList.get(nodeId) ?? [];
        for (const { source } of inEdges) {
          authScore += hubs.get(source) ?? 0;
        }
        newAuth.set(nodeId, authScore);
      }

      // Update hubs: sum of authority scores of nodes it points to
      for (const nodeId of this.nodes.keys()) {
        let hubScore = 0;
        const outEdges = this.adjacencyList.get(nodeId) ?? [];
        for (const { target } of outEdges) {
          hubScore += newAuth.get(target) ?? 0;
        }
        newHubs.set(nodeId, hubScore);
      }

      // Normalize
      const authNorm = Math.sqrt([...newAuth.values()].reduce((s, v) => s + v * v, 0));
      const hubNorm = Math.sqrt([...newHubs.values()].reduce((s, v) => s + v * v, 0));

      for (const id of this.nodes.keys()) {
        authorities.set(id, authNorm > 0 ? (newAuth.get(id) ?? 0) / authNorm : 0);
        hubs.set(id, hubNorm > 0 ? (newHubs.get(id) ?? 0) / hubNorm : 0);
      }
    }

    return { hubs, authorities };
  }

  /**
   * Get nodes in topological order (for DAGs).
   */
  topologicalSort(): string[] | null {
    const visited = new Set<string>();
    const stack: string[] = [];
    const inProgress = new Set<string>();

    const visit = (nodeId: string): boolean => {
      if (inProgress.has(nodeId)) {
        return false; // Cycle detected
      }
      if (visited.has(nodeId)) {
        return true;
      }

      inProgress.add(nodeId);

      const outEdges = this.adjacencyList.get(nodeId) ?? [];
      for (const { target } of outEdges) {
        if (!visit(target)) {
          return false;
        }
      }

      inProgress.delete(nodeId);
      visited.add(nodeId);
      stack.push(nodeId);
      return true;
    };

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        if (!visit(nodeId)) {
          return null; // Has cycles
        }
      }
    }

    return stack.reverse();
  }

  /**
   * Detect cycles in the graph.
   */
  detectCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const path: string[] = [];
    const pathSet = new Set<string>();

    const dfs = (nodeId: string): void => {
      if (pathSet.has(nodeId)) {
        // Found cycle
        const cycleStart = path.indexOf(nodeId);
        cycles.push(path.slice(cycleStart).concat(nodeId));
        return;
      }

      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);
      path.push(nodeId);
      pathSet.add(nodeId);

      const outEdges = this.adjacencyList.get(nodeId) ?? [];
      for (const { target } of outEdges) {
        dfs(target);
      }

      path.pop();
      pathSet.delete(nodeId);
    };

    for (const nodeId of this.nodes.keys()) {
      dfs(nodeId);
    }

    return cycles;
  }

  /**
   * Get node count.
   */
  getNodeCount(): number {
    return this.nodes.size;
  }

  /**
   * Get edge count.
   */
  getEdgeCount(): number {
    return this.countEdges();
  }

  /**
   * Check if node exists.
   */
  hasNode(nodeId: string): boolean {
    return this.nodes.has(nodeId);
  }

  /**
   * Get all node IDs.
   */
  getNodeIds(): string[] {
    return [...this.nodes.keys()];
  }

  /**
   * Get configuration.
   */
  getConfig(): PageRankConfig {
    return { ...this.config };
  }

  /**
   * Update configuration.
   */
  setConfig(config: Partial<PageRankConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Reset engine state.
   */
  reset(): void {
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();
    this.nodes.clear();
    this.scores.clear();
  }

  /**
   * Export graph data.
   */
  export(): {
    graph: DependencyGraph;
    scores: [string, number][];
    config: PageRankConfig;
  } {
    const nodes: GraphNode[] = [...this.nodes.values()];
    const edges: GraphEdge[] = [];

    for (const [source, targets] of this.adjacencyList) {
      for (const { target, weight } of targets) {
        edges.push({ source, target, weight });
      }
    }

    return {
      graph: { nodes, edges },
      scores: [...this.scores.entries()],
      config: { ...this.config },
    };
  }

  /**
   * Import graph data.
   */
  import(data: {
    graph: DependencyGraph;
    scores?: [string, number][];
    config?: PageRankConfig;
  }): void {
    if (data.config) {
      this.config = { ...this.config, ...data.config };
    }
    this.loadGraph(data.graph);
    if (data.scores) {
      this.scores = new Map(data.scores);
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private normalizeOutWeights(): void {
    for (const [nodeId, edges] of this.adjacencyList) {
      const totalWeight = edges.reduce((sum, e) => sum + e.weight, 0);
      if (totalWeight > 0) {
        for (const edge of edges) {
          edge.weight = edge.weight / totalWeight;
        }
      }
    }
  }

  private getOutDegree(nodeId: string): number {
    return this.adjacencyList.get(nodeId)?.length ?? 0;
  }

  private getInDegree(nodeId: string): number {
    return this.reverseAdjacencyList.get(nodeId)?.length ?? 0;
  }

  private getTotalOutWeight(nodeId: string): number {
    const edges = this.adjacencyList.get(nodeId) ?? [];
    return edges.reduce((sum, e) => sum + e.weight, 0);
  }

  private computeDanglingSum(scores: Map<string, number>): number {
    let sum = 0;
    for (const nodeId of this.nodes.keys()) {
      if (this.getOutDegree(nodeId) === 0) {
        sum += scores.get(nodeId) ?? 0;
      }
    }
    return sum;
  }

  private countEdges(): number {
    let count = 0;
    for (const edges of this.adjacencyList.values()) {
      count += edges.length;
    }
    return count;
  }

  private getAverageDegree(): number {
    const nodeCount = this.nodes.size;
    if (nodeCount === 0) return 0;
    return this.countEdges() / nodeCount;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const pageRankEngine = new PageRankEngine();
