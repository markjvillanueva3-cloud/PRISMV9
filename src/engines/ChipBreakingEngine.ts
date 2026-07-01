/**
 * ChipBreakingEngine — Chip Form Prediction & Chipbreaker Selection
 *
 * Calculates chip formation characteristics:
 * - Chip type prediction (continuous, segmented, discontinuous)
 * - Chip thickness ratio from shear angle
 * - Chipbreaker groove effectiveness
 * - Feed/DOC operating window for good chip breaking
 * - Chip curl radius estimation
 * - Bird's nest risk assessment
 *
 * Key physics: Chip thickness ratio r = t₁/t₂ = sin(φ)/cos(φ-α)
 * where φ is shear angle, α is rake angle. Merchant's circle gives
 * φ = 45 + α/2 - β/2 where β is friction angle. Chip breaking
 * requires sufficient strain — small feeds produce continuous
 * (stringy) chips that wrap the workpiece.
 *
 * Reference: Merchant's theory of metal cutting,
 *            Sandvik chip breaking guide,
 *            Kennametal chipbreaker selection
 *
 * Actions: chip_breaking_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ChipBreakingInput {
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  rake_angle_deg?: number;
  work_material?: "steel" | "stainless" | "aluminum" | "cast_iron"
    | "titanium" | "superalloy";
  cutting_speed_mpm?: number;
  insert_nose_radius_mm?: number;
  chipbreaker_type?: "none" | "light" | "medium" | "heavy";
  coolant?: boolean;
}

export interface ChipBreakingResult {
  chip_type: AtomicValue;
  chip_thickness_ratio: AtomicValue;
  shear_angle: AtomicValue;
  chip_curl_radius: AtomicValue;
  min_feed_for_breaking: AtomicValue;
  max_feed_for_breaking: AtomicValue;
  chip_score: AtomicValue;
  recommended_chipbreaker: AtomicValue;
  birds_nest_risk: AtomicValue;
  chip_length_class: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Friction angle β by material (degrees) */
const FRICTION_ANGLES: Record<string, number> = {
  steel: 25,
  stainless: 32,
  aluminum: 18,
  cast_iron: 20,
  titanium: 35,
  superalloy: 38,
};

/** Material chip-breaking tendency (1=easy, 5=very hard) */
const BREAK_DIFFICULTY: Record<string, number> = {
  cast_iron: 1,      // naturally discontinuous
  aluminum: 4,       // gummy, stringy
  steel: 2,          // moderate
  stainless: 4,      // work hardening, stringy
  titanium: 3,       // segmented shear
  superalloy: 3,     // segmented but tough
};

/** Chipbreaker effective feed ranges (mm/rev) */
const BREAKER_RANGES: Record<string, { min: number; max: number }> = {
  none:   { min: 999, max: 999 },  // no breaking
  light:  { min: 0.05, max: 0.25 },
  medium: { min: 0.15, max: 0.50 },
  heavy:  { min: 0.30, max: 0.80 },
};

// ── Engine ─────────────────────────────────────────────────────────

