/**
 * Batch 14 Engines — Unit Tests
 * MultiObjectiveEngine + GraphAlgorithmsEngine
 * @milestone AUDIT-FT-B14
 */
import { describe, it, expect } from "vitest";
import { multiObjectiveEngine } from "../engines/MultiObjectiveEngine.js";
import { graphAlgorithmsEngine } from "../engines/GraphAlgorithmsEngine.js";

// ============================================================================
// MultiObjectiveEngine
// ============================================================================

describe("MultiObjectiveEngine", () => {
  describe("dominates", () => {
    it("a dominates b when strictly better in at least one objective", () => {
      expect(multiObjectiveEngine.dominates([1, 2], [3, 4])).toBe(true);
      expect(multiObjectiveEngine.dominates([1, 2], [1, 3])).toBe(true);
    });

    it("does not dominate when worse in any objective", () => {
      expect(multiObjectiveEngine.dominates([1, 5], [3, 2])).toBe(false);
    });

    it("does not dominate when equal", () => {
      expect(multiObjectiveEngine.dominates([1, 2], [1, 2])).toBe(false);
    });
  });

  describe("nonDominatedSort", () => {
    it("sorts into fronts correctly", () => {
      const pop = [
        { x: [0], objectives: [1, 4] },
        { x: [0], objectives: [2, 3] },
        { x: [0], objectives: [3, 2] },
        { x: [0], objectives: [4, 4] }, // dominated by all above
      ];
      const fronts = multiObjectiveEngine.nonDominatedSort(pop);
      expect(fronts.length).toBeGreaterThanOrEqual(2);
      expect(fronts[0].length).toBe(3); // first 3 are non-dominated
    });
  });

  describe("crowdingDistance", () => {
    it("boundary points get infinite distance", () => {
      const pop = [
        { x: [0], objectives: [1, 5] },
        { x: [0], objectives: [3, 3] },
        { x: [0], objectives: [5, 1] },
      ];
      multiObjectiveEngine.calculateCrowdingDistance(pop, [0, 1, 2]);
      expect(pop[0].crowdingDistance).toBe(Infinity);
      expect(pop[2].crowdingDistance).toBe(Infinity);
    });

    it("interior points get finite distance", () => {
      const pop = [
        { x: [0], objectives: [1, 5] },
        { x: [0], objectives: [3, 3] },
        { x: [0], objectives: [5, 1] },
      ];
      multiObjectiveEngine.calculateCrowdingDistance(pop, [0, 1, 2]);
      expect(pop[1].crowdingDistance).toBeGreaterThan(0);
      expect(pop[1].crowdingDistance).toBeLessThan(Infinity);
    });
  });

  describe("nsgaII", () => {
    it("optimizes simple bi-objective problem", () => {
      const result = multiObjectiveEngine.nsgaII({
        objectives: [
          (x) => x[0] * x[0],           // minimize x²
          (x) => (x[0] - 2) * (x[0] - 2), // minimize (x-2)²
        ],
        bounds: [[-1, 4]],
        populationSize: 20,
        maxGenerations: 10,
      });
      expect(result.paretoFront.length).toBeGreaterThan(0);
      expect(result.method).toBe("NSGA-II");
      expect(result.history.length).toBe(10);
    });

    it("pareto front solutions have valid objectives", () => {
      const result = multiObjectiveEngine.nsgaII({
        objectives: [(x) => x[0], (x) => 1 - x[0]],
        bounds: [[0, 1]],
        populationSize: 20,
        maxGenerations: 5,
      });
      for (const sol of result.paretoFront) {
        expect(sol.objectives.length).toBe(2);
        expect(sol.x.length).toBe(1);
      }
    });
  });
});

// ============================================================================
// GraphAlgorithmsEngine
// ============================================================================

