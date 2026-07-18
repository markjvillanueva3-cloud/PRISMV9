/**
 * standard-groove-dimensions.ts -- sourced standard groove sizing tables
 * ============================================================================
 * U-LW-STD-GROOVE-TABLES (slot:whiskey, 2026-07-01) -- coverage-audit gap #2.
 * Machining-side lookup: standard designation -> the groove dimensions to CUT.
 * Complements (does NOT duplicate) SealSelectionEngine (seal-design formulas)
 * and GrooveClassificationEngine (consumes groove geometry as input).
 *
 * DATA PROVENANCE (R12 -- every row read from a named source, nothing derived):
 * - DIN471_GROOVES: fasteners.eu/standards/din/471 full table; 13 rows spot-verified
 *   against Aspen Fasteners spec + search-corroborated rows; d1=48 ring thickness
 *   CORRECTED 2.0 -> 1.75 (fasteners.eu typo; JC Fasteners B8D21 datasheet: s=1.75,
 *   d2=45.5, m=1.85, n=3.8 -- a groove narrower than the ring is impossible).
 * - DIN472_GROOVES: fasteners.eu/standards/din/472 full table; d1=40/42/45/48 verified
 *   against Westfield Fasteners + JC Fasteners G2D22 + Accu (d2/m/s exact match);
 *   d1=82 ring thickness CORRECTED 3.0 -> 2.5 (same impossible-row class; Accu confirms
 *   the 80/82 size class is s=2.5/m=2.65). The n column is EXCLUDED for DIN 472:
 *   fasteners.eu and Westfield disagree on its definition (1.25 vs 3.8 at d1=40).
 * - DIN509_RELIEFS: IS 3428:2009 Table 1 (Bureau of Indian Standards official PDF,
 *   law.resource.org/pub/in/bis/S01/is.3428.2009.pdf) -- technically equivalent to
 *   DIN 509:2006 per its foreword. PRIMARY SOURCE. Forms E/F/G/H complete.
 * - DIN76_EXTERNAL / DIN76_INTERNAL: DIN 76-1:2004-06 Tabelle 1 + Tabelle 2 (standard
 *   document PDF, cncknowledge.wordpress.com mirror). PRIMARY SOURCE. dg column
 *   independently corroborated by search synthesis (P=0.2 -> d-0.3, P=1.5 -> d-2.3)
 *   and the standard's own footer proportions (g2=3.5P/2.5P, r=0.5P).
 *
 * - AS568_GLANDS (U-LW-ORING-GLAND-TABLES, same day): O-ring gland dimensions per
 *   AS568 cross-section class (the housing dimensions ISO 3601-2 standardizes).
 *   STATIC RADIAL: three sources exact-match (Parker ORD-5700 Design Chart 4-2 PDF via
 *   search extract + ERIKS Technical Manual Table AS.C2 via pypdf + globaloring.com).
 *   DYNAMIC RADIAL: two sources exact-match (ERIKS AS.D1 + globaloring).
 *   FACE/AXIAL: widths two-source (ERIKS AS C1 + globaloring); DEPTHS from ERIKS only --
 *   globaloring's face depths duplicate its dynamic rows verbatim (table-assembly error);
 *   ERIKS depths self-validate (depth + squeeze = cross-section on every row) and its
 *   sibling static table matches Parker verbatim, so ERIKS wins the conflict (R7).
 *   DOVETAIL: TWO-SOURCE for .070-.275 (Parker ORD-5700 chart 4-19 search extract +
 *   Bayseal page-11 PDF pypdf, radii = ERIKS decimals within print rounding); the .070
 *   row is the Parker/Bayseal one (ERIKS's .070 dovetail depth duplicated its own
 *   static-radial row, 2-vs-1 conflict, R7); .375 is ERIKS-only (per-row single_source).
 *   UNITS: gland tables are INCH-native as published (AS568); mm cross-section aliases
 *   carried per row; the geometry block converts to mm explicitly. Never mix silently.
 *
 * All lookups FAIL LOUD: a size/pitch/designation not in the sourced table THROWS
 * (never interpolates -- these are standard tables, not continuous functions).
 */

// ============================================================================
// DIN 471 -- retaining rings (circlips) for SHAFTS: external groove to cut
// d1 = nominal shaft dia, d2 = groove dia (h11-class per std), m = groove width
// (H13), s = ring thickness, n = min distance groove-to-shaft-end.
// Groove depth per side = (d1 - d2) / 2.
// ============================================================================

export interface CirclipGrooveSpec {
  d1: number;
  d2: number;
  m: number;
  s: number;
  n?: number;
}

