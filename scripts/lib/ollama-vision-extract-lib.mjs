// scripts/lib/ollama-vision-extract-lib.mjs
//
// U-TDP06 / U-PSGB-XRAY-RICH-SCHEMA — Ollama Vision Extractor (pure core).
//
// Builds the engineering-print extraction prompt and parses the model's JSON
// response into the RICH multi-zone BlueprintExtraction shape (title_block +
// dimensions + gdt + notes + profiles + part_bounds + thickness + surface
// finishes), mirroring the canonical wired contract in
// BlueprintVisionOCREngine.ts:201-278 (the local runner had REGRESSED that
// contract to a bare {confidence, dimensions} — material/title-block/GD&T/
// profiles are all goal-critical for CAD reconstruction + quoting).
//
// Unit handling (R5 — code does the deterministic transform, the VLM does not):
//   the model reports each dimension's nominal in the unit AS DRAWN plus the
//   unit token; THIS code converts to mm. The old "Convert inches to mm" prompt
//   instruction was proven ignored by qwen2.5-VL (the extracted proof values
//   1.234 / 0.876 / 0.3575 were raw INCH), so conversion moved out of the prompt
//   and into convertToMm(). JM Die corpus is INCH; an unresolved unit is flagged
//   (never silently assumed) unless the caller passes opts.assumeUnits.
//
// PURE: no fs, no fetch. Caller does HTTP + image-bytes load.

// qwen3-vl:8b-instruct is the GPU-concurrency unlock (validated 2026-05-31, slot xray):
// loads at 8.1GB GPU-RESIDENT (vs qwen2.5vl:7b's 15.3GB which spills to CPU on a 16GB
// card once the desktop's ~4.5GB baseline is subtracted → >180s/page timeout). At 8.1GB
// it fits CONCURRENTLY with the chat fleet's qwen2.5-coder offload. The INSTRUCT variant
// is mandatory — the bare qwen3-vl:8b is a "thinking" model that routes all output into a
// <think> chain (think:false AND /no_think are both ignored by Ollama 0.24) and never emits
// the JSON; instruct has no reasoning trace → direct JSON in ~49s/page. See
// reference_xray_ocr_gpu_concurrency_2026_05_31.
export const DEFAULT_VISION_MODEL = "qwen3-vl:8b-instruct";
// 90s sat below a single cold-load (15s) + dense-page inference (~74s) → the
// first (cold) call would abort. 180s clears a cold load + one full-page extract.
export const DEFAULT_TIMEOUT_MS = 180000;
export const MM_PER_INCH = 25.4;

// Feature kinds we hint the model to expect per part class (NOT the dimension
// taxonomy — those are linear/diameter/etc. The rich contract separates "what
// dimensions are drawn" (OCR) from "what features exist" (downstream feature
// recognition). These remain a useful per-part-class attention hint.)
export const TARGET_FEATURE_KINDS = Object.freeze([
  "central_oil_hole",
  "stepped_revolved_axis",
  "bevel_face_chamfer",
  "working_tip_taper",
  "cross_drilled_relief_holes",
  "shoulder_fillet",
  "blade_root_fillet",
  "leading_edge_fillet",
  "trailing_edge_fillet",
  "ejector_pin_hole",
  "vent_groove",
  "datum_relief",
]);

// Canonical dimension types the rich contract recognizes.
export const DIMENSION_TYPES = Object.freeze([
  "linear", "diameter", "radius", "angular", "chamfer", "depth", "thread", "counterbore", "countersink",
]);

/**
 * Build the rich blueprint-analysis prompt. Mirrors BlueprintVisionOCREngine
 * BLUEPRINT_ANALYSIS_PROMPT (title_block/dimensions/gdt/notes/profiles/...).
 * The conversion instruction is DELIBERATELY ABSENT (R5 — code converts).
 *
 * @param {string} partClass  part-class hint (e.g. "electrode", "die", "punch")
 * @param {{targetKinds?:string[], wireEdm?:boolean}} [opts]
 */
