/**
 * dispatcher.registryFederation.test.ts — round-trip integration coverage
 * for WIRE-UNWIRED-MS0/U-WIRE-REGFED dispatcher wiring.
 *
 * Drives 4 read-only RegistryFederation actions through real `prism_infra`:
 *
 *   - registry_fed_query  → query(q)
 *   - registry_fed_get    → getRegistry(id)
 *   - registry_fed_list   → listRegistries()
 *   - registry_fed_stats  → getStats()
 *
 * The engine ships 10 hard-coded registries on initialize() (engines/formulas/
 * algorithms/materials/tools/machines/tribal/strategies/mit/jmdie). Asserting
 * those ids appear in the wire output is the ROUTING PROOF.
 *
 * SAFETY NOTE: all 4 actions are read-only. The engine's only mutating method
 * is reset() (clears state) — intentionally NOT wired.
 *
 * Caveat: the engine singleton's `initialized` flag persists across tests;
 * reset between cases isn't required since all 4 methods are idempotent reads.
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { registerInfraDispatcher } from "../tools/dispatchers/infraDispatcher.js";
import { ACTION_INFRA_SCHEMAS } from "../schemas/infraActionSchemas.js";
import { registryFederationEngine } from "../engines/RegistryFederationEngine.js";

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

let infraHandler: CapturedTool["handler"];

const EXPECTED_REGISTRY_IDS = [
  "engines", "formulas", "algorithms", "materials", "tools",
  "machines", "tribal", "strategies", "mit", "jmdie",
] as const;

beforeAll(() => {
  const srv = makeStubServer();
  registerInfraDispatcher(srv as unknown as Parameters<typeof registerInfraDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_infra");
  if (!t) throw new Error("prism_infra not registered");
  infraHandler = t.handler;
});

// Ensure a clean federation between tests so getStats assertions are stable
// against the hard-coded 10-registry shipment.
beforeEach(async () => {
  registryFederationEngine.reset();
});

describe("WIRE-UNWIRED-MS0/U-WIRE-REGFED — Zod schemas", () => {
  it("registry_fed_list schema accepts {} (no params)", () => {
    expect(ACTION_INFRA_SCHEMAS["registry_fed_list"].safeParse({}).success).toBe(true);
  });

  it("registry_fed_stats schema accepts {} (no params)", () => {
    expect(ACTION_INFRA_SCHEMAS["registry_fed_stats"].safeParse({}).success).toBe(true);
  });

  it("registry_fed_query schema requires non-empty query string", () => {
    expect(ACTION_INFRA_SCHEMAS["registry_fed_query"].safeParse({}).success).toBe(false);
    expect(ACTION_INFRA_SCHEMAS["registry_fed_query"].safeParse({ query: "" }).success).toBe(false);
    expect(ACTION_INFRA_SCHEMAS["registry_fed_query"].safeParse({ query: "tools" }).success).toBe(true);
  });

  it("registry_fed_query schema accepts optional registries array + limit", () => {
    expect(ACTION_INFRA_SCHEMAS["registry_fed_query"].safeParse({
      query: "tools",
      registries: ["tools", "materials"],
      limit: 10,
    }).success).toBe(true);
  });

  it("registry_fed_query schema rejects non-positive limit", () => {
    expect(ACTION_INFRA_SCHEMAS["registry_fed_query"].safeParse({
      query: "x", limit: 0,
    }).success).toBe(false);
    expect(ACTION_INFRA_SCHEMAS["registry_fed_query"].safeParse({
      query: "x", limit: -1,
    }).success).toBe(false);
  });

  it("registry_fed_get schema requires id OR registry_id (refine guard)", () => {
    expect(ACTION_INFRA_SCHEMAS["registry_fed_get"].safeParse({}).success).toBe(false);
    expect(ACTION_INFRA_SCHEMAS["registry_fed_get"].safeParse({ id: "" }).success).toBe(false);
    expect(ACTION_INFRA_SCHEMAS["registry_fed_get"].safeParse({ id: "tools" }).success).toBe(true);
    expect(ACTION_INFRA_SCHEMAS["registry_fed_get"].safeParse({ registry_id: "tools" }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-REGFED — prism_infra :: registry_fed_list", () => {
  it("returns all 10 hard-coded registries with id+name+type+entryCount", async () => {
    const r = await invokeHandler(infraHandler, "registry_fed_list", {});
    const data = r as {
      registries?: Array<{
        id: string; name: string; type: string; entryCount: number; path: string;
      }>;
    };
    expect(Array.isArray(data.registries)).toBe(true);
    expect((data.registries ?? []).length).toBe(EXPECTED_REGISTRY_IDS.length);
    const ids = (data.registries ?? []).map((r) => r.id);
    // ROUTING PROOF: every hard-coded registry id must surface
    for (const expected of EXPECTED_REGISTRY_IDS) {
      expect(ids).toContain(expected);
    }
    // Each entry has the full RegistryInfo shape
    const first = (data.registries ?? [])[0];
    expect(typeof first?.name).toBe("string");
    expect(typeof first?.type).toBe("string");
    expect(typeof first?.entryCount).toBe("number");
    expect(first?.entryCount).toBeGreaterThan(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-REGFED — prism_infra :: registry_fed_get", () => {
  it("known id 'tools' → returns the Tool Database registry (95608 entries)", async () => {
    const r = await invokeHandler(infraHandler, "registry_fed_get", { id: "tools" });
    const data = r as { registry?: { id?: string; name?: string; entryCount?: number; type?: string } };
    expect(data.registry?.id).toBe("tools");
    expect(data.registry?.name).toBe("Tool Database");
    expect(data.registry?.type).toBe("data");
    // ROUTING PROOF: hard-coded entryCount=95608 round-trips
    expect(data.registry?.entryCount).toBe(95608);
  });

  it("snake_case 'registry_id' alias resolves identically to 'id'", async () => {
    const a = await invokeHandler(infraHandler, "registry_fed_get", { id: "jmdie" });
    const b = await invokeHandler(infraHandler, "registry_fed_get", { registry_id: "jmdie" });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("unknown id → returns {registry: null} (engine fail-soft, slimResponse-aware)", async () => {
    const r = await invokeHandler(infraHandler, "registry_fed_get", { id: "does-not-exist-zzz" });
    const data = r as { registry?: unknown };
    // slimResponse may strip null fields → use inverse-check pattern
    const val = "registry" in data ? data.registry : null;
    expect(val).toBe(null);
    // Confirm via engine-direct (no wire dependency)
    expect(await registryFederationEngine.getRegistry("does-not-exist-zzz")).toBe(null);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-REGFED — prism_infra :: registry_fed_query", () => {
  it("query 'material' → 'Material Database' surfaces at top with matchScore 0.9 (name-hit)", async () => {
    // ROUTING PROOF: engine match logic is substring-match on name. "Material"
    // matches "Material Database" exactly (score 0.9), proves the wire ran
    // the real query method (not a stub). Note: querying for "tools" would
    // NOT match "Tool Database" — the engine's substring match is literal.
    const r = await invokeHandler(infraHandler, "registry_fed_query", { query: "material" });
    const data = r as {
      results?: Array<{ registryId: string; entryName: string; matchScore: number }>;
    };
    expect(Array.isArray(data.results)).toBe(true);
    const top = (data.results ?? [])[0];
    expect(top?.registryId).toBe("materials");
    expect(top?.matchScore).toBe(0.9);
    expect(top?.entryName).toBe("Material Database");
  });

  it("query 'data' → matches 'data' TYPE on multiple registries with score 0.7", async () => {
    const r = await invokeHandler(infraHandler, "registry_fed_query", { query: "data" });
    const data = r as {
      results?: Array<{ registryId: string; matchScore: number; metadata?: { type?: string } }>;
    };
    const dataTypeHits = (data.results ?? []).filter((x) => x.matchScore === 0.7);
    expect(dataTypeHits.length).toBeGreaterThan(0);
    for (const h of dataTypeHits) {
      expect(h.metadata?.type).toBe("data");
    }
  });

  it("registries filter narrows the result set", async () => {
    const all = await invokeHandler(infraHandler, "registry_fed_query", { query: "x" });
    const filtered = await invokeHandler(infraHandler, "registry_fed_query", {
      query: "x", registries: ["tools", "materials"],
    });
    const allLen = ((all as { results?: unknown[] }).results ?? []).length;
    const filteredLen = ((filtered as { results?: unknown[] }).results ?? []).length;
    expect(filteredLen).toBe(2);
    expect(filteredLen).toBeLessThan(allLen);
  });

  it("limit caps the returned result count", async () => {
    const r = await invokeHandler(infraHandler, "registry_fed_query", { query: "x", limit: 3 });
    const data = r as { results?: unknown[] };
    expect((data.results ?? []).length).toBeLessThanOrEqual(3);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-REGFED — prism_infra :: registry_fed_stats", () => {
  it("returns {totalRegistries: 10, totalEntries, byType}", async () => {
    const r = await invokeHandler(infraHandler, "registry_fed_stats", {});
    const data = r as {
      stats?: { totalRegistries?: number; totalEntries?: number; byType?: Record<string, number> };
    };
    expect(data.stats?.totalRegistries).toBe(EXPECTED_REGISTRY_IDS.length);
    expect(typeof data.stats?.totalEntries).toBe("number");
    // Sum of hard-coded entryCounts > 100k (tools alone is 95608)
    expect(data.stats?.totalEntries).toBeGreaterThan(100000);
    expect(typeof data.stats?.byType).toBe("object");
    // Engine has these type categories
    expect(data.stats?.byType?.["code"]).toBe(2);   // engines + algorithms
    expect(data.stats?.byType?.["data"]).toBe(3);   // materials + tools + machines
  });

  it("byType counts sum to totalRegistries (invariant)", async () => {
    const r = await invokeHandler(infraHandler, "registry_fed_stats", {});
    const data = r as { stats?: { totalRegistries?: number; byType?: Record<string, number> } };
    const sum = Object.values(data.stats?.byType ?? {}).reduce((a, b) => a + b, 0);
    expect(sum).toBe(data.stats?.totalRegistries);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-REGFED — error envelope", () => {
  it("registry_fed_query without query field → schema rejects with {error}", async () => {
    const r = await invokeHandler(infraHandler, "registry_fed_query", {});
    const data = r as { error?: string; isError?: boolean };
    expect(typeof data.error === "string" || data.isError === true).toBe(true);
  });

  it("registry_fed_get with neither id nor registry_id → schema refine rejects", async () => {
    const r = await invokeHandler(infraHandler, "registry_fed_get", {});
    const data = r as { error?: string; isError?: boolean };
    expect(typeof data.error === "string" || data.isError === true).toBe(true);
  });
});
