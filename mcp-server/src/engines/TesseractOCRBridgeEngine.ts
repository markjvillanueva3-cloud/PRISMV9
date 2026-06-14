/**
 * TesseractOCRBridgeEngine — U-QP-TESS-OCR (Axis J)
 *
 * Operator-stated (verbatim): "make sure the entire quoting feature is phone
 * friendly so salesmen can take pictures of prints and physical parts for
 * instant accurate quoting."
 *
 * Provider-agnostic OCR bridge. Browser side: tesseract.js worker. Node
 * server side: tesseract.js (Node bindings) OR pluggable Azure CV / AWS
 * Textract adapter. Engine PURE in the sense that all I/O is delegated to
 * an injected adapter — the engine itself is composition + result-shaping.
 *
 * The contract this engine guarantees:
 *   - OCR returns structured {text, confidence, boundingBoxes, tokens} —
 *     never raw vendor-specific shapes
 *   - Pre-OCR validation: image-size check (>50KB hint quality, <10MB safety)
 *   - Post-OCR routing hint: hands off to CameraIntakeRouterEngine for
 *     classification (blueprint vs insert-box vs tag vs physical part)
 *   - Adapter slot is the only I/O surface — engine + tests work with mock
 *     adapter, real adapter wired at runtime by the React mobile page +
 *     server Express route
 *
 * Adapter shape (caller-injected):
 *   - performOCR(image: Uint8Array, opts) → Promise<RawOCRResult>
 *   - Errors propagate; engine wraps with ok:false + reason
 *
 * @milestone QUOTING-COMPLETENESS-MS0/U-QP-TESS-OCR
 * @author slot:charlie /goal-20 iter7, 2026-05-25
 */

export interface RawOCRResult {
  text: string;
  confidence?: number;
  /** Per-word bounding boxes for tolerance-callout extraction. */
  words?: Array<{ text: string; confidence: number; bbox?: { x0: number; y0: number; x1: number; y1: number } }>;
  /** Provider identifier — tesseract, azure-cv, aws-textract, mock. */
  provider?: string;
}

export interface OCRAdapter {
  performOCR(image: Uint8Array, opts?: { language?: string; psm?: number }): Promise<RawOCRResult>;
  name: string;
}

export interface OCRBridgeInput {
  /** Raw image bytes (jpeg/png). */
  image: Uint8Array;
  /** Language hint (default: 'eng' — many JM Die customers are US/UK/Canadian English). */
  language?: string;
  /** Tesseract page-segmentation mode (default 6 = single-column block). */
  psm?: number;
  /** Auto-classify after OCR via CameraIntakeRouter (default true). */
  autoClassify?: boolean;
  /** Adapter override (default uses module-level adapter). */
  adapter?: OCRAdapter;
}

export interface OCRBridgeResult {
  ok: boolean;
  reason?: string;
  text: string;
  confidence: number;
  word_count: number;
  high_confidence_word_ratio: number;
  provider: string;
  raw_words?: RawOCRResult["words"];
  /** Optional classification when autoClassify=true. */
  classification?: { kind: string; confidence: number };
  /** Validation warnings (size hints, low-confidence, etc). */
  warnings: string[];
}

const MIN_IMAGE_BYTES = 1024;        // 1KB — below this is almost certainly broken
const QUALITY_HINT_BYTES = 50 * 1024; // 50KB — below this is low-fidelity capture
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB safety cap
const HIGH_CONF_WORD_THRESHOLD = 0.7; // word-level confidence ≥0.7 considered high

let _defaultAdapter: OCRAdapter | null = null;

/** Install the runtime OCR adapter (tesseract.js, azure-cv, etc.). Required before first use unless caller injects per-call. */
export function setDefaultOCRAdapter(adapter: OCRAdapter | null): void {
  _defaultAdapter = adapter;
}

