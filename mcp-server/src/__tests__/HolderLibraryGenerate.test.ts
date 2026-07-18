/**
 * HolderLibraryGenerate -- CATALOG-APP-WIRING-MS0/U-HOLDER-TYPE-BRAND-DISK (slot:romeo).
 *
 * Verifies the pure core of the holder library generator that materializes the real branded
 * holder DB (HolderSelectionEngine) to disk organized by TYPE then BRAND. Real reference values:
 * a dropped holder LOSES catalog data; a slug COLLISION that merges two distinct types/brands
 * corrupts the DB; a mis-aligned CSV row corrupts every downstream import -- all must fail here.
 */
import { describe, it, expect } from "vitest";
import {
  buildHolderLeaves,
  holderCsvRow,
  HOLDER_CSV_HEADER,
} from "../../scripts/generate-jm-holder-libraries.js";
import { holderSelectionEngine, type HolderRecord } from "../engines/HolderSelectionEngine.js";

const HEADER_COLS = HOLDER_CSV_HEADER.split(",").length;

function rec(over: Partial<HolderRecord> = {}): HolderRecord {
  return {
    brand: "HAIMER",
    type: "shrink_fit",
    designation: "TST-100",
    taper: "CAT40",
    boreMinMm: 6,
    boreMaxMm: 6,
    bodyDiaMm: 24,
    gaugeMm: 90,
    overallMm: 120,
    source: "test",
    ...over,
  } as HolderRecord;
}

describe("buildHolderLeaves (live engine -- no holder dropped or merged)", () => {
  const tree = holderSelectionEngine.byTypeBrand();
  const stats = holderSelectionEngine.stats();
  const leaves = buildHolderLeaves(tree);

  it("sanity: the live holder corpus is non-empty (else every assertion below is vacuous)", () => {
    expect(stats.total).toBeGreaterThan(0);
    expect(leaves.length).toBeGreaterThan(0);
  });

  it("files every holder in exactly one leaf -- total leaf rows === corpus total (no drop/dup)", () => {
    const emitted = leaves.reduce((n, l) => n + l.records.length, 0);
    expect(emitted).toBe(stats.total);
  });

  it("assigns a UNIQUE type/brand path to every leaf (no silent merge of two leaves)", () => {
    const paths = leaves.map((l) => `${l.typeSlug}/${l.brandSlug}`);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("every leaf is non-empty and its slugs are filesystem-safe (no separators / traversal)", () => {
    for (const l of leaves) {
      expect(l.records.length).toBeGreaterThan(0);
      expect(l.typeSlug).toMatch(/^[a-z0-9-]+$/);
      expect(l.brandSlug).toMatch(/^[a-z0-9-]+$/);
      expect(`${l.typeSlug}/${l.brandSlug}`).not.toMatch(/\.\.|\\/);
    }
  });

  it("surfaces the real branded vendors (the live catalog data actually flowed through)", () => {
    const brands = new Set(leaves.map((l) => l.rawBrand));
    // HolderSelectionEngine imports HAIMER + GUHRING + BIG DAISHOWA -> at least one must appear.
    expect([...brands].some((b) => ["HAIMER", "GUHRING", "BIG DAISHOWA"].includes(b))).toBe(true);
  });
});

describe("holderCsvRow (column alignment + escaping + null handling)", () => {
  it("emits exactly the header's column count for a normal holder", () => {
    expect(holderCsvRow(rec()).split(",").length).toBe(HEADER_COLS);
  });

  it("renders real dimensional values, leaving unknown (null) dims BLANK (never '0')", () => {
    const row = holderCsvRow(rec({ bodyDiaMm: null, gaugeMm: null, overallMm: null }));
    const cols = row.split(",");
    // header: brand,type,designation,taper,bore_min,bore_max,body_dia,gauge,overall,source
    expect(cols[4]).toBe("6"); // bore_min present
    expect(cols[6]).toBe(""); // body_dia null -> blank, NOT "0"
    expect(cols[7]).toBe(""); // gauge null -> blank
    expect(cols[8]).toBe(""); // overall null -> blank
  });

  it("CSV-quotes a designation containing a comma so columns never misalign", () => {
    const row = holderCsvRow(rec({ designation: "ER32, 4.5-5.0mm" }));
    expect(row).toContain('"ER32, 4.5-5.0mm"');
    // a naive split would over-count; a CSV-aware count of the quoted field keeps 10 logical columns.
    // The quoted comma must NOT leak as a column separator: the unquoted portion still has 9 commas.
    const outsideQuotes = row.replace(/"[^"]*"/g, "Q");
    expect(outsideQuotes.split(",").length).toBe(HEADER_COLS);
  });

  it("treats NaN dimensions as blank (fail-soft, never 'NaN' in the CSV)", () => {
    const row = holderCsvRow(rec({ boreMinMm: Number.NaN as unknown as number }));
    expect(row).not.toContain("NaN");
  });
});

describe("buildHolderLeaves collision safety (synthetic -- distinct types/brands never merge)", () => {
  it("keeps two distinct brand KEYS that slug identically as SEPARATE files", () => {
    // The filename slug derives from the tree KEY (rawBrand), so two distinct keys that slug the
    // same ("BIG DAISHOWA" vs "BIG-DAISHOWA") must get distinct files -- the record.brand is irrelevant.
    const tree: Record<string, Record<string, HolderRecord[]>> = {
      shrink_fit: {
        "BIG DAISHOWA": [rec()],
        "BIG-DAISHOWA": [rec()],
      },
    };
    const leaves = buildHolderLeaves(tree);
    const slugs = leaves.map((l) => l.brandSlug).sort();
    expect(slugs).toEqual(["big-daishowa", "big-daishowa-2"]);
    expect(new Set(slugs).size).toBe(2); // two distinct files, never one merged
  });

  it("keeps two distinct holder TYPES that slug identically as SEPARATE directories", () => {
    const tree: Record<string, Record<string, HolderRecord[]>> = {
      "shrink fit": { HAIMER: [rec()] },
      shrink_fit: { HAIMER: [rec()] },
    };
    const typeSlugs = buildHolderLeaves(tree).map((l) => l.typeSlug).sort();
    expect(typeSlugs).toEqual(["shrink-fit", "shrink-fit-2"]);
  });
});
