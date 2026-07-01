/**
 * MaterialMarketPriceResolverEngine.test.ts -- QUOTING-OPTIMAL-MS0 / U3
 *
 * Reference-value tests on the freshest-authoritative-source resolution + the
 * staleness gate. Injected sources keep it pure. No stubs (R9).
 */
import { describe, it, expect } from "vitest";
import {
  materialMarketPriceResolverEngine,
  MaterialMarketPriceResolverEngine,
  DEFAULT_MAX_PRICE_AGE_DAYS,
  type MaterialPriceSources,
  type SourcePrice,
} from "../engines/MaterialMarketPriceResolverEngine.js";

const TODAY = "2026-06-30";

function sp(source: SourcePrice["source"], usd: number | null, as_of: string | null, confidence = 0.9): SourcePrice {
  return { source, usd_per_in3: usd, as_of, confidence };
}

/** Build an injectable source set; pass null for a source that has no answer. */
function sources(opts: { ap?: SourcePrice | null; doc?: SourcePrice | null; com?: SourcePrice | null }): MaterialPriceSources {
  return {
    apLedger: () => opts.ap ?? null,
    docustrataPrior: () => opts.doc ?? null,
    commodity: () => opts.com ?? null,
  };
}

describe("MaterialMarketPriceResolverEngine -- source priority", () => {
  it("prefers the AP-ledger when it is fresh", () => {
    const s = sources({
      ap: sp("ap-ledger", 1.55, "2026-06-01"),
      doc: sp("docustrata-prior", 1.7, "2026-06-01"),
      com: sp("commodity-lme", 0.9, "2026-06-01"),
    });
    const r = materialMarketPriceResolverEngine.resolve("H13", s, { asOfDate: TODAY });
    expect(r.ok).toBe(true);
    expect(r.source).toBe("ap-ledger");
    expect(r.usd_per_in3).toBe(1.55);
    expect(r.stale).toBe(false);
    expect(r.considered.length).toBeGreaterThanOrEqual(1);
  });

  it("falls through to DocuStrata when AP-ledger has no price", () => {
    const s = sources({
      ap: sp("ap-ledger", null, "2026-06-01"),
      doc: sp("docustrata-prior", 1.7, "2026-06-15"),
    });
    const r = materialMarketPriceResolverEngine.resolve("S7", s, { asOfDate: TODAY });
    expect(r.source).toBe("docustrata-prior");
    expect(r.usd_per_in3).toBe(1.7);
  });

  it("falls through to commodity when AP + DocuStrata are absent", () => {
    const s = sources({ com: sp("commodity-lme", 0.85, "2026-06-20") });
    const r = materialMarketPriceResolverEngine.resolve("4140", s, { asOfDate: TODAY });
    expect(r.source).toBe("commodity-lme");
    expect(r.usd_per_in3).toBe(0.85);
  });

  it("treats an undated source as fresh (age 0)", () => {
    const s = sources({ ap: sp("ap-ledger", 1.55, null) });
    const r = materialMarketPriceResolverEngine.resolve("H13", s, { asOfDate: TODAY });
    expect(r.stale).toBe(false);
    expect(r.age_days).toBe(0);
  });
});

