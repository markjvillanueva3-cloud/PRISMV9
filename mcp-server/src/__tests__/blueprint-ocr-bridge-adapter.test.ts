/**
 * U-QP-BLUEPRINT-OCR-BRIDGE-ADAPTER — round-trip tests (charlie 2026-06-09).
 *
 * Feeds REAL blueprintOCREngine.analyzeBlueprint() output through the new
 * fromOCRAnalysis / bridgeFromOCR adapter and proves GD&T + dimensions + title survive
 * the OCR->bridge shape translation. Before this adapter, both dispatcher call sites
 * (shopDispatcher.emp_blueprint_to_quote + businessDispatcher.blueprint_to_quote) fed the
 * OCR shape STRAIGHT into bridge() which expects a structurally different BlueprintAnalysis
 * -> all GD&T was silently dropped (bridge reads analysis.gdt, OCR emits gdt_frames) and
 * dimensions mis-read -> under-spec'd quotes from real prints, with no error.
 *
 * Every test is fail-on-revert: drop a field remap in fromOCRAnalysis and the matching
 * assertion throws or flips. We feed REAL analyzeBlueprint() output (not a hand-built mock)
 * so the test also breaks if the OCR output shape drifts.
 */
import { describe, it, expect } from "vitest";
import { blueprintOCREngine } from "../engines/BlueprintOCREngine.js";
import { blueprintToQuoteBridgeEngine } from "../engines/BlueprintToQuoteBridgeEngine.js";

const { analyzeBlueprint } = blueprintOCREngine;

// Blueprint text that reliably triggers OCR extraction: a diameter dim with a bilateral
// tolerance, two GD&T callouts (flatness + true position w/ datums), a title, a material.
const GDT_PRINT = `
TITLE: TEST BRACKET ADAPTER
MATERIAL: 6061-T6 ALUMINUM
DRAWING NO 12345

Ø12.50 ±0.01 THRU
FLATNESS 0.05
TRUE POSITION 0.013 A B C
`;

// Same diameter dim, NO GD&T — the control for "GD&T tightens the quote".
const NO_GDT_PRINT = `
TITLE: TEST BRACKET ADAPTER
MATERIAL: 6061-T6 ALUMINUM
Ø12.50 ±0.01 THRU
`;

describe("BlueprintToQuoteBridgeEngine.fromOCRAnalysis / bridgeFromOCR (U-QP-BLUEPRINT-OCR-BRIDGE-ADAPTER)", () => {
  it("gdt_frames survive the gdt_frames->gdt key rename (THE bug this unit kills)", () => {
    const ocr = analyzeBlueprint(GDT_PRINT);
    expect(ocr.gdt_frames.length).toBeGreaterThanOrEqual(1); // OCR genuinely extracted GD&T
    const adapted = blueprintToQuoteBridgeEngine.fromOCRAnalysis(ocr);
    // Revert the gdt_frames->gdt remap -> adapted.gdt is undefined -> .length throws.
    expect(adapted.gdt!.length).toBe(ocr.gdt_frames.length);
    expect(adapted.gdt![0].symbol).toBe(ocr.gdt_frames[0].symbol);
    expect(adapted.gdt![0].tolerance_value).toBe(ocr.gdt_frames[0].tolerance_value);
    expect(adapted.gdt![0].datum_refs).toEqual(ocr.gdt_frames[0].datum_references);
  });

  it("GD&T flows end-to-end into the quote (inspection level leaves 'standard' + tightens tolerance)", () => {
    const withGdt = blueprintToQuoteBridgeEngine.bridgeFromOCR(analyzeBlueprint(GDT_PRINT));
    const withoutGdt = blueprintToQuoteBridgeEngine.bridgeFromOCR(analyzeBlueprint(NO_GDT_PRINT));
    // Position callout -> NOT default "standard" (revert the remap -> gdt=[] -> stays "standard").
    expect(withGdt.quote_input.inspection_level).not.toBe("standard");
    expect(withoutGdt.quote_input.inspection_level).toBe("standard");
    // The 0.013 GD&T tolerance is tighter than the 0.02 dim band -> tightens the quote.
    expect(withGdt.quote_input.tightest_tolerance_mm).toBeLessThan(
      withoutGdt.quote_input.tightest_tolerance_mm!,
    );
  });

  it("dimension nominal->value + tolerance {upper,lower} survive the adapter", () => {
    const ocr = analyzeBlueprint(GDT_PRINT);
    expect(ocr.dimensions.length).toBeGreaterThanOrEqual(1);
    const adapted = blueprintToQuoteBridgeEngine.fromOCRAnalysis(ocr);
    expect(adapted.dimensions!.length).toBe(ocr.dimensions.length);
    // value is the renamed nominal (revert -> value is undefined, breaking this equality).
    expect(adapted.dimensions![0].value).toBe(ocr.dimensions[0].nominal);
    expect(adapted.dimensions![0].text).toBe(ocr.dimensions[0].raw_text);
    // The diameter carries a bilateral tolerance — assert {upper,lower} survive verbatim.
    const ocrTolDim = ocr.dimensions.find((d) => d.tolerance);
    const adaptedTolDim = adapted.dimensions!.find((d) => d.tolerance);
    expect(adaptedTolDim!.tolerance!.upper).toBe(ocrTolDim!.tolerance!.upper);
    expect(adaptedTolDim!.tolerance!.lower).toBe(ocrTolDim!.tolerance!.lower);
  });

  it("title.title -> part_name survives + adds extraction confidence", () => {
    const ocr = analyzeBlueprint(GDT_PRINT);
    expect(ocr.title_block.title).toContain("BRACKET"); // OCR captured the title text
    const adapted = blueprintToQuoteBridgeEngine.fromOCRAnalysis(ocr);
    expect(adapted.title_block!.part_name).toBe(ocr.title_block.title);
    // End-to-end: a titled print earns more extraction confidence than an untitled one.
    const noTitle = analyzeBlueprint("Ø12.50 ±0.01 THRU\nMATERIAL: 6061-T6 ALUMINUM");
    const withTitle = blueprintToQuoteBridgeEngine.bridgeFromOCR(ocr);
    const withoutTitle = blueprintToQuoteBridgeEngine.bridgeFromOCR(noTitle);
    expect(withTitle.extraction_confidence).toBeGreaterThan(withoutTitle.extraction_confidence);
  });

  it("material string resolves through the adapter (not the fallback)", () => {
    const result = blueprintToQuoteBridgeEngine.bridgeFromOCR(analyzeBlueprint(GDT_PRINT));
    // 6061-T6 ALUMINUM -> aluminum_6061 via resolveMaterial on the ADAPTED title_block.material.
    expect(result.quote_input.material).toBe("aluminum_6061");
    expect(result.extraction_notes.some((n) => /material resolved/i.test(n))).toBe(true);
  });

  it("bounding_box has no OCR source -> adapter omits it (no fabricated stock)", () => {
    const ocr = analyzeBlueprint(GDT_PRINT);
    const adapted = blueprintToQuoteBridgeEngine.fromOCRAnalysis(ocr);
    // OCR carries no bounding box -> the adapter must NOT invent one (would mis-size stock).
    expect(Object.hasOwn(adapted, "bounding_box")).toBe(false);
    const result = blueprintToQuoteBridgeEngine.bridgeFromOCR(ocr);
    const stock = result.quote_input.stock_dimensions_mm;
    // No OCR bbox + no override -> no fabricated stock extent reaches the quote.
    expect(stock === undefined || stock === null).toBe(true);
  });
});