export const DIN471_GROOVES: readonly CirclipGrooveSpec[] = [
  { d1: 4, d2: 3.8, m: 0.5, s: 0.4, n: 0.3 },
  { d1: 5, d2: 4.8, m: 0.7, s: 0.6, n: 0.3 },
  { d1: 6, d2: 5.7, m: 0.8, s: 0.7, n: 0.5 },
  { d1: 7, d2: 6.7, m: 0.9, s: 0.8, n: 0.5 },
  { d1: 8, d2: 7.6, m: 0.9, s: 0.8, n: 0.6 },
  { d1: 9, d2: 8.6, m: 1.1, s: 1.0, n: 0.6 },
  { d1: 10, d2: 9.6, m: 1.1, s: 1.0, n: 0.6 },
  { d1: 11, d2: 10.5, m: 1.1, s: 1.0, n: 0.8 },
  { d1: 12, d2: 11.5, m: 1.1, s: 1.0, n: 0.8 },
  { d1: 13, d2: 12.4, m: 1.1, s: 1.0, n: 0.9 },
  { d1: 14, d2: 13.4, m: 1.1, s: 1.0, n: 0.9 },
  { d1: 15, d2: 14.3, m: 1.1, s: 1.0, n: 1.1 },
  { d1: 16, d2: 15.2, m: 1.1, s: 1.0, n: 1.2 },
  { d1: 17, d2: 16.2, m: 1.1, s: 1.0, n: 1.2 },
  { d1: 18, d2: 17.0, m: 1.3, s: 1.2, n: 1.5 },
  { d1: 19, d2: 18.0, m: 1.3, s: 1.2, n: 1.5 },
  { d1: 20, d2: 19.0, m: 1.3, s: 1.2, n: 1.5 },
  { d1: 21, d2: 20.0, m: 1.3, s: 1.2, n: 1.5 },
  { d1: 22, d2: 21.0, m: 1.3, s: 1.2, n: 1.5 },
  { d1: 24, d2: 22.9, m: 1.3, s: 1.2, n: 1.7 },
  { d1: 25, d2: 23.9, m: 1.3, s: 1.2, n: 1.7 },
  { d1: 26, d2: 24.9, m: 1.3, s: 1.2, n: 1.7 },
  { d1: 28, d2: 26.6, m: 1.6, s: 1.5, n: 2.1 },
  { d1: 29, d2: 27.6, m: 1.6, s: 1.5, n: 2.1 },
  { d1: 30, d2: 28.6, m: 1.6, s: 1.5, n: 2.1 },
  { d1: 32, d2: 30.3, m: 1.6, s: 1.5, n: 2.6 },
  { d1: 34, d2: 32.3, m: 1.6, s: 1.5, n: 2.6 },
  { d1: 35, d2: 33.0, m: 1.6, s: 1.5, n: 3.0 },
  { d1: 36, d2: 34.0, m: 1.85, s: 1.75, n: 3.0 },
  { d1: 38, d2: 36.0, m: 1.85, s: 1.75, n: 3.0 },
  { d1: 40, d2: 37.5, m: 1.85, s: 1.75, n: 3.8 },
  { d1: 42, d2: 39.5, m: 1.85, s: 1.75, n: 3.8 },
  { d1: 45, d2: 42.5, m: 1.85, s: 1.75, n: 3.8 },
  // s corrected 2.0 -> 1.75 (source typo; JC Fasteners corroboration -- see header)
  { d1: 48, d2: 45.5, m: 1.85, s: 1.75, n: 3.8 },
  { d1: 50, d2: 47.0, m: 2.15, s: 2.0, n: 4.5 },
  { d1: 52, d2: 49.0, m: 2.15, s: 2.0, n: 4.5 },
  { d1: 55, d2: 52.0, m: 2.15, s: 2.0, n: 4.5 },
  { d1: 56, d2: 53.0, m: 2.15, s: 2.0, n: 4.5 },
  { d1: 58, d2: 55.0, m: 2.15, s: 2.0, n: 4.5 },
  { d1: 60, d2: 57.0, m: 2.15, s: 2.0, n: 4.5 },
  { d1: 62, d2: 59.0, m: 2.15, s: 2.0, n: 4.5 },
  { d1: 63, d2: 60.0, m: 2.15, s: 2.0, n: 4.5 },
  { d1: 65, d2: 62.0, m: 2.65, s: 2.5, n: 4.5 },
  { d1: 68, d2: 65.0, m: 2.65, s: 2.5, n: 4.5 },
  { d1: 70, d2: 67.0, m: 2.65, s: 2.5, n: 4.5 },
  { d1: 72, d2: 69.0, m: 2.65, s: 2.5, n: 4.5 },
  { d1: 75, d2: 72.0, m: 2.65, s: 2.5, n: 4.5 },
  { d1: 78, d2: 75.0, m: 2.65, s: 2.5, n: 5.3 },
  { d1: 80, d2: 76.5, m: 2.65, s: 2.5, n: 5.3 },
  { d1: 82, d2: 78.5, m: 2.65, s: 2.5, n: 5.3 },
  { d1: 85, d2: 81.5, m: 3.15, s: 3.0, n: 5.3 },
  { d1: 88, d2: 84.5, m: 3.15, s: 3.0, n: 5.3 },
  { d1: 90, d2: 86.5, m: 3.15, s: 3.0, n: 5.3 },
  { d1: 95, d2: 91.5, m: 3.15, s: 3.0, n: 5.3 },
  { d1: 100, d2: 96.5, m: 3.15, s: 3.0, n: 5.3 },
];

// ============================================================================
// DIN 472 -- retaining rings (circlips) for BORES: internal groove to cut
// d2 > d1 (groove is larger than the bore). Groove depth = (d2 - d1) / 2.
// n column excluded (conflicting source definitions -- see header).
// ============================================================================

