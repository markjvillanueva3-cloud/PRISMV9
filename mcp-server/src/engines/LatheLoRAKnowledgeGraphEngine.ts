/**
 * LatheLoRAKnowledgeGraphEngine — LATHE-LORA-MS0 U-LLR39
 * =======================================================
 *
 * Builds knowledge graph from mined programs and extracted tribal tips.
 * Captures relationships between materials, tools, operations, and parameters.
 *
 * Features:
 *   - Node/edge graph structure
 *   - Typed relations (uses, requires, conflicts_with, etc.)
 *   - Path queries
 *   - Centrality scoring
 *
 * @module engines/LatheLoRAKnowledgeGraphEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Node type */
export type NodeType =
  | "material"
  | "tool"
  | "operation"
  | "parameter"
  | "strategy"
  | "condition";

/** Edge type */
export type EdgeType =
  | "uses"
  | "requires"
  | "conflicts_with"
  | "recommended_for"
  | "alternative_to"
  | "produces"
  | "caused_by";

/** Graph node */
export interface KnowledgeNode {
  id: string;
  type: NodeType;
  name: string;
  properties: Record<string, unknown>;
  created_at: number;
}

/** Graph edge */
export interface KnowledgeEdge {
  id: string;
  from: string;
  to: string;
  relation: EdgeType;
  weight: number;
  evidence_count: number;
  properties?: Record<string, unknown>;
}

/** Graph stats */
export interface GraphStats {
  total_nodes: number;
  total_edges: number;
  nodes_by_type: Record<string, number>;
  edges_by_relation: Record<string, number>;
  avg_degree: number;
  most_connected?: { id: string; name: string; degree: number };
}

/** Engine configuration */
export interface GraphConfig {
  max_nodes: number;
  max_edges: number;
  min_edge_weight: number;
  auto_merge_duplicates: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: GraphConfig = {
  max_nodes: 10000,
  max_edges: 50000,
  min_edge_weight: 0.1,
  auto_merge_duplicates: true,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAKnowledgeGraphEngine {
  private config: GraphConfig = DEFAULT_CONFIG;
  private nodes: Map<string, KnowledgeNode> = new Map();
  private edges: Map<string, KnowledgeEdge> = new Map();

  /**
   * Set configuration
   */
  setConfig(config: Partial<GraphConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): GraphConfig {
    return { ...this.config };
  }

  /**
   * Add node (or merge if duplicate exists)
   */
  addNode(type: NodeType, name: string, properties: Record<string, unknown> = {}): KnowledgeNode {
    // Check for duplicates
    if (this.config.auto_merge_duplicates) {
      for (const existing of this.nodes.values()) {
        if (existing.type === type && existing.name.toLowerCase() === name.toLowerCase()) {
          Object.assign(existing.properties, properties);
          return existing;
        }
      }
    }

    if (this.nodes.size >= this.config.max_nodes) {
      throw new Error(`Max nodes exceeded: ${this.config.max_nodes}`);
    }

    const node: KnowledgeNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      name,
      properties,
      created_at: Date.now(),
    };

    this.nodes.set(node.id, node);
    return node;
  }

  /**
   * Add edge
   */
  addEdge(
    fromId: string,
    toId: string,
    relation: EdgeType,
    weight: number = 1.0,
    properties?: Record<string, unknown>,
  ): KnowledgeEdge {
    if (!this.nodes.has(fromId)) throw new Error(`Node not found: ${fromId}`);
    if (!this.nodes.has(toId)) throw new Error(`Node not found: ${toId}`);

    // Merge with existing edge of same type between same nodes
    for (const edge of this.edges.values()) {
      if (edge.from === fromId && edge.to === toId && edge.relation === relation) {
        edge.weight = (edge.weight * edge.evidence_count + weight) / (edge.evidence_count + 1);
        edge.evidence_count++;
        if (properties) Object.assign(edge.properties || {}, properties);
        return edge;
      }
    }

    if (this.edges.size >= this.config.max_edges) {
      throw new Error(`Max edges exceeded: ${this.config.max_edges}`);
    }

    const edge: KnowledgeEdge = {
      id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from: fromId,
      to: toId,
      relation,
      weight,
      evidence_count: 1,
      properties,
    };

    this.edges.set(edge.id, edge);
    return edge;
  }

  /**
   * Get node by ID
   */
  getNode(nodeId: string): KnowledgeNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Find nodes by type
   */
  findNodesByType(type: NodeType): KnowledgeNode[] {
    return Array.from(this.nodes.values()).filter(n => n.type === type);
  }

  /**
   * Find nodes by name (fuzzy)
   */
  findNodesByName(name: string): KnowledgeNode[] {
    const lower = name.toLowerCase();
    return Array.from(this.nodes.values()).filter(n =>
      n.name.toLowerCase().includes(lower)
    );
  }

  /**
   * Get neighbors of a node
   */
  getNeighbors(nodeId: string, relation?: EdgeType): Array<{
    node: KnowledgeNode;
    edge: KnowledgeEdge;
    direction: "outgoing" | "incoming";
  }> {
    const result: Array<{ node: KnowledgeNode; edge: KnowledgeEdge; direction: "outgoing" | "incoming" }> = [];

    for (const edge of this.edges.values()) {
      if (relation && edge.relation !== relation) continue;
      if (edge.weight < this.config.min_edge_weight) continue;

      if (edge.from === nodeId) {
        const neighbor = this.nodes.get(edge.to);
        if (neighbor) result.push({ node: neighbor, edge, direction: "outgoing" });
      } else if (edge.to === nodeId) {
        const neighbor = this.nodes.get(edge.from);
        if (neighbor) result.push({ node: neighbor, edge, direction: "incoming" });
      }
    }

    return result;
  }

  /**
   * Get degree of a node (count of connected edges)
   */
  getDegree(nodeId: string): number {
    let degree = 0;
    for (const edge of this.edges.values()) {
      if (edge.from === nodeId || edge.to === nodeId) degree++;
    }
    return degree;
  }

  /**
   * Find shortest path between two nodes (BFS)
   */
  findPath(fromId: string, toId: string, maxDepth: number = 5): KnowledgeNode[] | null {
    if (fromId === toId) return [this.nodes.get(fromId)!];

    const visited = new Set<string>();
    const queue: Array<{ id: string; path: string[] }> = [{ id: fromId, path: [fromId] }];

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;

      if (path.length > maxDepth) continue;
      if (visited.has(id)) continue;
      visited.add(id);

      for (const edge of this.edges.values()) {
        if (edge.weight < this.config.min_edge_weight) continue;

        let nextId: string | null = null;
        if (edge.from === id && !visited.has(edge.to)) nextId = edge.to;
        else if (edge.to === id && !visited.has(edge.from)) nextId = edge.from;

        if (nextId) {
          const newPath = [...path, nextId];
          if (nextId === toId) {
            return newPath.map(nid => this.nodes.get(nid)!).filter(Boolean);
          }
          queue.push({ id: nextId, path: newPath });
        }
      }
    }

    return null;
  }

