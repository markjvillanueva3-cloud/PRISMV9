/**
 * CompressionMoldingEngine — Compression molding process analysis
 *
 * Models: Clamping force (projection area), flow front,
 *         cure time (Arrhenius), flash prediction, mold filling
 * References: Rosato & Rosato, ASTM D3641, ISO 295
 */

export type CMoldMaterial = "SMC" | "BMC" | "phenolic" | "melamine" | "rubber" | "UHMWPE" | "PTFE";
export type MoldAction = "positive" | "semi_positive" | "flash" | "landed_positive";

export interface CompressionMoldingInput {
  material?: CMoldMaterial;
  mold_action?: MoldAction;
  part_area_cm2?: number;            // projected area, default 200
  part_thickness_mm?: number;        // default 4
  charge_weight_g?: number;          // default auto
  mold_temp_C?: number;              // default material-dependent
  press_tonnage?: number;            // default auto
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface CompressionMoldingResult {
  clamp_force_kN: AtomicValue;
  cure_time_s: AtomicValue;
  cycle_time_s: AtomicValue;
  mold_pressure_MPa: AtomicValue;
  charge_weight_g: AtomicValue;
  flash_thickness_mm: AtomicValue;
  shrinkage_pct: AtomicValue;
  specific_pressure_MPa: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Material: [mold_temp_C, cure_rate_factor, density_g/cm3, shrinkage_pct, specific_pressure_MPa, flow_factor]
const CM_MAT: Record<CMoldMaterial, [number, number, number, number, number, number]> = {
  SMC:      [150, 1.0, 1.85, 0.2, 10, 1.0],
  BMC:      [155, 1.2, 1.90, 0.3, 15, 1.2],
  phenolic: [170, 0.8, 1.40, 0.8, 20, 0.8],
  melamine: [160, 0.9, 1.50, 0.7, 25, 0.7],
  rubber:   [165, 0.6, 1.15, 2.0, 8,  1.5],
  UHMWPE:   [180, 0.3, 0.94, 3.5, 5,  0.5],
  PTFE:     [370, 0.2, 2.17, 3.0, 30, 0.3],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class CompressionMoldingEngine {
  calculate(input: CompressionMoldingInput): CompressionMoldingResult {
    const {
      material = "SMC",
      mold_action = "semi_positive",
      part_area_cm2: area = 200,
      part_thickness_mm: tw = 4,
      mold_temp_C: Tmold,
    } = input;

    const recs: string[] = [];
    const [defaultTemp, cureRate, rho, shrink, specPressure, flowFactor] = CM_MAT[material];
    const moldTemp = Tmold ?? defaultTemp;

    // Charge weight
    const partVol = area * tw / 10; // cm³
    const partWeight = partVol * rho;
    const chargeWeight = input.charge_weight_g ?? partWeight * 1.05; // 5% extra for flash

    // Mold pressure
    const moldPressure = specPressure;

    // Clamp force
    const areaM2 = area / 1e4; // m²
    const clampForce = moldPressure * 1e6 * areaM2 / 1000; // kN

    // Auto press tonnage
    const pressTons = input.press_tonnage ?? Math.ceil(clampForce / 9.81 * 1.2); // 20% safety

    // Cure time (Arrhenius-like: faster at higher temp)
    const baseCure = 60 + tw * 20; // base: 60s + 20s per mm
    const tempFactor = Math.exp(-(moldTemp - defaultTemp) / 30);
    const cureTime = baseCure * tempFactor / cureRate;

    // Cycle time (cure + open/close/load)
    const cycleTime = cureTime + 15; // 15s handling

    // Flash prediction
    const flashMod = mold_action === "positive" ? 0.1 :
      mold_action === "semi_positive" ? 0.3 :
      mold_action === "flash" ? 1.0 : 0.2;
    const flashThickness = 0.05 * flowFactor * flashMod * (chargeWeight / partWeight);

    const isSafe = clampForce > 0 && cureTime > 10 && moldTemp < 400;

    if (chargeWeight < partWeight) recs.push(`Charge ${chargeWeight.toFixed(0)}g < part ${partWeight.toFixed(0)}g — short shot`);
    if (chargeWeight > partWeight * 1.2) recs.push(`Excess charge ${((chargeWeight / partWeight - 1) * 100).toFixed(0)}% — flash/waste`);
    if (material === "PTFE" && moldTemp < 350) recs.push(`PTFE requires ≥360°C sintering — ${moldTemp}°C insufficient`);
    if (tw > 10 && cureRate < 0.5) recs.push(`Thick part ${tw}mm with slow cure — consider preheating charge`);
    if (mold_action === "flash" && area > 500) recs.push(`Flash mold with large area — high material waste, use positive`);
    if (recs.length === 0) recs.push(`Compression mold nominal — ${clampForce.toFixed(0)}kN, cure ${cureTime.toFixed(0)}s, ${chargeWeight.toFixed(0)}g`);

    return {
      clamp_force_kN: mkAv(Math.round(clampForce * 10) / 10, "kN", clampForce * 0.10, "P_area"),
      cure_time_s: mkAv(Math.round(cureTime * 10) / 10, "s", cureTime * 0.15, "Arrhenius"),
      cycle_time_s: mkAv(Math.round(cycleTime * 10) / 10, "s", cycleTime * 0.10, "cure_handling"),
      mold_pressure_MPa: mkAv(moldPressure, "MPa", moldPressure * 0.10, "material"),
      charge_weight_g: mkAv(Math.round(chargeWeight * 10) / 10, "g", chargeWeight * 0.05, "vol_rho"),
      flash_thickness_mm: mkAv(Math.round(flashThickness * 1000) / 1000, "mm", flashThickness * 0.25, "action_flow"),
      shrinkage_pct: mkAv(shrink, "%", shrink * 0.10, "material"),
      specific_pressure_MPa: mkAv(specPressure, "MPa", specPressure * 0.10, "material"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const compressionMoldingEngine = new CompressionMoldingEngine();
