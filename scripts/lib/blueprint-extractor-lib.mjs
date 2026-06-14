// scripts/lib/blueprint-extractor-lib.mjs
//
// U-TDP07 - Blueprint extractor (pure core).
//
// Translates two extractor signals into BlueprintExtraction-shape records the
// U-TDP04 benchmark grades against U-TDP05 (CAD) and U-TDP06 (CNC) ground
// truth:
//
//   1) VECTOR signal -- PyMuPDF word tokens with bboxes (from the python
//      sidecar). Heuristic regex classifier maps tokens to GT-kind presence
//      signals. Fast, deterministic, no model. Hits on the ~96% of the JM Die
//      corpus that has selectable text inside FlateDecode streams.
//
//   2) VLM signal -- a vision-language model (Qwen2.5-VL 7B via Ollama) takes
//      the rendered page image and emits a JSON object listing detected
//      feature KINDS. Catches the ~4% raster-only scans + anything the vector
//      classifier misses on token-poor pages.
//
// MERGE: union of kinds (presence_only:true for both — the GT taxonomy from
// U-TDP05/06 is itself presence-only). Confidence is implicit: if either
// signal flags a kind, it's present.
//
// GT TAXONOMY (from cad-ground-truth-lib.mjs + cnc-ground-truth-lib.mjs):
//   stepped_revolved_axis · central_oil_hole · cross_drilled_relief_holes ·
//   bevel_face_chamfer · working_tip_taper · shoulder_fillet ·
//   blade_root_fillet · leading_edge_fillet · trailing_edge_fillet
//
// PURE: no fs, no network, no subprocess. CLI shells + the I/O wrapper own
// every side effect.

/**
 * Canonical GT-kind allowlist. Extractor output OUTSIDE this set is dropped
 * (mapped to a fallback or discarded) before merging — keeps the benchmark
 * scoring honest. New kinds require updating cad/cnc-ground-truth-lib AND
 * this set together.
 */
export const GT_KINDS = Object.freeze([
  "stepped_revolved_axis",
  "central_oil_hole",
  "cross_drilled_relief_holes",
  "bevel_face_chamfer",
  "working_tip_taper",
  "shoulder_fillet",
  "blade_root_fillet",
  "leading_edge_fillet",
  "trailing_edge_fillet",
]);

const GT_KINDS_SET = new Set(GT_KINDS);

/**
 * Heuristic thresholds for vector-token aggregation. Tuned conservatively —
 * a false-positive presence_only:true is a benchmark FP, while a false
 * negative is a benchmark FN; both cost equally in F1 so we want sane
 * thresholds, not aggressive ones.
 */
export const VECTOR_AGGREGATION = Object.freeze({
  // >=1 diameter-bearing token in the print => the part has a diameter,
  // hence at least one revolved feature. Matches the U-TDP05 `cylindrical
  // feature_count >= 1 => stepped_revolved_axis` GT rule.
  steppedRevolvedAxisMinDiameters: 1,
  // >=2 distinct diameter values OR explicit oil-hole keyword.
  centralOilHoleMinDiameters: 2,
  // >=3 hole/drill tokens flips on cross-drilling (matches CNC GT and CAD GT
  // both at count>=3).
  crossDrilledMinHoleSignals: 3,
  // >=1 chamfer token.
  bevelChamferMinTokens: 1,
  // >=2 taper tokens.
  workingTipTaperMinTokens: 2,
  // >=1 fillet token.
  shoulderFilletMinTokens: 1,
  // >=2 fillet tokens.
  bladeRootFilletMinTokens: 2,
  // >=1 freeform / leading-edge keyword.
  leadingEdgeMinTokens: 1,
  trailingEdgeMinTokens: 1,
});

