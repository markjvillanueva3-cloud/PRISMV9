// scripts/lib/region-classifier-lib.mjs
//
// BLUEPRINT-VISION-OCR P1.5 -- layout-aware REGION segmentation + routing (pure core).
//
// THE PROBLEM this solves (blueprint-reading-improvement-backlog-2026-06-19, P1.5):
// the SHIPPED page classifier (scripts/lib/page-classifier-lib.mjs) makes a BINARY
// per-page decision -- extract the whole page or skip it. That over-skips: a page is
// rarely all-drawing or all-paperwork; a real print is a MIX of a drawing view, a
// dimension table, a title block, maybe a BOM + notes. A single full-page VLM pass
// also loses small dims in dense regions (the dense-document recall failure). P1.5
// extends the page classifier to REGION level: segment the page into regions and
// ROUTE each region to the right extractor (view->VLM-OCR, table->table-parser,
// title-block->field-parser) so no whole page is dropped and dense tables get a real
// parser. It is the layout-aware sibling of the fixed-grid region TILING in
// scripts/lib/vision-tiling-lib.mjs (tiling = blind 2x2 grid; this = semantic regions).
//
// SAFETY BIAS (load-bearing, INVERSE of the page classifier's skip-bias): the page
// classifier biases toward EXTRACT (never lose a drawing). Region routing biases
// toward FULL-PAGE: when the VLM's segmentation is low-confidence, malformed, or
// empty, decideRegionRouting falls back to the PROVEN full-page OCR pass rather than
// trusting unverified region boxes. Region routing can only ADD recall on top of the
// full-page floor -- it must never REPLACE it with a worse, box-cropped subset. The
// VLM's bbox accuracy is unproven (backlog P1.5 risk note), so a confidence floor
// gates whether we trust the segmentation AT ALL.
//
// RECALL-FIRST routing (matches the xray recall>precision doctrine): once the
// segmentation is trusted, EVERY region is routed to SOME extractor -- none is hard-
// dropped. bom/notes route to a LIGHT extraction (not "skip"); an unknown/other
// confident region routes to the generic VLM-OCR (extract, don't discard). The only
// "skip" is the whole-segmentation full-page fallback, which loses nothing (the
// full-page pass still runs).
//
// PURE: no fs, no fetch. Caller (scripts/region-classify.mjs, P1.5 step 2) does HTTP
// (curl->Ollama) + image render/crop. Mirrors the pure-core convention of
// scripts/lib/page-classifier-lib.mjs + ollama-vision-extract-lib.mjs (R11).

import { DEFAULT_VISION_MODEL } from "./ollama-vision-extract-lib.mjs";

// Single-sourced from the vision lib so the segmenter, the page classifier, and the
// extractor always target the same GPU-resident model (qwen3-vl:8b-instruct).
export { DEFAULT_VISION_MODEL };

// Region segmentation returns a LIST of regions (richer than the page classifier's
// 4-field object), so it needs a larger num_predict + a slightly longer timeout than
// the 30s binary classify -- but it is still a CHEAP layout pass, not the full rich
// per-region extraction. 45s clears a cold model load (~15s) + one list-returning
// segmentation call (~5-15s); a warm model answers faster.
export const DEFAULT_REGION_TIMEOUT_MS = 45000;

// Trust floor for the SEGMENTATION (not per-dimension): below this, decideRegionRouting
// falls back to full-page OCR. Matches the page classifier's 0.70 floor and the verified
// OCR per-field operator-confirm floor, so region routing is no more aggressive than the
// extraction it augments.
export const DEFAULT_REGION_MIN_CONFIDENCE = 0.7;

// Default minimum number of valid + at-or-above-floor regions required to TRUST the
// segmentation and route it (else full-page fallback). 1 is the loosest defensible gate:
// a single confident region is enough to add region-level recall on top of the full-page
// floor; 0 would trust an empty/garbage segmentation (the data-loss degenerate).
export const DEFAULT_MIN_TRUSTED_REGIONS = 1;

