/**
 * devDispatcher × PromptTemplateEngine wire — orphan-rescue (OBSIDIAN-PRISM-OS-MS0).
 *
 * Engine has 7 builtin templates (engine_create, dispatcher_action, test_suite,
 * hookify_rule, slash_command, commit_message, speed_feed) and 7 public methods.
 * Pure functions; no I/O. Existing engine tests at
 * __tests__/prompt-template-engine.test.ts.
 *
 * @milestone OBSIDIAN-PRISM-OS-MS0
 * @unit U-ORPHAN-RESCUE-PROMPT-TPL
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

describe("devDispatcher × PromptTemplateEngine wire (U-ORPHAN-RESCUE-PROMPT-TPL)", () => {
  it("get — engine_create returns the canonical engine-creation template", async () => {
    const r = await call(server, "prompt_template_get", { id: "engine_create" });
    expect(r.ok).toBe(true);
    const tpl = r.data.template as Record<string, unknown>;
    expect(tpl.id).toBe("engine_create");
    expect(tpl.category).toBe("forge");
    expect(tpl.params).toEqual(["name", "purpose", "name_lower"]);
  });

  it("get — unknown id → null (slimResponse strips, so absence is OK)", async () => {
    const r = await call(server, "prompt_template_get", { id: "does-not-exist" });
    expect(r.ok).toBe(true);
    expect(r.data.template === null || r.data.template === undefined).toBe(true);
  });

  it("fill — engine_create substitutes {name}/{purpose}/{name_lower}", async () => {
    const r = await call(server, "prompt_template_fill", {
      id: "engine_create",
      params: { name: "Foo", purpose: "test", name_lower: "foo" },
    });
    const text = r.data.text as string;
    expect(text).toContain("FooEngine");
    expect(text).toContain("Purpose: test");
    expect(text).toContain("foo-engine.test.ts");
    // No unsubstituted placeholders remain
    expect(text).not.toMatch(/\{name\}/);
    expect(text).not.toMatch(/\{purpose\}/);
  });

  it("fill — same param appearing multiple times gets ALL replaced (g-flag)", async () => {
    // engine_create has {name} appearing 3 times (Create engine + Pattern + File)
    const r = await call(server, "prompt_template_fill", {
      id: "engine_create",
      params: { name: "Bar", purpose: "p", name_lower: "bar" },
    });
    const matches = (r.data.text as string).match(/BarEngine/g);
    expect(matches?.length).toBeGreaterThanOrEqual(3);
  });

  it("fill — unknown id → null", async () => {
    const r = await call(server, "prompt_template_fill", {
      id: "no-such-template",
      params: {},
    });
    expect(r.data.text === null || r.data.text === undefined).toBe(true);
  });

  it("list — returns all 7 builtin templates with compact shape", async () => {
    const r = await call(server, "prompt_template_list");
    expect(r.ok).toBe(true);
    const list = r.data.templates as Array<Record<string, unknown>>;
    expect(list.length).toBe(7);
    const ids = list.map(t => t.id).sort();
    expect(ids).toEqual([
      "commit_message", "dispatcher_action", "engine_create",
      "hookify_rule", "slash_command", "speed_feed", "test_suite",
    ]);
  });

  it("by_category — 'forge' yields exactly engine_create", async () => {
    const r = await call(server, "prompt_template_by_category", { category: "forge" });
    const list = r.data.templates as Array<Record<string, unknown>>;
    expect(list.length).toBe(1);
    expect(list[0].id).toBe("engine_create");
  });

  it("by_category — unknown category → empty array (slimResponse strips)", async () => {
    const r = await call(server, "prompt_template_by_category", { category: "nonexistent" });
    const list = (r.data.templates ?? []) as Array<unknown>;
    expect(list.length).toBe(0);
  });

  it("categories — returns 7 distinct categories", async () => {
    const r = await call(server, "prompt_template_categories");
    const cats = r.data.categories as string[];
    expect(cats.sort()).toEqual([
      "forge", "git", "hooks", "manufacturing", "skills", "testing", "wiring",
    ]);
  });

  it("search — 'engine' finds engine_create AND speed_feed (both mention 'Engine'/'engine' in description? confirm engine_create only)", async () => {
    const r = await call(server, "prompt_template_search", { query: "engine" });
    const list = r.data.templates as Array<Record<string, unknown>>;
    // Engine.search matches name + description + id (case-insensitive)
    // "engine_create" id contains "engine" — must include it
    expect(list.some(t => t.id === "engine_create")).toBe(true);
  });

  it("search — 'commit' finds commit_message", async () => {
    const r = await call(server, "prompt_template_search", { query: "commit" });
    const list = r.data.templates as Array<Record<string, unknown>>;
    expect(list.some(t => t.id === "commit_message")).toBe(true);
  });

  it("stats — returns total=7, categories=7, avgTokens > 0", async () => {
    const r = await call(server, "prompt_template_stats");
    const s = r.data.stats as Record<string, number>;
    expect(s.total).toBe(7);
    expect(s.categories).toBe(7);
    expect(s.avgTokens).toBeGreaterThan(0);
  });

  // ── schema validation ────────────────────────────────────────────────
  it("schema rejects empty id on get", async () => {
    const r = await call(server, "prompt_template_get", { id: "" });
    expect(r.ok).toBe(false);
  });

  it("schema rejects empty query on search", async () => {
    const r = await call(server, "prompt_template_search", { query: "" });
    expect(r.ok).toBe(false);
  });

  it("schema requires params object on fill", async () => {
    const r = await call(server, "prompt_template_fill", { id: "engine_create" });
    expect(r.ok).toBe(false);
  });

  // ── all 7 actions accepted ───────────────────────────────────────────
  it("all 7 prompt_template_* actions are accepted by the registered dispatcher", async () => {
    const actions: Array<[string, Record<string, unknown>]> = [
      ["prompt_template_get",         { id: "engine_create" }],
      ["prompt_template_fill",        { id: "engine_create", params: { name: "X", purpose: "y", name_lower: "x" } }],
      ["prompt_template_list",        {}],
      ["prompt_template_by_category", { category: "forge" }],
      ["prompt_template_categories",  {}],
      ["prompt_template_search",      { query: "engine" }],
      ["prompt_template_stats",       {}],
    ];
    for (const [act, p] of actions) {
      const r = await call(server, act, p);
      expect(r.ok, `${act} should succeed`).toBe(true);
      expect(r.data.success).toBe(true);
    }
  });
});
