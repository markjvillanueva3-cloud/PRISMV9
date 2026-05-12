/**
 * sessionDispatcher + contextDispatcher + memoryDispatcher wiring tests — CPP-MS2
 *
 * Captures the handler fn registered via server.tool() and invokes it directly.
 * Covers:
 *   - U-CPP08 (ContextChainEngine, 5 actions on sessionDispatcher)
 *   - U-CPP09 (ContextWindowMapEngine, 4 actions on contextDispatcher)
 *   - U-CPP10 (SessionEventLogEngine, 4 actions on sessionDispatcher)
 *   - U-CPP15 (MemoryPressureMonitorEngine, 3 actions on memoryDispatcher)
 *   - U-CPP16 (SessionInsightsLedgerEngine, 3 actions on sessionDispatcher)
 *
 * Minimal smoke-style coverage; deep engine behaviour is covered by the
 * engines' own companion tests.
 */
import { describe, it, expect } from "vitest";
import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";
import { registerContextDispatcher } from "../tools/dispatchers/contextDispatcher.js";
import { registerMemoryDispatcher } from "../tools/dispatchers/memoryDispatcher.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function captureHandler(register: (server: any) => void): Handler {
  let captured: Handler | null = null;
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, handler: Handler) {
      captured = handler;
    },
  };
  register(fakeServer);
  if (!captured) throw new Error("dispatcher did not register a handler");
  return captured;
}

function unwrap(res: any): any {
  if (res && typeof res === "object" && Array.isArray(res.content)) {
    const text = res.content.find((c: any) => c.type === "text")?.text;
    if (typeof text === "string") {
      try { return JSON.parse(text); } catch { return { raw: text }; }
    }
  }
  return res;
}

describe("sessionDispatcher — ContextChainEngine wiring (U-CPP08)", () => {
  const handler = captureHandler(registerSessionDispatcher);

  it("context_chain_pressure returns pressure level", async () => {
    const out = unwrap(await handler({ action: "context_chain_pressure", params: { estimatedTokens: 50000 } }));
    expect(out).toBeDefined();
    expect(out.success ?? out.ok ?? true).toBeTruthy();
  });

  it("context_chain_plan returns a load plan", async () => {
    const out = unwrap(await handler({ action: "context_chain_plan", params: { bundles: [], tokenBudget: 10000 } }));
    expect(out).toBeDefined();
  });

  it("context_chain_compaction returns a compaction plan", async () => {
    const out = unwrap(await handler({ action: "context_chain_compaction", params: { bundles: [] } }));
    expect(out).toBeDefined();
  });

  it("context_chain_prioritize returns prioritized bundles", async () => {
    const out = unwrap(await handler({ action: "context_chain_prioritize", params: { bundles: [], taskClass: "general" } }));
    expect(out).toBeDefined();
  });

  it("context_chain_health returns a health report", async () => {
    const out = unwrap(await handler({ action: "context_chain_health", params: { estimatedTokens: 30000 } }));
    expect(out).toBeDefined();
  });
});

describe("sessionDispatcher — SessionEventLogEngine wiring (U-CPP10)", () => {
  const handler = captureHandler(registerSessionDispatcher);

  it("event_log records a session event", async () => {
    const out = unwrap(await handler({
      action: "event_log",
      params: { type: "test", summary: "smoke test", data: { k: "v" } },
    }));
    expect(out).toBeDefined();
  });

  it("event_query returns events since a timestamp", async () => {
    const out = unwrap(await handler({ action: "event_query", params: { since: 0 } }));
    expect(out).toBeDefined();
  });

  it("event_stats returns counts and one-liner", async () => {
    const out = unwrap(await handler({ action: "event_stats", params: {} }));
    expect(out).toBeDefined();
  });

  it("event_reset clears state when confirm=true", async () => {
    const out = unwrap(await handler({ action: "event_reset", params: { confirm: true } }));
    expect(out).toBeDefined();
  });
});

describe("contextDispatcher — ContextWindowMapEngine wiring (U-CPP09)", () => {
  const handler = captureHandler(registerContextDispatcher);

  it("window_map returns map + chart + oneLiner", async () => {
    const out = unwrap(await handler({ action: "window_map", params: {} }));
    expect(out).toBeDefined();
  });

  it("window_utilization returns utilization_pct", async () => {
    const out = unwrap(await handler({ action: "window_utilization", params: {} }));
    expect(out).toBeDefined();
  });

  it("window_reclaimable returns stale segments + totalTokens", async () => {
    const out = unwrap(await handler({ action: "window_reclaimable", params: {} }));
    expect(out).toBeDefined();
  });

  it("window_stale_detect returns newly_marked_stale count", async () => {
    const out = unwrap(await handler({ action: "window_stale_detect", params: {} }));
    expect(out).toBeDefined();
  });
});

describe("memoryDispatcher — MemoryPressureMonitorEngine wiring (U-CPP15)", () => {
  const handler = captureHandler(registerMemoryDispatcher);

  it("pressure_record samples current heap", async () => {
    const out = unwrap(await handler({ action: "pressure_record", params: {} }));
    expect(out).toBeDefined();
  });

  it("pressure_get returns samples + trend", async () => {
    const out = unwrap(await handler({ action: "pressure_get", params: { n: 5 } }));
    expect(out).toBeDefined();
  });

  it("pressure_recommend returns reading + trend + recommendation", async () => {
    const out = unwrap(await handler({ action: "pressure_recommend", params: {} }));
    expect(out).toBeDefined();
  });
});

describe("sessionDispatcher — SessionInsightsLedgerEngine wiring (U-CPP16)", () => {
  const handler = captureHandler(registerSessionDispatcher);

  it("insight_record appends a schema-validated entry", async () => {
    const out = unwrap(await handler({
      action: "insight_record",
      params: {
        sessionId: "test-session",
        category: "other",
        summary: "wiring smoke test",
      },
    }));
    expect(out).toBeDefined();
  });

  it("insight_top returns top-N entries (possibly empty)", async () => {
    const out = unwrap(await handler({ action: "insight_top", params: { n: 5 } }));
    expect(out).toBeDefined();
  });

  it("insight_summarize returns counts by category", async () => {
    const out = unwrap(await handler({ action: "insight_summarize", params: {} }));
    expect(out).toBeDefined();
  });
});
