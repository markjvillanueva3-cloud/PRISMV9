/**
 * CADArtifactStorageEngine Tests
 * ===============================
 * Tests for CAD regression artifact storage with retention policy.
 *
 * @milestone CAD-UNIVERSAL-CONTROL-MS0 U-CUC61
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  cadArtifactStorageEngine,
  CADArtifactStorageEngine,
  ARTIFACT_KINDS,
  DEFAULT_MAX_BATCHES,
  batchDir,
  fileDir,
  artifactPath,
  type ArtifactFS,
  type ArtifactKind,
} from "../engines/CADArtifactStorageEngine.js";

describe("CADArtifactStorageEngine", () => {
  describe("getCapabilities", () => {
    it("returns write, list, and prune capabilities", () => {
      const caps = cadArtifactStorageEngine.getCapabilities();
      expect(caps.length).toBe(3);
      expect(caps.map(c => c.name)).toContain("write");
      expect(caps.map(c => c.name)).toContain("list");
      expect(caps.map(c => c.name)).toContain("prune");
    });
  });

  describe("validate", () => {
    it("returns null for valid write op", () => {
      const result = cadArtifactStorageEngine.validate({ op: "write" });
      expect(result).toBeNull();
    });

    it("returns null for valid list op", () => {
      const result = cadArtifactStorageEngine.validate({ op: "list" });
      expect(result).toBeNull();
    });

    it("returns null for valid prune op", () => {
      const result = cadArtifactStorageEngine.validate({ op: "prune" });
      expect(result).toBeNull();
    });

    it("returns error for null input", () => {
      const result = cadArtifactStorageEngine.validate(null);
      expect(result).toBe("input must be an object");
    });

    it("returns error for missing op", () => {
      const result = cadArtifactStorageEngine.validate({});
      expect(result).toBe("input.op must be a string");
    });

    it("returns error for invalid op", () => {
      const result = cadArtifactStorageEngine.validate({ op: "delete" });
      expect(result).toContain("must be write|list|prune");
    });
  });

  describe("ARTIFACT_KINDS constant", () => {
    it("contains all 4 artifact kinds", () => {
      expect(ARTIFACT_KINDS).toContain("expected_step");
      expect(ARTIFACT_KINDS).toContain("actual_step");
      expect(ARTIFACT_KINDS).toContain("diff_png");
      expect(ARTIFACT_KINDS).toContain("error_log");
      expect(ARTIFACT_KINDS.length).toBe(4);
    });
  });

  describe("DEFAULT_MAX_BATCHES", () => {
    it("is 5 by default", () => {
      expect(DEFAULT_MAX_BATCHES).toBe(5);
    });
  });

  describe("path helpers", () => {
    const root = "/test/artifacts";

    it("batchDir returns correct path", () => {
      const result = batchDir("batch-123", root);
      expect(result).toContain("batch-123");
      expect(result).toContain("test");
    });

    it("fileDir includes both batch and file", () => {
      const result = fileDir("batch-123", "file-abc", root);
      expect(result).toContain("batch-123");
      expect(result).toContain("file-abc");
    });

    it("artifactPath includes kind filename", () => {
      const result = artifactPath("batch-123", "file-abc", "expected_step", root);
      expect(result).toContain("expected.step");
    });

    it("artifactPath maps all kinds correctly", () => {
      const kinds: ArtifactKind[] = ["expected_step", "actual_step", "diff_png", "error_log"];
      const files = ["expected.step", "actual.step", "diff.png", "error.log"];

      kinds.forEach((kind, i) => {
        const result = artifactPath("b", "f", kind, root);
        expect(result).toContain(files[i]);
      });
    });
  });

  describe("listBatch with mock FS", () => {
    it("returns empty manifest for non-existent batch", async () => {
      const mockFS: ArtifactFS = {
        existsSync: () => false,
        mkdirSync: vi.fn(),
        readdirSync: vi.fn() as any,
        statSync: vi.fn() as any,
      };

      const engine = new CADArtifactStorageEngine();
      const manifest = await engine.listBatch("missing-batch", "/root", mockFS);

      expect(manifest.batchId).toBe("missing-batch");
      expect(manifest.fileCount).toBe(0);
      expect(manifest.artifactCount).toBe(0);
      expect(Object.keys(manifest.byFile)).toHaveLength(0);
    });

    it("returns populated manifest for existing batch", async () => {
      const mockFS: ArtifactFS = {
        existsSync: (p: string) => {
          if (p.includes("expected.step")) return true;
          if (p.includes("file-1")) return true;
          if (p.includes("batch-1")) return true;
          return false;
        },
        mkdirSync: vi.fn(),
        readdirSync: ((p: string, opts?: any) => {
          if (opts?.withFileTypes) {
            return [{ name: "file-1", isDirectory: () => true, isFile: () => false }];
          }
          return ["file-1"];
        }) as any,
        statSync: () => ({ mtimeMs: Date.now(), size: 1024, isDirectory: () => true }),
      };

      const engine = new CADArtifactStorageEngine();
      const manifest = await engine.listBatch("batch-1", "/root", mockFS);

      expect(manifest.batchId).toBe("batch-1");
      expect(manifest.fileCount).toBe(1);
      expect(manifest.artifactCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("pruneRetention with mock FS", () => {
    it("returns empty report for non-existent root", async () => {
      const mockFS: ArtifactFS = {
        existsSync: () => false,
        mkdirSync: vi.fn(),
        readdirSync: vi.fn() as any,
        statSync: vi.fn() as any,
      };

      const engine = new CADArtifactStorageEngine();
      const report = await engine.pruneRetention(5, "/missing", mockFS);

      expect(report.retained).toHaveLength(0);
      expect(report.pruned).toHaveLength(0);
      expect(report.maxBatches).toBe(5);
    });

    it("retains newest batches and prunes older ones", async () => {
      const batches = [
        { name: "batch-old", mtime: 1000 },
        { name: "batch-mid", mtime: 2000 },
        { name: "batch-new", mtime: 3000 },
      ];

      const mockFS: ArtifactFS = {
        existsSync: () => true,
        mkdirSync: vi.fn(),
        readdirSync: ((p: string, opts?: any) => {
          if (opts?.withFileTypes) {
            return batches.map(b => ({
              name: b.name,
              isDirectory: () => true,
              isFile: () => false,
            }));
          }
          return batches.map(b => b.name);
        }) as any,
        statSync: (p: string) => {
          const batch = batches.find(b => p.includes(b.name));
          return {
            mtimeMs: batch?.mtime ?? 0,
            size: 0,
            isDirectory: () => true,
          };
        },
        rmSync: vi.fn(),
      };

      const engine = new CADArtifactStorageEngine();
      const report = await engine.pruneRetention(2, "/root", mockFS);

      expect(report.retained).toContain("batch-new");
      expect(report.retained).toContain("batch-mid");
      expect(report.pruned).toContain("batch-old");
      expect(report.retained).toHaveLength(2);
      expect(report.pruned).toHaveLength(1);
    });

    it("respects maxBatches=0 (prune all)", async () => {
      const mockFS: ArtifactFS = {
        existsSync: () => true,
        mkdirSync: vi.fn(),
        readdirSync: ((p: string, opts?: any) => {
          if (opts?.withFileTypes) {
            return [{ name: "batch-1", isDirectory: () => true }];
          }
          return ["batch-1"];
        }) as any,
        statSync: () => ({ mtimeMs: 1000, size: 0, isDirectory: () => true }),
        rmSync: vi.fn(),
      };

      const engine = new CADArtifactStorageEngine();
      const report = await engine.pruneRetention(0, "/root", mockFS);

      expect(report.retained).toHaveLength(0);
      expect(report.pruned).toHaveLength(1);
    });
  });

  describe("engine info", () => {
    it("has correct name and domain", () => {
      const info = cadArtifactStorageEngine.getInfo();
      expect(info.name).toBe("CADArtifactStorageEngine");
      expect(info.domain).toBe("cad_infrastructure");
    });

    it("has version string", () => {
      const info = cadArtifactStorageEngine.getInfo();
      expect(info.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });
});
