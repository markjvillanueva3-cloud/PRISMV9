/**
 * CADTraceAssemblyEngine — U-AI-10 (CAD-COMPLETE-MS0 / PHASE-47)
 *
 * Assembles a flat OpenTelemetry span list into per-traceId end-to-end trace
 * views for the CAD agent's observability layer. PURE ANALYZER — it composes
 * the output of OpenTelemetryTracingEngine and records nothing of its own.
 *
 * Given a flat span list (e.g. openTelemetryTracingEngine.getCompletedSpans()),
 * for each traceId it produces:
 *   - a span tree (forest — multi-root tolerated)
 *   - total wall-clock duration (max endTime - min startTime across the trace)
 *   - the critical path (root->leaf chain with the largest cumulative span time)
 *   - the slowest single span
 *   - an error rollup + overall status
 *
 * Robustness: cyclic parent references, orphan spans (missing parent),
 * duplicate spanIds, in-progress spans (no endTime) and negative durations
 * (endTime < startTime) are all detected, repaired non-destructively, and
 * surfaced as warnings — never thrown. Tree walks are iterative (explicit
 * stacks) so a pathologically deep trace cannot overflow the call stack.
 *
 * Convention: instance-method singleton (not static-method) — matches the
 * sibling OpenTelemetryTracingEngine and the dominant live engine pattern. It
 * returns structural trees, so the AtomicValue / Zod physics-engine conventions
 * do not apply. Memory is O(spanCount); callers bound very large span lists.
 *
 * @milestone CAD-COMPLETE-MS0
 * @unit U-AI-10
 */

import type { Span } from './OpenTelemetryTracingEngine.js';

// ============================================================================
// TYPES
// ============================================================================

export type TraceSpanStatus = 'unset' | 'ok' | 'error';
/**
 * Trace-level health rollup. Precedence: 'error' (any span errored) >
 * 'partial' (any span still in-progress) > 'ok' (completed, >=1 span
 * explicitly ok) > 'unset' (completed, no span carried a health signal).
 */
export type TraceRollupStatus = 'ok' | 'error' | 'partial' | 'unset';

/** Minimal span shape the assembler consumes — decoupled from the OTel Span. */
export interface TraceSpanInput {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  status?: TraceSpanStatus;
  statusMessage?: string;
}

/** A node in the assembled span tree. */
export interface TraceSpanNode {
  spanId: string;
  name: string;
  parentSpanId?: string;
  startTime: number;
  endTime?: number;
  /** Wall-clock span duration in ms; 0 when in-progress or when endTime < startTime. */
  durationMs: number;
  status: TraceSpanStatus;
  statusMessage?: string;
  /** 0 at a forest root. */
  depth: number;
  inProgress: boolean;
  children: TraceSpanNode[];
}

/** One step along the critical path. */
export interface CriticalPathStep {
  spanId: string;
  name: string;
  durationMs: number;
}

/** One error span in the rollup. */
export interface TraceErrorSpan {
  spanId: string;
  name: string;
  message?: string;
}

/** End-to-end view of a single trace. */
export interface TraceView {
  traceId: string;
  spanCount: number;
  /** Root spans of the assembled forest (real roots + re-parented orphans + cycle entries). */
  rootSpanIds: string[];
  tree: TraceSpanNode[];
  /** Wall-clock duration: max(endTime|startTime) - min(startTime) across the trace. */
  totalDurationMs: number;
  /** Root->leaf chain with the largest cumulative span duration. */
  criticalPath: CriticalPathStep[];
  criticalPathDurationMs: number;
  slowestSpan: { spanId: string; name: string; durationMs: number };
  status: TraceRollupStatus;
  errorCount: number;
  errorSpans: TraceErrorSpan[];
  inProgressCount: number;
  /** Spans whose parentSpanId referenced a span absent from the trace. */
  orphanCount: number;
  /** Count of broken cyclic parent-reference edges; nonzero iff the trace contained any cycle. */
  cycleCount: number;
  warnings: string[];
}

/** Result of assembling a multi-trace span list. */
export interface TraceAssemblyResult {
  traces: TraceView[];
  traceCount: number;
  /** Input span count. */
  totalSpans: number;
  /** Spans that passed validation. */
  validSpans: number;
  /** Spans dropped for a bad traceId / spanId / startTime. */
  skippedSpans: number;
}

const STATUS_VALUES: readonly TraceSpanStatus[] = ['unset', 'ok', 'error'];

// ============================================================================
// ENGINE
// ============================================================================

