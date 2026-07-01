/**
 * DistributorSearchEngine.test.ts — hotel iter10 / U-DISTRIBUTOR-SEARCH.
 * Tests provider registration + fan-out search + region filtering + cache
 * invalidation + R12 fail-loud query validation + per-provider error isolation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  DistributorSearchEngine,
  distributorSearchEngine,
  type DistributorProvider,
  type DistributorSearchInput,
  type DistributorSearchResult,
  type ProductCategory,
} from "../engines/DistributorSearchEngine.js";

const QUERY_CARBIDE = "carbide";
const QUERY_M6 = "M6";
const QUERY_LOCATING_PIN = "locating pin";
const QUERY_NEVER_MATCHES = "zzzzz-never-matches-anything-zzzzz";
const MAX_RESULTS_SMALL = 3;
const QUERY_OVERSIZE_LEN = 300;

function freshEngine(): DistributorSearchEngine {
  return new DistributorSearchEngine();
}

const DEFAULT_PROVIDER_MAX_RESULTS = 10;  // matches engine's default-per-provider cap

function makeMockProvider(id: string, results: DistributorSearchResult[], opts: { regions?: string[]; categories?: ProductCategory[]; throws?: boolean } = {}): DistributorProvider {
  return {
    id,
    displayName: `Mock ${id}`,
    categories: opts.categories ?? ["cutting_tool"],
    hasLiveApi: false,
    regions: opts.regions ?? ["US"],
    async search(input: DistributorSearchInput): Promise<DistributorSearchResult[]> {
      if (opts.throws) throw new Error(`provider ${id} simulated failure`);
      // Honor maxResults like real providers do (the engine doesn't trim per-provider).
      return results.slice(0, input.maxResults ?? DEFAULT_PROVIDER_MAX_RESULTS);
    },
  };
}

describe("DistributorSearchEngine — provider registry", () => {
  let engine: DistributorSearchEngine;
  beforeEach(() => { engine = freshEngine(); });

  it("ships with 5 reference providers by default (MSC, McMaster, Misumi, Grainger, Fastenal)", () => {
    const providers = engine.listProviders();
    const ids = providers.map(p => p.id).sort();
    expect(ids).toEqual(["fastenal", "grainger", "mcmaster", "misumi", "msc"]);
  });

  it("registerProvider replaces an existing id without throwing", () => {
    const mock = makeMockProvider("msc", []);
    engine.registerProvider(mock);
    const providers = engine.listProviders();
    expect(providers.length).toBe(5);  // still 5 — msc replaced not added
    expect(providers.find(p => p.id === "msc")?.displayName).toBe("Mock msc");
  });

  it("registerProvider rejects missing id", () => {
    expect(() => engine.registerProvider({ ...makeMockProvider("", []), id: "" }))
      .toThrow(/id required/);
  });

  it("setProviderApiKey rejects key shorter than 8 chars", () => {
    expect(() => engine.setProviderApiKey("msc", "short")).toThrow(/apiKey required/);
  });

  it("setProviderApiKey returns had_prior_key=true on second call to same provider", () => {
    const first = engine.setProviderApiKey("msc", "first-key-12345");
    const second = engine.setProviderApiKey("msc", "second-key-67890");
    expect(first.had_prior_key).toBe(false);
    expect(second.had_prior_key).toBe(true);
  });

  it("listProviders exposes hasApiKey flag for each provider", () => {
    engine.setProviderApiKey("msc", "my-api-key-1234");
    const providers = engine.listProviders();
    expect(providers.find(p => p.id === "msc")?.hasApiKey).toBe(true);
    expect(providers.find(p => p.id === "mcmaster")?.hasApiKey).toBe(false);
  });
});

describe("DistributorSearchEngine — search fan-out + sorting", () => {
  let engine: DistributorSearchEngine;
  beforeEach(() => { engine = freshEngine(); });

  it("aggregates results from multiple providers for a matching query", async () => {
    const res = await engine.search({ query: QUERY_CARBIDE });
    expect(res.result_count).toBeGreaterThan(0);
    // MSC reference includes carbide endmills → at least 1 msc result
    expect(res.results.some(r => r.provider_id === "msc")).toBe(true);
  });

  it("returns empty results (not throw) when nothing matches", async () => {
    const res = await engine.search({ query: QUERY_NEVER_MATCHES });
    expect(res.result_count).toBe(0);
    expect(res.results).toEqual([]);
    expect(res.best_buy === null).toBe(true);
  });

  it("filters by category when supplied", async () => {
    const res = await engine.search({ query: QUERY_M6, category: "fastener" });
    expect(res.result_count).toBeGreaterThan(0);
    for (const r of res.results) expect(r.category).toBe("fastener");
  });

  it("filters by region (US-only Misumi result excluded for region=DE)", async () => {
    const res = await engine.search({ query: QUERY_LOCATING_PIN, region: "DE" });
    expect(res.result_count).toBe(0);
  });

  it("sorts in-stock results first, then by price asc", async () => {
    const cheapStock = { provider_id: "p1", provider_name: "Mock p1", sku: "C1", title: "carbide cheap", category: "cutting_tool" as ProductCategory, price_usd: 10.00, in_stock: true,  fetched_at: "", mode: "reference" as const };
    const expStock  = { provider_id: "p1", provider_name: "Mock p1", sku: "C2", title: "carbide pricey", category: "cutting_tool" as ProductCategory, price_usd: 99.00, in_stock: true,  fetched_at: "", mode: "reference" as const };
    const outStock  = { provider_id: "p1", provider_name: "Mock p1", sku: "C3", title: "carbide oos",   category: "cutting_tool" as ProductCategory, price_usd: 1.00,  in_stock: false, fetched_at: "", mode: "reference" as const };
    engine.registerProvider(makeMockProvider("p1", [expStock, cheapStock, outStock]));
    const res = await engine.search({ query: QUERY_CARBIDE });
    const p1Results = res.results.filter(r => r.provider_id === "p1");
    expect(p1Results[0].sku).toBe("C1");  // in-stock + cheapest
    expect(p1Results[1].sku).toBe("C2");  // in-stock + pricier
    expect(p1Results[p1Results.length - 1].sku).toBe("C3");  // out-of-stock last
  });

  it("best_buy is the top-sorted result (in-stock + cheapest)", async () => {
    const res = await engine.search({ query: QUERY_CARBIDE });
    expect(res.best_buy !== null).toBe(true);
    expect(res.best_buy?.in_stock === true || res.best_buy?.in_stock === undefined).toBe(true);
  });

  it("respects maxResults per provider", async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      provider_id: "many", provider_name: "Many", sku: `S-${i}`, title: `carbide item ${i}`,
      category: "cutting_tool" as ProductCategory, price_usd: i + 1, in_stock: true,
      fetched_at: "", mode: "reference" as const,
    }));
    engine.registerProvider(makeMockProvider("many", many));
    const res = await engine.search({ query: QUERY_CARBIDE, maxResults: MAX_RESULTS_SMALL });
    const manyResults = res.results.filter(r => r.provider_id === "many");
    expect(manyResults.length).toBe(MAX_RESULTS_SMALL);
  });
});

describe("DistributorSearchEngine — per-provider error isolation", () => {
  let engine: DistributorSearchEngine;
  beforeEach(() => { engine = freshEngine(); });

  it("a single provider throw lands in response.errors without breaking the search", async () => {
    engine.registerProvider(makeMockProvider("flaky", [], { throws: true }));
    const res = await engine.search({ query: QUERY_CARBIDE });
    expect(res.errors.some(e => e.provider_id === "flaky")).toBe(true);
    // Still got results from the other (working) providers
    expect(res.result_count).toBeGreaterThan(0);
  });

  it("error includes the original throw message", async () => {
    engine.registerProvider(makeMockProvider("flaky", [], { throws: true }));
    const res = await engine.search({ query: QUERY_CARBIDE });
    const err = res.errors.find(e => e.provider_id === "flaky");
    expect(err?.message).toMatch(/simulated failure/);
  });
});

describe("DistributorSearchEngine — query validation (R12 fail-loud)", () => {
  let engine: DistributorSearchEngine;
  beforeEach(() => { engine = freshEngine(); });

  it("rejects empty query", async () => {
    await expect(engine.search({ query: "" })).rejects.toThrow(/empty/);
  });

  it("rejects whitespace-only query", async () => {
    await expect(engine.search({ query: "   " })).rejects.toThrow(/empty/);
  });

  it("rejects query > MAX_QUERY_CHARS", async () => {
    await expect(engine.search({ query: "x".repeat(QUERY_OVERSIZE_LEN) })).rejects.toThrow(/exceeds/);
  });

  it("rejects non-string query (R12 typed-throw)", async () => {
    await expect(engine.search({ query: null as unknown as string })).rejects.toThrow(/must be a string/);
  });

  it("rejects query with control characters", async () => {
    await expect(engine.search({ query: "carbidebeep" })).rejects.toThrow(/control characters/);
  });
});

describe("DistributorSearchEngine — cache + reset", () => {
  let engine: DistributorSearchEngine;
  beforeEach(() => { engine = freshEngine(); });

  it("second identical search returns cached response (instance-stable result_count)", async () => {
    const a = await engine.search({ query: QUERY_CARBIDE });
    const b = await engine.search({ query: QUERY_CARBIDE });
    expect(a.result_count).toBe(b.result_count);
  });

  it("invalidateCache + new search re-runs providers (different fetched_at)", async () => {
    const a = await engine.search({ query: QUERY_CARBIDE });
    const aTs = a.fetched_at;
    await new Promise(r => setTimeout(r, 5));
    engine.invalidateCache();
    const c = await engine.search({ query: QUERY_CARBIDE });
    expect(c.fetched_at).not.toBe(aTs);
  });

  it("registerProvider invalidates cache (next search includes the new provider)", async () => {
    await engine.search({ query: QUERY_CARBIDE });
    engine.registerProvider(makeMockProvider("late", [
      { provider_id: "late", provider_name: "Late", sku: "L1", title: "carbide late-entry", category: "cutting_tool", price_usd: 0.01, in_stock: true, fetched_at: "", mode: "reference" },
    ]));
    const res = await engine.search({ query: QUERY_CARBIDE });
    expect(res.results.some(r => r.provider_id === "late")).toBe(true);
    expect(res.best_buy?.sku).toBe("L1");  // cheapest in-stock
  });

  it("reset() drops keys + cache + re-seeds 5 reference providers", () => {
    engine.setProviderApiKey("msc", "test-key-1234");
    engine.reset();
    expect(engine.listProviders().length).toBe(5);
    expect(engine.listProviders().find(p => p.id === "msc")?.hasApiKey).toBe(false);
  });

  it("module exports a usable singleton", async () => {
    distributorSearchEngine.reset();
    const res = await distributorSearchEngine.search({ query: QUERY_CARBIDE });
    expect(res.provider_count).toBeGreaterThan(0);
    distributorSearchEngine.reset();
  });
});
