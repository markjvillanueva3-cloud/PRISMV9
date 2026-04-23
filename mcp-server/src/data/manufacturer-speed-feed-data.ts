/**
 * Manufacturer Speed/Feed Data — extracted from official PDF catalogs.
 *
 * Sources:
 *   - Seco "Solid End Mills.pdf" (407 pp) — Jabro solid carbide end mills
 *   - Kennametal "Holemaking.pdf" (517 pp) — Seco Feedmax / Perfomax drills
 *   - Kennametal "Milling 2018.1.pdf" (752 pp) — indexable milling cutters
 *
 * All vc values in m/min.  fz values in mm/tooth (milling) or mm/rev (drilling).
 * ISO material groups: P=Steel, M=Stainless, K=Cast Iron, N=Non-ferrous,
 *                       S=Superalloys/Ti, H=Hardened Steel.
 */

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface ManufacturerSpeedFeed {
  /** Tool series designation (e.g. "JS512", "SD203A", "R220.53-12") */
  series: string;
  /** ISO material group: P | M | K | N | S | H */
  isoGroup: string;
  /** Minimum recommended cutting speed vc (m/min) */
  vc_min: number;
  /** Maximum recommended cutting speed vc (m/min) */
  vc_max: number;
  /** Minimum recommended feed per tooth fz (mm/tooth) or feed per rev f (mm/rev for drills) */
  fz_min: number;
  /** Maximum recommended feed per tooth fz (mm/tooth) or feed per rev f (mm/rev for drills) */
  fz_max: number;
  /** Minimum cutter diameter this data applies to (mm), if known */
  dc_min?: number;
  /** Maximum cutter diameter this data applies to (mm), if known */
  dc_max?: number;
}

// ---------------------------------------------------------------------------
// Helper to flatten { series: { isoGroup: data } } maps into arrays
// ---------------------------------------------------------------------------

type SfMap = Record<string, Record<string, {
  vc_min: number; vc_max: number; fz_min: number; fz_max: number;
  dc_min?: number; dc_max?: number;
}>>;

