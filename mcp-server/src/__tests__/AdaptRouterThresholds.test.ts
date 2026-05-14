/**
 * AdaptRouterThresholds — INTEL-OLLAMA-OBSIDIAN-MS0 / P23-U02 tuner script tests
 *
 * Covers `runAdaptation()` exported from `scripts/adapt-router-thresholds.mjs`.
 * Verifies:
 *   - happy path: telemetry → decisions → log + state file
 *   - dry-run does NOT write
 *   - low-sample models are skipped (and prior state is preserved for them)
 *   - failureRate ≥ 0.20 → excludedFromSafety=true (demote-safety)
 *   - failureRate < 0.05 with prior excluded → restore-safety
 *   - effective latency P95 is always emitted
 *   - telemetry missing → graceful no-op (not failure)
 *   - rotated `.1` is read alongside live file
 *   - adaptation log is append-only, state file is atomic-overwrite (tmp+rename)
 */

import { describe, it, expect, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { runAdaptation } from "../../../scripts/adapt-router-thresholds.mjs";

const ownedDirs = new Set<string>();

function makeFixtureDir(label: string): {
  dir: string;
  telemetry: string;
  log: string;
  state: string;
} {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `prism-adapt-${label}-${process.pid}-`));
  ownedDirs.add(dir);
  return {
    dir,
    telemetry: path.join(dir, "model-telemetry.jsonl"),
    log: path.join(dir, "router-adaptation.jsonl"),
    state: path.join(dir, "router-adaptation-state.json"),
  };
}

function writeTelemetry(filePath: string, entries: Array<Record<string, unknown>>): void {
  fs.writeFileSync(filePath, entries.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf8");
}

function makeEntry(opts: {
  model: string;
  ts: string;
  latencyMs: number;
  outcome?: "ok" | "fail" | "timeout";
}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    ts: opts.ts,
    model: opts.model,
    promptTokens: 100,
    completionTokens: 50,
    latencyMs: opts.latencyMs,
    outcome: opts.outcome ?? "ok",
  };
}

afterEach(() => {
  for (const dir of ownedDirs) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
  ownedDirs.clear();
});

// ── HAPPY PATH ────────────────────────────────────────────────────────────

