/**
 * Tests for DocumentExtractionContract -- the versioned shape of a non-blueprint document extraction.
 * Reference-value + invariant (R9): the office producer shape -> typed entries, the sub-floor confidence
 * (regex extraction is heuristic -> needs_confirm), dedup/blank handling, summary rollups, and the
 * validator's totality (never throws) + `.default([])` round-trip tolerance.
 *
 * @since U-XRAY-DOCUMENT-EXTRACT-CONTRACT (2026-06-24, slot xray)
 */
import { describe, it, expect } from "vitest";
import {
  normalizeOfficeExtractToContract,
  normalizeOcrExtractToContract,
  validateDocumentExtractionContract,
  DOCUMENT_EXTRACTION_CONTRACT_VERSION,
  DOC_PER_FIELD_CONFIRM_FLOOR,
  OFFICE_REGEX_DEFAULT_CONFIDENCE,
} from "../schemas/DocumentExtractionContract.js";

// a realistic OfficeDocumentPipelineEngine.ExtractionResult (the live producer shape)
const OFFICE_RESULT = {
  metadata: { path: "JM/tool-catalog-2026.xlsx" },
  extractedData: {
    speeds: ["1200 rpm", "350 sfm"],
    feeds: ["4.5 ipm"],
    toolCodes: ["CNMG432", "DNMG431", "CNMG432"], // dup
    partNumbers: ["500-43050"],
    materials: ["4140", "stainless"],
  },
  success: true,
};

describe("normalizeOfficeExtractToContract", () => {
  it("maps the office producer's 5 string[] fields into typed, deduped DocEntries", () => {
    const c = normalizeOfficeExtractToContract(OFFICE_RESULT);
    expect(c.schemaVersion).toBe(DOCUMENT_EXTRACTION_CONTRACT_VERSION);
    expect(c.doc_type).toBe("office");
    expect(c.source).toBe("JM/tool-catalog-2026.xlsx");
    // 2 speeds + 1 feed + 2 tool_codes (CNMG432 deduped) + 1 part_number + 2 materials = 8
    expect(c.entries).toHaveLength(8);
    expect(c.summary.n_entries).toBe(8);
    expect(c.summary.by_kind).toEqual({ speed: 2, feed: 1, tool_code: 2, part_number: 1, material: 2 });
    expect(c.entries.find((e) => e.value === "CNMG432")?.kind).toBe("tool_code");
  });

  it("assigns the sub-floor regex confidence -> every office entry needs operator confirmation (R12)", () => {
    const c = normalizeOfficeExtractToContract(OFFICE_RESULT);
    expect(OFFICE_REGEX_DEFAULT_CONFIDENCE).toBeLessThan(DOC_PER_FIELD_CONFIRM_FLOOR); // regex is heuristic
    for (const e of c.entries) {
      expect(e.confidence).toBe(OFFICE_REGEX_DEFAULT_CONFIDENCE);
      expect(e.needs_confirm).toBe(true);
    }
    expect(c.summary.n_needs_confirm).toBe(8); // all 8
    expect(c.confirm_floor).toBe(DOC_PER_FIELD_CONFIRM_FLOOR);
  });

  it("accepts a bare extractedData object (not only the full ExtractionResult)", () => {
    const c = normalizeOfficeExtractToContract({ speeds: ["900 rpm"], toolCodes: ["WNMG080408"] });
    expect(c.entries).toHaveLength(2);
    expect(c.entries.map((e) => e.kind).sort()).toEqual(["speed", "tool_code"]);
    expect(c.source).toBeUndefined();
  });

  it("drops blank values and is total on an empty / malformed extraction (never throws)", () => {
    expect(normalizeOfficeExtractToContract({ extractedData: { speeds: ["", "  "], toolCodes: [] } }).entries).toHaveLength(0);
    expect(normalizeOfficeExtractToContract(null).summary.n_entries).toBe(0);
    expect(normalizeOfficeExtractToContract({ extractedData: { speeds: "not-an-array" } }).entries).toHaveLength(0);
    expect(normalizeOfficeExtractToContract(42 as unknown).entries).toHaveLength(0);
  });

  it("honors confirmFloor / entryConfidence / docType / source overrides", () => {
    const c = normalizeOfficeExtractToContract(
      { speeds: ["1000 rpm"] },
      { confirmFloor: 0.5, entryConfidence: 0.8, docType: "catalog", source: "override.xlsx" },
    );
    expect(c.doc_type).toBe("catalog");
    expect(c.source).toBe("override.xlsx");
    expect(c.entries[0].confidence).toBe(0.8);
    expect(c.entries[0].needs_confirm).toBe(false); // 0.8 >= 0.5 floor
    expect(c.summary.n_needs_confirm).toBe(0);
  });
});

