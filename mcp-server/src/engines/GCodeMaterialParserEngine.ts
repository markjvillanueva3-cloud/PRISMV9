/**
 * GCodeMaterialParserEngine — extract the material callout from the header
 * comment block of a CNC program.
 *
 * QUOTING-SYNERGY-MS0/U-QP-MATERIAL-FROM-GCODE-PARSE (slot:charlie iter48 2026-05-26).
 *
 * JM Die's program corpus stores material in the COMMENT HEADER, not the
 * file path. iter45 detected material from path tokens (AL6061/SS304/D2 etc.)
 * — but only ~40% of JM programs carry a discriminating path token. The
 * other ~60% need a header parser.
 *
 * Supported header dialects (each maps to ≥1 controller in JM's shop):
 *
 *   Fanuc / Haas / Hurco — paren-bracketed comments:
 *     (MATERIAL: 6061-T6)
 *     (MATL = SS304)
 *     (MAT: D2 TOOL STEEL)
 *
 *   Mazatrol — semicolon comments in MAZAK_PMT records:
 *     ;MAT=ALUMINUM 6061
 *     ;MATL: 4140 PH
 *
 *   Okuma OSP — paren or @-prefixed:
 *     (MATERIAL = AL6061)
 *     @MATL=Ti-6Al-4V
 *
 *   Mitsubishi WEDM — short paren tags:
 *     (MAT D2)
 *     (D=D2)   ← rarer, ambiguous; not matched
 *
 *   Generic shop-floor comments:
 *     ; Material: H13 Tool Steel
 *     ; STK: 1018 CRS
 *
 * The parser is intentionally NON-DESTRUCTIVE:
 *   - reads ONLY the header window (default first 50 non-blank lines)
 *   - never modifies input
 *   - returns {material, confidence, dialect, raw_match} on hit, OR
 *     {material:null, confidence:0, dialect:null, reason} on miss
 *
 * Confidence model (the SUBSTRATE downstream needs to know how much to
 * trust the label — calibration weights low-confidence labels less):
 *   - 0.95 — explicit "MATERIAL:" keyword + recognized material body
 *   - 0.85 — "MATL" or "MAT=" or "STK:" + recognized body
 *   - 0.70 — short "(MAT X)" tag with recognized body
 *   - 0.55 — recognized material body but no labeling keyword (line was a
 *     setup-sheet header like "(6061-T6 STOCK)")
 *
 * NORMALIZATION — once a body is matched, normalize() canonicalizes it:
 *   - case-folds to lowercase
 *   - strips Te/Tg/PH suffixes when not part of the canonical name
 *   - maps common aliases (e.g. "AL 6061" / "AL-6061" / "6061-T6" → "aluminum_6061")
 *   - DOES NOT lose the alloy designation — "AL7075" stays distinct from "AL6061"
 *
 * R12 — when the header carries TWO conflicting material callouts (rare but
 * possible: an "old material" comment line + a "new material" override),
 * the parser returns BOTH in `candidates[]` and degrades confidence to the
 * MIN of the two; calibration treats `candidates.length > 1` as a quality
 * signal (likely operator-corrected program).
 */

// ─── Pattern table — extracted so tests can introspect ─────────────────────

/** Header window — number of non-blank leading lines scanned for material. */
const HEADER_WINDOW_LINES = 50;

/** Confidence ceilings per labeling-keyword class. */
const CONFIDENCE_MATERIAL_KEYWORD = 0.95;
const CONFIDENCE_MATL_KEYWORD = 0.85;
const CONFIDENCE_SHORT_TAG = 0.70;
const CONFIDENCE_NO_KEYWORD = 0.55;
const CONFIDENCE_NULL = 0;

export type MaterialDialect =
  | "fanuc-paren"
  | "mazatrol-semi"
  | "okuma-osp"
  | "mitsubishi-wedm"
  | "generic-shop"
  | null;

export interface MaterialMatch {
  material: string | null;
  iso_group: string | null;          // P / M / K / N / S / H or null
  confidence: number;                // 0..1
  dialect: MaterialDialect;
  raw_match: string | null;
  candidates: string[];              // > 1 only when header has conflicting callouts
  reason?: string;                   // when material === null
}

// ─── Body recognizer — maps recognized strings → canonical material id ────

/**
 * Letter-boundary lookaround used throughout — `_` is a word char in JS
 * regex `\b`, so we can't use `\b` for tokens like AL_6061; the lookaround
 * (?<![a-z0-9]) / (?![a-z0-9]) gives a true alphanumeric edge.
 *
 * The pattern list is order-sensitive — more-specific aliases come first
 * (e.g. "AL7075-T6" before "AL7075" before "7075") so we don't match a
 * generic substring when a fuller one is present.
 */
