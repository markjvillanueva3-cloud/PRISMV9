/**
 * CorrosionRateEngine — Material Corrosion Assessment Calculator
 *
 * Models: Uniform and localized corrosion rate estimation.
 * - Corrosion rate from weight loss (mpy, mm/yr)
 * - Galvanic corrosion from EMF series potential difference
 * - Pitting resistance (PREN for stainless steels)
 * - Temperature and pH derating
 * - Service life estimation from wall thickness
 * - Corrosion allowance sizing
 *
 * Key physics: CR(mpy) = 534×W/(D×A×T). PREN = %Cr + 3.3×%Mo + 16×%N.
 * Galvanic risk from potential difference in EMF series.
 *
 * Reference: NACE MR0175, ASTM G1/G31,
 *            Fontana — Corrosion Engineering,
 *            API 571 — Damage Mechanisms
 *
 * Actions: corrosion_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface CorrosionRateInput {
  material?: "carbon_steel" | "304ss" | "316ss" | "duplex" | "inconel" |
    "monel" | "titanium" | "copper" | "aluminum";
  environment?: "atmospheric" | "seawater" | "acid" | "alkaline" |
    "h2s" | "co2" | "freshwater";
  temperature_c?: number;
  ph?: number;
  wall_thickness_mm?: number;
  corrosion_allowance_mm?: number;
  coupled_material?: string;
  chloride_ppm?: number;
}

export interface CorrosionRateResult {
  corrosion_rate_mmyr: AtomicValue;
  corrosion_rate_mpy: AtomicValue;
  pren: AtomicValue;
  galvanic_risk: AtomicValue;
  remaining_life_years: AtomicValue;
  pitting_temp: AtomicValue;
  recommended_allowance: AtomicValue;
  weight_loss_rate: AtomicValue;
  severity: AtomicValue;
  material_suitability: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** [base_cr_mmyr, PREN, EMF_potential_V, density_g_cm3] */
const MAT_DATA: Record<string, [number, number, number, number]> = {
  carbon_steel: [0.12, 0,    -0.44, 7.85],
  "304ss":      [0.01, 18.5, -0.08, 7.93],
  "316ss":      [0.005, 25.0, -0.05, 7.98],
  duplex:       [0.002, 35.0, -0.03, 7.80],
  inconel:      [0.003, 45.0,  0.05, 8.44],
  monel:        [0.008, 0,     0.10, 8.80],
  titanium:     [0.001, 0,     0.20, 4.51],
  copper:       [0.025, 0,     0.34, 8.96],
  aluminum:     [0.010, 0,    -1.66, 2.70],
};

/** Environment multiplier on base corrosion rate */
const ENV_MULT: Record<string, number> = {
  atmospheric: 1.0,
  freshwater: 1.5,
  seawater: 5.0,
  acid: 15.0,
  alkaline: 2.0,
  h2s: 8.0,
  co2: 6.0,
};

// ── Engine ─────────────────────────────────────────────────────────

