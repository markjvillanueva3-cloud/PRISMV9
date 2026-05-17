/**
 * WIRE-UNWIRED-MS0/U-WIRE-PARALLEL-PLANNER — prism_context:parallel_* dispatcher tests
 *
 * Round-trips ParallelCallPlannerEngine through the prism_context MCP tool handler.
 * Hermetic — engine is pure compute (graph batching + heuristic dep inference).
 *
 * Pattern mirrors contextDispatcher.compactPlanner.test.ts: fakeServer captures
 * the registered handler closure so we invoke it directly without an MCP transport.
 *
 * Coverage (3 actions × happy + dependency-graph + adversarial):
 *   - parallel_plan: empty input, all-independent (1 batch), chain dep (N batches),
 *                    cycle-break (force first remaining), savedRoundTrips math
 *   - parallel_infer_dependencies: Edit-after-Read same file, Bash sequencing,
 *                                  unrelated tools stay independent
 *   - parallel_can_parallel: all reads distinct → true; reads same file → false;
 *                            includes Edit → false
 *
 * @milestone WIRE-UNWIRED-MS0 / U-WIRE-PARALLEL-PLANNER
 */
import { describe, it, expect } from "vitest";

type RegisteredTool = {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: string; text: string }> }>;
};

function makeFakeServer(): { server: { tool: (...args: unknown[]) => void }; tools: RegisteredTool[] } {
  const tools: RegisteredTool[] = [];
  const server = {
    tool: (...args: unknown[]) => {
      tools.push({
        name: args[0] as string,
        description: args[1] as string,
        schema: args[2] as Record<string, unknown>,
        handler: args[3] as RegisteredTool["handler"],
      });
    },
  };
  return { server, tools };
}

async function buildPrismContextHandler(): Promise<RegisteredTool["handler"]> {
  const { server, tools } = makeFakeServer();
  const { registerContextDispatcher } = await import("../tools/dispatchers/contextDispatcher.js");
  registerContextDispatcher(server as never);
  const ctx = tools.find((t) => t.name === "prism_context");
  if (!ctx) throw new Error("registerContextDispatcher did not register a tool named 'prism_context'");
  return ctx.handler;
}

function parsePayload(response: { content: Array<{ type: string; text: string }> }): Record<string, unknown> {
  const text = response.content?.[0]?.text ?? "";
  return JSON.parse(text);
}

// ── parallel_plan ────────────────────────────────────────────────────────────

describe("prism_context:parallel_plan — batching", () => {
  it("empty input → 0/0/0/0 (slimResponse-safe shape)", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({ action: "parallel_plan", params: { calls: [] } });
    const data = parsePayload(r).data as Record<string, unknown>;
    expect(data.totalCalls).toBe(0);
    expect(data.totalBatches).toBe(0);
    expect(data.parallelizable).toBe(0);
    expect(data.savedRoundTrips).toBe(0);
  });

  it("3 independent calls → 1 batch with canParallel=true, savedRoundTrips=2", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "parallel_plan",
      params: {
        calls: [
          { id: "a", tool: "Read", params: { file_path: "/x" } },
          { id: "b", tool: "Read", params: { file_path: "/y" } },
          { id: "c", tool: "Read", params: { file_path: "/z" } },
        ],
      },
    });
    const data = parsePayload(r).data as Record<string, unknown>;
    expect(data.totalCalls).toBe(3);
    expect(data.totalBatches).toBe(1);
    expect(data.parallelizable).toBe(3);
    expect(data.savedRoundTrips).toBe(2); // 3 calls - 1 batch = 2 round trips saved
    const batches = data.batches as Array<{ canParallel: boolean; calls: unknown[] }>;
    expect(batches[0].canParallel).toBe(true);
    expect(batches[0].calls.length).toBe(3);
  });

  it("3-call chain (a→b→c) → 3 batches, savedRoundTrips=0", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "parallel_plan",
      params: {
        calls: [
          { id: "a", tool: "Read",  params: { file_path: "/x" } },
          { id: "b", tool: "Edit",  params: { file_path: "/x" }, dependsOn: ["a"] },
          { id: "c", tool: "Write", params: { file_path: "/x" }, dependsOn: ["b"] },
        ],
      },
    });
    const data = parsePayload(r).data as Record<string, unknown>;
    expect(data.totalBatches).toBe(3);
    expect(data.savedRoundTrips).toBe(0); // 3 calls - 3 batches = 0
    const batches = data.batches as Array<{ calls: Array<{ id: string }>; canParallel: boolean }>;
    expect(batches[0].calls[0].id).toBe("a");
    expect(batches[1].calls[0].id).toBe("b");
    expect(batches[2].calls[0].id).toBe("c");
    // No batch has >1 call → none can parallel
    expect(batches.every((b) => !b.canParallel)).toBe(true);
  });

  it("mixed (2 indep + 1 dep) → 2 batches, parallelizable=2 only in batch 0", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "parallel_plan",
      params: {
        calls: [
          { id: "a", tool: "Read", params: { file_path: "/x" } },
          { id: "b", tool: "Read", params: { file_path: "/y" } },
          { id: "c", tool: "Edit", params: { file_path: "/x" }, dependsOn: ["a"] },
        ],
      },
    });
    const data = parsePayload(r).data as Record<string, unknown>;
    expect(data.totalBatches).toBe(2);
    expect(data.parallelizable).toBe(2); // only batch 0 (a,b) can parallel
    expect(data.savedRoundTrips).toBe(1); // 3 - 2 = 1
  });

  it("circular/missing dependency → forces first remaining (engine recovers)", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "parallel_plan",
      params: {
        // 'a' depends on the non-existent 'z' → ready=[] → engine forces a into batch 0
        calls: [{ id: "a", tool: "Read", params: { file_path: "/x" }, dependsOn: ["z"] }],
      },
    });
    const data = parsePayload(r).data as Record<string, unknown>;
    expect(data.totalCalls).toBe(1);
    expect(data.totalBatches).toBe(1);
    const batches = data.batches as Array<{ calls: Array<{ id: string }> }>;
    expect(batches[0].calls[0].id).toBe("a");
  });
});