export function buildVisionPrompt(partClass, opts = {}) {
  const targetKinds = Array.isArray(opts.targetKinds) ? opts.targetKinds : TARGET_FEATURE_KINDS;
  const pc = typeof partClass === "string" && partClass ? partClass : "unknown";
  const lines = [
    "You are a manufacturing engineer analyzing an engineering drawing/blueprint. Extract ALL manufacturing-relevant information from this image.",
    "",
    "Part class hint: " + pc,
    "Features commonly present on this part class (look hard for dimensions/callouts related to these): " + targetKinds.join(", "),
    "",
    "Return a SINGLE JSON object with this exact structure:",
    "{",
    '  "title_block": {',
    '    "part_number": "string or null", "revision": "string or null", "drawing_number": "string or null",',
    '    "title": "string or null", "material": "string or null (e.g. D2 Tool Steel, 4140, SS 304, Al 6061)",',
    '    "finish": "string or null", "scale": "string or null", "units": "mm or in or mixed",',
    '    "general_tolerance": "string or null (e.g. .005, ±0.1)", "third_angle": true',
    "  },",
    '  "dimensions": [',
    '    { "type": "linear|diameter|radius|angular|chamfer|depth|thread|counterbore|countersink",',
    '      "nominal": 1.234, "unit": "mm or in",',
    '      "tolerance_type": "bilateral|unilateral_plus|unilateral_minus|limit|basic|reference|null",',
    '      "tolerance_upper": 0.001, "tolerance_lower": -0.001, "surface_finish_ra": null,',
    '      "location_hint": "where on the part this dimension is",',
    '      "raw_text": "the exact text shown on the drawing", "confidence": 0.95 }',
    "  ],",
    '  "gdt": [',
    '    { "symbol": "position|flatness|perpendicularity|parallelism|concentricity|circularity|cylindricity|profile_line|profile_surface|circular_runout|total_runout|straightness|symmetry|angularity",',
    '      "tolerance_value": 0.05, "tolerance_unit": "mm or in", "material_condition": "MMC|LMC|RFS|null",',
    '      "datum_references": ["A","B"], "applied_to": "what feature",',
    '      "raw_text": "the feature control frame text", "confidence": 0.9 }',
    "  ],",
    '  "notes": [ { "category": "process|material|finish|tolerance|inspection|safety|assembly|general", "text": "the note text", "is_critical": false } ],',
    '  "profiles": [ { "name": "descriptive name", "type": "external|internal|hole|slot|pocket", "is_closed": true, "width_mm": 25.4, "height_mm": 12.7, "diameter_mm": null, "corner_radii_mm": [0.5], "confidence": 0.85 } ],',
    '  "part_bounds_mm": { "width": 50.0, "height": 25.0, "depth": 12.7 },',
    '  "thickness_mm": 25.4,',
    '  "surface_finishes": [ { "ra_um": 0.8, "location": "all machined surfaces", "raw_text": "Ra 0.8" } ]',
    "}",
    "",
    "RULES:",
    "- Extract EVERY dimension visible on the drawing, even if partially obscured.",
    "- Report each nominal EXACTLY as printed on the drawing, in the drawing's own unit, and set that dimension's \"unit\" field to \"in\" or \"mm\". DO NOT convert units yourself — report the raw number and its unit.",
    "- Set title_block.units to the drawing's overall unit system (\"in\", \"mm\", or \"mixed\").",
    "- For GD&T, identify the geometric characteristic symbol and ALL datum references; copy the feature control frame text verbatim into raw_text.",
    "- thickness_mm is the stock/part thickness (critical for wire EDM).",
    "- confidence is ONE decimal in [0,1] per field reflecting how certain you are. Use 0 if you genuinely cannot tell. NEVER a range, NEVER a placeholder string.",
    "- If you cannot determine a value, use null — do NOT guess.",
    "- Return ONLY the JSON object. No prose, no markdown fences, no array wrapping.",
  ];
  if (opts.wireEdm) {
    lines.push(
      "",
      "This blueprint is for WIRE EDM cutting. Pay special attention to internal profiles/cavities, through-features (the wire cuts the full thickness), corner radii (sets minimum wire diameter), surface finish (sets skim passes), material hardness (HRC), taper angles, and start-hole locations."
    );
  }
  return lines.join("\n");
}

