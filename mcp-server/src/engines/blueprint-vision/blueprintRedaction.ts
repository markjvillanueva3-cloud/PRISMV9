// scripts: mcp-server/src/engines/blueprint-vision/blueprintRedaction.ts
//
// U-APP-REDACT-LIB -- shared blueprint customer-identity redactor.
//
// Build-once (R15/R16): the customer-name anonymization logic was previously locked inside
// BlueprintLoRABridgeEngine (LoRA-export only). This extracts the PROVEN core (the spec-mandated
// deny-list + part-number patterns + the ordered scrub) into ONE shared module so BOTH the LoRA
// export AND the new app-facing drawing redaction (Phase 3 of the blueprint-vision app-integration
// plan) use the same redactor. The LoRA engine re-exports ANONYMIZATION_PATTERNS / applyAnonymization
// Patterns from here, so its behavior is byte-identical (the CORE set is unchanged) -- only the home moved.
//
// Two coverage levels, deliberately (R7 -- surface the conflict, do not average):
//   - CORE_CUSTOMER_PATTERNS (the curated 9 spec-mandated names) -- LOW collision, SAFE for free-text
//     scrubbing. This is what the LoRA export uses and what the app uses for note free-text by default.
//   - getAllCustomerNames() (the full 118-name JM_DIE_CUSTOMERS registry) -- HIGH recall but MANY names
//     are common manufacturing words ("ACME" thread, "ELECTRODE", "FORM", "AIR", "SEMS", "IMPACT",
//     "HEADER", "CHERRY", "PARKER"...). Word-boundary matching the full set against free text WILL
//     over-redact legitimate drawing notes, so it is OPT-IN (`aggressive:true`) for an operator-confirmed
//     maximum-privacy export ONLY -- never the free-text default.
//
// The SAFE primary app mechanism is structured-FIELD masking: redactExtraction masks the customer
// identity fields (title_block.customer/company/vendor/...) WHOLESALE regardless of the name, so every
// customer is covered with ZERO over-redaction risk -- the full registry is not needed for that path.
//
// Pure + deterministic. Never throws -- non-string input coerces to "".

import { JM_DIE_CUSTOMERS } from "../../data/jm-die-profile.js";

/** The mask token (kept identical to the LoRA engine's prior token for back-compat). */
export const MASK = "[REDACTED]";

/**
 * The curated, spec-mandated customer-name deny-list (low collision -- safe for free-text). These names
 * are distinctive proper nouns unlikely to appear as ordinary drawing text. This is the LoRA engine's
 * historical set, preserved EXACTLY so its anonymization tests (`not.toMatch(/ALCOA|ITW|.../)`) still pass.
 */
export const CORE_CUSTOMER_NAMES: readonly string[] = Object.freeze([
  "ALCOA",
  "ITW",
  "CONTINENTAL MIDLAND",
  "CONTINENTAL",
  "OPTIMAS",
  "SFS",
  "HOLO-KROME",
  "FASTENAL",
  "JM DIE",
]);

/**
 * Curated customer-name patterns (word-boundary, case-insensitive, separator-tolerant). Byte-equivalent
 * in coverage to the LoRA engine's prior inline list; built via buildCustomerPatterns so the one
 * pattern-construction rule is shared (a multi-word / hyphenated name matches across `[\s_-]` variants).
 */
export const CORE_CUSTOMER_PATTERNS: readonly RegExp[] = Object.freeze(buildCustomerPatterns(CORE_CUSTOMER_NAMES));

/** Common part-number shapes (mirrors the LoRA engine's prior two patterns). */
export const PART_NUMBER_PATTERNS: readonly RegExp[] = Object.freeze([
  /\b[A-Z]{1,4}-\d{3,6}\b/g,
  /\b\d{3,8}-[A-Z]{1,4}\b/g,
]);

