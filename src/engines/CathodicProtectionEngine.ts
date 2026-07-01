/**
 * CathodicProtectionEngine — Cathodic protection system design
 *
 * Models: Galvanic anode sizing, impressed current (ICCP),
 *         current density requirements, anode life
 * References: NACE SP0169, DNV-RP-B401, NACE TM0497
 */

export type ProtectionType = "galvanic" | "iccp";
export type AnodeMaterial = "zinc" | "magnesium" | "aluminum" | "MMO" | "silicon_iron";
export type Environment = "seawater" | "soil" | "freshwater" | "concrete";

export interface CathodicProtectionInput {
  surface_area_m2: number;
  protection_type?: ProtectionType;
  environment?: Environment;
  design_life_years?: number;           // default 20
  anode_material?: AnodeMaterial;       // default zinc
  coating_breakdown_factor?: number;    // 0-1, default 0.1
  soil_resistivity_ohm_m?: number;      // default 50 (for soil)
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface CathodicProtectionResult {
  current_required_A: AtomicValue;
  current_density_mA_m2: AtomicValue;
  anode_mass_kg: AtomicValue;
  num_anodes: AtomicValue;
  anode_life_years: AtomicValue;
  driving_voltage_V: AtomicValue;
  anode_resistance_ohm: AtomicValue;
  protection_potential_mV: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Current density requirements mA/m² [initial, mean, final]
const CD_REQ: Record<Environment, [number, number, number]> = {
  seawater:   [150, 70, 90],
  soil:       [20, 10, 15],
  freshwater: [50, 25, 35],
  concrete:   [10, 5, 8],
};

// Anode properties: [capacity_Ah_kg, potential_mV_vs_AgCl, density_kg_m3, consumption_kg_A_year]
const ANODE_PROPS: Record<AnodeMaterial, [number, number, number, number]> = {
  zinc:         [780, -1050, 7130, 11.2],
  magnesium:    [1230, -1550, 1740, 7.1],
  aluminum:     [2700, -1100, 2700, 3.2],
  MMO:          [500000, -1100, 4500, 0.001],    // impressed current
  silicon_iron: [50, -300, 7000, 0.5],            // impressed current
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class CathodicProtectionEngine {
  calculate(input: CathodicProtectionInput): CathodicProtectionResult {
    const {
      surface_area_m2: A,
      protection_type = "galvanic",
      environment = "seawater",
      design_life_years: life = 20,
      anode_material = protection_type === "iccp" ? "MMO" : "zinc",
      coating_breakdown_factor: fc = 0.1,
      soil_resistivity_ohm_m: rhoS = 50,
    } = input;

    const recs: string[] = [];
    const [cdInit, cdMean, cdFinal] = CD_REQ[environment];
    const [cap, potential, anodeDensity, consumption] = ANODE_PROPS[anode_material];

    // Required current
    const iMean = cdMean * A * fc / 1000; // A (mean over life)
    const iInit = cdInit * A * fc / 1000; // A (initial)

    // Anode mass required
    const totalCharge = iMean * life * 8760; // A·h
    const anodeMass = totalCharge / cap * 1.1; // kg (10% utilization factor)

    // Individual anode sizing (typical shapes)
    const anodeUnit = protection_type === "galvanic"
      ? (anode_material === "magnesium" ? 15 : 25) // kg per anode
      : 1; // ICCP anodes are small
    const numAnodes = Math.ceil(anodeMass / anodeUnit);

    // Anode life check
    const actualLife = (numAnodes * anodeUnit * cap) / (iMean * 8760);

    // Driving voltage
    const structurePotential = -650; // mV vs Ag/AgCl (protected steel)
    const drivingV = Math.abs(potential - structurePotential) / 1000; // V

    // Anode resistance (simplified Dwight for vertical anode in soil/seawater)
    const resistivity = environment === "seawater" ? 0.25 : rhoS;
    const anodeLen = 1.0; // m (typical)
    const anodeR = resistivity / (2 * Math.PI * anodeLen) *
      (Math.log(4 * anodeLen / 0.1) - 1); // ohm per anode
    const totalR = anodeR / Math.max(numAnodes, 1);

    const isSafe = actualLife >= life && drivingV > 0.1;

    if (actualLife < life) recs.push(`Anode life ${actualLife.toFixed(1)}yr < design ${life}yr — add more anodes`);
    if (protection_type === "galvanic" && resistivity > 100) recs.push(`High resistivity ${resistivity}Ω·m — consider ICCP`);
    if (fc > 0.5) recs.push(`High coating breakdown ${(fc * 100).toFixed(0)}% — recoat before CP install`);
    if (drivingV < 0.15) recs.push(`Low driving voltage ${(drivingV * 1000).toFixed(0)}mV — anode may not protect`);
    if (environment === "soil" && anode_material === "zinc") recs.push(`Zinc in soil — magnesium preferred for higher driving voltage`);
    if (recs.length === 0) recs.push(`CP nominal — I=${iMean.toFixed(2)}A, ${numAnodes} anodes, life=${actualLife.toFixed(1)}yr`);

    return {
      current_required_A: mkAv(Math.round(iMean * 100) / 100, "A", iMean * 0.10, "nace_sp0169"),
      current_density_mA_m2: mkAv(cdMean * fc, "mA/m²", cdMean * fc * 0.15, "dnv_rp_b401"),
      anode_mass_kg: mkAv(Math.round(anodeMass * 10) / 10, "kg", anodeMass * 0.10, "faraday"),
      num_anodes: mkAv(numAnodes, "count", 0, "sizing"),
      anode_life_years: mkAv(Math.round(actualLife * 10) / 10, "years", actualLife * 0.10, "consumption"),
      driving_voltage_V: mkAv(Math.round(drivingV * 1000) / 1000, "V", drivingV * 0.05, "potential_diff"),
      anode_resistance_ohm: mkAv(Math.round(totalR * 1000) / 1000, "ohm", totalR * 0.20, "dwight"),
      protection_potential_mV: mkAv(structurePotential, "mV_vs_AgAgCl", 20, "nace_criteria"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const cathodicProtectionEngine = new CathodicProtectionEngine();