function flatten(map: SfMap): ManufacturerSpeedFeed[] {
  const out: ManufacturerSpeedFeed[] = [];
  for (const [series, groups] of Object.entries(map)) {
    for (const [isoGroup, d] of Object.entries(groups)) {
      out.push({ series, isoGroup, ...d });
    }
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// SECO Solid End Mills  (Jabro series)
// ═══════════════════════════════════════════════════════════════════════════
// Extracted from cutting-data tables per series.
// vc = m/min, fz = mm/tooth.  Ranges span all diameter columns (1-25 mm).

const SECO_MAP: SfMap = {
  // ── Universal end mills ──────────────────────────────────────────────
  JS512: {
    P: { vc_min: 100, vc_max: 225, fz_min: 0.005, fz_max: 0.17 },
    M: { vc_min: 30, vc_max: 125, fz_min: 0.005, fz_max: 0.15 },
    K: { vc_min: 95, vc_max: 190, fz_min: 0.005, fz_max: 0.17 },
    N: { vc_min: 200, vc_max: 570, fz_min: 0.006, fz_max: 0.20 },
    S: { vc_min: 16, vc_max: 70, fz_min: 0.002, fz_max: 0.10 },
  },
  JS513: {
    P: { vc_min: 100, vc_max: 230, fz_min: 0.004, fz_max: 0.13 },
    M: { vc_min: 30, vc_max: 125, fz_min: 0.0032, fz_max: 0.12 },
    K: { vc_min: 95, vc_max: 195, fz_min: 0.0032, fz_max: 0.13 },
    N: { vc_min: 130, vc_max: 500, fz_min: 0.005, fz_max: 0.18 },
    S: { vc_min: 15, vc_max: 60, fz_min: 0.0032, fz_max: 0.08 },
  },
  JS514: {
    P: { vc_min: 100, vc_max: 235, fz_min: 0.005, fz_max: 0.19 },
    M: { vc_min: 30, vc_max: 135, fz_min: 0.002, fz_max: 0.15 },
    K: { vc_min: 95, vc_max: 180, fz_min: 0.003, fz_max: 0.16 },
    N: { vc_min: 170, vc_max: 600, fz_min: 0.009, fz_max: 0.20 },
    S: { vc_min: 15, vc_max: 70, fz_min: 0.002, fz_max: 0.10 },
  },
  // ── High-performance roughing ────────────────────────────────────────
  JS553: {
    P: { vc_min: 100, vc_max: 265, fz_min: 0.014, fz_max: 0.18 },
    M: { vc_min: 30, vc_max: 130, fz_min: 0.008, fz_max: 0.16 },
    K: { vc_min: 110, vc_max: 215, fz_min: 0.010, fz_max: 0.18 },
    N: { vc_min: 235, vc_max: 810, fz_min: 0.010, fz_max: 0.22 },
    S: { vc_min: 15, vc_max: 65, fz_min: 0.0065, fz_max: 0.12 },
  },
  JS554: {
    P: { vc_min: 115, vc_max: 255, fz_min: 0.018, fz_max: 0.19 },
    M: { vc_min: 30, vc_max: 145, fz_min: 0.0095, fz_max: 0.17 },
    K: { vc_min: 105, vc_max: 235, fz_min: 0.015, fz_max: 0.19 },
    N: { vc_min: 225, vc_max: 910, fz_min: 0.015, fz_max: 0.25 },
    S: { vc_min: 15, vc_max: 75, fz_min: 0.0095, fz_max: 0.13 },
  },
  // ── High-feed cutters ────────────────────────────────────────────────
  JS564: {
    P: { vc_min: 185, vc_max: 345, fz_min: 0.04, fz_max: 0.18 },
    M: { vc_min: 110, vc_max: 225, fz_min: 0.036, fz_max: 0.17 },
    K: { vc_min: 170, vc_max: 295, fz_min: 0.04, fz_max: 0.19 },
    N: { vc_min: 385, vc_max: 800, fz_min: 0.04, fz_max: 0.17 },
    S: { vc_min: 26, vc_max: 85, fz_min: 0.026, fz_max: 0.12 },
  },
  JS565: {
    P: { vc_min: 185, vc_max: 345, fz_min: 0.048, fz_max: 0.22 },
    M: { vc_min: 110, vc_max: 225, fz_min: 0.04, fz_max: 0.20 },
    K: { vc_min: 170, vc_max: 295, fz_min: 0.048, fz_max: 0.22 },
    N: { vc_min: 385, vc_max: 800, fz_min: 0.04, fz_max: 0.20 },
    S: { vc_min: 26, vc_max: 85, fz_min: 0.026, fz_max: 0.12 },
  },
  // ── Long-reach / deep-cavity ─────────────────────────────────────────
  JS520: {
    P: { vc_min: 70, vc_max: 235, fz_min: 0.032, fz_max: 0.17 },
    M: { vc_min: 60, vc_max: 185, fz_min: 0.028, fz_max: 0.15 },
    K: { vc_min: 75, vc_max: 195, fz_min: 0.032, fz_max: 0.17 },
    N: { vc_min: 230, vc_max: 550, fz_min: 0.032, fz_max: 0.15 },
    S: { vc_min: 30, vc_max: 70, fz_min: 0.020, fz_max: 0.095 },
  },
  JS522: {
    P: { vc_min: 90, vc_max: 190, fz_min: 0.042, fz_max: 0.17 },
    M: { vc_min: 46, vc_max: 135, fz_min: 0.036, fz_max: 0.15 },
    K: { vc_min: 75, vc_max: 140, fz_min: 0.042, fz_max: 0.17 },
    N: { vc_min: 135, vc_max: 500, fz_min: 0.042, fz_max: 0.15 },
    S: { vc_min: 31, vc_max: 60, fz_min: 0.018, fz_max: 0.07 },
  },
  // ── Micro-grain finishing ────────────────────────────────────────────
  JS532: {
    P: { vc_min: 215, vc_max: 450, fz_min: 0.006, fz_max: 0.12 },
    M: { vc_min: 110, vc_max: 225, fz_min: 0.0038, fz_max: 0.11 },
    K: { vc_min: 190, vc_max: 315, fz_min: 0.0044, fz_max: 0.12 },
    N: { vc_min: 610, vc_max: 1375, fz_min: 0.008, fz_max: 0.16 },
    S: { vc_min: 70, vc_max: 125, fz_min: 0.003, fz_max: 0.09 },
  },
  JS533: {
    P: { vc_min: 195, vc_max: 425, fz_min: 0.005, fz_max: 0.10 },
    M: { vc_min: 110, vc_max: 235, fz_min: 0.0032, fz_max: 0.07 },
    K: { vc_min: 175, vc_max: 300, fz_min: 0.005, fz_max: 0.10 },
    N: { vc_min: 570, vc_max: 1275, fz_min: 0.007, fz_max: 0.14 },
    S: { vc_min: 80, vc_max: 125, fz_min: 0.0044, fz_max: 0.075 },
  },
  JS534: {
    P: { vc_min: 175, vc_max: 370, fz_min: 0.010, fz_max: 0.095 },
    M: { vc_min: 100, vc_max: 205, fz_min: 0.0055, fz_max: 0.06 },
    K: { vc_min: 160, vc_max: 265, fz_min: 0.0065, fz_max: 0.085 },
    N: { vc_min: 495, vc_max: 1100, fz_min: 0.013, fz_max: 0.11 },
    S: { vc_min: 65, vc_max: 115, fz_min: 0.0065, fz_max: 0.055 },
  },
  // ── Trochoidal / OptiRough ───────────────────────────────────────────
  JS506: {
    P: { vc_min: 120, vc_max: 225, fz_min: 0.026, fz_max: 0.15 },
    M: { vc_min: 31, vc_max: 135, fz_min: 0.017, fz_max: 0.12 },
    K: { vc_min: 125, vc_max: 220, fz_min: 0.026, fz_max: 0.15 },
    N: { vc_min: 180, vc_max: 520, fz_min: 0.026, fz_max: 0.18 },
    S: { vc_min: 10, vc_max: 70, fz_min: 0.024, fz_max: 0.12 },
  },
  JS509: {
    P: { vc_min: 190, vc_max: 350, fz_min: 0.015, fz_max: 0.15 },
    M: { vc_min: 46, vc_max: 215, fz_min: 0.013, fz_max: 0.12 },
    K: { vc_min: 195, vc_max: 345, fz_min: 0.016, fz_max: 0.15 },
    N: { vc_min: 285, vc_max: 810, fz_min: 0.016, fz_max: 0.18 },
    S: { vc_min: 15, vc_max: 105, fz_min: 0.008, fz_max: 0.10 },
  },
  // ── Stainless specialists ────────────────────────────────────────────
  JS720: {
    M: { vc_min: 55, vc_max: 150, fz_min: 0.028, fz_max: 0.17 },
  },
  JS730: {
    M: { vc_min: 55, vc_max: 150, fz_min: 0.044, fz_max: 0.15 },
  },
  // ── Jabro HPC series ─────────────────────────────────────────────────
  JH910: {
    P: { vc_min: 160, vc_max: 510, fz_min: 0.010, fz_max: 0.18 },
    M: { vc_min: 38, vc_max: 220, fz_min: 0.010, fz_max: 0.15 },
    K: { vc_min: 110, vc_max: 360, fz_min: 0.010, fz_max: 0.18 },
    S: { vc_min: 20, vc_max: 140, fz_min: 0.010, fz_max: 0.15 },
  },
  JH930: {
    P: { vc_min: 270, vc_max: 520, fz_min: 0.04, fz_max: 0.19 },
    K: { vc_min: 160, vc_max: 320, fz_min: 0.04, fz_max: 0.17 },
    S: { vc_min: 32, vc_max: 110, fz_min: 0.02, fz_max: 0.15 },
    H: { vc_min: 43, vc_max: 75, fz_min: 0.018, fz_max: 0.10 },
  },
  JH970: {
    P: { vc_min: 150, vc_max: 275, fz_min: 0.04, fz_max: 0.18 },
    M: { vc_min: 44, vc_max: 110, fz_min: 0.02, fz_max: 0.17 },
    S: { vc_min: 21, vc_max: 60, fz_min: 0.038, fz_max: 0.15 },
  },
  // ── Jabro Mini series ────────────────────────────────────────────────
  JM905: {
    P: { vc_min: 100, vc_max: 285, fz_min: 0.0014, fz_max: 0.095 },
    M: { vc_min: 43, vc_max: 130, fz_min: 0.0014, fz_max: 0.075 },
    N: { vc_min: 160, vc_max: 445, fz_min: 0.0014, fz_max: 0.10 },
    H: { vc_min: 41, vc_max: 110, fz_min: 0.0014, fz_max: 0.055 },
  },
  JM915: {
    P: { vc_min: 195, vc_max: 350, fz_min: 0.0015, fz_max: 0.095 },
    M: { vc_min: 80, vc_max: 160, fz_min: 0.0013, fz_max: 0.075 },
    N: { vc_min: 250, vc_max: 490, fz_min: 0.002, fz_max: 0.10 },
    H: { vc_min: 80, vc_max: 135, fz_min: 0.0015, fz_max: 0.055 },
  },
  // ── Hardened steel / cast iron specialists ───────────────────────────
  JH142: {
    P: { vc_min: 325, vc_max: 540, fz_min: 0.018, fz_max: 0.14 },
    K: { vc_min: 240, vc_max: 385, fz_min: 0.016, fz_max: 0.13 },
    H: { vc_min: 70, vc_max: 120, fz_min: 0.010, fz_max: 0.075 },
  },
  JH112: {
    K: { vc_min: 360, vc_max: 740, fz_min: 0.03, fz_max: 0.17 },
    H: { vc_min: 140, vc_max: 235, fz_min: 0.028, fz_max: 0.17 },
  },
  JH150: {
    K: { vc_min: 225, vc_max: 375, fz_min: 0.10, fz_max: 0.17 },
    H: { vc_min: 90, vc_max: 125, fz_min: 0.02, fz_max: 0.17 },
  },
  JH160: {
    P: { vc_min: 315, vc_max: 710, fz_min: 0.02, fz_max: 0.20 },
    H: { vc_min: 90, vc_max: 115, fz_min: 0.0075, fz_max: 0.10 },
  },
  JH120: {
    H: { vc_min: 35, vc_max: 80, fz_min: 0.0036, fz_max: 0.05 },
  },
  JH130: {
    H: { vc_min: 70, vc_max: 95, fz_min: 0.013, fz_max: 0.08 },
  },
  JM103: {
    H: { vc_min: 41, vc_max: 100, fz_min: 0.001, fz_max: 0.01 },
  },
  JM113: {
    H: { vc_min: 100, vc_max: 125, fz_min: 0.002, fz_max: 0.05 },
  },
  // ── Superalloy / titanium specialists ────────────────────────────────
  JH770: {
    S: { vc_min: 41, vc_max: 60, fz_min: 0.03, fz_max: 0.13 },
  },
  JH740: {
    S: { vc_min: 40, vc_max: 60, fz_min: 0.0063, fz_max: 0.10 },
  },
  JH710: {
    S: { vc_min: 80, vc_max: 120, fz_min: 0.0081, fz_max: 0.044 },
  },
  JH790: {
    S: { vc_min: 30, vc_max: 50, fz_min: 0.03, fz_max: 0.19 },
  },
  JH730: {
    S: { vc_min: 60, vc_max: 95, fz_min: 0.02, fz_max: 0.063 },
  },
  JH780: {
    S: { vc_min: 50, vc_max: 85, fz_min: 0.0075, fz_max: 0.049 },
  },
  JH720: {
    M: { vc_min: 35, vc_max: 110, fz_min: 0.0075, fz_max: 0.10 },
    N: { vc_min: 265, vc_max: 700, fz_min: 0.016, fz_max: 0.18 },
    S: { vc_min: 20, vc_max: 55, fz_min: 0.006, fz_max: 0.10 },
  },
  JH721: {
    S: { vc_min: 100, vc_max: 140, fz_min: 0.022, fz_max: 0.043 },
  },
  JH722: {
    S: { vc_min: 105, vc_max: 155, fz_min: 0.04, fz_max: 0.15 },
  },
  // ── Aluminium specialists ────────────────────────────────────────────
  JS412: {
    N: { vc_min: 300, vc_max: 600, fz_min: 0.016, fz_max: 0.20 },
  },
  JS413: {
    N: { vc_min: 200, vc_max: 600, fz_min: 0.014, fz_max: 0.20 },
  },
  JS452: {
    N: { vc_min: 195, vc_max: 590, fz_min: 0.016, fz_max: 0.20 },
  },
  JS453: {
    N: { vc_min: 200, vc_max: 600, fz_min: 0.016, fz_max: 0.20 },
  },
  JH421: {
    N: { vc_min: 510, vc_max: 710, fz_min: 0.014, fz_max: 0.20 },
  },
  JH410: {
    N: { vc_min: 520, vc_max: 730, fz_min: 0.055, fz_max: 0.22 },
  },
  JH820: {
    N: { vc_min: 140, vc_max: 315, fz_min: 0.024, fz_max: 0.18 },
  },
  JH830: {
    N: { vc_min: 140, vc_max: 310, fz_min: 0.012, fz_max: 0.18 },
  },
  JH440: {
    N: { vc_min: 255, vc_max: 910, fz_min: 0.06, fz_max: 0.25 },
  },
  JH450: {
    N: { vc_min: 275, vc_max: 940, fz_min: 0.04, fz_max: 0.22 },
  },
  JH460: {
    N: { vc_min: 490, vc_max: 690, fz_min: 0.055, fz_max: 0.22 },
  },
  JM403: {
    N: { vc_min: 130, vc_max: 425, fz_min: 0.015, fz_max: 0.12 },
  },
  JM413: {
    N: { vc_min: 155, vc_max: 510, fz_min: 0.03, fz_max: 0.15 },
  },
};

export const SECO_SPEED_FEED: ManufacturerSpeedFeed[] = flatten(SECO_MAP);

// ═══════════════════════════════════════════════════════════════════════════
// KENNAMETAL / SECO Holemaking  (Feedmax solid drills + indexable drills)
// ═══════════════════════════════════════════════════════════════════════════
// vc = m/min, f = mm/rev (feed per revolution, not per tooth).
// Diameter-dependent feed ranges span the full catalog diameter spread.

const KENNAMETAL_DRILL_MAP: SfMap = {
  // ── Seco Feedmax solid carbide drills ────────────────────────────────
  SD1103: {
    P: { vc_min: 75, vc_max: 140, fz_min: 0.11, fz_max: 0.36 },
    M: { vc_min: 34, vc_max: 75, fz_min: 0.05, fz_max: 0.26 },
    K: { vc_min: 50, vc_max: 90, fz_min: 0.11, fz_max: 0.34 },
    N: { vc_min: 105, vc_max: 250, fz_min: 0.15, fz_max: 0.50 },
    H: { vc_min: 24, vc_max: 33, fz_min: 0.048, fz_max: 0.15 },
  },
  SD203A: {
    P: { vc_min: 155, vc_max: 230, fz_min: 0.10, fz_max: 0.44 },
    K: { vc_min: 125, vc_max: 175, fz_min: 0.14, fz_max: 0.42 },
    H: { vc_min: 30, vc_max: 30, fz_min: 0.055, fz_max: 0.20 },
  },
  SD205A: {
    P: { vc_min: 140, vc_max: 210, fz_min: 0.10, fz_max: 0.40 },
    K: { vc_min: 115, vc_max: 160, fz_min: 0.14, fz_max: 0.40 },
    N: { vc_min: 130, vc_max: 185, fz_min: 0.16, fz_max: 0.48 },
    H: { vc_min: 27, vc_max: 27, fz_min: 0.055, fz_max: 0.20 },
  },
  SD207A: {
    P: { vc_min: 130, vc_max: 195, fz_min: 0.12, fz_max: 0.40 },
    K: { vc_min: 110, vc_max: 150, fz_min: 0.17, fz_max: 0.40 },
    H: { vc_min: 26, vc_max: 26, fz_min: 0.07, fz_max: 0.20 },
  },
  SD206: {
    P: { vc_min: 100, vc_max: 175, fz_min: 0.075, fz_max: 0.36 },
    M: { vc_min: 43, vc_max: 95, fz_min: 0.036, fz_max: 0.22 },
    K: { vc_min: 75, vc_max: 115, fz_min: 0.075, fz_max: 0.36 },
    N: { vc_min: 125, vc_max: 190, fz_min: 0.10, fz_max: 0.13 },
  },
  SD216A: {
    P: { vc_min: 85, vc_max: 125, fz_min: 0.12, fz_max: 0.38 },
    M: { vc_min: 31, vc_max: 65, fz_min: 0.06, fz_max: 0.28 },
    K: { vc_min: 60, vc_max: 80, fz_min: 0.14, fz_max: 0.36 },
    N: { vc_min: 90, vc_max: 135, fz_min: 0.16, fz_max: 0.46 },
    H: { vc_min: 22, vc_max: 22, fz_min: 0.055, fz_max: 0.15 },
  },
  SD230A: {
    P: { vc_min: 65, vc_max: 185, fz_min: 0.10, fz_max: 0.44 },
    M: { vc_min: 23, vc_max: 100, fz_min: 0.06, fz_max: 0.30 },
    K: { vc_min: 44, vc_max: 120, fz_min: 0.10, fz_max: 0.40 },
    N: { vc_min: 65, vc_max: 200, fz_min: 0.14, fz_max: 0.42 },
    H: { vc_min: 16, vc_max: 16, fz_min: 0.055, fz_max: 0.14 },
  },
  SD265A: {
    P: { vc_min: 130, vc_max: 180, fz_min: 0.11, fz_max: 0.42 },
    M: { vc_min: 80, vc_max: 100, fz_min: 0.11, fz_max: 0.36 },
    K: { vc_min: 85, vc_max: 120, fz_min: 0.11, fz_max: 0.42 },
    N: { vc_min: 130, vc_max: 195, fz_min: 0.15, fz_max: 0.42 },
  },
  // ── Seco Feedmax universal drills ────────────────────────────────────
  SD101: {
    P: { vc_min: 90, vc_max: 125, fz_min: 0.18, fz_max: 0.42 },
    M: { vc_min: 39, vc_max: 85, fz_min: 0.09, fz_max: 0.30 },
    K: { vc_min: 70, vc_max: 100, fz_min: 0.26, fz_max: 0.42 },
    N: { vc_min: 145, vc_max: 335, fz_min: 0.18, fz_max: 0.52 },
    S: { vc_min: 25, vc_max: 34, fz_min: 0.085, fz_max: 0.22 },
    H: { vc_min: 27, vc_max: 27, fz_min: 0.085, fz_max: 0.15 },
  },
  SD103: {
    P: { vc_min: 85, vc_max: 120, fz_min: 0.18, fz_max: 0.42 },
    M: { vc_min: 37, vc_max: 80, fz_min: 0.09, fz_max: 0.30 },
    K: { vc_min: 65, vc_max: 90, fz_min: 0.26, fz_max: 0.40 },
    N: { vc_min: 135, vc_max: 315, fz_min: 0.18, fz_max: 0.52 },
    S: { vc_min: 23, vc_max: 32, fz_min: 0.085, fz_max: 0.22 },
    H: { vc_min: 25, vc_max: 25, fz_min: 0.085, fz_max: 0.15 },
  },
  SD105: {
    P: { vc_min: 80, vc_max: 110, fz_min: 0.18, fz_max: 0.40 },
    M: { vc_min: 35, vc_max: 75, fz_min: 0.09, fz_max: 0.28 },
    K: { vc_min: 65, vc_max: 90, fz_min: 0.26, fz_max: 0.40 },
    N: { vc_min: 130, vc_max: 300, fz_min: 0.18, fz_max: 0.50 },
    S: { vc_min: 22, vc_max: 30, fz_min: 0.085, fz_max: 0.20 },
    H: { vc_min: 24, vc_max: 24, fz_min: 0.085, fz_max: 0.15 },
  },
  SD107: {
    P: { vc_min: 75, vc_max: 110, fz_min: 0.22, fz_max: 0.42 },
    M: { vc_min: 34, vc_max: 75, fz_min: 0.095, fz_max: 0.30 },
    K: { vc_min: 60, vc_max: 85, fz_min: 0.28, fz_max: 0.42 },
    N: { vc_min: 125, vc_max: 290, fz_min: 0.19, fz_max: 0.52 },
    S: { vc_min: 21, vc_max: 29, fz_min: 0.085, fz_max: 0.22 },
    H: { vc_min: 23, vc_max: 23, fz_min: 0.095, fz_max: 0.15 },
  },
  // ── Indexable / Perfomax style drills ────────────────────────────────
  SD403: {
    P: { vc_min: 110, vc_max: 155, fz_min: 0.28, fz_max: 0.44 },
    M: { vc_min: 45, vc_max: 95, fz_min: 0.11, fz_max: 0.30 },
    K: { vc_min: 80, vc_max: 110, fz_min: 0.26, fz_max: 0.42 },
    N: { vc_min: 145, vc_max: 215, fz_min: 0.26, fz_max: 0.34 },
    S: { vc_min: 24, vc_max: 34, fz_min: 0.095, fz_max: 0.22 },
    H: { vc_min: 32, vc_max: 32, fz_min: 0.12, fz_max: 0.15 },
  },
  SD405: {
    P: { vc_min: 90, vc_max: 125, fz_min: 0.28, fz_max: 0.42 },
    M: { vc_min: 37, vc_max: 80, fz_min: 0.11, fz_max: 0.28 },
    K: { vc_min: 65, vc_max: 90, fz_min: 0.26, fz_max: 0.40 },
    N: { vc_min: 120, vc_max: 175, fz_min: 0.26, fz_max: 0.34 },
    S: { vc_min: 20, vc_max: 28, fz_min: 0.095, fz_max: 0.22 },
    H: { vc_min: 26, vc_max: 26, fz_min: 0.12, fz_max: 0.15 },
  },
  SD408: {
    P: { vc_min: 70, vc_max: 100, fz_min: 0.28, fz_max: 0.42 },
    M: { vc_min: 29, vc_max: 65, fz_min: 0.11, fz_max: 0.28 },
    K: { vc_min: 50, vc_max: 70, fz_min: 0.26, fz_max: 0.40 },
    N: { vc_min: 95, vc_max: 140, fz_min: 0.26, fz_max: 0.34 },
    S: { vc_min: 16, vc_max: 22, fz_min: 0.095, fz_max: 0.22 },
    H: { vc_min: 21, vc_max: 21, fz_min: 0.12, fz_max: 0.15 },
  },
  // ── High-performance carbide drills (SD5xx series) ───────────────────
  SD522: {
    P: { vc_min: 210, vc_max: 460, fz_min: 0.06, fz_max: 0.32 },
    M: { vc_min: 140, vc_max: 260, fz_min: 0.055, fz_max: 0.26 },
    K: { vc_min: 185, vc_max: 250, fz_min: 0.11, fz_max: 0.34 },
    N: { vc_min: 155, vc_max: 420, fz_min: 0.12, fz_max: 0.46 },
    S: { vc_min: 40, vc_max: 60, fz_min: 0.085, fz_max: 0.22 },
    H: { vc_min: 70, vc_max: 250, fz_min: 0.05, fz_max: 0.20 },
  },
  SD523: {
    P: { vc_min: 180, vc_max: 415, fz_min: 0.06, fz_max: 0.32 },
    M: { vc_min: 120, vc_max: 245, fz_min: 0.055, fz_max: 0.24 },
    K: { vc_min: 165, vc_max: 225, fz_min: 0.11, fz_max: 0.32 },
    N: { vc_min: 135, vc_max: 360, fz_min: 0.12, fz_max: 0.44 },
    S: { vc_min: 34, vc_max: 55, fz_min: 0.085, fz_max: 0.22 },
    H: { vc_min: 60, vc_max: 250, fz_min: 0.05, fz_max: 0.18 },
  },
  SD524: {
    P: { vc_min: 160, vc_max: 380, fz_min: 0.06, fz_max: 0.30 },
    M: { vc_min: 105, vc_max: 235, fz_min: 0.055, fz_max: 0.24 },
    K: { vc_min: 155, vc_max: 210, fz_min: 0.11, fz_max: 0.32 },
    N: { vc_min: 115, vc_max: 315, fz_min: 0.12, fz_max: 0.42 },
    S: { vc_min: 29, vc_max: 48, fz_min: 0.085, fz_max: 0.22 },
    H: { vc_min: 50, vc_max: 250, fz_min: 0.05, fz_max: 0.18 },
  },
  SD525: {
    P: { vc_min: 140, vc_max: 355, fz_min: 0.07, fz_max: 0.30 },
    M: { vc_min: 95, vc_max: 225, fz_min: 0.065, fz_max: 0.24 },
    K: { vc_min: 135, vc_max: 195, fz_min: 0.13, fz_max: 0.34 },
    N: { vc_min: 100, vc_max: 285, fz_min: 0.14, fz_max: 0.44 },
    S: { vc_min: 26, vc_max: 44, fz_min: 0.10, fz_max: 0.22 },
    H: { vc_min: 46, vc_max: 250, fz_min: 0.06, fz_max: 0.18 },
  },
  // ── Perfomax-style indexable drills ──────────────────────────────────
  SD542: {
    P: { vc_min: 175, vc_max: 280, fz_min: 0.095, fz_max: 0.36 },
    M: { vc_min: 70, vc_max: 250, fz_min: 0.09, fz_max: 0.30 },
    K: { vc_min: 120, vc_max: 215, fz_min: 0.18, fz_max: 0.38 },
    N: { vc_min: 145, vc_max: 390, fz_min: 0.20, fz_max: 0.52 },
    S: { vc_min: 27, vc_max: 55, fz_min: 0.12, fz_max: 0.26 },
    H: { vc_min: 65, vc_max: 250, fz_min: 0.08, fz_max: 0.20 },
  },
  SD572: {
    P: { vc_min: 85, vc_max: 310, fz_min: 0.042, fz_max: 0.30 },
    M: { vc_min: 85, vc_max: 235, fz_min: 0.03, fz_max: 0.24 },
    K: { vc_min: 86, vc_max: 180, fz_min: 0.11, fz_max: 0.32 },
    S: { vc_min: 30, vc_max: 85, fz_min: 0.05, fz_max: 0.20 },
    H: { vc_min: 80, vc_max: 86, fz_min: 0.05, fz_max: 0.10 },
  },
  SD602: {
    P: { vc_min: 125, vc_max: 295, fz_min: 0.085, fz_max: 0.34 },
    M: { vc_min: 100, vc_max: 215, fz_min: 0.075, fz_max: 0.28 },
    K: { vc_min: 130, vc_max: 175, fz_min: 0.16, fz_max: 0.36 },
    H: { vc_min: 42, vc_max: 42, fz_min: 0.07, fz_max: 0.11 },
  },
};

export const KENNAMETAL_DRILL_SPEED_FEED: ManufacturerSpeedFeed[] = flatten(KENNAMETAL_DRILL_MAP);

// ═══════════════════════════════════════════════════════════════════════════
// KENNAMETAL Indexable Milling Cutters  (Milling 2018.1 catalog)
// ═══════════════════════════════════════════════════════════════════════════
// vc = m/min, fz = mm/tooth.
// Series names follow Kennametal R-number system.
// Note: fz ranges are per insert size; some series have multiple insert sizes.

const KENNAMETAL_MILL_MAP: SfMap = {
  // ── Square shoulder / slot milling (R217/220.69) ─────────────────────
  'R217.69-06': {
    P: { vc_min: 40, vc_max: 205, fz_min: 0.050, fz_max: 0.12 },
    M: { vc_min: 40, vc_max: 185, fz_min: 0.042, fz_max: 0.10 },
    N: { vc_min: 150, vc_max: 310, fz_min: 0.060, fz_max: 0.14 },
    S: { vc_min: 20, vc_max: 85, fz_min: 0.034, fz_max: 0.08 },
    K: { vc_min: 125, vc_max: 185, fz_min: 0.055, fz_max: 0.12 },
  },
  // ── Face milling (R220.53) ───────────────────────────────────────────
  'R220.53-09': {
    P: { vc_min: 135, vc_max: 530, fz_min: 0.10, fz_max: 0.22 },
    M: { vc_min: 40, vc_max: 380, fz_min: 0.10, fz_max: 0.18 },
    K: { vc_min: 135, vc_max: 500, fz_min: 0.15, fz_max: 0.24 },
    N: { vc_min: 350, vc_max: 1775, fz_min: 0.10, fz_max: 0.22 },
    S: { vc_min: 17, vc_max: 75, fz_min: 0.085, fz_max: 0.16 },
  },
  'R220.53-12': {
    P: { vc_min: 130, vc_max: 510, fz_min: 0.28, fz_max: 0.42 },
    M: { vc_min: 80, vc_max: 380, fz_min: 0.13, fz_max: 0.30 },
    K: { vc_min: 130, vc_max: 480, fz_min: 0.28, fz_max: 0.44 },
    N: { vc_min: 350, vc_max: 2000, fz_min: 0.20, fz_max: 0.40 },
    S: { vc_min: 11, vc_max: 70, fz_min: 0.13, fz_max: 0.26 },
  },
  'R220.53-15': {
    P: { vc_min: 130, vc_max: 490, fz_min: 0.32, fz_max: 0.48 },
    M: { vc_min: 80, vc_max: 365, fz_min: 0.18, fz_max: 0.34 },
    K: { vc_min: 130, vc_max: 470, fz_min: 0.34, fz_max: 0.50 },
    N: { vc_min: 350, vc_max: 1850, fz_min: 0.26, fz_max: 0.46 },
    S: { vc_min: 12, vc_max: 68, fz_min: 0.14, fz_max: 0.28 },
  },
  // ── High-feed milling (R220.43) ──────────────────────────────────────
  'R220.43-05': {
    P: { vc_min: 130, vc_max: 530, fz_min: 0.14, fz_max: 0.22 },
    M: { vc_min: 100, vc_max: 365, fz_min: 0.095, fz_max: 0.18 },
    K: { vc_min: 155, vc_max: 500, fz_min: 0.15, fz_max: 0.24 },
    N: { vc_min: 380, vc_max: 1675, fz_min: 0.11, fz_max: 0.20 },
    S: { vc_min: 36, vc_max: 85, fz_min: 0.085, fz_max: 0.16 },
  },
  'R220.43-07': {
    P: { vc_min: 120, vc_max: 450, fz_min: 0.26, fz_max: 0.38 },
    M: { vc_min: 80, vc_max: 350, fz_min: 0.17, fz_max: 0.28 },
    K: { vc_min: 140, vc_max: 440, fz_min: 0.30, fz_max: 0.42 },
    N: { vc_min: 350, vc_max: 1975, fz_min: 0.19, fz_max: 0.36 },
    S: { vc_min: 30, vc_max: 75, fz_min: 0.16, fz_max: 0.24 },
  },
  // ── Shoulder milling (R220.48) ───────────────────────────────────────
  'R220.48-05': {
    P: { vc_min: 130, vc_max: 500, fz_min: 0.20, fz_max: 0.32 },
    M: { vc_min: 80, vc_max: 350, fz_min: 0.14, fz_max: 0.26 },
    K: { vc_min: 130, vc_max: 485, fz_min: 0.20, fz_max: 0.34 },
    N: { vc_min: 350, vc_max: 1925, fz_min: 0.28, fz_max: 0.44 },
    S: { vc_min: 15, vc_max: 96, fz_min: 0.13, fz_max: 0.22 },
  },
  'R220.48-09': {
    P: { vc_min: 120, vc_max: 460, fz_min: 0.24, fz_max: 0.36 },
    M: { vc_min: 80, vc_max: 350, fz_min: 0.17, fz_max: 0.28 },
    K: { vc_min: 130, vc_max: 440, fz_min: 0.28, fz_max: 0.40 },
    N: { vc_min: 350, vc_max: 1675, fz_min: 0.34, fz_max: 0.50 },
    S: { vc_min: 15, vc_max: 93, fz_min: 0.16, fz_max: 0.26 },
  },
  // ── Face milling (R220.88) ───────────────────────────────────────────
  'R220.88-12': {
    P: { vc_min: 130, vc_max: 495, fz_min: 0.13, fz_max: 0.22 },
    K: { vc_min: 130, vc_max: 480, fz_min: 0.13, fz_max: 0.22 },
  },
  'R220.88-16': {
    P: { vc_min: 130, vc_max: 495, fz_min: 0.13, fz_max: 0.22 },
    K: { vc_min: 130, vc_max: 480, fz_min: 0.13, fz_max: 0.22 },
  },
  // ── Slot milling (R335.14/R335.15) ───────────────────────────────────
  'R335.14': {
    P: { vc_min: 120, vc_max: 300, fz_min: 0.032, fz_max: 0.10 },
    M: { vc_min: 80, vc_max: 240, fz_min: 0.020, fz_max: 0.08 },
    K: { vc_min: 120, vc_max: 280, fz_min: 0.032, fz_max: 0.10 },
    N: { vc_min: 250, vc_max: 970, fz_min: 0.046, fz_max: 0.14 },
    S: { vc_min: 32, vc_max: 70, fz_min: 0.018, fz_max: 0.06 },
  },
  'R335.15-13': {
    P: { vc_min: 120, vc_max: 290, fz_min: 0.17, fz_max: 0.30 },
    M: { vc_min: 80, vc_max: 230, fz_min: 0.12, fz_max: 0.24 },
    K: { vc_min: 120, vc_max: 270, fz_min: 0.17, fz_max: 0.30 },
    N: { vc_min: 250, vc_max: 900, fz_min: 0.24, fz_max: 0.38 },
    S: { vc_min: 30, vc_max: 65, fz_min: 0.11, fz_max: 0.20 },
  },
  // ── 90-deg shoulder (R220.90) ────────────────────────────────────────
  'R220.90-26': {
    P: { vc_min: 130, vc_max: 440, fz_min: 0.20, fz_max: 0.36 },
    M: { vc_min: 80, vc_max: 350, fz_min: 0.14, fz_max: 0.28 },
    K: { vc_min: 130, vc_max: 420, fz_min: 0.20, fz_max: 0.36 },
  },
  // ── Copy/profile milling (R217.79) ──────────────────────────────────
  'R217.79-06': {
    P: { vc_min: 40, vc_max: 390, fz_min: 0.065, fz_max: 0.16 },
    M: { vc_min: 40, vc_max: 285, fz_min: 0.046, fz_max: 0.12 },
    N: { vc_min: 280, vc_max: 1875, fz_min: 0.075, fz_max: 0.18 },
    S: { vc_min: 19, vc_max: 70, fz_min: 0.042, fz_max: 0.10 },
    K: { vc_min: 140, vc_max: 300, fz_min: 0.065, fz_max: 0.16 },
  },
  'R217.79-08': {
    P: { vc_min: 120, vc_max: 305, fz_min: 0.17, fz_max: 0.28 },
    M: { vc_min: 80, vc_max: 250, fz_min: 0.12, fz_max: 0.22 },
    K: { vc_min: 120, vc_max: 230, fz_min: 0.17, fz_max: 0.28 },
    S: { vc_min: 15, vc_max: 60, fz_min: 0.11, fz_max: 0.20 },
  },
  'R217.79-10': {
    P: { vc_min: 120, vc_max: 390, fz_min: 0.10, fz_max: 0.20 },
    M: { vc_min: 80, vc_max: 350, fz_min: 0.08, fz_max: 0.16 },
    K: { vc_min: 120, vc_max: 360, fz_min: 0.12, fz_max: 0.22 },
    N: { vc_min: 350, vc_max: 1750, fz_min: 0.09, fz_max: 0.18 },
    S: { vc_min: 15, vc_max: 65, fz_min: 0.075, fz_max: 0.14 },
  },
  'R217.79-12': {
    P: { vc_min: 120, vc_max: 365, fz_min: 0.14, fz_max: 0.26 },
    M: { vc_min: 80, vc_max: 350, fz_min: 0.13, fz_max: 0.22 },
    K: { vc_min: 120, vc_max: 340, fz_min: 0.18, fz_max: 0.30 },
    N: { vc_min: 350, vc_max: 1250, fz_min: 0.20, fz_max: 0.34 },
    S: { vc_min: 14, vc_max: 60, fz_min: 0.12, fz_max: 0.20 },
  },
  // ── Round insert cutters (R218.19) ──────────────────────────────────
  'R218.19-080': {
    P: { vc_min: 130, vc_max: 415, fz_min: 0.14, fz_max: 0.24 },
    M: { vc_min: 80, vc_max: 350, fz_min: 0.11, fz_max: 0.20 },
    K: { vc_min: 120, vc_max: 310, fz_min: 0.15, fz_max: 0.26 },
    N: { vc_min: 350, vc_max: 1725, fz_min: 0.20, fz_max: 0.34 },
    S: { vc_min: 25, vc_max: 70, fz_min: 0.11, fz_max: 0.20 },
  },
  'R218.19-100': {
    P: { vc_min: 120, vc_max: 400, fz_min: 0.20, fz_max: 0.32 },
    M: { vc_min: 80, vc_max: 350, fz_min: 0.15, fz_max: 0.26 },
    K: { vc_min: 120, vc_max: 300, fz_min: 0.26, fz_max: 0.38 },
    N: { vc_min: 350, vc_max: 1650, fz_min: 0.28, fz_max: 0.44 },
    S: { vc_min: 30, vc_max: 65, fz_min: 0.14, fz_max: 0.24 },
  },
  'R218.19-125': {
    P: { vc_min: 120, vc_max: 380, fz_min: 0.22, fz_max: 0.34 },
    M: { vc_min: 80, vc_max: 350, fz_min: 0.16, fz_max: 0.28 },
    K: { vc_min: 120, vc_max: 305, fz_min: 0.30, fz_max: 0.42 },
    N: { vc_min: 350, vc_max: 1600, fz_min: 0.26, fz_max: 0.42 },
    S: { vc_min: 25, vc_max: 60, fz_min: 0.15, fz_max: 0.26 },
  },
  'R218.19-160': {
    P: { vc_min: 120, vc_max: 370, fz_min: 0.22, fz_max: 0.36 },
    M: { vc_min: 80, vc_max: 350, fz_min: 0.17, fz_max: 0.30 },
    K: { vc_min: 120, vc_max: 300, fz_min: 0.30, fz_max: 0.44 },
    N: { vc_min: 350, vc_max: 1850, fz_min: 0.26, fz_max: 0.44 },
    S: { vc_min: 25, vc_max: 58, fz_min: 0.16, fz_max: 0.28 },
  },
  'R218.19-200': {
    P: { vc_min: 110, vc_max: 335, fz_min: 0.26, fz_max: 0.40 },
    M: { vc_min: 80, vc_max: 235, fz_min: 0.20, fz_max: 0.34 },
    K: { vc_min: 110, vc_max: 255, fz_min: 0.26, fz_max: 0.42 },
    N: { vc_min: 350, vc_max: 1675, fz_min: 0.38, fz_max: 0.56 },
    S: { vc_min: 20, vc_max: 55, fz_min: 0.19, fz_max: 0.32 },
  },
  // ── Ball nose copy milling (R218.20) ─────────────────────────────────
  'R218.20-060': {
    P: { vc_min: 130, vc_max: 570, fz_min: 0.042, fz_max: 0.10 },
    M: { vc_min: 100, vc_max: 450, fz_min: 0.030, fz_max: 0.08 },
    K: { vc_min: 120, vc_max: 400, fz_min: 0.042, fz_max: 0.10 },
    N: { vc_min: 380, vc_max: 1775, fz_min: 0.060, fz_max: 0.14 },
    S: { vc_min: 20, vc_max: 65, fz_min: 0.026, fz_max: 0.06 },
  },
  'R218.20-080': {
    P: { vc_min: 130, vc_max: 520, fz_min: 0.095, fz_max: 0.18 },
    M: { vc_min: 100, vc_max: 410, fz_min: 0.075, fz_max: 0.14 },
    K: { vc_min: 120, vc_max: 355, fz_min: 0.095, fz_max: 0.18 },
    N: { vc_min: 380, vc_max: 2000, fz_min: 0.14, fz_max: 0.26 },
    S: { vc_min: 19, vc_max: 60, fz_min: 0.07, fz_max: 0.13 },
  },
  'R218.20-100': {
    P: { vc_min: 130, vc_max: 480, fz_min: 0.095, fz_max: 0.18 },
    M: { vc_min: 100, vc_max: 375, fz_min: 0.075, fz_max: 0.14 },
    K: { vc_min: 120, vc_max: 340, fz_min: 0.095, fz_max: 0.18 },
    N: { vc_min: 380, vc_max: 1925, fz_min: 0.13, fz_max: 0.24 },
    S: { vc_min: 20, vc_max: 58, fz_min: 0.07, fz_max: 0.13 },
  },
  'R218.20-125': {
    P: { vc_min: 125, vc_max: 485, fz_min: 0.095, fz_max: 0.18 },
    M: { vc_min: 95, vc_max: 380, fz_min: 0.075, fz_max: 0.14 },
    K: { vc_min: 115, vc_max: 350, fz_min: 0.095, fz_max: 0.18 },
    N: { vc_min: 370, vc_max: 1925, fz_min: 0.13, fz_max: 0.24 },
    S: { vc_min: 21, vc_max: 58, fz_min: 0.07, fz_max: 0.13 },
  },
  'R218.20-150': {
    P: { vc_min: 120, vc_max: 465, fz_min: 0.13, fz_max: 0.24 },
    M: { vc_min: 90, vc_max: 365, fz_min: 0.10, fz_max: 0.18 },
    K: { vc_min: 110, vc_max: 300, fz_min: 0.13, fz_max: 0.24 },
    N: { vc_min: 360, vc_max: 2000, fz_min: 0.19, fz_max: 0.34 },
    S: { vc_min: 18, vc_max: 55, fz_min: 0.095, fz_max: 0.18 },
  },
  'R218.20-160': {
    P: { vc_min: 115, vc_max: 450, fz_min: 0.13, fz_max: 0.24 },
    M: { vc_min: 85, vc_max: 355, fz_min: 0.10, fz_max: 0.18 },
    K: { vc_min: 105, vc_max: 310, fz_min: 0.13, fz_max: 0.24 },
    N: { vc_min: 350, vc_max: 2000, fz_min: 0.18, fz_max: 0.32 },
    S: { vc_min: 19, vc_max: 55, fz_min: 0.09, fz_max: 0.17 },
  },
  'R218.20-200': {
    P: { vc_min: 110, vc_max: 435, fz_min: 0.19, fz_max: 0.32 },
    M: { vc_min: 80, vc_max: 350, fz_min: 0.14, fz_max: 0.26 },
    N: { vc_min: 350, vc_max: 1825, fz_min: 0.26, fz_max: 0.44 },
    S: { vc_min: 18, vc_max: 50, fz_min: 0.13, fz_max: 0.22 },
  },
  'R218.20-250': {
    P: { vc_min: 100, vc_max: 360, fz_min: 0.17, fz_max: 0.30 },
    M: { vc_min: 80, vc_max: 350, fz_min: 0.12, fz_max: 0.24 },
    N: { vc_min: 340, vc_max: 1875, fz_min: 0.22, fz_max: 0.40 },
    S: { vc_min: 16, vc_max: 48, fz_min: 0.12, fz_max: 0.22 },
  },
  // ── Toroid / plunge cutters (R218.24) ────────────────────────────────
  'R218.24-063': {
    P: { vc_min: 130, vc_max: 500, fz_min: 0.04, fz_max: 0.10 },
    M: { vc_min: 100, vc_max: 395, fz_min: 0.03, fz_max: 0.08 },
    K: { vc_min: 120, vc_max: 355, fz_min: 0.04, fz_max: 0.10 },
    N: { vc_min: 380, vc_max: 1600, fz_min: 0.055, fz_max: 0.14 },
    S: { vc_min: 36, vc_max: 65, fz_min: 0.028, fz_max: 0.06 },
  },
  'R218.24-080': {
    P: { vc_min: 125, vc_max: 445, fz_min: 0.09, fz_max: 0.18 },
    M: { vc_min: 95, vc_max: 350, fz_min: 0.065, fz_max: 0.14 },
    K: { vc_min: 115, vc_max: 295, fz_min: 0.09, fz_max: 0.18 },
    N: { vc_min: 370, vc_max: 2000, fz_min: 0.13, fz_max: 0.26 },
    S: { vc_min: 15, vc_max: 60, fz_min: 0.06, fz_max: 0.12 },
  },
  'R218.24-100': {
    P: { vc_min: 120, vc_max: 435, fz_min: 0.09, fz_max: 0.18 },
    M: { vc_min: 90, vc_max: 350, fz_min: 0.065, fz_max: 0.14 },
    K: { vc_min: 110, vc_max: 308, fz_min: 0.09, fz_max: 0.18 },
    N: { vc_min: 370, vc_max: 1925, fz_min: 0.13, fz_max: 0.26 },
    S: { vc_min: 15, vc_max: 58, fz_min: 0.06, fz_max: 0.12 },
  },
  'R218.24-125': {
    P: { vc_min: 115, vc_max: 425, fz_min: 0.09, fz_max: 0.18 },
    M: { vc_min: 85, vc_max: 350, fz_min: 0.065, fz_max: 0.14 },
    K: { vc_min: 105, vc_max: 308, fz_min: 0.09, fz_max: 0.18 },
    N: { vc_min: 360, vc_max: 1800, fz_min: 0.13, fz_max: 0.26 },
    S: { vc_min: 15, vc_max: 55, fz_min: 0.065, fz_max: 0.13 },
  },
  // ── Face milling (R190) ──────────────────────────────────────────────
  R190: {
    P: { vc_min: 130, vc_max: 480, fz_min: 0.26, fz_max: 0.42 },
    M: { vc_min: 80, vc_max: 340, fz_min: 0.18, fz_max: 0.34 },
    K: { vc_min: 130, vc_max: 450, fz_min: 0.38, fz_max: 0.56 },
  },
  // ── Disc milling (R230.19) ──────────────────────────────────────────
  'R230.19': {
    P: { vc_min: 120, vc_max: 450, fz_min: 0.12, fz_max: 0.24 },
    M: { vc_min: 80, vc_max: 315, fz_min: 0.10, fz_max: 0.20 },
    K: { vc_min: 120, vc_max: 345, fz_min: 0.12, fz_max: 0.24 },
    N: { vc_min: 350, vc_max: 1950, fz_min: 0.13, fz_max: 0.26 },
    S: { vc_min: 14, vc_max: 93, fz_min: 0.095, fz_max: 0.18 },
  },
  // ── Shoulder / corner radius (R217.29) ──────────────────────────────
  'R217.29-025': {
    P: { vc_min: 130, vc_max: 610, fz_min: 0.085, fz_max: 0.16 },
    M: { vc_min: 100, vc_max: 420, fz_min: 0.08, fz_max: 0.14 },
    K: { vc_min: 165, vc_max: 500, fz_min: 0.085, fz_max: 0.16 },
    N: { vc_min: 450, vc_max: 1675, fz_min: 0.12, fz_max: 0.22 },
    S: { vc_min: 36, vc_max: 80, fz_min: 0.075, fz_max: 0.14 },
  },
  'R217.29-035': {
    P: { vc_min: 120, vc_max: 580, fz_min: 0.11, fz_max: 0.22 },
    M: { vc_min: 90, vc_max: 400, fz_min: 0.10, fz_max: 0.18 },
    K: { vc_min: 155, vc_max: 480, fz_min: 0.12, fz_max: 0.22 },
    S: { vc_min: 35, vc_max: 75, fz_min: 0.10, fz_max: 0.18 },
  },
  // ── Heavy-duty face milling (R217.21/R220.21) ───────────────────────
  'R217.21-080': {
    P: { vc_min: 130, vc_max: 540, fz_min: 0.48, fz_max: 0.70 },
    M: { vc_min: 80, vc_max: 375, fz_min: 0.32, fz_max: 0.52 },
    K: { vc_min: 130, vc_max: 395, fz_min: 0.48, fz_max: 0.70 },
    N: { vc_min: 420, vc_max: 1975, fz_min: 0.60, fz_max: 0.90 },
    S: { vc_min: 15, vc_max: 55, fz_min: 0.32, fz_max: 0.52 },
  },
  'R217.21-100': {
    P: { vc_min: 130, vc_max: 485, fz_min: 0.65, fz_max: 1.10 },
    M: { vc_min: 80, vc_max: 335, fz_min: 0.38, fz_max: 0.70 },
    K: { vc_min: 130, vc_max: 405, fz_min: 0.65, fz_max: 1.20 },
    N: { vc_min: 420, vc_max: 2000, fz_min: 0.65, fz_max: 1.20 },
    S: { vc_min: 25, vc_max: 55, fz_min: 0.38, fz_max: 0.60 },
  },
  // ── Indexable T-slot (R417.19) ───────────────────────────────────────
  'R417.19': {
    P: { vc_min: 120, vc_max: 308, fz_min: 0.06, fz_max: 0.12 },
    M: { vc_min: 80, vc_max: 240, fz_min: 0.044, fz_max: 0.10 },
    K: { vc_min: 120, vc_max: 308, fz_min: 0.06, fz_max: 0.12 },
  },
};

export const KENNAMETAL_MILL_SPEED_FEED: ManufacturerSpeedFeed[] = flatten(KENNAMETAL_MILL_MAP);

// ═══════════════════════════════════════════════════════════════════════════
// Aggregate lookup helpers
// ═══════════════════════════════════════════════════════════════════════════

/** All manufacturer speed/feed data combined */
export const ALL_MANUFACTURER_SPEED_FEED: ManufacturerSpeedFeed[] = [
  ...SECO_SPEED_FEED,
  ...KENNAMETAL_DRILL_SPEED_FEED,
  ...KENNAMETAL_MILL_SPEED_FEED,
];

/**
 * Look up speed/feed data for a given series and ISO material group.
 * Returns undefined if no match found.
 */
export function lookupSpeedFeed(
  series: string,
  isoGroup: string,
): ManufacturerSpeedFeed | undefined {
  const upperSeries = series.toUpperCase();
  const upperIso = isoGroup.toUpperCase();
  return ALL_MANUFACTURER_SPEED_FEED.find(
    (sf) => sf.series.toUpperCase() === upperSeries && sf.isoGroup === upperIso,
  );
}

/**
 * Look up all speed/feed entries for a given series (all ISO groups).
 */
export function lookupSeriesSpeedFeed(series: string): ManufacturerSpeedFeed[] {
  const upperSeries = series.toUpperCase();
  return ALL_MANUFACTURER_SPEED_FEED.filter(
    (sf) => sf.series.toUpperCase() === upperSeries,
  );
}

/**
 * Find the best matching series by partial name match.
 * Returns all entries for the best match.
 */
export function findSpeedFeedByPartialSeries(partial: string): ManufacturerSpeedFeed[] {
  const upper = partial.toUpperCase();
  const allSeries = Array.from(new Set(ALL_MANUFACTURER_SPEED_FEED.map((sf) => sf.series)));
  const match = allSeries.find((s) => s.toUpperCase().includes(upper));
  if (!match) return [];
  return ALL_MANUFACTURER_SPEED_FEED.filter((sf) => sf.series === match);
}
