/**
 * Tests for Drawing2DExtractionEngine — U-AWR28
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  Drawing2DExtractionEngine,
  Dimension,
  GDTCallout,
} from "../engines/Drawing2DExtractionEngine.js";

describe("Drawing2DExtractionEngine", () => {
  beforeEach(() => {
    Drawing2DExtractionEngine.reset();
  });

  describe("extractDrawing", () => {
    it("extracts from a drawing file", () => {
      const result = Drawing2DExtractionEngine.extractDrawing("part.dxf");
      expect(result).toBeDefined();
      expect(result.filePath).toBe("part.dxf");
      expect(result.format).toBe("dxf");
    });

    it("detects format from extension", () => {
      expect(Drawing2DExtractionEngine.extractDrawing("a.dxf").format).toBe("dxf");
      expect(Drawing2DExtractionEngine.extractDrawing("b.dwg").format).toBe("dwg");
      expect(Drawing2DExtractionEngine.extractDrawing("c.pdf").format).toBe("pdf");
      expect(Drawing2DExtractionEngine.extractDrawing("d.png").format).toBe("image");
    });

    it("includes simulated dimensions", () => {
      const dims = [
        Drawing2DExtractionEngine.createDimension("linear", 25.4, "mm"),
        Drawing2DExtractionEngine.createDimension("diameter", 10.0, "mm"),
      ];
      const result = Drawing2DExtractionEngine.extractDrawing("part.dxf", {
        simulatedDimensions: dims,
      });
      expect(result.dimensions.length).toBe(2);
    });

    it("includes simulated GD&T", () => {
      const gdt = [
        Drawing2DExtractionEngine.createGDTCallout("position", 0.05, "mm", ["A", "B"]),
      ];
      const result = Drawing2DExtractionEngine.extractDrawing("part.dxf", {
        simulatedGDT: gdt,
      });
      expect(result.gdtCallouts.length).toBe(1);
    });

    it("includes title block", () => {
      const result = Drawing2DExtractionEngine.extractDrawing("part.dxf", {
        simulatedTitleBlock: {
          partNumber: "ABC-123",
          revision: "A",
          material: "6061-T6 Aluminum",
        },
      });
      expect(result.titleBlock.partNumber).toBe("ABC-123");
      expect(result.titleBlock.revision).toBe("A");
    });

    it("classifies notes by type", () => {
      const result = Drawing2DExtractionEngine.extractDrawing("part.dxf", {
        simulatedNotes: [
          "Material: 6061-T6 Aluminum",
          "Finish per MIL-A-8625",
          "Inspect per AS9100",
          "General note here",
        ],
      });
      expect(result.notes.some((n) => n.type === "material")).toBe(true);
      expect(result.notes.some((n) => n.type === "process")).toBe(true);
      expect(result.notes.some((n) => n.type === "quality")).toBe(true);
    });

    it("adds warnings for missing data", () => {
      const result = Drawing2DExtractionEngine.extractDrawing("empty.dxf");
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes("dimensions"))).toBe(true);
    });

    it("calculates confidence based on content", () => {
      const withData = Drawing2DExtractionEngine.extractDrawing("full.dxf", {
        simulatedDimensions: [
          Drawing2DExtractionEngine.createDimension("linear", 10, "mm"),
        ],
        simulatedTitleBlock: { partNumber: "P-123" },
      });
      expect(withData.extractionConfidence).toBeGreaterThan(0.8);

      const empty = Drawing2DExtractionEngine.extractDrawing("empty.dxf");
      expect(empty.extractionConfidence).toBeLessThan(0.5);
    });
  });

  describe("createDimension", () => {
    it("creates a linear dimension", () => {
      const dim = Drawing2DExtractionEngine.createDimension("linear", 50.0, "mm");
      expect(dim.type).toBe("linear");
      expect(dim.nominalValue).toBe(50.0);
      expect(dim.unit).toBe("mm");
    });

    it("creates a dimension with tolerance", () => {
      const dim = Drawing2DExtractionEngine.createDimension("diameter", 25.4, "mm", {
        upper: 0.05,
        lower: -0.05,
        type: "bilateral",
      });
      expect(dim.tolerance).toBeDefined();
      expect(dim.tolerance?.upper).toBe(0.05);
      expect(dim.tolerance?.lower).toBe(-0.05);
      expect(dim.tolerance?.type).toBe("bilateral");
    });

    it("creates inch dimensions", () => {
      const dim = Drawing2DExtractionEngine.createDimension("linear", 1.0, "in");
      expect(dim.unit).toBe("in");
    });
  });

  describe("createGDTCallout", () => {
    it("creates a position callout", () => {
      const gdt = Drawing2DExtractionEngine.createGDTCallout(
        "position",
        0.05,
        "mm",
        ["A", "B", "C"]
      );
      expect(gdt.symbol).toBe("position");
      expect(gdt.value).toBe(0.05);
      expect(gdt.datumReferences).toEqual(["A", "B", "C"]);
    });

    it("creates a flatness callout", () => {
      const gdt = Drawing2DExtractionEngine.createGDTCallout("flatness", 0.01, "mm");
      expect(gdt.symbol).toBe("flatness");
      expect(gdt.datumReferences.length).toBe(0);
    });

    it("includes modifiers", () => {
      const gdt = Drawing2DExtractionEngine.createGDTCallout(
        "position",
        0.1,
        "mm",
        ["A"],
        ["MMC", "PROJ"]
      );
      expect(gdt.modifiers).toContain("MMC");
      expect(gdt.modifiers).toContain("PROJ");
    });
  });

  describe("getExtraction", () => {
    it("returns null for unknown file", () => {
      expect(Drawing2DExtractionEngine.getExtraction("unknown.dxf")).toBeNull();
    });

    it("returns extraction for processed file", () => {
      Drawing2DExtractionEngine.extractDrawing("test.dxf");
      expect(Drawing2DExtractionEngine.getExtraction("test.dxf")).not.toBeNull();
    });
  });

  describe("getExtractionsByFormat", () => {
    beforeEach(() => {
      Drawing2DExtractionEngine.extractDrawing("a.dxf");
      Drawing2DExtractionEngine.extractDrawing("b.dxf");
      Drawing2DExtractionEngine.extractDrawing("c.dwg");
    });

    it("filters by format", () => {
      const dxf = Drawing2DExtractionEngine.getExtractionsByFormat("dxf");
      expect(dxf.length).toBe(2);

      const dwg = Drawing2DExtractionEngine.getExtractionsByFormat("dwg");
      expect(dwg.length).toBe(1);
    });
  });

  describe("getSummary", () => {
    it("returns null for unknown file", () => {
      expect(Drawing2DExtractionEngine.getSummary("unknown.dxf")).toBeNull();
    });

    it("returns summary with counts", () => {
      Drawing2DExtractionEngine.extractDrawing("part.dxf", {
        simulatedDimensions: [
          Drawing2DExtractionEngine.createDimension("linear", 10, "mm"),
          Drawing2DExtractionEngine.createDimension("linear", 20, "mm"),
        ],
        simulatedGDT: [
          Drawing2DExtractionEngine.createGDTCallout("position", 0.05, "mm"),
        ],
        simulatedTitleBlock: { partNumber: "P-123" },
        simulatedNotes: ["Note 1", "Note 2"],
      });

      const summary = Drawing2DExtractionEngine.getSummary("part.dxf");
      expect(summary?.totalDimensions).toBe(2);
      expect(summary?.totalGDT).toBe(1);
      expect(summary?.totalNotes).toBe(2);
      expect(summary?.hasTitleBlock).toBe(true);
    });

    it("identifies tight tolerances as critical features", () => {
      Drawing2DExtractionEngine.extractDrawing("precision.dxf", {
        simulatedDimensions: [
          Drawing2DExtractionEngine.createDimension("linear", 10, "mm", {
            upper: 0.01,
            lower: -0.01,
          }),
        ],
      });

      const summary = Drawing2DExtractionEngine.getSummary("precision.dxf");
      expect(summary?.criticalFeatures.length).toBeGreaterThan(0);
    });

    it("identifies tight position callouts", () => {
      Drawing2DExtractionEngine.extractDrawing("precision.dxf", {
        simulatedGDT: [
          Drawing2DExtractionEngine.createGDTCallout("position", 0.05, "mm", ["A"]),
        ],
      });

      const summary = Drawing2DExtractionEngine.getSummary("precision.dxf");
      expect(summary?.criticalFeatures.some((f) => f.includes("position"))).toBe(true);
    });
  });

  describe("searchByDimension", () => {
    beforeEach(() => {
      Drawing2DExtractionEngine.extractDrawing("a.dxf", {
        simulatedDimensions: [
          Drawing2DExtractionEngine.createDimension("linear", 25.4, "mm"),
        ],
      });
      Drawing2DExtractionEngine.extractDrawing("b.dxf", {
        simulatedDimensions: [
          Drawing2DExtractionEngine.createDimension("linear", 50.8, "mm"),
        ],
      });
    });

    it("finds drawings with matching dimension", () => {
      const results = Drawing2DExtractionEngine.searchByDimension(25.4);
      expect(results.length).toBe(1);
      expect(results[0].filePath).toBe("a.dxf");
    });

    it("uses tolerance for matching", () => {
      const results = Drawing2DExtractionEngine.searchByDimension(25.5, 0.2);
      expect(results.length).toBe(1);
    });
  });

  describe("searchByPartNumber", () => {
    beforeEach(() => {
      Drawing2DExtractionEngine.extractDrawing("a.dxf", {
        simulatedTitleBlock: { partNumber: "ABC-123" },
      });
      Drawing2DExtractionEngine.extractDrawing("b.dxf", {
        simulatedTitleBlock: { partNumber: "XYZ-789" },
      });
    });

    it("finds drawings by part number", () => {
      const results = Drawing2DExtractionEngine.searchByPartNumber("ABC");
      expect(results.length).toBe(1);
    });

    it("is case insensitive", () => {
      const results = Drawing2DExtractionEngine.searchByPartNumber("abc-123");
      expect(results.length).toBe(1);
    });
  });

  describe("getDrawingsWithGDT", () => {
    beforeEach(() => {
      Drawing2DExtractionEngine.extractDrawing("with-gdt.dxf", {
        simulatedGDT: [
          Drawing2DExtractionEngine.createGDTCallout("position", 0.1, "mm"),
        ],
      });
      Drawing2DExtractionEngine.extractDrawing("no-gdt.dxf");
    });

    it("returns only drawings with GD&T", () => {
      const results = Drawing2DExtractionEngine.getDrawingsWithGDT();
      expect(results.length).toBe(1);
      expect(results[0].filePath).toBe("with-gdt.dxf");
    });
  });

  describe("getDrawingsWithTightTolerances", () => {
    beforeEach(() => {
      Drawing2DExtractionEngine.extractDrawing("tight.dxf", {
        simulatedDimensions: [
          Drawing2DExtractionEngine.createDimension("linear", 10, "mm", {
            upper: 0.01,
            lower: -0.01,
          }),
        ],
      });
      Drawing2DExtractionEngine.extractDrawing("loose.dxf", {
        simulatedDimensions: [
          Drawing2DExtractionEngine.createDimension("linear", 10, "mm", {
            upper: 0.5,
            lower: -0.5,
          }),
        ],
      });
    });

    it("returns drawings with tight tolerances", () => {
      const results = Drawing2DExtractionEngine.getDrawingsWithTightTolerances();
      expect(results.length).toBe(1);
      expect(results[0].filePath).toBe("tight.dxf");
    });

    it("accepts custom threshold", () => {
      const results = Drawing2DExtractionEngine.getDrawingsWithTightTolerances({
        mm: 1.0,
      });
      expect(results.length).toBe(2);
    });
  });

  describe("getGDTSymbols", () => {
    it("returns list of GD&T symbols", () => {
      const symbols = Drawing2DExtractionEngine.getGDTSymbols();
      expect(symbols).toContain("position");
      expect(symbols).toContain("flatness");
      expect(symbols).toContain("perpendicularity");
      expect(symbols.length).toBe(14);
    });
  });

  describe("getStatistics", () => {
    beforeEach(() => {
      Drawing2DExtractionEngine.extractDrawing("a.dxf", {
        simulatedDimensions: [
          Drawing2DExtractionEngine.createDimension("linear", 10, "mm"),
          Drawing2DExtractionEngine.createDimension("linear", 20, "mm"),
        ],
        simulatedGDT: [
          Drawing2DExtractionEngine.createGDTCallout("position", 0.1, "mm"),
        ],
        simulatedTitleBlock: { partNumber: "A-123" },
      });
      Drawing2DExtractionEngine.extractDrawing("b.dwg", {
        simulatedDimensions: [
          Drawing2DExtractionEngine.createDimension("diameter", 5, "mm"),
        ],
      });
    });

    it("counts total drawings", () => {
      const stats = Drawing2DExtractionEngine.getStatistics();
      expect(stats.totalDrawings).toBe(2);
    });

    it("counts total dimensions", () => {
      const stats = Drawing2DExtractionEngine.getStatistics();
      expect(stats.totalDimensions).toBe(3);
    });

    it("counts total GD&T", () => {
      const stats = Drawing2DExtractionEngine.getStatistics();
      expect(stats.totalGDT).toBe(1);
    });

    it("groups by format", () => {
      const stats = Drawing2DExtractionEngine.getStatistics();
      expect(stats.byFormat.dxf).toBe(1);
      expect(stats.byFormat.dwg).toBe(1);
    });

    it("counts with title block", () => {
      const stats = Drawing2DExtractionEngine.getStatistics();
      expect(stats.withTitleBlock).toBe(1);
    });
  });

  describe("reset", () => {
    it("clears all extractions", () => {
      Drawing2DExtractionEngine.extractDrawing("test.dxf");
      expect(Drawing2DExtractionEngine.getAllExtractions().length).toBe(1);

      Drawing2DExtractionEngine.reset();
      expect(Drawing2DExtractionEngine.getAllExtractions().length).toBe(0);
    });
  });
});
