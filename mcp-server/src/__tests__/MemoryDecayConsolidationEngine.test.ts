/**
 * MemoryDecayConsolidationEngine tests — HMEMV05. Exact decay arithmetic +
 * merge semantics + drop-below-threshold counts.
 */
import { describe, it, expect } from "vitest";
import {
  MemoryDecayConsolidationEngine,
  type ConsolidationEntry,
} from "../engines/MemoryDecayConsolidationEngine.js";

const ISO = "2026-05-24T13:00:00.000Z";
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

const entry = (key: string, value: unknown, confidence: number, created_at: string = ISO): ConsolidationEntry => ({
  key, value, created_at, access_count: 0, confidence,
});

describe("MemoryDecayConsolidationEngine.decayConfidence", () => {
  it("returns same confidence when now == created_at", () => {
    const e = entry("k", 1, 0.8);
    expect(MemoryDecayConsolidationEngine.decayConfidence(e, ISO, ONE_WEEK)).toBe(0.8);
  });

  it("halves confidence after one half-life", () => {
    const e = entry("k", 1, 0.8);
    const oneWeek = "2026-05-31T13:00:00.000Z";
    expect(MemoryDecayConsolidationEngine.decayConfidence(e, oneWeek, ONE_WEEK)).toBeCloseTo(0.4, 9);
  });

  it("quarters confidence after two half-lives", () => {
    const e = entry("k", 1, 0.8);
    const twoWeeks = "2026-06-07T13:00:00.000Z";
    expect(MemoryDecayConsolidationEngine.decayConfidence(e, twoWeeks, ONE_WEEK)).toBeCloseTo(0.2, 9);
  });
});

describe("MemoryDecayConsolidationEngine.consolidate — merge + decay + drop", () => {
  it("merges two same-key entries to the higher confidence one", () => {
    const entries: ConsolidationEntry[] = [
      entry("k1", "a", 0.5),
      entry("k1", "b", 0.9),
    ];
    const r = MemoryDecayConsolidationEngine.consolidate(entries, ISO);
    expect(r.consolidated).toHaveLength(1);
    expect(r.consolidated[0].value).toBe("b");
    expect(r.consolidated[0].confidence).toBe(0.9);
    expect(r.merged_count).toBe(1);
    expect(r.dropped_count).toBe(0);
  });

  it("drops entries below confidence floor after decay", () => {
    const oldEntry = entry("k1", 1, 0.4, "2026-05-17T13:00:00.000Z");
    // 7 days old, decayed = 0.2; threshold default 0.1, so kept.
    // But raise minConfidence to 0.3 → drop.
    const r = MemoryDecayConsolidationEngine.consolidate([oldEntry], ISO, { minConfidence: 0.3 });
    expect(r.consolidated).toHaveLength(0);
    expect(r.dropped_count).toBe(1);
    expect(r.decayed_count).toBe(1);
  });

  it("custom mergeReducer wins over default", () => {
    const entries: ConsolidationEntry[] = [
      entry("k1", 10, 0.5),
      entry("k1", 20, 0.9),
    ];
    const r = MemoryDecayConsolidationEngine.consolidate(entries, ISO, {
      mergeReducer: (a, b) => ({ ...a, value: (a.value as number) + (b.value as number) }),
    });
    expect(r.consolidated[0].value).toBe(30); // 10 + 20
  });

  it("3-key batch: 2 unique kept + 1 merged → 2 consolidated", () => {
    const entries: ConsolidationEntry[] = [
      entry("k1", "x", 0.7),
      entry("k1", "y", 0.5),
      entry("k2", "z", 0.6),
    ];
    const r = MemoryDecayConsolidationEngine.consolidate(entries, ISO);
    expect(r.consolidated).toHaveLength(2);
    expect(r.merged_count).toBe(1);
  });

  it("throws on non-array input (failure mode)", () => {
    expect(() => MemoryDecayConsolidationEngine.consolidate(null as never, ISO)).toThrow(/array/);
  });

  it("rejects entry with confidence > 1 (zod adversarial)", () => {
    expect(() => MemoryDecayConsolidationEngine.consolidate([entry("k", 1, 1.5)], ISO)).toThrow();
  });

  it("empty input → empty result with zero counts", () => {
    const r = MemoryDecayConsolidationEngine.consolidate([], ISO);
    expect(r.consolidated).toEqual([]);
    expect(r.merged_count).toBe(0);
    expect(r.dropped_count).toBe(0);
    expect(r.decayed_count).toBe(0);
  });

  it("custom halfLifeMs (1h) decays faster than default 7-day", () => {
    const e = entry("k", 1, 1.0, ISO);
    const oneHour = "2026-05-24T14:00:00.000Z";
    const r = MemoryDecayConsolidationEngine.consolidate([e], oneHour, {
      decayHalfLifeMs: 60 * 60 * 1000,
      minConfidence: 0.4,
    });
    // 1h elapsed = 1 half-life → 0.5 confidence ≥ 0.4 → kept
    expect(r.consolidated).toHaveLength(1);
    expect(r.consolidated[0].confidence).toBeCloseTo(0.5, 9);
  });
});
