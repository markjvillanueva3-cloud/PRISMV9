/**
 * Surface-finish callout normalization.
 *
 * TS port of the canonical pure normalizer in
 * `scripts/lib/ollama-vision-extract-lib.mjs` (`normalizeSurfaceFinish`,
 * U-XRAY-SURFACE-FINISH-NORMALIZE). The MCP/TS bundle cannot cleanly import the
 * scripts/.mjs (separate runtime, untyped, node-only sibling imports), so this is a
 * documented cross-boundary CLONE -- keep the two in sync; both sides pin identical
 * reference values in tests.
 *
 * Recovers a surface-finish callout the VLM emits as TEXT ("63 RMS", "125 uin", "N6",
 * "Ra 0.8") into a canonical Ra in micrometres. Conversions are exact / chart-canonical:
 *   - microinch -> micrometre: x (MM_PER_INCH / 1000) = x0.0254  (ASME B46.1: 63 uin = 1.6002 um)
 *   - RMS: the printed RMS number is taken as its microinch Ra-equivalent per shop
 *     convention (ASME B46.1 deprecated RMS; "63 RMS" = 1.6 um = 63 uin Ra). The nominal
 *     Rq/Ra~1.11 relation is NOT applied to a drawing callout (a callout is a spec, not a
 *     measured Rq).
 *   - ISO 1302 N-grades N1..N12 -> fixed Ra um table.
 * A bare unit-less number is disambiguated by the ISO preferred-value series (0.8 =
 * um-preferred, 32/63 = uin-preferred) and flagged `assumed`; a bare number in neither
 * series stays `resolved:false` -- never a silent guess (R12). Negative callouts are
 * captured then rejected (no sign-flip). Explicit um/uin tokens win over the RMS shorthand.
 */

/** Exact inch -> mm unit conversion (definition, not a physics material constant). */
const MM_PER_INCH = 25.4;

/** ISO 1302 N-grade -> Ra micrometres. */
export const ISO_N_GRADE_RA_UM: Readonly<Record<string, number>> = Object.freeze({
  N1: 0.025, N2: 0.05, N3: 0.1, N4: 0.2, N5: 0.4, N6: 0.8,
  N7: 1.6, N8: 3.2, N9: 6.3, N10: 12.5, N11: 25, N12: 50,
});

// ISO preferred Ra series (the values drawings actually print) -- used ONLY to
// disambiguate a bare, unit-less number. No value is in both sets.
const RA_UM_PREFERRED = new Set([0.025, 0.05, 0.1, 0.2, 0.4, 0.8, 1.6, 3.2, 6.3, 12.5, 25, 50]);
const RA_UIN_PREFERRED = new Set([1, 2, 4, 8, 16, 32, 63, 125, 250, 500, 1000, 2000]);

// Micron signs built via fromCharCode so this source stays pure ASCII while the regexes
// still match both Unicode forms a VLM emits: MICRO SIGN (U+00B5) and GREEK SMALL MU (U+03BC).
const MICRO_SIGNS = String.fromCharCode(0xb5) + String.fromCharCode(0x3bc);
const MICROINCH_RE = new RegExp("(?:[" + MICRO_SIGNS + "]|u)\\s?in\\b");
const MICRON_RE = new RegExp("(?:[" + MICRO_SIGNS + "]|u)m\\b");
// microinch written with the inch double-quote, e.g. 63u" / 25<micro>" -- byte-parity with
// the .mjs `/(?:micro|u)"/` alternative (its absence silently mis-read 25u" as 25 um).
const MICROINCH_QUOTE_RE = new RegExp("(?:" + String.fromCharCode(0xb5) + '|u)"');
const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

export type SurfaceFinishSystem = "Ra-um" | "Ra-uin" | "RMS" | "ISO-N";

export interface SurfaceFinishNorm {
  ra_um: number | null;
  system: SurfaceFinishSystem | null;
  resolved: boolean;
  assumed: boolean;
}

