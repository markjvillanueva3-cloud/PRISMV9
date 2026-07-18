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
  type ConsensusAskFn,
} from "../engines/ConsensusCoordinatorEngine.js";
import { multiModelConsensusEngine, type ConsensusResult, type ConsensusInput } from "../engines/MultiModelConsensusEngine.js";

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

describe("ConsensusCoordinatorEngine.runWithEscalation — retry + escalation policy (P0-U03)", () => {
  let esc: ConsensusCoordinatorEngine;

  beforeEach(() => {
    esc = new ConsensusCoordinatorEngine();
  });

  /** A scripted askFn — returns queued results in order, recording every call's input. */
  function scriptedAsk(results: ConsensusResult[]): { askFn: ConsensusAskFn; calls: ConsensusInput[] } {
    const calls: ConsensusInput[] = [];
    let idx = 0;
    const askFn: ConsensusAskFn = async (input) => {
      calls.push(input);
      const r = results[Math.min(idx, results.length - 1)];
      idx += 1;
      return r;
    };
    return { askFn, calls };
  }

  it("accepts on the first attempt when agreementScore meets threshold — exactly 1 consensus call, no retry", async () => {
    const { askFn, calls } = scriptedAsk([mkResult({ agreementScore: 0.95, successCount: 3 })]);
    const out = await esc.runWithEscalation(
      { prompt: "best roughing strategy for Ti-6Al-4V", agreementThreshold: 0.70 },
      { askFn },
    );
    expect(out.kind).toBe("accepted");
    if (out.kind !== "accepted") throw new Error("expected accepted");
    expect(out.escalated).toBe(false);
    expect(out.attempts).toHaveLength(1);
    expect(out.attempts[0].phase).toBe("initial");
    expect(out.attempts[0].accepted).toBe(true);
    expect(out.result.agreementScore).toBe(0.95);
    expect(calls).toHaveLength(1);
  });

  it("retries once then accepts — ambiguous initial, accepted retry — 2 calls, escalated=false", async () => {
    const { askFn, calls } = scriptedAsk([
      mkResult({ agreementScore: 0.40, successCount: 2, recommendation: "review" }),
      mkResult({ agreementScore: 0.88, successCount: 3, recommendation: "accept" }),
    ]);
    const out = await esc.runWithEscalation(
      { prompt: "speed/feed for 4140HT", agreementThreshold: 0.70, maxRetries: 1 },
      { askFn },
    );
    expect(out.kind).toBe("accepted");
    if (out.kind !== "accepted") throw new Error("expected accepted");
    expect(out.escalated).toBe(false);
    expect(out.attempts).toHaveLength(2);
    expect(out.attempts[0].phase).toBe("initial");
    expect(out.attempts[0].accepted).toBe(false);
    expect(out.attempts[1].phase).toBe("retry");
    expect(out.attempts[1].accepted).toBe(true);
    expect(out.result.agreementScore).toBe(0.88);
    expect(calls).toHaveLength(2);
  });

  it("escalates after normal retries exhausted — ambiguous twice → escalated xhigh accepts — 3 calls, escalated=true", async () => {
    const { askFn, calls } = scriptedAsk([
      mkResult({ agreementScore: 0.30, successCount: 2, recommendation: "escalate" }),
      mkResult({ agreementScore: 0.45, successCount: 2, recommendation: "review" }),
      mkResult({ agreementScore: 0.92, successCount: 3, recommendation: "accept" }),
    ]);
    const out = await esc.runWithEscalation(
      { prompt: "wire tension for D2 1in", agreementThreshold: 0.70, maxRetries: 1 },
      { askFn },
    );
    expect(out.kind).toBe("accepted");
    if (out.kind !== "accepted") throw new Error("expected accepted");
    expect(out.escalated).toBe(true);
    expect(out.attempts).toHaveLength(3);
    expect(out.attempts[2].phase).toBe("escalated");
    expect(out.attempts[2].accepted).toBe(true);
    expect(out.result.agreementScore).toBe(0.92);
    expect(calls).toHaveLength(3);
    // Escalated attempt bumps Codex effort to xhigh; first two stay at default
    expect(calls[0].codexEffort).toBeUndefined();
    expect(calls[1].codexEffort).toBeUndefined();
    expect(calls[2].codexEffort).toBe("xhigh");
  });

  it("returns human_review_required when every attempt — including the escalated one — stays below threshold", async () => {
    const { askFn, calls } = scriptedAsk([
      mkResult({ agreementScore: 0.20, successCount: 1, recommendation: "escalate" }),
      mkResult({ agreementScore: 0.35, successCount: 2, recommendation: "review" }),
      mkResult({ agreementScore: 0.55, successCount: 2, recommendation: "review" }),
    ]);
    const out = await esc.runWithEscalation(
      { prompt: "post-processor pick Hurco vs Okuma", agreementThreshold: 0.70, maxRetries: 1 },
      { askFn },
    );
    expect(out.kind).toBe("human_review_required");
    if (out.kind !== "human_review_required") throw new Error("expected human_review_required");
    expect(out.attempts).toHaveLength(3);
    expect(out.attempts.every((a) => a.accepted === false)).toBe(true);
    expect(out.lastResult.agreementScore).toBe(0.55);
    expect(out.reason).toContain("0.7");
    expect(calls).toHaveLength(3);
  });

  it("maxRetries=0 → exactly 1 normal attempt then straight to the escalated attempt (2 calls total)", async () => {
    const { askFn, calls } = scriptedAsk([
      mkResult({ agreementScore: 0.40, successCount: 2, recommendation: "review" }),
      mkResult({ agreementScore: 0.85, successCount: 3, recommendation: "accept" }),
    ]);
    const out = await esc.runWithEscalation(
      { prompt: "chip load 6061", agreementThreshold: 0.70, maxRetries: 0 },
      { askFn },
    );
    expect(out.kind).toBe("accepted");
    if (out.kind !== "accepted") throw new Error("expected accepted");
    expect(out.escalated).toBe(true);
    expect(out.attempts).toHaveLength(2);
    expect(out.attempts[0].phase).toBe("initial");
    expect(out.attempts[1].phase).toBe("escalated");
    expect(calls).toHaveLength(2);
    expect(calls[1].codexEffort).toBe("xhigh");
  });

  it("a failed consensus (successCount 0) counts as below-threshold even if agreementScore is high", async () => {
    const { askFn } = scriptedAsk([
      mkResult({ agreementScore: 0.99, successCount: 0, ok: false, recommendation: "escalate" }),
      mkResult({ agreementScore: 0.99, successCount: 0, ok: false, recommendation: "escalate" }),
      mkResult({ agreementScore: 0.99, successCount: 0, ok: false, recommendation: "escalate" }),
    ]);
    const out = await esc.runWithEscalation(
      { prompt: "all voices failed", agreementThreshold: 0.70 },
      { askFn },
    );
    // successCount 0 → never accepted, despite agreementScore 0.99
    expect(out.kind).toBe("human_review_required");
  });

  it("validation-error on empty prompt", async () => {
    const { askFn } = scriptedAsk([mkResult()]);
    const out = await esc.runWithEscalation({ prompt: "" }, { askFn });
    expect(out.kind).toBe("validation-error");
    if (out.kind !== "validation-error") throw new Error("expected validation-error");
    expect(out.reason).toContain("prompt");
  });

  it("validation-error on agreementThreshold outside [0,1]", async () => {
    const { askFn } = scriptedAsk([mkResult()]);
    const out = await esc.runWithEscalation({ prompt: "q", agreementThreshold: 1.5 }, { askFn });
    expect(out.kind).toBe("validation-error");
    if (out.kind !== "validation-error") throw new Error("expected validation-error");
    expect(out.reason).toContain("agreementThreshold");
  });

  it("validation-error on non-integer maxRetries", async () => {
    const { askFn } = scriptedAsk([mkResult()]);
    const out = await esc.runWithEscalation({ prompt: "q", maxRetries: 2.5 }, { askFn });
    expect(out.kind).toBe("validation-error");
    if (out.kind !== "validation-error") throw new Error("expected validation-error");
    expect(out.reason).toContain("maxRetries");
  });

  it("validation-error on maxRetries above the [0,5] cap", async () => {
    const { askFn } = scriptedAsk([mkResult()]);
    const out = await esc.runWithEscalation({ prompt: "q", maxRetries: 99 }, { askFn });
    expect(out.kind).toBe("validation-error");
  });

  it("validation-error on vote mode without voteOptions", async () => {
    const { askFn } = scriptedAsk([mkResult()]);
    const out = await esc.runWithEscalation({ prompt: "q", mode: "vote" }, { askFn });
    expect(out.kind).toBe("validation-error");
    if (out.kind !== "validation-error") throw new Error("expected validation-error");
    expect(out.reason).toContain("voteOptions");
  });

  it("maxRetries=2 → 3 normal attempts before escalation (4 calls total when all ambiguous then escalated accepts)", async () => {
    const { askFn, calls } = scriptedAsk([
      mkResult({ agreementScore: 0.10, successCount: 1 }),
      mkResult({ agreementScore: 0.20, successCount: 1 }),
      mkResult({ agreementScore: 0.30, successCount: 1 }),
      mkResult({ agreementScore: 0.90, successCount: 3 }),
    ]);
    const out = await esc.runWithEscalation(
      { prompt: "deep retry budget", agreementThreshold: 0.70, maxRetries: 2 },
      { askFn },
    );
    expect(out.kind).toBe("accepted");
    if (out.kind !== "accepted") throw new Error("expected accepted");
    expect(out.attempts).toHaveLength(4);
    expect(out.attempts[0].phase).toBe("initial");
    expect(out.attempts[1].phase).toBe("retry");
    expect(out.attempts[2].phase).toBe("retry");
    expect(out.attempts[3].phase).toBe("escalated");
    expect(calls).toHaveLength(4);
  });

  it("forwards prompt, context, mode, voteOptions, timeoutMs and callerEngine to the consensus input", async () => {
    const { askFn, calls } = scriptedAsk([mkResult({ agreementScore: 0.95, successCount: 3 })]);
    await esc.runWithEscalation(
      {
        prompt: "vote between A and B",
        context: "caller ctx",
        mode: "vote",
        voteOptions: ["A", "B"],
        timeoutMs: 45000,
        callerEngine: "MillingAGIMasterEngine",
        agreementThreshold: 0.70,
      },
      { askFn },
    );
    expect(calls[0].prompt).toBe("vote between A and B");
    expect(calls[0].context).toBe("caller ctx");
    expect(calls[0].mode).toBe("vote");
    expect(calls[0].voteOptions).toEqual(["A", "B"]);
    expect(calls[0].timeoutMs).toBe(45000);
    expect(calls[0].callerEngine).toBe("MillingAGIMasterEngine");
  });
});