export class CADTraceAssemblyEngine {
  /**
   * Adapts OpenTelemetryTracingEngine spans to the assembler's input shape.
   * Malformed spans (null/absent context) are skipped; every adapted span is
   * still re-validated by assemble() / assembleTrace() before use.
   * @param spans Spans from openTelemetryTracingEngine.getCompletedSpans().
   * @returns A flat TraceSpanInput list (empty when input is not an array).
   */
  fromOtelSpans(spans: Span[]): TraceSpanInput[] {
    if (!Array.isArray(spans)) return [];
    const out: TraceSpanInput[] = [];
    for (const s of spans) {
      if (!s || !s.context) continue;
      out.push({
        traceId: s.context.traceId,
        spanId: s.context.spanId,
        parentSpanId: s.parentSpanId,
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        statusMessage: s.statusMessage,
      });
    }
    return out;
  }

  /**
   * Assembles every trace present in the span list into end-to-end views.
   * @param spans A flat span list spanning zero or more traceIds.
   * @returns One TraceView per distinct traceId plus validation counters.
   */
  assemble(spans: TraceSpanInput[]): TraceAssemblyResult {
    const totalSpans = Array.isArray(spans) ? spans.length : 0;
    if (!Array.isArray(spans) || spans.length === 0) {
      return { traces: [], traceCount: 0, totalSpans, validSpans: 0, skippedSpans: 0 };
    }

    const byTrace = new Map<string, TraceSpanInput[]>();
    let valid = 0;
    let skipped = 0;
    for (const s of spans) {
      const norm = this.validateSpan(s);
      if (!norm) {
        skipped++;
        continue;
      }
      valid++;
      let bucket = byTrace.get(norm.traceId);
      if (!bucket) {
        bucket = [];
        byTrace.set(norm.traceId, bucket);
      }
      bucket.push(norm);
    }

    const traceIds = [...byTrace.keys()].sort();
    const traces: TraceView[] = [];
    for (const tid of traceIds) {
      traces.push(this.buildTraceView(tid, byTrace.get(tid)!));
    }
    return { traces, traceCount: traces.length, totalSpans, validSpans: valid, skippedSpans: skipped };
  }

  /**
   * Assembles a single trace by id.
   * @param spans A flat span list (any traceIds).
   * @param traceId The traceId to assemble.
   * @returns The TraceView, or null when the input is invalid or no valid span
   *          matches the traceId.
   */
  assembleTrace(spans: TraceSpanInput[], traceId: string): TraceView | null {
    if (!Array.isArray(spans) || typeof traceId !== 'string' || traceId.length === 0) {
      return null;
    }
    const matched: TraceSpanInput[] = [];
    for (const s of spans) {
      const norm = this.validateSpan(s);
      if (norm && norm.traceId === traceId) matched.push(norm);
    }
    if (matched.length === 0) return null;
    return this.buildTraceView(traceId, matched);
  }

  // --------------------------------------------------------------------------
  // INTERNALS
  // --------------------------------------------------------------------------

  /** Validates + normalizes a raw span; returns null when unusable. */
  private validateSpan(s: TraceSpanInput | null | undefined): TraceSpanInput | null {
    if (!s || typeof s !== 'object') return null;
    if (typeof s.traceId !== 'string' || s.traceId.length === 0) return null;
    if (typeof s.spanId !== 'string' || s.spanId.length === 0) return null;
    if (typeof s.startTime !== 'number' || !Number.isFinite(s.startTime)) return null;

    const status: TraceSpanStatus = STATUS_VALUES.includes(s.status as TraceSpanStatus)
      ? (s.status as TraceSpanStatus)
      : 'unset';
    const endTime =
      typeof s.endTime === 'number' && Number.isFinite(s.endTime) ? s.endTime : undefined;
    const parentSpanId =
      typeof s.parentSpanId === 'string' && s.parentSpanId.length > 0 ? s.parentSpanId : undefined;

    return {
      traceId: s.traceId,
      spanId: s.spanId,
      parentSpanId,
      name: typeof s.name === 'string' && s.name.length > 0 ? s.name : '(unnamed span)',
      startTime: s.startTime,
      endTime,
      status,
      statusMessage: typeof s.statusMessage === 'string' ? s.statusMessage : undefined,
    };
  }

