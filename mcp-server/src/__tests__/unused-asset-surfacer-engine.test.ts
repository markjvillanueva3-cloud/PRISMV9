/**
 * Tests for UnusedAssetSurfacerEngine (Phase 0.24 U-WIRE7)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  UnusedAssetSurfacerEngine,
  DEFAULT_SURFACER_CONFIG,
  unusedAssetSurfacerEngine,
  type AssetInvocationRecord,
} from "../engines/UnusedAssetSurfacerEngine.js";

const NOW = Date.parse("2026-04-16T12:00:00.000Z");

function daysAgo(n: number): string {
  return new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();
}

function record(overrides: Partial<AssetInvocationRecord> = {}): AssetInvocationRecord {
  return {
    id: overrides.id ?? "r1",
    invocationCount: overrides.invocationCount ?? 0,
    lastInvokedAt: overrides.lastInvokedAt ?? null,
    registeredAt: overrides.registeredAt ?? daysAgo(30),
    tags: overrides.tags,
  };
}

describe("UnusedAssetSurfacerEngine", () => {
  let e: UnusedAssetSurfacerEngine;

  beforeEach(() => {
    e = new UnusedAssetSurfacerEngine();
  });

  describe("construction + validation", () => {
    it("uses default config when none supplied", () => {
      expect(DEFAULT_SURFACER_CONFIG.observationDays).toBe(30);
    });

    it("rejects invalid config values", () => {
      expect(() =>
        new UnusedAssetSurfacerEngine({
          observationDays: 0,
          decayThresholdDays: 7,
          highRateThreshold: 10,
        })
      ).toThrow(/observationDays/);

      expect(() =>
        new UnusedAssetSurfacerEngine({
          observationDays: 30,
          decayThresholdDays: -1,
          highRateThreshold: 10,
        })
      ).toThrow(/decayThresholdDays/);

      expect(() =>
        new UnusedAssetSurfacerEngine({
          observationDays: 30,
          decayThresholdDays: 7,
          highRateThreshold: 0,
        })
      ).toThrow(/highRateThreshold/);
    });

    it("setConfig swaps the active config", () => {
      e.setConfig({ observationDays: 60, decayThresholdDays: 14, highRateThreshold: 100 });
      // Zero-invocation gate is observationDays/4 = 15 days; pick an age above it.
      const r = record({ registeredAt: daysAgo(30) });
      expect(e.surface([r], NOW)[0].bucket).toBe("zero-invocation");
    });
  });

  describe("surface() — validation", () => {
    it("rejects invalid record fields", () => {
      expect(() => e.surface([{ ...record(), id: "" }], NOW)).toThrow(/id/);
      expect(() => e.surface([{ ...record(), registeredAt: "bogus" }], NOW)).toThrow(/registeredAt/);
      expect(() => e.surface([{ ...record(), invocationCount: -1 }], NOW)).toThrow(/invocationCount/);
      expect(() => e.surface([{ ...record(), lastInvokedAt: "bogus" }], NOW)).toThrow(/lastInvokedAt/);
    });
  });

  describe("surface() — zero-invocation bucket", () => {
    it("flags a record with zero invocations", () => {
      const result = e.surface([record({ registeredAt: daysAgo(20) })], NOW);
      expect(result[0].bucket).toBe("zero-invocation");
    });

    it("ignores very young zero-invocation records", () => {
      const result = e.surface([record({ registeredAt: daysAgo(1) })], NOW);
      expect(result).toEqual([]);
    });

    it("older records have higher severity", () => {
      const short = e.surface([record({ id: "a", registeredAt: daysAgo(10) })], NOW);
      const long = e.surface([record({ id: "b", registeredAt: daysAgo(40) })], NOW);
      expect(long[0].severity).toBeGreaterThan(short[0].severity);
    });
  });

  describe("surface() — decaying bucket", () => {
    it("flags assets last used beyond the decay threshold", () => {
      const result = e.surface([
        record({
          id: "r",
          invocationCount: 5,
          lastInvokedAt: daysAgo(10),
          registeredAt: daysAgo(30),
        }),
      ], NOW);
      expect(result[0].bucket).toBe("decaying");
    });

    it("does not flag recently-used assets", () => {
      const result = e.surface([
        record({
          id: "r",
          invocationCount: 5,
          lastInvokedAt: daysAgo(1),
          registeredAt: daysAgo(30),
        }),
      ], NOW);
      expect(result).toEqual([]);
    });
  });

  describe("surface() — capacity-constrained bucket", () => {
    it("flags high invocation rates", () => {
      const result = e.surface([
        record({
          id: "r",
          invocationCount: 10_000,
          lastInvokedAt: daysAgo(1),
          registeredAt: daysAgo(30),
        }),
      ], NOW);
      expect(result[0].bucket).toBe("capacity-constrained");
    });
  });

  describe("surface() — ordering", () => {
    it("sorts by severity desc, then id", () => {
      const r1 = record({ id: "b", registeredAt: daysAgo(15), invocationCount: 0 });
      const r2 = record({ id: "a", registeredAt: daysAgo(60), invocationCount: 0 });
      const out = e.surface([r1, r2], NOW);
      expect(out[0].id).toBe("a");
    });

    it("tags are lowercased and deduped", () => {
      const r = record({
        id: "t",
        registeredAt: daysAgo(40),
        invocationCount: 0,
        tags: ["Wedm", "wedm", "OKUMA"],
      });
      const out = e.surface([r], NOW);
      expect(out[0].tags.sort()).toEqual(["okuma", "wedm"]);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      const result = unusedAssetSurfacerEngine.surface([
        record({ id: "singleton", registeredAt: daysAgo(40) }),
      ], NOW);
      expect(result[0].bucket).toBe("zero-invocation");
    });
  });
});
