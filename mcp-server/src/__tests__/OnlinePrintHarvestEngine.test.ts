import { describe, it, expect } from "vitest";
import { OnlinePrintHarvestEngine } from "../engines/OnlinePrintHarvestEngine.js";

const engine = new OnlinePrintHarvestEngine();

describe("OnlinePrintHarvestEngine.catalog", () => {
  it("returns schema_version 1.0.0 + at least 9 sources", () => {
    const c = engine.catalog();
    expect(c.schema_version).toBe("1.0.0");
    expect(c.total_sources).toBeGreaterThanOrEqual(9);
    expect(c.sources.length).toBe(c.total_sources);
  });

  it("every source has all required fields populated (id, base_url, rate_limit, notes)", () => {
    const c = engine.catalog();
    const malformedCount = c.sources.filter((s) => {
      return s.id.length === 0 || !s.base_url.startsWith("http") || s.rate_limit_rpm <= 0 || s.notes.length <= 10;
    }).length;
    expect(malformedCount).toBe(0);
  });
});

describe("OnlinePrintHarvestEngine.filterSources", () => {
  it("license=us_gov_work + cc0 returns only those (NTRS, NIST, FDA, etc.)", () => {
    const out = engine.filterSources({ license: ["us_gov_work", "cc0"] });
    expect(out.length).toBeGreaterThanOrEqual(3);
    const wrongCount = out.filter((s) => s.license !== "us_gov_work" && s.license !== "cc0").length;
    expect(wrongCount).toBe(0);
  });

  it("domain=medical_implant matches FDA 510(k) source", () => {
    const out = engine.filterSources({ domain: ["medical_implant"] });
    const hasFda = out.some((s) => s.id === "fda-510k-clearance");
    expect(hasFda).toBe(true);
  });

  it("no_auth_only=true excludes GrabCAD + GitHub (auth required)", () => {
    const out = engine.filterSources({ no_auth_only: true });
    const hasGrabCad = out.some((s) => s.id === "grabcad-cc0");
    const hasGithub = out.some((s) => s.id === "github-cad-public");
    expect(hasGrabCad).toBe(false);
    expect(hasGithub).toBe(false);
    expect(out.length).toBeGreaterThanOrEqual(5);
  });

  it("format=step matches GrabCAD + GitHub (CAD-bearing sources)", () => {
    const out = engine.filterSources({ format: ["step"] });
    expect(out.length).toBeGreaterThanOrEqual(2);
    const wrongCount = out.filter((s) => !s.formats.some((f) => f === "step")).length;
    expect(wrongCount).toBe(0);
  });

  it("empty filter returns full catalog", () => {
    const out = engine.filterSources({});
    expect(out.length).toBe(engine.catalog().total_sources);
  });
});

describe("OnlinePrintHarvestEngine.recommendForClass", () => {
  it("turbine_blade recommends NASA NTRS first (us_gov_work, most permissive)", () => {
    const out = engine.recommendForClass("turbine_blade");
    expect(out.length).toBeGreaterThanOrEqual(1);
    const firstLicense = out[0]?.license ?? "MISSING";
    const isPermissive = firstLicense === "us_gov_work" || firstLicense === "public_domain" || firstLicense === "cc0";
    expect(isPermissive).toBe(true);
  });

  it("medical_implant recommends FDA 510(k) (us_gov_work)", () => {
    const out = engine.recommendForClass("medical_implant");
    const hasFda = out.some((s) => s.id === "fda-510k-clearance");
    expect(hasFda).toBe(true);
  });

  it("results are sorted by license permissiveness (us_gov_work before cc_by)", () => {
    const out = engine.recommendForClass("blisk");
    if (out.length >= 2) {
      const rank: Record<string, number> = {
        public_domain: 0, us_gov_work: 1, cc0: 2, mit: 3, apache_2: 4,
        cc_by: 5, cc_by_sa: 6, cc_by_nc: 7, gpl: 8,
        fair_use_research_only: 9, redistribution_prohibited: 10,
      };
      let outOfOrder = 0;
      for (let i = 1; i < out.length; i++) {
        if ((rank[out[i - 1]!.license] ?? 99) > (rank[out[i]!.license] ?? 99)) outOfOrder++;
      }
      expect(outOfOrder).toBe(0);
    }
    expect(out.length).toBeGreaterThanOrEqual(1);
  });
});

describe("OnlinePrintHarvestEngine.canRedistribute", () => {
  it("public_domain + us_gov_work + cc0 only → returns true", () => {
    const ok = engine.canRedistribute({ license: ["us_gov_work"] });
    expect(ok).toBe(true);
  });

  it("includes any restrictive license (gpl, fair_use_research_only) → returns false", () => {
    const ok = engine.canRedistribute({ license: ["gpl", "us_gov_work"] });
    expect(ok).toBe(false);
  });

  it("empty filter (full catalog mixed licenses) → returns false", () => {
    expect(engine.canRedistribute({})).toBe(false);
  });
});

describe("OnlinePrintHarvestEngine.totalRateBudget", () => {
  it("returns slowest source's rpm as the bottleneck (us_gov_work filter)", () => {
    const b = engine.totalRateBudget({ license: ["us_gov_work"] });
    expect(b.rpm).toBeGreaterThan(0);
    expect(b.bottleneck_id.length > 0).toBe(true);
  });

  it("empty filter returns the slowest source overall (rpm in [1,30])", () => {
    const b = engine.totalRateBudget({});
    expect(b.rpm).toBeGreaterThan(0);
    expect(b.rpm).toBeLessThanOrEqual(30);
  });

  it("filter that yields zero sources returns rpm=0", () => {
    const b = engine.totalRateBudget({ license: ["redistribution_prohibited"] });
    expect(b.rpm).toBe(0);
  });
});
