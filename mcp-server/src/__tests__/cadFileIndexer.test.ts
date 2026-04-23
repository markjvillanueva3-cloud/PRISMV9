/**
 * cadFileIndexer.test.ts — U-CINF01 unit tests
 *
 * Covers:
 *   1. Empty directory — index produces totalFiles = 0
 *   2. 10 mixed-format files — all discovered with correct metadata
 *   3. Re-index idempotency — second run unchanged count = total, added/deleted = 0
 *   4. Deleted-file detection — removing a file shows it in diff.deletedIds
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as nodePath from "path";
import * as nodeCrypto from "crypto";
import { CADFileIndexerEngine } from "../engines/CADFileIndexerEngine.js";
import type { IndexerFS } from "../engines/CADFileIndexerEngine.js";
import { MasterIndexSchema, CADFileEntrySchema } from "../schemas/cadFileIndexSchema.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** SHA-256 of normalized path — mirrors engine logic */
function fileId(absPath: string): string {
  const norm = absPath.replace(/\\/g, "/");
  return nodeCrypto.createHash("sha256").update(norm, "utf8").digest("hex");
}

/** Build a minimal injectable FS from a flat file map */
function buildFS(fileMap: Record<string, { size: number; mtime: Date }>, existingIndex?: string): IndexerFS {
  // Build directory tree from file map
  const dirContents: Record<string, Array<{ name: string; _isDir: boolean; _isFile: boolean }>> = {};

  for (const absPath of Object.keys(fileMap)) {
    const parent = nodePath.dirname(absPath);
    if (!dirContents[parent]) dirContents[parent] = [];
    const base = nodePath.basename(absPath);
    if (!dirContents[parent].some((x) => x.name === base)) {
      dirContents[parent].push({ name: base, _isDir: false, _isFile: true });
    }
    // Ensure parent dirs exist as entries in grandparent
    let cur = parent;
    while (cur !== nodePath.dirname(cur)) {
      const gp = nodePath.dirname(cur);
      if (!dirContents[gp]) dirContents[gp] = [];
      const dirName = nodePath.basename(cur);
      if (!dirContents[gp].some((x) => x.name === dirName)) {
        dirContents[gp].push({ name: dirName, _isDir: true, _isFile: false });
      }
      cur = gp;
    }
  }

  const written: Record<string, string> = {};
  if (existingIndex) {
    // pre-load a fake output path
    written[nodePath.resolve("data/state/cad-file-index/master-index.json")] = existingIndex;
  }

  return {
    existsSync(p: string): boolean {
      const resolved = nodePath.resolve(p);
      return resolved in fileMap || resolved in dirContents || resolved in written;
    },
    readdirSync(p: string, _opts: { withFileTypes: true }) {
      const resolved = nodePath.resolve(p);
      const entries = dirContents[resolved] ?? [];
      return entries.map((e) => ({
        name: e.name,
        isDirectory: () => e._isDir,
        isFile: () => e._isFile,
      }));
    },
    statSync(p: string) {
      const resolved = nodePath.resolve(p);
      const f = fileMap[resolved];
      if (!f) throw new Error(`ENOENT: ${p}`);
      return { size: f.size, mtimeMs: f.mtime.getTime(), mtime: f.mtime };
    },
    readFileSync(p: string, _enc: BufferEncoding): string {
      const resolved = nodePath.resolve(p);
      if (resolved in written) return written[resolved];
      throw new Error(`ENOENT: ${p}`);
    },
    mkdirSync(_p: string, _opts?: { recursive?: boolean }): void {
      // no-op in tests
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("CADFileIndexerEngine", () => {
  const outputPath = nodePath.resolve("data/state/cad-file-index/master-index.json");

  it("empty directory — returns totalFiles 0", async () => {
    const engine = new CADFileIndexerEngine();
    const fs = buildFS({});

    const result = await engine.index(
      { rootPaths: ["/empty/dir"], outputPath, batchSize: 500 },
      fs,
    );

    expect(result.totalFiles).toBe(0);
    expect(result.files).toHaveLength(0);
    expect(result.schemaVersion).toBe(1);
    // Must validate against Zod schema
    expect(() => MasterIndexSchema.parse(result)).not.toThrow();
  });

  it("10 mixed-format files — all discovered with correct metadata", async () => {
    const engine = new CADFileIndexerEngine();
    const root = "/H/PRISM/JM DIE/CNC LATHE/ALCOA";
    const mtime = new Date("2025-01-15T10:00:00.000Z");

    const formats = [
      "part.sldprt", "assy.sldasm", "draw.slddrw",
      "part.ipt", "assy.iam", "draw.idw",
      "design.step", "neutral.iges", "export.stl", "program.mcx-8",
    ];
    const fileMap: Record<string, { size: number; mtime: Date }> = {};
    for (const name of formats) {
      fileMap[nodePath.resolve(`${root}/${name}`)] = { size: 120_000, mtime };
    }

    const fs = buildFS(fileMap);
    const result = await engine.index(
      { rootPaths: [root], outputPath, batchSize: 500 },
      fs,
    );

    expect(result.totalFiles).toBe(10);
    expect(result.files).toHaveLength(10);

    // Every entry should pass the Zod schema
    for (const entry of result.files) {
      expect(() => CADFileEntrySchema.parse(entry)).not.toThrow();
      // SHA-256 length = 64 hex chars
      expect(entry.fileId).toHaveLength(64);
      // Correct format detected
      expect(entry.format).toBeTruthy();
      // Customer detected from path
      expect(entry.customer).toBe("ALCOA");
      // Machine category from path
      expect(entry.machineCategory).toBe("lathe");
      // Complexity hint for 120 KB
      expect(entry.complexityHint).toBe("moderate");
      // lastModified is an ISO string
      expect(entry.lastModified).toContain("2025-01-15");
    }

    // Aggregates populated
    expect(Object.keys(result.byFormat).length).toBeGreaterThan(0);
    expect(result.byCustomer["ALCOA"]).toBe(10);
    expect(result.byMachineCategory["lathe"]).toBe(10);
  });

  it("re-index idempotency — second run diff shows 0 added, 0 deleted", async () => {
    const engine = new CADFileIndexerEngine();
    const root = "/H/PRISM/JM DIE/CNC LATHE/ITW";
    const mtime = new Date("2025-03-01T08:00:00.000Z");

    const names = ["a.sldprt", "b.ipt", "c.step"];
    const fileMap: Record<string, { size: number; mtime: Date }> = {};
    for (const n of names) {
      fileMap[nodePath.resolve(`${root}/${n}`)] = { size: 50_000, mtime };
    }

    // First run
    let written = "";
    const fs1: IndexerFS = {
      ...buildFS(fileMap),
      readFileSync: (_p, _e) => { throw new Error("ENOENT"); },
      mkdirSync: () => undefined,
    };
    // Capture what gets written by wrapping atomicWrite indirectly
    // We just run twice against a "memory FS" that stores the written index
    const result1 = await engine.index({ rootPaths: [root], outputPath, batchSize: 500 }, fs1);
    written = JSON.stringify(result1, null, 2);

    // Second run with existing index pre-loaded
    const fs2 = buildFS(fileMap, written);
    const result2 = await engine.index({ rootPaths: [root], outputPath, batchSize: 500 }, fs2);

    expect(result2.totalFiles).toBe(3);
    expect(result2.lastDiff).toBeDefined();
    expect(result2.lastDiff!.added).toBe(0);
    expect(result2.lastDiff!.deleted).toBe(0);
    expect(result2.lastDiff!.unchanged).toBe(3);
    expect(result2.lastDiff!.addedIds).toHaveLength(0);
    expect(result2.lastDiff!.deletedIds).toHaveLength(0);
  });

  it("deleted-file detection — removed file appears in diff.deletedIds", async () => {
    const engine = new CADFileIndexerEngine();
    const root = "/H/PRISM/JM DIE/WIRE EDM/SFS";
    const mtime = new Date("2025-06-10T12:00:00.000Z");

    // First index has 3 files
    const firstMap: Record<string, { size: number; mtime: Date }> = {
      [nodePath.resolve(`${root}/x.step`)]: { size: 200_000, mtime },
      [nodePath.resolve(`${root}/y.iges`)]: { size: 80_000, mtime },
      [nodePath.resolve(`${root}/z.sldprt`)]: { size: 30_000, mtime },
    };

    const firstResult = await engine.index(
      { rootPaths: [root], outputPath, batchSize: 500 },
      buildFS(firstMap),
    );
    const firstJson = JSON.stringify(firstResult, null, 2);

    // Second index: z.sldprt removed
    const secondMap: Record<string, { size: number; mtime: Date }> = {
      [nodePath.resolve(`${root}/x.step`)]: { size: 200_000, mtime },
      [nodePath.resolve(`${root}/y.iges`)]: { size: 80_000, mtime },
    };
    const result2 = await engine.index(
      { rootPaths: [root], outputPath, batchSize: 500 },
      buildFS(secondMap, firstJson),
    );

    expect(result2.totalFiles).toBe(2);
    expect(result2.lastDiff!.deleted).toBe(1);
    expect(result2.lastDiff!.added).toBe(0);
    expect(result2.lastDiff!.unchanged).toBe(2);

    // The deleted fileId should match the hash of z.sldprt's path
    const deletedId = fileId(normPath(nodePath.resolve(`${root}/z.sldprt`)));
    expect(result2.lastDiff!.deletedIds).toContain(deletedId);
  });
});

// ── Utility ──────────────────────────────────────────────────────────────────

function normPath(p: string): string {
  return p.replace(/\\/g, "/");
}
