/**
 * WireDrawingEngine — Wire drawing force, die design, and pass schedule
 *
 * Models: Sachs analysis (σ_draw = σ₀×(1+B/B)×ln(R)),
 *         redundant work, friction, multi-pass scheduling
 * References: Avitzur wire drawing theory, DIN 8580
 * Safety: Drawing stress vs yield, die wear, wire breakage
 */

// ─── Types ─────────────────────────────────────────────────────────

export type WireMaterial = "low_carbon_steel" | "high_carbon_steel"
  | "copper" | "aluminum" | "stainless" | "brass" | "tungsten";

export interface WireDrawingInput {
  initial_diameter_mm: number;
  final_diameter_mm: number;
  wire_material?: WireMaterial;
  die_half_angle_deg?: number;           // default 6
  friction_coefficient?: number;         // default 0.05
  drawing_speed_m_min?: number;          // default 50
  back_tension_MPa?: number;             // default 0
}

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

export interface WireDrawingResult {
  total_reduction_pct: AtomicValue;
  reduction_per_pass_pct: AtomicValue;
  number_of_passes: AtomicValue;
  drawing_stress_MPa: AtomicValue;
  drawing_force_kN: AtomicValue;
  drawing_power_kW: AtomicValue;
  die_pressure_MPa: AtomicValue;
  exit_speed_m_min: AtomicValue;
  safety_factor: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Reference Data ────────────────────────────────────────────────

const WIRE_MAT: Record<WireMaterial, {
  sigma0_MPa: number; uts_MPa: number; max_red_pct: number
}> = {
  low_carbon_steel:  { sigma0_MPa: 250, uts_MPa: 400, max_red_pct: 35 },
  high_carbon_steel: { sigma0_MPa: 500, uts_MPa: 800, max_red_pct: 25 },
  copper:            { sigma0_MPa: 150, uts_MPa: 250, max_red_pct: 40 },
  aluminum:          { sigma0_MPa: 100, uts_MPa: 180, max_red_pct: 45 },
  stainless:         { sigma0_MPa: 350, uts_MPa: 600, max_red_pct: 25 },
  brass:             { sigma0_MPa: 200, uts_MPa: 350, max_red_pct: 35 },
  tungsten:          { sigma0_MPa: 800, uts_MPa: 1500, max_red_pct: 15 },
};

// ─── Engine ────────────────────────────────────────────────────────

function mkAv(
  value: number, unit: string, unc: number,
  source: string, warning?: string
): AtomicValue {
  return { value, unit, uncertainty: unc, source, warning };
}

export class WireDrawingEngine {
  calculate(input: WireDrawingInput): WireDrawingResult {
    const {
      initial_diameter_mm: d0,
      final_diameter_mm: df,
      wire_material = "low_carbon_steel",
      die_half_angle_deg: alpha_deg = 6,
      friction_coefficient: mu = 0.05,
      drawing_speed_m_min: v = 50,
      back_tension_MPa: backT = 0,
    } = input;

    const recs: string[] = [];
    const mp = WIRE_MAT[wire_material];
    const alpha = alpha_deg * Math.PI / 180;

    // Total area reduction
    const A0 = Math.PI * d0 * d0 / 4;
    const Af = Math.PI * df * df / 4;
    const totalRed = (1 - Af / A0) * 100;

    // Number of passes (max reduction per pass)
    const maxRedPerPass = mp.max_red_pct / 100;
    const nPasses = Math.max(1, Math.ceil(
      Math.log(A0 / Af) / Math.log(1 / (1 - maxRedPerPass))
    ));
    const redPerPass = (1 - Math.pow(Af / A0, 1 / nPasses)) * 100;

    // Drawing stress (Sachs/Avitzur for single pass of average reduction)
    const B = mu / Math.tan(alpha);
    const rAvg = redPerPass / 100;
    const lnR = -Math.log(1 - rAvg);

    // σ_draw = σ₀ × (1 + B)/B × [1 - (1-r)^B] + redundant
    const drawStress = mp.sigma0_MPa
      * ((1 + B) / B) * (1 - Math.pow(1 - rAvg, B))
      + backT;
    // Redundant work factor
    const phi = 1 + 0.12 * (1 - rAvg) / rAvg;
    const actualDrawStress = drawStress * phi;

    // Drawing force (on final pass wire)
    const drawForce = actualDrawStress * Af / 1000; // kN

    // Drawing power
    const drawPower = drawForce * v / 60; // kW

    // Die pressure (approximate)
    const diePressure = actualDrawStress / (2 * mu + 1) * 1.5;

    // Exit speed (last pass)
    const exitSpeed = v * (A0 / Af);

    // Safety factor against wire breakage
    const sf = mp.uts_MPa / Math.max(actualDrawStress, 1);

    const isSafe = sf >= 1.5 && redPerPass <= mp.max_red_pct;

    if (sf < 2.0) {
      recs.push(
        `Low SF ${sf.toFixed(2)} — risk of wire breakage. `
        + `Reduce reduction per pass or anneal between passes`
      );
    }
    if (redPerPass > mp.max_red_pct) {
      recs.push(
        `Reduction ${redPerPass.toFixed(1)}% exceeds max `
        + `${mp.max_red_pct}% — add more passes`
      );
    }
    if (alpha_deg > 10) {
      recs.push(
        `Die angle ${alpha_deg}° high — increased redundant `
        + `work and central burst risk`
      );
    }
    if (alpha_deg < 4) {
      recs.push(
        `Die angle ${alpha_deg}° low — excessive friction `
        + `in die land`
      );
    }
    if (nPasses > 10) {
      recs.push(
        `${nPasses} passes needed — consider intermediate `
        + `annealing`
      );
    }
    if (recs.length === 0) {
      recs.push(
        `Wire drawing nominal — ${nPasses} passes, `
        + `${redPerPass.toFixed(1)}%/pass, SF=${sf.toFixed(1)}`
      );
    }

    return {
      total_reduction_pct: mkAv(
        Math.round(totalRed * 10) / 10, "%", 0, "area_ratio"
      ),
      reduction_per_pass_pct: mkAv(
        Math.round(redPerPass * 10) / 10, "%",
        redPerPass * 0.05, "pass_schedule"
      ),
      number_of_passes: mkAv(nPasses, "passes", 0, "pass_schedule"),
      drawing_stress_MPa: mkAv(
        Math.round(actualDrawStress * 10) / 10, "MPa",
        actualDrawStress * 0.12, "sachs_analysis"
      ),
      drawing_force_kN: mkAv(
        Math.round(drawForce * 100) / 100, "kN",
        drawForce * 0.12, "stress_area"
      ),
      drawing_power_kW: mkAv(
        Math.round(drawPower * 100) / 100, "kW",
        drawPower * 0.10, "force_velocity"
      ),
      die_pressure_MPa: mkAv(
        Math.round(diePressure * 10) / 10, "MPa",
        diePressure * 0.15, "pressure_estimate"
      ),
      exit_speed_m_min: mkAv(
        Math.round(exitSpeed * 10) / 10, "m/min",
        exitSpeed * 0.05, "continuity"
      ),
      safety_factor: mkAv(
        Math.round(sf * 100) / 100, "ratio",
        sf * 0.08, "stress_strength"
      ),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const wireDrawingEngine = new WireDrawingEngine();
