/**
 * ModelTelemetryEngine — INTEL-OLLAMA-OBSIDIAN-MS0 / P23-U01 round-trip + adversarial tests
 *
 * Coverage floor (per comprehensive-build-enforce):
 *   - happy path: round-trip log → read → stats
 *   - ≥3 failure modes: malformed JSONL, bad Zod input, sentinel-path throw
 *   - ≥2 adversarial inputs: string-typed numeric, negative/non-int counts, unparseable ts
 *   - ≥3 spanning configs: 3 distinct backends (ollama / anthropic / openai),
 *     3 distinct outcomes (ok / fail / timeout)
 *
 * Reference values come from manual percentile + failure-rate computation,
 * not from re-invoking the engine. See per-test JSDoc for derivations.
 */

import { describe, it, expect, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  ModelTelemetryEngine,
  modelTelemetryEngine,
  UNRESOLVED_JSONL_SENTINEL,
  type ModelTelemetryEntry,
  type ModelStats,
} from "../engines/ModelTelemetryEngine.js";

// ── helpers ────────────────────────────────────────────────────────────────

/**
 * Paths created by `makeEngine` in this file are tracked here. `afterEach`
 * only deletes paths in this set — NOT a tmpdir-wide scan keyed by pid.
 *
 * Vitest threaded mode shares `process.pid` between worker threads of the
 * same run, so a pid-based scan would let one test's `afterEach` delete a
 * concurrent test's live JSONL. Tracking the exact paths we created
 * isolates cleanup to this file's tests only.
 */
const ownedPaths = new Set<string>();

function tempPath(label: string): string {
  const p = path.join(
    os.tmpdir(),
    `prism-model-telemetry-${label}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jsonl`,
  );
  ownedPaths.add(p);
  return p;
}

function makeEngine(opts: { jsonlPath?: string; now?: Date; maxBytes?: number } = {}): {
  engine: ModelTelemetryEngine;
  jsonlPath: string;
  setNow: (d: Date) => void;
} {
  const jsonlPath = opts.jsonlPath ?? tempPath("test");
  // Caller-provided paths are also tracked so cleanup catches them.
  if (opts.jsonlPath) ownedPaths.add(opts.jsonlPath);
  let current = opts.now ?? new Date("2026-05-13T00:00:00.000Z");
  const engine = new ModelTelemetryEngine({
    jsonlPath,
    nowFn: () => current,
    maxJsonlBytes: opts.maxBytes,
  });
  return { engine, jsonlPath, setNow: (d) => { current = d; } };
}

function requireStats(stats: { byModel: Record<string, ModelStats> }, model: string): ModelStats {
  const m = stats.byModel[model];
  if (!m) throw new Error(`Expected stats for model '${model}' but byModel had keys: ${Object.keys(stats.byModel).join(", ")}`);
  return m;
}

// ── HAPPY PATH ────────────────────────────────────────────────────────────

