/**
 * SurfaceRoughnessEngine — Surface Finish Prediction Calculator
 *
 * Predicts surface roughness from cutting parameters:
 * - Ra from tool nose radius and feed (theoretical)
 * - Rz estimation from Ra
 * - BUE (built-up edge) correction for low speeds
 * - Vibration contribution from DOC and overhang
 * - Achievable finish by process type
 * - Surface finish conversion (Ra ↔ Rz ↔ RMS ↔ CLA)
 *
 * Key physics: Theoretical Ra = f²/(32×r) where f = feed/rev
 * and r = nose radius. Actual finish is worse due to BUE,
 * vibration, tool wear, and material behavior. BUE forms
 * at low speeds (especially steel) and degrades finish.
 * High speeds eliminate BUE. Vibration adds Ra proportional
 * to amplitude.
 *
 * Reference: Machinery's Handbook Ch.32 (Surface Texture),
 *            ISO 4287 (Surface texture parameters),
 *            Boothroyd & Knight (Fundamentals of Machining)
 *
 * Actions: surface_roughness_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface SurfaceRoughnessInput {
  process?: "turning" | "milling" | "grinding" | "boring"
    | "reaming" | "lapping" | "honing";
  feed_per_rev_mm?: number;
  nose_radius_mm?: number;
  cutting_speed_mpm?: number;
  material_type?: "steel" | "aluminum" | "titanium"
    | "stainless" | "cast_iron" | "brass";
  tool_condition?: "new" | "worn" | "chipped";
  overhang_ratio?: number;
}

export interface SurfaceRoughnessResult {
  theoretical_ra: AtomicValue;
  predicted_ra: AtomicValue;
  predicted_rz: AtomicValue;
  rms_roughness: AtomicValue;
  bue_factor: AtomicValue;
  vibration_contribution: AtomicValue;
  wear_contribution: AtomicValue;
  achievable_range: AtomicValue;
  iso_grade: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Achievable Ra ranges by process [min, typical, max] in μm */
const PROCESS_RA: Record<string, [number, number, number]> = {
  turning: [0.4, 1.6, 6.3],
  milling: [0.8, 3.2, 12.5],
  grinding: [0.05, 0.4, 1.6],
  boring: [0.4, 1.6, 6.3],
  reaming: [0.4, 1.6, 3.2],
  lapping: [0.012, 0.05, 0.2],
  honing: [0.05, 0.2, 0.8],
};

/** ISO surface roughness grades (N-grades) */
const ISO_GRADES: Array<[string, number]> = [
  ["N1", 0.025],
  ["N2", 0.05],
  ["N3", 0.1],
  ["N4", 0.2],
  ["N5", 0.4],
  ["N6", 0.8],
  ["N7", 1.6],
  ["N8", 3.2],
  ["N9", 6.3],
  ["N10", 12.5],
  ["N11", 25],
  ["N12", 50],
];

/** BUE speed threshold (m/min) — below this, BUE forms */
const BUE_THRESHOLD: Record<string, number> = {
  steel: 60,
  aluminum: 100,
  titanium: 40,
  stainless: 50,
  cast_iron: 80,
  brass: 200,
};

// ── Engine ─────────────────────────────────────────────────────────

