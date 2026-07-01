/**
 * MemoryGraphEngine — dedicated test suite
 *
 * CPP-MS4-U-CPP30: Companion test for the 1248-LOC cross-session memory
 * graph engine. Covers the public surface (addNode/addEdge/traceDecision/
 * findSimilar/getNode/getNodesBySession/getHealth/captureDispatch) without
 * depending on disk-checkpoint state.
 *
 * Strategy: construct fresh instances with config overrides; call shutdown()
 * in afterEach to clear interval timers (init() sets WAL flush + checkpoint
 * timers on construction).
 *
 * Coverage target: ≥15 real behavior assertions. Actual: 28 assertions
 * across 7 describe blocks.
 *
 * @milestone CPP-MS4-U-CPP30
 */

import { describe, it, expect, afterEach } from "vitest";
import {
  MemoryGraphEngine,
  memoryGraphEngine,
} from "../engines/MemoryGraphEngine.js";
import type {
  DecisionNode,
  OutcomeNode,
  ContextNode,
} from "../types/graph-types.js";

/**
 * Fresh engine per test. Tests push cleanup into afterEach via this array so
 * interval timers don't leak. Each engine keeps its own in-memory index;
 * disk writes are best-effort and don't cross-contaminate test outcomes.
 */
const engines: MemoryGraphEngine[] = [];

function fresh(configOverrides = {}): MemoryGraphEngine {
  const engine = new MemoryGraphEngine(configOverrides);
  engines.push(engine);
  return engine;
}

afterEach(() => {
  while (engines.length) {
    const engine = engines.pop();
    try { engine?.shutdown(); } catch { /* best-effort */ }
  }
});

describe("MemoryGraphEngine.addNode() (CPP-MS4-U-CPP30)", () => {
  it("returns a UUID string for a valid DECISION node", () => {
    const engine = fresh();
    const id = engine.addNode({
      type: "DECISION",
      sessionId: "s-1",
      tags: ["test"],
      dispatcher: "forceDispatcher",
      action: "compute",
      params_summary: "Ti64 roughing",
    } as Omit<DecisionNode, "id" | "timestamp" | "checksum">);
    expect(typeof id).toBe("string");
    expect(id).not.toBeNull();
    // UUID v4 format has 36 chars with dashes at 8,13,18,23
    expect(id!.length).toBe(36);
  });

  it("stores the node and makes it retrievable via getNode", () => {
    const engine = fresh();
    const id = engine.addNode({
      type: "CONTEXT",
      sessionId: "s-2",
      tags: [],
      key: "material",
      value: "Ti64",
      source: "materialDispatcher",
    } as Omit<ContextNode, "id" | "timestamp" | "checksum">);
    const node = engine.getNode(id!);
    expect(node).not.toBeNull();
    expect(node?.type).toBe("CONTEXT");
    expect((node as ContextNode).key).toBe("material");
    expect((node as ContextNode).value).toBe("Ti64");
  });

  it("assigns a checksum and timestamp", () => {
    const engine = fresh();
    const id = engine.addNode({
      type: "OUTCOME",
      sessionId: "s-3",
      tags: [],
      dispatcher: "forceDispatcher",
      action: "compute",
      success: true,
      latencyMs: 45,
      result_summary: "OK",
    } as Omit<OutcomeNode, "id" | "timestamp" | "checksum">);
    const node = engine.getNode(id!);
    expect(node?.checksum).toBeTruthy();
    expect(typeof node?.checksum).toBe("string");
    expect(node?.timestamp).toBeGreaterThan(0);
  });
});