export const DIN472_GROOVES: readonly CirclipGrooveSpec[] = [
  { d1: 8, d2: 8.4, m: 0.9, s: 0.8 },
  { d1: 9, d2: 9.4, m: 0.9, s: 0.8 },
  { d1: 10, d2: 10.4, m: 1.1, s: 1.0 },
  { d1: 11, d2: 11.4, m: 1.1, s: 1.0 },
  { d1: 12, d2: 12.5, m: 1.1, s: 1.0 },
  { d1: 13, d2: 13.6, m: 1.1, s: 1.0 },
  { d1: 14, d2: 14.6, m: 1.1, s: 1.0 },
  { d1: 15, d2: 15.7, m: 1.1, s: 1.0 },
  { d1: 16, d2: 16.8, m: 1.1, s: 1.0 },
  { d1: 17, d2: 17.8, m: 1.1, s: 1.0 },
  { d1: 18, d2: 19.0, m: 1.1, s: 1.0 },
  { d1: 19, d2: 20.0, m: 1.1, s: 1.0 },
  { d1: 20, d2: 21.0, m: 1.1, s: 1.0 },
  { d1: 21, d2: 22.0, m: 1.1, s: 1.0 },
  { d1: 22, d2: 23.0, m: 1.1, s: 1.0 },
  { d1: 24, d2: 25.2, m: 1.3, s: 1.2 },
  { d1: 25, d2: 26.2, m: 1.3, s: 1.2 },
  { d1: 26, d2: 27.2, m: 1.3, s: 1.2 },
  { d1: 28, d2: 29.4, m: 1.3, s: 1.2 },
  { d1: 30, d2: 31.4, m: 1.3, s: 1.2 },
  { d1: 31, d2: 32.7, m: 1.3, s: 1.2 },
  { d1: 32, d2: 33.7, m: 1.3, s: 1.2 },
  { d1: 34, d2: 35.7, m: 1.6, s: 1.5 },
  { d1: 35, d2: 37.0, m: 1.6, s: 1.5 },
  { d1: 36, d2: 38.0, m: 1.6, s: 1.5 },
  { d1: 37, d2: 39.0, m: 1.6, s: 1.5 },
  { d1: 38, d2: 40.0, m: 1.6, s: 1.5 },
  { d1: 40, d2: 42.5, m: 1.85, s: 1.75 },
  { d1: 42, d2: 44.5, m: 1.85, s: 1.75 },
  { d1: 45, d2: 47.5, m: 1.85, s: 1.75 },
  { d1: 47, d2: 49.5, m: 1.85, s: 1.75 },
  { d1: 48, d2: 50.5, m: 1.85, s: 1.75 },
  { d1: 50, d2: 53.0, m: 2.15, s: 2.0 },
  { d1: 52, d2: 55.0, m: 2.15, s: 2.0 },
  { d1: 55, d2: 58.0, m: 2.15, s: 2.0 },
  { d1: 56, d2: 59.0, m: 2.15, s: 2.0 },
  { d1: 58, d2: 61.0, m: 2.15, s: 2.0 },
  { d1: 60, d2: 63.0, m: 2.15, s: 2.0 },
  { d1: 62, d2: 65.0, m: 2.15, s: 2.0 },
  { d1: 63, d2: 66.0, m: 2.15, s: 2.0 },
  { d1: 65, d2: 68.0, m: 2.65, s: 2.5 },
  { d1: 68, d2: 71.0, m: 2.65, s: 2.5 },
  { d1: 70, d2: 73.0, m: 2.65, s: 2.5 },
  { d1: 72, d2: 75.0, m: 2.65, s: 2.5 },
  { d1: 75, d2: 78.0, m: 2.65, s: 2.5 },
  { d1: 78, d2: 81.0, m: 2.65, s: 2.5 },
  { d1: 80, d2: 83.5, m: 2.65, s: 2.5 },
  // s corrected 3.0 -> 2.5 (source typo; Accu 80/82-class corroboration -- see header)
  { d1: 82, d2: 85.5, m: 2.65, s: 2.5 },
  { d1: 85, d2: 88.5, m: 3.15, s: 3.0 },
  { d1: 88, d2: 91.5, m: 3.15, s: 3.0 },
  { d1: 90, d2: 93.5, m: 3.15, s: 3.0 },
  { d1: 92, d2: 95.5, m: 3.15, s: 3.0 },
  { d1: 95, d2: 98.5, m: 3.15, s: 3.0 },
  { d1: 98, d2: 101.5, m: 3.15, s: 3.0 },
  { d1: 100, d2: 103.5, m: 3.15, s: 3.0 },
];

// ============================================================================
// DIN 509 / IS 3428:2009 -- relief grooves (undercuts), forms E/F/G/H
// r = groove radius, t1 = radial depth, f = axial breadth; Form F/G/H add the
// face-side depth t2 and breadth g (parenthesized reference values in the std).
// Series: "normal" duty vs "fatigue" (increased fatigue resistance) -- the std
// allocates each row to a d1 range within ONE of the two series.
// Radii 0.2/0.4/0.6/1/1.6/2.5/4 are series-1 (preferred per DIN 250).
// ============================================================================

export interface Din509Row {
  designation: string;
  form: "E" | "F" | "G" | "H";
  r: number;
  t1: number;
  t2?: number;
  f: number;
  g?: number;
  // NOTE: the transport slimmer (responseSlimmer) drops null values, so dispatcher
  // consumers see an ABSENT key for an open bound -- treat missing as open, never as 0.
  d1_min: number | null; // exclusive lower bound ("above X"); null = open
  d1_max: number | null; // inclusive upper bound; null = open (e.g. "above 125")
  series: "normal" | "fatigue";
  series1_radius: boolean;
}

const s1 = (r: number): boolean => [0.2, 0.4, 0.6, 1, 1.6, 2.5, 4].includes(r);
const e509 = (r: number, t1: number, f: number, lo: number | null, hi: number | null, series: "normal" | "fatigue"): Din509Row =>
  ({ designation: `E ${r}x${t1}`, form: "E", r, t1, f, d1_min: lo, d1_max: hi, series, series1_radius: s1(r) });
