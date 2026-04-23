// WIRE-EXEMPT: tests in ContinualLearningEngines.test.ts (49 cases)
/**
 * Learning Cascade Engine — U-LEARN-10
 * =====================================
 *
 * Propagation graph for confirmed outcomes. When an outcome is confirmed,
 * it fans out to: LoRA fine-tune, TribalKB structured tuple, Playbook
 * rule-proposal (auto-promote at N=5 confirmations).
 *
 * Graph structure:
 * - Nodes: lora_finetune, tribal_kb, playbook_rule, feature_store
 * - Edges: weighted propagation paths
 * - Thresholds: per-node confirmation count for auto-promotion
 *
 * @module engines/LearningCascadeEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-10
 */

import {
  CascadeGraphSchema,
  CascadeOutcomeSchema,
  CascadePropagationResultSchema,
  type CascadeGraph,
  type CascadeOutcome,
  type CascadePropagationResult,
  type CascadeNode,
} from "../schemas/continualLearningSchema.js";

interface GraphState {
  nodes: Map<string, CascadeNode & { confirmations: number; pendingOutcomes: string[] }>;
  edges: Array<{ from: string; to: string; weight: number }>;
  propagationCount: number;
}

class LearningCascadeEngine {
  private graphs: Map<string, GraphState> = new Map();

  /**
   * Create a cascade graph.
   * @param graph - Graph definition
   * @returns Graph creation confirmation
   */
  createGraph(graph: CascadeGraph): { graph_id: string; node_count: number; edge_count: number } {
    const parsed = CascadeGraphSchema.parse(graph);

    const nodes = new Map<string, CascadeNode & { confirmations: number; pendingOutcomes: string[] }>();
    for (const node of parsed.nodes) {
      nodes.set(node.node_id, {
        ...node,
        confirmations: 0,
        pendingOutcomes: [],
      });
    }

    this.graphs.set(parsed.graph_id, {
      nodes,
      edges: parsed.edges,
      propagationCount: 0,
    });

    return {
      graph_id: parsed.graph_id,
      node_count: nodes.size,
      edge_count: parsed.edges.length,
    };
  }

  /**
   * Propagate a confirmed outcome through the cascade.
   * @param outcome - Outcome to propagate
   * @returns Propagation results
   */
  propagate(outcome: CascadeOutcome): CascadePropagationResult {
    const startTime = performance.now();
    const parsed = CascadeOutcomeSchema.parse(outcome);

    const graph = this.graphs.get(parsed.graph_id);
    if (!graph) throw new Error(`Graph not found: ${parsed.graph_id}`);

    const triggered: string[] = [];
    const actions: Array<{ node_id: string; action: string; success: boolean }> = [];

    const rootNodes = this.findRootNodes(graph);

    for (const rootId of rootNodes) {
      this.propagateToNode(graph, rootId, parsed, triggered, actions);
    }

    graph.propagationCount++;

    return CascadePropagationResultSchema.parse({
      outcome_id: parsed.outcome_id,
      nodes_triggered: triggered,
      actions_taken: actions,
      propagation_time_ms: performance.now() - startTime,
    });
  }

  private findRootNodes(graph: GraphState): string[] {
    const hasIncoming = new Set<string>();
    for (const edge of graph.edges) {
      hasIncoming.add(edge.to);
    }
    return Array.from(graph.nodes.keys()).filter(id => !hasIncoming.has(id));
  }

  private propagateToNode(
    graph: GraphState,
    nodeId: string,
    outcome: CascadeOutcome,
    triggered: string[],
    actions: Array<{ node_id: string; action: string; success: boolean }>
  ): void {
    const node = graph.nodes.get(nodeId);
    if (!node) return;

    triggered.push(nodeId);
    node.confirmations++;
    node.pendingOutcomes.push(outcome.outcome_id);

    const action = this.executeNodeAction(node, outcome);
    actions.push(action);

    const outEdges = graph.edges.filter(e => e.from === nodeId);
    for (const edge of outEdges) {
      if (Math.random() < edge.weight) {
        this.propagateToNode(graph, edge.to, outcome, triggered, actions);
      }
    }
  }

  private executeNodeAction(
    node: CascadeNode & { confirmations: number; pendingOutcomes: string[] },
    outcome: CascadeOutcome
  ): { node_id: string; action: string; success: boolean } {
    switch (node.node_type) {
      case "lora_finetune":
        return {
          node_id: node.node_id,
          action: `queue_finetune:${outcome.domain}:${Object.keys(outcome.delta).join(",")}`,
          success: true,
        };

      case "tribal_kb":
        return {
          node_id: node.node_id,
          action: `store_tip:${outcome.domain}:${outcome.material ?? "general"}`,
          success: true,
        };

      case "playbook_rule":
        if (node.auto_promote && node.confirmations >= node.threshold_count) {
          return {
            node_id: node.node_id,
            action: `promote_rule:${outcome.domain}:confirmations=${node.confirmations}`,
            success: true,
          };
        }
        return {
          node_id: node.node_id,
          action: `propose_rule:${outcome.domain}:pending=${node.confirmations}/${node.threshold_count}`,
          success: true,
        };

      case "feature_store":
        return {
          node_id: node.node_id,
          action: `store_features:${outcome.outcome_id}`,
          success: true,
        };

      default:
        return {
          node_id: node.node_id,
          action: "unknown_action",
          success: false,
        };
    }
  }

  /**
   * Get graph statistics.
   */
  getStats(graphId: string): {
    node_count: number;
    propagation_count: number;
    node_confirmations: Record<string, number>;
  } | null {
    const graph = this.graphs.get(graphId);
    if (!graph) return null;

    const confirmations: Record<string, number> = {};
    graph.nodes.forEach((node, id) => {
      confirmations[id] = node.confirmations;
    });

    return {
      node_count: graph.nodes.size,
      propagation_count: graph.propagationCount,
      node_confirmations: confirmations,
    };
  }

  /**
   * Get pending outcomes for a node.
   */
  getPendingOutcomes(graphId: string, nodeId: string): string[] {
    const graph = this.graphs.get(graphId);
    if (!graph) return [];
    const node = graph.nodes.get(nodeId);
    return node?.pendingOutcomes ?? [];
  }

  /**
   * Clear pending outcomes after processing.
   */
  clearPending(graphId: string, nodeId: string): boolean {
    const graph = this.graphs.get(graphId);
    if (!graph) return false;
    const node = graph.nodes.get(nodeId);
    if (!node) return false;
    node.pendingOutcomes = [];
    return true;
  }

  /**
   * List all graphs.
   */
  listGraphs(): string[] {
    return Array.from(this.graphs.keys());
  }

  /**
   * Delete a graph.
   */
  deleteGraph(graphId: string): boolean {
    return this.graphs.delete(graphId);
  }

  /**
   * Clear all graphs.
   */
  clear(): void {
    this.graphs.clear();
  }

  static getSelfAwareness() {
    return {
      name: "LearningCascadeEngine",
      version: "1.0.0",
      milestone: "PSAU P2.5-LEARN U-LEARN-10",
      capabilities: ["createGraph", "propagate", "getStats", "getPendingOutcomes"],
    };
  }
}

export const learningCascadeEngine = new LearningCascadeEngine();
