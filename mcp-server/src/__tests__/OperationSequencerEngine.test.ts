/**
 * Tests for OperationSequencerEngine — CAMK-MS3/U02
 * ==================================================
 * Covers: sequence, buildDependencyGraph, topologicalSort, greedyTSP,
 *         needsThermalRelaxation, edge cases, timing correctness
 */

import { describe, it, expect } from 'vitest';
import {
  OperationSequencerEngine,
  operationSequencerEngine,
  type Operation,
  type SequencerInput,
  type OrderingConstraint,
} from '../../src/engines/OperationSequencerEngine.js';

// ── Helpers ───────────────────────────────────────────────────────────────

function op(id: string, type: Operation['type'], tool_id: string, time: number, extra: Partial<Operation> = {}): Operation {
  return { id, type, tool_id, tool_diameter_mm: 10, estimated_time_sec: time, ...extra };
}

describe('OperationSequencerEngine', () => {
  const engine = new OperationSequencerEngine();

  // ========================================================================
  // SINGLETON
  // ========================================================================

  describe('singleton', () => {
    it('exports a singleton instance', () => {
      expect(operationSequencerEngine).toBeInstanceOf(OperationSequencerEngine);
    });
  });

  // ========================================================================
  // sequence — empty / single input
  // ========================================================================

  describe('sequence — edge cases', () => {
    it('returns empty result for zero operations', () => {
      const result = engine.sequence({ operations: [] });
      expect(result.sequence).toHaveLength(0);
      expect(result.total_time_sec).toBe(0);
      expect(result.optimization_score).toBe(100);
    });

    it('handles single operation (no tool changes)', () => {
      const result = engine.sequence({
        operations: [op('O1', 'rough', 'T1', 60)],
      });
      expect(result.sequence).toHaveLength(1);
      expect(result.tool_change_count).toBe(0);
      expect(result.cutting_time_sec).toBeCloseTo(60, 1);
    });

    it('warns on duplicate operation IDs', () => {
      const result = engine.sequence({
        operations: [op('O1', 'rough', 'T1', 30), op('O1', 'finish', 'T2', 20)],
      });
      expect(result.warnings.some(w => w.includes('Duplicate'))).toBe(true);
    });

    it('warns on unknown prerequisite', () => {
      const result = engine.sequence({
        operations: [op('O1', 'rough', 'T1', 30, { prerequisites: ['NONEXISTENT'] })],
      });
      expect(result.warnings.some(w => w.includes('unknown prerequisite'))).toBe(true);
    });
  });

  // ========================================================================
  // sequence — dependency ordering
  // ========================================================================

  describe('sequence — dependency ordering', () => {
    it('respects explicit prerequisites', () => {
      const result = engine.sequence({
        operations: [
          op('O2', 'finish', 'T2', 20, { prerequisites: ['O1'] }),
          op('O1', 'rough', 'T1', 60),
        ],
      });
      const ids = result.sequence.map(s => s.operation_id);
      expect(ids.indexOf('O1')).toBeLessThan(ids.indexOf('O2'));
    });

    it('respects implicit rough-before-finish within same setup', () => {
      const result = engine.sequence({
        operations: [
          op('F1', 'finish', 'T2', 20, { setup_id: 'S1' }),
          op('R1', 'rough', 'T1', 60, { setup_id: 'S1' }),
        ],
      });
      const ids = result.sequence.map(s => s.operation_id);
      expect(ids.indexOf('R1')).toBeLessThan(ids.indexOf('F1'));
    });

    it('respects implicit drill-before-thread', () => {
      const result = engine.sequence({
        operations: [
          op('TH1', 'thread', 'T3', 15),
          op('D1', 'drill', 'T1', 10),
        ],
      });
      const ids = result.sequence.map(s => s.operation_id);
      expect(ids.indexOf('D1')).toBeLessThan(ids.indexOf('TH1'));
    });

    it('respects user constraints', () => {
      const constraints: OrderingConstraint[] = [
        { before: 'O2', after: 'O3', reason: 'custom ordering' },
      ];
      const result = engine.sequence({
        operations: [
          op('O1', 'drill', 'T1', 10),
          op('O3', 'chamfer', 'T3', 5),
          op('O2', 'bore', 'T2', 20),
        ],
        constraints,
      });
      const ids = result.sequence.map(s => s.operation_id);
      expect(ids.indexOf('O2')).toBeLessThan(ids.indexOf('O3'));
    });
  });

  // ========================================================================
  // sequence — timing
  // ========================================================================

  describe('sequence — timing', () => {
    it('accumulates cutting time correctly', () => {
      const result = engine.sequence({
        operations: [
          op('O1', 'rough', 'T1', 60),
          op('O2', 'finish', 'T1', 40),
        ],
      });
      expect(result.cutting_time_sec).toBeCloseTo(100, 1);
    });

    it('adds tool change time between different tools', () => {
      const result = engine.sequence({
        operations: [
          op('O1', 'drill', 'T1', 10),
          op('O2', 'drill', 'T2', 10),
        ],
        tool_change_time_sec: 15,
      });
      expect(result.tool_change_count).toBe(1);
      expect(result.tool_change_time_sec).toBeCloseTo(15, 1);
      expect(result.total_time_sec).toBeCloseTo(35, 1); // 10 + 15 + 10
    });

    it('no tool change when same tool used consecutively', () => {
      const result = engine.sequence({
        operations: [
          op('O1', 'drill', 'T1', 10),
          op('O2', 'drill', 'T1', 20),
        ],
      });
      expect(result.tool_change_count).toBe(0);
      expect(result.tool_change_time_sec).toBe(0);
    });

    it('uses default tool change time of 5s', () => {
      const result = engine.sequence({
        operations: [
          op('O1', 'drill', 'T1', 10),
          op('O2', 'drill', 'T2', 10),
        ],
      });
      expect(result.tool_change_time_sec).toBeCloseTo(5, 1);
    });

    it('cumulative time is monotonically increasing', () => {
      const result = engine.sequence({
        operations: [
          op('O1', 'drill', 'T1', 10),
          op('O2', 'rough', 'T2', 30),
          op('O3', 'finish', 'T3', 20),
        ],
      });
      for (let i = 1; i < result.sequence.length; i++) {
        expect(result.sequence[i].cumulative_time_sec)
          .toBeGreaterThan(result.sequence[i - 1].cumulative_time_sec);
      }
    });
  });

  // ========================================================================
  // topologicalSort
  // ========================================================================

  describe('topologicalSort', () => {
    it('sorts a linear chain correctly', () => {
      const sorted = engine.topologicalSort([
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
      ]);
      expect(sorted).toEqual(['A', 'B', 'C']);
    });

    it('handles diamond dependency', () => {
      const sorted = engine.topologicalSort([
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
        { from: 'B', to: 'D' },
        { from: 'C', to: 'D' },
      ]);
      expect(sorted.indexOf('A')).toBe(0);
      expect(sorted.indexOf('D')).toBe(3);
      expect(sorted.indexOf('B')).toBeLessThan(sorted.indexOf('D'));
      expect(sorted.indexOf('C')).toBeLessThan(sorted.indexOf('D'));
    });

    it('throws on cycle', () => {
      expect(() => engine.topologicalSort([
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
        { from: 'C', to: 'A' },
      ])).toThrow('Cycle detected');
    });

    it('handles single edge', () => {
      const sorted = engine.topologicalSort([{ from: 'X', to: 'Y' }]);
      expect(sorted).toEqual(['X', 'Y']);
    });

    it('handles empty graph', () => {
      const sorted = engine.topologicalSort([]);
      expect(sorted).toEqual([]);
    });
  });

  // ========================================================================
  // greedyTSP
  // ========================================================================

  describe('greedyTSP', () => {
    it('groups same-tool operations together', () => {
      const ops = [
        op('O1', 'drill', 'T1', 10),
        op('O2', 'drill', 'T2', 10),
        op('O3', 'drill', 'T1', 10),
        op('O4', 'drill', 'T2', 10),
      ];
      const order = engine.greedyTSP(ops);
      expect(order).toHaveLength(4);
      // Starting from O1 (T1), next should prefer O3 (T1) over T2
      expect(order[0]).toBe('O1');
      expect(order[1]).toBe('O3');
    });

    it('returns single operation as-is', () => {
      expect(engine.greedyTSP([op('O1', 'drill', 'T1', 10)])).toEqual(['O1']);
    });

    it('returns empty for empty input', () => {
      expect(engine.greedyTSP([])).toEqual([]);
    });

    it('prefers same-setup when tools differ', () => {
      const ops = [
        op('O1', 'drill', 'T1', 10, { setup_id: 'S1' }),
        op('O2', 'drill', 'T2', 10, { setup_id: 'S2' }),
        op('O3', 'drill', 'T2', 10, { setup_id: 'S1' }),
      ];
      const order = engine.greedyTSP(ops);
      // From O1 (T1/S1), O3 (T2/S1) costs 2, O2 (T2/S2) costs 3
      expect(order[0]).toBe('O1');
      expect(order[1]).toBe('O3');
    });
  });

  // ========================================================================
  // needsThermalRelaxation
  // ========================================================================

  describe('needsThermalRelaxation', () => {
    it('returns true for hot roughing followed by finishing', () => {
      const prev = op('R1', 'rough', 'T1', 60, { heat_generation: 'high' });
      const next = op('F1', 'finish', 'T2', 20);
      expect(engine.needsThermalRelaxation(prev, next)).toBe(true);
    });

    it('returns true for medium-heat roughing followed by semi_finish', () => {
      const prev = op('R1', 'rough', 'T1', 60, { heat_generation: 'medium' });
      const next = op('SF1', 'semi_finish', 'T2', 30);
      expect(engine.needsThermalRelaxation(prev, next)).toBe(true);
    });

    it('returns false for low-heat roughing followed by finishing', () => {
      const prev = op('R1', 'rough', 'T1', 60, { heat_generation: 'low' });
      const next = op('F1', 'finish', 'T2', 20);
      expect(engine.needsThermalRelaxation(prev, next)).toBe(false);
    });

    it('returns false for finishing followed by finishing', () => {
      const prev = op('F1', 'finish', 'T1', 20, { heat_generation: 'high' });
      const next = op('F2', 'finish', 'T2', 20);
      expect(engine.needsThermalRelaxation(prev, next)).toBe(false);
    });

    it('returns false for roughing followed by drilling', () => {
      const prev = op('R1', 'rough', 'T1', 60, { heat_generation: 'high' });
      const next = op('D1', 'drill', 'T2', 10);
      expect(engine.needsThermalRelaxation(prev, next)).toBe(false);
    });
  });

  // ========================================================================
  // buildDependencyGraph
  // ========================================================================

  describe('buildDependencyGraph', () => {
    it('creates edges for explicit prerequisites', () => {
      const ops = [
        op('O1', 'rough', 'T1', 60),
        op('O2', 'finish', 'T2', 20, { prerequisites: ['O1'] }),
      ];
      const graph = engine.buildDependencyGraph(ops);
      expect(graph.some(e => e.from === 'O1' && e.to === 'O2')).toBe(true);
    });

    it('creates implicit rough->finish edge within same setup', () => {
      const ops = [
        op('R1', 'rough', 'T1', 60, { setup_id: 'S1' }),
        op('F1', 'finish', 'T2', 20, { setup_id: 'S1' }),
      ];
      const graph = engine.buildDependencyGraph(ops);
      expect(graph.some(e => e.from === 'R1' && e.to === 'F1')).toBe(true);
    });

    it('creates implicit drill->thread edge', () => {
      const ops = [
        op('D1', 'drill', 'T1', 10),
        op('TH1', 'thread', 'T2', 15),
      ];
      const graph = engine.buildDependencyGraph(ops);
      expect(graph.some(e => e.from === 'D1' && e.to === 'TH1')).toBe(true);
    });

    it('does not duplicate edges', () => {
      const ops = [
        op('O1', 'rough', 'T1', 60),
        op('O2', 'finish', 'T2', 20, { prerequisites: ['O1'] }),
      ];
      const graph = engine.buildDependencyGraph(ops);
      const o1o2 = graph.filter(e => e.from === 'O1' && e.to === 'O2');
      // One from prerequisites + one from implicit rough->finish = deduplicated to 1
      expect(o1o2.length).toBe(1);
    });

    it('edge weight equals source operation time', () => {
      const ops = [
        op('O1', 'rough', 'T1', 42),
        op('O2', 'finish', 'T2', 20, { prerequisites: ['O1'] }),
      ];
      const graph = engine.buildDependencyGraph(ops);
      const edge = graph.find(e => e.from === 'O1' && e.to === 'O2');
      expect(edge).toBeDefined();
      expect(edge!.weight).toBe(42);
    });
  });

  // ========================================================================
  // sequence — optimization strategies
  // ========================================================================

  describe('sequence — optimize_for', () => {
    it('optimize_for=time minimizes tool changes via TSP', () => {
      const result = engine.sequence({
        operations: [
          op('D1', 'drill', 'T1', 10),
          op('D2', 'drill', 'T2', 10),
          op('D3', 'drill', 'T1', 10),
        ],
        optimize_for: 'time',
      });
      // TSP should group T1 operations together
      const ids = result.sequence.map(s => s.operation_id);
      const d1Idx = ids.indexOf('D1');
      const d3Idx = ids.indexOf('D3');
      // D1 and D3 use same tool so should be adjacent
      expect(Math.abs(d1Idx - d3Idx)).toBe(1);
    });

    it('optimize_for=quality preserves strict topological order', () => {
      const result = engine.sequence({
        operations: [
          op('R1', 'rough', 'T1', 60),
          op('SF1', 'semi_finish', 'T2', 30),
          op('F1', 'finish', 'T3', 20),
        ],
        optimize_for: 'quality',
      });
      const ids = result.sequence.map(s => s.operation_id);
      expect(ids.indexOf('R1')).toBeLessThan(ids.indexOf('SF1'));
      expect(ids.indexOf('SF1')).toBeLessThan(ids.indexOf('F1'));
    });

    it('optimize_for=tool_life orders low-heat before high-heat', () => {
      const result = engine.sequence({
        operations: [
          op('O1', 'drill', 'T1', 10, { heat_generation: 'high' }),
          op('O2', 'drill', 'T2', 10, { heat_generation: 'low' }),
          op('O3', 'drill', 'T3', 10, { heat_generation: 'medium' }),
        ],
        optimize_for: 'tool_life',
      });
      const ids = result.sequence.map(s => s.operation_id);
      expect(ids.indexOf('O2')).toBeLessThan(ids.indexOf('O3'));
      expect(ids.indexOf('O3')).toBeLessThan(ids.indexOf('O1'));
    });

    it('thermal relaxation time is added to total', () => {
      const result = engine.sequence({
        operations: [
          op('R1', 'rough', 'T1', 60, { heat_generation: 'high' }),
          op('F1', 'finish', 'T2', 20),
        ],
        thermal_relaxation_sec: 45,
      });
      expect(result.thermal_wait_time_sec).toBeCloseTo(45, 1);
      // Total should include: 60 + 45(thermal) + 5(tool change) + 20 = 130
      expect(result.total_time_sec).toBeCloseTo(130, 1);
    });

    it('handles circular dependencies gracefully with warning', () => {
      const result = engine.sequence({
        operations: [
          op('O1', 'rough', 'T1', 30, { prerequisites: ['O2'] }),
          op('O2', 'rough', 'T2', 30, { prerequisites: ['O1'] }),
        ],
      });
      expect(result.warnings.some(w => w.includes('Circular dependency'))).toBe(true);
      expect(result.sequence).toHaveLength(2);
    });

    it('optimization_score is 100 when no tool changes', () => {
      const result = engine.sequence({
        operations: [
          op('O1', 'drill', 'T1', 10),
          op('O2', 'drill', 'T1', 20),
        ],
      });
      expect(result.optimization_score).toBe(100);
    });

    it('formula string is populated', () => {
      const result = engine.sequence({
        operations: [op('O1', 'drill', 'T1', 10)],
      });
      expect(result.formula.length).toBeGreaterThan(0);
    });
  });
});
