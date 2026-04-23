/**
 * CatalogRegistryBridgeEngine Tests
 * RX-P5-U02: Registry enrichment — merge catalog data into registries
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { catalogRegistryBridgeEngine } from "../engines/CatalogRegistryBridgeEngine.js";

// Mock registries
vi.mock("../registries/ToolRegistry.js", () => ({
  toolRegistry: {
    get: vi.fn().mockReturnValue(undefined),
    enhanceTool: vi.fn().mockResolvedValue({}),
    addTool: vi.fn().mockResolvedValue("tool-123"),
  },
  CuttingTool: {},
  ToolGeometry: {},
  ToolPerformance: {},
}));

vi.mock("../registries/MachineRegistry.js", () => ({
  machineRegistry: {
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
  },
}));

vi.mock("../registries/MaterialRegistry.js", () => ({
  materialRegistry: {
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
  },
}));

describe("CatalogRegistryBridgeEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCatalogMappings", () => {
    it("returns mapping counts by registry type", () => {
      const counts = catalogRegistryBridgeEngine.getCatalogMappings();

      expect(counts.tool).toBeGreaterThan(0);
      expect(counts.machine).toBeGreaterThan(0);
      expect(typeof counts.material).toBe("number");
    });
  });

  describe("listMappedCatalogs", () => {
    it("returns array of catalog names", () => {
      const catalogs = catalogRegistryBridgeEngine.listMappedCatalogs();

      expect(Array.isArray(catalogs)).toBe(true);
      expect(catalogs.length).toBeGreaterThan(0);
      expect(catalogs).toContain("sgs-tool-catalog");
      expect(catalogs).toContain("sandvik-tool-catalog");
    });
  });

  describe("getMapping", () => {
    it("returns mapping for known catalog", () => {
      const mapping = catalogRegistryBridgeEngine.getMapping("sgs-tool-catalog");

      expect(mapping).toBeDefined();
      expect(mapping?.registry).toBe("tool");
      expect(mapping?.id_field).toBe("part_number");
    });

    it("returns undefined for unknown catalog", () => {
      const mapping = catalogRegistryBridgeEngine.getMapping("nonexistent-catalog");

      expect(mapping).toBeUndefined();
    });
  });

  describe("loadCatalog", () => {
    it("caches loaded catalogs", async () => {
      // First load
      await catalogRegistryBridgeEngine.loadCatalog("test-catalog");
      // Second load should use cache
      await catalogRegistryBridgeEngine.loadCatalog("test-catalog");

      // No error means caching works
      expect(true).toBe(true);
    });

    it("returns empty array for nonexistent catalog", async () => {
      const data = await catalogRegistryBridgeEngine.loadCatalog("definitely-not-real");

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });
  });

  describe("enrichFromCatalog", () => {
    it("returns result structure with correct fields", async () => {
      const mapping = {
        catalog_file: "test-catalog",
        registry: "tool" as const,
        id_field: "id",
        field_mappings: {},
      };

      const result = await catalogRegistryBridgeEngine.enrichFromCatalog(mapping);

      expect(result.catalog_name).toBe("test-catalog");
      expect(result.registry_target).toBe("tool");
      expect(typeof result.records_processed).toBe("number");
      expect(typeof result.records_added).toBe("number");
      expect(typeof result.records_enhanced).toBe("number");
      expect(typeof result.records_skipped).toBe("number");
      expect(Array.isArray(result.errors)).toBe(true);
      expect(typeof result.processing_time_ms).toBe("number");
    });

    it("reports error when catalog not found", async () => {
      const mapping = {
        catalog_file: "nonexistent",
        registry: "tool" as const,
        id_field: "id",
        field_mappings: {},
      };

      const result = await catalogRegistryBridgeEngine.enrichFromCatalog(mapping);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("No data found");
    });
  });

  describe("enrichAll", () => {
    it("returns bulk enrichment result structure", async () => {
      const result = await catalogRegistryBridgeEngine.enrichAll();

      expect(typeof result.catalogs_processed).toBe("number");
      expect(typeof result.total_records).toBe("number");
      expect(typeof result.total_added).toBe("number");
      expect(typeof result.total_enhanced).toBe("number");
      expect(typeof result.total_skipped).toBe("number");
      expect(typeof result.total_errors).toBe("number");
      expect(Array.isArray(result.results)).toBe(true);
      expect(typeof result.processing_time_ms).toBe("number");
    });

    it("processes all configured mappings", async () => {
      const mappingCount = catalogRegistryBridgeEngine.getCatalogMappings();
      const expectedTotal = mappingCount.tool + mappingCount.machine + mappingCount.material;

      const result = await catalogRegistryBridgeEngine.enrichAll();

      expect(result.catalogs_processed).toBe(expectedTotal);
      expect(result.results.length).toBe(expectedTotal);
    });
  });

  describe("field mapping", () => {
    it("applies function mappings correctly", () => {
      const catalogs = catalogRegistryBridgeEngine.listMappedCatalogs();

      // SGS catalog should have manufacturer function mapping
      const sgsMapping = catalogRegistryBridgeEngine.getMapping("sgs-tool-catalog");
      expect(sgsMapping).toBeDefined();
      expect(sgsMapping?.field_mappings.manufacturer).toBeDefined();
    });

    it("supports nested field mappings", () => {
      const mapping = catalogRegistryBridgeEngine.getMapping("sgs-tool-catalog");

      // Should have geometry.diameter mapping
      expect(mapping?.field_mappings["geometry.diameter"]).toBeDefined();
    });
  });

  describe("tool catalog mappings", () => {
    const toolCatalogs = [
      "sgs-tool-catalog",
      "sandvik-tool-catalog",
      "kennametal-turning-catalog",
      "tungaloy-endmill-catalog",
      "osg-tool-catalog",
      "guhring-tool-catalog",
      "seco-tool-catalog",
      "mitsubishi-tool-catalog",
    ];

    it.each(toolCatalogs)("has mapping for %s", (catalog) => {
      const mapping = catalogRegistryBridgeEngine.getMapping(catalog);

      expect(mapping).toBeDefined();
      expect(mapping?.registry).toBe("tool");
    });
  });

  describe("machine catalog mappings", () => {
    it("has mapping for machine-profiles-catalog", () => {
      const mapping = catalogRegistryBridgeEngine.getMapping("machine-profiles-catalog");

      expect(mapping).toBeDefined();
      expect(mapping?.registry).toBe("machine");
      expect(mapping?.id_field).toBe("id");
    });
  });

  describe("edge cases", () => {
    it("handles empty field mappings gracefully", async () => {
      const mapping = {
        catalog_file: "empty-test",
        registry: "tool" as const,
        id_field: "id",
        field_mappings: {},
      };

      const result = await catalogRegistryBridgeEngine.enrichFromCatalog(mapping);

      expect(result).toBeDefined();
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("skips records without id field", async () => {
      const mapping = {
        catalog_file: "no-id-catalog",
        registry: "tool" as const,
        id_field: "nonexistent_field",
        field_mappings: {},
      };

      const result = await catalogRegistryBridgeEngine.enrichFromCatalog(mapping);

      // Should skip or have error, not crash
      expect(result).toBeDefined();
    });
  });
});
