/**
 * ConsensusModelPerformanceEngine — INTEL-OLLAMA-OBSIDIAN-MS0 / U-CODEX-COORD-FIX.
 *
 * Verifies the performance-weighted vendor selector for the multi-model
 * consensus pool: cold-start safety, EMA-based ranking, drop threshold +
 * floor, observation update math, atomic save, and graceful state load.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ConsensusModelPerformanceEngine, type PerformanceState } from "../engines/ConsensusModelPerformanceEngine.js";

function tmpFile(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-perf-"));
  return path.join(dir, "state.json");
}

describe("ConsensusModelPerformanceEngine", () => {
  let stateFile: string;
  const engine = new ConsensusModelPerformanceEngine();

  beforeEach(() => { stateFile = tmpFile(); });
  afterEach(() => {
    try { fs.rmSync(path.dirname(stateFile), { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it("loadState returns empty default when file is missing", () => {
    const r = engine.loadState("/no/such/perf.json");
    expect(r.schemaVersion).toBe("1.0.0");
    expect(r.vendors).toEqual({});
  });

  it("loadState returns empty default on malformed JSON (fail-open)", () => {
    fs.writeFileSync(stateFile, "{garbage", "utf-8");
    const r = engine.loadState(stateFile);
    expect(r.vendors).toEqual({});
  });

  it("loadState ignores files where vendors field is missing or wrong type", () => {
    fs.writeFileSync(stateFile, JSON.stringify({ schemaVersion: "1.0.0", vendors: "not an object" }), "utf-8");
    expect(engine.loadState(stateFile).vendors).toEqual({});
  });

  it("recommendVendors keeps everyone when all vendors hit cold-start (ema=0.5)", () => {
    const state = engine.empty();
    const r = engine.recommendVendors(state, "build", ["anthropic", "openai", "google"]);
    expect(r.ranked.map((v) => v.vendor).sort()).toEqual(["anthropic", "google", "openai"]);
    expect(r.dropped).toEqual([]);
    for (const v of r.ranked) expect(v.ema).toBe(0.5);
  });

  it("recommendVendors drops vendors below threshold while preserving floor=2", () => {
    const state: PerformanceState = {
      schemaVersion: "1.0.0",
      vendors: {
        anthropic: { tasks: { build: { ema: 0.9, n: 10 } } },
        openai:    { tasks: { build: { ema: 0.8, n: 10 } } },
        google:    { tasks: { build: { ema: 0.05, n: 10 } } },
        xai:       { tasks: { build: { ema: 0.10, n: 10 } } },
      },
    };
    const r = engine.recommendVendors(state, "build", ["anthropic", "openai", "google", "xai"], { floor: 2, dropThreshold: 0.3 });
    expect(r.ranked.map((v) => v.vendor)).toEqual(["anthropic", "openai"]);
    expect(r.dropped.map((v) => v.vendor).sort()).toEqual(["google", "xai"]);
  });

  it("recommendVendors floor=2 forces top-2 even if both are below threshold", () => {
    const state: PerformanceState = {
      schemaVersion: "1.0.0",
      vendors: {
        anthropic: { tasks: { x: { ema: 0.10, n: 10 } } },
        openai:    { tasks: { x: { ema: 0.05, n: 10 } } },
        google:    { tasks: { x: { ema: 0.02, n: 10 } } },
      },
    };
    const r = engine.recommendVendors(state, "x", ["anthropic", "openai", "google"], { floor: 2, dropThreshold: 0.3 });
    expect(r.ranked.map((v) => v.vendor)).toEqual(["anthropic", "openai"]);
    expect(r.dropped.map((v) => v.vendor)).toEqual(["google"]);
  });

  it("recommendVendors sorts by ema descending — variability across 4 vendors", () => {
    const state: PerformanceState = {
      schemaVersion: "1.0.0",
      vendors: {
        a: { tasks: { t: { ema: 0.4, n: 5 } } },
        b: { tasks: { t: { ema: 0.9, n: 5 } } },
        c: { tasks: { t: { ema: 0.7, n: 5 } } },
        d: { tasks: { t: { ema: 0.5, n: 5 } } },
      },
    };
    const r = engine.recommendVendors(state, "t", ["a", "b", "c", "d"], { floor: 4, dropThreshold: 0.0 });
    expect(r.ranked.map((v) => v.vendor)).toEqual(["b", "c", "d", "a"]);
    expect(r.ranked[0].ema).toBe(0.9);
    expect(r.ranked[3].ema).toBe(0.4);
  });

  it("applyObservation seeds EMA with first reward (n=0 path)", () => {
    const next = engine.applyObservation(engine.empty(), "anthropic", "build", 0.85);
    expect(next.vendors.anthropic.tasks.build.ema).toBe(0.85);
    expect(next.vendors.anthropic.tasks.build.n).toBe(1);
    expect(next.vendors.anthropic.tasks.build.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("applyObservation EMA math: alpha=0.2, prev=0.5, reward=1.0 → 0.6", () => {
    const seed = engine.applyObservation(engine.empty(), "v1", "t", 0.5);
    const next = engine.applyObservation(seed, "v1", "t", 1.0, 0.2);
    expect(next.vendors.v1.tasks.t.ema).toBeCloseTo(0.6, 5);
    expect(next.vendors.v1.tasks.t.n).toBe(2);
  });

  it("applyObservation rejects out-of-range reward", () => {
    expect(() => engine.applyObservation(engine.empty(), "v", "t", 1.5)).toThrow(/reward/);
    expect(() => engine.applyObservation(engine.empty(), "v", "t", -0.1)).toThrow(/reward/);
    expect(() => engine.applyObservation(engine.empty(), "v", "t", Number.NaN)).toThrow(/reward/);
  });

  it("applyObservation rejects out-of-range alpha", () => {
    expect(() => engine.applyObservation(engine.empty(), "v", "t", 0.5, 0)).toThrow(/alpha/);
    expect(() => engine.applyObservation(engine.empty(), "v", "t", 0.5, 1)).toThrow(/alpha/);
    expect(() => engine.applyObservation(engine.empty(), "v", "t", 0.5, -0.1)).toThrow(/alpha/);
  });

  it("applyObservation does not mutate the input state", () => {
    const orig = engine.empty();
    const snapshot = JSON.stringify(orig);
    engine.applyObservation(orig, "v1", "t", 0.5);
    expect(JSON.stringify(orig)).toBe(snapshot);
  });

  it("saveState + loadState round-trip preserves data", () => {
    const state = engine.applyObservation(engine.empty(), "anthropic", "build", 0.9);
    engine.saveState(state, stateFile);
    expect(fs.existsSync(stateFile)).toBe(true);
    const loaded = engine.loadState(stateFile);
    expect(loaded.vendors.anthropic.tasks.build.ema).toBeCloseTo(0.9, 5);
    expect(loaded.vendors.anthropic.tasks.build.n).toBe(1);
  });

  it("saveState handles atomic rename when file already exists", () => {
    const a = engine.applyObservation(engine.empty(), "v1", "t", 0.5);
    engine.saveState(a, stateFile);
    const b = engine.applyObservation(a, "v1", "t", 1.0);
    engine.saveState(b, stateFile); // rewrite path
    const loaded = engine.loadState(stateFile);
    expect(loaded.vendors.v1.tasks.t.n).toBe(2);
  });

  it("recommendVendors result envelope includes floor and taskType", () => {
    const r = engine.recommendVendors(engine.empty(), "build", ["a", "b"], { floor: 2 });
    expect(r.floor).toBe(2);
    expect(r.taskType).toBe("build");
  });

  it("vendor-with-no-task-data falls back to cold-start ema=0.5", () => {
    const state: PerformanceState = {
      schemaVersion: "1.0.0",
      vendors: { anthropic: { tasks: { other_task: { ema: 0.9, n: 5 } } } },
    };
    const r = engine.recommendVendors(state, "build", ["anthropic"], { floor: 1 });
    expect(r.ranked[0].ema).toBe(0.5);
    expect(r.ranked[0].n).toBe(0);
  });
});