// ── parallel_infer_dependencies ──────────────────────────────────────────────

describe("prism_context:parallel_infer_dependencies — heuristics", () => {
  it("Edit after Read same file → Edit dependsOn=[Read.id]", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "parallel_infer_dependencies",
      params: {
        calls: [
          { tool: "Read", params: { file_path: "/x" } },
          { tool: "Edit", params: { file_path: "/x" } },
        ],
      },
    });
    const planned = (parsePayload(r).data as { planned: Array<{ id: string; tool: string; dependsOn: string[] }> }).planned;
    expect(planned.length).toBe(2);
    expect(planned[0].id).toBe("call-0");
    expect(planned[1].id).toBe("call-1");
    expect(planned[1].dependsOn).toEqual(["call-0"]);
    // The Read at index 0 has no dependencies — slimResponse may strip an empty
    // array, so the canonical assertion is "Read has no dependency on call-1".
    expect((planned[0].dependsOn ?? []).includes("call-1")).toBe(false);
  });

  it("Edit on /a after Read of /b → no dependency (different files)", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "parallel_infer_dependencies",
      params: {
        calls: [
          { tool: "Read", params: { file_path: "/b" } },
          { tool: "Edit", params: { file_path: "/a" } },
        ],
      },
    });
    const planned = (parsePayload(r).data as { planned: Array<{ dependsOn?: string[] }> }).planned;
    expect((planned[1].dependsOn ?? []).length).toBe(0);
  });

  it("sequential Bash with cd/mkdir/git → dependsOn earlier Bash", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "parallel_infer_dependencies",
      params: {
        calls: [
          { tool: "Bash", params: { command: "cd /tmp" } },
          { tool: "Bash", params: { command: "ls" } },
        ],
      },
    });
    const planned = (parsePayload(r).data as { planned: Array<{ dependsOn?: string[] }> }).planned;
    expect(planned[1].dependsOn).toEqual(["call-0"]);
  });
});

// ── parallel_can_parallel ────────────────────────────────────────────────────

describe("prism_context:parallel_can_parallel — quick check", () => {
  it("3 reads on distinct files → true", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "parallel_can_parallel",
      params: {
        calls: [
          { tool: "Read", params: { file_path: "/x" } },
          { tool: "Read", params: { file_path: "/y" } },
          { tool: "Grep", params: { pattern: "z" } },
        ],
      },
    });
    expect((parsePayload(r).data as { canParallel: boolean }).canParallel).toBe(true);
  });

  it("2 reads on the SAME file → false (paths not distinct)", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "parallel_can_parallel",
      params: {
        calls: [
          { tool: "Read", params: { file_path: "/x" } },
          { tool: "Read", params: { file_path: "/x" } },
        ],
      },
    });
    expect((parsePayload(r).data as { canParallel: boolean }).canParallel).toBe(false);
  });

  it("mix containing Edit → false (Edit is not read-only)", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "parallel_can_parallel",
      params: {
        calls: [
          { tool: "Read", params: { file_path: "/x" } },
          { tool: "Edit", params: { file_path: "/y" } },
        ],
      },
    });
    expect((parsePayload(r).data as { canParallel: boolean }).canParallel).toBe(false);
  });
});

// ── adversarial / failure modes ──────────────────────────────────────────────

describe("prism_context:parallel_* — adversarial", () => {
  it("parallel_plan rejects extra top-level keys via .strict()", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "parallel_plan",
      params: { calls: [], extra: 1 },
    });
    expect(parsePayload(r).success).not.toBe(true);
  });

  it("parallel_infer_dependencies rejects items with id field (wrong shape)", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "parallel_infer_dependencies",
      params: {
        // infer takes { tool, params } only — id is rejected by .strict() on call objects
        calls: [{ id: "extra", tool: "Read", params: { file_path: "/x" } }],
      },
    });
    expect(parsePayload(r).success).not.toBe(true);
  });

  it("parallel_plan rejects calls missing required id (Zod boundary)", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "parallel_plan",
      params: {
        calls: [{ tool: "Read", params: { file_path: "/x" } }],
      },
    });
    expect(parsePayload(r).success).not.toBe(true);
  });
});
