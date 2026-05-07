/**
 * Algorithm Dispatcher Tests
 * PP-AGI-S0/U-S0-06: Wire 35 algorithms to MCP actions
 */
import { describe, it, expect } from "vitest";
import { algorithmGatewayEngine } from "../engines/AlgorithmGatewayEngine.js";
import { ALGORITHM_ACTIONS, ALGORITHM_DISPATCHER_ACTION_COUNT } from "../tools/dispatchers/algorithmDispatcher.js";

describe("algorithmDispatcher", () => {
  describe("action count anti-regression", () => {
    it("should have exactly 40 actions", () => {
      expect(ALGORITHM_DISPATCHER_ACTION_COUNT).toBe(40);
      expect(ALGORITHM_ACTIONS.length).toBe(40);
    });

    it("should have actions in all 11 domains", () => {
      const domains = new Set(ALGORITHM_ACTIONS.map(a => a.split("_")[0]));
      expect(domains.size).toBeGreaterThanOrEqual(11);
    });
  });

  describe("signal processing algorithms", () => {
    it("executeFFT should detect dominant frequency", () => {
      const signal = Array.from({ length: 100 }, (_, i) => Math.sin(2 * Math.PI * 10 * i / 100));
      const result = algorithmGatewayEngine.executeFFT({
        signal,
        sample_rate_hz: 100,
        window: "hann",
      });
      expect(result).toHaveProperty("dominant_frequency_hz");
      expect(result).toHaveProperty("spectrum");
      expect(result.spectrum.length).toBeGreaterThan(0);
    });

    it("digitalFilter should return filtered signal", () => {
      const signal = [1, 2, 3, 4, 5, 4, 3, 2, 1];
      const result = algorithmGatewayEngine.digitalFilter({
        signal,
        filter_type: "lowpass",
        cutoff_hz: 50,
        order: 3,
      });
      expect(result).toHaveProperty("filtered");
      expect(result.filtered.length).toBe(signal.length);
    });
  });

  describe("control algorithms", () => {
    it("pidControl should compute output", () => {
      const result = algorithmGatewayEngine.pidControl({
        kp: 1.0,
        ki: 0.1,
        kd: 0.05,
        setpoint: 100,
        current: 90,
        dt: 0.01,
      });
      expect(result).toHaveProperty("output");
      expect(result).toHaveProperty("error");
      expect(result.error).toBe(10);
    });

    it("zieglerNicholsTune should return PID gains", () => {
      const result = algorithmGatewayEngine.zieglerNicholsTune({
        process_gain: 1.0,
        time_constant: 1.0,
        dead_time: 0.1,
        method: "classic",
      });
      expect(result).toHaveProperty("kp");
      expect(result).toHaveProperty("ki");
      expect(result).toHaveProperty("kd");
      expect(result.kp).toBeGreaterThan(0);
    });
  });

  describe("graph algorithms", () => {
    it("dijkstra should find shortest path", () => {
      const graph = {
        A: { B: 1, C: 4 },
        B: { C: 2, D: 5 },
        C: { D: 1 },
        D: {},
      };
      const result = algorithmGatewayEngine.dijkstra({ graph, start: "A", end: "D" });
      expect(result).toHaveProperty("distances");
      expect(result).toHaveProperty("path");
      expect(result.path).toEqual(["A", "B", "C", "D"]);
      expect(result.distances.D).toBe(4);
    });

    it("topologicalSort should order nodes by dependencies", () => {
      const result = algorithmGatewayEngine.topologicalSort({
        nodes: ["A", "B", "C", "D"],
        edges: [["A", "B"], ["A", "C"], ["B", "D"], ["C", "D"]],
      });
      expect(result).toHaveProperty("order");
      expect(result.has_cycle).toBe(false);
      expect(result.order.indexOf("A")).toBeLessThan(result.order.indexOf("B"));
      expect(result.order.indexOf("A")).toBeLessThan(result.order.indexOf("C"));
    });

    it("mst should compute minimum spanning tree", () => {
      const result = algorithmGatewayEngine.mst({
        edges: [
          { from: "A", to: "B", weight: 1 },
          { from: "B", to: "C", weight: 2 },
          { from: "A", to: "C", weight: 3 },
        ],
        algorithm: "kruskal",
      });
      expect(result).toHaveProperty("mst_edges");
      expect(result).toHaveProperty("total_weight");
      expect(result.total_weight).toBe(3);
    });
  });

  describe("interpolation algorithms", () => {
    it("evaluateBezier should compute point on curve", () => {
      const result = algorithmGatewayEngine.evaluateBezier({
        control_points: [[0, 0], [1, 2], [2, 0]],
        t: 0.5,
      });
      expect(result).toHaveProperty("point");
      expect(result.point.length).toBe(2);
      expect(result.point[0]).toBeCloseTo(1);
      expect(result.point[1]).toBeCloseTo(1);
    });

    it("cubicSpline should interpolate value", () => {
      const result = algorithmGatewayEngine.cubicSpline({
        points: [[0, 0], [1, 1], [2, 0]],
        x: 0.5,
        boundary: "natural",
      });
      expect(result).toHaveProperty("y");
      expect(result.y).toBeCloseTo(0.5);
    });
  });

  describe("spatial algorithms", () => {
    it("kdTreeQuery should find nearest neighbors", () => {
      const points = [[0, 0], [1, 1], [2, 2], [3, 3]];
      const result = algorithmGatewayEngine.kdTreeQuery({
        points,
        query: [1.1, 1.1],
        k: 2,
      });
      expect(result).toHaveProperty("neighbors");
      expect(result.neighbors.length).toBe(2);
      expect(result.neighbors[0].index).toBe(1);
    });
  });

  describe("optimization algorithms", () => {
    it("acoSequence should return valid sequence", () => {
      const nodes = [
        { id: "H1", x: 0, y: 0 },
        { id: "H2", x: 10, y: 0 },
        { id: "H3", x: 10, y: 10 },
      ];
      const result = algorithmGatewayEngine.acoSequence({
        nodes,
        ant_count: 10,
        iterations: 50,
        alpha: 1.0,
        beta: 2.0,
        evaporation: 0.5,
      });
      expect(result).toHaveProperty("sequence");
      expect(result.sequence.length).toBe(3);
      expect(result.total_distance).toBeGreaterThan(0);
    });
  });

  describe("gateway select", () => {
    it("should select appropriate algorithm for problem type", () => {
      const result = algorithmGatewayEngine.select({
        problem_type: "optimize",
        domain: "cutting_params",
        data: {},
      });
      expect(result).toHaveProperty("selected");
      expect(result).toHaveProperty("alternatives");
    });
  });
});
