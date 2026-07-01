/**
 * CADLiveBlueprintOcrAdapter.test.ts -- CAD-DRAW-MAX-MS1/U-PRINT-OCR-LIVE
 *                                     -- BLUEPRINT-VISION-OCR/U-PRINT-OCR-PDF (PDF + multi-page)
 *
 * Aligned to the REAL BlueprintVisionResult contract: gdt_frames (NOT
 * gdt_callouts) + title_block.confidence (there is no overall_confidence field).
 */

import { describe, it, expect } from "vitest";
import { writeFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CADLiveBlueprintOcrAdapter,
  cadLiveBlueprintOcrAdapter,
  classifyPrintPath,
  selectPdfPageIndices,
  mapDimension,
  mapAnalysisToPrintOcr,
  unionDimensions,
  unionFeatures,
  sanitizeLiveOcrAdapterOptions,
  makeLiveOcrPrintFn,
  type PdfRasterizer,
  type BlueprintAnalyzer,
} from "../engines/CADLiveBlueprintOcrAdapter.js";
import type { BlueprintVisionResult } from "../engines/BlueprintVisionOCREngine.js";
import type { PrintDimension, PrintFeature } from "../engines/CADRoundTripValidationEngine.js";

/** Build a minimal BlueprintVisionResult against the REAL field shape. */
function makeAnalysis(overrides: Partial<BlueprintVisionResult> = {}): BlueprintVisionResult {
  return {
    dimensions: overrides.dimensions ?? [],
    notes: overrides.notes ?? [],
    profiles: overrides.profiles ?? [],
    gdt_frames: overrides.gdt_frames ?? [],
    title_block: overrides.title_block,
    summary: overrides.summary,
    tokens_used: overrides.tokens_used ?? 0,
    processing_time_ms: overrides.processing_time_ms ?? 0,
    raw_response: overrides.raw_response ?? "",
  } as unknown as BlueprintVisionResult;
}

/** A canned analyzer that returns a fixed analysis regardless of input. */
function fixedAnalyzer(result: BlueprintVisionResult): BlueprintAnalyzer {
  return { analyzeBlueprint: async () => result };
}

/**
 * A per-page analyzer keyed off the rendered png path. The fake rasterizer
 * encodes the page index into the path (".../p<idx>.png"), so the analyzer can
 * return a different analysis per page (cover -> 0 dims, drawing -> N dims).
 */
function perPageAnalyzer(byPage: Record<number, BlueprintVisionResult>): BlueprintAnalyzer {
  return {
    analyzeBlueprint: async (input) => {
      const path = (input.image as { path?: string }).path ?? "";
      const m = path.match(/p(\d+)\.png$/);
      const idx = m ? parseInt(m[1], 10) : -1;
      return byPage[idx] ?? makeAnalysis();
    },
  };
}

/** A fake rasterizer: fixed page count, per-page render returning a path or null. */
function fakeRasterizer(count: number, renderImpl?: (idx: number) => string | null): PdfRasterizer {
  return {
    pageCount: () => count,
    renderPage: (_doc, idx) => (renderImpl ? renderImpl(idx) : `/fake/raster/p${idx}.png`),
  };
}

/** Create a real temp file with the given extension (for existsSync gating). */
function tmpFileWith(ext: string, bytes = [0x25, 0x50, 0x44, 0x46]): string {
  const dir = mkdtempSync(join(tmpdir(), "cad-live-ocr-"));
  const f = join(dir, `print${ext}`);
  writeFileSync(f, Buffer.from(bytes));
  return f;
}

