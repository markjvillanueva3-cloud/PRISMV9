/**
 * DeepLogicTraceEngine — MILL-AGI-P0/U-P0.4
 *
 * Every automated decision produces a verifiable proof tree tied to
 * canonical formulas and tribal tips. Provides:
 *   - First-order logic assertions as nodes
 *   - Edges cite formula-ID, tip-ID, or prior fact-ID
 *   - JSON-serialized trace attached to every engine response
 *   - explainTrace(id) renders human-readable proof
 *
 * Architecture:
 *   - ProofNode: atomic assertion with predicate, arguments, truth value
 *   - ProofEdge: inference step citing source (formula, tip, observation)
 *   - ProofTree: directed acyclic graph from premises to conclusion
 *   - TraceStore: in-memory + persistent storage of proof trees
 *
 * @module engines/DeepLogicTraceEngine
 * @milestone MILL-AGI-P0.4
 */

import { log } from "../utils/Logger.js";
import { randomUUID } from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AssertionType = "fact" | "hypothesis" | "inference" | "conclusion";
export type SourceType = "formula" | "tribal_tip" | "observation" | "axiom" | "rule";
export type TruthValue = "true" | "false" | "unknown" | "probable";

export interface LogicVariable {
  name: string;
  type: "number" | "string" | "boolean" | "object";
  value: unknown;
  unit?: string;
}

export interface Predicate {
  name: string;
  arity: number;
  description?: string;
}

export interface Assertion {
  id: string;
  predicate: Predicate;
  arguments: LogicVariable[];
  truth: TruthValue;
  confidence: number;
  type: AssertionType;
  timestamp: number;
}

export interface InferenceSource {
  type: SourceType;
  id: string;
  name: string;
  url?: string;
  citation?: string;
}

export interface ProofNode {
  assertion: Assertion;
  depth: number;
  children: string[];
  parents: string[];
}

export interface ProofEdge {
  from: string;
  to: string;
  source: InferenceSource;
  rule: string;
  justification: string;
}

export interface ProofTree {
  id: string;
  rootId: string;
  nodes: Map<string, ProofNode>;
  edges: ProofEdge[];
  conclusion: Assertion;
  premises: Assertion[];
  isValid: boolean;
  depth: number;
  createdAt: number;
  engineId: string;
  context: Record<string, unknown>;
}

export interface ProofSummary {
  id: string;
  conclusion: string;
  stepCount: number;
  depth: number;
  sources: InferenceSource[];
  isValid: boolean;
}

