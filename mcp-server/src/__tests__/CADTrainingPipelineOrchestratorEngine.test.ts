/**
 * CADTrainingPipelineOrchestratorEngine tests — U-CADC19
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  cadTrainingPipelineOrchestratorEngine,
  CADTrainingPipelineOrchestratorEngine,
} from "../engines/CADTrainingPipelineOrchestratorEngine.js";

// Mock dispatcher for testing
async function invokeDispatcher(action: string, params: Record<string, unknown>): Promise<unknown> {
  const { cadTrainingPipelineOrchestratorEngine: engine } = await import(
    "../engines/CADTrainingPipelineOrchestratorEngine.js"
  );
  switch (action) {
    case "cad_pipeline_run":
      return { success: true, ...engine.run(params as any) };
    case "cad_pipeline_validate":
      return { success: true, ...engine.validateIndex((params?.sampleSize as number) ?? 10) };
    case "cad_pipeline_status":
      return { success: true, ...engine.status() };
    case "cad_pipeline_clear":
      return { success: true, ...engine.clear() };
    default:
      return { error: `Unknown action: ${action}` };
  }
}

describe("CADTrainingPipelineOrchestratorEngine", () => {
  let tempDir: string;
  let engine: CADTrainingPipelineOrchestratorEngine;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cad-pipeline-test-"));
    engine = new CADTrainingPipelineOrchestratorEngine();
  });

  afterEach(() => {
    engine.clear();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // ── Engine metadata ────────────────────────────────────────────────────────

  it("has correct engine info", () => {
    const info = cadTrainingPipelineOrchestratorEngine.getInfo();
    expect(info.name).toBe("CADTrainingPipelineOrchestratorEngine");
    expect(info.domain).toBe("cad_neural");
    expect(info.version).toBe("1.0.0");
  });

  it("exposes run, validate, status capabilities", () => {
    const caps = cadTrainingPipelineOrchestratorEngine.getCapabilities();
    const names = caps.map((c) => c.name);
    expect(names).toContain("run");
    expect(names).toContain("validate");
    expect(names).toContain("status");
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  it("validates input must be object", () => {
    expect(engine.validate(null)).not.toBeNull();
    expect(engine.validate("string")).not.toBeNull();
  });

  it("validates rootPath is required", () => {
    const err = engine.validate({});
    expect(err).toContain("rootPath");
  });

  it("validates rootPath must be non-empty", () => {
    const err = engine.validate({ rootPath: "" });
    expect(err).toContain("rootPath");
  });

  it("passes validation with valid rootPath", () => {
    const err = engine.validate({ rootPath: "/some/path" });
    expect(err).toBeNull();
  });

  it("validates maxFiles range", () => {
    expect(engine.validate({ rootPath: "/x", maxFiles: 0 })).toContain("maxFiles");
    expect(engine.validate({ rootPath: "/x", maxFiles: -1 })).not.toBeNull();
    expect(engine.validate({ rootPath: "/x", maxFiles: 200_000 })).toContain("maxFiles");
  });

  it("validates validateSamples range", () => {
    expect(engine.validate({ rootPath: "/x", validateSamples: 0 })).not.toBeNull();
    expect(engine.validate({ rootPath: "/x", validateSamples: 200 })).not.toBeNull();
    expect(engine.validate({ rootPath: "/x", validateSamples: 10 })).toBeNull();
  });

  // ── Pipeline run ───────────────────────────────────────────────────────────

  it("run completes pipeline for empty directory", () => {
    const result = engine.run({
      rootPath: tempDir,
      outputDir: tempDir,
      skipValidation: true,
    });
    expect(result.status).toBe("completed");
    expect(result.pipelineId).toMatch(/^CADPIPE-/);
    expect(result.stages.length).toBeGreaterThanOrEqual(4);
    expect(result.totalElapsedMs).toBeGreaterThanOrEqual(0);
  });

  it("run processes CAD files", () => {
    fs.writeFileSync(path.join(tempDir, "part.step"), "ISO-10303 test data");
    fs.writeFileSync(path.join(tempDir, "model.iges"), "IGES test data");

    const result = engine.run({
      rootPath: tempDir,
      outputDir: tempDir,
      skipValidation: true,
    });

    expect(result.status).toBe("completed");
    expect(result.indexStats.totalEntries).toBe(2);
    expect(result.corpusPath).toContain("CAD_CORPUS_");
    expect(fs.existsSync(result.corpusPath)).toBe(true);
  });

  it("run tracks stage timing", () => {
    fs.writeFileSync(path.join(tempDir, "a.step"), "data");

    const result = engine.run({
      rootPath: tempDir,
      outputDir: tempDir,
      skipValidation: true,
    });

    for (const stage of result.stages) {
      expect(stage.status).toBe("completed");
      expect(stage.startedAt).toBeDefined();
      expect(stage.completedAt).toBeDefined();
      expect(stage.elapsedMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("run includes validation stage when not skipped", () => {
    fs.writeFileSync(path.join(tempDir, "part.step"), "data");

    const result = engine.run({
      rootPath: tempDir,
      outputDir: tempDir,
      skipValidation: false,
    });

    expect(result.stages.some((s) => s.name === "validate")).toBe(true);
    expect(result.validation).toBeDefined();
    expect(result.validation?.sampleSize).toBeGreaterThan(0);
  });

  it("run respects maxFiles limit", () => {
    for (let i = 0; i < 10; i++) {
      fs.writeFileSync(path.join(tempDir, `part${i}.step`), `data${i}`);
    }

    const result = engine.run({
      rootPath: tempDir,
      outputDir: tempDir,
      maxFiles: 3,
      skipValidation: true,
    });

    expect(result.indexStats.totalEntries).toBe(3);
  });

  it("run respects excludePatterns", () => {
    const backupDir = path.join(tempDir, "BACKUP");
    fs.mkdirSync(backupDir);
    fs.writeFileSync(path.join(backupDir, "old.step"), "old data");
    fs.writeFileSync(path.join(tempDir, "new.step"), "new data");

    const result = engine.run({
      rootPath: tempDir,
      outputDir: tempDir,
      excludePatterns: ["BACKUP"],
      skipValidation: true,
    });

    expect(result.indexStats.totalEntries).toBe(1);
  });

  it("run uses vptree for large corpus", () => {
    for (let i = 0; i < 20; i++) {
      fs.writeFileSync(path.join(tempDir, `part${i}.step`), `data${i}`);
    }

    const result = engine.run({
      rootPath: tempDir,
      outputDir: tempDir,
      indexType: "vptree",
      skipValidation: true,
    });

    expect(result.indexStats.indexType).toBe("vptree");
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  it("validateIndex returns empty result for empty index", () => {
    engine.clear();
    const result = engine.validateIndex(5);
    expect(result.passed).toBe(false);
    expect(result.sampleSize).toBe(0);
  });

  it("validateIndex runs queries on populated index", () => {
    fs.writeFileSync(path.join(tempDir, "bracket.step"), "bracket data");
    fs.writeFileSync(path.join(tempDir, "flange.iges"), "flange data");

    engine.run({
      rootPath: tempDir,
      outputDir: tempDir,
      skipValidation: true,
    });

    const result = engine.validateIndex(3);
    expect(result.sampleSize).toBe(3);
    expect(result.avgSimilarity).toBeGreaterThanOrEqual(0);
    expect(result.passed).toBe(true);
  });

  // ── Status ─────────────────────────────────────────────────────────────────

  it("status returns empty for clean engine", () => {
    engine.clear();
    const status = engine.status();
    expect(status.corpus).toBe(false);
    expect(status.index).toBe(false);
    expect(status.stats.totalEntries).toBe(0);
  });

  it("status reflects populated index", () => {
    fs.writeFileSync(path.join(tempDir, "part.step"), "data");

    engine.run({
      rootPath: tempDir,
      outputDir: tempDir,
      skipValidation: true,
    });

    const status = engine.status();
    expect(status.corpus).toBe(true);
    expect(status.index).toBe(true);
    expect(status.stats.totalEntries).toBe(1);
  });

  // ── Clear ──────────────────────────────────────────────────────────────────

  it("clear resets pipeline state", () => {
    fs.writeFileSync(path.join(tempDir, "part.step"), "data");

    engine.run({
      rootPath: tempDir,
      outputDir: tempDir,
      skipValidation: true,
    });

    expect(engine.status().index).toBe(true);

    const result = engine.clear();
    expect(result.entriesCleared).toBe(1);
    expect(engine.status().index).toBe(false);
  });

  // ── Singleton export ───────────────────────────────────────────────────────

  it("singleton export is instance of engine", () => {
    expect(cadTrainingPipelineOrchestratorEngine).toBeInstanceOf(
      CADTrainingPipelineOrchestratorEngine
    );
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  it("handles nonexistent root path gracefully", () => {
    const result = engine.run({
      rootPath: path.join(tempDir, "nonexistent"),
      outputDir: tempDir,
      skipValidation: true,
    });
    expect(result.status).toBe("completed");
    expect(result.indexStats.totalEntries).toBe(0);
  });

  it("handles mixed file types", () => {
    fs.writeFileSync(path.join(tempDir, "a.step"), "step");
    fs.writeFileSync(path.join(tempDir, "b.iges"), "iges");
    fs.writeFileSync(path.join(tempDir, "c.sldprt"), "solidworks");
    fs.writeFileSync(path.join(tempDir, "d.txt"), "not cad");

    const result = engine.run({
      rootPath: tempDir,
      outputDir: tempDir,
      skipValidation: true,
    });

    expect(result.indexStats.totalEntries).toBe(3);
    expect(result.indexStats.byExtension[".step"]).toBe(1);
    expect(result.indexStats.byExtension[".iges"]).toBe(1);
    expect(result.indexStats.byExtension[".sldprt"]).toBe(1);
  });

  it("pipeline ID is unique per run", () => {
    const result1 = engine.run({
      rootPath: tempDir,
      outputDir: tempDir,
      skipValidation: true,
    });
    const result2 = engine.run({
      rootPath: tempDir,
      outputDir: tempDir,
      skipValidation: true,
    });
    expect(result1.pipelineId).not.toBe(result2.pipelineId);
  });

  // ── Dispatcher invocation tests ────────────────────────────────────────────

  describe("dispatcher invocation", () => {
    it("cad_pipeline_run via dispatcher", async () => {
      fs.writeFileSync(path.join(tempDir, "part.step"), "data");
      const result = (await invokeDispatcher("cad_pipeline_run", {
        rootPath: tempDir,
        outputDir: tempDir,
        skipValidation: true,
      })) as any;
      expect(result.success).toBe(true);
      expect(result.status).toBe("completed");
      expect(result.pipelineId).toMatch(/^CADPIPE-/);
    });

    it("cad_pipeline_status via dispatcher", async () => {
      const result = (await invokeDispatcher("cad_pipeline_status", {})) as any;
      expect(result.success).toBe(true);
      expect(result).toHaveProperty("corpus");
      expect(result).toHaveProperty("index");
      expect(result).toHaveProperty("stats");
    });

    it("cad_pipeline_validate via dispatcher", async () => {
      fs.writeFileSync(path.join(tempDir, "bracket.step"), "bracket");
      await invokeDispatcher("cad_pipeline_run", {
        rootPath: tempDir,
        outputDir: tempDir,
        skipValidation: true,
      });
      const result = (await invokeDispatcher("cad_pipeline_validate", {
        sampleSize: 3,
      })) as any;
      expect(result.success).toBe(true);
      expect(result.sampleSize).toBe(3);
      expect(result).toHaveProperty("avgSimilarity");
      expect(result).toHaveProperty("passed");
    });

    it("cad_pipeline_clear via dispatcher", async () => {
      fs.writeFileSync(path.join(tempDir, "part.step"), "data");
      await invokeDispatcher("cad_pipeline_run", {
        rootPath: tempDir,
        outputDir: tempDir,
        skipValidation: true,
      });
      const result = (await invokeDispatcher("cad_pipeline_clear", {})) as any;
      expect(result.success).toBe(true);
      expect(result.entriesCleared).toBeGreaterThanOrEqual(0);
    });

    it("unknown action returns error", async () => {
      const result = (await invokeDispatcher("cad_pipeline_unknown", {})) as any;
      expect(result.error).toContain("Unknown action");
    });
  });

  // ── Adversarial inputs ─────────────────────────────────────────────────────

  describe("adversarial inputs", () => {
    it("handles NaN maxFiles", () => {
      const err = engine.validate({ rootPath: "/x", maxFiles: NaN });
      expect(err).not.toBeNull();
    });

    it("handles Infinity maxFiles", () => {
      const err = engine.validate({ rootPath: "/x", maxFiles: Infinity });
      expect(err).not.toBeNull();
    });

    it("handles empty rootPath", () => {
      const err = engine.validate({ rootPath: "" });
      expect(err).toContain("rootPath");
    });

    it("handles oversized validateSamples", () => {
      const err = engine.validate({ rootPath: "/x", validateSamples: 999 });
      expect(err).not.toBeNull();
    });
  });
});
