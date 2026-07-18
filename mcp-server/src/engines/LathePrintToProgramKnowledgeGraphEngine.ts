/**
 * LathePrintToProgramKnowledgeGraphEngine — U-LTH44 (LATHE-MASTER P4-S4 FINAL)
 *
 * Every print→program emission adds structured nodes/edges to the
 * Manufacturing Knowledge Graph. Enables semantic queries:
 *   - "show me every job like this one"
 *   - "what tools did we use last time on Inconel?"
 *   - "find programs that failed during roughing"
 *
 * In-memory graph store (JSON-serializable) with node similarity scoring.
 * Can be persisted by consumer via exportGraph()/importGraph().
 *
 * @milestone LATHE-MASTER U-LTH44
 * @version 1.0.0
 */

import { z } from "zod";
import type { StrategyPlan } from "./LathePrintFeatureStrategySelectorEngine.js";
import type { SequencePlan } from "./LathePrintSequencePlannerEngine.js";
import type { SetupRecommendation } from "./LathePrintSetupSelectionEngine.js";
import type { ToolpathProgram } from "./LathePrintToolpathGeneratorEngine.js";
import type { EmittedProgram } from "./LathePrintProgramEmitterEngine.js";
import type { FeatureInput, MaterialInput } from "./LathePrintFeatureStrategySelectorEngine.js";

// ============================================================================
// SCHEMAS
// ============================================================================

export const NodeTypeSchema = z.enum([
  "job", "part", "material", "feature", "strategy", "tool", "operation",
  "machine", "controller", "program", "outcome", "customer",
]);
export type NodeType = z.infer<typeof NodeTypeSchema>;

export const EdgeTypeSchema = z.enum([
  "uses_material", "has_feature", "applies_strategy", "uses_tool",
  "contains_operation", "ran_on_machine", "targets_controller",
  "emits_program", "produced_outcome", "belongs_to_customer",
  "similar_to", "replaces",
]);
export type EdgeType = z.infer<typeof EdgeTypeSchema>;

export const GraphNodeSchema = z.object({
  id: z.string(),
  type: NodeTypeSchema,
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  created_at: z.string(),
});
export type GraphNode = z.infer<typeof GraphNodeSchema>;

export const GraphEdgeSchema = z.object({
  id: z.string(),
  from_node: z.string(),
  to_node: z.string(),
  type: EdgeTypeSchema,
  weight: z.number().min(0).max(1).optional(),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  created_at: z.string(),
});
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

export const GraphSnapshotSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  node_count: z.number().int().min(0),
  edge_count: z.number().int().min(0),
  generated_at: z.string(),
});
export type GraphSnapshot = z.infer<typeof GraphSnapshotSchema>;

export const IngestionInputSchema = z.object({
  strategy_plan: z.any(),
  sequence_plan: z.any(),
  setup: z.any().optional(),
  toolpath: z.any(),
  emitted: z.any(),
  features: z.array(z.any()),
  material: z.any(),
  customer: z.string().optional(),
  part_number: z.string().optional(),
  outcome: z.object({
    actual_cycle_time_sec: z.number().optional(),
    scrap_count: z.number().optional(),
    first_article_pass: z.boolean().optional(),
    notes: z.string().optional(),
  }).optional(),
});
export type IngestionInput = z.infer<typeof IngestionInputSchema>;

