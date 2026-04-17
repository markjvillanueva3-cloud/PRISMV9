/**
 * Tests for ImageOCRPipelineEngine — U-AWR27
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ImageOCRPipelineEngine,
  OCRResult,
  OCRQuality,
  ContentType,
} from "../engines/ImageOCRPipelineEngine.js";

describe("ImageOCRPipelineEngine", () => {
  beforeEach(() => {
    ImageOCRPipelineEngine.reset();
  });

  describe("processImage", () => {
    it("processes an image and returns result", () => {
      const result = ImageOCRPipelineEngine.processImage("drawing.png");
      expect(result).toBeDefined();
      expect(result.imagePath).toBe("drawing.png");
      expect(result.format).toBe("png");
    });

    it("applies preprocessing steps", () => {
      const result = ImageOCRPipelineEngine.processImage("scan.jpg");
      expect(result.preprocessingSteps.length).toBeGreaterThan(0);
      expect(result.preprocessingSteps.some((s) => s.name === "Deskew")).toBe(true);
    });

    it("uses simulated text for extraction", () => {
      const result = ImageOCRPipelineEngine.processImage("spec.png", {
        simulatedText: "Part 123-ABC, Dimension: 25.4mm",
      });
      expect(result.rawText).toContain("Part 123-ABC");
      expect(result.extractedData.dimensions.length).toBeGreaterThan(0);
    });

    it("assesses quality based on DPI and confidence", () => {
      const excellent = ImageOCRPipelineEngine.processImage("high.png", {
        simulatedDpi: 600,
        simulatedConfidence: 0.98,
      });
      expect(excellent.quality).toBe("excellent");

      const poor = ImageOCRPipelineEngine.processImage("low.png", {
        simulatedDpi: 72,
        simulatedConfidence: 0.55,
      });
      expect(poor.quality).toBe("poor");
    });

    it("adds warnings for low quality", () => {
      const result = ImageOCRPipelineEngine.processImage("blurry.jpg", {
        simulatedDpi: 100,
        simulatedConfidence: 0.5,
      });
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes("DPI"))).toBe(true);
    });

    it("detects content type from text", () => {
      const result = ImageOCRPipelineEngine.processImage("drawing.png", {
        simulatedText: "Specification: 10mm ±0.1mm tolerance",
      });
      expect(result.contentType).toBe("engineering_drawing");
    });
  });

  describe("processBatch", () => {
    it("processes multiple images", () => {
      const results = ImageOCRPipelineEngine.processBatch([
        { path: "a.png", simulatedText: "Text A" },
        { path: "b.jpg", simulatedText: "Text B" },
        { path: "c.tiff", simulatedText: "Text C" },
      ]);
      expect(results.length).toBe(3);
    });
  });

  describe("getResult", () => {
    it("returns null for unprocessed image", () => {
      expect(ImageOCRPipelineEngine.getResult("unknown.png")).toBeNull();
    });

    it("returns result for processed image", () => {
      ImageOCRPipelineEngine.processImage("test.png");
      const result = ImageOCRPipelineEngine.getResult("test.png");
      expect(result).not.toBeNull();
    });
  });

  describe("getResultsByQuality", () => {
    beforeEach(() => {
      ImageOCRPipelineEngine.processImage("excellent.png", {
        simulatedDpi: 600,
        simulatedConfidence: 0.98,
      });
      ImageOCRPipelineEngine.processImage("good.png", {
        simulatedDpi: 300,
        simulatedConfidence: 0.88,
      });
      ImageOCRPipelineEngine.processImage("poor.png", {
        simulatedDpi: 72,
        simulatedConfidence: 0.55,
      });
    });

    it("filters by quality level", () => {
      const excellent = ImageOCRPipelineEngine.getResultsByQuality("excellent");
      expect(excellent.length).toBe(1);
      expect(excellent[0].imagePath).toBe("excellent.png");
    });
  });

  describe("getResultsByContentType", () => {
    beforeEach(() => {
      ImageOCRPipelineEngine.processImage("drawing.png", {
        simulatedText: "10mm ±0.05mm tolerance",
      });
      ImageOCRPipelineEngine.processImage("photo.jpg", {
        simulatedText: "Random text without dimensions",
      });
    });

    it("filters by content type", () => {
      const drawings = ImageOCRPipelineEngine.getResultsByContentType("engineering_drawing");
      expect(drawings.length).toBe(1);
    });
  });

  describe("getResultsNeedingReview", () => {
    beforeEach(() => {
      ImageOCRPipelineEngine.processImage("good.png", {
        simulatedDpi: 300,
        simulatedConfidence: 0.95,
      });
      ImageOCRPipelineEngine.processImage("bad.png", {
        simulatedDpi: 72,
        simulatedConfidence: 0.4,
      });
    });

    it("returns low quality results", () => {
      const needReview = ImageOCRPipelineEngine.getResultsNeedingReview();
      expect(needReview.length).toBe(1);
      expect(needReview[0].imagePath).toBe("bad.png");
    });
  });

  describe("configuration", () => {
    it("allows setting config", () => {
      ImageOCRPipelineEngine.setConfig({ language: "deu", deskew: false });
      const config = ImageOCRPipelineEngine.getConfig();
      expect(config.language).toBe("deu");
      expect(config.deskew).toBe(false);
    });

    it("resets config to defaults", () => {
      ImageOCRPipelineEngine.setConfig({ language: "fra" });
      ImageOCRPipelineEngine.resetConfig();
      const config = ImageOCRPipelineEngine.getConfig();
      expect(config.language).toBe("eng");
    });
  });

  describe("extractManufacturingData", () => {
    it("extracts dimensions", () => {
      const data = ImageOCRPipelineEngine.extractManufacturingData(
        "Length: 25.4mm Width: 10in"
      );
      expect(data.dimensions).toContain("25.4mm");
      expect(data.dimensions).toContain("10in");
    });

    it("extracts tolerances", () => {
      const data = ImageOCRPipelineEngine.extractManufacturingData(
        "Tolerance: ±0.05mm, +0.1mm"
      );
      expect(data.tolerances.length).toBeGreaterThan(0);
    });

    it("extracts part numbers", () => {
      const data = ImageOCRPipelineEngine.extractManufacturingData(
        "Part# ABC-123 P/N: XYZ-789"
      );
      expect(data.partNumbers).toContain("ABC-123");
      expect(data.partNumbers).toContain("XYZ-789");
    });

    it("extracts materials", () => {
      const data = ImageOCRPipelineEngine.extractManufacturingData(
        "Material: 6061-T6 Aluminum"
      );
      expect(data.materials.length).toBeGreaterThan(0);
    });

    it("extracts dates", () => {
      const data = ImageOCRPipelineEngine.extractManufacturingData(
        "Date: 01/15/2026 Rev: 03-20-2025"
      );
      expect(data.dates).toContain("01/15/2026");
      expect(data.dates).toContain("03-20-2025");
    });

    it("extracts quantities", () => {
      const data = ImageOCRPipelineEngine.extractManufacturingData("Qty: 100 Quantity: 50");
      expect(data.quantities).toContain("100");
      expect(data.quantities).toContain("50");
    });
  });

  describe("assessImageQuality", () => {
    it("returns excellent for high DPI and confidence", () => {
      expect(ImageOCRPipelineEngine.assessImageQuality(600, 0.98)).toBe("excellent");
    });

    it("returns good for moderate DPI and confidence", () => {
      expect(ImageOCRPipelineEngine.assessImageQuality(250, 0.88)).toBe("good");
    });

    it("returns fair for lower quality", () => {
      expect(ImageOCRPipelineEngine.assessImageQuality(175, 0.75)).toBe("fair");
    });

    it("returns poor for low quality", () => {
      expect(ImageOCRPipelineEngine.assessImageQuality(100, 0.55)).toBe("poor");
    });

    it("returns unusable for very low quality", () => {
      expect(ImageOCRPipelineEngine.assessImageQuality(72, 0.3)).toBe("unusable");
    });
  });

  describe("getSupportedFormats", () => {
    it("returns list of supported formats", () => {
      const formats = ImageOCRPipelineEngine.getSupportedFormats();
      expect(formats).toContain("jpg");
      expect(formats).toContain("png");
      expect(formats).toContain("tiff");
    });
  });

  describe("isSupportedFormat", () => {
    it("returns true for supported formats", () => {
      expect(ImageOCRPipelineEngine.isSupportedFormat("image.png")).toBe(true);
      expect(ImageOCRPipelineEngine.isSupportedFormat("photo.jpg")).toBe(true);
      expect(ImageOCRPipelineEngine.isSupportedFormat("scan.tiff")).toBe(true);
    });

    it("returns false for unsupported formats", () => {
      expect(ImageOCRPipelineEngine.isSupportedFormat("document.pdf")).toBe(false);
      expect(ImageOCRPipelineEngine.isSupportedFormat("video.mp4")).toBe(false);
    });
  });

  describe("getStatistics", () => {
    beforeEach(() => {
      ImageOCRPipelineEngine.processImage("a.png", {
        simulatedDpi: 600,
        simulatedConfidence: 0.98,
        simulatedText: "Part# A-123, 10mm",
      });
      ImageOCRPipelineEngine.processImage("b.jpg", {
        simulatedDpi: 300,
        simulatedConfidence: 0.85,
        simulatedText: "Part# B-456",
      });
    });

    it("counts total processed", () => {
      const stats = ImageOCRPipelineEngine.getStatistics();
      expect(stats.totalProcessed).toBe(2);
    });

    it("groups by quality", () => {
      const stats = ImageOCRPipelineEngine.getStatistics();
      expect(stats.byQuality.excellent).toBe(1);
      expect(stats.byQuality.good).toBe(1);
    });

    it("calculates average confidence", () => {
      const stats = ImageOCRPipelineEngine.getStatistics();
      expect(stats.averageConfidence).toBeCloseTo(0.915, 2);
    });

    it("counts extracted data", () => {
      const stats = ImageOCRPipelineEngine.getStatistics();
      expect(stats.totalDimensions).toBeGreaterThan(0);
      expect(stats.totalPartNumbers).toBe(2);
    });
  });

  describe("image format detection", () => {
    const formatTests = [
      { file: "image.jpg", expected: "jpg" },
      { file: "image.jpeg", expected: "jpeg" },
      { file: "image.png", expected: "png" },
      { file: "image.tif", expected: "tif" },
      { file: "image.tiff", expected: "tiff" },
      { file: "image.bmp", expected: "bmp" },
      { file: "image.gif", expected: "gif" },
      { file: "image.webp", expected: "webp" },
    ];

    for (const test of formatTests) {
      it(`detects ${test.expected} format`, () => {
        const result = ImageOCRPipelineEngine.processImage(test.file);
        expect(result.format).toBe(test.expected);
      });
    }
  });

  describe("content type detection", () => {
    it("detects engineering drawings from filename", () => {
      const result = ImageOCRPipelineEngine.processImage("part_drawing.png", {
        simulatedText: "Drawing of part",
      });
      expect(result.contentType).toBe("engineering_drawing");
    });

    it("detects labels from filename", () => {
      const result = ImageOCRPipelineEngine.processImage("shipping_label.jpg", {
        simulatedText: "Ship to address",
      });
      expect(result.contentType).toBe("label");
    });

    it("detects scans from filename", () => {
      const result = ImageOCRPipelineEngine.processImage("document_scan.png", {
        simulatedText: "Scanned document",
      });
      expect(result.contentType).toBe("scan");
    });
  });

  describe("reset", () => {
    it("clears all results", () => {
      ImageOCRPipelineEngine.processImage("test.png");
      expect(ImageOCRPipelineEngine.getAllResults().length).toBe(1);

      ImageOCRPipelineEngine.reset();
      expect(ImageOCRPipelineEngine.getAllResults().length).toBe(0);
    });

    it("resets config", () => {
      ImageOCRPipelineEngine.setConfig({ language: "deu" });
      ImageOCRPipelineEngine.reset();
      expect(ImageOCRPipelineEngine.getConfig().language).toBe("eng");
    });
  });
});
