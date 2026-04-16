/**
 * ThermalSprayEngine — Thermal spray coating process analysis
 *
 * Models: Particle velocity/temperature, deposition efficiency,
 *         coating adhesion, porosity, oxide content, residual stress
 * References: Pawlowski, ASM Handbook Vol.5A, ISO 14919, AWS C2.16
 */

export type SprayMethod = "APS" | "HVOF" | "HVAF" | "cold_spray" | "wire_arc" | "detonation" | "flame";
export type CoatingMaterial = "WC_Co" | "Cr2O3" | "Al2O3" | "MCrAlY" | "NiCr" | "Cu" | "Zn" | "stellite";

export interface ThermalSprayInput {
  method?: SprayMethod;
  coating?: CoatingMaterial;
  target_thickness_um?: number;
  spray_distance_mm?: number;
  traverse_speed_mm_s?: number;
  substrate_preheat_C?: number;
  gas_flow_SLPM?: number;
  power_kW?: number;
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ThermalSprayResult {
  particle_velocity_m_s: AtomicValue;
  particle_temp_C: AtomicValue;
  deposition_efficiency_pct: AtomicValue;
  porosity_pct: AtomicValue;
  oxide_content_pct: AtomicValue;
  bond_strength_MPa: AtomicValue;
  coating_hardness_HV: AtomicValue;
  spray_rate_kg_h: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Method: [velocity_m/s, flame_temp_C, dep_eff_pct, porosity_pct, oxide_pct]
const METHOD_DATA: Record<SprayMethod, [number, number, number, number, number]> = {
  APS:         [200,  12000, 50, 5,  3],
  HVOF:        [600,  3000,  65, 1,  0.5],
  HVAF:        [700,  2000,  70, 0.5, 0.2],
  cold_spray:  [800,  100,   80, 0.3, 0.05],
  wire_arc:    [150,  5000,  55, 8,  5],
  detonation:  [900,  4000,  75, 0.5, 0.3],
  flame:       [100,  3000,  40, 10, 8],
};

// Coating: [Tmelt_C, density_g/cm3, hardness_HV, bond_base_MPa]
const COAT_DATA: Record<CoatingMaterial, [number, number, number, number]> = {
  WC_Co:   [2800, 14.5, 1200, 70],
  Cr2O3:   [2435, 5.2,  1800, 35],
  Al2O3:   [2072, 3.95, 1400, 30],
  MCrAlY:  [1400, 7.5,  350,  50],
  NiCr:    [1400, 8.2,  250,  45],
  Cu:      [1085, 8.9,  100,  25],
  Zn:      [420,  7.1,  50,   15],
  stellite:[1300, 8.4,  600,  55],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class ThermalSprayEngine {
  calculate(input: ThermalSprayInput): ThermalSprayResult {
    const {
      method = "HVOF",
      coating = "WC_Co",
      target_thickness_um: tTarget = 300,
      spray_distance_mm: dist = 300,
      traverse_speed_mm_s: trav = 500,
      substrate_preheat_C: preheat = 80,
      power_kW: power = 40,
    } = input;

    const recs: string[] = [];
    const [baseVel, flameTemp, depEff, basePorosity, baseOxide] = METHOD_DATA[method];
    const [Tmelt, rhoCoat, baseHardness, bondBase] = COAT_DATA[coating];

    // Particle velocity (scales with power for plasma/HVOF)
    const velMod = power / 40;
    const particleVel = baseVel * Math.sqrt(velMod);

    // Particle temperature
    const particleTemp = Math.min(Tmelt * 0.95, flameTemp * 0.4 * (1 + power / 100));

    // Deposition efficiency (distance effect)
    const optDist = method === "cold_spray" ? 30 : method === "HVOF" ? 300 : 120;
    const distPenalty = 1 - Math.abs(dist - optDist) / (optDist * 3 + 1);
    const efficiency = depEff * Math.max(0.3, distPenalty);

    // Porosity
    const porosity = basePorosity * (1 + (dist - optDist) / 500);

    // Oxide content
    const oxideContent = baseOxide * (method === "cold_spray" ? 0.1 : 1);

    // Bond strength
    const preheatMod = 1 + (preheat - 25) / 500;
    const bondStrength = bondBase * preheatMod * Math.pow(particleVel / 300, 0.5);

    // Hardness
    const hardness = baseHardness * (1 - porosity / 100);

    // Spray rate
    const feedRate = power / 40 * 3; // kg/h rough
    const sprayRate = feedRate * efficiency / 100;

    const isSafe = porosity < 15 && bondStrength > 10 && efficiency > 20;

    if (method === "cold_spray" && Tmelt > 2000) recs.push(coating + " too refractory for cold spray — use HVOF");
    if (porosity > 5) recs.push("High porosity " + porosity.toFixed(1) + "% — optimize distance and velocity");
    if (oxideContent > 3) recs.push("High oxide " + oxideContent.toFixed(1) + "% — use inert shroud or HVAF");
    if (dist > optDist * 1.5) recs.push("Spray distance " + dist + "mm too far — particles cool, poor bonding");
    if (tTarget > 500 && method !== "HVOF" && method !== "APS") recs.push("Thick coating " + tTarget + "um — stress buildup, consider intermediate layers");
    if (recs.length === 0) recs.push("Thermal spray nominal — v=" + particleVel.toFixed(0) + "m/s, DE=" + efficiency.toFixed(0) + "%, porosity " + porosity.toFixed(1) + "%");

    return {
      particle_velocity_m_s: mkAv(Math.round(particleVel), "m/s", particleVel * 0.10, "method_power"),
      particle_temp_C: mkAv(Math.round(particleTemp), "C", particleTemp * 0.15, "flame_power"),
      deposition_efficiency_pct: mkAv(Math.round(efficiency * 10) / 10, "%", efficiency * 0.10, "method_dist"),
      porosity_pct: mkAv(Math.round(porosity * 100) / 100, "%", porosity * 0.20, "vel_dist"),
      oxide_content_pct: mkAv(Math.round(oxideContent * 100) / 100, "%", oxideContent * 0.25, "method"),
      bond_strength_MPa: mkAv(Math.round(bondStrength * 10) / 10, "MPa", bondStrength * 0.15, "vel_preheat"),
      coating_hardness_HV: mkAv(Math.round(hardness), "HV", hardness * 0.10, "material_porosity"),
      spray_rate_kg_h: mkAv(Math.round(sprayRate * 100) / 100, "kg/h", sprayRate * 0.15, "feed_DE"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const thermalSprayEngine = new ThermalSprayEngine();
