/**
 * CastingDefectEngine — Casting Process Defect Prediction
 *
 * Models: Common casting defect risk assessment.
 * - Shrinkage porosity from Niyama criterion
 * - Hot tear susceptibility (HTS coefficient)
 * - Gas porosity from hydrogen/nitrogen content
 * - Misrun risk from fluidity and section thickness
 * - Modulus-based feeding distance
 * - Riser sizing (Chvorinov's rule)
 *
 * Key physics: Niyama = G/√Ṫ (thermal gradient/cooling rate).
 * Chvorinov: t_s = C×(V/A)². Feeding distance ≈ 4.5×√T.
 * HTS = Σ|dε/dT × dfs/dT| over solidification.
 *
 * Reference: Campbell — Complete Casting Handbook,
 *            ASM Handbook Vol.15 — Casting,
 *            AFS — Casting Defects Handbook
 *
 * Actions: casting_defect_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface CastingDefectInput {
  alloy?: "gray_iron" | "ductile_iron" | "a356_aluminum" | "c355_aluminum" |
    "carbon_steel" | "stainless_steel" | "bronze";
  section_thickness_mm?: number;
  pouring_temp_c?: number;
  mold_type?: "sand" | "permanent" | "investment" | "die";
  section_length_mm?: number;
  gas_content_ppm?: number;
  complexity?: "simple" | "moderate" | "complex";
}

export interface CastingDefectResult {
  shrinkage_risk: AtomicValue;
  hot_tear_risk: AtomicValue;
  gas_porosity_risk: AtomicValue;
  misrun_risk: AtomicValue;
  feeding_distance: AtomicValue;
  riser_modulus: AtomicValue;
  solidification_time: AtomicValue;
  niyama_criterion: AtomicValue;
  recommended_pour_temp: AtomicValue;
  overall_defect_risk: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** [liquidus_C, solidus_C, shrinkage_pct, fluidity_factor, HTS_factor] */
const ALLOY_DATA: Record<string, [number, number, number, number, number]> = {
  gray_iron:       [1250, 1140, 1.0, 1.2, 0.3],
  ductile_iron:    [1180, 1120, 2.5, 1.0, 0.5],
  a356_aluminum:   [615,  555,  3.5, 1.5, 0.7],
  c355_aluminum:   [620,  550,  4.0, 1.3, 0.8],
  carbon_steel:    [1520, 1425, 3.0, 0.8, 0.6],
  stainless_steel: [1450, 1380, 3.5, 0.7, 0.9],
  bronze:          [1030, 910,  4.5, 1.1, 0.4],
};

/** Mold heat diffusivity factor */
const MOLD_FACTOR: Record<string, number> = {
  sand: 1.0, permanent: 2.5, investment: 0.8, die: 4.0,
};

// ── Engine ─────────────────────────────────────────────────────────

