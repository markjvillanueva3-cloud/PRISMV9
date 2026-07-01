/**
 * ToolLibraryPartition -- CATALOG-APP-WIRING-MS0/U-TOOLDB-MAT-TYPE-BRAND (slot:romeo).
 *
 * Verifies the pure material->type->brand partition helpers that organize the JM
 * tooling libraries. Real reference values: a broken slug corrupts the on-disk
 * directory tree; a dropped blank-vendor row LOSES a tool; a slug COLLISION that
 * silently merges two distinct types/brands corrupts the data -- all must fail here.
 */
import { describe, it, expect } from "vitest";
import {
  slugify,
  toolTypeSlug,
  brandSlug,
  isoSegment,
  nestByMaterialTypeBrand,
  flattenTree,
  injectiveSlugs,
} from "../../scripts/lib/tool-library-partition.js";

describe("slugify", () => {
  it("lowercases + hyphenates real tool-type / vendor strings", () => {
    expect(slugify("Flat End Mill")).toBe("flat-end-mill");
    expect(slugify("130 DEG. INSERT DRILL")).toBe("130-deg-insert-drill");
    expect(slugify("REGO-FIX / Capto C6")).toBe("rego-fix-capto-c6");
  });
  it("collapses runs and trims leading/trailing separators", () => {
    expect(slugify("  BIG  DAISHOWA__ER-32  ")).toBe("big-daishowa-er-32");
    expect(slugify("---Ball---")).toBe("ball");
  });
  it("returns empty string for blank/nullish (the leaf fns add the fallback)", () => {
    expect(slugify("")).toBe("");
    expect(slugify("   ")).toBe("");
    expect(slugify(null as unknown as string)).toBe("");
    expect(slugify(undefined as unknown as string)).toBe("");
  });
  it("slugs a non-latin / emoji vendor to empty (no crash, no path-escape chars)", () => {
    expect(slugify("日本ツール")).toBe("");
    expect(slugify("Acme® Tools")).toBe("acme-tools");
  });
});

describe("toolTypeSlug / brandSlug fallbacks", () => {
  it("toolTypeSlug falls back to unknown-type, never empty (no empty dir name)", () => {
    expect(toolTypeSlug("ball end mill")).toBe("ball-end-mill");
    expect(toolTypeSlug("")).toBe("unknown-type");
    expect(toolTypeSlug("   ")).toBe("unknown-type");
  });
  it("brandSlug files a blank vendor under 'unspecified' (tool is never dropped)", () => {
    expect(brandSlug("HAIMER")).toBe("haimer");
    expect(brandSlug("")).toBe("unspecified");
    expect(brandSlug("   ")).toBe("unspecified");
    expect(brandSlug(null as unknown as string)).toBe("unspecified");
  });
});

describe("isoSegment", () => {
  it("upper-cases a real ISO group + falls back to X when blank", () => {
    expect(isoSegment("p")).toBe("P");
    expect(isoSegment("")).toBe("X");
    expect(isoSegment(null as unknown as string)).toBe("X");
  });
  it("strips path-traversal characters (cannot escape the output dir)", () => {
    // a dirty iso must NOT become a "../.." directory segment
    expect(isoSegment("../../etc")).toBe("ETC");
    expect(isoSegment("a/b")).toBe("AB");
    expect(isoSegment("...")).toBe("X");
  });
});

describe("nestByMaterialTypeBrand (keyed by RAW values, no silent merge)", () => {
  it("files every row in exactly one material->rawType->rawBrand leaf, ISO upper-cased", () => {
    const tree = nestByMaterialTypeBrand([
      { iso: "p", toolType: "Flat End Mill", vendor: "HAIMER", row: "r1" },
      { iso: "P", toolType: "Flat End Mill", vendor: "HAIMER", row: "r2" },
      { iso: "P", toolType: "Drill", vendor: "GUHRING", row: "r3" },
      { iso: "N", toolType: "Flat End Mill", vendor: "", row: "r4" },
    ]);
    expect(tree["P"]["Flat End Mill"]["HAIMER"]).toEqual(["r1", "r2"]);
    expect(tree["P"]["Drill"]["GUHRING"]).toEqual(["r3"]);
    // blank vendor -> "(unspecified)" raw key, distinct material group N
    expect(tree["N"]["Flat End Mill"]["(unspecified)"]).toEqual(["r4"]);
    // no row lost or duplicated
    const total = Object.values(tree).flatMap((ts) =>
      Object.values(ts).flatMap((bs) => Object.values(bs).flatMap((rows) => rows)),
    );
    expect(total.sort()).toEqual(["r1", "r2", "r3", "r4"]);
  });
  it("keeps two DISTINCT vendors that slug the same as SEPARATE leaves (no merge)", () => {
    // "YG-1" and "YG 1" both slug to "yg-1" -- they must remain distinct raw keys.
    const tree = nestByMaterialTypeBrand([
      { iso: "P", toolType: "Drill", vendor: "YG-1", row: "a" },
      { iso: "P", toolType: "Drill", vendor: "YG 1", row: "b" },
    ]);
    expect(tree["P"]["Drill"]["YG-1"]).toEqual(["a"]);
    expect(tree["P"]["Drill"]["YG 1"]).toEqual(["b"]);
    expect(Object.keys(tree["P"]["Drill"]).sort()).toEqual(["YG 1", "YG-1"]);
  });
  it("dirty ISO is sanitized (no traversal) rather than dropped", () => {
    const tree = nestByMaterialTypeBrand([{ iso: "../x", toolType: "Tap", vendor: "OSG", row: "rx" }]);
    expect(tree["X"]["Tap"]["OSG"]).toEqual(["rx"]);
  });
});

