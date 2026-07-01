/**
 * LatheVendorBaseline — published vendor catalog + traditional-formula baseline (TURNING)
 * =========================================================================================
 * LATHE-STUDIO-MS0/U-LSTUD-VENDOR-BASELINE (oscar, 2026-05-25 iter28).
 *
 * Pure data module + pure comparison functions that anchor every PRISM lathe
 * calculator output against published vendor recommendations + textbook
 * formulas. Counterpart to MillVendorBaseline. Same /goal contract: "make
 * sure all data is accurate especially the cutting results since thats what
 * the user is paying for".
 *
 * Sources (NOT scraped — these are published handbook values cited by
 * CANONICAL_TAYLOR in src/physics/constants.ts + Sandvik/Kennametal/Iscar
 * catalog mid-range recommendations for general-purpose CNMG-style negative
 * carbide turning inserts):
 *
 *   • Sandvik T-Max-P CoroTurn Turning Handbook (2010+) — Vc/fr per ISO
 *   • Kennametal Turning Master Catalog (2020+) — CNMG insert grade × material
 *   • Iscar Turning Tools Reference — fr × ap envelope per insert geometry
 *   • Kalpakjian "Manufacturing Engineering" — traditional cutting-power formula
 *   • Smith "Manufacturing Processes" Ch.5 — turning surface finish Ra = fr²/(8r)
 *   • Sandvik CoroTurn application guide §3.4 — 15-20% headroom doctrine
 *
 * Turning ≠ milling — key differences encoded in this module:
 *   • Feed is per-REV (mm/rev), not per-tooth — single cutting edge engaged
 *   • RPM follows constant-surface-speed (CSS, G96) policy, not fixed RPM
 *   • Power formula is identical (Kalpakjian Eq. 22.6) — MRR drives kW
 *   • Surface finish from nose radius alone: Ra ≈ fr²/(8r) [Smith Ch.5]
 *
 * Traditional cutting-power formula (Kalpakjian Eq. 22.6):
 *   P_kW = MRR_mm³_per_min × kc_N_per_mm² / 60_000_000
 *
 * Turning MRR (Kalpakjian Eq. 23.2):
 *   MRR = Vc_mm_per_min × fr_mm_per_rev × ap_mm
 *       = Vc_m_per_min × 1000 × fr × ap   (mm³/min)
 *
 * CSS RPM (Sandvik CoroTurn §1.2):
 *   RPM = Vc_m_per_min × 1000 / (π × dia_mm)
 *
 * @module components/calculator/LatheVendorBaseline
 */

export type IsoGroup = "P" | "M" | "K" | "N" | "S" | "H";

export interface TurningWorkpoint {
  /** Mid-range cutting speed (m/min) per Sandvik/Kennametal CNMG catalog. */
  V_mid_m_min: number;
  /** Mid-range feed per rev (mm/rev) — CNMG-432 negative insert, 0.4 mm nose. */
  fr_mid_mm: number;
  /** Mid-range axial depth of cut (mm) — single-pass roughing envelope. */
  ap_mid_mm: number;
  /** Specific cutting force kc1.1 (N/mm²) — Sandvik canonical per ISO group. */
  kc_n_per_mm2: number;
  /** Expected tool life at mid-range V (min) — Taylor T=(C/V)^(1/n) per CANONICAL_TAYLOR. */
  taylor_life_min: number;
  /** Insert nose radius (mm) for the canonical CNMG-432 reference geometry. */
  nose_radius_mm: number;
}

/**
 * Inline vendor baseline table — Sandvik CoroTurn / Kennametal CNMG-style
 * negative carbide insert (CNMG-432, 0.4 mm nose), mid-range recommendations
 * per ISO group at the 25-50 mm bar-diameter operating region.
 *
 * `taylor_life_min` is computed from CANONICAL_TAYLOR (C, n) at V_mid — NOT an
 * independent vendor claim. This keeps the table self-consistent and lets the
 * test suite verify PRISM's Taylor surface matches its own canonical constants
 * when the same (V, C, n) are plugged in. V_mid + fr_mid + ap_mid are operator
 * mid-range picks per Sandvik 2010+ + Kennametal 2020+ turning catalogs.
 *
 * Notable contrasts vs MillVendorBaseline (which uses 10mm 4-flute end mill):
 *   • Lathe fr is per REV not per tooth — values nominally 2-3× mill fz_mid
 *   • Lathe ap is set by insert depth-of-cut + machine rigidity envelope —
 *     finer than mill ap because there's no axial flute length to amortize
 *   • S-group (Inconel) is even more conservative on Vc than mill because
 *     CNMG insert chip-control is less forgiving than HEM end-mill packets
 */
