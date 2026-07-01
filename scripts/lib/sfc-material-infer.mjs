// scripts/lib/sfc-material-infer.mjs
//
// SFC-JM-ACCURACY -- infer the ISO 513 machinability group (P/M/K/N/S/H) for a JM
// program from its file path / customer / part-name text, so the Taylor-Vc
// comparison (sfc-taylor-vc-lib) can pick the right canonical {C, n}. NC programs
// rarely state the material, but the shop's folder + file naming usually carries a
// grade ("4140", "A2", "303SS", "6061") or a category word ("tool steel",
// "stainless", "aluminum"). This is a LABELED heuristic with a confidence + the
// matched token -- never a silent assumption (units-first / no-assume doctrine).
//
// A die shop's default is carbon/alloy steel (P): when nothing matches we return
// P with confidence "default" so the caller can segment confident vs assumed.
//
// PURE: no fs / no fetch.

// Ordered specific -> generic. First match wins. `re` is tested against the
// UPPERCASED text. Grade numbers use boundaries so "D2" != "D250".
// PRECISION RULE (learned from a live 154k-program run, 2026-06-24): when scanning
// program COMMENTS, bare numeric grade tokens that collide with everyday numbers
// (625/718 superalloy = part/program numbers; 304/316 = random; 2024 = a YEAR)
// produce massive false positives that move AWAY from the P default -> wrong Taylor
// band. So non-P numeric grades are matched ONLY via material WORDS or DISTINCTIVE
// tokens (lettered tool-steel grades, aluminum 6061/7075). P numeric grades stay
// loose because a false P match is harmless (P is the default anyway).
const RULES = Object.freeze([
  // S -- titanium / nickel superalloys. WORDS only (bare 625/718 dropped: they are
  // overwhelmingly part/program numbers in a die shop, not Inconel).
  { iso: "S", conf: "high", re: /\bTI[-\s]?6AL\b|\bTITANIUM\b|\bINCONEL\b|\bHASTELLOY\b|\bWASPALOY\b|\bMONEL\b|\bNITRONIC\b/ },
  // H -- hardened tool/die steel: HRC / "hardened" / named tool-steel grades (the
  // staple of a die shop; lettered grades are distinctive enough for comments).
  { iso: "H", conf: "high", re: /\bHARDENED\b|\bHRC\b|\bTOOL\s?STEEL\b|\bDIE\s?STEEL\b|\b(?:A2|A-2|D2|D-2|S7|S-7|H13|H-13|52100|440C|CPM)\b/ },
  // M -- stainless: WORDS + distinctive PH grades (bare 303/304/316/410/420 dropped).
  { iso: "M", conf: "high", re: /\bSTAINLESS\b|\bINOX\b|\b(?:17-4|17-7|15-5)\b|\bSS\b/ },
  // N -- aluminum / copper / soft non-ferrous + plastics: WORDS + distinctive Al
  // grades 6061/7075/6063 (2024 dropped -- it is a year).
  { iso: "N", conf: "high", re: /\bALUM\w*\b|\b(?:6061|7075|6063)\b|\bBRASS\b|\bBRONZE\b|\bCOPPER\b|\bC360\b|\bDELRIN\b|\bACETAL\b|\bNYLON\b|\bUHMW\b|\bPLASTIC\b/ },
  // K -- cast iron (words only).
  { iso: "K", conf: "high", re: /\bCAST\s?IRON\b|\bGRAY\s?IRON\b|\bDUCTILE\b|\bNODULAR\b|\bGG25\b|\bCLASS\s?40\b/ },
  // P -- specific carbon/alloy steel grades (kept loose; false P == default, harmless).
  { iso: "P", conf: "high", re: /\b(?:1018|1020|1045|1144|12L14|4140|4150|4340|8620|A36|1215|1117)\b/ },
  // P -- generic steel category word (lowest-confidence positive match).
  { iso: "P", conf: "medium", re: /\bSTEEL\b|\bCARBON\b|\bALLOY\b|\bMILD\b/ },
]);

export const DEFAULT_ISO = "P"; // a die shop's predominant stock when nothing matches

/**
 * Infer the ISO 513 group from free text (path + customer + part name).
 * @param {string} text
 * @param {string} [defaultIso] the group to assume when nothing matches. Generic
 *   callers leave it "P"; the JM pipeline passes the shop's MODAL stock group
 *   (H -- 93.7% of JM purchases are tool steel; see sfc-jm-stock-prior).
 * @returns {{ iso:'P'|'M'|'K'|'N'|'S'|'H', confidence:'high'|'medium'|'default', matched:string|null }}
 */
export function inferIsoGroup(text, defaultIso = DEFAULT_ISO) {
  if (typeof text !== "string" || text.length === 0) {
    return { iso: defaultIso, confidence: "default", matched: null };
  }
  const up = text.toUpperCase();
  for (const rule of RULES) {
    const m = up.match(rule.re);
    if (m) return { iso: rule.iso, confidence: rule.conf, matched: m[0].trim() };
  }
  return { iso: defaultIso, confidence: "default", matched: null };
}