/**
 * Build the DOCUMENT-TRANSCRIPTION prompt (U-QP-DOCUSTRATA-RUN-ALL, slot:charlie
 * 2026-06-12). The blueprint prompt above asks for dimensions/GD&T -- WRONG for a
 * business document (quote / sales order / closed order / invoice / packing slip).
 * This mode asks the VLM to TRANSCRIBE the page verbatim as plain text so the
 * downstream regex extractor (extract-docustrata-outcomes.mjs) can parse
 * "BILL TO" / "PART #" / "QUOTE TOTAL" / "INVOICE TOTAL" / dates from real text.
 *
 * Output is PLAIN TEXT, not JSON -- the caller returns it raw (no parseVisionResponse).
 * Verbatim transcription is deliberately requested (preserve labels, numbers,
 * line items, currency) -- paraphrase would destroy the regex anchors.
 *
 * @param {{docHint?: string}} [opts]  optional role hint ("quote"|"invoice"|...) for attention only
 */
export function buildTranscriptionPrompt(opts = {}) {
  const hint = typeof opts.docHint === "string" && opts.docHint ? opts.docHint : null;
  const lines = [
    "You are transcribing a scanned business/manufacturing document (a quote, sales order, purchase order, invoice, or packing slip from a machine shop).",
    "Transcribe ALL text on this page VERBATIM, exactly as printed. Do not summarize, paraphrase, translate, or reorder.",
    "",
    "Preserve every:",
    "- header/label and its value on the same line (e.g. \"BILL TO: ACME FASTENERS\", \"PART #: 12345-A\", \"QUOTE TOTAL: $1,234.56\", \"INVOICE TOTAL: $1,300.00\", \"DATE: 03/14/2026\").",
    "- part number, P/N, item number, job number, drawing number, customer name, ship-to / sold-to / bill-to block.",
    "- line item (quantity, description, unit price, extended price) on its own line.",
    "- dollar amount with its currency symbol and the exact label that precedes it (SUBTOTAL, TOTAL, AMOUNT DUE, BALANCE DUE, GRAND TOTAL).",
    "- every date in its printed format.",
    "",
    hint ? ("This document is most likely a: " + hint + ".") : null,
    "RULES:",
    "- Output ONLY the transcribed text. No commentary, no JSON, no markdown fences, no \"Here is the transcription\".",
    "- If a region is illegible, write [illegible] in place -- never invent text.",
    "- Keep numbers EXACTLY as printed (digits, commas, decimal points, $).",
  ].filter((l) => l != null);
  return lines.join("\n");
}

/** Pure: normalize a unit token to "in" | "mm" | "mixed" | null(unknown). */
export function normalizeUnit(u) {
  if (u == null) return null;
  const s = String(u).toLowerCase().trim();
  if (s === "in" || s === "inch" || s === "inches" || s === '"' || s === "imperial") return "in";
  if (s === "mm" || s === "millimeter" || s === "millimetre" || s === "metric") return "mm";
  if (s === "mixed") return "mixed";
  return null;
}

/**
 * Pure: convert a nominal value to mm given its unit. Returns
 * { mm: number|null, resolved: boolean, assumed: boolean, unit: string }.
 * resolved=false (mm=null) when the unit is unknown/mixed and no assumeUnits
 * fallback is provided — the value is NEVER silently treated as either unit.
 *
 * @param {number} value
 * @param {string|null} unit   per-dimension unit token (raw)
 * @param {string|null} [assumeUnits]  caller fallback ("in"|"mm") when unit unknown
 */
