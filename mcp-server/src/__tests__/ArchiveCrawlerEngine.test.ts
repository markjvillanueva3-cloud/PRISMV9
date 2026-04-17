/**
 * Tests for ArchiveCrawlerEngine — U-AWR21
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ArchiveCrawlerEngine,
  ArchiveEntry,
  ArchiveContent,
} from "../engines/ArchiveCrawlerEngine.js";

describe("ArchiveCrawlerEngine", () => {
  beforeEach(() => {
    ArchiveCrawlerEngine.reset();
  });

  describe("simulateAnalysis", () => {
    it("analyzes simulated archive contents", () => {
      const content = ArchiveCrawlerEngine.simulateAnalysis(
        "test.zip",
        ["file1.txt", "file2.pdf", "program.min"]
      );
      expect(content).toBeDefined();
      expect(content.totalFiles).toBe(3);
    });

    it("counts file types correctly", () => {
      const content = ArchiveCrawlerEngine.simulateAnalysis(
        "test.zip",
        ["a.pdf", "b.pdf", "c.txt", "d.min"]
      );
      expect(content.fileTypes[".pdf"]).toBe(2);
      expect(content.fileTypes[".txt"]).toBe(1);
      expect(content.fileTypes[".min"]).toBe(1);
    });

    it("identifies nested archives", () => {
      const content = ArchiveCrawlerEngine.simulateAnalysis(
        "outer.zip",
        ["inner1.zip", "inner2.rar", "doc.pdf"]
      );
      expect(content.nestedArchives.length).toBe(2);
      expect(content.nestedArchives).toContain("inner1.zip");
      expect(content.nestedArchives).toContain("inner2.rar");
    });

    it("identifies high-value files", () => {
      const content = ArchiveCrawlerEngine.simulateAnalysis(
        "programs.zip",
        ["part1.min", "drawing.step", "readme.txt"]
      );
      expect(content.highValueFiles.length).toBeGreaterThan(0);
      const minFile = content.highValueFiles.find(f => f.path === "part1.min");
      expect(minFile).toBeDefined();
      expect(minFile?.estimatedValue).toBe("high");
    });

    it("categorizes files correctly", () => {
      const content = ArchiveCrawlerEngine.simulateAnalysis(
        "mixed.zip",
        ["prog.min", "model.step", "data.xlsx", "image.png"]
      );
      const categories = content.highValueFiles.map(f => f.category);
      expect(categories).toContain("gcode");
    });
  });

  describe("getExtractionRoute", () => {
    it("routes .min files to NCPatternMinerEngine", () => {
      const route = ArchiveCrawlerEngine.getExtractionRoute("part.min");
      expect(route).toBeDefined();
      expect(route?.targetPipeline).toBe("NCPatternMinerEngine");
    });

    it("routes .mcx-8 files to MastercamProjectAnalyzer", () => {
      const route = ArchiveCrawlerEngine.getExtractionRoute("project.mcx-8");
      expect(route).toBeDefined();
      expect(route?.targetPipeline).toBe("MastercamProjectAnalyzer");
    });

    it("routes .step files to CADValidationEngine", () => {
      const route = ArchiveCrawlerEngine.getExtractionRoute("model.step");
      expect(route).toBeDefined();
      expect(route?.targetPipeline).toBe("CADValidationEngine");
    });

    it("routes .pdf files to PDFExtractionPipeline", () => {
      const route = ArchiveCrawlerEngine.getExtractionRoute("manual.pdf");
      expect(route).toBeDefined();
      expect(route?.targetPipeline).toBe("PDFExtractionPipeline");
    });

    it("returns null for unknown file types", () => {
      const route = ArchiveCrawlerEngine.getExtractionRoute("unknown.xyz");
      expect(route).toBeNull();
    });
  });

  describe("getDiscoveredArchives", () => {
    it("returns empty array initially", () => {
      const archives = ArchiveCrawlerEngine.getDiscoveredArchives();
      expect(archives).toEqual([]);
    });
  });

  describe("getArchiveContent", () => {
    it("returns null for unknown archive", () => {
      const content = ArchiveCrawlerEngine.getArchiveContent("nonexistent.zip");
      expect(content).toBeNull();
    });

    it("returns content after simulation", () => {
      ArchiveCrawlerEngine.simulateAnalysis("test.zip", ["file.txt"]);
      const content = ArchiveCrawlerEngine.getArchiveContent("test.zip");
      expect(content).toBeDefined();
      expect(content?.archive).toBe("test.zip");
    });
  });

  describe("generateCrawlReport", () => {
    it("generates empty report initially", () => {
      const report = ArchiveCrawlerEngine.generateCrawlReport();
      expect(report.totalArchives).toBe(0);
      expect(report.totalFiles).toBe(0);
    });

    it("includes format breakdown", () => {
      const report = ArchiveCrawlerEngine.generateCrawlReport();
      expect(report.archivesByFormat).toBeDefined();
      expect(report.archivesByFormat.zip).toBe(0);
      expect(report.archivesByFormat.rar).toBe(0);
    });

    it("includes recommendations array", () => {
      const report = ArchiveCrawlerEngine.generateCrawlReport();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe("reset", () => {
    it("clears cached data", () => {
      ArchiveCrawlerEngine.simulateAnalysis("test.zip", ["file.txt"]);
      expect(ArchiveCrawlerEngine.getArchiveContent("test.zip")).toBeDefined();

      ArchiveCrawlerEngine.reset();

      expect(ArchiveCrawlerEngine.getArchiveContent("test.zip")).toBeNull();
      expect(ArchiveCrawlerEngine.getDiscoveredArchives()).toEqual([]);
    });
  });

  describe("archive format detection", () => {
    it("detects ZIP format", () => {
      const content = ArchiveCrawlerEngine.simulateAnalysis("file.zip", []);
      expect(content.format).toBe("zip");
    });

    it("detects RAR format", () => {
      const content = ArchiveCrawlerEngine.simulateAnalysis("file.rar", []);
      expect(content.format).toBe("rar");
    });

    it("detects 7z format", () => {
      const content = ArchiveCrawlerEngine.simulateAnalysis("file.7z", []);
      expect(content.format).toBe("7z");
    });

    it("detects TAR format", () => {
      const content = ArchiveCrawlerEngine.simulateAnalysis("file.tar", []);
      expect(content.format).toBe("tar");
    });

    it("detects GZ format", () => {
      const content = ArchiveCrawlerEngine.simulateAnalysis("file.gz", []);
      expect(content.format).toBe("gz");
    });
  });

  describe("high-value file detection", () => {
    it("marks .min files as high value", () => {
      const content = ArchiveCrawlerEngine.simulateAnalysis(
        "programs.zip",
        ["part123.min"]
      );
      const minFile = content.highValueFiles.find(f => f.path === "part123.min");
      expect(minFile?.estimatedValue).toBe("high");
      expect(minFile?.reason).toContain("Okuma");
    });

    it("marks .mcx-8 files as high value", () => {
      const content = ArchiveCrawlerEngine.simulateAnalysis(
        "projects.zip",
        ["project.mcx-8"]
      );
      const mcxFile = content.highValueFiles.find(f => f.path === "project.mcx-8");
      expect(mcxFile?.estimatedValue).toBe("high");
      expect(mcxFile?.reason).toContain("Mastercam");
    });

    it("marks .step files as medium value", () => {
      const content = ArchiveCrawlerEngine.simulateAnalysis(
        "cad.zip",
        ["model.step"]
      );
      const stepFile = content.highValueFiles.find(f => f.path === "model.step");
      expect(stepFile?.estimatedValue).toBe("medium");
    });

    it("does not mark .txt files as high value", () => {
      const content = ArchiveCrawlerEngine.simulateAnalysis(
        "docs.zip",
        ["readme.txt"]
      );
      const txtFile = content.highValueFiles.find(f => f.path === "readme.txt");
      expect(txtFile).toBeUndefined();
    });
  });

  describe("file category classification", () => {
    it("classifies gcode files", () => {
      const content = ArchiveCrawlerEngine.simulateAnalysis(
        "programs.zip",
        ["part.min", "program.nc", "code.tap"]
      );
      const gcodeFiles = content.highValueFiles.filter(f => f.category === "gcode");
      expect(gcodeFiles.length).toBeGreaterThan(0);
    });

    it("classifies CAD files", () => {
      const content = ArchiveCrawlerEngine.simulateAnalysis(
        "cad.zip",
        ["model.step", "drawing.dxf"]
      );
      const cadFiles = content.highValueFiles.filter(f => f.category === "cad");
      expect(cadFiles.length).toBeGreaterThan(0);
    });

    it("classifies CAM files", () => {
      const content = ArchiveCrawlerEngine.simulateAnalysis(
        "cam.zip",
        ["project.mcx-8"]
      );
      const camFiles = content.highValueFiles.filter(f => f.category === "cam");
      expect(camFiles.length).toBeGreaterThan(0);
    });
  });
});