  /**
   * Builds the end-to-end view for one trace from its validated spans.
   * Precondition: rawSpans is non-empty (every caller guarantees this), so the
   * returned TraceView always has spanCount >= 1 and a concrete slowestSpan.
   */
  private buildTraceView(traceId: string, rawSpans: TraceSpanInput[]): TraceView {
    const warnings: string[] = [];

    // --- Deduplicate spanId: deterministic sort, keep the first occurrence ---
    const sorted = [...rawSpans].sort(
      (a, b) =>
        a.startTime - b.startTime || (a.spanId < b.spanId ? -1 : a.spanId > b.spanId ? 1 : 0),
    );
    const spanMap = new Map<string, TraceSpanInput>();
    let duplicateCount = 0;
    for (const s of sorted) {
      if (spanMap.has(s.spanId)) {
        duplicateCount++;
        continue;
      }
      spanMap.set(s.spanId, s);
    }
    if (duplicateCount > 0) {
      warnings.push(`${duplicateCount} duplicate spanId(s) dropped`);
    }
    const spanCount = spanMap.size;

    // --- Build node objects + duration ---
    const nodes = new Map<string, TraceSpanNode>();
    let negativeDurationCount = 0;
    for (const s of spanMap.values()) {
      const inProgress = s.endTime === undefined;
      let durationMs = 0;
      if (s.endTime !== undefined) {
        const d = s.endTime - s.startTime;
        if (d >= 0) durationMs = d;
        else negativeDurationCount++;
      }
      nodes.set(s.spanId, {
        spanId: s.spanId,
        name: s.name,
        parentSpanId: s.parentSpanId,
        startTime: s.startTime,
        endTime: s.endTime,
        durationMs,
        status: s.status ?? 'unset',
        statusMessage: s.statusMessage,
        depth: 0,
        inProgress,
        children: [],
      });
    }
    if (negativeDurationCount > 0) {
      warnings.push(
        `${negativeDurationCount} span(s) had endTime before startTime (duration clamped to 0)`,
      );
    }

    // --- Roots (no parent / missing parent) + children adjacency ---
    const childIds = new Map<string, string[]>();
    const rootIds: string[] = [];
    let orphanCount = 0;
    for (const s of spanMap.values()) {
      if (s.parentSpanId === undefined) {
        rootIds.push(s.spanId);
      } else if (!spanMap.has(s.parentSpanId)) {
        rootIds.push(s.spanId);
        orphanCount++;
      } else {
        let arr = childIds.get(s.parentSpanId);
        if (!arr) {
          arr = [];
          childIds.set(s.parentSpanId, arr);
        }
        arr.push(s.spanId);
      }
    }
    if (orphanCount > 0) {
      warnings.push(`${orphanCount} orphan span(s) had a missing parent (re-parented as root)`);
    }

    // Deterministic ordering: by startTime then spanId.
    const cmp = (a: string, b: string): number => {
      const na = nodes.get(a)!;
      const nb = nodes.get(b)!;
      return na.startTime - nb.startTime || (a < b ? -1 : a > b ? 1 : 0);
    };
    rootIds.sort(cmp);
    for (const arr of childIds.values()) arr.sort(cmp);

    // --- Iterative DFS forest build with gray/black cycle detection ---
    // color: 0 unvisited(white), 1 on-stack(gray), 2 done(black)
    const color = new Map<string, 0 | 1 | 2>();
    for (const id of spanMap.keys()) color.set(id, 0);
    let cycleEdgeCount = 0;
    let cycleRootCount = 0;
    const forest: TraceSpanNode[] = [];

    const dfs = (startId: string): void => {
      const startNode = nodes.get(startId)!;
      startNode.depth = 0;
      forest.push(startNode);
      color.set(startId, 1);
      const stack: Array<[string, number]> = [[startId, 0]];
      while (stack.length > 0) {
        const frame = stack[stack.length - 1];
        const nodeId = frame[0];
        const idx = frame[1];
        const node = nodes.get(nodeId)!;
        const kids = childIds.get(nodeId) ?? [];
        if (idx >= kids.length) {
          color.set(nodeId, 2);
          stack.pop();
          continue;
        }
        frame[1] = idx + 1;
        const childId = kids[idx];
        const c = color.get(childId);
        if (c === 1 || c === 2) {
          // back-edge (gray) or cross/forward-edge (black) → break the cycle
          cycleEdgeCount++;
          continue;
        }
        const childNode = nodes.get(childId)!;
        childNode.depth = node.depth + 1;
        node.children.push(childNode);
        color.set(childId, 1);
        stack.push([childId, 0]);
      }
    };

    for (const rid of rootIds) {
      if (color.get(rid) === 0) dfs(rid);
    }
    // Pure cycles (no root span) — pick up leftover white nodes deterministically.
    const leftovers = [...spanMap.keys()].filter((id) => color.get(id) === 0).sort();
    for (const id of leftovers) {
      if (color.get(id) === 0) {
        dfs(id);
        cycleRootCount++;
      }
    }
    if (cycleEdgeCount > 0 || cycleRootCount > 0) {
      warnings.push(
        `cycle detected: ${cycleEdgeCount} cyclic parent reference(s) broken` +
          (cycleRootCount > 0 ? `, ${cycleRootCount} cycle(s) had no root span` : ''),
      );
    }

    // --- Aggregate metrics ---
    let minStart = Infinity;
    let maxEnd = -Infinity;
    let errorCount = 0;
    let inProgressCount = 0;
    let okCount = 0;
    const errorSpans: TraceErrorSpan[] = [];
    let slowest = { spanId: '', name: '', durationMs: -1 };

    for (const node of nodes.values()) {
      if (node.startTime < minStart) minStart = node.startTime;
      const endlike = node.endTime !== undefined ? node.endTime : node.startTime;
      if (endlike > maxEnd) maxEnd = endlike;
      if (node.inProgress) inProgressCount++;
      if (node.status === 'error') {
        errorCount++;
        errorSpans.push({ spanId: node.spanId, name: node.name, message: node.statusMessage });
      } else if (node.status === 'ok') {
        okCount++;
      }
      if (node.durationMs > slowest.durationMs) {
        slowest = { spanId: node.spanId, name: node.name, durationMs: node.durationMs };
      }
    }
    const totalDurationMs = maxEnd > minStart ? maxEnd - minStart : 0;

    // --- Critical path: root->leaf chain maximizing cumulative durationMs ---
    const { criticalPath, criticalPathDurationMs } = this.computeCriticalPath(forest);

    // --- Status rollup (see TraceRollupStatus for precedence) ---
    // A completed trace with >=1 explicitly-ok span rolls up 'ok' even when
    // other spans are 'unset' — distinguishing a healthy-but-partially-
    // instrumented trace from a wholly uninstrumented one.
    let status: TraceRollupStatus;
    if (errorCount > 0) status = 'error';
    else if (inProgressCount > 0) status = 'partial';
    else if (okCount > 0) status = 'ok';
    else status = 'unset';

    return {
      traceId,
      spanCount,
      rootSpanIds: forest.map((n) => n.spanId),
      tree: forest,
      totalDurationMs,
      criticalPath,
      criticalPathDurationMs,
      slowestSpan: {
        spanId: slowest.spanId,
        name: slowest.name,
        durationMs: Math.max(0, slowest.durationMs),
      },
      status,
      errorCount,
      errorSpans,
      inProgressCount,
      orphanCount,
      cycleCount: cycleEdgeCount,
      warnings,
    };
  }

