/**
 * devDispatcher × OutputBudgetEngine wire — orphan-rescue (OBSIDIAN-PRISM-OS-MS0).
 *
 * NOT to be confused with OutputBudgetEnforcerEngine (output_budget_* actions).
 * This is a pure-functional 8-method trim/filter/budget-estimate utility.
 * Existing engine tests at __tests__/output-budget-enforcer-engine.test.ts
 * cover the enforcer; this wire surfaces the orphan OutputBudgetEngine.
 *
 * @milestone OBSIDIAN-PRISM-OS-MS0
 * @unit U-ORPHAN-RESCUE-BUDGET-TRIM
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
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

describe("devDispatcher × OutputBudgetEngine wire (U-ORPHAN-RESCUE-BUDGET-TRIM)", () => {
  // ── estimate_tokens ────────────────────────────────────────────────────
  it("estimate_tokens — 'hello' → 2 tokens (ceil(5/4))", async () => {
    const r = await call(server, "budget_trim_estimate_tokens", { data: "hello" });
    expect(r.ok).toBe(true);
    expect(r.data.tokens).toBe(2);
  });

  it("estimate_tokens — object serializes via JSON then divides by 4", async () => {
    const r = await call(server, "budget_trim_estimate_tokens", { data: { a: 1 } });
    // JSON.stringify({a:1}) = "{\"a\":1}" length 7 → ceil(7/4) = 2
    expect(r.data.tokens).toBe(2);
  });

  // ── exceeds_budget ─────────────────────────────────────────────────────
  it("exceeds_budget — over budget → true", async () => {
    const r = await call(server, "budget_trim_exceeds_budget", {
      data: "x".repeat(1000), max_tokens: 100,
    });
    // 1000 chars / 4 = 250 tokens > 100
    expect(r.data.exceeds).toBe(true);
  });

  it("exceeds_budget — under budget → false", async () => {
    const r = await call(server, "budget_trim_exceeds_budget", {
      data: "small", max_tokens: 100,
    });
    expect(r.data.exceeds).toBe(false);
  });

  // ── filter_fields (allowlist) ──────────────────────────────────────────
  it("filter_fields — keeps only the named fields", async () => {
    const r = await call(server, "budget_trim_filter_fields", {
      obj: { a: 1, b: 2, c: 3, d: 4 },
      keep: ["a", "c"],
    });
    expect(r.data.filtered).toEqual({ a: 1, c: 3 });
  });

  it("filter_fields — missing keys are silently dropped", async () => {
    const r = await call(server, "budget_trim_filter_fields", {
      obj: { a: 1 },
      keep: ["a", "missing"],
    });
    expect(r.data.filtered).toEqual({ a: 1 });
  });

  // ── drop_fields (denylist) ─────────────────────────────────────────────
  it("drop_fields — drops the named fields, keeps the rest", async () => {
    const r = await call(server, "budget_trim_drop_fields", {
      obj: { a: 1, b: 2, c: 3 },
      drop: ["b"],
    });
    expect(r.data.filtered).toEqual({ a: 1, c: 3 });
  });

  // ── summarize_array ────────────────────────────────────────────────────
  it("summarize_array — array of 5 with keep=3 → returns full (length 5 <= 2*3=6)", async () => {
    const r = await call(server, "budget_trim_summarize_array", {
      arr: [1, 2, 3, 4, 5],
    });
    const s = r.data.summary as Record<string, unknown>;
    expect((s.items as number[]).length).toBe(5);
    expect(s.total).toBe(5);
    expect(s.showing).toBe("all 5");
  });

  it("summarize_array — array of 10 with keep=3 → first 3 + last 3 = 6 items", async () => {
    const r = await call(server, "budget_trim_summarize_array", {
      arr: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      keep: 3,
    });
    const s = r.data.summary as Record<string, unknown>;
    expect((s.items as number[])).toEqual([1, 2, 3, 8, 9, 10]);
    expect(s.total).toBe(10);
    expect(s.showing).toBe("first 3 + last 3 of 10");
  });

  // ── preset ─────────────────────────────────────────────────────────────
  it("preset — compact returns {maxChars: 1500, maxArrayItems: 3, maxDepth: 2}", async () => {
    const r = await call(server, "budget_trim_preset", { name: "compact" });
    expect(r.data.preset).toEqual({ maxChars: 1500, maxArrayItems: 3, maxDepth: 2 });
  });

  it("preset — normal returns {5000, 10, 4}", async () => {
    const r = await call(server, "budget_trim_preset", { name: "normal" });
    expect(r.data.preset).toEqual({ maxChars: 5000, maxArrayItems: 10, maxDepth: 4 });
  });

  it("preset — verbose returns {20000, 50, 8}", async () => {
    const r = await call(server, "budget_trim_preset", { name: "verbose" });
    expect(r.data.preset).toEqual({ maxChars: 20000, maxArrayItems: 50, maxDepth: 8 });
  });

  // ── enforce ────────────────────────────────────────────────────────────
  it("enforce — large array with maxArrayItems=3 truncates with marker", async () => {
    const r = await call(server, "budget_trim_enforce", {
      data: [1, 2, 3, 4, 5, 6, 7, 8],
      options: { maxArrayItems: 3 },
    });
    const trimmed = r.data.trimmed as Array<unknown>;
    // First 3 items + truncation marker entry
    expect(trimmed.length).toBe(4);
    expect(trimmed.slice(0, 3)).toEqual([1, 2, 3]);
    expect(String(trimmed[3])).toContain("+5 more");
  });

  it("enforce — deep object beyond maxDepth collapses to '[Object(N keys)]'", async () => {
    const r = await call(server, "budget_trim_enforce", {
      data: { a: { b: { c: { d: { e: "deep" } } } } },
      options: { maxDepth: 2 },
    });
    const t = r.data.trimmed as Record<string, unknown>;
    // At depth 2, the value at a.b becomes the depth-limit marker
    expect(JSON.stringify(t)).toContain("Object");
  });

  // ── schema validation ────────────────────────────────────────────────
  it("schema rejects negative max_tokens", async () => {
    const r = await call(server, "budget_trim_exceeds_budget", {
      data: "x", max_tokens: -1,
    });
    expect(r.ok).toBe(false);
  });

  it("schema rejects invalid preset name", async () => {
    const r = await call(server, "budget_trim_preset", { name: "invalid" });
    expect(r.ok).toBe(false);
  });

  // ── all 7 actions accepted ───────────────────────────────────────────
  it("all 7 budget_trim_* actions are accepted by the registered dispatcher", async () => {
    const actions: Array<[string, Record<string, unknown>]> = [
      ["budget_trim_enforce",          { data: { a: 1 } }],
      ["budget_trim_estimate_tokens",  { data: "hello" }],
      ["budget_trim_exceeds_budget",   { data: "x", max_tokens: 10 }],
      ["budget_trim_filter_fields",    { obj: { a: 1 }, keep: ["a"] }],
      ["budget_trim_drop_fields",      { obj: { a: 1 }, drop: ["a"] }],
      ["budget_trim_summarize_array",  { arr: [1, 2, 3] }],
      ["budget_trim_preset",           { name: "normal" }],
    ];
    for (const [act, p] of actions) {
      const r = await call(server, act, p);
      expect(r.ok, `${act} should succeed`).toBe(true);
      expect(r.data.success).toBe(true);
    }
  });
});