describe("classifyPrintPath", () => {
  it("accepts images as kind=image", () => {
    expect(classifyPrintPath("/x/y.png")).toEqual({ ok: true, kind: "image" });
    expect(classifyPrintPath("/x.jpg")).toEqual({ ok: true, kind: "image" });
    expect(classifyPrintPath("/x.jpeg")).toEqual({ ok: true, kind: "image" });
    expect(classifyPrintPath("/x.webp")).toEqual({ ok: true, kind: "image" });
    expect(classifyPrintPath("/x.gif")).toEqual({ ok: true, kind: "image" });
  });

  it("accepts PDF + TIFF as kind=raster-doc (U-PRINT-OCR-PDF -- no longer rejected)", () => {
    expect(classifyPrintPath("/jm/print.pdf")).toEqual({ ok: true, kind: "raster-doc" });
    expect(classifyPrintPath("/jm/scan.tif")).toEqual({ ok: true, kind: "raster-doc" });
    expect(classifyPrintPath("/jm/scan.tiff")).toEqual({ ok: true, kind: "raster-doc" });
  });

  it("is case-insensitive on extension", () => {
    expect(classifyPrintPath("/x/Y.PDF")).toEqual({ ok: true, kind: "raster-doc" });
    expect(classifyPrintPath("/x/Y.PNG")).toEqual({ ok: true, kind: "image" });
  });

  it("rejects empty string with reason", () => {
    const r = classifyPrintPath("");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/non-empty/);
  });

  it("rejects unsupported extension with allowlist", () => {
    const r = classifyPrintPath("/x.docx");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/unsupported/);
  });
});

