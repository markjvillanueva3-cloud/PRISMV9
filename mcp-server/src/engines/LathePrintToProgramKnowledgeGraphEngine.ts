/**
 * LathePrintToProgramKnowledgeGraphEngine
 *
 * U-LTH44: Knowledge graph integration for Print-to-Program pipeline.
 * Adds nodes/edges to manufacturing knowledge graph per emission.
 *
 * Graph Structure:
 * - Part nodes: Programs, features, dimensions
 * - Process nodes: Operations, tools, parameters
 * - Outcome nodes: Quality metrics, cycle times, issues
 * - Edges: Causal, temporal, similarity relationships
 *
 * @module engines/LathePrintToProgramKnowledgeGraphEngine
 */

import type { BlueprintIntake } from "./LathePrintIngestPipelineEngine.js";
import type { FeatureRecognitionResult, TurningFeature } from "./LatheFeatureRecognitionEngine.js";
import type { ToolpathPlan, ToolpathSegment } from "./LatheToolpathPlannerEngine.js";
import type { GeneratedProgram } from "./LatheProgramGeneratorEngine.js";
import type { VerificationResult } from "./LatheProgramVerificationEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface KGNode {
  id: string;
  type: "part" | "feature" | "operation" | "tool" | "parameter" | "outcome" | "material" | "machine";
  label: string;
  properties: Record<string, string | number | boolean>;
  embeddings?: number[];
  created_at: string;
  source: string;
}

export interface KGEdge {
  id: string;
  from: string;
  to: string;
  type: "has_feature" | "uses_tool" | "produces" | "requires" | "similar_to" | "precedes" | "causes" | "optimizes";
  weight: number;
  properties: Record<string, string | number>;
  created_at: string;
}

export interface KnowledgeGraph {
  nodes: Map<string, KGNode>;
  edges: Map<string, KGEdge>;
  index: {
    by_type: Map<string, Set<string>>;
    by_label: Map<string, string>;
    embeddings: number[][];
    embedding_ids: string[];
  };
}

export interface GraphQueryResult {
  query_id: string;
  query: string;
  results: Array<{
    node: KGNode;
    relevance: number;
    path?: KGNode[];
  }>;
  execution_time_ms: number;
  total_matches: number;
}

export interface GraphUpdateResult {
  update_id: string;
  nodes_added: number;
  edges_added: number;
  nodes_updated: number;
  processing_time_ms: number;
}

export interface SimilaritySearchResult {
  query_node: string;
  similar_nodes: Array<{
    node: KGNode;
    similarity: number;
    common_features: string[];
  }>;
}

// ============================================================================
// EMBEDDING UTILITIES
// ============================================================================

class EmbeddingGenerator {
  private dimension = 64;

  generateFeatureEmbedding(feature: TurningFeature): number[] {
    const embedding = new Array(this.dimension).fill(0);

    // Type encoding (one-hot style, first 10 dims)
    const types = ["external_diameter", "internal_diameter", "face", "thread", "groove", "chamfer", "radius", "taper", "bore", "undercut"];
    const typeIdx = types.indexOf(feature.type);
    if (typeIdx >= 0) embedding[typeIdx] = 1;

    // Geometry encoding (dims 10-30)
    embedding[10] = (feature.start_z + 100) / 200; // Normalize Z
    embedding[11] = (feature.end_z + 100) / 200;
    embedding[12] = (feature.diameter_mm || 50) / 200;
    embedding[13] = Math.log10((feature.tolerance_mm || 0.1) + 0.001) / 3 + 1;
    embedding[14] = (feature.surface_finish_ra || 3.2) / 10;
    embedding[15] = feature.requires_finishing ? 1 : 0;

    // Normalize
    const mag = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
    return embedding.map(v => mag > 0 ? v / mag : 0);
  }

  generateOperationEmbedding(segment: ToolpathSegment): number[] {
    const embedding = new Array(this.dimension).fill(0);

    // Operation type (dims 0-10)
    const ops = ["rough_turn", "finish_turn", "face", "thread", "groove", "drill", "bore", "part_off", "chamfer", "radius"];
    const opIdx = ops.indexOf(segment.operation);
    if (opIdx >= 0) embedding[opIdx] = 1;

    // Parameters (dims 10-30)
    embedding[10] = segment.spindle_rpm / 5000;
    embedding[11] = segment.feed_mmrev / 1;
    embedding[12] = segment.depth_of_cut_mm / 10;
    embedding[13] = segment.surface_speed_mmin / 500;
    embedding[14] = segment.tool_number / 20;

    const mag = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
    return embedding.map(v => mag > 0 ? v / mag : 0);
  }