const f509 = (r: number, t1: number, t2: number, f: number, g: number, lo: number | null, hi: number | null, series: "normal" | "fatigue"): Din509Row =>
  ({ designation: `F ${r}x${t1}`, form: "F", r, t1, t2, f, g, d1_min: lo, d1_max: hi, series, series1_radius: s1(r) });

export const DIN509_RELIEFS: readonly Din509Row[] = [
  e509(0.2, 0.1, 1, 1.6, 3, "normal"),
  e509(0.4, 0.2, 2, 3, 18, "normal"),
  e509(0.6, 0.2, 2, 10, 18, "normal"),
  e509(0.6, 0.3, 2.5, 18, 80, "normal"),
  e509(0.8, 0.3, 2.5, 18, 80, "normal"),
  e509(1, 0.2, 2.5, 18, 50, "fatigue"),
  e509(1, 0.4, 4, 80, null, "normal"),
  e509(1.2, 0.2, 2.5, 18, 50, "fatigue"),
  e509(1.2, 0.4, 4, 80, null, "normal"),
  e509(1.6, 0.3, 4, 50, 80, "fatigue"),
  e509(2.5, 0.4, 5, 80, 125, "fatigue"),
  e509(4, 0.5, 7, 125, null, "fatigue"),
  f509(0.2, 0.1, 0.1, 1, 0.9, 1.6, 3, "normal"),
  f509(0.4, 0.2, 0.1, 2, 1.1, 3, 18, "normal"),
  f509(0.6, 0.2, 0.1, 2, 1.4, 10, 18, "normal"),
  f509(0.6, 0.3, 0.2, 2.5, 2.1, 18, 80, "normal"),
  f509(0.8, 0.3, 0.2, 2.5, 2.3, 18, 80, "normal"),
  f509(1, 0.2, 0.1, 2.5, 1.8, 18, 50, "fatigue"),
  f509(1, 0.4, 0.3, 4, 3.2, 80, null, "normal"),
  f509(1.2, 0.2, 0.1, 2.5, 2.0, 18, 50, "fatigue"),
  f509(1.2, 0.4, 0.3, 4, 3.4, 80, null, "normal"),
  f509(1.6, 0.3, 0.2, 4, 3.1, 50, 80, "fatigue"),
  f509(2.5, 0.4, 0.3, 5, 4.8, 80, 125, "fatigue"),
  f509(4, 0.5, 0.3, 7, 6.4, 125, null, "fatigue"),
  { designation: "G 0.4x0.2", form: "G", r: 0.4, t1: 0.2, t2: 0.2, f: 0.9, g: 1.1, d1_min: 3, d1_max: 18, series: "normal", series1_radius: true },
  { designation: "H 0.8x0.3", form: "H", r: 0.8, t1: 0.3, t2: 0.05, f: 2.0, g: 1.1, d1_min: 18, d1_max: 80, series: "normal", series1_radius: false },
  { designation: "H 1.2x0.3", form: "H", r: 1.2, t1: 0.3, t2: 0.05, f: 2.4, g: 1.5, d1_min: 18, d1_max: 50, series: "fatigue", series1_radius: false },
];

// ============================================================================
// DIN 76-1:2004 -- thread undercuts (Gewindefreistich) for ISO metric threads
// External (Tabelle 1): dg = d - dg_offset (h13; h12 for d <= 3). Form A =
// regular (g2 = 3.5P), Form B = short (g2 = 2.5P, special tooling). r = 0.5P.
// Internal (Tabelle 2): dg = d + dg_offset (H13). Form C = regular, D = short.
// x1/e1 = thread run-out when NO undercut is used (regular form), for reference.
// The a1/a2/a3 head-clearance columns of the standard are fastener-manufacture
// distances, not groove geometry -- out of scope here.
// ============================================================================

export interface Din76Row {
  pitch: number;
  coarse_diameters: readonly number[]; // nominal d with this coarse pitch ([] = fine-only)
  dg_offset: number; // external: dg = d - offset | internal: dg = d + offset
  g1: number; // regular form min undercut width at dg
  g2: number; // regular form max total undercut width
  g1_short: number;
  g2_short: number;
  r: number;
  runout: number; // x1 (external) / e1 (internal): run-out without undercut
}

const d76 = (pitch: number, cd: readonly number[], runout: number, dg_offset: number, g1: number, g1_short: number, g2: number, g2_short: number, r: number): Din76Row =>
  ({ pitch, coarse_diameters: cd, dg_offset, g1, g2, g1_short, g2_short, r, runout });