describe("ModelTelemetryEngine — happy path", () => {
  it("logs one call and reads it back round-trip", () => {
    const { engine, jsonlPath } = makeEngine();
    const entry = engine.logCall({
      model: "qwen2.5-coder:7b",
      backend: "ollama",
      taskKind: "code",
      promptTokens: 1200,
      completionTokens: 480,
      latencyMs: 950,
    });

    expect(entry.schemaVersion).toBe(1);
    expect(entry.outcome).toBe("ok");
    expect(entry.model).toBe("qwen2.5-coder:7b");
    expect(entry.ts).toBe("2026-05-13T00:00:00.000Z");
    expect(entry.backend).toBe("ollama");
    expect(entry.taskKind).toBe("code");
    expect(entry.promptTokens).toBe(1200);
    expect(entry.completionTokens).toBe(480);
    expect(entry.latencyMs).toBe(950);

    const calls = engine.getRecentCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual(entry);

    // Disk readback: optional fields (backend / taskKind / errorBrief) must
    // survive JSON.stringify round-trip. A future regression where the
    // appended record loses a field would pass an in-memory `entry`
    // comparison but break this assertion.
    const onDisk = JSON.parse(fs.readFileSync(jsonlPath, "utf8").trim());
    expect(onDisk.backend).toBe("ollama");
    expect(onDisk.taskKind).toBe("code");
    expect(onDisk.model).toBe("qwen2.5-coder:7b");
    expect(onDisk.promptTokens).toBe(1200);
    expect(onDisk.completionTokens).toBe(480);
    expect(onDisk.latencyMs).toBe(950);
    expect(onDisk.outcome).toBe("ok");
    expect(onDisk.schemaVersion).toBe(1);
    expect(onDisk.ts).toBe("2026-05-13T00:00:00.000Z");

    engine.reset();
    expect(fs.existsSync(jsonlPath)).toBe(false);
  });

  it("persists optional errorBrief field across JSON.stringify (regression guard)", () => {
    const { engine, jsonlPath } = makeEngine();
    engine.logCall({
      model: "m",
      promptTokens: 1,
      completionTokens: 1,
      latencyMs: 1,
      outcome: "fail",
      errorBrief: "connection refused at 127.0.0.1:11434",
    });
    const onDisk = JSON.parse(fs.readFileSync(jsonlPath, "utf8").trim());
    expect(onDisk.errorBrief).toBe("connection refused at 127.0.0.1:11434");
    expect(onDisk.outcome).toBe("fail");
    engine.reset();
  });

  it("stamps schemaVersion=1 on every persisted record", () => {
    const { engine, jsonlPath } = makeEngine();
    engine.logCall({ model: "m", promptTokens: 1, completionTokens: 1, latencyMs: 1 });
    engine.logCall({ model: "m", promptTokens: 2, completionTokens: 2, latencyMs: 2 });
    const raw = fs.readFileSync(jsonlPath, "utf8").trim().split("\n");
    expect(raw).toHaveLength(2);
    const versions = raw.map((line) => JSON.parse(line).schemaVersion);
    expect(versions).toEqual([1, 1]);
    engine.reset();
  });

  it("returns entries oldest→newest, regardless of when within ts spread", () => {
    const { engine, setNow } = makeEngine();
    setNow(new Date("2026-01-01T00:00:00.000Z"));
    engine.logCall({ model: "a", promptTokens: 1, completionTokens: 1, latencyMs: 1 });
    setNow(new Date("2026-02-01T00:00:00.000Z"));
    engine.logCall({ model: "b", promptTokens: 1, completionTokens: 1, latencyMs: 1 });
    setNow(new Date("2026-03-01T00:00:00.000Z"));
    engine.logCall({ model: "c", promptTokens: 1, completionTokens: 1, latencyMs: 1 });

    const calls = engine.getRecentCalls();
    expect(calls.map((e) => e.model)).toEqual(["a", "b", "c"]);
    engine.reset();
  });

  it("filters by model and by limit (latest-N)", () => {
    const { engine, setNow } = makeEngine();
    for (let i = 0; i < 5; i++) {
      setNow(new Date(2026, 0, 1, 0, i));
      engine.logCall({
        model: i % 2 === 0 ? "even" : "odd",
        promptTokens: i,
        completionTokens: i,
        latencyMs: 100 * (i + 1),
      });
    }
    expect(engine.getRecentCalls({ model: "even" }).map((e) => e.latencyMs)).toEqual([100, 300, 500]);
    expect(engine.getRecentCalls({ model: "odd" }).map((e) => e.latencyMs)).toEqual([200, 400]);
    expect(engine.getRecentCalls({ limit: 2 }).map((e) => e.latencyMs)).toEqual([400, 500]);
    engine.reset();
  });

  it("filters by windowMs against injected clock", () => {
    const { engine, setNow } = makeEngine();
    setNow(new Date("2026-05-01T00:00:00.000Z"));
    engine.logCall({ model: "old", promptTokens: 1, completionTokens: 1, latencyMs: 100 });
    setNow(new Date("2026-05-13T00:00:00.000Z"));
    engine.logCall({ model: "new", promptTokens: 1, completionTokens: 1, latencyMs: 100 });
    // "now" = 2026-05-13 00:00, window = 24h → only "new" inside
    const oneDay = 24 * 60 * 60 * 1000;
    const recent = engine.getRecentCalls({ windowMs: oneDay });
    expect(recent.map((e) => e.model)).toEqual(["new"]);
    engine.reset();
  });
});

