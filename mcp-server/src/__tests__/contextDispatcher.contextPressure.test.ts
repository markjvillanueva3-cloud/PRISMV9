/**
 * WIRE-UNWIRED-MS0/U-WIRE-CTX-PRESSURE — prism_context:context_pressure_* tests
 *
 * Round-trips ContextWindowPressureEngine through the prism_context MCP handler.
 * Engine is STATEFUL (singleton accumulates samples) — every test starts with
 * context_pressure_reset to keep cases hermetic from each other.
 *
 * Pattern mirrors contextDispatcher.compactPlanner.test.ts + parallelPlanner.
 *
 * Coverage (4 actions × thresholds + dynamics + adversarial):
 *   - context_pressure_record: returns recorded:true + timestamp echo
 *   - context_pressure_read: 4 status bands (green<.5, yellow<.7, orange<.85, red≥.85)
 *                            with concrete recommendation substrings
 *   - context_pressure_optimal_compaction: pre-data ("Insufficient data"),
 *                                          high-burn-rate trigger, over-threshold,
 *                                          approaching, healthy
 *   - context_pressure_reset: clears samples (optimal_compaction returns
 *                              "Insufficient data" after reset)
 *
 * @milestone WIRE-UNWIRED-MS0 / U-WIRE-CTX-PRESSURE
 */
import { describe, it, expect, beforeEach } from "vitest";

type RegisteredTool = {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: string; text: string }> }>;
};

function makeFakeServer(): { server: { tool: (...args: unknown[]) => void }; tools: RegisteredTool[] } {
  const tools: RegisteredTool[] = [];
  const server = {
    tool: (...args: unknown[]) => {
      tools.push({
        name: args[0] as string,
        description: args[1] as string,
        schema: args[2] as Record<string, unknown>,
        handler: args[3] as RegisteredTool["handler"],
      });
    },
  };
  return { server, tools };
}

async function buildPrismContextHandler(): Promise<RegisteredTool["handler"]> {
  const { server, tools } = makeFakeServer();
  const { registerContextDispatcher } = await import("../tools/dispatchers/contextDispatcher.js");
  registerContextDispatcher(server as never);
  const ctx = tools.find((t) => t.name === "prism_context");
  if (!ctx) throw new Error("registerContextDispatcher did not register a tool named 'prism_context'");
  return ctx.handler;
}

function parsePayload(response: { content: Array<{ type: string; text: string }> }): Record<string, unknown> {
  const text = response.content?.[0]?.text ?? "";
  return JSON.parse(text);
}

async function resetSingleton(handler: RegisteredTool["handler"]): Promise<void> {
  await handler({ action: "context_pressure_reset", params: {} });
}

// ── context_pressure_record ──────────────────────────────────────────────────

describe("prism_context:context_pressure_record — sample ingest", () => {
  it("returns recorded:true + echoes timestamp when provided", async () => {
    const handler = await buildPrismContextHandler();
    await resetSingleton(handler);
    const r = await handler({
      action: "context_pressure_record",
      params: { tokens: 10000, timestamp: 1700000000000 },
    });
    const data = parsePayload(r).data as Record<string, unknown>;
    expect(data.recorded).toBe(true);
    expect(data.timestamp).toBe(1700000000000);
  });

  it("returns recorded:true + auto-assigns timestamp when omitted", async () => {
    const handler = await buildPrismContextHandler();
    await resetSingleton(handler);
    const before = Date.now();
    const r = await handler({ action: "context_pressure_record", params: { tokens: 5000 } });
    const after = Date.now();
    const data = parsePayload(r).data as Record<string, unknown>;
    expect(data.recorded).toBe(true);
    // Auto-assigned ts must fall in [before, after] (inclusive); guards against
    // dispatcher silently dropping the param.
    expect(typeof data.timestamp).toBe("number");
    expect(data.timestamp as number).toBeGreaterThanOrEqual(before);
    expect(data.timestamp as number).toBeLessThanOrEqual(after);
  });
});

// ── context_pressure_read — status bands ─────────────────────────────────────

describe("prism_context:context_pressure_read — status bands", () => {
  it("green @ 30% utilization (60000/200000)", async () => {
    const handler = await buildPrismContextHandler();
    await resetSingleton(handler);
    const r = await handler({ action: "context_pressure_read", params: { currentTokens: 60000 } });
    const data = parsePayload(r).data as Record<string, unknown>;
    expect(data.status).toBe("green");
    expect(data.utilization).toBe(0.3);
    expect(data.maxTokens).toBe(200000);
    expect(data.recommendation).toMatch(/No action needed/);
  });

  it("yellow @ 60% utilization (120000/200000)", async () => {
    const handler = await buildPrismContextHandler();
    await resetSingleton(handler);
    const r = await handler({ action: "context_pressure_read", params: { currentTokens: 120000 } });
    const data = parsePayload(r).data as Record<string, unknown>;
    expect(data.status).toBe("yellow");
    expect(data.utilization).toBe(0.6);
    expect(data.recommendation).toMatch(/\/slim/);
  });

  it("orange @ 80% utilization (160000/200000)", async () => {
    const handler = await buildPrismContextHandler();
    await resetSingleton(handler);
    const r = await handler({ action: "context_pressure_read", params: { currentTokens: 160000 } });
    const data = parsePayload(r).data as Record<string, unknown>;
    expect(data.status).toBe("orange");
    expect(data.utilization).toBe(0.8);
    expect(data.recommendation).toMatch(/\/compact soon/);
  });

  it("red @ 95% utilization (190000/200000) — critical", async () => {
    const handler = await buildPrismContextHandler();
    await resetSingleton(handler);
    const r = await handler({ action: "context_pressure_read", params: { currentTokens: 190000 } });
    const data = parsePayload(r).data as Record<string, unknown>;
    expect(data.status).toBe("red");
    expect(data.utilization).toBe(0.95);
    expect(data.recommendation).toMatch(/Critical/);
    expect(data.recommendation).toMatch(/(\/compact|\/handoff)/);
  });
});

