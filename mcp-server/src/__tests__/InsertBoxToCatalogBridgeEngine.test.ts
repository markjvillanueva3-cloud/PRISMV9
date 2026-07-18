/**
 * Tests for InsertBoxToCatalogBridgeEngine — QUOTING-PIPELINE-MS0 / U-QP03.
 * Concrete catalog-match invariants. No toBeDefined / toBeTruthy stubs.
 */
import { describe, it, expect } from "vitest";
import { InsertBoxToCatalogBridgeEngine } from "../engines/InsertBoxToCatalogBridgeEngine.js";

const eng = new InsertBoxToCatalogBridgeEngine();

describe("InsertBoxToCatalogBridgeEngine.lookup — happy path", () => {
  it("ISO 1832 designation + Sandvik → catalog_match with vendor=Sandvik, confidence>=0.85", () => {
    const r = eng.lookup({ text: "SANDVIK CNMG120408 grade 4325" });
    expect(r.catalog_match?.part_number).toBe("CNMG120408");
    expect(r.catalog_match?.vendor).toBe("Sandvik");
    expect(r.catalog_match?.category).toBe("indexable_insert");
    expect(r.catalog_match?.match_source).toBe("iso1832");
    expect(r.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("ISO 1832 designation without vendor → catalog_match with vendor=Unknown, lower confidence", () => {
    const r = eng.lookup({ text: "CNMG120408 carbide" });
    expect(r.catalog_match?.vendor).toBe("Unknown");
    expect(r.catalog_match?.match_confidence).toBe(0.75);
  });

  it("compatible_inserts returns exactly 3 grade variants for indexable_insert match", () => {
    const r = eng.lookup({ text: "SANDVIK CNMG120408" });
    expect(r.compatible_inserts.length).toBe(3);
    expect(r.compatible_inserts.map((c) => c.grade)).toEqual([
      "PR (precision)", "MM (medium-machining)", "RM (roughing)",
    ]);
  });

  it("vendor brand detection works for Iscar, Kennametal, Kyocera", () => {
    expect(eng.lookup({ text: "Iscar CNMG120408" }).catalog_match?.vendor).toBe("Iscar");
    expect(eng.lookup({ text: "Kennametal CNMG120408" }).catalog_match?.vendor).toBe("Kennametal");
    expect(eng.lookup({ text: "Kyocera CNMG120408" }).catalog_match?.vendor).toBe("Kyocera");
  });
});

describe("InsertBoxToCatalogBridgeEngine.lookup — failure modes (R12 fail-loud)", () => {
  it("empty text → catalog_match=null with reason=empty-or-missing-text", () => {
    const r = eng.lookup({ text: "" });
    expect(r.catalog_match).toBeNull();
    expect(r.compatible_inserts.length).toBe(0);
    expect(r.confidence).toBe(0);
    expect(r.reason).toBe("empty-or-missing-text");
  });

  it("text with no part identifier → catalog_match=null with reason=no-part-number-or-iso-designation-found", () => {
    const r = eng.lookup({ text: "this is just random text with no part numbers" });
    expect(r.catalog_match).toBeNull();
    expect(r.reason).toBe("no-part-number-or-iso-designation-found");
  });

  it("missing input object → catalog_match=null (no crash)", () => {
    // @ts-expect-error testing runtime guard
    const r = eng.lookup(null);
    expect(r.catalog_match).toBeNull();
    expect(r.reason).toBe("empty-or-missing-text");
  });
});

describe("InsertBoxToCatalogBridgeEngine.lookup — adversarial inputs", () => {
  it("NaN ocrConfidence → falls back to match_confidence, no crash", () => {
    const r = eng.lookup({ text: "SANDVIK CNMG120408", ocrConfidence: NaN });
    expect(r.confidence).toBe(0.95); // match_confidence preserved when non-finite
  });

  it("Infinity ocrConfidence → clamped to 1.0 effective scale", () => {
    const r = eng.lookup({ text: "SANDVIK CNMG120408", ocrConfidence: Infinity });
    expect(r.confidence).toBe(0.95);
  });

  it("oversized text (5K chars) still finds the SKU", () => {
    const filler = "Z".repeat(5000);
    const r = eng.lookup({ text: `SANDVIK CNMG120408 ${filler}` });
    expect(r.catalog_match?.part_number).toBe("CNMG120408");
  });
});

describe("InsertBoxToCatalogBridgeEngine.lookup — fallback to partNumbers", () => {
  it("no ISO designation but partNumbers[0] present + vendor → catalog_match with match_source=catalog", () => {
    const r = eng.lookup({ text: "Sandvik tool body", partNumbers: ["TURNCUT-1024"] });
    expect(r.catalog_match?.part_number).toBe("TURNCUT-1024");
    expect(r.catalog_match?.match_source).toBe("catalog");
    expect(r.catalog_match?.match_confidence).toBe(0.65);
  });

  it("no ISO + no vendor → category=unknown_tooling, lower match_confidence", () => {
    const r = eng.lookup({ text: "tool body no vendor", partNumbers: ["XYZ-1024"] });
    expect(r.catalog_match?.category).toBe("unknown_tooling");
    expect(r.catalog_match?.match_confidence).toBe(0.45);
  });

  it("partNumbers too short (<4) → catalog_match=null", () => {
    const r = eng.lookup({ text: "tool", partNumbers: ["AB"] });
    expect(r.catalog_match).toBeNull();
  });
});
