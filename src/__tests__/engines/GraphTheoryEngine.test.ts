import { describe, it, expect } from 'vitest';
import {
  graphTheoryEngine,
  GraphTheoryEngine,
  GraphNode,
  GraphEdge,
} from '../../engines/GraphTheoryEngine.js';

describe('GraphTheoryEngine', () => {
  const engine = graphTheoryEngine;

  it('exports a singleton instance', () => {
    expect(engine).toBeInstanceOf(GraphTheoryEngine);
  });

  // ── solve() dispatch ─────────────────────────────────────────────
  describe('solve()', () => {
    it('throws on unknown algorithm', () => {
      expect(() =>
        engine.solve({
          algorithm: 'unknown' as any,
          nodes: [],
          edges: [],
        })
      ).toThrow('Unknown algorithm');
    });

    it('warns on empty node set', () => {
      const r = engine.solve({
        algorithm: 'mst',
        nodes: [],
        edges: [],
      });
      expect(r.warnings.some(w => w.includes('Empty'))).toBe(true);
    });

    it('records computation_time_ms', () => {
      const r = engine.solve({
        algorithm: 'mst',
        nodes: [{ id: 'A' }],
        edges: [],
      });
      expect(r.computation_time_ms).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Topological Sort ─────────────────────────────────────────────
  describe('topologicalSort()', () => {
    it('returns valid ordering for a DAG', () => {
      const nodes: GraphNode[] = [
        { id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' },
      ];
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', weight: 1 },
        { from: 'A', to: 'C', weight: 1 },
        { from: 'B', to: 'D', weight: 1 },
        { from: 'C', to: 'D', weight: 1 },
      ];
      const order = engine.topologicalSort(nodes, edges);
      expect(order).toHaveLength(4);
      expect(order.indexOf('A')).toBeLessThan(order.indexOf('B'));
      expect(order.indexOf('A')).toBeLessThan(order.indexOf('C'));
      expect(order.indexOf('B')).toBeLessThan(order.indexOf('D'));
    });

    it('throws on cycle', () => {
      const nodes: GraphNode[] = [{ id: 'A' }, { id: 'B' }];
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', weight: 1 },
        { from: 'B', to: 'A', weight: 1 },
      ];
      expect(() => engine.topologicalSort(nodes, edges)).toThrow('Cycle');
    });

    it('handles single node with no edges', () => {
      const order = engine.topologicalSort([{ id: 'X' }], []);
      expect(order).toEqual(['X']);
    });
  });

  // ── Critical Path ────────────────────────────────────────────────
  describe('criticalPath()', () => {
    const nodes: GraphNode[] = [
      { id: 'A', weight: 3 },
      { id: 'B', weight: 5 },
      { id: 'C', weight: 2 },
      { id: 'D', weight: 4 },
    ];
    const edges: GraphEdge[] = [
      { from: 'A', to: 'B', weight: 0 },
      { from: 'A', to: 'C', weight: 0 },
      { from: 'B', to: 'D', weight: 0 },
      { from: 'C', to: 'D', weight: 0 },
    ];

    it('critical path weight = longest path', () => {
      const r = engine.criticalPath(nodes, edges);
      // Path A(3) -> B(5) -> D(4) = 12
      expect(r.critical_path_weight).toBe(12);
    });

    it('critical path nodes have zero slack', () => {
      const r = engine.criticalPath(nodes, edges);
      for (const id of r.critical_path) {
        expect(r.slack[id]).toBe(0);
      }
    });

    it('non-critical node C has positive slack', () => {
      const r = engine.criticalPath(nodes, edges);
      expect(r.slack['C']).toBeGreaterThan(0);
    });

    it('ES <= LS for all nodes', () => {
      const r = engine.criticalPath(nodes, edges);
      for (const id of r.topological_order) {
        expect(r.earliest_start[id])
          .toBeLessThanOrEqual(r.latest_start[id]);
      }
    });
  });

  // ── Prim MST ─────────────────────────────────────────────────────
  describe('primMST()', () => {
    it('MST has n-1 edges for connected graph', () => {
      const nodes: GraphNode[] = [
        { id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' },
      ];
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', weight: 1 },
        { from: 'B', to: 'C', weight: 2 },
        { from: 'C', to: 'D', weight: 3 },
        { from: 'A', to: 'D', weight: 10 },
        { from: 'A', to: 'C', weight: 4 },
      ];
      const mst = engine.primMST(nodes, edges);
      expect(mst).toHaveLength(3);
    });

    it('MST weight <= complete graph weight', () => {
      const nodes: GraphNode[] = [
        { id: 'A' }, { id: 'B' }, { id: 'C' },
      ];
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', weight: 5 },
        { from: 'B', to: 'C', weight: 3 },
        { from: 'A', to: 'C', weight: 7 },
      ];
      const mst = engine.primMST(nodes, edges);
      const mstWeight = mst.reduce((s, e) => s + e.weight, 0);
      const totalWeight = edges.reduce((s, e) => s + e.weight, 0);
      expect(mstWeight).toBeLessThanOrEqual(totalWeight);
      // MST should pick edges 3 + 5 = 8
      expect(mstWeight).toBe(8);
    });

    it('returns empty for empty nodes', () => {
      expect(engine.primMST([], [])).toEqual([]);
    });

    it('disconnected graph MST spans reachable component', () => {
      const nodes: GraphNode[] = [
        { id: 'A' }, { id: 'B' }, { id: 'C' },
      ];
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', weight: 1 },
        // C is disconnected
      ];
      const mst = engine.primMST(nodes, edges);
      expect(mst).toHaveLength(1); // Only A-B edge
    });
  });

  // ── TSP ──────────────────────────────────────────────────────────
  describe('tspNearestNeighbor() + twoOpt()', () => {
    const nodes: GraphNode[] = [
      { id: 'A', position: { x: 0, y: 0 } },
      { id: 'B', position: { x: 1, y: 0 } },
      { id: 'C', position: { x: 1, y: 1 } },
      { id: 'D', position: { x: 0, y: 1 } },
    ];

    it('NN tour visits all nodes exactly once', () => {
      const tour = engine.tspNearestNeighbor(nodes);
      expect(tour).toHaveLength(4);
      expect(new Set(tour).size).toBe(4);
    });

    it('2-opt tour length <= NN tour length', () => {
      const nodeMap = new Map(nodes.map(n => [n.id, n]));
      const distFn = (a: string, b: string) => {
        const na = nodeMap.get(a)!;
        const nb = nodeMap.get(b)!;
        const dx = (na.position?.x ?? 0) - (nb.position?.x ?? 0);
        const dy = (na.position?.y ?? 0) - (nb.position?.y ?? 0);
        return Math.sqrt(dx * dx + dy * dy);
      };
      const tourDist = (t: string[]) => {
        let d = 0;
        for (let i = 0; i < t.length; i++) {
          d += distFn(t[i], t[(i + 1) % t.length]);
        }
        return d;
      };
      const nnTour = engine.tspNearestNeighbor(nodes);
      const optTour = engine.twoOpt(nnTour, distFn);
      expect(tourDist(optTour))
        .toBeLessThanOrEqual(tourDist(nnTour) + 0.001);
    });

    it('square tour optimal distance is 4', () => {
      const r = engine.solve({
        algorithm: 'tsp',
        nodes,
        edges: [],
      });
      // Perimeter of unit square = 4
      expect(r.tsp_result!.total_distance).toBeCloseTo(4.0, 4);
    });

    it('single node returns trivial tour', () => {
      const tour = engine.tspNearestNeighbor([
        { id: 'Z', position: { x: 5, y: 5 } },
      ]);
      expect(tour).toEqual(['Z']);
    });
  });

  // ── Edmonds-Karp Max Flow ────────────────────────────────────────
  describe('edmondsKarp()', () => {
    it('simple pipeline max flow', () => {
      const nodes: GraphNode[] = [
        { id: 'S' }, { id: 'A' }, { id: 'T' },
      ];
      const edges: GraphEdge[] = [
        { from: 'S', to: 'A', weight: 10, capacity: 10 },
        { from: 'A', to: 'T', weight: 5, capacity: 5 },
      ];
      const { maxFlow } = engine.edmondsKarp(nodes, edges, 'S', 'T');
      // Bottleneck is A->T = 5
      expect(maxFlow).toBe(5);
    });

    it('parallel paths sum capacities', () => {
      const nodes: GraphNode[] = [
        { id: 'S' }, { id: 'A' }, { id: 'B' }, { id: 'T' },
      ];
      const edges: GraphEdge[] = [
        { from: 'S', to: 'A', weight: 5, capacity: 5 },
        { from: 'S', to: 'B', weight: 3, capacity: 3 },
        { from: 'A', to: 'T', weight: 5, capacity: 5 },
        { from: 'B', to: 'T', weight: 3, capacity: 3 },
      ];
      const { maxFlow } = engine.edmondsKarp(nodes, edges, 'S', 'T');
      expect(maxFlow).toBe(8);
    });

    it('flow conservation: flow in = flow out at intermediate nodes', () => {
      const nodes: GraphNode[] = [
        { id: 'S' }, { id: 'A' }, { id: 'B' }, { id: 'T' },
      ];
      const edges: GraphEdge[] = [
        { from: 'S', to: 'A', weight: 10, capacity: 10 },
        { from: 'S', to: 'B', weight: 10, capacity: 10 },
        { from: 'A', to: 'T', weight: 7, capacity: 7 },
        { from: 'B', to: 'T', weight: 8, capacity: 8 },
        { from: 'A', to: 'B', weight: 5, capacity: 5 },
      ];
      const { maxFlow, flows } = engine.edmondsKarp(
        nodes, edges, 'S', 'T'
      );
      expect(maxFlow).toBe(15);
      // Flow into A = S->A, flow out = A->T + A->B
      const inA = flows.get('S->A') ?? 0;
      const outAT = flows.get('A->T') ?? 0;
      const outAB = flows.get('A->B') ?? 0;
      expect(inA).toBeCloseTo(outAT + outAB, 6);
    });

    it('max_flow via solve() throws without source/sink', () => {
      expect(() =>
        engine.solve({
          algorithm: 'max_flow',
          nodes: [{ id: 'A' }],
          edges: [],
        })
      ).toThrow('source and sink');
    });
  });

  // ── Graph Coloring ───────────────────────────────────────────────
  describe('greedyColoring()', () => {
    it('adjacent nodes get different colors', () => {
      const nodes: GraphNode[] = [
        { id: 'A' }, { id: 'B' }, { id: 'C' },
      ];
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', weight: 1 },
        { from: 'B', to: 'C', weight: 1 },
        { from: 'A', to: 'C', weight: 1 },
      ];
      const colors = engine.greedyColoring(nodes, edges);
      for (const e of edges) {
        expect(colors[e.from]).not.toBe(colors[e.to]);
      }
    });

    it('triangle (K3) needs 3 colors', () => {
      const nodes: GraphNode[] = [
        { id: 'A' }, { id: 'B' }, { id: 'C' },
      ];
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', weight: 1 },
        { from: 'B', to: 'C', weight: 1 },
        { from: 'A', to: 'C', weight: 1 },
      ];
      const r = engine.solve({
        algorithm: 'coloring', nodes, edges,
      });
      expect(r.coloring_result!.chromatic_number).toBe(3);
    });

    it('bipartite graph (even cycle) needs 2 colors', () => {
      const nodes: GraphNode[] = [
        { id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' },
      ];
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', weight: 1 },
        { from: 'B', to: 'C', weight: 1 },
        { from: 'C', to: 'D', weight: 1 },
        { from: 'D', to: 'A', weight: 1 },
      ];
      const r = engine.solve({
        algorithm: 'coloring', nodes, edges,
      });
      expect(r.coloring_result!.chromatic_number).toBeLessThanOrEqual(2);
    });

    it('independent set (no edges) needs 1 color', () => {
      const nodes: GraphNode[] = [
        { id: 'A' }, { id: 'B' }, { id: 'C' },
      ];
      const r = engine.solve({
        algorithm: 'coloring', nodes, edges: [],
      });
      expect(r.coloring_result!.chromatic_number).toBe(1);
    });

    it('color_groups covers all nodes', () => {
      const nodes: GraphNode[] = [
        { id: 'A' }, { id: 'B' }, { id: 'C' },
      ];
      const edges: GraphEdge[] = [
        { from: 'A', to: 'B', weight: 1 },
      ];
      const r = engine.solve({
        algorithm: 'coloring', nodes, edges,
      });
      const allNodes = Object.values(r.coloring_result!.color_groups)
        .flat();
      expect(allNodes.sort()).toEqual(['A', 'B', 'C']);
    });
  });
});
