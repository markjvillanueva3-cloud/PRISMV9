/**
 * CADTraceAssemblyEngine.test.ts — U-AI-10 (CAD-COMPLETE-MS0)
 *
 * Covers: input validation, single-trace + multi-trace assembly, parent-child
 * forest build, deterministic child ordering, critical path (heaviest cumulative
 * root->leaf chain + tie-break), slowest span, wall-clock total duration,
 * status rollup (including the P1 regression where >=1 ok + rest unset must
 * roll up to 'ok'), orphan re-parenting, cycle detection (2-node, self-loop,
 * pure-cycle no-root), duplicate spanId, negative/in-progress duration,
 * determinism under input shuffling, fromOtelSpans adapter, assembleTrace
 * single-trace lookup, and the singleton export.
 */

import { describe, it, expect } from 'vitest';
import {
  CADTraceAssemblyEngine,
  cadTraceAssemblyEngine,
  type TraceSpanInput,
  type TraceSpanNode,
} from '../engines/CADTraceAssemblyEngine.js';
import type { Span } from '../engines/OpenTelemetryTracingEngine.js';

const fresh = (): CADTraceAssemblyEngine => new CADTraceAssemblyEngine();

const mkSpan = (over: Partial<TraceSpanInput>): TraceSpanInput => ({
  traceId: 't1',
  spanId: 's1',
  name: 'op',
  startTime: 1000,
  ...over,
});

