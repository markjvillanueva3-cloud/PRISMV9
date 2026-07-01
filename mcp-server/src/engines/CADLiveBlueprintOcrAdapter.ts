/**
 * CADLiveBlueprintOcrAdapter -- CAD-DRAW-MAX-MS1/U-PRINT-OCR-LIVE
 *                            -- BLUEPRINT-VISION-OCR/U-PRINT-OCR-PDF (PDF + multi-page, 2026-06-19)
 *
 * Live adapter wiring the existing {@link BlueprintVisionOCREngine} (free
 * Ollama-first llmEngine.queryVision powered) as the `ocrPrint` dependency of
 * the round-trip validation engine, and the engine behind the
 * `cad_live_blueprint_ocr` dispatcher action.
 *
 * Maps `ExtractedDimension[]` (from BlueprintVisionOCREngine) ->
 * `PrintDimension[]` (the round-trip engine's expected shape). Preserves
 * dimension ids, labels, nominal values, and asymmetric tolerances.
 *
 * **Hermetic-testable via injectable analyzer + rasterizer.** Default uses the
 * `blueprintVisionOCREngine` singleton (which calls the vision ladder live) and
 * the `defaultPdfRasterizer` (shells the canonical `scripts/lib/pdf-to-png.py`);
 * tests inject a stub analyzer + stub rasterizer (no subprocess, no GPU).
 *
 * Pipeline (single image):
 *   printPath -> analyzeBlueprint() -> BlueprintAnalysis -> mapDimensions() -> PrintOcrResult
 *
 * Pipeline (PDF / multi-page raster doc -- U-PRINT-OCR-PDF):
 *   printPath -> rasterize ALL pages (cap MAX_PRINT_PAGES) -> analyzeBlueprint() per page
 *             -> UNION dims/features across pages -> PrintOcrResult{pagesTotal,pagesOcrd}
 *
 *   WHY all-pages: JM Die / Docustrata bundles are commonly MULTI-PAGE (a
 *   cover / BOM / table / routing page first, the actual DRAWING on a LATER
 *   page). The prior v1 fail-loud-on-PDF behavior meant the live MCP OCR path
 *   could not read prints at all; a page-0-only reader would have read the
 *   cover and silently MISSED the drawing (the operator's "missed dimensions"
 *   class). Union is additive -- recall can only rise (more pages read). This
 *   mirrors the grinder (blueprint-ocr-training-loop.mjs rasterizePrintPages)
 *   and validate-perfect-parts (rasterAllPages) all-pages discipline.
 *
 *   This assumes ONE print per file (xray split-before-OCR doctrine handles
 *   multi-PRINT containers upstream). A genuine multi-print container should be
 *   split first; here we union pages of a single part.
 *
 * **Image format support:** PNG / JPEG / WebP / GIF (single image, one page) +
 * PDF / TIFF (rasterized all-pages via PyMuPDF). Other extensions fail-loud.
 *
 * Refs: BlueprintVisionOCREngine (Ollama-first vision); scripts/lib/pdf-to-png.py
 *       (PyMuPDF rasterizer); CADRoundTripValidationEngine (ocrPrint consumer).
 */
