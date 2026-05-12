/**
 * ChainFailureRecoveryEngine Tests — ACP-MS2B
 *
 * Validates chain failure recovery:
 *   1. Failure classification (transient/recoverable/permanent)
 *   2. Recovery plan computation per fail_behavior
 *   3. Retry delay with exponential backoff + jitter
 *   4. User notification generation
 *   5. Full recovery execution
 *   6. Health summary computation
 */
import { describe, it, expect, beforeEach } from "vitest";
import { chainFailureRecoveryEngine } from "../engines/ChainFailureRecoveryEngine.js";
import type { StepFailure } from "../engines/ChainFailureRecoveryEngine.js";

function makeFailure(overrides: Partial<StepFailure> = {}): StepFailure {
  return {
    chain_id: "build_guard",
    step_id: "typecheck",
    step_action: "run_tsc",
    error_message: "TS2304: Cannot find name 'foo'",
    timestamp: new Date().toISOString(),
    attempt: 1,
    max_attempts: 3,
    duration_ms: 500,
    ...overrides,
  };
}

beforeEach(() => {
  chainFailureRecoveryEngine.clearHistory();
});

// ── Failure Classification ─────────────────────────────────

describe("ChainFailureRecoveryEngine — Failure Classification", () => {

  it("classifies ENOENT as transient", () => {
    expect(chainFailureRecoveryEngine.classifyFailure("ENOENT: no such file")).toBe("transient");
  });

  it("classifies timeout as transient", () => {
    expect(chainFailureRecoveryEngine.classifyFailure("Operation timed out")).toBe("transient");
  });

  it("classifies EBUSY as transient", () => {
    expect(chainFailureRecoveryEngine.classifyFailure("EBUSY: resource busy")).toBe("transient");
  });

  it("classifies syntax error as permanent", () => {
    expect(chainFailureRecoveryEngine.classifyFailure("SyntaxError: unexpected token")).toBe("permanent");
  });

  it("classifies out of memory as permanent", () => {
    expect(chainFailureRecoveryEngine.classifyFailure("FATAL ERROR: out of memory")).toBe("permanent");
  });

  it("classifies permission denied as permanent", () => {
    expect(chainFailureRecoveryEngine.classifyFailure("EACCES: Permission denied")).toBe("permanent");
  });

  it("classifies trivial TS error code as recoverable", () => {
    expect(chainFailureRecoveryEngine.classifyFailure("unused import", "TS6133")).toBe("recoverable");
  });

  it("classifies unknown error as recoverable (optimistic default)", () => {
    expect(chainFailureRecoveryEngine.classifyFailure("something went wrong")).toBe("recoverable");
  });
});

// ── Recovery Plan Computation ────────────────────────────────

describe("ChainFailureRecoveryEngine — Recovery Plans", () => {

  it("fail_closed always aborts", () => {
    const plan = chainFailureRecoveryEngine.computeRecoveryPlan(
      makeFailure(), "fail_closed", true, ["step2", "step3"]
    );
    expect(plan.strategy).toBe("abort");
    expect(plan.remaining_steps).toHaveLength(0);
    expect(plan.skipped_steps).toEqual(["step2", "step3"]);
  });

  it("ask_user pauses chain", () => {
    const plan = chainFailureRecoveryEngine.computeRecoveryPlan(
      makeFailure(), "ask_user", true, ["step2"]
    );
    expect(plan.strategy).toBe("ask_user");
    expect(plan.remaining_steps).toEqual(["step2"]);
    expect(plan.user_message).toBeTruthy();
  });

  it("transient failure → retry", () => {
    const plan = chainFailureRecoveryEngine.computeRecoveryPlan(
      makeFailure({ error_message: "ENOENT: file not found", attempt: 1, max_attempts: 3 }),
      "degrade_warn", true, ["step2"]
    );
    expect(plan.strategy).toBe("retry");
    expect(plan.retry_config).toBeDefined();
    expect(plan.severity).toBe("transient");
  });

  it("non-required step with degrade_silent → skip silently", () => {
    const plan = chainFailureRecoveryEngine.computeRecoveryPlan(
      makeFailure({ attempt: 3, max_attempts: 3 }),
      "degrade_silent", false, ["step2"]
    );
    expect(plan.strategy).toBe("skip");
    expect(plan.user_message).toBeUndefined();
    expect(plan.skipped_steps).toContain("typecheck");
  });

  it("non-required step with degrade_warn → skip with warning", () => {
    const plan = chainFailureRecoveryEngine.computeRecoveryPlan(
      makeFailure({ attempt: 3, max_attempts: 3 }),
      "degrade_warn", false, ["step2"]
    );
    expect(plan.strategy).toBe("skip");
    expect(plan.user_message).toBeTruthy();
  });

  it("required step with retries left → retry", () => {
    const plan = chainFailureRecoveryEngine.computeRecoveryPlan(
      makeFailure({ attempt: 1, max_attempts: 3 }),
      "degrade_warn", true, ["step2"]
    );
    expect(plan.strategy).toBe("retry");
  });

  it("required step with max retries exhausted → abort", () => {
    const plan = chainFailureRecoveryEngine.computeRecoveryPlan(
      makeFailure({ attempt: 3, max_attempts: 3 }),
      "degrade_warn", true, ["step2"]
    );
    expect(plan.strategy).toBe("abort");
    expect(plan.user_message).toBeTruthy();
  });
});

