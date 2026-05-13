/**
 * contextDispatcher.aimax.test.ts — focused wiring tests for AI-MAX-MS0
 * U-AIMAX07 (Hierarchical Context Compression) + U-AIMAX08 (Automatic
 * Context Checkpointing).
 *
 * Companion to the engine-level suites at
 *   - ContextCompressionEngine.test.ts (40 cases incl. dispatcher round-trip)
 *   - ContextCheckpointEngine.test.ts (53 cases incl. dispatcher round-trip)
 *
 * Those files prove the engines + happy-path wiring. This file pins down the
 * DISPATCHER-LAYER invariants that are not visible from the engine alone:
 *
 *   1. slimResponse() bypass for null threshold (checkpoint_should). The wire
 *      payload MUST carry threshold=null literally; slim would otherwise drop
 *      it to undefined.
 *   2. Zod-level rejection of malformed config/policy patches (NaN, Infinity,
 *      non-int, bare-zero thresholds, sub-1024 maxBytes) before the engine is
 *      even called. Every assertion checks the error message contains the
 *      offending parameter NAME — proves Zod identified the right field.
 *   3. Round-trip stability of CompressionPolicy + CheckpointConfig defaults
 *      via the wire-level pick (no `as any`, no clockMs leakage).
 *   4. Variability — 3+ priority tiers exercised through the wire.
 *
 * All tests run through `registerContextDispatcher` so they exercise the same
 * code path an MCP client would hit. No mocks of the engine; failure here =
 * real dispatcher contract drift.
 *
 * @module __tests__/contextDispatcher.aimax
 */

import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { contextCompressionEngine } from "../engines/ContextCompressionEngine.js";
import { contextCheckpointEngine, DEFAULT_EDIT_THRESHOLDS } from "../engines/ContextCheckpointEngine.js";
import { registerContextDispatcher } from "../tools/dispatchers/contextDispatcher.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): Promise<Handler> {
  return new Promise((resolve) => {
    const fakeServer = {
      tool(_n: string, _d: string, _s: any, fn: Handler) {
        resolve(fn);
      },
    };
    registerContextDispatcher(fakeServer);
  });
}