import { extname, join, basename, dirname, resolve } from "node:path";
import { existsSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import type {
  PrintOcrResult,
  PrintDimension,
  PrintFeature,
} from "./CADRoundTripValidationEngine.js";
import type {
  BlueprintVisionInput,
  BlueprintVisionResult,
} from "./BlueprintVisionOCREngine.js";
import { blueprintVisionOCREngine } from "./BlueprintVisionOCREngine.js";
import type {
  ExtractedDimension,
} from "./BlueprintOCREngine.js";

// -- Constants ----------------------------------------------------------------
/** Single-image formats: one file = one page, sent straight to the analyzer. */
const SUPPORTED_IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
/** Raster-document formats: rasterized all-pages via pdf-to-png.py (PyMuPDF). */
const RASTERIZABLE_DOC_EXTS = new Set([".pdf", ".tif", ".tiff"]);
/** Page cap for a single multi-page print (mirrors the grinder MAX_PRINT_PAGES). */
const DEFAULT_MAX_PAGES = 12;
/** Default rasterization DPI (mirrors the grinder + validate-perfect-parts). */
const DEFAULT_DPI = 300;
/** DPI clamp range for untrusted callers (sane raster bounds; DoS guard). */
const MIN_DPI = 72;
const MAX_DPI = 600;

// -- Types --------------------------------------------------------------------
export interface BlueprintAnalyzer {
  analyzeBlueprint(input: BlueprintVisionInput): Promise<BlueprintVisionResult>;
}

/**
 * Rasterizes a multi-page raster document (PDF/TIFF) to per-page PNGs.
 * Injectable so tests run hermetically (no python subprocess, no GPU).
 */
export interface PdfRasterizer {
  /** Page count of the document. Throws on an unreadable / malformed file. */
  pageCount(docPath: string): number;
  /**
   * Render one 0-based page to a PNG on disk. Returns the PNG path, or null if
   * that single page failed to render (the caller skips it and continues).
   */
  renderPage(docPath: string, pageIndex: number, opts?: { dpi?: number; preprocess?: boolean }): string | null;
}

export interface LiveOcrAdapterOptions {
  /** Blueprint type hint for prompt engineering (default: "general"). */
  blueprintType?: "wire_edm" | "milling" | "turning" | "general";
  /** Expected units (helps Vision focus, auto-detected if omitted). */
  expectedUnits?: "mm" | "inch";
  /** Extract 2D profile geometry contours (default false). */
  extractGeometry?: boolean;
  /** Inject analyzer for hermetic tests (default = blueprintVisionOCREngine). */
  analyzer?: BlueprintAnalyzer;
  /** Inject rasterizer for hermetic tests (default = defaultPdfRasterizer). */
  rasterizer?: PdfRasterizer;
  /** Cap pages OCR'd for a multi-page print (default DEFAULT_MAX_PAGES = 12). */
  maxPages?: number;
  /** Force a single 0-based page (back-compat); omit = ALL pages. */
  page?: number;
  /** Rasterization DPI (default DEFAULT_DPI = 300). */
  dpi?: number;
  /** Apply scan binarize/denoise preprocessing during raster (default false). */
  preprocess?: boolean;
}

// -- Pure helpers -------------------------------------------------------------
/**
 * Classify a print path. Pure; exported for tests.
 *   - SUPPORTED_IMAGE_EXTS  -> {ok:true, kind:"image"}      (one page, direct)
 *   - RASTERIZABLE_DOC_EXTS -> {ok:true, kind:"raster-doc"} (PDF/TIFF, all-pages)
 *   - anything else / empty -> {ok:false, reason}
 */
export function classifyPrintPath(
  p: string,
): { ok: true; kind: "image" | "raster-doc" } | { ok: false; reason: string } {
  if (typeof p !== "string" || p.length === 0) {
    return { ok: false, reason: "printPath must be a non-empty string" };
  }
  const ext = extname(p).toLowerCase();
  if (SUPPORTED_IMAGE_EXTS.has(ext)) return { ok: true, kind: "image" };
  if (RASTERIZABLE_DOC_EXTS.has(ext)) return { ok: true, kind: "raster-doc" };
  return {
    ok: false,
    reason: `unsupported extension ${ext} -- supported images: ${[...SUPPORTED_IMAGE_EXTS].join(", ")}; raster docs: ${[...RASTERIZABLE_DOC_EXTS].join(", ")}`,
  };
}

/**
 * Which 0-based page indices to OCR. Pure; exported for tests.
 * Default = ALL pages capped at maxPages (the multi-page union default).
 * An explicit opts.page forces a single page (back-compat) iff in range.
 */
export function selectPdfPageIndices(
  pageCount: number,
  opts: { page?: number; maxPages?: number } = {},
): number[] {
  const n = Number.isFinite(pageCount) && pageCount > 0 ? Math.floor(pageCount) : 0;
  if (n === 0) return [];
  if (opts.page != null && Number.isFinite(opts.page)) {
    const p = Math.floor(opts.page);
    return p >= 0 && p < n ? [p] : [];
  }
  let pages = Array.from({ length: n }, (_, i) => i);
  const cap =
    Number.isFinite(opts.maxPages) && (opts.maxPages as number) > 0
      ? Math.floor(opts.maxPages as number)
      : pages.length;
  if (pages.length > cap) pages = pages.slice(0, cap);
  return pages;
}

/**
 * Map a single ExtractedDimension -> PrintDimension. Pure; exported for tests.
 * Returns null if the dim has no usable nominal value (filtered upstream).
 * `sourcePage` (0-based) is tagged onto the result when provided (multi-page).
 */
export function mapDimension(
  ed: ExtractedDimension,
  idx: number,
  sourcePage?: number,
): PrintDimension | null {
  if (!ed || typeof ed !== "object") return null;
  const value = Number(ed.nominal);
  if (!Number.isFinite(value)) return null;
  const id = ed.id ?? `DIM-${String(idx + 1).padStart(3, "0")}`;
  const label = ed.location_hint ?? ed.type ?? `dim-${idx + 1}`;
  const out: PrintDimension = {
    id,
    label,
    value,
    unit: ed.unit ?? "in",
  };
  // Map asymmetric tolerance bands when present
  if (ed.tolerance && typeof ed.tolerance === "object") {
    const lower = Number(ed.tolerance.lower);
    const upper = Number(ed.tolerance.upper);
    if (Number.isFinite(lower) && Number.isFinite(upper)) {
      out.tolerance = { lower, upper };
    }
  }
  if (typeof sourcePage === "number" && Number.isFinite(sourcePage)) {
    out.sourcePage = sourcePage;
  }
  return out;
}

/**
 * Map BlueprintAnalysis -> PrintOcrResult. Pure; exported for tests.
 * Filters out non-numeric dimensions (they would fail the match anyway with
 * non-finite values). `sourcePage` tags every dim when provided (multi-page).
 */
export function mapAnalysisToPrintOcr(
  printPath: string,
  analysis: BlueprintVisionResult,
  sourcePage?: number,
): PrintOcrResult {
  const dims: PrintDimension[] = [];
  if (Array.isArray(analysis.dimensions)) {
    for (let i = 0; i < analysis.dimensions.length; i++) {
      const mapped = mapDimension(analysis.dimensions[i], i, sourcePage);
      if (mapped) dims.push(mapped);
    }
  }
  // Pull features from extracted profiles (geometry) + GD&T callouts
  const features: PrintFeature[] = [];
  if (Array.isArray(analysis.profiles)) {
    for (const prof of analysis.profiles) {
      if (!prof || typeof prof !== "object") continue;
      features.push({
        id: prof.id ?? `PROF-${features.length + 1}`,
        kind: prof.type ?? "profile",
        detail: prof.name,
      });
    }
  }
  if (Array.isArray(analysis.gdt_frames)) {
    for (let i = 0; i < analysis.gdt_frames.length; i++) {
      const g = analysis.gdt_frames[i];
      if (!g || typeof g !== "object") continue;
      const baseDetail = g.tolerance_value != null ? String(g.tolerance_value) : undefined;
      // Surface the ASME FCF verdict (U-XRAY-GDT-FCF-VALIDATE) into the operator-facing MCP
      // output instead of dropping it: an invalid frame (e.g. a position/runout/concentricity
      // callout missing its required datum) is marked so a consumer can route it to review.
      // Informational only -- no numeric/cost field is changed. Absent verdict (unknown symbol)
      // preserves the prior shape exactly.
      const invalid = g.fcf_valid === false;
      const feature: PrintFeature = {
        id: `GDT-${i + 1}`,
        kind: `gdt:${g.symbol ?? "unknown"}`,
      };
      if (typeof g.fcf_valid === "boolean") feature.fcfValid = g.fcf_valid;
      // Carry ALL issues, not just on invalid frames: the validator also emits advisory
      // warning/info issues on otherwise-valid frames (e.g. PROFILE_WITHOUT_DATUM) -- dropping
      // those would be the same verdict-loss this unit fixes, narrowed to the advisory tier.
      if (Array.isArray(g.fcf_issues) && g.fcf_issues.length > 0) {
        feature.fcfIssues = g.fcf_issues;
      }
      const detail = invalid ? (baseDetail ? `${baseDetail} -- INVALID FCF` : "INVALID FCF") : baseDetail;
      if (detail !== undefined) feature.detail = detail;
      features.push(feature);
    }
  }
  return {
    printPath,
    dimensions: dims,
    features,
    ocrConfidence: analysis.title_block?.confidence,
  };
}

/**
 * Union per-page PrintDimension lists into one deduped list. Pure; exported
 * for tests. Dedup key = label|value|unit (a dim repeated across pages -- e.g.
 * a thumbnail + the full drawing -- collapses to one). Re-ids sequentially
 * (DIM-001..) since per-page ids collide. Preserves the first occurrence's
 * tolerance + sourcePage.
 */
export function unionDimensions(perPage: PrintDimension[][]): PrintDimension[] {
  const seen = new Set<string>();
  const out: PrintDimension[] = [];
  for (const pageDims of perPage) {
    if (!Array.isArray(pageDims)) continue;
    for (const d of pageDims) {
      if (!d) continue;
      const key = `${d.label}|${d.value}|${d.unit ?? "in"}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...d, id: `DIM-${String(out.length + 1).padStart(3, "0")}` });
    }
  }
  return out;
}

/**
 * Union per-page features into one deduped list. Pure; exported for tests.
 * Dedup key = kind|detail. Re-ids sequentially.
 */
export function unionFeatures(features: PrintFeature[]): PrintFeature[] {
  const seen = new Set<string>();
  const out: PrintFeature[] = [];
  for (const f of features) {
    if (!f) continue;
    const key = `${f.kind}|${f.detail ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...f, id: f.id ?? `FEAT-${out.length + 1}` });
  }
  return out;
}

/**
 * Sanitize untrusted dispatcher params into LiveOcrAdapterOptions. Pure;
 * exported for tests. The `cad_live_blueprint_ocr` MCP action has no Zod schema
 * and forwards raw client params -- this is the guard:
 *   - validates blueprintType/expectedUnits against their enums (drops garbage);
 *   - coerces extractGeometry/preprocess to booleans only;
 *   - clamps maxPages to [1, DEFAULT_MAX_PAGES] and dpi to [MIN_DPI, MAX_DPI]
 *     (DoS guard -- a client cannot raster 9999 pages at 100000 dpi);
 *   - accepts an explicit non-negative `page` (back-compat single-page) but
 *     NEVER defaults to one, so the safe all-pages default always holds;
 *   - NEVER forwards `analyzer` / `rasterizer` (test-injection only -- an
 *     untrusted caller must not be able to swap the OCR engine or rasterizer).
 * Accepts both camelCase and snake_case keys.
 */
export function sanitizeLiveOcrAdapterOptions(raw: unknown): LiveOcrAdapterOptions {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: LiveOcrAdapterOptions = {};

  const bt = r.blueprintType ?? r.blueprint_type;
  if (bt === "wire_edm" || bt === "milling" || bt === "turning" || bt === "general") {
    out.blueprintType = bt;
  }
  const eu = r.expectedUnits ?? r.expected_units;
  if (eu === "mm" || eu === "inch") out.expectedUnits = eu;

  const eg = r.extractGeometry ?? r.extract_geometry;
  if (typeof eg === "boolean") out.extractGeometry = eg;
  if (typeof r.preprocess === "boolean") out.preprocess = r.preprocess;

  const mp = Number(r.maxPages ?? r.max_pages);
  if (Number.isFinite(mp)) out.maxPages = Math.min(Math.max(Math.floor(mp), 1), DEFAULT_MAX_PAGES);

  const pg = Number(r.page);
  if (Number.isFinite(pg) && pg >= 0) out.page = Math.floor(pg);

  const dpi = Number(r.dpi);
  if (Number.isFinite(dpi)) out.dpi = Math.min(Math.max(Math.floor(dpi), MIN_DPI), MAX_DPI);

  return out;
}

// -- Default rasterizer (shells the canonical pdf-to-png.py) -------------------
/** Portable python (matches PartFolderOrganizerEngine convention). */
function pythonBin(): string {
  return process.env.PRISM_PYTHON || "H:/Tools/python/python.exe";
}

let _pdfToPngScript: string | null = null;
/**
 * Resolve the canonical scripts/lib/pdf-to-png.py path. Env override first,
 * then the known host path, then a module-relative fallback. Cached.
 */
function resolvePdfToPngScript(): string {
  if (_pdfToPngScript) return _pdfToPngScript;
  const env = process.env.PRISM_PDF_TO_PNG;
  if (env && existsSync(env)) return (_pdfToPngScript = env);
  const hostPath = "H:/prism/scripts/lib/pdf-to-png.py";
  if (existsSync(hostPath)) return (_pdfToPngScript = hostPath);
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const rel = resolve(here, "../../../scripts/lib/pdf-to-png.py");
    if (existsSync(rel)) return (_pdfToPngScript = rel);
  } catch {
    /* import.meta unavailable under some bundlers -- fall through */
  }
  // Return the host path even if absent so the spawn error names it clearly.
  return (_pdfToPngScript = hostPath);
}