describe("runAdaptation — happy path", () => {
  it("emits effectiveLatencyMs from observed P95 for a healthy model", () => {
    const fx = makeFixtureDir("happy");
    const now = new Date("2026-05-13T00:00:00.000Z");
    const entries = [];
    for (let i = 0; i < 10; i++) {
      const ts = new Date(now.getTime() - (10 - i) * 60_000).toISOString();
      entries.push(makeEntry({ model: "ollama-7b", ts, latencyMs: 100 * (i + 1), outcome: "ok" }));
    }
    writeTelemetry(fx.telemetry, entries);

    const result = runAdaptation({
      now,
      telemetryPath: fx.telemetry,
      adaptationLogPath: fx.log,
      adaptationStatePath: fx.state,
    });

    expect(result.ok).toBe(true);
    expect(result.totalCalls).toBe(10);
    expect(result.modelsConsidered).toBe(1);
    expect(result.decisionsEmitted).toBe(1);

    // P95 for [100..1000] = 955 per Hyndman-Fan Type 7
    // (rank = 9 * 0.95 = 8.55 → 0.45*900 + 0.55*1000 = 955)
    expect(result.newState["ollama-7b"].effectiveLatencyMs).toBeCloseTo(955, 6);
    // failureRate=0 → no exclusion (concrete check: value is NOT true)
    expect(result.newState["ollama-7b"].excludedFromSafety === true).toBe(false);
    expect(result.decisions[0].action).toBe("update-latency");

    // Files were written (writes-enabled by default).
    expect(fs.existsSync(fx.log)).toBe(true);
    expect(fs.existsSync(fx.state)).toBe(true);
    const stateDoc = JSON.parse(fs.readFileSync(fx.state, "utf8"));
    expect(stateDoc.schemaVersion).toBe(1);
    expect(stateDoc.state["ollama-7b"].effectiveLatencyMs).toBeCloseTo(955, 6);
    // Atomicity check: no leftover .tmp.
    expect(fs.existsSync(fx.state + ".tmp")).toBe(false);
  });

  it("excludes a model from safety when failure rate ≥ 20%", () => {
    const fx = makeFixtureDir("demote");
    const now = new Date("2026-05-13T00:00:00.000Z");
    const entries = [];
    // 20 calls, 5 failures → 25% failure rate (≥ 20% threshold)
    for (let i = 0; i < 20; i++) {
      const ts = new Date(now.getTime() - (20 - i) * 60_000).toISOString();
      const outcome: "ok" | "fail" = i < 5 ? "fail" : "ok";
      entries.push(makeEntry({ model: "claude-haiku", ts, latencyMs: 800, outcome }));
    }
    writeTelemetry(fx.telemetry, entries);

    const result = runAdaptation({
      now,
      telemetryPath: fx.telemetry,
      adaptationLogPath: fx.log,
      adaptationStatePath: fx.state,
    });

    expect(result.ok).toBe(true);
    expect(result.newState["claude-haiku"].excludedFromSafety).toBe(true);
    expect(result.newState["claude-haiku"].reason).toMatch(/failure rate 25\.0%/);
    expect(result.decisions[0].action).toBe("demote-safety");
  });

  it("restores safety eligibility when failure rate falls below 5% after prior exclusion", () => {
    const fx = makeFixtureDir("restore");
    const now = new Date("2026-05-13T00:00:00.000Z");
    // Pre-seed state file: this model was previously excluded.
    fs.writeFileSync(fx.state, JSON.stringify({
      schemaVersion: 1,
      generatedAt: "2026-05-06T00:00:00.000Z",
      state: {
        "qwen2.5-coder:7b": {
          excludedFromSafety: true,
          reason: "failure rate 30% over 50 calls",
          effectiveLatencyMs: 1500,
          appliedAt: "2026-05-06T00:00:00.000Z",
        },
      },
    }, null, 2), "utf8");

    const entries = [];
    for (let i = 0; i < 30; i++) {
      const ts = new Date(now.getTime() - (30 - i) * 60_000).toISOString();
      entries.push(makeEntry({ model: "qwen2.5-coder:7b", ts, latencyMs: 900, outcome: "ok" }));
    }
    writeTelemetry(fx.telemetry, entries);

    const result = runAdaptation({
      now,
      telemetryPath: fx.telemetry,
      adaptationLogPath: fx.log,
      adaptationStatePath: fx.state,
    });

    expect(result.ok).toBe(true);
    const updated = result.newState["qwen2.5-coder:7b"];
    expect(updated.excludedFromSafety).toBe(false);
    expect(updated.reason).toMatch(/recovered/);
    expect(result.decisions[0].action).toBe("restore-safety");
  });

  it("keeps exclusion in the grey zone (failure rate between 5% and 20%)", () => {
    const fx = makeFixtureDir("greyzone");
    const now = new Date("2026-05-13T00:00:00.000Z");
    fs.writeFileSync(fx.state, JSON.stringify({
      schemaVersion: 1,
      generatedAt: "2026-05-06T00:00:00.000Z",
      state: { "grey-model": { excludedFromSafety: true, reason: "high failures last week" } },
    }, null, 2), "utf8");

    // 20 calls, 2 failures = 10% — between recovery (5%) and degradation (20%).
    const entries = [];
    for (let i = 0; i < 20; i++) {
      const ts = new Date(now.getTime() - (20 - i) * 60_000).toISOString();
      const outcome: "ok" | "fail" = i < 2 ? "fail" : "ok";
      entries.push(makeEntry({ model: "grey-model", ts, latencyMs: 1200, outcome }));
    }
    writeTelemetry(fx.telemetry, entries);

    const result = runAdaptation({
      now,
      telemetryPath: fx.telemetry,
      adaptationLogPath: fx.log,
      adaptationStatePath: fx.state,
    });

    expect(result.ok).toBe(true);
    expect(result.newState["grey-model"].excludedFromSafety).toBe(true);
    expect(result.decisions[0].action).toBe("keep-excluded");
  });
});

// ── DRY-RUN ───────────────────────────────────────────────────────────────

