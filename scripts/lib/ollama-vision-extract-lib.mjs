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
 * @param {{targetKinds?:string[], wireEdm?:boolean, readingGuidance?:string}} [opts]
 *   readingGuidance: an OPTIONAL pre-built domain reading-guidance block (from
 *   blueprint-reading-knowledge.mjs buildReadingGuidanceBlock) appended verbatim. Empty/absent =>
 *   byte-identical base prompt (no regression). Ties shop-floor tribal + ASME Y14.5 priors into the read.
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
    "- GD&T FEATURE CONTROL FRAMES read LEFT-TO-RIGHT in this fixed ASME Y14.5 order: [1] the geometric characteristic symbol -> set \"symbol\" to one of the listed names; [2] the tolerance zone -- a LEADING DIAMETER SYMBOL means a cylindrical/diametral zone, then the tolerance value -> \"tolerance_value\"; [3] an OPTIONAL material modifier (a circled M = MMC, a circled L = LMC, none = RFS) -> \"material_condition\"; [4] the datum references in order primary|secondary|tertiary, each in its own compartment -> \"datum_references\" as [\"A\",\"B\",\"C\"] IN THAT ORDER. Copy the whole frame verbatim into raw_text.",
    "- FORM tolerances (flatness, straightness, circularity, cylindricity) take NO datum -> datum_references = []. LOCATION/ORIENTATION/RUNOUT (position, perpendicularity, parallelism, angularity, concentricity, symmetry, circular_runout, total_runout) REQUIRE at least one datum. If such a symbol appears with no datum, still report it (raw_text) -- do NOT invent a datum.",
    "- thickness_mm is the stock/part thickness (critical for wire EDM).",
    "- confidence is ONE decimal in [0,1] per field reflecting how certain you are. Use 0 if you genuinely cannot tell. NEVER a range, NEVER a placeholder string.",
    "- If you cannot determine a value, use null — do NOT guess.",
    "- BORES / HOLES OFTEN HAVE MORE THAN ONE DIAMETER along their axis -- a stepped bore, a counterbore, or a through-bore that steps DOWN to a SMALLER diameter on the FAR / OPPOSITE side. Report EVERY diameter of such a feature as its own \"diameter\" dimension (the large ID AND the smaller far-side ID), not just the largest or nearest one. In a section/cross-section view, read the bore through from BOTH ends -- the smaller back-side ID is easy to miss.",
    "- CAPTURE TRANSITION / LEAD-IN / COUNTERBORE CHAMFERS: a chamfer in the MIDDLE of a bore that leads from a larger diameter into a smaller one (a lead-in to the smaller ID) is a real dimension -- emit it as type \"chamfer\" with its angle and size as shown. Do not skip an internal chamfer just because it sits between two diameters.",
    "- Anti-hallucination guard (still applies): report ONLY diameters and chamfers ACTUALLY shown/dimensioned on the drawing. If a second diameter or a chamfer is present geometrically but NOT dimensioned, do not invent a number -- omit it or set its nominal null and lower the confidence.",
    "- Return ONLY the JSON object. No prose, no markdown fences, no array wrapping.",
  ];
  if (opts.wireEdm) {
    lines.push(
      "",
      "This blueprint is for WIRE EDM cutting. Pay special attention to internal profiles/cavities, through-features (the wire cuts the full thickness), corner radii (sets minimum wire diameter), surface finish (sets skim passes), material hardness (HRC), taper angles, and start-hole locations."
    );
  }
  // U-XRAY-READING-KNOWLEDGE: append the curated domain reading-guidance block (tribal + ASME Y14.5
  // priors) when the caller supplies one. Empty/absent => byte-identical base prompt (opt-in, no regression).
  if (typeof opts.readingGuidance === "string" && opts.readingGuidance.trim()) {
    lines.push("", opts.readingGuidance.trim());
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

// -- surface-finish callout normalization (U-XRAY-SURFACE-FINISH-NORMALIZE) --
// VLMs frequently emit a surface-finish callout as TEXT ("63 RMS", "125 uin", "N6",
// "Ra 0.8") rather than a clean numeric ra_um. extractSurfaceFinish previously read
// ONLY a numeric ra_um, silently dropping every text callout -- a recall leak on the
// operator's "missed callouts" class. This pure normalizer parses the common notations
// into a canonical Ra in micrometres so BOTH the live OCR adapter and the closed-loop
// grinder recover them. Conversions are exact / chart-canonical (no fabrication):
//   microinch -> micrometre: x (MM_PER_INCH/1000) = x0.0254 (63 uin = 1.6002 um, the chart value).
//   RMS: the printed RMS number is taken as its microinch Ra-equivalent per shop
//     convention (ASME B46.1 deprecated RMS; charts equate "63 RMS" = 1.6 um = 63 uin Ra).
//     The nominal Rq/Ra~1.11 relation is NOT applied to a drawing callout (a callout is a
//     spec, not a measured Rq) -- system:"RMS" is recorded so a consumer may apply it.
//   ISO N-grades N1..N12 -> fixed Ra um table (ISO 1302).
// A BARE number with NO unit token is disambiguated by the ISO preferred-value series
// (a bare "0.8" is um-preferred -> um; "32"/"63" are uin-preferred -> uin) and flagged
// assumed:true; a bare number in NEITHER series (e.g. "10") stays resolved:false -- never
// a silent guess (same discipline as convertToMm). The regexes match both micron signs
// a VLM may emit: MICRO SIGN (U+00B5) and GREEK SMALL MU (U+03BC).

/** ISO 1302 N-grade -> Ra micrometres. */
export const ISO_N_GRADE_RA_UM = Object.freeze({
  N1: 0.025, N2: 0.05, N3: 0.1, N4: 0.2, N5: 0.4, N6: 0.8,
  N7: 1.6, N8: 3.2, N9: 6.3, N10: 12.5, N11: 25, N12: 50,
});
// ISO preferred Ra series (the values drawings actually print) -- used ONLY to
// disambiguate a bare, unit-less number. No value is in both sets.
const RA_UM_PREFERRED = new Set([0.025, 0.05, 0.1, 0.2, 0.4, 0.8, 1.6, 3.2, 6.3, 12.5, 25, 50]);
const RA_UIN_PREFERRED = new Set([1, 2, 4, 8, 16, 32, 63, 125, 250, 500, 1000, 2000]);
const round4 = (n) => Math.round(n * 1e4) / 1e4;

/**
 * Pure: parse a surface-finish callout string into a canonical Ra in micrometres.
 * @param {string} raw  the callout text, e.g. "63 RMS", "Ra 0.8 um", "N6", "125 uin".
 * @returns {{ra_um:(number|null), system:(string|null), resolved:boolean, assumed:boolean, raw:(string|null), note?:string}}
 *   system: "Ra-um" | "Ra-uin" | "RMS" | "ISO-N" | null. resolved=false means the value
 *   could not be safely determined (ra_um=null) -- never silently assumed.
 */
export function normalizeSurfaceFinish(raw) {
  if (raw == null) return { ra_um: null, system: null, resolved: false, assumed: false, raw: null };
  const s = String(raw).trim();
  if (!s) return { ra_um: null, system: null, resolved: false, assumed: false, raw: null };
  const lower = s.toLowerCase();
  const uin = (v) => round4((v * MM_PER_INCH) / 1000); // microinch -> micrometre

  // ISO N-grade (N1..N12 only) -- word-position, not part of a longer alphanumeric token.
  const nGrade = lower.match(/(?:^|[^a-z0-9])n\s?(1[0-2]|[1-9])(?![0-9])/);
  if (nGrade) {
    const ra = ISO_N_GRADE_RA_UM["N" + nGrade[1]];
    if (ra != null) return { ra_um: ra, system: "ISO-N", resolved: true, assumed: false, raw: s };
  }

  // first numeric token (tolerate leading-dot decimals ".8" AND a leading minus so a
  // negative callout is CAPTURED -> the value<0 guard below rejects it, never sign-flips it).
  const numMatch = s.match(/-?\d*\.?\d+/);
  if (!numMatch) return { ra_um: null, system: null, resolved: false, assumed: false, raw: s, note: "no numeric value" };
  const value = Number(numMatch[0]);
  if (!Number.isFinite(value) || value < 0) {
    return { ra_um: null, system: null, resolved: false, assumed: false, raw: s, note: "non-finite value" };
  }

  // Unit detection (number-anchored / both micron signs). Explicit um/uin tokens WIN over the
  // RMS shorthand so "Rq 0.4 um" / "0.8 um RMS" resolve as micrometre, not microinch-scaled.
  const hasRms = /\brms\b|\brq\b/.test(lower);
  const hasMicroinch = /(?:µ|μ|u)\s?in\b/.test(lower) || /micro\s?-?inch/.test(lower) || /(?:µ|u)"/.test(lower);
  const hasMicron = /(?:µ|μ|u)m\b/.test(lower) || /micron|micromet/.test(lower);

  if (hasMicroinch) return { ra_um: uin(value), system: "Ra-uin", resolved: true, assumed: false, raw: s };
  if (hasMicron) return { ra_um: round4(value), system: "Ra-um", resolved: true, assumed: false, raw: s };
  if (hasRms) {
    return { ra_um: uin(value), system: "RMS", resolved: true, assumed: false, raw: s, note: "RMS number taken as microinch Ra-equivalent (ASME B46.1)" };
  }

  // Bare number, no explicit unit -- disambiguate via the ISO preferred series (flagged assumed).
  if (RA_UM_PREFERRED.has(value)) return { ra_um: round4(value), system: "Ra-um", resolved: true, assumed: true, raw: s, note: "no unit; um-preferred series" };
  if (RA_UIN_PREFERRED.has(value)) return { ra_um: uin(value), system: "Ra-uin", resolved: true, assumed: true, raw: s, note: "no unit; uin-preferred series" };
  if (value > 50) return { ra_um: uin(value), system: "Ra-uin", resolved: true, assumed: true, raw: s, note: "no unit; >50 so microinch (um Ra never exceeds 50 on a machined surface)" };
  return { ra_um: null, system: null, resolved: false, assumed: false, raw: s, note: "ambiguous unit (um vs uin) -- not assumed" };
}

// ISO 261 coarse-thread pitch (mm) by metric nominal major diameter (mm) -- the pitch a bare "M6"
// callout implies. Used ONLY to fill a MISSING pitch (flagged assumed); an explicit MxP always wins.
const M_COARSE_PITCH_MM = Object.freeze({
  1.6: 0.35, 2: 0.4, 2.5: 0.45, 3: 0.5, 3.5: 0.6, 4: 0.7, 5: 0.8, 6: 1.0,
  8: 1.25, 10: 1.5, 12: 1.75, 14: 2.0, 16: 2.0, 18: 2.5, 20: 2.5, 24: 3.0,
});
// ASME B1.1 / B18.6.3 machine-screw nominal MAJOR diameter (inch) by number size (#0..#12).
const SCREW_MAJOR_DIA_IN = Object.freeze({
  0: 0.06, 1: 0.073, 2: 0.086, 3: 0.099, 4: 0.112, 5: 0.125, 6: 0.138, 8: 0.164, 10: 0.19, 12: 0.216,
});

/** Pure: fractional-inch token ("1/4", "27/64") -> decimal inch, else null. Local (no cross-lib import). */
function fracInch(tok) {
  const m = String(tok == null ? "" : tok).match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]), d = Number(m[2]);
  return d > 0 ? round4(n / d) : null;
}