let _rasterSeq = 0;
/**
 * Production rasterizer: shells scripts/lib/pdf-to-png.py (PyMuPDF). Renders
 * grayscale by default (matches the grinder); `preprocess` adds Otsu binarize
 * + line-safe despeckle for scans. R12: throws on an unreadable page count;
 * returns null for a single failed page (caller skips + counts it).
 */
export const defaultPdfRasterizer: PdfRasterizer = {
  pageCount(docPath: string): number {
    const r = spawnSync(pythonBin(), [resolvePdfToPngScript(), docPath, "--count"], {
      encoding: "utf8",
      timeout: 60_000,
      windowsHide: true,
    });
    if (r.status !== 0) {
      throw new Error(
        `pdf-to-png --count exit=${r.status} ${(r.stderr || "").toString().trim().slice(0, 200)}`,
      );
    }
    const n = parseInt(String(r.stdout || "").trim(), 10);
    if (!Number.isFinite(n) || n < 1) {
      throw new Error(`pdf-to-png --count parse failed: "${String(r.stdout || "").slice(0, 80)}"`);
    }
    return n;
  },
  renderPage(docPath: string, pageIndex: number, opts: { dpi?: number; preprocess?: boolean } = {}): string | null {
    const dpi = opts.dpi ?? DEFAULT_DPI;
    const safe = basename(docPath).replace(/[^\w.-]/g, "_");
    const out = join(tmpdir(), `prism-ocr-${safe}-p${pageIndex}-${process.pid}-${_rasterSeq++}.png`);
    const args = [
      resolvePdfToPngScript(),
      docPath,
      out,
      "--dpi",
      String(dpi),
      "--page",
      String(pageIndex),
      "--grayscale",
    ];
    if (opts.preprocess) args.push("--preprocess");
    const r = spawnSync(pythonBin(), args, { encoding: "utf8", timeout: 180_000, windowsHide: true });
    if (r.status === 0 && existsSync(out)) return out;
    return null;
  },
};