/** Regex bank — case-sensitivity decisions made per-axis (notes inline). */
const PATTERNS = Object.freeze({
  // Ø (U+00D8) OR an ASCII "DIA" / "PHI" / "Ø" replacement. Captures the
  // numeric after the symbol. PDF text extraction sometimes returns Ø as a
  // standalone token; sometimes as part of "Ø1.27"; cover both.
  diameter: /(?:Ø|\bDIA\b|\bPHI\b|⌀)\s*([0-9]+(?:\.[0-9]+)?)/iu,
  // Bare ⌀ or "DIA" token without value — still a diameter signal even when
  // the value is in an adjacent token.
  diameterBareSymbol: /^(?:Ø|⌀|DIA|PHI|D[Ii]a\.)$/u,
  // Threads: M6, M6x1, 1/4-20, #8-32 — all imply tapped/drilled holes.
  thread: /^(?:M\d+(?:[x×]\d+(?:\.\d+)?)?|\d+\/\d+[- ]?\d+|#\d+[- ]\d+|UNC|UNF|TAP|TAPPED|THRU)$/iu,
  // Hole keywords (English + common abbreviations on JM Die prints).
  hole: /\b(?:HOLE|HOLES|DRILL|DRILLED|REAM|REAMED|BORE|BORED|CBORE|CSK|COUNTERSINK|COUNTERBORE|TAP|TAPPED|THRU|THROUGH)\b/iu,
  // Chamfer signals: explicit text + the common "Nx45°" angle pattern.
  chamfer: /\b(?:CHAMFER|CHAM|CHF|CSK)\b|^[0-9]+(?:\.[0-9]+)?[x×]45°?$/iu,
  // Taper / cone — explicit keyword OR a degree mark beside a non-45 angle.
  taper: /\b(?:TAPER|TAPERED|CONE|CONICAL)\b/iu,
  // Fillets / radii — R# is the canonical mark; some prints write FILLET.
  fillet: /\b(?:FILLET|FIL|RAD|RADIUS)\b|^R\s*\d+(?:\.\d+)?$/iu,
  // Freeform / blade-edge cues. Trailing \b would drop the L.E. / T.E.
  // abbreviation forms (trailing "." is non-word AND end-of-string is non-word
  // → no boundary). The leading \b still prevents partial-word matches.
  leadingEdge: /\b(?:LEADING\s*EDGE|L\.E\.|BLADE\s*ROOT|AIRFOIL)/iu,
  trailingEdge: /\b(?:TRAILING\s*EDGE|T\.E\.)/iu,
  // Oil / coolant hole hints — JM Die punches use "oil hole" markings.
  oilHole: /\b(?:OIL\s*HOLE|COOLANT\s*HOLE|THRU\s*HOLE)\b/iu,
});

/**
 * Classify ONE text token; return the SET of feature-evidence signals it
 * fires. Signal names are intermediate (not GT kinds) — aggregation maps
 * them to GT kinds based on COUNTS.
 *
 * Pure. Empty / non-string input returns an empty Set.
 *
 * @param {string} text
 * @returns {Set<string>}  signals: "diameter", "hole", "chamfer", "taper",
 *   "fillet", "oilHole", "leadingEdge", "trailingEdge"
 */
export function classifyToken(text) {
  const out = new Set();
  if (typeof text !== "string") return out;
  const t = text.trim();
  if (!t) return out;
  if (PATTERNS.diameter.test(t) || PATTERNS.diameterBareSymbol.test(t)) out.add("diameter");
  if (PATTERNS.thread.test(t)) out.add("hole");
  if (PATTERNS.hole.test(t)) out.add("hole");
  if (PATTERNS.chamfer.test(t)) out.add("chamfer");
  if (PATTERNS.taper.test(t)) out.add("taper");
  if (PATTERNS.fillet.test(t)) out.add("fillet");
  if (PATTERNS.leadingEdge.test(t)) out.add("leadingEdge");
  if (PATTERNS.trailingEdge.test(t)) out.add("trailingEdge");
  if (PATTERNS.oilHole.test(t)) out.add("oilHole");
  return out;
}

/**
 * Walk an array of token objects (the sidecar's `tokens` field), aggregate
 * signal COUNTS, apply the VECTOR_AGGREGATION thresholds, emit GT-kind
 * presence records.
 *
 * Pure. Bad input shapes degrade to an empty {dimensions:[]} rather than
 * throwing — the cascade should never abort the benchmark walk on a single
 * malformed token list.
 *
 * @param {Array<{text:string}>} tokens
 * @returns {{dimensions: Array<{kind:string,presence_only:true}>, signals: Record<string,number>}}
 */
export function aggregateTokenSignals(tokens) {
  const signals = {
    diameter: 0,
    hole: 0,
    chamfer: 0,
    taper: 0,
    fillet: 0,
    leadingEdge: 0,
    trailingEdge: 0,
    oilHole: 0,
  };
  if (!Array.isArray(tokens)) return { dimensions: [], signals };
  for (const tok of tokens) {
    if (!tok || typeof tok !== "object") continue;
    const fired = classifyToken(tok.text);
    for (const k of fired) {
      if (k in signals) signals[k] += 1;
    }
  }
  const kinds = new Set();
  if (signals.diameter >= VECTOR_AGGREGATION.steppedRevolvedAxisMinDiameters) {
    kinds.add("stepped_revolved_axis");
  }
  if (
    signals.diameter >= VECTOR_AGGREGATION.centralOilHoleMinDiameters
    || signals.oilHole >= 1
  ) {
    kinds.add("central_oil_hole");
  }
  if (
    signals.hole >= VECTOR_AGGREGATION.crossDrilledMinHoleSignals
    || (signals.diameter + signals.hole) >= VECTOR_AGGREGATION.crossDrilledMinHoleSignals
  ) {
    kinds.add("cross_drilled_relief_holes");
  }
  if (signals.chamfer >= VECTOR_AGGREGATION.bevelChamferMinTokens) {
    kinds.add("bevel_face_chamfer");
  }
  if (signals.taper >= VECTOR_AGGREGATION.workingTipTaperMinTokens) {
    kinds.add("working_tip_taper");
  }
  if (signals.fillet >= VECTOR_AGGREGATION.shoulderFilletMinTokens) {
    kinds.add("shoulder_fillet");
  }
  if (signals.fillet >= VECTOR_AGGREGATION.bladeRootFilletMinTokens) {
    kinds.add("blade_root_fillet");
  }
  if (signals.leadingEdge >= VECTOR_AGGREGATION.leadingEdgeMinTokens) {
    kinds.add("leading_edge_fillet");
  }
  if (signals.trailingEdge >= VECTOR_AGGREGATION.trailingEdgeMinTokens) {
    kinds.add("trailing_edge_fillet");
  }
  const dimensions = [...kinds].map((kind) => ({ kind, presence_only: true }));
  return { dimensions, signals };
}

/**
 * Build a structured prompt asking a vision-LM to emit JSON-only output
 * classifying the print into GT kinds. The benchmark scores on presence per
 * kind; we never ask the model for nominal dimensions (it would be a footgun
 * — VLMs hallucinate numerics far worse than presence).
 *
 * @param {string[]} [allowedKinds]  defaults to GT_KINDS
 * @returns {string}
 */
export function buildVlmPrompt(allowedKinds) {
  const kinds = Array.isArray(allowedKinds) && allowedKinds.length > 0
    ? allowedKinds.filter((k) => typeof k === "string" && k)
    : GT_KINDS.slice();
  return [
    "You are a mechanical-engineering-drawing analyst.",
    "Look at the attached blueprint image and decide which of these feature",
    "kinds are PRESENT in the part (NOT the dimensions or counts — presence",
    "only, boolean per kind):",
    "",
    ...kinds.map((k) => "  - " + k),
    "",
    "Reply with ONE JSON object and NOTHING ELSE. Schema:",
    "  {",
    "    \"present\": [<subset of the kind list above>],",
    "    \"reasoning_short\": \"<<= 200 chars, optional, terse>\"",
    "  }",
    "Do not invent kinds outside the list above. If unsure, omit the kind.",
  ].join("\n");
}

/**
 * Parse the VLM's raw text response into GT-kind presence records. Robust
 * against common deviations:
 *   - Markdown-fenced JSON (```json ... ```)
 *   - Surrounding chat-prose
 *   - Kinds not in the allowlist (silently dropped)
 *   - Mis-shaped `present` (not an array, or array of non-strings)
 *
 * Never throws. Returns {dimensions:[], parseOk:false, reason:str} on any
 * failure that prevents kind extraction — caller surfaces reason in
 * downstream telemetry.
 *
 * @param {string} responseText  raw text the VLM emitted
 * @param {string[]} [allowedKinds]
 * @returns {{dimensions: Array<{kind:string,presence_only:true}>, parseOk:boolean, reason:string|null, raw_kinds:string[]}}
 */
export function parseVlmJsonResponse(responseText, allowedKinds) {
  const allow = Array.isArray(allowedKinds) && allowedKinds.length > 0
    ? new Set(allowedKinds)
    : GT_KINDS_SET;
  if (typeof responseText !== "string" || !responseText.trim()) {
    return { dimensions: [], parseOk: false, reason: "empty-response", raw_kinds: [] };
  }
  const trimmed = responseText.trim();
  // Strip ``` / ```json fences. Capture the inner block.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [];
  if (fenced && fenced[1]) candidates.push(fenced[1].trim());
  // Find the first {...} object substring (greedy from { to last }) — VLMs
  // sometimes wrap JSON in prose; this rescues the structured part.
  const braceStart = trimmed.indexOf("{");
  const braceEnd = trimmed.lastIndexOf("}");
  if (braceStart >= 0 && braceEnd > braceStart) {
    candidates.push(trimmed.slice(braceStart, braceEnd + 1));
  }
  candidates.push(trimmed); // last resort
  let parsed = null;
  let lastErr = "no-candidate";
  for (const c of candidates) {
    try {
      parsed = JSON.parse(c);
      break;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  if (!parsed || typeof parsed !== "object") {
    return { dimensions: [], parseOk: false, reason: "json-parse-failed: " + lastErr, raw_kinds: [] };
  }
  // Robustness: Qwen2.5-VL sometimes emits a bare array `["kind1","kind2"]`
  // instead of `{"present":[...]}`. Accept either — the contract is "presence
  // list", whichever shape the model produced.
  const present = Array.isArray(parsed) ? parsed : parsed.present;
  if (!Array.isArray(present)) {
    return { dimensions: [], parseOk: false, reason: "missing-present-array", raw_kinds: [] };
  }
  const rawKinds = [];
  const accepted = new Set();
  for (const k of present) {
    if (typeof k !== "string" || !k) continue;
    rawKinds.push(k);
    if (allow.has(k)) accepted.add(k);
  }
  const dimensions = [...accepted].map((kind) => ({ kind, presence_only: true }));
  return { dimensions, parseOk: true, reason: null, raw_kinds: rawKinds };
}

/**
 * Merge cascade stage outputs into a single extraction record.
 *
 * Rule: a kind is present if EITHER stage reports it. presence_only:true is
 * preserved (every GT today is presence-only). Duplicates are deduped.
 *
 * Pure; either input may be null/undefined/missing-dimensions.
 *
 * @param {{dimensions?: Array<{kind:string,presence_only?:boolean}>}|null} stageA  vector
 * @param {{dimensions?: Array<{kind:string,presence_only?:boolean}>}|null} stageB  vlm
 * @returns {{dimensions: Array<{kind:string,presence_only:true}>, sources: string[]}}
 */
export function mergeStages(stageA, stageB) {
  const seen = new Set();
  const sources = [];
  function take(record, label) {
    if (!record || typeof record !== "object") return;
    const dims = Array.isArray(record.dimensions) ? record.dimensions : null;
    if (!dims) return;
    let touched = false;
    for (const d of dims) {
      if (!d || typeof d !== "object") continue;
      if (typeof d.kind !== "string" || !d.kind) continue;
      seen.add(d.kind);
      touched = true;
    }
    if (touched) sources.push(label);
  }
  take(stageA, "vector");
  take(stageB, "vlm");
  const dimensions = [...seen].map((kind) => ({ kind, presence_only: true }));
  return { dimensions, sources };
}

/**
 * Filter dimensions to the GT allowlist. Used by the I/O wrapper before
 * handing the extraction to the benchmark — guarantees the grader never sees
 * a kind it cannot match against ground truth (would be uniformly counted
 * as FP otherwise).
 *
 * @param {Array<{kind:string}>} dimensions
 * @param {Iterable<string>} [allow]  default GT_KINDS
 * @returns {Array<{kind:string,presence_only:true}>}
 */
export function filterToAllowedKinds(dimensions, allow) {
  const set = allow ? new Set(allow) : GT_KINDS_SET;
  if (!Array.isArray(dimensions)) return [];
  const out = [];
  const seen = new Set();
  for (const d of dimensions) {
    if (!d || typeof d.kind !== "string") continue;
    if (!set.has(d.kind)) continue;
    if (seen.has(d.kind)) continue;
    seen.add(d.kind);
    out.push({ kind: d.kind, presence_only: true });
  }
  return out;
}
