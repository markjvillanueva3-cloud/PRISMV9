/**
 * holder-categorization.ts — the canonical, CAM-AGNOSTIC tool-HOLDER axis: interface family,
 * taper size, and contact type (taper-only vs dual-contact/BIG-PLUS vs inherently-dual).
 * =============================================================================
 * Operator directive (2026-06-01): separate CAT/BT holders by TAPER SIZE and by whether they
 * are dual-contact / BIG-PLUS — and keep it identical across all CAD/CAM software. Sibling of
 * tool-material-categorization.ts (same shape: taxonomy const + normalize fn + zod schema +
 * categorize fn). Does NOT re-store the per-size spindle physics — those stay authoritative in
 * ToolHolderDatabaseEngine.HOLDER_DB; this module carries only the AXIS.
 *
 * AUTHORITATIVE TAXONOMY (BIG DAISHOWA, the BIG-PLUS inventor — verified by adversarial review,
 * overriding a mislabel in the live holders.json data, see HOLDER-DB-DATA-BUGS note):
 *   • BBT = BIG-PLUS on a BT (JIS B6339) taper  → dual_contact_big_plus
 *   • BCV = BIG-PLUS on a CAT/CV (ANSI B5.50 V-flange) taper → dual_contact_big_plus   ← BCV is CAT, not BT
 *   • CAT / CV / BT / SK (plain) → taper_only (steep 7/24 taper register only)
 *   • HSK (DIN 69893), CAPTO (ISO 26623), KM, PSC → inherently_dual (taper + face by design)
 * DUAL-CONTACT means simultaneous steep-taper + spindle gauge-FACE contact. BIG-PLUS face engagement
 * requires BOTH holder AND spindle to be BIG-PLUS; a BIG-PLUS holder in a standard spindle runs
 * taper-only (backward compatible). The dominant real signal in PRISM's corpus is the record's
 * `taper` field carrying a `*_bigplus` suffix (e.g. "cat40_bigplus") — categorizeHolder reads it,
 * because most BIG-PLUS holders keep a plain "CAT40"/"BT40" designation.
 */
import { z } from "zod";

export const HOLDER_CONTACT_TYPES = {
  TAPER_ONLY: "taper_only",                 // plain CAT/BT/SK — steep taper register only
  DUAL_CONTACT_BIG_PLUS: "dual_contact_big_plus", // BBT/BCV/*_bigplus — taper + face (BIG-PLUS retrofit on a steep taper)
  INHERENTLY_DUAL: "inherently_dual",       // HSK/CAPTO/KM/PSC — taper + face by design
  UNKNOWN: "unknown",                       // not parseable — fail-loud, never guess
} as const;
export type HolderContactType = (typeof HOLDER_CONTACT_TYPES)[keyof typeof HOLDER_CONTACT_TYPES];

export const HOLDER_INTERFACE_FAMILIES = {
  CAT: "CAT", BT: "BT", SK: "SK", HSK: "HSK", CAPTO: "CAPTO", KM: "KM", PSC: "PSC", UNKNOWN: "unknown",
} as const;
export type HolderInterfaceFamily = (typeof HOLDER_INTERFACE_FAMILIES)[keyof typeof HOLDER_INTERFACE_FAMILIES];

// Standard taper sizes per family — ONLY those present in ToolHolderDatabaseEngine.HOLDER_DB
// (no fabricated sizes: CAT35 / BT60 deliberately omitted — absent from the DB).
export const CAT_TAPER_SIZES = [30, 40, 45, 50, 60] as const; // ANSI B5.50 7/24 steep V-flange
export const BT_TAPER_SIZES = [30, 35, 40, 45, 50] as const;  // JIS B6339 / MAS 403 7/24 steep
export const SK_TAPER_SIZES = [30, 40, 50] as const;          // DIN 2080 European steep
const TAPER_SIZES_BY_FAMILY: Partial<Record<HolderInterfaceFamily, readonly number[]>> = {
  CAT: CAT_TAPER_SIZES, BT: BT_TAPER_SIZES, SK: SK_TAPER_SIZES,
};