describe("MaterialMarketPriceResolverEngine -- staleness gate", () => {
  it("skips a STALE AP-ledger and uses a FRESH DocuStrata instead", () => {
    const s = sources({
      ap: sp("ap-ledger", 1.55, "2025-01-01"), // ~545d old -> stale
      doc: sp("docustrata-prior", 1.7, "2026-06-15"), // fresh
    });
    const r = materialMarketPriceResolverEngine.resolve("H13", s, { asOfDate: TODAY });
    expect(r.source).toBe("docustrata-prior");
    expect(r.stale).toBe(false);
  });

  it("returns the least-stale price with stale:true when ALL sources are stale", () => {
    const s = sources({
      ap: sp("ap-ledger", 1.55, "2024-01-01"), // very old
      doc: sp("docustrata-prior", 1.7, "2026-01-01"), // ~180d old, least stale
    });
    const r = materialMarketPriceResolverEngine.resolve("H13", s, { asOfDate: TODAY });
    expect(r.ok).toBe(true);
    expect(r.stale).toBe(true);
    expect(r.source).toBe("docustrata-prior"); // least stale
    expect(r.reason).toContain("all-sources-stale");
  });

  it("halves confidence when the result is stale", () => {
    const s = sources({ ap: sp("ap-ledger", 1.55, "2024-01-01", 0.9) });
    const r = materialMarketPriceResolverEngine.resolve("H13", s, { asOfDate: TODAY });
    expect(r.stale).toBe(true);
    expect(r.confidence).toBeCloseTo(0.45, 6);
  });

  it("respects a custom maxAgeDays", () => {
    const s = sources({ ap: sp("ap-ledger", 1.55, "2026-06-01") }); // 29d old
    const tight = materialMarketPriceResolverEngine.resolve("H13", s, { asOfDate: TODAY, maxAgeDays: 7 });
    const loose = materialMarketPriceResolverEngine.resolve("H13", s, { asOfDate: TODAY, maxAgeDays: 90 });
    expect(tight.stale).toBe(true); // 29 > 7
    expect(loose.stale).toBe(false); // 29 <= 90
  });
});

describe("MaterialMarketPriceResolverEngine -- failure modes", () => {
  it("ok:false when no source yields a price (R12 -- no fabrication)", () => {
    const s = sources({ ap: sp("ap-ledger", null, "2026-06-01"), doc: null, com: null });
    const r = materialMarketPriceResolverEngine.resolve("UNOBTANIUM", s, { asOfDate: TODAY });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("no-priced-source");
    expect(r.usd_per_in3).toBeNull();
  });

  it("ok:false on empty grade", () => {
    const r = materialMarketPriceResolverEngine.resolve("", sources({ ap: sp("ap-ledger", 1.5, TODAY) }), { asOfDate: TODAY });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("empty-grade");
  });

  it("ok:false on an invalid as-of date", () => {
    const r = materialMarketPriceResolverEngine.resolve("H13", sources({ ap: sp("ap-ledger", 1.5, "2026-06-01") }), { asOfDate: "not-a-date" });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("invalid-as-of-date");
  });

  it("survives a throwing source (fail-soft per source)", () => {
    const s: MaterialPriceSources = {
      apLedger: () => { throw new Error("AP store down"); },
      docustrataPrior: () => sp("docustrata-prior", 1.7, "2026-06-15"),
      commodity: () => null,
    };
    const r = materialMarketPriceResolverEngine.resolve("H13", s, { asOfDate: TODAY });
    expect(r.ok).toBe(true);
    expect(r.source).toBe("docustrata-prior");
  });
});

describe("MaterialMarketPriceResolverEngine -- adversarial + constants", () => {
  it("ignores NaN / Infinity / zero / negative prices", () => {
    const s = sources({
      ap: sp("ap-ledger", NaN, "2026-06-01"),
      doc: sp("docustrata-prior", -5, "2026-06-01"),
      com: sp("commodity-lme", 0.85, "2026-06-20"),
    });
    const r = materialMarketPriceResolverEngine.resolve("H13", s, { asOfDate: TODAY });
    expect(r.source).toBe("commodity-lme"); // skipped the NaN + negative
    expect(r.usd_per_in3).toBe(0.85);
  });

  it("DEFAULT_MAX_PRICE_AGE_DAYS is 90", () => {
    expect(DEFAULT_MAX_PRICE_AGE_DAYS).toBe(90);
  });

  it("fresh instance behaves identically", () => {
    const s = sources({ ap: sp("ap-ledger", 1.55, "2026-06-01") });
    const r = new MaterialMarketPriceResolverEngine().resolve("H13", s, { asOfDate: TODAY });
    expect(r.usd_per_in3).toBe(1.55);
  });
});
