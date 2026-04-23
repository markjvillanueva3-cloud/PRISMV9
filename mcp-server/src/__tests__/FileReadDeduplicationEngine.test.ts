/**
 * FileReadDeduplicationEngine tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { FileReadDeduplicationEngine } from "../engines/FileReadDeduplicationEngine.js";
import { existsSync, rmSync } from "node:fs";

describe("FileReadDeduplicationEngine", () => {
  let engine: FileReadDeduplicationEngine;
  const stateDir = "H:/prism/state/file-read-dedup";

  process.env.CLAUDE_SESSION_ID = "test-file-read-dedup";

  beforeEach(() => {
    const stateFile = `${stateDir}/dedup-test-file-read-dedup.json`;
    if (existsSync(stateFile)) {
      rmSync(stateFile);
    }
    engine = new FileReadDeduplicationEngine();
  });

  describe("recordRead", () => {
    it("records first read with no redundancy flag", () => {
      const { record, redundant } = engine.recordRead("/a.ts", "hello world", { mtimeMs: 1000 });
      expect(record.id).toMatch(/^rd_/);
      expect(record.path).toBe("/a.ts");
      expect(record.tokenCost).toBeGreaterThan(0);
      expect(redundant).toBeNull();
    });

    it("flags exact duplicate read of same file", () => {
      engine.recordRead("/a.ts", "hello world", { mtimeMs: 1000 });
      const { redundant } = engine.recordRead("/a.ts", "hello world", { mtimeMs: 1000 });
      expect(redundant).not.toBeNull();
      expect(redundant!.reason).toBe("exact_duplicate");
      expect(redundant!.estimatedTokenWaste).toBeGreaterThan(0);
    });

    it("does NOT flag if file modified between reads", () => {
      engine.recordRead("/a.ts", "hello", { mtimeMs: 1000 });
      const { redundant } = engine.recordRead("/a.ts", "hello modified", { mtimeMs: 2000 });
      expect(redundant).toBeNull();
    });

    it("flags full-then-partial as wasteful (full already in context)", () => {
      engine.recordRead("/a.ts", "x".repeat(1000), { mtimeMs: 1000 });
      const { redundant } = engine.recordRead("/a.ts", "x".repeat(100), {
        mtimeMs: 1000,
        offset: 0,
        limit: 100,
      });
      expect(redundant).not.toBeNull();
      expect(redundant!.reason).toBe("full_then_partial");
    });

    it("flags overlapping range as redundant", () => {
      engine.recordRead("/a.ts", "x".repeat(500), { mtimeMs: 1000, offset: 0, limit: 500 });
      const { redundant } = engine.recordRead("/a.ts", "x".repeat(100), {
        mtimeMs: 1000,
        offset: 100,
        limit: 100,
      });
      expect(redundant).not.toBeNull();
      expect(redundant!.reason).toBe("overlapping_range");
    });

    it("does NOT flag non-overlapping ranges", () => {
      engine.recordRead("/a.ts", "x".repeat(100), { mtimeMs: 1000, offset: 0, limit: 100 });
      const { redundant } = engine.recordRead("/a.ts", "y".repeat(100), {
        mtimeMs: 1000,
        offset: 200,
        limit: 100,
      });
      expect(redundant).toBeNull();
    });

    it("does NOT flag reads of different files", () => {
      engine.recordRead("/a.ts", "hello", { mtimeMs: 1000 });
      const { redundant } = engine.recordRead("/b.ts", "hello", { mtimeMs: 1000 });
      expect(redundant).toBeNull();
    });
  });

  describe("shouldSkip", () => {
    it("returns skip=false for never-read file", () => {
      const result = engine.shouldSkip("/never.ts");
      expect(result.skip).toBe(false);
      expect(result.reason).toBe("no_prior_read");
    });

    it("returns skip=true for already-read file with same range", () => {
      engine.recordRead("/a.ts", "hello", { mtimeMs: 1000 });
      const result = engine.shouldSkip("/a.ts", { currentMtimeMs: 1000 });
      expect(result.skip).toBe(true);
      expect(result.priorReadId).not.toBeNull();
    });

    it("returns skip=false if file was modified", () => {
      engine.recordRead("/a.ts", "hello", { mtimeMs: 1000 });
      const result = engine.shouldSkip("/a.ts", { currentMtimeMs: 2000 });
      expect(result.skip).toBe(false);
      expect(result.reason).toBe("file_modified");
    });

    it("returns skip=true when proposed range is contained in prior full read", () => {
      engine.recordRead("/a.ts", "x".repeat(1000), { mtimeMs: 1000 });
      const result = engine.shouldSkip("/a.ts", {
        currentMtimeMs: 1000,
        offset: 100,
        limit: 50,
      });
      expect(result.skip).toBe(true);
    });

    it("returns skip=false when proposed range exceeds prior partial read", () => {
      engine.recordRead("/a.ts", "x".repeat(50), { mtimeMs: 1000, offset: 0, limit: 50 });
      const result = engine.shouldSkip("/a.ts", {
        currentMtimeMs: 1000,
        offset: 0,
        limit: 200,
      });
      expect(result.skip).toBe(false);
    });
  });

  describe("report", () => {
    it("returns zero stats for fresh engine", () => {
      const r = engine.report();
      expect(r.totalReads).toBe(0);
      expect(r.uniqueFilesRead).toBe(0);
      expect(r.redundancyRate).toBe(0);
    });

    it("computes redundancy rate", () => {
      engine.recordRead("/a.ts", "hello", { mtimeMs: 1000 });
      engine.recordRead("/a.ts", "hello", { mtimeMs: 1000 }); // redundant
      engine.recordRead("/b.ts", "world", { mtimeMs: 1000 });
      const r = engine.report();
      expect(r.totalReads).toBe(3);
      expect(r.uniqueFilesRead).toBe(2);
      expect(r.redundantReads).toBe(1);
      expect(r.redundancyRate).toBeCloseTo(1 / 3, 2);
    });

    it("ranks top redundant files", () => {
      engine.recordRead("/spam.ts", "x".repeat(1000), { mtimeMs: 1000 });
      engine.recordRead("/spam.ts", "x".repeat(1000), { mtimeMs: 1000 });
      engine.recordRead("/spam.ts", "x".repeat(1000), { mtimeMs: 1000 });
      engine.recordRead("/once.ts", "y".repeat(100), { mtimeMs: 1000 });
      const r = engine.report();
      expect(r.topRedundantFiles[0].path).toBe("/spam.ts");
      expect(r.topRedundantFiles[0].count).toBe(2); // 2 redundant flags from 3 reads
    });

    it("recommends caching when same file read 3+ times", () => {
      const big = "x".repeat(2000);
      engine.recordRead("/big.ts", big, { mtimeMs: 1000 });
      engine.recordRead("/big.ts", big, { mtimeMs: 1000 });
      engine.recordRead("/big.ts", big, { mtimeMs: 1000 });
      engine.recordRead("/big.ts", big, { mtimeMs: 1000 });
      const r = engine.report();
      expect(r.recommendations.some((rec) => /cache|read \d+ times/i.test(rec))).toBe(true);
    });

    it("recommends shouldSkip when redundancy rate exceeds threshold", () => {
      // 2 unique reads, 8 redundant on the same file → ~80% redundancy, well over the 15% threshold
      engine.recordRead("/dup.ts", "hello", { mtimeMs: 1000 });
      for (let i = 0; i < 8; i++) {
        engine.recordRead("/dup.ts", "hello", { mtimeMs: 1000 });
      }
      engine.recordRead("/other.ts", "world", { mtimeMs: 1000 });
      const r = engine.report();
      expect(r.recommendations.some((rec) => /shouldSkip|redundant/i.test(rec))).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty content", () => {
      const { record } = engine.recordRead("/empty.ts", "", { mtimeMs: 1000 });
      expect(record.tokenCost).toBe(0);
    });

    it("handles very large content", () => {
      const huge = "x".repeat(100000);
      const { record } = engine.recordRead("/huge.ts", huge, { mtimeMs: 1000 });
      expect(record.tokenCost).toBe(25000);
    });

    it("prunes reads beyond MAX_READS limit", () => {
      for (let i = 0; i < 2100; i++) {
        engine.recordRead(`/f${i}.ts`, "x", { mtimeMs: 1000 });
      }
      const reads = engine.getReads();
      expect(reads.length).toBeLessThanOrEqual(2000);
    });

    it("handles unicode content correctly", () => {
      const unicode = "你好世界 🌍 ñoño";
      const { record } = engine.recordRead("/unicode.ts", unicode, { mtimeMs: 1000 });
      expect(record.tokenCost).toBeGreaterThan(0);
    });

    it("reset clears all state", () => {
      engine.recordRead("/a.ts", "hello", { mtimeMs: 1000 });
      engine.recordRead("/a.ts", "hello", { mtimeMs: 1000 });
      engine.reset();
      const r = engine.report();
      expect(r.totalReads).toBe(0);
      expect(r.redundantReads).toBe(0);
    });

    it("persists state across engine instances", () => {
      engine.recordRead("/a.ts", "hello", { mtimeMs: 1000 });
      const engine2 = new FileReadDeduplicationEngine();
      expect(engine2.getReads().length).toBe(1);
    });
  });
});
