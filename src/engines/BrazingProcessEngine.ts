/**
 * BrazingProcessEngine — Brazing process analysis
 *
 * Models: Capillary flow (Washburn equation), joint clearance,
 *         filler metal selection, atmosphere requirements, thermal cycle
 * References: AWS C3.6, ISO 17672, Schwartz "Brazing"
 */

export type BrazingMethod = "torch" | "furnace" | "induction" | "dip" | "vacuum" | "resistance";
export type FillerMetal = "BAg" | "BCuP" | "BNi" | "BAu" | "BAlSi" | "BCu";

export interface BrazingProcessInput {
  method?: BrazingMethod;
  filler?: FillerMetal;
  base_metal?: "steel" | "stainless" | "copper" | "aluminum" | "titanium" | "nickel_alloy";
  joint_area_mm2?: number;           // default 100
  joint_clearance_mm?: number;       // default 0.05
  heating_rate_C_min?: number;       // default 50
  assembly_mass_kg?: number;         // default 1
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface BrazingProcessResult {
  brazing_temp_C: AtomicValue;
  flow_time_s: AtomicValue;
  filler_volume_mm3: AtomicValue;
  joint_strength_MPa: AtomicValue;
  heating_time_min: AtomicValue;
  cycle_time_min: AtomicValue;
  atmosphere: AtomicValue;
  thermal_distortion_mm: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Filler: [solidus_C, liquidus_C, flow_temp_C, UTS_MPa, surface_tension_mN/m, density_g/cm3]
const FILLER_DATA: Record<FillerMetal, [number, number, number, number, number, number]> = {
  BAg:   [620,  780,  800,  350, 900, 9.5],
  BCuP:  [640,  820,  840,  250, 800, 8.0],
  BNi:   [980, 1080, 1100,  400, 1600, 8.0],
  BAu:   [890,  990, 1010,  300, 1100, 15.5],
  BAlSi: [575,  615,  620,  150, 700, 2.7],
  BCu:   [1080, 1100, 1120,  280, 1300, 8.9],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class BrazingProcessEngine {
  calculate(input: BrazingProcessInput): BrazingProcessResult {
    const {
      method = "furnace",
      filler = "BAg",
      base_metal = "steel",
      joint_area_mm2: area = 100,
      joint_clearance_mm: clearance = 0.05,
      heating_rate_C_min: heatRate = 50,
      assembly_mass_kg: mass = 1,
    } = input;

    const recs: string[] = [];
    const [solidus, liquidus, flowTemp, UTS, gamma, rhoFiller] = FILLER_DATA[filler];

    // Brazing temperature
    const brazingTemp = flowTemp + 20;

    // Filler volume needed
    const fillerVol = area * clearance; // mm³

    // Capillary flow time (Washburn equation: L² = γRt/(2η))
    // Simplified: t ∝ L² × η / (γ × R)
    const jointLength = Math.sqrt(area); // approximate
    const viscosity = 0.005; // Pa·s (liquid metal)
    const capRadius = clearance / 2 / 1000; // m
    const flowTime = Math.pow(jointLength / 1000, 2) * viscosity / (gamma / 1000 * capRadius + 0.0001) * 0.5;

    // Heating time (from ambient to brazing temp)
    const heatingTime = (brazingTemp - 25) / heatRate;

    // Soak time at temperature
    const soakTime = mass * 2 + 3; // min (rule of thumb)

    // Total cycle time
    const coolTime = heatingTime * 0.8; // slow cooling
    const cycleTime = heatingTime + soakTime + coolTime;

    // Joint strength (lap joint)
    const jointStrength = Math.min(UTS, UTS * 0.05 / (clearance + 0.001)); // optimal at 0.05mm

    // Atmosphere requirement
    let atmosphere: string;
    if (method === "vacuum") atmosphere = "vacuum";
    else if (base_metal === "titanium" || base_metal === "nickel_alloy") atmosphere = "vacuum/argon";
    else if (filler === "BCuP" && base_metal === "copper") atmosphere = "self-fluxing";
    else atmosphere = method === "torch" ? "flux" : "H2/N2";

    // Thermal distortion estimate
    const CTE = base_metal === "aluminum" ? 23 : base_metal === "copper" ? 17 :
      base_metal === "stainless" ? 16 : base_metal === "titanium" ? 9 : 12; // ppm/K
    const distortion = CTE * 1e-6 * (brazingTemp - 25) * Math.sqrt(area) * 0.1;

    const isSafe = clearance >= 0.01 && clearance <= 0.2 && brazingTemp < 1200 && fillerVol > 0;

    if (clearance < 0.025) recs.push(`Tight clearance ${clearance}mm — capillary flow may be insufficient`);
    if (clearance > 0.15) recs.push(`Wide clearance ${clearance}mm — weak joint, filler may not bridge`);
    if (filler === "BCuP" && base_metal !== "copper") recs.push(`BCuP is self-fluxing on copper only — use flux or different filler on ${base_metal}`);
    if (base_metal === "aluminum" && filler !== "BAlSi") recs.push(`Aluminum brazing requires BAlSi filler — ${filler} incompatible`);
    if (base_metal === "titanium" && method !== "vacuum") recs.push(`Titanium requires vacuum brazing — ${method} causes embrittlement`);
    if (recs.length === 0) recs.push(`Braze nominal — ${brazingTemp}°C, fill ${flowTime.toFixed(1)}s, ${jointStrength.toFixed(0)}MPa, ${atmosphere}`);

    return {
      brazing_temp_C: mkAv(brazingTemp, "°C", brazingTemp * 0.02, "liquidus_offset"),
      flow_time_s: mkAv(Math.round(flowTime * 100) / 100, "s", flowTime * 0.25, "Washburn"),
      filler_volume_mm3: mkAv(Math.round(fillerVol * 100) / 100, "mm³", fillerVol * 0.10, "area_clearance"),
      joint_strength_MPa: mkAv(Math.round(jointStrength * 10) / 10, "MPa", jointStrength * 0.15, "UTS_clearance"),
      heating_time_min: mkAv(Math.round(heatingTime * 10) / 10, "min", heatingTime * 0.10, "rate"),
      cycle_time_min: mkAv(Math.round(cycleTime * 10) / 10, "min", cycleTime * 0.15, "heat_soak_cool"),
      atmosphere: mkAv(atmosphere === "vacuum" ? 0 : atmosphere === "flux" ? 1 : 2, "type", 0, "method_base"),
      thermal_distortion_mm: mkAv(Math.round(distortion * 1000) / 1000, "mm", distortion * 0.25, "CTE_T_L"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const brazingProcessEngine = new BrazingProcessEngine();