interface MaterialRule {
  pattern: RegExp;
  canonical: string;
  iso_group: string; // P / M / K / N / S / H
}

const MATERIAL_RULES: MaterialRule[] = [
  // ISO N — Aluminum
  { pattern: /(?<![a-z0-9])al[-_\s]?7075[-_\s]?t?6?(?![a-z0-9])/i, canonical: "aluminum_7075", iso_group: "N" },
  { pattern: /(?<![a-z0-9])7075[-_\s]?t?6?(?![a-z0-9])/i, canonical: "aluminum_7075", iso_group: "N" },
  { pattern: /(?<![a-z0-9])al[-_\s]?6061[-_\s]?t?6?(?![a-z0-9])/i, canonical: "aluminum_6061", iso_group: "N" },
  { pattern: /(?<![a-z0-9])6061[-_\s]?t?6?(?![a-z0-9])/i, canonical: "aluminum_6061", iso_group: "N" },
  { pattern: /(?<![a-z0-9])al[-_\s]?2024(?![a-z0-9])/i, canonical: "aluminum_2024", iso_group: "N" },
  { pattern: /(?<![a-z0-9])aluminum(?![a-z0-9])/i, canonical: "aluminum_generic", iso_group: "N" },

  // ISO P — Carbon + Low-alloy Steel
  { pattern: /(?<![a-z0-9])4140(?:[-_\s]?ph)?(?![a-z0-9])/i, canonical: "steel_4140", iso_group: "P" },
  { pattern: /(?<![a-z0-9])4340(?![a-z0-9])/i, canonical: "steel_4340", iso_group: "P" },
  { pattern: /(?<![a-z0-9])1018(?:[-_\s]?crs)?(?![a-z0-9])/i, canonical: "steel_1018", iso_group: "P" },
  { pattern: /(?<![a-z0-9])1045(?![a-z0-9])/i, canonical: "steel_1045", iso_group: "P" },
  { pattern: /(?<![a-z0-9])a36(?![a-z0-9])/i, canonical: "steel_a36", iso_group: "P" },

  // ISO M — Stainless Steel
  { pattern: /(?<![a-z0-9])ss[-_\s]?304(?![a-z0-9])/i, canonical: "stainless_304", iso_group: "M" },
  { pattern: /(?<![a-z0-9])304[-_\s]?ss(?![a-z0-9])/i, canonical: "stainless_304", iso_group: "M" },
  { pattern: /(?<![a-z0-9])ss[-_\s]?316(?![a-z0-9])/i, canonical: "stainless_316", iso_group: "M" },
  { pattern: /(?<![a-z0-9])316[-_\s]?ss(?![a-z0-9])/i, canonical: "stainless_316", iso_group: "M" },
  { pattern: /(?<![a-z0-9])17[-_\s]?4(?:[-_\s]?ph)?(?![a-z0-9])/i, canonical: "stainless_17_4_ph", iso_group: "M" },
  { pattern: /(?<![a-z0-9])15[-_\s]?5(?:[-_\s]?ph)?(?![a-z0-9])/i, canonical: "stainless_15_5_ph", iso_group: "M" },

  // ISO H — Tool Steel + Hardened
  { pattern: /(?<![a-z0-9])d2(?:[-_\s]?tool)?(?![a-z0-9])/i, canonical: "tool_steel_d2", iso_group: "H" },
  { pattern: /(?<![a-z0-9])h13(?![a-z0-9])/i, canonical: "tool_steel_h13", iso_group: "H" },
  { pattern: /(?<![a-z0-9])a2(?![a-z0-9])/i, canonical: "tool_steel_a2", iso_group: "H" },
  { pattern: /(?<![a-z0-9])s7(?![a-z0-9])/i, canonical: "tool_steel_s7", iso_group: "H" },
  { pattern: /(?<![a-z0-9])o1(?![a-z0-9])/i, canonical: "tool_steel_o1", iso_group: "H" },

  // ISO S — Superalloy + Titanium
  { pattern: /(?<![a-z0-9])inconel(?:[-_\s]?718)?(?![a-z0-9])/i, canonical: "inconel_718", iso_group: "S" },
  { pattern: /(?<![a-z0-9])in718(?![a-z0-9])/i, canonical: "inconel_718", iso_group: "S" },
  { pattern: /(?<![a-z0-9])ti[-_\s]?6al[-_\s]?4v(?![a-z0-9])/i, canonical: "titanium_6al_4v", iso_group: "S" },
  { pattern: /(?<![a-z0-9])titanium(?![a-z0-9])/i, canonical: "titanium_generic", iso_group: "S" },

  // ISO K — Cast Iron
  { pattern: /(?<![a-z0-9])cast[-_\s]?iron(?![a-z0-9])/i, canonical: "cast_iron_generic", iso_group: "K" },
  { pattern: /(?<![a-z0-9])g[-_\s]?40(?![a-z0-9])/i, canonical: "cast_iron_g40", iso_group: "K" },
  { pattern: /(?<![a-z0-9])ductile[-_\s]?iron(?![a-z0-9])/i, canonical: "ductile_iron", iso_group: "K" },
];

