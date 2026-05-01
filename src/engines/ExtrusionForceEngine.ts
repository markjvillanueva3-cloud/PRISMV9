/**
 * ExtrusionForceEngine — Metal extrusion force, pressure, and power analysis
 *
 * Models: Johnson's upper bound (F = A₀×σ₀×ln(R)×Q), extrusion ratio,
 *         billet temperature management, die angle optimization
 * References: ASM Metals Handbook Vol.14, Avitzur extrusion analysis
 * Safety: Press capacity, billet temperature, die stress
 */

// ─── Types ─────────────────────────────────────────────────────────

export type ExtrusionMaterial = "aluminum_6061" | "aluminum_7075" | "copper" | "brass" | "steel_1020" | "titanium" | "magnesium";
export type ExtrusionType = "direct" | "indirect" | "hydrostatic" | "impact";

export interface ExtrusionForceInput {
  billet_diameter_mm: number;
  product_diameter_mm: number;              // or equivalent circle diameter
  billet_length_mm?: number;                // default 300
  material?: ExtrusionMaterial;             // default aluminum_6061
  extrusion_type?: ExtrusionType;           // default direct
  die_angle_deg?: number;                   // half-angle, default 45
  billet_temp_C?: number;                   // default material-dependent
  ram_speed_mm_s?: number;                  // default 10
  friction_coefficient?: number;            // default 0.15 (direct) or 0 (hydrostatic)
}

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