export const HolderCategorySchema = z.object({
  interface: z.enum(["CAT", "BT", "SK", "HSK", "CAPTO", "KM", "PSC", "unknown"]),
  taperSize: z.number().int().nullable(),            // 30/35/40/45/50/60 for steep families; null otherwise
  formSize: z.string().nullable().optional(),        // "A63", "C6", "KM63" when taperSize is null
  contactType: z.enum(["taper_only", "dual_contact_big_plus", "inherently_dual", "unknown"]),
  standard: z.string().optional(),                   // back-ref to HOLDER_DB standard (not re-derived)
  bigPlusLicensed: z.boolean().optional(),           // true ONLY from an explicit licensed-maker flag (never inferred)
  matchedDesignation: z.string().optional(),         // canonical token that produced the match, e.g. "BBT40"
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
});
export type HolderCategory = z.infer<typeof HolderCategorySchema>;

const F = HOLDER_INTERFACE_FAMILIES;
const C = HOLDER_CONTACT_TYPES;

/** Steep-family prefix rules, START-ANCHORED + longest-BIG-PLUS-first (BBT/BCV before BT/CV). */
const STEEP_RULES: { re: RegExp; family: HolderInterfaceFamily; contact: HolderContactType; canon: string }[] = [
  { re: /^BBT(\d+)/, family: F.BT, contact: C.DUAL_CONTACT_BIG_PLUS, canon: "BBT" },
  { re: /^BCV(\d+)/, family: F.CAT, contact: C.DUAL_CONTACT_BIG_PLUS, canon: "BCV" }, // BCV = BIG-PLUS CAT (per BIG DAISHOWA)
  { re: /^CAT(\d+)/, family: F.CAT, contact: C.TAPER_ONLY, canon: "CAT" },
  { re: /^CV(\d+)/, family: F.CAT, contact: C.TAPER_ONLY, canon: "CV" },              // CV = V-flange shorthand for CAT
  { re: /^BT(\d+)/, family: F.BT, contact: C.TAPER_ONLY, canon: "BT" },
  { re: /^(?:SK|DIN2080)(\d+)/, family: F.SK, contact: C.TAPER_ONLY, canon: "SK" },
];

/**
 * Parse a holder designation string → interface family + taper size + contact type.
 * START-ANCHORED so "BCV40" can never leak into the bare-"BT"/"CV" branch.
 * Returns null on unknown (never fabricates a family).
 * @returns {interface, taperSize, formSize, contactType, matched} | null
 */
export function normalizeHolderDesignation(text: string): {
  interface: HolderInterfaceFamily;
  taperSize: number | null;
  formSize: string | null;
  contactType: HolderContactType;
  matched: string;
} | null {
  if (typeof text !== "string") return null;
  const t = text.toUpperCase().replace(/[\s._-]/g, "");
  if (!t) return null;

  // Steep families (CAT/BT/SK + BIG-PLUS variants)
  for (const rule of STEEP_RULES) {
    const m = t.match(rule.re);
    if (m) {
      const size = parseInt(m[1], 10);
      const valid = TAPER_SIZES_BY_FAMILY[rule.family]?.includes(size) ?? false;
      return {
        interface: rule.family,
        taperSize: valid ? size : null, // size-validity gate: invalid size → null (not fabricated)
        formSize: null,
        contactType: rule.contact,
        matched: `${rule.canon}${valid ? size : m[1]}`,
      };
    }
  }
  // HSK (DIN 69893) — form A/B/C/D/E/F/T + size → inherently dual
  const hsk = t.match(/^HSK([ABCDEFT])(\d+)/);
  if (hsk) return { interface: F.HSK, taperSize: null, formSize: `${hsk[1]}${hsk[2]}`, contactType: C.INHERENTLY_DUAL, matched: `HSK${hsk[1]}${hsk[2]}` };
  // CAPTO (ISO 26623) — "CAPTOC6" / "C6" → inherently dual
  const capto = t.match(/^(?:CAPTO)?C(\d+)$/);
  if (capto) return { interface: F.CAPTO, taperSize: null, formSize: `C${capto[1]}`, contactType: C.INHERENTLY_DUAL, matched: `C${capto[1]}` };
  // KM / PSC — modular polygon, inherently dual
  const km = t.match(/^KM(\d+)/);
  if (km) return { interface: F.KM, taperSize: null, formSize: `KM${km[1]}`, contactType: C.INHERENTLY_DUAL, matched: `KM${km[1]}` };
  const psc = t.match(/^PSC(\d+)/);
  if (psc) return { interface: F.PSC, taperSize: null, formSize: `PSC${psc[1]}`, contactType: C.INHERENTLY_DUAL, matched: `PSC${psc[1]}` };

  return null;
}