// ── STATS — REAL REFERENCE VALUES ────────────────────────────────────────

describe("ModelTelemetryEngine — getStats", () => {
  it("computes P50/P95/max + failure-rate against hand-derived references", () => {
    const { engine, setNow } = makeEngine();
    // Reference set for model "ollama-7b": latencies [100,200,300,400,500,600,700,800,900,1000]
    // Hyndman-Fan Type 7:
    //   P50 = (n-1)*0.5 = 4.5 → sorted[4]*0.5 + sorted[5]*0.5 = 500*0.5+600*0.5 = 550
    //   P95 = 9*0.95   = 8.55 → sorted[8]*0.45 + sorted[9]*0.55 = 900*0.45+1000*0.55 = 405 + 550 = 955
    //   max = 1000
    // 2 failures out of 10 → failureRate = 0.2
    const latencies = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    for (let i = 0; i < latencies.length; i++) {
      setNow(new Date(2026, 0, 1, 0, i));
      engine.logCall({
        model: "ollama-7b",
        promptTokens: 100,
        completionTokens: 50,
        latencyMs: latencies[i],
        // 2 of 10 are failures (indices 3 and 7)
        outcome: i === 3 ? "fail" : i === 7 ? "timeout" : "ok",
      });
    }

    const stats = engine.getStats();
    expect(stats.totalCalls).toBe(10);
    expect(stats.windowMs).toBe(0); // "no temporal filter" sentinel

    const m = requireStats(stats, "ollama-7b");
    expect(m.calls).toBe(10);
    expect(m.failures).toBe(2);
    expect(m.failureRate).toBeCloseTo(0.2, 10);
    expect(m.latencyP50Ms).toBeCloseTo(550, 6);
    expect(m.latencyP95Ms).toBeCloseTo(955, 6);
    expect(m.latencyMaxMs).toBe(1000);
    expect(m.avgPromptTokens).toBe(100);
    expect(m.avgCompletionTokens).toBe(50);
    expect(m.firstSeen.startsWith("2026-01-01T")).toBe(true);
    expect(m.lastSeen.startsWith("2026-01-01T")).toBe(true);

    engine.reset();
  });

  it("returns windowMs=0 sentinel so result round-trips through JSON.stringify", () => {
    const { engine } = makeEngine();
    engine.logCall({ model: "x", promptTokens: 1, completionTokens: 1, latencyMs: 1 });
    const stats = engine.getStats();
    const round = JSON.parse(JSON.stringify(stats));
    expect(round.windowMs).toBe(0);
    expect(round.totalCalls).toBe(1);
    engine.reset();
  });

  it("groups stats by model across 3 spanning backends + 3 spanning outcomes", () => {
    const { engine, setNow } = makeEngine();
    const fixtures: Array<{ model: string; backend: string; latencyMs: number; outcome: "ok" | "fail" | "timeout" }> = [
      { model: "qwen2.5-coder:7b",   backend: "ollama",    latencyMs: 1100, outcome: "ok" },
      { model: "qwen2.5-coder:7b",   backend: "ollama",    latencyMs:  900, outcome: "ok" },
      { model: "claude-sonnet-4-6",  backend: "anthropic", latencyMs: 1800, outcome: "ok" },
      { model: "claude-sonnet-4-6",  backend: "anthropic", latencyMs: 2200, outcome: "fail" },
      { model: "gpt-5-codex",        backend: "openai",    latencyMs: 2400, outcome: "timeout" },
    ];
    for (let i = 0; i < fixtures.length; i++) {
      setNow(new Date(2026, 0, 1, 0, i));
      engine.logCall({
        model: fixtures[i].model,
        backend: fixtures[i].backend,
        promptTokens: 100,
        completionTokens: 50,
        latencyMs: fixtures[i].latencyMs,
        outcome: fixtures[i].outcome,
      });
    }
    const stats = engine.getStats();
    expect(Object.keys(stats.byModel).sort()).toEqual([
      "claude-sonnet-4-6",
      "gpt-5-codex",
      "qwen2.5-coder:7b",
    ]);
    expect(requireStats(stats, "qwen2.5-coder:7b").failureRate).toBe(0);
    expect(requireStats(stats, "claude-sonnet-4-6").failureRate).toBeCloseTo(0.5, 10);
    expect(requireStats(stats, "gpt-5-codex").failureRate).toBe(1);
    // Per-model latency P50 verification for the 2-entry ollama group.
    // sorted = [900, 1100]; Hyndman-Fan Type 7: rank = (2-1)*0.5 = 0.5;
    // result = sorted[0]*(1-0.5) + sorted[1]*0.5 = 900*0.5 + 1100*0.5 = 1000
    expect(requireStats(stats, "qwen2.5-coder:7b").latencyP50Ms).toBeCloseTo(1000, 6);
    engine.reset();
  });

  it("handles single-entry and future-window inputs with exact return values", () => {
    const { engine, setNow } = makeEngine();
    setNow(new Date("2026-01-01T00:00:00.000Z"));
    engine.logCall({ model: "lonely", promptTokens: 5, completionTokens: 7, latencyMs: 42 });
    const stats = engine.getStats();
    expect(stats.totalCalls).toBe(1);
    const lonely = requireStats(stats, "lonely");
    expect(lonely.latencyP50Ms).toBe(42);
    expect(lonely.latencyP95Ms).toBe(42);
    expect(lonely.latencyMaxMs).toBe(42);
    expect(lonely.failures).toBe(0);

    // Window pointing into the future → empty stats with concrete return shape.
    setNow(new Date("2026-06-01T00:00:00.000Z"));
    const futureStats = engine.getStats({ windowMs: 1000 }); // 1 sec window, last entry months old
    expect(futureStats.totalCalls).toBe(0);
    expect(Object.keys(futureStats.byModel)).toEqual([]);
    expect(futureStats.windowMs).toBe(1000);
    engine.reset();
  });
});

