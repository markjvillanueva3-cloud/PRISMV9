/**
 * AutomationChainEngine.test.ts — name-matched test file (ACP-MS6 / U-WIRE-AUTOMATION-CHAIN-TELEMETRY).
 *
 * Existing `automation-chain.test.ts` covers classify + chain structure (20 cases).
 * This file asserts concrete values on the AutomationChainEngine public API AND the
 * new producer-side methods shipped 2026-05-23 by slot:hotel.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { automationChainEngine } from "../engines/AutomationChainEngine.js";
import { automationChainTelemetryEngine } from "../engines/AutomationChainTelemetryEngine.js";

// Test-fixture constants (not magic numbers — these pin specific behavior).
const TASK_CLASS_COUNT = 9;                 // 9 declared TaskClasses in AutomationChainEngine
const ERP_TOKEN_BUDGET = 1500;              // canonical CHAINS.erp.token_budget
const ERP_STEP_COUNT = 2;                   // classify + compute
const ERP_STEP_IDS = ["classify", "compute"] as const;
const FIXTURE_TOKEN_COST = 50;
const FIXTURE_LATENCY = 123;
const FIXTURE_FAIL_TOKEN_COST = 5;
const FIXTURE_FAIL_LATENCY = 10;
const FIXTURE_ERROR_MSG = "downstream timeout";

describe("AutomationChainEngine — class surface (concrete values)", () => {
  it("listChains() returns exactly 9 task-class chains, alphabetically audit..web", () => {
    const chains = automationChainEngine.listChains();
    expect(chains.length).toBe(TASK_CLASS_COUNT);
    expect(chains.map(c => c.task_class).sort()).toEqual([
      "audit", "backend", "cad_python", "erp", "general",
      "post_process", "roadmap", "speed_feed", "web",
    ]);
  });

  it("getChain('erp') returns chain-erp tier=standard budget=1500 with steps [classify, compute]", () => {
    const chain = automationChainEngine.getChain("erp");
    expect(chain.id).toBe("chain-erp");
    expect(chain.tier).toBe("standard");
    expect(chain.token_budget).toBe(ERP_TOKEN_BUDGET);
    expect(chain.steps.length).toBe(ERP_STEP_COUNT);
    expect(chain.steps.map(s => s.id)).toEqual([...ERP_STEP_IDS]);
  });

  it("classify('quote estimate for ALCOA') routes to chain-erp (hotel domain)", () => {
    const r = automationChainEngine.classify("quote estimate for ALCOA");
    expect(r.task_class).toBe("erp");
    expect(r.chain_id).toBe("chain-erp");
  });

  it("classify('') returns 'general' as catch-all with chain-general", () => {
    const r = automationChainEngine.classify("");
    expect(r.task_class).toBe("general");
    expect(r.chain_id).toBe("chain-general");
  });
});

describe("AutomationChainEngine — createTelemetryEvent (pre-existing)", () => {
  it("createTelemetryEvent populates every event field correctly for status=completed", () => {
    const evt = automationChainEngine.createTelemetryEvent("chain-erp", "step-7", "completed", FIXTURE_TOKEN_COST, FIXTURE_LATENCY);
    expect(evt.chain_id).toBe("chain-erp");
    expect(evt.step_id).toBe("step-7");
    expect(evt.status).toBe("completed");
    expect(evt.token_cost).toBe(FIXTURE_TOKEN_COST);
    expect(evt.latency_ms).toBe(FIXTURE_LATENCY);
    expect(Date.parse(evt.timestamp)).toBeLessThanOrEqual(Date.now());
    expect(Date.parse(evt.timestamp)).toBeGreaterThan(Date.now() - 5000);
    expect(evt.error === undefined).toBe(true);
  });

  it("createTelemetryEvent preserves the literal error string on status=failed", () => {
    const evt = automationChainEngine.createTelemetryEvent("chain-erp", "s", "failed", 0, FIXTURE_FAIL_LATENCY, "boom");
    expect(evt.error).toBe("boom");
    expect(evt.status).toBe("failed");
  });
});

describe("AutomationChainEngine — recordTelemetryEvent (U-WIRE-AUTOMATION-CHAIN-TELEMETRY)", () => {
  beforeEach(() => { automationChainTelemetryEngine.reset(); });

  it("recordTelemetryEvent returns event with chain_id=chain-erp status=started step_id=step-1", async () => {
    const evt = await automationChainEngine.recordTelemetryEvent("chain-erp", "step-1", "started", 0, 0);
    expect(evt.chain_id).toBe("chain-erp");
    expect(evt.status).toBe("started");
    expect(evt.step_id).toBe("step-1");
  });

  it("recordTelemetryEvent(status=started) increments fires=1, completed=0, failed=0", async () => {
    await automationChainEngine.recordTelemetryEvent("chain-erp", "s", "started", 0, 0);
    const h = automationChainTelemetryEngine.chainHealth("chain-erp")!;
    expect(h.fires).toBe(1);
    expect(h.completed).toBe(0);
    expect(h.failed).toBe(0);
  });

  it("recordTelemetryEvent(completed, 50 tokens, 123ms) yields completed=1 p50=123 tokens=50", async () => {
    await automationChainEngine.recordTelemetryEvent("chain-erp", "s", "completed", FIXTURE_TOKEN_COST, FIXTURE_LATENCY);
    const h = automationChainTelemetryEngine.chainHealth("chain-erp")!;
    expect(h.completed).toBe(1);
    expect(h.latency_p50_ms).toBe(FIXTURE_LATENCY);
    expect(h.token_cost_total).toBe(FIXTURE_TOKEN_COST);
  });

  it("recordTelemetryEvent(failed, error='downstream timeout') stores literal in recent_errors", async () => {
    await automationChainEngine.recordTelemetryEvent("chain-erp", "s", "failed", FIXTURE_FAIL_TOKEN_COST, FIXTURE_FAIL_LATENCY, FIXTURE_ERROR_MSG);
    const h = automationChainTelemetryEngine.chainHealth("chain-erp")!;
    expect(h.failed).toBe(1);
    expect(h.recent_errors).toEqual([FIXTURE_ERROR_MSG]);
  });
});

describe("AutomationChainEngine — seedTelemetryBudgets (U-WIRE-AUTOMATION-CHAIN-TELEMETRY)", () => {
  beforeEach(() => { automationChainTelemetryEngine.reset(); });

  it("seedTelemetryBudgets registers exactly 9 chains and returns 9", async () => {
    const count = await automationChainEngine.seedTelemetryBudgets();
    expect(count).toBe(TASK_CLASS_COUNT);
  });

  it("after seedTelemetryBudgets, token_budget_total = sum of all listChains() budgets", async () => {
    await automationChainEngine.seedTelemetryBudgets();
    const expectedBudget = automationChainEngine.listChains().reduce((s, c) => s + c.token_budget, 0);
    const s = automationChainTelemetryEngine.sessionHealth();
    expect(s.token_budget_total).toBe(expectedBudget);
  });

  it("seedTelemetryBudgets is idempotent (second call still returns 9)", async () => {
    await automationChainEngine.seedTelemetryBudgets();
    const count2 = await automationChainEngine.seedTelemetryBudgets();
    expect(count2).toBe(TASK_CLASS_COUNT);
  });

  it("after seedTelemetryBudgets + record on chain-erp, chainHealth.task_class === 'erp'", async () => {
    await automationChainEngine.seedTelemetryBudgets();
    await automationChainEngine.recordTelemetryEvent("chain-erp", "s", "started", 0, 0);
    expect(automationChainTelemetryEngine.chainHealth("chain-erp")!.task_class).toBe("erp");
  });
});