const unresolved = (): SurfaceFinishNorm => ({ ra_um: null, system: null, resolved: false, assumed: false });

/**
 * Parse a surface-finish callout string into a canonical Ra (micrometres). Pure.
 * @param raw the callout text, e.g. "63 RMS", "Ra 0.8 um", "N6", "125 uin".
 * @returns ra_um (um) + the system tag + resolved/assumed flags. resolved=false (ra_um=null)
 *   means the value could not be safely determined -- never silently assumed.
 */
export function normalizeSurfaceFinish(raw: unknown): SurfaceFinishNorm {
  if (raw == null) return unresolved();
  const s = String(raw).trim();
  if (!s) return unresolved();
  const lower = s.toLowerCase();
  const uin = (v: number): number => round4((v * MM_PER_INCH) / 1000); // microinch -> micrometre

  // ISO N-grade (N1..N12 only) -- word-position, not part of a longer alphanumeric token.
  const nGrade = lower.match(/(?:^|[^a-z0-9])n\s?(1[0-2]|[1-9])(?![0-9])/);
  if (nGrade) {
    const ra = ISO_N_GRADE_RA_UM["N" + nGrade[1]];
    if (ra != null) return { ra_um: ra, system: "ISO-N", resolved: true, assumed: false };
  }

  // first numeric token (tolerate ".8" AND a leading minus so a negative is captured + rejected).
  const numMatch = s.match(/-?\d*\.?\d+/);
  if (!numMatch) return unresolved();
  const value = Number(numMatch[0]);
  if (!Number.isFinite(value) || value < 0) return unresolved();

  // Explicit um/uin tokens win over the RMS shorthand (so "Rq 0.4 um" stays micrometre).
  const hasRms = /\brms\b|\brq\b/.test(lower);
  const hasMicroinch = MICROINCH_RE.test(lower) || /micro\s?-?inch/.test(lower) || MICROINCH_QUOTE_RE.test(lower);
  const hasMicron = MICRON_RE.test(lower) || /micron|micromet/.test(lower);

  if (hasMicroinch) return { ra_um: uin(value), system: "Ra-uin", resolved: true, assumed: false };
  if (hasMicron) return { ra_um: round4(value), system: "Ra-um", resolved: true, assumed: false };
  if (hasRms) return { ra_um: uin(value), system: "RMS", resolved: true, assumed: false };

  // Bare number, no explicit unit -- disambiguate via the ISO preferred series (flagged assumed).
  if (RA_UM_PREFERRED.has(value)) return { ra_um: round4(value), system: "Ra-um", resolved: true, assumed: true };
  if (RA_UIN_PREFERRED.has(value)) return { ra_um: uin(value), system: "Ra-uin", resolved: true, assumed: true };
  if (value > 50) return { ra_um: uin(value), system: "Ra-uin", resolved: true, assumed: true };
  return unresolved();
}

/**
 * Resolve a dimension's `surface_finish_ra` value to a Ra (micrometres), or undefined if
 * unknown. Numeric input passes through; a text callout ("63 RMS", "N6") is normalized;
 * anything unresolvable -> undefined (never a silent guess). Drop-in for the prior
 * `d.surface_finish_ra ?? undefined` so a string callout is no longer dropped/leaked.
 */
export function resolveSurfaceFinishRa(x: unknown): number | undefined {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string" && x) {
    const norm = normalizeSurfaceFinish(x);
    if (norm.resolved && norm.ra_um != null) return norm.ra_um;
  }
  return undefined;
}

/** A part-level surface-finish callout (e.g. "63 RMS all over", "Ra 0.8 unless noted"). */
export interface SurfaceFinishCallout {
  ra_um: number | null;
  location: string | null;
  raw_text: string | null;
  /** set only when ra_um was recovered from raw_text (not a model-supplied numeric). */
  finish_system?: SurfaceFinishSystem;
  /** true when the recovered ra_um assumed a unit (bare ISO-preferred number). */
  assumed?: boolean;
}