// Region kinds the segmenter recognizes (snake_case canonical, matching the PAGE_KINDS
// convention in page-classifier-lib.mjs). "unknown" => the model could not name the kind.
export const REGION_KINDS = Object.freeze([
  "drawing_view",     // a dimensioned drawing view (orthographic / section / detail / iso)
  "dimension_table",  // a tabulated dimension / hole / tolerance chart
  "title_block",      // the title block (part no, material, scale, units, revision)
  "bom",              // bill of materials / parts list
  "notes",            // general/flag notes, specification text
  "other",            // a region that is none of the above but is content
  "unknown",          // the model could not classify the region
]);

// Canonical extractor ids a region routes to. The glue (P1.5 step 2) maps these to a
// real per-region extraction strategy. "skip" exists for completeness but the default
// ROUTE_MAP NEVER emits it for a content region (recall-first) -- the only real drop is
// the whole-segmentation full-page fallback in decideRegionRouting.
export const EXTRACTORS = Object.freeze([
  "vlm_ocr",       // full VLM OCR pass on the cropped region (drawing views, unknown content)
  "table_parser",  // structured table extraction (dimension tables)
  "field_parser",  // key/value field extraction (title block)
  "light",         // a light VLM pass (bom / notes -- lower-value but never dropped)
  "skip",          // genuinely skip (reserved; not emitted by the default recall-first map)
]);

// Region-kind -> extractor. Recall-first: every recognized content kind extracts
// SOMETHING; bom/notes get a LIGHT pass rather than a skip; other/unknown fall to the
// generic VLM-OCR (treat as a view and extract -- never discard a confident region).
const ROUTE_MAP = Object.freeze({
  drawing_view: "vlm_ocr",
  dimension_table: "table_parser",
  title_block: "field_parser",
  bom: "light",
  notes: "light",
  other: "vlm_ocr",
  unknown: "vlm_ocr",
});

// Tolerance for normalized-bbox bounds checks: VLMs round fractional coords, so a box
// edge at 1.01 is accepted (and clamped to 1.0) rather than rejected.
const BBOX_EPS = 0.02;

/**
 * Build the region-segmentation prompt. Asks the VLM for a LIST of regions with
 * NORMALIZED fractional bboxes (resolution-independent so the glue crops via page dims
 * without knowing the render DPI). Strict JSON, no prose.
 *
 * @returns {string}
 */
export function buildRegionSegmentPrompt() {
  return [
    "You are segmenting ONE page of a scanned manufacturing engineering drawing into its layout regions, so each region can be sent to the right reader. Identify every distinct content region on the page and classify what each one is.",
    "",
    "Region kinds:",
    "- drawing_view: a dimensioned drawing view (orthographic, section, detail, or isometric) with geometry and dimension lines.",
    "- dimension_table: a tabulated chart of dimensions, holes, or tolerances (rows/columns of measurements).",
    "- title_block: the title block (part number, material, scale, units, revision, drawn-by).",
    "- bom: a bill of materials or parts list.",
    "- notes: general or flag notes / specification text.",
    "- other: a content region that is none of the above.",
    "",
    "Return a SINGLE JSON object with EXACTLY this shape and nothing else:",
    "{",
    '  "regions": [',
    '    { "bbox": [x, y, w, h], "region_kind": "drawing_view", "confidence": 0.0 }',
    "  ]",
    "}",
    "",
    "RULES:",
    "- bbox is [x, y, w, h] as FRACTIONS of the page in [0,1]: x,y = top-left corner, w,h = width,height. Example: a title block in the bottom-right is roughly [0.6, 0.85, 0.4, 0.15].",
    "- region_kind MUST be one of: drawing_view, dimension_table, title_block, bom, notes, other.",
    "- confidence is ONE decimal in [0,1] for how sure you are of the region_kind. Use a LOW value when unsure. NEVER a range, NEVER a placeholder.",
    "- List EVERY distinct region. Do NOT merge a dimension table into a drawing view. Do NOT invent regions that are not visible.",
    "- Return ONLY the JSON object. No prose, no markdown fences.",
  ].join("\n");
}

