/**
 * MonolithZeniCatalogManifestEngine round-trip tests.
 * JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-ZENI-CATALOG-MANIFEST.
 */

import { describe, it, expect } from "vitest";
import {
  MonolithZeniCatalogManifestEngine,
  monolithZeniCatalogManifestEngine,
} from "../engines/MonolithZeniCatalogManifestEngine.js";

const engine = monolithZeniCatalogManifestEngine;

describe("MonolithZeniCatalogManifestEngine — metadata", () => {
  it("version is '3.0.0'", () => {
    expect(engine.version).toBe("3.0.0");
  });

  it("lastUpdated is '2026-01-06'", () => {
    expect(engine.lastUpdated).toBe("2026-01-06");
  });
});

describe("MonolithZeniCatalogManifestEngine — manufacturer record", () => {
  it("getManufacturer preserves all 7 monolith fields verbatim", () => {
    expect(engine.getManufacturer()).toEqual({
      name: "Zeni Tools",
      country: "USA",
      quality: "Professional",
      specialty: "Value High-Performance",
      priceLevel: 2,
      website: "zenitools.com",
      description: "American-designed, high-quality cutting tools at competitive prices",
    });
  });
});

describe("MonolithZeniCatalogManifestEngine — grade families", () => {
  it("ships exactly 5 grades (ZC25/ZC15/ZC35/ZM20/ZK20)", () => {
    const g = engine.listGrades();
    expect(g).toHaveLength(5);
    expect(g.map((x) => x.name).sort()).toEqual(["ZC15", "ZC25", "ZC35", "ZK20", "ZM20"]);
  });

  it("ZC25 = P25 / CVD / steel_general / gold (monolith-pinned)", () => {
    expect(engine.getGrade("ZC25")).toEqual({
      name: "ZC25", iso: "P25", coating: "CVD",
      application: "steel_general", color: "gold",
    });
  });

  it("ZM20 = M20 / PVD / stainless / purple", () => {
    expect(engine.getGrade("ZM20")).toEqual({
      name: "ZM20", iso: "M20", coating: "PVD",
      application: "stainless", color: "purple",
    });
  });

  it("ZK20 = K20 / CVD / cast_iron / black", () => {
    expect(engine.getGrade("ZK20")).toEqual({
      name: "ZK20", iso: "K20", coating: "CVD",
      application: "cast_iron", color: "black",
    });
  });

  it("getGradesByISO('P') returns 3 P-class grades (ZC25/ZC15/ZC35)", () => {
    const p = engine.getGradesByISO("P");
    expect(p).toHaveLength(3);
    expect(p.map((g) => g.name).sort()).toEqual(["ZC15", "ZC25", "ZC35"]);
  });

  it("getGradesByISO('M') returns 1 M-class grade (ZM20)", () => {
    const m = engine.getGradesByISO("M");
    expect(m).toHaveLength(1);
    expect(m[0].name).toBe("ZM20");
  });

  it("getGradesByISO is case-insensitive", () => {
    expect(engine.getGradesByISO("k")).toHaveLength(1);
    expect(engine.getGradesByISO("K")[0].name).toBe("ZK20");
  });

  it("PVD coatings are exclusive to stainless application (ZM20 only)", () => {
    const pvd = engine.listGrades().filter((g) => g.coating === "PVD");
    expect(pvd).toHaveLength(1);
    expect(pvd[0].application).toBe("stainless");
  });

  it("All non-PVD grades use CVD coating (4 of 5)", () => {
    const cvd = engine.listGrades().filter((g) => g.coating === "CVD");
    expect(cvd).toHaveLength(4);
  });
});

describe("MonolithZeniCatalogManifestEngine — CNMG insert sizes", () => {
  it("ships 13 canonical CNMG sizes (Zeni's flagship turning insert series)", () => {
    const sizes = engine.listCNMGSizes();
    expect(sizes).toHaveLength(13);
  });

  it("sizes follow ISO CNMG nomenclature (CNMG + 6-digit code)", () => {
    const sizes = engine.listCNMGSizes();
    for (const s of sizes) {
      expect(s).toMatch(/^CNMG\d{6}$/);
    }
  });

  it("size groups: 9xx (3 sizes) + 12xx (4) + 16xx (3) + 19xx (3) = 13 total", () => {
    const sizes = engine.listCNMGSizes();
    const size09 = sizes.filter((s) => s.startsWith("CNMG09"));
    const size12 = sizes.filter((s) => s.startsWith("CNMG12"));
    const size16 = sizes.filter((s) => s.startsWith("CNMG16"));
    const size19 = sizes.filter((s) => s.startsWith("CNMG19"));
    expect(size09).toHaveLength(3);
    expect(size12).toHaveLength(4);
    expect(size16).toHaveLength(3);
    expect(size19).toHaveLength(3);
  });

  it("includes specific sentinel sizes from monolith source", () => {
    const sizes = engine.listCNMGSizes();
    expect(sizes).toContain("CNMG090304");
    expect(sizes).toContain("CNMG120408");
    expect(sizes).toContain("CNMG190624");
  });
});

