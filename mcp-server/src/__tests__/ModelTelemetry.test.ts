/**
 * ModelTelemetryEngine — record + summary + hydration tests with isolated tmp file.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / P23-U01.
 *
 * Each test points the engine at a unique tmp file so concurrent vitest
 * workers don't clobber each other and the production telemetry file
 * (data/state/model-telemetry.jsonl) stays untouched.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  ModelTelemetryEngine,
  modelTelemetryEngine,
  type CallRecord,
  type ModelSummary,
} from "../engines/ModelTelemetryEngine.js";

let tmpDir: string;
let tmpFile: string;
let engine: ModelTelemetryEngine;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "prism-telemetry-"));
  tmpFile = path.join(tmpDir, "model-telemetry.jsonl");
  engine = new ModelTelemetryEngine();
  engine.setFilePath(tmpFile);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function getModel(perModel: ModelSummary[], name: string): ModelSummary {
  const found = perModel.find((m) => m.model === name);
  if (!found) throw new Error(`expected model '${name}' in summary, got: ${perModel.map((m) => m.model).join(", ")}`);
  return found;
}

describe("ModelTelemetryEngine — recordCall", () => {
  it("appends a line and returns ok with non-zero fileBytes", async () => {
    const r = await engine.recordCall({
      model: "qwen2.5-coder:7b",
      tier: 1,
      outcome: "ok",
      latencyMs: 250,
      promptTokens: 100,
      completionTokens: 50,
      caller: "prism_ai:reason",
    });
    expect(r.ok).toBe(true);
    expect(r.error).toBeNull();
    expect(r.fileBytes).toBeGreaterThan(100);

    const content = await fs.readFile(tmpFile, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]) as CallRecord;
    expect(parsed.model).toBe("qwen2.5-coder:7b");
    expect(parsed.tier).toBe(1);
    expect(parsed.outcome).toBe("ok");
    expect(parsed.latencyMs).toBe(250);
    expect(parsed.promptTokens).toBe(100);
    expect(parsed.completionTokens).toBe(50);
    expect(parsed.caller).toBe("prism_ai:reason");
    // ts must be a parseable ISO string within the last 5 seconds
    const ageMs = Date.now() - Date.parse(parsed.ts);
    expect(ageMs).toBeGreaterThanOrEqual(0);
    expect(ageMs).toBeLessThan(5000);
  });

  it("respects explicit ts when provided", async () => {
    const fixedTs = "2026-05-04T12:00:00.000Z";
    await engine.recordCall({
      ts: fixedTs,
      model: "deepseek-r1:14b",
      tier: 3,
      outcome: "ok",
      latencyMs: 5000,
      promptTokens: 200,
      completionTokens: 800,
    });
    const content = await fs.readFile(tmpFile, "utf-8");
    const parsed = JSON.parse(content.trim()) as CallRecord;
    expect(parsed.ts).toBe(fixedTs);
  });

  it("appends multiple lines preserving order", async () => {
    await engine.recordCall({ model: "qwen2.5-coder:7b", tier: 1, outcome: "ok", latencyMs: 100, promptTokens: 10, completionTokens: 5 });
    await engine.recordCall({ model: "qwen2.5-coder:7b", tier: 1, outcome: "ok", latencyMs: 101, promptTokens: 10, completionTokens: 5 });
    await engine.recordCall({ model: "qwen2.5-coder:7b", tier: 1, outcome: "ok", latencyMs: 102, promptTokens: 10, completionTokens: 5 });
    const content = await fs.readFile(tmpFile, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(3);
    expect((JSON.parse(lines[0]) as CallRecord).latencyMs).toBe(100);
    expect((JSON.parse(lines[1]) as CallRecord).latencyMs).toBe(101);
    expect((JSON.parse(lines[2]) as CallRecord).latencyMs).toBe(102);
  });

  it("rejects empty model", async () => {
    await expect(engine.recordCall({
      model: "",
      tier: 1,
      outcome: "ok",
      latencyMs: 100,
      promptTokens: 10,
      completionTokens: 5,
    })).rejects.toThrow(/model/);
  });

  it("rejects tier out of [0..5]", async () => {
    await expect(engine.recordCall({
      model: "x",
      tier: 6,
      outcome: "ok",
      latencyMs: 100,
      promptTokens: 10,
      completionTokens: 5,
    })).rejects.toThrow(/tier/);
  });

  it("rejects unknown outcome", async () => {
    await expect(engine.recordCall({
      model: "x",
      tier: 1,
      outcome: "weird" as CallRecord["outcome"],
      latencyMs: 100,
      promptTokens: 10,
      completionTokens: 5,
    })).rejects.toThrow(/outcome/);
  });

  it("rejects negative latency", async () => {
    await expect(engine.recordCall({
      model: "x",
      tier: 1,
      outcome: "ok",
      latencyMs: -1,
      promptTokens: 10,
      completionTokens: 5,
    })).rejects.toThrow(/latencyMs/);
  });

  it("rejects qualityScore outside [0,1]", async () => {
    await expect(engine.recordCall({
      model: "x",
      tier: 1,
      outcome: "ok",
      latencyMs: 100,
      promptTokens: 10,
      completionTokens: 5,
      qualityScore: 1.5,
    })).rejects.toThrow(/qualityScore/);
  });
});

describe("ModelTelemetryEngine — summary aggregation", () => {
  beforeEach(async () => {
    // Seed: 3 calls qwen-7b (2 ok + 1 error), 2 calls deepseek-r1 (both ok)
    await engine.recordCall({ model: "qwen2.5-coder:7b", tier: 1, outcome: "ok", latencyMs: 100, promptTokens: 50, completionTokens: 30, qualityScore: 0.8 });
    await engine.recordCall({ model: "qwen2.5-coder:7b", tier: 1, outcome: "ok", latencyMs: 200, promptTokens: 60, completionTokens: 40, qualityScore: 0.9 });
    await engine.recordCall({ model: "qwen2.5-coder:7b", tier: 1, outcome: "error", latencyMs: 300, promptTokens: 70, completionTokens: 0, error: "timeout" });
    await engine.recordCall({ model: "deepseek-r1:14b", tier: 3, outcome: "ok", latencyMs: 5000, promptTokens: 200, completionTokens: 800 });
    await engine.recordCall({ model: "deepseek-r1:14b", tier: 3, outcome: "ok", latencyMs: 6000, promptTokens: 250, completionTokens: 1000 });
  });

  it("returns 5 totalCalls with two model summaries", async () => {
    const r = await engine.summary();
    expect(r.totalCalls).toBe(5);
    expect(r.perModel).toHaveLength(2);
  });

  it("orders perModel by call count descending (qwen first)", async () => {
    const r = await engine.summary();
    expect(r.perModel[0].model).toBe("qwen2.5-coder:7b");
    expect(r.perModel[0].calls).toBe(3);
    expect(r.perModel[1].model).toBe("deepseek-r1:14b");
    expect(r.perModel[1].calls).toBe(2);
  });

  it("computes successRate per model", async () => {
    const r = await engine.summary();
    const qwen = getModel(r.perModel, "qwen2.5-coder:7b");
    const deep = getModel(r.perModel, "deepseek-r1:14b");
    expect(qwen.successRate).toBe(0.667); // 2/3
    expect(deep.successRate).toBe(1);
  });

  it("computes mean latency rounded to integer", async () => {
    const r = await engine.summary();
    expect(getModel(r.perModel, "qwen2.5-coder:7b").meanLatencyMs).toBe(200);
    expect(getModel(r.perModel, "deepseek-r1:14b").meanLatencyMs).toBe(5500);
  });

  it("computes p50 and p95 latency", async () => {
    const r = await engine.summary();
    const qwen = getModel(r.perModel, "qwen2.5-coder:7b");
    // sorted: [100, 200, 300]; p50 = idx floor(0.5*3)=1 → 200; p95 = idx floor(0.95*3)=2 → 300
    expect(qwen.p50LatencyMs).toBe(200);
    expect(qwen.p95LatencyMs).toBe(300);
  });

  it("meanQualityScore averages only across records that set it", async () => {
    const r = await engine.summary();
    expect(getModel(r.perModel, "qwen2.5-coder:7b").meanQualityScore).toBe(0.85);
    expect(getModel(r.perModel, "deepseek-r1:14b").meanQualityScore).toBeNull();
  });

  it("counts errorCount distinctly from timeoutCount", async () => {
    await engine.recordCall({ model: "qwen2.5-coder:7b", tier: 1, outcome: "timeout", latencyMs: 30000, promptTokens: 50, completionTokens: 0 });
    const r = await engine.summary();
    const qwen = getModel(r.perModel, "qwen2.5-coder:7b");
    expect(qwen.errorCount).toBe(1);
    expect(qwen.timeoutCount).toBe(1);
    expect(qwen.okCount).toBe(2);
    expect(qwen.calls).toBe(4);
  });

  it("respects windowMs — older records excluded from default 7-day window", async () => {
    const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await engine.recordCall({ ts: old, model: "ancient", tier: 1, outcome: "ok", latencyMs: 50, promptTokens: 10, completionTokens: 5 });
    const r = await engine.summary();
    const ancientModels = r.perModel.filter((m) => m.model === "ancient");
    expect(ancientModels).toEqual([]);
  });

  it("respects windowMs — older records included in 60-day window", async () => {
    const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await engine.recordCall({ ts: old, model: "ancient", tier: 1, outcome: "ok", latencyMs: 50, promptTokens: 10, completionTokens: 5 });
    const r60 = await engine.summary(60 * 24 * 60 * 60 * 1000);
    const ancient = getModel(r60.perModel, "ancient");
    expect(ancient.calls).toBe(1);
  });

  it("returns empty report for empty window", async () => {
    const fresh = new ModelTelemetryEngine();
    fresh.setFilePath(path.join(tmpDir, "empty.jsonl"));
    const r = await fresh.summary();
    expect(r.totalCalls).toBe(0);
    expect(r.perModel).toEqual([]);
  });

  it("rejects non-positive windowMs", async () => {
    await expect(engine.summary(0)).rejects.toThrow(/windowMs/);
    await expect(engine.summary(-1)).rejects.toThrow(/windowMs/);
  });
});

describe("ModelTelemetryEngine — getRecent ring buffer", () => {
  it("returns most recent N records in append order", async () => {
    await engine.recordCall({ model: "model-A", tier: 1, outcome: "ok", latencyMs: 1, promptTokens: 1, completionTokens: 1 });
    await engine.recordCall({ model: "model-B", tier: 1, outcome: "ok", latencyMs: 2, promptTokens: 1, completionTokens: 1 });
    await engine.recordCall({ model: "model-C", tier: 1, outcome: "ok", latencyMs: 3, promptTokens: 1, completionTokens: 1 });
    await engine.recordCall({ model: "model-D", tier: 1, outcome: "ok", latencyMs: 4, promptTokens: 1, completionTokens: 1 });
    const r = await engine.getRecent(2);
    expect(r.map((x) => x.model)).toEqual(["model-C", "model-D"]);
  });

  it("rejects non-positive limit", async () => {
    await expect(engine.getRecent(0)).rejects.toThrow(/limit/);
    await expect(engine.getRecent(-1)).rejects.toThrow(/limit/);
    await expect(engine.getRecent(1.5)).rejects.toThrow(/limit/);
  });
});

describe("ModelTelemetryEngine — file hydration on fresh instance", () => {
  it("reads existing JSONL on first summary call", async () => {
    const ts = new Date().toISOString();
    const lines = [
      JSON.stringify({ ts, model: "preloaded", tier: 2, outcome: "ok", latencyMs: 123, promptTokens: 10, completionTokens: 5 }),
      JSON.stringify({ ts, model: "preloaded", tier: 2, outcome: "error", latencyMs: 999, promptTokens: 10, completionTokens: 0 }),
    ];
    await fs.writeFile(tmpFile, lines.join("\n") + "\n", "utf-8");

    const fresh = new ModelTelemetryEngine();
    fresh.setFilePath(tmpFile);
    const r = await fresh.summary();
    expect(r.totalCalls).toBe(2);
    const m = getModel(r.perModel, "preloaded");
    expect(m.calls).toBe(2);
    expect(m.okCount).toBe(1);
    expect(m.errorCount).toBe(1);
  });

  it("tolerates corrupt lines mid-file (skips them, keeps the rest)", async () => {
    const ts = new Date().toISOString();
    const lines = [
      JSON.stringify({ ts, model: "good", tier: 1, outcome: "ok", latencyMs: 1, promptTokens: 1, completionTokens: 1 }),
      "{not valid json",
      JSON.stringify({ ts, model: "good", tier: 1, outcome: "ok", latencyMs: 2, promptTokens: 1, completionTokens: 1 }),
    ];
    await fs.writeFile(tmpFile, lines.join("\n") + "\n", "utf-8");

    const fresh = new ModelTelemetryEngine();
    fresh.setFilePath(tmpFile);
    const r = await fresh.summary();
    expect(r.totalCalls).toBe(2);
    expect(getModel(r.perModel, "good").calls).toBe(2);
  });

  it("treats missing file as empty (no throw)", async () => {
    const fresh = new ModelTelemetryEngine();
    fresh.setFilePath(path.join(tmpDir, "does-not-exist.jsonl"));
    const r = await fresh.summary();
    expect(r.totalCalls).toBe(0);
    expect(r.perModel).toEqual([]);
  });
});

describe("ModelTelemetryEngine — singleton", () => {
  it("default singleton path resolves under data/state and ends with model-telemetry.jsonl", () => {
    const p = modelTelemetryEngine.getFilePath();
    expect(p.endsWith("model-telemetry.jsonl")).toBe(true);
    expect(p.includes("data/state") || p.includes("data\\state")).toBe(true);
  });

  it("setFilePath rejects empty string", () => {
    expect(() => modelTelemetryEngine.setFilePath("")).toThrow(/filePath/);
  });
});
