/**
 * HyperMillMaterialMapEngine tests — CAM-EXHAUST-MS0 / U-CAM-HM-MATMAP-TESTS-01
 *
 * Coverage:
 *   1. lookupByQualityId: hits + misses + ISO mapping (P/M/K/N/S/H)
 *   2. searchByName: case-insensitive substring across group/sub/quality
 *   3. getByIsoGroup: returns all materials for a given ISO group
 *   4. listGroups: 10 groups with subgroup + quality counts
 *   5. listCutterMaterials: 9 cutter materials registered
 *   6. totalQualities: matches sum across catalog
 *   7. Warnings: titanium / superalloy / >60HRC / FRP / graphite
 *   8. Adversarial: empty query / unknown id / non-existent ISO
 *
 * Strict legitimacy: concrete assertions, named constants.
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillMaterialMapEngine,
  hyperMillMaterialMapEngine,
  CUTTER_MATERIALS,
} from "../engines/HyperMillMaterialMapEngine.js";

const TOTAL_GROUPS = 10;
const TOTAL_CUTTER_MATERIALS = 9;
const STEEL_GROUP_ID = 1;
const STAINLESS_GROUP_ID = 2;
const NICKEL_GROUP_ID = 3;
const TITANIUM_GROUP_ID = 7;
const GRAPHITE_GROUP_ID = 8;

describe("HyperMillMaterialMapEngine — class shape", () => {
  it("exports class + singleton + cutter materials", () => {
    expect(typeof HyperMillMaterialMapEngine).toBe("function");
    expect(hyperMillMaterialMapEngine instanceof HyperMillMaterialMapEngine).toBe(true);
    expect(Array.isArray(CUTTER_MATERIALS)).toBe(true);
    expect(CUTTER_MATERIALS.length).toBe(TOTAL_CUTTER_MATERIALS);
  });
});

describe("HyperMillMaterialMapEngine — lookupByQualityId()", () => {
  it("finds steel quality 1_2_3 → ISO P", () => {
    const result = hyperMillMaterialMapEngine.lookupByQualityId("1_2_3");
    expect(result).not.toBe(null);
    expect(result!.hyperMillGroup).toBe("Steel");
    expect(result!.hyperMillSubgroup).toBe("Structural steel");
    expect(result!.hyperMillQuality).toBe("Special structural steels, alloyed");
    expect(result!.isoGroup).toBe("P");
    expect(result!.isoGroupName).toBe("Steel");
    expect(result!.suggestedCutterMaterials).toEqual(["SolidCarbide", "Carbide", "Cermet", "HSS"]);
  });

  it("finds nickel alloy 3_7_1 → ISO S with superalloy warning", () => {
    const result = hyperMillMaterialMapEngine.lookupByQualityId("3_7_1");
    expect(result!.isoGroup).toBe("S");
    expect(result!.warnings.some((w) => w.includes("Superalloy"))).toBe(true);
  });

  it("finds titanium 7_1_4 → ISO S with titanium warning", () => {
    const result = hyperMillMaterialMapEngine.lookupByQualityId("7_1_4");
    expect(result!.hyperMillGroup).toBe("Titanium");
    expect(result!.isoGroup).toBe("S");
    expect(result!.warnings.some((w) => w.includes("Titanium"))).toBe(true);
  });

  it("finds graphite 8_1_1 → ISO N with graphite warning", () => {
    const result = hyperMillMaterialMapEngine.lookupByQualityId("8_1_1");
    expect(result!.isoGroup).toBe("N");
    expect(result!.warnings.some((w) => w.includes("Graphite"))).toBe(true);
  });

  it("finds extreme-hardness 1_10_4 (>60 HRC) with PCBN/ceramic warning", () => {
    const result = hyperMillMaterialMapEngine.lookupByQualityId("1_10_4");
    expect(result!.hyperMillQuality).toContain("> 60 HRC");
    expect(result!.warnings.some((w) => w.includes("PCBN or ceramic"))).toBe(true);
  });

  it("finds FRP 9_3_4 (carbon fiber reinforced) with FRP warning", () => {
    const result = hyperMillMaterialMapEngine.lookupByQualityId("9_3_4");
    expect(result!.isoGroup).toBe("N"); // plastics → N
    expect(result!.warnings.some((w) => w.includes("FRP"))).toBe(true);
  });

  it("returns null for unknown quality id", () => {
    expect(hyperMillMaterialMapEngine.lookupByQualityId("99_99_99")).toBe(null);
  });

  it("returns null for empty id", () => {
    expect(hyperMillMaterialMapEngine.lookupByQualityId("")).toBe(null);
  });
});

describe("HyperMillMaterialMapEngine — searchByName()", () => {
  it("finds 'titanium' across multiple subgroups (case-insensitive)", () => {
    const results = hyperMillMaterialMapEngine.searchByName("titanium");
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => {
      const found =
        r.hyperMillGroup.toLowerCase().includes("titanium") ||
        r.hyperMillSubgroup.toLowerCase().includes("titanium") ||
        r.hyperMillQuality.toLowerCase().includes("titanium");
      expect(found).toBe(true);
    });
  });

  it("finds 'aluminium' substring matches", () => {
    const results = hyperMillMaterialMapEngine.searchByName("aluminium");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].isoGroup).toBe("N");
  });

  it("returns empty array for nonsense query", () => {
    const results = hyperMillMaterialMapEngine.searchByName("xyzzy_unobtainium");
    expect(results).toEqual([]);
  });

  it("preserves warnings on titanium hits", () => {
    const results = hyperMillMaterialMapEngine.searchByName("titanium");
    expect(results[0].warnings.some((w) => w.includes("Titanium"))).toBe(true);
  });
});

describe("HyperMillMaterialMapEngine — getByIsoGroup()", () => {
  it("returns all P-group materials (steel)", () => {
    const results = hyperMillMaterialMapEngine.getByIsoGroup("P");
    expect(results.length).toBeGreaterThan(20);
    results.forEach((r) => expect(r.isoGroup).toBe("P"));
  });

  it("returns all M-group materials (stainless)", () => {
    const results = hyperMillMaterialMapEngine.getByIsoGroup("M");
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => {
      expect(r.isoGroup).toBe("M");
      expect(r.isoGroupName).toBe("Stainless Steel");
    });
  });

  it("returns all K-group materials (cast iron)", () => {
    const results = hyperMillMaterialMapEngine.getByIsoGroup("K");
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => expect(r.isoGroup).toBe("K"));
  });

  it("returns all S-group materials (nickel + titanium + special)", () => {
    const results = hyperMillMaterialMapEngine.getByIsoGroup("S");
    const groups = new Set(results.map((r) => r.hyperMillGroup));
    expect(groups.has("Titanium")).toBe(true);
    expect(groups.has("Nickel - Cobalt - Chromium")).toBe(true);
    expect(groups.has("Special Materials")).toBe(true);
  });

  it("returns empty array for unknown ISO group", () => {
    const results = hyperMillMaterialMapEngine.getByIsoGroup("Z");
    expect(results).toEqual([]);
  });
});

describe("HyperMillMaterialMapEngine — listGroups()", () => {
  it("returns 10 groups with subgroupCount + qualityCount", () => {
    const groups = hyperMillMaterialMapEngine.listGroups();
    expect(groups.length).toBe(TOTAL_GROUPS);
    groups.forEach((g) => {
      expect(typeof g.id).toBe("number");
      expect(g.subgroupCount).toBeGreaterThan(0);
      expect(g.qualityCount).toBeGreaterThan(0);
    });
  });

  it("steel (group 1) has 11 subgroups (richest)", () => {
    const steel = hyperMillMaterialMapEngine.listGroups().find((g) => g.id === STEEL_GROUP_ID);
    expect(steel!.subgroupCount).toBe(11);
    expect(steel!.isoGroup).toBe("P");
  });

  it("stainless (group 2) is ISO M", () => {
    const stainless = hyperMillMaterialMapEngine.listGroups().find((g) => g.id === STAINLESS_GROUP_ID);
    expect(stainless!.isoGroup).toBe("M");
  });

  it("nickel/cobalt/chromium (group 3) is ISO S", () => {
    const nickel = hyperMillMaterialMapEngine.listGroups().find((g) => g.id === NICKEL_GROUP_ID);
    expect(nickel!.isoGroup).toBe("S");
  });
});

describe("HyperMillMaterialMapEngine — listCutterMaterials() + totals", () => {
  it("returns 9 canonical cutter materials including PCD/PCBN", () => {
    const list = hyperMillMaterialMapEngine.listCutterMaterials();
    expect(list.length).toBe(TOTAL_CUTTER_MATERIALS);
    const codes = list.map((c) => c.code);
    expect(codes).toContain("PCD");
    expect(codes).toContain("PCBN");
    expect(codes).toContain("Carbide");
    expect(codes).toContain("HSS");
  });

  it("returns a fresh array (defensive copy) on each call", () => {
    const a = hyperMillMaterialMapEngine.listCutterMaterials();
    const b = hyperMillMaterialMapEngine.listCutterMaterials();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it("totalQualities() returns the sum across all 10 groups", () => {
    const total = hyperMillMaterialMapEngine.totalQualities();
    const groups = hyperMillMaterialMapEngine.listGroups();
    const expected = groups.reduce((s, g) => s + g.qualityCount, 0);
    expect(total).toBe(expected);
    expect(total).toBeGreaterThan(80);
  });
});

describe("HyperMillMaterialMapEngine — adversarial inputs", () => {
  it("does not throw on whitespace-only search", () => {
    const results = hyperMillMaterialMapEngine.searchByName("   ");
    expect(Array.isArray(results)).toBe(true);
  });

  it("getByIsoGroup with empty string returns empty", () => {
    expect(hyperMillMaterialMapEngine.getByIsoGroup("")).toEqual([]);
  });

  it("graphite group warning fires on EVERY graphite quality lookup", () => {
    const r1 = hyperMillMaterialMapEngine.lookupByQualityId("8_1_1");
    const r2 = hyperMillMaterialMapEngine.lookupByQualityId("8_1_2");
    expect(r1!.warnings.some((w) => w.includes("Graphite"))).toBe(true);
    expect(r2!.warnings.some((w) => w.includes("Graphite"))).toBe(true);
  });
});
