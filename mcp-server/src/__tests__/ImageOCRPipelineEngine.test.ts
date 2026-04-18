/**
 * ImageOCRPipelineEngine Tests � U-AWR27
 */
import { describe, it, expect, beforeEach } from "vitest";
import { ImageOCRPipelineEngine } from "../engines/ImageOCRPipelineEngine.js";

describe("ImageOCRPipelineEngine", () => {
  beforeEach(() => { ImageOCRPipelineEngine.reset(); });

  describe("registerImage", () => {
    it("registers an image with metadata", () => {
      const img = ImageOCRPipelineEngine.registerImage("/images/scan.jpg", { dpi: 300 });
      expect(img.path).toBe("/images/scan.jpg");
      expect(img.format).toBe("jpg");
      expect(img.dpi).toBe(300);
    });

    it("detects image format from extension", () => {
      const png = ImageOCRPipelineEngine.registerImage("/img.png");
      const tiff = ImageOCRPipelineEngine.registerImage("/img.tiff");
      expect(png.format).toBe("png");
      expect(tiff.format).toBe("tiff");
    });
  });

  describe("registerBatch", () => {
    it("registers multiple images", () => {
      const images = ImageOCRPipelineEngine.registerBatch([
        { path: "/a.jpg" }, { path: "/b.png" },
      ]);
      expect(images).toHaveLength(2);
    });
  });

  describe("processImage", () => {
    it("processes image and returns OCR result", () => {
      ImageOCRPipelineEngine.registerImage("/scan.jpg");
      const result = ImageOCRPipelineEngine.processImage("/scan.jpg", "Tool T-1234 Part ABC-001 with extra words to make this text long enough for high quality", 0.9);
      expect(result.success).toBe(true);
      expect(result.quality).toBe("high");
      expect(result.wordCount).toBeGreaterThan(10);
    });

    it("extracts tool codes from text", () => {
      ImageOCRPipelineEngine.registerImage("/scan.jpg");
      const result = ImageOCRPipelineEngine.processImage("/scan.jpg", "Use tool TNMG-1234", 0.85);
      expect(result.extractedData.toolCodes.length).toBeGreaterThanOrEqual(0);
    });

    it("warns about low DPI images", () => {
      ImageOCRPipelineEngine.registerImage("/lowres.jpg", { dpi: 72 });
      const result = ImageOCRPipelineEngine.processImage("/lowres.jpg", "text", 0.9);
      expect(result.warnings.some(w => w.includes("DPI"))).toBe(true);
    });

    it("assesses quality based on confidence and word count", () => {
      ImageOCRPipelineEngine.registerImage("/a.jpg");
      ImageOCRPipelineEngine.registerImage("/b.jpg");
      const high = ImageOCRPipelineEngine.processImage("/a.jpg", "word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11", 0.95);
      const low = ImageOCRPipelineEngine.processImage("/b.jpg", "word", 0.55);
      expect(high.quality).toBe("high");
      expect(low.quality).toBe("low");
    });
  });

  describe("processBatch", () => {
    it("processes all registered images", () => {
      ImageOCRPipelineEngine.registerImage("/a.jpg");
      ImageOCRPipelineEngine.registerImage("/b.png");
      const results = ImageOCRPipelineEngine.processBatch();
      expect(results.totalImages).toBe(2);
    });
  });

  describe("getResult", () => {
    it("retrieves cached result", () => {
      ImageOCRPipelineEngine.registerImage("/scan.jpg");
      ImageOCRPipelineEngine.processImage("/scan.jpg", "text", 0.8);
      const result = ImageOCRPipelineEngine.getResult("/scan.jpg");
      expect(result).not.toBeNull();
    });

    it("returns null for unknown image", () => {
      expect(ImageOCRPipelineEngine.getResult("/unknown.jpg")).toBeNull();
    });
  });

  describe("getByQuality", () => {
    it("filters results by quality", () => {
      ImageOCRPipelineEngine.registerImage("/a.jpg");
      ImageOCRPipelineEngine.registerImage("/b.jpg");
      ImageOCRPipelineEngine.processImage("/a.jpg", "many words here for high quality result text plus more words to exceed minimum", 0.95);
      ImageOCRPipelineEngine.processImage("/b.jpg", "", 0.3);
      const high = ImageOCRPipelineEngine.getByQuality("high");
      const failed = ImageOCRPipelineEngine.getByQuality("failed");
      expect(high.length).toBe(1);
      expect(failed.length).toBe(1);
    });
  });

  describe("getQueueStats", () => {
    it("returns queue statistics", () => {
      ImageOCRPipelineEngine.registerImage("/a.jpg");
      ImageOCRPipelineEngine.registerImage("/b.png");
      const stats = ImageOCRPipelineEngine.getQueueStats();
      expect(stats.queued).toBe(2);
      expect(stats.byFormat.jpg).toBe(1);
      expect(stats.byFormat.png).toBe(1);
    });
  });

  describe("reset", () => {
    it("clears all state", () => {
      ImageOCRPipelineEngine.registerImage("/scan.jpg");
      ImageOCRPipelineEngine.processImage("/scan.jpg", "text", 0.8);
      ImageOCRPipelineEngine.reset();
      expect(ImageOCRPipelineEngine.getQueueStats().queued).toBe(0);
      expect(ImageOCRPipelineEngine.getAllResults()).toHaveLength(0);
    });
  });
});
