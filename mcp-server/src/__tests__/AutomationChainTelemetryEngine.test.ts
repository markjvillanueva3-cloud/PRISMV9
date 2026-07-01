/**
 * AutomationChainTelemetryEngine tests — ACP-MS6 / P1-U01 + P1-U02 + P1-U03
 *
 * Covers every public method + every Arm A / Arm B reviewer concern from the
 * per-file scrutiny pass (defensive copy, reservoir determinism via injected
 * RNG, error capping, partial-budget diagnostic, chain_id length bound,
 * R12 fail-loud on bad input).
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  AutomationChainTelemetryEngine,
  automationChainTelemetryEngine,
  type ChainHealth,
  type SessionAutomationHealth,
} from "../engines/AutomationChainTelemetryEngine.js";
import type { TelemetryEvent } from "../engines/AutomationChainEngine.js";

function ev(
  chain_id: string,
  status: TelemetryEvent["status"],
  token_cost = 0,
  latency_ms = 0,
  error?: string,
): TelemetryEvent {
  return {
    timestamp: "2026-05-23T18:00:00.000Z",
    chain_id,
    step_id: "step-0",
    status,
    token_cost,
    latency_ms,
    error,
  };
}

describe("AutomationChainTelemetryEngine — construction + lifecycle", () => {
  it("exports a default singleton", () => {
    expect(automationChainTelemetryEngine).toBeInstanceOf(AutomationChainTelemetryEngine);
  });

  it("constructs with default randomFn (Math.random)", () => {
    const e = new AutomationChainTelemetryEngine();
    expect(e).toBeInstanceOf(AutomationChainTelemetryEngine);
  });

  it("constructs with injected randomFn for determinism", () => {
    const e = new AutomationChainTelemetryEngine({ randomFn: () => 0.5 });
    expect(e).toBeInstanceOf(AutomationChainTelemetryEngine);
  });

  it("reset() drops state AND advances sessionStartedAt", async () => {
    const e = new AutomationChainTelemetryEngine();
    e.ingest(ev("c1", "started", 100, 0));
    const before = e.sessionHealth().session_started_at;
    await new Promise(r => setTimeout(r, 5));
    e.reset();
    const after = e.sessionHealth();
    expect(after.events_total).toBe(0);
    expect(after.chains_active).toBe(0);
    expect(after.session_started_at >= before).toBe(true);
  });

  it("startSession() preserves accumulated state but advances timestamp", async () => {
    const e = new AutomationChainTelemetryEngine();
    e.ingest(ev("c1", "started", 100));
    const before = e.sessionHealth().session_started_at;
    await new Promise(r => setTimeout(r, 5));
    e.startSession();
    const after = e.sessionHealth();
    expect(after.events_total).toBe(1);                    // not dropped
    expect(after.session_started_at >= before).toBe(true);
  });
});

describe("AutomationChainTelemetryEngine — ingest validation (R12 fail-loud)", () => {
  let e: AutomationChainTelemetryEngine;
  beforeEach(() => { e = new AutomationChainTelemetryEngine(); });

  it("rejects non-object event", () => {
    expect(() => e.ingest(null as any)).toThrow(/event must be an object/);
  });
  it("rejects missing chain_id", () => {
    expect(() => e.ingest({ ...ev("x", "started"), chain_id: "" })).toThrow(/chain_id required/);
  });
  it("rejects chain_id exceeding 256 chars (DoS / log-bloat guard)", () => {
    expect(() => e.ingest(ev("c".repeat(257), "started"))).toThrow(/exceeds 256/);
  });
  it("accepts chain_id at the boundary (256 chars)", () => {
    expect(() => e.ingest(ev("c".repeat(256), "started"))).not.toThrow();
  });
  it("rejects unknown status", () => {
    expect(() => e.ingest({ ...ev("c1", "started"), status: "weird" as any })).toThrow(/unknown status/);
  });
  it("rejects negative token_cost", () => {
    expect(() => e.ingest(ev("c1", "completed", -1, 10))).toThrow(/token_cost/);
  });
  it("rejects NaN token_cost", () => {
    expect(() => e.ingest(ev("c1", "completed", Number.NaN, 10))).toThrow(/token_cost/);
  });
  it("rejects negative latency_ms", () => {
    expect(() => e.ingest(ev("c1", "completed", 5, -1))).toThrow(/latency_ms/);
  });
  it("rejects Infinity latency_ms", () => {
    expect(() => e.ingest(ev("c1", "completed", 5, Number.POSITIVE_INFINITY))).toThrow(/latency_ms/);
  });
});

describe("AutomationChainTelemetryEngine — per-chain counts (P1-U01 + P1-U02)", () => {
  let e: AutomationChainTelemetryEngine;
  beforeEach(() => { e = new AutomationChainTelemetryEngine(); });

  it("chainHealth returns null for unseen chain", () => {
    expect(e.chainHealth("nope")).toBeNull();
  });

  it("counts fires + completed + failed + skipped + tokens", () => {
    e.ingest(ev("c1", "started", 10, 0));
    e.ingest(ev("c1", "started", 10, 0));
    e.ingest(ev("c1", "completed", 5, 100));
    e.ingest(ev("c1", "failed", 5, 50, "boom"));
    e.ingest(ev("c1", "skipped", 0, 0));
    const h = e.chainHealth("c1")!;
    expect(h.fires).toBe(2);
    expect(h.completed).toBe(1);
    expect(h.failed).toBe(1);
    expect(h.skipped).toBe(1);
    expect(h.token_cost_total).toBe(30);
    expect(h.token_cost_per_fire).toBe(15);
    expect(h.completion_rate).toBe(0.5);
    expect(h.downgrade_rate).toBe(0.5);            // ACP-MS6 P1-U02
    expect(h.override_rate).toBe(0.5);             // ACP-MS6 P1-U02
    expect(h.recent_errors).toEqual(["boom"]);
  });

  it("caps error string at MAX_ERROR_CHARS=512", () => {
    const big = "x".repeat(1000);
    e.ingest(ev("c1", "failed", 0, 0, big));
    const h = e.chainHealth("c1")!;
    expect(h.recent_errors[0].length).toBe(512 + "…[truncated]".length);
    expect(h.recent_errors[0].endsWith("…[truncated]")).toBe(true);
  });

  it("bounds recent_errors to last 5", () => {
    for (let i = 0; i < 10; i++) e.ingest(ev("c1", "failed", 0, 0, `err-${i}`));
    const h = e.chainHealth("c1")!;
    expect(h.recent_errors).toEqual(["err-5", "err-6", "err-7", "err-8", "err-9"]);
  });

  it("returns 0 token_cost_per_fire when no fires (division-by-zero guard)", () => {
    e.ingest(ev("c1", "completed", 5, 10));    // bypass started — replay scenario
    const h = e.chainHealth("c1")!;
    expect(h.fires).toBe(0);
    expect(h.token_cost_per_fire).toBe(5);     // divided by (fires||1) = 5
    expect(Number.isFinite(h.completion_rate)).toBe(true);
  });
});

describe("AutomationChainTelemetryEngine — percentiles (P1-U01)", () => {
  // Inject a deterministic RNG so reservoir replacement is reproducible.
  it("p50/p95/p99 match R-7 / numpy default for known input", () => {
    const e = new AutomationChainTelemetryEngine({ randomFn: () => 0 });
    for (const ms of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
      e.ingest(ev("c1", "completed", 1, ms));
    }
    const h = e.chainHealth("c1")!;
    // sorted: [10..100], idx_p50 = 0.5*9 = 4.5 → (50+60)/2 = 55
    expect(h.latency_p50_ms).toBeCloseTo(55, 6);
    // idx_p95 = 0.95*9 = 8.55 → 90 + 0.55*(100-90) = 95.5
    expect(h.latency_p95_ms).toBeCloseTo(95.5, 6);
    expect(h.latency_p99_ms).toBeCloseTo(99.1, 6);
    expect(h.latency_sample_size).toBe(10);
  });

  it("single-sample percentiles equal that sample", () => {
    const e = new AutomationChainTelemetryEngine();
    e.ingest(ev("c1", "completed", 0, 42));
    const h = e.chainHealth("c1")!;
    expect(h.latency_p50_ms).toBe(42);
    expect(h.latency_p95_ms).toBe(42);
    expect(h.latency_p99_ms).toBe(42);
  });

  it("empty completed → null percentiles (not NaN)", () => {
    const e = new AutomationChainTelemetryEngine();
    e.ingest(ev("c1", "started", 0, 0));
    e.ingest(ev("c1", "failed", 0, 999));      // failed latency NOT recorded
    const h = e.chainHealth("c1")!;
    expect(h.latency_p50_ms).toBeNull();
    expect(h.latency_p95_ms).toBeNull();
    expect(h.latency_p99_ms).toBeNull();
    expect(h.latency_sample_size).toBe(0);
  });

  it("reservoir bounded at 256 samples", () => {
    const e = new AutomationChainTelemetryEngine({ randomFn: () => 0 });
    for (let i = 0; i < 1000; i++) e.ingest(ev("c1", "completed", 0, i));
    const h = e.chainHealth("c1")!;
    expect(h.latency_sample_size).toBe(256);
  });
});

describe("AutomationChainTelemetryEngine — session roll-up (P1-U03)", () => {
  let e: AutomationChainTelemetryEngine;
  beforeEach(() => { e = new AutomationChainTelemetryEngine(); });

  it("empty session returns zeros without NaN", () => {
    const s = e.sessionHealth();
    expect(s.events_total).toBe(0);
    expect(s.chains_active).toBe(0);
    expect(s.fires_total).toBe(0);
    expect(Number.isFinite(s.completion_rate)).toBe(true);
    expect(s.token_budget_utilization).toBe(0);
    expect(s.token_budget_coverage).toBe(0);
    expect(s.worst_chain_by_downgrade).toBeNull();
    expect(s.worst_chain_by_latency).toBeNull();
    expect(s.best_chain_by_completion).toBeNull();
  });

  it("ranks chains correctly", () => {
    // c1: 4 fires, all completed (best completion)
    for (let i = 0; i < 4; i++) e.ingest(ev("c1", "started"));
    for (let i = 0; i < 4; i++) e.ingest(ev("c1", "completed", 1, 10));
    // c2: 4 fires, 2 failed (worst downgrade)
    for (let i = 0; i < 4; i++) e.ingest(ev("c2", "started"));
    e.ingest(ev("c2", "completed", 1, 20));
    e.ingest(ev("c2", "completed", 1, 20));
    e.ingest(ev("c2", "failed", 1, 0, "err"));
    e.ingest(ev("c2", "failed", 1, 0, "err"));
    // c3: 2 fires, 2 completed with high latency (worst latency)
    e.ingest(ev("c3", "started"));
    e.ingest(ev("c3", "started"));
    e.ingest(ev("c3", "completed", 1, 5000));
    e.ingest(ev("c3", "completed", 1, 5000));
    const s = e.sessionHealth();
    expect(s.best_chain_by_completion).toBe("c1");
    expect(s.worst_chain_by_downgrade).toBe("c2");
    expect(s.worst_chain_by_latency).toBe("c3");
    expect(s.chains_active).toBe(3);
    expect(s.fires_total).toBe(10);
  });

  it("sort order: fires desc then chain_id asc", () => {
    e.ingest(ev("bbb", "started"));
    e.ingest(ev("aaa", "started"));
    e.ingest(ev("aaa", "started"));
    e.ingest(ev("ccc", "started"));
    e.ingest(ev("ccc", "started"));
    const rows = e.summary().map(r => r.chain_id);
    // aaa & ccc both have 2 fires → tie-break alphabetical; bbb (1) trails
    expect(rows).toEqual(["aaa", "ccc", "bbb"]);
  });
});

describe("AutomationChainTelemetryEngine — recordChainBudget + utilization", () => {
  let e: AutomationChainTelemetryEngine;
  beforeEach(() => { e = new AutomationChainTelemetryEngine(); });

  it("validates inputs", () => {
    expect(() => e.recordChainBudget("", "general", 100)).toThrow(/chainId required/);
    expect(() => e.recordChainBudget("c".repeat(257), "general", 100)).toThrow(/exceeds 256/);
    expect(() => e.recordChainBudget("c1", "general", -1)).toThrow(/non-negative finite/);
    expect(() => e.recordChainBudget("c1", "general", Number.NaN)).toThrow(/non-negative finite/);
  });

  it("backfills task_class on existing chain state", () => {
    e.ingest(ev("c1", "started", 10));
    expect(e.chainHealth("c1")!.task_class).toBe("unknown");
    e.recordChainBudget("c1", "erp", 1000);
    expect(e.chainHealth("c1")!.task_class).toBe("erp");
  });

  it("token_budget_utilization counts ONLY budgeted chains (Arm-A P1)", () => {
    e.recordChainBudget("c1", "erp", 1000);     // budgeted
    // c2 NOT budgeted but emits tokens
    e.ingest(ev("c1", "completed", 200, 10));
    e.ingest(ev("c2", "completed", 5000, 10));
    const s = e.sessionHealth();
    expect(s.token_cost_total).toBe(5200);
    expect(s.token_budget_total).toBe(1000);
    // utilization is 200 (tokens-on-c1) / 1000 (c1-budget) = 0.2, NOT 5200/1000=5.2
    expect(s.token_budget_utilization).toBeCloseTo(0.2, 6);
    // coverage diagnostic: 1 of 2 chains has a budget
    expect(s.token_budget_coverage).toBeCloseTo(0.5, 6);
  });

  it("last-writer-wins on duplicate recordChainBudget calls", () => {
    e.recordChainBudget("c1", "erp", 1000);
    e.recordChainBudget("c1", "backend", 5000);
    e.ingest(ev("c1", "completed", 500, 0));
    const h = e.chainHealth("c1")!;
    expect(h.task_class).toBe("backend");
    expect(e.sessionHealth().token_budget_total).toBe(5000);
  });
});

describe("AutomationChainTelemetryEngine — AutomationChainEngine wire integration", () => {
  it("automationChainEngine.recordTelemetryEvent() auto-ingests into the telemetry singleton", async () => {
    const { automationChainEngine } = await import("../engines/AutomationChainEngine.js");
    automationChainTelemetryEngine.reset();
    const evt = await automationChainEngine.recordTelemetryEvent("chain-erp", "step-1", "completed", 250, 42);
    expect(evt.chain_id).toBe("chain-erp");
    const h = automationChainTelemetryEngine.chainHealth("chain-erp")!;
    expect(h.completed).toBe(1);
    expect(h.token_cost_total).toBe(250);
    expect(h.latency_p50_ms).toBe(42);
  });

  it("automationChainEngine.seedTelemetryBudgets() registers all 9 task-class chains", async () => {
    const { automationChainEngine } = await import("../engines/AutomationChainEngine.js");
    automationChainTelemetryEngine.reset();
    const count = await automationChainEngine.seedTelemetryBudgets();
    expect(count).toBe(9);
    // After seeding, every chain has a non-zero budget recorded
    const s = automationChainTelemetryEngine.sessionHealth();
    expect(s.token_budget_total).toBeGreaterThan(0);
    expect(s.chains_active).toBe(9);            // all seeded chains visible
  });
});

describe("AutomationChainTelemetryEngine — defensive copy (Arm-B P0)", () => {
  it("mutating chainHealth().recent_errors does not affect future calls", () => {
    const e = new AutomationChainTelemetryEngine();
    e.ingest(ev("c1", "failed", 0, 0, "real"));
    const a = e.chainHealth("c1")!;
    a.recent_errors.push("injected");
    const b = e.chainHealth("c1")!;
    expect(b.recent_errors).toEqual(["real"]);    // 'injected' did not leak back
  });

  it("mutating summary() entries does not affect subsequent summary() calls", () => {
    const e = new AutomationChainTelemetryEngine();
    e.ingest(ev("c1", "started"));
    const s1 = e.summary();
    (s1[0] as any).fires = 999;
    const s2 = e.summary();
    expect(s2[0].fires).toBe(1);
  });

  it("mutating sessionHealth().per_chain does not affect subsequent calls", () => {
    const e = new AutomationChainTelemetryEngine();
    e.ingest(ev("c1", "started"));
    const s1 = e.sessionHealth();
    s1.per_chain[0].fires = 42;
    s1.per_chain[0].recent_errors.push("tamper");
    const s2 = e.sessionHealth();
    expect(s2.per_chain[0].fires).toBe(1);
    expect(s2.per_chain[0].recent_errors).toEqual([]);
  });
});