/**
 * Pure: parse a THREAD callout into a canonical, machine-usable spec. Threads are the most common
 * blueprint callout and the VLM frequently garbles them (letter O for 0, unicode dash for hyphen,
 * multiplication-sign for x). This de-garbles + resolves the major diameter so downstream (quote/cam
 * tapping ops) gets a clean spec instead of raw text. Handles Unified inch ("1/4-20 UNC-2B", ".250-20",
 * "#10-32 UNF", "1-8 UNC"), metric ("M6x1.0", "M6", "M10X1.5-6H"), and NPT pipe ("1/4-18 NPT", "1/8 NPT").
 * SELF-SAFE: a bare integer-integer ("1-2", "10-32") with NO series keyword / class / fractional|screw
 * size is NOT a thread (could be a range) -> resolved=false; never fabricated (R12).
 * @param {string} raw  e.g. "1/4-20 UNC-2B", "M6x1.0", "1/4 NPT"
 * @returns {{system:(string|null), series:(string|null), major_dia_in:(number|null), tpi:(number|null),
 *            pitch_mm:(number|null), class:(string|null), resolved:boolean, assumed:boolean, raw:(string|null), note?:string}}
 */
export function normalizeThreadCallout(raw) {
  const NIL = { system: null, series: null, major_dia_in: null, tpi: null, pitch_mm: null, class: null, resolved: false, assumed: false, raw: null };
  if (raw == null) return { ...NIL };
  let s = String(raw).trim();
  if (!s) return { ...NIL };
  // de-garble: any unicode dash (Pd category) -> hyphen, multiplication-sign -> x, collapse whitespace.
  s = s.replace(/\p{Pd}/gu, "-").replace(/×/gi, "x").replace(/\s+/g, " ").trim();
  const U = s.toUpperCase();
  // material/grade guard (R12 -- never fabricate a thread from a material designation): a tool-steel grade
  // or hardness spec ("M2 STEEL", "M2 TOOL STEEL", "D2 RC60", "HSS") is NOT a thread even though "M2"
  // matches the metric pattern. Thread callouts never carry these words. JM Die runs M2/A2/D2 tool steels.
  if (/\bSTEEL\b|\bHSS\b|\bCARBIDE\b|\bAISI\b|\bHARDNESS\b|\bHARDEN(?:ED)?\b|\bH?RC\b|\bTOOL\b|\bMATERIAL\b|\bMAT'?L\b/.test(U)) {
    return { ...NIL, raw: s, note: "material/grade keyword present -- not a thread" };
  }

  // METRIC: M<major>[xP][-class]. A bare "M6" implies the ISO-261 coarse pitch (flagged assumed).
  const mm = U.match(/\bM\s*(\d+(?:\.\d+)?)(?:\s*X\s*(\d+(?:\.\d+)?))?(?:\s*-\s*(\d[A-Z]+\d?[A-Z]?))?\b/);
  if (mm && !/\bMIN\b|\bMAX\b/.test(U)) {
    const majorMm = Number(mm[1]);
    let pitchMm = mm[2] != null ? Number(mm[2]) : null;
    let assumed = false;
    if (pitchMm == null) { pitchMm = M_COARSE_PITCH_MM[majorMm] ?? null; assumed = pitchMm != null; }
    return {
      system: "metric", series: "M", major_dia_in: majorMm > 0 ? round4(majorMm / MM_PER_INCH) : null,
      tpi: null, pitch_mm: pitchMm, class: mm[3] || null, resolved: majorMm > 0, assumed, raw: s,
      note: assumed ? "pitch from ISO 261 coarse (no explicit pitch)" : undefined,
    };
  }

  // NPT/NPTF pipe: nominal pipe size is NOT the thread major diameter -> major_dia_in null (honest).
  if (/\bNPTF?\b/.test(U)) {
    const series = /\bNPTF\b/.test(U) ? "NPTF" : "NPT";
    const tpiM = U.match(/-\s*(\d{1,2})\s*NPT/);
    return {
      system: "npt", series, major_dia_in: null, tpi: tpiM ? Number(tpiM[1]) : null, pitch_mm: null,
      class: null, resolved: true, assumed: false, raw: s, note: "NPT nominal size is not the thread major diameter",
    };
  }

  // UNIFIED inch: <size>-<tpi> [series] [class]. size = fraction (1/4), decimal (.250), screw (#10), int (1).
  const uni = U.match(/(#\s*\d{1,2}|\d+\s*\/\s*\d+|\d*\.\d+|\d+)\s*-\s*(\d{1,2})(?:\s*(UNEF|UNF|UNC|UNS|UN))?(?:\s*-?\s*(\d[AB]))?/);
  if (uni) {
    const sizeTok = uni[1].replace(/\s+/g, "");
    const hasSeries = uni[3] != null, hasClass = uni[4] != null;
    const strongSize = sizeTok.startsWith("#") || sizeTok.includes("/") || sizeTok.includes(".");
    // self-safe: a bare integer-integer with no series/class/fraction/screw is a RANGE, not a thread.
    if (strongSize || hasSeries || hasClass) {
      const tpi = Number(uni[2]);
      let majorIn = null;
      if (sizeTok.startsWith("#")) majorIn = SCREW_MAJOR_DIA_IN[Number(sizeTok.slice(1))] ?? null;
      else if (sizeTok.includes("/")) majorIn = fracInch(sizeTok);
      else {
        // a bare integer in the #0..#12 range with a SCREW-class tpi (>=16) is a NUMBER screw written
        // without the '#' ("10-24 UNC" = #10 .190in, not a 10-INCH thread which does not exist); a LOW
        // tpi (<16) on a small integer is a fractional-INCH thread ("1-8 UNC" = 1in). Disambiguate by tpi.
        const n = Number(sizeTok);
        majorIn = (Number.isInteger(n) && n >= 0 && n <= 12 && SCREW_MAJOR_DIA_IN[n] != null && tpi >= 16)
          ? SCREW_MAJOR_DIA_IN[n] : n;
      }
      // a thread major beyond ~4in does not exist on a machined part -- a bare integer like "14-20" is a
      // range/part-number, not a 14-inch thread (P2 sanity bound).
      if (majorIn != null && majorIn > 0 && majorIn <= 4 && tpi > 0) {
        return {
          system: "unified", series: hasSeries ? uni[3] : "UN", major_dia_in: round4(majorIn), tpi,
          pitch_mm: null, class: uni[4] || null, resolved: true, assumed: !hasSeries, raw: s,
          note: hasSeries ? undefined : "series (UNC/UNF) not stated",
        };
      }
    }
  }
  return { ...NIL, raw: s, note: "not a recognized thread callout" };
}

/**
 * Resolve a thread enrichment for a dimension ONLY when the context indicates a thread -- the dim type is
 * thread-ish, OR the raw_text carries a thread signature (metric MxP, a Unified series keyword, NPT, or a
 * fraction/screw-dash-tpi). This gate (beyond normalizeThreadCallout's self-safety) keeps a plain linear
 * "1-2" dim from ever being probed as a thread. Returns the resolved spec or null.
 */
function maybeThread(type, rawText) {
  if (!rawText) return null;
  const t = String(type || "").toLowerCase();
  const isThreadType = t === "thread" || t === "tapped_hole" || t === "thread_callout" || t === "tap";
  const up = rawText.toUpperCase();
  const looksThread = /\bM\s*\d/.test(up) || /\bUN(C|F|EF|S)?\b/.test(up) || /\bNPTF?\b/.test(up)
    || /(?:\d\s*\/\s*\d+|#\s*\d{1,2})\s*-\s*\d/.test(rawText);
  if (!isThreadType && !looksThread) return null;
  const spec = normalizeThreadCallout(rawText);
  return spec.resolved ? spec : null;
}

// Chamfer-angle plausibility bounds for the no-DEG "X <n>" shorthand: below MIN a 2-digit int is a leg
// size (.xx"), above MAX it is not a physical edge-break angle. Common chamfer angles (45/60/82/90/118/120).
const CHAMFER_ANGLE_MIN_DEG = 15;
const CHAMFER_ANGLE_MAX_DEG = 120;

/**
 * Pure: parse a CHAMFER / COUNTERSINK callout into a canonical spec. Both are ubiquitous machined edge
 * features the VLM emits as free text ("82 DEG CSK .375", ".03 X 45 CHAMFER"). KEYWORD-GATED on purpose
 * (R12): the bare "<a> X <b>" chamfer notation is overloaded -- "2 X .500 DRILL" is a QUANTITY x size,
 * not a chamfer -- so this requires an explicit CSK/C'SINK/COUNTERSINK or CHAMFER keyword and never
 * fabricates a feature from a bare X-pair. The angle is the integer before DEG (82/90/100/118/120); a
 * chamfer with NO stated angle returns angle_deg=null (the 45deg convention is the consumer's to apply,
 * not fabricated here). resolved=false when not a recognizable chamfer/csk.
 * @param {string} raw  e.g. "82 DEG CSK .375", ".03 X 45 CHAMFER"
 * @returns {{type:('chamfer'|'countersink'|null), angle_deg:(number|null), diameter_in:(number|null),
 *            size_in:(number|null), resolved:boolean, raw:(string|null)}}
 */
export function normalizeChamferCallout(raw) {
  const NIL = { type: null, angle_deg: null, diameter_in: null, size_in: null, resolved: false, raw: null };
  if (raw == null) return { ...NIL };
  const s = String(raw).replace(/\p{Pd}/gu, "-").replace(/\s+/g, " ").trim();
  if (!s) return { ...NIL };
  const U = s.toUpperCase();
  // included angle: a 2-3 digit INTEGER immediately before DEG/DEGREE (never a decimal dimension).
  const angleM = U.match(/(\d{2,3})\s*(?:DEG|DEGREE)/);
  const angle = angleM ? Number(angleM[1]) : null;
  // plausible diameter/leg decimals (0 < v < 20in); an integer like the angle is excluded (needs a point).
  const decs = (U.match(/\d*\.\d+/g) || []).map(Number).filter((v) => v > 0 && v < 20);
  // COUNTERSINK -- a diameter-dimensioned conical recess. Keyword required.
  if (/\bCSK\b|C['` ]?\s*SINK|COUNTERSINK|\bC['` ]?SK\b/.test(U)) {
    const dia = decs.length ? Math.max(...decs) : null; // the csk diameter is the larger decimal
    return { type: "countersink", angle_deg: angle, diameter_in: dia, size_in: null, resolved: dia != null || angle != null, raw: s };
  }
  // CHAMFER -- an edge break, leg size + optional angle. Keyword required.
  if (/\bCHAMF/.test(U)) {
    const size = decs.length ? Math.min(...decs) : null; // the chamfer leg is the smaller decimal
    // angle: prefer the explicit "<n> DEG"; else the bare INTEGER in an X-pair ("0.03 X 45" or "45 X .03"),
    // the common chamfer shorthand with no DEG token. The DECIMAL is always the leg size, so the
    // lookarounds (?!\d*\.) / (?<![.\d]) exclude a decimal's digits -- a size like ".03" can never be read
    // as the angle, and a size-X-size pair (".250 X .125") fabricates no angle (R12). Bounded MIN..MAX.
    let ang = angle;
    if (ang == null) {
      const xAng = U.match(/X\s*(?!\d*\.)(\d{2,3})\b|(?<![.\d])(\d{2,3})(?!\.)\s*X/);
      if (xAng) {
        const v = Number(xAng[1] ?? xAng[2]);
        if (v >= CHAMFER_ANGLE_MIN_DEG && v <= CHAMFER_ANGLE_MAX_DEG) ang = v;
      }
    }
    return { type: "chamfer", angle_deg: ang, diameter_in: null, size_in: size, resolved: size != null || ang != null, raw: s };
  }
  return { ...NIL, raw: s };
}

/** Resolve a chamfer/csk enrichment ONLY when the dim type or raw_text carries a chamfer/csk signal. */
function maybeChamfer(type, rawText) {
  if (!rawText) return null;
  const t = String(type || "").toLowerCase();
  const isChamferType = t === "chamfer" || t === "countersink" || t === "csk";
  const up = rawText.toUpperCase();
  const looksChamfer = /\bCSK\b|C['` ]?\s*SINK|COUNTERSINK|\bCHAMF/.test(up);
  if (!isChamferType && !looksChamfer) return null;
  const spec = normalizeChamferCallout(rawText);
  return spec.resolved ? spec : null;
}

// -- internal extraction helpers (defensive -- tolerate missing/wrong types) --

function asArray(x) { return Array.isArray(x) ? x : []; }
function asObject(x) { return x && typeof x === "object" && !Array.isArray(x) ? x : {}; }
function asStr(x) { return typeof x === "string" && x ? x : null; }
function asNum(x) { const n = Number(x); return Number.isFinite(n) ? n : null; }
function clamp01(x) { const n = Number(x); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : null; }
// surface_finish_ra may arrive numeric OR as a callout string ("63 RMS", "N6") -> normalize to Ra um.
function sfRaValue(x) {
  const n = asNum(x);
  if (n != null) return n;
  if (typeof x === "string" && x) {
    const norm = normalizeSurfaceFinish(x);
    if (norm.resolved) return norm.ra_um;
  }
  return null;
}

function extractDimension(d, drawingUnits, assumeUnits, forceUnits) {
  if (!d || typeof d !== "object") return null;
  const type = asStr(d.type) || asStr(d.kind); // tolerate legacy "kind"
  const rawNominal = asNum(d.nominal);
  const rawText = asStr(d.raw_text);
  // keep a dim that carries at least one signal
  if (type == null && rawNominal == null && rawText == null) return null;
  // unit precedence: forceUnits (AUTHORITATIVE) -> per-dim unit -> drawing units -> caller fallback (assumed).
  // forceUnits overrides a per-dim unit guess AND the drawing units -- used by region tiling, where most
  // tiles lose the title block so the VLM's per-tile unit guess is unreliable and the GLOBAL unit must win.
  const fu = normalizeUnit(forceUnits);
  const forced = fu === "in" || fu === "mm" ? fu : null;
  const dimUnit = forced || normalizeUnit(d.unit) || (drawingUnits === "in" || drawingUnits === "mm" ? drawingUnits : null);
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
    surface_finish_ra: sfRaValue(d.surface_finish_ra),
    thread: maybeThread(type, rawText), // canonical thread spec when this dim is a thread callout, else null
    chamfer: maybeChamfer(type, rawText), // canonical chamfer/csk spec when this dim is a chamfer/csk callout, else null
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

/**
 * Resolve the print-level unit ANCHOR declared by ONE page's title block, read across the ensemble's
 * per-model extractions (the shape returned by runEnsembleOverImage().per_model_runs).
 *
 * WHY: the title block declares the drawing's overall unit system and lives on the title-block-bearing
 * page (usually page 1). Pages 2+ of a multi-page print LOSE it, so the VLM then GUESSES per-dim units
 * (a .94in dim mis-read as 0.94mm -> wrong-scale weak labels). A caller that OCRs a multi-page print
 * page-by-page uses this to detect the unit on the title-block page, then FORCE it on every later page
 * of the SAME print via the authoritative forceUnits channel (see pageForceUnit + extractDimension).
 *
 * Consensus rule: count only confident in/mm votes; null / "mixed" / "unknown" abstain (they are not
 * votes against). Strict majority wins. A TIE between in and mm (e.g. one model "in", one "mm") returns
 * null, so a single disagreed guess never anchors a whole print -- the page falls back to its own
 * per-page resolution. Reads extraction.units first, then title_block.units, then
 * unit_resolution.drawing_units (all carry the same value; the fallbacks tolerate shape drift).
 *
 * CORROBORATION GATE: a vote counts ONLY when the model's title_block ALSO carries an identity field
 * (part_number / drawing_number / title). A real title block essentially always has one; a dimension-only
 * continuation page (no title block) where the VLM hallucinated a bare `units` value must NOT anchor the
 * whole print -- otherwise a metric print whose page-1 is mis-read as inch would force EVERY page to inch.
 * This is what makes the anchor safe for the metric case, not just the inch-dominant JM corpus.
 *
 * @param {Array<{extraction?:({units?:string, title_block?:{units?:string, part_number?:string, drawing_number?:string, title?:string}, unit_resolution?:{drawing_units?:string}}|null)}|null>|null} perModelRuns
 * @returns {"in"|"mm"|null}
 */
export function resolvePageTitleBlockUnit(perModelRuns) {
  if (!Array.isArray(perModelRuns)) return null;
  let inVotes = 0;
  let mmVotes = 0;
  for (const r of perModelRuns) {
    const ex = r && typeof r === "object" ? r.extraction : null;
    if (!ex || typeof ex !== "object") continue;
    const tb = ex.title_block && typeof ex.title_block === "object" ? ex.title_block : null;
    const raw =
      ex.units != null ? ex.units
        : tb && tb.units != null ? tb.units
          : ex.unit_resolution && ex.unit_resolution.drawing_units != null ? ex.unit_resolution.drawing_units
            : null;
    const u = normalizeUnit(raw);
    if (u !== "in" && u !== "mm") continue;
    // corroboration: the unit must come from a REAL title block (carries an identity field), not a bare
    // hallucinated `units` on a dimension-only page.
    const corroborated = tb && (asStr(tb.part_number) || asStr(tb.drawing_number) || asStr(tb.title));
    if (!corroborated) continue;
    if (u === "in") inVotes++;
    else mmVotes++;
  }
  if (inVotes === 0 && mmVotes === 0) return null;
  if (inVotes === mmVotes) return null; // tie / conflict -> no confident anchor
  return inVotes > mmVotes ? "in" : "mm";
}

/**
 * The unit to FORCE on this page's OCR given an explicit operator override and the print's detected
 * anchor. An explicit --force-units (operator global override) ALWAYS wins; otherwise the propagated
 * per-print anchor (null until the title-block page is seen). Returns "in"|"mm"|null (null = force
 * nothing, let the page self-resolve). Mirrors extractDimension's "forceUnits is authoritative" contract.
 *
 * @param {string|null|undefined} explicitForce operator --force-units (authoritative when set)
 * @param {string|null|undefined} printAnchor    per-print detected unit (resolvePageTitleBlockUnit)
 * @returns {"in"|"mm"|null}
 */
export function pageForceUnit(explicitForce, printAnchor) {
  const ef = normalizeUnit(explicitForce);
  if (ef === "in" || ef === "mm") return ef;
  const pa = normalizeUnit(printAnchor);
  return pa === "in" || pa === "mm" ? pa : null;
}

// ASME Y14.5-2018: only LOCATION (position/concentricity/symmetry), ORIENTATION
// (parallelism/perpendicularity/angularity) and RUNOUT (circular/total) controls REQUIRE a
// datum reference frame. FORM tolerances (flatness/straightness/roundness/circularity/
// cylindricity) must NOT reference datums (§8.2), and a profile with no datum is a valid
// form-only profile -- so NEITHER is datum-deficient. This set equals the TS
// FCFSyntaxValidatorEngine's LOCATION+ORIENTATION+RUNOUT classification, and both runtimes now
// AGREE on all eight datum-requiring symbols -- the TS validator flags concentricity/symmetry
// missing-datum as of U-XRAY-FCF-CONCENTRICITY-SYMMETRY-DATUM (coaxiality/median-plane location
// controls that require a datum; deprecation in Y14.5-2018 is a separate warning). One ASME
// doctrine, two runtimes (the .mjs cannot import the .ts). Names are the union of both GDTSymbol
// vocabularies; the eight datum-requiring symbols are spelled identically in both.
const DATUM_REQUIRED_SYMBOLS = new Set([
  "position", "concentricity", "symmetry",
  "parallelism", "perpendicularity", "angularity",
  "circular_runout", "total_runout",
]);

// The 14 canonical ASME Y14.5 geometric-characteristic symbols (the GDTSymbol vocabulary the prompt asks for).
const GDT_CANONICAL = new Set([
  "position", "flatness", "perpendicularity", "parallelism", "concentricity", "circularity",
  "cylindricity", "profile_line", "profile_surface", "circular_runout", "total_runout",
  "straightness", "symmetry", "angularity",
]);
// alias -> canonical. Keys are lowercased + whitespace-collapsed shop abbreviations / variant spellings, OR
// an ASME Y14.5 unicode symbol as the literal character (consistent with this file's existing unicode usage).
const GDT_ALIAS = new Map([
  ["true position", "position"], ["pos", "position"], ["tp", "position"], ["posn", "position"], ["⌖", "position"],
  ["flat", "flatness"], ["flt", "flatness"], ["⏥", "flatness"],
  ["straight", "straightness"], ["str", "straightness"], ["strt", "straightness"], ["⏤", "straightness"],
  ["roundness", "circularity"], ["round", "circularity"], ["circ", "circularity"], ["rnd", "circularity"],
  ["cyl", "cylindricity"], ["⌭", "cylindricity"],
  ["profile of a line", "profile_line"], ["line profile", "profile_line"], ["prof line", "profile_line"], ["⌒", "profile_line"],
  ["profile of a surface", "profile_surface"], ["surface profile", "profile_surface"], ["prof surface", "profile_surface"], ["⌓", "profile_surface"],
  ["perp", "perpendicularity"], ["perpendicular", "perpendicularity"], ["⊥", "perpendicularity"],
  ["angular", "angularity"], ["ang", "angularity"], ["∠", "angularity"],
  ["parallel", "parallelism"], ["para", "parallelism"], ["pll", "parallelism"], ["∥", "parallelism"], ["‖", "parallelism"],
  ["concentric", "concentricity"], ["conc", "concentricity"], ["◎", "concentricity"],
  ["sym", "symmetry"], ["symmetric", "symmetry"], ["⌯", "symmetry"],
  ["runout", "circular_runout"], ["run out", "circular_runout"], ["circular runout", "circular_runout"], ["cro", "circular_runout"], ["↗", "circular_runout"],
  ["total runout", "total_runout"], ["total run out", "total_runout"], ["tro", "total_runout"], ["⌰", "total_runout"],
]);

/**
 * Pure: map a VLM's GD&T geometric-characteristic symbol emission -- a canonical enum name, an ASME Y14.5
 * unicode symbol, a shop abbreviation ("POS","TP","PERP"), or a variant spelling ("true position",
 * "roundness") -- to the canonical GDTSymbol name (one of the 14). Sibling of normalizeThreadCallout /
 * normalizeChamferCallout: recovers a callout the VLM read as garbled/variant text so the datum-deficiency
 * check (and any downstream FCF consumer) sees a canonical symbol. Gated to the GD&T symbol field (so a bare
 * "round"/"str" is unambiguous there). Returns null when not recognizable -- NEVER fabricates a symbol (R12).
 * @param {string} raw  e.g. "TP", "true position", "⌖", "PERP", "profile of a surface"
 * @returns {string|null} canonical GDTSymbol name, or null
 */
export function normalizeGdtSymbol(raw) {
  if (raw == null) return null;
  const s = String(raw).replace(/\s+/g, " ").trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  const underscored = lower.replace(/[\s-]+/g, "_");
  if (GDT_CANONICAL.has(underscored)) return underscored; // already canonical ("profile line" -> profile_line)
  if (GDT_ALIAS.has(s)) return GDT_ALIAS.get(s);           // unicode symbol (case preserved)
  if (GDT_ALIAS.has(lower)) return GDT_ALIAS.get(lower);   // abbreviation / spelling
  // strip trailing GD&T noise words and retry ("position tol" -> "position")
  const head = lower.replace(/\b(tol|tolerance|control|callout|of)\b/g, " ").replace(/\s+/g, " ").trim();
  if (head !== lower) {
    const hu = head.replace(/[\s-]+/g, "_");
    if (GDT_CANONICAL.has(hu)) return hu;
    if (GDT_ALIAS.has(head)) return GDT_ALIAS.get(head);
  }
  return null;
}

function extractGdt(g) {
  if (!g || typeof g !== "object") return null;
  const symbol = asStr(g.symbol);
  const raw = asStr(g.raw_text);
  if (symbol == null && raw == null) return null;
  const datums = asArray(g.datum_references).map((d) => asStr(d)).filter(Boolean);
  // Normalize the VLM's symbol emission (abbreviation / variant spelling / unicode) to the canonical
  // GDTSymbol so the datum-deficiency check fires for non-canonical text (e.g. "TP" -> "position"). The
  // raw verbatim symbol is preserved in raw_text. canon==null for an unrecognized symbol -> never accused.
  const canon = normalizeGdtSymbol(symbol);
  const symKey = canon || (symbol || "").trim().toLowerCase();
  return {
    symbol: canon || symbol || "unknown",
    tolerance_value: asNum(g.tolerance_value),
    tolerance_unit: normalizeUnit(g.tolerance_unit) || asStr(g.tolerance_unit),
    material_condition: asStr(g.material_condition),
    datum_references: datums,
    // doctrine: a datum-requiring FCF (location/orientation/runout) without a datum reference
    // is structurally invalid -> flag it (never drop -- surface as low-trust for the
    // operator-confirm gate). A FORM tolerance or a datum-less profile is NOT deficient: zero
    // datums is correct there (ASME Y14.5 §8.2). An unclassified symbol is never accused.
    datum_deficient: DATUM_REQUIRED_SYMBOLS.has(symKey) && datums.length === 0,
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
  const out = { ra_um: ra, location: asStr(s.location), raw_text: raw };
  // Recover a callout the model left as TEXT (e.g. "63 RMS", "N6", "125 uin") when it
  // gave no numeric ra_um -- previously dropped, the operator's "missed callouts" leak.
  if (ra == null && raw != null) {
    const norm = normalizeSurfaceFinish(raw);
    if (norm.resolved && norm.ra_um != null) {
      out.ra_um = norm.ra_um;
      out.ra_um_source = "normalized-raw_text";
      out.finish_system = norm.system;
      out.ra_um_assumed = norm.assumed === true;
      if (norm.note) out.ra_um_note = norm.note;
    }
  }
  return out;
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
  const forceUnits = normalizeUnit(opts.forceUnits); // AUTHORITATIVE unit override (region tiling: tiles lose the title block)
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
      // Two-tier truncation repair via the shared helper, each pass followed by the leading-dot fix
      // (structure-first, then notation -- the line-307 pass BAILS on a truncated response, so `.86`-style
      // value-position decimals would otherwise lose the ENTIRE extraction, the 2026-06-04 silent-loss
      // class one truncation deeper). Tier 1 (repairTruncatedJson) closes a truncated trailing VALUE
      // string; tier 2 (salvageTruncatedJson) handles a mid-KEY cut tier 1 leaves invalid -- both recover
      // every complete dim before the cut.
      parsed = tryParseWithRepair(jsonText.slice(objStart));
      if (parsed == null) {
        return { success: false, error: "JSON parse (object, repair failed): " + (e instanceof Error ? e.message : String(e)), extraction: null };
      }
    }
  }
  if (!parsed || typeof parsed !== "object") {
    return { success: false, error: "parsed not an object", extraction: null };
  }

  const titleBlock = extractTitleBlock(parsed.title_block);
  const drawingUnits = titleBlock.units; // "in" | "mm" | "mixed" | null
  const dimDrawingUnits = drawingUnits === "in" || drawingUnits === "mm" ? drawingUnits : null;

  const dimensions = asArray(parsed.dimensions).map((d) => extractDimension(d, dimDrawingUnits, assumeUnits, forceUnits)).filter(Boolean);
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
  // num_predict DEFAULT 4096 (env-raisable via PRISM_OCR_NUM_PREDICT for dense prints whose dimension list
  // exceeds 4096 output tokens -- a MEASURED 28 -> 56-86 dim recovery on a dense JM punch block, well under
  // the 180s timeout). DEFAULT stays 4096: the extra dims at a higher cap are real-OR-hallucinated and need
  // ensemble-corroboration / GT validation before production adoption (a larger cap also gives the VLM more
  // room to repeat). num_ctx AUTO-COUPLES to fit the larger output (input vision-tokens + prompt + output
  // must all fit, else the context overflows) unless PRISM_OCR_NUM_CTX is set. opts.modelOptions still
  // overrides both (spread last). Env UNSET -> 4096 / 8192 = byte-identical to the prior fixed body.
  const envNumPredict = Math.floor(Number(process.env.PRISM_OCR_NUM_PREDICT));
  const numPredict = Number.isFinite(envNumPredict) && envNumPredict > 0 ? envNumPredict : 4096;
  const envNumCtx = Math.floor(Number(process.env.PRISM_OCR_NUM_CTX));
  const numCtx = Number.isFinite(envNumCtx) && envNumCtx > 0 ? envNumCtx : Math.max(8192, numPredict * 2);
  return {
    model,
    prompt,
    images: [imageBase64],
    stream: false,
    // format: "json" enables Ollama server-side grammar-constrained JSON decoding (GBNF). It
    // structurally prevents the qwen2.5vl runaway-JSON dropout (~30-37% of outputs hit num_predict
    // mid-structure -> malformed blob -> whole-print parse-fail -> "1 model survived" exclusions).
    // DEFAULT-OFF: opts.format unset -> spread omits the key -> JSON.stringify byte-identical to the
    // legacy body, so non-training vision callers (page-classify, ad-hoc extracts) are unchanged.
    // Value is the string "json" or a JSON-schema object (both valid Ollama format values). The
    // corpus-train wrapper opts in via --format-json (threaded loop -> runEnsembleOverImage ->
    // ocrImageWithModelAsync -> here). Mirrors the proven slot/xray U-XRAY-FORMAT-JSON-FIX path.
    ...(opts.format ? { format: opts.format } : {}),
    // keep_alive: pin the VLM GPU-resident across the inter-print gap (multi-page rasterize) + fleet
    // GPU contention, so a long corpus run never pays the cold-reload tax (cold-load + the loop's
    // per-call timeout is what produced the "1 model survived" calibration exclusions + ~4x slowdown).
    // Default UNDEFINED -> JSON.stringify drops the key -> Ollama's 5min default, so non-training vision
    // callers (page-classify, ad-hoc extracts) are unchanged. The corpus-train wrapper sets
    // PRISM_OLLAMA_VISION_KEEP_ALIVE=15m; each VLM is lean (~7-10GB GPU-resident on the 96GB Blackwell),
    // so two resident leave ample room for the fleet's gpt-oss:120b. Caller override via opts.keepAlive.
    keep_alive: opts.keepAlive ?? process.env.PRISM_OLLAMA_VISION_KEEP_ALIVE,
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
      // is the safety net, but more headroom means fewer truncations to repair). Raisable via
      // PRISM_OCR_NUM_PREDICT (default 4096); see the coupling note at the top of this function.
      num_predict: numPredict,
      // num_ctx 8192 — fits the default qwen3-vl:8b-instruct at 8.1GB GPU-RESIDENT
      // (size_vram==size in /api/ps) on a 16GB card with the chat fleet running.
      // Footprint is NOT KV-dominated for this model: ctx8192→14.3GB vs ctx3072→
      // 14.3GB was measured for qwen2.5vl:7b (the old default — a ~13.7GB weights+
      // graph FLOOR that spilled to CPU → >180s/page; that is why the default moved
      // to qwen3-vl-instruct). For qwen3-vl-instruct 8192 leaves ample room for the
      // ~1950 vision-tokens (130dpi) + prompt + the rich JSON output. Caller can
      // override via modelOptions (lower only helps the old qwen2.5vl path). Auto-couples to
      // max(8192, 2 x num_predict) when num_predict is raised; PRISM_OCR_NUM_CTX overrides.
      num_ctx: numCtx,
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
  if (repaired) { try { return JSON.parse(repairLeadingDotDecimals(repaired)); } catch { /* tier-1 invalid (key-position cut) -> fall to tier-2 */ } }
  // TIER-2 (U-XRAY-TRUNCATION-KEYCUT): tier-1 closed a dangling KEY into invalid JSON; trim to the last
  // complete element/property + close, recovering every value before the cut.
  const salvaged = salvageTruncatedJson(text);
  if (salvaged) { try { return JSON.parse(repairLeadingDotDecimals(salvaged)); } catch { /* give up */ } }
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

/**
 * TIER-2 truncation repair (U-XRAY-TRUNCATION-KEYCUT). repairTruncatedJson (tier 1) closes a truncated
 * trailing STRING to salvage a partial value (e.g. a cut `"raw_text": "DIA .2`). But when the cut lands on
 * a KEY position -- a comma then an opening key quote (`..., "`), a complete `"key":` with no value, or a
 * dangling trailing comma -- closing the string yields `..., ""}` (a key with no `:value`) which is STILL
 * invalid JSON. On a dense drawing whose dimension list is cut mid-key, tier 1 fails and the ENTIRE
 * extraction (all ~30 dims already read before the cut) is lost.
 *
 * This trims the text back to the last COMPLETE element/property at the innermost open container and closes
 * every open container, recovering every dimension before the cut (including the last partial-but-usable
 * dim -- all its complete properties are kept; only the dangling next-key is dropped). It is invoked ONLY
 * as a fallback after tier 1's parse fails, so tier 1's better value-string salvage is preserved.
 *
 * Pure structural scan: tracks the container stack and, per frame, the index of the last clean truncation
 * boundary (after a complete element/property-value). A complete value is signalled by the comma/closer
 * that follows it, so the boundary is recorded at each comma (the value before it is complete) and after
 * each nested container closes. The end-of-input string state is irrelevant -- we always trim to a
 * boundary BEFORE any dangling fragment.
 *
 * @param {string} text
 * @returns {string|null}  repaired JSON string, or null if unrepairable
 */
export function salvageTruncatedJson(text) {
  if (typeof text !== "string" || text.length < 3) return null;
  const frames = []; // { kind:'{'|'[', openIdx:number, lastComplete:number }
  let inStr = false;
  let escape = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    const top = frames[frames.length - 1];
    if (c === "{" || c === "[") {
      frames.push({ kind: c, openIdx: i, lastComplete: -1 });
    } else if (c === "}" || c === "]") {
      frames.pop();
      if (frames.length === 0) return text.slice(0, i + 1); // already complete JSON
      // the just-closed container is a complete VALUE in its parent -> clean point after it
      frames[frames.length - 1].lastComplete = i + 1;
    } else if (c === ",") {
      // the value/element before this comma is complete -> clean point right before the comma
      if (top) top.lastComplete = i;
    }
  }
  if (frames.length === 0) return null;
  // Trim to the DEEPEST open frame that has a clean boundary (a complete element/property). A deeper frame
  // with NO complete content yet (e.g. a freshly-opened dimension object cut on its first key -- `..}, {"ty`)
  // is DROPPED entirely rather than emitted as a junk empty `{}`. We keep ONLY real, complete values byte
  // for byte and never fabricate (the R12 anti-fabrication intent the mid-key path must preserve).
  let fi = frames.length - 1;
  while (fi >= 0 && frames[fi].lastComplete < 0) fi--;
  if (fi < 0) {
    // Nothing complete anywhere -- the response was cut before a single element/property finished. Return
    // null (NOT an empty `{}`) so the caller FAILS LOUD: a truncated-with-zero-recovery response is an OCR
    // failure to RE-OCR (the --retry-failed path), never a print to silently bank as "read, 0 dimensions".
    return null;
  }
  let out = text.slice(0, frames[fi].lastComplete);
  for (let i = fi; i >= 0; i--) out += frames[i].kind === "[" ? "]" : "}";
  return out;
}
