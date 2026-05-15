/**
 * Wire test: prism_monitoring × MetricsEngine
 *
 * Verifies the 9 new metric_* actions wire MetricsEngine through the dispatcher
 * round-trip (handler closure capture → tool() call → content[0].text JSON parse).
 *
 * Recipe (OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-METRICS, iter 12 — same harness
 * as the prior 11 iters): fake MCP server captures the tool() handler, then we
 * invoke it directly with {action, params}, parse the JSON envelope, assert
 * `success: true` plus real-value assertions (no toBeDefined stubs).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { registerMonitoringDispatcher } from "../tools/dispatchers/monitoringDispatcher.js";

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
}

interface FakeServer {
  tool: (name: string, desc: string, schema: any, handler: (args: any) => Promise<ToolResult>) => void;
  _handler?: (args: any) => Promise<ToolResult>;
}

function buildHandler() {
  const server: FakeServer = {
    tool(_name, _desc, _schema, handler) {
      server._handler = handler;
    },
  };
  registerMonitoringDispatcher(server as any);
  if (!server._handler) throw new Error("dispatcher did not register a handler");
  return server._handler;
}

async function call(handler: ReturnType<typeof buildHandler>, action: string, params: any = {}) {
  const r: any = await handler({ action, params });
  // Two valid response shapes (verified in prior 11 wire iters):
  //   A. slimResponse(result)   → raw object, e.g. { success:true, ... }
  //   B. dispatcherError(...)   → { ok:false, error, action, dispatcher }
  //   C. MCP-wrapped            → { content:[{ type:"text", text:"<json>" }] }
  let parsed: any;
  if (r && Array.isArray(r.content) && typeof r.content[0]?.text === "string") {
    parsed = JSON.parse(r.content[0].text);
  } else if (r && typeof r === "object") {
    parsed = r;
  } else {
    throw new Error(`unexpected dispatcher response shape: ${JSON.stringify(r)}`);
  }
  const ok = parsed.ok !== false && parsed.success !== false && !parsed.error;
  return { ok, raw: parsed };
}

describe("monitoringDispatcher × MetricsEngine wire (OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-METRICS)", () => {
  let handler: ReturnType<typeof buildHandler>;

  beforeEach(async () => {
    handler = buildHandler();
    // Each test starts on a clean engine state — reset is idempotent.
    await call(handler, "metric_reset");
  });

  it("metric_define registers a counter definition", async () => {
    const r = await call(handler, "metric_define", {
      name: "test.requests.total",
      type: "counter",
      description: "Total test requests",
      labels: ["method", "status"],
      unit: "1",
    });
    expect(r.ok, JSON.stringify(r.raw)).toBe(true);
    expect(r.raw.defined.name).toBe("test.requests.total");
    expect(r.raw.defined.type).toBe("counter");
    expect(r.raw.defined.labels).toEqual(["method", "status"]);
  });

  it("metric_increment accumulates by default delta of 1", async () => {
    const r1 = await call(handler, "metric_increment", { name: "c1" });
    expect(r1.ok).toBe(true);
    expect(r1.raw.value).toBe(1);
    const r2 = await call(handler, "metric_increment", { name: "c1" });
    expect(r2.raw.value).toBe(2);
    const r3 = await call(handler, "metric_increment", { name: "c1", value: 5 });
    expect(r3.raw.value).toBe(7);
  });

  it("metric_increment with labels keys the counter separately", async () => {
    await call(handler, "metric_increment", { name: "c2", value: 3, labels: { method: "GET" } });
    await call(handler, "metric_increment", { name: "c2", value: 7, labels: { method: "POST" } });
    const get = await call(handler, "metric_get_counter", { name: "c2", labels: { method: "GET" } });
    const post = await call(handler, "metric_get_counter", { name: "c2", labels: { method: "POST" } });
    expect(get.raw.value).toBe(3);
    expect(post.raw.value).toBe(7);
  });

  it("metric_gauge sets absolute value (overwrites, not accumulates)", async () => {
    await call(handler, "metric_gauge", { name: "g1", value: 42 });
    let r = await call(handler, "metric_get_gauge", { name: "g1" });
    expect(r.raw.value).toBe(42);
    await call(handler, "metric_gauge", { name: "g1", value: 100 });
    r = await call(handler, "metric_get_gauge", { name: "g1" });
    expect(r.raw.value).toBe(100);
  });

  it("metric_observe + metric_get_histogram produces a valid summary", async () => {
    // observe 100 evenly-spaced samples [1..100]
    for (let i = 1; i <= 100; i++) {
      await call(handler, "metric_observe", { name: "h1", value: i });
    }
    const r = await call(handler, "metric_get_histogram", { name: "h1" });
    expect(r.ok).toBe(true);
    expect(r.raw.histogram.count).toBe(100);
    expect(r.raw.histogram.min).toBe(1);
    expect(r.raw.histogram.max).toBe(100);
    // sum 1..100 = 5050 (engine rounds to 3 decimals)
    expect(r.raw.histogram.sum).toBe(5050);
    expect(r.raw.histogram.avg).toBe(50.5);
    // p50 is the median sample at sorted index floor(100*0.5) = 50 → value 51
    expect(r.raw.histogram.p50).toBe(51);
    expect(r.raw.histogram.p90).toBe(91);
    // p99 = sorted[floor(100*0.99)] = sorted[99] = 100
    expect(r.raw.histogram.p99).toBe(100);
    expect(Array.isArray(r.raw.histogram.buckets)).toBe(true);
  });

  it("metric_get_counter on never-incremented name returns 0 (not error)", async () => {
    const r = await call(handler, "metric_get_counter", { name: "never.touched" });
    expect(r.ok).toBe(true);
    expect(r.raw.value).toBe(0);
  });

  it("metric_export returns a Prometheus-shaped snapshot with all metric types", async () => {
    await call(handler, "metric_increment", { name: "c.export", value: 5 });
    await call(handler, "metric_gauge", { name: "g.export", value: 99 });
    await call(handler, "metric_observe", { name: "h.export", value: 0.5 });
    await call(handler, "metric_observe", { name: "h.export", value: 1.5 });

    const r = await call(handler, "metric_export");
    expect(r.ok).toBe(true);
    const snap = r.raw.snapshot;
    expect(typeof snap.timestamp).toBe("string");
    expect(Array.isArray(snap.counters)).toBe(true);
    expect(Array.isArray(snap.gauges)).toBe(true);
    expect(Array.isArray(snap.histograms)).toBe(true);
    expect(snap.counters.find((c: any) => c.name === "c.export").value).toBe(5);
    expect(snap.gauges.find((g: any) => g.name === "g.export").value).toBe(99);
    const hist = snap.histograms.find((h: any) => h.name === "h.export");
    expect(hist.count).toBe(2);
    expect(hist.total_metrics).toBeUndefined(); // total_metrics lives on snapshot, not per-histogram
    expect(snap.total_metrics).toBe(3); // 1 counter + 1 gauge + 1 histogram-name = 3
  });

  it("metric_reset clears all metric state", async () => {
    await call(handler, "metric_increment", { name: "reset.c", value: 10 });
    await call(handler, "metric_gauge", { name: "reset.g", value: 99 });
    const before = await call(handler, "metric_export");
    expect(before.raw.snapshot.total_metrics).toBeGreaterThan(0);

    const rst = await call(handler, "metric_reset");
    expect(rst.ok).toBe(true);
    expect(rst.raw.reset).toBe(true);

    const after = await call(handler, "metric_export");
    expect(after.raw.snapshot.total_metrics).toBe(0);
    const getC = await call(handler, "metric_get_counter", { name: "reset.c" });
    expect(getC.raw.value).toBe(0); // post-reset zero
  });

  it("metric_get_histogram with custom buckets honors the override", async () => {
    for (const v of [0.1, 0.2, 0.5, 1.0, 2.0]) {
      await call(handler, "metric_observe", { name: "h.buckets", value: v });
    }
    const r = await call(handler, "metric_get_histogram", {
      name: "h.buckets",
      buckets: [0.25, 1.0, 5.0],
    });
    expect(r.ok).toBe(true);
    // bucket 0.25 → samples [0.1, 0.2] = 2
    // bucket 1.0  → samples [0.1, 0.2, 0.5, 1.0] = 4
    // bucket 5.0  → all 5
    expect(r.raw.histogram.buckets).toEqual([
      { le: 0.25, count: 2 },
      { le: 1.0, count: 4 },
      { le: 5.0, count: 5 },
    ]);
  });

  it("validation: metric_define rejects empty name (Zod min(1))", async () => {
    const r = await call(handler, "metric_define", {
      name: "",
      type: "counter",
      description: "no-name",
    });
    expect(r.ok).toBe(false);
    expect(String(r.raw.error || "")).toMatch(/name|String|min/i);
  });

  it("validation: metric_define rejects invalid type enum", async () => {
    const r = await call(handler, "metric_define", {
      name: "bad.type",
      type: "not-a-real-type",
      description: "should fail",
    });
    expect(r.ok).toBe(false);
  });

  it("validation: metric_increment rejects non-numeric value", async () => {
    const r = await call(handler, "metric_increment", { name: "v", value: "not-a-number" });
    expect(r.ok).toBe(false);
  });

  it("histogram on empty data returns zero-shaped summary (not error)", async () => {
    const r = await call(handler, "metric_get_histogram", { name: "never.observed" });
    expect(r.ok).toBe(true);
    expect(r.raw.histogram.count).toBe(0);
    expect(r.raw.histogram.min).toBe(0);
    expect(r.raw.histogram.max).toBe(0);
    expect(r.raw.histogram.sum).toBe(0);
    expect(r.raw.histogram.p50).toBe(0);
  });

  it("dispatcher exposes the 9 new metric_* actions in its action enum", async () => {
    const ACTIONS = [
      "metric_define",
      "metric_increment",
      "metric_gauge",
      "metric_observe",
      "metric_get_counter",
      "metric_get_gauge",
      "metric_get_histogram",
      "metric_export",
      "metric_reset",
    ];
    // Each action must round-trip without an "Unknown monitoring action" error,
    // i.e. the dispatcher's z.enum + switch actually accept each label.
    for (const action of ACTIONS) {
      const r = await call(handler, action, {
        name: "wire.probe",
        type: "counter",
        description: "probe",
        value: 1,
        labels: { route: "probe" },
      });
      // Either ok=true OR ok=false for a real validation reason — but NEVER
      // "Unknown monitoring action: …" (which would mean missing dispatcher case).
      const msg = String(r.raw.error || "");
      expect(msg, `action ${action} hit default branch: ${msg}`).not.toMatch(/Unknown monitoring action/);
    }
  });
});
