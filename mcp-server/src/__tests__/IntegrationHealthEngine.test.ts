/**
 * IntegrationHealthEngine tests — HMPI03.
 */
import { describe, it, expect } from "vitest";
import { IntegrationHealthEngine, type ProbeResult } from "../engines/IntegrationHealthEngine.js";

const ISO = "2026-05-24T13:00:00.000Z";
const RECENT = "2026-05-24T12:59:00.000Z";
const OLD = "2026-05-24T12:00:00.000Z";

const probe = (over: Partial<ProbeResult> = {}): ProbeResult => ({
  integration_id: "github", success_rate: 1, p50_latency_ms: 100, p95_latency_ms: 200,
  last_seen_at: RECENT, ...over,
});

describe("IntegrationHealthEngine.score — verdict thresholds", () => {
  it("perfect probe → healthy with score ≥80", () => {
    const s = IntegrationHealthEngine.score(probe(), ISO);
    expect(s.verdict).toBe("healthy");
    expect(s.score).toBeGreaterThanOrEqual(80);
    expect(s.availability_score).toBe(100);
  });

  it("50% success rate + healthy latency → degraded", () => {
    const s = IntegrationHealthEngine.score(probe({ success_rate: 0.5 }), ISO);
    expect(s.verdict).toBe("degraded");
    expect(s.availability_score).toBe(50);
  });

  it("0% success_rate → unhealthy verdict", () => {
    const s = IntegrationHealthEngine.score(probe({ success_rate: 0 }), ISO);
    expect(s.verdict).toBe("unhealthy");
    expect(s.score).toBeLessThan(50);
  });

  it("no last_seen_at → unknown verdict (cannot measure freshness)", () => {
    const s = IntegrationHealthEngine.score(probe({ last_seen_at: undefined }), ISO);
    expect(s.verdict).toBe("unknown");
    expect(s.freshness_score).toBe(0);
  });
});

describe("IntegrationHealthEngine.score — component scores", () => {
  it("latency at budget (2000ms) → latency_score=0", () => {
    const s = IntegrationHealthEngine.score(probe({ p95_latency_ms: 2000 }), ISO);
    expect(s.latency_score).toBe(0);
  });

  it("latency at zero → latency_score=100", () => {
    const s = IntegrationHealthEngine.score(probe({ p95_latency_ms: 0 }), ISO);
    expect(s.latency_score).toBe(100);
  });

  it("freshness drops to 0 at 5-minute boundary", () => {
    const s = IntegrationHealthEngine.score(probe({ last_seen_at: OLD }), ISO);
    expect(s.freshness_score).toBe(0);
  });

  it("availability_score = success_rate × 100", () => {
    expect(IntegrationHealthEngine.score(probe({ success_rate: 0.75 }), ISO).availability_score).toBe(75);
  });
});

describe("IntegrationHealthEngine.aggregate", () => {
  it("aggregates fleet of 3 probes (2 healthy + 1 degraded)", () => {
    const scores = [
      IntegrationHealthEngine.score(probe({ integration_id: "a" }), ISO),
      IntegrationHealthEngine.score(probe({ integration_id: "b" }), ISO),
      IntegrationHealthEngine.score(probe({ integration_id: "c", success_rate: 0.5 }), ISO),
    ];
    const agg = IntegrationHealthEngine.aggregate(scores);
    expect(agg.healthy_count).toBe(2);
    expect(agg.degraded_count).toBe(1);
    expect(agg.unhealthy_count).toBe(0);
  });

  it("empty fleet → zero overall", () => {
    const agg = IntegrationHealthEngine.aggregate([]);
    expect(agg.overall_score).toBe(0);
    expect(agg.healthy_count).toBe(0);
  });

  it("renderScore emits verdict tag + integration_id", () => {
    const md = IntegrationHealthEngine.renderScore(IntegrationHealthEngine.score(probe(), ISO));
    expect(md.includes("[HEALTH HEALTHY]")).toBe(true);
    expect(md.includes("github")).toBe(true);
  });

  it("rejects success_rate > 1 (zod adversarial)", () => {
    expect(() => IntegrationHealthEngine.score(probe({ success_rate: 1.5 }), ISO)).toThrow();
  });

  it("rejects negative latency (zod adversarial)", () => {
    expect(() => IntegrationHealthEngine.score(probe({ p95_latency_ms: -1 }), ISO)).toThrow();
  });
});
