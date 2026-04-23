/**
 * CircularDependencyEngine — Tarjan's SCC for Deadlock Prevention
 *
 * Detects circular dependencies in:
 * - Hook → Engine → File → Hook cycles
 * - Engine import graphs
 * - Dispatcher → Engine → Dispatcher chains
 *
 * Uses Tarjan's algorithm: O(V + E) complexity
 *
 * Theory: A directed graph has a cycle iff it has a strongly connected
 * component (SCC) with more than one vertex.
 *
 * @module Phase0.25 Scientific Foundations
 * @see UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-ADDENDUM-2026-04-18.md §V
 */

export interface DependencyNode {
  id: string;
  type: 'engine' | 'hook' | 'dispatcher' | 'file' | 'action' | 'skill';
  path?: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'imports' | 'calls' | 'triggers' | 'writes' | 'reads';
}

export interface StronglyConnectedComponent {
  nodes: string[];
  edges: DependencyEdge[];
  isCycle: boolean;  // True if size > 1
}

export interface CycleAnalysis {
  hasCycles: boolean;
  cycles: StronglyConnectedComponent[];
  criticalPaths: string[][];  // Cycles involving critical nodes
  topologicalOrder: string[] | null;  // Null if cycles exist
  stats: {
    totalNodes: number;
    totalEdges: number;
    numSCCs: number;
    largestSCCSize: number;
  };
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: Map<string, Set<string>>;  // adjacency list
  reverseEdges: Map<string, Set<string>>;  // for reverse lookup
}

class CircularDependencyEngineImpl {
  private graph: DependencyGraph;
  private criticalNodes: Set<string>;