describe("runAdaptation — dry-run", () => {
  it("computes decisions but does NOT write log or state files", () => {
    const fx = makeFixtureDir("dryrun");
    const now = new Date("2026-05-13T00:00:00.000Z");
    const entries = [];
    for (let i = 0; i < 12; i++) {
      const ts = new Date(now.getTime() - (12 - i) * 60_000).toISOString();
      entries.push(makeEntry({ model: "m", ts, latencyMs: 500, outcome: "ok" }));
    }
    writeTelemetry(fx.telemetry, entries);

    const result = runAdaptation({
      now,
      dryRun: true,
      telemetryPath: fx.telemetry,
      adaptationLogPath: fx.log,
      adaptationStatePath: fx.state,
    });

    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.decisionsEmitted).toBe(1);
    expect(result.logsWritten).toBe(0);
    expect(fs.existsSync(fx.log)).toBe(false);
    expect(fs.existsSync(fx.state)).toBe(false);
  });
});

// ── LOW SAMPLES + EDGE CASES ──────────────────────────────────────────────

describe("runAdaptation — edge cases", () => {
  it("skips models with fewer than the minimum samples and preserves their prior state", () => {
    const fx = makeFixtureDir("lowsamp");
    const now = new Date("2026-05-13T00:00:00.000Z");
    fs.writeFileSync(fx.state, JSON.stringify({
      schemaVersion: 1,
      generatedAt: "2026-05-06T00:00:00.000Z",
      state: { "quiet-model": { effectiveLatencyMs: 2000, excludedFromSafety: false, reason: "stale entry" } },
    }, null, 2), "utf8");

    const entries = [];
    for (let i = 0; i < 3; i++) {
      const ts = new Date(now.getTime() - (3 - i) * 60_000).toISOString();
      entries.push(makeEntry({ model: "quiet-model", ts, latencyMs: 100, outcome: "ok" }));
    }
    writeTelemetry(fx.telemetry, entries);

    const result = runAdaptation({
      now,
      telemetryPath: fx.telemetry,
      adaptationLogPath: fx.log,
      adaptationStatePath: fx.state,
    });

    expect(result.ok).toBe(true);
    expect(result.modelsConsidered).toBe(1);
    expect(result.decisionsEmitted).toBe(1);
    expect(result.decisions[0].action).toBe("skip-low-samples");
    // Prior state is preserved (under-sampled doesn't wipe adaptations).
    expect(result.newState["quiet-model"].effectiveLatencyMs).toBe(2000);
    expect(result.newState["quiet-model"].excludedFromSafety).toBe(false);
  });

  it("returns a no-op success when telemetry file does not exist (and no .1 rotation either)", () => {
    const fx = makeFixtureDir("notelemetry");
    const result = runAdaptation({
      now: new Date("2026-05-13T00:00:00.000Z"),
      telemetryPath: fx.telemetry,
      adaptationLogPath: fx.log,
      adaptationStatePath: fx.state,
    });
    expect(result.ok).toBe(true);
    expect(result.totalCalls).toBe(0);
    expect(result.decisions).toEqual([]);
    expect(result.newState).toEqual({});
    expect(fs.existsSync(fx.log)).toBe(false);
    expect(fs.existsSync(fx.state)).toBe(false);
  });

  it("reads both rotated .1 and live JSONL together", () => {
    const fx = makeFixtureDir("rotated");
    const now = new Date("2026-05-13T00:00:00.000Z");

    const rotatedEntries = [];
    for (let i = 0; i < 6; i++) {
      const ts = new Date(now.getTime() - (60 + i) * 60_000).toISOString();
      rotatedEntries.push(makeEntry({ model: "m", ts, latencyMs: 1000, outcome: "ok" }));
    }
    writeTelemetry(fx.telemetry + ".1", rotatedEntries);

    const liveEntries = [];
    for (let i = 0; i < 6; i++) {
      const ts = new Date(now.getTime() - i * 60_000).toISOString();
      liveEntries.push(makeEntry({ model: "m", ts, latencyMs: 500, outcome: "ok" }));
    }
    writeTelemetry(fx.telemetry, liveEntries);

    const result = runAdaptation({
      now,
      telemetryPath: fx.telemetry,
      adaptationLogPath: fx.log,
      adaptationStatePath: fx.state,
    });
    expect(result.ok).toBe(true);
    expect(result.totalCalls).toBe(12);
    expect(result.decisionsEmitted).toBe(1);
    // sorted = [500x6, 1000x6]; rank = 11*0.95 = 10.45 → sorted[10]*0.55 + sorted[11]*0.45 = 1000*0.55+1000*0.45 = 1000
    expect(result.newState["m"].effectiveLatencyMs).toBeCloseTo(1000, 6);
  });

  it("skips telemetry entries outside the window", () => {
    const fx = makeFixtureDir("window");
    const now = new Date("2026-05-13T00:00:00.000Z");
    const entries = [];
    // 5 entries from 30 days ago (outside default 7-day window)
    for (let i = 0; i < 5; i++) {
      const ts = new Date(now.getTime() - (30 * 24 + i) * 3600_000).toISOString();
      entries.push(makeEntry({ model: "ancient", ts, latencyMs: 99999, outcome: "fail" }));
    }
    // 12 entries from today (inside window)
    for (let i = 0; i < 12; i++) {
      const ts = new Date(now.getTime() - i * 60_000).toISOString();
      entries.push(makeEntry({ model: "fresh", ts, latencyMs: 200, outcome: "ok" }));
    }
    writeTelemetry(fx.telemetry, entries);

    const result = runAdaptation({
      now,
      telemetryPath: fx.telemetry,
      adaptationLogPath: fx.log,
      adaptationStatePath: fx.state,
    });
    expect(result.ok).toBe(true);
    expect(result.totalCalls).toBe(12);
    expect(result.modelsConsidered).toBe(1);
    expect(Object.keys(result.newState)).toEqual(["fresh"]);
  });

  it("appends to existing adaptation log without truncating it", () => {
    const fx = makeFixtureDir("append");
    const now = new Date("2026-05-13T00:00:00.000Z");

    fs.writeFileSync(fx.log, JSON.stringify({
      ts: "2026-05-06T00:00:00.000Z",
      schemaVersion: 1,
      model: "prior-model",
      action: "demote-safety",
      reason: "historical record",
    }) + "\n", "utf8");

    const entries = [];
    for (let i = 0; i < 15; i++) {
      const ts = new Date(now.getTime() - i * 60_000).toISOString();
      entries.push(makeEntry({ model: "now-model", ts, latencyMs: 600, outcome: "ok" }));
    }
    writeTelemetry(fx.telemetry, entries);

    runAdaptation({
      now,
      telemetryPath: fx.telemetry,
      adaptationLogPath: fx.log,
      adaptationStatePath: fx.state,
    });

    const raw = fs.readFileSync(fx.log, "utf8");
    const lines = raw.split("\n").filter((l) => l.length > 0);
    expect(lines.length).toBe(2);
    const first = JSON.parse(lines[0]);
    expect(first.model).toBe("prior-model");
    const second = JSON.parse(lines[1]);
    expect(second.model).toBe("now-model");
    expect(second.action).toBe("update-latency");
  });
});