/**
 * Back-compat: the exact deny-list the LoRA bridge applied before this extraction (CORE customers +
 * part numbers). BlueprintLoRABridgeEngine re-exports this, so existing consumers/tests are unaffected.
 */
export const ANONYMIZATION_PATTERNS: readonly RegExp[] = Object.freeze([
  ...CORE_CUSTOMER_PATTERNS,
  ...PART_NUMBER_PATTERNS,
]);

/** Keys whose VALUE is customer-identifying and must be masked wholesale (case-insensitive key match). */
export const CUSTOMER_IDENTITY_KEYS: readonly string[] = Object.freeze([
  "customer", "customer_name", "customername", "company", "vendor", "client", "owner", "supplier",
  "drawn_by", "drawnby", "drawing_number", "drawing_no", "drawingnumber", "dwg", "dwg_no",
  "part_number", "part_no", "partnumber", "pn",
  // title-block / routing identity fields a real drawing uses (each a potential field-leak if omitted)
  "buyer", "account", "approved_by", "approvedby", "work_order", "workorder", "wo", "job", "job_no",
  "cage_code", "cagecode", "prepared_for", "preparedfor", "sold_to", "soldto", "bill_to", "billto",
  "ship_to", "shipto", "po", "po_number",
]);

/**
 * Keys whose VALUE is a KNOWN non-PII spec (material grade / revision / units / scale / sheet / finish)
 * that must NEVER be scrubbed. A material designation like "AISI-1045" / "SAE-4340" / "AL-6061" matches
 * the part-number shape `[A-Z]{1,4}-\d{3,6}` but is NOT a part number and carries no customer identity --
 * free-text-scrubbing it would CORRUPT a legit field AND (when redaction-eligibility is derived from the
 * audit) false-flag a clean part as PII-bearing (the over-redaction direction; caught by per-file scrutiny
 * on U-XRAY-REDACT-ROUTER-COMPREHENSIVE-PII). These are non-identity, so they are also never masked
 * wholesale -- they pass through verbatim. (Identity spec fields like drawing_number / part_number stay in
 * CUSTOMER_IDENTITY_KEYS and ARE masked -- a part number IS PII; a material grade is not.)
 */
export const NON_PII_VALUE_KEYS: readonly string[] = Object.freeze([
  "material", "matl", "material_spec", "grade",
  "revision", "rev",
  "units", "unit", "scale", "sheet", "finish", "coating", "weight", "size",
]);

/**
 * Standards-org / alloy prefixes for material designations that match the part-number SHAPE
 * (`[A-Z]{1,4}-\d{3,6}`) but are GRADES, not part numbers (never PII): AISI-1045, SAE-4340, AL-6061,
 * SS-304, C-1018, ASTM-A36, ... A generic part-number prefix (ABC/XY/D) is deliberately NOT here, so a
 * real embedded part number ("STEEL ABC-1234") is still masked. `C` (carbon steel) is included; within a
 * spec field a `C-####` token is a carbon-steel grade, not a part number.
 */
const MATERIAL_GRADE_PREFIXES: ReadonlySet<string> = new Set([
  // standards-org + alloy-element prefixes ONLY. Deliberately EXCLUDES MS (Military-Standard part prefix),
  // HR/CD (hot-rolled/cold-drawn PROCESS abbreviations, not grade-number prefixes) -- they widened the
  // under-redaction surface (a real MS-#### part number) without protecting any real grade (3-of-3 P2).
  "AISI", "SAE", "ASTM", "ASME", "UNS", "AMS", "AL", "SS", "CU", "TI", "NI", "CR", "MO", "C",
]);

/**
 * True if `token` is a material-grade designation that merely SHARES the part-number shape. Used to
 * SUPPRESS a part-number redaction (only on spec fields, via redactText `protectGrades`) so a legit grade
 * like "AISI-1045" is preserved while a real part number is still masked. Grade numeric parts are short
 * (3-4 digits: 304 / 1018 / 4140 / 6061); a 5-6 digit token is treated as a part number even with a
 * material prefix. Never throws -- non-string -> false.
 */
