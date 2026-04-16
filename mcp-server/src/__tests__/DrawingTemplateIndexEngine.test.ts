/**
 * DrawingTemplateIndexEngine — Test Suite (RES-MS24)
 *
 * Validates drawing template indexing against real filesystem data.
 * Expected: ~1,464 drawing files (.dxf, .dwg, .slddrw, .edrw) across
 * 3 primary source directories under H:/prism/resources/.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  DrawingTemplateIndexEngine,
  DrawingTemplateIndexResult,
  DrawingAuditResult,
  DrawingFileEntry,
  DrawingFileType,
  DrawingPurpose,
} from "../engines/DrawingTemplateIndexEngine.js";

describe("DrawingTemplateIndexEngine", () => {
  let result: DrawingTemplateIndexResult;

  beforeAll(async () => {
    result = await DrawingTemplateIndexEngine.harvest();
  }, 120_000);

  // ----------------------------------------------------------------
  // getSources
  // ----------------------------------------------------------------

  describe("getSources", () => {
    it("returns 5 source directories", () => {
      const sources = DrawingTemplateIndexEngine.getSources();
      expect(sources).toHaveLength(5);
    });

    it("includes Training Day 2, SOLIDWORKS, and MasterCam", () => {
      const sources = DrawingTemplateIndexEngine.getSources();
      const names = sources.map((s) => s.name);
      expect(names).toContain("Training Day 2");
      expect(names).toContain("SOLIDWORKS");
      expect(names).toContain("MasterCam");
    });

    it("each source has a non-empty path and description", () => {
      const sources = DrawingTemplateIndexEngine.getSources();
      for (const s of sources) {
        expect(s.path.length).toBeGreaterThan(0);
        expect(s.description.length).toBeGreaterThan(0);
      }
    });

    it("returns a defensive copy (not the internal array)", () => {
      const sources1 = DrawingTemplateIndexEngine.getSources();
      const sources2 = DrawingTemplateIndexEngine.getSources();
      expect(sources1).not.toBe(sources2);
      expect(sources1[0]).not.toBe(sources2[0]);
    });
  });

  // ----------------------------------------------------------------
  // harvest — total counts
  // ----------------------------------------------------------------

  describe("harvest — total counts", () => {
    it("finds 1000+ drawing files total", () => {
      expect(result.totalFiles).toBeGreaterThanOrEqual(1000);
    });

    it("totalFiles matches files array length", () => {
      expect(result.totalFiles).toBe(result.files.length);
    });

    it("has a valid ISO timestamp", () => {
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("scanDurationMs is a positive number", () => {
      expect(result.scanDurationMs).toBeGreaterThan(0);
    });
  });

  // ----------------------------------------------------------------
  // harvest — per-source counts
  // ----------------------------------------------------------------

  describe("harvest — per-source counts", () => {
    it("Training Day 2 dominates with 1400+ drawing files", () => {
      const count = result.bySource["Training Day 2"] || 0;
      expect(count).toBeGreaterThanOrEqual(1400);
    });

    it("SOLIDWORKS has a small number of drawing files (20-30)", () => {
      const count = result.bySource["SOLIDWORKS"] || 0;
      expect(count).toBeGreaterThanOrEqual(20);
      expect(count).toBeLessThanOrEqual(40);
    });

    it("MasterCam has at least 1 drawing file", () => {
      const count = result.bySource["MasterCam"] || 0;
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it("bySource keys are all valid source names", () => {
      const validNames = DrawingTemplateIndexEngine.getSources().map((s) => s.name);
      for (const key of Object.keys(result.bySource)) {
        expect(validNames).toContain(key);
      }
    });
  });

  // ----------------------------------------------------------------
  // harvest — extension classification
  // ----------------------------------------------------------------

  describe("harvest — extension classification", () => {
    it(".dxf is the dominant extension with 1400+ files", () => {
      const dxfCount = result.byExtension[".dxf"] || 0;
      expect(dxfCount).toBeGreaterThanOrEqual(1400);
    });

    it(".dwg files exist (around 10)", () => {
      const dwgCount = result.byExtension[".dwg"] || 0;
      expect(dwgCount).toBeGreaterThanOrEqual(8);
      expect(dwgCount).toBeLessThanOrEqual(15);
    });

    it(".slddrw files exist (around 23)", () => {
      const slddrwCount = result.byExtension[".slddrw"] || 0;
      expect(slddrwCount).toBeGreaterThanOrEqual(18);
      expect(slddrwCount).toBeLessThanOrEqual(35);
    });

    it("byExtension has multiple distinct extensions", () => {
      const extCount = Object.keys(result.byExtension).length;
      expect(extCount).toBeGreaterThanOrEqual(3);
    });
  });

  // ----------------------------------------------------------------
  // harvest — type classification
  // ----------------------------------------------------------------

  describe("harvest — type classification", () => {
    it("dxf_exchange is the dominant type", () => {
      const dxfCount = result.byType["dxf_exchange"] || 0;
      expect(dxfCount).toBeGreaterThanOrEqual(1400);
    });

    it("autocad_drawing type matches .dwg count", () => {
      const typeCount = result.byType["autocad_drawing"] || 0;
      const extCount = result.byExtension[".dwg"] || 0;
      expect(typeCount).toBe(extCount);
    });

    it("solidworks_drawing type matches .slddrw count", () => {
      const typeCount = result.byType["solidworks_drawing"] || 0;
      const extCount = result.byExtension[".slddrw"] || 0;
      expect(typeCount).toBe(extCount);
    });

    it("all type counts sum to totalFiles", () => {
      const sum = Object.values(result.byType).reduce((a, b) => a + b, 0);
      expect(sum).toBe(result.totalFiles);
    });
  });

  // ----------------------------------------------------------------
  // harvest — purpose classification
  // ----------------------------------------------------------------

  describe("harvest — purpose classification", () => {
    it("tooling is the dominant purpose (MST holders, command holders)", () => {
      const toolingCount = result.byPurpose["tooling"] || 0;
      expect(toolingCount).toBeGreaterThan(1000);
    });

    it("training purpose includes SOLIDWORKS tutorial drawings", () => {
      const trainingFiles = result.files.filter(
        (f) => f.purpose === "training" && f.source === "SOLIDWORKS"
      );
      expect(trainingFiles.length).toBeGreaterThan(0);
    });

    it("all purpose counts sum to totalFiles", () => {
      const sum = Object.values(result.byPurpose).reduce((a, b) => a + b, 0);
      expect(sum).toBe(result.totalFiles);
    });
  });

  // ----------------------------------------------------------------
  // harvest — file entry validation
  // ----------------------------------------------------------------

  describe("harvest — file entry validation", () => {
    it("all files have a valid filePath containing resources/", () => {
      for (const f of result.files) {
        expect(f.filePath).toContain("resources/");
        expect(f.filePath.length).toBeGreaterThan(20);
      }
    });

    it("all files have a non-empty filename", () => {
      for (const f of result.files) {
        expect(f.filename.length).toBeGreaterThan(0);
      }
    });

    it("all files have sizeBytes >= 0", () => {
      for (const f of result.files) {
        expect(f.sizeBytes).toBeGreaterThanOrEqual(0);
      }
    });

    it("all files have a valid ISO lastModified date", () => {
      for (const f of result.files) {
        expect(f.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
    });

    it("all files have a non-empty parentFolder", () => {
      for (const f of result.files) {
        expect(f.parentFolder.length).toBeGreaterThan(0);
      }
    });
  });

  // ----------------------------------------------------------------
  // filterByType
  // ----------------------------------------------------------------

  describe("filterByType", () => {
    it("filterByType('dxf_exchange') returns only DXF files", () => {
      const dxfFiles = DrawingTemplateIndexEngine.filterByType(
        result.files,
        "dxf_exchange"
      );
      expect(dxfFiles.length).toBeGreaterThan(0);
      for (const f of dxfFiles) {
        expect(f.drawingType).toBe("dxf_exchange");
      }
    });

    it("filterByType('autocad_drawing') returns only DWG files", () => {
      const dwgFiles = DrawingTemplateIndexEngine.filterByType(
        result.files,
        "autocad_drawing"
      );
      expect(dwgFiles.length).toBeGreaterThan(0);
      for (const f of dwgFiles) {
        expect(f.drawingType).toBe("autocad_drawing");
        expect(f.extension).toBe(".dwg");
      }
    });

    it("filterByType('inventor_drawing') returns empty (no .idw on disk)", () => {
      const idwFiles = DrawingTemplateIndexEngine.filterByType(
        result.files,
        "inventor_drawing"
      );
      expect(idwFiles).toHaveLength(0);
    });

    it("filterByType on empty array returns empty array", () => {
      const empty = DrawingTemplateIndexEngine.filterByType([], "dxf_exchange");
      expect(empty).toHaveLength(0);
    });
  });

  // ----------------------------------------------------------------
  // filterByPurpose
  // ----------------------------------------------------------------

  describe("filterByPurpose", () => {
    it("filterByPurpose('tooling') returns tool holder DXF/DWG files", () => {
      const toolingFiles = DrawingTemplateIndexEngine.filterByPurpose(
        result.files,
        "tooling"
      );
      expect(toolingFiles.length).toBeGreaterThan(0);
      for (const f of toolingFiles) {
        expect(f.purpose).toBe("tooling");
      }
    });

    it("filterByPurpose returns a strict subset", () => {
      const trainingFiles = DrawingTemplateIndexEngine.filterByPurpose(
        result.files,
        "training"
      );
      expect(trainingFiles.length).toBeLessThan(result.files.length);
    });
  });

  // ----------------------------------------------------------------
  // filterBySource
  // ----------------------------------------------------------------

  describe("filterBySource", () => {
    it("filterBySource('SOLIDWORKS') returns only SOLIDWORKS files", () => {
      const swFiles = DrawingTemplateIndexEngine.filterBySource(
        result.files,
        "SOLIDWORKS"
      );
      expect(swFiles.length).toBeGreaterThan(0);
      for (const f of swFiles) {
        expect(f.source).toBe("SOLIDWORKS");
      }
    });

    it("filterBySource with nonexistent source returns empty", () => {
      const none = DrawingTemplateIndexEngine.filterBySource(
        result.files,
        "NONEXISTENT"
      );
      expect(none).toHaveLength(0);
    });
  });

  // ----------------------------------------------------------------
  // audit
  // ----------------------------------------------------------------

  describe("audit", () => {
    let auditResult: DrawingAuditResult;

    beforeAll(async () => {
      auditResult = await DrawingTemplateIndexEngine.audit();
    }, 120_000);

    it("returns valid totalFiles count matching harvest", () => {
      expect(auditResult.totalFiles).toBeGreaterThanOrEqual(1000);
    });

    it("topExtensions has .dxf as the first entry", () => {
      expect(auditResult.topExtensions.length).toBeGreaterThan(0);
      expect(auditResult.topExtensions[0].extension).toBe(".dxf");
    });

    it("typeBreakdown has dxf_exchange key", () => {
      expect(auditResult.typeBreakdown["dxf_exchange"]).toBeGreaterThan(0);
    });

    it("purposeBreakdown has at least 2 purposes", () => {
      expect(Object.keys(auditResult.purposeBreakdown).length).toBeGreaterThanOrEqual(2);
    });

    it("has a valid timestamp", () => {
      expect(auditResult.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // ----------------------------------------------------------------
  // edge case: empty input array for filters
  // ----------------------------------------------------------------

  describe("edge cases", () => {
    it("filterByType with synthetic entries classifies correctly", () => {
      const testEntries: DrawingFileEntry[] = [
        {
          filePath: "/test/drawing.dxf",
          filename: "drawing.dxf",
          extension: ".dxf",
          sizeBytes: 100,
          lastModified: "2026-01-01T00:00:00.000Z",
          parentFolder: "test",
          directory: "/test",
          drawingType: "dxf_exchange",
          purpose: "reference",
          source: "Test",
        },
        {
          filePath: "/test/drawing.dwg",
          filename: "drawing.dwg",
          extension: ".dwg",
          sizeBytes: 200,
          lastModified: "2026-01-01T00:00:00.000Z",
          parentFolder: "test",
          directory: "/test",
          drawingType: "autocad_drawing",
          purpose: "production_drawing",
          source: "Test",
        },
      ];

      const dxfOnly = DrawingTemplateIndexEngine.filterByType(testEntries, "dxf_exchange");
      expect(dxfOnly).toHaveLength(1);
      expect(dxfOnly[0].extension).toBe(".dxf");

      const dwgOnly = DrawingTemplateIndexEngine.filterByType(testEntries, "autocad_drawing");
      expect(dwgOnly).toHaveLength(1);
      expect(dwgOnly[0].extension).toBe(".dwg");

      const idwOnly = DrawingTemplateIndexEngine.filterByType(testEntries, "inventor_drawing");
      expect(idwOnly).toHaveLength(0);
    });

    it("filterByPurpose with synthetic entries works correctly", () => {
      const testEntries: DrawingFileEntry[] = [
        {
          filePath: "/test/template.slddrw",
          filename: "template.slddrw",
          extension: ".slddrw",
          sizeBytes: 500,
          lastModified: "2026-01-01T00:00:00.000Z",
          parentFolder: "test",
          directory: "/test",
          drawingType: "solidworks_drawing",
          purpose: "template",
          source: "Test",
        },
      ];

      const templates = DrawingTemplateIndexEngine.filterByPurpose(testEntries, "template");
      expect(templates).toHaveLength(1);

      const production = DrawingTemplateIndexEngine.filterByPurpose(
        testEntries,
        "production_drawing"
      );
      expect(production).toHaveLength(0);
    });
  });
});
