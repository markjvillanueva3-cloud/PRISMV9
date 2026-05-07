/**
 * CircularDependencyEngine Tests — Phase 0.25 Scientific Foundations
 */

import { describe, it, expect, beforeEach } from "vitest";
import { circularDependencyEngine } from "../engines/CircularDependencyEngine.js";

describe("CircularDependencyEngine", () => {
  beforeEach(() => {
    circularDependencyEngine.reset();
  });

  describe("addNode and addEdge", () => {
    it("adds nodes to graph", () => {
      circularDependencyEngine.addNode({ id: "engine-1", type: "engine" });
      circularDependencyEngine.addNode({ id: "engine-2", type: "engine" });

      const stats = circularDependencyEngine.getStats();
      expect(stats.nodes).toBe(2);
    });

    it("adds edges between nodes", () => {
      circularDependencyEngine.addNode({ id: "a", type: "engine" });
      circularDependencyEngine.addNode({ id: "b", type: "engine" });
      circularDependencyEngine.addEdge("a", "b");

      const deps = circularDependencyEngine.getDependencies("a");
      expect(deps).toContain("b");
    });
  });

  describe("findSCCs (Tarjan's algorithm)", () => {
    it("finds no cycles in acyclic graph", () => {
      circularDependencyEngine.addNode({ id: "a", type: "engine" });
      circularDependencyEngine.addNode({ id: "b", type: "engine" });
      circularDependencyEngine.addNode({ id: "c", type: "engine" });
      circularDependencyEngine.addEdge("a", "b");
      circularDependencyEngine.addEdge("b", "c");

      const sccs = circularDependencyEngine.findSCCs();
      const cycles = sccs.filter(scc => scc.isCycle);
      expect(cycles.length).toBe(0);
    });

    it("detects simple 2-node cycle", () => {
      circularDependencyEngine.addNode({ id: "a", type: "engine" });
      circularDependencyEngine.addNode({ id: "b", type: "engine" });
      circularDependencyEngine.addEdge("a", "b");
      circularDependencyEngine.addEdge("b", "a");

      const sccs = circularDependencyEngine.findSCCs();
      const cycles = sccs.filter(scc => scc.isCycle);
      expect(cycles.length).toBe(1);
      expect(cycles[0].nodes).toContain("a");
      expect(cycles[0].nodes).toContain("b");
    });

    it("detects 3-node cycle", () => {
      circularDependencyEngine.addNode({ id: "a", type: "engine" });
      circularDependencyEngine.addNode({ id: "b", type: "engine" });
      circularDependencyEngine.addNode({ id: "c", type: "engine" });
      circularDependencyEngine.addEdge("a", "b");
      circularDependencyEngine.addEdge("b", "c");
      circularDependencyEngine.addEdge("c", "a");

      const sccs = circularDependencyEngine.findSCCs();
      const cycles = sccs.filter(scc => scc.isCycle);
      expect(cycles.length).toBe(1);
      expect(cycles[0].nodes.length).toBe(3);
    });

    it("handles multiple separate cycles", () => {
      // Cycle 1: a -> b -> a
      circularDependencyEngine.addNode({ id: "a", type: "engine" });
      circularDependencyEngine.addNode({ id: "b", type: "engine" });
      circularDependencyEngine.addEdge("a", "b");
      circularDependencyEngine.addEdge("b", "a");

      // Cycle 2: c -> d -> c
      circularDependencyEngine.addNode({ id: "c", type: "hook" });
      circularDependencyEngine.addNode({ id: "d", type: "hook" });
      circularDependencyEngine.addEdge("c", "d");
      circularDependencyEngine.addEdge("d", "c");

      const sccs = circularDependencyEngine.findSCCs();
      const cycles = sccs.filter(scc => scc.isCycle);
      expect(cycles.length).toBe(2);
    });
  });

  describe("analyze", () => {
    it("returns comprehensive analysis", () => {
      circularDependencyEngine.addNode({ id: "a", type: "engine" });
      circularDependencyEngine.addNode({ id: "b", type: "engine" });
      circularDependencyEngine.addEdge("a", "b");

      const analysis = circularDependencyEngine.analyze();
      expect(analysis.hasCycles).toBe(false);
      expect(analysis.cycles.length).toBe(0);
      expect(analysis.topologicalOrder).not.toBeNull();
      expect(analysis.stats.totalNodes).toBe(2);
      expect(analysis.stats.totalEdges).toBe(1);
    });

    it("identifies critical paths", () => {
      circularDependencyEngine.addNode({ id: "critical", type: "engine" });
      circularDependencyEngine.addNode({ id: "other", type: "engine" });
      circularDependencyEngine.addEdge("critical", "other");
      circularDependencyEngine.addEdge("other", "critical");
      circularDependencyEngine.markCritical("critical");

      const analysis = circularDependencyEngine.analyze();
      expect(analysis.criticalPaths.length).toBeGreaterThan(0);
    });
  });

  describe("topologicalSort", () => {
    it("returns valid order for DAG", () => {
      circularDependencyEngine.addNode({ id: "a", type: "engine" });
      circularDependencyEngine.addNode({ id: "b", type: "engine" });
      circularDependencyEngine.addNode({ id: "c", type: "engine" });
      circularDependencyEngine.addEdge("a", "b");
      circularDependencyEngine.addEdge("b", "c");

      const order = circularDependencyEngine.topologicalSort();
      expect(order).not.toBeNull();
      expect(order!.indexOf("a")).toBeLessThan(order!.indexOf("b"));
      expect(order!.indexOf("b")).toBeLessThan(order!.indexOf("c"));
    });

    it("returns null for cyclic graph", () => {
      circularDependencyEngine.addNode({ id: "a", type: "engine" });
      circularDependencyEngine.addNode({ id: "b", type: "engine" });
      circularDependencyEngine.addEdge("a", "b");
      circularDependencyEngine.addEdge("b", "a");

      const order = circularDependencyEngine.topologicalSort();
      expect(order).toBeNull();
    });
  });

  describe("findPaths", () => {
    it("finds path between nodes", () => {
      circularDependencyEngine.addNode({ id: "a", type: "engine" });
      circularDependencyEngine.addNode({ id: "b", type: "engine" });
      circularDependencyEngine.addNode({ id: "c", type: "engine" });
      circularDependencyEngine.addEdge("a", "b");
      circularDependencyEngine.addEdge("b", "c");

      const paths = circularDependencyEngine.findPaths("a", "c");
      expect(paths.length).toBeGreaterThan(0);
      expect(paths[0]).toEqual(["a", "b", "c"]);
    });

    it("finds cycle paths", () => {
      circularDependencyEngine.addNode({ id: "a", type: "engine" });
      circularDependencyEngine.addNode({ id: "b", type: "engine" });
      circularDependencyEngine.addEdge("a", "b");
      circularDependencyEngine.addEdge("b", "a");

      const paths = circularDependencyEngine.findPaths("a", "a");
      expect(paths.length).toBeGreaterThan(0);
    });
  });

  describe("getDependencies and getDependents", () => {
    it("returns direct dependencies", () => {
      circularDependencyEngine.addNode({ id: "a", type: "engine" });
      circularDependencyEngine.addNode({ id: "b", type: "engine" });
      circularDependencyEngine.addNode({ id: "c", type: "engine" });
      circularDependencyEngine.addEdge("a", "b");
      circularDependencyEngine.addEdge("a", "c");

      const deps = circularDependencyEngine.getDependencies("a");
      expect(deps).toContain("b");
      expect(deps).toContain("c");
    });

    it("returns dependents (reverse)", () => {
      circularDependencyEngine.addNode({ id: "a", type: "engine" });
      circularDependencyEngine.addNode({ id: "b", type: "engine" });
      circularDependencyEngine.addEdge("a", "b");

      const dependents = circularDependencyEngine.getDependents("b");
      expect(dependents).toContain("a");
    });
  });

  describe("getImpactRadius", () => {
    it("computes transitive impact", () => {
      circularDependencyEngine.addNode({ id: "a", type: "engine" });
      circularDependencyEngine.addNode({ id: "b", type: "engine" });
      circularDependencyEngine.addNode({ id: "c", type: "engine" });
      circularDependencyEngine.addNode({ id: "d", type: "engine" });
      circularDependencyEngine.addEdge("a", "b");
      circularDependencyEngine.addEdge("b", "c");
      circularDependencyEngine.addEdge("c", "d");

      const impact = circularDependencyEngine.getImpactRadius("d");
      expect(impact.impacted).toContain("c");
      expect(impact.impacted).toContain("b");
      expect(impact.impacted).toContain("a");
      expect(impact.depth).toBe(3);
    });
  });

  describe("toDot", () => {
    it("generates valid DOT format", () => {
      circularDependencyEngine.addNode({ id: "a", type: "engine" });
      circularDependencyEngine.addNode({ id: "b", type: "hook" });
      circularDependencyEngine.addEdge("a", "b");

      const dot = circularDependencyEngine.toDot();
      expect(dot).toContain("digraph Dependencies");
      expect(dot).toContain('"a"');
      expect(dot).toContain('"b"');
      expect(dot).toContain('"a" -> "b"');
    });
  });
});
