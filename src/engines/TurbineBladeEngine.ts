/**
 * TurbineBladeEngine — Gas/steam turbine blade stress and cooling analysis
 *
 * Models: Centrifugal stress σ = ρω²∫r·dA, Larson-Miller creep parameter,
 *         blade cooling effectiveness ε = (Tg-Tm)/(Tg-Tc), vibration modes
 * References: Rolls-Royce "The Jet Engine", NASA SP-36 turbine design
 * Safety: Creep life, blade tip clearance, resonance avoidance
 */

// ─── Types ─────────────────────────────────────────────────────────

export type BladeMaterial = "inconel_718" | "inconel_738" | "cmsx_4" | "mar_m247" | "ti_6al_4v" | "steel_422";
export type CoolingType = "convection" | "film" | "transpiration" | "uncooled";

export interface TurbineBladeInput {
  blade_length_mm: number;
  root_radius_mm: number;
  blade_area_mm2: number;                    // cross-section area
  rotational_speed_rpm: number;
  gas_temp_C: number;                        // turbine inlet temp
  coolant_temp_C?: number;                   // default 400°C
  blade_material?: BladeMaterial;            // default inconel_718
  cooling_type?: CoolingType;                // default film
  design_life_hours?: number;                // default 25000
  number_of_blades?: number;                 // default 60
}

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

