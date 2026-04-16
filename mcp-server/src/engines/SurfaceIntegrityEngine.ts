/**
 * SurfaceIntegrityEngine — Machined Surface Quality Assessment
 *
 * Models: Sub-surface integrity after machining.
 * - Surface roughness from process parameters
 * - Residual stress depth profile
 * - White layer thickness (hard turning, EDM)
 * - Micro-hardness variation
 * - Fatigue derating from surface condition
 * - Process comparison for surface integrity
 *
 * Key physics: Ra = f²/(32r) (ideal turning). White layer ∝ heat input.
 * Residual stress depth ∝ √(DOC×feed). Fatigue: Kf = 1 + q(Kt-1).
 *
 * Reference: Field & Kahles — Surface Integrity,
 *            Davim — Surface Integrity in Machining,
 *            Metcut — Machining Data Handbook
 *
 * Actions: surface_integrity_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface SurfaceIntegrityInput {
  process?: "turning" | "milling" | "grinding" | "hard_turning" |
    "edm" | "honing" | "polishing" | "shot_peen";
  feed_mm_rev?: number;
  tool_nose_radius_mm?: number;
  cutting_speed_m_min?: number;
  depth_of_cut_mm?: number;
  material?: "steel" | "stainless" | "titanium" | "nickel_alloy" | "aluminum";
  coolant?: "flood" | "mql" | "dry" | "cryogenic";
  tool_condition?: "sharp" | "moderate_wear" | "worn";
}

export interface SurfaceIntegrityResult {
  surface_roughness_ra: AtomicValue;
  roughness_rz: AtomicValue;
  residual_stress_surface: AtomicValue;
  residual_stress_depth: AtomicValue;
  white_layer_thickness: AtomicValue;
  affected_layer_depth: AtomicValue;
  hardness_change_pct: AtomicValue;
  fatigue_derating: AtomicValue;
  surface_quality_score: AtomicValue;
  process_recommendation: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** [base_stress_MPa (+ = tensile), white_layer_um, affected_depth_um, quality_base] */
const PROCESS_DATA: Record<string, [number, number, number, number]> = {
  turning:      [-100, 0,   30,  7],
  milling:      [-50,  0,   40,  6],
  grinding:     [200,  5,   50,  8],
  hard_turning: [100,  10,  25,  7],
  edm:          [500,  30,  100, 4],
  honing:       [-200, 0,   10,  9],
  polishing:    [-50,  0,   5,   9],
  shot_peen:    [-400, 0,   200, 6],
};

// ── Engine ─────────────────────────────────────────────────────────