const OCR_RESULT = {
  imagePath: "shop-photo.jpg",
  success: true,
  confidence: 0.85, // high-quality OCR -> above the 0.70 floor
  extractedData: {
    numbers: ["42"],
    dates: ["2026-06-24"],
    measurements: ["12.7 mm"],
    toolCodes: ["CNMG432"],
    partNumbers: ["500-43050"],
  },
};

describe("normalizeOcrExtractToContract", () => {
  it("maps the OCR producer's 5 fields -> typed entries with doc_type 'ocr' + the image source", () => {
    const c = normalizeOcrExtractToContract(OCR_RESULT);
    expect(c.doc_type).toBe("ocr");
    expect(c.source).toBe("shop-photo.jpg");
    expect(c.entries).toHaveLength(5); // measurement + tool_code + part_number + number + date
    expect(c.summary.by_kind).toEqual({ measurement: 1, tool_code: 1, part_number: 1, number: 1, date: 1 });
  });

  it("uses the OCR result's OWN confidence (not the office regex default) -> high-quality OCR needs no confirm", () => {
    const c = normalizeOcrExtractToContract(OCR_RESULT);
    for (const e of c.entries) {
      expect(e.confidence).toBe(0.85);
      expect(e.needs_confirm).toBe(false); // 0.85 >= 0.70 floor
    }
    expect(c.summary.n_needs_confirm).toBe(0);
  });

  it("a low-confidence OCR result -> every entry needs_confirm", () => {
    const c = normalizeOcrExtractToContract({ confidence: 0.5, extractedData: { toolCodes: ["WNMG080408"] } });
    expect(c.entries[0].needs_confirm).toBe(true); // 0.5 < 0.70
    expect(c.summary.n_needs_confirm).toBe(1);
  });

  it("is total on a malformed OCR result (never throws)", () => {
    expect(normalizeOcrExtractToContract(null).summary.n_entries).toBe(0);
    expect(normalizeOcrExtractToContract({ extractedData: { measurements: "nope" } }).entries).toHaveLength(0);
  });
});

describe("validateDocumentExtractionContract", () => {
  it("accepts a normalizer-produced contract (round-trip valid)", () => {
    const c = normalizeOfficeExtractToContract(OFFICE_RESULT);
    const v = validateDocumentExtractionContract(c);
    expect(v.ok).toBe(true);
    expect(v.errors).toBeUndefined();
  });

  it("re-parses a contract whose empty entries array was stripped (slimResponse tolerance via .default([]))", () => {
    const c = normalizeOfficeExtractToContract({ extractedData: {} });
    const { entries, ...withoutEntries } = c as Record<string, unknown> & typeof c;
    void entries;
    const v = validateDocumentExtractionContract(withoutEntries);
    expect(v.ok).toBe(true);
    expect(v.data?.entries).toEqual([]); // defaulted, not rejected
  });

  it("rejects a wrong schemaVersion (never throws -> {ok:false, errors})", () => {
    const v = validateDocumentExtractionContract({ schemaVersion: "9.9.9", doc_type: "office", confirm_floor: 0.7, summary: { n_entries: 0, n_needs_confirm: 0, by_kind: {} } });
    expect(v.ok).toBe(false);
    expect(Array.isArray(v.errors)).toBe(true);
    expect(v.errors!.length).toBeGreaterThan(0);
  });

  it("rejects garbage without throwing", () => {
    expect(validateDocumentExtractionContract(null).ok).toBe(false);
    expect(validateDocumentExtractionContract("nope").ok).toBe(false);
  });
});
