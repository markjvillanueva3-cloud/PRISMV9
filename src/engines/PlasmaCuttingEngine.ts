/**
 * PlasmaCuttingEngine — Thermal plasma cutting process analysis
 *
 * Models: Arc energy, kerf width, cut speed limits, HAZ,
 *         gas consumption, dross prediction, pierce time
 * References: AWS C5.2, ISO 9013, Hypertherm engineering data
 */

export type PlasmaGas = "air" | "oxygen" | "nitrogen" | "argon_H2" | "F5";
export type PlasmaMode = "conventional" | "high_definition" | "fine_feature" | "underwater";

export interface PlasmaCuttingInput {
  gas?: PlasmaGas;
  mode?: PlasmaMode;
  material_thickness_mm: number;
  material?: "mild_steel" | "stainless" | "aluminum" | "copper" | "titanium";
  amperage?: number;                  // default auto from thickness
  cutting_speed_mm_min?: number;     // default auto
  torch_standoff_mm?: number;        // default 3
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface PlasmaCuttingResult {
  cutting_speed_mm_min: AtomicValue;
  kerf_width_mm: AtomicValue;
  heat_input_kJ_mm: AtomicValue;
  HAZ_width_mm: AtomicValue;
  pierce_time_s: AtomicValue;
  gas_consumption_L_min: AtomicValue;
  power_kW: AtomicValue;
  surface_roughness_Rz_um: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Material: [thermal_cond_W/mK, melt_temp_C, density_g/cm3, cut_speed_factor]
const MAT_DATA: Record<string, [number, number, number, number]> = {
  mild_steel: [50,  1500, 7.85, 1.0],
  stainless:  [15,  1450, 8.00, 0.85],
  aluminum:   [200, 660,  2.70, 1.3],
  copper:     [390, 1085, 8.96, 0.6],
  titanium:   [20,  1670, 4.50, 0.7],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class PlasmaCuttingEngine {
  calculate(input: PlasmaCuttingInput): PlasmaCuttingResult {
    const {
      gas = "air",
      mode = "conventional",
      material_thickness_mm: t,
      material = "mild_steel",
      torch_standoff_mm: standoff = 3,
    } = input;

    const recs: string[] = [];
    const [kMat, Tmelt, rho, speedFactor] = MAT_DATA[material];

    // Auto amperage from thickness (rough: 15A per mm for mild steel)
    const amps = input.amperage ?? Math.min(t * 15, 400);

    // Arc voltage (roughly 100-160V depending on thickness)
    const arcVoltage = 100 + t * 1.5;

    // Power
    const power = amps * arcVoltage / 1000; // kW

    // Cutting speed (empirical: inversely proportional to thickness²)
    // For mild steel: ~2500mm/min at 3mm, ~500mm/min at 12mm, ~100mm/min at 50mm
    const baseSpeed = 8000 / (t + 1) * speedFactor;
    const modeMod = mode === "high_definition" ? 0.8 :
      mode === "fine_feature" ? 0.6 : mode === "underwater" ? 0.7 : 1.0;
    const speed = input.cutting_speed_mm_min ?? Math.round(baseSpeed * modeMod);

    // Kerf width (scales with amperage and standoff)
    const kerfBase = 0.5 + amps / 200 + t * 0.02;
    const kerfMod = mode === "high_definition" ? 0.7 : mode === "fine_feature" ? 0.5 : 1.0;
    const kerf = kerfBase * kerfMod;

    // Heat input
    const heatInput = power / (speed / 60 / 1000 + 0.001) / 1000; // kJ/mm

    // HAZ width (thermal diffusion)
    const HAZ = Math.sqrt(heatInput * 1000 / (rho * 500 * Tmelt / 1500 + 0.001)) * 10;

    // Pierce time
    const pierceTime = 0.1 * t + amps / 500;

    // Gas consumption
    const gasFlow = gas === "air" ? 100 :
      gas === "oxygen" ? 80 : gas === "nitrogen" ? 120 :
      gas === "argon_H2" ? 60 : 90; // L/min

    // Surface roughness (ISO 9013)
    const Rz = 10 + t * 2 + (speed > baseSpeed * 0.9 ? 20 : 0);

    const isSafe = t < 160 && amps < 500 && speed > 50;

    if (t > 50 && mode === "fine_feature") recs.push(`Thick plate ${t}mm — fine feature mode not suited, use conventional`);
    if (amps > 300) recs.push(`High amperage ${amps}A — verify torch and consumable rating`);
    if (gas === "oxygen" && (material === "stainless" || material === "aluminum")) recs.push(`O₂ not recommended for ${material} — use N₂ or Ar/H₂`);
    if (speed < 100) recs.push(`Very slow cut ${speed}mm/min — consider oxy-fuel for thick plate`);
    if (HAZ > 5) recs.push(`Wide HAZ ${HAZ.toFixed(1)}mm — may affect material properties`);
    if (recs.length === 0) recs.push(`Plasma nominal — ${speed}mm/min, kerf=${kerf.toFixed(1)}mm, ${power.toFixed(0)}kW`);

    return {
      cutting_speed_mm_min: mkAv(speed, "mm/min", speed * 0.10, "empirical"),
      kerf_width_mm: mkAv(Math.round(kerf * 100) / 100, "mm", kerf * 0.15, "amp_thickness"),
      heat_input_kJ_mm: mkAv(Math.round(heatInput * 100) / 100, "kJ/mm", heatInput * 0.10, "P_v"),
      HAZ_width_mm: mkAv(Math.round(HAZ * 10) / 10, "mm", HAZ * 0.25, "thermal_diffusion"),
      pierce_time_s: mkAv(Math.round(pierceTime * 100) / 100, "s", pierceTime * 0.20, "thickness_amp"),
      gas_consumption_L_min: mkAv(gasFlow, "L/min", gasFlow * 0.10, "gas_type"),
      power_kW: mkAv(Math.round(power * 10) / 10, "kW", power * 0.05, "IV"),
      surface_roughness_Rz_um: mkAv(Math.round(Rz), "μm", Rz * 0.20, "ISO_9013"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const plasmaCuttingEngine = new PlasmaCuttingEngine();