export const LATHE_VENDOR_BASELINE: Record<IsoGroup, TurningWorkpoint> = {
  // P-group (1045/4140 steel): Vc=200 m/min, T = (350/200)^4 = 9.38 min
  P: { V_mid_m_min: 200, fr_mid_mm: 0.30, ap_mid_mm: 2.0, kc_n_per_mm2: 1800, taylor_life_min: 9.38, nose_radius_mm: 0.4 },
  // M-group (304/316 stainless): Vc=150 m/min, T = (200/150)^5 = 4.21 min
  M: { V_mid_m_min: 150, fr_mid_mm: 0.25, ap_mid_mm: 1.5, kc_n_per_mm2: 2100, taylor_life_min: 4.21, nose_radius_mm: 0.4 },
  // K-group (gray cast iron): Vc=180 m/min, T = (250/180)^4 = 3.73 min
  K: { V_mid_m_min: 180, fr_mid_mm: 0.35, ap_mid_mm: 3.0, kc_n_per_mm2: 1100, taylor_life_min: 3.73, nose_radius_mm: 0.4 },
  // N-group (6061-T6 aluminum): Vc=400 m/min, T = (600/400)^2.5 = 2.76 min
  N: { V_mid_m_min: 400, fr_mid_mm: 0.40, ap_mid_mm: 4.0, kc_n_per_mm2: 700,  taylor_life_min: 2.76, nose_radius_mm: 0.4 },
  // S-group (Inconel 718): Vc=50 m/min, T = (150/50)^5.555 = 308.2 min
  S: { V_mid_m_min: 50,  fr_mid_mm: 0.15, ap_mid_mm: 1.0, kc_n_per_mm2: 2800, taylor_life_min: 308.2, nose_radius_mm: 0.8 },
  // H-group (D2 hardened steel): Vc=100 m/min, T = (120/100)^6.667 = 3.39 min
  H: { V_mid_m_min: 100, fr_mid_mm: 0.12, ap_mid_mm: 0.5, kc_n_per_mm2: 3200, taylor_life_min: 3.39, nose_radius_mm: 0.8 },
};

/**
 * Traditional cutting-power formula (Kalpakjian Eq. 22.6, Ch. 22).
 * Same formula as milling — power scales with MRR × specific cutting force.
 *
 *   P_kW = MRR (mm³/min) × kc (N/mm²) / 60_000_000
 */
export function traditionalLathePowerKw(mrr_mm3_per_min: number, kc_n_per_mm2: number): number {
  if (mrr_mm3_per_min <= 0 || kc_n_per_mm2 <= 0) return 0;
  return (mrr_mm3_per_min * kc_n_per_mm2) / 60_000_000;
}

/**
 * Traditional turning MRR (Kalpakjian Eq. 23.2):
 *   MRR (mm³/min) = Vc (m/min) × 1000 × fr (mm/rev) × ap (mm)
 *
 * Note: Vc converts m/min → mm/min via ×1000; then × fr × ap gives mm³/min.
 */
export function traditionalLatheMrr(
  Vc_m_min: number,
  fr_mm_per_rev: number,
  ap_mm: number,
): number {
  if (Vc_m_min <= 0 || fr_mm_per_rev <= 0 || ap_mm <= 0) return 0;
  return Vc_m_min * 1000 * fr_mm_per_rev * ap_mm;
}