export const DIN76_EXTERNAL: readonly Din76Row[] = [
  d76(0.2, [], 0.5, 0.3, 0.45, 0.25, 0.7, 0.5, 0.1),
  d76(0.25, [1, 1.2], 0.6, 0.4, 0.55, 0.25, 0.9, 0.6, 0.12),
  d76(0.3, [1.4], 0.75, 0.5, 0.6, 0.3, 1.05, 0.75, 0.16),
  d76(0.35, [1.6, 1.7, 1.8], 0.9, 0.6, 0.7, 0.4, 1.2, 0.9, 0.16),
  d76(0.4, [2, 2.3], 1, 0.7, 0.8, 0.5, 1.4, 1, 0.2),
  d76(0.45, [2.2, 2.5, 2.6], 1.1, 0.7, 1, 0.5, 1.6, 1.1, 0.2),
  d76(0.5, [3], 1.25, 0.8, 1.1, 0.5, 1.75, 1.25, 0.2),
  d76(0.6, [3.5], 1.5, 1, 1.2, 0.6, 2.1, 1.5, 0.4),
  d76(0.7, [4], 1.75, 1.1, 1.5, 0.8, 2.45, 1.75, 0.4),
  d76(0.75, [4.5], 1.9, 1.2, 1.6, 0.9, 2.6, 1.9, 0.4),
  d76(0.8, [5], 2, 1.3, 1.7, 0.9, 2.8, 2, 0.4),
  d76(1, [6, 7], 2.5, 1.6, 2.1, 1.1, 3.5, 2.5, 0.6),
  d76(1.25, [8], 3.2, 2, 2.7, 1.5, 4.4, 3.2, 0.6),
  d76(1.5, [10], 3.8, 2.3, 3.2, 1.8, 5.2, 3.8, 0.8),
  d76(1.75, [12], 4.3, 2.6, 3.9, 2.1, 6.1, 4.3, 1),
  d76(2, [14, 16], 5, 3, 4.5, 2.5, 7, 5, 1),
  d76(2.5, [18, 20, 22], 6.3, 3.6, 5.6, 3.2, 8.7, 6.3, 1.2),
  d76(3, [24, 27], 7.5, 4.4, 6.7, 3.7, 10.5, 7.5, 1.6),
  d76(3.5, [30, 33], 9, 5, 7.7, 4.7, 12, 9, 1.6),
  d76(4, [36, 39], 10, 5.7, 9, 5, 14, 10, 2),
  d76(4.5, [42, 45], 11, 6.4, 10.5, 5.5, 16, 11, 2),
  d76(5, [48, 52], 12.5, 7, 11.5, 6.5, 17.5, 12.5, 2.5),
  d76(5.5, [56, 60], 14, 7.7, 12.5, 7.5, 19, 14, 3.2),
  d76(6, [64, 68], 15, 8.3, 14, 8, 21, 15, 3.2),
];

export const DIN76_INTERNAL: readonly Din76Row[] = [
  d76(0.2, [], 1.3, 0.1, 0.8, 0.5, 1.2, 0.9, 0.1),
  d76(0.25, [1, 1.2], 1.5, 0.1, 1, 0.6, 1.4, 1, 0.12),
  d76(0.3, [1.4], 1.8, 0.1, 1.2, 0.75, 1.6, 1.25, 0.16),
  d76(0.35, [1.6, 1.7, 1.8], 2.1, 0.2, 1.4, 0.9, 1.9, 1.4, 0.16),
  d76(0.4, [2, 2.3], 2.3, 0.2, 1.6, 1, 2.2, 1.6, 0.2),
  d76(0.45, [2.2, 2.5, 2.6], 2.6, 0.2, 1.8, 1.1, 2.4, 1.7, 0.2),
  d76(0.5, [3], 2.8, 0.3, 2, 1.25, 2.7, 2, 0.2),
  d76(0.6, [3.5], 3.4, 0.3, 2.4, 1.5, 3.3, 2.4, 0.4),
  d76(0.7, [4], 3.8, 0.3, 2.8, 1.75, 3.8, 2.75, 0.4),
  d76(0.75, [4.5], 4, 0.3, 3, 1.9, 4, 2.9, 0.4),
  d76(0.8, [5], 4.2, 0.3, 3.2, 2, 4.2, 3, 0.4),
  d76(1, [6, 7], 5.1, 0.5, 4, 2.5, 5.2, 3.7, 0.6),
  d76(1.25, [8], 6.2, 0.5, 5, 3.2, 6.7, 4.9, 0.6),
  d76(1.5, [10], 7.3, 0.5, 6, 3.8, 7.8, 5.6, 0.8),
  d76(1.75, [12], 8.3, 0.5, 7, 4.3, 9.1, 6.4, 1),
  d76(2, [14, 16], 9.3, 0.5, 8, 5, 10.3, 7.3, 1),
  d76(2.5, [18, 20, 22], 11.2, 0.5, 10, 6.3, 13, 9.3, 1.2),
  d76(3, [24, 27], 13.1, 0.5, 12, 7.5, 15.2, 10.7, 1.6),
  d76(3.5, [30, 33], 15.2, 0.5, 14, 9, 17.7, 12.7, 1.6),
  d76(4, [36, 39], 16.8, 0.5, 16, 10, 20, 14, 2),
  d76(4.5, [42, 45], 18.4, 0.5, 18, 11, 23, 16, 2),
  d76(5, [48, 52], 20.8, 0.5, 20, 12.5, 26, 18.5, 2.5),
  d76(5.5, [56, 60], 22.4, 0.5, 22, 14, 28, 20, 3.2),
  d76(6, [64, 68], 24, 0.5, 24, 15, 30, 21, 3.2),
];

// ============================================================================
// FAIL-LOUD LOOKUPS
// ============================================================================

/** Groove geometry ready for GrooveClassificationEngine / turning_groove_classify. */
export interface StandardGrooveGeometry {
  groove_width_mm: number;
  groove_depth_mm: number;
  diameter_mm?: number; // the nominal d1 the groove is cut on/in (absent for diameter-independent gland classes)
  bottom_radius_mm?: number;
  source: string;
}

function nearestSizes(sizes: number[], want: number): string {
  const below = sizes.filter((x) => x < want).pop();
  const above = sizes.find((x) => x > want);
  return `nearest table sizes: ${below ?? "none"} / ${above ?? "none"}`;
}

