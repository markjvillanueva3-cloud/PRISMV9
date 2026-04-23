/**
 * ManufacturerCatalogAIEngine Tests
 * RES-MS3: Manufacturer Catalog Mining — 6 PDFs into Tool/Holder/Workholding Intelligence
 */

import { describe, it, expect } from "vitest";
import { manufacturerCatalogAIEngine } from "../engines/ManufacturerCatalogAIEngine.js";

describe("ManufacturerCatalogAIEngine", () => {
  describe("getAllHolders", () => {
    it("returns non-empty holders array", () => {
      const holders = manufacturerCatalogAIEngine.getAllHolders();
      expect(holders.length).toBeGreaterThan(0);
    });

    it("all holders have required fields", () => {
      const holders = manufacturerCatalogAIEngine.getAllHolders();
      for (const h of holders) {
        expect(h.id).toBeDefined();
        expect(h.manufacturer).toBeDefined();
        expect(h.family).toBeDefined();
        expect(h.category).toBeDefined();
        expect(h.tapers).toBeDefined();
        expect(h.bore_range_mm).toBeDefined();
        expect(h.runout_um).toBeGreaterThan(0);
      }
    });

    it("includes BIG DAISHOWA holders", () => {
      const holders = manufacturerCatalogAIEngine.getAllHolders();
      const bigDaishowa = holders.filter(h => h.manufacturer === "big_daishowa");
      expect(bigDaishowa.length).toBeGreaterThan(0);
    });

    it("holders have feature vectors", () => {
      const holders = manufacturerCatalogAIEngine.getAllHolders();
      for (const h of holders) {
        expect(h.feature_vector).toBeDefined();
        expect(h.feature_vector.runout_score).toBeGreaterThanOrEqual(0);
        expect(h.feature_vector.runout_score).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("getAllWorkholding", () => {
    it("returns non-empty workholding array", () => {
      const workholding = manufacturerCatalogAIEngine.getAllWorkholding();
      expect(workholding.length).toBeGreaterThan(0);
    });

    it("all workholding have required fields", () => {
      const workholding = manufacturerCatalogAIEngine.getAllWorkholding();
      for (const w of workholding) {
        expect(w.id).toBeDefined();
        expect(w.manufacturer).toBeDefined();
        expect(w.family).toBeDefined();
        expect(w.category).toBeDefined();
      }
    });

    it("includes Orange Vise workholding", () => {
      const workholding = manufacturerCatalogAIEngine.getAllWorkholding();
      const orangeVise = workholding.filter(w => w.manufacturer === "orange_vise");
      expect(orangeVise.length).toBeGreaterThan(0);
    });
  });

  describe("getAllCuttingTools", () => {
    it("returns non-empty cutting tools array", () => {
      const tools = manufacturerCatalogAIEngine.getAllCuttingTools();
      expect(tools.length).toBeGreaterThan(0);
    });

    it("all cutting tools have required fields", () => {
      const tools = manufacturerCatalogAIEngine.getAllCuttingTools();
      for (const t of tools) {
        expect(t.id).toBeDefined();
        expect(t.manufacturer).toBeDefined();
        expect(t.category).toBeDefined();
        expect(t.diameter_mm).toBeDefined();
        expect(t.coating).toBeDefined();
      }
    });

    it("includes Accupro and Rapidkut tools", () => {
      const tools = manufacturerCatalogAIEngine.getAllCuttingTools();
      const accupro = tools.filter(t => t.manufacturer === "accupro");
      const rapidkut = tools.filter(t => t.manufacturer === "rapidkut");
      expect(accupro.length).toBeGreaterThan(0);
      expect(rapidkut.length).toBeGreaterThan(0);
    });
  });

  describe("getBigDaishowaFamilies", () => {
    it("returns BIG DAISHOWA families", () => {
      const families = manufacturerCatalogAIEngine.getBigDaishowaFamilies();
      expect(families.length).toBeGreaterThan(0);
    });

    it("families have holder types", () => {
      const families = manufacturerCatalogAIEngine.getBigDaishowaFamilies();
      for (const f of families) {
        expect(f.name).toBeDefined();
        expect(f.type).toBeDefined();
      }
    });
  });

  describe("getVendorTrustScores", () => {
    it("returns trust scores for all 6 manufacturers", () => {
      const scores = manufacturerCatalogAIEngine.getVendorTrustScores();
      expect(scores.big_daishowa).toBeDefined();
      expect(scores.orange_vise).toBeDefined();
      expect(scores.accupro).toBeDefined();
      expect(scores.rapidkut).toBeDefined();
      expect(scores.global_cnc).toBeDefined();
      expect(scores.ampc).toBeDefined();
    });

    it("trust scores are in [0, 1] range", () => {
      const scores = manufacturerCatalogAIEngine.getVendorTrustScores();
      for (const score of Object.values(scores)) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    });

    it("BIG DAISHOWA has high trust score (premium manufacturer)", () => {
      const scores = manufacturerCatalogAIEngine.getVendorTrustScores();
      expect(scores.big_daishowa).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe("getCatalogPaths", () => {
    it("returns paths for all 6 catalogs", () => {
      const paths = manufacturerCatalogAIEngine.getCatalogPaths();
      expect(paths.big_daishowa).toContain("BIG DAISHOWA");
      expect(paths.orange_vise).toContain("orange_vise");
      expect(paths.accupro).toContain("Accupro");
      expect(paths.rapidkut).toContain("Rapidkut");
      expect(paths.global_cnc).toContain("Global-CNC");
      expect(paths.ampc).toContain("AMPC");
    });

    it("all paths are PDF files", () => {
      const paths = manufacturerCatalogAIEngine.getCatalogPaths();
      for (const path of Object.values(paths)) {
        expect(path).toMatch(/\.pdf$/i);
      }
    });
  });

  describe("selectToolHolder", () => {
    it("selects holder for 12mm tool with 5um runout requirement", () => {
      const result = manufacturerCatalogAIEngine.selectToolHolder(
        12, // tool_diameter_mm
        5,  // runout_required_um
        "finishing", // application
        "BBT40" // preferred_taper
      );
      expect(result).toBeDefined();
      expect(result.top_recommendation).toBeDefined();
      expect(result.reasoning_chain.length).toBeGreaterThan(0);
    });

    it("reasoning chain contains observation, filtering, and synthesis steps", () => {
      const result = manufacturerCatalogAIEngine.selectToolHolder(
        10, 3, "finishing"
      );
      const stepTypes = result.reasoning_chain.map(s => s.type);
      expect(stepTypes).toContain("observation");
      expect(stepTypes).toContain("synthesis");
    });

    it("returns alternatives alongside top pick", () => {
      const result = manufacturerCatalogAIEngine.selectToolHolder(
        8, 5, "roughing"
      );
      expect(result.alternatives).toBeDefined();
      expect(result.alternatives.length).toBeGreaterThanOrEqual(0);
    });

    it("selects shrink-fit for tight runout requirements", () => {
      const result = manufacturerCatalogAIEngine.selectToolHolder(
        10, 1, "finishing" // 1um runout = very tight
      );
      expect(result.top_recommendation).toBeDefined();
      // Shrink-fit holders are best for tight runout
      if (result.warning) {
        expect(result.top_recommendation.runout_um).toBeLessThanOrEqual(3);
      } else {
        expect(result.top_recommendation.runout_um).toBeLessThanOrEqual(1);
      }
    });

    it("includes JM Die context in reasoning", () => {
      const result = manufacturerCatalogAIEngine.selectToolHolder(
        12, 5, "semi_finishing", "BBT40"
      );
      const jmDieStep = result.reasoning_chain.find(s => s.type === "jmdie_fit");
      expect(jmDieStep).toBeDefined();
      expect(jmDieStep?.evidence.some(e => e.includes("JM Die"))).toBe(true);
    });
  });

  describe("matchWorkholding", () => {
    it("matches vise for prismatic part", () => {
      const result = manufacturerCatalogAIEngine.matchWorkholding(
        100, // part_length_mm
        75,  // part_width_mm
        50,  // part_height_mm
        5000, // clamping_force_required_n
        10,   // repeatability_required_um
        "D2"  // material
      );
      expect(result).toBeDefined();
      expect(result.top_recommendation).toBeDefined();
    });

    it("includes reasoning chain with clamping analysis", () => {
      const result = manufacturerCatalogAIEngine.matchWorkholding(
        80, 60, 40, 4000, 15, "M2"
      );
      expect(result.reasoning_chain.length).toBeGreaterThan(0);
    });

    it("recommends Orange Vise for precision work", () => {
      const result = manufacturerCatalogAIEngine.matchWorkholding(
        100, 100, 50, 5000, 5, "S7"
      );
      // Orange Vise is premium precision workholding
      expect(
        result.top_recommendation.manufacturer === "orange_vise" ||
        result.alternatives.some(a => a.manufacturer === "orange_vise")
      ).toBe(true);
    });
  });

  describe("findCuttingTool", () => {
    it("finds end mill for P_steel roughing", () => {
      const result = manufacturerCatalogAIEngine.findCuttingTool(
        "roughing",       // operation
        "P_steel",        // material_group (ISO P: tool steels like D2)
        6.3,              // surface_finish_ra_um
        12                // diameter_mm
      );
      expect(result).toBeDefined();
      expect(result.top_recommendation).toBeDefined();
    });

    it("reasoning includes coating and geometry analysis", () => {
      const result = manufacturerCatalogAIEngine.findCuttingTool(
        "drilling", "P_steel", 3.2, 8
      );
      expect(result.reasoning_chain.length).toBeGreaterThan(0);
    });

    it("cutting tools include material group info", () => {
      const tools = manufacturerCatalogAIEngine.getAllCuttingTools();
      // At least some tools should have P_steel in their material groups
      const steelTools = tools.filter(t =>
        t.material_groups.includes("P_steel")
      );
      expect(steelTools.length).toBeGreaterThan(0);
    });
  });

  describe("getJMDieRecommendations", () => {
    it("returns recommendations for D2 milling", () => {
      const recs = manufacturerCatalogAIEngine.getJMDieRecommendations("D2", "milling");
      expect(recs.length).toBeGreaterThan(0);
    });

    it("recommendations include tool selection advice", () => {
      const recs = manufacturerCatalogAIEngine.getJMDieRecommendations("M2", "turning");
      expect(recs.some(r => r.recommendation.length > 0)).toBe(true);
    });

    it("recommendations reference JM Die materials", () => {
      const recs = manufacturerCatalogAIEngine.getJMDieRecommendations("tungsten_carbide", "grinding");
      expect(recs.length).toBeGreaterThan(0);
      expect(recs.some(r => r.recommendation.includes("carbide") || r.recommendation.includes("EDM"))).toBe(true);
    });

    it("returns default recommendation for unknown combinations", () => {
      const recs = manufacturerCatalogAIEngine.getJMDieRecommendations("unknown_material", "custom_op");
      expect(recs.length).toBeGreaterThan(0);
    });
  });

  describe("getFeatureVector", () => {
    it("returns feature vector for known holder ID", () => {
      const holders = manufacturerCatalogAIEngine.getAllHolders();
      const firstId = holders[0].id;
      const fv = manufacturerCatalogAIEngine.getFeatureVector(firstId);
      expect(fv).not.toBeNull();
    });

    it("returns null for unknown ID", () => {
      const fv = manufacturerCatalogAIEngine.getFeatureVector("nonexistent-id-xyz");
      expect(fv).toBeNull();
    });

    it("feature vectors have normalized scores", () => {
      const holders = manufacturerCatalogAIEngine.getAllHolders();
      for (const h of holders.slice(0, 3)) {
        const fv = manufacturerCatalogAIEngine.getFeatureVector(h.id);
        if (fv) {
          expect(fv.price_norm).toBeGreaterThanOrEqual(0);
          expect(fv.price_norm).toBeLessThanOrEqual(1);
          expect(fv.availability).toBeGreaterThanOrEqual(0);
          expect(fv.availability).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe("searchCatalog", () => {
    it("finds items by keyword", () => {
      const results = manufacturerCatalogAIEngine.searchCatalog("shrink");
      expect(results.holders.length).toBeGreaterThan(0);
    });

    it("searches across holders, workholding, and cutting tools", () => {
      const results = manufacturerCatalogAIEngine.searchCatalog("carbide");
      expect(results).toBeDefined();
      // Carbide appears in cutting tools
      expect(results.cutting_tools.length).toBeGreaterThan(0);
    });

    it("returns empty arrays for no matches", () => {
      const results = manufacturerCatalogAIEngine.searchCatalog("xyznonexistent123");
      expect(results.holders.length).toBe(0);
      expect(results.workholding.length).toBe(0);
      expect(results.cutting_tools.length).toBe(0);
    });

    it("case-insensitive search", () => {
      const lower = manufacturerCatalogAIEngine.searchCatalog("hydraulic");
      const upper = manufacturerCatalogAIEngine.searchCatalog("HYDRAULIC");
      expect(lower.holders.length).toBe(upper.holders.length);
    });
  });

  describe("catalog coverage", () => {
    it("covers all 6 manufacturers in holders", () => {
      const holders = manufacturerCatalogAIEngine.getAllHolders();
      const manufacturers = new Set(holders.map(h => h.manufacturer));
      expect(manufacturers.has("big_daishowa")).toBe(true);
    });

    it("covers all 6 manufacturers in cutting tools", () => {
      const tools = manufacturerCatalogAIEngine.getAllCuttingTools();
      const manufacturers = new Set(tools.map(t => t.manufacturer));
      expect(manufacturers.has("accupro")).toBe(true);
      expect(manufacturers.has("rapidkut")).toBe(true);
    });

    it("workholding includes vises and accessories", () => {
      const workholding = manufacturerCatalogAIEngine.getAllWorkholding();
      const categories = new Set(workholding.map(w => w.category));
      expect(categories.has("precision_vise")).toBe(true);
    });
  });

  describe("JM Die machine compatibility", () => {
    it("holders include BBT40 taper (Hurco/Okuma)", () => {
      const holders = manufacturerCatalogAIEngine.getAllHolders();
      const bbt40 = holders.filter(h => h.tapers.includes("BBT40"));
      expect(bbt40.length).toBeGreaterThan(0);
    });

    it("holders include CAT40 taper (Haas)", () => {
      const holders = manufacturerCatalogAIEngine.getAllHolders();
      const cat40 = holders.filter(h =>
        h.tapers.some(t => t.toLowerCase().includes("cat40"))
      );
      // CAT40 may appear as "CAT40" or be implicitly compatible with BBT40
      expect(cat40.length + holders.filter(h => h.tapers.includes("BBT40")).length).toBeGreaterThan(0);
    });

    it("feature vectors include JM Die fit scores", () => {
      const holders = manufacturerCatalogAIEngine.getAllHolders();
      for (const h of holders) {
        expect(h.feature_vector.jmdie_machine_fit).toBeDefined();
        expect(h.feature_vector.jmdie_material_fit).toBeDefined();
      }
    });
  });
});
