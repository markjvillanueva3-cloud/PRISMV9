/**
 * dispatcher.bloomDedup.test.ts — round-trip integration coverage
 * for WIRE-UNWIRED-MS0/U-WIRE-BLOOM dispatcher wiring.
 *
 * Drives 4 read-only AssetBloomFilters + BloomDedupEngine actions through
 * real `prism_dev`. Add/merge/clear/import DEFERRED — they mutate a stateful
 * probabilistic data structure whose presence is load-bearing for the
 * DuplicationGuardEngine surface.
 *
 *   - dedup_might_contain       → assetBloomFilters.mightContain(type, name)
 *   - dedup_is_definitely_new   → assetBloomFilters.isDefinitelyNew(type, name)
 *   - dedup_asset_stats         → assetBloomFilters.getStats()
 *   - dedup_bloom_check         → bloomDedupEngine.checkDedup(name)
 *
 * ROUTING PROOF: AssetBloomFilters ships with 12 pre-built type filters.
 * dedup_asset_stats must surface all 12 with concrete capacity ≥ 2000 (from
 * the engine's `createOptimized(2000, 0.01)` constructor).
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { bloomDedupEngine, assetBloomFilters } from "../engines/BloomDedupEngine.js";

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

const EXPECTED_ASSET_TYPES = [
  "engine", "action", "skill", "hook", "formula", "algorithm",
  "tribal_tip", "playbook_rule", "schema", "dispatcher", "route", "test",
] as const;

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

// Reset the SINGLE-FILTER engine between tests so dedup_bloom_check is stable.
beforeEach(() => {
  bloomDedupEngine.clear();
});

describe("WIRE-UNWIRED-MS0/U-WIRE-BLOOM — Zod schemas", () => {
  it("dedup_asset_stats schema accepts {} (no params)", () => {
    expect(ACTION_DEV_SCHEMAS["dedup_asset_stats"].safeParse({}).success).toBe(true);
  });

  it("dedup_bloom_check schema requires non-empty name", () => {
    expect(ACTION_DEV_SCHEMAS["dedup_bloom_check"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["dedup_bloom_check"].safeParse({ name: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["dedup_bloom_check"].safeParse({ name: "x" }).success).toBe(true);
  });

  it("dedup_might_contain schema requires asset_type + name (refine guard)", () => {
    expect(ACTION_DEV_SCHEMAS["dedup_might_contain"].safeParse({ name: "x" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["dedup_might_contain"].safeParse({
      asset_type: "engine", name: "x",
    }).success).toBe(true);
  });

  it("dedup_might_contain schema accepts assetType camelCase alias", () => {
    expect(ACTION_DEV_SCHEMAS["dedup_might_contain"].safeParse({
      assetType: "engine", name: "x",
    }).success).toBe(true);
  });

  it("dedup_might_contain schema rejects empty name", () => {
    expect(ACTION_DEV_SCHEMAS["dedup_might_contain"].safeParse({
      asset_type: "engine", name: "",
    }).success).toBe(false);
  });

  it("dedup_is_definitely_new schema mirrors dedup_might_contain shape", () => {
    expect(ACTION_DEV_SCHEMAS["dedup_is_definitely_new"].safeParse({
      asset_type: "skill", name: "/forge-triple",
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["dedup_is_definitely_new"].safeParse({}).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-BLOOM — prism_dev :: dedup_asset_stats", () => {
  it("returns stats for all 12 pre-built asset-type filters with positive size_bits", async () => {
    const r = await invokeHandler(devHandler, "dedup_asset_stats", {});
    const data = r as { stats?: Record<string, { size_bits?: number; num_hashes?: number }> };
    // Engine-direct cross-check: exact same keys must appear
    const directKeys = Object.keys(assetBloomFilters.getStats()).sort();
    const wireKeys = Object.keys(data.stats ?? {}).sort();
    expect(wireKeys).toEqual(directKeys);
    expect(wireKeys.length).toBe(EXPECTED_ASSET_TYPES.length);
    // Every expected key present with positive bit-size + ≥1 hash function
    for (const t of EXPECTED_ASSET_TYPES) {
      const bits = data.stats?.[t]?.size_bits ?? 0;
      expect(bits).toBeGreaterThan(0);
      const hashes = data.stats?.[t]?.num_hashes ?? 0;
      expect(hashes).toBeGreaterThanOrEqual(1);
    }
  });

  it("wire stats match engine-direct getStats() per-field for the 'engine' filter", async () => {
    const r = await invokeHandler(devHandler, "dedup_asset_stats", {});
    const data = r as { stats?: Record<string, Record<string, unknown>> };
    const direct = assetBloomFilters.getStats()["engine"]!;
    const wireEngine = data.stats?.["engine"] ?? {};
    // size_bits must match exactly (load-bearing — proves no compression drift)
    expect(wireEngine["size_bits"]).toBe(direct.size_bits);
    // num_hashes must match (k value for the bloom filter)
    expect(wireEngine["num_hashes"]).toBe(direct.num_hashes);
    // items_added must match — both come from the same shared Map state
    expect(wireEngine["items_added"]).toBe(direct.items_added);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-BLOOM — prism_dev :: dedup_might_contain", () => {
  it("after engine-direct add → mightContain returns true through the wire", async () => {
    // ROUTING PROOF: add via engine-direct (no wire — write ops not wired),
    // then query through wire. true via wire ≡ wire reached the same singleton.
    const sentinel = "WIRE-BLOOM-TEST-SENTINEL-" + Date.now();
    assetBloomFilters.add("engine", sentinel);
    const r = await invokeHandler(devHandler, "dedup_might_contain", {
      asset_type: "engine", name: sentinel,
    });
    const data = r as { might_contain?: boolean };
    expect(data.might_contain).toBe(true);
    // Engine-direct cross-check confirms membership state is real
    expect(assetBloomFilters.mightContain("engine", sentinel)).toBe(true);
  });

  it("for a never-added sentinel → mightContain returns false on wire AND engine", async () => {
    // Fresh random sentinel guaranteed not in filter
    const sentinel = "DEFINITELY-NEVER-ADDED-" + Math.random().toString(36).slice(2);
    // Pre-condition: engine-direct also reports false
    expect(assetBloomFilters.mightContain("engine", sentinel)).toBe(false);
    const r = await invokeHandler(devHandler, "dedup_might_contain", {
      asset_type: "engine", name: sentinel,
    });
    const data = r as { might_contain?: boolean };
    // slimResponse strips false values → field may be absent.
    const val = "might_contain" in data ? data.might_contain : false;
    expect(val).toBe(false);
  });

  it("camelCase assetType alias produces same wire result as asset_type", async () => {
    const sentinel = "ALIAS-PROOF-" + Date.now();
    assetBloomFilters.add("hook", sentinel);
    const a = await invokeHandler(devHandler, "dedup_might_contain", {
      asset_type: "hook", name: sentinel,
    });
    const b = await invokeHandler(devHandler, "dedup_might_contain", {
      assetType: "hook", name: sentinel,
    });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    // And both must affirmatively report true (not just be equal)
    const aData = a as { might_contain?: boolean };
    expect(aData.might_contain).toBe(true);
  });

  it("unknown asset_type → engine fail-soft returns might_contain=false (no error)", async () => {
    const r = await invokeHandler(devHandler, "dedup_might_contain", {
      asset_type: "definitely-not-a-real-type",
      name: "x",
    });
    const data = r as { might_contain?: boolean; error?: unknown };
    // No error path on unknown type (engine logs warn + returns false)
    expect("error" in data ? typeof data.error : "absent").toBe("absent");
    const val = "might_contain" in data ? data.might_contain : false;
    expect(val).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-BLOOM — prism_dev :: dedup_is_definitely_new", () => {
  it("for an unseen name → returns true (precondition: engine agrees)", async () => {
    const sentinel = "DEFINITELY-NEW-" + Math.random().toString(36).slice(2);
    expect(assetBloomFilters.isDefinitelyNew("engine", sentinel)).toBe(true);
    const r = await invokeHandler(devHandler, "dedup_is_definitely_new", {
      asset_type: "engine", name: sentinel,
    });
    const data = r as { is_definitely_new?: boolean };
    expect(data.is_definitely_new).toBe(true);
  });

  it("after engine-direct add → wire returns false (precondition: engine agrees)", async () => {
    const sentinel = "ADDED-SO-NOT-NEW-" + Date.now();
    assetBloomFilters.add("formula", sentinel);
    expect(assetBloomFilters.isDefinitelyNew("formula", sentinel)).toBe(false);
    const r = await invokeHandler(devHandler, "dedup_is_definitely_new", {
      asset_type: "formula", name: sentinel,
    });
    const data = r as { is_definitely_new?: boolean };
    // slimResponse strips false → field may be absent
    const val = "is_definitely_new" in data ? data.is_definitely_new : false;
    expect(val).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-BLOOM — prism_dev :: dedup_bloom_check", () => {
  it("fresh-cleared filter → returns DedupCheckResult with might_exist=false and name round-trip", async () => {
    // bloomDedupEngine.clear() in beforeEach ensures fresh state.
    // Engine result shape: { name, might_exist, checked_at, filter_used }
    expect(bloomDedupEngine.checkDedup("fresh-name").might_exist).toBe(false);
    const r = await invokeHandler(devHandler, "dedup_bloom_check", { name: "fresh-name" });
    const data = r as {
      check?: { might_exist?: boolean; name?: string; filter_used?: string };
    };
    // slimResponse strips false might_exist + may compact the result shape.
    // Defend with absent-or-false pattern.
    const mightExist = "check" in data && data.check && "might_exist" in data.check
      ? data.check.might_exist
      : false;
    expect(mightExist).toBe(false);
    // The name round-trip is the load-bearing ROUTING PROOF — the engine echoes
    // the queried name back in DedupCheckResult.name.
    expect(data.check?.name).toBe("fresh-name");
  });

  it("after engine-direct add → checkDedup returns might_exist=true via wire", async () => {
    bloomDedupEngine.add("known-name");
    // Precondition: engine-direct confirms add registered
    expect(bloomDedupEngine.checkDedup("known-name").might_exist).toBe(true);
    const r = await invokeHandler(devHandler, "dedup_bloom_check", { name: "known-name" });
    const data = r as {
      check?: { might_exist?: boolean; name?: string };
    };
    expect(data.check?.might_exist).toBe(true);
    expect(data.check?.name).toBe("known-name");
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-BLOOM — error envelope", () => {
  it("dedup_might_contain without asset_type → dispatcher returns {error, details} with field mention", async () => {
    const r = await invokeHandler(devHandler, "dedup_might_contain", { name: "x" });
    // devDispatcher's Zod-validation envelope is {error: "Invalid params for...", details: <zod>}
    const data = r as { error?: string; details?: string };
    expect(typeof data.error).toBe("string");
    expect(String(data.error ?? "")).toMatch(/invalid params for dedup_might_contain/i);
    // The refine() guard message must surface in `details`
    expect(String(data.details ?? "")).toMatch(/asset_type|assetType/i);
  });

  it("dedup_bloom_check without name → schema rejects with non-empty error string", async () => {
    const r = await invokeHandler(devHandler, "dedup_bloom_check", {});
    const data = r as { error?: string };
    expect(typeof data.error).toBe("string");
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });
});
