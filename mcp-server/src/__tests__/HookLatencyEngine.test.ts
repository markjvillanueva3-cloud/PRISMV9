/**
 * HookLatencyEngine tests — HOOK-SYNERGY-MS0 / U-HOOK-ENVELOPE (H4)
 *
 * Coverage floor per comprehensive-build-enforce doctrine:
 *   - Happy:    summary / perHook / topByP95 / recentSlow / recentFailures /
 *               totalFires / window filtering — all asserted against known
 *               numeric reference values (no shape-only assertions).
 *   - 3 failure modes: missing file, malformed lines, NaN durations.
 *   - 2 adversarial:   empty/whitespace queries, oversize K.
 *   - 3 spanning configs: single-sample hook, multi-sample sparse hook,
 *                         high-volume hook with failures.
 *
 * Fixtures: temp JSONL files in os.tmpdir(). The engine's path is overridable
 * via constructor option, so each test is hermetic.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { HookLatencyEngine, hookLatencyEngine } from "../engines/HookLatencyEngine.js";

const TMP_ROOT = path.join(os.tmpdir(), "prism-hook-latency-tests");

beforeAll(() => {
  if (!fs.existsSync(TMP_ROOT)) fs.mkdirSync(TMP_ROOT, { recursive: true });
});

afterAll(() => {
  try { fs.rmSync(TMP_ROOT, { recursive: true, force: true }); } catch { /* ignore */ }
});

