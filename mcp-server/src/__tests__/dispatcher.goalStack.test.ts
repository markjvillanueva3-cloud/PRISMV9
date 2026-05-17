/**
 * dispatcher.goalStack.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-GSE dispatcher wiring (GoalStackEngine).
 *
 * Drives 7 read actions through real `prism_dev`. Write methods
 * (push/complete/abandon/completeCascade/clear) DEFERRED — they mutate
 * the singleton state that hooks read; LLM-callable writes would let
 * one chat silently rewrite another chat's goals.
 *
 * For coverage, tests pre-seed via engine-direct push/complete/abandon
 * so the dispatcher reads find populated state. Pre-existing engine
 * state is captured to avoid leakage between tests.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { goalStackEngine } from "../engines/GoalStackEngine.js";

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

let devHandler: CapturedTool["handler"];
let baselineSize: number;
let baselineActiveCount: number;
let rootId: string;
let childId: string;
let abandonedId: string;

beforeAll(() => {
  // Capture baseline state — engine is shared across test files.
  baselineSize = goalStackEngine.all().length;
  baselineActiveCount = goalStackEngine.activeCount();

  // Seed 3 goals via engine-direct writes (deferred from wire surface).
  const root = goalStackEngine.push("Test root goal (gse wire fixture)", {
    priority: 10,
    at: "2026-05-17T12:00:00.000Z",
  });
  rootId = root.id;
  const child = goalStackEngine.push("Test child sub-goal", {
    parentId: rootId,
    priority: 5,
    at: "2026-05-17T12:00:01.000Z",
  });
  childId = child.id;
  const abandoned = goalStackEngine.push("Test abandoned goal", {
    priority: 1,
    at: "2026-05-17T12:00:02.000Z",
  });
  abandonedId = abandoned.id;
  goalStackEngine.abandon(abandonedId, "2026-05-17T12:00:03.000Z");

  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

afterAll(() => {
  // Leave seeded test goals; engine singleton may be needed for other suites.
  // Abandon any test goals still active to avoid leaking 'active' state.
  for (const g of goalStackEngine.all()) {
    if (g.text.startsWith("Test ") && g.status === "active") {
      goalStackEngine.abandon(g.id, "2026-05-17T12:00:99.000Z");
    }
  }
});

describe("WIRE-UNWIRED-MS0/U-WIRE-GSE — Zod schemas", () => {
  it("gse_top_n accepts {} or {n}", () => {
    expect(ACTION_DEV_SCHEMAS["gse_top_n"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["gse_top_n"].safeParse({ n: 10 }).success).toBe(true);
  });

  it("gse_top_n caps n at 100 (DoS guard)", () => {
    expect(ACTION_DEV_SCHEMAS["gse_top_n"].safeParse({ n: 101 }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["gse_top_n"].safeParse({ n: 0 }).success).toBe(false);
  });

  it("gse_get requires id matching /^g\\d+$/", () => {
    expect(ACTION_DEV_SCHEMAS["gse_get"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["gse_get"].safeParse({ id: "not-a-goal-id" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["gse_get"].safeParse({ id: "g42" }).success).toBe(true);
  });

  it("zero-arg actions accept {}", () => {
    for (const a of ["gse_current", "gse_tree", "gse_all", "gse_active_count", "gse_to_json"]) {
      expect(ACTION_DEV_SCHEMAS[a]!.safeParse({}).success).toBe(true);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-GSE — prism_dev :: gse_current", () => {
  it("returns the most-recent active goal via found:true", async () => {
    const r = await invokeHandler(devHandler, "gse_current", {});
    // After our seeding, root + child are still active; current returns one of them
    expect((r as { found?: boolean }).found).toBe(true);
    const goal = (r as { goal: { id: string; status: string } }).goal;
    expect(goal.status).toBe("active");
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-GSE — prism_dev :: gse_top_n", () => {
  it("returns active entries with count parity", async () => {
    const r = await invokeHandler(devHandler, "gse_top_n", { n: 10 });
    const entries = (r as { entries: Array<{ id: string }> }).entries;
    expect((r as { count?: number }).count).toBe(entries.length);
    expect((r as { n?: number }).n).toBe(10);
  });

  it("default n=5 when not specified", async () => {
    const r = await invokeHandler(devHandler, "gse_top_n", {});
    expect((r as { n?: number }).n).toBe(5);
  });

  it("n bound caps the result count even with large goal set", async () => {
    const r = await invokeHandler(devHandler, "gse_top_n", { n: 2 });
    const entries = (r as { entries?: unknown[] }).entries ?? [];
    expect(entries.length).toBeLessThanOrEqual(2);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-GSE — prism_dev :: gse_get", () => {
  it("seeded root id → found:true + correct text + priority", async () => {
    const r = await invokeHandler(devHandler, "gse_get", { id: rootId });
    expect((r as { found?: boolean }).found).toBe(true);
    const g = (r as { goal: { id: string; text: string; priority: number; depth: number; status: string } }).goal;
    expect(g.id).toBe(rootId);
    expect(g.text).toContain("Test root goal");
    expect(g.priority).toBe(10);
    expect(g.depth).toBe(0);
    expect(g.status).toBe("active");
  });

  it("seeded child id → depth=1 + parentId=rootId", async () => {
    const r = await invokeHandler(devHandler, "gse_get", { id: childId });
    expect((r as { found?: boolean }).found).toBe(true);
    const g = (r as { goal: { depth: number; parentId: string | null } }).goal;
    expect(g.depth).toBe(1);
    expect(g.parentId).toBe(rootId);
  });

  it("abandoned id → found:true + status='abandoned'", async () => {
    const r = await invokeHandler(devHandler, "gse_get", { id: abandonedId });
    expect((r as { found?: boolean }).found).toBe(true);
    expect((r as { goal: { status: string } }).goal.status).toBe("abandoned");
  });

  it("unknown id → found:false", async () => {
    const r = await invokeHandler(devHandler, "gse_get", { id: "g999999" });
    expect((r as { found?: boolean }).found).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-GSE — prism_dev :: gse_all + active_count", () => {
  it("all() includes the 3 seeded goals", async () => {
    const r = await invokeHandler(devHandler, "gse_all", {});
    const goals = ((r as { goals?: Array<{ id: string }> }).goals) ?? [];
    const ids = goals.map(g => g.id);
    expect(ids).toContain(rootId);
    expect(ids).toContain(childId);
    expect(ids).toContain(abandonedId);
    expect((r as { count?: number }).count).toBe(goals.length);
  });

  it("active_count increased by exactly 2 vs baseline (root + child; abandoned excluded)", async () => {
    const r = await invokeHandler(devHandler, "gse_active_count", {});
    const c = (r as { active_count?: number }).active_count ?? 0;
    expect(c).toBe(baselineActiveCount + 2);
  });

  it("ROUTING PROOF — wire all() id set equals engine-direct all() id set", async () => {
    const r = await invokeHandler(devHandler, "gse_all", {});
    const wireIds = (((r as { goals?: Array<{ id: string }> }).goals) ?? []).map(g => g.id).sort();
    const directIds = goalStackEngine.all().map(g => g.id).slice().sort();
    expect(wireIds).toEqual(directIds);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-GSE — prism_dev :: gse_tree", () => {
  it("tree includes seeded root with attached child", async () => {
    const r = await invokeHandler(devHandler, "gse_tree", {});
    const tree = ((r as { tree?: Array<{ id: string; children: Array<{ id: string }> }> }).tree) ?? [];
    const root = tree.find(n => n.id === rootId);
    if (!root) throw new Error("seeded rootId not present in tree");
    const childIds = (root.children ?? []).map(c => c.id);
    expect(childIds).toContain(childId);
  });

  it("root_count survivor matches tree.length", async () => {
    const r = await invokeHandler(devHandler, "gse_tree", {});
    const tree = ((r as { tree?: unknown[] }).tree) ?? [];
    expect((r as { root_count?: number }).root_count).toBe(tree.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-GSE — prism_dev :: gse_to_json", () => {
  it("snapshot.schemaVersion=1 + goals[] includes all 3 seeded + nextId > 3", async () => {
    const r = await invokeHandler(devHandler, "gse_to_json", {});
    const snap = (r as { snapshot: { schemaVersion: number; goals: Array<{ id: string }>; nextId: number } }).snapshot;
    expect(snap.schemaVersion).toBe(1);
    const ids = snap.goals.map(g => g.id);
    expect(ids).toContain(rootId);
    expect(ids).toContain(childId);
    expect(ids).toContain(abandonedId);
    // nextId is monotonic — must be strictly past the highest seeded numeric id
    const seededNumericIds = [rootId, childId, abandonedId].map(id => parseInt(id.slice(1), 10));
    const maxSeeded = Math.max(...seededNumericIds);
    expect(snap.nextId).toBeGreaterThan(maxSeeded);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-GSE — error envelope", () => {
  it("gse_get without id → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "gse_get", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("gse_get with malformed id → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "gse_get", { id: "not-a-valid-goal-id" });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("gse_top_n with n > 100 → schema rejects (DoS guard)", async () => {
    const r = await invokeHandler(devHandler, "gse_top_n", { n: 101 });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
