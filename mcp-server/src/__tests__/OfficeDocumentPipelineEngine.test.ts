/**
 * Tests for OfficeDocumentPipelineEngine — U-AWR29
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  OfficeDocumentPipelineEngine,
  DocumentType,
  ContentCategory,
} from "../engines/OfficeDocumentPipelineEngine.js";

describe("OfficeDocumentPipelineEngine", () => {
  beforeEach(() => {
    OfficeDocumentPipelineEngine.reset();
  });

  describe("processDocument", () => {
    it("processes a document file", () => {
      const result = OfficeDocumentPipelineEngine.processDocument("report.docx");
      expect(result).toBeDefined();
      expect(result.metadata.filePath).toBe("report.docx");
      expect(result.metadata.type).toBe("word");
    });

    it("detects document type from extension", () => {
      expect(
        OfficeDocumentPipelineEngine.processDocument("a.docx").metadata.type
      ).toBe("word");
      expect(
        OfficeDocumentPipelineEngine.processDocument("b.xlsx").metadata.type
      ).toBe("excel");
      expect(
        OfficeDocumentPipelineEngine.processDocument("c.pptx").metadata.type
      ).toBe("powerpoint");
      expect(
        OfficeDocumentPipelineEngine.processDocument("d.pdf").metadata.type
      ).toBe("pdf");
      expect(
        OfficeDocumentPipelineEngine.processDocument("e.txt").metadata.type
      ).toBe("text");
    });

    it("detects content category from text", () => {
      const result = OfficeDocumentPipelineEngine.processDocument("doc.docx", {
        simulatedText: "Tool List: T1 1/2 End Mill, T2 3/8 Drill",
      });
      expect(result.metadata.category).toBe("tool_list");
    });

    it("extracts manufacturing data", () => {
      const result = OfficeDocumentPipelineEngine.processDocument("setup.xlsx", {
        simulatedText:
          "Part# ABC-123, Tool T1, Speed 3000 RPM, Feed 10 IPM, 25.4mm dimension",
      });
      expect(result.manufacturingData.partNumbers).toContain("ABC-123");
      expect(result.manufacturingData.toolNumbers.length).toBeGreaterThan(0);
      expect(result.manufacturingData.speeds).toContain(3000);
      expect(result.manufacturingData.feeds).toContain(10);
    });

    it("processes tables", () => {
      const result = OfficeDocumentPipelineEngine.processDocument("tools.xlsx", {
        simulatedTables: [
          {
            headers: ["Tool #", "Description", "Diameter"],
            rows: [
              ["T1", "End Mill", "0.500"],
              ["T2", "Drill", "0.250"],
            ],
          },
        ],
      });
      expect(result.tables.length).toBe(1);
      expect(result.tables[0].dataType).toBe("tool_list");
      expect(result.tables[0].rowCount).toBe(2);
    });

    it("processes sections", () => {
      const result = OfficeDocumentPipelineEngine.processDocument("manual.docx", {
        simulatedSections: [
          { heading: "Introduction", content: "This is the intro", level: 1 },
          { heading: "Setup", content: "Setup instructions", level: 2 },
        ],
      });
      expect(result.sections.length).toBe(2);
    });

    it("calculates confidence based on content", () => {
      const withData = OfficeDocumentPipelineEngine.processDocument("full.xlsx", {
        simulatedText: "Part# ABC-123 Tool T1",
      });
      expect(withData.extractionConfidence).toBeGreaterThan(0.8);

      const empty = OfficeDocumentPipelineEngine.processDocument("empty.xlsx");
      expect(empty.extractionConfidence).toBeLessThan(0.5);
    });
  });

  describe("processBatch", () => {
    it("processes multiple documents", () => {
      const results = OfficeDocumentPipelineEngine.processBatch([
        { path: "a.docx", text: "Document A" },
        { path: "b.xlsx", text: "Document B" },
      ]);
      expect(results.length).toBe(2);
    });
  });

  describe("getExtraction", () => {
    it("returns null for unknown file", () => {
      expect(OfficeDocumentPipelineEngine.getExtraction("unknown.docx")).toBeNull();
    });

    it("returns extraction for processed file", () => {
      OfficeDocumentPipelineEngine.processDocument("test.docx");
      expect(OfficeDocumentPipelineEngine.getExtraction("test.docx")).not.toBeNull();
    });
  });

  describe("getByDocumentType", () => {
    beforeEach(() => {
      OfficeDocumentPipelineEngine.processDocument("a.docx");
      OfficeDocumentPipelineEngine.processDocument("b.docx");
      OfficeDocumentPipelineEngine.processDocument("c.xlsx");
    });

    it("filters by document type", () => {
      const word = OfficeDocumentPipelineEngine.getByDocumentType("word");
      expect(word.length).toBe(2);

      const excel = OfficeDocumentPipelineEngine.getByDocumentType("excel");
      expect(excel.length).toBe(1);
    });
  });

  describe("getByCategory", () => {
    beforeEach(() => {
      OfficeDocumentPipelineEngine.processDocument("tools.xlsx", {
        simulatedText: "Tool List",
      });
      OfficeDocumentPipelineEngine.processDocument("spec.docx", {
        simulatedText: "Specification document",
      });
    });

    it("filters by category", () => {
      const toolLists = OfficeDocumentPipelineEngine.getByCategory("tool_list");
      expect(toolLists.length).toBe(1);
    });
  });

  describe("getToolListDocuments", () => {
    beforeEach(() => {
      OfficeDocumentPipelineEngine.processDocument("tools.xlsx", {
        simulatedText: "Tool T1, T2, T3",
      });
      OfficeDocumentPipelineEngine.processDocument("other.docx", {
        simulatedText: "General document",
      });
    });

    it("finds documents with tool information", () => {
      const tools = OfficeDocumentPipelineEngine.getToolListDocuments();
      expect(tools.length).toBe(1);
    });
  });

  describe("getSpeedFeedDocuments", () => {
    beforeEach(() => {
      OfficeDocumentPipelineEngine.processDocument("speeds.xlsx", {
        simulatedText: "Speed 3000 RPM, Feed 10 IPM",
      });
      OfficeDocumentPipelineEngine.processDocument("other.docx");
    });

    it("finds documents with speed/feed data", () => {
      const docs = OfficeDocumentPipelineEngine.getSpeedFeedDocuments();
      expect(docs.length).toBe(1);
    });
  });

  describe("searchByKeyword", () => {
    beforeEach(() => {
      OfficeDocumentPipelineEngine.processDocument("turning.docx", {
        simulatedText: "Turning operation at 500 RPM",
      });
      OfficeDocumentPipelineEngine.processDocument("milling.docx", {
        simulatedText: "Milling with end mill",
      });
    });

    it("searches by keyword", () => {
      const turning = OfficeDocumentPipelineEngine.searchByKeyword("turning");
      expect(turning.length).toBe(1);
    });
  });

  describe("searchByPartNumber", () => {
    beforeEach(() => {
      OfficeDocumentPipelineEngine.processDocument("part1.xlsx", {
        simulatedText: "Part# ABC-123",
      });
      OfficeDocumentPipelineEngine.processDocument("part2.xlsx", {
        simulatedText: "Part# XYZ-789",
      });
    });

    it("finds documents by part number", () => {
      const results = OfficeDocumentPipelineEngine.searchByPartNumber("ABC");
      expect(results.length).toBe(1);
    });
  });

  describe("getSupportedExtensions", () => {
    it("returns list of extensions", () => {
      const exts = OfficeDocumentPipelineEngine.getSupportedExtensions();
      expect(exts).toContain(".docx");
      expect(exts).toContain(".xlsx");
      expect(exts).toContain(".pdf");
    });
  });

  describe("isSupported", () => {
    it("returns true for supported files", () => {
      expect(OfficeDocumentPipelineEngine.isSupported("doc.docx")).toBe(true);
      expect(OfficeDocumentPipelineEngine.isSupported("sheet.xlsx")).toBe(true);
    });

    it("returns false for unsupported files", () => {
      expect(OfficeDocumentPipelineEngine.isSupported("image.png")).toBe(false);
      expect(OfficeDocumentPipelineEngine.isSupported("code.ts")).toBe(false);
    });
  });

  describe("getCategories", () => {
    it("returns list of categories", () => {
      const categories = OfficeDocumentPipelineEngine.getCategories();
      expect(categories).toContain("tool_list");
      expect(categories).toContain("specification");
      expect(categories).toContain("setup_sheet");
    });
  });

  describe("getStatistics", () => {
    beforeEach(() => {
      OfficeDocumentPipelineEngine.processDocument("tools.xlsx", {
        simulatedText: "Tool T1, T2, Part# ABC-123",
        simulatedTables: [
          {
            headers: ["Tool", "Diameter"],
            rows: [["T1", "0.5"]],
          },
        ],
      });
      OfficeDocumentPipelineEngine.processDocument("spec.docx", {
        simulatedText: "Specification for Part# XYZ-789",
      });
    });

    it("counts total documents", () => {
      const stats = OfficeDocumentPipelineEngine.getStatistics();
      expect(stats.totalDocuments).toBe(2);
    });

    it("groups by type", () => {
      const stats = OfficeDocumentPipelineEngine.getStatistics();
      expect(stats.byType.excel).toBe(1);
      expect(stats.byType.word).toBe(1);
    });

    it("counts tables", () => {
      const stats = OfficeDocumentPipelineEngine.getStatistics();
      expect(stats.totalTables).toBe(1);
    });

    it("counts tool and part numbers", () => {
      const stats = OfficeDocumentPipelineEngine.getStatistics();
      expect(stats.totalToolNumbers).toBeGreaterThan(0);
      expect(stats.totalPartNumbers).toBe(2);
    });
  });

  describe("content category detection", () => {
    it("detects specification documents", () => {
      const result = OfficeDocumentPipelineEngine.processDocument("spec.docx", {
        simulatedText: "Specification for part requirements",
      });
      expect(result.metadata.category).toBe("specification");
    });

    it("detects procedure documents", () => {
      const result = OfficeDocumentPipelineEngine.processDocument("proc.docx", {
        simulatedText: "Work instruction procedure for setup",
      });
      expect(result.metadata.category).toBe("procedure");
    });

    it("detects setup sheets", () => {
      const result = OfficeDocumentPipelineEngine.processDocument("setup.xlsx", {
        simulatedText: "Job setup sheet fixture",
      });
      expect(result.metadata.category).toBe("setup_sheet");
    });

    it("detects inspection reports", () => {
      const result = OfficeDocumentPipelineEngine.processDocument("insp.xlsx", {
        simulatedText: "CMM inspection report quality",
      });
      expect(result.metadata.category).toBe("inspection_report");
    });

    it("detects quotes", () => {
      const result = OfficeDocumentPipelineEngine.processDocument("quote.xlsx", {
        simulatedText: "Quotation for RFQ pricing",
      });
      expect(result.metadata.category).toBe("quote");
    });
  });

  describe("manufacturing data extraction", () => {
    it("extracts multiple tool numbers", () => {
      const result = OfficeDocumentPipelineEngine.processDocument("tools.xlsx", {
        simulatedText: "Tool T1, Tool T2, T3, T10",
      });
      expect(result.manufacturingData.toolNumbers.length).toBeGreaterThanOrEqual(3);
    });

    it("extracts operations", () => {
      const result = OfficeDocumentPipelineEngine.processDocument("ops.docx", {
        simulatedText: "Turning roughing then finishing, drilling holes",
      });
      expect(result.manufacturingData.operations).toContain("turning");
      expect(result.manufacturingData.operations).toContain("drilling");
    });

    it("extracts materials", () => {
      const result = OfficeDocumentPipelineEngine.processDocument("mat.xlsx", {
        simulatedText: "Material: Aluminum 6061, Stainless 304",
      });
      expect(result.manufacturingData.materials).toContain("aluminum");
      expect(result.manufacturingData.materials).toContain("stainless");
    });

    it("extracts dimensions", () => {
      const result = OfficeDocumentPipelineEngine.processDocument("dim.xlsx", {
        simulatedText: "Length 25.4mm, Width 1.5in",
      });
      expect(result.manufacturingData.dimensions.length).toBeGreaterThan(0);
    });
  });

  describe("table type detection", () => {
    it("detects tool list tables", () => {
      const result = OfficeDocumentPipelineEngine.processDocument("tools.xlsx", {
        simulatedTables: [
          {
            headers: ["Tool Number", "Cutter Type", "Diameter"],
            rows: [["T1", "End Mill", "0.5"]],
          },
        ],
      });
      expect(result.tables[0].dataType).toBe("tool_list");
    });

    it("detects material list tables", () => {
      const result = OfficeDocumentPipelineEngine.processDocument("bom.xlsx", {
        simulatedTables: [
          {
            headers: ["Part Number", "Material", "Qty"],
            rows: [["P-001", "Aluminum", "10"]],
          },
        ],
      });
      expect(result.tables[0].dataType).toBe("material_list");
    });

    it("detects speed/feed tables", () => {
      const result = OfficeDocumentPipelineEngine.processDocument("params.xlsx", {
        simulatedTables: [
          {
            headers: ["Material", "Speed RPM", "Feed IPM"],
            rows: [["Steel", "1000", "5"]],
          },
        ],
      });
      expect(result.tables[0].dataType).toBe("speed_feed");
    });
  });

  describe("reset", () => {
    it("clears all extractions", () => {
      OfficeDocumentPipelineEngine.processDocument("test.docx");
      expect(OfficeDocumentPipelineEngine.getAllExtractions().length).toBe(1);

      OfficeDocumentPipelineEngine.reset();
      expect(OfficeDocumentPipelineEngine.getAllExtractions().length).toBe(0);
    });
  });
});
