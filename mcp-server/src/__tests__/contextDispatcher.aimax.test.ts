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
import {
  contextCompressionEngine,
  DEFAULT_POLICY,
} from "../engines/ContextCompressionEngine.js";
import {
  contextCheckpointEngine,
  DEFAULT_EDIT_THRESHOLDS,
  MAX_CHECKPOINT_BYTES,
  MAX_CHECKPOINTS_PER_SESSION,
} from "../engines/ContextCheckpointEngine.js";
import { registerContextDispatcher } from "../tools/dispatchers/contextDispatcher.js";

// Explicit dispatcher response shapes — no `any`.
interface MCPContent {
  content?: Array<{ type: string; text: string }>;
}
interface DispatcherSuccess<T = unknown> {
  success: true;
  data: T;
}
interface DispatcherFailure {
  success: false;
  error: string;
  action?: string;
  dispatcher?: string;
}
type DispatcherResponse<T = unknown> = DispatcherSuccess<T> | DispatcherFailure;

type Handler = (args: { action: string; params?: Record<string, unknown> }) => Promise<MCPContent | DispatcherFailure>;

interface FakeMCPServer {
  tool(name: string, desc: string, schema: unknown, fn: Handler): void;
}

function createServer(): Promise<Handler> {
  return new Promise<Handler>((resolve) => {
    const fakeServer: FakeMCPServer = {
      tool(_n, _d, _s, fn) {
        resolve(fn);
      },
    };
    registerContextDispatcher(fakeServer);
  });
}

async function call<T = unknown>(
  h: Handler,
  action: string,
  params: Record<string, unknown> = {},
): Promise<DispatcherResponse<T>> {
  const r = await h({ action, params });
  const mcp = r as MCPContent;
  const text = mcp?.content?.[0]?.text ?? JSON.stringify(r);
  try {
    return JSON.parse(text) as DispatcherResponse<T>;
  } catch {
    return r as DispatcherFailure;
  }
}

function assertSuccess<T>(r: DispatcherResponse<T>): asserts r is DispatcherSuccess<T> {
  if (r.success !== true) {
    throw new Error(`expected success, got error: ${(r as DispatcherFailure).error}`);
  }
}