// ── FAILURE MODES ─────────────────────────────────────────────────────────

describe("ModelTelemetryEngine — failure modes", () => {
  it("throws on negative promptTokens via Zod (boundary failure mode)", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.logCall({ model: "m", promptTokens: -1, completionTokens: 0, latencyMs: 100 }),
    ).toThrow();
    engine.reset();
  });

  it("throws on NaN / Infinity latency (resource-exhaustion boundary)", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.logCall({ model: "m", promptTokens: 0, completionTokens: 0, latencyMs: Number.NaN }),
    ).toThrow();
    expect(() =>
      engine.logCall({ model: "m", promptTokens: 0, completionTokens: 0, latencyMs: Number.POSITIVE_INFINITY }),
    ).toThrow();
    engine.reset();
  });

  it("throws on empty model id (zero-length string boundary)", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.logCall({ model: "", promptTokens: 1, completionTokens: 1, latencyMs: 1 }),
    ).toThrow();
    engine.reset();
  });

  it("tolerates malformed JSONL lines (mid-write crash recovery)", () => {
    const { engine, jsonlPath, setNow } = makeEngine();
    setNow(new Date("2026-01-01T00:00:00.000Z"));
    engine.logCall({ model: "good1", promptTokens: 1, completionTokens: 1, latencyMs: 100 });
    // Simulate a mid-write crash: append a partial line, no newline.
    fs.appendFileSync(jsonlPath, '{"model":"corrupt","ts":"2026-01-01T00:00:01.', "utf8");
    fs.appendFileSync(jsonlPath, "\n", "utf8");
    setNow(new Date("2026-01-01T00:00:02.000Z"));
    engine.logCall({ model: "good2", promptTokens: 1, completionTokens: 1, latencyMs: 200 });
    const calls = engine.getRecentCalls();
    expect(calls.map((e) => e.model)).toEqual(["good1", "good2"]);
    engine.reset();
  });

  it("throws a descriptive error when ensureDir is called with the sentinel path", () => {
    // Drive the sentinel path in directly (vitest workers can't process.chdir).
    // This is the exact value the resolver returns when no mcp-server anchor
    // is found and PRISM_MODEL_TELEMETRY_PATH is unset.
    const eng = new ModelTelemetryEngine({ jsonlPath: UNRESOLVED_JSONL_SENTINEL });
    expect(eng.getStorePath()).toBe(UNRESOLVED_JSONL_SENTINEL);
    expect(() =>
      eng.logCall({ model: "x", promptTokens: 0, completionTokens: 0, latencyMs: 1 }),
    ).toThrow(/PRISM_MODEL_TELEMETRY_PATH/);
    // reset() must NOT throw on the sentinel (it no-ops because the sentinel-named file doesn't exist).
    expect(() => eng.reset()).not.toThrow();
  });

  it("empty-string jsonlPath in constructor falls back to default resolver (no cryptic ENOENT)", () => {
    // The constructor must NOT accept "" as a literal path — that would later
    // produce path.dirname("") === "." and write into a random cwd. Instead it
    // must trigger the default resolver. In the test env, the resolver finds
    // the project's mcp-server tree, so getStorePath() returns a real path
    // (not the empty string, not the sentinel).
    //
    // ⚠ DO NOT call `eng.logCall(...)` in this test. The resolver lands on
    //   the canonical production JSONL (mcp-server/data/state/model-telemetry.jsonl)
    //   and writes would corrupt live telemetry for any running PRISM fleet
    //   process. Only `getStorePath()` (read-only) is safe here.
    const eng = new ModelTelemetryEngine({ jsonlPath: "" });
    const resolved = eng.getStorePath();
    expect(resolved.length).toBeGreaterThan(0);
    expect(resolved).not.toBe("");
    // We don't assert the exact path — in the test env it points at the real
    // project JSONL. The contract: empty-string was NOT silently accepted.
  });
});

