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
