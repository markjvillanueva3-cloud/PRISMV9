// scripts/lib/pdf-vision-ocr-lib.mjs
//
// U-TDP11 — Local vision-OCR tier for scanned engineering prints.
//
// The deterministic embedded-text extractor (pdf-text-extract-lib.mjs,
// U-TDP07..U-TDP10) only reads PDFs that carry a usable text layer. A
// full-corpus harvest of JM DIE/_PART LIBRARY (76,163 PDFs) measured that
// ~90% are scanned-image PDFs whose OCR text layer is absent or garbled —
// a hard ceiling for text parsing.
//
// This lib is the SECOND tier: a rendered page image → local Ollama vision
// model (qwen2.5vl:7b) → structured dimensions. It costs ZERO Claude tokens
// (the model runs on the local GPU) so it can be pointed at the bulk
// corpus. Output mirrors pdf-text-extract-lib's `extraction` shape so the
// two tiers are interchangeable in a cascade:
//   tier 1  pdf-text-extract-lib   (deterministic, embedded text, free)
//   tier 2  pdf-vision-ocr-lib     (local qwen2.5vl, rendered image, free)
//   tier 3  BlueprintVisionOCREngine (Claude Vision, high-accuracy, paid)
//
// PURE CORE + INJECTED I/O: buildVisionPrompt / parseVisionResponse are
// pure; extractViaVision takes an injected `httpPostImpl` so the orchestrator
// is hermetically testable without a live Ollama daemon.
//
// R12: every failure path returns { success:false } or an empty extraction —
// the lib NEVER throws and NEVER fabricates a dimension from un-parseable
// model output. A missed dim beats a hallucinated one.

const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
const DEFAULT_VISION_MODEL = "qwen2.5vl:7b";
// Vision inference is slow (≈80 s warm, ≈210 s cold for an 8B model on a
// memory-pressured host). The orchestrator timeout must clear a cold load.
const DEFAULT_TIMEOUT_MS = 300_000;
const DEFAULT_NUM_PREDICT = 600;
// Plausible engineering-dimension magnitude window (mm OR inch — the lib is
// unit-agnostic, the drawing's own unit applies). Anything outside is a
// mis-read serial / page number / scale ratio → dropped (R12).
const NOMINAL_MIN = 0.0001;
const NOMINAL_MAX = 10_000;
// A tolerance is a small band; a "tolerance" ≥ this is a mis-parsed nominal.
const TOLERANCE_MAX = 100;

// Confidence ladder — vision OCR is inherently less certain than a
// deterministic text parse, so even a clean read caps below the text tier's
// CONF_TOL_HIGH (0.95). Tuned conservative: the cascade prefers tier-1 text
// when both fire.
const CONF_VISION_NONE = 0.10;
const CONF_VISION_LOW = 0.55;
const CONF_VISION_MED = 0.70;
const CONF_VISION_HIGH = 0.82;
const CONF_TOL_THRESHOLD_HIGH = 4;
const CONF_TOL_THRESHOLD_MED = 2;

/**
 * Build the vision-extraction prompt. Kept deterministic (pure) so the
 * prompt is test-pinnable. `units` nudges the model; `partType` lets the
 * caller bias the read toward a known domain.
 */
export function buildVisionPrompt(opts = {}) {
  const units = opts.units === "inch" || opts.units === "mm" ? opts.units : null;
  const unitLine = units
    ? `The drawing is dimensioned in ${units}. `
    : "Auto-detect the unit system (mm or inch). ";
  return [
    "You are reading a scanned manufacturing blueprint / engineering drawing.",
    unitLine +
      "Extract EVERY dimension, tolerance, material spec, hardness, and surface finish you can read.",
    "Respond with ONLY a JSON object, no commentary, in exactly this shape:",
    '{"dimensions":[{"nominal":<number>,"tolerance":<number or null>,"kind":"linear|diameter|radius|angle"}],' +
      '"material":<string or null>,"hardness":<string or null>,"surface_finish":<string or null>,"units":"mm|inch|null"}',
    "Rules: nominal is the numeric value only. tolerance is the symmetric ± band as a positive number, or null if none.",
    "If a value is unreadable or you are unsure, OMIT it — never guess. An omitted dimension is better than a wrong one.",
  ].join("\n");
}

