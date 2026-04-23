/**
 * wedm-gnn-dispatcher.test.ts — E2E round-trip tests through edmDispatcher
 * for the MS-P5-GNN actions (lattice + GAT + neighbor query).
 */

import { describe, it, expect, beforeAll } from "vitest";

let invoke: (action: string, params?: any) => Promise<any>;

class FakeServer {
  private handler: ((args: { action: string; params: any }) => Promise<any>) | null = null;
  tool(_name: string, _desc: string, _schema: any, handler: any) {
    this.handler = handler;
  }
  async call(action: string, params: any = {}) {
    if (!this.handler) throw new Error("dispatcher not registered");
    return this.handler({ action, params });
  }
}

beforeAll(async () => {
  const { registerEdmDispatcher } = await import("../tools/dispatchers/edmDispatcher.js");
  const srv = new FakeServer();
  registerEdmDispatcher(srv as any);
  invoke = async (action, params) => {
    const resp = await srv.call(action, params ?? {});
    if (resp?.content?.[0]?.text) {
      try { return JSON.parse(resp.content[0].text); }
      catch { return resp.content[0].text; }
    }
    return resp;
  };
});

/**
 * The dispatcher wraps results through `slimResponse` (responseSlimmer.ts)
 * which caps arrays at 20 items in NORMAL mode and replaces them with
 * `{_items, _total, _showing}`. Helper to read the original length back.
 */
function readArr(slimmed: any): { length: number; items: any[] } {
  if (Array.isArray(slimmed)) return { length: slimmed.length, items: slimmed };
  if (slimmed && typeof slimmed === "object" && "_items" in slimmed) {
    return { length: Number(slimmed._total ?? slimmed._items.length), items: slimmed._items as any[] };
  }
  return { length: 0, items: [] };
}

describe("MS-P5-GNN dispatcher E2E", () => {
  it("wedm_lattice_build → produces ≥300 nodes and persists graph", async () => {
    const r = await invoke("wedm_lattice_build", {
      includePublished: true,
      includeComposed: true,
    });
    const payload = r?.result ?? r;
    expect(payload.nodeCount).toBeGreaterThanOrEqual(300);
    expect(payload.edgeCount).toBeGreaterThan(0);
    expect(payload.adjacencySparsity).toBeLessThan(0.05);
  });

  it("wedm_lattice_stats → returns counts after build", async () => {
    const r = await invoke("wedm_lattice_stats", {});
    const payload = r?.result ?? r;
    expect(payload.nodes).toBeGreaterThan(0);
    expect(payload.sources).toBeDefined();
    expect(payload.sources.publishedConditions).toBeGreaterThan(0);
  });

  it("wedm_gnn_init then wedm_gnn_attend → returns 64-dim refined embedding", async () => {
    await invoke("wedm_gnn_init", { seed: 42 });
    const center: number[] = new Array(64).fill(0).map((_, i) => Math.sin(i * 0.1));
    const neighbors: number[][] = [
      new Array(64).fill(0).map((_, i) => Math.cos(i * 0.1)),
      new Array(64).fill(0).map((_, i) => Math.sin(i * 0.2)),
    ];
    const r = await invoke("wedm_gnn_attend", { center, neighbors });
    const payload = r?.result ?? r;
    expect(payload.h).toBeDefined();
    const h = readArr(payload.h);
    expect(h.length).toBe(64);
    for (const v of h.items) expect(Number.isFinite(v)).toBe(true);
    const alphas = readArr(payload.alphas);
    expect(alphas.length).toBe(4); // h=4 heads
  });

  it("wedm_gnn_train → reports steps and loss values", async () => {
    await invoke("wedm_gnn_init", { seed: 99 });
    const r = await invoke("wedm_gnn_train", {
      steps: 20, lr: 0.001, sampleSeed: 0xDEAD,
    });
    const payload = r?.result ?? r;
    expect(payload.steps).toBe(20);
    expect(Number.isFinite(payload.startLoss)).toBe(true);
    expect(Number.isFinite(payload.endLoss)).toBe(true);
  });

  it("wedm_gnn_save then wedm_gnn_load → round-trip succeeds", async () => {
    const save = await invoke("wedm_gnn_save", {});
    const savePayload = save?.result ?? save;
    expect(savePayload.savedTo).toMatch(/WEDM_GNN_WEIGHTS\.json$/);

    const load = await invoke("wedm_gnn_load", {});
    const loadPayload = load?.result ?? load;
    expect(loadPayload.loaded).toBe(true);
  });

  it("wedm_graph_query (with embedding) → top-K results with descending similarity", async () => {
    // Use a node's embedding as the query so we know one match is exact.
    const stats = await invoke("wedm_lattice_stats", {});
    const n = (stats?.result ?? stats).nodes;
    expect(n).toBeGreaterThan(0);
    // Get a specific node id by stats — pull the first node via getNode of a
    // known synthetic id pattern (composed material × controller × wire × th × Ra).
    const nodeR = await invoke("wedm_lattice_get_node", {
      id: "N-tool_steel-fanuc-brass-0.250-50-1.60",
    });
    const nodePayload = nodeR?.result ?? nodeR;
    expect(nodePayload.found).toBe(true);
    const embReader = readArr(nodePayload.node.embedding);
    expect(embReader.length).toBe(64);
    // Reconstruct the full embedding by reading the lattice directly via the
    // engine — slimResponse caps the dispatcher copy at 20 elements, but we
    // need the full 64 for the cosine self-match.
    const { wedmLatticeGraphEngine } = await import("../engines/WEDMLatticeGraphEngine.js");
    if (wedmLatticeGraphEngine.snapshot().nodeCount === 0) wedmLatticeGraphEngine.load();
    const fullNode = wedmLatticeGraphEngine.getNode("N-tool_steel-fanuc-brass-0.250-50-1.60");
    expect(fullNode).not.toBeNull();
    const queryEmb = fullNode!.embedding;
    expect(queryEmb.length).toBe(64);

    const r = await invoke("wedm_graph_query", { query: queryEmb, k: 5 });
    const out = readArr(r?.result ?? r);
    expect(out.length).toBeGreaterThanOrEqual(5);
    const items = out.items;
    for (let i = 1; i < items.length; i += 1) {
      expect(items[i].similarity).toBeLessThanOrEqual(items[i - 1].similarity);
    }
    expect(items[0].similarity).toBeCloseTo(1, 4);
  });

  it("wedm_graph_query_cell → returns matching-material results for a cell query", async () => {
    const r = await invoke("wedm_graph_query_cell", {
      mat: "tungsten_carbide",
      mach: "fanuc",
      wire: "brass",
      wireDiameterMm: 0.25,
      thicknessMm: 50,
      raTargetUm: 1.6,
      k: 5,
    });
    const out = readArr(r?.result ?? r);
    expect(out.length).toBeGreaterThanOrEqual(5);
    // Top result should also be tungsten_carbide
    expect(out.items[0].node.mat).toBe("tungsten_carbide");
  });

  it("wedm_gnn_is_stale → reports fresh after recent save", async () => {
    const r = await invoke("wedm_gnn_is_stale", { staleAgeDays: 7, minNewJobs: 50 });
    const out = r?.result ?? r;
    expect(out.stale).toBe(false);
    expect(out.reason).toBe("fresh");
  });
});
