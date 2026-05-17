/**
 * WIRE-UNWIRED-MS0/U-WIRE-COMPACT-PLANNER — prism_context:compact_* dispatcher tests
 *
 * Round-trips CompactPlannerEngine through the prism_context MCP tool handler.
 * Hermetic — no I/O, no spawn, all engine methods are pure compute.
 *
 * Pattern mirrors cadDispatcher.cadBridgeStatus.test.ts: a fakeServer captures
 * the registered handler closure so we invoke it directly without standing up
 * a real MCP transport.
 *
 * Coverage (4 actions × happy + failure + adversarial):
 *   - compact_plan: keep/drop math, priority-1 always-keeps, savings calc,
 *                   notes for dropped high-pri, drops stale items
 *   - compact_categorize: keyword heuristic table (8 categories + default)
 *   - compact_estimate_capacity: default avgItemTokens=150, custom override,
 *                                zero budget = zero capacity
 *   - compact_summary: round-trip with compact_plan output; multi-line render
 *
 * @milestone WIRE-UNWIRED-MS0 / U-WIRE-COMPACT-PLANNER
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

// ── compact_plan ─────────────────────────────────────────────────────────────

describe("prism_context:compact_plan — keep/drop math", () => {
  it("keeps everything when total tokens fits target budget exactly", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "compact_plan",
      params: {
        items: [
          { category: "active-task", summary: "wire engine", tokens: 100, priority: 1, age: 1 },
          { category: "decision",    summary: "use prism_context", tokens: 50, priority: 2, age: 5 },
        ],
        targetTokens: 150,
      },
    });
    const body = parsePayload(r);
    expect(body.success).toBe(true);
    const plan = body.data as Record<string, unknown>;
    expect(plan.tokensBefore).toBe(150);
    expect(plan.tokensAfter).toBe(150);
    expect(plan.savings).toBe(0);
    expect((plan.keep as unknown[]).length).toBe(2);
    expect((plan.drop as unknown[])?.length ?? 0).toBe(0);
  });

  it("priority=1 items are kept even when they would overflow the budget", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "compact_plan",
      params: {
        items: [
          { category: "active-task",    summary: "huge active task",  tokens: 5000, priority: 1, age: 1 },
          { category: "user-preference", summary: "huge user pref",    tokens: 5000, priority: 1, age: 1 },
          { category: "tool-result",    summary: "small tool output",  tokens: 100,  priority: 5, age: 60 },
        ],
        targetTokens: 1000, // way under the priority-1 items' combined budget
      },
    });
    const body = parsePayload(r);
    const plan = body.data as Record<string, unknown>;
    // BOTH priority-1 items kept despite blowing the budget; the tool-result is dropped.
    expect((plan.keep as Array<{ priority: number }>).length).toBe(2);
    expect((plan.keep as Array<{ priority: number }>).every((i) => i.priority === 1)).toBe(true);
    expect((plan.drop as Array<{ category: string }>).length).toBe(1);
    expect((plan.drop as Array<{ category: string }>)[0].category).toBe("tool-result");
    // tokensAfter exceeds target because priority-1 was preserved unconditionally.
    expect(plan.tokensAfter).toBe(10000);
  });

  it("savingsPercent reports integer reduction; 0/0 = 0", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "compact_plan",
      params: { items: [], targetTokens: 500 },
    });
    const plan = (parsePayload(r).data as Record<string, unknown>);
    expect(plan.tokensBefore).toBe(0);
    expect(plan.tokensAfter).toBe(0);
    // After slimResponse: 0 survives, so this is concrete.
    expect(plan.savingsPercent).toBe(0);
  });

  it("emits high-pri-dropped warning + handoff hint when priority<=2 items can't fit", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "compact_plan",
      params: {
        items: [
          // 3 priority-2 items, total 1500 tokens; budget only allows ~500
          { category: "decision",      summary: "d1", tokens: 500, priority: 2, age: 10 },
          { category: "error-context", summary: "e1", tokens: 500, priority: 2, age: 20 },
          { category: "decision",      summary: "d2", tokens: 500, priority: 2, age: 30 },
        ],
        targetTokens: 500,
      },
    });
    const plan = parsePayload(r).data as Record<string, unknown>;
    const notes = plan.preservationNotes as string[];
    expect(notes.length).toBeGreaterThanOrEqual(1);
    expect(notes.some((n) => /high-priority/i.test(n))).toBe(true);
    expect(notes.some((n) => /handoff/i.test(n))).toBe(true);
  });

  it("reports stale-drop count when stale items are dropped", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "compact_plan",
      params: {
        items: [
          { category: "active-task", summary: "current", tokens: 500, priority: 1, age: 1 },
          { category: "stale",       summary: "old-1",   tokens: 200, priority: 5, age: 999 },
          { category: "stale",       summary: "old-2",   tokens: 200, priority: 5, age: 998 },
        ],
        targetTokens: 500, // exact fit for active-task; both stale dropped
      },
    });
    const plan = parsePayload(r).data as Record<string, unknown>;
    const notes = plan.preservationNotes as string[];
    expect(notes.some((n) => /stale/i.test(n) && /2/.test(n))).toBe(true);
  });
});

// ── compact_categorize ───────────────────────────────────────────────────────

describe("prism_context:compact_categorize — keyword heuristics", () => {
  it("classifies 'TODO ...' as active-task", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({ action: "compact_categorize", params: { content: "TODO: wire engine" } });
    const data = parsePayload(r).data as { category: string };
    expect(data.category).toBe("active-task");
  });

  it("classifies 'error during build' as error-context", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({ action: "compact_categorize", params: { content: "error during build" } });
    expect((parsePayload(r).data as { category: string }).category).toBe("error-context");
  });

  it("classifies 'user wants X' as user-preference", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({ action: "compact_categorize", params: { content: "user wants compaction" } });
    expect((parsePayload(r).data as { category: string }).category).toBe("user-preference");
  });

  it("classifies content with no recognized keywords as tool-result (default)", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({ action: "compact_categorize", params: { content: "xyzzy plover" } });
    expect((parsePayload(r).data as { category: string }).category).toBe("tool-result");
  });
});

// ── compact_estimate_capacity ────────────────────────────────────────────────

describe("prism_context:compact_estimate_capacity — token math", () => {
  it("default avgItemTokens=150 — 1500/150 = 10 items capacity", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({ action: "compact_estimate_capacity", params: { targetTokens: 1500 } });
    expect((parsePayload(r).data as { capacity: number }).capacity).toBe(10);
  });

  it("custom avgItemTokens=300 — 1500/300 = 5 items capacity", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({ action: "compact_estimate_capacity", params: { targetTokens: 1500, avgItemTokens: 300 } });
    expect((parsePayload(r).data as { capacity: number }).capacity).toBe(5);
  });

  it("zero budget yields zero capacity", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({ action: "compact_estimate_capacity", params: { targetTokens: 0 } });
    expect((parsePayload(r).data as { capacity: number }).capacity).toBe(0);
  });
});

// ── compact_summary (round-trip with compact_plan) ───────────────────────────

describe("prism_context:compact_summary — preservation render", () => {
  it("renders a multi-line summary from a compact_plan output", async () => {
    const handler = await buildPrismContextHandler();
    // Step 1: produce a plan
    const planResp = await handler({
      action: "compact_plan",
      params: {
        items: [
          { category: "active-task", summary: "now", tokens: 500, priority: 1, age: 1 },
          { category: "stale",       summary: "old", tokens: 500, priority: 5, age: 9999 },
        ],
        targetTokens: 500,
      },
    });
    const plan = parsePayload(planResp).data as Record<string, unknown>;
    // Step 2: feed it back through compact_summary
    const sumResp = await handler({ action: "compact_summary", params: { plan } });
    const sum = (parsePayload(sumResp).data as { summary: string }).summary;
    expect(typeof sum).toBe("string");
    expect(sum).toMatch(/Compact:\s+1000\s+→\s+500\s+tokens\s+\(50%\s+reduction\)/);
    expect(sum).toMatch(/Keep:\s+1\s+items\s+\|\s+Drop:\s+1\s+items/);
    expect(sum).toMatch(/Dropped:\s+stale:1/);
  });
});

// ── adversarial / failure modes ──────────────────────────────────────────────

describe("prism_context:compact_* — adversarial", () => {
  it("compact_plan rejects extra keys via .strict() schema (Zod boundary)", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "compact_plan",
      params: { items: [], targetTokens: 100, somethingExtra: true },
    });
    const body = parsePayload(r);
    // .strict() should reject; middleware returns a structured error, not throw.
    expect(body.success).not.toBe(true);
  });

  it("compact_categorize requires content param (Zod boundary)", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({ action: "compact_categorize", params: {} });
    expect(parsePayload(r).success).not.toBe(true);
  });

  it("compact_estimate_capacity rejects negative budget (z.int().nonnegative())", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({ action: "compact_estimate_capacity", params: { targetTokens: -1 } });
    expect(parsePayload(r).success).not.toBe(true);
  });

  it("compact_plan rejects items with priority > 5 (out-of-range)", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "compact_plan",
      params: {
        items: [{ category: "stale", summary: "x", tokens: 10, priority: 99, age: 0 }],
        targetTokens: 100,
      },
    });
    expect(parsePayload(r).success).not.toBe(true);
  });
});
