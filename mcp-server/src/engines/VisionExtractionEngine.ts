/**
 * VisionExtractionEngine — INTEL-OLLAMA-OBSIDIAN-MS0/P21-U01
 *
 * Thin wrapper around Ollama's llama3.2-vision:11b for image + text
 * understanding. Routes:
 *   - image input (PNG/JPG/PDF rendered to image) → llama3.2-vision:11b
 *   - text-only input → qwen2.5-coder:7b (no vision overhead)
 *
 * Exposed via prism_dev:vision_extract.
 *
 * Pure-function exports for tests:
 *   - normalizeInput(path)             → { kind, path, ok } | null
 *   - selectModel(kind, opts)          → { model, reason }
 *   - encodeImageToBase64(bytes)       → string (data: URL stripped)
 *   - buildOllamaRequest(model, prompt, imageB64?) → request body object
 *   - parseOllamaResponse(body)        → { text, ok, error? }
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P21-U01
 */

import * as fs from "node:fs";
import { Buffer } from "node:buffer";

// ============================================================================
// TYPES
// ============================================================================

export type InputKind = "image" | "pdf" | "text" | "unknown";

export interface NormalizedInput {
  kind: InputKind;
  path: string;
  ok: boolean;
  reason?: string;
}

export interface VisionRequest {
  /** Absolute or repo-relative path to the input file */
  path?: string;
  /** Or: pass raw bytes (test-friendly) */
  bytes?: Uint8Array;
  /** Hint kind explicitly (skips auto-detect) */
  kind?: InputKind;
  /** Prompt the vision/text model with this question */
  prompt: string;
  /** Override model (else routed by kind) */
  model?: string;
  /** Ollama host override */
  host?: string;
}

