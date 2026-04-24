import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { errorBudgetEngine } from "../engines/ErrorBudgetEngine.js";

/**
 * True dispatcher-invocation E2E for the 4 error_budget_* actions on
 * prism_dev. Mocks McpServer.tool() to capture the handler, then invokes
 * with real {action, params} so Zod validation, param normalization, and
 * lazy engine imports execute through production paths.
 */

type McpHandler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
  content?: Array<{ type: "text"; text: string }>;
  isError?: boolean;
} | Record<string, unknown>>;

function captureHandler(): { handler: McpHandler; schemaActions: readonly string[] } {
  let handler: McpHandler | null = null;
  let enumValues: readonly string[] = [];
  const server = {
    tool(
      _name: string,
      _description: string,
      schema: Record<string, unknown>,
      cb: McpHandler,
    ) {
      handler = cb;
      const action = (schema as { action?: { _def?: { values?: readonly string[]; entries?: Record<string, string> } } }).action;
      if (action?._def?.values) enumValues = action._def.values;
      else if (action?._def?.entries) enumValues = Object.keys(action._def.entries);
    },
  };
  registerDevDispatcher(server as unknown as Parameters<typeof registerDevDispatcher>[0]);
  if (!handler) throw new Error("registerDevDispatcher did not register a handler");
  return { handler, schemaActions: enumValues };
}

async function invoke(
  handler: McpHandler,
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const result = await handler({ action, params });
  const content = (result as { content?: Array<{ text: string }> }).content;
  if (!Array.isArray(content)) return result as Record<string, unknown>;
  return JSON.parse(content[0]?.text ?? "{}");
}

