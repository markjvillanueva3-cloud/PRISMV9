/**
 * QuantizationProfileEngine tests — HMEMV11. Asserts profile selection
 * across corpus-size × latency-budget axes.
 */
import { describe, it, expect } from "vitest";
import { QuantizationProfileEngine } from "../engines/QuantizationProfileEngine.js";

describe("QuantizationProfileEngine.select", () => {
  it("small corpus + generous budget → 'none' (highest recall)", () => {
    const s = QuantizationProfileEngine.select(100_000, 1000);
    expect(s.recommended).toBe("none");
    expect(s.est_compression_ratio).toBe(1);
    expect(s.est_recall_floor).toBe(1.0);
    // 100K / 1M * 100ms = 10ms
    expect(s.est_query_ms).toBeCloseTo(10, 5);
  });

  it("1M corpus + 50ms budget → 'scalar-8bit' (none=100ms exceeds budget)", () => {
    const s = QuantizationProfileEngine.select(1_000_000, 50);
    expect(s.recommended).toBe("scalar-8bit");
    expect(s.est_recall_floor).toBe(0.99);
    // 1M / 1M * 30ms = 30ms
    expect(s.est_query_ms).toBeCloseTo(30, 5);
  });

  it("10M corpus + 50ms budget → 'binary-1bit' (only profile fitting budget)", () => {
    // 10M corpus: none=1000ms, 8bit=300ms, 4bit=120ms, 1bit=30ms. Only 1bit ≤50.
    const s = QuantizationProfileEngine.select(10_000_000, 50);
    expect(s.recommended).toBe("binary-1bit");
    expect(s.est_query_ms).toBe(30);
    expect(s.est_recall_floor).toBe(0.88);
  });

  it("10M corpus + 150ms budget → 'scalar-4bit' (next-best profile fitting)", () => {
    const s = QuantizationProfileEngine.select(10_000_000, 150);
    expect(s.recommended).toBe("scalar-4bit");
    expect(s.est_query_ms).toBe(120);
  });

  it("100M corpus + 10ms budget exceeds even binary → returns binary with overflow reason", () => {
    const s = QuantizationProfileEngine.select(100_000_000, 10);
    expect(s.recommended).toBe("binary-1bit");
    expect(s.reason.includes("exceeds budget")).toBe(true);
  });

  it("throws on negative corpus_size (adversarial)", () => {
    expect(() => QuantizationProfileEngine.select(-1, 100)).toThrow();
  });

  it("throws on zero or negative budget", () => {
    expect(() => QuantizationProfileEngine.select(1000, 0)).toThrow();
    expect(() => QuantizationProfileEngine.select(1000, -10)).toThrow();
  });

  it("throws on NaN inputs", () => {
    expect(() => QuantizationProfileEngine.select(NaN, 100)).toThrow();
    expect(() => QuantizationProfileEngine.select(1000, NaN)).toThrow();
  });

  it("renderSelection emits kind + compression + recall floor", () => {
    const s = QuantizationProfileEngine.select(1_000_000, 50);
    const md = QuantizationProfileEngine.renderSelection(s);
    expect(md.includes("[QUANT] scalar-8bit")).toBe(true);
    expect(md.includes("×4")).toBe(true);
    expect(md.includes("recall≥0.99")).toBe(true);
  });

  it("compression ratios sorted ASC across profile DESC (×1 → ×4 → ×8 → ×32)", () => {
    const tiny = QuantizationProfileEngine.select(1_000, 1000);
    const m = QuantizationProfileEngine.select(1_000_000, 50);
    const big = QuantizationProfileEngine.select(10_000_000, 50);
    expect(tiny.est_compression_ratio).toBe(1);
    expect(m.est_compression_ratio).toBe(4);
    expect(big.est_compression_ratio).toBe(32);
  });

  it("zero corpus_size + small budget → 'none' (est_query_ms=0)", () => {
    const s = QuantizationProfileEngine.select(0, 1);
    expect(s.recommended).toBe("none");
    expect(s.est_query_ms).toBe(0);
  });

  it("Infinity corpus_size rejected (adversarial)", () => {
    expect(() => QuantizationProfileEngine.select(Infinity, 100)).toThrow();
  });

  it("Infinity budget rejected (adversarial)", () => {
    // Infinity is technically positive finite=false, but the impl checks isFinite — should reject.
    expect(() => QuantizationProfileEngine.select(1000, Infinity)).toThrow();
  });

  it("est_recall_floor monotonic DESC across profiles (1.0 ≥ 0.99 ≥ 0.95 ≥ 0.88)", () => {
    const none = QuantizationProfileEngine.select(1_000, 1000);
    const s8 = QuantizationProfileEngine.select(1_000_000, 50);
    const s4 = QuantizationProfileEngine.select(10_000_000, 150);
    const b1 = QuantizationProfileEngine.select(10_000_000, 50);
    expect(none.est_recall_floor).toBe(1.0);
    expect(s8.est_recall_floor).toBe(0.99);
    expect(s4.est_recall_floor).toBe(0.95);
    expect(b1.est_recall_floor).toBe(0.88);
  });
});