  /**
   * Calculate centrality (normalized degree)
   */
  getCentrality(): Map<string, number> {
    const centrality = new Map<string, number>();
    const maxPossible = this.nodes.size - 1;

    for (const nodeId of this.nodes.keys()) {
      const degree = this.getDegree(nodeId);
      centrality.set(nodeId, maxPossible > 0 ? degree / maxPossible : 0);
    }

    return centrality;
  }

  /**
   * Get most connected nodes
   */
  getTopConnected(limit: number = 10): Array<{ node: KnowledgeNode; degree: number }> {
    return Array.from(this.nodes.values())
      .map(node => ({ node, degree: this.getDegree(node.id) }))
      .sort((a, b) => b.degree - a.degree)
      .slice(0, limit);
  }

  /**
   * Get graph stats
   */
  getStats(): GraphStats {
    const nodesByType: Record<string, number> = {};
    for (const n of this.nodes.values()) {
      nodesByType[n.type] = (nodesByType[n.type] || 0) + 1;
    }

    const edgesByRelation: Record<string, number> = {};
    for (const e of this.edges.values()) {
      edgesByRelation[e.relation] = (edgesByRelation[e.relation] || 0) + 1;
    }

    const totalDegree = Array.from(this.nodes.keys()).reduce(
      (s, id) => s + this.getDegree(id),
      0,
    );
    const avgDegree = this.nodes.size > 0 ? totalDegree / this.nodes.size : 0;

    const topConnected = this.getTopConnected(1);
    const mostConnected = topConnected.length > 0
      ? { id: topConnected[0].node.id, name: topConnected[0].node.name, degree: topConnected[0].degree }
      : undefined;

    return {
      total_nodes: this.nodes.size,
      total_edges: this.edges.size,
      nodes_by_type: nodesByType,
      edges_by_relation: edgesByRelation,
      avg_degree: avgDegree,
      most_connected: mostConnected,
    };
  }

  /**
   * Get summary
   */
  getSummary(): string {
    const stats = this.getStats();
    const lines = [
      "Knowledge Graph Summary",
      "=======================",
      `Nodes: ${stats.total_nodes}`,
      `Edges: ${stats.total_edges}`,
      `Avg Degree: ${stats.avg_degree.toFixed(2)}`,
    ];
    if (stats.most_connected) {
      lines.push(`Most Connected: ${stats.most_connected.name} (${stats.most_connected.degree})`);
    }
    lines.push("", "Node Types:");
    for (const [type, count] of Object.entries(stats.nodes_by_type)) {
      lines.push(`  ${type}: ${count}`);
    }
    lines.push("", "Edge Relations:");
    for (const [rel, count] of Object.entries(stats.edges_by_relation)) {
      lines.push(`  ${rel}: ${count}`);
    }
    return lines.join("\n");
  }

  /**
   * Delete node (and its edges)
   */
  deleteNode(nodeId: string): boolean {
    if (!this.nodes.has(nodeId)) return false;
    for (const [edgeId, edge] of this.edges.entries()) {
      if (edge.from === nodeId || edge.to === nodeId) {
        this.edges.delete(edgeId);
      }
    }
    return this.nodes.delete(nodeId);
  }

  /**
   * Clear graph
   */
  clear(): void {
    this.nodes.clear();
    this.edges.clear();
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.nodes.clear();
    this.edges.clear();
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAKnowledgeGraphEngine = new LatheLoRAKnowledgeGraphEngine();