/** DIN 471 (shaft, external cut) / DIN 472 (bore, internal cut) circlip groove for a nominal size. */
export function circlipGroove(standard: "DIN471" | "DIN472", d1: number): CirclipGrooveSpec & { depth_mm: number; geometry: StandardGrooveGeometry } {
  if (!Number.isFinite(d1) || d1 <= 0) {
    throw new Error(`circlipGroove: d1 must be positive finite (got ${d1})`);
  }
  const table = standard === "DIN471" ? DIN471_GROOVES : DIN472_GROOVES;
  const row = table.find((x) => x.d1 === d1);
  if (!row) {
    throw new Error(
      `circlipGroove: ${standard} has no table row for d1=${d1}mm (${nearestSizes(table.map((x) => x.d1), d1)}). ` +
      `Standard sizes only -- do NOT interpolate a retaining-ring groove.`
    );
  }
  const depth = Math.round(Math.abs(row.d1 - row.d2) / 2 * 1000) / 1000;
  return {
    ...row,
    depth_mm: depth,
    geometry: {
      groove_width_mm: row.m,
      groove_depth_mm: depth,
      diameter_mm: row.d1,
      source: `${standard} d1=${row.d1}: d2=${row.d2} (groove dia), m=${row.m} H13, ring s=${row.s}`,
    },
  };
}

/** DIN 509 relief groove by exact designation, e.g. "E 0.6x0.3" (also accepts "e 0,6x0,3", "E 1.0x0.2"). */
export function din509ByDesignation(designation: string): Din509Row {
  const norm = (designation ?? "").trim().toUpperCase().replace(/\s+/g, " ").replace(/,/g, ".")
    // "1.0x" -> "1x" (table keys use the bare integer form). Double trailing zeros
    // ("1.00x", CAD fixed-2-decimal exports) are NOT folded -- they fail loud with the valid list.
    .replace(/(\d)\.0(?=X)/g, "$1");
  const row = DIN509_RELIEFS.find((x) => x.designation.toUpperCase() === norm);
  if (!row) {
    throw new Error(
      `din509ByDesignation: unknown designation "${designation}". Valid: ${DIN509_RELIEFS.map((x) => x.designation).join(", ")}`
    );
  }
  return row;
}

/** DIN 509 rows recommended for a workpiece diameter (series-1 radii first). */
export function din509Recommend(d1: number, form: "E" | "F" | "G" | "H" = "E", series: "normal" | "fatigue" = "normal"): Din509Row[] {
  if (!Number.isFinite(d1) || d1 <= 0) {
    throw new Error(`din509Recommend: d1 must be positive finite (got ${d1})`);
  }
  const rows = DIN509_RELIEFS.filter(
    (x) => x.form === form && x.series === series &&
      (x.d1_min === null || d1 > x.d1_min) && (x.d1_max === null || d1 <= x.d1_max)
  ).sort((a, b) => Number(b.series1_radius) - Number(a.series1_radius));
  if (rows.length === 0) {
    throw new Error(
      `din509Recommend: no ${series}-series form-${form} relief groove is allocated to d1=${d1}mm in the standard table.`
    );
  }
  return rows;
}

// ============================================================================
// AS568 / ISO 3601-2 -- O-ring GLAND (groove) dimensions per cross-section class
// INCH-native as published (see header provenance). Radial depth E is per side;
// face depth is axial. width = standard groove (no backup); radial rows carry
// one/two-backup widths; face rows carry the vacuum/gas width variant.
// ============================================================================

export type OringGlandService = "static_radial" | "dynamic_radial" | "face" | "dovetail";

export interface OringGlandRow {
  cs_in: number; // AS568 nominal cross-section W, inches
  cs_mm: number; // published metric equivalent
  depth_in: readonly [number, number];
  // radial rows: the PRINTED two-source percent range; dovetail rows: printed nominal repeated
  // (consistent with its own depths); face rows: DERIVED from squeeze_in (see table note).
  squeeze_pct: readonly [number, number];
  squeeze_in?: readonly [number, number]; // face rows: the PRINTED inch squeeze column (authoritative)
  width_in: readonly [number, number]; // standard groove (face rows: liquids)
  width_1backup_in?: readonly [number, number];
  width_2backup_in?: readonly [number, number];
  width_vacuum_in?: readonly [number, number]; // face rows only
  radius_in: readonly [number, number];
  single_source?: boolean; // no independent second source corroborates this row (treat as advisory)
}

const gl = (
  cs_in: number, cs_mm: number, depth: readonly [number, number], sq: readonly [number, number],
  width: readonly [number, number], radius: readonly [number, number],
  extra: Partial<OringGlandRow> = {},
): OringGlandRow => ({ cs_in, cs_mm, depth_in: depth, squeeze_pct: sq, width_in: width, radius_in: radius, ...extra });

// Face rows: squeeze_pct derived from the printed inch column by construction (see table note).
const faceGl = (
  cs_in: number, cs_mm: number, depth: readonly [number, number], squeezeIn: readonly [number, number],
  width: readonly [number, number], vacWidth: readonly [number, number], radius: readonly [number, number],
): OringGlandRow => ({
  cs_in, cs_mm, depth_in: depth, squeeze_in: squeezeIn,
  squeeze_pct: [Math.round((squeezeIn[0] / cs_in) * 100), Math.round((squeezeIn[1] / cs_in) * 100)],
  width_in: width, width_vacuum_in: vacWidth, radius_in: radius,
});

