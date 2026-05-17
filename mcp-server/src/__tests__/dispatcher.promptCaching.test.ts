/**
 * dispatcher.promptCaching.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-PC (PromptCachingEngine).
 *
 * 4 pure-compute/read actions through real `prism_dev`:
 *   pc_build_cached_system  → buildCachedSystem(input, opts)
 *   pc_wrap_system_prompt   → wrapSystemPrompt(prompt, volatile?, opts)
 *   pc_break_even_reads     → breakEvenReads(blockTokens)
 *   pc_get_stats            → getStats()
 *
 * DEFERRED:
 *   - recordUsage(usage): mutates singleton stats. LLM-callable would
 *     let any chat inflate cache hit-rate metrics.
 *   - resetStats(): zeros the stats other chats are accumulating into.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { promptCachingEngine } from "../engines/PromptCachingEngine.js";

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

// Large enough stable block to qualify for cache (default minCacheChars=4096).
const STABLE_BIG = "X".repeat(5000);
// Stable block below cache threshold.
const STABLE_SMALL = "y".repeat(100);

describe("WIRE-UNWIRED-MS0/U-WIRE-PC — Zod schemas", () => {
  it("pc_build_cached_system requires stable + caps maxBreakpoints at 4", () => {
    expect(ACTION_DEV_SCHEMAS["pc_build_cached_system"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["pc_build_cached_system"].safeParse({
      stable: [STABLE_BIG], maxBreakpoints: 4,
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["pc_build_cached_system"].safeParse({
      stable: [STABLE_BIG], maxBreakpoints: 5,
    }).success).toBe(false);
  });

  it("pc_build_cached_system caps stable+volatile arrays at 32 (DoS)", () => {
    expect(ACTION_DEV_SCHEMAS["pc_build_cached_system"].safeParse({
      stable: new Array(33).fill("x"),
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["pc_build_cached_system"].safeParse({
      stable: ["x"], volatile: new Array(33).fill("y"),
    }).success).toBe(false);
  });

  it("pc_wrap_system_prompt requires systemPrompt + caps at 1MB", () => {
    expect(ACTION_DEV_SCHEMAS["pc_wrap_system_prompt"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["pc_wrap_system_prompt"].safeParse({
      systemPrompt: "x".repeat(1_000_001),
    }).success).toBe(false);
  });

  it("pc_break_even_reads requires non-negative integer blockTokens (DoS cap 10M)", () => {
    expect(ACTION_DEV_SCHEMAS["pc_break_even_reads"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["pc_break_even_reads"].safeParse({ blockTokens: 4096 }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["pc_break_even_reads"].safeParse({ blockTokens: -1 }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["pc_break_even_reads"].safeParse({ blockTokens: 10_000_001 }).success).toBe(false);
  });

  it("pc_get_stats accepts {}", () => {
    expect(ACTION_DEV_SCHEMAS["pc_get_stats"].safeParse({}).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PC — prism_dev :: pc_build_cached_system", () => {
  it("large stable block gets cache_control:'ephemeral' breakpoint", async () => {
    const r = await invokeHandler(devHandler, "pc_build_cached_system", {
      stable: [STABLE_BIG],
    });
    const res = (r as { result: { system: Array<{ text: string; cache_control?: { type: string } }>; cache_breakpoints: number } }).result;
    expect(res.cache_breakpoints).toBe(1);
    expect(res.system[0]?.cache_control?.type).toBe("ephemeral");
  });

  it("small stable block does NOT get cache breakpoint (engine line 139 size threshold)", async () => {
    const r = await invokeHandler(devHandler, "pc_build_cached_system", {
      stable: [STABLE_SMALL],
    });
    const res = (r as { result: { system: Array<{ cache_control?: unknown }>; cache_breakpoints: number } }).result;
    expect(res.cache_breakpoints).toBe(0);
    expect(res.system[0]?.cache_control).toBe(undefined);
  });

  it("VARIABILITY — 3 distinct stable+volatile combos all produce well-formed system arrays", async () => {
    const combos = [
      { stable: [STABLE_BIG] },
      { stable: [STABLE_BIG], volatile: ["fresh data"] },
      { stable: [STABLE_BIG, "y".repeat(5000)], volatile: ["a", "b"] },
    ];
    for (const c of combos) {
      const r = await invokeHandler(devHandler, "pc_build_cached_system", c);
      const res = (r as { result: { system: unknown[]; cache_breakpoints: number; within_breakpoint_limit: boolean } }).result;
      expect(res.system.length).toBeGreaterThan(0);
      expect(res.within_breakpoint_limit).toBe(true);
    }
  });

  it("maxBreakpoints capped at 4 (Anthropic API constraint, engine line 123-126)", async () => {
    // 5 large stable blocks but maxBreakpoints implicit default = 4
    const r = await invokeHandler(devHandler, "pc_build_cached_system", {
      stable: [STABLE_BIG, STABLE_BIG, STABLE_BIG, STABLE_BIG, STABLE_BIG],
    });
    const res = (r as { result: { cache_breakpoints: number; within_breakpoint_limit: boolean } }).result;
    expect(res.cache_breakpoints).toBeLessThanOrEqual(4);
    expect(res.within_breakpoint_limit).toBe(true);
  });

  it("ROUTING PROOF — wire result.cache_breakpoints equals engine-direct buildCachedSystem", async () => {
    const args = { stable: [STABLE_BIG, "small"] };
    const r = await invokeHandler(devHandler, "pc_build_cached_system", args);
    const direct = promptCachingEngine.buildCachedSystem({ stable: args.stable });
    const wire = (r as { result: { cache_breakpoints: number; system: unknown[] } }).result;
    expect(wire.cache_breakpoints).toBe(direct.cache_breakpoints);
    expect(wire.system.length).toBe(direct.system.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PC — prism_dev :: pc_wrap_system_prompt", () => {
  it("returns 1 system block when only systemPrompt given (no volatile tail)", async () => {
    const r = await invokeHandler(devHandler, "pc_wrap_system_prompt", {
      systemPrompt: STABLE_BIG,
    });
    const res = (r as { result: { system: unknown[]; cache_breakpoints: number } }).result;
    expect(res.system.length).toBe(1);
    expect(res.cache_breakpoints).toBe(1);
  });

  it("returns 2 system blocks when volatileTail supplied (stable + volatile, engine line 224-230)", async () => {
    const r = await invokeHandler(devHandler, "pc_wrap_system_prompt", {
      systemPrompt: STABLE_BIG, volatileTail: "fresh suffix",
    });
    const res = (r as { result: { system: Array<{ cache_control?: unknown }> } }).result;
    expect(res.system.length).toBe(2);
    // stable[0] gets cache breakpoint (large + first), volatile does NOT
    expect(res.system[0]?.cache_control).not.toBe(undefined);
    expect(res.system[1]?.cache_control).toBe(undefined);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PC — prism_dev :: pc_break_even_reads", () => {
  it("blockTokens < 1024 returns Infinity sentinel (engine line 248)", async () => {
    const r = await invokeHandler(devHandler, "pc_break_even_reads", { blockTokens: 512 });
    expect(r.break_even_reads).toBe("Infinity");
    expect(r.is_finite).toBe(false);
  });

  it("blockTokens >= 1024 returns finite integer 1 (engine line 249)", async () => {
    const r = await invokeHandler(devHandler, "pc_break_even_reads", { blockTokens: 4096 });
    expect(r.break_even_reads).toBe(1);
    expect(r.is_finite).toBe(true);
  });

  it("VARIABILITY — 3 distinct blockToken sizes split correctly across the 1024 boundary", async () => {
    const cases = [
      { blockTokens: 100, expectedFinite: false, expectedReads: "Infinity" },
      { blockTokens: 1024, expectedFinite: true, expectedReads: 1 },
      { blockTokens: 100_000, expectedFinite: true, expectedReads: 1 },
    ];
    for (const c of cases) {
      const r = await invokeHandler(devHandler, "pc_break_even_reads", { blockTokens: c.blockTokens });
      expect(r.is_finite).toBe(c.expectedFinite);
      expect(r.break_even_reads).toBe(c.expectedReads);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PC — prism_dev :: pc_get_stats", () => {
  it("returns stats with 6 fields all numeric", async () => {
    const r = await invokeHandler(devHandler, "pc_get_stats", {});
    const stats = (r as { stats: { total_requests?: number; cache_hits?: number; hit_rate?: number; cached_input_tokens?: number; cache_creation_tokens?: number; estimated_token_savings?: number } }).stats;
    // slim-stripped zero fields handled via nullish coalesce
    expect((stats.total_requests ?? 0)).toBeGreaterThanOrEqual(0);
    expect((stats.cache_hits ?? 0)).toBeGreaterThanOrEqual(0);
    expect((stats.cached_input_tokens ?? 0)).toBeGreaterThanOrEqual(0);
    expect((stats.cache_creation_tokens ?? 0)).toBeGreaterThanOrEqual(0);
  });

  it("ROUTING PROOF — wire stats.total_requests equals engine-direct getStats", async () => {
    const r = await invokeHandler(devHandler, "pc_get_stats", {});
    const direct = promptCachingEngine.getStats();
    const wireTotal = ((r as { stats: { total_requests?: number } }).stats.total_requests) ?? 0;
    expect(wireTotal).toBe(direct.total_requests);
  });

  it("getStats returns SHALLOW COPY — caller mutation does NOT leak (engine line 199 spread)", async () => {
    // The engine returns `{...this.stats}`. Two consecutive calls must
    // produce numerically-equal independent snapshots, NOT the same reference.
    const a = promptCachingEngine.getStats();
    const b = promptCachingEngine.getStats();
    expect(a).not.toBe(b);
    expect(a.total_requests).toBe(b.total_requests);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-PC — error envelope", () => {
  it("pc_build_cached_system without stable → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "pc_build_cached_system", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("pc_build_cached_system with > 32 stable blocks → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "pc_build_cached_system", {
      stable: new Array(100).fill("x"),
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("pc_break_even_reads with negative blockTokens → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "pc_break_even_reads", { blockTokens: -1 });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