/**
 * Sandvik CoroTurn CSS RPM (constant surface speed, G96 mode):
 *   RPM = Vc (m/min) × 1000 / (π × dia_mm)
 *
 * CSS is the turning default: as the tool moves toward centerline the diameter
 * shrinks and the controller automatically raises RPM to maintain Vc. G97
 * fixed-RPM mode is reserved for threading and very small diameters where
 * the rpm cap saturates.
 */
export function cssRpm(Vc_m_min: number, dia_mm: number): number {
  if (Vc_m_min <= 0 || dia_mm <= 0) return 0;
  return (Vc_m_min * 1000) / (Math.PI * dia_mm);
}

/**
 * Smith Ch.5 theoretical turning surface finish from nose radius + feed:
 *   Ra ≈ fr² / (8 × r_nose) × 1000  (µm; fr and r_nose both in mm)
 *
 * This is the line-of-cusps geometric Ra — actual surface finish is worse
 * due to BUE, vibration, runout. Vendor catalog Ra is typically 30-50%
 * higher than this theoretical value in practice. The formula is the
 * accuracy floor that the calculator must agree with at small fr; deviation
 * at large fr signals a model issue.
 */
export function theoreticalRaUm(fr_mm: number, r_nose_mm: number): number {
  if (fr_mm <= 0 || r_nose_mm <= 0) return 0;
  return ((fr_mm * fr_mm) / (8 * r_nose_mm)) * 1000;
}

/** Convert SFM (Imperial) → m/min (SI). 1 SFM ≈ 0.3048 m/min. */
export function sfmToMperMin(sfm: number): number {
  return sfm * 0.3048;
}

/** Convert m/min → SFM. */
export function mPerMinToSfm(v: number): number {
  return v / 0.3048;
}

export type ComparisonVerdict = "match" | "prism_better" | "prism_worse" | "out_of_band";

export interface LatheBaselineComparison {
  iso_group: IsoGroup;
  prism_value: number;
  baseline_value: number;
  /** Signed pct error: (prism − baseline) / baseline × 100. */
  pct_delta: number;
  /** Verdict against tolerance + better/worse axis convention. */
  verdict: ComparisonVerdict;
  /** Human-readable summary line. */
  note: string;
}

/**
 * Compare a PRISM-derived lathe value against the vendor baseline at a given axis.
 * Same semantics + verdict ladder as the mill counterpart (compareVsBaseline).
 *
 *   tolerance_pct   : ±band around baseline that counts as "match" (default 25%)
 *   higher_is_better: true for MRR, tool life; false for power, cost, Ra
 *
 *   verdict:
 *     match          : |pct_delta| ≤ 5% — calculator agrees tightly with baseline
 *     prism_better   : within tolerance + signed-delta favors PRISM
 *     prism_worse    : within tolerance + signed-delta opposes PRISM
 *     out_of_band    : |pct_delta| > tolerance — calculator disagrees materially
 */
export function compareLatheVsBaseline(
  iso_group: IsoGroup,
  prism_value: number,
  baseline_value: number,
  axis_label: string,
  higher_is_better: boolean,
  tolerance_pct: number = 25,
): LatheBaselineComparison {
  if (baseline_value === 0) {
    return {
      iso_group,
      prism_value,
      baseline_value,
      pct_delta: 0,
      verdict: "out_of_band",
      note: `${axis_label}: baseline=0, cannot compute delta`,
    };
  }
  const pct_delta = ((prism_value - baseline_value) / baseline_value) * 100;
  const within = Math.abs(pct_delta) <= tolerance_pct;
  const sign = pct_delta >= 0;
  const prismBetter = higher_is_better ? sign : !sign;

  let verdict: ComparisonVerdict;
  if (within && Math.abs(pct_delta) < 5) {
    verdict = "match";
  } else if (within) {
    verdict = prismBetter ? "prism_better" : "prism_worse";
  } else {
    verdict = "out_of_band";
  }

  return {
    iso_group,
    prism_value,
    baseline_value,
    pct_delta,
    verdict,
    note: `${axis_label}: Kienzle=${prism_value.toFixed(2)} vs vendor=${baseline_value.toFixed(2)} (${pct_delta >= 0 ? "+" : ""}${pct_delta.toFixed(1)}%)`,
  };
}
