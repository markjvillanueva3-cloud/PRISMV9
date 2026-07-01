// scripts/lib/page-classifier-lib.mjs
//
// U-PSGB-XRAY-PAGE-CLASSIFIER — drawing-vs-paperwork page classifier (pure core).
//
// THE PROBLEM this solves (overnight corpus, 2026-06-01): of 253 OCR-reachable
// pages, only 60 (~24%) were actual engineering drawings; 193 were non-drawing
// pages (cover sheets, notes pages, BOM tables, text documents) bundled into
// multi-page PDFs. The full rich extraction (~50-150s/page on the GPU) ran on
// ALL of them, so ~76% of GPU time was spent reading paperwork that yields 0
// dimensions. The fix is INPUT FILTERING, not a better model — the model already
// reads dimensioned prints at 100% value-recovery (see
// reference_xray_ocr_closed_loop_2026_06_01).
//
// This is a CHEAP per-page gate (a yes/no VLM call, num_predict ~96 → ~2-4s) run
// AFTER pdf→png render and BEFORE the full extraction, to skip the 193-class
// non-drawing noise. It is DEEPER than `looksLikeBlueprint` in
// build-blueprint-ocr-worklist.mjs — that filters at the FILE level (filename +
// size); a multi-page bundle passes the filename filter but its individual pages
// are a mix of drawing + paperwork. This classifies the RENDERED PAGE IMAGE.
//
// SAFETY BIAS (load-bearing): a false-SKIP loses a real drawing (data loss); a
// false-EXTRACT merely wastes one GPU pass on paperwork (cheap, recoverable).
// So the gate SKIPS a page ONLY on a CONFIDENT not-a-drawing verdict — every
// uncertain or low-confidence page falls through to extraction. We never trade a
// lost drawing for saved GPU time.
//
// PURE: no fs, no fetch. Caller does HTTP (curl) + image-bytes load. Mirrors the
// pure-core convention of scripts/lib/ollama-vision-extract-lib.mjs (R11).

import { DEFAULT_VISION_MODEL } from "./ollama-vision-extract-lib.mjs";

// Single-sourced from the vision lib so the classifier and the extractor always
// target the same GPU-resident model (qwen3-vl:8b-instruct).
export { DEFAULT_VISION_MODEL };

// Classification is a tiny output (a 4-field object), not the rich extraction —
// a short timeout + small num_predict is the whole point (cheap pre-filter).
// 30s clears a cold model load (~15s) + one fast classification (~3s); a warm
// model answers in ~2-4s.
export const DEFAULT_CLASSIFIER_TIMEOUT_MS = 30000;

// The default not-a-drawing confidence floor below which we DO NOT skip. Matches
// the verified OCR per-field operator-confirm floor (0.70) so the gate is no more
// aggressive than the extraction it guards.
export const DEFAULT_SKIP_MIN_CONFIDENCE = 0.7;

// Page kinds the classifier recognizes. "drawing" is the only kind that proceeds
// to full extraction; everything else is paperwork. "unknown" ⇒ never a confident
// skip (falls through to extraction).
export const PAGE_KINDS = Object.freeze([
  "drawing",      // engineering drawing / blueprint with dimensioned views
  "title_sheet",  // title / index / revision sheet (no dimensioned geometry)
  "notes",        // notes / specification text page
  "bom",          // bill of materials / parts list table
  "table",        // generic data table (tolerances, hardware, etc.)
  "cover",        // cover letter / transmittal / fax sheet
  "text",         // prose document page
  "photo",        // photograph / rendering (not a line drawing)
  "blank",        // blank or near-blank page
  "other",        // none of the above
  "unknown",      // model could not decide
]);

/**
 * Build the page-classification prompt. Deliberately TINY and binary — the goal
 * is a fast yes/no, not the rich multi-zone extraction. Asks for strict JSON.
 *
 * @returns {string}
 */
export function buildPageClassifierPrompt() {
  return [
    "You are triaging one page of a scanned manufacturing document. Decide whether THIS page is an actual engineering DRAWING / blueprint that carries dimensioned geometry (views, dimension lines with measurements, GD&T callouts, a title block referencing a drawn part) — versus a NON-DRAWING page (a cover/transmittal sheet, a notes or specification text page, a bill-of-materials or data table, or a photograph).",
    "",
    "A page is a DRAWING only if it shows drawn part geometry WITH dimensions. A page that is mostly text, a table, a list, a photo, or a title/index sheet with no dimensioned views is NOT a drawing.",
    "",
    "Return a SINGLE JSON object with EXACTLY these fields and nothing else:",
    "{",
    '  "is_drawing": true,',
    '  "page_kind": "drawing|title_sheet|notes|bom|table|cover|text|photo|blank|other",',
    '  "confidence": 0.0,',
    '  "reason": "one short clause"',
    "}",
    "",
    "RULES:",
    "- is_drawing is a strict boolean: true ONLY for a dimensioned engineering drawing, false for everything else.",
    "- page_kind names what the page actually is.",
    "- confidence is ONE decimal in [0,1] reflecting how sure you are of is_drawing. Use a LOW value when the page is ambiguous. NEVER a range, NEVER a placeholder.",
    "- reason is a short clause (e.g. \"dimensioned views + title block\" or \"BOM table, no geometry\").",
    "- Return ONLY the JSON object. No prose, no markdown fences.",
  ].join("\n");
}

