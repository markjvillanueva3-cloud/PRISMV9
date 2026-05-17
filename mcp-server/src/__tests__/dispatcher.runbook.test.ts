/**
 * dispatcher.runbook.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-RBE dispatcher wiring (RunbookEngine).
 *
 * Drives 7 read actions through real `prism_dev`. Write methods
 * (create/update/delete/abortExecution/markReviewed/createStandardRunbooks/
 * clear) DEFERRED — writes mutate the shared incident-playbook registry
 * across sessions.
 *
 * Tests pre-seed via engine-direct createRunbook so dispatcher reads
 * find populated state. Pre-existing engine state captured via baseline.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { runbookEngine } from "../engines/RunbookEngine.js";

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

// Unique test ids so we don't collide with any production runbooks
const RB_INCIDENT_ID = "rbe-test-incident-" + Date.now();
const RB_MAINT_ID = "rbe-test-maintenance-" + Date.now();
const RB_DEPLOY_ID = "rbe-test-deployment-" + Date.now();

let devHandler: CapturedTool["handler"];

beforeAll(() => {
  // Seed 3 runbooks spanning 3 categories. RunbookStep fields per engine:
  // {id, order, title, description, expectedDuration, raci[], automatable, ...}
  const baseStep = (id: string, order: number, title: string) => ({
    id,
    order,
    title,
    description: `Test step ${id}`,
    expectedDuration: 5,
    raci: [{ role: "responsible" as const, team: "ops" }],
    automatable: true,
  });

  const baseMetadata = (owner: string) => ({
    owner,
    reviewers: ["reviewer-a"],
    reviewCycle: 90,
    tags: ["test"],
  });

  runbookEngine.createRunbook({
    id: RB_INCIDENT_ID,
    name: "Test incident response",
    description: "Triage + mitigate test incident",
    category: "incident_response",
    version: "1.0.0",
    steps: [baseStep("s1", 1, "Identify"), baseStep("s2", 2, "Mitigate")],
    triggers: [{ type: "alert", condition: "test-alert", priority: "high", autoExecute: false }],
    metadata: baseMetadata("oncall"),
    enabled: true,
  });

  runbookEngine.createRunbook({
    id: RB_MAINT_ID,
    name: "Test maintenance window",
    description: "Routine maintenance procedure",
    category: "maintenance",
    version: "1.0.0",
    steps: [baseStep("m1", 1, "Drain"), baseStep("m2", 2, "Patch")],
    triggers: [{ type: "schedule", condition: "weekly", priority: "low", autoExecute: false }],
    metadata: baseMetadata("sre"),
    enabled: true,
  });

  runbookEngine.createRunbook({
    id: RB_DEPLOY_ID,
    name: "Test deployment",
    description: "Standard service deployment",
    category: "deployment",
    version: "1.0.0",
    steps: [baseStep("d1", 1, "Build"), baseStep("d2", 2, "Deploy"), baseStep("d3", 3, "Verify")],
    triggers: [{ type: "manual", condition: "release-cut", priority: "medium", autoExecute: false }],
    metadata: baseMetadata("release"),
    enabled: false,
  });

  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

afterAll(() => {
  // Clean only our test fixtures — production state stays intact.
  runbookEngine.deleteRunbook(RB_INCIDENT_ID);
  runbookEngine.deleteRunbook(RB_MAINT_ID);
  runbookEngine.deleteRunbook(RB_DEPLOY_ID);
});

describe("WIRE-UNWIRED-MS0/U-WIRE-RBE — Zod schemas", () => {
  it("get/get_execution/get_raci require non-empty id", () => {
    expect(ACTION_DEV_SCHEMAS["rbe_get_runbook"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["rbe_get_runbook"].safeParse({ id: "x" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["rbe_get_execution"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["rbe_get_raci_matrix"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["rbe_get_raci_matrix"].safeParse({ runbook_id: "x" }).success).toBe(true);
  });

  it("get_executions_for_runbook caps limit at 1000 (DoS guard)", () => {
    expect(ACTION_DEV_SCHEMAS["rbe_get_executions_for_runbook"].safeParse({
      runbook_id: "x", limit: 1001,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["rbe_get_executions_for_runbook"].safeParse({
      runbook_id: "x", limit: 1000,
    }).success).toBe(true);
  });

  it("zero-arg actions accept {}", () => {
    expect(ACTION_DEV_SCHEMAS["rbe_get_active_executions"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["rbe_get_runbooks_needing_review"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["rbe_get_stats"].safeParse({}).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-RBE — prism_dev :: rbe_get_runbook", () => {
  it("seeded incident_response runbook → found:true with name + category + 2 steps", async () => {
    const r = await invokeHandler(devHandler, "rbe_get_runbook", { id: RB_INCIDENT_ID });
    expect((r as { found?: boolean }).found).toBe(true);
    const rb = (r as { runbook: { name: string; category: string; steps: unknown[]; enabled: boolean } }).runbook;
    expect(rb.name).toBe("Test incident response");
    expect(rb.category).toBe("incident_response");
    expect(rb.steps.length).toBe(2);
    expect(rb.enabled).toBe(true);
  });

  it("VARIABILITY — 3 distinct categories (incident_response, maintenance, deployment) each resolve correctly", async () => {
    const cases: Array<{ id: string; expectedCategory: string }> = [
      { id: RB_INCIDENT_ID, expectedCategory: "incident_response" },
      { id: RB_MAINT_ID, expectedCategory: "maintenance" },
      { id: RB_DEPLOY_ID, expectedCategory: "deployment" },
    ];
    for (const c of cases) {
      const r = await invokeHandler(devHandler, "rbe_get_runbook", { id: c.id });
      expect((r as { runbook: { category: string } }).runbook.category).toBe(c.expectedCategory);
    }
  });

  it("unknown id → found:false", async () => {
    const r = await invokeHandler(devHandler, "rbe_get_runbook", { id: "no-such-runbook-" + Date.now() });
    expect((r as { found?: boolean }).found).toBe(false);
  });

  it("ROUTING PROOF — wire runbook byte-equals engine-direct getRunbook()", async () => {
    const r = await invokeHandler(devHandler, "rbe_get_runbook", { id: RB_INCIDENT_ID });
    const wire = (r as { runbook: unknown }).runbook;
    const direct = runbookEngine.getRunbook(RB_INCIDENT_ID);
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-RBE — prism_dev :: rbe_get_execution", () => {
  it("unknown execution id → found:false", async () => {
    const r = await invokeHandler(devHandler, "rbe_get_execution", { id: "exec-never-existed-" + Date.now() });
    expect((r as { found?: boolean }).found).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-RBE — prism_dev :: rbe_get_executions_for_runbook", () => {
  it("seeded runbook with no executions → count:0", async () => {
    const r = await invokeHandler(devHandler, "rbe_get_executions_for_runbook", { runbook_id: RB_INCIDENT_ID });
    expect((r as { count?: number }).count ?? 0).toBe(0);
  });

  it("limit defaults to 10 when not provided (request still has count parity)", async () => {
    const r = await invokeHandler(devHandler, "rbe_get_executions_for_runbook", { runbook_id: RB_DEPLOY_ID });
    const executions = ((r as { executions?: unknown[] }).executions) ?? [];
    expect((r as { count?: number }).count ?? 0).toBe(executions.length);
    expect(executions.length).toBeLessThanOrEqual(10);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-RBE — prism_dev :: rbe_get_active_executions", () => {
  it("returns executions array + count parity", async () => {
    const r = await invokeHandler(devHandler, "rbe_get_active_executions", {});
    const executions = ((r as { executions?: unknown[] }).executions) ?? [];
    expect((r as { count?: number }).count ?? 0).toBe(executions.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-RBE — prism_dev :: rbe_get_raci_matrix", () => {
  it("seeded runbook → found:true with matrix containing per-step RACI assignments", async () => {
    const r = await invokeHandler(devHandler, "rbe_get_raci_matrix", { runbook_id: RB_INCIDENT_ID });
    expect((r as { found?: boolean }).found).toBe(true);
    const m = (r as { matrix: { runbookId: string; steps: Array<{ stepId: string; responsible: string[] }> } }).matrix;
    expect(m.runbookId).toBe(RB_INCIDENT_ID);
    expect(m.steps.length).toBe(2);
    // Both seeded steps assigned responsible:ops
    for (const s of m.steps) {
      expect(s.responsible).toContain("ops");
    }
  });

  it("unknown runbook_id → found:false", async () => {
    const r = await invokeHandler(devHandler, "rbe_get_raci_matrix", { runbook_id: "no-such-runbook-" + Date.now() });
    expect((r as { found?: boolean }).found).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-RBE — prism_dev :: rbe_get_runbooks_needing_review", () => {
  it("returns array + count parity (seeded runbooks were just created, none past review cycle)", async () => {
    const r = await invokeHandler(devHandler, "rbe_get_runbooks_needing_review", {});
    const runbooks = ((r as { runbooks?: unknown[] }).runbooks) ?? [];
    expect((r as { count?: number }).count ?? 0).toBe(runbooks.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-RBE — prism_dev :: rbe_get_stats", () => {
  it("stats.totalRunbooks >= 3 (we seeded 3) + byCategory has our 3 categories", async () => {
    const r = await invokeHandler(devHandler, "rbe_get_stats", {});
    const stats = (r as { stats: { totalRunbooks: number; byCategory: Record<string, number> } }).stats;
    expect(stats.totalRunbooks).toBeGreaterThanOrEqual(3);
    // Our 3 seeded categories must each contribute at least 1
    expect((stats.byCategory.incident_response ?? 0)).toBeGreaterThanOrEqual(1);
    expect((stats.byCategory.maintenance ?? 0)).toBeGreaterThanOrEqual(1);
    expect((stats.byCategory.deployment ?? 0)).toBeGreaterThanOrEqual(1);
  });

  it("ROUTING PROOF — wire stats per-field equal engine-direct getStats()", async () => {
    // slimResponse strips empty `mostExecuted:[]` array from the wire side,
    // so byte-equal JSON compare fails. Compare scalar fields directly and
    // nullish-coalesce the array.
    const r = await invokeHandler(devHandler, "rbe_get_stats", {});
    const wire = (r as { stats: { totalRunbooks: number; totalExecutions: number; successRate: number; avgExecutionTime: number; byCategory: Record<string, number>; mostExecuted?: string[] } }).stats;
    const direct = runbookEngine.getStats();
    expect(wire.totalRunbooks).toBe(direct.totalRunbooks);
    expect(wire.totalExecutions).toBe(direct.totalExecutions);
    expect(wire.successRate).toBe(direct.successRate);
    expect(wire.avgExecutionTime).toBe(direct.avgExecutionTime);
    expect(JSON.stringify(wire.byCategory)).toBe(JSON.stringify(direct.byCategory));
    expect((wire.mostExecuted ?? []).length).toBe(direct.mostExecuted.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-RBE — error envelope", () => {
  it("rbe_get_runbook without id → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "rbe_get_runbook", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("rbe_get_executions_for_runbook with limit > 1000 → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "rbe_get_executions_for_runbook", {
      runbook_id: RB_INCIDENT_ID, limit: 1001,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("rbe_get_raci_matrix without runbook_id → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "rbe_get_raci_matrix", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