/** Detect a BIG-PLUS dual-contact signal carried OUTSIDE the designation — the dominant signal in
 *  PRISM's corpus, where a dual-contact holder keeps a plain "CAT40" designation but tags its
 *  `taper` field (`cat40_bigplus`) or its name/description ("BIG-PLUS", "dual contact"). */
function hasBigPlusSignal(spec: { taper?: string; name?: string; description?: string }): boolean {
  const blob = `${spec.taper ?? ""} ${spec.name ?? ""} ${spec.description ?? ""}`.toLowerCase();
  return /_bigplus|\bbig[\s-]?plus\b|dual[\s-]?contact/.test(blob);
}

export type HolderInput =
  | string
  | {
      interface?: string; id?: string; name?: string; description?: string;
      taper?: string; standard?: string; bigPlusLicensed?: boolean;
    };

/**
 * Canonical holder categorization (the cross-CAM holder axis). Accepts a designation string OR a
 * holder record. Reads the `*_bigplus` taper field / BIG-PLUS name token so a dual-contact holder
 * with a plain "CAT40" designation is NOT mislabeled taper_only (the dominant-signal fix).
 * `bigPlusLicensed` is set ONLY from an explicit flag — never inferred (avoids a false-safety claim).
 */
export function categorizeHolder(input: HolderInput): HolderCategory {
  const spec = typeof input === "string" ? { interface: input } : (input || {});
  const designation = spec.interface || spec.id || spec.name || "";
  const norm = normalizeHolderDesignation(designation);
  const bigPlus = typeof input === "string" ? false : hasBigPlusSignal(spec);

  if (!norm) {
    // unparseable designation: still honor an out-of-band BIG-PLUS signal, else unknown.
    return HolderCategorySchema.parse({
      interface: F.UNKNOWN,
      taperSize: null,
      contactType: bigPlus ? C.DUAL_CONTACT_BIG_PLUS : C.UNKNOWN,
      standard: spec.standard,
      bigPlusLicensed: spec.bigPlusLicensed === true ? true : undefined,
      matchedDesignation: designation || undefined,
      confidence: "low",
    });
  }

  // A steep family flagged BIG-PLUS out-of-band is dual-contact even with a plain designation.
  let contactType = norm.contactType;
  if (bigPlus && (norm.interface === F.CAT || norm.interface === F.BT || norm.interface === F.SK)) {
    contactType = C.DUAL_CONTACT_BIG_PLUS;
  }
  // confidence: high when designation parsed to a valid taper size (or a form-size family); low if size invalid.
  const sizeKnown = norm.taperSize !== null || norm.formSize !== null;
  return HolderCategorySchema.parse({
    interface: norm.interface,
    taperSize: norm.taperSize,
    formSize: norm.formSize ?? undefined,
    contactType,
    standard: spec.standard,
    bigPlusLicensed: spec.bigPlusLicensed === true ? true : undefined,
    matchedDesignation: norm.matched,
    confidence: sizeKnown ? "high" : "low",
  });
}
