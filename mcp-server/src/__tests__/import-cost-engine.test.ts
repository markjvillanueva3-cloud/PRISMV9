import { describe, it, expect } from "vitest";
import { ImportCostEngine } from "../engines/ImportCostEngine.js";
import { join } from "path";

describe("ImportCostEngine", () => {
  const engine = new ImportCostEngine();
  const enginesDir = join(__dirname, "../engines");

  describe("analyzeDirectory", () => {
    it("analyzes the engines directory", () => {
      const report = engine.analyzeDirectory(enginesDir);
      expect(report.totalFiles).toBeGreaterThan(100);
      expect(report.totalImports).toBeGreaterThan(100);
      expect(report.avgImportsPerFile).toBeGreaterThan(0);
    });

    it("identifies heaviest files", () => {
      const report = engine.analyzeDirectory(enginesDir);
      expect(report.heaviestFiles.length).toBeGreaterThan(0);
      expect(report.heaviestFiles[0].imports).toBeGreaterThanOrEqual(
        report.heaviestFiles[report.heaviestFiles.length - 1].imports
      );
    });

    it("identifies external dependencies", () => {
      const report = engine.analyzeDirectory(enginesDir);
      expect(report.externalDeps.length).toBeGreaterThan(0);
    });

    it("identifies most imported modules", () => {
      const report = engine.analyzeDirectory(enginesDir);
      expect(report.mostImportedModules.length).toBeGreaterThan(0);
    });
  });

  describe("analyzeFile", () => {
    it("analyzes a single file", () => {
      const info = engine.analyzeFile(join(enginesDir, "QuickCalcEngine.ts"));
      expect(info).not.toBeNull();
      expect(info!.importCount).toBeGreaterThanOrEqual(0);
      expect(info!.fileSize).toBeGreaterThan(0);
    });

    it("returns null for missing file", () => {
      expect(engine.analyzeFile("/nonexistent.ts")).toBeNull();
    });
  });

  describe("findHeavyImporters", () => {
    it("finds files with many imports", () => {
      const heavy = engine.findHeavyImporters(enginesDir, 5);
      expect(heavy.length).toBeGreaterThan(0);
      heavy.forEach(f => expect(f.importCount).toBeGreaterThanOrEqual(5));
    });
  });

  describe("getCompactReport", () => {
    it("returns compact string report", () => {
      const report = engine.getCompactReport(enginesDir);
      expect(typeof report).toBe("string");
      expect(report).toContain("files");
      expect(report).toContain("imports");
    });
  });
});