export function looksLikeMaterialGrade(token: unknown): boolean {
  if (typeof token !== "string") return false;
  const m = token.trim().toUpperCase().match(/^([A-Z]{1,4})-(\d{3,4})$/);
  return m !== null && MATERIAL_GRADE_PREFIXES.has(m[1]);
}

/**
 * Single-token customer names that are ALSO common manufacturing/drawing words ("ACME" thread,
 * "ELECTRODE", "FORM" tool, "AIR", "SEMS"/"SCREWS" fasteners, "PARKER" fittings, "CHERRY" rivets...).
 * Free-text scrubbing EXCLUDES these (matching them in a note would mangle a legit callout); they are
 * still covered on the structured path (redactExtraction masks the customer FIELD wholesale regardless of
 * the word). Multi-word customer names are inherently distinctive (the pattern matches the whole phrase),
 * so only single tokens need this guard.
 */
export const COMMON_WORD_CUSTOMERS: ReadonlySet<string> = new Set([
  "ACME", "AIR", "AJ", "CUSTOM", "ELECTRODE", "ELITE", "FORM", "FORGO", "HEADER", "IMAGE",
  "MEAD", "PARKER", "SCREWS", "SEMS", "VALLEY", "CHERRY",
  // geographic / surname single-words that legitimately appear in drawing text (ship-to notes, names)
  "MIDWEST", "NORTHEAST", "ANDERSON", "ARCHER",
]);

/**
 * A customer name is DISTINCTIVE (safe to scrub in free text) if it is multi-token (a phrase the pattern
 * only matches whole) OR a CORE name OR a single token that is NOT a common drawing word AND >= 4 chars.
 * Default free-text scrub catches distinctive customers (SEMBLEX, TOPURA, STALCOP, ...) without
 * over-redacting common words or short acronyms (ATF=fluid, OMG, CFC/CSM/CWR/MMG/TCR/WSR) that collide
 * with ordinary drawing text. CORE names (incl. the 3-char SFS/ITW) ALWAYS scrub. Common-word + short
 * acronym customers are still caught on the structured-field path (redactExtraction masks the field).
 */
export function isDistinctiveCustomerName(name: string): boolean {
  const t = typeof name === "string" ? name.trim() : "";
  if (!t) return false;
  if (/[\s_-]/.test(t)) return true; // multi-token phrase -> distinctive (pattern matches the whole phrase)
  const upper = t.toUpperCase();
  if (CORE_CUSTOMER_NAMES.some((c) => c.toUpperCase() === upper)) return true; // CORE always scrubs (SFS/ITW)
  if (COMMON_WORD_CUSTOMERS.has(upper)) return false;
  if (t.length < 4) return false; // a <=3-char non-CORE single token is too acronym-collision-prone for free text
  return true;
}

/** The distinctive subset of the full registry (free-text-safe). Always includes the CORE names. */
export function freeTextCustomerNames(): string[] {
  return getAllCustomerNames().filter(isDistinctiveCustomerName);
}

/** Escape regex metacharacters in a literal name. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build word-boundary, case-insensitive, separator-tolerant patterns from literal customer names. A name
 * containing spaces/hyphens/underscores matches across any of those separators (so "HOLO-KROME" also
 * matches "HOLO KROME"/"HOLOKROME"; "CONTINENTAL MIDLAND" matches "CONTINENTAL_MIDLAND"). Empty/blank
 * names are skipped (a "" name would build `\b\b` and mask nothing / everything -- guarded).
 */
export function buildCustomerPatterns(names: readonly string[]): RegExp[] {
  const out: RegExp[] = [];
  for (const raw of Array.isArray(names) ? names : []) {
    const name = typeof raw === "string" ? raw.trim() : "";
    if (!name) continue;
    // split on whitespace/hyphen/underscore, escape each token, rejoin with a tolerant separator class.
    const tokens = name.split(/[\s_-]+/).filter(Boolean).map(escapeRegex);
    if (tokens.length === 0) continue;
    const body = tokens.join("[\\s_-]*");
    out.push(new RegExp(`\\b${body}\\b`, "gi"));
  }
  return out;
}