// ── ADVERSARIAL TELEMETRY (read-side robustness) ──────────────────────────

describe("runAdaptation — adversarial telemetry rows", () => {
  it("skips malformed JSONL lines and rows with invalid fields", () => {
    const fx = makeFixtureDir("adversarial");
    const now = new Date("2026-05-13T00:00:00.000Z");
    const validTs = new Date(now.getTime() - 60_000).toISOString();
    const goodEntries: Array<Record<string, unknown>> = [];
    for (let i = 0; i < 11; i++) {
      const ts = new Date(now.getTime() - (i + 1) * 60_000).toISOString();
      goodEntries.push(makeEntry({ model: "good", ts, latencyMs: 100, outcome: "ok" }));
    }
    const lines: string[] = goodEntries.map((e) => JSON.stringify(e));
    lines.push("this is not json at all");
    lines.push(JSON.stringify({ schemaVersion: 1, ts: validTs, model: "evil", promptTokens: 1, completionTokens: 1, latencyMs: "fast", outcome: "ok" }));
    lines.push(JSON.stringify({ schemaVersion: 1, ts: validTs, model: "evil", promptTokens: 1, completionTokens: 1, latencyMs: 100, outcome: "BAD" }));
    lines.push(JSON.stringify({ schemaVersion: 1, ts: "not-a-date", model: "evil", promptTokens: 1, completionTokens: 1, latencyMs: 100, outcome: "ok" }));
    lines.push("null");
    lines.push("[1,2,3]");
    fs.writeFileSync(fx.telemetry, lines.join("\n") + "\n", "utf8");

    const result = runAdaptation({
      now,
      telemetryPath: fx.telemetry,
      adaptationLogPath: fx.log,
      adaptationStatePath: fx.state,
    });
    expect(result.ok).toBe(true);
    expect(result.totalCalls).toBe(11);
    expect(Object.keys(result.newState)).toEqual(["good"]);
  });
});
