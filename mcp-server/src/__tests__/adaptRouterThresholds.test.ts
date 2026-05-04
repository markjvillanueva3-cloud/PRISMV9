/**
 * adapt-router-thresholds.mjs smoke + decision tests.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / P23-U02.
 *
 * Spawns the script with a synthesized telemetry JSONL and asserts the
 * decision log + thresholds.json output. Avoids touching the real
 * data/state/ files by running the script with cwd=tmpDir, which makes
 * its `path.resolve(...)` calls land in the tmp tree.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

const SCRIPT_PATH = path.resolve(__dirname, "../../../scripts/adapt-router-thresholds.mjs");

interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

let tmpDir: string;
let stateDir: string;
let telemetryFile: string;
let thresholdsFile: string;
let adaptationLog: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "prism-adapt-"));
  stateDir = path.join(tmpDir, "mcp-server", "data", "state");
  await fs.mkdir(stateDir, { recursive: true });
  telemetryFile = path.join(stateDir, "model-telemetry.jsonl");
  thresholdsFile = path.join(stateDir, "router-thresholds.json");
  adaptationLog = path.join(stateDir, "router-adaptation.jsonl");
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function runScript(args: string[] = []): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [SCRIPT_PATH, ...args], { cwd: tmpDir });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => { stdout += c; });
    child.stderr.on("data", (c) => { stderr += c; });
    child.on("error", reject);
    child.on("exit", (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

function callRecord(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    ts: new Date().toISOString(),
    model: "deepseek-r1:14b",
    tier: 3,
    outcome: "ok",
    latencyMs: 4000,
    promptTokens: 200,
    completionTokens: 800,
    ...overrides,
  });
}

describe("adapt-router-thresholds — empty telemetry", () => {
  it("exits 0 with no-change when telemetry file is missing", async () => {
    const r = await runScript();
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("no-change");
    expect(r.stdout).toContain("large=3000");
    expect(r.stdout).toContain("complex=6000");
  });

  it("appends an adaptation log entry even on no-change", async () => {
    await runScript();
    const log = await fs.readFile(adaptationLog, "utf-8");
    const lines = log.trim().split("\n");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry.changed).toBe(false);
    expect(entry.sampleSize).toBe(0);
    expect(entry.before).toEqual({ largeContextTokens: 3000, complexContextTokens: 6000 });
    expect(entry.after).toEqual({ largeContextTokens: 3000, complexContextTokens: 6000 });
  });

  it("does NOT write thresholds.json when no change", async () => {
    await runScript();
    const exists = await fs.access(thresholdsFile).then(() => true, () => false);
    expect(exists).toBe(false);
  });
});

describe("adapt-router-thresholds — Rule A (tier-3 latency demote)", () => {
  beforeEach(async () => {
    // 10 tier-3 calls all with 9000ms latency → p95=9000 > 7000 trigger
    const lines: string[] = [];
    for (let i = 0; i < 10; i++) {
      lines.push(callRecord({ latencyMs: 9000 }));
    }
    await fs.writeFile(telemetryFile, lines.join("\n") + "\n");
  });

  it("raises complexContextTokens by 20% (3000→3600 large stays, 6000→7200 complex)", async () => {
    const r = await runScript();
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("ADJUSTED");
    expect(r.stdout).toContain("large=3000");
    expect(r.stdout).toContain("complex=7200");
  });

  it("writes new thresholds to router-thresholds.json", async () => {
    await runScript();
    const j = JSON.parse(await fs.readFile(thresholdsFile, "utf-8"));
    expect(j).toEqual({ largeContextTokens: 3000, complexContextTokens: 7200 });
  });

  it("dry-run does NOT write thresholds.json or adaptation log", async () => {
    const r = await runScript(["--dry-run"]);
    expect(r.code).toBe(0);
    const tExists = await fs.access(thresholdsFile).then(() => true, () => false);
    const lExists = await fs.access(adaptationLog).then(() => true, () => false);
    expect(tExists).toBe(false);
    expect(lExists).toBe(false);
  });

  it("dry-run prints the JSON adjustment to stdout", async () => {
    const r = await runScript(["--dry-run"]);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.changed).toBe(true);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.after.complexContextTokens).toBe(7200);
    expect(parsed.rationale).toContain(parsed.rationale.find((s: string) => s.includes("p95")));
  });
});

describe("adapt-router-thresholds — Rule B (tier-3 unreliable)", () => {
  it("raises complex when tier-3 success rate is below 80%", async () => {
    // 5 ok + 5 errors = success 0.5 → trigger
    const lines: string[] = [];
    for (let i = 0; i < 5; i++) lines.push(callRecord({ outcome: "ok" }));
    for (let i = 0; i < 5; i++) lines.push(callRecord({ outcome: "error", latencyMs: 1000 }));
    await fs.writeFile(telemetryFile, lines.join("\n") + "\n");

    const r = await runScript();
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("ADJUSTED");
    expect(r.stdout).toContain("complex=7200");
  });
});

describe("adapt-router-thresholds — Rule C (tier-2 unreliable)", () => {
  it("lowers large when tier-2 success rate is below 85%", async () => {
    // 5 ok + 1 error tier-2 = success ~0.83 → trigger; tier-3 healthy
    const lines: string[] = [];
    for (let i = 0; i < 5; i++) {
      lines.push(JSON.stringify({
        ts: new Date().toISOString(),
        model: "qwen2.5-coder:14b", tier: 2, outcome: "ok",
        latencyMs: 1500, promptTokens: 100, completionTokens: 60,
      }));
    }
    lines.push(JSON.stringify({
      ts: new Date().toISOString(),
      model: "qwen2.5-coder:14b", tier: 2, outcome: "error",
      latencyMs: 2000, promptTokens: 100, completionTokens: 0,
    }));
    await fs.writeFile(telemetryFile, lines.join("\n") + "\n");

    const r = await runScript();
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("ADJUSTED");
    expect(r.stdout).toContain("large=2400"); // 3000 * 0.8
  });
});

describe("adapt-router-thresholds — bounds + invariants", () => {
  it("does not move thresholds when tier-3 has fewer than 5 samples", async () => {
    // only 3 slow tier-3 calls — sub-threshold sample size
    const lines: string[] = [];
    for (let i = 0; i < 3; i++) lines.push(callRecord({ latencyMs: 30000 }));
    await fs.writeFile(telemetryFile, lines.join("\n") + "\n");

    const r = await runScript();
    expect(r.stdout).toContain("no-change");
  });

  it("preserves invariant complex>large when both rules push toward each other", async () => {
    // Stack rule A (raises complex) + rule C (lowers large) — verify post still satisfies invariant
    const lines: string[] = [];
    for (let i = 0; i < 10; i++) lines.push(callRecord({ latencyMs: 9000 })); // rule A
    for (let i = 0; i < 5; i++) {
      lines.push(JSON.stringify({
        ts: new Date().toISOString(),
        model: "qwen2.5-coder:14b", tier: 2, outcome: "ok",
        latencyMs: 1500, promptTokens: 100, completionTokens: 60,
      }));
    }
    lines.push(JSON.stringify({
      ts: new Date().toISOString(),
      model: "qwen2.5-coder:14b", tier: 2, outcome: "error",
      latencyMs: 2000, promptTokens: 100, completionTokens: 0,
    }));
    await fs.writeFile(telemetryFile, lines.join("\n") + "\n");

    const r = await runScript();
    expect(r.code).toBe(0);
    const j = JSON.parse(await fs.readFile(thresholdsFile, "utf-8"));
    expect(j.complexContextTokens).toBeGreaterThan(j.largeContextTokens);
    expect(j.largeContextTokens).toBe(2400);
    expect(j.complexContextTokens).toBe(7200);
  });
});

describe("adapt-router-thresholds — windowDays argument", () => {
  it("--windowDays=14 includes records from 10 days ago", async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const lines: string[] = [];
    for (let i = 0; i < 10; i++) lines.push(callRecord({ ts: tenDaysAgo, latencyMs: 9000 }));
    await fs.writeFile(telemetryFile, lines.join("\n") + "\n");

    // Default 7-day window: records are out of range → no-change
    const r7 = await runScript();
    expect(r7.stdout).toContain("no-change");

    // 14-day window: records inside → ADJUSTED
    const r14 = await runScript(["--windowDays=14"]);
    expect(r14.stdout).toContain("ADJUSTED");
  });

  it("rejects non-positive --windowDays", async () => {
    const r = await runScript(["--windowDays=0"]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("windowDays");
  });
});
