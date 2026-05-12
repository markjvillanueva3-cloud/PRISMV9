/**
 * TreeOfThoughtEngine — Multi-Path Reasoning for Complex Problem Solving
 * ========================================================================
 * Implements Tree-of-Thought (ToT) reasoning pattern that explores multiple
 * solution paths simultaneously, evaluates intermediate states, and selects
 * optimal branches using mathematical scoring.
 *
 * Based on "Tree of Thoughts: Deliberate Problem Solving with Large Language Models"
 * (Yao et al., 2023) with manufacturing-specific optimizations.
 *
 * Key Features:
 *   - Breadth-first and depth-first exploration strategies
 *   - Branch scoring using domain-specific heuristics
 *   - Pruning of low-value branches for efficiency
 *   - Integration with tribal knowledge for branch evaluation
 *   - Backtracking support for constraint violations
 *
 * @module engines/TreeOfThoughtEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ThoughtNode {
  id: string;
  depth: number;
  parent_id: string | null;
  thought: string;
  state: Record<string, unknown>;
  score: number;
  confidence: number;
  is_terminal: boolean;
  is_pruned: boolean;
  children: string[];
  evaluation: NodeEvaluation;
  metadata: {
    created_at: string;
    exploration_strategy: "bfs" | "dfs" | "best_first";
    branch_reason: string;
  };
}

export interface NodeEvaluation {
  feasibility: number;      // 0-1: Can this state lead to a valid solution?
  progress: number;         // 0-1: How much closer to goal?
  constraint_violations: string[];
  tribal_alignment: number; // 0-1: Alignment with tribal knowledge
  physics_validity: number; // 0-1: Physics constraints satisfied
  composite_score: number;  // Weighted combination
}

export interface ThoughtTree {
  root_id: string;
  problem: string;
  goal: string;
  nodes: Map<string, ThoughtNode>;
  best_path: string[];
  exploration_count: number;
  pruned_count: number;
  max_depth_reached: number;
  created_at: string;
  completed_at: string | null;
}

export interface ExplorationConfig {
  strategy: "bfs" | "dfs" | "best_first";
  max_depth: number;
  max_branches_per_node: number;
  beam_width: number;  // For best_first: how many top nodes to expand
  pruning_threshold: number;  // Score below which to prune
  backtrack_on_violation: boolean;
  tribal_weight: number;  // Weight for tribal knowledge in scoring
  physics_weight: number; // Weight for physics validity in scoring
}

export interface ThoughtGeneratorContext {
  current_state: Record<string, unknown>;
  constraints: string[];
  available_actions: string[];
  tribal_tips: string[];
  physics_bounds: Record<string, { min: number; max: number }>;
}

export interface TreeSolution {
  path: ThoughtNode[];
  final_state: Record<string, unknown>;
  total_score: number;
  depth: number;
  branches_explored: number;
  branches_pruned: number;
  reasoning_chain: string[];
  confidence: number;
}

// ============================================================================
// SCORING WEIGHTS (based on manufacturing domain importance)
// ============================================================================

const DEFAULT_SCORING_WEIGHTS = {
  feasibility: 0.30,
  progress: 0.25,
  tribal_alignment: 0.20,
  physics_validity: 0.25,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class TreeOfThoughtEngine {
  private trees: Map<string, ThoughtTree> = new Map();
  private nodeCounter = 0;

  /**
   * Create a new thought tree for a problem.
   */
  createTree(
    problem: string,
    goal: string,
    initial_state: Record<string, unknown>
  ): ThoughtTree {
    const treeId = `tree_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const rootId = this.generateNodeId();

    const rootNode: ThoughtNode = {
      id: rootId,
      depth: 0,
      parent_id: null,
      thought: `Initial state: ${problem}`,
      state: initial_state,
      score: 0.5,  // Neutral starting score
      confidence: 1.0,
      is_terminal: false,
      is_pruned: false,
      children: [],
      evaluation: {
        feasibility: 1.0,
        progress: 0.0,
        constraint_violations: [],
        tribal_alignment: 0.5,
        physics_validity: 1.0,
        composite_score: 0.5,
      },
      metadata: {
        created_at: new Date().toISOString(),
        exploration_strategy: "bfs",
        branch_reason: "root",
      },
    };

    const tree: ThoughtTree = {
      root_id: rootId,
      problem,
      goal,
      nodes: new Map([[rootId, rootNode]]),
      best_path: [rootId],
      exploration_count: 1,
      pruned_count: 0,
      max_depth_reached: 0,
      created_at: new Date().toISOString(),
      completed_at: null,
    };

    this.trees.set(treeId, tree);
    log.info(`[TreeOfThought] Created tree ${treeId} for problem: ${problem.slice(0, 50)}...`);

    return tree;
  }

  /**
   * Generate child thoughts for a node.
   */
  generateThoughts(
    tree: ThoughtTree,
    nodeId: string,
    context: ThoughtGeneratorContext,
    count: number = 3
  ): ThoughtNode[] {
    const parent = tree.nodes.get(nodeId);
    if (!parent) {
      throw new Error(`Node ${nodeId} not found in tree`);
    }

    const children: ThoughtNode[] = [];

    // Generate diverse thoughts based on available actions and context
    const thoughtStrategies = [
      this.generateIncrementalThought.bind(this),
      this.generateAlternativeThought.bind(this),
      this.generateTribalGuidedThought.bind(this),
    ];

    for (let i = 0; i < count && i < context.available_actions.length; i++) {
      const strategy = thoughtStrategies[i % thoughtStrategies.length];
      const thought = strategy(parent, context, i);

      if (thought) {
        const childId = this.generateNodeId();
        const evaluation = this.evaluateNode(thought, context, tree.goal);

        const childNode: ThoughtNode = {
          id: childId,
          depth: parent.depth + 1,
          parent_id: nodeId,
          thought: thought.description,
          state: thought.new_state,
          score: evaluation.composite_score,
          confidence: thought.confidence,
          is_terminal: this.isTerminalState(thought.new_state, tree.goal),
          is_pruned: false,
          children: [],
          evaluation,
          metadata: {
            created_at: new Date().toISOString(),
            exploration_strategy: "bfs",
            branch_reason: thought.reason,
          },
        };

        children.push(childNode);
        tree.nodes.set(childId, childNode);
        parent.children.push(childId);
        tree.exploration_count++;

        if (childNode.depth > tree.max_depth_reached) {
          tree.max_depth_reached = childNode.depth;
        }
      }
    }

    return children;
  }

  /**
   * Explore the tree using the specified strategy.
   */
  explore(
    tree: ThoughtTree,
    context: ThoughtGeneratorContext,
    config: ExplorationConfig
  ): TreeSolution | null {
    const frontier: string[] = [tree.root_id];
    let bestSolution: TreeSolution | null = null;

    while (frontier.length > 0 && tree.exploration_count < 1000) {
      // Select next node based on strategy
      const currentId = this.selectNextNode(frontier, tree, config.strategy);
      if (!currentId) break;

      const current = tree.nodes.get(currentId);
      if (!current || current.is_pruned) continue;

      // Check if terminal
      if (current.is_terminal) {
        const solution = this.extractSolution(tree, currentId);
        if (!bestSolution || solution.total_score > bestSolution.total_score) {
          bestSolution = solution;
        }
        continue;
      }

      // Check depth limit
      if (current.depth >= config.max_depth) {
        continue;
      }

      // Generate and evaluate children
      const children = this.generateThoughts(
        tree,
        currentId,
        context,
        config.max_branches_per_node
      );

      // Prune low-scoring branches
      for (const child of children) {
        if (child.score < config.pruning_threshold) {
          child.is_pruned = true;
          tree.pruned_count++;
        } else {
          frontier.push(child.id);
        }
      }

      // Backtrack if constraint violations and config allows
      if (config.backtrack_on_violation && current.evaluation.constraint_violations.length > 0) {
        current.is_pruned = true;
        tree.pruned_count++;
      }

      // Apply beam width for best_first
      if (config.strategy === "best_first" && frontier.length > config.beam_width) {
        const scored = frontier.map(id => ({ id, score: tree.nodes.get(id)?.score ?? 0 }));
        scored.sort((a, b) => b.score - a.score);
        frontier.length = 0;
        frontier.push(...scored.slice(0, config.beam_width).map(s => s.id));
      }
    }

    tree.completed_at = new Date().toISOString();

    if (bestSolution) {
      tree.best_path = bestSolution.path.map(n => n.id);
    }

    return bestSolution;
  }

  /**
   * Evaluate a node's state against constraints and goals.
   */
  private evaluateNode(
    thought: { description: string; new_state: Record<string, unknown>; confidence: number; reason: string },
    context: ThoughtGeneratorContext,
    goal: string
  ): NodeEvaluation {
    // Feasibility check
    const violations: string[] = [];
    let feasibility = 1.0;

    for (const constraint of context.constraints) {
      if (!this.checkConstraint(thought.new_state, constraint)) {
        violations.push(constraint);
        feasibility -= 0.2;
      }
    }
    feasibility = Math.max(0, feasibility);

    // Progress toward goal
    const progress = this.estimateProgress(thought.new_state, goal);

    // Tribal alignment
    let tribal_alignment = 0.5;
    for (const tip of context.tribal_tips) {
      if (this.alignsWithTip(thought.description, tip)) {
        tribal_alignment += 0.1;
      }
    }
    tribal_alignment = Math.min(1.0, tribal_alignment);

    // Physics validity
    let physics_validity = 1.0;
    for (const [param, bounds] of Object.entries(context.physics_bounds)) {
      const value = thought.new_state[param] as number | undefined;
      if (value !== undefined) {
        if (value < bounds.min || value > bounds.max) {
          physics_validity -= 0.25;
        }
      }
    }
    physics_validity = Math.max(0, physics_validity);

    // Composite score
    const composite_score =
      feasibility * DEFAULT_SCORING_WEIGHTS.feasibility +
      progress * DEFAULT_SCORING_WEIGHTS.progress +
      tribal_alignment * DEFAULT_SCORING_WEIGHTS.tribal_alignment +
      physics_validity * DEFAULT_SCORING_WEIGHTS.physics_validity;

    return {
      feasibility,
      progress,
      constraint_violations: violations,
      tribal_alignment,
      physics_validity,
      composite_score,
    };
  }

  /**
   * Generate an incremental thought (small step forward).
   */
  private generateIncrementalThought(
    parent: ThoughtNode,
    context: ThoughtGeneratorContext,
    index: number
  ): { description: string; new_state: Record<string, unknown>; confidence: number; reason: string } | null {
    const action = context.available_actions[index];
    if (!action) return null;

    return {
      description: `Apply ${action} to progress from current state`,
      new_state: { ...parent.state, last_action: action, step: (parent.state.step as number ?? 0) + 1 },
      confidence: 0.8,
      reason: "incremental_progress",
    };
  }

  /**
   * Generate an alternative approach thought.
   */
  private generateAlternativeThought(
    parent: ThoughtNode,
    context: ThoughtGeneratorContext,
    index: number
  ): { description: string; new_state: Record<string, unknown>; confidence: number; reason: string } | null {
    const action = context.available_actions[Math.min(index + 1, context.available_actions.length - 1)];
    if (!action) return null;

    return {
      description: `Try alternative approach: ${action}`,
      new_state: { ...parent.state, alternative: true, approach: action, step: (parent.state.step as number ?? 0) + 1 },
      confidence: 0.6,
      reason: "alternative_exploration",
    };
  }

  /**
   * Generate a tribal-knowledge guided thought.
   */
  private generateTribalGuidedThought(
    parent: ThoughtNode,
    context: ThoughtGeneratorContext,
    _index: number
  ): { description: string; new_state: Record<string, unknown>; confidence: number; reason: string } | null {
    const tip = context.tribal_tips[0];
    if (!tip) return null;

    return {
      description: `Apply tribal knowledge: ${tip.slice(0, 100)}`,
      new_state: { ...parent.state, tribal_guided: true, tip_applied: tip.slice(0, 50), step: (parent.state.step as number ?? 0) + 1 },
      confidence: 0.85,
      reason: "tribal_knowledge_application",
    };
  }

  /**
   * Select next node based on exploration strategy.
   */
  private selectNextNode(frontier: string[], tree: ThoughtTree, strategy: "bfs" | "dfs" | "best_first"): string | undefined {
    if (frontier.length === 0) return undefined;

    switch (strategy) {
      case "bfs":
        return frontier.shift();  // FIFO
      case "dfs":
        return frontier.pop();   // LIFO
      case "best_first":
        // Sort by score and take best
        frontier.sort((a, b) => {
          const scoreA = tree.nodes.get(a)?.score ?? 0;
          const scoreB = tree.nodes.get(b)?.score ?? 0;
          return scoreB - scoreA;
        });
        return frontier.shift();
      default:
        return frontier.shift();
    }
  }

  /**
   * Check if state satisfies a constraint.
   */
  private checkConstraint(state: Record<string, unknown>, constraint: string): boolean {
    // Simple pattern matching for constraint checking
    // In production, this would use a proper constraint solver
    const constraintLower = constraint.toLowerCase();

    if (constraintLower.includes("positive") && state.value !== undefined) {
      return (state.value as number) > 0;
    }
    if (constraintLower.includes("non-zero") && state.value !== undefined) {
      return (state.value as number) !== 0;
    }

    // Default: assume satisfied if we can't parse
    return true;
  }

  /**
   * Estimate progress toward goal (0-1).
   */
  private estimateProgress(state: Record<string, unknown>, goal: string): number {
    // Simple heuristic based on step count and state completeness
    const step = (state.step as number) ?? 0;
    const hasResult = state.result !== undefined;
    const goalReached = state.goal_reached === true;

    if (goalReached) return 1.0;
    if (hasResult) return 0.8;

    return Math.min(0.7, step * 0.15);
  }

  /**
   * Check if a tip aligns with a thought description.
   */
  private alignsWithTip(description: string, tip: string): boolean {
    const descWords = description.toLowerCase().split(/\s+/);
    const tipWords = tip.toLowerCase().split(/\s+/);

    const commonWords = descWords.filter(w => tipWords.includes(w) && w.length > 3);
    return commonWords.length >= 2;
  }

  /**
   * Check if state is terminal (goal reached).
   */
  private isTerminalState(state: Record<string, unknown>, goal: string): boolean {
    return state.goal_reached === true || state.terminal === true;
  }

  /**
   * Extract solution path from tree.
   */
  private extractSolution(tree: ThoughtTree, terminalId: string): TreeSolution {
    const path: ThoughtNode[] = [];
    let currentId: string | null = terminalId;

    while (currentId) {
      const node = tree.nodes.get(currentId);
      if (node) {
        path.unshift(node);
        currentId = node.parent_id;
      } else {
        currentId = null;
      }
    }

    const terminal = tree.nodes.get(terminalId)!;

    return {
      path,
      final_state: terminal.state,
      total_score: path.reduce((sum, n) => sum + n.score, 0) / path.length,
      depth: path.length - 1,
      branches_explored: tree.exploration_count,
      branches_pruned: tree.pruned_count,
      reasoning_chain: path.map(n => n.thought),
      confidence: path.reduce((prod, n) => prod * n.confidence, 1),
    };
  }

  /**
   * Generate unique node ID.
   */
  private generateNodeId(): string {
    return `node_${++this.nodeCounter}_${Date.now().toString(36)}`;
  }

  /**
   * Get tree statistics.
   */
  getTreeStats(tree: ThoughtTree): {
    total_nodes: number;
    max_depth: number;
    pruned_nodes: number;
    terminal_nodes: number;
    average_branching_factor: number;
  } {
    let terminal_count = 0;
    let total_children = 0;
    let non_leaf_count = 0;

    for (const node of tree.nodes.values()) {
      if (node.is_terminal) terminal_count++;
      if (node.children.length > 0) {
        total_children += node.children.length;
        non_leaf_count++;
      }
    }

    return {
      total_nodes: tree.nodes.size,
      max_depth: tree.max_depth_reached,
      pruned_nodes: tree.pruned_count,
      terminal_nodes: terminal_count,
      average_branching_factor: non_leaf_count > 0 ? total_children / non_leaf_count : 0,
    };
  }

  /**
   * Get training context for AI integration.
   */
  getTrainingContext(): string {
    return `
TREE-OF-THOUGHT REASONING ENGINE
================================
Capabilities:
  - Multi-path exploration with BFS, DFS, and Best-First strategies
  - Branch pruning based on composite scoring (feasibility, progress, tribal alignment, physics validity)
  - Backtracking on constraint violations
  - Integration with tribal knowledge for guided exploration
  - Physics-bounded state validation

Scoring Weights:
  Feasibility: 30%
  Progress: 25%
  Tribal Alignment: 20%
  Physics Validity: 25%

Best For:
  - Complex manufacturing decisions with multiple viable paths
  - Tool/material selection with constraints
  - Process planning with trade-offs
  - Debugging multi-step CAM operations
`.trim();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const treeOfThoughtEngine = new TreeOfThoughtEngine();
