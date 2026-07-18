// OBSERVABILITY-MS0 (slot:bravo 2026-05-30) — MetricsCollector unit tests.
// Verifies INTENT: correct percentiles, bounded memory, honest error/concurrency
// accounting, well-formed Prometheus output, and never-throws on garbage input.
import { describe, it, expect } from "vitest";
import { MetricsCollector, metricsViewHtml } from "../observability/metrics-collector.js";

describe("MetricsCollector", () => {
  it("computes p50/p95/p99 from recorded latencies", () => {
    const m = new MetricsCollector();
    for (let i = 1; i <= 100; i++) m.recordTool("prism_calc", i, true); // 1..100 ms
    const t = m.snapshot().tools.find((x) => x.tool === "prism_calc")!;
    expect(t.count).toBe(100);
    expect(t.p50).toBe(50); // ceil(0.5*100)=50th sample (value 50)
    expect(t.p95).toBe(95);
    expect(t.p99).toBe(99);
  });

  it("bounds the per-tool latency reservoir (no unbounded growth)", () => {
    const m = new MetricsCollector();
    for (let i = 0; i < 5000; i++) m.recordTool("prism_cam", i, true);
    const t = m.snapshot().tools.find((x) => x.tool === "prism_cam")!;
    expect(t.count).toBe(5000); // count is exact …
    // … but percentiles come from the bounded reservoir (last 256), so p99 reflects
    // the recent tail (values ~4744..4999), NOT the full 0..4999 history. This proves
    // memory is bounded while recent latency is still represented.
    expect(t.p99).toBeGreaterThan(4700);
  });

  it("tracks error count + rate per tool and globally", () => {
    const m = new MetricsCollector();
    m.recordTool("prism_safety", 10, true);
    m.recordTool("prism_safety", 20, false);
    m.recordTool("prism_safety", 30, false);
    const t = m.snapshot().tools.find((x) => x.tool === "prism_safety")!;
    expect(t.count).toBe(3);
    expect(t.errors).toBe(2);
    expect(t.errorRate).toBeCloseTo(2 / 3, 5);
    expect(m.snapshot().totalErrors).toBe(2);
  });

  it("tracks live + peak in-flight concurrency", () => {
    const m = new MetricsCollector();
    m.incInflight();
    m.incInflight();
    m.incInflight();
    expect(m.snapshot().inflight).toBe(3);
    m.decInflight();
    expect(m.snapshot().inflight).toBe(2);
    expect(m.snapshot().peakInflight).toBe(3); // peak retained after decrement
    m.decInflight();
    m.decInflight();
    m.decInflight(); // over-decrement must floor at 0, never go negative
    expect(m.snapshot().inflight).toBe(0);
  });

  it("counts JSON-RPC methods", () => {
    const m = new MetricsCollector();
    m.recordMethod("tools/call");
    m.recordMethod("tools/call");
    m.recordMethod("initialize");
    expect(m.snapshot().methods["tools/call"]).toBe(2);
    expect(m.snapshot().methods["initialize"]).toBe(1);
  });

  it("sorts tools by call count descending in the snapshot", () => {
    const m = new MetricsCollector();
    m.recordTool("rare", 1, true);
    for (let i = 0; i < 5; i++) m.recordTool("hot", 1, true);
    for (let i = 0; i < 3; i++) m.recordTool("mid", 1, true);
    const order = m.snapshot().tools.map((t) => t.tool);
    expect(order).toEqual(["hot", "mid", "rare"]);
  });

  it("emits Prometheus exposition with expected metric names + escaped labels", () => {
    const m = new MetricsCollector();
    m.recordMethod("tools/call");
    m.recordTool('weird"name', 12, false);
    const out = m.prometheus();
    expect(out).toContain("prism_tool_calls_total");
    expect(out).toContain("prism_tool_duration_ms");
    expect(out).toContain("prism_requests_total{method=\"tools/call\"}");
    expect(out).toContain("prism_inflight");
    expect(out).toContain('weird\\"name'); // double-quote escaped in label
  });

  it("metricsViewHtml returns a self-contained XSS-safe dashboard page", () => {
    const html = metricsViewHtml();
    expect(html).toContain("<!doctype html>");
    expect(html).toContain('id="tbody"'); // table mount point
    expect(html).toContain("/metrics?format=json"); // data source
    expect(html).not.toContain(".innerHTML"); // DOM-build only — no XSS sink
  });

  it("never throws on garbage input (instrumentation must not break the hot path)", () => {
    const m = new MetricsCollector();
    expect(() => {
      // @ts-expect-error — deliberately wrong types
      m.recordTool(null, NaN, true);
      // @ts-expect-error
      m.recordTool(undefined, -5, false);
      // @ts-expect-error
      m.recordMethod(null);
      // @ts-expect-error
      m.sampleRss("not-a-number");
      m.snapshot();
      m.prometheus();
    }).not.toThrow();
  });
});