/**
 * Build the Ollama /api/generate request body for a segmentation call. Larger
 * num_predict than the binary page classifier (a LIST of regions, not a 4-field
 * object); num_ctx 8192 to hold the full-page vision tokens + the prompt (the same
 * 4096->8192 lesson as the page classifier -- a 4096 window overflows and emits empty).
 *
 * @param {string} prompt
 * @param {string} imageBase64
 * @param {{model?:string, think?:boolean, numPredict?:number, numCtx?:number, modelOptions?:object}} [opts]
 */
export function buildRegionSegmentRequestBody(prompt, imageBase64, opts = {}) {
  const model = typeof opts.model === "string" && opts.model ? opts.model : DEFAULT_VISION_MODEL;
  // A typical print has ~3-8 regions x ~40 tokens each; 512 leaves headroom for a busy
  // multi-view sheet without truncating the JSON array mid-region.
  const numPredict = Number.isInteger(opts.numPredict) && opts.numPredict > 0 ? opts.numPredict : 512;
  // 8192 (see page-classifier-lib.mjs:104): a full page at 150dpi tokenizes to more vision
  // tokens than a 4096 window holds; overflow => empty output => silent full-page fallback.
  const numCtx = Number.isInteger(opts.numCtx) && opts.numCtx > 0 ? opts.numCtx : 8192;
  return {
    model,
    prompt,
    images: [imageBase64],
    stream: false,
    think: opts.think === undefined ? false : opts.think,
    options: {
      temperature: 0,            // layout segmentation -- deterministic, no sampling spread
      num_predict: numPredict,
      num_ctx: numCtx,
      ...(opts.modelOptions || {}),
    },
  };
}

// -- parse helpers (defensive -- tolerate missing/wrong types) --

function clamp01(x) {
  const n = Number(x);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : null;
}

function normalizeRegionKind(k) {
  if (typeof k !== "string") return null;
  const s = k.toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (REGION_KINDS.includes(s)) return s;
  // common synonyms the VLM emits for the canonical kinds
  if (s === "view" || s === "drawing" || s === "isometric" || s === "section" || s === "detail") return "drawing_view";
  if (s === "table" || s === "dim_table" || s === "dimensions" || s === "hole_table" || s === "tolerance_table") return "dimension_table";
  if (s === "titleblock" || s === "title" || s === "title_box") return "title_block";
  if (s === "parts_list" || s === "bill_of_materials") return "bom";
  if (s === "note" || s === "general_notes" || s === "specifications" || s === "spec") return "notes";
  return null;
}

/**
 * Validate + clamp a normalized fractional bbox [x,y,w,h]. Returns the clamped bbox
 * (4 numbers in [0,1], w>0, h>0) or null if it cannot be made into a valid box.
 * A box whose edge spills slightly past 1.0 (VLM rounding) is clamped, not rejected;
 * a box with non-positive width/height, non-finite members, or wrong arity is rejected.
 * @param {*} raw
 * @returns {number[]|null}
 */
export function validateBbox(raw) {
  if (!Array.isArray(raw) || raw.length !== 4) return null;
  const nums = raw.map(Number);
  if (nums.some((n) => !Number.isFinite(n))) return null;
  let [x, y, w, h] = nums;
  // Reject clearly non-fractional boxes (pixel coords): if any value is well above 1,
  // the model ignored the fraction instruction -- caller must full-page-fall-back rather
  // than guess the page size. Allow a small epsilon over 1.0 for rounding.
  if (x > 1 + BBOX_EPS || y > 1 + BBOX_EPS || w > 1 + BBOX_EPS || h > 1 + BBOX_EPS) return null;
  // clamp origin into [0,1)
  x = Math.max(0, Math.min(1, x));
  y = Math.max(0, Math.min(1, y));
  // width/height must be positive after clamping the box to stay within the page
  w = Math.min(w, 1 - x);
  h = Math.min(h, 1 - y);
  if (!(w > 0) || !(h > 0)) return null;
  return [x, y, w, h];
}

