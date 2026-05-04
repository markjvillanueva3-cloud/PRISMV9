/**
 * ConsensusCoordinatorEngine — concurrency, cache, budget, rate-limit tests.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / AUTO-CONSENSUS.
 *
 * MultiModelConsensusEngine.ask is mocked so we can drive the coordinator
 * deterministically. State files (cache, inflight, budget) are written to a
 * tmp dir per test by overriding STATE_DIR via env var? Actually, paths are
 * hard-coded — so we use vi.spyOn(fs.promises, ...) approach OR the simpler
 * dedicated cleanup-on-each-test pattern.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  ConsensusCoordinatorEngine,
  type CoordinatorRequest,
} from "../engines/ConsensusCoordinatorEngine.js";
import { multiModelConsensusEngine, type ConsensusResult } from "../engines/MultiModelConsensusEngine.js";

const STATE_DIR = "H:/prism/mcp-server/data/state";
const CACHE_FILE = path.join(STATE_DIR, "consensus-cache.jsonl");
const INFLIGHT_FILE = path.join(STATE_DIR, "consensus-inflight.json");
const BUDGET_FILE = path.join(STATE_DIR, "consensus-budget.json");

const mkResult = (override: Partial<ConsensusResult> = {}): ConsensusResult => ({
  ok: true,
  mode: "compare",
  responses: [
    { model: "claude",   vendor: "anthropic", ok: true, answer: "the answer", latencyMs: 1000, tokens: 500,  error: null },
    { model: "gpt-5.5",  vendor: "openai",    ok: true, answer: "the answer", latencyMs: 1500, tokens: 1500, error: null },
    { model: "deepseek-r1:14b", vendor: "ollama", ok: true, answer: "the answer", latencyMs: 2000, tokens: null, error: null },
  ],
  successCount: 3,
  agreementScore: 1,
  consensus: { answer: "the answer", voters: ["claude", "gpt-5.5", "deepseek-r1:14b"], confidence: 1 },
  recommendation: "accept",
  totalLatencyMs: 2100,
  factCheck: {},
  ...override,
});

let engine: ConsensusCoordinatorEngine;

beforeEach(async () => {
  engine = new ConsensusCoordinatorEngine();
  await engine.resetForTesting();
  vi.restoreAllMocks();
});

afterEach(async () => {
  await engine.resetForTesting();
  vi.restoreAllMocks();
});

describe("ConsensusCoordinatorEngine — validation", () => {
  it("returns validation-error on missing prompt", async () => {
    const r = await engine.run({ taskType: "plan", terminalId: "t1" } as unknown as CoordinatorRequest);
    expect(r.kind).toBe("validation-error");
  });

  it("returns validation-error on missing terminalId", async () => {
    const r = await engine.run({ prompt: "x", taskType: "plan" } as unknown as CoordinatorRequest);
    expect(r.kind).toBe("validation-error");
  });

  it("returns validation-error on missing taskType", async () => {
    const r = await engine.run({ prompt: "x", terminalId: "t1" } as unknown as CoordinatorRequest);
    expect(r.kind).toBe("validation-error");
  });
});

describe("ConsensusCoordinatorEngine — fresh path + token bookkeeping", () => {
  it("invokes underlying consensus on cache miss + tracks token cost", async () => {
    const ask = vi.spyOn(multiModelConsensusEngine, "ask").mockResolvedValue(mkResult());

    const r = await engine.run({ prompt: "Plan the migration", taskType: "plan", terminalId: "term-1" });
    expect(r.kind).toBe("fresh");
    if (r.kind !== "fresh") return;
    expect(ask).toHaveBeenCalledOnce();
    // claude 500 + gpt 1500 + ollama 0 = 2000 reported
    expect(r.tokenCostEstimate).toBe(2000);
  });

  it("uses 5000-token fallback when no model reports tokens", async () => {
    vi.spyOn(multiModelConsensusEngine, "ask").mockResolvedValue(mkResult({
      responses: [
        { model: "x", vendor: "ollama", ok: true, answer: "a", latencyMs: 1, tokens: null, error: null },
      ],
    }));
    const r = await engine.run({ prompt: "Plan", taskType: "plan", terminalId: "term-1" });
    expect(r.kind).toBe("fresh");
    if (r.kind !== "fresh") return;
    expect(r.tokenCostEstimate).toBe(5000);
  });

  it("appends a cache entry after fresh call", async () => {
    vi.spyOn(multiModelConsensusEngine, "ask").mockResolvedValue(mkResult());
    await engine.run({ prompt: "Plan migration X", taskType: "plan", terminalId: "term-1" });
    const raw = await fs.readFile(CACHE_FILE, "utf-8");
    const lines = raw.trim().split("\n");
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry.taskType).toBe("plan");
    expect(typeof entry.hash).toBe("string");
    expect(entry.result.ok).toBe(true);
  });

  it("removes inflight entry after call completes", async () => {
    vi.spyOn(multiModelConsensusEngine, "ask").mockResolvedValue(mkResult());
    await engine.run({ prompt: "Plan migration", taskType: "plan", terminalId: "term-1" });
    const stats = await engine.getStats();
    expect(stats.inflight).toEqual([]);
  });

  it("removes inflight entry even when underlying ask throws", async () => {
    vi.spyOn(multiModelConsensusEngine, "ask").mockRejectedValue(new Error("boom"));
    await expect(engine.run({ prompt: "Plan", taskType: "plan", terminalId: "term-1" })).rejects.toThrow(/boom/);
    const stats = await engine.getStats();
    expect(stats.inflight).toEqual([]);
  });
});

describe("ConsensusCoordinatorEngine — cache", () => {
  it("returns cache-hit on second identical request", async () => {
    const ask = vi.spyOn(multiModelConsensusEngine, "ask").mockResolvedValue(mkResult());
    await engine.run({ prompt: "Plan the migration", taskType: "plan", terminalId: "term-1" });
    const r2 = await engine.run({ prompt: "Plan the migration", taskType: "plan", terminalId: "term-2" });
    expect(r2.kind).toBe("cache-hit");
    if (r2.kind !== "cache-hit") return;
    expect(r2.result.consensus?.answer).toBe("the answer");
    expect(ask).toHaveBeenCalledOnce(); // not called twice
  });

  it("different taskType bypasses cache (same prompt, different task)", async () => {
    const ask = vi.spyOn(multiModelConsensusEngine, "ask").mockResolvedValue(mkResult());
    await engine.run({ prompt: "Plan the migration", taskType: "plan", terminalId: "term-1" });
    await engine.run({ prompt: "Plan the migration", taskType: "review", terminalId: "term-1" });
    expect(ask).toHaveBeenCalledTimes(2);
  });

  it("bypassCache=true forces a fresh call", async () => {
    const ask = vi.spyOn(multiModelConsensusEngine, "ask").mockResolvedValue(mkResult());
    await engine.run({ prompt: "Plan", taskType: "plan", terminalId: "term-1" });
    await engine.run({ prompt: "Plan", taskType: "plan", terminalId: "term-1", bypassCache: true });
    expect(ask).toHaveBeenCalledTimes(2);
  });

  it("expired cache entries (TTL exceeded) trigger a fresh call", async () => {
    const ask = vi.spyOn(multiModelConsensusEngine, "ask").mockResolvedValue(mkResult());
    // First call with 1ms TTL — entry is immediately expired
    await engine.run({ prompt: "Plan", taskType: "plan", terminalId: "term-1", cacheTtlMs: 1 });
    // wait a tick
    await new Promise((res) => setTimeout(res, 5));
    await engine.run({ prompt: "Plan", taskType: "plan", terminalId: "term-1", cacheTtlMs: 1 });
    expect(ask).toHaveBeenCalledTimes(2);
  });

  it("peekCache returns null when no entry exists", async () => {
    const r = await engine.peekCache("nothing here", "plan");
    expect(r).toBeNull();
  });

  it("peekCache returns the latest entry when one exists", async () => {
    vi.spyOn(multiModelConsensusEngine, "ask").mockResolvedValue(mkResult());
    await engine.run({ prompt: "Plan migration X", taskType: "plan", terminalId: "term-1" });
    const peek = await engine.peekCache("Plan migration X", "plan");
    expect(peek).not.toBeNull();
    expect(peek!.result.ok).toBe(true);
  });
});

describe("ConsensusCoordinatorEngine — per-terminal rate limit", () => {
  it("blocks a second request from the same terminal while the first is in flight", async () => {
    // Plant an in-flight entry directly
    await fs.mkdir(STATE_DIR, { recursive: true });
    await fs.writeFile(INFLIGHT_FILE, JSON.stringify([
      { terminalId: "term-1", hash: "stale", startedAt: Date.now() },
    ], null, 2));

    const r = await engine.run({ prompt: "Plan", taskType: "plan", terminalId: "term-1" });
    expect(r.kind).toBe("rate-limited");
    if (r.kind !== "rate-limited") return;
    expect(r.reason).toContain("term-1");
    expect(r.retryAfterMs).toBe(5000);
  });

  it("allows a fresh request from a different terminal even when peer is in flight", async () => {
    await fs.mkdir(STATE_DIR, { recursive: true });
    await fs.writeFile(INFLIGHT_FILE, JSON.stringify([
      { terminalId: "term-1", hash: "x", startedAt: Date.now() },
    ], null, 2));

    vi.spyOn(multiModelConsensusEngine, "ask").mockResolvedValue(mkResult());
    const r = await engine.run({ prompt: "Plan", taskType: "plan", terminalId: "term-2" });
    expect(r.kind).toBe("fresh");
  });

  it("treats an inflight entry older than 120s as dead and proceeds", async () => {
    await fs.mkdir(STATE_DIR, { recursive: true });
    await fs.writeFile(INFLIGHT_FILE, JSON.stringify([
      { terminalId: "term-1", hash: "ancient", startedAt: Date.now() - 200_000 },
    ], null, 2));

    vi.spyOn(multiModelConsensusEngine, "ask").mockResolvedValue(mkResult());
    const r = await engine.run({ prompt: "Plan", taskType: "plan", terminalId: "term-1" });
    expect(r.kind).toBe("fresh");
  });
});

describe("ConsensusCoordinatorEngine — global rate limit (6-terminal cap)", () => {
  it("blocks a 4th simultaneous in-flight request even from a fresh terminal", async () => {
    await fs.mkdir(STATE_DIR, { recursive: true });
    const now = Date.now();
    await fs.writeFile(INFLIGHT_FILE, JSON.stringify([
      { terminalId: "t-a", hash: "1", startedAt: now },
      { terminalId: "t-b", hash: "2", startedAt: now },
      { terminalId: "t-c", hash: "3", startedAt: now },
    ], null, 2));

    const r = await engine.run({ prompt: "Plan", taskType: "plan", terminalId: "t-d" });
    expect(r.kind).toBe("rate-limited");
    if (r.kind !== "rate-limited") return;
    expect(r.reason).toContain("global in-flight cap");
    expect(r.retryAfterMs).toBe(10000);
  });

  it("allows a 3rd request when only 2 are in flight", async () => {
    await fs.mkdir(STATE_DIR, { recursive: true });
    const now = Date.now();
    await fs.writeFile(INFLIGHT_FILE, JSON.stringify([
      { terminalId: "t-a", hash: "1", startedAt: now },
      { terminalId: "t-b", hash: "2", startedAt: now },
    ], null, 2));

    vi.spyOn(multiModelConsensusEngine, "ask").mockResolvedValue(mkResult());
    const r = await engine.run({ prompt: "Plan", taskType: "plan", terminalId: "t-c" });
    expect(r.kind).toBe("fresh");
  });
});

describe("ConsensusCoordinatorEngine — daily token budget", () => {
  it("rejects fan-out when daily budget is exhausted", async () => {
    const today = new Date().toISOString().slice(0, 10);
    await fs.mkdir(STATE_DIR, { recursive: true });
    await fs.writeFile(BUDGET_FILE, JSON.stringify({ dayKey: today, tokensUsed: 500_000 }, null, 2));

    const r = await engine.run({ prompt: "Plan", taskType: "plan", terminalId: "term-1" });
    expect(r.kind).toBe("budget-exceeded");
    if (r.kind !== "budget-exceeded") return;
    expect(r.usedToday).toBe(500_000);
    expect(r.budget).toBe(500_000);
  });

  it("budget is per-day — yesterday's usage doesn't block today", async () => {
    await fs.mkdir(STATE_DIR, { recursive: true });
    await fs.writeFile(BUDGET_FILE, JSON.stringify({ dayKey: "2026-01-01", tokensUsed: 999_999 }, null, 2));

    vi.spyOn(multiModelConsensusEngine, "ask").mockResolvedValue(mkResult());
    const r = await engine.run({ prompt: "Plan", taskType: "plan", terminalId: "term-1" });
    expect(r.kind).toBe("fresh");
  });

  it("budget bumps after a successful fresh call", async () => {
    vi.spyOn(multiModelConsensusEngine, "ask").mockResolvedValue(mkResult());
    await engine.run({ prompt: "Plan", taskType: "plan", terminalId: "term-1" });
    const stats = await engine.getStats();
    // claude 500 + gpt 1500 + ollama 0 = 2000
    expect(stats.budget.tokensUsed).toBe(2000);
  });

  it("budget accumulates across multiple calls in the same day", async () => {
    vi.spyOn(multiModelConsensusEngine, "ask").mockResolvedValue(mkResult());
    await engine.run({ prompt: "Plan A", taskType: "plan", terminalId: "term-1" });
    await engine.run({ prompt: "Plan B", taskType: "plan", terminalId: "term-1" });
    const stats = await engine.getStats();
    expect(stats.budget.tokensUsed).toBe(4000);
  });
});

describe("ConsensusCoordinatorEngine — concurrency (6-terminal race)", () => {
  it("global cap holds when 6 terminals fire concurrently — only 3 see fresh, 3 see rate-limited", async () => {
    // Each consensus call holds for 1500ms — longer than worst-case lock backoff
    // (max ~150ms) plus gate work, so all 6 terminals reach the gate while
    // T1-T3 are still in flight. Test verifies T4-T6 hit the global cap.
    let pending = 0;
    let observedConcurrent = 0;
    vi.spyOn(multiModelConsensusEngine, "ask").mockImplementation(async () => {
      pending++;
      observedConcurrent = Math.max(observedConcurrent, pending);
      await new Promise((res) => setTimeout(res, 1500));
      pending--;
      return mkResult();
    });

    const promises = [1, 2, 3, 4, 5, 6].map((i) =>
      engine.run({ prompt: `Plan ${i}`, taskType: "plan", terminalId: `term-${i}` }),
    );
    const results = await Promise.all(promises);
    const fresh = results.filter((r) => r.kind === "fresh").length;
    const rateLimited = results.filter((r) => r.kind === "rate-limited").length;
    expect(fresh).toBe(3);
    expect(rateLimited).toBe(3);
    expect(observedConcurrent).toBe(3);
  });

  it("budget reservation prevents overspend under burst — daily cap is honored", async () => {
    // Set budget to allow exactly ONE 50k-reservation fan-out
    const today = new Date().toISOString().slice(0, 10);
    await fs.mkdir(STATE_DIR, { recursive: true });
    await fs.writeFile(BUDGET_FILE, JSON.stringify({ dayKey: today, tokensUsed: 450_000 }, null, 2));

    let pending = 0;
    vi.spyOn(multiModelConsensusEngine, "ask").mockImplementation(async () => {
      pending++;
      await new Promise((res) => setTimeout(res, 100));
      pending--;
      return mkResult();
    });

    // 3 simultaneous attempts. Each reserves 50k pre-call. Budget 450k → only the first should pass; rest see budget-exceeded.
    const promises = [1, 2, 3].map((i) =>
      engine.run({ prompt: `Plan ${i}`, taskType: "plan", terminalId: `term-${i}` }),
    );
    const results = await Promise.all(promises);
    const fresh = results.filter((r) => r.kind === "fresh").length;
    const exceeded = results.filter((r) => r.kind === "budget-exceeded").length;
    expect(fresh).toBe(1);
    expect(exceeded).toBe(2);
  });

  it("budget reconciliation refunds overestimate — actual cost replaces reservation", async () => {
    vi.spyOn(multiModelConsensusEngine, "ask").mockResolvedValue(mkResult());
    await engine.run({ prompt: "Plan", taskType: "plan", terminalId: "term-1" });
    const stats = await engine.getStats();
    // pre-charged 50000, actual cost 2000 (claude500 + gpt1500 + ollama0) → final 2000, not 50000
    expect(stats.budget.tokensUsed).toBe(2000);
  });
});

describe("ConsensusCoordinatorEngine — tolerance for corrupt state", () => {
  it("treats corrupt inflight file as empty", async () => {
    await fs.mkdir(STATE_DIR, { recursive: true });
    await fs.writeFile(INFLIGHT_FILE, "{not valid json");

    vi.spyOn(multiModelConsensusEngine, "ask").mockResolvedValue(mkResult());
    const r = await engine.run({ prompt: "Plan", taskType: "plan", terminalId: "term-1" });
    expect(r.kind).toBe("fresh");
  });

  it("treats corrupt budget file as fresh-day-zero", async () => {
    await fs.mkdir(STATE_DIR, { recursive: true });
    await fs.writeFile(BUDGET_FILE, "garbage");

    vi.spyOn(multiModelConsensusEngine, "ask").mockResolvedValue(mkResult());
    const r = await engine.run({ prompt: "Plan", taskType: "plan", terminalId: "term-1" });
    expect(r.kind).toBe("fresh");
  });

  it("skips corrupt cache lines and continues", async () => {
    vi.spyOn(multiModelConsensusEngine, "ask").mockResolvedValue(mkResult());
    await engine.run({ prompt: "Plan A", taskType: "plan", terminalId: "term-1" });

    // Inject corruption mid-file
    const valid = await fs.readFile(CACHE_FILE, "utf-8");
    await fs.writeFile(CACHE_FILE, "{not valid\n" + valid);

    // Cache lookup for "Plan A" should still succeed despite the corrupt line
    const peek = await engine.peekCache("Plan A", "plan");
    expect(peek).not.toBeNull();
  });
});