export const AS568_GLANDS: Record<OringGlandService, readonly OringGlandRow[]> = {
  static_radial: [
    gl(0.070, 1.78, [0.050, 0.052], [22, 32], [0.093, 0.098], [0.005, 0.015], { width_1backup_in: [0.138, 0.143], width_2backup_in: [0.205, 0.210] }),
    gl(0.103, 2.62, [0.081, 0.083], [17, 24], [0.140, 0.145], [0.005, 0.015], { width_1backup_in: [0.171, 0.176], width_2backup_in: [0.238, 0.243] }),
    gl(0.139, 3.53, [0.111, 0.113], [16, 23], [0.187, 0.192], [0.010, 0.025], { width_1backup_in: [0.208, 0.213], width_2backup_in: [0.275, 0.280] }),
    gl(0.210, 5.33, [0.170, 0.173], [15, 21], [0.281, 0.286], [0.020, 0.035], { width_1backup_in: [0.311, 0.316], width_2backup_in: [0.410, 0.415] }),
    gl(0.275, 6.99, [0.226, 0.229], [15, 20], [0.375, 0.380], [0.020, 0.035], { width_1backup_in: [0.408, 0.413], width_2backup_in: [0.538, 0.543] }),
  ],
  dynamic_radial: [
    gl(0.070, 1.78, [0.055, 0.057], [15, 25], [0.093, 0.098], [0.005, 0.015], { width_1backup_in: [0.138, 0.143], width_2backup_in: [0.205, 0.210] }),
    gl(0.103, 2.62, [0.088, 0.090], [10, 17], [0.140, 0.145], [0.005, 0.015], { width_1backup_in: [0.171, 0.176], width_2backup_in: [0.238, 0.243] }),
    gl(0.139, 3.53, [0.121, 0.123], [9, 16], [0.187, 0.192], [0.010, 0.025], { width_1backup_in: [0.208, 0.213], width_2backup_in: [0.275, 0.280] }),
    gl(0.210, 5.33, [0.185, 0.188], [8, 14], [0.281, 0.286], [0.020, 0.035], { width_1backup_in: [0.311, 0.316], width_2backup_in: [0.410, 0.415] }),
    gl(0.275, 6.99, [0.237, 0.240], [11, 16], [0.375, 0.380], [0.020, 0.035], { width_1backup_in: [0.408, 0.413], width_2backup_in: [0.538, 0.543] }),
  ],
  // Face squeeze: the PRINTED inch column is authoritative (it reconstructs CS against depth
  // exactly); squeeze_pct is DERIVED from it (round(squeeze_in/cs*100)). ERIKS AS C1's printed
  // single-% column (27/21/20/18/16) is DISCARDED -- it duplicates the static-radial nominal
  // squeeze column and contradicts its own inch column on the .210/.275 rows (the same
  // sibling-column assembly error the header documents for globaloring's face depths; R7).
  face: [
    faceGl(0.070, 1.78, [0.050, 0.054], [0.013, 0.023], [0.101, 0.107], [0.084, 0.089], [0.005, 0.015]),
    faceGl(0.103, 2.62, [0.074, 0.080], [0.020, 0.032], [0.136, 0.142], [0.120, 0.125], [0.005, 0.015]),
    faceGl(0.139, 3.53, [0.101, 0.107], [0.028, 0.042], [0.177, 0.187], [0.158, 0.164], [0.010, 0.025]),
    faceGl(0.210, 5.33, [0.152, 0.162], [0.043, 0.063], [0.270, 0.290], [0.239, 0.244], [0.020, 0.035]),
    faceGl(0.275, 6.99, [0.201, 0.211], [0.058, 0.080], [0.342, 0.362], [0.309, 0.314], [0.020, 0.035]),
  ],
  // THREE-SOURCE as of U-LW-DOVETAIL-375-ADJUDICATE (2026-07-02) for .070-.275: Parker
  // ORD-5700 p.4-19 Design Chart 4-4 (4-19 = handbook PAGE, 4-4 = the full-dovetail
  // CHART on it; 4-5 on the same page is the half-dovetail chart) + Bayseal p.11
  // (U-LW-DOVETAIL-SECOND-SOURCE) + Canyon Components
  // (canyoncomponents.com/dove-tail-design, EXACT match on all 5 rows incl. both radii).
  // Radii match ERIKS AS.C3 within print rounding (.015~=1/64, .030~=1/32, .060~=1/16).
  // .070 row CORRECTED to the Parker/Bayseal values (2-vs-1): ERIKS's .070 dovetail depth
  // (.050-.052 / 27%) duplicated its OWN static-radial row -- the same sibling-column
  // contamination class as its face single-% column (see face table note).
  // .375 is ERIKS-ONLY BY EXHAUSTIVE SEARCH (do NOT re-chase): Parker Chart 4-4, Bayseal,
  // Marco Rubber (allorings.com 301s to it), and Canyon all END at .275; Ace Seal 403s.
  // HALF-DOVETAIL TRAP: Parker's dovetail PDF DOES show a .375 row, but in Chart 4-5
  // (HALF dovetail, 66deg one-straight-wall): depth .319-.323 / width .350-.358 / 14%.
  // Width >> depth = different geometry -- it can NEVER corroborate or replace this
  // near-square full-dovetail row. single_source stays by design (pinned in test :227).
  // radius_in = [R groove-corner, R1 installation-edge].
  dovetail: [
    gl(0.070, 1.78, [0.053, 0.055], [23, 23], [0.057, 0.061], [0.005, 0.015]),
    gl(0.103, 2.62, [0.081, 0.083], [21, 21], [0.083, 0.087], [0.010, 0.015]),
    gl(0.139, 3.53, [0.111, 0.113], [20, 20], [0.113, 0.117], [0.010, 0.030]),
    gl(0.210, 5.33, [0.171, 0.173], [18, 18], [0.171, 0.175], [0.015, 0.030]),
    gl(0.275, 6.99, [0.231, 0.234], [16, 16], [0.231, 0.235], [0.015, 0.060]),
    gl(0.375, 9.52, [0.315, 0.319], [16, 16], [0.315, 0.319], [0.020, 0.090], { single_source: true }),
  ],
};