/**
 * Build the Ollama /api/generate request body for a classification call. Small
 * num_predict (the output is a 4-field object), think:false for the instruct VLM.
 *
 * @param {string} prompt
 * @param {string} imageBase64
 * @param {{model?:string, think?:boolean, numPredict?:number, numCtx?:number, modelOptions?:object}} [opts]
 */
export function buildClassifierRequestBody(prompt, imageBase64, opts = {}) {
  const model = typeof opts.model === "string" && opts.model ? opts.model : DEFAULT_VISION_MODEL;
  const numPredict = Number.isInteger(opts.numPredict) && opts.numPredict > 0 ? opts.numPredict : 96;
  // 8192, NOT 4096: a full page rendered at 150dpi tokenizes to MORE vision tokens than the original
  // ~1950 estimate, and the real ~400-token classifier prompt on top of them OVERFLOWS a 4096 window
  // -> the model emits ZERO output (done_reason=undefined, empty response) and every page silently
  // falls through to "extract" (the gate provided no skip value at all). Measured 2026-06-16: ctx 4096
  // = empty, ctx 8192 = valid JSON (done_reason=stop). See reference_xray_page_classify_numctx_fix.
  const numCtx = Number.isInteger(opts.numCtx) && opts.numCtx > 0 ? opts.numCtx : 8192;
  return {
    model,
    prompt,
    images: [imageBase64],
    stream: false,
    // qwen3-vl:8b-instruct emits no <think> chain; think:false is the safe default
    // (Ollama ignores it for non-thinking models). Caller may re-enable via opts.think.
    think: opts.think === undefined ? false : opts.think,
    options: {
      temperature: 0,            // classification — deterministic, no sampling spread
      num_predict: numPredict,   // tiny output; classification not extraction
      num_ctx: numCtx,           // room for the ~1950 vision tokens + the short prompt + small JSON
      ...(opts.modelOptions || {}),
    },
  };
}

// ── parse helpers (defensive — tolerate missing/wrong types) ──

function clamp01(x) {
  const n = Number(x);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : null;
}

function normalizePageKind(k) {
  if (typeof k !== "string") return null;
  const s = k.toLowerCase().trim().replace(/[\s-]+/g, "_");
  return PAGE_KINDS.includes(s) ? s : null;
}

/**
 * Interpret a bare-prose response (no JSON object) into a boolean is_drawing,
 * for the fallback path when the model ignores the JSON instruction. Returns
 * { is_drawing: boolean, confidence: number } or null if genuinely undecidable.
 * A prose-inferred negative can NEVER drive a skip — decidePageVerdict hard-blocks
 * a skip when source==="prose" (a prose inference is inherently low-trust). These
 * confidence values are therefore advisory (telemetry), not safety-load-bearing;
 * they are kept low purely as a sane default for any non-gate consumer.
 * @param {string} text
 */
function interpretProse(text) {
  const t = text.toLowerCase();
  // explicit negation of drawing-ness
  const neg = /\b(not\s+a\s+(?:drawing|blueprint)|no(?:t)?\s+(?:dimensioned|drawing)|non[-\s]?drawing|is\s+not\s+a\s+drawing|paperwork|cover\s+sheet|bill\s+of\s+materials|\bbom\b|text\s+(?:page|document)|notes\s+page)\b/.test(t);
  const pos = /\b(is\s+a\s+(?:drawing|blueprint)|engineering\s+drawing|dimensioned\s+(?:drawing|views?)|title\s+block|this\s+is\s+a\s+drawing)\b/.test(t);
  if (pos && !neg) return { is_drawing: true, confidence: 0.6 };
  if (neg && !pos) return { is_drawing: false, confidence: 0.55 }; // below default floor on purpose
  // bare yes/no
  if (/^\s*(yes|true|drawing)\b/.test(t) && !neg) return { is_drawing: true, confidence: 0.55 };
  if (/^\s*(no|false)\b/.test(t) && !pos) return { is_drawing: false, confidence: 0.5 };
  return null;
}

/**
 * Parse the model's response into a normalized classification.
 *
 * @param {string} rawText
 * @returns {{success:boolean, error:(string|null), classification:(object|null)}}
 *   classification = { is_drawing:boolean, page_kind:string, confidence:number,
 *                      reason:(string|null), source:"json"|"prose" }
 */
