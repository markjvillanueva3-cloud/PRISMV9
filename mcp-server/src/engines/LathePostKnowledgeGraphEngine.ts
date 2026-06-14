/**
 * LathePostKnowledgeGraphEngine — LATHE-MASTER U-LTH20
 *
 * Integrates lathe post-processor knowledge into a queryable graph structure.
 * Models relationships between controllers, dialects, cycles, and validation rules.
 *
 * Features:
 * - Controller → Dialect → Cycle relationships
 * - Validator applicability mapping
 * - Cross-controller compatibility queries
 * - Knowledge inference for unknown controllers
 *
 * @module LathePostKnowledgeGraphEngine
 * @version 1.0.0
 * @milestone LATHE-MASTER U-LTH20
 */

import { z } from "zod";

// ── Schemas ─────────────────────────────────────────────────────────────────

export const NodeTypeSchema = z.enum([
  "controller",
  "dialect",
  "cycle",
  "validator",
  "feature",
  "manufacturer",
  "axis",
  "modal_group",
]);

export const EdgeTypeSchema = z.enum([
  "uses_dialect",
  "supports_cycle",
  "requires_validator",
  "has_feature",
  "made_by",
  "has_axis",
  "in_modal_group",
  "compatible_with",
  "derived_from",
  "conflicts_with",
]);

export const GraphNodeSchema = z.object({
  id: z.string(),
  type: NodeTypeSchema,
  label: z.string(),
  properties: z.record(z.string(), z.unknown()).optional(),
});

export const GraphEdgeSchema = z.object({
  id: z.string(),
  type: EdgeTypeSchema,
  source: z.string(),
  target: z.string(),
  weight: z.number().default(1.0),
  properties: z.record(z.string(), z.unknown()).optional(),
});

export const KnowledgeGraphSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  version: z.string(),
  created_at: z.string(),
});

export const QueryResultSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  paths: z.array(z.array(z.string())).optional(),
});

export type NodeType = z.infer<typeof NodeTypeSchema>;
export type EdgeType = z.infer<typeof EdgeTypeSchema>;
export type GraphNode = z.infer<typeof GraphNodeSchema>;
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;
export type KnowledgeGraph = z.infer<typeof KnowledgeGraphSchema>;
export type QueryResult = z.infer<typeof QueryResultSchema>;

// ── Built-in Knowledge ──────────────────────────────────────────────────────

interface ControllerKnowledge {
  id: string;
  manufacturer: string;
  model: string;
  dialect: string;
  cycles: string[];
  features: string[];
  axes: string[];
}

