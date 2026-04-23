/**
 * LaserWeldingEngine — Laser beam welding process analysis
 *
 * Models: Keyhole vs conduction mode, penetration depth,
 *         power density, weld speed, HAZ, shielding gas
 * References: Steen & Mazumder, ISO 15614-11, AWS C7.2
 */

export type LaserType = "CO2" | "Nd_YAG" | "fiber" | "disk" | "diode";
export type WeldJointType = "butt" | "lap" | "fillet" | "edge" | "spot";

export interface LaserWeldingInput {
  laser?: LaserType;
  joint?: WeldJointType;
  laser_power_kW: number;
  material_thickness_mm: number;
  material?: "mild_steel" | "stainless" | "aluminum" | "titanium" | "inconel";
  focal_spot_mm?: number;            // default 0.3
  welding_speed_mm_s?: number;       // default auto
  shield_gas?: "argon" | "helium" | "nitrogen" | "CO2_mix";
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface LaserWeldingResult {
  penetration_depth_mm: AtomicValue;
  weld_width_mm: AtomicValue;
  aspect_ratio: AtomicValue;
  welding_speed_mm_s: AtomicValue;
  power_density_MW_cm2: AtomicValue;
  heat_input_J_mm: AtomicValue;
  HAZ_width_mm: AtomicValue;
  efficiency_pct: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Material: [absorptivity_1um, thermal_cond_W/mK, melt_temp_C, density_g/cm3]
const WELD_MAT: Record<string, [number, number, number, number]> = {
  mild_steel: [0.35, 50,  1500, 7.85],
  stainless:  [0.30, 15,  1450, 8.00],
  aluminum:   [0.10, 200, 660,  2.70],
  titanium:   [0.40, 20,  1670, 4.50],
  inconel:    [0.35, 11,  1350, 8.44],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class LaserWeldingEngine {
  calculate(input: LaserWeldingInput): LaserWeldingResult {
    const {
      laser = "fiber",
      joint = "butt",
      laser_power_kW: P,
      material_thickness_mm: t,
      material = "mild_steel",
      focal_spot_mm: d0 = 0.3,
      shield_gas = "argon",
    } = input;

    const recs: string[] = [];
    const [absorp, kMat, Tmelt, rho] = WELD_MAT[material];

    // Laser wavelength effect on absorptivity
    const waveMod = laser === "CO2" ? 0.7 : laser === "fiber" ? 1.0 :
      laser === "Nd_YAG" ? 0.95 : laser === "disk" ? 1.0 : 0.85;
    const absEff = Math.min(absorp * waveMod + 0.3, 0.9); // keyhole increases absorptivity

    // Power density
    const spotArea = Math.PI * Math.pow(d0 / 20, 2); // cm²
    const powerDensity = P * 1000 / spotArea / 1e6; // MW/cm²

    // Mode: keyhole if power density > 1 MW/cm²
    const isKeyhole = powerDensity > 1;

    // Penetration depth
    const penetration = isKeyhole ?
      Math.pow(P * absEff / (kMat * Tmelt / 1000 + 0.001), 0.7) * 3 : // keyhole
      Math.sqrt(P * absEff * 1000 / (Math.PI * kMat * Tmelt + 0.001)) * 5; // conduction

    // Weld width
    const weldWidth = isKeyhole ? d0 * 1.5 + penetration * 0.15 :
      d0 * 3 + penetration * 0.5;

    // Aspect ratio (depth/width)
    const aspectRatio = penetration / (weldWidth + 0.001);

    // Welding speed
    const speed = input.welding_speed_mm_s ??
      P * absEff * 1000 / (rho * 500 * Tmelt / 1500 * t * weldWidth / 1000 + 0.001);

    // Heat input
    const heatInput = P * 1000 * absEff / (speed + 0.001); // J/mm

    // HAZ
    const HAZ = Math.sqrt(kMat / (rho * 500) * heatInput / 1000) * 5;

    // Process efficiency
    const efficiency = absEff * (isKeyhole ? 0.85 : 0.60) * 100;

    const isSafe = penetration >= t * 0.8 && HAZ < 3 && powerDensity > 0.1;

    if (penetration < t) recs.push(`Partial penetration ${penetration.toFixed(1)}mm < ${t}mm — increase power or slow down`);
    if (!isKeyhole && t > 2) recs.push(`Conduction mode — keyhole needed for ${t}mm, increase power density`);
    if (material === "aluminum" && laser === "CO2") recs.push(`Low absorptivity for Al with CO₂ — use fiber laser`);
    if (speed > 100) recs.push(`High speed ${speed.toFixed(0)}mm/s — verify weld quality`);
    if (HAZ > 2) recs.push(`Wide HAZ ${HAZ.toFixed(1)}mm — reduce heat input`);
    if (recs.length === 0) recs.push(`Laser weld nominal — ${penetration.toFixed(1)}mm depth, ${speed.toFixed(0)}mm/s, HAZ=${HAZ.toFixed(1)}mm`);

    return {
      penetration_depth_mm: mkAv(Math.round(penetration * 100) / 100, "mm", penetration * 0.10, "keyhole_model"),
      weld_width_mm: mkAv(Math.round(weldWidth * 100) / 100, "mm", weldWidth * 0.15, "spot_penetration"),
      aspect_ratio: mkAv(Math.round(aspectRatio * 100) / 100, "ratio", aspectRatio * 0.10, "d_w"),
      welding_speed_mm_s: mkAv(Math.round(speed * 10) / 10, "mm/s", speed * 0.10, "energy_balance"),
      power_density_MW_cm2: mkAv(Math.round(powerDensity * 100) / 100, "MW/cm²", powerDensity * 0.05, "P_A"),
      heat_input_J_mm: mkAv(Math.round(heatInput * 10) / 10, "J/mm", heatInput * 0.10, "P_v"),
      HAZ_width_mm: mkAv(Math.round(HAZ * 100) / 100, "mm", HAZ * 0.25, "thermal_diffusion"),
      efficiency_pct: mkAv(Math.round(efficiency * 10) / 10, "%", efficiency * 0.10, "absorptivity_mode"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const laserWeldingEngine = new LaserWeldingEngine();