/**
 * Parse the model's segmentation response into a normalized region list. Tolerant of:
 * a {regions:[...]} object, a bare [...] array, fenced JSON, and synonym field names
 * (bbox/box/bounding_box, region_kind/kind/type, confidence/conf). Every returned
 * region carries a `valid` flag (bbox + kind both usable) so decideRegionRouting can
 * count only the trustworthy ones.
 *
 * @param {string} rawText
 * @returns {{success:boolean, error:(string|null), regions:Array<{bbox:(number[]|null), region_kind:string, raw_kind:(string|null), confidence:number, valid:boolean}>}}
 */
export function parseRegionSegmentResponse(rawText) {
  if (typeof rawText !== "string" || !rawText.trim()) {
    return { success: false, error: "empty response", regions: [] };
  }
  let jsonText = rawText.trim();
  const fence = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) jsonText = fence[1].trim();

  // Accept either an object {regions:[...]} or a bare array [...]. Slice to the outermost
  // bracket pair of whichever appears first so trailing prose can't break the parse.
  let arr = null;
  const objStart = jsonText.indexOf("{");
  const arrStart = jsonText.indexOf("[");
  const tryParse = (s) => { try { return JSON.parse(s); } catch { return null; } };

  if (objStart >= 0 && (arrStart < 0 || objStart < arrStart)) {
    const objEnd = jsonText.lastIndexOf("}");
    if (objEnd > objStart) {
      const parsed = tryParse(jsonText.slice(objStart, objEnd + 1));
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.regions)) arr = parsed.regions;
      else if (Array.isArray(parsed)) arr = parsed;
    }
  }
  if (arr === null && arrStart >= 0) {
    const arrEnd = jsonText.lastIndexOf("]");
    if (arrEnd > arrStart) {
      const parsed = tryParse(jsonText.slice(arrStart, arrEnd + 1));
      if (Array.isArray(parsed)) arr = parsed;
    }
  }

  if (!Array.isArray(arr)) {
    return { success: false, error: "no regions array in response", regions: [] };
  }

  const regions = [];
  for (const r of arr) {
    if (!r || typeof r !== "object" || Array.isArray(r)) continue;
    const rawBox = r.bbox ?? r.box ?? r.bounding_box ?? r.boundingBox;
    const bbox = validateBbox(rawBox);
    const rawKind = r.region_kind ?? r.kind ?? r.type ?? r.region;
    const kind = normalizeRegionKind(rawKind);
    const conf = clamp01(r.confidence ?? r.conf ?? r.score);
    regions.push({
      // Stable per-region id (sequential in the output order, r0/r1/...). The P1.5 step-2
      // glue keys its crops + cross-region merge on this: crop-image-tiles.py wants
      // {id,x,y,w,h} tile objects and vision-tiling-lib.mjs mergeTiledDimensions keys
      // overlap topology by tile id. Emitting it here makes that seam id-stable + zero-
      // friction (glue still scales the fractional bbox to pixels -- a glue concern).
      id: `r${regions.length}`,
      bbox,
      region_kind: kind != null ? kind : "unknown",
      raw_kind: typeof rawKind === "string" ? rawKind : null,
      confidence: conf != null ? conf : 0.5,
      // A region is trustworthy only with a usable bbox AND a recognized kind. An
      // unknown-kind region with a good box is still extractable (routes to vlm_ocr)
      // but does NOT count toward segmentation trust (we don't know what it is).
      valid: bbox != null && kind != null,
    });
  }

  if (regions.length === 0) {
    return { success: false, error: "regions array present but no usable region objects", regions: [] };
  }
  return { success: true, error: null, regions };
}

/**
 * Route ONE region to its extractor. Recall-first: a recognized content kind always
 * maps to a real extractor; an unknown/other kind falls to the generic VLM-OCR (extract,
 * never discard). A region with no usable bbox cannot be cropped -> it is the caller's
 * full-page-fallback signal (returned extractor "skip" with confident:false).
 *
 * @param {{bbox:(number[]|null), region_kind:string, confidence:number}} region
 * @param {{minConfidence?:number}} [opts]
 * @returns {{extractor:string, region_kind:string, confident:boolean, reason:string}}
 */
