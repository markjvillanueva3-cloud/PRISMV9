/**
 * osha-ppe-standards.ts -- HOTEL-ERP / U-ERP-OSHA-PPE-STANDARD-CITE
 * ================================================================
 *
 * Canonical 29 CFR governing-standard table for PPE, plus a pure classifier that
 * maps a free-text `ppe_type` (as stored on a PPEAssignment) to the OSHA standard
 * that governs it. A compliance engine that tracks PPE must be able to cite WHICH
 * standard mandates each item -- 1910.132(d) requires a hazard assessment that
 * selects PPE per the specific Subpart I standards below.
 *
 * These are REAL, published OSHA citations (29 CFR 1910 Subpart I, plus 1910.95 in
 * Subpart G for hearing) -- reference regulation, not fabricated and not a physics
 * constant. The classifier is keyword-based and deterministic; anything it cannot
 * map to a specific standard (back-support belts, hi-vis vests -- which OSHA does
 * NOT recognize as a specific Subpart I PPE standard) falls back to the 1910.132
 * GENERAL requirements, the honest cite rather than inventing a specific section.
 */

export interface OSHAStandard {
  /** Full citation, e.g. "29 CFR 1910.133". */
  code: string;
  /** Short human title of the standard. */
  title: string;
}

/** The canonical PPE-governing standards (single source of truth for the cites). */
export const OSHA_PPE_STANDARDS = {
  general: { code: "29 CFR 1910.132", title: "General requirements (PPE hazard assessment & selection)" },
  eye_face: { code: "29 CFR 1910.133", title: "Eye and face protection" },
  respiratory: { code: "29 CFR 1910.134", title: "Respiratory protection" },
  head: { code: "29 CFR 1910.135", title: "Head protection" },
  foot: { code: "29 CFR 1910.136", title: "Foot protection" },
  hand: { code: "29 CFR 1910.138", title: "Hand protection" },
  hearing: { code: "29 CFR 1910.95", title: "Occupational noise exposure (hearing protection)" },
} as const;

/**
 * Map a free-text PPE type to its governing OSHA standard (deterministic, keyword-based,
 * case-insensitive). Order matters where a type could match more than one bucket; the
 * checks are arranged so the more specific hazard wins. Unknown / non-Subpart-I items
 * (back belt, hi-vis vest, empty) -> the 1910.132 general requirements (the honest
 * fallback, never undefined). Never throws.
 */
export function oshaStandardForPPE(ppeType: string): OSHAStandard {
  const t = String(ppeType ?? "").toLowerCase();
  if (/respirat|n95|scba|\bmask\b/.test(t)) return OSHA_PPE_STANDARDS.respiratory;
  if (/glass|goggle|face\s*shield|\beye\b/.test(t)) return OSHA_PPE_STANDARDS.eye_face;
  if (/hard\s*hat|hardhat|helmet|\bhead\b/.test(t)) return OSHA_PPE_STANDARDS.head;
  if (/\bboot|\bfoot\b|steel[-\s]?toe|\btoe\b/.test(t)) return OSHA_PPE_STANDARDS.foot;
  if (/glove|\bhand\b/.test(t)) return OSHA_PPE_STANDARDS.hand;
  if (/hearing|ear\s*muff|ear\s*plug|\bmuff|\bplug\b|\bdb\b|decibel/.test(t)) return OSHA_PPE_STANDARDS.hearing;
  return OSHA_PPE_STANDARDS.general;
}