/** The full customer registry (CORE union JM_DIE_CUSTOMERS), de-duped. */
export function getAllCustomerNames(): string[] {
  return [...new Set([...CORE_CUSTOMER_NAMES, ...JM_DIE_CUSTOMERS])];
}

/**
 * Apply an ordered set of patterns, replacing every match with MASK. Byte-identical to the LoRA engine's
 * prior applyAnonymizationPatterns (default patterns = the back-compat ANONYMIZATION_PATTERNS). Non-string
 * input coerces to "". A fresh RegExp is built per pass so the shared global-flag lastIndex never leaks.
 */
export function applyAnonymizationPatterns(text: unknown, patterns: readonly RegExp[] = ANONYMIZATION_PATTERNS): string {
  // Byte-identical to the LoRA engine's prior contract: any non-string -> "" (NOT String(x)).
  if (typeof text !== "string") return "";
  let out = text;
  if (out.length === 0) return out;
  for (const pat of patterns) out = out.replace(new RegExp(pat.source, pat.flags), MASK);
  return out;
}

export interface RedactionAudit {
  type: "customer-text" | "part-number" | "customer-field";
  field?: string;     // for customer-field: the masked key path
  match?: string;     // for text/part-number: the matched span (audit only -- the OUTPUT is masked)
}

export interface RedactTextResult {
  text: string;
  redactions: RedactionAudit[];
}

/** Precomputed pattern sets (built once at module load -- avoids rebuilding ~100 regexes per call). */
export const DISTINCTIVE_CUSTOMER_PATTERNS: readonly RegExp[] = Object.freeze(buildCustomerPatterns(freeTextCustomerNames()));
export const ALL_CUSTOMER_PATTERNS: readonly RegExp[] = Object.freeze(buildCustomerPatterns(getAllCustomerNames()));

/**
 * Full-registry customer names upper-cased for an O(1) WHOLE-KEY identity check. A KEY that is EXACTLY a
 * customer name is unambiguous identity with no free text to preserve, so it is masked regardless of tier
 * (incl. short acronyms ATF/CFC and common words ACME/PARKER that the distinctive free-text tier skips).
 */
export const ALL_CUSTOMER_NAMES_UPPER: ReadonlySet<string> = new Set(getAllCustomerNames().map((n) => n.trim().toUpperCase()));

/**
 * Scrub a free-text string. DEFAULT uses the DISTINCTIVE registry (all customer names except the ~16
 * common drawing words) + part-number patterns -- it catches distinctive customers (SEMBLEX, TOPURA,
 * STALCOP, ...) in notes WITHOUT over-redacting common words (ACME thread, FORM, AIR). `aggressive:true`
 * adds the common-word customers too (max privacy, but WILL mangle a legit "ACME THREAD" note -- reserve
 * for an operator-confirmed maximum-anonymization export). The audit OMITS the cleartext match by default
 * (safe to log); pass `auditCleartext:true` for in-memory debugging only.
 */