/**
 * Convert ONE raw VLM surface_finishes[] entry into a structured callout, recovering a Ra
 * (um) from a TEXT callout in raw_text when the model gave no numeric ra_um. A model-supplied
 * numeric ra_um (including 0) is kept as primary; an entry carrying no signal -> null.
 *
 * NOTE: intentionally diverges from the .mjs sibling `extractSurfaceFinish`
 * (scripts/lib/ollama-vision-extract-lib.mjs) on the MCP path: (1) a location-only entry is
 * KEPT here (ra_um:null) rather than dropped, and (2) the recovery tags are the leaner
 * `finish_system`/`assumed` (the .mjs uses ra_um_source/ra_um_assumed/ra_um_note). The core
 * Ra normalization stays byte-identical via the shared normalizeSurfaceFinish.
 */
export function mapSurfaceFinishCallout(raw: unknown): SurfaceFinishCallout | null {
  if (raw == null || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const numeric = typeof r.ra_um === "number" && Number.isFinite(r.ra_um) ? r.ra_um : null;
  const location = typeof r.location === "string" && r.location ? r.location : null;
  const rawText = typeof r.raw_text === "string" && r.raw_text ? r.raw_text : null;
  if (numeric == null && location == null && rawText == null) return null;
  const out: SurfaceFinishCallout = { ra_um: numeric, location, raw_text: rawText };
  if (numeric == null && rawText != null) {
    const norm = normalizeSurfaceFinish(rawText);
    if (norm.resolved && norm.ra_um != null) {
      out.ra_um = norm.ra_um;
      if (norm.system != null) out.finish_system = norm.system;
      out.assumed = norm.assumed;
    }
  }
  return out;
}

/** Map a raw VLM surface_finishes[] array into structured callouts (empty entries dropped). */
export function mapSurfaceFinishes(raw: unknown): SurfaceFinishCallout[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(mapSurfaceFinishCallout).filter((x): x is SurfaceFinishCallout => x != null);
}

// A part-level finish counts as the drawing-wide default ONLY if it is explicitly "all over /
// unless otherwise noted" OR carries no specific location. A location-specific finish ("bore ID")
// must NOT be applied to every dimension.
// Tightened to avoid feature-noun false positives -- bare "all"/"overall"/"typ"/"every" matched
// location-specific callouts ("all 4 holes", "overall length", "typical bore"). Require an
// explicit drawing-wide phrase: "all over/surfaces/machined", "unless (otherwise) noted/specified",
// or "U.O.S." (a location-ABSENT finish is treated as all-over separately, in the filter).
const ALL_OVER_FINISH_RE = /\b(?:all[\s-]+(?:over|surfaces?|machined)|unless\s+(?:otherwise\s+)?(?:noted|specified)|u\.?o\.?s\.?)\b/i;

/**
 * Pick the SINGLE unambiguous part-level "all over / unless otherwise noted" finish that a
 * dimension lacking its own finish should inherit -- the manufacturing default ("63 RMS unless
 * otherwise specified" applies to every surface). Conservative (R12, never guess):
 *   - only callouts with a resolved numeric ra_um are eligible;
 *   - a callout qualifies as all-over if its location matches the all-over vocabulary OR is absent;
 *   - returns it ONLY when exactly ONE all-over callout exists -- 0 (all finishes are
 *     location-specific) or >=2 (competing defaults) -> null (do not apply globally).
 */
export function selectPartDefaultFinish(finishes: readonly SurfaceFinishCallout[]): SurfaceFinishCallout | null {
  if (!Array.isArray(finishes)) return null;
  // ra_um must be a POSITIVE finite number -- a hallucinated/mis-read 0 or negative all-over
  // callout must never become the part default (it would propagate an absurd Ra downstream).
  const resolved = finishes.filter((f) => f != null && typeof f.ra_um === "number" && f.ra_um > 0);
  const allOver = resolved.filter((f) => f.location == null || ALL_OVER_FINISH_RE.test(f.location));
  return allOver.length === 1 ? allOver[0] : null;
}