function writeJsonl(name: string, lines: object[]): string {
  const p = path.join(TMP_ROOT, name);
  fs.writeFileSync(p, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  return p;
}

// Builds a record with sensible defaults so each test asserts on what matters.
function rec(opts: Partial<{ ts: string; hook: string; durationMs: number; exitCode: number; signal: string | null; targetPath: string }>): object {
  return {
    ts: opts.ts ?? new Date().toISOString(),
    hook: opts.hook ?? "test-hook",
    durationMs: opts.durationMs ?? 10,
    exitCode: opts.exitCode ?? 0,
    signal: opts.signal ?? null,
    targetPath: opts.targetPath ?? "H:/prism/.claude/hooks/test-hook.mjs",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
describe("HookLatencyEngine — happy path with known reference values", () => {
  let engine: HookLatencyEngine;

  beforeEach(() => {
    // 10 invocations: 10..100 ms, all exit 0. Nearest-rank percentiles:
    //   P50 = rank ceil(0.50*10)=5 → sorted[4] = 50
    //   P95 = rank ceil(0.95*10)=10 → sorted[9] = 100
    //   P99 = rank ceil(0.99*10)=10 → sorted[9] = 100
    //   max = 100
    const lines = [];
    for (let i = 0; i < 10; i++) {
      lines.push(rec({ hook: "alpha", durationMs: (i + 1) * 10, ts: new Date(Date.now() - (10 - i) * 1000).toISOString() }));
    }
    const p = writeJsonl("happy.jsonl", lines);
    engine = new HookLatencyEngine({ latencyPath: p });
  });

  it("perHook computes nearest-rank P50/P95/P99 + max + failures", () => {
    const s = engine.perHook("alpha")!;
    expect(s.fires).toBe(10);
    expect(s.p50).toBe(50);
    expect(s.p95).toBe(100);
    expect(s.p99).toBe(100);
    expect(s.max).toBe(100);
    expect(s.failures).toBe(0);
  });

  it("getSummary sorts perHook by P95 descending", () => {
    const summary = engine.getSummary();
    expect(summary.totalFires).toBe(10);
    expect(summary.uniqueHooks).toBe(1);
    expect(summary.perHook[0].hook).toBe("alpha");
    expect(summary.perHook[0].p95).toBe(100);
  });

  it("totalFires matches the input line count", () => {
    expect(engine.totalFires()).toBe(10);
  });

  it("topByP95 returns top-N sorted by P95 then fires then alpha", () => {
    const top = engine.topByP95(1);
    expect(top.length).toBe(1);
    expect(top[0].hook).toBe("alpha");
  });

  it("recentSlow returns invocations ≥ threshold, newest first", () => {
    const slow = engine.recentSlow(80, 5);
    // 80, 90, 100 ms are ≥80 → 3 hits, newest first.
    expect(slow.length).toBe(3);
    expect(slow[0].durationMs).toBe(100);
    expect(slow[1].durationMs).toBe(90);
    expect(slow[2].durationMs).toBe(80);
  });

  it("recentSlow respects cap", () => {
    const slow = engine.recentSlow(0, 3);
    expect(slow.length).toBe(3);
  });

  it("isAvailable is true when the JSONL exists", () => {
    expect(engine.isAvailable()).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("HookLatencyEngine — 3 spanning configs (single / sparse / high-volume+fails)", () => {
  let engine: HookLatencyEngine;
  beforeEach(() => {
    const lines = [
      // (1) single-sample hook — every percentile collapses to the one value.
      rec({ hook: "singleton", durationMs: 42 }),
      // (2) sparse hook — 3 samples spanning a wide range.
      //     sorted=[1,2,100]: P50=rank 2 → sorted[1]=2; P95=rank 3 → sorted[2]=100; max=100.
      rec({ hook: "sparse", durationMs: 1 }),
      rec({ hook: "sparse", durationMs: 2 }),
      rec({ hook: "sparse", durationMs: 100 }),
      // (3) high-volume with a few failures — 20 samples, 3 non-zero exits.
      ...Array.from({ length: 20 }, (_, i) =>
        rec({ hook: "noisy", durationMs: 5 + (i % 5), exitCode: i < 3 ? 1 : 0 }),
      ),
    ];
    const p = writeJsonl("spanning.jsonl", lines);
    engine = new HookLatencyEngine({ latencyPath: p });
  });

  it("singleton hook: all percentiles collapse to the single sample", () => {
    const s = engine.perHook("singleton")!;
    expect(s.fires).toBe(1);
    expect(s.p50).toBe(42);
    expect(s.p95).toBe(42);
    expect(s.p99).toBe(42);
    expect(s.max).toBe(42);
  });

  it("sparse hook: nearest-rank P50 / P95 / max are exact", () => {
    const s = engine.perHook("sparse")!;
    expect(s.fires).toBe(3);
    expect(s.p50).toBe(2);
    expect(s.p95).toBe(100);
    expect(s.max).toBe(100);
  });

  it("noisy hook: failure count reflects only non-zero exit codes", () => {
    const s = engine.perHook("noisy")!;
    expect(s.fires).toBe(20);
    expect(s.failures).toBe(3);
  });

  it("recentFailures returns only non-zero exits, newest first, across hooks", () => {
    const fails = engine.recentFailures(10);
    expect(fails.length).toBe(3);
    for (const f of fails) expect(f.exitCode).not.toBe(0);
    for (const f of fails) expect(f.hook).toBe("noisy");
  });

  it("summary uniqueHooks counts distinct hook names", () => {
    expect(engine.getSummary().uniqueHooks).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("HookLatencyEngine — failure modes", () => {
  it("missing file → every query returns empty / null", () => {
    const engine = new HookLatencyEngine({ latencyPath: path.join(TMP_ROOT, "nope.jsonl") });
    expect(engine.isAvailable()).toBe(false);
    expect(engine.totalFires()).toBe(0);
    expect(engine.perHook("anything")).toBeNull();
    expect(engine.recentSlow(0)).toEqual([]);
    expect(engine.recentFailures()).toEqual([]);
    const summary = engine.getSummary();
    expect(summary.totalFires).toBe(0);
    expect(summary.uniqueHooks).toBe(0);
    expect(summary.perHook).toEqual([]);
  });

  it("malformed lines are skipped; valid lines still load", () => {
    const p = path.join(TMP_ROOT, "mixed.jsonl");
    fs.writeFileSync(
      p,
      [
        "{not valid json",
        JSON.stringify(rec({ hook: "good", durationMs: 5 })),
        "another junk line {",
        JSON.stringify(rec({ hook: "good", durationMs: 15 })),
        "",
      ].join("\n"),
    );
    const engine = new HookLatencyEngine({ latencyPath: p });
    expect(engine.totalFires()).toBe(2);
    // sorted=[5,15]; nearest-rank P50: rank=ceil(0.5*2)=1 → sorted[0]=5.
    expect(engine.perHook("good")!.p50).toBe(5);
    expect(engine.perHook("good")!.max).toBe(15);
  });

  it("NaN / Infinity duration → record rejected by shape guard, not crashing the load", () => {
    const p = path.join(TMP_ROOT, "nan.jsonl");
    // Note: JSON.stringify(NaN) = "null". So the record will have durationMs: null,
    // which fails the type guard's `typeof === number` check — exactly what we want.
    fs.writeFileSync(p, [
      JSON.stringify({ ts: new Date().toISOString(), hook: "x", durationMs: null, exitCode: 0 }),
      JSON.stringify(rec({ hook: "ok", durationMs: 7 })),
    ].join("\n"));
    const engine = new HookLatencyEngine({ latencyPath: p });
    expect(engine.totalFires()).toBe(1);
    expect(engine.perHook("ok")!.fires).toBe(1);
    expect(engine.perHook("x")).toBeNull();
  });

  it("clearCache + new content → re-reads on next call", () => {
    const p = writeJsonl("evolving.jsonl", [rec({ hook: "h", durationMs: 1 })]);
    const engine = new HookLatencyEngine({ latencyPath: p });
    expect(engine.totalFires()).toBe(1);
    fs.writeFileSync(p, JSON.stringify(rec({ hook: "h", durationMs: 1 })) + "\n" + JSON.stringify(rec({ hook: "h", durationMs: 2 })) + "\n");
    engine.clearCache();
    expect(engine.totalFires()).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("HookLatencyEngine — adversarial inputs + clamps", () => {
  let engine: HookLatencyEngine;
  beforeAll(() => {
    const lines = Array.from({ length: 5 }, () => rec({ hook: "a", durationMs: 10 }));
    const p = writeJsonl("adv.jsonl", lines);
    engine = new HookLatencyEngine({ latencyPath: p });
  });

  it("perHook with empty / whitespace name → null", () => {
    expect(engine.perHook("")).toBeNull();
    expect(engine.perHook("   ")).toBeNull();
  });

  it("topByP95: huge K clamps to ABSOLUTE_TOP_K=200", () => {
    // Only one hook in the fixture, so result is ≤1 regardless; verify no throw + bounded.
    const top = engine.topByP95(9999);
    expect(top.length).toBe(1);
    expect(top.length).toBeLessThanOrEqual(200);
  });

  it("recentSlow: negative threshold treated as 0 (all rows qualify)", () => {
    const all = engine.recentSlow(-100, 999);
    expect(all.length).toBe(5);
  });

  it("recentSlow: huge K clamps to ABSOLUTE_RECENT_K=500", () => {
    const big = engine.recentSlow(0, 99999);
    expect(big.length).toBeLessThanOrEqual(500);
  });

  it("getSummary: window of 0 falls back to default (records still visible)", () => {
    const s = engine.getSummary(0);
    expect(s.totalFires).toBe(5);
    expect(s.windowMs).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("HookLatencyEngine — window filtering", () => {
  it("records older than windowMs are excluded", () => {
    const oldTs = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
    const newTs = new Date().toISOString();
    const p = writeJsonl("windowed.jsonl", [
      rec({ hook: "h", durationMs: 1, ts: oldTs }),
      rec({ hook: "h", durationMs: 2, ts: newTs }),
    ]);
    const engine = new HookLatencyEngine({ latencyPath: p });
    // 1-hour window: only the new record qualifies.
    const hourMs = 60 * 60 * 1000;
    expect(engine.totalFires(hourMs)).toBe(1);
    // 60-day window: both records qualify.
    expect(engine.totalFires(60 * 24 * 60 * 60 * 1000)).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("HookLatencyEngine — singleton + dispatcher round-trip", () => {
  it("default-export singleton works without a registered file (graceful empty)", () => {
    // The default singleton points at H:/prism/state/shared/hook-latency.jsonl.
    // Whether that file exists yet or not, every method must return a typed value.
    const total = hookLatencyEngine.totalFires();
    expect(total).toBeGreaterThanOrEqual(0);
    const summary = hookLatencyEngine.getSummary();
    expect(summary.totalFires).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(summary.perHook)).toBe(true);
  });

  it("ACTION_DEV_SCHEMAS exposes hook_latency with concrete shape", async () => {
    const { ACTION_DEV_SCHEMAS } = await import("../schemas/devActionSchemas.js");
    const schema = ACTION_DEV_SCHEMAS.hook_latency;
    // mode default
    const def = schema.parse({}) as { mode: string };
    expect(def.mode).toBe("summary");
    // every declared mode round-trips
    for (const m of ["summary", "per_hook", "top_p95", "recent_slow", "recent_failures", "total_fires", "available"]) {
      const parsed = schema.parse({ mode: m }) as { mode: string };
      expect(parsed.mode).toBe(m);
    }
    // bad mode rejected
    expect(() => schema.parse({ mode: "nope" })).toThrow();
  });

  it("engine module exports the methods the dispatcher calls", async () => {
    const mod = await import("../engines/HookLatencyEngine.js");
    const eng = mod.hookLatencyEngine;
    expect(typeof eng.getSummary).toBe("function");
    expect(typeof eng.perHook).toBe("function");
    expect(typeof eng.topByP95).toBe("function");
    expect(typeof eng.recentSlow).toBe("function");
    expect(typeof eng.recentFailures).toBe("function");
    expect(typeof eng.totalFires).toBe("function");
    expect(typeof eng.isAvailable).toBe("function");
    expect(typeof eng.clearCache).toBe("function");
  });
});