function assertFailure(r: DispatcherResponse<unknown>): asserts r is DispatcherFailure {
  if (r.success !== false) {
    throw new Error("expected failure, got success");
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
    const r = await call<{ shouldCheckpoint: boolean; threshold: number | null }>(
      handler,
      "checkpoint_should",
      { sessionId: "wire-null" },
    );
    assertSuccess(r);
    expect(r.data.shouldCheckpoint).toBe(false);
    // The literal key must be present AND have value null on the wire.
    expect(Object.prototype.hasOwnProperty.call(r.data, "threshold")).toBe(true);
    expect(r.data.threshold).toBe(null);
  });

  it("returns threshold=15 (number) at first threshold", async () => {
    // Engine-direct setup — not a synthetic dispatcher-loop. The engine's
    // recordEdit is the production API; calling it directly is faster and
    // semantically identical (same Map mutation).
    const sid = "wire-first-threshold";
    contextCheckpointEngine.recordEdit(sid);
    // Advance to exactly the first configured threshold value.
    const firstThreshold = DEFAULT_EDIT_THRESHOLDS[0];
    while ((contextCheckpointEngine.getEditState(sid)?.editCount ?? 0) < firstThreshold) {
      contextCheckpointEngine.recordEdit(sid);
    }
    const r = await call<{ shouldCheckpoint: boolean; threshold: number | null }>(
      handler,
      "checkpoint_should",
      { sessionId: sid },
    );
    assertSuccess(r);
    expect(r.data.shouldCheckpoint).toBe(true);
    expect(r.data.threshold).toBe(firstThreshold);
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

  // Helper: every Zod-rejection path goes through validateActionParams → dispatcherError
  // → `Invalid params for '<action>': <path>: <message>`. So a failing test for the
  // `thresholds` field will produce an error string CONTAINING "thresholds" verbatim.
  function assertFieldRejected(r: DispatcherResponse<unknown>, field: string): void {
    assertFailure(r);
    expect(r.error.includes(field)).toBe(true);
  }

  it("rejects NaN threshold at schema layer (before engine)", async () => {
    // JSON.stringify(NaN) → null, so the payload arrives as [null]; either way
    // the schema's .finite() / .int() / .positive() chain catches it as a type
    // error referencing the `thresholds` path.
    const r = await call(handler, "checkpoint_config", { set: { thresholds: [NaN] } });
    assertFieldRejected(r, "thresholds");
  });

  it("rejects Infinity threshold at schema layer", async () => {
    const r = await call(handler, "checkpoint_config", { set: { thresholds: [Infinity, 10, 20] } });
    assertFieldRejected(r, "thresholds");
  });

  it("rejects non-integer threshold at schema layer", async () => {
    const r = await call(handler, "checkpoint_config", { set: { thresholds: [5.5, 10, 20] } });
    assertFieldRejected(r, "thresholds");
  });

  it("rejects zero threshold at schema layer (.positive() guard)", async () => {
    const r = await call(handler, "checkpoint_config", { set: { thresholds: [0, 10, 20] } });
    assertFieldRejected(r, "thresholds");
  });

  it("rejects negative threshold at schema layer", async () => {
    const r = await call(handler, "checkpoint_config", { set: { thresholds: [-1, 10, 20] } });
    assertFieldRejected(r, "thresholds");
  });

  it("rejects empty thresholds at schema layer (min(1))", async () => {
    const r = await call(handler, "checkpoint_config", { set: { thresholds: [] } });
    assertFieldRejected(r, "thresholds");
  });

  it("rejects sub-1024 maxBytes at schema layer", async () => {
    const r = await call(handler, "checkpoint_config", { set: { maxBytes: 500 } });
    assertFieldRejected(r, "maxBytes");
  });

  it("rejects non-int maxCheckpointsPerSession at schema layer", async () => {
    const r = await call(handler, "checkpoint_config", { set: { maxCheckpointsPerSession: 5.5 } });
    assertFieldRejected(r, "maxCheckpointsPerSession");
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
    assertFailure(r);
    expect(r.error.includes("headChars")).toBe(true);
  });

  it("rejects Infinity tailChars at schema layer", async () => {
    const r = await call(handler, "compression_policy", { set: { tailChars: Infinity } });
    assertFailure(r);
    expect(r.error.includes("tailChars")).toBe(true);
  });

  it("rejects non-integer minEntityLen at schema layer", async () => {
    const r = await call(handler, "compression_policy", { set: { minEntityLen: 3.7 } });
    assertFailure(r);
    expect(r.error.includes("minEntityLen")).toBe(true);
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
    const r = await call<{ config: { thresholds: number[]; maxBytes: number; maxCheckpointsPerSession: number } }>(
      handler,
      "checkpoint_config",
      {},
    );
    assertSuccess(r);
    expect(Object.prototype.hasOwnProperty.call(r.data.config, "clockMs")).toBe(false);
    // Use the exact exported engine constants — exact equality, not bounds.
    expect(r.data.config.thresholds).toEqual([...DEFAULT_EDIT_THRESHOLDS]);
    expect(r.data.config.maxBytes).toBe(MAX_CHECKPOINT_BYTES);
    expect(r.data.config.maxCheckpointsPerSession).toBe(MAX_CHECKPOINTS_PER_SESSION);
  });

  it("wire payload after set: keeps exactly the 3-field shape", async () => {
    const r = await call<{ config: { thresholds: number[]; maxBytes: number; maxCheckpointsPerSession: number } }>(
      handler,
      "checkpoint_config",
      { set: { thresholds: [5, 10, 20] } },
    );
    assertSuccess(r);
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

  it("get returns exact DEFAULT_POLICY (no drift)", async () => {
    const r = await call<{ policy: typeof DEFAULT_POLICY }>(handler, "compression_policy", {});
    assertSuccess(r);
    // Exact equality against the engine's exported DEFAULT_POLICY.
    expect(r.data.policy).toEqual(DEFAULT_POLICY);
  });

  it("set→get round-trips deterministically", async () => {
    const target = DEFAULT_POLICY.headChars + 50;
    const after = await call<{ policy: typeof DEFAULT_POLICY }>(
      handler,
      "compression_policy",
      { set: { headChars: target } },
    );
    assertSuccess(after);
    expect(after.data.policy.headChars).toBe(target);

    // Restore so the rest of the suite sees defaults.
    contextCompressionEngine.setPolicy({ headChars: DEFAULT_POLICY.headChars });
    const back = await call<{ policy: typeof DEFAULT_POLICY }>(handler, "compression_policy", {});
    assertSuccess(back);
    expect(back.data.policy.headChars).toBe(DEFAULT_POLICY.headChars);
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

  // Engine-direct expected values — compute once, assert dispatcher matches exactly.
  // Same input → same output; the dispatcher is a pure pass-through.

  it("critical priority returns tier 0 on the wire (exact engine equality)", async () => {
    const content = "x".repeat(2000);
    const expected = contextCompressionEngine.compress({
      id: "var-crit",
      content,
      priority: "critical",
      kind: "tool_result",
    });
    contextCompressionEngine.reset();

    const r = await call<{ tier: number; ratio: number; priority: string; kind: string }>(
      handler,
      "compression_compress",
      { id: "var-crit", content, priority: "critical", kind: "tool_result" },
    );
    assertSuccess(r);
    expect(r.data.tier).toBe(expected.tier);
    expect(r.data.tier).toBe(0);
    expect(r.data.ratio).toBe(expected.ratio);
    expect(r.data.ratio).toBe(1);
    expect(r.data.priority).toBe("critical");
    expect(r.data.kind).toBe("tool_result");
  });

  it("high priority returns tier 1 on the wire (exact engine equality)", async () => {
    const content = "x".repeat(2000) + " uniqueA uniqueB";
    const expected = contextCompressionEngine.compress({
      id: "var-high",
      content,
      priority: "high",
      kind: "tool_result",
    });
    contextCompressionEngine.reset();

    const r = await call<{ tier: number; ratio: number; priority: string }>(
      handler,
      "compression_compress",
      { id: "var-high", content, priority: "high", kind: "tool_result" },
    );
    assertSuccess(r);
    expect(r.data.tier).toBe(expected.tier);
    expect(r.data.tier).toBe(1);
    expect(r.data.ratio).toBe(expected.ratio);
    expect(r.data.priority).toBe("high");
  });

  it("medium priority returns tier 2 on the wire (exact engine equality)", async () => {
    const content = "x".repeat(2000) + " uniqueA uniqueB uniqueC";
    const expected = contextCompressionEngine.compress({
      id: "var-med",
      content,
      priority: "medium",
      kind: "file",
    });
    contextCompressionEngine.reset();

    const r = await call<{ tier: number; ratio: number; priority: string }>(
      handler,
      "compression_compress",
      { id: "var-med", content, priority: "medium", kind: "file" },
    );
    assertSuccess(r);
    expect(r.data.tier).toBe(expected.tier);
    expect(r.data.tier).toBe(2);
    expect(r.data.ratio).toBe(expected.ratio);
    expect(r.data.priority).toBe("medium");
  });
});