const CONTROLLER_KNOWLEDGE: ControllerKnowledge[] = [
  {
    id: "fanuc-31it",
    manufacturer: "Fanuc",
    model: "31i-T",
    dialect: "fanuc",
    cycles: ["G70", "G71", "G72", "G73", "G74", "G75", "G76", "G83", "G84"],
    features: ["live_tooling", "c_axis", "y_axis", "macro_b"],
    axes: ["X", "Z", "C", "Y"],
  },
  {
    id: "fanuc-0it",
    manufacturer: "Fanuc",
    model: "0i-T",
    dialect: "fanuc",
    cycles: ["G70", "G71", "G72", "G73", "G76", "G83"],
    features: ["c_axis"],
    axes: ["X", "Z", "C"],
  },
  {
    id: "okuma-osp-p300l",
    manufacturer: "Okuma",
    model: "OSP-P300L",
    dialect: "okuma",
    cycles: ["G71", "G72", "G73", "G76", "G83", "G84"],
    features: ["live_tooling", "c_axis", "y_axis", "osp_macro"],
    axes: ["X", "Z", "C", "Y"],
  },
  {
    id: "okuma-osp-p200l",
    manufacturer: "Okuma",
    model: "OSP-P200L",
    dialect: "okuma",
    cycles: ["G71", "G72", "G76", "G83"],
    features: ["c_axis"],
    axes: ["X", "Z", "C"],
  },
  {
    id: "mitsubishi-m80",
    manufacturer: "Mitsubishi",
    model: "M80",
    dialect: "mitsubishi",
    cycles: ["G71", "G72", "G73", "G76", "G83", "G84"],
    features: ["live_tooling", "c_axis"],
    axes: ["X", "Z", "C"],
  },
  {
    id: "siemens-840d",
    manufacturer: "Siemens",
    model: "840D",
    dialect: "siemens",
    cycles: ["CYCLE93", "CYCLE95", "CYCLE97", "CYCLE83", "CYCLE84"],
    features: ["live_tooling", "c_axis", "y_axis", "shopmill"],
    axes: ["X", "Z", "C", "Y"],
  },
  {
    id: "haas-ngc",
    manufacturer: "Haas",
    model: "NGC",
    dialect: "haas",
    cycles: ["G71", "G72", "G76", "G83"],
    features: ["live_tooling", "c_axis"],
    axes: ["X", "Z", "C"],
  },
  {
    id: "citizen-cincom-m32",
    manufacturer: "Citizen",
    model: "Cincom M32",
    dialect: "citizen",
    cycles: ["G71", "G76", "G83", "G112", "G113"],
    features: ["guide_bushing", "sub_spindle", "b_axis", "back_work"],
    axes: ["X", "Z", "C", "B", "W"],
  },
  {
    id: "tsugami-b0326",
    manufacturer: "Tsugami",
    model: "B0326-III",
    dialect: "tsugami",
    cycles: ["G71", "G76", "G83"],
    features: ["guide_bushing", "sub_spindle", "gang_tooling"],
    axes: ["X", "Z", "C", "W"],
  },
];

const DIALECT_COMPATIBILITY: Record<string, string[]> = {
  fanuc: ["haas", "citizen", "tsugami"],
  okuma: [],
  mitsubishi: [],
  siemens: [],
  haas: ["fanuc"],
  citizen: ["fanuc"],
  tsugami: ["fanuc"],
};

const CYCLE_DESCRIPTIONS: Record<string, string> = {
  G70: "Finishing cycle",
  G71: "Rough turning cycle (OD)",
  G72: "Rough facing cycle",
  G73: "Pattern repeating cycle",
  G74: "Peck drilling cycle (face)",
  G75: "Grooving cycle (OD)",
  G76: "Threading cycle",
  G83: "Peck drilling cycle",
  G84: "Tapping cycle",
  G112: "Guide bushing mode ON (Swiss)",
  G113: "Guide bushing mode OFF (Swiss)",
  CYCLE93: "Siemens grooving",
  CYCLE95: "Siemens stock removal",
  CYCLE97: "Siemens threading",
  CYCLE83: "Siemens deep hole drilling",
  CYCLE84: "Siemens tapping",
};

const VALIDATOR_APPLICABILITY: Record<string, string[]> = {
  pp_syntax_gcode: ["fanuc", "okuma", "mitsubishi", "haas", "citizen", "tsugami"],
  pp_syntax_mcode: ["fanuc", "okuma", "mitsubishi", "haas", "citizen", "tsugami"],
  pp_safety_spindle: ["fanuc", "okuma", "mitsubishi", "siemens", "haas", "citizen", "tsugami"],
  pp_safety_rapid: ["fanuc", "okuma", "mitsubishi", "siemens", "haas", "citizen", "tsugami"],
  pp_kinematics_axis_limits: ["fanuc", "okuma", "mitsubishi", "siemens", "haas", "citizen", "tsugami"],
  pp_tooling_offset: ["fanuc", "okuma", "mitsubishi", "haas"],
  pp_structure_program_start: ["fanuc", "okuma", "mitsubishi", "haas", "citizen", "tsugami"],
  pp_structure_program_end: ["fanuc", "okuma", "mitsubishi", "haas", "citizen", "tsugami"],
};

// ── Engine Implementation ───────────────────────────────────────────────────

export class LathePostKnowledgeGraphEngine {
  private static readonly VERSION = "1.0.0";
  private graph: KnowledgeGraph;

  constructor() {
    this.graph = this.buildGraph();
  }

