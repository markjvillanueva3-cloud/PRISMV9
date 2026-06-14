/**
 * Tests for QuoteOutcomeFeedEngine — QUOTING-PIPELINE-MS0 / SYNERGY-NN-GNN.
 * Verifies the psi_delta feed math + PSNAutonomyLoop integration + R12 fail-loud.
 */
import { describe, it, expect } from "vitest";
import { QuoteOutcomeFeedEngine } from "../engines/QuoteOutcomeFeedEngine.js";

const eng = new QuoteOutcomeFeedEngine();

describe("QuoteOutcomeFeedEngine.feed — happy path", () => {
  it("quoted under actual → positive delta (we lost margin), fed=true", () => {
    const r = eng.feed({ quote_id: "Q-001", quoted_cost_usd: 900, actual_cost_usd: 1000 });
    expect(r.fed).toBe(true);
    expect(r.delta).toBeCloseTo(0.10, 4);
    expect(r.signal_event?.type).toBe("psi_delta");
    expect(r.signal_event?.unit_id).toBe("Q-001");
  });

  it("quoted over actual → negative delta (left bid on table), fed=true", () => {
    const r = eng.feed({ quote_id: "Q-002", quoted_cost_usd: 1100, actual_cost_usd: 1000 });
    expect(r.fed).toBe(true);
    expect(r.delta).toBeCloseTo(-0.10, 4);
  });

  it("quoted == actual → delta=0, fed=true", () => {
    const r = eng.feed({ quote_id: "Q-003", quoted_cost_usd: 1000, actual_cost_usd: 1000 });
    expect(r.fed).toBe(true);
    expect(r.delta).toBe(0);
  });

  it("large quote miss clamps to ±0.10 (one bad quote can't dominate training)", () => {
    const r = eng.feed({ quote_id: "Q-004", quoted_cost_usd: 100, actual_cost_usd: 1000 });
    expect(r.delta).toBe(0.10); // raw = 0.9, clamped to 0.10
  });

  it("signal_event timestamp defaults to now-ISO when not provided", () => {
    const r = eng.feed({ quote_id: "Q-005", quoted_cost_usd: 900, actual_cost_usd: 1000 });
    expect(r.signal_event?.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("QuoteOutcomeFeedEngine.feed — failure modes (R12 fail-loud)", () => {
  it("missing quote_id → fed=false reason=missing-quote-id", () => {
    const r = eng.feed({ quote_id: "", quoted_cost_usd: 900, actual_cost_usd: 1000 });
    expect(r.fed).toBe(false);
    expect(r.reason).toBe("missing-quote-id");
  });

  it("non-finite cost (NaN) → fed=false reason=non-finite-cost", () => {
    const r = eng.feed({ quote_id: "Q-006", quoted_cost_usd: NaN, actual_cost_usd: 1000 });
    expect(r.fed).toBe(false);
    expect(r.reason).toBe("non-finite-cost");
  });

  it("non-positive actual_cost → fed=false reason=non-positive-actual-cost", () => {
    const r = eng.feed({ quote_id: "Q-007", quoted_cost_usd: 500, actual_cost_usd: 0 });
    expect(r.fed).toBe(false);
    expect(r.reason).toBe("non-positive-actual-cost");
  });

  it("missing record entirely → fed=false reason=missing-required-fields", () => {
    // @ts-expect-error testing runtime guard
    const r = eng.feed(null);
    expect(r.fed).toBe(false);
    expect(r.reason).toMatch(/missing-required-fields/);
  });
});

describe("QuoteOutcomeFeedEngine.feedBatch", () => {
  it("returns one result per record, preserves order", () => {
    const results = eng.feedBatch([
      { quote_id: "B1", quoted_cost_usd: 900, actual_cost_usd: 1000 },
      { quote_id: "B2", quoted_cost_usd: 1100, actual_cost_usd: 1000 },
      { quote_id: "B3", quoted_cost_usd: 1000, actual_cost_usd: 1000 },
    ]);
    expect(results.length).toBe(3);
    expect(results[0].delta).toBeCloseTo(0.10, 4);
    expect(results[1].delta).toBeCloseTo(-0.10, 4);
    expect(results[2].delta).toBe(0);
  });
});