// ─── Header-line dialect classifiers ───────────────────────────────────────

interface DialectHit {
  dialect: MaterialDialect;
  /** Confidence for the LABEL — the body confidence is computed separately. */
  label_confidence: number;
  /** The substring of the line that contained the material body (post-label). */
  body: string;
  /** The full matched line (for raw_match). */
  raw_match: string;
}

/**
 * Try every dialect classifier in sequence. The order matters: more-specific
 * dialects (semi-colon Mazatrol, @-prefixed Okuma) come before the generic
 * paren and shop-floor catch-alls.
 */
function classifyLine(line: string): DialectHit | null {
  // Mazatrol — `;MAT[L]?[ =:] ...` (semicolon comments)
  let m = line.match(/^\s*;\s*MAT(?:L|ERIAL)?\s*[:=]\s*(.+)$/i);
  if (m) {
    return {
      dialect: "mazatrol-semi",
      label_confidence: /^;\s*MATERIAL/i.test(line) ? CONFIDENCE_MATERIAL_KEYWORD : CONFIDENCE_MATL_KEYWORD,
      body: m[1],
      raw_match: line,
    };
  }

  // Okuma OSP — `@MATL=...` or `(MATERIAL = ...)`
  m = line.match(/^\s*@\s*MAT(?:L|ERIAL)?\s*[:=]\s*(.+)$/i);
  if (m) {
    return {
      dialect: "okuma-osp",
      label_confidence: /^@\s*MATERIAL/i.test(line) ? CONFIDENCE_MATERIAL_KEYWORD : CONFIDENCE_MATL_KEYWORD,
      body: m[1],
      raw_match: line,
    };
  }

  // Fanuc/Haas/Hurco/Okuma paren — `(MATERIAL: ...)` / `(MATL = ...)` / `(MAT: ...)`
  m = line.match(/\(\s*MAT(?:L|ERIAL)?\s*[:=]\s*([^)]+)\)/i);
  if (m) {
    return {
      dialect: "fanuc-paren",
      label_confidence: /\(\s*MATERIAL/i.test(line) ? CONFIDENCE_MATERIAL_KEYWORD : CONFIDENCE_MATL_KEYWORD,
      body: m[1],
      raw_match: line,
    };
  }

  // Mitsubishi WEDM short tag — `(MAT X)` (no colon, no equals)
  m = line.match(/\(\s*MAT\s+([^)]+)\)/i);
  if (m) {
    return {
      dialect: "mitsubishi-wedm",
      label_confidence: CONFIDENCE_SHORT_TAG,
      body: m[1],
      raw_match: line,
    };
  }

  // Generic shop-floor — `; Material: ...` / `; STK: ...` / `; STOCK: ...`
  m = line.match(/^\s*;\s*(?:MATERIAL|STK|STOCK)\s*[:=]\s*(.+)$/i);
  if (m) {
    return {
      dialect: "generic-shop",
      label_confidence: /^;\s*MATERIAL/i.test(line) ? CONFIDENCE_MATERIAL_KEYWORD : CONFIDENCE_MATL_KEYWORD,
      body: m[1],
      raw_match: line,
    };
  }

  return null;
}

// ─── Body matcher — first matching rule wins ───────────────────────────────

interface BodyMatch {
  canonical: string;
  iso_group: string;
  raw: string;
}

function matchBody(body: string): BodyMatch | null {
  for (const rule of MATERIAL_RULES) {
    const m = body.match(rule.pattern);
    if (m) {
      return { canonical: rule.canonical, iso_group: rule.iso_group, raw: m[0] };
    }
  }
  return null;
}

// ─── Public API ────────────────────────────────────────────────────────────

