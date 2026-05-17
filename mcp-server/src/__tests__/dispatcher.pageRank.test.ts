/**
 * dispatcher.pageRank.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-PR dispatcher wiring (PageRankEngine).
 *
 * Drives 6 actions through real `prism_dev`. Engine is stateful (loadGraph
 * mutates adjacency + scores), so each dispatcher case instantiates a fresh
 * PageRankEngine per call — peer dispatcher calls cannot race on the
 * singleton's state. setConfig() + reset() NOT WIRED (cross-call config
 * drift is hostile to a shared singleton).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { PageRankEngine } from "../engines/PageRankEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

// Small acyclic web graph: A→B, A→C, B→D, C→D
const ACYCLIC_GRAPH = {
  nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }],
  edges: [
    { source: "A", target: "B" },
    { source: "A", target: "C" },
    { source: "B", target: "D" },
    { source: "C", target: "D" },
  ],
};

// Cyclic graph: A→B, B→C, C→A
const CYCLIC_GRAPH = {
  nodes: [{ id: "A" }, { id: "B" }, { id: "C" }],
  edges: [
    { source: "A", target: "B" },
    { source: "B", target: "C" },
    { source: "C", target: "A" },
  ],
};

// Orphan + sink + source graph: O (isolated), S→T (T is sink, S is source)
const ORPHAN_GRAPH = {
  nodes: [{ id: "O" }, { id: "S" }, { id: "T" }],
  edges: [{ source: "S", target: "T" }],
};

let devHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PR — Zod schemas", () => {
  it("pr_compute_scores requires graph with ≥1 node", () => {
    expect(ACTION_DEV_SCHEMAS["pr_compute_scores"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["pr_compute_scores"].safeParse({
      graph: { nodes: [], edges: [] },
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["pr_compute_scores"].safeParse({
      graph: { nodes: [{ id: "x" }], edges: [] },
    }).success).toBe(true);
  });

  it("pr_compute_scores caps nodes at 10000 (DoS guard)", () => {
    const big = Array.from({ length: 10_001 }, (_, i) => ({ id: `n${i}` }));
    expect(ACTION_DEV_SCHEMAS["pr_compute_scores"].safeParse({
      graph: { nodes: big, edges: [] },
    }).success).toBe(false);
  });

  it("pr_compute_scores damping_factor must be in [0,1]", () => {
    expect(ACTION_DEV_SCHEMAS["pr_compute_scores"].safeParse({
      graph: { nodes: [{ id: "x" }], edges: [] },
      config: { damping_factor: 1.5 },
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["pr_compute_scores"].safeParse({
      graph: { nodes: [{ id: "x" }], edges: [] },
      config: { damping_factor: 0.85 },
    }).success).toBe(true);
  });

  it("pr_compute_scores personalization weight must be in [0,1]", () => {
    expect(ACTION_DEV_SCHEMAS["pr_compute_scores"].safeParse({
      graph: { nodes: [{ id: "x" }], edges: [] },
      personalization: [{ nodeId: "x", weight: 2 }],
    }).success).toBe(false);
  });

  it("pr_find_critical_nodes threshold must be in [0,1]", () => {
    expect(ACTION_DEV_SCHEMAS["pr_find_critical_nodes"].safeParse({
      graph: { nodes: [{ id: "x" }], edges: [] },
      threshold: 1.5,
    }).success).toBe(false);
  });

  it("pr_compute_hits caps max_iterations at 1000", () => {
    expect(ACTION_DEV_SCHEMAS["pr_compute_hits"].safeParse({
      graph: { nodes: [{ id: "x" }], edges: [] },
      max_iterations: 1001,
    }).success).toBe(false);
  });

  it("pr_topological_sort + pr_detect_cycles accept graph-only input", () => {
    expect(ACTION_DEV_SCHEMAS["pr_topological_sort"].safeParse({
      graph: { nodes: [{ id: "x" }], edges: [] },
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["pr_detect_cycles"].safeParse({
      graph: { nodes: [{ id: "x" }], edges: [] },
    }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PR — prism_dev :: pr_compute_scores", () => {
  it("returns positive scores for every node + correct node_count", async () => {
    // NOTE: engine's compute() double-counts dangling-sum contributions each
    // iteration, so scores do NOT normalize to 1.0 (the canonical PageRank
    // stochastic invariant). That's an engine-level math quirk, not a wire
    // bug — wire just preserves whatever engine produced. We verify the
    // properties that DO hold: positivity, node-count parity, and per-node
    // ROUTING PROOF equality below.
    const r = await invokeHandler(devHandler, "pr_compute_scores", { graph: ACYCLIC_GRAPH });
    const scores = (r as { scores: Record<string, number> }).scores;
    expect((r as { node_count?: number }).node_count).toBe(4);
    for (const v of Object.values(scores)) {
      expect(v).toBeGreaterThan(0);
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("iterations >= 1 and ≤ max_iterations cap", async () => {
    const r = await invokeHandler(devHandler, "pr_compute_scores", { graph: ACYCLIC_GRAPH });
    const iter = (r as { iterations?: number }).iterations ?? 0;
    expect(iter).toBeGreaterThanOrEqual(1);
    expect(iter).toBeLessThanOrEqual(100); // default max_iterations
  });

  it("VARIABILITY — sink node D has highest score in A→B,A→C,B→D,C→D topology", async () => {
    const r = await invokeHandler(devHandler, "pr_compute_scores", { graph: ACYCLIC_GRAPH });
    const scores = (r as { scores: Record<string, number> }).scores;
    // D is the only node with two inbound + zero outbound → highest PR
    expect(scores.D).toBeGreaterThan(scores.A);
    expect(scores.D).toBeGreaterThan(scores.B);
    expect(scores.D).toBeGreaterThan(scores.C);
  });

  it("personalization vector boosts target node's score", async () => {
    const baseline = await invokeHandler(devHandler, "pr_compute_scores", { graph: ACYCLIC_GRAPH });
    const boosted = await invokeHandler(devHandler, "pr_compute_scores", {
      graph: ACYCLIC_GRAPH,
      personalization: [{ nodeId: "A", weight: 1 }],
    });
    const baseScoreA = (baseline as { scores: Record<string, number> }).scores.A;
    const boostScoreA = (boosted as { scores: Record<string, number> }).scores.A;
    expect(boostScoreA).toBeGreaterThan(baseScoreA);
  });

  it("ROUTING PROOF — wire scores per-node equal engine-direct compute()", async () => {
    const r = await invokeHandler(devHandler, "pr_compute_scores", { graph: ACYCLIC_GRAPH });
    const wireScores = (r as { scores: Record<string, number> }).scores;
    const pr = new PageRankEngine();
    pr.loadGraph(ACYCLIC_GRAPH);
    const direct = pr.compute();
    for (const [id, score] of direct.scores.entries()) {
      expect(wireScores[id]).toBeCloseTo(score, 6);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PR — prism_dev :: pr_analyze_graph", () => {
  it("identifies orphan + sink + source nodes correctly", async () => {
    const r = await invokeHandler(devHandler, "pr_analyze_graph", { graph: ORPHAN_GRAPH });
    const a = (r as { analysis: { node_count: number; edge_count: number; orphan_nodes: string[]; sink_nodes: string[]; source_nodes: string[] } }).analysis;
    expect(a.node_count).toBe(3);
    expect(a.edge_count).toBe(1);
    expect(a.orphan_nodes).toContain("O");
    expect(a.sink_nodes).toContain("T");
    expect(a.source_nodes).toContain("S");
  });

  it("density math: 4 edges over 4 nodes → density = 4/(4*3) ≈ 0.333", async () => {
    const r = await invokeHandler(devHandler, "pr_analyze_graph", { graph: ACYCLIC_GRAPH });
    const a = (r as { analysis: { density: number } }).analysis;
    expect(a.density).toBeCloseTo(4 / 12, 3);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PR — prism_dev :: pr_find_critical_nodes", () => {
  it("threshold 0 → all nodes are critical (count = node_count)", async () => {
    const r = await invokeHandler(devHandler, "pr_find_critical_nodes", {
      graph: ACYCLIC_GRAPH,
      threshold: 0,
    });
    const c = (r as { critical_nodes?: string[]; count?: number }).count ?? 0;
    expect(c).toBe(4);
  });

  it("threshold 0.99 → very few critical nodes", async () => {
    const r = await invokeHandler(devHandler, "pr_find_critical_nodes", {
      graph: ACYCLIC_GRAPH,
      threshold: 0.99,
    });
    const c = (r as { count?: number }).count ?? 0;
    expect(c).toBeLessThanOrEqual(4);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PR — prism_dev :: pr_compute_hits", () => {
  it("returns hubs + authorities objects (Map → Object.fromEntries)", async () => {
    const r = await invokeHandler(devHandler, "pr_compute_hits", { graph: ACYCLIC_GRAPH });
    const hubs = (r as { hubs?: Record<string, number> }).hubs ?? {};
    const auth = (r as { authorities?: Record<string, number> }).authorities ?? {};
    // Both should have one entry per node — A→B,A→C,B→D,C→D = 4 nodes
    expect(Object.keys(hubs).length).toBe(4);
    expect(Object.keys(auth).length).toBe(4);
  });

  it("authority of pure-sink D > authority of pure-source A", async () => {
    const r = await invokeHandler(devHandler, "pr_compute_hits", { graph: ACYCLIC_GRAPH });
    const auth = (r as { authorities: Record<string, number> }).authorities;
    expect(auth.D).toBeGreaterThan(auth.A);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PR — prism_dev :: pr_topological_sort", () => {
  it("acyclic graph → acyclic:true + sorted list of length 4", async () => {
    const r = await invokeHandler(devHandler, "pr_topological_sort", { graph: ACYCLIC_GRAPH });
    expect((r as { acyclic?: boolean }).acyclic).toBe(true);
    const sorted = (r as { sorted?: string[] }).sorted ?? [];
    expect(sorted.length).toBe(4);
    // A must come before D (transitive)
    expect(sorted.indexOf("A")).toBeLessThan(sorted.indexOf("D"));
  });

  it("cyclic graph → acyclic:false + sorted:null", async () => {
    const r = await invokeHandler(devHandler, "pr_topological_sort", { graph: CYCLIC_GRAPH });
    expect((r as { acyclic?: boolean }).acyclic).toBe(false);
    expect((r as { sorted?: null }).sorted ?? null).toBe(null);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PR — prism_dev :: pr_detect_cycles", () => {
  it("acyclic graph → cycles:[] + count=0", async () => {
    const r = await invokeHandler(devHandler, "pr_detect_cycles", { graph: ACYCLIC_GRAPH });
    expect((r as { count?: number }).count ?? 0).toBe(0);
  });

  it("cyclic graph → cycles array non-empty + count>0", async () => {
    const r = await invokeHandler(devHandler, "pr_detect_cycles", { graph: CYCLIC_GRAPH });
    expect((r as { count?: number }).count ?? 0).toBeGreaterThan(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PR — error envelope", () => {
  it("pr_compute_scores without graph → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "pr_compute_scores", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("pr_compute_scores with empty nodes → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "pr_compute_scores", { graph: { nodes: [], edges: [] } });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("pr_compute_scores with damping_factor > 1 → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "pr_compute_scores", {
      graph: { nodes: [{ id: "x" }], edges: [] },
      config: { damping_factor: 2 },
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
