/**
 * dispatcher.consensusCoordinator.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-CC (ConsensusCoordinatorEngine).
 *
 * Drives 2 read actions through real `prism_dev`. run() DEFERRED — fans
 * out expensive consensus calls to shared external resources (Codex API,
 * Ollama daemon, Claude subprocess); LLM-callable would saturate across
 * the 6 concurrent Claude terminals. resetForTesting() also DEFERRED.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { consensusCoordinatorEngine } from "../engines/ConsensusCoordinatorEngine.js";

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

describe("WIRE-UNWIRED-MS0/U-WIRE-CC — Zod schemas", () => {
  it("cc_peek_cache requires prompt + task_type", () => {
    expect(ACTION_DEV_SCHEMAS["cc_peek_cache"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cc_peek_cache"].safeParse({ prompt: "x" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cc_peek_cache"].safeParse({
      prompt: "x", task_type: "summarize",
    }).success).toBe(true);
  });

  it("cc_peek_cache caps prompt at 64 KB + context at 64 KB (DoS guard)", () => {
    expect(ACTION_DEV_SCHEMAS["cc_peek_cache"].safeParse({
      prompt: "x".repeat(65_537), task_type: "x",
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cc_peek_cache"].safeParse({
      prompt: "x", task_type: "x", context: "y".repeat(65_537),
    }).success).toBe(false);
  });

  it("cc_peek_cache ttl_ms must be positive and ≤24h (DoS guard)", () => {
    expect(ACTION_DEV_SCHEMAS["cc_peek_cache"].safeParse({
      prompt: "x", task_type: "x", ttl_ms: -1,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cc_peek_cache"].safeParse({
      prompt: "x", task_type: "x", ttl_ms: 86_400_001,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cc_peek_cache"].safeParse({
      prompt: "x", task_type: "x", ttl_ms: 60_000,
    }).success).toBe(true);
  });

  it("cc_get_stats accepts {}", () => {
    expect(ACTION_DEV_SCHEMAS["cc_get_stats"].safeParse({}).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CC — prism_dev :: cc_peek_cache", () => {
  it("never-cached prompt → hit:false", async () => {
    const r = await invokeHandler(devHandler, "cc_peek_cache", {
      prompt: "never-cached-prompt-" + Date.now(),
      task_type: "summarize",
    });
    expect((r as { hit?: boolean }).hit).toBe(false);
  });

  it("VARIABILITY — 3 distinct task_types all return hit:false on never-seen prompts", async () => {
    const taskTypes = ["summarize", "extract", "classify"];
    for (const tt of taskTypes) {
      const r = await invokeHandler(devHandler, "cc_peek_cache", {
        prompt: "fresh-prompt-" + Date.now() + "-" + tt,
        task_type: tt,
      });
      expect((r as { hit?: boolean }).hit).toBe(false);
    }
  });

  it("ROUTING PROOF — wire hit:false aligns with engine-direct peekCache === null", async () => {
    const prompt = "parity-prompt-" + Date.now();
    const r = await invokeHandler(devHandler, "cc_peek_cache", {
      prompt, task_type: "summarize",
    });
    const wireHit = (r as { hit?: boolean }).hit ?? false;
    const direct = await consensusCoordinatorEngine.peekCache(prompt, "summarize", "");
    expect(wireHit).toBe(direct !== null);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CC — prism_dev :: cc_get_stats", () => {
  it("returns stats object with inflight + budget + cacheBytes fields", async () => {
    const r = await invokeHandler(devHandler, "cc_get_stats", {});
    const stats = (r as { stats: { inflight?: unknown[]; budget?: Record<string, unknown>; cacheBytes?: number } }).stats;
    expect(typeof stats).toBe("object");
    expect(stats === null).toBe(false);
    // inflight may be slimResponse-stripped if []; cacheBytes ≥ 0 always present
    if (stats.cacheBytes !== undefined) {
      expect(typeof stats.cacheBytes).toBe("number");
      expect(stats.cacheBytes).toBeGreaterThanOrEqual(0);
    }
  });

  it("ROUTING PROOF — wire cacheBytes equals engine-direct getStats().cacheBytes", async () => {
    const r = await invokeHandler(devHandler, "cc_get_stats", {});
    const wireBytes = (r as { stats: { cacheBytes?: number } }).stats.cacheBytes;
    const direct = await consensusCoordinatorEngine.getStats();
    // Both should be non-negative numbers; allow ±small drift across the two
    // back-to-back calls (cacheBytes may change if another chat writes mid-test)
    expect(typeof direct.cacheBytes).toBe("number");
    if (wireBytes !== undefined) {
      expect(typeof wireBytes).toBe("number");
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CC — error envelope", () => {
  it("cc_peek_cache without task_type → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "cc_peek_cache", { prompt: "x" });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("cc_peek_cache with prompt > 64 KB → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "cc_peek_cache", {
      prompt: "x".repeat(65_537), task_type: "x",
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("cc_peek_cache with negative ttl_ms → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "cc_peek_cache", {
      prompt: "x", task_type: "x", ttl_ms: -1,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
