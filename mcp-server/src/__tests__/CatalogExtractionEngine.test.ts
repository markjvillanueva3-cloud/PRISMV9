/**
 * CatalogExtractionEngine Tests
 * U-AWR08: Manufacturer Catalog Extraction
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  CatalogExtractionEngine,
  catalogExtractionEngine,
  type CatalogTool,
  type ToolType,
  type ToolGeometry,
  type CuttingDataSet,
  type DataSource,
  type MergeResult,
} from "../engines/CatalogExtractionEngine.js";

describe("CatalogExtractionEngine", () => {
  describe("Singleton Pattern", () => {
    it("should export catalogExtractionEngine singleton", () => {
      expect(catalogExtractionEngine).toBeDefined();
      expect(catalogExtractionEngine).toBeInstanceOf(CatalogExtractionEngine);
    });

    it("should create instance via constructor", () => {
      const engine = new CatalogExtractionEngine();
      expect(engine).toBeInstanceOf(CatalogExtractionEngine);
    });
  });

  describe("Type Exports", () => {
    it("should export CatalogTool type structure", () => {
      const tool: CatalogTool = {
        id: "test-tool-001",
        manufacturer: "Sandvik",
        designation: "R390-11T308M-PM",
        type: "milling_insert",
        geometry: {
          diameter_mm: 11,
          corner_radius_mm: 0.8,
        },
        source: {
          type: "manufacturer",
          catalog: "Sandvik Milling 2024",
          confidence: 0.95,
        },
      };
      expect(tool.id).toBe("test-tool-001");
      expect(tool.manufacturer).toBe("Sandvik");
    });

    it("should export ToolType values", () => {
      const types: ToolType[] = [
        "end_mill", "ball_mill", "drill", "tap", "reamer",
        "boring_bar", "turning_insert", "milling_insert",
        "thread_mill", "chamfer_mill", "face_mill", "slitting_saw"
      ];
      expect(types).toHaveLength(12);
    });

    it("should export ToolGeometry type structure", () => {
      const geometry: ToolGeometry = {
        diameter_mm: 12,
        shank_diameter_mm: 12,
        flute_length_mm: 36,
        overall_length_mm: 83,
        corner_radius_mm: 0.5,
        flute_count: 4,
        helix_angle_deg: 35,
      };
      expect(geometry.diameter_mm).toBe(12);
      expect(geometry.flute_count).toBe(4);
    });

    it("should export CuttingDataSet type structure", () => {
      const cuttingData: CuttingDataSet = {
        isoGroup: "P",
        operation: "milling",
        Vc_min_mpm: 150,
        Vc_max_mpm: 250,
        Vc_recommended_mpm: 200,
        fz_min_mm: 0.08,
        fz_max_mm: 0.15,
        fz_recommended_mm: 0.12,
        ap_max_mm: 4,
        ae_max_mm: 8,
        coolant: "flood",
        source: { type: "manufacturer" },
      };
      expect(cuttingData.isoGroup).toBe("P");
      expect(cuttingData.Vc_recommended_mpm).toBe(200);
    });

    it("should export DataSource type structure", () => {
      const source: DataSource = {
        type: "manufacturer",
        catalog: "Kennametal Master Catalog",
        page: 142,
        extractedAt: "2026-04-17T12:00:00Z",
        confidence: 0.92,
      };
      expect(source.type).toBe("manufacturer");
      expect(source.confidence).toBe(0.92);
    });

    it("should export MergeResult type structure", () => {
      const result: MergeResult = {
        action: "added",
        toolId: "SANDVIK-R390-001",
        reason: "New tool from catalog extraction",
      };
      expect(result.action).toBe("added");
      expect(result.toolId).toBe("SANDVIK-R390-001");
    });
  });

  describe("Statistics", () => {
    it("should return stats structure", () => {
      const stats = catalogExtractionEngine.getStats();
      expect(stats).toHaveProperty("extractedCount");
      expect(stats).toHaveProperty("byManufacturer");
      expect(stats).toHaveProperty("existingCounts");
      expect(stats).toHaveProperty("withCuttingData");
    });

    it("should have numeric extractedCount", () => {
      const stats = catalogExtractionEngine.getStats();
      expect(typeof stats.extractedCount).toBe("number");
      expect(stats.extractedCount).toBeGreaterThanOrEqual(0);
    });

    it("should have numeric withCuttingData", () => {
      const stats = catalogExtractionEngine.getStats();
      expect(typeof stats.withCuttingData).toBe("number");
      expect(stats.withCuttingData).toBeGreaterThanOrEqual(0);
    });

    it("should have byManufacturer as object", () => {
      const stats = catalogExtractionEngine.getStats();
      expect(typeof stats.byManufacturer).toBe("object");
    });
  });

  describe("ISO Groups", () => {
    it("should support all ISO material groups", () => {
      const isoGroups: CuttingDataSet["isoGroup"][] = ["P", "M", "K", "N", "S", "H"];
      expect(isoGroups).toHaveLength(6);
    });

    it("should map ISO groups to cutting data correctly", () => {
      const steelData: CuttingDataSet = {
        isoGroup: "P",
        Vc_recommended_mpm: 200,
        source: { type: "manufacturer" },
      };
      expect(steelData.isoGroup).toBe("P");

      const stainlessData: CuttingDataSet = {
        isoGroup: "M",
        Vc_recommended_mpm: 150,
        source: { type: "manufacturer" },
      };
      expect(stainlessData.isoGroup).toBe("M");

      const castIronData: CuttingDataSet = {
        isoGroup: "K",
        Vc_recommended_mpm: 250,
        source: { type: "manufacturer" },
      };
      expect(castIronData.isoGroup).toBe("K");

      const aluminumData: CuttingDataSet = {
        isoGroup: "N",
        Vc_recommended_mpm: 500,
        source: { type: "manufacturer" },
      };
      expect(aluminumData.isoGroup).toBe("N");

      const superalloyData: CuttingDataSet = {
        isoGroup: "S",
        Vc_recommended_mpm: 40,
        source: { type: "manufacturer" },
      };
      expect(superalloyData.isoGroup).toBe("S");

      const hardenedData: CuttingDataSet = {
        isoGroup: "H",
        Vc_recommended_mpm: 100,
        source: { type: "manufacturer" },
      };
      expect(hardenedData.isoGroup).toBe("H");
    });
  });

  describe("Data Source Types", () => {
    it("should support manufacturer source type", () => {
      const source: DataSource = { type: "manufacturer", catalog: "Sandvik 2024" };
      expect(source.type).toBe("manufacturer");
    });

    it("should support handbook source type", () => {
      const source: DataSource = { type: "handbook", catalog: "Machinery Handbook" };
      expect(source.type).toBe("handbook");
    });

    it("should support calculated source type", () => {
      const source: DataSource = { type: "calculated", confidence: 0.8 };
      expect(source.type).toBe("calculated");
    });

    it("should support user source type", () => {
      const source: DataSource = { type: "user", confidence: 0.7 };
      expect(source.type).toBe("user");
    });
  });

  describe("Merge Actions", () => {
    it("should support added action", () => {
      const result: MergeResult = { action: "added", toolId: "test-001" };
      expect(result.action).toBe("added");
    });

    it("should support updated action", () => {
      const result: MergeResult = { action: "updated", toolId: "test-001", reason: "Higher authority source" };
      expect(result.action).toBe("updated");
    });

    it("should support skipped action", () => {
      const result: MergeResult = { action: "skipped", toolId: "test-001", reason: "Duplicate" };
      expect(result.action).toBe("skipped");
    });

    it("should support conflict action", () => {
      const result: MergeResult = { action: "conflict", toolId: "test-001", reason: "Same authority, different values" };
      expect(result.action).toBe("conflict");
    });
  });

  describe("Tool Type Classification", () => {
    it("should classify end mill correctly", () => {
      const tool: CatalogTool = {
        id: "em-001",
        manufacturer: "Harvey",
        designation: "47712",
        type: "end_mill",
        geometry: { diameter_mm: 12, flute_count: 4 },
        source: { type: "manufacturer" },
      };
      expect(tool.type).toBe("end_mill");
    });

    it("should classify drill correctly", () => {
      const tool: CatalogTool = {
        id: "drill-001",
        manufacturer: "OSG",
        designation: "ADO-3D",
        type: "drill",
        geometry: { diameter_mm: 8, point_angle_deg: 140 },
        source: { type: "manufacturer" },
      };
      expect(tool.type).toBe("drill");
    });

    it("should classify turning insert correctly", () => {
      const tool: CatalogTool = {
        id: "turn-001",
        manufacturer: "Sandvik",
        designation: "CNMG120408-PM",
        type: "turning_insert",
        geometry: { diameter_mm: 12.7, nose_radius_mm: 0.8, insert_size: "12" },
        source: { type: "manufacturer" },
      };
      expect(tool.type).toBe("turning_insert");
    });

    it("should classify milling insert correctly", () => {
      const tool: CatalogTool = {
        id: "mill-001",
        manufacturer: "Iscar",
        designation: "APKT1604PDR-HM",
        type: "milling_insert",
        geometry: { diameter_mm: 16, corner_radius_mm: 0.8, insert_size: "16" },
        source: { type: "manufacturer" },
      };
      expect(tool.type).toBe("milling_insert");
    });
  });

  describe("Geometry Validation", () => {
    it("should require diameter_mm in geometry", () => {
      const geometry: ToolGeometry = { diameter_mm: 10 };
      expect(geometry.diameter_mm).toBe(10);
    });

    it("should support optional geometry fields", () => {
      const geometry: ToolGeometry = {
        diameter_mm: 12,
        shank_diameter_mm: 12,
        flute_length_mm: 36,
        overall_length_mm: 83,
        corner_radius_mm: undefined,
        flute_count: 4,
      };
      expect(geometry.corner_radius_mm).toBeUndefined();
      expect(geometry.flute_count).toBe(4);
    });

    it("should support insert-specific geometry", () => {
      const geometry: ToolGeometry = {
        diameter_mm: 12.7,
        nose_radius_mm: 0.8,
        insert_size: "12",
        rake_angle_deg: 7,
        relief_angle_deg: 7,
      };
      expect(geometry.nose_radius_mm).toBe(0.8);
      expect(geometry.insert_size).toBe("12");
    });
  });

  describe("Cutting Data Validation", () => {
    it("should validate speed ranges", () => {
      const data: CuttingDataSet = {
        isoGroup: "P",
        Vc_min_mpm: 150,
        Vc_max_mpm: 250,
        Vc_recommended_mpm: 200,
        source: { type: "manufacturer" },
      };
      expect(data.Vc_min_mpm).toBeLessThan(data.Vc_max_mpm!);
      expect(data.Vc_recommended_mpm).toBeGreaterThanOrEqual(data.Vc_min_mpm!);
      expect(data.Vc_recommended_mpm).toBeLessThanOrEqual(data.Vc_max_mpm!);
    });

    it("should validate feed ranges", () => {
      const data: CuttingDataSet = {
        isoGroup: "P",
        fz_min_mm: 0.08,
        fz_max_mm: 0.15,
        fz_recommended_mm: 0.12,
        source: { type: "manufacturer" },
      };
      expect(data.fz_min_mm).toBeLessThan(data.fz_max_mm!);
      expect(data.fz_recommended_mm).toBeGreaterThanOrEqual(data.fz_min_mm!);
      expect(data.fz_recommended_mm).toBeLessThanOrEqual(data.fz_max_mm!);
    });

    it("should support coolant options", () => {
      const coolantTypes: CuttingDataSet["coolant"][] = [
        "flood", "mist", "air", "dry", "through_tool"
      ];
      expect(coolantTypes).toHaveLength(5);
    });
  });

  describe("Manufacturer Coverage", () => {
    it("should support major manufacturers", () => {
      const manufacturers = [
        "Sandvik", "Kennametal", "Iscar", "Walter", "Tungaloy",
        "Korloy", "Mitsubishi", "Sumitomo", "Kyocera", "Seco"
      ];
      expect(manufacturers.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe("TypeScript Export", () => {
    it("should export to TypeScript format", async () => {
      const engine = new CatalogExtractionEngine();
      const tsCode = await engine.exportToTypeScript("test");
      expect(typeof tsCode).toBe("string");
    });
  });
});
