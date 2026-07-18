// scripts/lib/blueprint-reading-knowledge.mjs
//
// U-XRAY-READING-KNOWLEDGE -- ties PRISM knowledge substrates (GD&T / ASME Y14.5, shop-floor tribal
// callout-reading wisdom, customer conventions) INTO the live VLM extraction prompt as a BOUNDED,
// curated "reading guidance" block.
//
// Why a CURATED bundle, not a raw-corpus dump (R7 -- surface the conflict, do not average):
//   The #1 regression risk on the VLM prompt is BLOAT -- ollama-vision-extract-lib.mjs's own history
//   (the "convert inches to mm" instruction was PROVEN IGNORED by qwen2.5-VL) shows that adding prompt
//   text does not reliably help and can dilute the high-signal schema. So we do NOT pump the whole tribal
//   store / GD&T corpus into the prompt. Instead we DISTILL the highest-signal reading rules from each
//   substrate into one-line, provenance-tagged entries and SELECT only the relevant + highest-priority
//   ones per call, hard-capped by item-count and char-budget. The selector is the bound; the bundle is
//   the integration point that every substrate (tribal, GD&T reference, courses, wikis) feeds.
//
// What it deliberately does NOT repeat: rules ALREADY baked into buildVisionPrompt (the FCF left-to-right
// read order, the form-vs-datum rule, the stepped-bore "report every diameter", the lead-in chamfer rule,
// the anti-hallucination guard). The bundle is purely ADDITIVE intelligence on top of those.
//
// Sources (every entry cites its provenance in `source`):
//   - asme-y14.5            : ASME Y14.5-2018 geometric-tolerancing doctrine (the canonical standard).
//   - tribal:<slug>         : knowledge/wiki/code-tribal/blueprint-dim-*.md + blueprint-ocr-operator-wisdom.md
//                             (shop-floor / operator priors -- PSN leg #5).
//
// Pure + deterministic + ASCII-only. Symbols are NAMED in words (the VLM reads the image; the prompt only
// needs to name what to look for) -- this also keeps the file ASCII (PS 5.1 / parser / grep safe).

/**
 * One curated reading-guidance entry.
 * @typedef {Object} ReadingGuidanceEntry
 * @property {string} id        stable id (dedup key)
 * @property {string} source    provenance ("asme-y14.5" | "tribal:<slug>")
 * @property {number} priority  1 = always-include high-signal; 2 = context-relevant; 3 = nice-to-have
 * @property {boolean} always   true => considered regardless of part class / target kinds
 * @property {string[]} kinds   relevance tokens matched against the call's partClass + targetKinds
 * @property {string} text      the one-line reading rule (ASCII)
 */

/** @type {ReadingGuidanceEntry[]} */
export const READING_GUIDANCE = Object.freeze([
  // --- GD&T / ASME Y14.5 (high-signal, not already in the base prompt) ---
  {
    id: "gdt-runout-misread", source: "tribal:blueprint-dim-gdt-runout", priority: 1, always: true, kinds: ["runout", "gdt"],
    text: "Runout: a SINGLE slanted arrow = circular runout; a DOUBLE/crossed arrow = total runout -- they are easy to confuse at low resolution, so look closely. Any runout REQUIRES a datum letter.",
  },
  {
    id: "gdt-profile-u-notation", source: "tribal:blueprint-dim-gdt-profile", priority: 2, always: true, kinds: ["profile", "gdt"],
    text: "Profile-of-a-surface/line can be bilateral, unilateral, or unequally-disposed; an unequally-disposed profile is marked with a circled U and a value -- capture that U annotation when present.",
  },
  {
    id: "gdt-modifier-meaning", source: "asme-y14.5", priority: 2, always: false, kinds: ["gdt", "position"],
    text: "A material-condition modifier after the tolerance is a circled M (MMC), circled L (LMC), or RFS (absent, or an explicit circled F in Y14.5-2018); a leading diameter symbol on the tolerance means a cylindrical (diametral) tolerance zone.",
  },
  // --- per-callout-type reading patterns (context-matched) ---
  {
    id: "read-diameter", source: "tribal:blueprint-dim-diameter", priority: 2, always: false, kinds: ["diameter", "bore", "hole", "counterbore", "countersink", "pin"],
    text: "Diameters carry a leading diameter symbol (a circle with a slash) or a DIA / D prefix; stacked limit-pairs (two numbers, max over min) are common; cross-check the section view to confirm it is a cylinder.",
  },
  {
    id: "read-linear", source: "tribal:blueprint-dim-linear", priority: 3, always: false, kinds: ["linear", "length", "width", "depth", "height", "thickness", "spacing"],
    text: "Linear dimensions may show an mm or in suffix or none (the drawing's default unit applies); watch for limit-pair tolerances like 12.5 / 12.3 (ISO 14405).",
  },
  {
    id: "read-radius", source: "tribal:blueprint-dim-radius", priority: 3, always: false, kinds: ["radius", "fillet", "corner", "round"],
    text: "Radii carry an R prefix; an outer (surface) radius vs an inner (corner) radius is told apart by where the callout points -- read the callout location, not just the R value.",
  },
  {
    id: "read-thread", source: "tribal:blueprint-dim-thread-callout", priority: 2, always: false, kinds: ["thread", "tap", "hole", "screw"],
    text: "Thread callouts read series-size tolerance [LH] [class], e.g. 1/4-20 UNC-2B LH or M6x1-6H; always capture an LH (left-hand) flag and the fit class.",
  },
  {
    id: "read-surface-finish", source: "tribal:blueprint-dim-surface-finish", priority: 3, always: false, kinds: ["surface", "finish", "ra", "roughness"],
    text: "Surface finish follows ISO 1302 (Ra / Rz / Rmr); older JM-Die prints use legacy N-grade callouts (N3 through N12) -- report the raw callout exactly as printed.",
  },
  {
    id: "read-material", source: "tribal:blueprint-dim-material-callout", priority: 2, always: true, kinds: ["material"],
    text: "Material is usually a title-block field but can ALSO appear as a flag-note on the drawing body -- check both before reporting material null.",
  },
  // --- customer / shop conventions (operator wisdom; always relevant) ---
  {
    id: "customer-convention", source: "tribal:blueprint-ocr-operator-wisdom", priority: 1, always: true, kinds: ["convention"],
    text: "Notation varies by customer: some prints use a decimal COMMA, some stack tolerances unusually, and shop-internal prints use house GD&T abbreviations -- read each number EXACTLY as printed; never normalize notation in raw_text.",
  },
]);

