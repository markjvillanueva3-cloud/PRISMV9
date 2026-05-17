/**
 * dispatcher.manufacturerCatalogAI.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-MCA dispatcher wiring.
 *
 * Drives 8 READ-ONLY actions through real `prism_dev`. Complex multi-arg
 * search methods (selectToolHolder / matchWorkholding / findCuttingTool /
 * compareManufacturers / getJMDieRecommendations) DEFERRED — deeply nested
 * input specs need follow-up wire surfacing.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { manufacturerCatalogAIEngine } from "../engines/ManufacturerCatalogAIEngine.js";

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
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MCA — Zod schemas", () => {
  it("all-getters accept {}", () => {
    for (const action of ["mca_all_holders", "mca_all_workholding", "mca_all_cutting_tools", "mca_bigdaishowa_families", "mca_vendor_trust", "mca_catalog_paths"]) {
      expect(ACTION_DEV_SCHEMAS[action].safeParse({}).success).toBe(true);
    }
  });

  it("mca_feature_vector requires non-empty item_id", () => {
    expect(ACTION_DEV_SCHEMAS["mca_feature_vector"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mca_feature_vector"].safeParse({ item_id: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mca_feature_vector"].safeParse({ item_id: "abc" }).success).toBe(true);
  });

  it("mca_search requires non-empty keyword", () => {
    expect(ACTION_DEV_SCHEMAS["mca_search"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mca_search"].safeParse({ keyword: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["mca_search"].safeParse({ keyword: "chuck" }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MCA — prism_dev :: getters", () => {
  it("mca_all_holders → array with count parity to engine-direct", async () => {
    const r = await invokeHandler(devHandler, "mca_all_holders", {});
    const wireCount = ((r as { count?: number }).count) ?? 0;
    const direct = manufacturerCatalogAIEngine.getAllHolders();
    expect(wireCount).toBe(direct.length);
  });

  it("mca_all_workholding → array with count parity", async () => {
    const r = await invokeHandler(devHandler, "mca_all_workholding", {});
    const wireCount = ((r as { count?: number }).count) ?? 0;
    const direct = manufacturerCatalogAIEngine.getAllWorkholding();
    expect(wireCount).toBe(direct.length);
  });

  it("mca_all_cutting_tools → array with count parity", async () => {
    const r = await invokeHandler(devHandler, "mca_all_cutting_tools", {});
    const wireCount = ((r as { count?: number }).count) ?? 0;
    const direct = manufacturerCatalogAIEngine.getAllCuttingTools();
    expect(wireCount).toBe(direct.length);
  });

  it("mca_bigdaishowa_families → array with count parity", async () => {
    const r = await invokeHandler(devHandler, "mca_bigdaishowa_families", {});
    const wireCount = ((r as { count?: number }).count) ?? 0;
    const direct = manufacturerCatalogAIEngine.getBigDaishowaFamilies();
    expect(wireCount).toBe(direct.length);
  });

  it("mca_vendor_trust → keys present + values in [0,1]", async () => {
    const r = await invokeHandler(devHandler, "mca_vendor_trust", {});
    const trust = (r as { vendor_trust: Record<string, number> }).vendor_trust;
    expect(typeof trust).toBe("object");
    expect(Object.keys(trust).length).toBeGreaterThan(0);
    for (const score of Object.values(trust)) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it("mca_catalog_paths → returns Record<manufacturer, path>", async () => {
    const r = await invokeHandler(devHandler, "mca_catalog_paths", {});
    const paths = (r as { catalog_paths: Record<string, string> }).catalog_paths;
    expect(typeof paths).toBe("object");
    expect(Object.keys(paths).length).toBeGreaterThan(0);
    for (const p of Object.values(paths)) {
      expect(typeof p).toBe("string");
      expect(p.length).toBeGreaterThan(0);
    }
  });

  it("ROUTING PROOF — wire vendor_trust byte-equals engine-direct", async () => {
    const r = await invokeHandler(devHandler, "mca_vendor_trust", {});
    const wire = (r as { vendor_trust: unknown }).vendor_trust;
    const direct = manufacturerCatalogAIEngine.getVendorTrustScores();
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MCA — prism_dev :: mca_feature_vector", () => {
  it("unknown id → vector is null", async () => {
    const r = await invokeHandler(devHandler, "mca_feature_vector", {
      item_id: "no-such-item-" + Date.now(),
    });
    const data = r as { vector?: unknown };
    expect((data.vector ?? null) === null).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MCA — prism_dev :: mca_search", () => {
  it("returns {results, counts} with totals matching constituents", async () => {
    const r = await invokeHandler(devHandler, "mca_search", { keyword: "chuck" });
    const data = r as { results: { holders: unknown[]; workholding: unknown[]; cutting_tools: unknown[] }; counts: { holders: number; workholding: number; cutting_tools: number; total: number } };
    expect(data.counts.holders).toBe((data.results.holders ?? []).length);
    expect(data.counts.workholding).toBe((data.results.workholding ?? []).length);
    expect(data.counts.cutting_tools).toBe((data.results.cutting_tools ?? []).length);
    expect(data.counts.total).toBe(data.counts.holders + data.counts.workholding + data.counts.cutting_tools);
  });

  it("nonexistent keyword → all zero counts", async () => {
    const r = await invokeHandler(devHandler, "mca_search", { keyword: "definitely_no_match_xyz_" + Date.now() });
    const data = r as { counts?: { total?: number } };
    expect((data.counts?.total as number | undefined) ?? 0).toBe(0);
  });

  it("ROUTING PROOF — wire result counts match engine-direct searchCatalog()", async () => {
    const r = await invokeHandler(devHandler, "mca_search", { keyword: "tool" });
    const wireCounts = (r as { counts?: { holders: number; workholding: number; cutting_tools: number } }).counts;
    const direct = manufacturerCatalogAIEngine.searchCatalog("tool");
    expect(wireCounts?.holders).toBe(direct.holders.length);
    expect(wireCounts?.workholding).toBe(direct.workholding.length);
    expect(wireCounts?.cutting_tools).toBe(direct.cutting_tools.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MCA — error envelope", () => {
  it("mca_feature_vector without item_id → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "mca_feature_vector", {});
    const data = r as { error?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });

  it("mca_search without keyword → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "mca_search", {});
    const data = r as { error?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });
});