export class CastingDefectEngine {
  calculate(input: CastingDefectInput): CastingDefectResult {
    const warnings: string[] = [];
    const alloy = input.alloy ?? "a356_aluminum";
    const t = input.section_thickness_mm ?? 15;
    const moldType = input.mold_type ?? "sand";
    const secLen = input.section_length_mm ?? 200;
    const gasPpm = input.gas_content_ppm ?? 0;
    const complexity = input.complexity ?? "moderate";

    const [Tliq, Tsol, shrinkPct, fluidFactor, htsFactor] =
      ALLOY_DATA[alloy] ?? ALLOY_DATA.a356_aluminum;

    const Tpour = input.pouring_temp_c ?? Tliq + 80;
    const superheat = Tpour - Tliq;
    const freezeRange = Tliq - Tsol;
    const moldFactor = MOLD_FACTOR[moldType] ?? 1.0;

    // Solidification time (Chvorinov): t_s ∝ (V/A)² / mold_factor
    // For plate: modulus M = t/2
    const modulus = t / 2; // mm
    const solidTime = 0.1 * modulus * modulus / moldFactor; // minutes (simplified)

    // Niyama criterion (G/√Ṫ)
    // Higher = less shrinkage risk. Threshold ~1.0 for steel
    const coolingRate = modulus > 0 ? (Tliq - Tsol) / (solidTime * 60) : 1; // °C/s
    const gradient = superheat / Math.max(t, 1); // °C/mm rough
    const niyama = coolingRate > 0 ? gradient / Math.sqrt(coolingRate) : 0;

    // Shrinkage risk
    let shrinkRisk: string;
    if (shrinkPct > 3 && niyama < 1.0) shrinkRisk = "high";
    else if (shrinkPct > 2 || niyama < 1.5) shrinkRisk = "moderate";
    else shrinkRisk = "low";

    // Hot tear risk
    let htRisk: string;
    if (freezeRange > 100 && htsFactor > 0.6) htRisk = "high";
    else if (freezeRange > 60 || htsFactor > 0.4) htRisk = "moderate";
    else htRisk = "low";

    // Gas porosity risk
    let gasRisk: string;
    if (gasPpm > 5 || (alloy.includes("aluminum") && gasPpm > 1)) gasRisk = "high";
    else if (gasPpm > 2) gasRisk = "moderate";
    else gasRisk = "low";

    // Misrun risk
    const fluidity = fluidFactor * superheat * moldFactor / 100;
    const misrunThreshold = t < 3 ? 2.0 : t < 6 ? 1.0 : 0.5;
    let misrunRisk: string;
    if (fluidity < misrunThreshold) misrunRisk = "high";
    else if (fluidity < misrunThreshold * 2) misrunRisk = "moderate";
    else misrunRisk = "low";

    // Feeding distance
    const feedDist = 4.5 * Math.sqrt(t); // mm

    // Riser modulus (must be > casting modulus by 20%)
    const riserModulus = modulus * 1.2;

    // Recommended pour temp
    const recPour = Tliq + (moldType === "die" ? 30 : moldType === "permanent" ? 50 : 80);

    // Overall risk
    const risks = [shrinkRisk, htRisk, gasRisk, misrunRisk];
    const highCount = risks.filter(r => r === "high").length;
    const modCount = risks.filter(r => r === "moderate").length;
    let overall: string;
    if (highCount >= 2) overall = "high";
    else if (highCount >= 1 || modCount >= 2) overall = "moderate";
    else overall = "low";

    if (complexity === "complex") {
      if (overall === "low") overall = "moderate";
    }

    // Warnings
    if (shrinkRisk === "high") {
      warnings.push(`Shrinkage risk high — ${shrinkPct}% volume shrinkage, add risers/chills`);
    }
    if (htRisk === "high") {
      warnings.push(`Hot tear risk — freeze range ${freezeRange}°C, avoid sharp internal corners`);
    }
    if (superheat < 30) {
      warnings.push(`Superheat ${r0(superheat)}°C low — risk of premature solidification`);
    }
    if (superheat > 200) {
      warnings.push(`Superheat ${r0(superheat)}°C excessive — increased gas pickup and erosion`);
    }
    if (t < 3 && moldType === "sand") {
      warnings.push("Section <3mm in sand mold — high misrun risk, consider die or investment");
    }
    if (secLen > feedDist * 2) {
      warnings.push(`Section length ${secLen}mm > 2× feeding distance ${r0(feedDist)}mm — add intermediate risers`);
    }

    const src = "CastingDefectEngine (Campbell/ASM)";

    return {
      shrinkage_risk: mkAv(riskNum(shrinkRisk), shrinkRisk, 0,
        `${shrinkPct}% vol Niyama=${r1(niyama)}`),
      hot_tear_risk: mkAv(riskNum(htRisk), htRisk, 0,
        `ΔT_f=${freezeRange}°C HTS=${htsFactor}`),
      gas_porosity_risk: mkAv(riskNum(gasRisk), gasRisk, 0,
        `${gasPpm}ppm`),
      misrun_risk: mkAv(riskNum(misrunRisk), misrunRisk, 0,
        `fluidity=${r1(fluidity)} t=${t}mm`),
      feeding_distance: mkAv(r0(feedDist), "mm", feedDist * 0.15,
        `4.5×√${t}`),
      riser_modulus: mkAv(r1(riserModulus), "mm", riserModulus * 0.1,
        `1.2×casting modulus`),
      solidification_time: mkAv(r1(solidTime), "min", solidTime * 0.2,
        `Chvorinov M=${modulus}mm ${moldType}`),
      niyama_criterion: mkAv(r2(niyama), "°C·s^½/mm", niyama * 0.2,
        `G/√Ṫ`),
      recommended_pour_temp: mkAv(recPour, "°C", 10,
        `T_liq+superheat for ${moldType}`),
      overall_defect_risk: mkAv(riskNum(overall), overall, 0, src),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function riskNum(r: string): number {
  return r === "low" ? 1 : r === "moderate" ? 2 : 3;
}
function mkAv(value: number, unit: string, uncertainty: number, source: string): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }

export const castingDefectEngine = new CastingDefectEngine();