/**
 * Coerce a model-supplied nominal to a finite positive number in the
 * plausible engineering range, or null. Accepts number or numeric string;
 * rejects "DIA.", "", null, NaN, out-of-range.
 */
function parseNominal(raw) {
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw >= NOMINAL_MIN && raw <= NOMINAL_MAX
      ? raw
      : null;
  }
  if (typeof raw !== "string") return null;
  // Strip a leading ø/Ø/R/diameter glyph and whitespace, keep the number.
  const m = raw.trim().match(/-?\d*\.?\d+/);
  if (!m) return null;
  const v = Number(m[0]);
  return Number.isFinite(v) && v >= NOMINAL_MIN && v <= NOMINAL_MAX ? v : null;
}

/**
 * Coerce a model-supplied tolerance to a positive number or null. Accepts
 * number, "0.005", "±.005", "+/-.005", "+/-0,005" (EU comma). A 0 or
 * out-of-range value → null (recorded as untoleranced, never fabricated).
 */
function parseToleranceValue(raw) {
  if (raw == null) return null;
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 0 && raw <= TOLERANCE_MAX
      ? raw
      : null;
  }
  if (typeof raw !== "string") return null;
  // EU comma → dot; strip ± / +/- / leading sign noise; take the magnitude.
  const cleaned = raw.replace(/,/g, ".");
  const m = cleaned.match(/\d*\.?\d+/);
  if (!m) return null;
  const tok = m[0].startsWith(".") ? "0" + m[0] : m[0];
  const v = Number(tok);
  return Number.isFinite(v) && v > 0 && v <= TOLERANCE_MAX ? v : null;
}

/** Canonical dimension kinds the vision tier emits. */
const VISION_KINDS = new Set(["linear", "diameter", "radius", "angle"]);

/**
 * Pull the first balanced JSON object out of a model response. Vision
 * models wrap output in ```json fences and sometimes add commentary —
 * this finds the first `{`, walks to its matching `}`, and returns the
 * slice. Returns null when no balanced object exists.
 */
