/**
 * QuoteOutcomePSIDeltaBridge — U-QP-PSI-DELTA-WIRE tests
 * @milestone QUOTING-COMPLETENESS-MS0/U-QP-PSI-DELTA-WIRE
 */

import { describe, it, expect } from "vitest";
import { quoteOutcomePSIDeltaBridgeEngine } from "../engines/QuoteOutcomePSIDeltaBridgeEngine.js";

describe("QuoteOutcomePSIDeltaBridgeEngine — U-QP-PSI-DELTA-WIRE", () => {
  it("perfect prediction (0% error) → psi_delta = +0.10 (clamped max)", () => {
    const r = quoteOutcomePSIDeltaBridgeEngine.scoreOutcome({
      quote_id: "Q1", predicted_usd: 100, actual_usd: 100,
    });
    expect(r.ok).toBe(true);
    expect(r.abs_pct_error).toBe(0);
    expect(r.psi_delta).toBeCloseTo(0.10, 2);
    expect(r.signal_event.type).toBe("psi_delta");
  });

  it("100% over-prediction → psi_delta near -0.10 (clamped min, large reward penalty)", () => {
    const r = quoteOutcomePSIDeltaBridgeEngine.scoreOutcome({
      quote_id: "Q2", predicted_usd: 200, actual_usd: 100,
    });
    // signedPct = 100; psi_raw = (1 - 1 - 0.5) * 0.2 = -0.1 → clamped to -0.1
    expect(r.psi_delta).toBeCloseTo(-0.10, 2);
  });

  it("50% over-prediction → psi_delta = 0 (neutral)", () => {
    const r = quoteOutcomePSIDeltaBridgeEngine.scoreOutcome({
      quote_id: "Q3", predicted_usd: 150, actual_usd: 100,
    });
    // psi_raw = (1 - 0.5 - 0.5) * 0.2 = 0
    expect(r.psi_delta).toBe(0);
  });

  it("REJECTS missing quote_id", () => {
    const r = quoteOutcomePSIDeltaBridgeEngine.scoreOutcome({
      quote_id: "", predicted_usd: 100, actual_usd: 100,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/quote_id required/);
  });

  it("REJECTS zero or negative actual_usd", () => {
    const r = quoteOutcomePSIDeltaBridgeEngine.scoreOutcome({
      quote_id: "Q5", predicted_usd: 100, actual_usd: 0,
    });
    expect(r.ok).toBe(false);
  });

  it("batch scoring produces aggregate_psi + rejection list", () => {
    const r = quoteOutcomePSIDeltaBridgeEngine.scoreBatch([
      { quote_id: "B1", predicted_usd: 100, actual_usd: 100 },  // psi +0.10
      { quote_id: "B2", predicted_usd: 200, actual_usd: 100 },  // psi -0.10
      { quote_id: "B3", predicted_usd: 100, actual_usd: 0 },    // REJECTED
    ]);
    expect(r.n_scored).toBe(2);
    expect(r.n_rejected).toBe(1);
    expect(r.aggregate_psi).toBeCloseTo(0, 2); // (+0.10 + -0.10) / 2
  });

  it("slot + customer surface in signal event (autonomy loop attribution)", () => {
    const r = quoteOutcomePSIDeltaBridgeEngine.scoreOutcome({
      quote_id: "Q7", predicted_usd: 110, actual_usd: 100, slot: "charlie", customer: "ACME",
    });
    expect(r.signal_event.slot).toBe("charlie");
    expect(r.signal_event.unit_id).toBe("Q7");
  });
});