export class ChipBreakingEngine {
  calculate(input: ChipBreakingInput): ChipBreakingResult {
    const warnings: string[] = [];
    const mat = input.work_material ?? "steel";
    const feed = input.feed_mm_rev;
    const doc = input.depth_of_cut_mm;
    const rake = input.rake_angle_deg ?? 6;
    const speed = input.cutting_speed_mpm ?? 150;
    const noseR = input.insert_nose_radius_mm ?? 0.8;
    const breaker = input.chipbreaker_type ?? "medium";
    const coolant = input.coolant ?? true;

    const rakeRad = rake * Math.PI / 180;

    // Friction angle
    const beta = FRICTION_ANGLES[mat] ?? 25;
    const betaRad = beta * Math.PI / 180;

    // Shear angle (Merchant)
    const phiRad = Math.PI / 4 + rakeRad / 2 - betaRad / 2;
    const phiDeg = phiRad * 180 / Math.PI;

    // Chip thickness ratio
    const chipRatio = Math.sin(phiRad) /
      Math.cos(phiRad - rakeRad);

    // Uncut chip thickness
    const t1 = feed; // approximately feed for turning
    // Actual chip thickness
    const t2 = t1 / chipRatio;

    // Chip curl radius (empirical: proportional to chip thickness and nose radius)
    const curlRadius = (t2 * 15) + (noseR * 2);

    // Chip breaking score (0-100, higher = better breaking)
    const difficulty = BREAK_DIFFICULTY[mat] ?? 3;
    let score = 50;

    // Feed effect: higher feed = better breaking
    score += (feed - 0.15) * 100;

    // DOC effect: moderate DOC helps
    score += Math.min(doc / 2, 10);

    // Material effect
    score -= (difficulty - 2) * 10;

    // Chipbreaker effect
    if (breaker === "none") score -= 30;
    else if (breaker === "light") score += 5;
    else if (breaker === "medium") score += 15;
    else if (breaker === "heavy") score += 25;

    // Coolant helps chip evacuation but can reduce breaking
    if (coolant) score += 3;

    // Speed effect: higher speed slightly helps (thermal softening)
    score += (speed - 100) * 0.02;

    score = Math.max(0, Math.min(100, score));

    // Chip type prediction
    let chipType: string;
    let chipTypeCode: number;
    if (mat === "cast_iron") {
      chipType = "discontinuous";
      chipTypeCode = 3;
    } else if (score >= 70) {
      chipType = "short_broken";
      chipTypeCode = 4;
    } else if (score >= 50) {
      chipType = "C_shaped";
      chipTypeCode = 3;
    } else if (score >= 30) {
      chipType = "long_helical";
      chipTypeCode = 2;
    } else {
      chipType = "continuous_stringy";
      chipTypeCode = 1;
    }

    // Chip length class (ISO 3685-inspired)
    let chipLengthClass: string;
    if (chipTypeCode >= 4) chipLengthClass = "acceptable (< 50mm)";
    else if (chipTypeCode >= 3) chipLengthClass = "good (50-150mm)";
    else if (chipTypeCode >= 2) chipLengthClass = "poor (> 150mm)";
    else chipLengthClass = "unacceptable (continuous)";

    // Min feed for chip breaking
    const breakerRange = BREAKER_RANGES[breaker];
    const matFactor = 1 + (difficulty - 2) * 0.15;
    const minFeed = breaker === "none"
      ? 0.2 * matFactor
      : breakerRange.min * matFactor;
    const maxFeed = breaker === "none"
      ? 0.8
      : breakerRange.max / Math.max(matFactor * 0.5, 0.5);

    // Bird's nest risk
    let birdsNestRisk: number;
    if (chipTypeCode <= 1) birdsNestRisk = 90;
    else if (chipTypeCode <= 2) birdsNestRisk = 50;
    else if (chipTypeCode <= 3) birdsNestRisk = 15;
    else birdsNestRisk = 5;

    // Recommended chipbreaker
    let recBreaker: string;
    if (feed < 0.12) recBreaker = "light (finishing)";
    else if (feed < 0.35) recBreaker = "medium (general)";
    else recBreaker = "heavy (roughing)";

    // Warnings
    if (chipTypeCode <= 1) {
      warnings.push(
        "Continuous stringy chips — bird's nest risk, " +
        "increase feed or add chipbreaker"
      );
    }
    if (feed < minFeed && breaker !== "none") {
      warnings.push(
        `Feed ${feed} mm/rev below chipbreaker range ` +
        `(min ${r2(minFeed)}) — chips won't break`
      );
    }
    if (feed > maxFeed && breaker !== "none") {
      warnings.push(
        `Feed ${feed} mm/rev above chipbreaker range ` +
        `(max ${r2(maxFeed)}) — excessive chip load`
      );
    }
    if (mat === "aluminum" && breaker === "none") {
      warnings.push(
        "Aluminum without chipbreaker produces long stringy chips — " +
        "use polished insert with sharp chipbreaker"
      );
    }
    if (mat === "stainless" && feed < 0.1) {
      warnings.push(
        "Low feed in stainless causes work hardening and stringy chips — " +
        "increase feed above 0.15 mm/rev"
      );
    }
    if (doc < noseR && breaker !== "none") {
      warnings.push(
        `DOC ${doc}mm < nose radius ${noseR}mm — ` +
        "chipbreaker may not engage properly"
      );
    }

    return {
      chip_type: av(chipTypeCode, chipType, 0,
        `Score ${r0(score)}/100`),
      chip_thickness_ratio: av(r3(chipRatio), "ratio", 0.02,
        `sin(${r1(phiDeg)}°)/cos(${r1(phiDeg)}-${rake}°)`),
      shear_angle: av(r1(phiDeg), "deg", 1,
        `45 + ${rake}/2 - ${beta}/2 (Merchant)`),
      chip_curl_radius: av(r1(curlRadius), "mm", 0.5,
        `f(chip thickness, nose R)`),
      min_feed_for_breaking: av(r3(minFeed), "mm/rev", 0.01,
        `${breaker} breaker, ${mat}`),
      max_feed_for_breaking: av(r2(maxFeed), "mm/rev", 0.02,
        `${breaker} breaker, ${mat}`),
      chip_score: av(r0(score), "score", 5,
        "0=continuous → 100=ideal breaking"),
      recommended_chipbreaker: av(
        feed < 0.12 ? 1 : feed < 0.35 ? 2 : 3,
        recBreaker, 0, `Based on feed ${feed} mm/rev`),
      birds_nest_risk: av(birdsNestRisk, "%", 5,
        `Chip type: ${chipType}`),
      chip_length_class: av(chipTypeCode, chipLengthClass, 0,
        "ISO 3685-inspired classification"),
      warnings,
    };
  }