export interface ExtrusionForceResult {
  extrusion_ratio: AtomicValue;
  extrusion_force_kN: AtomicValue;
  specific_pressure_MPa: AtomicValue;
  ram_power_kW: AtomicValue;
  exit_speed_mm_s: AtomicValue;
  strain: AtomicValue;
  strain_rate_per_s: AtomicValue;
  die_pressure_MPa: AtomicValue;
  friction_force_kN: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Reference Data ────────────────────────────────────────────────

const MATERIAL_PROPS: Record<ExtrusionMaterial, { flow_stress_MPa: number; default_temp_C: number; max_temp_C: number; max_ratio: number }> = {
  aluminum_6061:  { flow_stress_MPa: 25, default_temp_C: 480, max_temp_C: 540, max_ratio: 100 },
  aluminum_7075:  { flow_stress_MPa: 50, default_temp_C: 400, max_temp_C: 480, max_ratio: 40 },
  copper:         { flow_stress_MPa: 80, default_temp_C: 850, max_temp_C: 950, max_ratio: 60 },
  brass:          { flow_stress_MPa: 60, default_temp_C: 700, max_temp_C: 800, max_ratio: 80 },
  steel_1020:     { flow_stress_MPa: 120, default_temp_C: 1100, max_temp_C: 1250, max_ratio: 20 },
  titanium:       { flow_stress_MPa: 180, default_temp_C: 950, max_temp_C: 1050, max_ratio: 15 },
  magnesium:      { flow_stress_MPa: 20, default_temp_C: 380, max_temp_C: 450, max_ratio: 50 },
};

// ─── Engine ────────────────────────────────────────────────────────

function mkAv(value: number, unit: string, unc: number, source: string, warning?: string): AtomicValue {
  return { value, unit, uncertainty: unc, source, warning };
}

export class ExtrusionForceEngine {
  calculate(input: ExtrusionForceInput): ExtrusionForceResult {
    const {
      billet_diameter_mm: D0,
      product_diameter_mm: Df,
      billet_length_mm: L0 = 300,
      material = "aluminum_6061",
      extrusion_type: etype = "direct",
      die_angle_deg: alpha_deg = 45,
      ram_speed_mm_s: vRam = 10,
      friction_coefficient: muInput,
    } = input;

    const recs: string[] = [];
    const mp = MATERIAL_PROPS[material];
    const billetTemp = input.billet_temp_C ?? mp.default_temp_C;
    const alpha = (alpha_deg * Math.PI) / 180;

    // Areas
    const A0 = Math.PI * D0 * D0 / 4;
    const Af = Math.PI * Df * Df / 4;

    // Extrusion ratio
    const R = A0 / Af;

    // True strain
    const epsilon = Math.log(R);

    // Flow stress (temperature-adjusted)
    const tempFactor = 1 - 0.5 * ((billetTemp - mp.default_temp_C) / mp.default_temp_C);
    const sigma0 = mp.flow_stress_MPa * Math.max(tempFactor, 0.3);

    // Friction
    let mu = muInput ?? (etype === "hydrostatic" ? 0.01 : etype === "indirect" ? 0.05 : 0.15);

    // Ideal extrusion force: F_ideal = A0 × σ0 × ln(R)
    const F_ideal = A0 * sigma0 * epsilon / 1000; // kN

    // Friction force (container friction for direct extrusion)
    let F_friction = 0;
    if (etype === "direct") {
      // F_fric = μ × σ0 × π × D0 × L0
      F_friction = mu * sigma0 * Math.PI * D0 * L0 / 1000; // kN (average, decreases as billet shortens)
      F_friction *= 0.5; // average over stroke
    }

    // Redundant work factor (die angle effect)
    const redundantFactor = 1 + 2 * alpha / (3 * Math.PI) * (1 / Math.sin(alpha));
    const Q_factor = Math.min(redundantFactor, 2.0);

    // Total force
    const F_total = (F_ideal * Q_factor + F_friction);

    // Specific pressure
    const specificPressure = F_total * 1000 / A0;

    // Exit speed
    const vExit = vRam * R;

    // Strain rate
    const deformZone = (D0 - Df) / (2 * Math.tan(alpha));
    const strainRate = vRam * epsilon / Math.max(deformZone, 1);

    // Ram power
    const ramPower = F_total * vRam / 1000; // kW

    // Die pressure
    const diePressure = F_ideal * Q_factor * 1000 / Af;

    const isSafe = R <= mp.max_ratio && billetTemp <= mp.max_temp_C && specificPressure < 2000;

    if (R > mp.max_ratio * 0.8) {
      recs.push(`Extrusion ratio ${R.toFixed(1)} near limit ${mp.max_ratio} for ${material} — risk of surface defects`);
    }
    if (billetTemp > mp.max_temp_C) {
      recs.push(`Billet temp ${billetTemp}°C exceeds max ${mp.max_temp_C}°C — risk of incipient melting`);
    }
    if (alpha_deg > 60) {
      recs.push(`Die half-angle ${alpha_deg}° excessive — high dead zone and redundant work`);
    }
    if (alpha_deg < 20) {
      recs.push(`Die half-angle ${alpha_deg}° too shallow — excessive friction in die land`);
    }
    if (etype === "direct" && R > 30) {
      recs.push(`High ratio ${R.toFixed(0)} with direct extrusion — consider indirect to reduce friction`);
    }
    if (recs.length === 0) {
      recs.push(`Extrusion nominal — R=${R.toFixed(1)}, ${F_total.toFixed(0)}kN, ${ramPower.toFixed(1)}kW`);
    }

    return {
      extrusion_ratio: mkAv(Math.round(R * 100) / 100, "ratio", 0, "area_ratio"),
      extrusion_force_kN: mkAv(Math.round(F_total * 10) / 10, "kN", F_total * 0.12, "upper_bound"),
      specific_pressure_MPa: mkAv(Math.round(specificPressure * 10) / 10, "MPa", specificPressure * 0.12, "force_area"),
      ram_power_kW: mkAv(Math.round(ramPower * 100) / 100, "kW", ramPower * 0.10, "force_velocity"),
      exit_speed_mm_s: mkAv(Math.round(vExit * 10) / 10, "mm/s", vExit * 0.05, "continuity"),
      strain: mkAv(Math.round(epsilon * 1000) / 1000, "true_strain", epsilon * 0.03, "ln_ratio"),
      strain_rate_per_s: mkAv(Math.round(strainRate * 100) / 100, "1/s", strainRate * 0.20, "velocity_gradient"),
      die_pressure_MPa: mkAv(Math.round(diePressure * 10) / 10, "MPa", diePressure * 0.15, "force_exit_area"),
      friction_force_kN: mkAv(Math.round(F_friction * 10) / 10, "kN", F_friction * 0.20, "coulomb_friction"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const extrusionForceEngine = new ExtrusionForceEngine();
