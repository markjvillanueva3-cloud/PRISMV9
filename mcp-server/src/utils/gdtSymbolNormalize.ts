/**
 * GD&T geometric-characteristic symbol normalizer (PRODUCTION clone of the script-side
 * `scripts/lib/ollama-vision-extract-lib.mjs::normalizeGdtSymbol`).
 *
 * Maps a VLM's GD&T symbol emission -- a canonical GDTSymbol name, a shop abbreviation ("TP", "POS",
 * "PERP"), a variant spelling ("true position", "roundness"), or an ASME Y14.5 unicode symbol -- to the
 * canonical GDTSymbol name (one of the 14), else null. NEVER fabricates a symbol (R12).
 *
 * WHY: BlueprintVisionOCREngine.convertGDT takes the VLM's `symbol` VERBATIM, and gdtFcfValidate's
 * SYMBOL_TO_PARSER lookup only recognizes the canonical/parser names -- so a non-canonical emission
 * ("TP") yields an unrecognized symbol -> the frame is NOT FCF-validated -> a datum-deficient position
 * callout is silently NOT flagged. Normalizing the symbol first closes that gap in production.
 *
 * Documented cross-boundary CLONE: the production MCP bundle cannot import the `.mjs`, so the mappings
 * are duplicated here and PINNED IDENTICAL by parallel test suites (so the clones cannot silently
 * diverge). Pure-ASCII source: the ASME unicode symbols are built via `String.fromCharCode`. Mirrors the
 * `surfaceFinishNormalize.ts` / `threadCalloutNormalize.ts` dual-home pattern.
 */

/** The 14 canonical ASME Y14.5 geometric-characteristic symbol names (the OCR-side GDTSymbol vocabulary). */
const GDT_CANONICAL: ReadonlySet<string> = new Set([
  "position", "flatness", "perpendicularity", "parallelism", "concentricity", "circularity",
  "cylindricity", "profile_line", "profile_surface", "circular_runout", "total_runout",
  "straightness", "symmetry", "angularity",
]);

/** ASCII-safe unicode codepoint -> character (keeps this source pure-ASCII). */
const U = (n: number): string => String.fromCharCode(n);

// alias -> canonical. Keys are lowercased + whitespace-collapsed shop abbreviations / variant spellings,
// OR an ASME Y14.5 unicode symbol (built via String.fromCharCode).
const GDT_ALIAS: ReadonlyMap<string, string> = new Map<string, string>([
  ["true position", "position"], ["pos", "position"], ["tp", "position"], ["posn", "position"], [U(0x2316), "position"],
  ["flat", "flatness"], ["flt", "flatness"], [U(0x23e5), "flatness"],
  ["straight", "straightness"], ["str", "straightness"], ["strt", "straightness"], [U(0x23e4), "straightness"],
  ["roundness", "circularity"], ["round", "circularity"], ["circ", "circularity"], ["rnd", "circularity"],
  ["cyl", "cylindricity"], [U(0x232d), "cylindricity"],
  ["profile of a line", "profile_line"], ["line profile", "profile_line"], ["prof line", "profile_line"], [U(0x2312), "profile_line"],
  ["profile of a surface", "profile_surface"], ["surface profile", "profile_surface"], ["prof surface", "profile_surface"], [U(0x2313), "profile_surface"],
  ["perp", "perpendicularity"], ["perpendicular", "perpendicularity"], [U(0x22a5), "perpendicularity"],
  ["angular", "angularity"], ["ang", "angularity"], [U(0x2220), "angularity"],
  ["parallel", "parallelism"], ["para", "parallelism"], ["pll", "parallelism"], [U(0x2225), "parallelism"], [U(0x2016), "parallelism"],
  ["concentric", "concentricity"], ["conc", "concentricity"], [U(0x25ce), "concentricity"],
  ["sym", "symmetry"], ["symmetric", "symmetry"], [U(0x232f), "symmetry"],
  ["runout", "circular_runout"], ["run out", "circular_runout"], ["circular runout", "circular_runout"], ["cro", "circular_runout"], [U(0x2197), "circular_runout"],
  ["total runout", "total_runout"], ["total run out", "total_runout"], ["tro", "total_runout"], [U(0x2330), "total_runout"],
]);

/**
 * Normalize a VLM GD&T symbol emission to the canonical GDTSymbol name.
 * @param raw the VLM `symbol` field (e.g. "TP", "true position", a unicode symbol, "PERP")
 * @returns canonical GDTSymbol name, or null when not recognizable (never fabricated -- R12)
 */
export function normalizeGdtSymbol(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw).replace(/\s+/g, " ").trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  const underscored = lower.replace(/[\s-]+/g, "_");
  if (GDT_CANONICAL.has(underscored)) return underscored; // already canonical ("profile line" -> profile_line)
  const bySymbol = GDT_ALIAS.get(s);
  if (bySymbol) return bySymbol; // unicode symbol (case preserved)
  const byLower = GDT_ALIAS.get(lower);
  if (byLower) return byLower; // abbreviation / spelling
  // strip trailing GD&T noise words and retry ("position tol" -> "position")
  const head = lower.replace(/\b(tol|tolerance|control|callout|of)\b/g, " ").replace(/\s+/g, " ").trim();
  if (head !== lower) {
    const hu = head.replace(/[\s-]+/g, "_");
    if (GDT_CANONICAL.has(hu)) return hu;
    const byHead = GDT_ALIAS.get(head);
    if (byHead) return byHead;
  }
  return null;
}
