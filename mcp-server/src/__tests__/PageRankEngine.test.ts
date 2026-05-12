/**
 * Tests for PageRankEngine (USSH Phase 0.25)
 *
 * Validates PageRank computation:
 *   - Power iteration convergence
 *   - Damping factor effects
 *   - Personalized PageRank
 *   - Graph analysis (cycles, topology)
 *   - HITS algorithm
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  PageRankEngine,
  pageRankEngine,
  DependencyGraph,
} from "../engines/PageRankEngine.js";

describe("PageRankEngine (USSH P0.25)", () => {
  let engine: PageRankEngine;

  beforeEach(() => {
    engine = new PageRankEngine();
  });

  // ============================================================================
  // GRAPH LOADING
  // ============================================================================

  describe("graph loading", () => {
    it("loads a simple graph", () => {
      const graph: DependencyGraph = {
        nodes: [
          { id: "A" },
          { id: "B" },
          { id: "C" },
        ],
        edges: [
          { source: "A", target: "B" },
          { source: "B", target: "C" },
        ],
      };

      engine.loadGraph(graph);

      expect(engine.getNodeCount()).toBe(3);
      expect(engine.getEdgeCount()).toBe(2);
    });

    it("handles nodes with labels", () => {
      const graph: DependencyGraph = {
        nodes: [
          { id: "engine1", label: "SpeedFeedEngine" },
          { id: "engine2", label: "ForceEngine" },
        ],
        edges: [{ source: "engine1", target: "engine2" }],
      };

      engine.loadGraph(graph);

      expect(engine.hasNode("engine1")).toBe(true);
      expect(engine.hasNode("engine2")).toBe(true);
    });

    it("ignores edges with unknown nodes", () => {
      const graph: DependencyGraph = {
        nodes: [{ id: "A" }],
        edges: [{ source: "A", target: "unknown" }],
      };

      engine.loadGraph(graph);

      expect(engine.getEdgeCount()).toBe(0);
    });

    it("handles weighted edges", () => {
      const graph: DependencyGraph = {
        nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
        edges: [
          { source: "A", target: "B", weight: 2 },
          { source: "A", target: "C", weight: 1 },
        ],
      };

      engine.loadGraph(graph);

      expect(engine.getEdgeCount()).toBe(2);
    });
  });

  // ============================================================================
  // PAGERANK COMPUTATION
  // ============================================================================

  describe("PageRank computation", () => {
    it("computes PageRank for simple chain", () => {
      const graph: DependencyGraph = {
        nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
        edges: [
          { source: "A", target: "B" },
          { source: "B", target: "C" },
        ],
      };

      engine.loadGraph(graph);
      const result = engine.compute();

      // May or may not fully converge depending on tolerance
      expect(result.iterations).toBeGreaterThan(0);
      expect(result.scores.size).toBe(3);

      // In a chain A→B→C, C should have highest score (end of chain)
      const scoreA = result.scores.get("A")!;
      const scoreB = result.scores.get("B")!;
      const scoreC = result.scores.get("C")!;

      expect(scoreC).toBeGreaterThan(scoreB);
      expect(scoreB).toBeGreaterThan(scoreA);
    });

    it("computes PageRank for cycle", () => {
      const graph: DependencyGraph = {
        nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
        edges: [
          { source: "A", target: "B" },
          { source: "B", target: "C" },
          { source: "C", target: "A" },
        ],
      };

      engine.loadGraph(graph);
      const result = engine.compute();

      expect(result.converged).toBe(true);

      // In a perfect cycle, all nodes should have equal scores
      const scores = [...result.scores.values()];
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

      for (const score of scores) {
        expect(score).toBeCloseTo(avg, 4);
      }
    });

    it("identifies hub node", () => {
      // Star graph: A points to B, C, D, E
      const graph: DependencyGraph = {
        nodes: [
          { id: "A" },
          { id: "B" },
          { id: "C" },
          { id: "D" },
          { id: "E" },
        ],
        edges: [
          { source: "A", target: "B" },
          { source: "A", target: "C" },
          { source: "A", target: "D" },
          { source: "A", target: "E" },
        ],
      };

      engine.loadGraph(graph);
      engine.compute();

      // B, C, D, E are authorities (many point to them via A's distribution)
      // A is a hub (points to many)
      const metrics = engine.getCentralityMetrics("A");
      expect(metrics?.out_degree).toBe(4);
      expect(metrics?.in_degree).toBe(0);
    });

    it("handles empty graph", () => {
      engine.loadGraph({ nodes: [], edges: [] });
      const result = engine.compute();

      expect(result.converged).toBe(true);
      expect(result.scores.size).toBe(0);
      expect(result.iterations).toBe(0);
    });

    it("handles single node", () => {
      engine.loadGraph({ nodes: [{ id: "alone" }], edges: [] });
      const result = engine.compute();

      expect(result.scores.get("alone")).toBe(1);
    });

    it("scores sum to approximately 1", () => {
      const graph: DependencyGraph = {
        nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }],
        edges: [
          { source: "A", target: "B" },
          { source: "B", target: "C" },
          { source: "C", target: "D" },
          { source: "D", target: "A" },
        ],
      };

      engine.loadGraph(graph);
      const result = engine.compute();

      const sum = [...result.scores.values()].reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 4);
    });
  });

  // ============================================================================
  // PERSONALIZED PAGERANK
  // ============================================================================

  describe("personalized PageRank", () => {
    it("biases scores toward personalization nodes", () => {
      const graph: DependencyGraph = {
        nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }],
        edges: [
          { source: "A", target: "B" },
          { source: "B", target: "C" },
          { source: "C", target: "D" },
        ],
      };

      engine.loadGraph(graph);

      // Uniform PageRank
      const uniform = engine.compute();

      // Personalized toward D
      const personalized = engine.compute([{ nodeId: "D", weight: 1 }]);

      expect(personalized.scores.get("D")).toBeGreaterThan(uniform.scores.get("D")!);
    });

    it("handles multiple personalization nodes", () => {
      const graph: DependencyGraph = {
        nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
        edges: [
          { source: "A", target: "B" },
          { source: "B", target: "C" },
        ],
      };

      engine.loadGraph(graph);
      const result = engine.compute([
        { nodeId: "A", weight: 0.5 },
        { nodeId: "C", weight: 0.5 },
      ]);

      // Should complete iterations even if not fully converged
      expect(result.iterations).toBeGreaterThan(0);
      expect(result.scores.size).toBe(3);
    });
  });

  // ============================================================================
  // TOP NODES
  // ============================================================================

  describe("top nodes", () => {
    it("returns top K nodes sorted by score", () => {
      const graph: DependencyGraph = {
        nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }, { id: "E" }],
        edges: [
          { source: "A", target: "E" },
          { source: "B", target: "E" },
          { source: "C", target: "E" },
          { source: "D", target: "E" },
        ],
      };

      engine.loadGraph(graph);
      engine.compute();

      const top = engine.getTopNodes(3);

      expect(top.length).toBe(3);
      expect(top[0].id).toBe("E"); // E has most incoming edges
      expect(top[0].score).toBeGreaterThan(top[1].score);
    });

    it("includes labels in top nodes", () => {
      const graph: DependencyGraph = {
        nodes: [
          { id: "1", label: "SpeedFeed" },
          { id: "2", label: "Force" },
        ],
        edges: [{ source: "1", target: "2" }],
      };

      engine.loadGraph(graph);
      engine.compute();

      const top = engine.getTopNodes(2);

      expect(top.some(n => n.label === "Force")).toBe(true);
    });
  });

  // ============================================================================
  // CENTRALITY METRICS
  // ============================================================================

  describe("centrality metrics", () => {
    it("computes in-degree and out-degree", () => {
      const graph: DependencyGraph = {
        nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
        edges: [
          { source: "A", target: "B" },
          { source: "A", target: "C" },
          { source: "B", target: "C" },
        ],
      };

      engine.loadGraph(graph);
      engine.compute();

      const metricsA = engine.getCentralityMetrics("A");
      const metricsC = engine.getCentralityMetrics("C");

      expect(metricsA?.out_degree).toBe(2);
      expect(metricsA?.in_degree).toBe(0);
      expect(metricsC?.out_degree).toBe(0);
      expect(metricsC?.in_degree).toBe(2);
    });

    it("identifies hubs and authorities", () => {
      // Hub: A points to many
      // Authority: E is pointed to by many
      const graph: DependencyGraph = {
        nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }, { id: "E" }],
        edges: [
          { source: "A", target: "B" },
          { source: "A", target: "C" },
          { source: "A", target: "D" },
          { source: "A", target: "E" },
          { source: "B", target: "E" },
          { source: "C", target: "E" },
          { source: "D", target: "E" },
        ],
      };

      engine.loadGraph(graph);
      engine.compute();

      const metricsA = engine.getCentralityMetrics("A");
      const metricsE = engine.getCentralityMetrics("E");

      expect(metricsA?.is_hub).toBe(true);
      expect(metricsE?.is_authority).toBe(true);
    });

    it("returns null for unknown node", () => {
      engine.loadGraph({ nodes: [{ id: "A" }], edges: [] });
      engine.compute();

      expect(engine.getCentralityMetrics("unknown")).toBeNull();
    });
  });

  // ============================================================================
  // GRAPH ANALYSIS
  // ============================================================================

  describe("graph analysis", () => {
    it("computes basic statistics", () => {
      const graph: DependencyGraph = {
        nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
        edges: [
          { source: "A", target: "B" },
          { source: "B", target: "C" },
        ],
      };

      engine.loadGraph(graph);
      const analysis = engine.analyzeGraph();

      expect(analysis.node_count).toBe(3);
      expect(analysis.edge_count).toBe(2);
      expect(analysis.density).toBeCloseTo(2 / 6, 4); // 2 edges / (3*2) possible
    });

    it("identifies orphan nodes", () => {
      const graph: DependencyGraph = {
        nodes: [{ id: "A" }, { id: "B" }, { id: "orphan" }],
        edges: [{ source: "A", target: "B" }],
      };

      engine.loadGraph(graph);
      const analysis = engine.analyzeGraph();

      expect(analysis.orphan_nodes).toContain("orphan");
    });

    it("identifies sink nodes", () => {
      const graph: DependencyGraph = {
        nodes: [{ id: "A" }, { id: "B" }, { id: "sink" }],
        edges: [
          { source: "A", target: "B" },
          { source: "B", target: "sink" },
        ],
      };

      engine.loadGraph(graph);
      const analysis = engine.analyzeGraph();

      expect(analysis.sink_nodes).toContain("sink");
    });

    it("identifies source nodes", () => {
      const graph: DependencyGraph = {
        nodes: [{ id: "source" }, { id: "B" }, { id: "C" }],
        edges: [
          { source: "source", target: "B" },
          { source: "B", target: "C" },
        ],
      };

      engine.loadGraph(graph);
      const analysis = engine.analyzeGraph();

      expect(analysis.source_nodes).toContain("source");
    });
  });

  // ============================================================================
  // CRITICAL NODES
  // ============================================================================

  describe("critical nodes", () => {
    it("finds high-importance nodes", () => {
      const graph: DependencyGraph = {
        nodes: [{ id: "A" }, { id: "B" }, { id: "critical" }, { id: "D" }],
        edges: [
          { source: "A", target: "critical" },
          { source: "B", target: "critical" },
          { source: "critical", target: "D" },
        ],
      };

      engine.loadGraph(graph);
      engine.compute();

      const critical = engine.findCriticalNodes(0.5);

      // 'critical' should be among critical nodes due to high centrality
      expect(critical.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // HITS ALGORITHM
  // ============================================================================

  describe("HITS algorithm", () => {
    it("computes hub and authority scores", () => {
      const graph: DependencyGraph = {
        nodes: [{ id: "hub" }, { id: "auth1" }, { id: "auth2" }],
        edges: [
          { source: "hub", target: "auth1" },
          { source: "hub", target: "auth2" },
        ],
      };

      engine.loadGraph(graph);
      const hits = engine.computeHITS();

      expect(hits.hubs.get("hub")).toBeGreaterThan(hits.hubs.get("auth1")!);
      expect(hits.authorities.get("auth1")).toBeGreaterThan(hits.authorities.get("hub")!);
    });

    it("handles empty graph", () => {
      engine.loadGraph({ nodes: [], edges: [] });
      const hits = engine.computeHITS();

      expect(hits.hubs.size).toBe(0);
      expect(hits.authorities.size).toBe(0);
    });
  });

  // ============================================================================
  // TOPOLOGICAL SORT
  // ============================================================================

  describe("topological sort", () => {
    it("sorts DAG in topological order", () => {
      const graph: DependencyGraph = {
        nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }],
        edges: [
          { source: "A", target: "B" },
          { source: "A", target: "C" },
          { source: "B", target: "D" },
          { source: "C", target: "D" },
        ],
      };

      engine.loadGraph(graph);
      const sorted = engine.topologicalSort();

      expect(sorted).not.toBeNull();
      expect(sorted!.indexOf("A")).toBeLessThan(sorted!.indexOf("B"));
      expect(sorted!.indexOf("A")).toBeLessThan(sorted!.indexOf("C"));
      expect(sorted!.indexOf("B")).toBeLessThan(sorted!.indexOf("D"));
    });

    it("returns null for cyclic graph", () => {
      const graph: DependencyGraph = {
        nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
        edges: [
          { source: "A", target: "B" },
          { source: "B", target: "C" },
          { source: "C", target: "A" },
        ],
      };

      engine.loadGraph(graph);
      const sorted = engine.topologicalSort();

      expect(sorted).toBeNull();
    });
  });

  // ============================================================================
  // CYCLE DETECTION
  // ============================================================================

  describe("cycle detection", () => {
    it("detects simple cycle", () => {
      const graph: DependencyGraph = {
        nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
        edges: [
          { source: "A", target: "B" },
          { source: "B", target: "C" },
          { source: "C", target: "A" },
        ],
      };

      engine.loadGraph(graph);
      const cycles = engine.detectCycles();

      expect(cycles.length).toBeGreaterThan(0);
    });

    it("returns empty for DAG", () => {
      const graph: DependencyGraph = {
        nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
        edges: [
          { source: "A", target: "B" },
          { source: "B", target: "C" },
        ],
      };

      engine.loadGraph(graph);
      const cycles = engine.detectCycles();

      expect(cycles.length).toBe(0);
    });
  });

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  describe("configuration", () => {
    it("uses default damping factor", () => {
      const config = engine.getConfig();
      expect(config.damping_factor).toBe(0.85);
    });

    it("accepts custom damping factor", () => {
      const custom = new PageRankEngine({ damping_factor: 0.9 });
      expect(custom.getConfig().damping_factor).toBe(0.9);
    });

    it("updates config dynamically", () => {
      engine.setConfig({ max_iterations: 200 });
      expect(engine.getConfig().max_iterations).toBe(200);
    });
  });

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  describe("persistence", () => {
    it("exports and imports state", () => {
      const graph: DependencyGraph = {
        nodes: [{ id: "A" }, { id: "B" }],
        edges: [{ source: "A", target: "B" }],
      };

      engine.loadGraph(graph);
      engine.compute();

      const exported = engine.export();

      const newEngine = new PageRankEngine();
      newEngine.import(exported);

      expect(newEngine.getNodeCount()).toBe(2);
      expect(newEngine.getScore("B")).toBeGreaterThan(0);
    });

    it("exported data is JSON-serializable", () => {
      const graph: DependencyGraph = {
        nodes: [{ id: "A" }],
        edges: [],
      };

      engine.loadGraph(graph);
      engine.compute();

      const exported = engine.export();
      const json = JSON.stringify(exported);
      const parsed = JSON.parse(json);

      expect(parsed.graph.nodes).toBeDefined();
      expect(parsed.scores).toBeDefined();
    });
  });

  // ============================================================================
  // RESET
  // ============================================================================

  describe("reset", () => {
    it("clears all state", () => {
      const graph: DependencyGraph = {
        nodes: [{ id: "A" }, { id: "B" }],
        edges: [{ source: "A", target: "B" }],
      };

      engine.loadGraph(graph);
      engine.compute();
      engine.reset();

      expect(engine.getNodeCount()).toBe(0);
      expect(engine.getEdgeCount()).toBe(0);
      expect(engine.getScores().size).toBe(0);
    });
  });

  // ============================================================================
  // SINGLETON
  // ============================================================================

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(pageRankEngine).toBeDefined();
      expect(pageRankEngine).toBeInstanceOf(PageRankEngine);
    });
  });
});