export function redactText(
  text: unknown,
  opts: { aggressive?: boolean; auditCleartext?: boolean; protectGrades?: boolean } = {},
): RedactTextResult {
  let out = typeof text === "string" ? text : (text == null ? "" : String(text));
  const redactions: RedactionAudit[] = [];
  if (out.length === 0) return { text: out, redactions };

  const customerPatterns = opts.aggressive ? ALL_CUSTOMER_PATTERNS : DISTINCTIVE_CUSTOMER_PATTERNS;
  const pushAudit = (type: RedactionAudit["type"], m: string) => {
    redactions.push(opts.auditCleartext ? { type, match: m } : { type });
  };

  for (const pat of customerPatterns) {
    out = out.replace(new RegExp(pat.source, pat.flags), (m) => { pushAudit("customer-text", m); return MASK; });
  }
  for (const pat of PART_NUMBER_PATTERNS) {
    out = out.replace(new RegExp(pat.source, pat.flags), (m) => {
      // On a spec field (protectGrades), a material grade ("AISI-1045") merely SHARES the part-number
      // shape -- preserve it. A real embedded part number ("ABC-1234", non-material prefix) is still masked.
      if (opts.protectGrades && looksLikeMaterialGrade(m)) return m;
      pushAudit("part-number", m);
      return MASK;
    });
  }
  return { text: out, redactions };
}

export interface RedactExtractionResult {
  extraction: Record<string, unknown>;
  redactions: RedactionAudit[];
}

/** True if a key name (case-insensitive, separator-insensitive) is a customer-identity field. */
function isIdentityKey(key: string): boolean {
  const k = key.toLowerCase().replace(/[\s_-]+/g, "_");
  return CUSTOMER_IDENTITY_KEYS.some((idk) => idk.replace(/[\s_-]+/g, "_") === k);
}

/** True if a key name (case/separator-insensitive) is a KNOWN non-PII spec field that must never be scrubbed. */
function isNonPiiKey(key: string): boolean {
  const k = key.toLowerCase().replace(/[\s_-]+/g, "_");
  return NON_PII_VALUE_KEYS.some((nk) => nk.replace(/[\s_-]+/g, "_") === k);
}

/**
 * Redact a structured extraction object before display/export (the SAFE primary app mechanism). Returns a
 * DEEP COPY (never mutates the input) with: (1) every customer-identity FIELD value masked WHOLESALE
 * (covers any customer, zero over-redaction risk); (2) every other string value scrubbed via redactText
 * (CORE patterns by default; full registry if `aggressive`). Walks nested objects + arrays (e.g. notes[]).
 */
