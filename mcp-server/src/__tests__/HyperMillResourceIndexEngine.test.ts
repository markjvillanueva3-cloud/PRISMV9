/**
 * HyperMillResourceIndexEngine — Tests
 * RES-MS7 U-HM01: Validates hyperMILL + OPEN MIND resource tree indexing
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  HyperMillResourceIndexEngine,
  type HyperMillResourceIndexResult,
} from "../engines/HyperMillResourceIndexEngine.js";

let result: HyperMillResourceIndexResult;

beforeAll(async () => {
  result = await HyperMillResourceIndexEngine.harvest();
}, 300_000); // 5 min — scanning 73K files

describe("HyperMillResourceIndexEngine", () => {
  // ==========================================================================
  // SOURCE INFO
  // ==========================================================================
  describe("getSources()", () => {
    it("returns correct HYPERMILL root path", () => {
      expect(HyperMillResourceIndexEngine.getSources().hyperMillRoot).toContain("HYPERMILL");
    });

    it("returns correct OPEN MIND root path", () => {
      expect(HyperMillResourceIndexEngine.getSources().openMindRoot).toContain("OPEN MIND");
    });

    it("expects ~18,868 HYPERMILL files", () => {
      expect(HyperMillResourceIndexEngine.getSources().expectedHyperMillFiles).toBe(18868);
    });
  });

  // ==========================================================================
  // HARVEST — TOTAL COUNTS
  // ==========================================================================
  describe("harvest() — total counts", () => {
    it("finds at least 10,000 files total", () => {
      expect(result.totalFiles).toBeGreaterThanOrEqual(10000);
    });

    it("finds approximately 60,000-80,000 files", () => {
      expect(result.totalFiles).toBeGreaterThanOrEqual(50000);
      expect(result.totalFiles).toBeLessThanOrEqual(100000);
    });

    it("has non-zero total size", () => {
      expect(result.totalSizeBytes).toBeGreaterThan(0);
    });

    it("has valid ISO timestamp", () => {
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // ==========================================================================
  // EXTENSION BREAKDOWN
  // ==========================================================================
  describe("harvest() — extensions", () => {
    it("finds GIF files (most common)", () => {
      const gifCount = (result.byExtension[".gif"] ?? 0);
      expect(gifCount).toBeGreaterThan(1000);
    });

    it("finds PNG files", () => {
      expect(result.byExtension[".png"]).toBeGreaterThan(500);
    });

    it("finds DLL files", () => {
      expect(result.byExtension[".dll"]).toBeGreaterThan(500);
    });

    it("finds Python scripts (.py)", () => {
      expect(result.pythonScriptCount).toBeGreaterThan(100);
    });

    it("finds strategy macros (.hms)", () => {
      expect(result.strategyMacroCount).toBeGreaterThan(100);
    });

    it("finds cycle configs (.hmc)", () => {
      expect(result.cycleConfigCount).toBeGreaterThan(100);
    });

    it("finds localization files (.loc)", () => {
      expect(result.localizationCount).toBeGreaterThan(500);
    });

    it("finds configuration files (.cfg)", () => {
      expect(result.configCount).toBeGreaterThan(200);
    });

    it("finds XML files", () => {
      expect(result.xmlCount).toBeGreaterThan(100);
    });

    it("has at least 15 distinct extensions", () => {
      expect(Object.keys(result.byExtension).length).toBeGreaterThanOrEqual(15);
    });
  });

  // ==========================================================================
  // VERSION DETECTION
  // ==========================================================================
  describe("harvest() — versions", () => {
    it("detects hyperMILL 31.0", () => {
      expect(result.versions).toContain("31.0");
    });

    it("detects hyperMILL 33.0", () => {
      expect(result.versions).toContain("33.0");
    });

    it("has at least 2 versions", () => {
      expect(result.versions.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ==========================================================================
  // CATEGORY BREAKDOWN
  // ==========================================================================
  describe("harvest() — categories", () => {
    it("has HYPERMILL category", () => {
      expect(result.byCategory["HYPERMILL"]).toBeGreaterThan(5000);
    });

    it("has OPEN MIND category", () => {
      expect(result.byCategory["OPEN MIND"]).toBeGreaterThan(10000);
    });

    it("OPEN MIND has more files than HYPERMILL", () => {
      expect(result.byCategory["OPEN MIND"]).toBeGreaterThan(
        result.byCategory["HYPERMILL"]
      );
    });
  });

  // ==========================================================================
  // DIRECTORY STRUCTURE
  // ==========================================================================
  describe("harvest() — directories", () => {
    it("finds at least 100 directories with files", () => {
      expect(result.directories.length).toBeGreaterThanOrEqual(100);
    });

    it("all directories have positive file counts", () => {
      for (const dir of result.directories) {
        expect(dir.fileCount).toBeGreaterThan(0);
      }
    });

    it("all directories have non-negative sizes", () => {
      for (const dir of result.directories) {
        expect(dir.totalSize).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ==========================================================================
  // FILTER METHODS
  // ==========================================================================
  describe("getPythonDirs()", () => {
    it("finds directories with Python scripts", () => {
      const pyDirs = HyperMillResourceIndexEngine.getPythonDirs(result);
      expect(pyDirs.length).toBeGreaterThan(0);
    });
  });

  describe("getStrategyDirs()", () => {
    it("finds directories with strategy macros", () => {
      const hmsDirs = HyperMillResourceIndexEngine.getStrategyDirs(result);
      expect(hmsDirs.length).toBeGreaterThan(0);
    });
  });

  describe("getCycleDirs()", () => {
    it("finds directories with cycle configs", () => {
      const hmcDirs = HyperMillResourceIndexEngine.getCycleDirs(result);
      expect(hmcDirs.length).toBeGreaterThan(0);
    });
  });

  describe("getTopDirectories()", () => {
    it("returns sorted by file count descending", () => {
      const top = HyperMillResourceIndexEngine.getTopDirectories(result, 10);
      expect(top.length).toBe(10);
      for (let i = 1; i < top.length; i++) {
        expect(top[i - 1].fileCount).toBeGreaterThanOrEqual(top[i].fileCount);
      }
    });
  });

  // ==========================================================================
  // AUDIT
  // ==========================================================================
  describe("audit()", () => {
    it("returns valid summary", async () => {
      const audit = await HyperMillResourceIndexEngine.audit();
      expect(audit.totalFiles).toBeGreaterThan(10000);
      expect(audit.totalSizeMb).toBeGreaterThan(100);
      expect(audit.versions.length).toBeGreaterThanOrEqual(2);
      expect(audit.topExtensions.length).toBeGreaterThan(0);
      expect(audit.pythonScripts).toBeGreaterThan(100);
      expect(audit.directoryCount).toBeGreaterThan(100);
    }, 300_000);
  });
});