  /**
   * Build the knowledge graph from built-in data.
   */
  private buildGraph(): KnowledgeGraph {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    let edgeId = 0;

    const manufacturers = new Set<string>();
    const dialects = new Set<string>();
    const cycles = new Set<string>();
    const features = new Set<string>();
    const validators = new Set<string>();

    for (const ctrl of CONTROLLER_KNOWLEDGE) {
      nodes.push({
        id: ctrl.id,
        type: "controller",
        label: `${ctrl.manufacturer} ${ctrl.model}`,
        properties: { manufacturer: ctrl.manufacturer, model: ctrl.model },
      });

      manufacturers.add(ctrl.manufacturer);
      dialects.add(ctrl.dialect);
      ctrl.cycles.forEach(c => cycles.add(c));
      ctrl.features.forEach(f => features.add(f));
    }

    for (const mfr of manufacturers) {
      nodes.push({ id: `mfr_${mfr.toLowerCase()}`, type: "manufacturer", label: mfr });
    }

    for (const dialect of dialects) {
      nodes.push({ id: `dialect_${dialect}`, type: "dialect", label: dialect });
    }

    for (const cycle of cycles) {
      nodes.push({
        id: `cycle_${cycle}`,
        type: "cycle",
        label: cycle,
        properties: { description: CYCLE_DESCRIPTIONS[cycle] ?? cycle },
      });
    }

    for (const feature of features) {
      nodes.push({ id: `feature_${feature}`, type: "feature", label: feature });
    }

    for (const validator of Object.keys(VALIDATOR_APPLICABILITY)) {
      validators.add(validator);
      nodes.push({ id: `validator_${validator}`, type: "validator", label: validator });
    }

    for (const ctrl of CONTROLLER_KNOWLEDGE) {
      edges.push({
        id: `e${edgeId++}`,
        type: "made_by",
        source: ctrl.id,
        target: `mfr_${ctrl.manufacturer.toLowerCase()}`,
        weight: 1.0,
      });

      edges.push({
        id: `e${edgeId++}`,
        type: "uses_dialect",
        source: ctrl.id,
        target: `dialect_${ctrl.dialect}`,
        weight: 1.0,
      });

      for (const cycle of ctrl.cycles) {
        edges.push({
          id: `e${edgeId++}`,
          type: "supports_cycle",
          source: ctrl.id,
          target: `cycle_${cycle}`,
          weight: 1.0,
        });
      }

      for (const feature of ctrl.features) {
        edges.push({
          id: `e${edgeId++}`,
          type: "has_feature",
          source: ctrl.id,
          target: `feature_${feature}`,
          weight: 1.0,
        });
      }

      for (const axis of ctrl.axes) {
        const axisNodeId = `axis_${axis}`;
        if (!nodes.some(n => n.id === axisNodeId)) {
          nodes.push({ id: axisNodeId, type: "axis", label: axis });
        }
        edges.push({
          id: `e${edgeId++}`,
          type: "has_axis",
          source: ctrl.id,
          target: axisNodeId,
          weight: 1.0,
        });
      }
    }

    for (const [dialect, compatible] of Object.entries(DIALECT_COMPATIBILITY)) {
      for (const compat of compatible) {
        edges.push({
          id: `e${edgeId++}`,
          type: "compatible_with",
          source: `dialect_${dialect}`,
          target: `dialect_${compat}`,
          weight: 0.8,
        });
      }
    }

    for (const [validator, dialects] of Object.entries(VALIDATOR_APPLICABILITY)) {
      for (const dialect of dialects) {
        edges.push({
          id: `e${edgeId++}`,
          type: "requires_validator",
          source: `dialect_${dialect}`,
          target: `validator_${validator}`,
          weight: 1.0,
        });
      }
    }

    return {
      nodes,
      edges,
      version: LathePostKnowledgeGraphEngine.VERSION,
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Get the full knowledge graph.
   */
  getGraph(): KnowledgeGraph {
    return this.graph;
  }

  /**
   * Find node by ID.
   */
  getNode(id: string): GraphNode | undefined {
    return this.graph.nodes.find(n => n.id === id);
  }

  /**
   * Find nodes by type.
   */
  getNodesByType(type: NodeType): GraphNode[] {
    return this.graph.nodes.filter(n => n.type === type);
  }

  /**
   * Get edges from a node.
   */
  getOutgoingEdges(nodeId: string): GraphEdge[] {
    return this.graph.edges.filter(e => e.source === nodeId);
  }

  /**
   * Get edges to a node.
   */
  getIncomingEdges(nodeId: string): GraphEdge[] {
    return this.graph.edges.filter(e => e.target === nodeId);
  }

  /**
   * Get neighbors of a node.
   */
  getNeighbors(nodeId: string, edgeType?: EdgeType): GraphNode[] {
    const outgoing = this.getOutgoingEdges(nodeId);
    const incoming = this.getIncomingEdges(nodeId);

    const neighborIds = new Set<string>();

    for (const edge of outgoing) {
      if (!edgeType || edge.type === edgeType) {
        neighborIds.add(edge.target);
      }
    }
    for (const edge of incoming) {
      if (!edgeType || edge.type === edgeType) {
        neighborIds.add(edge.source);
      }
    }

    return Array.from(neighborIds)
      .map(id => this.getNode(id))
      .filter((n): n is GraphNode => n !== undefined);
  }

  /**
   * Get cycles supported by a controller.
   */
  getControllerCycles(controllerId: string): GraphNode[] {
    return this.getNeighbors(controllerId, "supports_cycle");
  }

  /**
   * Get features of a controller.
   */
  getControllerFeatures(controllerId: string): GraphNode[] {
    return this.getNeighbors(controllerId, "has_feature");
  }

  /**
   * Get validators for a dialect.
   */
  getDialectValidators(dialect: string): GraphNode[] {
    const dialectId = dialect.startsWith("dialect_") ? dialect : `dialect_${dialect}`;
    return this.getNeighbors(dialectId, "requires_validator");
  }

  /**
   * Get controllers by manufacturer.
   */
  getControllersByManufacturer(manufacturer: string): GraphNode[] {
    const mfrId = `mfr_${manufacturer.toLowerCase()}`;
    const edges = this.getIncomingEdges(mfrId).filter(e => e.type === "made_by");
    return edges
      .map(e => this.getNode(e.source))
      .filter((n): n is GraphNode => n !== undefined);
  }

  /**
   * Get controllers that support a specific cycle.
   */
  getControllersWithCycle(cycleCode: string): GraphNode[] {
    const cycleId = cycleCode.startsWith("cycle_") ? cycleCode : `cycle_${cycleCode}`;
    const edges = this.getIncomingEdges(cycleId).filter(e => e.type === "supports_cycle");
    return edges
      .map(e => this.getNode(e.source))
      .filter((n): n is GraphNode => n !== undefined);
  }

  /**
   * Get controllers with a specific feature.
   */
  getControllersWithFeature(feature: string): GraphNode[] {
    const featureId = feature.startsWith("feature_") ? feature : `feature_${feature}`;
    const edges = this.getIncomingEdges(featureId).filter(e => e.type === "has_feature");
    return edges
      .map(e => this.getNode(e.source))
      .filter((n): n is GraphNode => n !== undefined);
  }

  /**
   * Find compatible dialects.
   */
  getCompatibleDialects(dialect: string): GraphNode[] {
    const dialectId = dialect.startsWith("dialect_") ? dialect : `dialect_${dialect}`;
    return this.getNeighbors(dialectId, "compatible_with");
  }

  /**
   * Check if two controllers are compatible (share dialect or compatible dialects).
   */
  areControllersCompatible(ctrl1: string, ctrl2: string): { compatible: boolean; reason: string } {
    const node1 = this.getNode(ctrl1);
    const node2 = this.getNode(ctrl2);

    if (!node1 || !node2) {
      return { compatible: false, reason: "Controller not found" };
    }

    const dialect1 = this.getNeighbors(ctrl1, "uses_dialect")[0];
    const dialect2 = this.getNeighbors(ctrl2, "uses_dialect")[0];

    if (!dialect1 || !dialect2) {
      return { compatible: false, reason: "Dialect not found" };
    }

    if (dialect1.id === dialect2.id) {
      return { compatible: true, reason: `Same dialect: ${dialect1.label}` };
    }

    const compatible1 = this.getCompatibleDialects(dialect1.id);
    if (compatible1.some(d => d.id === dialect2.id)) {
      return { compatible: true, reason: `${dialect1.label} is compatible with ${dialect2.label}` };
    }

    const compatible2 = this.getCompatibleDialects(dialect2.id);
    if (compatible2.some(d => d.id === dialect1.id)) {
      return { compatible: true, reason: `${dialect2.label} is compatible with ${dialect1.label}` };
    }

    return { compatible: false, reason: `Dialects ${dialect1.label} and ${dialect2.label} are not compatible` };
  }

  /**
   * Find path between two nodes.
   */
  findPath(startId: string, endId: string, maxDepth: number = 5): string[] | null {
    const visited = new Set<string>();
    const queue: Array<{ node: string; path: string[] }> = [{ node: startId, path: [startId] }];

    while (queue.length > 0) {
      const { node, path } = queue.shift()!;

      if (node === endId) {
        return path;
      }

      if (path.length > maxDepth) {
        continue;
      }

      if (visited.has(node)) {
        continue;
      }
      visited.add(node);

      const neighbors = this.getNeighbors(node);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.id)) {
          queue.push({ node: neighbor.id, path: [...path, neighbor.id] });
        }
      }
    }