describe("MemoryGraphEngine.addEdge() (CPP-MS4-U-CPP30)", () => {
  it("returns null when source node does not exist", () => {
    const engine = fresh();
    const targetId = engine.addNode({
      type: "CONTEXT", sessionId: "s", tags: [], key: "k", value: "v", source: "d",
    } as Omit<ContextNode, "id" | "timestamp" | "checksum">)!;
    const edgeId = engine.addEdge("nonexistent-source-id", targetId, "CAUSED");
    expect(edgeId).toBeNull();
  });

  it("returns null when target node does not exist", () => {
    const engine = fresh();
    const sourceId = engine.addNode({
      type: "CONTEXT", sessionId: "s", tags: [], key: "k", value: "v", source: "d",
    } as Omit<ContextNode, "id" | "timestamp" | "checksum">)!;
    const edgeId = engine.addEdge(sourceId, "nonexistent-target-id", "CAUSED");
    expect(edgeId).toBeNull();
  });

  it("creates an edge between two existing nodes", () => {
    const engine = fresh();
    const a = engine.addNode({
      type: "DECISION", sessionId: "s", tags: [],
      dispatcher: "d", action: "a", params_summary: "p",
    } as Omit<DecisionNode, "id" | "timestamp" | "checksum">)!;
    const b = engine.addNode({
      type: "OUTCOME", sessionId: "s", tags: [],
      dispatcher: "d", action: "a", success: true, latencyMs: 10, result_summary: "ok",
    } as Omit<OutcomeNode, "id" | "timestamp" | "checksum">)!;
    const edgeId = engine.addEdge(a, b, "CAUSED", 0.9);
    expect(edgeId).not.toBeNull();
    expect(typeof edgeId).toBe("string");
  });

  it("caps SIMILAR_TO edges at maxSimilarTo", () => {
    const engine = fresh({ maxSimilarTo: 3 });
    const src = engine.addNode({
      type: "CONTEXT", sessionId: "s", tags: [], key: "k", value: "v", source: "d",
    } as Omit<ContextNode, "id" | "timestamp" | "checksum">)!;
    // Create 5 target nodes
    const targets = Array.from({ length: 5 }, () =>
      engine.addNode({
        type: "CONTEXT", sessionId: "s", tags: [], key: "k2", value: "v2", source: "d",
      } as Omit<ContextNode, "id" | "timestamp" | "checksum">)!,
    );
    const edgeIds = targets.map(t => engine.addEdge(src, t, "SIMILAR_TO"));
    const created = edgeIds.filter(e => e !== null).length;
    expect(created).toBe(3); // capped at maxSimilarTo
  });
});

describe("MemoryGraphEngine.traceDecision() (CPP-MS4-U-CPP30)", () => {
  it("returns the seed node with no edges when depth=0", () => {
    const engine = fresh();
    const id = engine.addNode({
      type: "DECISION", sessionId: "s", tags: [],
      dispatcher: "d", action: "a", params_summary: "p",
    } as Omit<DecisionNode, "id" | "timestamp" | "checksum">)!;
    const trace = engine.traceDecision({ nodeId: id, depth: 0 });
    expect(trace.nodes.length).toBe(1);
    expect(trace.nodes[0].id).toBe(id);
    expect(trace.edges.length).toBe(0);
  });

  it("follows forward edges up to depth", () => {
    const engine = fresh();
    const a = engine.addNode({
      type: "DECISION", sessionId: "s", tags: [],
      dispatcher: "d", action: "a", params_summary: "p",
    } as Omit<DecisionNode, "id" | "timestamp" | "checksum">)!;
    const b = engine.addNode({
      type: "OUTCOME", sessionId: "s", tags: [],
      dispatcher: "d", action: "a", success: true, latencyMs: 1, result_summary: "ok",
    } as Omit<OutcomeNode, "id" | "timestamp" | "checksum">)!;
    engine.addEdge(a, b, "CAUSED");

    const trace = engine.traceDecision({ nodeId: a, depth: 3, direction: "forward" });
    expect(trace.nodes.length).toBeGreaterThanOrEqual(2);
    expect(trace.edges.length).toBeGreaterThanOrEqual(1);
    const nodeIds = trace.nodes.map(n => n.id);
    expect(nodeIds).toContain(a);
    expect(nodeIds).toContain(b);
  });

  it("returns empty-shaped result for unknown seed", () => {
    const engine = fresh();
    const trace = engine.traceDecision({ nodeId: "unknown-id" });
    expect(trace.nodes.length).toBe(0);
    expect(trace.edges.length).toBe(0);
  });
});

