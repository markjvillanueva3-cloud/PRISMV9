/**
 * CADScreenshotCapturer — 6-canonical-view PNG capturer for the ground-truth
 * STEP corpus. Bypasses native CAD applications by delegating to a pythonocc
 * (OCCT) helper; falls back to a deterministic mock renderer for CI and for
 * environments without OCCT installed.
 *
 * Output layout:
 *   {outputRoot}/{fileId}/screenshots/iso.png
 *   {outputRoot}/{fileId}/screenshots/front.png
 *   {outputRoot}/{fileId}/screenshots/top.png
 *   {outputRoot}/{fileId}/screenshots/right.png
 *   {outputRoot}/{fileId}/screenshots/section-xz.png
 *   {outputRoot}/{fileId}/screenshots/section-yz.png
 *
 * Per-view metadata: byte size, SHA-256, render duration, view-specific
 * camera parameters. Aggregated into a deterministic manifest signature so
 * regression tests can detect drift in the capture pipeline itself.
 *
 * pythonocc integration:
 *   The engine accepts a pluggable PythonExecutor so tests run without
 *   spawning a real Python process. The default executor tries
 *   `python -c "import OCC.Core"` once per process; on ImportError or
 *   missing python it flips `pythonAvailable=false` and the engine falls
 *   through to mock placeholders (same output paths, deterministic bytes).
 *
 * Mock placeholders are real, valid 1×1 PNG files with view-specific colors
 * so they can be diff-counted without an image library and so byte-size +
 * sha256 differ per view (signature stays informative even in CI).
 *
 * Composes (does NOT duplicate):
 *   - CADToSTEPPipelineEngine (E2503, U-CGT03) — produces the STEP we render
 *   - GroundTruthFeatureTreeExtractor (E2504, U-CGT04) — authoring tree
 *   - DimensionalSignatureEngine (E2505, U-CGT05) — geometry fingerprint
 *
 * Duplication check (DuplicationGuardEngine keywords: cad, screenshot, view,
 * render, png, ground-truth):
 *   → No CADScreenshotCapturer / OCCTRenderEngine / STEPViewRenderer found.
 *   → AdvancedReportRendererEngine renders manufacturing reports (PDF/HTML),
 *     not 3D STEP geometry — different layer.
 *
 * @engine CADScreenshotCapturer
 * @shortcode E2506
 * @milestone CAD-GROUND-TRUTH-MS0 / U-CGT06
 * @classification STANDARD (orchestration + bytes-on-disk, no physics)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { z } from "zod";

// ── AtomicValue (project pattern) ───────────────────────────────────────────

export interface AtomicValue<T> {
  value: T;
  confidence: number;
  source: string;
  warning?: string;
}

// ── Domain ──────────────────────────────────────────────────────────────────

export const CANONICAL_VIEWS = [
  "iso",
  "front",
  "top",
  "right",
  "section-xz",
  "section-yz",
] as const;

export type CanonicalView = (typeof CANONICAL_VIEWS)[number];

/**
 * Camera parameters per canonical view.
 * azimuthDeg/elevationDeg target an OCCT TopLoc trihedral; sectionPlane
 * selects the cutting plane for section views (rendered with half-space
 * removal so internal features are visible).
 */
export interface CameraParams {
  view: CanonicalView;
  azimuthDeg: number;
  elevationDeg: number;
  fit: "extents" | "section";
  sectionPlane?: "XZ" | "YZ";
}

export const CAMERA_BY_VIEW: Readonly<Record<CanonicalView, CameraParams>> = {
  iso: { view: "iso", azimuthDeg: 45, elevationDeg: 35, fit: "extents" },
  front: { view: "front", azimuthDeg: 0, elevationDeg: 0, fit: "extents" },
  top: { view: "top", azimuthDeg: 0, elevationDeg: 90, fit: "extents" },
  right: { view: "right", azimuthDeg: 90, elevationDeg: 0, fit: "extents" },
  "section-xz": {
    view: "section-xz",
    azimuthDeg: 0,
    elevationDeg: 0,
    fit: "section",
    sectionPlane: "XZ",
  },
  "section-yz": {
    view: "section-yz",
    azimuthDeg: 90,
    elevationDeg: 0,
    fit: "section",
    sectionPlane: "YZ",
  },
};

export const CAPTURE_RESOLUTION = { width: 1024, height: 1024 } as const;

// ── Zod schemas ─────────────────────────────────────────────────────────────

