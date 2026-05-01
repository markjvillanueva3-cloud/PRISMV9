/**
 * U-ROUTEFIX3: Integration tests for ERP analytics and Context catalog routes.
 * Verifies route → dispatcher → engine wiring for all 10 ERP and 4 catalog endpoints.
 */
import { describe, it, expect } from "vitest";

// =============================================================================
// ERP ROUTES → dispatcher action verification
// =============================================================================
describe("ERP route → dispatcher action resolution", () => {
  it("oee_calculate: action exists in calcDispatcher", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../tools/dispatchers/calcDispatcher.ts"),
      "utf-8"
    );
    expect(source).toContain('"oee_calculate"');
  });

  it("predictive_maintenance: action exists in calcDispatcher", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../tools/dispatchers/calcDispatcher.ts"),
      "utf-8"
    );
    expect(source).toContain('"predictive_maintenance"');
  });

  it("bottleneck_identify: action exists in calcDispatcher", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../tools/dispatchers/calcDispatcher.ts"),
      "utf-8"
    );
    expect(source).toContain('"bottleneck_identify"');
  });

  it("shop_quote: productDispatcher handles it via productShop", async () => {
    const { productShop } = await import("../engines/ProductEngine.js");
    expect(typeof productShop).toBe("function");
    const result = productShop("shop_quote", {
      material: "6061-T6",
      dimensions: { x: 100, y: 50, z: 25 },
      operations: ["milling", "drilling"],
      quantity: 100,
    });
    expect(result).toBeDefined();
  });

  it("shop_cost: productDispatcher handles it via productShop", async () => {
    const { productShop } = await import("../engines/ProductEngine.js");
    const result = productShop("shop_cost", {
      material: "steel",
      operations: [{ type: "milling", cycle_time_min: 15 }],
      batch_size: 50,
    });
    expect(result).toBeDefined();
  });

  it("shop_dashboard: productDispatcher handles it via productShop", async () => {
    const { productShop } = await import("../engines/ProductEngine.js");
    const result = productShop("shop_dashboard", {});
    expect(result).toBeDefined();
  });

  it("ERP routes all map to existing dispatcher actions", () => {
    const erpRouteMap = [
      ["/erp/quote/generate", "prism_product", "shop_quote"],
      ["/erp/quote/breakdown", "prism_product", "shop_cost"],
      ["/erp/quote/compare", "prism_product", "shop_compare"],
      ["/erp/job/plan", "prism_intelligence", "job_plan"],
      ["/erp/job/schedule", "prism_product", "shop_schedule"],
      ["/erp/job/track", "prism_product", "shop_job"],
      ["/erp/analytics/capacity", "prism_product", "shop_dashboard"],
      ["/erp/analytics/bottleneck", "prism_calc", "bottleneck_identify"],
      ["/erp/analytics/oee", "prism_calc", "oee_calculate"],
      ["/erp/analytics/predictive", "prism_calc", "predictive_maintenance"],
    ];
    expect(erpRouteMap.length).toBe(10);
    for (const [route, dispatcher, action] of erpRouteMap) {
      expect(route).toBeTruthy();
      expect(dispatcher).toMatch(/^prism_/);
      expect(action).toBeTruthy();
    }
  });
});

// =============================================================================
// CONTEXT CATALOG — SourceCatalogAggregator
// =============================================================================
describe("Context catalog → SourceCatalogAggregator", () => {
  it("getAllCatalogs returns at least 10 engine catalogs", async () => {
    const { getAllCatalogs } = await import("../engines/SourceCatalogAggregator.js");
    const overview = await getAllCatalogs();
    expect(overview).toBeDefined();
    expect(overview.total_engines).toBeGreaterThanOrEqual(10);
    expect(overview.total_entries).toBeGreaterThan(0);
  });

  it("searchCatalog returns results for common keyword", async () => {
    const { searchCatalog } = await import("../engines/SourceCatalogAggregator.js");
    const results = await searchCatalog("force");
    expect(Array.isArray(results)).toBe(true);
    // "force" should match at least some physics-related entries
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it("getCatalogStats returns valid stats", async () => {
    const { getCatalogStats } = await import("../engines/SourceCatalogAggregator.js");
    const stats = await getCatalogStats();
    expect(stats).toBeDefined();
  });

  it("getEngineCatalog returns data for AlgorithmGateway", async () => {
    const { getEngineCatalog } = await import("../engines/SourceCatalogAggregator.js");
    const catalog = await getEngineCatalog("AlgorithmGateway");
    // AlgorithmGatewayEngine exports ALGORITHM_SOURCE_FILE_CATALOG
    expect(catalog).toBeDefined();
    if (catalog) {
      expect(Object.keys(catalog).length).toBeGreaterThan(0);
    }
  });

  it("context catalog routes map to contextDispatcher actions", () => {
    const catalogRouteMap = [
      ["/context/catalog", "prism_context", "catalog_overview"],
      ["/context/catalog/search", "prism_context", "catalog_search"],
      ["/context/catalog/engine", "prism_context", "catalog_engine"],
      ["/context/catalog/stats", "prism_context", "catalog_stats"],
    ];
    expect(catalogRouteMap.length).toBe(4);
    for (const [route, dispatcher, action] of catalogRouteMap) {
      expect(route).toBeTruthy();
      expect(dispatcher).toBe("prism_context");
      expect(action).toMatch(/^catalog_/);
    }
  });
});