describe("MonolithZeniCatalogManifestEngine — cutting envelopes (per ISO class)", () => {
  it("ships 3 envelope keys (steel_p / stainless_m / cast_iron_k)", () => {
    const keys = engine.listCuttingEnvelopeKeys();
    expect(keys).toEqual(["cast_iron_k", "stainless_m", "steel_p"]);
  });

  it("steel_p: vc 150-350 m/min, fn 0.15-0.5 mm/rev, ap 0.5-5.0 mm (P-class cutting data)", () => {
    expect(engine.getCuttingEnvelope("steel_p")).toEqual({
      vc: { min: 150, max: 350 },
      fn: { min: 0.15, max: 0.5 },
      ap: { min: 0.5, max: 5.0 },
    });
  });

  it("stainless_m: vc 100-250, fn 0.1-0.4, ap 0.5-4.0 (M-class — reduced vs P)", () => {
    expect(engine.getCuttingEnvelope("stainless_m")).toEqual({
      vc: { min: 100, max: 250 },
      fn: { min: 0.1, max: 0.4 },
      ap: { min: 0.5, max: 4.0 },
    });
  });

  it("cast_iron_k: vc 150-400, fn 0.15-0.6, ap 0.5-6.0 (K-class — widest envelope)", () => {
    expect(engine.getCuttingEnvelope("cast_iron_k")).toEqual({
      vc: { min: 150, max: 400 },
      fn: { min: 0.15, max: 0.6 },
      ap: { min: 0.5, max: 6.0 },
    });
  });

  it("K-class vc max (400) is the highest across all ISO classes (CI machines fastest)", () => {
    const p = engine.getCuttingEnvelope("steel_p");
    const m = engine.getCuttingEnvelope("stainless_m");
    const k = engine.getCuttingEnvelope("cast_iron_k");
    expect(k?.vc.max).toBeGreaterThan(p?.vc.max ?? 0);
    expect(k?.vc.max).toBeGreaterThan(m?.vc.max ?? 0);
  });

  it("M-class envelope is the most restrictive (stainless requires lowest vc)", () => {
    const m = engine.getCuttingEnvelope("stainless_m");
    const p = engine.getCuttingEnvelope("steel_p");
    expect(m?.vc.max).toBeLessThan(p?.vc.max ?? Infinity);
  });
});

describe("MonolithZeniCatalogManifestEngine — known sections (ingest punch list)", () => {
  it("lists 10 known section paths in the full 993-line source", () => {
    expect(engine.listKnownSections()).toHaveLength(10);
  });

  it("includes all 5 turning subsections", () => {
    const s = engine.listKnownSections();
    expect(s).toContain("turning.inserts");
    expect(s).toContain("turning.externalHolders");
    expect(s).toContain("turning.boringBars");
    expect(s).toContain("turning.grooving");
    expect(s).toContain("turning.threading");
  });

  it("includes the 5 milling/drilling top-level sections", () => {
    const s = engine.listKnownSections();
    expect(s).toContain("solidCarbide");
    expect(s).toContain("faceMills");
    expect(s).toContain("shoulderMills");
    expect(s).toContain("slotMills");
    expect(s).toContain("indexableDrills");
  });
});

describe("MonolithZeniCatalogManifestEngine — fail-soft (R12)", () => {
  it("getGrade unknown name returns null", () => {
    expect(engine.getGrade("UNKNOWN_GRADE")).toBe(null);
  });

  it("getGrade empty/whitespace returns null", () => {
    expect(engine.getGrade("")).toBe(null);
    expect(engine.getGrade("   ")).toBe(null);
  });

  it("getGradesByISO unknown class returns []", () => {
    expect(engine.getGradesByISO("Z")).toEqual([]);
  });

  it("getGradesByISO empty returns []", () => {
    expect(engine.getGradesByISO("")).toEqual([]);
    expect(engine.getGradesByISO("   ")).toEqual([]);
  });

  it("getCuttingEnvelope unknown material class returns null", () => {
    expect(engine.getCuttingEnvelope("titanium_s")).toBe(null);
  });

  it("getCuttingEnvelope empty returns null", () => {
    expect(engine.getCuttingEnvelope("")).toBe(null);
    expect(engine.getCuttingEnvelope("   ")).toBe(null);
  });
});

describe("MonolithZeniCatalogManifestEngine — stats + immutability", () => {
  it("stats reports 5 grades + 13 CNMG sizes + 3 envelopes + 10 sections + priceLevel 2", () => {
    expect(engine.stats()).toEqual({
      version: "3.0.0",
      lastUpdated: "2026-01-06",
      gradeCount: 5,
      cnmgSizeCount: 13,
      cuttingEnvelopeCount: 3,
      knownSectionCount: 10,
      priceLevel: 2,
    });
  });

  it("getManufacturer immutability: mutating returned record doesn't affect store", () => {
    const m = engine.getManufacturer();
    m.priceLevel = 999;
    expect(engine.getManufacturer().priceLevel).toBe(2);
  });

  it("getCuttingEnvelope immutability: mutating returned envelope doesn't affect store", () => {
    const e = engine.getCuttingEnvelope("steel_p");
    if (e) e.vc.max = 999;
    expect(engine.getCuttingEnvelope("steel_p")?.vc.max).toBe(350);
  });

  it("listGrades immutability: mutating returned array doesn't affect store", () => {
    const a = engine.listGrades();
    a.pop();
    expect(engine.listGrades()).toHaveLength(5);
  });

  it("fresh instance returns identical data", () => {
    const fresh = new MonolithZeniCatalogManifestEngine();
    expect(fresh.stats()).toEqual(engine.stats());
  });
});
