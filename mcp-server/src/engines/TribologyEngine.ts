/**
 * TribologyEngine — Tribological analysis of sliding contacts
 *
 * Models: Archard wear equation (V=K×F×s/H), friction regimes,
 *         Stribeck curve, lubrication number, PV limits
 * References: Archard 1953, Rabinowicz wear, Stribeck 1902
 */

export type LubricationRegime = "boundary" | "mixed" | "hydrodynamic" | "dry";
export type WearMechanism = "adhesive" | "abrasive" | "erosive" | "corrosive" | "fatigue";

export interface TribologyInput {
  normal_force_N: number;
  sliding_velocity_m_s: number;
  contact_area_mm2: number;
  hardness_HV?: number;               // default 200
  wear_coefficient?: number;          // Archard K, default 1e-4
  viscosity_Pa_s?: number;            // lubricant, default 0.01
  surface_roughness_um?: number;      // Ra, default 0.8
  sliding_distance_m?: number;        // default 1000
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface TribologyResult {
  contact_pressure_MPa: AtomicValue;
  pv_value_MPa_m_s: AtomicValue;
  friction_coefficient: AtomicValue;
  wear_volume_mm3: AtomicValue;
  wear_depth_um: AtomicValue;
  lubrication_regime: AtomicValue;
  lambda_ratio: AtomicValue;
  flash_temperature_C: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class TribologyEngine {
  calculate(input: TribologyInput): TribologyResult {
    const {
      normal_force_N: F,
      sliding_velocity_m_s: V,
      contact_area_mm2: A,
      hardness_HV: H = 200,
      wear_coefficient: K = 1e-4,
      viscosity_Pa_s: eta = 0.01,
      surface_roughness_um: Ra = 0.8,
      sliding_distance_m: s = 1000,
    } = input;

    const recs: string[] = [];

    // Contact pressure
    const pressure = F / A; // MPa (N/mm² = MPa)

    // PV value
    const pv = pressure * V;

    // Lambda ratio (film thickness / roughness)
    // Simplified: h_min ∝ (η×V)/(P) for line contact
    const hMin = eta * V / (pressure * 1e6 + 1) * 1e6; // µm (very simplified)
    const compositeRa = Ra * Math.SQRT2;
    const lambda = hMin / (compositeRa + 0.001);

    // Lubrication regime from lambda
    let regime: LubricationRegime;
    let regimeCode: number;
    let frictionCoeff: number;
    if (eta < 0.001 || lambda < 0.01) {
      regime = "dry"; regimeCode = 0; frictionCoeff = 0.4;
    } else if (lambda < 1) {
      regime = "boundary"; regimeCode = 1; frictionCoeff = 0.15;
    } else if (lambda < 3) {
      regime = "mixed"; regimeCode = 2; frictionCoeff = 0.05;
    } else {
      regime = "hydrodynamic"; regimeCode = 3; frictionCoeff = 0.005;
    }

    // Archard wear equation: V = K × F × s / (H × 9.81)
    const Hpa = H * 9.81e6; // HV to Pa
    const wearVolume = K * F * s / Hpa * 1e9; // mm³
    const wearDepth = wearVolume / A * 1000; // µm

    // Flash temperature (Blok's formula simplified)
    const k = 50; // thermal conductivity W/mK (steel)
    const frictionHeat = frictionCoeff * F * V;
    const flashTemp = frictionHeat / (k * Math.sqrt(A / Math.PI) / 1000 * 4) + 25;

    const pvLimit = 2; // MPa·m/s typical for dry steel
    const isSafe = pv < pvLimit * 5 && flashTemp < 300 && wearDepth < 100;

    if (pv > pvLimit) recs.push(`PV=${pv.toFixed(2)} > limit ${pvLimit} MPa·m/s — use lubrication or harder material`);
    if (regime === "boundary") recs.push(`Boundary lubrication — high wear, add EP additives`);
    if (regime === "dry") recs.push(`Dry contact — very high wear, consider lubrication`);
    if (flashTemp > 200) recs.push(`Flash temperature ${flashTemp.toFixed(0)}°C — oil degradation risk`);
    if (wearDepth > 50) recs.push(`Wear depth ${wearDepth.toFixed(0)}µm over ${s}m — excessive`);
    if (recs.length === 0) recs.push(`Tribology nominal — PV=${pv.toFixed(2)}, µ=${frictionCoeff}, λ=${lambda.toFixed(2)}, ${regime}`);

    return {
      contact_pressure_MPa: mkAv(Math.round(pressure * 100) / 100, "MPa", pressure * 0.05, "force_area"),
      pv_value_MPa_m_s: mkAv(Math.round(pv * 1000) / 1000, "MPa·m/s", pv * 0.05, "product"),
      friction_coefficient: mkAv(frictionCoeff, "ratio", frictionCoeff * 0.20, "stribeck"),
      wear_volume_mm3: mkAv(Math.round(wearVolume * 1000) / 1000, "mm³", wearVolume * 0.30, "archard"),
      wear_depth_um: mkAv(Math.round(wearDepth * 10) / 10, "µm", wearDepth * 0.30, "archard"),
      lubrication_regime: mkAv(regimeCode, "code", 0, "lambda_ratio", regime),
      lambda_ratio: mkAv(Math.round(lambda * 100) / 100, "ratio", lambda * 0.25, "film_roughness"),
      flash_temperature_C: mkAv(Math.round(flashTemp), "°C", flashTemp * 0.20, "blok"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const tribologyEngine = new TribologyEngine();
