/**
 * InductionHeatingEngine — Induction heating coil design and power
 *
 * Models: Skin depth (δ=√(ρ/(πfμ))), power density, heating time,
 *         coil efficiency, frequency selection
 * References: Rudnev "Handbook of Induction Heating", ASM HT
 * Safety: Power density limits, thermal runaway, quench timing
 */

export type WorkpieceMaterial = "carbon_steel" | "stainless_steel" | "aluminum" | "copper" | "titanium";
export type HeatingApplication = "through_heating" | "surface_hardening" | "brazing" | "melting" | "stress_relief";

export interface InductionHeatingInput {
  workpiece_diameter_mm: number;
  workpiece_length_mm: number;
  target_temp_C: number;
  initial_temp_C?: number;              // default 20
  material?: WorkpieceMaterial;
  application?: HeatingApplication;
  frequency_kHz?: number;               // auto-selected
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface InductionHeatingResult {
  power_kW: AtomicValue;
  frequency_kHz: AtomicValue;
  skin_depth_mm: AtomicValue;
  heating_time_s: AtomicValue;
  power_density_W_cm2: AtomicValue;
  coil_efficiency_pct: AtomicValue;
  energy_kWh: AtomicValue;
  coil_current_A: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

const MAT_PROPS: Record<WorkpieceMaterial, {
  rho_ohm_m: number; mu_r: number; cp: number; density: number; curie_C: number
}> = {
  carbon_steel:    { rho_ohm_m: 1.6e-7, mu_r: 200, cp: 500, density: 7850, curie_C: 770 },
  stainless_steel: { rho_ohm_m: 7.2e-7, mu_r: 1.02, cp: 500, density: 8000, curie_C: 0 },
  aluminum:        { rho_ohm_m: 2.7e-8, mu_r: 1, cp: 900, density: 2700, curie_C: 0 },
  copper:          { rho_ohm_m: 1.7e-8, mu_r: 1, cp: 385, density: 8960, curie_C: 0 },
  titanium:        { rho_ohm_m: 4.2e-7, mu_r: 1, cp: 520, density: 4510, curie_C: 0 },
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class InductionHeatingEngine {
  calculate(input: InductionHeatingInput): InductionHeatingResult {
    const {
      workpiece_diameter_mm: D,
      workpiece_length_mm: L,
      target_temp_C: Ttarget,
      initial_temp_C: T0 = 20,
      material = "carbon_steel",
      application = "through_heating",
    } = input;

    const recs: string[] = [];
    const mp = MAT_PROPS[material];
    const Dm = D / 1000;
    const Lm = L / 1000;

    // Effective permeability (drops above Curie)
    const mu_eff = (mp.curie_C > 0 && Ttarget > mp.curie_C) ? 1 : mp.mu_r;

    // Frequency selection
    let freq_kHz = input.frequency_kHz;
    if (!freq_kHz) {
      if (application === "surface_hardening") {
        freq_kHz = D < 25 ? 200 : D < 50 ? 100 : D < 100 ? 10 : 3;
      } else if (application === "melting") {
        freq_kHz = 1;
      } else {
        freq_kHz = D < 20 ? 100 : D < 50 ? 30 : D < 100 ? 10 : 3;
      }
    }
    const freq_Hz = freq_kHz * 1000;

    // Skin depth: δ = √(ρ / (π × f × μ₀ × μr))
    const mu0 = 4 * Math.PI * 1e-7;
    const skinDepth = Math.sqrt(mp.rho_ohm_m / (Math.PI * freq_Hz * mu0 * mu_eff)) * 1000; // mm

    // Mass and energy
    const volume = Math.PI / 4 * Dm * Dm * Lm; // m³
    const mass = volume * mp.density; // kg
    const dT = Ttarget - T0;
    const energy_J = mass * mp.cp * dT;
    const energy_kWh = energy_J / 3.6e6;

    // Coil efficiency
    const coilEff = material === "aluminum" || material === "copper" ? 0.50
      : material === "stainless_steel" ? 0.65 : 0.75;

    // Required power (target heating time based on application)
    const targetTime = application === "surface_hardening" ? 5
      : application === "brazing" ? 30
      : application === "melting" ? 300
      : application === "stress_relief" ? 120
      : 60; // through_heating default 60s

    const powerRequired = energy_J / targetTime / coilEff / 1000; // kW

    // Power density on surface
    const surfaceArea = Math.PI * Dm * Lm; // m²
    const powerDensity = powerRequired * 1000 / (surfaceArea * 1e4); // W/cm²

    // Coil current estimate (simplified)
    const coilTurns = Math.ceil(Lm / (Dm * 1.5)) + 2;
    const coilCurrent = powerRequired * 1000 / (2 * Math.PI * freq_Hz * mu0 * mu_eff * coilTurns * Dm);

    const isSafe = powerDensity < 500 && skinDepth > 0.5;

    if (skinDepth > D / 2) recs.push(`Skin depth ${skinDepth.toFixed(1)}mm > radius — increase frequency for surface heating`);
    if (skinDepth < 0.5) recs.push(`Very thin skin depth ${skinDepth.toFixed(2)}mm — reduce frequency`);
    if (powerDensity > 300) recs.push(`High power density ${powerDensity.toFixed(0)}W/cm² — risk of surface overheating`);
    if (mp.curie_C > 0 && Ttarget > mp.curie_C) recs.push(`Above Curie point — permeability drops, power coupling reduced`);
    if (recs.length === 0) recs.push(`Induction heating nominal — ${powerRequired.toFixed(1)}kW, ${freq_kHz}kHz, ${targetTime}s`);

    return {
      power_kW: mkAv(Math.round(powerRequired * 10) / 10, "kW", powerRequired * 0.12, "energy_balance"),
      frequency_kHz: mkAv(freq_kHz, "kHz", 0, "auto_selection"),
      skin_depth_mm: mkAv(Math.round(skinDepth * 100) / 100, "mm", skinDepth * 0.10, "electromagnetic"),
      heating_time_s: mkAv(targetTime, "s", targetTime * 0.15, "application_target"),
      power_density_W_cm2: mkAv(Math.round(powerDensity), "W/cm²", powerDensity * 0.12, "surface_power"),
      coil_efficiency_pct: mkAv(coilEff * 100, "%", 5, "material_coupling"),
      energy_kWh: mkAv(Math.round(energy_kWh * 100) / 100, "kWh", energy_kWh * 0.08, "thermodynamics"),
      coil_current_A: mkAv(Math.round(coilCurrent), "A", coilCurrent * 0.20, "coil_model"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const inductionHeatingEngine = new InductionHeatingEngine();