export interface ParseOptions {
  /** Override the header window — number of non-blank lines scanned. */
  headerWindowLines?: number;
  /** When true, scan the FULL program (not just the header) for materials.
   *  Use sparingly — sets a longer scan budget and trades precision for recall. */
  scanFullProgram?: boolean;
}

export class GCodeMaterialParserEngine {
  /**
   * Parse a G-code program string and return the best material match found
   * in its header. Returns a structured result with confidence + dialect;
   * null material when no recognized callout is present.
   */
  static parse(program: string, opts: ParseOptions = {}): MaterialMatch {
    if (!program || typeof program !== "string") {
      return {
        material: null,
        iso_group: null,
        confidence: CONFIDENCE_NULL,
        dialect: null,
        raw_match: null,
        candidates: [],
        reason: "empty-or-non-string-input",
      };
    }

    const windowLines = opts.headerWindowLines ?? HEADER_WINDOW_LINES;
    const lines = program.split(/\r?\n/);
    const scanLines = opts.scanFullProgram ? lines : lines.slice(0, windowLines * 2); // ×2 to absorb blank lines

    const hits: { dialect: MaterialDialect; canonical: string; iso_group: string; confidence: number; raw_match: string }[] = [];

    let nonBlankSeen = 0;
    for (const line of scanLines) {
      if (line.trim().length === 0) continue;
      nonBlankSeen += 1;
      if (!opts.scanFullProgram && nonBlankSeen > windowLines) break;

      const dialectHit = classifyLine(line);
      if (dialectHit) {
        const bodyHit = matchBody(dialectHit.body);
        if (bodyHit) {
          hits.push({
            dialect: dialectHit.dialect,
            canonical: bodyHit.canonical,
            iso_group: bodyHit.iso_group,
            confidence: dialectHit.label_confidence,
            raw_match: dialectHit.raw_match,
          });
        }
      } else {
        // No labeling keyword — still try to recognize a bare material body
        // on a paren-comment line. Lower confidence floor.
        const parenMatch = line.match(/\(([^)]+)\)/);
        if (parenMatch) {
          const bodyHit = matchBody(parenMatch[1]);
          if (bodyHit) {
            hits.push({
              dialect: "fanuc-paren",
              canonical: bodyHit.canonical,
              iso_group: bodyHit.iso_group,
              confidence: CONFIDENCE_NO_KEYWORD,
              raw_match: line,
            });
          }
        }
      }
    }

    if (hits.length === 0) {
      return {
        material: null,
        iso_group: null,
        confidence: CONFIDENCE_NULL,
        dialect: null,
        raw_match: null,
        candidates: [],
        reason: "no-material-callout-in-header",
      };
    }

    // Multiple distinct canonical materials → conflict. Degrade to MIN
    // confidence and surface all candidates so calibration can downweight
    // the label.
    const uniqueCanonicals = [...new Set(hits.map((h) => h.canonical))];
    if (uniqueCanonicals.length > 1) {
      const minConfidence = Math.min(...hits.map((h) => h.confidence));
      const first = hits[0];
      return {
        material: first.canonical,
        iso_group: first.iso_group,
        confidence: minConfidence,
        dialect: first.dialect,
        raw_match: first.raw_match,
        candidates: uniqueCanonicals,
        reason: "header-contains-conflicting-material-callouts",
      };
    }

    // Single material, possibly multiple matches → highest-confidence hit.
    const best = hits.reduce((a, b) => (b.confidence > a.confidence ? b : a));
    return {
      material: best.canonical,
      iso_group: best.iso_group,
      confidence: best.confidence,
      dialect: best.dialect,
      raw_match: best.raw_match,
      candidates: [best.canonical],
    };
  }

  /** Expose the rule table + confidence ladder for test introspection. */
  static readonly RULES: ReadonlyArray<MaterialRule> = Object.freeze(MATERIAL_RULES);
  static readonly CONFIDENCE = Object.freeze({
    MATERIAL_KEYWORD: CONFIDENCE_MATERIAL_KEYWORD,
    MATL_KEYWORD: CONFIDENCE_MATL_KEYWORD,
    SHORT_TAG: CONFIDENCE_SHORT_TAG,
    NO_KEYWORD: CONFIDENCE_NO_KEYWORD,
    NULL: CONFIDENCE_NULL,
  });
  static readonly HEADER_WINDOW_LINES = HEADER_WINDOW_LINES;
}

export const gCodeMaterialParserEngine = GCodeMaterialParserEngine;
export default gCodeMaterialParserEngine;