export class SurfaceRoughnessEngine {
  calculate(input: SurfaceRoughnessInput): SurfaceRoughnessResult {
    const warnings: string[] = [];
    const process = input.process ?? "turning";
    const mat = input.material_type ?? "steel";
    const toolCond = input.tool_condition ?? "new";
    const Vc = input.cutting_speed_mpm ?? 120;
    const overhang = input.overhang_ratio ?? 3;

    const f = input.feed_per_rev_mm ?? 0.15;
    const r = input.nose_radius_mm ?? 0.8;

    // Theoretical Ra (μm): Ra = f² / (32 × r) × 1000
    // (multiply by 1000 to convert mm to μm)
    const theoreticalRa = ((f * f) / (32 * r)) * 1000;

    // BUE factor: degrades finish at low cutting speeds
    const bueThreshold = BUE_THRESHOLD[mat] ?? 60;
    let bueFactor = 1.0;
    if (Vc < bueThreshold && process !== "grinding"
      && process !== "lapping" && process !== "honing") {
      bueFactor = 1 + (bueThreshold - Vc) / bueThreshold;
      if (bueFactor > 2.5) bueFactor = 2.5;
    }

    // Vibration contribution (μm Ra added)
    let vibContrib = 0;
    if (overhang > 4) {
      vibContrib = (overhang - 4) * 0.3;
    }

    // Tool wear contribution
    const wearFactor = toolCond === "new" ? 1.0
      : toolCond === "worn" ? 1.5
      : 2.0; // chipped
    const wearContrib = theoreticalRa * (wearFactor - 1);

    // Material factor (some materials finish better)
    const matFactor = mat === "brass" ? 0.8
      : mat === "aluminum" ? 0.9
      : mat === "cast_iron" ? 0.85
      : mat === "stainless" ? 1.2
      : mat === "titanium" ? 1.15
      : 1.0;

    // Process override for grinding/lapping/honing
    let predictedRa: number;
    if (process === "grinding" || process === "lapping"
      || process === "honing") {
      const range = PROCESS_RA[process]!;
      predictedRa = range[1]; // typical for process
    } else {
      predictedRa = theoreticalRa * bueFactor * matFactor
        * wearFactor + vibContrib;
    }

    // Rz ≈ 4 × Ra (typical ratio)
    const predictedRz = predictedRa * 4;

    // RMS ≈ 1.11 × Ra
    const rms = predictedRa * 1.11;

    // ISO N-grade
    let isoGrade = "N12";
    let isoRa = 50;
    for (const [grade, ra] of ISO_GRADES) {
      if (predictedRa <= ra) {
        isoGrade = grade;
        isoRa = ra;
        break;
      }
    }

    // Achievable range for process
    const range = PROCESS_RA[process] ?? [0.4, 1.6, 6.3];

    // Warnings
    if (predictedRa > range[2]) {
      warnings.push(
        `Predicted Ra ${r2(predictedRa)}μm exceeds typical ` +
        `${process} range (${range[2]}μm) — reduce feed or increase Vc`
      );
    }
    if (bueFactor > 1.5) {
      warnings.push(
        `BUE risk at Vc=${Vc} m/min — increase speed above ` +
        `${bueThreshold} m/min for ${mat}`
      );
    }
    if (toolCond === "chipped") {
      warnings.push(
        "Chipped tool — replace immediately, surface quality degraded"
      );
    }
    if (vibContrib > 0.5) {
      warnings.push(
        `Overhang L/D=${overhang} causing ~${r2(vibContrib)}μm ` +
        "vibration roughness — reduce overhang or use dampened holder"
      );
    }
    if (f > r * 0.5) {
      warnings.push(
        "Feed > 50% of nose radius — scallop height dominates finish"
      );
    }

    return {
      theoretical_ra: av(r3(theoreticalRa), "μm", 0.05,
        `f²/(32r) = ${f}²/(32×${r})`),
      predicted_ra: av(r3(predictedRa), "μm", 0.1,
        "Theoretical × BUE × material × wear + vibration"),
      predicted_rz: av(r2(predictedRz), "μm", 0.5,
        "≈ 4 × Ra"),
      rms_roughness: av(r3(rms), "μm", 0.1,
        "≈ 1.11 × Ra"),
      bue_factor: av(r2(bueFactor), "multiplier", 0.1,
        bueFactor > 1
          ? `Vc=${Vc} < threshold ${bueThreshold} m/min`
          : "No BUE — speed above threshold"),
      vibration_contribution: av(r3(vibContrib), "μm", 0.1,
        overhang > 4
          ? `L/D=${overhang} adds vibration`
          : "L/D within safe range"),
      wear_contribution: av(r3(wearContrib), "μm", 0.1,
        `${toolCond} tool: ${wearFactor}× factor`),
      achievable_range: av(range[1], "μm",
        range[2] - range[0],
        `${process}: ${range[0]}-${range[2]}μm`),
      iso_grade: av(isoRa, isoGrade, 0,
        `Ra ≤ ${isoRa}μm`),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const surfaceRoughnessEngine = new SurfaceRoughnessEngine();
