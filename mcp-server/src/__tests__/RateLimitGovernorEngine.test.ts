/** RateLimitGovernorEngine tests — HMPI05. Token-bucket arithmetic. */
import { describe, it, expect } from "vitest";
import { RateLimitGovernorEngine } from "../engines/RateLimitGovernorEngine.js";

const T0 = "2026-05-24T13:00:00.000Z";
const T1S = "2026-05-24T13:00:01.000Z";   // +1s
const T10S = "2026-05-24T13:00:10.000Z";  // +10s
const T60S = "2026-05-24T13:01:00.000Z";  // +60s

describe("RateLimitGovernorEngine.initial / refill", () => {
  it("initial state has full capacity tokens", () => {
    const s = RateLimitGovernorEngine.initial("b", 10, 1, T0);
    expect(s.tokens).toBe(10);
    expect(s.capacity).toBe(10);
    expect(s.last_refill_at).toBe(T0);
  });

  it("refill adds refill_rate * elapsed seconds, capped at capacity", () => {
    let s = RateLimitGovernorEngine.initial("b", 10, 2, T0);
    s = { ...s, tokens: 0 };
    const r = RateLimitGovernorEngine.refill(s, T1S);
    // 1s × 2/s = 2 tokens
    expect(r.tokens).toBe(2);
  });

  it("refill caps at capacity when elapsed time would overflow", () => {
    let s = RateLimitGovernorEngine.initial("b", 5, 10, T0);
    s = { ...s, tokens: 0 };
    const r = RateLimitGovernorEngine.refill(s, T60S); // 60s × 10/s = 600 tokens, capped at 5
    expect(r.tokens).toBe(5);
  });

  it("refill updates last_refill_at", () => {
    const s = RateLimitGovernorEngine.refill(RateLimitGovernorEngine.initial("b", 10, 1, T0), T10S);
    expect(s.last_refill_at).toBe(T10S);
  });
});

describe("RateLimitGovernorEngine.consume", () => {
  it("allows when sufficient tokens", () => {
    const s = RateLimitGovernorEngine.initial("b", 10, 1, T0);
    const v = RateLimitGovernorEngine.consume(s, 5, T0);
    expect(v.allowed).toBe(true);
    expect(v.state.tokens).toBe(5);
  });

  it("denies when insufficient tokens (and does NOT deduct)", () => {
    let s = RateLimitGovernorEngine.initial("b", 10, 0, T0);
    s = { ...s, tokens: 2 };
    const v = RateLimitGovernorEngine.consume(s, 5, T0);
    expect(v.allowed).toBe(false);
    expect(v.state.tokens).toBe(2);
    expect(v.reason).toContain("insufficient");
  });

  it("refills before checking — burst pattern", () => {
    let s = RateLimitGovernorEngine.initial("b", 10, 1, T0);
    s = { ...s, tokens: 0 };
    // 10s later → +10 tokens → full → consume 5 succeeds
    const v = RateLimitGovernorEngine.consume(s, 5, T10S);
    expect(v.allowed).toBe(true);
    expect(v.state.tokens).toBe(5);
  });

  it("throws on negative cost (adversarial)", () => {
    const s = RateLimitGovernorEngine.initial("b", 10, 1, T0);
    expect(() => RateLimitGovernorEngine.consume(s, -1, T0)).toThrow();
  });

  it("throws on NaN cost", () => {
    const s = RateLimitGovernorEngine.initial("b", 10, 1, T0);
    expect(() => RateLimitGovernorEngine.consume(s, NaN, T0)).toThrow();
  });

  it("initial rejects zero capacity", () => {
    expect(() => RateLimitGovernorEngine.initial("b", 0, 1, T0)).toThrow();
  });

  it("initial rejects negative refill rate", () => {
    expect(() => RateLimitGovernorEngine.initial("b", 10, -1, T0)).toThrow();
  });

  it("renderState shows bucket id + tokens + refill rate", () => {
    const md = RateLimitGovernorEngine.renderState(RateLimitGovernorEngine.initial("api", 100, 5, T0));
    expect(md.includes("[RATE-LIMIT api]")).toBe(true);
    expect(md.includes("100.00/100")).toBe(true);
    expect(md.includes("refill 5/s")).toBe(true);
  });
});
