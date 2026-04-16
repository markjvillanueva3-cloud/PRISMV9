/**
 * PostProcessorComprehensiveKnowledgeEngine Tests
 * =================================================
 * Tests for the comprehensive knowledge engine that indexes
 * every machine, material, tool, holder, fixture, and program.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  postProcessorComprehensiveKnowledgeEngine,
  MACHINE_CATALOG_INDEX,
  MATERIAL_CATALOG_INDEX,
  TOOL_CATALOG_INDEX,
  HOLDER_CATALOG_INDEX,
  FIXTURE_CATALOG_INDEX,
  H_DRIVE_RESOURCES
} from "../engines/PostProcessorComprehensiveKnowledgeEngine.js";

describe("PostProcessorComprehensiveKnowledgeEngine", () => {
  beforeEach(() => {
    postProcessorComprehensiveKnowledgeEngine.clearIngestedAssets();
  });

  describe("Statistics", () => {
    it("should return comprehensive statistics", () => {
      const stats = postProcessorComprehensiveKnowledgeEngine.getStatistics();

      expect(stats.version).toBe("1.0.0");
      expect(stats.catalogs.total).toBeGreaterThan(40);
      expect(stats.entries.total).toBeGreaterThan(30000);
      expect(stats.hDriveResources).toBeGreaterThan(5);
    });

    it("should count catalog types", () => {
      const stats = postProcessorComprehensiveKnowledgeEngine.getStatistics();

      expect(stats.catalogs.machines).toBeGreaterThan(5);
      expect(stats.catalogs.materials).toBeGreaterThan(2);
      expect(stats.catalogs.tools).toBeGreaterThan(15);
      expect(stats.catalogs.holders).toBeGreaterThan(4);
      expect(stats.catalogs.fixtures).toBeGreaterThan(3);
    });

    it("should list unique brands", () => {
      const stats = postProcessorComprehensiveKnowledgeEngine.getStatistics();

      expect(stats.uniqueBrands.length).toBeGreaterThan(20);
      expect(stats.uniqueBrands.some(b => b.includes("Haas"))).toBe(true);
      expect(stats.uniqueBrands.some(b => b.includes("Sandvik"))).toBe(true);
    });
  });

  describe("Machine Catalogs", () => {
    it("should have machine catalogs", () => {
      const catalogs = postProcessorComprehensiveKnowledgeEngine.getMachineCatalogs();
      expect(catalogs.length).toBeGreaterThanOrEqual(9);
    });

    it("should cover 200+ machines", () => {
      const catalogs = postProcessorComprehensiveKnowledgeEngine.getMachineCatalogs();
      const total = catalogs.reduce((sum, c) => sum + c.estimatedEntries, 0);
      expect(total).toBeGreaterThan(200);
    });

    it("should have machine-profiles catalog", () => {
      const catalogs = postProcessorComprehensiveKnowledgeEngine.getMachineCatalogs();
      expect(catalogs.some(c => c.id === "machine-profiles")).toBe(true);
    });

    it("should cover major brands", () => {
      const catalogs = postProcessorComprehensiveKnowledgeEngine.getMachineCatalogs();
      const mainCatalog = catalogs.find(c => c.id === "machine-profiles");
      expect(mainCatalog?.coverageBrands).toContain("Haas");
      expect(mainCatalog?.coverageBrands).toContain("Okuma");
      expect(mainCatalog?.coverageBrands).toContain("Mazak");
    });

    it("should include WEDM machines", () => {
      const catalogs = postProcessorComprehensiveKnowledgeEngine.getMachineCatalogs();
      expect(catalogs.some(c => c.id === "wedm-published")).toBe(true);
    });
  });

  describe("Material Catalogs", () => {
    it("should have material catalogs", () => {
      const catalogs = postProcessorComprehensiveKnowledgeEngine.getMaterialCatalogs();
      expect(catalogs.length).toBeGreaterThanOrEqual(3);
    });

    it("should have hyperMILL materials", () => {
      const catalogs = postProcessorComprehensiveKnowledgeEngine.getMaterialCatalogs();
      expect(catalogs.some(c => c.id === "hypermill-materials")).toBe(true);
    });

    it("should cover 2000+ materials", () => {
      const catalogs = postProcessorComprehensiveKnowledgeEngine.getMaterialCatalogs();
      const total = catalogs.reduce((sum, c) => sum + c.estimatedEntries, 0);
      expect(total).toBeGreaterThan(2000);
    });

    it("should include canonical materials", () => {
      const catalogs = postProcessorComprehensiveKnowledgeEngine.getMaterialCatalogs();
      expect(catalogs.some(c => c.id === "canonical-materials")).toBe(true);
    });

    it("should include EDM materials", () => {
      const catalogs = postProcessorComprehensiveKnowledgeEngine.getMaterialCatalogs();
      expect(catalogs.some(c => c.id === "edm-materials")).toBe(true);
    });
  });

  describe("Tool Catalogs", () => {
    it("should have tool catalogs", () => {
      const catalogs = postProcessorComprehensiveKnowledgeEngine.getToolCatalogs();
      expect(catalogs.length).toBeGreaterThanOrEqual(15);
    });

    it("should cover 5000+ tools", () => {
      const catalogs = postProcessorComprehensiveKnowledgeEngine.getToolCatalogs();
      const total = catalogs.reduce((sum, c) => sum + c.estimatedEntries, 0);
      expect(total).toBeGreaterThan(5000);
    });

    it("should have Sandvik catalogs", () => {
      const catalogs = postProcessorComprehensiveKnowledgeEngine.getToolCatalogs();
      expect(catalogs.some(c => c.id === "sandvik")).toBe(true);
    });

    it("should have Kennametal catalog", () => {
      const catalogs = postProcessorComprehensiveKnowledgeEngine.getToolCatalogs();
      expect(catalogs.some(c => c.id === "kennametal")).toBe(true);
    });

    it("should cover major tool brands", () => {
      const catalogs = postProcessorComprehensiveKnowledgeEngine.getToolCatalogs();
      const brands = new Set(catalogs.flatMap(c => c.coverageBrands));

      expect(brands.has("Sandvik Coromant") || brands.has("Sandvik")).toBe(true);
      expect(brands.has("Kennametal")).toBe(true);
      expect(brands.has("Seco")).toBe(true);
    });
  });

  describe("Holder Catalogs", () => {
    it("should have holder catalogs", () => {
      const catalogs = postProcessorComprehensiveKnowledgeEngine.getHolderCatalogs();
      expect(catalogs.length).toBeGreaterThanOrEqual(5);
    });

    it("should have BIG DAISHOWA catalog", () => {
      const catalogs = postProcessorComprehensiveKnowledgeEngine.getHolderCatalogs();
      expect(catalogs.some(c => c.id === "big-daishowa")).toBe(true);
    });

    it("should have Haimer catalog", () => {
      const catalogs = postProcessorComprehensiveKnowledgeEngine.getHolderCatalogs();
      expect(catalogs.some(c => c.id === "haimer")).toBe(true);
    });

    it("should have REGO-FIX catalog", () => {
      const catalogs = postProcessorComprehensiveKnowledgeEngine.getHolderCatalogs();
      expect(catalogs.some(c => c.id === "regofix")).toBe(true);
    });
  });

  describe("Fixture Catalogs", () => {
    it("should have fixture catalogs", () => {
      const catalogs = postProcessorComprehensiveKnowledgeEngine.getFixtureCatalogs();
      expect(catalogs.length).toBeGreaterThanOrEqual(4);
    });

    it("should have Orange Vise specs", () => {
      const catalogs = postProcessorComprehensiveKnowledgeEngine.getFixtureCatalogs();
      expect(catalogs.some(c => c.id === "orange-vise")).toBe(true);
    });

    it("should have zero-point specs", () => {
      const catalogs = postProcessorComprehensiveKnowledgeEngine.getFixtureCatalogs();
      expect(catalogs.some(c => c.id === "zero-point")).toBe(true);
    });

    it("should have soft jaw specs", () => {
      const catalogs = postProcessorComprehensiveKnowledgeEngine.getFixtureCatalogs();
      expect(catalogs.some(c => c.id === "soft-jaws")).toBe(true);
    });
  });

  describe("H Drive Resources", () => {
    it("should track H drive resources", () => {
      const resources = postProcessorComprehensiveKnowledgeEngine.getHDriveResources();
      expect(resources.length).toBeGreaterThan(5);
    });

    it("should know JM Die programs", () => {
      const resources = postProcessorComprehensiveKnowledgeEngine.getHDriveResources();
      const jmDie = resources.find(r => r.category === "JM Die Programs");
      expect(jmDie).toBeDefined();
      expect(jmDie?.estimatedCount).toBeGreaterThan(20000);
    });

    it("should know post processor configs", () => {
      const resources = postProcessorComprehensiveKnowledgeEngine.getHDriveResources();
      expect(resources.some(r => r.category === "Post Processor Configs")).toBe(true);
    });

    it("should know hyperMILL files", () => {
      const resources = postProcessorComprehensiveKnowledgeEngine.getHDriveResources();
      expect(resources.some(r => r.category === "hyperMILL Files")).toBe(true);
    });

    it("should track tool holder CAD", () => {
      const resources = postProcessorComprehensiveKnowledgeEngine.getHDriveResources();
      expect(resources.some(r => r.category === "Tool Holder CAD")).toBe(true);
    });

    it("should track workholding catalogs", () => {
      const resources = postProcessorComprehensiveKnowledgeEngine.getHDriveResources();
      expect(resources.some(r => r.category === "Workholding Catalogs")).toBe(true);
    });
  });

  describe("Catalog Lookup", () => {
    it("should get catalog by ID", () => {
      const catalog = postProcessorComprehensiveKnowledgeEngine.getCatalog("sandvik");
      expect(catalog).toBeDefined();
      expect(catalog?.type).toBe("tool");
    });

    it("should return undefined for unknown catalog", () => {
      const catalog = postProcessorComprehensiveKnowledgeEngine.getCatalog("nonexistent");
      expect(catalog).toBeUndefined();
    });

    it("should find catalogs by brand", () => {
      const sandvikCatalogs = postProcessorComprehensiveKnowledgeEngine.findCatalogsByBrand("sandvik");
      expect(sandvikCatalogs.length).toBeGreaterThan(0);
    });

    it("should find catalogs by Haas brand", () => {
      const haasCatalogs = postProcessorComprehensiveKnowledgeEngine.findCatalogsByBrand("haas");
      expect(haasCatalogs.length).toBeGreaterThan(0);
    });
  });

  describe("Query Routing", () => {
    it("should route machine query", () => {
      const result = postProcessorComprehensiveKnowledgeEngine.routeQuery("haas machine");
      expect(result.totalMatches).toBeGreaterThan(0);
      expect(result.suggestedCatalogs).toContain("machine-profiles");
    });

    it("should route material query", () => {
      const result = postProcessorComprehensiveKnowledgeEngine.routeQuery("titanium material");
      expect(result.suggestedCatalogs).toContain("hypermill-materials");
    });

    it("should route tool query", () => {
      const result = postProcessorComprehensiveKnowledgeEngine.routeQuery("end mill tool");
      expect(result.suggestedCatalogs).toContain("sandvik");
    });

    it("should route holder query", () => {
      const result = postProcessorComprehensiveKnowledgeEngine.routeQuery("shrink fit holder");
      expect(result.suggestedCatalogs).toContain("big-daishowa");
    });

    it("should route fixture query", () => {
      const result = postProcessorComprehensiveKnowledgeEngine.routeQuery("workholding vise");
      expect(result.suggestedCatalogs).toContain("orange-vise");
    });

    it("should count matches by type", () => {
      const result = postProcessorComprehensiveKnowledgeEngine.routeQuery("Sandvik");
      expect(result.byType).toBeDefined();
    });
  });

  describe("Runtime Ingestion", () => {
    it("should ingest a new machine", () => {
      const asset = postProcessorComprehensiveKnowledgeEngine.ingestMachine({
        id: "new-haas-umc-1000",
        name: "Haas UMC-1000 5-Axis",
        brand: "Haas",
        controller: "Haas NGC",
        axes: 5
      });

      expect(asset.type).toBe("machine");
      expect(asset.brand).toBe("Haas");
      expect(asset.specs?.axes).toBe(5);
    });

    it("should ingest a new material", () => {
      const asset = postProcessorComprehensiveKnowledgeEngine.ingestMaterial({
        id: "custom-d2-tool-steel",
        name: "D2 Tool Steel (Custom Heat)",
        isoGroup: "H",
        hardness_HB: 260
      });

      expect(asset.type).toBe("material");
      expect(asset.category).toContain("ISO H");
    });

    it("should ingest a new tool", () => {
      const asset = postProcessorComprehensiveKnowledgeEngine.ingestTool({
        id: "custom-endmill-001",
        designation: "Custom 4-Flute 1/2\" Carbide",
        brand: "Harvey",
        type: "end_mill",
        diameter_mm: 12.7
      });

      expect(asset.type).toBe("tool");
      expect(asset.brand).toBe("Harvey");
    });

    it("should ingest a new holder", () => {
      const asset = postProcessorComprehensiveKnowledgeEngine.ingestHolder({
        id: "custom-chuck-001",
        model: "Custom HSK63A Chuck",
        brand: "Lyndex",
        type: "hydraulic_chuck"
      });

      expect(asset.type).toBe("holder");
      expect(asset.brand).toBe("Lyndex");
    });

    it("should ingest a new fixture", () => {
      const asset = postProcessorComprehensiveKnowledgeEngine.ingestFixture({
        id: "custom-vise-001",
        model: "Kurt DX6 6-inch vise",
        brand: "Kurt",
        type: "vise"
      });

      expect(asset.type).toBe("fixture");
      expect(asset.brand).toBe("Kurt");
    });

    it("should ingest a new program", () => {
      const asset = postProcessorComprehensiveKnowledgeEngine.ingestProgram({
        id: "new-alcoa-program-001",
        filename: "ALCOA_PART_REV3.MIN",
        customer: "ALCOA",
        machine: "Okuma LB3000",
        operations: ["roughing", "finishing"],
        path: "H:/PRISM/JM DIE/OKUMA/ALCOA/ALCOA_PART_REV3.MIN"
      });

      expect(asset.type).toBe("program");
      expect(asset.brand).toBe("ALCOA");
    });

    it("should track runtime-ingested assets", () => {
      postProcessorComprehensiveKnowledgeEngine.ingestMachine({
        id: "m1", name: "Machine 1", brand: "Haas", controller: "NGC", axes: 3
      });
      postProcessorComprehensiveKnowledgeEngine.ingestTool({
        id: "t1", designation: "Tool 1", brand: "Sandvik", type: "drill", diameter_mm: 10
      });

      const all = postProcessorComprehensiveKnowledgeEngine.getIngestedAssets();
      expect(all.length).toBe(2);
    });

    it("should get ingested assets by type", () => {
      postProcessorComprehensiveKnowledgeEngine.ingestMachine({
        id: "m1", name: "M1", brand: "Haas", controller: "NGC", axes: 3
      });
      postProcessorComprehensiveKnowledgeEngine.ingestMachine({
        id: "m2", name: "M2", brand: "Okuma", controller: "OSP", axes: 3
      });
      postProcessorComprehensiveKnowledgeEngine.ingestTool({
        id: "t1", designation: "T1", brand: "Sandvik", type: "drill", diameter_mm: 10
      });

      const machines = postProcessorComprehensiveKnowledgeEngine.getIngestedAssetsByType("machine");
      expect(machines.length).toBe(2);
    });

    it("should find ingested asset by ID", () => {
      postProcessorComprehensiveKnowledgeEngine.ingestMachine({
        id: "m-lookup", name: "Test Machine", brand: "Test", controller: "NGC", axes: 3
      });

      const found = postProcessorComprehensiveKnowledgeEngine.getIngestedAsset("m-lookup");
      expect(found).toBeDefined();
      expect(found?.name).toBe("Test Machine");
    });

    it("should remove ingested asset", () => {
      postProcessorComprehensiveKnowledgeEngine.ingestMachine({
        id: "m-remove", name: "Temp", brand: "Test", controller: "NGC", axes: 3
      });

      expect(postProcessorComprehensiveKnowledgeEngine.getIngestedAsset("m-remove")).toBeDefined();
      postProcessorComprehensiveKnowledgeEngine.removeIngestedAsset("m-remove");
      expect(postProcessorComprehensiveKnowledgeEngine.getIngestedAsset("m-remove")).toBeUndefined();
    });

    it("should include ingestion timestamp", () => {
      const before = new Date().toISOString();
      const asset = postProcessorComprehensiveKnowledgeEngine.ingestMachine({
        id: "m-time", name: "T", brand: "T", controller: "NGC", axes: 3
      });
      const after = new Date().toISOString();

      expect(asset.ingestedAt).toBeDefined();
      expect(asset.ingestedAt >= before).toBe(true);
      expect(asset.ingestedAt <= after).toBe(true);
    });
  });

  describe("Bulk Ingestion", () => {
    it("should bulk ingest multiple assets", () => {
      const result = postProcessorComprehensiveKnowledgeEngine.bulkIngest([
        { id: "bulk-1", type: "machine", name: "M1", source: "test" },
        { id: "bulk-2", type: "tool", name: "T1", source: "test" },
        { id: "bulk-3", type: "material", name: "Mat1", source: "test" }
      ]);

      expect(result.ingested).toBe(3);
      expect(result.errors.length).toBe(0);
    });

    it("should detect duplicate IDs in bulk ingest", () => {
      postProcessorComprehensiveKnowledgeEngine.ingestAsset({
        id: "dup", type: "machine", name: "Original", source: "test"
      });

      const result = postProcessorComprehensiveKnowledgeEngine.bulkIngest([
        { id: "dup", type: "machine", name: "Duplicate", source: "test" },
        { id: "new", type: "tool", name: "New", source: "test" }
      ]);

      expect(result.ingested).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].id).toBe("dup");
    });
  });

  describe("Query with Runtime Assets", () => {
    it("should find runtime-ingested assets in queries", () => {
      postProcessorComprehensiveKnowledgeEngine.ingestMachine({
        id: "unique-test-machine-xyz",
        name: "UniqueTestXYZ",
        brand: "SpecialBrand",
        controller: "NGC",
        axes: 5
      });

      const result = postProcessorComprehensiveKnowledgeEngine.routeQuery("UniqueTestXYZ");
      expect(result.totalMatches).toBeGreaterThan(0);
    });
  });

  describe("AI Context Generation", () => {
    it("should generate AI context", () => {
      const context = postProcessorComprehensiveKnowledgeEngine.getContextForAI();

      expect(context).toContain("COMPREHENSIVE KNOWLEDGE ENGINE");
      expect(context).toContain("Machines:");
      expect(context).toContain("Materials:");
      expect(context).toContain("Tools:");
      expect(context).toContain("JM Die");
    });

    it("should include brand coverage in context", () => {
      const context = postProcessorComprehensiveKnowledgeEngine.getContextForAI();

      expect(context).toContain("Haas");
      expect(context).toContain("Sandvik");
      expect(context).toContain("BIG DAISHOWA");
    });

    it("should include ingestion methods", () => {
      const context = postProcessorComprehensiveKnowledgeEngine.getContextForAI();

      expect(context).toContain("ingestMachine");
      expect(context).toContain("ingestMaterial");
      expect(context).toContain("ingestTool");
      expect(context).toContain("ingestHolder");
      expect(context).toContain("ingestFixture");
      expect(context).toContain("ingestProgram");
    });
  });

  describe("Totals", () => {
    it("should sum all entries correctly", () => {
      const totals = postProcessorComprehensiveKnowledgeEngine.getTotalEntries();

      expect(totals.machines).toBeGreaterThan(200);
      expect(totals.materials).toBeGreaterThan(2000);
      expect(totals.tools).toBeGreaterThan(5000);
      expect(totals.holders).toBeGreaterThan(300);
      expect(totals.fixtures).toBeGreaterThan(50);
      expect(totals.programs).toBeGreaterThanOrEqual(24469);
      expect(totals.total).toBeGreaterThan(30000);
    });

    it("should include H drive file count", () => {
      const totals = postProcessorComprehensiveKnowledgeEngine.getTotalEntries();
      expect(totals.hDriveFiles).toBeGreaterThan(50000);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty query", () => {
      const result = postProcessorComprehensiveKnowledgeEngine.routeQuery("");
      expect(result).toBeDefined();
    });

    it("should handle bulk ingest with zero items", () => {
      const result = postProcessorComprehensiveKnowledgeEngine.bulkIngest([]);
      expect(result.ingested).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it("should handle clear of empty registry", () => {
      postProcessorComprehensiveKnowledgeEngine.clearIngestedAssets();
      expect(postProcessorComprehensiveKnowledgeEngine.getIngestedAssets().length).toBe(0);
    });
  });
});