export function convertToMm(value, unit, assumeUnits = null) {
  const v = Number(value);
  if (!Number.isFinite(v)) return { mm: null, resolved: false, assumed: false, unit: "unknown" };
  let u = normalizeUnit(unit);
  let assumed = false;
  if (u !== "in" && u !== "mm") {
    const fallback = normalizeUnit(assumeUnits);
    if (fallback === "in" || fallback === "mm") {
      u = fallback;
      assumed = true;
    } else {
      return { mm: null, resolved: false, assumed: false, unit: "unknown" };
    }
  }
  const mm = u === "in" ? v * MM_PER_INCH : v;
  return { mm, resolved: true, assumed, unit: u };
}

// ── internal extraction helpers (defensive — tolerate missing/wrong types) ──

function asArray(x) { return Array.isArray(x) ? x : []; }
function asObject(x) { return x && typeof x === "object" && !Array.isArray(x) ? x : {}; }
function asStr(x) { return typeof x === "string" && x ? x : null; }
function asNum(x) { const n = Number(x); return Number.isFinite(n) ? n : null; }
function clamp01(x) { const n = Number(x); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : null; }

function extractDimension(d, drawingUnits, assumeUnits) {
  if (!d || typeof d !== "object") return null;
  const type = asStr(d.type) || asStr(d.kind); // tolerate legacy "kind"
  const rawNominal = asNum(d.nominal);
  const rawText = asStr(d.raw_text);
  // keep a dim that carries at least one signal
  if (type == null && rawNominal == null && rawText == null) return null;
  // unit precedence: per-dim unit → drawing units → caller fallback (assumed)
  const dimUnit = normalizeUnit(d.unit) || (drawingUnits === "in" || drawingUnits === "mm" ? drawingUnits : null);
  const conv = rawNominal != null ? convertToMm(rawNominal, dimUnit, assumeUnits) : { mm: null, resolved: false, assumed: false, unit: dimUnit || "unknown" };
  const out = {
    type: type || "unknown",
    kind: type || "unknown",            // backward-compat alias for legacy consumers
    nominal_raw: rawNominal,
    unit: conv.unit,
    unit_resolved: conv.resolved,
    unit_assumed: conv.assumed,
    nominal_mm: conv.mm,
    nominal: conv.resolved ? conv.mm : rawNominal, // back-compat: mm when known, else raw
    tolerance_type: asStr(d.tolerance_type),
    surface_finish_ra: asNum(d.surface_finish_ra),
    location_hint: asStr(d.location_hint),
    raw_text: rawText,
    confidence: clamp01(d.confidence),
  };
  // tolerances: convert with the SAME resolved unit as the nominal
  const tu = asNum(d.tolerance_upper);
  const tl = asNum(d.tolerance_lower);
  if (tu != null || tl != null) {
    const cu = tu != null ? convertToMm(tu, conv.unit === "unknown" ? null : conv.unit, assumeUnits) : null;
    const cl = tl != null ? convertToMm(tl, conv.unit === "unknown" ? null : conv.unit, assumeUnits) : null;
    out.tolerance_mm = {
      upper: cu && cu.resolved ? cu.mm : tu,
      lower: cl && cl.resolved ? cl.mm : tl,
    };
    // legacy shape some consumers read
    out.tolerance = out.tolerance_mm;
  }
  return out;
}

function extractGdt(g) {
  if (!g || typeof g !== "object") return null;
  const symbol = asStr(g.symbol);
  const raw = asStr(g.raw_text);
  if (symbol == null && raw == null) return null;
  const datums = asArray(g.datum_references).map((d) => asStr(d)).filter(Boolean);
  return {
    symbol: symbol || "unknown",
    tolerance_value: asNum(g.tolerance_value),
    tolerance_unit: normalizeUnit(g.tolerance_unit) || asStr(g.tolerance_unit),
    material_condition: asStr(g.material_condition),
    datum_references: datums,
    // doctrine: an FCF without a datum-3-2-1 reference is structurally invalid →
    // flag it (never drop — surface as low-trust for the operator-confirm gate).
    datum_deficient: datums.length === 0,
    applied_to: asStr(g.applied_to),
    raw_text: raw,
    confidence: clamp01(g.confidence),
  };
}

