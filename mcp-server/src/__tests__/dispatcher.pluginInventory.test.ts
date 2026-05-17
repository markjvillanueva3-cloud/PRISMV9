/**
 * dispatcher.pluginInventory.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-PLG (PluginInventoryEngine).
 *
 * 6 read-only actions through real `prism_dev`:
 *   plug_get, plug_list, plug_list_by_kind, plug_list_by_health,
 *   plug_summary, plug_size
 *
 * Engine-pair test pre-exists at plugin-inventory-engine.test.ts.
 *
 * DEFER (state-mutation + path-traversal):
 *   register / registerAll / markHealth / markUsed (fictional-entry
 *     injection — caller could insert fake plugins into /aware boot brief)
 *   unregister / clear (destructive)
 *   loadFromInventoryFile (caller-supplied path → readFileSync)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { pluginInventoryEngine } from "../engines/PluginInventoryEngine.js";

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

let devHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;

  // Seed 4 distinct plugins spanning all 4 kinds + 3 health states
  // (mirrors WRON/PLIB engine-direct seeding pattern).
  pluginInventoryEngine.register({
    id: "wire-plg-test-mcp-1",
    name: "Test MCP server 1",
    kind: "mcp-server",
    version: "1.0.0",
    health: "healthy",
    tags: ["test", "FIXTURE", "Test"],
  });
  pluginInventoryEngine.register({
    id: "wire-plg-test-mcp-2",
    name: "Test MCP server 2 (degraded)",
    kind: "mcp-server",
    health: "degraded",
  });
  pluginInventoryEngine.register({
    id: "wire-plg-test-agent",
    name: "Test agent plugin",
    kind: "agent-plugin",
    health: "unreachable",
  });
  pluginInventoryEngine.register({
    id: "wire-plg-test-ext",
    name: "Test extension",
    kind: "extension",
    health: "healthy",
  });
  pluginInventoryEngine.markUsed("wire-plg-test-mcp-1");
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PLG — Zod schemas", () => {
  it("plug_get requires id (strict)", () => {
    expect(ACTION_DEV_SCHEMAS["plug_get"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["plug_get"].safeParse({ id: "x" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["plug_get"].safeParse({ id: "x", extra: 1 }).success).toBe(false);
  });

  it("plug_list_by_kind rejects bad kind enum", () => {
    expect(ACTION_DEV_SCHEMAS["plug_list_by_kind"].safeParse({ kind: "INVALID" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["plug_list_by_kind"].safeParse({ kind: "mcp-server" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["plug_list_by_kind"].safeParse({ kind: "agent-plugin" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["plug_list_by_kind"].safeParse({ kind: "extension" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["plug_list_by_kind"].safeParse({ kind: "skill-pack" }).success).toBe(true);
  });

  it("plug_list_by_health rejects bad status enum", () => {
    expect(ACTION_DEV_SCHEMAS["plug_list_by_health"].safeParse({ status: "INVALID" }).success).toBe(false);
    for (const s of ["healthy", "degraded", "unreachable", "unknown"]) {
      expect(ACTION_DEV_SCHEMAS["plug_list_by_health"].safeParse({ status: s }).success).toBe(true);
    }
  });

  it("plug_list / plug_summary / plug_size accept only empty object (strict)", () => {
    for (const action of ["plug_list", "plug_summary", "plug_size"]) {
      expect(ACTION_DEV_SCHEMAS[action].safeParse({}).success).toBe(true);
      expect(ACTION_DEV_SCHEMAS[action].safeParse({ extra: 1 }).success).toBe(false);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PLG — prism_dev :: plug_get", () => {
  it("found=true for seeded plugin", async () => {
    const r = await invokeHandler(devHandler, "plug_get", { id: "wire-plg-test-mcp-1" });
    expect(r.found).toBe(true);
    const res = (r as { result: { id: string; name: string; kind: string; health: string } }).result;
    expect(res.id).toBe("wire-plg-test-mcp-1");
    expect(res.kind).toBe("mcp-server");
    expect(res.health).toBe("healthy");
  });

  it("found=false for nonexistent ID", async () => {
    const r = await invokeHandler(devHandler, "plug_get", { id: "wire-plg-never-registered" });
    expect(r.found).toBe(false);
  });

  it("tags lowercased + deduplicated at registration to ['test','fixture'] (engine line 59)", async () => {
    const r = await invokeHandler(devHandler, "plug_get", { id: "wire-plg-test-mcp-1" });
    const res = (r as { result: { tags?: string[] } }).result;
    // Input was ["test", "FIXTURE", "Test"] → engine line 59:
    //   [...new Set(tags.map((t) => t.toLowerCase()))] = ["test", "fixture"]
    const tags = res.tags ?? [];
    expect(tags.length).toBe(2);
    expect(new Set(tags).size).toBe(tags.length); // no dupes
    for (const t of tags) {
      expect(t).toBe(t.toLowerCase()); // all lowercase
    }
    expect(tags).toContain("test");
    expect(tags).toContain("fixture");
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PLG — prism_dev :: plug_list*", () => {
  it("plug_list returns ≥ 4 seeded plugins", async () => {
    const r = await invokeHandler(devHandler, "plug_list", {});
    expect((r.plugin_count as number)).toBeGreaterThanOrEqual(4);
  });

  it("plug_list_by_kind=mcp-server returns ≥ 2 (seeded mcp-1 + mcp-2)", async () => {
    const r = await invokeHandler(devHandler, "plug_list_by_kind", { kind: "mcp-server" });
    expect((r.plugin_count as number)).toBeGreaterThanOrEqual(2);
    expect(r.kind).toBe("mcp-server");
    const plugins = (r as { plugins: Array<{ kind: string }> }).plugins;
    for (const p of plugins) {
      expect(p.kind).toBe("mcp-server");
    }
  });

  it("VARIABILITY — all 4 kinds queryable; mcp-server + agent-plugin + extension yield ≥ 1 each", async () => {
    const kinds = ["mcp-server", "agent-plugin", "extension"];
    for (const k of kinds) {
      const r = await invokeHandler(devHandler, "plug_list_by_kind", { kind: k });
      expect((r.plugin_count as number)).toBeGreaterThanOrEqual(1);
    }
    const sp = await invokeHandler(devHandler, "plug_list_by_kind", { kind: "skill-pack" });
    expect(sp.plugin_count).toBe(0);
  });

  it("plug_list_by_health=healthy returns ≥ 2 (mcp-1 + extension)", async () => {
    const r = await invokeHandler(devHandler, "plug_list_by_health", { status: "healthy" });
    expect((r.plugin_count as number)).toBeGreaterThanOrEqual(2);
    expect(r.status).toBe("healthy");
    const plugins = (r as { plugins: Array<{ health: string }> }).plugins;
    for (const p of plugins) {
      expect(p.health).toBe("healthy");
    }
  });

  it("plug_list_by_health=degraded returns ≥ 1 (mcp-2)", async () => {
    const r = await invokeHandler(devHandler, "plug_list_by_health", { status: "degraded" });
    expect((r.plugin_count as number)).toBeGreaterThanOrEqual(1);
  });

  it("plug_list_by_health=unreachable returns ≥ 1 (agent)", async () => {
    const r = await invokeHandler(devHandler, "plug_list_by_health", { status: "unreachable" });
    expect((r.plugin_count as number)).toBeGreaterThanOrEqual(1);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PLG — prism_dev :: plug_summary + plug_size", () => {
  it("plug_summary returns total + byKind + byHealth + recentlyUsed", async () => {
    const r = await invokeHandler(devHandler, "plug_summary", {});
    const res = (r as { result: { total: number; byKind: Record<string, number>; byHealth: Record<string, number>; recentlyUsed: unknown[] } }).result;
    expect(res.total).toBeGreaterThanOrEqual(4);
    expect(r.total).toBe(res.total);
    expect(r.is_empty).toBe(false);
    expect(Object.keys(res.byKind).sort()).toEqual(["agent-plugin", "extension", "mcp-server", "skill-pack"]);
    expect(Object.keys(res.byHealth).sort()).toEqual(["degraded", "healthy", "unknown", "unreachable"]);
  });

  it("plug_summary recentlyUsed is ≤ 5 entries (engine line 117 slice)", async () => {
    const r = await invokeHandler(devHandler, "plug_summary", {});
    const recently = (r as { result: { recentlyUsed: unknown[] } }).result.recentlyUsed;
    expect(recently.length).toBeLessThanOrEqual(5);
    expect(r.recently_used_count).toBe(recently.length);
  });

  it("plug_size matches plug_list count", async () => {
    const sizeR = await invokeHandler(devHandler, "plug_size", {});
    const listR = await invokeHandler(devHandler, "plug_list", {});
    expect(sizeR.size).toBe(listR.plugin_count);
    expect(sizeR.is_empty).toBe(false);
  });

  it("ROUTING PROOF — wire size equals engine-direct size()", async () => {
    const r = await invokeHandler(devHandler, "plug_size", {});
    const direct = pluginInventoryEngine.size();
    expect(r.size).toBe(direct);
  });

  it("ROUTING PROOF — wire summary.total equals engine-direct summary().total", async () => {
    const r = await invokeHandler(devHandler, "plug_summary", {});
    const direct = pluginInventoryEngine.summary();
    expect((r.result as { total: number }).total).toBe(direct.total);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PLG — error envelope", () => {
  it("plug_get without id → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "plug_get", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("plug_list_by_kind with bad kind → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "plug_list_by_kind", { kind: "INVALID" });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("plug_list_by_health with bad status → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "plug_list_by_health", { status: "PARTIALLY_HEALTHY" });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("plug_list with extra params → strict schema rejects", async () => {
    const r = await invokeHandler(devHandler, "plug_list", { extra: 1 });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
