/**
 * devDispatcher × CircularDependencyEngine wire
 * ([WIRING]/U-WIRE-DEPENDENCY-CYCLE-ANALYZE, slot:romeo).
 *
 * CircularDependencyEngine (Tarjan's SCC + Kahn's topo-sort) was BUILT but UNWIRED —
 * verified GENUINE_ORPHAN via scripts/classify-engine-reachability.mjs. This wires
 * `dependency_cycle_analyze` into prism_dev: input graph → reset/build/analyze → CycleAnalysis.
 *
 * Round-trip THROUGH the registered dispatcher (not a direct engine import).
 * ANTI-STUB: the verdicts are algebraic invariants of the supplied graph — a no-op case
 * returning {hasCycles:false} passes the DAG case but FAILS the cycle + edge-only-node cases.
 *
 * Reference graphs (Tarjan invariants):
 *   3-cycle  A→B→C→A : hasCycles=true,  1 SCC of size 3, topologicalOrder=null
 *   DAG      A→B→C   : hasCycles=false, 3 SCCs of size 1, topologicalOrder is a valid order
 *   edge-only B in A⇄B: hasCycles=true — proves edge endpoints are addNode'd (the correctness fix;
 *                       without it B is dropped from nodes.keys() and the cycle reads as acyclic).
 *
 * @milestone BLACKWELL-DB-GEN-MS0
 * @unit U-WIRE-DEPENDENCY-CYCLE-ANALYZE
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as { content?: { type: string; text: string }[] };
  if (!raw.content) return { ok: false, data: raw as unknown as Record<string, unknown> };
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(raw.content[0]!.text); } catch { return { ok: false, data: { rawText: raw.content[0]!.text } }; }
  // A successful CycleAnalysis always carries a `stats` object; an error envelope does not.
  if (!parsed.stats || typeof parsed.stats !== "object") return { ok: false, data: parsed };
  return { ok: true, data: parsed };
}

const NODE = (id: string) => ({ id, type: "engine" as const });

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

describe("devDispatcher × CircularDependencyEngine wire (U-WIRE-DEPENDENCY-CYCLE-ANALYZE)", () => {
  it("detects a 3-cycle A→B→C→A — hasCycles + 1 SCC of size 3 (anti-stub Tarjan invariant)", async () => {
    const r = await call(server, "dependency_cycle_analyze", {
      nodes: [NODE("A"), NODE("B"), NODE("C")],
      edges: [{ from: "A", to: "B" }, { from: "B", to: "C" }, { from: "C", to: "A" }],
    });
    expect(r.ok).toBe(true);
    expect(r.data.hasCycles).toBe(true);
    const stats = r.data.stats as Record<string, number>;
    expect(stats.totalNodes).toBe(3);
    expect(stats.totalEdges).toBe(3);
    expect(stats.largestSCCSize).toBe(3); // all three are one strongly-connected component
    // the cycle's SCC must contain exactly {A,B,C}
    const cycles = (r.data.cycles ?? []) as Array<{ nodes: string[]; isCycle: boolean }>;
    expect(cycles.length).toBe(1);
    expect([...cycles[0]!.nodes].sort()).toEqual(["A", "B", "C"]);
    // topological order is impossible when a cycle exists (slimmer strips the null scalar)
    expect(r.data.topologicalOrder == null).toBe(true);
  });

  it("a DAG A→B→C is acyclic and yields a valid topological order", async () => {
    const r = await call(server, "dependency_cycle_analyze", {
      nodes: [NODE("A"), NODE("B"), NODE("C")],
      edges: [{ from: "A", to: "B" }, { from: "B", to: "C" }],
    });
    expect(r.ok).toBe(true);
    expect(r.data.hasCycles).toBe(false);
    const stats = r.data.stats as Record<string, number>;
    expect(stats.numSCCs).toBe(3);     // three singleton SCCs
    expect(stats.largestSCCSize).toBe(1);
    expect((r.data.cycles ?? []) as unknown[]).toHaveLength(0); // slimmer strips empty arrays
    const order = r.data.topologicalOrder as string[];
    expect(order).toHaveLength(3);
    // A must precede B must precede C in any valid order
    expect(order.indexOf("A")).toBeLessThan(order.indexOf("B"));
    expect(order.indexOf("B")).toBeLessThan(order.indexOf("C"));
  });

  it("CORRECTNESS FIX: an edge-only node (not in `nodes`) is still analyzed for cycles", async () => {
    // B appears only in edges. addEdge does NOT populate the nodes map, but the wire addNode's
    // every edge endpoint — so A⇄B is detected as a cycle. Remove that fix and this goes acyclic.
    const r = await call(server, "dependency_cycle_analyze", {
      nodes: [NODE("A")],
      edges: [{ from: "A", to: "B" }, { from: "B", to: "A" }],
    });
    expect(r.ok).toBe(true);
    expect(r.data.hasCycles).toBe(true);
    const stats = r.data.stats as Record<string, number>;
    expect(stats.totalNodes).toBe(2);        // A + the edge-only B
    expect(stats.largestSCCSize).toBe(2);
  });

  it("critical nodes surface in criticalPaths when inside a cycle", async () => {
    const r = await call(server, "dependency_cycle_analyze", {
      nodes: [NODE("A"), NODE("B"), NODE("C")],
      edges: [{ from: "A", to: "B" }, { from: "B", to: "C" }, { from: "C", to: "A" }],
      critical: ["B"],
    });
    expect(r.ok).toBe(true);
    const critical = (r.data.criticalPaths ?? []) as string[][];
    expect(critical.length).toBeGreaterThanOrEqual(1);
    expect(critical.some((p) => p.includes("B"))).toBe(true);
  });

  it("rejects an empty node list (schema requires >=1 node)", async () => {
    const r = await call(server, "dependency_cycle_analyze", { nodes: [] });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data).toLowerCase()).toMatch(/node|invalid params|required|at least|min/);
  });

  it("dependency_cycle_analyze action is accepted by the registered dispatcher (in z.enum + has a case)", async () => {
    const r = await call(server, "dependency_cycle_analyze", { nodes: [NODE("A")] });
    expect(JSON.stringify(r.data).toLowerCase()).not.toMatch(/unknown action|no such action/);
  });
});