export class TesseractOCRBridgeEngine {
  /**
   * Perform OCR + optional classification. Returns a normalized result.
   *
   * Fail-loud:
   *   - No adapter → ok:false + reason
   *   - Image too small/large → ok:false + reason
   *   - Adapter throws → ok:false + reason; never silent
   */
  async ocr(input: OCRBridgeInput): Promise<OCRBridgeResult> {
    const empty: OCRBridgeResult = {
      ok: false, text: "", confidence: 0, word_count: 0,
      high_confidence_word_ratio: 0, provider: "none", warnings: [],
    };

    const adapter = input.adapter ?? _defaultAdapter;
    if (!adapter) {
      return { ...empty, reason: "no-ocr-adapter-installed — call setDefaultOCRAdapter() or pass adapter per call" };
    }

    if (!(input.image instanceof Uint8Array)) {
      return { ...empty, reason: "image must be Uint8Array" };
    }
    if (input.image.byteLength < MIN_IMAGE_BYTES) {
      return { ...empty, reason: `image too small (${input.image.byteLength} bytes < ${MIN_IMAGE_BYTES})` };
    }
    if (input.image.byteLength > MAX_IMAGE_BYTES) {
      return { ...empty, reason: `image too large (${input.image.byteLength} bytes > ${MAX_IMAGE_BYTES} cap)` };
    }

    const warnings: string[] = [];
    if (input.image.byteLength < QUALITY_HINT_BYTES) {
      warnings.push(`image is small (${input.image.byteLength} bytes < ${QUALITY_HINT_BYTES} quality hint) — OCR may misread small text`);
    }

    let raw: RawOCRResult;
    try {
      raw = await adapter.performOCR(input.image, { language: input.language ?? "eng", psm: input.psm ?? 6 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ...empty, reason: `ocr-adapter-threw: ${msg}` };
    }

    if (!raw || typeof raw.text !== "string") {
      return { ...empty, reason: "ocr-adapter-returned-invalid-shape", provider: adapter.name };
    }

    const text = raw.text;
    const confidence = typeof raw.confidence === "number" && Number.isFinite(raw.confidence)
      ? Math.max(0, Math.min(1, raw.confidence)) : 0;
    const words = raw.words ?? [];
    const wordCount = words.length;
    const highConfCount = words.filter(w => w.confidence >= HIGH_CONF_WORD_THRESHOLD).length;
    const highConfRatio = wordCount > 0 ? round4(highConfCount / wordCount) : 0;

    if (confidence > 0 && confidence < 0.5) {
      warnings.push(`overall OCR confidence ${confidence.toFixed(2)} — operator should review extracted text`);
    }
    if (wordCount > 0 && highConfRatio < 0.6) {
      warnings.push(`only ${(highConfRatio * 100).toFixed(0)}% of words are high-confidence — image quality marginal`);
    }

    const result: OCRBridgeResult = {
      ok: true,
      text,
      confidence,
      word_count: wordCount,
      high_confidence_word_ratio: highConfRatio,
      provider: raw.provider ?? adapter.name,
      raw_words: words,
      warnings,
    };

    // Optional classification hop — lazy import to keep cold-start cheap
    if (input.autoClassify !== false && text.trim().length > 0) {
      try {
        const { cameraIntakeRouterEngine } = await import("./CameraIntakeRouterEngine.js");
        const classification = cameraIntakeRouterEngine.classify({
          text,
          ocrConfidence: confidence,
        } as any);
        if (classification && typeof classification === "object") {
          const cls = classification as any;
          if (typeof cls.kind === "string" || typeof cls.classification === "string") {
            result.classification = {
              kind: String(cls.kind ?? cls.classification),
              confidence: Number(cls.confidence ?? confidence),
            };
          }
        }
      } catch {
        // Classification failure is non-fatal — OCR result still ships
        result.warnings.push("auto-classify failed silently — OCR text returned without classification");
      }
    }

    return result;
  }

  /** Get the installed adapter name (or null when none). */
  getAdapterName(): string | null {
    return _defaultAdapter?.name ?? null;
  }

  /** True when an adapter is installed and ready. */
  isReady(): boolean {
    return _defaultAdapter !== null;
  }
}

function round4(n: number): number { return Math.round(n * 10000) / 10000; }

export const tesseractOCRBridgeEngine = new TesseractOCRBridgeEngine();
export default tesseractOCRBridgeEngine;