// ── ADVERSARIAL INPUTS (coerceEntry on read path) ─────────────────────────

describe("ModelTelemetryEngine — adversarial JSONL lines", () => {
  it("skips lines with string-typed numeric fields without corrupting math", () => {
    const { engine, jsonlPath } = makeEngine();
    engine.logCall({ model: "good", promptTokens: 10, completionTokens: 20, latencyMs: 100 });
    // Hand-edited line with latencyMs as a string — must not corrupt percentile math.
    fs.appendFileSync(
      jsonlPath,
      JSON.stringify({
        schemaVersion: 1,
        ts: "2026-01-02T00:00:00.000Z",
        model: "evil",
        promptTokens: 1,
        completionTokens: 1,
        latencyMs: "fast",
        outcome: "ok",
      }) + "\n",
      "utf8",
    );
    const calls = engine.getRecentCalls();
    expect(calls.map((e) => e.model)).toEqual(["good"]); // evil entry skipped
    const stats = engine.getStats();
    expect(Object.keys(stats.byModel).sort()).toEqual(["good"]);
    expect(requireStats(stats, "good").latencyP50Ms).toBe(100);
    engine.reset();
  });

  it("skips lines with non-enum outcome, NaN/Infinity numerics, negative/non-int counts, unparseable ts", () => {
    const { engine, jsonlPath } = makeEngine();
    engine.logCall({ model: "good", promptTokens: 1, completionTokens: 1, latencyMs: 1 });
    const adversarial: Array<Record<string, unknown>> = [
      { schemaVersion: 1, ts: "2026-01-01T00:00:00.000Z", model: "m", promptTokens: 1, completionTokens: 1, latencyMs: 1, outcome: "success" }, // wrong enum literal
      { schemaVersion: 1, ts: "2026-01-01T00:00:00.000Z", model: "m", promptTokens: 1, completionTokens: 1, latencyMs: 1, outcome: "OK" },      // case mismatch
      { schemaVersion: 1, ts: "2026-01-01T00:00:00.000Z", model: "m", promptTokens: Number.NaN, completionTokens: 1, latencyMs: 1, outcome: "ok" },
      { schemaVersion: 1, ts: "2026-01-01T00:00:00.000Z", model: "m", promptTokens: 1, completionTokens: Number.POSITIVE_INFINITY, latencyMs: 1, outcome: "ok" },
      { schemaVersion: 1, ts: "2026-01-01T00:00:00.000Z", model: "m", promptTokens: -5, completionTokens: 1, latencyMs: 1, outcome: "ok" },     // negative count
      { schemaVersion: 1, ts: "2026-01-01T00:00:00.000Z", model: "m", promptTokens: 3.7, completionTokens: 1, latencyMs: 1, outcome: "ok" },    // non-integer count
      { schemaVersion: 1, ts: "not-a-date",               model: "m", promptTokens: 1, completionTokens: 1, latencyMs: 1, outcome: "ok" },     // unparseable ts
    ];
    for (const a of adversarial) {
      fs.appendFileSync(jsonlPath, JSON.stringify(a) + "\n", "utf8");
    }
    const calls = engine.getRecentCalls();
    expect(calls.map((e) => e.model)).toEqual(["good"]);
    engine.reset();
  });

  it("skips a JSONL line whose value is an array / null / primitive (not an object)", () => {
    const { engine, jsonlPath } = makeEngine();
    engine.logCall({ model: "good", promptTokens: 1, completionTokens: 1, latencyMs: 1 });
    fs.appendFileSync(jsonlPath, "[1,2,3]\n", "utf8");
    fs.appendFileSync(jsonlPath, "null\n", "utf8");
    fs.appendFileSync(jsonlPath, "42\n", "utf8");
    fs.appendFileSync(jsonlPath, '"string"\n', "utf8");
    const calls = engine.getRecentCalls();
    expect(calls.map((e) => e.model)).toEqual(["good"]);
    engine.reset();
  });
});

