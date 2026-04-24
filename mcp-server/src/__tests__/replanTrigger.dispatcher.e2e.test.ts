import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

/**
 * True dispatcher-invocation E2E for prism_dev.replan_evaluate.
 * Captures the handler via a mock McpServer.tool() and invokes with real
 * {action, params} so Zod validation + lazy import of
 * ReplanTriggerEngine run through production paths.
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

type Verdict = {
  shouldReplan: boolean;
  severity: "none" | "patch" | "full";
  reasons: Array<{ kind: string; detail: string }>;
  continueHint?: string;
};

const T0 = 1_700_000_000_000;

describe("prism_dev.replan_evaluate — dispatcher round-trip", () => {
  let handler: McpHandler;
  let schemaActions: readonly string[];

  beforeAll(() => {
    const captured = captureHandler();
    handler = captured.handler;
    schemaActions = captured.schemaActions;
  });

  it("wiring: replan_evaluate appears in the prism_dev ACTIONS enum", () => {
    expect(schemaActions).toContain("replan_evaluate");
  });

  it("stable state: no precondition drift → shouldReplan=false, severity=none", async () => {
    const data = await invoke(handler, "replan_evaluate", {
      plan: {
        planId: "P1", createdAt: T0,
        preconditions: { machine_online: true, material_kg: 50 },
      },
      currentState: { machine_online: true, material_kg: 50 },
      currentTime: T0 + 1000,
    });
    const verdict = data.verdict as Verdict;
    expect(verdict.shouldReplan).toBe(false);
    expect(verdict.severity).toBe("none");
    expect(verdict.continueHint).toBe("plan still valid — continue");
    expect(verdict.reasons ?? []).toEqual([]);
  });

  it("precondition drift: boolean flipped → severity=full", async () => {
    const data = await invoke(handler, "replan_evaluate", {
      plan: {
        planId: "P2", createdAt: T0,
        preconditions: { machine_online: true },
      },
      currentState: { machine_online: false },
      currentTime: T0 + 1000,
    });
    const verdict = data.verdict as Verdict;
    expect(verdict.shouldReplan).toBe(true);
    expect(verdict.severity).toBe("full");
    expect(verdict.reasons.some(r => r.kind === "precondition_invalidated" && r.detail === "machine_online")).toBe(true);
  });

  it("deadline missed: currentTime > deadline → severity=full", async () => {
    const deadline = T0 + 5_000;
    const data = await invoke(handler, "replan_evaluate", {
      plan: {
        planId: "P3", createdAt: T0,
        preconditions: {},
        deadlines: { "finish-rough": deadline },
      },
      currentState: {},
      currentTime: deadline + 1, // one ms past deadline
    });
    const verdict = data.verdict as Verdict;
    expect(verdict.severity).toBe("full");
    expect(verdict.reasons.some(r => r.kind === "deadline_missed" && r.detail === "finish-rough")).toBe(true);
  });

  it("resource lost: plan-required resource disappears → severity=full", async () => {
    const data = await invoke(handler, "replan_evaluate", {
      plan: {
        planId: "P4", createdAt: T0,
        preconditions: {},
        resources: ["vmc-01", "coolant-pump"],
      },
      currentState: {},
      lostResources: ["vmc-01"],
      currentTime: T0 + 1000,
    });
    const verdict = data.verdict as Verdict;
    expect(verdict.severity).toBe("full");
    expect(verdict.reasons.some(r => r.kind === "resource_lost" && r.detail === "vmc-01")).toBe(true);
  });

  it("assumption violated only: severity=patch (not full)", async () => {
    const data = await invoke(handler, "replan_evaluate", {
      plan: {
        planId: "P5", createdAt: T0,
        preconditions: {},
        assumptions: { operator_available: true },
      },
      currentState: { operator_available: false },
      currentTime: T0 + 1000,
    });
    const verdict = data.verdict as Verdict;
    expect(verdict.severity).toBe("patch");
    expect(verdict.shouldReplan).toBe(true);
    expect(verdict.reasons.every(r => r.kind === "assumption_violated")).toBe(true);
  });

  it("external event only: severity=patch", async () => {
    const data = await invoke(handler, "replan_evaluate", {
      plan: { planId: "P6", createdAt: T0, preconditions: {} },
      currentState: {},
      externalEvents: ["operator-interrupt"],
      currentTime: T0 + 1000,
    });
    const verdict = data.verdict as Verdict;
    expect(verdict.severity).toBe("patch");
    expect(verdict.reasons.some(r => r.kind === "external_event" && r.detail === "operator-interrupt")).toBe(true);
  });

  it("time budget exceeded: below minTimeBudgetMs → severity=patch", async () => {
    const data = await invoke(handler, "replan_evaluate", {
      plan: { planId: "P7", createdAt: T0, preconditions: {} },
      currentState: {},
      timeBudgetRemainingMs: 500,
      minTimeBudgetMs: 2000,
      currentTime: T0 + 1000,
    });
    const verdict = data.verdict as Verdict;
    expect(verdict.severity).toBe("patch");
    expect(verdict.reasons.some(r => r.kind === "time_budget_exceeded")).toBe(true);
  });

  it("FAIL: missing plan rejected by schema", async () => {
    const data = await invoke(handler, "replan_evaluate", {
      currentState: { x: 1 },
    });
    expect(String(data.error ?? "")).toMatch(/Invalid params for replan_evaluate/);
  });

  it("FAIL: missing planId rejected by schema (min(1))", async () => {
    const data = await invoke(handler, "replan_evaluate", {
      plan: { planId: "", createdAt: T0, preconditions: {} },
      currentState: {},
    });
    expect(String(data.error ?? "")).toMatch(/Invalid params for replan_evaluate/);
  });

  it("FAIL: missing preconditions rejected by schema", async () => {
    const data = await invoke(handler, "replan_evaluate", {
      plan: { planId: "P-bad", createdAt: T0 },
      currentState: {},
    });
    expect(String(data.error ?? "")).toMatch(/Invalid params for replan_evaluate/);
  });

  it("ADV: full + patch reasons mixed → severity=full (full wins)", async () => {
    const data = await invoke(handler, "replan_evaluate", {
      plan: {
        planId: "P8", createdAt: T0,
        preconditions: { online: true },
        assumptions: { fast: true },
      },
      currentState: { online: false, fast: false },
      externalEvents: ["noise"],
      currentTime: T0 + 1000,
    });
    const verdict = data.verdict as Verdict;
    expect(verdict.severity).toBe("full");
    // All three reason families appear
    const kinds = new Set(verdict.reasons.map(r => r.kind));
    expect(kinds.has("precondition_invalidated")).toBe(true);
    expect(kinds.has("assumption_violated")).toBe(true);
    expect(kinds.has("external_event")).toBe(true);
  });

  it("ADV: nested-object precondition uses deep equality", async () => {
    const matching = await invoke(handler, "replan_evaluate", {
      plan: {
        planId: "P9a", createdAt: T0,
        preconditions: { fixture: { id: "F-12", clamp: 2 } },
      },
      currentState: { fixture: { id: "F-12", clamp: 2 } },
      currentTime: T0 + 1000,
    });
    expect((matching.verdict as Verdict).severity).toBe("none");

    const drifted = await invoke(handler, "replan_evaluate", {
      plan: {
        planId: "P9b", createdAt: T0,
        preconditions: { fixture: { id: "F-12", clamp: 2 } },
      },
      currentState: { fixture: { id: "F-12", clamp: 3 } }, // clamp differs
      currentTime: T0 + 1000,
    });
    expect((drifted.verdict as Verdict).severity).toBe("full");
  });

  it("ADV: time-budget default (10_000ms) applies when minTimeBudgetMs omitted", async () => {
    // 5000ms remaining, default threshold is 10_000ms → should flag
    const underDefault = await invoke(handler, "replan_evaluate", {
      plan: { planId: "P10a", createdAt: T0, preconditions: {} },
      currentState: {},
      timeBudgetRemainingMs: 5_000,
      currentTime: T0 + 1000,
    });
    expect((underDefault.verdict as Verdict).reasons.some(r => r.kind === "time_budget_exceeded")).toBe(true);

    // 15000ms remaining, default threshold 10_000 → should NOT flag
    const overDefault = await invoke(handler, "replan_evaluate", {
      plan: { planId: "P10b", createdAt: T0, preconditions: {} },
      currentState: {},
      timeBudgetRemainingMs: 15_000,
      currentTime: T0 + 1000,
    });
    // slimResponse strips empty reasons[] — normalize to []
    const overReasons = (overDefault.verdict as Verdict).reasons ?? [];
    expect(overReasons.some(r => r.kind === "time_budget_exceeded")).toBe(false);
    expect((overDefault.verdict as Verdict).severity).toBe("none");
  });
});