  /**
   * Longest-cumulative-duration root->leaf chain over the assembled forest.
   * The forest is acyclic (cycle edges were dropped during the build), so the
   * iterative post-order fold below cannot loop. On equal cumulative duration
   * the earliest-starting (then lexicographically-smallest spanId) root/child
   * wins, so the result is deterministic.
   */
  private computeCriticalPath(forest: TraceSpanNode[]): {
    criticalPath: CriticalPathStep[];
    criticalPathDurationMs: number;
  } {
    const bestSum = new Map<string, number>();
    const bestChild = new Map<string, string | null>();

    for (const root of forest) {
      const stack: Array<[TraceSpanNode, number]> = [[root, 0]];
      while (stack.length > 0) {
        const frame = stack[stack.length - 1];
        const node = frame[0];
        const idx = frame[1];
        if (idx < node.children.length) {
          frame[1] = idx + 1;
          stack.push([node.children[idx], 0]);
          continue;
        }
        let best = 0;
        let bc: string | null = null;
        for (const child of node.children) {
          const cs = bestSum.get(child.spanId) ?? 0;
          if (cs > best) {
            best = cs;
            bc = child.spanId;
          }
        }
        bestSum.set(node.spanId, node.durationMs + best);
        bestChild.set(node.spanId, bc);
        stack.pop();
      }
    }

    let critRootId: string | null = null;
    let critBest = -1;
    for (const root of forest) {
      const bs = bestSum.get(root.spanId) ?? 0;
      if (bs > critBest) {
        critBest = bs;
        critRootId = root.spanId;
      }
    }

    // Flatten the forest into an id->node map (iterative — no recursion).
    const nodeById = new Map<string, TraceSpanNode>();
    const flat: TraceSpanNode[] = [...forest];
    for (let i = 0; i < flat.length; i++) {
      nodeById.set(flat[i].spanId, flat[i]);
      for (const c of flat[i].children) flat.push(c);
    }

    const criticalPath: CriticalPathStep[] = [];
    const guard = new Set<string>();
    let cursor: string | null = critRootId;
    while (cursor !== null && !guard.has(cursor)) {
      guard.add(cursor);
      const n = nodeById.get(cursor);
      if (!n) break;
      criticalPath.push({ spanId: n.spanId, name: n.name, durationMs: n.durationMs });
      cursor = bestChild.get(cursor) ?? null;
    }
    const criticalPathDurationMs = criticalPath.reduce((a, s) => a + s.durationMs, 0);
    return { criticalPath, criticalPathDurationMs };
  }
}

export const cadTraceAssemblyEngine = new CADTraceAssemblyEngine();