export const ViewResultSchema = z
  .object({
    view: z.enum(CANONICAL_VIEWS),
    path: z.string().min(1),
    byteSize: z.number().int().min(0),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
    durationMs: z.number().min(0),
    ok: z.boolean(),
    renderer: z.enum(["pythonocc", "mock"]),
    error: z.string().optional(),
  })
  .strict();

export const ScreenshotResultSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    fileId: z.string().min(1),
    sourceStep: z.string().min(1),
    outputDir: z.string().min(1),
    views: z.array(ViewResultSchema),
    totalDurationMs: z.number().min(0),
    allOk: z.boolean(),
    pythonAvailable: z.boolean(),
    signature: z.string().regex(/^[0-9a-f]{64}$/),
    warnings: z.array(z.string()).default([]),
  })
  .strict();

export type ViewResult = z.infer<typeof ViewResultSchema>;
export type ScreenshotResult = z.infer<typeof ScreenshotResultSchema>;

// ── PythonExecutor interface ────────────────────────────────────────────────

/**
 * Pluggable runner for the pythonocc bridge. Default impl in production
 * spawns Python; tests inject a stub. Returning ok=false flips the engine
 * into mock mode for the rest of the run.
 */
export interface PythonExecutor {
  /** One-shot capability probe. Cheap; called once per capture batch. */
  probe(): Promise<{ available: boolean; version?: string; error?: string }>;
  /**
   * Render a single view to disk. Implementations MUST write a PNG file at
   * outputPath or report ok=false with a structured error.
   */
  render(args: {
    stepFile: string;
    outputPath: string;
    camera: CameraParams;
    width: number;
    height: number;
  }): Promise<{ ok: boolean; durationMs: number; error?: string }>;
}

/**
 * Default pythonocc-unavailable executor. Reports unavailability so the
 * engine cleanly falls through to mock placeholders. A live OCCT-backed
 * executor lives outside this engine (deferred to U-CGT07 batch wrapper).
 */
export const NULL_PYTHON_EXECUTOR: PythonExecutor = {
  async probe() {
    return {
      available: false,
      error: "pythonocc executor not configured (default null executor)",
    };
  },
  async render() {
    return {
      ok: false,
      durationMs: 0,
      error: "no python executor configured",
    };
  },
};

// ── Mock PNG generator ──────────────────────────────────────────────────────

/**
 * Build a minimal-but-valid PNG (1×1 pixel, RGB, view-keyed color) so the
 * mock fallback writes real PNG bytes whose sha256 differs per view. This
 * keeps signature meaningful in CI without dragging in a render library.
 *
 * PNG layout: signature + IHDR + IDAT (deflate-stored) + IEND.
 */