export interface ExplainedProof {
  summary: string;
  steps: string[];
  premises: string[];
  conclusion: string;
  citations: string[];
  confidence: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  unresolvedNodes: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Built-in predicates and formulas
// ─────────────────────────────────────────────────────────────────────────────

const BUILT_IN_PREDICATES: Record<string, Predicate> = {
  cutting_force_valid: { name: "cutting_force_valid", arity: 3, description: "Force F is valid for material M with params P" },
  tool_life_sufficient: { name: "tool_life_sufficient", arity: 2, description: "Tool life T exceeds threshold" },
  stability_achieved: { name: "stability_achieved", arity: 2, description: "Machining is stable at depth D and RPM" },
  surface_finish_acceptable: { name: "surface_finish_acceptable", arity: 2, description: "Ra is within tolerance" },
  strategy_applicable: { name: "strategy_applicable", arity: 3, description: "Strategy S is applicable for feature F on material M" },
  parameter_in_range: { name: "parameter_in_range", arity: 3, description: "Parameter P is within [min, max]" },
  deflection_acceptable: { name: "deflection_acceptable", arity: 2, description: "Deflection D is below limit" },
  thermal_safe: { name: "thermal_safe", arity: 2, description: "Temperature T is below critical threshold" },
  chatter_free: { name: "chatter_free", arity: 3, description: "No chatter at spindle speed S and depth D" },
  material_known: { name: "material_known", arity: 1, description: "Material M has known properties" },
  tool_available: { name: "tool_available", arity: 1, description: "Tool T is available in inventory" },
  machine_capable: { name: "machine_capable", arity: 2, description: "Machine M can perform operation O" },
};

const FORMULA_REGISTRY: Record<string, InferenceSource> = {
  kienzle: { type: "formula", id: "F-001", name: "Kienzle Cutting Force", citation: "Kienzle 1952" },
  taylor: { type: "formula", id: "F-002", name: "Taylor Tool Life", citation: "Taylor 1907" },
  cantilever: { type: "formula", id: "F-003", name: "Cantilever Deflection", citation: "Euler-Bernoulli" },
  stability_lobe: { type: "formula", id: "F-004", name: "Stability Lobe Diagram", citation: "Altintas 2000" },
  kinematic_roughness: { type: "formula", id: "F-005", name: "Kinematic Surface Roughness", citation: "Brammertz 1961" },
  johnson_cook: { type: "formula", id: "F-006", name: "Johnson-Cook Flow Stress", citation: "Johnson & Cook 1983" },
  merchant: { type: "formula", id: "F-007", name: "Merchant Shear Angle", citation: "Merchant 1944" },
  mrr: { type: "formula", id: "F-008", name: "Material Removal Rate", citation: "Textbook standard" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Engine Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class DeepLogicTraceEngine {
  private traceStore: Map<string, ProofTree> = new Map();
  private maxStoreSize = 10000;
  private currentBuilder: ProofTreeBuilder | null = null;

  /**
   * Start building a new proof tree for a decision
   */
  beginProof(engineId: string, context: Record<string, unknown> = {}): ProofTreeBuilder {
    this.currentBuilder = new ProofTreeBuilder(engineId, context);
    return this.currentBuilder;
  }

  /**
   * Finalize and store a proof tree
   */
  finalizeProof(builder: ProofTreeBuilder): ProofTree {
    const tree = builder.build();
    this.storeTree(tree);
    log.info("DeepLogicTraceEngine.finalizeProof", { id: tree.id, depth: tree.depth });
    return tree;
  }

  /**
   * Store a proof tree with LRU eviction
   */
  private storeTree(tree: ProofTree): void {
    if (this.traceStore.size >= this.maxStoreSize) {
      const oldestKey = this.traceStore.keys().next().value;
      if (oldestKey) this.traceStore.delete(oldestKey);
    }
    this.traceStore.set(tree.id, tree);
  }

  /**
   * Retrieve a stored proof tree
   */
  getTrace(id: string): ProofTree | undefined {
    return this.traceStore.get(id);
  }

  /**
   * Get summary of a proof tree
   */
  getSummary(id: string): ProofSummary | null {
    const tree = this.traceStore.get(id);
    if (!tree) return null;

    const sources = tree.edges.map(e => e.source);
    const uniqueSources = Array.from(
      new Map(sources.map(s => [s.id, s])).values()
    );

    return {
      id: tree.id,
      conclusion: this.assertionToString(tree.conclusion),
      stepCount: tree.nodes.size,
      depth: tree.depth,
      sources: uniqueSources,
      isValid: tree.isValid,
    };
  }

  /**
   * Render human-readable explanation of a proof
   */
  explainTrace(id: string): ExplainedProof | null {
    const tree = this.traceStore.get(id);
    if (!tree) return null;

    const steps: string[] = [];
    const citations: string[] = [];
    const premises: string[] = [];

    // Collect premises (nodes with no parents)
    for (const [, node] of tree.nodes) {
      if (node.parents.length === 0 && node.assertion.type !== "conclusion") {
        premises.push(this.assertionToString(node.assertion));
      }
    }

    // Build step-by-step explanation by traversing edges
    for (const edge of tree.edges) {
      const fromNode = tree.nodes.get(edge.from);
      const toNode = tree.nodes.get(edge.to);
      if (fromNode && toNode) {
        const step = `From "${this.assertionToString(fromNode.assertion)}" ` +
          `infer "${this.assertionToString(toNode.assertion)}" ` +
          `via ${edge.source.name} (${edge.rule})`;
        steps.push(step);

        if (edge.source.citation && !citations.includes(edge.source.citation)) {
          citations.push(edge.source.citation);
        }
      }
    }

    const avgConfidence = Array.from(tree.nodes.values())
      .reduce((sum, n) => sum + n.assertion.confidence, 0) / tree.nodes.size;

    return {
      summary: `Proof with ${tree.nodes.size} assertions, depth ${tree.depth}, ` +
        `citing ${citations.length} sources`,
      steps,
      premises,
      conclusion: this.assertionToString(tree.conclusion),
      citations,
      confidence: avgConfidence,
    };
  }

  /**
   * Validate a proof tree for logical consistency
   */
  validateProof(id: string): ValidationResult {
    const tree = this.traceStore.get(id);
    if (!tree) {
      return {
        isValid: false,
        errors: ["Proof tree not found"],
        warnings: [],
        unresolvedNodes: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const unresolvedNodes: string[] = [];

    // Check all nodes are reachable from root
    const reachable = new Set<string>();
    const queue = [tree.rootId];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (reachable.has(nodeId)) continue;
      reachable.add(nodeId);
      const node = tree.nodes.get(nodeId);
      if (node) {
        queue.push(...node.children);
      }
    }

    for (const [nodeId] of tree.nodes) {
      if (!reachable.has(nodeId)) {
        warnings.push(`Node ${nodeId} is not reachable from root`);
      }
    }

    // Check all edges have valid source and target
    for (const edge of tree.edges) {
      if (!tree.nodes.has(edge.from)) {
        errors.push(`Edge references missing source node: ${edge.from}`);
      }
      if (!tree.nodes.has(edge.to)) {
        errors.push(`Edge references missing target node: ${edge.to}`);
      }
    }

    // Check for cycles (would make proof invalid)
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;
      visited.add(nodeId);
      recursionStack.add(nodeId);
      const node = tree.nodes.get(nodeId);
      if (node) {
        for (const child of node.children) {
          if (hasCycle(child)) return true;
        }
      }
      recursionStack.delete(nodeId);
      return false;
    };

    if (hasCycle(tree.rootId)) {
      errors.push("Proof tree contains a cycle (invalid)");
    }

    // Check all hypotheses are resolved
    for (const [nodeId, node] of tree.nodes) {
      if (node.assertion.type === "hypothesis" && node.assertion.truth === "unknown") {
        unresolvedNodes.push(nodeId);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      unresolvedNodes,
    };
  }

  /**
   * Query proofs by engine or time range
   */
  queryProofs(filter: {
    engineId?: string;
    since?: number;
    minDepth?: number;
    limit?: number;
  }): ProofSummary[] {
    const results: ProofSummary[] = [];
    const limit = filter.limit ?? 100;

    for (const [id, tree] of this.traceStore) {
      if (results.length >= limit) break;
      if (filter.engineId && tree.engineId !== filter.engineId) continue;
      if (filter.since && tree.createdAt < filter.since) continue;
      if (filter.minDepth && tree.depth < filter.minDepth) continue;

      const summary = this.getSummary(id);
      if (summary) results.push(summary);
    }

    return results;
  }

  /**
   * Get statistics about stored proofs
   */
  getStats(): {
    totalProofs: number;
    avgDepth: number;
    avgSteps: number;
    formulaCitations: Record<string, number>;
    validProofs: number;
  } {
    let totalDepth = 0;
    let totalSteps = 0;
    let validCount = 0;
    const formulaCounts: Record<string, number> = {};

    for (const tree of this.traceStore.values()) {
      totalDepth += tree.depth;
      totalSteps += tree.nodes.size;
      if (tree.isValid) validCount++;

      for (const edge of tree.edges) {
        if (edge.source.type === "formula") {
          formulaCounts[edge.source.name] = (formulaCounts[edge.source.name] || 0) + 1;
        }
      }
    }

    const count = this.traceStore.size || 1;
    return {
      totalProofs: this.traceStore.size,
      avgDepth: totalDepth / count,
      avgSteps: totalSteps / count,
      formulaCitations: formulaCounts,
      validProofs: validCount,
    };
  }

  /**
   * Get built-in predicate definitions
   */
  getPredicates(): Record<string, Predicate> {
    return { ...BUILT_IN_PREDICATES };
  }

  /**
   * Get formula registry
   */
  getFormulaRegistry(): Record<string, InferenceSource> {
    return { ...FORMULA_REGISTRY };
  }

  /**
   * Convert assertion to readable string
   */
  private assertionToString(a: Assertion): string {
    const args = a.arguments.map(v => `${v.name}=${v.value}${v.unit ? v.unit : ""}`).join(", ");
    return `${a.predicate.name}(${args}) = ${a.truth} [${(a.confidence * 100).toFixed(0)}%]`;
  }

  /**
   * Clear all stored proofs
   */
  clear(): void {
    this.traceStore.clear();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Proof Tree Builder
// ─────────────────────────────────────────────────────────────────────────────

export class ProofTreeBuilder {
  private id: string;
  private engineId: string;
  private context: Record<string, unknown>;
  private nodes: Map<string, ProofNode> = new Map();
  private edges: ProofEdge[] = [];
  private rootId: string | null = null;
  private conclusionId: string | null = null;

  constructor(engineId: string, context: Record<string, unknown>) {
    this.id = randomUUID();
    this.engineId = engineId;
    this.context = context;
  }

  /**
   * Add a premise (starting fact)
   */
  addPremise(
    predicateName: string,
    args: LogicVariable[],
    truth: TruthValue = "true",
    confidence: number = 1.0
  ): string {
    const predicate = BUILT_IN_PREDICATES[predicateName] ?? {
      name: predicateName,
      arity: args.length,
    };

    const assertion: Assertion = {
      id: randomUUID(),
      predicate,
      arguments: args,
      truth,
      confidence,
      type: "fact",
      timestamp: Date.now(),
    };

    const node: ProofNode = {
      assertion,
      depth: 0,
      children: [],
      parents: [],
    };

    this.nodes.set(assertion.id, node);
    if (!this.rootId) this.rootId = assertion.id;

    return assertion.id;
  }

  /**
   * Add a hypothesis (to be proven or refuted)
   */
  addHypothesis(
    predicateName: string,
    args: LogicVariable[],
    confidence: number = 0.5
  ): string {
    const predicate = BUILT_IN_PREDICATES[predicateName] ?? {
      name: predicateName,
      arity: args.length,
    };

    const assertion: Assertion = {
      id: randomUUID(),
      predicate,
      arguments: args,
      truth: "unknown",
      confidence,
      type: "hypothesis",
      timestamp: Date.now(),
    };

    const node: ProofNode = {
      assertion,
      depth: 0,
      children: [],
      parents: [],
    };

    this.nodes.set(assertion.id, node);
    return assertion.id;
  }

  /**
   * Add an inference step from one or more premises to a conclusion
   */
  addInference(
    fromIds: string[],
    predicateName: string,
    args: LogicVariable[],
    source: InferenceSource,
    rule: string,
    truth: TruthValue = "true",
    confidence?: number
  ): string {
    const predicate = BUILT_IN_PREDICATES[predicateName] ?? {
      name: predicateName,
      arity: args.length,
    };

    // Calculate depth as max parent depth + 1
    let maxDepth = 0;
    for (const fromId of fromIds) {
      const parent = this.nodes.get(fromId);
      if (parent) {
        maxDepth = Math.max(maxDepth, parent.depth);
      }
    }

    // Calculate confidence from parents if not specified
    const parentConfidences = fromIds
      .map(id => this.nodes.get(id)?.assertion.confidence ?? 0.5)
      .filter(c => c > 0);
    const inferredConfidence = confidence ??
      (parentConfidences.length > 0
        ? parentConfidences.reduce((a, b) => a * b, 1) * 0.95
        : 0.5);

    const assertion: Assertion = {
      id: randomUUID(),
      predicate,
      arguments: args,
      truth,
      confidence: inferredConfidence,
      type: "inference",
      timestamp: Date.now(),
    };

    const node: ProofNode = {
      assertion,
      depth: maxDepth + 1,
      children: [],
      parents: [...fromIds],
    };

    this.nodes.set(assertion.id, node);

    // Update parent-child relationships
    for (const fromId of fromIds) {
      const parent = this.nodes.get(fromId);
      if (parent) {
        parent.children.push(assertion.id);
      }

      // Add edge for each inference step
      this.edges.push({
        from: fromId,
        to: assertion.id,
        source,
        rule,
        justification: `Applied ${source.name}: ${rule}`,
      });
    }

    return assertion.id;
  }

  /**
   * Set the final conclusion
   */
  setConclusion(
    fromIds: string[],
    predicateName: string,
    args: LogicVariable[],
    source: InferenceSource,
    rule: string,
    truth: TruthValue = "true"
  ): string {
    const id = this.addInference(fromIds, predicateName, args, source, rule, truth);
    const node = this.nodes.get(id)!;
    node.assertion.type = "conclusion";
    this.conclusionId = id;
    return id;
  }

  /**
   * Resolve a hypothesis (mark it as proven or refuted)
   */
  resolveHypothesis(
    hypothesisId: string,
    truth: TruthValue,
    confidence: number,
    justification: string
  ): void {
    const node = this.nodes.get(hypothesisId);
    if (node && node.assertion.type === "hypothesis") {
      node.assertion.truth = truth;
      node.assertion.confidence = confidence;
    }
  }

  /**
   * Build the final proof tree
   */
  build(): ProofTree {
    if (!this.rootId) {
      throw new Error("Proof tree has no root node");
    }

    const conclusionNode = this.conclusionId
      ? this.nodes.get(this.conclusionId)!
      : this.nodes.get(this.rootId)!;

    const premises: Assertion[] = [];
    for (const node of this.nodes.values()) {
      if (node.parents.length === 0 && node.assertion.type !== "conclusion") {
        premises.push(node.assertion);
      }
    }

    // Calculate max depth
    let maxDepth = 0;
    for (const node of this.nodes.values()) {
      maxDepth = Math.max(maxDepth, node.depth);
    }

    // Validate the tree
    const isValid = this.conclusionId !== null &&
      conclusionNode.assertion.truth !== "unknown";

    return {
      id: this.id,
      rootId: this.rootId,
      nodes: this.nodes,
      edges: this.edges,
      conclusion: conclusionNode.assertion,
      premises,
      isValid,
      depth: maxDepth,
      createdAt: Date.now(),
      engineId: this.engineId,
      context: this.context,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton export
// ─────────────────────────────────────────────────────────────────────────────

export const deepLogicTraceEngine = new DeepLogicTraceEngine();
