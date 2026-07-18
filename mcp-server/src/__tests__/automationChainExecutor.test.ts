/**
 * automationChainExecutor.test.ts -- ACP-MS2: AutomationChainEngine.executeChain
 * ============================================================================
 * The executor is the telemetry PRODUCER: it runs a chain's steps via a
 * caller-supplied runner, enforces token_budget + per-step timeout_ms, applies
 * TIER_FAIL_RULES retries, and emits the previously-unproducible `budget_exceeded`
 * / `timeout` telemetry statuses. These tests assert REAL behavior (reference
 * counts, terminal status, per-step status, attempts, token totals, and a
 * round-trip THROUGH AutomationChainTelemetryEngine), not stubs.
 *
 * Coverage: happy + 4 failure modes (budget_exceeded, required-error abort,
 * required-timeout, retry-then-fail) + non-required degrade + 3 adversarial
 * (garbage token_cost, zero-step chain, unknown task class) + the aggregator
 * round-trip (R15: producer -> consumer through the widened allow-set).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  AutomationChainEngine,
  type ChainStepRunner,
} from "../engines/AutomationChainEngine.js";
import { automationChainTelemetryEngine } from "../engines/AutomationChainTelemetryEngine.js";

// A runner that returns a fixed token cost for every step (happy default).
const constCost = (cost: number): ChainStepRunner => () => ({ token_cost: cost });

describe("AutomationChainEngine.executeChain (ACP-MS2)", () => {
  let engine: AutomationChainEngine;
  beforeEach(() => {
    engine = new AutomationChainEngine();
  });

  // ── HAPPY ─────────────────────────────────────────────────────────────────
  it("happy: all steps succeed -> completed, every step completed, 2 chain events", async () => {
    // roadmap chain: 2 required steps (load_position, pick_task), tier standard, budget 500.
    const result = await engine.executeChain("roadmap", constCost(50));
    expect(result.status).toBe("completed");
    expect(result.chain_id).toBe("chain-roadmap");
    expect(result.aborted_at_step).toBeNull();
    expect(result.steps).toHaveLength(2);
    expect(result.steps.every(s => s.status === "completed")).toBe(true);
    expect(result.steps.every(s => s.attempts === 1)).toBe(true);
    expect(result.token_cost_total).toBe(100);          // 50 + 50
    expect(result.budget_remaining).toBe(400);          // 500 - 100
    // Exactly one started + one terminal chain-level event.
    expect(result.telemetry).toHaveLength(2);
    expect(result.telemetry[0].status).toBe("started");
    expect(result.telemetry[1].status).toBe("completed");
    expect(result.telemetry[1].budget_remaining).toBe(400);
  });

  // ── FAILURE 1: budget_exceeded ──────────────────────────────────────────────
  it("failure: cumulative cost over token_budget -> budget_exceeded, aborts, later steps skipped", async () => {
    // speed_feed: budget 1000, 2 required steps. 600 + 600 = 1200 > 1000.
    const result = await engine.executeChain("speed_feed", constCost(600));
    expect(result.status).toBe("budget_exceeded");
    expect(result.aborted_at_step).toBe("compute");     // 2nd step pushes over
    expect(result.token_cost_total).toBe(1200);
    expect(result.budget_remaining).toBe(0);            // clamped at 0, never negative
    // step 1 ran + completed; step 2 ran (pushed over) + completed; no 3rd step exists.
    expect(result.steps).toHaveLength(2);
    expect(result.telemetry[1].status).toBe("budget_exceeded");
    expect(result.telemetry[1].error).toMatch(/budget_exceeded/);
  });

  // ── FAILURE 2: required-step error abort (critical tier, no retry) ──────────
  it("failure: required step throws on a critical chain -> failed, no retry (attempts=1)", async () => {
    // backend: tier critical (retry_allowed false, max_retries 0). First step required.
    const runner: ChainStepRunner = () => { throw new Error("classify boom"); };
    const result = await engine.executeChain("backend", runner);
    expect(result.status).toBe("failed");
    expect(result.aborted_at_step).toBe("classify");
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].status).toBe("failed");
    expect(result.steps[0].attempts).toBe(1);           // critical => no retry
    expect(result.steps[0].error).toMatch(/classify boom/);
    expect(result.telemetry[1].status).toBe("failed");
  });

  // ── FAILURE 3: required-step timeout (fake timers) ──────────────────────────
  it("failure: required step exceeds timeout_ms -> timeout terminal", async () => {
    vi.useFakeTimers();
    try {
      // backend.classify timeout_ms = 1000, critical (no retry). Runner never settles.
      const runner: ChainStepRunner = () => new Promise<{ token_cost: number }>(() => { /* hang */ });
      const promise = engine.executeChain("backend", runner);
      await vi.advanceTimersByTimeAsync(1100);
      const result = await promise;
      expect(result.status).toBe("timeout");
      expect(result.aborted_at_step).toBe("classify");
      expect(result.steps[0].status).toBe("timeout");
      expect(result.steps[0].attempts).toBe(1);
      expect(result.telemetry[1].status).toBe("timeout");
    } finally {
      vi.useRealTimers();
    }
  });

  // ── FAILURE 4: retry-then-fail on a standard chain ──────────────────────────
  it("failure: required step always errors on standard chain -> retried once (attempts=2) then failed", async () => {
    // web: tier standard (retry_allowed true, max_retries 1). classify required.
    let calls = 0;
    const runner: ChainStepRunner = () => { calls += 1; throw new Error("always fails"); };
    const result = await engine.executeChain("web", runner);
    expect(result.status).toBe("failed");
    expect(result.aborted_at_step).toBe("classify");
    expect(result.steps[0].attempts).toBe(2);           // 1 initial + 1 retry (max_retries=1)
    expect(calls).toBe(2);
  });

  // ── NON-REQUIRED DEGRADE ────────────────────────────────────────────────────
  it("degrade: a non-required step failing is skipped, chain still completes", async () => {
    // backend last step "test" is required:false. Fail only it.
    const runner: ChainStepRunner = (step) => {
      if (step.id === "test") throw new Error("flaky tests");
      return { token_cost: 10 };
    };
    const result = await engine.executeChain("backend", runner);
    expect(result.status).toBe("completed");            // degraded, not aborted
    expect(result.aborted_at_step).toBeNull();
    const testStep = result.steps.find(s => s.step_id === "test");
    expect(testStep?.status).toBe("skipped");
    // every other step completed
    expect(result.steps.filter(s => s.step_id !== "test").every(s => s.status === "completed")).toBe(true);
  });

  // ── ADVERSARIAL 1: garbage token_cost ───────────────────────────────────────
  it("adversarial: NaN / negative / non-numeric token_cost normalize to 0, no throw", async () => {
    const garbage = [NaN, -50, "abc" as unknown as number];
    let i = 0;
    const runner: ChainStepRunner = () => ({ token_cost: garbage[i++ % garbage.length] });
    const result = await engine.executeChain("roadmap", runner);   // 2 steps
    expect(result.status).toBe("completed");
    expect(result.token_cost_total).toBe(0);            // all coerced to 0
    expect(Number.isFinite(result.token_cost_total)).toBe(true);
    expect(result.budget_remaining).toBe(500);
  });

  // ── ADVERSARIAL 2: zero-step chain ──────────────────────────────────────────
  it("adversarial: the step-less 'general' chain completes with no steps + 2 events", async () => {
    const result = await engine.executeChain("general", constCost(999));
    expect(result.status).toBe("completed");
    expect(result.steps).toHaveLength(0);
    expect(result.token_cost_total).toBe(0);            // no step ran
    expect(result.telemetry).toHaveLength(2);
    expect(result.aborted_at_step).toBeNull();
  });

  // ── ADVERSARIAL 3: unknown task class fails loud ────────────────────────────
  it("adversarial: an unknown task class throws (R12 fail-loud)", async () => {
    await expect(
      engine.executeChain("not_a_class" as never, constCost(1)),
    ).rejects.toThrow(/unknown task class/);
  });

  // ── R15 ROUND-TRIP: producer -> AutomationChainTelemetryEngine consumer ─────
  it("round-trip: ingest:true feeds the aggregator; budget_exceeded lands in the failure bucket", async () => {
    automationChainTelemetryEngine.reset();
    const result = await engine.executeChain("speed_feed", constCost(600), { ingest: true });
    expect(result.status).toBe("budget_exceeded");
    // The aggregator MUST have accepted the widened statuses (no throw) and
    // counted the run: 1 fire (started), and budget_exceeded routed to failed.
    const health = automationChainTelemetryEngine.chainHealth("chain-sf");
    expect(health).not.toBeNull();
    expect(health!.fires).toBe(1);
    expect(health!.failed).toBe(1);                     // budget_exceeded => failure bucket
    expect(health!.completed).toBe(0);
    expect(health!.downgrade_rate).toBe(1);             // 1 failed / 1 fire
    // the terminal error string is captured in recent_errors
    expect(health!.recent_errors.some(e => /budget_exceeded/.test(e))).toBe(true);
    automationChainTelemetryEngine.reset();             // leave the singleton clean
  });
});
