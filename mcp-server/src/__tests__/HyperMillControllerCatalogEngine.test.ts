/**
 * HyperMillControllerCatalogEngine tests — CAM-EXHAUST-MS0 / U-CAM-HM-CTRL-TESTS-01
 *
 * Coverage:
 *   1. listFamilies: 16 controller families with variant counts + dialects
 *   2. getFamily: id lookup + null on miss
 *   3. search: weighted scoring for name/manufacturer/description/capability
 *   4. byAxisCount: variants ≥ axes (1.0 exact match, 0.8 partial)
 *   5. byCapability: exact capability filter (5axis, additive, etc)
 *   6. getDialect: returns G-code dialect features for known dialects, null otherwise
 *   7. stats: families/totalVariants/dialects/byAxis aggregation
 *   8. Adversarial: empty query, unknown family id, unknown capability
 *
 * Strict legitimacy: concrete assertions, named constants.
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillControllerCatalogEngine,
  hyperMillControllerCatalogEngine,
} from "../engines/HyperMillControllerCatalogEngine.js";

const FAMILY_COUNT = 16;
const FANUC_VARIANT_COUNT = 7;
const HEIDENHAIN_VARIANT_COUNT = 17;
const FIVE_AXIS = 5;
const THREE_AXIS = 3;
const FULL_CONFIDENCE = 1.0;
const EXACT_MATCH_CONFIDENCE = 1.0;
const PARTIAL_MATCH_CONFIDENCE = 0.8;
const CAPABILITY_CONFIDENCE = 0.9;

describe("HyperMillControllerCatalogEngine — class shape", () => {
  it("exports class + singleton", () => {
    expect(typeof HyperMillControllerCatalogEngine).toBe("function");
    expect(hyperMillControllerCatalogEngine instanceof HyperMillControllerCatalogEngine).toBe(true);
  });
});

describe("HyperMillControllerCatalogEngine — listFamilies()", () => {
  it("returns 16 families", () => {
    const list = hyperMillControllerCatalogEngine.listFamilies();
    expect(list.length).toBe(FAMILY_COUNT);
  });

  it("Fanuc family has 7 variants and dialect 'fanuc'", () => {
    const list = hyperMillControllerCatalogEngine.listFamilies();
    const fanuc = list.find((f) => f.id === "fanuc");
    expect(fanuc!.variantCount).toBe(FANUC_VARIANT_COUNT);
    expect(fanuc!.dialect).toBe("fanuc");
    expect(fanuc!.manufacturer).toBe("FANUC Corporation");
  });

  it("Heidenhain family has 17 variants (machine-OEM permutations)", () => {
    const list = hyperMillControllerCatalogEngine.listFamilies();
    const hh = list.find((f) => f.id === "heidenhain");
    expect(hh!.variantCount).toBe(HEIDENHAIN_VARIANT_COUNT);
    expect(hh!.dialect).toBe("heidenhain");
  });

  it("includes Haas and Okuma families", () => {
    const list = hyperMillControllerCatalogEngine.listFamilies();
    expect(list.some((f) => f.id === "haas")).toBe(true);
    expect(list.some((f) => f.id === "okuma")).toBe(true);
  });
});

describe("HyperMillControllerCatalogEngine — getFamily()", () => {
  it("returns Siemens SINUMERIK family with cycleSupport including turning", () => {
    const fam = hyperMillControllerCatalogEngine.getFamily("siemens");
    expect(fam!.name).toBe("Siemens SINUMERIK");
    expect(fam!.cycleSupport).toContain("turning");
    expect(fam!.cycleSupport).toContain("drilling");
  });

  it("returns null on unknown family id", () => {
    expect(hyperMillControllerCatalogEngine.getFamily("nonexistent")).toBe(null);
  });

  it("variants array is non-empty for every catalog entry", () => {
    const list = hyperMillControllerCatalogEngine.listFamilies();
    list.forEach((entry) => {
      const fam = hyperMillControllerCatalogEngine.getFamily(entry.id);
      expect(fam!.variants.length).toBeGreaterThan(0);
    });
  });
});

describe("HyperMillControllerCatalogEngine — search()", () => {
  it("finds Fanuc by name (sorted by confidence desc)", () => {
    const results = hyperMillControllerCatalogEngine.search("fanuc");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].family.id).toBe("fanuc");
    expect(results[0].confidence).toBeGreaterThan(0);
  });

  it("finds Heidenhain by manufacturer substring", () => {
    const results = hyperMillControllerCatalogEngine.search("heidenhain");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].family.id).toBe("heidenhain");
  });

  it("finds machines by capability substring (5axis)", () => {
    const results = hyperMillControllerCatalogEngine.search("5axis");
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => {
      const hasMatch =
        r.family.name.toLowerCase().includes("5axis") ||
        r.family.manufacturer.toLowerCase().includes("5axis") ||
        r.variant.description.toLowerCase().includes("5axis") ||
        r.variant.capabilities.some((c) => c.includes("5axis"));
      expect(hasMatch).toBe(true);
    });
  });

  it("returns empty array on nonsense query", () => {
    const results = hyperMillControllerCatalogEngine.search("xyzzy999");
    expect(results).toEqual([]);
  });

  it("results sorted by confidence descending", () => {
    const results = hyperMillControllerCatalogEngine.search("interactive");
    for (let i = 1; i < results.length; i++) {
      expect(results[i].confidence).toBeLessThanOrEqual(results[i - 1].confidence);
    }
  });

  it("confidence bounded to 1.0 max", () => {
    const results = hyperMillControllerCatalogEngine.search("fanuc");
    results.forEach((r) => expect(r.confidence).toBeLessThanOrEqual(FULL_CONFIDENCE));
  });
});

describe("HyperMillControllerCatalogEngine — byAxisCount()", () => {
  it("returns ≥5 axis variants when axes=5 (exact match → confidence 1.0)", () => {
    const results = hyperMillControllerCatalogEngine.byAxisCount(FIVE_AXIS);
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => {
      expect(r.variant.axisCount).toBeGreaterThanOrEqual(FIVE_AXIS);
      if (r.variant.axisCount === FIVE_AXIS) {
        expect(r.confidence).toBe(EXACT_MATCH_CONFIDENCE);
      } else {
        expect(r.confidence).toBe(PARTIAL_MATCH_CONFIDENCE);
      }
    });
  });

  it("returns ≥3 axis variants when axes=3 (includes 5-axis with 0.8 confidence)", () => {
    const results = hyperMillControllerCatalogEngine.byAxisCount(THREE_AXIS);
    expect(results.length).toBeGreaterThan(0);
    const exact = results.filter((r) => r.variant.axisCount === THREE_AXIS);
    const above = results.filter((r) => r.variant.axisCount > THREE_AXIS);
    expect(exact.length).toBeGreaterThan(0);
    expect(above.length).toBeGreaterThan(0);
    above.forEach((r) => expect(r.confidence).toBe(PARTIAL_MATCH_CONFIDENCE));
  });

  it("returns empty when axes exceeds catalog max", () => {
    const results = hyperMillControllerCatalogEngine.byAxisCount(99);
    expect(results).toEqual([]);
  });
});

describe("HyperMillControllerCatalogEngine — byCapability()", () => {
  it("returns variants with 'additive' capability (Fanuc, Siemens, Mazak, Okuma)", () => {
    const results = hyperMillControllerCatalogEngine.byCapability("additive");
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => {
      expect(r.variant.capabilities).toContain("additive");
      expect(r.confidence).toBe(CAPABILITY_CONFIDENCE);
    });
  });

  it("returns variants with 'micromachining' (Roeders, Heidenhain Kern)", () => {
    const results = hyperMillControllerCatalogEngine.byCapability("micromachining");
    expect(results.length).toBeGreaterThan(0);
    const ids = new Set(results.map((r) => r.family.id));
    expect(ids.has("roeders")).toBe(true);
    expect(ids.has("heidenhain")).toBe(true);
  });

  it("returns empty for nonexistent capability", () => {
    expect(hyperMillControllerCatalogEngine.byCapability("nonexistent_cap")).toEqual([]);
  });
});

describe("HyperMillControllerCatalogEngine — getDialect()", () => {
  it("returns Fanuc G-code dialect features", () => {
    const dialect = hyperMillControllerCatalogEngine.getDialect("fanuc");
    expect(dialect!.programStart).toBe("%");
    expect(dialect!.programEnd).toBe("M30");
    expect(dialect!.absoluteMode).toBe("G90");
    expect(dialect!.toolChange).toBe("T{n} M06");
  });

  it("returns Heidenhain dialect features (BEGIN/END PGM)", () => {
    const dialect = hyperMillControllerCatalogEngine.getDialect("heidenhain");
    expect(dialect!.programStart).toBe("BEGIN PGM");
    expect(dialect!.programEnd).toBe("END PGM");
  });

  it("returns Okuma dialect features (O{n} program header)", () => {
    const dialect = hyperMillControllerCatalogEngine.getDialect("okuma");
    expect(dialect!.programStart).toBe("O{n}");
    expect(dialect!.programEnd).toBe("M02");
  });

  it("returns null for unknown family id", () => {
    expect(hyperMillControllerCatalogEngine.getDialect("nonexistent")).toBe(null);
  });

  it("Haas family uses fanuc dialect (manufacturer-specific routing)", () => {
    const dialect = hyperMillControllerCatalogEngine.getDialect("haas");
    expect(dialect!.programStart).toBe("%");
    expect(dialect!.programEnd).toBe("M30");
  });

  it("returns null when family has no dialect features registered", () => {
    // Fagor exists in CONTROLLER_FAMILIES but DIALECT_FEATURES.fagor is undefined
    expect(hyperMillControllerCatalogEngine.getDialect("fagor")).toBe(null);
  });
});

describe("HyperMillControllerCatalogEngine — stats()", () => {
  it("families = 16, totalVariants > 50, dialects > 5", () => {
    const stats = hyperMillControllerCatalogEngine.stats();
    expect(stats.families).toBe(FAMILY_COUNT);
    expect(stats.totalVariants).toBeGreaterThan(50);
    expect(stats.dialects).toBeGreaterThanOrEqual(5);
  });

  it("byAxis aggregates 3, 4, 5, 2 axis counts", () => {
    const stats = hyperMillControllerCatalogEngine.stats();
    expect(typeof stats.byAxis[5]).toBe("number");
    expect(typeof stats.byAxis[3]).toBe("number");
    expect(stats.byAxis[5]).toBeGreaterThan(0);
    expect(stats.byAxis[3]).toBeGreaterThan(0);
  });

  it("totalVariants matches sum of family.variants.length", () => {
    const stats = hyperMillControllerCatalogEngine.stats();
    const list = hyperMillControllerCatalogEngine.listFamilies();
    const sum = list.reduce((s, f) => s + f.variantCount, 0);
    expect(stats.totalVariants).toBe(sum);
  });
});

describe("HyperMillControllerCatalogEngine — adversarial inputs", () => {
  it("search('') returns whatever empty-substring matches (Array)", () => {
    const results = hyperMillControllerCatalogEngine.search("");
    expect(Array.isArray(results)).toBe(true);
  });

  it("getDialect on empty string returns null", () => {
    expect(hyperMillControllerCatalogEngine.getDialect("")).toBe(null);
  });

  it("byAxisCount(0) returns all variants (≥0 condition)", () => {
    const results = hyperMillControllerCatalogEngine.byAxisCount(0);
    const stats = hyperMillControllerCatalogEngine.stats();
    expect(results.length).toBe(stats.totalVariants);
  });
});