export const SimilarityQuerySchema = z.object({
  material_iso_group: z.string().optional(),
  feature_types: z.array(z.string()).optional(),
  min_similarity: z.number().min(0).max(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
export type SimilarityQuery = z.infer<typeof SimilarityQuerySchema>;

export const QueryResultSchema = z.object({
  matches: z.array(z.object({
    job_id: z.string(),
    similarity: z.number(),
    properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
    reasons: z.array(z.string()),
  })),
  query_took_ms: z.number(),
});
export type QueryResult = z.infer<typeof QueryResultSchema>;

// ============================================================================
// ENGINE
// ============================================================================

class LathePrintToProgramKnowledgeGraphEngine {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private nodeIdCounter = 0;
  private edgeIdCounter = 0;

  /**
   * Ingest a completed print→program run into the graph
   * @param input Artifacts + outcome
   * @returns Job node ID for referencing
   */
  ingest(input: IngestionInput): { job_id: string; nodes_added: number; edges_added: number } {
    this.validateInput(input);

    const strat: StrategyPlan = input.strategy_plan;
    const seq: SequencePlan = input.sequence_plan;
    const setup: SetupRecommendation | undefined = input.setup;
    const tp: ToolpathProgram = input.toolpath;
    const emitted: EmittedProgram = input.emitted;
    const features: FeatureInput[] = input.features;
    const material: MaterialInput = input.material;

    const nodesBefore = this.nodes.size;
    const edgesBefore = this.edges.size;

    // Job node
    const jobId = this.addNode("job", {
      program_id: tp.program_id,
      part_number: input.part_number ?? "unnamed",
      cycle_time_min: tp.total_cycle_time_sec / 60,
      gcode_lines: emitted.gcode_lines,
      controller: emitted.controller,
      op_count: tp.operations.length,
      feature_count: features.length,
    });

    // Material node
    const matId = this.upsertMaterialNode(material);
    this.addEdge(jobId, matId, "uses_material");

    // Customer node
    if (input.customer) {
      const custId = this.upsertNodeByProp("customer", "name", input.customer, { name: input.customer });
      this.addEdge(jobId, custId, "belongs_to_customer");
    }

    // Controller node
    const ctrlId = this.upsertNodeByProp("controller", "family", emitted.controller, { family: emitted.controller });
    this.addEdge(jobId, ctrlId, "targets_controller");

    // Feature + strategy + tool edges
    for (const feat of features) {
      const featId = this.addNode("feature", {
        feature_id: feat.id,
        type: feat.type,
        diameter_mm: feat.diameter_mm ?? 0,
        tolerance_mm: feat.tolerance_total_mm ?? 0,
        is_critical: feat.is_critical ?? false,
      });
      this.addEdge(jobId, featId, "has_feature");

      const rec = strat.recommendations.find(r => r.featureId === feat.id);
      if (rec) {
        const stratId = this.upsertNodeByProp("strategy", "strategy_id", rec.strategy_id, {
          strategy_id: rec.strategy_id,
          strategy_name: rec.strategy_name,
          category: rec.parameters.operation_type as string ?? "unknown",
        });
        this.addEdge(featId, stratId, "applies_strategy", rec.score / 100);
      }
    }

    // Operations
    for (const op of tp.operations) {
      const opId = this.addNode("operation", {
        op_number: op.op_number,
        strategy: op.strategy_id,
        rpm: op.spindle_rpm,
        feed_mm_min: op.feed_mm_min,
        cycle_sec: op.cycle_time_sec,
      });
      this.addEdge(jobId, opId, "contains_operation");

      // Tool node
      const toolId = this.upsertNodeByProp("tool", "tool_id", op.tool_id, {
        tool_id: op.tool_id,
        strategy_category: op.strategy_id,
      });
      this.addEdge(opId, toolId, "uses_tool");
    }

    // Program node
    const progId = this.addNode("program", {
      program_id: tp.program_id,
      controller: emitted.controller,
      filename: emitted.filename,
      cycle_time_min: tp.total_cycle_time_sec / 60,
    });
    this.addEdge(jobId, progId, "emits_program");

    // Outcome
    if (input.outcome) {
      const outcomeId = this.addNode("outcome", {
        actual_cycle_time_sec: input.outcome.actual_cycle_time_sec ?? 0,
        scrap_count: input.outcome.scrap_count ?? 0,
        first_article_pass: input.outcome.first_article_pass ?? false,
      });
      this.addEdge(jobId, outcomeId, "produced_outcome");
    }

    return {
      job_id: jobId,
      nodes_added: this.nodes.size - nodesBefore,
      edges_added: this.edges.size - edgesBefore,
    };
  }

  private validateInput(input: IngestionInput): void {
    if (!input || typeof input !== "object") throw new Error("Invalid ingestion input");
    if (!input.strategy_plan?.plan_id) throw new Error("Missing strategy plan");
    if (!input.sequence_plan?.plan_id) throw new Error("Missing sequence plan");
    if (!input.toolpath?.program_id) throw new Error("Missing toolpath");
    if (!input.emitted?.controller) throw new Error("Missing emitted");
    if (!Array.isArray(input.features)) throw new Error("Features must be array");
    if (!input.material?.iso_group) throw new Error("Missing material");
  }

  private addNode(type: NodeType, properties: Record<string, string | number | boolean>): string {
    const id = `${type}_${++this.nodeIdCounter}_${Date.now()}`;
    this.nodes.set(id, {
      id, type, properties,
      created_at: new Date().toISOString(),
    });
    return id;
  }

  private upsertNodeByProp(
    type: NodeType,
    propKey: string,
    propValue: string,
    properties: Record<string, string | number | boolean>
  ): string {
    // Find existing node with matching property
    for (const [id, n] of this.nodes.entries()) {
      if (n.type === type && n.properties[propKey] === propValue) return id;
    }
    return this.addNode(type, properties);
  }

  private upsertMaterialNode(material: MaterialInput): string {
    return this.upsertNodeByProp("material", "name", material.name, {
      name: material.name,
      iso_group: material.iso_group,
      tensile_strength_mpa: material.tensile_strength_mpa ?? 0,
      hardness_hrc: material.hardness_hrc ?? 0,
    });
  }

  private addEdge(
    fromId: string,
    toId: string,
    type: EdgeType,
    weight?: number,
    properties?: Record<string, string | number | boolean>
  ): string {
    const id = `e_${++this.edgeIdCounter}_${Date.now()}`;
    this.edges.set(id, {
      id, from_node: fromId, to_node: toId, type,
      weight, properties,
      created_at: new Date().toISOString(),
    });
    return id;
  }

  /**
   * Query: find jobs similar to a query spec
   */
  findSimilarJobs(query: SimilarityQuery): QueryResult {
    const start = Date.now();
    const validated = SimilarityQuerySchema.parse(query);
    const minSim = validated.min_similarity ?? 0.3;
    const limit = validated.limit ?? 10;

    const jobs = Array.from(this.nodes.values()).filter(n => n.type === "job");

    const matches = jobs.map(job => {
      const { similarity, reasons } = this.scoreSimilarity(job, validated);
      return {
        job_id: job.id,
        similarity,
        properties: job.properties,
        reasons,
      };
    })
      .filter(m => m.similarity >= minSim)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return {
      matches,
      query_took_ms: Date.now() - start,
    };
  }

  /**
   * Score job similarity against query
   */
  private scoreSimilarity(
    job: GraphNode,
    query: SimilarityQuery
  ): { similarity: number; reasons: string[] } {
    let score = 0;
    let possible = 0;
    const reasons: string[] = [];

    // Material match
    if (query.material_iso_group) {
      possible += 0.5;
      const materialEdges = Array.from(this.edges.values())
        .filter(e => e.from_node === job.id && e.type === "uses_material");
      if (materialEdges.length > 0) {
        const matNode = this.nodes.get(materialEdges[0].to_node);
        if (matNode?.properties.iso_group === query.material_iso_group) {
          score += 0.5;
          reasons.push(`Material ISO group ${query.material_iso_group} matches`);
        }
      }
    }

    // Feature type overlap
    if (query.feature_types && query.feature_types.length > 0) {
      possible += 0.5;
      const featureEdges = Array.from(this.edges.values())
        .filter(e => e.from_node === job.id && e.type === "has_feature");
      const jobFeatureTypes = new Set(
        featureEdges
          .map(e => this.nodes.get(e.to_node)?.properties.type as string | undefined)
          .filter(Boolean)
      );
      const overlap = query.feature_types.filter(t => jobFeatureTypes.has(t)).length;
      if (overlap > 0) {
        const overlapRatio = overlap / query.feature_types.length;
        score += 0.5 * overlapRatio;
        reasons.push(`${overlap}/${query.feature_types.length} feature types match`);
      }
    }

    return {
      similarity: possible > 0 ? score / possible : 0,
      reasons,
    };
  }

  /**
   * Query: all tools used on a given material group
   */
  findToolsForMaterial(isoGroup: string): string[] {
    const tools = new Set<string>();
    const matNodes = Array.from(this.nodes.values())
      .filter(n => n.type === "material" && n.properties.iso_group === isoGroup);

    for (const matNode of matNodes) {
      const jobEdges = Array.from(this.edges.values())
        .filter(e => e.to_node === matNode.id && e.type === "uses_material");

      for (const je of jobEdges) {
        const opEdges = Array.from(this.edges.values())
          .filter(e => e.from_node === je.from_node && e.type === "contains_operation");

        for (const oe of opEdges) {
          const toolEdges = Array.from(this.edges.values())
            .filter(e => e.from_node === oe.to_node && e.type === "uses_tool");
          for (const te of toolEdges) {
            const toolNode = this.nodes.get(te.to_node);
            if (toolNode) tools.add(toolNode.properties.tool_id as string);
          }
        }
      }
    }

    return Array.from(tools);
  }

  /**
   * Query: job history for a customer
   */
  findJobsForCustomer(customerName: string): GraphNode[] {
    const custNodes = Array.from(this.nodes.values())
      .filter(n => n.type === "customer" && n.properties.name === customerName);
    if (custNodes.length === 0) return [];

    const jobs: GraphNode[] = [];
    for (const cust of custNodes) {
      const edges = Array.from(this.edges.values())
        .filter(e => e.to_node === cust.id && e.type === "belongs_to_customer");
      for (const e of edges) {
        const job = this.nodes.get(e.from_node);
        if (job) jobs.push(job);
      }
    }
    return jobs;
  }

  /**
   * Query: failures (outcomes with scrap > 0 or first_article_pass = false)
   */
  findFailedJobs(): Array<{ job: GraphNode; outcome: GraphNode }> {
    const failures: Array<{ job: GraphNode; outcome: GraphNode }> = [];

    for (const outcome of this.nodes.values()) {
      if (outcome.type !== "outcome") continue;
      const isFailure = (outcome.properties.scrap_count as number) > 0 ||
                        outcome.properties.first_article_pass === false;
      if (!isFailure) continue;

      const edges = Array.from(this.edges.values())
        .filter(e => e.to_node === outcome.id && e.type === "produced_outcome");
      for (const e of edges) {
        const job = this.nodes.get(e.from_node);
        if (job) failures.push({ job, outcome });
      }
    }
    return failures;
  }

  /**
   * Stats
   */
  getStats(): {
    total_nodes: number;
    total_edges: number;
    nodes_by_type: Record<string, number>;
    edges_by_type: Record<string, number>;
  } {
    const nodesByType: Record<string, number> = {};
    const edgesByType: Record<string, number> = {};
    for (const n of this.nodes.values()) {
      nodesByType[n.type] = (nodesByType[n.type] ?? 0) + 1;
    }
    for (const e of this.edges.values()) {
      edgesByType[e.type] = (edgesByType[e.type] ?? 0) + 1;
    }
    return {
      total_nodes: this.nodes.size,
      total_edges: this.edges.size,
      nodes_by_type: nodesByType,
      edges_by_type: edgesByType,
    };
  }

  /**
   * Export snapshot (for persistence)
   */
  exportGraph(): GraphSnapshot {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      node_count: this.nodes.size,
      edge_count: this.edges.size,
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Import a previously exported snapshot
   */
  importGraph(snapshot: GraphSnapshot): void {
    // Basic structure check (avoids Zod v4 optional-field parse issues)
    if (!snapshot || !Array.isArray(snapshot.nodes) || !Array.isArray(snapshot.edges)) {
      throw new Error("Invalid graph snapshot: missing nodes or edges");
    }
    snapshot.nodes.forEach(n => this.nodes.set(n.id, n));
    snapshot.edges.forEach(e => this.edges.set(e.id, e));
  }

  /**
   * Clear all nodes/edges (for tests and resets)
   */
  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.nodeIdCounter = 0;
    this.edgeIdCounter = 0;
  }

  /**
   * Traverse: given a node ID, return all connected nodes within depth
   */
  traverse(startNodeId: string, maxDepth: number = 2): GraphNode[] {
    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [{ id: startNodeId, depth: 0 }];
    const result: GraphNode[] = [];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      const node = this.nodes.get(id);
      if (node) result.push(node);

      if (depth >= maxDepth) continue;

      for (const e of this.edges.values()) {
        if (e.from_node === id && !visited.has(e.to_node)) {
          queue.push({ id: e.to_node, depth: depth + 1 });
        }
        if (e.to_node === id && !visited.has(e.from_node)) {
          queue.push({ id: e.from_node, depth: depth + 1 });
        }
      }
    }

    return result;
  }
}

export const lathePrintToProgramKnowledgeGraphEngine = new LathePrintToProgramKnowledgeGraphEngine();
