/**
 * cadArtifactStorage.test.ts — U-CINF07 unit tests
 *
 * Covers:
 *   1. ARTIFACT_KINDS exports all four canonical kinds
 *   2. KIND_FILENAME maps each kind to its on-disk filename
 *   3. batchDir / fileDir / artifactPath compose canonical paths
 *   4. Engine capabilities list write|list|prune
 *   5. validate() returns null for valid op, string otherwise
 *   6. write() persists text (UTF-8) to the canonical path
 *   7. write() persists binary (Uint8Array) with exact byte count
 *   8. listBatch() returns empty manifest for missing batch
 *   9. listBatch() aggregates every written artifact into byFile map
 *  10. pruneRetention() retains N newest batches, removes older ones
 *  11. pruneRetention() is a no-op when root is missing
 *  12. pruneRetention() with maxBatches=0 prunes everything
 *  13. executeImpl routes op=write and op=list correctly
 *  14. executeImpl rejects unknown op
 *  15. write() throws on missing required field
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  CADArtifactStorageEngine,
  cadArtifactStorageEngine,
  ARTIFACT_KINDS,
  DEFAULT_MAX_BATCHES,
  batchDir,
  fileDir,
  artifactPath,
  type ArtifactFS,
} from "../engines/CADArtifactStorageEngine.js";

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "cad-artifact-test-"));
});

afterEach(() => {
  try {
    rmSync(tmpRoot, { recursive: true, force: true });
  } catch {
    /* best-effort */
  }
});

// ── Path helpers ─────────────────────────────────────────────────────────────

describe("ARTIFACT_KINDS", () => {
  it("exports four canonical kinds in stable order", () => {
    expect(ARTIFACT_KINDS).toEqual([
      "expected_step",
      "actual_step",
      "diff_png",
      "error_log",
    ]);
  });
});

describe("DEFAULT_MAX_BATCHES", () => {
  it("is 5 (project retention policy)", () => {
    expect(DEFAULT_MAX_BATCHES).toBe(5);
  });
});

describe("path helpers", () => {
  it("batchDir composes root/batchId", () => {
    expect(batchDir("B1", "/tmp/root")).toBe(join("/tmp/root", "B1"));
  });

  it("fileDir composes root/batchId/fileId", () => {
    expect(fileDir("B1", "F1", "/tmp/root")).toBe(
      join("/tmp/root", "B1", "F1"),
    );
  });

  it("artifactPath maps each kind to its canonical filename", () => {
    expect(artifactPath("B1", "F1", "expected_step", "/tmp/root")).toBe(
      join("/tmp/root", "B1", "F1", "expected.step"),
    );
    expect(artifactPath("B1", "F1", "actual_step", "/tmp/root")).toBe(
      join("/tmp/root", "B1", "F1", "actual.step"),
    );
    expect(artifactPath("B1", "F1", "diff_png", "/tmp/root")).toBe(
      join("/tmp/root", "B1", "F1", "diff.png"),
    );
    expect(artifactPath("B1", "F1", "error_log", "/tmp/root")).toBe(
      join("/tmp/root", "B1", "F1", "error.log"),
    );
  });
});

// ── Engine surface ───────────────────────────────────────────────────────────

describe("CADArtifactStorageEngine capabilities", () => {
  it("lists write|list|prune actions", () => {
    const caps = cadArtifactStorageEngine.getCapabilities();
    const names = caps.map((c) => c.name).sort();
    expect(names).toEqual(["list", "prune", "write"]);
    const actions = caps.flatMap((c) => c.actions);
    expect(actions).toContain("cad_artifact_write");
    expect(actions).toContain("cad_artifact_list");
    expect(actions).toContain("cad_artifact_prune");
  });
});

describe("validate()", () => {
  const e = new CADArtifactStorageEngine();

  it("returns null for a valid op", () => {
    expect(e.validate({ op: "write" })).toBeNull();
    expect(e.validate({ op: "list" })).toBeNull();
    expect(e.validate({ op: "prune" })).toBeNull();
  });

  it("rejects non-object input", () => {
    expect(typeof e.validate(null)).toBe("string");
    expect(typeof e.validate(42)).toBe("string");
    expect(typeof e.validate("str")).toBe("string");
  });

  it("rejects missing op", () => {
    expect(typeof e.validate({})).toBe("string");
  });

  it("rejects unknown op", () => {
    expect(typeof e.validate({ op: "delete" })).toBe("string");
  });
});

// ── write() ──────────────────────────────────────────────────────────────────

describe("write()", () => {
  it("persists UTF-8 text at the canonical path", async () => {
    const e = new CADArtifactStorageEngine();
    const payload = "ISO-10303-21;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n";
    const rec = await e.write("B1", "F1", "expected_step", payload, tmpRoot);
    expect(rec.absolutePath).toBe(
      join(tmpRoot, "B1", "F1", "expected.step"),
    );
    expect(rec.sizeBytes).toBe(Buffer.byteLength(payload, "utf-8"));
    expect(existsSync(rec.absolutePath)).toBe(true);
    expect(readFileSync(rec.absolutePath, "utf-8")).toBe(payload);
  });

  it("persists binary Uint8Array with exact byte count", async () => {
    const e = new CADArtifactStorageEngine();
    const payload = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const rec = await e.write("B1", "F1", "diff_png", payload, tmpRoot);
    expect(rec.sizeBytes).toBe(payload.byteLength);
    const read = readFileSync(rec.absolutePath);
    expect(Uint8Array.from(read)).toEqual(payload);
  });

  it("returns error envelope when required fields missing", async () => {
    const e = new CADArtifactStorageEngine();
    const result = await e.execute({ op: "write", batchId: "B1" } as unknown);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/write requires/);
  });
});

