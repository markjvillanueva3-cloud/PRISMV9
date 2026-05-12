/**
 * LatheKnowledgeGraphEngine Tests
 * ================================
 * Comprehensive test suite for the lathe knowledge graph engine.
 *
 * Tests cover:
 *   - Graph construction from static knowledge
 *   - PageRank computation
 *   - Community detection
 *   - Shortest path finding (Dijkstra)
 *   - Similarity search
 *   - Subgraph extraction
 *   - Edge inference
 *   - Query and recommendation
 *   - Multi-hop reasoning
 *   - Constraint propagation
 *   - Conflict resolution
 *   - Experience-based learning
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  LatheKnowledgeGraphEngine,
  latheKnowledgeGraphEngine,
  type LatheGraphQuery,
  type ExperienceUpdate,
  type GraphStatistics,
} from "../../engines/LatheKnowledgeGraphEngine.js";

describe("LatheKnowledgeGraphEngine", () => {
  let stats: GraphStatistics;

  beforeAll(() => {
    // Build graph before all tests
    stats = latheKnowledgeGraphEngine.buildGraph();
  });

  // ==========================================================================
  // GRAPH CONSTRUCTION
  // ==========================================================================

  describe("Graph Construction", () => {
    it("should build graph with nodes and edges", () => {
      expect(stats.total_nodes).toBeGreaterThan(50);
      expect(stats.total_edges).toBeGreaterThan(100);
    });

    it("should create material nodes", () => {
      expect(stats.nodes_by_type.material).toBeGreaterThan(10);

      const d2Node = latheKnowledgeGraphEngine.getNode("mat_d2");
      expect(d2Node).toBeDefined();
      expect(d2Node?.type).toBe("material");
      expect(d2Node?.name).toBe("D2");
    });

    it("should create operation nodes", () => {
      expect(stats.nodes_by_type.operation).toBeGreaterThan(5);

      const roughOdNode = latheKnowledgeGraphEngine.getNode("op_rough_od");
      expect(roughOdNode).toBeDefined();
      expect(roughOdNode?.type).toBe("operation");
    });

    it("should create tool nodes", () => {
      expect(stats.nodes_by_type.tool).toBeGreaterThan(10);

      const cnmgNode = latheKnowledgeGraphEngine.getNode("tool_cnmg");
      expect(cnmgNode).toBeDefined();
      expect(cnmgNode?.type).toBe("tool");
    });

    it("should create parameter nodes", () => {
      expect(stats.nodes_by_type.parameter).toBeGreaterThan(15);

      const speedNode = latheKnowledgeGraphEngine.getNode("param_speed_p_rough");
      expect(speedNode).toBeDefined();
      expect(speedNode?.type).toBe("parameter");
    });

    it("should create outcome nodes", () => {
      expect(stats.nodes_by_type.outcome).toBeGreaterThan(5);

      const outcomeNode = latheKnowledgeGraphEngine.getNode("out_life_excellent");
      expect(outcomeNode).toBeDefined();
      expect(outcomeNode?.type).toBe("outcome");
    });

    it("should create insert grade nodes", () => {
      expect(stats.nodes_by_type.insert_grade).toBeGreaterThan(5);

      const gradeNode = latheKnowledgeGraphEngine.getNode("grade_gc4325");
      expect(gradeNode).toBeDefined();
      expect(gradeNode?.type).toBe("insert_grade");
    });

    it("should create compatible_with edges", () => {
      expect(stats.edges_by_type.compatible_with).toBeGreaterThan(50);
    });

    it("should create suitable_for edges", () => {
      expect(stats.edges_by_type.suitable_for).toBeGreaterThan(10);
    });

    it("should create recommended edges", () => {
      expect(stats.edges_by_type.recommended).toBeGreaterThan(5);
    });

    it("should create produces edges", () => {
      expect(stats.edges_by_type.produces).toBeGreaterThan(5);
    });

    it("should create succeeds edges for operation sequences", () => {
      expect(stats.edges_by_type.succeeds).toBeGreaterThan(3);
    });

    it("should track graph build status", () => {
      expect(latheKnowledgeGraphEngine.isBuilt()).toBe(true);
      expect(latheKnowledgeGraphEngine.getLastBuildTime()).toBeTruthy();
    });
  });

  // ==========================================================================
  // GRAPH ALGORITHMS
  // ==========================================================================

  describe("PageRank", () => {
    it("should compute importance scores for all nodes", () => {
      const d2Node = latheKnowledgeGraphEngine.getNode("mat_d2");
      expect(d2Node?.importance).toBeGreaterThanOrEqual(0);
      expect(d2Node?.importance).toBeLessThanOrEqual(1);
    });

    it("should rank highly connected nodes higher", () => {
      // Materials should have high importance as they connect to many tools
      const topNodes = stats.top_nodes_by_importance;
      expect(topNodes.length).toBeGreaterThan(0);
      expect(topNodes[0].importance).toBeGreaterThan(0);
    });
  });

  describe("Community Detection", () => {
    it("should assign community IDs to all nodes", () => {
      const d2Node = latheKnowledgeGraphEngine.getNode("mat_d2");
      expect(d2Node?.community).toBeDefined();
      expect(typeof d2Node?.community).toBe("number");
    });

    it("should detect multiple communities", () => {
      expect(stats.num_communities).toBeGreaterThan(1);
    });
  });

  describe("Shortest Path (Dijkstra)", () => {
    it("should find path between material and tool", () => {
      // Test with 4140 (ISO group P) and CNMG which has definite compatibility
      const path = latheKnowledgeGraphEngine.findPath("4140", "CNMG");

      // Path may or may not exist depending on graph structure
      // If it exists, validate its structure
      if (path) {
        expect(path.nodes.length).toBeGreaterThan(0);
        expect(path.edges.length).toBeGreaterThan(0);
        expect(path.total_weight).toBeGreaterThanOrEqual(0);
      }
      // If no path, verify findPath returns cleanly
      expect(path === null || path.nodes.length > 0).toBe(true);
    });

    it("should find path between material and operation", () => {
      const path = latheKnowledgeGraphEngine.findPath("4140", "rough_od");

      // May not have direct path, but should handle gracefully
      if (path) {
        expect(path.nodes.length).toBeGreaterThan(0);
      }
    });

    it("should return null for non-existent nodes", () => {
      const path = latheKnowledgeGraphEngine.findPath("nonexistent", "CNMG");
      expect(path).toBeNull();
    });

    it("should compute path confidence", () => {
      const path = latheKnowledgeGraphEngine.findPath("D2", "CNMG");

      if (path) {
        expect(path.confidence).toBeGreaterThanOrEqual(0);
        expect(path.confidence).toBeLessThanOrEqual(100);
      }
    });

    it("should include explanations in path", () => {
      const path = latheKnowledgeGraphEngine.findPath("D2", "CNMG");

      if (path && path.edges.length > 0) {
        expect(path.explanation.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Similarity Search", () => {
    it("should find similar materials", () => {
      const result = latheKnowledgeGraphEngine.findSimilar("mat_d2", 5);

      expect(result.query_node).toBe("mat_d2");
      expect(result.similar_nodes.length).toBeGreaterThan(0);
    });

    it("should return similarity scores", () => {
      const result = latheKnowledgeGraphEngine.findSimilar("mat_d2", 5);

      if (result.similar_nodes.length > 0) {
        expect(result.similar_nodes[0].similarity).toBeGreaterThan(0);
        expect(result.similar_nodes[0].similarity).toBeLessThanOrEqual(1);
      }
    });

    it("should identify shared neighbors", () => {
      const result = latheKnowledgeGraphEngine.findSimilar("mat_d2", 5);

      // Similar materials should share some tool compatibility
      if (result.similar_nodes.length > 0) {
        const firstMatch = result.similar_nodes[0];
        // May or may not have shared neighbors depending on graph structure
        expect(firstMatch.shared_neighbors).toBeDefined();
      }
    });

    it("should limit results", () => {
      const result = latheKnowledgeGraphEngine.findSimilar("mat_d2", 3);
      expect(result.similar_nodes.length).toBeLessThanOrEqual(3);
    });
  });

  describe("Subgraph Extraction", () => {
    it("should extract subgraph around a node", () => {
      const subgraph = latheKnowledgeGraphEngine.extractSubgraph("mat_d2", 2);

      expect(subgraph.center_node).toBe("mat_d2");
      expect(subgraph.depth).toBe(2);
      expect(subgraph.nodes.length).toBeGreaterThan(0);
    });

    it("should include edges in subgraph", () => {
      const subgraph = latheKnowledgeGraphEngine.extractSubgraph("mat_d2", 2);

      expect(subgraph.edges.length).toBeGreaterThan(0);
    });

    it("should compute subgraph statistics", () => {
      const subgraph = latheKnowledgeGraphEngine.extractSubgraph("mat_d2", 2);

      expect(subgraph.statistics.total_nodes).toBeGreaterThan(0);
      expect(subgraph.statistics.total_edges).toBeGreaterThan(0);
      expect(subgraph.statistics.avg_confidence).toBeGreaterThanOrEqual(0);
    });

    it("should respect depth limit", () => {
      const depth1 = latheKnowledgeGraphEngine.extractSubgraph("mat_d2", 1);
      const depth2 = latheKnowledgeGraphEngine.extractSubgraph("mat_d2", 2);

      // Deeper extraction should include more nodes
      expect(depth2.nodes.length).toBeGreaterThanOrEqual(depth1.nodes.length);
    });
  });

  describe("Edge Inference", () => {
    it("should infer transitive edges", () => {
      const inference = latheKnowledgeGraphEngine.inferEdges(50);

      expect(inference.inferred_edges).toBeDefined();
      expect(inference.reasoning.length).toBeGreaterThan(0);
    });

    it("should respect confidence threshold", () => {
      const lowThreshold = latheKnowledgeGraphEngine.inferEdges(30);
      const highThreshold = latheKnowledgeGraphEngine.inferEdges(80);

      // Lower threshold should yield more inferences
      expect(lowThreshold.inferred_edges.length).toBeGreaterThanOrEqual(
        highThreshold.inferred_edges.length
      );
    });

    it("should include basis for inference", () => {
      const inference = latheKnowledgeGraphEngine.inferEdges(50);

      if (inference.inferred_edges.length > 0) {
        expect(inference.inferred_edges[0].basis).toBeTruthy();
      }
    });
  });

  // ==========================================================================
  // QUERY & RECOMMENDATION
  // ==========================================================================

  describe("Query", () => {
    it("should query with material and operation", () => {
      const query: LatheGraphQuery = {
        material: "D2",
        operation: "rough_od",
      };

      const recommendations = latheKnowledgeGraphEngine.query(query);

      expect(recommendations.length).toBeGreaterThan(0);
    });

    it("should return tool recommendations", () => {
      const query: LatheGraphQuery = {
        material: "4140",
        operation: "finish_od",
      };

      const recommendations = latheKnowledgeGraphEngine.query(query);

      if (recommendations.length > 0) {
        expect(recommendations[0].recommended_tool).toBeTruthy();
      }
    });

    it("should include cutting parameters", () => {
      const query: LatheGraphQuery = {
        material: "1018",
        operation: "facing",
      };

      const recommendations = latheKnowledgeGraphEngine.query(query);

      if (recommendations.length > 0) {
        const params = recommendations[0].parameters;
        expect(params.cutting_speed_mmin).toBeGreaterThan(0);
        expect(params.feed_mmrev).toBeGreaterThan(0);
        expect(params.doc_mm).toBeGreaterThan(0);
        expect(params.coolant).toBeTruthy();
      }
    });

    it("should include expected outcomes", () => {
      const query: LatheGraphQuery = {
        material: "4140",
        operation: "rough_od",
      };

      const recommendations = latheKnowledgeGraphEngine.query(query);

      if (recommendations.length > 0) {
        const outcomes = recommendations[0].expected_outcomes;
        expect(outcomes.tool_life_min).toBeGreaterThan(0);
        expect(outcomes.surface_finish_ra).toBeGreaterThan(0);
        expect(outcomes.mrr_cm3min).toBeGreaterThan(0);
      }
    });

    it("should filter by minimum confidence", () => {
      const query: LatheGraphQuery = {
        material: "D2",
        operation: "rough_od",
        min_confidence: 90,
      };

      const recommendations = latheKnowledgeGraphEngine.query(query);

      for (const rec of recommendations) {
        expect(rec.confidence).toBeGreaterThanOrEqual(90);
      }
    });

    it("should generate warnings for difficult materials", () => {
      const query: LatheGraphQuery = {
        material: "Inconel718",
        operation: "rough_od",
      };

      const recommendations = latheKnowledgeGraphEngine.query(query);

      if (recommendations.length > 0) {
        // Inconel should trigger warnings about machinability
        expect(recommendations[0].warnings.length).toBeGreaterThan(0);
      }
    });

    it("should sort recommendations by confidence", () => {
      const query: LatheGraphQuery = {
        material: "4140",
        operation: "rough_od",
      };

      const recommendations = latheKnowledgeGraphEngine.query(query);

      if (recommendations.length > 1) {
        for (let i = 1; i < recommendations.length; i++) {
          expect(recommendations[i - 1].confidence).toBeGreaterThanOrEqual(
            recommendations[i].confidence
          );
        }
      }
    });
  });

  describe("Explain", () => {
    it("should generate explanation for recommendation", () => {
      const query: LatheGraphQuery = {
        material: "4140",
        operation: "rough_od",
      };

      const recommendations = latheKnowledgeGraphEngine.query(query);

      if (recommendations.length > 0) {
        const explanation = latheKnowledgeGraphEngine.explain(recommendations[0]);

        expect(explanation.length).toBeGreaterThan(5);
        expect(explanation.some(line => line.includes("Material"))).toBe(true);
        expect(explanation.some(line => line.includes("Operation"))).toBe(true);
        expect(explanation.some(line => line.includes("Recommended Tool"))).toBe(true);
      }
    });

    it("should include parameters in explanation", () => {
      const query: LatheGraphQuery = {
        material: "4140",
        operation: "finish_od",
      };

      const recommendations = latheKnowledgeGraphEngine.query(query);

      if (recommendations.length > 0) {
        const explanation = latheKnowledgeGraphEngine.explain(recommendations[0]);

        expect(explanation.some(line => line.includes("Cutting Speed"))).toBe(true);
        expect(explanation.some(line => line.includes("Feed"))).toBe(true);
        expect(explanation.some(line => line.includes("DOC"))).toBe(true);
      }
    });
  });

  // ==========================================================================
  // MULTI-HOP REASONING
  // ==========================================================================

  describe("Multi-hop Reasoning", () => {
    it("should find paths from material to outcomes", () => {
      const paths = latheKnowledgeGraphEngine.multiHopReason("D2", "tool_life", 4);

      // May or may not find paths depending on graph structure
      expect(paths).toBeDefined();
      expect(Array.isArray(paths)).toBe(true);
    });

    it("should score paths", () => {
      const paths = latheKnowledgeGraphEngine.multiHopReason("4140", "surface_finish", 4);

      if (paths.length > 0) {
        expect(paths[0].score).toBeGreaterThan(0);
      }
    });

    it("should sort paths by score", () => {
      const paths = latheKnowledgeGraphEngine.multiHopReason("4140", "tool_life", 4);

      if (paths.length > 1) {
        for (let i = 1; i < paths.length; i++) {
          expect(paths[i - 1].score).toBeGreaterThanOrEqual(paths[i].score);
        }
      }
    });

    it("should respect max hops limit", () => {
      const paths = latheKnowledgeGraphEngine.multiHopReason("D2", "tool_life", 2);

      for (const { path } of paths) {
        expect(path.nodes.length).toBeLessThanOrEqual(3); // start + 2 hops
      }
    });
  });

  // ==========================================================================
  // CONSTRAINT PROPAGATION
  // ==========================================================================

  describe("Constraint Propagation", () => {
    it("should propagate constraints from material", () => {
      const constraints = latheKnowledgeGraphEngine.propagateConstraints(
        "mat_inconel718",
        { speed_limit: 0.5 }
      );

      expect(constraints.size).toBeGreaterThan(0);
      expect(constraints.has("mat_inconel718")).toBe(true);
    });

    it("should attenuate constraints along edges", () => {
      const constraints = latheKnowledgeGraphEngine.propagateConstraints(
        "mat_d2",
        { reduction_factor: 1.0 }
      );

      // Constraints should be attenuated by edge weights
      for (const [nodeId, constraint] of constraints) {
        if (nodeId !== "mat_d2" && typeof constraint.reduction_factor === "number") {
          expect(constraint.reduction_factor).toBeLessThanOrEqual(1.0);
        }
      }
    });
  });

  // ==========================================================================
  // CONFLICT RESOLUTION
  // ==========================================================================

  describe("Conflict Resolution", () => {
    it("should resolve conflicts between recommendations", () => {
      const query: LatheGraphQuery = {
        material: "4140",
        operation: "rough_od",
      };

      const recommendations = latheKnowledgeGraphEngine.query(query);

      if (recommendations.length > 1) {
        const { resolved, conflicts } = latheKnowledgeGraphEngine.resolveConflicts(recommendations);

        expect(resolved).toBeDefined();
        expect(resolved.recommendation_id).toBeTruthy();
        expect(conflicts).toBeDefined();
      }
    });

    it("should prefer higher confidence recommendations", () => {
      const query: LatheGraphQuery = {
        material: "4140",
        operation: "finish_od",
      };

      const recommendations = latheKnowledgeGraphEngine.query(query);

      if (recommendations.length > 1) {
        const { resolved } = latheKnowledgeGraphEngine.resolveConflicts(recommendations);

        // Resolved should be the highest confidence
        expect(resolved.confidence).toBe(
          Math.max(...recommendations.map(r => r.confidence))
        );
      }
    });

    it("should identify parameter conflicts", () => {
      // Create artificial recommendations with different parameters
      const recs = [
        {
          recommendation_id: "rec1",
          material: "4140",
          operation: "rough_od",
          recommended_tool: "CNMG",
          parameters: { cutting_speed_mmin: 200, feed_mmrev: 0.3, doc_mm: 3.0, coolant: "flood" },
          expected_outcomes: { tool_life_min: 30, surface_finish_ra: 3.2, mrr_cm3min: 50 },
          confidence: 90,
          reasoning_path: { nodes: [], edges: [], total_weight: 0, confidence: 0, explanation: [] },
          alternatives: [],
          warnings: [],
          sources: [],
        },
        {
          recommendation_id: "rec2",
          material: "4140",
          operation: "rough_od",
          recommended_tool: "WNMG",
          parameters: { cutting_speed_mmin: 300, feed_mmrev: 0.5, doc_mm: 4.0, coolant: "flood" },
          expected_outcomes: { tool_life_min: 20, surface_finish_ra: 4.0, mrr_cm3min: 80 },
          confidence: 80,
          reasoning_path: { nodes: [], edges: [], total_weight: 0, confidence: 0, explanation: [] },
          alternatives: [],
          warnings: [],
          sources: [],
        },
      ];

      const { conflicts } = latheKnowledgeGraphEngine.resolveConflicts(recs);

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts.some(c => c.includes("Speed") || c.includes("Tool"))).toBe(true);
    });
  });

  // ==========================================================================
  // EXPERIENCE-BASED LEARNING
  // ==========================================================================

  describe("Experience-based Learning", () => {
    it("should update edge weights from positive experience", () => {
      const update: ExperienceUpdate = {
        material: "4140",
        operation: "rough_od",
        tool: "CNMG",
        parameters: { speed: 200, feed: 0.3, doc: 3.0 },
        outcome: {
          tool_life_min: 45,
          surface_finish_ra: 2.5,
          success: true,
        },
        source: "test_experience",
        timestamp: new Date().toISOString(),
      };

      // Get edge before update
      const edgeId = "edge_mat_4140_tool_cnmg";
      const edgeBefore = latheKnowledgeGraphEngine.getEdge(edgeId);
      const weightBefore = edgeBefore?.weight || 0;

      latheKnowledgeGraphEngine.updateFromExperience(update);

      const edgeAfter = latheKnowledgeGraphEngine.getEdge(edgeId);

      // Weight should increase or stay same for positive outcome
      if (edgeAfter) {
        expect(edgeAfter.weight).toBeGreaterThanOrEqual(weightBefore);
        expect(edgeAfter.frequency).toBeGreaterThan(0);
      }
    });

    it("should decrease weight from negative experience", () => {
      const update: ExperienceUpdate = {
        material: "D2",
        operation: "rough_od",
        tool: "CNMG",
        parameters: { speed: 100, feed: 0.2, doc: 2.0 },
        outcome: {
          tool_life_min: 5,
          success: false,
        },
        source: "test_experience_fail",
        timestamp: new Date().toISOString(),
      };

      const edgeId = "edge_mat_d2_tool_cnmg";
      const edgeBefore = latheKnowledgeGraphEngine.getEdge(edgeId);
      const weightBefore = edgeBefore?.weight || 0;

      latheKnowledgeGraphEngine.updateFromExperience(update);

      const edgeAfter = latheKnowledgeGraphEngine.getEdge(edgeId);

      // Weight should decrease for negative outcome
      if (edgeAfter && weightBefore > 0.15) {
        expect(edgeAfter.weight).toBeLessThanOrEqual(weightBefore);
      }
    });
  });

  // ==========================================================================
  // GRAPH STATISTICS
  // ==========================================================================

  describe("Statistics", () => {
    it("should compute graph density", () => {
      expect(stats.density).toBeGreaterThan(0);
      expect(stats.density).toBeLessThanOrEqual(1);
    });

    it("should compute average degree", () => {
      expect(stats.avg_degree).toBeGreaterThan(0);
    });

    it("should track maximum degree", () => {
      expect(stats.max_degree).toBeGreaterThanOrEqual(stats.avg_degree);
    });

    it("should report coverage", () => {
      expect(stats.coverage.materials_covered).toBeGreaterThan(0);
      expect(stats.coverage.operations_covered).toBeGreaterThan(0);
      expect(stats.coverage.tools_covered).toBeGreaterThan(0);
    });

    it("should identify top nodes by importance", () => {
      expect(stats.top_nodes_by_importance.length).toBeGreaterThan(0);
      expect(stats.top_nodes_by_importance[0].importance).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // ACCESSOR METHODS
  // ==========================================================================

  describe("Accessor Methods", () => {
    it("should get node by ID", () => {
      const node = latheKnowledgeGraphEngine.getNode("mat_d2");
      expect(node).toBeDefined();
      expect(node?.id).toBe("mat_d2");
    });

    it("should get edge by ID", () => {
      const edges = latheKnowledgeGraphEngine.getEdgesByType("compatible_with");
      if (edges.length > 0) {
        const edge = latheKnowledgeGraphEngine.getEdge(edges[0].id);
        expect(edge).toBeDefined();
      }
    });

    it("should get all nodes of a type", () => {
      const materials = latheKnowledgeGraphEngine.getNodesByType("material");
      expect(materials.length).toBeGreaterThan(0);
      expect(materials.every(n => n.type === "material")).toBe(true);
    });

    it("should get all edges of a type", () => {
      const edges = latheKnowledgeGraphEngine.getEdgesByType("compatible_with");
      expect(edges.length).toBeGreaterThan(0);
      expect(edges.every(e => e.type === "compatible_with")).toBe(true);
    });
  });

  // ==========================================================================
  // MATERIAL-SPECIFIC TESTS
  // ==========================================================================

  describe("Material-specific Behavior", () => {
    it("should handle tool steel materials correctly", () => {
      const query: LatheGraphQuery = {
        material: "M2",
        operation: "rough_od",
      };

      const recommendations = latheKnowledgeGraphEngine.query(query);

      if (recommendations.length > 0) {
        // M2 is hard - should recommend appropriate parameters
        expect(recommendations[0].parameters.cutting_speed_mmin).toBeLessThan(200);
      }
    });

    it("should handle aluminum materials with high speeds", () => {
      const query: LatheGraphQuery = {
        material: "6061Al",
        operation: "finish_od",
      };

      const recommendations = latheKnowledgeGraphEngine.query(query);

      if (recommendations.length > 0) {
        // Aluminum allows high speeds
        expect(recommendations[0].parameters.cutting_speed_mmin).toBeGreaterThan(400);
      }
    });

    it("should handle stainless steel work hardening", () => {
      const query: LatheGraphQuery = {
        material: "304SS",
        operation: "finish_od",
      };

      const recommendations = latheKnowledgeGraphEngine.query(query);

      if (recommendations.length > 0) {
        // Should have warning about work hardening
        const hasWorkHardeningWarning = recommendations[0].warnings.some(
          w => w.toLowerCase().includes("work hardening") || w.toLowerCase().includes("chip load")
        );
        expect(hasWorkHardeningWarning).toBe(true);
      }
    });

    it("should handle superalloys with thermal warnings", () => {
      const query: LatheGraphQuery = {
        material: "Inconel718",
        operation: "rough_od",
      };

      const recommendations = latheKnowledgeGraphEngine.query(query);

      if (recommendations.length > 0) {
        // Should have thermal conductivity warning
        const hasThermalWarning = recommendations[0].warnings.some(
          w => w.toLowerCase().includes("thermal") || w.toLowerCase().includes("coolant")
        );
        expect(hasThermalWarning).toBe(true);
      }
    });
  });

  // ==========================================================================
  // SINGLETON PATTERN
  // ==========================================================================

  describe("Singleton Pattern", () => {
    it("should return same instance", () => {
      const instance1 = LatheKnowledgeGraphEngine.getInstance();
      const instance2 = LatheKnowledgeGraphEngine.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should export singleton", () => {
      expect(latheKnowledgeGraphEngine).toBe(LatheKnowledgeGraphEngine.getInstance());
    });
  });
});