export interface TurbineBladeResult {
  centrifugal_stress_MPa: AtomicValue;
  metal_temp_C: AtomicValue;
  cooling_effectiveness: AtomicValue;
  creep_life_hours: AtomicValue;
  larson_miller_param: AtomicValue;
  blade_tip_speed_m_s: AtomicValue;
  first_natural_freq_Hz: AtomicValue;
  safety_factor: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Reference Data ────────────────────────────────────────────────

const MATERIAL_PROPS: Record<BladeMaterial, { density: number; uts_at_temp: number; E_GPa: number; max_temp_C: number; lmp_c: number }> = {
  inconel_718:   { density: 8190, uts_at_temp: 800, E_GPa: 200, max_temp_C: 650, lmp_c: 20 },
  inconel_738:   { density: 8110, uts_at_temp: 750, E_GPa: 197, max_temp_C: 980, lmp_c: 20 },
  cmsx_4:        { density: 8700, uts_at_temp: 900, E_GPa: 130, max_temp_C: 1050, lmp_c: 20 },
  mar_m247:      { density: 8530, uts_at_temp: 830, E_GPa: 200, max_temp_C: 1010, lmp_c: 20 },
  ti_6al_4v:     { density: 4430, uts_at_temp: 400, E_GPa: 114, max_temp_C: 400, lmp_c: 20 },
  steel_422:     { density: 7800, uts_at_temp: 500, E_GPa: 200, max_temp_C: 550, lmp_c: 20 },
};

const COOLING_EFF: Record<CoolingType, number> = {
  uncooled: 0,
  convection: 0.35,
  film: 0.55,
  transpiration: 0.75,
};

// ─── Engine ────────────────────────────────────────────────────────

function mkAv(value: number, unit: string, unc: number, source: string, warning?: string): AtomicValue {
  return { value, unit, uncertainty: unc, source, warning };
}

export class TurbineBladeEngine {
  calculate(input: TurbineBladeInput): TurbineBladeResult {
    const {
      blade_length_mm: L,
      root_radius_mm: Rroot,
      blade_area_mm2: A,
      rotational_speed_rpm: rpm,
      gas_temp_C: Tg,
      coolant_temp_C: Tc = 400,
      blade_material: mat = "inconel_718",
      cooling_type: cool = "film",
      design_life_hours: designLife = 25000,
      number_of_blades: nBlades = 60,
    } = input;

    const recs: string[] = [];
    const props = MATERIAL_PROPS[mat];
    const omega = 2 * Math.PI * rpm / 60;

    // Blade tip radius
    const Rtip = Rroot + L;

    // Centrifugal stress: σ = ρω²A_blade × (R²tip - R²root) / (2×A)
    // Simplified: σ = ρ×ω²×L×(Rroot + L/2) (average radius method)
    const Ravg = (Rroot + Rtip) / 2;
    const sigma = props.density * omega * omega * (L / 1000) * (Ravg / 1000) / 1e6; // MPa

    // Blade tip speed
    const tipSpeed = omega * Rtip / 1000; // m/s

    // Cooling effectiveness → metal temperature
    const coolEff = COOLING_EFF[cool];
    const Tm = Tg - coolEff * (Tg - Tc);

    // Larson-Miller parameter: LMP = T(K) × (C + log10(t))
    // Solve for creep life at metal temp
    const Tm_K = Tm + 273.15;
    // Use UTS at temp as reference stress, adjust for actual stress
    const stressRatio = props.uts_at_temp / Math.max(sigma, 1);
    // LMP at rupture for reference: LMP_ref = T_max(K) × (C + log10(design_life))
    const lmpRef = (props.max_temp_C + 273.15) * (props.lmp_c + Math.log10(designLife));
    // Actual LMP: solve t from LMP = Tm_K × (C + log10(t)) = lmpRef × (sigma_ref/sigma)
    const lmpActual = lmpRef * Math.pow(stressRatio, 0.15);
    const log10Life = lmpActual / Tm_K - props.lmp_c;
    const creepLife = Math.pow(10, Math.min(log10Life, 7)); // cap at 10M hours

    // First natural frequency (cantilever beam): f1 = (1.875²/2π) × √(EI/(ρAL⁴))
    // Simplified with I ≈ A×t²/12, use characteristic thickness
    const t_char = Math.sqrt(A); // characteristic dimension
    const I_approx = A * t_char * t_char / 12; // mm⁴
    const f1 = (1.875 * 1.875 / (2 * Math.PI)) * Math.sqrt(
      (props.E_GPa * 1e3 * I_approx) / (props.density / 1e9 * A * Math.pow(L, 4))
    );

    // Safety factor
    const sf = props.uts_at_temp / Math.max(sigma, 1);

    const isSafe = sf >= 1.5 && Tm < props.max_temp_C && creepLife > designLife;

    if (sf < 2.0) {
      recs.push(`Low safety factor ${sf.toFixed(2)} — consider stronger material or larger cross-section`);
    }
    if (Tm > props.max_temp_C) {
      recs.push(`Metal temperature ${Tm.toFixed(0)}°C exceeds ${mat} limit ${props.max_temp_C}°C — upgrade cooling or material`);
    }
    if (creepLife < designLife * 1.5) {
      recs.push(`Creep life ${creepLife.toFixed(0)}h marginal vs ${designLife}h design — consider material upgrade`);
    }
    if (tipSpeed > 500) {
      recs.push(`High tip speed ${tipSpeed.toFixed(0)}m/s — verify containment and disk burst margins`);
    }
    // Check resonance with nBlades excitation
    const excitFreq = nBlades * rpm / 60;
    if (Math.abs(f1 - excitFreq) / excitFreq < 0.15) {
      recs.push(`RESONANCE RISK: 1st natural freq ${f1.toFixed(0)}Hz near ${nBlades}×N excitation ${excitFreq.toFixed(0)}Hz`);
    }
    if (recs.length === 0) {
      recs.push(`Blade design nominal — SF=${sf.toFixed(1)}, Tm=${Tm.toFixed(0)}°C, creep life ${creepLife.toFixed(0)}h`);
    }

    return {
      centrifugal_stress_MPa: mkAv(Math.round(sigma * 10) / 10, "MPa", sigma * 0.10, "centrifugal_model"),
      metal_temp_C: mkAv(Math.round(Tm), "°C", Tm * 0.05, "cooling_effectiveness"),
      cooling_effectiveness: mkAv(Math.round(coolEff * 100) / 100, "ratio", coolEff * 0.10, "cooling_type_ref"),
      creep_life_hours: mkAv(Math.round(creepLife), "h", creepLife * 0.30, "larson_miller"),
      larson_miller_param: mkAv(Math.round(lmpActual), "K", lmpActual * 0.05, "lmp_formula"),
      blade_tip_speed_m_s: mkAv(Math.round(tipSpeed * 10) / 10, "m/s", tipSpeed * 0.02, "kinematics"),
      first_natural_freq_Hz: mkAv(Math.round(f1), "Hz", f1 * 0.15, "cantilever_beam"),
      safety_factor: mkAv(Math.round(sf * 100) / 100, "ratio", sf * 0.10, "stress_strength"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const turbineBladeEngine = new TurbineBladeEngine();