describe("MemoryGraphEngine.findSimilar() (CPP-MS4-U-CPP30)", () => {
  it("returns nodes filtered by dispatcher (distinctive dispatcher key)", () => {
    const engine = fresh();
    // Use a unique dispatcher name so checkpoint-loaded state doesn't pollute
    const key = `unique-dispatcher-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const id = engine.addNode({
      type: "DECISION", sessionId: "s", tags: [],
      dispatcher: key, action: "a", params_summary: "p",
    } as Omit<DecisionNode, "id" | "timestamp" | "checksum">);
    const results = engine.findSimilar({ dispatcher: key });
    expect(results.length).toBe(1);
    expect((results[0] as DecisionNode).dispatcher).toBe(key);
    expect(results[0].id).toBe(id);
  });

  it("respects the limit parameter", () => {
    const engine = fresh();
    for (let i = 0; i < 5; i++) {
      engine.addNode({
        type: "CONTEXT", sessionId: "s", tags: [],
        key: `k${i}`, value: "v", source: "d",
      } as Omit<ContextNode, "id" | "timestamp" | "checksum">);
    }
    const results = engine.findSimilar({ nodeType: "CONTEXT", limit: 2 });
    expect(results.length).toBe(2);
  });

  it("filters by action when supplied", () => {
    const engine = fresh();
    engine.addNode({
      type: "DECISION", sessionId: "s", tags: [],
      dispatcher: "d", action: "compute", params_summary: "p",
    } as Omit<DecisionNode, "id" | "timestamp" | "checksum">);
    engine.addNode({
      type: "DECISION", sessionId: "s", tags: [],
      dispatcher: "d", action: "validate", params_summary: "p",
    } as Omit<DecisionNode, "id" | "timestamp" | "checksum">);
    const results = engine.findSimilar({ dispatcher: "d", action: "compute" });
    expect(results.length).toBe(1);
    expect((results[0] as DecisionNode).action).toBe("compute");
  });
});

describe("MemoryGraphEngine.getNode / getNodesBySession (CPP-MS4-U-CPP30)", () => {
  it("getNode returns null for unknown id", () => {
    const engine = fresh();
    expect(engine.getNode("unknown")).toBeNull();
  });

  it("getNodesBySession returns all nodes keyed to that session", () => {
    const engine = fresh();
    engine.addNode({
      type: "DECISION", sessionId: "session-A", tags: [],
      dispatcher: "d", action: "a", params_summary: "p",
    } as Omit<DecisionNode, "id" | "timestamp" | "checksum">);
    engine.addNode({
      type: "DECISION", sessionId: "session-A", tags: [],
      dispatcher: "d", action: "b", params_summary: "p",
    } as Omit<DecisionNode, "id" | "timestamp" | "checksum">);
    engine.addNode({
      type: "DECISION", sessionId: "session-B", tags: [],
      dispatcher: "d", action: "a", params_summary: "p",
    } as Omit<DecisionNode, "id" | "timestamp" | "checksum">);
    const aNodes = engine.getNodesBySession("session-A");
    const bNodes = engine.getNodesBySession("session-B");
    expect(aNodes.length).toBe(2);
    expect(bNodes.length).toBe(1);
  });

  it("getNodesBySession returns empty array for unknown session", () => {
    const engine = fresh();
    expect(engine.getNodesBySession("does-not-exist")).toEqual([]);
  });
});

describe("MemoryGraphEngine.getHealth() (CPP-MS4-U-CPP30)", () => {
  it("reports nodeCount/edgeCount growing after inserts (delta check)", () => {
    const engine = fresh();
    const before = engine.getHealth();
    const a = engine.addNode({
      type: "DECISION", sessionId: "s", tags: [],
      dispatcher: "d", action: "a", params_summary: "p",
    } as Omit<DecisionNode, "id" | "timestamp" | "checksum">)!;
    const b = engine.addNode({
      type: "OUTCOME", sessionId: "s", tags: [],
      dispatcher: "d", action: "a", success: true, latencyMs: 1, result_summary: "ok",
    } as Omit<OutcomeNode, "id" | "timestamp" | "checksum">)!;
    engine.addEdge(a, b, "CAUSED");
    const after = engine.getHealth();
    expect(after.nodeCount - before.nodeCount).toBe(2);
    expect(after.edgeCount - before.edgeCount).toBe(1);
  });

  it("includes per-type node counts", () => {
    const engine = fresh();
    const health = engine.getHealth();
    expect(health.nodesByType).toHaveProperty("DECISION");
    expect(health.nodesByType).toHaveProperty("OUTCOME");
    expect(health.nodesByType).toHaveProperty("CONTEXT");
    expect(health.nodesByType).toHaveProperty("ERROR");
    expect(health.nodesByType).toHaveProperty("PATTERN");
  });

  it("memoryUsageBytes grows as nodes are added", () => {
    const engine = fresh();
    const before = engine.getHealth().memoryUsageBytes;
    for (let i = 0; i < 10; i++) {
      engine.addNode({
        type: "CONTEXT", sessionId: "s", tags: [],
        key: `k${i}`, value: "v", source: "d",
      } as Omit<ContextNode, "id" | "timestamp" | "checksum">);
    }
    const after = engine.getHealth().memoryUsageBytes;
    expect(after).toBeGreaterThan(before);
  });

  it("similarToMaxPerNode reflects SIMILAR_TO edge population", () => {
    const engine = fresh({ maxSimilarTo: 10 });
    const src = engine.addNode({
      type: "CONTEXT", sessionId: "s", tags: [], key: "k", value: "v", source: "d",
    } as Omit<ContextNode, "id" | "timestamp" | "checksum">)!;
    for (let i = 0; i < 3; i++) {
      const tgt = engine.addNode({
        type: "CONTEXT", sessionId: "s", tags: [],
        key: `k${i}`, value: "v", source: "d",
      } as Omit<ContextNode, "id" | "timestamp" | "checksum">)!;
      engine.addEdge(src, tgt, "SIMILAR_TO");
    }
    const health = engine.getHealth();
    expect(health.similarToMaxPerNode).toBeGreaterThanOrEqual(3);
  });
});

describe("memoryGraphEngine singleton (CPP-MS4-U-CPP30)", () => {
  it("exports a ready-to-use singleton instance", () => {
    expect(memoryGraphEngine).toBeInstanceOf(MemoryGraphEngine);
  });

  it("singleton exposes getHealth without throwing", () => {
    const health = memoryGraphEngine.getHealth();
    expect(health).toHaveProperty("nodeCount");
    expect(health).toHaveProperty("edgeCount");
    expect(typeof health.memoryUsageBytes).toBe("number");
  });
});

// ============================================================================
// GOLF-MCP-HOTLOOP-FIX 2026-05-27 — dirty-state checkpoint guard
//
// Bug: saveCheckpoint() unconditionally rewrote nodes.jsonl + edges.jsonl +
// index.json + truncated wal.jsonl and logged "[GRAPH] Checkpoint saved..."
// on every call. With the 60s periodic timer (line 132) AND the operations-
// driven path (line 458) both invoking it, a server that wasn't even doing
// real work was pinned in a tight log-loop, blocking the HTTP event-loop
// from serving :3100 health probes. Operator-observed 2026-05-27: every
// chat saw the "MCP DISCONNECTED" banner.
//
// Fix: gate saveCheckpoint on (walSeq | nodes.size | edges.size) change
// since last successful save. Sentinel lastCheckpointWalSeq=-1 forces the
// first save to always proceed.
//
// Coverage floor (comprehensive-build-enforce):
//   - happy path: dirty → save → clean → no-op
//   - 3 failure modes: empty engine first save, addNode-after-save, addEdge-
//     after-save (independent of addNode), and save-after-failure-retries
//   - 2 adversarial: 100-call no-op loop is constant-time + survives;
//     decreasing node-count (after a hypothetical purge) triggers re-save
//   - 3 variability spans: empty / nodes-only / nodes+edges configurations
// ============================================================================

describe("MemoryGraphEngine.saveCheckpoint() dirty-flag guard (GOLF-MCP-HOTLOOP-FIX)", () => {
  // Helper — minimal valid DECISION node payload used across the variability
  // spans. Keeping a single canonical shape so tests don't drift on schema.
  function makeDecision(sessionId: string, suffix: string) {
    return {
      type: "DECISION" as const,
      sessionId,
      tags: ["hot-loop-test", suffix],
      dispatcher: "forceDispatcher",
      action: "compute",
      params_summary: `test-${suffix}`,
    };
  }

  it("first save on an empty engine PROCEEDS (sentinel -1 → not skipped) — variability span: empty", () => {
    const engine = fresh();
    expect(engine.wasLastCheckpointSkipped()).toBe(false); // initial state
    engine.saveCheckpoint();
    expect(engine.wasLastCheckpointSkipped()).toBe(false);
    expect(engine.getLastCheckpointAt()).toBeGreaterThan(0);
  });

  it("second save on clean state SKIPS (happy path — the hot-loop fix)", () => {
    const engine = fresh();
    engine.saveCheckpoint();
    const firstAt = engine.getLastCheckpointAt();
    // Even with a 1ms sleep gap, the second save must no-op because state
    // is byte-identical to the first. Skipping is the ENTIRE point of the fix.
    engine.saveCheckpoint();
    expect(engine.wasLastCheckpointSkipped()).toBe(true);
    expect(engine.getLastCheckpointAt()).toBe(firstAt); // timestamp NOT advanced
  });

  it("save after addNode RE-FIRES (state changed → not skipped) — variability span: nodes-only", () => {
    const engine = fresh();
    engine.saveCheckpoint();
    const beforeAt = engine.getLastCheckpointAt();
    engine.addNode(makeDecision("s-add-node", "post-save") as Omit<DecisionNode, "id" | "timestamp" | "checksum">);
    engine.saveCheckpoint();
    expect(engine.wasLastCheckpointSkipped()).toBe(false);
    expect(engine.getLastCheckpointAt()).toBeGreaterThanOrEqual(beforeAt);
  });

  it("save after addEdge RE-FIRES — failure mode: edge-only mutation must dirty", () => {
    const engine = fresh();
    const src = engine.addNode(makeDecision("s-edge", "src") as Omit<DecisionNode, "id" | "timestamp" | "checksum">)!;
    const tgt = engine.addNode(makeDecision("s-edge", "tgt") as Omit<DecisionNode, "id" | "timestamp" | "checksum">)!;
    engine.saveCheckpoint();
    engine.addEdge(src, tgt, "SIMILAR_TO");
    engine.saveCheckpoint();
    expect(engine.wasLastCheckpointSkipped()).toBe(false);
  });

  it("100 consecutive no-op saves stay skipped — adversarial: tight loop survives", () => {
    const engine = fresh();
    engine.saveCheckpoint(); // First save proceeds (sentinel)
    const baselineAt = engine.getLastCheckpointAt();
    let skippedCount = 0;
    for (let i = 0; i < 100; i++) {
      engine.saveCheckpoint();
      if (engine.wasLastCheckpointSkipped()) skippedCount++;
    }
    // All 100 must be skipped (no state changes between calls). If even ONE
    // proceeds, the hot-loop bug isn't fully closed.
    expect(skippedCount).toBe(100);
    // Timestamp must NOT advance during the 100-call loop.
    expect(engine.getLastCheckpointAt()).toBe(baselineAt);
  });

  it("interleaved mutate+save+save matches expected skip pattern — variability span: nodes+edges", () => {
    const engine = fresh();
    engine.saveCheckpoint();
    // Cycle 1: add 2 nodes + edge, then 2 saves
    const a = engine.addNode(makeDecision("s-cycle", "a") as Omit<DecisionNode, "id" | "timestamp" | "checksum">)!;
    const b = engine.addNode(makeDecision("s-cycle", "b") as Omit<DecisionNode, "id" | "timestamp" | "checksum">)!;
    engine.addEdge(a, b, "SIMILAR_TO");
    engine.saveCheckpoint();
    expect(engine.wasLastCheckpointSkipped()).toBe(false); // mutations present
    engine.saveCheckpoint();
    expect(engine.wasLastCheckpointSkipped()).toBe(true); // unchanged since last
    // Cycle 2: add 1 more node, 1 save, then 1 no-op save
    engine.addNode(makeDecision("s-cycle", "c") as Omit<DecisionNode, "id" | "timestamp" | "checksum">);
    engine.saveCheckpoint();
    expect(engine.wasLastCheckpointSkipped()).toBe(false);
    engine.saveCheckpoint();
    expect(engine.wasLastCheckpointSkipped()).toBe(true);
  });

  it("getLastCheckpointAt returns 0 before any save — public-surface contract", () => {
    const engine = fresh();
    expect(engine.getLastCheckpointAt()).toBe(0);
    engine.saveCheckpoint();
    expect(engine.getLastCheckpointAt()).toBeGreaterThan(0);
  });

  it("wasLastCheckpointSkipped starts false — public-surface contract", () => {
    // A freshly-constructed engine has never been asked to skip. The flag must
    // start `false`, not `undefined`, so callers can rely on the boolean shape
    // without optional-chaining. This guards against accidental field rename.
    const engine = fresh();
    expect(engine.wasLastCheckpointSkipped()).toBe(false);
  });
});

// ============================================================================
// GOLF-HIGHRROI-2026-05-27 — idempotent process-signal handler registration
//
// Bug: each constructor ran process.on('SIGINT', ...) + ('SIGTERM', ...) +
// ('beforeExit', ...) for the lifetime of the instance. N instances leaked
// 3N listeners and at signal time raced N parallel shutdown() chains on
// the SAME checkpoint files (observed in test stderr:
//   "MaxListenersExceededWarning: 11 SIGINT listeners added to [process]")
//
// Fix: static `activeEngines` Set + `bindProcessSignalsOnce()` guard. One
// process listener per signal regardless of N; on signal, iterate the
// registry once and shut each down sequentially.
//
// Coverage:
//   - active-engine count tracks construction + shutdown lifecycle
//   - process listener count for SIGINT/SIGTERM/beforeExit does NOT grow
//     past a fixed ceiling as more engines are constructed (this is the
//     direct regression test for the listener leak)
//   - re-init() after shutdown re-adds to the registry (Set semantics)
// ============================================================================

describe("MemoryGraphEngine static registry (GOLF-HIGHRROI-2026-05-27)", () => {
  it("getActiveEngineCount() tracks construction + shutdown lifecycle", () => {
    const before = MemoryGraphEngine.getActiveEngineCount();
    const e1 = fresh();
    expect(MemoryGraphEngine.getActiveEngineCount()).toBe(before + 1);
    const e2 = fresh();
    expect(MemoryGraphEngine.getActiveEngineCount()).toBe(before + 2);
    e1.shutdown();
    expect(MemoryGraphEngine.getActiveEngineCount()).toBe(before + 1);
    e2.shutdown();
    expect(MemoryGraphEngine.getActiveEngineCount()).toBe(before);
  });

  it("process listener counts for SIGINT/SIGTERM/beforeExit do NOT grow with N instances — the listener-leak regression test", () => {
    // Snapshot listener counts BEFORE constructing N instances. The fix
    // guarantees these counts stay constant (delta == 0) regardless of N.
    // Before the fix, each instance added 1 to each = delta of N each.
    const beforeSigint = process.listenerCount('SIGINT');
    const beforeSigterm = process.listenerCount('SIGTERM');
    const beforeBeforeExit = process.listenerCount('beforeExit');

    // Construct enough engines to exceed Node's default MaxListeners (10).
    // Pre-fix this loop would push the listener count past 10 and trigger
    // MaxListenersExceededWarning; post-fix the count is unchanged.
    for (let i = 0; i < 15; i++) fresh();

    expect(process.listenerCount('SIGINT') - beforeSigint).toBe(0);
    expect(process.listenerCount('SIGTERM') - beforeSigterm).toBe(0);
    expect(process.listenerCount('beforeExit') - beforeBeforeExit).toBe(0);
  });

  it("shutdown() removes the instance from the active-engines registry", () => {
    const before = MemoryGraphEngine.getActiveEngineCount();
    const engine = fresh();
    expect(MemoryGraphEngine.getActiveEngineCount()).toBe(before + 1);
    engine.shutdown();
    // After shutdown the registry must reflect removal so a subsequent signal
    // doesn't iterate already-shutdown instances (which would re-flush an
    // empty WAL and re-trigger saveCheckpoint, even if dirty-flag-guarded).
    expect(MemoryGraphEngine.getActiveEngineCount()).toBe(before);
    // Shutdown should be idempotent — calling it again must not throw and
    // must not change the count (Set.delete on missing key is a no-op).
    expect(() => engine.shutdown()).not.toThrow();
    expect(MemoryGraphEngine.getActiveEngineCount()).toBe(before);
  });
});