describe("selectPdfPageIndices", () => {
  it("returns all pages by default", () => {
    expect(selectPdfPageIndices(3)).toEqual([0, 1, 2]);
  });
  it("caps at maxPages", () => {
    expect(selectPdfPageIndices(20, { maxPages: 12 })).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
  it("honors an explicit single page in range", () => {
    expect(selectPdfPageIndices(5, { page: 2 })).toEqual([2]);
  });
  it("returns empty for an out-of-range single page", () => {
    expect(selectPdfPageIndices(3, { page: 7 })).toEqual([]);
    expect(selectPdfPageIndices(3, { page: -1 })).toEqual([]);
  });
  it("returns empty for zero / NaN / negative page count", () => {
    expect(selectPdfPageIndices(0)).toEqual([]);
    expect(selectPdfPageIndices(NaN)).toEqual([]);
    expect(selectPdfPageIndices(-4)).toEqual([]);
  });
  it("ignores a non-positive maxPages (renders all)", () => {
    expect(selectPdfPageIndices(3, { maxPages: 0 })).toEqual([0, 1, 2]);
  });
});

describe("mapDimension", () => {
  it("maps a basic dim with nominal value (label from location_hint)", () => {
    const out = mapDimension({ id: "D1", location_hint: "OD", nominal: 0.5, unit: "in" } as never, 0);
    expect(out).toEqual({ id: "D1", label: "OD", value: 0.5, unit: "in" });
  });

  it("falls back label to type, then to dim-N", () => {
    expect(mapDimension({ id: "D1", type: "diameter", nominal: 0.5 } as never, 0)!.label).toBe("diameter");
    expect(mapDimension({ id: "D1", nominal: 0.5 } as never, 3)!.label).toBe("dim-4");
  });

  it("generates ID when missing (DIM-NNN padded)", () => {
    const out = mapDimension({ label: "OD", nominal: 0.5 } as never, 4);
    expect(out!.id).toBe("DIM-005");
  });

  it("rejects non-finite nominal", () => {
    expect(mapDimension({ id: "D1", label: "OD", nominal: NaN } as never, 0)).toBeNull();
    expect(mapDimension({ id: "D1", label: "OD", nominal: "not a number" } as never, 0)).toBeNull();
  });

  it("preserves asymmetric tolerance", () => {
    const out = mapDimension({
      id: "D1", label: "OD", nominal: 0.5, unit: "in",
      tolerance: { lower: -0.001, upper: 0.002 },
    } as never, 0);
    expect(out!.tolerance).toEqual({ lower: -0.001, upper: 0.002 });
  });

  it("defaults unit to 'in' when missing", () => {
    const out = mapDimension({ id: "D1", label: "OD", nominal: 0.5 } as never, 0);
    expect(out!.unit).toBe("in");
  });

  it("tags sourcePage when provided (multi-page)", () => {
    const out = mapDimension({ id: "D1", label: "OD", nominal: 0.5 } as never, 0, 2);
    expect(out!.sourcePage).toBe(2);
  });

  it("omits sourcePage when not provided (single image, back-compat)", () => {
    const out = mapDimension({ id: "D1", label: "OD", nominal: 0.5 } as never, 0);
    expect(out).not.toHaveProperty("sourcePage");
  });

  it("rejects null + non-object input", () => {
    expect(mapDimension(null as never, 0)).toBeNull();
    expect(mapDimension("not an obj" as never, 0)).toBeNull();
  });
});

describe("mapAnalysisToPrintOcr", () => {
  it("empty analysis -> empty arrays + confidence from title_block", () => {
    const out = mapAnalysisToPrintOcr("/p.png", makeAnalysis({ title_block: { confidence: 0.92 } as never }));
    expect(out.dimensions).toEqual([]);
    expect(out.features).toEqual([]);
    expect(out.ocrConfidence).toBe(0.92);
    expect(out.printPath).toBe("/p.png");
  });

  it("filters non-numeric dims silently", () => {
    const analysis = makeAnalysis({
      dimensions: [
        { id: "D1", label: "OD", nominal: 0.5 } as never,
        { id: "D2", label: "bad", nominal: NaN } as never,
        { id: "D3", label: "len", nominal: 1.0 } as never,
      ],
    });
    const out = mapAnalysisToPrintOcr("/p.png", analysis);
    expect(out.dimensions).toHaveLength(2);
    expect(out.dimensions.map((d) => d.id)).toEqual(["D1", "D3"]);
  });

  it("extracts GD&T frames as gdt:* features", () => {
    const analysis = makeAnalysis({
      gdt_frames: [{ symbol: "position", tolerance_value: 0.005 } as never],
    });
    const out = mapAnalysisToPrintOcr("/p.png", analysis);
    expect(out.features[0].kind).toBe("gdt:position");
    expect(out.features[0].detail).toBe("0.005");
  });

  it("surfaces the FCF verdict on GD&T features (invalid frame -> fcfValid:false + issues + detail marker)", () => {
    const analysis = makeAnalysis({
      gdt_frames: [
        {
          symbol: "position",
          tolerance_value: 0.01,
          fcf_valid: false,
          fcf_issues: ["[error] POSITION_NO_DATUM: Position tolerance requires at least a primary datum"],
        } as never,
        { symbol: "flatness", tolerance_value: 0.02, fcf_valid: true } as never,
      ],
    });
    const out = mapAnalysisToPrintOcr("/p.png", analysis);
    // invalid frame: verdict + issues carried, detail flagged for operator review
    expect(out.features[0].fcfValid).toBe(false);
    expect(out.features[0].fcfIssues?.[0]).toMatch(/POSITION_NO_DATUM/);
    expect(out.features[0].detail).toBe("0.01 -- INVALID FCF");
    // valid frame: verdict carried, no issues, detail unchanged
    expect(out.features[1].fcfValid).toBe(true);
    expect(out.features[1].fcfIssues).toBe(undefined);
    expect(out.features[1].detail).toBe("0.02");
  });

  it("carries advisory issues on a VALID frame too (e.g. PROFILE_WITHOUT_DATUM info) without the INVALID marker", () => {
    const analysis = makeAnalysis({
      gdt_frames: [
        {
          symbol: "profile_surface",
          tolerance_value: 0.1,
          fcf_valid: true,
          fcf_issues: ["[info] PROFILE_WITHOUT_DATUM: Profile without datums controls form only -- confirm intent"],
        } as never,
      ],
    });
    const out = mapAnalysisToPrintOcr("/p.png", analysis);
    expect(out.features[0].fcfValid).toBe(true);
    expect(out.features[0].fcfIssues?.[0]).toMatch(/PROFILE_WITHOUT_DATUM/);
    expect(out.features[0].detail).toBe("0.1"); // valid -> no INVALID marker
  });

  it("leaves fcf fields absent when the frame carries no verdict (unknown symbol / pre-validation)", () => {
    const analysis = makeAnalysis({
      gdt_frames: [{ symbol: "position", tolerance_value: 0.005 } as never],
    });
    const out = mapAnalysisToPrintOcr("/p.png", analysis);
    expect(out.features[0].fcfValid).toBe(undefined);
    expect(out.features[0].fcfIssues).toBe(undefined);
    expect(out.features[0].detail).toBe("0.005");
  });

  it("propagates sourcePage onto mapped dims", () => {
    const analysis = makeAnalysis({ dimensions: [{ label: "OD", nominal: 0.5 } as never] });
    const out = mapAnalysisToPrintOcr("/p.png", analysis, 3);
    expect(out.dimensions[0].sourcePage).toBe(3);
  });
});

describe("unionDimensions", () => {
  it("concatenates dims across pages and re-ids sequentially", () => {
    const p0: PrintDimension[] = [{ id: "x", label: "OD", value: 1, unit: "in", sourcePage: 0 }];
    const p1: PrintDimension[] = [{ id: "y", label: "len", value: 2, unit: "in", sourcePage: 1 }];
    const out = unionDimensions([p0, p1]);
    expect(out).toHaveLength(2);
    expect(out.map((d) => d.id)).toEqual(["DIM-001", "DIM-002"]);
    expect(out[0].sourcePage).toBe(0);
    expect(out[1].sourcePage).toBe(1);
  });

  it("dedups identical dims appearing on multiple pages (label|value|unit)", () => {
    const p0: PrintDimension[] = [{ id: "a", label: "OD", value: 1, unit: "in", sourcePage: 0 }];
    const p1: PrintDimension[] = [{ id: "b", label: "OD", value: 1, unit: "in", sourcePage: 1 }];
    const out = unionDimensions([p0, p1]);
    expect(out).toHaveLength(1);
    expect(out[0].sourcePage).toBe(0); // first occurrence kept
  });

  it("keeps dims that share a label but differ in value", () => {
    const out = unionDimensions([
      [{ id: "a", label: "OD", value: 1, unit: "in" }],
      [{ id: "b", label: "OD", value: 2, unit: "in" }],
    ]);
    expect(out).toHaveLength(2);
  });

  it("handles empty + non-array pages", () => {
    expect(unionDimensions([])).toEqual([]);
    expect(unionDimensions([[], null as never])).toEqual([]);
  });
});

describe("unionFeatures", () => {
  it("dedups identical features by kind|detail and re-ids", () => {
    const f: PrintFeature[] = [
      { id: "1", kind: "gdt:position", detail: "0.005" },
      { id: "2", kind: "gdt:position", detail: "0.005" },
      { id: "3", kind: "hole", detail: "thru" },
    ];
    const out = unionFeatures(f);
    expect(out).toHaveLength(2);
    expect(out.map((x) => x.kind)).toEqual(["gdt:position", "hole"]);
  });
});

describe("CADLiveBlueprintOcrAdapter.ocrPrint -- single image (back-compat)", () => {
  it("happy path with injected analyzer, pages=1", async () => {
    const tmpFile = tmpFileWith(".png", [0x89, 0x50, 0x4e, 0x47]);
    try {
      const eng = new CADLiveBlueprintOcrAdapter();
      const analyzer = fixedAnalyzer(
        makeAnalysis({
          dimensions: [{ id: "D1", label: "OD", nominal: 0.5, unit: "in" } as never],
          title_block: { confidence: 0.91 } as never,
        }),
      );
      const out = await eng.ocrPrint(tmpFile, { analyzer });
      expect(out.printPath).toBe(tmpFile);
      expect(out.dimensions).toHaveLength(1);
      expect(out.dimensions[0].value).toBe(0.5);
      expect(out.ocrConfidence).toBe(0.91);
      expect(out.pagesTotal).toBe(1);
      expect(out.pagesOcrd).toBe(1);
    } finally {
      try { unlinkSync(tmpFile); } catch { /* best-effort */ }
    }
  });

  it("rejects missing file with file-not-found error", async () => {
    const eng = new CADLiveBlueprintOcrAdapter();
    await expect(eng.ocrPrint("/nonexistent/file.png")).rejects.toThrow(/file not found/);
  });

  it("rejects unsupported extension", async () => {
    const eng = new CADLiveBlueprintOcrAdapter();
    await expect(eng.ocrPrint("/jm/print.docx")).rejects.toThrow(/unsupported/);
  });

  it("propagates analyzer errors (single image)", async () => {
    const tmpFile = tmpFileWith(".png", [0x89, 0x50, 0x4e, 0x47]);
    try {
      const eng = new CADLiveBlueprintOcrAdapter();
      const analyzer: BlueprintAnalyzer = { analyzeBlueprint: async () => { throw new Error("vision-api-down"); } };
      await expect(eng.ocrPrint(tmpFile, { analyzer })).rejects.toThrow(/vision-api-down/);
    } finally {
      try { unlinkSync(tmpFile); } catch { /* best-effort */ }
    }
  });
});

describe("CADLiveBlueprintOcrAdapter.ocrPrint -- PDF multi-page (U-PRINT-OCR-PDF)", () => {
  // The core proof: a 3-page bundle where page 0 = cover (0 dims), page 1 =
  // table (0 dims), page 2 = the DRAWING (2 dims). Page-0-only would score 0;
  // all-pages union recovers the drawing's dims.
  function bundleAnalyzer(): BlueprintAnalyzer {
    return perPageAnalyzer({
      0: makeAnalysis({ title_block: { confidence: 0.4 } as never }), // cover, 0 dims
      1: makeAnalysis({ title_block: { confidence: 0.4 } as never }), // table, 0 dims
      2: makeAnalysis({
        dimensions: [
          { id: "D1", label: "OD", nominal: 1.25, unit: "in" } as never,
          { id: "D2", label: "bore", nominal: 0.5, unit: "in" } as never,
        ],
        title_block: { confidence: 0.95 } as never,
      }),
    });
  }

  it("reads ALL pages + unions -- recovers the drawing on page 2 (the page-0-only bug fix)", async () => {
    const pdf = tmpFileWith(".pdf");
    try {
      const eng = new CADLiveBlueprintOcrAdapter();
      const out = await eng.ocrPrint(pdf, {
        analyzer: bundleAnalyzer(),
        rasterizer: fakeRasterizer(3),
      });
      expect(out.pagesTotal).toBe(3);
      expect(out.pagesOcrd).toBe(3);
      expect(out.dimensions).toHaveLength(2);
      expect(out.dimensions.map((d) => d.value).sort()).toEqual([0.5, 1.25]);
      // dims came from page 2 -> sourcePage tagged
      expect(out.dimensions.every((d) => d.sourcePage === 2)).toBe(true);
    } finally {
      try { unlinkSync(pdf); } catch { /* best-effort */ }
    }
  });

  it("honors a single-page override (opts.page)", async () => {
    const pdf = tmpFileWith(".pdf");
    try {
      const eng = new CADLiveBlueprintOcrAdapter();
      const out = await eng.ocrPrint(pdf, {
        analyzer: bundleAnalyzer(),
        rasterizer: fakeRasterizer(3),
        page: 0, // cover only -> 0 dims
      });
      expect(out.pagesTotal).toBe(3);
      expect(out.pagesOcrd).toBe(1);
      expect(out.dimensions).toHaveLength(0);
    } finally {
      try { unlinkSync(pdf); } catch { /* best-effort */ }
    }
  });

  it("reports an honest partial when a page fails to render", async () => {
    const pdf = tmpFileWith(".pdf");
    try {
      const eng = new CADLiveBlueprintOcrAdapter();
      // page 1 render fails (null); 0 + 2 succeed
      const raster = fakeRasterizer(3, (idx) => (idx === 1 ? null : `/fake/raster/p${idx}.png`));
      const out = await eng.ocrPrint(pdf, { analyzer: bundleAnalyzer(), rasterizer: raster });
      expect(out.pagesTotal).toBe(3);
      expect(out.pagesOcrd).toBe(2); // 1 page skipped, surfaced honestly
      expect(out.dimensions).toHaveLength(2); // drawing still recovered
    } finally {
      try { unlinkSync(pdf); } catch { /* best-effort */ }
    }
  });

  it("throws when ZERO pages can be rendered", async () => {
    const pdf = tmpFileWith(".pdf");
    try {
      const eng = new CADLiveBlueprintOcrAdapter();
      const raster = fakeRasterizer(3, () => null); // every page fails
      await expect(eng.ocrPrint(pdf, { analyzer: bundleAnalyzer(), rasterizer: raster })).rejects.toThrow(/extracted 0 pages/);
    } finally {
      try { unlinkSync(pdf); } catch { /* best-effort */ }
    }
  });

  it("throws when the page count is unreadable", async () => {
    const pdf = tmpFileWith(".pdf");
    try {
      const eng = new CADLiveBlueprintOcrAdapter();
      const raster: PdfRasterizer = {
        pageCount: () => { throw new Error("PyMuPDF: corrupt"); },
        renderPage: () => null,
      };
      await expect(eng.ocrPrint(pdf, { analyzer: bundleAnalyzer(), rasterizer: raster })).rejects.toThrow(/could not read page count/);
    } finally {
      try { unlinkSync(pdf); } catch { /* best-effort */ }
    }
  });

  it("throws when page count resolves to zero (no valid pages)", async () => {
    const pdf = tmpFileWith(".pdf");
    try {
      const eng = new CADLiveBlueprintOcrAdapter();
      await expect(
        eng.ocrPrint(pdf, { analyzer: bundleAnalyzer(), rasterizer: fakeRasterizer(0) }),
      ).rejects.toThrow(/no valid pages/);
    } finally {
      try { unlinkSync(pdf); } catch { /* best-effort */ }
    }
  });

  it("throws when the analyzer fails on EVERY page (pagesOcrd 0)", async () => {
    const pdf = tmpFileWith(".pdf");
    try {
      const eng = new CADLiveBlueprintOcrAdapter();
      const analyzer: BlueprintAnalyzer = { analyzeBlueprint: async () => { throw new Error("vision-down"); } };
      await expect(
        eng.ocrPrint(pdf, { analyzer, rasterizer: fakeRasterizer(3) }),
      ).rejects.toThrow(/extracted 0 pages/);
    } finally {
      try { unlinkSync(pdf); } catch { /* best-effort */ }
    }
  });

  it("caps pages at maxPages on a large bundle", async () => {
    const pdf = tmpFileWith(".pdf");
    try {
      const eng = new CADLiveBlueprintOcrAdapter();
      const out = await eng.ocrPrint(pdf, {
        analyzer: fixedAnalyzer(makeAnalysis()),
        rasterizer: fakeRasterizer(40),
        maxPages: 5,
      });
      expect(out.pagesTotal).toBe(40);
      expect(out.pagesOcrd).toBe(5); // only the first 5 OCR'd
    } finally {
      try { unlinkSync(pdf); } catch { /* best-effort */ }
    }
  });
});

describe("sanitizeLiveOcrAdapterOptions (untrusted dispatcher params guard)", () => {
  it("clamps maxPages to [1, 12]", () => {
    expect(sanitizeLiveOcrAdapterOptions({ maxPages: 9999 })).toEqual({ maxPages: 12 });
    expect(sanitizeLiveOcrAdapterOptions({ maxPages: 0 })).toEqual({ maxPages: 1 });
    expect(sanitizeLiveOcrAdapterOptions({ maxPages: -5 })).toEqual({ maxPages: 1 });
    expect(sanitizeLiveOcrAdapterOptions({ maxPages: 7 })).toEqual({ maxPages: 7 });
  });

  it("clamps dpi to [72, 600] (DoS guard against huge rasters)", () => {
    expect(sanitizeLiveOcrAdapterOptions({ dpi: 100000 })).toEqual({ dpi: 600 });
    expect(sanitizeLiveOcrAdapterOptions({ dpi: 10 })).toEqual({ dpi: 72 });
    expect(sanitizeLiveOcrAdapterOptions({ dpi: 300 })).toEqual({ dpi: 300 });
  });

  it("accepts an explicit non-negative page but never defaults one (all-pages stays default)", () => {
    expect(sanitizeLiveOcrAdapterOptions({ page: 2 })).toEqual({ page: 2 });
    expect(sanitizeLiveOcrAdapterOptions({ page: -1 })).toEqual({}); // negative dropped -> all-pages
    expect(sanitizeLiveOcrAdapterOptions({})).toEqual({}); // no page -> all-pages default holds
  });

  it("validates blueprintType against its enum (drops garbage)", () => {
    expect(sanitizeLiveOcrAdapterOptions({ blueprintType: "milling" })).toEqual({ blueprintType: "milling" });
    expect(sanitizeLiveOcrAdapterOptions({ blueprintType: "evil" })).toEqual({}); // garbage dropped entirely
  });

  it("validates expectedUnits and coerces booleans only", () => {
    expect(sanitizeLiveOcrAdapterOptions({ expectedUnits: "mm" })).toEqual({ expectedUnits: "mm" });
    expect(sanitizeLiveOcrAdapterOptions({ expectedUnits: "furlongs" })).toEqual({});
    expect(sanitizeLiveOcrAdapterOptions({ preprocess: true })).toEqual({ preprocess: true });
    expect(sanitizeLiveOcrAdapterOptions({ preprocess: "yes" })).toEqual({}); // non-boolean dropped
  });

  it("NEVER forwards analyzer or rasterizer from untrusted input (injection guard)", () => {
    const out = sanitizeLiveOcrAdapterOptions({
      analyzer: { analyzeBlueprint: async () => ({}) },
      rasterizer: { pageCount: () => 1, renderPage: () => "x" },
      maxPages: 3,
    });
    // Only the clamped maxPages survives -- analyzer + rasterizer stripped.
    expect(out).toEqual({ maxPages: 3 });
  });

  it("accepts snake_case keys + returns {} for non-object input", () => {
    expect(sanitizeLiveOcrAdapterOptions({ max_pages: 4, blueprint_type: "turning", expected_units: "inch" }))
      .toEqual({ maxPages: 4, blueprintType: "turning", expectedUnits: "inch" });
    expect(sanitizeLiveOcrAdapterOptions(null)).toEqual({});
    expect(sanitizeLiveOcrAdapterOptions("garbage")).toEqual({});
  });
});

describe("singleton + curry helper", () => {
  it("singleton is the engine class", () => {
    expect(cadLiveBlueprintOcrAdapter).toBeInstanceOf(CADLiveBlueprintOcrAdapter);
  });

  it("makeLiveOcrPrintFn returns a usable curried fn", () => {
    const fn = makeLiveOcrPrintFn({ blueprintType: "milling" });
    expect(typeof fn).toBe("function");
  });
});