export class CorrosionRateEngine {
  calculate(input: CorrosionRateInput): CorrosionRateResult {
    const warnings: string[] = [];
    const matKey = input.material ?? "carbon_steel";
    const env = input.environment ?? "atmospheric";
    const temp = input.temperature_c ?? 25;
    const ph = input.ph ?? 7;
    const wall = input.wall_thickness_mm ?? 10;
    const ca = input.corrosion_allowance_mm ?? 3;
    const clPpm = input.chloride_ppm ?? 0;

    const [baseCR, pren, emf, density] = MAT_DATA[matKey] ?? MAT_DATA.carbon_steel;

    // Environment multiplier
    const envMult = ENV_MULT[env] ?? 1.0;

    // Temperature factor: doubles roughly every 30°C above 25°C
    const tempFactor = Math.pow(2, (temp - 25) / 30);

    // pH factor: lower pH accelerates corrosion
    let phFactor = 1.0;
    if (ph < 4) phFactor = 3.0;
    else if (ph < 6) phFactor = 1.5;
    else if (ph > 10) phFactor = 0.7;

    // Chloride factor for stainless steels
    let clFactor = 1.0;
    if (pren > 0 && clPpm > 0) {
      if (clPpm > 1000) clFactor = 3.0;
      else if (clPpm > 200) clFactor = 1.5;
    }

    // Corrosion rate (mm/yr)
    const crMmYr = baseCR * envMult * tempFactor * phFactor * clFactor;
    const crMpy = crMmYr * 39.37; // 1 mm/yr ≈ 39.37 mpy

    // Remaining life
    const effectiveWall = wall - ca;
    const lifeYears = crMmYr > 0 ? effectiveWall / crMmYr : 999;

    // Critical pitting temperature (CPT) for stainless
    const cpt = pren > 0 ? (pren - 10) * 2.5 : 0; // rough estimate

    // Recommended corrosion allowance
    const recCA = crMmYr * 20; // 20-year design life

    // Weight loss rate (g/m²/yr)
    const wlr = crMmYr * density * 1000; // mm/yr × g/cm³ × 1000 → g/m²/yr

    // Severity classification
    let severity: string;
    if (crMmYr < 0.025) severity = "negligible";
    else if (crMmYr < 0.12) severity = "low";
    else if (crMmYr < 0.5) severity = "moderate";
    else if (crMmYr < 1.0) severity = "high";
    else severity = "severe";

    // Galvanic risk
    let galvanicRisk = 0;
    if (input.coupled_material) {
      const coupled = MAT_DATA[input.coupled_material];
      if (coupled) {
        galvanicRisk = Math.abs(emf - coupled[2]) * 1000; // mV
      }
    }

    // Material suitability
    const suitable = crMmYr < 0.5 && lifeYears > 5;

    // Warnings
    if (crMmYr > 1.0) {
      warnings.push(`Severe corrosion ${r2(crMmYr)}mm/yr — ${matKey} unsuitable for ${env}`);
    }
    if (pren > 0 && temp > cpt) {
      warnings.push(`Temperature ${temp}°C exceeds CPT ${r0(cpt)}°C — pitting risk`);
    }
    if (galvanicRisk > 250) {
      warnings.push(`Galvanic potential ${r0(galvanicRisk)}mV — isolate dissimilar metals`);
    }
    if (env === "h2s" && matKey === "carbon_steel") {
      warnings.push("H₂S with carbon steel — SSC/HIC risk per NACE MR0175");
    }
    if (lifeYears < 5) {
      warnings.push(`Remaining life ${r1(lifeYears)} years — increase CA or upgrade material`);
    }
    if (clPpm > 200 && matKey === "304ss") {
      warnings.push("304SS with >200ppm chlorides — upgrade to 316SS or duplex");
    }

    const src = "CorrosionRateEngine (NACE/Fontana)";

    return {
      corrosion_rate_mmyr: mkAv(r3(crMmYr), "mm/yr", crMmYr * 0.2,
        `${baseCR}×${envMult}×T×pH×Cl`),
      corrosion_rate_mpy: mkAv(r1(crMpy), "mpy", crMpy * 0.2, "×39.37"),
      pren: mkAv(r1(pren), "PREN", 0, matKey),
      galvanic_risk: mkAv(r0(galvanicRisk), "mV", galvanicRisk * 0.1, "EMF diff"),
      remaining_life_years: mkAv(r1(lifeYears), "years", lifeYears * 0.2,
        `${r1(effectiveWall)}mm / ${r3(crMmYr)}mm/yr`),
      pitting_temp: mkAv(r0(cpt), "°C", 5, `PREN=${r1(pren)}`),
      recommended_allowance: mkAv(r1(recCA), "mm", recCA * 0.2, "20-year life"),
      weight_loss_rate: mkAv(r0(wlr), "g/m²/yr", wlr * 0.2, src),
      severity: mkAv(severity === "negligible" ? 1 : severity === "low" ? 2 :
        severity === "moderate" ? 3 : severity === "high" ? 4 : 5,
        severity, 0, src),
      material_suitability: mkAv(suitable ? 1 : 0,
        suitable ? "SUITABLE" : "UNSUITABLE", 0, src),
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

export const corrosionRateEngine = new CorrosionRateEngine();
