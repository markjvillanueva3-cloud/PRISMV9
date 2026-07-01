/**
 * MonolithMajorManufacturersCatalogManifestEngine round-trip tests.
 * JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-MAJOR-MFRS-MANIFEST.
 */

import { describe, it, expect } from "vitest";
import {
  MonolithMajorManufacturersCatalogManifestEngine,
  monolithMajorManufacturersCatalogManifestEngine,
} from "../engines/MonolithMajorManufacturersCatalogManifestEngine.js";

const engine = monolithMajorManufacturersCatalogManifestEngine;

describe("MonolithMajorManufacturersCatalogManifestEngine — metadata", () => {
  it("version is '1.0.0' and lastUpdated is '2026-01-06'", () => {
    expect(engine.version).toBe("1.0.0");
    expect(engine.lastUpdated).toBe("2026-01-06");
  });
});

describe("MonolithMajorManufacturersCatalogManifestEngine — manufacturer records (pinned)", () => {
  it("ships exactly 7 major manufacturers", () => {
    expect(engine.listManufacturers()).toHaveLength(7);
  });

  it("Sandvik Coromant: Sweden 1942 Ultra-Premium priceLevel 5 Global Leader", () => {
    expect(engine.getManufacturer("sandvik")).toEqual({
      id: "sandvik",
      name: "Sandvik Coromant",
      country: "Sweden",
      founded: 1942,
      quality: "Ultra-Premium",
      priceLevel: 5,
      marketPosition: "Global Leader",
      website: "sandvik.coromant.com",
      specialty: "Complete machining solutions",
    });
  });

  it("Kennametal: USA 1938 Premium Top 3 Global", () => {
    expect(engine.getManufacturer("kennametal")).toEqual({
      id: "kennametal",
      name: "Kennametal",
      country: "USA",
      founded: 1938,
      quality: "Premium",
      priceLevel: 4,
      marketPosition: "Top 3 Global",
      website: "kennametal.com",
      specialty: "Metalworking solutions and wear-resistant materials",
    });
  });

  it("ISCAR: Israel 1952 (newest of the 7)", () => {
    const m = engine.getManufacturer("iscar");
    expect(m?.country).toBe("Israel");
    expect(m?.founded).toBe(1952);
    expect(m?.marketPosition).toBe("Top 5 Global");
  });

  it("Seco Tools: Sweden 1932 (2nd-oldest of the 7 Premium tier)", () => {
    const m = engine.getManufacturer("seco");
    expect(m?.country).toBe("Sweden");
    expect(m?.founded).toBe(1932);
  });

  it("Mitsubishi Materials: Japan 1871 (oldest of the 7)", () => {
    const m = engine.getManufacturer("mitsubishi");
    expect(m?.country).toBe("Japan");
    expect(m?.founded).toBe(1871);
    expect(m?.specialty).toBe("Carbide tools and materials technology");
  });

  it("Walter: Germany 1919 Top 10 Global", () => {
    const m = engine.getManufacturer("walter");
    expect(m?.country).toBe("Germany");
    expect(m?.founded).toBe(1919);
  });

  it("Tungaloy: Japan 1929 + parent='IMC Group' (only mfr with parent field)", () => {
    expect(engine.getManufacturer("tungaloy")).toEqual({
      id: "tungaloy",
      name: "Tungaloy",
      country: "Japan",
      founded: 1929,
      quality: "Premium",
      priceLevel: 4,
      marketPosition: "Top 10 Global",
      website: "tungaloy.com",
      specialty: "Cemented carbide and cutting tools",
      parent: "IMC Group",
    });
  });

  it("Only Sandvik is Ultra-Premium quality (1 of 7)", () => {
    const ultra = engine.listByQuality("Ultra-Premium");
    expect(ultra).toHaveLength(1);
    expect(ultra[0].id).toBe("sandvik");
  });

  it("6 of 7 are Premium quality", () => {
    expect(engine.listByQuality("Premium")).toHaveLength(6);
  });

  it("Only Sandvik has priceLevel 5 (Ultra-Premium); 6 of 7 are priceLevel 4", () => {
    const all = engine.listManufacturers();
    const p5 = all.filter((m) => m.priceLevel === 5);
    const p4 = all.filter((m) => m.priceLevel === 4);
    expect(p5).toHaveLength(1);
    expect(p4).toHaveLength(6);
    expect(p5[0].id).toBe("sandvik");
  });
});