async function call(h: Handler, action: string, params: Record<string, any> = {}): Promise<any> {
  const r = await h({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try {
    return JSON.parse(text);
  } catch {
    return r;
  }
}

// ---------------------------------------------------------------
// 1) slimResponse() bypass — checkpoint_should preserves literal null
// ---------------------------------------------------------------
describe("dispatcher U-AIMAX08 — checkpoint_should preserves literal null", () => {
  let handler: Handler;
  beforeAll(async () => {
    handler = await createServer();
  });
  beforeEach(() => contextCheckpointEngine.reset());

  it("returns threshold=null (NOT undefined) when below first threshold", async () => {
    // Bypass-slim is the whole point of this assertion; without it, the slim
    // helper would strip null and the test would see undefined.
    const r = await call(handler, "checkpoint_should", { sessionId: "wire-null" });
    expect(r.success).toBe(true);
    expect(r.data.shouldCheckpoint).toBe(false);
    // The literal key must be present AND have value null on the wire.
    expect(Object.prototype.hasOwnProperty.call(r.data, "threshold")).toBe(true);
    expect(r.data.threshold).toBeNull();
  });

  it("returns threshold=15 (number) at first threshold", async () => {
    for (let i = 0; i < 15; i += 1) {
      await call(handler, "checkpoint_record_edit", { sessionId: "wire-15" });
    }
    const r = await call(handler, "checkpoint_should", { sessionId: "wire-15" });
    expect(r.data.shouldCheckpoint).toBe(true);
    expect(typeof r.data.threshold).toBe("number");
    expect(r.data.threshold).toBe(15);
  });
});

// ---------------------------------------------------------------
// 2) Zod-tightening — invalid config/policy patches rejected at schema layer
//    Each assertion verifies the error names the offending parameter — proves
//    Zod identified the right field, not just "something failed".
// ---------------------------------------------------------------
describe("dispatcher U-AIMAX08 — checkpoint_config Zod constraints", () => {
  let handler: Handler;
  beforeAll(async () => {
    handler = await createServer();
  });
  beforeEach(() => contextCheckpointEngine.reset());

  it("rejects NaN threshold at schema layer (before engine)", async () => {
    // JSON.stringify(NaN) → null, so the payload arrives as [null]; either way
    // the schema's .finite() / .int() / .positive() chain catches it as a type
    // error referencing the `thresholds` path.
    const r = await call(handler, "checkpoint_config", { set: { thresholds: [NaN] } });
    expect(r.error).toMatch(/thresholds/i);
  });

  it("rejects Infinity threshold at schema layer", async () => {
    const r = await call(handler, "checkpoint_config", { set: { thresholds: [Infinity, 10, 20] } });
    expect(r.error).toMatch(/thresholds/i);
  });

  it("rejects non-integer threshold at schema layer", async () => {
    const r = await call(handler, "checkpoint_config", { set: { thresholds: [5.5, 10, 20] } });
    expect(r.error).toMatch(/thresholds/i);
  });

  it("rejects zero threshold at schema layer (.positive() guard)", async () => {
    const r = await call(handler, "checkpoint_config", { set: { thresholds: [0, 10, 20] } });
    expect(r.error).toMatch(/thresholds/i);
  });

  it("rejects negative threshold at schema layer", async () => {
    const r = await call(handler, "checkpoint_config", { set: { thresholds: [-1, 10, 20] } });
    expect(r.error).toMatch(/thresholds/i);
  });

  it("rejects empty thresholds at schema layer (min(1))", async () => {
    const r = await call(handler, "checkpoint_config", { set: { thresholds: [] } });
    expect(r.error).toMatch(/thresholds/i);
  });

  it("rejects sub-1024 maxBytes at schema layer", async () => {
    const r = await call(handler, "checkpoint_config", { set: { maxBytes: 500 } });
    expect(r.error).toMatch(/maxBytes/i);
  });

  it("rejects non-int maxCheckpointsPerSession at schema layer", async () => {
    const r = await call(handler, "checkpoint_config", { set: { maxCheckpointsPerSession: 5.5 } });
    expect(r.error).toMatch(/maxCheckpointsPerSession/i);
  });
});

describe("dispatcher U-AIMAX07 — compression_policy Zod constraints", () => {
  let handler: Handler;
  beforeAll(async () => {
    handler = await createServer();
  });
  beforeEach(() => contextCompressionEngine.reset());

  it("rejects NaN headChars at schema layer", async () => {
    const r = await call(handler, "compression_policy", { set: { headChars: NaN } });
    expect(r.error).toMatch(/headChars/i);
  });

  it("rejects Infinity tailChars at schema layer", async () => {
    const r = await call(handler, "compression_policy", { set: { tailChars: Infinity } });
    expect(r.error).toMatch(/tailChars/i);
  });

  it("rejects non-integer minEntityLen at schema layer", async () => {
    const r = await call(handler, "compression_policy", { set: { minEntityLen: 3.7 } });
    expect(r.error).toMatch(/minEntityLen/i);
  });
});

// ---------------------------------------------------------------
// 3) Round-trip defaults — wire payload is clean (no clockMs leak, no any-cast)
// ---------------------------------------------------------------
describe("dispatcher U-AIMAX08 — checkpoint_config wire payload purity", () => {
  let handler: Handler;
  beforeAll(async () => {
    handler = await createServer();
  });
  beforeEach(() => contextCheckpointEngine.reset());

  it("wire payload omits non-serializable clockMs function", async () => {
    const r = await call(handler, "checkpoint_config", {});
    expect(r.success).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(r.data.config, "clockMs")).toBe(false);
    expect(r.data.config.thresholds).toEqual([...DEFAULT_EDIT_THRESHOLDS]);
    expect(typeof r.data.config.maxBytes).toBe("number");
    expect(r.data.config.maxBytes).toBeGreaterThanOrEqual(1024);
    expect(typeof r.data.config.maxCheckpointsPerSession).toBe("number");
    expect(r.data.config.maxCheckpointsPerSession).toBeGreaterThanOrEqual(1);
  });

  it("wire payload after set: keeps exactly the 3-field shape", async () => {
    const r = await call(handler, "checkpoint_config", { set: { thresholds: [5, 10, 20] } });
    expect(r.success).toBe(true);
    expect(Object.keys(r.data.config).sort()).toEqual([
      "maxBytes",
      "maxCheckpointsPerSession",
      "thresholds",
    ]);
    expect(r.data.config.thresholds).toEqual([5, 10, 20]);
    // Restore the default so other tests stay deterministic.
    contextCheckpointEngine.setConfig({ thresholds: [...DEFAULT_EDIT_THRESHOLDS] });
  });
});

describe("dispatcher U-AIMAX07 — compression_policy wire round-trip", () => {
  let handler: Handler;
  beforeAll(async () => {
    handler = await createServer();
  });
  beforeEach(() => contextCompressionEngine.reset());

  it("get then set then get round-trips deterministically", async () => {
    const before = await call(handler, "compression_policy", {});
    expect(before.success).toBe(true);
    const baselineHead = before.data.policy.headChars;
    expect(typeof baselineHead).toBe("number");

    const after = await call(handler, "compression_policy", { set: { headChars: baselineHead + 50 } });
    expect(after.data.policy.headChars).toBe(baselineHead + 50);

    // Restore so the rest of the suite sees defaults.
    await call(handler, "compression_policy", { set: { headChars: baselineHead } });
    const back = await call(handler, "compression_policy", {});
    expect(back.data.policy.headChars).toBe(baselineHead);
  });
});

// ---------------------------------------------------------------
// 4) Variability — 3+ priority tiers exercised through the wire
// ---------------------------------------------------------------
describe("dispatcher U-AIMAX07 — variability across priority tiers", () => {
  let handler: Handler;
  beforeAll(async () => {
    handler = await createServer();
  });
  beforeEach(() => contextCompressionEngine.reset());

  it("critical priority returns tier 0 on the wire", async () => {
    const r = await call(handler, "compression_compress", {
      id: "var-crit",
      content: "x".repeat(2000),
      priority: "critical",
      kind: "tool_result",
    });
    expect(r.success).toBe(true);
    expect(r.data.tier).toBe(0);
    expect(r.data.ratio).toBe(1);
  });

  it("high priority returns tier 1 on the wire", async () => {
    const r = await call(handler, "compression_compress", {
      id: "var-high",
      content: "x".repeat(2000) + " uniqueA uniqueB",
      priority: "high",
      kind: "tool_result",
    });
    expect(r.success).toBe(true);
    expect(r.data.tier).toBe(1);
    expect(r.data.ratio).toBeGreaterThan(1);
  });

  it("medium priority returns tier 2 on the wire", async () => {
    const r = await call(handler, "compression_compress", {
      id: "var-med",
      content: "x".repeat(2000) + " uniqueA uniqueB uniqueC",
      priority: "medium",
      kind: "file",
    });
    expect(r.success).toBe(true);
    expect(r.data.tier).toBe(2);
    expect(r.data.ratio).toBeGreaterThan(1);
  });
});
