/**
 * devDispatcher × ConversationBudgetEngine wire — orphan-rescue (OBSIDIAN-PRISM-OS-MS0).
 *
 * Singleton stateful tracker; tests reset before each case for hermeticity.
 * Default budget = 150,000 tokens; alerts at 50/70/90%.
 *
 * @milestone OBSIDIAN-PRISM-OS-MS0
 * @unit U-ORPHAN-RESCUE-CONV-BUDGET
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

beforeEach(async () => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
  await call(server, "conv_budget_reset"); // singleton needs reset for hermeticity
});

describe("devDispatcher × ConversationBudgetEngine wire (U-ORPHAN-RESCUE-CONV-BUDGET)", () => {
  it("record + status — single call accumulates input + output tokens", async () => {
    await call(server, "conv_budget_record", { tool: "Read", input_tokens: 100, output_tokens: 200 });
    const r = await call(server, "conv_budget_status");
    const s = r.data.status as Record<string, number>;
    expect(s.toolCalls).toBe(1);
    expect(s.inputTokens).toBe(100);
    expect(s.outputTokens).toBe(200);
    expect(s.totalTokens).toBe(300);
    expect(s.remaining).toBe(150_000 - 300);
  });

  it("record — largestCall tracks tool + total accurately", async () => {
    await call(server, "conv_budget_record", { tool: "Read", input_tokens: 100, output_tokens: 100 });
    await call(server, "conv_budget_record", { tool: "Bash", input_tokens: 500, output_tokens: 1000 });
    const r = await call(server, "conv_budget_status");
    const s = r.data.status as Record<string, unknown>;
    expect((s.largestCall as Record<string, unknown>).tool).toBe("Bash");
    expect((s.largestCall as Record<string, unknown>).tokens).toBe(1500);
  });

  it("check — under 50% returns null (no alert)", async () => {
    await call(server, "conv_budget_record", { tool: "Read", input_tokens: 1000, output_tokens: 1000 });
    const r = await call(server, "conv_budget_check");
    expect(r.data.alert === null || r.data.alert === undefined).toBe(true);
  });

  it("check — 50% triggers 'info' alert", async () => {
    // 50% of 150K = 75K tokens
    await call(server, "conv_budget_record", { tool: "Bash", input_tokens: 40000, output_tokens: 35000 });
    const r = await call(server, "conv_budget_check");
    const a = r.data.alert as Record<string, unknown>;
    expect(a.level).toBe("info");
    expect(a.usedPercent).toBe(50);
  });

  it("check — 70% triggers 'warn'", async () => {
    await call(server, "conv_budget_record", { tool: "Read", input_tokens: 50000, output_tokens: 55000 });
    const a = (await call(server, "conv_budget_check")).data.alert as Record<string, unknown>;
    expect(a.level).toBe("warn");
    expect(a.usedPercent).toBe(70);
  });

  it("check — 90% triggers 'critical'", async () => {
    await call(server, "conv_budget_record", { tool: "Edit", input_tokens: 60000, output_tokens: 75000 });
    const a = (await call(server, "conv_budget_check")).data.alert as Record<string, unknown>;
    expect(a.level).toBe("critical");
    expect(a.usedPercent).toBe(90);
  });

  it("top_consumers — sorted descending by total tokens", async () => {
    await call(server, "conv_budget_record", { tool: "Bash",  input_tokens: 1000, output_tokens: 9000 });
    await call(server, "conv_budget_record", { tool: "Read",  input_tokens: 100,  output_tokens: 100 });
    await call(server, "conv_budget_record", { tool: "Grep",  input_tokens: 500,  output_tokens: 500 });
    const r = await call(server, "conv_budget_top_consumers", { n: 3 });
    const top = r.data.top as Array<Record<string, unknown>>;
    expect(top.length).toBe(3);
    expect(top[0].tool).toBe("Bash");
    expect(top[0].tokens).toBe(10_000);
    expect(top[1].tool).toBe("Grep");
    expect(top[2].tool).toBe("Read");
  });

  it("top_consumers — empty when no usage yet", async () => {
    const r = await call(server, "conv_budget_top_consumers");
    const top = (r.data.top ?? []) as Array<unknown>;
    expect(top.length).toBe(0);
  });

  it("status_line — compact summary string with all key metrics", async () => {
    await call(server, "conv_budget_record", { tool: "Read", input_tokens: 100, output_tokens: 200 });
    const r = await call(server, "conv_budget_status_line");
    const line = r.data.line as string;
    expect(line).toContain("300/150000");
    expect(line).toContain("Calls: 1");
    expect(line).toContain("Read");
  });

  it("estimate_remaining — returns operation counts per remaining tokens", async () => {
    await call(server, "conv_budget_record", { tool: "Read", input_tokens: 50000, output_tokens: 0 });
    // Remaining = 100,000 tokens
    const r = await call(server, "conv_budget_estimate_remaining");
    const e = r.data.estimate as Record<string, number>;
    // reads = floor(100000/2000) = 50
    expect(e.reads).toBe(50);
    // greps = floor(100000/500) = 200
    expect(e.greps).toBe(200);
    // edits = floor(100000/300) = 333
    expect(e.edits).toBe(333);
    // dispatchers = floor(100000/1000) = 100
    expect(e.dispatchers).toBe(100);
  });

  it("reset — clears all state back to empty", async () => {
    await call(server, "conv_budget_record", { tool: "Read", input_tokens: 100, output_tokens: 100 });
    await call(server, "conv_budget_reset");
    const r = await call(server, "conv_budget_status");
    const s = r.data.status as Record<string, number>;
    expect(s.toolCalls).toBe(0);
    expect(s.totalTokens).toBe(0);
  });

  // ── schema validation ────────────────────────────────────────────────
  it("schema rejects negative input_tokens", async () => {
    const r = await call(server, "conv_budget_record", { tool: "x", input_tokens: -1, output_tokens: 0 });
    expect(r.ok).toBe(false);
  });

  it("schema rejects empty tool name", async () => {
    const r = await call(server, "conv_budget_record", { tool: "", input_tokens: 0, output_tokens: 0 });
    expect(r.ok).toBe(false);
  });

  // ── all 7 actions accepted ───────────────────────────────────────────
  it("all 7 conv_budget_* actions are accepted by the registered dispatcher", async () => {
    const actions: Array<[string, Record<string, unknown>]> = [
      ["conv_budget_record",             { tool: "Read", input_tokens: 1, output_tokens: 1 }],
      ["conv_budget_status",             {}],
      ["conv_budget_check",              {}],
      ["conv_budget_top_consumers",      {}],
      ["conv_budget_status_line",        {}],
      ["conv_budget_estimate_remaining", {}],
      ["conv_budget_reset",              {}],
    ];
    for (const [act, p] of actions) {
      const r = await call(server, act, p);
      expect(r.ok, `${act} should succeed`).toBe(true);
      expect(r.data.success).toBe(true);
    }
  });
});