export function redactExtraction(extraction: unknown, opts: { aggressive?: boolean } = {}): RedactExtractionResult {
  const redactions: RedactionAudit[] = [];

  function walk(node: unknown, keyName: string | null, path: string): unknown {
    if (Array.isArray(node)) {
      return node.map((v, i) => walk(v, null, `${path}[${i}]`));
    }
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        // A customer identity can appear as a KEY name (a per-customer map `{ "ITW SHAKEPROOF": {...} }`
        // or a title-block whose customer string became the key). Scrub customer NAMES out of the key too.
        // redactText only matches customer-name patterns, so ordinary field-name keys (customer, material,
        // notes, title_block, part_number...) never match and pass through unchanged -- only a key that IS a
        // customer name is masked. The ORIGINAL key `k` is still passed as keyName so identity-field VALUE
        // masking (isIdentityKey) is unaffected.
        const keyField = path ? `${path}.${k}(key)` : `${k}(key)`;
        let outKey = k;
        let keyMasked = false;
        if (k.trim() && ALL_CUSTOMER_NAMES_UPPER.has(k.trim().toUpperCase())) {
          // the WHOLE key IS a customer name (any tier) -> unambiguous identity, mask wholesale.
          outKey = MASK;
          keyMasked = true;
          redactions.push({ type: "customer-text", field: keyField });
        } else {
          // a longer key may still EMBED a distinctive customer name (e.g. "drawn_for_SEMBLEX") -> scrub it.
          const kr = redactText(k, opts);
          outKey = kr.text;
          if (kr.redactions.length > 0) {
            keyMasked = true;
            for (const a of kr.redactions) redactions.push({ ...a, field: keyField });
          }
        }
        // Distinct masked keys must not silently collide (would drop a sibling's value). Suffix on clash.
        if (keyMasked && Object.prototype.hasOwnProperty.call(out, outKey)) {
          let i = 2;
          while (Object.prototype.hasOwnProperty.call(out, `${outKey}#${i}`)) i++;
          outKey = `${outKey}#${i}`;
        }
        out[outKey] = walk(v, k, path ? `${path}.${k}` : k);
      }
      return out;
    }
    if (typeof node === "string") {
      // an identity-keyed field is masked WHOLESALE (the whole value is the customer identity)
      if (keyName && isIdentityKey(keyName)) {
        if (node.trim().length > 0) redactions.push({ type: "customer-field", field: path });
        return MASK;
      }
      // a KNOWN non-PII spec field (material grade / revision / units / scale / ...): still scrub it, but
      // PROTECT material-grade tokens from the part-number pattern. A hyphenated grade like "AISI-1045"
      // matches the part-number shape but is not PII, so a BLANKET pass-through would corrupt a legit field
      // AND false-flag a clean part (over-redaction); but a blanket pass-through ALSO leaks a customer name
      // / part number embedded in a mislabeled spec value ("FINISH: ANODIZE FOR ITW", "MATERIAL: 4140 PER
      // ITW SPEC") -- under-redaction, the dangerous direction (caught by 3-of-3 scrutiny arm C). The
      // VALUE-aware `protectGrades` resolves both: customer names + real part numbers in the value are
      // masked, only a genuine grade token is preserved. See NON_PII_VALUE_KEYS + looksLikeMaterialGrade.
      if (keyName && isNonPiiKey(keyName)) {
        const sr = redactText(node, { ...opts, protectGrades: true });
        if (sr.redactions.length > 0) for (const a of sr.redactions) redactions.push({ ...a, field: path });
        return sr.text;
      }
      // otherwise scrub the free text for embedded customer names / part numbers
      const r = redactText(node, opts);
      if (r.redactions.length > 0) {
        for (const a of r.redactions) redactions.push({ ...a, field: path });
      }
      return r.text;
    }
    return node; // numbers / booleans / null pass through
  }

  const redacted = walk(extraction, null, "") as Record<string, unknown>;
  return { extraction: (redacted && typeof redacted === "object" ? redacted : {}), redactions };
}

export interface MaskRegion {
  bbox: number[];          // [x,y,w,h] fractional in [0,1] (region-classifier convention)
  region_kind: string;
  confidence?: number;
}

/**
 * Given the region-classifier output (its `regions` array of {bbox,region_kind,confidence}), return the
 * image regions to MASK on a rendered drawing -- the title-block region(s), whose bbox a renderer paints
 * over to hide the customer/part-number block. bbox is the SAME normalized fractional [x,y,w,h] the
 * region-classifier emits (a renderer scales to pixels via scaleBboxToPixels). Tolerant of either a bare
 * regions array or the `{regions:[...]}` wrapper. Only `valid` regions with a usable bbox are returned.
 */
export function redactionRegions(regionClassifierOutput: unknown): MaskRegion[] {
  const regions: unknown[] = Array.isArray(regionClassifierOutput)
    ? regionClassifierOutput
    : (regionClassifierOutput && typeof regionClassifierOutput === "object" && Array.isArray((regionClassifierOutput as { regions?: unknown[] }).regions)
        ? (regionClassifierOutput as { regions: unknown[] }).regions
        : []);
  const out: MaskRegion[] = [];
  for (const r of regions) {
    if (!r || typeof r !== "object") continue;
    const rr = r as { region_kind?: unknown; bbox?: unknown; confidence?: unknown; valid?: unknown };
    if (rr.region_kind !== "title_block") continue;
    if (rr.valid === false) continue;
    if (!Array.isArray(rr.bbox) || rr.bbox.length !== 4 || !rr.bbox.every((n) => typeof n === "number" && Number.isFinite(n))) continue;
    out.push({
      bbox: rr.bbox as number[],
      region_kind: "title_block",
      confidence: typeof rr.confidence === "number" ? rr.confidence : undefined,
    });
  }
  return out;
}