const MM_PER_IN = 25.4;
const mid = (r: readonly [number, number]): number => (r[0] + r[1]) / 2;
const r3g = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * O-ring gland lookup by cross-section in EITHER unit (0.139 inch or 3.53 mm both hit
 * the 1/8" class -- the unit is inferred from magnitude, tolerance 0.002in / 0.05mm).
 * Fail-loud on unknown cross-section or service. Geometry block is converted to mm.
 */
export function oringGland(crossSection: number, service: OringGlandService = "static_radial", seatDiameterMm?: number):
  OringGlandRow & { service: OringGlandService; single_source_advisory: boolean; geometry: StandardGrooveGeometry } {
  if (!Number.isFinite(crossSection) || crossSection <= 0) {
    throw new Error(`oringGland: crossSection must be positive finite (got ${crossSection})`);
  }
  if (seatDiameterMm !== undefined && (!Number.isFinite(seatDiameterMm) || seatDiameterMm <= 0)) {
    throw new Error(`oringGland: seatDiameterMm must be positive finite when provided (got ${seatDiameterMm})`);
  }
  const table = AS568_GLANDS[service];
  if (!table) {
    throw new Error(`oringGland: unknown service "${service}" (static_radial|dynamic_radial|face|dovetail)`);
  }
  const row = table.find((x) => Math.abs(x.cs_in - crossSection) < 0.002 || Math.abs(x.cs_mm - crossSection) < 0.05);
  if (!row) {
    const named = table.map((x) => `${x.cs_in}in/${x.cs_mm}mm`).join(", ");
    throw new Error(`oringGland: no ${service} gland row for cross-section ${crossSection} (table classes: ${named}). Standard AS568 classes only.`);
  }
  return {
    ...row,
    service,
    single_source_advisory: row.single_source === true,
    geometry: {
      groove_width_mm: r3g(mid(row.width_in) * MM_PER_IN),
      groove_depth_mm: r3g(mid(row.depth_in) * MM_PER_IN),
      ...(seatDiameterMm !== undefined ? { diameter_mm: seatDiameterMm } : {}),
      // dovetail radius_in packs TWO features [R groove-corner, R1 installation-edge] --
      // the bottom radius is R alone; other services carry a min/max range of ONE feature.
      bottom_radius_mm: r3g((service === "dovetail" ? row.radius_in[0] : mid(row.radius_in)) * MM_PER_IN),
      source: `AS568/ISO3601-2 ${service} gland, CS ${row.cs_in}in (${row.cs_mm}mm): depth ${row.depth_in[0]}-${row.depth_in[1]}in, width ${row.width_in[0]}-${row.width_in[1]}in (mm values converted at 25.4)`,
    },
  };
}

/** DIN 76-1 thread undercut for a pitch. external: dg = d - offset; internal: dg = d + offset. */
export function din76Undercut(
  pitch: number,
  opts: { internal?: boolean; short?: boolean; nominal_diameter_mm?: number } = {}
): Din76Row & { form: string; dg_mm?: number; groove_width_min_mm: number; groove_width_max_mm: number; geometry?: StandardGrooveGeometry } {
  if (!Number.isFinite(pitch) || pitch <= 0) {
    throw new Error(`din76Undercut: pitch must be positive finite (got ${pitch})`);
  }
  const table = opts.internal ? DIN76_INTERNAL : DIN76_EXTERNAL;
  const row = table.find((x) => x.pitch === pitch);
  if (!row) {
    throw new Error(
      `din76Undercut: DIN 76-1 has no ${opts.internal ? "internal" : "external"} row for pitch=${pitch}mm ` +
      `(${nearestSizes(table.map((x) => x.pitch), pitch)}). Standard pitches only.`
    );
  }
  const form = opts.internal ? (opts.short ? "D" : "C") : (opts.short ? "B" : "A");
  const g1 = opts.short ? row.g1_short : row.g1;
  const g2 = opts.short ? row.g2_short : row.g2;
  const out = { ...row, form, groove_width_min_mm: g1, groove_width_max_mm: g2 };
  const d = opts.nominal_diameter_mm;
  if (d !== undefined) {
    if (!Number.isFinite(d) || d <= 0) {
      throw new Error(`din76Undercut: nominal_diameter_mm must be positive finite (got ${d})`);
    }
    const dg = opts.internal ? d + row.dg_offset : d - row.dg_offset;
    if (dg <= 0) {
      throw new Error(`din76Undercut: dg=${dg} is non-physical for d=${d}, pitch=${pitch} (check units).`);
    }
    return {
      ...out,
      dg_mm: Math.round(dg * 1000) / 1000,
      geometry: {
        groove_width_mm: g2,
        groove_depth_mm: Math.round(row.dg_offset / 2 * 1000) / 1000,
        diameter_mm: d,
        bottom_radius_mm: row.r,
        source: `DIN 76-1 form ${form} P=${pitch}: dg=${opts.internal ? "d+" : "d-"}${row.dg_offset} (=${Math.round(dg * 1000) / 1000}), g1=${g1}, g2=${g2}, r=${row.r}`,
      },
    };
  }
  return out;
}