  /**
   * Analyze chip formation using ChipBreakingModel algorithm for ISO 3685
   * chip type classification with BUE risk assessment.
   *
   * Provides ISO-compliant chip form codes, built-up-edge risk by cutting speed
   * range per ISO material group, and feed modification recommendations when
   * continuous/stringy chips are predicted (wrap-around-workpiece = crash risk).
   *
   * Falls back to the existing score-based classification if ChipBreakingModel unavailable.
   *
   * References: ISO 3685:1993; Jawahir (1988); Sandvik (2020)
   */
  analyzeChipFormISO(input: {
    feed_per_tooth: number;
    axial_depth: number;
    cutting_speed: number;
    tool_diameter: number;
    iso_group: string;
    n_flutes?: number;
    lead_angle?: number;
    has_chipbreaker?: boolean;
    rake_angle?: number;
  }): ChipBreakingResult & {
    iso_model_used: boolean;
    chip_type_iso: "broken" | "segmented" | "continuous" | "stringy" | "snarled";
    chip_form_code: number;
    bue_risk: "low" | "medium" | "high";
    breaking_feasibility: "good" | "marginal" | "poor";
    feed_modification: { action: "none" | "increase" | "decrease"; target_feed?: number; reason?: string };
  } {
    const iso = input.iso_group?.toUpperCase() ?? "P";

    // Try ChipBreakingModel algorithm for ISO analysis
    let isoModelUsed = false;
    let chipTypeISO: "broken" | "segmented" | "continuous" | "stringy" | "snarled" = "continuous";
    let chipFormCode = 5;
    let bueRisk: "low" | "medium" | "high" = "low";
    let breakingFeasibility: "good" | "marginal" | "poor" = "marginal";
    let feedMod: { action: "none" | "increase" | "decrease"; target_feed?: number; reason?: string } = { action: "none" };

    try {
      const { ChipBreakingModel } = require("../algorithms/ChipBreakingModel.js");
      const model = new ChipBreakingModel();
      const isoResult = model.calculate({
        feed_per_tooth: input.feed_per_tooth,
        axial_depth: input.axial_depth,
        cutting_speed: input.cutting_speed,
        tool_diameter: input.tool_diameter,
        iso_group: iso,
        lead_angle: input.lead_angle ?? 45,
        has_chipbreaker: input.has_chipbreaker ?? false,
        rake_angle: input.rake_angle ?? 6,
      });
      isoModelUsed = true;
      chipTypeISO = isoResult.chip_type;
      chipFormCode = isoResult.chip_form_code;
      bueRisk = isoResult.bue_risk;
      breakingFeasibility = isoResult.breaking_feasibility;

      // Determine feed modification based on chip type
      if (chipTypeISO === "continuous" || chipTypeISO === "stringy" || chipTypeISO === "snarled") {
        // Continuous chips: increase feed to promote breaking
        const minBreakingFeed = input.feed_per_tooth * 1.5;
        feedMod = {
          action: "increase",
          target_feed: r3(Math.min(minBreakingFeed, 0.3)),
          reason: `${chipTypeISO} chips predicted for ${iso} — increase feed to promote chip breaking`,
        };
      } else if (isoResult.chip_thickness > 0.5) {
        // Very thick chips: reduce feed to prevent jamming
        feedMod = {
          action: "decrease",
          target_feed: r3(input.feed_per_tooth * 0.7),
          reason: `Chip thickness ${r3(isoResult.chip_thickness)}mm exceeds jam threshold`,
        };
      }
    } catch {
      // Fallback: derive from score-based system
      const matMap: Record<string, string> = { P: "steel", M: "stainless", K: "cast_iron", N: "aluminum", S: "titanium", H: "cast_iron" };
      const baseMat = matMap[iso] ?? "steel";
      const difficulty = BREAK_DIFFICULTY[baseMat] ?? 3;
      if (difficulty >= 4 && input.feed_per_tooth <= 0.1) {
        chipTypeISO = "stringy";
        chipFormCode = 7;
        breakingFeasibility = "poor";
        feedMod = { action: "increase", target_feed: 0.15, reason: "Low feed with difficult material" };
      } else if (difficulty <= 1) {
        chipTypeISO = "segmented";
        chipFormCode = 3;
        breakingFeasibility = "good";
      }
    }

    // Run base calculation for the standard result fields
    // Base calculate() expects feed_mm_rev (per revolution), not per tooth
    const nFlutes = input.n_flutes ?? 1;
    const feedPerRev = input.feed_per_tooth * nFlutes;
    const matMap: Record<string, "steel" | "stainless" | "aluminum" | "cast_iron" | "titanium" | "superalloy"> = {
      P: "steel", M: "stainless", K: "cast_iron", N: "aluminum", S: "titanium", H: "cast_iron",
    };
    const baseResult = this.calculate({
      feed_mm_rev: feedPerRev,
      depth_of_cut_mm: input.axial_depth,
      rake_angle_deg: input.rake_angle ?? 6,
      work_material: matMap[iso] ?? "steel",
      cutting_speed_mpm: input.cutting_speed,
      chipbreaker_type: input.has_chipbreaker ? "medium" : "none",
    });

    return {
      ...baseResult,
      iso_model_used: isoModelUsed,
      chip_type_iso: chipTypeISO,
      chip_form_code: chipFormCode,
      bue_risk: bueRisk,
      breaking_feasibility: breakingFeasibility,
      feed_modification: feedMod,
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

function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const chipBreakingEngine = new ChipBreakingEngine();
