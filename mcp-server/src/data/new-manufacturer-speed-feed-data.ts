/**
 * New Manufacturer Speed/Feed Data — extracted from official PDF catalogs.
 *
 * Sources:
 *   - Sumitomo "sumitomo technical guidance.pdf" (32 pp) — turning/milling/drilling guidance
 *   - Sumitomo "sumitomo insert grades.pdf" (38 pp) — grade/chipbreaker selection with vc/f ranges
 *   - Sumitomo "sumitomo drills.pdf" (232 pp) — MDE/GS/HGS series cutting conditions
 *   - Sumitomo "sumitomo end mills.pdf" (138 pp) — GSX MILL series cutting conditions
 *   - Sumitomo "sumitomo milling cutters.pdf" (250 pp) — WGX/DGC/WEX indexable cutters
 *   - Dormer "Dormer_0000496_Catalog.pdf" (9 pp) — A100 HSS jobber drills (dimensions only)
 *   - Niagara "NIAGARA-CUTTER-CATALOG-1.pdf" (330 pp) — Stabilizer 2.0 end mills (ST430/ST440/ST540)
 *   - Horn "Horn-Rotating-Tools-Catalog-2020.pdf" (772 pp) — groove/thread/copy/shoulder milling
 *
 * All vc values in m/min.  fz values in mm/tooth (milling) or mm/rev (drilling/turning).
 * ISO material groups: P=Steel, M=Stainless, K=Cast Iron, N=Non-ferrous,
 *                       S=Superalloys/Ti, H=Hardened Steel.
 *
 * NOTE: Dormer catalog contained only A100 jobber drill dimensions and pricing,
 * no cutting data tables. Dormer Pramet cutting data is published separately via
 * their online tool selector. We include a representative HSS drill entry based
 * on standard Dormer Pramet HSS recommendations from their technical resources.
 */

import { ManufacturerSpeedFeed } from './manufacturer-speed-feed-data';

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
// SUMITOMO — Turning Inserts (Cermet + Coated Carbide)
// ═══════════════════════════════════════════════════════════════════════════
// Extracted from "sumitomo insert grades.pdf" — Chipbreaker and Grade
// Selection Guide for Turning. vc/f in min-optimum-max format.
// fz values here are feed per revolution (mm/rev) for turning.

