/**
 * Tests for normalizeDocLearningToContract -- the 3rd producer normalizer (documentLearning
 * ContentIngestionPipelineEngine IngestionResult -> DocumentExtractionContract). Closes the
 * DocumentLearningPage -> tribal-knowledge dead-end. Reference-value + invariant (R9): per-item
 * confidence carried through (NOT a flat regex default), procedure/note classification, dedup,
 * fail-soft totality, and contract validity.
 *
 * @since U-XRAY-DOCLEARN-NORMALIZER (2026-06-24, slot xray)
 */
import { describe, it, expect } from "vitest";
import {
  normalizeDocLearningToContract,
  validateDocumentExtractionContract,
  DOCUMENT_EXTRACTION_CONTRACT_VERSION,
} from "../schemas/DocumentExtractionContract.js";

describe("normalizeDocLearningToContract", () => {
  it("maps an IngestionResult's items to procedure/note DocEntries carrying each tip's OWN confidence", () => {
    const c = normalizeDocLearningToContract({
      items: [
        { title: "Setup steps", body: "indicate the vise, then tram", category: "setup", confidence: 0.92 },
        { title: "Coolant tip", body: "flood for 4140", category: "general", confidence: 0.5 },
      ],
      source_attribution: "haas-manual.pdf",
    });
    expect(c.schemaVersion).toBe(DOCUMENT_EXTRACTION_CONTRACT_VERSION);
    expect(c.doc_type).toBe("manual");
    expect(c.source).toBe("haas-manual.pdf");
    expect(c.entries).toHaveLength(2);
    // category "setup" -> procedure (hint); "general" -> note. confidence carried verbatim, gate = <0.70.
    expect(c.entries[0]).toMatchObject({ kind: "procedure", value: "Setup steps: indicate the vise, then tram", confidence: 0.92, needs_confirm: false });
    expect(c.entries[1]).toMatchObject({ kind: "note", confidence: 0.5, needs_confirm: true });
    expect(c.summary.n_entries).toBe(2);
    expect(c.summary.n_needs_confirm).toBe(1);
    expect(c.summary.by_kind).toEqual({ procedure: 1, note: 1 });
    expect(validateDocumentExtractionContract(c).ok).toBe(true);
  });

  it("accepts a bare IngestionItem[] and drops blank + duplicate values", () => {
    const c = normalizeDocLearningToContract([
      { title: "A", body: "x", category: "note", confidence: 0.9 },
      { title: "A", body: "x", category: "note", confidence: 0.9 }, // exact dup -> dropped
      { title: "", body: "", category: "note", confidence: 0.9 }, // blank -> dropped
    ]);
    expect(c.entries).toHaveLength(1);
    expect(c.entries[0].value).toBe("A: x");
  });

  it("missing/invalid confidence falls back to the sub-floor default -> needs_confirm", () => {
    const c = normalizeDocLearningToContract({ items: [{ title: "T", body: "b", category: "x" }] });
    expect(c.entries[0].confidence).toBe(0.6); // OFFICE_REGEX_DEFAULT_CONFIDENCE
    expect(c.entries[0].needs_confirm).toBe(true); // 0.6 < 0.70 floor
  });

  it("detects a procedure hint in the TITLE even when the category is generic", () => {
    const c = normalizeDocLearningToContract([{ title: "How-to: bore the ID", body: "...", category: "misc", confidence: 0.9 }]);
    expect(c.entries[0].kind).toBe("procedure");
  });

  it("uses title OR body when only one is present", () => {
    const c = normalizeDocLearningToContract([
      { title: "Body-only", body: "", category: "note", confidence: 0.9 },
      { title: "", body: "title-only body text", category: "note", confidence: 0.9 },
    ]);
    expect(c.entries.map((e) => e.value)).toEqual(["Body-only", "title-only body text"]);
  });

  it("honors an explicit confirmFloor + docType override", () => {
    const c = normalizeDocLearningToContract({ items: [{ title: "T", body: "b", category: "x", confidence: 0.65 }] }, { confirmFloor: 0.6, docType: "spec" });
    expect(c.doc_type).toBe("spec");
    expect(c.entries[0].needs_confirm).toBe(false); // 0.65 >= the overridden 0.60 floor
  });

  it("is total on garbage input (never throws)", () => {
    expect(normalizeDocLearningToContract(null).entries).toEqual([]);
    expect(normalizeDocLearningToContract({ items: "nope" } as unknown).entries).toEqual([]);
    expect(normalizeDocLearningToContract({}).summary.n_entries).toBe(0);
    expect(normalizeDocLearningToContract([{ not: "an item" }]).entries).toEqual([]); // no title/body -> dropped
  });
});