  constructor() {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      reverseEdges: new Map()
    };
    this.criticalNodes = new Set();
  }

  /**
   * Add a node to the dependency graph
   */
  addNode(node: DependencyNode): void {
    this.graph.nodes.set(node.id, node);
    if (!this.graph.edges.has(node.id)) {
      this.graph.edges.set(node.id, new Set());
    }
    if (!this.graph.reverseEdges.has(node.id)) {
      this.graph.reverseEdges.set(node.id, new Set());
    }
  }

  /**
   * Add an edge to the dependency graph
   */
  addEdge(from: string, to: string, _type: DependencyEdge['type'] = 'imports'): void {
    // Ensure nodes exist
    if (!this.graph.edges.has(from)) {
      this.graph.edges.set(from, new Set());
    }
    if (!this.graph.reverseEdges.has(to)) {
      this.graph.reverseEdges.set(to, new Set());
    }

    this.graph.edges.get(from)!.add(to);
    this.graph.reverseEdges.get(to)!.add(from);
  }

  /**
   * Mark a node as critical (cycles involving it are more severe)
   */
  markCritical(nodeId: string): void {
    this.criticalNodes.add(nodeId);
  }

  /**
   * Tarjan's algorithm for finding all SCCs
   */
  findSCCs(): StronglyConnectedComponent[] {
    const index = new Map<string, number>();
    const lowlink = new Map<string, number>();
    const onStack = new Set<string>();
    const stack: string[] = [];
    const sccs: StronglyConnectedComponent[] = [];
    let idx = 0;

    const strongconnect = (v: string): void => {
      index.set(v, idx);
      lowlink.set(v, idx);
      idx++;
      stack.push(v);
      onStack.add(v);

      const successors = this.graph.edges.get(v) || new Set();
      for (const w of successors) {
        if (!index.has(w)) {
          strongconnect(w);
          lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
        } else if (onStack.has(w)) {
          lowlink.set(v, Math.min(lowlink.get(v)!, index.get(w)!));
        }
      }

      // If v is a root node, pop the SCC
      if (lowlink.get(v) === index.get(v)) {
        const scc: string[] = [];
        let w: string;
        do {
          w = stack.pop()!;
          onStack.delete(w);
          scc.push(w);
        } while (w !== v);

        // Find edges within SCC
        const sccSet = new Set(scc);
        const internalEdges: DependencyEdge[] = [];
        for (const node of scc) {
          const successors = this.graph.edges.get(node) || new Set();
          for (const succ of successors) {
            if (sccSet.has(succ)) {
              internalEdges.push({ from: node, to: succ, type: 'imports' });
            }
          }
        }

        sccs.push({
          nodes: scc,
          edges: internalEdges,
          isCycle: scc.length > 1
        });
      }
    };

    // Run on all nodes
    for (const v of this.graph.nodes.keys()) {
      if (!index.has(v)) {
        strongconnect(v);
      }
    }

    return sccs;
  }

  /**
   * Full cycle analysis
   */
  analyze(): CycleAnalysis {
    const sccs = this.findSCCs();
    const cycles = sccs.filter(scc => scc.isCycle);

    // Find critical paths (cycles involving critical nodes)
    const criticalPaths: string[][] = [];
    for (const cycle of cycles) {
      if (cycle.nodes.some(n => this.criticalNodes.has(n))) {
        criticalPaths.push(cycle.nodes);
      }
    }

    // Attempt topological sort (only possible if no cycles)
    let topologicalOrder: string[] | null = null;
    if (cycles.length === 0) {
      topologicalOrder = this.topologicalSort();
    }

    // Compute stats
    const totalNodes = this.graph.nodes.size;
    let totalEdges = 0;
    for (const edges of this.graph.edges.values()) {
      totalEdges += edges.size;
    }

    const largestSCCSize = sccs.reduce((max, scc) => Math.max(max, scc.nodes.length), 0);

    return {
      hasCycles: cycles.length > 0,
      cycles,
      criticalPaths,
      topologicalOrder,
      stats: {
        totalNodes,
        totalEdges,
        numSCCs: sccs.length,
        largestSCCSize
      }
    };
  }

  /**
   * Kahn's algorithm for topological sort
   */
  topologicalSort(): string[] | null {
    const inDegree = new Map<string, number>();
    const order: string[] = [];
    const queue: string[] = [];

    // Initialize in-degrees
    for (const node of this.graph.nodes.keys()) {
      inDegree.set(node, 0);
    }
    for (const [, edges] of this.graph.edges) {
      for (const to of edges) {
        inDegree.set(to, (inDegree.get(to) || 0) + 1);
      }
    }

    // Start with zero in-degree nodes
    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    while (queue.length > 0) {
      const node = queue.shift()!;
      order.push(node);

      const successors = this.graph.edges.get(node) || new Set();
      for (const succ of successors) {
        const newDegree = (inDegree.get(succ) || 0) - 1;
        inDegree.set(succ, newDegree);
        if (newDegree === 0) {
          queue.push(succ);
        }
      }
    }

    // If we didn't process all nodes, there's a cycle
    return order.length === this.graph.nodes.size ? order : null;
  }

  /**
   * Find all paths from source to target (for debugging cycles)
   */
  findPaths(source: string, target: string, maxDepth: number = 10): string[][] {
    const paths: string[][] = [];
    const visited = new Set<string>();

    const dfs = (current: string, path: string[]): void => {
      if (path.length > maxDepth) return;
      if (current === target && path.length > 1) {
        paths.push([...path]);
        return;
      }

      visited.add(current);
      const successors = this.graph.edges.get(current) || new Set();
      for (const next of successors) {
        if (!visited.has(next) || next === target) {
          dfs(next, [...path, next]);
        }
      }
      visited.delete(current);
    };

    dfs(source, [source]);
    return paths;
  }

  /**
   * Get direct dependencies of a node
   */
  getDependencies(nodeId: string): string[] {
    return Array.from(this.graph.edges.get(nodeId) || new Set());
  }

  /**
   * Get reverse dependencies (who depends on this node)
   */
  getDependents(nodeId: string): string[] {
    return Array.from(this.graph.reverseEdges.get(nodeId) || new Set());
  }

  /**
   * Compute impact radius (transitive closure size)
   */
  getImpactRadius(nodeId: string): { impacted: string[]; depth: number } {
    const impacted = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [{ id: nodeId, depth: 0 }];
    let maxDepth = 0;

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      const dependents = this.graph.reverseEdges.get(id) || new Set();

      for (const dep of dependents) {
        if (!impacted.has(dep)) {
          impacted.add(dep);
          maxDepth = Math.max(maxDepth, depth + 1);
          queue.push({ id: dep, depth: depth + 1 });
        }
      }
    }

    return { impacted: Array.from(impacted), depth: maxDepth };
  }

  /**
   * Build graph from file system scan (stub for integration)
   */
  async buildFromFileSystem(engineDir: string, _dispatcherDir: string): Promise<void> {
    // This would scan actual files and parse imports
    // For now, just a placeholder that validates the paths exist
    if (!engineDir) {
      throw new Error('Engine directory required');
    }
    // Implementation would use fs/glob to scan and parse
  }

  /**
   * Export graph for visualization (DOT format)
   */
  toDot(): string {
    let dot = 'digraph Dependencies {\n';
    dot += '  rankdir=LR;\n';
    dot += '  node [shape=box];\n';

    // Add nodes with colors by type
    for (const [id, node] of this.graph.nodes) {
      const color = this.getNodeColor(node.type);
      const critical = this.criticalNodes.has(id) ? ', penwidth=3' : '';
      dot += `  "${id}" [fillcolor="${color}", style=filled${critical}];\n`;
    }

    // Add edges
    for (const [from, edges] of this.graph.edges) {
      for (const to of edges) {
        dot += `  "${from}" -> "${to}";\n`;
      }
    }

    dot += '}\n';
    return dot;
  }

  private getNodeColor(type: DependencyNode['type']): string {
    const colors: Record<DependencyNode['type'], string> = {
      engine: '#a8d8a8',
      hook: '#d8a8a8',
      dispatcher: '#a8a8d8',
      file: '#d8d8a8',
      action: '#d8a8d8',
      skill: '#a8d8d8'
    };
    return colors[type] || '#ffffff';
  }

  /**
   * Reset the graph
   */
  reset(): void {
    this.graph.nodes.clear();
    this.graph.edges.clear();
    this.graph.reverseEdges.clear();
    this.criticalNodes.clear();
  }

  /**
   * Get graph statistics
   */
  getStats(): { nodes: number; edges: number; critical: number } {
    let edges = 0;
    for (const e of this.graph.edges.values()) {
      edges += e.size;
    }
    return {
      nodes: this.graph.nodes.size,
      edges,
      critical: this.criticalNodes.size
    };
  }
}

export const circularDependencyEngine = new CircularDependencyEngineImpl();
export type CircularDependencyEngine = CircularDependencyEngineImpl;
