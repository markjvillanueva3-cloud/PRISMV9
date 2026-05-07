/**
 * Tests for DarkContentClassifierEngine — U-AWR22
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  DarkContentClassifierEngine,
  ContentAssessment,
  DarkContentCategory,
  ExtractionDifficulty,
} from "../engines/DarkContentClassifierEngine.js";

describe("DarkContentClassifierEngine", () => {
  beforeEach(() => {
    DarkContentClassifierEngine.reset();
  });

  describe("classifyFile", () => {
    it("classifies encrypted files as impossible", () => {
      const result = DarkContentClassifierEngine.classifyFile("secret.pdf", {
        isEncrypted: true,
      });
      expect(result.category).toBe("encrypted");
      expect(result.difficulty).toBe("impossible");
      expect(result.estimatedEffort).toBe("manual_only");
    });

    it("classifies corrupted files as impossible", () => {
      const result = DarkContentClassifierEngine.classifyFile("broken.pdf", {
        isCorrupted: true,
      });
      expect(result.category).toBe("corrupted");
      expect(result.difficulty).toBe("impossible");
    });

    it("classifies scanned PDFs as hard", () => {
      const result = DarkContentClassifierEngine.classifyFile("scanned.pdf", {
        isScanned: true,
        hasTextLayer: false,
      });
      expect(result.category).toBe("scanned_pdf");
      expect(result.difficulty).toBe("hard");
      expect(result.alternativePipelines).toContain("OCRExtractionPipeline");
    });

    it("classifies normal PDFs as extractable", () => {
      const result = DarkContentClassifierEngine.classifyFile("document.pdf", {
        hasTextLayer: true,
        isScanned: false,
      });
      expect(result.category).toBe("extractable");
      expect(result.difficulty).toBe("easy");
    });

    it("classifies proprietary CAD formats", () => {
      const result = DarkContentClassifierEngine.classifyFile("part.sldprt");
      expect(result.category).toBe("proprietary_binary");
      expect(result.difficulty).toBe("moderate");
      expect(result.indicators[0]).toContain("SolidWorks");
    });

    it("classifies Mastercam files", () => {
      const result = DarkContentClassifierEngine.classifyFile("project.mcx-8");
      expect(result.category).toBe("proprietary_binary");
      expect(result.indicators[0]).toContain("Mastercam");
      expect(result.alternativePipelines).toContain("MastercamProjectAnalyzer");
    });

    it("classifies images as image_only", () => {
      const result = DarkContentClassifierEngine.classifyFile("drawing.png");
      expect(result.category).toBe("image_only");
      expect(result.difficulty).toBe("moderate");
      expect(result.alternativePipelines).toContain("ImageOCRPipeline");
    });

    it("classifies low DPI images as low_quality", () => {
      const result = DarkContentClassifierEngine.classifyFile("blurry.jpg", {
        dpi: 72,
      });
      expect(result.category).toBe("low_quality");
      expect(result.difficulty).toBe("hard");
      expect(result.indicators).toContain("Low DPI (<150)");
    });

    it("classifies unknown formats", () => {
      const result = DarkContentClassifierEngine.classifyFile("mystery.xyz");
      expect(result.category).toBe("unknown_format");
      expect(result.difficulty).toBe("hard");
      expect(result.confidence).toBe(0.5);
    });

    it("handles files without extensions", () => {
      const result = DarkContentClassifierEngine.classifyFile("noextension");
      expect(result.category).toBe("unknown_format");
    });
  });

  describe("classifyBatch", () => {
    it("classifies multiple files", () => {
      const results = DarkContentClassifierEngine.classifyBatch([
        { path: "doc.pdf", metadata: { hasTextLayer: true } },
        { path: "scan.pdf", metadata: { isScanned: true } },
        { path: "part.sldprt" },
      ]);
      expect(results.length).toBe(3);
      expect(results[0].category).toBe("extractable");
      expect(results[1].category).toBe("scanned_pdf");
      expect(results[2].category).toBe("proprietary_binary");
    });
  });

  describe("isDarkContent", () => {
    it("returns false for extractable content", () => {
      const assessment = DarkContentClassifierEngine.classifyFile("doc.pdf", {
        hasTextLayer: true,
      });
      expect(DarkContentClassifierEngine.isDarkContent(assessment)).toBe(false);
    });

    it("returns true for scanned PDFs", () => {
      const assessment = DarkContentClassifierEngine.classifyFile("scan.pdf", {
        isScanned: true,
      });
      expect(DarkContentClassifierEngine.isDarkContent(assessment)).toBe(true);
    });

    it("returns true for encrypted files", () => {
      const assessment = DarkContentClassifierEngine.classifyFile("secret.pdf", {
        isEncrypted: true,
      });
      expect(DarkContentClassifierEngine.isDarkContent(assessment)).toBe(true);
    });
  });

  describe("getDifficultyScore", () => {
    it("returns correct scores", () => {
      expect(DarkContentClassifierEngine.getDifficultyScore("easy")).toBe(0.1);
      expect(DarkContentClassifierEngine.getDifficultyScore("moderate")).toBe(0.4);
      expect(DarkContentClassifierEngine.getDifficultyScore("hard")).toBe(0.7);
      expect(DarkContentClassifierEngine.getDifficultyScore("impossible")).toBe(1.0);
    });
  });

  describe("generateReport", () => {
    beforeEach(() => {
      DarkContentClassifierEngine.classifyFile("doc1.pdf", { hasTextLayer: true });
      DarkContentClassifierEngine.classifyFile("scan.pdf", { isScanned: true });
      DarkContentClassifierEngine.classifyFile("part.sldprt");
      DarkContentClassifierEngine.classifyFile("secret.pdf", { isEncrypted: true });
    });

    it("counts total files", () => {
      const report = DarkContentClassifierEngine.generateReport();
      expect(report.totalFiles).toBe(4);
    });

    it("separates extractable from dark content", () => {
      const report = DarkContentClassifierEngine.generateReport();
      expect(report.extractable).toBe(1);
      expect(report.darkContent).toBe(3);
    });

    it("categorizes by type", () => {
      const report = DarkContentClassifierEngine.generateReport();
      expect(report.byCategory.extractable).toBe(1);
      expect(report.byCategory.scanned_pdf).toBe(1);
      expect(report.byCategory.proprietary_binary).toBe(1);
      expect(report.byCategory.encrypted).toBe(1);
    });

    it("categorizes by difficulty", () => {
      const report = DarkContentClassifierEngine.generateReport();
      expect(report.byDifficulty.easy).toBe(1);
      expect(report.byDifficulty.moderate).toBe(1);
      expect(report.byDifficulty.hard).toBe(1);
      expect(report.byDifficulty.impossible).toBe(1);
    });

    it("generates recommendations", () => {
      const report = DarkContentClassifierEngine.generateReport();
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some((r) => r.includes("OCR"))).toBe(true);
    });

    it("builds priority queue sorted by difficulty", () => {
      const report = DarkContentClassifierEngine.generateReport();
      expect(report.priorityQueue.length).toBe(3); // excludes extractable
      // Should be sorted: moderate, hard, impossible
      expect(report.priorityQueue[0].difficulty).toBe("moderate");
      expect(report.priorityQueue[2].difficulty).toBe("impossible");
    });
  });

  describe("getAssessment", () => {
    it("returns null for unclassified files", () => {
      expect(DarkContentClassifierEngine.getAssessment("unknown.pdf")).toBeNull();
    });

    it("returns assessment for classified files", () => {
      DarkContentClassifierEngine.classifyFile("test.pdf", { hasTextLayer: true });
      const assessment = DarkContentClassifierEngine.getAssessment("test.pdf");
      expect(assessment).not.toBeNull();
      expect(assessment?.category).toBe("extractable");
    });
  });

  describe("getByCategory", () => {
    beforeEach(() => {
      DarkContentClassifierEngine.classifyFile("a.pdf", { isScanned: true });
      DarkContentClassifierEngine.classifyFile("b.pdf", { isScanned: true });
      DarkContentClassifierEngine.classifyFile("c.sldprt");
    });

    it("filters by category", () => {
      const scanned = DarkContentClassifierEngine.getByCategory("scanned_pdf");
      expect(scanned.length).toBe(2);
    });

    it("returns empty for unused category", () => {
      const encrypted = DarkContentClassifierEngine.getByCategory("encrypted");
      expect(encrypted.length).toBe(0);
    });
  });

  describe("getByDifficulty", () => {
    beforeEach(() => {
      DarkContentClassifierEngine.classifyFile("a.pdf", { hasTextLayer: true }); // easy
      DarkContentClassifierEngine.classifyFile("b.sldprt"); // moderate
      DarkContentClassifierEngine.classifyFile("c.pdf", { isEncrypted: true }); // impossible
    });

    it("filters by difficulty", () => {
      const easy = DarkContentClassifierEngine.getByDifficulty("easy");
      expect(easy.length).toBe(1);
      expect(easy[0].filePath).toBe("a.pdf");
    });
  });

  describe("getForPipeline", () => {
    beforeEach(() => {
      DarkContentClassifierEngine.classifyFile("scan1.pdf", { isScanned: true });
      DarkContentClassifierEngine.classifyFile("scan2.pdf", { isScanned: true });
      DarkContentClassifierEngine.classifyFile("part.sldprt");
    });

    it("finds files for OCR pipeline", () => {
      const ocrFiles = DarkContentClassifierEngine.getForPipeline("OCRExtractionPipeline");
      expect(ocrFiles.length).toBe(2);
    });

    it("finds files for vendor pipeline", () => {
      const swFiles = DarkContentClassifierEngine.getForPipeline("SolidWorksImportEngine");
      expect(swFiles.length).toBe(1);
    });
  });

  describe("suggestApproach", () => {
    it("suggests standard extraction for extractable files", () => {
      DarkContentClassifierEngine.classifyFile("doc.pdf", { hasTextLayer: true });
      const approach = DarkContentClassifierEngine.suggestApproach("doc.pdf");
      expect(approach.primary).toBe("Standard extraction pipeline");
      expect(approach.estimatedSuccess).toBe(0.95);
    });

    it("suggests OCR for scanned PDFs", () => {
      DarkContentClassifierEngine.classifyFile("scan.pdf", { isScanned: true });
      const approach = DarkContentClassifierEngine.suggestApproach("scan.pdf");
      expect(approach.primary).toContain("OCR");
      expect(approach.estimatedSuccess).toBe(0.4); // hard difficulty
    });

    it("returns low success for impossible files", () => {
      DarkContentClassifierEngine.classifyFile("secret.pdf", { isEncrypted: true });
      const approach = DarkContentClassifierEngine.suggestApproach("secret.pdf");
      expect(approach.estimatedSuccess).toBe(0.05);
    });

    it("returns zero for unclassified files", () => {
      const approach = DarkContentClassifierEngine.suggestApproach("unknown.pdf");
      expect(approach.estimatedSuccess).toBe(0);
    });
  });

  describe("getSupportedProprietaryFormats", () => {
    it("returns list of supported formats", () => {
      const formats = DarkContentClassifierEngine.getSupportedProprietaryFormats();
      expect(formats.length).toBeGreaterThan(0);
    });

    it("includes Mastercam formats", () => {
      const formats = DarkContentClassifierEngine.getSupportedProprietaryFormats();
      const mcx = formats.find((f) => f.extension === ".mcx-8");
      expect(mcx).toBeDefined();
      expect(mcx?.vendor).toBe("Mastercam");
    });

    it("includes SolidWorks formats", () => {
      const formats = DarkContentClassifierEngine.getSupportedProprietaryFormats();
      const sldprt = formats.find((f) => f.extension === ".sldprt");
      expect(sldprt).toBeDefined();
      expect(sldprt?.vendor).toBe("SolidWorks");
    });

    it("includes hyperMILL formats", () => {
      const formats = DarkContentClassifierEngine.getSupportedProprietaryFormats();
      const hyp = formats.find((f) => f.extension === ".hyp");
      expect(hyp).toBeDefined();
      expect(hyp?.vendor).toBe("hyperMILL");
    });
  });

  describe("reset", () => {
    it("clears all assessments", () => {
      DarkContentClassifierEngine.classifyFile("test.pdf", { hasTextLayer: true });
      expect(DarkContentClassifierEngine.getAllAssessments().length).toBe(1);

      DarkContentClassifierEngine.reset();
      expect(DarkContentClassifierEngine.getAllAssessments().length).toBe(0);
    });
  });

  describe("proprietary format coverage", () => {
    it("classifies CATIA formats", () => {
      const catpart = DarkContentClassifierEngine.classifyFile("model.catpart");
      expect(catpart.indicators[0]).toContain("CATIA");
    });

    it("classifies NX formats", () => {
      const prt = DarkContentClassifierEngine.classifyFile("model.prt");
      expect(prt.indicators[0]).toContain("NX");
    });

    it("classifies Inventor formats", () => {
      const ipt = DarkContentClassifierEngine.classifyFile("part.ipt");
      expect(ipt.indicators[0]).toContain("Inventor");
    });

    it("classifies hyperMILL formats", () => {
      const hmc = DarkContentClassifierEngine.classifyFile("project.hmc");
      expect(hmc.indicators[0]).toContain("hyperMILL");
    });
  });

  describe("image format coverage", () => {
    const imageExts = [".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp", ".gif"];

    for (const ext of imageExts) {
      it(`classifies ${ext} images`, () => {
        const result = DarkContentClassifierEngine.classifyFile(`image${ext}`);
        expect(result.category).toBe("image_only");
      });
    }
  });

  describe("estimated effort", () => {
    it("assigns minutes for easy extraction", () => {
      const result = DarkContentClassifierEngine.classifyFile("doc.pdf", {
        hasTextLayer: true,
      });
      expect(result.estimatedEffort).toBe("minutes");
    });

    it("assigns hours for hard extraction", () => {
      const result = DarkContentClassifierEngine.classifyFile("scan.pdf", {
        isScanned: true,
      });
      expect(result.estimatedEffort).toBe("hours");
    });

    it("assigns manual_only for impossible", () => {
      const result = DarkContentClassifierEngine.classifyFile("locked.pdf", {
        isEncrypted: true,
      });
      expect(result.estimatedEffort).toBe("manual_only");
    });
  });
});