describe("MonolithMajorManufacturersCatalogManifestEngine — filters", () => {
  it("listByCountry('Sweden') returns 2 (Sandvik + Seco)", () => {
    const swedish = engine.listByCountry("Sweden");
    expect(swedish).toHaveLength(2);
    expect(swedish.map((m) => m.id).sort()).toEqual(["sandvik", "seco"]);
  });

  it("listByCountry('Japan') returns 2 (Mitsubishi + Tungaloy)", () => {
    const japanese = engine.listByCountry("Japan");
    expect(japanese).toHaveLength(2);
    expect(japanese.map((m) => m.id).sort()).toEqual(["mitsubishi", "tungaloy"]);
  });

  it("listByCountry case-insensitive ('sweden' = 'Sweden')", () => {
    expect(engine.listByCountry("sweden")).toHaveLength(2);
  });

  it("listByCountry('USA') returns 1 (Kennametal)", () => {
    expect(engine.listByCountry("USA").map((m) => m.id)).toEqual(["kennametal"]);
  });

  it("listByCountry('Germany') returns 1 (Walter)", () => {
    expect(engine.listByCountry("Germany").map((m) => m.id)).toEqual(["walter"]);
  });

  it("listByCountry('Israel') returns 1 (ISCAR)", () => {
    expect(engine.listByCountry("Israel").map((m) => m.id)).toEqual(["iscar"]);
  });

  it("listByCountry unknown returns []", () => {
    expect(engine.listByCountry("Atlantis")).toEqual([]);
    expect(engine.listByCountry("")).toEqual([]);
    expect(engine.listByCountry("   ")).toEqual([]);
  });
});

describe("MonolithMajorManufacturersCatalogManifestEngine — founding year analysis", () => {
  it("foundedBetween(1900, 1950) returns 5 (Walter/Tungaloy/Seco/Kennametal/Sandvik)", () => {
    const mfrs = engine.listFoundedBetween(1900, 1950);
    expect(mfrs).toHaveLength(5);
  });

  it("foundedBetween(1870, 1900) returns 1 (only Mitsubishi at 1871)", () => {
    const mfrs = engine.listFoundedBetween(1870, 1900);
    expect(mfrs).toHaveLength(1);
    expect(mfrs[0].id).toBe("mitsubishi");
  });

  it("foundedBetween inverted range returns []", () => {
    expect(engine.listFoundedBetween(2000, 1900)).toEqual([]);
  });

  it("foundedBetween NaN/Infinity returns []", () => {
    expect(engine.listFoundedBetween(NaN, 2000)).toEqual([]);
    expect(engine.listFoundedBetween(1900, Infinity)).toEqual([]);
  });

  it("listByFoundedAscending: Mitsubishi (1871) first, ISCAR (1952) last", () => {
    const sorted = engine.listByFoundedAscending();
    expect(sorted[0].id).toBe("mitsubishi");
    expect(sorted[sorted.length - 1].id).toBe("iscar");
  });

  it("listByFoundedAscending is strictly ascending by year", () => {
    const sorted = engine.listByFoundedAscending();
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i].founded).toBeLessThanOrEqual(sorted[i + 1].founded);
    }
  });
});

describe("MonolithMajorManufacturersCatalogManifestEngine — catalog sections", () => {
  it("ships exactly 4 catalog sections per manufacturer (milling/turning/drilling/grades)", () => {
    expect(engine.listCatalogSections()).toEqual(["milling", "turning", "drilling", "grades"]);
  });
});

describe("MonolithMajorManufacturersCatalogManifestEngine — fail-soft (R12)", () => {
  it("getManufacturer unknown id returns null", () => {
    expect(engine.getManufacturer("UNKNOWN")).toBe(null);
  });

  it("getManufacturer empty/whitespace returns null", () => {
    expect(engine.getManufacturer("")).toBe(null);
    expect(engine.getManufacturer("   ")).toBe(null);
  });

  it("getManufacturer is case-insensitive ('SANDVIK' = 'sandvik')", () => {
    expect(engine.getManufacturer("SANDVIK")?.id).toBe("sandvik");
    expect(engine.getManufacturer("Sandvik")?.id).toBe("sandvik");
  });
});

describe("MonolithMajorManufacturersCatalogManifestEngine — stats + immutability", () => {
  it("stats reports correct aggregations", () => {
    const s = engine.stats();
    expect(s.manufacturerCount).toBe(7);
    expect(s.catalogSectionCount).toBe(4);
    expect(s.byCountry.Sweden).toBe(2);
    expect(s.byCountry.Japan).toBe(2);
    expect(s.byQuality["Ultra-Premium"]).toBe(1);
    expect(s.byQuality["Premium"]).toBe(6);
    expect(s.foundedRange.earliest).toBe(1871);
    expect(s.foundedRange.latest).toBe(1952);
  });

  it("fresh instance returns identical data", () => {
    const fresh = new MonolithMajorManufacturersCatalogManifestEngine();
    expect(fresh.stats()).toEqual(engine.stats());
  });

  it("listManufacturers immutability: mutating returned array doesn't affect store", () => {
    const a = engine.listManufacturers();
    a.pop();
    expect(engine.listManufacturers()).toHaveLength(7);
  });

  it("getManufacturer immutability: mutating returned record doesn't affect store", () => {
    const m = engine.getManufacturer("sandvik");
    if (m) m.founded = 9999;
    expect(engine.getManufacturer("sandvik")?.founded).toBe(1942);
  });
});