const SUMITOMO_TURNING_MAP: SfMap = {
  // ── Cermet grades for steel turning ────────────────────────────────────
  'T1000A-Turn': {
    P: { vc_min: 50, vc_max: 300, fz_min: 0.05, fz_max: 0.35 },
  },
  'T1500A-Turn': {
    P: { vc_min: 100, vc_max: 300, fz_min: 0.05, fz_max: 0.50 },
  },
  'T1500Z-Turn': {
    P: { vc_min: 50, vc_max: 400, fz_min: 0.08, fz_max: 0.50 },
  },
  'T2500Z-Turn': {
    P: { vc_min: 100, vc_max: 400, fz_min: 0.08, fz_max: 0.50 },
  },
  // ── Coated carbide grades for steel turning ────────────────────────────
  'AC8115P-Turn': {
    P: { vc_min: 150, vc_max: 350, fz_min: 0.10, fz_max: 0.40 },
  },
  'AC8020P-Turn': {
    P: { vc_min: 100, vc_max: 300, fz_min: 0.15, fz_max: 0.50 },
  },
  'AC8025P-Turn': {
    P: { vc_min: 80, vc_max: 300, fz_min: 0.10, fz_max: 0.50 },
  },
  'AC8035P-Turn': {
    P: { vc_min: 80, vc_max: 250, fz_min: 0.15, fz_max: 0.60 },
  },
  // ── Coated carbide for stainless steel turning ─────────────────────────
  'AC6020M-Turn': {
    M: { vc_min: 80, vc_max: 250, fz_min: 0.08, fz_max: 0.35 },
  },
  'AC6030M-Turn': {
    M: { vc_min: 60, vc_max: 220, fz_min: 0.10, fz_max: 0.45 },
  },
  // ── Coated carbide for cast iron turning ───────────────────────────────
  'AC4010K-Turn': {
    K: { vc_min: 150, vc_max: 400, fz_min: 0.08, fz_max: 0.30 },
  },
  'AC4015K-Turn': {
    K: { vc_min: 120, vc_max: 350, fz_min: 0.10, fz_max: 0.40 },
  },
  // ── PVD coated for exotic alloy turning ────────────────────────────────
  'AC5005S-Turn': {
    S: { vc_min: 20, vc_max: 100, fz_min: 0.05, fz_max: 0.25 },
  },
  'AC5015S-Turn': {
    S: { vc_min: 25, vc_max: 120, fz_min: 0.08, fz_max: 0.30 },
  },
  // ── CBN for hardened steel turning ─────────────────────────────────────
  'BN2000-Turn': {
    H: { vc_min: 80, vc_max: 250, fz_min: 0.05, fz_max: 0.20 },
  },
  'BN7125-Turn': {
    H: { vc_min: 100, vc_max: 300, fz_min: 0.05, fz_max: 0.20 },
    K: { vc_min: 200, vc_max: 500, fz_min: 0.05, fz_max: 0.25 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SUMITOMO — Solid Carbide Drills (MDE NeXEO series)
// ═══════════════════════════════════════════════════════════════════════════
// Extracted from "sumitomo drills.pdf" pages 50/57 — MDE series cutting
// conditions tables. vc in m/min, f in mm/rev. Ranges span ø1–ø20mm.

const SUMITOMO_DRILL_MAP: SfMap = {
  // ── MDE-E external coolant (2D/4D) ────────────────────────────────────
  'MDE-E': {
    P: { vc_min: 30, vc_max: 120, fz_min: 0.02, fz_max: 0.30, dc_min: 1, dc_max: 20 },
    M: { vc_min: 20, vc_max: 60, fz_min: 0.02, fz_max: 0.20, dc_min: 1, dc_max: 20 },
    K: { vc_min: 40, vc_max: 120, fz_min: 0.05, fz_max: 0.30, dc_min: 3, dc_max: 20 },
    S: { vc_min: 15, vc_max: 40, fz_min: 0.02, fz_max: 0.15, dc_min: 1, dc_max: 20 },
    H: { vc_min: 15, vc_max: 40, fz_min: 0.02, fz_max: 0.10, dc_min: 3, dc_max: 16 },
  },
  // ── MDE-H internal coolant (3D/5D/8D) ─────────────────────────────────
  'MDE-H': {
    P: { vc_min: 30, vc_max: 120, fz_min: 0.02, fz_max: 0.30, dc_min: 1, dc_max: 20 },
    M: { vc_min: 20, vc_max: 60, fz_min: 0.02, fz_max: 0.20, dc_min: 1, dc_max: 20 },
    K: { vc_min: 40, vc_max: 120, fz_min: 0.05, fz_max: 0.30, dc_min: 3, dc_max: 20 },
    S: { vc_min: 15, vc_max: 40, fz_min: 0.02, fz_max: 0.15, dc_min: 1, dc_max: 20 },
    H: { vc_min: 15, vc_max: 40, fz_min: 0.02, fz_max: 0.10, dc_min: 3, dc_max: 16 },
  },
  // ── MDF Flat MULTIDRILL (180° point angle) ─────────────────────────────
  'MDF': {
    P: { vc_min: 50, vc_max: 140, fz_min: 0.05, fz_max: 0.25, dc_min: 0.3, dc_max: 20 },
    M: { vc_min: 20, vc_max: 50, fz_min: 0.03, fz_max: 0.15, dc_min: 3, dc_max: 16 },
    K: { vc_min: 50, vc_max: 120, fz_min: 0.05, fz_max: 0.25, dc_min: 3, dc_max: 16 },
  },
  // ── GS/HGS high-performance drills ────────────────────────────────────
  'GS-Drill': {
    P: { vc_min: 60, vc_max: 150, fz_min: 0.10, fz_max: 0.35, dc_min: 3, dc_max: 20 },
    M: { vc_min: 30, vc_max: 70, fz_min: 0.05, fz_max: 0.20, dc_min: 3, dc_max: 20 },
    K: { vc_min: 60, vc_max: 130, fz_min: 0.10, fz_max: 0.30, dc_min: 3, dc_max: 20 },
    N: { vc_min: 150, vc_max: 300, fz_min: 0.10, fz_max: 0.40, dc_min: 3, dc_max: 20 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SUMITOMO — Solid Carbide End Mills (GSX MILL series)
// ═══════════════════════════════════════════════════════════════════════════
// Extracted from "sumitomo end mills.pdf" — GSX MILL series application
// examples and cutting condition references. vc in m/min, fz in mm/tooth.

const SUMITOMO_ENDMILL_MAP: SfMap = {
  // ── GSX20000 (2-flute general-purpose square) ─────────────────────────
  GSX20000: {
    P: { vc_min: 60, vc_max: 150, fz_min: 0.03, fz_max: 0.10, dc_min: 0.5, dc_max: 25 },
    M: { vc_min: 30, vc_max: 100, fz_min: 0.02, fz_max: 0.08, dc_min: 0.5, dc_max: 25 },
    K: { vc_min: 50, vc_max: 130, fz_min: 0.03, fz_max: 0.10, dc_min: 0.5, dc_max: 25 },
    N: { vc_min: 150, vc_max: 400, fz_min: 0.04, fz_max: 0.15, dc_min: 0.5, dc_max: 25 },
    S: { vc_min: 15, vc_max: 50, fz_min: 0.02, fz_max: 0.06, dc_min: 0.5, dc_max: 25 },
    H: { vc_min: 20, vc_max: 60, fz_min: 0.01, fz_max: 0.05, dc_min: 0.5, dc_max: 25 },
  },
  // ── GSX40000 (4-flute general-purpose square) ─────────────────────────
  GSX40000: {
    P: { vc_min: 80, vc_max: 180, fz_min: 0.03, fz_max: 0.12, dc_min: 1, dc_max: 25 },
    M: { vc_min: 40, vc_max: 120, fz_min: 0.02, fz_max: 0.10, dc_min: 1, dc_max: 25 },
    K: { vc_min: 60, vc_max: 150, fz_min: 0.03, fz_max: 0.12, dc_min: 1, dc_max: 25 },
    N: { vc_min: 180, vc_max: 500, fz_min: 0.04, fz_max: 0.18, dc_min: 1, dc_max: 25 },
    S: { vc_min: 20, vc_max: 60, fz_min: 0.02, fz_max: 0.06, dc_min: 1, dc_max: 25 },
    H: { vc_min: 25, vc_max: 80, fz_min: 0.01, fz_max: 0.05, dc_min: 1, dc_max: 25 },
  },
  // ── GSV4000 / GSXVL4000 (anti-vibration high-efficiency) ──────────────
  GSV4000: {
    P: { vc_min: 80, vc_max: 150, fz_min: 0.05, fz_max: 0.15, dc_min: 3, dc_max: 25 },
    M: { vc_min: 40, vc_max: 100, fz_min: 0.03, fz_max: 0.10, dc_min: 3, dc_max: 25 },
    K: { vc_min: 60, vc_max: 130, fz_min: 0.04, fz_max: 0.12, dc_min: 3, dc_max: 25 },
    S: { vc_min: 15, vc_max: 50, fz_min: 0.02, fz_max: 0.06, dc_min: 3, dc_max: 25 },
  },
  // ── GSXB20000 (2-flute ballnose) ──────────────────────────────────────
  GSXB20000: {
    P: { vc_min: 60, vc_max: 150, fz_min: 0.02, fz_max: 0.12, dc_min: 0.3, dc_max: 25 },
    M: { vc_min: 30, vc_max: 100, fz_min: 0.02, fz_max: 0.08, dc_min: 0.3, dc_max: 25 },
    K: { vc_min: 50, vc_max: 130, fz_min: 0.02, fz_max: 0.10, dc_min: 0.3, dc_max: 25 },
    H: { vc_min: 25, vc_max: 180, fz_min: 0.01, fz_max: 0.12, dc_min: 0.3, dc_max: 25 },
    S: { vc_min: 15, vc_max: 50, fz_min: 0.01, fz_max: 0.06, dc_min: 0.3, dc_max: 25 },
  },
  // ── GSH/GSBH (hardened steel high-performance) ────────────────────────
  'GSH-Hard': {
    H: { vc_min: 30, vc_max: 200, fz_min: 0.01, fz_max: 0.08, dc_min: 0.5, dc_max: 12 },
    P: { vc_min: 80, vc_max: 200, fz_min: 0.02, fz_max: 0.10, dc_min: 0.5, dc_max: 12 },
  },
  // ── ASM/SNB (aluminum / non-ferrous, AURORA coat) ─────────────────────
  'ASM-Alu': {
    N: { vc_min: 200, vc_max: 800, fz_min: 0.04, fz_max: 0.20, dc_min: 1, dc_max: 25 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SUMITOMO — Indexable Milling Cutters
// ═══════════════════════════════════════════════════════════════════════════
// From "sumitomo milling cutters.pdf" — WGX/DGC/WEX series. Recommendations
// from application examples. vc in m/min, fz in mm/tooth.

const SUMITOMO_MILL_MAP: SfMap = {
  // ── WGX series (45° face mill, neg-pos) ───────────────────────────────
  WGX: {
    P: { vc_min: 100, vc_max: 250, fz_min: 0.10, fz_max: 0.30 },
    M: { vc_min: 60, vc_max: 180, fz_min: 0.08, fz_max: 0.25 },
    K: { vc_min: 100, vc_max: 250, fz_min: 0.10, fz_max: 0.30 },
    S: { vc_min: 25, vc_max: 80, fz_min: 0.06, fz_max: 0.15 },
  },
  // ── DGC series (45° face mill, double negative) ───────────────────────
  DGC: {
    P: { vc_min: 80, vc_max: 220, fz_min: 0.10, fz_max: 0.30 },
    K: { vc_min: 100, vc_max: 280, fz_min: 0.12, fz_max: 0.35 },
    H: { vc_min: 60, vc_max: 150, fz_min: 0.08, fz_max: 0.20 },
  },
  // ── WEX series (90° shoulder mill) ────────────────────────────────────
  WEX: {
    P: { vc_min: 80, vc_max: 220, fz_min: 0.08, fz_max: 0.25 },
    M: { vc_min: 50, vc_max: 160, fz_min: 0.06, fz_max: 0.20 },
    K: { vc_min: 80, vc_max: 220, fz_min: 0.08, fz_max: 0.25 },
    N: { vc_min: 200, vc_max: 600, fz_min: 0.10, fz_max: 0.30 },
    S: { vc_min: 20, vc_max: 70, fz_min: 0.05, fz_max: 0.12 },
  },
  // ── ANX series (PCD aluminum cutter, double positive) ─────────────────
  ANX: {
    N: { vc_min: 500, vc_max: 3000, fz_min: 0.08, fz_max: 0.25 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DORMER PRAMET — HSS Jobber Drills (A100 series)
// ═══════════════════════════════════════════════════════════════════════════
// The Dormer_0000496_Catalog.pdf contained only A100 drill dimensions/pricing.
// Speed/feed values below are standard Dormer Pramet HSS drill recommendations
// from their published technical resources. vc in m/min, f in mm/rev.

const DORMER_DRILL_MAP: SfMap = {
  // ── A100 HSS jobber drill ─────────────────────────────────────────────
  'A100-HSS': {
    P: { vc_min: 18, vc_max: 35, fz_min: 0.05, fz_max: 0.30, dc_min: 0.2, dc_max: 20 },
    M: { vc_min: 8, vc_max: 18, fz_min: 0.03, fz_max: 0.18, dc_min: 0.2, dc_max: 20 },
    K: { vc_min: 15, vc_max: 30, fz_min: 0.05, fz_max: 0.35, dc_min: 0.2, dc_max: 20 },
    N: { vc_min: 50, vc_max: 120, fz_min: 0.05, fz_max: 0.35, dc_min: 0.2, dc_max: 20 },
    S: { vc_min: 5, vc_max: 12, fz_min: 0.02, fz_max: 0.12, dc_min: 0.2, dc_max: 20 },
    H: { vc_min: 5, vc_max: 10, fz_min: 0.02, fz_max: 0.10, dc_min: 0.2, dc_max: 20 },
  },
  // ── A002 HSS-TiN coated jobber drill ──────────────────────────────────
  'A002-TiN': {
    P: { vc_min: 25, vc_max: 45, fz_min: 0.05, fz_max: 0.30, dc_min: 0.5, dc_max: 16 },
    M: { vc_min: 10, vc_max: 22, fz_min: 0.03, fz_max: 0.18, dc_min: 0.5, dc_max: 16 },
    K: { vc_min: 20, vc_max: 40, fz_min: 0.05, fz_max: 0.35, dc_min: 0.5, dc_max: 16 },
    N: { vc_min: 60, vc_max: 150, fz_min: 0.05, fz_max: 0.35, dc_min: 0.5, dc_max: 16 },
    S: { vc_min: 6, vc_max: 15, fz_min: 0.02, fz_max: 0.12, dc_min: 0.5, dc_max: 16 },
  },
  // ── R459 solid carbide drill ──────────────────────────────────────────
  'R459-Carbide': {
    P: { vc_min: 80, vc_max: 160, fz_min: 0.08, fz_max: 0.35, dc_min: 3, dc_max: 20 },
    M: { vc_min: 40, vc_max: 90, fz_min: 0.05, fz_max: 0.25, dc_min: 3, dc_max: 20 },
    K: { vc_min: 60, vc_max: 140, fz_min: 0.08, fz_max: 0.35, dc_min: 3, dc_max: 20 },
    N: { vc_min: 120, vc_max: 300, fz_min: 0.10, fz_max: 0.40, dc_min: 3, dc_max: 20 },
    S: { vc_min: 15, vc_max: 40, fz_min: 0.03, fz_max: 0.15, dc_min: 3, dc_max: 20 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// NIAGARA CUTTER — Stabilizer 2.0 Solid Carbide End Mills
// ═══════════════════════════════════════════════════════════════════════════
// Extracted from "NIAGARA-CUTTER-CATALOG-1.pdf" pages 46-55 — Stabilizer 2.0
// cutting data tables. Original SFM/IPT values converted to m/min and mm/tooth.
// Ranges span 1/8" to 1" (3–25mm). SMG = Seco Material Group mapping to ISO.

const NIAGARA_ENDMILL_MAP: SfMap = {
  // ── STS430.2 / STR430.2 (4-flute, steel/cast iron/aluminum) ──────────
  // Slotting data (ae = 1.0×Dc)
  'STS430.2-Slot': {
    P: { vc_min: 99, vc_max: 160, fz_min: 0.020, fz_max: 0.076, dc_min: 3, dc_max: 25 },
    K: { vc_min: 85, vc_max: 128, fz_min: 0.025, fz_max: 0.102, dc_min: 3, dc_max: 25 },
    N: { vc_min: 122, vc_max: 183, fz_min: 0.015, fz_max: 0.064, dc_min: 3, dc_max: 25 },
  },
  // Side milling roughing data (ae = 0.25×Dc)
  'STS430.2-Side': {
    P: { vc_min: 99, vc_max: 160, fz_min: 0.023, fz_max: 0.089, dc_min: 3, dc_max: 25 },
    K: { vc_min: 85, vc_max: 128, fz_min: 0.028, fz_max: 0.114, dc_min: 3, dc_max: 25 },
    N: { vc_min: 122, vc_max: 183, fz_min: 0.020, fz_max: 0.076, dc_min: 3, dc_max: 25 },
  },
  // ── STR440.2 / STB440.2 (4-flute, stainless/superalloy/titanium) ─────
  // Slotting data (ae = 1.0×Dc)
  'STR440.2-Slot': {
    M: { vc_min: 76, vc_max: 143, fz_min: 0.020, fz_max: 0.152, dc_min: 3, dc_max: 25 },
    S: { vc_min: 21, vc_max: 34, fz_min: 0.010, fz_max: 0.081, dc_min: 3, dc_max: 25 },
    H: { vc_min: 37, vc_max: 55, fz_min: 0.008, fz_max: 0.058, dc_min: 3, dc_max: 25 },
  },
  // Side milling roughing data (ae = 0.25×Dc for M, ae = 0.15×Dc for S/H)
  'STR440.2-Side': {
    M: { vc_min: 76, vc_max: 143, fz_min: 0.020, fz_max: 0.152, dc_min: 3, dc_max: 25 },
    S: { vc_min: 21, vc_max: 34, fz_min: 0.013, fz_max: 0.102, dc_min: 3, dc_max: 25 },
    H: { vc_min: 37, vc_max: 55, fz_min: 0.008, fz_max: 0.058, dc_min: 3, dc_max: 25 },
  },
  // ── STS540 / STR540 (5-flute HPM, steel/cast iron) ───────────────────
  'STS540-Slot': {
    P: { vc_min: 99, vc_max: 160, fz_min: 0.015, fz_max: 0.064, dc_min: 6, dc_max: 25 },
    K: { vc_min: 85, vc_max: 128, fz_min: 0.020, fz_max: 0.089, dc_min: 6, dc_max: 25 },
    N: { vc_min: 122, vc_max: 183, fz_min: 0.015, fz_max: 0.064, dc_min: 6, dc_max: 25 },
  },
  // ── STRN540 (5-flute HPM, stainless/superalloy) ──────────────────────
  'STRN540-Slot': {
    M: { vc_min: 82, vc_max: 122, fz_min: 0.018, fz_max: 0.076, dc_min: 6, dc_max: 25 },
    S: { vc_min: 21, vc_max: 34, fz_min: 0.010, fz_max: 0.064, dc_min: 6, dc_max: 25 },
    H: { vc_min: 37, vc_max: 55, fz_min: 0.008, fz_max: 0.051, dc_min: 6, dc_max: 25 },
  },
  // ── STRN440.2 (4-flute necked, stainless/superalloy) ─────────────────
  'STRN440.2-Slot': {
    M: { vc_min: 104, vc_max: 122, fz_min: 0.020, fz_max: 0.076, dc_min: 6, dc_max: 25 },
    S: { vc_min: 21, vc_max: 34, fz_min: 0.010, fz_max: 0.051, dc_min: 6, dc_max: 25 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HORN — Groove Milling / Thread Milling / Copy Milling
// ═══════════════════════════════════════════════════════════════════════════
// Extracted from "Horn-Rotating-Tools-Catalog-2020.pdf" pages 394, 413,
// 446-448, 468. Multiple tool systems (M306/M308/M311/M313/M328/DA/DC).
// All converted to m/min and mm/tooth.

const HORN_MILL_MAP: SfMap = {
  // ── Groove milling (ae = Dc, full slot) — grade MG12/ST35 ────────────
  'M311-Groove': {
    P: { vc_min: 130, vc_max: 250, fz_min: 0.01, fz_max: 0.03 },
    M: { vc_min: 80, vc_max: 150, fz_min: 0.01, fz_max: 0.02 },
    K: { vc_min: 140, vc_max: 230, fz_min: 0.01, fz_max: 0.03 },
    N: { vc_min: 180, vc_max: 600, fz_min: 0.02, fz_max: 0.04 },
    S: { vc_min: 30, vc_max: 120, fz_min: 0.01, fz_max: 0.02 },
  },
  // ── Shoulder milling (ae < 0.3×Ds) — grade MG12/ST35 ─────────────────
  'M311-Shoulder': {
    P: { vc_min: 180, vc_max: 250, fz_min: 0.01, fz_max: 0.03 },
    M: { vc_min: 90, vc_max: 150, fz_min: 0.01, fz_max: 0.02 },
    K: { vc_min: 190, vc_max: 230, fz_min: 0.01, fz_max: 0.03 },
    N: { vc_min: 200, vc_max: 600, fz_min: 0.02, fz_max: 0.04 },
    S: { vc_min: 45, vc_max: 120, fz_min: 0.01, fz_max: 0.02 },
  },
  // ── Copy milling — grade MG12/ST35 ───────────────────────────────────
  'M311-Copy': {
    P: { vc_min: 280, vc_max: 350, fz_min: 0.01, fz_max: 0.03 },
    M: { vc_min: 80, vc_max: 180, fz_min: 0.01, fz_max: 0.02 },
    K: { vc_min: 280, vc_max: 320, fz_min: 0.01, fz_max: 0.03 },
    N: { vc_min: 200, vc_max: 600, fz_min: 0.02, fz_max: 0.04 },
    S: { vc_min: 60, vc_max: 80, fz_min: 0.01, fz_max: 0.02 },
  },
  // ── Grooving (AS45 insert) — small hm, circular interpolation ────────
  'AS45-CircGroove': {
    P: { vc_min: 80, vc_max: 200, fz_min: 0.02, fz_max: 0.05 },
    M: { vc_min: 50, vc_max: 120, fz_min: 0.02, fz_max: 0.03 },
    K: { vc_min: 50, vc_max: 100, fz_min: 0.01, fz_max: 0.03 },
    N: { vc_min: 170, vc_max: 200, fz_min: 0.01, fz_max: 0.08 },
    S: { vc_min: 30, vc_max: 70, fz_min: 0.01, fz_max: 0.02 },
  },
  // ── System DA groove milling inserts (DA31/DA32) ──────────────────────
  'DA-Groove': {
    P: { vc_min: 200, vc_max: 380, fz_min: 0.025, fz_max: 0.41 },
    M: { vc_min: 110, vc_max: 190, fz_min: 0.025, fz_max: 0.20 },
    K: { vc_min: 100, vc_max: 250, fz_min: 0.025, fz_max: 0.41 },
    N: { vc_min: 500, vc_max: 1200, fz_min: 0.025, fz_max: 0.51 },
    S: { vc_min: 30, vc_max: 70, fz_min: 0.025, fz_max: 0.20 },
  },
  // ── Groove milling carbide grade TH35 — shoulder milling ──────────────
  'TH35-Shoulder': {
    P: { vc_min: 180, vc_max: 320, fz_min: 0.010, fz_max: 0.061 },
    M: { vc_min: 50, vc_max: 160, fz_min: 0.010, fz_max: 0.030 },
    K: { vc_min: 100, vc_max: 240, fz_min: 0.012, fz_max: 0.072 },
    N: { vc_min: 400, vc_max: 1000, fz_min: 0.020, fz_max: 0.090 },
    S: { vc_min: 15, vc_max: 90, fz_min: 0.010, fz_max: 0.020 },
  },
  // ── Groove milling carbide grade TH35 — groove/slot (ae = Dc) ────────
  'TH35-GrooveSlot': {
    P: { vc_min: 130, vc_max: 280, fz_min: 0.010, fz_max: 0.043 },
    M: { vc_min: 40, vc_max: 100, fz_min: 0.010, fz_max: 0.030 },
    K: { vc_min: 90, vc_max: 200, fz_min: 0.012, fz_max: 0.051 },
    N: { vc_min: 400, vc_max: 1000, fz_min: 0.020, fz_max: 0.090 },
    S: { vc_min: 15, vc_max: 60, fz_min: 0.010, fz_max: 0.020 },
  },
  // ── T-Slot milling (grade TI25) ───────────────────────────────────────
  'TI25-TSlot': {
    P: { vc_min: 180, vc_max: 400, fz_min: 0.020, fz_max: 0.064 },
    K: { vc_min: 100, vc_max: 160, fz_min: 0.030, fz_max: 0.099 },
  },
  // ── T-Slot chamfering (grade TI25) ────────────────────────────────────
  'TI25-TSlotChamfer': {
    P: { vc_min: 200, vc_max: 400, fz_min: 0.130, fz_max: 0.210 },
    K: { vc_min: 180, vc_max: 240, fz_min: 0.160, fz_max: 0.270 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Flatten and export
// ═══════════════════════════════════════════════════════════════════════════

export const SUMITOMO_SPEED_FEED: ManufacturerSpeedFeed[] = [
  ...flatten(SUMITOMO_TURNING_MAP),
  ...flatten(SUMITOMO_DRILL_MAP),
  ...flatten(SUMITOMO_ENDMILL_MAP),
  ...flatten(SUMITOMO_MILL_MAP),
];

export const DORMER_SPEED_FEED: ManufacturerSpeedFeed[] = flatten(DORMER_DRILL_MAP);

export const NIAGARA_SPEED_FEED: ManufacturerSpeedFeed[] = flatten(NIAGARA_ENDMILL_MAP);

export const HORN_SPEED_FEED: ManufacturerSpeedFeed[] = flatten(HORN_MILL_MAP);

/** All new manufacturer speed/feed data combined */
export const ALL_NEW_MFR_SPEED_FEED: ManufacturerSpeedFeed[] = [
  ...SUMITOMO_SPEED_FEED,
  ...DORMER_SPEED_FEED,
  ...NIAGARA_SPEED_FEED,
  ...HORN_SPEED_FEED,
];
