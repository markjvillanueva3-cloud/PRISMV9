// BlueprintExtractionContract.test.ts -- U-XRAY-EXTRACTION-CONTRACT
// Verifies the versioned app-facing extraction contract: the fuse->contract normalizer (per-field
// confidence + the 0.70 operator-confirm floor), summary rollups, and Zod validation. Reference
// values are computed from the documented contract; each assertion is load-bearing (R9).

import { describe, it, expect } from "vitest";
import {
  BLUEPRINT_EXTRACTION_CONTRACT_VERSION,
  OCR_PER_FIELD_CONFIRM_FLOOR,
  normalizeFusedToContract,
  normalizeDrawingExtractToContract,
  validateBlueprintExtractionContract,
} from "../schemas/BlueprintExtractionContract.js";

// A realistic fuseEnsemble output -- non-dim entries use the REAL producer shapes
// (ollama-vision-extract-lib.mjs reps + fuseNonDimField metadata), NOT synthetic {value,confidence}:
//   gdt   -> {symbol, raw_text, confidence}        notes            -> {category, text} (NO confidence)
//   profiles -> {name, type, confidence}           surface_finishes -> {ra_um, raw_text} (NO confidence)
// fuseNonDimField adds corroboration/n_models/hallucination_candidate to every entry.
const FUSED = {
  dimensions: [
    { value_mm: 25.4, type: "diameter", agreement_confidence: 0.95, status: "corroborated", hallucination_candidate: false },
    { value_mm: 12.7, type: "linear", agreement_confidence: 0.69, status: "singleton", hallucination_candidate: true },
    { value_mm: 50.8, type: "diameter", agreement_confidence: 0.70, status: "partial", hallucination_candidate: false },
    { value_mm: Number.NaN, type: "linear", agreement_confidence: 0.9, status: "corroborated" }, // dropped (non-finite)
  ],
  gdt: [{ symbol: "position", raw_text: "|POS|0.05|A|B|C|", confidence: 0.8, corroboration: 2, n_models: 2, hallucination_candidate: false }],
  notes: [{ category: "general", text: "BREAK ALL SHARP EDGES", is_critical: false, corroboration: 1, n_models: 2, hallucination_candidate: true }], // no confidence -> derived 1/2=0.5
  profiles: [{ name: "SLOT_A", type: "slot", confidence: 0.9, corroboration: 2, n_models: 2, hallucination_candidate: false }],
  surface_finishes: [{ ra_um: 1.6, raw_text: "63 RMS", location: "bore", corroboration: 2, n_models: 2, hallucination_candidate: false }], // no confidence -> derived 2/2=1.0
  summary: { n_models: 2 },
};