function extractJsonBlock(text) {
  if (typeof text !== "string") return null;
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Parse a raw vision-model response into a BlueprintExtraction-shape
 * object compatible with pdf-text-extract-lib. Fail-soft: any parse
 * failure yields an empty extraction (success:true, dimensions:[]), never
 * a throw. `model` is recorded for provenance.
 */
export function parseVisionResponse(rawText, opts = {}) {
  const model = typeof opts.model === "string" ? opts.model : DEFAULT_VISION_MODEL;
  const emptyExtraction = () => ({
    confidence: CONF_VISION_NONE,
    dimensions: [],
    material: null,
    surface_treatment: null,
    hardness_grade: null,
    surface_roughness_ra_um: null,
    units: null,
    source: "vision-ocr",
    model,
  });

  if (typeof rawText !== "string" || !rawText.trim()) {
    return { success: false, error: "empty vision response", extraction: emptyExtraction() };
  }
  const block = extractJsonBlock(rawText);
  if (!block) {
    return { success: false, error: "no JSON object in vision response", extraction: emptyExtraction() };
  }
  let obj;
  try {
    obj = JSON.parse(block);
  } catch {
    return { success: false, error: "malformed JSON in vision response", extraction: emptyExtraction() };
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return { success: false, error: "vision JSON is not an object", extraction: emptyExtraction() };
  }

  const dimensions = [];
  const rawDims = Array.isArray(obj.dimensions) ? obj.dimensions : [];
  for (const d of rawDims) {
    if (!d || typeof d !== "object" || Array.isArray(d)) continue;
    const nominal = parseNominal(d.nominal);
    if (nominal == null) continue; // garbage nominal ("DIA.", "") → drop
    const kindRaw = typeof d.kind === "string" ? d.kind.toLowerCase().trim() : "";
    const kind = VISION_KINDS.has(kindRaw) ? kindRaw : "linear";
    const tol = parseToleranceValue(d.tolerance);
    const dim = {
      kind,
      nominal,
      meta: { type: kind, format: "vision-ocr", source: "vision-ocr" },
    };
    if (tol != null) {
      dim.tolerance = { upper: +Math.abs(tol), lower: -Math.abs(tol) };
    }
    dimensions.push(dim);
  }

  const strOrNull = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const material = strOrNull(obj.material);
  const hardness = strOrNull(obj.hardness);
  const surface = strOrNull(obj.surface_finish);
  const units = obj.units === "mm" || obj.units === "inch" ? obj.units : null;

  // Confidence: scales with the count of toleranced dims, capped below the
  // deterministic tier (vision is inherently noisier).
  const tolCount = dimensions.filter((d) => d.tolerance).length;
  let confidence;
  if (dimensions.length === 0) confidence = CONF_VISION_NONE;
  else if (tolCount >= CONF_TOL_THRESHOLD_HIGH) confidence = CONF_VISION_HIGH;
  else if (tolCount >= CONF_TOL_THRESHOLD_MED) confidence = CONF_VISION_MED;
  else confidence = CONF_VISION_LOW;

  return {
    success: true,
    error: null,
    extraction: {
      confidence,
      dimensions,
      material,
      surface_treatment: surface,
      hardness_grade: hardness,
      surface_roughness_ra_um: null,
      units,
      source: "vision-ocr",
      model,
    },
  };
}

/**
 * Default HTTP POST against the Ollama /api/generate endpoint. Returns the
 * parsed `.response` string, or throws — the orchestrator wraps the throw.
 * Uses global fetch (Node ≥18). Tests inject their own httpPostImpl.
 */
async function defaultHttpPost(url, body, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`ollama HTTP ${resp.status}`);
    const json = await resp.json();
    return typeof json.response === "string" ? json.response : "";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Orchestrate one vision-OCR extraction: base64 PNG → Ollama qwen2.5vl →
 * parsed BlueprintExtraction. Fail-soft — a daemon error / timeout / bad
 * response yields { success:false } with an empty extraction, never a throw.
 *
 * @param {object} args
 * @param {string} args.imageBase64  base64-encoded PNG of the rendered page
 * @param {string} [args.model]      Ollama vision model (default qwen2.5vl:7b)
 * @param {string} [args.ollamaUrl]  Ollama base URL
 * @param {"mm"|"inch"} [args.units] unit hint for the prompt
 * @param {number} [args.timeoutMs]  request timeout
 * @param {Function} [args.httpPostImpl]  injected (url,body,timeoutMs)=>Promise<string>
 */
export async function extractViaVision(args = {}) {
  const imageBase64 = args.imageBase64;
  if (typeof imageBase64 !== "string" || !imageBase64) {
    return {
      success: false,
      error: "no image data",
      extraction: parseVisionResponse("", { model: args.model }).extraction,
    };
  }
  const model = typeof args.model === "string" && args.model ? args.model : DEFAULT_VISION_MODEL;
  const ollamaUrl = typeof args.ollamaUrl === "string" && args.ollamaUrl ? args.ollamaUrl : DEFAULT_OLLAMA_URL;
  const timeoutMs = Number.isFinite(args.timeoutMs) && args.timeoutMs > 0 ? args.timeoutMs : DEFAULT_TIMEOUT_MS;
  const httpPost = typeof args.httpPostImpl === "function" ? args.httpPostImpl : defaultHttpPost;

  const body = {
    model,
    prompt: buildVisionPrompt({ units: args.units }),
    images: [imageBase64],
    stream: false,
    keep_alive: "15m",
    options: { temperature: 0, num_predict: DEFAULT_NUM_PREDICT },
  };

  let raw;
  try {
    raw = await httpPost(`${ollamaUrl}/api/generate`, body, timeoutMs);
  } catch (e) {
    return {
      success: false,
      error: "vision request failed: " + (e instanceof Error ? e.message : String(e)),
      extraction: parseVisionResponse("", { model }).extraction,
    };
  }
  return parseVisionResponse(raw, { model });
}

// Test surface — pure internals exported so the test file can probe them.
export const _internals = {
  parseNominal,
  parseToleranceValue,
  extractJsonBlock,
  defaultHttpPost,
  DEFAULT_VISION_MODEL,
  DEFAULT_OLLAMA_URL,
};
