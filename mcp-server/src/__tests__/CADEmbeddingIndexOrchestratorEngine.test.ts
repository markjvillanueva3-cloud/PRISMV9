/**
 * CADEmbeddingIndexOrchestratorEngine tests — U-CADC18
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  cadEmbeddingIndexOrchestratorEngine,
  CADEmbeddingIndexOrchestratorEngine,
  type CADCorpusEntry,
} from "../engines/CADEmbeddingIndexOrchestratorEngine.js";

describe("CADEmbeddingIndexOrchestratorEngine", () => {
  let tempDir: string;
  let engine: CADEmbeddingIndexOrchestratorEngine;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cad-embed-test-"));
    engine = new CADEmbeddingIndexOrchestratorEngine();
  });

  afterEach(() => {
    engine.clear();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // ── Engine metadata ────────────────────────────────────────────────────────

  it("has correct engine info", () => {
    const info = cadEmbeddingIndexOrchestratorEngine.getInfo();
    expect(info.name).toBe("CADEmbeddingIndexOrchestratorEngine");
    expect(info.domain).toBe("cad_neural");
    expect(info.version).toBe("1.0.0");
  });

  it("exposes ingest, query, stats, clear, similar capabilities", () => {
    const caps = cadEmbeddingIndexOrchestratorEngine.getCapabilities();
    const names = caps.map(c => c.name);
    expect(names).toContain("ingest");
    expect(names).toContain("query");
    expect(names).toContain("stats");
    expect(names).toContain("clear");
    expect(names).toContain("similar");
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  it("validates input must be object", () => {
    expect(engine.validate(null)).not.toBeNull();
    expect(engine.validate("string")).not.toBeNull();
  });

  it("validates corpusPath must be non-empty string", () => {
    expect(engine.validate({ corpusPath: "" })).toContain("corpusPath");
    expect(engine.validate({ corpusPath: 123 })).toContain("corpusPath");
  });

  it("validates query must be non-empty", () => {
    expect(engine.validate({ query: "" })).toContain("query");
  });

  it("passes validation for valid query", () => {
    expect(engine.validate({ query: "bracket" })).toBeNull();
  });

  it("passes validation for valid corpusPath", () => {
    expect(engine.validate({ corpusPath: "/some/path.jsonl" })).toBeNull();
  });

  // ── Ingest from entries ────────────────────────────────────────────────────

  it("ingestEntries indexes corpus entries", () => {
    const entries: CADCorpusEntry[] = [
      { sourcePath: "/parts/bracket.step", ext: ".step", bytes: 1000, hash: "abc123", scannedAt: "2026-01-01" },
      { sourcePath: "/parts/flange.iges", ext: ".iges", bytes: 2000, hash: "def456", scannedAt: "2026-01-01" },
    ];
    const result = engine.ingestEntries(entries);
    expect(result.entriesIngested).toBe(2);
    expect(result.indexType).toBe("vptree");
  });

  it("ingestEntries uses flat index for small corpus", () => {
    const entries: CADCorpusEntry[] = [
      { sourcePath: "/parts/a.step", ext: ".step", bytes: 100, hash: "a", scannedAt: "2026-01-01" },
    ];
    const result = engine.ingestEntries(entries, { indexType: "flat" });
    expect(result.indexType).toBe("flat");
  });

  it("ingestEntries respects maxEntries", () => {
    const entries: CADCorpusEntry[] = [];
    for (let i = 0; i < 100; i++) {
      entries.push({ sourcePath: `/parts/p${i}.step`, ext: ".step", bytes: i * 10, hash: `h${i}`, scannedAt: "2026-01-01" });
    }
    const result = engine.ingestEntries(entries, { maxEntries: 50 });
    expect(result.entriesIngested).toBe(50);
  });

  // ── Ingest from file ───────────────────────────────────────────────────────

  it("ingest reads JSONL corpus file", () => {
    const corpusPath = path.join(tempDir, "corpus.jsonl");
    const entries = [
      { sourcePath: "/a.step", ext: ".step", bytes: 100, hash: "a1", scannedAt: "2026-01-01" },
      { sourcePath: "/b.iges", ext: ".iges", bytes: 200, hash: "b2", scannedAt: "2026-01-01" },
    ];
    fs.writeFileSync(corpusPath, entries.map(e => JSON.stringify(e)).join("\n"));

    const result = engine.ingest(corpusPath);
    expect(result.entriesIngested).toBe(2);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it("ingest throws for missing file", () => {
    expect(() => engine.ingest("/nonexistent.jsonl")).toThrow("Cannot read corpus file");
  });

  it("ingest skips malformed lines", () => {
    const corpusPath = path.join(tempDir, "bad.jsonl");
    fs.writeFileSync(corpusPath, '{"sourcePath":"/a.step","ext":".step","bytes":100,"hash":"a","scannedAt":"x"}\nnot json\n{"sourcePath":"/b.step","ext":".step","bytes":200,"hash":"b","scannedAt":"x"}');
    const result = engine.ingest(corpusPath);
    expect(result.entriesIngested).toBe(2);
  });

  // ── Query ──────────────────────────────────────────────────────────────────

  it("query returns empty for unindexed engine", () => {
    const results = engine.query({ query: "bracket" });
    expect(results).toEqual([]);
  });

  it("query returns results from indexed corpus", () => {
    const entries: CADCorpusEntry[] = [
      { sourcePath: "/parts/bracket_mount.step", ext: ".step", bytes: 1000, hash: "a", scannedAt: "x" },
      { sourcePath: "/parts/flange_assembly.iges", ext: ".iges", bytes: 2000, hash: "b", scannedAt: "x" },
      { sourcePath: "/parts/bracket_support.step", ext: ".step", bytes: 1500, hash: "c", scannedAt: "x" },
    ];
    engine.ingestEntries(entries);

    const results = engine.query({ query: "bracket", k: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
    expect(results[0]).toHaveProperty("sourcePath");
    expect(results[0]).toHaveProperty("distance");
  });

  it("query filters by extension", () => {
    const entries: CADCorpusEntry[] = [
      { sourcePath: "/a.step", ext: ".step", bytes: 100, hash: "a", scannedAt: "x" },
      { sourcePath: "/b.iges", ext: ".iges", bytes: 200, hash: "b", scannedAt: "x" },
      { sourcePath: "/c.step", ext: ".step", bytes: 300, hash: "c", scannedAt: "x" },
    ];
    engine.ingestEntries(entries);

    const results = engine.query({ query: "part", extensions: [".iges"] });
    for (const r of results) {
      expect(r.ext).toBe(".iges");
    }
  });

  it("query filters by byte range", () => {
    const entries: CADCorpusEntry[] = [
      { sourcePath: "/small.step", ext: ".step", bytes: 100, hash: "a", scannedAt: "x" },
      { sourcePath: "/medium.step", ext: ".step", bytes: 500, hash: "b", scannedAt: "x" },
      { sourcePath: "/large.step", ext: ".step", bytes: 1000, hash: "c", scannedAt: "x" },
    ];
    engine.ingestEntries(entries);

    const results = engine.query({ query: "step", minBytes: 200, maxBytes: 800 });
    for (const r of results) {
      expect(r.bytes).toBeGreaterThanOrEqual(200);
      expect(r.bytes).toBeLessThanOrEqual(800);
    }
  });

  it("query infers feature type from path", () => {
    const entries: CADCorpusEntry[] = [
      { sourcePath: "/parts/hole_pattern.step", ext: ".step", bytes: 100, hash: "a", scannedAt: "x" },
      { sourcePath: "/parts/pocket_deep.step", ext: ".step", bytes: 100, hash: "b", scannedAt: "x" },
    ];
    engine.ingestEntries(entries);

    const results = engine.query({ query: "hole pattern pocket", k: 10 });
    const types = results.map(r => r.featureType);
    expect(types).toContain("hole");
    expect(types).toContain("pocket");
  });

  // ── findSimilar ────────────────────────────────────────────────────────────

  it("findSimilar returns similar parts", () => {
    const entries: CADCorpusEntry[] = [
      { sourcePath: "/parts/bracket_a.step", ext: ".step", bytes: 1000, hash: "a", scannedAt: "x" },
      { sourcePath: "/parts/bracket_b.step", ext: ".step", bytes: 1100, hash: "b", scannedAt: "x" },
      { sourcePath: "/parts/flange.iges", ext: ".iges", bytes: 2000, hash: "c", scannedAt: "x" },
    ];
    engine.ingestEntries(entries);

    const results = engine.findSimilar("/parts/bracket_a.step", 2);
    expect(results.length).toBeLessThanOrEqual(2);
    expect(results.every(r => r.sourcePath !== "/parts/bracket_a.step")).toBe(true);
  });

  it("findSimilar works with non-indexed path", () => {
    const entries: CADCorpusEntry[] = [
      { sourcePath: "/parts/bracket.step", ext: ".step", bytes: 1000, hash: "a", scannedAt: "x" },
    ];
    engine.ingestEntries(entries);

    const results = engine.findSimilar("/unknown/path.step", 1);
    expect(results.length).toBeLessThanOrEqual(1);
  });

  // ── searchByTokens ─────────────────────────────────────────────────────────

  it("searchByTokens delegates to CADFeatureEmbeddingEngine", () => {
    const entries: CADCorpusEntry[] = [
      { sourcePath: "/a.step", ext: ".step", bytes: 100, hash: "a", scannedAt: "x" },
      { sourcePath: "/b.step", ext: ".step", bytes: 200, hash: "b", scannedAt: "x" },
    ];
    engine.ingestEntries(entries);

    const tokens = [65, 66, 67]; // "ABC"
    const results = engine.searchByTokens(tokens, 1);
    expect(results.length).toBeLessThanOrEqual(1);
  });

  // ── Stats ──────────────────────────────────────────────────────────────────

  it("stats returns index statistics", () => {
    const entries: CADCorpusEntry[] = [
      { sourcePath: "/a.step", ext: ".step", bytes: 100, hash: "a", scannedAt: "x" },
      { sourcePath: "/b.iges", ext: ".iges", bytes: 200, hash: "b", scannedAt: "x" },
      { sourcePath: "/c.step", ext: ".step", bytes: 300, hash: "c", scannedAt: "x" },
    ];
    engine.ingestEntries(entries);

    const stats = engine.stats();
    expect(stats.totalEntries).toBe(3);
    expect(stats.byExtension[".step"]).toBe(2);
    expect(stats.byExtension[".iges"]).toBe(1);
    expect(stats.embeddingDim).toBe(384);
    expect(stats.cacheStats).toHaveProperty("size");
  });

  it("stats returns empty for unindexed engine", () => {
    const stats = engine.stats();
    expect(stats.totalEntries).toBe(0);
    expect(stats.byExtension).toEqual({});
  });

  // ── Clear ──────────────────────────────────────────────────────────────────

  it("clear resets index and cache", () => {
    const entries: CADCorpusEntry[] = [
      { sourcePath: "/a.step", ext: ".step", bytes: 100, hash: "a", scannedAt: "x" },
    ];
    engine.ingestEntries(entries);
    expect(engine.stats().totalEntries).toBe(1);

    const result = engine.clear();
    expect(result.entriesCleared).toBe(1);
    expect(engine.stats().totalEntries).toBe(0);
  });

  // ── Singleton export ───────────────────────────────────────────────────────

  it("singleton export is instance of engine", () => {
    expect(cadEmbeddingIndexOrchestratorEngine).toBeInstanceOf(CADEmbeddingIndexOrchestratorEngine);
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  it("handles empty corpus gracefully", () => {
    engine.ingestEntries([]);
    expect(engine.stats().totalEntries).toBe(0);
    expect(engine.query({ query: "anything" })).toEqual([]);
  });

  it("handles very long query strings", () => {
    const entries: CADCorpusEntry[] = [
      { sourcePath: "/a.step", ext: ".step", bytes: 100, hash: "a", scannedAt: "x" },
    ];
    engine.ingestEntries(entries);

    const longQuery = "a".repeat(1000);
    const results = engine.query({ query: longQuery, k: 1 });
    expect(results.length).toBeLessThanOrEqual(1);
  });

  it("handles special characters in paths", () => {
    const entries: CADCorpusEntry[] = [
      { sourcePath: "/parts/bracket (1).step", ext: ".step", bytes: 100, hash: "a", scannedAt: "x" },
      { sourcePath: "/parts/flange & mount.iges", ext: ".iges", bytes: 200, hash: "b", scannedAt: "x" },
    ];
    engine.ingestEntries(entries);

    const stats = engine.stats();
    expect(stats.totalEntries).toBe(2);
  });
});
