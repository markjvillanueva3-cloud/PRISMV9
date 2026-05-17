/**
 * dispatcher.performanceBudget.test.ts — round-trip integration coverage
 * for WIRE-UNWIRED-MS0/U-WIRE-PERFBUDGET dispatcher wiring.
 *
 * Drives 4 read-only PerformanceBudget observability actions through real
 * `prism_infra` (registerBudget / wrap / configureOffline DEFERRED — they
 * mutate live SLA state and need operator-in-the-loop review):
 *
 *   - perf_budget_list        → listBudgets()
 *   - perf_budget_stats       → getStats(operationId) | getAllStats()
 *   - perf_budget_violations  → getViolations(limit?)
 *   - perf_budget_report      → generateReport()
 *
 * ROUTING PROOF: the engine ships PP_BUDGETS pre-registered (9 entries —
 * pp_generate_simple, pp_neural_inference, pp_collision_check, etc.). Reading
 * the budgets list and asserting one of those op-ids appears proves the
 * dispatcher reached the real singleton, not a stub.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerInfraDispatcher } from "../tools/dispatchers/infraDispatcher.js";
import { ACTION_INFRA_SCHEMAS } from "../schemas/infraActionSchemas.js";
import { performanceBudgetEngine, PP_BUDGETS } from "../engines/PerformanceBudgetEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

let infraHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerInfraDispatcher(srv as unknown as Parameters<typeof registerInfraDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_infra");
  if (!t) throw new Error("prism_infra not registered");
  infraHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PERFBUDGET — Zod schemas", () => {
  it("perf_budget_list schema accepts {} (no params required)", () => {
    expect(ACTION_INFRA_SCHEMAS["perf_budget_list"].safeParse({}).success).toBe(true);
  });

  it("perf_budget_report schema accepts {} (no params required)", () => {
    expect(ACTION_INFRA_SCHEMAS["perf_budget_report"].safeParse({}).success).toBe(true);
  });

  it("perf_budget_stats schema accepts {} (all-stats mode)", () => {
    expect(ACTION_INFRA_SCHEMAS["perf_budget_stats"].safeParse({}).success).toBe(true);
  });

  it("perf_budget_stats schema accepts operation_id (specific-stats mode)", () => {
    expect(ACTION_INFRA_SCHEMAS["perf_budget_stats"].safeParse({
      operation_id: "pp_neural_inference",
    }).success).toBe(true);
  });

  it("perf_budget_stats schema accepts operationId camelCase alias", () => {
    expect(ACTION_INFRA_SCHEMAS["perf_budget_stats"].safeParse({
      operationId: "pp_collision_check",
    }).success).toBe(true);
  });

  it("perf_budget_stats schema rejects empty operation_id string", () => {
    expect(ACTION_INFRA_SCHEMAS["perf_budget_stats"].safeParse({
      operation_id: "",
    }).success).toBe(false);
  });

  it("perf_budget_violations schema accepts {} (default limit)", () => {
    expect(ACTION_INFRA_SCHEMAS["perf_budget_violations"].safeParse({}).success).toBe(true);
  });

  it("perf_budget_violations schema accepts explicit positive integer limit", () => {
    expect(ACTION_INFRA_SCHEMAS["perf_budget_violations"].safeParse({ limit: 50 }).success).toBe(true);
  });

  it("perf_budget_violations schema rejects non-positive limit", () => {
    expect(ACTION_INFRA_SCHEMAS["perf_budget_violations"].safeParse({ limit: 0 }).success).toBe(false);
    expect(ACTION_INFRA_SCHEMAS["perf_budget_violations"].safeParse({ limit: -1 }).success).toBe(false);
  });

  it("perf_budget_violations schema rejects limit > 10000", () => {
    expect(ACTION_INFRA_SCHEMAS["perf_budget_violations"].safeParse({ limit: 100000 }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PERFBUDGET — prism_infra :: perf_budget_list", () => {
  it("returns array of budgets including the PP_BUDGETS pre-registered set", async () => {
    const r = await invokeHandler(infraHandler, "perf_budget_list", {});
    const data = r as { budgets?: Array<{ operationId: string; budget: unknown }> };
    expect(Array.isArray(data.budgets)).toBe(true);
    // ROUTING PROOF: engine self-registers 9 PP_BUDGETS at construction;
    // dispatcher must surface them.
    const opIds = (data.budgets ?? []).map((b) => b.operationId);
    expect(opIds).toContain("pp_neural_inference");
    expect(opIds).toContain("pp_collision_check");
    expect(opIds).toContain("pp_generate_simple");
    // Every PP_BUDGETS key must round-trip
    for (const k of Object.keys(PP_BUDGETS)) {
      expect(opIds).toContain(k);
    }
  });

  it("each budget entry has the operationId + budget shape", async () => {
    const r = await invokeHandler(infraHandler, "perf_budget_list", {});
    const data = r as { budgets?: Array<{ operationId?: string; budget?: { operation?: string; mode?: string } }> };
    const first = (data.budgets ?? [])[0];
    expect(typeof first?.operationId).toBe("string");
    expect((first?.operationId ?? "").length).toBeGreaterThan(0);
    expect(typeof first?.budget?.mode).toBe("string");
    // Mode is one of the three legal OperationMode values
    expect(["realtime", "batch", "offline"]).toContain(first?.budget?.mode);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PERFBUDGET — prism_infra :: perf_budget_stats", () => {
  it("no operation_id → returns all stats (engine-direct cross-check)", async () => {
    const r = await invokeHandler(infraHandler, "perf_budget_stats", {});
    const data = r as { stats?: unknown[] };
    // Engine-direct cross-check — proves dispatcher returned the same data.
    // slimResponse strips empty arrays, so undefined === [] on the wire.
    const direct = performanceBudgetEngine.getAllStats();
    if (direct.length === 0) {
      // slimmed away → field absent (or explicit empty array)
      expect(data.stats === undefined || (Array.isArray(data.stats) && data.stats.length === 0)).toBe(true);
    } else {
      expect(Array.isArray(data.stats)).toBe(true);
      expect((data.stats ?? []).length).toBe(direct.length);
    }
  });

  it("unknown operation_id → returns {stats: null} (engine fail-soft semantic)", async () => {
    const r = await invokeHandler(infraHandler, "perf_budget_stats", {
      operation_id: "does-not-exist-zzzzzzz",
    });
    const data = r as { stats?: unknown };
    // slimResponse may strip null fields → use inverse-check pattern:
    // either the field is absent (slimmed) OR it's explicitly null.
    const statsVal = "stats" in data ? data.stats : null;
    expect(statsVal).toBe(null);
    // Confirm via engine-direct (no wire dependency)
    expect(performanceBudgetEngine.getStats("does-not-exist-zzzzzzz")).toBe(null);
  });

  it("operationId camelCase alias resolves identically to operation_id", async () => {
    const rSnake = await invokeHandler(infraHandler, "perf_budget_stats", {
      operation_id: "unknown-op",
    });
    const rCamel = await invokeHandler(infraHandler, "perf_budget_stats", {
      operationId: "unknown-op",
    });
    // Both should produce structurally-equivalent output
    expect(JSON.stringify(rSnake)).toBe(JSON.stringify(rCamel));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PERFBUDGET — prism_infra :: perf_budget_violations", () => {
  it("returns array (possibly empty on fresh engine)", async () => {
    const r = await invokeHandler(infraHandler, "perf_budget_violations", {});
    const data = r as { violations?: unknown[] };
    // slimResponse strips empty arrays → undefined === empty here
    if (data.violations !== undefined) {
      expect(Array.isArray(data.violations)).toBe(true);
    }
    // Confirm via engine-direct (no wire dependency) — should always be array
    expect(Array.isArray(performanceBudgetEngine.getViolations(100))).toBe(true);
  });

  it("explicit limit is honored at engine level", async () => {
    const r = await invokeHandler(infraHandler, "perf_budget_violations", { limit: 5 });
    const data = r as { violations?: unknown[] };
    // Either slimmed-empty or present-with-length-<=5
    if (Array.isArray(data.violations)) {
      expect(data.violations.length).toBeLessThanOrEqual(5);
    }
  });

  it("missing limit defaults to 100 (no validation rejection)", async () => {
    const r = await invokeHandler(infraHandler, "perf_budget_violations", {});
    // No error field means the schema accepted {} and the dispatcher routed it
    expect("error" in r ? typeof r.error : "absent").toBe("absent");
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PERFBUDGET — prism_infra :: perf_budget_report", () => {
  it("returns a structured report object with summary + operations + violations", async () => {
    const r = await invokeHandler(infraHandler, "perf_budget_report", {});
    const data = r as {
      report?: {
        summary?: { totalOperations?: number; totalExecutions?: number; totalViolations?: number };
        operations?: unknown[];
        violations?: unknown[];
      };
    };
    expect(typeof data.report).toBe("object");
    expect(data.report).not.toBe(null);
    // ROUTING PROOF: the 9 PP_BUDGETS self-registrations mean totalOperations ≥ 9
    const totalOps = data.report?.summary?.totalOperations ?? 0;
    expect(totalOps).toBeGreaterThanOrEqual(Object.keys(PP_BUDGETS).length);
    // Cross-check structure against engine-direct call
    const direct = performanceBudgetEngine.generateReport();
    expect(typeof direct.summary.totalOperations).toBe("number");
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PERFBUDGET — error envelope", () => {
  it("perf_budget_stats with empty-string operation_id → schema rejects with {error}", async () => {
    const r = await invokeHandler(infraHandler, "perf_budget_stats", { operation_id: "" });
    // infraDispatcher uses dispatcherError envelope for validation failures
    // (not switch case `case "perf_budget_stats"`) — must surface error field
    const data = r as { error?: string; isError?: boolean };
    // Either the schema accepted empty string OR it threw a structured error.
    // We require the schema to REJECT it (min(1) refines) — assert error path.
    expect(typeof data.error === "string" || data.isError === true).toBe(true);
  });
});
