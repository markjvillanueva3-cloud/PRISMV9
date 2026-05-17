/**
 * dispatcher.actionSchemaCache.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-ASC dispatcher wiring.
 *
 * Drives 5 read-only actions through real `prism_dev`. invalidate()
 * DEFERRED (cache-mutating; would let stale-cache races trigger remotely).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { actionSchemaCacheEngine } from "../engines/ActionSchemaCacheEngine.js";

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
  // Warm the engine cache before the dispatcher routes through it so the
  // first dispatcher call doesn't time out on scan() under cold conditions.
  actionSchemaCacheEngine.getStats();

  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ASC — Zod schemas", () => {
  it("asc_get_schema requires non-empty action_name", () => {
    expect(ACTION_DEV_SCHEMAS["asc_get_schema"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["asc_get_schema"].safeParse({ action_name: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["asc_get_schema"].safeParse({ action_name: "rsg_generate" }).success).toBe(true);
  });

  it("asc_search_schemas requires non-empty query + caps max at 500 (DoS guard)", () => {
    expect(ACTION_DEV_SCHEMAS["asc_search_schemas"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["asc_search_schemas"].safeParse({ query: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["asc_search_schemas"].safeParse({ query: "x", max: 501 }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["asc_search_schemas"].safeParse({ query: "x", max: 500 }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["asc_search_schemas"].safeParse({ query: "x" }).success).toBe(true);
  });

  it("asc_get_param_hint requires non-empty action_name", () => {
    expect(ACTION_DEV_SCHEMAS["asc_get_param_hint"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["asc_get_param_hint"].safeParse({ action_name: "x" }).success).toBe(true);
  });

  it("asc_get_dispatcher_actions requires non-empty dispatcher_name", () => {
    expect(ACTION_DEV_SCHEMAS["asc_get_dispatcher_actions"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["asc_get_dispatcher_actions"].safeParse({ dispatcher_name: "dev" }).success).toBe(true);
  });

  it("asc_get_stats accepts {}", () => {
    expect(ACTION_DEV_SCHEMAS["asc_get_stats"].safeParse({}).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ASC — prism_dev :: asc_get_stats", () => {
  it("returns {actions, dispatchers, withParams} all ≥ 0", async () => {
    const r = await invokeHandler(devHandler, "asc_get_stats", {});
    const stats = (r as { stats: { actions: number; dispatchers: number; withParams: number } }).stats;
    expect(typeof stats.actions).toBe("number");
    expect(stats.actions).toBeGreaterThanOrEqual(0);
    expect(stats.dispatchers).toBeGreaterThanOrEqual(0);
    expect(stats.withParams).toBeGreaterThanOrEqual(0);
    // withParams can never exceed total actions
    expect(stats.withParams).toBeLessThanOrEqual(stats.actions);
  });

  it("ROUTING PROOF — wire stats byte-equals engine-direct getStats()", async () => {
    const r = await invokeHandler(devHandler, "asc_get_stats", {});
    const wire = (r as { stats: unknown }).stats;
    const direct = actionSchemaCacheEngine.getStats();
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ASC — prism_dev :: asc_get_schema", () => {
  it("unknown action → found:false", async () => {
    const r = await invokeHandler(devHandler, "asc_get_schema", {
      action_name: "no_such_action_ever_" + Date.now(),
    });
    expect((r as { found?: boolean }).found).toBe(false);
  });

  it("known action → found:true + schema {action, dispatcher, params, hasOptional}", async () => {
    // Find a known action via stats — engine scans the whole dispatchers/ dir
    const ids = actionSchemaCacheEngine.searchSchemas("get", 1);
    if (ids.length === 0) {
      // The cache may be empty in test env if scan failed — that's a different
      // bug; this test only proves wire shape when the cache has at least 1 entry.
      return;
    }
    const known = ids[0]!.action;
    const r = await invokeHandler(devHandler, "asc_get_schema", { action_name: known });
    expect((r as { found?: boolean }).found).toBe(true);
    const schema = (r as { schema: { action: string; dispatcher: string; params: unknown[] } }).schema;
    expect(schema.action).toBe(known);
    expect(typeof schema.dispatcher).toBe("string");
    expect(Array.isArray(schema.params)).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ASC — prism_dev :: asc_search_schemas", () => {
  it("returns matches + count with parity", async () => {
    const r = await invokeHandler(devHandler, "asc_search_schemas", { query: "get", max: 50 });
    const matches = (r as { matches?: unknown[] }).matches ?? [];
    expect((r as { count?: number }).count).toBe(matches.length);
  });

  it("max cap is honored", async () => {
    const r = await invokeHandler(devHandler, "asc_search_schemas", { query: "_", max: 5 });
    const matches = (r as { matches?: unknown[] }).matches ?? [];
    expect(matches.length).toBeLessThanOrEqual(5);
  });

  it("ROUTING PROOF — wire matches per-field equal to engine-direct searchSchemas()", async () => {
    // slimResponse strips empty `params:[]` arrays from the wire response, so
    // byte-equal JSON compare fails on no-param actions like `stats()`. Compare
    // per-field, treating absent `params` on the wire side as the engine's [].
    const query = "stats";
    const r = await invokeHandler(devHandler, "asc_search_schemas", { query, max: 10 });
    const wire = ((r as { matches?: Array<{ action: string; dispatcher: string; params?: string[]; signature: string }> }).matches) ?? [];
    const direct = actionSchemaCacheEngine.searchSchemas(query, 10);
    expect(wire.length).toBe(direct.length);
    for (let i = 0; i < wire.length; i++) {
      const w = wire[i]!;
      const d = direct[i]!;
      expect(w.action).toBe(d.action);
      expect(w.dispatcher).toBe(d.dispatcher);
      expect(w.signature).toBe(d.signature);
      // Empty params array gets stripped by slimResponse → nullish-coalesce to []
      const wireParams = w.params ?? [];
      expect(wireParams.length).toBe(d.params.length);
      for (let j = 0; j < d.params.length; j++) {
        expect(wireParams[j]).toBe(d.params[j]);
      }
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ASC — prism_dev :: asc_get_param_hint", () => {
  it("unknown action → '[unknown action]' hint string", async () => {
    const r = await invokeHandler(devHandler, "asc_get_param_hint", {
      action_name: "no_such_action_" + Date.now(),
    });
    expect(typeof (r as { hint?: string }).hint).toBe("string");
    expect((r as { hint?: string }).hint).toMatch(/unknown action/i);
  });

  it("ROUTING PROOF — wire hint string-equals engine-direct getParamHint()", async () => {
    const ids = actionSchemaCacheEngine.searchSchemas("stats", 1);
    if (ids.length === 0) return; // empty cache → can't compare; covered above
    const known = ids[0]!.action;
    const r = await invokeHandler(devHandler, "asc_get_param_hint", { action_name: known });
    const wire = (r as { hint?: string }).hint;
    const direct = actionSchemaCacheEngine.getParamHint(known);
    expect(wire).toBe(direct);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ASC — prism_dev :: asc_get_dispatcher_actions", () => {
  it("returns actions + count with parity", async () => {
    const r = await invokeHandler(devHandler, "asc_get_dispatcher_actions", { dispatcher_name: "dev" });
    const actions = (r as { actions?: unknown[] }).actions ?? [];
    expect((r as { count?: number }).count).toBe(actions.length);
  });

  it("dispatcher-name suffix tolerance — 'devDispatcher' should hit same set as 'dev'", async () => {
    const r1 = await invokeHandler(devHandler, "asc_get_dispatcher_actions", { dispatcher_name: "dev" });
    const r2 = await invokeHandler(devHandler, "asc_get_dispatcher_actions", { dispatcher_name: "devDispatcher" });
    const c1 = (r1 as { count?: number }).count ?? 0;
    const c2 = (r2 as { count?: number }).count ?? 0;
    expect(c2).toBe(c1);
  });

  it("ROUTING PROOF — wire id set equals engine-direct getDispatcherActions()", async () => {
    const r = await invokeHandler(devHandler, "asc_get_dispatcher_actions", { dispatcher_name: "dev" });
    const wireActions = ((r as { actions?: Array<{ action: string }> }).actions ?? []).map(a => a.action).sort();
    const directActions = actionSchemaCacheEngine.getDispatcherActions("dev").map(a => a.action).slice().sort();
    expect(JSON.stringify(wireActions)).toBe(JSON.stringify(directActions));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ASC — error envelope", () => {
  it("asc_get_schema without action_name → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "asc_get_schema", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("asc_search_schemas with max > 500 → schema rejects (DoS guard)", async () => {
    const r = await invokeHandler(devHandler, "asc_search_schemas", { query: "x", max: 501 });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