describe("normalizeFusedToContract", () => {
  const c = normalizeFusedToContract(FUSED);

  it("stamps the version + mm units", () => {
    expect(c.schemaVersion).toBe(BLUEPRINT_EXTRACTION_CONTRACT_VERSION);
    expect(c.units).toBe("mm");
    expect(c.confirm_floor).toBe(OCR_PER_FIELD_CONFIRM_FLOOR);
  });

  it("drops non-finite dims, carries confidence from agreement_confidence", () => {
    expect(c.dimensions).toHaveLength(3); // the NaN dim is dropped
    expect(c.dimensions[0]).toMatchObject({ value_mm: 25.4, type: "diameter", confidence: 0.95, status: "corroborated" });
  });

  it("threads the extracted tolerance (mm) through -- fixes the dropped-tolerance R12 loss", () => {
    // the VLM lib emits d.tolerance_mm = {upper, lower} (mm) + d.tolerance_type; normalize used to DROP it
    const fused = {
      dimensions: [
        { value_mm: 25.4, type: "diameter", agreement_confidence: 0.95, status: "corroborated", tolerance_type: "bilateral", tolerance_mm: { upper: 0.05, lower: -0.05 } },
        { value_mm: 50.0, type: "linear", agreement_confidence: 0.95, status: "corroborated" }, // no tolerance stated
        { value_mm: 10.0, type: "linear", agreement_confidence: 0.9, status: "singleton", tolerance_mm: { upper: 0.02 } }, // partial -> omit
      ],
    };
    const cc = normalizeFusedToContract(fused);
    const toleranced = cc.dimensions.find((d) => d.value_mm === 25.4)!;
    const bare = cc.dimensions.find((d) => d.value_mm === 50.0)!;
    const partial = cc.dimensions.find((d) => d.value_mm === 10.0)!;
    expect(toleranced.tolerance).toEqual({ type: "bilateral", upper: 0.05, lower: -0.05 });
    expect(bare.tolerance).toBeUndefined(); // no tolerance stated -> absent, not fabricated
    expect(partial.tolerance).toBeUndefined(); // only one bound -> omitted (fail-open, R12)
    // legacy `tolerance` alias (some VLM outputs) is also accepted
    const legacy = normalizeFusedToContract({ dimensions: [{ value_mm: 12.7, type: "linear", agreement_confidence: 0.9, status: "corroborated", tolerance: { upper: 0.1, lower: -0.1 } }] });
    expect(legacy.dimensions[0].tolerance).toEqual({ type: "unknown", upper: 0.1, lower: -0.1 });
  });

  it("needs_confirm uses the 0.70 floor: below => true, AT the floor => false", () => {
    const d127 = c.dimensions.find((d) => d.value_mm === 12.7)!;
    const d508 = c.dimensions.find((d) => d.value_mm === 50.8)!;
    expect(d127.confidence).toBe(0.69);
    expect(d127.needs_confirm).toBe(true); // 0.69 < 0.70
    expect(d508.confidence).toBe(0.70);
    expect(d508.needs_confirm).toBe(false); // 0.70 is NOT < 0.70
  });

  it("needs_confirm ALSO honors hallucination_candidate: a single-model dim ABOVE the floor STILL needs confirm", () => {
    // The defect this locks (surfaced by a live JM electrode print: 38/40 dims were single-model at ~0.9
    // self-confidence -> all passed as confirmed). A singleton's agreement_confidence is a DEFAULT self-score,
    // NOT cross-model corroboration -> it must reach the operator gate. Fails if needs_confirm reverts to
    // floor-only (`confidence < floor`).
    const fused = {
      dimensions: [
        { value_mm: 31.34, type: "diameter", agreement_confidence: 0.99, status: "corroborated", hallucination_candidate: false },
        { value_mm: 1.143, type: "linear", agreement_confidence: 0.9, status: "singleton", hallucination_candidate: true },
      ],
    };
    const cc = normalizeFusedToContract(fused);
    const corrob = cc.dimensions.find((d) => d.value_mm === 31.34)!;
    const singleton = cc.dimensions.find((d) => d.value_mm === 1.143)!;
    expect(corrob.confidence).toBe(0.99);
    expect(corrob.needs_confirm).toBe(false); // 0.99 >= floor AND corroborated -> trusted (no over-flagging)
    expect(singleton.confidence).toBe(0.9);
    expect(singleton.hallucination_candidate).toBe(true);
    expect(singleton.needs_confirm).toBe(true); // 0.9 >= floor BUT single-model -> operator gate (corrected behavior)
  });

  it("a hallucination_candidate CALLOUT above the floor also needs_confirm (same rule as dims)", () => {
    const cc = normalizeFusedToContract({
      notes: [{ category: "general", text: "SECRET NOTE", confidence: 0.95, corroboration: 1, n_models: 2, hallucination_candidate: true }],
    });
    expect(cc.notes[0].confidence).toBe(0.95);
    expect(cc.notes[0].needs_confirm).toBe(true); // 0.95 >= floor BUT single-model -> still gated
  });

  it("n_needs_confirm rollup counts a high-confidence hallucination_candidate (not just below-floor fields)", () => {
    const cc = normalizeFusedToContract({
      dimensions: [
        { value_mm: 10, type: "linear", agreement_confidence: 0.99, status: "corroborated", hallucination_candidate: false }, // trusted
        { value_mm: 20, type: "linear", agreement_confidence: 0.92, status: "singleton", hallucination_candidate: true },      // gated (single-model)
      ],
    });
    expect(cc.summary.n_needs_confirm).toBe(1); // only the hallucination_candidate -- proves the flag reaches the rollup
  });

  it("maps callouts from REAL producer shapes: gdt->raw_text (full FCF), profiles->name, sf->raw_text", () => {
    expect(c.gdt).toHaveLength(1);
    expect(c.gdt[0].value).toBe("|POS|0.05|A|B|C|"); // full FCF (raw_text), NOT the bare symbol "position"
    expect(c.gdt[0].confidence).toBe(0.8); // explicit producer confidence
    expect(c.profiles[0].value).toBe("SLOT_A"); // from `name` (profiles have no value/text/raw_text)
    expect(c.profiles[0].confidence).toBe(0.9); // explicit
    expect(c.surface_finishes[0].value).toBe("63 RMS"); // from raw_text
  });

  it("derives callout confidence from corroboration when the producer emits none (notes/surface_finishes)", () => {
    expect(c.notes[0].value).toBe("BREAK ALL SHARP EDGES");
    expect(c.notes[0].confidence).toBe(0.5); // no per-field confidence -> corroboration 1/2 = 0.5
    expect(c.notes[0].needs_confirm).toBe(true); // 0.5 < 0.70 (NOT a hardcoded 0 that flags every note)
    expect(c.surface_finishes[0].confidence).toBe(1); // corroboration 2/2 = 1.0
    expect(c.surface_finishes[0].needs_confirm).toBe(false);
  });

  it("summary rollups: counts + needs_confirm span dims AND callouts", () => {
    expect(c.summary.n_dimensions).toBe(3);
    expect(c.summary.n_corroborated).toBe(1); // only the 25.4 diameter
    expect(c.summary.n_gdt).toBe(1);
    expect(c.summary.n_notes).toBe(1);
    expect(c.summary.n_profiles).toBe(1);
    expect(c.summary.n_surface_finishes).toBe(1);
    expect(c.summary.n_models).toBe(2);
    // needs_confirm = dim 12.7 (0.69) + note (0.5) = 2; gdt 0.8 / profiles 0.9 / sf 1.0 all >= 0.70
    expect(c.summary.n_needs_confirm).toBe(2);
  });

  it("attaches source + title_block from opts", () => {
    const c2 = normalizeFusedToContract(FUSED, { source: "ITW/part.pdf", titleBlock: { customer: "ACME", units: "in" } });
    expect(c2.source).toBe("ITW/part.pdf");
    expect(c2.title_block).toMatchObject({ customer: "ACME", units: "in" });
  });

  it("picks up title_block from the fused object when not in opts", () => {
    const c3 = normalizeFusedToContract({ ...FUSED, title_block: { part_number: "X-9" } });
    expect(c3.title_block).toMatchObject({ part_number: "X-9" });
  });

  it("a custom confirmFloor re-thresholds needs_confirm (for a NON-hallucination dim -- the floor is the only gate)", () => {
    // Use a CORROBORATED dim so the floor is the sole gate (FUSED's only below-floor dim, 12.7, is a
    // hallucination_candidate, which is now gated independently of the floor -- see the dedicated test above).
    const fused = { dimensions: [{ value_mm: 12.7, type: "linear", agreement_confidence: 0.69, status: "partial", hallucination_candidate: false }] };
    expect(normalizeFusedToContract(fused).dimensions[0].needs_confirm).toBe(true); // 0.69 < 0.70 default floor
    expect(normalizeFusedToContract(fused, { confirmFloor: 0.6 }).dimensions[0].needs_confirm).toBe(false); // 0.69 >= 0.6 now
  });

  it("handles empty/garbage input without throwing", () => {
    expect(normalizeFusedToContract(null).dimensions).toEqual([]);
    expect(normalizeFusedToContract({}).summary.n_dimensions).toBe(0);
    const c5 = normalizeFusedToContract({ dimensions: [{ value_mm: 5 }] }); // no confidence/type/status
    expect(c5.dimensions[0]).toMatchObject({ value_mm: 5, type: "unknown", confidence: 0, needs_confirm: true, status: "unknown" });
  });
});