export interface VisionResult {
  ok: boolean;
  text?: string;
  model: string;
  kind: InputKind;
  durationMs: number;
  error?: string;
  ts: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VISION_MODEL_DEFAULT = "llama3.2-vision:11b";
const TEXT_MODEL_DEFAULT = "qwen2.5-coder:7b";
const OLLAMA_HOST_DEFAULT = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"]);
const PDF_EXTS = new Set([".pdf"]);
const TEXT_EXTS = new Set([".txt", ".md", ".csv", ".json", ".yaml", ".yml"]);

// ============================================================================
// PURE LOGIC (exported for tests)
// ============================================================================

/**
 * Detect input kind from a file path's extension. Returns null on
 * unknown / non-string. The .ok flag distinguishes "kind detected" from
 * "kind detected as unknown" — both return non-null but only ok=true
 * means the engine should attempt extraction.
 */
export function normalizeInput(path: unknown): NormalizedInput | null {
  if (typeof path !== "string" || path.trim().length === 0) return null;
  const trimmed = path.trim();
  const lower = trimmed.toLowerCase();
  // Pull the extension; defensive against paths without one
  const dotIdx = lower.lastIndexOf(".");
  if (dotIdx === -1) {
    return { kind: "unknown", path: trimmed, ok: false, reason: "no extension" };
  }
  const ext = lower.slice(dotIdx);
  if (IMAGE_EXTS.has(ext)) return { kind: "image", path: trimmed, ok: true };
  if (PDF_EXTS.has(ext))   return { kind: "pdf", path: trimmed, ok: true };
  if (TEXT_EXTS.has(ext))  return { kind: "text", path: trimmed, ok: true };
  return { kind: "unknown", path: trimmed, ok: false, reason: `unsupported extension: ${ext}` };
}

/**
 * Pick the right Ollama model for an input kind.
 *   - image / pdf → llama3.2-vision:11b
 *   - text → qwen2.5-coder:7b
 *   - unknown → fallback to text model (caller decides whether to attempt)
 *
 * `opts.modelOverride` always wins. `opts.forceText` collapses to the
 * text model regardless of kind (e.g. when llama3.2-vision isn't pulled).
 */
export function selectModel(
  kind: InputKind,
  opts?: { modelOverride?: string; forceText?: boolean },
): { model: string; reason: string } {
  if (opts?.modelOverride) return { model: opts.modelOverride, reason: "override" };
  if (opts?.forceText) return { model: TEXT_MODEL_DEFAULT, reason: "forceText" };
  if (kind === "image" || kind === "pdf") {
    return { model: VISION_MODEL_DEFAULT, reason: `vision route for ${kind}` };
  }
  if (kind === "text") return { model: TEXT_MODEL_DEFAULT, reason: "text route" };
  return { model: TEXT_MODEL_DEFAULT, reason: "unknown kind, fallback to text" };
}

/**
 * Base64 encode raw image bytes. Ollama's /api/generate accepts images as
 * raw base64 (no data: URL prefix). Strips a leading data: prefix if the
 * caller passes one inadvertently.
 */
export function encodeImageToBase64(bytes: Uint8Array | string): string {
  if (typeof bytes === "string") {
    // strip data: prefix if present
    const m = bytes.match(/^data:[^;]+;base64,(.+)$/);
    if (m) return m[1];
    return bytes;
  }
  if (bytes instanceof Uint8Array) {
    return Buffer.from(bytes).toString("base64");
  }
  return "";
}

/**
 * Build an Ollama /api/generate request body. When imageB64 is present
 * the model is invoked in vision mode (the `images` array is what the
 * server uses to choose the multimodal pipeline).
 */
export function buildOllamaRequest(model: string, prompt: string, imageB64?: string): Record<string, unknown> {
  const body: Record<string, unknown> = { model, prompt, stream: false };
  if (typeof imageB64 === "string" && imageB64.length > 0) {
    body.images = [imageB64];
  }
  return body;
}

/**
 * Parse an Ollama /api/generate response body into our envelope.
 * Tolerates undefined / partial responses; returns ok=false when the
 * shape doesn't carry a string `response` field.
 */
export function parseOllamaResponse(body: unknown): { text: string; ok: boolean; error?: string } {
  if (!body || typeof body !== "object") {
    return { text: "", ok: false, error: "non-object response" };
  }
  const r = body as Record<string, unknown>;
  if (typeof r.response !== "string") {
    return { text: "", ok: false, error: "missing 'response' field" };
  }
  return { text: r.response, ok: true };
}

// ============================================================================
// I/O LAYER
// ============================================================================

export class VisionExtractionEngine {
  /**
   * Run extraction. The engine refuses to invoke the vision model unless
   * the input clearly is image-shaped; for unknown / unsupported kinds it
   * returns ok=false with a structured envelope.
   */
  async extract(req: VisionRequest): Promise<VisionResult> {
    const start = Date.now();
    const ts = new Date().toISOString();

    if (typeof req?.prompt !== "string" || req.prompt.length === 0) {
      return { ok: false, model: "", kind: "unknown", durationMs: Date.now() - start, ts, error: "prompt is required" };
    }

    let kind: InputKind = req.kind ?? "unknown";
    let imageB64: string | undefined;

    if (req.bytes && req.bytes.length > 0) {
      // Caller supplied bytes directly (test-friendly path)
      kind = req.kind ?? "image";
      imageB64 = encodeImageToBase64(req.bytes);
    } else if (typeof req.path === "string") {
      // Caller passed `path` — even an empty string is an explicit signal
      // that they meant to supply a path. Empty/whitespace is invalid.
      const norm = normalizeInput(req.path);
      if (!norm) {
        return { ok: false, model: "", kind: "unknown", durationMs: Date.now() - start, ts, error: "invalid path" };
      }
      if (!norm.ok) {
        return { ok: false, model: "", kind: norm.kind, durationMs: Date.now() - start, ts, error: norm.reason };
      }
      kind = norm.kind;
      // Read bytes for image kinds; PDF paths are handed off as-is to the
      // vision model (which currently does NOT accept multi-page PDFs as
      // a single payload — caller's responsibility to render to image first).
      if (kind === "image") {
        try {
          const raw = fs.readFileSync(req.path);
          imageB64 = encodeImageToBase64(new Uint8Array(raw));
        } catch (e) {
          return { ok: false, model: "", kind, durationMs: Date.now() - start, ts, error: `read failed: ${(e as Error).message}` };
        }
      } else if (kind === "pdf") {
        return {
          ok: false,
          model: VISION_MODEL_DEFAULT,
          kind,
          durationMs: Date.now() - start,
          ts,
          error: "pdf input must be rendered to image first; this engine takes single images. Use the batch-processor (P13-U03) for multi-page PDFs.",
        };
      }
    }

    const { model } = selectModel(kind, { modelOverride: req.model });
    const host = (req.host ?? OLLAMA_HOST_DEFAULT).replace(/\/+$/, "");
    const requestBody = buildOllamaRequest(model, req.prompt, imageB64);

    try {
      const r = await fetch(`${host}/api/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!r.ok) {
        return {
          ok: false, model, kind, durationMs: Date.now() - start, ts,
          error: `ollama /api/generate http ${r.status}`,
        };
      }
      const json = await r.json();
      const parsed = parseOllamaResponse(json);
      return {
        ok: parsed.ok,
        text: parsed.text,
        model,
        kind,
        durationMs: Date.now() - start,
        ts,
        error: parsed.ok ? undefined : parsed.error,
      };
    } catch (e) {
      return {
        ok: false, model, kind, durationMs: Date.now() - start, ts,
        error: `ollama unreachable: ${(e as Error).message}`,
      };
    }
  }
}

export const visionExtractionEngine = new VisionExtractionEngine();
