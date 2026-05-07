/**
 * UniversalCADIndexEngine.test.ts — U-CADC01 (CAD-COMPLETE-MS0)
 *
 * Verifies the universal CAD indexer facade over CADFileIndexerEngine:
 *   - Delegates scanning to the underlying engine (no duplicate logic)
 *   - Indexes all 15 target CAD formats via injectable FS stub
 *   - Produces accurate per-format coverage report
 *   - Flags missing formats when corpus incomplete
 *   - Round 13 R13-TE-02: per-extension pass gate enforcement
 */

import { describe, it, expect } from "vitest";
import * as path from "path";
import {
  UniversalCADIndexEngine,
  TARGET_CAD_FORMATS,
  UNIVERSAL_ROOT_PATHS,
  universalCADIndexEngine,
} from "../engines/UniversalCADIndexEngine.js";
import type { IndexerFS } from "../engines/CADFileIndexerEngine.js";
import { CAD_FORMATS } from "../schemas/cadFileIndexSchema.js";

// ── Stub FS ───────────────────────────────────────────────────────────────────

interface StubFile {
  name: string;
  isDir: boolean;
  size: number;
  mtime: Date;
}

function makeStubFS(tree: Record<string, StubFile[]>): IndexerFS {
  const writes: Record<string, string> = {};
  return {
    existsSync: (p: string) => p in tree || p in writes,
    readdirSync: (p: string, _opts) => {
      const items = tree[p] ?? [];
      return items.map((f) => ({
        name: f.name,
        isDirectory: () => f.isDir,
        isFile: () => !f.isDir,
      }));
    },
    statSync: (p: string) => {
      for (const [dir, files] of Object.entries(tree)) {
        for (const f of files) {
          if (path.join(dir, f.name) === p) {
            return { size: f.size, mtimeMs: f.mtime.getTime(), mtime: f.mtime };
          }
        }
      }
      throw new Error(`not found: ${p}`);
    },
    readFileSync: (p: string) => writes[p] ?? "",
    mkdirSync: () => {},
  };
}