export function parsePageClassifierResponse(rawText) {
  if (typeof rawText !== "string" || !rawText.trim()) {
    return { success: false, error: "empty response", classification: null };
  }
  let jsonText = rawText.trim();
  const fence = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) jsonText = fence[1].trim();

  const objStart = jsonText.indexOf("{");
  const objEnd = jsonText.lastIndexOf("}");
  if (objStart >= 0 && objEnd > objStart) {
    const slice = jsonText.slice(objStart, objEnd + 1);
    let parsed = null;
    try {
      parsed = JSON.parse(slice);
    } catch {
      parsed = null;
    }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      // is_drawing may arrive as bool, "true"/"false", "yes"/"no", or 1/0.
      let isDrawing = null;
      const rawFlag = parsed.is_drawing;
      if (typeof rawFlag === "boolean") isDrawing = rawFlag;
      else if (typeof rawFlag === "number") isDrawing = rawFlag !== 0;
      else if (typeof rawFlag === "string") {
        const f = rawFlag.toLowerCase().trim();
        if (f === "true" || f === "yes" || f === "1") isDrawing = true;
        else if (f === "false" || f === "no" || f === "0") isDrawing = false;
      }
      const kind = normalizePageKind(parsed.page_kind);
      // Derive is_drawing from page_kind when the boolean is missing/garbled.
      if (isDrawing == null && kind != null) isDrawing = kind === "drawing";
      if (isDrawing == null) {
        return { success: false, error: "is_drawing not determinable from JSON", classification: null };
      }
      const conf = clamp01(parsed.confidence);
      const reason = typeof parsed.reason === "string" && parsed.reason ? parsed.reason.slice(0, 200) : null;
      return {
        success: true,
        error: null,
        classification: {
          is_drawing: isDrawing,
          // if the model said is_drawing but gave no/odd kind, fall back to drawing/other
          page_kind: kind != null ? kind : (isDrawing ? "drawing" : "other"),
          confidence: conf != null ? conf : 0.5,
          reason,
          source: "json",
        },
      };
    }
  }

  // No usable JSON object → prose fallback.
  const prose = interpretProse(jsonText);
  if (prose) {
    return {
      success: true,
      error: null,
      classification: {
        is_drawing: prose.is_drawing,
        page_kind: prose.is_drawing ? "drawing" : "other",
        confidence: prose.confidence,
        reason: "prose-inferred",
        source: "prose",
      },
    };
  }
  return { success: false, error: "no JSON object and prose undecidable", classification: null };
}

/**
 * Pure verdict from a classification. SKIP only on a CONFIDENT not-a-drawing;
 * everything else proceeds to extraction (never lose a real drawing).
 *
 * @param {object|null} classification  output of parsePageClassifierResponse
 * @param {{minConfidence?:number}} [opts]  not-a-drawing confidence floor to skip (default 0.70)
 * @returns {{verdict:"extract"|"skip", confident_skip:boolean, reason:string}}
 */
export function decidePageVerdict(classification, opts = {}) {
  const floor = Number.isFinite(opts.minConfidence) ? Math.max(0, Math.min(1, opts.minConfidence)) : DEFAULT_SKIP_MIN_CONFIDENCE;
  if (!classification || typeof classification !== "object") {
    return { verdict: "extract", confident_skip: false, reason: "no classification → extract (fail toward extraction)" };
  }
  const { is_drawing, confidence, source } = classification;
  const conf = Number.isFinite(confidence) ? confidence : 0;
  // A SKIP is permitted only when ALL of the following hold — every relaxation
  // here is a data-loss risk, so the conjunction is deliberately strict:
  //   1. the model said NOT a drawing (strict === false; a missing/null flag never skips),
  //   2. the confidence floor is STRICTLY POSITIVE (floor 0 / clamped-from-negative would
  //      otherwise let a conf-0 "no idea" verdict skip — the data-loss degenerate),
  //   3. confidence is at/above that floor, AND
  //   4. the verdict came from a STRUCTURED (JSON) classification — a prose-inferred
  //      negative is inherently low-trust and NEVER drives a skip. (This also decouples
  //      the prose confidence ceilings from the floor: they can't invert the bias.)
  if (is_drawing === false && floor > 0 && conf >= floor && source === "json") {
    return { verdict: "skip", confident_skip: true, reason: `not a drawing (conf ${conf.toFixed(2)} ≥ ${floor}) → skip extraction` };
  }
  if (is_drawing === false) {
    const why = source === "prose" ? "prose-inferred negative (never skips)"
      : floor <= 0 ? "skip floor not positive"
      : `low conf (${conf.toFixed(2)} < ${floor})`;
    return { verdict: "extract", confident_skip: false, reason: `likely not a drawing but ${why} → extract anyway` };
  }
  return { verdict: "extract", confident_skip: false, reason: "drawing (or uncertain) → extract" };
}
