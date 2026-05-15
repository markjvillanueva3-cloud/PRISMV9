/**
 * devDispatcher × ToolCallBatchEngine wire — orphan-rescue (OBSIDIAN-PRISM-OS-MS0).
 *
 * Singleton history-based batching advisor. 5 detect-patterns:
 *   multiple-reads (2+ Reads → suggest parallel batch, ~200 tokens)
 *   grep-then-read (Grep then Read of same path, ~1500 tokens)
 *   multiple-globs (2+ Globs same path → suggest brace expansion, ~300 tokens)
 *   read-then-grep-same (Read then Grep same file, ~500 tokens)
 *   sequential-independent-reads (parallel-safe pairs within 2s, ~300 tokens)
 *
 * @milestone OBSIDIAN-PRISM-OS-MS0
 * @unit U-ORPHAN-RESCUE-TCB
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
  await call(server, "tcb_reset");
});

describe("devDispatcher × ToolCallBatchEngine wire (U-ORPHAN-RESCUE-TCB)", () => {
  // ── pattern: multiple-reads ─────────────────────────────────────────────
  it("multiple-reads — 3 sequential Reads triggers parallel-batch suggestion", async () => {
    await call(server, "tcb_record", { tool: "Read", tool_params: { file_path: "/a.ts" } });
    await call(server, "tcb_record", { tool: "Read", tool_params: { file_path: "/b.ts" } });
    await call(server, "tcb_record", { tool: "Read", tool_params: { file_path: "/c.ts" } });
    const r = await call(server, "tcb_analyze");
    const opps = r.data.opportunities as Array<Record<string, unknown>>;
    const multipleReads = opps.find(o => String(o.reason).startsWith("multiple-reads"));
    expect(multipleReads, "multiple-reads pattern must trigger on 3+ Reads").not.toBe(undefined);
    expect((multipleReads!.calls as Array<unknown>).length).toBe(3);
    expect(multipleReads!.estimatedSaving).toBe(200);
  });

  // ── pattern: grep-then-read ─────────────────────────────────────────────
  it("grep-then-read — Grep + Read of same path triggers high-saving alert", async () => {
    await call(server, "tcb_record", { tool: "Grep", tool_params: { path: "/src/engines", pattern: "Engine" } });
    await call(server, "tcb_record", { tool: "Read", tool_params: { file_path: "/src/engines/FooEngine.ts" } });
    const r = await call(server, "tcb_analyze");
    const opps = r.data.opportunities as Array<Record<string, unknown>>;
    const grepThen = opps.find(o => String(o.reason).startsWith("grep-then-read"));
    expect(grepThen, "grep-then-read must trigger when Read path contains Grep path").not.toBe(undefined);
    expect(grepThen!.estimatedSaving).toBe(1500);
    expect((grepThen!.calls as Array<unknown>).length).toBe(2);
  });

  // ── pattern: multiple-globs (same path) ─────────────────────────────────
  it("multiple-globs — 2 Globs with same path triggers brace-expansion suggestion", async () => {
    await call(server, "tcb_record", { tool: "Glob", tool_params: { path: "/src", glob: "*.ts" } });
    await call(server, "tcb_record", { tool: "Glob", tool_params: { path: "/src", glob: "*.tsx" } });
    const r = await call(server, "tcb_analyze");
    const opps = r.data.opportunities as Array<Record<string, unknown>>;
    const multipleGlobs = opps.find(o => String(o.reason).startsWith("multiple-globs"));
    expect(multipleGlobs, "multiple-globs must trigger on 2+ Globs same path").not.toBe(undefined);
    expect(multipleGlobs!.estimatedSaving).toBe(300);
  });

  // ── pattern does NOT fire for different paths ───────────────────────────
  it("multiple-globs — different paths do NOT trigger the pattern", async () => {
    await call(server, "tcb_record", { tool: "Glob", tool_params: { path: "/src" } });
    await call(server, "tcb_record", { tool: "Glob", tool_params: { path: "/tests" } });
    const r = await call(server, "tcb_analyze");
    const opps = r.data.opportunities as Array<Record<string, unknown>>;
    const found = opps.find(o => String(o.reason).startsWith("multiple-globs"));
    expect(found).toBe(undefined);
  });

  // ── pattern: read-then-grep-same ────────────────────────────────────────
  it("read-then-grep-same — same file Read+Grep triggers reuse suggestion", async () => {
    await call(server, "tcb_record", { tool: "Read", tool_params: { file_path: "/x.ts" } });
    await call(server, "tcb_record", { tool: "Grep", tool_params: { path: "/x.ts" } });
    const r = await call(server, "tcb_analyze");
    const opps = r.data.opportunities as Array<Record<string, unknown>>;
    const same = opps.find(o => String(o.reason).startsWith("read-then-grep-same"));
    expect(same, "read-then-grep-same must trigger when paths match exactly").not.toBe(undefined);
    expect(same!.estimatedSaving).toBe(500);
  });

  // ── can_batch — parallel-safe with active parallel-safe history ──────────
  it("can_batch — Read tool is batchable when there's a recent parallel-safe call", async () => {
    await call(server, "tcb_record", { tool: "Grep" });
    const r = await call(server, "tcb_can_batch", { tool: "Read" });
    const check = r.data.check as Record<string, unknown>;
    expect(check.batchable).toBe(true);
    expect((check.with as string[])).toContain("Grep");
  });

  it("can_batch — Edit (sequential) returns batchable=false regardless of history", async () => {
    await call(server, "tcb_record", { tool: "Read" });
    const r = await call(server, "tcb_can_batch", { tool: "Edit" });
    const check = r.data.check as Record<string, unknown>;
    expect(check.batchable).toBe(false);
  });

  // ── stats ────────────────────────────────────────────────────────────────
  it("stats — counts byTool and reports parallel-safe ratio", async () => {
    await call(server, "tcb_record", { tool: "Read" });
    await call(server, "tcb_record", { tool: "Read" });
    await call(server, "tcb_record", { tool: "Edit" });
    const r = await call(server, "tcb_stats");
    const s = r.data.stats as Record<string, unknown>;
    expect(s.total).toBe(3);
    const byTool = s.byTool as Record<string, number>;
    expect(byTool.Read).toBe(2);
    expect(byTool.Edit).toBe(1);
    // Read is parallel-safe, Edit is sequential — 2 of 3 parallel-safe = 67%
    expect(s.parallelRatio).toBe(67);
  });

  // ── summary ──────────────────────────────────────────────────────────────
  it("summary — empty history returns 'No batching opportunities'", async () => {
    const r = await call(server, "tcb_summary");
    expect(r.data.summary).toBe("No batching opportunities in recent calls.");
  });

  it("summary — aggregates opportunities + total tokens saveable", async () => {
    await call(server, "tcb_record", { tool: "Read", tool_params: { file_path: "/a.ts" } });
    await call(server, "tcb_record", { tool: "Read", tool_params: { file_path: "/b.ts" } });
    const r = await call(server, "tcb_summary");
    const summary = r.data.summary as string;
    expect(summary).toContain("batching opportunities");
    expect(summary).toContain("tokens saveable");
  });

  // ── reset ────────────────────────────────────────────────────────────────
  it("reset — clears history back to empty", async () => {
    await call(server, "tcb_record", { tool: "Read" });
    await call(server, "tcb_reset");
    const r = await call(server, "tcb_stats");
    const s = r.data.stats as Record<string, number>;
    expect(s.total).toBe(0);
  });

  // ── schema validation ───────────────────────────────────────────────────
  it("schema rejects empty tool name on record", async () => {
    const r = await call(server, "tcb_record", { tool: "" });
    expect(r.ok).toBe(false);
  });

  it("schema rejects window_size > 50", async () => {
    const r = await call(server, "tcb_analyze", { window_size: 100 });
    expect(r.ok).toBe(false);
  });

  // ── all 6 actions accepted ──────────────────────────────────────────────
  it("all 6 tcb_* actions are accepted by the registered dispatcher", async () => {
    const actions: Array<[string, Record<string, unknown>]> = [
      ["tcb_record",    { tool: "Read" }],
      ["tcb_analyze",   {}],
      ["tcb_can_batch", { tool: "Read" }],
      ["tcb_stats",     {}],
      ["tcb_summary",   {}],
      ["tcb_reset",     {}],
    ];
    for (const [act, p] of actions) {
      const r = await call(server, act, p);
      expect(r.ok, `${act} should succeed`).toBe(true);
      expect(r.data.success).toBe(true);
    }
  });
});