function extractNote(n) {
  if (!n || typeof n !== "object") return null;
  const text = asStr(n.text);
  if (text == null) return null;
  return { category: asStr(n.category) || "general", text, is_critical: n.is_critical === true };
}

function extractProfile(p) {
  if (!p || typeof p !== "object") return null;
  return {
    name: asStr(p.name),
    type: asStr(p.type),
    is_closed: p.is_closed === true,
    width_mm: asNum(p.width_mm),
    height_mm: asNum(p.height_mm),
    diameter_mm: asNum(p.diameter_mm),
    corner_radii_mm: asArray(p.corner_radii_mm).map(asNum).filter((x) => x != null),
    confidence: clamp01(p.confidence),
  };
}

function extractSurfaceFinish(s) {
  if (!s || typeof s !== "object") return null;
  const ra = asNum(s.ra_um);
  const raw = asStr(s.raw_text);
  if (ra == null && raw == null) return null;
  return { ra_um: ra, location: asStr(s.location), raw_text: raw };
}

function extractTitleBlock(tb) {
  const o = asObject(tb);
  return {
    part_number: asStr(o.part_number),
    revision: asStr(o.revision),
    drawing_number: asStr(o.drawing_number),
    title: asStr(o.title),
    material: asStr(o.material),
    finish: asStr(o.finish),
    scale: asStr(o.scale),
    units: normalizeUnit(o.units) || (o.units == null ? null : "mixed"),
    general_tolerance: asStr(o.general_tolerance),
    third_angle: o.third_angle === true ? true : (o.third_angle === false ? false : null),
  };
}

/**
 * Parse the model's response into the rich BlueprintExtraction shape.
 *
 * @param {string} rawText
 * @param {{assumeUnits?: string}} [opts]  caller fallback for dims with no unit
 *        (e.g. "in" for the all-inch JM corpus). When set, an unresolved unit
 *        is converted AND flagged unit_assumed=true — never silent.
 * @returns {{success:boolean, error:(string|null), extraction:(object|null)}}
 */
