/** TransportHealthProbeEngine tests — HMPI07. */
import { describe, it, expect } from "vitest";
import { TransportHealthProbeEngine, type ProbeSample } from "../engines/TransportHealthProbeEngine.js";

const sample = (latency_ms: number, ok: boolean, at = "2026-05-24T13:00:00.000Z"): ProbeSample => ({ at, latency_ms, ok });

describe("TransportHealthProbeEngine.analyze", () => {
  it("empty samples → unhealthy verdict", () => {
    const h = TransportHealthProbeEngine.analyze("t", []);
    expect(h.verdict).toBe("unhealthy");
    expect(h.sample_count).toBe(0);
  });

  it("all-ok low-latency samples → healthy", () => {
    const h = TransportHealthProbeEngine.analyze("t", [
      sample(50, true), sample(60, true), sample(70, true), sample(80, true),
    ]);
    expect(h.verdict).toBe("healthy");
    expect(h.ok_count).toBe(4);
    expect(h.error_count).toBe(0);
  });

  it("error_rate ≥ 50% → unhealthy", () => {
    const h = TransportHealthProbeEngine.analyze("t", [
      sample(50, false), sample(60, false), sample(70, true), sample(80, true),
    ]);
    expect(h.verdict).toBe("unhealthy");
    expect(h.error_count).toBe(2);
  });

  it("error_rate 10-50% → degraded", () => {
    const samples: ProbeSample[] = Array.from({ length: 10 }, (_, i) => sample(50, i < 8));
    // 8 ok (i<8) + 2 errors → error_rate 0.2 → degraded
    expect(TransportHealthProbeEngine.analyze("t", samples).verdict).toBe("degraded");
  });

  it("p95 latency > 5000ms → degraded", () => {
    const samples: ProbeSample[] = [
      ...Array.from({ length: 19 }, () => sample(50, true)),
      sample(10_000, true),
    ];
    expect(TransportHealthProbeEngine.analyze("t", samples).verdict).toBe("degraded");
  });

  it("computes p50 + p95 exactly on sorted samples", () => {
    const samples: ProbeSample[] = Array.from({ length: 100 }, (_, i) => sample(i, true));
    const h = TransportHealthProbeEngine.analyze("t", samples);
    expect(h.p50_latency_ms).toBe(50);
    expect(h.p95_latency_ms).toBe(95);
  });

  it("counts flaps (ok-state transitions)", () => {
    const h = TransportHealthProbeEngine.analyze("t", [
      sample(50, true), sample(50, false), sample(50, true), sample(50, false),
    ]);
    expect(h.flap_count).toBe(3);
  });

  it("flap_count ≥ 5 → degraded even with low error_rate", () => {
    // Build a 30-sample series with 6 flaps + only 3 errors (10% error rate).
    // Pattern: ok×5, err, ok×4, err, ok×4, err, ok×15
    const samples: ProbeSample[] = [];
    for (let i = 0; i < 5; i += 1) samples.push(sample(50, true));
    samples.push(sample(50, false));
    for (let i = 0; i < 4; i += 1) samples.push(sample(50, true));
    samples.push(sample(50, false));
    for (let i = 0; i < 4; i += 1) samples.push(sample(50, true));
    samples.push(sample(50, false));
    for (let i = 0; i < 15; i += 1) samples.push(sample(50, true));
    const h = TransportHealthProbeEngine.analyze("t", samples);
    expect(h.error_count).toBe(3);
    expect(h.flap_count).toBe(6);
    expect(h.verdict).toBe("degraded");
  });

  it("rejects empty transport_id", () => {
    expect(() => TransportHealthProbeEngine.analyze("", [sample(50, true)])).toThrow();
  });

  it("rejects negative latency_ms (zod)", () => {
    expect(() => TransportHealthProbeEngine.analyze("t", [sample(-1, true)])).toThrow();
  });

  it("renderHealth shows verdict tag + id + stats", () => {
    const md = TransportHealthProbeEngine.renderHealth(
      TransportHealthProbeEngine.analyze("api", [sample(50, true), sample(60, true)]),
    );
    expect(md.includes("[TRANSPORT HEALTHY]")).toBe(true);
    expect(md.includes("api")).toBe(true);
    expect(md.includes("samples=2")).toBe(true);
  });
});