// ── listBatch() ──────────────────────────────────────────────────────────────

describe("listBatch()", () => {
  it("returns an empty manifest for a missing batch", async () => {
    const e = new CADArtifactStorageEngine();
    const manifest = await e.listBatch("does-not-exist", tmpRoot);
    expect(manifest.fileCount).toBe(0);
    expect(manifest.artifactCount).toBe(0);
    expect(manifest.byFile).toEqual({});
  });

  it("aggregates every written artifact into byFile", async () => {
    const e = new CADArtifactStorageEngine();
    await e.write("B2", "F_A", "expected_step", "exp-A", tmpRoot);
    await e.write("B2", "F_A", "actual_step", "act-A", tmpRoot);
    await e.write("B2", "F_B", "error_log", "boom", tmpRoot);
    const manifest = await e.listBatch("B2", tmpRoot);
    expect(manifest.fileCount).toBe(2);
    expect(manifest.artifactCount).toBe(3);
    expect(manifest.byFile["F_A"]?.expected_step?.sizeBytes).toBe(5);
    expect(manifest.byFile["F_A"]?.actual_step?.sizeBytes).toBe(5);
    expect(manifest.byFile["F_B"]?.error_log?.sizeBytes).toBe(4);
    expect(manifest.byFile["F_B"]?.diff_png).toBeUndefined();
  });
});

// ── pruneRetention() ─────────────────────────────────────────────────────────

/**
 * Minimal in-memory FS harness for prune tests — the real engine injects
 * ArtifactFS so tests stay deterministic without touching disk mtimes.
 */
function mockFS(batchMtimes: Record<string, number>): ArtifactFS & {
  removed: string[];
} {
  const removed: string[] = [];
  const batches = Object.keys(batchMtimes);
  return {
    removed,
    existsSync: (p: string) => p === "MOCK_ROOT" || batches.some((b) => p.endsWith(b)),
    mkdirSync: () => undefined,
    readdirSync: ((p: string, opts?: { withFileTypes: true }) => {
      if (p !== "MOCK_ROOT") return [];
      if (opts && opts.withFileTypes) {
        return batches.map((name) => ({
          name,
          isDirectory: () => true,
          isFile: () => false,
        }));
      }
      return batches;
    }) as ArtifactFS["readdirSync"],
    statSync: (p: string) => {
      const hit = batches.find((b) => p.endsWith(b));
      const mtimeMs = hit ? batchMtimes[hit] : 0;
      return { mtimeMs, size: 0, isDirectory: () => true };
    },
    rmSync: (p: string) => {
      removed.push(p);
    },
  };
}

describe("pruneRetention()", () => {
  it("retains the N newest batches by mtime, prunes older", async () => {
    const e = new CADArtifactStorageEngine();
    const fs = mockFS({ old: 100, mid: 200, newer: 300, newest: 400 });
    const report = await e.pruneRetention(2, "MOCK_ROOT", fs);
    expect(report.maxBatches).toBe(2);
    expect(report.retained.sort()).toEqual(["newer", "newest"]);
    expect(report.pruned.sort()).toEqual(["mid", "old"]);
    expect(fs.removed).toHaveLength(2);
  });

  it("is a no-op when root does not exist", async () => {
    const e = new CADArtifactStorageEngine();
    const fs: ArtifactFS = {
      existsSync: () => false,
      mkdirSync: () => undefined,
      readdirSync: (() => []) as ArtifactFS["readdirSync"],
      statSync: () => ({ mtimeMs: 0, size: 0, isDirectory: () => true }),
      rmSync: () => undefined,
    };
    const report = await e.pruneRetention(5, "/nope", fs);
    expect(report.retained).toEqual([]);
    expect(report.pruned).toEqual([]);
  });

  it("prunes everything when maxBatches=0", async () => {
    const e = new CADArtifactStorageEngine();
    const fs = mockFS({ a: 1, b: 2, c: 3 });
    const report = await e.pruneRetention(0, "MOCK_ROOT", fs);
    expect(report.retained).toEqual([]);
    expect(report.pruned.sort()).toEqual(["a", "b", "c"]);
    expect(fs.removed).toHaveLength(3);
  });
});

// ── executeImpl() routing ───────────────────────────────────────────────────

describe("execute() routing", () => {
  it("routes op=write to write()", async () => {
    const e = new CADArtifactStorageEngine();
    const result = await e.execute({
      op: "write",
      batchId: "B3",
      fileId: "F1",
      kind: "error_log",
      data: "fail",
      root: tmpRoot,
    });
    expect(result.success).toBe(true);
    const data = result.data as { fileId: string; sizeBytes: number };
    expect(data.fileId).toBe("F1");
    expect(data.sizeBytes).toBe(4);
  });

  it("routes op=list to listBatch()", async () => {
    const e = new CADArtifactStorageEngine();
    await e.write("B4", "F1", "actual_step", "ok", tmpRoot);
    const result = await e.execute({
      op: "list",
      batchId: "B4",
      root: tmpRoot,
    });
    expect(result.success).toBe(true);
    const manifest = result.data as { fileCount: number };
    expect(manifest.fileCount).toBe(1);
  });

  it("returns error envelope on unknown op", async () => {
    const e = new CADArtifactStorageEngine();
    const result = await e.execute({ op: "delete" } as unknown);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/write\|list\|prune/);
  });
});