function oneFilePerFormat(rootDir: string): Record<string, StubFile[]> {
  const now = new Date("2025-06-15T12:00:00Z");
  const files: StubFile[] = TARGET_CAD_FORMATS.map((ext, i) => ({
    name: `part${i}${ext}`,
    isDir: false,
    size: 1024 * (i + 1),
    mtime: now,
  }));
  return { [rootDir]: files };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("UniversalCADIndexEngine", () => {
  describe("configuration", () => {
    it("exposes all 15 target CAD formats", () => {
      expect(TARGET_CAD_FORMATS.length).toBe(15);
    });

    it("target formats are all present in the underlying schema", () => {
      for (const fmt of TARGET_CAD_FORMATS) {
        expect(CAD_FORMATS).toContain(fmt);
      }
    });

    it("declares at least 7 universal root paths", () => {
      expect(UNIVERSAL_ROOT_PATHS.length).toBeGreaterThanOrEqual(7);
    });

    it("singleton is constructed", () => {
      expect(universalCADIndexEngine).toBeInstanceOf(UniversalCADIndexEngine);
    });
  });

  describe("index() — full coverage scenario", () => {
    it("indexes one file per target format", async () => {
      const engine = new UniversalCADIndexEngine();
      const rootDir = "H:\\stub\\corpus";
      const fsStub = makeStubFS(oneFilePerFormat(rootDir));

      const result = await engine.index({ rootPaths: [rootDir] }, fsStub);

      expect(result.source).toBe("UniversalCADIndexEngine");
      expect(result.index.totalFiles).toBe(TARGET_CAD_FORMATS.length);
    });

    it("coverage report shows 100% when every target format present", async () => {
      const engine = new UniversalCADIndexEngine();
      const rootDir = "H:\\stub\\corpus";
      const fsStub = makeStubFS(oneFilePerFormat(rootDir));

      const result = await engine.index({ rootPaths: [rootDir] }, fsStub);

      expect(result.coverage.coveragePct).toBeCloseTo(1.0, 5);
      expect(result.coverage.missingFormats.length).toBe(0);
      expect(result.coverage.coveredFormats.length).toBe(TARGET_CAD_FORMATS.length);
    });

    it("per-format counts reflect actual file counts", async () => {
      const engine = new UniversalCADIndexEngine();
      const rootDir = "H:\\stub\\corpus";
      const fsStub = makeStubFS(oneFilePerFormat(rootDir));

      const result = await engine.index({ rootPaths: [rootDir] }, fsStub);

      for (const fmt of TARGET_CAD_FORMATS) {
        expect(result.coverage.formatCounts[fmt]).toBe(1);
      }
    });
  });

  describe("index() — partial coverage scenario", () => {
    it("flags missing formats in coverage report", async () => {
      const engine = new UniversalCADIndexEngine();
      const rootDir = "H:\\stub\\partial";
      const now = new Date("2025-07-01T00:00:00Z");
      const fsStub = makeStubFS({
        [rootDir]: [
          { name: "a.step", isDir: false, size: 2048, mtime: now },
          { name: "b.ipt", isDir: false, size: 4096, mtime: now },
        ],
      });

      const result = await engine.index({ rootPaths: [rootDir] }, fsStub);

      expect(result.index.totalFiles).toBe(2);
      expect(result.coverage.coveredFormats.sort()).toEqual([".ipt", ".step"]);
      expect(result.coverage.missingFormats.length).toBe(TARGET_CAD_FORMATS.length - 2);
      expect(result.coverage.coveragePct).toBeCloseTo(2 / TARGET_CAD_FORMATS.length, 5);
    });

    it("coveragePct is 0 when index is empty", async () => {
      const engine = new UniversalCADIndexEngine();
      const rootDir = "H:\\stub\\empty";
      const fsStub = makeStubFS({ [rootDir]: [] });

      const result = await engine.index({ rootPaths: [rootDir] }, fsStub);

      expect(result.index.totalFiles).toBe(0);
      expect(result.coverage.coveragePct).toBeCloseTo(0, 5);
      expect(result.coverage.missingFormats.length).toBe(TARGET_CAD_FORMATS.length);
    });
  });

  describe("hasUniversalCoverage() gate", () => {
    it("returns true when coverage is 100% and threshold is 1.0", async () => {
      const engine = new UniversalCADIndexEngine();
      const rootDir = "H:\\stub\\full";
      const fsStub = makeStubFS(oneFilePerFormat(rootDir));
      const result = await engine.index({ rootPaths: [rootDir] }, fsStub);

      expect(engine.hasUniversalCoverage(result.index, 1.0)).toBe(true);
    });

    it("returns false when coverage is partial and threshold is 1.0", async () => {
      const engine = new UniversalCADIndexEngine();
      const rootDir = "H:\\stub\\partial";
      const now = new Date("2025-07-01T00:00:00Z");
      const fsStub = makeStubFS({
        [rootDir]: [{ name: "only.step", isDir: false, size: 1024, mtime: now }],
      });
      const result = await engine.index({ rootPaths: [rootDir] }, fsStub);

      expect(engine.hasUniversalCoverage(result.index, 1.0)).toBe(false);
    });

    it("returns true when coverage meets a lower threshold", async () => {
      const engine = new UniversalCADIndexEngine();
      const rootDir = "H:\\stub\\partial";
      const now = new Date("2025-07-01T00:00:00Z");
      // 5 formats -> ~33% coverage
      const fsStub = makeStubFS({
        [rootDir]: [
          { name: "a.ipt", isDir: false, size: 1024, mtime: now },
          { name: "b.step", isDir: false, size: 1024, mtime: now },
          { name: "c.stl", isDir: false, size: 1024, mtime: now },
          { name: "d.dwg", isDir: false, size: 1024, mtime: now },
          { name: "e.f3d", isDir: false, size: 1024, mtime: now },
        ],
      });
      const result = await engine.index({ rootPaths: [rootDir] }, fsStub);

      expect(engine.hasUniversalCoverage(result.index, 0.3)).toBe(true);
      expect(engine.hasUniversalCoverage(result.index, 0.5)).toBe(false);
    });
  });

  describe("composition over duplication", () => {
    it("uses the injected indexer instance (no parallel scanning)", async () => {
      // Pass a fresh indexer; verify the facade uses IT, not a private one.
      const { CADFileIndexerEngine } = await import("../engines/CADFileIndexerEngine.js");
      const customIndexer = new CADFileIndexerEngine();
      const engine = new UniversalCADIndexEngine(customIndexer);

      expect(engine.events).toBe(customIndexer.events);
    });
  });

  describe("edge cases", () => {
    it("handles directories that fail to read (no throw)", async () => {
      const engine = new UniversalCADIndexEngine();
      const brokenFS: IndexerFS = {
        existsSync: () => true,
        readdirSync: () => {
          throw new Error("simulated read failure");
        },
        statSync: () => {
          throw new Error("never reached");
        },
        readFileSync: () => "",
        mkdirSync: () => {},
      };

      const result = await engine.index({ rootPaths: ["H:\\stub\\broken"] }, brokenFS);

      expect(result.index.totalFiles).toBe(0);
      expect(result.coverage.coveragePct).toBeCloseTo(0, 5);
    });

    it("ignores files with unsupported extensions", async () => {
      const engine = new UniversalCADIndexEngine();
      const rootDir = "H:\\stub\\mixed";
      const now = new Date();
      const fsStub = makeStubFS({
        [rootDir]: [
          { name: "a.txt", isDir: false, size: 100, mtime: now },
          { name: "b.pdf", isDir: false, size: 200, mtime: now },
          { name: "c.step", isDir: false, size: 300, mtime: now },
        ],
      });

      const result = await engine.index({ rootPaths: [rootDir] }, fsStub);

      expect(result.index.totalFiles).toBe(1);
      expect(result.coverage.formatCounts[".step"]).toBe(1);
    });
  });
});