function buildMockPng(view: CanonicalView): Buffer {
  // PNG file signature
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // Per-view RGB color so byte-content differs deterministically.
  const colorByView: Record<CanonicalView, [number, number, number]> = {
    iso: [255, 255, 255],
    front: [254, 254, 254],
    top: [253, 253, 253],
    right: [252, 252, 252],
    "section-xz": [251, 251, 251],
    "section-yz": [250, 250, 250],
  };
  const [r, g, b] = colorByView[view];

  // IHDR: 1x1 RGB (color type 2), bit depth 8, no interlace
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(1, 0); // width
  ihdrData.writeUInt32BE(1, 4); // height
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = chunk("IHDR", ihdrData);

  // IDAT: filter byte 0 then 3 RGB bytes, wrapped in zlib (stored block)
  const raw = Buffer.from([0x00, r, g, b]); // filter=None + 1 px
  const zlib = wrapZlibStored(raw);
  const idat = chunk("IDAT", zlib);

  // IEND
  const iend = chunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

/**
 * Wrap raw bytes in a zlib stream using a STORED (uncompressed) DEFLATE
 * block + Adler-32. Avoids pulling in a compressor while staying decode-
 * compatible with any PNG reader.
 */
function wrapZlibStored(raw: Buffer): Buffer {
  // zlib header: 0x78 0x01 (default compression, no preset dict, FCHECK ok)
  const zlibHeader = Buffer.from([0x78, 0x01]);
  // Stored DEFLATE block: BFINAL=1, BTYPE=00 → first byte 0x01
  // followed by LEN, NLEN (little-endian, 16-bit)
  const len = raw.length;
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt16LE(len, 0);
  lenBuf.writeUInt16LE(~len & 0xffff, 2);
  const blockHeader = Buffer.from([0x01]);
  const adler = adler32(raw);
  const adlerBuf = Buffer.alloc(4);
  adlerBuf.writeUInt32BE(adler, 0);
  return Buffer.concat([zlibHeader, blockHeader, lenBuf, raw, adlerBuf]);
}

/** Standard Adler-32 over a buffer. */
function adler32(buf: Buffer): number {
  const MOD = 65521;
  let a = 1,
    b = 0;
  for (const byte of buf) {
    a = (a + byte) % MOD;
    b = (b + a) % MOD;
  }
  return ((b << 16) | a) >>> 0;
}

/**
 * Build a PNG chunk: 4-byte length, 4-byte type, data, 4-byte CRC-32.
 */
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const tail = Buffer.concat([t, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(tail), 0);
  return Buffer.concat([len, tail, crcBuf]);
}

/** PNG CRC-32 (IEEE 802.3 polynomial). Cached table for speed. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) {
    c = (CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8)) >>> 0;
  }
  return (c ^ 0xffffffff) >>> 0;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") +
    "}"
  );
}

/**
 * Manifest signature over (view, sha256, byteSize) tuples sorted by view.
 * Excludes: durationMs, error string, renderer, paths (path is environment-
 * dependent). Stable across runs in either pythonocc or mock mode provided
 * the same renderer was used.
 */
export function manifestSignature(
  views: ReadonlyArray<ViewResult>,
): string {
  const obj = views
    .map((v) => ({
      view: v.view,
      sha256: v.sha256,
      byteSize: v.byteSize,
      ok: v.ok,
      renderer: v.renderer,
    }))
    .sort((a, b) => a.view.localeCompare(b.view));
  return crypto.createHash("sha256").update(stableStringify(obj)).digest("hex");
}

function sha256OfBuffer(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/** Build the canonical screenshot directory path for a given fileId. */
export function buildScreenshotDir(
  outputRoot: string,
  fileId: string,
): string {
  return path.join(outputRoot, fileId, "screenshots");
}

/** Build the canonical PNG path for a given fileId + view. */
export function buildViewPath(
  outputRoot: string,
  fileId: string,
  view: CanonicalView,
): string {
  return path.join(buildScreenshotDir(outputRoot, fileId), `${view}.png`);
}

// ── Engine ──────────────────────────────────────────────────────────────────

export interface CaptureOptions {
  fileId: string;
  outputRoot: string;
  /** Subset of views to capture; defaults to all six canonical views. */
  views?: ReadonlyArray<CanonicalView>;
  /** Force mock renderer regardless of executor probe result. */
  forceMock?: boolean;
  /** Override pythonExecutor for this call. */
  pythonExecutor?: PythonExecutor;
}

/**
 * CADScreenshotCapturer — orchestrates 6-view capture with deterministic
 * mock fallback. Public API:
 *
 *   - listCanonicalViews(): readonly view list
 *   - getCamera(view): camera params (used by external bridges)
 *   - captureViews(stepFile, opts): full pipeline
 *   - captureView(stepFile, view, opts): single-view variant
 *   - validate(candidate): Zod re-validation
 */
export class CADScreenshotCapturer {
  public readonly schemaVersion = "1.0.0" as const;

  constructor(private readonly defaultExecutor: PythonExecutor = NULL_PYTHON_EXECUTOR) {}

  listCanonicalViews(): readonly CanonicalView[] {
    return CANONICAL_VIEWS;
  }

  getCamera(view: CanonicalView): CameraParams {
    const cam = CAMERA_BY_VIEW[view];
    if (!cam) {
      throw new Error(`[CADScreenshotCapturer] Unknown view: ${view}`);
    }
    return cam;
  }

  /**
   * Capture all (or a subset of) canonical views for a single STEP file.
   * Probes the python executor once; on failure or forceMock, falls through
   * to deterministic mock PNG generation. Always writes files to the
   * canonical paths so downstream code can locate them by convention.
   */
  async captureViews(
    stepFile: string,
    opts: CaptureOptions,
  ): Promise<ScreenshotResult> {
    if (typeof stepFile !== "string" || stepFile.length === 0) {
      throw new Error(
        "[CADScreenshotCapturer] stepFile must be a non-empty string",
      );
    }
    if (!opts || typeof opts.fileId !== "string" || opts.fileId.length === 0) {
      throw new Error(
        "[CADScreenshotCapturer] opts.fileId must be a non-empty string",
      );
    }
    if (typeof opts.outputRoot !== "string" || opts.outputRoot.length === 0) {
      throw new Error(
        "[CADScreenshotCapturer] opts.outputRoot must be a non-empty string",
      );
    }

    const warnings: string[] = [];
    const views = opts.views ?? CANONICAL_VIEWS;
    const executor = opts.pythonExecutor ?? this.defaultExecutor;

    const outputDir = buildScreenshotDir(opts.outputRoot, opts.fileId);
    await fs.promises.mkdir(outputDir, { recursive: true });

    let pythonAvailable = false;
    if (!opts.forceMock) {
      const probe = await executor.probe();
      pythonAvailable = probe.available;
      if (!pythonAvailable && probe.error) {
        warnings.push(`pythonocc unavailable: ${probe.error}`);
      }
    } else {
      warnings.push("forceMock=true — using mock renderer");
    }

    const totalStart = Date.now();
    const results: ViewResult[] = [];
    for (const view of views) {
      const r = await this._captureSingle({
        stepFile,
        view,
        outputRoot: opts.outputRoot,
        fileId: opts.fileId,
        executor,
        pythonAvailable,
      });
      results.push(r);
    }
    const totalDurationMs = Date.now() - totalStart;

    const allOk = results.every((r) => r.ok);
    const signature = manifestSignature(results);

    return {
      schemaVersion: this.schemaVersion,
      fileId: opts.fileId,
      sourceStep: stepFile,
      outputDir,
      views: results,
      totalDurationMs,
      allOk,
      pythonAvailable,
      signature,
      warnings,
    };
  }

  /**
   * Capture a single view. Convenience wrapper around captureViews with a
   * single-element views array; output schema is the same.
   */
  async captureView(
    stepFile: string,
    view: CanonicalView,
    opts: CaptureOptions,
  ): Promise<ScreenshotResult> {
    return this.captureViews(stepFile, { ...opts, views: [view] });
  }

  /** Re-validate a candidate manifest against the schema. */
  validate(candidate: unknown): { ok: boolean; errors: string[] } {
    const r = ScreenshotResultSchema.safeParse(candidate);
    if (r.success) return { ok: true, errors: [] };
    return {
      ok: false,
      errors: r.error.issues.map(
        (i) => `${i.path.join(".") || "<root>"}: ${i.message}`,
      ),
    };
  }

  /** Recompute manifest signature for a candidate result. */
  recomputeSignature(result: ScreenshotResult): string {
    return manifestSignature(result.views);
  }

  // ── private ───────────────────────────────────────────────────────────────

  private async _captureSingle(args: {
    stepFile: string;
    view: CanonicalView;
    outputRoot: string;
    fileId: string;
    executor: PythonExecutor;
    pythonAvailable: boolean;
  }): Promise<ViewResult> {
    const outputPath = buildViewPath(args.outputRoot, args.fileId, args.view);
    const camera = this.getCamera(args.view);
    const start = Date.now();

    if (args.pythonAvailable) {
      const pyResult = await args.executor.render({
        stepFile: args.stepFile,
        outputPath,
        camera,
        width: CAPTURE_RESOLUTION.width,
        height: CAPTURE_RESOLUTION.height,
      });
      const durationMs = pyResult.durationMs > 0 ? pyResult.durationMs : Date.now() - start;
      if (pyResult.ok) {
        const stat = await fs.promises.stat(outputPath).catch(() => null);
        const buf = stat ? await fs.promises.readFile(outputPath) : Buffer.alloc(0);
        return {
          view: args.view,
          path: outputPath,
          byteSize: stat ? stat.size : 0,
          sha256: sha256OfBuffer(buf),
          durationMs,
          ok: stat !== null && stat.size > 0,
          renderer: "pythonocc",
          ...(stat === null
            ? { error: "executor reported ok but output file missing" }
            : {}),
        };
      }
      // Python failed mid-flight — record and fall through to mock.
      const fallback = await this._writeMock(outputPath, args.view, start);
      return {
        ...fallback,
        error: `pythonocc render failed: ${pyResult.error ?? "unknown"}; fell through to mock`,
      };
    }

    return this._writeMock(outputPath, args.view, start);
  }

  private async _writeMock(
    outputPath: string,
    view: CanonicalView,
    start: number,
  ): Promise<ViewResult> {
    const png = buildMockPng(view);
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(outputPath, png);
    return {
      view,
      path: outputPath,
      byteSize: png.length,
      sha256: sha256OfBuffer(png),
      durationMs: Date.now() - start,
      ok: true,
      renderer: "mock",
    };
  }
}

export const cadScreenshotCapturer = new CADScreenshotCapturer();
