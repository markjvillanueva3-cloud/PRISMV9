/**
 * CADTrainingCorpusOrchestratorEngine tests — U-CADC17
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  cadTrainingCorpusOrchestratorEngine,
  CADTrainingCorpusOrchestratorEngine,
} from "../engines/CADTrainingCorpusOrchestratorEngine.js";

describe("CADTrainingCorpusOrchestratorEngine", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cad-corpus-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // ── Engine metadata ────────────────────────────────────────────────────────

  it("has correct engine info", () => {
    const info = cadTrainingCorpusOrchestratorEngine.getInfo();
    expect(info.name).toBe("CADTrainingCorpusOrchestratorEngine");
    expect(info.domain).toBe("cad_neural");
    expect(info.version).toBe("1.0.0");
  });

  it("exposes orchestrate, scan, status capabilities", () => {
    const caps = cadTrainingCorpusOrchestratorEngine.getCapabilities();
    const names = caps.map(c => c.name);
    expect(names).toContain("orchestrate");
    expect(names).toContain("scan");
    expect(names).toContain("status");
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  it("validates rootPath is required", () => {
    const err = cadTrainingCorpusOrchestratorEngine.validate({});
    expect(err).toContain("rootPath");
  });

  it("validates rootPath must be non-empty", () => {
    const err = cadTrainingCorpusOrchestratorEngine.validate({ rootPath: "" });
    expect(err).toContain("rootPath");
  });

  it("passes validation with valid rootPath", () => {
    const err = cadTrainingCorpusOrchestratorEngine.validate({ rootPath: "/some/path" });
    expect(err).toBeNull();
  });

  it("validates maxFiles must be positive", () => {
    const err = cadTrainingCorpusOrchestratorEngine.validate({ rootPath: "/x", maxFiles: 0 });
    expect(err).toContain("maxFiles");
  });

  it("validates maxFiles must not exceed 100k", () => {
    const err = cadTrainingCorpusOrchestratorEngine.validate({ rootPath: "/x", maxFiles: 200_000 });
    expect(err).toContain("maxFiles");
  });

  // ── scanOnly ───────────────────────────────────────────────────────────────

  it("scanOnly returns empty for empty directory", () => {
    const result = cadTrainingCorpusOrchestratorEngine.scanOnly({ rootPath: tempDir });
    expect(result).toEqual([]);
  });

  it("scanOnly finds .step files", () => {
    fs.writeFileSync(path.join(tempDir, "part.step"), "ISO-10303");
    const result = cadTrainingCorpusOrchestratorEngine.scanOnly({ rootPath: tempDir });
    expect(result.length).toBe(1);
    expect(result[0].path).toContain("part.step");
    expect(result[0].bytes).toBeGreaterThan(0);
  });

  it("scanOnly finds .iges files", () => {
    fs.writeFileSync(path.join(tempDir, "model.iges"), "IGES data");
    const result = cadTrainingCorpusOrchestratorEngine.scanOnly({ rootPath: tempDir });
    expect(result.length).toBe(1);
    expect(result[0].path).toContain("model.iges");
  });

  it("scanOnly finds .sldprt files", () => {
    fs.writeFileSync(path.join(tempDir, "sw.sldprt"), "SolidWorks");
    const result = cadTrainingCorpusOrchestratorEngine.scanOnly({ rootPath: tempDir });
    expect(result.length).toBe(1);
  });

  it("scanOnly finds .ipt files", () => {
    fs.writeFileSync(path.join(tempDir, "inv.ipt"), "Inventor");
    const result = cadTrainingCorpusOrchestratorEngine.scanOnly({ rootPath: tempDir });
    expect(result.length).toBe(1);
  });

  it("scanOnly ignores non-CAD files", () => {
    fs.writeFileSync(path.join(tempDir, "readme.txt"), "text");
    fs.writeFileSync(path.join(tempDir, "image.png"), "png");
    const result = cadTrainingCorpusOrchestratorEngine.scanOnly({ rootPath: tempDir });
    expect(result.length).toBe(0);
  });

  it("scanOnly respects maxFiles limit", () => {
    for (let i = 0; i < 10; i++) {
      fs.writeFileSync(path.join(tempDir, `part${i}.step`), `data${i}`);
    }
    const result = cadTrainingCorpusOrchestratorEngine.scanOnly({ rootPath: tempDir, maxFiles: 3 });
    expect(result.length).toBe(3);
  });

  it("scanOnly respects excludePatterns", () => {
    const backup = path.join(tempDir, "BACKUP");
    fs.mkdirSync(backup);
    fs.writeFileSync(path.join(backup, "old.step"), "old");
    fs.writeFileSync(path.join(tempDir, "new.step"), "new");
    const result = cadTrainingCorpusOrchestratorEngine.scanOnly({
      rootPath: tempDir,
      excludePatterns: ["BACKUP"],
    });
    expect(result.length).toBe(1);
    expect(result[0].path).toContain("new.step");
  });

  it("scanOnly recurses into subdirectories", () => {
    const sub = path.join(tempDir, "subdir");
    fs.mkdirSync(sub);
    fs.writeFileSync(path.join(sub, "deep.step"), "nested");
    const result = cadTrainingCorpusOrchestratorEngine.scanOnly({ rootPath: tempDir });
    expect(result.length).toBe(1);
    expect(result[0].path).toContain("deep.step");
  });

  // ── status ─────────────────────────────────────────────────────────────────

  it("status returns exists=false for missing file", () => {
    const result = cadTrainingCorpusOrchestratorEngine.status(path.join(tempDir, "nonexistent.jsonl"));
    expect(result.exists).toBe(false);
  });

  it("status returns stats for existing corpus", () => {
    const corpusPath = path.join(tempDir, "corpus.jsonl");
    fs.writeFileSync(corpusPath, '{"a":1}\n{"b":2}\n{"c":3}\n');
    const result = cadTrainingCorpusOrchestratorEngine.status(corpusPath);
    expect(result.exists).toBe(true);
    expect(result.entries).toBe(3);
    expect(result.bytes).toBeGreaterThan(0);
    expect(result.modifiedAt).toBeDefined();
  });

  // ── orchestrate ────────────────────────────────────────────────────────────

  it("orchestrate produces JSONL output", () => {
    fs.writeFileSync(path.join(tempDir, "test.step"), "ISO-10303 test data");
    const outputPath = path.join(tempDir, "output.jsonl");
    const result = cadTrainingCorpusOrchestratorEngine.orchestrate({
      rootPath: tempDir,
      outputPath,
    });
    expect(result.filesScanned).toBe(1);
    expect(result.entriesWritten).toBeGreaterThanOrEqual(0);
    expect(result.corpusPath).toBe(outputPath);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(fs.existsSync(outputPath)).toBe(true);
  });

  it("orchestrate handles empty directory", () => {
    const outputPath = path.join(tempDir, "empty.jsonl");
    const result = cadTrainingCorpusOrchestratorEngine.orchestrate({
      rootPath: tempDir,
      outputPath,
    });
    expect(result.filesScanned).toBe(0);
    expect(result.entriesWritten).toBe(0);
    expect(result.duplicatesRemoved).toBe(0);
  });

  it("orchestrate tracks duplicates removed", () => {
    // Hash is path+bytes based, so different files with same content are unique
    fs.writeFileSync(path.join(tempDir, "a.step"), "same content");
    fs.writeFileSync(path.join(tempDir, "b.step"), "same content");
    const outputPath = path.join(tempDir, "dedup.jsonl");
    const result = cadTrainingCorpusOrchestratorEngine.orchestrate({
      rootPath: tempDir,
      outputPath,
    });
    expect(result.filesScanned).toBe(2);
    // Different paths = different hashes = no duplicates removed
    expect(result.duplicatesRemoved).toBe(0);
    expect(result.entriesWritten).toBe(2);
  });

  it("orchestrate can skip dedup", () => {
    fs.writeFileSync(path.join(tempDir, "a.step"), "same");
    fs.writeFileSync(path.join(tempDir, "b.step"), "same");
    const outputPath = path.join(tempDir, "nodedup.jsonl");
    const result = cadTrainingCorpusOrchestratorEngine.orchestrate({
      rootPath: tempDir,
      outputPath,
      skipDedup: true,
    });
    expect(result.duplicatesRemoved).toBe(0);
    expect(result.entriesWritten).toBe(2);
  });

  it("orchestrate returns stats with extension breakdown", () => {
    fs.writeFileSync(path.join(tempDir, "part.step"), "data");
    const outputPath = path.join(tempDir, "stats.jsonl");
    const result = cadTrainingCorpusOrchestratorEngine.orchestrate({
      rootPath: tempDir,
      outputPath,
    });
    expect(result.stats).toBeDefined();
    expect(result.stats.total).toBeGreaterThanOrEqual(0);
    expect(result.stats.byExtension).toBeDefined();
    expect(result.stats.totalBytes).toBeGreaterThan(0);
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  it("handles nonexistent root path gracefully", () => {
    const result = cadTrainingCorpusOrchestratorEngine.scanOnly({
      rootPath: path.join(tempDir, "does-not-exist"),
    });
    expect(result).toEqual([]);
  });

  it("handles mixed CAD extensions", () => {
    fs.writeFileSync(path.join(tempDir, "a.step"), "step");
    fs.writeFileSync(path.join(tempDir, "b.iges"), "iges");
    fs.writeFileSync(path.join(tempDir, "c.x_t"), "parasolid");
    fs.writeFileSync(path.join(tempDir, "d.txt"), "text");
    const result = cadTrainingCorpusOrchestratorEngine.scanOnly({ rootPath: tempDir });
    expect(result.length).toBe(3);
  });

  it("instance is singleton export", () => {
    expect(cadTrainingCorpusOrchestratorEngine).toBeInstanceOf(CADTrainingCorpusOrchestratorEngine);
  });

  // ── Adversarial inputs ─────────────────────────────────────────────────────

  it("rejects NaN maxFiles", () => {
    const err = cadTrainingCorpusOrchestratorEngine.validate({ rootPath: "/x", maxFiles: NaN });
    expect(err).not.toBeNull();
  });

  it("rejects Infinity maxFiles", () => {
    const err = cadTrainingCorpusOrchestratorEngine.validate({ rootPath: "/x", maxFiles: Infinity });
    expect(err).not.toBeNull();
  });

  it("rejects negative maxFiles", () => {
    const err = cadTrainingCorpusOrchestratorEngine.validate({ rootPath: "/x", maxFiles: -5 });
    expect(err).not.toBeNull();
  });
});