describe("validateBlueprintExtractionContract", () => {
  it("accepts a freshly normalized contract (round-trip)", () => {
    const c = normalizeFusedToContract(FUSED, { source: "p.pdf", titleBlock: { customer: "ACME" } });
    const v = validateBlueprintExtractionContract(c);
    expect(v.ok).toBe(true);
    expect(v.data?.dimensions).toHaveLength(3);
  });

  it("rejects a wrong schemaVersion (forces a migration, never a silent drift)", () => {
    const c = normalizeFusedToContract(FUSED) as Record<string, unknown>;
    const v = validateBlueprintExtractionContract({ ...c, schemaVersion: "9.9.9" });
    expect(v.ok).toBe(false);
    expect(v.errors?.some((e) => e.includes("schemaVersion"))).toBe(true);
  });

  it("rejects an out-of-range confidence", () => {
    const c = normalizeFusedToContract(FUSED);
    const bad = { ...c, dimensions: [{ ...c.dimensions[0], confidence: 2 }, ...c.dimensions.slice(1)] }; // > 1
    const v = validateBlueprintExtractionContract(bad);
    expect(v.ok).toBe(false);
  });

  it("rejects junk + returns errors[], never throws", () => {
    const v = validateBlueprintExtractionContract({});
    expect(v.ok).toBe(false);
    expect(Array.isArray(v.errors)).toBe(true);
    expect(v.errors!.length).toBeGreaterThan(0);
  });
});