describe("GraphAlgorithmsEngine", () => {
  const nodes = ["A", "B", "C", "D"];
  const edges = [
    { from: "A", to: "B", weight: 1 },
    { from: "B", to: "C", weight: 2 },
    { from: "A", to: "C", weight: 4 },
    { from: "C", to: "D", weight: 1 },
    { from: "B", to: "D", weight: 5 },
  ];

  describe("kruskalMST", () => {
    it("finds minimum spanning tree", () => {
      const r = graphAlgorithmsEngine.kruskalMST(nodes, edges);
      expect(r.isConnected).toBe(true);
      expect(r.edges.length).toBe(3); // n-1 edges
      expect(r.totalWeight).toBe(4); // A-B(1) + B-C(2) + C-D(1) = 4
    });

    it("disconnected graph is not connected", () => {
      const r = graphAlgorithmsEngine.kruskalMST(["A", "B", "C"], [
        { from: "A", to: "B", weight: 1 },
      ]);
      expect(r.isConnected).toBe(false);
    });
  });

  describe("primMST", () => {
    it("finds same MST weight as Kruskal", () => {
      const adj: Record<string, Array<{ neighbor: string; weight: number }>> = {
        A: [{ neighbor: "B", weight: 1 }, { neighbor: "C", weight: 4 }],
        B: [{ neighbor: "A", weight: 1 }, { neighbor: "C", weight: 2 }, { neighbor: "D", weight: 5 }],
        C: [{ neighbor: "A", weight: 4 }, { neighbor: "B", weight: 2 }, { neighbor: "D", weight: 1 }],
        D: [{ neighbor: "C", weight: 1 }, { neighbor: "B", weight: 5 }],
      };
      const r = graphAlgorithmsEngine.primMST(nodes, adj);
      expect(r.totalWeight).toBe(4);
      expect(r.isConnected).toBe(true);
    });
  });

  describe("bellmanFord", () => {
    it("finds shortest paths from source", () => {
      const r = graphAlgorithmsEngine.bellmanFord(nodes, edges, "A");
      expect(r.success).toBe(true);
      expect(r.distances!["A"]).toBe(0);
      expect(r.distances!["B"]).toBe(1);
      expect(r.distances!["C"]).toBe(3); // A->B->C = 1+2
      expect(r.distances!["D"]).toBe(4); // A->B->C->D = 1+2+1
    });

    it("detects negative cycles", () => {
      const r = graphAlgorithmsEngine.bellmanFord(
        ["A", "B", "C"],
        [
          { from: "A", to: "B", weight: 1 },
          { from: "B", to: "C", weight: -3 },
          { from: "C", to: "A", weight: 1 },
        ],
        "A",
      );
      expect(r.success).toBe(false);
      expect(r.reason).toContain("Negative cycle");
    });
  });

  describe("floydWarshall", () => {
    it("computes all-pairs shortest paths", () => {
      const r = graphAlgorithmsEngine.floydWarshall(nodes, edges);
      expect(r.success).toBe(true);
      expect(r.getDistance!("A", "D")).toBe(4);
      expect(r.getDistance!("A", "B")).toBe(1);
    });

    it("reconstructs path", () => {
      const r = graphAlgorithmsEngine.floydWarshall(nodes, edges);
      const path = r.getPath!("A", "D");
      expect(path).not.toBeNull();
      expect(path![0]).toBe("A");
      expect(path![path!.length - 1]).toBe("D");
    });
  });

  describe("topologicalSort", () => {
    it("sorts DAG correctly", () => {
      const r = graphAlgorithmsEngine.topologicalSort(
        ["A", "B", "C", "D"],
        [{ from: "A", to: "B" }, { from: "A", to: "C" }, { from: "B", to: "D" }, { from: "C", to: "D" }],
      );
      expect(r.success).toBe(true);
      const idx = (n: string) => r.order!.indexOf(n);
      expect(idx("A")).toBeLessThan(idx("B"));
      expect(idx("A")).toBeLessThan(idx("C"));
      expect(idx("B")).toBeLessThan(idx("D"));
    });

    it("detects cycles", () => {
      const r = graphAlgorithmsEngine.topologicalSort(
        ["A", "B", "C"],
        [{ from: "A", to: "B" }, { from: "B", to: "C" }, { from: "C", to: "A" }],
      );
      expect(r.success).toBe(false);
    });
  });

  describe("stronglyConnectedComponents", () => {
    it("finds SCCs in cyclic graph", () => {
      const r = graphAlgorithmsEngine.stronglyConnectedComponents(
        ["A", "B", "C", "D"],
        [
          { from: "A", to: "B" }, { from: "B", to: "C" },
          { from: "C", to: "A" }, // cycle A-B-C
          { from: "C", to: "D" },
        ],
      );
      expect(r.numComponents).toBe(2); // {A,B,C} and {D}
      expect(r.isStronglyConnected).toBe(false);
    });

    it("single SCC for fully connected graph", () => {
      const r = graphAlgorithmsEngine.stronglyConnectedComponents(
        ["A", "B"],
        [{ from: "A", to: "B" }, { from: "B", to: "A" }],
      );
      expect(r.isStronglyConnected).toBe(true);
    });
  });

  describe("criticalPathMethod", () => {
    it("finds critical path and project duration", () => {
      const r = graphAlgorithmsEngine.criticalPathMethod([
        { id: "A", duration: 3 },
        { id: "B", duration: 4, predecessors: ["A"] },
        { id: "C", duration: 2, predecessors: ["A"] },
        { id: "D", duration: 1, predecessors: ["B", "C"] },
      ]);
      expect(r.success).toBe(true);
      expect(r.projectDuration).toBe(8); // A(3)->B(4)->D(1) = 8
      expect(r.criticalPath).toContain("A");
      expect(r.criticalPath).toContain("B");
      expect(r.criticalPath).toContain("D");
    });

    it("non-critical activities have positive slack", () => {
      const r = graphAlgorithmsEngine.criticalPathMethod([
        { id: "A", duration: 3 },
        { id: "B", duration: 4, predecessors: ["A"] },
        { id: "C", duration: 2, predecessors: ["A"] },
        { id: "D", duration: 1, predecessors: ["B", "C"] },
      ]);
      const cSched = r.schedule!.find(s => s.id === "C");
      expect(cSched!.slack).toBeGreaterThan(0);
      expect(cSched!.isCritical).toBe(false);
    });
  });
});