/** Default bounds -- keep the injected block small so it does not dilute the high-signal schema prompt. */
export const DEFAULT_MAX_ITEMS = 8;
export const DEFAULT_MAX_CHARS = 1100;

/** Lowercase a value to a set of relevance tokens (split on non-alphanumerics). */
function tokenize(value) {
  if (value == null) return [];
  const s = Array.isArray(value) ? value.join(" ") : String(value);
  return s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/**
 * Select a BOUNDED, ranked, deduped set of reading-guidance entries relevant to this extraction.
 * Relevance: an entry is a candidate if `always` is true OR any of its `kinds` tokens appears in the
 * call's (partClass + targetKinds) token set. Ranking: priority asc (1 before 3), then declaration order
 * (stable). Bound: stop at maxItems entries AND once adding the next entry's text would exceed maxChars.
 *
 * @param {{partClass?:string, targetKinds?:string[], wireEdm?:boolean, maxItems?:number, maxChars?:number}} [opts]
 * @returns {ReadingGuidanceEntry[]}
 */
export function selectReadingGuidanceEntries(opts = {}) {
  const maxItems = Number.isFinite(opts.maxItems) && opts.maxItems > 0 ? Math.floor(opts.maxItems) : DEFAULT_MAX_ITEMS;
  const maxChars = Number.isFinite(opts.maxChars) && opts.maxChars > 0 ? Math.floor(opts.maxChars) : DEFAULT_MAX_CHARS;
  // When the caller does NOT specify targetKinds (a GENERAL print -- e.g. the live ensemble call passes only
  // partClass + wireEdm), treat ALL callout kinds as relevant so the full bounded callout-reading guidance
  // reaches the VLM. When the caller DOES pass targetKinds (even []), filter the per-callout entries to those
  // kinds (focused guidance for a narrow part class). Either way the cap below keeps the block bounded.
  const kindsProvided = opts.targetKinds !== undefined && opts.targetKinds !== null;
  const ctx = new Set([...tokenize(opts.partClass), ...(kindsProvided ? tokenize(opts.targetKinds) : [])]);
  if (opts.wireEdm) ctx.add("profile"); // wire-EDM reads internal profiles -- bias toward the profile entry

  const candidates = READING_GUIDANCE
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.always || !kindsProvided || e.kinds.some((k) => ctx.has(k)))
    .sort((a, b) => (a.e.priority - b.e.priority) || (a.i - b.i))
    .map(({ e }) => e);

  const out = [];
  const seen = new Set();
  let chars = 0;
  for (const e of candidates) {
    if (seen.has(e.id)) continue;
    if (out.length >= maxItems) break;
    const add = e.text.length + 3; // "- " bullet + newline budget
    if (out.length > 0 && chars + add > maxChars) continue; // never let the cap drop the first (highest-priority) entry
    out.push(e);
    seen.add(e.id);
    chars += add;
  }
  return out;
}

/**
 * Build the formatted reading-guidance BLOCK string to append to the VLM prompt (or "" if nothing
 * selected). The block is intentionally terse + bulleted. Pass the result as buildVisionPrompt's
 * `opts.readingGuidance`; an empty string leaves the base prompt byte-identical.
 *
 * @param {{partClass?:string, targetKinds?:string[], wireEdm?:boolean, maxItems?:number, maxChars?:number}} [opts]
 * @returns {string}
 */
export function buildReadingGuidanceBlock(opts = {}) {
  const entries = selectReadingGuidanceEntries(opts);
  if (entries.length === 0) return "";
  const lines = ["DOMAIN READING GUIDANCE (shop-floor + ASME Y14.5 priors -- apply when reading callouts):"];
  for (const e of entries) lines.push("- " + e.text);
  return lines.join("\n");
}