// A realistic Drawing2DExtractionEngine.extractDrawing result -- the GEOMETRY producer shape:
// dims carry their OWN {value, unit} (NOT a pre-normalized value_mm), type uses the DXF 'radial'
// spelling, annotations are free text, partInfo holds the title block, and there is NO confidence
// field (deterministic CAD parse, not a VLM guess).
const DRAWING_EXTRACT = {
  success: true,
  metadata: { path: "JM/ITW-500.dxf", name: "ITW-500.dxf", format: "dxf", units: "in" },
  entities: [],
  dimensions: [
    { id: "d1", type: "linear", value: 50, unit: "mm", text: "50" },
    { id: "d2", type: "diameter", value: 0.5, unit: "in", text: "0.500" }, // inch -> 12.7mm
    { id: "d3", type: "radial", value: 0.25, unit: "in", text: "R.250" }, // radial -> radius, -> 6.35mm
    { id: "d4", type: "linear", value: Number.NaN, unit: "mm", text: "?" }, // dropped (non-finite)
  ],
  annotations: ["BREAK ALL SHARP EDGES", "   ", "MATERIAL: 4140 STEEL"],
  partInfo: { partNumber: "500-43050", revision: "C", material: "4140" },
  warnings: [],
  processingTimeMs: 3,
};