describe("prism_dev error_budget_* actions — dispatcher round-trip", () => {
  let handler: McpHandler;
  let schemaActions: readonly string[];

  beforeEach(() => {
    errorBudgetEngine.reset();
    const captured = captureHandler();
    handler = captured.handler;
    schemaActions = captured.schemaActions;
  });

  it("wiring: all 4 error_budget_* actions appear in the ACTIONS enum", () => {
    expect(schemaActions).toContain("error_budget_set_target");
    expect(schemaActions).toContain("error_budget_record");
    expect(schemaActions).toContain("error_budget_status");
    expect(schemaActions).toContain("error_budget_list");
  });

  it("set_target then status → target controls allowed error rate", async () => {
    await invoke(handler, "error_budget_set_target", {
      service: "svc-a", availabilityTarget: 0.99, windowHours: 24,
    });

    // No events yet — budgetUsed=0, recommendation=proceed
    const empty = await invoke(handler, "error_budget_status", { service: "svc-a" });
    const emptyStatus = empty.status as { budgetUsed: number; recommendation: string; successRate: number };
    expect(emptyStatus.budgetUsed).toBe(0);
    expect(emptyStatus.recommendation).toBe("proceed");
    expect(emptyStatus.successRate).toBe(1);
  });

  it("record → status: 99 successes + 1 failure at 99% target = budgetUsed=1.0, rollback", async () => {
    await invoke(handler, "error_budget_set_target", { service: "svc-b", availabilityTarget: 0.99, windowHours: 24 });
    // Allowed error rate = 0.01. One failure in 100 events = error rate 0.01 = budgetUsed 1.0 → rollback.
    for (let i = 0; i < 99; i++) {
      await invoke(handler, "error_budget_record", { service: "svc-b", success: true });
    }
    await invoke(handler, "error_budget_record", { service: "svc-b", success: false });

    const { status } = await invoke(handler, "error_budget_status", { service: "svc-b" }) as { status: { total: number; failures: number; budgetUsed: number; recommendation: string } };
    expect(status.total).toBe(100);
    expect(status.failures).toBe(1);
    expect(status.budgetUsed).toBeCloseTo(1.0, 5);
    expect(status.recommendation).toBe("rollback");
  });

  it("record weight scales budget impact linearly", async () => {
    await invoke(handler, "error_budget_set_target", { service: "svc-c", availabilityTarget: 0.9, windowHours: 24 });
    // Allowed error rate = 0.1. 10 unit-weight successes + 1 weight-2 failure → err=2/12=0.167 → budgetUsed=1.67 → rollback.
    for (let i = 0; i < 10; i++) {
      await invoke(handler, "error_budget_record", { service: "svc-c", success: true });
    }
    await invoke(handler, "error_budget_record", { service: "svc-c", success: false, weight: 2 });

    const { status } = await invoke(handler, "error_budget_status", { service: "svc-c" }) as { status: { total: number; failures: number; budgetUsed: number; recommendation: string } };
    expect(status.total).toBe(12);
    expect(status.failures).toBe(2);
    expect(status.budgetUsed).toBeCloseTo(2 / 12 / 0.1, 5);
    expect(status.recommendation).toBe("rollback");
  });

  it("list returns both services that have a target and services that only have events", async () => {
    // reset() clears events but preserves targets across tests, so we assert
    // inclusion rather than exact equality — svc-list-target is registered as
    // a target only (no events), svc-list-events is recorded as an event only
    // (no target). Both must appear in listServices().
    await invoke(handler, "error_budget_set_target", { service: "svc-list-target", availabilityTarget: 0.999, windowHours: 1 });
    await invoke(handler, "error_budget_record", { service: "svc-list-events", success: true });
    const { services } = await invoke(handler, "error_budget_list") as { services: string[] };
    expect(services).toContain("svc-list-target");
    expect(services).toContain("svc-list-events");
  });

  it("FAIL: set_target rejects availabilityTarget <= 0", async () => {
    const data = await invoke(handler, "error_budget_set_target", {
      service: "svc-f", availabilityTarget: 0, windowHours: 24,
    });
    expect(String(data.error ?? "")).toMatch(/Invalid params for error_budget_set_target/);
  });

  it("FAIL: set_target rejects availabilityTarget >= 1", async () => {
    const data = await invoke(handler, "error_budget_set_target", {
      service: "svc-g", availabilityTarget: 1, windowHours: 24,
    });
    expect(String(data.error ?? "")).toMatch(/Invalid params for error_budget_set_target/);
  });

  it("FAIL: set_target rejects non-positive windowHours", async () => {
    const data = await invoke(handler, "error_budget_set_target", {
      service: "svc-h", availabilityTarget: 0.99, windowHours: 0,
    });
    expect(String(data.error ?? "")).toMatch(/Invalid params for error_budget_set_target/);
  });

  it("FAIL: record rejects missing service", async () => {
    const data = await invoke(handler, "error_budget_record", { success: true });
    expect(String(data.error ?? "")).toMatch(/Invalid params for error_budget_record/);
  });

  it("FAIL: record rejects non-boolean success", async () => {
    const data = await invoke(handler, "error_budget_record", { service: "svc-i", success: "yes" });
    expect(String(data.error ?? "")).toMatch(/Invalid params for error_budget_record/);
  });

  it("FAIL: record rejects non-positive weight", async () => {
    const data = await invoke(handler, "error_budget_record", { service: "svc-j", success: true, weight: 0 });
    expect(String(data.error ?? "")).toMatch(/Invalid params for error_budget_record/);
  });

  it("ADV: burn-rate boundary — 50% budget used = slow_down recommendation", async () => {
    await invoke(handler, "error_budget_set_target", { service: "svc-k", availabilityTarget: 0.99, windowHours: 24 });
    // Allowed error rate = 0.01. 1 failure in 200 events → error rate 0.005 → budgetUsed 0.5 → slow_down.
    for (let i = 0; i < 199; i++) {
      await invoke(handler, "error_budget_record", { service: "svc-k", success: true });
    }
    await invoke(handler, "error_budget_record", { service: "svc-k", success: false });
    const { status } = await invoke(handler, "error_budget_status", { service: "svc-k" }) as { status: { budgetUsed: number; recommendation: string } };
    expect(status.budgetUsed).toBeCloseTo(0.5, 5);
    expect(status.recommendation).toBe("slow_down");
  });

  it("ADV: freeze threshold at 90% budget used", async () => {
    await invoke(handler, "error_budget_set_target", { service: "svc-l", availabilityTarget: 0.99, windowHours: 24 });
    // Allowed error rate = 0.01. 9 failures in 1000 events → error rate 0.009 → budgetUsed 0.9 → freeze.
    for (let i = 0; i < 991; i++) {
      await invoke(handler, "error_budget_record", { service: "svc-l", success: true });
    }
    for (let i = 0; i < 9; i++) {
      await invoke(handler, "error_budget_record", { service: "svc-l", success: false });
    }
    const { status } = await invoke(handler, "error_budget_status", { service: "svc-l" }) as { status: { budgetUsed: number; recommendation: string } };
    expect(status.budgetUsed).toBeCloseTo(0.9, 5);
    expect(status.recommendation).toBe("freeze");
  });

  it("ADV: default availability target applies when no explicit target was set", async () => {
    // Engine uses 0.999 default + 24h window. Error rate 0.001 = budgetUsed 1.0 → rollback.
    for (let i = 0; i < 999; i++) {
      await invoke(handler, "error_budget_record", { service: "svc-m", success: true });
    }
    await invoke(handler, "error_budget_record", { service: "svc-m", success: false });
    const { status } = await invoke(handler, "error_budget_status", { service: "svc-m" }) as { status: { budgetUsed: number; recommendation: string } };
    expect(status.budgetUsed).toBeCloseTo(1.0, 5);
    expect(status.recommendation).toBe("rollback");
  });

  it("ADV: events outside the window are pruned on status read", async () => {
    await invoke(handler, "error_budget_set_target", { service: "svc-n", availabilityTarget: 0.99, windowHours: 1 });
    const now = Date.now();
    // Event 2 hours ago — outside 1h window
    await invoke(handler, "error_budget_record", { service: "svc-n", success: false, at: now - 2 * 3_600_000 });
    // Events inside window
    await invoke(handler, "error_budget_record", { service: "svc-n", success: true, at: now });
    await invoke(handler, "error_budget_record", { service: "svc-n", success: true, at: now });

    const { status } = await invoke(handler, "error_budget_status", { service: "svc-n" }) as { status: { total: number; failures: number; recommendation: string } };
    expect(status.total).toBe(2);
    expect(status.failures).toBe(0);
    expect(status.recommendation).toBe("proceed");
  });
});