describe("flattenTree (injective per-parent slugs)", () => {
  it("emits leaves in stable (iso, type, brand) sorted order, rows preserved", () => {
    const tree = nestByMaterialTypeBrand([
      { iso: "P", toolType: "Drill", vendor: "Zeta", row: "z" },
      { iso: "P", toolType: "Drill", vendor: "Alpha", row: "a" },
      { iso: "K", toolType: "Drill", vendor: "Alpha", row: "k" },
    ]);
    const leaves = flattenTree(tree);
    expect(leaves.map((l) => `${l.iso}/${l.typeSlug}/${l.brandSlug}`)).toEqual([
      "K/drill/alpha",
      "P/drill/alpha",
      "P/drill/zeta",
    ]);
    expect(leaves.find((l) => l.iso === "P" && l.rawBrand === "Alpha")!.rows).toEqual(["a"]);
  });
  it("disambiguates colliding slugs so distinct vendors get distinct FILES", () => {
    // two distinct vendors collide on slug "yg-1" -> must get yg-1.csv + yg-1-2.csv,
    // never one merged file (this is the gpt-oss P1 the injective rework closes).
    const tree = nestByMaterialTypeBrand([
      { iso: "P", toolType: "Drill", vendor: "YG-1", row: "a" },
      { iso: "P", toolType: "Drill", vendor: "YG 1", row: "b" },
    ]);
    const leaves = flattenTree(tree);
    const slugs = leaves.map((l) => l.brandSlug).sort();
    expect(slugs).toEqual(["yg-1", "yg-1-2"]);
    // each disambiguated leaf still carries exactly its own row
    expect(leaves.find((l) => l.brandSlug === "yg-1")!.rows.length).toBe(1);
    expect(leaves.find((l) => l.brandSlug === "yg-1-2")!.rows.length).toBe(1);
    expect(new Set(leaves.map((l) => l.brandSlug)).size).toBe(2); // unique filenames
  });
  it("disambiguates colliding TOOL-TYPE slugs the same way", () => {
    const tree = nestByMaterialTypeBrand([
      { iso: "P", toolType: "T Slot", vendor: "X", row: "a" },
      { iso: "P", toolType: "T-Slot", vendor: "X", row: "b" },
    ]);
    const typeSlugs = flattenTree(tree).map((l) => l.typeSlug).sort();
    expect(typeSlugs).toEqual(["t-slot", "t-slot-2"]);
  });
});

// injectiveSlugs is the shared collision-safe filename primitive now reused by BOTH the tooling
// material->type->brand tree (flattenTree) AND the holder type->brand tree
// (generate-jm-holder-libraries.ts). A regression here silently merges two distinct catalog
// entries into one file -> data loss, so it carries its own direct coverage.
describe("injectiveSlugs (shared collision-safe filename primitive)", () => {
  it("returns the base slug when there is no collision", () => {
    const m = injectiveSlugs(["HAIMER", "GUHRING", "BIG DAISHOWA"].sort(), "unspecified");
    expect(m.get("HAIMER")).toBe("haimer");
    expect(m.get("GUHRING")).toBe("guhring");
    expect(m.get("BIG DAISHOWA")).toBe("big-daishowa");
    expect(new Set(m.values()).size).toBe(3); // all unique
  });
  it("suffixes -2/-3 on distinct raws that slug the same (never a silent merge)", () => {
    const m = injectiveSlugs(["shrink fit", "shrink-fit", "shrink_fit"].sort(), "unknown-type");
    // all three are distinct raw keys that slug to "shrink-fit" -> must get unique filenames
    expect(new Set(m.values()).size).toBe(3);
    expect([...m.values()].sort()).toEqual(["shrink-fit", "shrink-fit-2", "shrink-fit-3"]);
  });
  it("falls back to blankSlug for a raw value that slugs to empty, still uniquely", () => {
    const m = injectiveSlugs(["", "   ", "OK"].sort(), "unspecified");
    expect(m.get("OK")).toBe("ok");
    // the two blank raws both fall back to "unspecified" -> the later gets "unspecified-2"
    const blanks = [m.get(""), m.get("   ")].sort();
    expect(blanks).toEqual(["unspecified", "unspecified-2"]);
    expect(new Set(m.values()).size).toBe(3);
  });
});