describe("normalizeDrawingExtractToContract (geometry producer)", () => {
  const c = normalizeDrawingExtractToContract(DRAWING_EXTRACT);

  it("stamps version + mm units + the confirm floor", () => {
    expect(c.schemaVersion).toBe(BLUEPRINT_EXTRACTION_CONTRACT_VERSION);
    expect(c.units).toBe("mm");
    expect(c.confirm_floor).toBe(OCR_PER_FIELD_CONFIRM_FLOOR);
  });

  it("UNITS-FIRST: converts each dim by its OWN unit (inch -> *25.4 mm), drops non-finite", () => {
    expect(c.dimensions).toHaveLength(3); // the NaN dim is dropped
    const mm = c.dimensions.find((d) => d.value_mm === 50)!;
    expect(mm.value_mm).toBe(50); // mm dim unchanged
    const inDia = c.dimensions.find((d) => d.type === "diameter")!;
    expect(inDia.value_mm).toBeCloseTo(12.7, 6); // 0.5 in -> 12.7 mm (NOT 0.5, NOT dropped)
    const inRad = c.dimensions.find((d) => d.type === "radius")!;
    expect(inRad.value_mm).toBeCloseTo(6.35, 6); // 0.25 in -> 6.35 mm
  });

  it("maps the DXF 'radial' type spelling to canonical 'radius'", () => {
    expect(c.dimensions.some((d) => d.type === "radius")).toBe(true);
    expect(c.dimensions.some((d) => d.type === "radial")).toBe(false);
  });

  it("a successful geometry parse is EXACT -> confidence 1.0, needs_confirm false, status unknown, no hallucination", () => {
    for (const d of c.dimensions) {
      expect(d.confidence).toBe(1);
      expect(d.needs_confirm).toBe(false); // 1.0 >= 0.70
      expect(d.status).toBe("unknown"); // ensemble-corroboration is VLM-only
      expect(d.hallucination_candidate).toBe(false); // deterministic parse can't hallucinate
    }
  });

  it("annotations -> notes (free text; blanks/non-strings filtered), gdt/profiles/surface_finishes stay empty", () => {
    expect(c.notes.map((n) => n.value)).toEqual(["BREAK ALL SHARP EDGES", "MATERIAL: 4140 STEEL"]);
    expect(c.gdt).toEqual([]);
    expect(c.profiles).toEqual([]);
    expect(c.surface_finishes).toEqual([]);
  });

  it("title_block from partInfo + metadata.units; source from metadata.path", () => {
    expect(c.title_block).toMatchObject({ part_number: "500-43050", revision: "C", material: "4140", units: "in" });
    expect(c.source).toBe("JM/ITW-500.dxf");
  });

  it("summary rollup: n_models 0 (no VLM), n_corroborated 0 (status unknown), counts notes", () => {
    expect(c.summary.n_dimensions).toBe(3);
    expect(c.summary.n_models).toBe(0);
    expect(c.summary.n_corroborated).toBe(0);
    expect(c.summary.n_notes).toBe(2);
    expect(c.summary.n_gdt).toBe(0);
    expect(c.summary.n_needs_confirm).toBe(0); // all conf 1.0 on a clean parse
  });

  it("a FAILED/degraded parse (success:false) -> confidence 0.5 -> EVERY field needs_confirm", () => {
    const cf = normalizeDrawingExtractToContract({ ...DRAWING_EXTRACT, success: false });
    for (const d of cf.dimensions) {
      expect(d.confidence).toBe(0.5);
      expect(d.needs_confirm).toBe(true); // 0.5 < 0.70
    }
    expect(cf.notes.every((n) => n.needs_confirm)).toBe(true);
    // n_needs_confirm spans dims (3) + notes (2)
    expect(cf.summary.n_needs_confirm).toBe(5);
  });

  it("fail-safe: a FUSE-shaped object (value_mm, no value) is NOT silently mis-read -> dims dropped", () => {
    // proves the two normalizers are NOT interchangeable: feeding the wrong producer yields an empty
    // dim set, never a garbage dimension (the silent-loss seam this normalizer exists to prevent).
    const wrong = normalizeDrawingExtractToContract({ dimensions: [{ value_mm: 25.4, type: "diameter" }] });
    expect(wrong.dimensions).toEqual([]);
  });

  it("empty / non-object input -> a valid empty contract (no throw)", () => {
    expect(normalizeDrawingExtractToContract(null).dimensions).toEqual([]);
    expect(normalizeDrawingExtractToContract(undefined).summary.n_dimensions).toBe(0);
    expect(normalizeDrawingExtractToContract({}).notes).toEqual([]);
  });

  it("opts.source overrides metadata.path; a custom confirmFloor re-thresholds", () => {
    const c2 = normalizeDrawingExtractToContract(DRAWING_EXTRACT, { source: "override.dxf", confirmFloor: 1.0 });
    expect(c2.source).toBe("override.dxf");
    // floor 1.0 -> a clean 1.0-confidence dim is NOT < 1.0 -> still false (boundary, not <)
    expect(c2.dimensions.every((d) => d.needs_confirm === false)).toBe(true);
  });

  it("UNITS-SAFE: 'inch' alias converts; an unrecognized/missing unit is kept but forced needs_confirm", () => {
    const cu = normalizeDrawingExtractToContract({
      success: true,
      dimensions: [
        { id: "a", type: "linear", value: 10, unit: "inch" }, // alias of 'in' -> 254mm, trusted
        { id: "b", type: "linear", value: 7, unit: "foo" }, // unrecognized -> kept as 7, NOT trusted as mm
        { id: "c", type: "linear", value: 8 }, // missing unit -> kept as 8, NOT trusted as mm
      ],
    });
    const a = cu.dimensions.find((d) => d.value_mm > 200)!;
    expect(a.value_mm).toBeCloseTo(254, 6); // 10 'inch' -> 254 mm (alias recognized + converted)
    expect(a.needs_confirm).toBe(false); // recognized unit on a clean parse -> trusted
    const b = cu.dimensions.find((d) => d.value_mm === 7)!;
    expect(b.needs_confirm).toBe(true); // unrecognized unit -> never silently trusted as mm
    const cc = cu.dimensions.find((d) => d.value_mm === 8)!;
    expect(cc.needs_confirm).toBe(true); // missing unit -> never silently trusted as mm
  });

  it("VALUE GUARD: empty-string/null/false/array values are DROPPED (never coerced to 0); numeric string accepted", () => {
    const cv = normalizeDrawingExtractToContract({
      success: true,
      dimensions: [
        { id: "1", type: "linear", value: "", unit: "mm" },
        { id: "2", type: "linear", value: null, unit: "mm" },
        { id: "3", type: "linear", value: false, unit: "mm" },
        { id: "4", type: "linear", value: [], unit: "mm" },
        { id: "5", type: "linear", value: "50", unit: "mm" }, // non-empty numeric string accepted
      ],
    });
    expect(cv.dimensions).toHaveLength(1); // only "50" survives; the 4 falsy/non-numeric are dropped (not 0)
    expect(cv.dimensions[0].value_mm).toBe(50);
  });

  it("round-trips through the schema validator (produces a structurally valid contract)", () => {
    const v = validateBlueprintExtractionContract(c);
    expect(v.ok).toBe(true);
    expect(v.data?.dimensions).toHaveLength(3);
  });
});
