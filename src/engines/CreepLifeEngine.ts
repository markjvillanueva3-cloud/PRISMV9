/**
 * CreepLifeEngine — High-Temperature Creep Life Assessment
 *
 * Models: Larson-Miller parameter and creep rupture estimation.
 * - Larson-Miller parameter: LMP = T(K) × (C + log10(t_r))
 * - Norton power law: ε̇ = A × σⁿ × exp(-Q/RT)
 * - Allowable stress from creep rupture data
 * - Time to 1% creep strain
 * - Remaining life fraction (Robinson's rule)
 * - Oxide scale thickness estimation
 *
 * Key physics: LMP = T×(C + log₁₀(t)). Norton: ε̇ = Aσⁿexp(-Q/RT).
 * Robinson's linear damage: Σ(ti/tri) ≤ 1.
 *
 * Reference: API 530 — Fired Heater Tubes,
 *            ASME Section II-D,
 *            Viswanathan — Damage Mechanisms in Power Plants
 *
 * Actions: creep_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface CreepLifeInput {
  material?: "carbon_steel" | "1cr_0.5mo" | "2.25cr_1mo" | "9cr_1mo" |
    "304ss" | "316ss" | "inconel_625" | "inconel_718";
  temperature_c?: number;
  stress_mpa?: number;
  design_life_hours?: number;
  service_hours?: number;
  safety_factor?: number;
}

export interface CreepLifeResult {
  larson_miller_param: AtomicValue;
  rupture_life_hours: AtomicValue;
  time_to_1pct_creep: AtomicValue;
  allowable_stress: AtomicValue;
  life_fraction_used: AtomicValue;
  remaining_life: AtomicValue;
  creep_rate: AtomicValue;
  oxide_thickness: AtomicValue;
  temperature_margin: AtomicValue;
  creep_regime: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** [C_constant, rupture_stress_at_100kh_MPa (at ref_temp), n_norton, max_temp_C, ref_temp_C] */
const MAT_CREEP: Record<string, [number, number, number, number, number]> = {
  carbon_steel:  [20, 40,  4.0, 450, 400],
  "1cr_0.5mo":   [20, 70,  4.5, 550, 500],
  "2.25cr_1mo":  [20, 90,  5.0, 600, 550],
  "9cr_1mo":     [20, 120, 5.5, 650, 600],
  "304ss":       [18, 80,  5.0, 750, 650],
  "316ss":       [18, 100, 5.0, 750, 650],
  inconel_625:   [17, 200, 6.0, 900, 800],
  inconel_718:   [17, 250, 6.5, 700, 650],
};

// ── Engine ─────────────────────────────────────────────────────────

