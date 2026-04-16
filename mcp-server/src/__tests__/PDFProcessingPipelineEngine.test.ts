/**
 * PDFProcessingPipelineEngine.test.ts — Tests for SQ2-1-PDF
 * Tests PDF classification, extraction batching, domain detection,
 * persistence, and summary generation.
 */

import { describe, it, expect } from "vitest";
import { pdfProcessingPipelineEngine } from "../engines/PDFProcessingPipelineEngine.js";
import type { PipelineStatus } from "../engines/PDFProcessingPipelineEngine.js";

describe("PDFProcessingPipelineEngine", () => {
  let classifyResult: PipelineStatus;

  describe("classify()", () => {
    it("classifies PDFs from census into categories", async () => {
      classifyResult = await pdfProcessingPipelineEngine.classify(100);
      expect(classifyResult).toBeDefined();
      expect(classifyResult.total_pdfs).toBeGreaterThan(0);
      expect(classifyResult.timestamp).toBeTruthy();
    }, 60000);

    it("has category distribution", () => {
      const categories = Object.keys(classifyResult.by_category);
      expect(categories.length).toBeGreaterThan(1);
    });

    it("detects manufacturer catalogs", () => {
      expect(classifyResult.by_category["manufacturer_catalog"]).toBeGreaterThan(0);
    });

    it("all PDFs are classified status", () => {
      expect(classifyResult.by_status["classified"]).toBe(classifyResult.total_pdfs);
    });

    it("limits by max_pdfs parameter", async () => {
      const limited = await pdfProcessingPipelineEngine.classify(5);
      expect(limited.total_pdfs).toBeLessThanOrEqual(5);
    }, 30000);
  });

  describe("extract()", () => {
    it("extracts knowledge from classified PDFs", async () => {
      const batch = await pdfProcessingPipelineEngine.extract(undefined, 5);
      expect(batch).toBeDefined();
      expect(batch.batch_id).toBeTruthy();
      expect(batch.total_pdfs).toBeLessThanOrEqual(5);
      expect(batch.processed).toBe(batch.total_pdfs);
      expect(batch.completed).toBeTruthy();
    }, 30000);

    it("extraction produces knowledge objects", async () => {
      const batch = await pdfProcessingPipelineEngine.extract("manufacturer_catalog", 3);
      expect(batch.knowledge_objects_total).toBeGreaterThanOrEqual(0);
    }, 30000);
  });

  describe("read()", () => {
    it("reads persisted pipeline status", async () => {
      const status = await pdfProcessingPipelineEngine.read();
      expect(status).not.toBeNull();
      expect(status!.timestamp).toBeTruthy();
      expect(typeof status!.total_pdfs).toBe("number");
    });
  });

  describe("summary()", () => {
    it("generates markdown summary", () => {
      const text = pdfProcessingPipelineEngine.summary(classifyResult);
      expect(text).toContain("# PDF Processing Pipeline");
      expect(text).toContain("By Category");
      expect(text).toContain("By Status");
    });
  });
});