export function routeRegion(region, opts = {}) {
  const floor = Number.isFinite(opts.minConfidence) ? Math.max(0, Math.min(1, opts.minConfidence)) : DEFAULT_REGION_MIN_CONFIDENCE;
  if (!region || typeof region !== "object") {
    return { extractor: "skip", region_kind: "unknown", confident: false, reason: "no region -> skip (caller full-page fallback)" };
  }
  const kind = REGION_KINDS.includes(region.region_kind) ? region.region_kind : "unknown";
  const conf = Number.isFinite(region.confidence) ? region.confidence : 0;
  if (!Array.isArray(region.bbox)) {
    return { extractor: "skip", region_kind: kind, confident: false, reason: "no usable bbox -> cannot crop, skip this region" };
  }
  const extractor = ROUTE_MAP[kind] || "vlm_ocr";
  return {
    extractor,
    region_kind: kind,
    confident: conf >= floor,
    reason: `${kind} -> ${extractor}${conf >= floor ? "" : ` (low conf ${conf.toFixed(2)} < ${floor}, still extracted recall-first)`}`,
  };
}

/**
 * Pure routing decision for a whole page's segmentation. DATA-LOSS-SAFE: returns
 * route "full_page" (fall back to the proven full-page OCR pass) whenever the
 * segmentation cannot be trusted -- parse failure, no regions, or fewer than
 * minTrustedRegions valid regions at/above the confidence floor. Otherwise returns
 * route "region_route" with each region's extractor attached. Mirrors the page
 * classifier's "fail toward the safe path" bias, inverted (here the safe path is
 * full-page, not skip).
 *
 * @param {{success:boolean, regions:Array}} parseResult  output of parseRegionSegmentResponse
 * @param {{minConfidence?:number, minTrustedRegions?:number}} [opts]
 * @returns {{route:"region_route"|"full_page", trusted_count:number, region_count:number, routed:Array, reason:string}}
 */
export function decideRegionRouting(parseResult, opts = {}) {
  const floor = Number.isFinite(opts.minConfidence) ? Math.max(0, Math.min(1, opts.minConfidence)) : DEFAULT_REGION_MIN_CONFIDENCE;
  const minTrusted = Number.isInteger(opts.minTrustedRegions) && opts.minTrustedRegions > 0
    ? opts.minTrustedRegions
    : DEFAULT_MIN_TRUSTED_REGIONS;

  if (!parseResult || typeof parseResult !== "object" || parseResult.success !== true || !Array.isArray(parseResult.regions) || parseResult.regions.length === 0) {
    return { route: "full_page", trusted_count: 0, region_count: 0, routed: [], reason: "segmentation failed/empty -> full-page OCR (no data loss)" };
  }
  const regions = parseResult.regions;
  // A floor of 0 (or clamped-from-negative) would trust a conf-0 "no idea" segmentation
  // and route box-cropped garbage instead of the full page -- the data-loss degenerate.
  if (!(floor > 0)) {
    return { route: "full_page", trusted_count: 0, region_count: regions.length, routed: [], reason: "confidence floor not strictly positive -> full-page OCR" };
  }
  const trustedCount = regions.filter((r) => r && r.valid === true && Number.isFinite(r.confidence) && r.confidence >= floor).length;
  if (trustedCount < minTrusted) {
    return {
      route: "full_page",
      trusted_count: trustedCount,
      region_count: regions.length,
      routed: [],
      reason: `only ${trustedCount} trusted region(s) (< ${minTrusted} at conf >= ${floor}) -> full-page OCR (unproven segmentation)`,
    };
  }
  // Trusted: route EVERY region recall-first (even sub-floor ones get extracted; the
  // glue should still run a full-page floor pass and UNION the results so region
  // routing can only add recall, never remove it).
  const routed = regions.map((r) => ({ ...r, ...routeRegion(r, { minConfidence: floor }) }));
  return {
    route: "region_route",
    trusted_count: trustedCount,
    region_count: regions.length,
    routed,
    reason: `${trustedCount} trusted region(s) >= ${floor} -> route ${regions.length} region(s)`,
  };
}