describe('CADTraceAssemblyEngine', () => {
  describe('input validation', () => {
    it('returns empty result for empty input', () => {
      const r = fresh().assemble([]);
      expect(r).toEqual({
        traces: [],
        traceCount: 0,
        totalSpans: 0,
        validSpans: 0,
        skippedSpans: 0,
      });
    });

    it('returns empty result for non-array input', () => {
      const r = fresh().assemble(null as unknown as TraceSpanInput[]);
      expect(r.traceCount).toBe(0);
      expect(r.totalSpans).toBe(0);
      expect(r.traces).toEqual([]);
    });

    it('skips spans with missing traceId / spanId / non-finite startTime', () => {
      const r = fresh().assemble([
        { traceId: '', spanId: 's1', name: 'a', startTime: 1 },
        { traceId: 't1', spanId: '', name: 'b', startTime: 2 },
        { traceId: 't1', spanId: 's2', name: 'c', startTime: NaN },
        { traceId: 't1', spanId: 's3', name: 'd', startTime: Infinity },
        mkSpan({ traceId: 't1', spanId: 'good', startTime: 10, endTime: 20 }),
      ]);
      expect(r.skippedSpans).toBe(4);
      expect(r.validSpans).toBe(1);
      expect(r.traces[0].spanCount).toBe(1);
      expect(r.traces[0].rootSpanIds).toEqual(['good']);
    });

    it('default-fills missing name to "(unnamed span)"', () => {
      const r = fresh().assemble([
        { traceId: 't1', spanId: 's1', name: '', startTime: 1 } as TraceSpanInput,
      ]);
      expect(r.traces[0].tree[0].name).toBe('(unnamed span)');
    });

    it('normalizes an invalid status string to "unset"', () => {
      const r = fresh().assemble([
        { traceId: 't1', spanId: 's1', name: 'op', startTime: 1, endTime: 2, status: 'bogus' as never },
      ]);
      expect(r.traces[0].tree[0].status).toBe('unset');
    });
  });

  describe('single-trace assembly', () => {
    it('assembles a single root span with completed duration', () => {
      const r = fresh().assemble([
        mkSpan({ startTime: 100, endTime: 250, status: 'ok' }),
      ]);
      expect(r.traceCount).toBe(1);
      const v = r.traces[0];
      expect(v.spanCount).toBe(1);
      expect(v.rootSpanIds).toEqual(['s1']);
      expect(v.tree[0].durationMs).toBe(150);
      expect(v.tree[0].depth).toBe(0);
      expect(v.totalDurationMs).toBe(150);
      expect(v.slowestSpan).toEqual({ spanId: 's1', name: 'op', durationMs: 150 });
      expect(v.status).toBe('ok');
    });

    it('builds a parent-child tree (root -> child -> grandchild) with correct depths', () => {
      const r = fresh().assemble([
        mkSpan({ spanId: 'root', startTime: 0, endTime: 100, status: 'ok' }),
        mkSpan({ spanId: 'child', parentSpanId: 'root', startTime: 10, endTime: 80, status: 'ok' }),
        mkSpan({ spanId: 'grand', parentSpanId: 'child', startTime: 20, endTime: 50, status: 'ok' }),
      ]);
      const v = r.traces[0];
      expect(v.rootSpanIds).toEqual(['root']);
      expect(v.tree[0].children.map((c) => c.spanId)).toEqual(['child']);
      expect(v.tree[0].children[0].children.map((c) => c.spanId)).toEqual(['grand']);
      expect(v.tree[0].depth).toBe(0);
      expect(v.tree[0].children[0].depth).toBe(1);
      expect(v.tree[0].children[0].children[0].depth).toBe(2);
    });

    it('orders children deterministically by startTime then spanId', () => {
      const r = fresh().assemble([
        mkSpan({ spanId: 'root', startTime: 0, endTime: 100 }),
        mkSpan({ spanId: 'late', parentSpanId: 'root', startTime: 60, endTime: 90 }),
        mkSpan({ spanId: 'early', parentSpanId: 'root', startTime: 10, endTime: 50 }),
        mkSpan({ spanId: 'mid_b', parentSpanId: 'root', startTime: 30, endTime: 40 }),
        mkSpan({ spanId: 'mid_a', parentSpanId: 'root', startTime: 30, endTime: 35 }),
      ]);
      expect(r.traces[0].tree[0].children.map((c) => c.spanId)).toEqual([
        'early',
        'mid_a',
        'mid_b',
        'late',
      ]);
    });
  });

  describe('multi-trace grouping', () => {
    it('groups spans across multiple traces and sorts traces by traceId', () => {
      const r = fresh().assemble([
        mkSpan({ traceId: 'beta', spanId: 'b1', endTime: 5 }),
        mkSpan({ traceId: 'alpha', spanId: 'a1', endTime: 10 }),
        mkSpan({ traceId: 'alpha', spanId: 'a2', parentSpanId: 'a1', startTime: 1005, endTime: 1010 }),
      ]);
      expect(r.traceCount).toBe(2);
      expect(r.traces.map((t) => t.traceId)).toEqual(['alpha', 'beta']);
      expect(r.traces[0].spanCount).toBe(2);
      expect(r.traces[1].spanCount).toBe(1);
    });
  });

  describe('critical path', () => {
    it('picks the heaviest cumulative root->leaf chain', () => {
      // root(10) -> A(5) -> leaf(3)  [sum 18]
      // root(10) -> B(20)            [sum 30]  <-- critical
      const r = fresh().assemble([
        mkSpan({ spanId: 'root', startTime: 0, endTime: 10 }),
        mkSpan({ spanId: 'A', parentSpanId: 'root', startTime: 10, endTime: 15 }),
        mkSpan({ spanId: 'leaf', parentSpanId: 'A', startTime: 15, endTime: 18 }),
        mkSpan({ spanId: 'B', parentSpanId: 'root', startTime: 10, endTime: 30 }),
      ]);
      const v = r.traces[0];
      expect(v.criticalPath.map((s) => s.spanId)).toEqual(['root', 'B']);
      expect(v.criticalPathDurationMs).toBe(30);
    });

    it('returns a single-node critical path for an all-zero-duration trace', () => {
      const r = fresh().assemble([
        mkSpan({ spanId: 'root', startTime: 0 }), // in-progress
        mkSpan({ spanId: 'c1', parentSpanId: 'root', startTime: 1 }),
      ]);
      const v = r.traces[0];
      // Pin tree shape so an orphan-rebuild regression cannot mask the path test.
      expect(v.rootSpanIds).toEqual(['root']);
      expect(v.orphanCount).toBe(0);
      expect(v.tree[0].children.map((c) => c.spanId)).toEqual(['c1']);
      expect(v.criticalPath.length).toBe(1);
      expect(v.criticalPath[0].spanId).toBe('root');
      expect(v.criticalPathDurationMs).toBe(0);
    });

    it('tie-break on equal cumulative duration picks earliest-start then lex spanId', () => {
      const r = fresh().assemble([
        mkSpan({ spanId: 'root', startTime: 0, endTime: 5 }),
        mkSpan({ spanId: 'zeta', parentSpanId: 'root', startTime: 5, endTime: 15 }),
        mkSpan({ spanId: 'alpha', parentSpanId: 'root', startTime: 5, endTime: 15 }),
      ]);
      // alpha + zeta tie on (startTime, duration). lex spanId: alpha < zeta.
      const v = r.traces[0];
      expect(v.criticalPath.map((s) => s.spanId)).toEqual(['root', 'alpha']);
      expect(v.criticalPath.map((s) => s.durationMs)).toEqual([5, 10]);
      expect(v.criticalPathDurationMs).toBe(15);
    });
  });

  describe('slowest span', () => {
    it('reports the span with the largest single durationMs', () => {
      const r = fresh().assemble([
        mkSpan({ spanId: 'a', startTime: 0, endTime: 10 }),
        mkSpan({ spanId: 'b', parentSpanId: 'a', startTime: 10, endTime: 100 }),
        mkSpan({ spanId: 'c', parentSpanId: 'a', startTime: 10, endTime: 50 }),
      ]);
      expect(r.traces[0].slowestSpan).toEqual({ spanId: 'b', name: 'op', durationMs: 90 });
    });
  });

  describe('totalDurationMs (wall clock)', () => {
    it('computes max(endTime|startTime) - min(startTime)', () => {
      const r = fresh().assemble([
        mkSpan({ spanId: 'a', startTime: 100, endTime: 200 }),
        mkSpan({ spanId: 'b', startTime: 150, endTime: 350 }),
        mkSpan({ spanId: 'c', startTime: 250, endTime: 300 }),
      ]);
      expect(r.traces[0].totalDurationMs).toBe(250); // 350 - 100
    });

    it('treats in-progress spans (no endTime) as ending at their startTime', () => {
      const r = fresh().assemble([
        mkSpan({ spanId: 'a', startTime: 100 }), // in-progress
        mkSpan({ spanId: 'b', startTime: 500 }), // in-progress
      ]);
      expect(r.traces[0].totalDurationMs).toBe(400);
    });
  });

  describe('status rollup', () => {
    it('rolls up "ok" when every span is explicitly ok', () => {
      const r = fresh().assemble([
        mkSpan({ spanId: 'a', endTime: 10, status: 'ok' }),
        mkSpan({ spanId: 'b', endTime: 20, status: 'ok' }),
      ]);
      expect(r.traces[0].status).toBe('ok');
    });

    it('rolls up "error" when any span errored', () => {
      const r = fresh().assemble([
        mkSpan({ spanId: 'a', endTime: 10, status: 'ok' }),
        mkSpan({ spanId: 'b', endTime: 20, status: 'error', statusMessage: 'boom' }),
        mkSpan({ spanId: 'c', endTime: 30, status: 'ok' }),
      ]);
      const v = r.traces[0];
      expect(v.status).toBe('error');
      expect(v.errorCount).toBe(1);
      expect(v.errorSpans).toEqual([{ spanId: 'b', name: 'op', message: 'boom' }]);
    });

    it('rolls up "partial" when any span is in-progress and none errored', () => {
      const r = fresh().assemble([
        mkSpan({ spanId: 'a', endTime: 10, status: 'ok' }),
        mkSpan({ spanId: 'b', startTime: 50 }), // in-progress
      ]);
      expect(r.traces[0].status).toBe('partial');
      expect(r.traces[0].inProgressCount).toBe(1);
    });

    it('P1 regression: >=1 ok + rest unset rolls up "ok", not "unset"', () => {
      // The pre-fix bug: okCount === spanCount required EVERY span be 'ok'.
      // A 3-ok + 1-unset trace was mislabeled 'unset'. Fixed to okCount > 0.
      // Pin error/inProgress counts so the assertion cannot be satisfied by an
      // "always-ok" fallthrough bug — the rollup must have evaluated the
      // okCount>0 branch specifically.
      const r = fresh().assemble([
        mkSpan({ spanId: 'a', endTime: 10, status: 'ok' }),
        mkSpan({ spanId: 'b', endTime: 20, status: 'ok' }),
        mkSpan({ spanId: 'c', endTime: 30, status: 'ok' }),
        mkSpan({ spanId: 'd', endTime: 40, status: 'unset' }),
      ]);
      const v = r.traces[0];
      expect(v.status).toBe('ok');
      expect(v.errorCount).toBe(0);
      expect(v.inProgressCount).toBe(0);
      expect(v.spanCount).toBe(4);
    });

    it('rolls up "unset" when every span is unset (no health signal)', () => {
      const r = fresh().assemble([
        mkSpan({ spanId: 'a', endTime: 10 }), // default status undefined -> 'unset'
        mkSpan({ spanId: 'b', endTime: 20 }),
      ]);
      expect(r.traces[0].status).toBe('unset');
    });

    it('error precedence beats in-progress', () => {
      const r = fresh().assemble([
        mkSpan({ spanId: 'a', endTime: 10, status: 'error' }),
        mkSpan({ spanId: 'b', startTime: 50 }), // in-progress
      ]);
      expect(r.traces[0].status).toBe('error');
    });
  });

  describe('orphan spans', () => {
    it('re-parents an orphan (missing parent) as a root and counts it', () => {
      const r = fresh().assemble([
        mkSpan({ spanId: 'real_root', startTime: 0, endTime: 10 }),
        mkSpan({ spanId: 'orphan', parentSpanId: 'ghost', startTime: 20, endTime: 30 }),
      ]);
      const v = r.traces[0];
      expect(v.orphanCount).toBe(1);
      expect(v.rootSpanIds).toContain('orphan');
      expect(v.warnings.some((w) => w.includes('orphan span'))).toBe(true);
    });
  });

  describe('cycle detection', () => {
    const walkPlaced = (roots: TraceSpanNode[]): Set<string> => {
      const placed = new Set<string>();
      const stack: TraceSpanNode[] = [...roots];
      while (stack.length > 0) {
        const n = stack.pop()!;
        expect(placed.has(n.spanId)).toBe(false);
        placed.add(n.spanId);
        for (const c of n.children) stack.push(c);
      }
      return placed;
    };

    it('detects a 2-node cycle (A->B->A) and breaks it (every span placed exactly once)', () => {
      const r = fresh().assemble([
        { traceId: 't1', spanId: 'A', parentSpanId: 'B', name: 'a', startTime: 0, endTime: 10 },
        { traceId: 't1', spanId: 'B', parentSpanId: 'A', name: 'b', startTime: 5, endTime: 15 },
      ]);
      const v = r.traces[0];
      expect(v.spanCount).toBe(2);
      expect(v.cycleCount).toBeGreaterThanOrEqual(1);
      expect(v.warnings.some((w) => w.includes('cycle detected'))).toBe(true);
      expect(walkPlaced(v.tree)).toEqual(new Set(['A', 'B']));
    });

    it('detects a self-loop (A->A)', () => {
      const r = fresh().assemble([
        { traceId: 't1', spanId: 'A', parentSpanId: 'A', name: 'a', startTime: 0, endTime: 10 },
      ]);
      const v = r.traces[0];
      expect(v.cycleCount).toBeGreaterThanOrEqual(1);
      expect(v.rootSpanIds).toEqual(['A']);
      expect(v.tree[0].children).toEqual([]);
    });

    it('handles a pure 3-cycle (A->B->C->A) with no root span', () => {
      const r = fresh().assemble([
        { traceId: 't1', spanId: 'A', parentSpanId: 'B', name: 'a', startTime: 0, endTime: 5 },
        { traceId: 't1', spanId: 'B', parentSpanId: 'C', name: 'b', startTime: 1, endTime: 6 },
        { traceId: 't1', spanId: 'C', parentSpanId: 'A', name: 'c', startTime: 2, endTime: 7 },
      ]);
      const v = r.traces[0];
      expect(v.spanCount).toBe(3);
      expect(walkPlaced(v.tree)).toEqual(new Set(['A', 'B', 'C']));
      expect(v.warnings.some((w) => w.includes('no root span'))).toBe(true);
    });

    it('cycleCount is 0 when no cycles are present', () => {
      const r = fresh().assemble([
        mkSpan({ spanId: 'a', endTime: 10 }),
        mkSpan({ spanId: 'b', parentSpanId: 'a', startTime: 5, endTime: 8 }),
      ]);
      expect(r.traces[0].cycleCount).toBe(0);
    });
  });

  describe('duplicate spanIds', () => {
    it('drops duplicates (keep earliest by startTime then lex spanId)', () => {
      const r = fresh().assemble([
        mkSpan({ spanId: 'dup', startTime: 200, endTime: 300 }),
        mkSpan({ spanId: 'dup', startTime: 100, endTime: 150 }), // earliest wins
        mkSpan({ spanId: 'dup', startTime: 400, endTime: 500 }),
      ]);
      const v = r.traces[0];
      expect(v.spanCount).toBe(1);
      expect(v.tree[0].startTime).toBe(100);
      expect(v.tree[0].endTime).toBe(150);
      expect(v.warnings.some((w) => w.includes('2 duplicate spanId'))).toBe(true);
    });
  });

  describe('negative & in-progress durations', () => {
    it('clamps negative duration (endTime < startTime) to 0 and warns', () => {
      const r = fresh().assemble([
        mkSpan({ spanId: 'bad', startTime: 100, endTime: 50, status: 'ok' }),
      ]);
      const v = r.traces[0];
      expect(v.tree[0].durationMs).toBe(0);
      expect(v.warnings.some((w) => w.includes('endTime before startTime'))).toBe(true);
    });

    it('treats spans without endTime as in-progress with duration 0', () => {
      const r = fresh().assemble([mkSpan({ spanId: 'a', startTime: 100 })]);
      const v = r.traces[0];
      expect(v.tree[0].inProgress).toBe(true);
      expect(v.tree[0].durationMs).toBe(0);
      expect(v.inProgressCount).toBe(1);
    });
  });

  describe('determinism', () => {
    it('every input permutation produces the same assembled view (incl. child order)', () => {
      const spans: TraceSpanInput[] = [
        mkSpan({ spanId: 'root', startTime: 0, endTime: 100, status: 'ok' }),
        mkSpan({ spanId: 'A', parentSpanId: 'root', startTime: 10, endTime: 20, status: 'ok' }),
        mkSpan({ spanId: 'B', parentSpanId: 'root', startTime: 30, endTime: 80, status: 'ok' }),
        mkSpan({ spanId: 'A1', parentSpanId: 'A', startTime: 12, endTime: 18, status: 'ok' }),
      ];
      const perms: TraceSpanInput[][] = [
        spans,
        [...spans].reverse(),
        [spans[2], spans[0], spans[3], spans[1]],
        [spans[3], spans[2], spans[1], spans[0]],
      ];
      const views = perms.map((p) => fresh().assemble(p).traces[0]);
      const ref = views[0];
      for (let i = 1; i < views.length; i++) {
        const v = views[i];
        expect(v.rootSpanIds).toEqual(ref.rootSpanIds);
        expect(v.criticalPath).toEqual(ref.criticalPath);
        expect(v.slowestSpan).toEqual(ref.slowestSpan);
        expect(v.totalDurationMs).toBe(ref.totalDurationMs);
        expect(v.status).toBe(ref.status);
        // Child ordering must be permutation-invariant too.
        expect(v.tree[0].children.map((c) => c.spanId)).toEqual(
          ref.tree[0].children.map((c) => c.spanId),
        );
      }
    });
  });

  describe('fromOtelSpans adapter', () => {
    it('maps OTel Span fields to TraceSpanInput', () => {
      const otel: Span[] = [
        {
          name: 'cad.create',
          context: { traceId: 'abc', spanId: 'def', traceFlags: 1, isRemote: false },
          parentSpanId: 'parent1',
          kind: 'internal',
          startTime: 1000,
          endTime: 1100,
          attributes: {},
          events: [],
          links: [],
          status: 'ok',
          statusMessage: 'fine',
        },
      ];
      const adapted = fresh().fromOtelSpans(otel);
      expect(adapted).toEqual([
        {
          traceId: 'abc',
          spanId: 'def',
          parentSpanId: 'parent1',
          name: 'cad.create',
          startTime: 1000,
          endTime: 1100,
          status: 'ok',
          statusMessage: 'fine',
        },
      ]);
    });

    it('returns [] for non-array input', () => {
      expect(fresh().fromOtelSpans(null as unknown as Span[])).toEqual([]);
    });

    it('drops malformed OTel spans (null / no context) without throwing', () => {
      const malformed = [
        { name: 'x' } as unknown as Span,
        null as unknown as Span,
        undefined as unknown as Span,
      ];
      expect(fresh().fromOtelSpans(malformed)).toEqual([]);
    });
  });

  describe('assembleTrace (single-trace lookup)', () => {
    it('picks only spans for the requested traceId', () => {
      const spans: TraceSpanInput[] = [
        mkSpan({ traceId: 'wanted', spanId: 'a', endTime: 10 }),
        mkSpan({ traceId: 'wanted', spanId: 'b', parentSpanId: 'a', startTime: 1005, endTime: 1008 }),
        mkSpan({ traceId: 'other', spanId: 'x', endTime: 30 }),
      ];
      const v = fresh().assembleTrace(spans, 'wanted');
      expect(v).not.toBeNull();
      expect(v!.traceId).toBe('wanted');
      expect(v!.spanCount).toBe(2);
      expect(v!.rootSpanIds).toEqual(['a']);
    });

    it('returns null when no span matches the traceId', () => {
      expect(fresh().assembleTrace([mkSpan({ traceId: 'a' })], 'b')).toBeNull();
    });

    it('returns null on invalid input (bad array or empty traceId)', () => {
      const e = fresh();
      expect(e.assembleTrace(null as unknown as TraceSpanInput[], 't1')).toBeNull();
      expect(e.assembleTrace([mkSpan({})], '')).toBeNull();
    });
  });

  describe('singleton export', () => {
    it('exports a singleton instance reachable as cadTraceAssemblyEngine', () => {
      expect(cadTraceAssemblyEngine).toBeInstanceOf(CADTraceAssemblyEngine);
    });
  });

  // ---------------------------------------------------------------------------
  // Regression coverage added post-review: pins critical-path completeness,
  // multi-root traces, depth-2 tie-break, status precedence with all 3 signals,
  // slowestSpan tie-break, fromOtelSpans robustness, adversarial-input gauntlet.
  // ---------------------------------------------------------------------------
  describe('regression coverage', () => {
    it('single-span trace: critical path is exactly that span', () => {
      const r = fresh().assemble([
        mkSpan({ spanId: 'solo', startTime: 0, endTime: 100, status: 'ok' }),
      ]);
      const v = r.traces[0];
      expect(v.criticalPath.map((s) => s.spanId)).toEqual(['solo']);
      expect(v.criticalPathDurationMs).toBe(100);
    });

    it('handles multiple independent roots in the same trace', () => {
      const r = fresh().assemble([
        mkSpan({ spanId: 'root1', startTime: 0, endTime: 50, status: 'ok' }),
        mkSpan({ spanId: 'root2', startTime: 100, endTime: 300, status: 'ok' }),
      ]);
      const v = r.traces[0];
      expect(v.rootSpanIds).toEqual(['root1', 'root2']);
      expect(v.tree.length).toBe(2);
      // root2 (200ms) is heavier than root1 (50ms) -> critical path picks root2.
      expect(v.criticalPath.map((s) => s.spanId)).toEqual(['root2']);
      expect(v.criticalPathDurationMs).toBe(200);
    });

    it('tie-break critical path at depth > 1 picks earliest-then-lex grandchild', () => {
      // root(10) -> child(10) -> { grandA(10) | grandB(10) }
      // Both cumulative root->leaf chains = 30; tie -> lex spanId: grandA < grandB.
      const r = fresh().assemble([
        mkSpan({ spanId: 'root', startTime: 0, endTime: 10 }),
        mkSpan({ spanId: 'child', parentSpanId: 'root', startTime: 10, endTime: 20 }),
        mkSpan({ spanId: 'grandA', parentSpanId: 'child', startTime: 20, endTime: 30 }),
        mkSpan({ spanId: 'grandB', parentSpanId: 'child', startTime: 20, endTime: 30 }),
      ]);
      const v = r.traces[0];
      expect(v.criticalPath.map((s) => s.spanId)).toEqual(['root', 'child', 'grandA']);
      expect(v.criticalPathDurationMs).toBe(30);
    });

    it('error precedence beats both in-progress and ok (all three signals present)', () => {
      const r = fresh().assemble([
        mkSpan({ spanId: 'a', endTime: 10, status: 'ok' }),
        mkSpan({ spanId: 'b', startTime: 50 }), // in-progress
        mkSpan({ spanId: 'c', endTime: 40, status: 'error', statusMessage: 'broke' }),
      ]);
      const v = r.traces[0];
      expect(v.status).toBe('error');
      expect(v.errorCount).toBe(1);
      expect(v.inProgressCount).toBe(1);
    });

    it('slowestSpan tie-break on equal duration: earliest startTime wins', () => {
      const r = fresh().assemble([
        mkSpan({ spanId: 'zzz', startTime: 100, endTime: 200 }), // 100ms, later
        mkSpan({ spanId: 'aaa', startTime: 50, endTime: 150 }), // 100ms, earlier
      ]);
      // Iteration order is sorted (startTime, spanId); first max-duration wins.
      expect(r.traces[0].slowestSpan).toEqual({ spanId: 'aaa', name: 'op', durationMs: 100 });
    });

    it('fromOtelSpans tolerates OTel spans missing optional arrays', () => {
      // The adapter never reads attributes/events/links so a degraded
      // fixture must still adapt cleanly (documents real robustness).
      const otel: Span[] = [
        {
          name: 'op',
          context: { traceId: 't', spanId: 's', traceFlags: 1, isRemote: false },
          kind: 'internal',
          startTime: 100,
          endTime: 200,
          status: 'ok',
        } as unknown as Span,
      ];
      expect(fresh().fromOtelSpans(otel)).toEqual([
        {
          traceId: 't',
          spanId: 's',
          parentSpanId: undefined,
          name: 'op',
          startTime: 100,
          endTime: 200,
          status: 'ok',
          statusMessage: undefined,
        },
      ]);
    });

    it('fromOtelSpans drops spans whose context is null', () => {
      const malformed = [{ context: null, name: 'x', startTime: 1 } as unknown as Span];
      expect(fresh().fromOtelSpans(malformed)).toEqual([]);
    });

    it('assemble survives adversarial inputs without throwing', () => {
      const e = fresh();
      // undefined / object / junk array — all must produce a 0-trace result.
      expect(() => e.assemble(undefined as unknown as TraceSpanInput[])).not.toThrow();
      expect(() => e.assemble({} as unknown as TraceSpanInput[])).not.toThrow();
      const junk = [
        'junk' as unknown as TraceSpanInput,
        42 as unknown as TraceSpanInput,
        null as unknown as TraceSpanInput,
        undefined as unknown as TraceSpanInput,
        true as unknown as TraceSpanInput,
        {} as unknown as TraceSpanInput,
      ];
      const r = e.assemble(junk);
      expect(r.traceCount).toBe(0);
      expect(r.skippedSpans).toBe(6);
      expect(r.traces).toEqual([]);
    });
  });
});
