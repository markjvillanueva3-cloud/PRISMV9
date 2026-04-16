/**
 * Gühring & ISCAR Speed/Feed Data — extracted from official PDF catalogs.
 *
 * Sources:
 *   - Gühring "General Catalogue 2023" (1608 pp) — drills & solid carbide end mills
 *   - ISCAR "Milling Lines Part 1" (538 pp) — solid carbide & indexable end mills
 *
 * All vc values in m/min.  fz values in mm/tooth (milling) or mm/rev (drilling).
 * ISO material groups: P=Steel, M=Stainless, K=Cast Iron, N=Non-ferrous,
 *                       S=Superalloys/Ti, H=Hardened Steel.
 *
 * Gühring: vc/fz read directly (metric catalog).
 * ISCAR: SFM→m/min (×0.3048), IPT→mm/tooth (×25.4), rounded to practical values.
 */

import type { ManufacturerSpeedFeed } from "./manufacturer-speed-feed-data.js";

// ---------------------------------------------------------------------------
// Helper
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
// GÜHRING — Solid Carbide Drills (RT 100 / RT 150 series)
// ═══════════════════════════════════════════════════════════════════════════
// vc = m/min, f = mm/rev.  Ranges span Ø3–20 mm columns.
// Values represent the envelope (min f at smallest Ø, max f at largest Ø).

