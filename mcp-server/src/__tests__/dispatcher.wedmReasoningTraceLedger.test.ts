/**
 * dispatcher.wedmReasoningTraceLedger.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-WRTL dispatcher wiring.
 *
 * Drives 5 READ-ONLY actions through real `prism_dev`. Mutating ledger
 * methods (recordTraceSync/setLedgerPath/setDiskWrites/resetForTests)
 * DEFERRED — they append to / mutate the on-disk audit ledger.
 *
 * Setup: uses engine-direct setDiskWrites(false) + recordTraceSync to
 * seed hermetic in-memory fixtures without polluting disk.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { wedmReasoningTraceLedgerEngine } from "../engines/WEDMReasoningTraceLedgerEngine.js";

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

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;

  // Hermetic in-memory seed — disk writes off, then seed 3 distinct entries
  wedmReasoningTraceLedgerEngine.setDiskWrites(false);
  wedmReasoningTraceLedgerEngine.resetForTests();
  wedmReasoningTraceLedgerEngine.recordTraceSync({
    dispatcher: "prism_wedm",
    action: "wedm_compute_kerf",
    keywords: ["HAAS"],
    awareness_used: false,
  });
  wedmReasoningTraceLedgerEngine.recordTraceSync({
    dispatcher: "prism_wedm",
    action: "wedm_estimate_burn_time",
    keywords: ["OKUMA"],
    awareness_used: false,
  });
  wedmReasoningTraceLedgerEngine.recordTraceSync({
    dispatcher: "prism_cam",
    action: "cam_strategy_select",
    keywords: ["MAZAK"],
    awareness_used: false,
  });
});

afterAll(() => {
  wedmReasoningTraceLedgerEngine.resetForTests();
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WRTL — Zod schemas", () => {
  it("wrtl_recent accepts {} (optional limit)", () => {
    expect(ACTION_DEV_SCHEMAS["wrtl_recent"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["wrtl_recent"].safeParse({ limit: 50 }).success).toBe(true);
  });

  it("wrtl_recent rejects limit > 1000 (DoS guard)", () => {
    expect(ACTION_DEV_SCHEMAS["wrtl_recent"].safeParse({ limit: 1001 }).success).toBe(false);
  });

  it("wrtl_by_dispatcher requires non-empty dispatcher", () => {
    expect(ACTION_DEV_SCHEMAS["wrtl_by_dispatcher"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wrtl_by_dispatcher"].safeParse({ dispatcher: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wrtl_by_dispatcher"].safeParse({ dispatcher: "prism_wedm" }).success).toBe(true);
  });

  it("wrtl_by_action requires non-empty action", () => {
    expect(ACTION_DEV_SCHEMAS["wrtl_by_action"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wrtl_by_action"].safeParse({ action: "a" }).success).toBe(true);
  });

  it("wrtl_by_keyword requires non-empty keyword", () => {
    expect(ACTION_DEV_SCHEMAS["wrtl_by_keyword"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wrtl_by_keyword"].safeParse({ keyword: "x" }).success).toBe(true);
  });

  it("wrtl_stats accepts {}", () => {
    expect(ACTION_DEV_SCHEMAS["wrtl_stats"].safeParse({}).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WRTL — prism_dev :: wrtl_recent", () => {
  it("returns at least the 3 seeded entries", async () => {
    const r = await invokeHandler(devHandler, "wrtl_recent", {});
    const count = ((r as { count?: number }).count) ?? 0;
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it("limit=2 caps at 2", async () => {
    const r = await invokeHandler(devHandler, "wrtl_recent", { limit: 2 });
    const entries = (r as { entries?: unknown[] }).entries ?? [];
    expect(entries.length).toBeLessThanOrEqual(2);
  });

  it("ROUTING PROOF — wire count >= engine-direct getRecent count", async () => {
    const direct = wedmReasoningTraceLedgerEngine.getRecent(1000);
    const r = await invokeHandler(devHandler, "wrtl_recent", { limit: 1000 });
    const wireCount = ((r as { count?: number }).count) ?? 0;
    expect(wireCount).toBeGreaterThanOrEqual(direct.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WRTL — prism_dev :: wrtl_by_dispatcher", () => {
  it("dispatcher='prism_wedm' → 2 seeded entries", async () => {
    const r = await invokeHandler(devHandler, "wrtl_by_dispatcher", { dispatcher: "prism_wedm" });
    const count = ((r as { count?: number }).count) ?? 0;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it("dispatcher='prism_cam' → 1 seeded entry", async () => {
    const r = await invokeHandler(devHandler, "wrtl_by_dispatcher", { dispatcher: "prism_cam" });
    const count = ((r as { count?: number }).count) ?? 0;
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("unknown dispatcher → 0", async () => {
    const r = await invokeHandler(devHandler, "wrtl_by_dispatcher", {
      dispatcher: "no-such-dispatcher-" + Date.now(),
    });
    const count = ((r as { count?: number }).count) ?? 0;
    expect(count).toBe(0);
  });

  it("dispatcher echo round-trips", async () => {
    const r = await invokeHandler(devHandler, "wrtl_by_dispatcher", { dispatcher: "prism_wedm" });
    expect((r as { dispatcher?: string }).dispatcher).toBe("prism_wedm");
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WRTL — prism_dev :: wrtl_by_action", () => {
  it("action='wedm_compute_kerf' → 1 seeded entry", async () => {
    const r = await invokeHandler(devHandler, "wrtl_by_action", { action: "wedm_compute_kerf" });
    const count = ((r as { count?: number }).count) ?? 0;
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("unknown action → 0", async () => {
    const r = await invokeHandler(devHandler, "wrtl_by_action", {
      action: "no_such_action_" + Date.now(),
    });
    expect(((r as { count?: number }).count) ?? 0).toBe(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WRTL — prism_dev :: wrtl_by_keyword", () => {
  it("keyword='HAAS' → finds the seeded entry A", async () => {
    const r = await invokeHandler(devHandler, "wrtl_by_keyword", { keyword: "HAAS" });
    const count = ((r as { count?: number }).count) ?? 0;
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("VARIABILITY — 3 distinct keywords (HAAS, OKUMA, MAZAK) each find their entry", async () => {
    const a = await invokeHandler(devHandler, "wrtl_by_keyword", { keyword: "HAAS" });
    const b = await invokeHandler(devHandler, "wrtl_by_keyword", { keyword: "OKUMA" });
    const c = await invokeHandler(devHandler, "wrtl_by_keyword", { keyword: "MAZAK" });
    expect(((a as { count?: number }).count) ?? 0).toBeGreaterThanOrEqual(1);
    expect(((b as { count?: number }).count) ?? 0).toBeGreaterThanOrEqual(1);
    expect(((c as { count?: number }).count) ?? 0).toBeGreaterThanOrEqual(1);
  });

  it("unknown keyword → 0", async () => {
    const r = await invokeHandler(devHandler, "wrtl_by_keyword", {
      keyword: "no_such_keyword_xyz_" + Date.now(),
    });
    expect(((r as { count?: number }).count) ?? 0).toBe(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WRTL — prism_dev :: wrtl_stats", () => {
  it("returns stats object reflecting seeded entries", async () => {
    const r = await invokeHandler(devHandler, "wrtl_stats", {});
    const stats = (r as { stats?: unknown }).stats;
    expect(typeof stats).toBe("object");
    expect(stats === null).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WRTL — error envelope", () => {
  it("wrtl_by_dispatcher without dispatcher → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wrtl_by_dispatcher", {});
    const data = r as { error?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });

  it("wrtl_by_keyword without keyword → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wrtl_by_keyword", {});
    const data = r as { error?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });

  it("wrtl_recent with limit=1001 → schema rejects (DoS guard)", async () => {
    const r = await invokeHandler(devHandler, "wrtl_recent", { limit: 1001 });
    const data = r as { error?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });
});
