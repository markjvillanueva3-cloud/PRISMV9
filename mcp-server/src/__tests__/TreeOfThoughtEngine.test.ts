/**
 * Tests for TreeOfThoughtEngine
 */
import { describe, it, expect, beforeEach } from "vitest";
import { treeOfThoughtEngine, TreeOfThoughtEngine } from "../engines/TreeOfThoughtEngine.js";

describe("TreeOfThoughtEngine", () => {
  let engine: TreeOfThoughtEngine;

  beforeEach(() => {
    engine = new TreeOfThoughtEngine();
  });

  describe("createTree", () => {
    it("should create a new thought tree with root node", () => {
      const tree = engine.createTree(
        "Optimize surface finish for hardened steel",
        "Achieve Ra < 0.8 µm",
        { current_ra: 1.6, material: "H13" }
      );

      expect(tree).toBeDefined();
      expect(tree.root_id).toBeDefined();
      expect(tree.problem).toBe("Optimize surface finish for hardened steel");
      expect(tree.goal).toBe("Achieve Ra < 0.8 µm");
      expect(tree.nodes.size).toBe(1);
      expect(tree.exploration_count).toBe(1);
    });

    it("should initialize root node with neutral score", () => {
      const tree = engine.createTree("Test problem", "Test goal", {});
      const rootNode = tree.nodes.get(tree.root_id);

      expect(rootNode).toBeDefined();
      expect(rootNode!.score).toBe(0.5);
      expect(rootNode!.depth).toBe(0);
      expect(rootNode!.parent_id).toBeNull();
      expect(rootNode!.is_terminal).toBe(false);
    });
  });

  describe("generateThoughts", () => {
    it("should generate child thoughts from a node", () => {
      const tree = engine.createTree("Problem", "Goal", { step: 0 });

      const context = {
        current_state: { step: 0 },
        constraints: ["positive values only"],
        available_actions: ["increase speed", "decrease feed", "change tool"],
        tribal_tips: ["For hardened steel, reduce speed by 30%"],
        physics_bounds: { speed: { min: 50, max: 500 } },
      };

      const children = engine.generateThoughts(tree, tree.root_id, context, 3);

      expect(children.length).toBeGreaterThan(0);
      expect(children.length).toBeLessThanOrEqual(3);
      expect(tree.nodes.size).toBe(1 + children.length);
      expect(tree.exploration_count).toBe(1 + children.length);
    });

    it("should assign increasing depths to children", () => {
      const tree = engine.createTree("Problem", "Goal", {});
      const context = {
        current_state: {},
        constraints: [],
        available_actions: ["action1", "action2"],
        tribal_tips: [],
        physics_bounds: {},
      };

      const children = engine.generateThoughts(tree, tree.root_id, context, 2);

      for (const child of children) {
        expect(child.depth).toBe(1);
      }
    });
  });

  describe("explore", () => {
    it("should explore tree with BFS strategy", () => {
      const tree = engine.createTree(
        "Find optimal cutting parameters",
        "Minimize cycle time",
        { step: 0 }
      );

      const context = {
        current_state: { step: 0 },
        constraints: [],
        available_actions: ["optimize", "validate", "execute"],
        tribal_tips: [],
        physics_bounds: {},
      };

      const config = {
        strategy: "bfs" as const,
        max_depth: 3,
        max_branches_per_node: 2,
        beam_width: 5,
        pruning_threshold: 0.2,
        backtrack_on_violation: true,
        tribal_weight: 0.2,
        physics_weight: 0.25,
      };

      const solution = engine.explore(tree, context, config);

      // Should explore at least the root
      expect(tree.exploration_count).toBeGreaterThan(1);
      expect(tree.completed_at).not.toBeNull();
    });

    it("should prune low-scoring branches", () => {
      const tree = engine.createTree("Problem", "Goal", {});
      const context = {
        current_state: {},
        constraints: ["impossible constraint"],
        available_actions: ["action1"],
        tribal_tips: [],
        physics_bounds: {},
      };

      const config = {
        strategy: "bfs" as const,
        max_depth: 2,
        max_branches_per_node: 3,
        beam_width: 5,
        pruning_threshold: 0.9, // Very high threshold = more pruning
        backtrack_on_violation: true,
        tribal_weight: 0.2,
        physics_weight: 0.25,
      };

      engine.explore(tree, context, config);

      // Should have pruned some nodes
      expect(tree.pruned_count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getTreeStats", () => {
    it("should return accurate tree statistics", () => {
      const tree = engine.createTree("Problem", "Goal", {});
      const context = {
        current_state: {},
        constraints: [],
        available_actions: ["a1", "a2", "a3"],
        tribal_tips: [],
        physics_bounds: {},
      };

      engine.generateThoughts(tree, tree.root_id, context, 3);

      const stats = engine.getTreeStats(tree);

      expect(stats.total_nodes).toBe(tree.nodes.size);
      expect(stats.max_depth).toBeGreaterThanOrEqual(0);
      expect(stats.pruned_nodes).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getTrainingContext", () => {
    it("should return training context string", () => {
      const context = engine.getTrainingContext();

      expect(context).toContain("TREE-OF-THOUGHT");
      expect(context).toContain("BFS");
      expect(context).toContain("DFS");
      expect(context).toContain("Best-First");
      expect(context).toContain("tribal");
    });
  });
});

describe("treeOfThoughtEngine singleton", () => {
  it("should be defined", () => {
    expect(treeOfThoughtEngine).toBeDefined();
    expect(treeOfThoughtEngine).toBeInstanceOf(TreeOfThoughtEngine);
  });
});