export class SurfaceIntegrityEngine {
  calculate(input: SurfaceIntegrityInput): SurfaceIntegrityResult {
    const warnings: string[] = [];
    const process = input.process ?? "turning";
    const f = input.feed_mm_rev ?? 0.15;
    const rn = input.tool_nose_radius_mm ?? 0.8;
    const Vc = input.cutting_speed_m_min ?? 150;
    const doc = input.depth_of_cut_mm ?? 0.5;
    const matKey = input.material ?? "steel";
    const coolant = input.coolant ?? "flood";
    const toolCond = input.tool_condition ?? "sharp";

    const [baseStress, baseWhite, baseAffected, qualBase] =
      PROCESS_DATA[process] ?? PROCESS_DATA.turning;

    // Surface roughness Ra (µm)
    let Ra: number;
    if (process === "turning" || process === "hard_turning") {
      Ra = (f * f) / (32 * rn) * 1000; // theoretical, in µm
    } else if (process === "milling") {
      Ra = (f * f) / (32 * rn) * 1000 * 1.2; // slightly worse than turning
    } else if (process === "grinding") {
      Ra = 0.2 + doc * 0.5; // depends on wheel and dress
    } else if (process === "edm") {
      Ra = 2.0 + doc * 5; // rough EDM
    } else if (process === "honing") {
      Ra = 0.1 + f * 2;
    } else if (process === "polishing") {
      Ra = 0.05;
    } else {
      Ra = 3.0; // shot peen
    }

    // Tool wear adjustment
    if (toolCond === "moderate_wear") Ra *= 1.3;
    if (toolCond === "worn") Ra *= 2.0;

    // Built-Up Edge (BUE) speed-dependent roughness correction
    // At low cutting speeds, chip material welds to the cutting edge forming a BUE
    // that increases actual Ra above theoretical. The effect peaks at ~0.3× threshold
    // speed and disappears above the material-dependent threshold.
    // Ref: Trent & Wright, "Metal Cutting" 4th ed., Ch. 5; Shaw, "Metal Cutting Principles" 2nd ed.
    let kBue = 0;
    if (Vc > 0 && (process === "turning" || process === "milling" || process === "hard_turning")) {
      const bueThreshold = matKey === "aluminum" ? 300
        : matKey === "stainless" ? 80
        : matKey === "titanium" ? 60
        : matKey === "nickel_alloy" ? 50
        : 100; // steel and default
      const speedRatio = Vc / bueThreshold;
      if (speedRatio < 0.3) {
        kBue = 1.5; // heavy BUE zone — Ra increases up to 2.5×
      } else if (speedRatio < 0.7) {
        // linear decay from peak BUE to zero as speed approaches threshold
        kBue = 0.8 * (1 - speedRatio);
      }
      // speedRatio >= 0.7 → kBue stays 0, no BUE above threshold
      if (kBue > 0) {
        Ra *= (1 + kBue);
        warnings.push(
          `BUE correction applied: Vc=${r0(Vc)} m/min is below BUE threshold `
          + `(${bueThreshold} m/min for ${matKey}), Ra increased by ${r0(kBue * 100)}%`
        );
      }
    }

    const Rz = Ra * 4; // canonical kinematic Rz/Ra = 4 (ISO 4287, Rz = f²/(8r), Ra = f²/(32r))

    // Residual stress
    let surfStress = baseStress;
    if (coolant === "dry") surfStress += 150; // more thermal
    if (coolant === "cryogenic") surfStress -= 100; // less thermal
    if (toolCond === "worn") surfStress += 200; // rubbing generates heat

    // Residual stress depth (µm)
    const stressDepth = baseAffected * Math.sqrt(doc * f / 0.075);

    // White layer
    let whiteLayer = baseWhite;
    if (coolant === "dry" && (process === "grinding" || process === "hard_turning")) {
      whiteLayer *= 2;
    }
    if (toolCond === "worn") whiteLayer *= 1.5;

    // Affected layer depth
    const affectedDepth = baseAffected * (1 + doc / 0.5 * 0.3);

    // Hardness change
    let hardnessChange = 0; // %
    if (process === "grinding") hardnessChange = 5;
    if (process === "hard_turning") hardnessChange = 8;
    if (process === "edm") hardnessChange = 15;
    if (process === "shot_peen") hardnessChange = 10;
    if (toolCond === "worn") hardnessChange += 5;

    // Fatigue derating factor (1.0 = no effect, <1.0 = reduced life)
    let fatigueFactor = 1.0;
    if (surfStress > 0) fatigueFactor -= surfStress / 2000; // tensile hurts
    if (surfStress < 0) fatigueFactor += Math.abs(surfStress) / 3000; // compressive helps
    if (whiteLayer > 10) fatigueFactor -= 0.15;
    if (Ra > 3) fatigueFactor -= 0.10;
    fatigueFactor = Math.max(0.3, Math.min(1.2, fatigueFactor));

    // Quality score (1-10)
    let qualScore = qualBase;
    if (Ra < 0.4) qualScore += 1;
    if (surfStress < -200) qualScore += 1;
    if (whiteLayer > 10) qualScore -= 2;
    if (toolCond === "worn") qualScore -= 1;
    qualScore = Math.max(1, Math.min(10, qualScore));

    // Process recommendation
    let procRec = process;
    if (Ra > 1.6 && process !== "polishing" && process !== "honing") {
      procRec = "honing";
    }

    // Warnings
    if (whiteLayer > 15) {
      warnings.push(`White layer ${r0(whiteLayer)}µm — rehardened layer may crack, add finishing pass`);
    }
    if (surfStress > 300) {
      warnings.push(`Tensile residual stress ${r0(surfStress)}MPa — fatigue life reduced`);
    }
    if (toolCond === "worn") {
      warnings.push("Worn tool — degraded surface integrity, replace insert");
    }
    if (process === "grinding" && coolant === "dry") {
      warnings.push("Dry grinding — thermal damage (burn) risk, use flood coolant");
    }
    if (matKey === "titanium" && surfStress > 200) {
      warnings.push("Tensile stress on titanium — stress corrosion cracking risk");
    }
    if (process === "edm") {
      warnings.push("EDM surface — recast layer, stress relieve or remove by finishing");
    }

    const src = "SurfaceIntegrityEngine (Field/Davim)";

    return {
      surface_roughness_ra: mkAv(r2(Ra), "µm Ra", Ra * 0.1, `${process} f=${f}`),
      roughness_rz: mkAv(r1(Rz), "µm Rz", Rz * 0.15, "≈5×Ra"),
      residual_stress_surface: mkAv(r0(surfStress), "MPa",
        Math.abs(surfStress) * 0.2,
        surfStress > 0 ? "tensile" : "compressive"),
      residual_stress_depth: mkAv(r0(stressDepth), "µm", stressDepth * 0.2,
        `√(DOC×f) scaled`),
      white_layer_thickness: mkAv(r1(whiteLayer), "µm", whiteLayer * 0.3,
        process),
      affected_layer_depth: mkAv(r0(affectedDepth), "µm", affectedDepth * 0.2,
        process),
      hardness_change_pct: mkAv(r0(hardnessChange), "%", hardnessChange * 0.2,
        process),
      fatigue_derating: mkAv(r2(fatigueFactor), "factor", fatigueFactor * 0.1,
        "Stress + surface combined"),
      surface_quality_score: mkAv(qualScore, "/10", 1, src),
      process_recommendation: mkAv(procRec === process ? 1 : 0, procRec, 0, src),
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

export const surfaceIntegrityEngine = new SurfaceIntegrityEngine();
