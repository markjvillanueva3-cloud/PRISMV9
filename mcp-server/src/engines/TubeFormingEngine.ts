/**
 * TubeFormingEngine — Tube bending force, springback, and wall thinning
 *
 * Models: Mandrel bending (M = σ₀×Z×CLR/D), springback angle,
 *         wall thinning on extrados, ovality, minimum bend radius
 * References: Tube & Pipe Bending (Benson), SAE J513
 * Safety: Wall thinning limits, ovality limits, minimum CLR
 */

// ─── Types ─────────────────────────────────────────────────────────

export type TubeMaterial = "mild_steel" | "stainless_304" | "aluminum_6061"
  | "copper" | "titanium" | "inconel";
export type BendMethod = "rotary_draw" | "press_brake" | "roll_bending"
  | "mandrel" | "compression";

export interface TubeFormingInput {
  outer_diameter_mm: number;
  wall_thickness_mm: number;
  bend_radius_mm: number;              // centerline radius (CLR)
  bend_angle_deg: number;
  tube_material?: TubeMaterial;
  bend_method?: BendMethod;
  mandrel?: boolean;                   // default true for tight bends
  num_bends?: number;                  // default 1
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface TubeFormingResult {
  bending_force_kN: AtomicValue;
  springback_angle_deg: AtomicValue;
  wall_thinning_pct: AtomicValue;
  min_wall_mm: AtomicValue;
  ovality_pct: AtomicValue;
  d_ratio: AtomicValue;
  elongation_pct: AtomicValue;
  net_bend_angle_deg: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Reference Data ────────────────────────────────────────────────

const MAT: Record<TubeMaterial, {
  ys_MPa: number; E_GPa: number; n: number; elong_pct: number
}> = {
  mild_steel:    { ys_MPa: 250, E_GPa: 207, n: 0.22, elong_pct: 30 },
  stainless_304: { ys_MPa: 290, E_GPa: 193, n: 0.45, elong_pct: 40 },
  aluminum_6061: { ys_MPa: 240, E_GPa: 69,  n: 0.12, elong_pct: 12 },
  copper:        { ys_MPa: 120, E_GPa: 117, n: 0.35, elong_pct: 35 },
  titanium:      { ys_MPa: 880, E_GPa: 114, n: 0.10, elong_pct: 10 },
  inconel:       { ys_MPa: 450, E_GPa: 205, n: 0.30, elong_pct: 15 },
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class TubeFormingEngine {
  calculate(input: TubeFormingInput): TubeFormingResult {
    const {
      outer_diameter_mm: OD,
      wall_thickness_mm: t,
      bend_radius_mm: CLR,
      bend_angle_deg: angle,
      tube_material = "mild_steel",
      bend_method = "rotary_draw",
      mandrel: useMandrel,
      num_bends = 1,
    } = input;

    const recs: string[] = [];
    const mp = MAT[tube_material];
    const ID = OD - 2 * t;
    const dRatio = CLR / OD;

    // Wall thinning on extrados: t_min ≈ t × (1 - OD/(4×CLR))
    const thinFactor = 1 - OD / (4 * CLR);
    const tMin = t * Math.max(thinFactor, 0.5);
    const wallThinPct = (1 - tMin / t) * 100;

    // Ovality: δ = (D_max - D_min)/D × 100 ≈ OD/(4×CLR/OD)² %
    let ovality = (OD * OD) / (4 * CLR * CLR) * 100;
    if (useMandrel !== false && dRatio < 3) ovality *= 0.3; // mandrel reduces ovality

    // Bending force: F = (σ_y × Z) / CLR × K
    // Z = π/4 × (OD⁴ - ID⁴) / (2×OD) section modulus (simplified)
    const Z = Math.PI / 32 * (Math.pow(OD, 3) - Math.pow(ID, 3));
    const K = bend_method === "mandrel" ? 1.2 : bend_method === "press_brake" ? 0.8 : 1.0;
    const bendForce = mp.ys_MPa * Z / (CLR * 1000) * K; // kN

    // Springback: Δθ ≈ θ × (σ_y × CLR) / (E × t × 500)
    const springback = angle * (mp.ys_MPa * CLR) / (mp.E_GPa * 1000 * t * 500);
    const netAngle = angle + springback; // overbend needed

    // Elongation on extrados
    const elongation = (OD / (2 * CLR)) * 100 / 2;

    const needsMandrel = dRatio < 3 || t / OD < 0.05;
    const isSafe = wallThinPct < 25 && ovality < 8 && elongation < mp.elong_pct * 0.8;

    if (dRatio < 1.5) {
      recs.push(`Very tight bend D-ratio ${dRatio.toFixed(1)} — risk of collapse/wrinkling`);
    }
    if (wallThinPct > 20) {
      recs.push(`Wall thinning ${wallThinPct.toFixed(1)}% exceeds 20% — increase CLR or wall thickness`);
    }
    if (ovality > 5) {
      recs.push(`Ovality ${ovality.toFixed(1)}% — use mandrel and wiper die`);
    }
    if (needsMandrel && useMandrel === false) {
      recs.push(`Mandrel recommended for D-ratio ${dRatio.toFixed(1)} and t/D=${(t / OD).toFixed(3)}`);
    }
    if (springback > 3) {
      recs.push(`Springback ${springback.toFixed(1)}° — overbend to ${netAngle.toFixed(1)}°`);
    }
    if (recs.length === 0) {
      recs.push(`Tube bending nominal — CLR/D=${dRatio.toFixed(1)}, thinning ${wallThinPct.toFixed(1)}%`);
    }

    return {
      bending_force_kN: mkAv(Math.round(bendForce * 10) / 10, "kN", bendForce * 0.12, "section_modulus"),
      springback_angle_deg: mkAv(Math.round(springback * 100) / 100, "°", springback * 0.20, "elastic_recovery"),
      wall_thinning_pct: mkAv(Math.round(wallThinPct * 10) / 10, "%", wallThinPct * 0.10, "extrados_thinning"),
      min_wall_mm: mkAv(Math.round(tMin * 100) / 100, "mm", tMin * 0.08, "thinning_model"),
      ovality_pct: mkAv(Math.round(ovality * 10) / 10, "%", ovality * 0.15, "geometric_model"),
      d_ratio: mkAv(Math.round(dRatio * 100) / 100, "ratio", 0, "geometry"),
      elongation_pct: mkAv(Math.round(elongation * 10) / 10, "%", elongation * 0.05, "neutral_axis"),
      net_bend_angle_deg: mkAv(Math.round(netAngle * 10) / 10, "°", netAngle * 0.03, "springback_correction"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const tubeFormingEngine = new TubeFormingEngine();