export function parseVisionResponse(rawText, opts = {}) {
  if (typeof rawText !== "string" || !rawText) {
    return { success: false, error: "empty response", extraction: null };
  }
  const assumeUnits = normalizeUnit(opts.assumeUnits);
  let jsonText = rawText.trim();
  // Strip markdown code fences.
  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonText = fenceMatch[1].trim();
  // Sanitize small-VLM placeholder echoes that produce invalid JSON.
  jsonText = jsonText.replace(/(\"confidence\"\s*:\s*)0\.0-1\.0/g, "$10.5");
  jsonText = jsonText.replace(/<mm>/g, "0");
  // Leading-dot decimals: VLMs frequently emit engineering notation `.171` (no leading zero)
  // for sub-1 nominals/tolerances — valid manufacturing shorthand but INVALID JSON, which
  // previously made JSON.parse throw away the ENTIRE extraction (a whole print of dims lost over
  // one number — observed live 2026-06-04, qwen2.5vl:7b "nominal": .171). repairLeadingDotDecimals
  // is STRING-AWARE: it inserts the zero only for a leading-dot number OUTSIDE any JSON string, so
  // verbatim raw_text/notes content (e.g. a scale ratio "1:.5" or a list "[.5]") is preserved
  // exactly — a naive regex would corrupt those (the dimension values are never inside strings).
  jsonText = repairLeadingDotDecimals(jsonText);

  // The rich contract is a single object. Tolerate an array wrapper (take the
  // richest / first object) for robustness, but the object path is primary.
  let parsed = null;
  const objStart = jsonText.indexOf("{");
  const arrStart = jsonText.indexOf("[");
  if (arrStart >= 0 && (objStart < 0 || arrStart < objStart)) {
    // array-leading: parse (with repair), then pick the first object element.
    let arr = tryParseWithRepair(jsonText.slice(arrStart));
    if (Array.isArray(arr)) {
      parsed = arr.find((e) => e && typeof e === "object" && !Array.isArray(e)) || null;
    }
  }
  if (parsed == null) {
    if (objStart < 0) return { success: false, error: "no JSON object found in response", extraction: null };
    const braceEnd = jsonText.lastIndexOf("}");
    if (braceEnd <= objStart) return { success: false, error: "unbalanced object braces", extraction: null };
    const slice = jsonText.slice(objStart, braceEnd + 1);
    try {
      parsed = JSON.parse(slice);
    } catch (e) {
      const repaired = repairTruncatedJson(jsonText.slice(objStart));
      if (repaired) {
        // Re-apply the leading-dot fix AFTER truncation repair (structure-first,
        // then notation). The line-307 pass BAILS on a truncated response (its
        // unterminated trailing string trips repairLeadingDotDecimals' fail-safe
        // return), so `.86`-style value-position decimals survive into here and
        // would lose the ENTIRE extraction (a whole print of dims over one number
        // — the exact silent-loss class of the 2026-06-04 regression, one truncation
        // deeper). repairTruncatedJson has now closed the string + braces, so this
        // pass no longer bails and recovers every complete dim before the cut.
        try { parsed = JSON.parse(repairLeadingDotDecimals(repaired)); } catch (e2) {
          return { success: false, error: "JSON parse (object, repair failed): " + (e2 instanceof Error ? e2.message : String(e2)), extraction: null };
        }
      } else {
        return { success: false, error: "JSON parse: " + (e instanceof Error ? e.message : String(e)), extraction: null };
      }
    }
  }
  if (!parsed || typeof parsed !== "object") {
    return { success: false, error: "parsed not an object", extraction: null };
  }

  const titleBlock = extractTitleBlock(parsed.title_block);
  const drawingUnits = titleBlock.units; // "in" | "mm" | "mixed" | null
  const dimDrawingUnits = drawingUnits === "in" || drawingUnits === "mm" ? drawingUnits : null;

  const dimensions = asArray(parsed.dimensions).map((d) => extractDimension(d, dimDrawingUnits, assumeUnits)).filter(Boolean);
  const gdt = asArray(parsed.gdt).map(extractGdt).filter(Boolean);
  const notes = asArray(parsed.notes).map(extractNote).filter(Boolean);
  const profiles = asArray(parsed.profiles).map(extractProfile).filter(Boolean);
  const surfaceFinishes = asArray(parsed.surface_finishes).map(extractSurfaceFinish).filter(Boolean);

  const pb = asObject(parsed.part_bounds_mm);
  const partBounds = (pb.width != null || pb.height != null || pb.depth != null)
    ? { width: asNum(pb.width), height: asNum(pb.height), depth: asNum(pb.depth) }
    : null;

  const overallConf = clamp01(parsed.confidence);
  const resolvedCount = dimensions.filter((d) => d.unit_resolved).length;

  return {
    success: true,
    error: null,
    extraction: {
      confidence: overallConf != null ? overallConf : 0.5,
      units: drawingUnits,
      title_block: titleBlock,
      dimensions,
      gdt,
      notes,
      profiles,
      part_bounds_mm: partBounds,
      thickness_mm: asNum(parsed.thickness_mm),
      surface_finishes: surfaceFinishes,
      unit_resolution: {
        drawing_units: drawingUnits,
        assume_units: assumeUnits,
        dimensions_total: dimensions.length,
        dimensions_unit_resolved: resolvedCount,
      },
      source: "ollama-vision",
    },
  };
}

export function buildOllamaRequestBody(prompt, imageBase64, opts = {}) {
  const model = typeof opts.model === "string" && opts.model ? opts.model : DEFAULT_VISION_MODEL;
  return {
    model,
    prompt,
    images: [imageBase64],
    stream: false,
    // think:false disables chain-of-thought reasoning on hybrid "thinking" VLMs
    // (qwen3-vl emits a long <think> chain by DEFAULT — for the rich extraction
    // prompt that reasoning blows past the 180s timeout even though the model is
    // GPU-resident and fast at ~100 tok/s). For OCR we want the direct JSON, never
    // a reasoning trace. Ollama IGNORES this field for non-thinking models
    // (qwen2.5vl), so it is a safe no-op there. Caller can re-enable via opts.think.
    think: opts.think === undefined ? false : opts.think,
    options: {
      temperature: 0.1,
      // num_predict 4096: the rich multi-zone schema (title_block + dimensions +
      // gdt + notes + profiles + surface_finishes) is far longer than the old
      // dims-only output; 2048 truncated dense drawings mid-list (repairTruncatedJson
      // is the safety net, but more headroom means fewer truncations to repair).
      num_predict: 4096,
      // num_ctx 8192 — fits the default qwen3-vl:8b-instruct at 8.1GB GPU-RESIDENT
      // (size_vram==size in /api/ps) on a 16GB card with the chat fleet running.
      // Footprint is NOT KV-dominated for this model: ctx8192→14.3GB vs ctx3072→
      // 14.3GB was measured for qwen2.5vl:7b (the old default — a ~13.7GB weights+
      // graph FLOOR that spilled to CPU → >180s/page; that is why the default moved
      // to qwen3-vl-instruct). For qwen3-vl-instruct 8192 leaves ample room for the
      // ~1950 vision-tokens (130dpi) + prompt + the rich JSON output. Caller can
      // override via modelOptions (lower only helps the old qwen2.5vl path).
      num_ctx: 8192,
      ...(opts.modelOptions || {}),
    },
  };
}

/**
 * Repair the non-JSON numeric leading tokens VLMs emit in engineering notation, OUTSIDE
 * JSON string literals:
 *   - leading-dot decimals   `.171`  → `0.171`   (sub-1 nominals/tolerances)
 *   - leading-plus signs     `+0.015`→ `0.015`   (the `+` of a `±0.015` tolerance — JSON
 *                                                 allows a leading `-` but NEVER a leading `+`)
 *   - the combination        `+.015` → `0.015`
 * Both forms are valid manufacturing shorthand but INVALID JSON, and either one previously made
 * JSON.parse throw away the ENTIRE extraction (a whole print of dims lost over one number —
 * observed live 2026-06-04 `.171`, 2026-06-06 `+0.015`, both qwen2.5vl:7b).
 *
 * STRING-AWARE single pass: tracks in-string state (honoring `\` escapes) so a leading dot/plus
 * inside verbatim content — a `raw_text` scale ratio `"1:.5"`, `"[.5]"`, or `"Ø86 +0.015"` — is
 * left byte-for-byte intact (dimension VALUES are bare numbers, never inside strings). A token is
 * repaired only in VALUE POSITION — its prior non-whitespace char is `:` / `,` / `[` (or start):
 *   - a dot gets a `0.` only when NOT preceded (ignoring one optional sign) by a digit or another
 *     dot and IS followed by a digit — so `1.5`, object-key dots, `..5`/`5.` are never altered.
 *   - a `+` is dropped only when followed by a digit-or-dot AND in value position — so an exponent
 *     `1.5e+3` (prev = `e`, not value-position) is preserved; only the forbidden leading `+` goes.
 *
 * @param {string} text
 * @returns {string}
 */
export function repairLeadingDotDecimals(text) {
  if (typeof text !== "string" || (text.indexOf(".") < 0 && text.indexOf("+") < 0)) return text;
  let out = "";
  let inStr = false, esc = false;
  /** True iff the prior non-whitespace char already emitted to `out` is a JSON value-opener
   *  (`:` `,` `[`) or the string start — i.e. a number begins here. */
  const inValuePosition = () => {
    let j = out.length - 1;
    while (j >= 0 && (out[j] === " " || out[j] === "\t" || out[j] === "\n" || out[j] === "\r")) j--;
    const prev = j >= 0 ? out[j] : "";
    return prev === "" || prev === ":" || prev === "," || prev === "[";
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      out += c;
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; out += c; continue; }
    // Drop a forbidden leading '+' (value position, before a digit or dot). A following '.'
    // gets its leading zero on the next iteration (`+.015` → drop '+' → `.015` → `0.015`).
    if (c === "+" && i + 1 < text.length) {
      const nxt = text[i + 1];
      const nxtIsNumStart = (nxt >= "0" && nxt <= "9") || nxt === ".";
      if (nxtIsNumStart && inValuePosition()) continue;
    }
    if (c === "." && i + 1 < text.length) {
      const nxt = text[i + 1];
      if (nxt >= "0" && nxt <= "9") {
        // walk back over one optional sign + whitespace already emitted to find the prior token
        let j = out.length - 1;
        if (out[j] === "-" || out[j] === "+") j--;
        while (j >= 0 && (out[j] === " " || out[j] === "\t" || out[j] === "\n" || out[j] === "\r")) j--;
        const prev = j >= 0 ? out[j] : "";
        const prevIsDigit = prev >= "0" && prev <= "9";
        if (!prevIsDigit && prev !== ".") { out += "0."; continue; }
      }
    }
    out += c;
  }
  // Unterminated string ⇒ the input was malformed before our pass; return original untouched
  // so the truncation-repair / loud-failure path handles it rather than a half-edited string.
  return inStr ? text : out;
}

/** Parse text as JSON, with a truncation-repair fallback. Returns null on failure. Internal. */
function tryParseWithRepair(text) {
  try { return JSON.parse(text); } catch { /* fall through */ }
  const repaired = repairTruncatedJson(text);
  // Leading-dot repair AFTER truncation repair (same structure-first ordering as
  // the object path): the array wrapper of a truncated dense print otherwise loses
  // every element over a single `.86`-style value the bailed line-307 pass skipped.
  if (repaired) { try { return JSON.parse(repairLeadingDotDecimals(repaired)); } catch { /* give up */ } }
  return null;
}

/**
 * Attempt to repair a truncated array-or-object JSON string by closing it at
 * the last complete top-level value. Returns the repaired string, or null if
 * the input was beyond repair. (Unchanged from U-TDP06 — the rich object path
 * relies on it for dense drawings whose dimension list got cut off.)
 *
 * @param {string} text
 * @returns {string|null}
 */
export function repairTruncatedJson(text) {
  if (typeof text !== "string" || text.length < 3) return null;
  const stack = [];
  let inStr = false;
  let escape = false;
  let lastSafeIdx = -1;
  let outerKind = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "[" || c === "{") {
      if (stack.length === 0) outerKind = c;
      stack.push(c);
    } else if (c === "]" || c === "}") {
      stack.pop();
      if (stack.length === 1 && outerKind === "[") {
        lastSafeIdx = i;
      } else if (stack.length === 0) {
        return text.slice(0, i + 1);
      }
    }
  }
  if (outerKind === "[" && lastSafeIdx >= 0) {
    return text.slice(0, lastSafeIdx + 1) + "]";
  }
  if (stack.length > 0) {
    // Close an unterminated TRAILING string literal before the brackets. A print
    // truncated mid-`raw_text`/note leaves inStr open; appending only brackets
    // yields `..."DIA .25}]}` — still invalid (the string never closes), which
    // both defeats JSON.parse AND keeps a downstream leading-dot pass bailing. The
    // closing quote salvages every complete value before the cut (dimension nominals
    // are bare numbers, never inside strings, so closing the partial string can never
    // truncate a real dim value). Best-effort: a mid-KEY cut still fails loud below.
    let body = text;
    let suffix = "";
    if (inStr) {
      // A cut landing on a dangling escape (odd trailing `\` — a Windows path or an
      // escaped inch-quote `\"` in raw_text) would let that backslash escape our
      // closing quote, leaving the string STILL open → whole extraction lost. Drop the
      // lone backslash first so the quote truly terminates the string and prior dims recover.
      if (escape) body = body.slice(0, -1);
      suffix = '"';
    }
    for (let i = stack.length - 1; i >= 0; i--) {
      suffix += stack[i] === "[" ? "]" : "}";
    }
    return body + suffix;
  }
  return null;
}