// ── Retry Delay ──────────────────────────────────────────────

describe("ChainFailureRecoveryEngine — Retry Delay", () => {

  it("computes exponential backoff", () => {
    const config = { max_retries: 3, initial_delay_ms: 100, backoff_multiplier: 2, max_delay_ms: 10000, jitter: false };
    expect(chainFailureRecoveryEngine.computeRetryDelay(0, config)).toBe(100);
    expect(chainFailureRecoveryEngine.computeRetryDelay(1, config)).toBe(200);
    expect(chainFailureRecoveryEngine.computeRetryDelay(2, config)).toBe(400);
  });

  it("caps at max_delay_ms", () => {
    const config = { max_retries: 10, initial_delay_ms: 1000, backoff_multiplier: 10, max_delay_ms: 5000, jitter: false };
    expect(chainFailureRecoveryEngine.computeRetryDelay(5, config)).toBe(5000);
  });

  it("adds jitter when configured", () => {
    const config = { max_retries: 3, initial_delay_ms: 1000, backoff_multiplier: 1, max_delay_ms: 5000, jitter: true };
    const delays = new Set<number>();
    for (let i = 0; i < 20; i++) {
      delays.add(Math.round(chainFailureRecoveryEngine.computeRetryDelay(0, config)));
    }
    // With jitter, we should get some variation
    expect(delays.size).toBeGreaterThan(1);
  });

  it("no jitter = deterministic", () => {
    const config = { max_retries: 3, initial_delay_ms: 500, backoff_multiplier: 2, max_delay_ms: 5000, jitter: false };
    const d1 = chainFailureRecoveryEngine.computeRetryDelay(1, config);
    const d2 = chainFailureRecoveryEngine.computeRetryDelay(1, config);
    expect(d1).toBe(d2);
  });
});

// ── User Notifications ───────────────────────────────────────

describe("ChainFailureRecoveryEngine — Notifications", () => {

  it("abort notification has error severity", () => {
    const failure = makeFailure();
    const plan = chainFailureRecoveryEngine.computeRecoveryPlan(failure, "fail_closed", true, []);
    const notif = chainFailureRecoveryEngine.generateNotification(failure, plan);
    expect(notif.severity).toBe("error");
    expect(notif.title).toContain("Chain Failed");
    expect(notif.actions.length).toBeGreaterThan(0);
  });

  it("ask_user notification has critical severity", () => {
    const failure = makeFailure();
    const plan = chainFailureRecoveryEngine.computeRecoveryPlan(failure, "ask_user", true, []);
    const notif = chainFailureRecoveryEngine.generateNotification(failure, plan);
    expect(notif.severity).toBe("critical");
    expect(notif.actions.some(a => a.action === "retry_step")).toBe(true);
    expect(notif.actions.some(a => a.action === "abort_chain")).toBe(true);
  });

  it("skip notification has warning severity", () => {
    const failure = makeFailure({ attempt: 3, max_attempts: 3 });
    const plan = chainFailureRecoveryEngine.computeRecoveryPlan(failure, "degrade_warn", false, []);
    const notif = chainFailureRecoveryEngine.generateNotification(failure, plan);
    expect(notif.severity).toBe("warning");
  });

  it("notification has timestamp", () => {
    const failure = makeFailure();
    const plan = chainFailureRecoveryEngine.computeRecoveryPlan(failure, "fail_closed", true, []);
    const notif = chainFailureRecoveryEngine.generateNotification(failure, plan);
    expect(notif.timestamp).toBeTruthy();
  });
});