const GUHRING_DRILL_MAP: SfMap = {
  // ── RT 100 FB — Pilot drills with coolant ducts ────────────────────────
  "RT 100 FB": {
    P: { vc_min: 45, vc_max: 100, fz_min: 0.040, fz_max: 0.325, dc_min: 3, dc_max: 20 },
    M: { vc_min: 35, vc_max: 45, fz_min: 0.040, fz_max: 0.205, dc_min: 3, dc_max: 20 },
    K: { vc_min: 60, vc_max: 100, fz_min: 0.055, fz_max: 0.325, dc_min: 3, dc_max: 20 },
    N: { vc_min: 180, vc_max: 300, fz_min: 0.060, fz_max: 0.325, dc_min: 3, dc_max: 20 },
    S: { vc_min: 30, vc_max: 40, fz_min: 0.030, fz_max: 0.165, dc_min: 3, dc_max: 20 },
  },

  // ── RT 100 U — Ratio drills without coolant, 3xD ──────────────────────
  "RT 100 U": {
    P: { vc_min: 55, vc_max: 130, fz_min: 0.080, fz_max: 0.650, dc_min: 3, dc_max: 20 },
    M: { vc_min: 20, vc_max: 40, fz_min: 0.025, fz_max: 0.205, dc_min: 3, dc_max: 20 },
    K: { vc_min: 55, vc_max: 90, fz_min: 0.085, fz_max: 0.520, dc_min: 3, dc_max: 20 },
    N: { vc_min: 200, vc_max: 350, fz_min: 0.100, fz_max: 0.650, dc_min: 3, dc_max: 20 },
    S: { vc_min: 25, vc_max: 40, fz_min: 0.025, fz_max: 0.165, dc_min: 3, dc_max: 20 },
  },

  // ── RT 150 GG — Cast-iron specific drills, 120°/130° ──────────────────
  "RT 150 GG": {
    K: { vc_min: 70, vc_max: 105, fz_min: 0.065, fz_max: 0.520, dc_min: 3, dc_max: 20 },
    N: { vc_min: 155, vc_max: 210, fz_min: 0.105, fz_max: 0.650, dc_min: 3, dc_max: 20 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// GÜHRING — Solid Carbide End Mills (RF 100 series)
// ═══════════════════════════════════════════════════════════════════════════
// vc = m/min, fz = mm/tooth.  Ranges span Ø4–20 mm columns.
// For series with multiple application modes (slotting/roughing/finishing),
// vc range spans all modes; fz range spans all diameters and modes.

const GUHRING_MILL_MAP: SfMap = {
  // ── RF 100 Diver — Universal plunge/slot/rough/finish ──────────────────
  "RF 100 Diver": {
    P: { vc_min: 230, vc_max: 540, fz_min: 0.015, fz_max: 0.125, dc_min: 4, dc_max: 20 },
    M: { vc_min: 60, vc_max: 230, fz_min: 0.010, fz_max: 0.115, dc_min: 4, dc_max: 20 },
    K: { vc_min: 175, vc_max: 350, fz_min: 0.015, fz_max: 0.130, dc_min: 4, dc_max: 20 },
    N: { vc_min: 500, vc_max: 1000, fz_min: 0.020, fz_max: 0.165, dc_min: 4, dc_max: 20 },
  },

  // ── RF 100 Speed — HPC/HSC milling ────────────────────────────────────
  "RF 100 Speed": {
    P: { vc_min: 195, vc_max: 290, fz_min: 0.015, fz_max: 0.235, dc_min: 4, dc_max: 20 },
    M: { vc_min: 100, vc_max: 195, fz_min: 0.015, fz_max: 0.195, dc_min: 4, dc_max: 20 },
    K: { vc_min: 200, vc_max: 350, fz_min: 0.025, fz_max: 0.235, dc_min: 4, dc_max: 20 },
    N: { vc_min: 400, vc_max: 800, fz_min: 0.025, fz_max: 0.250, dc_min: 4, dc_max: 20 },
    S: { vc_min: 40, vc_max: 110, fz_min: 0.010, fz_max: 0.120, dc_min: 4, dc_max: 20 },
  },

  // ── RF 100 Sharp — 2-flute sharp-edge end mills ───────────────────────
  "RF 100 Sharp": {
    P: { vc_min: 135, vc_max: 360, fz_min: 0.005, fz_max: 0.140, dc_min: 1, dc_max: 20 },
    M: { vc_min: 65, vc_max: 240, fz_min: 0.004, fz_max: 0.115, dc_min: 1, dc_max: 20 },
    K: { vc_min: 175, vc_max: 350, fz_min: 0.005, fz_max: 0.130, dc_min: 1, dc_max: 20 },
    N: { vc_min: 400, vc_max: 700, fz_min: 0.007, fz_max: 0.165, dc_min: 1, dc_max: 20 },
    S: { vc_min: 25, vc_max: 80, fz_min: 0.003, fz_max: 0.080, dc_min: 1, dc_max: 20 },
  },

  // ── RF 100 G-Mold 65 U — Stable conditions, mold steel ───────────────
  "RF 100 G-Mold": {
    P: { vc_min: 135, vc_max: 360, fz_min: 0.013, fz_max: 0.175, dc_min: 3, dc_max: 25 },
    M: { vc_min: 65, vc_max: 240, fz_min: 0.013, fz_max: 0.145, dc_min: 3, dc_max: 25 },
    K: { vc_min: 175, vc_max: 350, fz_min: 0.016, fz_max: 0.165, dc_min: 3, dc_max: 25 },
    N: { vc_min: 400, vc_max: 700, fz_min: 0.021, fz_max: 0.200, dc_min: 3, dc_max: 25 },
    S: { vc_min: 25, vc_max: 80, fz_min: 0.010, fz_max: 0.100, dc_min: 3, dc_max: 25 },
    H: { vc_min: 40, vc_max: 140, fz_min: 0.008, fz_max: 0.100, dc_min: 3, dc_max: 25 },
  },

  // ── RF 100 U/HF, VA/NF, A/WF — Unstable conditions ───────────────────
  "RF 100 U": {
    P: { vc_min: 100, vc_max: 155, fz_min: 0.008, fz_max: 0.090, dc_min: 3, dc_max: 25 },
    M: { vc_min: 50, vc_max: 105, fz_min: 0.007, fz_max: 0.085, dc_min: 3, dc_max: 25 },
    K: { vc_min: 120, vc_max: 210, fz_min: 0.010, fz_max: 0.100, dc_min: 3, dc_max: 25 },
    N: { vc_min: 250, vc_max: 450, fz_min: 0.012, fz_max: 0.120, dc_min: 3, dc_max: 25 },
    S: { vc_min: 20, vc_max: 55, fz_min: 0.005, fz_max: 0.060, dc_min: 3, dc_max: 25 },
  },

  // ── RF 100 Micro Diver 2.5xD — Micro milling ─────────────────────────
  "RF 100 Micro 2.5xD": {
    P: { vc_min: 120, vc_max: 275, fz_min: 0.004, fz_max: 0.040, dc_min: 0.8, dc_max: 3 },
    M: { vc_min: 70, vc_max: 160, fz_min: 0.003, fz_max: 0.025, dc_min: 0.8, dc_max: 3 },
    K: { vc_min: 140, vc_max: 300, fz_min: 0.005, fz_max: 0.040, dc_min: 0.8, dc_max: 3 },
    N: { vc_min: 250, vc_max: 500, fz_min: 0.006, fz_max: 0.055, dc_min: 0.8, dc_max: 3 },
    S: { vc_min: 40, vc_max: 120, fz_min: 0.002, fz_max: 0.018, dc_min: 0.8, dc_max: 3 },
  },

  // ── RF 100 Micro Diver 5xD — Extended-reach micro milling ────────────
  "RF 100 Micro 5xD": {
    P: { vc_min: 45, vc_max: 165, fz_min: 0.002, fz_max: 0.038, dc_min: 1, dc_max: 3 },
    M: { vc_min: 30, vc_max: 100, fz_min: 0.001, fz_max: 0.022, dc_min: 1, dc_max: 3 },
    K: { vc_min: 55, vc_max: 180, fz_min: 0.003, fz_max: 0.038, dc_min: 1, dc_max: 3 },
    N: { vc_min: 100, vc_max: 300, fz_min: 0.004, fz_max: 0.048, dc_min: 1, dc_max: 3 },
    S: { vc_min: 20, vc_max: 65, fz_min: 0.001, fz_max: 0.015, dc_min: 1, dc_max: 3 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// GÜHRING — Micro Precision Drills (ExclusiveLine)
// ═══════════════════════════════════════════════════════════════════════════
// f = mm/rev, vc = m/min.  Ranges from Ø0.5–3 mm.

const GUHRING_MICRO_DRILL_MAP: SfMap = {
  "Micro Drill ≤7xD": {
    P: { vc_min: 40, vc_max: 110, fz_min: 0.026, fz_max: 0.240, dc_min: 0.5, dc_max: 3 },
    M: { vc_min: 15, vc_max: 70, fz_min: 0.005, fz_max: 0.066, dc_min: 0.5, dc_max: 3 },
    K: { vc_min: 70, vc_max: 150, fz_min: 0.032, fz_max: 0.330, dc_min: 0.5, dc_max: 3 },
    N: { vc_min: 200, vc_max: 350, fz_min: 0.040, fz_max: 0.240, dc_min: 0.5, dc_max: 3 },
    S: { vc_min: 15, vc_max: 40, fz_min: 0.004, fz_max: 0.048, dc_min: 0.5, dc_max: 3 },
  },
  "Micro Drill >7xD": {
    P: { vc_min: 45, vc_max: 105, fz_min: 0.030, fz_max: 0.120, dc_min: 1, dc_max: 3 },
    M: { vc_min: 15, vc_max: 70, fz_min: 0.013, fz_max: 0.066, dc_min: 1, dc_max: 3 },
    K: { vc_min: 70, vc_max: 150, fz_min: 0.035, fz_max: 0.180, dc_min: 1, dc_max: 3 },
    N: { vc_min: 200, vc_max: 350, fz_min: 0.040, fz_max: 0.120, dc_min: 1, dc_max: 3 },
    S: { vc_min: 15, vc_max: 40, fz_min: 0.010, fz_max: 0.048, dc_min: 1, dc_max: 3 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ISCAR — Solid Carbide End Mills (ECA/ECR/ECP/ECI/ECPI series)
// ═══════════════════════════════════════════════════════════════════════════
// Converted from imperial catalog: SFM→m/min (×0.3048), IPT→mm/tooth (×25.4).
// User Guide p.250 master table (IC900/IC908 grades, general milling).

const ISCAR_SOLID_MILL_MAP: SfMap = {
  // ── EC-H4-CFR — 4-flute variable-helix chatter-free roughing ──────────
  "EC-H4-CFR": {
    P: { vc_min: 70, vc_max: 180, fz_min: 0.03, fz_max: 0.10, dc_min: 3, dc_max: 20 },
    M: { vc_min: 60, vc_max: 110, fz_min: 0.03, fz_max: 0.08, dc_min: 3, dc_max: 20 },
    K: { vc_min: 90, vc_max: 280, fz_min: 0.03, fz_max: 0.10, dc_min: 3, dc_max: 20 },
    S: { vc_min: 20, vc_max: 70, fz_min: 0.02, fz_max: 0.06, dc_min: 3, dc_max: 20 },
    H: { vc_min: 30, vc_max: 60, fz_min: 0.01, fz_max: 0.04, dc_min: 3, dc_max: 20 },
  },

  // ── ECR-B-MF — 4/6-flute roughing end mills for hard materials ────────
  "ECR-B-MF": {
    P: { vc_min: 80, vc_max: 180, fz_min: 0.03, fz_max: 0.11, dc_min: 6, dc_max: 25 },
    M: { vc_min: 60, vc_max: 120, fz_min: 0.03, fz_max: 0.09, dc_min: 6, dc_max: 25 },
    K: { vc_min: 90, vc_max: 250, fz_min: 0.04, fz_max: 0.11, dc_min: 6, dc_max: 25 },
    S: { vc_min: 20, vc_max: 70, fz_min: 0.02, fz_max: 0.06, dc_min: 6, dc_max: 25 },
    H: { vc_min: 30, vc_max: 60, fz_min: 0.02, fz_max: 0.05, dc_min: 6, dc_max: 25 },
  },

  // ── ECP-E3L — 3-flute chip-splitting roughing ─────────────────────────
  "ECP-E3L": {
    P: { vc_min: 80, vc_max: 180, fz_min: 0.02, fz_max: 0.09, dc_min: 5, dc_max: 25 },
    M: { vc_min: 60, vc_max: 120, fz_min: 0.02, fz_max: 0.08, dc_min: 5, dc_max: 25 },
    K: { vc_min: 90, vc_max: 250, fz_min: 0.03, fz_max: 0.10, dc_min: 5, dc_max: 25 },
    S: { vc_min: 20, vc_max: 70, fz_min: 0.02, fz_max: 0.05, dc_min: 5, dc_max: 25 },
  },

  // ── ECPI-E3L/E4L — Stainless steel roughing (chip splitting) ──────────
  "ECPI-E3L/E4L": {
    M: { vc_min: 60, vc_max: 120, fz_min: 0.025, fz_max: 0.10, dc_min: 6, dc_max: 25 },
    P: { vc_min: 80, vc_max: 180, fz_min: 0.025, fz_max: 0.10, dc_min: 6, dc_max: 25 },
  },

  // ── ECKI-H4R-CF — 4-flute titanium chatter-free ───────────────────────
  "ECKI-H4R-CF": {
    S: { vc_min: 20, vc_max: 70, fz_min: 0.04, fz_max: 0.07, dc_min: 6, dc_max: 20 },
    P: { vc_min: 80, vc_max: 180, fz_min: 0.04, fz_max: 0.10, dc_min: 6, dc_max: 20 },
    M: { vc_min: 60, vc_max: 120, fz_min: 0.04, fz_max: 0.07, dc_min: 6, dc_max: 20 },
  },

  // ── ECI-H-CF — 6-20 flute chatter-free HSM finishing ──────────────────
  "ECI-H-CF": {
    P: { vc_min: 120, vc_max: 280, fz_min: 0.03, fz_max: 0.13, dc_min: 6, dc_max: 20 },
    M: { vc_min: 60, vc_max: 120, fz_min: 0.03, fz_max: 0.10, dc_min: 6, dc_max: 20 },
    K: { vc_min: 130, vc_max: 280, fz_min: 0.04, fz_max: 0.13, dc_min: 6, dc_max: 20 },
    S: { vc_min: 20, vc_max: 70, fz_min: 0.02, fz_max: 0.06, dc_min: 6, dc_max: 20 },
    H: { vc_min: 30, vc_max: 60, fz_min: 0.01, fz_max: 0.04, dc_min: 6, dc_max: 20 },
  },

  // ── ECHI-B6 — 6-flute finishing for hard materials up to 65 HRC ───────
  "ECHI-B6": {
    H: { vc_min: 30, vc_max: 60, fz_min: 0.025, fz_max: 0.13, dc_min: 6, dc_max: 25 },
    P: { vc_min: 120, vc_max: 280, fz_min: 0.025, fz_max: 0.13, dc_min: 6, dc_max: 25 },
    M: { vc_min: 60, vc_max: 120, fz_min: 0.025, fz_max: 0.10, dc_min: 6, dc_max: 25 },
    K: { vc_min: 130, vc_max: 280, fz_min: 0.025, fz_max: 0.13, dc_min: 6, dc_max: 25 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ISCAR — Solid Carbide End Mills: Master User Guide Table (p.250)
// ═══════════════════════════════════════════════════════════════════════════
// General recommendations for IC900/IC908 grades across all solid end mills.
// SFM→m/min, IPT→mm/t converted and rounded.

const ISCAR_GENERAL_SOLID_MAP: SfMap = {
  // General solid carbide end mill recommendations (IC900/IC908)
  "ISCAR Solid EM (general)": {
    P: { vc_min: 120, vc_max: 280, fz_min: 0.02, fz_max: 0.10, dc_min: 6, dc_max: 25 },
    M: { vc_min: 60, vc_max: 120, fz_min: 0.02, fz_max: 0.07, dc_min: 6, dc_max: 25 },
    K: { vc_min: 80, vc_max: 260, fz_min: 0.03, fz_max: 0.10, dc_min: 6, dc_max: 25 },
    N: { vc_min: 700, vc_max: 900, fz_min: 0.05, fz_max: 0.20, dc_min: 6, dc_max: 25 },
    S: { vc_min: 20, vc_max: 70, fz_min: 0.02, fz_max: 0.05, dc_min: 6, dc_max: 25 },
    H: { vc_min: 30, vc_max: 60, fz_min: 0.01, fz_max: 0.05, dc_min: 6, dc_max: 25 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ISCAR — Aluminum End Mills (ECAI-B3-EC, DLC coated)
// ═══════════════════════════════════════════════════════════════════════════
// p.164: vc in SFM, fz in IPT per diameter.  Converted to metric.

const ISCAR_ALUMINUM_MAP: SfMap = {
  "ECAI-B3-EC": {
    N: { vc_min: 490, vc_max: 670, fz_min: 0.025, fz_max: 0.25, dc_min: 3, dc_max: 25 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ISCAR — Multi-Master Modular End Mills (MM-TS / MM-GRIT)
// ═══════════════════════════════════════════════════════════════════════════
// p.251/462: SFM→m/min, IPT→mm/t converted.

const ISCAR_MULTI_MASTER_MAP: SfMap = {
  "Multi-Master MM-TS": {
    P: { vc_min: 60, vc_max: 140, fz_min: 0.05, fz_max: 0.20, dc_min: 8, dc_max: 25 },
    M: { vc_min: 80, vc_max: 120, fz_min: 0.05, fz_max: 0.10, dc_min: 8, dc_max: 25 },
    K: { vc_min: 80, vc_max: 220, fz_min: 0.10, fz_max: 0.20, dc_min: 8, dc_max: 25 },
    N: { vc_min: 800, vc_max: 1200, fz_min: 0.10, fz_max: 0.20, dc_min: 8, dc_max: 25 },
    S: { vc_min: 20, vc_max: 45, fz_min: 0.03, fz_max: 0.08, dc_min: 8, dc_max: 25 },
  },
  "Multi-Master MM-GRIT": {
    P: { vc_min: 60, vc_max: 160, fz_min: 0.05, fz_max: 0.15, dc_min: 8, dc_max: 25 },
    M: { vc_min: 90, vc_max: 130, fz_min: 0.03, fz_max: 0.12, dc_min: 8, dc_max: 25 },
    K: { vc_min: 160, vc_max: 250, fz_min: 0.03, fz_max: 0.12, dc_min: 8, dc_max: 25 },
    N: { vc_min: 500, vc_max: 1000, fz_min: 0.05, fz_max: 0.15, dc_min: 8, dc_max: 25 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ISCAR — Indexable Milling: TANG-PLUNGE Face Milling (p.332–334)
// ═══════════════════════════════════════════════════════════════════════════
// SFM→m/min, IPT→mm/t converted.

const ISCAR_INDEXABLE_MAP: SfMap = {
  "TANG-PLUNGE Face Mill": {
    P: { vc_min: 80, vc_max: 120, fz_min: 0.10, fz_max: 0.20, dc_min: 50, dc_max: 100 },
    M: { vc_min: 60, vc_max: 80, fz_min: 0.08, fz_max: 0.10, dc_min: 50, dc_max: 100 },
    K: { vc_min: 100, vc_max: 200, fz_min: 0.13, fz_max: 0.20, dc_min: 50, dc_max: 100 },
    S: { vc_min: 20, vc_max: 40, fz_min: 0.08, fz_max: 0.13, dc_min: 50, dc_max: 100 },
    H: { vc_min: 70, vc_max: 100, fz_min: 0.08, fz_max: 0.10, dc_min: 50, dc_max: 100 },
  },

  // ── Slotting / Slitting cutters (SD series, p.406) ─────────────────────
  "SD Slotting Cutter": {
    P: { vc_min: 80, vc_max: 200, fz_min: 0.06, fz_max: 0.20, dc_min: 25, dc_max: 40 },
    M: { vc_min: 60, vc_max: 100, fz_min: 0.05, fz_max: 0.12, dc_min: 25, dc_max: 40 },
    K: { vc_min: 70, vc_max: 140, fz_min: 0.06, fz_max: 0.15, dc_min: 25, dc_max: 40 },
    S: { vc_min: 20, vc_max: 40, fz_min: 0.03, fz_max: 0.10, dc_min: 25, dc_max: 40 },
    H: { vc_min: 25, vc_max: 50, fz_min: 0.03, fz_max: 0.08, dc_min: 25, dc_max: 40 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ISCAR — Solid Carbide End Mills: Roughing Selection Guide (p.113–119)
// ═══════════════════════════════════════════════════════════════════════════
// Full-engagement roughing data.  SFM→m/min, IPT→mm/t.

const ISCAR_ROUGH_SELECTION_MAP: SfMap = {
  "ISCAR Solid EM Roughing": {
    P: { vc_min: 130, vc_max: 180, fz_min: 0.02, fz_max: 0.06, dc_min: 6, dc_max: 20 },
    M: { vc_min: 60, vc_max: 80, fz_min: 0.02, fz_max: 0.05, dc_min: 6, dc_max: 20 },
    K: { vc_min: 100, vc_max: 180, fz_min: 0.03, fz_max: 0.07, dc_min: 6, dc_max: 20 },
    N: { vc_min: 700, vc_max: 900, fz_min: 0.05, fz_max: 0.15, dc_min: 6, dc_max: 20 },
    S: { vc_min: 20, vc_max: 45, fz_min: 0.015, fz_max: 0.04, dc_min: 6, dc_max: 20 },
    H: { vc_min: 30, vc_max: 50, fz_min: 0.01, fz_max: 0.03, dc_min: 6, dc_max: 20 },
  },
  "ISCAR Solid EM Finishing": {
    P: { vc_min: 160, vc_max: 280, fz_min: 0.03, fz_max: 0.10, dc_min: 6, dc_max: 20 },
    M: { vc_min: 100, vc_max: 130, fz_min: 0.03, fz_max: 0.06, dc_min: 6, dc_max: 20 },
    K: { vc_min: 180, vc_max: 280, fz_min: 0.04, fz_max: 0.10, dc_min: 6, dc_max: 20 },
    N: { vc_min: 700, vc_max: 900, fz_min: 0.05, fz_max: 0.20, dc_min: 6, dc_max: 20 },
    S: { vc_min: 30, vc_max: 70, fz_min: 0.02, fz_max: 0.05, dc_min: 6, dc_max: 20 },
    H: { vc_min: 30, vc_max: 60, fz_min: 0.01, fz_max: 0.04, dc_min: 6, dc_max: 20 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ISCAR — Thread Milling (p.531–532)
// ═══════════════════════════════════════════════════════════════════════════
// SFM→m/min, IPT→mm/t converted.

const ISCAR_THREAD_MILL_MAP: SfMap = {
  "ISCAR Thread Mill (indexable)": {
    P: { vc_min: 80, vc_max: 200, fz_min: 0.05, fz_max: 0.15 },
    M: { vc_min: 90, vc_max: 145, fz_min: 0.05, fz_max: 0.15 },
    K: { vc_min: 60, vc_max: 160, fz_min: 0.05, fz_max: 0.15 },
    N: { vc_min: 110, vc_max: 350, fz_min: 0.05, fz_max: 0.15 },
    S: { vc_min: 10, vc_max: 60, fz_min: 0.05, fz_max: 0.15 },
    H: { vc_min: 20, vc_max: 60, fz_min: 0.05, fz_max: 0.15 },
  },
  "ISCAR Thread Mill (solid)": {
    P: { vc_min: 65, vc_max: 250, fz_min: 0.02, fz_max: 0.21, dc_min: 2, dc_max: 32 },
    M: { vc_min: 85, vc_max: 100, fz_min: 0.02, fz_max: 0.11, dc_min: 2, dc_max: 32 },
    K: { vc_min: 60, vc_max: 160, fz_min: 0.03, fz_max: 0.21, dc_min: 2, dc_max: 32 },
    N: { vc_min: 110, vc_max: 350, fz_min: 0.03, fz_max: 0.21, dc_min: 2, dc_max: 32 },
    S: { vc_min: 10, vc_max: 45, fz_min: 0.02, fz_max: 0.11, dc_min: 2, dc_max: 32 },
    H: { vc_min: 20, vc_max: 60, fz_min: 0.02, fz_max: 0.11, dc_min: 2, dc_max: 32 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════════════

export const GUHRING_SPEED_FEED: ManufacturerSpeedFeed[] = [
  ...flatten(GUHRING_DRILL_MAP),
  ...flatten(GUHRING_MILL_MAP),
  ...flatten(GUHRING_MICRO_DRILL_MAP),
];

export const ISCAR_SPEED_FEED: ManufacturerSpeedFeed[] = [
  ...flatten(ISCAR_SOLID_MILL_MAP),
  ...flatten(ISCAR_GENERAL_SOLID_MAP),
  ...flatten(ISCAR_ALUMINUM_MAP),
  ...flatten(ISCAR_MULTI_MASTER_MAP),
  ...flatten(ISCAR_INDEXABLE_MAP),
  ...flatten(ISCAR_ROUGH_SELECTION_MAP),
  ...flatten(ISCAR_THREAD_MILL_MAP),
];