// ── PURGE ATOMICITY + ROTATION VISIBILITY ─────────────────────────────────

describe("ModelTelemetryEngine — purge + rotation", () => {
  it("purgeOlderThan removes only entries older than cutoff and preserves malformed lines", () => {
    const { engine, jsonlPath, setNow } = makeEngine();
    setNow(new Date("2026-01-01T00:00:00.000Z"));
    engine.logCall({ model: "old", promptTokens: 1, completionTokens: 1, latencyMs: 1 });
    setNow(new Date("2026-05-13T00:00:00.000Z"));
    engine.logCall({ model: "new", promptTokens: 1, completionTokens: 1, latencyMs: 1 });
    // Hand-add a malformed line that must survive purge.
    fs.appendFileSync(jsonlPath, "this is not json at all\n", "utf8");

    // Purge entries older than 7 days from "now" (2026-05-13).
    const removed = engine.purgeOlderThan(7 * 24 * 60 * 60 * 1000);
    expect(removed).toBe(1); // only the "old" entry

    const calls = engine.getRecentCalls();
    expect(calls.map((e) => e.model)).toEqual(["new"]);

    // Malformed line still on disk (round-trips through purge).
    const raw = fs.readFileSync(jsonlPath, "utf8");
    expect(raw.includes("this is not json at all")).toBe(true);

    engine.reset();
  });

  it("uses tmp + rename so purge is crash-safe (no .tmp leftover after success)", () => {
    const { engine, jsonlPath } = makeEngine();
    engine.logCall({ model: "x", promptTokens: 1, completionTokens: 1, latencyMs: 1 });
    engine.purgeOlderThan(1000); // window 1s — nothing to remove with fresh entry, but exercises the write path
    expect(fs.existsSync(jsonlPath + ".tmp")).toBe(false);
    expect(fs.existsSync(jsonlPath)).toBe(true);
    engine.reset();
  });

  it("getRecentCalls merges the rotated .1 file with the live file in oldest→newest order", () => {
    const jsonlPath = tempPath("rotation");
    // Manually create a rotated-tail file with one entry.
    const rotatedEntry: ModelTelemetryEntry = {
      schemaVersion: 1,
      ts: "2026-01-01T00:00:00.000Z",
      model: "rotated",
      promptTokens: 1,
      completionTokens: 1,
      latencyMs: 50,
      outcome: "ok",
    };
    fs.mkdirSync(path.dirname(jsonlPath), { recursive: true });
    fs.writeFileSync(jsonlPath + ".1", JSON.stringify(rotatedEntry) + "\n", "utf8");

    const { engine, setNow } = makeEngine({ jsonlPath });
    setNow(new Date("2026-05-01T00:00:00.000Z"));
    engine.logCall({ model: "live", promptTokens: 1, completionTokens: 1, latencyMs: 100 });

    const calls = engine.getRecentCalls();
    expect(calls.map((e) => e.model)).toEqual(["rotated", "live"]); // .1 first, then live

    // Stats should see both entries grouped per-model.
    const stats = engine.getStats();
    expect(stats.totalCalls).toBe(2);
    expect(Object.keys(stats.byModel).sort()).toEqual(["live", "rotated"]);

    engine.reset();
    expect(fs.existsSync(jsonlPath + ".1")).toBe(false);
  });

  it("triggers rotation when maxJsonlBytes is exceeded, and the rotated tail stays readable via .1 merge", () => {
    // Sized so all 6 "fill" entries fit under the cap, the 7th write
    // triggers exactly one rotation. Each fill entry serializes to
    // ~165 bytes including the errorBrief pad → 6 entries ≈ 1000B < 1500B cap.
    const { engine, jsonlPath, setNow } = makeEngine({ maxBytes: 1500 });
    setNow(new Date("2026-01-01T00:00:00.000Z"));
    for (let i = 0; i < 6; i++) {
      setNow(new Date(2026, 0, 1, 0, i));
      engine.logCall({
        model: "fill",
        promptTokens: 100,
        completionTokens: 50,
        latencyMs: 100,
        errorBrief: "x".repeat(40),
      });
    }
    // At this point live is ~1000 bytes (under 1500 cap). The next logCall
    // checks size BEFORE append, sees the 6-entry live file is still under
    // cap on the read, then appends fill #7 — pushing it over. The NEXT
    // logCall (after-rotate) is what rotates.
    setNow(new Date(2026, 0, 1, 0, 6));
    engine.logCall({
      model: "fill",
      promptTokens: 100,
      completionTokens: 50,
      latencyMs: 100,
      errorBrief: "x".repeat(40),
    });
    // Now live is ~1200 bytes; still under 1500. Pad once more to cross.
    setNow(new Date(2026, 0, 1, 0, 7));
    engine.logCall({
      model: "fill",
      promptTokens: 100,
      completionTokens: 50,
      latencyMs: 100,
      errorBrief: "x".repeat(40),
    });
    // Now live is over cap. The next call rotates.
    setNow(new Date(2026, 0, 1, 0, 99));
    engine.logCall({ model: "after-rotate", promptTokens: 1, completionTokens: 1, latencyMs: 1 });

    // Strong assertions — must catch buggy rotation implementations:
    expect(fs.existsSync(jsonlPath + ".1")).toBe(true);
    // The rotated tail must be non-empty (catches a buggy rename that
    // created an empty .1 then re-wrote everything to live).
    const rotatedRaw = fs.readFileSync(jsonlPath + ".1", "utf8");
    expect(rotatedRaw.length).toBeGreaterThan(0);
    const rotatedLines = rotatedRaw.split(/\r?\n/).filter((l) => l.length > 0);
    // The rotated file holds the 8 "fill" entries (no chain rotation since
    // only one rotation cycle fires at this cap).
    expect(rotatedLines.length).toBe(8);
    for (const line of rotatedLines) {
      const r = JSON.parse(line);
      expect(r.model).toBe("fill");
      expect(r.schemaVersion).toBe(1);
    }

    // Live file holds only the post-rotate entry.
    const liveRaw = fs.readFileSync(jsonlPath, "utf8");
    const liveLines = liveRaw.split(/\r?\n/).filter((l) => l.length > 0);
    expect(liveLines.length).toBe(1);
    const liveParsed = JSON.parse(liveLines[0]);
    expect(liveParsed.model).toBe("after-rotate");

    // getRecentCalls merges both files. 8 fills + 1 after-rotate = 9 total.
    const calls = engine.getRecentCalls();
    expect(calls.length).toBe(9);
    expect(calls[calls.length - 1].model).toBe("after-rotate");
    const fillCount = calls.filter((e) => e.model === "fill").length;
    expect(fillCount).toBe(8);

    engine.reset();
  });

  it("rejects negative / Infinity / NaN olderThanMs in purgeOlderThan", () => {
    const { engine } = makeEngine();
    expect(() => engine.purgeOlderThan(-1)).toThrow(/invalid olderThanMs/);
    expect(() => engine.purgeOlderThan(Number.POSITIVE_INFINITY)).toThrow(/invalid olderThanMs/);
    expect(() => engine.purgeOlderThan(Number.NaN)).toThrow(/invalid olderThanMs/);
    engine.reset();
  });
});