// ── Full Recovery Execution ──────────────────────────────────

describe("ChainFailureRecoveryEngine — Full Recovery", () => {

  it("recovery result for abort includes notification", () => {
    const r = chainFailureRecoveryEngine.recover(
      makeFailure(), "fail_closed", true, ["step2"]
    );
    expect(r.recovery_executed).toBe(true);
    expect(r.recovery_success).toBe(false);
    expect(r.user_notification).toBeDefined();
    expect(r.user_notification!.severity).toBe("error");
  });

  it("recovery result for retry indicates success (can continue)", () => {
    const r = chainFailureRecoveryEngine.recover(
      makeFailure({ error_message: "ENOENT: file missing", attempt: 1, max_attempts: 3 }),
      "degrade_warn", true, ["step2"]
    );
    expect(r.recovery_success).toBe(true);
    expect(r.recovery_plan.strategy).toBe("retry");
  });

  it("recovery result for skip indicates success", () => {
    const r = chainFailureRecoveryEngine.recover(
      makeFailure({ attempt: 3, max_attempts: 3 }),
      "degrade_warn", false, ["step2"]
    );
    expect(r.recovery_success).toBe(true);
    expect(r.recovery_plan.strategy).toBe("skip");
  });

  it("records failure in history", () => {
    chainFailureRecoveryEngine.recover(makeFailure(), "degrade_warn", true, []);
    chainFailureRecoveryEngine.recover(makeFailure({ step_id: "test" }), "degrade_warn", true, []);
    expect(chainFailureRecoveryEngine.getHistory()).toHaveLength(2);
  });
});

// ── Health Summary ───────────────────────────────────────────

describe("ChainFailureRecoveryEngine — Health Summary", () => {

  it("empty history returns clean summary", () => {
    const h = chainFailureRecoveryEngine.getHealthSummary("build_guard");
    expect(h.total_failures).toBe(0);
    expect(h.failure_rate).toBe(0);
    expect(h.most_failing_step).toBeNull();
  });

  it("tracks most failing step", () => {
    chainFailureRecoveryEngine.recover(makeFailure({ step_id: "tsc" }), "degrade_warn", true, []);
    chainFailureRecoveryEngine.recover(makeFailure({ step_id: "tsc" }), "degrade_warn", true, []);
    chainFailureRecoveryEngine.recover(makeFailure({ step_id: "test" }), "degrade_warn", true, []);
    const h = chainFailureRecoveryEngine.getHealthSummary("build_guard");
    expect(h.most_failing_step).toBe("tsc");
    expect(h.total_failures).toBe(3);
  });

  it("filters by chain_id", () => {
    chainFailureRecoveryEngine.recover(makeFailure({ chain_id: "build_guard" }), "degrade_warn", true, []);
    chainFailureRecoveryEngine.recover(makeFailure({ chain_id: "other" }), "degrade_warn", true, []);
    const h = chainFailureRecoveryEngine.getHealthSummary("build_guard");
    expect(h.total_failures).toBe(1);
  });
});

// ── Retry Config ─────────────────────────────────────────────

describe("ChainFailureRecoveryEngine — Retry Config", () => {

  it("returns config for known step", () => {
    const config = chainFailureRecoveryEngine.getRetryConfig("run_tsc");
    expect(config.max_retries).toBe(2);
    expect(config.initial_delay_ms).toBeGreaterThan(0);
  });

  it("returns default config for unknown step", () => {
    const config = chainFailureRecoveryEngine.getRetryConfig("unknown_step");
    expect(config.max_retries).toBeGreaterThan(0);
  });

  it("safety_check has 0 retries (never retry safety)", () => {
    const config = chainFailureRecoveryEngine.getRetryConfig("safety_check");
    expect(config.max_retries).toBe(0);
  });
});