    return null;
  }

  /**
   * Infer controller properties from similar controllers.
   */
  inferControllerProperties(
    manufacturer: string,
    knownFeatures: string[]
  ): { suggestedDialect: string; suggestedCycles: string[]; confidence: number } {
    const mfrControllers = this.getControllersByManufacturer(manufacturer);

    if (mfrControllers.length === 0) {
      return { suggestedDialect: "fanuc", suggestedCycles: ["G71", "G76", "G83"], confidence: 0.3 };
    }

    const dialectVotes = new Map<string, number>();
    const cycleVotes = new Map<string, number>();

    for (const ctrl of mfrControllers) {
      const dialect = this.getNeighbors(ctrl.id, "uses_dialect")[0];
      if (dialect) {
        dialectVotes.set(dialect.label, (dialectVotes.get(dialect.label) ?? 0) + 1);
      }

      const cycles = this.getControllerCycles(ctrl.id);
      for (const cycle of cycles) {
        cycleVotes.set(cycle.label, (cycleVotes.get(cycle.label) ?? 0) + 1);
      }

      const features = this.getControllerFeatures(ctrl.id);
      const matchingFeatures = features.filter(f => knownFeatures.includes(f.label));
      const bonus = matchingFeatures.length * 0.5;

      if (dialect) {
        dialectVotes.set(dialect.label, (dialectVotes.get(dialect.label) ?? 0) + bonus);
      }
      for (const cycle of cycles) {
        cycleVotes.set(cycle.label, (cycleVotes.get(cycle.label) ?? 0) + bonus * 0.5);
      }
    }

    const suggestedDialect = Array.from(dialectVotes.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "fanuc";

    const suggestedCycles = Array.from(cycleVotes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([cycle]) => cycle);

    const confidence = Math.min(0.9, 0.5 + mfrControllers.length * 0.1);

    return { suggestedDialect, suggestedCycles, confidence };
  }

  /**
   * Get graph statistics.
   */
  getStats(): { nodes: number; edges: number; controllers: number; dialects: number; cycles: number } {
    return {
      nodes: this.graph.nodes.length,
      edges: this.graph.edges.length,
      controllers: this.getNodesByType("controller").length,
      dialects: this.getNodesByType("dialect").length,
      cycles: this.getNodesByType("cycle").length,
    };
  }

  /**
   * Get engine version.
   */
  static getVersion(): string {
    return LathePostKnowledgeGraphEngine.VERSION;
  }
}

// Export singleton
export const lathePostKnowledgeGraphEngine = new LathePostKnowledgeGraphEngine();