// -- Engine -------------------------------------------------------------------
export class CADLiveBlueprintOcrAdapter {
  /**
   * Live OCR entry point -- satisfies the `ocrPrint` contract of
   * CADRoundTripValidationEngine + backs the `cad_live_blueprint_ocr` action.
   *
   * Single image (.png/.jpg/...): one analyze call (back-compat, unchanged).
   * Raster doc (.pdf/.tif): rasterize ALL pages (cap maxPages), analyze each,
   * UNION the dims/features. Reports pagesTotal/pagesOcrd for honest partials.
   *
   * Fails-loud (throws) when:
   *   - printPath is empty / unsupported extension
   *   - printPath does not exist on disk
   *   - a PDF's page count is unreadable, or no valid page indices resolve
   *   - ZERO pages of a multi-page doc could be OCR'd (nothing extracted)
   *   - (single image) the analyzer throws
   */
  async ocrPrint(printPath: string, opts: LiveOcrAdapterOptions = {}): Promise<PrintOcrResult> {
    const classified = classifyPrintPath(printPath);
    if (!classified.ok) {
      throw new Error(`ocrPrint: ${classified.reason}`);
    }
    if (!existsSync(printPath)) {
      throw new Error(`ocrPrint: file not found at ${printPath}`);
    }
    const analyzer = opts.analyzer ?? blueprintVisionOCREngine;
    const visionOpts = {
      expected_units: opts.expectedUnits,
      blueprint_type: opts.blueprintType ?? "general",
      extract_geometry: opts.extractGeometry ?? false,
    } as const;

    // -- Single image: direct, one page (back-compat) --
    if (classified.kind === "image") {
      const result = await analyzer.analyzeBlueprint({
        image: { type: "file", path: printPath },
        ...visionOpts,
      });
      const mapped = mapAnalysisToPrintOcr(printPath, result);
      return { ...mapped, pagesTotal: 1, pagesOcrd: 1 };
    }

    // -- Raster doc (PDF/TIFF): rasterize all pages, OCR each, union --
    const rasterizer = opts.rasterizer ?? defaultPdfRasterizer;
    const dpi = opts.dpi ?? DEFAULT_DPI;
    const maxPages = opts.maxPages ?? DEFAULT_MAX_PAGES;
    const preprocess = opts.preprocess ?? false;

    let pageCount: number;
    try {
      pageCount = rasterizer.pageCount(printPath);
    } catch (e) {
      throw new Error(`ocrPrint: could not read page count of ${printPath}: ${(e as Error).message}`);
    }
    const pageIdxs = selectPdfPageIndices(pageCount, { page: opts.page, maxPages });
    if (pageIdxs.length === 0) {
      throw new Error(
        `ocrPrint: no valid pages to render in ${printPath} (pageCount=${pageCount}, page=${opts.page ?? "all"})`,
      );
    }

    const renderedPngs: string[] = [];
    const perPageDims: PrintDimension[][] = [];
    const perPageFeatures: PrintFeature[] = [];
    const confidences: number[] = [];
    let pagesOcrd = 0;
    let lastErr: Error | null = null;

    try {
      for (const idx of pageIdxs) {
        let png: string | null = null;
        try {
          png = rasterizer.renderPage(printPath, idx, { dpi, preprocess });
        } catch (e) {
          lastErr = e as Error;
          png = null;
        }
        if (!png) continue;
        renderedPngs.push(png);
        try {
          const analysis = await analyzer.analyzeBlueprint({
            image: { type: "file", path: png },
            ...visionOpts,
          });
          const mapped = mapAnalysisToPrintOcr(printPath, analysis, idx);
          perPageDims.push(mapped.dimensions as PrintDimension[]);
          for (const f of mapped.features) perPageFeatures.push(f);
          if (typeof mapped.ocrConfidence === "number") confidences.push(mapped.ocrConfidence);
          pagesOcrd++;
        } catch (e) {
          lastErr = e as Error;
        }
      }
    } finally {
      for (const p of renderedPngs) {
        try {
          unlinkSync(p);
        } catch {
          /* best-effort temp cleanup */
        }
      }
    }

    if (pagesOcrd === 0) {
      throw new Error(
        `ocrPrint: extracted 0 pages from ${printPath} ` +
          `(rendered ${renderedPngs.length}/${pageIdxs.length} of ${pageCount})` +
          (lastErr ? `: ${lastErr.message}` : ""),
      );
    }

    const dimensions = unionDimensions(perPageDims);
    const features = unionFeatures(perPageFeatures);
    const ocrConfidence =
      confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : undefined;

    return {
      printPath,
      dimensions,
      features,
      ocrConfidence,
      pagesTotal: pageCount,
      pagesOcrd,
    };
  }
}

export const cadLiveBlueprintOcrAdapter = new CADLiveBlueprintOcrAdapter();

/**
 * Convenience: a curried `ocrPrint` matching the RoundTripDependencies
 * contract exactly. Use in production by passing this directly as the
 * `ocrPrint` dep.
 */
export function makeLiveOcrPrintFn(opts: LiveOcrAdapterOptions = {}) {
  return (printPath: string) => cadLiveBlueprintOcrAdapter.ocrPrint(printPath, opts);
}
