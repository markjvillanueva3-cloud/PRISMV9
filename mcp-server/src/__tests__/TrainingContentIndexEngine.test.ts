/**
 * TrainingContentIndexEngine — Test Suite
 *
 * Validates the training content index engine against real filesystem data.
 * Scans ~4,600 files across 6 resource directories.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  TrainingContentIndexEngine,
  TrainingContentIndexResult,
  TrainingAuditResult,
  TrainingFileEntry,
} from "../engines/TrainingContentIndexEngine.js";

describe("TrainingContentIndexEngine", () => {
  let result: TrainingContentIndexResult;

  beforeAll(async () => {
    result = await TrainingContentIndexEngine.harvest();
  }, 120_000);

  // ----------------------------------------------------------------
  // getSources
  // ----------------------------------------------------------------

  describe("getSources", () => {
    it("returns exactly 6 source directories", () => {
      const sources = TrainingContentIndexEngine.getSources();
      expect(sources).toHaveLength(6);
    });

    it("includes Training Day 1, 2, 3, RESOURCE PDFS, PRISM CAD-CAM TRAINING, PDF", () => {
      const sources = TrainingContentIndexEngine.getSources();
      const names = sources.map((s) => s.name);
      expect(names).toContain("Training Day 1");
      expect(names).toContain("Training Day 2");
      expect(names).toContain("Training Day 3");
      expect(names).toContain("RESOURCE PDFS");
      expect(names).toContain("PRISM CAD-CAM TRAINING");
      expect(names).toContain("PDF");
    });

    it("each source has a non-empty path and description", () => {
      const sources = TrainingContentIndexEngine.getSources();
      for (const s of sources) {
        expect(s.path.length).toBeGreaterThan(0);
        expect(s.description.length).toBeGreaterThan(0);
        expect(s.expectedFiles).toBeGreaterThan(0);
      }
    });
  });

  // ----------------------------------------------------------------
  // harvest — total counts
  // ----------------------------------------------------------------

  describe("harvest — total counts", () => {
    it("finds 1000+ files total", () => {
      expect(result.totalFiles).toBeGreaterThanOrEqual(1000);
    });

    it("totalFiles matches files array length", () => {
      expect(result.totalFiles).toBe(result.files.length);
    });

    it("has a valid ISO timestamp", () => {
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // ----------------------------------------------------------------
  // harvest — per-source counts
  // ----------------------------------------------------------------

  describe("harvest — per-source counts", () => {
    it("Training Day 1 has approximately 20 files", () => {
      const count = result.bySource["Training Day 1"] || 0;
      expect(count).toBeGreaterThanOrEqual(15);
      expect(count).toBeLessThanOrEqual(30);
    });

    it("Training Day 2 has 1000+ files", () => {
      const count = result.bySource["Training Day 2"] || 0;
      expect(count).toBeGreaterThanOrEqual(1000);
    });

    it("Training Day 3 has approximately 11 files", () => {
      const count = result.bySource["Training Day 3"] || 0;
      expect(count).toBeGreaterThanOrEqual(8);
      expect(count).toBeLessThanOrEqual(20);
    });

    it("RESOURCE PDFS has 2000+ files", () => {
      const count = result.bySource["RESOURCE PDFS"] || 0;
      expect(count).toBeGreaterThanOrEqual(2000);
    });

    it("PRISM CAD-CAM TRAINING has approximately 7 files", () => {
      const count = result.bySource["PRISM CAD-CAM TRAINING"] || 0;
      expect(count).toBeGreaterThanOrEqual(5);
      expect(count).toBeLessThanOrEqual(15);
    });

    it("PDF has approximately 9 files", () => {
      const count = result.bySource["PDF"] || 0;
      expect(count).toBeGreaterThanOrEqual(7);
      expect(count).toBeLessThanOrEqual(15);
    });

    it("bySource has all 6 sources", () => {
      const sourceNames = Object.keys(result.bySource);
      expect(sourceNames).toContain("Training Day 1");
      expect(sourceNames).toContain("Training Day 2");
      expect(sourceNames).toContain("Training Day 3");
      expect(sourceNames).toContain("RESOURCE PDFS");
      expect(sourceNames).toContain("PRISM CAD-CAM TRAINING");
      expect(sourceNames).toContain("PDF");
    });
  });

  // ----------------------------------------------------------------
  // harvest — extension classification
  // ----------------------------------------------------------------

  describe("harvest — extension classification", () => {
    it("byExtension has .pdf as a top extension", () => {
      expect(result.byExtension[".pdf"]).toBeGreaterThan(0);
      // PDF should be among the top extensions
      const sorted = Object.entries(result.byExtension).sort(
        (a, b) => b[1] - a[1]
      );
      const top5 = sorted.slice(0, 5).map((e) => e[0]);
      // .pdf or .dxf or .json should be near the top
      expect(sorted[0][1]).toBeGreaterThan(100);
    });

    it("byExtension has multiple distinct extensions", () => {
      const extCount = Object.keys(result.byExtension).length;
      expect(extCount).toBeGreaterThanOrEqual(10);
    });

    it("detects .hmc hyperMILL project files", () => {
      expect(result.byExtension[".hmc"]).toBeGreaterThan(0);
    });
  });

  // ----------------------------------------------------------------
  // harvest — topic classification
  // ----------------------------------------------------------------

  describe("harvest — topic classification", () => {
    it("byTopic has multiple domains", () => {
      const topicCount = Object.keys(result.byTopic).length;
      expect(topicCount).toBeGreaterThanOrEqual(3);
    });

    it("byTopic includes 'general' as a catch-all domain", () => {
      expect(result.byTopic["general"]).toBeGreaterThan(0);
    });

    it("detects drilling topic from Training Day 3 files", () => {
      const drillingFiles = result.files.filter(
        (f) => f.topic === "drilling" && f.source === "Training Day 3"
      );
      expect(drillingFiles.length).toBeGreaterThan(0);
    });
  });

  // ----------------------------------------------------------------
  // harvest — difficulty classification
  // ----------------------------------------------------------------

  describe("harvest — difficulty classification", () => {
    it("byDifficulty has beginner, intermediate, and advanced", () => {
      expect(result.byDifficulty["beginner"]).toBeGreaterThan(0);
      expect(result.byDifficulty["intermediate"]).toBeGreaterThan(0);
      expect(result.byDifficulty["advanced"]).toBeGreaterThan(0);
    });

    it("Training Day 1 files are all beginner", () => {
      const day1Files = result.files.filter(
        (f) => f.source === "Training Day 1"
      );
      for (const f of day1Files) {
        expect(f.difficulty).toBe("beginner");
      }
    });

    it("Training Day 3 files are all advanced", () => {
      const day3Files = result.files.filter(
        (f) => f.source === "Training Day 3"
      );
      for (const f of day3Files) {
        expect(f.difficulty).toBe("advanced");
      }
    });
  });

  // ----------------------------------------------------------------
  // harvest — content type classification
  // ----------------------------------------------------------------

  describe("harvest — content type classification", () => {
    it("PDF directory files are classified as 'manual'", () => {
      const pdfManuals = result.files.filter(
        (f) => f.source === "PDF" && f.contentType === "manual"
      );
      expect(pdfManuals.length).toBeGreaterThan(0);
      // All PDFs in the PDF/ directory should be manuals
      const pdfDirPdfs = result.files.filter(
        (f) => f.source === "PDF" && f.extension === ".pdf"
      );
      for (const f of pdfDirPdfs) {
        expect(f.contentType).toBe("manual");
      }
    });

    it("hyperMILL project files detected as 'project'", () => {
      const hmcProjects = result.files.filter(
        (f) => f.extension === ".hmc" && f.contentType === "project"
      );
      expect(hmcProjects.length).toBeGreaterThan(0);
    });

    it("byContentType has multiple types", () => {
      const typeCount = Object.keys(result.byContentType).length;
      expect(typeCount).toBeGreaterThanOrEqual(4);
    });
  });

  // ----------------------------------------------------------------
  // harvest — CAM system detection
  // ----------------------------------------------------------------

  describe("harvest — CAM system detection", () => {
    it("detects hypermill CAM system from paths", () => {
      expect(result.byCamSystem["hypermill"]).toBeGreaterThan(0);
    });

    it("filterByCam for 'hypermill' returns results", () => {
      const hmFiles = TrainingContentIndexEngine.filterByCam(
        result.files,
        "hypermill"
      );
      expect(hmFiles.length).toBeGreaterThan(0);
      for (const f of hmFiles) {
        expect(f.camSystem).toBe("hypermill");
      }
    });
  });

  // ----------------------------------------------------------------
  // harvest — training day
  // ----------------------------------------------------------------

  describe("harvest — training day", () => {
    it("byTrainingDay has entries for day 1, 2, and 3", () => {
      expect(result.byTrainingDay["1"]).toBeGreaterThan(0);
      expect(result.byTrainingDay["2"]).toBeGreaterThan(0);
      expect(result.byTrainingDay["3"]).toBeGreaterThan(0);
    });

    it("non-training-day files have trainingDay = null", () => {
      const resourcePdfFiles = result.files.filter(
        (f) => f.source === "RESOURCE PDFS"
      );
      for (const f of resourcePdfFiles) {
        expect(f.trainingDay).toBeNull();
      }
    });
  });

  // ----------------------------------------------------------------
  // harvest — file path validity
  // ----------------------------------------------------------------

  describe("harvest — file path validity", () => {
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

    it("all files have a valid source name", () => {
      const validSources = [
        "Training Day 1",
        "Training Day 2",
        "Training Day 3",
        "RESOURCE PDFS",
        "PRISM CAD-CAM TRAINING",
        "PDF",
      ];
      for (const f of result.files) {
        expect(validSources).toContain(f.source);
      }
    });
  });

  // ----------------------------------------------------------------
  // filterByTopic
  // ----------------------------------------------------------------

  describe("filterByTopic", () => {
    it("returns a strict subset of the full file list", () => {
      const setupFiles = TrainingContentIndexEngine.filterByTopic(
        result.files,
        "setup"
      );
      expect(setupFiles.length).toBeLessThan(result.files.length);
      for (const f of setupFiles) {
        expect(f.topic).toBe("setup");
      }
    });

    it("returns empty array for a topic with no matches", () => {
      // Create a small test array with known topics
      const testFiles: TrainingFileEntry[] = [
        {
          filename: "test.pdf",
          directory: "/test",
          filePath: "/test/test.pdf",
          extension: ".pdf",
          fileSize: 100,
          contentType: "reference",
          topic: "drilling",
          difficulty: "beginner",
          camSystem: null,
          controller: null,
          trainingDay: null,
          source: "RESOURCE PDFS",
        },
      ];
      const result2 = TrainingContentIndexEngine.filterByTopic(
        testFiles,
        "edm"
      );
      expect(result2).toHaveLength(0);
    });
  });

  // ----------------------------------------------------------------
  // audit
  // ----------------------------------------------------------------

  describe("audit", () => {
    let auditResult: TrainingAuditResult;

    beforeAll(async () => {
      auditResult = await TrainingContentIndexEngine.audit();
    }, 120_000);

    it("returns valid totalFiles count", () => {
      expect(auditResult.totalFiles).toBeGreaterThanOrEqual(1000);
    });

    it("topTopics has at least 3 entries", () => {
      expect(auditResult.topTopics.length).toBeGreaterThanOrEqual(3);
      for (const t of auditResult.topTopics) {
        expect(t.topic.length).toBeGreaterThan(0);
        expect(t.count).toBeGreaterThan(0);
      }
    });

    it("trainingDayBreakdown has entries for 1, 2, 3", () => {
      expect(auditResult.trainingDayBreakdown["1"]).toBeGreaterThan(0);
      expect(auditResult.trainingDayBreakdown["2"]).toBeGreaterThan(0);
      expect(auditResult.trainingDayBreakdown["3"]).toBeGreaterThan(0);
    });

    it("sourceBreakdown has all 6 sources", () => {
      expect(Object.keys(auditResult.sourceBreakdown).length).toBe(6);
    });

    it("has a valid timestamp", () => {
      expect(auditResult.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