// ── SINGLETON ────────────────────────────────────────────────────────────

describe("ModelTelemetryEngine — singleton + schemaVersion", () => {
  it("exposes static schemaVersion exactly 1", () => {
    expect(ModelTelemetryEngine.schemaVersion).toBe(1);
  });

  it("singleton getStorePath() returns a string ending in 'model-telemetry.jsonl' OR the unresolved sentinel", () => {
    const p = modelTelemetryEngine.getStorePath();
    const isCanonical = p.endsWith("model-telemetry.jsonl");
    const isUnresolved = p === "<UNRESOLVED:PRISM_MODEL_TELEMETRY_PATH>";
    expect(isCanonical || isUnresolved).toBe(true);
  });

  it("singleton can construct another engine via the same class and round-trip a record", () => {
    // Behavioral check: confirm the singleton's class still produces a working engine.
    const eng = new ModelTelemetryEngine({ jsonlPath: tempPath("singleton") });
    const written = eng.logCall({
      model: "round-trip-check",
      promptTokens: 7,
      completionTokens: 11,
      latencyMs: 13,
    });
    const read = eng.getRecentCalls();
    expect(read).toHaveLength(1);
    expect(read[0].model).toBe("round-trip-check");
    expect(read[0].latencyMs).toBe(13);
    expect(read[0].schemaVersion).toBe(written.schemaVersion);
    eng.reset();
  });
});

// ── CLEANUP ─────────────────────────────────────────────────────────────

afterEach(() => {
  // Cleanup is scoped to paths this file's makeEngine() created. NEVER scan
  // the broader tmpdir — vitest threaded mode shares pid, and a tmpdir scan
  // would race against concurrent test files reading/writing their own
  // JSONL stores in the same directory.
  for (const p of ownedPaths) {
    for (const suffix of ["", ".1", ".tmp"]) {
      const target = p + suffix;
      try { if (fs.existsSync(target)) fs.unlinkSync(target); } catch { /* ignore */ }
    }
  }
  ownedPaths.clear();
});
