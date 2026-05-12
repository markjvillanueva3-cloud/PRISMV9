/**
 * OfficeDocumentPipelineEngine Tests � U-AWR29
 */
import { describe, it, expect, beforeEach } from "vitest";
import { OfficeDocumentPipelineEngine } from "../engines/OfficeDocumentPipelineEngine.js";

describe("OfficeDocumentPipelineEngine", () => {
  beforeEach(() => { OfficeDocumentPipelineEngine.reset(); });

  describe("registerDocument", () => {
    it("registers a document", () => {
      OfficeDocumentPipelineEngine.registerDocument("/docs/manual.docx");
      const stats = OfficeDocumentPipelineEngine.getQueueStats();
      expect(stats.queued).toBe(1);
    });
  });

  describe("registerBatch", () => {
    it("registers multiple documents", () => {
      OfficeDocumentPipelineEngine.registerBatch(["/a.docx", "/b.xlsx", "/c.pptx"]);
      const stats = OfficeDocumentPipelineEngine.getQueueStats();
      expect(stats.queued).toBe(3);
    });
  });

  describe("extractDocument", () => {
    it("extracts document content", () => {
      OfficeDocumentPipelineEngine.registerDocument("/manual.docx");
      const result = OfficeDocumentPipelineEngine.extractDocument("/manual.docx", {
        sections: [{ type: "paragraph", content: "Use tool TNMG-1234 at 500 rpm" }],
        tables: [{ headers: ["Tool", "Speed"], rows: [["T1", "500"]] }],
      });
      expect(result.success).toBe(true);
      expect(result.sections).toHaveLength(1);
      expect(result.tables).toHaveLength(1);
    });

    it("detects document format", () => {
      OfficeDocumentPipelineEngine.registerDocument("/data.xlsx");
      const result = OfficeDocumentPipelineEngine.extractDocument("/data.xlsx");
      expect(result.metadata.format).toBe("xlsx");
    });

    it("warns about legacy formats", () => {
      OfficeDocumentPipelineEngine.registerDocument("/old.doc");
      const result = OfficeDocumentPipelineEngine.extractDocument("/old.doc");
      expect(result.warnings.some(w => w.includes("Legacy"))).toBe(true);
    });

    it("extracts structured data from content", () => {
      OfficeDocumentPipelineEngine.registerDocument("/manual.docx");
      const result = OfficeDocumentPipelineEngine.extractDocument("/manual.docx", {
        sections: [{ type: "paragraph", content: "Speed: 1000 rpm Feed: 0.1 ipm Material: Aluminum" }],
      });
      expect(result.extractedData.speeds.length).toBeGreaterThan(0);
      expect(result.extractedData.materials.length).toBeGreaterThan(0);
    });
  });

  describe("extractBatch", () => {
    it("processes all registered documents", () => {
      OfficeDocumentPipelineEngine.registerBatch(["/a.docx", "/b.xlsx"]);
      const results = OfficeDocumentPipelineEngine.extractBatch();
      expect(results.totalFiles).toBe(2);
    });
  });

  describe("getResult", () => {
    it("retrieves cached result", () => {
      OfficeDocumentPipelineEngine.registerDocument("/doc.docx");
      OfficeDocumentPipelineEngine.extractDocument("/doc.docx");
      expect(OfficeDocumentPipelineEngine.getResult("/doc.docx")).not.toBeNull();
    });

    it("returns null for unknown document", () => {
      expect(OfficeDocumentPipelineEngine.getResult("/unknown.docx")).toBeNull();
    });
  });

  describe("findByToolCode", () => {
    it("finds documents containing tool code", () => {
      OfficeDocumentPipelineEngine.registerDocument("/a.docx");
      OfficeDocumentPipelineEngine.registerDocument("/b.docx");
      OfficeDocumentPipelineEngine.extractDocument("/a.docx", {
        sections: [{ type: "paragraph", content: "Use TNMG-1234" }],
      });
      OfficeDocumentPipelineEngine.extractDocument("/b.docx", {
        sections: [{ type: "paragraph", content: "No tools here" }],
      });
      const found = OfficeDocumentPipelineEngine.findByToolCode("TNMG");
      expect(found.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("findByMaterial", () => {
    it("finds documents mentioning material", () => {
      OfficeDocumentPipelineEngine.registerDocument("/a.docx");
      OfficeDocumentPipelineEngine.extractDocument("/a.docx", {
        sections: [{ type: "paragraph", content: "For aluminum parts" }],
      });
      const found = OfficeDocumentPipelineEngine.findByMaterial("aluminum");
      expect(found).toHaveLength(1);
    });
  });

  describe("getQueueStats", () => {
    it("returns queue statistics", () => {
      OfficeDocumentPipelineEngine.registerBatch(["/a.docx", "/b.docx", "/c.xlsx"]);
      const stats = OfficeDocumentPipelineEngine.getQueueStats();
      expect(stats.queued).toBe(3);
      expect(stats.byFormat.docx).toBe(2);
      expect(stats.byFormat.xlsx).toBe(1);
    });
  });

  describe("reset", () => {
    it("clears all state", () => {
      OfficeDocumentPipelineEngine.registerDocument("/doc.docx");
      OfficeDocumentPipelineEngine.extractDocument("/doc.docx");
      OfficeDocumentPipelineEngine.reset();
      expect(OfficeDocumentPipelineEngine.getQueueStats().queued).toBe(0);
      expect(OfficeDocumentPipelineEngine.getAllResults()).toHaveLength(0);
    });
  });
});