// ── context_pressure_optimal_compaction ──────────────────────────────────────

describe("prism_context:context_pressure_optimal_compaction — predictive advice", () => {
  beforeEach(async () => {
    const handler = await buildPrismContextHandler();
    await resetSingleton(handler);
  });

  it("returns 'Insufficient data' before any samples", async () => {
    const handler = await buildPrismContextHandler();
    await resetSingleton(handler);
    const r = await handler({ action: "context_pressure_optimal_compaction", params: {} });
    const data = parsePayload(r).data as Record<string, unknown>;
    expect(data.shouldCompactNow).toBe(false);
    expect(data.idealUtilization).toBe(0.7);
    expect(data.reason).toBe("Insufficient data");
  });

  it("'Over threshold' once latest utilization > 85% (compactionThreshold) AND rate is low", async () => {
    const handler = await buildPrismContextHandler();
    await resetSingleton(handler);
    // Two samples needed; second one must be > 85% util AND rate must be <2000/min
    // so we don't trigger the higher-priority "High burn rate" branch.
    // 1000 tokens over 60 seconds = 1000 tokens/min — comfortably below the 2000/min cutoff.
    await handler({ action: "context_pressure_record", params: { tokens: 180000, timestamp: 1000 } });
    await handler({ action: "context_pressure_record", params: { tokens: 181000, timestamp: 61001 } });
    const r = await handler({ action: "context_pressure_optimal_compaction", params: {} });
    const data = parsePayload(r).data as Record<string, unknown>;
    expect(data.shouldCompactNow).toBe(true);
    expect(data.reason).toBe("Over threshold");
    expect(data.idealUtilization).toBe(0.85);
  });

  it("'Healthy' when utilization < 70% even with samples present", async () => {
    const handler = await buildPrismContextHandler();
    await resetSingleton(handler);
    await handler({ action: "context_pressure_record", params: { tokens: 100000, timestamp: 1000 } });
    await handler({ action: "context_pressure_record", params: { tokens: 105000, timestamp: 61000 } }); // +5K in 60s = ~83/min
    const r = await handler({ action: "context_pressure_optimal_compaction", params: {} });
    const data = parsePayload(r).data as Record<string, unknown>;
    expect(data.shouldCompactNow).toBe(false);
    expect(data.reason).toBe("Healthy — no compaction needed");
  });

  it("'High burn rate' triggers early compaction when rate>2000/min AND util>60%", async () => {
    const handler = await buildPrismContextHandler();
    await resetSingleton(handler);
    // 60% util at 120000/200000; burn 5000 tokens in 1s → rate ≈ 300000/min
    await handler({ action: "context_pressure_record", params: { tokens: 120000, timestamp: 1000 } });
    await handler({ action: "context_pressure_record", params: { tokens: 125000, timestamp: 2000 } });
    const r = await handler({ action: "context_pressure_optimal_compaction", params: {} });
    const data = parsePayload(r).data as Record<string, unknown>;
    expect(data.shouldCompactNow).toBe(true);
    expect(data.reason).toBe("High burn rate — compact early");
    expect(data.idealUtilization).toBe(0.6);
  });
});

// ── context_pressure_reset ───────────────────────────────────────────────────

describe("prism_context:context_pressure_reset — clears samples", () => {
  it("after reset, optimal_compaction reverts to 'Insufficient data'", async () => {
    const handler = await buildPrismContextHandler();
    await handler({ action: "context_pressure_record", params: { tokens: 100, timestamp: 1000 } });
    await handler({ action: "context_pressure_record", params: { tokens: 200, timestamp: 2000 } });
    // Reset
    const r = await handler({ action: "context_pressure_reset", params: {} });
    expect((parsePayload(r).data as Record<string, unknown>).reset).toBe(true);
    const advice = await handler({ action: "context_pressure_optimal_compaction", params: {} });
    expect((parsePayload(advice).data as Record<string, unknown>).reason).toBe("Insufficient data");
  });
});

// ── adversarial ──────────────────────────────────────────────────────────────

describe("prism_context:context_pressure_* — adversarial", () => {
  it("context_pressure_record rejects negative tokens (nonnegative())", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "context_pressure_record",
      params: { tokens: -1 },
    });
    expect(parsePayload(r).success).not.toBe(true);
  });

  it("context_pressure_read rejects missing currentTokens", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({ action: "context_pressure_read", params: {} });
    expect(parsePayload(r).success).not.toBe(true);
  });

  it("context_pressure_optimal_compaction rejects extra keys (.strict())", async () => {
    const handler = await buildPrismContextHandler();
    const r = await handler({
      action: "context_pressure_optimal_compaction",
      params: { unexpected: true },
    });
    expect(parsePayload(r).success).not.toBe(true);
  });
});