export class CreepLifeEngine {
  calculate(input: CreepLifeInput): CreepLifeResult {
    const warnings: string[] = [];
    const matKey = input.material ?? "2.25cr_1mo";
    const tempC = input.temperature_c ?? 550;
    const sigma = input.stress_mpa ?? 60;
    const designLife = input.design_life_hours ?? 100000;
    const serviceHrs = input.service_hours ?? 0;
    const sf = input.safety_factor ?? 1.5;

    const [C, sigRef, nNorton, maxTemp, refTempC] =
      MAT_CREEP[matKey] ?? MAT_CREEP["2.25cr_1mo"];

    const T_K = tempC + 273.15;
    const T_ref = refTempC + 273.15;

    // Larson-Miller parameter
    // At reference: sigRef stress at refTemp gives 100,000h life
    // LMP_ref = T_ref × (C + log10(100000)) = T_ref × (C + 5)
    const lmpRef = T_ref * (C + 5);
    // Stress correction: higher stress → lower LMP (log-linear)
    const lmp = lmpRef - 5000 * Math.log10(Math.max(sigma, 1) / Math.max(sigRef, 1));

    // Rupture life: t_r = 10^(LMP/T - C)
    const logTr = lmp / T_K - C;
    const tRupture = Math.pow(10, Math.min(logTr, 10)); // cap at 10^10 hours

    // Time to 1% creep (approximately 1/3 of rupture life for secondary creep)
    const t1pct = tRupture * 0.33;

    // Allowable stress (rupture stress / safety factor)
    // Reverse: at design life, what stress gives rupture?
    const lmpDesign = T_K * (C + Math.log10(Math.max(designLife, 1)));
    const sigAllowable = sigRef * Math.pow(lmpRef / Math.max(lmpDesign, 1), 3) / sf;

    // Life fraction used (Robinson's rule)
    const lifeFraction = tRupture > 0 ? serviceHrs / tRupture : 0;

    // Remaining life
    const remainingLife = Math.max(0, tRupture - serviceHrs);

    // Creep rate (Norton law, simplified): ε̇ ∝ σⁿ
    // Normalize: at sigRef, ε̇ = 1%/t_rupture_ref
    const epsRate = 0.01 * Math.pow(sigma / Math.max(sigRef, 1), nNorton) /
      Math.max(tRupture * 0.33, 1); // per hour

    // Oxide scale thickness (simplified parabolic kinetics)
    // x² = kp × t, kp varies with temperature
    const kp = 1e-12 * Math.exp(0.02 * (tempC - 500)); // m²/hr simplified
    const oxideM = Math.sqrt(Math.max(kp, 0) * Math.max(serviceHrs, 1000));
    const oxideMm = oxideM * 1000; // mm

    // Temperature margin to max recommended
    const tempMargin = maxTemp - tempC;

    // Creep regime
    let regime: string;
    if (tempC < maxTemp * 0.7) regime = "negligible";
    else if (tempC < maxTemp * 0.85) regime = "secondary";
    else if (tempC < maxTemp) regime = "significant";
    else regime = "excessive";

    // Warnings
    if (tempC > maxTemp) {
      warnings.push(`Temperature ${tempC}°C exceeds max ${maxTemp}°C for ${matKey}`);
    }
    if (sigma > sigAllowable * sf) {
      warnings.push(`Stress ${sigma}MPa exceeds allowable ${r1(sigAllowable * sf)}MPa`);
    }
    if (lifeFraction > 0.5) {
      warnings.push(`Life fraction ${r2(lifeFraction)} > 0.5 — schedule inspection`);
    }
    if (lifeFraction > 0.8) {
      warnings.push(`Life fraction ${r2(lifeFraction)} > 0.8 — replacement recommended`);
    }
    if (tRupture < designLife) {
      warnings.push(`Rupture life ${r0(tRupture)}h < design life ${designLife}h`);
    }
    if (oxideMm > 0.5) {
      warnings.push(`Oxide scale ${r2(oxideMm)}mm — may cause wall loss`);
    }

    const src = "CreepLifeEngine (API 530/Viswanathan)";

    return {
      larson_miller_param: mkAv(r0(lmp), "LMP", lmp * 0.03,
        `T(${C}+log₁₀t)`),
      rupture_life_hours: mkAv(r0(tRupture), "hours", tRupture * 0.3,
        `10^(LMP/T-C) at ${sigma}MPa`),
      time_to_1pct_creep: mkAv(r0(t1pct), "hours", t1pct * 0.3,
        "≈0.33×t_rupture"),
      allowable_stress: mkAv(r1(sigAllowable), "MPa", sigAllowable * 0.15,
        `SF=${sf} for ${designLife}h`),
      life_fraction_used: mkAv(r3(lifeFraction), "fraction", lifeFraction * 0.1,
        `${serviceHrs}/${r0(tRupture)}h`),
      remaining_life: mkAv(r0(remainingLife), "hours", remainingLife * 0.3,
        "t_rupture - service"),
      creep_rate: mkAv(Number(epsRate.toExponential(2)), "/hr", epsRate * 0.3,
        `Norton n=${nNorton}`),
      oxide_thickness: mkAv(r2(oxideMm), "mm", oxideMm * 0.3,
        "Parabolic kinetics"),
      temperature_margin: mkAv(r0(tempMargin), "°C", 0,
        `${maxTemp}-${tempC}`),
      creep_regime: mkAv(
        regime === "negligible" ? 1 : regime === "secondary" ? 2 :
        regime === "significant" ? 3 : 4,
        regime, 0, src),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(value: number, unit: string, uncertainty: number, source: string): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const creepLifeEngine = new CreepLifeEngine();