  generateProgramEmbedding(program: GeneratedProgram): number[] {
    const embedding = new Array(this.dimension).fill(0);

    // Controller type
    const controllers = ["okuma_osp", "fanuc", "generic_iso", "mazak", "haas"];
    const ctrlIdx = controllers.indexOf(program.controller);
    if (ctrlIdx >= 0) embedding[ctrlIdx] = 1;

    // Program stats
    const lines = program.gcode.split("\n").length;
    embedding[10] = lines / 500;
    embedding[11] = program.tool_calls / 10;
    embedding[12] = program.estimated_runtime_sec / 600;

    const mag = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
    return embedding.map(v => mag > 0 ? v / mag : 0);
  }

  cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom > 0 ? dot / denom : 0;
  }
}

// ============================================================================
// ENGINE
// ============================================================================

class LathePrintToProgramKnowledgeGraphEngine {
  private graph: KnowledgeGraph;
  private embeddingGenerator = new EmbeddingGenerator();
  private updateCounter = 0;
  private queryCounter = 0;

  constructor() {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      index: {
        by_type: new Map(),
        by_label: new Map(),
        embeddings: [],
        embedding_ids: []
      }
    };

    // Initialize type indices
    for (const type of ["part", "feature", "operation", "tool", "parameter", "outcome", "material", "machine"]) {
      this.graph.index.by_type.set(type, new Set());
    }
  }

  /**
   * Add Print-to-Program pipeline output to knowledge graph
   */
  addPipelineOutput(
    intake: BlueprintIntake,
    recognition: FeatureRecognitionResult,
    plan: ToolpathPlan,
    program: GeneratedProgram,
    verification?: VerificationResult
  ): GraphUpdateResult {
    const startTime = Date.now();
    const updateId = `update_${++this.updateCounter}_${Date.now()}`;
    let nodesAdded = 0;
    let edgesAdded = 0;
    let nodesUpdated = 0;

    // Add part node
    const partId = `part_${program.header.program_number}`;
    const partNode = this.addNode({
      id: partId,
      type: "part",
      label: program.header.program_name,
      properties: {
        program_number: program.header.program_number,
        part_number: program.header.part_number || "",
        customer: program.header.customer || "",
        controller: program.controller,
        line_count: program.gcode.split("\n").length,
        cycle_time_sec: program.estimated_cycle_time_sec
      },
      embeddings: this.embeddingGenerator.generateProgramEmbedding(program),
      created_at: new Date().toISOString(),
      source: "print_to_program"
    });
    if (partNode.isNew) nodesAdded++; else nodesUpdated++;

    // Add feature nodes
    for (const feature of recognition.feature_tree.features) {
      const featureId = `feature_${partId}_${feature.id}`;
      const featureNode = this.addNode({
        id: featureId,
        type: "feature",
        label: `${feature.type} Z${feature.start_z}-${feature.end_z}`,
        properties: {
          feature_type: feature.type,
          start_z: feature.start_z,
          end_z: feature.end_z,
          diameter_mm: feature.diameter_mm || 0,
          tolerance_mm: feature.tolerance_mm || 0.1,
          surface_finish_ra: feature.surface_finish_ra || 3.2,
          requires_finishing: feature.requires_finishing || false
        },
        embeddings: this.embeddingGenerator.generateFeatureEmbedding(feature),
        created_at: new Date().toISOString(),
        source: "recognition"
      });
      if (featureNode.isNew) nodesAdded++; else nodesUpdated++;

      // Edge: part has_feature
      if (this.addEdge({
        id: `edge_${partId}_has_${featureId}`,
        from: partId,
        to: featureId,
        type: "has_feature",
        weight: 1.0,
        properties: {},
        created_at: new Date().toISOString()
      })) edgesAdded++;
    }

    // Add operation nodes
    for (let i = 0; i < plan.segments.length; i++) {
      const seg = plan.segments[i];
      const opId = `op_${partId}_${i}`;

      const opNode = this.addNode({
        id: opId,
        type: "operation",
        label: `${seg.operation} T${seg.tool_number}`,
        properties: {
          operation: seg.operation,
          tool_number: seg.tool_number,
          spindle_rpm: seg.spindle_rpm,
          feed_mmrev: seg.feed_mmrev,
          depth_of_cut_mm: seg.depth_of_cut_mm,
          surface_speed_mmin: seg.surface_speed_mmin,
          estimated_time_sec: seg.estimated_time_sec
        },
        embeddings: this.embeddingGenerator.generateOperationEmbedding(seg),
        created_at: new Date().toISOString(),
        source: "planning"
      });
      if (opNode.isNew) nodesAdded++; else nodesUpdated++;

      // Edge: part uses operation
      if (this.addEdge({
        id: `edge_${partId}_uses_${opId}`,
        from: partId,
        to: opId,
        type: "requires",
        weight: 1.0,
        properties: { sequence: i },
        created_at: new Date().toISOString()
      })) edgesAdded++;

      // Edge: operation sequence
      if (i > 0) {
        const prevOpId = `op_${partId}_${i - 1}`;
        if (this.addEdge({
          id: `edge_${prevOpId}_precedes_${opId}`,
          from: prevOpId,
          to: opId,
          type: "precedes",
          weight: 1.0,
          properties: {},
          created_at: new Date().toISOString()
        })) edgesAdded++;
      }

      // Add tool node if not exists
      const toolId = `tool_T${seg.tool_number}`;
      const toolNode = this.addNode({
        id: toolId,
        type: "tool",
        label: `T${seg.tool_number}`,
        properties: {
          tool_number: seg.tool_number,
          operations_used: 1
        },
        created_at: new Date().toISOString(),
        source: "planning"
      });
      if (toolNode.isNew) nodesAdded++; else {
        // Update usage count
        const existing = this.graph.nodes.get(toolId);
        if (existing) {
          existing.properties.operations_used = (existing.properties.operations_used as number || 0) + 1;
        }
        nodesUpdated++;
      }

      // Edge: operation uses_tool
      if (this.addEdge({
        id: `edge_${opId}_uses_${toolId}`,
        from: opId,
        to: toolId,
        type: "uses_tool",
        weight: 1.0,
        properties: {},
        created_at: new Date().toISOString()
      })) edgesAdded++;
    }

    // Add outcome node
    if (verification) {
      const outcomeId = `outcome_${partId}`;
      const outcomeNode = this.addNode({
        id: outcomeId,
        type: "outcome",
        label: verification.passed ? "Verified OK" : "Verification Issues",
        properties: {
          passed: verification.passed,
          score: verification.score,
          error_count: verification.error_count,
          warning_count: verification.warning_count,
          total_blocks: verification.total_blocks
        },
        created_at: new Date().toISOString(),
        source: "verification"
      });
      if (outcomeNode.isNew) nodesAdded++; else nodesUpdated++;

      // Edge: part produces outcome
      if (this.addEdge({
        id: `edge_${partId}_produces_${outcomeId}`,
        from: partId,
        to: outcomeId,
        type: "produces",
        weight: 1.0,
        properties: {},
        created_at: new Date().toISOString()
      })) edgesAdded++;
    }

    return {
      update_id: updateId,
      nodes_added: nodesAdded,
      edges_added: edgesAdded,
      nodes_updated: nodesUpdated,
      processing_time_ms: Date.now() - startTime
    };
  }

  /**
   * Query the knowledge graph
   */
  query(queryString: string, limit: number = 10): GraphQueryResult {
    const startTime = Date.now();
    const queryId = `query_${++this.queryCounter}_${Date.now()}`;
    const results: GraphQueryResult["results"] = [];

    const queryLower = queryString.toLowerCase();
    const queryWords = queryLower.split(/\s+/);

    // Search nodes by label and properties
    for (const [_, node] of this.graph.nodes) {
      let relevance = 0;

      // Label match
      const labelLower = node.label.toLowerCase();
      for (const word of queryWords) {
        if (labelLower.includes(word)) {
          relevance += 0.3;
        }
      }

      // Property match
      for (const [key, value] of Object.entries(node.properties)) {
        const valueStr = String(value).toLowerCase();
        for (const word of queryWords) {
          if (key.toLowerCase().includes(word) || valueStr.includes(word)) {
            relevance += 0.2;
          }
        }
      }

      // Type match
      for (const word of queryWords) {
        if (node.type.includes(word)) {
          relevance += 0.2;
        }
      }

      if (relevance > 0) {
        results.push({ node, relevance: Math.min(1, relevance) });
      }
    }

    // Sort by relevance and limit
    results.sort((a, b) => b.relevance - a.relevance);
    const limitedResults = results.slice(0, limit);

    return {
      query_id: queryId,
      query: queryString,
      results: limitedResults,
      execution_time_ms: Date.now() - startTime,
      total_matches: results.length
    };
  }

  /**
   * Find similar nodes using embeddings
   */
  findSimilar(nodeId: string, limit: number = 5): SimilaritySearchResult {
    const queryNode = this.graph.nodes.get(nodeId);
    const similar: SimilaritySearchResult["similar_nodes"] = [];

    if (!queryNode || !queryNode.embeddings) {
      return { query_node: nodeId, similar_nodes: [] };
    }

    for (const [id, node] of this.graph.nodes) {
      if (id === nodeId || !node.embeddings) continue;

      const similarity = this.embeddingGenerator.cosineSimilarity(
        queryNode.embeddings,
        node.embeddings
      );

      if (similarity > 0.3) {
        // Find common features
        const commonFeatures: string[] = [];
        for (const [key, value] of Object.entries(queryNode.properties)) {
          if (node.properties[key] === value) {
            commonFeatures.push(key);
          }
        }

        similar.push({ node, similarity, common_features: commonFeatures });
      }
    }

    similar.sort((a, b) => b.similarity - a.similarity);
    return { query_node: nodeId, similar_nodes: similar.slice(0, limit) };
  }

  /**
   * Get node by ID
   */
  getNode(nodeId: string): KGNode | undefined {
    return this.graph.nodes.get(nodeId);
  }

  /**
   * Get edges for a node
   */
  getEdges(nodeId: string, direction: "from" | "to" | "both" = "both"): KGEdge[] {
    const edges: KGEdge[] = [];

    for (const [_, edge] of this.graph.edges) {
      if (direction === "from" && edge.from === nodeId) edges.push(edge);
      else if (direction === "to" && edge.to === nodeId) edges.push(edge);
      else if (direction === "both" && (edge.from === nodeId || edge.to === nodeId)) edges.push(edge);
    }

    return edges;
  }

  /**
   * Get nodes by type
   */
  getNodesByType(type: KGNode["type"]): KGNode[] {
    const ids = this.graph.index.by_type.get(type);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.graph.nodes.get(id))
      .filter((n): n is KGNode => n !== undefined);
  }

  /**
   * Traverse graph from a node
   */
  traverse(startId: string, depth: number = 2): KGNode[] {
    const visited = new Set<string>();
    const result: KGNode[] = [];

    const dfs = (nodeId: string, currentDepth: number) => {
      if (currentDepth > depth || visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = this.graph.nodes.get(nodeId);
      if (node) result.push(node);

      const edges = this.getEdges(nodeId, "from");
      for (const edge of edges) {
        dfs(edge.to, currentDepth + 1);
      }
    };

    dfs(startId, 0);
    return result;
  }

  /**
   * Get graph statistics
   */
  getStatistics(): Record<string, unknown> {
    const nodeCountByType: Record<string, number> = {};
    for (const [type, ids] of this.graph.index.by_type) {
      nodeCountByType[type] = ids.size;
    }

    const edgeCountByType: Record<string, number> = {};
    for (const [_, edge] of this.graph.edges) {
      edgeCountByType[edge.type] = (edgeCountByType[edge.type] || 0) + 1;
    }

    return {
      total_nodes: this.graph.nodes.size,
      total_edges: this.graph.edges.size,
      nodes_by_type: nodeCountByType,
      edges_by_type: edgeCountByType,
      total_updates: this.updateCounter,
      total_queries: this.queryCounter,
      embedding_dimension: 64
    };
  }

  /**
   * Export graph to JSON
   */
  exportGraph(): { nodes: KGNode[]; edges: KGEdge[] } {
    return {
      nodes: Array.from(this.graph.nodes.values()),
      edges: Array.from(this.graph.edges.values())
    };
  }

  /**
   * Import graph from JSON
   */
  importGraph(data: { nodes: KGNode[]; edges: KGEdge[] }): void {
    for (const node of data.nodes) {
      this.addNode(node);
    }
    for (const edge of data.edges) {
      this.addEdge(edge);
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private addNode(node: KGNode): { isNew: boolean } {
    const existing = this.graph.nodes.get(node.id);
    const isNew = !existing;

    this.graph.nodes.set(node.id, node);

    // Update type index
    const typeSet = this.graph.index.by_type.get(node.type);
    if (typeSet) typeSet.add(node.id);

    // Update label index
    this.graph.index.by_label.set(node.label.toLowerCase(), node.id);

    // Update embedding index
    if (node.embeddings) {
      const existingIdx = this.graph.index.embedding_ids.indexOf(node.id);
      if (existingIdx >= 0) {
        this.graph.index.embeddings[existingIdx] = node.embeddings;
      } else {
        this.graph.index.embeddings.push(node.embeddings);
        this.graph.index.embedding_ids.push(node.id);
      }
    }

    return { isNew };
  }

  private addEdge(edge: KGEdge): boolean {
    if (this.graph.edges.has(edge.id)) {
      return false;
    }

    this.graph.edges.set(edge.id, edge);
    return true;
  }
}

export const lathePrintToProgramKnowledgeGraphEngine = new LathePrintToProgramKnowledgeGraphEngine();
