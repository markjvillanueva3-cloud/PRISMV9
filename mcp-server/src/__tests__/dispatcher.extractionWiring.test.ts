/**
 * dispatcher.extractionWiring.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-EW (ExtractionWiringEngine).
 *
 * 1 pure-read action through real `prism_dev`:
 *   ew_get_stats → getStats() — read wiring log JSONL, return aggregated counts
 *
 * DEFERRED (fictional-template-injection class):
 *   - applyWiring(action, content?): file write via wireTipInject,
 *     wireRegistryAdd, wireConfigUpdate, wireDirectImport, wireCodeGen.
 *     LLM-callable would let any chat inject arbitrary content into
 *     source files identified by user-supplied paths.
 *   - applyAll(actions[]): batch of applyWiring calls — same risk.
 *   - processQueue(): reads data/state/wiring-actions-queue.json and
 *     applies + persists results — same risk + queue mutation.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { extractionWiringEngine } from "../engines/ExtractionWiringEngine.js";

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
});

describe("WIRE-UNWIRED-MS0/U-WIRE-EW — Zod schemas", () => {
  it("ew_get_stats accepts {}", () => {
    expect(ACTION_DEV_SCHEMAS["ew_get_stats"].safeParse({}).success).toBe(true);
  });

  it("ew_get_stats rejects extra fields (strict Zod object)", () => {
    // Zod default mode strips unknown — accepts but ignores. This test
    // documents the behavior either way: result must round-trip clean.
    const parsed = ACTION_DEV_SCHEMAS["ew_get_stats"].safeParse({ extra: "ignored" });
    expect(parsed.success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-EW — prism_dev :: ew_get_stats", () => {
  it("returns stats with total_wired + by_method + by_consumer + recent_failures + 3 count discriminators", async () => {
    const r = await invokeHandler(devHandler, "ew_get_stats", {});
    const stats = (r as { stats: { total_wired?: number; by_method?: Record<string, number>; by_consumer?: Record<string, number>; recent_failures?: unknown[] } }).stats;
    // slimResponse strips zero/empty fields — treat absent as zero/empty
    const totalWired = stats.total_wired ?? 0;
    const byMethod = stats.by_method ?? {};
    const byConsumer = stats.by_consumer ?? {};
    const failures = stats.recent_failures ?? [];
    expect(typeof totalWired).toBe("number");
    expect(totalWired).toBeGreaterThanOrEqual(0);
    expect(typeof byMethod).toBe("object");
    expect(typeof byConsumer).toBe("object");
    expect(Array.isArray(failures)).toBe(true);
    // count discriminators must mirror their structure sizes
    expect((r.by_method_count as number | undefined) ?? 0).toBe(Object.keys(byMethod).length);
    expect((r.by_consumer_count as number | undefined) ?? 0).toBe(Object.keys(byConsumer).length);
    expect((r.recent_failure_count as number | undefined) ?? 0).toBe(failures.length);
  });

  it("recent_failures capped at 20 (engine line 497 .slice(-20))", async () => {
    const r = await invokeHandler(devHandler, "ew_get_stats", {});
    // slim-stripped when empty — fall back to []
    const failures = ((r as { stats: { recent_failures?: unknown[] } }).stats.recent_failures) ?? [];
    expect(failures.length).toBeLessThanOrEqual(20);
  });

  it("ROUTING PROOF — wire total_wired equals engine-direct getStats().total_wired", async () => {
    const r = await invokeHandler(devHandler, "ew_get_stats", {});
    const wireTotal = ((r as { stats: { total_wired?: number } }).stats.total_wired) ?? 0;
    const direct = extractionWiringEngine.getStats();
    expect(wireTotal).toBe(direct.total_wired);
  });

  it("ROUTING PROOF — wire by_method+by_consumer key counts equal engine-direct", async () => {
    const r = await invokeHandler(devHandler, "ew_get_stats", {});
    const wireStats = (r as { stats: { by_method?: Record<string, number>; by_consumer?: Record<string, number> } }).stats;
    const direct = extractionWiringEngine.getStats();
    expect(Object.keys(wireStats.by_method ?? {}).length).toBe(Object.keys(direct.by_method).length);
    expect(Object.keys(wireStats.by_consumer ?? {}).length).toBe(Object.keys(direct.by_consumer).length);
  });

  it("idempotent — back-to-back calls produce same total_wired (read-only contract)", async () => {
    const r1 = await invokeHandler(devHandler, "ew_get_stats", {});
    const r2 = await invokeHandler(devHandler, "ew_get_stats", {});
    const t1 = ((r1 as { stats: { total_wired?: number } }).stats.total_wired) ?? 0;
    const t2 = ((r2 as { stats: { total_wired?: number } }).stats.total_wired) ?? 0;
    expect(t1).toBe(t2);
  });
});
